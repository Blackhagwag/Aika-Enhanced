// End-to-end checks of the Friends Dock (js/friends-dock.js +
// sections/friends-dock.css) in a browser, against the test harness
// (tests/friends-dock/harness.html: a skeleton of Steam's main window and a
// fixture standing in for Steam's FriendStore). Not a substitute for a run
// inside Steam — it checks the dock's own logic, layout and styling.
//
//   python3 -m http.server 8765 --bind 127.0.0.1 --directory /   (any static server)
//   node --test tests/friends-dock.e2e.cjs
// Needs Playwright (require("playwright")) and its Chromium.
// FDOCK_BASE: the harness URL prefix (default http://127.0.0.1:8765<repo>/tests/friends-dock/)
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE = process.env.FDOCK_BASE ||
  `http://127.0.0.1:8765${path.resolve(__dirname, "friends-dock")}/harness.html`;
const ORIGINAL = process.env.AIKA_ORIGINAL;   // a root of the original Aika, served by the same server

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

async function open(query = "", { width = 1440, height = 860, storage } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  if (storage) {
    await page.goto(BASE + "?nodock=1");
    await page.evaluate((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  }
  await page.goto(BASE + (query ? "?" + query : ""));
  await page.waitForSelector("html[data-ready]");
  await page.waitForTimeout(300);
  page.errors = errors;
  page.ctx = context;
  return page;
}
const tick = (page, ms = 1200) => page.waitForTimeout(ms);
// every running transition / animation done (CPU load can stretch them past a fixed wait)
const settle = async (page, ms = 150) => {
  await page.waitForTimeout(ms);
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
};
// colors equal once painted (color-mix at 0 % gives 0.999999 for 1, and may
// answer in another color space): both drawn on a canvas, compared per channel
const sameColor = (page, a, b) => page.evaluate(([a, b]) => {
  const px = (c) => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const x = cv.getContext("2d"); x.fillStyle = c; x.fillRect(0, 0, 1, 1);
    return [...x.getImageData(0, 0, 1, 1).data];
  };
  const p = px(a), q = px(b);
  return p.every((v, i) => Math.abs(v - q[i]) <= 1);
}, [a, b]);
const close = async (page) => { assert.deepEqual(page.errors, [], "no JavaScript errors"); await page.ctx.close(); };
const rowsIn = (page, sec) => page.$$eval(`.aika-fdock__sec[data-sec="${sec}"] [data-friend]`, (n) => n.map((r) => r.dataset.friend));

test("shows the real store's friends in game and online, offline hidden", async () => {
  const page = await open();
  assert.equal(await page.locator(".aika-fdock").count(), 1);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "open");
  assert.deepEqual(await rowsIn(page, "ingame"), ["103", "102", "101", "104", "105"]);
  assert.deepEqual(await rowsIn(page, "online"), ["109", "106", "107", "108", "110"]);
  assert.equal(await page.isHidden('.aika-fdock__sec[data-sec="offline"]'), true);
  assert.equal(await page.textContent(".aika-fdock__count"), "10");
  assert.equal(await page.textContent('[data-friend="101"] .aika-fdock__name'), "Mirelle");
  assert.equal(await page.textContent('[data-friend="101"] .aika-fdock__sub'), "Counter-Strike 2");
  assert.match(await page.getAttribute('[data-friend="101"] img', "src"), /^data:image\/svg/);
  assert.equal(await page.getAttribute('[data-friend="104"] .aika-fdock__av', "data-state"), "ingame");
  assert.equal(await page.getAttribute('[data-friend="107"] .aika-fdock__av', "data-state"), "away");
  assert.equal(await page.textContent('[data-friend="107"] .aika-fdock__sub'), "Away");
  // no picture: the initials stay
  assert.equal(await page.isHidden('[data-friend="109"] img'), true);
  assert.equal(await page.textContent('[data-friend="109"] .aika-fdock__ini'), "D");
  await close(page);
});

test("status changes move friends between groups, touching only their rows", async () => {
  const page = await open();
  const before = await page.evaluateHandle(() => document.querySelector('[data-friend="106"]'));
  const untouched = await page.evaluateHandle(() => document.querySelector('[data-friend="101"]'));
  const mutations = await page.evaluate(() => {
    window.__muts = 0;
    new MutationObserver((r) => { window.__muts += r.length; }).observe(document.querySelector(".aika-fdock"), { subtree: true, childList: true, characterData: true, attributes: true });
  });
  void mutations;
  // lumen starts Dota 2
  await page.evaluate(() => { const p = __fixture.friends[5].persona; p.m_unGamePlayedAppID = 570; p.rp = "Turbo"; });
  await tick(page);
  assert.ok((await rowsIn(page, "ingame")).includes("106"));
  assert.ok(!(await rowsIn(page, "online")).includes("106"));
  assert.equal(await page.evaluate((a) => a === document.querySelector('[data-friend="106"]'), before), true, "the same row node, moved");
  assert.equal(await page.textContent('[data-friend="106"] .aika-fdock__sub'), "Dota 2");
  assert.equal(await page.evaluate((a) => a.isConnected && a === document.querySelector('[data-friend="101"]'), untouched), true);
  // Nox goes offline → disappears (offline group off)
  await page.evaluate(() => { const p = __fixture.friends[3].persona; p.m_ePersonaState = 0; p.m_unGamePlayedAppID = 0; });
  await tick(page);
  assert.equal(await page.locator('[data-friend="104"]').count(), 0);
  // Old Friend signs in → appears, with the entrance animation
  await page.evaluate(() => { __fixture.friends[10].persona.m_ePersonaState = 1; });
  await page.waitForSelector('[data-friend="111"]', { timeout: 2500 });
  assert.equal(await page.evaluate(() => document.querySelector('[data-friend="111"]').classList.contains("is-new")), true, "rises in");
  await settle(page, 700);
  assert.equal(await page.evaluate(() => document.querySelector('[data-friend="111"]').classList.contains("is-new")), false, "the mark goes after its animation");
  // a name change (nickname) updates text in place
  await page.evaluate(() => { __fixture.friends[0].display_name = "Mirelle ✦"; });
  await tick(page);
  assert.equal(await page.textContent('[data-friend="101"] .aika-fdock__name'), "Mirelle ✦");
  assert.equal(await page.textContent(".aika-fdock__count"), "10");
  // an idle second changes nothing in the DOM
  await page.evaluate(() => { window.__muts = 0; });
  await tick(page, 2300);
  assert.equal(await page.evaluate(() => window.__muts), 0, "no DOM writes without a change");
  await close(page);
});

test("a click opens the Steam chat; the menu opens the profile and the game", async () => {
  const page = await open();
  await page.click('[data-friend="102"]');
  assert.deepEqual(await page.evaluate(() => __fixture.calls.at(-1).slice(0, 2)), ["chat", 102]);
  await page.click('[data-friend="101"]', { button: "right" });
  const items = await page.$$eval(".aika-fdock-menu .aika-menu__item", (n) => n.map((b) => b.textContent));
  assert.deepEqual(items, ["Send message", "View profile", "View game in Library"]);
  await page.click('.aika-fdock-menu .aika-menu__item:nth-of-type(2)');
  assert.deepEqual(await page.evaluate(() => __fixture.calls.at(-1)), ["url", "steam://openurl/https://steamcommunity.com/profiles/76561197960265829/"]);
  assert.equal(await page.locator(".aika-fdock-menu").count(), 0, "the menu closes after a choice");
  await page.click('[data-friend="101"]', { button: "right" });
  await page.click('.aika-fdock-menu .aika-menu__item:last-child');
  assert.deepEqual(await page.evaluate(() => __fixture.calls.at(-1)), ["navigate", "/library/app/730"]);
  // a friend not in a game: no game item; Escape and an outside press close it
  await page.click('[data-friend="106"]', { button: "right" });
  assert.equal(await page.locator(".aika-fdock-menu .aika-menu__item").count(), 2);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".aika-fdock-menu").count(), 0);
  await page.click('[data-friend="106"]', { button: "right" });
  await page.mouse.click(600, 400);
  assert.equal(await page.locator(".aika-fdock-menu").count(), 0);
  // keyboard: Enter opens the chat
  await page.focus('[data-friend="103"]');
  await page.keyboard.press("Enter");
  assert.deepEqual(await page.evaluate(() => __fixture.calls.at(-1).slice(0, 2)), ["chat", 103]);
  await close(page);
});

test("collapse and expand, remembered across a restart, the library room follows", async () => {
  const page = await open();
  const full = await page.evaluate(() => document.querySelector(".Library").getBoundingClientRect().width);
  await page.click(".aika-fdock__toggle");
  await settle(page);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "rail");
  const dockW = await page.evaluate(() => document.querySelector(".aika-fdock").getBoundingClientRect().width);
  assert.equal(dockW, 52);
  const railLib = await page.evaluate(() => document.querySelector(".Library").getBoundingClientRect().width);
  assert.equal(Math.round(railLib), 1440 - 52);
  assert.ok(railLib > full);
  assert.equal(await page.evaluate(() => localStorage.getItem("aika-fdock-mode")), "rail");
  // the text is faded out in the rail, the rows keep their place
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('[data-friend="101"] .aika-fdock__text')).opacity), "0");
  await page.reload();
  await page.waitForSelector("html[data-ready]");
  await tick(page, 400);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "rail", "the last state after a restart");
  await page.click(".aika-fdock__toggle");
  await settle(page);
  assert.equal(await page.evaluate(() => document.querySelector(".aika-fdock").getBoundingClientRect().width), 264);
  assert.equal(Math.round(await page.evaluate(() => document.querySelector(".Library").getBoundingClientRect().width)), 1440 - 264);
  // no horizontal overflow anywhere
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await close(page);
});

test("Dock at startup: Collapsed / Expanded override the last state", async () => {
  let page = await open("opt=fdock-start-rail", { storage: { "aika-fdock-mode": "open" } });
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "rail");
  await close(page);
  page = await open("opt=fdock-start-open", { storage: { "aika-fdock-mode": "rail" } });
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "open");
  await close(page);
});

test("only on the library: a store page, the mini Games List and Off restore Aika's layout", async () => {
  const base = await open("nodock=1");
  const original = await base.evaluate(() => ({
    lib: document.querySelector(".Library").getBoundingClientRect().width,
    bar: document.querySelector(".BottomBarContainer").getBoundingClientRect().width,
  }));
  await close(base);
  const page = await open();
  await page.evaluate(() => { __fixture.route.path = "/browser/store"; });
  await tick(page);
  assert.equal(await page.locator(".aika-fdock").count(), 0);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), null);
  for (let i = 0; i < 5; i++) {   // back and forth: never two docks
    await page.evaluate((i) => { __fixture.route.path = i % 2 ? "/browser/store" : "/library/app/730"; }, i);
    await tick(page);
  }
  await page.evaluate(() => { __fixture.route.path = "/library/home"; });
  await tick(page);
  assert.equal(await page.locator(".aika-fdock").count(), 1);
  // Off (what options/fdock-off.css / the live bridge set)
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--aika-fdock-enabled", "0");
    window.dispatchEvent(new CustomEvent("aika-visual-setting", { detail: { key: "Friends Dock", value: "Off" } }));
  });
  await tick(page, 700);
  assert.equal(await page.locator(".aika-fdock").count(), 0);
  const restored = await page.evaluate(() => ({
    lib: document.querySelector(".Library").getBoundingClientRect().width,
    bar: document.querySelector(".BottomBarContainer").getBoundingClientRect().width,
    margin: getComputedStyle(document.querySelector(".ContentFrame")).marginRight,
  }));
  assert.deepEqual(restored, { ...original, margin: "0px" }, "no room left over");
  await close(page);
  const games = await open();
  await games.evaluate(() => { document.title = "Steam Games List"; });
  await tick(games);
  assert.equal(await games.locator(".aika-fdock").count(), 0);
  await close(games);
});

test("Off from the start: the original Aika DOM and layout", async () => {
  const page = await open("opt=fdock-off");
  await tick(page);
  assert.equal(await page.locator(".aika-fdock, .aika-fdock-tip").count(), 0);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), null);
  await close(page);
});

test("a narrow window folds the dock to its rail without changing the saved state", async () => {
  const page = await open("", { width: 1000 });
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "rail");
  await page.setViewportSize({ width: 1440, height: 860 });
  await tick(page, 500);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "open");
  await page.setViewportSize({ width: 1000, height: 700 });
  await tick(page, 500);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "rail");
  await page.click(".aika-fdock__toggle");   // opened by hand on the small window
  await tick(page, 400);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), "open");
  assert.equal(await page.evaluate(() => localStorage.getItem("aika-fdock-mode")), null);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await close(page);
});

test("rail: a tooltip with the name and the game; Expand on hover opens over the library", async () => {
  let page = await open("", { storage: { "aika-fdock-mode": "rail" } });
  await page.hover('[data-friend="101"]');
  await tick(page, 600);
  assert.equal(await page.isVisible(".aika-fdock-tip.is-on"), true);
  assert.equal(await page.textContent(".aika-fdock-tip__name"), "Mirelle");
  assert.equal(await page.textContent(".aika-fdock-tip__sub"), "Counter-Strike 2");
  const tip = await page.evaluate(() => document.querySelector(".aika-fdock-tip").getBoundingClientRect().right);
  assert.ok(tip <= 1440 - 52, "left of the rail");
  await page.mouse.move(600, 400);
  await tick(page, 300);
  assert.equal(await page.isVisible(".aika-fdock-tip.is-on"), false);
  await close(page);

  page = await open("opt=fdock-hover", { storage: { "aika-fdock-mode": "rail" } });
  await settle(page);
  const lib = await page.evaluate(() => document.querySelector(".Library").getBoundingClientRect().width);
  await page.hover('[data-friend="106"]');
  await tick(page, 400);
  await settle(page);
  assert.equal(await page.getAttribute(".aika-fdock", "data-peek"), "");
  assert.equal(await page.evaluate(() => document.querySelector(".aika-fdock").getBoundingClientRect().width), 264);
  assert.equal(await page.evaluate(() => document.querySelector(".Library").getBoundingClientRect().width), lib, "the library keeps its width");
  assert.equal(await page.isVisible(".aika-fdock-tip.is-on"), false);
  await page.mouse.move(400, 400);
  await tick(page, 900);
  assert.equal(await page.getAttribute(".aika-fdock", "data-peek"), null);
  await close(page);
});

test("group by game, offline friends, counts off, sizes", async () => {
  let page = await open("opt=fdock-by-game,fdock-show-offline,fdock-count-off");
  const groups = await page.$$eval('.aika-fdock__sec[data-sec="ingame"] .aika-fdock__game', (n) =>
    n.map((g) => [g.querySelector(".aika-fdock__game-name").textContent, g.querySelectorAll("[data-friend]").length]));
  assert.deepEqual(groups, [["Counter-Strike 2", 2], ["Baldur's Gate 3", 1], ["Dota 2", 1], ["Valheim", 1]]);
  assert.equal(await page.textContent('[data-friend="101"] .aika-fdock__sub'), "Competitive · Mirage 9–7");
  assert.equal(await page.isHidden(".aika-fdock__count"), true);
  // offline: shown, folded, opens on a click (last seen first)
  assert.equal(await page.isVisible('.aika-fdock__sec[data-sec="offline"]'), true);
  assert.deepEqual(await rowsIn(page, "offline"), []);
  await page.click('[data-section="offline"]');
  assert.deepEqual(await rowsIn(page, "offline"), ["111", "112"]);
  // a game folds
  await page.click('[data-game-head="a730"]');
  assert.equal(await page.locator('.aika-fdock__game[data-game="a730"] [data-friend]').count(), 0);
  await close(page);

  page = await open();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--aika-setting-fdock-avatar", "40px");
    document.documentElement.style.setProperty("--aika-setting-fdock-width", "300px");
  });
  await settle(page);
  assert.equal(await page.evaluate(() => document.querySelector('[data-friend="101"] .aika-fdock__av').getBoundingClientRect().width), 40);
  assert.equal(await page.evaluate(() => document.querySelector(".aika-fdock").getBoundingClientRect().width), 300);
  await page.click(".aika-fdock__toggle");
  await settle(page);
  assert.equal(await page.evaluate(() => document.querySelector(".aika-fdock").getBoundingClientRect().width), 60);
  await close(page);
});

test("the dock takes every color from the preset", async () => {
  for (const preset of ["aika", "hello-bert", "greeny", "rose-ash"]) {
    const page = await open(`preset=${preset}`);
    const c = await page.evaluate(() => {
      const probe = (v, prop = "color") => {
        const d = document.createElement("div");
        d.style[prop] = `var(${v})`;
        document.body.append(d);
        const out = getComputedStyle(d)[prop];
        d.remove();
        return out;
      };
      const cs = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
      return {
        bg: cs(".aika-fdock", "backgroundColor"),
        leftPanel: cs(".Library > .Container > .Left > .Container", "backgroundColor"),
        online: cs('[data-friend="106"] .aika-fdock__name', "color"),
        accentBright: probe("--aika-accent-bright"),
        ingame: cs('[data-friend="101"] .aika-fdock__name', "color"),
        ok: probe("--aika-ok"),
        edge: cs(".aika-fdock", "borderLeftColor"),
        border: probe("--aika-border"),
        font: cs(".aika-fdock", "fontFamily"),
        bodyFont: probe("--aika-font-ui", "fontFamily"),
      };
    });
    assert.ok(await sameColor(page, c.bg, c.leftPanel), `${preset}: the left panel's surface (${c.bg} / ${c.leftPanel})`);
    assert.equal(c.online, c.accentBright, `${preset}: online name`);
    assert.equal(c.ingame, c.ok, `${preset}: in-game name`);
    assert.equal(c.edge, c.border, `${preset}: edge`);
    assert.equal(c.font, c.bodyFont, `${preset}: the UI font`);
    await close(page);
  }
});

test("the opacity slider mixes toward the panel body; animations off and Performance: Low land at once", async () => {
  let page = await open();
  await page.evaluate(() => document.documentElement.style.setProperty("--aika-setting-fdock-opacity", "100%"));
  await settle(page);
  const solid = await page.evaluate(() => {
    const d = document.createElement("div"); d.style.color = "var(--aika-bg-elevated)"; document.body.append(d);
    return [getComputedStyle(document.querySelector(".aika-fdock")).backgroundColor, getComputedStyle(d).color];
  });
  assert.ok(await sameColor(page, solid[0], solid[1]), `${solid}`);
  await close(page);
  for (const opt of ["fdock-motion-off", "perf-low"]) {
    page = await open(`opt=${opt}`);
    const d = await page.evaluate(() => [
      getComputedStyle(document.querySelector(".aika-fdock")).transitionDuration,
      getComputedStyle(document.querySelector(".ContentFrame")).transitionDuration,
    ]);
    assert.ok(d.every((v) => v.split(",").every((x) => parseFloat(x) === 0)), `${opt}: ${d}`);
    await close(page);
  }
});

test("Steam signed out of Friends: a quiet note, no rows", async () => {
  const page = await open();
  await page.evaluate(() => {
    __fixture.app.FriendStore.self.persona.m_ePersonaState = 0;
    for (const f of __fixture.friends) { f.persona.m_ePersonaState = 0; f.persona.m_unGamePlayedAppID = 0; f.persona.m_strGameName = ""; }
  });
  await tick(page);
  assert.equal(await page.locator("[data-friend]").count(), 0);
  assert.equal(await page.isVisible(".aika-fdock__note"), true);
  assert.equal(await page.textContent(".aika-fdock__note"), "Friends & Chat is offline");
  await close(page);
});

test("churn: 300 friends changing for a minute of updates — no leaks, one dock, no errors", async () => {
  const page = await open("opt=fdock-by-game,fdock-show-offline");
  await page.click('[data-section="offline"]');
  await page.evaluate(() => {
    const base = __fixture.friends[0];
    for (let i = 0; i < 300; i++) {
      const p = __fixture.persona({ id: 1000 + i, name: `Friend ${i}`, state: i % 3, hue: i * 7 });
      __fixture.friends.push({ accountid: 1000 + i, display_name: `Friend ${i}`, persona: p, OpenChatDialog: base.OpenChatDialog });
    }
  });
  await tick(page);
  const measure = () => page.evaluate(() => ({ nodes: document.querySelectorAll(".aika-fdock *").length, docks: document.querySelectorAll(".aika-fdock").length }));
  const first = await measure();
  for (let round = 0; round < 12; round++) {
    await page.evaluate((round) => {
      for (const [i, f] of __fixture.friends.entries()) {
        if ((i + round) % 4 === 0) f.persona.m_ePersonaState = (f.persona.m_ePersonaState + 1) % 4;
        if ((i + round) % 9 === 0) f.persona.m_unGamePlayedAppID = f.persona.m_unGamePlayedAppID ? 0 : [730, 570, 892970][i % 3];
      }
    }, round);
    await tick(page, 1100);
  }
  // back to the first state shape: everyone as in round 0 is not guaranteed, so compare bounds
  const last = await measure();
  assert.equal(last.docks, 1);
  const rows = await page.locator("[data-friend]").count();
  assert.equal(rows, await page.evaluate(() => __fixture.friends.filter((f) => true).length), "one row per friend (all groups shown)");
  assert.ok(last.nodes < first.nodes * 1.5, `DOM stays bounded (${first.nodes} → ${last.nodes})`);
  // destroy() leaves nothing behind
  await page.evaluate(() => window.__aikaFriendsDock.destroy());
  assert.equal(await page.locator(".aika-fdock, .aika-fdock-tip, .aika-fdock-menu").count(), 0);
  assert.equal(await page.getAttribute("html", "data-aika-fdock"), null);
  await close(page);
});

test("Russian Steam: the dock speaks Russian", async () => {
  const page = await open();
  await page.evaluate(() => window.__aikaFriendsDock.destroy());
  await page.evaluate(() => { document.documentElement.lang = "ru"; });
  await page.evaluate(async () => { await import(`../../js/friends-dock.js?ru=${Date.now()}`); });
  await tick(page, 600);
  assert.equal(await page.textContent(".aika-fdock__title"), "Друзья");
  assert.equal(await page.textContent('.aika-fdock__sec[data-sec="ingame"] .aika-fdock__label'), "В игре");
  await close(page);
});

test("the live settings bridge applies a dock setting from Millennium's editor at once", async () => {
  const page = await open();
  await page.evaluate(() => {
    document.body.insertAdjacentHTML("beforeend",
      `<div class="MillenniumDesktopSidebar"><div class="MillenniumDesktopSidebar_Title">Aika Enhanced</div>
        <div class="Field" data-condition="Friends Dock"><div class="DialogDropDown"><div class="DialogDropDown_CurrentDisplay">On</div></div></div></div>`);
  });
  await page.click('[data-condition="Friends Dock"]');
  await page.evaluate(() => { document.querySelector('[data-condition="Friends Dock"] .DialogDropDown_CurrentDisplay').textContent = "Выкл."; });
  await tick(page, 700);
  assert.equal(await page.locator(".aika-fdock").count(), 0);
  await page.evaluate(() => { document.querySelector('[data-condition="Friends Dock"] .DialogDropDown_CurrentDisplay').textContent = "On"; });
  await tick(page, 700);
  assert.equal(await page.locator(".aika-fdock").count(), 1);
  await close(page);
});

if (ORIGINAL) {
  test("visual parity: outside the dock the window is the original Aika's", async () => {
    const shots = [];
    for (const theme of [ORIGINAL, "../.."]) {
      // Performance: Low — Aika's light spots drift otherwise, and no two frames match
      const page = await open(`theme=${encodeURIComponent(theme)}&nodock=1&opt=perf-low`);
      await settle(page, 1500);
      shots.push(await page.screenshot({ clip: { x: 0, y: 0, width: 1100, height: 860 } }));
      await close(page);
    }
    assert.ok(shots[0].equals(shots[1]), "pixel-identical with the dock off");
  });
}
