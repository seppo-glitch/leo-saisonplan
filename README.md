# Saisonplan Leo Woborsky · BB Sports Management

Wochenkalender 01.12.2026 – 01.09.2027 mit allen Spielen der Pioneers Vorarlberg, Trainingsphasen, Tagesfokus, Trainingsprogramm, Belastung (RPE × Minuten) und Wochennotizen. Läuft als statische Seite auf GitHub Pages, ohne Claude.

## 1. Online stellen (GitHub Pages)

1. Auf github.com ein neues Repository anlegen, z. B. `leo-saisonplan`.
2. Den **Inhalt** dieses Ordners hochladen („Add file → Upload files“, alle Dateien und Ordner hineinziehen) und „Commit changes“.
3. Repository → **Settings → Pages** → Source: „Deploy from a branch“, Branch `main`, Ordner `/ (root)` → Save.
4. Nach 1–2 Minuten ist der Kalender unter `https://<github-name>.github.io/leo-saisonplan/` erreichbar.

Hinweis: Mit einem kostenlosen GitHub-Konto muss das Repository für Pages **öffentlich** sein. Der Spielplan und Leos Name sind dann öffentlich einsehbar (die Seite ist für Suchmaschinen gesperrt). Leos Trainingseinträge liegen nie im Repository, sondern im Browser bzw. in Supabase.

## 2. Speichern: zwei Modi

**Lokal (Standard, `config.js` leer):** Einträge bleiben im Browser des jeweiligen Geräts. Über „Daten sichern“ ein Backup herunterladen und auf einem anderen Gerät einspielen. Gut für Leo allein, nicht für die Zusammenarbeit mit dem Coach.

**Geteilt (Supabase, kostenloser Plan reicht):** Jeder mit dem Link sieht Leos Einträge live (ohne Login, nur lesen). Eintragen können nur freigeschaltete E-Mail-Adressen (Leo, Coach, BB Sports) nach Login per E-Mail-Link. Öffentlich lesbar ist der Plan, weil in `plans` `is_public = true` steht; auf `false` setzen, wenn nur Mitglieder lesen sollen.

⚠️ Alles, was eingetragen wird, ist für jeden mit dem Link sichtbar – keine Verletzungs- oder Gesundheitsdetails in Notizen schreiben.

1. Auf supabase.com ein Projekt anlegen.
2. SQL Editor → Inhalt von `supabase/setup.sql` einfügen, unten die E-Mail-Adressen anpassen → Run.
3. Authentication → URL Configuration → **Site URL** und **Redirect URLs** auf die GitHub-Pages-Adresse setzen.
4. Project Settings → API → `Project URL` und `anon public` Key in `config.js` eintragen und hochladen.
5. Leo öffnet den Kalender, gibt seine E-Mail ein und klickt den Login-Link. Fertig.

Weitere Personen freischalten: im Supabase Table Editor eine Zeile in `plan_members` ergänzen. Einträge, die vor der Supabase-Einrichtung nur lokal gemacht wurden: vorher „Backup herunterladen“, nach dem Login „Backup einspielen“.

## 3. Pflege

- **Spielverlegungen, neue Phasen, Spielerangaben:** nur `plan.js` bearbeiten (direkt im Browser auf GitHub mit dem Stift-Symbol).
- **Vereinslogos:** als `logos/KÜRZEL.png` hochladen, siehe `logos/README.md`.
- **April-Camp-Woche:** direkt im Kalender unter „Planung anpassen“.
- **Weiterer Spieler:** Ordner kopieren, `plan.js` anpassen, in `config.js` eine neue `planId` setzen und in `plan_members` freischalten.

## 4. Auf dem Handy

Seite in Safari/Chrome öffnen → „Zum Home-Bildschirm“. Der Kalender startet dann wie eine App und funktioniert auch bei schlechtem Netz.

## 5. PDF

„Drucken / PDF“ druckt die aktuelle Woche auf eine A4-Seite quer, inklusive aller Einträge. Im Druckdialog „Als PDF speichern“ wählen.
