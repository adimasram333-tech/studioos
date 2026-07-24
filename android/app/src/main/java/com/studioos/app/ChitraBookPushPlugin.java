package com.studioos.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "ChitraBookPush")
public class ChitraBookPushPlugin extends Plugin {
    private static final int POST_NOTIFICATIONS_REQUEST_CODE = 5107;

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            result.put("granted", true);
            result.put("requested", false);
            call.resolve(result);
            return;
        }

        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            result.put("granted", true);
            result.put("requested", false);
            call.resolve(result);
            return;
        }

        Activity activity = getActivity();

        if (activity == null) {
            result.put("granted", false);
            result.put("requested", false);
            result.put("error", "Android activity is not available.");
            call.resolve(result);
            return;
        }

        ActivityCompat.requestPermissions(
                activity,
                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                POST_NOTIFICATIONS_REQUEST_CODE
        );

        result.put("granted", false);
        result.put("requested", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getFcmToken(PluginCall call) {
        try {
            FirebaseMessaging.getInstance().setAutoInitEnabled(true);
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Exception error = task.getException();
                    String message = error != null && error.getMessage() != null
                            ? error.getMessage()
                            : "Unable to get FCM token.";
                    call.reject(message);
                    return;
                }

                String token = task.getResult();

                if (token == null || token.trim().isEmpty()) {
                    call.reject("Empty FCM token.");
                    return;
                }

                JSObject result = new JSObject();
                result.put("token", token);
                result.put("platform", "android");
                result.put("device_id", getAndroidDeviceId());
                result.put("device_model", getDeviceModel());
                call.resolve(result);
            });
        } catch (Exception error) {
            call.reject("FCM token request failed: " + safeErrorMessage(error));
        }
    }

    private String getAndroidDeviceId() {
        try {
            return Settings.Secure.getString(
                    getContext().getContentResolver(),
                    Settings.Secure.ANDROID_ID
            );
        } catch (Exception ignored) {
            return "";
        }
    }

    private String getDeviceModel() {
        try {
            String manufacturer = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.trim();
            String model = Build.MODEL == null ? "" : Build.MODEL.trim();

            if (manufacturer.isEmpty()) {
                return model;
            }

            if (model.toLowerCase().startsWith(manufacturer.toLowerCase())) {
                return model;
            }

            return manufacturer + " " + model;
        } catch (Exception ignored) {
            return "";
        }
    }

    private String safeErrorMessage(Exception error) {
        String message = error != null ? error.getMessage() : null;
        return message == null || message.trim().isEmpty() ? "Unknown error" : message;
    }
}
