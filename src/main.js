import { APP_CONFIG } from "./config.js";
import { AudioManager } from "./audio/audio-manager.js";
import {
  getProfileCapabilities,
  resolveOrbitProfile,
} from "./core/profile-policy.js";
import {
  BowerbirdPreferencesModel,
  createBowerbirdStorageKey,
} from "./core/bowerbird-preferences.js";
import {
  inspectCourseApplicationTransaction,
  recoverCourseApplication,
} from "./core/course-application.js";
import { loadCourseEdition } from "./core/course-edition.js";
import {
  assertCourseRuntimeEntryAvailable,
  prepareCourseRuntimeLock,
} from "./core/course-lock.js";
import { OrbitMaintenanceMonitor } from "./core/local-service-mode.js";
import { ProgressionModel } from "./core/progression.js";
import { createLegacyProgressKeys } from "./core/storage.js";
import { validateProjectData } from "./core/validator.js";
import { GameApp } from "./game/game-app.js";
import { UIController } from "./ui/ui-controller.js";
import { setupPanelResizers } from "./ui/panel-resizer.js";
import { resolveOnlineContext } from "./online/access.js";
import { loadOfflineContext } from "./online/offline-store.js";
import { prepareOnlineRuntime } from "./online/runtime-course.js";
import { acquireOnlineRuntimeLock } from "./online/runtime-lock.js";
import { OnlineProgressSync } from "./online/progress-sync.js";
import { showRetainedProgress } from "./online/recovery-view.js";

async function startOrbitRuntime() {
  let runtimeLock = null;
  let maintenanceMonitor = null;
  let onlineSync = null;
  let sessionEnded = null;
  let disposeRuntime = null;
  let startupCancelled = false;
  let startupReady = false;
  try {
    const onlineContext = await resolveOnlineContext({ offlineProvider: loadOfflineContext });
    if (onlineContext) {
      sessionEnded = (event) => {
        if (event.detail?.scope && event.detail.scope !== onlineContext.scope) return;
        startupCancelled = true;
        const shell = document.querySelector("#app");
        if (shell) shell.inert = true;
        disposeRuntime?.();
      };
      window.addEventListener("orbit-online-session-ended", sessionEnded);
      runtimeLock = await acquireOnlineRuntimeLock(onlineContext.scope);
      if (startupCancelled) {
        window.removeEventListener("orbit-online-session-ended", sessionEnded);
        return;
      }
    } else {
      const courseSession = await prepareCourseRuntimeLock({
        courseId: APP_CONFIG.activeCourseId,
        inspectTransaction: () => inspectCourseApplicationTransaction({
          courseId: APP_CONFIG.activeCourseId,
        }),
        recoverTransaction: () => recoverCourseApplication({
          courseId: APP_CONFIG.activeCourseId,
        }),
      });
      runtimeLock = courseSession.runtimeLock;
      if (courseSession.reloadRequired) {
        window.location.reload();
        return;
      }
      await assertCourseRuntimeEntryAvailable();
    }
    if (runtimeLock) {
      void runtimeLock.finished.catch((error) => {
        console.error("El bloqueo del curso terminó de forma inesperada.", error);
      });
    }

    const url = new URL(window.location.href);
    const debugRequested = ["1", "true", "yes"].includes(
      (url.searchParams.get("debug") ?? "").toLowerCase(),
    );
    const requestedProfile = url.searchParams.get("profile");
    const profile = onlineContext?.profile ?? resolveOrbitProfile({ requestedProfile, debugRequested });
    const profileCapabilities = getProfileCapabilities(profile);
    const debugInitiallyEnabled = profileCapabilities.canUseDebugger && debugRequested;
    const storageKey = `${APP_CONFIG.storagePrefix}:v${APP_CONFIG.progressSchemaVersion}:${profile}`;
    const legacyStorageKeys = createLegacyProgressKeys({
      prefixes: [APP_CONFIG.storagePrefix, ...APP_CONFIG.legacyStoragePrefixes],
      currentVersion: APP_CONFIG.progressSchemaVersion,
      profile,
      profileAliases: profile === APP_CONFIG.defaultProfile ? ["normal"] : [],
    });

    const onlineRuntime = onlineContext
      ? await prepareOnlineRuntime(onlineContext, { isActive: () => !startupCancelled })
      : null;
    const course = onlineRuntime?.course
      ?? await loadCourseEdition({ courseId: APP_CONFIG.activeCourseId });
    const validation = validateProjectData({
      areas: course.areas,
      locations: course.locations,
      allowContentSubset: true,
    });
    if (validation.errors.length > 0) {
      console.error("La definición del mundo contiene errores:", validation.errors);
      throw new Error("La cartografía no superó la validación. Revisa la consola.");
    }
    if (validation.warnings.length > 0) {
      console.warn("Advertencias de cartografía:", validation.warnings);
    }
    if (course.warnings.length > 0) {
      console.warn("Advertencias de la edición activa:", course.warnings);
    }

    const canvas = document.querySelector("#world-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("No se encontró el canvas principal.");
    }

    const progression = onlineRuntime?.progression ?? ProgressionModel.create({
      profile,
      storageKey,
      legacyStorageKeys,
      areas: course.areas,
      locations: course.locations,
      courseId: course.courseId,
      courseRevision: course.courseRevision,
      acceptsUnversionedProgress: course.acceptsUnversionedProgress,
    });
    const bowerbirdPreferences = profile === APP_CONFIG.defaultProfile
      ? new BowerbirdPreferencesModel({
          storageKey: onlineContext ? `orbit-bowerbird:online:v1:${onlineContext.scope}` : createBowerbirdStorageKey({
            courseId: course.courseId,
            profile,
          }),
          baseAreas: course.areas,
          courseId: onlineContext ? course.edition.courseId : course.courseId,
        })
      : null;
    if (bowerbirdPreferences?.getSnapshot().warnings.length > 0) {
      console.warn(
        "Advertencias de las preferencias personales Bowerbird:",
        bowerbirdPreferences.getSnapshot().warnings,
      );
    }
    const initialSettings = progression.getSnapshot().state.settings;
    const audio = new AudioManager({
      ambienceVolume: initialSettings.ambienceVolume,
      effectsVolume: initialSettings.effectsVolume,
    }).start();
    const ui = new UIController({
      progression,
      audio,
      areas: course.areas,
      locations: course.locations,
      onlineContext,
    });
    const panelResizers = setupPanelResizers({ product: "orbit" });
    const game = new GameApp({
      canvas,
      progression,
      ui,
      audio,
      areas: course.areas,
      locations: course.locations,
      getPersonalAreaAppearance: bowerbirdPreferences
        ? (areaId) => bowerbirdPreferences.getAppearance(areaId)
        : null,
      debugInitiallyEnabled,
    });

    const unsubscribeAudioSettings = progression.subscribe((event) => {
      if (["reset", "state-imported", "ambience-volume-changed"].includes(event.type)) {
        audio.setAmbienceVolume(event.snapshot.state.settings.ambienceVolume);
      }
      if (["reset", "state-imported", "effects-volume-changed"].includes(event.type)) {
        audio.setEffectsVolume(event.snapshot.state.settings.effectsVolume);
      }
    });

    const gameApi = {
      getDebugState: () => game.getDebugState(),
      setDebugOption: (option, value) => game.setDebugOption(option, value),
      teleportToArea: (areaId) => game.teleportToArea(areaId),
      teleportToWorld: (x, y) => game.teleportToWorld(x, y),
      returnToPreviousArea: () => game.returnToPreviousArea(),
      canReturnToPreviousArea: () => game.canReturnToPreviousArea(),
      completeNearby: () => game.completeNearby(),
      syncPlayerFromProgress: () => game.syncPlayerFromProgress(),
      getDebugSnapshot: () => game.getDebugSnapshot(),
    };
    ui.bindGameApi(gameApi);

    if (debugInitiallyEnabled) ui.openDebugPanel();
    game.start();
    requestAnimationFrame(() => {
      ui.hideLoadingScreen();
      window.OrbitStartup?.ready();
    });

    const debugApi = Object.freeze({
      help() {
        return {
          profile,
          methods: [
            "snapshot()",
            "grantConcept(id)",
            "grantNextConcept()",
            "unlockAllAreas()",
            "completeLocation(id)",
            "completeAll()",
            "teleportArea(id)",
            "teleport(x, y)",
            "setNoclip(boolean)",
            "setAmbienceVolume(value)",
            "setEffectsVolume(value)",
            "reset()",
            "exportProgress()",
            "importProgress(object)",
          ],
        };
      },
      snapshot: () => game.getDebugSnapshot(),
      grantConcept: (id) => progression.grantConcept(id),
      grantNextConcept: () => progression.grantNextConcept(),
      unlockAllAreas: () => progression.unlockAllAreasForDebug(),
      completeLocation: (id) => progression.completeLocation(id, { force: true }),
      completeAll: () => progression.completeAllForDebug(),
      teleportArea: (id) => game.teleportToArea(id),
      teleport: (x, y) => game.teleportToWorld(Number(x), Number(y)),
      setNoclip: (enabled) => game.setDebugOption("noclip", Boolean(enabled)),
      setAmbienceVolume: (value) => progression.setAmbienceVolume(Number(value)),
      setEffectsVolume: (value) => progression.setEffectsVolume(Number(value)),
      reset: () => {
        progression.reset();
        game.syncPlayerFromProgress();
      },
      exportProgress: () => progression.exportState(),
      importProgress: (candidate) => {
        const result = progression.importState(candidate);
        game.syncPlayerFromProgress();
        return result;
      },
    });

    if (profileCapabilities.canUseDebugger) window.OrbitDebug = debugApi;

    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      if (sessionEnded) window.removeEventListener("orbit-online-session-ended", sessionEnded);
      try {
        for (const [label, release] of [
          ["monitor de mantenimiento", () => maintenanceMonitor?.stop()],
          ["sincronización de cuenta", () => onlineSync?.stop()],
          ["juego", () => game.destroy()],
          ["ancho de paneles", () => panelResizers.destroy()],
          ["contenido de la interfaz", () => ui.destroy()],
          ["audio", () => audio.destroy()],
          ["suscripción de audio", () => unsubscribeAudioSettings()],
          ["preferencias Bowerbird", () => bowerbirdPreferences?.destroy()],
        ]) {
          try {
            release();
          } catch (error) {
            console.error(`No fue posible cerrar ${label} limpiamente.`, error);
          }
        }
      } finally {
        runtimeLock?.release();
      }
    };
    disposeRuntime = dispose;
    window.addEventListener("pagehide", dispose, { once: true });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) window.location.reload();
    });

    console.info(
      `%c${APP_CONFIG.appName} ${APP_CONFIG.version}%c\n${onlineContext ? "Rol autenticado" : "Perfil local"}: ${profile}. Edición ${course.courseRevision} (${course.source}). ${profileCapabilities.canUseDebugger ? "Debugger disponible en window.OrbitDebug." : "Las herramientas de depuración no están disponibles en este perfil."}`,
      "color:#78e3ff;font-weight:700;font-size:14px",
      "color:#a9bfd0",
    );
    startupReady = true;
    if (onlineContext) {
      showRetainedProgress(onlineContext, onlineRuntime.recoveries);
      if (onlineContext.session.user.role === "student") {
        onlineSync = new OnlineProgressSync({
          context: onlineContext,
          progression,
          cache: onlineRuntime.cache,
          storageFactory: onlineRuntime.storageFactory,
          onAccessRequired: () => {
            const shell = document.querySelector("#app");
            if (shell) shell.inert = true;
            dispose();
          },
        });
        onlineSync.start();
      }
    } else {
      maintenanceMonitor = new OrbitMaintenanceMonitor({
        onMaintenance: () => {
          const shell = document.querySelector("#app");
          if (shell) {
            shell.inert = true;
            shell.dataset.maintenance = "true";
          }
          dispose();
          window.location.reload();
        },
      });
      void maintenanceMonitor.start().catch((error) => {
        console.error("No fue posible activar la transición local de mantenimiento.", error);
      });
    }
  } catch (error) {
    if (sessionEnded) window.removeEventListener("orbit-online-session-ended", sessionEnded);
    throw error;
  } finally {
    if (!startupReady) runtimeLock?.release();
  }
}

await startOrbitRuntime();
