import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        allocations: {
          include: {
            lead: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return NextResponse.json({ providers });
  } catch (error: any) {
    console.error('[API Providers GET Error]:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching provider dashboard statistics.' },
      { status: 500 }
    );
  }
}
