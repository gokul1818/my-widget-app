import React, { useState, useEffect, useMemo } from 'react';
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
  createOrUpdateMemberFromGoogle,
} from './utils/googleAuth';
import {
  initialTeams,
  loadTeams,
  saveTeams,
  loadActiveTeamId,
  saveActiveTeamId,
  createNewTeam,
} from './utils/teamData';
import './App.css';

export function App() {
  const [teams, setTeams] = useState(initialTeams);
  const [activeTeamId, setActiveTeamId] = useState('team_eng');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'office' | 'wfh' | 'leave'
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('dark');
  const [toastMessage, setToastMessage] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const tomorrow = useMemo(() => getTomorrowDetails(), []);

  // 1. Initial Load from storage
  useEffect(() => {
    async function init() {
      const savedTeams = await loadTeams();
      if (savedTeams && Array.isArray(savedTeams) && savedTeams.length > 0) {
        setTeams(savedTeams);
      }

      const savedActiveTeamId = await loadActiveTeamId();
      if (savedActiveTeamId) {
        setActiveTeamId(savedActiveTeamId);
      }

      const savedGoogleUser = await loadGoogleUser();
      if (savedGoogleUser) {
        setGoogleUser(savedGoogleUser);
      }

      // Check URL parameters for ?join=CODE
      try {
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get('join');
        if (joinCode) {
          setIsJoinModalOpen(true);
        }
      } catch {
        // ignore
      }
    }
    init();
  }, []);

  // Active Team & Members resolution
  const activeTeam = useMemo(() => {
    return teams.find((t) => t.id === activeTeamId) || teams[0];
  }, [teams, activeTeamId]);

  const members = useMemo(() => {
    return activeTeam?.members || [];
  }, [activeTeam]);

  // Save teams & Sync to native widget whenever teams or activeTeam changes
  useEffect(() => {
    saveTeams(teams);
    if (activeTeam) {
      saveActiveTeamId(activeTeam.id);
      syncRosterToNative(activeTeam.members || [], tomorrow.shortDateStr);
    }
  }, [teams, activeTeam, tomorrow.shortDateStr]);

  // Toast trigger helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async (profile) => {
    setGoogleUser(profile);
    await saveGoogleUser(profile);

    // Sync user into active team members
    const linkedMember = createOrUpdateMemberFromGoogle(profile, members);
    if (linkedMember && activeTeam) {
      setTeams((prevTeams) =>
        prevTeams.map((t) => {
          if (t.id !== activeTeam.id) return t;
          const exists = t.members.some(
            (m) =>
              m.id === linkedMember.id ||
              (m.email && linkedMember.email && m.email.toLowerCase() === linkedMember.email.toLowerCase()) ||
              m.name.toLowerCase() === linkedMember.name.toLowerCase()
          );
          const updatedMembers = exists
            ? t.members.map((m) =>
                m.id === linkedMember.id ||
                (m.email && linkedMember.email && m.email.toLowerCase() === linkedMember.email.toLowerCase())
                  ? { ...m, ...linkedMember }
                  : m
              )
            : [linkedMember, ...t.members];
          return { ...t, members: updatedMembers };
        })
      );
    }

    showToast(`Connected with Gmail: ${profile.email}`);
  };

  // Google Sign Out Handler
  const handleGoogleSignOut = async () => {
    setGoogleUser(null);
    await clearGoogleUser();
    showToast('Disconnected Google / Gmail account');
  };

  // Team: Create New Team
  const handleCreateTeam = (newTeamData) => {
    const created = createNewTeam(newTeamData);
    setTeams((prev) => [created, ...prev]);
    setActiveTeamId(created.id);
    showToast(`🎉 Created team "${created.name}" (Code: ${created.code})`);
  };

  // Team: Select Active Team
  const handleSelectTeam = (teamId) => {
    setActiveTeamId(teamId);
    const target = teams.find((t) => t.id === teamId);
    if (target) {
      showToast(`Switched to ${target.name}`);
    }
  };

  // Team: Send Invite to Colleague
  const handleSendInvite = (teamId, inviteData) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const existingInvites = t.invites || [];
        const alreadyInvited = existingInvites.some(
          (inv) => inv.email.toLowerCase() === inviteData.email.toLowerCase()
        );
        if (alreadyInvited) return t;
        return { ...t, invites: [inviteData, ...existingInvites] };
      })
    );
  };

  // Team: Join Team by Code
  const handleJoinTeamByCode = (teamId, user) => {
    const targetTeam = teams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    const newMember = {
      id: `m_${Date.now()}`,
      name: user?.name || 'Colleague',
      email: user?.email || '',
      role: 'Team Member',
      dept: targetTeam.dept || 'Engineering',
      status: 'office',
      avatarBg: '#3b82f6',
      desk: 'Office',
    };

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const exists = t.members.some(
          (m) => (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) || m.name === newMember.name
        );
        if (exists) return t;
        return { ...t, members: [newMember, ...t.members] };
      })
    );

    setActiveTeamId(teamId);
    showToast(`Joined ${targetTeam.name}!`);
  };

  // Team: Request to Join Team (Vice-Versa)
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

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const reqs = t.joinRequests || [];
        return { ...t, joinRequests: [request, ...reqs] };
      })
    );

    showToast(`Request sent to join ${targetTeam.name}. Waiting for approval!`);
  };

  // Team: Approve Join Request
  const handleApproveRequest = (teamId, request) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const newMember = {
          id: `m_${Date.now()}`,
          name: request.name,
          email: request.email,
          role: request.role || 'Team Member',
          dept: request.dept || t.dept || 'General',
          status: 'office',
          avatarBg: '#10b981',
          desk: 'Office',
        };
        const updatedReqs = (t.joinRequests || []).filter((r) => r.id !== request.id);
        return {
          ...t,
          members: [newMember, ...t.members],
          joinRequests: updatedReqs,
        };
      })
    );
    showToast(`Approved ${request.name}! Added to team roster.`);
  };

  // Team: Reject Join Request
  const handleRejectRequest = (teamId, requestId) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const updatedReqs = (t.joinRequests || []).filter((r) => r.id !== requestId);
        return { ...t, joinRequests: updatedReqs };
      })
    );
    showToast('Declined join request.');
  };

  // Team: Accept Invitation
  const handleAcceptInvite = (teamId, user) => {
    handleJoinTeamByCode(teamId, user);
    // Remove invite from team
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const filteredInvites = (t.invites || []).filter(
          (inv) => inv.email.toLowerCase() !== (user?.email || '').toLowerCase()
        );
        return { ...t, invites: filteredInvites };
      })
    );
  };

  // Roster: Add Member to Active Team
  const handleAddMember = (newMember) => {
    if (!activeTeam) return;
    setTeams((prev) =>
      prev.map((t) => (t.id === activeTeam.id ? { ...t, members: [newMember, ...t.members] } : t))
    );
    showToast(`Added ${newMember.name} to ${activeTeam.name}!`);
  };

  // Roster: Update Status for a member
  const handleStatusChange = (id, newStatus) => {
    if (!activeTeam) return;
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== activeTeam.id) return t;
        return {
          ...t,
          members: t.members.map((m) => (m.id === id ? { ...m, status: newStatus } : m)),
        };
      })
    );
  };

  // Roster: Delete Member from Active Team
  const handleDeleteMember = (id) => {
    if (!activeTeam) return;
    const toDelete = members.find((m) => m.id === id);
    if (!toDelete) return;
    const confirmed = window.confirm(`Remove ${toDelete.name} from ${activeTeam.name}?`);
    if (confirmed) {
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== activeTeam.id) return t;
          return {
            ...t,
            members: t.members.filter((m) => m.id !== id),
          };
        })
      );
      showToast(`Removed ${toDelete.name}`);
    }
  };

  // Roster: Self Check-in Status
  const handleSetMyStatus = (status) => {
    if (!activeTeam) return;
    const myIdentifier = googleUser?.email || googleUser?.name || 'Gokulakrishnan';
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== activeTeam.id) return t;
        let matched = false;
        const updatedMembers = t.members.map((m) => {
          if (
            (m.email && googleUser?.email && m.email.toLowerCase() === googleUser.email.toLowerCase()) ||
            m.name.toLowerCase() === myIdentifier.toLowerCase() ||
            m.isOwner
          ) {
            matched = true;
            return { ...m, status };
          }
          return m;
        });

        if (!matched && t.members.length > 0) {
          updatedMembers[0] = { ...updatedMembers[0], status };
        }

        return { ...t, members: updatedMembers };
      })
    );

    const label = status === 'office' ? 'Office 🏢' : status === 'wfh' ? 'WFH 🏠' : 'Leave 🌴';
    showToast(`Your status updated to ${label}`);
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
      showToast(`📋 Copied ${activeTeam.name} roster summary!`);
    } catch {
      showToast('⚠️ Could not copy to clipboard');
    }
  };

  // Bulk: Mark All Office
  const handleMarkAllOffice = () => {
    if (!activeTeam) return;
    setTeams((prev) =>
      prev.map((t) =>
        t.id === activeTeam.id
          ? { ...t, members: t.members.map((m) => ({ ...m, status: 'office' })) }
          : t
      )
    );
    showToast('Marked all members as Coming to Office 🏢');
  };

  // Filtered members for display
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesFilter = activeFilter === 'all' || m.status === activeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
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
        m.name === (googleUser ? googleUser.name : 'Gokulakrishnan')
    ) || members[0] || (googleUser ? { name: googleUser.name, status: 'office' } : null);

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
            allTeams={teams}
            onSelectTeam={handleSelectTeam}
            onOpenCreateModal={() => setIsCreateTeamOpen(true)}
            onOpenJoinModal={() => setIsJoinModalOpen(true)}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
          />

          <div className="header-actions">
            {/* Google / Gmail Connect Button */}
            <button
              type="button"
              className={`btn-header-google ${googleUser ? 'connected' : ''}`}
              onClick={() => setIsGoogleModalOpen(true)}
              title={googleUser ? `Signed in as ${googleUser.email}` : 'Connect with Gmail'}
              aria-label="Google account status"
            >
              <svg className="google-header-svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span className="google-header-text">
                {googleUser ? googleUser.name.split(' ')[0] : 'Gmail'}
              </span>
              {googleUser && <span className="google-online-dot" aria-hidden="true" />}
            </button>

            {/* Invite Colleagues Button */}
            <button
              type="button"
              className="btn-header-action btn-invite"
              onClick={() => setIsInviteModalOpen(true)}
              title="Invite colleagues via Gmail or code"
              aria-label="Invite colleagues"
            >
              ✉️ Invite
            </button>

            {/* Google Calendar Button */}
            <button
              type="button"
              className="btn-header-action btn-calendar"
              onClick={() => setIsCalendarModalOpen(true)}
              title="Add schedule to Google Calendar"
              aria-label="Google Calendar"
            >
              📅 Calendar
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              className="btn-header-action"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Share Roster */}
            <button
              type="button"
              className="btn-header-action btn-share"
              onClick={handleCopySummary}
              title="Copy Slack/WhatsApp update"
              aria-label="Share roster summary"
            >
              📤 Share
            </button>

            {/* Add Member Button */}
            <button
              type="button"
              className="btn-header-primary"
              onClick={() => setIsAddModalOpen(true)}
              aria-label="Add new team member"
            >
              ➕ Add Member
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {teams.length === 0 ? (
          <div className="empty-state-card no-teams-welcome">
            <span className="empty-state-emoji">🏢</span>
            <h2 className="empty-state-title">Welcome to Office Team Roster</h2>
            <p className="empty-state-text">
              Track who is coming to the office tomorrow. Create an office squad for your team or enter a Team Code to join your colleagues!
            </p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsCreateTeamOpen(true)}
              >
                ➕ Create a Team
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsJoinModalOpen(true)}
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
          onOpenCalendar={() => setIsCalendarModalOpen(true)}
        />

        {/* Attendance Summary KPIs for Active Team */}
        <SummaryCards
          members={members}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Live Android Home Screen Widget Preview */}
        <OfficeWidgetPreview
          members={members}
          tomorrowDateStr={tomorrow.shortDateStr}
          onOpenAddModal={() => setIsAddModalOpen(true)}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search members"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
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
              onClick={() => setActiveFilter('all')}
            >
              All ({members.length})
            </button>
            <button
              type="button"
              className={`filter-tab filter-office ${activeFilter === 'office' ? 'active' : ''}`}
              onClick={() => setActiveFilter('office')}
            >
              🏢 Office ({members.filter((m) => m.status === 'office').length})
            </button>
            <button
              type="button"
              className={`filter-tab filter-wfh ${activeFilter === 'wfh' ? 'active' : ''}`}
              onClick={() => setActiveFilter('wfh')}
            >
              🏠 WFH ({members.filter((m) => m.status === 'wfh').length})
            </button>
            <button
              type="button"
              className={`filter-tab filter-leave ${activeFilter === 'leave' ? 'active' : ''}`}
              onClick={() => setActiveFilter('leave')}
            >
              🌴 Leave ({members.filter((m) => m.status === 'leave').length})
            </button>
          </div>

          <div className="bulk-actions-row">
            <button
              type="button"
              className="btn-link-action"
              onClick={handleMarkAllOffice}
            >
              🏢 Mark All as Coming
            </button>
            <span className="bulk-divider">•</span>
            <button
              type="button"
              className="btn-link-action"
              onClick={handleCopySummary}
            >
              📋 Copy Roster for Slack/WhatsApp
            </button>
            <span className="bulk-divider">•</span>
            <button
              type="button"
              className="btn-link-action"
              onClick={() => setIsInviteModalOpen(true)}
            >
              ✉️ Invite to {activeTeam?.name}
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
                className="btn-secondary btn-sm"
                onClick={() => setIsInviteModalOpen(true)}
              >
                ✉️ Invite
              </button>
              <button
                type="button"
                className="btn-add-inline"
                onClick={() => setIsAddModalOpen(true)}
              >
                ➕ Add Colleague
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
                    setSearchQuery('');
                    setActiveFilter('all');
                  }}
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsInviteModalOpen(true)}
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
                  onStatusChange={handleStatusChange}
                  onDeleteMember={handleDeleteMember}
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
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMember={handleAddMember}
      />

      {/* Google / Gmail Login Modal */}
      <GoogleLoginModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        currentUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
      />

      {/* Google Calendar Modal */}
      <GoogleCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        currentMember={myMember}
        tomorrowDetails={tomorrow}
        allMembers={members}
        onToast={showToast}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreateTeam={handleCreateTeam}
        currentUser={googleUser}
      />

      {/* Invite Colleagues Modal */}
      <InviteColleaguesModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        activeTeam={activeTeam}
        onSendInvite={handleSendInvite}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        onToast={showToast}
      />

      {/* Join Team Modal */}
      <JoinTeamModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        allTeams={teams}
        currentUser={googleUser}
        onJoinTeamByCode={handleJoinTeamByCode}
        onRequestJoinTeam={handleRequestJoinTeam}
      />
    </div>
  );
}

export default App;
