// ======================================
// SUPABASE CLIENT INITIALIZATION
// ======================================

// Supabase project credentials
const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co";

const SUPABASE_ANON_KEY =
"PASTE_YOUR_PUBLISHABLE_KEY_HERE";


// Create global client
window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ======================================
// SAVE QUOTATION
// ======================================

async function saveQuotation(data){

try{

const { data: result, error } = await window.supabaseClient
.from("quotations")
.insert([data])
.select()
.single()

if(error){

console.error("Supabase Insert Error:",error)
return null

}

return result

}catch(err){

console.error("Save Quotation Exception:",err)
return null

}

}


// ======================================
// GET QUOTATION BY ID
// ======================================

async function getQuotationById(id){

const { data, error } = await window.supabaseClient
.from("quotations")
.select("*")
.eq("id",id)
.single()

if(error){

console.error("Fetch quotation error:",error)
return null

}

return data

}


// ======================================
// GET ALL QUOTATIONS
// ======================================

async function getAllQuotations(){

const { data, error } = await window.supabaseClient
.from("quotations")
.select("*")
.order("created_at",{ascending:false})

if(error){

console.error("Fetch quotations error:",error)
return []

}

return data

}