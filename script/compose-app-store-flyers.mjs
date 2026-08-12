/**
 * App Store marketing flyers over LIVE UI crops.
 *
 * Approved path for ASC screenshots:
 *   node script/compose-app-store-flyers.mjs
 *
 * Loads real CDP captures (or store/screenshots PNGs), crops the first clean
 * UI region (detiles broken triple-stacked captures), and composites a
 * professional flyer frame (headline + copy + device bezel + real UI).
 *
 * Does NOT invent fake quest titles, XP, levels, or synthetic app chrome.
 * Output: store/screenshots/ (6.7" 1290×2796) and store/screenshots/iphone-65/ (6.5" 1242×2688).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_67 = path.resolve("store/screenshots");
const OUT_65 = path.resolve("store/screenshots/iphone-65");
const RAW_DIR = path.join(OUT_67, "_raw");
const CROP_DIR = path.join(OUT_67, "_crops");
const LOGS = path.resolve(process.env.USERPROFILE || "", ".cursor/browser-logs");

const BG = "#0d1117";
const GREEN = "#34d399";
const GOLD = "#fbbf24";
const MUTED = "#8b95a8";
const FG = "#f3f6fb";
const STROKE = "#2a3344";

const CDP_MAP = [
  {
    file: "01-hero.png",
    cdp: "cdp-response-Page.captureScreenshot-2026-07-28T02-08-44-601Z.json",
    eyebrow: "HOME",
    title: "Today at a glance",
    subtitle: "Mission, XP, and streak — your day starts here.",
  },
  {
    file: "02-quests.png",
    cdp: "cdp-response-Page.captureScreenshot-2026-07-28T01-56-04-051Z.json",
    eyebrow: "QUESTS",
    title: "Clear your quest pack",
    subtitle: "Pick daily missions, earn XP, and knock them out.",
  },
  {
    file: "03-progress.png",
    cdp: "cdp-response-Page.captureScreenshot-2026-07-28T01-56-54-368Z.json",
    eyebrow: "HERO",
    title: "Your character sheet",
    subtitle: "Skill trees, level, and class progression.",
  },
  {
    file: "04-coach.png",
    cdp: "cdp-response-Page.captureScreenshot-2026-07-28T02-04-09-361Z.json",
    eyebrow: "AI COACH",
    title: "A coach that knows your build",
    subtitle: "Personalized guidance from your stats and goals.",
  },
  {
    file: "05-certs.png",
    cdp: "cdp-response-Page.captureScreenshot-2026-07-28T02-07-34-799Z.json",
    eyebrow: "CERTS",
    title: "Credentials that move careers",
    subtitle: "Real free and affordable certification paths.",
  },
];

const SIZES = [
  { w: 1290, h: 2796, label: "67", dir: OUT_67 },
  { w: 1242, h: 2688, label: "65", dir: OUT_65 },
];

fs.mkdirSync(OUT_67, { recursive: true });
fs.mkdirSync(OUT_65, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(CROP_DIR, { recursive: true });

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadCdpPng(name) {
  const p = path.join(LOGS, name);
  if (!fs.existsSync(p)) return null;
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  const b64 = json?.result?.data || json?.data;
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}

/** Detect vertical UI tiling (broken letterbox/upscale) and return first clean tile height. */
async function firstTileHeight(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  function stripSig(yStart) {
    const sig = [];
    for (let y = yStart; y < yStart + 36 && y < height; y++) {
      let s = 0;
      for (let x = 0; x < width; x += 3) {
        const i = (y * width + x) * channels;
        s = (s + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7) % 1000003;
      }
      sig.push(s);
    }
    return sig;
  }

  const ref = stripSig(8);
  for (let y = 220; y < height - 60; y++) {
    const cand = stripSig(y);
    let match = 0;
    for (let i = 0; i < ref.length; i++) {
      if (Math.abs(ref[i] - cand[i]) < 90) match++;
    }
    if (match > ref.length * 0.9) {
      return Math.max(400, y - 4);
    }
  }
  // No tile detected — use upper ~62% (typical marketing crop of a phone screen)
  return Math.min(height, Math.round(height * 0.62));
}

async function extractLiveCrop(buf, file) {
  const meta = await sharp(buf).metadata();
  const tileH = await firstTileHeight(buf);
  const cropH = Math.min(meta.height, tileH);
  const crop = await sharp(buf)
    .extract({ left: 0, top: 0, width: meta.width, height: cropH })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(RAW_DIR, file), buf);
  fs.writeFileSync(path.join(CROP_DIR, file), crop);
  console.log(file, `source ${meta.width}x${meta.height}`, `→ crop ${meta.width}x${cropH}`);
  return crop;
}

function wrapLines(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function logoMark(x, y, size = 44) {
  const s = size / 32;
  return `
  <g transform="translate(${x},${y}) scale(${s})">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${GREEN}"/>
        <stop offset="100%" stop-color="${GOLD}"/>
      </linearGradient>
    </defs>
    <path d="M16 3 L28 7 V15 C28 22 22 27 16 29 C10 27 4 22 4 15 V7 Z"
      stroke="url(#lg)" stroke-width="2.2" fill="rgba(52,211,153,0.08)"/>
    <path d="M10 19 L16 11 L22 19" stroke="url(#lg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="16" cy="22.5" r="1.7" fill="${GOLD}"/>
  </g>`;
}

/**
 * SVG frame with a transparent window where the live UI crop is composited.
 * Phone height hugs the live crop aspect (no giant empty bezel).
 * Returns { svg, phone: { x, y, w, h } } in canvas coordinates.
 */
function frameSvg(slide, size, cropAspect) {
  const is65 = size.label === "65";
  const titleSize = is65 ? 64 : 72;
  const subSize = is65 ? 28 : 30;
  const padX = Math.round(size.w * 0.07);
  const headerTop = Math.round(size.h * 0.055);

  const titleLines = wrapLines(slide.title, is65 ? 18 : 20);
  const subLines = wrapLines(slide.subtitle, is65 ? 34 : 36);

  // Device frame — width-led, height from live crop aspect (showcase card)
  const framePad = Math.round(size.w * 0.055);
  const frameX = framePad;
  const frameW = size.w - framePad * 2;
  const bezel = Math.round(frameW * 0.022);
  const notchExtra = Math.round(bezel * 0.9);
  const innerW = frameW - bezel * 2;
  // cropAspect = width/height of live UI crop
  const innerH = Math.round(innerW / cropAspect);
  const frameH = innerH + bezel * 2 + notchExtra;
  // Sit under copy; nudge down slightly when spare vertical space remains
  const copyBottom = Math.round(size.h * 0.26);
  const bottomMargin = Math.round(size.h * 0.05);
  let frameY = copyBottom;
  const spare = size.h - (frameY + frameH + bottomMargin);
  if (spare > 0) frameY += Math.round(spare * 0.35);
  if (frameY + frameH + bottomMargin > size.h) {
    frameY = size.h - frameH - bottomMargin;
  }
  const radius = Math.round(frameW * 0.075);
  const innerX = frameX + bezel;
  const innerY = frameY + bezel + notchExtra;
  const innerR = Math.max(22, radius - bezel);

  const titleDy = Math.round(titleSize * 1.12);
  const titleTspans = titleLines
    .map((line, i) => `<tspan x="${padX}" dy="${i === 0 ? 0 : titleDy}">${esc(line)}</tspan>`)
    .join("");
  const subTspans = subLines
    .map((line, i) => `<tspan x="${padX}" dy="${i === 0 ? 0 : Math.round(subSize * 1.35)}">${esc(line)}</tspan>`)
    .join("");

  const titleY = headerTop + 110;
  const subY = titleY + titleLines.length * titleDy + 28;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1018"/>
      <stop offset="50%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#0c1a16"/>
    </linearGradient>
    <radialGradient id="g1" cx="8%" cy="0%" r="70%">
      <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${GREEN}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="95%" cy="6%" r="50%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="chev" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="bezelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a2230"/>
      <stop offset="100%" stop-color="#070a10"/>
    </linearGradient>
  </defs>

  <rect width="${size.w}" height="${size.h}" fill="url(#bg)"/>
  <rect width="${size.w}" height="${size.h}" fill="url(#g1)"/>
  <rect width="${size.w}" height="${size.h}" fill="url(#g2)"/>

  <!-- chevron motif (logo language) -->
  <path d="M${size.w - 170} 100 L${size.w - 90} 36 L${size.w - 10} 100" stroke="url(#chev)" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>
  <path d="M${size.w - 170} 148 L${size.w - 90} 84 L${size.w - 10} 148" stroke="url(#chev)" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>

  ${logoMark(padX, headerTop, 46)}
  <text x="${padX + 62}" y="${headerTop + 32}" fill="${GREEN}" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="4">LEVEL UP LIFE</text>
  <text x="${padX + 62}" y="${headerTop + 58}" fill="${MUTED}" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="3">${esc(slide.eyebrow)}</text>

  <text x="${padX}" y="${titleY}" fill="${FG}" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="${titleSize}" font-weight="900" letter-spacing="-1.2">${titleTspans}</text>
  <text x="${padX}" y="${subY}" fill="${MUTED}" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="${subSize}" font-weight="500">${subTspans}</text>

  <!-- device bezel -->
  <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" rx="${radius}" fill="url(#bezelGrad)" stroke="${STROKE}" stroke-width="4"/>
  <rect x="${frameX + 8}" y="${frameY + 8}" width="${frameW - 16}" height="${frameH - 16}" rx="${radius - 8}" fill="#05070c" stroke="#1c2433" stroke-width="2"/>
  <!-- notch hint -->
  <rect x="${frameX + frameW / 2 - 70}" y="${frameY + 18}" width="140" height="10" rx="5" fill="#0a0e14"/>
  <!-- screen placeholder -->
  <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="${innerR}" fill="${BG}"/>
</svg>`;

  return {
    svg,
    phone: { x: innerX, y: innerY, w: innerW, h: innerH },
  };
}

async function writeAtomic(dest, buf) {
  const tmp = `${dest}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, buf);
  try {
    fs.renameSync(tmp, dest);
  } catch {
    fs.writeFileSync(dest, buf);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

async function composeSlide(slide, cropBuf) {
  const cropMeta = await sharp(cropBuf).metadata();
  const cropAspect = cropMeta.width / cropMeta.height;

  for (const size of SIZES) {
    const { svg, phone } = frameSvg(slide, size, cropAspect);
    const framePng = await sharp(Buffer.from(svg)).png().toBuffer();

    const pw = Math.round(phone.w);
    const ph = Math.round(phone.h);

    // Exact fit into phone window (frame already sized to crop aspect)
    const uiFitted = await sharp(cropBuf)
      .resize(pw, ph, { fit: "fill" })
      .png()
      .toBuffer();

    const maskSvg = Buffer.from(
      `<svg width="${pw}" height="${ph}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" rx="${Math.round(pw * 0.055)}" fill="white"/>
      </svg>`,
    );
    const uiRounded = await sharp(uiFitted)
      .composite([{ input: maskSvg, blend: "dest-in" }])
      .png()
      .toBuffer();

    const out = await sharp(framePng)
      .composite([
        {
          input: uiRounded,
          left: Math.round(phone.x),
          top: Math.round(phone.y),
        },
      ])
      .png()
      .toBuffer();

    const dest = path.join(size.dir, slide.file);
    await writeAtomic(dest, out);
    console.log("wrote", dest, `${size.w}x${size.h}`);
  }
}

async function main() {
  for (const slide of CDP_MAP) {
    let buf = loadCdpPng(slide.cdp);
    let source = buf ? "cdp" : null;

    if (!buf) {
      const rawPath = path.join(RAW_DIR, slide.file);
      if (fs.existsSync(rawPath)) {
        buf = fs.readFileSync(rawPath);
        source = "raw";
      }
    }

    if (!buf) {
      const cropExisting = path.join(CROP_DIR, slide.file);
      if (fs.existsSync(cropExisting)) {
        console.log(slide.file, "from existing crop");
        buf = fs.readFileSync(cropExisting);
        await composeSlide(slide, buf);
        continue;
      }
    }

    if (!buf) {
      const existing = path.join(OUT_67, slide.file);
      if (!fs.existsSync(existing)) {
        throw new Error(`Missing CDP/raw/crop/PNG for ${slide.file}`);
      }
      // Last resort — may already be a flyer; still attempt detile
      console.log(slide.file, "from existing PNG (last resort)", existing);
      buf = fs.readFileSync(existing);
      source = "existing";
    } else {
      console.log(slide.file, "from", source, source === "cdp" ? slide.cdp : "");
    }

    const crop = await extractLiveCrop(buf, slide.file);
    await composeSlide(slide, crop);
  }

  const listingPath = path.resolve("store/app_store_listing_en.json");
  if (fs.existsSync(listingPath)) {
    const listing = JSON.parse(fs.readFileSync(listingPath, "utf8"));
    listing.screenshotSource = "live-ui-marketing-flyers";
    listing.screenshotNote =
      "Marketing flyer frames (headline + copy + device bezel) over LIVE app UI crops from production captures. Not synthetic/fake UI — real Home, Quests, Hero, Coach, and Certs screens. Generated by script/compose-app-store-flyers.mjs (approved ASC path). Do not use generate-app-store-screenshots.ts.";
    fs.writeFileSync(listingPath, JSON.stringify(listing, null, 2) + "\n");
  }

  console.log("Done — 5 flyer frames × 2 sizes (live UI crops, not fake chrome).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
