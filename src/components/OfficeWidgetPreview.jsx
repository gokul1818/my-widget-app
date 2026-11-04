import React, { useState } from 'react';

export function OfficeWidgetPreview({ members, tomorrowDateStr }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const officeMembers = members.filter((m) => m.status === 'office');
  const wfhMembers = members.filter((m) => m.status === 'wfh');
  const leaveMembers = members.filter((m) => m.status === 'leave');

  const namesList = officeMembers.map((m) => m.name.split(' ')[0]).join(', ');

  return (
    <div className="space-y-2" data-purpose="widget-preview-wrapper">
      <section
        className="bg-gradient-to-r from-[#0e2447] via-[#1c417a] to-[#0e2447] text-white rounded-2xl p-3.5 shadow-soft border border-[#1c417a]/40 flex items-center justify-between"
        data-purpose="widget-preview-bar"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0e2447]/90 border border-[#2a5aa3]/40 flex items-center justify-center text-sm shadow-inner">
            📱
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white leading-none">
                Home Screen Widget
              </h3>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#052714] text-[#75c49a] border border-[#148043]/60">
                • Live Sync
              </span>
            </div>
            <p className="text-[11px] text-[#9aa7bd] mt-0.5">Instant lockscreen glance</p>
          </div>
        </div>

        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#0e2447]/80 hover:bg-[#0e2447] text-[#f4f6fb] border border-[#2a5aa3]/50 transition-colors inline-flex items-center gap-1 cursor-pointer"
          data-purpose="preview-widget-action"
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span>Preview</span>
          <svg
            className={`w-3 h-3 text-[#9aa7bd] transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 9l-7 7-7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </section>

      {isExpanded && (
        <div className="bg-[#0e2447] border border-[#1c417a]/50 rounded-2xl p-3.5 text-white shadow-soft transition-all animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#1c417a]/60 pb-2 mb-2 text-xs">
            <span className="font-bold text-slate-100">🏢 OFFICE TOMORROW</span>
            <span className="text-[10px] bg-[#1c417a]/80 px-2 py-0.5 rounded text-[#75c49a] font-medium border border-[#148043]/40">
              {tomorrowDateStr}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-lg font-extrabold text-[#75c49a]">
                {officeMembers.length} In Office
              </div>
              <div className="text-[11px] text-[#9aa7bd] truncate max-w-[200px]">
                {namesList ? `🏢 ${namesList}` : 'No members checked in yet'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-[#1c417a]/60 px-2 py-1 rounded-lg border border-[#2a5aa3]/40 shrink-0">
              <span className="text-[#87caea]">{wfhMembers.length} WFH</span>
              <span className="text-[#9aa7bd]">•</span>
              <span className="text-[#fac470]">{leaveMembers.length} Leave</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
