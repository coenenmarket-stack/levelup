/**
 * Trigger Codemagic iOS TestFlight build on main.
 * Requires: CODEMAGIC_API_TOKEN
 * Optional: CODEMAGIC_APP_ID (defaults from env or prompts lookup)
 *
 * Run: node script/trigger-codemagic-testflight.mjs
 */
const TOKEN = process.env.CODEMAGIC_API_TOKEN || process.env.CM_API_TOKEN;
const WORKFLOW_ID = process.env.CODEMAGIC_WORKFLOW_ID || "ios-testflight-launch";
const BRANCH = process.env.CODEMAGIC_BRANCH || "main";

if (!TOKEN) {
  console.error("Missing CODEMAGIC_API_TOKEN");
  process.exit(1);
}

async function main() {
  let appId = process.env.CODEMAGIC_APP_ID;
  if (!appId) {
    const appsRes = await fetch("https://api.codemagic.io/apps", {
      headers: { "x-auth-token": TOKEN },
    });
    const appsJson = await appsRes.json();
    if (!appsRes.ok) {
      console.error("List apps failed", appsRes.status, appsJson);
      process.exit(1);
    }
    const apps = appsJson?.applications || appsJson?.apps || appsJson || [];
    const match =
      (Array.isArray(apps) ? apps : []).find((a) =>
        /level.?up|levelup/i.test(JSON.stringify(a)),
      ) || (Array.isArray(apps) ? apps[0] : null);
    appId = match?._id || match?.id || match?.appId;
    console.log(
      "Resolved Codemagic app:",
      match?.appName || match?.name || match?.repositoryUrl || appId,
    );
  }
  if (!appId) {
    console.error("Could not resolve CODEMAGIC_APP_ID");
    process.exit(1);
  }

  const body = {
    appId,
    workflowId: WORKFLOW_ID,
    branch: BRANCH,
  };
  const res = await fetch("https://api.codemagic.io/builds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": TOKEN,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ status: res.status, ok: res.ok, body, response: json }, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
