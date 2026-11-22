import { action, announce, coursePath, createOnlineDialog, field, node, setFormBusy, status } from "../online/ui.js";

export function createOwlActions(context) {
  if (context?.profile !== "teacher" || context.offline
    || !context.session.user.courseIds.includes(context.course.id)) {
    throw new Error("Owl requiere una sesión docente online asignada a este curso.");
  }
  const path = `${coursePath(context.course.id)}/students`;
  return {
    async list() {
      const result = await context.api.request(path);
      if (!Array.isArray(result?.students) || result.students.some((student) =>
        !student || student.courseId !== context.course.id || typeof student.id !== "string"
        || typeof student.alias !== "string" || !Number.isInteger(student.completedCount)
        || !Number.isInteger(student.totalCount) || typeof student.finished !== "boolean")) {
        throw new Error("La lista de estudiantes no coincide con el curso.");
      }
      return result.students;
    },
    create(alias, password) {
      return context.api.request(path, { method: "POST", body: { alias: alias.trim(), password } });
    },
    resetPassword(student, password) {
      if (student.courseId !== context.course.id) throw new Error("El estudiante pertenece a otro curso.");
      return context.api.request(`${path}/${encodeURIComponent(student.id)}/password`, { method: "POST", body: { password } });
    },
    remove(student, confirmAlias) {
      if (student.courseId !== context.course.id || confirmAlias !== student.alias) {
        throw new Error("Escribe exactamente el alias para confirmar la baja de esta cuenta y su avance.");
      }
      return context.api.request(`${path}/${encodeURIComponent(student.id)}`, { method: "DELETE", body: { confirmAlias } });
    },
  };
}

export function mountOwlPanel({ context, documentRef = document, parent }) {
  const operations = createOwlActions(context);
  const view = createOnlineDialog({ documentRef, title: `Owl · ${context.course.title}`, triggerText: "Owl", parent });
  const message = status(documentRef);
  const rows = node(documentRef, "div", { className: "online-student-list" });
  const refreshButton = action(documentRef, "Actualizar avance", () => void refresh());
  const alias = field(documentRef, "Alias del nuevo estudiante", { required: true, autocomplete: "off", maxlength: 80 });
  const password = field(documentRef, "Contraseña inicial", { type: "password", required: true, autocomplete: "new-password", maxlength: 256 });
  const create = node(documentRef, "form", { className: "online-form" }, [
    node(documentRef, "h3", { text: "Crear cuenta para este curso" }), alias.label, password.label,
    node(documentRef, "button", { type: "submit", text: "Crear estudiante" }),
  ]);
  view.body.append(node(documentRef, "p", { text: "Owl muestra avance y finalización. No recopila respuestas ni intentos. Cada cuenta de estudiante pertenece a un solo curso." }),
    refreshButton, message, rows, create);
  let destroyed = false;
  let generation = 0;

  function bind(form, operation, secret = null) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (destroyed || form.dataset.busy === "true") return;
      form.dataset.busy = "true";
      setFormBusy(form, true);
      try {
        await operation();
        if (!destroyed) {
          announce(message, "Operación completada.");
          await refresh();
        }
      } catch (error) {
        if (!destroyed) announce(message, error.message, true);
      } finally {
        if (secret) secret.value = "";
        form.dataset.busy = "false";
        setFormBusy(form, false);
      }
    });
  }
  bind(create, async () => {
    await operations.create(alias.input.value, password.input.value);
    alias.input.value = "";
  }, password.input);

  function studentCard(student) {
    const secret = field(documentRef, `Nueva contraseña de ${student.alias}`, { type: "password", required: true, autocomplete: "new-password", maxlength: 256 });
    const reset = node(documentRef, "form", { className: "online-form" }, [
      secret.label, node(documentRef, "button", { type: "submit", text: "Restablecer contraseña" }),
    ]);
    bind(reset, () => operations.resetPassword(student, secret.input.value), secret.input);
    const confirm = field(documentRef, "Escribe el alias para confirmar", { required: true, autocomplete: "off" });
    const remove = node(documentRef, "form", { className: "online-form" }, [
      node(documentRef, "p", { text: `Se eliminarán la cuenta ${student.alias} y todo su avance. Las sesiones se invalidarán al reconectar; un dispositivo sin conexión no puede revocarse a distancia.` }),
      confirm.label, node(documentRef, "button", { type: "submit", text: "Eliminar cuenta y avance", className: "online-danger" }),
    ]);
    bind(remove, () => operations.remove(student, confirm.input.value));
    return node(documentRef, "article", { className: "online-student-card" }, [
      node(documentRef, "h3", { text: student.alias }),
      node(documentRef, "p", { text: `${student.completedCount} de ${student.totalCount} actividades completadas · ${student.finished ? "Finalizado" : "En curso"}` }),
      node(documentRef, "details", {}, [node(documentRef, "summary", { text: "Restablecer contraseña" }), reset]),
      node(documentRef, "details", {}, [node(documentRef, "summary", { text: "Dar de baja" }), remove]),
    ]);
  }

  async function refresh() {
    const requestGeneration = ++generation;
    refreshButton.disabled = true;
    try {
      const students = await operations.list();
      if (destroyed || requestGeneration !== generation) return;
      rows.replaceChildren(...(students.length ? students.map(studentCard) : [node(documentRef, "p", { text: "No hay estudiantes en este curso." })]));
    } catch (error) {
      if (!destroyed && requestGeneration === generation) announce(message, error.message, true);
    } finally {
      if (!destroyed && requestGeneration === generation) refreshButton.disabled = false;
    }
  }
  view.trigger.addEventListener("click", () => void refresh());
  return { refresh, destroy() { destroyed = true; generation += 1; view.destroy(); } };
}
