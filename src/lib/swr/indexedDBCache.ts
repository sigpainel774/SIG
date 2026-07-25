/**
 * Gerenciador de Cache Persistente seguro no IndexedDB para catálogos de baixa sensibilidade.
 * Suporta TTL configurável (padrão: 24 horas) e expurgo automático no logout.
 */

const DB_NAME = 'sig_cache_db';
const STORE_NAME = 'catalogos_store';
const DB_VERSION = 1;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 Horas

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB não suportado neste ambiente'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getIdbItem<T = any>(key: string, userId?: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const item = req.result;
        if (!item) return resolve(null);

        // Validação de expiração (TTL de 24h)
        const now = Date.now();
        if (now - item.timestamp > DEFAULT_TTL_MS) {
          // Expired
          setIdbItem(key, null).catch(() => {});
          return resolve(null);
        }

        // Validação de isolamento por usuário
        if (userId && item.userId && item.userId !== userId) {
          return resolve(null);
        }

        resolve(item.value as T);
      };

      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[IndexedDB] Erro ao ler chave:', key, err);
    return null;
  }
}

export async function setIdbItem(key: string, value: any, userId?: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      if (value === null || value === undefined) {
        store.delete(key);
      } else {
        store.put({
          key,
          value,
          timestamp: Date.now(),
          userId: userId ?? null,
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => {
        // Trata QuotaExceededError graciosamente
        console.warn('[IndexedDB] Erro na gravação:', e);
        resolve();
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Falha ao persistir:', key, err);
  }
}

/**
 * Expurga completamente o IndexedDB de catálogos locais no logout do usuário.
 */
export async function limparCacheIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('[IndexedDB] Erro ao limpar cache no logout:', err);
  }
}
