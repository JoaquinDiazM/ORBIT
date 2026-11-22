import { createHash } from "node:crypto";
import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function buildOfflineResources(dist) {
  const resources = [];
  async function visit(path) {
    const absolute = join(dist, path);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) throw new Error("El build offline no admite enlaces simbólicos.");
    if (info.isDirectory()) {
      for (const child of (await readdir(absolute)).sort()) await visit(`${path}/${child}`);
    } else if (info.isFile() && /\.(?:html|js|mjs|css|json|svg|png|jpe?g|webp|ogg|webmanifest|woff2?|ttf|txt)$/i.test(path)) {
      const bytes = await readFile(absolute);
      resources.push({ url: `./${path}`, sha256: digest(bytes), size: bytes.length });
    }
  }
  for (const path of ["index.html", "editor.html", "src", "public", "vendor"]) await visit(path);
  const buildId = digest(JSON.stringify(resources));
  for (const entry of resources.filter((item) => ["./index.html", "./editor.html"].includes(item.url))) {
    const path = join(dist, entry.url);
    const shell = (await readFile(path, "utf8")).replace("</head>",
      `<meta name="orbit-build" content="${buildId}"></head>`);
    await writeFile(path, shell, "utf8");
    entry.sha256 = digest(shell);
    entry.size = Buffer.byteLength(shell);
  }
  const configuration = { buildId, resources };
  await writeFile(join(dist, "sw.js"),
    `import { installOrbitWorker } from "./src/online/service-worker.js";\n` +
    `installOrbitWorker(self, ${JSON.stringify(configuration)});\n`, "utf8");
  return { buildId, resourceCount: resources.length, offlineBytes: resources.reduce((sum, item) => sum + item.size, 0) };
}
