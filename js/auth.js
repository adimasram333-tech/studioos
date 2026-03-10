// =============================
// LOGIN
// =============================

export async function login(email,password){

const { data, error } =
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

const { data, error } =
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

const { data } =
await supabase.auth.getSession()

const session = data.session

if(!session){

window.location.href = "index.html"
return

}

}



// =============================
// LOGOUT
// =============================

export async function logout(){

await supabase.auth.signOut()

window.location.href = "index.html"

}