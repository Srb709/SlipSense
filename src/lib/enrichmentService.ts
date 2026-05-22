import crypto from 'node:crypto';
import { LeadInput, ContactCandidate, EnrichedLeadRecord, EnrichmentJob } from '@/lib/enrichmentTypes';
import { readStore, upsertJob, upsertRecord } from '@/lib/enrichmentStore';

const addressMap: Record<string, string> = {
  STREET: 'ST', AVENUE: 'AVE', ROAD: 'RD', BOULEVARD: 'BLVD', LANE: 'LN', DRIVE: 'DR', PLACE: 'PL', COURT: 'CT'
};

const STOPWORDS = ['LLC', 'INC', 'TRUST', 'ETAL', 'ET AL'];

function normalizeName(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.includes(t))
    .join(' ')
    .trim();
}

function normalizeAddress(address: string) {
  const cleaned = address.toUpperCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.split(' ').map((p) => addressMap[p] || p).join(' ');
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function extractPhones(text: string): string[] {
  const matches = text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  const normalized = matches.map((m) => normalizePhone(m)).filter((m): m is string => Boolean(m));
  return [...new Set(normalized)];
}

function scoreCandidate(lead: LeadInput, normalizedOwnerName: string, content: string, url: string, phones: string[], emails: string[]): number {
  let score = 0;
  const upper = content.toUpperCase();
  if (upper.includes(normalizedOwnerName)) score += 35;
  if (upper.includes(normalizeAddress(lead.propertyAddress))) score += 20;
  if (upper.includes(normalizeAddress(lead.mailingAddress))) score += 15;
  if (upper.includes(lead.mailingCity.toUpperCase())) score += 10;
  if (upper.includes(lead.mailingState.toUpperCase())) score += 5;
  if (upper.includes(lead.mailingZip)) score += 10;
  if (phones.length > 0) score += 3;
  if (emails.length > 0) score += 2;
  if (/relative|associate|possible relatives/i.test(content)) score += 5;
  if (/whitepages|fastpeoplesearch|truepeoplesearch|spokeo/i.test(url)) score += 5;
  return Math.min(100, score);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 SlipSenseContactEnrichment/1.0' } });
  if (!res.ok) return '';
  const html = await res.text();
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

async function searchWeb(query: string): Promise<string[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const links = [...html.matchAll(/uddg=([^&\s"]+)/g)].map((m) => decodeURIComponent(m[1]));
  return [...new Set(links.filter((l) => l.startsWith('http')).slice(0, 8))];
}

function buildQueries(lead: LeadInput, normalizedOwnerName: string): string[] {
  const base = `${normalizedOwnerName} ${lead.mailingCity} ${lead.mailingState} ${lead.mailingZip}`;
  return [
    `${base} "${lead.propertyAddress}" phone`,
    `${base} email`,
    `${base} site:whitepages.com`,
    `${base} site:truepeoplesearch.com`,
    `${base} site:fastpeoplesearch.com`
  ];
}

class EnrichmentQueue {
  private queue: { job: EnrichmentJob; leads: LeadInput[] }[] = [];
  private processing = false;

  async enqueue(leads: LeadInput[]) {
    const now = new Date().toISOString();
    const job: EnrichmentJob = {
      jobId: crypto.randomUUID(),
      leadIds: leads.map((l) => l.leadId),
      status: 'queued',
      createdAt: now
    };
    await upsertJob(job);
    this.queue.push({ job, leads });
    this.processNext();
    return job;
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const current = this.queue.shift();
    if (!current) return;

    const job = { ...current.job, status: 'processing' as const, startedAt: new Date().toISOString() };
    await upsertJob(job);

    try {
      for (const lead of current.leads) {
        await this.processLead(lead);
      }
      await upsertJob({ ...job, status: 'completed', finishedAt: new Date().toISOString() });
    } catch (e: any) {
      await upsertJob({ ...job, status: 'failed', finishedAt: new Date().toISOString(), error: e.message || 'Unknown error' });
    } finally {
      this.processing = false;
      this.processNext();
    }
  }

  private async processLead(lead: LeadInput) {
    const normalizedOwnerName = normalizeName(lead.ownerName);
    const normalizedMailingAddress = normalizeAddress(lead.mailingAddress);
    const normalizedPropertyAddress = normalizeAddress(lead.propertyAddress);
    const searchQueries = buildQueries(lead, normalizedOwnerName);

    const contacts: ContactCandidate[] = [];
    const sourceHits = new Map<string, number>();

    for (const query of searchQueries) {
      const urls = await searchWeb(query);
      for (const url of urls) {
        const body = await fetchText(url);
        if (!body) continue;
        const phones = extractPhones(body);
        const emails = extractEmails(body);
        if (phones.length === 0 && emails.length === 0) continue;
        sourceHits.set(url, (sourceHits.get(url) || 0) + 1);
        contacts.push({
          phoneNumbers: phones,
          emails,
          sourceUrl: url,
          confidence: scoreCandidate(lead, normalizedOwnerName, body, url, phones, emails),
          notes: `Matched from query: ${query}`,
          dncChecked: false,
          dncResult: 'unknown',
          lastVerifiedDate: new Date().toISOString(),
          humanReviewRequired: true
        });
      }
    }

    const deduped = contacts
      .map((contact) => ({ ...contact, confidence: Math.min(100, contact.confidence + (sourceHits.get(contact.sourceUrl) || 0) * 5) }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 25);

    const now = new Date().toISOString();
    const record: EnrichedLeadRecord = {
      leadId: lead.leadId,
      normalizedOwnerName,
      normalizedMailingAddress,
      normalizedPropertyAddress,
      searchQueries,
      status: 'completed',
      contacts: deduped,
      createdAt: now,
      updatedAt: now
    };

    await upsertRecord(record);
  }
}

export const enrichmentQueue = new EnrichmentQueue();

export async function listEnrichedRecords() {
  const store = await readStore();
  return store.records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listEnrichmentJobs() {
  const store = await readStore();
  return store.jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
