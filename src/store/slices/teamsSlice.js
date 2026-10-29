import { createSlice } from '@reduxjs/toolkit';
import { createNewTeam } from '../../utils/teamData.js';
import { createOrUpdateMemberFromGoogle } from '../../utils/googleAuth.js';

const initialState = {
  teams: [],
  activeTeamId: null,
};

export const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    setTeams: (state, action) => {
      state.teams = Array.isArray(action.payload) ? action.payload : [];
    },
    setActiveTeamId: (state, action) => {
      state.activeTeamId = action.payload;
    },
    addTeam: (state, action) => {
      const newTeam = action.payload;
      state.teams = [newTeam, ...state.teams.filter((t) => t.id !== newTeam.id)];
      state.activeTeamId = newTeam.id;
    },
    joinTeamByCode: (state, action) => {
      const { teamId, user, freshTeamObj } = action.payload;
      let targetTeam = state.teams.find((t) => t.id === teamId);

      if (!targetTeam && freshTeamObj) {
        targetTeam = freshTeamObj;
        state.teams = [freshTeamObj, ...state.teams.filter((t) => t.id !== freshTeamObj.id)];
      }

      if (!targetTeam) return;

      const newMember = {
        id: user?.sub ? `m_${user.sub}` : `m_${Date.now()}`,
        name: user?.name || 'Colleague',
        email: user?.email || '',
        role: 'Team Member',
        dept: targetTeam.dept || 'Engineering',
        status: 'office',
        avatarBg: '#3b82f6',
        desk: 'Office',
        picture: user?.picture || null,
      };

      const teamIndex = state.teams.findIndex((t) => t.id === targetTeam.id);
      if (teamIndex !== -1) {
        const currentMembers = state.teams[teamIndex].members || [];
        const exists = currentMembers.some(
          (m) =>
            (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
            m.name.toLowerCase() === newMember.name.toLowerCase()
        );

        if (exists) {
          state.teams[teamIndex].members = currentMembers.map((m) =>
            (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
            m.name.toLowerCase() === newMember.name.toLowerCase()
              ? { ...m, ...newMember, role: m.role || newMember.role }
              : m
          );
        } else {
          state.teams[teamIndex].members = [newMember, ...currentMembers];
        }
      }

      state.activeTeamId = targetTeam.id;
    },
    addMemberToTeam: (state, action) => {
      const { teamId, member } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team) {
        const clonedMember = {
          ...member,
          teamId,
          id: member.id || `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        };
        const currentMembers = team.members || [];
        const alreadyExists = currentMembers.some((m) => m.id === clonedMember.id);
        if (!alreadyExists) {
          team.members = [clonedMember, ...currentMembers.map((m) => ({ ...m }))];
        }
      }
    },
    updateMemberStatus: (state, action) => {
      const { teamId, memberId, status } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team && Array.isArray(team.members)) {
        const member = team.members.find((m) => m.id === memberId);
        if (member) {
          member.status = status;
        }
      }
    },
    deleteMemberFromTeam: (state, action) => {
      const { teamId, memberId } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team && Array.isArray(team.members)) {
        team.members = team.members.filter((m) => m.id !== memberId);
      }
    },
    updateMemberProfile: (state, action) => {
      const { teamId, memberId, updates } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team && Array.isArray(team.members)) {
        const member = team.members.find((m) => m.id === memberId);
        if (member && updates) {
          if (updates.name !== undefined) member.name = updates.name.trim();
          if (updates.position !== undefined) member.position = updates.position.trim();
          if (updates.roles !== undefined) {
            const cleanRoles = Array.isArray(updates.roles)
              ? updates.roles.map((r) => r.trim()).filter(Boolean)
              : [String(updates.roles).trim()].filter(Boolean);
            member.roles = cleanRoles.length > 0 ? cleanRoles : ['Team Member'];
            member.role = member.roles.join(', ');
          } else if (updates.role !== undefined) {
            member.role = updates.role.trim();
            member.roles = updates.role.split(',').map((r) => r.trim()).filter(Boolean);
          }
          if (updates.dept !== undefined) member.dept = updates.dept;
          if (updates.desk !== undefined) member.desk = updates.desk.trim();
        }
      }
    },
    resetTeams: (state) => {
      state.teams = [];
      state.activeTeamId = null;
    },
    setSelfStatus: (state, action) => {
      const { teamId, status, user } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (!team || !Array.isArray(team.members) || team.members.length === 0) return;

      const userEmail = (user?.email || '').toLowerCase().trim();
      const userId = user?.sub || user?.id;

      team.members = team.members.map((m) => {
        const matchEmail = userEmail && m.email && m.email.toLowerCase().trim() === userEmail;
        const matchId = userId && m.googleId && m.googleId === userId;
        const matchOwner = team.ownerEmail && userEmail && team.ownerEmail.toLowerCase().trim() === userEmail && m.isOwner;

        if (matchEmail || matchId || matchOwner) {
          return { ...m, status };
        }
        return m;
      });
    },
    markAllOffice: (state, action) => {
      const { teamId } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team && Array.isArray(team.members)) {
        team.members.forEach((m) => {
          m.status = 'office';
        });
      }
    },
    sendInvite: (state, action) => {
      const { teamId, invite } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team) {
        const existingInvites = team.invites || [];
        const alreadyInvited = existingInvites.some(
          (inv) => inv.email.toLowerCase() === invite.email.toLowerCase()
        );
        if (!alreadyInvited) {
          team.invites = [invite, ...existingInvites];
        }
      }
    },
    requestJoin: (state, action) => {
      const { teamId, request } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team) {
        team.joinRequests = [request, ...(team.joinRequests || [])];
      }
    },
    approveJoinRequest: (state, action) => {
      const { teamId, request } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team) {
        const newMember = {
          id: `m_${Date.now()}`,
          name: request.name,
          email: request.email,
          role: request.role || 'Team Member',
          dept: request.dept || team.dept || 'General',
          status: 'office',
          avatarBg: '#10b981',
          desk: 'Office',
        };
        team.joinRequests = (team.joinRequests || []).filter((r) => r.id !== request.id);
        team.members = [newMember, ...(team.members || [])];
      }
    },
    rejectJoinRequest: (state, action) => {
      const { teamId, requestId } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team) {
        team.joinRequests = (team.joinRequests || []).filter((r) => r.id !== requestId);
      }
    },
    acceptInvite: (state, action) => {
      const { teamId, user } = action.payload;
      const team = state.teams.find((t) => t.id === teamId);
      if (team) {
        team.invites = (team.invites || []).filter(
          (inv) => inv.email.toLowerCase() !== (user?.email || '').toLowerCase()
        );
      }
      teamsSlice.caseReducers.joinTeamByCode(state, {
        payload: { teamId, user },
      });
    },
    syncUserWithTeams: (state, action) => {
      const user = action.payload;
      if (!user || !state.teams || state.teams.length === 0) return;

      const userEmail = (user.email || '').toLowerCase().trim();
      const userId = user.sub || user.id;

      // Only update profile details for members who actually exist in team roster
      state.teams.forEach((team) => {
        const memberIndex = (team.members || []).findIndex(
          (m) =>
            (m.googleId && userId && m.googleId === userId) ||
            (m.email && userEmail && m.email.toLowerCase().trim() === userEmail)
        );

        if (memberIndex !== -1) {
          team.members[memberIndex] = {
            ...team.members[memberIndex],
            name: user.name || team.members[memberIndex].name,
            picture: user.picture || team.members[memberIndex].picture,
            googleId: userId || team.members[memberIndex].googleId,
          };
        }
      });
    },
    leaveTeam: (state, action) => {
      const { teamId, user } = action.payload;
      const userEmail = (user?.email || '').toLowerCase().trim();
      const userId = user?.sub || user?.id;

      const team = state.teams.find((t) => t.id === teamId);
      if (team) {
        team.members = (team.members || []).filter(
          (m) =>
            !(
              (m.googleId && userId && m.googleId === userId) ||
              (m.email && userEmail && m.email.toLowerCase().trim() === userEmail) ||
              (m.name && user?.name && m.name.toLowerCase().trim() === user.name.toLowerCase().trim())
            )
        );

        // Also purge any invites or join requests for this user
        if (Array.isArray(team.invites)) {
          team.invites = team.invites.filter(
            (inv) => (inv.email || '').toLowerCase().trim() !== userEmail
          );
        }
        if (Array.isArray(team.joinRequests)) {
          team.joinRequests = team.joinRequests.filter(
            (req) => (req.email || '').toLowerCase().trim() !== userEmail
          );
        }

        const isOwner = team.ownerEmail && team.ownerEmail.toLowerCase().trim() === userEmail;
        if (team.members.length === 0 || isOwner) {
          state.teams = state.teams.filter((t) => t.id !== teamId);
        }
      }

      if (state.activeTeamId === teamId) {
        const remaining = state.teams.filter(
          (t) =>
            (t.members || []).some(
              (m) =>
                (m.googleId && userId && m.googleId === userId) ||
                (m.email && userEmail && m.email.toLowerCase().trim() === userEmail)
            )
        );
        state.activeTeamId = remaining.length > 0 ? remaining[0].id : null;
      }
    },
  },
});

export const {
  setTeams,
  setActiveTeamId,
  addTeam,
  joinTeamByCode,
  addMemberToTeam,
  updateMemberStatus,
  deleteMemberFromTeam,
  setSelfStatus,
  markAllOffice,
  sendInvite,
  requestJoin,
  approveJoinRequest,
  rejectJoinRequest,
  acceptInvite,
  syncUserWithTeams,
  leaveTeam,
  resetTeams,
  updateMemberProfile,
} = teamsSlice.actions;

export const selectAllTeams = (state) => state.teams.teams;
export const selectActiveTeamId = (state) => state.teams.activeTeamId;
export const selectActiveTeam = (state) => {
  if (!state.teams.teams || state.teams.teams.length === 0) return null;
  if (state.teams.activeTeamId) {
    return state.teams.teams.find((t) => t.id === state.teams.activeTeamId) || null;
  }
  return null;
};
export const selectActiveTeamMembers = (state) => selectActiveTeam(state)?.members || [];

export default teamsSlice.reducer;
