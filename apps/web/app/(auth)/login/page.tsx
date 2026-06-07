'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens =
        mode === 'login'
          ? await apiClient.login(email, password)
          : await apiClient.register(email, password, name);
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      router.push('/dashboard');
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Something went wrong';
      // Map raw API/HTTP messages to friendly UI copy
      const friendly: Record<string, string> = {
        'Invalid credentials': 'Incorrect email or password. Please try again.',
        'Email already registered': 'An account with this email already exists. Try logging in.',
        'Unauthorized': 'Incorrect email or password. Please try again.',
        'Request failed (401)': 'Incorrect email or password. Please try again.',
        'Request failed (409)': 'An account with this email already exists.',
        'Request failed (400)': 'Please check your details and try again.',
        'Request failed (500)': 'Server error — please try again in a moment.',
      };
      setError(friendly[raw] ?? raw);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === 'register' && (
          <input
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          placeholder="Password (min 8 chars)"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50"
        >
          {loading ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      <button
        className="mt-4 text-sm text-muted hover:text-fg"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
      </button>
    </main>
  );
}
