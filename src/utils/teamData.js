import { Preferences } from '@capacitor/preferences';

const TEAMS_STORAGE_KEY = 'office_teams_list';
const ACTIVE_TEAM_STORAGE_KEY = 'office_active_team_id';

/**
 * Generates a clean human-readable team code, e.g. TEAM-4921
 */
export function generateTeamCode(prefix = 'TEAM') {
  const cleanPrefix = (prefix.replace(/[^a-zA-Z]/g, '').slice(0, 4) || 'TEAM').toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${cleanPrefix}-${randomNum}`;
}

// Clean initial teams: NO DUMMY DATA
export const initialTeams = [];

/**
 * Loads teams from Vercel DB API with local storage fallback
 */
export async function loadTeams() {
  // 1. Try Vercel DB Serverless API (/api/teams)
  try {
    const apiRes = await fetch('/api/teams');
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.connected && Array.isArray(json.teams)) {
        return json.teams;
      }
    }
  } catch {
    // API not reachable locally, proceed to local storage
  }

  // 2. Try Local Persistent Storage
  try {
    const res = await Preferences.get({ key: TEAMS_STORAGE_KEY });
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    try {
      const fallback = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (fallback) return JSON.parse(fallback);
    } catch {
      // ignore
    }
  }

  return [];
}

/**
 * Saves teams to Vercel DB API and local storage
 */
export async function saveTeams(teams) {
  // 1. Sync to Vercel DB in background
  try {
    fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams }),
    }).catch(() => {});
  } catch {
    // offline or local dev
  }

  // 2. Local persistence
  try {
    const str = JSON.stringify(teams);
    await Preferences.set({ key: TEAMS_STORAGE_KEY, value: str });
    try {
      localStorage.setItem(TEAMS_STORAGE_KEY, str);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('Error saving teams:', err);
  }
}

/**
 * Loads active team ID
 */
export async function loadActiveTeamId() {
  try {
    const res = await Preferences.get({ key: ACTIVE_TEAM_STORAGE_KEY });
    if (res && res.value) return res.value;
  } catch {
    try {
      const fallback = localStorage.getItem(ACTIVE_TEAM_STORAGE_KEY);
      if (fallback) return fallback;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Saves active team ID
 */
export async function saveActiveTeamId(id) {
  if (!id) return;
  try {
    await Preferences.set({ key: ACTIVE_TEAM_STORAGE_KEY, value: id });
    try {
      localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('Error saving active team ID:', err);
  }
}

/**
 * Creates a brand new team
 */
export function createNewTeam({ name, location, dept = 'General', ownerUser }) {
  const code = generateTeamCode(name);
  const teamId = `team_${Date.now()}`;

  const ownerMember = {
    id: `m_${Date.now()}`,
    name: ownerUser?.name || 'You',
    email: ownerUser?.email || '',
    role: 'Team Lead',
    dept,
    status: 'office',
    avatarBg: '#10b981',
    desk: 'Office',
    isOwner: true,
  };

  return {
    id: teamId,
    name: name.trim(),
    code,
    location: location?.trim() || 'Main Office',
    dept,
    ownerEmail: ownerUser?.email || '',
    ownerName: ownerUser?.name || '',
    members: [ownerMember],
    invites: [],
    joinRequests: [],
  };
}
