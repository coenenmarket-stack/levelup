/**
 * Renders the in-app Logo mark to icon-source.png (1024) for Cap/PWA icons.
 * Run: npx tsx script/render-logo-icon.ts && npm run icons && npm run cap:assets
 *
 * Full-bleed opaque square (no baked corner radius) — iOS applies its own mask.
 * Transparent corners + capacitor-assets default white flatten = broken TF icon.
 */
import sharp from "sharp";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "client", "public");
const OUT = path.join(PUBLIC, "icon-source.png");
const SIZE = 1024;
const BG = "#0d1117";

// Matches client/src/components/Logo.tsx mark on a full-bleed dark plate.
const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${BG}"/>
  <defs>
    <linearGradient id="lvl-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2dd4a8"/>
      <stop offset="100%" stop-color="#f0c14b"/>
    </linearGradient>
  </defs>
  <path d="M16 3 L28 7 V15 C28 22 22 27 16 29 C10 27 4 22 4 15 V7 Z"
    stroke="url(#lvl-g)" stroke-width="2" fill="rgba(45,212,168,0.06)"/>
  <path d="M10 19 L16 11 L22 19" stroke="url(#lvl-g)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="16" cy="22.5" r="1.6" fill="#f0c14b"/>
</svg>`;

async function main() {
  await mkdir(PUBLIC, { recursive: true });
  await sharp(Buffer.from(SVG))
    .flatten({ background: BG })
    .removeAlpha()
    .png()
    .toFile(OUT);
  console.log(`wrote ${OUT} (${SIZE}x${SIZE}) opaque full-bleed from in-app Logo`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
