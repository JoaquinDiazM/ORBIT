import {
  applyCourseApplicationPlan,
  createCourseApplicationPlan,
  progressStorageDescriptors,
  recoverCourseApplication,
} from "../core/course-application.js";
import {
  courseEditionStorageKey,
  digestEditorDocument,
  materializeCourseEdition,
} from "../core/course-edition.js";
import { withExclusiveCourseLock } from "../core/course-lock.js";
import {
  ProgressStorage,
  StorageTransactionError,
} from "../core/storage.js";

export class CourseApplicationCoordinatorError extends Error {
  constructor(code, message, { cause = null, detail = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "CourseApplicationCoordinatorError";
    this.code = code;
    this.detail = detail;
  }
}

function validatedDocumentRevision(_document, digest) {
  return `sha256:${digest}`;
}

function validPendingTransaction(candidate) {
  return Boolean(
    candidate
    && typeof candidate === "object"
    && !Array.isArray(candidate)
    && candidate.status === "awaiting-browser"
    && typeof candidate.rollbackToken === "string"
    && candidate.rollbackToken.length > 0
    && (candidate.previousRevision === null || typeof candidate.previousRevision === "string")
    && typeof candidate.targetRevision === "string"
    && candidate.targetRevision.length > 0
    && candidate.edition
    && typeof candidate.edition === "object"
    && !Array.isArray(candidate.edition)
    && typeof candidate.edition.courseId === "string"
    && candidate.edition.revision === candidate.targetRevision,
  );
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((first, second) => first.localeCompare(second))
      .map((key) => [key, canonicalJson(value[key])]),
  );
}

function editionsEqual(first, second) {
  return JSON.stringify(canonicalJson(first)) === JSON.stringify(canonicalJson(second));
}

export class CourseApplicationCoordinator {
  constructor({
    currentEdition,
    authorClient,
    storage = globalThis.localStorage,
    lockManager = globalThis.navigator?.locks,
    documentOptions = {},
    descriptors = progressStorageDescriptors(),
  } = {}) {
    if (!currentEdition) throw new TypeError("Aplicar requiere la edición publicada vigente.");
    if (!authorClient) throw new TypeError("Aplicar requiere el cliente del helper local.");
    this.currentEdition = structuredClone(currentEdition);
    this.authorClient = authorClient;
    this.storage = storage;
    this.lockManager = lockManager;
    this.documentOptions = documentOptions;
    this.descriptors = descriptors;
    this.plan = null;
    this.reloadRequired = false;
  }

  getSnapshot() {
    return {
      currentEdition: structuredClone(this.currentEdition),
      plan: this.plan ? structuredClone(this.plan) : null,
      reloadRequired: this.reloadRequired,
    };
  }

  invalidate() {
    this.plan = null;
  }

  async #connectAuthorSession() {
    const session = await this.authorClient.connect();
    if (session?.courseId !== this.currentEdition.courseId) {
      throw new CourseApplicationCoordinatorError(
        "wrong-author-course",
        `El helper pertenece a ${String(session?.courseId)} y no a ${this.currentEdition.courseId}. No se realizará ninguna escritura.`,
      );
    }
    return session;
  }

  async validate(candidateDocument, { appliedAt = new Date().toISOString() } = {}) {
    if (this.reloadRequired) {
      throw new CourseApplicationCoordinatorError(
        "editor-reload-required",
        "La fuente anterior fue restaurada. Recarga ORBIT Editor antes de validar otra edición.",
      );
    }
    this.plan = await createCourseApplicationPlan({
      currentEdition: this.currentEdition,
      candidateDocument,
      storage: this.storage,
      appliedAt,
      documentOptions: this.documentOptions,
    });
    return structuredClone(this.plan);
  }

  async apply(candidateDocument) {
    if (!this.plan) {
      throw new CourseApplicationCoordinatorError(
        "application-plan-required",
        "Valida la edición y revisa su impacto antes de aplicarla.",
      );
    }
    const plan = structuredClone(this.plan);
    const digest = await digestEditorDocument(candidateDocument, this.documentOptions);
    if (validatedDocumentRevision(candidateDocument, digest) !== plan.targetRevision) {
      this.invalidate();
      throw new CourseApplicationCoordinatorError(
        "application-plan-stale",
        "El borrador cambió después de validarse; vuelve a validar el Resumen.",
      );
    }
    if (!plan.changed) {
      this.invalidate();
      return {
        ok: true,
        changed: false,
        edition: structuredClone(this.currentEdition),
        browser: null,
        repository: { checkPassed: null },
      };
    }

    return withExclusiveCourseLock(
      async () => {
        const session = await this.#connectAuthorSession();
        if (session.pending) {
          throw new CourseApplicationCoordinatorError(
            "pending-course-application",
            "Existe una aplicación anterior pendiente. Recupérala antes de iniciar otra.",
            { detail: session.pending },
          );
        }

        let repositoryResult;
        try {
          repositoryResult = await this.authorClient.apply({
            document: candidateDocument,
            expectedPreviousRevision: plan.currentRevision,
          });
        } catch (error) {
          throw new CourseApplicationCoordinatorError(
            error?.code ?? "repository-application-failed",
            error?.message ?? "No fue posible preparar fuente y build.",
            { cause: error },
          );
        }

        const rollbackToken = repositoryResult?.rollbackToken;
        const installed = repositoryResult?.edition;
        if (
          !installed
          || installed.revision !== plan.targetRevision
          || installed.previousRevision !== plan.currentRevision
          || typeof rollbackToken !== "string"
        ) {
          if (typeof rollbackToken === "string") {
            try {
              await this.authorClient.rollback(rollbackToken);
            } catch (rollbackError) {
              this.reloadRequired = true;
              this.invalidate();
              throw new CourseApplicationCoordinatorError(
                "course-application-recovery-required",
                "La fuente preparada no coincide con el plan y el helper no pudo restaurarla de forma verificable.",
                { detail: { rollbackError } },
              );
            }
          } else {
            this.reloadRequired = true;
            this.invalidate();
            throw new CourseApplicationCoordinatorError(
              "course-application-recovery-required",
              "El helper devolvió una edición incompatible sin un token de rollback verificable.",
            );
          }
          throw new CourseApplicationCoordinatorError(
            "repository-edition-mismatch",
            "La fuente preparada no coincide con el plan confirmado; se canceló antes del reset.",
          );
        }

        let browserResult;
        try {
          browserResult = await applyCourseApplicationPlan(
            { ...plan, edition: installed },
            {
              storage: this.storage,
              documentOptions: this.documentOptions,
              descriptors: this.descriptors,
            },
          );
        } catch (error) {
          try {
            await this.authorClient.rollback(rollbackToken);
          } catch (rollbackError) {
            this.reloadRequired = true;
            this.invalidate();
            throw new CourseApplicationCoordinatorError(
              "course-application-recovery-required",
              "El reset local falló y el helper no pudo verificar la restauración de la fuente.",
              { cause: error, detail: { rollbackError } },
            );
          }
          if (error instanceof StorageTransactionError) {
            this.reloadRequired = true;
            this.invalidate();
            throw new CourseApplicationCoordinatorError(
              "course-application-recovery-required",
              "La fuente anterior fue restaurada, pero el journal del navegador no quedó verificado. Recarga el Editor para ejecutar su recuperación antes de continuar.",
              { cause: error },
            );
          }
          throw new CourseApplicationCoordinatorError(
            "browser-application-failed",
            "El reset local falló; fuente y build anteriores fueron restaurados.",
            { cause: error },
          );
        }

        try {
          await this.authorClient.finalize(rollbackToken);
        } catch (error) {
          throw new CourseApplicationCoordinatorError(
            "course-finalization-pending",
            "Fuente, build y navegador ya usan la edición nueva, pero falta cerrar su journal. Reinicia el helper y recupera la aplicación pendiente.",
            { cause: error, detail: { rollbackToken, edition: installed } },
          );
        }

        this.currentEdition = structuredClone(installed);
        this.invalidate();
        return {
          ok: true,
          changed: browserResult.changed,
          edition: structuredClone(installed),
          browser: browserResult,
          repository: {
            checkPassed: repositoryResult?.check?.code === 0,
            sourceBackup: repositoryResult?.sourceBackup
              ? structuredClone(repositoryResult.sourceBackup)
              : null,
          },
        };
      },
      {
        courseId: this.currentEdition.courseId,
        lockManager: this.lockManager,
      },
    );
  }

  async #pendingResolution(pending) {
    if (!validPendingTransaction(pending)) {
      throw new CourseApplicationCoordinatorError(
        "invalid-pending-course-application",
        "El helper declaró una transacción pendiente que no pertenece al protocolo vigente.",
      );
    }
    if (pending.edition.courseId !== this.currentEdition.courseId) {
      throw new CourseApplicationCoordinatorError(
        "invalid-pending-course-application",
        "La evidencia pendiente pertenece a otro curso; no se tocará fuente ni navegador.",
      );
    }

    let browserRecovery;
    try {
      browserRecovery = recoverCourseApplication({
        courseId: this.currentEdition.courseId,
        storage: this.storage,
        descriptors: this.descriptors,
      });
    } catch (error) {
      throw new CourseApplicationCoordinatorError(
        "pending-browser-state-ambiguous",
        "El journal del navegador no pudo recuperarse de forma verificable; no se tocará la fuente.",
        { cause: error },
      );
    }

    const storageKey = courseEditionStorageKey(this.currentEdition.courseId);
    const localResult = new ProgressStorage(storageKey, this.storage).loadResult();
    if (localResult.error || (localResult.found && localResult.value === null)) {
      throw new CourseApplicationCoordinatorError(
        "pending-browser-state-ambiguous",
        "La edición local del navegador no se puede interpretar; no se tocará la fuente.",
      );
    }

    const storedEdition = localResult.found ? localResult.value : null;
    const browserRevision = storedEdition?.revision ?? null;
    if (
      storedEdition !== null
      && (
        typeof storedEdition !== "object"
        || Array.isArray(storedEdition)
        || storedEdition.courseId !== this.currentEdition.courseId
        || typeof browserRevision !== "string"
      )
    ) {
      throw new CourseApplicationCoordinatorError(
        "pending-browser-state-ambiguous",
        "La edición local no declara una revisión verificable para este curso; no se tocará la fuente.",
      );
    }

    if (browserRevision === pending.targetRevision) {
      let local;
      let repository;
      try {
        local = await materializeCourseEdition(storedEdition, this.documentOptions);
        repository = await materializeCourseEdition(pending.edition, this.documentOptions);
      } catch (error) {
        throw new CourseApplicationCoordinatorError(
          "pending-browser-state-ambiguous",
          "La edición objetivo guardada en el navegador es inválida; no se tocará la fuente.",
          { cause: error },
        );
      }
      let progressAbsent;
      try {
        progressAbsent = this.descriptors
          .flatMap((descriptor) => descriptor.allKeys)
          .every((key) => this.storage.getItem(key) === null);
      } catch (error) {
        throw new CourseApplicationCoordinatorError(
          "pending-browser-state-ambiguous",
          "No fue posible verificar que el reinicio total siga vigente; no se tocará la fuente.",
          { cause: error },
        );
      }
      if (!editionsEqual(local.edition, repository.edition) || !progressAbsent) {
        throw new CourseApplicationCoordinatorError(
          "pending-browser-state-ambiguous",
          "La edición local o el reset total divergieron de la evidencia del helper; no se tocará la fuente.",
        );
      }
      return {
        action: "finalize",
        pending: structuredClone(pending),
        browserRevision,
        browserRecovery,
        edition: structuredClone(repository.edition),
      };
    }
    if (browserRevision === null || browserRevision === pending.previousRevision) {
      return {
        action: "rollback",
        pending: structuredClone(pending),
        browserRevision,
        browserRecovery,
        edition: storedEdition ? structuredClone(storedEdition) : null,
      };
    }
    throw new CourseApplicationCoordinatorError(
      "pending-browser-state-ambiguous",
      `El navegador conserva ${browserRevision}, que no coincide con la revisión anterior ni con la objetivo. No se tocará la fuente.`,
      {
        detail: {
          browserRevision,
          previousRevision: pending.previousRevision,
          targetRevision: pending.targetRevision,
        },
      },
    );
  }

  async inspectPending() {
    return withExclusiveCourseLock(
      async () => {
        const session = await this.#connectAuthorSession();
        if (!session.pending) {
          return { pending: null, action: "none", browserRevision: null };
        }
        return this.#pendingResolution(session.pending);
      },
      {
        courseId: this.currentEdition.courseId,
        lockManager: this.lockManager,
      },
    );
  }

  async recoverPending() {
    return withExclusiveCourseLock(
      async () => {
        const session = await this.#connectAuthorSession();
        const pending = session.pending;
        if (!pending) {
          throw new CourseApplicationCoordinatorError(
            "no-pending-course-application",
            "El helper no tiene una aplicación pendiente.",
          );
        }
        const resolution = await this.#pendingResolution(pending);
        if (resolution.action === "finalize") {
          try {
            await this.authorClient.finalize(pending.rollbackToken);
          } catch (error) {
            throw new CourseApplicationCoordinatorError(
              "pending-finalization-failed",
              "El navegador ya usa la edición objetivo, pero el helper no pudo cerrar su journal. No se revirtió la fuente.",
              { cause: error },
            );
          }
          this.currentEdition = structuredClone(resolution.edition);
          this.reloadRequired = false;
          this.invalidate();
          return {
            ok: true,
            recovered: true,
            action: "finalized",
            reloadRequired: false,
            edition: structuredClone(resolution.edition),
            browserRecovery: resolution.browserRecovery,
          };
        }

        try {
          await this.authorClient.rollback(pending.rollbackToken);
        } catch (error) {
          throw new CourseApplicationCoordinatorError(
            "pending-rollback-failed",
            "El navegador no usa la edición objetivo, pero el helper no pudo restaurar la fuente anterior.",
            { cause: error },
          );
        }
        this.reloadRequired = true;
        this.invalidate();
        return {
          ok: true,
          recovered: true,
          action: "rolled-back",
          reloadRequired: true,
          edition: resolution.edition,
          browserRecovery: resolution.browserRecovery,
        };
      },
      {
        courseId: this.currentEdition.courseId,
        lockManager: this.lockManager,
      },
    );
  }
}
