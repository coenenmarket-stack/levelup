/**
 * Submit App Store version for Apple review via ASC reviewSubmissions API.
 * Run: node script/asc-submit-for-review.mjs
 * Does not print the private key.
 *
 * Modern 3-step flow (appStoreVersionSubmissions CREATE is forbidden):
 * 1. POST /v1/reviewSubmissions (app + platform IOS) — reuse open on 409
 * 2. POST /v1/reviewSubmissionItems (reviewSubmission + appStoreVersion)
 * 3. PATCH /v1/reviewSubmissions/{id} with attributes.submitted: true
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

function errDetails(json) {
  return (json?.errors || []).map((e) => ({
    status: e.status,
    code: e.code,
    title: e.title,
    detail: e.detail,
  }));
}

async function findOpenReviewSubmission() {
  const list = await api(
    "GET",
    `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=10`,
  );
  const openStates = new Set([
    "READY_FOR_REVIEW",
    "WAITING_FOR_REVIEW",
    "IN_REVIEW",
    "UNRESOLVED_ISSUES",
    "CANCELING",
  ]);
  const open = (list.json?.data || []).find((s) => openStates.has(s.attributes?.state));
  return { list, open };
}

async function ensureReviewSubmission(push) {
  const create = await api("POST", "/v1/reviewSubmissions", {
    data: {
      type: "reviewSubmissions",
      attributes: { platform: "IOS" },
      relationships: {
        app: { data: { type: "apps", id: APP_ID } },
      },
    },
  });

  if (create.ok && create.json?.data?.id) {
    push("created reviewSubmission", {
      id: create.json.data.id,
      state: create.json.data.attributes?.state,
    });
    return create.json.data;
  }

  push("create reviewSubmission", {
    status: create.status,
    errors: errDetails(create.json),
  });

  // 409 Conflict: an open submission already exists — reuse it
  const { list, open } = await findOpenReviewSubmission();
  push("existing reviewSubmissions", {
    status: list.status,
    items: (list.json?.data || []).map((s) => ({
      id: s.id,
      state: s.attributes?.state,
      submittedDate: s.attributes?.submittedDate,
    })),
  });

  if (open) {
    push("reusing open reviewSubmission", { id: open.id, state: open.attributes?.state });
    return open;
  }

  return null;
}

async function ensureReviewItem(reviewSubmissionId, versionId, push) {
  const items = await api("GET", `/v1/reviewSubmissions/${reviewSubmissionId}/items`);
  const existing = (items.json?.data || []).find(
    (item) => item.relationships?.appStoreVersion?.data?.id === versionId,
  );
  if (existing) {
    push("reviewSubmissionItem already linked", {
      id: existing.id,
      state: existing.attributes?.state,
    });
    return existing;
  }

  // Also accept any item already pointing at an appStoreVersion (single-version apps)
  const anyVersionItem = (items.json?.data || []).find(
    (item) => item.relationships?.appStoreVersion?.data?.id,
  );
  if (anyVersionItem) {
    push("reviewSubmissionItem present", {
      id: anyVersionItem.id,
      versionId: anyVersionItem.relationships.appStoreVersion.data.id,
      state: anyVersionItem.attributes?.state,
    });
    if (anyVersionItem.relationships.appStoreVersion.data.id === versionId) {
      return anyVersionItem;
    }
  }

  const create = await api("POST", "/v1/reviewSubmissionItems", {
    data: {
      type: "reviewSubmissionItems",
      relationships: {
        reviewSubmission: { data: { type: "reviewSubmissions", id: reviewSubmissionId } },
        appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
      },
    },
  });
  push("create reviewSubmissionItem", {
    status: create.status,
    id: create.json?.data?.id,
    errors: errDetails(create.json),
  });
  return create.ok ? create.json.data : null;
}

async function main() {
  const log = [];
  const push = (msg, extra) => {
    console.log(msg, extra ?? "");
    log.push({ at: new Date().toISOString(), msg, extra });
  };

  const versions = await api(
    "GET",
    `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${VERSION_STRING}&include=build,appStoreVersionLocalizations`,
  );
  const version = versions.json?.data?.[0];
  const versionId = version?.id;
  push("version", {
    id: versionId,
    state: version?.attributes?.appStoreState,
    versionString: version?.attributes?.versionString,
  });

  if (!versionId) {
    push("FATAL", `No app store version ${VERSION_STRING}`);
    fs.writeFileSync("store/asc-submit-log.json", JSON.stringify(log, null, 2));
    process.exit(1);
  }

  const loc = versions.json?.included?.find((x) => x.type === "appStoreVersionLocalizations");
  push("localization check", {
    description: Boolean(loc?.attributes?.description),
    keywords: Boolean(loc?.attributes?.keywords),
    whatsNew: Boolean(loc?.attributes?.whatsNew),
    supportUrl: loc?.attributes?.supportUrl,
    marketingUrl: loc?.attributes?.marketingUrl,
  });

  const build = versions.json?.included?.find((x) => x.type === "builds");
  push("attached build", {
    id: build?.id,
    buildNumber: build?.attributes?.version,
    encryption: build?.attributes?.usesNonExemptEncryption,
    processingState: build?.attributes?.processingState,
  });

  if (!build?.id) {
    push("BLOCKER", "No build attached — run asc-launch-prep.mjs first");
    fs.writeFileSync("store/asc-submit-log.json", JSON.stringify(log, null, 2));
    process.exit(2);
  }

  // Export compliance — skip PATCH if already false (avoids 409 when immutable)
  if (build.attributes?.usesNonExemptEncryption === false) {
    push("export compliance", {
      status: "already_set",
      usesNonExemptEncryption: false,
    });
  } else {
    const enc = await api("PATCH", `/v1/builds/${build.id}`, {
      data: {
        type: "builds",
        id: build.id,
        attributes: { usesNonExemptEncryption: false },
      },
    });
    push("export compliance", {
      status: enc.status,
      usesNonExemptEncryption: enc.json?.data?.attributes?.usesNonExemptEncryption,
      errors: errDetails(enc.json),
    });
  }

  const alreadyWaiting = ["WAITING_FOR_REVIEW", "IN_REVIEW", "PENDING_APPLE_RELEASE", "PENDING_DEVELOPER_RELEASE"].includes(
    version?.attributes?.appStoreState,
  );
  if (alreadyWaiting) {
    push("already in review pipeline", version.attributes.appStoreState);
    fs.writeFileSync("store/asc-submit-log.json", JSON.stringify(log, null, 2));
    return;
  }

  const submission = await ensureReviewSubmission(push);
  if (!submission?.id) {
    push("BLOCKER", "Could not create or find an open reviewSubmission");
    fs.writeFileSync("store/asc-submit-log.json", JSON.stringify(log, null, 2));
    process.exit(3);
  }

  if (["WAITING_FOR_REVIEW", "IN_REVIEW"].includes(submission.attributes?.state)) {
    push("reviewSubmission already submitted", {
      id: submission.id,
      state: submission.attributes.state,
      submittedDate: submission.attributes.submittedDate,
    });
    fs.writeFileSync("store/asc-submit-log.json", JSON.stringify(log, null, 2));
    return;
  }

  const item = await ensureReviewItem(submission.id, versionId, push);
  if (!item?.id) {
    push("BLOCKER", "Could not link appStoreVersion to reviewSubmission");
    push("MANUAL", {
      tip: "Open ASC version page and complete App Privacy / missing required fields, then retry",
      url: `https://appstoreconnect.apple.com/apps/${APP_ID}/distribution/ios/version/inflight`,
    });
    fs.writeFileSync("store/asc-submit-log.json", JSON.stringify(log, null, 2));
    process.exit(4);
  }

  const submit = await api("PATCH", `/v1/reviewSubmissions/${submission.id}`, {
    data: {
      type: "reviewSubmissions",
      id: submission.id,
      attributes: { submitted: true },
    },
  });
  push("submit reviewSubmission", {
    status: submit.status,
    state: submit.json?.data?.attributes?.state,
    submittedDate: submit.json?.data?.attributes?.submittedDate,
    errors: errDetails(submit.json),
  });

  const refreshed = await api("GET", `/v1/appStoreVersions/${versionId}`);
  push("version state after submit", {
    state: refreshed.json?.data?.attributes?.appStoreState,
    appVersionState: refreshed.json?.data?.attributes?.appVersionState,
  });

  const { open: after } = await findOpenReviewSubmission();
  push("reviewSubmission after submit", after
    ? { id: after.id, state: after.attributes?.state, submittedDate: after.attributes?.submittedDate }
    : null);

  fs.writeFileSync("store/asc-submit-log.json", JSON.stringify(log, null, 2));
  console.log("wrote store/asc-submit-log.json");

  if (submit.status >= 400) {
    push("BLOCKER", "Submit PATCH failed — see errors above (often App Privacy / age rating / missing metadata)");
    process.exit(5);
  }

  const finalState = submit.json?.data?.attributes?.state || refreshed.json?.data?.attributes?.appStoreState;
  if (!["WAITING_FOR_REVIEW", "IN_REVIEW"].includes(finalState) && refreshed.json?.data?.attributes?.appStoreState === "PREPARE_FOR_SUBMISSION") {
    console.error("Submit returned OK but version still PREPARE_FOR_SUBMISSION — check ASC UI");
    process.exit(6);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
