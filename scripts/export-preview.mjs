// Turns the static export (out/) into a self-contained preview with relative paths, so it can be
// hosted under any sub-path (claude.ai artifact, a folder on shared hosting, a file server).
//   STATIC_EXPORT=1 npx next build && node scripts/export-preview.mjs
// Output: preview/ — site.html is the page, index.html just forwards to it.
import fs from "node:fs";
import path from "node:path";

const SRC = "out";
const DST = "preview";
// some hosts reserve names starting with "_" (claude.ai artifacts): --assets=kw renames _next/
const ASSETS = (process.argv.find((a) => a.startsWith("--assets=")) ?? "--assets=_next").split("=")[1];
fs.rmSync(DST, { recursive: true, force: true });
fs.cpSync(SRC, DST, { recursive: true });

const relativize = (s) =>
  s
    .replaceAll("/_next/", "_next/")
    .replaceAll('"/images/', '"images/')
    .replaceAll("\\\"/images/", '\\"images/')
    .replaceAll('"/video/', '"video/')
    .replaceAll('"/icon.svg"', '"icon.svg"')
    .replaceAll('"/og.png"', '"og.png"');

// 0. no image server on static hosting: ship the case mockups as WebP instead of 700KB PNGs
const { default: sharp } = await import("sharp");
const converted = [];
for (const f of fs.readdirSync(path.join(DST, "images"))) {
  if (!/^case-\d+\.png$/.test(f)) continue;
  const from = path.join(DST, "images", f);
  const to = from.replace(/\.png$/, ".webp");
  await sharp(from).resize({ width: 1200 }).webp({ quality: 80, alphaQuality: 90 }).toFile(to);
  fs.rmSync(from);
  converted.push(f);
}

// service pages move next to the main page («uslugi-<slug>.html»), so every relative path stays the same
const slugs = fs.existsSync(path.join(SRC, "uslugi"))
  ? fs.readdirSync(path.join(SRC, "uslugi")).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5))
  : [];
const pageLinks = (s) => {
  for (const slug of slugs) s = s.replaceAll(`"/uslugi/${slug}"`, `"uslugi-${slug}.html"`).replaceAll(`\\"/uslugi/${slug}\\"`, `\\"uslugi-${slug}.html\\"`);
  return s;
};

// 1. the pages
for (const f of fs.readdirSync(path.join(DST, "_next/static/chunks"))) if (/^polyfills/.test(f)) fs.rmSync(path.join(DST, "_next/static/chunks", f));
const page = (from, to, isService) => {
  let html = pageLinks(relativize(fs.readFileSync(path.join(SRC, from), "utf8")));
  for (const f of converted) html = html.replaceAll(`images/${f}`, `images/${f.replace(/\.png$/, ".webp")}`);
  // legacy-browser polyfills (noModule) are skipped by every modern browser; keep the preview lean
  html = html.replace(/<script src="[^"]*polyfills-[^"]*\.js" noModule=""><\/script>/, "");
  // a preview is not the canonical site: keep crawlers away
  html = html.replace("<head>", '<head><meta name="robots" content="noindex"/>');
  // the logo of a service page leads to the main page
  if (isService) html = html.replaceAll('href="/"', 'href="site.html"').replaceAll('\\"home\\":\\"/\\"', '\\"home\\":\\"site.html\\"');
  fs.writeFileSync(path.join(DST, to), html);
};
page("index.html", "site.html", false);
for (const slug of slugs) page(`uslugi/${slug}.html`, `uslugi-${slug}.html`, true);
fs.rmSync(path.join(DST, "uslugi"), { recursive: true, force: true });
fs.rmSync(path.join(DST, "uslugi.txt"), { force: true });

// 2. stylesheets: font urls point at ../media/ from _next/static/css/
for (const f of fs.readdirSync(path.join(DST, "_next/static/css"))) {
  const p = path.join(DST, "_next/static/css", f);
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replaceAll("url(/_next/static/media/", "url(../media/"));
}

// 3. webpack public path (lazy chunks such as Matter.js)
const chunksDir = path.join(DST, "_next/static/chunks");
for (const f of fs.readdirSync(chunksDir, { recursive: true })) {
  if (!String(f).endsWith(".js")) continue;
  const p = path.join(chunksDir, String(f));
  let js = fs.readFileSync(p, "utf8");
  const before = js;
  js = js.replace('.p="/_next/"', '.p="_next/"');
  // content data (cases, review poster) is compiled into client chunks
  for (const f of converted) js = js.replaceAll(`"/images/${f}"`, `"images/${f.replace(/\.png$/, ".webp")}"`);
  js = pageLinks(js.replaceAll('"/images/', '"images/').replaceAll('"/video/', '"video/'));
  js = js.replace(/home:"\/"/g, 'home:"site.html"');
  if (js !== before) fs.writeFileSync(p, js);
}

// 4. optional rename of the asset folder
if (ASSETS !== "_next") {
  fs.renameSync(path.join(DST, "_next"), path.join(DST, ASSETS));
  const walkAll = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkAll(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const p of walkAll(DST).filter((f) => /\.(html|css|js)$/.test(f))) {
    const t = fs.readFileSync(p, "utf8");
    const u = t.replaceAll('"_next/', `"${ASSETS}/`).replaceAll("\\\"_next/", `\\"${ASSETS}/`).replaceAll("(_next/", `(${ASSETS}/`);
    if (u !== t) fs.writeFileSync(p, u);
  }
}

// 4b. dynamic-route chunk folders («[slug]») → plain names: some hosts mangle brackets in paths
{
  const walkDirs = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? [path.join(d, e.name), ...walkDirs(path.join(d, e.name))] : []));
  const bracketed = walkDirs(DST).filter((d) => /\[[^/\\]+\]$/.test(d)).sort((x, y) => y.length - x.length);
  for (const d of bracketed) {
    const name = path.basename(d);
    const plain = name.replace(/^\[|\]$/g, "");
    fs.renameSync(d, path.join(path.dirname(d), plain));
    const walkAll = (x) => fs.readdirSync(x, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkAll(path.join(x, e.name)) : [path.join(x, e.name)]));
    for (const f of walkAll(DST).filter((f) => /\.(html|css|js)$/.test(f))) {
      const t = fs.readFileSync(f, "utf8");
      const enc = encodeURIComponent(name);
      const u = t.replaceAll(`/${enc}/`, `/${plain}/`).replaceAll(`/${name}/page-`, `/${plain}/page-`);
      if (u !== t) fs.writeFileSync(f, u);
    }
  }
}

// 5. drop what a preview does not need
for (const f of ["index.html", "index.txt", "404.html"]) fs.rmSync(path.join(DST, f), { force: true });

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : files.push(path.relative(DST, p));
  }
};
walk(DST);
const left = files
  .filter((f) => /\.(html|css|js)$/.test(f))
  .filter((f) => fs.readFileSync(path.join(DST, f), "utf8").match(/["(]\/(_next\/static|images|video)\//));
console.log(`preview/: ${files.length} files`, left.length ? `\nstill absolute: ${left.join(", ")}` : "(all paths relative)");
fs.writeFileSync(path.join(DST, "files.json"), JSON.stringify(files.filter((f) => f !== "files.json"), null, 1));
