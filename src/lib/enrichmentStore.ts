import fs from 'node:fs/promises';
import path from 'node:path';
import { EnrichedLeadRecord, EnrichmentJob, EnrichmentStore } from '@/lib/enrichmentTypes';

const DB_PATH = path.join(process.cwd(), 'data', 'enrichment-db.json');

const defaultStore: EnrichmentStore = { jobs: [], records: [] };

async function ensureDb() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

export async function readStore(): Promise<EnrichmentStore> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  return JSON.parse(raw) as EnrichmentStore;
}

export async function writeStore(store: EnrichmentStore) {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function upsertRecord(record: EnrichedLeadRecord) {
  const store = await readStore();
  const idx = store.records.findIndex((r) => r.leadId === record.leadId);
  if (idx === -1) store.records.push(record);
  else store.records[idx] = record;
  await writeStore(store);
}

export async function upsertJob(job: EnrichmentJob) {
  const store = await readStore();
  const idx = store.jobs.findIndex((j) => j.jobId === job.jobId);
  if (idx === -1) store.jobs.push(job);
  else store.jobs[idx] = job;
  await writeStore(store);
}
