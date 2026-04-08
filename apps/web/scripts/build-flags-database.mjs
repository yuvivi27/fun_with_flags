/**
 * Builds `app/game/flags-database.json` from `world-countries` + flag-icons availability.
 * Run from apps/web: `node ./scripts/build-flags-database.mjs`
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import countries from "world-countries";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgPath = require.resolve("flag-icons/package.json");
const iconsDir = join(dirname(pkgPath), "flags", "4x3");
const outPath = join(__dirname, "..", "app", "game", "flags-database.json");
const publicFlagsDir = join(__dirname, "..", "public", "flags");

function svgCodesIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.replace(/\.svg$/i, "").toLowerCase());
}

const available = new Set([...svgCodesIn(iconsDir), ...svgCodesIn(publicFlagsDir)]);

/** ~50 globally recognizable UN members (ISO alpha-2) */
const LEVEL_1 = new Set(
  `
us gb fr de jp cn br it ca es au in mx ar ru ua kr nl se no ch at be pt pl tr ir sa eg za ng ke id th vn ph my sg nz ie dk fi gr il co pe ve cl ma dz tn ly et
`
    .trim()
    .split(/\s+/)
    .map((c) => c.toLowerCase()),
);

const byCode = new Map();

function add(row) {
  if (!available.has(row.code)) {
    console.warn("skip (no flag-icons svg):", row.code, row.name);
    return;
  }
  byCode.set(row.code, row);
}

for (const c of countries.filter((x) => x.unMember)) {
  const code = c.cca2.toLowerCase();
  add({
    code,
    name: c.name.common,
    difficulty: LEVEL_1.has(code) ? 1 : 2,
  });
}

const tw = countries.find((x) => x.cca2 === "TW");
if (tw) {
  add({ code: "tw", name: tw.name.common, difficulty: 2 });
}

const merged = [...byCode.values()].sort((a, b) => {
  if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
  return a.name.localeCompare(b.name);
});

for (const row of merged) {
  if (row.code === "cz") row.name = "Czech Republic";
}

writeFileSync(outPath, JSON.stringify(merged, null, 2), "utf8");
console.log("wrote", outPath, "entries:", merged.length);
