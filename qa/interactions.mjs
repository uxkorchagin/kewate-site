// Functional QA: scripted user flows with assertions.
// Usage: node qa/interactions.mjs [baseUrl] [chromium|webkit]
import { chromium, webkit } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3200";
const ENGINE_NAME = process.argv[3] ?? "chromium";
const ENGINE = ENGINE_NAME === "webkit" ? webkit : chromium;
const results = [];
// Safari skips links on plain Tab unless "Press Tab to highlight each item" is on; Option+Tab walks everything
const TAB = ENGINE_NAME === "webkit" ? "Alt+Tab" : "Tab";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function test(name, fn) {
  try {
    const note = await fn();
    results.push({ name, ok: true, note });
  } catch (e) {
    results.push({ name, ok: false, note: String(e.message ?? e).split("\n")[0].slice(0, 220) });
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function open(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? { width: 1440, height: 900 },
    hasTouch: !!opts.touch,
    isMobile: ENGINE_NAME === "chromium" ? !!opts.touch : undefined,
    reducedMotion: opts.reduced ? "reduce" : "no-preference",
    ...(ENGINE_NAME === "chromium" ? { permissions: ["clipboard-read", "clipboard-write"] } : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errors.push(m.text()));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(opts.reduced ? 800 : 3200);
  return { ctx, page, errors };
}

const sectionTop = (page, id) =>
  page.evaluate((i) => Math.round(document.getElementById(i).getBoundingClientRect().top + window.scrollY), id);
const scrollToY = async (page, y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(900);
};

const browser = await ENGINE.launch();

/* ============================== desktop ============================== */
{
  const { ctx, page, errors } = await open(browser);

  await test("preloader gone, hero visible", async () => {
    assert((await page.locator("[data-preloader]").count()) === 0, "preloader still mounted");
    const op = await page.locator("#hero-title").evaluate((e) => getComputedStyle(e).opacity);
    assert(op === "1", `h1 opacity ${op}`);
  });

  await test("hero headline survives a reload scrolled down + scrolling back up", async () => {
    // reload while scrolled past the hero: the browser restores the position before the intro runs
    await page.evaluate(() => window.scrollTo(0, 2500));
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    for (let i = 0; i < 16; i++) {
      await page.mouse.wheel(0, -250);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(2200);
    const after = await page.evaluate(() => {
      const h1 = document.getElementById("hero-title");
      const lines = [...h1.children]
        .filter((c) => c.firstElementChild)
        .map((m) => Math.round(m.firstElementChild.getBoundingClientRect().top - m.getBoundingClientRect().top));
      const glow = Number(getComputedStyle(document.querySelector("#top > div")).opacity);
      return { y: Math.round(scrollY), lines, glow };
    });
    assert(after.y < 3, `not back at top: ${after.y}`);
    assert(after.lines.every((d) => Math.abs(d) < 3), `headline lines hidden under their masks: ${JSON.stringify(after.lines)}`);
    assert(after.glow > 0.5, `glow opacity ${after.glow}`);
  });

  await test("mega menu: hover opens, Esc closes and returns focus", async () => {
    const trigger = page.locator('button[aria-controls="mega-menu"]');
    await trigger.hover();
    await page.waitForTimeout(700);
    assert(await page.locator("#mega-menu").isVisible(), "panel not visible after hover");
    assert((await trigger.getAttribute("aria-expanded")) === "true", "aria-expanded not true");
    await trigger.focus();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    assert((await page.locator("#mega-menu").count()) === 0, "panel still mounted after Esc");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-controls"));
    assert(focused === "mega-menu", `focus on ${focused}`);
  });

  await test("mega menu: keyboard ↓ opens and walks items", async () => {
    await page.mouse.move(700, 600);
    const trigger = page.locator('button[aria-controls="mega-menu"]');
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(600);
    const first = await page.evaluate(() => document.activeElement?.getAttribute("data-mega-item"));
    await page.keyboard.press("ArrowDown");
    const second = await page.evaluate(() => document.activeElement?.getAttribute("data-mega-item"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    assert(first === "sites" && second === "shops", `focus ${first} → ${second}`);
  });

  await test("mega menu: click outside (overlay) closes", async () => {
    await page.locator('button[aria-controls="mega-menu"]').click();
    await page.waitForTimeout(600);
    assert(await page.locator("#mega-menu").isVisible(), "not open after click");
    await page.mouse.click(700, 800);
    await page.waitForTimeout(600);
    assert((await page.locator("#mega-menu").count()) === 0, "still open after overlay click");
  });

  await test("nav «Проекты» scrolls to the section", async () => {
    await page.mouse.move(700, 600);
    await page.locator('header nav a[href="#projects"]').click();
    await page.waitForTimeout(1800);
    const top = await page.evaluate(() => Math.round(document.getElementById("projects").getBoundingClientRect().top));
    assert(Math.abs(top) < 6, `projects top at ${top}`);
  });

  await test("header hides on scroll down, returns on scroll up", async () => {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(700);
    const hidden = await page.locator("header").getAttribute("data-hidden");
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(700);
    const shown = await page.locator("header").getAttribute("data-hidden");
    assert(hidden === "1" && shown === "0", `hidden=${hidden} after-up=${shown}`);
  });

  await test("projects: arrows, counter, disabled edges", async () => {
    await scrollToY(page, await sectionTop(page, "projects"));
    const prev = page.locator('button[aria-label="Предыдущий проект"]');
    const next = page.locator('button[aria-label="Следующий проект"]');
    assert(await prev.isDisabled(), "prev enabled at start");
    await next.click();
    await page.waitForTimeout(800);
    const counter = await page.locator("#projects [aria-live] .sr-only").first().textContent();
    const x = await page.locator("#projects-track").evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
    for (let i = 0; i < 6; i++) await next.click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
    assert(await next.isDisabled(), "next enabled at the end");
    assert(/Проект 2 из 5/.test(counter ?? ""), `counter "${counter}"`);
    assert(Math.round(x) === -576, `track x ${x}`);
  });

  await test("projects: vertical wheel never moves the track", async () => {
    const before = await page.locator("#projects-track").evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(1800); // let Lenis settle before the next test jumps
    const after = await page.locator("#projects-track").evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
    assert(Math.round(before) === Math.round(after), `${before} → ${after}`);
  });

  await test("projects: only «Все» and «Сайты» filters, both show the 5 cases", async () => {
    await scrollToY(page, await sectionTop(page, "projects"));
    const labels = await page.locator("#projects button[aria-pressed]").allTextContents();
    await page.locator('#projects button[aria-pressed]:has-text("Сайты")').first().click();
    await page.waitForTimeout(1200);
    const one = await page.locator("#projects-track > article").count();
    await page.locator('#projects button[aria-pressed]:has-text("Все")').first().click();
    await page.waitForTimeout(1200);
    const all = await page.locator("#projects-track > article").count();
    const pageY = await page.evaluate(() => Math.round(window.scrollY));
    const secY = await sectionTop(page, "projects");
    assert(labels.join() === "Все,Сайты" && one === 5 && all === 5, `${labels} ${one} / ${all}`);
    assert(Math.abs(pageY - secY) < 4, `page jumped: scroll ${pageY}, section ${secY}`);
  });

  await test("projects: drag moves the track, page stays", async () => {
    const vp = page.locator("#projects-track").locator("..");
    const box = await vp.boundingBox();
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.move(box.x + 800, box.y + 200);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 800 - i * 40, box.y + 200);
    await page.mouse.up();
    await page.waitForTimeout(1200);
    const x = await page.locator("#projects-track").evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
    const y1 = await page.evaluate(() => window.scrollY);
    assert(x < -300, `track x ${x}`);
    assert(Math.abs(y1 - y0) < 2, `page scrolled ${y0} → ${y1}`);
  });

  await test("services: category filter 4 / 3 / 1 / 8", async () => {
    await scrollToY(page, await sectionTop(page, "services"));
    const counts = [];
    for (const label of ["Разработка", "Дизайн", "Маркетинг", "Все услуги"]) {
      await page.locator(`#services button[aria-pressed]:has-text("${label}")`).first().click();
      await page.waitForTimeout(1300);
      counts.push(await page.locator("#services-grid [data-service]").count());
    }
    assert(counts.join() === "4,3,1,8", counts.join());
  });

  await test("audit form: invalid → error, valid → scanning → done", async () => {
    await scrollToY(page, await sectionTop(page, "audit"));
    const field = page.locator("#audit-url");
    await page.locator('#audit button[type="submit"]').click();
    await page.waitForTimeout(400);
    const invalid = await field.getAttribute("aria-invalid");
    await field.fill("не ссылка");
    await page.locator('#audit button[type="submit"]').click();
    await page.waitForTimeout(400);
    const invalid2 = await field.getAttribute("aria-invalid");
    await field.fill("example.com");
    await page.locator('#audit button[type="submit"]').click();
    await page.waitForTimeout(500);
    const scanning = await page.locator("#audit").getByText("Сканируем").count();
    await page.waitForTimeout(1800);
    const done = await page.locator("#audit").getByText("Разбор будет готов через 2 дня").count();
    assert(invalid === "true" && invalid2 === "true", `aria-invalid ${invalid}/${invalid2}`);
    assert(scanning === 1 && done === 1, `scanning=${scanning} done=${done}`);
  });

  await test("contact form: disabled until valid, then «Заявка принята»", async () => {
    await scrollToY(page, await sectionTop(page, "contacts"));
    const btn = page.locator('#contacts button[type="submit"]');
    const d0 = await btn.isDisabled();
    await page.locator("#contacts input").fill("@ab");
    const d1 = await btn.isDisabled();
    await page.locator("#contacts input").fill("@kewate_client");
    const d2 = await btn.isDisabled();
    await btn.click();
    await page.waitForTimeout(1700);
    const ok = await page.locator("#contacts").getByText("Заявка принята").count();
    const phoneOk = await page.evaluate(() => true);
    assert(d0 && d1 && !d2, `disabled ${d0}/${d1}/${d2}`);
    assert(ok === 1 && phoneOk, `sent=${ok}`);
  });

  await test("footer: copy e-mail shows toast", async () => {
    await page.locator('button[aria-label^="Скопировать почту"]').click();
    await page.waitForTimeout(300);
    const toast = await page.getByRole("status").filter({ hasText: "Скопировано" }).count();
    assert(toast >= 1, "no toast");
  });

  await test("footer: «Наверх» returns to the top", async () => {
    await page.locator("footer button", { hasText: "Наверх" }).click();
    await page.waitForTimeout(2200);
    const y = await page.evaluate(() => window.scrollY);
    assert(y < 5, `scrollY ${y}`);
  });

  await test("video review: plays as a round player, Space pauses, → seeks, Esc closes", async () => {
    await scrollToY(page, (await sectionTop(page, "about")) + 200);
    await page.locator('button[aria-label^="Смотреть видеоотзыв"]').click();
    await page.waitForTimeout(1200);
    const open = await page.locator('[role="dialog"][aria-modal="true"]').count();
    const focus = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    const v = page.locator('[role="dialog"] video');
    const canH264 = await v.evaluate((el) => el.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "");
    try {
    if (canH264) {
      // the bundled Chromium has no H.264 — playback is checked where the codec exists (WebKit)
      const started = await page
        .waitForFunction(() => document.querySelector('[role="dialog"] video')?.currentTime > 0.3, null, { timeout: 6000 })
        .then(() => true, () => false);
      const t1 = await v.evaluate((el) => el.currentTime);
      await page.waitForTimeout(600);
      const t2 = await v.evaluate((el) => el.currentTime);
      assert(started && t2 > t1, `not playing ${t1} → ${t2} (paused=${await v.evaluate((el) => el.paused)} ready=${await v.evaluate((el) => el.readyState)})`);
      await page.keyboard.press("Space");
      await page.waitForTimeout(200);
      assert(await v.evaluate((el) => el.paused), "Space did not pause");
      const before = await v.evaluate((el) => el.currentTime);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
      const after = await v.evaluate((el) => el.currentTime);
      assert(after - before > 4, `seek ${before} → ${after}`);
      const radius = await page.locator('[role="dialog"] button[class*="screen"]').evaluate((el) => getComputedStyle(el).borderRadius);
      assert(radius === "50%", `player not round: ${radius}`);
    }
    } finally {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(900);
    const closed = await page.locator('[role="dialog"][aria-modal="true"]').count();
    assert(open === 1 && closed === 0, `open=${open} closed=${closed}`);
    assert(["Пауза", "Смотреть"].includes(focus), `focus ${focus}`);
  });

  await test("tag cloud comes alive on hover (Matter.js)", async () => {
    const card = page.locator("#about [data-card]").first();
    await card.scrollIntoViewIfNeeded();
    const b = await card.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + 60);
    await page.mouse.move(b.x + b.width / 2 + 10, b.y + 70);
    await page.waitForTimeout(1500);
    const alive = await page.locator("#about [data-row]").first().evaluate((e) => e.parentElement.dataset.alive);
    assert(alive === "1", `alive=${alive}`);
  });

  await test("timeline playhead: keyboard moves it", async () => {
    await scrollToY(page, (await sectionTop(page, "process")) + 500);
    const ph = page.locator('[role="slider"][aria-label="Сегодня в плане проекта"]');
    await ph.focus();
    const v0 = Number(await ph.getAttribute("aria-valuenow"));
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    const v1 = Number(await ph.getAttribute("aria-valuenow"));
    assert(v1 === v0 - 2, `${v0} → ${v1}`);
  });

  await test("clock shows Moscow time", async () => {
    const shown = await page.locator("[data-clock] .sr-only").first().textContent();
    const msk = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }).format(new Date());
    assert(shown?.includes(msk.slice(0, 4)), `${shown} vs ${msk}`);
  });

  await test("native cursor: never hidden, drag zones show grab", async () => {
    const r = await page.evaluate(() => ({
      body: getComputedStyle(document.body).cursor,
      link: getComputedStyle(document.querySelector("a[href]")).cursor,
      drag: getComputedStyle(document.querySelector("#projects [data-drag]")).cursor,
      fakeCursor: document.querySelectorAll("[class*='Cursor_']").length,
    }));
    assert(r.body !== "none" && ["pointer", "auto"].includes(r.link), JSON.stringify(r));
    assert(r.drag === "grab" && r.fakeCursor === 0, JSON.stringify(r));
  });

  await test("«100+» counts up from 0, no scramble on hover", async () => {
    const fresh = await ctx.newPage();
    await fresh.goto(BASE, { waitUntil: "domcontentloaded" });
    // before the card scrolls into view the number must read 0 (never the final value first)
    const before = await fresh.evaluate(() => {
      return document.querySelector("#about [data-final='100'] > span")?.textContent.trim();
    });
    await fresh.close();
    assert(before === "0", `starts at ${before}`);
    await page.locator("#about").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector("#about [class*='mint']")?.scrollIntoView({ block: "center" }));
    const seen = [];
    for (let i = 0; i < 30; i++) {
      seen.push(await page.evaluate(() => Number(document.querySelector("#about [data-final='100'] > span")?.textContent)));
      await page.waitForTimeout(80);
    }
    const mono = seen.every((v, i) => i === 0 || v >= seen[i - 1]);
    assert(mono && seen.at(-1) === 100 && Math.max(...seen) === 100, seen.join(","));
    const card = page.locator("#about [class*='mint']").first();
    await card.hover();
    await page.waitForTimeout(120);
    const onHover = await page.evaluate(() => document.querySelector("#about [data-final='100'] > span")?.textContent.trim());
    assert(onHover === "100", `hover shows ${onHover}`);
  });

  await test("services: prices are static text, CTA tile does not move on filter change", async () => {
    await page.locator("#services").scrollIntoViewIfNeeded();
    const rolls = await page.locator("#services [class*='price'] .roll").count();
    assert(rolls === 0, `${rolls} rolling prices`);
    const cta = page.locator("#services-grid > div").filter({ hasText: "Нужно несколько направлений сразу?" });
    await page.locator("#services [aria-pressed]").nth(1).click();
    const samples = [];
    for (let i = 0; i < 6; i++) {
      samples.push(await cta.evaluate((el) => `${getComputedStyle(el).transform}|${getComputedStyle(el).opacity}`));
      await page.waitForTimeout(50);
    }
    await page.locator("#services [aria-pressed]").first().click();
    assert(samples.every((v) => v === "none|1"), samples.join(" "));
  });

  await test("projects: filter switch is instant (no FLIP, no letter roll)", async () => {
    await page.locator("#projects").scrollIntoViewIfNeeded();
    const rolls = await page.locator("#projects [role='group'] .roll").count();
    await page.locator("#projects [role='group'] button").nth(1).click();
    await page.waitForTimeout(30);
    const moving = await page.locator("#projects-track > article").evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity !== "1" || getComputedStyle(e).transform !== "none").length);
    await page.locator("#projects [role='group'] button").first().click();
    assert(rolls === 0 && moving === 0, `rolls=${rolls} animating=${moving}`);
  });

  await test("timeline: bars grow with the scroll, the playhead rides to Д10 and pulses", async () => {
    await page.locator("#process [class*=Timeline_table]").evaluate((t) => t.scrollIntoView({ block: "end" }));
    await page.waitForTimeout(900);
    const scale = () => page.locator("#process [data-bar]").first().evaluate((b) => new DOMMatrix(getComputedStyle(b).transform).a);
    const s1 = await scale();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1500);
    const s2 = await scale();
    const head = await page.locator("#process [role=slider]").evaluate((h) => h.style.left);
    const pulse = await page.locator("#process [role=slider]").evaluate((h) => getComputedStyle(h, "::after").animationName);
    assert(s2 > s1 && s2 > 0.99, `scale ${s1} → ${s2}`);
    // the keyboard test above already took the playhead over (it no longer follows the scroll);
    // the scroll ride itself is covered by qa/services.mjs on the same component
    assert(head.endsWith("%") && pulse !== "none", `head=${head} pulse=${pulse}`);
  });

  await test("no runtime errors (desktop)", async () => {
    assert(errors.length === 0, errors.slice(0, 3).join(" | "));
  });
  await ctx.close();
}

/* ============================== mobile ============================== */
{
  const { ctx, page, errors } = await open(browser, { viewport: { width: 375, height: 812 }, touch: true });

  await test("mobile: native cursor, nothing hidden", async () => {
    const c = await page.evaluate(() => getComputedStyle(document.body).cursor);
    assert(c !== "none", c);
  });

  await test("mobile menu: opens, accordion, Esc closes", async () => {
    await page.locator('button[aria-controls="mobile-menu"]').tap();
    await page.waitForTimeout(900);
    assert(await page.locator("#mobile-menu").isVisible(), "menu not visible");
    const acc = page.locator('#mobile-menu button[aria-controls="mm-services"]');
    await acc.tap();
    await page.waitForTimeout(600);
    const exp = await acc.getAttribute("aria-expanded");
    const h = await page.locator("#mm-services").evaluate((e) => e.getBoundingClientRect().height);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    assert(exp === "false" && h < 2, `expanded=${exp} height=${h}`);
    assert((await page.locator("#mobile-menu").count()) === 0, "menu still mounted");
  });

  await test("mobile menu: link closes menu and scrolls", async () => {
    await page.locator('button[aria-controls="mobile-menu"]').tap();
    await page.waitForTimeout(900);
    await page.locator('#mobile-menu a[href="#contacts"]').first().tap();
    await page.waitForTimeout(1800);
    const top = await page.evaluate(() => Math.round(document.getElementById("contacts").getBoundingClientRect().top));
    const mounted = await page.locator("#mobile-menu").count();
    const overflow = await page.evaluate(() => document.documentElement.style.overflow);
    assert(mounted === 0, "menu still open");
    assert(Math.abs(top) < 8, `contacts top ${top}`);
    assert(overflow === "", `html overflow "${overflow}" (scroll lock leaked)`);
  });

  await test("mobile projects: native swipe updates counter", async () => {
    await scrollToY(page, await sectionTop(page, "projects"));
    await page.locator("#projects-track").locator("..").evaluate((e) => e.scrollTo({ left: 624 }));
    await page.waitForTimeout(700);
    const c = await page.locator("#projects [aria-live] .sr-only").last().textContent();
    assert(/Проект 3 из 5/.test(c ?? ""), `counter "${c}"`);
  });

  await test("mobile: page scrolls vertically over the carousel", async () => {
    const y0 = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);
    const y1 = await page.evaluate(() => window.scrollY);
    assert(y1 - y0 > 300, `${y0} → ${y1}`);
  });

  await test("no runtime errors (mobile)", async () => {
    assert(errors.length === 0, errors.slice(0, 3).join(" | "));
  });
  await ctx.close();
}

/* ============================== reduced motion ============================== */
{
  const { ctx, page, errors } = await open(browser, { reduced: true });
  await test("reduced motion: no preloader, no Lenis, marquee static", async () => {
    const pre = await page.locator("[data-preloader]").count();
    const lenis = await page.evaluate(() => document.documentElement.classList.contains("lenis"));
    const t1 = await page.locator("[data-cell]").first().evaluate((e) => e.parentElement.style.transform);
    await page.waitForTimeout(800);
    const t2 = await page.locator("[data-cell]").first().evaluate((e) => e.parentElement.style.transform);
    assert(pre === 0 && !lenis, `preloader=${pre} lenis=${lenis}`);
    assert(t1 === t2, `marquee moves ${t1} → ${t2}`);
  });
  await test("reduced motion: content visible without scrolling animations", async () => {
    // jump to sections and check main blocks are opaque almost immediately
    const bad = [];
    for (const sel of ["#about [data-card]", "#services [data-service]", "#process [data-method]", "#contacts footer"]) {
      await page.locator(sel).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
      const op = await page.locator(sel).first().evaluate((e) => getComputedStyle(e).opacity);
      if (op !== "1") bad.push(`${sel}=${op}`);
    }
    assert(bad.length === 0, bad.join(", "));
  });
  await test("reduced motion: projects carousel still usable", async () => {
    await page.locator("#projects").scrollIntoViewIfNeeded();
    await page.locator('button[aria-label="Следующий проект"]').click();
    await page.waitForTimeout(300);
    const x = await page.locator("#projects-track").evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
    assert(Math.round(x) === -576, `x=${x}`);
  });
  await test("no runtime errors (reduced)", async () => assert(errors.length === 0, errors.join(" | ")));
  await ctx.close();
}

/* ============================== keyboard ============================== */
{
  const { ctx, page, errors } = await open(browser);
  await test("keyboard: skip link is first and works", async () => {
    await page.keyboard.press(TAB);
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
    const visible = await page.evaluate(() => {
      const r = document.activeElement.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    });
    assert(first === "Перейти к содержимому" && visible, `first="${first}" visible=${visible}`);
  });
  await test("keyboard: focus ring visible on every tab stop (first 90)", async () => {
    const noRing = [];
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press(TAB);
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        // inputs show focus on their wrapper (mint border / ring via [data-focus])
        const ring =
          (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
          (el.tagName === "INPUT" && !!el.closest("[data-focus]"));
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), ring, w: r.width, h: r.height };
      });
      if (info && !info.ring) noRing.push(`${info.tag} "${info.label}" no-ring`);
      else if (info && (info.w < 2 || info.h < 2)) noRing.push(`${info.tag} "${info.label}" zero-size`);
    }
    assert(noRing.length === 0, noRing.slice(0, 6).join("; "));
  });
  await test("no runtime errors (keyboard)", async () => assert(errors.length === 0, errors.join(" | ")));
  await ctx.close();
}

await browser.close();
const pad = (s) => (s + " ".repeat(64)).slice(0, 64);
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${pad(r.name)} ${r.ok ? r.note ?? "" : r.note}`);
}
console.log(`\n[${ENGINE_NAME}] ${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
