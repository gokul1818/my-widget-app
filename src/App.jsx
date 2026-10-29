import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AddMemberModal,
  MemberCard,
  SummaryCards,
  SelfCheckinBanner,
  OfficeWidgetPreview,
  GoogleLoginModal,
  GoogleCalendarModal,
  CreateTeamModal,
  InviteColleaguesModal,
  JoinTeamModal,
  TeamHeaderDropdown,
  TeamNotificationBanner,
  LoginScreen,
  TeamChoiceModal,
  EditMemberModal,
} from './components';
import {
  getTomorrowDetails,
  formatRosterSummary,
} from './utils/officeData';
import { syncRosterToNative } from './utils/nativeWidgetSync';
import {
  loadGoogleUser,
  saveGoogleUser,
  clearGoogleUser,
} from './utils/googleAuth';
import {
  loadTeams,
  saveTeams,
  loadActiveTeamId,
  saveActiveTeamId,
  createNewTeam,
  isUserInTeam,
  getUserTeams,
  isTeamAuthor,
} from './utils/teamData';
import {
  useAppDispatch,
  useAppSelector,
  // Auth actions & selectors
  setUser,
  clearUser,
  setAuthLoading,
  selectCurrentUser,
  selectAuthLoading,
  // Teams actions & selectors
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
  selectAllTeams,
  selectActiveTeam,
  selectActiveTeamMembers,
  // UI actions & selectors
  setActiveFilter,
  setSearchQuery,
  showToast,
  hideToast,
  setModalOpen,
  setInitialJoinCode,
  selectActiveFilter,
  selectSearchQuery,
  selectTheme,
  selectToastMessage,
  selectModals,
  selectInitialJoinCode,
} from './store';
import './App.css';

export function App() {
  const dispatch = useAppDispatch();

  // Redux state
  const googleUser = useAppSelector(selectCurrentUser);
  const authLoading = useAppSelector(selectAuthLoading);
  const teams = useAppSelector(selectAllTeams);
  const activeTeamRaw = useAppSelector(selectActiveTeam);

  // Validate active team strictly belongs to currently logged in user
  const activeTeam = useMemo(() => {
    if (!activeTeamRaw || !googleUser) return null;
    return isUserInTeam(activeTeamRaw, googleUser) ? activeTeamRaw : null;
  }, [activeTeamRaw, googleUser]);

  // Check if current user is the team author/creator
  const isAuthor = useMemo(() => isTeamAuthor(activeTeam, googleUser), [activeTeam, googleUser]);

  const members = activeTeam?.members || [];
  const activeFilter = useAppSelector(selectActiveFilter);
  const searchQuery = useAppSelector(selectSearchQuery);
  const theme = useAppSelector(selectTheme);
  const toastMessage = useAppSelector(selectToastMessage);
  const modals = useAppSelector(selectModals);
  const initialJoinCode = useAppSelector(selectInitialJoinCode);
  const [editingMember, setEditingMember] = useState(null);
  const isInitializedRef = useRef(false);

  const tomorrow = useMemo(() => getTomorrowDetails(), []);

  // 1. Initial Remote & Persistent Storage Sync
  useEffect(() => {
    async function initStorageSync() {
      try {
        let activeUser = googleUser;
        if (!activeUser) {
          activeUser = await loadGoogleUser();
          if (activeUser) {
            dispatch(setUser(activeUser));
          }
        }

        // Always fetch authoritative teams from server / persistent storage
        let loadedTeams = await loadTeams();
        if (!Array.isArray(loadedTeams)) loadedTeams = [];

        // Purge any legacy auto-created squad artifacts
        loadedTeams = loadedTeams.filter(
          (t) => t.id !== 'team_1793250191038' && !t.name.includes("'s Squad")
        );

        dispatch(setTeams(loadedTeams));

        if (activeUser) {
          const userTeams = getUserTeams(loadedTeams, activeUser);
          if (userTeams.length > 0) {
            const savedActiveTeamId = await loadActiveTeamId();
            const validActive = userTeams.find((t) => t.id === savedActiveTeamId);
            dispatch(setActiveTeamId(validActive ? validActive.id : userTeams[0].id));
            dispatch(syncUserWithTeams(activeUser));
          } else {
            // When user belongs to NO teams, DO NOT create a new team automatically!
            dispatch(setActiveTeamId(null));
            dispatch(setModalOpen({ modalName: 'isTeamChoiceModalOpen', isOpen: true }));
          }
        } else {
          dispatch(setActiveTeamId(null));
        }

        // Check URL parameters for ?join=CODE
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get('join');
        if (joinCode) {
          dispatch(setInitialJoinCode(joinCode));
          dispatch(setModalOpen({ modalName: 'isJoinModalOpen', isOpen: true }));
        }
      } catch (err) {
        console.warn('Initialization error:', err);
      } finally {
        isInitializedRef.current = true;
        dispatch(setAuthLoading(false));
      }
    }

    initStorageSync();
  }, [dispatch]);

  // 2. Persist Teams to Native Widget and External Storage
  useEffect(() => {
    // CRITICAL: Never persist before initial storage sync finishes, to prevent wiping database with []
    if (!isInitializedRef.current || authLoading) return;

    if (Array.isArray(teams)) {
      saveTeams(teams);
    }
    if (activeTeam) {
      saveActiveTeamId(activeTeam.id);
      syncRosterToNative(activeTeam.members || [], tomorrow.shortDateStr);
    } else {
      saveActiveTeamId(null);
    }
  }, [teams, activeTeam, authLoading, tomorrow.shortDateStr]);

  // Toast trigger helper
  const showToastMsg = (msg) => {
    dispatch(showToast(msg));
    setTimeout(() => {
      dispatch(hideToast());
    }, 3200);
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async (profile) => {
    dispatch(setUser(profile));
    await saveGoogleUser(profile);

    // Refresh authoritative teams from server
    let loadedTeams = await loadTeams();
    if (!Array.isArray(loadedTeams)) loadedTeams = [];
    loadedTeams = loadedTeams.filter(
      (t) => t.id !== 'team_1793250191038' && !t.name.includes("'s Squad")
    );
    dispatch(setTeams(loadedTeams));

    // Check which teams the user belongs to
    const userTeams = getUserTeams(loadedTeams, profile);
    if (userTeams.length > 0) {
      dispatch(syncUserWithTeams(profile));
      const savedActiveTeamId = await loadActiveTeamId();
      const validActive = userTeams.find((t) => t.id === savedActiveTeamId);
      dispatch(setActiveTeamId(validActive ? validActive.id : userTeams[0].id));
      showToastMsg(`Signed in as ${profile.name}`);
    } else {
      // Absolutely do NOT create a new squad or team automatically on login!
      // Prompt user to Join a Team or Create a Team
      dispatch(setActiveTeamId(null));
      dispatch(setModalOpen({ modalName: 'isTeamChoiceModalOpen', isOpen: true }));
      showToastMsg(`Welcome, ${profile.name}! Join or create a team to get started.`);
    }
  };

  // Google Sign Out Handler
  const handleGoogleSignOut = async () => {
    dispatch(clearUser());
    dispatch(resetTeams());
    await clearGoogleUser();
    try {
      localStorage.removeItem('office_active_team_id');
      localStorage.removeItem('office_teams_list');
    } catch {}
    showToastMsg('Signed out successfully');
  };

  // Team: Create New Team
  const handleCreateTeam = async (newTeamData) => {
    const created = createNewTeam(newTeamData);
    dispatch(addTeam(created));
    await saveTeams([created, ...(teams || [])]);
    await saveActiveTeamId(created.id);
    showToastMsg(`🎉 Created team "${created.name}" (Code: ${created.code})`);
  };

  // Team: Select Active Team
  const handleSelectTeam = (teamId) => {
    dispatch(setActiveTeamId(teamId));
    const target = teams.find((t) => t.id === teamId);
    if (target) {
      showToastMsg(`Switched to ${target.name}`);
    }
  };

  // Team: Send Invite to Colleague
  const handleSendInvite = (teamId, inviteData) => {
    dispatch(sendInvite({ teamId, invite: inviteData }));
  };

  // Team: Join Team by Code
  const handleJoinTeamByCode = async (teamId, user, freshTeamObj) => {
    dispatch(joinTeamByCode({ teamId, user, freshTeamObj }));
    const target = (teams || []).find((t) => t.id === teamId) || freshTeamObj;
    if (target) {
      const newMember = {
        id: user?.sub ? `m_${user.sub}` : `m_${Date.now()}`,
        name: user?.name || 'Colleague',
        email: user?.email || '',
        role: 'Team Member',
        dept: target.dept || 'Engineering',
        status: 'office',
        avatarBg: '#3b82f6',
        desk: 'Office',
        picture: user?.picture || null,
      };

      const existingIndex = (teams || []).findIndex((t) => t.id === target.id);
      let updatedTeams = [];
      if (existingIndex !== -1) {
        updatedTeams = teams.map((t) => {
          if (t.id !== target.id) return t;
          const currentMembers = t.members || [];
          const exists = currentMembers.some(
            (m) =>
              (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
              m.name.toLowerCase() === newMember.name.toLowerCase()
          );
          return {
            ...t,
            members: exists
              ? currentMembers.map((m) =>
                  (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
                  m.name.toLowerCase() === newMember.name.toLowerCase()
                    ? { ...m, ...newMember, role: m.role || newMember.role }
                    : m
                )
              : [newMember, ...currentMembers],
          };
        });
      } else {
        const joinedTeam = {
          ...target,
          members: [
            newMember,
            ...(target.members || []).filter(
              (m) =>
                !(
                  (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
                  m.name.toLowerCase() === newMember.name.toLowerCase()
                )
            ),
          ],
        };
        updatedTeams = [joinedTeam, ...(teams || [])];
      }

      await saveTeams(updatedTeams);
      await saveActiveTeamId(target.id);
      showToastMsg(`🎉 Joined team "${target.name}"!`);
    } else {
      showToastMsg('⚠️ Could not find team to join.');
    }
  };

  // Team: Request to Join Team
  const handleRequestJoinTeam = (teamId, user) => {
    const targetTeam = teams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    const request = {
      id: `req_${Date.now()}`,
      name: user?.name || 'Colleague',
      email: user?.email || 'colleague@gmail.com',
      role: 'Team Member',
      dept: targetTeam.dept || 'Engineering',
      date: new Date().toLocaleDateString(),
    };

    dispatch(requestJoin({ teamId, request }));
    showToastMsg(`Request sent to join ${targetTeam.name}. Waiting for approval!`);
  };

  // Team: Approve Join Request
  const handleApproveRequest = (teamId, request) => {
    dispatch(approveJoinRequest({ teamId, request }));
    showToastMsg(`Approved ${request.name}! Added to team roster.`);
  };

  // Team: Reject Join Request
  const handleRejectRequest = (teamId, requestId) => {
    dispatch(rejectJoinRequest({ teamId, requestId }));
    showToastMsg('Declined join request.');
  };

  // Team: Accept Invitation
  const handleAcceptInvite = (teamId, user) => {
    dispatch(acceptInvite({ teamId, user }));
  };

  // Team: Exit / Leave Active Team Permanently
  const handleExitTeam = async () => {
    if (!activeTeam || !googleUser) return;
    const teamName = activeTeam.name;
    const teamIdToLeave = activeTeam.id;
    const confirmed = window.confirm(
      `Are you sure you want to exit "${teamName}"? You will be removed permanently from this team roster.`
    );
    if (!confirmed) return;

    const userEmail = (googleUser.email || '').toLowerCase().trim();
    const userId = googleUser.sub || googleUser.id;

    // 1. Dispatch leaveTeam in Redux
    dispatch(leaveTeam({ teamId: teamIdToLeave, user: googleUser }));

    // 2. Compute updated teams directly for immediate persistence
    const updatedTeams = teams
      .map((t) => {
        if (t.id !== teamIdToLeave) return t;
        const remainingMembers = (t.members || []).filter(
          (m) =>
            !(
              (m.googleId && userId && m.googleId === userId) ||
              (m.email && userEmail && m.email.toLowerCase().trim() === userEmail) ||
              (m.name && googleUser.name && m.name.toLowerCase().trim() === googleUser.name.toLowerCase().trim())
            )
        );
        const isOwner = t.ownerEmail && t.ownerEmail.toLowerCase().trim() === userEmail;
        if (remainingMembers.length === 0 || isOwner) {
          return null;
        }
        return {
          ...t,
          members: remainingMembers,
          invites: (t.invites || []).filter((inv) => (inv.email || '').toLowerCase().trim() !== userEmail),
          joinRequests: (t.joinRequests || []).filter((req) => (req.email || '').toLowerCase().trim() !== userEmail),
        };
      })
      .filter(Boolean);

    // 3. Immediately persist updated teams and active team ID
    await saveTeams(updatedTeams);

    const remainingUserTeams = getUserTeams(updatedTeams, googleUser);
    const nextActiveTeamId = remainingUserTeams.length > 0 ? remainingUserTeams[0].id : null;
    await saveActiveTeamId(nextActiveTeamId);

    if (!nextActiveTeamId) {
      dispatch(setActiveTeamId(null));
      dispatch(setModalOpen({ modalName: 'isTeamChoiceModalOpen', isOpen: true }));
    }

    showToastMsg(`You have permanently left "${teamName}".`);
  };

  // Roster: Add Member to Active Team
  const handleAddMember = (newMember) => {
    if (!activeTeam) return;
    dispatch(addMemberToTeam({ teamId: activeTeam.id, member: newMember }));
    showToastMsg(`Added ${newMember.name} to ${activeTeam.name}!`);
  };

  // Roster: Update Status for a member
  const handleStatusChange = (id, newStatus) => {
    if (!activeTeam) return;
    dispatch(updateMemberStatus({ teamId: activeTeam.id, memberId: id, status: newStatus }));
  };

  // Roster: Delete Member from Active Team
  const handleDeleteMember = (id) => {
    if (!activeTeam) return;
    const toDelete = members.find((m) => m.id === id);
    if (!toDelete) return;
    const confirmed = window.confirm(`Remove ${toDelete.name} from ${activeTeam.name}?`);
    if (confirmed) {
      dispatch(deleteMemberFromTeam({ teamId: activeTeam.id, memberId: id }));
      showToastMsg(`Removed ${toDelete.name}`);
    }
  };

  // Roster: Self Check-in Status
  const handleSetMyStatus = (status) => {
    if (!activeTeam) return;
    dispatch(setSelfStatus({ teamId: activeTeam.id, status, user: googleUser }));
    const label = status === 'office' ? 'Office 🏢' : status === 'wfh' ? 'WFH 🏠' : 'Leave 🌴';
    showToastMsg(`Your status updated to ${label}`);
  };

  // Roster: Copy Slack / WhatsApp Summary
  const handleCopySummary = async () => {
    const summary = formatRosterSummary(members, tomorrow.fullDateStr);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = summary;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showToastMsg(`📋 Copied ${activeTeam?.name || 'team'} roster summary!`);
    } catch {
      showToastMsg('⚠️ Could not copy to clipboard');
    }
  };

  // Permission helper: Can current user edit this member's position and roles?
  // Strictly restricted: Only the Team Author (👑 Team Author) can edit positions & roles in the team
  const canEditMember = (member) => {
    if (!member || !googleUser) return false;
    return Boolean(isAuthor);
  };

  // Profile: Open User's Own Profile Edit Modal
  const handleOpenMyProfileEdit = (member) => {
    const target = member || myMember;
    if (!target) {
      showToastMsg('⚠️ Please join or create a team first to edit your profile.');
      return;
    }
    setEditingMember(target);
    dispatch(setModalOpen({ modalName: 'isEditMemberOpen', isOpen: true }));
  };

  // Roster: Save Member Position & Roles
  const handleSaveMemberProfile = async ({ memberId, position, roles, dept, desk }) => {
    const targetMember = members.find((m) => m.id === memberId);
    if (!activeTeam || !targetMember) {
      showToastMsg('⚠️ Member not found in team.');
      return;
    }

    const userEmail = (googleUser?.email || '').toLowerCase().trim();
    const userId = googleUser?.sub || googleUser?.id;
    const isSelf =
      (targetMember.email && userEmail && targetMember.email.toLowerCase().trim() === userEmail) ||
      (targetMember.googleId && userId && targetMember.googleId === userId) ||
      (myMember && targetMember.id === myMember.id);

    if (!isSelf && !isAuthor) {
      showToastMsg('⚠️ You can only edit your own profile.');
      return;
    }

    dispatch(
      updateMemberProfile({
        teamId: activeTeam.id,
        memberId,
        updates: { position, roles, dept, desk },
      })
    );

    const updatedMembers = members.map((m) =>
      m.id === memberId ? { ...m, position, roles, dept, desk } : m
    );
    const updatedTeams = teams.map((t) =>
      t.id === activeTeam.id ? { ...t, members: updatedMembers } : t
    );
    await saveTeams(updatedTeams);

    showToastMsg('Updated profile position & roles! 💼');
  };

  // Filtered members for display
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesFilter = activeFilter === 'all' || m.status === activeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.position && m.position.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q)) ||
        (Array.isArray(m.roles) && m.roles.some((r) => r.toLowerCase().includes(q))) ||
        m.dept.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.desk && m.desk.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [members, activeFilter, searchQuery]);

  const myMember =
    members.find(
      (m) =>
        (m.email && googleUser?.email && m.email.toLowerCase() === googleUser.email.toLowerCase()) ||
        (m.googleId && googleUser?.sub && m.googleId === googleUser.sub) ||
        (m.isOwner && activeTeam?.ownerEmail && googleUser?.email && activeTeam.ownerEmail.toLowerCase() === googleUser.email.toLowerCase())
    ) || (googleUser ? { name: googleUser.name, status: 'office' } : null);

  const userTeams = useMemo(() => getUserTeams(teams, googleUser), [teams, googleUser]);

  // 1. Loading splash screen while checking persistent auth
  if (authLoading) {
    return (
      <div className={`app-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        <div className="auth-loading-screen">
          <div className="auth-loading-spinner" />
          <p className="auth-loading-text">Loading Office Roster...</p>
        </div>
      </div>
    );
  }

  // 2. Authentication Gate: Must login with Gmail first to access everything
  if (!googleUser) {
    return (
      <div className={`app-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        {toastMessage && (
          <div className="toast-notification" role="status" aria-live="polite">
            {toastMessage}
          </div>
        )}
        <LoginScreen onGoogleSignIn={handleGoogleSignIn} />
      </div>
    );
  }

  return (
    <div className={`app-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      {/* Main Top Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand-group">
            <span className="brand-badge">OFFICE</span>
            <div>
              <h1 className="brand-title">Who's In Tomorrow?</h1>
              <p className="brand-subtitle">
                <span>🗓️ {tomorrow.fullDateStr}</span>
              </p>
            </div>
          </div>

          {/* Active Team Selector Dropdown */}
          <TeamHeaderDropdown
            activeTeam={activeTeam}
            allTeams={userTeams}
            onSelectTeam={handleSelectTeam}
            onOpenCreateModal={() => dispatch(setModalOpen({ modalName: 'isCreateTeamOpen', isOpen: true }))}
            onOpenJoinModal={() => dispatch(setModalOpen({ modalName: 'isJoinModalOpen', isOpen: true }))}
            onOpenInviteModal={() => dispatch(setModalOpen({ modalName: 'isInviteModalOpen', isOpen: true }))}
            onOpenChoiceModal={() => dispatch(setModalOpen({ modalName: 'isTeamChoiceModalOpen', isOpen: true }))}
            onExitTeam={handleExitTeam}
          />

          <div className="header-actions">
            {/* Google Account Profile & Sign Out Button */}
            <div className="header-account-pill">
              <button
                type="button"
                className="btn-header-profile"
                onClick={() => dispatch(setModalOpen({ modalName: 'isGoogleModalOpen', isOpen: true }))}
                title={`Signed in as ${googleUser.name} (${googleUser.email}). Click to view details.`}
                aria-label="Google account settings"
              >
                {googleUser.picture ? (
                  <img src={googleUser.picture} alt={googleUser.name} className="header-user-img" />
                ) : (
                  <span className="header-user-avatar-initials">
                    {googleUser.initials || googleUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="header-user-meta">
                  <span className="header-user-name">{googleUser.name}</span>
                  <span className="header-user-email">{googleUser.email}</span>
                </div>
              </button>
              {activeTeam && myMember && (
                <button
                  type="button"
                  className="btn-header-edit-profile"
                  onClick={() => handleOpenMyProfileEdit(myMember)}
                  title="Edit your position and roles"
                  aria-label="Edit Profile"
                >
                  <span className="edit-icon">✏️</span>
                  <span>Edit Profile</span>
                </button>
              )}
              <button
                type="button"
                className="btn-header-signout"
                onClick={handleGoogleSignOut}
                title="Sign Out of Gmail"
                aria-label="Sign Out of Gmail"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {!activeTeam ? (
          <div className="empty-state-card no-teams-welcome">
            <span className="empty-state-emoji">🏢</span>
            <h2 className="empty-state-title">Welcome to Office Team Roster, {googleUser?.name?.split(' ')[0] || ''}!</h2>
            <p className="empty-state-text">
              Track who is coming to the office tomorrow. Get started by joining your colleagues' team with a Team Code or creating a new team!
            </p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => dispatch(setModalOpen({ modalName: 'isCreateTeamOpen', isOpen: true }))}
              >
                ➕ Create a Team
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dispatch(setModalOpen({ modalName: 'isJoinModalOpen', isOpen: true }))}
              >
                🤝 Join with Code
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Team Invitations & Join Requests Banner */}
            <TeamNotificationBanner
              activeTeam={activeTeam}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              currentUser={googleUser}
              allTeams={teams}
              onAcceptInvite={handleAcceptInvite}
            />

            {/* Quick Self-Checkin Banner */}
            <SelfCheckinBanner
              myName={myMember ? myMember.name : (googleUser ? googleUser.name : 'You')}
              myStatus={myMember ? myMember.status : 'office'}
              onSetMyStatus={handleSetMyStatus}
              tomorrowDateStr={tomorrow.shortDateStr}
              onOpenCalendar={() => dispatch(setModalOpen({ modalName: 'isCalendarModalOpen', isOpen: true }))}
              onEditProfile={() => handleOpenMyProfileEdit(myMember)}
            />

            {/* Attendance Summary KPIs for Active Team */}
            <SummaryCards
              members={members}
              activeFilter={activeFilter}
              onFilterChange={(filter) => dispatch(setActiveFilter(filter))}
            />

            {/* Live Android Home Screen Widget Preview */}
            <OfficeWidgetPreview
              members={members}
              tomorrowDateStr={tomorrow.shortDateStr}
            />

            {/* Controls Toolbar: Search, Filters, and Bulk Actions */}
            <section className="toolbar-section">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="search"
                  className="search-input"
                  placeholder={`Search in ${activeTeam?.name || 'team'}...`}
                  value={searchQuery}
                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                  aria-label="Search members"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn-clear-search"
                    onClick={() => dispatch(setSearchQuery(''))}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="filter-pill-row">
                <button
                  type="button"
                  className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => dispatch(setActiveFilter('all'))}
                >
                  All ({members.length})
                </button>
                <button
                  type="button"
                  className={`filter-tab filter-office ${activeFilter === 'office' ? 'active' : ''}`}
                  onClick={() => dispatch(setActiveFilter('office'))}
                >
                  🏢 Office ({members.filter((m) => m.status === 'office').length})
                </button>
                <button
                  type="button"
                  className={`filter-tab filter-wfh ${activeFilter === 'wfh' ? 'active' : ''}`}
                  onClick={() => dispatch(setActiveFilter('wfh'))}
                >
                  🏠 WFH ({members.filter((m) => m.status === 'wfh').length})
                </button>
                <button
                  type="button"
                  className={`filter-tab filter-leave ${activeFilter === 'leave' ? 'active' : ''}`}
                  onClick={() => dispatch(setActiveFilter('leave'))}
                >
                  🌴 Leave ({members.filter((m) => m.status === 'leave').length})
                </button>
              </div>

              <div className="bulk-actions-row">
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleCopySummary}
                >
                  📋 Copy Roster for Slack/WhatsApp
                </button>
              </div>
            </section>

            {/* Team Members List */}
            <section className="members-section" aria-label="Team members roster">
              <div className="members-header">
                <div>
                  <h2 className="members-heading">
                    {activeTeam?.name} ({filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'})
                  </h2>
                  <p className="members-subheading">📍 {activeTeam?.location}</p>
                </div>
                <div className="members-header-actions">
                  <button
                    type="button"
                    className="btn-exit-team"
                    onClick={handleExitTeam}
                    title={`Exit ${activeTeam?.name}`}
                  >
                    🚪 Exit Team
                  </button>
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="empty-state-card">
                  <span className="empty-state-emoji">🔍</span>
                  <h3 className="empty-state-title">No matching team members found</h3>
                  <p className="empty-state-text">
                    Try adjusting your search query, or invite colleagues to join {activeTeam?.name}.
                  </p>
                  <div className="empty-state-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        dispatch(setSearchQuery(''));
                        dispatch(setActiveFilter('all'));
                      }}
                    >
                      Clear Filters
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => dispatch(setModalOpen({ modalName: 'isInviteModalOpen', isOpen: true }))}
                    >
                      Invite Colleagues
                    </button>
                  </div>
                </div>
              ) : (
                <div className="members-grid">
                  {filteredMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={modals.isAddModalOpen}
        onClose={() => dispatch(setModalOpen({ modalName: 'isAddModalOpen', isOpen: false }))}
        onAddMember={handleAddMember}
      />

      {/* Google / Gmail Login Modal & User Profile */}
      <GoogleLoginModal
        isOpen={modals.isGoogleModalOpen}
        onClose={() => dispatch(setModalOpen({ modalName: 'isGoogleModalOpen', isOpen: false }))}
        currentUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        currentMember={myMember}
        activeTeam={activeTeam}
        onEditProfile={handleOpenMyProfileEdit}
      />

      {/* Google Calendar Modal */}
      <GoogleCalendarModal
        isOpen={modals.isCalendarModalOpen}
        onClose={() => dispatch(setModalOpen({ modalName: 'isCalendarModalOpen', isOpen: false }))}
        currentMember={myMember}
        tomorrowDetails={tomorrow}
        allMembers={members}
        onToast={showToastMsg}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={modals.isCreateTeamOpen}
        onClose={() => dispatch(setModalOpen({ modalName: 'isCreateTeamOpen', isOpen: false }))}
        onCreateTeam={handleCreateTeam}
        currentUser={googleUser}
      />

      {/* Invite Colleagues Modal */}
      <InviteColleaguesModal
        isOpen={modals.isInviteModalOpen}
        onClose={() => dispatch(setModalOpen({ modalName: 'isInviteModalOpen', isOpen: false }))}
        activeTeam={activeTeam}
        onSendInvite={handleSendInvite}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        onToast={showToastMsg}
      />

      {/* Join Team Modal */}
      <JoinTeamModal
        isOpen={modals.isJoinModalOpen}
        onClose={() => {
          dispatch(setModalOpen({ modalName: 'isJoinModalOpen', isOpen: false }));
          dispatch(setInitialJoinCode(''));
        }}
        allTeams={teams}
        currentUser={googleUser}
        onJoinTeamByCode={handleJoinTeamByCode}
        onRequestJoinTeam={handleRequestJoinTeam}
        initialCode={initialJoinCode}
      />

      {/* Join or Create Team Choice Modal (Shown on Login when user has no team) */}
      <TeamChoiceModal
        isOpen={modals.isTeamChoiceModalOpen}
        onClose={() => dispatch(setModalOpen({ modalName: 'isTeamChoiceModalOpen', isOpen: false }))}
        currentUser={googleUser}
        onChooseJoin={() => dispatch(setModalOpen({ modalName: 'isJoinModalOpen', isOpen: true }))}
        onChooseCreate={() => dispatch(setModalOpen({ modalName: 'isCreateTeamOpen', isOpen: true }))}
      />

      {/* Edit Member Position & Roles Modal */}
      <EditMemberModal
        isOpen={modals.isEditMemberOpen}
        onClose={() => dispatch(setModalOpen({ modalName: 'isEditMemberOpen', isOpen: false }))}
        member={editingMember}
        teamName={activeTeam?.name}
        currentUser={googleUser}
        onSave={handleSaveMemberProfile}
      />
    </div>
  );
}

export default App;
