import { createClient } from "@supabase/supabase-js";
import { byId } from "./dom";

/** Full API base, including port and path, scopes sessions and learner caches. */
export function projectBase(project: string): string {
  const url = new URL(project);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error("Invalid account project URL.");
  return url.href.replace(/\/+$/, "");
}
export function authStorageKey(project: string): string {
  return `ciso-journey-auth:${encodeURIComponent(projectBase(project))}`;
}

/** The project URL and verified subject scope browser caches. No token is learner data. */
export function accountProfile(project: string, subject: string): string {
  return `account:${JSON.stringify([projectBase(project), subject])}`;
}

export async function initializeAccount(invalidate: () => void): Promise<string | undefined> {
  const status = byId("accountStatus", "p");
  const signIn = byId("signInBtn", "button");
  const signOut = byId("signOutBtn", "button");
  const project = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const url = new URL(location.href);
  const code = url.searchParams.get("code");
  const callbackError = url.searchParams.get("error") || url.searchParams.get("error_description");
  // Remove authorization material before any router or network call.
  for (const name of ["code", "error", "error_code", "error_description"]) url.searchParams.delete(name);
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  if (!project || !key) {
    status.textContent = "Local profile on this device. GitHub sign-in is not configured. No cloud sync is active.";
    if (code || callbackError) throw new Error("Account callback received but sign-in is not configured.");
    return undefined;
  }
  const client = createClient(projectBase(project), key, { auth: { flowType: "pkce", detectSessionInUrl: false, storageKey: authStorageKey(project) } });
  const base = new URL(import.meta.env.BASE_URL, location.origin).href;
  signIn.onclick = async () => {
    signIn.disabled = true;
    status.textContent = "Connecting to GitHub…";
    const { error } = await client.auth.signInWithOAuth({ provider: "github", options: { redirectTo: base } });
    if (error) { status.textContent = `Sign-in failed: ${error.message}`; signIn.disabled = false; }
  };
  if (callbackError || code) {
    if (callbackError) {
      await client.auth.signOut({ scope: "local" });
      throw new Error("GitHub sign-in was cancelled or failed. Start sign-in again.");
    }
    const { error } = await client.auth.exchangeCodeForSession(code!);
    if (error) {
      await client.auth.signOut({ scope: "local" });
      throw new Error("Sign-in callback could not be verified. Start sign-in again.");
    }
  }
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  let subject: string | undefined;
  if (sessionData.session) {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error("Could not verify your account. Check your connection and reload.");
    subject = data.user.id;
  }
  // Session events are only invalidation signals; a reload verifies identity with Auth again.
  let invalidated = false;
  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
      (session?.user.id !== subject || session?.access_token !== sessionData.session?.access_token))) {
      invalidated = true;
      invalidate();
      location.reload();
    }
  });
  const latest = await client.auth.getSession();
  if (invalidated || latest.error || latest.data.session?.access_token !== sessionData.session?.access_token) {
    invalidate();
    throw new Error("Account changed while loading. Reload to retry.");
  }
  if (subject) {
    status.textContent = "Account profile on this device. No cloud sync is active. Your local profile stays separate.";
    signOut.hidden = false;
    signOut.onclick = async () => {
      invalidate();
      signOut.disabled = true;
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) { status.textContent = `Sign-out failed: ${error.message}. Reload to retry.`; return; }
      location.reload();
    };
    return accountProfile(project, subject);
  }
  status.textContent = "Local profile on this device. Sign-in creates a separate profile; nothing is uploaded. No cloud sync is active.";
  signIn.hidden = false;
  return undefined;
}
