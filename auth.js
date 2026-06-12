// ============================================================
//  NAXSORA AI — auth.js
//  Supabase + Google OAuth Authentication
// ============================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ── Supabase Config ──────────────────────────────────────────
const SUPABASE_URL = "https://yciefqskumwsnbzhlzqt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaWVmcXNrdW13c25iemhsenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzMxODcsImV4cCI6MjA5NjE0OTE4N30.4HQQ12eIgzfT3ozWOoHygVZyZPlGbVEaXpOKCPAwqhw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Get current session ──────────────────────────────────────
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Get current user ─────────────────────────────────────────
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// ── Google OAuth Login ────────────────────────────────────────
export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/index.html",
    },
  });
  if (error) throw error;
}

// ── Email + Password Sign Up ──────────────────────────────────
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, avatar_url: "" },
    },
  });
  if (error) throw error;
  return data;
}

// ── Email + Password Sign In ──────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── Sign Out ──────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = "login.html";
}

// ── Password Reset ────────────────────────────────────────────
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password.html",
  });
  if (error) throw error;
}

// ── Auth State Change listener ────────────────────────────────
export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

// ── Guard: redirect to login if not authenticated ─────────────
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session.user;
}

// ── Guard: redirect to app if already authenticated ───────────
export async function redirectIfAuth() {
  const session = await getSession();
  if (session) {
    window.location.href = "index.html";
  }
}
