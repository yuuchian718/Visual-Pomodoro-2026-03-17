import {
  getLicenseByKey,
  getLicenseStore,
  normalizeLicenseKey,
  updateLicense,
} from "./license-store.mjs";

export const OPERATOR_SECRET_ENV_KEY = "KOTO_TRIAL_ADMIN_SECRET";

export const jsonResponse = (statusCode, body) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const appendReasonToNotes = (notes, action, reason, nowIso) => {
  const reasonText = String(reason || "").trim();
  if (!reasonText) return notes ?? null;

  const existing = notes ? `${notes}\n` : "";
  return `${existing}[${action}] ${nowIso} ${reasonText}`;
};

export const summarizeLicense = (record) => ({
  id: record.id,
  licenseKey: record.licenseKey,
  status: record.status,
  plan: record.plan,
  maxDevices: record.maxDevices,
  activatedDevices: record.activatedDevices,
  issuedAt: record.issuedAt,
  expiresAt: record.expiresAt,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const getOperatorSecret = () =>
  process.env[OPERATOR_SECRET_ENV_KEY]?.trim() || "";

export const getSubmittedOperatorSecret = async (request) => {
  const headerSecret = request.headers.get("x-license-operator-secret")?.trim();
  if (headerSecret) {
    if (request.method === "POST") {
      try {
        const body = await request.json();
        return { secret: headerSecret, body, parseError: false };
      } catch {
        return { secret: "", body: null, parseError: true };
      }
    }

    return { secret: headerSecret, body: null, parseError: false };
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      return { secret: String(body?.secret || "").trim(), body, parseError: false };
    } catch {
      return { secret: "", body: null, parseError: true };
    }
  }

  return { secret: "", body: null, parseError: false };
};

export const authorizeOperatorRequest = async (request) => {
  const operatorSecret = getOperatorSecret();

  if (!operatorSecret) {
    return {
      ok: false,
      response: jsonResponse(500, {
        ok: false,
        error: "OPERATOR_SECRET_MISSING",
      }),
      body: null,
    };
  }

  const { secret, body, parseError } = await getSubmittedOperatorSecret(request);

  if (parseError) {
    return {
      ok: false,
      response: jsonResponse(400, {
        ok: false,
        error: "INVALID_JSON_BODY",
      }),
      body: null,
    };
  }

  if (!secret) {
    return {
      ok: false,
      response: jsonResponse(401, {
        ok: false,
        error: "OPERATOR_SECRET_REQUIRED",
      }),
      body,
    };
  }

  if (secret !== operatorSecret) {
    return {
      ok: false,
      response: jsonResponse(403, {
        ok: false,
        error: "OPERATOR_SECRET_INVALID",
      }),
      body,
    };
  }

  return {
    ok: true,
    body,
  };
};

export const lookupLicense = async ({ store, licenseKey }) => {
  const normalizedLicenseKey = normalizeLicenseKey(licenseKey);

  if (!normalizedLicenseKey) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: "INVALID_REQUEST",
      },
    };
  }

  const record = await getLicenseByKey(store, normalizedLicenseKey);

  if (!record) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        error: "LICENSE_NOT_FOUND",
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      ok: true,
      license: summarizeLicense(record),
    },
  };
};

export const blockLicenseRecord = async ({ store, licenseKey, reason, nowIso }) => {
  const normalizedLicenseKey = normalizeLicenseKey(licenseKey);

  if (!normalizedLicenseKey) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: "INVALID_REQUEST",
      },
    };
  }

  const record = await getLicenseByKey(store, normalizedLicenseKey);

  if (!record) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        error: "LICENSE_NOT_FOUND",
      },
    };
  }

  const updatedRecord = {
    ...record,
    status: "BLOCKED",
    notes: appendReasonToNotes(record.notes, "BLOCK", reason, nowIso),
    updatedAt: nowIso,
  };

  await updateLicense(store, updatedRecord);

  return {
    statusCode: 200,
    body: {
      ok: true,
      record: summarizeLicense(updatedRecord),
    },
  };
};

export const unblockLicenseRecord = async ({ store, licenseKey, reason, nowIso }) => {
  const normalizedLicenseKey = normalizeLicenseKey(licenseKey);

  if (!normalizedLicenseKey) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: "INVALID_REQUEST",
      },
    };
  }

  const record = await getLicenseByKey(store, normalizedLicenseKey);

  if (!record) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        error: "LICENSE_NOT_FOUND",
      },
    };
  }

  const updatedRecord = {
    ...record,
    status: "ACTIVE",
    notes: appendReasonToNotes(record.notes, "UNBLOCK", reason, nowIso),
    updatedAt: nowIso,
  };

  await updateLicense(store, updatedRecord);

  return {
    statusCode: 200,
    body: {
      ok: true,
      record: summarizeLicense(updatedRecord),
    },
  };
};

export const resetLicenseDevicesRecord = async ({
  store,
  licenseKey,
  reason,
  nowIso,
}) => {
  const normalizedLicenseKey = normalizeLicenseKey(licenseKey);

  if (!normalizedLicenseKey) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: "INVALID_REQUEST",
      },
    };
  }

  const record = await getLicenseByKey(store, normalizedLicenseKey);

  if (!record) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        error: "LICENSE_NOT_FOUND",
      },
    };
  }

  const updatedRecord = {
    ...record,
    activatedDevices: [],
    notes: appendReasonToNotes(record.notes, "RESET_DEVICES", reason, nowIso),
    updatedAt: nowIso,
  };

  await updateLicense(store, updatedRecord);

  return {
    statusCode: 200,
    body: {
      ok: true,
      record: summarizeLicense(updatedRecord),
    },
  };
};

export const createProtectedPostHandler = (operation) => async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const auth = await authorizeOperatorRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const result = await operation({
    store: getLicenseStore(),
    licenseKey: auth.body?.licenseKey,
    reason: auth.body?.reason,
    nowIso: new Date().toISOString(),
  });

  return jsonResponse(result.statusCode, result.body);
};

export const createProtectedLookupHandler = () => async (request) => {
  if (request.method !== "GET") {
    return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const auth = await authorizeOperatorRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const result = await lookupLicense({
    store: getLicenseStore(),
    licenseKey: url.searchParams.get("licenseKey"),
  });

  return jsonResponse(result.statusCode, result.body);
};
