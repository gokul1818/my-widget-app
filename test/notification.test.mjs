import test from 'node:test';
import assert from 'node:assert/strict';
import { getNotificationRecipients, getPushRecipients } from '../src/utils/notificationService.js';
import { formatStatusPushMessage } from '../src/utils/firebasePush.js';
import uiReducer, { setModalOpen } from '../src/store/slices/uiSlice.js';
import teamsReducer, { setMemberPushToken } from '../src/store/slices/teamsSlice.js';

test('Email Notification Service: getNotificationRecipients strictly excludes sender and intimates other members', () => {
  const mockTeam = {
    id: 'team_1',
    name: 'Engineers',
    code: 'ENG-1000',
    members: [
      {
        id: 'user_alice',
        name: 'Alice',
        email: 'alice@example.com',
        googleId: 'g_alice',
        status: 'office',
      },
      {
        id: 'user_bob',
        name: 'Bob',
        email: 'bob@example.com',
        googleId: 'g_bob',
        status: 'wfh',
      },
      {
        id: 'user_charlie',
        name: 'Charlie',
        email: 'charlie@example.com',
        googleId: 'g_charlie',
        status: 'office',
      },
      {
        id: 'user_no_email',
        name: 'Dave',
        email: '',
        status: 'office',
      },
    ],
  };

  const senderAlice = {
    email: 'Alice@Example.com', // different case
    sub: 'g_alice',
    name: 'Alice',
  };

  // When Alice changes status, recipients should be Bob and Charlie (not Alice, not Dave)
  const recipients = getNotificationRecipients(mockTeam, senderAlice);

  assert.equal(recipients.length, 2, 'Should intimate exactly 2 colleagues');
  assert.deepEqual(
    recipients.map((r) => r.email).sort(),
    ['bob@example.com', 'charlie@example.com'],
    'Should include Bob and Charlie and exclude Alice'
  );
  assert.equal(recipients[0].name, 'Bob');
  assert.equal(recipients[1].name, 'Charlie');
});

test('Email Notification Service: getNotificationRecipients handles single-member team without error', () => {
  const soloTeam = {
    id: 'team_solo',
    name: 'Solo Startup',
    members: [
      {
        id: 'user_solo',
        name: 'Solo Founder',
        email: 'founder@example.com',
      },
    ],
  };

  const founder = { email: 'founder@example.com' };
  const recipients = getNotificationRecipients(soloTeam, founder);
  assert.equal(recipients.length, 0, 'Sole member should have 0 recipients to notify');
});

test('Email Notification Service: getNotificationRecipients handles invalid or missing inputs', () => {
  assert.deepEqual(getNotificationRecipients(null, { email: 'test@a.com' }), []);
  assert.deepEqual(getNotificationRecipients({ members: [] }, null), []);
  assert.deepEqual(getNotificationRecipients({ members: 'invalid' }, { email: 'test@a.com' }), []);
});

test('UI Slice: isEmailNotifyModalOpen toggles correctly', () => {
  const initial = uiReducer(undefined, { type: '@@INIT' });
  assert.equal(initial.modals.isEmailNotifyModalOpen, false);

  const openState = uiReducer(
    initial,
    setModalOpen({ modalName: 'isEmailNotifyModalOpen', isOpen: true })
  );
  assert.equal(openState.modals.isEmailNotifyModalOpen, true);

  const closeState = uiReducer(
    openState,
    setModalOpen({ modalName: 'isEmailNotifyModalOpen', isOpen: false })
  );
  assert.equal(closeState.modals.isEmailNotifyModalOpen, false);
});

test('Firebase Web Push: getPushRecipients returns tokens of colleagues and excludes self', () => {
  const team = {
    id: 'team_alpha',
    name: 'Alpha Team',
    members: [
      { id: 'u1', name: 'Gokul', email: 'gokul@example.com', fcmToken: 'token_gokul' },
      { id: 'u2', name: 'Sarah', email: 'sarah@example.com', fcmToken: 'token_sarah' },
      { id: 'u3', name: 'John', email: 'john@example.com', pushToken: 'token_john' },
      { id: 'u4', name: 'NoPush', email: 'nopush@example.com' }, // No push token
    ],
  };

  const senderGokul = { email: 'gokul@example.com', name: 'Gokul' };
  const pushRecipients = getPushRecipients(team, senderGokul);

  assert.equal(pushRecipients.length, 2, 'Should intimate exactly 2 colleagues with push tokens');
  assert.deepEqual(
    pushRecipients.map((p) => p.token).sort(),
    ['token_john', 'token_sarah'],
    'Should contain Sarah and John tokens and exclude Gokul (self)'
  );
});

test('Firebase Web Push: formatStatusPushMessage formats push payload correctly', () => {
  const officePush = formatStatusPushMessage({
    memberName: 'Gokula Krishnan',
    newStatus: 'office',
    oldStatus: 'wfh',
    teamName: 'PFM Squad',
    dateStr: 'Wednesday, Nov 4',
  });

  assert.equal(officePush.title, '🏢 Gokula Krishnan is Office (Wednesday, Nov 4)');
  assert.ok(officePush.body.includes('changed attendance in PFM Squad from wfh to Office'));
  assert.equal(officePush.icon, '/favicon.svg');
  assert.equal(officePush.data.newStatus, 'office');

  const wfhPush = formatStatusPushMessage({
    memberName: 'Priya',
    newStatus: 'wfh',
    teamName: 'Mobile Team',
    dateStr: 'Tomorrow',
  });
  assert.equal(wfhPush.title, '🏠 Priya is WFH (Home) (Tomorrow)');
});

test('Firebase Web Push: setMemberPushToken sets device token across teams for matching email', () => {
  const initialState = {
    teams: [
      {
        id: 'team_1',
        members: [
          { id: 'm1', name: 'Dev 1', email: 'user@company.com' },
          { id: 'm2', name: 'Dev 2', email: 'other@company.com' },
        ],
      },
      {
        id: 'team_2',
        members: [
          { id: 'm3', name: 'Dev 1', email: 'user@company.com' },
        ],
      },
    ],
  };

  const nextState = teamsReducer(
    initialState,
    setMemberPushToken({ userEmail: 'user@company.com', token: 'fcm_device_token_xyz' })
  );

  assert.equal(nextState.teams[0].members[0].fcmToken, 'fcm_device_token_xyz');
  assert.equal(nextState.teams[0].members[1].fcmToken, undefined);
  assert.equal(nextState.teams[1].members[0].fcmToken, 'fcm_device_token_xyz');
});

test('Firebase Web Push: requestPushPermissionAndGetToken handles unsupported environment gracefully', async () => {
  const { requestPushPermissionAndGetToken } = await import('../src/utils/firebasePush.js');
  const res = await requestPushPermissionAndGetToken();
  assert.equal(res.permission, 'unsupported');
  assert.equal(res.token, null);
  assert.ok(res.error.includes('not supported'));
});
