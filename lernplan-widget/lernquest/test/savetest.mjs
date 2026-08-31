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
/*  Audio-Attrappe: sie schreibt mit, wann ein Kontext entsteht, ob er
    freigeschaltet wird und auf welchen Zeitpunkt jeder Ton gelegt wird.
    currentTime bleibt 0, damit der gelegte Zeitpunkt direkt die Restsekunden
    sind — daran lässt sich ablesen, ob vorgelegt oder erst beim Klingeln
    erzeugt wurde.                                                            */
await p.addInitScript(`
  window.__audio = { erzeugt: 0, resumes: 0, starts: [], geplantesEnde: 0, abbrueche: 0 };
  window.AudioContext = function () {
    window.__audio.erzeugt++;
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
    this.resume = function () { window.__audio.resumes++; this.state = "running";
                                return Promise.resolve(); };
    this.close = function () {};
    this.createOscillator = function () {
      return { type: "", frequency: { value: 0 },
               connect: function () {}, disconnect: function () {},
               start: function (w) { window.__audio.starts.push(w); },
               stop: function (w) {
                 // Mit Zeitangabe: das eingeplante Ende des Tons.
                 // Ohne: ein Abbruch durch toeneAbbrechen().
                 if (w === undefined) window.__audio.abbrueche++;
                 else window.__audio.geplantesEnde++;
               } };
    };
    this.createGain = function () {
      return { gain: { setValueAtTime: function () {},
                       exponentialRampToValueAtTime: function () {} },
               connect: function () {}, disconnect: function () {} };
    };
  };
  window.webkitAudioContext = window.AudioContext;
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
/* ---- Der Ton wird beim Start vorgelegt, nicht beim Klingeln ------------- */
const vorTimer = await p.evaluate(() => window.__pub.length);
eq("Vor dem Start kein Audio", await p.evaluate(() => window.__audio.erzeugt), 0);
await p.click('.quest .tbtn[data-act="tstart"]');
await p.waitForTimeout(400);
const au1 = await p.evaluate(() => ({
  erzeugt: window.__audio.erzeugt, resumes: window.__audio.resumes,
  anzahl: window.__audio.starts.length,
  frueheste: Math.min.apply(null, window.__audio.starts),
  minuten: window.__S().t.mins
}));
eq("Genau ein Audio-Kontext", au1.erzeugt, 1);
wahr("und er wurde im Fingertipp freigeschaltet", au1.resumes >= 1);
eq("Drei Schübe zu drei Tönen sind vorgelegt", au1.anzahl, 9);
// Vorgelegt heisst: der erste Ton liegt auf der Endzeit, nicht auf currentTime (0)
wahr("Der Ton liegt auf der Endzeit, nicht auf jetzt",
     au1.frueheste > au1.minuten * 60 - 5 && au1.frueheste <= au1.minuten * 60);

/* ---- Während der Timer läuft, wird nicht veröffentlicht ----------------- */
await p.waitForTimeout(2200);
eq("Timerstart veröffentlicht nicht",
   await p.evaluate(() => window.__pub.length), vorTimer);
eq("und sagt auch warum", await p.textContent("#savestate"), "wird nach dem Timer gesichert");
const a1 = await p.textContent("#tuhr");
await p.waitForTimeout(3200);
const a2 = await p.textContent("#tuhr");
wahr("die Uhr läuft weiter", a1 !== a2);
wahr("Timer steht im Zustand", await p.evaluate(() => !!window.__S().t));

/* ---- Verlängern bricht ab und legt neu vor ------------------------------ */
await p.click('[data-act="tplus"]');
await p.waitForTimeout(300);
const au2 = await p.evaluate(() => ({
  abbrueche: window.__audio.abbrueche, anzahl: window.__audio.starts.length,
  spaeteste: Math.max.apply(null, window.__audio.starts), erzeugt: window.__audio.erzeugt
}));
eq("Kein zweiter Kontext", au2.erzeugt, 1);
eq("Die alten Töne wurden abgebrochen", au2.abbrueche, 9);
eq("und neun neue vorgelegt", au2.anzahl, 18);
wahr("zehn Minuten später", au2.spaeteste > au1.frueheste + 500);

/* ---- Ablauf: Wecker klingelt einmal und bleibt stehen ------------------- */
await p.evaluate(() => { window.__S().t.start = Date.now() - window.__S().t.mins * 60000 - 500; });
await p.waitForTimeout(1600);
wahr("Wecker meldet sich", await p.locator(".wecker").count() === 1);
eq("Timer ist geleert", await p.evaluate(() => window.__S().t), null);
await p.waitForTimeout(2600);
eq("und klingelt nicht noch einmal", await p.locator(".wecker").count(), 1);
// Solange das Banner steht, hält es die Veröffentlichung auf — sonst lüde die
// Seite neu und nähme den Wecker weg, bevor ihn jemand gesehen hat.
eq("Das Banner hält die Veröffentlichung auf",
   await p.evaluate(() => window.__pub.length), vorTimer);
await p.click('[data-act="weckerAus"]');
await p.waitForTimeout(200);
eq("Wecker lässt sich wegklicken", await p.locator(".wecker").count(), 0);
eq("Der Ton hört mit ihm auf", await p.evaluate(() => window.__audio.abbrueche), 18);
await p.waitForTimeout(2400);
wahr("und das Aufgehaltene geht danach raus",
     await p.evaluate(() => window.__pub.length) > vorTimer);

/* ---- Das Fehlerkonto überlebt den Austausch mit dem Widget --------------
   Die Merkliste steht in `m`. Fehlte der Schlüssel im JSON-Feld oder beim
   Zusammenführen, wäre sie nach einem Hin und Her mit dem Mac-Widget weg.   */
await p.evaluate(() => {
  window.__S().m = [{ id: "abc123", fach: "suk", n: 3, ok: 1, dat: "2026-08-20" }];
  window.__S().updatedAt = Date.now() + 1000;
});
await p.evaluate(() => {
  // Neu zeichnen, damit das Austauschfeld den frischen Stand trägt.
  document.querySelector('[data-act="mprev"]').click();
  document.querySelector('[data-act="mnext"]').click();
});
await p.waitForTimeout(200);
const ioText = await p.inputValue("#io");
const ioObj = JSON.parse(ioText);
eq("Das Austauschfeld führt die Merkliste mit", (ioObj.m || []).length, 1);
eq("mit allen Feldern", ioObj.m[0],
   { id: "abc123", fach: "suk", n: 3, ok: 1, dat: "2026-08-20" });

// Zusammenführen: eine fremde Lücke kommt dazu, eine bekannte behält den
// höheren Fehlerzähler.
const fremd = JSON.parse(ioText);
fremd.m = [{ id: "abc123", fach: "suk", n: 7, ok: 0, dat: "2026-08-25" },
           { id: "neu999", fach: "bwl", n: 1, ok: 0, dat: "2026-08-26" }];
await p.fill("#io", JSON.stringify(fremd));
await p.click('[data-act="merge"]');
await p.waitForTimeout(300);
const nachMerge = await p.evaluate(() => window.__S().m.slice()
  .sort((a, b) => (a.id < b.id ? -1 : 1)));
eq("Nach dem Zusammenführen stehen beide Lücken da", nachMerge.length, 2);
eq("der höhere Fehlerzähler gewinnt", nachMerge[0].n, 7);
eq("das jüngere Datum auch", nachMerge[0].dat, "2026-08-25");
eq("und die fremde Lücke ist dabei", nachMerge[1].fach, "bwl");

eq("Seitenfehler", errs, []);

await ctx.close(); await b.close();
console.log(`\n${ok} Prüfungen bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
