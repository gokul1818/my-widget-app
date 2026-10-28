import React, { useState, useEffect } from 'react';
import { findTeamByCode, loadTeams } from '../utils/teamData';

export function JoinTeamModal({
  isOpen,
  onClose,
  allTeams,
  currentUser,
  onJoinTeamByCode,
  onRequestJoinTeam,
  initialCode = '',
}) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Please enter a team code');
      return;
    }

    setIsSearching(true);
    setError('');

    // 1. Search in current memory teams
    let matched = findTeamByCode(allTeams, cleanCode);

    // 2. If not found, fetch fresh teams from database / server
    if (!matched) {
      try {
        const freshTeams = await loadTeams();
        if (freshTeams && Array.isArray(freshTeams)) {
          matched = findTeamByCode(freshTeams, cleanCode);
        }
      } catch (err) {
        console.warn('Error loading fresh teams:', err);
      }
    }

    setIsSearching(false);

    if (!matched) {
      setError(`No team found matching code "${cleanCode}". Please verify the code with your colleague.`);
      return;
    }

    onJoinTeamByCode(matched.id, currentUser, matched);
    setCode('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="join-team-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🤝</span>
            <div>
              <h2 id="join-team-title" className="modal-title">Join an Office Team</h2>
              <p className="modal-subtitle">Enter your colleague's team code or pick an office squad</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {error && <div className="form-error-banner" role="alert">{error}</div>}

        {/* Enter Code Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="team-code-input" className="form-label">
              Team Code <span className="required">*</span>
            </label>
            <input
              id="team-code-input"
              type="text"
              className="form-input team-code-input"
              placeholder="e.g. ENG-4821"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError('');
              }}
              autoFocus
            />
            <span className="form-hint">
              Enter the code shared by your colleague (e.g. <code>TEAM-1234</code> or <code>1234</code>)
            </span>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={isSearching}>
            {isSearching ? 'Finding Team...' : 'Join Team with Code'}
          </button>
        </form>

        {/* Discovered Teams */}
        {allTeams.length > 0 && (
          <div className="discovered-teams-section">
            <h3 className="section-subheading">Or choose from active office squads:</h3>
            <div className="discovered-teams-list">
              {allTeams.map((team) => (
                <div key={team.id} className="discovered-team-card">
                  <div className="discovered-team-info">
                    <span className="discovered-team-name">{team.name}</span>
                    <span className="discovered-team-meta">
                      Code: <strong style={{ color: '#60a5fa' }}>{team.code}</strong> • 👥 {team.members?.length || 0} members
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => {
                      onJoinTeamByCode(team.id, currentUser, team);
                      onClose();
                    }}
                  >
                    Join Directly
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
