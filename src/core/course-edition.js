import { APP_CONFIG } from "../config.js";
import { AREA_APPEARANCE_CATALOG_VERSION } from "./area-appearance.js";
import { ProgressStorage } from "./storage.js";
import { validateProjectData } from "./validator.js";
import {
  EDITOR_COURSE_ID,
  EDITOR_DOCUMENT_SCHEMA_VERSION,
  applyEditorDocument,
} from "../editor/editor-document.js";

export const COURSE_EDITION_KIND = "orbit-course-edition";
export const COURSE_EDITION_SCHEMA_VERSION = 1;
export const COURSE_EDITION_RESET_POLICY = "full-reset-v1";
export const COURSE_EDITION_SOURCE_URL =
  "./public/data/courses/electromagnetism-applied.edition.json";

const COURSE_EDITION_KEYS = Object.freeze([
  "kind",
  "schemaVersion",
  "courseId",
  "revision",
  "previousRevision",
  "resetPolicy",
  "acceptsUnversionedProgress",
  "appliedAt",
  "digest",
  "document",
]);

function issue(code, message, path = null) {
  return { code, message, path };
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseCandidate(candidate) {
  if (typeof candidate !== "string") return candidate;
  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new CourseEditionError(
      "invalid-edition-json",
      "La edición del curso no contiene JSON válido.",
      [issue("invalid-edition-json", error instanceof Error ? error.message : String(error))],
    );
  }
}

function normalizeAppliedAt(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new CourseEditionError(
      "invalid-applied-at",
      "La edición del curso requiere una fecha appliedAt válida.",
      [issue("invalid-applied-at", "appliedAt debe ser una fecha ISO válida.", "appliedAt")],
    );
  }
  return value;
}

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) {
    throw new CourseEditionError(
      "digest-unavailable",
      "El entorno no ofrece SHA-256 mediante Web Crypto.",
    );
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function courseEditionStorageKey(courseId = EDITOR_COURSE_ID) {
  return `orbit-course-edition:v${COURSE_EDITION_SCHEMA_VERSION}:${courseId}`;
}

export async function digestEditorDocument(candidate, options = {}) {
  const normalized = applyEditorDocument(candidate, options).document;
  const semantic = structuredClone(normalized);
  delete semantic.updatedAt;
  return sha256Hex(`${JSON.stringify(semantic, null, 2)}\n`);
}

export async function createCourseEdition(candidateDocument, {
  previousRevision = null,
  acceptsUnversionedProgress = false,
  appliedAt = new Date().toISOString(),
  ...documentOptions
} = {}) {
  const materialized = applyEditorDocument(candidateDocument, documentOptions);
  const document = materialized.document;
  if (
    document.schemaVersion !== EDITOR_DOCUMENT_SCHEMA_VERSION
    || document.appearanceCatalogVersion !== AREA_APPEARANCE_CATALOG_VERSION
  ) {
    throw new CourseEditionError(
      "unsupported-editor-contract",
      "La edición requiere el contrato editorial vigente completo.",
    );
  }
  const validation = validateProjectData({
    areas: materialized.areas,
    locations: materialized.locations,
  });
  if (validation.errors.length > 0) {
    throw new CourseEditionError(
      "invalid-materialized-course",
      "El curso materializado no superó la validación de mundo y progresión.",
      validation.errors.map((message) => issue("project-data-invalid", message)),
    );
  }

  const digest = await digestEditorDocument(document, documentOptions);
  return {
    kind: COURSE_EDITION_KIND,
    schemaVersion: COURSE_EDITION_SCHEMA_VERSION,
    courseId: document.courseId,
    revision: `sha256:${digest}`,
    previousRevision:
      typeof previousRevision === "string" && previousRevision.trim()
        ? previousRevision.trim()
        : null,
    resetPolicy: COURSE_EDITION_RESET_POLICY,
    acceptsUnversionedProgress: Boolean(acceptsUnversionedProgress),
    appliedAt: normalizeAppliedAt(appliedAt),
    digest,
    document,
  };
}

export async function validateCourseEdition(candidate, options = {}) {
  const errors = [];
  const warnings = [];
  let source;
  try {
    source = parseCandidate(candidate);
  } catch (error) {
    return failureFromError(error);
  }
  if (!isRecord(source)) {
    return {
      ok: false,
      edition: null,
      areas: null,
      locations: null,
      validation: null,
      errors: [issue("invalid-course-edition", "La edición debe ser un objeto.")],
      warnings,
    };
  }

  const unknownKeys = Object.keys(source).filter((key) => !COURSE_EDITION_KEYS.includes(key));
  for (const key of unknownKeys) {
    errors.push(
      issue(
        "unknown-course-edition-field",
        `La edición contiene el campo raíz no soportado ${key}.`,
        key,
      ),
    );
  }
  if (source.kind !== COURSE_EDITION_KIND) {
    errors.push(issue("wrong-course-edition-kind", `Se esperaba kind ${COURSE_EDITION_KIND}.`, "kind"));
  }
  if (source.schemaVersion !== COURSE_EDITION_SCHEMA_VERSION) {
    errors.push(
      issue(
        "unsupported-course-edition-schema",
        `Se esperaba schemaVersion ${COURSE_EDITION_SCHEMA_VERSION}.`,
        "schemaVersion",
      ),
    );
  }
  if (source.courseId !== (options.courseId ?? EDITOR_COURSE_ID)) {
    errors.push(
      issue(
        "wrong-course",
        `La edición pertenece a ${String(source.courseId)} y no al curso esperado.`,
        "courseId",
      ),
    );
  }
  if (source.resetPolicy !== COURSE_EDITION_RESET_POLICY) {
    errors.push(
      issue(
        "unsupported-reset-policy",
        `Se esperaba resetPolicy ${COURSE_EDITION_RESET_POLICY}.`,
        "resetPolicy",
      ),
    );
  }
  if (typeof source.acceptsUnversionedProgress !== "boolean") {
    errors.push(
      issue(
        "invalid-progress-compatibility",
        "acceptsUnversionedProgress debe ser booleano.",
        "acceptsUnversionedProgress",
      ),
    );
  }
  if (
    source.previousRevision !== null
    && (typeof source.previousRevision !== "string" || !source.previousRevision.trim())
  ) {
    errors.push(issue("invalid-previous-revision", "previousRevision debe ser texto o null.", "previousRevision"));
  }
  if (typeof source.digest !== "string" || !/^[a-f0-9]{64}$/.test(source.digest)) {
    errors.push(issue("invalid-edition-digest", "digest debe ser un SHA-256 hexadecimal.", "digest"));
  }
  if (source.revision !== `sha256:${source.digest}`) {
    errors.push(issue("invalid-edition-revision", "revision no coincide con digest.", "revision"));
  }
  if (typeof source.appliedAt !== "string" || Number.isNaN(Date.parse(source.appliedAt))) {
    errors.push(issue("invalid-applied-at", "appliedAt debe ser una fecha válida.", "appliedAt"));
  }
  if (!isRecord(source.document)) {
    errors.push(issue("missing-editor-document", "La edición no contiene un documento editorial.", "document"));
  } else {
    if (source.document.schemaVersion !== EDITOR_DOCUMENT_SCHEMA_VERSION) {
      errors.push(
        issue(
          "unsupported-editor-schema",
          `La edición publicada exige el documento editorial v${EDITOR_DOCUMENT_SCHEMA_VERSION}.`,
          "document.schemaVersion",
        ),
      );
    }
    if (source.document.appearanceCatalogVersion !== AREA_APPEARANCE_CATALOG_VERSION) {
      errors.push(
        issue(
          "unsupported-appearance-catalog",
          `La edición publicada exige el catálogo visual v${AREA_APPEARANCE_CATALOG_VERSION}.`,
          "document.appearanceCatalogVersion",
        ),
      );
    }
  }
  if (errors.length > 0) {
    return { ok: false, edition: null, areas: null, locations: null, validation: null, errors, warnings };
  }

  let materialized;
  try {
    materialized = applyEditorDocument(source.document, options);
  } catch (error) {
    return failureFromError(error);
  }
  const validation = validateProjectData({
    areas: materialized.areas,
    locations: materialized.locations,
  });
  errors.push(
    ...validation.errors.map((message) => issue("project-data-invalid", message)),
  );
  warnings.push(
    ...materialized.warnings,
    ...validation.warnings.map((message) => issue("project-data-warning", message)),
  );
  let computedDigest = null;
  try {
    computedDigest = await digestEditorDocument(materialized.document, options);
  } catch (error) {
    return failureFromError(error, warnings);
  }
  if (computedDigest !== source.digest) {
    errors.push(
      issue(
        "course-edition-digest-mismatch",
        "El contenido editorial no coincide con el digest declarado.",
        "digest",
      ),
    );
  }
  if (materialized.document.courseId !== source.courseId) {
    errors.push(issue("course-id-mismatch", "courseId no coincide con el documento interno.", "courseId"));
  }
  if (errors.length > 0) {
    return { ok: false, edition: null, areas: null, locations: null, validation, errors, warnings };
  }

  const edition = {
    ...source,
    previousRevision: source.previousRevision ?? null,
    document: materialized.document,
  };
  return {
    ok: true,
    edition: structuredClone(edition),
    areas: structuredClone(materialized.areas),
    locations: structuredClone(materialized.locations),
    validation,
    errors: [],
    warnings: structuredClone(warnings),
  };
}

function failureFromError(error, warnings = []) {
  const issues = Array.isArray(error?.issues) && error.issues.length > 0
    ? error.issues
    : [issue(error?.code ?? "course-edition-invalid", error?.message ?? String(error))];
  return {
    ok: false,
    edition: null,
    areas: null,
    locations: null,
    validation: null,
    errors: structuredClone(issues),
    warnings: structuredClone(warnings),
  };
}

export async function materializeCourseEdition(candidate, options = {}) {
  const result = await validateCourseEdition(candidate, options);
  if (!result.ok) {
    throw new CourseEditionError(
      result.errors[0]?.code ?? "invalid-course-edition",
      "La edición del curso no pudo materializarse.",
      result.errors,
    );
  }
  return result;
}

export async function loadCourseEdition({
  sourceUrl = COURSE_EDITION_SOURCE_URL,
  fetchImpl = globalThis.fetch,
  storage = globalThis.localStorage,
  courseId = APP_CONFIG.activeCourseId,
  documentOptions = {},
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new CourseEditionError("edition-fetch-unavailable", "No existe una función fetch para cargar la edición publicada.");
  }
  const response = await fetchImpl(sourceUrl, { cache: "no-store" });
  if (!response?.ok) {
    throw new CourseEditionError(
      "published-edition-unavailable",
      `No fue posible cargar la edición publicada (${response?.status ?? "sin respuesta"}).`,
    );
  }
  const publishedCandidate = await response.json();
  const published = await materializeCourseEdition(publishedCandidate, {
    ...documentOptions,
    courseId,
  });

  const key = courseEditionStorageKey(courseId);
  const localResult = new ProgressStorage(key, storage).loadResult();
  const warnings = [...published.warnings];
  let selected = published;
  let source = "published";
  if (localResult.found && localResult.value !== null) {
    const local = await validateCourseEdition(localResult.value, {
      ...documentOptions,
      courseId,
    });
    if (local.ok) {
      if (local.edition.revision === published.edition.revision) {
        // El artefacto publicado ya alcanzó la edición instalada en el navegador.
      } else if (local.edition.previousRevision === published.edition.revision) {
        selected = local;
        source = "browser";
      } else if (published.edition.previousRevision === local.edition.revision) {
        warnings.push(
          issue(
            "stored-course-edition-superseded",
            "La edición activa del navegador era anterior a la fuente publicada; se usó la publicación más reciente.",
            key,
          ),
        );
      } else {
        warnings.push(
          issue(
            "stored-course-edition-diverged",
            "La edición activa del navegador no desciende de la fuente publicada; se rechazó para evitar reactivar una versión ajena o obsoleta.",
            key,
          ),
        );
      }
    } else {
      warnings.push(
        issue(
          "stored-course-edition-rejected",
          "La edición activa del navegador era inválida; se usó la fuente publicada.",
          key,
        ),
        ...local.errors,
      );
    }
  } else if (localResult.error) {
    warnings.push(
      issue(
        "stored-course-edition-unreadable",
        "La edición activa del navegador no pudo interpretarse; se usó la fuente publicada.",
        key,
      ),
    );
  }

  return {
    ...selected,
    source,
    sourceUrl,
    storageKey: key,
    courseId: selected.edition.courseId,
    courseRevision: selected.edition.revision,
    acceptsUnversionedProgress: selected.edition.acceptsUnversionedProgress,
    warnings: structuredClone(warnings),
  };
}

export class CourseEditionError extends Error {
  constructor(code, message, issues = []) {
    super(message);
    this.name = "CourseEditionError";
    this.code = code;
    this.issues = structuredClone(issues);
  }
}
