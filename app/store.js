// Storage: per-user private docs in the artifact db (signed-in claude.ai viewers), or localStorage when no db is available.
const Store = (() => {
  const CHUNK_BYTES = 180000;
  let db = null, user = null, uid = null, mode = 'local';
  let sb = null, sbUser = null;
  const CFG = window.WSA_CONFIG || {};
  const queue = new Map();
  let flushing = false, lastError = null;
  const listeners = new Set();

  const lsGet = k => { try { const v = localStorage.getItem('wsareps:' + k); return v ? JSON.parse(v) : null; } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem('wsareps:' + k, JSON.stringify(v)); } catch {} };
  const lsDel = k => { try { localStorage.removeItem('wsareps:' + k); } catch {} };
  const lsKeys = () => { try { return Object.keys(localStorage).filter(k => k.startsWith('wsareps:')).map(k => k.slice(8)); } catch { return []; } };

  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.append(s); });

  // Returns {mode, needsLogin}. claude.ai viewer -> artifact db; configured website -> Supabase accounts; otherwise browser only.
  async function init() {
    const c = window.claude;
    if (c && typeof c.use === 'function') {
      try {
        [db, user] = await Promise.all([c.use('db'), c.use('user')]);
        if (db && user) uid = await user.id();
      } catch { db = null; }
      if (db && uid) { mode = 'cloud'; return { mode }; }
    }
    if (CFG.supabaseUrl && CFG.supabaseKey) {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js');
        sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        const { data } = await sb.auth.getSession();
        sbUser = data.session?.user || null;
        mode = 'account';
        return { mode, needsLogin: !sbUser };
      } catch { sb = null; }
    }
    mode = 'local';
    return { mode };
  }

  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    sbUser = data.user;
  }
  async function signUp(email, password, name) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
    if (!data.session) return { confirm: true };
    sbUser = data.user;
    return { confirm: false };
  }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw error;
  }
  async function signOut() { if (sb) await sb.auth.signOut(); location.hash = ''; location.reload(); }

  async function viewerName() {
    if (sbUser) return sbUser.user_metadata?.display_name || sbUser.email || '';
    try { return user ? (await user.name()) || '' : ''; } catch { return ''; }
  }

  const col = () => db.collection('data/users/' + uid);

  async function loadAll() {
    const docs = {};
    if (mode === 'cloud') {
      const snap = await col().limit(1000).get();
      for (const d of snap.docs) if (d.exists) docs[d.id] = d.data();
    } else if (mode === 'account') {
      const { data, error } = await sb.from('user_docs').select('key,value').eq('user_id', sbUser.id);
      if (error) throw error;
      for (const r of data) docs[r.key] = r.value;
    } else {
      for (const k of lsKeys()) { if (k !== 'theme') docs[k] = lsGet(k); }
    }
    return docs;
  }

  function put(key, value) {
    queue.set(key, value === null ? null : JSON.parse(JSON.stringify(value)));
    emit();
    flush();
  }

  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      while (queue.size) {
        const [key, value] = queue.entries().next().value;
        queue.delete(key);
        try {
          if (mode === 'cloud') {
            const ref = col().doc(key);
            if (value === null) await ref.delete(); else await ref.set(value);
          } else if (mode === 'account') {
            const q = value === null
              ? sb.from('user_docs').delete().eq('user_id', sbUser.id).eq('key', key)
              : sb.from('user_docs').upsert({ user_id: sbUser.id, key, value, updated_at: new Date().toISOString() });
            const { error } = await q;
            if (error) throw { code: /fetch|network/i.test(error.message) ? 'unavailable' : 'error', message: error.message };
          } else {
            if (value === null) lsDel(key); else lsSet(key, value);
          }
          lastError = null;
        } catch (e) {
          lastError = e && (e.code || e.message) || 'error';
          if (e && e.code === 'unavailable') { queue.set(key, value); await new Promise(r => setTimeout(r, 800 + Math.random() * 1200)); }
          else if (e && e.code === 'quota_exceeded') { App.toast('Storage is full. Delete a deck in Prefs to free space.'); }
        }
      }
    } finally { flushing = false; emit(); }
  }

  function chunkCards(cards) {
    const chunks = [[]];
    let size = 0;
    for (const c of cards) {
      const s = JSON.stringify(c).length + 2;
      if (size + s > CHUNK_BYTES && chunks[chunks.length - 1].length) { chunks.push([]); size = 0; }
      chunks[chunks.length - 1].push(c);
      size += s;
    }
    return chunks;
  }

  const status = () => ({ mode, pending: queue.size + (flushing ? 1 : 0), error: lastError });
  function emit() { for (const f of listeners) f(status()); }
  const onStatus = f => { listeners.add(f); f(status()); };

  return { init, loadAll, put, chunkCards, status, onStatus, viewerName, signIn, signUp, signOut, resetPassword, get email() { return sbUser?.email || ''; }, get mode() { return mode; }, lsGet, lsSet };
})();
