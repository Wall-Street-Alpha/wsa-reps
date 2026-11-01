// Storage: per-user private docs in the artifact db (signed-in claude.ai viewers), or localStorage when no db is available.
const Store = (() => {
  const CHUNK_BYTES = 180000;
  let db = null, user = null, uid = null, mode = 'local';
  const queue = new Map();
  let flushing = false, lastError = null;
  const listeners = new Set();

  const lsGet = k => { try { const v = localStorage.getItem('wsareps:' + k); return v ? JSON.parse(v) : null; } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem('wsareps:' + k, JSON.stringify(v)); } catch {} };
  const lsDel = k => { try { localStorage.removeItem('wsareps:' + k); } catch {} };
  const lsKeys = () => { try { return Object.keys(localStorage).filter(k => k.startsWith('wsareps:')).map(k => k.slice(8)); } catch { return []; } };

  async function init() {
    const c = window.claude;
    if (c && typeof c.use === 'function') {
      try {
        [db, user] = await Promise.all([c.use('db'), c.use('user')]);
        if (db && user) uid = await user.id();
      } catch { db = null; }
    }
    mode = db && uid ? 'cloud' : 'local';
    return { mode, uid };
  }

  async function viewerName() {
    try { return user ? (await user.name()) || '' : ''; } catch { return ''; }
  }

  const col = () => db.collection('data/users/' + uid);

  async function loadAll() {
    const docs = {};
    if (mode === 'cloud') {
      const snap = await col().limit(1000).get();
      for (const d of snap.docs) if (d.exists) docs[d.id] = d.data();
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

  return { init, loadAll, put, chunkCards, status, onStatus, viewerName, get mode() { return mode; }, lsGet, lsSet };
})();
