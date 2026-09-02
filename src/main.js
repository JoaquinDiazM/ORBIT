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

async function startOrbitRuntime() {
  let runtimeLock = null;
  let maintenanceMonitor = null;
  let startupReady = false;
  try {
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
    if (runtimeLock) {
      void runtimeLock.finished.catch((error) => {
        console.error("El bloqueo compartido del curso terminó de forma inesperada.", error);
      });
    }
    if (courseSession.reloadRequired) {
      window.location.reload();
      return;
    }
    await assertCourseRuntimeEntryAvailable();

    const url = new URL(window.location.href);
    const debugRequested = ["1", "true", "yes"].includes(
      (url.searchParams.get("debug") ?? "").toLowerCase(),
    );
    const requestedProfile = url.searchParams.get("profile");
    const profile = resolveOrbitProfile({ requestedProfile, debugRequested });
    const profileCapabilities = getProfileCapabilities(profile);
    const debugInitiallyEnabled = profileCapabilities.canUseDebugger && debugRequested;
    const storageKey = `${APP_CONFIG.storagePrefix}:v${APP_CONFIG.progressSchemaVersion}:${profile}`;
    const legacyStorageKeys = createLegacyProgressKeys({
      prefixes: [APP_CONFIG.storagePrefix, ...APP_CONFIG.legacyStoragePrefixes],
      currentVersion: APP_CONFIG.progressSchemaVersion,
      profile,
      profileAliases: profile === APP_CONFIG.defaultProfile ? ["normal"] : [],
    });

    const course = await loadCourseEdition({ courseId: APP_CONFIG.activeCourseId });
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

    const progression = ProgressionModel.create({
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
          storageKey: createBowerbirdStorageKey({
            courseId: course.courseId,
            profile,
          }),
          baseAreas: course.areas,
          courseId: course.courseId,
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
    });
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
      try {
        for (const [label, release] of [
          ["monitor de mantenimiento", () => maintenanceMonitor?.stop()],
          ["juego", () => game.destroy()],
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
    window.addEventListener("pagehide", dispose, { once: true });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) window.location.reload();
    });

    console.info(
      `%c${APP_CONFIG.appName} ${APP_CONFIG.version}%c\nPerfil local: ${profile}. Edición ${course.courseRevision} (${course.source}). ${profileCapabilities.canUseDebugger ? "Debugger disponible en window.OrbitDebug." : "Las herramientas de depuración no están disponibles en este perfil."}`,
      "color:#78e3ff;font-weight:700;font-size:14px",
      "color:#a9bfd0",
    );
    startupReady = true;
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
  } finally {
    if (!startupReady) runtimeLock?.release();
  }
}

await startOrbitRuntime();
