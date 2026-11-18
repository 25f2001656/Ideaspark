'use client';

import { useEffect, useState } from 'react';

type Location = {
  id: string; host_id: string; host_name?: string; name: string; description: string;
  latitude: number; longitude: number; socket_type: string; available: number;
  address: string; opening_time: string; closing_time: string;
};

export default function HostPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', address: '', latitude: '', longitude: '',
    socketType: '15A standard socket', available: true, openingTime: '08:00', closingTime: '20:00',
  });

  async function load() {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    if (!data.user) { window.location.href = '/login'; return; }
    if (data.user.role !== 'HOST') { window.location.href = '/dashboard'; return; }
    const locationResponse = await fetch('/api/locations?mine=1');
    const locationData = await locationResponse.json();
    setLocations(locationData.locations);
  }

  useEffect(() => { load(); }, []);

  function useCurrentLocation() {
    setError('');
    navigator.geolocation.getCurrentPosition(
      position => setForm(current => ({
        ...current, latitude: String(position.coords.latitude), longitude: String(position.coords.longitude),
      })),
      () => setError('Could not access your current location. Allow location permission or enter coordinates manually.'),
      { enableHighAccuracy: true },
    );
  }

  async function addLocation(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    const response = await fetch('/api/locations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Could not add location.');
    else {
      setMessage('Charging location added.');
      setForm(current => ({ ...current, name: '', description: '', address: '' }));
      load();
    }
  }

  async function setAvailability(location: Location, available: boolean) {
    setError('');
    setMessage('');
    const response = await fetch(`/api/locations/${location.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not update location availability.');
      return;
    }
    setMessage('Location availability updated.');
    await load();
  }

  const previewLat = Number(form.latitude) || 12.9141;
  const previewLng = Number(form.longitude) || 74.8560;
  const bbox = `${previewLng - 0.02},${previewLat - 0.02},${previewLng + 0.02},${previewLat + 0.02}`;

  return (
    <main className="shell">
      <nav className="nav">
        <a className="brand" href="/dashboard" style={{ textDecoration: 'none' }}><span className="brand-mark">CS</span> ChargeShare</a>
        <div className="nav-links"><a className="btn" href="/dashboard">Dashboard</a><form action="/api/auth/logout" method="post"><button className="btn danger" type="submit">Log out</button></form></div>
      </nav>
      <div className="container grid grid-2">
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Add charging location</h1>
          <form onSubmit={addLocation}>
            <label className="field">Location name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="field">Address<input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
            <label className="field">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <div className="grid grid-2">
              <label className="field">Latitude<input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} required /></label>
              <label className="field">Longitude<input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} required /></label>
            </div>
            <button type="button" className="btn" style={{ marginBottom: 14 }} onClick={useCurrentLocation}>Use my current location</button>
            <label className="field">Socket type
              <select value={form.socketType} onChange={e => setForm({ ...form, socketType: e.target.value })}>
                <option>15A standard socket</option>
                <option>16A standard socket</option>
                <option>3.3 kW AC charging</option>
              </select>
            </label>
            <div className="grid grid-2">
              <label className="field">Opens<input type="time" value={form.openingTime} onChange={e => setForm({ ...form, openingTime: e.target.value })} /></label>
              <label className="field">Closes<input type="time" value={form.closingTime} onChange={e => setForm({ ...form, closingTime: e.target.value })} /></label>
            </div>
            {error && <div className="error">{error}</div>}
            {message && <div className="success">{message}</div>}
            <button className="btn primary full" type="submit">Save location</button>
          </form>
        </div>
        <div className="grid">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Map preview</h2>
            <iframe className="map" title="Location map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${previewLat}%2C${previewLng}`} />
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>My locations</h2>
            <div className="location-list">
              {locations.map(location => (
                <div className="location-item" key={location.id}>
                  <strong>{location.name}</strong>
                  <div className="muted">{location.socket_type}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => setAvailability(location, true)}>Available</button>
                    <button className="btn danger" onClick={() => setAvailability(location, false)}>Unavailable</button>
                    <span className={`badge ${location.available ? 'available' : 'offline'}`}>{location.available ? 'AVAILABLE' : 'OFFLINE'}</span>
                  </div>
                </div>
              ))}
              {!locations.length && <p className="muted">No locations added yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
