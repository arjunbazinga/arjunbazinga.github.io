// Runs after every `quarto render` (wired up under `project.post-render` in
// _quarto.yml). Quarto executes it with its bundled Deno, so it needs nothing
// installed and imports nothing.
//
// It does three things to the rendered site:
//
// 1. Rewrites the redirect pages Quarto generates for `aliases:` front matter.
//    GitHub Pages cannot send HTTP 301s, and Quarto's stock page redirects with
//    JavaScript alone. Search engines treat an instant meta refresh plus a
//    canonical link as a permanent redirect, so each page gets both, and keeps
//    a script so `#section` and `?query` survive the hop.
// 2. Publishes the RSS feed at /feed.xml as well as /index.xml. /feed.xml was
//    the feed address on the pre-2024 Jekyll site and readers still poll it.
// 3. Lists directory URLs in sitemap.xml (`/posts/x/`, not `/posts/x/index.html`)
//    so the sitemap agrees with each page's canonical link.

const out = Deno.env.get("QUARTO_PROJECT_OUTPUT_DIR") ?? "_site";
const config = await Deno.readTextFile("_quarto.yml");
const site = (config.match(/site-url:\s*["']?([^"'\s]+)/)?.[1] ?? "").replace(/\/$/, "");
if (!site) throw new Error("post-render: no site-url in _quarto.yml");

// Large asset trees that never contain pages.
const skip = new Set(["static", "site_libs"]);

async function* htmlFiles(dir: string, top = true): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      if (!(top && skip.has(entry.name))) yield* htmlFiles(path, false);
    } else if (entry.name.endsWith(".html")) {
      yield path;
    }
  }
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Resolve a redirect target (relative to the stub) to a root-relative path,
// dropping a trailing index.html so it matches the canonical form.
function resolve(stub: string, target: string): string {
  const from = new URL(encodeURI(stub.slice(out.length)), `${site}/`);
  const url = new URL(target, from);
  return url.pathname.replace(/\/index\.html$/, "/") + url.search + url.hash;
}

function redirectPage(targets: Record<string, string>): string {
  const main = targets[""];
  const absolute = escapeHtml(site + main);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>This page has moved</title>
<link rel="canonical" href="${absolute}">
<script>
  // Keep any #section and ?query from the old address.
  var targets = ${JSON.stringify(targets).replace(/</g, "\\u003c")};
  var hash = location.hash.slice(1);
  var target = targets[hash] || targets[""] + location.hash;
  location.replace(target.replace(/(#.*)?$/, location.search + "$1"));
</script>
<meta http-equiv="refresh" content="0; url=${escapeHtml(main)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<p>This page has moved to <a href="${escapeHtml(main)}">${absolute}</a>.</p>
</body>
</html>
`;
}

let redirects = 0;
for await (const path of htmlFiles(out)) {
  const html = await Deno.readTextFile(path);
  if (!html.includes("<title>Redirect</title>")) continue;
  const map = html.match(/var redirects = (\{.*?\});/s)?.[1];
  if (!map) continue;
  const raw = JSON.parse(map) as Record<string, string>;
  if (!raw[""]) continue;
  const targets: Record<string, string> = {};
  for (const [hash, target] of Object.entries(raw)) targets[hash] = resolve(path, target);
  await Deno.writeTextFile(path, redirectPage(targets));
  redirects++;
}

await Deno.copyFile(`${out}/index.xml`, `${out}/feed.xml`);

const sitemapPath = `${out}/sitemap.xml`;
const sitemap = await Deno.readTextFile(sitemapPath);
await Deno.writeTextFile(sitemapPath, sitemap.replace(/\/index\.html<\/loc>/g, "/</loc>"));

console.log(`post-render: ${redirects} redirect pages, feed.xml, sitemap.xml`);
