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
  for (const key of ["tasks", "deep", "checks"]) {
    for (const item of asArray(stage[key])) {
      stepIds.push(item.id);
      if (key === "checks") checkIds.push(item.id);
    }
  }
}
checkUnique(stepIds, "stages (tasks, deep, checks)");
checkUnique(missions.map((m) => m.id), "missions");
checkUnique(practice.map((p) => p.id), "practice");
checkUnique(builds.map((b) => b.id), "builds");
checkUnique(media.map((m) => m.id), "media");

// go-Verweise
const targets = new Set([...FIXED_TARGETS, ...media.map((m) => m.id), ...practice.map((p) => p.id), ...builds.map((b) => b.id)]);
const isValidGo = (go) => typeof go === "string" && (targets.has(go) || /^terms:[1-6]$/.test(go));
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

stages.forEach((stage, i) => {
  const stageName = `stages[${i}] «${stage.t ?? "?"}»`;
  for (const key of ["tasks", "deep"]) {
    for (const item of asArray(stage[key])) {
      const where = `${stageName} ${key} ${item.id}`;
      checkGo(item.go, where);
      checkOptionalFields(item, where);
    }
  }
  const link = stage.ex?.links?.[1];
  if (link) checkGo(link[1], `${stageName} ex.links[1]`);
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

if (errors.length === 0) {
  console.log("OK: Alle Prüfungen bestanden");
} else {
  errors.forEach((e) => console.log("Fehler: " + e));
  console.log(`${errors.length} Fehler gefunden`);
  process.exit(1);
}
