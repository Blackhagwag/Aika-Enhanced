# Aika Enhanced — rules for Claude Code

Aika Enhanced is a Steam theme for **Millennium** (steambrew.app): the theme **Aika** by hatewxb
plus a Friends Dock with built-in chat and Steam Enhanced's Millennium Settings (NVHT, MIT).
Repository: `github.com/Blackhagwag/Aika-Enhanced` · default branch `main` · working branch `dev`.
The owner speaks Russian: answer in Russian.

## Architecture

| Path | What it is |
| --- | --- |
| `skin.json` | Millennium manifest: name, **version**, `github` block, `Conditions` (every user setting → option CSS), `Patches` (which CSS/JS goes into which Steam window). |
| `root-colors.css`, `colors.css`, `tokens.css` | Palette and design tokens (`--aika-*`). All colour/radius/motion comes from tokens. |
| `main.css`, `popup.css`, `toast.css`, `overlay.css`, `login.css`, `webkit.css` | Entry stylesheets per Steam window (see `Patches`). `webkit.css` = Steam's web pages (store, community). |
| `base.css`, `background.css`, `selectors.css`, `components/`, `sections/` | Aika's styles: components (button, card, menu, panel…) and per-area sections (library, store, friends, friends-dock, millennium…). |
| `options/` | One small CSS per setting value (`Conditions → values → TargetCss`). `options/presets/` = colour presets. |
| `js/` | Aika's client scripts: `client-*.js` are per-window entries; `friends-dock.js` the dock; `live-settings.js` applies settings live; `store-*.js` the store; `vendor/hyalite.js` (MIT). |
| `vendor/steam-enhanced/` | Parts of Steam Enhanced 1.4.4 (NVHT, MIT): runtime, popup layer, chat engine, Millennium Settings redesign, theme settings window. `client/loader.js` is the entry (first patch). Files `aika-*.js`, `friends-dock-aika*.css`, `aika-foundation.css`, `loader.js` are ours; patches inside copied files are marked "Aika Enhanced". |
| `assets/fonts/` | Bundled fonts (OFL licences next to them). |
| `install/` | Manual installers (Windows/Linux), back up the old folder, write `metadata.json`. |
| `tests/` | `*.test.mjs/cjs` (node, no browser — run in CI), `*.e2e.cjs` (browser harness). |
| `tools/` | `validate.mjs` (all checks), `release.ps1`, `simulate-update.mjs`, `backup-local.ps1` / `restore-local.ps1`, CDP helpers for a running Steam (`cdp.js`, `shot.js`, … — need Steam started with `-dev`, port 8080). |
| `docs/UPDATES.md` | How Millennium updates themes — read before touching versioning/release. |
| `docs/themedatabase-submission.md` | The ThemeDatabase listing (required for Millennium updates). |
| `LICENSES/` | Authors and licences. Keep it accurate. |
| `ROADMAP.md` | The original Aika author's design notes. |

Installed copy on the owner's PC: `C:\Program Files (x86)\Steam\millennium\themes\Aka-Enhanced-ccr-cdef11e4-pfot4j`
(the folder name is the settings key — never rename it). Backups: `…\millennium\aika-enhanced-backups\`.

## Origins

- Aika 0.1.8 — `hatewxb/Aika@26203656` — **no licence published** (all rights reserved by hatewxb).
  Public redistribution needs hatewxb's permission; see `LICENSES/README.md`.
- Steam Enhanced 1.4.4 — `NVHT/Steam-Enhanced@7d8439c` — MIT (`vendor/steam-enhanced/LICENSE`, `LICENSES/Steam-Enhanced-MIT.txt`).
- Millennium core calls (`Core_GetStartConfig`, `Core_ChangeCondition`, `Core_ChangeColor`…) are called, never copied.

## Visual rules (Aika)

- Do not redesign. Keep Aika's look: warm near-black background, soft spots of light, Fluent
  structure, file-system-style panels, its fonts and wordmarks.
- New UI is built only from Aika's tokens (`--aika-*`) and components; no hard-coded colours,
  radii or durations. Every preset (Aika, Rose Ash, Hello Bert, Greeny, Custom) must work.
- Steam Enhanced parts take Aika's palette through the token bridge at the end of
  `vendor/steam-enhanced/core/tokens.css` — keep it that way.
- Respect the *Performance* setting and reduced-motion options for every animation.

## User settings — must survive every update

- Settings live in Millennium's `config.json` keyed by **theme folder name + condition name +
  value label**, and in Steam's `localStorage` (keys `aika-*`, `se-*`). Never inside the theme folder.
- **Never rename or remove** a condition (`skin.json → Conditions`) or one of its value labels;
  never turn a slider into a list. Add new ones instead; deprecated values can stay and map to
  the new behaviour. `tools/validate.mjs` fails on removals compared with the last `v*` tag.
- Never rename `localStorage` keys; if a format changes, read the old one and migrate.
- New settings need a sensible `default` (that is what existing users get).
- Millennium never deletes files on update: do not rely on a file being gone.

## Versioning

Semantic versioning `MAJOR.MINOR.PATCH`: MAJOR = big/visual overhauls or breaking changes, MINOR =
new features, PATCH = fixes. Current version: see `skin.json → version`. Never reset or lower it.
The version lives in: `skin.json` (`version`), `CHANGELOG.md` (newest `## X.Y.Z` heading),
`README.md` (`· X.Y.Z` in the header). The theme settings window reads it from `skin.json`.
`tools/release.ps1` updates all three; `tools/validate.mjs` checks they agree.

## How updates reach users (short — details in `docs/UPDATES.md`)

Millennium does **not** use the version, tags or Releases. It compares the installed commit
(`metadata.json`, written by Millennium) with the **newest commit of `main`** reported by
steambrew.app — which only answers for themes in the **ThemeDatabase**. Therefore:

- **Every push to `main` is an update for every user.** Never commit or push to `main` directly.
  Work on `dev`; `main` only moves by fast-forward in `tools/release.ps1`.
- `skin.json → github` must stay exactly `"owner": "Blackhagwag", "repo_name": "Aika-Enhanced"`.
- Never commit `metadata.json`.

## Development workflow

1. Work on `dev`. Commit as you go; add the change to `## Unreleased` in `CHANGELOG.md`
   (under **New** / **Fixed**).
2. Check: `node tools/validate.mjs` and the node tests (`node tests/<name>.test.mjs`).
3. Try it in the installed theme (copy changed files into the installed folder, or
   `install/install.ps1 -ThemesDir …` into a test folder) and restart Steam / reload the theme.
4. Push `dev` freely (`git push origin dev`) — CI runs, users get nothing.

## Releasing — ONLY after the owner explicitly confirms

Never release, tag, push `main` or create a GitHub Release without the owner's explicit "yes" for
that specific version in this chat. Before asking: show the version, the title and the
CHANGELOG section, and the result of the checks. Then:

```powershell
powershell -ExecutionPolicy Bypass -File tools\backup-local.ps1 -Label before-X.Y.Z
powershell -ExecutionPolicy Bypass -File tools\release.ps1 -Version X.Y.Z -Title "Short title"          # local only, review
powershell -ExecutionPolicy Bypass -File tools\release.ps1 ... -Push                                    # or: git push --atomic origin main dev vX.Y.Z
```

The tag push starts `.github/workflows/release.yml`: checks, tag == version, tag == head of
`main`, archive (`git archive`, same files as Millennium's download), GitHub Release with the
CHANGELOG section. Millennium offers the update as soon as `main` moved (steambrew caches up to
~30 min). Watch the run: `gh run list --workflow release.yml`.

## Testing

- Every change: `node tools/validate.mjs` (structure, JSON, skin.json references, version sync,
  settings compatibility, JS syntax, no secrets) + node tests. CI runs the same on every push.
- Before a release: `node tools/simulate-update.mjs --theme "<installed folder>" --ref dev`
  — replays Millennium's update on a sandbox copy (archive, copy-over, metadata, settings pass).
- After a release (real check, needs the ThemeDatabase listing): Steam → Millennium → Updates →
  Check for updates → *Aika Enhanced* listed with the release commit message → Update → restart
  Steam → theme works, settings unchanged, `metadata.json → commit` = the release commit, the
  entry is gone after another check. Roll back with `tools/restore-local.ps1` if anything breaks.
- Do not claim something works until it was actually run and seen.

## Never publish

No personal data, Steam account data (`userdata/`, `*.vdf`, Steam IDs, friend names from the real
account), Millennium `config.json`, tokens/keys/passwords, `.claude/`, chat transcripts, local
screenshots of the real account. Screenshots for docs use the test fixture (`tests/friends-dock/`).
`tools/validate.mjs` blocks the common cases; check `git diff --staged` anyway. Never ask the owner
for a GitHub password or token — `gh auth login --web` only.

## Do not

- Modify Steam's executables or Millennium's core; disable Millennium/Steam security features.
- Open pull requests to other repositories (ThemeDatabase, Aika, Steam Enhanced), post issues, or
  make the repository public/private without the owner's confirmation.
