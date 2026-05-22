'use client';

import { useEffect, useState } from 'react';

type ApiResponse = {
  jobs: Array<{ jobId: string; status: string; createdAt: string; startedAt?: string; finishedAt?: string; leadIds: string[] }>;
  records: Array<{
    leadId: string;
    normalizedOwnerName: string;
    normalizedMailingAddress: string;
    normalizedPropertyAddress: string;
    status: string;
    contacts: Array<{ phoneNumbers: string[]; emails: string[]; sourceUrl: string; confidence: number; notes: string; dncChecked: boolean; dncResult: string; lastVerifiedDate: string; humanReviewRequired: boolean }>;
    updatedAt: string;
  }>;
};

export default function EnrichmentDashboard() {
  const [data, setData] = useState<ApiResponse>({ jobs: [], records: [] });
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await fetch('/api/enrichment/results');
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return <main className="max-w-7xl mx-auto p-6 space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Contact Enrichment Review</h1><button className="bg-blue-700 text-white px-3 py-2 rounded" onClick={refresh}>Refresh</button></div>
    {loading && <p className="text-slate-500">Loading…</p>}
    <section className="bg-white rounded shadow p-4">
      <h2 className="font-semibold mb-2">Jobs</h2>
      <table className="min-w-full text-sm"><thead><tr className="bg-slate-100"><th className="p-2 text-left">Job</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Leads</th><th className="p-2 text-left">Created</th></tr></thead><tbody>{data.jobs.map(j=><tr key={j.jobId} className="border-t"><td className="p-2">{j.jobId}</td><td className="p-2">{j.status}</td><td className="p-2">{j.leadIds.length}</td><td className="p-2">{new Date(j.createdAt).toLocaleString()}</td></tr>)}</tbody></table>
    </section>
    <section className="bg-white rounded shadow p-4 overflow-auto">
      <h2 className="font-semibold mb-2">Enriched Contacts (Human Review Required)</h2>
      <table className="min-w-full text-xs"><thead><tr className="bg-slate-100"><th className="p-2 text-left">Lead</th><th className="p-2 text-left">Owner</th><th className="p-2 text-left">Phones</th><th className="p-2 text-left">Emails</th><th className="p-2 text-left">Confidence</th><th className="p-2 text-left">Source</th><th className="p-2 text-left">DNC</th><th className="p-2 text-left">Notes</th></tr></thead>
      <tbody>
      {data.records.flatMap((record) =>
        record.contacts.map((c, idx) =>
          <tr key={`${record.leadId}-${idx}`} className="border-t align-top">
            <td className="p-2">{record.leadId}</td>
            <td className="p-2">{record.normalizedOwnerName}<div className="text-slate-500">{record.normalizedMailingAddress}</div></td>
            <td className="p-2">{c.phoneNumbers.join(', ') || '—'}</td>
            <td className="p-2">{c.emails.join(', ') || '—'}</td>
            <td className="p-2 font-semibold">{c.confidence}</td>
            <td className="p-2"><a href={c.sourceUrl} target="_blank" className="text-blue-700 underline">link</a></td>
            <td className="p-2">{c.dncChecked ? c.dncResult : 'not checked'}</td>
            <td className="p-2">{c.notes} · Review: {c.humanReviewRequired ? 'required' : 'no'}</td>
          </tr>
        )
      )}
      </tbody></table>
    </section>
  </main>;
}
