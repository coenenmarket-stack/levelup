/**
 * Generates App Store Connect iPhone 6.7" screenshots (1290×2796).
 * Run: npx tsx script/generate-app-store-screenshots.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 1290;
const HEIGHT = 2796;
const OUT = path.resolve("store/screenshots");

type Slide = {
  file: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cards: { label: string; value: string; accent: string }[];
};

const slides: Slide[] = [
  {
    file: "01-hero.png",
    eyebrow: "LEVEL UP LIFE",
    title: "Turn life into\nan RPG",
    subtitle: "Quests, XP, and streaks for the habits that actually matter.",
    cards: [
      { label: "Today", value: "3 quests ready", accent: "#34d399" },
      { label: "Level", value: "12 Adventurer", accent: "#fbbf24" },
      { label: "Streak", value: "7 days", accent: "#60a5fa" },
    ],
  },
  {
    file: "02-quests.png",
    eyebrow: "DAILY QUESTS",
    title: "Clear real-life\nmissions",
    subtitle: "Workout, deep work, and recovery — tracked like a game.",
    cards: [
      { label: "Morning run", value: "+40 XP", accent: "#34d399" },
      { label: "Deep focus", value: "+60 XP", accent: "#a78bfa" },
      { label: "Journal", value: "+25 XP", accent: "#fbbf24" },
    ],
  },
  {
    file: "03-progress.png",
    eyebrow: "PROGRESS",
    title: "Watch yourself\nlevel up",
    subtitle: "XP, achievements, and coach tips keep momentum going.",
    cards: [
      { label: "XP this week", value: "1,240", accent: "#34d399" },
      { label: "Achievement", value: "Iron Will", accent: "#fbbf24" },
      { label: "Coach tip", value: "Protect your streak", accent: "#60a5fa" },
    ],
  },
];

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slideSvg(slide: Slide) {
  const titleLines = slide.title.split("\n");
  const titleTspans = titleLines
    .map((line, i) => `<tspan x="96" dy="${i === 0 ? 0 : 92}">${escapeXml(line)}</tspan>`)
    .join("");

  const cards = slide.cards
    .map((card, i) => {
      const y = 1680 + i * 220;
      return `
      <rect x="96" y="${y}" width="1098" height="190" rx="28" fill="#161b26" stroke="#2a3344"/>
      <circle cx="180" cy="${y + 95}" r="28" fill="${card.accent}" fill-opacity="0.2"/>
      <circle cx="180" cy="${y + 95}" r="12" fill="${card.accent}"/>
      <text x="240" y="${y + 78}" fill="#9aa4b2" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" font-weight="600">${escapeXml(card.label)}</text>
      <text x="240" y="${y + 128}" fill="#f3f6fb" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="44" font-weight="800">${escapeXml(card.value)}</text>
      `;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="55%" stop-color="#101826"/>
      <stop offset="100%" stop-color="#0d1f1a"/>
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#34d399" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="90%" cy="15%" r="55%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow2)"/>

  <text x="96" y="220" fill="#34d399" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="34" font-weight="800" letter-spacing="6">${escapeXml(slide.eyebrow)}</text>
  <text x="96" y="360" fill="#f8fafc" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="86" font-weight="900" letter-spacing="-1.5">${titleTspans}</text>
  <text x="96" y="620" fill="#9aa4b2" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="36" font-weight="500">
    <tspan x="96" dy="0">${escapeXml(slide.subtitle.slice(0, 42))}</tspan>
    <tspan x="96" dy="52">${escapeXml(slide.subtitle.slice(42))}</tspan>
  </text>

  <!-- phone frame -->
  <rect x="210" y="760" width="870" height="820" rx="64" fill="#0a0f18" stroke="#2a3344" stroke-width="4"/>
  <rect x="246" y="812" width="798" height="716" rx="40" fill="#121826"/>
  <text x="300" y="920" fill="#34d399" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="26" font-weight="700" letter-spacing="4">LEVEL UP LIFE</text>
  <text x="300" y="1000" fill="#f8fafc" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="48" font-weight="800">Your next quest</text>
  <rect x="300" y="1080" width="690" height="28" rx="14" fill="#1f2937"/>
  <rect x="300" y="1080" width="430" height="28" rx="14" fill="#34d399"/>
  <text x="300" y="1170" fill="#9aa4b2" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28">XP to next level</text>
  <rect x="300" y="1240" width="690" height="120" rx="24" fill="#1a2230"/>
  <text x="340" y="1315" fill="#f8fafc" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="34" font-weight="700">Complete 1 habit today</text>

  ${cards}
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const slide of slides) {
    const svg = Buffer.from(slideSvg(slide));
    const outPath = path.join(OUT, slide.file);
    await sharp(svg).png().toFile(outPath);
    console.log("wrote", outPath);
  }
  console.log("Done — upload these to App Store Connect (iPhone 6.7\" display).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
