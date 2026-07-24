// =============================
// GET SUPABASE CLIENT SAFELY
// =============================

async function getSupabase(){

if(window.getSupabase){
return await window.getSupabase()
}

if(window.supabaseClient){
return window.supabaseClient
}

throw new Error("Supabase client not initialized")

}



// =============================
// STUDIOOS AUTH URL HELPERS
// =============================

function getStudioOSPublicBaseUrl(){

const configuredUrl = String(window.STUDIOOS_PUBLIC_BASE_URL || "").trim()

if(configuredUrl){
return configuredUrl.replace(/\/+$/,"")
}

return "https://app.chitrabookai.in"

}


export function getSafeAuthNextUrl(nextUrl){

const fallbackUrl = "dashboard.html"
const rawNextUrl = String(nextUrl || "").trim()

if(!rawNextUrl){
return fallbackUrl
}

let decodedNextUrl = rawNextUrl

try{
decodedNextUrl = decodeURIComponent(rawNextUrl)
}catch(err){
decodedNextUrl = rawNextUrl
}

const cleanNextUrl = decodedNextUrl.replace(/^\.\/+/, "")

if(
cleanNextUrl.includes("://") ||
cleanNextUrl.startsWith("/") ||
cleanNextUrl.startsWith("\\") ||
cleanNextUrl.includes("..")
){
return fallbackUrl
}

if(cleanNextUrl === "index.html" || cleanNextUrl === "login.html"){
return fallbackUrl
}

if(!/^[A-Za-z0-9_-]+\.html(?:\?[A-Za-z0-9._~=&%+-]*)?$/.test(cleanNextUrl)){
return fallbackUrl
}

return cleanNextUrl

}


function getCurrentProtectedPageNextUrl(){

const pageName = window.location.pathname.split("/").pop() || "dashboard.html"
const queryString = window.location.search || ""

return getSafeAuthNextUrl(pageName + queryString)

}


function getStudioOSGoogleRedirectUrl(){

// Production-safe OAuth callback:
// Never derive this from window.location.origin/pathname because Android
// WebView / external browser flows can produce capacitor://, file://,
// localhost, or an old GitHub Pages origin. Supabase + Google must always
// return to the real published StudioOS URL.
return getStudioOSPublicBaseUrl() + "/dashboard.html"

}



// =============================
// LOGIN
// =============================

export async function login(email,password,nextUrl){

const supabase = await getSupabase()

const { error } =
await supabase.auth.signInWithPassword({

email: email,
password: password

})

if(error){

alert(error.message)
return

}

window.location.replace(getSafeAuthNextUrl(nextUrl))

}



// =============================
// SIGNUP
// =============================

export async function signup(email,password){

const supabase = await getSupabase()

const { error } =
await supabase.auth.signUp({

email: email,
password: password

})

if(error){

alert(error.message)
return

}

alert("Account created. Please login.")

}



// =============================
// GOOGLE LOGIN
// =============================

export async function googleLogin(){

const supabase = await getSupabase()

const { error } =
await supabase.auth.signInWithOAuth({

provider: "google",
options: {
redirectTo: getStudioOSGoogleRedirectUrl(),
queryParams: {
prompt: "select_account"
}
}

})

if(error){

alert(error.message)
return

}

}



// =============================
// PROTECT PAGE (SESSION SAFE)
// =============================

export async function protectPage(){

const supabase = await getSupabase()

// immediate session check
const { data:{ session } } =
await supabase.auth.getSession()

if(session){
return
}

// wait for auth state initialization
await new Promise((resolve)=>{

const { data: listener } =
supabase.auth.onAuthStateChange((event)=>{

if(event === "INITIAL_SESSION"){

listener.subscription.unsubscribe()
resolve()

}

})

})

// check again
const { data:{ session:finalSession } } =
await supabase.auth.getSession()

if(finalSession){
return
}

window.location.replace("login.html?next=" + encodeURIComponent(getCurrentProtectedPageNextUrl()))

}



// =============================
// LOGOUT
// =============================

export async function logout(){

const supabase = await getSupabase()

await supabase.auth.signOut()

window.location.replace("login.html")

}

