import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");

export const BRAND_SOURCE = resolve(
  repositoryRoot,
  "asset_sources",
  "brand",
  "orbit-mark.svg",
);

export const BRAND_OUTPUTS = Object.freeze([
  resolve(repositoryRoot, "public", "assets", "brand", "orbit-mark.svg"),
  resolve(repositoryRoot, "public", "favicon.svg"),
]);

function displayPath(path) {
  return relative(repositoryRoot, path).replaceAll("\\", "/");
}

export function normalizeSvg(source) {
  return `${source.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n").trimEnd()}\n`;
}

function assertCanonicalMark(source) {
  const requiredFragments = [
    'viewBox="0 0 64 64"',
    '<title id="orbit-title">ORBIT</title>',
    'd="M32 7 52 18.5v27L32 57 12 45.5v-27Z"',
    'transform="rotate(-18 32 32)"',
    'rx="10.6" ry="14"',
    'rx="6" ry="8.2"',
    'cx="39.994" cy="24.368"',
    'cx="28.325" cy="37.505"',
    '#08111f',
    '#17304e',
    '#78e3ff',
    '#ffd166',
    '#f6fbff',
  ];

  for (const fragment of requiredFragments) {
    if (!source.includes(fragment)) {
      throw new Error(`La fuente de marca no conserva el fragmento aprobado: ${fragment}`);
    }
  }
}

export async function generateBrandAssets({ check = false } = {}) {
  const source = normalizeSvg(await readFile(BRAND_SOURCE, "utf8"));
  assertCanonicalMark(source);

  const staleOutputs = [];
  for (const output of BRAND_OUTPUTS) {
    if (check) {
      let current = null;
      try {
        current = await readFile(output, "utf8");
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (current !== source) staleOutputs.push(displayPath(output));
      continue;
    }

    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, source, "utf8");
  }

  if (staleOutputs.length > 0) {
    throw new Error(
      `Recursos de marca desactualizados: ${staleOutputs.join(", ")}. ` +
        "Ejecuta `node scripts/generate-orbit-brand-assets.mjs`.",
    );
  }

  return BRAND_OUTPUTS.map(displayPath);
}

function parseArguments(arguments_) {
  const unknown = arguments_.filter((argument) => argument !== "--check");
  if (unknown.length > 0) {
    throw new Error(`Argumentos desconocidos: ${unknown.join(", ")}`);
  }
  return { check: arguments_.includes("--check") };
}

const isDirectInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectInvocation) {
  const options = parseArguments(process.argv.slice(2));
  const outputs = await generateBrandAssets(options);
  const action = options.check ? "verificados" : "generados";
  console.log(`Recursos de marca ${action}: ${outputs.join(", ")}`);
}
