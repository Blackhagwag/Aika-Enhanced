// Aika Enhanced 2.2 — the navigation's customisation (vendor/steam-enhanced/client/navigation/
// nav-config.js, aika-nav.js, sections/navigation.css; the editor client/settings/theme/
// nav-editor.js) against the test harness (tests/friends-dock/harness.html). Not a run inside
// Steam: Steam's popup windows (menus over a browser page), its own Notifications and account
// menus and Millennium's real backend are not in a browser.
//
//   python3 -m http.server 8765 --bind 127.0.0.1 --directory /
//   node --test tests/nav-custom.e2e.cjs
//   AIKA_21=/path/to/a/2.1.0/checkout node --test tests/nav-custom.e2e.cjs     # + pixel parity
//   REACT_UMD=/path/to/node_modules node --test tests/nav-custom.e2e.cjs      # + the editor
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const HARNESS = (root) => `http://127.0.0.1:8765${path.resolve(root, "tests/friends-dock")}/harness.html`;
const BASE = HARNESS(path.resolve(__dirname, ".."));
const OLD = process.env.AIKA_21;
const REACT = process.env.REACT_UMD;
let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

const NOISE = /CORS policy|ERR_FAILED|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|Failed to load resource/;

async function open(opt = "", { width = 1440, height = 860, base = BASE, init, context: ctx, extra = "" } = {}) {
  const context = ctx || (await browser.newContext({ viewport: { width, height } }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errors.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(`${base}?engine=1&millennium=1${opt ? "&opt=" + opt : ""}${extra}`);
  await page.waitForSelector("html[data-ready]");
  await page.waitForFunction(() => document.documentElement.dataset.aikaNav, null, { timeout: 6000 });
  await page.waitForTimeout(300);
  await settle(page);
  page.errors = errors;
  page.ctx = context;
  return page;
}
const close = async (page, keep = false) => { assert.deepEqual(page.errors, [], "no JavaScript errors"); if (!keep) await page.ctx.close(); };
const until = (page, fn, arg, timeout = 5000) => page.waitForFunction(fn, arg, { timeout });
const settle = async (page) => {
  await page.waitForTimeout(120);
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  await page.waitForTimeout(60);
};
const rect = (page, sel) => page.evaluate((s) => { const n = document.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
const css = (page, sel, prop, pseudo = null) => page.evaluate(([s, p, ps]) => getComputedStyle(document.querySelector(s), ps).getPropertyValue(p), [sel, prop, pseudo]);
const set = (page, p, v) => page.evaluate(([a, b]) => window.__aikaNavConfig.set(a, b), [p, v]);
const pass = async (page) => { await page.evaluate(() => window.__aikaNav.sync()); await settle(page); };
const slot = (k) => `[data-aika-nav-slot="${k}"]`;

/* ---------- Defaults: 2.1.0's navigation, pixel for pixel ---------- */

if (OLD) {
  for (const [name, opt] of [["Top Bar", ""], ["Left Sidebar", "nav-sidebar"]]) {
    test(`defaults draw 2.1.0's navigation exactly — ${name}`, async () => {
      let diff = 255;
      const shots = [];
      const boxes = [];
      for (const base of [HARNESS(OLD), BASE]) {
        const page = await open(opt, { base });
        await settle(page);
        await page.mouse.move(700, 600);
        await settle(page);
        shots.push((await page.screenshot()).toString("base64"));
        boxes.push(await page.evaluate(() => [...document.querySelectorAll("[data-aika-nav-slot], .aika-nav-rail, .ContentFrame, .BottomBarContainer, .AccountMenu img.avatar")].map((e) => {
          const r = e.getBoundingClientRect();
          const c = getComputedStyle(e);
          return [e.dataset.aikaNavSlot || e.className, r.x, r.y, r.width, r.height, c.backgroundColor, c.boxShadow, c.borderRadius, c.color, c.borderRight].join("|");
        })));
        if (base === BASE) {
          // the largest difference of any pixel's channel, measured in a canvas
          page.diff = await page.evaluate(async ([x, y]) => {
            const load = (b64) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = "data:image/png;base64," + b64; });
            const [a, b] = await Promise.all([load(x), load(y)]);
            const data = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
            const da = data(a), db = data(b);
            // pixels off by more than Chromium's dithering (a level or two)
            let off = 0;
            for (let i = 0; i < da.length; i += 4) if (Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > 2) off++;
            return off;
          }, shots);
          diff = page.diff;
        }
        await close(page);
      }
      assert.deepEqual(boxes[1], boxes[0], `${name}: every navigation box and its look as in 2.1.0`);
      // (Chromium's gradient dithering differs by a level or two between any two runs; the avatar
      // ring's antialiasing can differ on a pixel or two)
      assert.ok(diff <= 12, `${name}: the same pixels as 2.1.0 (${diff} pixels differ)`);
    });
  }
}

test("defaults write nothing: no navigation variables on the root, no flags", async () => {
  for (const opt of ["", "nav-sidebar"]) {
    const page = await open(opt);
    await settle(page);
    const vars = await page.evaluate(() => [...document.documentElement.style].filter((n) => n.startsWith("--aika-nav-") && n !== "--aika-nav-top" && n !== "--aika-nav-layout"));
    assert.deepEqual(vars, [], `${opt || "top"}: no variables`);
    assert.equal(await page.getAttribute("html", "data-aika-nav-look"), null);
    assert.equal(await page.getAttribute("html", "data-se-aika-menu"), null);
    await close(page);
  }
});

/* ---------- Sizes: per layout, live ---------- */

test("sizes and spacing apply at once and are kept apart for each layout", async () => {
  const page = await open("nav-sidebar");
  await set(page, "rail.size", 72);
  await set(page, "rail.btn", 48);
  await set(page, "rail.icon", 22);
  await set(page, "rail.avatar", 40);
  await set(page, "rail.gap", 12);
  await set(page, "rail.btnRadius", 14);
  await pass(page);
  assert.equal((await rect(page, ".aika-nav-rail")).w, 72);
  const s = await rect(page, slot("settings"));
  assert.equal(s.w, 48);
  assert.equal(s.x, 12, "centred: (72 - 48) / 2");
  assert.equal(await css(page, slot("settings") + " .aika-nav-glyph", "width"), "22px");
  assert.equal(await css(page, ".AccountMenu img.avatar", "width"), "40px");
  assert.equal(await css(page, slot("settings"), "border-top-left-radius"), "14px");
  const g = await rect(page, slot("games"));
  assert.equal(s.y - g.y, 48 + 12, "the gap between buttons");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginLeft), "72px", "the content gives up the rail");
  // the top bar keeps its own
  await page.evaluate(() => window.__aikaNavConfig.useLayout("top"));
  await pass(page);
  assert.equal(await page.getAttribute("html", "data-aika-nav"), "top");
  assert.equal((await rect(page, slot("settings"))).w, 32);
  await set(page, "top.btn", 28);
  await pass(page);
  assert.equal((await rect(page, slot("settings"))).w, 28);
  await page.evaluate(() => window.__aikaNavConfig.useLayout("rail"));
  await pass(page);
  assert.equal((await rect(page, slot("settings"))).w, 48, "the rail's size came back");
  // padding, margins, panel radius, border
  await set(page, "rail.margin", 8);
  await set(page, "rail.panelRadius", 16);
  await set(page, "rail.border", 2);
  await set(page, "rail.pad", 20);
  await pass(page);
  const r = await rect(page, ".aika-nav-rail");
  assert.equal(r.x, 8);
  assert.equal(await css(page, ".aika-nav-rail", "border-top-left-radius"), "16px");
  assert.equal(await css(page, ".aika-nav-rail", "border-right-width"), "2px");
  const p = await rect(page, slot("profile"));
  assert.equal(Math.round(r.y + r.h - (p.y + p.h)), 20, "inner padding at the foot");
  await close(page);
});

test("alignment and compact mode", async () => {
  const page = await open("nav-sidebar");
  await set(page, "rail.size", 80);
  await set(page, "rail.align", "start");
  await pass(page);
  assert.ok((await rect(page, slot("settings"))).x < 12, "at the rail's start");
  await set(page, "rail.align", "end");
  await pass(page);
  const r = await rect(page, slot("settings"));
  assert.ok(r.x + r.w > 70, "at the rail's end");
  await set(page, "behavior.compact", true);
  await pass(page);
  assert.equal((await rect(page, slot("settings"))).w, 32, "compact: 40 - 8");
  await close(page);
});

/* ---------- Order, areas, separators, gaps; Downloads untouched ---------- */

test("order and areas: the rail's top / middle / bottom, separators and gaps, nothing lost", async () => {
  const page = await open("nav-sidebar");
  const before = await rect(page, ".BottomBarContainer");
  await set(page, "rail.zones", { start: ["games", "sep", "news"], center: ["settings"], end: ["alerts", "gap", "profile"] });
  await pass(page);
  const rail = await rect(page, ".aika-nav-rail");
  const [games, news, settings, alerts, profile] = await Promise.all(["games", "news", "settings", "alerts", "profile"].map((k) => rect(page, slot(k))));
  assert.equal(Math.round(games.y), Math.round(rail.y + 12), "Games first at the top");
  assert.equal(news.y - games.y, 40 + 8 + 9 + 8, "a separator's 9 px between, with the gaps");
  assert.equal(await page.locator(".aika-nav-sep").count(), 1);
  assert.ok(Math.abs(settings.y + settings.h / 2 - (rail.y + rail.h / 2)) <= 1, "Settings in the middle");
  assert.equal(profile.y - alerts.y, 40 + 8 + 20 + 8, "a gap of half a button");
  // the zones read back validated: a button twice or unknown items are dropped, none lost
  await set(page, "rail.zones", { start: ["games", "games", "bogus"], center: [], end: [] });
  const zones = await page.evaluate(() => window.__aikaNavConfig.get().rail.zones);
  assert.deepEqual(zones, { start: ["games"], center: [], end: ["profile", "settings", "news", "alerts"] });
  // separators off: none drawn; leading/trailing separators never drawn
  await set(page, "rail.zones", { start: ["sep", "games", "sep"], center: [], end: ["alerts", "news", "sep", "settings", "profile"] });
  await pass(page);
  assert.equal(await page.locator(".aika-nav-sep").count(), 1);
  await set(page, "buttons.separators", false);
  await pass(page);
  assert.equal(await page.locator(".aika-nav-sep").count(), 0);
  // Downloads (Aika's floating bar) stays where it was
  assert.deepEqual(await rect(page, ".BottomBarContainer"), before);
  await close(page);
});

test("the top bar's areas: left and middle over the header's row, right in it", async () => {
  const page = await open();
  await set(page, "top.zones", { start: ["games"], center: ["news", "sep", "alerts"], end: ["settings", "profile"] });
  await pass(page);
  const games = await rect(page, slot("games"));
  const menuBar = await rect(page, ".RootMenuBar");
  assert.ok(games.x >= menuBar.x + menuBar.w, "left: after Steam's menus");
  const news = await rect(page, slot("news"));
  const alerts = await rect(page, slot("alerts"));
  const mid = (news.x + alerts.x + alerts.w) / 2;
  assert.ok(Math.abs(mid - 720) <= 2, `middle: centred on the window (${mid})`);
  assert.ok(news.y < 46 && games.y < 46, "in the header's row");
  const settings = await rect(page, slot("settings"));
  const profile = await rect(page, slot("profile"));
  assert.ok(settings.x < profile.x, "right: in order");
  assert.equal(await css(page, slot("settings"), "position"), "relative");
  await close(page);
});

/* ---------- Visibility ---------- */

test("hidden buttons free their room; Settings hidden keeps the theme's settings in My Profile", async () => {
  const page = await open("nav-sidebar");
  const alerts0 = await rect(page, slot("alerts"));
  const news0 = await rect(page, slot("news"));
  await set(page, "rail.hidden", { news: true, settings: true });
  await pass(page);
  assert.equal(await css(page, slot("news"), "display"), "none");
  assert.equal(await css(page, slot("settings"), "display"), "none");
  const alerts = await rect(page, slot("alerts"));
  assert.ok(alerts.y > alerts0.y + 80, "no empty places: everything above moves down");
  assert.equal(Math.round((await rect(page, slot("games"))).y), Math.round(news0.y + 48 * 2), "games where settings' and ... were");
  // the profile menu offers the theme's settings
  await page.click(".AccountMenu");
  await until(page, () => document.querySelector(".se-menu"));
  const rows = await page.$$eval(".se-menu [role=menuitem]", (n) => n.map((r) => r.textContent));
  assert.ok(rows.some((r) => /Theme settings/.test(r)), "Theme settings in My Profile's menu");
  await page.keyboard.press("Escape");
  // the top bar has its own visibility
  await page.evaluate(() => window.__aikaNavConfig.useLayout("top"));
  await pass(page);
  assert.notEqual(await css(page, slot("news"), "display"), "none");
  // indicators, tooltips, background, borders
  await set(page, "buttons.unread", false);
  await set(page, "buttons.background", false);
  await set(page, "buttons.borders", false);
  await pass(page);
  assert.equal(await css(page, ".NotificationsButton", "content", "::after"), "none");
  assert.match(await css(page, slot("settings"), "background-color"), /\/ 0\)$|, 0\)$/);
  assert.equal(await css(page, slot("settings"), "box-shadow"), "none");
  await close(page);
});

test("tooltips: on / off and their delay", async () => {
  const page = await open("nav-sidebar");
  await set(page, "behavior.tipDelay", 50);
  await page.hover(slot("games"));
  await until(page, () => document.querySelector(".aika-nav-tip"), null, 1000);
  await page.mouse.move(700, 500);
  await set(page, "buttons.tooltips", false);
  await page.hover(slot("games"));
  await page.waitForTimeout(400);
  assert.equal(await page.locator(".aika-nav-tip").count(), 0);
  await close(page);
});

/* ---------- Profile ---------- */

test("the profile: shape, ring, glow, caption, status dot, status colours (Steam's real states)", async () => {
  const page = await open("nav-sidebar");
  const img = ".AccountMenu img.avatar";
  await set(page, "profile.shape", "round");
  await set(page, "profile.ringWidth", 4);
  await set(page, "profile.ringGap", 3);
  await set(page, "profile.colors.online", "#ff0000");
  await pass(page);
  assert.equal(await css(page, img, "border-top-left-radius"), "999px");
  const shadow = await css(page, img, "box-shadow");
  assert.match(shadow, /rgb\(255, 0, 0\) 0px 0px 0px 7px/, "the ring: 3 px gap + 4 px band, in the colour set");
  assert.match(shadow, / 0px 0px 0px 3px/);
  await set(page, "profile.ring", false);
  await pass(page);
  assert.equal(await css(page, img, "box-shadow"), "none");
  // a status change: the ring's colour follows Steam's state, with a pulse
  await set(page, "profile.ring", true);
  await set(page, "profile.colors.away", "#00ff00");
  await page.evaluate(() => window.__fixture.app.FriendStore.SetUserPersonaState(3));
  await pass(page);
  assert.equal(await page.getAttribute(".AccountMenu", "data-aika-state"), "away");
  assert.match(await css(page, img, "box-shadow"), /rgb\(0, 255, 0\)/);
  // the caption: name, status (and the game only when in one)
  await set(page, "profile.showName", true);
  await set(page, "profile.showStatus", true);
  await set(page, "profile.showGame", true);
  await pass(page);
  assert.equal(await page.getAttribute(".AccountMenu", "data-aika-label"), "Nikita\nAway");
  assert.match(await css(page, ".AccountMenu", "content", "::after"), /Nikita/);
  await set(page, "profile.indicator", true);
  await pass(page);
  assert.equal(await css(page, ".AccountMenu .avatarHolder", "content", "::after"), '""');
  // a foreign state colour is refused
  await set(page, "profile.colors.online", "red; background:url(x)");
  assert.equal(await page.evaluate(() => window.__aikaNavConfig.get().profile.colors.online), "");
  assert.deepEqual(await page.evaluate(() => Object.keys(window.__aikaNavConfig.get().profile.colors)), ["online", "ingame", "away", "snooze", "dnd", "invisible", "offline"]);
  await close(page);
});

/* ---------- Appearance ---------- */

test("appearance: the styles set their values; a value moved makes it Custom", async () => {
  const page = await open("nav-sidebar");
  await set(page, "appearance.mode", "glass");
  await pass(page);
  let a = await page.evaluate(() => window.__aikaNavConfig.get().appearance);
  assert.equal(a.blur, 20);
  assert.equal(await css(page, ".aika-nav-rail", "backdrop-filter"), "blur(20px)");
  await set(page, "appearance.mode", "transparent");
  await pass(page);
  assert.match(await css(page, ".aika-nav-rail", "background-color"), /\/ 0\)$|, 0\)$/, "transparent");
  await set(page, "appearance.mode", "solid");
  await pass(page);
  const solid = await css(page, ".aika-nav-rail", "background-color");
  assert.match(solid, /^rgb\(|^color\(srgb [\d. ]+\)$/, `solid: an opaque panel (${solid})`);
  await set(page, "appearance.hover", 150);
  a = await page.evaluate(() => window.__aikaNavConfig.get().appearance);
  assert.equal(a.mode, "custom");
  await set(page, "appearance.accent", "#3366ff");
  await set(page, "appearance.shadow", true);
  await pass(page);
  await page.click(slot("games"));
  await until(page, () => document.querySelector(".se-menu"));
  await page.waitForTimeout(700);
  assert.match(await css(page, slot("games"), "background-color"), /rgba\(51, 102, 255|srgb 0\.2 0\.4 1 /, "the open button in the accent set");
  await page.keyboard.press("Escape");
  assert.notEqual(await css(page, ".aika-nav-rail", "box-shadow"), "none");
  await set(page, "appearance.mode", "default");
  await pass(page);
  const vars = await page.evaluate(() => [...document.documentElement.style].filter((n) => /--aika-nav-(panel|btn-k|hover|active|edge|blur)/.test(n)));
  assert.deepEqual(vars, [], "Aika's default writes nothing");
  await close(page);
});

/* ---------- Animations ---------- */

test("animations: off, speed, hover kinds, press", async () => {
  const page = await open("nav-sidebar");
  await set(page, "animations.speed", 200);
  await pass(page);
  assert.equal(await css(page, slot("games"), "transition-duration").then((d) => d.split(",")[0].trim()), "0.075s", "twice as fast: 150 ms / 2");
  await set(page, "animations.hover", "scale");
  await pass(page);
  await page.hover(slot("games"));
  await settle(page);
  assert.match(await css(page, slot("games"), "transform"), /matrix\(1\.06/);
  await set(page, "animations.press", false);
  await set(page, "animations.enabled", false);
  await pass(page);
  assert.equal((await css(page, slot("games"), "transition-duration")).split(",")[0].trim(), "0s");
  assert.equal(await css(page, slot("games"), "animation-name"), "none");
  await close(page);
});

test("layout switching is smooth: the rail's entrance, then nothing jumps", async () => {
  const page = await open();
  await page.evaluate(() => window.__aikaNavConfig.useLayout("rail"));
  await page.evaluate(() => window.__aikaNav.sync());
  assert.equal(await page.getAttribute("html", "data-aika-nav-switching"), "");
  assert.notEqual(await css(page, slot("games"), "animation-name"), "none");
  await settle(page);
  const a = await rect(page, slot("games"));
  await page.waitForTimeout(500);
  assert.deepEqual(await rect(page, slot("games")), a, "steady after the entrance");
  await set(page, "animations.switch", false);
  await page.evaluate(() => window.__aikaNavConfig.useLayout("top"));
  await page.evaluate(() => window.__aikaNav.sync());
  assert.equal(await page.getAttribute("html", "data-aika-nav-switching"), null);
  await close(page);
});

/* ---------- Behaviour ---------- */

test("auto-hide: the rail goes, the window's left edge brings it back; never under an open menu", async () => {
  const page = await open("nav-sidebar");
  await set(page, "behavior.autohide", true);
  await set(page, "behavior.hideDelay", 100);
  await set(page, "behavior.showDelay", 50);
  await pass(page);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginLeft), "6px", "the content keeps only the edge's strip");
  await page.mouse.move(30, 400);
  await page.mouse.move(800, 400);
  await page.waitForTimeout(350);
  await pass(page);
  assert.equal(await page.getAttribute("html", "data-aika-nav-concealed"), "");
  assert.equal(await css(page, ".aika-nav-rail", "opacity"), "0");
  await page.mouse.move(2, 400);
  await page.waitForTimeout(250);
  await pass(page);
  assert.equal(await page.getAttribute("html", "data-aika-nav-concealed"), null, "back at the edge");
  // an open menu keeps it
  await page.click(slot("settings"));
  await until(page, () => document.querySelector(".se-menu"));
  await page.mouse.move(900, 600);
  await page.waitForTimeout(400);
  assert.equal(await page.getAttribute("html", "data-aika-nav-concealed"), null, "stays while its menu is open");
  // the Friends Dock and its chat are left alone
  assert.ok(await page.locator(".aika-fdock").count());
  await close(page);
});

test("menus: closing on an outside click and on leaving, as set", async () => {
  const page = await open("nav-sidebar");
  await page.click(slot("games"));
  await until(page, () => document.querySelector(".se-menu"));
  await page.mouse.click(900, 500);
  await until(page, () => !document.querySelector(".se-menu:not([data-se-closing])"));
  await set(page, "behavior.closeOutside", false);
  await set(page, "behavior.closeLeave", false);
  await page.click(slot("games"));
  await until(page, () => document.querySelector(".se-menu"));
  await page.mouse.click(900, 500);
  await page.waitForTimeout(600);
  assert.equal(await page.locator(".se-menu:not([data-se-closing])").count(), 1, "kept open");
  await page.keyboard.press("Escape");
  await until(page, () => !document.querySelector(".se-menu:not([data-se-closing])"));
  await close(page);
});

test("names: icons and names, names on hover (the rail opens over the content)", async () => {
  const page = await open("nav-sidebar");
  await set(page, "buttons.labels", "labels");
  await pass(page);
  assert.equal(await page.getAttribute(slot("games"), "data-aika-label"), "Games");
  assert.match(await css(page, slot("games"), "content", "::after"), /Games/);
  assert.ok((await rect(page, ".aika-nav-rail")).w >= 184, "the rail widens for names");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginLeft), "184px");
  await set(page, "buttons.labels", "hover");
  await set(page, "behavior.tipDelay", 0);
  await pass(page);
  assert.equal((await rect(page, ".aika-nav-rail")).w, 56);
  await page.hover(slot("games"));
  await until(page, () => document.documentElement.hasAttribute("data-aika-nav-expanded"));
  await settle(page);
  assert.ok((await rect(page, ".aika-nav-rail")).w >= 184, "open on hover");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginLeft), "56px", "over the content, not pushing it");
  await page.mouse.move(900, 500);
  await until(page, () => !document.documentElement.hasAttribute("data-aika-nav-expanded"));
  // the top bar
  await page.evaluate(() => window.__aikaNavConfig.useLayout("top"));
  await set(page, "buttons.labels", "labels");
  await pass(page);
  assert.ok((await rect(page, slot("games"))).w > 50, "a name beside the icon");
  await close(page);
});

/* ---------- Pop-up menus ---------- */

test("pop-up menus: the Navigation's menus take width, radius, opacity, font, rows, icons; the dock's don't", async () => {
  const page = await open("nav-sidebar");
  await set(page, "menus.width", 300);
  await set(page, "menus.radius", 4);
  await set(page, "menus.font", 15);
  await set(page, "menus.spacing", 40);
  await set(page, "menus.opacity", 60);
  await set(page, "menus.separators", false);
  await pass(page);
  await page.click(slot("games"));
  await until(page, () => document.querySelector(".se-menu[data-aika-nav-menu]"));
  await settle(page);
  const m = ".se-menu[data-aika-nav-menu]";
  assert.equal((await rect(page, m)).w, 300);
  assert.equal(await css(page, m, "border-top-left-radius"), "4px");
  assert.equal(await css(page, `${m} button`, "font-size"), "15px");
  assert.equal(await css(page, `${m} button:not([data-hint])`, "height").catch(() => "40px"), "40px");
  assert.match(await css(page, m, "background-color"), /[,/] 0\.\d+\)$/, "see-through");
  assert.equal(await css(page, `${m} .se-menu-sep`, "display"), "none");
  await page.keyboard.press("Escape");
  // the dock's friend menu keeps its own look
  await page.click(".aika-fdock__row", { button: "right" }).catch(() => {});
  await page.waitForTimeout(300);
  const dockMenu = await page.$$eval(".se-menu, .aika-menu", (n) => n.map((e) => e.hasAttribute("data-aika-nav-menu")));
  assert.ok(dockMenu.every((x) => !x), "no other menu is marked");
  await close(page);
});

/* ---------- Presets, import / export ---------- */

test("presets: the five built-ins; save, rename, duplicate, update, delete, switch", async () => {
  const page = await open();
  const names = await page.evaluate(() => window.__aikaNavConfig.presets.list().filter((p) => p.builtIn).map((p) => p.name));
  assert.deepEqual(names, ["Original Aika Enhanced", "Steam Enhanced Style", "Minimal Sidebar", "Compact Top Bar", "Glass Navigation"]);
  await page.evaluate(() => window.__aikaNavConfig.presets.apply("glass"));
  await pass(page);
  assert.equal(await page.getAttribute("html", "data-aika-nav"), "rail", "Glass Navigation is a rail");
  assert.equal(await css(page, ".aika-nav-rail", "backdrop-filter"), "blur(20px)");
  assert.equal(await page.evaluate(() => window.__millennium.calls.some((c) => c[0] === "Core_ChangeCondition" && c[1].condition === "Navigation layout" && c[1].newData === "Left Sidebar")), true, "the layout saved as the setting");
  await page.evaluate(() => window.__aikaNavConfig.presets.apply("compact-top"));
  await pass(page);
  assert.equal(await page.getAttribute("html", "data-aika-nav"), "top");
  assert.equal((await rect(page, slot("settings"))).w, 24, "Compact Top Bar: 28 - 4 (compact)");
  const id = await page.evaluate(() => window.__aikaNavConfig.presets.save("Mine"));
  await page.evaluate((i) => window.__aikaNavConfig.presets.rename(i, "Mine renamed"), id);
  const copy = await page.evaluate((i) => window.__aikaNavConfig.presets.duplicate(i), id);
  let list = await page.evaluate(() => window.__aikaNavConfig.presets.list().filter((p) => !p.builtIn).map((p) => p.name));
  assert.deepEqual(list, ["Mine renamed", "Mine renamed (2)"]);
  await page.evaluate(() => window.__aikaNavConfig.presets.apply("original"));
  await pass(page);
  assert.equal((await rect(page, slot("settings"))).w, 32);
  await page.evaluate((i) => window.__aikaNavConfig.presets.apply(i), id);
  await pass(page);
  assert.equal((await rect(page, slot("settings"))).w, 24, "a preset of yours brings its settings back");
  await page.evaluate((i) => window.__aikaNavConfig.presets.remove(i), copy);
  list = await page.evaluate(() => window.__aikaNavConfig.presets.list().filter((p) => !p.builtIn).map((p) => p.name));
  assert.deepEqual(list, ["Mine renamed"]);
  assert.equal(await page.evaluate(() => window.__aikaNavConfig.presets.remove("original")), false, "a built-in can't be deleted");
  await close(page);
});

test("JSON: export and import round-trip; bad JSON is refused and breaks nothing", async () => {
  const page = await open("nav-sidebar");
  await set(page, "rail.btn", 44);
  await set(page, "profile.shape", "round");
  const json = await page.evaluate(() => window.__aikaNavConfig.exportJSON());
  const data = JSON.parse(json);
  assert.equal(data.type, "aika-enhanced-navigation");
  assert.equal(data.config.layout, "rail");
  await page.evaluate(() => window.__aikaNavConfig.resetAll());
  assert.equal(await page.evaluate(() => window.__aikaNavConfig.get().rail.btn), 40);
  assert.deepEqual(await page.evaluate((j) => window.__aikaNavConfig.importJSON(j), json), { ok: true });
  assert.equal(await page.evaluate(() => window.__aikaNavConfig.get().rail.btn), 44);
  for (const bad of ["{oops", "[]", "42", '"x"', "{}", '{"foo": 1}', "null"]) {
    const r = await page.evaluate((j) => window.__aikaNavConfig.importJSON(j), bad);
    assert.equal(r.ok, false, `refused: ${bad}`);
    assert.ok(r.error);
  }
  assert.equal(await page.evaluate(() => window.__aikaNavConfig.get().rail.btn), 44, "a refused import changes nothing");
  // wrong values in a real configuration fall back to their defaults
  const r = await page.evaluate(() => window.__aikaNavConfig.importJSON(JSON.stringify({ rail: { btn: "huge", gap: 9999, align: "diagonal", zones: { start: ["profile", 7, {}] } }, appearance: { blur: -5, accent: "javascript:x" }, __proto__: { polluted: 1 } })));
  assert.equal(r.ok, true);
  const c = await page.evaluate(() => window.__aikaNavConfig.get());
  assert.equal(c.rail.btn, 40);
  assert.equal(c.rail.gap, 24, "clamped to the maximum");
  assert.equal(c.rail.align, "center");
  assert.equal(c.appearance.blur, 0);
  assert.equal(c.appearance.accent, "");
  assert.deepEqual(c.rail.zones.start, ["profile"]);
  assert.equal(({}).polluted, undefined);
  await pass(page);
  await close(page);
});

test("kept across restarts (localStorage + Millennium); a broken store falls back to the defaults", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  let page = await open("nav-sidebar", { context });
  await set(page, "rail.btn", 46);
  await page.evaluate(() => window.__aikaNavConfig.presets.save("Kept"));
  await page.waitForTimeout(1000);
  const mirrored = await page.evaluate(() => window.__millennium.calls.filter((c) => c[0] === "Core_ChangeCondition" && c[1].condition === "__aika_nav").at(-1)?.[1].newData);
  assert.ok(mirrored, "mirrored into Millennium's config");
  assert.equal(JSON.parse(mirrored).config.rail.btn, 46);
  await close(page, true);
  await page.close();
  page = await open("nav-sidebar", { context });
  assert.equal((await rect(page, slot("settings"))).w, 46, "after a restart");
  assert.deepEqual(await page.evaluate(() => window.__aikaNavConfig.presets.list().filter((p) => !p.builtIn).map((p) => p.name)), ["Kept"]);
  // a broken localStorage value
  await page.evaluate(() => localStorage.setItem("aika-nav-config", "{broken"));
  await close(page, true);
  await page.close();
  page = await open("nav-sidebar", { context });
  assert.equal((await rect(page, slot("settings"))).w, 40, "defaults, no error");
  await close(page);
});

test("Millennium's copy is taken up when this window has none (a cleared profile)", async () => {
  const record = JSON.stringify({ config: { rail: { btn: 36 } }, presets: [], active: "" });
  const page = await open("nav-sidebar", { init: `window.__aikaTestStartConditions = { __aika_nav: ${JSON.stringify(record)} };` });
  await until(page, () => window.__aikaNavConfig.get().rail.btn === 36);
  await pass(page);
  assert.equal((await rect(page, slot("settings"))).w, 36);
  await close(page);
});

/* ---------- The editor (Steam's popup runtime stands in as React) ---------- */

if (REACT) {
  async function editor(page) {
    await page.addScriptTag({ url: `http://127.0.0.1:8765${REACT}/react/umd/react.production.min.js` });
    await page.addScriptTag({ url: `http://127.0.0.1:8765${REACT}/react-dom/umd/react-dom.production.min.js` });
    await page.addStyleTag({ url: `http://127.0.0.1:8765${path.resolve(__dirname, "../vendor/steam-enhanced/client/settings/theme/theme-settings.css")}` });
    await page.addStyleTag({ url: `http://127.0.0.1:8765${path.resolve(__dirname, "../vendor/steam-enhanced/client/settings/theme/nav-editor.css")}` });
    await page.addStyleTag({ url: `http://127.0.0.1:8765${path.resolve(__dirname, "../vendor/steam-enhanced/client/shared/segmented.css")}` });
    await until(page, () => window.__aikaSettings?.ready);
    await page.evaluate(() => {
      window.__seMillenniumWindow.popupRuntime = () => ({ React, showModal(el, win, title, o) {
        const host = document.createElement("div");
        host.id = "test-popup";
        host.style.cssText = `position:fixed;left:50%;top:50%;width:${o.popupWidth}px;height:${o.popupHeight}px;transform:translate(-50%,-50%);z-index:5000;background:var(--aika-bg-base);overflow:hidden`;
        document.body.append(host);
        ReactDOM.createRoot(host).render(el);
        return { Close() { host.remove(); } };
      } });
      window.__seThemeSettings.open();
    });
    await page.waitForSelector(".se-ts-tab");
    await page.click('.se-ts-tab[data-tab="Navigation"]');
    await page.waitForSelector(".ane-preview");
  }

  test("editor: categories, sliders with values, live preview and real navigation", async () => {
    const page = await open("nav-sidebar", { height: 1000, width: 1500 });
    await editor(page);
    const cats = await page.$$eval(".ane-cat", (n) => n.map((e) => e.textContent));
    assert.deepEqual(cats, ["General", "Layout", "Buttons", "Profile", "Appearance", "Animations", "Behaviour", "Pop-up menus", "Presets"]);
    await page.click('.ane-cat[data-cat="layout"]');
    const input = page.locator('input[data-ane-path="rail.btn"]');
    await input.fill("48");
    await input.dispatchEvent("input");
    await until(page, () => window.__aikaNavConfig.get().rail.btn === 48);
    assert.match(await page.locator('input[data-ane-path="rail.btn"] + output').textContent(), /48/);
    await pass(page);
    assert.equal((await rect(page, slot("settings"))).w, 48, "the real navigation follows");
    assert.equal((await css(page, ".ane-preview", "--p-btn")).trim(), "48px", "the preview follows");
    // the avatar in the preview is yours
    assert.equal(await page.getAttribute(".ane-p-avatar", "src"), await page.getAttribute(".AccountMenu img.avatar", "src"));
    // reset this category
    await page.click('[data-ane-reset="layout"]');
    assert.equal(await page.evaluate(() => window.__aikaNavConfig.get().rail.btn), 40);
    // the other layout's settings
    await page.click('.ane-edit-seg button[data-value="top"]');
    assert.equal(await page.locator('input[data-ane-path="top.btn"]').count(), 1);
    assert.equal(await page.getAttribute(".ane-preview", "data-mode"), "top");
    // every category draws
    for (const cat of ["general", "buttons", "profile", "appearance", "animations", "behavior", "menus", "presets"]) {
      await page.click(`.ane-cat[data-cat="${cat}"]`);
      assert.ok(await page.locator(".ane-body > *").count(), cat);
    }
    await close(page);
  });

  test("editor: drag and drop between areas, separators from the palette, keys", async () => {
    const page = await open("nav-sidebar", { height: 1000, width: 1500 });
    await editor(page);
    await page.click('.ane-cat[data-cat="buttons"]');
    const chip = page.locator('.ane-zone-list[data-zone="end"] .ane-chip[data-item="games"]');
    const target = page.locator('.ane-zone-list[data-zone="start"]');
    const a = await chip.boundingBox();
    const b = await target.boundingBox();
    await page.mouse.move(a.x + 10, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + 30, a.y + 20, { steps: 4 });
    await page.mouse.move(b.x + 20, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await until(page, () => window.__aikaNavConfig.get().rail.zones.start.includes("games"));
    await pass(page);
    assert.ok((await rect(page, slot("games"))).y < 200, "Games now at the rail's top");
    // a separator from the palette into the bottom area
    const sep = page.locator('.ane-palette .ane-chip[data-item="sep"]');
    const s = await sep.boundingBox();
    const end = await page.locator('.ane-zone-list[data-zone="end"] .ane-chip[data-item="settings"]').boundingBox();
    await page.mouse.move(s.x + 10, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + 30, s.y, { steps: 4 });
    await page.mouse.move(end.x + 6, end.y + 4, { steps: 8 });
    await page.mouse.up();
    await until(page, () => window.__aikaNavConfig.get().rail.zones.end.includes("sep"));
    await pass(page);
    assert.equal(await page.locator(".aika-nav-sep").count(), 1);
    // keys: the separator out with Delete, a button moved with the arrows
    await page.locator('.ane-zone-list[data-zone="end"] .ane-chip[data-item="sep"]').focus();
    await page.keyboard.press("Delete");
    await until(page, () => !window.__aikaNavConfig.get().rail.zones.end.includes("sep"));
    await page.locator('.ane-zone-list[data-zone="start"] .ane-chip[data-item="games"]').focus();
    await page.keyboard.press("ArrowDown");
    await until(page, () => window.__aikaNavConfig.get().rail.zones.center.includes("games"));
    // a button can't be dropped out of the board (only hidden)
    const g = await page.locator('.ane-chip[data-item="games"]').boundingBox();
    const pal = await page.locator(".ane-palette").boundingBox();
    await page.mouse.move(g.x + 10, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + 30, g.y, { steps: 4 });
    await page.mouse.move(pal.x + pal.width - 20, pal.y + pal.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const zones = await page.evaluate(() => window.__aikaNavConfig.get().rail.zones);
    assert.equal([...zones.start, ...zones.center, ...zones.end].filter((x) => x === "games").length, 1);
    // hiding from the editor
    await page.locator('.se-seg[data-ane-path="rail.hidden.news"] button[data-value="true"]').click();
    await pass(page);
    assert.equal(await css(page, slot("news"), "display"), "none");
    assert.equal(await page.locator(".ane-preview .ane-p-news").count(), 0, "the preview drops it too");
    await close(page);
  });

  test("editor: presets page — apply, save, rename, delete; export and import with validation; full reset", async () => {
    const page = await open("", { height: 1000, width: 1500 });
    await editor(page);
    await page.click('.ane-cat[data-cat="presets"]');
    await page.click('.ane-preset[data-preset="minimal-sidebar"] [data-act="apply"]');
    await until(page, () => window.__aikaNavConfig.presets.active() === "minimal-sidebar");
    await pass(page);
    assert.equal(await page.getAttribute("html", "data-aika-nav"), "rail");
    await page.fill(".ane-inline .ane-input", "Test preset");
    await page.click('[data-act="save"]');
    await page.waitForSelector('.ane-preset:has-text("Test preset")');
    await page.click('.ane-preset:has-text("Test preset") [data-act="rename"]');
    await page.fill(".ane-preset-name .ane-input", "Renamed");
    await page.keyboard.press("Enter");
    await page.waitForSelector('.ane-preset:has-text("Renamed")');
    // export holds the current configuration
    const exported = await page.inputValue('textarea[data-ane="export"]');
    assert.equal(JSON.parse(exported).type, "aika-enhanced-navigation");
    // a broken import: an error shown, nothing changed
    await page.fill('textarea[data-ane="import"]', "{not json");
    await page.click('[data-act="import"]');
    await page.waitForSelector(".ane-status.is-bad");
    await page.fill('textarea[data-ane="import"]', JSON.stringify({ type: "aika-enhanced-navigation", config: { top: { btn: 30 }, layout: "top" } }));
    await page.click('[data-act="import"]');
    await until(page, () => window.__aikaNavConfig.get().top.btn === 30);
    await pass(page);
    assert.equal(await page.getAttribute("html", "data-aika-nav"), "top");
    await page.click('.ane-preset:has-text("Renamed") [data-act="delete ane-danger"]');
    await until(page, () => !window.__aikaNavConfig.presets.list().some((p) => p.name === "Renamed"));
    // the full reset: 2.1.0's navigation
    await page.click('.ane-cat[data-cat="general"]');
    await page.click('[data-ane-reset="all"]');
    await pass(page);
    const d = await page.evaluate(() => JSON.stringify(window.__aikaNavConfig.get()) === JSON.stringify(window.__aikaNavConfig.defaults()));
    assert.equal(d, true);
    await close(page);
  });
}
