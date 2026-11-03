import React from 'react';

export function SelfCheckinBanner({
  myName,
  myStatus,
  onSetMyStatus,
  tomorrowDateStr,
  onOpenCalendar,
  onEditProfile,
}) {
  return (
    <div className="checkin-banner">
      <div className="checkin-header">
        <div className="checkin-title-group">
          <span className="checkin-emoji" aria-hidden="true">👋</span>
          <div>
            <h2 className="checkin-title">Hi {myName}, are you coming to the office tomorrow?</h2>
            <p className="checkin-date">
              <span>🗓️ Attendance for <strong>{tomorrowDateStr}</strong></span>
            </p>
          </div>
        </div>
        <div className="checkin-status-row">
          {myStatus && (
            <span className={`my-status-pill my-status-${myStatus}`}>
              Your status: <strong>{myStatus === 'office' ? '🏢 Office' : myStatus === 'wfh' ? '🏠 WFH' : '🌴 Leave'}</strong>
            </span>
          )}
          {onEditProfile && (
            <button
              type="button"
              className="btn-banner-edit-profile"
              onClick={onEditProfile}
              title="Edit your position and roles"
              aria-label="Edit your profile"
            >
              ✏️ Edit Profile
            </button>
          )}
          <button
            type="button"
            className="btn-banner-cal"
            onClick={onOpenCalendar}
            title="Add schedule to Google Calendar"
            aria-label="Add to Google Calendar"
          >
            📅 Add to Calendar
          </button>
        </div>
      </div>

      <div className="checkin-buttons-row">
        <button
          type="button"
          className={`btn-checkin btn-checkin-office ${myStatus === 'office' ? 'selected' : ''}`}
          onClick={() => onSetMyStatus('office')}
          aria-pressed={myStatus === 'office'}
        >
          <span className="btn-icon">🏢</span>
          <div className="btn-checkin-text">
            <span className="btn-checkin-main">I'm Coming In</span>
            <span className="btn-checkin-sub">Office</span>
          </div>
        </button>

        <button
          type="button"
          className={`btn-checkin btn-checkin-wfh ${myStatus === 'wfh' ? 'selected' : ''}`}
          onClick={() => onSetMyStatus('wfh')}
          aria-pressed={myStatus === 'wfh'}
        >
          <span className="btn-icon">🏠</span>
          <div className="btn-checkin-text">
            <span className="btn-checkin-main">I'm WFH</span>
            <span className="btn-checkin-sub">Remote</span>
          </div>
        </button>

        <button
          type="button"
          className={`btn-checkin btn-checkin-leave ${myStatus === 'leave' ? 'selected' : ''}`}
          onClick={() => onSetMyStatus('leave')}
          aria-pressed={myStatus === 'leave'}
        >
          <span className="btn-icon">🌴</span>
          <div className="btn-checkin-text">
            <span className="btn-checkin-main">On Leave</span>
            <span className="btn-checkin-sub">Time Off</span>
          </div>
        </button>
      </div>
    </div>
  );
}
