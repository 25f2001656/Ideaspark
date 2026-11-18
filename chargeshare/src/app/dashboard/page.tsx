import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { roleLabels } from '@/lib/session';

export default async function DashboardPage() {
  const user = getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand"><span className="brand-mark">CS</span> ChargeShare</div>
        <div className="nav-links">
          {user.role === 'HOST' && <a className="btn" href="/host">Host dashboard</a>}
          {user.role === 'ADMIN' && <a className="btn" href="/admin">Admin panel</a>}
          <a className="btn" href="/chargeshare-standalone.html">Open app</a>
          <form action="/api/auth/logout" method="post"><button className="btn danger" type="submit">Log out</button></form>
        </div>
      </nav>
      <div className="container">
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Hello, {user.name}</h1>
          <p className="muted">{roleLabels[user.role]} account</p>
          {user.role === 'DRIVER' && (
            <>
              <p>Find available charging locations and open your existing ChargeShare booking pass.</p>
              <a className="btn primary" href="/chargeshare-standalone.html">Discover charging locations</a>
            </>
          )}
          {user.role === 'HOST' && (
            <>
              <p>Manage the location, socket details, and live availability shown to drivers.</p>
              <a className="btn primary" href="/host">Manage my charging location</a>
            </>
          )}
          {user.role === 'ADMIN' && (
            <>
              <p>Review users and charging locations in the local SQLite database.</p>
              <a className="btn primary" href="/admin">Open admin panel</a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
