import { NextResponse } from 'next/server';
import { ServiceType } from '@prisma/client';
import { allocateLead } from '@/lib/allocator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, serviceType, description } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required and must be a string.' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    }
    if (!serviceType || !Object.values(ServiceType).includes(serviceType as ServiceType)) {
      return NextResponse.json(
        { error: `Invalid serviceType. Must be one of: ${Object.values(ServiceType).join(', ')}` },
        { status: 400 }
      );
    }

    const result = await allocateLead({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      serviceType: serviceType as ServiceType,
      description: description.trim(),
    });

    return NextResponse.json(
      {
        message: 'Lead created and allocated successfully.',
        lead: result.lead,
        assignedProviders: result.assignedProviders.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
        })),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message && error.message.includes('DUPLICATE_LEAD')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'DUPLICATE_LEAD: A lead with this phone number and service type already exists.' },
        { status: 400 }
      );
    }

    if (error.message && error.message.includes('ALLOCATION_FAILED')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('[API Leads Route Error]:', error);
    return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
  }
}
