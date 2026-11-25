# How Aika Enhanced is updated through Millennium

Checked against Millennium's source (`src/bindings/theme_mgr.cc`, `library_updater.cc`,
`theme_cfg.cc`), the steambrew.app API (`www/src/app/api/checkupdates`, `api/v2/update`,
`api/v2/FetchThemes.ts`) and the ThemeDatabase rules — November 2026.

## The mechanism

1. **Which themes are checked.** Millennium looks at every theme folder in
   `Steam/millennium/themes/` that has a `github` block in `skin.json` **and** a
   `metadata.json` (or a `.git` folder) — `query_themes_for_updates`.
2. **The question.** It sends `POST https://steambrew.app/api/checkupdates` with
   `{"themes":[{"owner":…,"repo":…}]}` taken from `skin.json → github.owner / repo_name`.
3. **The answer.** steambrew.app answers **only for themes listed in the ThemeDatabase**
   (`github.com/SteamClientHomebrew/ThemeDatabase`, file `metadata.json`). For each it returns the
   newest commit of the repository's **default branch** (`oid`, message, date, codeload URL).
   Matching is exact: owner and repo as written in the database; then Millennium pairs the answer
   to the theme by `name == skin.json github.repo_name` (case-sensitive).
4. **Has it changed?** `metadata.json → commit` (the installed commit) is compared with the
   remote commit. Different → the theme appears in **Millennium → Updates** with the commit
   message as its description. **The `version` field is not used for this** — it is only shown.
   Releases and tags are not used either.
5. **Update button.** `Core_DownloadThemeUpdate(native)` → `POST /api/v2/update` with owner/repo
   from `metadata.json` → downloads `github.com/<owner>/<repo>/archive/<newest commit>.zip`,
   extracts it, **copies every file over the existing theme folder (overwrite, nothing is
   deleted)**, writes `metadata.json` with the new commit, regenerates the theme config.
   The folder name (`native`) stays the same.
6. **After the update** local commit == remote commit, so the entry disappears. The new CSS/JS is
   used after Steam is restarted (or the theme is re-selected).

## What this means for Aika Enhanced

| Requirement | How it is met |
| --- | --- |
| Listed in ThemeDatabase | **Required.** Without it steambrew.app returns nothing and Millennium never shows an update. See `docs/themedatabase-submission.md`. |
| `skin.json → github` = repository, exact case | `Blackhagwag` / `Aika-Enhanced`; checked by `tools/validate.mjs` in CI. |
| Stable updates only | Millennium installs the **head of `main`**. Development happens on `dev`; `main` moves only through `tools/release.ps1` (fast-forward to the release commit + tag `vX.Y.Z`). CI warns/fails if `main` is not at a release tag. |
| Readable update description | The release commit message `Aika Enhanced X.Y.Z — title` is what Millennium shows. |
| `metadata.json` | Never committed (Millennium writes it). Manual installers write it themselves. |
| Download content | GitHub's archive of the commit; `.gitattributes export-ignore` keeps tests/tools/notes out. |
| GitHub Release | Human record (notes, CHANGELOG section, zip + sha256). Not read by Millennium. |

## User settings across updates

- Every setting of the theme settings window (preset, custom colours, Friends Dock, chat,
  top bar / compact header / navigation layout, visibility toggles, sliders) is stored by
  Millennium in `Steam/millennium/config/config.json → themes.conditions[<folder>]` and
  `themes.themeColors[<folder>]` — **outside the theme folder**, keyed by the folder name, which an
  update keeps. So updates do not reset them.
- On start Millennium resets a saved value **only if it no longer exists in `skin.json`**
  (`setup_conditionals`). Rule: condition names and value labels are never renamed or removed —
  only added. `tools/validate.mjs` compares against the previous release tag and fails otherwise.
- Dock state, open chat, button positions, caches: Steam's own `localStorage` (keys
  `aika-*`, `se-*`), also outside the theme folder. Keys must not be renamed.
- Because Millennium never deletes files, a file removed from the theme stays in users' folders.
  Code must not rely on a file being absent; to retire a stylesheet, leave an empty file or stop
  referencing it from `skin.json`.

## Installed copies made before 2.0.1

The copy installed from the old repository name has `skin.json → github` =
`blackhagwag/aka-enhanced` and a `metadata.json` naming `aka-enhanced`. Neither matches the
database entry exactly, so that copy would never see an update. One-time fix, keeping the folder
(and so the settings): edit `skin.json → github` and `metadata.json → owner/repo` of the installed
copy to `Blackhagwag` / `Aika-Enhanced` (back up first with `tools/backup-local.ps1`). From then on
updates come through Millennium → Updates.

Note: installing from the steambrew store page creates a **new** folder named after the repository
(`themes/Aika-Enhanced`). Millennium keys settings by folder name, so such a fresh install starts
with default settings; the old folder's settings stay in `config.json` under the old name.

## Testing an update without touching the real install

```
node tools/simulate-update.mjs --theme "C:/Program Files (x86)/Steam/millennium/themes/<folder>" --ref main
```

replays Millennium's update steps (archive, copy-over, metadata, settings pass, has_updates
before/after) on a sandbox copy. The real end-to-end check (Millennium → Updates → Update) is in
`CLAUDE.md → Testing`.
