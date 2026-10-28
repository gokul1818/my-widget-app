import React, { useState } from 'react';
import {
  buildGoogleCalendarUrl,
  getCalendarEventForMember,
  generateIcsContent,
} from '../utils/googleCalendar';

export function GoogleCalendarModal({
  isOpen,
  onClose,
  currentMember,
  tomorrowDetails,
  allMembers,
  onToast,
}) {
  const [isAllDay, setIsAllDay] = useState(false);

  if (!isOpen) return null;

  const eventData = getCalendarEventForMember(currentMember, tomorrowDetails, allMembers);

  const calendarUrl = buildGoogleCalendarUrl({
    title: eventData.title,
    description: eventData.description,
    location: eventData.location,
    startDate: eventData.startDate,
    endDate: eventData.endDate,
    isAllDay,
  });

  const handleOpenGoogleCalendar = () => {
    window.open(calendarUrl, '_blank', 'noopener,noreferrer');
    if (onToast) {
      onToast('📅 Opened in Google Calendar!');
    }
    onClose();
  };

  const handleDownloadIcs = () => {
    try {
      const ics = generateIcsContent({
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
      });

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `office-roster-tomorrow.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onToast) {
        onToast('💾 Downloaded calendar .ics file!');
      }
      onClose();
    } catch {
      if (onToast) onToast('⚠️ Could not download calendar file');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cal-modal-title">
      <div className="modal-card google-cal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="cal-modal-icon">📅</span>
            <div>
              <h2 id="cal-modal-title" className="modal-title">Connect with Google Calendar</h2>
              <p className="modal-subtitle">Add your office schedule to your calendar</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Event Preview Card */}
        <div className="cal-preview-box">
          <div className="cal-preview-top">
            <span className="cal-badge-pill">Google Calendar Event</span>
            <label className="cal-allday-toggle">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
              />
              <span>All Day</span>
            </label>
          </div>

          <h3 className="cal-event-title">{eventData.title}</h3>

          <div className="cal-event-meta">
            <div className="cal-meta-item">
              <span className="cal-meta-icon">🗓️</span>
              <span>{tomorrowDetails.fullDateStr}</span>
            </div>
            <div className="cal-meta-item">
              <span className="cal-meta-icon">⏰</span>
              <span>{isAllDay ? 'All Day' : '9:00 AM – 6:00 PM'}</span>
            </div>
            <div className="cal-meta-item">
              <span className="cal-meta-icon">📍</span>
              <span>{eventData.location}</span>
            </div>
          </div>

          {allMembers.filter((m) => m.status === 'office').length > 0 && (
            <div className="cal-attendees-box">
              <span className="cal-attendees-label">👥 Colleagues in office tomorrow:</span>
              <p className="cal-attendees-names">
                {allMembers
                  .filter((m) => m.status === 'office')
                  .map((m) => m.name)
                  .join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="cal-actions-list">
          <button
            type="button"
            className="btn-gcal-primary"
            onClick={handleOpenGoogleCalendar}
          >
            <svg className="gcal-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
            </svg>
            <span>Add to Google Calendar</span>
          </button>

          <button
            type="button"
            className="btn-secondary btn-full"
            onClick={handleDownloadIcs}
          >
            💾 Download .ics File (Apple / Outlook)
          </button>
        </div>
      </div>
    </div>
  );
}
