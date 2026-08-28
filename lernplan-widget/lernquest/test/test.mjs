import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

// Testfassung: legt die reinen Rechenfunktionen offen. Diese Zeile steht NICHT
// in der veröffentlichten Datei.
const HOOK = `  try { window.__T = { punkteZuNote:punkteZuNote, noteZuPunkte:noteZuPunkte,
    schnitt:schnitt, prognose:prognose, num:num, notenName:notenName,
    view:function(){return view;}, PLAN:PLAN, QUIZ:QUIZ,
    isoWeek:isoWeek, timerLeft:timerLeft, blockZeit:blockZeit, tagesLage:tagesLage,
    zieheFragen:zieheFragen, state:function(){return state;}, render:render,
    ZEUGNIS:ZEUGNIS }; } catch (e) {}\n})();\n</script>`;

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
    { id:"k1", fach:"bwl",     was:"Test Beschaffung", n:2.0, p:null, dat:"2026-08-01", gew:1 },
    { id:"k2", fach:"wiso",    was:"Test SV",          n:2.3, p:null, dat:"2026-08-02", gew:1 },
    { id:"k3", fach:"suk",     was:"KA Buchführung",   n:1.7, p:null, dat:"2026-08-03", gew:2 },
    { id:"k4", fach:"deutsch", was:"Erörterung",       n:3.0, p:null, dat:"2026-08-04", gew:1 }
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
    schnitt: document.querySelector(".zeug .proghead .note").textContent,
    zeilen: zeilen,
    deutschKachel: kachel("Deutsch"),
    punkteInListe: Array.from(document.querySelectorAll(".glist .gitem"))
      .filter(li => /Zeugnis/.test(li.querySelector(".gm").textContent))
      .map(li => li.querySelector(".gm").textContent)
  };
});
eq("Zeugnisschnitt", zeug.schnitt, "Schnitt 2,33");
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

/* ---- 22. Kein Skriptfehler ---------------------------------------------- */
eq("Seitenfehler", errs, []);

await ctx.close(); await b.close();
console.log(`\n${ok} Prüfungen bestanden, ${bad} gescheitert${kaputt ? "  (Lauf OHNE Fix)" : ""}`);
process.exit(bad ? 1 : 0);
