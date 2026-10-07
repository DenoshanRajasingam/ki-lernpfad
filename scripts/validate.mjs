// Prüft Inhalte, Version und Änderungsprotokoll der Lernseite.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (msg) => errors.push(msg);

function readJson(rel) {
  try {
    return JSON.parse(readFileSync(join(root, rel), "utf8"));
  } catch (e) {
    fail(`${rel}: kann nicht gelesen oder geparst werden (${e.message})`);
    return null;
  }
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const FIXED_TARGETS = ["mindset", "prompten", "bauen", "wissen", "medien", "lernpfad", "big", "ablauf", "werkzeuge", "erste", "hilfe"];
const VARIANT_MEDIA = ["video", "podcast", "read", "course", "practice"];

// Alle JSON-Dateien parsen
const contentDir = join(root, "content");
const content = {};
for (const file of readdirSync(contentDir).filter((f) => f.endsWith(".json"))) {
  content[file.slice(0, -5)] = readJson(`content/${file}`);
}
const version = readJson("version.json");

// version.json und CHANGELOG
if (isObj(version)) {
  if (!/^\d+\.\d+\.\d+$/.test(version.version ?? "")) fail("version.json: «version» muss das Format X.Y.Z haben");
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(version.date ?? "")) fail("version.json: «date» muss das Format TT.MM.JJJJ haben");
  if (!Array.isArray(version.notes) || version.notes.length === 0) fail("version.json: «notes» darf nicht leer sein");
  try {
    const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
    const escaped = String(version.version).replace(/\./g, "\\.");
    const heading = new RegExp(`^#{1,6}\\s+\\[?${escaped}\\]?(\\s|$)`, "m");
    if (!heading.test(changelog)) fail(`CHANGELOG.md: keine Überschrift für Version ${version.version}`);
  } catch {
    fail("CHANGELOG.md: Datei fehlt");
  }
}

const asArray = (v) => (Array.isArray(v) ? v : []);
const stages = asArray(content.stages);
const missions = asArray(content.missions);
const practice = asArray(content.practice);
const builds = asArray(content.builds);
const starterCards = asArray(content.starter);
const media = asArray(content.media);
const quiz = isObj(content.quiz) ? content.quiz : {};

function checkUnique(ids, label) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`${label}: ID «${id}» kommt mehrfach vor`);
    seen.add(id);
  }
}

const stepIds = [];
const checkIds = [];
for (const stage of stages) {
  for (const key of ["tasks", "deep", "checks", "starter"]) {
    for (const item of asArray(stage[key])) {
      stepIds.push(item.id);
      if (key === "checks") checkIds.push(item.id);
    }
  }
}
checkUnique(stepIds, "stages (tasks, deep, checks, starter)");
checkUnique(missions.map((m) => m.id), "missions");
checkUnique(practice.map((p) => p.id), "practice");
checkUnique(builds.map((b) => b.id), "builds");
checkUnique(starterCards.map((c) => c.id), "starter.json");
checkUnique(media.map((m) => m.id), "media");

// go-Verweise
const targets = new Set([...FIXED_TARGETS, ...media.map((m) => m.id), ...practice.map((p) => p.id), ...builds.map((b) => b.id)]);
const starterIds = new Set(starterCards.map((c) => c.id));
const isValidGo = (go) =>
  typeof go === "string" && (targets.has(go) || /^terms:[1-6]$/.test(go) || (go.startsWith("start:") && starterIds.has(go.slice("start:".length))));
function checkGo(go, where) {
  if (!isValidGo(go)) fail(`${where}: Verweis «${go}» zeigt auf kein bekanntes Ziel`);
}

function checkOptionalFields(item, where) {
  if (item.depth !== undefined && !["core", "standard", "deep"].includes(item.depth)) fail(`${where}: «depth» ist ungültig («${item.depth}»)`);
  if (item.place !== undefined && !["mobile", "computer", "any"].includes(item.place)) fail(`${where}: «place» ist ungültig («${item.place}»)`);
  if (item.variants === undefined) return;
  if (!Array.isArray(item.variants)) return fail(`${where}: «variants» muss ein Array sein`);
  item.variants.forEach((variant, k) => {
    if (!isObj(variant)) return fail(`${where}: variants[${k}] muss ein Objekt sein`);
    if (!VARIANT_MEDIA.includes(variant.media)) fail(`${where}: variants[${k}] hat ungültiges «media» («${variant.media}»)`);
    checkGo(variant.go, `${where} variants[${k}]`);
  });
}

// Modus «Ganz neu»: tasks[].starter ist false (ausblenden) oder ein Override mit diesen Feldern
const STARTER_OVERRIDE_KEYS = ["txt", "dur", "min", "go", "media"];
function checkStarterOverride(override, where) {
  if (override === undefined || override === false) return;
  if (!isObj(override)) return fail(`${where}: «starter» muss false oder ein Objekt sein`);
  for (const [key, value] of Object.entries(override)) {
    if (!STARTER_OVERRIDE_KEYS.includes(key)) fail(`${where}: starter enthält unbekannten Schlüssel «${key}»`);
    else if (["txt", "dur"].includes(key) && (typeof value !== "string" || !value)) fail(`${where}: starter.${key} muss ein nichtleerer Text sein`);
    else if (key === "min" && !(Number.isFinite(value) && value >= 0)) fail(`${where}: starter.min muss eine Zahl ab 0 sein`);
    else if (key === "media" && !VARIANT_MEDIA.includes(value)) fail(`${where}: starter.media ist ungültig («${value}»)`);
    else if (key === "go") checkGo(value, `${where} starter`);
  }
}

stages.forEach((stage, i) => {
  const stageName = `stages[${i}] «${stage.t ?? "?"}»`;
  for (const key of ["tasks", "deep", "starter"]) {
    if (key === "starter" && stage.starter !== undefined && !Array.isArray(stage.starter)) fail(`${stageName}: «starter» muss ein Array sein`);
    for (const item of asArray(stage[key])) {
      const where = `${stageName} ${key} ${item.id}`;
      checkGo(item.go, where);
      checkOptionalFields(item, where);
      if (key === "tasks") checkStarterOverride(item.starter, where);
    }
  }
  if (stage.gist !== undefined && (typeof stage.gist !== "string" || !stage.gist)) fail(`${stageName}: «gist» muss ein nichtleerer Text sein`);
  const link = stage.ex?.links?.[1];
  if (link) checkGo(link[1], `${stageName} ex.links[1]`);
});

// Karten für «Ganz neu»
if (content.starter !== undefined && !Array.isArray(content.starter)) fail("starter.json: muss ein Array sein");
starterCards.forEach((card, i) => {
  const where = `starter.json[${i}] «${card.id ?? "?"}»`;
  if (typeof card.id !== "string" || !card.id) fail(`${where}: «id» fehlt`);
  if (typeof card.title !== "string" || !card.title) fail(`${where}: «title» fehlt`);
  if (!Array.isArray(card.body) || card.body.length === 0 || card.body.some((p) => typeof p !== "string" || !p)) fail(`${where}: «body» muss ein nichtleeres Array aus Texten sein`);
  if (card.prompt !== undefined && (typeof card.prompt !== "string" || !card.prompt)) fail(`${where}: «prompt» muss ein nichtleerer Text sein`);
});

// Quiz
for (const id of checkIds) {
  if (!(id in quiz)) fail(`quiz.json: Eintrag für Selbstcheck «${id}» fehlt`);
}
for (const [id, entry] of Object.entries(quiz)) {
  if (typeof entry.q !== "string" || !entry.q) fail(`quiz.json ${id}: «q» fehlt`);
  if (!Array.isArray(entry.o) || entry.o.length < 2) fail(`quiz.json ${id}: «o» braucht mindestens 2 Antworten`);
  else if (!Number.isInteger(entry.a) || entry.a < 0 || entry.a >= entry.o.length) fail(`quiz.json ${id}: «a» ist kein gültiger Index`);
  if (typeof entry.x !== "string" || !entry.x) fail(`quiz.json ${id}: «x» fehlt`);
}

// Missionen
if (missions.length !== stages.length) fail(`missions.json: ${missions.length} Einträge, aber ${stages.length} Stufen`);

// Medien
media.forEach((m, i) => {
  for (const key of ["id", "lvl", "type", "title", "by", "len", "url"]) {
    if (m[key] === undefined || m[key] === "") fail(`media.json[${i}] «${m.id ?? "?"}»: Feld «${key}» fehlt`);
  }
  if (typeof m.url === "string" && !m.url.startsWith("https://")) fail(`media.json «${m.id}»: URL muss mit https:// beginnen`);
});

// Quiz-Tab: Fragen je Stufe (content/play/s1.json bis s6.json) und Sprüche (content/play/lines.json)
const PLAY_STAGES = 6;
const PLAY_MIN_QUESTIONS = 50;
const PLAY_LINE_KEYS = ["right", "wrong", "combo", "gameover", "duel", "tie", "highscore"];
const isText = (v) => typeof v === "string" && v.trim() !== "";
const isTextList = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max && v.every(isText);
const isIndex = (v, length) => Number.isInteger(v) && v >= 0 && v < length;

function checkPlayOptions(q) {
  if (!isTextList(q.o, 3, 4)) return ["«o» braucht 3 bis 4 Texte"];
  return isIndex(q.a, q.o.length) ? [] : ["«a» ist kein gültiger Index in «o»"];
}
// Je Fragetyp eine Liste der Fehlermeldungen (leer = in Ordnung)
const PLAY_TYPE_CHECKS = {
  mc: (q) => checkPlayOptions(q),
  gap: (q) => [...checkPlayOptions(q), ...(String(q.q ?? "").split("___").length === 2 ? [] : ["«q» braucht genau eine Lücke «___»"])],
  tf: (q) => (typeof q.a === "boolean" ? [] : ["«a» muss true oder false sein"]),
  order: (q) => (isTextList(q.items, 3, 5) ? [] : ["«items» braucht 3 bis 5 Texte"]),
  match: (q) =>
    Array.isArray(q.pairs) && q.pairs.length >= 3 && q.pairs.length <= 4 && q.pairs.every((p) => isTextList(p, 2, 2))
      ? []
      : ["«pairs» braucht 3 bis 4 Paare aus je 2 Texten"],
  prompt: (q) => (isTextList(q.o, 2, 2) && (q.a === 0 || q.a === 1) ? [] : ["«o» braucht genau 2 Texte und «a» muss 0 oder 1 sein"]),
  spot: (q) => {
    if (!isTextList(q.lines, 3, 5)) return ["«lines» braucht 3 bis 5 Texte"];
    return isIndex(q.a, q.lines.length) ? [] : ["«a» ist kein gültiger Index in «lines»"];
  },
};

const playIds = [];
for (let n = 1; n <= PLAY_STAGES; n++) {
  const rel = `content/play/s${n}.json`;
  const list = readJson(rel);
  if (list === null) continue;
  if (!Array.isArray(list)) {
    fail(`${rel}: muss ein Array sein`);
    continue;
  }
  if (list.length < PLAY_MIN_QUESTIONS) fail(`${rel}: ${list.length} Fragen, mindestens ${PLAY_MIN_QUESTIONS} nötig`);
  list.forEach((q, i) => {
    const where = `${rel}[${i}] «${q?.id ?? "?"}»`;
    if (!isObj(q)) return fail(`${where}: muss ein Objekt sein`);
    if (typeof q.id !== "string" || !new RegExp(`^q${n}-.+`).test(q.id)) fail(`${where}: «id» muss mit «q${n}-» beginnen`);
    playIds.push(q.id);
    for (const key of ["topic", "q", "x"]) if (!isText(q[key])) fail(`${where}: «${key}» fehlt`);
    if (!Object.hasOwn(PLAY_TYPE_CHECKS, q.type)) return fail(`${where}: «type» ist ungültig («${q.type}»)`);
    PLAY_TYPE_CHECKS[q.type](q).forEach((msg) => fail(`${where}: ${msg}`));
  });
}
checkUnique(playIds, "content/play (Quiz-Fragen)");

const playLines = readJson("content/play/lines.json");
if (playLines !== null) {
  if (!isObj(playLines)) fail("content/play/lines.json: muss ein Objekt sein");
  else
    for (const key of PLAY_LINE_KEYS) {
      if (!isTextList(playLines[key], 1, Infinity)) fail(`content/play/lines.json: «${key}» muss ein nichtleeres Array aus Texten sein`);
    }
}

if (errors.length === 0) {
  console.log("OK: Alle Prüfungen bestanden");
} else {
  errors.forEach((e) => console.log("Fehler: " + e));
  console.log(`${errors.length} Fehler gefunden`);
  process.exit(1);
}
