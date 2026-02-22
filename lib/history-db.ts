import type { HistoryEntry } from "./types";

const DB_NAME = "smart-extract-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const HISTORY_KEY = "history";

interface KVRow {
  key: string;
  value: HistoryEntry[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = await run(store);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return result;
  } finally {
    db.close();
  }
}

export async function loadHistoryFromDb(): Promise<HistoryEntry[]> {
  if (typeof indexedDB === "undefined") return [];

  return withStore("readonly", async (store) => {
    return new Promise<HistoryEntry[]>((resolve, reject) => {
      const request = store.get(HISTORY_KEY);
      request.onsuccess = () => {
        const row = request.result as KVRow | undefined;
        resolve(Array.isArray(row?.value) ? row.value : []);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export async function saveHistoryToDb(history: HistoryEntry[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  await withStore("readwrite", async (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put({
        key: HISTORY_KEY,
        value: history,
      } satisfies KVRow);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}
