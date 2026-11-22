// Cache only the build's public resources. Account APIs never enter this worker's cache.
export async function sha256(bytes, cryptoImpl = globalThis.crypto) {
  const digest = await cryptoImpl.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function stripServerMarker(html) {
  return html.replace(
    /<meta name="orbit-mode" content="online"><meta name="orbit-server-id" content="[a-zA-Z0-9-]+">/,
    "",
  );
}

export function createOfflineWorker({ scope, buildId, resources, caches, fetchImpl, cryptoImpl }) {
  const base = new URL(scope);
  const prefix = `orbit-public:${encodeURIComponent(base.pathname)}:`;
  const cacheName = `${prefix}${buildId}`;
  const entries = new Map(resources.map((resource) => [new URL(resource.url, base).href, resource]));
  const indexUrl = new URL("index.html", base).href;
  const editorUrl = new URL("editor.html", base).href;

  function resourceFor(request) {
    if (request.method !== "GET") return null;
    const url = new URL(request.url);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
    // Never normalize API URLs or use a generic navigation fallback.
    if (url.pathname.startsWith(new URL("api/", base).pathname)) return null;
    if (request.mode === "navigate") {
      const rootPath = base.pathname;
      const canonical = [rootPath, `${rootPath}index.html`].includes(url.pathname)
        ? indexUrl : url.pathname === `${rootPath}editor.html` ? editorUrl : null;
      return canonical && entries.has(canonical) ? { url: canonical, navigation: true } : null;
    }
    if (url.search || url.hash) return null;
    return entries.has(url.href) ? { url: url.href, navigation: false } : null;
  }

  async function verifiedResponse(url) {
    const response = await fetchImpl(url, { credentials: "omit", cache: "no-store", redirect: "error" });
    if (!response.ok || response.type === "opaque") throw new Error("Recurso offline no disponible.");
    const bytes = await response.clone().arrayBuffer();
    const isShell = url === indexUrl || url === editorUrl;
    const canonical = isShell
      ? new TextEncoder().encode(stripServerMarker(new TextDecoder().decode(bytes))) : bytes;
    if (await sha256(canonical, cryptoImpl) !== entries.get(url).sha256) {
      throw new Error("El recurso pertenece a otra compilación; se conserva la aplicación anterior.");
    }
    return response;
  }

  async function install() {
    const existed = (await caches.keys()).includes(cacheName);
    const cache = await caches.open(cacheName);
    const urls = [...entries.keys()];
    let next = 0;
    try {
      // Bound memory and requests, including local audio and KaTeX fonts.
      const results = await Promise.allSettled(Array.from({ length: Math.min(4, urls.length) }, async () => {
        while (next < urls.length) {
          const url = urls[next++];
          await cache.put(url, await verifiedResponse(url));
        }
      }));
      const failed = results.find((result) => result.status === "rejected");
      if (failed) throw failed.reason;
    } catch (error) {
      // Awaiting all workers before cleanup prevents a partial cache being recreated later.
      if (!existed) await caches.delete(cacheName);
      throw error;
    }
  }

  async function activate() {
    for (const name of await caches.keys()) {
      if (name.startsWith(prefix) && name !== cacheName) await caches.delete(name);
    }
    // No clients.claim(): an already open page keeps its own build until the next navigation.
  }

  async function respond(request) {
    const entry = resourceFor(request);
    if (!entry) return fetchImpl(request);
    const cache = await caches.open(cacheName);
    if (entry.navigation) {
      try {
        const response = await verifiedResponse(entry.url);
        await cache.put(entry.url, response.clone());
        return response;
      } catch {
        const cached = await cache.match(entry.url);
        if (cached) return cached;
        throw new Error("Abre ORBIT con conexión para preparar este dispositivo.");
      }
    }
    const cached = await cache.match(entry.url);
    if (cached) return cached;
    const response = await verifiedResponse(entry.url);
    await cache.put(entry.url, response.clone());
    return response;
  }

  return { cacheName, resourceFor, install, activate, respond };
}

export function installOrbitWorker(workerGlobal, configuration) {
  const worker = createOfflineWorker({
    ...configuration,
    scope: workerGlobal.registration.scope,
    caches: workerGlobal.caches,
    fetchImpl: workerGlobal.fetch.bind(workerGlobal),
    cryptoImpl: workerGlobal.crypto,
  });
  workerGlobal.addEventListener("install", (event) => event.waitUntil(worker.install()));
  workerGlobal.addEventListener("activate", (event) => event.waitUntil(worker.activate()));
  workerGlobal.addEventListener("fetch", (event) => {
    if (worker.resourceFor(event.request)) event.respondWith(worker.respond(event.request));
  });
  // Deliberately no skipWaiting: a product update must not mix two builds in running tabs.
}
