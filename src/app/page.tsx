'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    setLoading(false);
    if (!res.ok) return setError('Invalid credentials.');
    router.push('/dashboard');
  };

  return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6"><form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-4"><h1 className="text-2xl font-bold">My Philly Leads Tool</h1><p className="text-sm text-slate-600">Steven Brooks • Keller Williams</p><input className="w-full border rounded p-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} /><input className="w-full border rounded p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={loading} className="w-full bg-blue-700 text-white rounded p-2 hover:bg-blue-800">{loading ? 'Signing In...' : 'Sign In'}</button></form></main>;
}
