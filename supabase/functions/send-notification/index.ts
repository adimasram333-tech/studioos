import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SendNotificationRequest = {
  user_id?: string;
  userId?: string;
  type?: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
};

type PushTokenRow = {
  id: string;
  user_id: string;
  fcm_token: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function base64UrlEncode(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const cleaned = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

async function createFirebaseJwt() {
  const clientEmail = getRequiredEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getRequiredEnv("FIREBASE_PRIVATE_KEY");

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function getFirebaseAccessToken() {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const assertion = await createFirebaseJwt();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.access_token) {
    console.error("Firebase OAuth token error:", result);
    throw new Error(result?.error_description || result?.error || "Unable to get Firebase access token.");
  }

  cachedAccessToken = String(result.access_token);
  cachedAccessTokenExpiresAt = Date.now() + Number(result.expires_in || 3600) * 1000;

  return cachedAccessToken;
}

function normalizeData(data: Record<string, unknown> = {}) {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!key) continue;

    if (value === null || value === undefined) {
      normalized[key] = "";
    } else if (typeof value === "string") {
      normalized[key] = value;
    } else {
      normalized[key] = JSON.stringify(value);
    }
  }

  normalized.source = normalized.source || "chitrabook_ai";

  return normalized;
}

async function sendFcmMessage(args: {
  token: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
}) {
  const projectId = getRequiredEnv("FIREBASE_PROJECT_ID");
  const accessToken = await getFirebaseAccessToken();

  const payload = {
    message: {
      token: args.token,
      notification: {
        title: args.title,
        body: args.message,
      },
      data: normalizeData(args.data),
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "chitrabook_default",
          sound: "default",
        },
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      result?.error?.message ||
      result?.error ||
      "Firebase message send failed.";

    const error = new Error(errorMessage);
    (error as Error & { fcmResult?: unknown }).fcmResult = result;
    throw error;
  }

  return result;
}

function isInvalidFcmTokenError(error: unknown) {
  const text = JSON.stringify(error || "").toLowerCase();

  return (
    text.includes("registration-token-not-registered") ||
    text.includes("requested entity was not found") ||
    text.includes("unregistered") ||
    text.includes("invalid argument")
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405);
  }

  try {
    const pushSecret = getRequiredEnv("PUSH_SEND_SECRET");
    const requestSecret = req.headers.get("x-push-secret") || "";

    if (!requestSecret || requestSecret !== pushSecret) {
      return jsonResponse({ success: false, error: "Unauthorized push request." }, 401);
    }

    const payload = await req.json().catch(() => null) as SendNotificationRequest | null;

    const userId = String(payload?.user_id || payload?.userId || "").trim();
    const type = String(payload?.type || "general").trim();
    const title = String(payload?.title || "").trim();
    const message = String(payload?.message || "").trim();
    const data = payload?.data && typeof payload.data === "object" ? payload.data : {};

    if (!userId) {
      return jsonResponse({ success: false, error: "user_id is required." }, 400);
    }

    if (!title) {
      return jsonResponse({ success: false, error: "title is required." }, 400);
    }

    if (!message) {
      return jsonResponse({ success: false, error: "message is required." }, 400);
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        delivery_status: "pending",
      })
      .select("id")
      .single();

    if (notificationError) {
      console.error("Notification insert error:", notificationError);
      return jsonResponse({
        success: false,
        error: "Unable to create notification record.",
      }, 500);
    }

    const { data: tokens, error: tokenError } = await supabase
      .from("push_device_tokens")
      .select("id,user_id,fcm_token")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (tokenError) {
      console.error("Token fetch error:", tokenError);
      await supabase
        .from("notifications")
        .update({
          delivery_status: "failed",
          error_message: "Unable to fetch device tokens.",
        })
        .eq("id", notification.id);

      return jsonResponse({
        success: false,
        error: "Unable to fetch device tokens.",
      }, 500);
    }

    const activeTokens = (tokens || []) as PushTokenRow[];

    if (activeTokens.length === 0) {
      await supabase
        .from("notifications")
        .update({
          delivery_status: "no_tokens",
          error_message: "No active device tokens found.",
        })
        .eq("id", notification.id);

      return jsonResponse({
        success: true,
        notification_id: notification.id,
        sent: 0,
        failed: 0,
        no_tokens: true,
      });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of activeTokens) {
      try {
        await sendFcmMessage({
          token: row.fcm_token,
          title,
          message,
          data: {
            ...data,
            notification_id: notification.id,
            type,
          },
        });

        sent += 1;
      } catch (error) {
        failed += 1;
        const messageText = error instanceof Error ? error.message : String(error);
        errors.push(messageText);

        console.error("FCM send error:", {
          token_id: row.id,
          error: messageText,
        });

        if (isInvalidFcmTokenError(error)) {
          await supabase
            .from("push_device_tokens")
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }
      }
    }

    const deliveryStatus =
      sent > 0 && failed === 0 ? "sent" :
      sent > 0 && failed > 0 ? "partial" :
      "failed";

    await supabase
      .from("notifications")
      .update({
        delivery_status: deliveryStatus,
        sent_at: sent > 0 ? new Date().toISOString() : null,
        error_message: failed > 0 ? errors.slice(0, 3).join(" | ") : null,
      })
      .eq("id", notification.id);

    return jsonResponse({
      success: sent > 0,
      notification_id: notification.id,
      sent,
      failed,
      delivery_status: deliveryStatus,
    });
  } catch (error) {
    console.error("send-notification crashed:", error);

    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unexpected send-notification error.",
    }, 500);
  }
});
