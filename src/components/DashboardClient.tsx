'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PropertyRecord } from '@/lib/types';

type EnrichmentContact = {
  phoneNumbers: string[];
  emails: string[];
  sourceUrl: string;
  confidence: number;
  notes: string;
  dncChecked: boolean;
  dncResult: string;
  lastVerifiedDate: string;
  humanReviewRequired: boolean;
};

type EnrichmentRecord = {
  leadId: string;
  status: string;
  contacts: EnrichmentContact[];
  updatedAt: string;
};

type EnrichmentResponse = {
  jobs: Array<{ jobId: string; status: string; leadIds: string[] }>;
  records: EnrichmentRecord[];
};

const neighborhoods = ['Fishtown', 'Kensington', 'Port Richmond', 'South Philly', 'North Philly'];

function parseMailingParts(mailingAddress: string) {
  const fallback = { mailingCity: 'Philadelphia', mailingState: 'PA', mailingZip: '19101' };
  const parts = mailingAddress.split(',').map((p) => p.trim()).filter(Boolean);
  const city = parts.length >= 2 ? parts[parts.length - 2] : fallback.mailingCity;
  const stateZipPart = parts.length >= 1 ? parts[parts.length - 1] : '';
  const stateZipMatch = stateZipPart.match(/([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)/);
  return {
    mailingCity: city || fallback.mailingCity,
    mailingState: stateZipMatch?.[1]?.toUpperCase() || fallback.mailingState,
    mailingZip: stateZipMatch?.[2] || fallback.mailingZip
  };
}

export default function DashboardClient() {
  const [rows, setRows] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PropertyRecord | null>(null);
  const [script, setScript] = useState('');
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentResponse>({ jobs: [], records: [] });
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchMessage, setResearchMessage] = useState('');
  const [filters, setFilters] = useState({ neighborhood: 'Kensington', zipCode: '', propertyType: 'allResidential', includeVacantLand: 'false', minValue: '75000', maxValue: '', minYearsOwned: '10', leadType: 'all' });

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(filters as Record<string, string>);
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) {
        let message = 'Failed to load leads.';
        try {
          const json = await res.json();
          message = json.error || message;
        } catch {}
        throw new Error(message);
      }
      const json = await res.json();
      setRows(json.data || []);
    } catch (e: any) { setError(e.message || 'Unexpected error.'); } finally { setLoading(false); }
  };

  const refreshEnrichment = async () => {
    setEnrichmentLoading(true);
    try {
      const res = await fetch('/api/enrichment/results');
      const json = await res.json();
      setEnrichmentData(json);
    } finally {
      setEnrichmentLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    refreshEnrichment();
  }, []);

  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; };
  const exportCsv = () => window.open(`/api/export?${new URLSearchParams(filters as Record<string, string>)}`, '_blank');
  const generateScript = async (property: PropertyRecord) => {
    setSelected(property);
    setResearchMessage('');
    const res = await fetch('/api/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(property) });
    const json = await res.json();
    setScript(json.script || '');
  };

  const onPropertyTypeChange = (propertyType: string) => {
    setFilters({ ...filters, propertyType, includeVacantLand: propertyType === 'vacantLand' ? 'true' : 'false' });
  };

  const queueContactResearch = async () => {
    if (!selected) return;
    setResearching(true);
    setResearchMessage('Research queued...');
    try {
      const parsedMailing = parseMailingParts(selected.mailingAddress);
      const payload = {
        leads: [{
          leadId: selected.id,
          ownerName: selected.ownerName,
          propertyAddress: selected.address,
          mailingAddress: selected.mailingAddress,
          mailingCity: parsedMailing.mailingCity,
          mailingState: parsedMailing.mailingState,
          mailingZip: parsedMailing.mailingZip
        }]
      };
      const res = await fetch('/api/enrichment/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to queue research.');
      await refreshEnrichment();
      setResearchMessage('Research queued...');
    } catch (err: any) {
      setResearchMessage(err.message || 'Failed to queue research.');
    } finally {
      setResearching(false);
    }
  };

  const totalValue = useMemo(() => rows.reduce((s, r) => s + r.marketValue, 0), [rows]);
  const selectedEnrichment = selected ? enrichmentData.records.find((record) => record.leadId === selected.id) : undefined;
  const selectedJob = selected ? enrichmentData.jobs.find((job) => job.leadIds.includes(selected.id)) : undefined;

  return <main className="p-6 max-w-7xl mx-auto space-y-4">
    <header className="flex items-center justify-between"><div><h1 className="text-3xl font-bold">My Philly Leads Tool</h1><p className="text-slate-600">Philadelphia lead generation dashboard</p></div><div className="flex items-center gap-2"><Link href="/enrichment" className="px-3 py-2 rounded bg-indigo-700 text-white">Contact Review</Link><button onClick={logout} className="px-3 py-2 rounded bg-slate-900 text-white">Logout</button></div></header>
    <section className="bg-white p-4 rounded shadow grid md:grid-cols-9 gap-3">
      <select value={filters.neighborhood} onChange={(e)=>setFilters({...filters,neighborhood:e.target.value})} className="border rounded p-2"><option value="">All Neighborhoods</option>{neighborhoods.map(n=><option key={n}>{n}</option>)}</select>
      <input value={filters.zipCode} onChange={(e)=>setFilters({...filters,zipCode:e.target.value})} placeholder="ZIP code" className="border rounded p-2" />
      <select value={filters.propertyType} onChange={(e)=>onPropertyTypeChange(e.target.value)} className="border rounded p-2">
        <option value="allResidential">All Residential</option><option value="singleFamily">Single Family</option><option value="multiFamily">Multi Family</option><option value="mixedUse">Mixed Use</option><option value="commercial">Commercial</option><option value="vacantLand">Vacant Land</option>
      </select>
      <input value={filters.minValue} onChange={(e)=>setFilters({...filters,minValue:e.target.value})} placeholder="Min value" className="border rounded p-2" />
      <input value={filters.maxValue} onChange={(e)=>setFilters({...filters,maxValue:e.target.value})} placeholder="Max value" className="border rounded p-2" />
      <input value={filters.minYearsOwned} onChange={(e)=>setFilters({...filters,minYearsOwned:e.target.value})} placeholder="Min years" className="border rounded p-2" />
      <select value={filters.leadType} onChange={(e)=>setFilters({...filters,leadType:e.target.value})} className="border rounded p-2"><option value="all">All Leads</option><option value="absentee">Absentee Owners</option><option value="longTerm">Long-Term Owners</option><option value="twentyPlus">20+ Year Owners</option><option value="outOfPhilly">Out-of-Philly Owners</option><option value="highScore">High Score 70+</option></select>
      <button className="bg-blue-700 text-white rounded p-2" onClick={fetchData}>Search</button><button className="bg-emerald-700 text-white rounded p-2" onClick={exportCsv}>CSV</button>
    </section>
    <p className="text-sm text-slate-600">Records: {rows.length} · Total assessed value: ${totalValue.toLocaleString()}</p>
    {loading && <div className="animate-pulse bg-white rounded h-24" />}
    {error && <p className="text-red-600">{error}</p>}
    {!loading && rows.length===0 && <div className="bg-white p-8 rounded text-center text-slate-500">No leads match these filters.</div>}
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded shadow overflow-auto"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr>{['Address','Owner','Mailing Address','Type','Value','Years','Score','Tags'].map(h=><th key={h} className="text-left p-2">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={()=>generateScript(r)}><td className="p-2">{r.address}<div className="text-xs text-slate-500">{r.zipCode}</div></td><td className="p-2">{r.ownerName}</td><td className="p-2">{r.mailingAddress}</td><td className="p-2">{r.propertyType}</td><td className="p-2">${r.marketValue.toLocaleString()}</td><td className="p-2">{r.yearsOwned}</td><td className="p-2"><span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">{r.leadScore}</span></td><td className="p-2">{r.tags.slice(0,3).join(', ')}</td></tr>)}</tbody></table></div>
      <aside className="bg-white rounded shadow p-4">{selected ? <><h3 className="font-bold">Address: {selected.address}</h3><p className="text-sm mt-1">Owner: {selected.ownerName}</p><p className="text-sm">Mailing address: {selected.mailingAddress}</p><p className="text-sm">Property type: {selected.propertyType}</p><p className="text-sm">Market value: ${selected.marketValue.toLocaleString()}</p><p className="text-sm">Years owned: {selected.yearsOwned}</p><p className="text-sm">Lead score: {selected.leadScore}</p><p className="text-sm">Tags: {selected.tags.join(', ') || 'None'}</p><p className="text-sm font-medium mt-3">Outreach script</p><pre className="text-xs whitespace-pre-wrap mt-1 bg-slate-50 p-2 rounded">{script}</pre><button onClick={()=>navigator.clipboard.writeText(script)} className="mt-2 text-blue-700 underline text-sm">Copy Script</button>
      <div className="border-t mt-4 pt-4 space-y-2">
        <div className="flex items-center justify-between"><p className="text-sm font-medium">Contact Research</p><button onClick={queueContactResearch} disabled={researching} className="px-3 py-1.5 rounded bg-indigo-700 text-white text-sm disabled:opacity-50">{researching ? 'Research queued...' : 'Research Contact'}</button></div>
        <p className="text-xs text-amber-700">Candidate contact info requires human review before use. Check DNC/compliance before calling or texting.</p>
        {researchMessage && <p className="text-sm text-slate-700">{researchMessage}</p>}
        {enrichmentLoading && <p className="text-sm text-slate-500">Refreshing contact research…</p>}
        {!selectedEnrichment && !selectedJob && <p className="text-sm text-slate-500">No contact research has been run for this lead yet.</p>}
        {!selectedEnrichment && selectedJob && <p className="text-sm text-slate-500">Research queued or processing. Refresh shortly.</p>}
        {selectedEnrichment && <div className="text-sm space-y-1">
          <p><span className="font-medium">Research status:</span> {selectedEnrichment.status}</p>
          <p><span className="font-medium">Last checked time:</span> {new Date(selectedEnrichment.updatedAt).toLocaleString()}</p>
          <p><span className="font-medium">Phone candidates:</span> {selectedEnrichment.contacts.flatMap((c) => c.phoneNumbers).join(', ') || '—'}</p>
          <p><span className="font-medium">Email candidates:</span> {selectedEnrichment.contacts.flatMap((c) => c.emails).join(', ') || '—'}</p>
          <p><span className="font-medium">Confidence score:</span> {selectedEnrichment.contacts.map((c) => c.confidence).join(', ') || '—'}</p>
          <p><span className="font-medium">Source link(s):</span> {selectedEnrichment.contacts.length ? selectedEnrichment.contacts.map((c, i) => <a key={`${c.sourceUrl}-${i}`} href={c.sourceUrl} target="_blank" className="text-blue-700 underline mr-2">Source {i + 1}</a>) : '—'}</p>
          <p><span className="font-medium">DNC status:</span> {selectedEnrichment.contacts.map((c) => c.dncChecked ? c.dncResult : 'not checked').join(', ') || '—'}</p>
          <p><span className="font-medium">Human review required:</span> {selectedEnrichment.contacts.some((c) => c.humanReviewRequired) ? 'Yes' : 'No'}</p>
        </div>}
      </div></> : <p className="text-slate-500">Select a property to generate outreach script.</p>}</aside>
    </div>
  </main>;
}
