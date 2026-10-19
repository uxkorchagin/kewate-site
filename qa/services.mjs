// Functional QA of the service pages (/uslugi/*): the seven required behaviours + FAQ / banner / modal.
// Usage: node qa/services.mjs [baseUrl] [chromium|webkit]
import { chromium, webkit } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3200";
const ENGINE_NAME = process.argv[3] ?? "chromium";
const ENGINE = ENGINE_NAME === "webkit" ? webkit : chromium;
const results = [];
const MSK = (s) => new Date(s + "+03:00");

async function test(name, fn) {
  try {
    results.push({ name, ok: true, note: await fn() });
  } catch (e) {
    results.push({ name, ok: false, note: String(e.message ?? e).split("\n")[0].slice(0, 220) });
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function open(browser, slug, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? { width: 1440, height: 900 },
    hasTouch: !!opts.touch,
    isMobile: ENGINE_NAME === "chromium" ? !!opts.touch : undefined,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  if (opts.time) await page.clock.install({ time: opts.time });
  await page.goto(`${BASE}/uslugi/${slug}`, { waitUntil: "networkidle" });
  if (opts.time) await page.clock.runFor(4000);
  else await page.waitForTimeout(3200);
  return { ctx, page, errors };
}
const scrollTo = async (page, sel, block = "center") => {
  await page.evaluate(([s, b]) => document.querySelector(s)?.scrollIntoView({ block: b }), [sel, block]);
  await page.waitForTimeout(700);
};
const weeks = (page) =>
  page.$$eval("#slots li", (lis) =>
    lis.map((li) => ({ state: li.dataset.state, text: [...li.querySelectorAll("span")].filter((s) => !s.children.length).map((s) => s.textContent.trim()).join(" | ") })),
  );

const browser = await ENGINE.launch();

/* ---------- 1. free slots: ranges, ISO captions, timer, Monday shift ---------- */
await test("slots on the design date (Wed 21 Oct 09:27 MSK)", async () => {
  const { ctx, page } = await open(browser, "razrabotka-saytov", { time: MSK("2026-10-21T09:27:00") });
  const title = (await page.locator("#slots h3").textContent()).replace(/\s+/g, " ");
  const w = await weeks(page);
  const timer = (await page.locator("#slots [role=timer] .sr-only").first().textContent()).trim();
  await ctx.close();
  assert(title.includes("26 октября – 1 ноября"), title);
  assert(w.length === 5 && w[0].state === "busy" && w[0].text.includes("Октябрь · 43 нед") && w[0].text.includes("Занято"), JSON.stringify(w[0]));
  assert(w[1].state === "current" && /Октябрь · 44 нед.*26–1/.test(w[1].text), JSON.stringify(w[1]));
  const n = w.slice(1, 4).map((x) => Number(x.text.match(/(\d+) мест/)[1]));
  assert(n[0] >= 1 && n[0] <= 3 && n[1] >= 3 && n[1] <= 5 && n[2] >= 6 && n[2] <= 9 && n[0] < n[1] && n[1] < n[2], n.join(","));
  assert(w[4].text.includes("Свободно"), w[4].text);
  assert(timer === "2 дн 14 ч 32 мин", timer);
  return n.join("/");
});

await test("same day → same numbers; later in the week the nearest only goes down", async () => {
  const seats = [];
  for (const t of ["2026-10-19T10:00:00", "2026-10-19T22:00:00", "2026-10-21T12:00:00", "2026-10-23T20:00:00"]) {
    const { ctx, page } = await open(browser, "razrabotka-saytov", { time: MSK(t) });
    const w = await weeks(page);
    seats.push(Number(w.find((x) => x.state === "current").text.match(/(\d+) мест/)[1]));
    await ctx.close();
  }
  assert(seats[0] === seats[1], `same day differs: ${seats}`);
  assert(seats.every((v, i) => i === 0 || v <= seats[i - 1]), `goes up: ${seats}`);
  return seats.join(" → ");
});

await test("after Friday 23:59 the next week becomes nearest; Monday shifts the window", async () => {
  let { ctx, page } = await open(browser, "razrabotka-saytov", { time: MSK("2026-10-24T10:00:00") });
  let w = await weeks(page);
  const sat = (await page.locator("#slots h3").textContent()).replace(/\s+/g, " ");
  await ctx.close();
  assert(w[1].state === "busy" && w[2].state === "current" && sat.includes("2–8 ноября"), `${sat} ${JSON.stringify(w.slice(0, 3))}`);
  ({ ctx, page } = await open(browser, "razrabotka-saytov", { time: MSK("2026-10-26T00:01:00") }));
  w = await weeks(page);
  await ctx.close();
  assert(w[0].text.includes("44 нед") && w[0].state === "busy" && w[4].text.includes("48 нед"), JSON.stringify(w.map((x) => x.text.slice(0, 18))));
});

/* ---------- desktop flows ---------- */
{
  const { ctx, page, errors } = await open(browser, "razrabotka-saytov");

  await test("5. projects filter preselects the page topic", async () => {
    const pressed = await page.locator("#projects [aria-pressed=true]").textContent();
    assert(pressed.trim() === "Сайты", pressed);
  });

  await test("2. sticky bar: hidden on hero, shown after it, hidden over slots / form / footer", async () => {
    const shown = () => page.locator("[class*=StickySlotBar_wrap]").evaluate((e) => e.hasAttribute("data-show"));
    const a = await shown();
    await scrollTo(page, "#about", "start");
    const b = await shown();
    await scrollTo(page, "#slots");
    const c = await shown();
    await scrollTo(page, "#estimate", "start");
    const d = await shown();
    await scrollTo(page, "#contacts");
    const e = await shown();
    assert(!a && b && !c && d && !e, `hero=${a} about=${b} slots=${c} estimate=${d} contacts=${e}`);
  });

  await test("3. every CTA opens the form with the nearest week; a calendar week preselects itself", async () => {
    await scrollTo(page, "#top", "start");
    await page.locator("#top button", { hasText: "Обсудить задачу" }).click();
    await page.waitForTimeout(500);
    const dlg = page.locator("[role=dialog][aria-modal=true]");
    assert((await dlg.count()) === 1, "modal not open");
    const nearest = await page.locator("#slots li[data-state=current] [class*=range]").textContent();
    const checked = await dlg.locator("[role=radio][aria-checked=true]").textContent();
    assert(checked.includes(nearest.trim().split("–")[0]), `${checked} vs ${nearest}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await scrollTo(page, "#slots");
    const open = page.locator("#slots li[data-state=open] button").first();
    const range = (await open.locator("[class*=range]").textContent()).trim();
    await open.click();
    await page.waitForTimeout(500);
    const picked = await page.locator("[role=dialog] [role=radio][aria-checked=true]").textContent();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    assert(picked.includes(range.split("–")[0]), `${picked} vs ${range}`);
    assert((await page.locator("[role=dialog][aria-modal=true]").count()) === 0, "Esc did not close");
  });

  await test("3b. week picker: arrow keys move the choice, the plate follows", async () => {
    await scrollTo(page, "#contacts");
    const radios = page.locator("#contacts [role=radio]");
    const states = () => radios.evaluateAll((r) => r.map((x) => x.getAttribute("aria-checked")).indexOf("true"));
    const i = await states();
    await radios.nth(i).focus();
    await page.keyboard.press(i < 3 ? "ArrowRight" : "ArrowLeft");
    await page.waitForTimeout(400);
    const j = await states();
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-checked"));
    assert(j === (i < 3 ? i + 1 : i - 1) && focused === "true", `${i} → ${j}, focus on checked: ${focused}`);
  });

  await test("4. case preview scrolls the full screenshot on hover, rewinds on leave", async () => {
    await scrollTo(page, "#projects");
    const card = page.locator("#projects article").first();
    await card.hover();
    await page.waitForTimeout(1200);
    const y = await card.locator("img").evaluate((i) => new DOMMatrix(getComputedStyle(i).transform).m42);
    const scale = await card.locator("[class*=CaseCover_window]").evaluate((w) => getComputedStyle(w).scale);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(900);
    const back = await card.locator("img").evaluate((i) => new DOMMatrix(getComputedStyle(i).transform).m42);
    assert(y < -50 && scale === "1.05" && Math.abs(back) < 1, `y=${y} scale=${scale} back=${back}`);
    const lazy = await card.locator("img").getAttribute("loading");
    assert(lazy === "lazy", "screenshot is not lazy");
  });

  await test("6. plan bars grow with the scroll (scrub) and the playhead rides to «today»", async () => {
    await scrollTo(page, "#process [class*=Timeline_table]", "end");
    const s1 = await page.locator("#process [data-bar]").first().evaluate((b) => new DOMMatrix(getComputedStyle(b).transform).a);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1200);
    const s2 = await page.locator("#process [data-bar]").first().evaluate((b) => new DOMMatrix(getComputedStyle(b).transform).a);
    await scrollTo(page, "#faq", "start");
    const last = await page.locator("#process [data-bar]").last().evaluate((b) => new DOMMatrix(getComputedStyle(b).transform).a);
    const head = await page.locator("#process [role=slider]").evaluate((h) => h.style.left);
    assert(s2 > s1 && last > 0.99 && head.startsWith("64.28"), `s1=${s1} s2=${s2} last=${last} head=${head}`);
  });

  await test("7. add-on toggle prints a receipt line and recalculates the total", async () => {
    await scrollTo(page, "#estimate");
    const rows = () => page.locator("#estimate [class*=Estimate_lines] li").count();
    const total = () => page.locator("#estimate [class*=totalValue]").textContent();
    const before = [await rows(), (await total()).trim()];
    await page.locator("#estimate [aria-pressed]").first().click();
    await page.waitForTimeout(800);
    const after = [await rows(), (await total()).trim()];
    const pressed = await page.locator("#estimate [aria-pressed]").first().getAttribute("aria-pressed");
    await page.locator("#estimate [aria-pressed]").first().click();
    await page.waitForTimeout(800);
    const again = [await rows(), (await total()).trim()];
    assert(before[0] === 8 && after[0] === 9 && pressed === "true" && again[0] === 8, `${before} → ${after} → ${again}`);
    assert(before[1] === "от 60 000 ₽" && after[1] === "от [N] ₽" && again[1] === "от 60 000 ₽", `${before[1]} → ${after[1]} → ${again[1]}`);
  });

  await test("FAQ: one item open at a time", async () => {
    await scrollTo(page, "#faq");
    const btns = page.locator("#faq button[aria-expanded]");
    await btns.nth(1).click();
    await page.waitForTimeout(600);
    const st = await btns.evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-expanded")));
    const h = await page.locator("#faq [role=region]").nth(1).evaluate((r) => r.getBoundingClientRect().height);
    assert(st.filter((x) => x === "true").length === 1 && st[1] === "true" && h > 20, `${st} h=${h}`);
  });

  await test("demo banner: × hides it for the session (also after reload)", async () => {
    await scrollTo(page, "#top", "start");
    await page.locator("button[aria-label='Скрыть баннер']").click();
    await page.waitForTimeout(600);
    const off = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--banner-offset").trim());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const hidden = await page.evaluate(() => document.documentElement.classList.contains("demo-hidden"));
    const top = await page.locator("header").evaluate((h) => h.getBoundingClientRect().top);
    assert(off === "0px" && hidden && top === 0, `offset=${off} hidden=${hidden} top=${top}`);
  });

  await test("no runtime errors (desktop)", async () => assert(errors.length === 0, errors.slice(0, 3).join(" | ")));
  await ctx.close();
}

/* ---------- other topics ---------- */
await test("5b. topics without cases fall back to «Все»; only filters with cases are offered", async () => {
  const notes = [];
  for (const slug of ["razrabotka-internet-magazinov", "produktovyy-dizayn"]) {
    const { ctx, page } = await open(browser, slug);
    const pressed = (await page.locator("#projects [aria-pressed=true]").textContent()).trim();
    const filters = await page.locator("#projects [aria-pressed]").allTextContents();
    const cards = await page.locator("#projects article").count();
    await ctx.close();
    assert(pressed === "Все" && cards === 5 && filters.join() === "Все,Сайты", `${slug}: ${pressed} ${cards} ${filters}`);
    notes.push(`${slug}:${cards}`);
  }
  return notes.join(" ");
});

/* ---------- mobile ---------- */
{
  const { ctx, page, errors } = await open(browser, "razrabotka-saytov", { viewport: { width: 375, height: 812 }, touch: true });
  await test("mobile: slot strip starts at the nearest week", async () => {
    await scrollTo(page, "#slots");
    const r = await page.evaluate(() => {
      const ul = document.querySelector("#slots ul");
      const cur = ul.querySelector("[data-state=current]");
      return Math.round(cur.getBoundingClientRect().left - ul.getBoundingClientRect().left);
    });
    assert(r >= 0 && r <= 24, `nearest is ${r}px from the strip edge`);
  });
  await test("4b. mobile: the centred case card scrolls its screenshot", async () => {
    await scrollTo(page, "#projects");
    await page.waitForTimeout(2500);
    const st = await page.locator("#projects article").first().evaluate((a) => ({
      c: a.hasAttribute("data-centered"),
      y: new DOMMatrix(getComputedStyle(a.querySelector("img")).transform).m42,
    }));
    assert(st.c && st.y < -10, JSON.stringify(st));
  });
  await test("mobile: sticky bar spans the width with 16px gaps", async () => {
    await scrollTo(page, "#estimate", "start");
    const r = await page.locator("[class*=StickySlotBar_bar]").evaluate((b) => {
      const x = b.getBoundingClientRect();
      return [Math.round(x.left), Math.round(innerWidth - x.right), b.closest("[data-show]") != null];
    });
    assert(r[0] === 16 && r[1] === 16 && r[2], JSON.stringify(r));
  });
  await test("no runtime errors (mobile)", async () => assert(errors.length === 0, errors.slice(0, 3).join(" | ")));
  await ctx.close();
}

await browser.close();
const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${pad(r.name, 70)} ${r.note ?? ""}`);
console.log(`\n[${ENGINE_NAME}] ${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
