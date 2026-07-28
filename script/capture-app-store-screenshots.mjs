/**
 * Capture real App Store screenshots from the live web app (same UI as Capacitor).
 * No generated/fake marketing frames — viewport screenshots of authentic app screens only.
 *
 * Usage:
 *   set ASC_SCREENSHOT_EMAIL / ASC_SCREENSHOT_PASSWORD for an existing account (preferred)
 *   or omit to create a temporary account and complete real onboarding
 *
 *   node script/capture-app-store-screenshots.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const APP_URL = (process.env.ASC_SCREENSHOT_URL || "https://level-up-life-73702.web.app").replace(/\/$/, "");
const EMAIL = process.env.ASC_SCREENSHOT_EMAIL || "";
const PASSWORD = process.env.ASC_SCREENSHOT_PASSWORD || "";
const OUT_67 = path.resolve("store/screenshots");
const OUT_65 = path.resolve("store/screenshots/iphone-65");

const SIZES = [
  { w: 1290, h: 2796, dir: OUT_67, label: "6.7", vw: 430, vh: 932 },
  { w: 1242, h: 2688, dir: OUT_65, label: "6.5", vw: 414, vh: 896 },
];

const PAGES = [
  { file: "01-hero.png", hash: "#/" },
  { file: "02-quests.png", hash: "#/quests" },
  { file: "03-progress.png", hash: "#/character" },
  { file: "04-coach.png", hash: "#/coach" },
  { file: "05-certs.png", hash: "#/certifications" },
];

function ensureDirs() {
  fs.mkdirSync(OUT_67, { recursive: true });
  fs.mkdirSync(OUT_65, { recursive: true });
}

async function settle(page, ms = 1000) {
  await page.waitForTimeout(ms);
}

async function completeOnboarding(page) {
  // Character name
  const name = page.locator('[data-testid="input-char-name"]');
  if (await name.isVisible().catch(() => false)) {
    await name.fill("Alex");
    await page.locator('[data-testid="button-avatar-warrior"]').click().catch(() => {});
    await page.locator('[data-testid="button-next"]').click().catch(() => {});
    await settle(page, 800);
  }

  // Starting class
  if (await page.locator('[data-testid="button-class-professional"]').isVisible().catch(() => false)) {
    await page.locator('[data-testid="button-class-professional"]').click();
    await page.locator('[data-testid="button-next"]').click().catch(() => {});
    await settle(page, 800);
  }

  // Goals — pick a couple real options
  for (const id of ["button-goal-advance-my-career", "button-goal-learn-new-skills", "button-goal-build-wealth"]) {
    await page.locator(`[data-testid="${id}"]`).click().catch(() => {});
  }
  if (await page.locator('[data-testid="button-next"]').isVisible().catch(() => false)) {
    await page.locator('[data-testid="button-next"]').click();
    await settle(page, 800);
  }

  // Assessment — pick middle option for each question (real UI answers)
  for (let q = 0; q < 12; q++) {
    const opt = page.locator(`[data-testid="assess-q${q}-opt1"]`);
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
      await settle(page, 300);
      const next = page.locator('[data-testid="assess-next"], [data-testid="button-next"]');
      if (await next.first().isVisible().catch(() => false)) {
        await next.first().click();
        await settle(page, 600);
      }
      continue;
    }
    break;
  }

  // Final continue if present
  for (let i = 0; i < 5; i++) {
    const next = page.locator('[data-testid="button-next"], [data-testid="assess-next"]');
    if (await next.first().isVisible().catch(() => false)) {
      await next.first().click().catch(() => {});
      await settle(page, 1000);
    } else break;
  }

  // Wait for dashboard shell
  await page.waitForSelector("text=Quests", { timeout: 60000 }).catch(() => {});
  await settle(page, 1500);
}

async function ensureSignedIn(page) {
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await settle(page, 2500);

  // Already in app (hash routes)
  if (await page.locator('text=Daily').first().isVisible().catch(() => false)) {
    console.log("session already active");
    return;
  }
  if (!(await page.locator('[data-testid="input-email"]').isVisible().catch(() => false))) {
    // Maybe still loading into app
    await settle(page, 3000);
    if (!(await page.locator('[data-testid="input-email"]').isVisible().catch(() => false))) {
      console.log("no auth form — assuming signed in");
      return;
    }
  }

  const email = EMAIL || `asc.screenshots.${Date.now()}@mailinator.com`;
  const password = PASSWORD || `AscShot-${Date.now()}Aa1!`;

  if (!EMAIL) {
    console.log("creating temporary account", email);
    await page.locator('[data-testid="link-signup"]').click();
    await settle(page, 500);
    await page.locator('[data-testid="input-email"]').fill(email);
    await page.locator('[data-testid="input-password"]').fill(password);
    await page.locator('[data-testid="button-signup"]').click();
  } else {
    console.log("signing in", email);
    await page.locator('[data-testid="input-email"]').fill(email);
    await page.locator('[data-testid="input-password"]').fill(password);
    await page.locator('[data-testid="button-login"]').click();
  }

  await settle(page, 4000);

  // Email verification screen?
  if (await page.locator('[data-testid="button-verify-continue"]').isVisible().catch(() => false)) {
    console.log("email verification gate present — continuing if allowed");
    await page.locator('[data-testid="button-verify-continue"]').click().catch(() => {});
    await settle(page, 2000);
  }

  if (await page.locator('[data-testid="input-char-name"], [data-testid="button-class-professional"], [data-testid^="assess-q"]').first().isVisible().catch(() => false)) {
    console.log("completing onboarding with real UI choices");
    await completeOnboarding(page);
  }

  await settle(page, 2000);
  console.log("ready to capture");
}

async function dismissOverlays(page) {
  await page.locator('[data-testid="button-welcome-dismiss"]').click().catch(() => {});
  await page.locator('button:has-text("Got it")').click().catch(() => {});
  await page.locator('button:has-text("Not now")').click().catch(() => {});
  await page.locator('button:has-text("Close")').click().catch(() => {});
}

async function captureAtSize(browser, size) {
  const ctx = await browser.newContext({
    viewport: { width: size.vw, height: size.vh },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: devices["iPhone 14 Pro Max"].userAgent,
  });
  const page = await ctx.newPage();
  await ensureSignedIn(page);
  await dismissOverlays(page);

  for (const shot of PAGES) {
    await page.goto(`${APP_URL}/${shot.hash}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settle(page, 2000);
    await dismissOverlays(page);
    await settle(page, 800);

    const out = path.join(size.dir, shot.file);
    await page.screenshot({ path: out, type: "png", fullPage: false });

    // Verify size
    const sharp = (await import("sharp")).default;
    const meta = await sharp(out).metadata();
    console.log("wrote", size.label, out, `${meta.width}x${meta.height}`);
    if (meta.width !== size.w || meta.height !== size.h) {
      // Resize exactly to ASC requirements without inventing UI content
      await sharp(out)
        .resize(size.w, size.h, { fit: "cover", position: "top" })
        .png()
        .toFile(out + ".tmp");
      fs.renameSync(out + ".tmp", out);
      console.log("resized to", size.w, size.h);
    }
  }

  await ctx.close();
}

async function main() {
  ensureDirs();
  // Remove old generated fakes so we don't accidentally re-upload them
  for (const dir of [OUT_67, OUT_65]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".png")) fs.unlinkSync(path.join(dir, f));
    }
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const size of SIZES) {
      await captureAtSize(browser, size);
    }
  } finally {
    await browser.close();
  }

  // Update listing note
  const listingPath = path.resolve("store/app_store_listing_en.json");
  if (fs.existsSync(listingPath)) {
    const listing = JSON.parse(fs.readFileSync(listingPath, "utf8"));
    listing.screenshotSource = "live-app-capture";
    listing.screenshotNote = "Captured from production web app UI (same Capacitor shell). No synthetic marketing frames.";
    fs.writeFileSync(listingPath, JSON.stringify(listing, null, 2) + "\n");
  }

  console.log("done — real app screenshots only");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
