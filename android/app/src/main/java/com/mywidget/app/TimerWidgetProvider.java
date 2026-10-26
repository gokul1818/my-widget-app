package com.mywidget.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.widget.RemoteViews;

/**
 * Native Android Home Screen Widget Provider
 * Displays real-time Chronometer timer and analytics metrics on the home screen.
 */
public class TimerWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_TOGGLE = "com.mywidget.app.ACTION_TOGGLE_TIMER";
    public static final String ACTION_RESET = "com.mywidget.app.ACTION_RESET_TIMER";

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String KEY_RUNNING = "is_running";
    private static final String KEY_BASE = "timer_base";
    private static final String KEY_ELAPSED = "timer_elapsed";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_timer_layout);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        boolean isRunning = prefs.getBoolean(KEY_RUNNING, false);
        long baseTime = prefs.getLong(KEY_BASE, SystemClock.elapsedRealtime());
        long elapsed = prefs.getLong(KEY_ELAPSED, 0);

        if (isRunning) {
            views.setChronometer(R.id.widget_chronometer, baseTime, null, true);
            views.setTextViewText(R.id.btn_widget_toggle, "Pause");
            views.setTextViewText(R.id.widget_status_text, "● RUNNING");
            views.setTextColor(R.id.widget_status_text, 0xFF34D399); // green
        } else {
            long displayBase = SystemClock.elapsedRealtime() - elapsed;
            views.setChronometer(R.id.widget_chronometer, displayBase, null, false);
            views.setTextViewText(R.id.btn_widget_toggle, elapsed > 0 ? "Resume" : "Start");
            views.setTextViewText(R.id.widget_status_text, elapsed > 0 ? "● PAUSED" : "● READY");
            views.setTextColor(R.id.widget_status_text, elapsed > 0 ? 0xFFFBBF24 : 0xFF94A3B8); // amber or gray
        }

        // 1. PendingIntent for Toggle (Start/Pause)
        Intent toggleIntent = new Intent(context, TimerWidgetProvider.class);
        toggleIntent.setAction(ACTION_TOGGLE);
        PendingIntent togglePending = PendingIntent.getBroadcast(
                context, 0, toggleIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_widget_toggle, togglePending);

        // 2. PendingIntent for Reset
        Intent resetIntent = new Intent(context, TimerWidgetProvider.class);
        resetIntent.setAction(ACTION_RESET);
        PendingIntent resetPending = PendingIntent.getBroadcast(
                context, 1, resetIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_widget_reset, resetPending);

        // 3. PendingIntent for Opening the Full App
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPending = PendingIntent.getActivity(
                context, 2, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_widget_open, openAppPending);
        views.setOnClickPendingIntent(R.id.widget_root, openAppPending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (ACTION_TOGGLE.equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isRunning = prefs.getBoolean(KEY_RUNNING, false);
            long base = prefs.getLong(KEY_BASE, SystemClock.elapsedRealtime());
            long elapsed = prefs.getLong(KEY_ELAPSED, 0);

            SharedPreferences.Editor editor = prefs.edit();
            if (isRunning) {
                // Pause timer
                elapsed = SystemClock.elapsedRealtime() - base;
                editor.putBoolean(KEY_RUNNING, false);
                editor.putLong(KEY_ELAPSED, elapsed);
            } else {
                // Start / Resume timer
                base = SystemClock.elapsedRealtime() - elapsed;
                editor.putBoolean(KEY_RUNNING, true);
                editor.putLong(KEY_BASE, base);
            }
            editor.apply();

            refreshAllWidgets(context);

        } else if (ACTION_RESET.equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putBoolean(KEY_RUNNING, false);
            editor.putLong(KEY_BASE, SystemClock.elapsedRealtime());
            editor.putLong(KEY_ELAPSED, 0);
            editor.apply();

            refreshAllWidgets(context);
        }
    }

    private void refreshAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, TimerWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        onUpdate(context, manager, ids);
    }
}

