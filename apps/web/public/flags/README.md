# Local flag images

SVG files here are produced by:

```bash
pnpm --filter web run flags:sync
```

That copies **all** [flag-icons](https://github.com/lipis/flag-icons) (MIT) `4x3` assets into this folder. Custom additions (e.g. `tx.svg`, `usc.svg` for US states) live here too and are not removed by sync.

## Country database

Canonical list: `app/game/flags-database.json` (code, English name, difficulty). Regenerate after changing `scripts/build-flags-database.mjs`:

```bash
pnpm --filter web run flags:build-db
```

Then run `flags:sync` if new ISO codes need SVGs from `flag-icons`.
