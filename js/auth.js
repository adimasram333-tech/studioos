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

// check current session
const { data:{ session } } =
await supabase.auth.getSession()

if(session){
return
}

// wait briefly for session restore
await new Promise(resolve => setTimeout(resolve,200))

const { data:{ session:retrySession } } =
await supabase.auth.getSession()

if(retrySession){
return
}

// final redirect
window.location.replace("index.html")

}



// =============================
// LOGOUT
// =============================

export async function logout(){

await supabase.auth.signOut()

window.location.replace("index.html")

}