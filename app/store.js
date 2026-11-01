// Storage: per-user private docs in the artifact db (signed-in claude.ai viewers), or localStorage when no db is available.
const Store = (() => {
  const CHUNK_BYTES = 180000;
  let db = null, user = null, uid = null, mode = 'local';
  let sb = null, sbUser = null;
  const CFG = window.WSA_CONFIG || {};
  const queue = new Map();
  let flushing = false, lastError = null, offline = false, reconnectMerge = new Set(), retryTimer = null;
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
      if (db && uid) { mode = 'cloud'; emit(); return { mode }; }
    }
    if (CFG.supabaseUrl && CFG.supabaseKey) {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js');
        sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
        const { data } = await sb.auth.getSession();
        sbUser = data.session?.user || null;
        if (/[?&]code=|[?&]error=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
        mode = 'account';
        emit();
        return { mode, needsLogin: !sbUser };
      } catch { sb = null; }
    }
    mode = 'local';
    emit();
    return { mode };
  }

  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    sbUser = data.user;
    emit();
  }
  async function signUp(email, password, name) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
    if (!data.session) return { confirm: true };
    sbUser = data.user;
    return { confirm: false };
  }
  async function googleEnabled() {
    try {
      const r = await fetch(CFG.supabaseUrl + '/auth/v1/settings', { headers: { apikey: CFG.supabaseKey } });
      return !!(await r.json()).external?.google;
    } catch { return false; }
  }
  async function signInGoogle() {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) throw error;
  }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw error;
  }
  async function signOut() { if (sb) await sb.auth.signOut(); location.hash = ''; location.reload(); }

  async function isAdmin() {
    if (mode !== 'account' || !sbUser) return false;
    try { const { data, error } = await sb.rpc('is_app_admin'); return !error && data === true; } catch { return false; }
  }
  async function adminStudents() {
    const { data, error } = await sb.rpc('admin_students');
    if (error) throw error;
    return data;
  }
  async function adminDocs(target) {
    const { data, error } = await sb.rpc('admin_student_docs', { target });
    if (error) throw error;
    const out = {}; for (const r of data) out[r.key] = r.value; return out;
  }

  async function viewerName() {
    if (sbUser) { const m = sbUser.user_metadata || {}; return m.display_name || m.full_name || m.name || sbUser.email || ''; }
    try { return user ? (await user.name()) || '' : ''; } catch { return ''; }
  }

  const col = () => db.collection('data/users/' + uid);

  async function loadAll() {
    const docs = {};
    if (mode === 'cloud') {
      const snap = await col().limit(1000).get();
      for (const d of snap.docs) if (d.exists) docs[d.id] = d.data();
    } else if (mode === 'account') {
      const pending = lsGet(pendKey()) || {};
      let remote = null;
      try {
        const { data, error } = await sb.from('user_docs').select('key,value').eq('user_id', sbUser.id);
        if (error) throw error;
        remote = {};
        for (const r of data) remote[r.key] = r.value;
        offline = false;
      } catch { offline = true; }
      const base = remote || lsGet(cacheKey()) || {};
      Object.assign(docs, base);
      for (const [k, v] of Object.entries(pending)) {
        if (v === null) delete docs[k];
        else docs[k] = remote && k in remote ? mergeDoc(k, v, remote[k]) : v;
      }
      lsSet(cacheKey(), docs);
      if (remote) for (const k of Object.keys(pending)) queue.set(k, k in docs ? docs[k] : null);
      if (!remote && !Object.keys(base).length && !Object.keys(pending).length) throw new Error('offline and no saved copy');
      emit();
      if (queue.size) flush();
    } else {
      for (const k of lsKeys()) { if (k !== 'theme') docs[k] = lsGet(k); }
    }
    return docs;
  }

  const pendKey = () => `acct:${sbUser.id}:pending`;
  const cacheKey = () => `acct:${sbUser.id}:cache`;
  function persistLocal(key, value) {
    const pend = lsGet(pendKey()) || {}; pend[key] = value; lsSet(pendKey(), pend);
    const cache = lsGet(cacheKey()) || {}; if (value === null) delete cache[key]; else cache[key] = value; lsSet(cacheKey(), cache);
  }
  function clearPending(key, value) {
    const pend = lsGet(pendKey()) || {};
    if (key in pend && JSON.stringify(pend[key]) === JSON.stringify(value)) { delete pend[key]; lsSet(pendKey(), pend); }
  }

  function put(key, value) {
    const v = value === null ? null : JSON.parse(JSON.stringify(value));
    queue.set(key, v);
    if (mode === 'account' && sbUser) { persistLocal(key, v); if (offline) reconnectMerge.add(key); }
    emit();
    flush();
  }

  // Combine a local copy with the server copy after offline use on one device and changes on another.
  function mergeDoc(key, local, remote) {
    if (!remote || local === null) return local;
    if (key.startsWith('lg-')) {
      const seen = new Map();
      for (const e of [...(remote.e || []), ...(local.e || [])]) seen.set(e[0] + '|' + e[1], e);
      return { e: [...seen.values()].sort((a, b) => a[0] - b[0]) };
    }
    if (key.startsWith('st-')) {
      const m = { ...(remote.m || {}) };
      for (const [id, v] of Object.entries(local.m || {})) if (!m[id] || (v[6] || 0) >= (m[id][6] || 0)) m[id] = v;
      return { m };
    }
    if (key.startsWith('nt-')) return { m: { ...(remote.m || {}), ...(local.m || {}) } };
    if (key === 'profile') {
      const out = { ...remote, ...local };
      out.xp = Math.max(local.xp || 0, remote.xp || 0);
      out.best = Math.max(local.best || 0, remote.best || 0);
      out.mocks = Math.max(local.mocks || 0, remote.mocks || 0);
      if ((remote.lastDay || '') > (local.lastDay || '')) { out.lastDay = remote.lastDay; out.streak = remote.streak; }
      out.daily = { ...(remote.daily || {}) };
      for (const [d, v] of Object.entries(local.daily || {})) { const r = out.daily[d] || {}; out.daily[d] = { xp: Math.max(v.xp || 0, r.xp || 0), n: Math.max(v.n || 0, r.n || 0), ms: Math.max(v.ms || 0, r.ms || 0) }; }
      out.ach = { ...(remote.ach || {}), ...(local.ach || {}) };
      const ids = new Set((local.decks || []).map(d => d.id));
      out.decks = [...(local.decks || []), ...(remote.decks || []).filter(d => !ids.has(d.id))];
      return out;
    }
    return local;
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { if (queue.size) flush(); }, 30000);
  }
  addEventListener('online', () => { if (queue.size) flush(); });

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
            let v = value;
            if (v !== null && reconnectMerge.has(key)) {
              const r = await sb.from('user_docs').select('value').eq('user_id', sbUser.id).eq('key', key).maybeSingle();
              if (r.error) throw { code: 'unavailable', message: r.error.message };
              if (r.data) v = mergeDoc(key, v, r.data.value);
            }
            const q = v === null
              ? sb.from('user_docs').delete().eq('user_id', sbUser.id).eq('key', key)
              : sb.from('user_docs').upsert({ user_id: sbUser.id, key, value: v, updated_at: new Date().toISOString() });
            const { error } = await q;
            if (error) throw { code: /fetch|network|load failed/i.test(error.message) || !navigator.onLine ? 'unavailable' : 'error', message: error.message };
            reconnectMerge.delete(key);
            clearPending(key, value);
            offline = false;
          } else {
            if (value === null) lsDel(key); else lsSet(key, value);
          }
          lastError = null;
        } catch (e) {
          lastError = e && (e.code || e.message) || 'error';
          if (e && e.code === 'unavailable' && mode === 'account') {
            if (!queue.has(key)) queue.set(key, value);
            offline = true; lastError = null;
            for (const k of queue.keys()) reconnectMerge.add(k);
            scheduleRetry();
            break;
          }
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

  const status = () => ({ mode, pending: queue.size + (flushing ? 1 : 0), error: lastError, offline });
  function emit() { for (const f of listeners) f(status()); }
  const onStatus = f => { listeners.add(f); f(status()); };

  return { init, loadAll, put, chunkCards, status, onStatus, viewerName, signIn, signUp, signOut, resetPassword, googleEnabled, signInGoogle, isAdmin, adminStudents, adminDocs, get email() { return sbUser?.email || ''; }, get client() { return sb; }, get userId() { return sbUser?.id || null; }, get mode() { return mode; }, lsGet, lsSet };
})();
