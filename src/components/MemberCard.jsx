import React from 'react';

export function MemberCard({ member, onEdit }) {
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const statusLabel =
    member.status === 'office' ? 'Office' : member.status === 'wfh' ? 'WFH' : 'On Leave';
  const statusEmoji =
    member.status === 'office' ? '🏢' : member.status === 'wfh' ? '🏠' : '🌴';

  // Support multiple roles as an array or comma-separated string
  let rolesList = [];
  if (Array.isArray(member.roles) && member.roles.length > 0) {
    rolesList = member.roles;
  } else if (member.role) {
    rolesList = member.role.split(',').map((r) => r.trim()).filter(Boolean);
  } else {
    rolesList = ['Team Member'];
  }

  return (
    <div className={`member-card status-${member.status}`}>
      <div className="member-main">
        <div
          className="member-avatar"
          style={{ backgroundColor: member.avatarBg || '#10b981' }}
          aria-hidden="true"
        >
          {member.picture ? (
            <img src={member.picture} alt={member.name} className="member-avatar-img" />
          ) : (
            getInitials(member.name)
          )}
        </div>

        <div className="member-info">
          <div className="member-name-row">
            <h3 className="member-name">{member.name}</h3>
            {member.isOwner && <span className="member-author-tag">👑 Team Author</span>}
            {member.desk && <span className="member-desk-tag">{member.desk}</span>}
          </div>

          {/* Member Position / Title */}
          {member.position && (
            <div className="member-position-text">
              <span className="position-icon">💼</span>
              <span className="position-name">{member.position}</span>
            </div>
          )}

          {/* Multiple Roles & Department */}
          <div className="member-meta">
            <div className="member-roles-list">
              {rolesList.map((r, idx) => (
                <span
                  key={idx}
                  className={`member-role-chip ${
                    r.toLowerCase().includes('lead') || r.toLowerCase().includes('owner') || r.toLowerCase().includes('manager')
                      ? 'role-lead'
                      : ''
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
            <span className="member-bullet">•</span>
            <span className="member-dept">{member.dept}</span>
          </div>
        </div>

        {/* Attendance Status Badge */}
        <div className="member-card-side-actions">
          <div className="member-card-status-badge">
            <span className={`status-badge-chip chip-${member.status}`}>
              <span className="chip-emoji">{statusEmoji}</span>
              <span className="chip-text">{statusLabel}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
