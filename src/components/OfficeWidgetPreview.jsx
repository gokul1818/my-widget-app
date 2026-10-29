import React from 'react';

export function OfficeWidgetPreview({ members, tomorrowDateStr }) {
  const officeMembers = members.filter((m) => m.status === 'office');
  const wfhMembers = members.filter((m) => m.status === 'wfh');
  const leaveMembers = members.filter((m) => m.status === 'leave');

  const namesList = officeMembers.map((m) => m.name.split(' ')[0]).join(', ');

  return (
    <div className="widget-preview-wrapper">
      <div className="widget-preview-header">
        <span className="preview-label">📱 Android Home Screen Widget Preview</span>
        <span className="preview-sublabel">Updates in real time</span>
      </div>

      <div className="widget-device-card">
        {/* Top Widget Bar */}
        <div className="widget-bar-top">
          <span className="widget-title-text">🏢 OFFICE TOMORROW</span>
          <span className="widget-date-badge">{tomorrowDateStr}</span>
        </div>

        {/* Center Numbers */}
        <div className="widget-bar-content">
          <div className="widget-count-col">
            <span className="widget-big-number">{officeMembers.length} In Office</span>
            <span className="widget-attendees-text">
              {namesList ? `🏢 ${namesList}` : 'No members checked in yet'}
            </span>
          </div>

          <div className="widget-pill-badge">
            <span>{wfhMembers.length} WFH</span>
            <span className="widget-pill-divider">•</span>
            <span>{leaveMembers.length} Leave</span>
          </div>
        </div>
      </div>
    </div>
  );
}
