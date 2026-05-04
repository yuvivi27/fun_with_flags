/**
 * Downloads all 50 U.S. state flags as SVG into `public/flags/`.
 * Source: flagcdn.com (`us-xx.svg` naming).
 *
 * Run: `pnpm --filter web run flags:sync-us-states`
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const destDir = join(__dirname, "..", "public", "flags");

mkdirSync(destDir, { recursive: true });

const STATE_CODES = [
  "al",
  "ak",
  "az",
  "ar",
  "ca",
  "co",
  "ct",
  "de",
  "fl",
  "ga",
  "hi",
  "id",
  "il",
  "in",
  "ia",
  "ks",
  "ky",
  "la",
  "me",
  "md",
  "ma",
  "mi",
  "mn",
  "ms",
  "mo",
  "mt",
  "ne",
  "nv",
  "nh",
  "nj",
  "nm",
  "ny",
  "nc",
  "nd",
  "oh",
  "ok",
  "or",
  "pa",
  "ri",
  "sc",
  "sd",
  "tn",
  "tx",
  "ut",
  "vt",
  "va",
  "wa",
  "wv",
  "wi",
  "wy",
];

let written = 0;
for (const code of STATE_CODES) {
  const url = `https://flagcdn.com/us-${code}.svg`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("skip", code, `(${res.status})`);
    continue;
  }
  const svg = await res.text();
  writeFileSync(join(destDir, `us-${code}.svg`), svg, "utf8");
  written += 1;
}

console.log("synced", written, "US state SVG flags into public/flags");
