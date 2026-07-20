// Build-time-decoupled diagram generation.
//
// Renders every src/diagrams/*.d2 to a sibling *.svg using D2.js (pure WASM),
// run manually:  bun run diagrams
//
// D2 runs in bare bun here, NOT inside Vite/Astro, so the worker+WASM asset
// resolution that trips the SSR bundler never happens. The emitted .svg is a
// committed artifact the Astro page imports with ?raw — the site build has zero
// D2 involvement.
//
// The SVG is post-processed to drop D2's baked palette and font so the diagram
// follows the page: strokes/text become `currentColor`, shape fills become the
// paper token, and text inherits the page font. That makes ONE svg correct in
// both light and dark (the site's manual `data-theme` toggle), no second copy.

import { D2 } from "@terrastruct/d2";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "src", "diagrams");

// Strip D2's baked theme so the diagram tracks the page. Principle: text and
// lines -> currentColor (the page ink, which the site's data-theme toggle
// drives); shape fills -> none, which always shows the page's own paper in both
// light and dark. currentColor/none are valid as attributes AND in style (a CSS
// var() is NOT valid in an SVG presentation attribute, so we do not use one).
function themeify(svg: string): string {
  svg = svg
    // page font for all text
    .replace(/font-family\s*=\s*"[^"]*"/g, 'font-family="inherit"')
    .replace(/font-family\s*:\s*[^;"}]+/g, "font-family:inherit")
    // text fills -> currentColor (attribute form, on <text>/<tspan>)
    .replace(/(<(?:text|tspan)\b[^>]*?)\sfill="#[0-9A-Fa-f]{3,8}"/g, '$1 fill="currentColor"')
    // every stroke -> currentColor (attribute + style form)
    .replace(/stroke="#[0-9A-Fa-f]{3,8}"/g, 'stroke="currentColor"')
    .replace(/stroke:\s*#[0-9A-Fa-f]{3,8}/g, "stroke:currentColor")
    // remaining (shape) fills -> none == the page's paper, in either theme
    .replace(/fill="#[0-9A-Fa-f]{3,8}"/g, 'fill="none"')
    .replace(/fill:\s*#[0-9A-Fa-f]{3,8}/g, "fill:none");

  // Accent: D2 encodes each object key as a base64 class on its <g>. Give the
  // shapes under these keys the site accent instead of ink, so the accent tracks
  // the theme (a CSS var is only usable via a rule, not a presentation attr).
  // Keep it to borders: fills stay none, text stays ink. !important beats the
  // inline stroke="currentColor" set above.
  const ACCENT_KEYS = ["after"]; // the three survivor boxes live under `after`
  const accentCss = ACCENT_KEYS.map((k) => {
    const c = Buffer.from(k).toString("base64");
    return `svg [class~="${c}"] .shape *{stroke:var(--color-accent)!important}`;
  }).join("");

  // Safety net for any element colored only via D2's embedded class rules
  // (no inline attr). Text is targeted apart from shapes so it never disappears.
  const override =
    "<style>" +
    // !important so labels win over D2's embedded class defs (which the fill
    // cleanup above rewrites to fill:none inside the <style> block).
    "svg text,svg tspan{fill:currentColor!important}" +
    "svg rect[class*='fill-'],svg path[class*='fill-'],svg polygon[class*='fill-'],svg circle[class*='fill-'],svg ellipse[class*='fill-']{fill:none}" +
    "svg [class*='stroke-']{stroke:currentColor}" +
    "svg .connection{stroke:currentColor}" +
    accentCss +
    "</style>";
  svg = svg.replace(/(<svg\b[^>]*>)/, `$1${override}`);

  // responsive + inherit color/font context
  return svg.replace(
    /<svg /,
    '<svg style="max-width:100%;height:auto;color:inherit;font-family:inherit" ',
  );
}

const files = (await readdir(dir)).filter((f) => f.endsWith(".d2"));
if (files.length === 0) {
  console.error("no .d2 sources in", dir);
  process.exit(1);
}

const d2 = new D2();
for (const f of files) {
  const code = await readFile(join(dir, f), "utf8");
  const { diagram, renderOptions } = await d2.compile(code, {
    layout: "elk",
    themeID: 0,
    pad: 24,
    sketch: false,
  });
  const raw = await d2.render(diagram, renderOptions);
  const out = join(dir, basename(f, ".d2") + ".svg");
  await writeFile(out, themeify(raw), "utf8");
  console.log("wrote", out);
}

// D2's WASM worker keeps the event loop alive; exit explicitly so the script
// terminates instead of hanging after the SVGs are written.
process.exit(0);
