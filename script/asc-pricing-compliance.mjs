/**
 * Set free price + export compliance for Level Up Life.
 * Run: node script/asc-pricing-compliance.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";

const KEY_ID = "JGNQY22FBN";
const ISSUER_ID = "b0b80a05-310f-4550-b15c-262f1d87e87b";
const APP_ID = "6792917459";
const KEY_PATH = "c:/Users/Coene/Downloads/AuthKey_JGNQY22FBN.p8";
const BUILD_ID = "1db731e9-f3d7-4e21-a5fc-563a965e0a80";
const FREE_USA = "eyJzIjoiNjc5MjkxNzQ1OSIsInQiOiJVU0EiLCJwIjoiMTAwMDAifQ";
const BASE = "https://api.appstoreconnect.apple.com";

function token() {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 1140, aud: "appstoreconnect-v1" }),
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
  return { status: res.status, json };
}

async function main() {
  // Current prices
  let r = await api("GET", `/v1/apps/${APP_ID}/appPriceSchedule`);
  console.log("current price schedule", r.status, JSON.stringify(r.json.errors || { id: r.json.data?.id }, null, 2));

  r = await api("POST", "/v1/appPriceSchedules", {
    data: {
      type: "appPriceSchedules",
      relationships: {
        app: { data: { type: "apps", id: APP_ID } },
        baseTerritory: { data: { type: "territories", id: "USA" } },
        manualPrices: { data: [{ type: "appPrices", id: "${price-0}" }] },
      },
    },
    included: [
      {
        type: "appPrices",
        id: "${price-0}",
        attributes: { startDate: null },
        relationships: {
          appPricePoint: { data: { type: "appPricePoints", id: FREE_USA } },
        },
      },
    ],
  });
  console.log("create price schedule", r.status, JSON.stringify(r.json.errors || { id: r.json.data?.id }, null, 2));

  // Availability all territories free
  r = await api("POST", "/v1/appAvailabilities", {
    data: {
      type: "appAvailabilities",
      attributes: { availableInNewTerritories: true },
      relationships: {
        app: { data: { type: "apps", id: APP_ID } },
        availableTerritories: { data: [{ type: "territories", id: "USA" }] },
      },
    },
  });
  console.log("availability v1", r.status, JSON.stringify(r.json.errors || r.json.data?.id, null, 2));

  // Try appAvailabilityV2
  r = await api("POST", "/v1/appAvailabilities", {
    data: {
      type: "appAvailabilities",
      attributes: { availableInNewTerritories: true },
      relationships: {
        app: { data: { type: "apps", id: APP_ID } },
      },
    },
  });
  console.log("availability minimal", r.status, JSON.stringify(r.json.errors || r.json.data, null, 2));

  // Export compliance
  r = await api("GET", `/v1/builds/${BUILD_ID}`);
  console.log("build encryption", {
    usesNonExemptEncryption: r.json.data?.attributes?.usesNonExemptEncryption,
  });
  r = await api("PATCH", `/v1/builds/${BUILD_ID}`, {
    data: {
      type: "builds",
      id: BUILD_ID,
      attributes: { usesNonExemptEncryption: false },
    },
  });
  console.log("encryption patch", r.status, JSON.stringify(r.json.errors || {
    usesNonExemptEncryption: r.json.data?.attributes?.usesNonExemptEncryption,
  }, null, 2));

  // Screenshot states
  r = await api("GET", "/v1/appScreenshotSets/0abf9b36-4db9-4553-b3ba-7062e56e77ba/appScreenshots");
  for (const s of r.json.data || []) {
    console.log("screenshot", s.attributes?.fileName, s.attributes?.assetDeliveryState);
  }

  // Verify privacy URL
  r = await api("GET", "/v1/appInfoLocalizations/80fee4d8-2a55-41e8-9b80-9f7bace5e811");
  console.log("privacy URL", r.json.data?.attributes?.privacyPolicyUrl);

  // Content rights / age rating already set via UI previously — skip
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
