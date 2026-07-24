import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GST_RATE = 0.18;

const TEMPLATE_CATALOG: Record<number, { name: string; baseAmountInPaise: number }> = {
  2: { name: "Luxury Wedding", baseAmountInPaise: 109900 },
  3: { name: "Dark Cinematic", baseAmountInPaise: 159900 },
  4: { name: "Modern Studio", baseAmountInPaise: 149900 },
  5: { name: "Instagram Style", baseAmountInPaise: 149900 },
  6: { name: "Premium Agency", baseAmountInPaise: 109900 },
};

type VerifyTemplatePaymentBody = {
  template_id?: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

type RazorpayPaymentResponse = {
  id?: string;
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
  error?: { description?: string };
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function roundMoney(value: unknown): number {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function paiseToRupees(value: unknown): number {
  const paise = Number(value || 0);
  if (!Number.isFinite(paise) || paise <= 0) return 0;
  return Math.round(paise) / 100;
}

function calculateGstPricing(baseAmountInPaise: number) {
  const safeBaseAmountInPaise = Math.max(0, Math.round(Number(baseAmountInPaise || 0)));
  const gstAmountInPaise = Math.round(safeBaseAmountInPaise * GST_RATE);
  const totalAmountInPaise = safeBaseAmountInPaise + gstAmountInPaise;

  return {
    base_amount_rupees: safeBaseAmountInPaise / 100,
    gst_rate: GST_RATE,
    gst_amount_rupees: gstAmountInPaise / 100,
    total_amount_rupees: totalAmountInPaise / 100,
    base_amount_paise: safeBaseAmountInPaise,
    gst_amount_paise: gstAmountInPaise,
    total_amount_paise: totalAmountInPaise,
  };
}

function calculatePaymentBreakdown(
  pricing: ReturnType<typeof calculateGstPricing>,
  razorpayPayment: RazorpayPaymentResponse,
) {
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

function buildPurchaseMetadata(args: {
  pricing: ReturnType<typeof calculateGstPricing>;
  paymentBreakdown: ReturnType<typeof calculatePaymentBreakdown>;
  razorpayPayment: RazorpayPaymentResponse;
  notes: Record<string, unknown>;
}) {
  return {
    base_amount_rupees: args.pricing.base_amount_rupees,
    gst_rate: args.pricing.gst_rate,
    gst_amount_rupees: args.pricing.gst_amount_rupees,
    total_amount_rupees: args.pricing.total_amount_rupees,
    gateway_fee_rupees: args.paymentBreakdown.gateway_fee,
    gateway_tax_rupees: args.paymentBreakdown.gateway_tax,
    net_amount_rupees: args.paymentBreakdown.net_amount,
    razorpay_status: args.razorpayPayment.status || null,
    razorpay_method: args.razorpayPayment.method || null,
    razorpay_email: args.razorpayPayment.email || null,
    razorpay_contact: args.razorpayPayment.contact || null,
    razorpay_notes: args.notes,
  };
}

function normalizePurchasedTemplates(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 2 && item <= 6),
    ),
  ).sort((a, b) => a - b);
}

function normalizeString(value: unknown): string {
  return String(value || "").trim();
}

async function createHmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payload),
  );

  const bytes = new Uint8Array(signatureBuffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchRazorpayPayment(args: {
  keyId: string;
  keySecret: string;
  paymentId: string;
}) {
  const authValue = btoa(`${args.keyId}:${args.keySecret}`);

  const response = await fetch(`https://api.razorpay.com/v1/payments/${args.paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authValue}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data: data as RazorpayPaymentResponse,
  };
}

async function getExistingTemplatePurchase(args: {
  adminClient: ReturnType<typeof createClient>;
  razorpayPaymentId: string;
}) {
  const { data, error } = await args.adminClient
    .from("template_purchases")
    .select("id, user_id, template_id, razorpay_order_id, razorpay_payment_id, status")
    .eq("razorpay_payment_id", args.razorpayPaymentId)
    .maybeSingle();

  if (error) {
    console.warn("Existing template purchase lookup failed:", error);
    return null;
  }

  return data || null;
}

async function syncTemplatePurchaseFinancials(args: {
  adminClient: ReturnType<typeof createClient>;
  purchaseId: string;
  templateId: number;
  templateName: string;
  pricing: ReturnType<typeof calculateGstPricing>;
  paymentBreakdown: ReturnType<typeof calculatePaymentBreakdown>;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  metadata: Record<string, unknown>;
}) {
  const { error } = await args.adminClient
    .from("template_purchases")
    .update({
      template_id: args.templateId,
      template_name: args.templateName,
      amount: args.paymentBreakdown.total_amount,
      total_amount: args.paymentBreakdown.total_amount,
      base_amount: args.paymentBreakdown.base_amount,
      gst_amount: args.paymentBreakdown.gst_amount,
      gateway_fee: args.paymentBreakdown.gateway_fee,
      net_amount: args.paymentBreakdown.net_amount,
      currency: "INR",
      payment_provider: "razorpay",
      razorpay_order_id: args.razorpayOrderId,
      razorpay_payment_id: args.razorpayPaymentId,
      status: "success",
      metadata: args.metadata,
    })
    .eq("id", args.purchaseId);

  if (error) {
    console.warn("Template purchase financial sync failed:", error);
  }
}


async function triggerTemplatePurchaseNotification(args: {
  supabaseUrl: string;
  userId: string;
  templateId: number;
  templateName: string;
  amount: number;
}) {
  try {
    const pushSecret = Deno.env.get("PUSH_SEND_SECRET");

    if (!pushSecret) {
      console.warn("Template purchase notification skipped: PUSH_SEND_SECRET is not configured.");
      return;
    }

    const response = await fetch(`${args.supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-push-secret": pushSecret,
      },
      body: JSON.stringify({
        user_id: args.userId,
        type: "template_purchase_success",
        title: "Template unlocked",
        message: `${args.templateName} template is now unlocked in ChitraBook AI.`,
        data: {
          screen: "website-builder",
          template_id: String(args.templateId),
          template_name: args.templateName,
          amount: String(args.amount),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("Template purchase notification failed:", response.status, errorText);
    }
  } catch (error) {
    console.warn("Template purchase notification skipped:", error);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeyId = getEnv("RAZORPAY_KEY_ID");
    const razorpayKeySecret = getEnv("RAZORPAY_KEY_SECRET");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, {
        ok: false,
        error: "Missing Authorization header",
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      console.error("User auth failed:", authError);
      return jsonResponse(401, {
        ok: false,
        error: "Unauthorized user",
      });
    }

    let body: VerifyTemplatePaymentBody = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, {
        ok: false,
        error: "Invalid JSON body",
      });
    }

    const templateId = Number(body.template_id);
    const razorpayOrderId = normalizeString(body.razorpay_order_id);
    const razorpayPaymentId = normalizeString(body.razorpay_payment_id);
    const razorpaySignature = normalizeString(body.razorpay_signature);

    if (!Number.isInteger(templateId) || templateId === 1 || !TEMPLATE_CATALOG[templateId]) {
      return jsonResponse(400, {
        ok: false,
        error: "Valid paid template_id is required",
      });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return jsonResponse(400, {
        ok: false,
        error: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    const templateMeta = TEMPLATE_CATALOG[templateId];
    const pricing = calculateGstPricing(templateMeta.baseAmountInPaise);

    const signaturePayload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = await createHmacSha256Hex(razorpayKeySecret, signaturePayload);

    if (expectedSignature !== razorpaySignature) {
      return jsonResponse(400, {
        ok: false,
        error: "Invalid payment signature",
      });
    }

    const paymentResponse = await fetchRazorpayPayment({
      keyId: razorpayKeyId,
      keySecret: razorpayKeySecret,
      paymentId: razorpayPaymentId,
    });

    if (!paymentResponse.ok) {
      console.error("Razorpay payment fetch failed:", paymentResponse.data);
      return jsonResponse(400, {
        ok: false,
        error: paymentResponse.data?.error?.description || "Unable to verify payment with Razorpay",
      });
    }

    const razorpayPayment = paymentResponse.data;
    const paymentBreakdown = calculatePaymentBreakdown(pricing, razorpayPayment);
    const notes = razorpayPayment.notes || {};
    const purchaseMetadata = buildPurchaseMetadata({
      pricing,
      paymentBreakdown,
      razorpayPayment,
      notes,
    });

    if (normalizeString(razorpayPayment.id) !== razorpayPaymentId) {
      return jsonResponse(400, {
        ok: false,
        error: "Payment ID mismatch during verification",
      });
    }

    if (normalizeString(razorpayPayment.order_id) !== razorpayOrderId) {
      return jsonResponse(400, {
        ok: false,
        error: "Order mismatch during payment verification",
      });
    }

    if (normalizeString(razorpayPayment.status).toLowerCase() !== "captured") {
      return jsonResponse(400, {
        ok: false,
        error: "Payment is not captured",
      });
    }

    if (razorpayPayment.captured !== true) {
      return jsonResponse(400, {
        ok: false,
        error: "Payment capture flag is invalid",
      });
    }

    if (normalizeString(razorpayPayment.currency).toUpperCase() !== "INR") {
      return jsonResponse(400, {
        ok: false,
        error: "Payment currency mismatch",
      });
    }

    if (Number(razorpayPayment.amount || 0) !== pricing.total_amount_paise) {
      return jsonResponse(400, {
        ok: false,
        error: "Payment amount mismatch",
      });
    }

    const paymentPurchaseType = normalizeString(notes.purchase_type).toLowerCase();
    const notedTemplateId = Number(notes.template_id);
    const notedUserId = normalizeString(notes.user_id);
    const notedTotalAmount = Number(notes.total_amount_rupees || 0);

    if (paymentPurchaseType !== "template") {
      return jsonResponse(400, {
        ok: false,
        error: "Invalid payment purpose",
      });
    }

    if (notedTemplateId !== templateId) {
      return jsonResponse(400, {
        ok: false,
        error: "Template payment notes mismatch",
      });
    }

    if (notedUserId && notedUserId !== user.id) {
      return jsonResponse(403, {
        ok: false,
        error: "Payment does not belong to authenticated user",
      });
    }

    if (Number.isFinite(notedTotalAmount) && notedTotalAmount > 0) {
      const notedTotalPaise = Math.round(notedTotalAmount * 100);

      if (notedTotalPaise !== pricing.total_amount_paise) {
        return jsonResponse(400, {
          ok: false,
          error: "Template payment GST amount mismatch",
        });
      }
    }

    const { data: latestWebsiteRow, error: latestWebsiteError } = await adminClient
      .from("user_websites")
      .select("id, user_id, purchased_templates, template_id, is_published, site_slug")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestWebsiteError) {
      console.error("Failed to load current website row:", latestWebsiteError);
      return jsonResponse(500, {
        ok: false,
        error: "Unable to load current website data",
      });
    }

    if (!latestWebsiteRow?.id) {
      return jsonResponse(400, {
        ok: false,
        error: "Website builder row not found. Save website builder once before purchasing a template",
      });
    }

    const existingPurchase = await getExistingTemplatePurchase({
      adminClient,
      razorpayPaymentId,
    });

    if (existingPurchase && existingPurchase.user_id !== user.id) {
      return jsonResponse(403, {
        ok: false,
        error: "Payment does not belong to authenticated user",
      });
    }

    const existingPurchasedTemplates = normalizePurchasedTemplates(
      latestWebsiteRow.purchased_templates,
    );

    if (existingPurchase?.id) {
      await syncTemplatePurchaseFinancials({
        adminClient,
        purchaseId: existingPurchase.id,
        templateId,
        templateName: templateMeta.name,
        pricing,
        paymentBreakdown,
        razorpayOrderId,
        razorpayPaymentId,
        metadata: purchaseMetadata,
      });
    }

    if (existingPurchasedTemplates.includes(templateId)) {
      return jsonResponse(200, {
        ok: true,
        already_purchased: true,
        template_id: templateId,
        template_name: templateMeta.name,
        purchased_templates: existingPurchasedTemplates,
        pricing,
        payment_breakdown: paymentBreakdown,
      });
    }

    const nextPurchasedTemplates = Array.from(
      new Set([...existingPurchasedTemplates, templateId]),
    ).sort((a, b) => a - b);

    const { data: updatedRow, error: updateError } = await adminClient
      .from("user_websites")
      .update({
        purchased_templates: nextPurchasedTemplates,
      })
      .eq("id", latestWebsiteRow.id)
      .eq("user_id", user.id)
      .select("id, user_id, template_id, is_published, site_slug, purchased_templates")
      .single();

    if (updateError) {
      console.error("Failed to update purchased_templates:", updateError);
      return jsonResponse(500, {
        ok: false,
        error: "Payment verified but template unlock update failed",
      });
    }

    if (!existingPurchase) {
      try {
        const { error: purchaseInsertError } = await adminClient
          .from("template_purchases")
          .insert({
            user_id: user.id,
            website_id: latestWebsiteRow.id,
            template_id: templateId,
            template_name: templateMeta.name,
            amount: paymentBreakdown.total_amount,
            total_amount: paymentBreakdown.total_amount,
            base_amount: paymentBreakdown.base_amount,
            gst_amount: paymentBreakdown.gst_amount,
            gateway_fee: paymentBreakdown.gateway_fee,
            net_amount: paymentBreakdown.net_amount,
            currency: "INR",
            payment_provider: "razorpay",
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            status: "success",
            metadata: purchaseMetadata,
          });

        if (purchaseInsertError) {
          console.warn("Template purchase log insert skipped:", purchaseInsertError);
        }
      } catch (purchaseInsertUnexpectedError) {
        console.warn("Template purchase log insert unexpected error:", purchaseInsertUnexpectedError);
      }
    }

    await triggerTemplatePurchaseNotification({
      supabaseUrl,
      userId: user.id,
      templateId,
      templateName: templateMeta.name,
      amount: paymentBreakdown.total_amount,
    });
    return jsonResponse(200, {
      ok: true,
      already_purchased: false,
      purchase_verified: true,
      template_id: templateId,
      template_name: templateMeta.name,
      purchased_templates: normalizePurchasedTemplates(updatedRow.purchased_templates),
      website: updatedRow,
      pricing,
      payment_breakdown: paymentBreakdown,
    });
  } catch (error) {
    console.error("verify-template-payment unexpected error:", error);

    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
});