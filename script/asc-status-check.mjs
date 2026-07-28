/**
 * Diagnostic: App Store Connect version readiness.
 * Run: node script/asc-status-check.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";

const KEY_ID = "JGNQY22FBN";
const ISSUER_ID = "b0b80a05-310f-4550-b15c-262f1d87e87b";
const APP_ID = "6792917459";
const KEY_PATH = "c:/Users/Coene/Downloads/AuthKey_JGNQY22FBN.p8";
const VERSION_STRING = process.env.ASC_VERSION || "1.0.1";
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
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  const out = {};

  const versions = await api(
    "GET",
    `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${VERSION_STRING}&include=build,appStoreVersionLocalizations`,
  );
  out.versions = versions;
  const version = versions.json?.data?.[0];
  const versionId = version?.id;
  out.versionSummary = version
    ? {
        id: versionId,
        state: version.attributes?.appStoreState,
        releaseType: version.attributes?.releaseType,
        buildId: version.relationships?.build?.data?.id,
      }
    : null;

  const locs = versions.json?.included?.filter((x) => x.type === "appStoreVersionLocalizations") || [];
  out.localizations = locs.map((l) => ({
    id: l.id,
    locale: l.attributes?.locale,
    description: l.attributes?.description?.slice(0, 80),
    keywords: l.attributes?.keywords,
    whatsNew: l.attributes?.whatsNew?.slice(0, 80),
    promotionalText: l.attributes?.promotionalText,
    supportUrl: l.attributes?.supportUrl,
    marketingUrl: l.attributes?.marketingUrl,
  }));

  if (versionId) {
    out.versionSubmission = await api("GET", `/v1/appStoreVersions/${versionId}/appStoreVersionSubmission`);
    out.reviewDetail = await api("GET", `/v1/appStoreVersions/${versionId}/appStoreReviewDetail`);
    out.appClipDefault = await api("GET", `/v1/appStoreVersions/${versionId}/appClipDefaultExperience`);
  }

  out.appInfos = await api("GET", `/v1/apps/${APP_ID}/appInfos?include=appInfoLocalizations`);
  const info = out.appInfos.json?.data?.[0];
  if (info?.id) {
    const infoLocs = out.appInfos.json?.included?.filter((x) => x.type === "appInfoLocalizations") || [];
    out.appInfoLocalizations = infoLocs.map((l) => ({
      locale: l.attributes?.locale,
      name: l.attributes?.name,
      subtitle: l.attributes?.subtitle,
      privacyPolicyUrl: l.attributes?.privacyPolicyUrl,
    }));
    out.ageRating = await api("GET", `/v1/appInfos/${info.id}/ageRatingDeclaration`);
    out.primaryCategory = info.relationships?.primaryCategory?.data?.id;
  }

  const buildId = version?.relationships?.build?.data?.id;
  if (buildId) {
    const build = await api("GET", `/v1/builds/${buildId}`);
    out.build = {
      id: buildId,
      number: build.json?.data?.attributes?.version,
      processingState: build.json?.data?.attributes?.processingState,
      usesNonExemptEncryption: build.json?.data?.attributes?.usesNonExemptEncryption,
      expired: build.json?.data?.attributes?.expired,
    };
    out.buildBetaDetail = await api("GET", `/v1/builds/${buildId}/buildBetaDetail`);
  }

  out.reviewSubmissions = await api("GET", `/v1/apps/${APP_ID}/reviewSubmissions?limit=5`);

  fs.writeFileSync("store/asc-status-check.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.versionSummary, null, 2));
  console.log("localizations", JSON.stringify(out.localizations, null, 2));
  console.log("appInfoLocalizations", JSON.stringify(out.appInfoLocalizations, null, 2));
  console.log("build", JSON.stringify(out.build, null, 2));
  console.log(
    "versionSubmission",
    out.versionSubmission.status,
    out.versionSubmission.json?.data?.attributes?.state,
  );
  console.log(
    "reviewSubmissions",
    out.reviewSubmissions.status,
    (out.reviewSubmissions.json?.data || []).map((s) => s.attributes?.state),
  );
  console.log("wrote store/asc-status-check.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
