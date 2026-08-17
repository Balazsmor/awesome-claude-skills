//  Nachbau der Scriptable-Umgebung, so weit Lernplan.js sie benutzt.
//  Damit lässt sich das iOS-Skript auf einem Rechner bauen und der fertige
//  Widget-Baum auslesen — die einzige Möglichkeit, es ohne iPhone zu prüfen.
import vm from "node:vm";
import { readFileSync } from "node:fs";

class Color {
  constructor(hex, alpha = 1) { this.hex = hex; this.alpha = alpha; }
  static gray() { return new Color("#808080"); }
  static black() { return new Color("#000000"); }
  static white() { return new Color("#ffffff"); }
  static dynamic(a, b) { return a; }
}
class Font {
  constructor(kind, size) { this.kind = kind; this.size = size; }
  static systemFont(s) { return new Font("system", s); }
  static boldSystemFont(s) { return new Font("bold", s); }
  static mediumSystemFont(s) { return new Font("medium", s); }
}
class Size {
  constructor(w, h) { this.width = w; this.height = h; }
}
class LinearGradient {
  constructor() { this.colors = []; this.locations = []; }
}

/** Gemeinsame Basis von ListWidget und WidgetStack. */
class Stack {
  constructor() { this.children = []; this.props = {}; }
  addStack() { const s = new Stack(); this.children.push(s); return s; }
  addText(t) {
    const n = {
      _kind: "text", text: String(t),
      rightAlignText() {}, leftAlignText() {}, centerAlignText() {},
    };
    this.children.push(n);
    return n;
  }
  addImage() {
    const n = { _kind: "image", imageSize: null, tintColor: null,
                rightAlignImage() {}, leftAlignImage() {}, centerAlignImage() {} };
    this.children.push(n);
    return n;
  }
  addSpacer(n) { this.children.push({ _kind: "spacer", n }); }
  addDate() { const n = { _kind: "date" }; this.children.push(n); return n; }
  layoutVertically() { this.vertical = true; }
  layoutHorizontally() { this.vertical = false; }
  centerAlignContent() {}
  topAlignContent() {}
  bottomAlignContent() {}
}
class ListWidget extends Stack {
  constructor() { super(); this.presented = []; }
  setPadding(t, l, b, r) { this.padding = [t, l, b, r]; }
  async presentSmall() { this.presented.push("small"); }
  async presentMedium() { this.presented.push("medium"); }
  async presentLarge() { this.presented.push("large"); }
}

class UITableCell {
  constructor(title, subtitle) { this.title = title; this.subtitle = subtitle; }
  static text(t, s) { return new UITableCell(t, s); }
  leftAligned() {} centerAligned() {} rightAligned() {}
}
class UITableRow {
  constructor() { this.cells = []; this.onSelect = null; }
  addText(t, s) { const c = new UITableCell(t, s); this.cells.push(c); return c; }
}
class UITable {
  constructor() { this.rows = []; this.presented = false; }
  addRow(r) { this.rows.push(r); }
  removeAllRows() { this.rows = []; }
  reload() { this.reloads = (this.reloads || 0) + 1; }
  async present() { this.presented = true; }
}
class Alert {
  constructor() { this.fields = []; this.actions = []; }
  addTextField(p, v) { this.fields.push(v); }
  addAction(a) { this.actions.push(a); }
  addCancelAction(a) { this.cancel = a; }
  textFieldValue(i) { return Alert.nextValue !== undefined ? Alert.nextValue : this.fields[i]; }
  async presentAlert() { return Alert.nextIndex === undefined ? -1 : Alert.nextIndex; }
}

/** Dateisystem im Speicher — kein Zugriff auf die echte Platte. */
export function makeFileManager(files = {}, { icloud = true } = {}) {
  const store = { ...files };
  const api = {
    _store: store,
    documentsDirectory: () => "/docs",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: (p) => Object.prototype.hasOwnProperty.call(store, p),
    readString: (p) => {
      if (!(p in store)) throw new Error("ENOENT " + p);
      return store[p];
    },
    writeString: (p, s) => { store[p] = String(s); },
    copy: (a, b) => { store[b] = store[a]; },
    remove: (p) => { delete store[p]; },
    isFileStoredIniCloud: () => icloud,
    isFileDownloaded: () => true,
    downloadFileFromiCloud: async () => {},
  };
  return api;
}

/**
 * Führt Lernplan.js in einer nachgebauten Umgebung aus.
 * Gibt das gesetzte Widget, die Tabelle und das Dateisystem zurück.
 */
export async function runScript(path, {
  family = "medium", runsInWidget = true, files = {}, icloud = true, now = null,
} = {}) {
  const fm = makeFileManager(files, { icloud });
  let widget = null;
  let table = null;

  const RealDate = Date;
  const FakeDate = now
    ? new Proxy(RealDate, {
        construct(target, args) {
          return args.length ? new target(...args) : new target(now.getTime());
        },
        get(target, prop) {
          if (prop === "now") return () => now.getTime();
          return Reflect.get(target, prop);
        },
      })
    : RealDate;

  const sandbox = {
    Color, Font, Size, LinearGradient, ListWidget,
    UITable, UITableRow, UITableCell, Alert,
    Date: FakeDate,
    Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map,
    Promise, console, encodeURIComponent, isNaN, parseInt, parseFloat,
    FileManager: { local: () => fm, iCloud: () => { if (!icloud) throw new Error("no iCloud"); return fm; } },
    config: { runsInWidget, runsInApp: !runsInWidget, widgetFamily: family },
    Script: {
      name: () => "Lernplan",
      setWidget: (w) => { widget = w; },
      complete: () => {},
    },
    __captureTable: (t) => { table = t; },
  };
  sandbox.globalThis = sandbox;

  const src = readFileSync(path, "utf8");
  //  Die letzte präsentierte Tabelle einfangen, ohne das Skript zu ändern.
  const patched = src.replace("await table.present(false);",
    "__captureTable(table); await table.present(false);");
  const ctx = vm.createContext(sandbox);
  await vm.runInContext(`(async () => { ${patched} })()`, ctx, { filename: path });
  return { widget, table, fm, files: fm._store };
}

/** Alle Textknoten eines Widget-Baums, von oben nach unten. */
export function texts(node) {
  if (!node) return [];
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (n._kind === "text") { out.push(n.text); return; }
    for (const c of n.children || []) walk(c);
  };
  walk(node);
  return out;
}

/** Alle Stapel mit gesetzter Größe — für die Balkenprüfung. */
export function sized(node) {
  const out = [];
  const walk = (n) => {
    if (!n || n._kind) return;
    if (n.size) out.push(n.size);
    for (const c of n.children || []) walk(c);
  };
  walk(node);
  return out;
}
