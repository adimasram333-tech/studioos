// =====================================
// SUPABASE CLIENT INITIALIZATION
// =====================================

// 🔴 Replace with your actual Supabase values
const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co";

const SUPABASE_ANON_KEY =
"PASTE_YOUR_PUBLISHABLE_KEY_HERE";


// Create global client
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// =====================================
// SAVE QUOTATION
// =====================================

async function saveQuotation(quotationData) {

  try {

    const { data, error } = await supabaseClient
      .from("quotations")
      .insert([quotationData])
      .select()
      .single();

    if (error) {
      console.error("Supabase Insert Error:", error);
      return null;
    }

    return data;

  } catch (err) {
    console.error("Save Quotation Exception:", err);
    return null;
  }

}


// =====================================
// GET QUOTATION BY ID
// =====================================

async function getQuotationById(id) {

  try {

    const { data, error } = await supabaseClient
      .from("quotations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch Quotation Error:", error);
      return null;
    }

    return data;

  } catch (err) {
    console.error("Fetch Exception:", err);
    return null;
  }

}


// =====================================
// GET ALL QUOTATIONS
// =====================================

async function getAllQuotations() {

  try {

    const { data, error } = await supabaseClient
      .from("quotations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch All Error:", error);
      return [];
    }

    return data;

  } catch (err) {
    console.error("Fetch All Exception:", err);
    return [];
  }

}