// Smoke QA: console/page errors, failed requests, horizontal overflow, section geometry.
// Usage: node qa/smoke.mjs [baseUrl] [outDir]
import { chromium, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3200";
const OUT = process.argv[3] ?? "qa/out";
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "375", width: 375, height: 812, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: true },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
];

const report = [];

for (const [engineName, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: engineName === "chromium" ? !!vp.mobile : undefined,
      hasTouch: !!vp.mobile,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 200)}`));
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
    page.on("requestfailed", (r) => errors.push(`requestfailed: ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
    page.on("response", (r) => r.status() >= 400 && errors.push(`http ${r.status()}: ${r.url().slice(0, 120)}`));

    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(3500); // preloader + intro

    // scroll through the whole page like a user
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += Math.round(vp.height * 0.6)) {
      await page.mouse.wheel(0, Math.round(vp.height * 0.6));
      await page.waitForTimeout(160);
    }
    await page.waitForTimeout(1500);

    const geo = await page.evaluate(() => {
      const ids = ["top", "about", "projects", "services", "audit", "process", "contacts"];
      const sections = Object.fromEntries(
        ids.map((id) => {
          const el = document.getElementById(id);
          return [id, el ? Math.round(el.getBoundingClientRect().height) : null];
        }),
      );
      // elements sticking out horizontally (ignores intentional scrollers)
      const vw = document.documentElement.clientWidth;
      const offenders = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > vw + 1 || r.left < -1) {
          let p = el.parentElement;
          let clipped = false;
          while (p && p !== document.body) {
            const cs = getComputedStyle(p);
            if (cs.overflowX !== "visible" || cs.overflow !== "visible") {
              clipped = true;
              break;
            }
            p = p.parentElement;
          }
          if (!clipped) offenders.push(`${el.tagName}.${String(el.className).slice(0, 40)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
        }
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: vw,
        docHeight: document.documentElement.scrollHeight,
        sections,
        offenders: offenders.slice(0, 8),
        headerTheme: document.querySelector("header")?.dataset.theme,
      };
    });

    await page.screenshot({ path: path.join(OUT, `${engineName}-${vp.name}-bottom.png`) });
    report.push({ engine: engineName, viewport: vp.name, ...geo, errors: [...new Set(errors)].slice(0, 15) });
    await ctx.close();
  }
  await browser.close();
}

fs.writeFileSync(path.join(OUT, "smoke.json"), JSON.stringify(report, null, 2));
for (const r of report) {
  const overflow = r.scrollWidth > r.clientWidth ? `OVERFLOW ${r.scrollWidth}>${r.clientWidth}` : "no-overflow";
  console.log(`${r.engine} ${r.viewport}: ${overflow} doc=${r.docHeight} errors=${r.errors.length}`);
  r.errors.forEach((e) => console.log("   ", e));
  r.offenders.forEach((o) => console.log("    offender", o));
}
