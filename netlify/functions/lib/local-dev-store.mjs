import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getStore } from "@netlify/blobs";

const DEFAULT_LOCAL_STORE_DIR = path.join(os.tmpdir(), "visual-pomodoro-local-store");
const KNOWN_RUNTIME_CONTEXTS = new Set([
  "production",
  "deploy-preview",
  "branch-deploy",
  "dev",
]);

const getLocalStoreRootDir = () =>
  process.env.VISUAL_POMODORO_LOCAL_STORE_DIR || DEFAULT_LOCAL_STORE_DIR;

const getLocalStoreFilePath = (storeName) =>
  path.join(
    getLocalStoreRootDir(),
    `${String(storeName || "store")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_")}.json`,
  );

const readStoreFile = async (storeName) => {
  try {
    const raw = await readFile(getLocalStoreFilePath(storeName), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
};

const writeStoreFile = async (storeName, records) => {
  await mkdir(getLocalStoreRootDir(), { recursive: true });
  await writeFile(
    getLocalStoreFilePath(storeName),
    JSON.stringify(records, null, 2),
    "utf8",
  );
};

export const createLocalJsonStore = (storeName) => ({
  async get(key, options = {}) {
    const records = await readStoreFile(storeName);
    const value = records[String(key)];

    if (value === undefined) {
      return null;
    }

    return options.type === "json" ? structuredClone(value) : value;
  },

  async setJSON(key, value) {
    const records = await readStoreFile(storeName);
    records[String(key)] = structuredClone(value);
    await writeStoreFile(storeName, records);
  },
});

const isMissingBlobsEnvironmentError = (error) =>
  error?.name === "MissingBlobsEnvironmentError" ||
  String(error?.message || "").includes("The environment has not been configured to use Netlify Blobs");

const normalizeRuntimeContext = (value) => String(value || "").trim().toLowerCase();
const hasExplicitProductionContext = () =>
  normalizeRuntimeContext(process.env.VISUAL_POMODORO_RUNTIME_CONTEXT || process.env.CONTEXT) ===
  "production";

export const getVisualPomodoroRuntimeContext = () => {
  const explicitContext = normalizeRuntimeContext(
    process.env.VISUAL_POMODORO_RUNTIME_CONTEXT || process.env.CONTEXT,
  );

  if (KNOWN_RUNTIME_CONTEXTS.has(explicitContext)) {
    return explicitContext;
  }

  if (
    process.env.NETLIFY === "true" ||
    String(process.env.URL || "").trim() !== "" ||
    String(process.env.DEPLOY_URL || "").trim() !== ""
  ) {
    return "production";
  }

  return "unknown";
};

const shouldForceLocalStore = () => process.env.VISUAL_POMODORO_FORCE_LOCAL_STORE === "1";
const shouldUseLocalStoreInDev = () => getVisualPomodoroRuntimeContext() === "dev";
export const isProductionRuntime = () => getVisualPomodoroRuntimeContext() === "production";

export const getStoreWithLocalFallback = (storeName) => {
  if (shouldForceLocalStore() || shouldUseLocalStoreInDev()) {
    return createLocalJsonStore(storeName);
  }

  try {
    return getStore(storeName);
  } catch (error) {
    if (!hasExplicitProductionContext() && isMissingBlobsEnvironmentError(error)) {
      console.warn(
        `[local-dev-store] Falling back to local JSON store for "${storeName}" because Netlify Blobs is unavailable.`,
      );
      return createLocalJsonStore(storeName);
    }

    throw error;
  }
};
