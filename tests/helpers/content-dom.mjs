export function installContentDOM() {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const timers = new Map();
  let nextTimer = 0;
  class Node {
    constructor(tagName = "span") {
      this.tagName = tagName;
      this.childNodes = [];
      this.parentNode = null;
      this.attributes = new Map();
      this.listeners = new Map();
      this.style = {};
      this.dataset = {};
      this.className = "";
      this.value = "";
      this.hidden = false;
      this.disabled = false;
      this.checked = false;
      this.ownerDocument = documentRef;
      this.classList = {
        add: (...names) => { this.className = [...new Set([...this.className.split(" "), ...names])].join(" ").trim(); },
        remove: (...names) => { this.className = this.className.split(" ").filter((name) => !names.includes(name)).join(" "); },
        contains: (name) => this.className.split(" ").includes(name),
        toggle: (name, force) => {
          const enabled = force ?? !this.classList.contains(name);
          if (enabled) this.classList.add(name); else this.classList.remove(name);
          return enabled;
        },
      };
    }
    set textContent(value) { this.childNodes = []; this.text = String(value ?? ""); }
    get textContent() { return (this.text ?? "") + this.childNodes.map((child) => child.textContent).join(""); }
    append(...nodes) { for (const node of nodes) this.appendChild(node); }
    prepend(...nodes) { this.childNodes.unshift(...nodes); for (const node of nodes) node.parentNode = this; }
    appendChild(node) {
      if (node.tagName === "#fragment") { for (const child of [...node.childNodes]) this.appendChild(child); return node; }
      this.childNodes.push(node);
      node.parentNode = this;
      return node;
    }
    replaceChildren(...nodes) { this.childNodes = []; this.text = ""; this.append(...nodes); }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (["id", "name", "type", "value", "class"].includes(name)) this[name === "class" ? "className" : name] = String(value);
      if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    dispatch(type, overrides = {}) {
      const event = { target: this, preventDefault() {}, stopPropagation() {}, ...overrides };
      for (const listener of this.listeners.get(type) ?? []) listener(event);
    }
    matches(selector) {
      if (selector.includes(" ")) return this.matches(selector.split(" ").at(-1));
      const tag = selector.match(/^[a-z0-9-]+/i)?.[0];
      if (tag && this.tagName !== tag) return false;
      const id = selector.match(/#([\w-]+)/)?.[1];
      if (id && this.id !== id) return false;
      for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(name)) return false;
      for (const [, name, , value] of selector.matchAll(/\[([\w-]+)(?:=(['"])(.*?)\2)?\]/g)) {
        if (value === undefined ? this.getAttribute(name) === null : this.getAttribute(name) !== value) return false;
      }
      if (selector.includes(":checked") && !this.checked) return false;
      return true;
    }
    querySelectorAll(selector) {
      const result = [];
      const visit = (node) => { for (const child of node.childNodes) { if (selector.split(",").some((s) => child.matches(s.trim()))) result.push(child); visit(child); } };
      visit(this);
      return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    focus() { documentRef.activeElement = this; }
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
    scrollTo() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 400 }; }
    remove() { if (this.parentNode) this.parentNode.childNodes = this.parentNode.childNodes.filter((child) => child !== this); }
    get isConnected() { return true; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get lastChild() { return this.childNodes.at(-1) ?? null; }
    get children() { return this.childNodes.filter((node) => !node.tagName.startsWith("#")); }
  }
  const documentRef = {
    createElement: (name) => new Node(name),
    createElementNS: (_namespace, name) => new Node(name),
    createDocumentFragment: () => new Node("#fragment"),
    createTextNode: (text) => { const node = new Node("#text"); node.textContent = text; return node; },
    activeElement: null,
  };
  const windowRef = {
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {},
  };
  documentRef.defaultView = windowRef;
  documentRef.body = new Node("body");
  globalThis.document = documentRef;
  globalThis.window = windowRef;
  return {
    document: documentRef, Node, timers,
    runTimers() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } },
    restore() { globalThis.document = previousDocument; globalThis.window = previousWindow; },
  };
}
