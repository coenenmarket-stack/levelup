/**
 * Renders the in-app Logo mark to icon-source.png (1024) for Cap/PWA icons.
 * Run: npx tsx script/render-logo-icon.ts && npm run icons
 */
import sharp from "sharp";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "client", "public");
const OUT = path.join(PUBLIC, "icon-source.png");
const SIZE = 1024;

// Matches client/src/components/Logo.tsx — full-bleed dark plate for iOS.
const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="7" fill="#0d1117"/>
  <defs>
    <linearGradient id="lvl-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2dd4a8"/>
      <stop offset="100%" stop-color="#f0c14b"/>
    </linearGradient>
  </defs>
  <path d="M16 4.2 L27.2 7.8 V15.2 C27.2 21.6 21.8 26.2 16 28 C10.2 26.2 4.8 21.6 4.8 15.2 V7.8 Z"
    stroke="url(#lvl-g)" stroke-width="1.7" fill="rgba(45,212,168,0.08)"/>
  <path d="M10.2 18.6 L16 11.2 L21.8 18.6" stroke="url(#lvl-g)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="16" cy="22.2" r="1.45" fill="#f0c14b"/>
</svg>`;

async function main() {
  await mkdir(PUBLIC, { recursive: true });
  const buf = await sharp(Buffer.from(SVG)).png().toBuffer();
  await writeFile(OUT, buf);
  console.log(`wrote ${OUT} (${SIZE}x${SIZE}) from in-app Logo`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
