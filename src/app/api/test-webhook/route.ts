import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, eventType } = body;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { error: 'eventId is required and must be a unique string.' },
        { status: 400 }
      );
    }
    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json(
        { error: 'eventType is required (e.g. "QUOTA_RESET").' },
        { status: 400 }
      );
    }

    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      return NextResponse.json(
        {
          message: `Event "${eventId}" has already been processed. Skipping duplicate.`,
          alreadyProcessed: true,
          processedAt: existing.processedAt,
        },
        { status: 200 }
      );
    }

    if (eventType === 'QUOTA_RESET') {
      await prisma.$transaction(async (tx) => {
        await tx.provider.updateMany({
          data: {
            currentLeadsCount: 0,
            quota: 10,
          },
        });

        await tx.webhookEvent.create({
          data: {
            eventId,
            eventType,
            payload: JSON.stringify({ action: 'reset_all_provider_quotas', quota: 10 }),
          },
        });
      });

      return NextResponse.json(
        {
          message: 'QUOTA_RESET processed successfully. All provider quotas reset to 10.',
          eventId,
          alreadyProcessed: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: `Unknown eventType: "${eventType}". Supported types: QUOTA_RESET` },
      { status: 400 }
    );
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          message: 'This event was already processed concurrently. No duplicate effect.',
          alreadyProcessed: true,
        },
        { status: 200 }
      );
    }

    console.error('[Webhook API Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the webhook.' },
      { status: 500 }
    );
  }
}
