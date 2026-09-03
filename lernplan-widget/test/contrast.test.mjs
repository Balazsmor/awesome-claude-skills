//  Kontrast nach WCAG 2.2 (SC 1.4.3 Text 4,5:1 · SC 1.4.11 Bedienelemente 3:1)
//  und Mindestgröße der Klickflächen (SC 2.5.8, 24×24 px).
//
//  Der Knackpunkt: Die Karte ist halbtransparent, der wirkliche Untergrund ist
//  also das Hintergrundbild des Schreibtischs. Geprüft wird deshalb gegen den
//  ungünstigsten Fall — ein weißes Hintergrundbild — und zusätzlich gegen die
//  aufgehellten Flächen, die im Widget über der Karte liegen.
//
//  Die Werte werden aus lernplan.jsx gelesen, nicht hier gepflegt. Wer eine
//  Farbe ändert, merkt es hier.
import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../lernplan.jsx", import.meta.url), "utf8");

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  if (JSON.stringify(a) === JSON.stringify(b)) pass++;
  else { fail++; console.log(`FAIL ${msg}\n  got ${JSON.stringify(a)}\n  exp ${JSON.stringify(b)}`); }
};
const ok = (v, msg) => eq(!!v, true, msg);

// ---- Farbrechnung ----------------------------------------------------------
const hex = (h) => {
  const s = h.replace("#", "");
  const n = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

// ---- Werte aus dem Widget ziehen -------------------------------------------
/** Eine CSS-Variable aus dem Stylesheet des Widgets lesen. */
function cssVar(name) {
  const m = new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`).exec(CSS);
  if (!m) throw new Error(`CSS-Variable --${name} nicht gefunden`);
  return m[1];
}
/** Deckkraft der Karte aus `background: rgba(19,21,27,X)`. */
function cardAlpha() {
  const m = /background:\s*rgba\(19,21,27,([\d.]+)\)/.exec(CSS);
  if (!m) throw new Error("Kartenhintergrund nicht gefunden");
  return Number(m[1]);
}

const ALPHA = cardAlpha();
const CARD = [19, 21, 27];
// Ungünstigster Fall: weißes Hintergrundbild. Ein dunkles ist immer besser.
const base = over(CARD, ALPHA, [255, 255, 255]);
const tint = (rgb, a) => base.map((c, i) => rgb[i] * a + c * (1 - a));

const BG = {
  karte: base,
  flaeche: tint([255, 255, 255], 0.045),   // .k .cd .strip .memo .help
  zeile: tint([255, 255, 255], 0.028),     // .row
  soon: tint([240, 104, 76], 0.12),        // .cd.soon
  saved: tint([111, 177, 115], 0.14),      // .core .saved
  warn: tint([224, 168, 63], 0.10),        // .warn
  setup: tint([224, 168, 63], 0.12),       // .setup
};

// ---- Text: 4,5:1 -----------------------------------------------------------
const TEXT = [
  ["--ink auf der Karte", cssVar("ink"), "karte"],
  ["--ink auf Flächen", cssVar("ink"), "flaeche"],
  ["--ink-2 auf der Karte", cssVar("ink-2"), "karte"],
  ["--ink-2 auf Flächen", cssVar("ink-2"), "flaeche"],
  ["--ink-3 auf der Karte", cssVar("ink-3"), "karte"],
  ["--ink-3 auf Flächen", cssVar("ink-3"), "flaeche"],
  ["--ink-3 in Zeilen", cssVar("ink-3"), "zeile"],
  ["--done-tx (erledigte Unterzeile)", cssVar("done-tx"), "zeile"],
  ["--deep-tx im Countdown", cssVar("deep-tx"), "soon"],
  ["--deep-tx auf der Karte", cssVar("deep-tx"), "karte"],
  ["--deep-tx auf Flächen", cssVar("deep-tx"), "flaeche"],
  ["--frei-tx auf der Karte", cssVar("frei-tx"), "karte"],
  ["--sick-tx auf der Karte", cssVar("sick-tx"), "karte"],
  ["--lese auf .saved", cssVar("lese"), "saved"],
  ["--lese auf der Karte", cssVar("lese"), "karte"],
  ["--morg auf .warn", cssVar("morg"), "warn"],
  ["--morg auf .setup", cssVar("morg"), "setup"],
  ["--morg auf der Karte", cssVar("morg"), "karte"],
];
for (const [name, color, bg] of TEXT) {
  const r = ratio(hex(color), BG[bg]);
  ok(r >= 4.5, `${name}: ${r.toFixed(2)}:1 — braucht 4,5:1`);
}

// ---- Bedienelemente und Rahmen: 3:1 ----------------------------------------
const UI = [
  ["--deep als Rahmen", cssVar("deep"), "karte"],
  ["--frei als Rahmen", cssVar("frei"), "karte"],
  ["--sick als Rahmen", cssVar("sick"), "karte"],
  ["--anki als Rahmen", cssVar("anki"), "karte"],
  ["--lese als Häkchenfläche", cssVar("lese"), "karte"],
  ["--morg als Fläche", cssVar("morg"), "karte"],
];
for (const [name, color, bg] of UI) {
  const r = ratio(hex(color), BG[bg]);
  ok(r >= 3, `${name}: ${r.toFixed(2)}:1 — braucht 3:1`);
}

// ---- Dunkle Schrift auf farbigen Flächen -----------------------------------
ok(ratio(hex("#1a1408"), hex(cssVar("morg"))) >= 4.5, "Badge-Schrift auf Orange");
ok(ratio(hex("#0e150f"), hex(cssVar("lese"))) >= 4.5, "Häkchen auf Grün");

// ---- Klickflächen: 24×24 px (SC 2.5.8) -------------------------------------
//  Geprüft wird, dass jede Regel, die einen Zeiger zeigt, auch eine
//  Mindesthöhe mitbringt — sonst sind es 14 px hohe Ziele.
const CLICKABLE = [
  ".hd .badge ", ".hd .badge.flat ", ".core .go ", ".strip .stop ",
  ".mon .nav ", ".ft .bk ", ".setup .btn ", ".ft .hint.act ", ".memo ",
];
for (const sel of CLICKABLE) {
  const i = CSS.indexOf(sel + "{");
  ok(i > 0, `Regel ${sel.trim()} gefunden`);
  if (i < 0) continue;
  const rule = CSS.slice(i, CSS.indexOf("}", i));
  ok(/min-height:\s*24px/.test(rule), `${sel.trim()} ist mindestens 24 px hoch`);
}
// Die Pfeile sind schmal — sie brauchen zusätzlich eine Mindestbreite
{
  const i = CSS.indexOf(".mon .nav {");
  const rule = CSS.slice(i, CSS.indexOf("}", i));
  ok(/min-width:\s*24px/.test(rule), "Monatspfeile sind mindestens 24 px breit");
}
// Timer-Knopf und Kalenderzellen sind feste Quadrate
ok(/\.row \.pl \{[^}]*width:24px;\s*height:24px/.test(CSS), "Timer-Knopf ist 24×24");
ok(/\.cell \{[^}]*height:24px/.test(CSS), "Kalenderzellen sind 24 px hoch");
ok(/grid-template-columns:repeat\(7,\s*24px\)/.test(CSS), "Kalenderzellen sind 24 px breit");

// ---- Bewegung reduzieren ---------------------------------------------------
ok(/@media \(prefers-reduced-motion: reduce\)/.test(CSS), "Bewegung lässt sich abschalten");

// ---- Keine Schriftfarbe mehr auf den kräftigen Varianten -------------------
//  Achtung beim Muster: "border-color:var(--deep)" endet auf denselben Text.
//  Gemeint ist nur die Schriftfarbe, also muss davor Zeilenanfang oder
//  Leerzeichen stehen — kein Bindestrich.
for (const v of ["deep", "frei", "sick"]) {
  ok(!new RegExp(`(^|[\\s;{])color:var\\(--${v}\\)`).test(CSS),
     `--${v} wird nicht mehr als Schriftfarbe benutzt`);
}
// Gegenprobe: als Rahmenfarbe kommt die kräftige Variante weiterhin vor
ok(/border-color:var\(--deep\)/.test(CSS), "--deep bleibt Rahmenfarbe");

// ---- iPhone-Fassung --------------------------------------------------------
//  Dort ist der Hintergrund ein deckender Verlauf, der Kontrast also exakt
//  berechenbar. Geprüft wird gegen das hellere Ende des Verlaufs.
{
  const IOS = readFileSync(new URL("../mobile/Lernplan.js", import.meta.url), "utf8");
  const c = (n) => {
    const m = new RegExp(`${n}:\\s*new Color\\("(#[0-9a-fA-F]{6})"`).exec(IOS);
    if (!m) throw new Error(`Farbe ${n} in Lernplan.js nicht gefunden`);
    return m[1];
  };
  const bg = hex(c("bgTop"));
  for (const name of ["ink", "ink2", "ink3", "morg", "deep", "anki", "lese", "frei", "done"]) {
    const r = ratio(hex(c(name)), bg);
    ok(r >= 4.5, `iOS ${name}: ${r.toFixed(2)}:1 — braucht 4,5:1`);
  }
  // `fix` markiert nur den Punkt vor Fixterminen — Bedienelement, also 3:1
  const rFix = ratio(hex(c("fix")), bg);
  ok(rFix >= 3, `iOS fix: ${rFix.toFixed(2)}:1 — braucht 3:1`);
  ok(!new RegExp("textColor\\s*=\\s*C\\.fix").test(IOS), "iOS: fix wird nicht als Schrift benutzt");
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen  (Kontrast & Klickflächen)`);
process.exit(fail ? 1 : 0);
