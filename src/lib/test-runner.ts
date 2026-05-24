import { PrismaClient, ServiceType } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function resetDb() {
  console.log('\n--- Resetting Database to Clean Seed State ---');
  // Clear allocations, leads, and webhook events
  await prisma.leadAllocation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.webhookEvent.deleteMany();

  // Reset providers to original state
  const providersData = Array.from({ length: 8 }, (_, i) => {
    const num = i + 1;
    return {
      id: `provider_${num}`,
      name: `Provider ${num}`,
      email: `provider_${num}@example.com`,
      quota: 10,
      currentLeadsCount: 0,
      isActive: true,
    };
  });

  for (const provider of providersData) {
    await prisma.provider.upsert({
      where: { id: provider.id },
      update: provider,
      create: provider,
    });
  }

  // Reset allocation states lastProviderId to null
  const services = [ServiceType.SERVICE_1, ServiceType.SERVICE_2, ServiceType.SERVICE_3];
  for (const service of services) {
    await prisma.allocationState.upsert({
      where: { serviceType: service },
      update: { lastProviderId: null },
      create: { serviceType: service, lastProviderId: null },
    });
  }
  console.log('✓ Database reset successfully.');
}

async function runTests() {
  console.log('Starting Automated QA Test Suite...');
  
  // Verify connectivity to local Next.js server
  try {
    const res = await fetch(`${BASE_URL}/api/providers`);
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    console.log(`✓ Connected to Next.js API server at ${BASE_URL}`);
  } catch (error: any) {
    console.error(`\n✗ ERROR: Could not connect to the local Next.js API server at ${BASE_URL}.`);
    console.error('Make sure the dev server is running on port 3000 (run: npm run dev).');
    console.error(`Error details: ${error.message}`);
    process.exit(1);
  }

  const results = {
    passed: [] as string[],
    failed: [] as string[],
  };

  const assert = (condition: boolean, testName: string, failureDetails?: string) => {
    if (condition) {
      console.log(`  ✓ PASSED: ${testName}`);
      results.passed.push(testName);
    } else {
      console.log(`  ✗ FAILED: ${testName}`);
      if (failureDetails) {
        console.log(`    Reason: ${failureDetails}`);
      }
      results.failed.push(testName);
    }
  };

  // ==========================================
  // 1. WEBHOOK IDEMPOTENCY
  // ==========================================
  try {
    console.log('\n--- Test 1: Webhook Idempotency ---');
    const eventId = `test_event_${Date.now()}`;
    
    // Call 1
    const res1 = await fetch(`${BASE_URL}/api/test-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, eventType: 'QUOTA_RESET' }),
    });
    const data1 = await res1.json();
    assert(res1.status === 200 && data1.alreadyProcessed === false, 'Webhook processed successfully on first call');

    // Call 2 (Duplicate)
    const res2 = await fetch(`${BASE_URL}/api/test-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, eventType: 'QUOTA_RESET' }),
    });
    const data2 = await res2.json();
    assert(res2.status === 200 && data2.alreadyProcessed === true, 'Webhook duplicate skipped idempotently on second call');
  } catch (err: any) {
    assert(false, 'Webhook Idempotency Test', err.message);
  }

  // Reset DB to proceed with clean state for lead tests
  await resetDb();

  // ==========================================
  // 2. LEAD ALLOCATION & DUPLICATE PREVENTION
  // ==========================================
  try {
    console.log('\n--- Test 2: Duplicate Lead Prevention & Cross-Service Submission ---');
    
    // First lead
    const res1 = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        serviceType: 'SERVICE_1',
        description: 'First lead for SERVICE_1',
      }),
    });
    const data1 = await res1.json();
    assert(res1.status === 201, 'First lead submission allowed');
    assert(data1.assignedProviders.length === 3, 'Exactly 3 providers assigned to first lead');

    // Duplicate lead (Same phone + Same serviceType)
    const res2 = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Duplicate',
        email: 'john.dup@example.com',
        phone: '1234567890',
        serviceType: 'SERVICE_1',
        description: 'Duplicate lead for SERVICE_1',
      }),
    });
    const data2 = await res2.json();
    assert(res2.status === 400 && data2.error.includes('DUPLICATE_LEAD'), 'Duplicate lead (same phone + same service) rejected with 400');

    // Same phone + different service allowed
    const res3 = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Cross',
        email: 'john.cross@example.com',
        phone: '1234567890',
        serviceType: 'SERVICE_2',
        description: 'Allowed lead for different service (SERVICE_2)',
      }),
    });
    const data3 = await res3.json();
    assert(res3.status === 201, 'Same phone number with different service (SERVICE_2) allowed and allocated');
  } catch (err: any) {
    assert(false, 'Duplicate Lead Prevention Test', err.message);
  }

  // ==========================================
  // 3. MANDATORY PROVIDER RULES & ROUND ROBIN ROTATION
  // ==========================================
  try {
    console.log('\n--- Test 3: Mandatory Provider Rules & Round Robin Rotation ---');
    await resetDb();

    // SERVICE_1 mandatory is: provider_1. Pool is: provider_2, provider_3, provider_4.
    // We need 2 pool providers.
    // Let's submit lead 1 (for SERVICE_1)
    const res1 = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com',
        phone: '111-111-1111',
        serviceType: 'SERVICE_1',
        description: 'SERVICE_1 - Lead 1',
      }),
    });
    const data1 = await res1.json();
    const providers1 = data1.assignedProviders.map((p: any) => p.id);
    console.log(`  Lead 1 assigned to: ${JSON.stringify(providers1)}`);
    assert(providers1.includes('provider_1'), 'SERVICE_1 Lead 1 contains mandatory provider_1');
    assert(providers1.includes('provider_2') && providers1.includes('provider_3'), 'SERVICE_1 Lead 1 selects pool provider_2 and provider_3');

    // Let's submit lead 2 (for SERVICE_1)
    const res2 = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob',
        email: 'bob@example.com',
        phone: '222-222-2222',
        serviceType: 'SERVICE_1',
        description: 'SERVICE_1 - Lead 2',
      }),
    });
    const data2 = await res2.json();
    const providers2 = data2.assignedProviders.map((p: any) => p.id);
    console.log(`  Lead 2 assigned to: ${JSON.stringify(providers2)}`);
    assert(providers2.includes('provider_1'), 'SERVICE_1 Lead 2 contains mandatory provider_1');
    assert(providers2.includes('provider_4') && providers2.includes('provider_2'), 'SERVICE_1 Lead 2 rotates pool to select provider_4 and provider_2');

    // Let's submit lead 3 (for SERVICE_1)
    const res3 = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie',
        email: 'charlie@example.com',
        phone: '333-333-3333',
        serviceType: 'SERVICE_1',
        description: 'SERVICE_1 - Lead 3',
      }),
    });
    const data3 = await res3.json();
    const providers3 = data3.assignedProviders.map((p: any) => p.id);
    console.log(`  Lead 3 assigned to: ${JSON.stringify(providers3)}`);
    assert(providers3.includes('provider_1'), 'SERVICE_1 Lead 3 contains mandatory provider_1');
    assert(providers3.includes('provider_3') && providers3.includes('provider_4'), 'SERVICE_1 Lead 3 rotates pool to select provider_3 and provider_4');
  } catch (err: any) {
    assert(false, 'Mandatory Rules & Round Robin Test', err.message);
  }

  // ==========================================
  // 4. QUOTA REDUCTION & REALTIME DASHBOARD
  // ==========================================
  try {
    console.log('\n--- Test 4: Quota Reduction & Realtime Dashboard API ---');
    // Fetch provider stats from API
    const res = await fetch(`${BASE_URL}/api/providers`);
    const data = await res.json();
    
    // Check provider lead counts
    const p1 = data.providers.find((p: any) => p.id === 'provider_1');
    const p2 = data.providers.find((p: any) => p.id === 'provider_2');
    const p3 = data.providers.find((p: any) => p.id === 'provider_3');
    const p4 = data.providers.find((p: any) => p.id === 'provider_4');
    
    console.log(`  provider_1 count: ${p1?.currentLeadsCount} (expected: 3)`);
    console.log(`  provider_2 count: ${p2?.currentLeadsCount} (expected: 2)`);
    console.log(`  provider_3 count: ${p3?.currentLeadsCount} (expected: 2)`);
    console.log(`  provider_4 count: ${p4?.currentLeadsCount} (expected: 2)`);
    
    assert(p1?.currentLeadsCount === 3, 'provider_1 leads count correctly incremented to 3');
    assert(p2?.currentLeadsCount === 2, 'provider_2 leads count correctly incremented to 2');
    assert(p3?.currentLeadsCount === 2, 'provider_3 leads count correctly incremented to 2');
    assert(p4?.currentLeadsCount === 2, 'provider_4 leads count correctly incremented to 2');
  } catch (err: any) {
    assert(false, 'Quota Reduction & Dashboard Test', err.message);
  }

  // ==========================================
  // 5. TRANSACTION ROLLBACK BEHAVIOR
  // ==========================================
  try {
    console.log('\n--- Test 5: Transaction Rollback Behavior ---');
    await resetDb();

    // Let's set provider_1 and provider_4 (mandatory for SERVICE_3) to quota = 0
    await prisma.provider.update({
      where: { id: 'provider_1' },
      data: { quota: 0 },
    });

    const leadsCountBefore = await prisma.lead.count();
    const allocationsCountBefore = await prisma.leadAllocation.count();

    // Now try to submit a SERVICE_3 lead, which requires provider_1 (now at full quota: 0/0)
    const res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rollback Test',
        email: 'rollback@example.com',
        phone: '999-999-9999',
        serviceType: 'SERVICE_3',
        description: 'This lead should fail allocation and roll back',
      }),
    });
    const data = await res.json();
    
    const leadsCountAfter = await prisma.lead.count();
    const allocationsCountAfter = await prisma.leadAllocation.count();

    assert(res.status === 400 && data.error.includes('ALLOCATION_FAILED'), 'Allocation rejected with 400 ALLOCATION_FAILED');
    assert(leadsCountBefore === leadsCountAfter, 'No new Lead record created (Transaction successfully rolled back)');
    assert(allocationsCountBefore === allocationsCountAfter, 'No LeadAllocation records created (Transaction successfully rolled back)');
  } catch (err: any) {
    assert(false, 'Transaction Rollback Test', err.message);
  }

  // ==========================================
  // 6. CONCURRENT LEAD GENERATION
  // ==========================================
  try {
    console.log('\n--- Test 6: Concurrent Lead Generation ---');
    await resetDb();

    // Fire 6 concurrent lead generation requests for SERVICE_2
    // SERVICE_2 mandatory: provider_5
    // SERVICE_2 pool: provider_6, provider_7, provider_8 (pool size 3, need 2)
    // We send 6 concurrent requests.
    // Each request will need provider_5 (mandatory) + 2 rotated pool providers.
    // Total allocations = 6 leads * 3 = 18 allocations.
    // Provider 5 will receive 6 allocations. Since original quota is 10, it should succeed.
    // Let's run concurrently.
    const concurrentRequests = Array.from({ length: 6 }, (_, i) => {
      return fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Concurrent User ${i + 1}`,
          email: `concurrent${i + 1}@example.com`,
          phone: `444-444-${String(1000 + i)}`,
          serviceType: 'SERVICE_2',
          description: `Concurrent lead #${i + 1}`,
        }),
      });
    });

    const responses = await Promise.all(concurrentRequests);
    const successes = responses.filter(r => r.status === 201);
    const failures = responses.filter(r => r.status !== 201);

    console.log(`  Concurrent request results: ${successes.length} succeeded, ${failures.length} failed`);
    assert(successes.length === 6, 'All 6 concurrent lead allocations succeeded');

    // Check DB state consistency: provider_5 count must be exactly 6
    const p5 = await prisma.provider.findUnique({ where: { id: 'provider_5' } });
    console.log(`  provider_5 currentLeadsCount: ${p5?.currentLeadsCount} (expected: 6)`);
    assert(p5?.currentLeadsCount === 6, 'provider_5 counter matches exactly number of concurrent allocations');

    // Also check total Lead count and LeadAllocation count
    const totalLeads = await prisma.lead.count();
    const totalAllocations = await prisma.leadAllocation.count();
    assert(totalLeads === 6, 'Total leads in database is exactly 6');
    assert(totalAllocations === 18, 'Total allocations in database is exactly 18');
  } catch (err: any) {
    assert(false, 'Concurrent Lead Generation Test', err.message);
  }

  // ==========================================
  // SUMMARY REPORT
  // ==========================================
  console.log('\n==========================================');
  console.log('AUTOMATED QA TEST SUITE SUMMARY:');
  console.log(`Passed: ${results.passed.length}/${results.passed.length + results.failed.length}`);
  console.log(`Failed: ${results.failed.length}/${results.passed.length + results.failed.length}`);
  console.log('==========================================');

  if (results.failed.length > 0) {
    console.log('✗ Some tests failed. Inspect details above.');
    process.exit(1);
  } else {
    console.log('✓ All tests passed successfully!');
    process.exit(0);
  }
}

runTests()
  .catch((err) => {
    console.error('Unexpected test suite error:', err);
    process.exit(1);
  });
