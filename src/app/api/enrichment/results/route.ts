import { NextResponse } from 'next/server';
import { listEnrichedRecords, listEnrichmentJobs } from '@/lib/enrichmentService';

export async function GET() {
  const [records, jobs] = await Promise.all([listEnrichedRecords(), listEnrichmentJobs()]);
  return NextResponse.json({ records, jobs });
}
