import { PrismaClient, ServiceType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed 8 Providers
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
    const upserted = await prisma.provider.upsert({
      where: { id: provider.id },
      update: {
        name: provider.name,
        email: provider.email,
        quota: provider.quota,
        isActive: provider.isActive,
      },
      create: provider,
    });
    console.log(`Upserted provider: ${upserted.id} (${upserted.name})`);
  }

  // 2. Seed Allocation States for the 3 Service Types
  const services = [ServiceType.SERVICE_1, ServiceType.SERVICE_2, ServiceType.SERVICE_3];

  for (const service of services) {
    const upserted = await prisma.allocationState.upsert({
      where: { serviceType: service },
      update: {}, 
      create: {
        serviceType: service,
        lastProviderId: null,
      },
    });
    console.log(`Upserted allocation state for: ${upserted.serviceType}`);
  }

  console.log('Seeding finished successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
