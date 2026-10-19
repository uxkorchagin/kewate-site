// Section-by-section viewport screenshots for visual review.
// Usage: node qa/sections.mjs [baseUrl] [outDir] [engine] [widths comma separated]
import { chromium, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3200";
const OUT = process.argv[3] ?? "qa/out/sections";
const ENGINE = (process.argv[4] ?? "chromium") === "webkit" ? webkit : chromium;
const WIDTHS = (process.argv[5] ?? "768,1024").split(",").map(Number);
fs.mkdirSync(OUT, { recursive: true });

const browser = await ENGINE.launch();
for (const w of WIDTHS) {
  const h = w < 768 ? 812 : w < 1100 ? 1024 : 900;
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 400) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);
  const shots = await page.evaluate((vh) => {
    const out = [];
    for (const id of ["top", "about", "projects", "services", "audit", "process", "contacts"]) {
      const el = document.getElementById(id);
      const top = el.getBoundingClientRect().top + window.scrollY;
      const hgt = el.offsetHeight;
      for (let off = 0, i = 0; off < hgt; off += vh - 80, i++) out.push({ id, i, y: Math.round(top + off) });
    }
    return out;
  }, h);
  for (const s of shots) {
    await page.evaluate((y) => window.scrollTo(0, y), s.y);
    await page.waitForTimeout(1100);
    await page.screenshot({ path: path.join(OUT, `${w}-${s.id}-${s.i}.png`) });
  }
  await ctx.close();
}
await browser.close();
console.log("done", fs.readdirSync(OUT).length, "shots");
