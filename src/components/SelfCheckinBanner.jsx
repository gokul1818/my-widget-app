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
    <section
      className="bg-white rounded-2xl p-4 sm:p-5 shadow-soft border border-slate-200/80 relative overflow-hidden"
      data-purpose="checkin-hero-card"
    >
      {/* Accent Top Bar for Selected Status */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          myStatus === 'office'
            ? 'from-emerald-400 via-teal-400 to-emerald-500'
            : myStatus === 'wfh'
            ? 'from-sky-400 via-blue-400 to-sky-500'
            : 'from-amber-400 via-orange-400 to-amber-500'
        }`}
      />

      {/* Greeting & Quick Actions Header */}
      <div className="flex items-start justify-between gap-2 mb-3 pt-0.5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span>👋</span>
            <span>Hi {myName},</span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-0.5">
            Are you coming to the office tomorrow?
          </p>
        </div>

        {/* Add to Calendar Action */}
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-full shadow-sm hover:bg-sky-100 active:scale-95 transition-all shrink-0 cursor-pointer"
          data-purpose="calendar-sync-btn"
          type="button"
          onClick={onOpenCalendar}
        >
          <span>📅</span>
          <span>Add to Cal</span>
        </button>
      </div>

      {/* Interactive Choice Grid */}
      <div className="grid grid-cols-3 gap-2.5 pt-1" data-purpose="attendance-action-pills">
        {/* Option 1: Office */}
        <button
          className={`group flex flex-col items-center justify-center p-3 rounded-2xl transition-all text-center active:scale-98 cursor-pointer ${
            myStatus === 'office'
              ? 'border-2 border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-400/20'
              : 'border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300'
          }`}
          data-choice="office"
          type="button"
          onClick={() => onSetMyStatus('office')}
          aria-pressed={myStatus === 'office'}
        >
          <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🏢</span>
          <span
            className={`text-xs font-bold ${
              myStatus === 'office' ? 'text-emerald-950' : 'text-slate-800'
            }`}
          >
            Coming In
          </span>
          <span
            className={`text-[10px] font-medium transition-colors ${
              myStatus === 'office'
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-400 group-hover:text-emerald-700'
            }`}
          >
            Office
          </span>
        </button>

        {/* Option 2: WFH */}
        <button
          className={`group flex flex-col items-center justify-center p-3 rounded-2xl transition-all text-center active:scale-98 cursor-pointer ${
            myStatus === 'wfh'
              ? 'border-2 border-sky-500 bg-sky-50/70 shadow-sm ring-2 ring-sky-400/20'
              : 'border border-slate-200 bg-slate-50/70 hover:bg-sky-50/50 hover:border-sky-300'
          }`}
          data-choice="wfh"
          type="button"
          onClick={() => onSetMyStatus('wfh')}
          aria-pressed={myStatus === 'wfh'}
        >
          <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🏠</span>
          <span
            className={`text-xs font-bold ${
              myStatus === 'wfh' ? 'text-sky-950' : 'text-slate-800'
            }`}
          >
            I'm WFH
          </span>
          <span
            className={`text-[10px] font-medium transition-colors ${
              myStatus === 'wfh'
                ? 'text-sky-700 font-semibold'
                : 'text-slate-400 group-hover:text-sky-700'
            }`}
          >
            Remote
          </span>
        </button>

        {/* Option 3: Leave */}
        <button
          className={`group flex flex-col items-center justify-center p-3 rounded-2xl transition-all text-center active:scale-98 cursor-pointer ${
            myStatus === 'leave'
              ? 'border-2 border-amber-500 bg-amber-50/60 shadow-sm ring-2 ring-amber-400/20'
              : 'border border-slate-200 bg-slate-50/70 hover:bg-amber-50/50 hover:border-amber-300'
          }`}
          data-choice="leave"
          type="button"
          onClick={() => onSetMyStatus('leave')}
          aria-pressed={myStatus === 'leave'}
        >
          <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🌴</span>
          <span
            className={`text-xs font-bold ${
              myStatus === 'leave' ? 'text-amber-900' : 'text-slate-800'
            }`}
          >
            On Leave
          </span>
          <span
            className={`text-[10px] font-semibold transition-colors ${
              myStatus === 'leave' ? 'text-amber-700' : 'text-slate-400 group-hover:text-amber-700'
            }`}
          >
            Time Off
          </span>
        </button>
      </div>
    </section>
  );
}
