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

**Geteilt (Supabase, kostenloser Plan reicht):** Jeder mit dem Link sieht Leos Einträge live, ohne Anmeldung. Bearbeiten kann nur, wer den **Bearbeitungs-Code** kennt – keine E-Mail-Adressen, kein Login.

1. Auf supabase.com ein Projekt anlegen.
2. SQL Editor → Inhalt von `supabase/setup.sql` einfügen, ganz unten `HIER-EIGENEN-CODE` durch euren Code ersetzen (mind. 10 Zeichen, z. B. `puck-ossiach-sauna`) → Run.
3. Project Settings → API → `Project URL` und `anon public` Key in `config.js` eintragen und hochladen.
4. Leo öffnet den Kalender → „Bearbeiten“ → Code eingeben. Das Gerät bleibt freigeschaltet, bis man „Sperren“ klickt.

- **Code wechseln** (z. B. wenn er weitergegeben wurde): den letzten Block in `setup.sql` mit neuem Code erneut ausführen. Alle Geräte mit dem alten Code werden gesperrt.
- **Schutz gegen Raten:** Nach 10 falschen Codes in 15 Minuten ist Bearbeiten für 15 Minuten gesperrt.
- **Nicht mehr öffentlich:** in `plans` `is_public` auf `false` setzen – dann sehen nur noch Personen mit Code den Plan.
- Einträge, die vorher nur lokal gemacht wurden: „Backup herunterladen“, nach dem Freischalten „Backup einspielen“.

⚠️ Alles, was eingetragen wird, ist für jeden mit dem Link sichtbar – keine Verletzungs- oder Gesundheitsdetails in Notizen schreiben.

## 3. Was Leo und der Coach direkt im Kalender ändern können

- **Tagesart** pro Tag: Training, Ruhetag (schraffiert, zählt in „Ruhetage“), Reisetag, Testtag.
- **Fokus, Programm, RPE, Minuten, erledigt** und **Wochennotizen**.
- **Phasen & Blöcke** (Planung anpassen): Urlaub, Camps, Übergänge, Saison und Sommertraining verschieben, ändern, löschen oder neu anlegen, mit eigenem Zusatz (z. B. „Camp Vierumäki“). Bei Überschneidung gilt Camp vor Urlaub vor Übergang vor Saison/Sommertraining.
- **Spiele bearbeiten**: Verlegungen, Testspiele, Playoff-Spiele; Gegner aus der Liga oder frei eingeben.
- „Standard wiederherstellen“ / „Spielplan zurücksetzen“ holt die Werte aus `plan.js` zurück.

Alle Änderungen gelten sofort für alle, die den Link öffnen (bei Supabase-Modus). Es gilt „letzte Änderung gewinnt“ – zwei Personen sollten nicht gleichzeitig dieselben Blöcke bearbeiten.

## 4. Pflege

- **Spielerangaben und Standardplan:** `plan.js` (direkt auf GitHub mit dem Stift-Symbol). Laufende Änderungen an Phasen und Spielen besser im Kalender selbst machen.
- **Vereinslogos:** als `logos/KÜRZEL.png` hochladen, siehe `logos/README.md`.
- **Weiterer Spieler:** Ordner kopieren, `plan.js` anpassen, in `config.js` eine neue `planId` setzen und in `plan_members` freischalten.

## 5. Auf dem Handy

Seite in Safari/Chrome öffnen → „Zum Home-Bildschirm“. Der Kalender startet dann wie eine App und funktioniert auch bei schlechtem Netz.

## 6. PDF

„Drucken / PDF“ druckt die aktuelle Woche auf eine A4-Seite quer, inklusive aller Einträge. Im Druckdialog „Als PDF speichern“ wählen.
