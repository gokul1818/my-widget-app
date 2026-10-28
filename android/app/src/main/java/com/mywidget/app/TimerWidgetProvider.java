package com.mywidget.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * Native Android Home Screen Widget for Office Team Roster
 * Displays who is coming to the office tomorrow directly on the user's home screen.
 */
public class TimerWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_REFRESH = "com.mywidget.app.ACTION_REFRESH_ROSTER";
    private static final String CAPACITOR_PREFS_NAME = "CapacitorStorage";
    private static final String KEY_ROSTER_DATA = "office_roster_data";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void refreshAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widget = new ComponentName(context, TimerWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(widget);
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_timer_layout);
        SharedPreferences prefs = context.getSharedPreferences(CAPACITOR_PREFS_NAME, Context.MODE_PRIVATE);

        // Calculate tomorrow's date by default
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, 1);
        String defaultDate = new SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(cal.getTime());

        int officeCount = 0;
        int wfhCount = 0;
        int leaveCount = 0;
        String officeNames = "";
        String dateStr = defaultDate;

        String rawJson = prefs.getString(KEY_ROSTER_DATA, null);
        if (rawJson != null) {
            try {
                JSONObject obj = new JSONObject(rawJson);
                officeCount = obj.optInt("officeCount", officeCount);
                wfhCount = obj.optInt("wfhCount", wfhCount);
                leaveCount = obj.optInt("leaveCount", leaveCount);
                officeNames = obj.optString("officeNames", officeNames);
                dateStr = obj.optString("dateStr", defaultDate);
            } catch (Exception ignored) {
            }
        }

        // Bind data to views
        views.setTextViewText(R.id.widget_title, "🏢 OFFICE TOMORROW");
        views.setTextViewText(R.id.widget_date_text, dateStr);
        views.setTextViewText(R.id.widget_office_count, officeCount + (officeCount == 1 ? " In Office" : " In Office"));
        views.setTextViewText(R.id.widget_breakdown_text, wfhCount + " WFH • " + leaveCount + " Leave");
        views.setTextViewText(R.id.widget_names_text, 
            officeNames == null || officeNames.trim().isEmpty() 
                ? "No one has checked in for office yet" 
                : "🏢 " + officeNames);

        // 1. PendingIntent for Refresh Button
        Intent refreshIntent = new Intent(context, TimerWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPending = PendingIntent.getBroadcast(
                context, 101, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_widget_refresh, refreshPending);

        // 2. PendingIntent for Opening App (Add / Update)
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPending = PendingIntent.getActivity(
                context, 102, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_widget_open, openAppPending);
        views.setOnClickPendingIntent(R.id.widget_root, openAppPending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            refreshAllWidgets(context);
        }
    }
}
