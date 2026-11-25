// Lädt die Vereinslogos der ICE Hockey League aus den Ligadaten und legt sie
// im öffentlichen Storage-Bucket "logos" als <KÜRZEL>.png ab (Kürzel wie im Kalender).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Kalender-Kürzel -> Team-ID in den ICEHL-Daten
const TEAMS: Record<string, number> = {
  IBK: 6, HCP: 5, OLI: 10, VSV: 1, VIC: 12, AVS: 8, KAC: 2,
  HCB: 7, MIL: 85, RBS: 3, G99: 9, BWL: 13, FTC: 4, PIV: 11,
};

Deno.serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const result: Record<string, string> = {};
  for (const [code, id] of Object.entries(TEAMS)) {
    try {
      const r = await fetch(`https://icehl.hokejovyzapis.cz/img/logos/${id}.png`, { headers: { "User-Agent": "BB-Sports-Saisonplan/1.0" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const { error } = await sb.storage.from("logos").upload(`${code}.png`, bytes, { contentType: "image/png", upsert: true, cacheControl: "604800" });
      result[code] = error ? `Fehler: ${error.message}` : `ok (${bytes.length} B)`;
    } catch (e) { result[code] = `Fehler: ${(e as Error).message}`; }
  }
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
});
