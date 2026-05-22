export type LeadInput = {
  leadId: string;
  ownerName: string;
  propertyAddress: string;
  mailingAddress: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
};

export type ContactCandidate = {
  phoneNumbers: string[];
  emails: string[];
  sourceUrl: string;
  confidence: number;
  notes: string;
  dncChecked: boolean;
  dncResult: 'unknown' | 'clear' | 'possible_match';
  lastVerifiedDate: string;
  humanReviewRequired: true;
};

export type EnrichedLeadRecord = {
  leadId: string;
  normalizedOwnerName: string;
  normalizedMailingAddress: string;
  normalizedPropertyAddress: string;
  searchQueries: string[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  contacts: ContactCandidate[];
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export type EnrichmentJob = {
  jobId: string;
  leadIds: string[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

export type EnrichmentStore = {
  jobs: EnrichmentJob[];
  records: EnrichedLeadRecord[];
};
