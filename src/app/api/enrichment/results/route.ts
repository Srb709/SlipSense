import { NextResponse } from 'next/server';
import { listEnrichedRecords, listEnrichmentJobs } from '@/lib/enrichmentService';

export async function GET() {
  try {
    const [records, jobs] = await Promise.all([listEnrichedRecords(), listEnrichmentJobs()]);
    return NextResponse.json({ records, jobs });
  } catch (error: any) {
    return NextResponse.json(
      { records: [], jobs: [], error: error?.message || 'Failed to load enrichment results' },
      { status: 200 }
    );
  }
}
