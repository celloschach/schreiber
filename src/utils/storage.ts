/**
 * IndexedDB Storage für Handschrift-Profile
 */

const DB_NAME = 'handscan-db-v3';
const DB_VERSION = 1;
const STORE_PROFILES = 'profiles';
const STORE_CONVERTED = 'converted';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
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

export async function saveProfile(profile: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    tx.objectStore(STORE_PROFILES).put(profile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllProfiles(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readonly');
    const request = tx.objectStore(STORE_PROFILES).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    tx.objectStore(STORE_PROFILES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveConvertedText(text: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERTED, 'readwrite');
    tx.objectStore(STORE_CONVERTED).put(text);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllConvertedTexts(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERTED, 'readonly');
    const request = tx.objectStore(STORE_CONVERTED).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteConvertedText(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERTED, 'readwrite');
    tx.objectStore(STORE_CONVERTED).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
