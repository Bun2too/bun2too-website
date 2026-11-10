import { resolve } from "node:path";
import { verifyBrowserConfig } from "../../../scripts/check-browser-config.mjs";
import { verifyNetlifyAssets } from "../../../scripts/check-netlify-assets.mjs";

// onBuild still sees raw Next.js output, before the adapter's onPostBuild swap.
export function onBuild() {
  if (process.env.BUN2TOO_RELEASE_CHECK === "true") {
    verifyBrowserConfig(process.env.NEXT_BUILD_DIR || ".next", process.env);
    console.log(
      "Verified release browser integration settings before the adapter publish-directory swap; values withheld.",
    );
  }
}

// Plugins run in configured order: the adapter has now prepared PUBLISH_DIR.
// Throwing here prevents upload, rather than finding missing assets afterward.
export function onPostBuild({ constants }) {
  const result = verifyNetlifyAssets(
    process.cwd(),
    resolve(constants.PUBLISH_DIR),
  );
  console.log(
    `Verified Netlify CDN artifact: ${result.publicFiles} public files and ${result.browserFiles} browser assets match their source bytes.`,
  );
}
