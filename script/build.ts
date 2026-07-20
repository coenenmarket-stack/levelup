// Static-only build. The Express backend is gone — data + auth + game logic
// live in Firebase Auth / Firestore / Cloud Functions. We only build the
// React/Vite client bundle into dist/public.
import { build as viteBuild } from "vite";
import { rm } from "node:fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });
  console.log("building client...");
  await viteBuild();
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
