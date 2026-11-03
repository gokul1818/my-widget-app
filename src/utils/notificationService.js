/**
 * Notification Service
 * Coordinates automated Email alerts and Firebase Web Push notifications
 * whenever an employee updates their office attendance status.
 */

import {
  showLocalWebNotification,
  formatStatusPushMessage,
  getSavedPushToken,
} from './firebasePush.js';

const NOTIFICATIONS_STORAGE_KEY = 'office_notifications_history';

/**
 * Gets all other colleagues in the team who should receive an email notification
 */
export function getNotificationRecipients(team, currentUser) {
  if (!team || !Array.isArray(team.members) || !currentUser) return [];
  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const userId = currentUser.sub || currentUser.id;

  return team.members
    .filter((m) => {
      const email = (m.email || '').toLowerCase().trim();
      const id = m.googleId || m.id;
      // Do not notify self
      if (email && userEmail && email === userEmail) return false;
      if (id && userId && id === userId) return false;
      return Boolean(email) && email.includes('@');
    })
    .map((m) => ({
      name: m.name,
      email: m.email.toLowerCase().trim(),
    }));
}

/**
 * Gets all other colleagues in the team who have an active FCM web push token
 */
export function getPushRecipients(team, currentUser) {
  if (!team || !Array.isArray(team.members) || !currentUser) return [];
  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const userId = currentUser.sub || currentUser.id;

  return team.members
    .filter((m) => {
      const email = (m.email || '').toLowerCase().trim();
      const id = m.googleId || m.id;
      // Do not notify self
      if (email && userEmail && email === userEmail) return false;
      if (id && userId && id === userId) return false;
      return Boolean(m.fcmToken || m.pushToken);
    })
    .map((m) => ({
      name: m.name,
      email: (m.email || '').toLowerCase().trim(),
      token: m.fcmToken || m.pushToken,
    }));
}

/**
 * Dispatches an automated Email and Firebase Push notification to all other team members
 */
export async function notifyTeamStatusChange({
  team,
  user,
  newStatus,
  oldStatus = '',
  dateStr = 'Tomorrow',
  triggerLocalPreview = true,
}) {
  if (!team || !user) {
    return { skipped: true, reason: 'Missing team or user data' };
  }

  const emailRecipients = getNotificationRecipients(team, user);
  const pushRecipients = getPushRecipients(team, user);

  let pushTokens = pushRecipients.map((p) => p.token).filter(Boolean);

  // If there are no other push recipients in the team, also dispatch to this device's token
  // so single-user testing triggers the real FCM delivery pipeline
  if (pushTokens.length === 0) {
    const saved = getSavedPushToken();
    if (saved) {
      pushTokens = [saved];
    }
  }

  if (emailRecipients.length === 0 && pushTokens.length === 0 && !triggerLocalPreview) {
    return {
      skipped: true,
      reason: 'No colleagues registered with email or push notifications',
      count: 0,
      pushCount: 0,
    };
  }

  const payload = {
    teamName: team.name || 'Team',
    teamCode: team.code || '',
    changedBy: {
      name: user.name || 'Colleague',
      email: user.email || '',
    },
    oldStatus,
    newStatus,
    dateStr,
    recipients: emailRecipients,
    pushTokens,
  };

  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data = {};
    if (res.ok) {
      data = await res.json();
    }

    // Trigger immediate local web push notification banner on current machine
    if (triggerLocalPreview) {
      const pushMsg = formatStatusPushMessage({
        memberName: user.name,
        newStatus,
        oldStatus,
        teamName: team.name,
        dateStr,
      });
      await showLocalWebNotification(pushMsg);
    }

    // Record in local notification history
    recordNotificationEvent({
      teamName: team.name,
      senderName: user.name,
      newStatus,
      oldStatus,
      dateStr,
      recipients: emailRecipients.map((r) => r.email),
      pushTokensCount: pushTokens.length,
      timestamp: new Date().toISOString(),
      delivered: Boolean(data.delivered || data.email?.delivered || data.push?.delivered),
      pushDelivered: Boolean(data.push?.delivered),
    });

    return {
      success: true,
      count: emailRecipients.length,
      pushCount: pushTokens.length,
      recipients: emailRecipients.map((r) => r.email),
      delivered: Boolean(data.delivered || data.email?.delivered || data.push?.delivered),
      pushDelivered: Boolean(data.push?.delivered),
    };
  } catch (err) {
    console.warn('Could not dispatch team notification:', err);

    // Fallback local preview on client if triggered
    if (triggerLocalPreview) {
      const pushMsg = formatStatusPushMessage({
        memberName: user.name,
        newStatus,
        oldStatus,
        teamName: team.name,
        dateStr,
      });
      await showLocalWebNotification(pushMsg);
    }

    return {
      success: false,
      error: err.message,
      count: emailRecipients.length,
      pushCount: pushTokens.length,
    };
  }
}

/**
 * Records notification in local storage history
 */
export function recordNotificationEvent(event) {
  try {
    const existingStr = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const list = existingStr ? JSON.parse(existingStr) : [];
    const updated = [event, ...list].slice(0, 30); // Keep last 30
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Loads recent notification history
 */
export function getNotificationHistory() {
  try {
    const str = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return str ? JSON.parse(str) : [];
  } catch {
    return [];
  }
}
