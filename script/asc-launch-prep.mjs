/**
 * App Store Connect launch prep via API (LevelupLife key).
 * Does not print the private key. Run: node script/asc-launch-prep.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const KEY_ID = "JGNQY22FBN";
const ISSUER_ID = "b0b80a05-310f-4550-b15c-262f1d87e87b";
const APP_ID = "6792917459";
const KEY_PATH = "c:/Users/Coene/Downloads/AuthKey_JGNQY22FBN.p8";
const PRIVACY_URL = "https://level-up-life-73702.web.app/privacy.html";
const SUPPORT_URL = "https://level-up-life-73702.web.app/support.html";
const MARKETING_URL = "https://level-up-life-73702.web.app";
const SCREENSHOT_DIR = path.resolve("store/screenshots");
const VERSION_STRING = process.env.ASC_VERSION || "1.0.1";
const BASE = "https://api.appstoreconnect.apple.com";

// Listing copy for en-US. FORCE_LISTING_COPY=1 overwrites ASC fields.
const STORE_COPY = {
  description: `Level Up Life turns the stuff you keep meaning to do into a playable RPG.

Build a character. Pick up daily quests across health, career, money, family, and learning. Earn XP, keep a streak, unlock achievements, and watch your level climb when you actually finish the work.

WHAT YOU GET
• Daily mission packs tailored to your goals — clear them for XP
• Character progression with levels, titles, spendable XP, and skill trees
• An AI coach that already knows your build, streak, and weak spots
• Certification paths you can turn into career quests
• Friends, achievements, and stats that make progress visible
• Free account with email, Google, or Sign in with Apple

This is not another bland habit checklist. It is a game loop for real life: small missions today, a higher level tomorrow.

Start free. Complete one quest. Level up your life.`,
  keywords: "habits,rpg,quests,xp,gamification,goals,streak,coach,productivity,fitness,career,certs",
  promotionalText: "Daily quests. Real XP. An AI coach that knows your streak — turn life into a game you can win.",
  subtitle: "Turn life into an RPG",
  whatsNew:
    "App Store launch build: sharper daily missions, AI coach, certifications, and stability fixes.",
  reviewNotes:
    "Level Up Life is a free gamified life-quests app. Reviewers can create a new account with email/password on the sign-in screen (no demo account required). Google Sign-In and Sign in with Apple open the system flow and return to the app. Core flow: sign up → life assessment onboarding → daily quests → earn XP → open AI Coach or Certifications. Screenshots are live captures of the running app: Dashboard, Quests, Progress, Coach, and Certs.",
};

const FORCE_LISTING_COPY = process.env.FORCE_LISTING_COPY === "1" || process.env.FORCE_LISTING_COPY === "true";
const FORCE_SCREENSHOTS = process.env.FORCE_SCREENSHOTS === "1" || process.env.FORCE_SCREENSHOTS === "true";
const SCREENSHOT_FILES = ["01-hero.png", "02-quests.png", "03-progress.png", "04-coach.png", "05-certs.png"];

function token() {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: ISSUER_ID,
      iat: now,
      exp: now + 1140,
      aud: "appstoreconnect-v1",
    }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const key = crypto.createPrivateKey(fs.readFileSync(KEY_PATH));
  const sig = crypto.sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" });
  return `${data}.${Buffer.from(sig).toString("base64url")}`;
}

async function api(method, urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${urlPath} -> ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function uploadScreenshot(screenshotSetId, filePath) {
  const file = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const reserve = await api("POST", "/v1/appScreenshots", {
    data: {
      type: "appScreenshots",
      attributes: { fileName, fileSize: file.length },
      relationships: {
        appScreenshotSet: { data: { type: "appScreenshotSets", id: screenshotSetId } },
      },
    },
  });

  const screenshotId = reserve.data.id;
  const ops = reserve.data.attributes.uploadOperations || [];
  for (const op of ops) {
    const headers = {};
    for (const h of op.requestHeaders || []) headers[h.name] = h.value;
    const chunk = file.subarray(op.offset, op.offset + op.length);
    const put = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!put.ok) throw new Error(`Upload failed ${put.status} for ${fileName}`);
  }

  await api("PATCH", `/v1/appScreenshots/${screenshotId}`, {
    data: {
      type: "appScreenshots",
      id: screenshotId,
      attributes: { uploaded: true },
    },
  });
  return screenshotId;
}

async function main() {
  const log = [];
  const push = (msg, extra) => {
    console.log(msg, extra ?? "");
    log.push({ msg, extra });
  };

  // App infos
  const infos = await api("GET", `/v1/apps/${APP_ID}/appInfos`);
  const appInfoId = infos.data?.[0]?.id;
  push("appInfoId", appInfoId);

  push("targetVersion", VERSION_STRING);

  // App Store versions (create 1.0.1 if missing)
  let versions = await api(
    "GET",
    `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${VERSION_STRING}&include=appStoreVersionLocalizations,build`,
  );
  let version = versions.data?.[0];
  if (!version) {
    try {
      const created = await api("POST", "/v1/appStoreVersions", {
        data: {
          type: "appStoreVersions",
          attributes: {
            platform: "IOS",
            versionString: VERSION_STRING,
          },
          relationships: {
            app: { data: { type: "apps", id: APP_ID } },
          },
        },
      });
      version = created.data;
      push("created version", VERSION_STRING);
      versions = await api(
        "GET",
        `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${VERSION_STRING}&include=appStoreVersionLocalizations,build`,
      );
    } catch (e) {
      push("create version failed", { status: e.status, body: e.body });
    }
  }

  const versionId = version?.id;
  push("version", {
    id: versionId,
    state: version?.attributes?.appStoreState,
    versionString: version?.attributes?.versionString,
    buildId: version?.relationships?.build?.data?.id,
  });

  const locs = versions.included?.filter((x) => x.type === "appStoreVersionLocalizations") || [];
  const en = locs.find((l) => l.attributes?.locale === "en-US") || locs[0];
  push("localization", en?.id);

  if (!en?.id && versionId) {
    try {
      const createdLoc = await api("POST", "/v1/appStoreVersionLocalizations", {
        data: {
          type: "appStoreVersionLocalizations",
          attributes: { locale: "en-US" },
          relationships: {
            appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
          },
        },
      });
      push("created en-US localization", createdLoc.data?.id);
      versions = await api(
        "GET",
        `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${VERSION_STRING}&include=appStoreVersionLocalizations,build`,
      );
    } catch (e) {
      push("create localization failed", { status: e.status, body: e.body });
    }
  }

  const locs2 = versions.included?.filter((x) => x.type === "appStoreVersionLocalizations") || [];
  const enLoc = locs2.find((l) => l.attributes?.locale === "en-US") || locs2[0];

  if (enLoc?.id) {
    const baseAttrs = {
      supportUrl: SUPPORT_URL,
      marketingUrl: MARKETING_URL,
    };
    const copyAttrs = {};
    const want = (cur, next) => FORCE_LISTING_COPY || !String(cur || "").trim();
    if (want(enLoc.attributes?.description, STORE_COPY.description)) copyAttrs.description = STORE_COPY.description;
    if (want(enLoc.attributes?.keywords, STORE_COPY.keywords)) copyAttrs.keywords = STORE_COPY.keywords;
    if (want(enLoc.attributes?.promotionalText, STORE_COPY.promotionalText)) {
      copyAttrs.promotionalText = STORE_COPY.promotionalText;
    }
    // whatsNew is often locked on first App Store version — try separately
    const wantWhatsNew = want(enLoc.attributes?.whatsNew, STORE_COPY.whatsNew);

    try {
      await api("PATCH", `/v1/appStoreVersionLocalizations/${enLoc.id}`, {
        data: {
          type: "appStoreVersionLocalizations",
          id: enLoc.id,
          attributes: { ...baseAttrs, ...copyAttrs },
        },
      });
      push("localization updated", {
        force: FORCE_LISTING_COPY,
        fields: Object.keys({ ...baseAttrs, ...copyAttrs }),
      });
    } catch (e) {
      push("localization patch failed", { status: e.status, body: e.body });
    }

    if (wantWhatsNew) {
      try {
        await api("PATCH", `/v1/appStoreVersionLocalizations/${enLoc.id}`, {
          data: {
            type: "appStoreVersionLocalizations",
            id: enLoc.id,
            attributes: { whatsNew: STORE_COPY.whatsNew },
          },
        });
        push("whatsNew updated");
      } catch (e) {
        push("whatsNew skipped/locked", {
          status: e.status,
          detail: e.body?.errors?.[0]?.detail,
        });
      }
    }
  }

  // Subtitle lives on appInfoLocalizations
  try {
    const infoLocs = await api("GET", `/v1/appInfos/${appInfoId}/appInfoLocalizations`);
    const enInfo = (infoLocs.data || []).find((l) => l.attributes?.locale === "en-US") || infoLocs.data?.[0];
    if (enInfo?.id && (FORCE_LISTING_COPY || !enInfo.attributes?.subtitle?.trim())) {
      await api("PATCH", `/v1/appInfoLocalizations/${enInfo.id}`, {
        data: {
          type: "appInfoLocalizations",
          id: enInfo.id,
          attributes: { subtitle: STORE_COPY.subtitle, privacyPolicyUrl: PRIVACY_URL },
        },
      });
      push("subtitle/privacy confirmed on appInfoLocalization");
    }
  } catch (e) {
    push("subtitle patch failed", { status: e.status, body: e.body });
  }

  // Review notes
  if (versionId && FORCE_LISTING_COPY) {
    try {
      const detail = await api("GET", `/v1/appStoreVersions/${versionId}/appStoreReviewDetail`);
      const detailId = detail.data?.id;
      if (detailId) {
        await api("PATCH", `/v1/appStoreReviewDetails/${detailId}`, {
          data: {
            type: "appStoreReviewDetails",
            id: detailId,
            attributes: { notes: STORE_COPY.reviewNotes },
          },
        });
        push("review notes updated");
      }
    } catch (e) {
      push("review notes patch failed", { status: e.status, body: e.body });
    }
  }

  // Privacy policy URL (ensure set even when not force-updating subtitle)
  if (!FORCE_LISTING_COPY) {
    try {
      const infoLocs = await api("GET", `/v1/appInfos/${appInfoId}/appInfoLocalizations`);
      const enInfo = (infoLocs.data || []).find((l) => l.attributes?.locale === "en-US") || infoLocs.data?.[0];
      if (enInfo?.id) {
        await api("PATCH", `/v1/appInfoLocalizations/${enInfo.id}`, {
          data: {
            type: "appInfoLocalizations",
            id: enInfo.id,
            attributes: { privacyPolicyUrl: PRIVACY_URL },
          },
        });
        push("privacyPolicyUrl set on appInfoLocalization");
      }
    } catch (e) {
      push("privacyPolicyUrl appInfoLocalization failed", { status: e.status, body: e.body });
    }
  }

  async function ensureScreenshotSet(displayType, dir, label) {
    const sets = await api(
      "GET",
      `/v1/appStoreVersionLocalizations/${enLoc.id}/appScreenshotSets`,
    );
    let set = (sets.data || []).find((s) => s.attributes?.screenshotDisplayType === displayType);
    let setId = set?.id;
    if (!setId) {
      const created = await api("POST", "/v1/appScreenshotSets", {
        data: {
          type: "appScreenshotSets",
          attributes: { screenshotDisplayType: displayType },
          relationships: {
            appStoreVersionLocalization: {
              data: { type: "appStoreVersionLocalizations", id: enLoc.id },
            },
          },
        },
      });
      setId = created.data.id;
      push(`created ${label} screenshot set`, { setId, displayType });
    } else {
      push(`existing ${label} screenshot set`, { setId, displayType: set.attributes?.screenshotDisplayType });
    }

    // Safety: never write into a set with the wrong display type
    const verify = await api("GET", `/v1/appScreenshotSets/${setId}`);
    if (verify.data?.attributes?.screenshotDisplayType !== displayType) {
      throw Object.assign(new Error(`screenshot set type mismatch for ${label}`), {
        status: 409,
        body: {
          expected: displayType,
          actual: verify.data?.attributes?.screenshotDisplayType,
          setId,
        },
      });
    }

    const existing = await api("GET", `/v1/appScreenshotSets/${setId}/appScreenshots`);
    const shots = existing.data || [];
    if (FORCE_SCREENSHOTS && shots.length > 0) {
      for (const shot of shots) {
        try {
          await api("DELETE", `/v1/appScreenshots/${shot.id}`);
          push(`deleted old ${label} screenshot`, shot.id);
        } catch (e) {
          push(`delete ${label} screenshot failed`, { id: shot.id, status: e.status, body: e.body });
        }
      }
    }

    const after = FORCE_SCREENSHOTS
      ? { data: [] }
      : await api("GET", `/v1/appScreenshotSets/${setId}/appScreenshots`);
    if ((after.data || []).length === 0) {
      for (const name of SCREENSHOT_FILES) {
        const filePath = path.join(dir, name);
        if (!fs.existsSync(filePath)) {
          push(`missing screenshot file`, filePath);
          continue;
        }
        const id = await uploadScreenshot(setId, filePath);
        push(`uploaded ${label} screenshot`, { name, id, displayType });
      }
    } else {
      push(`${label} screenshots already present`, after.data.length);
    }
  }

  // Screenshot sets: 6.7" required, 6.5" optional
  if (enLoc?.id) {
    try {
      await ensureScreenshotSet("APP_IPHONE_67", SCREENSHOT_DIR, "6.7");
    } catch (e) {
      push("6.7 screenshots failed", { status: e.status, body: e.body });
    }
    try {
      const dir65 = path.join(SCREENSHOT_DIR, "iphone-65");
      if (fs.existsSync(path.join(dir65, "01-hero.png"))) {
        await ensureScreenshotSet("APP_IPHONE_65", dir65, "6.5");
      } else {
        push("6.5 screenshots skipped — capture live shots then run script/process-live-screenshots.mjs first");
      }
    } catch (e) {
      push("6.5 screenshots failed", { status: e.status, body: e.body });
    }
  }

  // Attach latest VALID build
  if (versionId) {
    try {
      const builds = await api(
        "GET",
        `/v1/builds?filter[app]=${APP_ID}&filter[processingState]=VALID&sort=-uploadedDate&limit=10&include=preReleaseVersion`,
      );
      for (const b of builds.data || []) {
        push("valid build candidate", {
          id: b.id,
          buildNumber: b.attributes?.version,
          uploadedDate: b.attributes?.uploadedDate,
          preReleaseVersion: builds.included?.find(
            (x) => x.type === "preReleaseVersions" && x.id === b.relationships?.preReleaseVersion?.data?.id,
          )?.attributes?.version,
        });
      }
      // Prefer newest APP_STORE_ELIGIBLE build for this marketing version (list is -uploadedDate).
      const eligible = (builds.data || []).filter((b) => {
        if (b.attributes?.buildAudienceType !== "APP_STORE_ELIGIBLE") return false;
        const prv = builds.included?.find(
          (x) => x.type === "preReleaseVersions" && x.id === b.relationships?.preReleaseVersion?.data?.id,
        );
        return prv?.attributes?.version === VERSION_STRING;
      });
      const build = eligible[0];
      push("eligible builds for version", eligible.map((b) => ({
        id: b.id,
        buildNumber: b.attributes?.version,
        uploadedDate: b.attributes?.uploadedDate,
      })));
      push("selected build", {
        id: build?.id,
        buildNumber: build?.attributes?.version,
        uploadedDate: build?.attributes?.uploadedDate,
        audience: build?.attributes?.buildAudienceType,
      });
      const attachedId = version?.relationships?.build?.data?.id;
      if (build?.id && build.id !== attachedId) {
        await api("PATCH", `/v1/appStoreVersions/${versionId}`, {
          data: {
            type: "appStoreVersions",
            id: versionId,
            relationships: {
              build: { data: { type: "builds", id: build.id } },
            },
          },
        });
        push(`attached build to version ${VERSION_STRING}`, build.id);
      } else if (attachedId) {
        push("build already attached", attachedId);
      } else {
        push("no APP_STORE_ELIGIBLE build for", VERSION_STRING);
      }
    } catch (e) {
      push("attach build failed", { status: e.status, body: e.body });
    }
  }

  // Pricing — free
  try {
    const pricePoints = await api(
      "GET",
      `/v1/apps/${APP_ID}/appPricePoints?filter[territory]=USA&limit=5`,
    );
    push("pricePoints sample", (pricePoints.data || []).slice(0, 3).map((p) => ({
      id: p.id,
      customerPrice: p.attributes?.customerPrice,
    })));
  } catch (e) {
    push("pricePoints fetch failed", { status: e.status, body: e.body });
  }

  try {
    // Create free price schedule if possible
    const territories = await api("GET", "/v1/territories?limit=200");
    const territoryIds = (territories.data || []).map((t) => t.id);
    push("territories count", territoryIds.length);

    // Check current availability
    const avail = await api("GET", `/v1/apps/${APP_ID}/appAvailabilityV2`);
    push("availability", avail.data?.attributes || avail.data);
  } catch (e) {
    push("availability check", { status: e.status, errors: e.body?.errors?.map((x) => x.detail) });
  }

  // Privacy declarations (read)
  try {
    const privacy = await api("GET", `/v1/apps/${APP_ID}/appPrivacyDetails`);
    push("privacyDetails", privacy);
  } catch (e) {
    push("privacyDetails", { status: e.status, errors: e.body?.errors?.map((x) => x.detail || x.code) });
  }

  fs.writeFileSync("store/asc-launch-prep-log.json", JSON.stringify(log, null, 2));
  push("wrote store/asc-launch-prep-log.json");
}

main().catch((e) => {
  console.error("FATAL", e.message, e.body || e);
  process.exit(1);
});
