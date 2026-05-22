'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'philly2026') {
      localStorage.setItem('philly-auth', 'true');
      router.push('/dashboard');
      return;
    }
    setError('Invalid credentials.');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">My Philly Leads Tool</h1>
        <p className="text-sm text-slate-600">Login for personal access.</p>
        <input className="w-full border rounded p-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="w-full border rounded p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full bg-blue-700 text-white rounded p-2 hover:bg-blue-800">Sign In</button>
      </form>
    </main>
  );
}
