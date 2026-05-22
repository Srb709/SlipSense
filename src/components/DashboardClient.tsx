'use client';

import { useEffect, useMemo, useState } from 'react';
import { PropertyRecord } from '@/lib/types';

const neighborhoods = ['Fishtown', 'Kensington', 'Port Richmond', 'South Philly', 'North Philly'];

export default function DashboardClient() {
  const [rows, setRows] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PropertyRecord | null>(null);
  const [script, setScript] = useState('');
  const [filters, setFilters] = useState({ neighborhood: 'Kensington', zipCode: '', propertyType: 'allResidential', includeVacantLand: 'false', minValue: '75000', maxValue: '', minYearsOwned: '10', leadType: 'all' });

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(filters as Record<string, string>);
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) {
        try {
          const json = await res.json();
          throw new Error(json.error || 'Failed to load leads.');
        } catch {
          throw new Error('Failed to load leads.');
        }
      }
      const json = await res.json();
      setRows(json.data || []);
    } catch (e: any) { setError(e.message || 'Unexpected error.'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; };
  const exportCsv = () => window.open(`/api/export?${new URLSearchParams(filters as Record<string, string>)}`, '_blank');
  const generateScript = async (property: PropertyRecord) => {
    setSelected(property);
    const res = await fetch('/api/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(property) });
    const json = await res.json();
    setScript(json.script || '');
  };

  const onPropertyTypeChange = (propertyType: string) => {
    setFilters({ ...filters, propertyType, includeVacantLand: propertyType === 'vacantLand' ? 'true' : 'false' });
  };

  const totalValue = useMemo(() => rows.reduce((s, r) => s + r.marketValue, 0), [rows]);

  return <main className="p-6 max-w-7xl mx-auto space-y-4">
    <header className="flex items-center justify-between"><div><h1 className="text-3xl font-bold">My Philly Leads Tool</h1><p className="text-slate-600">Philadelphia lead generation dashboard</p></div><button onClick={logout} className="px-3 py-2 rounded bg-slate-900 text-white">Logout</button></header>
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
      <aside className="bg-white rounded shadow p-4">{selected ? <><h3 className="font-bold">Address: {selected.address}</h3><p className="text-sm mt-1">Owner: {selected.ownerName}</p><p className="text-sm">Mailing address: {selected.mailingAddress}</p><p className="text-sm">Property type: {selected.propertyType}</p><p className="text-sm">Market value: ${selected.marketValue.toLocaleString()}</p><p className="text-sm">Years owned: {selected.yearsOwned}</p><p className="text-sm">Lead score: {selected.leadScore}</p><p className="text-sm">Tags: {selected.tags.join(', ') || 'None'}</p><p className="text-sm font-medium mt-3">Outreach script</p><pre className="text-xs whitespace-pre-wrap mt-1 bg-slate-50 p-2 rounded">{script}</pre><button onClick={()=>navigator.clipboard.writeText(script)} className="mt-2 text-blue-700 underline text-sm">Copy Script</button></> : <p className="text-slate-500">Select a property to generate outreach script.</p>}</aside>
    </div>
  </main>;
}
