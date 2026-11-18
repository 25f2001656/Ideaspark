'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Login failed.');
    else window.location.href = '/dashboard';
  }

  return (
    <main className="shell">
      <div className="card auth-card">
        <div className="brand" style={{ marginBottom: 20 }}><span className="brand-mark">CS</span> ChargeShare</div>
        <h1 style={{ marginTop: 0 }}>Welcome back</h1>
        <form onSubmit={submit}>
          <label className="field">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label className="field">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          {error && <div className="error">{error}</div>}
          <button className="btn primary full" type="submit">Log in</button>
        </form>
        <p className="muted" style={{ textAlign: 'center' }}>New to ChargeShare? <a href="/register">Create account</a></p>
        <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>Demo admin: admin@chargeshare.local / Admin@123456</p>
      </div>
    </main>
  );
}
