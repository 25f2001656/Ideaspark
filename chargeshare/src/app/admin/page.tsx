'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/users').then(async response => {
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403) window.location.href = '/dashboard';
        else setError(data.error || 'Could not load admin data.');
      } else {
        setUsers(data.users);
        setLocations(data.locations);
      }
    });
  }, []);

  return (
    <main className="shell">
      <nav className="nav">
        <a className="brand" href="/dashboard" style={{ textDecoration: 'none' }}><span className="brand-mark">A</span> Super Admin</a>
        <div className="nav-links"><a className="btn" href="/dashboard">Dashboard</a><form action="/api/auth/logout" method="post"><button className="btn danger" type="submit">Log out</button></form></div>
      </nav>
      <div className="container grid">
        {error && <div className="error">{error}</div>}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Users</h2>
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>{users.map(user => (
              <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td><span className="badge">{user.role}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Charging locations</h2>
          <table className="table">
            <thead><tr><th>Name</th><th>Socket</th><th>Status</th><th>Coordinates</th></tr></thead>
            <tbody>{locations.map(location => (
              <tr key={location.id}>
                <td>{location.name}</td><td>{location.socket_type}</td>
                <td><span className={`badge ${location.available ? 'available' : 'offline'}`}>{location.available ? 'AVAILABLE' : 'OFFLINE'}</span></td>
                <td>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
