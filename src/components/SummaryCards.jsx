import React from 'react';

export function SummaryCards({ members, activeFilter, onFilterChange }) {
  const total = members.length;
  const officeCount = members.filter((m) => m.status === 'office').length;
  const wfhCount = members.filter((m) => m.status === 'wfh').length;
  const leaveCount = members.filter((m) => m.status === 'leave').length;

  const officePercent = total > 0 ? Math.round((officeCount / total) * 100) : 0;

  return (
    <section className="summary-section" aria-label="Attendance metrics summary">
      <div className="summary-cards-grid">
        {/* Office Card */}
        <button
          type="button"
          className={`summary-card card-office ${activeFilter === 'office' ? 'active-filter' : ''}`}
          onClick={() => onFilterChange(activeFilter === 'office' ? 'all' : 'office')}
          aria-label={`Office: ${officeCount} members. Filter by office`}
        >
          <div className="summary-card-header">
            <span className="summary-badge badge-office">🏢 In Office</span>
            <span className="summary-percent">{officePercent}%</span>
          </div>
          <div className="summary-card-body">
            <span className="summary-count text-office">{officeCount}</span>
            <span className="summary-label">Members</span>
          </div>
          <div className="summary-hint">
            {activeFilter === 'office' ? 'Filtered ✓' : 'Tap to filter'}
          </div>
        </button>

        {/* WFH Card */}
        <button
          type="button"
          className={`summary-card card-wfh ${activeFilter === 'wfh' ? 'active-filter' : ''}`}
          onClick={() => onFilterChange(activeFilter === 'wfh' ? 'all' : 'wfh')}
          aria-label={`WFH: ${wfhCount} members. Filter by WFH`}
        >
          <div className="summary-card-header">
            <span className="summary-badge badge-wfh">🏠 Home (WFH)</span>
          </div>
          <div className="summary-card-body">
            <span className="summary-count text-wfh">{wfhCount}</span>
            <span className="summary-label">Members</span>
          </div>
          <div className="summary-hint">
            {activeFilter === 'wfh' ? 'Filtered ✓' : 'Tap to filter'}
          </div>
        </button>

        {/* Leave Card */}
        <button
          type="button"
          className={`summary-card card-leave ${activeFilter === 'leave' ? 'active-filter' : ''}`}
          onClick={() => onFilterChange(activeFilter === 'leave' ? 'all' : 'leave')}
          aria-label={`On Leave: ${leaveCount} members. Filter by leave`}
        >
          <div className="summary-card-header">
            <span className="summary-badge badge-leave">🌴 On Leave</span>
          </div>
          <div className="summary-card-body">
            <span className="summary-count text-leave">{leaveCount}</span>
            <span className="summary-label">Members</span>
          </div>
          <div className="summary-hint">
            {activeFilter === 'leave' ? 'Filtered ✓' : 'Tap to filter'}
          </div>
        </button>
      </div>

      {/* Progress Bar of Attendance */}
      <div className="progress-container">
        <div className="progress-track" title={`${officePercent}% of team in office`}>
          <div
            className="progress-fill progress-fill-office"
            style={{ width: `${(officeCount / (total || 1)) * 100}%` }}
          />
          <div
            className="progress-fill progress-fill-wfh"
            style={{ width: `${(wfhCount / (total || 1)) * 100}%` }}
          />
          <div
            className="progress-fill progress-fill-leave"
            style={{ width: `${(leaveCount / (total || 1)) * 100}%` }}
          />
        </div>
        <div className="progress-legend">
          <span className="legend-item">
            <span className="legend-dot dot-office" /> {officeCount} Office
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-wfh" /> {wfhCount} WFH
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-leave" /> {leaveCount} Leave
          </span>
          <span className="legend-total">Total: {total}</span>
        </div>
      </div>
    </section>
  );
}
