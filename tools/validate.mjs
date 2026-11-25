#!/usr/bin/env node
// Aika Enhanced — project checks. One script for local runs, the release script and GitHub Actions.
//
//   node tools/validate.mjs                      all checks
//   node tools/validate.mjs --tag v2.0.1         also: the tag equals skin.json's version
//   node tools/validate.mjs --base v2.0.0        settings compatibility against that ref
//                                                (default: the newest v* tag, if any)
//   node tools/validate.mjs --repo Owner/Name    skin.json's github block must match it exactly
//                                                (default: $GITHUB_REPOSITORY in Actions)
//
// Exit code 0 = everything passed, 1 = at least one error. Warnings never fail.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

let errors = 0, warnings = 0;
const err = (m) => { errors++; console.log(`  ✗ ${m}`); };
const warn = (m) => { warnings++; console.log(`  ! ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);
const section = (m) => console.log(`\n${m}`);
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

let tracked;
try { tracked = git("ls-files", "-z").split("\0").filter(Boolean); }
catch { console.error("Run inside the Aika Enhanced git repository."); process.exit(1); }
// Files staged for deletion are still listed by ls-files until committed; keep only files on disk.
tracked = tracked.filter((f) => existsSync(join(ROOT, f)));

// ── 1. Required files ─────────────────────────────────────────────────────────
section("Required files");
const REQUIRED = [
  "skin.json", "README.md", "CHANGELOG.md", "CLAUDE.md",
  "LICENSES/README.md", "LICENSES/Steam-Enhanced-MIT.txt", "vendor/steam-enhanced/LICENSE",
  "root-colors.css", "webkit.css", "main.css",
];
for (const f of REQUIRED) existsSync(join(ROOT, f)) ? ok(f) : err(`missing ${f}`);

// ── 2. Files that must never be committed ────────────────────────────────────
section("Confidential / machine-specific files");
const FORBIDDEN = [
  [/^metadata\.json$/, "metadata.json is written by Millennium on install/update; committing it breaks update detection"],
  [/(^|\/)\.env(\..*)?$/, "environment file"],
  [/\.(pem|key|p12|pfx)$/i, "key/certificate"],
  [/(^|\/)(config\.json|loginusers\.vdf|config\.vdf|localconfig\.vdf)$/i, "Steam/Millennium config"],
  [/(^|\/)userdata\//i, "Steam userdata"],
  [/(^|\/)\.claude\//, "local Claude Code settings"],
];
let forbiddenHit = false;
for (const f of tracked) for (const [re, why] of FORBIDDEN) if (re.test(f)) { err(`${f}: ${why}`); forbiddenHit = true; }
const SECRET = [
  [/ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|gho_[A-Za-z0-9]{30,}/, "GitHub token"],
  [/AKIA[0-9A-Z]{16}/, "AWS key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, "Slack token"],
];
for (const f of tracked) {
  if (/\.(jpg|jpeg|png|gif|ttf|woff2?|webp|ico)$/i.test(f)) continue;
  let text; try { text = readFileSync(join(ROOT, f), "utf8"); } catch { continue; }
  for (const [re, what] of SECRET) if (re.test(text)) { err(`${f}: looks like a ${what}`); forbiddenHit = true; }
}
if (!forbiddenHit) ok("none tracked");

// ── 3. JSON ──────────────────────────────────────────────────────────────────
section("JSON");
let skin = null;
for (const f of tracked.filter((f) => f.endsWith(".json"))) {
  try {
    const data = JSON.parse(readFileSync(join(ROOT, f), "utf8").replace(/^﻿/, ""));
    if (f === "skin.json") skin = data;
    ok(f);
  } catch (e) { err(`${f}: ${e.message}`); }
}
if (!skin) { err("skin.json could not be read — stopping"); finish(); }

// ── 4. skin.json ─────────────────────────────────────────────────────────────
section("skin.json");
for (const k of ["name", "author", "description", "version"]) typeof skin[k] === "string" && skin[k] ? ok(k) : err(`"${k}" missing`);
SEMVER.test(skin.version || "") ? ok(`version ${skin.version} is MAJOR.MINOR.PATCH`) : err(`version "${skin.version}" is not MAJOR.MINOR.PATCH`);
const gh = skin.github || {};
gh.owner && gh.repo_name ? ok(`github ${gh.owner}/${gh.repo_name}`) : err(`"github": { "owner", "repo_name" } missing — Millennium cannot check updates without it`);
const repo = opt("--repo") || process.env.GITHUB_REPOSITORY;
if (repo && gh.owner) {
  // Millennium matches steambrew's answer by the exact repository name (case-sensitive),
  // and steambrew matches owner/repo against its database exactly as written.
  `${gh.owner}/${gh.repo_name}` === repo ? ok(`github block matches ${repo} exactly (case included)`)
    : err(`github block is ${gh.owner}/${gh.repo_name} but the repository is ${repo} — must match exactly, case included`);
}
for (const k of ["header_image", "splash_image"]) /^https:\/\//.test(skin[k] || "") ? ok(`${k} is https`) : err(`${k} must be an https image URL (ThemeDatabase requires it)`);

// Every file skin.json points to must exist (a missing file silently drops a setting or a window).
const refs = new Set();
(function walk(v, key) {
  if (typeof v === "string") { if (/^(src|TargetCss|TargetJs|RootColors|Steam-WebKit)$/.test(key) && !/^https?:/.test(v)) refs.add(v); return; }
  if (Array.isArray(v)) return v.forEach((x) => walk(x, key));
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
})(skin, "");
const missingRefs = [...refs].filter((r) => !existsSync(join(ROOT, r)));
missingRefs.length ? missingRefs.forEach((r) => err(`skin.json points to missing file ${r}`)) : ok(`all ${refs.size} files skin.json points to exist`);

// ── 5. Version is the same everywhere ────────────────────────────────────────
section("Version sync");
const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
const heads = [...changelog.matchAll(/^## (\S+)/gm)].map((m) => m[1]);
const firstRelease = heads.find((h) => h.toLowerCase() !== "unreleased");
firstRelease === skin.version ? ok(`CHANGELOG.md newest release is ${skin.version}`)
  : err(`CHANGELOG.md newest release heading is "${firstRelease}", skin.json says ${skin.version}`);
const readme = readFileSync(join(ROOT, "README.md"), "utf8");
readme.includes(`· ${skin.version}`) ? ok(`README.md shows ${skin.version}`) : err(`README.md header does not show "· ${skin.version}"`);
const tag = opt("--tag");
if (tag) tag === `v${skin.version}` ? ok(`tag ${tag} matches`) : err(`tag ${tag} does not match skin.json version ${skin.version} (expected v${skin.version})`);

// ── 6. Settings compatibility with the last release ─────────────────────────
// Millennium keeps user settings in its own config.json keyed by the theme folder, the
// condition name and the value label. A renamed/removed condition or value resets that
// setting to its default on the next start — so they may only be added, never removed.
section("Settings compatibility");
let base = opt("--base");
if (!base) { try { base = git("describe", "--tags", "--abbrev=0", "--match", "v*", "HEAD^"); } catch { try { base = git("describe", "--tags", "--abbrev=0", "--match", "v*"); } catch {} } }
if (base === `v${skin.version}` && !opt("--base")) { try { base = git("describe", "--tags", "--abbrev=0", "--match", "v*", `${base}^`); } catch { base = undefined; } }
if (!base) warn("no earlier v* tag — nothing to compare against");
else {
  let old = null;
  try { old = JSON.parse(git("show", `${base}:skin.json`)); } catch (e) { warn(`cannot read skin.json at ${base}: ${e.message.split("\n")[0]}`); }
  if (old) {
    let broken = 0;
    for (const [name, c] of Object.entries(old.Conditions || {})) {
      const n = (skin.Conditions || {})[name];
      if (!n) { err(`setting "${name}" (in ${base}) was removed or renamed — users' value would be lost`); broken++; continue; }
      if (c.slider && !n.slider) { err(`setting "${name}" was a slider in ${base} and is not one now`); broken++; }
      for (const v of Object.keys(c.values || {})) {
        if (!n.values || !(v in n.values)) { err(`value "${v}" of "${name}" (in ${base}) was removed or renamed — users who chose it would be reset`); broken++; }
      }
    }
    if (!broken) ok(`every setting and value of ${base} still exists (${Object.keys(old.Conditions || {}).length} settings)`);
    if (old.github && (old.github.owner !== gh.owner || old.github.repo_name !== gh.repo_name))
      warn(`github block changed since ${base} (${old.github.owner}/${old.github.repo_name} → ${gh.owner}/${gh.repo_name}); installed copies keep checking the old name`);
  }
}

// ── 7. JavaScript syntax ─────────────────────────────────────────────────────
section("JavaScript syntax (node --check)");
const jsFiles = tracked.filter((f) => /\.(js|cjs|mjs)$/.test(f));
let jsBad = 0;
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ["--check", join(ROOT, f)], { encoding: "utf8" });
  if (r.status !== 0) { jsBad++; err(`${f}\n${(r.stderr || "").split("\n").slice(0, 5).map((l) => "      " + l).join("\n")}`); }
}
if (!jsBad) ok(`${jsFiles.length} files parse`);

finish();

function finish() {
  console.log(`\n${errors ? "FAILED" : "PASSED"}: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors ? 1 : 0);
}
