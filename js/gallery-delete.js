import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.787.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const s3 = new S3Client({
  region: Deno.env.get("AWS_REGION"),
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID"),
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY"),
  },
});

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    const { event_id } = await req.json();

    if (!event_id) {
      return new Response(JSON.stringify({ error: "Missing event_id" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // 🔥 GET ALL PHOTOS
    const res = await fetch(
      `${supabaseUrl}/rest/v1/gallery_photos?event_id=eq.${event_id}`,
      {
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`
        }
      }
    );

    const photos = await res.json();

    if (!Array.isArray(photos)) {
      throw new Error("Invalid photos response");
    }

    // 🔥 CALCULATE TOTAL SIZE (IMPORTANT FIX)
    let totalDeletedBytes = 0;
    let userId = null;

    for (const photo of photos) {

      if (!userId && photo.user_id) {
        userId = photo.user_id;
      }

      if (photo.file_size) {
        totalDeletedBytes += Number(photo.file_size || 0);
      }

      // 🔥 DELETE ORIGINAL
      if (photo.object_key) {
        await s3.send(new DeleteObjectCommand({
          Bucket: Deno.env.get("AWS_S3_BUCKET"),
          Key: photo.object_key
        }));
      }

      // 🔥 DELETE PREVIEW
      if (photo.preview_key && photo.preview_key !== photo.object_key) {
        await s3.send(new DeleteObjectCommand({
          Bucket: Deno.env.get("AWS_S3_BUCKET"),
          Key: photo.preview_key
        }));
      }

      // 🔥 DELETE THUMB
      if (photo.thumbnail_key && photo.thumbnail_key !== photo.object_key) {
        await s3.send(new DeleteObjectCommand({
          Bucket: Deno.env.get("AWS_S3_BUCKET"),
          Key: photo.thumbnail_key
        }));
      }
    }

    // 🔥 DELETE DB RECORDS
    await fetch(`${supabaseUrl}/rest/v1/gallery_photos?event_id=eq.${event_id}`, {
      method: "DELETE",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      }
    });

    await fetch(`${supabaseUrl}/rest/v1/event_tokens?event_id=eq.${event_id}`, {
      method: "DELETE",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      }
    });

    await fetch(`${supabaseUrl}/rest/v1/events?id=eq.${event_id}`, {
      method: "DELETE",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      }
    });

    // 🔥🔥🔥 STORAGE MINUS FIX (MAIN PART)
    if (userId && totalDeletedBytes > 0) {

      const settingsRes = await fetch(
        `${supabaseUrl}/rest/v1/photographer_settings?user_id=eq.${userId}`,
        {
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`
          }
        }
      );

      const settings = await settingsRes.json();

      if (settings && settings.length > 0) {

        const currentUsed = Number(settings[0].used_storage_bytes || 0);

        const newUsed = Math.max(0, currentUsed - totalDeletedBytes);

        await fetch(
          `${supabaseUrl}/rest/v1/photographer_settings?user_id=eq.${userId}`,
          {
            method: "PATCH",
            headers: {
              "apikey": serviceKey,
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              used_storage_bytes: newUsed
            })
          }
        );
      }
    }

    return new Response(JSON.stringify({
      success: true
    }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500 });
  }

});