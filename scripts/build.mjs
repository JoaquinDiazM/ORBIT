import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const dist = resolve(root, "dist");
const katexRoot = resolve(root, "node_modules", "katex");
const katexDist = resolve(katexRoot, "dist");
const katexVendor = resolve(dist, "vendor", "katex");
const developmentKatexBase = "./node_modules/katex/dist/";
const productionKatexBase = "./vendor/katex/";

try {
  await access(katexDist);
} catch {
  throw new Error("No se encontró KaTeX. Ejecuta `npm install` antes de construir ORBIT.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const sourceIndex = await readFile(resolve(root, "index.html"), "utf8");
const developmentReferenceCount = sourceIndex.split(developmentKatexBase).length - 1;
if (developmentReferenceCount !== 2) {
  throw new Error(
    `index.html debe contener exactamente dos referencias locales de KaTeX; se encontraron ${developmentReferenceCount}.`,
  );
}
const builtIndex = sourceIndex.replaceAll(developmentKatexBase, productionKatexBase);
if (builtIndex.includes("node_modules/")) {
  throw new Error("El HTML construido no puede conservar rutas hacia node_modules.");
}
await writeFile(resolve(dist, "index.html"), builtIndex, "utf8");
await cp(resolve(root, "src"), resolve(dist, "src"), {
  recursive: true,
  filter: (source) => !source.endsWith("AGENTS.md"),
});
await cp(resolve(root, "public"), resolve(dist, "public"), { recursive: true });
await writeFile(resolve(dist, "404.html"), builtIndex, "utf8");

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

await Promise.all([
  access(resolve(katexVendor, "katex.mjs")),
  access(resolve(katexVendor, "katex.min.css")),
  access(resolve(katexVendor, "fonts")),
]);

await writeFile(
  resolve(dist, "build-info.json"),
  `${JSON.stringify(
    {
      project: "orbit-open-roadmap",
      generatedAt: new Date().toISOString(),
      buildType: "static-no-bundle",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Build estático creado en ${dist}`);
