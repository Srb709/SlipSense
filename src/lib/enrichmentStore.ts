import fs from 'node:fs/promises';
import path from 'node:path';
import { EnrichedLeadRecord, EnrichmentJob, EnrichmentStore } from '@/lib/enrichmentTypes';

const defaultStore: EnrichmentStore = { jobs: [], records: [] };
const memoryStore: EnrichmentStore = structuredClone(defaultStore);

function resolveWritableDbPath() {
  const customDir = process.env.ENRICHMENT_DATA_DIR?.trim();
  if (customDir) return path.join(customDir, 'enrichment-db.json');

  if (process.env.VERCEL) return path.join('/tmp', 'data', 'enrichment-db.json');

  return path.join(process.cwd(), 'data', 'enrichment-db.json');
}

const DB_PATH = resolveWritableDbPath();

async function ensureDb() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

async function safeReadDiskStore(): Promise<EnrichmentStore | null> {
  try {
    await ensureDb();
    const raw = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(raw) as EnrichmentStore;
  } catch (error) {
    console.warn('[enrichmentStore] Falling back to in-memory store due to filesystem error.', {
      path: DB_PATH,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function safeWriteDiskStore(store: EnrichmentStore): Promise<boolean> {
  try {
    await ensureDb();
    await fs.writeFile(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.warn('[enrichmentStore] Failed writing disk store. Continuing with in-memory store.', {
      path: DB_PATH,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

export async function readStore(): Promise<EnrichmentStore> {
  const diskStore = await safeReadDiskStore();
  if (diskStore) {
    memoryStore.jobs = diskStore.jobs;
    memoryStore.records = diskStore.records;
    return diskStore;
  }

  return structuredClone(memoryStore);
}

export async function writeStore(store: EnrichmentStore) {
  memoryStore.jobs = store.jobs;
  memoryStore.records = store.records;
  await safeWriteDiskStore(store);
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
