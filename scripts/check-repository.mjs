import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = resolve(process.cwd());
const ignoredDirectoryNames = new Set([".git", "dist", "node_modules"]);
const approvedDependencies = new Map([
  [
    "katex",
    {
      field: "dependencies",
      decision: "docs/decisions/0005-local-katex-rendering.md",
    },
  ],
]);

async function walk(directory, predicate = () => true) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectoryNames.has(entry.name)) {
      files.push(...(await walk(absolute, predicate)));
    } else if (entry.isFile() && predicate(absolute)) files.push(absolute);
  }
  return files;
}

function displayPath(path) {
  return relative(root, path).replaceAll("\\", "/");
}

async function checkJavaScriptSyntax() {
  const directories = ["src", "scripts", "tests"].map((entry) => resolve(root, entry));
  const files = (
    await Promise.all(
      directories.map((directory) =>
        walk(directory, (path) => path.endsWith(".js") || path.endsWith(".mjs")),
      ),
    )
  ).flat();

  const failures = [];
  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], {
      cwd: root,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      failures.push(`${displayPath(file)}\n${result.stderr || result.stdout}`);
    }
  }
  return { label: `Sintaxis JavaScript (${files.length} archivos)`, failures };
}

async function checkMarkdownLinks() {
  const files = await walk(
    root,
    (path) => path.endsWith(".md") && !displayPath(path).startsWith("dist/"),
  );
  const failures = [];
  const linkPattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;

  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(linkPattern)) {
      let target = match[1].trim().split("#", 1)[0];
      if (!target || /^(https?:|mailto:)/i.test(target)) continue;
      if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
      const resolved = resolve(dirname(file), decodeURIComponent(target));
      if (!existsSync(resolved)) {
        failures.push(`${displayPath(file)} → ${target}`);
      }
    }
  }
  return { label: `Enlaces Markdown relativos (${files.length} archivos)`, failures };
}

async function checkPackagePolicy() {
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const failures = [];
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [packageName, version] of Object.entries(packageJson[field] ?? {})) {
      const approval = approvedDependencies.get(packageName);
      if (!approval || approval.field !== field) {
        failures.push(`${field}.${packageName} no tiene una excepción de dependencia aprobada.`);
        continue;
      }

      const decisionPath = resolve(root, approval.decision);
      if (!existsSync(decisionPath)) {
        failures.push(`${field}.${packageName} exige el ADR inexistente ${approval.decision}.`);
        continue;
      }

      const decisionText = await readFile(decisionPath, "utf8");
      if (!/- Estado:\s*aceptado/i.test(decisionText)) {
        failures.push(`${approval.decision} debe estar aceptado para permitir ${packageName}.`);
      }
      if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
        failures.push(`${field}.${packageName} debe usar una versión exacta; se encontró ${version}.`);
      }
      if (!decisionText.includes(`KaTeX \`${version}\``)) {
        failures.push(`${approval.decision} no respalda explícitamente KaTeX ${version}.`);
      }
    }
  }

  const configText = await readFile(resolve(root, "src/config.js"), "utf8");
  const versionMatch = configText.match(/version:\s*["']([^"']+)["']/);
  if (!versionMatch || versionMatch[1] !== packageJson.version) {
    failures.push(
      `La versión de package.json (${packageJson.version}) no coincide con APP_CONFIG (${versionMatch?.[1] ?? "no encontrada"}).`,
    );
  }

  return { label: "Política del paquete y versión", failures };
}

const checks = await Promise.all([
  checkJavaScriptSyntax(),
  checkMarkdownLinks(),
  checkPackagePolicy(),
]);

let hasFailures = false;
for (const check of checks) {
  if (check.failures.length === 0) {
    console.log(`✓ ${check.label}`);
    continue;
  }
  hasFailures = true;
  console.error(`✗ ${check.label}`);
  for (const failure of check.failures) console.error(`  - ${failure}`);
}

if (hasFailures) process.exitCode = 1;
