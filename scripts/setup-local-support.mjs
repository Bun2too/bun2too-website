import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

// Local configuration only. Never supplies a default signing key to the app.
export async function setupLocalSupport(file = resolve(".env.local")) {
  let contents = "";
  try {
    contents = await readFile(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const existing = parseEnv(contents).SUPPORT_SESSION_SECRET;
  if (existing && existing.length < 32)
    throw new Error(
      "Existing SUPPORT_SESSION_SECRET is too short; replace it with at least 32 random characters.",
    );
  if (existing) {
    await chmod(file, 0o600);
    return false;
  }
  const assignment = `SUPPORT_SESSION_SECRET=${randomBytes(32).toString("hex")}`;
  // Preserve other local settings and comments; the last assignment wins.
  await writeFile(
    file,
    `${contents}${contents.endsWith("\n") || !contents ? "" : "\n"}${assignment}\n`,
    { mode: 0o600 },
  );
  await chmod(file, 0o600);
  return true;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const created = await setupLocalSupport();
    console.log(
      created
        ? "Created a local support signing secret in .env.local. The development launcher reloads environment-file changes automatically."
        : "Kept the existing local support signing secret.",
    );
    console.log(
      "Private inquiries also require Netlify Blobs context. AI requires its separate approved configuration.",
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
