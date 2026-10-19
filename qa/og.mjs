// Renders public/og.png (1200×630) from the live hero. Usage: node qa/og.mjs [baseUrl]
import { chromium } from "playwright";
const BASE = process.argv[2] ?? "http://localhost:3200";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
await p.goto(BASE, { waitUntil: "networkidle" });
await p.addStyleTag({
  content: `header nav, header .swap-host, header button{display:none!important} header::before{opacity:0!important} #top{height:630px!important} #top [data-marquee]{display:none!important}
  #top > div:nth-of-type(3){top:190px!important}`,
});
await p.waitForTimeout(800);
await p.screenshot({ path: "public/og.png" });
await b.close();
console.log("public/og.png written");
