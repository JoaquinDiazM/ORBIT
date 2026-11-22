import { action, announce, coursePath, createOnlineDialog, field, node, status } from "../online/ui.js";

export class OnlinePublicationController {
  constructor({ context, model, draftStorage = null }) {
    if (context?.profile !== "teacher" || context.offline
      || !context.session.user.courseIds.includes(context.course.id)) {
      throw new Error("Publicar requiere una sesión docente online asignada al curso.");
    }
    this.context = context;
    this.model = model;
    this.draftStorage = draftStorage;
    this.baseRevision = draftStorage?.baseRevision ?? context.course.revision;
    this.plan = null;
    this.validatedDocument = null;
    this.validatedSource = null;
    this.generation = 0;
    this.busy = false;
    this.published = false;
    this.destroyed = false;
    this.unsubscribe = model.subscribe(() => this.invalidate());
  }

  invalidate() {
    this.generation += 1;
    this.plan = null;
    this.validatedDocument = null;
    this.validatedSource = null;
  }

  async setMaintenance(enabled) {
    if (this.busy || this.destroyed) throw new Error("Espera a que termine la operación actual.");
    this.busy = true;
    try {
      const response = await this.context.api.request(`${coursePath(this.context.course.id)}/maintenance`, {
        method: "PUT", body: { enabled: Boolean(enabled) },
      });
      if (response?.course?.id !== this.context.course.id || response.course.maintenance !== Boolean(enabled)) {
        throw new Error("No se pudo verificar el estado de mantenimiento.");
      }
      this.context.course = response.course;
      if (response.course.revision !== this.baseRevision) this.invalidate();
      return response.course;
    } finally { this.busy = false; }
  }

  async refresh() {
    const session = await this.context.api.request("/session");
    if (session?.serverId !== this.context.session.serverId || session?.user?.id !== this.context.session.user.id) {
      throw new Error("La sesión cambió. Recarga antes de continuar.");
    }
    const course = session.courses?.find((entry) => entry.id === this.context.course.id);
    if (!course) throw new Error("Esta cuenta ya no tiene acceso al curso.");
    this.context.api.setSession(session);
    this.context.course = course;
    if (course.revision !== this.baseRevision) this.invalidate();
    return course;
  }

  async validate() {
    if (this.busy || this.destroyed || this.published) throw new Error("No se puede validar en el estado actual.");
    if (this.baseRevision !== this.context.course.revision) throw new Error("Este borrador parte de una edición anterior. Expórtalo antes de sustituirlo por la edición vigente.");
    this.invalidate();
    const generation = this.generation;
    const source = this.model.exportDocument();
    const document = JSON.parse(source);
    this.busy = true;
    try {
      const plan = await this.context.api.request(`${coursePath(this.context.course.id)}/validate`, {
        method: "POST", body: { baseRevision: this.baseRevision, document },
      });
      if (this.destroyed || generation !== this.generation) throw new Error("El borrador cambió durante la validación. Vuelve a validar.");
      if (plan?.baseRevision !== this.baseRevision || typeof plan.revision !== "string"
        || typeof plan.planDigest !== "string" || !plan.planDigest
        || !Array.isArray(plan.incompatibleLocationIds) || plan.incompatibleLocationIds.some((id) => typeof id !== "string")
        || !Number.isInteger(plan.affectedStudentCount) || typeof plan.requiresDecision !== "boolean"
        || typeof plan.summary !== "string") {
        throw new Error("El plan de publicación no contiene una revisión e impacto verificables.");
      }
      this.plan = structuredClone(plan);
      this.validatedDocument = document;
      this.validatedSource = source;
      return structuredClone(plan);
    } finally { this.busy = false; }
  }

  async publish({ confirmed = false, resetAffected = false } = {}) {
    if (this.busy || this.destroyed || this.published) throw new Error("No se puede publicar en el estado actual.");
    if (!this.context.course.maintenance) throw new Error("Inicia mantenimiento antes de publicar; el acceso estudiantil debe estar cerrado.");
    if (!this.plan || !this.validatedDocument || this.model.exportDocument() !== this.validatedSource) {
      this.invalidate();
      throw new Error("El borrador cambió o todavía no tiene un plan válido.");
    }
    if (!confirmed) throw new Error("Confirma explícitamente la publicación del plan revisado.");
    if (this.plan.requiresDecision && !resetAffected) throw new Error("Confirma el reinicio de los avances afectados por la incompatibilidad.");
    const body = {
      baseRevision: this.baseRevision,
      document: structuredClone(this.validatedDocument),
      planDigest: this.plan.planDigest,
      decision: this.plan.requiresDecision ? "reset-affected" : "preserve",
    };
    const expectedRevision = this.plan.revision;
    this.busy = true;
    try {
      const response = await this.context.api.request(`${coursePath(this.context.course.id)}/publish`, { method: "POST", body });
      if (response?.course?.id !== this.context.course.id || response.course.revision !== expectedRevision
        || response.edition?.revision !== expectedRevision) {
        throw new Error("La publicación respondió sin evidencia completa. Comprueba el servidor antes de reintentar.");
      }
      this.published = true;
      this.context.course = response.course;
      this.invalidate();
      return response;
    } catch (error) {
      this.invalidate();
      throw error;
    } finally { this.busy = false; }
  }

  destroy() { this.destroyed = true; this.invalidate(); this.unsubscribe?.(); }

  discardDraft({ confirmed = false } = {}) {
    if (!confirmed) throw new Error("Confirma que deseas descartar el borrador de este dispositivo.");
    if (this.busy || this.destroyed || !this.draftStorage
      || this.draftStorage.publishedRevision !== this.context.course.revision) {
      throw new Error("Recarga primero para descargar la edición vigente; el borrador se conservará hasta que confirmes sustituirlo.");
    }
    this.draftStorage.replaceWithPublished();
    this.destroy();
  }
}

export function mountOnlineCoursePanel({ context, model, draftStorage = null, documentRef = document, windowRef = window, parent }) {
  const controller = new OnlinePublicationController({ context, model, draftStorage });
  const view = createOnlineDialog({ documentRef, title: `Publicación · ${context.course.title}`, triggerText: "Publicar online", parent });
  const message = status(documentRef);
  const maintenanceStatus = node(documentRef, "p");
  const planView = node(documentRef, "section", { className: "online-publication-plan", "aria-label": "Plan de publicación" });
  const confirm = field(documentRef, "Revisé este plan y confirmo publicar su contenido", { type: "checkbox" });
  const reset = field(documentRef, "Acepto reiniciar únicamente los avances afectados indicados por este plan", { type: "checkbox" });
  const startMaintenance = action(documentRef, "Iniciar mantenimiento", () => void run(() => controller.setMaintenance(true), "Mantenimiento activo: estudiantes temporalmente bloqueados."));
  const finishMaintenance = action(documentRef, "Reabrir acceso estudiantil", () => void run(() => controller.setMaintenance(false), "Curso disponible para estudiantes."));
  const validate = action(documentRef, "Validar borrador en el servidor", () => void run(() => controller.validate(), "Plan validado. Revisa el impacto antes de confirmar."));
  const publish = action(documentRef, "Publicar edición", () => void run(async () => {
    const result = await controller.publish({ confirmed: confirm.input.checked, resetAffected: reset.input.checked });
    return result;
  }, "Edición publicada. Puedes reabrir el acceso estudiantil. Exporta cualquier cambio posterior del borrador antes de recargar."));
  const reload = action(documentRef, "Recargar edición publicada", () => windowRef.location.reload());
  const draftStatus = node(documentRef, "p", { role: "status" });
  const discard = field(documentRef, "Exporté lo necesario y acepto descartar este borrador del dispositivo", { type: "checkbox" });
  const replaceDraft = action(documentRef, "Sustituir borrador por edición vigente", () => void run(() => {
    controller.discardDraft({ confirmed: discard.input.checked });
    windowRef.location.reload();
  }, "Borrador sustituido. Recargando…"));
  view.body.append(
    node(documentRef, "p", { text: "El borrador se guarda en este dispositivo y no altera el curso activo. Publicar siempre requiere mantenimiento. Los avances compatibles se conservan." }),
    maintenanceStatus,
    node(documentRef, "div", { className: "online-actions" }, [startMaintenance, finishMaintenance]),
    draftStatus, validate, message, planView, reset.label, confirm.label, publish, reload,
    node(documentRef, "details", {}, [node(documentRef, "summary", { text: "Recuperar la edición publicada" }),
      node(documentRef, "p", { text: "Exporta el borrador desde General antes de sustituirlo. Esta acción descarta únicamente el documento editorial de este dispositivo; no publica ni cambia avances." }),
      discard.label, replaceDraft]),
  );
  let destroyed = false;
  let operationBusy = false;

  function render() {
    if (destroyed) return;
    const maintenance = context.course.maintenance;
    const stale = controller.baseRevision !== context.course.revision;
    draftStatus.textContent = stale
      ? "El borrador parte de otra revisión. Consérvalo mediante Exportar; recarga y usa Recuperar la edición publicada para comenzar desde el curso vigente."
      : "La revisión base del borrador coincide con la edición publicada.";
    maintenanceStatus.textContent = `${maintenance ? "En mantenimiento" : "Acceso estudiantil abierto"} · revisión ${context.course.revision}`;
    startMaintenance.disabled = operationBusy || maintenance;
    finishMaintenance.disabled = operationBusy || !maintenance;
    validate.disabled = operationBusy || controller.published || stale;
    reset.label.hidden = !controller.plan?.requiresDecision;
    reset.input.disabled = operationBusy || !controller.plan?.requiresDecision;
    confirm.input.disabled = operationBusy || !controller.plan;
    publish.disabled = operationBusy || !controller.plan || !maintenance || !confirm.input.checked
      || (controller.plan.requiresDecision && !reset.input.checked);
    reload.hidden = !controller.published && !stale;
    replaceDraft.disabled = operationBusy || !draftStorage || !discard.input.checked
      || draftStorage.publishedRevision !== context.course.revision;
    if (!controller.plan) {
      planView.replaceChildren();
      reset.input.checked = false;
      confirm.input.checked = false;
    } else {
      const plan = controller.plan;
      planView.replaceChildren(node(documentRef, "h3", { text: "Impacto validado" }),
        node(documentRef, "p", { text: plan.summary }),
        node(documentRef, "p", { text: `${plan.affectedStudentCount} estudiantes afectados. ${plan.incompatibleLocationIds.length} actividades incompatibles.` }),
        node(documentRef, "p", { text: plan.incompatibleLocationIds.length ? `Actividades: ${plan.incompatibleLocationIds.join(", ")}` : "Sin incompatibilidades: se conserva el avance." }),
        node(documentRef, "small", { text: `Revisión propuesta: ${plan.revision} · digest del plan: ${plan.planDigest}` }));
    }
  }

  async function run(operation, success) {
    if (destroyed || operationBusy) return;
    operationBusy = true;
    render();
    announce(message, "Comprobando con el servidor…");
    try {
      await operation();
      if (!destroyed) announce(message, success);
    } catch (error) {
      if (!destroyed) announce(message, error.message, true);
    } finally {
      operationBusy = false;
      render();
    }
  }
  confirm.input.addEventListener("change", render);
  reset.input.addEventListener("change", render);
  discard.input.addEventListener("change", render);
  view.trigger.addEventListener("click", () => void run(() => controller.refresh(), "Estado del curso actualizado."));
  const unsubscribe = model.subscribe(() => {
    confirm.input.checked = false;
    reset.input.checked = false;
    render();
    announce(message, "El borrador cambió; vuelve a validar su impacto.");
  });
  render();
  return { controller, destroy() { destroyed = true; unsubscribe(); controller.destroy(); view.destroy(); } };
}
