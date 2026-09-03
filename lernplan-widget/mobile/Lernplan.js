// Variables used by Scriptable.
// These must be at the very top of the file. Comments below are OK.
// icon-color: orange; icon-glyph: graduation-cap;
// ============================================================================
//  LERNPLAN  ·  Scriptable (iOS)                                          v1
//
//  Die Handy-Fassung des Lernplan-Widgets. Zeigt den Tagesplan, was als
//  Nächstes ansteht, die Tagesquote, die Kern-Streak und den Countdown zur
//  Prüfung. Kennt dieselben Schulferien und Feiertage (Baden-Württemberg) wie
//  die Mac-Fassung und liest dieselben Dateien.
//
//  UNTERSTÜTZTE GRÖSSEN
//    · Mittel (Home-Bildschirm, rechteckig)  ← dafür ist das Layout gemacht
//    · Rechteckig (Sperrbildschirm)          ← zweizeilig, einfarbig
//    · Klein und Groß laufen ebenfalls
//
//  EINRICHTEN
//    1. Scriptable aus dem App Store laden.
//    2. In Scriptable "+" → diesen Text einfügen → Skript "Lernplan" nennen.
//       Der Name muss "Lernplan" lauten, sonst öffnet der Tipp aufs Widget
//       das falsche Skript.
//    3. Home-Bildschirm → lange drücken → "+" → Scriptable → mittlere Größe.
//       Widget antippen → "Skript" = Lernplan, "When Interacting" = Run Script.
//
//  ABHAKEN
//    iOS-Widgets können keine Häkchen setzen. Ein Tipp aufs Widget öffnet
//    deshalb die Liste in Scriptable — dort abhaken, fertig, das Widget zieht
//    beim nächsten Auffrischen nach.
//
//  DATEIEN  (in Scriptable → Documents, also iCloud Drive)
//    lernplan-widget.json   Häkchen, Markierungen, Notizen  — Format wie Mac
//    lernplan-config.json   deine Konfiguration (optional)
//
//  MIT DEM MAC TEILEN
//    Beide Fassungen benutzen dasselbe Format. Damit sie sich denselben Stand
//    teilen, in ~/.lernplan-config.json auf dem Mac eintragen:
//      "statePath": "$HOME/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/lernplan-widget.json"
//    Details stehen in der README.
// ============================================================================

// ============================================================================
//  1 · DEFAULTS  (von lernplan-config.json überschreibbar)
// ============================================================================

const DEFAULTS = {
  core: ["morgen", "anki", "lesen"],
  durations: { morg: 30, anki: 15, deep: 60, wdh: 45, lese: 45, frei: 0, fix: 0 },

  exams: [
    { date: "2026-10-01", label: "IHK Teil 1 (falls verkürzt)" },
    { date: "2027-02-25", label: "IHK Teil 1" },
  ],

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

  days: {
    mo: {
      label: "Montag", tag: "SCHULTAG", hot: true,
      note: "Dein bester Lerntag · gehört Deutsch",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", kind: "morg", track: true },
        { id: "schule", t: "7:45", nm: "Schule", sub: "bis 14:45", kind: "fix" },
        { id: "anki", t: "15:20", nm: "Anki 15′", kind: "anki", track: true },
        { id: "deutsch", t: "16:00", nm: "Deutsch-Schreibtraining", sub: "FOKUS 90′", kind: "deep", track: true },
        { id: "lesen", t: "18:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "nachber", t: "19:30", nm: "Nachbereiten", sub: "→ 5–10 Anki-Karten", kind: "wdh", track: true, min: 30 },
        { id: "frei", t: "20:00", nm: "Frei", kind: "frei" },
      ],
    },
    di: {
      label: "Dienstag", tag: "BETRIEB",
      note: "Abends nur leicht wiederholen",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "wdh", t: "17:15", nm: "Wiederholen 45′", sub: "WiSo / BWL", kind: "wdh", track: true },
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
        { id: "betrieb", t: "11:45", nm: "Betrieb", sub: "bis 16:00", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "englisch", t: "17:15", nm: "Englisch 45′", sub: "Vokabeln + 1 Übung", kind: "wdh", track: true },
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
        { id: "anki", t: "16:40", nm: "Anki 10′", sub: "nur der Kern", kind: "anki", track: true },
        { id: "frei", t: "17:00", nm: "Freundin & Erholung", sub: "geschützt", kind: "frei" },
        { id: "lesen", t: "opt.", nm: "Lesen, wenn es reinpasst", kind: "lese", track: true, opt: true },
      ],
    },
    fr: {
      label: "Freitag", tag: "BETRIEB",
      note: "Woche abschließen",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "review", t: "17:15", nm: "Wochen-Review 15′", sub: "Material rauslegen", kind: "wdh", track: true },
        { id: "lesen", t: "18:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "ab 19", nm: "Frei · Woche geschafft", kind: "frei" },
      ],
    },
    sa: {
      label: "Samstag", tag: "PIZZERIA PM", hot: true,
      note: "Deep-Work-Vormittag · Rechnen",
      blocks: [
        { id: "morgen", t: "7:00", nm: "Morgenroutine", sub: "Schlaf schützen", kind: "morg", track: true },
        { id: "anki", t: "8:45", nm: "Anki 15′", sub: "Warm-up", kind: "anki", track: true },
        { id: "deepA", t: "9:00", nm: "Deutsch intensiv", sub: "DEEP A 60′", kind: "deep", track: true },
        { id: "deepB", t: "10:15", nm: "Aufgaben-Mix ReWe / KLR", sub: "DEEP B 60′", kind: "deep", track: true },
        { id: "lesen", t: "12:30", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "13:15", nm: "Frei", kind: "frei" },
        { id: "pizza", t: "16:50", nm: "Pizzeria", sub: "bis 21:00", kind: "fix" },
      ],
    },
    so: {
      label: "Sonntag", tag: "PIZZERIA PM", hot: true,
      note: "Deep Work + Planung",
      blocks: [
        { id: "morgen", t: "7:00", nm: "Morgenroutine", sub: "Schlaf schützen", kind: "morg", track: true },
        { id: "anki", t: "8:45", nm: "Anki 15′", sub: "Warm-up", kind: "anki", track: true },
        { id: "deepA", t: "9:00", nm: "Englisch intensiv", sub: "DEEP A 60′", kind: "deep", track: true },
        { id: "deepB", t: "10:15", nm: "Feynman: Erklären", sub: "DEEP B 60′", kind: "deep", track: true },
        { id: "wplan", t: "11:30", nm: "Wochenplanung 30′", sub: "2 Schwerpunkte", kind: "wdh", track: true },
        { id: "lesen", t: "12:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "pizza", t: "16:50", nm: "Pizzeria", sub: "bis 21:00", kind: "fix" },
      ],
    },
  },

  vacationDays: {
    mo: {
      label: "Montag", tag: "FERIEN · BETRIEB", hot: true,
      note: "Keine Schule — Deutschblock am Abend",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "deutsch", t: "17:15", nm: "Deutsch-Schreibtraining", sub: "FOKUS 60′", kind: "deep", track: true },
        { id: "lesen", t: "18:30", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "ab 19:30", nm: "Frei", kind: "frei" },
      ],
    },
    mi: {
      label: "Mittwoch", tag: "FERIEN · BETRIEB",
      note: "Keine Berufsschule — Englisch am Abend",
      blocks: [
        { id: "morgen", t: "5:30", nm: "Morgenroutine", sub: "Kurzversion", kind: "morg", track: true, min: 20 },
        { id: "betrieb", t: "7:00", nm: "Betrieb", sub: "bis 16:00", kind: "fix" },
        { id: "anki", t: "17:00", nm: "Anki 15′", kind: "anki", track: true },
        { id: "englisch", t: "17:15", nm: "Englisch 45′", sub: "Vokabeln + 1 Übung", kind: "wdh", track: true },
        { id: "lesen", t: "18:00", nm: "Lesen 45′", kind: "lese", track: true },
        { id: "frei", t: "ab 19", nm: "Frei", kind: "frei" },
      ],
    },
  },

  freeDay: {
    label: "", tag: "FREI", rest: true,
    note: "Zählt nicht in die Quote — Erholung ist eingeplant",
    blocks: [
      { id: "morgen", t: "8:00", nm: "Morgenroutine", sub: "in Ruhe", kind: "morg", track: true },
      { id: "anki", t: "10:00", nm: "Anki 15′", sub: "hält die Kette am Laufen", kind: "anki", track: true },
      { id: "lesen", t: "opt.", nm: "Lesen 45′", kind: "lese", track: true },
      { id: "frei", t: "—", nm: "Erholung", kind: "frei" },
    ],
  },
};

// ============================================================================
//  2 · Farben und Maße
// ============================================================================

const C = {
  bgTop: new Color("#191c24"),
  bgBottom: new Color("#0f1116"),
  ink: new Color("#eef1f7"),
  ink2: new Color("#a9b1c0"),
  ink3: new Color("#7d8695"),
  line: new Color("#ffffff", 0.10),
  morg: new Color("#e0a83f"),
  deep: new Color("#f0684c"),
  anki: new Color("#3fa9b8"),
  wdh: new Color("#3fa9b8"),
  lese: new Color("#6fb173"),
  frei: new Color("#7c8598"),
  fix: new Color("#6b7385"),
  done: new Color("#6fb173"),
};

/** Randfarbe eines Blocks nach seiner Art. */
function kindColor(kind) {
  return C[kind] || C.fix;
}

// ============================================================================
//  3 · Kalender  (identisch zur Mac-Fassung)
// ============================================================================

const DAY_KEYS = ["so", "mo", "di", "mi", "do", "fr", "sa"]; // getDay(): 0 = So
const WD_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Lokales Datum als YYYY-MM-DD (nicht toISOString — das wäre UTC). */
function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-08-13" → Date (12:00 Ortszeit, damit Sommerzeit nie kippt). */
function fromYmd(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function dayKey(d) {
  return DAY_KEYS[d.getDay()];
}

function plusDays(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** Ostersonntag nach der Gaußschen Osterformel (gregorianisch). */
function easterSunday(y) {
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

const HOLIDAY_CACHE = {};

/** Gesetzliche Feiertage in Baden-Württemberg. */
function holidaysBW(year) {
  if (HOLIDAY_CACHE[year]) return HOLIDAY_CACHE[year];
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
  HOLIDAY_CACHE[year] = out;
  return out;
}

function vacationName(key, cfg) {
  for (const v of cfg.vacations || []) {
    if (Array.isArray(v) && key >= v[0] && key <= v[1]) return v[2];
  }
  return null;
}

/** Liefert immer einen benutzbaren Plan, auch bei lückenhafter Konfiguration. */
function planOf(cfg, dk, which) {
  const src = (cfg && cfg[which || "days"]) || {};
  const p = src[dk];
  if (p && Array.isArray(p.blocks) && p.blocks.length) return p;
  if (which && which !== "days") return null;
  const fb = DEFAULTS.days[dk];
  return { ...fb, note: (p && p.note) || fb.note };
}

function labelOf(cfg, dk) {
  return planOf(cfg, dk).label || DEFAULTS.days[dk].label;
}

function freePlanOf(cfg, dk) {
  const f = cfg && cfg.freeDay;
  const base = (f && Array.isArray(f.blocks) && f.blocks.length) ? f : DEFAULTS.freeDay;
  return { ...base, label: labelOf(cfg, dk) };
}

function markInfo(mark) {
  if (!mark) return null;
  if (mark === "krank") return { kind: "sick", label: "Krank gemeldet" };
  return { kind: "off", label: "Frei markiert" };
}

/**
 * Alles über einen Tag.
 *   kind:   school | vacation | holiday | off | sick | weekend
 *   counts: fließt der Tag in Quote und Streak ein?
 */
function dayInfo(date, cfg, marks) {
  const key = ymd(date);
  const dk = dayKey(date);
  const weekend = dk === "sa" || dk === "so";
  const holiday = holidaysBW(date.getFullYear())[key] || null;
  const vac = vacationName(key, cfg);
  const mark = markInfo(marks && marks[key]);

  if (mark) {
    return { key, dk, kind: mark.kind, counts: false, label: mark.label, plan: freePlanOf(cfg, dk) };
  }
  if (holiday && !weekend) {
    return { key, dk, kind: "holiday", counts: false, label: holiday, plan: freePlanOf(cfg, dk) };
  }
  if (weekend) {
    return { key, dk, kind: "weekend", counts: true, label: vac || null, plan: planOf(cfg, dk) };
  }
  if (vac) {
    return { key, dk, kind: "vacation", counts: true, label: vac,
             plan: planOf(cfg, dk, "vacationDays") || planOf(cfg, dk) };
  }
  return { key, dk, kind: "school", counts: true, label: null, plan: planOf(cfg, dk) };
}

// ============================================================================
//  4 · Auswertung
// ============================================================================

function scoredBlocks(plan) {
  if (!plan || !plan.blocks) return [];
  return plan.blocks.filter((b) => b.track && !b.opt);
}

function blockMinutes(b, cfg) {
  if (!b) return 0;
  if (Number.isFinite(b.min)) return Math.max(0, b.min);
  const m = /(\d{1,3})\s*(?:′|'|min\b|Min\b)/.exec(`${b.nm || ""} ${b.sub || ""}`);
  if (m) return Number(m[1]);
  const tbl = (cfg && cfg.durations) || DEFAULTS.durations;
  const v = tbl[b.kind];
  return Number.isFinite(v) ? v : 0;
}

function dayMinutes(plan, doneIds, cfg) {
  const set = new Set(doneIds || []);
  let planned = 0, done = 0;
  for (const b of scoredBlocks(plan)) {
    const m = blockMinutes(b, cfg);
    planned += m;
    if (set.has(b.id)) done += m;
  }
  return { plan: planned, done };
}

function coreIdsOf(plan, cfg) {
  if (!plan || !plan.blocks) return [];
  return plan.blocks
    .filter((b) => b.track && !b.opt && (cfg.core || []).includes(b.id))
    .map((b) => b.id);
}

function coreDone(plan, doneIds, cfg) {
  const needed = coreIdsOf(plan, cfg);
  if (!needed.length) return false;
  const set = new Set(doneIds || []);
  return needed.every((id) => set.has(id));
}

const doneOf = (data, key) => (data && data.d && data.d[key]) || [];

/** Streak: aufeinanderfolgende Tage mit erfülltem Kern, freie Tage überbrücken. */
function coreStreak(data, today, cfg) {
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

function nextExam(today, cfg) {
  const key = ymd(today);
  const list = (cfg.exams || [])
    .filter((e) => e && e.date >= key)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!list.length) return null;
  const e = list[0];
  const days = Math.round((fromYmd(e.date).getTime() - fromYmd(key).getTime()) / 86400000);
  return { ...e, days };
}

/** "16:00" → 960. Versteht "ab 19", "19.30"; "opt." und "—" ergeben null. */
function toMinutes(t) {
  const s = String(t).trim().toLowerCase().replace(/^ab\s+/, "");
  let m = /^(\d{1,2})[:.](\d{2})$/.exec(s);
  if (m && +m[1] <= 23 && +m[2] <= 59) return +m[1] * 60 + +m[2];
  m = /^(\d{1,2})$/.exec(s);
  if (m && +m[1] <= 23) return +m[1] * 60;
  return null;
}

/** Was läuft, was kommt — mit Restzeit. */
function timeline(plan, now, cfg) {
  const empty = { cur: null, curLeft: null, next: null, nextIn: null };
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
    if (curLeft <= 0) curLeft = null;
  }
  return { cur: cur ? cur.b : null, curLeft, next: next ? next.b : null,
           nextIn: next ? next.m - mins : null };
}

function fmtMin(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

function shortName(nm, max) {
  const s = String(nm).split(/[:—·]/)[0].trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

// ============================================================================
//  5 · Dateien  (iCloud Drive → Scriptable/Documents)
// ============================================================================

const STATE_NAME = "lernplan-widget.json";
const CONFIG_NAME = "lernplan-config.json";

function fileManager() {
  //  iCloud, wo es geht — sonst lokal. Ohne iCloud bleibt der Stand auf dem
  //  Gerät, das Widget funktioniert trotzdem.
  try {
    const fm = FileManager.iCloud();
    fm.documentsDirectory();
    return fm;
  } catch (e) {
    return FileManager.local();
  }
}

const FM = fileManager();
const DIR = FM.documentsDirectory();
const STATE_PATH = FM.joinPath(DIR, STATE_NAME);
const CONFIG_PATH = FM.joinPath(DIR, CONFIG_NAME);

/** Datei lesen; in iCloud liegende Dateien vorher herunterladen. */
async function readFile(path) {
  if (!FM.fileExists(path)) return null;
  try {
    if (FM.isFileStoredIniCloud && FM.isFileStoredIniCloud(path) &&
        FM.isFileDownloaded && !FM.isFileDownloaded(path)) {
      await FM.downloadFileFromiCloud(path);
    }
    return FM.readString(path);
  } catch (e) {
    return null;
  }
}

/** Zusammenführen wie am Mac: gesetzte Schlüssel der Nutzerdatei gewinnen. */
function mergeConfig(base, user) {
  if (!user || typeof user !== "object") return base;
  const deep = ["days", "vacationDays", "durations"];
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

/** Zustand lesen — versteht v1 bis v4 wie die Mac-Fassung. */
function parseState(raw) {
  const empty = { v: 4, d: {}, f: {}, n: {}, t: null, b: "", w: {}, u: {} };
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
    return { v: 4, d: obj(o.d), f, n, w, u: obj(o.u),
             t: (o.t && typeof o.t === "object" && o.t.id) ? o.t : null,
             b: typeof o.b === "string" ? o.b : "" };
  } catch (e) {
    return empty;
  }
}

async function loadAll() {
  const cfgRaw = await readFile(CONFIG_PATH);
  let cfg = DEFAULTS;
  let cfgErr = null;
  if (cfgRaw) {
    try {
      cfg = mergeConfig(DEFAULTS, JSON.parse(cfgRaw));
    } catch (e) {
      cfgErr = "Konfiguration ist kein gültiges JSON";
    }
  }
  const data = parseState(await readFile(STATE_PATH));
  return { cfg, data, cfgErr, hasConfig: !!cfgRaw };
}

/**
 * Zustand sichern. Vor dem ersten Schreiben eines Tages wandert eine Kopie
 * nach lernplan-backup-YYYY-MM-DD.json — auf dem Handy gibt es kein atomares
 * Umbenennen, also lieber eine Kopie zu viel.
 */
function saveState(data) {
  const key = ymd(new Date());
  if (data.b !== key && FM.fileExists(STATE_PATH)) {
    try {
      const bak = FM.joinPath(DIR, `lernplan-backup-${key}.json`);
      if (!FM.fileExists(bak)) FM.copy(STATE_PATH, bak);
      data = { ...data, b: key };
    } catch (e) { /* Sicherung ist Komfort */ }
  }
  FM.writeString(STATE_PATH, JSON.stringify(data));
  return data;
}

// ============================================================================
//  6 · Widget
// ============================================================================

/** Kleiner Fortschrittsbalken aus zwei Stapeln. */
function progressBar(stack, width, pct, color) {
  const track = stack.addStack();
  track.size = new Size(width, 4);
  track.cornerRadius = 2;
  track.backgroundColor = new Color("#ffffff", 0.12);
  if (pct > 0) {
    const fill = track.addStack();
    fill.size = new Size(Math.max(2, Math.round((width * pct) / 100)), 4);
    fill.cornerRadius = 2;
    fill.backgroundColor = color;
  }
  track.addSpacer();
}

/** Punkt bzw. Haken vor einer Blockzeile. */
function bullet(row, done, color) {
  const dot = row.addStack();
  dot.size = new Size(9, 9);
  dot.cornerRadius = 4.5;
  dot.backgroundColor = done ? C.done : new Color("#ffffff", 0.001);
  if (!done) {
    dot.borderWidth = 1.4;
    dot.borderColor = color;
  }
  dot.addSpacer();
}

/** Eine Zeile im Tagesplan: Punkt · Uhrzeit · Name. */
function blockRow(stack, b, done, cfg, opts) {
  const o = opts || {};
  const row = stack.addStack();
  row.centerAlignContent();
  row.spacing = 6;

  bullet(row, done, kindColor(b.kind));

  const t = row.addText(b.t === "opt." || b.t === "—" ? "·" : b.t);
  t.font = Font.mediumSystemFont(o.small ? 9 : 10);
  t.textColor = done ? C.ink3 : C.ink2;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.9;

  const nm = row.addText(shortName(b.nm, o.max || 22));
  nm.font = done ? Font.systemFont(o.small ? 10 : 11) : Font.mediumSystemFont(o.small ? 10 : 11);
  nm.textColor = done ? C.ink3 : C.ink;
  nm.lineLimit = 1;
  nm.minimumScaleFactor = 0.85;

  row.addSpacer();

  if (o.showMin) {
    const m = blockMinutes(b, cfg);
    if (m > 0) {
      const mt = row.addText(`${m}′`);
      mt.font = Font.systemFont(9);
      mt.textColor = C.ink3;
    }
  }
  return row;
}

/**
 * Welche Blöcke zeigen? Ab dem laufenden Zeitfenster, damit morgens der
 * Morgen und abends der Abend zu sehen ist. Reicht es nicht, wird nach vorn
 * aufgefüllt, damit die Fläche nie halb leer bleibt.
 */
function blocksToShow(plan, now, limit) {
  const blocks = (plan && plan.blocks) || [];
  if (blocks.length <= limit) return blocks;
  const mins = now.getHours() * 60 + now.getMinutes();
  let start = 0;
  blocks.forEach((b, i) => {
    const m = toMinutes(b.t);
    if (m !== null && m <= mins) start = i;
  });
  if (start + limit > blocks.length) start = blocks.length - limit;
  return blocks.slice(Math.max(0, start), Math.max(0, start) + limit);
}

/** Kopfzeile: Wochentag, Datum, Kennzeichnung. */
function header(widget, info, now, pct, hit, total, big, cfg) {
  const row = widget.addStack();
  row.centerAlignContent();

  const left = row.addStack();
  left.layoutVertically();
  left.spacing = 1;

  const title = left.addText(info.plan.label || labelOf(cfg, info.dk));
  title.font = Font.boldSystemFont(big ? 15 : 13);
  title.textColor = C.ink;
  title.lineLimit = 1;

  const sub = left.addText(
    `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.` +
    ` · ${info.label || info.plan.tag}`
  );
  sub.font = Font.systemFont(big ? 10 : 9);
  sub.textColor = C.ink3;
  sub.lineLimit = 1;
  sub.minimumScaleFactor = 0.8;

  row.addSpacer();

  const right = row.addStack();
  right.layoutVertically();
  const p = right.addText(info.counts ? `${pct}%` : "frei");
  p.font = Font.boldSystemFont(big ? 22 : 19);
  p.textColor = info.counts ? C.ink : C.ink3;
  p.rightAlignText();
  const q = right.addText(info.counts ? `${hit}/${total}` : "ohne Wertung");
  q.font = Font.systemFont(9);
  q.textColor = C.ink3;
  q.rightAlignText();
}

/** Fußzeile: Streak, nächste Prüfung, offene Zeit. */
function footer(widget, streak, exam, openMin) {
  const row = widget.addStack();
  row.centerAlignContent();
  row.spacing = 8;

  if (streak > 0) {
    const s = row.addText(`🔥 ${streak}`);
    s.font = Font.mediumSystemFont(10);
    s.textColor = C.morg;
  }
  if (openMin > 0) {
    const o = row.addText(`offen ${fmtMin(openMin)}`);
    o.font = Font.systemFont(10);
    o.textColor = C.ink3;
  }
  row.addSpacer();
  if (exam) {
    const e = row.addText(`${exam.days} T · ${shortName(exam.label, 16)}`);
    e.font = Font.systemFont(10);
    e.textColor = exam.days <= 21 ? C.deep : C.ink3;
    e.lineLimit = 1;
    e.minimumScaleFactor = 0.8;
  }
}

/** Home-Bildschirm: klein, mittel, groß. */
function buildHomeWidget(family, ctx) {
  const { info, now, pct, hit, total, streak, exam, budget, doneSet, cfg } = ctx;
  const w = new ListWidget();
  const g = new LinearGradient();
  g.colors = [C.bgTop, C.bgBottom];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.setPadding(12, 13, 12, 13);

  const openMin = Math.max(0, budget.plan - budget.done);

  if (family === "small") {
    const t = w.addText(info.plan.label || labelOf(cfg, info.dk));
    t.font = Font.mediumSystemFont(11);
    t.textColor = C.ink3;
    t.lineLimit = 1;

    const p = w.addText(info.counts ? `${pct}%` : "frei");
    p.font = Font.boldSystemFont(30);
    p.textColor = info.counts ? C.ink : C.ink3;

    progressBar(w, 128, pct, pct >= 100 ? C.done : C.morg);
    w.addSpacer(6);

    const tl = timeline(info.plan, now, cfg);
    const nxt = tl.next || tl.cur;
    if (nxt) {
      const n = w.addText(`${nxt.t}  ${shortName(nxt.nm, 16)}`);
      n.font = Font.systemFont(10);
      n.textColor = C.ink2;
      n.lineLimit = 2;
    }
    w.addSpacer();
    const f = w.addStack();
    f.centerAlignContent();
    if (streak > 0) {
      const s = f.addText(`🔥 ${streak}`);
      s.font = Font.mediumSystemFont(10);
      s.textColor = C.morg;
    }
    f.addSpacer();
    if (exam) {
      const e = f.addText(`${exam.days} T`);
      e.font = Font.systemFont(10);
      e.textColor = exam.days <= 21 ? C.deep : C.ink3;
    }
    return w;
  }

  const big = family === "large";
  header(w, info, now, pct, hit, total, big, cfg);
  w.addSpacer(7);
  progressBar(w, big ? 320 : 316, pct, pct >= 100 ? C.done : C.morg);
  w.addSpacer(big ? 9 : 7);

  const limit = big ? 8 : 3;
  const list = w.addStack();
  list.layoutVertically();
  list.spacing = big ? 5 : 4;
  for (const b of blocksToShow(info.plan, now, limit)) {
    blockRow(list, b, doneSet.has(b.id), cfg, { max: big ? 30 : 24, showMin: big });
  }

  w.addSpacer();
  footer(w, streak, exam, openMin);
  return w;
}

/** Sperrbildschirm: rechteckig, einfarbig, sehr wenig Platz. */
function buildAccessoryWidget(ctx) {
  const { info, now, pct, hit, total, streak, cfg, doneSet } = ctx;
  const w = new ListWidget();
  w.backgroundColor = new Color("#000000", 0);
  if (w.addAccessoryWidgetBackground !== undefined) w.addAccessoryWidgetBackground = true;
  w.setPadding(2, 2, 2, 2);

  const top = w.addStack();
  top.centerAlignContent();
  top.spacing = 4;
  const t1 = top.addText(`${WD_SHORT[now.getDay()]} ${info.counts ? pct + "%" : "frei"}`);
  t1.font = Font.boldSystemFont(13);
  top.addSpacer();
  if (streak > 0) {
    const s = top.addText(`🔥${streak}`);
    s.font = Font.mediumSystemFont(12);
  }

  const tl = timeline(info.plan, now, cfg);
  const open = (info.plan.blocks || []).filter((b) => b.track && !b.opt && !doneSet.has(b.id));
  const nxt = tl.next || open[0];
  const l2 = w.addText(nxt ? `${nxt.t}  ${shortName(nxt.nm, 18)}` : "alles erledigt");
  l2.font = Font.systemFont(12);
  l2.lineLimit = 1;
  l2.minimumScaleFactor = 0.8;

  const l3 = w.addText(info.counts ? `${hit}/${total} erledigt` : (info.label || "ohne Wertung"));
  l3.font = Font.systemFont(11);
  l3.textColor = new Color("#ffffff", 0.7);
  l3.lineLimit = 1;
  return w;
}

/**
 * Wann soll iOS das Widget erneut zeichnen? Zum nächsten Blockwechsel, aber
 * höchstens in einer Viertelstunde — iOS hält sich ohnehin nur ungefähr daran.
 */
function refreshDate(plan, now) {
  const mins = now.getHours() * 60 + now.getMinutes();
  let next = null;
  for (const b of (plan && plan.blocks) || []) {
    const m = toMinutes(b.t);
    if (m !== null && m > mins && (next === null || m < next)) next = m;
  }
  const inMin = next === null ? 15 : Math.min(15, Math.max(1, next - mins));
  return new Date(Date.now() + inMin * 60000);
}

// ============================================================================
//  7 · Liste zum Abhaken  (läuft in der App, nicht im Widget)
// ============================================================================

async function presentList(ctx) {
  let { cfg, data, info } = ctx;
  const table = new UITable();
  table.showSeparators = true;

  const rebuild = () => {
    table.removeAllRows();
    const now = new Date();
    info = dayInfo(now, cfg, data.f || {});
    const plan = info.plan;
    const done = doneOf(data, info.key);
    const doneSet = new Set(done);
    const scored = scoredBlocks(plan);
    const hit = scored.filter((b) => doneSet.has(b.id)).length;
    const pct = scored.length ? Math.round((hit / scored.length) * 100) : 0;
    const budget = dayMinutes(plan, done, cfg);

    // Kopf
    const head = new UITableRow();
    head.height = 58;
    head.isHeader = true;
    const ht = head.addText(
      `${plan.label || labelOf(cfg, info.dk)} · ${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.`,
      info.counts
        ? `${hit}/${scored.length} · ${pct}% · ${fmtMin(budget.done)} von ${fmtMin(budget.plan)}`
        : `${info.label} — zählt nicht in die Quote`
    );
    ht.titleFont = Font.boldSystemFont(17);
    ht.subtitleFont = Font.systemFont(12);
    table.addRow(head);

    // Blöcke
    for (const b of plan.blocks) {
      const row = new UITableRow();
      row.height = 50;
      const on = doneSet.has(b.id);
      const mark = !b.track ? "  " : on ? "✓" : "○";
      const cell = row.addText(
        `${mark}  ${b.t}   ${b.nm}`,
        [b.sub, b.opt ? "Bonus" : null, b.track ? `${blockMinutes(b, cfg)}′` : "Fixtermin"]
          .filter(Boolean).join(" · ")
      );
      cell.titleFont = on ? Font.systemFont(15) : Font.mediumSystemFont(15);
      cell.titleColor = on ? Color.gray() : Color.dynamic(Color.black(), Color.white());
      cell.subtitleFont = Font.systemFont(11);
      cell.subtitleColor = Color.gray();
      if (b.track) {
        row.onSelect = () => {
          const set = new Set(doneOf(data, info.key));
          if (set.has(b.id)) set.delete(b.id); else set.add(b.id);
          const d = { ...(data.d || {}) };
          const arr = Array.from(set);
          if (arr.length) d[info.key] = arr; else delete d[info.key];
          data = saveState({ ...data, d });
          rebuild();
          table.reload();
        };
      }
      table.addRow(row);
    }

    // Aktionen
    const coreIds = coreIdsOf(plan, cfg);
    if (coreIds.length) {
      const all = coreIds.every((id) => doneSet.has(id));
      const r = new UITableRow();
      r.height = 46;
      const c = r.addText(all ? "Kern zurücknehmen" : "Kern abhaken",
        coreIds.join(" · ") + " — rettet den Tag");
      c.titleFont = Font.mediumSystemFont(15);
      c.titleColor = new Color("#3fa9b8");
      c.subtitleFont = Font.systemFont(11);
      c.subtitleColor = Color.gray();
      r.onSelect = () => {
        const set = new Set(doneOf(data, info.key));
        for (const id of coreIds) if (all) set.delete(id); else set.add(id);
        const d = { ...(data.d || {}) };
        const arr = Array.from(set);
        if (arr.length) d[info.key] = arr; else delete d[info.key];
        data = saveState({ ...data, d });
        rebuild();
        table.reload();
      };
      table.addRow(r);
    }

    const markRow = new UITableRow();
    markRow.height = 46;
    const cur = (data.f || {})[info.key];
    const mc = markRow.addText(
      cur === "krank" ? "Markierung: krank" : cur ? "Markierung: frei" : "Tag als frei / krank markieren",
      "Tippen schaltet weiter — markierte Tage zählen nicht und brechen die Streak nicht"
    );
    mc.titleFont = Font.mediumSystemFont(15);
    mc.titleColor = cur ? new Color("#e0a83f") : Color.gray();
    mc.subtitleFont = Font.systemFont(11);
    mc.subtitleColor = Color.gray();
    markRow.onSelect = () => {
      const f = { ...(data.f || {}) };
      const now2 = f[info.key] === "krank" ? null : f[info.key] ? "krank" : "frei";
      if (now2) f[info.key] = now2; else delete f[info.key];
      data = saveState({ ...data, f });
      rebuild();
      table.reload();
    };
    table.addRow(markRow);

    const noteRow = new UITableRow();
    noteRow.height = 46;
    const note = (data.n || {})[info.key] || "";
    const nc = noteRow.addText("Notiz", note || "was lief heute schief? festhalten …");
    nc.titleFont = Font.mediumSystemFont(15);
    nc.subtitleFont = Font.systemFont(11);
    nc.subtitleColor = Color.gray();
    noteRow.onSelect = async () => {
      const a = new Alert();
      a.title = "Notiz";
      a.message = info.key;
      a.addTextField("Notiz", note);
      a.addAction("Sichern");
      a.addCancelAction("Abbrechen");
      const i = await a.presentAlert();
      if (i !== 0) return;
      const txt = String(a.textFieldValue(0) || "").trim();
      const n = { ...(data.n || {}) };
      if (txt) n[info.key] = txt; else delete n[info.key];
      data = saveState({ ...data, n });
      rebuild();
      table.reload();
    };
    table.addRow(noteRow);

    // Vorschau
    const prev = new UITableRow();
    prev.height = 46;
    const pc = prev.addText("Widget-Vorschau", "so sieht das mittlere Widget gerade aus");
    pc.titleFont = Font.systemFont(15);
    pc.titleColor = Color.gray();
    pc.subtitleFont = Font.systemFont(11);
    pc.subtitleColor = Color.gray();
    prev.onSelect = async () => {
      const c = buildContext(cfg, data);
      await buildHomeWidget("medium", c).presentMedium();
    };
    table.addRow(prev);
  };

  rebuild();
  await table.present(false);
  return data;
}

// ============================================================================
//  8 · Start
// ============================================================================

/** Alles, was Widget und Liste gemeinsam brauchen. */
function buildContext(cfg, data) {
  const now = new Date();
  const marks = data.f || {};
  const info = dayInfo(now, cfg, marks);
  const done = doneOf(data, info.key);
  const doneSet = new Set(done);
  const scored = scoredBlocks(info.plan);
  const hit = scored.filter((b) => doneSet.has(b.id)).length;
  return {
    cfg, data, now, info, doneSet,
    hit, total: scored.length,
    pct: scored.length ? Math.round((hit / scored.length) * 100) : 0,
    budget: dayMinutes(info.plan, done, cfg),
    streak: coreStreak(data, now, cfg),
    exam: nextExam(now, cfg),
  };
}

/** Notnagel, falls etwas schiefgeht — ein leeres Widget wäre schlimmer. */
function errorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = C.bgBottom;
  w.setPadding(12, 13, 12, 13);
  const t = w.addText("Lernplan");
  t.font = Font.boldSystemFont(13);
  t.textColor = C.ink;
  const m = w.addText(String(msg));
  m.font = Font.systemFont(10);
  m.textColor = C.deep;
  m.lineLimit = 4;
  return w;
}

async function main() {
  const loaded = await loadAll();
  const ctx = buildContext(loaded.cfg, loaded.data);
  const family = config.widgetFamily || "medium";

  if (config.runsInWidget) {
    const w = family === "accessoryRectangular" || family === "accessoryInline" ||
              family === "accessoryCircular"
      ? buildAccessoryWidget(ctx)
      : buildHomeWidget(family, ctx);
    w.url = "scriptable:///run/" + encodeURIComponent(Script.name());
    w.refreshAfterDate = refreshDate(ctx.info.plan, ctx.now);
    Script.setWidget(w);
    return;
  }

  // In der App: abhaken. Danach das Widget neu zeichnen lassen.
  await presentList(ctx);
}

try {
  await main();
} catch (e) {
  if (config.runsInWidget) Script.setWidget(errorWidget(e.message || e));
  else throw e;
}
Script.complete();
