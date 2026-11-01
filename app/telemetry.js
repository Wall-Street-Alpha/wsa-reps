// Product events and client error reports (website accounts only). Batched, offline-safe, no answer text.
const Telemetry = (() => {
  const KEY = 'telemetry-queue';
  let q = Store.lsGet(KEY) || [], timer = null, sending = false, disabled = false;
  const active = () => Store.mode === 'account' && Store.signedIn && !disabled;
  function track(name, props = {}) {
    if (Store.mode !== 'account' || !Store.signedIn) return;
    q.push({ name, props, created_at: new Date().toISOString() });
    if (q.length > 500) q = q.slice(-500);
    Store.lsSet(KEY, q);
    clearTimeout(timer); timer = setTimeout(flush, 4000);
  }
  async function flush() {
    if (sending || !q.length || !active() || !navigator.onLine) return;
    sending = true;
    const batch = q.slice(0, 100);
    try {
      await Store.insertEvents(batch.map(e => ({ name: e.name, props: e.props, created_at: e.created_at })));
      q = q.slice(batch.length); Store.lsSet(KEY, q);
    } catch (e) {
      if (/PGRST20|does not exist|Could not find/i.test((e && (e.code + ' ' + e.message)) || '')) disabled = true;
    } finally {
      sending = false;
      if (q.length && !disabled) { clearTimeout(timer); timer = setTimeout(flush, 30000); }
    }
  }
  addEventListener('online', flush);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  let reported = 0;
  const seen = new Set();
  function report(message, stack) {
    if (Store.mode !== 'account' || reported >= 5) return;
    const m = String(message || 'Unknown error').slice(0, 1000);
    if (seen.has(m)) return;
    seen.add(m); reported++;
    Store.reportError({ message: m, stack: String(stack || '').slice(0, 4000), url: location.href.slice(0, 500), user_agent: navigator.userAgent.slice(0, 400), app_version: String(window.WSA_BUILD || 'dev').slice(0, 40) });
  }
  addEventListener('error', e => report(e.message, e.error && e.error.stack));
  addEventListener('unhandledrejection', e => { const r = e.reason || {}; report(r.message || String(r), r.stack); });
  return { track, flush, report, clear() { q = []; Store.lsSet(KEY, q); } };
})();
