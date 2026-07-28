/**
 * WARNING: DO NOT use this script for App Store Connect screenshots.
 * It creates fake/synthetic marketing frames (not real app UI).
 * Use live CDP captures + `node script/process-live-screenshots.mjs` instead.
 *
 * Generates App Store Connect marketing screenshots.
 * iPhone 6.7" (1290�2796) + 6.5" (1242�2688).
 * Run: npx tsx script/generate-app-store-screenshots.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_67 = path.resolve("store/screenshots");
const OUT_65 = path.resolve("store/screenshots/iphone-65");

const GREEN = "#34d399";
const GOLD = "#fbbf24";
const SKY = "#38bdf8";
const MUTED = "#8b95a8";
const FG = "#f3f6fb";
const CARD = "#121826";
const CARD2 = "#161b26";
const STROKE = "#2a3344";
const BG = "#0d1117";

type Size = { w: number; h: number; label: string };

const SIZES: Size[] = [
  { w: 1290, h: 2796, label: "67" },
  { w: 1242, h: 2688, label: "65" },
];

type Slide = {
  file: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Unique phone UI body for this slide */
  phone: (s: Size) => string;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
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

function logoMark(x: number, y: number, size = 44) {
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

function phoneChrome(s: Size, inner: string) {
  // Phone sits under headline; scales with canvas
  const px = Math.round(s.w * 0.12);
  const pw = s.w - px * 2;
  const py = Math.round(s.h * 0.30);
  const ph = Math.round(s.h * 0.58);
  const r = 56;
  const pad = 22;
  return `
  <!-- device frame -->
  <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${r}" fill="#070a10" stroke="${STROKE}" stroke-width="5"/>
  <rect x="${px + 10}" y="${py + 10}" width="${pw - 20}" height="${ph - 20}" rx="${r - 10}" fill="${BG}"/>
  <!-- status bar -->
  <text x="${px + 48}" y="${py + 52}" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600">9:41</text>
  <circle cx="${px + pw / 2}" cy="${py + 36}" r="6" fill="#1a2230"/>
  <g transform="translate(${px + pad},${py + 70})">
    ${inner}
  </g>`;
}

function phoneHero(_s: Size) {
  return `
  ${logoMark(0, 0, 40)}
  <text x="52" y="28" fill="${GREEN}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="800" letter-spacing="3">LEVEL UP LIFE</text>

  <!-- hero level card -->
  <rect x="0" y="56" width="960" height="280" rx="28" fill="${CARD}" stroke="${GREEN}" stroke-opacity="0.35" stroke-width="2"/>
  <rect x="28" y="84" width="96" height="96" rx="22" fill="#1a2230" stroke="${STROKE}"/>
  <text x="76" y="148" text-anchor="middle" font-size="44">🛡️</text>
  <text x="148" y="108" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600" letter-spacing="2">ALEX RIVERA</text>
  <text x="148" y="152" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="26">Level</text>
  <text x="230" y="152" fill="${GOLD}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="48" font-weight="800">14</text>
  <text x="148" y="188" fill="${GOLD}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600">Side-Hustle Founder</text>
  <text x="780" y="108" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="700" letter-spacing="2" text-anchor="middle">STREAK</text>
  <text x="760" y="160" fill="${GOLD}" font-size="28">🔥</text>
  <text x="800" y="162" fill="${FG}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="40" font-weight="800">12</text>

  <!-- XP bar green→gold -->
  <rect x="28" y="220" width="900" height="22" rx="11" fill="#1f2937"/>
  <defs>
    <linearGradient id="xp" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GREEN}"/>
      <stop offset="100%" stop-color="${GOLD}"/>
    </linearGradient>
  </defs>
  <rect x="28" y="220" width="620" height="22" rx="11" fill="url(#xp)"/>
  <text x="28" y="278" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">Total <tspan fill="${FG}" font-family="JetBrains Mono, ui-monospace, monospace" font-weight="700">8,420</tspan> XP</text>
  <text x="928" y="278" text-anchor="end" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">Spendable <tspan fill="${GOLD}" font-family="JetBrains Mono, ui-monospace, monospace" font-weight="700">340</tspan></text>

  <!-- today's mission -->
  <text x="0" y="380" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="800">Today's Mission</text>
  <rect x="0" y="404" width="960" height="150" rx="24" fill="${CARD2}" stroke="${STROKE}"/>
  <circle cx="56" cy="479" r="22" fill="rgba(52,211,153,0.2)" stroke="${GREEN}"/>
  <circle cx="56" cy="479" r="9" fill="${GREEN}"/>
  <text x="100" y="462" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="700">Ship one Etsy listing photo</text>
  <text x="100" y="504" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">Career · Hard · Keep the streak alive</text>
  <text x="860" y="488" fill="${GOLD}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="28" font-weight="800">+50 XP</text>

  <!-- daily progress -->
  <text x="0" y="610" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="800">Daily Missions  <tspan fill="${MUTED}" font-size="22" font-weight="600">2 of 5 done</tspan></text>
  <rect x="0" y="634" width="960" height="16" rx="8" fill="#1f2937"/>
  <rect x="0" y="634" width="384" height="16" rx="8" fill="${GREEN}"/>

  ${questRow(0, 680, "Morning stretch + water", "+15 XP", GREEN, false)}
  ${questRow(0, 800, "Deep focus — 45 min", "+60 XP", GOLD, true)}
  `;
}

function questRow(x: number, y: number, title: string, xp: string, accent: string, done: boolean) {
  return `
  <rect x="${x}" y="${y}" width="960" height="100" rx="22" fill="${CARD}" stroke="${STROKE}"/>
  <circle cx="${x + 48}" cy="${y + 50}" r="20" fill="${done ? accent : "transparent"}" stroke="${accent}" stroke-width="3"/>
  ${done ? `<path d="M${x + 38} ${y + 50} L${x + 45} ${y + 58} L${x + 60} ${y + 40}" stroke="${BG}" stroke-width="3" fill="none" stroke-linecap="round"/>` : ""}
  <text x="${x + 88}" y="${y + 58}" fill="${done ? MUTED : FG}" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700">${esc(title)}</text>
  <text x="${x + 900}" y="${y + 58}" text-anchor="end" fill="${GOLD}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="24" font-weight="800">${esc(xp)}</text>`;
}

function phoneQuests(_s: Size) {
  return `
  <text x="0" y="28" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="900">Daily Missions</text>
  <text x="0" y="68" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">Clear the board. Earn XP. Level up.</text>

  <rect x="0" y="100" width="960" height="110" rx="24" fill="${CARD}" stroke="${GREEN}" stroke-opacity="0.4"/>
  <text x="36" y="148" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2">TODAY'S PACK</text>
  <text x="36" y="186" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="800">3 left · 180 XP on the line</text>
  <rect x="620" y="130" width="300" height="50" rx="16" fill="rgba(52,211,153,0.12)" stroke="${GREEN}" stroke-opacity="0.4"/>
  <text x="770" y="164" text-anchor="middle" fill="${GREEN}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="800">Refresh pack</text>

  ${questRow(0, 240, "Morning run — 2 miles", "+40 XP", GREEN, false)}
  ${questRow(0, 360, "Deep focus block", "+60 XP", SKY, false)}
  ${questRow(0, 480, "Budget check-in", "+25 XP", GOLD, true)}
  ${questRow(0, 600, "Call mom / family check", "+20 XP", GREEN, false)}
  ${questRow(0, 720, "Learn 20 min (cert module)", "+50 XP", GOLD, false)}

  <rect x="0" y="860" width="960" height="120" rx="24" fill="${CARD2}" stroke="${STROKE}"/>
  <text x="36" y="912" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2">CATEGORIES</text>
  <text x="36" y="952" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700">Health · Career · Finance · Family · Learning</text>
  `;
}

function phoneProgress(_s: Size) {
  return `
  <text x="0" y="28" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="900">Your progress</text>
  <text x="0" y="68" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">XP, streaks, and achievements — proof it stuck.</text>

  <rect x="0" y="100" width="460" height="200" rx="24" fill="${CARD}" stroke="${STROKE}"/>
  <text x="36" y="150" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2">THIS WEEK</text>
  <text x="36" y="220" fill="${GREEN}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="56" font-weight="800">1,240</text>
  <text x="36" y="262" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">XP earned</text>

  <rect x="500" y="100" width="460" height="200" rx="24" fill="${CARD}" stroke="${STROKE}"/>
  <text x="536" y="150" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2">STREAK</text>
  <text x="536" y="220" fill="${GOLD}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="56" font-weight="800">12🔥</text>
  <text x="536" y="262" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">Best: 21 days</text>

  <text x="0" y="360" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="800">Recent achievements</text>
  ${achRow(0, 390, "🥇", "Iron Will", "100 health quests", "EPIC", GOLD)}
  ${achRow(0, 530, "💯", "Centurion", "100 quests complete", "RARE", SKY)}
  ${achRow(0, 670, "🎓", "First Cert", "Hard career quest done", "RARE", GREEN)}

  <rect x="0" y="820" width="960" height="150" rx="24" fill="${CARD2}" stroke="${GOLD}" stroke-opacity="0.35"/>
  <text x="36" y="880" fill="${GOLD}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="800" letter-spacing="2">LEVEL UP</text>
  <text x="36" y="930" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="800">You hit Level 14 — title unlocked</text>
  `;
}

function achRow(x: number, y: number, icon: string, name: string, desc: string, rarity: string, color: string) {
  return `
  <rect x="${x}" y="${y}" width="960" height="120" rx="22" fill="${CARD}" stroke="${STROKE}"/>
  <text x="${x + 48}" y="${y + 72}" font-size="36">${icon}</text>
  <text x="${x + 110}" y="${y + 55}" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="800">${esc(name)}</text>
  <text x="${x + 110}" y="${y + 92}" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">${esc(desc)}</text>
  <rect x="${x + 780}" y="${y + 40}" width="140" height="40" rx="12" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-opacity="0.5"/>
  <text x="${x + 850}" y="${y + 68}" text-anchor="middle" fill="${color}" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="800">${esc(rarity)}</text>`;
}

function phoneCoach(_s: Size) {
  return `
  <rect x="0" y="0" width="56" height="56" rx="16" fill="rgba(251,191,36,0.15)" stroke="${GOLD}" stroke-opacity="0.4"/>
  <text x="28" y="38" text-anchor="middle" font-size="26">✨</text>
  <text x="72" y="28" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="900">AI Coach</text>
  <text x="72" y="58" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="20">Personalized to your hero</text>

  <!-- coach bubble -->
  <rect x="0" y="100" width="780" height="220" rx="24" fill="${CARD}" stroke="${STROKE}"/>
  <text x="28" y="150" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="24">
    <tspan x="28" dy="0">Hey Alex. Your Finance tree is lagging</tspan>
    <tspan x="28" dy="36">behind Career. Knock out the budget</tspan>
    <tspan x="28" dy="36">check-in (+25 XP), then spend 20 min</tspan>
    <tspan x="28" dy="36">on your cert module tonight.</tspan>
  </text>

  <!-- you bubble -->
  <rect x="180" y="350" width="780" height="100" rx="24" fill="rgba(52,211,153,0.12)" stroke="${GREEN}" stroke-opacity="0.35"/>
  <text x="210" y="412" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="24">What should I focus on today?</text>

  <!-- starter chips -->
  <text x="0" y="510" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2">TRY ASKING</text>
  ${chip(0, 540, "Keep my streak alive")}
  ${chip(420, 540, "Quest for my Etsy shop")}
  ${chip(0, 620, "I'm stuck — pull me out")}
  ${chip(420, 620, "Level my weakest skill")}

  <rect x="0" y="740" width="960" height="90" rx="28" fill="${CARD2}" stroke="${STROKE}"/>
  <text x="36" y="796" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="24">Ask your coach…</text>
  <circle cx="900" cy="785" r="28" fill="${GOLD}"/>
  <text x="900" y="793" text-anchor="middle" fill="${BG}" font-size="22" font-weight="800">↑</text>
  `;
}

function chip(x: number, y: number, label: string) {
  return `
  <rect x="${x}" y="${y}" width="380" height="60" rx="18" fill="${CARD}" stroke="${STROKE}"/>
  <text x="${x + 190}" y="${y + 38}" text-anchor="middle" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600">${esc(label)}</text>`;
}

function phoneCerts(_s: Size) {
  return `
  <text x="0" y="28" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="900">Certifications</text>
  <text x="0" y="68" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">Real credentials that move your career questline.</text>

  ${certCard(0, 100, "Google IT Support", "Coursera / Google", "Entry IT · $50–70k path", "$", "3–6 mo")}
  ${certCard(0, 320, "AWS Cloud Practitioner", "Amazon", "Cloud entry · $60–80k", "$", "1–2 mo")}
  ${certCard(0, 540, "Responsive Web Design", "freeCodeCamp", "Portfolio projects · junior web", "Free", "300 hrs")}

  <rect x="0" y="780" width="960" height="140" rx="24" fill="${CARD2}" stroke="${GREEN}" stroke-opacity="0.35"/>
  <text x="36" y="840" fill="${GREEN}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="800" letter-spacing="2">QUEST LINK</text>
  <text x="36" y="886" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700">Finish a module → earn career XP in-app</text>
  `;
}

function certCard(x: number, y: number, name: string, provider: string, payoff: string, cost: string, time: string) {
  return `
  <rect x="${x}" y="${y}" width="960" height="200" rx="24" fill="${CARD}" stroke="${STROKE}"/>
  <rect x="${x + 28}" y="${y + 36}" width="64" height="64" rx="16" fill="rgba(251,191,36,0.12)" stroke="${GOLD}" stroke-opacity="0.4"/>
  <text x="${x + 60}" y="${y + 80}" text-anchor="middle" font-size="28">🎓</text>
  <text x="${x + 116}" y="${y + 60}" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="800">${esc(name)}</text>
  <text x="${x + 116}" y="${y + 96}" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="22">${esc(provider)}</text>
  <text x="${x + 116}" y="${y + 150}" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="22">${esc(payoff)}</text>
  <rect x="${x + 780}" y="${y + 40}" width="140" height="40" rx="12" fill="rgba(52,211,153,0.12)" stroke="${GREEN}" stroke-opacity="0.4"/>
  <text x="${x + 850}" y="${y + 68}" text-anchor="middle" fill="${GREEN}" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="800">${esc(cost)}</text>
  <text x="${x + 850}" y="${y + 120}" text-anchor="middle" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="18">${esc(time)}</text>`;
}

const slides: Slide[] = [
  {
    file: "01-hero.png",
    eyebrow: "LEVEL UP LIFE",
    title: "Your life.\nNow with XP.",
    subtitle: "Quests, streaks, and a character sheet for the habits that actually change your week.",
    phone: phoneHero,
  },
  {
    file: "02-quests.png",
    eyebrow: "DAILY QUESTS",
    title: "Missions you\ncan finish today",
    subtitle: "Health, career, money, family, learning — tracked like a game, not a guilt list.",
    phone: phoneQuests,
  },
  {
    file: "03-progress.png",
    eyebrow: "PROGRESS",
    title: "Proof you're\nleveling up",
    subtitle: "XP totals, streaks, and achievements that show momentum — not just intentions.",
    phone: phoneProgress,
  },
  {
    file: "04-coach.png",
    eyebrow: "AI COACH",
    title: "A coach that\nknows your build",
    subtitle: "Ask what to focus on. It already sees your level, streak, quests, and weak spots.",
    phone: phoneCoach,
  },
  {
    file: "05-certs.png",
    eyebrow: "CERTIFICATIONS",
    title: "Level your\ncareer path",
    subtitle: "Browse real certs, then turn modules into career quests and XP.",
    phone: phoneCerts,
  },
];

function frameSvg(slide: Slide, size: Size) {
  const titleLines = slide.title.split("\n");
  const titleSize = size.label === "65" ? 72 : 80;
  const titleDy = size.label === "65" ? 78 : 86;
  const titleTspans = titleLines
    .map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : titleDy}">${esc(line)}</tspan>`)
    .join("");

  const subLines = wrapLines(slide.subtitle, size.label === "65" ? 40 : 42);
  const subTspans = subLines
    .map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : 44}">${esc(line)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1018"/>
      <stop offset="45%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#0c1a16"/>
    </linearGradient>
    <radialGradient id="g1" cx="12%" cy="0%" r="65%">
      <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${GREEN}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="92%" cy="8%" r="55%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="chev" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="${size.w}" height="${size.h}" fill="url(#bg)"/>
  <rect width="${size.w}" height="${size.h}" fill="url(#g1)"/>
  <rect width="${size.w}" height="${size.h}" fill="url(#g2)"/>

  <!-- chevron energy motif -->
  <path d="M${size.w - 180} 120 L${size.w - 90} 40 L${size.w - 0} 120" stroke="url(#chev)" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
  <path d="M${size.w - 180} 170 L${size.w - 90} 90 L${size.w - 0} 170" stroke="url(#chev)" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>

  ${logoMark(72, 88, 48)}
  <text x="136" y="124" fill="${GREEN}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="800" letter-spacing="5">${esc(slide.eyebrow)}</text>
  <text x="72" y="220" fill="${FG}" font-family="Inter, system-ui, sans-serif" font-size="${titleSize}" font-weight="900" letter-spacing="-1.5">${titleTspans}</text>
  <text x="72" y="${220 + titleLines.length * titleDy + 36}" fill="${MUTED}" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="500">${subTspans}</text>

  ${phoneChrome(size, slide.phone(size))}
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT_67, { recursive: true });
  fs.mkdirSync(OUT_65, { recursive: true });

  for (const slide of slides) {
    for (const size of SIZES) {
      const svg = Buffer.from(frameSvg(slide, size));
      const dir = size.label === "67" ? OUT_67 : OUT_65;
      const outPath = path.join(dir, slide.file);
      await sharp(svg).png().toFile(outPath);
      console.log("wrote", outPath);
    }
  }
  console.log("Done — 5 frames × 2 sizes (6.7\" + 6.5\").");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
