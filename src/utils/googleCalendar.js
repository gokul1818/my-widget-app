/**
 * Google Calendar Integration Helpers
 * Generates direct Google Calendar web/app intent URLs and .ics iCalendar files
 */

/**
 * Formats a Date object into Google Calendar ISO compact format: YYYYMMDDTHHMMSS
 */
function formatGCalDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${m}${d}T${h}${min}${s}`;
}

/**
 * Formats a Date object into Google Calendar all-day format: YYYYMMDD
 */
function formatGCalAllDay(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}${m}${d}`;
}

/**
 * Builds a direct Google Calendar event creation URL
 * On Android, this opens the Google Calendar app natively.
 */
export function buildGoogleCalendarUrl({
  title,
  description = '',
  location = 'Office',
  startDate,
  endDate,
  isAllDay = false,
}) {
  let dateParam = '';
  if (isAllDay) {
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    dateParam = `${formatGCalAllDay(startDate)}/${formatGCalAllDay(nextDay)}`;
  } else {
    dateParam = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: dateParam,
    details: description,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates Google Calendar event details for tomorrow's attendance
 */
export function getCalendarEventForMember(member, tomorrowDetails, allMembers = []) {
  const tomorrow = tomorrowDetails.dateObj || new Date(Date.now() + 86400000);

  // Default office hours: 9:00 AM - 6:00 PM
  const start = new Date(tomorrow);
  start.setHours(9, 0, 0, 0);

  const end = new Date(tomorrow);
  end.setHours(18, 0, 0, 0);

  const status = member?.status || 'office';
  const name = member?.name || 'You';

  const officeColleagues = allMembers.filter((m) => m.status === 'office' && m.name !== name);
  const colleaguesNames = officeColleagues.map((m) => m.name).join(', ');

  let title = `🏢 In Office — ${name}`;
  let location = member?.desk ? `Office (${member.desk})` : 'Main Office';
  let description = `Team Roster for ${tomorrowDetails.fullDateStr}\nStatus: Working from Office 🏢\n`;

  if (status === 'office') {
    title = `🏢 In Office — ${name}`;
    location = member?.desk ? `Office (${member.desk})` : 'Office';
    description += officeColleagues.length > 0
      ? `\nColleagues in office tomorrow (${officeColleagues.length}):\n${colleaguesNames}`
      : '\nFirst colleague to check in for office!';
  } else if (status === 'wfh') {
    title = `🏠 WFH (Remote) — ${name}`;
    location = 'Home / Remote';
    description = `Team Roster for ${tomorrowDetails.fullDateStr}\nStatus: Working from Home 🏠`;
  } else {
    title = `🌴 On Leave / OOO — ${name}`;
    location = 'Out of Office';
    description = `Team Roster for ${tomorrowDetails.fullDateStr}\nStatus: On Leave / Out of Office 🌴`;
  }

  return {
    title,
    location,
    description,
    startDate: start,
    endDate: end,
    isAllDay: false,
    status,
  };
}

/**
 * Generates an .ics file string for standard calendar downloads
 */
export function generateIcsContent({ title, description, location, startDate, endDate }) {
  const formatDate = (d) => formatGCalDate(d) + 'Z';
  const now = formatDate(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Office Team Roster//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:roster-${Date.now()}@officeroster.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
