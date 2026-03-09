import { supabase } from "./supabase.js";


/* ===============================
SIGNUP
================================ */

export async function signup(email, password) {

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Account created successfully. Please login.");
    window.location.href = "index.html";
}



/* ===============================
LOGIN
================================ */

export async function login(email, password) {

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert(error.message);
        return;
    }

    window.location.href = "dashboard.html";
}



/* ===============================
GET CURRENT USER
================================ */

export async function getCurrentUser() {

    const { data } = await supabase.auth.getUser();

    return data.user;
}



/* ===============================
PROTECT PAGE
================================ */

export async function protectPage() {

    const user = await getCurrentUser();

    if (!user) {
        window.location.href = "index.html";
    }

}



/* ===============================
LOGOUT
================================ */

export async function logout() {

    await supabase.auth.signOut();

    window.location.href = "index.html";

}