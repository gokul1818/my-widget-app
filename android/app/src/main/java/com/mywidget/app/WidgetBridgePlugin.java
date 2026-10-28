package com.mywidget.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void notifyWidgetUpdate(PluginCall call) {
        try {
            TimerWidgetProvider.refreshAllWidgets(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to refresh widget", e);
        }
    }
}
