import React, { useState } from 'react';
import { DEPARTMENTS, AVATAR_COLORS } from '../utils/officeData';

export function AddMemberModal({ isOpen, onClose, onAddMember }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [dept, setDept] = useState('Engineering');
  const [status, setStatus] = useState('office'); // 'office' | 'wfh' | 'leave'
  const [desk, setDesk] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter member name');
      return;
    }

    // Pick random avatar color
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const newMember = {
      id: `m_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      name: trimmed,
      role: role.trim() || 'Team Member',
      dept,
      status,
      avatarBg: color,
      desk: desk.trim() || (status === 'office' ? 'Office' : status === 'wfh' ? 'Remote' : 'OOO'),
    };

    onAddMember(newMember);
    setName('');
    setRole('');
    setDesk('');
    setStatus('office');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">➕</span>
            <div>
              <h2 id="modal-title" className="modal-title">Add Team Member</h2>
              <p className="modal-subtitle">Add a colleague to tomorrow's roster</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-banner">{error}</div>}

          <div className="form-group">
            <label htmlFor="member-name" className="form-label">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="member-name"
              type="text"
              className="form-input"
              placeholder="e.g. Alexander Smith"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="member-role" className="form-label">
                Role / Title
              </label>
              <input
                id="member-role"
                type="text"
                className="form-input"
                placeholder="e.g. Backend Dev"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="member-dept" className="form-label">
                Department
              </label>
              <select
                id="member-dept"
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
          </div>

          <div className="form-group">
            <label className="form-label">Tomorrow's Attendance Status</label>
            <div className="status-selector-grid">
              <button
                type="button"
                className={`status-choice-btn ${status === 'office' ? 'active-office' : ''}`}
                onClick={() => setStatus('office')}
              >
                <span className="status-choice-emoji">🏢</span>
                <span className="status-choice-text">Office</span>
              </button>
              <button
                type="button"
                className={`status-choice-btn ${status === 'wfh' ? 'active-wfh' : ''}`}
                onClick={() => setStatus('wfh')}
              >
                <span className="status-choice-emoji">🏠</span>
                <span className="status-choice-text">WFH</span>
              </button>
              <button
                type="button"
                className={`status-choice-btn ${status === 'leave' ? 'active-leave' : ''}`}
                onClick={() => setStatus('leave')}
              >
                <span className="status-choice-emoji">🌴</span>
                <span className="status-choice-text">On Leave</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="member-desk" className="form-label">
              Desk Location or Note (Optional)
            </label>
            <input
              id="member-desk"
              type="text"
              className="form-input"
              placeholder="e.g. Desk 4B or Carpool"
              value={desk}
              onChange={(e) => setDesk(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add to Tomorrow's Roster
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
