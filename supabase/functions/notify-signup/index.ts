// Emails the app owner whenever someone signs up. Called by the database trigger in supabase/notify-setup.sql.
// Secrets (set in Supabase > Edge Functions > Secrets): RESEND_API_KEY, NOTIFY_EMAIL, WEBHOOK_SECRET.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) return new Response("forbidden", { status: 403 });

  const { record } = await req.json();
  const meta = record?.raw_user_meta_data ?? {};
  const email = String(record?.email ?? "unknown");
  const name = String(meta.display_name || meta.full_name || meta.name || "");
  const provider = String(record?.raw_app_meta_data?.provider ?? "email");
  const when = new Date(record?.created_at ?? Date.now()).toUTCString();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "WSA Reps <onboarding@resend.dev>",
      to: [Deno.env.get("NOTIFY_EMAIL")],
      subject: `New WSA Reps sign-up: ${name || email}`,
      html: `<p><b>${esc(name || "New student")}</b> just signed up for WSA Reps.</p>
             <p>Email: ${esc(email)}<br>Signed up with: ${esc(provider)}<br>Time: ${esc(when)}</p>
             <p><a href="https://wall-street-alpha.github.io/wsa-reps/#admin">Open the admin panel</a></p>`,
    }),
  });
  return new Response(res.ok ? "sent" : await res.text(), { status: res.ok ? 200 : 502 });
});
