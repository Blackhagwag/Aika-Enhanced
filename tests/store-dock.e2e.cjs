// Aika Enhanced 2.4 — the Friends Dock on Store, Community and profile pages, against the test
// harness. Not a run inside Steam: two stand-ins play Steam's parts —
//   * Steam's native browser view (a Store / Community page): an element over the content frame,
//     above everything of the main window, laid out only when the page appears and on a window
//     `resize` (how Steam was seen to behave: the dock opened under the page in 2.2 and 2.3);
//   * Steam's popup windows (tests/friends-dock/popup-stub.js): each an <iframe> with a document
//     of its own, stacked above the browser view, driven through Steam Enhanced's popup layer.
// On a browser page the open dock is drawn in such a window (js/friends-dock.js "the open dock
// over a browser page"); the page keeps the rail's room, so nothing depends on Steam laying its
// view out again.
//
//   python3 -m http.server 8765 --bind 127.0.0.1 --directory /
//   REACT_UMD=/path/to/node_modules node --test tests/store-dock.e2e.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

// AIKA_ROOT: another checkout to run against (2.2.0 / 2.3.0 fail these as reported)
const ROOT = process.env.AIKA_ROOT || path.resolve(__dirname, "..");
const BASE = `http://127.0.0.1:8765${path.resolve(ROOT, "tests/friends-dock")}/harness.html`;
const STUB = `http://127.0.0.1:8765${path.resolve(__dirname, "friends-dock/popup-stub.js")}`;
const REACT = process.env.REACT_UMD;
const NOISE = /CORS policy|ERR_FAILED|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|Failed to load resource/;
let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

const NATIVE_VIEW = () => {
  window.__viewLayouts = 0;
  window.__nativeView = {
    on: false, node: null,
    show() {
      if (!this.node) {
        this.node = document.createElement("div");
        this.node.id = "native-view";
        this.node.style.cssText = "position:fixed;z-index:99999;background:#fff";
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
  await page.addScriptTag({ url: `http://127.0.0.1:8765${REACT}/react/umd/react.production.min.js` });
  await page.addScriptTag({ url: `http://127.0.0.1:8765${REACT}/react-dom/umd/react-dom.production.min.js` });
  await page.addScriptTag({ url: STUB });
  await page.waitForTimeout(400);
  page.errors = errors;
  page.ctx = context;
  return page;
}
const close = async (page) => { assert.deepEqual(page.errors, [], "no JavaScript errors"); await page.ctx.close(); };
const until = (page, fn, arg, timeout = 5000) => page.waitForFunction(fn, arg, { timeout });
const settle = async (page) => {
  await page.waitForTimeout(150);
  await page.evaluate(() => Promise.all([document, ...window.__popupWindows.map((f) => f.contentDocument)].flatMap((d) => d.getAnimations?.() || []).filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  await page.waitForTimeout(350);
};
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
const mode = (page) => page.evaluate(() => window.__aikaFriendsDock.mode);
const toggle = async (page, want) => {
  if ((await mode(page)) !== want) {
    // the toggle is the dock's own button, wherever the dock's header is (the window or the open dock's window)
    await page.evaluate(() => {
      const t = [document, ...window.__popupWindows.map((f) => f.contentDocument)].map((d) => d.querySelector(".aika-fdock__toggle")).find(Boolean);
      t.click();
    });
    await settle(page);
  }
  assert.equal(await mode(page), want);
};
// What the user sees: the open dock's window, or the dock in the window, or the page over it
const seenAt = (page, x, y) => page.evaluate(([x, y]) => {
  for (const f of window.__popupWindows) {
    const r = f.getBoundingClientRect();
    if (r.width > 2 && x >= r.left && x < r.right && y >= r.top && y < r.bottom) {
      const hit = f.contentDocument.elementFromPoint(x - r.left, y - r.top);
      return hit?.closest(".aika-fdock") ? "dock-window" : "popup";
    }
  }
  const hit = document.elementFromPoint(x, y);
  return hit?.closest(".aika-fdock") ? "dock" : hit?.id === "native-view" ? "page" : "other";
}, [x, y]);
const layerFrame = (page) => page.evaluate(() => {
  const f = window.__popupWindows.find((w) => w.contentDocument.querySelector(".aika-fdock--layer"));
  if (!f) return null;
  const r = f.getBoundingClientRect();
  const d = f.contentDocument;
  const names = [...d.querySelectorAll(".aika-fdock__name")].slice(0, 6).map((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && b.right <= r.width + 0.5 && b.left >= 0; });
  return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), rows: d.querySelectorAll("[data-friend]").length, names, scrollW: d.documentElement.scrollWidth };
});
const viewRight = (page) => page.evaluate(() => { const n = document.getElementById("native-view"); return n ? Math.round(n.getBoundingClientRect().right) : null; });

// Checks one page: folded, open, folded, open again; the window resized
async function cycle(page, label, browserPage, W = 1440) {
  await toggle(page, "rail");
  assert.equal(await layerFrame(page), null, `${label}: folded — no open dock's window`);
  assert.equal(await seenAt(page, W - 40, 300), "dock", `${label}: folded — the rail is seen`);
  if (browserPage) assert.equal(await viewRight(page), W - 52, `${label}: the page up to the rail`);
  for (let i = 0; i < 2; i++) {
    await toggle(page, "open");
    if (browserPage) {
      const l = await layerFrame(page);
      assert.ok(l, `${label}: open — drawn in a window over the page`);
      assert.deepEqual([l.x + l.w, l.w], [W, 264], `${label}: at the window's right edge, the dock's full width`);
      assert.ok(l.rows >= 5 && l.names.length && l.names.every(Boolean), `${label}: the rows and names, uncut`);
      assert.ok(l.scrollW <= l.w, `${label}: nothing past the open dock`);
      for (const x of [W - 260, W - 150, W - 20]) assert.equal(await seenAt(page, x, 300), "dock-window", `${label}: open — seen at x=${x}, not under the page`);
      assert.equal(await viewRight(page), W - 52, `${label}: the page keeps its width (no relayout needed)`);
    } else {
      assert.equal(await layerFrame(page), null);
      assert.equal(await page.evaluate(() => Math.round(document.querySelector(".aika-fdock").getBoundingClientRect().width)), 264);
      for (const x of [W - 260, W - 20]) assert.equal(await seenAt(page, x, 300), "dock", `${label}: open — seen at x=${x}`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginRight), "264px");
    }
    if (i === 0) await toggle(page, "rail");
  }
  assert.equal(await page.locator(".aika-fdock").count(), 1, `${label}: one dock`);
  assert.ok(await page.evaluate(() => window.__popupWindows.filter((f) => f.contentDocument.querySelector(".aika-fdock--layer")).length <= 1), `${label}: one open dock's window at most`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: no horizontal scroll`);
}

if (REACT) {
  test("Store, Community, profiles: the dock folds and opens for real — every page asked for", async () => {
    const page = await open();
    const pages = [
      ["/browser/store", "https://store.steampowered.com/", "store", "store home"],
      ["/browser/store", "https://store.steampowered.com/app/1091500/", "store", "a game's page"],
      ["/browser/store", "https://store.steampowered.com/search/?term=portal", "store", "store search"],
      ["/browser/store", "https://store.steampowered.com/category/action/", "store", "a category"],
      ["/browser/store", "https://store.steampowered.com/sale/winter", "store", "a sale page"],
      ["/browser/community", "https://steamcommunity.com/", "community", "community home"],
      ["/browser/community", "https://steamcommunity.com/discussions/", "community", "discussions"],
      ["/browser/community", "https://steamcommunity.com/workshop/", "community", "the Workshop"],
      ["/browser/community", "https://steamcommunity.com/app/730", "community", "a game's community hub"],
      ["/browser/community", "https://steamcommunity.com/id/me/", "community", "your profile"],
      ["/browser/community", "https://steamcommunity.com/id/someone/", "community", "another profile"],
      ["/browser/community", "https://steamcommunity.com/id/someone/stats/730/achievements/", "community", "achievements"],
      ["/browser/community", "https://steamcommunity.com/id/someone/screenshots/", "community", "game content"],
      ["/library/home", "", "library", "library home"],
      ["/library/app/730", "", "library", "a game in the library"],
    ];
    for (const [route, url, kind, label] of pages) {
      await go(page, route, url, kind);
      await cycle(page, label, kind !== "library");
    }
    await close(page);
  });

  test("moving between sections keeps the state, one dock, one window, no duplicates", async () => {
    const page = await open();
    const S = ["/browser/store", "https://store.steampowered.com/app/730/", "store"];
    const C = ["/browser/community", "https://steamcommunity.com/", "community"];
    const P = ["/browser/community", "https://steamcommunity.com/id/someone/", "community"];
    const L = ["/library/home", "", "library"];
    await go(page, ...L);
    await toggle(page, "open");
    const listeners = await page.evaluate(() => typeof getEventListeners === "function");
    for (const [route, url, kind] of [S, C, P, S, L, P, L]) {
      await go(page, route, url, kind);
      assert.equal(await mode(page), "open", `${url || route}: still open`);
      assert.equal(await page.locator(".aika-fdock").count(), 1, "one dock in the window");
      const windows = await page.evaluate(() => window.__popupWindows.filter((f) => f.contentDocument.querySelector(".aika-fdock--layer")).length);
      assert.equal(windows, kind === "library" ? 0 : 1, `${url || route}: the open dock's window`);
      const heads = await page.evaluate(() => [document, ...window.__popupWindows.map((f) => f.contentDocument)].reduce((n, d) => n + d.querySelectorAll(".aika-fdock__head").length, 0));
      assert.equal(heads, 1, "one header: the same dock, moved, never copied");
      assert.equal(await seenAt(page, 1440 - 250, 300), kind === "library" ? "dock" : "dock-window", `${url || route}: fully seen`);
    }
    // a page change, then folding on the store: back in the window, its window gone
    await go(page, ...S);
    await toggle(page, "rail");
    assert.equal(await page.evaluate(() => !!document.querySelector(".aika-fdock > .aika-fdock__head")), true);
    assert.equal(await layerFrame(page), null);
    assert.equal(listeners, false); // (DevTools-only API: not present, nothing to compare)
    await close(page);
  });

  test("the window resized: the open dock follows the right edge; the rail stays in place", async () => {
    const page = await open();
    await go(page, "/browser/store", "https://store.steampowered.com/", "store");
    await toggle(page, "open");
    for (const [w, h] of [[1280, 800], [1600, 900], [1440, 860]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(1300);
      const l = await layerFrame(page);
      assert.ok(l, `${w}×${h}: still open`);
      assert.equal(l.x + l.w, w, `${w}×${h}: at the right edge`);
      assert.equal(l.y + l.h, h, `${w}×${h}: down to the window's foot`);
      assert.equal(await seenAt(page, w - 200, 300), "dock-window");
    }
    await toggle(page, "rail");
    await cycle(page, "after resizing", true);
    await close(page);
  });

  test("Steam taking the window down (another menu): the dock comes home, then opens again", async () => {
    const page = await open();
    await go(page, "/browser/store", "https://store.steampowered.com/", "store");
    await toggle(page, "open");
    await page.evaluate(() => window.__popupWindows.find((f) => f.contentDocument.querySelector(".aika-fdock--layer")).__handle.Hide());
    await until(page, () => window.__popupWindows.some((f) => f.contentDocument.querySelector(".aika-fdock--layer")), null, 4000);
    await settle(page);
    assert.equal(await mode(page), "open");
    assert.equal(await seenAt(page, 1440 - 200, 300), "dock-window");
    await close(page);
  });

  test("the open dock's window: its menu, chat clicks, the gear and the colours come from the dock", async () => {
    const page = await open();
    await go(page, "/browser/store", "https://store.steampowered.com/", "store");
    await toggle(page, "open");
    const colours = await page.evaluate(() => {
      const f = window.__popupWindows.find((w) => w.contentDocument.querySelector(".aika-fdock--layer"));
      const box = f.contentDocument.querySelector(".aika-fdock--layer");
      const cs = f.contentWindow.getComputedStyle(box);
      return { accent: cs.getPropertyValue("--aika-accent").trim(), main: getComputedStyle(document.documentElement).getPropertyValue("--aika-accent").trim(), font: cs.fontFamily, mainFont: getComputedStyle(document.querySelector(".aika-fdock")).fontFamily };
    });
    assert.equal(colours.accent, colours.main, "the preset's colours");
    assert.equal(colours.font, colours.mainFont, "the dock's font");
    // a right click on a row in the open dock's window opens the dock's menu (over the page, at the row)
    await page.evaluate(() => {
      const f = window.__popupWindows.find((w) => w.contentDocument.querySelector(".aika-fdock--layer"));
      const row = f.contentDocument.querySelector("[data-friend]");
      const r = row.getBoundingClientRect();
      row.dispatchEvent(new f.contentWindow.MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + 10 }));
    });
    await until(page, () => window.__popupWindows.some((f) => f.contentDocument.querySelector(".aika-fdock-menu")));
    const menuAt = await page.evaluate(() => { const f = window.__popupWindows.find((w) => w.contentDocument.querySelector(".aika-fdock-menu")); return Math.round(f.getBoundingClientRect().left); });
    assert.ok(menuAt > 1440 - 264 - 220, `the menu by the row (${menuAt})`);
    await close(page);
  });
}

if (REACT) {
  test("Expand on hover over a browser page: the peek opens in the window over the page, leaving folds it", async () => {
    const page = await open();
    await page.evaluate(() => window.__aikaFriendsDock.setting && document.documentElement.style.setProperty("--aika-fdock-hover", "1"));
    await page.evaluate(() => window.__aikaFriendsDock.refresh());
    await go(page, "/browser/store", "https://store.steampowered.com/", "store");
    await toggle(page, "rail");
    await page.mouse.move(1440 - 26, 300);
    await until(page, () => window.__popupWindows.some((f) => f.contentDocument.querySelector(".aika-fdock--layer")), null, 3000);
    await settle(page);
    assert.equal(await seenAt(page, 1440 - 200, 300), "dock-window", "the peek over the page");
    await page.mouse.move(1440 - 150, 320, { steps: 4 });
    await page.waitForTimeout(500);
    assert.ok(await layerFrame(page), "kept open while the pointer is on it");
    await page.mouse.move(400, 400, { steps: 4 });
    await until(page, () => !window.__popupWindows.some((f) => f.contentDocument.querySelector(".aika-fdock--layer")), null, 3000);
    assert.equal(await mode(page), "rail");
    await close(page);
  });
}

test("the library keeps the dock in the window, with its easing", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const page = await context.newPage();
  await page.goto(`${BASE}?engine=1&millennium=1`);
  await page.waitForSelector("html[data-ready]");
  await page.waitForTimeout(800);
  assert.equal(await page.getAttribute("html", "data-aika-fdock-page"), "library");
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).transitionDuration), "0s");
  assert.equal(await page.evaluate(() => !!document.querySelector(".aika-fdock > .aika-fdock__head")), true);
  await context.close();
});

test("diagnose(): the real geometry, by hand, on any page", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const page = await context.newPage();
  await page.goto(`${BASE}?engine=1&millennium=1`);
  await page.waitForSelector("html[data-ready]");
  await page.waitForTimeout(800);
  const d = await page.evaluate(() => window.__aikaFriendsDock.diagnose());
  assert.equal(d.page, "library");
  for (const k of ["clientWidth", "scrollWidth", "offsetWidth", "min-width", "max-width", "flex-shrink", "overflow", "position", "transform", "z-index"]) assert.ok(k in d.dock, k);
  assert.ok(Array.isArray(d.dockAncestors));
  await context.close();
});
