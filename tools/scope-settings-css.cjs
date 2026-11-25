// Scopes Steam Enhanced's settings stylesheets (vendor/steam-enhanced/client/settings/*.css) to
// Millennium's settings window. Steam Enhanced restyles Steam Settings, Game Properties and
// Millennium Settings from the same files; Aika Enhanced takes over only Millennium's (Aika styles
// Steam Settings and Game Properties itself, sections/settings.css), so every rule gets
// html[data-se-mill] (set by client/settings/dialog/main.js on Millennium's window).
// Idempotent. Needs postcss (npm i postcss; run with NODE_PATH pointing at it).
//   NODE_PATH=/path/to/node_modules node tools/scope-settings-css.cjs
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");
const dir = path.resolve(__dirname, "../vendor/steam-enhanced/client/settings");
const FILES = ["layout.css", "controls.css", "pages.css", "storage.css", "search.css", "spacing.css"];
const MARK = "[data-se-mill]";
const scope = (sel) => {
  sel = sel.trim();
  if (sel.includes(MARK)) return sel;
  let m;
  if ((m = /^(html|:root)((?:\[[^\]]*\]|:[\w-]+(?:\([^)]*\))?)*)(?=$|[\s>+~])/.exec(sel))) {
    return m[1] + MARK + sel.slice(m[1].length);
  }
  return `html${MARK} ${sel}`;
};
let total = 0;
for (const file of FILES) {
  const p = path.join(dir, file);
  const ast = postcss.parse(fs.readFileSync(p, "utf8"));
  ast.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    rule.selectors = rule.selectors.map(scope);
    total++;
  });
  let css = ast.toString();
  const note = "/* Aika Enhanced: every rule scoped to Millennium's settings window (html[data-se-mill]) by tools/scope-settings-css.cjs. */\n";
  if (!css.startsWith(note)) css = note + css;
  fs.writeFileSync(p, css);
}
console.log("scoped", total, "rules in", FILES.length, "files");
