// ============================================================================
//  LERNPLAN-WIDGET v7  ·  Übersicht (tracesof.net/uebersicht)
//
//  Interaktiv abhakbar · Tagesplan aus Wochenplan v2 · Monats-Heatmap
//  Kennt Schulferien und Feiertage in Baden-Württemberg · Prüfungs-Countdown
//
//  Neu gegenüber v6 — dieser Durchgang ging auf die Bedienung
//    · "?" blendet eine Kurzhilfe ein: was ist wo klickbar
//    · Kompaktmodus "⌄" klappt Woche und Monat weg — halbe Höhe
//    · Rückgängig für den letzten Klick (60 Sekunden lang)
//    · Erster Start ohne Konfiguration: ein Knopf legt sie an, einer öffnet sie
//    · Wochenschwerpunkte — zwei Themen, die ganze Woche im Blick
//    · Fokus-Timer: "+10′" verlängern, "Pause" als eigener Timer
//    · Erinnerung, wenn gestern nichts eingetragen wurde
//    · "Feierabend", sobald alles Wertbare erledigt ist
//    · Wochenvergleich: gleicher Wochentag gegen die Vorwoche
//
//  Ablage:  Übersicht-Menüleistensymbol → "Open Widgets Folder" → hier ablegen
//  Klicken: Übersicht-Einstellungen → Interaktions-Shortcut festlegen +
//           Systemeinstellungen → Datenschutz & Sicherheit → Bedienungshilfen
//
//  ANPASSEN: nicht in dieser Datei, sondern in  ~/.lernplan-config.json.
//  Fehlt sie, bietet das Widget beim Start an, sie anzulegen. Alles, was dort
//  steht, überschreibt die Defaults unten — ein Update des Widgets löscht
//  deine Einstellungen also nicht.
//  Einzige Ausnahme bleibt `pos`: die Position wird von Übersicht einmal beim
//  Laden gelesen, bevor die Konfigurationsdatei da ist, und steht deshalb
//  weiterhin hier unten in den DEFAULTS.
// ============================================================================

import { run } from "uebersicht";

// ============================================================================
//  1 · DEFAULTS  (von ~/.lernplan-config.json überschreibbar)
// ============================================================================

export const DEFAULTS = {
  // ---- Platzierung & Größe -------------------------------------------------
  //  Position auf dem Schreibtisch. Steht das Dock unten und verdeckt das
  //  Widget, "bottom" auf etwa 110 erhöhen. Nur hier änderbar, siehe oben.
  pos: { bottom: 36, left: 36 },
  width: 470,
  scale: 1.0,

  // ---- Abschnitte ein- und ausblenden --------------------------------------
  //  Wer es knapper mag, schaltet hier einzelne Teile ab.
  show: {
    now: true,        // Streifen "jetzt / als Nächstes"
    countdown: true,  // Prüfungs-Countdown
    budget: true,     // Zeitbudget des Tages
    week: true,       // Wochenleiste Mo–So
    peek: true,       // Vorschau auf morgen
    month: true,      // Monats-Heatmap
    timer: true,      // Fokus-Timer je Block
    notes: true,      // Tagesnotiz
    bedtime: true,    // Hinweis auf die Schlafenszeit am Abend
    topics: true,     // Schwerpunkte der Woche
    remind: true,     // Erinnerung, wenn gestern nichts eingetragen wurde
  },

  // ---- Pausen --------------------------------------------------------------
  breakMin: 5,        // Länge der Pause, die der Timer-Streifen anbietet
  extendMin: 10,      // Schrittweite von "+10′"

  // ---- Minimal-Kern: entscheidet über Streak und "Tag gerettet" ------------
  core: ["morgen", "anki", "lesen"],

  // ---- Zeit ----------------------------------------------------------------
  weeklyGoalMin: 900,   // Wochenziel in Minuten reiner Lernzeit (0 = aus)
  sleepHours: 7.5,      // für den Schlafenszeit-Hinweis am Abend
  overdueAfterMin: 60,  // ab wann ein verpasster Block als "offen" gilt
  autoBackup: true,     // einmal täglich nach ~/.lernplan-backups sichern

  // ---- Voreingestellte Dauer je Art, falls im Namen keine Minute steht -----
  //  "Lesen 45′" wird automatisch als 45 Minuten gelesen; steht nichts da,
  //  greift diese Tabelle. Einzelne Blöcke können `min: 20` mitbringen.
  durations: { morg: 30, anki: 15, deep: 60, wdh: 45, lese: 45, frei: 0, fix: 0 },

  // ---- Termine für den Countdown ------------------------------------------
  //  ACHTUNG: Die IHK-Termine sind die bundeseinheitlichen Termine der AkA.
  //  Welcher für DICH gilt, hängt vom Ausbildungshalbjahr und einer möglichen
  //  Verkürzung ab — mit deiner IHK abgleichen und hier korrigieren.
  exams: [
    { date: "2026-10-01", label: "IHK Teil 1 (falls verkürzt)" },
    { date: "2027-02-25", label: "IHK Teil 1" },
  ],

  // ---- Schulferien Baden-Württemberg (Kultusministerium BW) ----------------
  //  Format: [von, bis einschließlich, Name]
  vacations: [
    ["2025-07-31", "2025-09-13", "Sommerferien"],
    ["2025-10-27", "2025-10-30", "Herbstferien"],
    ["2025-12-22", "2026-01-05", "Weihnachtsferien"],
    ["2026-03-30", "2026-04-11", "Osterferien"],
    ["2026-05-26", "2026-06-05", "Pfingstferien"],
    ["2026-07-30", "2026-09-12", "Sommerferien"],
    ["2026-10-26", "2026-10-30", "Herbstferien"],
    ["2026-12-23", "2027-01-09", "Weihnachtsferien"],
    ["2027-03-30", "2027-04-03", "Osterferien"],
    ["2027-05-18", "2027-05-29", "Pfingstferien"],
  ],

  // ---- Tagesplan Schulzeit -------------------------------------------------
  //  kind:  morg | anki | deep | wdh | lese | frei | fix
  //  track: true  = abhakbar und zählt in die Quote
  //         false = Fixtermin, nur Kontext
  //  opt:   true  = abhakbar, zählt aber nicht in die Quote
  //  min:   Dauer in Minuten, überschreibt die Erkennung aus dem Namen
  days: {
    mo: {
      label: "Montag", tag: "SCHULTAG", hot: true,
      note: "Dein bester Lerntag · gehört Deutsch",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", kind: "morg", track: true },
        { id: "schule", t: "7:45", nm: "Schule", sub: "bis 14:45 · 15:15 daheim", kind: "fix" },
        { id: "anki", t: "15:20", nm: "Anki 15′", sub: "direkt nach Ankunft", kind: "anki", track: true },
        { id: "deutsch", t: "16:00", nm: "Deutsch-Schreibtraining", sub: "FOKUS 90′ · Erörterung unter Zeit", kind: "deep", track: true },
        { id: "lesen", t: "18:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "nachber", t: "19:30", nm: "Nachbereiten", sub: "Mitschrift → 5–10 Anki-Karten", kind: "wdh", track: true, min: 30 },
        { id: "frei", t: "20:00", nm: "Frei", kind: "frei" },
      ],
    },
    di: {
      label: "Dienstag", tag: "BETRIEB",
      note: "Abends nur leicht wiederholen",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00 · 16:40 daheim", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "wdh", t: "17:15", nm: "Wiederholen 45′", sub: "WiSo / BWL · gemischte Aufgaben", kind: "wdh", track: true },
        { id: "lesen", t: "18:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "ab 19", nm: "Frei", kind: "frei" },
      ],
    },
    mi: {
      label: "Mittwoch", tag: "SCHULE + BETRIEB",
      note: "Zeiten an Stundenplan anpassen",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "schule", t: "7:45", nm: "Berufsschule", sub: "bis ca. 11:10", kind: "fix" },
        { id: "betrieb", t: "11:45", nm: "Betrieb", sub: "bis 16:00 · 16:40 daheim", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "englisch", t: "17:15", nm: "Englisch 45′", sub: "Vokabelkarten + 1 Übung", kind: "wdh", track: true },
        { id: "lesen", t: "18:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "ab 19", nm: "Frei", kind: "frei" },
      ],
    },
    do: {
      label: "Donnerstag", tag: "BETRIEB", rest: true,
      note: "Lern-Off-Tag · bewusst",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00", kind: "fix" },
        { id: "anki", t: "16:40", nm: "Anki 10′", sub: "nur der Kern — dann ist frei", kind: "anki", track: true },
        { id: "frei", t: "17:00", nm: "Freundin & Erholung", sub: "geschützt", kind: "frei" },
        { id: "lesen", t: "opt.", nm: "Lesen, wenn es reinpasst", kind: "lese", track: true, opt: true },
      ],
    },
    fr: {
      label: "Freitag", tag: "BETRIEB",
      note: "Woche abschließen",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00 · 16:40 daheim", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "review", t: "17:15", nm: "Wochen-Review 15′", sub: "WE-Themen · Material rauslegen", kind: "wdh", track: true },
        { id: "lesen", t: "18:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "ab 19", nm: "Frei · Woche geschafft", kind: "frei" },
      ],
    },
    sa: {
      label: "Samstag", tag: "PIZZERIA PM", hot: true,
      note: "Deep-Work-Vormittag · Rechnen",
      blocks: [
        { id: "morgen", t: "7:00", nm: "Morgenroutine", sub: "später · Schlaf schützen", kind: "morg", track: true },
        { id: "anki", t: "8:45", nm: "Anki 15′", sub: "Warm-up", kind: "anki", track: true },
        { id: "deepA", t: "9:00", nm: "Deutsch intensiv", sub: "DEEP A 60′ · Fehlerprotokoll → 1 Text", kind: "deep", track: true },
        { id: "deepB", t: "10:15", nm: "Aufgaben-Mix ReWe / KLR", sub: "DEEP B 60′ · Interleaving · Teil 1 = 25 %", kind: "deep", track: true },
        { id: "lesen", t: "12:30", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "13:15", nm: "Frei", kind: "frei" },
        { id: "pizza", t: "16:50", nm: "Pizzeria", sub: "bis 21:00", kind: "fix" },
      ],
    },
    so: {
      label: "Sonntag", tag: "PIZZERIA PM", hot: true,
      note: "Deep Work + Planung",
      blocks: [
        { id: "morgen", t: "7:00", nm: "Morgenroutine", sub: "später · Schlaf schützen", kind: "morg", track: true },
        { id: "anki", t: "8:45", nm: "Anki 15′", sub: "Warm-up", kind: "anki", track: true },
        { id: "deepA", t: "9:00", nm: "Englisch intensiv", sub: "DEEP A 60′ · Business English + schreiben", kind: "deep", track: true },
        { id: "deepB", t: "10:15", nm: "Feynman: Erklären", sub: "DEEP B 60′ · trainiert das Fachgespräch", kind: "deep", track: true },
        { id: "wplan", t: "11:30", nm: "Wochenplanung 30′", sub: "2 Schwerpunkte · Arbeiten checken", kind: "wdh", track: true },
        { id: "lesen", t: "12:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "pizza", t: "16:50", nm: "Pizzeria", sub: "bis 21:00", kind: "fix" },
      ],
    },
  },

  // ---- Tagesplan Schulferien ----------------------------------------------
  //  Nur die Tage, die sich von der Schulzeit unterscheiden. Alles andere
  //  fällt automatisch auf `days` zurück (Sa/So bleiben also gleich).
  //  Ohne Berufsschule ist abends real mehr Kapazität → Montag behält einen
  //  verkürzten Deutschblock, Mittwoch bekommt seinen Englischblock später.
  vacationDays: {
    mo: {
      label: "Montag", tag: "FERIEN · BETRIEB", hot: true,
      note: "Keine Schule — Deutschblock am Abend",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00 · 16:40 daheim", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "deutsch", t: "17:15", nm: "Deutsch-Schreibtraining", sub: "FOKUS 60′ · Ferienversion · Erörterung unter Zeit", kind: "deep", track: true },
        { id: "lesen", t: "18:30", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "ab 19:30", nm: "Frei", kind: "frei" },
      ],
    },
    mi: {
      label: "Mittwoch", tag: "FERIEN · BETRIEB",
      note: "Keine Berufsschule — Englisch am Abend",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00 · 16:40 daheim", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "englisch", t: "17:15", nm: "Englisch 45′", sub: "Vokabelkarten + 1 Übung", kind: "wdh", track: true },
        { id: "lesen", t: "18:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "ab 19", nm: "Frei", kind: "frei" },
      ],
    },
  },

  // ---- Tagesplan für Feiertage, Urlaub und Krankheit -----------------------
  //  Dieser Tag zählt NICHT in die Monatsquote und bricht die Streak nicht.
  freeDay: {
    label: "", tag: "FREI", rest: true,
    note: "Zählt nicht in die Quote — Erholung ist eingeplant",
    blocks: [
      { id: "morgen", t: "8:00", nm: "Morgenroutine", sub: "in Ruhe", kind: "morg", track: true },
      { id: "anki", t: "10:00", nm: "Anki 15′", sub: "hält die Kette am Laufen", kind: "anki", track: true },
      { id: "lesen", t: "opt.", nm: "Lesen 45′", kind: "lese", track: true },
      { id: "frei", t: "—", nm: "Erholung", sub: "kein schlechtes Gewissen", kind: "frei" },
    ],
  },
};

// Wird beim Start aus ~/.lernplan-config.json überschrieben.
let CONFIG = DEFAULTS;
// Zählt hoch, sobald eine neue Konfiguration greift — invalidiert die Caches.
let CFG_REV = 0;

/**
 * Zusammenführung: gesetzte Schlüssel der Nutzerdatei gewinnen.
 * `days`, `vacationDays`, `show` und `durations` werden pro Schlüssel
 * gemischt — man kann also einen einzelnen Tag oder einen einzelnen Schalter
 * überschreiben, ohne alle auflisten zu müssen.
 */
export function mergeConfig(base, user) {
  if (!user || typeof user !== "object") return base;
  const deep = ["days", "vacationDays", "show", "durations", "pos"];
  const out = { ...base };
  for (const k of Object.keys(user)) {
    const v = user[k];
    if (v === null || v === undefined) continue;
    if (deep.includes(k) && typeof v === "object" && !Array.isArray(v)) {
      out[k] = { ...base[k], ...v };
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Liefert immer einen benutzbaren Plan — auch bei lückenhafter Konfiguration. */
export function planOf(cfg, dk, which = "days") {
  const src = (cfg && cfg[which]) || {};
  const p = src[dk];
  if (p && Array.isArray(p.blocks) && p.blocks.length) return p;
  if (which !== "days") return null;
  const fb = DEFAULTS.days[dk];
  return { ...fb, note: (p && p.note) || fb.note };
}

export function labelOf(cfg, dk) {
  return planOf(cfg, dk).label || DEFAULTS.days[dk].label;
}

/** Frei-Tag-Plan, gegen fehlerhafte Konfiguration abgesichert. */
export function freePlanOf(cfg, dk) {
  const f = cfg && cfg.freeDay;
  const base = (f && Array.isArray(f.blocks) && f.blocks.length) ? f : DEFAULTS.freeDay;
  return { ...base, label: labelOf(cfg, dk) };
}

/** Ein Schalter aus `show`, Default true. */
export function shows(cfg, k) {
  const s = (cfg && cfg.show) || {};
  return s[k] !== false;
}

const DAY_KEYS = ["so", "mo", "di", "mi", "do", "fr", "sa"]; // getDay(): 0 = So

/**
 * Prüft die zusammengeführte Konfiguration auf Fehler, die sonst still
 * danebengehen — doppelte Block-IDs koppeln zwei Häkchen aneinander, ein
 * Kern-Eintrag ohne passenden Block macht "Tag gerettet" unerreichbar.
 */
export function validateConfig(cfg) {
  const out = [];
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s));

  for (const v of cfg.vacations || []) {
    if (!Array.isArray(v) || v.length < 3 || !isDate(v[0]) || !isDate(v[1])) {
      out.push(`Ferieneintrag unbrauchbar: ${JSON.stringify(v)} — erwartet ["von","bis","Name"]`);
      continue;
    }
    if (v[1] < v[0]) out.push(`Ferien "${v[2]}": Ende liegt vor dem Beginn`);
  }
  for (const e of cfg.exams || []) {
    if (!e || !isDate(e.date)) out.push(`Termin ohne gültiges Datum: ${JSON.stringify(e)}`);
  }

  const known = new Set();
  const scan = (src, wo) => {
    for (const dk of Object.keys(src || {})) {
      if (wo !== "freeDay" && !DAY_KEYS.includes(dk)) {
        out.push(`Unbekannter Wochentag "${dk}" in ${wo} — erlaubt: mo di mi do fr sa so`);
        continue;
      }
      const p = wo === "freeDay" ? src : src[dk];
      const seen = new Set();
      for (const b of (p && p.blocks) || []) {
        if (!b || !b.id) { out.push(`${wo}/${dk}: Block ohne id`); continue; }
        known.add(b.id);
        if (seen.has(b.id)) {
          out.push(`${wo}/${dk}: Block-ID "${b.id}" kommt doppelt vor — die Häkchen wären gekoppelt`);
        }
        seen.add(b.id);
      }
      if (wo === "freeDay") break;
    }
  };
  scan(cfg.days, "days");
  scan(cfg.vacationDays, "vacationDays");
  for (const b of (cfg.freeDay && cfg.freeDay.blocks) || []) if (b && b.id) known.add(b.id);

  for (const id of cfg.core || []) {
    if (!known.has(id)) out.push(`Kern-Eintrag "${id}" kommt in keinem Tagesplan vor`);
  }
  if (cfg.statePath && statePathOf(cfg) === STATE_FILE) {
    out.push("statePath enthält Zeichen, die die Shell ausführen würde — ignoriert");
  }
  const w = Number(cfg.width);
  if (!(w >= 320 && w <= 900)) out.push(`width ${cfg.width} liegt außerhalb 320–900`);
  const s = Number(cfg.scale);
  if (!(s >= 0.6 && s <= 2)) out.push(`scale ${cfg.scale} liegt außerhalb 0.6–2`);
  return out;
}

// ============================================================================
//  2 · Kalender
// ============================================================================

/** Lokales Datum als YYYY-MM-DD (NICHT toISOString — das wäre UTC). */
export function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-08-13" → Date (12:00 Ortszeit, damit Sommerzeit nie kippt). */
export function fromYmd(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function dayKey(d) {
  return DAY_KEYS[d.getDay()];
}

/**
 * ISO-Kalenderwoche als "2026-W34" — Schlüssel für die Wochenschwerpunkte.
 * Maßgeblich ist der Donnerstag der Woche, deshalb kann der Jahreswechsel
 * mitten in einer Woche liegen, ohne dass zwei Schlüssel entstehen.
 */
export function isoWeek(d) {
  const thu = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  thu.setDate(thu.getDate() - ((thu.getDay() + 6) % 7) + 3);
  const year = thu.getFullYear();
  const jan4 = new Date(year, 0, 4, 12);
  const week1 = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7) + 3, 12);
  const n = Math.round((thu.getTime() - week1.getTime()) / (7 * 86400000)) + 1;
  return `${year}-W${String(n).padStart(2, "0")}`;
}

/** Montag der Woche, in der das Datum liegt. */
export function mondayOf(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7), 12);
}

/** Ostersonntag nach der Gaußschen Osterformel (gregorianisch). */
export function easterSunday(y) {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day, 12, 0, 0);
}

function plusDays(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function buildHolidaysBW(year) {
  const e = easterSunday(year);
  const out = {
    [`${year}-01-01`]: "Neujahr",
    [`${year}-01-06`]: "Heilige Drei Könige",
    [`${year}-05-01`]: "Tag der Arbeit",
    [`${year}-10-03`]: "Tag der Deutschen Einheit",
    [`${year}-11-01`]: "Allerheiligen",
    [`${year}-12-25`]: "1. Weihnachtstag",
    [`${year}-12-26`]: "2. Weihnachtstag",
  };
  out[ymd(plusDays(e, -2))] = "Karfreitag";
  out[ymd(plusDays(e, 1))] = "Ostermontag";
  out[ymd(plusDays(e, 39))] = "Christi Himmelfahrt";
  out[ymd(plusDays(e, 50))] = "Pfingstmontag";
  out[ymd(plusDays(e, 60))] = "Fronleichnam";
  return out;
}

//  Gemerkt statt neu gerechnet: dayInfo läuft pro Render über den ganzen
//  Monat plus die Tage bis zur Prüfung — das wären sonst Hunderte Osterformeln.
const HOLIDAY_CACHE = {};

/** Gesetzliche Feiertage in Baden-Württemberg: { "YYYY-MM-DD": "Name" }. */
export function holidaysBW(year) {
  if (!HOLIDAY_CACHE[year]) HOLIDAY_CACHE[year] = buildHolidaysBW(year);
  return HOLIDAY_CACHE[year];
}

/** Name der Ferien, in die das Datum fällt — sonst null. */
export function vacationName(key, cfg) {
  for (const v of cfg.vacations || []) {
    if (Array.isArray(v) && key >= v[0] && key <= v[1]) return v[2];
  }
  return null;
}

/** Alte Markierung (1) und neue ("frei" / "krank") auf einen Nenner bringen. */
export function markInfo(mark) {
  if (!mark) return null;
  if (mark === "krank") return { kind: "sick", label: "Krank gemeldet", badge: "krank" };
  return { kind: "off", label: "Frei markiert", badge: "frei" };
}

/** Klickreihenfolge der Markierung: nichts → frei → krank → nichts. */
export const MARK_CYCLE = [null, "frei", "krank"];

/**
 * Alles, was über einen Tag zu wissen ist.
 *   kind:   "school" | "vacation" | "holiday" | "off" | "sick" | "weekend"
 *   counts: fließt der Tag in Monatsquote und Streak ein?
 */
export function dayInfo(date, cfg, marks) {
  const key = ymd(date);
  const dk = dayKey(date);
  const weekend = dk === "sa" || dk === "so";
  const holiday = holidaysBW(date.getFullYear())[key] || null;
  const vac = vacationName(key, cfg);
  const mark = markInfo(marks && marks[key]);

  // Selbst markiert (Urlaub, krank) — hat Vorrang vor allem anderen.
  if (mark) {
    // Gilt auch am Wochenende — krank ist krank, egal ob eine Schicht ansteht.
    return { key, dk, kind: mark.kind, counts: false, label: mark.label,
             plan: freePlanOf(cfg, dk) };
  }
  // Gesetzlicher Feiertag an einem Werktag: weder Schule noch Betrieb
  if (holiday && !weekend) {
    return { key, dk, kind: "holiday", counts: false, label: holiday,
             plan: freePlanOf(cfg, dk) };
  }
  // Wochenende bleibt Wochenende — auch in den Ferien
  if (weekend) {
    return { key, dk, kind: "weekend", counts: true, label: vac || null,
             plan: planOf(cfg, dk) };
  }
  // Schulferien an einem Werktag: Berufsschule fällt aus
  if (vac) {
    return { key, dk, kind: "vacation", counts: true, label: vac,
             plan: planOf(cfg, dk, "vacationDays") || planOf(cfg, dk) };
  }
  return { key, dk, kind: "school", counts: true, label: null, plan: planOf(cfg, dk) };
}

/** Nächster Tag ohne Wertung (Feiertag oder selbst markiert) im Umkreis. */
export function nextFreeDay(today, cfg, marks, horizon = 70) {
  for (let i = 1; i <= horizon; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 12);
    const info = dayInfo(d, cfg, marks);
    if (info.kind === "holiday") return { date: d, days: i, label: info.label };
  }
  return null;
}

// ============================================================================
//  3 · Auswertung
// ============================================================================

/** Blöcke eines Plans, die in die Quote zählen. */
export function scoredBlocks(plan) {
  if (!plan || !plan.blocks) return [];
  return plan.blocks.filter((b) => b.track && !b.opt);
}

/**
 * Dauer eines Blocks in Minuten.
 * Reihenfolge: `min` aus der Konfiguration → Zahl im Namen ("Lesen 45′",
 * "FOKUS 90′") → Voreinstellung je Art.
 */
export function blockMinutes(b, cfg) {
  if (!b) return 0;
  if (Number.isFinite(b.min)) return Math.max(0, b.min);
  const m = /(\d{1,3})\s*(?:′|'|min\b|Min\b)/.exec(`${b.nm || ""} ${b.sub || ""}`);
  if (m) return Number(m[1]);
  const tbl = (cfg && cfg.durations) || DEFAULTS.durations;
  const v = tbl[b.kind];
  return Number.isFinite(v) ? v : 0;
}

/** Geplante und erledigte Minuten eines Tages. */
export function dayMinutes(plan, doneIds, cfg) {
  const set = new Set(doneIds || []);
  let plan_ = 0, done = 0;
  for (const b of scoredBlocks(plan)) {
    const m = blockMinutes(b, cfg);
    plan_ += m;
    if (set.has(b.id)) done += m;
  }
  return { plan: plan_, done };
}

/** Erfüllungsgrad 0…1, oder null wenn nichts zählbar ist. */
export function dayRatio(plan, doneIds) {
  const blocks = scoredBlocks(plan);
  if (!blocks.length) return null;
  const set = new Set(doneIds || []);
  return blocks.filter((b) => set.has(b.id)).length / blocks.length;
}

/** Die Kern-IDs, die es an diesem Tag überhaupt gibt. */
export function coreIdsOf(plan, cfg) {
  if (!plan || !plan.blocks) return [];
  return plan.blocks
    .filter((b) => b.track && !b.opt && (cfg.core || []).includes(b.id))
    .map((b) => b.id);
}

/** Ist der Minimal-Kern des Tages erfüllt? */
export function coreDone(plan, doneIds, cfg) {
  const needed = coreIdsOf(plan, cfg);
  if (!needed.length) return false;
  const set = new Set(doneIds || []);
  return needed.every((id) => set.has(id));
}

const doneOf = (data, key) => (data && data.d && data.d[key]) || [];

/**
 * Ein Durchgang durch einen Monat — liefert Zellen für die Heatmap, die
 * Kennzahlen und die Schwachstellen-Auswertung in einem Rutsch. Vorher lief
 * jede dieser drei Auswertungen ihre eigene Schleife über denselben Monat.
 *
 * `today` bestimmt, wie weit gewertet wird: der laufende Monat nur bis heute,
 * vergangene Monate ganz, künftige gar nicht.
 */
export function monthScan(data, cfg, year, month, today) {
  const marks = (data && data.f) || {};
  const len = new Date(year, month + 1, 0).getDate();
  const cmp = (year - today.getFullYear()) * 12 + (month - today.getMonth());
  const upTo = cmp < 0 ? len : cmp > 0 ? 0 : today.getDate();

  const cells = [];
  const per = {};
  let done = 0, possible = 0, minsDone = 0, minsPlan = 0;
  let fullDays = 0, coreDays = 0, free = 0, sick = 0, counted = 0;

  for (let day = 1; day <= len; day++) {
    const d = new Date(year, month, day, 12);
    const info = dayInfo(d, cfg, marks);
    const ids = doneOf(data, info.key);
    const set = new Set(ids);
    const blocks = scoredBlocks(info.plan);
    const hit = blocks.filter((b) => set.has(b.id)).length;
    const future = day > upTo;
    cells.push({
      date: d, info, hit, total: blocks.length, future,
      ratio: blocks.length ? hit / blocks.length : null,
    });
    if (future) continue;
    if (!info.counts) {
      if (info.kind === "sick") sick++; else free++;
      continue;
    }
    counted++;
    possible += blocks.length;
    done += hit;
    const mins = dayMinutes(info.plan, ids, cfg);
    minsPlan += mins.plan;
    minsDone += mins.done;
    if (blocks.length && hit === blocks.length) fullDays++;
    if (coreDone(info.plan, ids, cfg)) coreDays++;
    for (const b of blocks) {
      if (!per[b.id]) per[b.id] = { done: 0, poss: 0, nm: b.nm };
      per[b.id].poss++;
      if (set.has(b.id)) per[b.id].done++;
    }
  }

  return {
    year, month, cells, per, counted, free, sick, skipped: free + sick,
    done, possible, minsDone, minsPlan, fullDays, coreDays, upTo,
    pct: possible ? Math.round((done / possible) * 100) : 0,
  };
}

/** Rückwärtskompatibler Aufruf für den laufenden Monat. */
export function monthStats(data, today, cfg) {
  const s = monthScan(data || {}, cfg, today.getFullYear(), today.getMonth(), today);
  return { ...s, elapsed: today.getDate() };
}

/**
 * Streak = aufeinanderfolgende Tage mit erfülltem Minimal-Kern.
 * Nicht zählende Tage (Urlaub, Feiertag) unterbrechen die Streak nicht,
 * verlängern sie aber auch nicht. Der laufende Tag zieht sie nicht herunter.
 */
export function coreStreak(data, today, cfg) {
  const marks = (data && data.f) || {};
  let n = 0;
  const cur = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const info0 = dayInfo(cur, cfg, marks);
  if (info0.counts && coreDone(info0.plan, doneOf(data, info0.key), cfg)) n++;
  cur.setDate(cur.getDate() - 1);
  for (let guard = 0; guard < 400; guard++) {
    const info = dayInfo(cur, cfg, marks);
    if (info.counts) {
      if (!coreDone(info.plan, doneOf(data, info.key), cfg)) break;
      n++;
    }
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

/** Schwächste Gewohnheit aus einem Monatsdurchgang (ab `minN` Gelegenheiten). */
export function weakestOf(scan, minN = 3) {
  let worst = null;
  for (const id of Object.keys(scan.per || {})) {
    const v = scan.per[id];
    if (v.poss < minN) continue;
    const ratio = v.done / v.poss;
    if (!worst || ratio < worst.ratio) {
      worst = { id, nm: v.nm, done: v.done, poss: v.poss, ratio };
    }
  }
  return worst;
}

/** Rückwärtskompatibler Aufruf für den laufenden Monat. */
export function weakestTask(data, today, cfg, minN = 3) {
  return weakestOf(monthStats(data || {}, today, cfg), minN);
}

/**
 * Die laufende Woche von Montag bis Sonntag: Tagesbalken, gelaufene und
 * geplante Minuten. Grundlage für Wochenleiste und Wochenziel.
 */
export function weekStats(data, cfg, today) {
  const marks = (data && data.f) || {};
  const dow = (today.getDay() + 6) % 7; // Montag = 0
  const mon = mondayOf(today);
  const days = [];
  let doneMin = 0, planMin = 0, weekPlan = 0, hitN = 0, possN = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i, 12);
    const info = dayInfo(d, cfg, marks);
    const ids = doneOf(data, info.key);
    const set = new Set(ids);
    const blocks = scoredBlocks(info.plan);
    const hit = blocks.filter((b) => set.has(b.id)).length;
    const mins = dayMinutes(info.plan, ids, cfg);
    const past = i <= dow;
    if (info.counts) {
      weekPlan += mins.plan;
      if (past) {
        planMin += mins.plan;
        doneMin += mins.done;
        hitN += hit;
        possN += blocks.length;
      }
    }
    days.push({
      key: info.key, date: d, info, past, isToday: i === dow,
      ratio: blocks.length ? hit / blocks.length : null,
      mins: mins.done, plan: mins.plan,
    });
  }
  const goal = Number(cfg.weeklyGoalMin) || 0;
  return {
    days, doneMin, planMin, weekPlan, goal, hitN, possN,
    week: isoWeek(today), monday: mon,
    goalPct: goal ? Math.min(100, Math.round((doneMin / goal) * 100)) : null,
  };
}

/** Dieselbe Woche eine Woche früher — bis zum gleichen Wochentag. */
export function prevWeekStats(data, cfg, today) {
  return weekStats(data, cfg,
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7, 12));
}

/** Ist an diesem Tag alles Wertbare erledigt? */
export function allDone(plan, doneIds) {
  const blocks = scoredBlocks(plan);
  if (!blocks.length) return false;
  const set = new Set(doneIds || []);
  return blocks.every((b) => set.has(b.id));
}

/**
 * Der letzte zählende Tag vor heute, an dem nichts eingetragen wurde — die
 * Grundlage für die sanfte Nachtrags-Erinnerung. `null`, wenn alles gepflegt
 * ist oder der Tag ohnehin nicht zählt.
 */
export function missedYesterday(data, cfg, today) {
  const marks = (data && data.f) || {};
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
    const info = dayInfo(d, cfg, marks);
    if (!info.counts) continue;
    if (!scoredBlocks(info.plan).length) continue;
    return doneOf(data, info.key).length ? null : { key: info.key, date: d, days: i };
  }
  return null;
}

//  Der Blick bis zur Prüfung läuft über bis zu ein halbes Jahr Tagespläne.
//  Einmal pro Tag und Konfiguration reicht völlig.
let _loadCache = { token: "", value: null };

/**
 * Wie viel Substanz liegt noch zwischen heute und der Prüfung? Zählt echte
 * Lerntage, Deep-Work-Blöcke und freie Wochenendtage — das ist die ehrlichere
 * Zahl als "noch 132 Tage".
 */
export function examLoad(today, exam, cfg, marks) {
  if (!exam) return null;
  const token = `${ymd(today)}|${exam.date}|${CFG_REV}|${Object.keys(marks || {}).length}`;
  if (_loadCache.token === token) return _loadCache.value;

  const end = fromYmd(exam.date);
  let learnDays = 0, deep = 0, weekend = 0, deepMin = 0;
  const cur = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12);
  for (let guard = 0; guard < 400 && cur <= end; guard++) {
    const info = dayInfo(cur, cfg, marks);
    if (info.counts) {
      learnDays++;
      if (info.dk === "sa" || info.dk === "so") weekend++;
      for (const b of scoredBlocks(info.plan)) {
        if (b.kind === "deep") { deep++; deepMin += blockMinutes(b, cfg); }
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  const value = { learnDays, deep, weekend, deepMin };
  _loadCache = { token, value };
  return value;
}

/**
 * Reichen die hinterlegten Ferientermine noch? Läuft die Liste aus, würde das
 * Widget stillschweigend wieder Schultage anzeigen — deshalb der Hinweis.
 */
export function vacationsStale(today, cfg) {
  const list = (cfg && cfg.vacations) || [];
  if (!list.length) return "keine";
  let last = "";
  for (const v of list) if (Array.isArray(v) && v[1] > last) last = v[1];
  return ymd(today) > last ? last : null;
}

/** Nächster Termin aus der Liste, mit Tagen bis dahin. */
export function nextExam(today, cfg) {
  const key = ymd(today);
  const list = (cfg.exams || [])
    .filter((e) => e && e.date >= key)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!list.length) return null;
  const e = list[0];
  const days = Math.round(
    (fromYmd(e.date).getTime() - fromYmd(key).getTime()) / 86400000
  );
  return { ...e, days };
}

export function shortName(nm, max = 17) {
  const s = String(nm).split(/[:—·]/)[0].trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

export function heatStep(ratio) {
  if (ratio === null || ratio <= 0) return 0;
  if (ratio >= 1) return 4;
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.4) return 2;
  return 1;
}

/** Zellen eines Monatsgitters, Montag zuerst. */
export function monthGrid(ref) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Montag = 0
  const len = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= len; day++) cells.push(new Date(y, m, day, 12));
  return cells;
}

/**
 * "16:00" → 960 Minuten. Versteht auch "ab 19", "ab 19:30" und "19.30";
 * "opt." oder "—" ergeben null.
 */
export function toMinutes(t) {
  const s = String(t).trim().toLowerCase().replace(/^ab\s+/, "");
  let m = /^(\d{1,2})[:.](\d{2})$/.exec(s);
  if (m && +m[1] <= 23 && +m[2] <= 59) return +m[1] * 60 + +m[2];
  m = /^(\d{1,2})$/.exec(s);
  if (m && +m[1] <= 23) return +m[1] * 60;
  return null;
}

export function currentBlockIndex(plan, now) {
  if (!plan || !plan.blocks) return -1;
  const mins = now.getHours() * 60 + now.getMinutes();
  let idx = -1;
  plan.blocks.forEach((b, i) => {
    const bm = toMinutes(b.t);
    if (bm !== null && bm <= mins) idx = i;
  });
  return idx;
}

/**
 * Was läuft gerade, was kommt als Nächstes — inklusive Restzeit. Das Ende
 * eines Blocks ist der Beginn des nächsten, ersatzweise Beginn plus Dauer.
 */
export function timeline(plan, now, cfg) {
  const empty = { curIdx: -1, cur: null, curLeft: null, next: null, nextIn: null };
  if (!plan || !plan.blocks) return empty;
  const mins = now.getHours() * 60 + now.getMinutes();
  const timed = plan.blocks
    .map((b, i) => ({ b, i, m: toMinutes(b.t) }))
    .filter((x) => x.m !== null);
  if (!timed.length) return empty;

  let cur = null, next = null;
  for (const x of timed) {
    if (x.m <= mins) cur = x;
    else if (!next) next = x;
  }
  let curLeft = null;
  if (cur) {
    const end = next ? next.m : cur.m + blockMinutes(cur.b, cfg);
    curLeft = end - mins;
    if (curLeft <= 0) curLeft = null; // Block ist rechnerisch vorbei
  }
  return {
    curIdx: cur ? cur.i : -1,
    cur: cur ? cur.b : null,
    curLeft,
    next: next ? next.b : null,
    nextIn: next ? next.m - mins : null,
  };
}

/**
 * Schlafenszeit: rückwärts vom Weckruf des Folgetags. Nutzt die Uhrzeit des
 * ersten Morgen-Blocks — steht dort 5:30, ist bei 7,5 Stunden um 22:00 Schluss.
 */
export function bedtimeFor(tomorrowPlan, cfg) {
  const hours = Number(cfg.sleepHours);
  if (!(hours > 0)) return null;
  const first = ((tomorrowPlan && tomorrowPlan.blocks) || [])
    .find((b) => b.kind === "morg" && toMinutes(b.t) !== null);
  if (!first) return null;
  const wake = toMinutes(first.t);
  let bed = wake - Math.round(hours * 60);
  while (bed < 0) bed += 1440;
  return { bed, wake };
}

export function hhmm(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 135 → "2 h 15", 45 → "45 min". */
export function fmtMin(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

/** Shell-sicheres Quoting für beliebige Strings. */
export function shq(s) {
  return "'" + String(s).replace(/'/g, `'\\''`) + "'";
}

/** AppleScript-sicheres Quoting. */
export function asq(s) {
  return '"' + String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/**
 * Statusdatei lesen. v1 (nur `d`), v2 (`d` + `f: 1`) und v3 werden mitgelesen,
 * die alten Frei-Markierungen werden zu "frei".
 */
export function parseState(raw) {
  const empty = { v: 4, d: {}, f: {}, n: {}, t: null, b: "",
                  w: {}, u: { compact: false, help: false }, broken: false };
  const txt = String(raw || "").trim();
  if (!txt || txt === "{}") return empty;
  try {
    const o = JSON.parse(txt);
    if (!o || typeof o !== "object") return empty;
    const obj = (x) => (x && typeof x === "object" && !Array.isArray(x)) ? x : {};
    const fIn = obj(o.f);
    const f = {};
    for (const k of Object.keys(fIn)) {
      const v = fIn[k];
      f[k] = typeof v === "string" && v ? v : "frei";
    }
    const nIn = obj(o.n);
    const n = {};
    for (const k of Object.keys(nIn)) if (typeof nIn[k] === "string") n[k] = nIn[k];
    const wIn = obj(o.w);
    const w = {};
    for (const k of Object.keys(wIn)) {
      if (Array.isArray(wIn[k])) w[k] = wIn[k].filter((x) => typeof x === "string" && x.trim());
    }
    const uIn = obj(o.u);
    const u = { compact: !!uIn.compact, help: !!uIn.help };
    const t = (o.t && typeof o.t === "object" && o.t.id && o.t.start) ? o.t : null;
    return { v: 4, d: obj(o.d), f, n, t, w, u,
             b: typeof o.b === "string" ? o.b : "", broken: false };
  } catch (e) {
    // Defekte Datei: leer weitermachen, aber merken — vor dem ersten
    // Überschreiben legen wir eine Kopie als .broken daneben.
    return { ...empty, broken: true };
  }
}

/** Trennmarke zwischen Konfigurations- und Statusteil beim Laden. */
export const SPLIT = "\n<<<@@LERNPLAN-SPLIT@@>>>\n";

/** Antwort des kombinierten Ladebefehls aufteilen. */
export function splitPayload(raw) {
  const s = String(raw || "");
  const i = s.indexOf(SPLIT);
  if (i < 0) return { config: "{}", state: s };
  return { config: s.slice(0, i), state: s.slice(i + SPLIT.length) };
}

/** Semikolon-CSV für Excel — Feldtrenner und Anführungszeichen entschärft. */
export function csvOf(scan, data, cfg) {
  const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const notes = (data && data.n) || {};
  const rows = [[
    "Datum", "Wochentag", "Art", "zaehlt", "erledigt", "moeglich",
    "Quote", "Kern", "Minuten_erledigt", "Minuten_geplant", "Notiz",
  ]];
  for (const c of scan.cells) {
    if (c.future) continue;
    const ids = doneOf(data, c.info.key);
    const mins = dayMinutes(c.info.plan, ids, cfg);
    rows.push([
      c.info.key,
      ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][c.date.getDay()],
      c.info.kind,
      c.info.counts ? "ja" : "nein",
      c.hit, c.total,
      c.total ? Math.round((c.hit / c.total) * 100) + "%" : "",
      coreDone(c.info.plan, ids, cfg) ? "ja" : "nein",
      mins.done, mins.plan,
      notes[c.info.key] || "",
    ]);
  }
  return "﻿" + rows.map((r) => r.map(q).join(";")).join("\r\n") + "\r\n";
}

// ============================================================================
//  4 · Übersicht-Anbindung
// ============================================================================

const STATE_FILE = "$HOME/.lernplan-widget.json";
const CONFIG_FILE = "$HOME/.lernplan-config.json";
const BACKUP_DIR = "$HOME/.lernplan-backups";

/**
 * Wo liegt die Zustandsdatei? Standardmäßig im Benutzerordner. `statePath` in
 * der Konfiguration verlegt sie — etwa nach iCloud Drive, damit sich Mac und
 * iPhone denselben Stand teilen.
 *
 * Der Pfad landet in doppelten Anführungszeichen, `$HOME` wird also von der
 * Shell aufgelöst. Alles, was darüber hinaus ausgeführt würde, wird verworfen;
 * dann gilt wieder der Standardpfad.
 */
export function statePathOf(cfg) {
  const raw = cfg && typeof cfg.statePath === "string" ? cfg.statePath.trim() : "";
  if (!raw) return STATE_FILE;
  if (/[`"'\\]|\$\(|\n/.test(raw)) return STATE_FILE;
  return raw;
}

/** Die drei Pfade als Shell-Variablen — Kopf jedes Befehls. */
function shf() {
  return `F="${statePathOf(CONFIG)}"; C="${CONFIG_FILE}"; B="${BACKUP_DIR}"; `;
}
const VIEW_TIMEOUT_MIN = 10;
const BACKUP_KEEP = 14;
/** Kennung des Pausen-Timers — gehört zu keinem Block. */
export const BREAK_ID = "__pause";

/**
 * Alle Shell-Aufrufe an einer Stelle. Jeder String geht ungeprüft an die
 * Kommandozeile, deshalb liegt hier alles beieinander, wo man es am Stück
 * lesen kann — und wo die Tests es gegen ein Wegwerf-$HOME laufen lassen.
 * Alles, was von außen kommt, geht durch shq() bzw. asq().
 */
/**
 * Dateinamen, die in einen doppelt gequoteten Pfad eingesetzt werden, dürfen
 * nichts enthalten, was die Shell noch einmal anfasst. Alles Fremde fliegt
 * raus — die Namen entstehen ohnehin aus Datum und Monat.
 */
export function safeName(s, fallback = "unbenannt") {
  const t = String(s == null ? "" : s).replace(/[^A-Za-z0-9._-]/g, "");
  return t && !t.startsWith("-") && t !== "." && t !== ".." ? t : fallback;
}

export const SH = {
  /** Konfiguration und Zustand in einem Rutsch, getrennt durch SPLIT. */
  load: () =>
    `${shf()}cat "$C" 2>/dev/null || printf %s ${shq(NO_CONFIG)}; ` +
    `printf %s ${shq(SPLIT)}; cat "$F" 2>/dev/null || echo '{}'`,

  /** Atomar schreiben: erst .tmp, dann mv — ein Abbruch kann nichts löschen. */
  save: (json, rescue) =>
    `${shf()}${rescue ? `cp "$F" "$F.broken" 2>/dev/null; ` : ""}` +
    `printf %s ${shq(json)} > "$F.tmp" && mv -f "$F.tmp" "$F"`,

  /** Tagessicherung anlegen und auf die jüngsten `keep` Stände eindampfen. */
  backup: (key, keep) =>
    `${shf()}mkdir -p "$B" && cp "$F" "$B/${safeName(key, "sicherung")}.json" 2>/dev/null; ` +
    `ls -1t "$B"/*.json 2>/dev/null | tail -n +${keep + 1} | ` +
    `while read -r x; do rm -f "$x"; done; echo ok`,

  /** Sicherung von Hand, mit Zeitstempel im Namen. */
  backupManual: () =>
    `${shf()}mkdir -p "$B" && cp "$F" "$B/manuell-$(date +%Y-%m-%d-%H%M).json" && echo ok`,

  /** Startkonfiguration — legt nie eine vorhandene Datei um. */
  createConfig: (json) =>
    `${shf()}if [ -e "$C" ]; then echo exists >&2; exit 3; fi; ` +
    `printf %s ${shq(json)} > "$C.tmp" && mv -f "$C.tmp" "$C" && echo ok`,

  /** Datei bzw. Ordner im Finder oder Texteditor öffnen. */
  open: (what) =>
    what === "config"
      ? `${shf()}[ -e "$C" ] || printf %s '{}' > "$C"; open -t "$C"`
      : what === "backups"
        ? `${shf()}mkdir -p "$B" && open "$B"`
        : `${shf()}open -t "$F"`,

  /** CSV in den Benutzerordner schreiben. */
  csv: (name, text) =>
    `printf %s ${shq(text)} > "$HOME/${safeName(name, "lernplan.csv")}" && echo ok`,

  /** Kurzmitteilung über osascript. */
  notify: (title, text, sound) =>
    `osascript -e ${shq(`display notification ${asq(text)} with title ${asq(title)}` +
      ` sound name ${asq(sound)}`)}`,

  /** Einzeiliger Eingabedialog; "@@CANCEL@@" heißt abgebrochen. */
  dialog: (prompt, def, title) =>
    `osascript -e ${shq([
      "try",
      `  set r to text returned of (display dialog ${asq(prompt)}` +
      ` default answer ${asq(def)} with title ${asq(title)}` +
      ` buttons {"Abbrechen", "Sichern"} default button "Sichern")`,
      "  return r",
      "on error",
      '  return "@@CANCEL@@"',
      "end try",
    ].join("\n"))}`,
};

/** Antwort eines Dialogs auswerten: null = abgebrochen. */
export function dialogResult(out) {
  const txt = String(out || "").replace(/\n+$/, "");
  return txt === "@@CANCEL@@" ? null : txt;
}

let _dispatch = null;
// Letzter lokal bekannter Datenstand + Generationszähler. Beides liegt bewusst
// außerhalb des React-Zustands: ein Klick muss auf dem AKTUELLEN Stand rechnen,
// auch wenn der Re-Render noch aussteht — und eine Ladeantwort, die vor dem
// Klick abgeschickt wurde, darf den Klick nicht wieder überschreiben.
let _data = { v: 4, d: {}, f: {}, n: {}, t: null, b: "", w: {}, u: {} };
let _rev = 0;
let _needRescue = false; // defekte Statusdatei vor dem Überschreiben kopieren?
let _rang = "";          // für welchen Timer hat es schon geklingelt?
let _dialog = false;     // läuft gerade ein Dialog? (kein zweiter obendrauf)
let _cfgRaw = "";        // zuletzt gesehener Text der Konfigurationsdatei
let _cfgErr = null;      // steht die Konfigurationsdatei quer?
let _noCfg = false;      // gibt es überhaupt eine Konfigurationsdatei?
//  Einstufiges Rückgängig. Bewusst nur im Speicher: Ein Fehlklick fällt
//  sofort auf, und nach einem Neustart will niemand mehr einen Klick von
//  vorgestern zurücknehmen.
let _undo = null;        // { data, at, what }
const UNDO_MS = 60000;

/** Kennung im Ladebefehl, wenn die Konfigurationsdatei fehlt. */
export const NO_CONFIG = "@@LERNPLAN-NO-CONFIG@@";

//  20 Sekunden: schnell genug, dass der Fokus-Timer nicht stehenbleibt und
//  die Mitteilung pünktlich kommt, und trotzdem nur zwei `cat` pro Runde.
export const refreshFrequency = 20000;

export const initialState = {
  data: { v: 4, d: {}, f: {}, n: {}, t: null, b: "", w: {}, u: {} },
  err: null, note: null, tick: 0, view: null, viewAt: 0, mOff: 0, warn: [],
};

export const command = (dispatch) => {
  _dispatch = dispatch;
  load(dispatch);
};

/**
 * Einmal lesen. Der benutzte Zustandspfad wandert mit — er hängt an der
 * Konfiguration, und die steht beim allerersten Lesen noch nicht fest.
 */
function load(dispatch) {
  if (!dispatch) return;
  const rev = _rev;                       // Stand zum Zeitpunkt des Lesens
  const path = statePathOf(CONFIG);       // Pfad, aus dem gleich gelesen wird
  run(SH.load())
    .then((out) => dispatch({ type: "LOAD", raw: out, rev, path }))
    .catch((e) => dispatch({ type: "ERR", error: String(e) }));
}

export const updateState = (event, prev) => {
  const now = Date.now();
  const stale = prev.view && now - (prev.viewAt || 0) > VIEW_TIMEOUT_MIN * 60000;
  const base = stale ? { ...prev, view: null, viewAt: 0, mOff: 0 } : prev;

  switch (event.type) {
    case "LOAD": {
      const { config, state } = splitPayload(event.raw);
      //  Die Konfigurationsdatei wird nur neu ausgewertet, wenn sie sich
      //  wirklich geändert hat — sonst liefe alle 20 Sekunden ein komplettes
      //  Merge samt Prüfung, obwohl nichts passiert ist.
      const rawIn = String(config).trim();
      _noCfg = rawIn === NO_CONFIG;
      const raw = _noCfg || !rawIn ? "{}" : rawIn;
      let warn = base.warn || [];
      if (raw !== _cfgRaw) {
        _cfgRaw = raw;
        try {
          CONFIG = mergeConfig(DEFAULTS, JSON.parse(raw));
          warn = validateConfig(CONFIG);
          _cfgErr = null;
        } catch (e) {
          CONFIG = DEFAULTS;
          warn = [];
          _cfgErr = "~/.lernplan-config.json ist kein gültiges JSON — es gelten die Defaults";
        }
        CFG_REV++;
      }
      //  Hat die eben gelesene Konfiguration die Zustandsdatei verlegt, dann
      //  stammt der Zustand in derselben Antwort noch aus der alten Datei —
      //  verwerfen und sofort neu lesen. Sonst würde der erste Klick den
      //  gemeinsamen Stand mit einer fast leeren Datei überschreiben.
      if (event.path !== undefined && event.path !== statePathOf(CONFIG)) {
        setTimeout(() => load(_dispatch), 0);
        return { ...base, data: _data, warn, err: _cfgErr, note: null, tick: now };
      }
      // Antwort ist älter als die letzte lokale Änderung → verwerfen, sonst
      // würde ein gerade gesetzter Haken wieder verschwinden.
      if (event.rev !== _rev) {
        return { ...base, data: _data, warn, err: _cfgErr, note: null, tick: now };
      }
      const parsed = parseState(state);
      const broken = parsed.broken;
      if (broken) _needRescue = true;
      delete parsed.broken;
      _data = parsed;
      // Nebenwirkungen erst nach dem Reduzieren — sonst dispatch im dispatch.
      setTimeout(() => afterLoad(broken), 0);
      return { ...base, data: _data, warn, err: _cfgErr, note: null, tick: now };
    }
    case "SET":
      return { ...base, data: event.data, err: null, tick: now, viewAt: now };
    case "VIEW":
      return { ...prev, view: event.key, viewAt: now, tick: now };
    case "MONTH":
      return { ...prev, mOff: event.off, view: null, viewAt: now, tick: now };
    case "NOTE":
      return { ...base, note: event.note, err: null, tick: now };
    case "ERR":
      return { ...base, err: event.error, tick: now };
    default:
      return base;
  }
};

/** Atomar schreiben: erst .tmp, dann mv — sonst kann ein Abbruch alles löschen. */
function persist(next) {
  // War die Datei unlesbar, wandert sie einmalig als .broken zur Seite —
  // überschrieben wird also nie etwas, das man noch retten könnte.
  const rescue = _needRescue;
  _needRescue = false;
  return run(SH.save(JSON.stringify(strip(next)), rescue)).catch((e) => {
    if (_dispatch) _dispatch({ type: "ERR", error: "Speichern fehlgeschlagen: " + e });
  });
}

/** Hilfsfelder, die nicht in die Datei gehören. */
function strip(s) {
  const { broken, ...rest } = s || {};
  return rest;
}

/**
 * Schreibt einen neuen Stand. `what` beschreibt die Änderung in Worten und
 * schaltet damit das Rückgängig frei — interne Schritte (Sicherungsmarke,
 * abgelaufener Timer) lassen es weg, die will niemand zurücknehmen.
 */
function commit(next, what) {
  if (what) _undo = { data: _data, at: Date.now(), what };
  _data = next;
  _rev++;
  if (_dispatch) _dispatch({ type: "SET", data: next });
  persist(next);
}

/** Steht ein Rückgängig bereit — und wie heißt es? */
export function undoable(nowMs) {
  return _undo && nowMs - _undo.at < UNDO_MS ? _undo.what : null;
}

function undo() {
  if (!_undo) return;
  const prev = _undo.data;
  const what = _undo.what;
  _undo = null;
  commit(prev);
  say(`Zurückgenommen: ${what}`);
}

/** Häkchen setzen oder zurücknehmen — immer auf dem aktuellen Stand. */
function toggle(key, b) {
  const id = b.id;
  const d = { ...(_data.d || {}) };
  const set = new Set(d[key] || []);
  const was = set.has(id);
  if (was) set.delete(id); else set.add(id);
  const arr = Array.from(set);
  if (arr.length) d[key] = arr; else delete d[key];
  // Läuft für genau diesen Block ein Timer, ist er mit dem Haken erledigt.
  const t = _data.t;
  const stop = t && t.key === key && t.id === id && !was;
  const name = shortName(b.nm, 22);
  commit({ ..._data, d, t: stop ? null : t },
    was ? `Haken weg bei ${name}` : `${name} abgehakt`);
}

/** Alle Kern-Blöcke des Tages auf einmal abhaken. */
function completeCore(key, plan, cfg) {
  const ids = coreIdsOf(plan, cfg);
  if (!ids.length) return;
  const d = { ...(_data.d || {}) };
  const set = new Set(d[key] || []);
  const all = ids.every((id) => set.has(id));
  for (const id of ids) if (all) set.delete(id); else set.add(id);
  const arr = Array.from(set);
  if (arr.length) d[key] = arr; else delete d[key];
  commit({ ..._data, d }, all ? "Kern zurückgenommen" : "Kern abgehakt");
}

/** Markierung des Tages weiterschalten: nichts → frei → krank → nichts. */
function cycleMark(key) {
  const f = { ...(_data.f || {}) };
  const cur = f[key] ? (f[key] === "krank" ? "krank" : "frei") : null;
  const next = MARK_CYCLE[(MARK_CYCLE.indexOf(cur) + 1) % MARK_CYCLE.length];
  if (next) f[key] = next; else delete f[key];
  commit({ ..._data, f },
    next ? `Tag als ${next} markiert` : "Markierung entfernt");
}

/** Kompaktmodus und Hilfe umschalten — der Zustand hält über Neustarts. */
function toggleUi(k) {
  const u = { ...(_data.u || {}) };
  u[k] = !u[k];
  commit({ ..._data, u });
}

function setView(key) {
  if (_dispatch) _dispatch({ type: "VIEW", key });
}

function setMonth(off) {
  if (_dispatch) _dispatch({ type: "MONTH", off: Math.max(-24, Math.min(0, off)) });
}

function say(note) {
  if (_dispatch) _dispatch({ type: "NOTE", note });
}

function fail(error) {
  if (_dispatch) _dispatch({ type: "ERR", error });
}

// ---- Fokus-Timer -----------------------------------------------------------

/** Restminuten eines laufenden Timers, aufgerundet. null = keiner läuft. */
export function timerLeft(t, nowMs) {
  if (!t || !t.start || !t.mins) return null;
  const left = t.start + t.mins * 60000 - nowMs;
  return Math.ceil(left / 60000);
}

function startFocus(key, b, cfg) {
  const mins = blockMinutes(b, cfg) || 25;
  commit({ ..._data, t: { key, id: b.id, nm: b.nm, mins, start: Date.now() } });
  notify("Fokus gestartet", `${b.nm} · ${mins} Minuten`, "Pop");
}

function stopFocus() {
  commit({ ..._data, t: null });
}

/** Laufenden Timer verlängern, ohne ihn neu zu starten. */
function extendFocus(cfg) {
  const t = _data.t;
  if (!t) return;
  const step = Number(cfg.extendMin) || 10;
  commit({ ..._data, t: { ...t, mins: t.mins + step } });
}

/** Pause als eigener Timer — beendet einen laufenden Fokusblock. */
function startBreak(cfg) {
  const mins = Number(cfg.breakMin) || 5;
  commit({ ..._data, t: { key: ymd(new Date()), id: BREAK_ID, nm: "Pause", mins, start: Date.now() } });
  notify("Pause", `${mins} Minuten — dann geht es weiter`, "Pop");
}

/** Zwei Schwerpunkte für die Woche festlegen (Sonntagsplanung). */
function editTopics(weekKey) {
  if (_dialog) return;
  _dialog = true;
  const old = ((_data.w || {})[weekKey] || []).join(" · ");
  run(SH.dialog(`Zwei Schwerpunkte für ${weekKey}, getrennt mit  ·  oder  ;`,
                old, "Lernplan · Wochenplanung"))
    .then((out) => {
      const txt = dialogResult(out);
      if (txt === null) return;
      const list = txt.split(/[·;|]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
      const w = { ...(_data.w || {}) };
      if (list.length) w[weekKey] = list; else delete w[weekKey];
      commit({ ..._data, w }, "Schwerpunkte geändert");
    })
    .catch((e) => fail("Schwerpunkte fehlgeschlagen: " + e))
    .then(() => { _dialog = false; });
}

/**
 * Startkonfiguration schreiben. Bewusst klein gehalten: nur die Schalter, an
 * denen man wirklich dreht. Alles Weitere bleibt bei den Defaults und zieht
 * damit bei einem Update des Widgets automatisch mit.
 */
function createConfig(cfg) {
  const starter = {
    _hinweis: [
      "Konfiguration des Lernplan-Widgets. Alles hier gewinnt gegen die",
      "Defaults im Widget — ein Update überschreibt diese Datei nicht.",
      "Was du nicht brauchst, kannst du löschen; dann greift die Voreinstellung.",
      "Tagespläne (days, vacationDays, freeDay) lassen sich hier ebenfalls",
      "überschreiben, siehe README. Änderungen greifen nach etwa 20 Sekunden.",
    ],
    width: cfg.width, scale: cfg.scale,
    core: cfg.core,
    weeklyGoalMin: cfg.weeklyGoalMin,
    sleepHours: cfg.sleepHours,
    overdueAfterMin: cfg.overdueAfterMin,
    autoBackup: cfg.autoBackup,
    show: cfg.show,
    exams: cfg.exams,
    vacations: cfg.vacations,
  };
  run(SH.createConfig(JSON.stringify(starter, null, 2)))
    .then(() => say("~/.lernplan-config.json angelegt — jetzt anpassen"))
    .catch(() => fail("Anlegen fehlgeschlagen — existiert die Datei schon?"));
}

function openPath(what) {
  run(SH.open(what)).catch((e) => fail("Öffnen fehlgeschlagen: " + e));
}

function notify(title, text, sound = "Glass") {
  run(SH.notify(title, text, sound))
    .catch(() => { /* Mitteilungen sind Beiwerk, kein Grund für einen Fehler */ });
}

/**
 * Nach jedem Laden: abgelaufenen Fokus-Timer melden und die tägliche
 * Sicherung anstoßen. Beides bewusst außerhalb von updateState.
 */
function afterLoad(broken) {
  if (broken) {
    say("Statusdatei war defekt — Kopie liegt als .broken daneben");
  }
  const t = _data.t;
  if (t) {
    // Die Dauer gehört in die Kennung, sonst schweigt ein verlängerter Timer.
    const token = `${t.key}|${t.id}|${t.start}|${t.mins}`;
    const left = timerLeft(t, Date.now());
    if (left !== null && left <= 0 && _rang !== token) {
      _rang = token;
      const pause = t.id === BREAK_ID;
      notify(pause ? "Pause vorbei" : "Fokusblock fertig",
             pause ? "Weiter geht's" : `${t.nm} · ${t.mins} Minuten geschafft`);
      commit({ ..._data, t: null });
      say(pause ? "Pause vorbei" : `Fokus fertig: ${t.nm} — Haken setzen`);
      return;
    }
  }
  maybeBackup();
}

/** Einmal am Tag sichern und alte Stände wegräumen. */
function maybeBackup() {
  if (!CONFIG.autoBackup) return;
  const key = ymd(new Date());
  if (_data.b === key) return;
  if (!Object.keys(_data.d || {}).length) return; // nichts zu sichern
  run(SH.backup(key, BACKUP_KEEP))
    .then(() => commit({ ..._data, b: key }))
    .catch(() => { /* Sicherung ist Komfort, kein Grund für eine Fehlermeldung */ });
}

function backup() {
  run(SH.backupManual())
    .then(() => say("Sicherung in ~/.lernplan-backups abgelegt"))
    .catch((e) => fail("Sicherung fehlgeschlagen: " + e));
}

/** Tagesnotiz über einen kleinen Dialog erfassen — dein Fehlerprotokoll. */
function editNote(key, label) {
  if (_dialog) return;
  _dialog = true;
  const old = ((_data.n || {})[key]) || "";
  run(SH.dialog(`Notiz für ${label} (${key})`, old, "Lernplan"))
    .then((out) => {
      const txt = dialogResult(out);
      if (txt === null) return;
      const n = { ...(_data.n || {}) };
      if (txt.trim()) n[key] = txt.trim(); else delete n[key];
      commit({ ..._data, n }, "Notiz geändert");
    })
    .catch((e) => fail("Notiz fehlgeschlagen: " + e))
    .then(() => { _dialog = false; });
}

/** Monat als CSV in den Benutzerordner schreiben. */
function exportCsv(scan, cfg) {
  const name = `lernplan-${scan.year}-${String(scan.month + 1).padStart(2, "0")}.csv`;
  run(SH.csv(name, csvOf(scan, _data, cfg)))
    .then(() => say(`${name} im Benutzerordner abgelegt`))
    .catch((e) => fail("Export fehlgeschlagen: " + e));
}

// ============================================================================
//  5 · Darstellung
// ============================================================================

const pos = DEFAULTS.pos;
const posCss = [
  pos.top !== undefined ? `top:${pos.top}px;` : "",
  pos.left !== undefined ? `left:${pos.left}px;` : "",
  pos.right !== undefined ? `right:${pos.right}px;` : "",
  pos.bottom !== undefined ? `bottom:${pos.bottom}px;` : "",
].join("");

//  Wichtig: className wird EINMAL beim Laden ausgewertet, die Konfigurations-
//  datei ist da noch nicht gelesen. Breite und Skalierung sitzen deshalb als
//  Inline-Style am inneren Element (siehe render) — der Container passt sich an.
//  Nur die Position (pos) lässt sich hier nicht dynamisch setzen.
export const className = `
  ${posCss}
  width: max-content;
  box-sizing: border-box;
  font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  color: #eef1f7;
  background: rgba(19,21,27,0.88);
  backdrop-filter: blur(22px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 18px;
  box-shadow: 0 18px 48px rgba(0,0,0,0.42);
  line-height: 1.35;

  --ink:#eef1f7; --ink-2:#a9b1c0; --ink-3:#6f7889;
  --line:rgba(255,255,255,0.09);
  --morg:#e0a83f; --deep:#f0684c; --anki:#3fa9b8; --wdh:#3fa9b8;
  --lese:#6fb173; --frei:#7c8598; --fix:#6b7385;
  --sick:#c2708f;
  --h0:rgba(255,255,255,0.05); --h1:#184f95; --h2:#256abf;
  --h3:#3987e5; --h4:#86b6ef;

  * { box-sizing:border-box; margin:0; padding:0; }

  .hd { display:flex; align-items:flex-start; justify-content:space-between;
        gap:12px; padding-bottom:12px; border-bottom:1px solid var(--line); }
  .hd .dn { font-size:21px; font-weight:700; letter-spacing:-0.01em;
            display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
  .hd .badge { font-size:9.5px; font-weight:600; letter-spacing:0.07em;
               text-transform:uppercase; color:#1a1408; background:var(--morg);
               border-radius:6px; padding:3px 7px; cursor:pointer; white-space:nowrap; }
  .hd .badge:hover { filter:brightness(1.12); }
  .hd .badge.flat { background:transparent; color:var(--ink-3); font-weight:500;
                    border:1px solid rgba(255,255,255,0.13); padding:2px 6px;
                    font-size:9px; letter-spacing:0.04em; text-transform:none; }
  .hd .badge.flat:hover { background:rgba(255,255,255,0.10); color:var(--ink); }
  .hd .badge.flat.on { border-color:var(--morg); color:var(--morg); }
  .hd .badge.flat.sick { border-color:var(--sick); color:var(--sick); }
  .hd .dt { font-size:11px; color:var(--ink-3); margin-top:2px;
            font-variant-numeric:tabular-nums; }
  .hd .nt { font-size:11.5px; margin-top:5px; color:var(--ink-2); }
  .hd .nt.hot { color:var(--deep); font-weight:600; }
  .hd .nt.rest { color:var(--frei); font-weight:600; }

  .ring { flex:none; text-align:center; }
  .ring .num { font-size:26px; font-weight:700; font-variant-numeric:tabular-nums;
               letter-spacing:-0.02em; line-height:1.05; }
  .ring .num.mute { color:var(--ink-3); }
  .ring .cap { font-size:9px; letter-spacing:0.13em; text-transform:uppercase;
               color:var(--ink-3); margin-top:2px; }
  .bar { height:4px; border-radius:3px; background:rgba(255,255,255,0.09);
         overflow:hidden; margin-top:6px; width:74px; }
  .bar i { display:block; height:100%; border-radius:3px; background:var(--h4); }

  .memo { display:flex; gap:6px; align-items:flex-start; margin-top:7px;
          font-size:11px; color:var(--ink-2); cursor:pointer;
          background:rgba(255,255,255,0.04); border-radius:8px; padding:5px 9px; }
  .memo:hover { background:rgba(255,255,255,0.08); }
  .memo b { color:var(--ink-3); font-weight:600; flex:none; }

  .strip { display:flex; align-items:center; gap:9px; margin-top:11px;
           background:rgba(255,255,255,0.045); border-radius:9px; padding:7px 11px;
           font-size:11px; color:var(--ink-2); }
  .strip .lead { font-size:9px; letter-spacing:0.12em; text-transform:uppercase;
                 color:var(--ink-3); font-weight:700; flex:none; }
  .strip .val { font-weight:600; color:var(--ink); }
  .strip .rest { margin-left:auto; font-variant-numeric:tabular-nums;
                 font-weight:700; color:var(--ink); flex:none; }
  .strip.focus { background:rgba(240,104,76,0.14); }
  .strip.focus .rest { color:var(--deep); font-size:14px; }
  .strip .stop { cursor:pointer; border:1px solid rgba(255,255,255,0.18);
                 border-radius:6px; padding:2px 7px; font-size:9px; flex:none;
                 letter-spacing:0.06em; text-transform:uppercase; }
  .strip .stop:hover { background:rgba(255,255,255,0.12); color:var(--ink); }
  .strip.topics { cursor:pointer; }
  .strip.topics:hover { background:rgba(255,255,255,0.085); }
  .strip .tp { display:flex; gap:6px; align-items:center; min-width:0;
               overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .strip .tp em { font-style:normal; color:var(--ink-3); }

  .help { margin-top:10px; background:rgba(255,255,255,0.045); border-radius:9px;
          padding:9px 11px; font-size:10.5px; color:var(--ink-2); line-height:1.5; }
  .help b { color:var(--ink); font-weight:600; }
  .help u { display:block; text-decoration:none; }
  .help k { display:inline-block; min-width:16px; text-align:center;
            border:1px solid rgba(255,255,255,0.18); border-radius:4px;
            padding:0 4px; margin-right:6px; font-size:9.5px; color:var(--ink); }

  .setup { margin-top:10px; background:rgba(224,168,63,0.12); border-radius:9px;
           padding:9px 11px; font-size:10.5px; color:var(--ink-2); line-height:1.45; }
  .setup b { color:var(--morg); font-weight:700; display:block; margin-bottom:3px; }
  .setup .btns { display:flex; gap:6px; margin-top:7px; }
  .setup .btn { cursor:pointer; border:1px solid rgba(224,168,63,0.5); color:var(--morg);
                border-radius:6px; padding:3px 9px; font-size:9.5px; font-weight:600; }
  .setup .btn:hover { background:rgba(224,168,63,0.18); }

  .cd { display:flex; align-items:center; gap:8px; margin-top:9px;
        background:rgba(255,255,255,0.045); border-radius:9px; padding:7px 11px; }
  .cd .n { font-size:16px; font-weight:700; font-variant-numeric:tabular-nums;
           letter-spacing:-0.02em; flex:none; }
  .cd .l { font-size:10.5px; color:var(--ink-2); }
  .cd .load { margin-left:auto; font-size:9.5px; color:var(--ink-3);
              text-align:right; line-height:1.3; flex:none; }
  .cd.soon { background:rgba(240,104,76,0.12); }
  .cd.soon .n { color:var(--deep); }

  .core { display:flex; align-items:center; gap:8px; padding:10px 0 2px;
          font-size:11px; color:var(--ink-3); }
  .core b { color:var(--ink-2); font-weight:600; letter-spacing:0.06em;
            text-transform:uppercase; font-size:9.5px; }
  .core .ci { display:flex; align-items:center; gap:5px; font-size:11px; }
  .core .ci s { width:7px; height:7px; border-radius:50%; display:inline-block;
                background:rgba(255,255,255,0.16); }
  .core .ci.on s { background:var(--lese); }
  .core .ci.on { color:var(--ink-2); }
  .core .saved { margin-left:auto; font-size:9.5px; font-weight:700;
                 letter-spacing:0.07em; text-transform:uppercase; color:var(--lese);
                 background:rgba(111,177,115,0.14); border-radius:6px; padding:3px 8px; }
  .core .go { margin-left:auto; font-size:9.5px; font-weight:600; cursor:pointer;
              letter-spacing:0.06em; color:var(--ink-3);
              border:1px solid rgba(255,255,255,0.14); border-radius:6px; padding:2px 8px; }
  .core .go:hover { background:rgba(255,255,255,0.10); color:var(--ink); }

  .list { display:flex; flex-direction:column; gap:3px; padding:8px 0 4px; }
  .row { display:flex; align-items:flex-start; gap:10px; padding:6px 9px 6px 8px;
         border-left:3px solid var(--fix); border-radius:0 8px 8px 0;
         background:rgba(255,255,255,0.028); }
  .row.now { background:rgba(255,255,255,0.075);
             box-shadow:inset 0 0 0 1px rgba(255,255,255,0.10); }
  .row.hit { cursor:pointer; }
  .row.hit:hover { background:rgba(255,255,255,0.085); }
  .row.hit:hover .cb { border-color:rgba(255,255,255,0.55); }
  .row.k-morg { border-color:var(--morg); }
  .row.k-anki, .row.k-wdh { border-color:var(--anki); }
  .row.k-deep { border-color:var(--deep); border-left-width:4px; }
  .row.k-lese { border-color:var(--lese); }
  .row.k-frei { border-color:var(--frei); }
  .row.k-fix  { border-color:var(--fix); opacity:0.62; }
  .row.run { box-shadow:inset 0 0 0 1px rgba(240,104,76,0.55); }
  .row .tm { font-size:11px; font-weight:700; color:var(--ink-2); flex:none;
             width:44px; padding-top:2px; font-variant-numeric:tabular-nums;
             letter-spacing:-0.02em; }
  .row .bd { flex:1; min-width:0; }
  .row .nm { font-size:13px; font-weight:600; color:var(--ink); line-height:1.25; }
  .row .open { font-size:8.5px; font-weight:700; letter-spacing:0.1em;
               text-transform:uppercase; color:var(--ink-3);
               border:1px solid rgba(255,255,255,0.15); border-radius:5px;
               padding:1px 5px; margin-left:7px; vertical-align:1px; }
  .row .min { font-size:8.5px; font-weight:700; color:var(--ink-3);
              margin-left:6px; vertical-align:1px; font-variant-numeric:tabular-nums; }
  .row .sb { font-size:10.5px; color:var(--ink-3); margin-top:1px; line-height:1.3; }
  .row .pl { flex:none; width:20px; height:20px; border-radius:6px; opacity:0;
             display:flex; align-items:center; justify-content:center;
             font-size:9px; color:var(--ink-3); border:1px solid transparent;
             transition:opacity 90ms ease; }
  .row:hover .pl { opacity:1; border-color:rgba(255,255,255,0.14); }
  .row .pl:hover { background:rgba(255,255,255,0.12); color:var(--ink); }
  .row .pl.on { opacity:1; color:var(--deep); border-color:rgba(240,104,76,0.55); }
  .cb { flex:none; width:21px; height:21px; border-radius:7px;
        border:1.5px solid rgba(255,255,255,0.24); background:rgba(255,255,255,0.04);
        display:flex; align-items:center; justify-content:center;
        font-size:12px; font-weight:700; color:transparent; user-select:none;
        transition:background 90ms ease, border-color 90ms ease; }
  .cb.on { background:var(--lese); border-color:var(--lese); color:#0e150f; }
  .cb.ghost { border-style:dashed; }
  .row.done .nm { color:var(--ink-3); text-decoration:line-through;
                  text-decoration-color:rgba(255,255,255,0.3); }
  .row.done .sb { color:#5b6373; }
  .spacer { width:21px; flex:none; }

  .budget { display:flex; align-items:center; gap:8px; padding:4px 2px 0;
            font-size:10px; color:var(--ink-3); font-variant-numeric:tabular-nums; }
  .budget .tr { flex:1; height:5px; border-radius:3px;
                background:rgba(255,255,255,0.08); overflow:hidden; }
  .budget .tr i { display:block; height:100%; background:var(--lese); }
  .budget b { color:var(--ink-2); font-weight:600; }

  .peek { font-size:10.5px; color:var(--ink-3); padding:6px 0 0 2px; line-height:1.4; }
  .peek b { color:var(--ink-2); font-weight:600; }

  .wk { margin-top:11px; padding-top:11px; border-top:1px solid var(--line); }
  .wk .wh { display:flex; align-items:baseline; justify-content:space-between;
            gap:10px; margin-bottom:7px; }
  .wk .wt { font-size:9.5px; letter-spacing:0.13em; text-transform:uppercase;
            color:var(--ink-3); font-weight:600; }
  .wk .wv { font-size:11px; color:var(--ink-2); font-variant-numeric:tabular-nums; }
  .wk .wv b { color:var(--ink); font-weight:700; }
  .wk .bars { display:grid; grid-template-columns:repeat(7,1fr); gap:5px;
              align-items:end; height:38px; }
  .wk .col { display:flex; flex-direction:column; justify-content:flex-end;
             height:100%; gap:3px; }
  .wk .col .st { border-radius:3px 3px 0 0; background:var(--h3); min-height:2px; }
  .wk .col.off .st { background:rgba(255,255,255,0.10); }
  .wk .col.fut .st { background:rgba(255,255,255,0.06); }
  .wk .col .lb { font-size:8.5px; text-align:center; color:var(--ink-3); }
  .wk .col.tdy .lb { color:var(--ink); font-weight:700; }
  .wk .goal { margin-top:7px; display:flex; align-items:center; gap:8px;
              font-size:10px; color:var(--ink-3); font-variant-numeric:tabular-nums; }
  .wk .goal .tr { flex:1; height:5px; border-radius:3px;
                  background:rgba(255,255,255,0.08); overflow:hidden; }
  .wk .goal .tr i { display:block; height:100%; background:var(--morg); }

  .mon { margin-top:12px; padding-top:12px; border-top:1px solid var(--line); }
  .mon .mh { display:flex; align-items:baseline; justify-content:space-between;
             gap:10px; margin-bottom:9px; }
  .mon .mt { font-size:9.5px; letter-spacing:0.13em; text-transform:uppercase;
             color:var(--ink-3); font-weight:600; display:flex; align-items:center; gap:7px; }
  .mon .nav { cursor:pointer; color:var(--ink-3); border:1px solid rgba(255,255,255,0.14);
              border-radius:5px; padding:0 5px; font-size:10px; line-height:15px; }
  .mon .nav:hover { background:rgba(255,255,255,0.10); color:var(--ink); }
  .mon .nav.off { opacity:0.25; }
  .mon .mv { font-size:12px; color:var(--ink-2); font-variant-numeric:tabular-nums; }
  .mon .mv b { color:var(--ink); font-weight:700; font-size:14px; }

  .cal { display:flex; gap:16px; align-items:flex-start; }
  .grid { display:grid; grid-template-columns:repeat(7, 24px); gap:3px; flex:none; }
  .wd { font-size:8.5px; color:var(--ink-3); text-align:center; letter-spacing:0.04em; }
  .cell { height:24px; border-radius:5px; background:var(--h0); position:relative; }
  .cell.s1 { background:var(--h1); }
  .cell.s2 { background:var(--h2); }
  .cell.s3 { background:var(--h3); }
  .cell.s4 { background:var(--h4); }
  .cell.blank { background:transparent; }
  .cell.skip { background:rgba(255,255,255,0.05);
               background-image:repeating-linear-gradient(45deg,
                 transparent 0 3px, rgba(255,255,255,0.16) 3px 4px); }
  .cell.sick { background-image:repeating-linear-gradient(45deg,
                 transparent 0 3px, rgba(194,112,143,0.55) 3px 4px); }
  .cell.future { background:rgba(255,255,255,0.028); }
  .cell.memo:after { content:""; position:absolute; right:3px; top:3px;
                     width:4px; height:4px; border-radius:50%;
                     background:rgba(255,255,255,0.55); }
  .cell.today { box-shadow:0 0 0 1.5px #ffffff; }
  .cell.pick { cursor:pointer; }
  .cell.pick:hover { box-shadow:0 0 0 1.5px rgba(255,255,255,0.55); }
  .cell.picked, .cell.pick.picked:hover { box-shadow:0 0 0 2px var(--morg); }

  .kpi { flex:1; display:flex; flex-direction:column; gap:6px; }
  .kpi .k { background:rgba(255,255,255,0.045); border-radius:9px; padding:7px 11px;
            display:flex; align-items:baseline; gap:8px; }
  .kpi .k .n { font-size:18px; font-weight:700; letter-spacing:-0.02em;
               font-variant-numeric:tabular-nums; line-height:1.1; flex:none; }
  .kpi .k .l { font-size:9.5px; color:var(--ink-3); letter-spacing:0.06em;
               text-transform:uppercase; }
  .kpi .k.weak { background:rgba(240,104,76,0.10); }
  .kpi .k.weak .n { color:var(--deep); }
  .kpi .k.weak .l { color:#c98d7e; }

  .lg { display:flex; align-items:center; gap:5px; margin-top:10px;
        font-size:9px; color:var(--ink-3); }
  .lg i { width:9px; height:9px; border-radius:3px; display:inline-block; }
  .lg i.skip { background:rgba(255,255,255,0.05);
               background-image:repeating-linear-gradient(45deg,
                 transparent 0 3px, rgba(255,255,255,0.16) 3px 4px); }

  .warn { margin-top:8px; font-size:10px; color:var(--morg);
          background:rgba(224,168,63,0.10); border-radius:7px; padding:6px 9px;
          line-height:1.35; }
  .warn u { display:block; text-decoration:none; }
  .err { margin-top:8px; font-size:10px; color:#f0a08c; }
  .ok { margin-top:8px; font-size:10px; color:var(--lese); }
  .ft { margin-top:9px; font-size:9.5px; color:var(--ink-3);
        display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ft .acts { display:flex; gap:6px; flex:none; }
  .ft .bk { cursor:pointer; border:1px solid rgba(255,255,255,0.14);
            border-radius:6px; padding:3px 8px; white-space:nowrap; }
  .ft .bk:hover { background:rgba(255,255,255,0.09); color:var(--ink); }
  .ft .bk.undo { border-color:rgba(224,168,63,0.45); color:var(--morg); }
  .ft .bk.undo:hover { background:rgba(224,168,63,0.16); color:var(--morg); }
  .ft .hint { min-width:0; }
  .ft .hint.act { cursor:pointer; color:var(--morg); }
  .ft .hint.act:hover { text-decoration:underline; }

  .core .saved.all { color:var(--morg); background:rgba(224,168,63,0.16); }
  .wk .wv .dlt { color:var(--lese); font-weight:700; }
  .wk .wv .dlt.neg { color:var(--deep); }
`;

const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
  "August", "September", "Oktober", "November", "Dezember"];

/** Der eigentliche Aufbau — von `render` in eine Fehlerbremse eingepackt. */
function view({ data, err, note, view: viewKey, mOff, warn }) {
  const cfg = CONFIG;
  const now = new Date();
  const nowMs = now.getTime();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayKey = ymd(now);
  const marks = (data && data.f) || {};
  const notes = (data && data.n) || {};

  const ui = (data && data.u) || {};
  const compact = !!ui.compact;   // Woche und Monat eingeklappt
  const helpOn = !!ui.help;

  const back = viewKey && viewKey !== todayKey ? viewKey : null;
  const shown = back ? fromYmd(back) : now;
  const info = dayInfo(shown, cfg, marks);
  const key = info.key;
  const plan = info.plan;
  const doneIds = doneOf(data, key);
  const doneSet = new Set(doneIds);

  const scored = scoredBlocks(plan);
  const hit = scored.filter((b) => doneSet.has(b.id)).length;
  const pct = scored.length ? Math.round((hit / scored.length) * 100) : 0;
  const budget = dayMinutes(plan, doneIds, cfg);

  const tl = back ? timeline(null, now, cfg) : timeline(plan, now, cfg);
  const timer = (data && data.t) || null;
  const tLeft = timerLeft(timer, nowMs);
  const timerOn = !!(timer && tLeft !== null && tLeft > 0);

  // Monat: 0 = laufender Monat, negativ = zurück. Im Kompaktmodus ist das
  // Gitter unsichtbar — dann soll auch der CSV-Export wieder heute meinen.
  const off = compact ? 0 : Math.max(-24, Math.min(0, Number(mOff) || 0));
  const mRef = new Date(now.getFullYear(), now.getMonth() + off, 1, 12);
  const scan = monthScan(data || {}, cfg, mRef.getFullYear(), mRef.getMonth(), now);
  const streak = coreStreak(data || {}, now, cfg);
  const weak = weakestOf(scan);
  const week = weekStats(data || {}, cfg, now);
  const exam = nextExam(now, cfg);
  const load = exam ? examLoad(now, exam, cfg, marks) : null;
  const stale = vacationsStale(now, cfg);
  const freeAhead = nextFreeDay(now, cfg, marks);
  const prevWk = prevWeekStats(data || {}, cfg, now);
  const wkDelta = week.doneMin - prevWk.doneMin;
  const topics = ((data && data.w) || {})[week.week] || [];
  const missed = shows(cfg, "remind") && !back
    ? missedYesterday(data || {}, cfg, now) : null;

  const coreIds = coreIdsOf(plan, cfg);
  const kernOk = coreDone(plan, doneIds, cfg);
  const dayDone = allDone(plan, doneIds);
  const undoWhat = undoable(nowMs);

  // Vorschau auf morgen (nur in der Heute-Ansicht)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  const tInfo = dayInfo(tomorrow, cfg, marks);
  const tScored = scoredBlocks(tInfo.plan);
  const tAll = tScored.map((b) => shortName(b.nm, 20));
  const tNames = tAll.length > 4 ? tAll.slice(0, 4).concat(`+${tAll.length - 4}`) : tAll;
  const tMin = tScored.reduce((s, b) => s + blockMinutes(b, cfg), 0);

  const bt = shows(cfg, "bedtime") ? bedtimeFor(tInfo.plan, cfg) : null;
  const btDue = bt && (nowMin >= bt.bed - 60 || nowMin < 4 * 60);

  const grid = monthGrid(mRef);
  const byKey = {};
  for (const c of scan.cells) byKey[c.info.key] = c;

  const shell = {
    width: Math.max(320, Math.min(900, Number(cfg.width) || DEFAULTS.width)) + "px",
    zoom: Math.max(0.6, Math.min(2, Number(cfg.scale) || DEFAULTS.scale)),
    padding: "18px 20px 16px",
    boxSizing: "border-box",
  };

  const markBadge = info.kind === "sick" ? "✓ krank"
                  : info.kind === "off" ? "✓ frei" : "frei setzen";

  return (
    <div style={shell}>
      {/* ---------- Kopf ---------- */}
      <div className="hd">
        <div>
          <div className="dn">
            {plan.label || labelOf(cfg, info.dk)}
            {back ? (
              <em className="badge" onClick={() => setView(null)}>
                Nachtrag · zurück zu heute
              </em>
            ) : null}
            <em
              className={"badge flat" +
                (info.kind === "off" ? " on" : info.kind === "sick" ? " sick" : "")}
              onClick={() => cycleMark(key)}
              title="Klick schaltet weiter: frei → krank → normal. Markierte Tage zählen nicht in die Quote und brechen die Streak nicht."
            >
              {markBadge}
            </em>
            <em className={"badge flat" + (helpOn ? " on" : "")}
                onClick={() => toggleUi("help")}
                title="Kurzhilfe: was ist wo klickbar">?</em>
            <em className={"badge flat" + (compact ? " on" : "")}
                onClick={() => toggleUi("compact")}
                title={compact ? "Woche und Monat wieder einblenden" : "Kompaktmodus: Woche und Monat ausblenden"}>
              {compact ? "⌄ mehr" : "⌃ kompakt"}
            </em>
          </div>
          <div className="dt">
            {String(shown.getDate()).padStart(2, "0")}.
            {String(shown.getMonth() + 1).padStart(2, "0")}. · {plan.tag}
            {info.label ? ` · ${info.label}` : ""}
            {back ? "" : ` · ${hhmm(nowMin)}`}
          </div>
          <div className={"nt" + (plan.hot ? " hot" : plan.rest ? " rest" : "")}>
            {plan.note}
          </div>
        </div>
        <div className="ring">
          <div className={"num" + (info.counts ? "" : " mute")}>{pct}%</div>
          <div className="cap">
            {hit}/{scored.length} {info.counts ? (back ? "an dem Tag" : "heute") : "ohne Wertung"}
          </div>
          <div className="bar"><i style={{ width: pct + "%" }} /></div>
        </div>
      </div>

      {/* ---------- Erststart ohne Konfiguration ---------- */}
      {_noCfg ? (
        <div className="setup">
          <b>Noch keine eigene Konfiguration</b>
          Das Widget läuft mit den eingebauten Vorgaben. Eigene Prüfungstermine,
          Ferien und Tagespläne kommen nach <code>~/.lernplan-config.json</code> —
          ein Update des Widgets überschreibt sie dann nicht.
          <div className="btns">
            <span className="btn" onClick={() => createConfig(cfg)}>Konfiguration anlegen</span>
            <span className="btn" onClick={() => openPath("config")}>Datei öffnen</span>
          </div>
        </div>
      ) : null}

      {/* ---------- Kurzhilfe ---------- */}
      {helpOn ? (
        <div className="help">
          <u><k>✓</k>Zeile anklicken hakt den Block ab — Fixtermine sind grau und nicht klickbar.</u>
          <u><k>▶</k>Erscheint beim Überfahren einer Zeile: startet den Fokus-Timer über die Blockdauer.</u>
          <u><k>Kern</k>„Kern ✓" hakt Morgenroutine, Anki und Lesen in einem Klick ab — das rettet den Tag.</u>
          <u><k>frei</k>Schaltet weiter: frei → krank → normal. Solche Tage zählen nicht und brechen die Streak nicht.</u>
          <u><k>▦</k>Tag im Monatsgitter anklicken öffnet ihn zum Nachtragen, ‹ › blättern durch die Monate.</u>
          <u><k>📝</k>Notizzeile und Schwerpunkte öffnen ein Eingabefeld; die Notizen landen im CSV-Export.</u>
          <u><k>⌃</k>Kompaktmodus blendet Woche und Monat aus. Alles bleibt gespeichert.</u>
          <u>Klicken geht nur, solange der Übersicht-Interaktions-Shortcut gedrückt ist.</u>
        </div>
      ) : null}

      {/* ---------- Tagesnotiz ---------- */}
      {shows(cfg, "notes") ? (
        <div className="memo" onClick={() => editNote(key, plan.label || info.dk)}
             title="Klick öffnet ein Eingabefeld — kurz festhalten, was hakt. Landet im CSV-Export.">
          <b>Notiz</b>
          <span>{notes[key] || "was lief heute schief? festhalten …"}</span>
        </div>
      ) : null}

      {/* ---------- Fokus-Timer bzw. jetzt / als Nächstes ---------- */}
      {timerOn ? (
        <div className="strip focus">
          <span className="lead">{timer.id === BREAK_ID ? "Pause" : "Fokus"}</span>
          <span className="val">{shortName(timer.nm, 20)}</span>
          <span className="rest">{tLeft <= 1 ? "gleich fertig" : `noch ${tLeft} min`}</span>
          {timer.id === BREAK_ID ? null : (
            <span className="stop" onClick={() => startBreak(cfg)}
                  title={`Fokus beenden und ${Number(cfg.breakMin) || 5} Minuten Pause starten`}>
              Pause
            </span>
          )}
          <span className="stop" onClick={() => extendFocus(cfg)}
                title="Timer verlängern">+{Number(cfg.extendMin) || 10}′</span>
          <span className="stop" onClick={() => stopFocus()}>Stop</span>
        </div>
      ) : !back && shows(cfg, "now") && (tl.cur || tl.next) ? (
        <div className="strip">
          {tl.cur ? (
            <>
              <span className="lead">Jetzt</span>
              <span className="val">{shortName(tl.cur.nm, 22)}</span>
            </>
          ) : (
            <>
              <span className="lead">Gleich</span>
              <span className="val">{shortName(tl.next.nm, 22)}</span>
            </>
          )}
          <span className="rest">
            {tl.cur && tl.curLeft !== null
              ? `noch ${tl.curLeft} min`
              : tl.next
                ? `${tl.next.t} · in ${tl.nextIn} min`
                : "—"}
          </span>
        </div>
      ) : null}

      {/* ---------- Countdown ---------- */}
      {exam && shows(cfg, "countdown") ? (
        <div className={"cd" + (exam.days <= 21 ? " soon" : "")}>
          <div className="n">{exam.days === 0 ? "heute" : exam.days + " Tage"}</div>
          <div className="l">
            bis {exam.label} · {fromYmd(exam.date).toLocaleDateString("de-DE",
              { day: "2-digit", month: "2-digit", year: "2-digit" })}
          </div>
          {load ? (
            <div className="load">
              {load.learnDays} Lerntage · {load.deep} Deep-Blöcke<br />
              ≈ {fmtMin(load.deepMin)} tiefe Arbeit
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---------- Schwerpunkte der Woche ---------- */}
      {shows(cfg, "topics") ? (
        <div className="strip topics" onClick={() => editTopics(week.week)}
             title="Zwei Themen, an denen diese Woche wirklich etwas passieren soll — Sonntag in der Wochenplanung festlegen">
          <span className="lead">Fokus&nbsp;der&nbsp;Woche</span>
          <span className="tp">
            {topics.length
              ? topics.map((x, i) => (
                  <span key={"tp" + i}>{i ? " · " : ""}{x}</span>
                ))
              : <em>zwei Schwerpunkte festlegen …</em>}
          </span>
        </div>
      ) : null}

      {/* ---------- Minimal-Kern ---------- */}
      <div className="core">
        <b>Kern</b>
        {coreIds.map((id) => {
          const b = plan.blocks.find((x) => x.id === id);
          return (
            <span key={id} className={"ci" + (doneSet.has(id) ? " on" : "")}>
              <s />{b ? b.nm.replace(/\s\d+′$/, "") : id}
            </span>
          );
        })}
        {dayDone ? (
          <span className="saved all">Feierabend</span>
        ) : kernOk ? (
          <span className="saved">Tag gerettet</span>
        ) : coreIds.length ? (
          <span className="go" onClick={() => completeCore(key, plan, cfg)}
                title="Hakt alle Kern-Blöcke dieses Tages auf einmal ab">
            Kern ✓
          </span>
        ) : null}
      </div>

      {/* ---------- Tagesliste ---------- */}
      <div className="list">
        {plan.blocks.map((b, i) => {
          const on = doneSet.has(b.id);
          const bm = toMinutes(b.t);
          const mins = blockMinutes(b, cfg);
          const overdue =
            !back && info.counts && b.track && !b.opt && !on && bm !== null &&
            nowMin > bm + (Number(cfg.overdueAfterMin) || 60);
          const running = timerOn && timer.key === key && timer.id === b.id;
          const canFocus = !back && shows(cfg, "timer") && b.track && !on && mins > 0;
          const cls = ["row", "k-" + b.kind, i === tl.curIdx && !back ? "now" : "",
            on ? "done" : "", b.track ? "hit" : "", running ? "run" : ""].join(" ");
          return (
            <div
              key={b.id}
              className={cls}
              onClick={b.track ? () => toggle(key, b) : undefined}
              title={b.opt ? "Bonus — zählt nicht in die Quote" : undefined}
            >
              <div className="tm">{b.t}</div>
              <div className="bd">
                <div className="nm">
                  {b.nm}
                  {overdue ? <span className="open">offen</span> : null}
                  {b.track && !on && mins > 0 ? <span className="min">{mins}′</span> : null}
                </div>
                {b.sub ? <div className="sb">{b.sub}</div> : null}
              </div>
              {canFocus || running ? (
                <div
                  className={"pl" + (running ? " on" : "")}
                  title={running ? "Fokus abbrechen" : `Fokus-Timer über ${mins} Minuten starten`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (running) stopFocus(); else startFocus(key, b, cfg);
                  }}
                >
                  {running ? "■" : "▶"}
                </div>
              ) : null}
              {b.track ? (
                <div className={"cb" + (on ? " on" : "") + (b.opt ? " ghost" : "")}>✓</div>
              ) : <div className="spacer" />}
            </div>
          );
        })}
      </div>

      {/* ---------- Zeitbudget des Tages ---------- */}
      {shows(cfg, "budget") && budget.plan > 0 && !compact ? (
        <div className="budget">
          <span><b>{fmtMin(budget.done)}</b> von {fmtMin(budget.plan)}</span>
          <span className="tr">
            <i style={{ width: Math.round((budget.done / budget.plan) * 100) + "%" }} />
          </span>
          <span>{fmtMin(Math.max(0, budget.plan - budget.done))} offen</span>
        </div>
      ) : null}

      {/* ---------- Vorschau auf morgen ---------- */}
      {back || compact || !shows(cfg, "peek") ? null : (
        <div className="peek">
          <b>Morgen · {tInfo.plan.label || labelOf(cfg, tInfo.dk)}</b>
          {tInfo.label ? ` (${tInfo.label})` : ""}
          {tNames.length ? " — " + tNames.join(" · ") : " — nichts geplant"}
          {tMin ? ` · ${fmtMin(tMin)}` : ""}
        </div>
      )}

      {/* ---------- Woche ---------- */}
      {shows(cfg, "week") && !compact ? (
        <div className="wk">
          <div className="wh">
            <div className="wt">Diese Woche</div>
            <div className="wv">
              <b>{fmtMin(week.doneMin)}</b> von {fmtMin(week.planMin)} bisher
              {week.possN ? ` · ${week.hitN}/${week.possN}` : ""}
              {Math.abs(wkDelta) >= 5 ? (
                <span className={"dlt" + (wkDelta < 0 ? " neg" : "")}
                      title="Gleicher Wochentag in der Vorwoche">
                  {" · "}{wkDelta > 0 ? "+" : "−"}{fmtMin(Math.abs(wkDelta))}
                </span>
              ) : null}
            </div>
          </div>
          <div className="bars">
            {week.days.map((d, i) => {
              const h = d.ratio === null ? 0 : Math.round(d.ratio * 100);
              const cls = ["col", d.info.counts ? "" : "off",
                d.past ? "" : "fut", d.isToday ? "tdy" : ""].join(" ");
              const tip = `${WD[i]} ${d.date.getDate()}.${d.date.getMonth() + 1}. · ` +
                (d.info.counts
                  ? `${h}% · ${fmtMin(d.mins)} von ${fmtMin(d.plan)}`
                  : d.info.label || "ohne Wertung");
              return (
                <div key={"w" + i} className={cls} title={tip}>
                  <div className="st" style={{ height: Math.max(2, h * 0.28) + "px" }} />
                  <div className="lb">{WD[i]}</div>
                </div>
              );
            })}
          </div>
          {week.goal ? (
            <div className="goal">
              <span>Wochenziel</span>
              <span className="tr"><i style={{ width: week.goalPct + "%" }} /></span>
              <span>{fmtMin(week.doneMin)} / {fmtMin(week.goal)} · {week.goalPct}%</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---------- Monat ---------- */}
      {shows(cfg, "month") && !compact ? (
        <div className="mon">
          <div className="mh">
            <div className="mt">
              <span className="nav" title="Vormonat"
                    onClick={() => setMonth(off - 1)}>‹</span>
              {MONTHS[mRef.getMonth()]} {mRef.getFullYear()}
              <span className={"nav" + (off >= 0 ? " off" : "")} title="Folgemonat"
                    onClick={() => off < 0 && setMonth(off + 1)}>›</span>
            </div>
            <div className="mv">
              <b>{scan.pct}%</b> · {scan.done}/{scan.possible} Tasks
              {scan.free ? ` · ${scan.free} frei` : ""}
              {scan.sick ? ` · ${scan.sick} krank` : ""}
            </div>
          </div>
          <div className="cal">
            <div className="grid">
              {WD.map((w) => <div key={"wd" + w} className="wd">{w}</div>)}
              {grid.map((d, i) => {
                if (!d) return <div key={"c" + i} className="cell blank" />;
                const k = ymd(d);
                const c = byKey[k];
                if (!c) return <div key={"c" + i} className="cell blank" />;
                const ci = c.info;
                const cls = ["cell",
                  c.future ? "future"
                    : ci.counts ? "s" + heatStep(c.ratio)
                      : ci.kind === "sick" ? "skip sick" : "skip",
                  notes[k] ? "memo" : "",
                  k === todayKey ? "today" : "",
                  k === key && back ? "picked" : "",
                  c.future ? "" : "pick"].join(" ");
                const tip = `${d.getDate()}.${d.getMonth() + 1}.` +
                  (ci.label ? ` ${ci.label}` : "") +
                  (c.future ? "" : ci.counts
                    ? ` · ${c.hit}/${c.total} Tasks — klicken zum Nachtragen`
                    : " · zählt nicht") +
                  (notes[k] ? `\n📝 ${notes[k]}` : "");
                return (
                  <div key={"c" + i} className={cls} title={tip}
                    onClick={c.future ? undefined : () => setView(k === todayKey ? null : k)} />
                );
              })}
            </div>
            <div className="kpi">
              <div className="k">
                <div className="n">{streak}</div>
                <div className="l">{streak === 1 ? "Tag" : "Tage"} Kern-Streak</div>
              </div>
              <div className="k">
                <div className="n">{scan.coreDays}/{scan.counted}</div>
                <div className="l">Kern-Tage</div>
              </div>
              <div className="k" title={`${fmtMin(scan.minsDone)} von ${fmtMin(scan.minsPlan)} geplant`}>
                <div className="n">{fmtMin(scan.minsDone)}</div>
                <div className="l">Lernzeit</div>
              </div>
              {weak ? (
                <div className="k weak" title={`${weak.done} von ${weak.poss} Gelegenheiten`}>
                  <div className="n">{Math.round(weak.ratio * 100)}%</div>
                  <div className="l">↓ {shortName(weak.nm)}</div>
                </div>
              ) : (
                <div className="k">
                  <div className="n">{scan.fullDays}</div>
                  <div className="l">volle Tage</div>
                </div>
              )}
            </div>
          </div>
          <div className="lg">
            <span>0 %</span>
            <i style={{ background: "var(--h0)" }} />
            <i style={{ background: "var(--h1)" }} />
            <i style={{ background: "var(--h2)" }} />
            <i style={{ background: "var(--h3)" }} />
            <i style={{ background: "var(--h4)" }} />
            <span>100 %</span>
            <i className="skip" style={{ marginLeft: "10px" }} />
            <span>Feiertag · frei · krank (ohne Wertung)</span>
          </div>
        </div>
      ) : null}

      {/* ---------- Hinweise ---------- */}
      {stale ? (
        <div className="warn">
          {stale === "keine"
            ? "Keine Ferientermine hinterlegt — Schulferien werden nicht erkannt."
            : `Ferientermine enden am ${fromYmd(stale).toLocaleDateString("de-DE")} — ` +
              "neues Schuljahr in ~/.lernplan-config.json ergänzen, sonst zeigt " +
              "das Widget in den Ferien wieder Schultage."}
        </div>
      ) : null}
      {warn && warn.length ? (
        <div className="warn">
          {warn.slice(0, 3).map((w, i) => <u key={"w" + i}>· {w}</u>)}
          {warn.length > 3 ? <u>· … und {warn.length - 3} weitere</u> : null}
        </div>
      ) : null}
      {err ? <div className="err">⚠ {String(err)}</div> : null}
      {note && !err ? <div className="ok">✓ {String(note)}</div> : null}

      {/* ---------- Fuß ---------- */}
      <div className="ft">
        {missed ? (
          <span className="hint act" onClick={() => setView(missed.key)}
                title="Öffnet den Tag zum Nachtragen">
            {missed.days === 1 ? "Gestern" : `Vor ${missed.days} Tagen`} nichts
            eingetragen — klicken zum Nachtragen
          </span>
        ) : (
          <span className="hint">
            {btDue && bt
              ? `Licht aus ${hhmm(bt.bed)} — morgen klingelt es ${hhmm(bt.wake)}`
              : freeAhead
                ? `Nächster freier Tag: ${freeAhead.date.getDate()}.${freeAhead.date.getMonth() + 1}. ${freeAhead.label} (in ${freeAhead.days} Tagen)`
                : "Shortcut halten → Zeile hebt sich hervor = klickbereit"}
          </span>
        )}
        <span className="acts">
          {undoWhat ? (
            <span className="bk undo" onClick={() => undo()}
                  title={`Zurücknehmen: ${undoWhat}`}>↩ Rückgängig</span>
          ) : null}
          <span className="bk" onClick={() => openPath("config")}
                title="~/.lernplan-config.json im Texteditor öffnen">Konfig</span>
          <span className="bk" onClick={() => exportCsv(scan, cfg)}
                title={`${MONTHS[mRef.getMonth()]} als CSV in den Benutzerordner`}>CSV</span>
          <span className="bk" onClick={() => backup()}
                title="Kopie nach ~/.lernplan-backups">Sicherung</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Fehlerbremse: eine kaputte Konfiguration soll eine Meldung erzeugen und
 * nicht das ganze Widget vom Schreibtisch nehmen.
 */
export const render = (state) => {
  try {
    return view(state);
  } catch (e) {
    return (
      <div style={{ width: "420px", padding: "16px 18px" }}>
        <div className="err">⚠ Widget-Fehler: {String((e && e.message) || e)}</div>
        <div className="ft">
          <span>Prüfe ~/.lernplan-config.json — oder benenne sie um, dann greifen die Defaults.</span>
        </div>
      </div>
    );
  }
};
