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
          <span className="checkin-emoji">👋</span>
          <div>
            <h2 className="checkin-title">Hi {myName}, are you coming to the office tomorrow?</h2>
            <p className="checkin-date">Roster for {tomorrowDateStr}</p>
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
        >
          <span className="btn-icon">🏢</span>
          <span>I'm Coming In</span>
        </button>

        <button
          type="button"
          className={`btn-checkin btn-checkin-wfh ${myStatus === 'wfh' ? 'selected' : ''}`}
          onClick={() => onSetMyStatus('wfh')}
        >
          <span className="btn-icon">🏠</span>
          <span>I'm WFH</span>
        </button>

        <button
          type="button"
          className={`btn-checkin btn-checkin-leave ${myStatus === 'leave' ? 'selected' : ''}`}
          onClick={() => onSetMyStatus('leave')}
        >
          <span className="btn-icon">🌴</span>
          <span>On Leave</span>
        </button>
      </div>
    </div>
  );
}
