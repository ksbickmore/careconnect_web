/**
 * Tiny localStorage persistence helper. Zero-backend app: runtime data is
 * held client-side, so each repository hydrates from a namespaced key and
 * writes back after every mutation.
 *
 * Both functions are guarded: quota / serialization errors must never crash
 * the data layer — the UI stays usable with in-memory data.
 */

const PREFIX = 'careconnect:web:v1:';

/** Read + parse the value at `key`, falling back to `fallback` on any miss. */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Serialize + persist `value` at `key`. Silently no-ops on failure. */
export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded / serialization error — nothing actionable to do.
  }
}

/** Remove the value at `key` so the next load falls back to seed data. */
export function removeJSON(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore — storage may be unavailable.
  }
}
