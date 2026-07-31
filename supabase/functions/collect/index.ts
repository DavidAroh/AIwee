// Edge Function: collect
//
// Runs the multi-source incident collection server-side and upserts results into
// public.incidents (dedup_key prevents duplicates across runs). Realtime then
// pushes the new rows to every connected web/mobile client.
//
// Invoke:
//   • scheduled via pg_cron / an external cron (see SUPABASE.md), or
//   • manually: `supabase functions invoke collect`
//
// Auth: uses the injected SERVICE_ROLE key (bypasses RLS). Protect the public
// endpoint with the function's verify_jwt or a shared secret in production.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { collectAll } from "../_shared/sources.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { incidents, counts } = await collectAll();

    let upserted = 0;
    if (incidents.length > 0) {
      // Upsert on the stable dedup_key so re-runs update rather than duplicate.
      const { error, count } = await supabase
        .from("incidents")
        .upsert(incidents, { onConflict: "dedup_key", ignoreDuplicates: true, count: "exact" });
      if (error) throw error;
      upserted = count ?? incidents.length;
    }

    const body = { ok: true, candidates: incidents.length, upserted, counts };
    console.log("[collect]", JSON.stringify(body));
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[collect] failed:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
