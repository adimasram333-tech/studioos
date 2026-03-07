// ================================
// SUPABASE CONNECTION
// ================================

const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubmFhYWd2bHJtZHZlcXhpY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk4NTQsImV4cCI6MjA4ODA3NTg1NH0.LgK0WDOa1wp4vhUS3BjvQUpvU_pENGTZegbCtd_HWNE";


const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ================================
// SAVE QUOTATION
// ================================

async function saveQuotation(data){

  try{

    const { data: result, error } = await supabaseClient
      .from("quotations")
      .insert([data])
      .select()
      .single();

    if(error){
      console.error("Supabase Save Error:", error);
      return null;
    }

    return result;

  }catch(err){

    console.error("Save quotation failed:", err);
    return null;

  }

}


// ================================
// GET QUOTATION BY ID
// ================================

async function getQuotationById(id){

  try{

    const { data, error } = await supabaseClient
      .from("quotations")
      .select("*")
      .eq("id", id)
      .single();

    if(error){
      console.error("Fetch quotation error:", error);
      return null;
    }

    return data;

  }catch(err){

    console.error("Fetch quotation failed:", err);
    return null;

  }

}


// ================================
// GET ALL QUOTATIONS
// ================================

async function getAllQuotations(){

  try{

    const { data, error } = await supabaseClient
      .from("quotations")
      .select("*")
      .order("created_at", { ascending:false });

    if(error){
      console.error("Fetch quotations error:", error);
      return [];
    }

    return data;

  }catch(err){

    console.error("Fetch quotations failed:", err);
    return [];

  }

}