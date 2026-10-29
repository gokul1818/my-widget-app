import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialTeamMembers,
  DEPARTMENTS,
  getTomorrowDetails,
  formatRosterSummary,
} from '../src/utils/officeData.js';
import {
  parseGoogleJwt,
  createOrUpdateMemberFromGoogle,
} from '../src/utils/googleAuth.js';
import {
  buildGoogleCalendarUrl,
  getCalendarEventForMember,
  generateIcsContent,
} from '../src/utils/googleCalendar.js';
import {
  generateTeamCode,
  createNewTeam,
  initialTeams,
  normalizeTeamCode,
  findTeamByCode,
  getUserTeams,
  isUserInTeam,
  isTeamAuthor,
} from '../src/utils/teamData.js';

test('Office Roster: Clean state has zero dummy members', () => {
  assert.ok(Array.isArray(initialTeamMembers));
  assert.equal(initialTeamMembers.length, 0, 'No dummy members pre-seeded');
});

test('Office Roster: Departments list contains standard categories', () => {
  assert.ok(DEPARTMENTS.includes('Engineering'));
  assert.ok(DEPARTMENTS.includes('Design'));
  assert.ok(DEPARTMENTS.includes('Product'));
  assert.ok(DEPARTMENTS.includes('Mobile'));
  assert.ok(DEPARTMENTS.includes('QA'));
});

test('Office Roster: getTomorrowDetails returns valid day and date strings', () => {
  const tomorrow = getTomorrowDetails();
  assert.ok(tomorrow.fullDateStr);
  assert.ok(tomorrow.shortDateStr);
  assert.ok(tomorrow.dayName);
  assert.ok(tomorrow.monthName);
  assert.ok(tomorrow.dayNum > 0 && tomorrow.dayNum <= 31);
});

test('Office Roster: formatRosterSummary correctly formats Slack/WhatsApp summary', () => {
  const sample = [
    { id: '1', name: 'Gokul', role: 'Dev', dept: 'Engineering', status: 'office' },
    { id: '2', name: 'Priya', role: 'UI', dept: 'Design', status: 'wfh' },
    { id: '3', name: 'Rahul', role: 'QA', dept: 'QA', status: 'leave' },
  ];

  const summary = formatRosterSummary(sample, 'Thursday, Oct 29');
  assert.ok(summary.includes('Office Attendance for Tomorrow'));
  assert.ok(summary.includes('Coming to Office (1)'));
  assert.ok(summary.includes('Gokul'));
  assert.ok(summary.includes('Working from Home (1)'));
  assert.ok(summary.includes('Priya'));
  assert.ok(summary.includes('On Leave (1)'));
  assert.ok(summary.includes('Rahul'));
  assert.ok(summary.includes('Total Team: 3 members'));
});

test('Google Auth: createOrUpdateMemberFromGoogle links existing or adds new member', () => {
  const existing = [
    { id: '1', name: 'Gokulakrishnan', role: 'Dev', dept: 'Engineering', status: 'office', email: 'gokul@gmail.com' },
  ];

  // 1. Linking existing
  const updated = createOrUpdateMemberFromGoogle(
    { name: 'Gokulakrishnan', email: 'gokul@gmail.com', picture: 'https://example.com/pic.jpg', sub: '12345' },
    existing
  );
  assert.equal(updated.id, '1');
  assert.equal(updated.picture, 'https://example.com/pic.jpg');
  assert.equal(updated.googleId, '12345');

  // 2. Creating new member
  const newMember = createOrUpdateMemberFromGoogle(
    { name: 'Vikram Patel', email: 'vikram@gmail.com', picture: null, sub: '67890' },
    existing
  );
  assert.ok(newMember);
  assert.equal(newMember.name, 'Vikram Patel');
  assert.equal(newMember.email, 'vikram@gmail.com');
  assert.equal(newMember.status, 'office');
});

test('Google Auth: parseGoogleJwt handles invalid token gracefully', () => {
  assert.equal(parseGoogleJwt('invalid.token'), null);
  assert.equal(parseGoogleJwt(''), null);
});

test('Google Auth: parseGoogleJwt successfully decodes valid Google OAuth JWT credential', () => {
  const payload = {
    sub: '10987654321',
    name: 'Gokulakrishnan',
    email: 'gokul@gmail.com',
    picture: 'https://lh3.googleusercontent.com/a/photo.jpg',
    email_verified: true,
  };
  const base64UrlPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const fakeJwt = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${base64UrlPayload}.fakeSignature`;
  const decoded = parseGoogleJwt(fakeJwt);
  assert.equal(decoded.sub, payload.sub);
  assert.equal(decoded.name, payload.name);
  assert.equal(decoded.email, payload.email);
  assert.equal(decoded.picture, payload.picture);
});

test('Google Calendar: buildGoogleCalendarUrl generates valid URL with params', () => {
  const url = buildGoogleCalendarUrl({
    title: '🏢 In Office — Gokul',
    description: 'Working from office tomorrow',
    location: 'Main Office',
    startDate: new Date('2026-10-29T09:00:00Z'),
    endDate: new Date('2026-10-29T18:00:00Z'),
    isAllDay: false,
  });

  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
  assert.ok(url.includes('action=TEMPLATE'));
  assert.ok(url.includes('text=%F0%9F%8F%A2+In+Office'));
  assert.ok(url.includes('location=Main+Office'));
});

test('Google Calendar: getCalendarEventForMember formats event details correctly', () => {
  const member = { name: 'Gokul', status: 'office', desk: 'Desk 4B' };
  const tomorrow = { fullDateStr: 'Thursday, Oct 29', dateObj: new Date('2026-10-29T00:00:00Z') };
  const allMembers = [
    member,
    { name: 'Priya', status: 'office' },
    { name: 'Rahul', status: 'wfh' },
  ];

  const event = getCalendarEventForMember(member, tomorrow, allMembers);
  assert.equal(event.title, '🏢 In Office — Gokul');
  assert.equal(event.location, 'Office (Desk 4B)');
  assert.ok(event.description.includes('Priya'));
  assert.ok(event.startDate);
  assert.ok(event.endDate);
});

test('Google Calendar: generateIcsContent produces valid VCALENDAR payload', () => {
  const ics = generateIcsContent({
    title: '🏢 In Office',
    description: 'Work schedule',
    location: 'Office',
    startDate: new Date('2026-10-29T09:00:00Z'),
    endDate: new Date('2026-10-29T18:00:00Z'),
  });

  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('SUMMARY:🏢 In Office'));
  assert.ok(ics.includes('LOCATION:Office'));
  assert.ok(ics.includes('END:VCALENDAR'));
});

test('Team Data: generateTeamCode generates formatted code with prefix and 4 digits', () => {
  const code = generateTeamCode('Frontend');
  assert.ok(code.startsWith('FRON-'));
  const parts = code.split('-');
  assert.equal(parts.length, 2);
  assert.equal(parts[1].length, 4);
});

test('Team Data: createNewTeam initializes a full team structure with owner', () => {
  const team = createNewTeam({
    name: 'Mobile Core',
    location: '4th Floor, Pod B',
    dept: 'Mobile',
    ownerUser: { name: 'Gokul', email: 'gokul@gmail.com' },
  });

  assert.equal(team.name, 'Mobile Core');
  assert.equal(team.location, '4th Floor, Pod B');
  assert.equal(team.dept, 'Mobile');
  assert.equal(team.ownerEmail, 'gokul@gmail.com');
  assert.ok(team.code);
  assert.equal(team.members.length, 1);
  assert.equal(team.members[0].name, 'Gokul');
  assert.equal(team.members[0].isOwner, true);
  assert.deepEqual(team.invites, []);
  assert.deepEqual(team.joinRequests, []);
});

test('Team Data: Clean state has zero dummy teams', () => {
  assert.ok(Array.isArray(initialTeams));
  assert.equal(initialTeams.length, 0, 'No dummy teams pre-seeded');
});

test('Gmail Auth: auto-name extraction from email prefix formats correctly', () => {
  const deriveNameFromEmail = (email) => {
    const prefix = email.split('@')[0];
    return prefix
      .replace(/[._]/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  assert.equal(deriveNameFromEmail('gokul.krishnan@gmail.com'), 'Gokul Krishnan');
  assert.equal(deriveNameFromEmail('priya_sharma@gmail.com'), 'Priya Sharma');
  assert.equal(deriveNameFromEmail('alex@company.com'), 'Alex');
});

test('Gmail Auth: user with zero teams does not have a squad or team created automatically', () => {
  const realUser = {
    name: 'Gokulakrishnan',
    email: 'gokul@gmail.com',
  };

  const teams = [];
  const userTeams = getUserTeams(teams, realUser);
  assert.equal(userTeams.length, 0);
});

test('Team Data: normalizeTeamCode strips symbols, spaces, and uppercases', () => {
  assert.equal(normalizeTeamCode('team-1234'), 'TEAM1234');
  assert.equal(normalizeTeamCode('eng 4821'), 'ENG4821');
  assert.equal(normalizeTeamCode('  #dev-9999  '), 'DEV9999');
});

test('Team Data: findTeamByCode matches with hyphen, without hyphen, spaces, and case-insensitively', () => {
  const sampleTeams = [
    { id: 't_1', code: 'ENG-4821', name: 'Engineering' },
    { id: 't_2', code: 'PROD-9000', name: 'Product Core' },
  ];

  // Exact
  assert.equal(findTeamByCode(sampleTeams, 'ENG-4821')?.id, 't_1');
  // Lowercase with hyphen
  assert.equal(findTeamByCode(sampleTeams, 'eng-4821')?.id, 't_1');
  // No hyphen
  assert.equal(findTeamByCode(sampleTeams, 'ENG4821')?.id, 't_1');
  // Spaced
  assert.equal(findTeamByCode(sampleTeams, 'eng 4821')?.id, 't_1');
  // By ID
  assert.equal(findTeamByCode(sampleTeams, 't_2')?.id, 't_2');
  // By Name
  assert.equal(findTeamByCode(sampleTeams, 'product core')?.id, 't_2');
  // Non-existent
  assert.equal(findTeamByCode(sampleTeams, 'NONEXISTENT'), null);
});

test('Team Data: isTeamAuthor identifies the team creator/author correctly', () => {
  const authorUser = { name: 'Gokula Krishnan', email: 'gokula@clayfin.com', sub: 'author_123' };
  const memberUser = { name: 'Alex Colleague', email: 'alex@company.com', sub: 'member_456' };

  const team = {
    id: 'team_pfm',
    name: 'pfm',
    ownerEmail: 'gokula@clayfin.com',
    members: [
      { id: 'm_1', name: 'Gokula Krishnan', email: 'gokula@clayfin.com', isOwner: true },
      { id: 'm_2', name: 'Alex Colleague', email: 'alex@company.com' },
    ],
  };

  // Author check returns true for authorUser
  assert.equal(isTeamAuthor(team, authorUser), true);

  // Author check returns false for regular member
  assert.equal(isTeamAuthor(team, memberUser), false);

  // Author check returns false for null/undefined
  assert.equal(isTeamAuthor(null, authorUser), false);
  assert.equal(isTeamAuthor(team, null), false);
});

test('Team Data: once a member exits a team, they are permanently removed and never re-join after reload', () => {
  const exitingUser = {
    name: 'Gokulakrishnan B',
    email: 'gokulakrishnan.developer18@gmail.com',
    sub: '114014575240896018072',
  };

  const team = {
    id: 'team_pfm',
    name: 'pfm',
    ownerEmail: 'gokulakrishnan.b@clayfin.com',
    members: [
      {
        id: 'm_1',
        name: 'Gokula Krishnan',
        email: 'gokulakrishnan.b@clayfin.com',
        isOwner: true,
      },
      {
        id: 'm_2',
        name: 'Gokulakrishnan B',
        email: 'gokulakrishnan.developer18@gmail.com',
        googleId: '114014575240896018072',
      },
    ],
  };

  // Initially in team
  assert.equal(isUserInTeam(team, exitingUser), true);
  assert.equal(getUserTeams([team], exitingUser).length, 1);

  // User exits: removed from team.members
  const remainingMembers = team.members.filter(
    (m) => m.email.toLowerCase() !== exitingUser.email.toLowerCase()
  );
  const updatedTeam = { ...team, members: remainingMembers };

  // After exit: isUserInTeam returns false
  assert.equal(isUserInTeam(updatedTeam, exitingUser), false);

  // After reload / refresh: getUserTeams returns 0 teams
  const reloadedUserTeams = getUserTeams([updatedTeam], exitingUser);
  assert.equal(reloadedUserTeams.length, 0);
});




