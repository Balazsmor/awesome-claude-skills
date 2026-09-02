import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

// Testfassung: legt die reinen Rechenfunktionen offen. Diese Zeile steht NICHT
// in der veröffentlichten Datei.
const HOOK = `  try { window.__T = { punkteZuNote:punkteZuNote, noteZuPunkte:noteZuPunkte,
    schnitt:schnitt, prognose:prognose, num:num, notenName:notenName,
    view:function(){return view;}, setView:setView, PLAN:PLAN, QUIZ:QUIZ,
    isoWeek:isoWeek, timerLeft:timerLeft, blockZeit:blockZeit, tagesLage:tagesLage,
    zieheFragen:zieheFragen, state:function(){return state;}, render:render,
    ZEUGNIS:ZEUGNIS, schuljahr:schuljahr, kennung:kennung, hhmm:hhmm,
    bettzeit:bettzeit, evaluate:evaluate, dayInfo:dayInfo, addDays:addDays,
    ymd:ymd, planMischen:planMischen, planDelta:planDelta, planPruefen:planPruefen,
    PLAN_BASIS:PLAN_BASIS, plan:function(){return PLAN;},
    schwaechstesFach:schwaechstesFach, frageBauen:frageBauen,
    frage:function(){return frage;}, FRAGEARTEN:FRAGEARTEN,
    IHK_BLOECKE:IHK_BLOECKE, bestehen:bestehen,
    mindAusreichend:mindAusreichend, istUngenuegend:istUngenuegend,
    jahresvorschlag:jahresvorschlag, arbeitenSchnitt:arbeitenSchnitt,
    jahrEnde:jahrEnde, frageId:frageId, kontoBuchen:kontoBuchen,
    kontoFaellig:kontoFaellig, kontoFrage:kontoFrage, kontoEintrag:kontoEintrag,
    tempo:tempo, tempoDatum:tempoDatum, multiplier:multiplier, planAnwenden:planAnwenden,
    SCHONFRIST:SCHONFRIST, AUS_KONTO:AUS_KONTO, today:today,
    normalize:normalize, zusammenfuehren:zusammenfuehren,
    auswerten:auswerten }; } catch (e) {}\n})();\n</script>`;

const kaputt = process.argv.includes("--ohne-fix");
const ohneXp = process.argv.includes("--ohne-xp-fix");
let src = readFileSync("lernquest.html", "utf8").replace("})();\n</script>", HOOK);
/*  Den eingebetteten Stand leeren. Bisher war der Lauf nur zufällig hermetisch:
    „der neuere gewinnt" warf ihn vollständig weg. Seit load() Lücken füllt,
    flössen sonst die echten Noten aus dem veröffentlichten Artefakt in jeden
    Testlauf ein — und der Lauf hinge davon ab, was gerade darin steht.        */
const LEER_STATE = /(<script type="application\/json" id="state">)[\s\S]*?(<\/script>)/;
src = src.replace(LEER_STATE, "$1{}$2");
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
await p.addInitScript(`localStorage.setItem("lernquest.state.v5", ${JSON.stringify(JSON.stringify(start))})`);
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
/*  Im Wächterlauf --ohne-fix steht die Seite nach dem Neuladen wieder auf
    heute — dann gibt es den Knopf nicht, und ein blindes click() liess den
    ganzen Lauf in einen Timeout rennen. Ein abgestürzter Wächter sagt aber
    nichts: man unterscheidet den alten Fehler nicht mehr von einem neuen.
    Deshalb wird der Fehlschlag vermerkt und weitergelaufen.                 */
const heuteDa = await p.locator('[data-act="today"]').count() === 1;
wahr("Knopf heute sichtbar", heuteDa);
if (heuteDa) await p.click('[data-act="today"]');
else await p.evaluate(() => { window.__T.setView(0); window.__T.render(); });
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
  const st = JSON.parse(localStorage.getItem("lernquest.state.v5"));
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
eq("Zwei Noten", await p.evaluate(() => JSON.parse(localStorage.getItem("lernquest.state.v5")).g.length), 2);
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
  JSON.parse(localStorage.getItem("lernquest.state.v5")).g.length), 2);

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
/*  Die Anleitung hängt am Tag, und die Ferienpläne tragen keine. Fiel der Lauf
    in die Sommerferien, stand hier „kein Detailtext" — eine Aussage über den
    Kalender, nicht über die Seite. Gemessen wird deshalb am jüngsten Tag,
    dessen Plan überhaupt Anleitungen mitbringt und der noch offen ist.       */
const schultag = `(function () {
  var T = window.__T;
  for (var o = 0; o > -400; o--) {
    var info = T.dayInfo(T.addDays(T.today(), o), T.state().f);
    var ids = T.state().d[info.key] || [];
    var bl = info.plan.blocks || [];
    var hat = bl.filter(function (x) { return x.det; }).length;
    // Ausserhalb des Kerns muss noch etwas offen bleiben — sonst stünde nach
    // dem Abhaken „Reinen Tisch" statt „Tag gerettet".
    var ausserhalb = bl.filter(function (x) {
      return x.track && T.PLAN.core.indexOf(x.id) < 0;
    }).length;
    if (hat && ausserhalb && !ids.length) return o;
  }
  return 0;
})()`;
const sicht = await p.evaluate(`(function () {
  var T = window.__T, off = ${schultag};
  T.setView(off); T.render();
  var n = document.querySelectorAll(".quest .dtl").length;
  T.setView(0); T.render();
  return { off: off, n: n };
})()`);
wahr("Detailtext im Tag sichtbar (Tag " + sicht.off + ")", sicht.n >= 1);
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
/*  Die Zone wird aus der UTC-Stunde gerechnet. Springt die Stunde zwischen
    dieser Rechnung und dem Laden der Seite um, steht die Seite eine Stunde
    daneben — bei 23 Uhr wird daraus 0 Uhr, und die Zeile sagt zu Recht etwas
    anderes. Deshalb prüft jeder Lauf, welche Stunde die Seite wirklich sieht,
    und wiederholt sich einmal, wenn sie nicht stimmt.                        */
async function mitStunde(stunde, lauf) {
  for (let versuch = 0; versuch < 3; versuch++) {
    const r = await lauf(zoneFuerStunde(stunde));
    if (r.stunde === stunde) return r;
  }
  throw new Error("Stunde " + stunde + " liess sich nicht stabil einstellen");
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
  const r = await mitStunde(stunde, async zone => {
    const st = JSON.parse(JSON.stringify(start));
    if (plan) st.p = plan;
    const c = await b.newContext({ viewport:{width:900,height:900}, colorScheme:"dark",
                                   locale:"de-DE", timezoneId: zone });
    const q = await c.newPage();
    await q.addInitScript(`localStorage.setItem("lernquest.state.v5", ${JSON.stringify(JSON.stringify(st))})`);
    await q.goto("file://" + process.cwd() + "/" + datei);
    await q.waitForTimeout(400);
    const erg = await q.evaluate(() => {
      const el = document.querySelector(".bett");
      return { stunde: new Date().getHours(),
               zeile: el ? { txt: el.innerText.replace(/\s+/g, " ").trim(),
                             spaet: el.classList.contains("spaet") } : null };
    });
    await c.close();
    return erg;
  });
  return r.zeile;
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
  await q.addInitScript(`localStorage.setItem("lernquest.state.v5", ${JSON.stringify(JSON.stringify(st))})`);
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

/* ---- 29. Die Schriften halten die Anzeige nicht auf --------------------- */
/*  Im Kopf steht media="print" — damit lädt der Browser die Schriftdatei, ohne
    das Zeichnen zu blockieren. Erst das Skript schaltet auf "all" um.        */
wahr("Im Quelltext steht der Verweis auf media=print",
     /<link id="fontcss" rel="stylesheet" media="print"/.test(
       readFileSync("lernquest.html", "utf8")));
eq("Nach dem Start ist er scharf geschaltet",
   await p.evaluate(() => document.getElementById("fontcss").media), "all");
wahr("Der Ersatz-Schriftschnitt steht im Stylesheet",
     /-apple-system, "Segoe UI", sans-serif/.test(
       await p.evaluate(() => document.getElementById("app-style").textContent)));

/* ---- 30. Ein kaputter freeDay wird abgefangen --------------------------- */
/*  freeDay stand bis hierher ungeprüft durch — ein Tippfehler dort hätte
    jeden frei markierten Tag und jeden Feiertag stillschweigend geleert.     */
async function planFehlerFuer(json) {
  await p.fill("#planio", JSON.stringify(json));
  await p.click('[data-act="planNehmen"]');
  await p.waitForTimeout(200);
  return await p.evaluate(() =>
    Array.from(document.querySelectorAll(".planfehler li")).map(li => li.textContent));
}
const fdLeer = await planFehlerFuer({ freeDay: { label: "Frei", blocks: [] } });
wahr("Ein freeDay ohne Blöcke wird gemeldet",
     fdLeer.some(f => /freeDay braucht eine nicht leere Liste/.test(f)));
const fdKind = await planFehlerFuer({ freeDay: { label: "Frei", blocks: [
  { id: "a", nm: "Eins", kind: "schlummer" } ]}});
wahr("Ein unbekanntes kind im freeDay auch",
     fdKind.some(f => /schlummer/.test(f)));
const fdDopp = await planFehlerFuer({ freeDay: { label: "Frei", blocks: [
  { id: "a", nm: "Eins", kind: "frei" }, { id: "a", nm: "Zwei", kind: "lese" } ]}});
wahr("Und eine doppelte id im freeDay", fdDopp.some(f => /doppelt/.test(f)));
eq("Der eingebaute Plan steht dabei noch",
   await p.evaluate(() => window.__T.plan().freeDay.blocks.length),
   await p.evaluate(() => window.__T.PLAN_BASIS.freeDay.blocks.length));
await p.click('[data-act="planReset"]');
await p.waitForTimeout(200);

/* ---- 31. Der gedrückte Knopf bleibt unter dem Finger -------------------- */
/*  Ein freier Tag hat einen viel kürzeren Plan. Ohne Anker sprang der Knopf,
    den man gerade gedrückt hat, um rund achtzig Pixel weg.                   */
await p.evaluate(() => { window.__T.state().f = {}; window.__T.render(); });
await p.waitForTimeout(150);
const anker = await p.evaluate(async () => {
  const knopf = () => document.querySelector('[data-act="mark"]');
  knopf().scrollIntoView({ block: "center" });
  await new Promise(r => setTimeout(r, 60));
  const vorher = knopf().getBoundingClientRect().top;
  const hoeheVor = document.body.scrollHeight;
  knopf().click();
  await new Promise(r => setTimeout(r, 200));
  return { wandert: Math.round(knopf().getBoundingClientRect().top - vorher),
           kuerzer: document.body.scrollHeight < hoeheVor };
});
wahr("Der Tagesplan wird beim Freisetzen kürzer", anker.kuerzer);
wahr("Der Knopf bleibt trotzdem stehen", Math.abs(anker.wandert) <= 2);
await p.click('[data-act="mark"]'); await p.waitForTimeout(150);
await p.click('[data-act="mark"]'); await p.waitForTimeout(150);
eq("und die Markierung ist wieder weg",
   await p.evaluate(() => Object.keys(window.__T.state().f).length), 0);

/* ---- 32. Die Frage-Werkstatt ------------------------------------------- */
/*  Die Seite kann Claude nicht selbst fragen — sie baut die Frage. Geprüft
    wird, dass wirklich der eigene Zusammenhang darin landet.                 */
await p.evaluate(() => {
  const st = window.__T.state();
  st.q = { bwl: 3, suk: 2, wiso: 3, deutsch: 4, englisch: 3 };
  st.g = [
    { id:"s1", fach:"suk", was:"Klassenarbeit Buchführung", n:3.4, p:null, dat:"2026-08-01", gew:2 },
    { id:"s2", fach:"suk", was:"Test KLR",                  n:2.8, p:null, dat:"2026-08-20", gew:1 },
    { id:"b1", fach:"bwl", was:"Beschaffung",               n:2.0, p:83,   dat:"2026-08-10", gew:1 }
  ];
  st.w[window.__T.isoWeek(new Date())] = ["Deckungsbeitragsrechnung", "Kaufvertragsstörungen"];
  window.__T.render();
});
await p.waitForTimeout(200);
wahr("Die Karte ist da", await p.locator("#ftext").count() === 1);
eq("Vorgeschlagen wird das schwächste Fach",
   await p.evaluate(() => document.getElementById("fFach").value), "suk");
await p.fill("#fThema", "Deckungsbeitrag je Stück");
await p.waitForTimeout(200);
const fText = await p.inputValue("#ftext");
wahr("Die Frage nennt den Beruf", /Industriekaufmann/.test(fText));
wahr("und die nächste Prüfung mit Abstand", /IHK Teil 1 am 25\.02\.2027 — noch \d+ Tage/.test(fText));
wahr("und das Fach mit Beschreibung", /Fach: SUK \(Steuerung und Kontrolle/.test(fText));
/*  Die Stufe ist nicht einfach die bestandene: standOf() deckelt sie an der
    Lernzeit. Geprüft wird deshalb gegen das, was die Attributkarte anzeigt —
    die Frage darf nichts anderes behaupten als die Seite.                    */
const stufeAusKarte = (nm) => p.evaluate((n) => {
  const el = Array.from(document.querySelectorAll(".attr"))
    .filter(a => a.querySelector(".an").textContent === n)[0];
  return el ? el.querySelector(".alv").textContent.trim() : null;
}, nm);
const suklv = await stufeAusKarte("SUK");
wahr("und die Stufe, die auch auf der Attributkarte steht",
     new RegExp("Mein Stand in diesem Fach: Stufe " + suklv + " von 11\\.").test(fText));
// (3,4 × 2 + 2,8) ÷ 3 = 3,20
wahr("und den Notenschnitt mit der letzten Arbeit",
     /Schnitt meiner Klassenarbeiten: 3,20 · zuletzt 2,8 in „Test KLR“/.test(fText));
wahr("und die Schwerpunkte der Woche",
     /Schwerpunkte dieser Woche: Deckungsbeitragsrechnung, Kaufvertragsstörungen/.test(fText));
wahr("und den Stoffzuschnitt bis Teil 1", /Stoffzuschnitt bis dahin: Bis Teil 1 zählt/.test(fText));
wahr("und die eigentliche Bitte", /Erklär mir: Deckungsbeitrag je Stück/.test(fText));
wahr("und wie die Antwort aussehen soll", /Rechenwege Schritt für Schritt/.test(fText));

/*  Die fünf Arten müssen sich wirklich unterscheiden — sonst ist die Auswahl
    Zierde.                                                                   */
const arten = await p.evaluate(() => window.__T.FRAGEARTEN.map(a => a.id));
eq("Fünf Arten stehen zur Wahl", arten.length, 5);
await p.selectOption("#fArt", "abfragen");
await p.waitForTimeout(200);
const fAb = await p.inputValue("#ftext");
wahr("Abfragen bittet um eine Frage nach der anderen",
     /wie im Fachgespräch: Deckungsbeitrag je Stück/.test(fAb) &&
     /Eine Frage nach der anderen/.test(fAb));
wahr("und nicht mehr um eine Erklärung", !/Erklär mir:/.test(fAb));
await p.selectOption("#fArt", "pruefen");
await p.waitForTimeout(200);
wahr("Prüfen lässt Platz zum Einfügen",
     /\[hier einfügen\]/.test(await p.inputValue("#ftext")));
await p.selectOption("#fArt", "erklaer");
await p.waitForTimeout(200);

// Ein anderes Fach zieht seinen eigenen Stand nach.
await p.selectOption("#fFach", "bwl");
await p.waitForTimeout(200);
const fBwl = await p.inputValue("#ftext");
const bwllv = await stufeAusKarte("BWL");
wahr("Ein anderes Fach bringt seine eigene Stufe mit",
     /Fach: BWL/.test(fBwl) &&
     new RegExp("Stufe " + bwllv + " von 11\\.").test(fBwl));
wahr("und seinen eigenen Schnitt", /Schnitt meiner Klassenarbeiten: 2,00/.test(fBwl));

/*  Von Hand geändert bleibt geändert — bis „Neu bauen“.                      */
await p.fill("#ftext", "Ganz eigene Frage.");
await p.evaluate(() => window.__T.render());
await p.waitForTimeout(200);
eq("Eine eigene Fassung übersteht das Neuzeichnen",
   await p.inputValue("#ftext"), "Ganz eigene Frage.");
await p.click('[data-act="ffrisch"]');
await p.waitForTimeout(200);
wahr("Neu bauen stellt den Vorschlag wieder her",
     /Industriekaufmann/.test(await p.inputValue("#ftext")));

/*  Jede Veröffentlichung lädt alle Ansichten neu — der Entwurf muss das
    überstehen, sonst ist Getipptes beim nächsten Häkchen weg.                */
eq("Der Entwurf liegt in sessionStorage",
   await p.evaluate(() => JSON.parse(sessionStorage.getItem("lernquest.frage")).thema),
   "Deckungsbeitrag je Stück");
await p.reload();
await p.waitForSelector("#ftext");
await p.waitForTimeout(200);
eq("und übersteht das Neuladen", await p.inputValue("#fThema"), "Deckungsbeitrag je Stück");
eq("samt gewähltem Fach", await p.evaluate(() => document.getElementById("fFach").value), "bwl");

/*  Der Knopf, der Claude öffnet: ein echter Verweis, damit der Rahmen ihn
    weiterreicht — und er kopiert im selben Griff.                            */
const ziel = await p.evaluate(() => {
  const a = document.querySelector('a[data-act="fcopy"]');
  return a ? { href: a.getAttribute("href"), ziel: a.getAttribute("target"),
               rel: a.getAttribute("rel") } : null;
});
eq("Der Verweis zeigt auf einen neuen Claude-Chat", ziel && ziel.href, "https://claude.ai/new");
eq("und öffnet ihn in einem neuen Reiter", ziel && ziel.ziel, "_blank");
eq("mit noopener", ziel && ziel.rel, "noopener");

/* ---- 33. Die Gewichte der Prüfungsbereiche ------------------------------ */
/*  § 14 IndKflAusbV, seit 1. August 2024. Die Gegenprobe steht in der Sache
    selbst: die vier Anteile müssen zusammen 100 % ergeben.                   */
const bloecke = await p.evaluate(() =>
  window.__T.IHK_BLOECKE.map(b => ({ id: b.id, nm: b.nm, pct: b.pct, de: b.de })));
eq("Vier Prüfungsbereiche", bloecke.length, 4);
eq("Die Anteile ergeben zusammen 100 %",
   bloecke.reduce((s, b) => s + b.pct, 0), 100);
eq("Teil 1 zählt 25 %", bloecke.filter(b => b.id === "t1")[0].pct, 25);
eq("der schriftliche Teil-2-Bereich 35 %", bloecke.filter(b => b.id === "gp")[0].pct, 35);
eq("Wirtschafts- und Sozialkunde 10 %", bloecke.filter(b => b.id === "wi")[0].pct, 10);
eq("die Fachaufgabe 30 %", bloecke.filter(b => b.id === "fa")[0].pct, 30);
/*  Die Kennungen dürfen sich nicht ändern — an ihnen hängen eingetragene
    Noten. Die Namen dagegen waren von 2002 und sind berichtigt.              */
eq("Die Kennungen bleiben", bloecke.map(b => b.id), ["t1", "gp", "wi", "fa"]);
wahr("„Geschäftsprozesse“ steht nirgends mehr",
     !bloecke.some(b => /Geschäftsprozesse/.test(b.nm + " " + b.de)));
wahr("Teil 1 nennt seinen amtlichen Namen",
     /Leistungserstellung, Logistik, Beschaffung und Buchhaltung/.test(
       bloecke.filter(b => b.id === "t1")[0].de));
wahr("und der 35-%-Bereich seinen",
     /kaufmännische Steuerung und Kontrolle/.test(
       bloecke.filter(b => b.id === "gp")[0].de));
wahr("Die Fachaufgabe nennt ihre innere Aufteilung",
     /Dokumentation 10 %, Präsentation 20 %, Fachgespräch 70 %/.test(
       bloecke.filter(b => b.id === "fa")[0].de));

/* ---- 34. Die Bestehensregel -------------------------------------------- */
/*  Vier Bedingungen, die zugleich gelten müssen. Ein guter Schnitt allein
    genügt nicht — genau das hat die Karte vorher verschwiegen.               */
const bstd = (noten) => p.evaluate((nn) => {
  const g = Object.keys(nn).map((id, i) => ({
    id: "x" + i, fach: "ihk:" + id, was: id, n: nn[id], p: null, dat: "2028-04-25", gew: 1
  }));
  const r = window.__T.bestehen(g);
  return { stand: r.punkte.map(x => x.stand), steht: r.steht,
           gefaehrdet: r.gefaehrdet, eingetragen: r.eingetragen };
}, noten);

eq("Die Schwelle für „mindestens ausreichend“ liegt bei 4,0",
   await p.evaluate(() => [3.9, 4.0, 4.1, 5.0].map(window.__T.mindAusreichend)),
   [true, true, false, false]);
eq("„ungenügend“ beginnt hinter 5,0",
   await p.evaluate(() => [4.0, 5.0, 5.1, 6.0].map(window.__T.istUngenuegend)),
   [false, false, true, true]);

const alleVier = await bstd({ t1: 4.0, gp: 4.0, wi: 4.0, fa: 4.0 });
eq("Vier Vieren bestehen", alleVier.stand, ["ja", "ja", "ja", "ja"]);
wahr("und gelten als bestanden", alleVier.steht && !alleVier.gefaehrdet);

// Zwei Bereiche mangelhaft, einer sehr gut: Bedingung 3 fällt.
const zweiSchlecht = await bstd({ t1: 1.0, gp: 5.0, wi: 5.0, fa: 2.0 });
eq("Nur ein Bereich von Teil 2 ausreichend — Bedingung 3 fällt",
   zweiSchlecht.stand[2], "nein");
wahr("und die Prüfung gilt als gefährdet", zweiSchlecht.gefaehrdet);

// Ein ungenügender Bereich kippt es, obwohl der Schnitt gut ist.
const einUng = await bstd({ t1: 2.0, gp: 2.5, wi: 5.5, fa: 2.0 });
eq("Ein ungenügender Bereich verletzt Bedingung 4", einUng.stand[3], "nein");
eq("Gesamt und Teil 2 stehen trotzdem", einUng.stand.slice(0, 3), ["ja", "ja", "ja"]);
wahr("Trotz gutem Schnitt gefährdet", einUng.gefaehrdet);

// Zu schlechtes Gesamtergebnis.
const zuSchwach = await bstd({ t1: 4.5, gp: 4.5, wi: 4.5, fa: 4.5 });
eq("Ein Gesamtschnitt von 4,5 verletzt Bedingung 1", zuSchwach.stand[0], "nein");

/*  Solange etwas offen ist, wird nichts behauptet — weder gut noch schlecht.  */
const nurT1 = await bstd({ t1: 2.0 });
eq("Mit nur Teil 1 ist alles offen", nurT1.stand, ["offen", "offen", "offen", "offen"]);
wahr("nichts gilt als gefährdet", !nurT1.gefaehrdet && !nurT1.steht);
eq("und ein Bereich ist eingetragen", nurT1.eingetragen, 1);

/*  Auch ohne jeden Eintrag darf nichts rot sein — nur der erklärende Satz.    */
await p.evaluate(() => { window.__T.state().g = []; window.__T.render(); });
await p.waitForTimeout(200);
const leer = await p.evaluate(() => ({
  zeilen: document.querySelectorAll(".bl li").length,
  kopf: document.querySelector(".besteh .proghead .note").textContent,
  satz: !!document.querySelector(".besteh .note.tiny")
}));
eq("Ohne Eintrag keine Bedingungsliste", leer.zeilen, 0);
eq("sondern ein Hinweis im Kopf", leer.kopf, "noch nichts eingetragen");
wahr("und ein erklärender Satz", leer.satz);

/* ---- 35. Zeugnisnoten zählen einfach ------------------------------------
   Auf dem Zeugnis steht je Fach genau eine Note. Bliebe die Gewicht-Auswahl
   von der letzten Klassenarbeit auf ×3 stehen, wiche der Jahresschnitt von
   dem ab, was auf dem Papier steht.                                        */
await p.evaluate(() => { window.__T.state().g = []; window.__T.render(); });
await p.waitForTimeout(150);
await p.selectOption("#gFach", "zg:deutsch");
await p.waitForTimeout(150);
const gewFeld = await p.evaluate(() => ({
  auswahl: !!document.querySelector("#gGew"),
  fest: (document.querySelector(".gfest") || {}).textContent || null
}));
wahr("Für eine Zeugnisnote gibt es keine Gewicht-Auswahl", !gewFeld.auswahl);
eq("sondern den Hinweis", gewFeld.fest, "zählt einfach");

// Über den Umweg der Klassenarbeit ×3 einstellen und dann aufs Zeugnis wechseln:
// die stehen gebliebene Auswahl darf den Eintrag nicht erreichen.
await p.selectOption("#gFach", "deutsch");
await p.waitForTimeout(120);
await p.selectOption("#gGew", "3");
await p.selectOption("#gFach", "zg:deutsch");
await p.waitForTimeout(120);
await p.fill("#gWas", "Jahreszeugnis 2026");
await p.fill("#gNote", "2.4");
await p.fill("#gDat", "2026-07-29");
await p.click('[data-act="gadd"]');
await p.waitForTimeout(200);
const zgEintrag = await p.evaluate(() => window.__T.state().g.slice(-1)[0]);
eq("Die Zeugnisnote wird mit Gewicht 1 gespeichert", zgEintrag.gew, 1);
eq("mit der eingetragenen Note", zgEintrag.n, 2.4);

/* ---- 36. Der Jahresabschluss -------------------------------------------
   Zum Schuljahresende schlägt die Seite vor, was die Klassenarbeiten des
   Jahres ergeben — sie trägt aber nichts von selbst ein.                   */

// Das laufende Schuljahr bestimmt, welche Arbeiten der Vorschlag sieht.
const jetztJahr = await p.evaluate(() => window.__T.schuljahr(window.__T.ymd(new Date())));
const jahrAb = Number(jetztJahr.slice(0, 4));
const inJahr = m => `${m >= 8 ? jahrAb : jahrAb + 1}-${String(m).padStart(2, "0")}-12`;
const vorjahr = `${jahrAb - 1}-10-12`;

eq("Das Schuljahr endet am 31. Juli",
   await p.evaluate(j => window.__T.jahrEnde(j), jetztJahr), `${jahrAb + 1}-07-31`);

await p.evaluate(([a, b, c, d, v]) => {
  window.__T.state().g = [
    { id:"j1", fach:"bwl",     was:"KA Beschaffung", n:2.0, p:null, dat:a, gew:1 },
    { id:"j2", fach:"wiso",    was:"KA SV",          n:3.0, p:null, dat:b, gew:1 },
    { id:"j3", fach:"suk",     was:"KA KLR",         n:1.0, p:null, dat:c, gew:1 },
    { id:"j4", fach:"deutsch", was:"Erörterung",     n:2.0, p:null, dat:d, gew:1 },
    // Aus dem Vorjahr — darf den Vorschlag nicht verschieben.
    { id:"j0", fach:"bwl",     was:"altes Jahr",     n:6.0, p:null, dat:v, gew:1 }
  ];
  window.__T.render();
}, [inJahr(9), inJahr(10), inJahr(11), inJahr(9), vorjahr]);
await p.waitForTimeout(220);

const vor = await p.evaluate(() => {
  const box = document.querySelector(".jabs");
  if (!box) return null;
  return {
    titel: box.querySelector(".zj").textContent,
    felder: Array.from(box.querySelectorAll(".jgrid .gf")).map(l => ({
      nm: l.querySelector("span").textContent,
      wert: l.querySelector("input").value
    }))
  };
});
wahr("Der Jahresabschluss erscheint", !!vor);
eq("und nennt das laufende Schuljahr", vor.titel, "Jahresabschluss " + jetztJahr);
const feld = nm => vor.felder.filter(f => f.nm === nm)[0];
// BFK aus BWL 2,0 · WiSo 3,0 · SUK 1,0 — der Sechser aus dem Vorjahr zählt nicht.
eq("Berufsfachliche Kompetenz aus den Arbeiten des Jahres", feld("Berufsfachliche Kompetenz").wert, "2");
eq("Deutsch aus dem eigenen Fach", feld("Deutsch").wert, "2");
eq("Gemeinschaftskunde bleibt leer", feld("Gemeinschaftskunde").wert, "");
wahr("Weiteres Fach steht nicht im Vorschlag", !feld("Weiteres Fach"));

eq("Die Rechnung ohne Jahresgrenze wäre schlechter",
   await p.evaluate(j => Math.round(
     window.__T.arbeitenSchnitt(window.__T.state().g, ["bwl"], j) * 100) / 100, jetztJahr), 2);

// Ein Feld von Hand überschreiben — der Vorschlag ist ein Vorschlag.
await p.fill("#ja-zg\\:gk", "1.5");
await p.waitForTimeout(150);
await p.click('[data-act="jaadd"]');
await p.waitForTimeout(250);

const nachher2 = await p.evaluate(() => {
  const zg = window.__T.state().g.filter(e => String(e.fach).indexOf("zg:") === 0);
  return {
    eintraege: zg.map(e => ({ fach:e.fach, n:e.n, dat:e.dat, gew:e.gew, was:e.was, p:e.p })),
    blockWeg: !document.querySelector(".jabs"),
    jahre: Array.from(document.querySelectorAll(".zjahr .zj")).map(x => x.textContent),
    klassenarbeiten: window.__T.state().g.filter(e => e.fach === "bwl").length
  };
});
eq("Drei Jahresnoten eingetragen", nachher2.eintraege.length, 3);
const bfk = nachher2.eintraege.filter(e => e.fach === "zg:bfk")[0];
eq("Datum ist das Schuljahresende", bfk.dat, `${jahrAb + 1}-07-31`);
eq("beschriftet als Jahreszeugnis", bfk.was, `Jahreszeugnis ${jahrAb + 1}`);
eq("Gewicht 1", bfk.gew, 1);
eq("ohne Punkte", bfk.p, null);
eq("Das überschriebene Feld gilt",
   nachher2.eintraege.filter(e => e.fach === "zg:gk")[0].n, 1.5);
eq("Der Eintrag landet im richtigen Schuljahr", nachher2.jahre, ["Schuljahr " + jetztJahr]);
wahr("Der Block verschwindet danach", nachher2.blockWeg);
eq("Die Klassenarbeiten bleiben unangetastet", nachher2.klassenarbeiten, 2);

// Ist das Jahr abgeschlossen, wird nicht ein zweites Mal gefragt.
eq("Kein zweiter Vorschlag im selben Jahr",
   await p.evaluate(() => window.__T.jahresvorschlag(window.__T.state().g, new Date())), null);

/* ---- 37. Zeugnisnoten und IHK-Prognose bleiben getrennt -----------------
   Zwei Zeugnisse, zwei Rechnungen: eine Schulnote darf die Abschlussprognose
   nicht bewegen. Dieser Test hält das fest, damit es nicht irgendwann
   versehentlich zusammenläuft.                                             */
const trennung = await p.evaluate(() => {
  const st = window.__T.state();
  const ihk = [{ id:"p1", fach:"ihk:t1", was:"Teil 1", n:2.0, p:null, dat:"2027-03-04", gew:1 }];
  st.g = ihk.slice(); window.__T.render();
  const ohne = { pr: window.__T.prognose(st.g, 1.9), be: window.__T.bestehen(st.g) };
  st.g = ihk.concat([
    { id:"s1", fach:"zg:bfk",     was:"Jahreszeugnis", n:6.0, p:null, dat:"2027-07-31", gew:1 },
    { id:"s2", fach:"zg:deutsch", was:"Jahreszeugnis", n:6.0, p:null, dat:"2027-07-31", gew:1 }
  ]);
  window.__T.render();
  const mit = { pr: window.__T.prognose(st.g, 1.9), be: window.__T.bestehen(st.g) };
  return {
    aktuell: [ohne.pr.aktuell, mit.pr.aktuell],
    schlecht: [ohne.pr.schlecht, mit.pr.schlecht],
    punkte: [ohne.be.punkte, mit.be.punkte],
    steht: [ohne.be.steht, mit.be.steht],
    satz: document.querySelector(".zeug .note.tiny:last-of-type").textContent
  };
});
eq("Zwei Sechser im Zeugnis ändern die Prognose nicht",
   trennung.aktuell[0], trennung.aktuell[1]);
eq("auch nicht den schlechtesten Fall", trennung.schlecht[0], trennung.schlecht[1]);
eq("und nicht die Bestehensrechnung", trennung.punkte[0], trennung.punkte[1]);
eq("auch nicht deren Ergebnis", trennung.steht[0], trennung.steht[1]);
wahr("Die Karte nennt beide Zeugnisse", /zwei/i.test(trennung.satz));
wahr("und sagt, dass die Schulnote nur auf Antrag draufsteht",
     /auf Antrag/.test(trennung.satz));

/* ---- 38. Fehlerkonto: was falsch war, wird gemerkt ----------------------
   Bisher warf eine Prüfung ihren Inhalt weg — man konnte an Buchungssätzen
   scheitern, mit fünf anderen Fragen bestehen und die Lücke nie wiedersehen. */
const heuteKey = await p.evaluate(() => window.__T.ymd(window.__T.today()));
const vorTagen = n => {
  const x = new Date(); x.setDate(x.getDate() - n);
  return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" +
         String(x.getDate()).padStart(2,"0");
};

// Eine Kennung aus dem Fragetext: gleich für dieselbe Frage, verschieden sonst.
const ids = await p.evaluate(() => {
  const Q = window.__T.QUIZ.suk;
  return { a: window.__T.frageId(Q[0]), a2: window.__T.frageId({ q: Q[0].q }),
           b: window.__T.frageId(Q[1]), leer: window.__T.frageId(null) };
});
eq("Dieselbe Frage ergibt dieselbe Kennung", ids.a, ids.a2);
wahr("verschiedene Fragen verschiedene", ids.a !== ids.b);
wahr("und eine fehlende Frage stürzt nicht ab", typeof ids.leer === "string");

// Falsch → Eintrag. Noch einmal falsch → Zähler hoch, Schonfrist von vorn.
const gebucht = await p.evaluate(() => {
  const st = window.__T.state(), Q = window.__T.QUIZ.suk;
  st.m = [];
  window.__T.kontoBuchen("suk", Q[0], false);
  const nach1 = JSON.parse(JSON.stringify(st.m));
  window.__T.kontoBuchen("suk", Q[0], false);
  window.__T.kontoBuchen("suk", Q[1], false);
  return { nach1: nach1, nach2: JSON.parse(JSON.stringify(st.m)) };
});
eq("Eine falsche Antwort legt einen Eintrag an", gebucht.nach1.length, 1);
eq("mit Fach", gebucht.nach1[0].fach, "suk");
eq("Zähler 1", gebucht.nach1[0].n, 1);
eq("und dem heutigen Datum", gebucht.nach1[0].dat, heuteKey);
eq("Zweimal falsch zählt hoch, legt aber nichts Neues an", gebucht.nach2[0].n, 2);
eq("eine andere Frage schon", gebucht.nach2.length, 2);

// Zweimal richtig legt die Lücke zurück, ein Fehler dazwischen setzt zurück.
const zurueckgelegt = await p.evaluate(() => {
  const st = window.__T.state(), Q = window.__T.QUIZ.suk;
  st.m = [];
  window.__T.kontoBuchen("suk", Q[0], false);
  window.__T.kontoBuchen("suk", Q[0], true);
  const nachEins = st.m.length ? st.m[0].ok : null;
  window.__T.kontoBuchen("suk", Q[0], true);
  const weg = st.m.length;
  // Richtig auf etwas, das gar nicht auf der Liste steht, legt nichts an.
  window.__T.kontoBuchen("suk", Q[2], true);
  const immerNoch = st.m.length;
  // Einmal richtig, dann falsch: der Zähler beginnt von vorn.
  window.__T.kontoBuchen("suk", Q[3], false);
  window.__T.kontoBuchen("suk", Q[3], true);
  window.__T.kontoBuchen("suk", Q[3], false);
  const rueckfall = st.m.filter(e => e.n === 2)[0];
  return { nachEins, weg, immerNoch, okNachRueckfall: rueckfall ? rueckfall.ok : null };
});
eq("Einmal richtig zählt, löscht aber noch nicht", zurueckgelegt.nachEins, 1);
eq("Zweimal richtig nimmt die Lücke von der Liste", zurueckgelegt.weg, 0);
eq("Richtig ohne Eintrag legt keinen an", zurueckgelegt.immerNoch, 0);
eq("Ein Rückfall setzt den Zähler zurück", zurueckgelegt.okNachRueckfall, 0);

/* ---- 39. Schonfrist und Vorrang beim Ziehen ------------------------------
   Der sofortige zweite Versuch darf nicht dieselben fünf Fragen sein, deren
   Lösung gerade auf dem Bildschirm stand — deshalb die Schonfrist.          */
const faellig = await p.evaluate(([heute, alt]) => {
  const st = window.__T.state(), Q = window.__T.QUIZ.suk;
  st.m = [
    { id: window.__T.frageId(Q[0]), fach: "suk", n: 1, ok: 0, dat: heute },
    { id: window.__T.frageId(Q[1]), fach: "suk", n: 1, ok: 0, dat: alt },
    { id: window.__T.frageId(Q[2]), fach: "bwl", n: 1, ok: 0, dat: alt }
  ];
  return window.__T.kontoFaellig("suk", window.__T.today()).map(e => e.id);
}, [heuteKey, vorTagen(4)]);
eq("Ein Fehler von heute ist noch nicht fällig", faellig.length, 1);
eq("einer von vor vier Tagen schon", faellig[0], ids.b);

/*  Gezielt vorgelegt werden höchstens zwei. Messbar ist das nur mit Lücken,
    die das Stufenband NICHT enthält — sonst kann die Zufallsfüllung weitere
    treffen, und das ist kein Fehler: dort sind es normale Fragen.            */
const vorrang = await p.evaluate(alt => {
  const st = window.__T.state(), Q = window.__T.QUIZ.suk;
  // Nur Fragen der Stufen 4 bis 6 auf die Liste, gezogen wird für Stufe 3.
  const drausen = Q.filter(f => f.lv[0] > 3);
  st.m = drausen.map(f => ({ id: window.__T.frageId(f), fach: "suk",
                             n: 3, ok: 0, dat: alt }));
  const merk = st.m.map(e => e.id);
  const zug = window.__T.zieheFragen("suk", 3).map(window.__T.frageId);
  return { faellig: drausen.length, anzahl: zug.length,
           ausKonto: zug.filter(id => merk.indexOf(id) >= 0).length,
           doppelt: zug.length !== new Set(zug).size };
}, vorTagen(9));
wahr("Es liegen mehr als zwei Lücken bereit", vorrang.faellig > 2);
eq("Es bleiben fünf Fragen", vorrang.anzahl, 5);
eq("gezielt vorgelegt werden genau zwei", vorrang.ausKonto, 2);
wahr("und keine doppelt", !vorrang.doppelt);

// Ohne fällige Lücke bleibt das Ziehen, was es war.
const ohneKonto = await p.evaluate(() => {
  window.__T.state().m = [];
  const zug = window.__T.zieheFragen("suk", 3);
  return { anzahl: zug.length, doppelt: zug.length !== new Set(zug).size };
});
eq("Ohne Merkliste weiterhin fünf Fragen", ohneKonto.anzahl, 5);
wahr("und keine doppelt", !ohneKonto.doppelt);

/* ---- 40. Die Karte zeigt nur, was es noch gibt --------------------------- */
const karte = await p.evaluate(alt => {
  const st = window.__T.state(), Q = window.__T.QUIZ.suk;
  st.m = [
    { id: window.__T.frageId(Q[0]), fach: "suk", n: 3, ok: 0, dat: alt },
    { id: window.__T.frageId(Q[1]), fach: "suk", n: 1, ok: 1, dat: alt },
    // Verwaist: diese Kennung gehört zu keiner Frage im Katalog.
    { id: "gibtesnicht", fach: "suk", n: 9, ok: 0, dat: alt }
  ];
  window.__T.render();
  const zeilen = Array.from(document.querySelectorAll(".mitem")).map(li => ({
    zahl: li.querySelector(".mn").textContent,
    frage: li.querySelector(".mq").textContent,
    unten: li.querySelector(".mm").textContent
  }));
  return { zeilen,
           kopf: document.querySelector(".mlist").closest(".card")
                   .querySelector(".card-head .note").textContent,
           ersteFrage: Q[0].q };
}, vorTagen(9));
eq("Zwei Zeilen, die verwaiste fehlt", karte.zeilen.length, 2);
eq("Der häufigste Fehler steht oben", karte.zeilen[0].frage, karte.ersteFrage);
eq("mit seinem Zähler", karte.zeilen[0].zahl, "3×");
wahr("die Nebenzeile nennt Fach und Stand",
     /SUK/.test(karte.zeilen[0].unten) && /3-mal falsch/.test(karte.zeilen[0].unten));
wahr("und dass die Schonfrist um ist", /wieder fällig/.test(karte.zeilen[0].unten));
wahr("Der Kopf zählt die Lücken", /2 Lücken/.test(karte.kopf));

// „Als Thema" schiebt die Lücke in die Frage-Werkstatt.
await p.click('.mitem [data-act="mfrage"]');
await p.waitForTimeout(250);
const uebernommen = await p.evaluate(() => ({
  fach: window.__T.frage().fach, art: window.__T.frage().art,
  thema: document.getElementById("fThema").value,
  imText: document.getElementById("ftext").value
}));
eq("Das Fach der Lücke steht in der Werkstatt", uebernommen.fach, "suk");
eq("und die Art passt zur Lage", uebernommen.art, "warum");
eq("die Frage ist das Thema", uebernommen.thema, karte.ersteFrage);
wahr("und steht in der fertigen Frage", uebernommen.imText.indexOf(karte.ersteFrage) >= 0);

// „Erledigt" nimmt eine Zeile weg — der Katalog ist vorläufig.
await p.click('.mitem [data-act="mdel"]');
await p.waitForTimeout(250);
eq("Erledigt nimmt die Zeile von der Liste",
   await p.evaluate(() => document.querySelectorAll(".mitem").length), 1);

// Ohne Lücken gibt es die Karte gar nicht.
await p.evaluate(() => { window.__T.state().m = []; window.__T.render(); });
await p.waitForTimeout(200);
eq("Ohne Lücken keine Karte",
   await p.evaluate(() => document.querySelectorAll(".mlist").length), 0);

/* ---- 41. Tempo: aus Stunden werden Daten -------------------------------- */
const td = await p.evaluate(() => {
  const T = window.__T, now = T.today();
  const reif = { reif: true }, jung = { reif: false };
  const d = T.tempoDatum(100, 10, reif, now);   // 10 Tage
  return {
    datum: { art: d.art, tage: d.tage, txt: d.txt },
    jung: T.tempoDatum(100, 10, jung, now).art,
    null0: T.tempoDatum(100, 0, reif, now),
    fern: T.tempoDatum(100000, 1, reif, now).art,
    grenze: T.tempoDatum(730, 1, reif, now).art     // genau zwei Jahre
  };
});
eq("Bekanntes Tempo ergibt ein Datum", td.datum.art, "datum");
eq("und die richtige Zahl Tage", td.datum.tage, 10);
wahr("im Klartext", /bei deinem Tempo etwa ab /.test(td.datum.txt));
eq("Zu wenig Verlauf gibt keine Zahl", td.jung, "jung");
eq("Tempo null auch nicht", td.null0.art, "null");
wahr("sondern die eigentliche Auskunft", /fehlt Lernzeit/.test(td.null0.txt));
eq("Über zwei Jahre wird nicht datiert", td.fern, "fern");
eq("genau zwei Jahre noch", td.grenze, "datum");

// Aus dem echten Verlauf: das Fenster zählt nur Tage, die zählen.
const tp = await p.evaluate(() => {
  const T = window.__T, st = T.state();
  return T.tempo(T.auswerten(st, T.today()), T.today(), 28);
});
wahr("Das Tempofenster hat Tage gesehen", tp.gezaehlt > 0);
wahr("und liefert Punkte je Tag", tp.proTag > 0);

// Die Attributkarte nennt das Datum jetzt neben den Stunden.
const axNext = await p.evaluate(() =>
  Array.from(document.querySelectorAll(".attr .ax.next")).map(x => x.textContent));
wahr("Mindestens eine Attributzeile nennt eine Hochrechnung",
     axNext.some(t => /bei deinem Tempo etwa ab |fehlt Lernzeit|über zwei Jahre|zu wenig Verlauf/.test(t)));

/* ---- 42. Der Wochenblick nennt das vergessene Fach ----------------------- */
/*  Ein eigener Stundenplan, an jedem Wochentag derselbe: Morgenroutine, Anki
    und ein Deutschblock. Damit bekommt genau ein Prüfungsfach Zeit, und die
    vier anderen fehlen — unabhängig davon, welcher Wochentag heute ist.      */
const nurDeutsch = (() => {
  const tag = { label:"Testtag", tag:"Test", blocks: [
    { id:"morgen",  t:"6:00",  nm:"Morgenroutine", kind:"morg", track:true, min:20 },
    { id:"anki",    t:"17:00", nm:"Anki",          kind:"anki", track:true, min:15 },
    { id:"deutsch", t:"18:00", nm:"Deutsch",       kind:"deep", track:true, min:60 }
  ]};
  const alle = {};
  ["mo","di","mi","do","fr","sa","so"].forEach(k => { alle[k] = tag; });
  return { core:["morgen","anki"], days: alle, vacationDays: alle, freeDay: tag };
})();
const blick = await p.evaluate(plan => {
  const T = window.__T, st = T.state();
  const heute = new Date();
  const bisher = (heute.getDay() + 6) % 7;
  const mo = new Date(heute); mo.setDate(heute.getDate() - bisher);
  st.p = plan; st.d = {}; st.w = {}; st.m = [];
  for (let i = 0; i <= bisher; i++) {
    const x = new Date(mo); x.setDate(mo.getDate() + i);
    st.d[T.ymd(x)] = ["morgen", "anki", "deutsch"];
  }
  st.updatedAt = Date.now() + 5000;
  return { wtag: bisher };
}, nurDeutsch);
await p.evaluate(() => { window.__T.planAnwenden(); window.__T.render(); });
await p.waitForTimeout(250);
const blickTxt = await p.evaluate(() => {
  const box = document.querySelector(".wblick");
  return box ? box.innerText.replace(/\s+/g, " ").trim() : null;
});
wahr("Der Wochenblick steht da", !!blickTxt);
wahr("und nennt die Fächer ohne Zeit", /Diese Woche ohne Zeit/.test(blickTxt));
wahr("SUK gehört dazu", /SUK/.test(blickTxt));
wahr("WiSo und Englisch auch", /WiSo/.test(blickTxt) && /Englisch/.test(blickTxt));
wahr("Deutsch nicht — das Fach hatte Zeit",
     !/ohne Zeit:[^—]*Deutsch/.test(blickTxt));

/*  Eine ganz leere Woche schweigt am Montag, ab Mittwoch aber nicht mehr:
    dort ist gerade das Nichts die Auskunft.                                  */
const leereWoche = await p.evaluate(() => {
  const T = window.__T, st = T.state();
  st.d = {}; st.updatedAt = Date.now() + 6000;
  T.render();
  const box = document.querySelector(".wblick");
  return { wtag: (new Date().getDay() + 6) % 7,
           txt: box ? box.innerText.replace(/\s+/g, " ").trim() : null };
});
if (leereWoche.wtag >= 2) {
  wahr("Ab Mittwoch meldet auch die leere Woche",
       leereWoche.txt && /bisher keines/.test(leereWoche.txt));
} else {
  wahr("Am Wochenanfang schweigt die leere Woche",
       !leereWoche.txt || !/ohne Zeit/.test(leereWoche.txt));
}

/* ---- 43. Was heute Abend auf dem Spiel steht -----------------------------
   Der Multiplikator wurde bisher erst sichtbar, wenn er weg war. Dieselbe
   Festzeitzone wie bei der Schlafenszeile, damit der Lauf nicht davon abhängt,
   wann am Tag er startet.                                                    */

/*  Ein Fallstrick, der beim Bauen auffiel: evaluate() läuft bis EINSCHLIESSLICH
    heute. An einem Abend mit offenem Kern ist ev.streak deshalb längst 0 — die
    Seite könnte gar nicht sagen, wo die Serie steht. Genau dafür gibt es
    serieGestern, und genau dieser Unterschied wird hier festgehalten.        */
async function einsatzZeile(stunde, tageVorher, opt) {
  const o = opt || {};
  const st = JSON.parse(JSON.stringify(start));
  st.p = planMitWeckruf("6:00", 7.5);
  st.d = {};
  const heute = new Date();
  const key = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") +
                   "-" + String(d.getDate()).padStart(2,"0");
  for (let i = 1; i <= tageVorher; i++) {
    const x = new Date(heute); x.setDate(heute.getDate() - i);
    st.d[key(x)] = ["morgen", "lesen"];
  }
  if (o.heuteFertig) st.d[key(heute)] = ["morgen", "lesen"];
  if (o.frei) st.f[key(heute)] = "frei";
  return await mitStunde(stunde, async zone => {
    const c = await b.newContext({ viewport:{width:900,height:900}, colorScheme:"dark",
                                   locale:"de-DE", timezoneId: zone });
    const q = await c.newPage();
    await q.addInitScript(`localStorage.setItem("lernquest.state.v5", ${JSON.stringify(JSON.stringify(st))})`);
    await q.goto("file://" + process.cwd() + "/" + datei);
    await q.waitForTimeout(400);
    const r = await q.evaluate(() => {
      const el = document.querySelector(".einsatz");
      const ev = window.__T.auswerten(window.__T.state(), window.__T.today());
      return { stunde: new Date().getHours(),
               txt: el ? el.innerText.replace(/\s+/g, " ").trim() : null,
               serie: ev.streak, serieGestern: ev.serieGestern,
               riss: ev.letzterRiss,
               kopf: (document.querySelector(".gauge.mint .cap") || {}).textContent || "" };
    });
    await c.close();
    return r;
  });
}

const eMittag = await einsatzZeile(12, 9);
eq("Mittags steht keine Einsatzzeile da", eMittag.txt, null);
eq("Der offene Kern hat die Serie heute schon auf null gesetzt", eMittag.serie, 0);
eq("serieGestern hält den Stand von gestern fest", eMittag.serieGestern, 9);

const eAbend = await einsatzZeile(18, 9);
wahr("Ab dem späten Nachmittag steht sie da", !!eAbend.txt);
wahr("und nennt, was der Kern noch einbringt", /Fertig gestempelt sind das \+\d+ XP/.test(eAbend.txt));
wahr("wo die Serie morgen stünde", /Serie steht morgen bei 10 \(×1,5\)/.test(eAbend.txt));
wahr("und was ein Abbruch kostet",
     /fängt sie wieder bei null an/.test(eAbend.txt) &&
     /×1 statt ×1,5/.test(eAbend.txt));

/*  Unter drei Tagen gibt es keinen Multiplikator zu verlieren — dann wäre der
    zweite Satz blosses Nörgeln.                                              */
const eKurz = await einsatzZeile(18, 1);
wahr("Bei kurzer Serie steht die Zeile trotzdem da", !!eKurz.txt);
wahr("aber ohne Drohung", !/fängt sie wieder bei null an/.test(eKurz.txt));
wahr("und nennt weiter den Stand von morgen", /Serie steht morgen bei 2/.test(eKurz.txt));

const eFertig = await einsatzZeile(18, 9, { heuteFertig: true });
eq("Ist der Kern erledigt, verschwindet sie", eFertig.txt, null);
eq("und die Serie zählt weiter", eFertig.serie, 10);

const eFrei = await einsatzZeile(18, 9, { frei: true });
eq("An einem frei markierten Tag steht sie nicht da", eFrei.txt, null);

/*  Eine gerissene Serie war bisher eine stumme Null. */
wahr("Die Anzeige nennt die zuletzt gerissene Serie",
     /zuletzt \d+ Tage?, gerissen am /.test(eMittag.kopf));
wahr("und weiterhin den Bestwert", /Bestwert /.test(eMittag.kopf));
wahr("Bei laufender Serie steht das nicht da", !/gerissen am/.test(eFertig.kopf));

/* ---- 44. Der Kern-Knopf bleibt unter dem Finger --------------------------
   Gefunden mit ECCs click-path-audit: toggleBlock und cycleMark verankerten
   das Neuzeichnen, kernStempeln nicht. Der Knopf hakt drei Blöcke auf einmal
   ab, deren Anleitungen gleichzeitig verschwinden — gemessen sprang auf 390 px
   alles um 108 px nach oben, und auf dem Handy lag der Finger danach über
   etwas anderem.                                                            */
async function kernSprung() {
  const st = JSON.parse(JSON.stringify(start));
  const c = await b.newContext({ viewport:{width:390,height:780}, colorScheme:"dark",
                                 locale:"de-DE" });
  const q = await c.newPage();
  await q.addInitScript(`localStorage.setItem("lernquest.state.v5", ${JSON.stringify(JSON.stringify(st))})`);
  await q.goto("file://" + process.cwd() + "/" + datei);
  await q.waitForSelector(".attrs", { timeout: 30000 });
  /*  Gemessen wird an einem Tag mit Anleitungen — nur die verschwinden beim
      Abhaken und machen die Seite kürzer. In den Ferien gäbe es nichts zu
      messen, und der Test spräche über den Kalender statt über die Seite.   */
  const tag = await q.evaluate(`(function () {
    var T = window.__T, off = ${schultag};
    T.setView(off); T.render(); return off;
  })()`);
  await q.waitForSelector('[data-act="kern"]', { timeout: 30000 });
  await q.locator('[data-act="kern"]').scrollIntoViewIfNeeded();
  await q.waitForTimeout(250);
  const vor = await q.evaluate(() => ({
    fuss: document.querySelector(".tagfuss").getBoundingClientRect().top,
    hoehe: document.body.scrollHeight }));
  await q.click('[data-act="kern"]');
  await q.waitForTimeout(350);
  const nach = await q.evaluate(() => ({
    fuss: document.querySelector(".tagfuss").getBoundingClientRect().top,
    hoehe: document.body.scrollHeight,
    stempel: (document.querySelector(".tagfuss .stamp") || {}).textContent || null }));
  await c.close();
  return { versatz: Math.round(nach.fuss - vor.fuss),
           kuerzer: vor.hoehe - nach.hoehe, stempel: nach.stempel, tag: tag };
}
const ks = await kernSprung();
wahr("Die Seite wird durch den Kern-Knopf spürbar kürzer (Tag " + ks.tag + ")",
     ks.kuerzer > 20);
wahr("aber die Fusszeile bleibt stehen (Versatz " + ks.versatz + " px)",
     Math.abs(ks.versatz) <= 4);
eq("und trägt danach den Stempel", ks.stempel, "Tag gerettet");

/* ---- 45. Der Jahresabschluss lässt sich zurücknehmen ---------------------
   Ein Klick schreibt bis zu fünf Zeugnisnoten. Als einziger Massen-Schreib-
   vorgang rief er kein merke() — ein Vertipper hiesse fünfmal einzeln löschen. */
const jahrAbT = heuteD.getMonth() >= 7 ? heuteD.getFullYear() : heuteD.getFullYear() - 1;
const datT = (m, tg) => `${m >= 8 ? jahrAbT : jahrAbT + 1}-${String(m).padStart(2,"0")}-${tg}`;
await p.evaluate(([a, b2]) => {
  const st = window.__T.state();
  st.g = [{ id:"ka1", fach:"suk", was:"KA", p:null, n:2.4, dat:a, gew:2 },
          { id:"ka2", fach:"deutsch", was:"KA", p:null, n:2.0, dat:b2, gew:1 }];
  st.m = []; st.updatedAt = Date.now() + 4000;
  window.__T.render();
}, [datT(9,"22"), datT(10,"08")]);
await p.waitForTimeout(250);
const jaVorher = await p.evaluate(() => window.__T.state().g.length);
wahr("Der Jahresabschluss steht bereit",
     await p.evaluate(() => !!document.querySelector('[data-act="jaadd"]')));
await p.click('[data-act="jaadd"]');
await p.waitForTimeout(350);
const jaMit = await p.evaluate(() => ({
  n: window.__T.state().g.length,
  leiste: (document.querySelector("#undobar span") || {}).textContent || null }));
wahr("Es kommen Jahresnoten dazu", jaMit.n > jaVorher);
eq("und die Rückgängig-Leiste nennt sie", jaMit.leiste, "Jahresnoten eingetragen");
await p.click('[data-act="undo"]');
await p.waitForTimeout(350);
eq("Rückgängig stellt den Stand davor wieder her",
   await p.evaluate(() => window.__T.state().g.length), jaVorher);

/* ---- 46. Die Stufenprüfung verliert den Fokus nicht mehr -----------------
   Gefunden mit ECCs accessibility-Skill (WCAG 2.2): zeigeExam() ersetzt bei
   jeder Antwort das Innere des Dialogs, der gedrückte Knopf wurde zerstört und
   der Fokus fiel auf <body>. Wer mit der Tastatur arbeitet, musste sich für
   jede der fünf Fragen neu durchtabben.                                     */
async function pruefungsLauf() {
  const st = JSON.parse(JSON.stringify(start));
  st.q = { suk: 1 };
  st.d = {};
  for (let i = 1; i < 40; i++) {
    const x = new Date(heuteD); x.setDate(heuteD.getDate() - i);
    st.d[ymdD(x)] = ["morgen","anki","lesen","deepA","deepB","wdh","deutsch","englisch"];
  }
  const c = await b.newContext({ viewport:{width:1180,height:900}, colorScheme:"dark",
                                 locale:"de-DE" });
  const q = await c.newPage();
  await q.addInitScript(`localStorage.setItem("lernquest.state.v5", ${JSON.stringify(JSON.stringify(st))})`);
  await q.goto("file://" + process.cwd() + "/" + datei);
  await q.waitForSelector(".attrs", { timeout: 30000 });
  const lage = () => q.evaluate(() => ({
    fokus: document.activeElement.tagName +
      (document.activeElement.id ? "#" + document.activeElement.id
        : document.activeElement.className ? "." + String(document.activeElement.className).split(" ")[0] : ""),
    sagt: (document.getElementById("exsage") || {}).textContent || "" }));
  // Antworten, egal ob Auswahl- oder Rechenfrage
  const antworte = async () => {
    if (await q.$(".exopt:not([disabled])")) await q.click(".exopt:not([disabled])");
    else if (await q.$("#exNum")) { await q.fill("#exNum", "1"); await q.click('[data-act="examNum"]'); }
    await q.waitForTimeout(250);
  };
  const attr = await q.evaluate(() =>
    (document.querySelector('[data-act="exam"]') || {}).getAttribute?.("data-attr"));
  if (!attr) { await c.close(); return null; }
  const bau = await q.evaluate(() => {
    const dlg = document.getElementById("examDlg"), sa = document.getElementById("exsage");
    return { da: !!sa, imDialog: !!sa && dlg.contains(sa),
             imBody: !!sa && document.getElementById("examBody").contains(sa),
             live: dlg.querySelectorAll("[aria-live]").length };
  });
  await q.click(`[data-act="exam"][data-attr="${attr}"]`);
  await q.waitForTimeout(400);
  const auf = await lage();
  await antworte();
  const beantwortet = await lage();
  await q.click('[data-act="examNext"]'); await q.waitForTimeout(250);
  const weiter = await lage();
  for (let i = 0; i < 6; i++) {
    if (await q.$(".exres")) break;
    if (await q.$('[data-act="examNext"]')) { await q.click('[data-act="examNext"]'); await q.waitForTimeout(200); }
    if (await q.$(".exres")) break;
    await antworte();
  }
  if (await q.$('[data-act="examNext"]')) { await q.click('[data-act="examNext"]'); await q.waitForTimeout(350); }
  const ende = await lage();
  const ergebnis = await q.evaluate(() => (document.querySelector(".exres h3") || {}).textContent || null);
  // Gegenprobe: bei geschlossenem Dialog schreibt sag() wieder nach #ansage
  await q.click('[data-act="examClose"]'); await q.waitForTimeout(400);
  await q.click('[data-act="kern"]').catch(() => {});
  await q.waitForTimeout(300);
  const zu = await q.evaluate(() => ({
    ansage: (document.getElementById("ansage") || {}).textContent || "",
    exsage: (document.getElementById("exsage") || {}).textContent || "" }));
  await c.close();
  return { bau, auf, beantwortet, weiter, ende, ergebnis, zu };
}
const lauf = await pruefungsLauf();
wahr("Eine Stufenprüfung steht bereit", !!lauf);

/*  Welche Frage zuerst kommt, wird gezogen — bei einer Rechenfrage gehört der
    Fokus ins Zahlenfeld, bei einer Auswahlfrage auf die erste Antwort.      */
wahr("Nach dem Öffnen liegt der Fokus auf der ersten Frage (" + lauf.auf.fokus + ")",
     lauf.auf.fokus === "BUTTON.exopt" || lauf.auf.fokus === "INPUT#exNum");
wahr("nach dem Antworten auf „Weiter\"", lauf.beantwortet.fokus === "BUTTON.btn");
wahr("und danach wieder auf der Frage",
     lauf.weiter.fokus === "BUTTON.exopt" || lauf.weiter.fokus === "INPUT#exNum");
wahr("auf dem Ergebnis auf dessen Knopf", lauf.ende.fokus === "BUTTON.btn");
wahr("nirgends auf <body>",
     ![lauf.auf, lauf.beantwortet, lauf.weiter, lauf.ende].some(x => x.fokus === "BODY"));

/* ---- 47. Der Prüfungsdialog sagt an -------------------------------------
   showModal() macht #root inert — #ansage erreichte während einer Prüfung
   niemanden. Die zweite Live-Region liegt deshalb IM Dialog, aber AUSSERHALB
   von #examBody: sonst zerstörte sie jede Antwort neu, und eine Region, die
   gleichzeitig mit ihrem Text entsteht, sagt nichts an.                     */
wahr("Es gibt eine Live-Region im Dialog", lauf.bau.da && lauf.bau.imDialog);
wahr("und sie liegt nicht in #examBody", !lauf.bau.imBody);
eq("genau eine", lauf.bau.live, 1);
eq("Vor der ersten Antwort ist sie leer", lauf.auf.sagt, "");
wahr("Nach dem Antworten steht das Ergebnis darin",
     /^(Richtig|Falsch)\./.test(lauf.beantwortet.sagt));
wahr("samt Begründung", lauf.beantwortet.sagt.length > 20);
wahr("Das Prüfungsergebnis wird angesagt",
     /(Bestanden|Nicht bestanden)\./.test(lauf.ende.sagt) && /\d von 5 richtig/.test(lauf.ende.sagt));
wahr("und es steht dasselbe auf dem Schirm",
     lauf.ergebnis !== null && lauf.ende.sagt.indexOf(lauf.ergebnis.split(" —")[0]) === 0);
wahr("Bei geschlossenem Dialog geht die Ansage wieder nach #ansage",
     /Kern abgehakt/.test(lauf.zu.ansage));

/* ---- 48. Zielgrösse: nichts Anfassbares unter 24×24 px -------------------
   WCAG 2.2 SC 2.5.8. Der Karriereplan-Verweis im Kartenkopf war 271×20.
   Der Wächter misst in beiden Breiten und fängt künftige Rückfälle mit ab.  */
async function zuKlein(breite) {
  const c = await b.newContext({ viewport:{width:breite,height:900}, colorScheme:"dark",
                                 locale:"de-DE" });
  const q = await c.newPage();
  await q.addInitScript(`localStorage.setItem("lernquest.state.v5", ${JSON.stringify(JSON.stringify(start))})`);
  await q.goto("file://" + process.cwd() + "/" + datei);
  await q.waitForSelector(".attrs", { timeout: 30000 });
  const raus = await q.evaluate(() => {
    const klein = [];
    document.querySelectorAll("button, a, input, select, [data-act]").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.width < 24 || r.height < 24) {
        klein.push(el.tagName.toLowerCase() + "." +
          String(el.className).split(" ")[0] + " " +
          Math.round(r.width) + "×" + Math.round(r.height));
      }
    });
    return klein;
  });
  await c.close();
  return raus;
}
eq("Auf 1180 px ist nichts Anfassbares kleiner als 24×24", await zuKlein(1180), []);
eq("auf 390 px auch nicht", await zuKlein(390), []);

/* ---- 49. Beim Laden geht nichts mehr verloren ----------------------------
   Vorher galt Alles-oder-nichts: der ältere Stand wurde ganz verworfen. Eine
   Routine, die sonntags in den eingebetteten Stand schreibt, verlor ihren
   Eintrag, sobald daneben ein Tab mit neuerem lokalem Stand offen war.
   Geprüft wird an einer eigenen Vorschaudatei, deren eingebetteter Stand
   bekannt ist — die reguläre trägt dort bewusst nur `{}`.                   */
async function ladeLauf(eingebettet, lokal, schluessel) {
  const roh = readFileSync("lernquest.html", "utf8").replace("})();\n</script>", HOOK)
    .replace(LEER_STATE, "$1" + JSON.stringify(eingebettet).replace(/</g, "\\u003c") + "$2");
  writeFileSync("preview-laden.html",
`<!doctype html><html lang="de"><head><meta charset="utf-8"><style>*{margin:0}</style></head><body>\n${roh}\n</body></html>`);
  const c = await b.newContext({ viewport:{width:1180,height:900}, colorScheme:"dark",
                                 locale:"de-DE" });
  const q = await c.newPage();
  const f = [];
  q.on("pageerror", e => f.push(e.message));
  if (lokal) {
    await q.addInitScript(`localStorage.setItem(${JSON.stringify(schluessel)}, ${JSON.stringify(JSON.stringify(lokal))})`);
  }
  await q.goto("file://" + process.cwd() + "/preview-laden.html");
  await q.waitForSelector(".attrs", { timeout: 30000 });
  const st = await q.evaluate(() => JSON.parse(JSON.stringify(window.__T.state())));
  const rund = await q.evaluate(() => {
    const s = window.__T.state();
    return JSON.stringify(window.__T.normalize(JSON.parse(JSON.stringify(s)))) === JSON.stringify(s);
  });
  await c.close();
  return { st, rund, fehler: f };
}

const embSonntag = { v:5, d:{ "2026-01-04":["morgen","anki"] }, f:{}, n:{}, w:{}, q:{},
                     g:[{ id:"gA", fach:"bwl", was:"Sonntagsarbeit", n:2, p:null,
                          dat:"2026-01-04", gew:1 }],
                     m:[], t:null, p:null, zn:1.7, zw:900, updatedAt: 1000 };
const locNeuer = { v:5, d:{ "2026-01-05":["morgen"] }, f:{}, n:{}, w:{}, q:{},
                   g:[{ id:"gB", fach:"suk", was:"Montagsarbeit", n:3, p:null,
                        dat:"2026-01-05", gew:1 }],
                   m:[], t:null, p:null, zn:1.4, zw:900, updatedAt: 2000 };

const zus = await ladeLauf(embSonntag, locNeuer, "lernquest.state.v5");
eq("Der lokale Tag steht", zus.st.d["2026-01-05"], ["morgen"]);
eq("und der eingebettete Sonntag auch", zus.st.d["2026-01-04"], ["morgen","anki"]);
eq("Beide Noten sind da", zus.st.g.map(e => e.id).sort(), ["gA","gB"]);
eq("Bei Streit gewinnt der neuere Stand", zus.st.zn, 1.4);
wahr("Der Zustand übersteht normalize() unverändert", zus.rund);
eq("Kein Skriptfehler beim Zusammenführen", zus.fehler, []);

/*  Andersherum: ist der eingebettete Stand der neuere, gibt er den Ton an —
    und der lokale füllt trotzdem seine Lücken auf.                          */
const umgekehrt = await ladeLauf(
  Object.assign({}, embSonntag, { updatedAt: 3000 }), locNeuer, "lernquest.state.v5");
eq("Umgekehrt gewinnt der eingebettete", umgekehrt.st.zn, 1.7);
eq("und der lokale Tag bleibt erhalten", umgekehrt.st.d["2026-01-05"], ["morgen"]);

/*  Umstieg auf Schema 5: unter dem neuen Schlüssel steht noch nichts, der
    alte wird einmal mitgelesen. Ohne das stünde die Seite nach dem Umstieg
    leer da.                                                                 */
const alt = await ladeLauf({}, locNeuer, "lernquest.state.v4");
eq("Der alte Schlüssel wird einmal mitgelesen", alt.st.g.length, 1);
eq("mit seinem Inhalt", alt.st.d["2026-01-05"], ["morgen"]);

/*  Und der Grundfall, der über allem steht: ein Häkchen überlebt das
    Neuladen. Ohne diese Zeile prüft niemand, ob der Zustand überhaupt
    ankommt — jede Veröffentlichung lädt die Ansicht neu.

    Hier bewusst ohne addInitScript: das läuft bei JEDER Navigation, also auch
    beim reload(), und setzte den Startstand zurück. Der Test hätte damit sein
    eigenes Zurücksetzen gemessen statt die Seite. Ohne Seed startet die Seite
    aus dem geleerten eingebetteten Stand — genau richtig.                   */
{
  const c = await b.newContext({ viewport:{width:1180,height:900}, colorScheme:"dark",
                                 locale:"de-DE" });
  const q = await c.newPage();
  await q.goto("file://" + process.cwd() + "/" + datei);
  await q.waitForSelector(".quests .stampbox", { timeout: 30000 });
  const kennung = await q.evaluate(() =>
    document.querySelector('.quest .stampbox[data-act="toggle"]').getAttribute("data-id"));
  await q.click('.stampbox[data-act="toggle"][data-id="' + kennung + '"]');
  await q.waitForTimeout(250);
  await q.reload();
  await q.waitForSelector(".quests", { timeout: 30000 });
  const steht = await q.evaluate(k =>
    document.querySelector('.quest[data-id="' + k + '"]').classList.contains("done"), kennung);
  await c.close();
  wahr("Ein Häkchen überlebt das Neuladen", steht);
}

/* ---- 50. Kein Skriptfehler ---------------------------------------------- */
eq("Seitenfehler", errs, []);

await ctx.close(); await b.close();
console.log(`\n${ok} Prüfungen bestanden, ${bad} gescheitert${kaputt ? "  (Lauf OHNE Fix)" : ""}`);
process.exit(bad ? 1 : 0);
