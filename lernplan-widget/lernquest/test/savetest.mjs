// Prüft, dass während einer Stufenprüfung nicht veröffentlicht wird — eine
// Veröffentlichung lädt alle offenen Ansichten neu und risse den Durchgang ab.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("lernquest.html", "utf8")
  .replace("})();\n</script>",
    "  try { window.__EXAM = function () { return exam; };\n" +
    "        window.__S = function () { return state; }; } catch (e) {}\n})();\n</script>");
writeFileSync("preview-save.html",
`<!doctype html><html lang="de"><head><meta charset="utf-8"><style>*{margin:0}</style></head><body>\n${src}\n</body></html>`);

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const ctx = await b.newContext({ viewport:{width:1180,height:1000}, locale:"de-DE" });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message));

const t = new Date(); const ymd = d => d.toISOString().slice(0,10);
const day = n => { const x = new Date(t); x.setDate(t.getDate()-n); return ymd(x); };
const seed = { v:4, d:{}, f:{}, n:{}, w:{}, q:{}, g:[], zn:1.9, updatedAt:Date.now() };
for (let i=0;i<80;i++) seed.d[day(i)] = ["morgen","anki","lesen","deepA","deepB","wdh","deutsch","englisch"];

// Artefakt-Ablage nachbilden und jede Veröffentlichung mitzählen
await p.addInitScript(`
  window.__pub = [];
  window.claude = { use: function () { return Promise.resolve({
    publish: function (html) { window.__pub.push(html.length); return Promise.resolve(); }
  }); } };
  localStorage.setItem("lernquest.state.v4", ${JSON.stringify(JSON.stringify(seed))});
`);
await p.goto("file://" + process.cwd() + "/preview-save.html");
await p.waitForTimeout(500);

let ok=0, bad=0;
const eq = (nm, ist, soll) => { if (JSON.stringify(ist)===JSON.stringify(soll)) ok++;
  else { bad++; console.log(`  FEHLER ${nm}: ${JSON.stringify(ist)} statt ${JSON.stringify(soll)}`); } };
const wahr = (nm, x) => eq(nm, !!x, true);

eq("Status geteilt", await p.textContent("#savestate"), "gesichert");

// Ein Häkchen ausserhalb der Prüfung wird ganz normal veröffentlicht
await p.click('.quest[data-id="morgen"] .stampbox');
await p.waitForTimeout(2100);
eq("Normale Änderung veröffentlicht", await p.evaluate(()=>window.__pub.length), 1);

// Prüfung öffnen und komplett durchspielen
await p.click('.exbtn[data-attr="suk"]');
await p.waitForTimeout(200);
for (let i=0;i<5;i++) {
  const f = await p.evaluate(()=>{ const e=window.__EXAM(); return { t:e.fragen[e.i].t, k:e.fragen[e.i].k, a:e.fragen[e.i].a }; });
  if (f.t === "num") { await p.fill("#exNum", String(f.a)); await p.click('[data-act="examNum"]'); }
  else await p.click(`[data-act="examPick"][data-i="${f.k}"]`);
  await p.waitForTimeout(100);
  await p.click('[data-act="examNext"]');
  await p.waitForTimeout(100);
}
await p.waitForTimeout(2200);   // länger als die 1,6 s Sammelfrist
eq("Während der Prüfung nichts veröffentlicht", await p.evaluate(()=>window.__pub.length), 1);
eq("Status sagt es", await p.evaluate(()=>{
  const e=document.getElementById("savestate"); return e ? e.textContent : null; }),
  "wird nach der Prüfung gesichert");
eq("Stufe steht lokal schon", await p.evaluate(()=>
  JSON.parse(localStorage.getItem("lernquest.state.v4")).q.suk), 2);

// Schliessen holt die Veröffentlichung nach
await p.click('.exres [data-act="examClose"]');
await p.waitForTimeout(2200);
eq("Nach dem Schliessen veröffentlicht", await p.evaluate(()=>window.__pub.length), 2);
eq("Prüfungsstand im veröffentlichten Stand", await p.evaluate(()=>
  JSON.parse(localStorage.getItem("lernquest.state.v4")).q.suk), 2);
/* ---- Der Fokus-Timer veröffentlicht nicht im Sekundentakt --------------- */
const vorTimer = await p.evaluate(() => window.__pub.length);
await p.click('.quest .tbtn[data-act="tstart"]');
await p.waitForTimeout(2200);            // eine Veröffentlichung fürs Starten
eq("Timerstart wird gesichert", await p.evaluate(() => window.__pub.length), vorTimer + 1);
const a1 = await p.textContent("#tuhr");
await p.waitForTimeout(3200);            // drei Sekunden ticken
const a2 = await p.textContent("#tuhr");
eq("Der Sekundentakt veröffentlicht nichts",
   await p.evaluate(() => window.__pub.length), vorTimer + 1);
wahr("aber die Uhr läuft weiter", a1 !== a2);
wahr("Timer steht im Zustand", await p.evaluate(() => !!window.__S().t));

/* ---- Ablauf: Wecker klingelt einmal, dann ist der Timer leer ------------ */
await p.evaluate(() => { window.__S().t.start = Date.now() - window.__S().t.mins * 60000 - 500; });
await p.waitForTimeout(1600);
wahr("Wecker meldet sich", await p.locator(".wecker").count() === 1);
eq("Timer ist geleert", await p.evaluate(() => window.__S().t), null);
await p.waitForTimeout(2400);
eq("Ablauf wird einmal gesichert",
   await p.evaluate(() => window.__pub.length), vorTimer + 2);
await p.waitForTimeout(2200);
eq("und klingelt nicht noch einmal", await p.locator(".wecker").count(), 1);
await p.click('[data-act="weckerAus"]');
await p.waitForTimeout(200);
eq("Wecker lässt sich wegklicken", await p.locator(".wecker").count(), 0);

eq("Seitenfehler", errs, []);

await ctx.close(); await b.close();
console.log(`\n${ok} Prüfungen bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
