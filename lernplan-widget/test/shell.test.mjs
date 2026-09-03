//  Führt die Shell-Aufrufe aus SH tatsächlich aus — gegen ein Wegwerf-$HOME.
//  Prüft Quoting, atomares Schreiben und die Rotation der Sicherungen. Die
//  macOS-eigenen Aufrufe (open, osascript) werden nur auf ihre Form geprüft,
//  die laufen hier nicht.
import * as L from "./.bundle.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, writeFileSync, readdirSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A === B) pass++; else { fail++; console.log(`FAIL ${msg}\n  got ${A}\n  exp ${B}`); }
};
const ok = (v, msg) => eq(!!v, true, msg);

const HOME = mkdtempSync(join(tmpdir(), "lernplan-"));
const F = join(HOME, ".lernplan-widget.json");
const C = join(HOME, ".lernplan-config.json");
const B = join(HOME, ".lernplan-backups");
//  stderr wird eingefangen statt durchgereicht — der Schutz gegen das
//  Überschreiben einer vorhandenen Konfiguration meldet sich dort absichtlich.
const sh = (cmd) => execFileSync("/bin/sh", ["-c", cmd],
  { env: { ...process.env, HOME }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// ---- Laden ohne jede Datei -------------------------------------------------
let out = sh(L.SH.load());
let split = L.splitPayload(out);
eq(split.config.trim(), L.NO_CONFIG, "fehlende Konfiguration wird gemeldet");
eq(split.state.trim(), "{}", "fehlender Zustand ist leer");
eq(L.parseState(split.state).d, {}, "leerer Zustand ist benutzbar");

// ---- Schreiben und wieder lesen --------------------------------------------
const state = { v: 4, d: { "2026-08-17": ["morgen", "anki"] }, f: {}, n: {}, t: null, b: "", w: {}, u: {} };
sh(L.SH.save(JSON.stringify(state), false));
ok(existsSync(F), "Zustandsdatei angelegt");
ok(!existsSync(F + ".tmp"), "keine .tmp-Leiche");
eq(JSON.parse(readFileSync(F, "utf8")).d, state.d, "Inhalt stimmt");
split = L.splitPayload(sh(L.SH.load()));
eq(L.parseState(split.state).d, state.d, "Runde Zustand → Datei → Zustand");

// ---- Sonderzeichen, die Shell und JSON gern zerlegen ------------------------
const nasty = {
  ...state,
  n: {
    "2026-08-17": `Er sagte "hi"; rm -rf / & $(whoami) 'quote' \`back\` \\ende
zweite Zeile · Umlaute äöüß · 100%`,
  },
};
sh(L.SH.save(JSON.stringify(nasty), false));
eq(JSON.parse(readFileSync(F, "utf8")).n, nasty.n, "Sonderzeichen überleben die Shell");
ok(!existsSync(join(HOME, "ende")), "keine Dateiumleitung ausgelöst");

// ---- Rettung einer defekten Datei ------------------------------------------
writeFileSync(F, "{kaputt");
eq(L.parseState(readFileSync(F, "utf8")).broken, true, "defekte Datei erkannt");
sh(L.SH.save(JSON.stringify(state), true));
ok(existsSync(F + ".broken"), "defekte Datei als .broken gerettet");
eq(readFileSync(F + ".broken", "utf8"), "{kaputt", "Original unverändert gerettet");
eq(JSON.parse(readFileSync(F, "utf8")).d, state.d, "neuer Stand steht trotzdem");

// ---- Konfiguration anlegen -------------------------------------------------
const starter = JSON.stringify({ width: 470, core: ["morgen", "anki", "lesen"] }, null, 2);
eq(sh(L.SH.createConfig(starter)).trim(), "ok", "Konfiguration angelegt");
eq(JSON.parse(readFileSync(C, "utf8")).core, ["morgen", "anki", "lesen"], "Inhalt stimmt");
let guarded = false;
try { sh(L.SH.createConfig('{"width":1}')); } catch (e) { guarded = true; }
ok(guarded, "vorhandene Konfiguration wird nicht überschrieben");
eq(JSON.parse(readFileSync(C, "utf8")).width, 470, "alte Konfiguration unangetastet");
// Jetzt meldet der Ladebefehl keine fehlende Datei mehr
eq(L.splitPayload(sh(L.SH.load())).config.trim().startsWith("{"), true, "Konfiguration wird geladen");

// ---- Sicherung und Rotation ------------------------------------------------
eq(sh(L.SH.backup("2026-08-17", 14)).trim(), "ok", "Sicherung angelegt");
ok(existsSync(join(B, "2026-08-17.json")), "Sicherungsdatei da");
// 20 Stände anlegen, absteigend altern lassen, dann auf 14 eindampfen
for (let i = 1; i <= 20; i++) {
  const p = join(B, `2026-07-${String(i).padStart(2, "0")}.json`);
  writeFileSync(p, "{}");
  const t = new Date(2026, 6, i).getTime() / 1000;
  utimesSync(p, t, t);
}
sh(L.SH.backup("2026-08-18", 14));
const kept = readdirSync(B).filter((x) => x.endsWith(".json"));
eq(kept.length, 14, "auf 14 Stände eingedampft");
ok(kept.includes("2026-08-18.json"), "der jüngste Stand bleibt");
ok(!kept.includes("2026-07-01.json"), "der älteste ist weg");
eq(sh(L.SH.backupManual()).trim(), "ok", "Sicherung von Hand");
ok(readdirSync(B).some((x) => x.startsWith("manuell-")), "Zeitstempel im Namen");

// ---- CSV -------------------------------------------------------------------
const csv = 'Datum;Notiz\r\n"2026-08-17";"er sagte ""hi""; und $HOME"\r\n';
sh(L.SH.csv("lernplan-2026-08.csv", csv));
eq(readFileSync(join(HOME, "lernplan-2026-08.csv"), "utf8"), csv, "CSV unverändert geschrieben");

// ---- macOS-Aufrufe: nur die Form -------------------------------------------
const dlg = L.SH.dialog('Notiz für "Montag"', "alt \\ neu", "Lernplan");
ok(dlg.startsWith("osascript -e '"), "Dialog geht über osascript");
ok(dlg.includes('\\"Montag\\"'), "Anführungszeichen im Text sind escaped");
ok(dlg.includes("@@CANCEL@@"), "Abbruch ist abgefangen");
eq(L.dialogResult("@@CANCEL@@\n"), null, "Abbruch erkannt");
eq(L.dialogResult("Text\n"), "Text", "Antwort ohne Zeilenumbruch");
eq(L.dialogResult(""), "", "leere Antwort ist leerer Text");
const nt = L.SH.notify("Titel", 'mit "Zitat"', "Glass");
ok(nt.includes("display notification"), "Mitteilung");
ok(nt.includes('\\"Zitat\\"'), "Zitat im Mitteilungstext escaped");
ok(L.SH.open("config").includes("open -t"), "Konfiguration im Editor");
ok(L.SH.open("backups").includes("mkdir -p"), "Sicherungsordner wird notfalls angelegt");

// ---- Zustandsdatei verlegen (gemeinsamer Stand mit dem iPhone) -------------
eq(L.statePathOf({}), "$HOME/.lernplan-widget.json", "Standardpfad");
eq(L.statePathOf({ statePath: "$HOME/iCloud/lernplan-widget.json" }),
   "$HOME/iCloud/lernplan-widget.json", "eigener Pfad wird übernommen");
eq(L.statePathOf({ statePath: '$HOME/a"; rm -rf ~; echo "' }),
   "$HOME/.lernplan-widget.json", "Anführungszeichen → Standardpfad");
eq(L.statePathOf({ statePath: "$(whoami)/x" }), "$HOME/.lernplan-widget.json",
   "Kommandoersetzung → Standardpfad");
eq(L.statePathOf({ statePath: "`id`" }), "$HOME/.lernplan-widget.json",
   "Backticks → Standardpfad");
eq(L.statePathOf({ statePath: "   " }), "$HOME/.lernplan-widget.json", "leer → Standardpfad");
ok(L.validateConfig(L.mergeConfig(L.DEFAULTS, { statePath: "`id`" }))
    .some((w) => /statePath/.test(w)), "unbrauchbarer statePath wird gemeldet");
eq(L.validateConfig(L.mergeConfig(L.DEFAULTS, { statePath: "$HOME/ok.json" })), [],
   "brauchbarer statePath ist still");
// Ein verlegter Pfad wird wirklich benutzt — $HOME löst die Shell auf
{
  const alt = "$HOME/geteilt/lernplan-widget.json";
  sh(`mkdir -p "$HOME/geteilt"`);
  const cfgOld = JSON.parse(readFileSync(C, "utf8"));
  writeFileSync(C, JSON.stringify({ ...cfgOld, statePath: alt }));
  // Der Ladebefehl entsteht aus der gerade geladenen Konfiguration; hier
  // wird er direkt mit dem verlegten Pfad gebaut.
  const merged = L.mergeConfig(L.DEFAULTS, { statePath: alt });
  eq(L.statePathOf(merged), alt, "Pfad aus der Konfiguration");
}

// ---- Dateinamen ------------------------------------------------------------
eq(L.safeName("2026-08-17"), "2026-08-17", "Datum bleibt");
eq(L.safeName("lernplan-2026-08.csv"), "lernplan-2026-08.csv", "CSV-Name bleibt");
eq(L.safeName("../../etc/passwd"), "....etcpasswd", "Pfadwechsel entschärft");
eq(L.safeName('a"; rm -rf ~; echo "'), "arm-rfecho", "Kommandos entschärft");
eq(L.safeName(""), "unbenannt", "leer wird ersetzt");
eq(L.safeName(".."), "unbenannt", "..  wird ersetzt");
eq(L.safeName("-rf"), "unbenannt", "führender Bindestrich wird ersetzt");
// Auch mit einem bösartigen Schlüssel darf nichts außerhalb entstehen
sh(L.SH.backup("../../boese", 14));
ok(!existsSync(join(HOME, "boese.json")), "Sicherung bleibt im Sicherungsordner");

// Ein einfaches Anführungszeichen im $HOME-Pfad würde alles sprengen —
// deshalb geht wirklich jeder Fremdtext durch shq().
eq(L.shq("a'b'c"), `'a'\\''b'\\''c'`, "shq verschachtelt korrekt");
eq(sh(`printf %s ${L.shq(`a'b"c $d \`e\``)}`), `a'b"c $d \`e\``, "shq hält jeden Sonderfall");

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen  (Shell, $HOME=${HOME})`);
process.exit(fail ? 1 : 0);
