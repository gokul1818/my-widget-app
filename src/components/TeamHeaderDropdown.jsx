import React, { useState, useRef, useEffect } from 'react';

export function TeamHeaderDropdown({
  activeTeam,
  allTeams,
  onSelectTeam,
  onOpenCreateModal,
  onOpenJoinModal,
  onOpenInviteModal,
  onOpenChoiceModal,
  onExitTeam,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeTeam) {
    return (
      <div className="team-dropdown-container">
        <button
          type="button"
          className="team-selector-btn"
          onClick={onOpenChoiceModal || onOpenCreateModal}
        >
          <span className="team-selector-emoji">➕</span>
          <span className="team-selector-name">Create / Join Team</span>
        </button>
      </div>
    );
  }

  const joinRequestsCount = activeTeam.joinRequests?.length || 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-sm active:scale-95 transition-transform cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-purpose="team-picker"
      >
        <span className="text-sm">🏢</span>
        <span className="max-w-[85px] truncate font-bold text-slate-800">{activeTeam.name}</span>
        <span className="text-[10px] text-slate-400 font-mono">#{activeTeam.code}</span>
        {joinRequestsCount > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold" title={`${joinRequestsCount} pending requests`}>
            {joinRequestsCount}
          </span>
        )}
        <svg className={`w-3 h-3 text-slate-400 ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="team-menu-dropdown absolute left-0 mt-1.5 w-60 z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-1" role="menu">
          <div className="team-menu-header">
            <span className="team-menu-title">Switch Team</span>
            <span className="team-menu-loc">{activeTeam.location}</span>
          </div>

          <div className="team-menu-list">
            {allTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                className={`team-menu-item ${team.id === activeTeam.id ? 'active' : ''}`}
                onClick={() => {
                  onSelectTeam(team.id);
                  setIsOpen(false);
                }}
                role="menuitem"
              >
                <div className="team-menu-item-info">
                  <span className="team-menu-item-name">{team.name}</span>
                  <span className="team-menu-item-sub">
                    {team.code} • {team.members?.length || 0} members
                  </span>
                </div>
                {team.id === activeTeam.id && (
                  <span className="team-menu-item-check">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="team-menu-divider" />

          <div className="team-menu-actions">
            <button
              type="button"
              className="team-action-btn"
              onClick={() => {
                setIsOpen(false);
                onOpenInviteModal();
              }}
              role="menuitem"
            >
              <span className="action-icon">✉️</span>
              <span>Invite Colleagues</span>
              {joinRequestsCount > 0 && (
                <span className="badge-count-pill">{joinRequestsCount} new</span>
              )}
            </button>

            <button
              type="button"
              className="team-action-btn"
              onClick={() => {
                setIsOpen(false);
                onOpenJoinModal();
              }}
              role="menuitem"
            >
              <span className="action-icon">🤝</span>
              <span>Join Another Team</span>
            </button>

            <button
              type="button"
              className="team-action-btn"
              onClick={() => {
                setIsOpen(false);
                onOpenCreateModal();
              }}
              role="menuitem"
            >
              <span className="action-icon">➕</span>
              <span>Create New Team</span>
            </button>

            {activeTeam && (
              <button
                type="button"
                className="team-action-btn team-action-exit"
                onClick={() => {
                  setIsOpen(false);
                  onExitTeam && onExitTeam();
                }}
                role="menuitem"
                style={{ color: '#f87171' }}
              >
                <span className="action-icon">🚪</span>
                <span>Exit {activeTeam.name}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
