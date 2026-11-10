import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function files(directory, prefix = "") {
  return readdirSync(join(directory, prefix), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(prefix, entry.name);
      if (entry.isDirectory()) return files(directory, path);
      return entry.isFile() ? [path] : [];
    },
  );
}
function sameFile(source, target) {
  return (
    existsSync(target) &&
    createHash("sha256").update(readFileSync(source)).digest("hex") ===
      createHash("sha256").update(readFileSync(target)).digest("hex")
  );
}
export function verifyNetlifyAssets(projectRoot, publishDirectory) {
  const root = resolve(projectRoot);
  const published = resolve(publishDirectory);
  if (
    existsSync(join(published, "BUILD_ID")) ||
    existsSync(join(published, "server"))
  )
    throw new Error(
      "Refusing raw Next.js output as the CDN artifact. Run build and publication in one Netlify deploy invocation so the adapter's publish-directory swap remains active.",
    );
  const publicRoot = join(root, "public");
  const publicFiles = files(publicRoot);
  for (const file of publicFiles)
    if (!sameFile(join(publicRoot, file), join(published, file)))
      throw new Error(
        `Netlify CDN artifact is missing or has stale public/${file}. Publication stopped before upload.`,
      );
  // The pinned adapter stashes the raw build here during onPostBuild, then
  // restores it in onEnd. Validate the relocated _next/static files too.
  const compiled = join(root, ".netlify", ".next", "static");
  if (!existsSync(compiled))
    throw new Error(
      "Netlify adapter's stashed browser output is missing. Check plugin order/version; publication stopped before upload.",
    );
  const browserFiles = files(compiled);
  if (!browserFiles.some((file) => file.endsWith(".js")))
    throw new Error(
      "Netlify browser artifact has no JavaScript chunks; publication stopped before upload.",
    );
  for (const file of browserFiles)
    if (
      !sameFile(join(compiled, file), join(published, "_next", "static", file))
    )
      throw new Error(
        `Netlify CDN artifact is missing or has stale _next/static/${file}. Publication stopped before upload.`,
      );
  return { publicFiles: publicFiles.length, browserFiles: browserFiles.length };
}
