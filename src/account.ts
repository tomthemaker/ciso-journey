import { createClient } from "@supabase/supabase-js";
import { byId } from "./dom";

export function projectBase(project: string): string {
  const url = new URL(project);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error("Invalid account project URL.");
  return url.href.replace(/\/+$/, "");
}
export function isFragmentAuthError(hash: string): boolean {
  const fragment = new URLSearchParams(hash.slice(1));
  return ["error", "error_code", "error_description"].some(name => fragment.has(name));
}
export interface Account { subject: string; token: string; project: string; key: string; invalidate: () => void; }

/** Session tokens never persist. Only the PKCE verifier survives the redirect in this tab. */
export async function initializeAccount(invalidate: () => void, refreshed: (account: Account) => void): Promise<Account | undefined> {
  const status = byId("accountStatus", "p");
  const signIn = byId("signInBtn", "button");
  const signOut = byId("signOutBtn", "button");
  const project = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const url = new URL(location.href);
  const code = url.searchParams.get("code");
  const fragment = new URLSearchParams(url.hash.slice(1));
  const callbackError = ["error", "error_code", "error_description"].some(name => url.searchParams.has(name) || fragment.has(name));
  for (const name of ["code", "error", "error_code", "error_description"]) url.searchParams.delete(name);
  if (isFragmentAuthError(url.hash)) url.hash = "";
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  if (!project || !key) {
    status.textContent = "Sign-in is not configured. Contact the site operator.";
    return undefined;
  }
  const storageKey = `ciso-journey-auth:${encodeURIComponent(projectBase(project))}`;
  const verifierKey = `${storageKey}-code-verifier`;
  const memory = new Map<string, string>();
  const storage = {
    getItem: (name: string) => {
      if (name !== verifierKey) return memory.get(name) ?? null;
      const raw = sessionStorage.getItem(name);
      if (!raw) return null;
      try {
        const item = JSON.parse(raw) as { value: unknown; expires: unknown };
        if (typeof item.value === "string" && typeof item.expires === "number" && item.expires > Date.now()) return item.value;
      } catch { /* Malformed or abandoned handshake. */ }
      sessionStorage.removeItem(name);
      return null;
    },
    setItem: (name: string, value: string) => { if (name === verifierKey) sessionStorage.setItem(name, JSON.stringify({ value, expires: Date.now() + 10 * 60_000 })); else memory.set(name, value); },
    removeItem: (name: string) => { if (name === verifierKey) sessionStorage.removeItem(name); else memory.delete(name); },
  };
  let refreshFailed = false;
  let failRefresh = () => { refreshFailed = true; };
  const authFetch: typeof fetch = async (input, init) => {
    const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const request = new URL(requestUrl);
    const isRefresh = request.pathname.endsWith("/auth/v1/token") && request.searchParams.get("grant_type") === "refresh_token";
    try {
      const response = await fetch(input, init);
      if (isRefresh && !response.ok) failRefresh();
      return response;
    } catch (error) {
      if (isRefresh) failRefresh();
      throw error;
    }
  };
  const client = createClient(projectBase(project), key, { global: { fetch: authFetch }, auth: { flowType: "pkce", detectSessionInUrl: false, persistSession: true, storageKey, storage } });
  const base = new URL(import.meta.env.BASE_URL, location.origin).href;
  signIn.hidden = false;
  signIn.onclick = async () => {
    signIn.disabled = true;
    status.textContent = "Connecting to GitHub…";
    const { error } = await client.auth.signInWithOAuth({ provider: "github", options: { redirectTo: base } });
    if (error) { status.textContent = "Sign-in failed. Please try again."; signIn.disabled = false; }
  };
  if (callbackError) {
    sessionStorage.removeItem(verifierKey);
    status.textContent = "GitHub sign-in was cancelled or failed. Please try again.";
    return undefined;
  }
  if (!code) { status.textContent = "Sign in with GitHub to access your learning progress."; return undefined; }
  const exchange = await client.auth.exchangeCodeForSession(code);
  sessionStorage.removeItem(verifierKey);
  if (exchange.error || !exchange.data.session) { status.textContent = "Sign-in could not be verified. Please try again."; return undefined; }
  const session = exchange.data.session;
  const verified = await client.auth.getUser(session.access_token);
  if (verified.error || !verified.data.user || verified.data.user.id !== session.user.id) {
    await client.auth.signOut({ scope: "local" });
    status.textContent = "Account verification failed. Please try again.";
    return undefined;
  }
  let active = true;
  let epoch = 0;
  failRefresh = () => { refreshFailed = true; if (active) { active = false; epoch++; invalidate(); location.reload(); } };
  const accountFor = (token: string): Account => {
    const issuedEpoch = epoch;
    return { project: projectBase(project), key, subject: verified.data.user!.id, token, invalidate: () => { if (active && issuedEpoch === epoch) { active = false; epoch++; invalidate(); location.reload(); } } };
  };
  client.auth.onAuthStateChange((event, updated) => {
    if (!active) return;
    if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && updated?.user.id !== verified.data.user!.id)) {
      active = false; epoch++; invalidate(); location.reload(); return;
    }
    if (event === "TOKEN_REFRESHED") {
      const current = ++epoch;
      invalidate();
      status.textContent = "Verifying your account…";
      // Defer calls into Auth until its callback lock is released.
      setTimeout(() => void (async () => {
        if (!updated) { active = false; location.reload(); return; }
        const check = await client.auth.getUser(updated.access_token);
        const latest = await client.auth.getSession();
        if (!active || current !== epoch) return;
        if (check.error || check.data.user?.id !== verified.data.user!.id || latest.error || latest.data.session?.access_token !== updated.access_token) {
          active = false; location.reload(); return;
        }
        status.textContent = "Signed in with GitHub.";
        refreshed(accountFor(updated.access_token));
      })().catch(() => { if (active && current === epoch) { active = false; location.reload(); } }), 0);
    }
  });
  const latest = await client.auth.getSession();
  if (!active || refreshFailed || latest.error || latest.data.session?.access_token !== session.access_token) {
    active = false;
    invalidate();
    status.textContent = "Session changed. Please sign in again.";
    return undefined;
  }
  signIn.hidden = true;
  signOut.hidden = false;
  signOut.onclick = () => {
    active = false; epoch++;
    invalidate();
    void client.auth.signOut({ scope: "local" }).finally(() => location.reload());
  };
  status.textContent = "Signed in with GitHub.";
  return accountFor(session.access_token);
}
