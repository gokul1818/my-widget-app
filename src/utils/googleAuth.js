import { Preferences } from '@capacitor/preferences';

const GOOGLE_USER_STORAGE_KEY = 'google_auth_user';

/**
 * Decodes Google Identity Services JWT credential
 */
export function parseGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Saves authenticated Google user to persistent storage
 */
export async function saveGoogleUser(user) {
  try {
    const str = JSON.stringify(user);
    await Preferences.set({
      key: GOOGLE_USER_STORAGE_KEY,
      value: str,
    });
    try {
      localStorage.setItem(GOOGLE_USER_STORAGE_KEY, str);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('Error saving Google user:', err);
  }
}

/**
 * Loads saved Google user from persistent storage
 */
export async function loadGoogleUser() {
  try {
    const res = await Preferences.get({ key: GOOGLE_USER_STORAGE_KEY });
    if (res && res.value) {
      return JSON.parse(res.value);
    }
  } catch {
    // fallback
    try {
      const fallback = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
      if (fallback) return JSON.parse(fallback);
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Clears saved Google user session
 */
export async function clearGoogleUser() {
  try {
    await Preferences.remove({ key: GOOGLE_USER_STORAGE_KEY });
    try {
      localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('Error clearing Google user:', err);
  }
}

/**
 * Converts a Google profile into a Team Member roster entry
 */
export function createOrUpdateMemberFromGoogle(googleUser, existingMembers = []) {
  if (!googleUser || !googleUser.name) return null;

  const email = (googleUser.email || '').toLowerCase().trim();
  const name = googleUser.name.trim();

  // Find if already exists by email or by exact name
  const existing = existingMembers.find(
    (m) => (m.email && m.email.toLowerCase() === email) || m.name.toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    return {
      ...existing,
      email: email || existing.email,
      picture: googleUser.picture || existing.picture,
      googleId: googleUser.sub || existing.googleId,
    };
  }

  // Create new member
  return {
    id: googleUser.sub ? `g_${googleUser.sub}` : `g_${Date.now()}`,
    name,
    email,
    picture: googleUser.picture || null,
    role: 'Team Member',
    dept: 'Engineering',
    status: 'office', // Default to office for tomorrow when signing in!
    avatarBg: '#10b981',
    desk: 'Office',
    googleId: googleUser.sub || null,
  };
}
