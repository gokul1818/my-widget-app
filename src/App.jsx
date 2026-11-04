import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  EmailNotificationModal,
} from './components';
import {
  notifyTeamStatusChange,
} from './utils/notificationService';
import {
  listenForegroundMessages,
  isPushSupported,
  getSavedPushToken,
  requestPushPermissionAndGetToken,
} from './utils/firebasePush';
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
  setMemberPushToken,
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

        if (loadedTeams.length > 0) {
          dispatch(setTeams(loadedTeams));
        }

        const effectiveTeams = loadedTeams.length > 0 ? loadedTeams : (teams || []);

        if (activeUser) {
          const userTeams = getUserTeams(effectiveTeams, activeUser);
          if (userTeams.length > 0) {
            const savedActiveTeamId = await loadActiveTeamId();
            const validActive = userTeams.find((t) => t.id === savedActiveTeamId);
            const selectedTeamId = validActive ? validActive.id : userTeams[0].id;
            dispatch(setActiveTeamId(selectedTeamId));
            await saveActiveTeamId(selectedTeamId);
            dispatch(syncUserWithTeams(activeUser));
          } else if (effectiveTeams.length > 0) {
            const savedActiveTeamId = await loadActiveTeamId();
            const validActive = effectiveTeams.find((t) => t.id === savedActiveTeamId) || effectiveTeams[0];
            if (validActive) {
              dispatch(setActiveTeamId(validActive.id));
              await saveActiveTeamId(validActive.id);
            }
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

    if (Array.isArray(teams) && teams.length > 0) {
      saveTeams(teams);
    }
    if (activeTeam) {
      saveActiveTeamId(activeTeam.id);
      syncRosterToNative(activeTeam.members || [], tomorrow.shortDateStr);
    }
  }, [teams, activeTeam, authLoading, tomorrow.shortDateStr]);

  // Toast trigger helper
  const showToastMsg = useCallback((msg) => {
    dispatch(showToast(msg));
    setTimeout(() => {
      dispatch(hideToast());
    }, 3200);
  }, [dispatch]);

  // Register FCM push token for current user across their teams
  const handleRegisterPushToken = useCallback(
    async (token, targetUser = googleUser) => {
      const user = targetUser || googleUser;
      if (!token) return;
      if (user?.email) {
        dispatch(setMemberPushToken({ userEmail: user.email, token }));
      }
      const userEmail = (user?.email || '').toLowerCase().trim();
      const userId = user?.sub || user?.id;
      const userName = (user?.name || '').toLowerCase().trim();

      const updatedTeams = (teams || []).map((t) => {
        const isMember = (t.members || []).some(
          (m) =>
            (m.email && userEmail && m.email.toLowerCase().trim() === userEmail) ||
            (m.googleId && userId && m.googleId === userId) ||
            (m.name && userName && m.name.toLowerCase().trim() === userName)
        );
        if (!isMember) {
          const isOwner = t.ownerEmail && userEmail && t.ownerEmail.toLowerCase().trim() === userEmail;
          if (!isOwner) return t;
        }
        return {
          ...t,
          members: (t.members || []).map((m) => {
            const match =
              (m.email && userEmail && m.email.toLowerCase().trim() === userEmail) ||
              (m.googleId && userId && m.googleId === userId) ||
              (m.name && userName && m.name.toLowerCase().trim() === userName) ||
              (m.isOwner && t.ownerEmail && userEmail && t.ownerEmail.toLowerCase().trim() === userEmail);
            if (match) {
              return { ...m, fcmToken: token };
            }
            return m;
          }),
        };
      });
      await saveTeams(updatedTeams);
    },
    [googleUser, teams, dispatch]
  );

  // Automatically ask browser for notification permission when application opens
  const autoInitPushNotifications = useCallback(
    async (targetUser = googleUser) => {
      if (!isPushSupported()) return;

      // Do not re-prompt if user explicitly denied/blocked notifications in browser settings
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        return;
      }

      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          let token = getSavedPushToken();
          if (!token) {
            const res = await requestPushPermissionAndGetToken();
            token = res?.token;
          }
          if (token && targetUser) {
            handleRegisterPushToken(token, targetUser);
          }
          return;
        }

        // When application opens and permission is 'default', directly trigger the browser permission prompt
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          const res = await requestPushPermissionAndGetToken();
          if (res?.permission === 'granted' && res?.token) {
            showToastMsg('🔔 Push notifications enabled!');
            if (targetUser) {
              handleRegisterPushToken(res.token, targetUser);
            }
          }
        }
      } catch (err) {
        console.warn('Auto push initialization error:', err);
      }
    },
    [googleUser, handleRegisterPushToken, showToastMsg]
  );

  // Firebase foreground push notification listener & auto-ask permission on application open
  useEffect(() => {
    const unsubscribe = listenForegroundMessages((payload) => {
      showToastMsg(`🔔 ${payload.title}: ${payload.body}`);
    });

    // 1. Ask directly when opening the application
    autoInitPushNotifications(googleUser);

    // 2. Also register a one-time gesture trigger in case the browser requires user interaction
    const handleFirstGesture = () => {
      if (isPushSupported() && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        autoInitPushNotifications(googleUser);
      }
    };

    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });

    return () => {
      unsubscribe();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, [googleUser, autoInitPushNotifications, showToastMsg]);

  // Google Sign In Handler
  const handleGoogleSignIn = async (profile) => {
    dispatch(setUser(profile));
    await saveGoogleUser(profile);

    // Automatically initialize/register push notifications upon sign-in
    autoInitPushNotifications(profile);

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
  const handleStatusChange = async (id, newStatus) => {
    if (!activeTeam) return;
    const target = members.find((m) => m.id === id);
    const oldStatus = target?.status;
    dispatch(updateMemberStatus({ teamId: activeTeam.id, memberId: id, status: newStatus }));

    if (target && oldStatus !== newStatus) {
      try {
        const sender = target.email ? target : (googleUser || target);
        const notifyRes = await notifyTeamStatusChange({
          team: activeTeam,
          user: sender,
          newStatus,
          oldStatus,
          dateStr: tomorrow.fullDateStr,
          triggerLocalPreview: true,
        });
        const label = newStatus === 'office' ? 'Office 🏢' : newStatus === 'wfh' ? 'WFH 🏠' : 'Leave 🌴';
        if (notifyRes && (notifyRes.count > 0 || notifyRes.pushCount > 0)) {
          const alerts = [];
          if (notifyRes.count > 0) alerts.push(`📧 ${notifyRes.count} email`);
          if (notifyRes.pushCount > 0) alerts.push(`🔔 ${notifyRes.pushCount} push`);
          showToastMsg(`Updated ${target.name} to ${label} • Intimated ${alerts.join(' + ')}`);
        }
      } catch (err) {
        console.warn('Member status notification error:', err);
      }
    }
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

  // Roster: Self Check-in Status & Intimate Colleagues via Email & Firebase Push
  const handleSetMyStatus = async (status) => {
    if (!activeTeam) return;
    const oldStatus = myMember?.status || 'office';
    dispatch(setSelfStatus({ teamId: activeTeam.id, status, user: googleUser }));
    const label = status === 'office' ? 'Office 🏢' : status === 'wfh' ? 'WFH 🏠' : 'Leave 🌴';

    if (googleUser && oldStatus !== status) {
      try {
        const notifyRes = await notifyTeamStatusChange({
          team: activeTeam,
          user: googleUser,
          newStatus: status,
          oldStatus,
          dateStr: tomorrow.fullDateStr,
          triggerLocalPreview: true,
        });
        if (notifyRes && (notifyRes.count > 0 || notifyRes.pushCount > 0)) {
          const alerts = [];
          if (notifyRes.count > 0) alerts.push(`📧 ${notifyRes.count} ${notifyRes.count === 1 ? 'colleague' : 'colleagues'}`);
          if (notifyRes.pushCount > 0) alerts.push(`🔔 ${notifyRes.pushCount} push`);
          showToastMsg(`Your status updated to ${label} • Intimated ${alerts.join(' + ')}`);
          return;
        }
      } catch (err) {
        console.warn('Status change notification error:', err);
      }
    }
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
      <div className="app-container theme-light">
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
      <div className="app-container theme-light">
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
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 pb-24 px-4 sm:px-5 selection:bg-emerald-100 selection:text-emerald-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full shadow-lg border border-slate-700 animate-fade-in"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}

      {/* BEGIN: TopBar */}
      <header className="pt-3 pb-4 border-b border-slate-200/70 relative" data-purpose="top-navigation">
        {/* Clayfin Signature Mosaic Strip on Header */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2.5px]"
          style={{ background: 'var(--mosaic, linear-gradient(90deg, #1c417a 0 14.28%, #249ed6 14.28% 28.56%, #17974f 28.56% 42.84%, #f5a922 42.84% 57.12%, #e5542b 57.12% 71.4%, #de262c 71.4% 85.68%, #e01c62 85.68%))' }}
          aria-hidden="true"
        />

        {/* Upper Status Row: App Badge & User Profile */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {/* Team Selector Dropdown */}
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
          </div>

          {/* User Profile Pill & Bell */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-600 hover:text-amber-600 hover:border-amber-300 shadow-sm active:scale-95 transition-all cursor-pointer"
              onClick={() => dispatch(setModalOpen({ modalName: 'isEmailNotifyModalOpen', isOpen: true }))}
              title="Team Attendance Alerts & Push Notifications"
            >
              🔔
            </button>

            <button
              type="button"
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 bg-white border border-slate-200/80 rounded-full shadow-sm hover:border-slate-300 transition-colors active:scale-95 cursor-pointer"
              data-purpose="profile-trigger"
              onClick={() => dispatch(setModalOpen({ modalName: 'isGoogleModalOpen', isOpen: true }))}
              title={`Signed in as ${googleUser.name} (${googleUser.email}). Tap to view profile.`}
            >
              {googleUser.picture ? (
                <img
                  src={googleUser.picture}
                  alt={googleUser.name}
                  className="w-6 h-6 rounded-full object-cover ring-2 ring-emerald-100"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-navy text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-sky-200">
                  {googleUser.initials || googleUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-700 max-w-[85px] truncate">
                {googleUser.name?.split(' ')[0] || 'Profile'}
              </span>
            </button>
          </div>
        </div>

        {/* App Title & Date Selector Row */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Who's In Tomorrow?
            </h1>
            <button
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors mt-0.5 cursor-pointer"
              data-purpose="date-selector"
              type="button"
              onClick={() => dispatch(setModalOpen({ modalName: 'isCalendarModalOpen', isOpen: true }))}
            >
              <span>📅</span>
              <span className="font-semibold text-slate-800">{tomorrow.fullDateStr}</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium border border-slate-200/60">
                Tomorrow
              </span>
            </button>
          </div>

          {/* Live status indicator mini badge */}
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                (myMember?.status || 'office') === 'office'
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : (myMember?.status || 'office') === 'wfh'
                  ? 'text-sky-700 bg-sky-50 border border-sky-200'
                  : 'text-amber-700 bg-amber-50 border border-amber-200'
              }`}
            >
              <span>
                {(myMember?.status || 'office') === 'office'
                  ? '🏢'
                  : (myMember?.status || 'office') === 'wfh'
                  ? '🏠'
                  : '🌴'}
              </span>
              <span>
                Your status:{' '}
                {(myMember?.status || 'office') === 'office'
                  ? 'Office'
                  : (myMember?.status || 'office') === 'wfh'
                  ? 'WFH'
                  : 'Leave'}
              </span>
            </span>
          </div>
        </div>
      </header>
      {/* END: TopBar */}

      {/* BEGIN: MainContent */}
      <main className="space-y-4 pt-4 flex-1">
        {!activeTeam ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-soft">
            <span className="text-4xl block mb-2">🏢</span>
            <h2 className="text-base font-bold text-slate-900">
              Welcome to Office Team Roster, {googleUser?.name?.split(' ')[0] || ''}!
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Track who is coming to the office tomorrow. Get started by joining your colleagues' team with a Team Code or creating a new team!
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 shadow-sm cursor-pointer"
                onClick={() => dispatch(setModalOpen({ modalName: 'isCreateTeamOpen', isOpen: true }))}
              >
                ➕ Create a Team
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 shadow-sm cursor-pointer"
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
              onEditProfile={() => myMember && handleOpenMyProfileEdit(myMember)}
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

            {/* Team Roster Section: Search, Filters, and Members List */}
            <section className="space-y-3" data-purpose="team-roster-section">
              {/* Section Header with Meta & Exit */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{activeTeam.name}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                      {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <span>📍</span>
                    <span>{activeTeam.location || 'Main Office, 4th Floor'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer"
                    type="button"
                    onClick={() => dispatch(setModalOpen({ modalName: 'isInviteModalOpen', isOpen: true }))}
                    title="Invite colleagues to team"
                  >
                    <span>➕</span>
                    <span>Invite</span>
                  </button>
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/70 rounded-full hover:bg-rose-100 transition-colors cursor-pointer"
                    data-purpose="exit-team-btn"
                    type="button"
                    onClick={handleExitTeam}
                    title={`Exit ${activeTeam.name}`}
                  >
                    <span>🚪</span>
                    <span>Exit Team</span>
                  </button>
                </div>
              </div>

              {/* Search Bar & Copy Roster Action */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                    🔍
                  </span>
                  <input
                    className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 shadow-sm"
                    data-purpose="roster-search-input"
                    placeholder={`Search members in ${activeTeam.name}...`}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      onClick={() => dispatch(setSearchQuery(''))}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Copy Roster Action */}
                <button
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                  data-purpose="copy-roster-btn"
                  type="button"
                  onClick={handleCopySummary}
                >
                  <span>📋</span>
                  <span>Copy</span>
                </button>
              </div>

              {/* Filter Chips Carousel */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" data-purpose="filter-chips">
                <button
                  className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm shrink-0 transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-navy text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  type="button"
                  onClick={() => dispatch(setActiveFilter('all'))}
                >
                  All ({members.length})
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                    activeFilter === 'office'
                      ? 'bg-navy text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  type="button"
                  onClick={() => dispatch(setActiveFilter('office'))}
                >
                  <span>🏢</span>
                  <span>Office ({members.filter((m) => m.status === 'office').length})</span>
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                    activeFilter === 'wfh'
                      ? 'bg-navy text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  type="button"
                  onClick={() => dispatch(setActiveFilter('wfh'))}
                >
                  <span>🏠</span>
                  <span>WFH ({members.filter((m) => m.status === 'wfh').length})</span>
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                    activeFilter === 'leave'
                      ? 'bg-navy text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  type="button"
                  onClick={() => dispatch(setActiveFilter('leave'))}
                >
                  <span>🌴</span>
                  <span>Leave ({members.filter((m) => m.status === 'leave').length})</span>
                </button>
              </div>

              {/* Member Cards List */}
              {filteredMembers.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-soft">
                  <span className="text-3xl block mb-2">🔍</span>
                  <h3 className="text-sm font-bold text-slate-800">No matching team members found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting your search query, or invite colleagues to join {activeTeam?.name}.
                  </p>
                  <div className="flex gap-2 justify-center mt-3">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        dispatch(setSearchQuery(''));
                        dispatch(setActiveFilter('all'));
                      }}
                    >
                      Clear Filters
                    </button>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 cursor-pointer"
                      onClick={() => dispatch(setModalOpen({ modalName: 'isInviteModalOpen', isOpen: true }))}
                    >
                      Invite Colleagues
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 pt-1" data-purpose="member-list">
                  {filteredMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      isSelf={member.id === myMember?.id}
                      onEditProfile={handleOpenMyProfileEdit}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      {/* END: MainContent */}

      {/* BEGIN: BottomNavigationDock */}
      <nav
        className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2 shadow-xl flex items-center justify-around z-40"
        data-purpose="mobile-tab-bar"
      >
        {/* Tab 1: Who's In (Active) */}
        <button
          className="flex flex-col items-center gap-0.5 text-navy font-bold cursor-pointer"
          data-tab="presence"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <svg className="w-5 h-5 text-navy" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <span className="text-[10px] text-navy font-bold">Tracker</span>
        </button>

        {/* Tab 2: Schedule */}
        <button
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-700 font-medium cursor-pointer"
          data-tab="calendar"
          type="button"
          onClick={() => dispatch(setModalOpen({ modalName: 'isCalendarModalOpen', isOpen: true }))}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[10px]">Schedule</span>
        </button>

        {/* Tab 3: Profile Settings */}
        <button
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-700 font-medium cursor-pointer"
          data-tab="settings"
          type="button"
          onClick={() => dispatch(setModalOpen({ modalName: 'isGoogleModalOpen', isOpen: true }))}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
      {/* END: BottomNavigationDock */}

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

      {/* Firebase Push & Email Alerts Modal */}
      <EmailNotificationModal
        isOpen={modals.isEmailNotifyModalOpen}
        onClose={() => dispatch(setModalOpen({ modalName: 'isEmailNotifyModalOpen', isOpen: false }))}
        activeTeam={activeTeam}
        currentUser={googleUser}
        tomorrowDateStr={tomorrow.shortDateStr}
        onToast={showToastMsg}
        onRegisterPushToken={handleRegisterPushToken}
      />
    </div>
  );
}

export default App;
