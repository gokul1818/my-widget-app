import React from 'react';

export function MemberCard({ member, onStatusChange, onDeleteMember }) {
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`member-card status-${member.status}`}>
      <div className="member-main">
        <div
          className="member-avatar"
          style={{ backgroundColor: member.avatarBg || '#10b981' }}
          aria-hidden="true"
        >
          {getInitials(member.name)}
        </div>

        <div className="member-info">
          <div className="member-name-row">
            <h3 className="member-name">{member.name}</h3>
            {member.desk && <span className="member-desk-tag">{member.desk}</span>}
          </div>
          <div className="member-meta">
            <span className="member-role">{member.role}</span>
            <span className="member-bullet">•</span>
            <span className="member-dept">{member.dept}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-delete-member"
          onClick={() => onDeleteMember(member.id)}
          title={`Remove ${member.name}`}
          aria-label={`Remove ${member.name}`}
        >
          🗑️
        </button>
      </div>

      {/* 3-way Status Selector Segmented Control */}
      <div className="status-pill-group" role="radiogroup" aria-label={`Status for ${member.name}`}>
        <button
          type="button"
          className={`status-pill pill-office ${member.status === 'office' ? 'active' : ''}`}
          onClick={() => onStatusChange(member.id, 'office')}
          role="radio"
          aria-checked={member.status === 'office'}
        >
          <span className="pill-emoji">🏢</span>
          <span className="pill-label">Office</span>
        </button>

        <button
          type="button"
          className={`status-pill pill-wfh ${member.status === 'wfh' ? 'active' : ''}`}
          onClick={() => onStatusChange(member.id, 'wfh')}
          role="radio"
          aria-checked={member.status === 'wfh'}
        >
          <span className="pill-emoji">🏠</span>
          <span className="pill-label">WFH</span>
        </button>

        <button
          type="button"
          className={`status-pill pill-leave ${member.status === 'leave' ? 'active' : ''}`}
          onClick={() => onStatusChange(member.id, 'leave')}
          role="radio"
          aria-checked={member.status === 'leave'}
        >
          <span className="pill-emoji">🌴</span>
          <span className="pill-label">Leave</span>
        </button>
      </div>
    </div>
  );
}
