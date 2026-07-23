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
const BASE = "https://api.appstoreconnect.apple.com";

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

  if (appInfoId) {
    try {
      await api("PATCH", `/v1/appInfos/${appInfoId}`, {
        data: {
          type: "appInfos",
          id: appInfoId,
          attributes: {
            privacyPolicyUrl: PRIVACY_URL,
          },
        },
      });
      push("privacyPolicyUrl set on appInfo");
    } catch (e) {
      push("privacyPolicyUrl appInfo failed", { status: e.status, body: e.body });
    }
  }

  // Versions
  const versions = await api(
    "GET",
    `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[versionString]=1.0&include=appStoreVersionLocalizations,build`,
  );
  const version = versions.data?.[0];
  const versionId = version?.id;
  push("version", { id: versionId, state: version?.attributes?.appStoreState, versionString: version?.attributes?.versionString });

  const locs = versions.included?.filter((x) => x.type === "appStoreVersionLocalizations") || [];
  const en = locs.find((l) => l.attributes?.locale === "en-US") || locs[0];
  push("localization", en?.id);

  if (en?.id) {
    try {
      await api("PATCH", `/v1/appStoreVersionLocalizations/${en.id}`, {
        data: {
          type: "appStoreVersionLocalizations",
          id: en.id,
          attributes: {
            supportUrl: SUPPORT_URL,
            marketingUrl: MARKETING_URL,
          },
        },
      });
      push("support/marketing URLs confirmed on localization");
    } catch (e) {
      push("localization patch failed", { status: e.status, body: e.body });
    }
  }

  // Screenshot set for IPHONE_67
  if (en?.id) {
    try {
      const sets = await api(
        "GET",
        `/v1/appStoreVersionLocalizations/${en.id}/appScreenshotSets?filter[screenshotDisplayType]=APP_IPHONE_67`,
      );
      let setId = sets.data?.[0]?.id;
      if (!setId) {
        const created = await api("POST", "/v1/appScreenshotSets", {
          data: {
            type: "appScreenshotSets",
            attributes: { screenshotDisplayType: "APP_IPHONE_67" },
            relationships: {
              appStoreVersionLocalization: {
                data: { type: "appStoreVersionLocalizations", id: en.id },
              },
            },
          },
        });
        setId = created.data.id;
        push("created screenshot set", setId);
      } else {
        push("existing screenshot set", setId);
        // clear existing if any? skip — append only if empty
        const existing = await api("GET", `/v1/appScreenshotSets/${setId}/appScreenshots`);
        if ((existing.data || []).length > 0) {
          push("screenshots already present", existing.data.length);
        } else {
          for (const name of ["01-hero.png", "02-quests.png", "03-progress.png"]) {
            const id = await uploadScreenshot(setId, path.join(SCREENSHOT_DIR, name));
            push("uploaded screenshot", { name, id });
          }
        }
      }

      if (setId) {
        const existing = await api("GET", `/v1/appScreenshotSets/${setId}/appScreenshots`);
        if ((existing.data || []).length === 0) {
          for (const name of ["01-hero.png", "02-quests.png", "03-progress.png"]) {
            const id = await uploadScreenshot(setId, path.join(SCREENSHOT_DIR, name));
            push("uploaded screenshot", { name, id });
          }
        }
      }
    } catch (e) {
      push("screenshots failed", { status: e.status, body: e.body });
    }
  }

  // Attach latest VALID build
  if (versionId) {
    try {
      const builds = await api(
        "GET",
        `/v1/builds?filter[app]=${APP_ID}&filter[processingState]=VALID&sort=-uploadedDate&limit=5`,
      );
      const build = builds.data?.[0];
      push("latest valid build", {
        id: build?.id,
        version: build?.attributes?.version,
        uploadedDate: build?.attributes?.uploadedDate,
      });
      if (build?.id) {
        await api("PATCH", `/v1/appStoreVersions/${versionId}`, {
          data: {
            type: "appStoreVersions",
            id: versionId,
            relationships: {
              build: { data: { type: "builds", id: build.id } },
            },
          },
        });
        push("attached build to version 1.0");
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
