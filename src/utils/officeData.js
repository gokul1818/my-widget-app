// Clean initial team members (no dummy data)
export const initialTeamMembers = [];

export const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'Mobile',
  'QA',
  'People',
  'Marketing',
  'Other'
];

export const AVATAR_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
];

/**
 * Returns formatted tomorrow date details
 */
export function getTomorrowDetails() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = tomorrow.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = tomorrow.getDate();
  const shortDay = tomorrow.toLocaleDateString('en-US', { weekday: 'short' });

  return {
    fullDateStr: `${dayName}, ${monthName} ${dayNum}`,
    shortDateStr: `${shortDay}, ${monthName} ${dayNum}`,
    dayName,
    monthName,
    dayNum,
    dateObj: tomorrow,
  };
}

/**
 * Generates formatted Slack/WhatsApp summary
 */
export function formatRosterSummary(members, dateStr) {
  const office = members.filter((m) => m.status === 'office');
  const wfh = members.filter((m) => m.status === 'wfh');
  const leave = members.filter((m) => m.status === 'leave');

  const lines = [
    `🏢 *Office Attendance for Tomorrow (${dateStr})*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ *Coming to Office (${office.length}):*`,
    office.length > 0 ? office.map((m) => ` • ${m.name} (${m.role})`).join('\n') : '  _None yet_',
    ``,
    `🏠 *Working from Home (${wfh.length}):*`,
    wfh.length > 0 ? wfh.map((m) => ` • ${m.name}`).join('\n') : '  _None_',
    ``,
    `🌴 *On Leave (${leave.length}):*`,
    leave.length > 0 ? leave.map((m) => ` • ${m.name}`).join('\n') : '  _None_',
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 Total Team: ${members.length} members (${Math.round((office.length / (members.length || 1)) * 100)}% in office)`,
  ];

  return lines.join('\n');
}
