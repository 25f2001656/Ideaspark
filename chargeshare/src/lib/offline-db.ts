// IndexedDB Offline Cache & Idempotent Sync Queue for ChargeShare
const IDB_NAME = 'ChargeShareMangaluruDB';
const IDB_VERSION = 1;

export async function openChargeShareDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  return new Promise((resolve) => {
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv_store')) {
        db.createObjectStore('kv_store');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function saveOfflineState<T>(key: string, value: T): Promise<void> {
  const db = await openChargeShareDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(['kv_store'], 'readwrite');
    tx.objectStore('kv_store').put(JSON.stringify(value), key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function loadOfflineState<T>(key: string): Promise<T | null> {
  const db = await openChargeShareDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(['kv_store'], 'readonly');
    const req = tx.objectStore('kv_store').get(key);
    req.onsuccess = () => {
      if (!req.result) return resolve(null);
      try {
        resolve(JSON.parse(req.result) as T);
      } catch {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}
