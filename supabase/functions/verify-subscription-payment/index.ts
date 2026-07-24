import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GST_RATE = 0.18;

const PLAN_CONFIG = {
  basic: {
    monthly: { baseAmountInRupees: 1499, storageLimitGb: 50, months: 1 },
    yearly: { baseAmountInRupees: 5988, storageLimitGb: 50, months: 12 },
  },
  pro: {
    monthly: { baseAmountInRupees: 1999, storageLimitGb: 100, months: 1 },
    yearly: { baseAmountInRupees: 11988, storageLimitGb: 100, months: 12 },
  },
} as const;

type PlanName = keyof typeof PLAN_CONFIG;
type BillingCycle = keyof (typeof PLAN_CONFIG)["basic"];

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

type RazorpayPaymentResponse = {
  id?: string;
  entity?: string;
  amount?: number;
  currency?: string;
  status?: string;
  order_id?: string;
  method?: string;
  captured?: boolean;
  email?: string | null;
  contact?: string | null;
  fee?: number | null;
  tax?: number | null;
  notes?: Record<string, unknown>;
};

type PaymentRow = {
  id: string;
  user_id: string;
  status: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id?: string | null;
  plan_code?: string | null;
  billing_cycle?: string | null;
  amount?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function addMonths(date: Date, count: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
}

function paiseToRupees(value: unknown): number {
  const paise = Number(value || 0);
  if (!Number.isFinite(paise) || paise <= 0) return 0;
  return Math.round(paise) / 100;
}

function roundMoney(value: unknown): number {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function calculateGatewayPricing(pricing: ReturnType<typeof calculateGstPricing>, razorpayPayment: RazorpayPaymentResponse) {
  const totalAmount = roundMoney(pricing.total_amount_rupees);
  const gatewayFee = roundMoney(paiseToRupees(razorpayPayment?.fee));
  const gatewayTax = roundMoney(paiseToRupees(razorpayPayment?.tax));
  const netAmount = roundMoney(Math.max(totalAmount - gatewayFee, 0));

  return {
    base_amount: roundMoney(pricing.base_amount_rupees),
    gst_amount: roundMoney(pricing.gst_amount_rupees),
    total_amount: totalAmount,
    gateway_fee: gatewayFee,
    gateway_tax: gatewayTax,
    net_amount: netAmount,
  };
}

function calculateGstPricing(baseAmountInRupees: number) {
  const baseAmountPaise = Math.round(Number(baseAmountInRupees || 0) * 100);
  const gstAmountPaise = Math.round(baseAmountPaise * GST_RATE);
  const totalAmountPaise = baseAmountPaise + gstAmountPaise;

  return {
    base_amount_rupees: baseAmountPaise / 100,
    gst_rate: GST_RATE,
    gst_amount_rupees: gstAmountPaise / 100,
    total_amount_rupees: totalAmountPaise / 100,
    base_amount_paise: baseAmountPaise,
    gst_amount_paise: gstAmountPaise,
    total_amount_paise: totalAmountPaise,
  };
}

function normalizePlan(value: unknown): PlanName | null {
  const plan = String(value || "").trim().toLowerCase();
  return plan === "basic" || plan === "pro" ? plan : null;
}

function normalizeBillingCycle(value: unknown): BillingCycle | null {
  const cycle = String(value || "").trim().toLowerCase();
  return cycle === "monthly" || cycle === "yearly" ? cycle : null;
}

function normalizeNonEmptyString(value: unknown): string {
  return String(value || "").trim();
}

async function createHmacSignature(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchAuthenticatedUser(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
): Promise<AuthenticatedUser | null> {
  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
    },
  });

  if (!userResp.ok) {
    const errorText = await userResp.text();
    console.error("Auth user fetch failed:", errorText);
    return null;
  }

  const userData = await userResp.json();

  if (!userData?.id) {
    return null;
  }

  return {
    id: userData.id,
    email: userData.email || null,
  };
}

async function fetchRazorpayPayment(
  razorpayKeyId: string,
  razorpayKeySecret: string,
  paymentId: string,
) {
  const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${razorpayAuth}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data: data as RazorpayPaymentResponse & { error?: { description?: string } },
  };
}

async function getPaymentRowByPaymentId(
  supabase: ReturnType<typeof createClient>,
  paymentId: string,
) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, user_id, status, razorpay_payment_id, razorpay_order_id, plan_code, billing_cycle, amount, currency, metadata")
    .eq("razorpay_payment_id", paymentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Payment lookup by payment ID failed: ${error.message}`);
  }

  return (data || null) as PaymentRow | null;
}

async function getPaymentRowByOrderId(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, user_id, status, razorpay_payment_id, razorpay_order_id, plan_code, billing_cycle, amount, currency, metadata")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Payment lookup by order ID failed: ${error.message}`);
  }

  return (data || null) as PaymentRow | null;
}

async function findExistingPaymentRow(
  supabase: ReturnType<typeof createClient>,
  paymentId: string,
  orderId: string,
) {
  const byPaymentId = await getPaymentRowByPaymentId(supabase, paymentId);

  if (byPaymentId) {
    return {
      row: byPaymentId,
      matched_by: "payment_id",
    };
  }

  const byOrderId = await getPaymentRowByOrderId(supabase, orderId);

  return {
    row: byOrderId,
    matched_by: byOrderId ? "order_id" : "none",
  };
}

async function ensureStorageUsageRow(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { error } = await supabase
    .from("user_storage_usage")
    .upsert(
      [{
        user_id: userId,
        used_bytes: 0,
        reserved_bytes: 0,
      }],
      { onConflict: "user_id" },
    );

  if (error) {
    throw new Error(`Failed to initialize user_storage_usage: ${error.message}`);
  }
}

async function upsertPhotographerSettings(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: {
    plan: PlanName;
    billing_cycle: BillingCycle;
    storage_limit_gb: number;
    plan_started_at: string;
    plan_expires_at: string;
  },
) {
  const updatePayload = {
    plan: payload.plan,
    billing_cycle: payload.billing_cycle,
    subscription_status: "active",
    storage_limit_gb: payload.storage_limit_gb,
    plan_started_at: payload.plan_started_at,
    plan_expires_at: payload.plan_expires_at,
    is_paid: true,
  };

  const { data: existingSettings, error: settingsLookupError } = await supabase
    .from("photographer_settings")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (settingsLookupError) {
    throw new Error(`Failed to read photographer_settings: ${settingsLookupError.message}`);
  }

  if (existingSettings) {
    const { error: updateError } = await supabase
      .from("photographer_settings")
      .update(updatePayload)
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(`Failed to update photographer_settings: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase
      .from("photographer_settings")
      .insert({
        user_id: userId,
        ...updatePayload,
      });

    if (insertError) {
      throw new Error(`Failed to insert photographer_settings: ${insertError.message}`);
    }
  }
}

function buildPaymentMetadata({
  planConfig,
  razorpayPayment,
  notes,
  pricing,
  paymentBreakdown,
}: {
  planConfig: { storageLimitGb: number; months: number };
  razorpayPayment: RazorpayPaymentResponse;
  notes: Record<string, unknown>;
  pricing: ReturnType<typeof calculateGstPricing>;
  paymentBreakdown: ReturnType<typeof calculateGatewayPricing>;
}) {
  return {
    storage_limit_gb: planConfig.storageLimitGb,
    months: planConfig.months,
    razorpay_status: razorpayPayment.status,
    razorpay_method: razorpayPayment.method || null,
    razorpay_email: razorpayPayment.email || null,
    razorpay_contact: razorpayPayment.contact || null,
    razorpay_fee_rupees: paymentBreakdown.gateway_fee,
    razorpay_tax_rupees: paymentBreakdown.gateway_tax,
    razorpay_notes: notes,
    base_amount_rupees: pricing.base_amount_rupees,
    gst_rate: GST_RATE,
    gst_amount_rupees: pricing.gst_amount_rupees,
    total_amount_rupees: pricing.total_amount_rupees,
    net_amount_rupees: paymentBreakdown.net_amount,
  };
}


async function sendSubscriptionPaymentNotification({
  supabaseUrl,
  userId,
  plan,
  billingCycle,
  paymentBreakdown,
  expiresAt,
}: {
  supabaseUrl: string;
  userId: string;
  plan: PlanName;
  billingCycle: BillingCycle;
  paymentBreakdown: ReturnType<typeof calculateGatewayPricing>;
  expiresAt: Date;
}) {
  try {
    const pushSecret = normalizeNonEmptyString(Deno.env.get("PUSH_SEND_SECRET"));

    if (!pushSecret) {
      console.warn("Subscription payment notification skipped: PUSH_SEND_SECRET is missing");
      return;
    }

    const displayPlan = `${plan.charAt(0).toUpperCase()}${plan.slice(1)}`;
    const displayCycle = `${billingCycle.charAt(0).toUpperCase()}${billingCycle.slice(1)}`;

    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-push-secret": pushSecret,
      },
      body: JSON.stringify({
        user_id: userId,
        type: "subscription_payment",
        title: "Subscription activated",
        message: `${displayPlan} ${displayCycle} plan is active. Payment of ₹${paymentBreakdown.total_amount} received successfully.`,
        data: {
          screen: "plans",
          event: "subscription_payment",
          plan,
          billing_cycle: billingCycle,
          amount: String(paymentBreakdown.total_amount),
          currency: "INR",
          plan_expires_at: expiresAt.toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Subscription payment notification failed:", response.status, errorText);
    }
  } catch (error) {
    console.error("Subscription payment notification skipped:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = normalizeNonEmptyString(Deno.env.get("SUPABASE_URL"));
    const serviceRoleKey = normalizeNonEmptyString(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const anonKey = normalizeNonEmptyString(Deno.env.get("SUPABASE_ANON_KEY"));
    const razorpayKeyId = normalizeNonEmptyString(Deno.env.get("RAZORPAY_KEY_ID"));
    const razorpaySecret = normalizeNonEmptyString(Deno.env.get("RAZORPAY_KEY_SECRET"));

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !razorpayKeyId || !razorpaySecret) {
      return jsonResponse(
        { success: false, error: "Missing environment variables" },
        500,
      );
    }

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return jsonResponse({ success: false, error: "Missing Authorization header" }, 401);
    }

    const body = await req.json();

    const razorpayOrderId = normalizeNonEmptyString(body?.razorpay_order_id);
    const razorpayPaymentId = normalizeNonEmptyString(body?.razorpay_payment_id);
    const razorpaySignature = normalizeNonEmptyString(body?.razorpay_signature);
    const plan = normalizePlan(body?.plan);
    const billingCycle = normalizeBillingCycle(body?.billing_cycle);

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return jsonResponse({ success: false, error: "Missing payment details" }, 400);
    }

    if (!plan) {
      return jsonResponse({ success: false, error: "Invalid plan" }, 400);
    }

    if (!billingCycle) {
      return jsonResponse({ success: false, error: "Invalid billing cycle" }, 400);
    }

    const generatedSignature = await createHmacSignature(
      razorpaySecret,
      `${razorpayOrderId}|${razorpayPaymentId}`,
    );

    if (generatedSignature !== razorpaySignature) {
      return jsonResponse({ success: false, error: "Invalid payment signature" }, 400);
    }

    const authenticatedUser = await fetchAuthenticatedUser(supabaseUrl, anonKey, authHeader);

    if (!authenticatedUser?.id) {
      return jsonResponse({ success: false, error: "User not found" }, 401);
    }

    const planConfig = PLAN_CONFIG[plan][billingCycle];
    const pricing = calculateGstPricing(planConfig.baseAmountInRupees);
    const expectedAmountInPaise = pricing.total_amount_paise;

    const paymentResp = await fetchRazorpayPayment(
      razorpayKeyId,
      razorpaySecret,
      razorpayPaymentId,
    );

    if (!paymentResp.ok) {
      console.error("Razorpay payment fetch failed:", paymentResp.data);

      return jsonResponse(
        {
          success: false,
          error: paymentResp.data?.error?.description || "Unable to verify payment with Razorpay",
        },
        400,
      );
    }

    const razorpayPayment = paymentResp.data;
    const paymentBreakdown = calculateGatewayPricing(pricing, razorpayPayment);

    if (normalizeNonEmptyString(razorpayPayment?.id) !== razorpayPaymentId) {
      return jsonResponse(
        { success: false, error: "Payment ID mismatch during verification" },
        400,
      );
    }

    if (normalizeNonEmptyString(razorpayPayment?.order_id) !== razorpayOrderId) {
      return jsonResponse(
        { success: false, error: "Order mismatch during payment verification" },
        400,
      );
    }

    if (String(razorpayPayment?.status || "").trim().toLowerCase() !== "captured") {
      return jsonResponse(
        { success: false, error: "Payment is not captured" },
        400,
      );
    }

    if (razorpayPayment?.captured !== true) {
      return jsonResponse(
        { success: false, error: "Payment capture flag is invalid" },
        400,
      );
    }

    if (normalizeNonEmptyString(razorpayPayment?.currency).toUpperCase() !== "INR") {
      return jsonResponse(
        { success: false, error: "Payment currency mismatch" },
        400,
      );
    }

    if (Number(razorpayPayment?.amount || 0) !== expectedAmountInPaise) {
      return jsonResponse(
        { success: false, error: "Payment amount mismatch" },
        400,
      );
    }

    const notes = razorpayPayment?.notes || {};
    const paymentFor = normalizeNonEmptyString(notes?.payment_for).toLowerCase();
    const notedPlan = normalizePlan(notes?.plan);
    const notedBillingCycle = normalizeBillingCycle(notes?.billing_cycle);
    const notedUserId = normalizeNonEmptyString(notes?.user_id);
    const notedTotalAmount = Number(notes?.total_amount_rupees || 0);

    if (paymentFor !== "subscription") {
      return jsonResponse(
        { success: false, error: "Invalid payment purpose" },
        400,
      );
    }

    if (notedPlan !== plan || notedBillingCycle !== billingCycle) {
      return jsonResponse(
        { success: false, error: "Payment notes mismatch" },
        400,
      );
    }

    if (notedUserId && notedUserId !== authenticatedUser.id) {
      return jsonResponse(
        { success: false, error: "Payment does not belong to authenticated user" },
        403,
      );
    }

    if (Number.isFinite(notedTotalAmount) && notedTotalAmount > 0) {
      const notedTotalPaise = Math.round(notedTotalAmount * 100);

      if (notedTotalPaise !== expectedAmountInPaise) {
        return jsonResponse(
          { success: false, error: "Payment GST amount mismatch" },
          400,
        );
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const existingLookup = await findExistingPaymentRow(
      supabase,
      razorpayPaymentId,
      razorpayOrderId,
    );

    const existingPaymentRow = existingLookup.row;

    if (existingPaymentRow && existingPaymentRow.user_id !== authenticatedUser.id) {
      return jsonResponse(
        { success: false, error: "Payment does not belong to authenticated user" },
        403,
      );
    }

    if (existingPaymentRow?.plan_code && normalizePlan(existingPaymentRow.plan_code) !== plan) {
      return jsonResponse(
        { success: false, error: "Payment plan mismatch" },
        400,
      );
    }

    if (
      existingPaymentRow?.billing_cycle &&
      normalizeBillingCycle(existingPaymentRow.billing_cycle) !== billingCycle
    ) {
      return jsonResponse(
        { success: false, error: "Payment billing cycle mismatch" },
        400,
      );
    }

    if (
      existingPaymentRow?.razorpay_payment_id &&
      existingPaymentRow.razorpay_payment_id !== razorpayPaymentId
    ) {
      return jsonResponse(
        { success: false, error: "Payment row already linked to another payment" },
        409,
      );
    }

    const startedAt = new Date();
    const expiresAt = addMonths(startedAt, planConfig.months);
    const metadata = buildPaymentMetadata({
      planConfig,
      razorpayPayment,
      notes,
      pricing,
      paymentBreakdown,
    });

    const financialPayload = {
      amount: paymentBreakdown.total_amount,
      gateway_fee: paymentBreakdown.gateway_fee,
      net_amount: paymentBreakdown.net_amount,
      base_amount: paymentBreakdown.base_amount,
      gst_amount: paymentBreakdown.gst_amount,
      total_amount: paymentBreakdown.total_amount,
      currency: "INR",
      metadata,
    };

    const existingStatus = String(existingPaymentRow?.status || "").trim().toLowerCase();

    if (existingPaymentRow && existingStatus === "paid") {
      const { error: paidFinancialUpdateError } = await supabase
        .from("payments")
        .update({
          ...financialPayload,
          plan_code: plan,
          billing_cycle: billingCycle,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
        })
        .eq("id", existingPaymentRow.id)
        .eq("status", "paid");

      if (paidFinancialUpdateError) {
        console.error("Paid payment financial sync failed:", paidFinancialUpdateError);
      }

      await ensureStorageUsageRow(supabase, authenticatedUser.id);

      return jsonResponse({
        success: true,
        idempotent: true,
        matched_by: existingLookup.matched_by,
        plan,
        billing_cycle: billingCycle,
        storage_limit_gb: planConfig.storageLimitGb,
        pricing,
        payment_breakdown: paymentBreakdown,
      });
    }

    if (existingPaymentRow) {
      const { error: updatePaymentError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          plan_code: plan,
          billing_cycle: billingCycle,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          ...financialPayload,
        })
        .eq("id", existingPaymentRow.id)
        .in("status", ["created", "pending", "failed", "stale"]);

      if (updatePaymentError) {
        console.error("Failed to update payment row:", updatePaymentError);

        return jsonResponse(
          { success: false, error: "Payment verified but payment record update failed" },
          500,
        );
      }
    } else {
      const { error: insertPaymentError } = await supabase
        .from("payments")
        .insert({
          user_id: authenticatedUser.id,
          payment_type: "subscription",
          plan_code: plan,
          billing_cycle: billingCycle,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          status: "paid",
          ...financialPayload,
        });

      if (insertPaymentError) {
        console.error("Initial payment insert failed:", insertPaymentError);

        const duplicateByPaymentId = await getPaymentRowByPaymentId(supabase, razorpayPaymentId);
        const duplicateByOrderId = await getPaymentRowByOrderId(supabase, razorpayOrderId);
        const duplicateRow = duplicateByPaymentId || duplicateByOrderId;

        if (!duplicateRow) {
          return jsonResponse(
            { success: false, error: "Payment verified but payment record insert failed" },
            500,
          );
        }

        if (duplicateRow.user_id !== authenticatedUser.id) {
          return jsonResponse(
            { success: false, error: "Payment does not belong to authenticated user" },
            403,
          );
        }
      }
    }

    await upsertPhotographerSettings(supabase, authenticatedUser.id, {
      plan,
      billing_cycle: billingCycle,
      storage_limit_gb: planConfig.storageLimitGb,
      plan_started_at: startedAt.toISOString(),
      plan_expires_at: expiresAt.toISOString(),
    });

    await ensureStorageUsageRow(supabase, authenticatedUser.id);

    await sendSubscriptionPaymentNotification({
      supabaseUrl,
      userId: authenticatedUser.id,
      plan,
      billingCycle,
      paymentBreakdown,
      expiresAt,
    });

    return jsonResponse({
      success: true,
      idempotent: false,
      matched_by: existingLookup.matched_by,
      plan,
      billing_cycle: billingCycle,
      plan_started_at: startedAt.toISOString(),
      plan_expires_at: expiresAt.toISOString(),
      storage_limit_gb: planConfig.storageLimitGb,
      pricing,
      payment_breakdown: paymentBreakdown,
    });
  } catch (error) {
    console.error("verify-subscription-payment failed:", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      500,
    );
  }
});