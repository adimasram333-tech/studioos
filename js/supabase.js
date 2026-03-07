// ================================
// SUPABASE CONNECTION
// ================================

const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co";
const SUPABASE_KEY = "sb_publishable_TnjoiedXWPbSjjqh2tmfsQ_kpiIMaND";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ================================
// SAVE QUOTATION
// ================================

async function saveQuotation(data) {

  try {

    const { data: result, error } = await supabaseClient
      .from("quotations")
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return null;
    }

    return result;

  } catch (err) {

    console.error("Save quotation failed:", err);
    return null;

  }

}



// ================================
// GET QUOTATION BY ID
// ================================

async function getQuotationById(id) {

  try {

    const { data, error } = await supabaseClient
      .from("quotations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch quotation error:", error);
      return null;
    }

    return data;

  } catch (err) {

    console.error("Fetch quotation failed:", err);
    return null;

  }

}



// ================================
// GET ALL QUOTATIONS
// ================================

async function getAllQuotations() {

  try {

    const { data, error } = await supabaseClient
      .from("quotations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch quotations error:", error);
      return [];
    }

    return data;

  } catch (err) {

    console.error("Fetch quotations failed:", err);
    return [];

  }

}