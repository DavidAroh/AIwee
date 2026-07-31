// Edge Function: report
//
// Accepts an anonymous citizen report, classifies it with the shared heuristics,
// and inserts it as a citizen-sourced incident. Realtime pushes it to all
// clients (so a report on one phone appears on every map).
//
//   POST /functions/v1/report
//   { "description": "...", "quickType": "Fire", "latitude": 4.8, "longitude": 7.0 }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  dedupKey,
  detectSeverity,
  detectType,
  resolveLocation,
} from "../_shared/heuristics.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { description, quickType, latitude, longitude } = await req.json();
    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "description required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const full = quickType ? `[${quickType}] ${description}` : description;
    const type = quickType || detectType(full);
    const severity = detectSeverity(full);
    const hasCoords = typeof latitude === "number" && typeof longitude === "number";
    const loc = hasCoords
      ? { name: "Reported location", lat: latitude, lng: longitude }
      : resolveLocation(full);

    const id = `inc-${crypto.randomUUID()}`;
    const row = {
      id,
      type,
      description: full.slice(0, 400),
      summary: description.slice(0, 140),
      location_name: loc.name,
      latitude: loc.lat,
      longitude: loc.lng,
      severity,
      confidence: 55,
      status: "UNVERIFIED",
      reporters_count: 1,
      source_kind: "citizen",
      cues: [loc.name, String(type).toLowerCase(), "citizen"],
      dedup_key: `${id}`, // citizen reports are always distinct
      event_time: new Date().toISOString(),
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.from("incidents").insert(row).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, incident: data }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
