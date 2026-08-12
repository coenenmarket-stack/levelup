/**
 * Fails if the iOS App Icon is transparent or has white corner fill.
 * Run: npx tsx script/verify-app-icon.ts
 */
import sharp from "sharp";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_ICON = path.join(
  ROOT,
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
);

const BG = { r: 13, g: 17, b: 23 }; // #0d1117
const TOLERANCE = 8;

async function main() {
  const meta = await sharp(APP_ICON).metadata();
  if (meta.hasAlpha) {
    console.error("AppIcon has alpha — iOS may show white/default corners");
    process.exit(1);
  }
  if (meta.width !== 1024 || meta.height !== 1024) {
    console.error(`AppIcon must be 1024x1024, got ${meta.width}x${meta.height}`);
    process.exit(1);
  }

  const { data, info } = await sharp(APP_ICON).raw().toBuffer({ resolveWithObject: true });
  const c = info.channels;
  const corners: Array<[number, number]> = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
  ];

  for (const [x, y] of corners) {
    const i = (y * info.width + x) * c;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 240 && g > 240 && b > 240) {
      console.error("AppIcon corner is white — bad flatten", r, g, b);
      process.exit(1);
    }
    if (
      Math.abs(r - BG.r) > TOLERANCE ||
      Math.abs(g - BG.g) > TOLERANCE ||
      Math.abs(b - BG.b) > TOLERANCE
    ) {
      console.error(
        "AppIcon corner is not brand dark #0d1117",
        { x, y, r, g, b, expected: BG },
      );
      process.exit(1);
    }
  }

  console.log(
    "AppIcon OK",
    `${info.width}x${info.height}`,
    "corners #0d1117",
    "alpha",
    meta.hasAlpha,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
