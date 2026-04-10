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
// LOGIN
// =============================

export async function login(email,password){

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

window.location.replace("dashboard.html")

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
redirectTo: `${window.location.origin}${window.location.pathname}`
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

window.location.replace("index.html")

}



// =============================
// LOGOUT
// =============================

export async function logout(){

const supabase = await getSupabase()

await supabase.auth.signOut()

window.location.replace("index.html")

}