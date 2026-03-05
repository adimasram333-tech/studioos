const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TnjoiedXWPbSjjqh2tmfsQ_kpiIMaND";

/* Prevent duplicate supabase client */

if (!window.supabaseClient) {

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

}

const supabase = window.supabaseClient;


/* Save quotation */

async function saveQuotation(data) {

  const { data: result, error } = await supabase
    .from("quotations")
    .insert([data])
    .select();

  if (error) {
    console.error(error);
    alert("Error saving quotation");
    return null;
  }

  return result[0];
}


/* Get quotation */

async function getQuotationById(id) {

  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}


/* expose functions */

window.saveQuotation = saveQuotation;
window.getQuotationById = getQuotationById;