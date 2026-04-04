import {
  getLicenseByKey,
  getLicenseStore,
  normalizeLicenseKey,
  updateLicense,
} from "./lib/license-store.mjs";

const jsonResponse = (statusCode, body) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const normalizeDeviceId = (deviceId) =>
  String(deviceId || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

const summarizeLicense = (record) => ({
  id: record.id,
  status: record.status,
  plan: record.plan,
  maxDevices: record.maxDevices,
  usedDevices: record.activatedDevices.length,
  remainingDevices: Math.max(0, record.maxDevices - record.activatedDevices.length),
  expiresAt: record.expiresAt,
});

export const activateLicense = async ({
  store,
  licenseKey,
  deviceId,
  nowIso = new Date().toISOString(),
}) => {
  const normalizedLicenseKey = normalizeLicenseKey(licenseKey);
  const normalizedDeviceId = normalizeDeviceId(deviceId);

  if (!normalizedLicenseKey || !normalizedDeviceId) {
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

  if (record.status === "BLOCKED") {
    return {
      statusCode: 403,
      body: {
        ok: false,
        error: "LICENSE_BLOCKED",
        license: summarizeLicense(record),
        device: {
          deviceId: normalizedDeviceId,
        },
      },
    };
  }

  if (record.status === "EXPIRED") {
    return {
      statusCode: 403,
      body: {
        ok: false,
        error: "LICENSE_EXPIRED",
        license: summarizeLicense(record),
        device: {
          deviceId: normalizedDeviceId,
        },
      },
    };
  }

  const existingDevice = record.activatedDevices.find(
    (entry) => entry.deviceId === normalizedDeviceId,
  );

  if (existingDevice) {
    const updatedRecord = {
      ...record,
      activatedDevices: record.activatedDevices.map((entry) =>
        entry.deviceId === normalizedDeviceId
          ? {
              ...entry,
              lastSeenAt: nowIso,
            }
          : entry,
      ),
      updatedAt: nowIso,
    };

    await updateLicense(store, updatedRecord);

    return {
      statusCode: 200,
      body: {
        ok: true,
        result: "ALREADY_ACTIVATED",
        license: summarizeLicense(updatedRecord),
        device: {
          deviceId: normalizedDeviceId,
          activationStatus: "EXISTING_DEVICE",
        },
      },
    };
  }

  if (record.activatedDevices.length >= record.maxDevices) {
    return {
      statusCode: 409,
      body: {
        ok: false,
        error: "DEVICE_LIMIT_REACHED",
        license: summarizeLicense(record),
        device: {
          deviceId: normalizedDeviceId,
        },
      },
    };
  }

  const updatedRecord = {
    ...record,
    activatedDevices: [
      ...record.activatedDevices,
      {
        deviceId: normalizedDeviceId,
        activatedAt: nowIso,
        lastSeenAt: nowIso,
      },
    ],
    updatedAt: nowIso,
  };

  await updateLicense(store, updatedRecord);

  return {
    statusCode: 200,
    body: {
      ok: true,
      result: "ACTIVATED",
      license: summarizeLicense(updatedRecord),
      device: {
        deviceId: normalizedDeviceId,
        activationStatus: "NEW_DEVICE",
      },
    },
  };
};

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "INVALID_JSON_BODY" });
  }

  const result = await activateLicense({
    store: getLicenseStore(),
    licenseKey: body?.licenseKey,
    deviceId: body?.deviceId,
  });

  return jsonResponse(result.statusCode, result.body);
};
