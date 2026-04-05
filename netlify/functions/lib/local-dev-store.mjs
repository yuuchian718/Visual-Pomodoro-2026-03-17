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

const createLoggedStore = ({ storeName, backend, store }) => ({
  async get(key, options = {}) {
    try {
      return await store.get(key, options);
    } catch (error) {
      console.error("[local-dev-store] store.get failed", {
        backend,
        storeName,
        key: String(key),
        errorName: error?.name || "UnknownError",
        errorMessage: error?.message || String(error),
      });
      throw error;
    }
  },

  async setJSON(key, value) {
    try {
      return await store.setJSON(key, value);
    } catch (error) {
      console.error("[local-dev-store] store.setJSON failed", {
        backend,
        storeName,
        key: String(key),
        errorName: error?.name || "UnknownError",
        errorMessage: error?.message || String(error),
      });
      throw error;
    }
  },
});

const isMissingBlobsEnvironmentError = (error) =>
  error?.name === "MissingBlobsEnvironmentError" ||
  String(error?.message || "").includes("The environment has not been configured to use Netlify Blobs");

const normalizeRuntimeContext = (value) => String(value || "").trim().toLowerCase();
const isHostedNetlifyRuntime = () =>
  process.env.NETLIFY === "true" ||
  String(process.env.URL || "").trim() !== "" ||
  String(process.env.DEPLOY_URL || "").trim() !== "";
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

  if (isHostedNetlifyRuntime()) {
    return "production";
  }

  return "unknown";
};

const shouldForceLocalStore = () => process.env.VISUAL_POMODORO_FORCE_LOCAL_STORE === "1";
const shouldUseLocalStoreInDev = () => getVisualPomodoroRuntimeContext() === "dev";
export const isProductionRuntime = () => getVisualPomodoroRuntimeContext() === "production";

const getExplicitBlobsConfig = () => {
  const siteID = normalizeEnvValue(process.env.VISUAL_POMODORO_BLOBS_SITE_ID);
  const token = normalizeEnvValue(process.env.VISUAL_POMODORO_BLOBS_TOKEN);

  if (!siteID || !token) {
    return null;
  }

  return { siteID, token };
};

const createNetlifyBlobsStore = (storeName) => {
  const explicitConfig = getExplicitBlobsConfig();
  const configMode = explicitConfig ? "explicit" : "runtime";

  console.info("[local-dev-store] Attempting Netlify Blobs store", {
    backend: "netlify-blobs",
    storeName,
    runtimeContext: getVisualPomodoroRuntimeContext(),
    explicitContext:
      normalizeRuntimeContext(process.env.VISUAL_POMODORO_RUNTIME_CONTEXT || process.env.CONTEXT) ||
      "missing",
    hostedRuntime: isHostedNetlifyRuntime(),
    configMode,
  });

  const store = explicitConfig
    ? getStore(storeName, {
        siteID: explicitConfig.siteID,
        token: explicitConfig.token,
      })
    : getStore(storeName);

  return createLoggedStore({
    storeName,
    backend: "netlify-blobs",
    store,
  });
};

export const getStoreWithLocalFallback = (storeName) => {
  if (shouldForceLocalStore() || shouldUseLocalStoreInDev()) {
    const reason = shouldForceLocalStore() ? "force-local" : "dev";
    console.info("[local-dev-store] Using local JSON store", {
      backend: "local-json",
      storeName,
      reason,
      runtimeContext: getVisualPomodoroRuntimeContext(),
    });
    return createLoggedStore({
      storeName,
      backend: "local-json",
      store: createLocalJsonStore(storeName),
    });
  }

  try {
    return createNetlifyBlobsStore(storeName);
  } catch (error) {
    if (isHostedNetlifyRuntime() && isMissingBlobsEnvironmentError(error)) {
      console.error(
        `[local-dev-store] Netlify Blobs is unavailable in hosted runtime for "${storeName}". Refusing local fallback because it would be non-persistent across requests.`,
      );
      throw error;
    }

    if (!hasExplicitProductionContext() && isMissingBlobsEnvironmentError(error)) {
      console.warn(
        `[local-dev-store] Falling back to local JSON store for "${storeName}" because Netlify Blobs is unavailable.`,
      );
      return createLoggedStore({
        storeName,
        backend: "local-json",
        store: createLocalJsonStore(storeName),
      });
    }

    throw error;
  }
};
