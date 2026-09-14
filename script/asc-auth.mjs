/**
 * Shared App Store Connect JWT helper.
 * Prefer env credentials in Cloud Agents:
 *   ASC_API_PRIVATE_KEY  — full .p8 PEM contents (including BEGIN/END lines)
 *   ASC_KEY_PATH         — filesystem path to .p8 (optional fallback)
 *   ASC_KEY_ID / ASC_ISSUER_ID / ASC_APP_ID — optional overrides
 */
import crypto from "node:crypto";
import fs from "node:fs";

export const ASC_KEY_ID = process.env.ASC_KEY_ID || "JGNQY22FBN";
export const ASC_ISSUER_ID = process.env.ASC_ISSUER_ID || "b0b80a05-310f-4550-b15c-262f1d87e87b";
export const ASC_APP_ID = process.env.ASC_APP_ID || "6792917459";
export const ASC_BASE = "https://api.appstoreconnect.apple.com";

function loadPrivateKeyPem() {
  const fromEnv = process.env.ASC_API_PRIVATE_KEY || process.env.APP_STORE_CONNECT_API_KEY;
  if (fromEnv && fromEnv.trim()) {
    // Support secrets stored with literal \n sequences.
    return fromEnv.includes("-----BEGIN")
      ? fromEnv.replace(/\\n/g, "\n")
      : fromEnv;
  }
  const keyPath =
    process.env.ASC_KEY_PATH ||
    process.env.APP_STORE_CONNECT_KEY_PATH ||
    "c:/Users/Coene/Downloads/AuthKey_JGNQY22FBN.p8";
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `ASC API key not found. Set ASC_API_PRIVATE_KEY (PEM contents) or ASC_KEY_PATH. Tried: ${keyPath}`,
    );
  }
  return fs.readFileSync(keyPath, "utf8");
}

export function ascToken() {
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: ASC_ISSUER_ID,
      iat: now,
      exp: now + 1140,
      aud: "appstoreconnect-v1",
    }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const key = crypto.createPrivateKey(loadPrivateKeyPem());
  const sig = crypto.sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" });
  return `${data}.${Buffer.from(sig).toString("base64url")}`;
}

export async function ascApi(method, urlPath, body) {
  const res = await fetch(`${ASC_BASE}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${ascToken()}`,
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
    json = { raw: text.slice(0, 800) };
  }
  return { status: res.status, ok: res.ok, json };
}
