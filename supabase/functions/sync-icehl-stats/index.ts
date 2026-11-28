// Holt Leos Spielstatistik aus den öffentlichen ICEHL-Spieldaten und trägt sie in den Kalender ein.
// Läuft per Zeitplan (pg_cron) nach jedem Spieltag. Überschreibt nur die Statistikfelder,
// Leos eigene Bewertung, Kommentar und Trainingseinträge bleiben unangetastet.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CFG = {
  planId: "leo-woborsky-2026-27",
  season: "2026",
  leagueParts: [1, 2],          // 1 = Grunddurchgang, 2 = Playoffs (falls vorhanden)
  teamShortcut: "PIV",          // Pioneers Vorarlberg
  playerId: 417,                // Leo Woborsky in den Ligadaten
  jersey: 19,
  lastname: "woborsky",
  from: "2026-11-25",
  to: "2027-09-01",
};
const BASE = "https://s3-eu-west-1.amazonaws.com/icehl.hokejovyzapis.cz";

type Match = { id: number; start_date: string; status: string; home: { shortcut: string }; guest: { shortcut: string };
  results?: { extra_time?: boolean; shooting?: boolean } };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

async function getJson(url: string) {
  const r = await fetch(`${url}?${Date.now()}`, { headers: { "User-Agent": "BB-Sports-Saisonplan/1.0" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

Deno.serve(async (req) => {
  const q = new URL(req.url).searchParams;
  const force = q.get("force") === "1";
  const dry = q.get("dry") === "1";                 // Testlauf: nichts speichern, nur Ergebnis zeigen
  const from = dry && q.get("from") ? q.get("from")! : CFG.from;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const log: string[] = [];

  // 1. Alle beendeten Spiele der Pioneers im Planungszeitraum
  const matches: Match[] = [];
  for (const part of CFG.leagueParts) {
    try {
      const d = await getJson(`${BASE}/league-matches/${CFG.season}/${part}.json`);
      matches.push(...(d.matches as Match[]));
    } catch (e) { log.push(`Teil ${part} nicht verfügbar: ${(e as Error).message}`); }
  }
  const mine = matches.filter((m) =>
    (m.home?.shortcut === CFG.teamShortcut || m.guest?.shortcut === CFG.teamShortcut) &&
    m.status === "AFTER_MATCH" &&
    m.start_date.slice(0, 10) >= from && m.start_date.slice(0, 10) <= CFG.to
  );

  // 2. Bereits importierte Spiele überspringen (außer Korrekturfenster 48 h oder force)
  const { data: rows } = await sb.from("plan_entries").select("path,data").eq("plan_id", CFG.planId).like("path", "days/%");
  const existing = new Map((rows ?? []).map((r) => [r.path as string, r.data as Record<string, unknown>]));
  const now = Date.now();

  let updated = 0;
  for (const m of mine) {
    const date = m.start_date.slice(0, 10);
    const path = `days/${date}`;
    const cur = existing.get(path) ?? {};
    const auto = cur.gAuto as { matchId?: number } | undefined;
    const recent = now - new Date(m.start_date.replace(" ", "T") + "+01:00").getTime() < 48 * 3600e3;
    if (!force && auto?.matchId === m.id && !recent) continue;

    let g;
    try { g = (await getJson(`${BASE}/widget/esports/match/${m.id}.json`)).data; }
    catch (e) { log.push(`Spiel ${m.id}: ${(e as Error).message}`); continue; }

    const isHome = g.gameData.homeTeamShortname === CFG.teamShortcut;
    const players = (isHome ? g.homeFieldPlayers : g.awayFieldPlayers) ?? [];
    const p = players.find((x: Record<string, unknown>) => x.id === CFG.playerId) ??
      players.find((x: Record<string, unknown>) => x.playerJerseyNr === CFG.jersey &&
        `${x.playerLastname} ${x.playerFirstname}`.toLowerCase().includes(CFG.lastname));

    const next: Record<string, unknown> = { ...cur };
    for (const k of ["gG", "gA", "gPM", "gPIM", "gS", "gTOI", "gLine", "gPos", "gDNP", "gRes", "gOT"]) delete next[k];
    // Ergebnis aus Sicht der Pioneers (eigene Tore : Gegentore), plus Verlängerung/Penaltyschießen
    const hs = Number(g.gameData.homeTeamScore ?? 0), as = Number(g.gameData.awayTeamScore ?? 0);
    next.gRes = isHome ? `${hs}:${as}` : `${as}:${hs}`;
    // Verlängerung/Penaltys aus dem Spielplan (die Detaildatei meldet isOvertime nicht zuverlässig)
    next.gOT = m.results?.shooting || g.gameData.isShootOut ? "SO" : m.results?.extra_time || g.gameData.isOvertime ? "OT" : "";
    if (p) {
      Object.assign(next, {
        gG: String(p.goals ?? 0), gA: String(p.assists ?? 0), gPM: String(p.plusMinus ?? 0),
        gPIM: String(p.penaltyMinutes ?? 0), gS: String(p.shotsOnGoal ?? 0),
        gTOI: typeof p.timeOnIce === "number" && p.timeOnIce > 0 ? mmss(p.timeOnIce) : "",
        gLine: p.lineupLine ? String(p.lineupLine) : "", gPos: String(p.position ?? ""),
      });
    } else {
      next.gDNP = true; // nicht im Spielbericht = nicht eingesetzt
    }
    next.gAuto = {
      source: "ICEHL", matchId: m.id, at: new Date().toISOString(),
      score: `${g.gameData.homeTeamShortname} ${g.gameData.homeTeamScore}:${g.gameData.awayTeamScore} ${g.gameData.awayTeamShortname}`,
    };

    if (dry) { log.push(`${date} (Test): ${JSON.stringify(next)}`); continue; }
    const { error } = await sb.from("plan_entries").upsert(
      { plan_id: CFG.planId, path, data: next, updated_at: new Date().toISOString() },
      { onConflict: "plan_id,path" },
    );
    if (error) log.push(`${date}: ${error.message}`); else { updated++; log.push(`${date}: ${p ? "Statistik übernommen" : "nicht eingesetzt"}`); }
  }

  return new Response(JSON.stringify({ games: mine.length, updated, log }), { headers: { "Content-Type": "application/json" } });
});
