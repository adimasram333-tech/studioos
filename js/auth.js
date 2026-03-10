// =============================
// LOGIN
// =============================

export async function login(email,password){

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
// PROTECT PAGE (SESSION SAFE)
// =============================

export async function protectPage(){

// check immediate session
const { data:{ session } } =
await supabase.auth.getSession()

if(session){
return
}

// wait for auth state initialization
await new Promise((resolve)=>{

const { data: listener } =
supabase.auth.onAuthStateChange((event, session)=>{

// INITIAL_SESSION fires when Supabase restores session
if(event === "INITIAL_SESSION"){

listener.subscription.unsubscribe()

resolve()

}

})

})

// check session again after initialization
const { data:{ session:finalSession } } =
await supabase.auth.getSession()

if(finalSession){
return
}

// if still no session redirect
window.location.replace("index.html")

}



// =============================
// LOGOUT
// =============================

export async function logout(){

await supabase.auth.signOut()

window.location.replace("index.html")

}