import React from 'react';

export function MemberCard({ member, onEditProfile, isSelf }) {
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

  // Format desk clearly so it doesn't duplicate the status label
  const deskDisplay = member.desk
    ? member.desk.toLowerCase().startsWith('desk')
      ? member.desk
      : `Desk: ${member.desk}`
    : 'Desk: Office';

  const cardBorderClass =
    member.status === 'leave'
      ? 'border-amber-200/80 bg-amber-50/20 hover:border-amber-300'
      : member.status === 'wfh'
      ? 'border-sky-200/70 bg-sky-50/20 hover:border-sky-300'
      : 'border-slate-200/90 hover:border-slate-300';

  const avatarRingClass =
    member.status === 'leave'
      ? 'ring-amber-200'
      : member.status === 'wfh'
      ? 'ring-sky-200'
      : 'ring-emerald-100';

  return (
    <div
      className={`bg-white rounded-2xl p-3.5 border shadow-soft flex items-center justify-between gap-3 transition-all ${cardBorderClass}`}
    >
      {/* Member Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {member.picture ? (
            <img
              src={member.picture}
              alt={member.name}
              className={`w-10 h-10 rounded-full object-cover ring-2 ${avatarRingClass}`}
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full text-white font-bold text-xs flex items-center justify-center ring-2 ${avatarRingClass}`}
              style={{ backgroundColor: member.avatarBg || '#1c417a' }}
            >
              {getInitials(member.name)}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 text-xs" aria-hidden="true">
            {statusEmoji}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-900 truncate">
              {member.name}
            </span>
            {member.isOwner && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100/80 text-amber-800 border border-amber-200/60">
                👑 Team Author
              </span>
            )}
            {deskDisplay && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                📍 {deskDisplay}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
            {member.position ? (
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                {member.position}
              </span>
            ) : (
              <span className="font-medium text-slate-600">
                {rolesList[0] || 'Team Member'}
              </span>
            )}
            <span>•</span>
            <span>{member.dept || 'Engineering'}</span>
            {(isSelf || onEditProfile) && (
              <button
                type="button"
                className="ml-1 text-[10px] text-slate-400 hover:text-emerald-600"
                onClick={() => onEditProfile?.(member)}
                title="Edit profile & role"
              >
                ✏️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Pill */}
      <div className="shrink-0">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs ${
            member.status === 'office'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
              : member.status === 'wfh'
              ? 'bg-sky-50 text-sky-700 border border-sky-200/80'
              : 'bg-amber-100 text-amber-800 border border-amber-300/80'
          }`}
        >
          <span>{statusEmoji}</span>
          <span>{statusLabel}</span>
        </span>
      </div>
    </div>
  );
}
