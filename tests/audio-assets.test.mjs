import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  assert.equal(manifest.schema_version, 2);
  assert.equal(manifest.base_path, ".");

  const definitions = Object.entries(manifest.assets);
  assert.ok(definitions.length > 0);
  assert.deepEqual(
    new Set(definitions.map(([, definition]) => definition.id)).size,
    definitions.length,
    "Los IDs de audio deben ser únicos.",
  );

  const indexedSources = new Set();
  const indexedMetadata = new Set();
  const attribution = await readFile(resolve(audioRoot, "ATTRIBUTION.md"), "utf8");

  for (const [key, definition] of definitions) {
    assert.ok(!definition.src.startsWith("/"), `${key} debe usar una ruta relativa.`);
    assert.ok(!definition.metadata.startsWith("/"), `${key} debe usar metadatos relativos.`);
    assert.ok(!definition.src.split("/").includes(".."), `${key} no puede escapar de audio/.`);
    assert.ok(!definition.metadata.split("/").includes(".."), `${key} no puede escapar de audio/.`);
    assert.ok(
      ["ambience", "effects"].includes(definition.category),
      `${key} debe pertenecer a ambience o effects.`,
    );
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
    if (metadata.source.sound_url.startsWith("https://freesound.org/")) {
      assert.match(metadata.source.license_name, /Creative Commons 0/i);
    } else {
      assert.equal(
        metadata.source.sound_url,
        "https://chatgpt.com/c/6a90bb10-8000-83e9-82af-e55fc58da22c",
      );
      assert.match(metadata.source.author_name, /JoaquinDiazM/);
      assert.match(metadata.source.license_name, /MIT License/i);
      assert.match(metadata.source.provenance_note, /responsable del repositorio/i);
    }
    if (metadata.sha256) {
      assert.equal(
        createHash("sha256").update(header).digest("hex"),
        metadata.sha256,
        `${definition.src} no coincide con su SHA-256 documentado.`,
      );
    }
    if (key === "mission_start") {
      assert.match(
        metadata.intended_use,
        /interacci[oó]n válida/i,
        "El beep histórico debe documentar su uso actual como confirmación de interacción.",
      );
    }
    if (key === "ui_select") {
      assert.match(metadata.intended_use, /predeterminado/i);
    }
    if (key === "zone_unlocked") {
      assert.match(metadata.intended_use, /desbloquea por primera vez/i);
    }
    assert.ok(attribution.includes(definition.src), `${definition.src} falta en ATTRIBUTION.md.`);
    assert.equal(indexedSources.has(definition.src), false, `${definition.src} está indexado más de una vez.`);
    assert.equal(
      indexedMetadata.has(definition.metadata),
      false,
      `${definition.metadata} está indexado más de una vez.`,
    );
    indexedSources.add(definition.src);
    indexedMetadata.add(definition.metadata);
  }

  const files = await collectFiles(audioRoot);
  const oggSources = files.filter((path) => path.endsWith(".ogg")).map(portableRelative).sort();
  const metadataSources = files
    .filter((path) => path.endsWith(".json") && path !== manifestPath)
    .map(portableRelative)
    .sort();
  assert.deepEqual([...indexedSources].sort(), oggSources, "Todo Ogg debe estar indexado una vez.");
  assert.deepEqual(
    [...indexedMetadata].sort(),
    metadataSources,
    "Todo JSON de metadatos debe estar indexado una vez.",
  );
});

test("los cinco eventos de audio disponibles conservan sus claves estables", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(Object.keys(manifest.assets).length, 5);
  assert.deepEqual(Object.keys(manifest.assets).sort(), [
    "global_ambience",
    "hexagon_transition",
    "mission_start",
    "ui_select",
    "zone_unlocked",
  ]);
  assert.equal(manifest.assets.global_ambience.category, "ambience");
  assert.equal(manifest.assets.hexagon_transition.category, "effects");
  assert.equal(manifest.assets.mission_start.category, "effects");
  assert.equal(manifest.assets.ui_select.category, "effects");
  assert.equal(manifest.assets.zone_unlocked.category, "effects");
});
