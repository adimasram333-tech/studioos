package com.studioos.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;

public class MainActivity extends BridgeActivity implements PaymentResultWithDataListener {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StudioOSFileSaverPlugin.class);
        registerPlugin(RazorpayNativePlugin.class);
        registerPlugin(ChitraBookPushPlugin.class);
        super.onCreate(savedInstanceState);

        Checkout.preload(getApplicationContext());
    }

    @Override
    public void onPaymentSuccess(String razorpayPaymentID, PaymentData paymentData) {
        RazorpayNativePlugin.handlePaymentSuccess(razorpayPaymentID, paymentData);
    }

    @Override
    public void onPaymentError(int code, String response, PaymentData paymentData) {
        RazorpayNativePlugin.handlePaymentError(code, response, paymentData);
    }
}
