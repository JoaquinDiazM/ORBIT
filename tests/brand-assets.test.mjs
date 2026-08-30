import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BRAND_OUTPUTS,
  BRAND_SOURCE,
  generateBrandAssets,
  normalizeSvg,
} from "../scripts/generate-orbit-brand-assets.mjs";

const MANIFEST_PATH = new URL("../public/manifest.webmanifest", import.meta.url);
const README_PATH = new URL("../README.md", import.meta.url);
const PROTOTYPE_SCREENSHOT_PATH = new URL(
  "../docs/screenshots/prototype.png",
  import.meta.url,
);
const SHELL_PATHS = [
  new URL("../index.html", import.meta.url),
  new URL("../editor.html", import.meta.url),
];

test("la marca pública y el favicon son reproducciones exactas de la fuente aprobada", async () => {
  const source = normalizeSvg(await readFile(BRAND_SOURCE, "utf8"));

  for (const output of BRAND_OUTPUTS) {
    assert.equal(await readFile(output, "utf8"), source);
  }

  await assert.doesNotReject(generateBrandAssets({ check: true }));
});

test("el SVG conserva geometría, paleta y nombre accesible del logotipo aprobado", async () => {
  const source = await readFile(BRAND_SOURCE, "utf8");

  assert.match(source, /viewBox="0 0 64 64"/);
  assert.match(source, /<title id="orbit-title">ORBIT<\/title>/);
  assert.match(source, /aria-labelledby="orbit-title"/);
  assert.match(source, /M32 7 52 18\.5v27L32 57 12 45\.5v-27Z/);
  assert.match(source, /rotate\(-18 32 32\)/);
  assert.match(source, /rx="10\.6" ry="14"/);
  assert.match(source, /rx="6" ry="8\.2"/);
  assert.match(source, /cx="39\.994" cy="24\.368"/);
  assert.match(source, /cx="28\.325" cy="37\.505"/);

  for (const color of ["#08111f", "#17304e", "#78e3ff", "#ffd166", "#f6fbff"]) {
    assert.match(source, new RegExp(color));
  }
});

test("el manifiesto web anuncia la marca vectorial sin depender de recursos generados en dist", async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));

  assert.equal(manifest.name, "ORBIT — Electromagnetismo");
  assert.equal(manifest.start_url, "../");
  assert.equal(manifest.scope, "../");
  assert.deepEqual(manifest.icons, [
    {
      src: "./assets/brand/orbit-mark.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
  ]);
});

test("la marca queda visible con tamaño contenido en README y ambos shells", async () => {
  const readme = await readFile(README_PATH, "utf8");
  assert.match(
    readme,
    /<img src="public\/assets\/brand\/orbit-mark\.svg" alt="" width="40" height="40" \/>/,
  );

  const shells = await Promise.all(
    SHELL_PATHS.map((path) => readFile(path, "utf8")),
  );
  for (const shell of shells) {
    assert.match(
      shell,
      /<link rel="icon" href="\.\/public\/favicon\.svg" type="image\/svg\+xml" sizes="any" \/>/,
    );
  }
});

test("README conserva una captura principal PNG de 1280 por 720", async () => {
  const readme = await readFile(README_PATH, "utf8");
  assert.match(
    readme,
    /!\[Captura de ORBIT\]\(docs\/screenshots\/prototype\.png\)/,
  );

  const screenshot = await readFile(PROTOTYPE_SCREENSHOT_PATH);
  assert.ok(screenshot.length >= 24, "La captura no contiene un encabezado PNG completo.");
  assert.deepEqual(
    [...screenshot.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  assert.equal(screenshot.readUInt32BE(8), 13);
  assert.equal(screenshot.toString("ascii", 12, 16), "IHDR");
  assert.equal(screenshot.readUInt32BE(16), 1280);
  assert.equal(screenshot.readUInt32BE(20), 720);
});
