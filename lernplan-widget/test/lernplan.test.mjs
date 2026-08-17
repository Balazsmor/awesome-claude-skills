//  Wird von test/run.sh aufgerufen — das Bündel entsteht dort aus lernplan.jsx.
import * as L from "./.bundle.mjs";

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A === B) { pass++; } else { fail++; console.log(`FAIL ${msg}\n  got ${A}\n  exp ${B}`); }
};
const ok = (v, msg) => eq(!!v, true, msg);

const C = L.DEFAULTS;

// ---- Datum -----------------------------------------------------------------
eq(L.ymd(new Date(2026, 7, 17, 12)), "2026-08-17", "ymd");
eq(L.ymd(L.fromYmd("2026-01-06")), "2026-01-06", "fromYmd roundtrip");
eq(L.dayKey(L.fromYmd("2026-08-17")), "mo", "17.8.2026 ist Montag");
eq(L.dayKey(L.fromYmd("2026-08-16")), "so", "16.8.2026 ist Sonntag");

// ---- Ostern / Feiertage BW -------------------------------------------------
eq(L.ymd(L.easterSunday(2026)), "2026-04-05", "Ostern 2026");
eq(L.ymd(L.easterSunday(2027)), "2027-03-28", "Ostern 2027");
const h26 = L.holidaysBW(2026);
eq(h26["2026-04-03"], "Karfreitag", "Karfreitag 2026");
eq(h26["2026-05-14"], "Christi Himmelfahrt", "Himmelfahrt 2026");
eq(h26["2026-05-25"], "Pfingstmontag", "Pfingstmontag 2026");
eq(h26["2026-06-04"], "Fronleichnam", "Fronleichnam 2026");
eq(h26["2026-01-06"], "Heilige Drei Könige", "Dreikönig (BW)");
ok(L.holidaysBW(2026) === L.holidaysBW(2026), "Feiertage werden gecacht");

// ---- Uhrzeiten -------------------------------------------------------------
eq(L.toMinutes("16:00"), 960, "16:00");
eq(L.toMinutes("5:30"), 330, "5:30");
eq(L.toMinutes("ab 19"), 1140, "ab 19");
eq(L.toMinutes("ab 19:30"), 1170, "ab 19:30");
eq(L.toMinutes("19.30"), 1170, "19.30");
eq(L.toMinutes("opt."), null, "opt.");
eq(L.toMinutes("—"), null, "Gedankenstrich");
eq(L.toMinutes("25:00"), null, "25:00 ist keine Uhrzeit");
eq(L.hhmm(1170), "19:30", "hhmm");

// ---- Dauer -----------------------------------------------------------------
eq(L.blockMinutes({ nm: "Lesen 45′", kind: "lese" }, C), 45, "45′ aus Namen");
eq(L.blockMinutes({ nm: "Deutsch", sub: "FOKUS 90′ · x", kind: "deep" }, C), 90, "90′ aus sub");
eq(L.blockMinutes({ nm: "Nachbereiten", kind: "wdh", min: 30 }, C), 30, "min gewinnt");
eq(L.blockMinutes({ nm: "Morgenroutine", kind: "morg" }, C), 30, "Fallback je Art");
eq(L.blockMinutes({ nm: "Betrieb", sub: "bis 16:00", kind: "fix" }, C), 0, "fix zählt nicht");
eq(L.fmtMin(45), "45 min", "fmtMin < 1h");
eq(L.fmtMin(135), "2 h 15", "fmtMin 2h15");
eq(L.fmtMin(120), "2 h", "fmtMin glatt");

// ---- Tagesart --------------------------------------------------------------
const t = (s, marks) => L.dayInfo(L.fromYmd(s), C, marks || {});
eq(t("2026-09-14").kind, "school", "Mo nach den Ferien = Schultag");
eq(t("2026-09-14").plan.tag, "SCHULTAG", "Schultagsplan");
eq(t("2026-08-17").kind, "vacation", "Sommerferien-Montag");
eq(t("2026-08-17").plan.tag, "FERIEN · BETRIEB", "Ferienplan greift");
eq(t("2026-08-18").plan.tag, "BETRIEB", "Di fällt auf days zurück");
eq(t("2026-08-16").kind, "weekend", "Sonntag bleibt Wochenende");
eq(t("2026-08-16").plan.tag, "PIZZERIA PM", "Wochenendplan auch in Ferien");
eq(t("2026-10-03").kind, "weekend", "3.10.2026 ist ein Samstag → Schicht");
eq(t("2026-05-14").kind, "holiday", "Himmelfahrt = ohne Wertung");
eq(t("2026-05-14").counts, false, "Feiertag zählt nicht");
eq(t("2026-09-15", { "2026-09-15": "krank" }).kind, "sick", "krank markiert");
eq(t("2026-09-15", { "2026-09-15": 1 }).kind, "off", "alte 1-Markierung → frei");
eq(t("2026-09-13", { "2026-09-13": "frei" }).counts, false, "frei am Wochenende zählt auch nicht");

// ---- Kern / Quote ----------------------------------------------------------
const plan = t("2026-09-14").plan;               // Schul-Montag
eq(L.scoredBlocks(plan).length, 5, "5 wertbare Blöcke am Schulmontag");
eq(L.coreIdsOf(plan, C), ["morgen", "anki", "lesen"], "Kern-IDs");
eq(L.coreDone(plan, ["morgen", "anki"], C), false, "Kern unvollständig");
eq(L.coreDone(plan, ["morgen", "anki", "lesen"], C), true, "Kern erfüllt");
eq(L.dayRatio(plan, ["morgen"]), 0.2, "Quote 1/5");
eq(L.dayMinutes(plan, ["morgen", "lesen"], C), { plan: 30 + 15 + 90 + 45 + 30, done: 75 },
   "Minuten geplant/erledigt");
eq(L.heatStep(null), 0, "heatStep leer");
eq(L.heatStep(1), 4, "heatStep voll");

// ---- Timeline --------------------------------------------------------------
const tlMid = L.timeline(plan, new Date(2026, 8, 14, 16, 30), C);
eq(tlMid.cur.id, "deutsch", "16:30 → Deutschblock läuft");
eq(tlMid.curLeft, 90, "endet um 18:00 → 90 min");
eq(tlMid.next.id, "lesen", "danach kommt Lesen");
eq(tlMid.nextIn, 90, "in 90 min");
const tlEarly = L.timeline(plan, new Date(2026, 8, 14, 5, 0), C);
eq(tlEarly.cur, null, "vor 5:30 läuft nichts");
eq(tlEarly.next.id, "morgen", "als Nächstes die Morgenroutine");
const tlLate = L.timeline(plan, new Date(2026, 8, 14, 23, 0), C);
eq(tlLate.cur.id, "frei", "abends der Frei-Block");
eq(tlLate.curLeft, null, "rechnerisch vorbei → keine Restzeit");

// ---- Monat -----------------------------------------------------------------
const today = new Date(2026, 8, 20, 12);   // So, 20.9.2026
const data = {
  v: 3,
  d: {
    "2026-09-14": ["morgen", "anki", "deutsch", "lesen", "nachber"], // voll
    "2026-09-15": ["morgen", "anki", "lesen"],                        // Kern
    "2026-09-16": ["morgen"],
  },
  f: { "2026-09-17": "krank" },
  n: { "2026-09-16": "Erörterung: Einleitung zu lang" },
  t: null, b: "",
};
const scan = L.monthScan(data, C, 2026, 8, today);
eq(scan.cells.length, 30, "September hat 30 Zellen");
eq(scan.cells[19].future, false, "der 20. ist nicht Zukunft");
eq(scan.cells[20].future, true, "der 21. schon");
eq(scan.fullDays, 1, "ein voller Tag");
eq(scan.coreDays, 2, "zwei Kern-Tage");
eq(scan.sick, 1, "ein Krankheitstag");
eq(scan.free, 0, "keine Feiertage im September");
eq(scan.counted, 19, "19 gewertete Tage bis zum 20.");
ok(scan.minsDone > 0 && scan.minsDone < scan.minsPlan, "Lernminuten plausibel");
const weak = L.weakestOf(scan);
ok(weak && weak.ratio === 0, "schwächste Gewohnheit gefunden");
eq(L.monthStats(data, today, C).elapsed, 20, "monthStats bleibt kompatibel");
// Vormonat: voll gewertet, keine Zukunft
const prev = L.monthScan(data, C, 2026, 7, today);
eq(prev.cells.filter((c) => c.future).length, 0, "Vormonat komplett gewertet");
eq(prev.upTo, 31, "August bis zum 31.");
// Folgemonat: nichts gewertet
const nxt = L.monthScan(data, C, 2026, 9, today);
eq(nxt.counted, 0, "Folgemonat zählt nicht");
eq(nxt.cells.every((c) => c.future), true, "Folgemonat ist ganz Zukunft");

// ---- Streak ----------------------------------------------------------------
eq(L.coreStreak(data, new Date(2026, 8, 16, 12), C), 2, "Streak 14.+15., 16. läuft noch");
eq(L.coreStreak(data, new Date(2026, 8, 15, 12), C), 2, "Streak am 15. selbst");
const dataGap = { ...data, d: { ...data.d, "2026-09-15": ["morgen"] } };
eq(L.coreStreak(dataGap, new Date(2026, 8, 16, 12), C), 0, "Lücke bricht die Streak");
// Krank am 17. darf die Kette nicht brechen
const dataSick = {
  ...data,
  d: { ...data.d, "2026-09-16": ["morgen", "anki", "lesen"], "2026-09-18": ["morgen", "anki", "lesen"] },
};
eq(L.coreStreak(dataSick, new Date(2026, 8, 18, 12), C), 4, "krank überbrückt die Streak");

// ---- Woche -----------------------------------------------------------------
const wk = L.weekStats(data, C, new Date(2026, 8, 16, 12)); // Mi
eq(wk.days.length, 7, "sieben Tage");
eq(wk.days[0].date.getDate(), 14, "Woche beginnt Montag den 14.");
eq(wk.days[2].isToday, true, "Mittwoch ist heute");
eq(wk.days[3].past, false, "Donnerstag liegt noch vor uns");
eq(wk.goal, 900, "Wochenziel aus den Defaults");
ok(wk.goalPct >= 0 && wk.goalPct <= 100, "Zielquote in Grenzen");
ok(wk.weekPlan > wk.planMin, "Restwoche ist noch Plan");

// ---- Prüfung ---------------------------------------------------------------
const ex = L.nextExam(new Date(2026, 8, 20, 12), C);
eq(ex.date, "2026-10-01", "nächster Termin");
eq(ex.days, 11, "11 Tage bis zum 1.10.");
const load = L.examLoad(new Date(2026, 8, 20, 12), ex, C, {});
ok(load.learnDays === 11 && load.deep > 0, "Restlast bis zur Prüfung");
eq(load.weekend, 2, "26./27.9. sind die einzigen Wochenendtage bis zum 1.10.");
ok(L.examLoad(new Date(2026, 8, 20, 12), ex, C, {}) === load, "examLoad cacht");
eq(L.nextExam(L.fromYmd("2030-01-01"), C), null, "kein Termin mehr");

// ---- Freier Tag voraus -----------------------------------------------------
// 3.10.2026 (Sa) und 1.11.2026 (So) fallen aufs Wochenende und sind deshalb
// keine geschenkten Tage — der nächste echte ist der 25.12.2026 (Fr).
eq(L.nextFreeDay(new Date(2026, 8, 20, 12), C, {}), null, "in 70 Tagen kein freier Werktag");
const nf = L.nextFreeDay(new Date(2026, 8, 20, 12), C, {}, 120);
eq(L.ymd(nf.date), "2026-12-25", "nächster freier Werktag: 1. Weihnachtstag");
eq(nf.label, "1. Weihnachtstag", "mit Namen");
eq(L.nextFreeDay(new Date(2026, 8, 20, 12), C, { "2026-09-22": "frei" }), null,
   "selbst markierte Tage sind kein geschenkter Feiertag");

// ---- Schlafenszeit ---------------------------------------------------------
eq(L.bedtimeFor(plan, C), { bed: 1320, wake: 330 }, "5:30 minus 7,5 h = 22:00");
eq(L.bedtimeFor(plan, { ...C, sleepHours: 0 }), null, "abgeschaltet");

// ---- Ferienliste veraltet --------------------------------------------------
eq(L.vacationsStale(new Date(2026, 8, 20, 12), C), null, "Liste reicht noch");
eq(L.vacationsStale(L.fromYmd("2027-06-01"), C), "2027-05-29", "Liste läuft aus");
eq(L.vacationsStale(new Date(), { vacations: [] }), "keine", "keine Ferien hinterlegt");

// ---- Konfiguration ---------------------------------------------------------
const merged = L.mergeConfig(C, { width: 520, days: { mo: { label: "Mo!", blocks: [{ id: "x", t: "9:00", nm: "X", kind: "deep", track: true }] } }, show: { week: false } });
eq(merged.width, 520, "width überschrieben");
eq(merged.days.di.label, "Dienstag", "andere Tage bleiben");
eq(merged.days.mo.label, "Mo!", "Montag ersetzt");
eq(merged.show.week, false, "show wird gemischt");
eq(merged.show.month, true, "restliche Schalter bleiben");
eq(L.shows(merged, "week"), false, "shows liest den Schalter");
eq(L.shows(merged, "gibtsnicht"), true, "unbekannt → an");
eq(L.validateConfig(C), [], "Defaults sind sauber");
const bad = L.mergeConfig(C, {
  days: { mo: { label: "x", blocks: [
    { id: "a", t: "9:00", nm: "A", track: true }, { id: "a", t: "10:00", nm: "B", track: true },
  ] } },
  vacations: [["2026-12-01", "2026-11-01", "Rückwärts"], ["kaputt"]],
  exams: [{ date: "1.10.2026", label: "falsch" }],
  core: ["gibtsnicht"], width: 2000,
});
const msgs = L.validateConfig(bad).join(" | ");
ok(/doppelt/.test(msgs), "doppelte Block-ID erkannt");
ok(/Ende liegt vor dem Beginn/.test(msgs), "Ferien rückwärts erkannt");
ok(/unbrauchbar/.test(msgs), "kaputter Ferieneintrag erkannt");
ok(/gültiges Datum/.test(msgs), "Prüfungsdatum erkannt");
ok(/gibtsnicht/.test(msgs), "toter Kern-Eintrag erkannt");
ok(/width/.test(msgs), "Breite außerhalb");
// Ein Tag ohne blocks darf nicht crashen
const thin = L.mergeConfig(C, { days: { mo: { note: "nur eine Notiz" } } });
eq(L.planOf(thin, "mo").note, "nur eine Notiz", "Notiz überlebt den Fallback");
eq(L.planOf(thin, "mo").blocks.length, 7, "Blöcke kommen aus den Defaults");
eq(L.labelOf(thin, "mo"), "Montag", "Label über den Fallback");
eq(L.freePlanOf(thin, "mo").label, "Montag", "Frei-Plan trägt den Wochentag");
eq(L.freePlanOf({ freeDay: {} }, "mo").blocks.length, 4, "kaputter freeDay → Default");

// ---- Statusdatei -----------------------------------------------------------
eq(L.parseState(""),
   { v: 4, d: {}, f: {}, n: {}, t: null, b: "", w: {},
     u: { compact: false, help: false }, broken: false }, "leer");
eq(L.parseState('{"w":{"2026-W34":["Deutsch","ReWe"]}}').w, { "2026-W34": ["Deutsch", "ReWe"] },
   "Wochenschwerpunkte gelesen");
eq(L.parseState('{"w":{"x":"kaputt","y":["a",7,""]}}').w, { y: ["a"] }, "nur Text-Schwerpunkte");
eq(L.parseState('{"u":{"compact":1,"help":false,"quatsch":9}}').u, { compact: true, help: false },
   "UI-Zustand normalisiert");
eq(L.parseState('{"d":{"2026-01-01":["a"]}}').d, { "2026-01-01": ["a"] }, "v1 gelesen");
eq(L.parseState('{"d":{},"f":{"2026-01-01":1}}').f, { "2026-01-01": "frei" }, "v2 migriert");
eq(L.parseState('{"f":{"x":"krank"}}').f, { x: "krank" }, "krank bleibt");
eq(L.parseState("kaputt{").broken, true, "defekte Datei erkannt");
eq(L.parseState("kaputt{").d, {}, "defekte Datei liefert leer");
eq(L.parseState('{"t":{"id":"deepA","start":1,"mins":60}}').t.id, "deepA", "Timer gelesen");
eq(L.parseState('{"t":{"nope":1}}').t, null, "unvollständiger Timer verworfen");
eq(L.parseState('{"n":{"a":"x","b":5}}').n, { a: "x" }, "nur Text-Notizen");
eq(L.parseState("[1,2]").d, {}, "Array ist kein Zustand");

// ---- Timer -----------------------------------------------------------------
const t0 = Date.now();
eq(L.timerLeft({ start: t0, mins: 25 }, t0), 25, "voller Timer");
eq(L.timerLeft({ start: t0 - 24 * 60000, mins: 25 }, t0), 1, "letzte Minute");
eq(L.timerLeft({ start: t0 - 26 * 60000, mins: 25 }, t0), -1, "abgelaufen");
eq(L.timerLeft(null, t0), null, "kein Timer");

// ---- Split / Quoting -------------------------------------------------------
const payload = '{"width":500}' + L.SPLIT + '{"d":{}}';
eq(L.splitPayload(payload), { config: '{"width":500}', state: '{"d":{}}' }, "Payload getrennt");
eq(L.splitPayload("nurstatus"), { config: "{}", state: "nurstatus" }, "ohne Marke");
eq(L.shq("a'b"), `'a'\\''b'`, "shq");
eq(L.asq('a"b\\c'), '"a\\"b\\\\c"', "asq");
eq(L.shortName("Aufgaben-Mix ReWe / KLR", 17), "Aufgaben-Mix ReW…", "shortName kürzt");
eq(L.shortName("Deep: X"), "Deep", "shortName schneidet am Doppelpunkt");

// ---- CSV -------------------------------------------------------------------
const csv = L.csvOf(scan, data, C);
const lines = csv.split("\r\n");
ok(csv.charCodeAt(0) === 0xfeff, "BOM für Excel");
ok(lines[0].includes('"Notiz"'), "Kopfzeile");
ok(lines.some((l) => l.includes("2026-09-17") && l.includes('"sick"')), "Krankheitstag im Export");
ok(lines.some((l) => l.includes("Einleitung zu lang")), "Notiz im Export");
eq(lines.filter((l) => l.startsWith('"2026-')).length, 20, "20 Zeilen bis zum 20.");
eq(L.csvOf(scan, { n: { "2026-09-14": 'er sagte "hi";' } }, C).includes('""hi"";'), true,
   "Anführungszeichen und Semikolon entschärft");

// ---- Gitter ----------------------------------------------------------------
const g = L.monthGrid(new Date(2026, 8, 1, 12));
eq(g.length, 1 + 30, "September 2026 beginnt an einem Dienstag");
eq(g[0], null, "eine Leerzelle vorweg");
eq(L.monthGrid(new Date(2026, 1, 1, 12)).length, 6 + 28, "Februar 2026 beginnt Sonntag");

// ---- Kalenderwoche ---------------------------------------------------------
// 1.1.2026 ist ein Donnerstag, gehört also samt Vorjahresrest in die KW 1.
eq(L.isoWeek(L.fromYmd("2026-01-01")), "2026-W01", "1.1.2026 = KW 1");
eq(L.isoWeek(L.fromYmd("2025-12-29")), "2026-W01", "29.12.2025 zählt schon zu 2026");
eq(L.isoWeek(L.fromYmd("2025-12-28")), "2025-W52", "28.12.2025 noch KW 52");
eq(L.isoWeek(L.fromYmd("2026-12-31")), "2026-W53", "2026 hat 53 Wochen");
eq(L.isoWeek(L.fromYmd("2027-01-01")), "2026-W53", "1.1.2027 gehört noch zu 2026");
eq(L.isoWeek(L.fromYmd("2026-08-17")), "2026-W34", "17.8.2026 = KW 34");
// Alle sieben Tage einer Woche ergeben denselben Schlüssel
const wkKeys = new Set();
for (let i = 0; i < 7; i++) wkKeys.add(L.isoWeek(L.fromYmd(`2026-08-${17 + i}`)));
eq(wkKeys.size, 1, "Mo–So teilen einen Wochenschlüssel");
eq(L.ymd(L.mondayOf(L.fromYmd("2026-08-20"))), "2026-08-17", "Montag der Woche");
eq(L.ymd(L.mondayOf(L.fromYmd("2026-08-16"))), "2026-08-10", "Sonntag gehört zur Vorwoche");

// ---- Feierabend / Nachtrags-Erinnerung -------------------------------------
eq(L.allDone(plan, ["morgen", "anki", "deutsch", "lesen", "nachber"]), true, "alles erledigt");
eq(L.allDone(plan, ["morgen", "anki", "lesen"]), false, "Kern ist nicht alles");
eq(L.allDone({ blocks: [] }, []), false, "ohne Blöcke kein Feierabend");
// 19.9. (Sa) und 18.9. (Fr) haben keine Einträge → der jüngste zählende Tag meldet sich
const miss = L.missedYesterday(data, C, new Date(2026, 8, 20, 12));
eq(miss && miss.key, "2026-09-19", "gestern nichts eingetragen");
eq(miss.days, 1, "ein Tag her");
// Krank am 17.: wird übersprungen, der 16. hat Einträge → keine Erinnerung
eq(L.missedYesterday(data, C, new Date(2026, 8, 18, 12)), null,
   "kranker Tag löst keine Erinnerung aus");
eq(L.missedYesterday({ d: {}, f: {} }, C, new Date(2026, 8, 20, 12)).days, 1,
   "leerer Zustand meldet den Vortag");

// ---- Wochenvergleich -------------------------------------------------------
const pw = L.prevWeekStats(data, C, new Date(2026, 8, 16, 12));
eq(L.ymd(pw.monday), "2026-09-07", "Vorwoche beginnt am 7.9.");
eq(pw.days.length, 7, "Vorwoche hat auch sieben Tage");
eq(pw.doneMin, 0, "in der Vorwoche war nichts eingetragen");
eq(wk.week, "2026-W38", "Wochenschlüssel der laufenden Woche");
ok(wk.doneMin - pw.doneMin > 0, "diese Woche liegt vorn");

// ---- Render (Rauchtest) ----------------------------------------------------
globalThis.h = (tag, props, ...kids) => ({ tag, props, kids });
globalThis.Fragment = "frag";
const st = { data, err: null, note: null, view: null, mOff: 0, warn: [] };
ok(L.render(st).tag === "div", "render liefert ein Element");
ok(L.render({ ...st, view: "2026-09-15" }).tag === "div", "Nachtragsansicht rendert");
ok(L.render({ ...st, mOff: -1 }).tag === "div", "Vormonat rendert");
ok(L.render({ ...st, data: {} }).tag === "div", "leerer Zustand rendert");
ok(L.render({ ...st, data: { d: {}, f: {}, t: { id: "x", nm: "X", mins: 60, start: Date.now() } } }).tag === "div",
   "laufender Timer rendert");
ok(L.render({ ...st, warn: ["a", "b", "c", "d"], err: "x", note: "y" }).tag === "div", "Hinweise rendern");
ok(L.render(null).tag === "div", "kaputter Zustand fällt auf die Fehlerbremse");
// Neue Bedienelemente
ok(L.render({ ...st, data: { ...data, u: { compact: true } } }).tag === "div", "Kompaktmodus rendert");
ok(L.render({ ...st, data: { ...data, u: { help: true } } }).tag === "div", "Hilfe rendert");
ok(L.render({ ...st, data: { ...data, w: { "2026-W38": ["Deutsch", "ReWe"] } } }).tag === "div",
   "Schwerpunkte rendern");
ok(L.render({ ...st, data: { ...data, t: { id: L.BREAK_ID, nm: "Pause", mins: 5, start: Date.now() } } }).tag === "div",
   "Pausen-Timer rendert");
// Fehlende Konfiguration schaltet den Einrichtungskasten frei
const noCfg = L.updateState({ type: "LOAD", raw: L.NO_CONFIG + L.SPLIT + "{}", rev: 0 }, L.initialState);
eq(noCfg.err, null, "fehlende Konfiguration ist kein Fehler");
eq(noCfg.warn, [], "und keine Warnung");
ok(L.render(noCfg).tag === "div", "Einrichtungskasten rendert");
// Rückgängig ist ohne Klick nicht verfügbar
eq(L.undoable(Date.now()), null, "kein Rückgängig ohne Änderung");

// ---- Updatestate / Reducer -------------------------------------------------
const s0 = L.initialState;
const loaded = L.updateState({ type: "LOAD", raw: '{"width":480}' + L.SPLIT + '{"d":{"x":["a"]}}', rev: 0 }, s0);
eq(loaded.data.d, { x: ["a"] }, "LOAD übernimmt den Zustand");
eq(loaded.err, null, "LOAD ohne Fehler");
const broken = L.updateState({ type: "LOAD", raw: "{nope" + L.SPLIT + "{}", rev: 0 }, s0);
ok(/kein gültiges JSON/.test(broken.err), "kaputte Konfiguration meldet sich");
const warned = L.updateState({ type: "LOAD", raw: '{"core":["nix"]}' + L.SPLIT + "{}", rev: 0 }, s0);
ok(warned.warn.length === 1, "Konfigurationswarnung landet im Zustand");
eq(L.updateState({ type: "MONTH", off: -2 }, s0).mOff, -2, "Monat blättern");
eq(L.updateState({ type: "VIEW", key: "2026-09-01" }, s0).view, "2026-09-01", "Tag wählen");
eq(L.updateState({ type: "ERR", error: "x" }, s0).err, "x", "Fehler");
eq(L.updateState({ type: "NOTE", note: "x" }, s0).note, "x", "Meldung");
const staleView = L.updateState({ type: "NOTE", note: "n" },
  { ...s0, view: "2026-01-01", viewAt: Date.now() - 999 * 60000 });
eq(staleView.view, null, "alte Nachtragsansicht läuft ab");

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
