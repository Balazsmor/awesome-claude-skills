//  Prüft die iOS-Fassung (mobile/Lernplan.js) in einer nachgebauten
//  Scriptable-Umgebung: baut die Widgets wirklich auf und liest den Inhalt aus.
import { runScript, texts, sized } from "./scriptable-stub.mjs";

const SCRIPT = new URL("../mobile/Lernplan.js", import.meta.url).pathname;

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A === B) pass++; else { fail++; console.log(`FAIL ${msg}\n  got ${A}\n  exp ${B}`); }
};
const ok = (v, msg) => eq(!!v, true, msg);
const has = (arr, needle, msg) =>
  ok(arr.some((t) => String(t).includes(needle)), `${msg} — gesucht: "${needle}" in ${JSON.stringify(arr)}`);
const hasNot = (arr, needle, msg) =>
  ok(!arr.some((t) => String(t).includes(needle)), `${msg} — "${needle}" sollte fehlen`);

const S = "/docs/lernplan-widget.json";
const K = "/docs/lernplan-config.json";

// Montag, 14.9.2026, 16:30 — Schultag, mitten im Deutschblock
const MO = new Date(2026, 8, 14, 16, 30, 0);
// Montag, 17.8.2026 — Sommerferien
const FERIEN = new Date(2026, 7, 17, 17, 30, 0);

// ---- Ohne jede Datei -------------------------------------------------------
{
  const { widget } = await runScript(SCRIPT, { now: MO });
  const t = texts(widget);
  has(t, "Montag", "Wochentag");
  has(t, "14.09.", "Datum");
  has(t, "SCHULTAG", "Kennzeichnung");
  has(t, "0%", "leere Quote");
  has(t, "0/5", "fünf wertbare Blöcke");
  ok(widget.url.startsWith("scriptable:///run/"), "Tipp öffnet das Skript");
  ok(widget.refreshAfterDate > MO, "Auffrischzeit liegt in der Zukunft");
  ok(widget.padding.length === 4, "Innenabstand gesetzt");
}

// ---- Mit Häkchen -----------------------------------------------------------
{
  const state = JSON.stringify({
    v: 4, d: { "2026-09-14": ["morgen", "anki", "lesen"] }, f: {}, n: {},
  });
  const { widget } = await runScript(SCRIPT, { now: MO, files: { [S]: state } });
  const t = texts(widget);
  has(t, "60%", "drei von fünf");
  has(t, "3/5", "Zähler");
  has(t, "🔥", "Streak, weil der Kern steht");
  has(t, "offen", "offene Zeit");
  // Der laufende Block steht in der Liste
  has(t, "Deutsch-Schreibtraining", "aktueller Block sichtbar");
}

// ---- Ferienplan schlägt durch ----------------------------------------------
{
  const { widget } = await runScript(SCRIPT, { now: FERIEN });
  const t = texts(widget);
  has(t, "Sommerferien", "Ferienname im Kopf");
  // Der Ferienmontag hat den Deutschblock um 17:15 statt 16:00 und endet
  // "ab 19:30" — beides gibt es im Schulplan nicht.
  has(t, "17:15", "Deutschblock am Abend");
  has(t, "ab 19:30", "Feierabend nach Ferienplan");
  hasNot(t, "Schule", "keine Berufsschule in den Ferien");
  // Früher am Tag steht der Anki-Block oben
  const frueh = await runScript(SCRIPT, { now: new Date(2026, 7, 17, 17, 0) });
  has(texts(frueh.widget), "Anki", "Anki, solange er dran ist");
}

// ---- Feiertag --------------------------------------------------------------
{
  // 1.5.2026 ist ein Freitag → Tag der Arbeit, zählt nicht
  const { widget } = await runScript(SCRIPT, { now: new Date(2026, 4, 1, 10, 0) });
  const t = texts(widget);
  has(t, "Tag der Arbeit", "Feiertag erkannt");
  has(t, "frei", "keine Quote an Feiertagen");
  has(t, "ohne Wertung", "und gesagt, dass es nicht zählt");
}

// ---- Selbst markiert -------------------------------------------------------
{
  const state = JSON.stringify({ v: 4, d: {}, f: { "2026-09-14": "krank" } });
  const { widget } = await runScript(SCRIPT, { now: MO, files: { [S]: state } });
  has(texts(widget), "Krank gemeldet", "Krankmeldung sichtbar");
}
// Alte Markierung aus v2 (1 statt "frei") wird weiter verstanden
{
  const state = JSON.stringify({ d: {}, f: { "2026-09-14": 1 } });
  const { widget } = await runScript(SCRIPT, { now: MO, files: { [S]: state } });
  has(texts(widget), "Frei markiert", "v2-Markierung migriert");
}

// ---- Eigene Konfiguration --------------------------------------------------
{
  const cfg = JSON.stringify({
    core: ["morgen"],
    exams: [{ date: "2026-09-30", label: "Zwischenprüfung" }],
    days: { mo: { label: "Montag XL", tag: "EIGEN", note: "x", blocks: [
      { id: "morgen", t: "6:00", nm: "Aufstehen", kind: "morg", track: true, min: 20 },
      { id: "lernen", t: "17:00", nm: "Lernblock", kind: "deep", track: true, min: 90 },
    ] } },
  });
  const { widget } = await runScript(SCRIPT, { now: MO, files: { [K]: cfg } });
  const t = texts(widget);
  has(t, "Montag XL", "eigener Tagesname");
  has(t, "EIGEN", "eigene Kennzeichnung");
  has(t, "Aufstehen", "eigener Block");
  has(t, "Zwischenprüfung", "eigener Termin");
  has(t, "16 T", "16 Tage bis zum 30.9.");
  has(t, "0/2", "nur noch zwei wertbare Blöcke");
  // Dienstag bleibt beim Standard, obwohl nur Montag überschrieben wurde
  const di = await runScript(SCRIPT, { now: new Date(2026, 8, 15, 17, 30), files: { [K]: cfg } });
  has(texts(di.widget), "Dienstag", "andere Tage kommen aus den Defaults");
}

// ---- Kaputte Dateien dürfen nichts umbringen -------------------------------
{
  const { widget } = await runScript(SCRIPT, { now: MO, files: { [K]: "{kaputt" } });
  has(texts(widget), "Montag", "kaputte Konfiguration → Defaults");
}
{
  const { widget } = await runScript(SCRIPT, { now: MO, files: { [S]: "]]nicht json" } });
  has(texts(widget), "0%", "kaputter Zustand → leer weiter");
}

// ---- Größen ----------------------------------------------------------------
{
  const small = await runScript(SCRIPT, { now: MO, family: "small" });
  const t = texts(small.widget);
  has(t, "Montag", "klein: Wochentag");
  has(t, "0%", "klein: Quote");
  ok(t.length <= 6, "klein bleibt knapp");

  const large = await runScript(SCRIPT, { now: MO, family: "large" });
  const tl = texts(large.widget);
  has(tl, "Morgenroutine", "groß zeigt den ganzen Tag");
  has(tl, "Frei", "groß bis zum letzten Block");
  ok(texts(large.widget).length > t.length, "groß zeigt mehr als klein");

  const med = await runScript(SCRIPT, { now: MO, family: "medium" });
  // Mittel zeigt genau drei Blockzeilen: je Zeile eine Uhrzeit und ein Name
  const rows = texts(med.widget).filter((x) => /^\d{1,2}:\d{2}$/.test(x));
  eq(rows.length, 3, "mittel zeigt drei Blockzeilen");
}

// ---- Sperrbildschirm -------------------------------------------------------
{
  const { widget } = await runScript(SCRIPT, { now: MO, family: "accessoryRectangular" });
  const t = texts(widget);
  has(t, "Mo", "Kurzform des Wochentags");
  has(t, "0%", "Quote");
  has(t, "erledigt", "Zähler");
  eq(widget.padding, [2, 2, 2, 2], "enger Innenabstand");
  ok(t.length <= 4, "höchstens vier Zeilen auf dem Sperrbildschirm");
}

// ---- Blockauswahl folgt der Uhrzeit ----------------------------------------
{
  const morgens = await runScript(SCRIPT, { now: new Date(2026, 8, 14, 6, 0) });
  has(texts(morgens.widget), "Morgenroutine", "morgens steht der Morgen oben");
  const abends = await runScript(SCRIPT, { now: new Date(2026, 8, 14, 21, 0) });
  has(texts(abends.widget), "Frei", "abends das Ende des Tages");
  hasNot(texts(abends.widget), "Morgenroutine", "und nicht mehr der Morgen");
}

// ---- Fortschrittsbalken ----------------------------------------------------
{
  const state = JSON.stringify({ v: 4, d: { "2026-09-14": ["morgen", "anki", "deutsch", "lesen", "nachber"] } });
  const { widget } = await runScript(SCRIPT, { now: MO, files: { [S]: state } });
  const t = texts(widget);
  has(t, "100%", "alles erledigt");
  hasNot(t, "offen", "nichts mehr offen");
  const bars = sized(widget).filter((s) => s.height === 4);
  ok(bars.length >= 2, "Balken samt Füllung gezeichnet");
  eq(bars[0].width, bars[1].width, "bei 100 % ist die Füllung so breit wie die Spur");
}

// ---- Liste zum Abhaken (App-Modus) -----------------------------------------
{
  const state = JSON.stringify({ v: 4, d: { "2026-09-14": ["morgen"] } });
  const { table, files } = await runScript(SCRIPT, {
    now: MO, runsInWidget: false, files: { [S]: state },
  });
  ok(table && table.presented, "Tabelle wurde gezeigt");
  const titles = table.rows.flatMap((r) => r.cells.map((c) => c.title));
  has(titles, "Montag", "Kopfzeile");
  has(titles, "✓  5:30   Morgenroutine", "gesetztes Häkchen");
  has(titles, "○  15:20   Anki 15′", "offener Block");
  has(titles, "Kern abhaken", "Kern-Aktion");
  has(titles, "Tag als frei / krank markieren", "Markierung");
  has(titles, "Notiz", "Notiz");
  has(titles, "Widget-Vorschau", "Vorschau");
  // Fixtermine sind nicht auswählbar
  const schule = table.rows.find((r) => r.cells.some((c) => String(c.title).includes("Schule")));
  ok(schule && !schule.onSelect, "Fixtermin ist nicht antippbar");

  // Antippen setzt das Häkchen und schreibt die Datei
  const anki = table.rows.find((r) => r.cells.some((c) => String(c.title).includes("Anki")));
  ok(anki && anki.onSelect, "Anki ist antippbar");
  anki.onSelect();
  const saved = JSON.parse(files[S]);
  eq(saved.d["2026-09-14"].sort(), ["anki", "morgen"], "Häkchen gespeichert");
  ok(files["/docs/lernplan-backup-" + "2026-09-14".slice(0, 10) + ".json"] !== undefined ||
     Object.keys(files).some((f) => f.includes("lernplan-backup-")), "Sicherung angelegt");

  // Noch einmal tippen nimmt es zurück
  const anki2 = table.rows.find((r) => r.cells.some((c) => String(c.title).includes("Anki")));
  anki2.onSelect();
  eq(JSON.parse(files[S]).d["2026-09-14"], ["morgen"], "Häkchen wieder weg");

  // Kern abhaken setzt alle Kern-Blöcke
  const core = table.rows.find((r) => r.cells.some((c) => c.title === "Kern abhaken"));
  core.onSelect();
  eq(JSON.parse(files[S]).d["2026-09-14"].sort(), ["anki", "lesen", "morgen"], "Kern gesetzt");

  // Markierung schaltet frei → krank → weg
  const mark = () => table.rows.find((r) => r.cells.some((c) => String(c.title).includes("Markierung") ||
    String(c.title).includes("frei / krank")));
  mark().onSelect();
  eq(JSON.parse(files[S]).f["2026-09-14"], "frei", "frei markiert");
  mark().onSelect();
  eq(JSON.parse(files[S]).f["2026-09-14"], "krank", "dann krank");
  mark().onSelect();
  eq(JSON.parse(files[S]).f["2026-09-14"], undefined, "dann wieder normal");
}

// ---- Ohne iCloud fällt es auf den lokalen Ordner zurück ---------------------
{
  const { widget } = await runScript(SCRIPT, { now: MO, icloud: false });
  has(texts(widget), "Montag", "läuft auch ohne iCloud");
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen  (iOS-Skript)`);
process.exit(fail ? 1 : 0);
