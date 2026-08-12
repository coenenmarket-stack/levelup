/**
 * Complete App Privacy data usages via ASC iris web API (same as fastlane).
 * Uses LevelupLife API key; falls back notes if iris rejects JWT.
 * Run: node script/asc-privacy-setup.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";

const KEY_ID = "JGNQY22FBN";
const ISSUER_ID = "b0b80a05-310f-4550-b15c-262f1d87e87b";
const APP_ID = "6792917459";
const KEY_PATH = "c:/Users/Coene/Downloads/AuthKey_JGNQY22FBN.p8";
const IRIS = "https://appstoreconnect.apple.com/iris";
const API = "https://api.appstoreconnect.apple.com";

// Name already done. Remaining 11 per launch brief.
const REMAINING = [
  { category: "EMAIL_ADDRESS", purpose: "APP_FUNCTIONALITY" },
  { category: "PHOTOS_OR_VIDEOS", purpose: "APP_FUNCTIONALITY" },
  { category: "GAMEPLAY_CONTENT", purpose: "APP_FUNCTIONALITY" },
  { category: "CUSTOMER_SUPPORT", purpose: "APP_FUNCTIONALITY" },
  { category: "OTHER_USER_CONTENT", purpose: "APP_FUNCTIONALITY" },
  { category: "USER_ID", purpose: "APP_FUNCTIONALITY" },
  { category: "DEVICE_ID", purpose: "APP_FUNCTIONALITY" },
  { category: "PRODUCT_INTERACTION", purpose: "ANALYTICS" },
  { category: "CRASH_DATA", purpose: "ANALYTICS" },
  { category: "PERFORMANCE_DATA", purpose: "ANALYTICS" },
  { category: "OTHER_DIAGNOSTIC_DATA", purpose: "ANALYTICS" },
];

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

async function req(base, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-csrf-itc": "[asc-ui]",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

async function main() {
  // Prefer iris (web) endpoints used by ASC UI / fastlane
  let base = IRIS;
  let probe = await req(base, "GET", `/v1/apps/${APP_ID}/dataUsages?include=category,purpose,dataProtection&limit=200`);
  console.log("iris dataUsages", probe.status, probe.json?.errors?.[0]?.detail || `count=${probe.json?.data?.length}`);

  if (probe.status >= 400) {
    base = API;
    probe = await req(base, "GET", `/v1/apps/${APP_ID}/dataUsages?include=category,purpose,dataProtection&limit=200`);
    console.log("api dataUsages", probe.status, probe.json?.errors?.[0]?.detail || `count=${probe.json?.data?.length}`);
  }

  if (probe.status >= 400) {
    console.error("PRIVACY_API_UNAVAILABLE", JSON.stringify(probe.json?.errors || probe.json, null, 2));
    process.exit(2);
  }

  const existing = new Set();
  for (const row of probe.json.data || []) {
    const catRel = row.relationships?.category?.data?.id;
    if (catRel) existing.add(catRel);
  }
  // included may carry identifiers
  for (const inc of probe.json.included || []) {
    if (inc.type === "appDataUsageCategories") existing.add(inc.id);
  }
  console.log("existing category ids", [...existing]);

  for (const item of REMAINING) {
    if (existing.has(item.category)) {
      console.log("skip existing", item.category);
      continue;
    }
    // Create purpose + linked protection. Fastlane creates separate usage rows.
    // Pattern from spaceship: one create with category+purpose, one with category+dataProtection.
    const purposeBody = {
      data: {
        type: "appDataUsages",
        relationships: {
          app: { data: { type: "apps", id: APP_ID } },
          category: { data: { type: "appDataUsageCategories", id: item.category } },
          purpose: { data: { type: "appDataUsagePurposes", id: item.purpose } },
        },
      },
    };
    const protBody = {
      data: {
        type: "appDataUsages",
        relationships: {
          app: { data: { type: "apps", id: APP_ID } },
          category: { data: { type: "appDataUsageCategories", id: item.category } },
          dataProtection: { data: { type: "appDataUsageDataProtections", id: "DATA_LINKED_TO_YOU" } },
        },
      },
    };
    // Tracking = No → do not create DATA_USED_TO_TRACK_YOU

    let r1 = await req(base, "POST", "/v1/appDataUsages", purposeBody);
    console.log("purpose", item.category, item.purpose, r1.status, r1.json?.errors?.[0]?.detail || r1.json?.data?.id);
    let r2 = await req(base, "POST", "/v1/appDataUsages", protBody);
    console.log("linked", item.category, r2.status, r2.json?.errors?.[0]?.detail || r2.json?.data?.id);
  }

  const pub = await req(base, "GET", `/v1/apps/${APP_ID}/dataUsagePublishState`);
  console.log("publishState", pub.status, JSON.stringify(pub.json?.data || pub.json?.errors, null, 2));
  const pubId = pub.json?.data?.id;
  const published = pub.json?.data?.attributes?.published;
  if (pubId && !published) {
    const patch = await req(base, "PATCH", `/v1/appDataUsagesPublishState/${pubId}`, {
      data: {
        type: "appDataUsagesPublishState",
        id: pubId,
        attributes: { published: true },
      },
    });
    console.log("publish", patch.status, JSON.stringify(patch.json?.data?.attributes || patch.json?.errors, null, 2));
  } else if (published) {
    console.log("already published");
  }

  // Final dump
  const final = await req(base, "GET", `/v1/apps/${APP_ID}/dataUsages?include=category,purpose,dataProtection&limit=200`);
  const cats = new Set();
  for (const inc of final.json.included || []) {
    if (inc.type === "appDataUsageCategories") cats.add(inc.id);
  }
  console.log("final categories", [...cats].sort());
  const pub2 = await req(base, "GET", `/v1/apps/${APP_ID}/dataUsagePublishState`);
  console.log("final published", pub2.json?.data?.attributes?.published);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
