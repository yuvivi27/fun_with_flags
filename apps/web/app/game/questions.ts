import flagsData from "./flags-database.json";

export type FlagEntry = {
  code: string;
  name: string;
  /**
   * Single progression + scoring band (1–5).
   * 1 = famous countries · 2 = broader pool · 3 = obscure islands · 4 = US states · 5 = advanced packs
   */
  difficulty: 1 | 2 | 3 | 4 | 5;
};

const rawFlags: FlagEntry[] = flagsData as FlagEntry[];

const ENGLISH_NAME_OVERRIDES: Record<string, string> = {
  "Türkiye": "Turkey",
  "Réunion": "Reunion",
  "Curaçao": "Curacao",
  "Åland Islands": "Aland Islands",
  "Saint Barthélemy": "Saint Barthelemy",
  "São Tomé and Príncipe": "Sao Tome and Principe",
  "Saint Helena, Ascension and Tristan da Cunha": "Saint Helena",
  "South Georgia": "South Georgia and the South Sandwich Islands",
};

function normalizeEnglishName(name: string): string {
  const override = ENGLISH_NAME_OVERRIDES[name];
  if (override) return override;
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const EXCLUDED_CODES = new Set([
  "ps", // Palestine
  "usc", // U.S. composite/state-style icon
  // Temporary territory exclusions: these often resolve to sovereign-like flags
  // in generic icon sets and create misleading quiz prompts.
  "bl",
  "bq",
  "bv",
  "cc",
  "cx",
  "gf",
  "gp",
  "hm",
  "mf",
  "mq",
  "nf",
  "pm",
  "re",
  "sj",
  "tf",
  "um",
  "wf",
  "yt",
]);

const CUSTOM_TERRITORY_ENTRIES: FlagEntry[] = [
  { code: "ac", name: "Ascension Island", difficulty: 2 },
  { code: "ta", name: "Tristan da Cunha", difficulty: 2 },
];

/** Base flag pool used by the quiz. */
export const FLAGS_DATABASE: FlagEntry[] = [...rawFlags, ...CUSTOM_TERRITORY_ENTRIES]
  .filter((row) => !EXCLUDED_CODES.has(row.code.toLowerCase()))
  .map((row) => ({
    ...row,
    name: normalizeEnglishName(row.name),
  }))
  .filter(
    (row, index, arr) =>
      arr.findIndex((candidate) => candidate.code === row.code) === index,
  );

/**
 * Max `difficulty` band unlocked for a player level:
 * - 1: levels 1–3
 * - 2: levels 4–6
 * - 3: levels 7–8
 * - 4–5: level 9+ (US states + advanced / historical / cultural pack together)
 */
export function getMaxDifficultyForPlayerLevel(
  playerLevel: number,
): 1 | 2 | 3 | 4 | 5 {
  if (playerLevel >= 9) return 5;
  if (playerLevel >= 7) return 3;
  if (playerLevel >= 4) return 2;
  return 1;
}

export function getFlagsForPlayerLevel(playerLevel: number): FlagEntry[] {
  const maxDifficulty = getMaxDifficultyForPlayerLevel(playerLevel);
  return FLAGS_DATABASE.filter((row) => row.difficulty <= maxDifficulty);
}

/** Local SVG under `public/flags/` — run `pnpm --filter web run flags:sync` after flag-icons updates */
export function flagImageSrc(countryCode: string): string {
  return `/flags/${countryCode.toLowerCase()}.svg`;
}
