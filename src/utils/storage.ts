/**
 * IndexedDB Storage für große Datenmengen (Bilder, CharacterMaps)
 * localStorage hat ein Limit von ~5MB, IndexedDB kann hunderte MB speichern
 */

const DB_NAME = 'handscan-db';
const DB_VERSION = 1;
const STORE_PROFILES = 'profiles';
const STORE_CONVERTED = 'converted';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONVERTED)) {
        db.createObjectStore(STORE_CONVERTED, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// === PROFILES ===

export async function saveProfile(profile: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    const store = tx.objectStore(STORE_PROFILES);
    const request = store.put(profile);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getProfile(id: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readonly');
    const store = tx.objectStore(STORE_PROFILES);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProfiles(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readonly');
    const store = tx.objectStore(STORE_PROFILES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    const store = tx.objectStore(STORE_PROFILES);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// === CONVERTED TEXTS ===

export async function saveConvertedText(text: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERTED, 'readwrite');
    const store = tx.objectStore(STORE_CONVERTED);
    const request = store.put(text);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllConvertedTexts(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERTED, 'readonly');
    const store = tx.objectStore(STORE_CONVERTED);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteConvertedText(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERTED, 'readwrite');
    const store = tx.objectStore(STORE_CONVERTED);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// === MIGRATION: Von localStorage zu IndexedDB ===

export async function migrateFromLocalStorage(): Promise<boolean> {
  let migrated = false;
  
  try {
    // Alte Profile migrieren
    const oldProfiles = localStorage.getItem('handscan-profiles-v2');
    if (oldProfiles) {
      const profiles = JSON.parse(oldProfiles);
      for (const profile of profiles) {
        await saveProfile(profile);
      }
      localStorage.removeItem('handscan-profiles-v2');
      migrated = true;
    }
    
    // Alte konvertierte Texte migrieren
    const oldConverted = localStorage.getItem('handscan-converted-v2');
    if (oldConverted) {
      const texts = JSON.parse(oldConverted);
      for (const text of texts) {
        await saveConvertedText(text);
      }
      localStorage.removeItem('handscan-converted-v2');
      migrated = true;
    }
  } catch (e) {
    console.error('Migration failed:', e);
  }
  
  return migrated;
}

// === STORAGE INFO ===

export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}
