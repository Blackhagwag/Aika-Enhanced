// Aika Enhanced 2.3 — the Friends Dock on Store / Community pages, against the test harness.
//
// A Store or Community page is Steam's native browser view over the main window: nothing of the
// window's DOM draws above it, and Steam lays it out in the content frame when it lays the frame
// out for its own reasons (the page shown, the window resized), not as the frame's margin eases.
// The harness stands in for that view with an element over the content frame's box, laid out the
// same way: when it appears and on every window `resize` event, never on its own. That is how the
// dock was failing (expanded under the page, cut off at the page's edge), and what the fix answers
// (js/friends-dock.js relayoutBrowser). It is a stand-in: Steam's own view is not in a browser.
//
//   python3 -m http.server 8765 --bind 127.0.0.1 --directory /
//   node --test tests/store-dock.e2e.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

// AIKA_ROOT: another checkout to run against (e.g. 2.2.0, to see the failure this fixes)
const BASE = `http://127.0.0.1:8765${path.resolve(process.env.AIKA_ROOT || path.resolve(__dirname, ".."), "tests/friends-dock")}/harness.html`;
const NOISE = /CORS policy|ERR_FAILED|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|Failed to load resource/;
let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

// The native view's stand-in: covers the content frame's box as it was at its last layout
const NATIVE_VIEW = () => {
  window.__viewLayouts = 0;
  window.__nativeView = {
    on: false,
    node: null,
    show() {
      if (!this.node) {
        this.node = document.createElement("div");
        this.node.id = "native-view";
        this.node.style.cssText = "position:fixed;z-index:99999;background:#fff;pointer-events:auto";
        document.documentElement.append(this.node);
      }
      this.on = true;
      this.layout();
    },
    hide() { this.on = false; this.node?.remove(); this.node = null; },
    layout() {
      if (!this.on || !this.node) return;
      const f = document.querySelector(".OuterFrame > .ContentFrame") || document.querySelector(".ContentFrame");
      const r = f.getBoundingClientRect();
      Object.assign(this.node.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      window.__viewLayouts++;
    },
  };
  addEventListener("resize", () => window.__nativeView.layout());
};

async function open({ width = 1440, height = 860 } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(NATIVE_VIEW);
  await page.goto(`${BASE}?engine=1&millennium=1`);
  await page.waitForSelector("html[data-ready]");
  await page.waitForTimeout(500);
  page.errors = errors;
  page.ctx = context;
  return page;
}
const close = async (page) => { assert.deepEqual(page.errors, [], "no JavaScript errors"); await page.ctx.close(); };
const until = (page, fn, arg, timeout = 5000) => page.waitForFunction(fn, arg, { timeout });
const settle = async (page) => {
  await page.waitForTimeout(120);
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  await page.waitForTimeout(150);
};
// Steam shows a page: the route changes, its view appears laid out in the frame as it is then
async function go(page, route, url, kind) {
  await page.evaluate(([r, u]) => {
    __fixture.route.path = r;
    __fixture.route.url = u;
    if (r.startsWith("/browser")) __nativeView.show();
    else __nativeView.hide();
  }, [route, url]);
  await until(page, (k) => window.__aikaFriendsDock?.page === k, kind);
  await settle(page);
}
const dockMode = (page) => page.evaluate(() => window.__aikaFriendsDock.mode);
// Is the dock's point (x from its left edge) seen, or is the page's view over it?
const seen = (page, dx) => page.evaluate((d) => {
  const r = document.querySelector(".aika-fdock").getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + d, r.top + 60);
  return !!hit?.closest(".aika-fdock");
}, dx);
const box = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right) }; }, sel);

test("Store: expanding the dock really widens it — the page's view gives up the room, the names show", async () => {
  const page = await open();
  await go(page, "/browser/store", "https://store.steampowered.com/", "store");
  if ((await dockMode(page)) === "open") { await page.evaluate(() => window.__aikaFriendsDock.toggle()); await settle(page); }
  assert.equal(await dockMode(page), "rail");
  // the rail is seen beside the page (the view was laid out with the rail's room)
  assert.ok(await seen(page, 20), "the rail beside the page");
  assert.equal(await page.getAttribute("html", "data-aika-fdock-page"), "store");
  const layouts = await page.evaluate(() => window.__viewLayouts);
  // expand
  await page.click(".aika-fdock__toggle");
  await settle(page);
  assert.equal(await dockMode(page), "open");
  const dock = await box(page, ".aika-fdock");
  assert.equal(dock.w, 264, "the dock's own width");
  const view = await box(page, "#native-view");
  assert.ok(view.right <= dock.x + 1, `the page's view ends where the dock begins (${view.right} ≤ ${dock.x})`);
  assert.ok(await page.evaluate(() => window.__viewLayouts) > layouts, "Steam was asked to lay its view out again");
  for (const dx of [20, 120, 240]) assert.ok(await seen(page, dx), `the open dock is seen at +${dx}px (not under the page)`);
  // names in the rows: not cut (inside the dock's box, visible)
  const names = await page.$$eval(".aika-fdock .aika-fdock__name", (n) => n.slice(0, 5).map((e) => { const r = e.getBoundingClientRect(); const d = e.closest(".aika-fdock").getBoundingClientRect(); return r.width > 0 && r.left >= d.left && r.right <= d.right + 0.5 && getComputedStyle(e).opacity !== "0"; }));
  assert.ok(names.length && names.every(Boolean), "the names show inside the dock");
  // no horizontal scroll, nothing past the window
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(dock.right <= 1440);
  // collapse: back to the rail's size, the view takes its room back
  await page.click(".aika-fdock__toggle");
  await settle(page);
  assert.equal((await box(page, ".aika-fdock")).w, 52);
  assert.equal((await box(page, "#native-view")).right, 1440 - 52, "the page back to its width");
  await close(page);
});

test("Store: the room changes at once (no easing Steam's view can't follow); the library keeps its easing", async () => {
  const page = await open();
  await go(page, "/browser/store", "https://store.steampowered.com/app/730/", "store");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).transitionDuration.split(",").every((d) => parseFloat(d) === 0)), true);
  await go(page, "/library/home", "", "library");
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).transitionDuration), "0s");
  assert.equal(await page.getAttribute("html", "data-aika-fdock-page"), "library");
  await close(page);
});

test("every kind of page: store home, a game, a category, search, community, a profile, the library", async () => {
  const page = await open();
  for (const [route, url, kind] of [
    ["/browser/store", "https://store.steampowered.com/", "store"],
    ["/browser/store", "https://store.steampowered.com/app/1091500/", "store"],
    ["/browser/store", "https://store.steampowered.com/category/action/", "store"],
    ["/browser/store", "https://store.steampowered.com/search/?term=portal", "store"],
    ["/browser/community", "https://steamcommunity.com/", "community"],
    ["/browser/community", "https://steamcommunity.com/id/someone/", "community"],
    ["/library/home", "", "library"],
  ]) {
    // arriving with the dock folded (Steam lays its view out with the rail's room), then open, fold, open
    if ((await page.evaluate(() => window.__aikaFriendsDock?.mode)) === "open") { await page.click(".aika-fdock__toggle"); await settle(page); }
    await go(page, route, url, kind);
    for (const want of ["rail", "open", "rail", "open"]) {
      if ((await dockMode(page)) !== want) { await page.click(".aika-fdock__toggle"); await settle(page); }
      const dock = await box(page, ".aika-fdock");
      assert.equal(dock.w, want === "open" ? 264 : 52, `${url || route}: ${want}`);
      assert.ok(await seen(page, 10), `${url || route}: ${want} — seen to its left edge`);
      if (kind !== "library") assert.equal((await box(page, "#native-view")).right, dock.x, `${url}: ${want} — the page right up to the dock`);
      else assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginRight), `${dock.w}px`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal scroll");
    }
  }
  await close(page);
});

test("diagnose(): what the dock and the page take up (for a check in Steam's DevTools)", async () => {
  const page = await open();
  await go(page, "/browser/store", "https://store.steampowered.com/", "store");
  const d = await page.evaluate(() => window.__aikaFriendsDock.diagnose());
  assert.equal(d.page, "store");
  assert.ok(d.dock && d.frame);
  assert.match(d.frameMarginRight, /px$/);
  await close(page);
});
