import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const UPDATES_PATH = new URL("../ORBIT_UPDATES.md", import.meta.url);
const HISTORY_PATH = new URL("../docs/UPDATES_HISTORY.md", import.meta.url);
const PACKAGE_PATH = new URL("../package.json", import.meta.url);
const LEGACY_TEMPLATE_PATH = new URL(
  "../docs/CODEX_TASK_TEMPLATE.md",
  import.meta.url,
);

const ALLOWED_STATES = new Set([
  "propuesto",
  "faltan-detalles",
  "autorizado",
  "en-implementacion",
  "en-revision",
  "aprobado",
  "publicando",
  "bloqueado",
  "publicado",
  "pospuesto",
  "descartado",
]);

function maskFencedBlocks(markdown) {
  let activeFence = null;

  return markdown
    .split(/(?<=\n)/)
    .map((line) => {
      if (activeFence === null) {
        const opening = line.match(/^\s*(`{3,}|~{3,})/);
        if (!opening) {
          return line;
        }
        activeFence = {
          marker: opening[1][0],
          length: opening[1].length,
        };
        return line.replace(/[^\r\n]/g, " ");
      }

      const closing = line.match(/^\s*(`{3,}|~{3,})\s*(?:\r?\n)?$/);
      if (
        closing &&
        closing[1][0] === activeFence.marker &&
        closing[1].length >= activeFence.length
      ) {
        activeFence = null;
      }
      return line.replace(/[^\r\n]/g, " ");
    })
    .join("");
}

function getWorkflowSections(markdown) {
  const masked = maskFencedBlocks(markdown);
  const cohortHeadings = [
    ...masked.matchAll(/^## Cohorte inmediata\s*$/gm),
  ];
  const activeHeadings = [
    ...masked.matchAll(/^## Actualizaciones activas\s*$/gm),
  ];
  const historyHeadings = [
    ...masked.matchAll(/^## Historial\s*$/gm),
  ];
  assert.equal(cohortHeadings.length, 1, "debe existir una cohorte inmediata exacta");
  assert.equal(activeHeadings.length, 1, "debe existir una sección activa exacta");
  assert.equal(
    historyHeadings.length,
    1,
    "debe existir una sección de historial exacta",
  );
  assert.doesNotMatch(
    masked,
    /^## Actualizaciones publicadas\s*$/gm,
    "las fichas publicadas deben vivir en docs/UPDATES_HISTORY.md",
  );

  const cohortHeading = cohortHeadings[0];
  const activeHeading = activeHeadings[0];
  const historyHeading = historyHeadings[0];
  assert.ok(
    cohortHeading.index < activeHeading.index && activeHeading.index < historyHeading.index,
    "las secciones de actualizaciones están fuera de orden",
  );

  const cohortStart = cohortHeading.index + cohortHeading[0].length;
  const activeStart = activeHeading.index + activeHeading[0].length;
  return {
    cohort: {
      raw: markdown.slice(cohortStart, activeHeading.index),
      masked: masked.slice(cohortStart, activeHeading.index),
    },
    active: {
      raw: markdown.slice(activeStart, historyHeading.index),
      masked: masked.slice(activeStart, historyHeading.index),
    },
  };
}

function getSubsection(bodyMasked, heading) {
  const matches = [
    ...bodyMasked.matchAll(new RegExp(`^#### ${heading}\\s*$`, "gm")),
  ];
  assert.ok(matches.length <= 1, `subsección duplicada: ${heading}`);
  if (matches.length === 0) {
    return "";
  }

  const start = matches[0].index + matches[0][0].length;
  const remainder = bodyMasked.slice(start);
  const nextHeading = remainder.search(/^####\s+/m);
  return nextHeading === -1 ? remainder : remainder.slice(0, nextHeading);
}

function requireSingleMatch(text, pattern, message) {
  const matches = [...text.matchAll(pattern)];
  assert.equal(matches.length, 1, message);
  return matches[0];
}

function compareSemver(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function compareActiveUpdates(left, right) {
  const leftIsAuto = left.version === "auto";
  const rightIsAuto = right.version === "auto";

  if (leftIsAuto !== rightIsAuto) {
    return leftIsAuto ? 1 : -1;
  }

  if (!leftIsAuto) {
    const versionOrder = compareSemver(left.version, right.version);
    if (versionOrder !== 0) {
      return versionOrder;
    }
  }

  return Number(left.id.slice(4)) - Number(right.id.slice(4));
}

function parseSection(section, sectionName) {
  const headingLike = [
    ...section.masked.matchAll(/^#{1,6}\s+UPD.*$/gm),
  ].map((match) => match[0]);
  const malformed = headingLike.filter(
    (heading) => !/^### UPD-\d{3} — \S.*$/.test(heading),
  );
  assert.deepEqual(
    malformed,
    [],
    `encabezado de actualización inválido en ${sectionName}`,
  );

  const headings = [
    ...section.masked.matchAll(/^### (UPD-\d{3}) — \S.*$/gm),
  ];
  return headings.map((heading, index) => {
    const end = headings[index + 1]?.index ?? section.raw.length;
    const body = section.raw.slice(heading.index, end);
    const bodyMasked = section.masked.slice(heading.index, end);
    const firstSubsection = bodyMasked.search(/^####\s+/m);
    const metadata =
      firstSubsection === -1
        ? bodyMasked
        : bodyMasked.slice(0, firstSubsection);
    const stateMatches = [...metadata.matchAll(/^- Estado: `([^`]+)`$/gm)];
    const versionMatches = [
      ...metadata.matchAll(/^- Versión objetivo: `(auto|\d+\.\d+\.\d+)`$/gm),
    ];
    return {
      id: heading[1],
      section: sectionName,
      state: stateMatches[0]?.[1] ?? null,
      stateCount: stateMatches.length,
      version: versionMatches[0]?.[1] ?? null,
      versionCount: versionMatches.length,
      body,
      metadata,
      review: getSubsection(bodyMasked, "Implementación y revisión"),
    };
  });
}

function parseImmediateCohort(section) {
  const versionMatches = [
    ...section.masked.matchAll(/^- Versión: `(\d+\.\d+\.\d+)`$/gm),
  ];
  const stateMatches = [
    ...section.masked.matchAll(/^- Estado de la cohorte: `(abierta|cerrada)`$/gm),
  ];
  const idsMatches = [
    ...section.masked.matchAll(
      /^- IDs: (`UPD-\d{3}`(?:, `UPD-\d{3}`)*)$/gm,
    ),
  ];

  if (
    versionMatches.length === 0 &&
    stateMatches.length === 0 &&
    idsMatches.length === 0
  ) {
    assert.match(
      section.raw,
      /Sin cohorte inmediata/,
      "debe declararse una cohorte o indicar que no existe",
    );
    return null;
  }

  assert.equal(versionMatches.length, 1, "la cohorte debe declarar una versión");
  assert.equal(stateMatches.length, 1, "la cohorte debe declarar un estado");
  assert.equal(idsMatches.length, 1, "la cohorte debe declarar sus IDs exactos");
  const ids = [...idsMatches[0][1].matchAll(/`(UPD-\d{3})`/g)].map(
    (match) => match[1],
  );
  assert.equal(new Set(ids).size, ids.length, "la cohorte no puede repetir IDs");

  if (stateMatches[0][1] === "cerrada") {
    requireSingleMatch(
      section.masked,
      /^- Cierre confirmado por JoaquinDiazM: \d{4}-\d{2}-\d{2}\.$/gm,
      "una cohorte cerrada requiere confirmación explícita",
    );
  }

  return {
    version: versionMatches[0][1],
    state: stateMatches[0][1],
    ids,
  };
}

function parsePublishedHistory(historyMarkdown) {
  const masked = maskFencedBlocks(historyMarkdown);
  const indexHeadings = [
    ...masked.matchAll(/^## Cohortes publicadas\s*$/gm),
  ];
  assert.equal(
    indexHeadings.length,
    1,
    "el historial debe tener un índice de cohortes exacto",
  );

  const cohortHeadings = [
    ...masked.matchAll(/^## ORBIT (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})\s*$/gm),
  ];
  const publishedStart = indexHeadings[0].index + indexHeadings[0][0].length;
  const publishedBody = masked.slice(publishedStart);
  if (cohortHeadings.length === 0) {
    assert.doesNotMatch(
      publishedBody,
      /^### UPD-/gm,
      "hay fichas publicadas sin manifiesto de cohorte",
    );
    assert.match(historyMarkdown.slice(publishedStart), /Ninguna registrada/);
    return [];
  }

  assert.ok(
    cohortHeadings.every(({ index }) => index > indexHeadings[0].index),
    "las cohortes deben estar dentro de su sección publicada",
  );

  const versions = cohortHeadings.map((heading) => heading[1]);
  assert.equal(new Set(versions).size, versions.length, "una versión histórica está duplicada");

  return cohortHeadings.flatMap((heading, index) => {
    const end = cohortHeadings[index + 1]?.index ?? historyMarkdown.length;
    const raw = historyMarkdown.slice(heading.index, end);
    const groupMasked = masked.slice(heading.index, end);
    const firstEntry = groupMasked.search(/^### UPD-/m);
    assert.notEqual(firstEntry, -1, `la cohorte ${heading[1]} no contiene fichas`);
    const metadata = groupMasked.slice(0, firstEntry);
    const state = requireSingleMatch(
      metadata,
      /^- Estado de la cohorte: `publicado`$/gm,
      `la cohorte ${heading[1]} debe estar publicada`,
    );
    assert.ok(state);
    const idsLine = requireSingleMatch(
      metadata,
      /^- IDs: (`UPD-\d{3}`(?:, `UPD-\d{3}`)*)$/gm,
      `la cohorte ${heading[1]} debe declarar sus IDs`,
    );
    const manifestIds = [...idsLine[1].matchAll(/`(UPD-\d{3})`/g)].map(
      (match) => match[1],
    );
    assert.equal(
      new Set(manifestIds).size,
      manifestIds.length,
      `la cohorte ${heading[1]} repite IDs`,
    );
    const releaseHash = requireSingleMatch(
      metadata,
      /^- Commit de release: `([0-9a-f]{40})`$/gm,
      `la cohorte ${heading[1]} debe declarar el hash del release`,
    )[1];
    const entries = parseSection({ raw, masked: groupMasked }, "published");
    assert.deepEqual(
      entries.map(({ id }) => id).sort(),
      [...manifestIds].sort(),
      `la cohorte ${heading[1]} debe archivar exactamente todos sus IDs`,
    );

    return entries.map((entry) => ({
      ...entry,
      publishedCohort: {
        version: heading[1],
        date: heading[2],
        releaseHash,
      },
    }));
  });
}

function parseDiscardedHistory(historyMarkdown) {
  const masked = maskFencedBlocks(historyMarkdown);
  const discardedHeadings = [
    ...masked.matchAll(/^## Actualizaciones descartadas\s*$/gm),
  ];
  assert.ok(
    discardedHeadings.length <= 1,
    "el historial no puede duplicar la sección de descartes",
  );
  if (discardedHeadings.length === 0) {
    return [];
  }

  const publishedHeading = masked.match(/^## Cohortes publicadas\s*$/m);
  assert.ok(publishedHeading, "el historial debe conservar sus cohortes publicadas");
  assert.ok(
    discardedHeadings[0].index < publishedHeading.index,
    "los descartes deben preceder a las cohortes publicadas",
  );

  const start = discardedHeadings[0].index + discardedHeadings[0][0].length;
  const raw = historyMarkdown.slice(start, publishedHeading.index);
  const discardedMasked = masked.slice(start, publishedHeading.index);
  const entries = parseSection(
    { raw, masked: discardedMasked },
    "discarded",
  );
  if (entries.length === 0) {
    assert.match(raw, /Ninguna registrada/);
  }
  return entries;
}

function validateRegistry(markdown, historyMarkdown, publishedVersion = "0.4.0") {
  const sections = getWorkflowSections(markdown);
  const history =
    historyMarkdown ??
    `# Historial\n\n## Cohortes publicadas\n\nNinguna registrada todavía.`;
  const historyMasked = maskFencedBlocks(history);
  const historyHeadingLike = [
    ...historyMasked.matchAll(/^#{1,6}\s+UPD.*$/gm),
  ].map((match) => match[0]);
  const malformedHistoryHeadings = historyHeadingLike.filter(
    (heading) => !/^### UPD-\d{3} — \S.*$/.test(heading),
  );
  assert.deepEqual(
    malformedHistoryHeadings,
    [],
    "el historial contiene encabezados de actualización inválidos",
  );
  const discardedEntries = parseDiscardedHistory(history);
  const publishedEntries = parsePublishedHistory(history);
  const parsedHistoryHeadings = [
    ...discardedEntries,
    ...publishedEntries,
  ].map(({ id }) => id).sort();
  const declaredHistoryHeadings = [
    ...historyMasked.matchAll(/^### (UPD-\d{3}) — \S.*$/gm),
  ].map((match) => match[1]).sort();
  assert.deepEqual(
    parsedHistoryHeadings,
    declaredHistoryHeadings,
    "toda ficha histórica debe pertenecer a descartes o a una cohorte publicada",
  );
  const entries = [
    ...parseSection(sections.active, "active"),
    ...discardedEntries,
    ...publishedEntries,
  ];
  const ids = entries.map(({ id }) => id);

  assert.ok(entries.length > 0, "debe existir al menos una actualización registrada");
  assert.equal(new Set(ids).size, ids.length, "los IDs deben ser únicos");

  for (const entry of entries) {
    assert.equal(
      entry.stateCount,
      1,
      `${entry.id} debe declarar exactamente un estado`,
    );
    assert.ok(ALLOWED_STATES.has(entry.state), `estado desconocido: ${entry.state}`);

    if (entry.section === "active") {
      assert.notEqual(entry.state, "publicado", `${entry.id} está en la sección incorrecta`);
      assert.notEqual(
        entry.state,
        "descartado",
        `${entry.id} descartado debe archivarse fuera de la cola activa`,
      );
      assert.equal(
        entry.versionCount,
        1,
        `${entry.id} debe declarar una versión objetivo válida`,
      );
      if (entry.state === "publicando") {
        assert.notEqual(entry.version, "auto", `${entry.id} debe resolver su versión`);
      }
    } else if (entry.section === "published") {
      assert.equal(entry.state, "publicado", `${entry.id} debe estar publicado`);
      const publishedVersionMatch = requireSingleMatch(
        entry.metadata,
        /^- Versión publicada: `(\d+\.\d+\.\d+)`$/gm,
        `${entry.id} debe declarar una versión publicada`,
      );
      const dateMatch = requireSingleMatch(
        entry.metadata,
        /^- Fecha: (\d{4}-\d{2}-\d{2})\.$/gm,
        `${entry.id} debe declarar una fecha`,
      );
      const releaseMatch = requireSingleMatch(
        entry.metadata,
        /^- Commit de release: `([0-9a-f]{40})`$/gm,
        `${entry.id} debe declarar un commit de release`,
      );
      requireSingleMatch(
        entry.metadata,
        /^- Resultado: .+$/gm,
        `${entry.id} debe declarar un resultado`,
      );
      assert.equal(publishedVersionMatch[1], entry.publishedCohort.version, entry.id);
      assert.equal(dateMatch[1], entry.publishedCohort.date, entry.id);
      assert.equal(releaseMatch[1], entry.publishedCohort.releaseHash, entry.id);
    } else {
      assert.equal(entry.section, "discarded", `${entry.id} está en una sección desconocida`);
      assert.equal(entry.state, "descartado", `${entry.id} debe estar descartado`);
      requireSingleMatch(
        entry.metadata,
        /^- Fecha de descarte: \d{4}-\d{2}-\d{2}\.$/gm,
        `${entry.id} debe declarar su fecha de descarte`,
      );
      assert.doesNotMatch(
        entry.metadata,
        /^- (?:Versión publicada|Commit de release):/gm,
        `${entry.id} descartado no puede fingir una publicación`,
      );
    }

    if (entry.state === "en-revision") {
      requireSingleMatch(entry.review, /^- Base revisada: .+$/gm, entry.id);
      requireSingleMatch(entry.review, /^- Rutas propias: .+$/gm, entry.id);
      requireSingleMatch(entry.review, /^- Resultado: .+$/gm, entry.id);
      requireSingleMatch(
        entry.review,
        /^- Pruebas automáticas: .+$/gm,
        entry.id,
      );
      requireSingleMatch(
        entry.review,
        /^- Preflight del entorno: .+$/gm,
        entry.id,
      );
      requireSingleMatch(
        entry.review,
        /^- Revisión manual humana: .+$/gm,
        entry.id,
      );
    }

    if (entry.state === "bloqueado") {
      requireSingleMatch(entry.review, /^- Causa: .+$/gm, entry.id);
      requireSingleMatch(entry.review, /^- Responsable: .+$/gm, entry.id);
      requireSingleMatch(
        entry.review,
        /^- Condición para reanudar: .+$/gm,
        entry.id,
      );
    }
  }

  const activeEntries = entries.filter(({ section }) => section === "active");
  const expectedActiveOrder = [...activeEntries].sort(compareActiveUpdates);
  assert.deepEqual(
    activeEntries.map(({ id }) => id),
    expectedActiveOrder.map(({ id }) => id),
    "las fichas activas deben ordenarse por versión objetivo ascendente, con auto al final e ID como desempate",
  );
  const cohort = parseImmediateCohort(sections.cohort);
  let releaseInTransit = false;
  const activeWork = activeEntries.filter(({ state }) =>
    ["en-implementacion", "en-revision", "aprobado", "publicando"].includes(
      state,
    ),
  );

  if (cohort === null) {
    assert.equal(
      activeWork.length,
      0,
      "no puede haber trabajo activo sin cohorte inmediata",
    );
  } else {
    const byId = new Map(activeEntries.map((entry) => [entry.id, entry]));
    for (const id of cohort.ids) {
      assert.ok(byId.has(id), `la cohorte referencia un ID inexistente: ${id}`);
      assert.equal(
        byId.get(id).version,
        cohort.version,
        `${id} no coincide con la versión de la cohorte`,
      );
    }

    const targetIds = activeEntries
      .filter(({ version }) => version === cohort.version)
      .map(({ id }) => id)
      .sort();
    assert.deepEqual(
      [...cohort.ids].sort(),
      targetIds,
      "la cohorte debe enumerar todos los IDs de su versión y ningún otro",
    );

    for (const entry of activeWork) {
      assert.ok(
        cohort.ids.includes(entry.id),
        `${entry.id} intenta activar una versión distinta de la inmediata`,
      );
    }

    const publishing = cohort.ids.filter(
      (id) => byId.get(id).state === "publicando",
    );
    releaseInTransit = publishing.length === cohort.ids.length;
    if (publishing.length > 0) {
      assert.equal(cohort.state, "cerrada", "solo una cohorte cerrada puede publicarse");
      assert.deepEqual(
        publishing.sort(),
        [...cohort.ids].sort(),
        "la publicación debe incluir la cohorte completa",
      );
    }

    if (releaseInTransit) {
      assert.equal(
        publishedVersion,
        cohort.version,
        "una cohorte publicando debe coincidir con la versión del paquete",
      );
    } else {
      assert.ok(
        compareSemver(cohort.version, publishedVersion) > 0,
        "la cohorte inmediata debe ser posterior a la versión publicada",
      );
    }

    const orderedVersions = [
      ...new Set(
        activeEntries
          .filter(
            ({ state, version }) =>
              version !== "auto" && !["pospuesto", "descartado"].includes(state),
          )
          .map(({ version }) => version),
      ),
    ].sort(compareSemver);
    assert.equal(
      cohort.version,
      orderedVersions[0],
      "la cohorte inmediata debe ser la menor versión pendiente",
    );

    for (const entry of activeEntries.filter(
      ({ state, version }) =>
        version !== "auto" && !["pospuesto", "descartado"].includes(state),
    )) {
      const comparison = compareSemver(entry.version, publishedVersion);
      if (releaseInTransit && entry.version === cohort.version) {
        assert.equal(comparison, 0, `${entry.id} debe coincidir con el release en tránsito`);
      } else {
        assert.ok(comparison > 0, `${entry.id} no puede apuntar a una versión ya publicada`);
      }
    }
  }

  if (compareSemver(publishedVersion, "0.4.1") >= 0 && !releaseInTransit) {
    const historicalVersions = [
      ...new Set(
        entries
          .filter(({ section }) => section === "published")
          .map(({ publishedCohort }) => publishedCohort.version),
      ),
    ].sort(compareSemver);
    assert.ok(
      historicalVersions.length > 0,
      `la versión ${publishedVersion} debe tener una cohorte archivada`,
    );
    assert.equal(
      historicalVersions.at(-1),
      publishedVersion,
      "la última cohorte histórica debe coincidir con la versión del paquete",
    );
  }

  return entries;
}

function registry(active, cohort = "Sin cohorte inmediata en preparación.") {
  return `
## Cohorte inmediata

${cohort}

## Actualizaciones activas

${active}

## Historial

Consulta docs/UPDATES_HISTORY.md.
`;
}

test("el registro usa IDs únicos, estados canónicos y archivo histórico", async () => {
  const [updates, history, packageText] = await Promise.all([
    readFile(UPDATES_PATH, "utf8"),
    readFile(HISTORY_PATH, "utf8"),
    readFile(PACKAGE_PATH, "utf8"),
  ]);
  validateRegistry(updates, history, JSON.parse(packageText).version);
});

test("las fichas activas se ordenan por versión, no por estado ni por ID global", () => {
  const card = (id, state, version) => `### ${id} — Entrada ${id}
- Estado: \`${state}\`
- Tipo: \`feature\`
- Versión objetivo: \`${version}\`
`;
  const patchPostponed = card("UPD-902", "pospuesto", "0.4.3");
  const patchProposed = card("UPD-903", "propuesto", "0.4.3");
  const laterLowerId = card("UPD-901", "pospuesto", "0.5.0");
  const unresolved = card("UPD-904", "propuesto", "auto");

  assert.doesNotThrow(() =>
    validateRegistry(
      registry([patchPostponed, patchProposed, laterLowerId, unresolved].join("\n")),
    ),
  );
  assert.throws(
    () => validateRegistry(registry([laterLowerId, patchPostponed].join("\n"))),
    /versión objetivo ascendente/,
  );
  assert.throws(
    () => validateRegistry(registry([patchProposed, patchPostponed].join("\n"))),
    /ID como desempate/,
  );
  assert.throws(
    () => validateRegistry(registry([unresolved, laterLowerId].join("\n"))),
    /auto al final/,
  );
});

test("una cohorte admite varios IDs pero impide adelantar otra versión", () => {
  const cohort = `
- Versión: \`0.4.1\`
- Estado de la cohorte: \`cerrada\`
- IDs: \`UPD-901\`, \`UPD-902\`
- Cierre confirmado por JoaquinDiazM: 2026-08-29.
`;
  const sameVersion = registry(
    `### UPD-901 — Uno
- Estado: \`en-implementacion\`
- Versión objetivo: \`0.4.1\`

### UPD-902 — Dos
- Estado: \`en-implementacion\`
- Versión objetivo: \`0.4.1\``,
    cohort,
  );
  assert.doesNotThrow(() => validateRegistry(sameVersion));

  const futureActive = registry(
    `### UPD-901 — Inmediato
- Estado: \`en-implementacion\`
- Versión objetivo: \`0.4.1\`

### UPD-902 — Futuro
- Estado: \`en-implementacion\`
- Versión objetivo: \`0.5.0\``,
    `
- Versión: \`0.4.1\`
- Estado de la cohorte: \`cerrada\`
- IDs: \`UPD-901\`
- Cierre confirmado por JoaquinDiazM: 2026-08-29.
`,
  );
  assert.throws(() => validateRegistry(futureActive));

  const skippedPatch = registry(
    `### UPD-901 — Parche pendiente
- Estado: \`autorizado\`
- Versión objetivo: \`0.4.1\`

### UPD-902 — Minor adelantado
- Estado: \`en-implementacion\`
- Versión objetivo: \`0.5.0\``,
    `
- Versión: \`0.5.0\`
- Estado de la cohorte: \`abierta\`
- IDs: \`UPD-902\`
`,
  );
  assert.throws(() => validateRegistry(skippedPatch));
});

test("el validador rechaza encabezados, IDs y estados ambiguos", () => {
  const validBody = `
- Estado: \`propuesto\`
- Tipo: \`bug\`
- Versión objetivo: \`auto\`
`;

  assert.throws(() =>
    validateRegistry(registry(`## UPD-001 — Encabezado incorrecto${validBody}`)),
  );
  assert.throws(() =>
    validateRegistry(
      registry(
        `### UPD-001 — Uno${validBody}\n### UPD-001 — Dos${validBody}`,
      ),
    ),
  );
  assert.throws(() =>
    validateRegistry(
      registry(
        `### UPD-001 — Estado duplicado${validBody}- Estado: \`autorizado\`\n`,
      ),
    ),
  );
  assert.throws(() =>
    validateRegistry(
      registry(
        `### UPD-002 — Versión duplicada${validBody}- Versión objetivo: \`0.5.0\`\n`,
      ),
    ),
  );
  assert.throws(() =>
    validateRegistry(
      registry(`### UPD-0001 — ID no canónico${validBody}`),
    ),
  );
  assert.throws(() =>
    validateRegistry(`
## Cohorte inmediata
Sin cohorte inmediata en preparación.
## Actualizaciones activas
## Actualizaciones activas
## Historial
`),
  );
});

test("un descarte se archiva fuera de la cola sin fingir una publicación", () => {
  const activeDiscard = registry(`
### UPD-810 — Descarte todavía activo
- Estado: \`descartado\`
- Tipo: \`feature\`
- Versión objetivo: \`auto\`
`);
  assert.throws(() => validateRegistry(activeDiscard));

  const archivedDiscard = `
# Historial

## Actualizaciones descartadas

### UPD-810 — Descarte archivado
- Estado: \`descartado\`
- Tipo: \`feature\`
- Versión objetivo: \`auto\`
- Fecha de descarte: 2026-08-29.

## Cohortes publicadas

Ninguna registrada todavía.
`;
  const entries = validateRegistry(registry("Ninguna."), archivedDiscard);
  assert.deepEqual(
    entries.map(({ id, state, section }) => ({ id, state, section })),
    [{ id: "UPD-810", state: "descartado", section: "discarded" }],
  );

  assert.throws(() =>
    validateRegistry(
      registry("Ninguna."),
      archivedDiscard.replace("- Fecha de descarte: 2026-08-29.\n", ""),
    ),
  );
  assert.throws(() =>
    validateRegistry(
      registry("Ninguna."),
      archivedDiscard.replace(
        "- Fecha de descarte: 2026-08-29.",
        "- Fecha de descarte: 2026-08-29.\n- Commit de release: `0123456789abcdef0123456789abcdef01234567`",
      ),
    ),
  );
  assert.throws(() =>
    validateRegistry(
      registry("Ninguna."),
      archivedDiscard.replace("## Actualizaciones descartadas\n\n", ""),
    ),
  );
});

test("la solicitud libre no puede inyectar metadatos ni entradas", () => {
  const updates = registry(`
### UPD-801 — Texto libre seguro
- Estado: \`propuesto\`
- Tipo: \`documentación\`
- Versión objetivo: \`auto\`

#### Solicitud original

- Estado: \`aprobado\`

\`\`\`\`markdown
\`\`\`
### UPD-999 — Ejemplo que no es una entrada
- Estado: \`publicando\`
- Versión objetivo: \`9.9.9\`
\`\`\`
\`\`\`\`

#### Implementación y revisión

- Resultado: no iniciada.
`);

  const entries = validateRegistry(updates);
  assert.deepEqual(
    entries.map(({ id, state }) => ({ id, state })),
    [{ id: "UPD-801", state: "propuesto" }],
  );
});

test("publicación exige historial, versión, fecha y hash verificables", () => {
  const emptyRegistry = registry("Ninguna.");
  const publishedHistory = `
# Historial

## Cohortes publicadas

## ORBIT 0.4.1 — 2026-08-29

- Estado de la cohorte: \`publicado\`
- IDs: \`UPD-701\`
- Commit de release: \`0123456789abcdef0123456789abcdef01234567\`

### UPD-701 — Registro publicado
- Estado: \`publicado\`
- Tipo: \`documentación\`
- Versión publicada: \`0.4.1\`
- Fecha: 2026-08-29.
- Commit de release: \`0123456789abcdef0123456789abcdef01234567\`
- Resultado: publicado y verificado.
`;
  assert.doesNotThrow(() =>
    validateRegistry(emptyRegistry, publishedHistory, "0.4.1"),
  );

  const incompleteHistory = publishedHistory.replace(
    "- IDs: `UPD-701`",
    "- IDs: `UPD-701`, `UPD-702`",
  );
  assert.throws(() =>
    validateRegistry(emptyRegistry, incompleteHistory, "0.4.1"),
  );

  const inconsistentHistory = publishedHistory.replace(
    "- Versión publicada: `0.4.1`",
    "- Versión publicada: `0.4.2`",
  );
  assert.throws(() =>
    validateRegistry(emptyRegistry, inconsistentHistory, "0.4.1"),
  );
  assert.throws(() => validateRegistry(emptyRegistry, undefined, "0.4.1"));

  const misplaced = registry(`
### UPD-702 — Publicado en sección activa
- Estado: \`publicado\`
- Tipo: \`documentación\`
- Versión objetivo: \`0.4.1\`
`);
  assert.throws(() => validateRegistry(misplaced));

  const unresolvedRelease = registry(
    `
### UPD-703 — Release sin versión
- Estado: \`publicando\`
- Tipo: \`documentación\`
- Versión objetivo: \`auto\`
`,
    `
- Versión: \`0.4.1\`
- Estado de la cohorte: \`cerrada\`
- IDs: \`UPD-703\`
- Cierre confirmado por JoaquinDiazM: 2026-08-29.
`,
  );
  assert.throws(() => validateRegistry(unresolvedRelease));

  const publishingReady = registry(
    `
### UPD-704 — Release sincronizado
- Estado: \`publicando\`
- Tipo: \`documentación\`
- Versión objetivo: \`0.4.1\`
`,
    `
- Versión: \`0.4.1\`
- Estado de la cohorte: \`cerrada\`
- IDs: \`UPD-704\`
- Cierre confirmado por JoaquinDiazM: 2026-08-29.
`,
  );
  assert.throws(() => validateRegistry(publishingReady, undefined, "0.4.0"));
  assert.doesNotThrow(() =>
    validateRegistry(publishingReady, undefined, "0.4.1"),
  );
});

test("la documentación remite al registro y la plantilla antigua no existe", async () => {
  await assert.rejects(
    readFile(LEGACY_TEMPLATE_PATH, "utf8"),
    (error) => error?.code === "ENOENT",
  );

  const documentationPaths = [
    new URL("../AGENTS.md", import.meta.url),
    new URL("../README.md", import.meta.url),
    new URL("../CONTRIBUTING.md", import.meta.url),
    new URL("../docs/CODEX_START_HERE.md", import.meta.url),
    new URL("../docs/DEVELOPMENT.md", import.meta.url),
  ];
  const documents = await Promise.all(
    documentationPaths.map((path) => readFile(path, "utf8")),
  );

  for (const document of documents) {
    assert.match(document, /ORBIT_UPDATES\.md/);
    assert.doesNotMatch(document, /CODEX_TASK_TEMPLATE\.md/);
  }
  assert.match(documents[1], /docs\/UPDATES_HISTORY\.md/);
});
