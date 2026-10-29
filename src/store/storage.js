/**
 * Robust Cross-Platform Redux-Persist Storage Adapter
 * Safely wraps window.localStorage and falls back gracefully when window is undefined.
 */
export const storage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Promise.resolve(window.localStorage.getItem(key));
      }
    } catch (e) {
      console.warn(`[storage] getItem error for ${key}:`, e);
    }
    return Promise.resolve(null);
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[storage] setItem error for ${key}:`, e);
    }
    return Promise.resolve(value);
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[storage] removeItem error for ${key}:`, e);
    }
    return Promise.resolve();
  },
};

export default storage;
