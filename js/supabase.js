// =============================
// SUPABASE CONNECTION
// =============================

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co"
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY"

const supabaseClient = supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
)


// =============================
// SAVE QUOTATION
// =============================

async function saveQuotation(data){

try{

const { data: result, error } = await supabaseClient
.from("quotations")
.insert([data])
.select()
.single()

if(error){

console.error("Supabase Error:", error)
return null

}

return result

}catch(err){

console.error("Save Error:", err)
return null

}

}