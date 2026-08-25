import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await cp(resolve(root, "index.html"), resolve(dist, "index.html"));
await cp(resolve(root, "src"), resolve(dist, "src"), {
  recursive: true,
  filter: (source) => !source.endsWith("AGENTS.md"),
});
await cp(resolve(root, "public"), resolve(dist, "public"), { recursive: true });
await cp(resolve(root, "index.html"), resolve(dist, "404.html"));

await writeFile(
  resolve(dist, "build-info.json"),
  `${JSON.stringify(
    {
      project: "atlas-electromagnetismo-aplicado",
      generatedAt: new Date().toISOString(),
      buildType: "static-no-bundle",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Build estático creado en ${dist}`);
