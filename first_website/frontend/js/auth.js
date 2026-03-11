/**
 * auth.js — Supabase authentication helpers
 *
 * This module exports an `auth` object that wraps Supabase auth calls.
 * It reads SUPABASE_URL and SUPABASE_ANON_KEY from `window.TUBEMIND_CONFIG`
 * which is injected by the backend (or set via a <script> tag in index.html
 * for static hosting).
 */

// Supabase client is loaded via the CDN script tag in index.html
// (https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js)

const auth = (() => {
  let _supabase = null;

  function getClient() {
    if (_supabase) return _supabase;
    const { supabaseUrl, supabaseAnonKey } = window.TUBEMIND_CONFIG || {};
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[TubeMind] Supabase config not found. Auth disabled.');
      return null;
    }
    _supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    return _supabase;
  }

  /**
   * Register a new user with email + password.
   * @returns {{ user, error }}
   */
  async function signUp(email, password) {
    const client = getClient();
    if (!client) return { user: null, error: { message: 'Auth not configured.' } };
    const { data, error } = await client.auth.signUp({ email, password });
    return { user: data?.user ?? null, error };
  }

  /**
   * Sign in with email + password.
   * @returns {{ user, session, error }}
   */
  async function signIn(email, password) {
    const client = getClient();
    if (!client) return { user: null, session: null, error: { message: 'Auth not configured.' } };
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return { user: data?.user ?? null, session: data?.session ?? null, error };
  }

  /**
   * Sign out the current user.
   */
  async function signOut() {
    const client = getClient();
    if (!client) return;
    await client.auth.signOut();
  }

  /**
   * Get the current session (null if not logged in).
   */
  async function getSession() {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session ?? null;
  }

  /**
   * Subscribe to auth state changes.
   * @param {Function} callback  Called with (event, session)
   */
  function onAuthStateChange(callback) {
    const client = getClient();
    if (!client) return;
    client.auth.onAuthStateChange(callback);
  }

  return { signUp, signIn, signOut, getSession, onAuthStateChange };
})();
