// ================================
// SUPABASE CONFIG
// ================================

const SUPABASE_URL =
"https://gnnaaagvlrmdveqxicob.supabase.co"

const SUPABASE_ANON_KEY =
"sb_publishable_TnjoiedXWPbSjjqh2tmfsQ_kpiIMaND"



// ================================
// CREATE SUPABASE CLIENT (STABLE)
// ================================

let supabaseClient = null

function initializeSupabase(){

// already initialized
if(window.supabaseClient){
return window.supabaseClient
}

// CDN check
if(!window.supabase || typeof window.supabase.createClient !== "function"){

console.error("Supabase CDN not loaded yet")

return null
}

// create client
supabaseClient =
window.supabase.createClient(
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

// expose globally
window.supabaseClient = supabaseClient

return supabaseClient

}



// ================================
// SAFE SUPABASE ACCESS
// ================================

window.getSupabase = function(){

if(window.supabaseClient){
return window.supabaseClient
}

return initializeSupabase()

}



// ================================
// SAFE CURRENT USER
// ================================

window.getCurrentUser = async function(){

const supabase = window.getSupabase()

if(!supabase) return null

try{

const { data } = await supabase.auth.getUser()

return data?.user || null

}catch(err){

console.error("User fetch failed:",err)
return null

}

}



// ================================
// INITIALIZE IMMEDIATELY
// ================================

document.addEventListener("DOMContentLoaded",()=>{

initializeSupabase()

})



// ================================
// SAVE QUOTATION
// ================================

window.saveQuotation = async function(data){

const supabase = window.getSupabase()
if(!supabase) return null

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

const supabase = window.getSupabase()
if(!supabase) return null

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

const supabase = window.getSupabase()
if(!supabase) return null

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

const supabase = window.getSupabase()
if(!supabase) return []

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
// PHOTOGRAPHER SETTINGS
// ================================

window.getPhotographerSettings = async function(userId){

const supabase = window.getSupabase()
if(!supabase) return null

try{

const { data, error } =
await supabase
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

const supabase = window.getSupabase()
if(!supabase) return false

try{

const { error } =
await supabase
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