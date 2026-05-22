'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PropertyRecord } from '@/lib/types';

export default function DashboardClient() {
  const router = useRouter();
  const [rows, setRows] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PropertyRecord | null>(null);
  const [script, setScript] = useState('');
  const [filters, setFilters] = useState({ neighborhood: '', zipCode: '', propertyType: '', minValue: '', maxValue: '', minYearsOwned: '10' });

  useEffect(() => {
    if (localStorage.getItem('philly-auth') !== 'true') router.push('/');
  }, [router]);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(filters as Record<string, string>);
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load leads.');
      const json = await res.json();
      setRows(json.data);
    } catch (e: any) {
      setError(e.message || 'Unexpected error.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const exportCsv = () => {
    const params = new URLSearchParams(filters as Record<string, string>);
    window.open(`/api/export?${params.toString()}`, '_blank');
  };

  const generateScript = async (property: PropertyRecord) => {
    setSelected(property);
    const res = await fetch('/api/script', { method: 'POST', body: JSON.stringify(property) });
    const json = await res.json();
    setScript(json.script);
  };

  const totalValue = useMemo(() => rows.reduce((sum, r) => sum + r.marketValue, 0), [rows]);

  return <main className="p-6 max-w-7xl mx-auto space-y-6">
    <h1 className="text-3xl font-bold">My Philly Leads Tool</h1>
    <section className="bg-white p-4 rounded shadow grid grid-cols-6 gap-3">
      {Object.entries(filters).map(([k,v]) => <input key={k} value={v} onChange={(e)=>setFilters({...filters,[k]:e.target.value})} placeholder={k} className="border rounded p-2" />)}
      <button className="bg-blue-700 text-white rounded p-2" onClick={fetchData}>Search</button>
      <button className="bg-emerald-700 text-white rounded p-2" onClick={exportCsv}>Export CSV</button>
    </section>
    <p className="text-sm text-slate-600">Records: {rows.length} · Total assessed value: ${totalValue.toLocaleString()}</p>
    {loading && <p>Loading data...</p>}
    {error && <p className="text-red-600">{error}</p>}
    <div className="bg-white rounded shadow overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100"><tr>{['Address','Owner','Mailing','Value','Years','Score','Action'].map(h=><th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r)=> <tr key={r.id} className="border-t">
            <td className="p-2">{r.address}</td><td className="p-2">{r.ownerName}</td><td className="p-2">{r.mailingAddress}</td>
            <td className="p-2">${r.marketValue.toLocaleString()}</td><td className="p-2">{r.yearsOwned}</td><td className="p-2 font-semibold">{r.leadScore}</td>
            <td className="p-2"><button className="text-blue-700 underline" onClick={()=>generateScript(r)}>Generate Letter</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {selected && <section className="bg-white rounded shadow p-4">
      <h2 className="font-bold">Outreach Script: {selected.address}</h2>
      <pre className="whitespace-pre-wrap text-sm mt-2">{script}</pre>
    </section>}
  </main>;
}
