import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

// Testfassung: legt die reinen Rechenfunktionen offen. Diese Zeile steht NICHT
// in der veröffentlichten Datei.
const HOOK = `  try { window.__T = { punkteZuNote:punkteZuNote, noteZuPunkte:noteZuPunkte,
    schnitt:schnitt, prognose:prognose, num:num, notenName:notenName,
    view:function(){return view;}, PLAN:PLAN }; } catch (e) {}\n})();\n</script>`;

const kaputt = process.argv.includes("--ohne-fix");
let src = readFileSync("lernquest.html", "utf8").replace("})();\n</script>", HOOK);
if (kaputt) {
  // Den Tagesspeicher stilllegen — so sah die Seite vor der Behebung aus.
  src = src.replace("sessionStorage.setItem(VIEW_KEY,", "void 0 && sessionStorage.setItem(VIEW_KEY,");
}
const datei = kaputt ? "preview-ohne-fix.html" : "preview-test.html";
writeFileSync(datei,
`<!doctype html><html lang="de"><head><meta charset="utf-8"><style>*{margin:0}</style></head><body>\n${src}\n</body></html>`);

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const ctx = await b.newContext({ viewport: { width: 1180, height: 1400 }, colorScheme: "dark", locale: "de-DE" });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + process.cwd() + "/" + datei);
await p.waitForTimeout(400);

let ok = 0, bad = 0;
const eq = (nm, ist, soll) => {
  const gleich = JSON.stringify(ist) === JSON.stringify(soll);
  if (gleich) { ok++; } else { bad++; console.log(`  FEHLER ${nm}: ${JSON.stringify(ist)} statt ${JSON.stringify(soll)}`); }
};
const wahr = (nm, x) => eq(nm, !!x, true);

/* ---- 1. Punkte → Note, an jeder Schwelle -------------------------------- */
const pn = await p.evaluate(() => [100,92,91,81,80,67,66,50,49,30,29,0].map(window.__T.punkteZuNote));
eq("punkteZuNote Schwellen", pn, [1,1,2,2,3,3,4,4,5,5,6,6]);
eq("punkteZuNote leer", await p.evaluate(() => window.__T.punkteZuNote("")), null);
eq("punkteZuNote Unsinn", await p.evaluate(() => window.__T.punkteZuNote("abc")), null);

/* ---- 2. Note → Punkte --------------------------------------------------- */
const np = await p.evaluate(() => [1,1.5,2,2.5,3,4,5,6,0.5,9].map(window.__T.noteZuPunkte));
eq("noteZuPunkte", np, [92,87,81,74,67,50,30,0,92,0]);
const rund = await p.evaluate(() => [1,2,3,4,5,6].map(n => window.__T.punkteZuNote(window.__T.noteZuPunkte(n))));
eq("Hin und zurück", rund, [1,2,3,4,5,6]);

/* ---- 3. Schnitt mit Gewichten ------------------------------------------- */
eq("Schnitt leer", await p.evaluate(() => window.__T.schnitt([])), null);
eq("Schnitt gewichtet", await p.evaluate(() =>
  Math.round(window.__T.schnitt([{n:2,gew:1},{n:4,gew:2}]) * 1000) / 1000), 3.333);
eq("Schnitt einfach", await p.evaluate(() => window.__T.schnitt([{n:1,gew:1},{n:3,gew:1}])), 2);
eq("Schnitt ignoriert Müll", await p.evaluate(() =>
  window.__T.schnitt([{n:2,gew:1},{n:99,gew:1},{n:null,gew:1}])), 2);

/* ---- 4. Prognose -------------------------------------------------------- */
const pr = await p.evaluate(() => {
  const r = window.__T.prognose([{fach:"ihk:t1", n:2, gew:1}], 1.9);
  return { aktuell:r.aktuell, best:r.best, schlecht:r.schlecht, gewOffen:r.gewOffen,
           noetig:Math.round(r.noetig*10000)/10000, offen:r.offen.length };
});
eq("Prognose ein Block", pr, { aktuell:2, best:1.25, schlecht:5, gewOffen:75, noetig:1.8667, offen:3 });
const prAlle = await p.evaluate(() => {
  const r = window.__T.prognose([
    {fach:"ihk:t1",n:2,gew:1},{fach:"ihk:gp",n:2,gew:1},
    {fach:"ihk:wi",n:1,gew:1},{fach:"ihk:fa",n:3,gew:1}], 1.9);
  return { aktuell:Math.round(r.aktuell*100)/100, gewOffen:r.gewOffen, noetig:r.noetig };
});
eq("Prognose voll", prAlle, { aktuell:2.2, gewOffen:0, noetig:null });
eq("Prognose leer", await p.evaluate(() => {
  const r = window.__T.prognose([], 1.9);
  return [r.aktuell, r.best, r.schlecht, Math.round(r.noetig*100)/100];
}), [null, 1, 6, 1.9]);

/* ---- 5. Der Fehler: Tag bleibt über das Neuladen stehen ------------------ */
await p.click('[data-act="prev"]');
await p.waitForTimeout(120);
const vorher = await p.evaluate(() => ({ v: window.__T.view(),
  kopf: document.querySelector(".card .eyebrow").textContent,
  tag: document.querySelector(".card h2").textContent }));
eq("Zurückgeblättert", vorher.v, -1);
eq("Kopf sagt Gestern", vorher.kopf, "Gestern");
await p.reload();          // genau das, was jede Veröffentlichung auslöst
await p.waitForTimeout(400);
const nachher = await p.evaluate(() => ({ v: window.__T.view(),
  kopf: document.querySelector(".card .eyebrow").textContent,
  tag: document.querySelector(".card h2").textContent }));
eq("Nach dem Neuladen derselbe Tag", nachher.tag, vorher.tag);
eq("Nach dem Neuladen view", nachher.v, -1);

/* ---- 6. Zurück zu heute ------------------------------------------------- */
wahr("Knopf heute sichtbar", await p.locator('[data-act="today"]').count() === 1);
await p.click('[data-act="today"]');
await p.waitForTimeout(150);
eq("Wieder heute", await p.evaluate(() => window.__T.view()), 0);
wahr("Knopf heute wieder weg", await p.locator('[data-act="today"]').count() === 0);

/* ---- 7. Wochenkalender -------------------------------------------------- */
const woche = await p.evaluate(() => Array.from(document.querySelectorAll(".week .day"))
  .map(el => ({ off: Number(el.dataset.off), aus: el.disabled, quote: el.querySelector(".qt").textContent })));
eq("Sieben Tage", woche.length, 7);
wahr("Künftige Tage gesperrt", woche.filter(d => d.off > 0).every(d => d.aus));
wahr("Vergangene Tage klickbar", woche.filter(d => d.off <= 0).every(d => !d.aus));
wahr("Quote steht drin", woche.filter(d => d.off <= 0).every(d => /^\d+\/\d+$/.test(d.quote)));
const klickbar = woche.filter(d => d.off < 0);
if (klickbar.length) {
  const ziel = klickbar[0].off;
  await p.click(`.week .day[data-off="${ziel}"]`);
  await p.waitForTimeout(150);
  eq("Klick auf Wochentag setzt view", await p.evaluate(() => window.__T.view()), ziel);
  wahr("Ausgewählter Tag markiert", await p.locator(".week .day.sel").count() === 1);
  await p.click('[data-act="today"]');
  await p.waitForTimeout(120);
}

/* ---- 8. Note eintragen über die Oberfläche ------------------------------ */
await p.selectOption("#gFach", "suk");
await p.fill("#gWas", "Klassenarbeit Buchführung");
await p.fill("#gPkt", "83");
await p.waitForTimeout(80);
eq("Hinweis rechnet um", (await p.textContent("#gtip")).includes("Note 2"), true);
await p.selectOption("#gGew", "2");
await p.click('[data-act="gadd"]');
await p.waitForTimeout(250);
const eintrag = await p.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("lernquest.state.v4"));
  return { anzahl: st.g.length, e: st.g[0],
           liste: document.querySelectorAll(".glist .gitem").length,
           suk: document.querySelectorAll(".gavg .ga")[1].querySelector(".gav").textContent };
});
eq("Eine Note gespeichert", eintrag.anzahl, 1);
eq("Fach", eintrag.e.fach, "suk");
eq("Punkte", eintrag.e.p, 83);
eq("Abgeleitete Note", eintrag.e.n, 2);
eq("Gewicht", eintrag.e.gew, 2);
eq("In der Liste", eintrag.liste, 1);
eq("Schnitt SUK", eintrag.suk, "2,00");

await p.selectOption("#gFach", "deutsch");
await p.selectOption("#gGew", "1");
await p.fill("#gNote", "3.4");
await p.click('[data-act="gadd"]');
await p.waitForTimeout(220);
eq("Zwei Noten", await p.evaluate(() => JSON.parse(localStorage.getItem("lernquest.state.v4")).g.length), 2);
eq("Gesamtschnitt gewichtet", await p.evaluate(() =>
  document.querySelector(".card-head .note.mono").textContent.indexOf("2,47") >= 0 ||
  Array.from(document.querySelectorAll(".card-head .note.mono")).some(e => /Schnitt Schule 2,47/.test(e.textContent))), true);

/* ---- 9. Prognose in der Oberfläche -------------------------------------- */
await p.selectOption("#gFach", "ihk:t1");
await p.selectOption("#gGew", "1");
await p.fill("#gWas", "Teil 1");
await p.fill("#gNote", "2.0");
await p.fill("#gPkt", "");
await p.click('[data-act="gadd"]');
await p.waitForTimeout(220);
const prog = await p.evaluate(() => ({
  werte: Array.from(document.querySelectorAll(".pgrid .pv")).map(e => e.textContent),
  satz: document.querySelector(".pnote").textContent,
  bloecke: Array.from(document.querySelectorAll(".pbl .pbv")).map(e => e.textContent)
}));
eq("Prognose-Kacheln", prog.werte, ["2,00", "1,25", "5,00"]);
eq("Blockzeilen", prog.bloecke, ["2,00", "offen", "offen", "offen"]);
wahr("Satz nennt den nötigen Schnitt", /1,87/.test(prog.satz));

/* ---- 10. Note löschen --------------------------------------------------- */
await p.click(".glist .gitem .gdel");
await p.waitForTimeout(220);
eq("Nach dem Löschen zwei", await p.evaluate(() =>
  JSON.parse(localStorage.getItem("lernquest.state.v4")).g.length), 2);

/* ---- 11. Aufgaben sind konkret ------------------------------------------ */
const det = await p.evaluate(() => {
  const P = window.__T.PLAN, raus = {};
  Object.keys(P.days).forEach(k => {
    const bl = P.days[k].blocks;
    raus[k] = {
      det: bl.filter(b => b.det).length,
      ohneSub: bl.filter(b => !b.sub && b.kind !== "frei").length,
      trackOhneDet: bl.filter(b => b.track && !b.det && b.kind !== "lese" && b.kind !== "morg").length
    };
  });
  return { tage: raus,
           sichtbar: document.querySelectorAll(".quest .dtl").length,
           fokus: document.querySelectorAll(".focus").length,
           ankiKonkret: Object.keys(P.days).every(k =>
             P.days[k].blocks.filter(b => b.kind === "anki")
               .every(b => /karten|vokabeln|fälliges/i.test(b.nm + " " + (b.sub || "")))) };
});
Object.keys(det.tage).forEach(k => {
  wahr("Detailtexte am " + k, det.tage[k].det >= 2);
  eq("Kein Block ohne Untertitel am " + k, det.tage[k].ohneSub, 0);
});
wahr("Anki-Blöcke nennen ihr Thema", det.ankiKonkret);
wahr("Detailtext im Tag sichtbar", det.sichtbar >= 1);
eq("Stoffhinweis steht", det.fokus, 1);

/* ---- 12. Kein Skriptfehler ---------------------------------------------- */
eq("Seitenfehler", errs, []);

await ctx.close(); await b.close();
console.log(`\n${ok} Prüfungen bestanden, ${bad} gescheitert${kaputt ? "  (Lauf OHNE Fix)" : ""}`);
process.exit(bad ? 1 : 0);
