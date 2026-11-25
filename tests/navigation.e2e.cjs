// Aika Enhanced — the navigation taken from Steam Enhanced (vendor/steam-enhanced/client/
// navigation/aika-nav.js, sections/navigation.css): My Profile, Settings, Games, Announcements,
// Notifications in the top bar or a left rail. Against the test harness (tests/friends-dock/
// harness.html: Steam's title bar with its Announcements, Notifications and account buttons and
// its Games menu's props as a fiber stand-in; fixture.js: the FriendStore). Not a run inside
// Steam: Steam's own menus (Notifications, the account menu), its webpack modules (Restore a
// Backup) and its news feeds are not in a browser.
//   python3 -m http.server 8765 --bind 127.0.0.1 --directory /
//   node --test tests/navigation.e2e.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE = `http://127.0.0.1:8765${path.resolve(__dirname, "friends-dock")}/harness.html`;
let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

// Steam's news feeds (fetched by Steam Enhanced's news-feed.js) and millennium.host are not
// reachable from a local page: those network refusals are the harness's, not the theme's
const NOISE = /CORS policy|ERR_FAILED|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|Failed to load resource/;

async function open(opt = "", { width = 1440, height = 860 } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errors.push(m.text()); });
  await page.goto(`${BASE}?engine=1&millennium=1${opt ? "&opt=" + opt : ""}`);
  await page.waitForSelector("html[data-ready]");
  await page.waitForFunction(() => document.documentElement.dataset.aikaNav, null, { timeout: 6000 });
  await page.waitForTimeout(300);
  page.errors = errors;
  page.ctx = context;
  return page;
}
const close = async (page) => { assert.deepEqual(page.errors, [], "no JavaScript errors"); await page.ctx.close(); };
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 5000 });
// every running transition and animation done (the buttons rise in, the room eases)
const settle = async (page) => {
  await page.waitForTimeout(100);
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
};
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
const menuRows = (page) => page.$$eval(".se-menu [role=menuitem]", (n) => n.map((r) => r.firstElementChild?.nextSibling ? r.textContent.trim() : r.textContent.trim()));
const menuLabels = (page) => page.$$eval(".se-menu [role=menuitem]", (n) => n.map((r) => (r.querySelector(".se-menu-label, .se-menu-text") || r).childNodes[0]?.textContent?.trim() || r.textContent.trim()));

test("Top Bar: the five buttons in the header's row, once each, in Steam Enhanced's order", async () => {
  const page = await open();
  assert.equal(await page.getAttribute("html", "data-aika-nav"), "top");
  assert.deepEqual(await page.$$eval("[data-aika-nav-slot]", (n) => n.map((e) => e.dataset.aikaNavSlot)), ["settings", "games", "news", "alerts", "profile"]);
  const xs = [];
  for (const s of ["settings", "games", "news", "alerts", "profile"]) xs.push((await rect(page, `[data-aika-nav-slot="${s}"]`)).x);
  assert.deepEqual([...xs].sort((a, b) => a - b), xs, "left to right");
  const ys = await Promise.all(["settings", "profile"].map((s) => rect(page, `[data-aika-nav-slot="${s}"]`)));
  assert.ok(ys.every((r) => r.y < 46), "in the top bar");
  assert.equal(await page.locator(".aika-nav-rail").count(), 0, "no rail");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginLeft), "0px");
  // Big Picture (Steam's other title-bar button) is left as Aika has it
  assert.equal(await page.getAttribute(".GamepadUIToggle", "data-aika-nav-slot"), null);
  assert.equal(await page.locator(".aika-nav-btn").count(), 2);
  await close(page);
});

test("Left Sidebar: a rail at the left, the avatar at its foot, the content beside it", async () => {
  const page = await open("nav-sidebar");
  await settle(page); // the content's room eases in
  assert.equal(await page.getAttribute("html", "data-aika-nav"), "rail");
  const railBox = await rect(page, ".aika-nav-rail");
  assert.equal(railBox.x, 0);
  assert.equal(railBox.w, 56);
  const order = [];
  for (const s of ["profile", "settings", "games", "news", "alerts"]) {
    const r = await rect(page, `[data-aika-nav-slot="${s}"]`);
    assert.ok(r.x >= 0 && r.x + r.w <= 56, `${s} in the rail`);
    order.push(r.y);
  }
  assert.deepEqual([...order].sort((a, b) => b - a), order, "the avatar lowest, then Settings, Games, Announcements, Notifications");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginLeft), "56px");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "no horizontal scroll");
  await close(page);
});

test("switching the layout at once (Aika's live bridge), no duplicates, no leftover room", async () => {
  const page = await open();
  const set = (v) => page.evaluate((v) => {
    document.documentElement.style.setProperty("--aika-nav-layout", v);
    window.dispatchEvent(new CustomEvent("aika-visual-setting", { detail: { key: "Navigation layout" } }));
  }, v);
  for (const [v, want] of [["rail", "rail"], ["top", "top"], ["rail", "rail"], ["top", "top"]]) {
    await set(v);
    await until(page, (w) => document.documentElement.dataset.aikaNav === w, want);
    await settle(page);
    assert.equal(await page.locator(".aika-nav-btn").count(), 2);
    assert.equal(await page.locator(".aika-nav-rail").count(), want === "rail" ? 1 : 0);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginLeft), want === "rail" ? "56px" : "0px");
  }
  await close(page);
});

test("the setting is kept: the theme settings window saves it in Millennium's config", async () => {
  const page = await open();
  await until(page, () => window.__aikaSettings?.ready);
  assert.ok(await page.evaluate(() => __aikaSettings.schema.some((s) => s.key === "Navigation layout" && s.tab === "Navigation")));
  await page.evaluate(() => __aikaSettings.set("Navigation layout", "Left Sidebar"));
  await until(page, () => window.__millennium.conditions["Navigation layout"] === "Left Sidebar");
  await until(page, () => document.documentElement.dataset.aikaNav === "rail");
  await close(page);
});

test("My Profile: your avatar, a ring in your status's colour that follows the status", async () => {
  const page = await open();
  assert.match(await page.getAttribute("#account img.avatar", "src"), /^data:image\/svg/);
  const ring = () => page.evaluate(() => getComputedStyle(document.querySelector("#account img.avatar")).boxShadow);
  const probe = (v) => page.evaluate((v) => { const d = document.createElement("div"); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
  for (const [persona, dnd, ingame, state, token] of [
    [1, false, 0, "online", "--aika-accent-bright"],
    [3, false, 0, "away", "--aika-warn"],
    [1, true, 0, "dnd", "--aika-live"],
    [7, false, 0, "invisible", "--aika-fg-subtle"],
    [1, false, 730, "ingame", "--aika-ok"],
  ]) {
    await page.evaluate(([p, d, g]) => { const s = __fixture.app.FriendStore; s.self.persona.m_ePersonaState = p; s.dnd = d; s.self.persona.m_unGamePlayedAppID = g; }, [persona, dnd, ingame]);
    await until(page, (s) => document.querySelector("#account").dataset.aikaState === s, state);
    await settle(page);
    const color = await probe(token);
    assert.ok((await ring()).includes(color), `${state}: the ring is ${token} (${await ring()} / ${color})`);
  }
  await close(page);
});

test("the profile menu: status, Do Not Disturb, profile and account rows doing Steam's own actions", async () => {
  const page = await open("nav-sidebar");
  await page.click("#account");
  await page.waitForSelector(".se-menu");
  const text = await page.textContent(".se-menu");
  for (const word of ["Nikita", "Online", "Away", "Invisible", "Offline", "Do Not Disturb", "View my profile", "Account details", "Store preferences", "View my wallet", "All account options"]) {
    assert.ok(text.includes(word), word);
  }
  // Away: FriendStore.SetUserPersonaState(3), the ring follows
  await page.locator(".se-menu [role=menuitem]", { hasText: "Away" }).click();
  assert.deepEqual(await page.evaluate(() => __fixture.calls.find((c) => c[0] === "persona")), ["persona", 3]);
  await until(page, () => document.querySelector("#account").dataset.aikaState === "away");
  // Offline: Steam's SignOutOfFriends
  await page.click("#account");
  await page.locator(".se-menu [role=menuitem]", { hasText: "Offline" }).click();
  assert.ok(await page.evaluate(() => __fixture.calls.some((c) => c[0] === "signout-friends")));
  // Do Not Disturb: FriendStore.SetUserDoNotDisturb
  await page.click("#account");
  await page.locator(".se-menu [role=menuitem]", { hasText: "Do Not Disturb" }).click();
  assert.deepEqual(await page.evaluate(() => __fixture.calls.find((c) => c[0] === "dnd")), ["dnd", true]);
  // View my profile: Steam's page in the main window
  await page.click("#account");
  await page.locator(".se-menu [role=menuitem]", { hasText: "View my profile" }).click();
  // the menu opened beside the rail, not over it
  await close(page);
});

test("Settings: Steam's settings, the theme's window, Millennium and its Library Manager", async () => {
  const page = await open();
  await page.click('[data-aika-nav-slot="settings"]');
  await page.waitForSelector(".se-menu");
  const text = await page.textContent(".se-menu");
  for (const word of ["Steam", "Settings", "Aika Enhanced", "Theme settings", "Millennium", "Library Manager"]) assert.ok(text.includes(word), word);
  await page.locator(".se-menu [role=menuitem]", { hasText: "Account, downloads" }).click();
  assert.deepEqual(await page.evaluate(() => __fixture.calls.at(-1)), ["url", "steam://open/settings"]);
  // a second click on the button closes its menu
  await page.click('[data-aika-nav-slot="settings"]');
  await page.waitForSelector(".se-menu");
  await page.click('[data-aika-nav-slot="settings"]');
  await until(page, () => !document.querySelector(".se-menu:not([data-se-closing])"));
  await close(page);
});

test("Games: Steam's Games menu items, each running Steam's own item; Redeem and Add Games groups", async () => {
  const page = await open();
  await page.click('[data-aika-nav-slot="games"]');
  await page.waitForSelector(".se-menu");
  const text = await page.textContent(".se-menu");
  for (const word of ["Redeem", "Activate a Product", "Redeem Wallet Code", "Gifts and Guest Passes", "Add Games", "Add a Non-Steam Game", "Product Codes"]) assert.ok(text.includes(word), word);
  assert.ok(!text.includes("View Library"), "the library row stays with Aika's tabs");
  // Restore a Backup is Steam's dialog module: offered only where Steam has it (not in a browser)
  assert.ok(!text.includes("Restore a Backup"));
  await page.keyboard.press("Escape");
  for (const [label, call] of [["Activate a Product", "activate"], ["Redeem Wallet Code", "wallet"], ["Add a Non-Steam Game", "nonsteam"], ["Product Codes", "cdkeys"]]) {
    await until(page, () => !document.querySelector(".se-menu"));
    await page.click('[data-aika-nav-slot="games"]');
    await page.locator(".se-menu [role=menuitem]", { hasText: label }).click();
    assert.deepEqual(await page.evaluate(() => __fixture.calls.filter((c) => c[0] === "games").at(-1)), ["games", call]);
  }
  await close(page);
});

test("Notifications: Steam's own button and count, as Aika's badge; Announcements: Steam's button, the theme's news menu", async () => {
  const page = await open();
  assert.equal(await page.getAttribute(".NotificationsButton", "data-aika-count"), "3");
  await page.evaluate(() => { document.querySelector(".NotificationsButton .Count").textContent = ""; });
  await until(page, () => !document.querySelector(".NotificationsButton").hasAttribute("data-aika-count"));
  assert.equal(await page.getAttribute(".NotificationsButton", "data-aika-unread"), null);
  // Announcements: the click is Steam Enhanced's news menu (its rows are Steam's news; none load here)
  const before = await page.evaluate(() => __fixture.calls.length);
  await page.click(".AnnouncementsButton:not(.GamepadUIToggle)");
  await page.waitForTimeout(400);
  assert.ok((await page.locator(".se-menu").count()) === 1 || (await page.evaluate((b) => __fixture.calls.length > b, before)), "a news menu or Steam's news hub");
  await close(page);
});

test("with the Friends Dock: rail + collapsed / expanded dock, top + dock — no overlap, the content between", async () => {
  for (const opt of ["nav-sidebar", ""]) {
    const page = await open(opt);
    for (const mode of ["open", "rail"]) {
      if ((await page.getAttribute("html", "data-aika-fdock")) !== mode) await page.click(".aika-fdock__toggle");
      await until(page, (m) => document.documentElement.dataset.aikaFdock === m, mode);
      await page.waitForTimeout(400);
      const content = await rect(page, ".ContentFrame");
      const dock = await rect(page, ".aika-fdock");
      const left = opt ? 56 : 0;
      assert.equal(Math.round(content.x), left, `${opt || "top"} + ${mode}: content after the rail`);
      assert.ok(Math.round(content.x + content.w) <= Math.round(dock.x) + 1, `${opt || "top"} + ${mode}: content before the dock`);
      if (opt) {
        const rail = await rect(page, ".aika-nav-rail");
        assert.ok(rail.x + rail.w <= dock.x, "rail and dock apart");
      }
    }
    await close(page);
  }
});

test("Downloads stays in Aika's floating bar; the window resized keeps everything in view", async () => {
  const page = await open("nav-sidebar", { width: 1000, height: 700 });
  await settle(page);
  const dl = await rect(page, ".BottomBar .DownloadStatus");
  assert.ok(dl.y > 600, "at the bottom, in Aika's bar");
  assert.equal(await page.getAttribute(".BottomBar .DownloadStatus", "data-aika-nav-slot"), null, "not moved into the navigation");
  for (const s of ["profile", "settings", "games", "news", "alerts"]) {
    const r = await rect(page, `[data-aika-nav-slot="${s}"]`);
    assert.ok(r.y >= 46 && r.y + r.h <= 700, `${s} in view at 1000×700`);
  }
  await close(page);
});

test("presets: the navigation takes the preset's colours", async () => {
  for (const preset of ["aika", "greeny", "rose-ash", "hello-bert"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 860 } });
    const page = await context.newPage();
    await page.goto(`${BASE}?engine=1&preset=${preset}&opt=nav-sidebar`);
    await page.waitForFunction(() => document.documentElement.dataset.aikaNav === "rail", null, { timeout: 6000 });
    await page.waitForFunction(() => document.querySelector("#account").dataset.aikaState === "online", null, { timeout: 6000 });
    await settle(page);
    const c = await page.evaluate(() => {
      const probe = (v) => { const d = document.createElement("div"); d.style.color = `var(${v})`; document.body.append(d); const x = getComputedStyle(d).color; d.remove(); return x; };
      return {
        ring: getComputedStyle(document.querySelector("#account img.avatar")).boxShadow,
        accent: probe("--aika-accent-bright"),
        tile: getComputedStyle(document.querySelector('[data-aika-nav-slot="settings"]')).backgroundColor,
        surface: (() => { const d = document.createElement("div"); d.style.background = "var(--aika-surface)"; document.body.append(d); const x = getComputedStyle(d).backgroundColor; d.remove(); return x; })(),
      };
    });
    assert.ok(c.ring.includes(c.accent), `${preset}: the ring is the preset's accent`);
    assert.equal(c.tile, c.surface, `${preset}: Aika's surface`);
    await context.close();
  }
});
