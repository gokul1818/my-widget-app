import test from 'node:test';
import assert from 'node:assert/strict';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer, { setUser, clearUser, setAuthLoading } from '../src/store/slices/authSlice.js';
import teamsReducer, {
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
  syncUserWithTeams,
  leaveTeam,
  updateMemberProfile,
  selectActiveTeam,
  selectActiveTeamMembers,
} from '../src/store/slices/teamsSlice.js';
import uiReducer, {
  setActiveFilter,
  setSearchQuery,
  setTheme,
  showToast,
  hideToast,
  setModalOpen,
  closeAllModals,
} from '../src/store/slices/uiSlice.js';

test('Redux Toolkit Auth Slice: initial state and actions', () => {
  const store = configureStore({
    reducer: { auth: authReducer },
  });

  assert.equal(store.getState().auth.user, null);
  assert.equal(store.getState().auth.isAuthenticated, false);

  // 1. Set User
  store.dispatch(setUser({ name: 'Gokulakrishnan', email: 'gokul@gmail.com' }));
  assert.equal(store.getState().auth.isAuthenticated, true);
  assert.equal(store.getState().auth.user.name, 'Gokulakrishnan');
  assert.equal(store.getState().auth.user.email, 'gokul@gmail.com');

  // 2. Clear User / Logout
  store.dispatch(clearUser());
  assert.equal(store.getState().auth.isAuthenticated, false);
  assert.equal(store.getState().auth.user, null);

  // 3. Auth loading
  store.dispatch(setAuthLoading(true));
  assert.equal(store.getState().auth.loading, true);
});

test('Redux Toolkit Teams Slice: team creation and member management', () => {
  const store = configureStore({
    reducer: { teams: teamsReducer },
  });

  assert.deepEqual(store.getState().teams.teams, []);
  assert.equal(store.getState().teams.activeTeamId, null);

  // 1. Add Team
  const sampleTeam = {
    id: 'team_eng',
    name: 'Engineering',
    code: 'ENG-1234',
    location: 'Building A',
    dept: 'Engineering',
    members: [
      { id: 'm_1', name: 'Gokul', email: 'gokul@gmail.com', status: 'office', role: 'Lead', isOwner: true },
      { id: 'm_2', name: 'Priya', email: 'priya@gmail.com', status: 'wfh', role: 'Designer' },
    ],
    invites: [],
    joinRequests: [],
  };

  store.dispatch(addTeam(sampleTeam));
  assert.equal(store.getState().teams.teams.length, 1);
  assert.equal(store.getState().teams.activeTeamId, 'team_eng');

  // 2. Update Member Status
  store.dispatch(updateMemberStatus({ teamId: 'team_eng', memberId: 'm_2', status: 'office' }));
  const priya = store.getState().teams.teams[0].members.find((m) => m.id === 'm_2');
  assert.equal(priya.status, 'office');

  // 3. Mark All Office
  store.dispatch(markAllOffice({ teamId: 'team_eng' }));
  store.getState().teams.teams[0].members.forEach((m) => {
    assert.equal(m.status, 'office');
  });

  // 4. Set Self Status
  store.dispatch(
    setSelfStatus({
      teamId: 'team_eng',
      status: 'leave',
      user: { email: 'gokul@gmail.com', name: 'Gokul' },
    })
  );
  const selfMember = store.getState().teams.teams[0].members.find((m) => m.id === 'm_1');
  assert.equal(selfMember.status, 'leave');

  // 5. Delete Member
  store.dispatch(deleteMemberFromTeam({ teamId: 'team_eng', memberId: 'm_2' }));
  assert.equal(store.getState().teams.teams[0].members.length, 1);
});

test('Redux Toolkit Teams Slice: joining, invites, and requests', () => {
  const store = configureStore({
    reducer: { teams: teamsReducer },
  });

  const sampleTeam = {
    id: 'team_design',
    name: 'Design Team',
    code: 'DES-4411',
    members: [],
    invites: [],
    joinRequests: [],
  };
  store.dispatch(addTeam(sampleTeam));

  // 1. Join Team by Code
  store.dispatch(
    joinTeamByCode({
      teamId: 'team_design',
      user: { name: 'Kavitha', email: 'kavitha@gmail.com', sub: '9988' },
    })
  );
  assert.equal(store.getState().teams.teams[0].members.length, 1);
  assert.equal(store.getState().teams.teams[0].members[0].name, 'Kavitha');

  // 2. Send Invite
  store.dispatch(
    sendInvite({
      teamId: 'team_design',
      invite: { email: 'colleague@gmail.com', role: 'Reviewer' },
    })
  );
  assert.equal(store.getState().teams.teams[0].invites.length, 1);

  // 3. Join Request and Approval
  const req = { id: 'req_1', name: 'Arun', email: 'arun@gmail.com', role: 'Dev' };
  store.dispatch(requestJoin({ teamId: 'team_design', request: req }));
  assert.equal(store.getState().teams.teams[0].joinRequests.length, 1);

  store.dispatch(approveJoinRequest({ teamId: 'team_design', request: req }));
  assert.equal(store.getState().teams.teams[0].joinRequests.length, 0);
  assert.equal(store.getState().teams.teams[0].members.length, 2);

  // 4. Join Request Rejection
  const req2 = { id: 'req_2', name: 'Spam', email: 'spam@gmail.com' };
  store.dispatch(requestJoin({ teamId: 'team_design', request: req2 }));
  assert.equal(store.getState().teams.teams[0].joinRequests.length, 1);
  store.dispatch(rejectJoinRequest({ teamId: 'team_design', requestId: 'req_2' }));
  assert.equal(store.getState().teams.teams[0].joinRequests.length, 0);
});

test('Redux Toolkit Teams Slice: syncUserWithTeams does not auto-create squad if no teams exist', () => {
  const store = configureStore({
    reducer: { teams: teamsReducer },
  });

  const user = { name: 'Gokulakrishnan', email: 'gokul@gmail.com' };
  store.dispatch(syncUserWithTeams(user));

  const teams = store.getState().teams.teams;
  assert.equal(teams.length, 0);
  assert.equal(store.getState().teams.activeTeamId, null);
});

test('Redux Toolkit UI Slice: filters, modals, and toasts', () => {
  const store = configureStore({
    reducer: { ui: uiReducer },
  });

  // Filter
  store.dispatch(setActiveFilter('office'));
  assert.equal(store.getState().ui.activeFilter, 'office');

  // Search
  store.dispatch(setSearchQuery('Gokul'));
  assert.equal(store.getState().ui.searchQuery, 'Gokul');

  // Toast
  store.dispatch(showToast('Test Toast Notification'));
  assert.equal(store.getState().ui.toastMessage, 'Test Toast Notification');
  store.dispatch(hideToast());
  assert.equal(store.getState().ui.toastMessage, null);

  // Modals
  store.dispatch(setModalOpen({ modalName: 'isCreateTeamOpen', isOpen: true }));
  assert.equal(store.getState().ui.modals.isCreateTeamOpen, true);

  store.dispatch(setModalOpen({ modalName: 'isTeamChoiceModalOpen', isOpen: true }));
  assert.equal(store.getState().ui.modals.isTeamChoiceModalOpen, true);

  store.dispatch(closeAllModals());
  assert.equal(store.getState().ui.modals.isCreateTeamOpen, false);
  assert.equal(store.getState().ui.modals.isTeamChoiceModalOpen, false);
});

test('Redux Toolkit Teams Slice: members added to one team are strictly isolated and never reflect in another team', () => {
  const store = configureStore({
    reducer: { teams: teamsReducer },
  });

  const teamAlpha = {
    id: 'team_alpha',
    name: 'Frontend Pod',
    code: 'FRONT-1111',
    members: [{ id: 'm_lead_1', name: 'Lead Alice', status: 'office', isOwner: true }],
  };

  const teamBeta = {
    id: 'team_beta',
    name: 'Backend Pod',
    code: 'BACK-2222',
    members: [{ id: 'm_lead_2', name: 'Lead Bob', status: 'office', isOwner: true }],
  };

  store.dispatch(addTeam(teamAlpha));
  store.dispatch(addTeam(teamBeta));

  // 1. Set Team Alpha as active
  store.dispatch(setActiveTeamId('team_alpha'));
  assert.equal(selectActiveTeam(store.getState())?.id, 'team_alpha');
  assert.equal(selectActiveTeamMembers(store.getState()).length, 1);

  // 2. Add member to Team Alpha
  const newMemberAlpha = {
    id: 'm_member_alpha',
    name: 'Charlie Developer',
    role: 'Frontend Eng',
    status: 'office',
  };
  store.dispatch(addMemberToTeam({ teamId: 'team_alpha', member: newMemberAlpha }));

  // Verify member is in Team Alpha
  const alphaMembers = selectActiveTeamMembers(store.getState());
  assert.equal(alphaMembers.length, 2);
  assert.equal(alphaMembers.some((m) => m.name === 'Charlie Developer'), true);

  // 3. Switch to Team Beta
  store.dispatch(setActiveTeamId('team_beta'));
  const betaMembers = selectActiveTeamMembers(store.getState());

  // CRITICAL CHECK: Team Beta must NOT contain Charlie Developer
  assert.equal(betaMembers.length, 1);
  assert.equal(betaMembers.some((m) => m.name === 'Charlie Developer'), false);
  assert.equal(betaMembers[0].name, 'Lead Bob');

  // 4. Update member status in Team Alpha - verify Team Beta is unaffected
  store.dispatch(updateMemberStatus({ teamId: 'team_alpha', memberId: 'm_member_alpha', status: 'wfh' }));
  const refreshedBetaMembers = selectActiveTeamMembers(store.getState());
  assert.equal(refreshedBetaMembers.length, 1);
  assert.equal(refreshedBetaMembers[0].status, 'office');
});

test('Redux Toolkit Teams Slice: leaveTeam removes user and cleans up active team', () => {
  const store = configureStore({
    reducer: { teams: teamsReducer },
  });

  const user = { name: 'Gokulakrishnan B', email: 'gokul@gmail.com' };

  const team = {
    id: 'team_pfm',
    name: 'pfm',
    ownerEmail: 'gokul@gmail.com',
    members: [{ id: 'm_1', name: 'Gokulakrishnan B', email: 'gokul@gmail.com', status: 'office', isOwner: true }],
  };

  store.dispatch(addTeam(team));
  store.dispatch(setActiveTeamId('team_pfm'));
  assert.equal(store.getState().teams.teams.length, 1);
  assert.equal(store.getState().teams.activeTeamId, 'team_pfm');

  // User exits the team
  store.dispatch(leaveTeam({ teamId: 'team_pfm', user }));

  // Team was owned by user and is now empty of other members, so it's removed and activeTeamId becomes null
  assert.equal(store.getState().teams.teams.length, 0);
  assert.equal(store.getState().teams.activeTeamId, null);
});

test('Redux Toolkit Teams Slice: updateMemberProfile allows editing position and assigning multiple roles', () => {
  const store = configureStore({
    reducer: { teams: teamsReducer },
  });

  const team = {
    id: 'team_dev',
    name: 'Dev Squad',
    members: [
      {
        id: 'm_dev_1',
        name: 'Gokulakrishnan B',
        email: 'gokul@gmail.com',
        role: 'Team Member',
        dept: 'Engineering',
        status: 'office',
      },
    ],
  };

  store.dispatch(addTeam(team));

  // Update member with multiple roles and a position
  store.dispatch(
    updateMemberProfile({
      teamId: 'team_dev',
      memberId: 'm_dev_1',
      updates: {
        position: 'Staff Lead Engineer',
        roles: ['Tech Lead', 'Scrum Master', 'Frontend Engineer'],
        dept: 'Product Architecture',
        desk: 'Desk 5A',
      },
    })
  );

  const updatedMember = store.getState().teams.teams[0].members[0];
  assert.equal(updatedMember.position, 'Staff Lead Engineer');
  assert.deepEqual(updatedMember.roles, ['Tech Lead', 'Scrum Master', 'Frontend Engineer']);
  assert.equal(updatedMember.role, 'Tech Lead, Scrum Master, Frontend Engineer');
  assert.equal(updatedMember.dept, 'Product Architecture');
  assert.equal(updatedMember.desk, 'Desk 5A');
});


