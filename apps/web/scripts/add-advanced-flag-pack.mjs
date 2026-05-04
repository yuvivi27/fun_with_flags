/**
 * Merges difficulty-5 “advanced” flags: only real SVGs (flag-icons on disk or Wikipedia fetch).
 * Run: node ./scripts/add-advanced-flag-pack.mjs
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const flagsDir = join(__dirname, "..", "public", "flags");
const dbPath = join(__dirname, "..", "app", "game", "flags-database.json");

mkdirSync(flagsDir, { recursive: true });

/**
 * Uses existing `public/flags/{code}.svg` (from flag-icons / sync — real designs).
 */
const advancedPackLocal = [
  ["gb-eng", "England"],
  ["gb-sct", "Scotland"],
  ["gb-wls", "Wales"],
  ["gb-nir", "Northern Ireland"],
  ["es-ct", "Catalonia"],
  ["es-ga", "Galicia"],
  ["es-pv", "Basque Country"],
  ["un", "United Nations"],
  ["eu", "European Union"],
  ["arab", "Arab League"],
  ["asean", "ASEAN"],
  ["cefta", "CEFTA"],
  ["eac", "East African Community"],
  ["ic", "Canary Islands"],
];

/** Fetched via Wikipedia Special:FilePath (real Commons SVGs). */
const advancedPackWithUrls = {
  "hist-yu": {
    name: "Yugoslavia (SFR)",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20Yugoslavia%20(1946-1992).svg",
  },
  "hist-su": {
    name: "Soviet Union (USSR)",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20the%20Soviet%20Union.svg",
  },
  "hist-spqr": {
    name: "Roman Empire (SPQR)",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Vexilloid%20of%20the%20Roman%20Empire.svg",
  },
  "eth-druze": {
    name: "Druze",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20Druze.svg",
  },
  "hist-ddr": {
    name: "East Germany (GDR)",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20East%20Germany.svg",
  },
  "hist-cs": {
    name: "Czechoslovakia",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20Czechoslovakia.svg",
  },
  "hist-de-imp": {
    name: "German Empire",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20the%20German%20Empire.svg",
  },
  "hist-ah": {
    name: "Austria-Hungary",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20Austria-Hungary%20(1869-1918).svg",
  },
  "hist-tx-rep": {
    name: "Republic of Texas",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20the%20Republic%20of%20Texas%20(1836-1839).svg",
  },
  "hist-gran-col": {
    name: "Gran Colombia",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20the%20Gran%20Colombia.svg",
  },
  "hist-ot": {
    name: "Ottoman Empire",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20the%20Ottoman%20Empire.svg",
  },
  "org-nato": {
    name: "NATO",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20NATO.svg",
  },
  "hist-pr": {
    name: "Prussia",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20Prussia%20(1892-1918).svg",
  },
  "hist-ru-imp": {
    name: "Russian Empire",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20the%20Russian%20Empire%20(black-yellow-white).svg",
  },
  "hist-manchukuo": {
    name: "Manchukuo",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20Manchukuo.svg",
  },
  "hist-rhodesia": {
    name: "Rhodesia",
    url: "https://en.wikipedia.org/wiki/Special:FilePath/Flag%20of%20Rhodesia%20(1968%E2%80%931979).svg",
  },
};

const advancedCodes = new Set([
  ...Object.keys(advancedPackWithUrls),
  ...advancedPackLocal.map(([code]) => code),
]);

/** Legacy generic-pack codes (striped + 3-letter placeholders) — delete SVG if still present. */
const REMOVED_ADVANCED_CODES = [
  "hist-br",
  "hist-ua-ssr",
  "hist-qa",
  "hist-pahlavi",
  "hist-rsfsr",
  "hist-ysr",
  "hist-pdr",
  "hist-fr-royal",
  "hist-es-burg",
  "hist-qing",
  "hist-ming",
  "hist-byz",
  "hist-safavid",
  "hist-mughal",
  "hist-maratha",
  "hist-zanzibar",
  "hist-hawaii",
  "hist-biafra",
  "hist-katanga",
  "hist-transkei",
  "hist-venice",
  "hist-genoa",
  "hist-sardinia",
  "hist-sicilies",
  "hist-nfederation",
  "hist-confed",
  "eth-kurd",
  "eth-assyrian",
  "eth-circassian",
  "eth-yezidi",
  "eth-amazigh",
  "eth-romani",
  "eth-sami",
  "eth-basque",
  "eth-catalan",
  "eth-kashubian",
  "eth-karen",
  "eth-uyghur",
  "eth-tatar",
  "eth-zaza",
  "eth-baluchi",
  "eth-pashtun",
  "eth-chechen",
  "eth-ingush",
  "eth-ossetian",
  "eth-armenian-diaspora",
  "eth-gagauz",
  "eth-laz",
  "eth-krymchak",
  "eth-ruthenian",
  "eth-ainu",
  "eth-maori",
  "eth-mapuche",
  "eth-guarani",
  "eth-quechua",
  "eth-aymara",
  "eth-zulu",
  "eth-xhosa",
  "eth-tuareg",
  "eth-falasha",
  "eth-kabyle",
  "eth-dinka",
  "eth-nuer",
  "eth-nubian",
  "eth-copt",
  "ent-un",
  "ent-eu",
  "ent-nato",
  "ent-arab",
  "ent-au",
  "ent-asean",
  "ent-oas",
  "ent-ecowas",
  "ent-gcc",
  "ent-eac",
  "ent-efta",
  "ent-mercosur",
  "ent-carf",
  "ent-cplp",
  "ent-oic",
  "ent-cis",
  "ent-brics",
  "ent-saarc",
  "ent-pacific",
  "ent-francophonie",
  "reg-eng",
  "reg-scot",
  "reg-wales",
  "reg-nir",
  "reg-brittany",
  "reg-corsica",
  "reg-faroe",
  "reg-greenland",
  "reg-sardinia",
  "reg-sicily",
  "reg-canary",
  "reg-catalonia",
  "reg-galicia",
  "reg-basque",
  "reg-flemish",
  "reg-walloon",
  "reg-bavaria",
  "reg-saxony",
  "reg-quebec",
  "reg-kurdistan",
  "reg-ac",
  "reg-ta",
  "reg-sh",
  "reg-ic",
  "reg-cp",
  "reg-dg",
  "reg-pc",
  "reg-eng-alt",
  "reg-scot-alt",
  "reg-wales-alt",
];

async function maybeFetchSvg(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "FlagsTrivia/1.0 (https://github.com/; educational flag assets)",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const svg = await res.text();
    if (!svg.includes("<svg")) return null;
    return svg;
  } catch {
    return null;
  }
}

for (const code of REMOVED_ADVANCED_CODES) {
  const p = join(flagsDir, `${code}.svg`);
  if (existsSync(p)) {
    unlinkSync(p);
  }
}

for (const [code, name] of advancedPackLocal) {
  const p = join(flagsDir, `${code}.svg`);
  if (!existsSync(p)) {
    console.warn("skip local (missing svg):", code, name);
  }
}

for (const [code, { name, url }] of Object.entries(advancedPackWithUrls)) {
  const svg = await maybeFetchSvg(url);
  if (!svg) {
    console.warn("skip (fetch failed):", code, name);
    continue;
  }
  writeFileSync(join(flagsDir, `${code}.svg`), svg, "utf8");
}

const db = JSON.parse(readFileSync(dbPath, "utf8"));
const byCode = new Map();

for (const row of db) {
  if (row.difficulty === 5 && !advancedCodes.has(row.code)) {
    continue;
  }
  byCode.set(row.code, row);
}

for (const [code, name] of advancedPackLocal) {
  if (!existsSync(join(flagsDir, `${code}.svg`))) continue;
  byCode.set(code, { code, name, difficulty: 5 });
}

for (const [code, { name }] of Object.entries(advancedPackWithUrls)) {
  if (!existsSync(join(flagsDir, `${code}.svg`))) continue;
  byCode.set(code, { code, name, difficulty: 5 });
}

const merged = [...byCode.values()].sort((a, b) => {
  if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
  return String(a.name).localeCompare(String(b.name));
});

writeFileSync(dbPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

console.log("advanced difficulty-5 codes:", advancedCodes.size);
console.log("database entries:", merged.length);
