/**
 * Safe LocalStorage Utility
 * Protects application from unhandled SyntaxError crashes caused by corrupt,
 * truncated, or unexpected localStorage values (e.g. "undefined", quota errors).
 */

export function safeJsonParse(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '' || raw === 'undefined') {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Storage] Corrupt JSON in localStorage key "${key}". Resetting to fallback.`, err);
    try {
      localStorage.setItem(key, JSON.stringify(fallback));
    } catch (writeErr) {
      console.warn(`[Storage] Failed to reset localStorage key "${key}":`, writeErr);
    }
    return fallback;
  }
}

export function safeSetItem(key, value) {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, str);
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to write localStorage key "${key}" (quota exceeded or private mode):`, err);
    return false;
  }
}

export function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to remove localStorage key "${key}":`, err);
  }
}
