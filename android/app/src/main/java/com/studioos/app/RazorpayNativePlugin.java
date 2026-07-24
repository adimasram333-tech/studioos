package com.studioos.app;

import android.app.Activity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;

import org.json.JSONObject;

@CapacitorPlugin(name = "RazorpayNative")
public class RazorpayNativePlugin extends Plugin {
    private static PluginCall activePaymentCall;

    @PluginMethod
    public void startPayment(PluginCall call) {
        JSObject options = call.getObject("options");

        if (options == null) {
            call.reject("Missing Razorpay checkout options.");
            return;
        }

        Activity activity = getActivity();

        if (activity == null) {
            call.reject("Android activity is not available.");
            return;
        }

        activePaymentCall = call;

        activity.runOnUiThread(() -> {
            try {
                String keyId = options.optString("key", "");

                if (keyId.trim().isEmpty()) {
                    activePaymentCall = null;
                    call.reject("Missing Razorpay key id.");
                    return;
                }

                Checkout checkout = new Checkout();
                checkout.setKeyID(keyId);

                JSONObject checkoutOptions = new JSONObject(options.toString());
                checkout.open(activity, checkoutOptions);
            } catch (Exception error) {
                activePaymentCall = null;
                call.reject("Unable to open Razorpay checkout: " + error.getMessage());
            }
        });
    }

    public static void handlePaymentSuccess(String razorpayPaymentID, PaymentData paymentData) {
        PluginCall call = activePaymentCall;
        activePaymentCall = null;

        if (call == null) {
            return;
        }

        JSObject result = new JSObject();
        result.put("razorpay_payment_id", razorpayPaymentID);

        if (paymentData != null) {
            result.put("razorpay_order_id", paymentData.getOrderId());
            result.put("razorpay_signature", paymentData.getSignature());
        }

        call.resolve(result);
    }

    public static void handlePaymentError(int code, String response, PaymentData paymentData) {
        PluginCall call = activePaymentCall;
        activePaymentCall = null;

        if (call == null) {
            return;
        }

        String message = response == null || response.trim().isEmpty()
                ? "Payment failed or was cancelled."
                : response;

        call.reject(message);
    }
}
