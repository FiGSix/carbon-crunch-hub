/**
 * Safe Storage Adapter
 * 
 * Provides a Storage-compatible interface that gracefully handles scenarios where
 * localStorage is blocked (e.g., Safari Private Browsing, strict privacy settings,
 * third-party cookie blocking).
 * 
 * Falls back to in-memory storage when localStorage is unavailable.
 */

let storage: Storage;
let isAvailable = false;

try {
  // Test localStorage availability with a write/remove operation
  localStorage.setItem('__storage_test__', '1');
  localStorage.removeItem('__storage_test__');
  storage = localStorage;
  isAvailable = true;
} catch {
  // Create in-memory fallback that implements the Storage interface
  const memoryStore = new Map<string, string>();
  
  storage = {
    getItem: (key: string): string | null => {
      return memoryStore.get(key) ?? null;
    },
    setItem: (key: string, value: string): void => {
      memoryStore.set(key, value);
    },
    removeItem: (key: string): void => {
      memoryStore.delete(key);
    },
    clear: (): void => {
      memoryStore.clear();
    },
    key: (index: number): string | null => {
      return Array.from(memoryStore.keys())[index] ?? null;
    },
    get length(): number {
      return memoryStore.size;
    }
  };
}

/**
 * Safe storage instance that never throws.
 * Uses localStorage when available, falls back to in-memory storage otherwise.
 */
export const safeStorage = storage;

/**
 * Flag indicating whether persistent storage is available.
 * false = using in-memory storage (session won't persist across tabs/refreshes)
 */
export const isStorageAvailable = isAvailable;
