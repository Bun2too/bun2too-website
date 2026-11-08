import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const documents = new Set();
async function collect(path, allMarkdown = false) {
  const entry = await stat(path);
  if (entry.isDirectory()) {
    for (const child of await readdir(path))
      await collect(resolve(path, child), allMarkdown);
  } else if (
    (allMarkdown && extname(path) === ".md") ||
    path.endsWith(`${sep}AGENTS.md`)
  )
    documents.add(path);
}
for (const name of ["README.md", "AGENTS.md", "docs", ".agents/skills"])
  await collect(resolve(root, name), true);
for (const name of ["src", "tests", "netlify"])
  await collect(resolve(root, name));
const failures = [];
let links = 0;
for (const path of documents) {
  const source = await readFile(path, "utf8");
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].trim();
    const target = raw.startsWith("<")
      ? raw.slice(1, raw.indexOf(">"))
      : raw.split(/\s/)[0];
    if (
      !target ||
      target.startsWith("#") ||
      target.startsWith("/") ||
      /^[a-z][a-z\d+.-]*:/i.test(target)
    )
      continue;
    const local = decodeURIComponent(target.split(/[?#]/)[0]);
    if (!local) continue;
    const destination = resolve(dirname(path), local);
    links++;
    if (relative(root, destination).startsWith(`..${sep}`)) {
      failures.push(
        `${relative(root, path)}: link escapes the repository: ${local}`,
      );
      continue;
    }
    try {
      await stat(destination);
      let directory = root;
      for (const part of relative(root, destination)
        .split(sep)
        .filter(Boolean)) {
        if (!(await readdir(directory)).includes(part)) {
          failures.push(
            `${relative(root, path)}: filename casing does not match ${local}`,
          );
          break;
        }
        directory = resolve(directory, part);
      }
    } catch {
      failures.push(`${relative(root, path)}: missing ${local}`);
    }
  }
}
if (failures.length)
  throw new Error(
    `Documentation links need attention:\n${failures.join("\n")}`,
  );
console.log(
  `Checked ${links} repository links across ${documents.size} Markdown documents.`,
);
