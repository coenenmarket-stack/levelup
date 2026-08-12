/**
 * Generates PWA icons + splash from the single source of truth: assets/icon.png.
 * Never overwrites assets/icon.png.
 *
 * Run: npm run icons
 */
import sharp from "sharp";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "client", "public");
const ASSETS = path.join(ROOT, "assets");
/** Canonical artwork — do not write back to this path. */
const SOURCE = path.join(ASSETS, "icon.png");
const BG = { r: 13, g: 17, b: 23 };

type IconSpec = { file: string; size: number; maskable?: boolean };

const ICONS: IconSpec[] = [
  { file: "favicon.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
];

async function opaqueFromSource() {
  return sharp(SOURCE).flatten({ background: BG }).removeAlpha();
}

async function main() {
  await access(SOURCE);
  await mkdir(PUBLIC, { recursive: true });
  await mkdir(ASSETS, { recursive: true });

  for (const { file, size, maskable } of ICONS) {
    const out = path.join(PUBLIC, file);
    if (maskable) {
      // Maskable safe zone ~80% — pad icon on solid background.
      const inner = Math.round(size * 0.72);
      const icon = await (await opaqueFromSource())
        .resize(inner, inner, { fit: "contain", background: BG })
        .png()
        .toBuffer();
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: BG,
        },
      })
        .composite([{ input: icon, gravity: "center" }])
        .png()
        .toFile(out);
    } else {
      await (await opaqueFromSource())
        .resize(size, size, { fit: "cover" })
        .png()
        .toFile(out);
    }
    console.log(`wrote ${file} (${size}x${size})`);
  }

  // Splash for capacitor-assets — derived from the same source, never the reverse.
  await (await opaqueFromSource()).png().toFile(path.join(ASSETS, "splash.png"));
  console.log("wrote assets/splash.png (opaque, from assets/icon.png)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
