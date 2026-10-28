import React, { useState } from 'react';

export function JoinTeamModal({
  isOpen,
  onClose,
  allTeams,
  currentUser,
  onJoinTeamByCode,
  onRequestJoinTeam,
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a team code');
      return;
    }

    const matched = allTeams.find((t) => t.code.toUpperCase() === cleanCode);
    if (!matched) {
      setError(`Team with code "${cleanCode}" not found. Please verify the code.`);
      return;
    }

    onJoinTeamByCode(matched.id, currentUser);
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

        {error && <div className="form-error-banner">{error}</div>}

        {/* Enter Code Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="team-code-input" className="form-label">
              Team Code
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
            <span className="form-hint">Ask your team lead or colleague for the 6-character code</span>
          </div>

          <button type="submit" className="btn-primary btn-full">
            Join Team
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
                      📍 {team.location} • 👥 {team.members?.length || 0} members
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      onRequestJoinTeam(team.id, currentUser);
                      onClose();
                    }}
                  >
                    Request to Join
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
