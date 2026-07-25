/**
 * Writes a complete iOS AppIcon.appiconset from opaque assets/icon.png.
 * Bypasses @capacitor/assets for the home-screen / marketing icon so CI cannot
 * reintroduce white-corner flatten bugs.
 *
 * Run: npm run icons && npx tsx script/sync-ios-app-icon.ts
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "assets/icon.png");
const OUT_DIR = path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const BG = { r: 13, g: 17, b: 23 };

/** Traditional + marketing sizes Xcode still accepts alongside single-size catalogs. */
const SIZES: Array<{
  filename: string;
  pixel: number;
  idiom: "iphone" | "ipad" | "ios-marketing";
  size: string;
  scale: string;
}> = [
  { filename: "Icon-20@2x.png", pixel: 40, idiom: "iphone", size: "20x20", scale: "2x" },
  { filename: "Icon-20@3x.png", pixel: 60, idiom: "iphone", size: "20x20", scale: "3x" },
  { filename: "Icon-29@2x.png", pixel: 58, idiom: "iphone", size: "29x29", scale: "2x" },
  { filename: "Icon-29@3x.png", pixel: 87, idiom: "iphone", size: "29x29", scale: "3x" },
  { filename: "Icon-40@2x.png", pixel: 80, idiom: "iphone", size: "40x40", scale: "2x" },
  { filename: "Icon-40@3x.png", pixel: 120, idiom: "iphone", size: "40x40", scale: "3x" },
  { filename: "Icon-60@2x.png", pixel: 120, idiom: "iphone", size: "60x60", scale: "2x" },
  { filename: "Icon-60@3x.png", pixel: 180, idiom: "iphone", size: "60x60", scale: "3x" },
  { filename: "Icon-20~ipad.png", pixel: 20, idiom: "ipad", size: "20x20", scale: "1x" },
  { filename: "Icon-20@2x~ipad.png", pixel: 40, idiom: "ipad", size: "20x20", scale: "2x" },
  { filename: "Icon-29~ipad.png", pixel: 29, idiom: "ipad", size: "29x29", scale: "1x" },
  { filename: "Icon-29@2x~ipad.png", pixel: 58, idiom: "ipad", size: "29x29", scale: "2x" },
  { filename: "Icon-40~ipad.png", pixel: 40, idiom: "ipad", size: "40x40", scale: "1x" },
  { filename: "Icon-40@2x~ipad.png", pixel: 80, idiom: "ipad", size: "40x40", scale: "2x" },
  { filename: "Icon-76.png", pixel: 76, idiom: "ipad", size: "76x76", scale: "1x" },
  { filename: "Icon-76@2x.png", pixel: 152, idiom: "ipad", size: "76x76", scale: "2x" },
  { filename: "Icon-83.5@2x.png", pixel: 167, idiom: "ipad", size: "83.5x83.5", scale: "2x" },
  // Keep Capacitor's legacy marketing filename so existing tooling still finds it.
  { filename: "AppIcon-512@2x.png", pixel: 1024, idiom: "ios-marketing", size: "1024x1024", scale: "1x" },
];

async function opaqueSource() {
  return sharp(SOURCE).flatten({ background: BG }).removeAlpha();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const base = await opaqueSource();

  for (const spec of SIZES) {
    await base
      .clone()
      .resize(spec.pixel, spec.pixel, { fit: "cover" })
      .png()
      .toFile(path.join(OUT_DIR, spec.filename));
    console.log(`wrote ${spec.filename} (${spec.pixel}x${spec.pixel})`);
  }

  const contents = {
    images: SIZES.map(({ filename, idiom, size, scale }) => ({
      filename,
      idiom,
      size,
      scale,
    })),
    info: {
      author: "xcode",
      version: 1,
    },
  };

  await writeFile(
    path.join(OUT_DIR, "Contents.json"),
    `${JSON.stringify(contents, null, 2)}\n`,
    "utf8",
  );
  console.log(`wrote Contents.json (${SIZES.length} slots)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
