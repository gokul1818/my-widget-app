import { Preferences } from '@capacitor/preferences';
import { registerPlugin } from '@capacitor/core';

// Native bridge plugin registered in MainActivity.java
let widgetBridge = null;
try {
  widgetBridge = registerPlugin('WidgetBridge');
} catch {
  // Not on native Android Capacitor
}

const STORAGE_KEY_WIDGET = 'office_roster_data';
const STORAGE_KEY_FULL = 'office_roster_full_list';

/**
 * Synchronizes office team roster to native storage for Android Home Screen Widget
 */
export async function syncRosterToNative(members, tomorrowDateStr) {
  try {
    const officeMembers = members.filter((m) => m.status === 'office');
    const wfhMembers = members.filter((m) => m.status === 'wfh');
    const leaveMembers = members.filter((m) => m.status === 'leave');

    const widgetPayload = {
      officeCount: officeMembers.length,
      wfhCount: wfhMembers.length,
      leaveCount: leaveMembers.length,
      officeNames: officeMembers.map((m) => m.name.split(' ')[0]).join(', '),
      dateStr: tomorrowDateStr,
      timestamp: Date.now(),
    };

    // 1. Write summary for native WidgetProvider
    await Preferences.set({
      key: STORAGE_KEY_WIDGET,
      value: JSON.stringify(widgetPayload),
    });

    // 2. Write full members list for app persistence
    await Preferences.set({
      key: STORAGE_KEY_FULL,
      value: JSON.stringify(members),
    });

    // Fallback in localStorage for web preview
    try {
      localStorage.setItem(STORAGE_KEY_WIDGET, JSON.stringify(widgetPayload));
      localStorage.setItem(STORAGE_KEY_FULL, JSON.stringify(members));
    } catch {
      // ignore
    }

    // 3. Notify Android native Home Screen Widget to refresh immediately
    if (widgetBridge && typeof widgetBridge.notifyWidgetUpdate === 'function') {
      await widgetBridge.notifyWidgetUpdate();
    }
  } catch (err) {
    console.warn('Native widget sync note:', err);
  }
}

/**
 * Loads saved roster from Capacitor Preferences or localStorage
 */
export async function loadSavedRoster() {
  try {
    const res = await Preferences.get({ key: STORAGE_KEY_FULL });
    if (res && res.value) {
      return JSON.parse(res.value);
    }
  } catch {
    // try localStorage fallback
    try {
      const fallback = localStorage.getItem(STORAGE_KEY_FULL);
      if (fallback) return JSON.parse(fallback);
    } catch {
      // ignore
    }
  }
  return null;
}
