import React from 'react';

export function SummaryCards({ members, activeFilter, onFilterChange }) {
  const total = members.length;
  const officeCount = members.filter((m) => m.status === 'office').length;
  const wfhCount = members.filter((m) => m.status === 'wfh').length;
  const leaveCount = members.filter((m) => m.status === 'leave').length;

  const officePercent = total > 0 ? Math.round((officeCount / total) * 100) : 0;
  const wfhPercent = total > 0 ? Math.round((wfhCount / total) * 100) : 0;
  const leavePercent = total > 0 ? Math.round((leaveCount / total) * 100) : 0;

  // Calculate width for segments (handle edge cases gracefully)
  const officeWidth = total > 0 ? (officeCount / total) * 100 : 0;
  const wfhWidth = total > 0 ? (wfhCount / total) * 100 : 0;
  const leaveWidth = total > 0 ? (leaveCount / total) * 100 : 0;

  return (
    <section
      className="bg-white rounded-2xl p-4 pt-4.5 shadow-soft border border-slate-200/80 space-y-3 relative overflow-hidden"
      data-purpose="metrics-summary"
      aria-label="Attendance metrics summary"
    >
      {/* Clayfin Signature Mosaic Strip for Cards with Figures */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'var(--mosaic, linear-gradient(90deg, #1c417a 0 14.28%, #249ed6 14.28% 28.56%, #17974f 28.56% 42.84%, #f5a922 42.84% 57.12%, #e5542b 57.12% 71.4%, #de262c 71.4% 85.68%, #e01c62 85.68%))' }}
      />
      {/* Top Metrics Head with Live Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Attendance Breakdown
        </h2>
        <span className="text-xs font-medium text-slate-600">
          Total:{' '}
          <strong className="font-bold text-slate-900">
            {total} {total === 1 ? 'member' : 'members'}
          </strong>
        </span>
      </div>

      {/* 3 Interactive Metric Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Metric: In Office */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'office' ? 'all' : 'office')}
          className={`bg-emerald-50/70 border rounded-2xl p-2.5 text-center flex flex-col justify-between cursor-pointer active:scale-98 transition-all ${
            activeFilter === 'office'
              ? 'border-emerald-500 ring-2 ring-emerald-400/30'
              : 'border-emerald-200/80 hover:border-emerald-300'
          }`}
          data-purpose="metric-in-office"
          title={`Click to filter by Office (${officeCount})`}
        >
          <div className="flex items-center justify-between mb-1 w-full">
            <span className="text-xs">🏢</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800">
              {officePercent}%
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-900 leading-none my-1">
            {officeCount}
          </div>
          <span className="text-[10px] font-medium text-emerald-700">Checked in</span>
        </button>

        {/* Metric: Home / WFH */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'wfh' ? 'all' : 'wfh')}
          className={`bg-sky-50/60 border rounded-2xl p-2.5 text-center flex flex-col justify-between cursor-pointer active:scale-98 transition-all ${
            activeFilter === 'wfh'
              ? 'border-sky-500 ring-2 ring-sky-400/30'
              : 'border-sky-200/70 hover:border-sky-300'
          }`}
          data-purpose="metric-wfh"
          title={`Click to filter by WFH (${wfhCount})`}
        >
          <div className="flex items-center justify-between mb-1 w-full">
            <span className="text-xs">🏠</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-200/60 text-sky-800">
              {wfhPercent}%
            </span>
          </div>
          <div className="text-xl font-extrabold text-sky-900 leading-none my-1">
            {wfhCount}
          </div>
          <span className="text-[10px] font-medium text-sky-700">Remote</span>
        </button>

        {/* Metric: On Leave */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'leave' ? 'all' : 'leave')}
          className={`bg-amber-50/70 border rounded-2xl p-2.5 text-center flex flex-col justify-between cursor-pointer active:scale-98 transition-all ${
            activeFilter === 'leave'
              ? 'border-amber-500 ring-2 ring-amber-400/30'
              : 'border-amber-200/80 hover:border-amber-300'
          }`}
          data-purpose="metric-leave"
          title={`Click to filter by Leave (${leaveCount})`}
        >
          <div className="flex items-center justify-between mb-1 w-full">
            <span className="text-xs">🌴</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200/70 text-amber-800">
              {leavePercent}%
            </span>
          </div>
          <div className="text-xl font-extrabold text-amber-900 leading-none my-1">
            {leaveCount}
          </div>
          <span className="text-[10px] font-medium text-amber-700">Away</span>
        </button>
      </div>

      {/* Stacked Distribution Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div
          className="w-full h-2.5 rounded-full bg-slate-100 flex overflow-hidden p-0.5 gap-0.5"
          data-purpose="stacked-progress-bar"
        >
          {officeWidth > 0 && (
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${officeWidth}%` }}
              title={`${officeCount} in Office (${officePercent}%)`}
            />
          )}
          {wfhWidth > 0 && (
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-300"
              style={{ width: `${wfhWidth}%` }}
              title={`${wfhCount} WFH (${wfhPercent}%)`}
            />
          )}
          {leaveWidth > 0 && (
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${leaveWidth}%` }}
              title={`${leaveCount} on Leave (${leavePercent}%)`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{officeCount} Office</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>{wfhCount} WFH</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{leaveCount} Leave</span>
          </div>
        </div>
      </div>
    </section>
  );
}
