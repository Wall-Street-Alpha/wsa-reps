// Storage: per-user private docs in the artifact db (signed-in claude.ai viewers), or localStorage when no db is available.
const Store = (() => {
  const CHUNK_BYTES = 180000;
  let db = null, user = null, uid = null, mode = 'local';
  let sb = null, sbUser = null, accessToken = null;
  const CFG = window.WSA_CONFIG || {};
  const queue = new Map();
  let flushing = false, lastError = null, offline = false, reconnectMerge = new Set(), retryTimer = null;
  const listeners = new Set();

  const lsGet = k => { try { const v = localStorage.getItem('wsareps:' + k); return v ? JSON.parse(v) : null; } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem('wsareps:' + k, JSON.stringify(v)); } catch {} };
  const lsDel = k => { try { localStorage.removeItem('wsareps:' + k); } catch {} };
  const lsKeys = () => { try { return Object.keys(localStorage).filter(k => k.startsWith('wsareps:')).map(k => k.slice(8)); } catch { return []; } };

  // Key-value store on IndexedDB (no 5 MB cap), falling back to localStorage.
  const KV = (() => {
    let dbp = null;
    const open = () => dbp ||= new Promise((res, rej) => {
      try { const r = indexedDB.open('wsareps', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    });
    const run = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('kv', mode); const req = fn(t.objectStore('kv')); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
    return {
      async set(k, v) { try { await run('readwrite', st => st.put(v, k)); } catch { lsSet('kv:' + k, v); } },
      async del(k) { try { await run('readwrite', st => st.delete(k)); } catch {} lsDel('kv:' + k); },
      async prefix(p) {
        const out = {};
        try {
          const db = await open();
          await new Promise((res, rej) => { const t = db.transaction('kv', 'readonly'); const req = t.objectStore('kv').openCursor(IDBKeyRange.bound(p, p + '\uffff')); req.onsuccess = () => { const c = req.result; if (c) { out[c.key.slice(p.length)] = c.value; c.continue(); } else res(); }; req.onerror = () => rej(req.error); });
        } catch { for (const k of lsKeys()) if (k.startsWith('kv:' + p)) out[k.slice(3 + p.length)] = lsGet(k); }
        return out;
      },
    };
  })();
  const pendingMem = new Map();

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
        accessToken = data.session?.access_token || null;
        sb.auth.onAuthStateChange((_e, sess) => { accessToken = sess?.access_token || null; });
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
    sbUser = data.user; accessToken = data.session?.access_token || accessToken;
    emit();
  }
  async function signUp(email, password, name) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
    if (!data.session) return { confirm: true };
    sbUser = data.user; accessToken = data.session.access_token;
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
  async function signOut() { try { await Telemetry.flush(); Telemetry.clear(); } catch {} if (sb) await sb.auth.signOut(); location.hash = ''; location.reload(); }

  async function loadSharedTags() {
    if (mode !== 'account' || !sbUser) return {};
    const key = `acct:${sbUser.id}:sharedTags`;
    try {
      const { data, error } = await sb.from('question_tags').select('qhash,banks');
      if (error) throw error;
      const out = {}; for (const r of data) out[r.qhash] = r.banks || [];
      lsSet(key, out); return out;
    } catch { return lsGet(key) || {}; }
  }
  async function setSharedTags(qh, question, banks) {
    const { error } = await sb.from('question_tags').upsert({ qhash: qh, question: question.slice(0, 500), banks, updated_by: sbUser.id, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  // Fire-and-forget send that the browser completes even while the page is closing.
  function beaconEvents(rows) {
    if (!accessToken || !rows.length) return false;
    try {
      fetch(CFG.supabaseUrl + '/rest/v1/app_events', { method: 'POST', keepalive: true, headers: { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
      return true;
    } catch { return false; }
  }
  async function insertEvents(rows) {
    const { error } = await sb.from('app_events').insert(rows);
    if (error) throw error;
  }
  async function reportError(row) {
    if (!sb) return;
    try { await sb.from('app_errors').insert(sbUser ? { ...row, user_id: sbUser.id } : row); } catch {}
  }
  const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw error; return data; };
  const adminActivity = days => rpc('admin_activity', { days });
  const adminEventCounts = days => rpc('admin_event_counts', { days });
  const adminErrors = lim => rpc('admin_recent_errors', { lim });

  const inviteCode = () => sbUser ? sbUser.id.replace(/-/g, '').slice(0, 10) : '';
  async function recordReferral(code, name) {
    const { error } = await sb.from('referrals').insert({ inviter_code: code, invitee_name: (name || '').slice(0, 80) });
    if (error && !/duplicate|violates/i.test(error.message)) throw error;
  }
  async function myReferrals() {
    const { data, error } = await sb.from('referrals').select('invitee_name,created_at').eq('inviter_code', inviteCode()).order('created_at', { ascending: false });
    if (error) throw error; return data;
  }
  async function createChallenge(row) {
    const { error } = await sb.from('challenges').insert(row);
    if (error) throw error;
  }
  async function getChallenge(id) {
    const [c, r] = await Promise.all([
      sb.from('challenges').select('id,creator,creator_name,title,questions,created_at').eq('id', id).maybeSingle(),
      sb.from('challenge_results').select('user_id,name,score,total,seconds,created_at').eq('challenge_id', id).order('score', { ascending: false }).order('seconds', { ascending: true }),
    ]);
    if (c.error) throw c.error; if (r.error) throw r.error;
    return { challenge: c.data, results: r.data };
  }
  async function postResult(row) {
    const { error } = await sb.from('challenge_results').upsert({ ...row, user_id: sbUser.id });
    if (error) throw error;
  }
  async function myChallenges() {
    const [mine, taken] = await Promise.all([
      sb.from('challenges').select('id,title,creator_name,created_at,questions').eq('creator', sbUser.id).order('created_at', { ascending: false }).limit(20),
      sb.from('challenge_results').select('challenge_id').eq('user_id', sbUser.id).limit(50),
    ]);
    if (mine.error) throw mine.error;
    const ids = (taken.data || []).map(r => r.challenge_id).filter(id => !(mine.data || []).some(c => c.id === id));
    let others = [];
    if (ids.length) { const o = await sb.from('challenges').select('id,title,creator_name,created_at,questions').in('id', ids); others = o.data || []; }
    return { mine: mine.data || [], others };
  }

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
      await migrateOldCache();
      const pending = await KV.prefix(`${sbUser.id}:p:`);
      for (const [k, v] of Object.entries(pending)) pendingMem.set(k, JSON.stringify(v));
      let remote = null;
      try {
        const { data, error } = await sb.from('user_docs').select('key,value').eq('user_id', sbUser.id);
        if (error) throw error;
        remote = {};
        for (const r of data) remote[r.key] = r.value;
        offline = false;
      } catch { offline = true; }
      const base = remote || await KV.prefix(`${sbUser.id}:c:`);
      Object.assign(docs, base);
      for (const [k, v] of Object.entries(pending)) {
        if (v === null) delete docs[k];
        else docs[k] = remote && k in remote ? mergeDoc(k, v, remote[k]) : v;
      }
      if (remote) {
        const cached = await KV.prefix(`${sbUser.id}:c:`);
        for (const k of Object.keys(cached)) if (!(k in docs)) KV.del(`${sbUser.id}:c:${k}`);
        for (const [k, v] of Object.entries(docs)) KV.set(`${sbUser.id}:c:${k}`, v);
        for (const k of Object.keys(pending)) queue.set(k, k in docs ? docs[k] : null);
      }
      if (!remote && !Object.keys(base).length && !Object.keys(pending).length) throw new Error('offline and no saved copy');
      emit();
      if (queue.size) flush();
    } else {
      for (const k of lsKeys()) { if (k !== 'theme') docs[k] = lsGet(k); }
    }
    return docs;
  }

  async function migrateOldCache() {
    const oldP = lsGet(`acct:${sbUser.id}:pending`), oldC = lsGet(`acct:${sbUser.id}:cache`);
    if (oldC) { for (const [k, v] of Object.entries(oldC)) await KV.set(`${sbUser.id}:c:${k}`, v); lsDel(`acct:${sbUser.id}:cache`); }
    if (oldP) { for (const [k, v] of Object.entries(oldP)) await KV.set(`${sbUser.id}:p:${k}`, v); lsDel(`acct:${sbUser.id}:pending`); }
  }
  function persistLocal(key, value) {
    pendingMem.set(key, JSON.stringify(value));
    KV.set(`${sbUser.id}:p:${key}`, value);
    if (value === null) KV.del(`${sbUser.id}:c:${key}`); else KV.set(`${sbUser.id}:c:${key}`, value);
  }
  function clearPending(key, value) {
    if (pendingMem.get(key) === JSON.stringify(value)) { pendingMem.delete(key); KV.del(`${sbUser.id}:p:${key}`); }
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
      out.xp = local.xpBase != null ? (remote.xp || 0) + Math.max(0, (local.xp || 0) - local.xpBase) : Math.max(local.xp || 0, remote.xp || 0);
      out.xpBase = out.xp;
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

  // Records that can be edited from two devices at once are merged with the server copy, using the
  // row's updated_at as a version check so a write never overwrites changes it has not seen.
  const MERGEABLE = /^(lg-|st-|nt-|profile$|tags$)/;
  const mergeListeners = new Set();
  const netErr = e => ({ code: /fetch|network|load failed/i.test(e.message || '') || !navigator.onLine ? 'unavailable' : 'error', message: e.message });
  async function writeMerged(key, local) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await sb.from('user_docs').select('value,updated_at').eq('user_id', sbUser.id).eq('key', key).maybeSingle();
      if (r.error) throw netErr(r.error);
      const stamp = new Date().toISOString();
      if (!r.data) {
        const ins = await sb.from('user_docs').insert({ user_id: sbUser.id, key, value: local, updated_at: stamp });
        if (!ins.error) return local;
        if (/duplicate|conflict|23505/i.test(ins.error.message + ' ' + ins.error.code)) continue;
        throw netErr(ins.error);
      }
      const merged = mergeDoc(key, local, r.data.value);
      const up = await sb.from('user_docs').update({ value: merged, updated_at: stamp }).eq('user_id', sbUser.id).eq('key', key).eq('updated_at', r.data.updated_at).select('key');
      if (up.error) throw netErr(up.error);
      if (up.data && up.data.length) return merged;
      await new Promise(res => setTimeout(res, 40 + Math.random() * 120));
    }
    throw { code: 'unavailable', message: 'busy, will retry' };
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
            if (value === null) {
              const { error } = await sb.from('user_docs').delete().eq('user_id', sbUser.id).eq('key', key);
              if (error) throw netErr(error);
            } else if (MERGEABLE.test(key)) {
              const merged = await writeMerged(key, value);
              if (JSON.stringify(merged) !== JSON.stringify(value)) for (const f of mergeListeners) f(key, merged);
            } else {
              const { error } = await sb.from('user_docs').upsert({ user_id: sbUser.id, key, value, updated_at: new Date().toISOString() });
              if (error) throw netErr(error);
            }
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
  const pendingKeys = () => [...pendingMem.keys()];
  function emit() { for (const f of listeners) f(status()); }
  const onStatus = f => { listeners.add(f); f(status()); };

  return { init, loadAll, put, chunkCards, status, onStatus, viewerName, signIn, signUp, signOut, resetPassword, googleEnabled, signInGoogle, isAdmin, adminStudents, adminDocs, loadSharedTags, setSharedTags, insertEvents, beaconEvents, reportError, adminActivity, adminEventCounts, adminErrors, get signedIn() { return !!sbUser; }, pendingKeys, onMerged: f => mergeListeners.add(f), inviteCode, recordReferral, myReferrals, createChallenge, getChallenge, postResult, myChallenges, get email() { return sbUser?.email || ''; }, get client() { return sb; }, get userId() { return sbUser?.id || null; }, get mode() { return mode; }, lsGet, lsSet };
})();
