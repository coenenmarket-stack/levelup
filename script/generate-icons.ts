/**
 * Generates PWA / iOS icon PNGs from the source artwork.
 * Run: npm run icons
 */
import sharp from "sharp";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "client", "public");
const SOURCE = path.join(PUBLIC, "icon-source.png");

type IconSpec = { file: string; size: number; maskable?: boolean };

const ICONS: IconSpec[] = [
  { file: "favicon.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
];

async function main() {
  await access(SOURCE);
  await mkdir(PUBLIC, { recursive: true });

  for (const { file, size, maskable } of ICONS) {
    const out = path.join(PUBLIC, file);
    if (maskable) {
      // Maskable safe zone ~80% — pad icon on solid background.
      const inner = Math.round(size * 0.72);
      const icon = await sharp(SOURCE).resize(inner, inner, { fit: "contain" }).png().toBuffer();
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 13, g: 17, b: 23, alpha: 1 },
        },
      })
        .composite([{ input: icon, gravity: "center" }])
        .png()
        .toFile(out);
    } else {
      await sharp(SOURCE)
        .resize(size, size, { fit: "cover" })
        .png()
        .toFile(out);
    }
    console.log(`wrote ${file} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
