import { APP_CONFIG } from "../config.js";
import { CONCEPTS } from "../data/knowledge.js";
import { LOCATIONS } from "../data/locations.js";
import { ORBIT_PROFILE_IDS } from "./profile-policy.js";
import {
  assertRecoverableTransactionEnvelope,
  createLegacyProgressKeys,
  ProgressStorage,
} from "./storage.js";
import {
  COURSE_EDITION_RESET_POLICY,
  courseEditionStorageKey,
  createCourseEdition,
  materializeCourseEdition,
} from "./course-edition.js";

export const COURSE_APPLICATION_TRANSACTION_SCHEMA_VERSION = 1;
export const COURSE_APPLICATION_RESET_PROFILES = Object.freeze([...ORBIT_PROFILE_IDS]);
export const COURSE_APPLICATION_RESET_SCOPE = Object.freeze([
  "completedLocations",
  "concepts",
  "rewards",
  "debugUnlockedAreas",
  "activeTransport",
  "settings",
  "player",
]);

function uniqueKnown(values, knownIds) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => knownIds.has(value)))];
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function progressStorageDescriptors({
  schemaVersion = APP_CONFIG.progressSchemaVersion,
  prefixes = [APP_CONFIG.storagePrefix, ...APP_CONFIG.legacyStoragePrefixes],
  profiles = COURSE_APPLICATION_RESET_PROFILES,
} = {}) {
  return profiles.map((profile) => {
    const currentKey = `${APP_CONFIG.storagePrefix}:v${schemaVersion}:${profile}`;
    const legacyKeys = createLegacyProgressKeys({
      prefixes,
      currentVersion: schemaVersion,
      profile,
      profileAliases: profile === APP_CONFIG.defaultProfile ? ["normal"] : [],
    });
    return {
      profile,
      currentKey,
      legacyKeys,
      allKeys: [...new Set([currentKey, ...legacyKeys])],
    };
  });
}

export function inspectLocalProgress({
  storage = globalThis.localStorage,
  descriptors = progressStorageDescriptors(),
  locations = LOCATIONS,
  concepts = CONCEPTS,
} = {}) {
  const knownLocationIds = new Set(locations.map((location) => location.id));
  const knownConceptIds = new Set(concepts.map((concept) => concept.id));
  return descriptors.map((descriptor) => {
    const result = new ProgressStorage(
      descriptor.currentKey,
      storage,
      descriptor.legacyKeys,
    ).loadResult();
    if (result.error || (result.found && !isRecord(result.value))) {
      return {
        profile: descriptor.profile,
        found: result.found,
        readable: false,
        sourceKey: result.key,
        schemaVersion: null,
        completedLocations: null,
        concepts: null,
        discardedUnknownLocations: null,
        discardedUnknownConcepts: null,
      };
    }
    const candidate = isRecord(result.value) ? result.value : {};
    const completedLocations = uniqueKnown(candidate.completedLocations, knownLocationIds);
    const acquiredConcepts = uniqueKnown(candidate.concepts, knownConceptIds);
    const rawLocations = Array.isArray(candidate.completedLocations)
      ? new Set(candidate.completedLocations).size
      : 0;
    const rawConcepts = Array.isArray(candidate.concepts)
      ? new Set(candidate.concepts).size
      : 0;
    return {
      profile: descriptor.profile,
      found: result.found,
      readable: true,
      sourceKey: result.key,
      schemaVersion: Number.isInteger(candidate.schemaVersion)
        ? candidate.schemaVersion
        : null,
      completedLocations: completedLocations.length,
      concepts: acquiredConcepts.length,
      discardedUnknownLocations: Math.max(0, rawLocations - completedLocations.length),
      discardedUnknownConcepts: Math.max(0, rawConcepts - acquiredConcepts.length),
    };
  });
}

function placementById(entries) {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function changedIds(firstEntries, secondEntries, projection) {
  const firstById = placementById(firstEntries);
  return secondEntries
    .filter((entry) => {
      const previous = firstById.get(entry.id);
      return !previous || JSON.stringify(projection(previous)) !== JSON.stringify(projection(entry));
    })
    .map((entry) => entry.id)
    .sort((first, second) => first.localeCompare(second));
}

function changedExistingIds(firstEntries, secondEntries, projection) {
  const firstById = placementById(firstEntries);
  return secondEntries
    .filter((entry) => {
      const previous = firstById.get(entry.id);
      return previous
        && JSON.stringify(projection(previous)) !== JSON.stringify(projection(entry));
    })
    .map((entry) => entry.id)
    .sort((first, second) => first.localeCompare(second));
}

function locationLifecycle(location) {
  return location?.lifecycle ?? "active";
}

function connectionKey(connection) {
  return `${connection.sourceId}->${connection.targetId}`;
}

export function diffEditorDocuments(currentDocument, candidateDocument) {
  const currentConnections = new Set(
    currentDocument.learningNetwork.connections.map(connectionKey),
  );
  const candidateConnections = new Set(
    candidateDocument.learningNetwork.connections.map(connectionKey),
  );
  const currentNodes = new Set(currentDocument.learningNetwork.nodeIds);
  const candidateNodes = new Set(candidateDocument.learningNetwork.nodeIds);
  const currentLocations = placementById(currentDocument.locations);
  const candidateLocations = placementById(candidateDocument.locations);
  const currentTierLabels = placementById(
    (currentDocument.tierLabels ?? []).map((entry) => ({ ...entry, id: entry.tier })),
  );
  return {
    movedAreas: changedIds(currentDocument.areas, candidateDocument.areas, ({ q, r }) => ({ q, r })),
    renamedAreas: changedExistingIds(
      currentDocument.areas,
      candidateDocument.areas,
      ({ title, shortTitle }) => ({ title, shortTitle }),
    ),
    changedAreaAppearances: changedIds(
      currentDocument.areas,
      candidateDocument.areas,
      ({ appearance }) => appearance,
    ),
    changedTierLabels: (candidateDocument.tierLabels ?? [])
      .filter((entry) => {
        const previous = currentTierLabels.get(entry.tier);
        return !previous
          || JSON.stringify({ text: previous.text, offset: previous.offset })
            !== JSON.stringify({ text: entry.text, offset: entry.offset });
      })
      .map((entry) => entry.tier)
      .sort((first, second) => first - second),
    movedLocations: changedExistingIds(
      currentDocument.locations,
      candidateDocument.locations,
      ({ areaId, offset }) => ({ areaId, offset }),
    ),
    createdLocations: candidateDocument.locations
      .filter((entry) =>
        !currentLocations.has(entry.id) && locationLifecycle(entry) !== "deleted")
      .map((entry) => entry.id)
      .sort((first, second) => first.localeCompare(second)),
    renamedLocations: changedExistingIds(
      currentDocument.locations,
      candidateDocument.locations,
      ({ title, shortTitle }) => ({ title, shortTitle }),
    ),
    inventoriedLocations: candidateDocument.locations
      .filter((entry) =>
        locationLifecycle(entry) === "inventory"
        && locationLifecycle(currentLocations.get(entry.id)) === "active")
      .map((entry) => entry.id)
      .sort((first, second) => first.localeCompare(second)),
    restoredLocations: candidateDocument.locations
      .filter((entry) =>
        locationLifecycle(entry) === "active"
        && locationLifecycle(currentLocations.get(entry.id)) === "inventory")
      .map((entry) => entry.id)
      .sort((first, second) => first.localeCompare(second)),
    deletedLocations: [...new Set([
      ...candidateDocument.locations
        .filter((entry) =>
          locationLifecycle(entry) === "deleted"
          && locationLifecycle(currentLocations.get(entry.id)) !== "deleted")
        .map((entry) => entry.id),
      ...currentDocument.locations
        .filter((entry) =>
          locationLifecycle(entry) !== "deleted" && !candidateLocations.has(entry.id))
        .map((entry) => entry.id),
    ])].sort((first, second) => first.localeCompare(second)),
    addedLearningNodes: [...candidateNodes]
      .filter((id) => !currentNodes.has(id))
      .sort((first, second) => first.localeCompare(second)),
    removedLearningNodes: [...currentNodes]
      .filter((id) => !candidateNodes.has(id))
      .sort((first, second) => first.localeCompare(second)),
    addedConnections: [...candidateConnections]
      .filter((key) => !currentConnections.has(key))
      .sort((first, second) => first.localeCompare(second)),
    removedConnections: [...currentConnections]
      .filter((key) => !candidateConnections.has(key))
      .sort((first, second) => first.localeCompare(second)),
  };
}

export async function createCourseApplicationPlan({
  currentEdition,
  candidateDocument,
  storage = globalThis.localStorage,
  appliedAt = new Date().toISOString(),
  documentOptions = {},
  descriptors = progressStorageDescriptors(),
  concepts = CONCEPTS,
} = {}) {
  const current = await materializeCourseEdition(currentEdition, documentOptions);
  const edition = await createCourseEdition(candidateDocument, {
    ...documentOptions,
    previousRevision: current.edition.revision,
    acceptsUnversionedProgress: false,
    appliedAt,
  });
  const candidate = await materializeCourseEdition(edition, documentOptions);
  const impacts = inspectLocalProgress({
    storage,
    descriptors,
    locations: candidate.locations,
    concepts,
  });
  const diff = diffEditorDocuments(current.editorDocument, candidate.editorDocument);
  const changed = current.edition.revision !== candidate.edition.revision;
  return {
    kind: "orbit-course-application-plan",
    schemaVersion: COURSE_APPLICATION_TRANSACTION_SCHEMA_VERSION,
    courseId: candidate.edition.courseId,
    currentRevision: current.edition.revision,
    targetRevision: candidate.edition.revision,
    resetPolicy: COURSE_EDITION_RESET_POLICY,
    changed,
    edition: candidate.edition,
    diff,
    impact: {
      profiles: impacts,
      resetProfiles: [...COURSE_APPLICATION_RESET_PROFILES],
      resetScope: [...COURSE_APPLICATION_RESET_SCOPE],
      totalLocations: candidate.locations.length,
      totalConcepts: concepts.length,
    },
    validation: {
      errors: [],
      warnings: candidate.warnings,
      reachableAreas: candidate.validation.simulation.unlockedAreas.size,
      reachableLocations: candidate.validation.simulation.completedLocations.size,
      reachableConcepts: candidate.validation.simulation.concepts.size,
    },
  };
}

export function courseApplicationJournalKey(courseId = APP_CONFIG.activeCourseId) {
  return `orbit-course-apply-transaction:v${COURSE_APPLICATION_TRANSACTION_SCHEMA_VERSION}:${courseId}`;
}

export function courseApplicationBackupKey(courseId, revision) {
  const suffix = String(revision).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `orbit-course-apply-backup:v${COURSE_APPLICATION_TRANSACTION_SCHEMA_VERSION}:${courseId}:${suffix}`;
}

function courseApplicationTargetKeys(courseId, descriptors) {
  return [...new Set([
    courseEditionStorageKey(courseId),
    ...descriptors.flatMap((descriptor) => descriptor.allKeys),
  ])].sort((first, second) => first.localeCompare(second));
}

function isCourseRevision(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function validateCourseApplicationTransaction({
  journal,
  backup,
  courseId,
  descriptors,
}) {
  const metadata = backup.metadata;
  if (
    !isRecord(metadata)
    || metadata.courseId !== courseId
    || !isCourseRevision(metadata.previousRevision)
    || !isCourseRevision(metadata.targetRevision)
    || metadata.resetPolicy !== COURSE_EDITION_RESET_POLICY
    || journal.id !== `${courseId}:${metadata.targetRevision}`
    || journal.backupKey !== courseApplicationBackupKey(courseId, metadata.targetRevision)
    || typeof journal.createdAt !== "string"
    || journal.createdAt !== backup.createdAt
  ) {
    return false;
  }

  const editionKey = courseEditionStorageKey(courseId);
  const afterByKey = new Map(journal.after.map((entry) => [entry.key, entry]));
  const editionEntry = afterByKey.get(editionKey);
  if (!editionEntry?.present) return false;
  let edition;
  try {
    edition = JSON.parse(editionEntry.value);
  } catch {
    return false;
  }
  if (
    !isRecord(edition)
    || edition.courseId !== courseId
    || edition.revision !== metadata.targetRevision
  ) {
    return false;
  }
  return courseApplicationTargetKeys(courseId, descriptors).every((key) =>
    key === editionKey || afterByKey.get(key)?.present === false);
}

function courseApplicationRecoveryOptions(courseId, descriptors) {
  return {
    expectedTargetKeys: courseApplicationTargetKeys(courseId, descriptors),
    validateTransaction: ({ journal, backup }) =>
      validateCourseApplicationTransaction({
        journal,
        backup,
        courseId,
        descriptors,
      }),
  };
}

export function inspectCourseApplicationTransaction({
  courseId = APP_CONFIG.activeCourseId,
  storage = globalThis.localStorage,
  descriptors = progressStorageDescriptors(),
} = {}) {
  const journalKey = courseApplicationJournalKey(courseId);
  const result = new ProgressStorage(journalKey, storage).loadResult();
  if (!result.found) {
    return {
      pending: false,
      readable: true,
      valid: true,
      status: null,
      journalKey,
    };
  }
  const journal = result.value;
  let valid = false;
  if (!result.error && isRecord(journal) && typeof journal.backupKey === "string") {
    const backupResult = new ProgressStorage(journal.backupKey, storage).loadResult();
    if (!backupResult.error && backupResult.found && isRecord(backupResult.value)) {
      try {
        const options = courseApplicationRecoveryOptions(courseId, descriptors);
        assertRecoverableTransactionEnvelope({
          journal,
          backup: backupResult.value,
          journalKey,
          expectedTargetKeys: options.expectedTargetKeys,
        });
        valid = options.validateTransaction({
          journal,
          backup: backupResult.value,
        });
      } catch {
        valid = false;
      }
    }
  }
  return {
    pending: true,
    readable: !result.error,
    valid,
    status: valid ? journal.status : null,
    journalKey,
  };
}

export async function applyCourseApplicationPlan(plan, {
  storage = globalThis.localStorage,
  descriptors = progressStorageDescriptors(),
  documentOptions = {},
} = {}) {
  if (
    !isRecord(plan)
    || plan.kind !== "orbit-course-application-plan"
    || plan.schemaVersion !== COURSE_APPLICATION_TRANSACTION_SCHEMA_VERSION
  ) {
    throw new TypeError("El plan de aplicación no pertenece al contrato vigente.");
  }
  const candidate = await materializeCourseEdition(plan.edition, documentOptions);
  if (
    candidate.edition.courseId !== plan.courseId
    || candidate.edition.revision !== plan.targetRevision
  ) {
    throw new TypeError("La edición validada no coincide con el plan confirmado.");
  }
  if (plan.resetPolicy !== COURSE_EDITION_RESET_POLICY) {
    throw new TypeError("El plan no declara la política de reinicio total vigente.");
  }
  if (!plan.changed) {
    return { ok: true, changed: false, edition: candidate.edition, recovered: null };
  }

  const editionKey = courseEditionStorageKey(plan.courseId);
  const journalKey = courseApplicationJournalKey(plan.courseId);
  const driver = new ProgressStorage(editionKey, storage);
  const recovered = driver.recoverTransaction({
    journalKey,
    ...courseApplicationRecoveryOptions(plan.courseId, descriptors),
  });
  const progressKeys = [...new Set(descriptors.flatMap((descriptor) => descriptor.allKeys))];
  const backupKey = courseApplicationBackupKey(plan.courseId, plan.targetRevision);
  const transaction = driver.applyRecoverableTransaction({
    id: `${plan.courseId}:${plan.targetRevision}`,
    journalKey,
    backupKey,
    writes: {
      [editionKey]: `${JSON.stringify(candidate.edition, null, 2)}\n`,
    },
    removals: progressKeys,
    metadata: {
      courseId: plan.courseId,
      previousRevision: plan.currentRevision,
      targetRevision: plan.targetRevision,
      resetPolicy: plan.resetPolicy,
      profileImpact: plan.impact?.profiles ?? [],
    },
    createdAt: candidate.edition.appliedAt,
  });
  return {
    ok: true,
    changed: true,
    edition: candidate.edition,
    transaction,
    recovered,
  };
}

export function recoverCourseApplication({
  courseId = APP_CONFIG.activeCourseId,
  storage = globalThis.localStorage,
  descriptors = progressStorageDescriptors(),
} = {}) {
  const editionKey = courseEditionStorageKey(courseId);
  return new ProgressStorage(editionKey, storage).recoverTransaction({
    journalKey: courseApplicationJournalKey(courseId),
    ...courseApplicationRecoveryOptions(courseId, descriptors),
  });
}
