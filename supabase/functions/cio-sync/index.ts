// cio-sync: sends queued people and events from public.cio_outbox to Customer.io.
//
// Called by the database (pg_net) whenever something is queued, and every two
// minutes by pg_cron as a retry. It never takes data from the request body: it
// only processes rows already in the outbox, so a stray call does nothing harmful.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   CIO_SITE_ID   Customer.io Track API site ID
//   CIO_API_KEY   Customer.io Track API key
//   CIO_REGION    "us" (default) or "eu"
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_ID = Deno.env.get("CIO_SITE_ID") ?? "";
const API_KEY = Deno.env.get("CIO_API_KEY") ?? "";
const REGION = (Deno.env.get("CIO_REGION") ?? "us").toLowerCase();
const BASE = REGION === "eu" ? "https://track-eu.customer.io/api/v1" : "https://track.customer.io/api/v1";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

type Row = { id: number; kind: "identify" | "event" | "delete"; user_id: string; name: string | null; data: Record<string, unknown>; created_at: string };

async function cio(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: "Basic " + btoa(`${SITE_ID}:${API_KEY}`), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // 404 on delete means the person was never in Customer.io: fine
  if (!res.ok && !(method === "DELETE" && res.status === 404)) {
    throw new Error(`${method} ${path} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  if (!SITE_ID || !API_KEY) return json({ ok: false, error: "CIO_SITE_ID and CIO_API_KEY are not set; rows stay queued" });

  let sent = 0, failed = 0;
  for (let round = 0; round < 10; round++) {
    const { data, error } = await sb.rpc("cio_claim", { p_limit: 50 });
    if (error) return json({ ok: false, error: error.message }, 500);
    const rows = (data as Row[]).sort((a, b) => a.id - b.id);
    if (!rows.length) break;

    const profiles = new Map<string, Record<string, unknown> | null>();
    for (const row of rows) {
      const path = `/customers/${encodeURIComponent(row.user_id)}`;
      try {
        if (row.kind === "delete") {
          await cio("DELETE", path);
          profiles.set(row.user_id, null);
        } else {
          // refresh attributes once per person per batch, before any event, so the person exists
          if (!profiles.has(row.user_id)) {
            const { data: p, error: pe } = await sb.rpc("cio_profile", { p_user: row.user_id });
            if (pe) throw new Error(pe.message);
            profiles.set(row.user_id, p);
            if (p) await cio("PUT", path, p);
          }
          const p = profiles.get(row.user_id);
          // p is null when the account no longer exists: skip, never re-create a deleted person
          if (p && row.kind === "event" && row.name) {
            await cio("POST", `${path}/events`, {
              name: row.name,
              data: row.data ?? {},
              timestamp: Math.floor(Date.parse(row.created_at) / 1000),
            });
          }
        }
        await sb.rpc("cio_done", { p_id: row.id, p_error: null });
        sent++;
      } catch (e) {
        await sb.rpc("cio_done", { p_id: row.id, p_error: String(e).slice(0, 500) });
        failed++;
      }
    }
  }
  return json({ ok: true, sent, failed });
});
