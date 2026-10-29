import React, { useState, useEffect } from 'react';
import { DEPARTMENTS } from '../utils/officeData';

const PRESET_ROLES = [
  'Team Lead',
  'Tech Lead',
  'Scrum Master',
  'Frontend Engineer',
  'Backend Engineer',
  'Fullstack Developer',
  'DevOps / SRE',
  'QA / Tester',
  'UI/UX Designer',
  'Product Owner',
  'Code Reviewer',
  'Engineering Manager',
  'System Architect',
];

/**
 * EditMemberModal
 * Allows editing a team member's position and assigning multiple roles in the team.
 */
export function EditMemberModal({
  isOpen,
  onClose,
  member,
  teamName,
  currentUser,
  onSave,
}) {
  const [position, setPosition] = useState('');
  const [roles, setRoles] = useState([]);
  const [customRole, setCustomRole] = useState('');
  const [dept, setDept] = useState('Engineering');
  const [desk, setDesk] = useState('');
  const [error, setError] = useState('');

  // Sync state whenever member changes or modal opens
  useEffect(() => {
    if (member) {
      setPosition(member.position || '');

      let initialRoles = [];
      if (Array.isArray(member.roles) && member.roles.length > 0) {
        initialRoles = [...member.roles];
      } else if (member.role) {
        initialRoles = member.role.split(',').map((r) => r.trim()).filter(Boolean);
      }
      if (initialRoles.length === 0) {
        initialRoles = ['Team Member'];
      }
      setRoles(initialRoles);

      setDept(member.dept || 'Engineering');
      setDesk(member.desk || '');
      setCustomRole('');
      setError('');
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const userId = currentUser?.sub || currentUser?.id;
  const isSelf =
    (member.email && userEmail && member.email.toLowerCase().trim() === userEmail) ||
    (member.googleId && userId && member.googleId === userId);

  const togglePresetRole = (roleName) => {
    if (roles.includes(roleName)) {
      if (roles.length === 1) {
        setError('At least one role is required');
        return;
      }
      setRoles(roles.filter((r) => r !== roleName));
      if (error) setError('');
    } else {
      setRoles([...roles, roleName]);
      if (error) setError('');
    }
  };

  const handleAddCustomRole = (e) => {
    if (e) e.preventDefault();
    const trimmed = customRole.trim();
    if (!trimmed) return;
    if (roles.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already assigned to this member`);
      return;
    }
    setRoles([...roles, trimmed]);
    setCustomRole('');
    if (error) setError('');
  };

  const handleRemoveRole = (roleToRemove) => {
    if (roles.length <= 1) {
      setError('A member must have at least one role');
      return;
    }
    setRoles(roles.filter((r) => r !== roleToRemove));
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roles.length === 0) {
      setError('Please select or add at least one role');
      return;
    }

    onSave({
      memberId: member.id,
      position: position.trim(),
      roles,
      dept,
      desk: desk.trim() || 'Office',
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="edit-member-title">
      <div className="modal-card edit-member-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">💼</span>
            <div>
              <span className={`modal-badge-tag ${member.isOwner ? 'author-badge-tag' : ''}`}>
                {member.isOwner ? '👑 TEAM AUTHOR PROFILE' : '👤 MEMBER PROFILE'}
              </span>
              <h2 id="edit-member-title" className="modal-title">
                {isSelf ? 'Edit Your Position & Roles' : `Edit ${member.name}'s Position & Roles`}
              </h2>
              <p className="modal-subtitle">
                {isSelf
                  ? `Customize your job position and roles in ${teamName || 'your team'}`
                  : `Set the job position and roles for ${member.name} in ${teamName || 'the team'}`}
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {error && <div className="form-error-banner" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Member Card Summary Banner */}
          <div className="edit-member-summary-banner">
            <div
              className="member-avatar"
              style={{ backgroundColor: member.avatarBg || '#10b981' }}
              aria-hidden="true"
            >
              {member.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="edit-member-banner-meta">
              <span className="edit-member-banner-name">{member.name}</span>
              {member.email && <span className="edit-member-banner-email">{member.email}</span>}
            </div>
          </div>

          {/* Position / Job Title Input */}
          <div className="form-group">
            <label htmlFor="member-position-input" className="form-label">
              💼 Position / Job Title
            </label>
            <input
              id="member-position-input"
              type="text"
              className="form-input"
              placeholder="e.g. Senior Staff Engineer, Lead Architect, Scrum Lead"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
            <span className="form-field-hint">Defines the member's primary job title or seniority</span>
          </div>

          {/* Assigned Active Roles Chips */}
          <div className="form-group">
            <label className="form-label">
              🏷️ Assigned Roles ({roles.length}) <span className="required">*</span>
            </label>
            <div className="assigned-roles-tray">
              {roles.map((r) => (
                <span key={r} className="assigned-role-chip">
                  <span className="assigned-role-text">{r}</span>
                  <button
                    type="button"
                    className="btn-remove-role-chip"
                    onClick={() => handleRemoveRole(r)}
                    title={`Remove ${r}`}
                    aria-label={`Remove ${r}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preset Roles Toggle Grid */}
          <div className="form-group">
            <label className="form-label-secondary">Choose or toggle common roles:</label>
            <div className="preset-roles-grid">
              {PRESET_ROLES.map((preset) => {
                const isSelected = roles.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    className={`btn-preset-role-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => togglePresetRole(preset)}
                  >
                    <span>{isSelected ? '✓ ' : '+ '}</span>
                    <span>{preset}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Role Input */}
          <div className="form-group">
            <label htmlFor="custom-role-input" className="form-label-secondary">
              Add a custom role:
            </label>
            <div className="custom-role-input-group">
              <input
                id="custom-role-input"
                type="text"
                className="form-input custom-role-input"
                placeholder="e.g. Release Captain, Security Lead"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomRole();
                  }
                }}
              />
              <button
                type="button"
                className="btn-add-custom-role"
                onClick={handleAddCustomRole}
              >
                + Add Role
              </button>
            </div>
          </div>

          {/* Department & Desk row */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="edit-member-dept" className="form-label">
                Department
              </label>
              <select
                id="edit-member-dept"
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
              <label htmlFor="edit-member-desk" className="form-label">
                Desk / Work Area
              </label>
              <input
                id="edit-member-desk"
                type="text"
                className="form-input"
                placeholder="e.g. Desk 4B, 3rd Floor"
                value={desk}
                onChange={(e) => setDesk(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              💾 Save Position & Roles
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
