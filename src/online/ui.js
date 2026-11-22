export function node(documentRef, tag, { text, className, ...attributes } = {}, children = []) {
  const element = documentRef.createElement(tag);
  if (text !== undefined) element.textContent = String(text);
  if (className) element.className = className;
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) continue;
    element.setAttribute(name, value === true ? "" : String(value));
  }
  element.append(...children);
  return element;
}

export function field(documentRef, labelText, { type = "text", ...attributes } = {}) {
  const input = node(documentRef, "input", { type, ...attributes });
  const label = node(documentRef, "label", { className: "online-field" }, [
    node(documentRef, "span", { text: labelText }), input,
  ]);
  return { input, label };
}

export function action(documentRef, text, handler, attributes = {}) {
  const button = node(documentRef, "button", { type: "button", text, ...attributes });
  button.addEventListener("click", handler);
  return button;
}

export function status(documentRef) {
  return node(documentRef, "p", { className: "online-status", role: "status", "aria-live": "polite" });
}

export function announce(element, message, error = false) {
  element.textContent = String(message ?? "");
  element.dataset.level = error ? "error" : "info";
}

export function setFormBusy(form, busy) {
  for (const control of form.querySelectorAll("button, input, select")) control.disabled = busy;
  form.setAttribute("aria-busy", String(busy));
}

export function createOnlineDialog({ documentRef, title, triggerText, parent, triggerAttributes = {} }) {
  const dialog = node(documentRef, "dialog", { className: "online-dialog", "aria-label": title });
  const close = action(documentRef, "Cerrar", () => dialog.close());
  dialog.append(node(documentRef, "div", { className: "online-dialog-heading" }, [
    node(documentRef, "h2", { text: title }), close,
  ]));
  const body = node(documentRef, "div", { className: "online-panel-body" });
  dialog.append(body);
  // Dialog shortcuts must not move the map or change the underlying draft.
  dialog.addEventListener("keydown", (event) => event.stopPropagation());
  dialog.addEventListener("keyup", (event) => event.stopPropagation());
  documentRef.body.append(dialog);
  const trigger = action(documentRef, triggerText, () => dialog.showModal(), {
    className: "dock-button", "aria-haspopup": "dialog", ...triggerAttributes,
  });
  parent.append(trigger);
  dialog.addEventListener("close", () => trigger.focus());
  return { dialog, body, trigger, destroy() { dialog.close(); dialog.remove(); trigger.remove(); } };
}

export function coursePath(courseId) {
  return `/courses/${encodeURIComponent(courseId)}`;
}
