import React, { useState } from 'react';
import { DEPARTMENTS } from '../utils/officeData';

export function CreateTeamModal({ isOpen, onClose, onCreateTeam, currentUser }) {
  const [teamName, setTeamName] = useState('');
  const [location, setLocation] = useState('Main Office, 4th Floor');
  const [dept, setDept] = useState('Engineering');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = teamName.trim();
    if (!trimmed) {
      setError('Please enter a team name');
      return;
    }

    onCreateTeam({
      name: trimmed,
      location: location.trim(),
      dept,
      ownerUser: currentUser || { name: 'Team Lead', email: 'me@gmail.com' },
    });

    setTeamName('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="create-team-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🏢</span>
            <div>
              <h2 id="create-team-title" className="modal-title">Create a Team</h2>
              <p className="modal-subtitle">Start an office attendance roster for your department or squad</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-banner">{error}</div>}

          <div className="form-group">
            <label htmlFor="team-name" className="form-label">
              Team Name <span className="required">*</span>
            </label>
            <input
              id="team-name"
              type="text"
              className="form-input"
              placeholder="e.g. Mobile Engineering or Design Pod"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="team-dept" className="form-label">
                Department
              </label>
              <select
                id="team-dept"
                className="form-select"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label htmlFor="team-location" className="form-label">
                Office Location / Floor
              </label>
              <input
                id="team-location"
                type="text"
                className="form-input"
                placeholder="e.g. Tower B, 3rd Floor"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="team-create-info-box">
            <span className="info-box-icon">💡</span>
            <p className="info-box-text">
              As the team creator, a unique <strong>Team Code</strong> and <strong>Invite Link</strong> will be generated for you to invite colleagues.
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Team & Get Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
