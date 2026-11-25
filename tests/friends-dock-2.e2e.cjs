// Aika Enhanced 2.0 — browser checks of the global dock, its chat wiring, the Steam Enhanced
// parts (vendor/steam-enhanced/) and the settings window, against the test harness
// (tests/friends-dock/harness.html, fixture.js, millennium-stub.js). Not a substitute for a run
// inside Steam: Steam's own Friends & Chat tree, its webpack modules and popup windows are not
// in a browser, so the chat engine is checked for its wiring and its fallback, not for the
// embedded chat itself.
//
//   python3 -m http.server 8765 --bind 127.0.0.1 --directory /
//   REACT_UMD=/path/to/node_modules node --test tests/friends-dock-2.e2e.cjs
// REACT_UMD (optional): a node_modules holding react@18 and react-dom@18, served by the same
// server, to draw the theme settings window (Steam's popup runtime stands in as React).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE = process.env.FDOCK_BASE ||
  `http://127.0.0.1:8765${path.resolve(__dirname, "friends-dock")}/harness.html`;
const REACT = process.env.REACT_UMD;

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

async function open(query = "", { width = 1440, height = 860, init } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(BASE + (query ? "?" + query : ""));
  await page.waitForSelector("html[data-ready]");
  await page.waitForTimeout(300);
  page.errors = errors;
  page.ctx = context;
  return page;
}
const tick = (page, ms = 1200) => page.waitForTimeout(ms);
// (millennium.host — Millennium's theme server — is not there in a browser: its links fail to load)
const close = async (page) => {
  assert.deepEqual(page.errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|CORS policy|ERR_FAILED/.test(e)), [], "no JavaScript errors");
  await page.ctx.close();
};
const go = (page, path, url = "") => page.evaluate(([p, u]) => { __fixture.route.path = p; __fixture.route.url = u; }, [path, url]);
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 4000 });

// A stand-in for the chat engine's API (window.__aikaFdockChat, aika-main.js), recording calls
const CHAT_STUB = () => {
  window.__chatCalls = [];
  window.__aikaFdockChat = {
    showing: false, minimized: false, active: null,
    open(id) { __chatCalls.push(["open", String(id)]); this.showing = true; this.minimized = false; this.active = String(id); return true; },
    close() { __chatCalls.push(["close"]); this.showing = false; this.active = null; },
    minimize() { __chatCalls.push(["minimize"]); this.minimized = true; },
    changed() {},
  };
  window.__seFriendsDock = { openWindow(fn) { __chatCalls.push(["openWindow"]); return fn(); } };
};

test("the dock follows to the Store, the Community and other pages — one dock, one state", async () => {
  const page = await open();
  const dock = await page.evaluateHandle(() => document.querySelector(".aika-fdock"));
  await page.evaluate(() => { document.querySelector(".aika-fdock__scroll").scrollTop = 0; });
  for (const [route, url, kind] of [
    ["/browser/store", "https://store.steampowered.com/app/730/", "store"],
    ["/browser/community", "https://steamcommunity.com/id/someone/inventory/", "community"],
    ["/browser/community", "https://steamcommunity.com/workshop/", "community"],
    ["/browser/store", "https://help.steampowered.com/", "other"],
    ["/library/home", "", "library"],
  ]) {
    await go(page, route, url);
    await until(page, (k) => window.__aikaFriendsDock.page === k, kind);
    assert.equal(await page.locator(".aika-fdock").count(), 1, `${kind}: one dock`);
    assert.equal(await page.evaluate((d) => d === document.querySelector(".aika-fdock"), dock), true, `${kind}: the same element`);
    assert.equal(await page.getAttribute("html", "data-aika-fdock"), "open");
    // the content frame (where Steam puts the page's browser view) gives up the dock's width
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginRight), "264px", kind);
  }
  // the state goes along: collapsed on the Store stays collapsed in the library
  await go(page, "/browser/store", "https://store.steampowered.com/");
  await until(page, () => window.__aikaFriendsDock.page === "store");
  await page.click(".aika-fdock__toggle");
  await go(page, "/library/home");
  await until(page, () => window.__aikaFriendsDock.page === "library");
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "rail");
  await close(page);
});

test("per-page settings: Store and Community off leave those pages as in Aika", async () => {
  const page = await open("opt=fdock-page-store-off,fdock-page-community-off");
  for (const url of ["https://store.steampowered.com/", "https://steamcommunity.com/market/"]) {
    await go(page, "/browser/store", url);
    await tick(page);
    assert.equal(await page.locator(".aika-fdock").count(), 0, url);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ContentFrame")).marginRight), "0px");
  }
  await go(page, "/library/home");
  await tick(page);
  assert.equal(await page.locator(".aika-fdock").count(), 1);
  await close(page);
});

test("the list keeps its scroll position across page changes", async () => {
  const page = await open("opt=fdock-show-offline", { height: 420 });
  await page.click('[data-section="offline"]');
  await page.evaluate(() => { document.querySelector(".aika-fdock__scroll").scrollTop = 120; });
  const before = await page.evaluate(() => document.querySelector(".aika-fdock__scroll").scrollTop);
  assert.ok(before > 0);
  await page.evaluate(() => { document.title = "Steam Games List"; });
  await tick(page);
  assert.equal(await page.locator(".aika-fdock").count(), 0);
  await page.evaluate(() => { document.title = "Steam"; });
  await tick(page);
  assert.equal(await page.evaluate(() => document.querySelector(".aika-fdock__scroll").scrollTop), before);
  await close(page);
});

test("unread messages: a count on the face, a pulse when one arrives, off with the setting", async () => {
  let page = await open();
  assert.equal(await page.textContent('[data-friend="102"] .aika-fdock__unread'), "3");
  assert.equal(await page.textContent('[data-friend="107"] .aika-fdock__unread'), "1");
  assert.equal(await page.isHidden('[data-friend="101"] .aika-fdock__unread'), true);
  assert.equal(await page.getAttribute('[data-friend="102"]', "data-unread"), "3");
  await page.evaluate(() => { __fixture.chats[0].unread_message_count = 4; });
  await until(page, () => document.querySelector('[data-friend="102"] .aika-fdock__unread').textContent === "4");
  assert.equal(await page.evaluate(() => document.querySelector('[data-friend="102"] .aika-fdock__unread').classList.contains("is-alert")), true);
  await close(page);
  page = await open("opt=fdock-unread-off");
  assert.equal(await page.isHidden('[data-friend="102"] .aika-fdock__unread'), true);
  await close(page);
});

test("a click opens the chat in the dock (not Steam's window); its friend is highlighted", async () => {
  const page = await open("", { init: CHAT_STUB });
  await page.click('[data-friend="102"]');
  assert.deepEqual(await page.evaluate(() => __chatCalls), [["open", "102"]]);
  assert.equal(await page.evaluate(() => __fixture.calls.filter((c) => c[0] === "chat").length), 0, "no Steam chat window");
  await until(page, () => document.querySelector('[data-friend="102"]').getAttribute("aria-current") === "true");
  // the menu offers Steam's window, which the dock lets the chat go to
  await page.click('[data-friend="101"]', { button: "right" });
  const items = await page.$$eval(".aika-fdock-menu .aika-menu__item", (n) => n.map((b) => b.textContent));
  assert.ok(items.includes("Open in a Steam chat window"));
  await page.click('.aika-fdock-menu .aika-menu__item:nth-of-type(3)');
  assert.deepEqual(await page.evaluate(() => __chatCalls.at(-1)), ["openWindow"]);
  assert.deepEqual(await page.evaluate(() => __fixture.calls.at(-1).slice(0, 2)), ["chat", 101]);
  await close(page);
});

test("Built-in chat off: Steam's window, as in 1.x", async () => {
  const page = await open("opt=fdock-chat-off", { init: CHAT_STUB });
  await page.click('[data-friend="102"]');
  assert.deepEqual(await page.evaluate(() => __chatCalls), []);
  assert.deepEqual(await page.evaluate(() => __fixture.calls.at(-1).slice(0, 2)), ["chat", 102]);
  await close(page);
});

test("Keep the open chat: restored minimized after a restart; off, folding or leaving closes it", async () => {
  // the stub and a chat kept from the last session, before the page's scripts run
  let page = await open("", { init: `localStorage.setItem("aika-fdock-chat", "103"); (${CHAT_STUB})();` });
  await until(page, () => window.__chatCalls.length >= 2);
  assert.deepEqual(await page.evaluate(() => __chatCalls.slice(0, 2)), [["open", "103"], ["minimize"]]);
  await close(page);
  page = await open("opt=fdock-keepchat-off", { init: CHAT_STUB });
  await page.click('[data-friend="102"]');
  await page.click(".aika-fdock__toggle");
  assert.deepEqual(await page.evaluate(() => __chatCalls.at(-1)), ["close"]);
  await page.click(".aika-fdock__toggle");
  await page.click('[data-friend="102"]');
  await go(page, "/browser/store", "https://store.steampowered.com/");
  await until(page, () => window.__chatCalls.at(-1)?.[0] === "close");
  await close(page);
});

test("the Steam Enhanced parts load once, degrade without Steam's modules, and fall back to Steam's window", async () => {
  const page = await open("engine=1&millennium=1");
  await until(page, () => window.__aikaSettings?.ready && !document.querySelector(".aika-fdock__gear").hidden);
  const s = await page.evaluate(() => ({
    runtime: !!window.__se, layer: !!window.__se?.layer, chat: !!window.__aikaFdockChat, se: !!window.__seFriendsDock,
    mill: !!window.__seMillenniumWindow, settings: !!window.__seThemeSettings, loader: window.__seClient?.aika,
    sheets: document.querySelectorAll("#se-sheets").length, docks: document.querySelectorAll(".aika-fdock").length,
    gear: !document.querySelector(".aika-fdock__gear").hidden,
  }));
  assert.deepEqual(s, { runtime: true, layer: true, chat: true, se: true, mill: true, settings: true, loader: true, sheets: 1, docks: 1, gear: true });
  // Steam's Friends & Chat tree cannot mount here: the chat opens in Steam's window, quietly
  await page.click('[data-friend="102"]');
  await tick(page, 500);
  assert.deepEqual(await page.evaluate(() => __fixture.calls.at(-1).slice(0, 2)), ["chat", 102]);
  assert.equal(await page.isHidden(".se-fd-chat-error"), true);
  assert.equal(await page.getAttribute(".aika-fdock", "data-chat"), null);
  // the Steam Enhanced parts did not restyle the library or Steam Settings
  assert.equal(await page.getAttribute("html", "data-se-settings"), null);
  // destroying the chat engine leaves the Aika dock's list as it was
  await page.evaluate(() => window.__seFriendsDock.destroy());
  assert.equal(await page.locator(".aika-fdock [data-friend]").count(), 10);
  await close(page);
});

test("settings: saved where Millennium keeps them, applied at once", async () => {
  const page = await open("engine=1&millennium=1");
  await until(page, () => window.__aikaSettings?.ready);
  const schema = await page.evaluate(() => __aikaSettings.schema.map((s) => s.key));
  const skin = await page.evaluate(async () => Object.keys((await (await fetch("../../skin.json")).json()).Conditions));
  assert.equal(schema.length, skin.length - 1, "every condition (Color preset + Custom colors are the palette)");
  assert.ok(schema.includes("palette") && schema.includes("Built-in chat") && schema.includes("Dock: in the store"));
  assert.deepEqual(await page.evaluate(() => __aikaSettings.tabs), ["Appearance", "Elements", "Friends list", "Friends Dock", "Chat", "Navigation", "Animations", "Advanced"]);
  // a dropdown: Millennium's Core_ChangeCondition, and the dock follows at once
  await page.evaluate(() => __aikaSettings.set("Dock: in the store", "Off"));
  await until(page, () => window.__millennium.calls.some((c) => c[0] === "Core_ChangeCondition"));
  assert.deepEqual(await page.evaluate(() => __millennium.calls.find((c) => c[0] === "Core_ChangeCondition")[1]),
    { theme: "Aika-Enhanced", newData: "Off", condition: "Dock: in the store" });
  await go(page, "/browser/store", "https://store.steampowered.com/");
  await tick(page);
  assert.equal(await page.locator(".aika-fdock").count(), 0);
  await go(page, "/library/home");
  await tick(page);
  // a preset: the option stylesheet Millennium injected is swapped
  await page.evaluate(() => __aikaSettings.set("palette", "Greeny"));
  await tick(page, 300);
  const links = await page.$$eval('link[rel="stylesheet"]', (l) => l.map((x) => x.href).filter((h) => /presets/.test(h)));
  assert.deepEqual(links, ["https://millennium.host/v1/themes/Aika-Enhanced/options/presets/greeny.css"]);
  // a slider: Millennium's own style element, the dock resizes
  await page.evaluate(() => __aikaSettings.set("Dock width", 296));
  await until(page, () => Math.round(document.querySelector(".aika-fdock").getBoundingClientRect().width) === 296);
  assert.equal(await page.textContent("#millennium-slider---aika-setting-fdock-width"), ":root { --aika-setting-fdock-width: 296px; }");
  // Custom colours: Core_ChangeColor for the accent and its light
  await page.evaluate(() => __aikaSettings.setCustom({ accent: "#ff8800" }));
  await until(page, () => window.__millennium.calls.filter((c) => c[0] === "Core_ChangeColor").length === 2);
  await until(page, () => window.__millennium.conditions["Custom colors"] === "yes");
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--aika-user-accent").trim()), "#ff8800");
  await close(page);
});

test("Millennium's theme editor gets a button to every Aika Enhanced setting", async () => {
  const page = await open("engine=1&millennium=1");
  await until(page, () => window.__aikaSettings?.ready);
  await page.evaluate(() => document.body.insertAdjacentHTML("beforeend",
    '<div class="MillenniumDesktopSidebar"><div class="MillenniumDesktopSidebar_Title">Aika Enhanced</div><div class="MillenniumDesktopSidebar_EditorContent"><div class="Field" data-condition="Friends Dock"></div></div></div>'));
  await page.waitForSelector(".MillenniumDesktopSidebar .aika-open-settings", { timeout: 3000 });
  assert.equal(await page.locator(".aika-open-settings").count(), 1);
  // another theme's editor: nothing added
  await page.evaluate(() => { document.querySelector(".MillenniumDesktopSidebar").remove(); document.body.insertAdjacentHTML("beforeend",
    '<div class="MillenniumDesktopSidebar"><div class="MillenniumDesktopSidebar_Title">Space Theme</div><div class="MillenniumDesktopSidebar_EditorContent"></div></div>'); });
  await tick(page, 800);
  assert.equal(await page.locator(".aika-open-settings").count(), 0);
  await close(page);
});

if (REACT) {
  test("the theme settings window (Steam Enhanced's) draws Aika's settings and saves a choice", async () => {
    const page = await open("engine=1&millennium=1&preset=rose-ash", { height: 900 });
    await page.addScriptTag({ url: `http://127.0.0.1:8765${REACT}/react/umd/react.production.min.js` });
    await page.addScriptTag({ url: `http://127.0.0.1:8765${REACT}/react-dom/umd/react-dom.production.min.js` });
    await until(page, () => window.__aikaSettings?.ready);
    // Steam's popup runtime (millennium-window.js finds it in Steam's bundles) stands in as React
    await page.evaluate(() => {
      window.__seMillenniumWindow.popupRuntime = () => ({ React, showModal(el, win, title, o) {
        const host = document.createElement("div");
        host.id = "test-popup";
        host.style.cssText = `position:fixed;left:50%;top:50%;width:${o.popupWidth}px;height:${o.popupHeight}px;transform:translate(-50%,-50%);z-index:5000;background:var(--aika-bg-base);overflow:hidden`;
        document.body.append(host);
        ReactDOM.createRoot(host).render(el);
        window.__popupTitle = title;
        return { Close() { host.remove(); } };
      } });
    });
    await page.click(".aika-fdock__gear");
    await page.waitForSelector(".se-ts-tab");
    assert.equal(await page.evaluate(() => window.__popupTitle), "Aika Enhanced");
    assert.equal(await page.textContent(".se-ts-name"), "Aika Enhanced");
    await page.click('.se-ts-tab[data-tab="Friends Dock"]');
    assert.equal(await page.locator(".se-ts-range input").count(), 3, "the three sliders");
    // the Store row's Off
    const row = page.locator(".se-ts-row", { hasText: "Dock: in the store" });
    await row.locator('button[data-value="Off"]').click();
    await until(page, () => window.__millennium.calls.some((c) => c[0] === "Core_ChangeCondition" && c[1].condition === "Dock: in the store"));
    assert.equal(await row.locator('button[data-value="Off"]').getAttribute("aria-checked"), "true");
    // search across tabs
    await page.fill(".se-ts-search input", "unread");
    assert.ok((await page.locator(".se-ts-row").count()) >= 1);
    await close(page);
  });
}
