import { Preferences } from '@capacitor/preferences';

/**
 * Synchronizes timer and analytics state to native mobile storage
 * so the Android AppWidget or iOS WidgetKit extension can read & display it.
 */
export async function syncWidgetStateToNative({
  seconds = 0,
  isRunning = false,
  mode = 'stopwatch',
  lastUpdated = new Date().toLocaleTimeString(),
  grossVolume = 28450,
  orders = 1240,
} = {}) {
  try {
    const payload = JSON.stringify({
      seconds,
      isRunning,
      mode,
      lastUpdated,
      grossVolume,
      orders,
      timestamp: Date.now(),
    });

    await Preferences.set({
      key: 'widget_analytics_state',
      value: payload,
    });
  } catch {
    // Running in standard web browser, ignore native sync error
  }
}
