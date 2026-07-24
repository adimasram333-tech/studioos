import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

/* ✅ CORS */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

const MIN_PHOTO_SELLING_PRICE = 49;
const GATEWAY_FEE_RATE = 0.02;
const PHOTOGRAPHER_SHARE_RATE = 0.80;
const PLATFORM_SHARE_RATE = 0.20;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error("Missing Razorpay environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}

function safeString(value: unknown) {
  return String(value || "").trim();
}

function toSafeNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizePrice(value: unknown) {
  const price = Number(value);
  if (!Number.isFinite(price)) return 0;
  return Math.floor(price);
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function calculatePaymentSplit(grossAmount: number) {
  const gross = roundMoney(grossAmount);
  const gatewayFee = roundMoney(gross * GATEWAY_FEE_RATE);
  const netAmount = roundMoney(gross - gatewayFee);
  const photographerAmount = roundMoney(netAmount * PHOTOGRAPHER_SHARE_RATE);
  const platformAmount = roundMoney(netAmount * PLATFORM_SHARE_RATE);

  return {
    gross_amount: gross,
    gateway_fee: gatewayFee,
    net_amount: netAmount,
    photographer_amount: photographerAmount,
    platform_amount: platformAmount
  };
}

async function generateRazorpaySignature(text: string, secret: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(text)
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function rollbackImagePurchase(imagePurchaseId: string) {
  try {
    await supabase
      .from("image_purchases")
      .delete()
      .eq("id", imagePurchaseId);
  } catch (rollbackErr) {
    console.error("Rollback image purchase failed:", rollbackErr);
  }
}

async function rollbackPaymentTransaction(imagePurchaseId: string) {
  try {
    await supabase
      .from("payment_transactions")
      .delete()
      .eq("image_purchase_id", imagePurchaseId);
  } catch (rollbackErr) {
    console.error("Rollback payment transaction failed:", rollbackErr);
  }
}

/* ✅ SUBSCRIPTION CHECK */
async function isPhotographerPaid(photographerId: string) {
  const { data, error } = await supabase
    .from("photographer_settings")
    .select("plan, subscription_status, is_paid, plan_expires_at")
    .eq("user_id", photographerId)
    .maybeSingle();

  if (error || !data) return false;

  const isPaid = data.is_paid === true;
  const active = String(data.subscription_status || "").toLowerCase() === "active";
  const validPlan = ["basic", "pro"].includes(String(data.plan || "").toLowerCase());
  const expiry = data.plan_expires_at ? new Date(data.plan_expires_at).getTime() : 0;
  const notExpired = Number.isFinite(expiry) && expiry > Date.now();

  return isPaid && active && validPlan && notExpired;
}

/* ✅ EVENT-WISE PRICE SOURCE OF TRUTH */
async function getEventPhotoSellingPrice(eventId: string, photographerId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("id, user_id, photo_selling_price")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Event price lookup failed: ${error.message}`);
  }

  if (!data?.id || String(data.user_id) !== String(photographerId)) {
    throw new Error("Invalid event or photographer");
  }

  const price = normalizePrice(data.photo_selling_price);

  if (price < MIN_PHOTO_SELLING_PRICE) {
    throw new Error("Invalid photo selling price");
  }

  return price;
}

/* ✅ S3 PHOTO ROW SOURCE OF TRUTH */
async function getVerifiedS3Photo(photoId: string, eventId: string, photographerId: string) {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select(`
      id,
      event_id,
      user_id,
      storage_provider,
      bucket,
      object_key,
      preview_key,
      thumbnail_key,
      file_size,
      original_file_size,
      stored_file_size,
      width,
      height
    `)
    .eq("id", photoId)
    .eq("event_id", eventId)
    .eq("user_id", photographerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Photo lookup failed: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Invalid photo for this event");
  }

  const storageProvider = safeString(data.storage_provider || "s3").toLowerCase();

  if (storageProvider !== "s3") {
    throw new Error("Photo is not available for S3 purchase");
  }

  if (!data.object_key) {
    throw new Error("Photo storage key missing");
  }

  return data;
}

/* ✅ RAZORPAY PAYMENT VALIDATION */
async function fetchRazorpayPayment(paymentId: string) {
  const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${razorpayAuth}`,
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}


async function triggerImagePurchasePaymentNotification(args: {
  photographerId: string;
  eventId: string;
  photoId: string;
  amount: number;
  buyerName: string;
}) {
  try {
    const pushSecret = Deno.env.get("PUSH_SEND_SECRET");

    if (!pushSecret) {
      console.warn("Image purchase notification skipped: PUSH_SEND_SECRET is not configured.");
      return;
    }

    const safeBuyerName = safeString(args.buyerName);
    const message = safeBuyerName
      ? `${safeBuyerName} purchased a photo for ₹${args.amount}.`
      : `A photo was purchased for ₹${args.amount}.`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-push-secret": pushSecret,
      },
      body: JSON.stringify({
        user_id: args.photographerId,
        type: "image_purchase_success",
        title: "Photo payment received",
        message,
        data: {
          screen: "earnings",
          event_id: args.eventId,
          photo_id: args.photoId,
          amount: String(args.amount),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("Image purchase notification failed:", response.status, errorText);
    }
  } catch (error) {
    console.warn("Image purchase notification skipped:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({
      success: false,
      error: "Method not allowed"
    }, 405);
  }

  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payload
    } = body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({
        success: false,
        error: "Missing payment details"
      }, 400);
    }

    if (!payload || typeof payload !== "object") {
      return jsonResponse({
        success: false,
        error: "Missing payload"
      }, 400);
    }

    const safeEventId = safeString(payload.event_id);
    const safePhotographerId = safeString(payload.photographer_id);
    const safePhotoId = safeString(payload.photo_id);

    if (!safeEventId || !safePhotographerId || !safePhotoId) {
      return jsonResponse({
        success: false,
        error: "Missing required payment context"
      }, 400);
    }

    // 🔐 Razorpay signature verify
    const signatureText = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = await generateRazorpaySignature(signatureText, RAZORPAY_KEY_SECRET);

    if (generatedSignature !== razorpay_signature) {
      return jsonResponse({
        success: false,
        error: "Invalid signature"
      }, 400);
    }

    // 🔐 Subscription validation
    const allowed = await isPhotographerPaid(safePhotographerId);

    if (!allowed) {
      return jsonResponse({
        success: false,
        error: "Photo selling not allowed for free plan"
      }, 403);
    }

    // ✅ DB price is final source of truth
    const eventPhotoPrice = await getEventPhotoSellingPrice(safeEventId, safePhotographerId);
    const expectedAmountPaise = eventPhotoPrice * 100;

    // ✅ DB photo row is final media source of truth
    const photoRow = await getVerifiedS3Photo(
      safePhotoId,
      safeEventId,
      safePhotographerId
    );

    // ✅ Validate actual Razorpay payment amount/status
    const razorpayPaymentResponse = await fetchRazorpayPayment(String(razorpay_payment_id));

    if (!razorpayPaymentResponse.ok) {
      console.error("Razorpay payment fetch failed:", razorpayPaymentResponse.data);

      return jsonResponse({
        success: false,
        error: "Unable to verify payment with Razorpay"
      }, 400);
    }

    const razorpayPayment = razorpayPaymentResponse.data;

    if (String(razorpayPayment?.id || "") !== String(razorpay_payment_id)) {
      return jsonResponse({
        success: false,
        error: "Payment ID mismatch"
      }, 400);
    }

    if (String(razorpayPayment?.order_id || "") !== String(razorpay_order_id)) {
      return jsonResponse({
        success: false,
        error: "Payment order mismatch"
      }, 400);
    }

    if (String(razorpayPayment?.currency || "").toUpperCase() !== "INR") {
      return jsonResponse({
        success: false,
        error: "Payment currency mismatch"
      }, 400);
    }

    if (Number(razorpayPayment?.amount || 0) !== expectedAmountPaise) {
      return jsonResponse({
        success: false,
        error: "Payment amount mismatch"
      }, 400);
    }

    const razorpayStatus = String(razorpayPayment?.status || "").toLowerCase();
    const isCaptured = razorpayStatus === "captured" || razorpayPayment?.captured === true;

    if (!isCaptured) {
      return jsonResponse({
        success: false,
        error: "Payment is not captured"
      }, 400);
    }

    const split = calculatePaymentSplit(eventPhotoPrice);

    /*
      ✅ SAFE WHITELIST INSERT ONLY
      No payload spread.
      No event_name.
      No random frontend fields.
      image_url kept only as legacy/convenience, not source of truth.
    */
    const purchasePayload = {
      event_id: safeEventId,
      photo_id: safePhotoId,
      photographer_id: safePhotographerId,
      visitor_id: safeString(payload.visitor_id),

      image_url: safeString(payload.image_url),
      object_key: safeString(photoRow.object_key),
      preview_key: safeString(photoRow.preview_key),
      thumbnail_key: safeString(photoRow.thumbnail_key),
      storage_provider: "s3",
      bucket: safeString(photoRow.bucket),

      file_size: toSafeNumber(photoRow.file_size),
      original_file_size: toSafeNumber(photoRow.original_file_size),
      stored_file_size: toSafeNumber(photoRow.stored_file_size),
      width: toSafeNumber(photoRow.width),
      height: toSafeNumber(photoRow.height),

      amount: split.gross_amount,
      photographer_amount: split.photographer_amount,
      platform_amount: split.platform_amount,

      buyer_name: safeString(payload.buyer_name),
      buyer_upi_id: safeString(payload.buyer_upi_id),
      buyer_upi_name: safeString(payload.buyer_upi_name),

      razorpay_order_id: String(razorpay_order_id),
      razorpay_payment_id: String(razorpay_payment_id),
      razorpay_signature: String(razorpay_signature)
    };

    const { data: insertedPurchase, error: purchaseError } = await supabase
      .from("image_purchases")
      .insert([purchasePayload])
      .select("*")
      .single();

    if (purchaseError || !insertedPurchase) {
      return jsonResponse({
        success: false,
        error: purchaseError?.message || "Failed to save image purchase"
      }, 500);
    }

    const transactionPayload = {
      image_purchase_id: insertedPurchase.id,
      gross_amount: split.gross_amount,
      gateway_fee: split.gateway_fee,
      net_amount: split.net_amount,
      photographer_amount: split.photographer_amount,
      platform_amount: split.platform_amount,
      buyer_name: safeString(payload.buyer_name),
      buyer_upi_id: safeString(payload.buyer_upi_id),
      buyer_upi_name: safeString(payload.buyer_upi_name)
    };

    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .insert([transactionPayload]);

    if (transactionError) {
      await rollbackImagePurchase(insertedPurchase.id);

      return jsonResponse({
        success: false,
        error: `Payment transaction insert failed: ${transactionError.message}`
      }, 500);
    }

    const ledgerAmount = split.photographer_amount;

    if (ledgerAmount <= 0) {
      await rollbackPaymentTransaction(insertedPurchase.id);
      await rollbackImagePurchase(insertedPurchase.id);

      return jsonResponse({
        success: false,
        error: "Invalid ledger amount"
      }, 500);
    }

    const paymentNote = `razorpay_payment_id:${razorpay_payment_id}`;

    // ✅ DUPLICATE LEDGER PROTECTION
    const { data: existingLedger } = await supabase
      .from("earnings_ledger")
      .select("id")
      .eq("user_id", safePhotographerId)
      .eq("source", "image_purchase")
      .eq("entry_type", "credit")
      .eq("notes", paymentNote)
      .limit(1);

    if (!existingLedger || existingLedger.length === 0) {
      const ledgerRow = {
        user_id: safePhotographerId,
        event_id: safeEventId,
        payment_transaction_id: null,
        amount: ledgerAmount,
        entry_type: "credit",
        source: "image_purchase",
        status: "completed",
        notes: paymentNote
      };

      const { error: ledgerError } = await supabase
        .from("earnings_ledger")
        .insert([ledgerRow]);

      if (ledgerError) {
        await rollbackPaymentTransaction(insertedPurchase.id);
        await rollbackImagePurchase(insertedPurchase.id);

        return jsonResponse({
          success: false,
          error: `Ledger insert failed: ${ledgerError.message}`
        }, 500);
      }
    }

    await triggerImagePurchasePaymentNotification({
      photographerId: safePhotographerId,
      eventId: safeEventId,
      photoId: safePhotoId,
      amount: split.gross_amount,
      buyerName: safeString(payload.buyer_name),
    });
    return jsonResponse({
      success: true,
      amount: split.gross_amount,
      gross_amount: split.gross_amount,
      gateway_fee: split.gateway_fee,
      net_amount: split.net_amount,
      photographer_amount: split.photographer_amount,
      platform_amount: split.platform_amount,
      photo_id: safePhotoId
    });

  } catch (err) {
    console.error("verify-payment error:", err);

    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error"
    }, 500);
  }
});