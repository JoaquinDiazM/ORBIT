import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const dist = resolve(root, "dist");
const katexRoot = resolve(root, "node_modules", "katex");
const katexDist = resolve(katexRoot, "dist");
const katexVendor = resolve(dist, "vendor", "katex");

try {
  await access(katexDist);
} catch {
  throw new Error("No se encontró KaTeX. Ejecuta `npm install` antes de construir ATLAS.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await cp(resolve(root, "index.html"), resolve(dist, "index.html"));
await cp(resolve(root, "src"), resolve(dist, "src"), {
  recursive: true,
  filter: (source) => !source.endsWith("AGENTS.md"),
});
await cp(resolve(root, "public"), resolve(dist, "public"), { recursive: true });
await cp(resolve(root, "index.html"), resolve(dist, "404.html"));

await mkdir(katexVendor, { recursive: true });
await Promise.all([
  cp(resolve(katexDist, "katex.mjs"), resolve(katexVendor, "katex.mjs")),
  cp(resolve(katexDist, "katex.min.css"), resolve(katexVendor, "katex.min.css")),
  cp(resolve(katexDist, "fonts"), resolve(katexVendor, "fonts"), { recursive: true }),
]);

try {
  await access(resolve(katexRoot, "LICENSE"));
  await cp(resolve(katexRoot, "LICENSE"), resolve(katexVendor, "LICENSE"));
} catch {
  console.warn("ADVERTENCIA: el paquete de KaTeX no incluye un archivo LICENSE copiable.");
}

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
