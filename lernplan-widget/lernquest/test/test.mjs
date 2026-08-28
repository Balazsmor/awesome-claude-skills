import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

// Testfassung: legt die reinen Rechenfunktionen offen. Diese Zeile steht NICHT
// in der veröffentlichten Datei.
const HOOK = `  try { window.__T = { punkteZuNote:punkteZuNote, noteZuPunkte:noteZuPunkte,
    schnitt:schnitt, prognose:prognose, num:num, notenName:notenName,
    view:function(){return view;}, PLAN:PLAN, QUIZ:QUIZ,
    isoWeek:isoWeek, timerLeft:timerLeft, blockZeit:blockZeit, tagesLage:tagesLage,
    zieheFragen:zieheFragen, state:function(){return state;}, render:render,
    ZEUGNIS:ZEUGNIS, schuljahr:schuljahr, kennung:kennung, hhmm:hhmm,
    bettzeit:bettzeit, evaluate:evaluate, dayInfo:dayInfo, addDays:addDays,
    ymd:ymd, planMischen:planMischen, planDelta:planDelta, planPruefen:planPruefen,
    PLAN_BASIS:PLAN_BASIS, plan:function(){return PLAN;} }; } catch (e) {}\n})();\n</script>`;

const kaputt = process.argv.includes("--ohne-fix");
const ohneXp = process.argv.includes("--ohne-xp-fix");
let src = readFileSync("lernquest.html", "utf8").replace("})();\n</script>", HOOK);
if (kaputt) {
  // Den Tagesspeicher stilllegen — so sah die Seite vor der Behebung aus.
  src = src.replace("sessionStorage.setItem(VIEW_KEY,", "void 0 && sessionStorage.setItem(VIEW_KEY,");
}
if (ohneXp) {
  // Das Punktefenster wieder auf 400 Tage stutzen: so fielen alte Einträge aus
  // der Wertung, die XP wären mitten in der Ausbildung gesunken.
  src = src.replace("addDays(today, -1830)", "addDays(today, -400)");
}
const datei = kaputt ? "preview-ohne-fix.html"
            : ohneXp ? "preview-ohne-xp.html" : "preview-test.html";
writeFileSync(datei,
`<!doctype html><html lang="de"><head><meta charset="utf-8"><style>*{margin:0}</style></head><body>\n${src}\n</body></html>`);

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const ctx = await b.newContext({ viewport: { width: 1180, height: 1400 }, colorScheme: "dark", locale: "de-DE" });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", e => errs.push(e.message));
/*  Eigener Ausgangsstand statt des eingebetteten: sonst hinge der Lauf davon ab,
    was gerade im veröffentlichten Artefakt steht — ein dort als frei markierter
    heutiger Tag hat den Jetzt-Marker und den Kern-Knopf verschwinden lassen.   */
const heuteD = new Date();
const ymdD = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" +
                  String(d.getDate()).padStart(2,"0");
const tagD = n => { const x = new Date(heuteD); x.setDate(heuteD.getDate() - n); return ymdD(x); };
const start = { v:4, d:{}, f:{}, n:{}, w:{}, q:{}, g:[], t:null, zn:1.9, zw:900,
                updatedAt: Date.now() + 1000 };
for (let i = 1; i < 6; i++) start.d[tagD(i)] = ["morgen", "anki", "lesen"];
await p.addInitScript(`localStorage.setItem("lernquest.state.v4", ${JSON.stringify(JSON.stringify(start))})`);
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

/* ---- 12. Kalenderwoche nach ISO 8601 ------------------------------------ */
const kw = await p.evaluate(() => ["2026-01-01","2026-12-31","2027-01-01","2027-01-04",
  "2024-12-30","2026-08-28","2025-12-28"].map(d => {
    const [y,m,t] = d.split("-").map(Number);
    return window.__T.isoWeek(new Date(y, m-1, t, 12));
  }));
eq("isoWeek über die Jahreswechsel", kw,
   ["2026-W01","2026-W53","2026-W53","2027-W01","2025-W01","2026-W35","2025-W52"]);

/* ---- 13. Blockzeiten lesen ---------------------------------------------- */
const bz = await p.evaluate(() => ["5:30","7:45","16:50","ab 19","ab 19:30","opt.","—","","25:00"]
  .map(t => window.__T.blockZeit({ t: t })));
eq("blockZeit", bz, [330, 465, 1010, 1140, 1170, null, null, null, null]);

const lage = await p.evaluate(() => {
  const plan = { blocks: [ {id:"a", t:"5:30"}, {id:"b", t:"7:00"}, {id:"c", t:"17:00"},
                           {id:"x", t:"opt."} ] };
  const L = m => { const r = window.__T.tagesLage(plan, m);
    return [r.jetzt ? r.jetzt.b.id : null, r.naechst ? r.naechst.b.id : null]; };
  return { frueh: L(5*60), mittag: L(12*60), spaet: L(23*60), vorher: L(4*60) };
});
eq("Lage am Morgen",   lage.frueh,  [null, "a"]);
eq("Lage am Mittag",   lage.mittag, ["b", "c"]);
eq("Lage am Abend",    lage.spaet,  ["c", null]);
eq("Lage vor dem Tag", lage.vorher, [null, "a"]);

/* ---- 14. Fokus-Timer, reine Rechnung ------------------------------------ */
const tl = await p.evaluate(() => {
  const jetzt = 1000000000;
  const T = window.__T.timerLeft;
  return [ T(null, jetzt), T({start:jetzt, mins:25}, jetzt),
           T({start:jetzt - 24*60000, mins:25}, jetzt),
           T({start:jetzt - 25*60000, mins:25}, jetzt),
           T({start:jetzt - 30*60000, mins:25}, jetzt),
           T({start:0, mins:0}, jetzt) ];
});
eq("timerLeft", tl, [null, 25, 1, 0, -5, null]);

/* ---- 15. Der Fragenkatalog trägt jede Zielstufe -------------------------- */
const bank = await p.evaluate(() => {
  const raus = {};
  Object.keys(window.__T.QUIZ).forEach(f => {
    raus[f] = { gesamt: window.__T.QUIZ[f].length, jeStufe: [] };
    for (let ziel = 2; ziel <= 6; ziel++) {
      raus[f].jeStufe.push(window.__T.QUIZ[f]
        .filter(q => ziel >= q.lv[0] && ziel <= q.lv[1]).length);
    }
  });
  return raus;
});
Object.keys(bank).forEach(f => {
  wahr(`${f}: mindestens 8 Fragen je Zielstufe`, Math.min(...bank[f].jeStufe) >= 8);
  wahr(`${f}: mindestens 20 Fragen insgesamt`, bank[f].gesamt >= 20);
});
// Zwei Ziehungen hintereinander dürfen sich nicht decken
const zieh = await p.evaluate(() => {
  const a = window.__T.zieheFragen("suk", 2);
  const b = window.__T.zieheFragen("suk", 2);
  return { erste: a.length, zweite: b.length,
           doppelt: b.filter(q => a.indexOf(q) >= 0).length };
});
eq("Fünf Fragen je Durchgang", [zieh.erste, zieh.zweite], [5, 5]);
eq("Der zweite Versuch zieht neue Fragen", zieh.doppelt, 0);

/* ---- 16. Rückgängig ------------------------------------------------------ */
await p.click('[data-act="today"]').catch(() => {});
await p.waitForTimeout(120);
const vorKern = await p.evaluate(() => JSON.stringify(window.__T.state().d));
await p.click('[data-act="kern"]');
await p.waitForTimeout(250);
const nachKern = await p.evaluate(() => JSON.stringify(window.__T.state().d));
wahr("Kern ✓ setzt Häkchen", vorKern !== nachKern);
wahr("Rückgängig steht bereit", await p.locator("#undobar").count() === 1);
await p.click('[data-act="undo"]');
await p.waitForTimeout(250);
eq("Rückgängig stellt den Stand her",
   await p.evaluate(() => JSON.stringify(window.__T.state().d)), vorKern);

/* ---- 17. Fokus überlebt das Abstempeln ---------------------------------- */
const fokus = await p.evaluate(async () => {
  const box = document.querySelector('.stampbox[data-act="toggle"]');
  const id = box.getAttribute("data-id");
  box.focus();
  box.click();
  await new Promise(r => setTimeout(r, 260));
  const jetzt = document.activeElement;
  return { erwartet: id,
           tatsaechlich: jetzt && jetzt.getAttribute ? jetzt.getAttribute("data-id") : null,
           klasse: jetzt ? jetzt.className : "" };
});
eq("Fokus bleibt auf demselben Stempel", fokus.tatsaechlich, fokus.erwartet);
wahr("und es ist wieder ein Stempelfeld", /stampbox/.test(fokus.klasse));

/* ---- 18. Zusammenführen verliert nichts --------------------------------- */
const merge = await p.evaluate(async () => {
  const st = window.__T.state();
  const heute = new Date();
  const tag = n => { const x = new Date(heute); x.setDate(heute.getDate() - n);
    return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" +
           String(x.getDate()).padStart(2,"0"); };
  st.d[tag(3)] = ["morgen"];
  const fremd = { v:4, d: { [tag(3)]: ["anki"], [tag(9)]: ["lesen"] }, f:{}, n:{}, w:{}, q:{} };
  document.getElementById("io").value = JSON.stringify(fremd);
  document.getElementById("io").dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector('[data-act="merge"]').click();
  await new Promise(r => setTimeout(r, 300));
  const d = window.__T.state().d;
  return { alt: (d[tag(3)] || []).slice().sort(), neu: (d[tag(9)] || []).slice() };
});
eq("Zusammenführen vereinigt den Tag", merge.alt, ["anki", "morgen"]);
eq("und bringt fehlende Tage mit", merge.neu, ["lesen"]);

/* ---- 19. Tagesnotiz, Wochenziel, Monatsblättern ------------------------- */
await p.click('[data-act="today"]').catch(() => {});
await p.waitForTimeout(150);
wahr("Jetzt-Marker steht am heutigen Tag", await p.locator(".jetztzeile").count() === 1);

await p.fill("#notiz", "Skonto nochmal ansehen");
await p.locator("#notiz").blur();
await p.waitForTimeout(280);
const notiz = await p.evaluate(() => {
  const st = window.__T.state();
  const heute = new Date();
  const k = heute.getFullYear() + "-" + String(heute.getMonth()+1).padStart(2,"0") + "-" +
            String(heute.getDate()).padStart(2,"0");
  return { text: st.n[k] || null,
           imFeld: document.getElementById("notiz").value,
           memo: document.querySelectorAll(".month .cell.memo").length };
});
eq("Notiz gespeichert", notiz.text, "Skonto nochmal ansehen");
eq("Notiz steht wieder im Feld", notiz.imFeld, "Skonto nochmal ansehen");
wahr("Der Tag bekommt im Monat eine Ecke", notiz.memo >= 1);

await p.fill("#wziel", "12");
await p.locator("#wziel").blur();
await p.waitForTimeout(280);
eq("Wochenziel in Minuten", await p.evaluate(() => window.__T.state().zw), 720);
wahr("Wochenziel steht in der Anzeige",
  /Ziel 12 h/.test(await p.evaluate(() => document.querySelector(".gauges").innerText)));

await p.fill("#themen", "Buchungssätze sicher · Erörterung unter Zeit");
await p.locator("#themen").blur();
await p.waitForTimeout(280);
eq("Zwei Schwerpunkte gespeichert", await p.evaluate(() => {
  const w = window.__T.state().w;
  return w[Object.keys(w)[0]];
}), ["Buchungssätze sicher", "Erörterung unter Zeit"]);

const monatVor = await p.evaluate(() => document.querySelector(".monthrow")
  .closest(".card").querySelector("h2").textContent);
await p.click('[data-act="mprev"]');
await p.waitForTimeout(200);
const monatZurueck = await p.evaluate(() => document.querySelector(".monthrow")
  .closest(".card").querySelector("h2").textContent);
wahr("Monat blättert zurück", monatVor !== monatZurueck);
wahr("Vorwärts ist jetzt möglich",
  !(await p.locator('[data-act="mnext"]').isDisabled()));
await p.click('[data-act="mnext"]');
await p.waitForTimeout(200);
eq("und wieder im aktuellen Monat", await p.evaluate(() => document.querySelector(".monthrow")
  .closest(".card").querySelector("h2").textContent), monatVor);
wahr("Am aktuellen Monat ist Schluss",
  await p.locator('[data-act="mnext"]').isDisabled());
wahr("Monatszellen sind klickbar",
  await p.locator('.month .cell[data-act="day"]:not([disabled])').count() > 0);

/* ---- 20. Zeugnisnoten rechnen getrennt von den Klassenarbeiten ---------- */
await p.evaluate(() => {
  const st = window.__T.state();
  st.g = [
    { id:"z1", fach:"zg:bfk",      was:"Jahreszeugnis 2026", n:1.9, p:null, dat:"2026-07-29", gew:1 },
    { id:"z2", fach:"zg:deutsch",  was:"Jahreszeugnis 2026", n:2.4, p:null, dat:"2026-07-29", gew:1 },
    { id:"z3", fach:"zg:englisch", was:"Jahreszeugnis 2026", n:2.8, p:null, dat:"2026-07-29", gew:1 },
    { id:"z4", fach:"zg:gk",       was:"Jahreszeugnis 2026", n:2.2, p:null, dat:"2026-07-29", gew:1 },
    { id:"k1", fach:"bwl",     was:"Test Beschaffung", n:2.0, p:null, dat:"2026-05-04", gew:1 },
    { id:"k2", fach:"wiso",    was:"Test SV",          n:2.3, p:null, dat:"2026-05-11", gew:1 },
    { id:"k3", fach:"suk",     was:"KA Buchführung",   n:1.7, p:null, dat:"2026-06-08", gew:2 },
    { id:"k4", fach:"deutsch", was:"Erörterung",       n:3.0, p:null, dat:"2026-06-15", gew:1 }
  ];
  window.__T.render();
});
await p.waitForTimeout(200);
const zeug = await p.evaluate(() => {
  const karte = document.querySelector(".zeug").closest(".card");
  const zeilen = Array.from(document.querySelectorAll(".zeug .pb")).map(li => ({
    nm: li.querySelector(".pbn").childNodes[0].textContent.trim(),
    unten: (li.querySelector(".pbn em") || {}).textContent || "",
    note: li.querySelector(".pbv").textContent
  }));
  const kachel = nm => {
    const el = Array.from(document.querySelectorAll(".gavg .ga"))
      .filter(x => x.querySelector(".gan").textContent === nm)[0];
    return el ? el.querySelector(".gav").textContent : null;
  };
  return {
    kopf: karte.querySelector(".card-head .note").textContent,
    kopfZeug: document.querySelector(".zeug .proghead .note").textContent,
    jahre: Array.from(document.querySelectorAll(".zjahr")).map(b => ({
      jahr: b.querySelector(".zj").textContent,
      schnitt: b.querySelector(".zkopf .note").textContent,
      faecher: Array.from(b.querySelectorAll(".pb .pbn"))
        .map(x => x.childNodes[0].textContent.trim())
    })),
    zeilen: zeilen,
    deutschKachel: kachel("Deutsch"),
    punkteInListe: Array.from(document.querySelectorAll(".glist .gitem"))
      .filter(li => /Zeugnis/.test(li.querySelector(".gm").textContent))
      .map(li => li.querySelector(".gm").textContent)
  };
});
eq("Ein Schuljahr im Kopf", zeug.kopfZeug, "1 Schuljahr");
eq("Der Block trägt sein Schuljahr", zeug.jahre[0].jahr, "Schuljahr 2025/26");
eq("Zeugnisschnitt", zeug.jahre[0].schnitt, "Schnitt 2,33");
eq("Vier Zeugniszeilen", zeug.zeilen.length, 4);
eq("BFK steht oben", zeug.zeilen[0].nm, "Berufsfachliche Kompetenz");
eq("mit der Zeugnisnote", zeug.zeilen[0].note, "1,9");
wahr("und der Gegenprobe aus den eigenen Klassenarbeiten",
     /Klassenarbeiten ergeben 1,92/.test(zeug.zeilen[0].unten));
// Die Zeugnisnote darf den Schnitt der Klassenarbeiten nicht verändern:
// (2,0 + 2,3 + 2×1,7 + 3,0) ÷ 5 = 2,14 — ohne die vier Zeugniszeilen.
eq("Schnitt der Klassenarbeiten unberührt", zeug.kopf, "Schnitt Schule 2,14 · 4 Noten");
eq("Deutsch-Kachel zählt nur die Klassenarbeit", zeug.deutschKachel, "3,00");
wahr("Zeugnisnoten bekommen keine IHK-Punkte angehängt",
     zeug.punkteInListe.length === 4 && zeug.punkteInListe.every(t => !/Punkte/.test(t)));

/* ---- 21. Das Wochenziel-Abzeichen nennt das eingestellte Ziel ----------- */
await p.fill("#wziel", "12");
await p.locator("#wziel").blur();
await p.waitForTimeout(280);
const abz = await p.evaluate(() => {
  const el = Array.from(document.querySelectorAll(".badge"))
    .filter(b => b.querySelector(".bn").textContent === "Wochenmeister")[0];
  return el ? el.querySelector(".bd").textContent : null;
});
eq("Abzeichen nennt 12 h", abz, "Wochenziel von 12 h erreicht");
await p.fill("#wziel", "15");
await p.locator("#wziel").blur();
await p.waitForTimeout(280);
eq("und folgt der Änderung", await p.evaluate(() => {
  const el = Array.from(document.querySelectorAll(".badge"))
    .filter(b => b.querySelector(".bn").textContent === "Wochenmeister")[0];
  return el.querySelector(".bd").textContent;
}), "Wochenziel von 15 h erreicht");

/* ---- 22. Punkte sind ein Konto, kein 400-Tage-Fenster ------------------- */
const xpAlt = await p.evaluate(() => {
  const heute = new Date();
  const ymdV = d => window.__T.ymd(d);
  // Einen vollen Tag weit in der Vergangenheit suchen — Ferien und Feiertage
  // zählen nicht, deshalb wird gesucht statt gerechnet.
  const vollerTag = ab => {
    for (let t = ab; t < ab + 60; t++) {
      const d = window.__T.addDays(heute, -t);
      const info = window.__T.dayInfo(d, {});
      if (info.counts) return { tage: t, key: ymdV(d), ids: (info.plan.blocks || []).map(b => b.id) };
    }
    return null;
  };
  const weit = vollerTag(500), nah = vollerTag(3);
  const xp = st => window.__T.evaluate(st, heute).xp;
  return {
    tageWeit: weit.tage,
    nurWeit: xp({ d: { [weit.key]: weit.ids }, f: {} }),
    nurNah:  xp({ d: { [nah.key]: nah.ids }, f: {} }),
    beide:   xp({ d: { [weit.key]: weit.ids, [nah.key]: nah.ids }, f: {} })
  };
});
wahr("Der weit zurückliegende Tag liegt jenseits von 400 Tagen", xpAlt.tageWeit > 400);
if (ohneXp) {
  eq("(Regressionswächter) ohne den Fix bringt er nichts", xpAlt.nurWeit, 0);
  eq("(Regressionswächter) und fehlt auch in der Summe", xpAlt.beide, xpAlt.nurNah);
  console.log("  Ohne den Fix fällt alles vor heute − 400 Tagen aus der Wertung.");
} else {
  wahr("Er bringt für sich genommen Punkte", xpAlt.nurWeit > 0);
  eq("und beide Tage zählen zusammen", xpAlt.beide, xpAlt.nurWeit + xpAlt.nurNah);
}

/* ---- 23. Zwei Schuljahre bleiben getrennt ------------------------------- */
eq("schuljahr aus dem Datum", await p.evaluate(() =>
  ["2026-07-29", "2026-08-01", "2027-01-15", "", "Unsinn"].map(window.__T.schuljahr)),
  ["2025/26", "2026/27", "2026/27", "", ""]);
const zwei = await p.evaluate(() => {
  const st = window.__T.state();
  st.g = [
    { id:"a1", fach:"zg:deutsch", was:"Zeugnis 2026", n:2.4, p:null, dat:"2026-07-29", gew:1 },
    { id:"a2", fach:"zg:bfk",     was:"Zeugnis 2026", n:1.9, p:null, dat:"2026-07-29", gew:1 },
    { id:"b1", fach:"zg:deutsch", was:"Zeugnis 2027", n:3.4, p:null, dat:"2027-07-28", gew:1 },
    { id:"b2", fach:"zg:bfk",     was:"Zeugnis 2027", n:2.1, p:null, dat:"2027-07-28", gew:1 }
  ];
  window.__T.render();
  return Array.from(document.querySelectorAll(".zjahr")).map(b => ({
    jahr: b.querySelector(".zj").textContent,
    schnitt: b.querySelector(".zkopf .note").textContent,
    noten: Array.from(b.querySelectorAll(".pb .pbv")).map(x => x.textContent)
  }));
});
eq("Zwei Blöcke", zwei.length, 2);
eq("Das jüngste Schuljahr steht oben", zwei[0].jahr, "Schuljahr 2026/27");
eq("und darunter das ältere", zwei[1].jahr, "Schuljahr 2025/26");
// Deutsch 2,4 und Deutsch 3,4 dürfen nicht zu 2,9 verschmelzen.
eq("Deutsch 2027 steht für sich", zwei[0].noten.indexOf("3,4") >= 0, true);
eq("Deutsch 2026 auch", zwei[1].noten.indexOf("2,4") >= 0, true);
eq("Schnitt 2026/27", zwei[0].schnitt, "Schnitt 2,75");
eq("Schnitt 2025/26", zwei[1].schnitt, "Schnitt 2,15");

/* ---- 24. Zwei Zusatzfächer sind zwei Zeilen ----------------------------- */
const zusatz = await p.evaluate(() => {
  const st = window.__T.state();
  st.g = [
    { id:"x1", fach:"zg:x:religion", was:"Religion",  n:1.0, p:null, dat:"2026-07-29", gew:1 },
    { id:"x2", fach:"zg:x:informatik", was:"Informatik", n:3.0, p:null, dat:"2026-07-29", gew:1 }
  ];
  window.__T.render();
  return Array.from(document.querySelectorAll(".zjahr .pb")).map(li => ({
    nm: li.querySelector(".pbn").childNodes[0].textContent.trim(),
    note: li.querySelector(".pbv").textContent
  }));
});
eq("Zwei eigene Zeilen", zusatz.length, 2);
eq("mit dem selbst vergebenen Namen", zusatz.map(z => z.nm), ["Religion", "Informatik"]);
eq("und je eigener Note", zusatz.map(z => z.note), ["1,0", "3,0"]);
eq("kennung macht aus Umlauten Buchstaben",
   await p.evaluate(() => ["Religionslehre", "Wirtschaft & Recht", "Übungsfirma"]
     .map(window.__T.kennung)),
   ["religionslehre", "wirtschaft-recht", "uebungsfirma"]);
await p.evaluate(() => { window.__T.state().g = []; window.__T.render(); });

/* ---- 25. Schlafenszeit rechnet rückwärts vom Weckruf -------------------- */
const schlaf = await p.evaluate(() => {
  const B = window.__T.bettzeit, H = window.__T.hhmm;
  const plan = t => ({ blocks: [{ id:"m", t:t, nm:"Morgen", kind:"morg" },
                                { id:"s", t:"7:45", nm:"Schule", kind:"fix" }] });
  return {
    normal:  B(plan("5:30"), 7.5),
    text:    H(B(plan("5:30"), 7.5).bett),
    umbruch: H(B(plan("5:30"), 9).bett),      // 5:30 − 9 h → 20:30 am Vortag
    knapp:   H(B(plan("0:30"), 2).bett),      // über Mitternacht zurück
    ohne:    B({ blocks: [{ id:"s", t:"7:45", nm:"Schule", kind:"fix" }] }, 7.5),
    leer:    B({ blocks: [] }, 7.5),
    nullStd: B(plan("5:30"), 0)
  };
});
eq("5:30 minus 7,5 h ergibt 22:00", schlaf.text, "22:00");
eq("Der Weckruf steht mit dabei", schlaf.normal.weck, 330);
eq("5:30 minus 9 h ergibt 20:30", schlaf.umbruch, "20:30");
eq("0:30 minus 2 h bricht über Mitternacht um", schlaf.knapp, "22:30");
eq("Ohne Morgenblock keine Antwort", schlaf.ohne, null);
eq("Ohne Blöcke erst recht nicht", schlaf.leer, null);
eq("Ohne Stundenzahl auch nicht", schlaf.nullStd, null);
eq("hhmm füllt auf zwei Stellen",
   await p.evaluate(() => [0, 59, 330, 1439, 1440, -30].map(window.__T.hhmm)),
   ["00:00", "00:59", "05:30", "23:59", "00:00", "23:30"]);

/* ---- 26. Der Stundenplan lässt sich ändern ------------------------------ */
const eigenerPlan = JSON.stringify({
  days: { mi: { label:"Mittwoch", tag:"Neu", note:"", blocks: [
    { id:"morgen", t:"6:15", nm:"Morgenroutine", kind:"morg", track:true, min:20 },
    { id:"schule", t:"8:00", nm:"Berufsschule", kind:"fix" }
  ]}}
});
await p.fill("#planio", eigenerPlan);
await p.click('[data-act="planNehmen"]');
await p.waitForTimeout(250);
const nachPlan = await p.evaluate(() => ({
  mi: window.__T.plan().days.mi.blocks.map(b => b.id + "@" + b.t),
  do_: window.__T.plan().days.do.blocks.length,
  gespeichert: Object.keys(window.__T.state().p || {}),
  nurMi: Object.keys((window.__T.state().p || {}).days || {}),
  fehler: document.querySelectorAll(".planfehler li").length
}));
eq("Der geänderte Mittwoch gilt", nachPlan.mi, ["morgen@6:15", "schule@8:00"]);
wahr("Der Donnerstag bleibt, wie er war", nachPlan.do_ > 2);
eq("Gespeichert wird nur die Abweichung", nachPlan.gespeichert, ["days"]);
eq("und darin nur der Mittwoch", nachPlan.nurMi, ["mi"]);
eq("Keine Fehlermeldung", nachPlan.fehler, 0);

// Kaputtes JSON: der alte Plan bleibt stehen, der Kasten sagt, was klemmt.
await p.fill("#planio", '{ "days": { "mi": ');
await p.click('[data-act="planNehmen"]');
await p.waitForTimeout(200);
const kaputtesJson = await p.evaluate(() => ({
  fehler: Array.from(document.querySelectorAll(".planfehler li")).map(li => li.textContent),
  mi: window.__T.plan().days.mi.blocks.map(b => b.t)
}));
wahr("Kaputtes JSON wird benannt", /kein gültiges JSON/.test(kaputtesJson.fehler[0] || ""));
eq("und der übernommene Plan steht noch", kaputtesJson.mi, ["6:15", "8:00"]);

// Doppelte Block-Kennung an einem Tag.
await p.fill("#planio", JSON.stringify({ days: { mi: { label:"Mittwoch", blocks: [
  { id:"a", t:"6:00", nm:"Eins", kind:"morg" },
  { id:"a", t:"7:00", nm:"Zwei", kind:"deep" }
]}}}));
await p.click('[data-act="planNehmen"]');
await p.waitForTimeout(200);
const doppelt = await p.evaluate(() => ({
  fehler: Array.from(document.querySelectorAll(".planfehler li")).map(li => li.textContent),
  mi: window.__T.plan().days.mi.blocks.map(b => b.t)
}));
wahr("Eine doppelte id wird gefunden", doppelt.fehler.some(f => /doppelt/.test(f)));
eq("und der Plan bleibt unberührt", doppelt.mi, ["6:15", "8:00"]);

// Unbekanntes kind.
await p.fill("#planio", JSON.stringify({ days: { mi: { label:"Mittwoch", blocks: [
  { id:"a", t:"6:00", nm:"Eins", kind:"schlaf" }
]}}}));
await p.click('[data-act="planNehmen"]');
await p.waitForTimeout(200);
wahr("Ein unbekanntes kind wird gefunden", await p.evaluate(() =>
  Array.from(document.querySelectorAll(".planfehler li")).some(li => /schlaf/.test(li.textContent))));

// Zurücksetzen stellt den eingebauten Plan wieder her.
await p.click('[data-act="planReset"]');
await p.waitForTimeout(250);
const zurueck = await p.evaluate(() => ({
  mi: window.__T.plan().days.mi.blocks.map(b => b.t),
  basis: window.__T.PLAN_BASIS.days.mi.blocks.map(b => b.t),
  p: window.__T.state().p,
  fehler: document.querySelectorAll(".planfehler li").length
}));
eq("Zurücksetzen holt den eingebauten Mittwoch", zurueck.mi, zurueck.basis);
eq("und löscht die gespeicherte Abweichung", zurueck.p, null);
eq("Die Fehlerliste ist weg", zurueck.fehler, 0);

/* ---- 27. Die Schlafenszeile nennt den richtigen Tag --------------------- */
/*  Zwei Dinge müssen festgenagelt werden, sonst hängt der Lauf davon ab, wann
    am Tag er startet: die Ortszeit über eine Festzeitzone (Etc/GMT-1 ist
    UTC+1, das Vorzeichen ist dort umgekehrt), und der Stundenplan über einen
    eigenen unter `p` — jeder Wochentag derselbe, damit der Weckruf feststeht.  */
function zoneFuerStunde(ziel) {
  let o = ziel - new Date().getUTCHours();
  while (o > 14) o -= 24;
  while (o < -12) o += 24;
  return o === 0 ? "UTC" : o > 0 ? "Etc/GMT-" + o : "Etc/GMT+" + -o;
}
function planMitWeckruf(zeit, stunden) {
  const tag = { label:"Testtag", blocks: [
    { id:"morgen", t:zeit, nm:"Morgenroutine", kind:"morg", track:true, min:20 },
    { id:"lesen",  t:"20:00", nm:"Lesen", kind:"lese", track:true, min:30 }
  ]};
  const alle = {};
  ["mo","di","mi","do","fr","sa","so"].forEach(k => { alle[k] = tag; });
  return { sleepHours: stunden, days: alle, vacationDays: alle, freeDay: tag };
}
async function schlafZeile(stunde, plan) {
  const st = JSON.parse(JSON.stringify(start));
  if (plan) st.p = plan;
  const c = await b.newContext({ viewport:{width:900,height:900}, colorScheme:"dark",
                                 locale:"de-DE", timezoneId: zoneFuerStunde(stunde) });
  const q = await c.newPage();
  await q.addInitScript(`localStorage.setItem("lernquest.state.v4", ${JSON.stringify(JSON.stringify(st))})`);
  await q.goto("file://" + process.cwd() + "/" + datei);
  await q.waitForTimeout(400);
  const r = await q.evaluate(() => {
    const el = document.querySelector(".bett");
    return el ? { txt: el.innerText.replace(/\s+/g, " ").trim(),
                  spaet: el.classList.contains("spaet") } : null;
  });
  await c.close();
  return r;
}
const wach6  = planMitWeckruf("6:00", 7.5);    // Schlafenszeit 22:30
const spaet9 = planMitWeckruf("9:30", 7.5);    // Schlafenszeit 02:00

eq("Mittags steht keine Schlafenszeile da", await schlafZeile(12, wach6), null);

const zAbend = await schlafZeile(20, wach6);   // 20 Uhr, Schluss wäre 22:30
wahr("Am Abend steht sie da", !!zAbend);
wahr("und nennt die Uhrzeit fürs Bett", /Um 22:30 ins Bett/.test(zAbend.txt));
wahr("und die Schlafdauer bis zum Weckruf", /7,5 Stunden bis 06:00/.test(zAbend.txt));
eq("ohne Warnfarbe", zAbend.spaet, false);

const zSpaet = await schlafZeile(23, wach6);   // 23 Uhr, halbe Stunde drüber
eq("Nach der Schlafenszeit wird sie deutlich", zSpaet.spaet, true);
wahr("und meint den Weckruf von morgen", /morgen klingelt es um 06:00/.test(zSpaet.txt));

const zNacht = await schlafZeile(1, wach6);    // 1 Uhr, längst drüber
eq("Nach Mitternacht erst recht", zNacht.spaet, true);
wahr("und meint dann den Weckruf von heute, nicht von morgen",
     /heute klingelt es um 06:00/.test(zNacht.txt) && !/morgen klingelt/.test(zNacht.txt));

/*  Der Fall, an dem sich der Vergleich verrät: liegt die Schlafenszeit selbst
    nach Mitternacht, ist man um 20:00 noch lange nicht zu spät — und um 1:00
    immer noch nicht.                                                          */
const zNachMitternacht = await schlafZeile(20, spaet9);
wahr("Eine Schlafenszeit nach Mitternacht wird abends erkannt",
     /Um 02:00 ins Bett/.test(zNachMitternacht.txt));
eq("und gilt um 20:00 noch nicht als überschritten", zNachMitternacht.spaet, false);
const zEinUhr = await schlafZeile(1, spaet9);
eq("um 1:00 ebenso wenig", zEinUhr.spaet, false);
wahr("und sie nennt den Weckruf von heute",
     /7,5 Stunden bis 09:30/.test(zEinUhr.txt));

/* ---- 28. Ein längst abgelaufener Timer wird nicht wiederbelebt ---------- */
async function mitTimer(vorMin, dauerMin) {
  const st = JSON.parse(JSON.stringify(start));
  st.t = { key: "x", id: "anki", nm: "Anki", mins: dauerMin,
           start: Date.now() - vorMin * 60000 };
  const c = await b.newContext({ viewport:{width:900,height:900}, colorScheme:"dark",
                                 locale:"de-DE" });
  const q = await c.newPage();
  await q.addInitScript(`localStorage.setItem("lernquest.state.v4", ${JSON.stringify(JSON.stringify(st))})`);
  await q.goto("file://" + process.cwd() + "/" + datei);
  //  Der Takt schlägt erst nach einer Sekunde — vorher steht der Wecker
  //  noch nicht da, obwohl der Timer schon abgelaufen ist.
  await q.waitForTimeout(1400);
  const r = await q.evaluate(() => ({
    t: window.__T.state().t,
    wecker: !!document.querySelector(".wecker")
  }));
  await c.close();
  return r;
}
const frisch = await mitTimer(16, 15);   // vor einer Minute abgelaufen
const alt2   = await mitTimer(120, 15);  // vor über anderthalb Stunden
const laeuft = await mitTimer(5, 15);    // läuft noch
wahr("Ein laufender Timer wird übernommen", laeuft.t && laeuft.t.id === "anki");
wahr("Ein eben abgelaufener meldet sich noch", frisch.wecker);
eq("Ein längst abgelaufener wird fallen gelassen", alt2.t, null);
eq("und meldet sich nicht mehr", alt2.wecker, false);

/* ---- 29. Kein Skriptfehler ---------------------------------------------- */
eq("Seitenfehler", errs, []);

await ctx.close(); await b.close();
console.log(`\n${ok} Prüfungen bestanden, ${bad} gescheitert${kaputt ? "  (Lauf OHNE Fix)" : ""}`);
process.exit(bad ? 1 : 0);
