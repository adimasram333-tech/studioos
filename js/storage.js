/* ================================
   SUPABASE CONFIG (SAFE MODE)
================================ */

const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TnjoiedXWPbSjjqh2tmfsQ_kpiIMaND";

/* 
  Prevent duplicate supabase client creation
  This fixes: "Identifier 'supabase' has already been declared"
*/

if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

const db = window.supabaseClient;

/* ================================
   SAVE QUOTATION
================================ */

async function saveQuotation(data) {
  const { data: result, error } = await db
    .from("quotations")
    .insert([data])
    .select();

  if (error) {
    console.error("Supabase Insert Error:", error);
    alert("Error saving quotation");
    return null;
  }

  return result[0];
}

/* ================================
   GET QUOTATION BY ID
================================ */

async function getQuotationById(id) {
  const { data, error } = await db
    .from("quotations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Supabase Fetch Error:", error);
    return null;
  }

  return data;
}

/* ================================
   GLOBAL EXPORT
================================ */

window.saveQuotation = saveQuotation;
window.getQuotationById = getQuotationById;