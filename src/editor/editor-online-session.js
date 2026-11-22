import { materializeCourseEdition } from "../core/course-edition.js";
import { EDITOR_DOCUMENT_SCHEMA_VERSION } from "./editor-document.js";
import { coursePath } from "../online/ui.js";
import { assertOnlineResponseIdentity } from "../online/api-client.js";

export function editorOnlineStorageKeys(context) {
  if (!context?.scope) throw new TypeError("Falta el alcance aislado del Editor online.");
  return {
    document: `orbit-editor:online:v${EDITOR_DOCUMENT_SCHEMA_VERSION}:${context.scope}`,
    scratch: `orbit-editor:online:content-scratch:v1:${context.scope}`,
    appearance: `orbit-bowerbird:online:v1:${context.scope}`,
  };
}

/** Keep the revision a draft actually started from across browser restarts. */
export function createOnlineEditorDraftStorage({ storage, revision, document }) {
  const publishedDocument = structuredClone(document);
  let baseRevision = revision;
  let replaced = false;
  const envelope = (draft, base) => ({
    kind: "orbit-online-editor-draft", schemaVersion: 1, baseRevision: base,
    document: structuredClone(draft),
  });
  return {
    key: storage.key,
    get baseRevision() { return baseRevision; },
    publishedRevision: revision,
    loadResult() {
      const result = storage.loadResult();
      if (result.error || !result.found) return result;
      const saved = result.value;
      if (saved?.kind !== "orbit-online-editor-draft" || saved.schemaVersion !== 1
        || typeof saved.baseRevision !== "string" || !saved.baseRevision || !saved.document) {
        return { ...result, value: null, error: new Error("No se pudo verificar la revisión del borrador online; se conserva su copia guardada.") };
      }
      baseRevision = saved.baseRevision;
      return { ...result, value: structuredClone(saved.document) };
    },
    save(draft) {
      if (replaced) throw new Error("Recarga para editar el nuevo borrador.");
      return storage.save(envelope(draft, baseRevision));
    },
    replaceWithPublished() {
      storage.save(envelope(publishedDocument, revision));
      replaced = true;
    },
  };
}

export async function loadOnlineEditorCourse(context) {
  if (context.offline) throw new Error("El Editor del servidor requiere conexión. La autoría offline conserva su entrada local independiente.");
  const response = await context.api.request(`${coursePath(context.course.id)}/edition`);
  assertOnlineResponseIdentity(response, { serverId: context.session.serverId, userId: context.session.user.id });
  if (response?.course?.id !== context.course.id || !response.edition
    || response.course.revision !== response.edition.revision) {
    throw new Error("La edición recibida no corresponde al curso seleccionado.");
  }
  const materialized = await materializeCourseEdition(response.edition, { courseId: response.edition.courseId });
  context.course = response.course;
  return {
    ...materialized,
    source: "online",
    courseId: materialized.edition.courseId,
    courseRevision: materialized.edition.revision,
    acceptsUnversionedProgress: false,
  };
}
