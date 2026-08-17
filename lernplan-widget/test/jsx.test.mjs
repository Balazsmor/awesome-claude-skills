//  Übersetzt lernplan.jsx GENAU so, wie Übersicht es tut, und prüft, dass
//  dabei nichts übrig bleibt, was im Widget nicht existiert.
//
//  Hintergrund: Übersicht schiebt .jsx-Widgets durch @babel/preset-react mit
//  `{pragma: 'html'}` (server/src/bundleWidget.js) und setzt dazu global
//  `window.html = require('react').createElement` (server/src/VirtualDomWidget.js).
//  Ein React-Bezeichner kommt im Widget also NIE vor.
//
//  Die Falle: `pragmaFrag` wird nicht mitgesetzt. Babel nimmt dafür seinen
//  Standard `React.Fragment` — ein einziges <>…</> im Code reicht, und das
//  Widget stirbt beim Laden mit "Can't find variable: React".
//
//  Genau daran ist v7 gescheitert. Der Test hier hätte es gefunden; der
//  andere Durchgang nicht, weil er esbuild ein eigenes Fragment mitgibt.
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0, fail = 0;
const ok = (v, msg) => { if (v) pass++; else { fail++; console.log(`FAIL ${msg}`); } };

const SRC = new URL("../lernplan.jsx", import.meta.url).pathname;
const out = join(mkdtempSync(join(tmpdir(), "lernplan-jsx-")), "widget.js");

//  --jsx-fragment wird bewusst NICHT gesetzt — dann steht dort, wie bei
//  Übersicht, der Standard React.Fragment, und ein Fragment fällt auf.
execFileSync("npx", ["--yes", "esbuild@0.23.1", SRC, "--jsx-factory=html", `--outfile=${out}`],
  { stdio: ["ignore", "ignore", "pipe"] });
const js = readFileSync(out, "utf8");

// Kein React-Bezeichner im übersetzten Widget
const hits = [...js.matchAll(/\bReact\b[.\w]*/g)].map((m) => m[0]);
ok(hits.length === 0,
   `Übersetztes Widget verweist auf React: ${[...new Set(hits)].join(", ")} — ` +
   "meist ein JSX-Fragment <>…</>; stattdessen ein echtes Element verwenden");

// Die JSX-Aufrufe müssen auf dem globalen html landen
ok(/\bhtml\(/.test(js), "JSX wird zu html(...) übersetzt");

// Im Quelltext selbst darf gar kein Fragment stehen. Kommentare vorher
// ausblenden — dort steht die Warnung davor, und die soll sich nicht selbst
// melden. Zeilenumbrüche bleiben stehen, damit die Zeilennummern stimmen.
const src = readFileSync(SRC, "utf8");
const ohneKommentare = src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/^(\s*)\/\/.*$/gm, "$1");
const frags = ohneKommentare.split("\n")
  .map((l, i) => [i + 1, l])
  .filter(([, l]) => /(^|[^-\w])<>/.test(l) || /<\/>/.test(l));
ok(frags.length === 0,
   `JSX-Fragmente in Zeile ${frags.map(([n]) => n).join(", ")} — ` +
   "Übersicht kann sie nicht übersetzen");

// Übersicht stellt genau diese Namen bereit; mehr darf nicht importiert werden
const imports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']uebersicht["']/g)]
  .flatMap((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean));
const ERLAUBT = ["run", "request", "css", "styled", "React"];
for (const name of imports) {
  ok(ERLAUBT.includes(name), `"${name}" wird von Übersicht nicht bereitgestellt`);
}
ok(imports.includes("run"), "run wird importiert");

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen  (JSX wie bei Übersicht)`);
process.exit(fail ? 1 : 0);
