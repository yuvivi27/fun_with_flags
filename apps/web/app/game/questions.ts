import flagsData from "./flags-database.json";

export type FlagEntry = {
  code: string;
  name: string;
  /** 1 = widely recognized · 2 = other UN members & peers · 3 = reserved (not in active pool) */
  difficulty: 1 | 2 | 3;
};

const rawFlags: FlagEntry[] = flagsData as FlagEntry[];

const EXCLUDED_CODES = new Set([
  "ps", // Palestine
  "usc", // U.S. composite/state-style icon
]);

const EXCLUDED_NAMES = new Set([
  "alabama",
  "alaska",
  "arizona",
  "arkansas",
  "california",
  "colorado",
  "connecticut",
  "delaware",
  "florida",
  "georgia",
  "hawaii",
  "idaho",
  "illinois",
  "indiana",
  "iowa",
  "kansas",
  "kentucky",
  "louisiana",
  "maine",
  "maryland",
  "massachusetts",
  "michigan",
  "minnesota",
  "mississippi",
  "missouri",
  "montana",
  "nebraska",
  "nevada",
  "new hampshire",
  "new jersey",
  "new mexico",
  "new york",
  "north carolina",
  "north dakota",
  "ohio",
  "oklahoma",
  "oregon",
  "pennsylvania",
  "rhode island",
  "south carolina",
  "south dakota",
  "tennessee",
  "texas",
  "utah",
  "vermont",
  "virginia",
  "washington",
  "west virginia",
  "wisconsin",
  "wyoming",
  "district of columbia",
]);

/** Sovereign-country pool only: Levels 1–2; excludes Palestine (`ps`) and any Level-3 rows. */
export const FLAGS_DATABASE: FlagEntry[] = rawFlags.filter(
  (row) =>
    row.difficulty !== 3 &&
    !EXCLUDED_CODES.has(row.code.toLowerCase()) &&
    !EXCLUDED_NAMES.has(row.name.toLowerCase()),
);

/** Local SVG under `public/flags/` — run `pnpm --filter web run flags:sync` after flag-icons updates */
export function flagImageSrc(countryCode: string): string {
  return `/flags/${countryCode.toLowerCase()}.svg`;
}
