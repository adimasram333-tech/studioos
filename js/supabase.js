// ================================
// SUPABASE CONFIG
// ================================

const SUPABASE_URL =
"https://gnnaaagvlrmdveqxicob.supabase.co"

const SUPABASE_ANON_KEY =
"YOUR_ANON_KEY"



// ================================
// CREATE SUPABASE CLIENT (SAFE)
// ================================

let supabaseClient = null

// prevent duplicate initialization
if (!window.supabaseClient) {

if (window.supabase && typeof window.supabase.createClient === "function") {

supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY,
{
auth:{
persistSession:true,
autoRefreshToken:true,
detectSessionInUrl:true
}
}
)

window.supabaseClient = supabaseClient

} else {

console.error("Supabase CDN not loaded")

}

} else {

supabaseClient = window.supabaseClient

}



// ================================
// SAVE QUOTATION
// ================================

window.saveQuotation = async function(data){

if(!supabaseClient) return null

try{

const { data: result, error } =
await supabaseClient
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

if(!supabaseClient) return null

try{

const { data, error } =
await supabaseClient
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

if(!supabaseClient) return null

try{

const { data, error } =
await supabaseClient
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

if(!supabaseClient) return []

try{

const { data, error } =
await supabaseClient
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
// PHOTOGRAPHER SETTINGS
// ================================

window.getPhotographerSettings = async function(userId){

if(!supabaseClient) return null

try{

const { data, error } =
await supabaseClient
.from("photographer_settings")
.select("*")
.eq("user_id", userId)
.maybeSingle()

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



// ================================
// SAVE GALLERY IMAGES
// ================================

window.saveGalleryImages = async function(images){

if(!supabaseClient) return false

try{

const { data, error } =
await supabaseClient
.from("gallery_photos")
.insert(images)

if(error){

console.error("Gallery save error:",error)
return false

}

return true

}catch(err){

console.error("Gallery save failed:",err)
return false

}

}