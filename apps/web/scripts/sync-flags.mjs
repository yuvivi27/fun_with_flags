/**
 * Copies all flag SVGs from `flag-icons` (MIT) into `public/flags/` for offline use.
 * Custom assets (e.g. `tx.svg`, `usc.svg`) in `public/flags/` are left in place;
 * only files that exist in flag-icons are overwritten.
 *
 * Run: `pnpm --filter web run flags:sync`
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const pkgPath = require.resolve("flag-icons/package.json");
const srcDir = join(dirname(pkgPath), "flags", "4x3");
const destDir = join(__dirname, "..", "public", "flags");

mkdirSync(destDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => f.endsWith(".svg"));
let n = 0;
for (const file of files) {
  const from = join(srcDir, file);
  if (!existsSync(from)) continue;
  copyFileSync(from, join(destDir, file));
  n++;
}
console.log("synced", n, "SVGs from flag-icons into public/flags");
