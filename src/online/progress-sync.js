import { sanitizeCompletedLocations } from "../core/course-progress-compatibility.js";
import { saveOfflineCourse } from "./offline-store.js";
import { assertServerProgress, onlineProgressError } from "./runtime-course.js";

export class OnlineProgressSync {
  constructor({ context, progression, cache, storageFactory, onAccessRequired = () => {},
    windowRef = globalThis.window, intervalMs = 30_000 }) {
    this.context = context;
    this.progression = progression;
    this.cache = cache;
    this.storageFactory = storageFactory;
    this.onAccessRequired = onAccessRequired;
    this.windowRef = windowRef;
    this.intervalMs = intervalMs;
    this.disposed = false;
    this.blocked = false;
    this.requested = false;
    this.inFlight = null;
    this.unsubscribe = null;
    this.timer = null;
    this.onOnline = () => { void this.flush(); };
  }

  completed() {
    return sanitizeCompletedLocations(this.progression.getSnapshot().state.completedLocations, this.progression.locations);
  }

  pendingCount() {
    const acknowledged = new Set(this.cache.progress.completedLocations);
    return this.completed().filter((id) => !acknowledged.has(id)).length;
  }

  status(state, message) {
    this.context.setSyncStatus?.({ state, message, pendingCount: this.pendingCount() });
  }

  start() {
    if (this.context.profile !== "student" || this.unsubscribe || this.disposed) return;
    this.unsubscribe = this.progression.subscribe((event) => {
      if (event.type === "location-completed") void this.flush();
    });
    this.windowRef?.addEventListener("online", this.onOnline);
    this.timer = this.windowRef?.setInterval(() => { void this.flush(); }, this.intervalMs) ?? null;
    void this.flush();
  }

  stop() {
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.windowRef?.removeEventListener("online", this.onOnline);
    if (this.timer !== null) this.windowRef?.clearInterval(this.timer);
    this.timer = null;
  }

  flush() {
    if (this.disposed || this.blocked || this.context.profile !== "student") return Promise.resolve();
    this.requested = true;
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.#drain().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  async #drain() {
    while (this.requested && !this.disposed && !this.blocked) {
      this.requested = false;
      try {
        this.status("syncing", "Sincronizando finalizaciones…");
        const session = await this.context.api.request("/session");
        if (this.disposed) return;
        if (session?.serverId !== this.context.session.serverId
          || session?.user?.id !== this.context.session.user.id
          || session?.user?.role !== "student"
          || !session.user.courseIds?.includes(this.context.course.id)
          || typeof session.csrfToken !== "string" || !session.csrfToken) {
          throw onlineProgressError("online-account-changed", "La sesión pertenece a otra cuenta. Tu avance local se conserva; vuelve a ingresar con la cuenta original.");
        }
        this.context.api.setSession(session);
        const path = `/courses/${encodeURIComponent(this.context.course.id)}/progress`;
        const expected = {
          serverId: this.context.session.serverId,
          userId: this.context.session.user.id,
          courseId: this.context.course.id,
          revision: this.progression.courseRevision,
          generation: this.cache.progress.generation,
        };
        const remote = await this.context.api.request(path);
        if (this.disposed) return;
        assertServerProgress(remote, expected);
        this.progression.mergeSynchronizedCompletions(remote.completedLocations);
        const submitted = this.completed();
        const remoteSet = new Set(remote.completedLocations);
        const result = submitted.some((id) => !remoteSet.has(id))
          ? await this.context.api.request(path, { method: "PUT", body: {
              generation: expected.generation,
              revision: expected.revision,
              completedLocations: submitted,
            } })
          : remote;
        if (this.disposed) return;
        assertServerProgress(result, expected);
        if (submitted.some((id) => !result.completedLocations.includes(id))) {
          throw onlineProgressError("incomplete-progress-acknowledgement", "El servidor no confirmó todas las finalizaciones enviadas. La copia pendiente se conserva; vuelve a ingresar para comprobarla.");
        }
        // Union with the current model, never with a snapshot taken before an awaited request.
        this.progression.mergeSynchronizedCompletions(result.completedLocations);
        this.cache = saveOfflineCourse(this.context, {
          edition: this.cache.edition,
          compatibility: this.cache.compatibility,
          progress: result,
          retainedGenerations: this.cache.retainedGenerations,
        }, { storageFactory: this.storageFactory });
        this.context.offline = false;
        this.status("connected", "Avance guardado en este dispositivo y sincronizado con el servidor.");
        // New completions arriving during PUT remain durable and trigger another bounded request.
        if (this.pendingCount() > 0) this.requested = true;
      } catch (error) {
        if (this.disposed) return;
        if (error?.status === 0 && error?.code === "network-unavailable") {
          this.context.offline = true;
          this.status("offline", "Sin conexión. Tu avance se guarda en este dispositivo y se enviará al reconectar.");
          return;
        }
        this.blocked = true;
        this.status("blocked", `${error.message} El avance local no se ha borrado.`);
        this.onAccessRequired(error);
        this.context.requireOnlineAccess?.(error);
        return;
      }
    }
  }
}
