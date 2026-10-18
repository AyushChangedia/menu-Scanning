/**
 * Builds the whole UI into one self-contained HTML fragment (inline CSS + JS)
 * that can be published as a Claude Artifact or opened on its own.
 *
 *   npm run preview:build                 -> preview/dist/forkcast.html
 *   npm run preview:build -- out/file.html
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const out = resolve(process.argv[2] ?? `${root}/preview/dist/forkcast.html`);

const css = execFileSync(
  `${root}/node_modules/.bin/tailwindcss`,
  ["-c", "preview/tailwind.config.ts", "-i", "src/app/globals.css", "--minify"],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
);

const bundle = await build({
  absWorkingDir: root,
  entryPoints: ["preview/main.tsx"],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  legalComments: "none",
  logLevel: "warning",
  alias: { "next/link": "./preview/link.tsx", "next/navigation": "./preview/router.tsx" },
  define: { "process.env.NODE_ENV": '"production"', "process.env.FORKCAST_PREVIEW": '"1"' },
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

/*
 * Host fixes for the Artifact frame, which pads :root by the safe-area insets
 * itself: drop the app's own top inset, pin sticky headers below the status
 * bar, and paint that band so nothing scrolls under it.
 */
const host = `
:root{--font-inter:"Inter";color-scheme:dark}
body{margin:0;min-height:100dvh;background:#08080B;color:#fff;font-size:16px;font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.pt-safe{padding-top:0}
header.sticky{top:env(safe-area-inset-top,0px)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:40;background:#08080B}
`;

const html = `<title>Forkcast</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#08080B">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>${css}${host}</style>
<div id="root"></div>
<script>${js}</script>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
