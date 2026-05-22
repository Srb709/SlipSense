import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enrichmentQueue } from '@/lib/enrichmentService';

const leadSchema = z.object({
  leadId: z.string().min(1),
  ownerName: z.string().min(1),
  propertyAddress: z.string().min(1),
  mailingAddress: z.string().min(1),
  mailingCity: z.string().min(1),
  mailingState: z.string().min(2).max(2),
  mailingZip: z.string().min(5)
});

const bodySchema = z.object({ leads: z.array(leadSchema).min(1).max(100) });

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.parse(json);
    const job = await enrichmentQueue.enqueue(parsed.leads);
    return NextResponse.json({ ok: true, job });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Invalid request' }, { status: 400 });
  }
}
