// ================================
// SUPABASE CONFIG
// ================================

const SUPABASE_URL =
"https://gnnaaagvlrmdveqxicob.supabase.co"

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubmFhYWd2bHJtZHZlcXhpY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk4NTQsImV4cCI6MjA4ODA3NTg1NH0.LgK0WDOa1wp4vhUS3BjvQUpvU_pENGTZegbCtd_HWNE"


// ================================
// CREATE SUPABASE CLIENT
// ================================

const supabaseClient = supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
)


// expose globally
window.supabase = supabaseClient



// ================================
// SAVE QUOTATION
// ================================

window.saveQuotation = async function(data){

try{

const { data: result, error } =
await supabase
.from("quotations")
.insert([data])
.select()
.single()

if(error){

console.error("Supabase Save Error:",error)
return null

}

return result

}catch(err){

console.error("Save quotation failed:",err)
return null

}

}



// ================================
// GET QUOTATION BY ID
// ================================

window.getQuotationById = async function(id){

try{

const { data, error } =
await supabase
.from("quotations")
.select("*")
.eq("id", id)
.single()

if(error){

console.error("Fetch quotation error:",error)
return null

}

return data

}catch(err){

console.error("Fetch quotation failed:",err)
return null

}

}



// ================================
// GET QUOTATION BY SHORT ID
// ================================

window.getQuotationByShortId = async function(shortId){

try{

const { data, error } =
await supabase
.from("quotations")
.select("*")
.eq("short_id", shortId)
.single()

if(error){

console.error("Fetch short quotation error:",error)
return null

}

return data

}catch(err){

console.error("Fetch short quotation failed:",err)
return null

}

}



// ================================
// GET ALL QUOTATIONS
// ================================

window.getAllQuotations = async function(){

try{

const { data, error } =
await supabase
.from("quotations")
.select("*")
.order("created_at",{ ascending:false })

if(error){

console.error("Fetch quotations error:",error)
return []

}

return data

}catch(err){

console.error("Fetch quotations failed:",err)
return []

}

}



// ================================
// FUTURE: PHOTOGRAPHER SETTINGS
// ================================

window.getPhotographerSettings = async function(userId){

try{

const { data, error } =
await supabase
.from("photographer_settings")
.select("*")
.eq("user_id", userId)
.single()

if(error){

console.log("No settings yet")
return null

}

return data

}catch(err){

console.error("Settings fetch failed:",err)
return null

}

}