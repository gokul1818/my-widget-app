import { Preferences } from '@capacitor/preferences';

const TEAMS_STORAGE_KEY = 'office_teams_list';
const ACTIVE_TEAM_STORAGE_KEY = 'office_active_team_id';

const memStorage = new Map();

function getStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memStorage.get(key) || null;
}

function setStorageItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
  memStorage.set(key, value);
}

function removeStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
  memStorage.delete(key);
}

/**
 * Generates a clean human-readable team code, e.g. TEAM-4921
 */
export function generateTeamCode(prefix = 'TEAM') {
  const cleanPrefix = (prefix.replace(/[^a-zA-Z]/g, '').slice(0, 4) || 'TEAM').toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${cleanPrefix}-${randomNum}`;
}

/**
 * Cleanly normalizes a team code by removing spaces, hyphens, and uppercase.
 * Example: 'team-1234' -> 'TEAM1234', 'ENG 4821' -> 'ENG4821'
 */
export function normalizeTeamCode(code) {
  return (code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Robust search to find a team by code, id, or name with lenient matching
 */
export function findTeamByCode(teams, searchCode) {
  if (!Array.isArray(teams) || !searchCode) return null;
  const cleanInput = searchCode.trim();
  const normalizedInput = normalizeTeamCode(cleanInput);

  // 1. Normalized code match (ignores hyphens, spaces, and case)
  let found = teams.find((t) => normalizeTeamCode(t.code) === normalizedInput);
  if (found) return found;

  // 2. Exact code match
  found = teams.find((t) => (t.code || '').toUpperCase() === cleanInput.toUpperCase());
  if (found) return found;

  // 3. Team ID match
  found = teams.find((t) => t.id === cleanInput);
  if (found) return found;

  // 4. Team Name match
  found = teams.find((t) => (t.name || '').toLowerCase() === cleanInput.toLowerCase());
  if (found) return found;

  return null;
}

/**
 * Checks whether a user belongs to a team (strictly checks members roster)
 */
export function isUserInTeam(team, user) {
  if (!team || !user || !Array.isArray(team.members)) return false;
  const userEmail = (user.email || '').toLowerCase().trim();
  const userId = user.sub || user.id;
  const userName = (user.name || '').toLowerCase().trim();

  return team.members.some((m) => {
    if (m.googleId && userId && m.googleId === userId) return true;
    if (m.email && userEmail && m.email.toLowerCase().trim() === userEmail) return true;
    if (m.name && userName && m.name.toLowerCase().trim() === userName) return true;
    return false;
  });
}

/**
 * Checks whether a user is the author/creator of a team
 */
export function isTeamAuthor(team, user) {
  if (!team || !user) return false;
  const userEmail = (user.email || '').toLowerCase().trim();
  const userId = user.sub || user.id;

  if (team.ownerEmail && team.ownerEmail.toLowerCase().trim() === userEmail) {
    return true;
  }
  if (Array.isArray(team.members)) {
    const ownerMember = team.members.find((m) => m.isOwner);
    if (ownerMember) {
      if (ownerMember.googleId && userId && ownerMember.googleId === userId) return true;
      if (ownerMember.email && userEmail && ownerMember.email.toLowerCase().trim() === userEmail) return true;
    }
  }
  return false;
}

/**
 * Returns all teams that a user is a member of
 */
export function getUserTeams(teams, user) {
  if (!Array.isArray(teams) || !user) return [];
  return teams.filter((t) => isUserInTeam(t, user));
}

// Clean initial teams: NO DUMMY DATA
export const initialTeams = [];

/**
 * Loads teams with reliable local-first persistence & server sync.
 * Guarantees that refreshing the page never clears local teams even if server is offline/empty.
 */
export async function loadTeams() {
  // 1. First retrieve local persistent storage (Preferences & direct storage)
  let localTeams = [];
  if (typeof window !== 'undefined') {
    try {
      const res = await Preferences.get({ key: TEAMS_STORAGE_KEY });
      if (res && res.value) {
        const parsed = JSON.parse(res.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localTeams = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Always check direct storage fallback if Preferences had no teams
  if (localTeams.length === 0) {
    try {
      const fallback = getStorageItem(TEAMS_STORAGE_KEY);
      if (fallback) {
        const parsed = JSON.parse(fallback);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localTeams = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Try Serverless API / Database (/api/teams) if running in browser
  if (typeof window !== 'undefined') {
    try {
      const apiRes = await fetch('/api/teams');
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.connected && Array.isArray(json.teams) && json.teams.length > 0) {
          // Server has authoritative non-empty teams: sync to local storage and return
          try {
            const str = JSON.stringify(json.teams);
            Preferences.set({ key: TEAMS_STORAGE_KEY, value: str }).catch(() => {});
            setStorageItem(TEAMS_STORAGE_KEY, str);
          } catch {}
          return json.teams;
        }
      }
    } catch {
      // API not reachable locally, use local storage
    }
  }

  // 3. If server has 0 teams but local storage has teams, KEEP LOCAL TEAMS and populate server!
  if (localTeams.length > 0) {
    if (typeof window !== 'undefined') {
      fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: localTeams }),
      }).catch(() => {});
    }
    return localTeams;
  }

  return [];
}

/**
 * Saves teams to local storage immediately, then syncs to Vercel DB API / dev server
 */
export async function saveTeams(teams) {
  if (!Array.isArray(teams)) return;

  // 1. Immediate local persistence (never fails)
  try {
    const str = JSON.stringify(teams);
    if (typeof window !== 'undefined') {
      Preferences.set({ key: TEAMS_STORAGE_KEY, value: str }).catch(() => {});
    }
    setStorageItem(TEAMS_STORAGE_KEY, str);
  } catch (err) {
    console.warn('Error saving teams locally:', err);
  }

  // 2. Sync to serverless API / Dev server
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams }),
      });
    } catch {
      // offline or local dev
    }
  }
}

/**
 * Loads active team ID
 */
export async function loadActiveTeamId() {
  if (typeof window !== 'undefined') {
    try {
      const res = await Preferences.get({ key: ACTIVE_TEAM_STORAGE_KEY });
      if (res && res.value) return res.value;
    } catch {
      // ignore
    }
  }

  // Direct storage fallback
  try {
    const fallback = getStorageItem(ACTIVE_TEAM_STORAGE_KEY);
    if (fallback) return fallback;
  } catch {
    // ignore
  }

  return null;
}

/**
 * Saves active team ID (removes from storage when id is null)
 */
export async function saveActiveTeamId(id) {
  try {
    if (!id) {
      if (typeof window !== 'undefined') {
        Preferences.remove({ key: ACTIVE_TEAM_STORAGE_KEY }).catch(() => {});
      }
      removeStorageItem(ACTIVE_TEAM_STORAGE_KEY);
      return;
    }
    if (typeof window !== 'undefined') {
      Preferences.set({ key: ACTIVE_TEAM_STORAGE_KEY, value: id }).catch(() => {});
    }
    setStorageItem(ACTIVE_TEAM_STORAGE_KEY, id);
  } catch (err) {
    console.warn('Error saving active team ID:', err);
  }
}

/**
 * Creates a brand new team
 */
export function createNewTeam({ name, location, dept = 'General', ownerUser }) {
  const code = generateTeamCode(name);
  const teamId = `team_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  const ownerMember = {
    id: `m_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    name: ownerUser?.name || 'You',
    email: ownerUser?.email || '',
    role: 'Team Lead',
    dept,
    status: 'office',
    avatarBg: '#10b981',
    desk: 'Office',
    isOwner: true,
    teamId,
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
