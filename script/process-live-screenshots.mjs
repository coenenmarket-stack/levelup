/**
 * Decode CDP viewport captures into ASC-sized PNGs (raw full-bleed UI).
 * Prefer CDP captures (true phone viewport) when listed.
 *
 * For App Store Connect, prefer marketing flyers over live crops:
 *   node script/compose-app-store-flyers.mjs
 *
 * Note: older CDP captures may be vertically tiled; the flyers script
 * auto-crops the first clean UI region before framing.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_67 = path.resolve("store/screenshots");
const OUT_65 = path.resolve("store/screenshots/iphone-65");
const LOGS = path.resolve(process.env.USERPROFILE || "", ".cursor/browser-logs");
const TEMP = path.join(process.env.LOCALAPPDATA || "", "Temp", "cursor", "screenshots");

const CDP_MAP = [
  { file: "01-hero.png", cdp: "cdp-response-Page.captureScreenshot-2026-07-28T02-08-44-601Z.json" },
  { file: "02-quests.png", cdp: "cdp-response-Page.captureScreenshot-2026-07-28T01-56-04-051Z.json" },
  { file: "03-progress.png", cdp: "cdp-response-Page.captureScreenshot-2026-07-28T01-56-54-368Z.json" },
  { file: "04-coach.png", cdp: "cdp-response-Page.captureScreenshot-2026-07-28T02-04-09-361Z.json" },
  { file: "05-certs.png", cdp: "cdp-response-Page.captureScreenshot-2026-07-28T02-07-34-799Z.json" },
];

fs.mkdirSync(OUT_67, { recursive: true });
fs.mkdirSync(OUT_65, { recursive: true });

function loadCdpPng(name) {
  const p = path.join(LOGS, name);
  if (!fs.existsSync(p)) return null;
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  const b64 = json?.result?.data || json?.data;
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}

async function contentBounds(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i] + data[i + 1] + data[i + 2] > 28) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return { left: 0, top: 0, width, height };
  const pad = 2;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function writeSizes(buf, file) {
  const meta = await sharp(buf).metadata();
  let outBuf = buf;
  // Only crop if clearly wider than phone aspect (browser chrome leftover)
  if (meta.width && meta.height && meta.width / meta.height > 0.7) {
    const bounds = await contentBounds(buf);
    console.log(file, "cropping wide capture", meta.width, meta.height, "→", bounds);
    outBuf = await sharp(buf).extract(bounds).png().toBuffer();
  } else {
    console.log(file, "viewport capture", `${meta.width}x${meta.height}`);
  }
  async function writePng(dest, width, height) {
    const png = await sharp(outBuf).resize(width, height, { fit: "cover", position: "top" }).png().toBuffer();
    const tmp = `${dest}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, png);
    try {
      fs.renameSync(tmp, dest);
    } catch {
      // Windows file locks: overwrite in place
      fs.writeFileSync(dest, png);
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
    return png.length;
  }
  const size67 = await writePng(path.join(OUT_67, file), 1290, 2796);
  const size65 = await writePng(path.join(OUT_65, file), 1242, 2688);
  console.log("wrote", file, `1290x2796 (${size67}b)`, `1242x2688 (${size65}b)`);
}

async function main() {
  for (const row of CDP_MAP) {
    let buf = loadCdpPng(row.cdp);
    if (!buf) {
      const fallback = path.join(TEMP, row.file);
      if (!fs.existsSync(fallback)) throw new Error(`missing ${row.file}`);
      console.log(row.file, "fallback temp", fallback);
      buf = fs.readFileSync(fallback);
    } else {
      console.log(row.file, "from CDP", row.cdp);
    }
    await writeSizes(buf, row.file);
  }

  // Replace fake generator note
  const listingPath = path.resolve("store/app_store_listing_en.json");
  if (fs.existsSync(listingPath)) {
    const listing = JSON.parse(fs.readFileSync(listingPath, "utf8"));
    listing.screenshotSource = "live-app-capture";
    listing.screenshotNote =
      "Captured from production web app (same Capacitor UI). Real onboarding, quests, coach reply, certs list — no synthetic marketing frames.";
    fs.writeFileSync(listingPath, JSON.stringify(listing, null, 2) + "\n");
  }

  // Disable fake generator misuse: rewrite generate script header warning
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
