'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'DRIVER' | 'HOST'>('DRIVER');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Registration failed.');
    else window.location.href = role === 'HOST' ? '/host' : '/dashboard';
  }

  return (
    <main className="shell">
      <div className="card auth-card">
        <div className="brand" style={{ marginBottom: 20 }}><span className="brand-mark">CS</span> ChargeShare</div>
        <h1 style={{ marginTop: 0 }}>Join ChargeShare</h1>
        <form onSubmit={submit}>
          <label className="field">Full name<input value={name} onChange={e => setName(e.target.value)} required /></label>
          <label className="field">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label className="field">Password<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label>
          <label className="field">I am joining as
            <select value={role} onChange={e => setRole(e.target.value as 'DRIVER' | 'HOST')}>
              <option value="DRIVER">EV Driver</option>
              <option value="HOST">Charging Host</option>
            </select>
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn primary full" type="submit">Create account</button>
        </form>
        <p className="muted" style={{ textAlign: 'center' }}>Already have an account? <a href="/login">Log in</a></p>
      </div>
    </main>
  );
}
