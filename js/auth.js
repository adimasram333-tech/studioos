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

window.location.href = "dashboard.html"

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

// wait for session
const { data } =
await supabase.auth.getSession()

if(data.session){
return
}

// if session not ready yet listen for auth change
supabase.auth.onAuthStateChange((event, session) => {

if(!session){

window.location.href = "index.html"

}

})

}



// =============================
// LOGOUT
// =============================

export async function logout(){

await supabase.auth.signOut()

window.location.href = "index.html"

}