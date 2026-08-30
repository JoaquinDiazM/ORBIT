export class ProgressStorage {
  constructor(key, storage = globalThis.localStorage, legacyKeys = []) {
    this.key = key;
    this.storage = storage;
    this.legacyKeys = [...new Set(legacyKeys)].filter((legacyKey) => legacyKey !== key);
    this.memoryFallback = null;
  }

  loadResult() {
    try {
      for (const key of [this.key, ...this.legacyKeys]) {
        const serialized = this.storage?.getItem(key);
        if (serialized === null || serialized === undefined) continue;
        try {
          return {
            found: true,
            key,
            serialized,
            value: JSON.parse(serialized),
            error: null,
          };
        } catch (error) {
          console.warn("No fue posible interpretar el progreso persistente.", error);
          return {
            found: true,
            key,
            serialized,
            value: this.memoryFallback,
            error,
          };
        }
      }
      return {
        found: this.memoryFallback !== null,
        key: null,
        serialized: null,
        value: this.memoryFallback,
        error: null,
      };
    } catch (error) {
      console.warn("No fue posible leer el progreso persistente.", error);
      return {
        found: true,
        key: null,
        serialized: null,
        value: this.memoryFallback,
        error,
      };
    }
  }

  load() {
    return this.loadResult().value;
  }

  save(state, { clearLegacyKeys = false } = {}) {
    const snapshot = structuredClone(state);
    const serialized = JSON.stringify(snapshot);
    if (typeof serialized !== "string") {
      throw new TypeError("El progreso debe poder serializarse como JSON.");
    }
    let before = null;
    try {
      if (
        typeof this.storage?.setItem !== "function"
        || typeof this.storage?.getItem !== "function"
      ) {
        throw new Error("El almacenamiento local no está disponible.");
      }
      if (
        clearLegacyKeys
        && this.legacyKeys.length > 0
        && typeof this.storage?.removeItem !== "function"
      ) {
        throw new Error("El almacenamiento local no permite retirar claves heredadas.");
      }
      if (clearLegacyKeys) {
        before = this.snapshotSerialized([this.key, ...this.legacyKeys]);
      }
      this.storage.setItem(this.key, serialized);
      if (this.storage.getItem(this.key) !== serialized) {
        throw new Error("La lectura posterior no coincide con el estado escrito.");
      }
      if (clearLegacyKeys) {
        for (const legacyKey of this.legacyKeys) this.storage.removeItem(legacyKey);
        assertSerializedEntries(
          this.storage,
          this.legacyKeys.map((key) => ({ key, present: false, value: null })),
        );
      }
    } catch (error) {
      let rollbackError;
      if (before) {
        try {
          restoreSerializedEntries(this.storage, before);
          assertSerializedEntries(this.storage, before);
        } catch (candidateRollbackError) {
          rollbackError = candidateRollbackError;
        }
      }
      throw new StoragePersistenceError(
        rollbackError ? "storage-rollback-failed" : "storage-write-failed",
        rollbackError
          ? "No fue posible guardar el estado ni restaurar de forma verificable las claves anteriores."
          : "No fue posible guardar y verificar el estado en el almacenamiento local.",
        { cause: error, rollbackError },
      );
    }
    this.memoryFallback = snapshot;
    return { ok: true, key: this.key };
  }

  clear() {
    this.memoryFallback = null;
    try {
      for (const key of [this.key, ...this.legacyKeys]) this.storage?.removeItem(key);
    } catch (error) {
      console.warn("No fue posible borrar el progreso persistente.", error);
    }
  }

  snapshotSerialized(keys) {
    const entries = [];
    for (const key of uniqueStorageKeys(keys)) {
      const serialized = this.storage?.getItem(key);
      entries.push({
        key,
        present: serialized !== null && serialized !== undefined,
        value: serialized ?? null,
      });
    }
    return entries;
  }

  applyRecoverableTransaction({
    id,
    journalKey,
    backupKey,
    writes = {},
    removals = [],
    metadata = {},
    createdAt = new Date().toISOString(),
  }) {
    assertStorageKey(journalKey, "journalKey");
    assertStorageKey(backupKey, "backupKey");
    if (this.storage?.getItem(journalKey) !== null) {
      throw new StorageTransactionError(
        "pending-transaction",
        "Existe una transacción local pendiente que debe recuperarse antes de aplicar otra edición.",
      );
    }

    const writeEntries = Object.entries(writes).map(([key, value]) => {
      assertStorageKey(key, "writes");
      if (typeof value !== "string") {
        throw new TypeError(`La escritura ${key} debe estar serializada como texto.`);
      }
      return [key, value];
    });
    const writeKeys = new Set(writeEntries.map(([key]) => key));
    const removalKeys = uniqueStorageKeys(removals).filter((key) => !writeKeys.has(key));
    const targetKeys = uniqueStorageKeys([...writeKeys, ...removalKeys]);
    if (targetKeys.includes(journalKey) || targetKeys.includes(backupKey)) {
      throw new TypeError("Las claves de journal y respaldo no pueden ser objetivos de la transacción.");
    }

    const transactionId = String(id ?? "").trim();
    if (!transactionId) throw new TypeError("La transacción requiere un ID estable.");
    const before = this.snapshotSerialized(targetKeys);
    const after = [
      ...writeEntries.map(([key, value]) => ({ key, present: true, value })),
      ...removalKeys.map((key) => ({ key, present: false, value: null })),
    ].sort((first, second) => first.key.localeCompare(second.key));
    const backup = {
      kind: "orbit-storage-backup",
      schemaVersion: 1,
      id: transactionId,
      createdAt,
      metadata: structuredClone(metadata),
      entries: before,
    };
    const journal = {
      kind: "orbit-storage-transaction",
      schemaVersion: 1,
      id: transactionId,
      status: "prepared",
      createdAt,
      backupKey,
      after,
    };
    assertRecoverableTransactionEnvelope({
      journal,
      backup,
      journalKey,
      expectedTargetKeys: targetKeys,
    });

    try {
      this.storage?.setItem(backupKey, JSON.stringify(backup));
      this.storage?.setItem(journalKey, JSON.stringify(journal));
    } catch (error) {
      throw new StorageTransactionError(
        "transaction-prepare-failed",
        "No fue posible preparar un respaldo verificable; no se modificó el estado activo.",
        { cause: error },
      );
    }

    try {
      for (const key of removalKeys) this.storage?.removeItem(key);
      for (const [key, value] of writeEntries) this.storage?.setItem(key, value);
      assertSerializedEntries(this.storage, after);
      this.storage?.setItem(
        journalKey,
        JSON.stringify({ ...journal, status: "committed" }),
      );
      this.storage?.removeItem(journalKey);
      return {
        ok: true,
        id: transactionId,
        backupKey,
        changedKeys: targetKeys,
        backup: structuredClone(backup),
      };
    } catch (error) {
      try {
        restoreSerializedEntries(this.storage, before);
        assertSerializedEntries(this.storage, before);
        this.storage?.removeItem(journalKey);
      } catch (rollbackError) {
        throw new StorageTransactionError(
          "transaction-rollback-failed",
          "La aplicación falló y el rollback automático no pudo verificarse; se conservó el journal para recuperación.",
          { cause: error, rollbackError },
        );
      }
      throw new StorageTransactionError(
        "transaction-commit-failed",
        "La aplicación local falló y el estado anterior fue restaurado.",
        { cause: error },
      );
    }
  }

  recoverTransaction({
    journalKey,
    expectedTargetKeys = null,
    validateTransaction = null,
  }) {
    assertStorageKey(journalKey, "journalKey");
    const serializedJournal = this.storage?.getItem(journalKey);
    if (serializedJournal === null || serializedJournal === undefined) {
      return { ok: true, recovered: false, action: "none" };
    }

    const journal = parseStorageRecord(serializedJournal, "journal inválido");
    if (
      journal.kind !== "orbit-storage-transaction"
      || journal.schemaVersion !== 1
      || !["prepared", "committed"].includes(journal.status)
      || typeof journal.backupKey !== "string"
      || !Array.isArray(journal.after)
    ) {
      throw new StorageTransactionError(
        "invalid-transaction-journal",
        "El journal local no tiene un formato recuperable.",
      );
    }
    const serializedBackup = this.storage?.getItem(journal.backupKey);
    if (serializedBackup === null || serializedBackup === undefined) {
      throw new StorageTransactionError(
        "missing-transaction-backup",
        "El journal existe, pero falta su respaldo local.",
      );
    }
    const backup = parseStorageRecord(serializedBackup, "respaldo inválido");
    assertRecoverableTransactionEnvelope({
      journal,
      backup,
      journalKey,
      expectedTargetKeys,
    });
    if (validateTransaction !== null) {
      if (typeof validateTransaction !== "function") {
        throw new TypeError("validateTransaction debe ser una función.");
      }
      try {
        if (validateTransaction({ journal, backup }) !== true) {
          throw new Error("El contrato específico rechazó la transacción.");
        }
      } catch (error) {
        throw new StorageTransactionError(
          "invalid-transaction-contract",
          "La transacción pendiente no pertenece al alcance esperado.",
          { cause: error },
        );
      }
    }

    if (journal.status === "committed" && serializedEntriesMatch(this.storage, journal.after)) {
      this.storage?.removeItem(journalKey);
      return {
        ok: true,
        recovered: true,
        action: "finalized",
        id: journal.id,
        backupKey: journal.backupKey,
      };
    }

    try {
      restoreSerializedEntries(this.storage, backup.entries);
      assertSerializedEntries(this.storage, backup.entries);
      this.storage?.removeItem(journalKey);
    } catch (error) {
      throw new StorageTransactionError(
        "transaction-recovery-failed",
        "No fue posible restaurar y verificar el estado previo de la transacción.",
        { cause: error },
      );
    }
    return {
      ok: true,
      recovered: true,
      action: "rolled-back",
      id: journal.id,
      backupKey: journal.backupKey,
    };
  }
}

export class StoragePersistenceError extends Error {
  constructor(code, message, { cause, rollbackError } = {}) {
    super(message, { ...(cause === undefined ? {} : { cause }) });
    this.name = "StoragePersistenceError";
    this.code = code;
    if (rollbackError !== undefined) this.rollbackError = rollbackError;
  }
}

export class StorageTransactionError extends Error {
  constructor(code, message, { cause, rollbackError } = {}) {
    super(message, { ...(cause === undefined ? {} : { cause }) });
    this.name = "StorageTransactionError";
    this.code = code;
    if (rollbackError !== undefined) this.rollbackError = rollbackError;
  }
}

function assertStorageKey(key, label) {
  if (typeof key !== "string" || !key.trim()) {
    throw new TypeError(`${label} debe contener una clave de almacenamiento válida.`);
  }
}

function uniqueStorageKeys(keys) {
  return [...new Set(
    [...(keys ?? [])].map((key) => {
      assertStorageKey(key, "key");
      return key;
    }),
  )].sort((first, second) => first.localeCompare(second));
}

function parseStorageRecord(serialized, label) {
  try {
    const value = JSON.parse(serialized);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(label);
    return value;
  } catch (error) {
    throw new StorageTransactionError(
      "invalid-transaction-data",
      `No fue posible interpretar el ${label}.`,
      { cause: error },
    );
  }
}

function assertSerializedEntryList(entries, label) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new StorageTransactionError(
      "invalid-transaction-entries",
      `${label} debe declarar al menos una clave objetivo.`,
    );
  }
  const keys = new Set();
  for (const entry of entries) {
    const valid = Boolean(
      entry
      && typeof entry === "object"
      && !Array.isArray(entry)
      && typeof entry.key === "string"
      && entry.key.trim()
      && typeof entry.present === "boolean"
      && (entry.present ? typeof entry.value === "string" : entry.value === null),
    );
    if (!valid || keys.has(entry?.key)) {
      throw new StorageTransactionError(
        "invalid-transaction-entries",
        `${label} contiene claves duplicadas o entradas inválidas.`,
      );
    }
    keys.add(entry.key);
  }
  return [...keys].sort((first, second) => first.localeCompare(second));
}

function sameStringSet(first, second) {
  return first.length === second.length
    && first.every((value, index) => value === second[index]);
}

export function assertRecoverableTransactionEnvelope({
  journal,
  backup,
  journalKey,
  expectedTargetKeys = null,
}) {
  assertStorageKey(journalKey, "journalKey");
  if (
    !journal
    || typeof journal !== "object"
    || Array.isArray(journal)
    || journal.kind !== "orbit-storage-transaction"
    || journal.schemaVersion !== 1
    || typeof journal.id !== "string"
    || !journal.id.trim()
    || !["prepared", "committed"].includes(journal.status)
    || typeof journal.backupKey !== "string"
    || !journal.backupKey.trim()
    || journal.backupKey === journalKey
  ) {
    throw new StorageTransactionError(
      "invalid-transaction-journal",
      "El journal local no tiene un formato recuperable.",
    );
  }
  if (
    !backup
    || typeof backup !== "object"
    || Array.isArray(backup)
    || backup.kind !== "orbit-storage-backup"
    || backup.schemaVersion !== 1
    || backup.id !== journal.id
  ) {
    throw new StorageTransactionError(
      "invalid-transaction-backup",
      "El respaldo no coincide con la transacción pendiente.",
    );
  }

  const afterKeys = assertSerializedEntryList(journal.after, "El estado posterior");
  const backupKeys = assertSerializedEntryList(backup.entries, "El respaldo");
  if (
    !sameStringSet(afterKeys, backupKeys)
    || afterKeys.includes(journalKey)
    || afterKeys.includes(journal.backupKey)
  ) {
    throw new StorageTransactionError(
      "invalid-transaction-scope",
      "El journal y el respaldo no declaran el mismo alcance cerrado.",
    );
  }

  if (expectedTargetKeys !== null) {
    const expectedKeys = uniqueStorageKeys(expectedTargetKeys);
    if (!sameStringSet(afterKeys, expectedKeys)) {
      throw new StorageTransactionError(
        "invalid-transaction-scope",
        "La transacción intenta modificar claves fuera del alcance esperado.",
      );
    }
  }
  return true;
}

function serializedEntriesMatch(storage, entries) {
  return entries.every((entry) => {
    if (!entry || typeof entry.key !== "string" || typeof entry.present !== "boolean") {
      return false;
    }
    const current = storage?.getItem(entry.key);
    return entry.present ? current === entry.value : current === null || current === undefined;
  });
}

function assertSerializedEntries(storage, entries) {
  if (!serializedEntriesMatch(storage, entries)) {
    throw new Error("La verificación de almacenamiento no coincide con la transacción esperada.");
  }
}

function restoreSerializedEntries(storage, entries) {
  const failures = [];
  for (const entry of entries) {
    try {
      if (entry.present) storage?.setItem(entry.key, entry.value);
      else storage?.removeItem(entry.key);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, "Una o más claves no pudieron restaurarse.");
  }
}

export function createLegacyProgressKeys({
  prefixes = [],
  currentVersion,
  profile,
  profileAliases = [],
}) {
  const highestLegacyVersion = Math.max(0, Math.trunc(Number(currentVersion)) - 1);
  const uniquePrefixes = [...new Set(
    prefixes.filter((prefix) => typeof prefix === "string" && prefix.length > 0),
  )];
  const profiles = [...new Set(
    [profile, ...profileAliases].filter(
      (profileName) => typeof profileName === "string" && profileName.length > 0,
    ),
  )];
  const currentAliasKeys = profiles.slice(1).flatMap((profileName) =>
    uniquePrefixes.map(
      (prefix) => `${prefix}:v${currentVersion}:${profileName}`,
    ),
  );

  const olderKeys = Array.from(
    { length: highestLegacyVersion },
    (_, index) => highestLegacyVersion - index,
  ).flatMap((version) =>
    profiles.flatMap((profileName) =>
      uniquePrefixes.map((prefix) => `${prefix}:v${version}:${profileName}`),
    ),
  );
  return [...currentAliasKeys, ...olderKeys];
}

export function sanitizeProfileName(value, fallback = "student") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return normalized || fallback;
}
