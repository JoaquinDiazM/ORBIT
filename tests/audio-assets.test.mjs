import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const audioRoot = resolve(projectRoot, "public", "assets", "audio");
const manifestPath = resolve(audioRoot, "audio-manifest.json");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function portableRelative(path) {
  return relative(audioRoot, path).split(sep).join("/");
}

test("el manifiesto indexa cada Ogg con metadatos y rutas relativas", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.base_path, ".");

  const definitions = Object.entries(manifest.assets);
  assert.ok(definitions.length > 0);
  assert.deepEqual(
    new Set(definitions.map(([, definition]) => definition.id)).size,
    definitions.length,
    "Los IDs de audio deben ser únicos.",
  );

  const indexedSources = new Set();
  const attribution = await readFile(resolve(audioRoot, "ATTRIBUTION.md"), "utf8");

  for (const [key, definition] of definitions) {
    assert.ok(!definition.src.startsWith("/"), `${key} debe usar una ruta relativa.`);
    assert.ok(!definition.metadata.startsWith("/"), `${key} debe usar metadatos relativos.`);
    assert.ok(!definition.src.split("/").includes(".."), `${key} no puede escapar de audio/.`);
    assert.ok(!definition.metadata.split("/").includes(".."), `${key} no puede escapar de audio/.`);
    assert.ok(definition.volume >= 0 && definition.volume <= 1, `${key} tiene volumen inválido.`);

    const audioPath = resolve(audioRoot, definition.src);
    const metadataPath = resolve(audioRoot, definition.metadata);
    assert.ok((await stat(audioPath)).isFile(), `${definition.src} no existe.`);
    assert.ok((await stat(metadataPath)).isFile(), `${definition.metadata} no existe.`);

    const header = await readFile(audioPath);
    assert.equal(header.subarray(0, 4).toString("ascii"), "OggS", `${definition.src} no es Ogg.`);

    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    assert.equal(metadata.asset_id, definition.id);
    assert.equal(metadata.runtime_file, basename(definition.src));
    assert.equal(metadata.playback.loop, definition.loop);
    assert.equal(metadata.playback.suggested_volume, definition.volume);
    assert.ok(metadata.source.sound_url.startsWith("https://freesound.org/"));
    assert.match(metadata.source.license_name, /Creative Commons 0/i);
    assert.ok(attribution.includes(definition.src), `${definition.src} falta en ATTRIBUTION.md.`);
    indexedSources.add(definition.src);
  }

  const files = await collectFiles(audioRoot);
  const oggSources = files.filter((path) => path.endsWith(".ogg")).map(portableRelative).sort();
  assert.deepEqual([...indexedSources].sort(), oggSources, "Todo Ogg debe estar indexado una vez.");
});

test("los tres eventos de audio disponibles conservan sus claves estables", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.deepEqual(Object.keys(manifest.assets).sort(), [
    "global_ambience",
    "hexagon_transition",
    "mission_start",
  ]);
});
