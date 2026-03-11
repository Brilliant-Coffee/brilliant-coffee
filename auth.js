// auth.js - integrat cu Supabase (copy-paste în proiect)
// 1) Înlocuiește valorile de mai jos cu cele din Dashboard → Settings → API
const SUPABASE_URL = "https://https://xbwmpuzetsuoaihyysgr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhid21wdXpldHN1b2FpaHl5c2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDU0ODcsImV4cCI6MjA4ODgyMTQ4N30.bdR3ece0soR5MkjHZ3VoFk-8wEznLgsSEFnKlkdDXu0";

// 2) Creează clientul Supabase
if (typeof supabase === "undefined") {
  console.error("Supabase library not loaded. Add <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"></script> BEFORE auth.js");
}
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------- HELPERS ---------------- */
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
function showToast(msg){
  // simplu fallback UI - poți înlocui cu modal/alert custom
  console.log("[TOAST]", msg);
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position = 'fixed';
  el.style.right = '18px';
  el.style.bottom = '18px';
  el.style.background = 'rgba(0,0,0,0.75)';
  el.style.color = '#fff';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.zIndex = 99999;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 2400);
}

/* ---------------- UI IDS REQUIRED ----------------
Make sure your HTML contains elements with these IDs:
- email (input)
- password (input)
- signupBtn (button)
- loginBtn (button)
- logoutBtn (button)  // optional
- authStatus (span/div) // to show logged in/out
- pointsTxt (span/div) // to show points on page
- displayName (span/div) // to show user name/email
If you use different IDs, update the bindings below.
*/

/* ---------- DOM BINDINGS (safe if elements missing) ---------- */
const emailInput = $('email');
const passwordInput = $('password');
const signupBtn = $('signupBtn');
const loginBtn = $('loginBtn');
const logoutBtn = $('logoutBtn');
const authStatus = $('authStatus');
const pointsTxt = $('pointsTxt');
const displayName = $('displayName');

/* ---------- AUTH FUNCTIONS ---------- */

// Sign up (email + password)
async function signUp(email, password){
  try{
    if(!email || !password) return showToast('Scrie email și parolă');
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });
    if(error) {
      console.error("SignUp error:", error);
      showToast("Eroare sign up: " + error.message);
      return;
    }
    showToast("Cont creat. Verifică emailul (dacă confirmările sunt activate).");
    // If automatic session created, create profile row
    if(data && data.user){
      await createProfileIfNotExists(data.user);
    }
  }catch(err){
    console.error(err);
    showToast("Eroare neașteptată la sign up");
  }
}

// Login (email + password)
async function signIn(email, password){
  try{
    if(!email || !password) return showToast('Scrie email și parolă');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    if(error){
      console.error("SignIn error:", error);
      showToast("Eroare login: " + error.message);
      return;
    }
    showToast("Te-ai logat!");
    // onAuthStateChange listener will handle UI update
  }catch(err){
    console.error(err);
    showToast("Eroare neașteptată la login");
  }
}

// Passwordless / Magic link (optional)
async function sendMagicLink(email){
  try{
    if(!email) return showToast('Scrie email pentru magic link');
    const { data, error } = await supabaseClient.auth.signInWithOtp({ email });
    if(error) { console.error(error); showToast('Eroare: '+error.message); return; }
    showToast('Magic link trimis. Verifică-ți inboxul.');
  } catch(e){
    console.error(e);
    showToast('Eroare la trimitere magic link');
  }
}

// Logout
async function signOut(){
  try{
    const { error } = await supabaseClient.auth.signOut();
    if(error) { console.error(error); showToast('Eroare la logout'); return; }
    showToast('Te-ai delogat');
    renderLoggedOut();
  }catch(e){
    console.error(e);
  }
}

/* ---------- PROFILE / DB helpers ---------- */

// Ensure a profile row exists for the user ID (called after signUp or first sign-in)
async function createProfileIfNotExists(user){
  if(!user || !user.id) return;
  try{
    const { data: existing, error: selErr } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .maybeSingle();
    if(selErr){
      console.error('profile lookup error', selErr);
      // continue, we'll try insert
    }
    if(existing) {
      return existing;
    }
    // insert
    const { data, error } = await supabaseClient
      .from('profiles')
      .insert([{
        id: user.id,
        email: user.email,
        points: 0
      }]);
    if(error) {
      console.error('createProfile error', error);
      return null;
    }
    return data && data[0] ? data[0] : null;
  }catch(err){
    console.error(err);
    return null;
  }
}

// fetch profile
async function fetchProfile(userId){
  if(!userId) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .maybeSingle();
  if(error){ console.error('fetchProfile error', error); return null; }
  return data;
}

/* ---------- AWARD POINTS via RPC or simple insert ---------- */

// Preferred: call RPC 'award_points' if you created it server-side (atomic)
async function awardPointsRPC(userId, delta, reason = 'manual', meta = {}){
  try{
    const { data, error } = await supabaseClient.rpc('award_points', {
      p_user: userId,
      p_delta: delta,
      p_reason: reason,
      p_meta: meta
    });
    if(error){ console.error('award_points rpc error', error); return false; }
    return true;
  }catch(err){
    console.error(err);
    return false;
  }
}

// Fallback: simple insert transaction + update profile (less atomic)
async function awardPointsSimple(userId, delta, reason='manual', meta = {}){
  try{
    // insert transaction
    await supabaseClient.from('transactions').insert([{ user_id: userId, points: delta, reason, meta }]);
    // update profile points
    await supabaseClient.from('profiles').update({ points: supabaseClient.raw('coalesce(points,0) + ?', [delta]) }).eq('id', userId);
    return true;
  }catch(err){
    console.error('awardPointsSimple error', err);
    return false;
  }
}

/* ---------- AUTH STATE LISTENER ---------- */
// updates UI when user signs in/out
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  // console.log("Auth event", event, session);
  if(event === 'SIGNED_IN' || event === 'USER_UPDATED'){
    const user = session.user;
    // ensure profile
    await createProfileIfNotExists(user);
    const profile = await fetchProfile(user.id);
    renderProfile(profile, user);
  } else if(event === 'SIGNED_OUT'){
    renderLoggedOut();
  } else {
    // other events: PASSWORD_RECOVERY, TOKEN_REFRESH etc.
    // you can handle if needed
  }
});

// If there's a session already on page load, fetch profile
(async function initOnLoad(){
  try{
    const { data } = await supabaseClient.auth.getSession();
    if(data && data.session && data.session.user){
      const user = data.session.user;
      await createProfileIfNotExists(user);
      const profile = await fetchProfile(user.id);
      renderProfile(profile, user);
    } else {
      renderLoggedOut();
    }
  }catch(e){
    console.error('initOnLoad error', e);
  }
})();

/* ---------- RENDER / UI ---------- */
function renderProfile(profile, user){
  // profile: object from 'profiles' table
  // user: supabase auth user (optional)
  if(!profile) return renderLoggedOut();
  if(displayName) displayName.textContent = profile.display_name || user?.email || profile.email || 'User';
  if(pointsTxt) pointsTxt.textContent = String(profile.points ?? 0);
  if(authStatus) authStatus.textContent = 'Logged in';
  // optional: hide login form/modal, show profile panels etc.
}

// fallback when no user
function renderLoggedOut(){
  if(displayName) displayName.textContent = 'Guest';
  if(pointsTxt) pointsTxt.textContent = '0';
  if(authStatus) authStatus.textContent = 'Logged out';
}

/* ---------- BIND UI (if elements exist) ---------- */
if(signupBtn) signupBtn.addEventListener('click', ()=> {
  const email = emailInput ? emailInput.value.trim() : '';
  const pass = passwordInput ? passwordInput.value : '';
  signUp(email, pass);
});
if(loginBtn) loginBtn.addEventListener('click', ()=> {
  const email = emailInput ? emailInput.value.trim() : '';
  const pass = passwordInput ? passwordInput.value : '';
  signIn(email, pass);
});
if(logoutBtn) logoutBtn.addEventListener('click', ()=> signOut());

/* ---------- OPTIONAL: migrate demo localStorage into Supabase on first login ----------
If you used the local `points.html` demo and want to migrate local history -> DB,
call migrateLocalDemoIfAny(user.id) after sign-in (see example usage in onAuthStateChange).
Implementation below is simple: it pushes transactions to DB then removes localStorage key.
*/
async function migrateLocalDemoIfAny(userId){
  try{
    const raw = localStorage.getItem('brilliant_points_demo_v1');
    if(!raw) return;
    const parsed = JSON.parse(raw);
    const userLocal = parsed.user;
    if(!userLocal || !userLocal.history || !userLocal.history.length) return;
    // push oldest -> newest
    const txs = userLocal.history.slice().reverse().map(h => ({
      user_id: userId,
      points: h.delta || 0,
      reason: h.reason || 'migrated',
      meta: JSON.stringify(h.meta || {})
    }));
    // insert in batches (Supabase allows multiple rows)
    await supabaseClient.from('transactions').insert(txs);
    // update profile points by summing deltas (server-side is better, but simple approach:)
    const total = txs.reduce((s,t)=> s + (t.points||0), 0);
    if(total !== 0) {
      await supabaseClient.from('profiles').update({ points: supabaseClient.raw('coalesce(points,0) + ?', [total]) }).eq('id', userId);
    }
    localStorage.removeItem('brilliant_points_demo_v1');
    showToast('Demo migrat în contul tău.');
  }catch(err){
    console.error('migrateLocalDemoIfAny error', err);
  }
}

/* ---------------- END of auth.js ----------------
Checklist below shows exactly what must be in your index.html
*/