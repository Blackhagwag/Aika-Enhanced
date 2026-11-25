#!/usr/bin/env node
// Aika Enhanced — replay Millennium's theme update, step by step, in a SANDBOX copy.
//
// Mirrors Millennium's own code (src/bindings/theme_mgr.cc, update_theme / has_updates, and
// src/bindings/theme_cfg.cc, setup_conditionals) without touching the real Steam folders:
//   1. copy the installed theme folder and Millennium's config.json into a sandbox;
//   2. "has update?": installed metadata.json commit != the new commit (has_updates);
//   3. get the archive Millennium downloads — GitHub's codeload zip of the commit (--url),
//      or the identical `git archive` of a local ref (--ref) — and extract it;
//   4. copy every file over the theme folder with overwrite, deleting nothing (as Millennium);
//   5. write metadata.json { owner, repo, commit } (as Millennium);
//   6. run Millennium's settings pass over the sandbox config.json and report every user
//      setting that would be reset;
//   7. "has update?" again — must be false now.
//
//   node tools/simulate-update.mjs --theme "<Steam>/millennium/themes/<folder>" --ref dev
//   node tools/simulate-update.mjs --theme "<…>" --url https://codeload.github.com/O/R/zip/<sha> --commit <sha>
//   [--config "<Steam>/millennium/config/config.json"] [--out <sandbox dir>]
//
// Exit code 0 = the update would install cleanly and keep every setting.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const a = process.argv.slice(2);
const opt = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
const theme = opt("--theme");
if (!theme || !existsSync(join(theme, "skin.json"))) { console.error("--theme <installed theme folder> is required"); process.exit(2); }
const configPath = opt("--config") || join(theme, "..", "..", "config", "config.json");
const out = opt("--out") || mkdtempSync(join(tmpdir(), "aika-update-sim-"));
let errors = 0;
const step = (m) => console.log(`\n${m}`);
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { errors++; console.log(`  ✗ ${m}`); };
const info = (m) => console.log(`  · ${m}`);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const walk = (d, base = d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p, base) : [relative(base, p).replace(/\\/g, "/")]; });

// 1. Sandbox ------------------------------------------------------------------------------
step(`1. Sandbox: ${out}`);
const native = basename(theme);
const sbTheme = join(out, "themes", native);
mkdirSync(dirname(sbTheme), { recursive: true });
cpSync(theme, sbTheme, { recursive: true });
const sbConfig = join(out, "config.json");
const haveConfig = existsSync(configPath);
if (haveConfig) copyFileSync(configPath, sbConfig);
ok(`theme "${native}" copied${haveConfig ? ", config.json copied" : " (no config.json found — settings pass skipped)"}`);
const before = { skin: readJson(join(sbTheme, "skin.json")), meta: existsSync(join(sbTheme, "metadata.json")) ? readJson(join(sbTheme, "metadata.json")) : null };
info(`installed: version ${before.skin.version}, metadata ${before.meta ? `${before.meta.owner}/${before.meta.repo} @ ${before.meta.commit}` : "missing"}`);
if (!before.meta) bad("no metadata.json — Millennium would not check this theme for updates at all (query_themes_for_updates)");

// 3 (first: we need the new commit). Archive ------------------------------------------------
step("2. Archive Millennium would download");
const work = join(out, "download");
mkdirSync(work, { recursive: true });
const zip = join(work, "theme.zip");
let commit = opt("--commit");
if (opt("--url")) {
  const res = await fetch(opt("--url"));
  if (!res.ok) { bad(`download failed: HTTP ${res.status}`); finish(); }
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  ok(`downloaded ${opt("--url")}`);
} else {
  const ref = opt("--ref") || "HEAD";
  commit = execFileSync("git", ["rev-parse", ref], { cwd: ROOT, encoding: "utf8" }).trim();
  // codeload's archive = git archive of the commit with a "<repo>-<sha>/" prefix (export-ignore applies)
  execFileSync("git", ["archive", "--format=zip", `--prefix=${before.skin.github?.repo_name || "repo"}-${commit}/`, "-o", zip, commit], { cwd: ROOT });
  ok(`git archive ${ref} (${commit.slice(0, 7)}) — same file list as GitHub's codeload zip`);
}
if (!commit) { bad("--commit <sha> is required with --url"); finish(); }

step("3. has_updates (before)");
const localCommit = before.meta?.commit ?? "";
localCommit !== commit ? ok(`local ${localCommit.slice(0, 7) || "''"} != remote ${commit.slice(0, 7)} → Millennium lists the update`)
  : info(`local == remote (${commit.slice(0, 7)}) → Millennium would NOT list an update`);

step("4. Extract and copy over the theme folder (overwrite, delete nothing)");
const ex = join(work, "x");
mkdirSync(ex, { recursive: true });
const tar = process.platform === "win32" ? join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "unzip";
if (process.platform === "win32") execFileSync(tar, ["-xf", zip, "-C", ex]); else execFileSync("unzip", ["-q", zip, "-d", ex]);
const top = readdirSync(ex).map((n) => join(ex, n)).find((p) => statSync(p).isDirectory());
if (!top) { bad("no top-level folder in the archive (Millennium would fail)"); finish(); }
const incoming = walk(top);
const existing = new Set(walk(sbTheme));
let added = 0, replaced = 0;
for (const rel of incoming) {
  const dest = join(sbTheme, rel);
  mkdirSync(dirname(dest), { recursive: true });
  existing.has(rel) ? replaced++ : added++;
  copyFileSync(join(top, rel), dest);
}
ok(`${incoming.length} files from the archive: ${replaced} replaced, ${added} new`);
const stale = [...existing].filter((f) => !incoming.includes(f) && f !== "metadata.json");
if (stale.length) info(`${stale.length} file(s) stay from the old version (Millennium never deletes): ${stale.slice(0, 6).join(", ")}${stale.length > 6 ? ", …" : ""}`);
const forbidden = incoming.filter((f) => /^(metadata\.json|CLAUDE\.md|\.github\/|tests\/|tools\/)/.test(f));
forbidden.length ? bad(`archive carries files that should be export-ignored: ${forbidden.slice(0, 5).join(", ")}`) : ok("archive carries no dev-only files and no metadata.json");

step("5. write_metadata");
const owner = before.meta?.owner || before.skin.github?.owner, repo = before.meta?.repo || before.skin.github?.repo_name;
writeFileSync(join(sbTheme, "metadata.json"), JSON.stringify({ commit, owner, repo }, null, 4));
const after = { skin: readJson(join(sbTheme, "skin.json")), meta: readJson(join(sbTheme, "metadata.json")) };
ok(`metadata.json → ${owner}/${repo} @ ${commit.slice(0, 7)}`);
info(`version ${before.skin.version} → ${after.skin.version}`);
const g = after.skin.github || {};
(g.owner === owner && g.repo_name === repo) ? ok(`new skin.json github block = metadata (${g.owner}/${g.repo_name})`)
  : bad(`new skin.json github block ${g.owner}/${g.repo_name} ≠ metadata ${owner}/${repo} — Millennium checks by skin.json, updates by metadata`);

step("6. Settings pass (Millennium setup_conditionals over the sandbox config.json)");
if (haveConfig) {
  const cfg = readJson(sbConfig);
  const user = (cfg.themes?.conditions || {})[native] || {};
  const colors = (cfg.themes?.themeColors || {})[native] || {};
  const conds = after.skin.Conditions || {};
  let reset = 0, fresh = 0;
  for (const [name, c] of Object.entries(conds)) {
    const isSlider = c.slider && typeof c.slider === "object";
    const values = c.values && typeof c.values === "object" ? c.values : null;
    if (!isSlider && !(values && Object.keys(values).length)) continue;
    if (!(name in user) || typeof user[name] !== "string") { fresh++; continue; } // new setting → its default
    if (!isSlider && !(user[name] in values)) { reset++; bad(`"${name}" = "${user[name]}" no longer exists → Millennium resets it to "${c.default ?? Object.keys(values)[0]}"`); }
  }
  const gone = Object.keys(user).filter((n) => !(n in conds));
  if (!reset) ok(`all ${Object.keys(user).length - gone.length} saved settings of "${native}" keep their values`);
  if (fresh) info(`${fresh} new setting(s) start at their defaults`);
  if (gone.length) info(`${gone.length} saved setting(s) no longer in skin.json (kept in config, unused): ${gone.join(", ")}`);
  info(`${Object.keys(colors).length} saved colour(s) are kept (Millennium only fills missing ones)`);
} else info("skipped");

step("7. has_updates (after)");
after.meta.commit === commit ? ok("local == remote → the update disappears from Millennium → Updates") : bad("metadata does not match the installed commit — update loop");

finish();
function finish() {
  console.log(`\n${errors ? "FAILED" : "PASSED"} (${errors} problem(s)). Sandbox kept at ${out}`);
  process.exit(errors ? 1 : 0);
}
