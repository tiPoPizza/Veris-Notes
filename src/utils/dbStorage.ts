// Robust IndexedDB storage for Veris notes and media attachments
// Bypasses the 5MB localStorage ceiling, allowing large audio, images, and notes without crashing.

const DB_NAME = 'veris_app_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e: any) => {
          const db = e.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          console.warn('IndexedDB open error:', request.error);
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: any): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

export async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Safely writes to localStorage without throwing QuotaExceededError
 */
export function safeLocalStorageSet(key: string, data: any): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const json = typeof data === 'string' ? data : JSON.stringify(data);
    localStorage.setItem(key, json);
  } catch (err: any) {
    // If quota exceeded or serialization failed, attempt to save trimmed version or just rely on IndexedDB
    try {
      if (Array.isArray(data)) {
        // Strip heavy dataUrl strings from attachments for localStorage fallback
        const stripped = data.map((item: any) => {
          if (item && item.attachments && Array.isArray(item.attachments)) {
            return {
              ...item,
              attachments: item.attachments.map((att: any) => ({
                ...att,
                dataUrl: att.dataUrl && att.dataUrl.length > 5000 ? '' : att.dataUrl,
              })),
            };
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(stripped));
      }
    } catch {
      // Ignored: Data is safely in IndexedDB and memory
    }
  }
}
