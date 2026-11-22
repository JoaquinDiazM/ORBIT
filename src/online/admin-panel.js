import { action, announce, field, node, setFormBusy, status } from "./ui.js";

export function mountAdminPanel({ api, session, root, documentRef = document, onLogout }) {
  if (session?.user?.role !== "admin") throw new Error("Esta vista requiere una cuenta administradora.");
  let destroyed = false;
  let generation = 0;
  const message = status(documentRef);
  const contents = node(documentRef, "div", { className: "online-admin-content" });
  const refreshButton = action(documentRef, "Actualizar", () => void refresh());
  root.replaceChildren(
    node(documentRef, "h1", { text: "Administración de ORBIT" }),
    node(documentRef, "p", { text: `Cuenta administradora: ${session.user.alias}. Asigna docentes y cursos; Owl pertenece a cada docente.` }),
    node(documentRef, "div", { className: "online-actions" }, [refreshButton, action(documentRef, "Cerrar sesión", onLogout)]),
    message, contents,
  );

  function submit(form, callback, passwordInput = null) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.busy === "true" || destroyed) return;
      form.dataset.busy = "true";
      setFormBusy(form, true);
      try {
        await callback();
        if (!destroyed) {
          announce(message, "Cambio guardado.");
          await refresh();
        }
      } catch (error) {
        if (!destroyed) announce(message, error.message, true);
      } finally {
        if (passwordInput) passwordInput.value = "";
        form.dataset.busy = "false";
        setFormBusy(form, false);
      }
    });
  }

  function teacherChoices(teachers, selected = []) {
    const group = node(documentRef, "fieldset", {}, [node(documentRef, "legend", { text: "Docentes responsables" })]);
    const controls = teachers.map((teacher) => {
      const control = field(documentRef, teacher.alias, { type: "checkbox", value: teacher.id });
      control.input.checked = selected.includes(teacher.id);
      group.append(control.label);
      return control.input;
    });
    return { group, selected: () => controls.filter((input) => input.checked).map((input) => input.value) };
  }

  function render(overview) {
    const teachers = overview.users.filter((user) => user.role === "teacher");
    const teacherSection = node(documentRef, "section", {}, [node(documentRef, "h2", { text: "Docentes" })]);
    const alias = field(documentRef, "Alias del docente", { required: true, maxlength: 80, autocomplete: "off" });
    const password = field(documentRef, "Contraseña inicial", { type: "password", required: true, autocomplete: "new-password", maxlength: 256 });
    const createTeacher = node(documentRef, "form", { className: "online-form" }, [
      alias.label, password.label, node(documentRef, "button", { type: "submit", text: "Crear docente" }),
    ]);
    submit(createTeacher, () => api.request("/admin/teachers", {
      method: "POST", body: { alias: alias.input.value.trim(), password: password.input.value },
    }), password.input);
    teacherSection.append(createTeacher);
    if (!teachers.length) teacherSection.append(node(documentRef, "p", { text: "Crea un docente antes de asignar un curso." }));
    for (const teacher of teachers) {
      const replacement = field(documentRef, `Nueva contraseña de ${teacher.alias}`, { type: "password", required: true, autocomplete: "new-password", maxlength: 256 });
      const form = node(documentRef, "form", { className: "online-form online-row" }, [
        node(documentRef, "strong", { text: teacher.alias }), replacement.label,
        node(documentRef, "button", { type: "submit", text: "Restablecer contraseña" }),
      ]);
      submit(form, () => api.request(`/admin/teachers/${encodeURIComponent(teacher.id)}/password`, {
        method: "POST", body: { password: replacement.input.value },
      }), replacement.input);
      teacherSection.append(form);
    }

    const courseSection = node(documentRef, "section", {}, [node(documentRef, "h2", { text: "Cursos" })]);
    const title = field(documentRef, "Título del curso", { required: true, maxlength: 160 });
    const selection = teacherChoices(teachers);
    const imported = field(documentRef, "Documento de Editor (opcional)", { type: "file", accept: "application/json,.json" });
    const createCourse = node(documentRef, "form", { className: "online-form" }, [
      title.label, selection.group, imported.label,
      node(documentRef, "p", { text: "Sin archivo se utiliza la plantilla distribuida. El archivo opcional debe proceder de Exportar en Spider/ORBIT Editor." }),
      node(documentRef, "button", { type: "submit", text: "Crear curso" }),
    ]);
    submit(createCourse, async () => {
      const teacherIds = selection.selected();
      if (!teacherIds.length) throw new Error("Asigna al menos un docente al curso.");
      const file = imported.input.files?.[0];
      let document;
      if (file) {
        if (file.size > 900_000) throw new Error("El documento no puede superar 900 000 bytes.");
        try { document = JSON.parse(await file.text()); }
        catch { throw new Error("El archivo no contiene JSON válido de ORBIT Editor."); }
      }
      return api.request("/admin/courses", {
        method: "POST", body: { title: title.input.value.trim(), teacherIds, ...(document ? { document } : {}) },
      });
    });
    courseSection.append(createCourse);
    for (const course of overview.courses) {
      const assignments = teacherChoices(teachers, course.teacherIds);
      const form = node(documentRef, "form", { className: "online-form online-row" }, [
        node(documentRef, "h3", { text: course.title }),
        node(documentRef, "p", { text: course.maintenance ? "En mantenimiento" : "Disponible para estudiantes" }),
        assignments.group,
        node(documentRef, "button", { type: "submit", text: "Guardar responsables" }),
      ]);
      submit(form, () => {
        const teacherIds = assignments.selected();
        if (!teacherIds.length) throw new Error("El curso necesita al menos un docente responsable.");
        return api.request(`/admin/courses/${encodeURIComponent(course.id)}/teachers`, { method: "PUT", body: { teacherIds } });
      });
      courseSection.append(form);
    }
    contents.replaceChildren(teacherSection, courseSection);
  }

  async function refresh() {
    const requestGeneration = ++generation;
    refreshButton.disabled = true;
    try {
      const overview = await api.request("/admin/overview");
      if (!Array.isArray(overview?.users) || !Array.isArray(overview?.courses)) throw new Error("La lista administrativa no es válida.");
      if (!destroyed && requestGeneration === generation) render(overview);
    } catch (error) {
      if (!destroyed && requestGeneration === generation) announce(message, error.message, true);
    } finally {
      if (!destroyed && requestGeneration === generation) refreshButton.disabled = false;
    }
  }
  void refresh();
  return { refresh, destroy() { destroyed = true; generation += 1; root.replaceChildren(); } };
}
