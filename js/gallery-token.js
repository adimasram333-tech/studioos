```javascript
// gallery-token.js
// PURPOSE:
// Fix random token issue permanently
// Ensure ONLY ONE token per event (stable token)

// =============================
// TOKEN GENERATOR
// =============================
function generateToken(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let token = "";

  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return token;
}

// =============================
// GET / CREATE TOKEN
// =============================
export async function getEventToken(eventId) {
  if (!eventId) {
    console.error("❌ getEventToken: eventId missing");
    return null;
  }

  try {
    const supabase = await window.getSupabase();

    // =============================
    // STEP 1: FETCH TOKENS (ORDERED)
    // =============================
    const { data: tokens, error } = await supabase
      .from("event_tokens")
      .select("id, token, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Token fetch error:", error.message);
      return null;
    }

    // =============================
    // STEP 2: IF TOKEN EXISTS
    // =============================
    if (tokens && tokens.length > 0) {
      const mainToken = tokens[0];

      // =============================
      // CLEAN DUPLICATES (SAFE)
      // =============================
      if (tokens.length > 1) {
        const duplicateIds = tokens.slice(1).map((t) => t.id);

        if (duplicateIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("event_tokens")
            .delete()
            .in("id", duplicateIds);

          if (deleteError) {
            console.warn("⚠️ Duplicate delete failed:", deleteError.message);
          } else {
            console.log("⚠️ Duplicate tokens cleaned");
          }
        }
      }

      return mainToken.token;
    }

    // =============================
    // STEP 3: CREATE NEW TOKEN
    // =============================
    const newToken = generateToken();

    const { data: inserted, error: insertError } = await supabase
      .from("event_tokens")
      .insert([
        {
          event_id: eventId,
          token: newToken,
        },
      ])
      .select("token")
      .single();

    if (insertError) {
      console.error("❌ Token creation failed:", insertError.message);
      return null;
    }

    console.log("✅ New token created");

    return inserted.token;
  } catch (err) {
    console.error("❌ getEventToken crashed:", err.message);
    return null;
  }
}
```
