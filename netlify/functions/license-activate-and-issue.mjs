import dotenv from "dotenv";
import { activateLicense } from "./license-activate.mjs";
import { generatePermanentLicenseToken, normalizeDeviceId } from "./lib/formal-license-token.mjs";
import { jsonResponse } from "./lib/license-ops.mjs";
import { getLicenseStore } from "./lib/license-store.mjs";

dotenv.config({ path: ".env", quiet: true });

const SUCCESS_CODE = "FORMAL_TOKEN_ISSUED";

const buildFailureResponse = (activationResult, normalizedDeviceId) => ({
  ok: false,
  code: activationResult.body.error,
  message: activationResult.body.error,
  deviceId: normalizedDeviceId,
  activation: activationResult.body.ok
    ? {
        result: activationResult.body.result,
        activationStatus: activationResult.body.device?.activationStatus,
      }
    : {
        error: activationResult.body.error,
        activationStatus: activationResult.body.device?.activationStatus,
      },
});

export const activateLicenseAndIssueFormalToken = async ({
  store,
  licenseKey,
  deviceId,
  privateKeyB64 = process.env.KOTO_PRIVATE_KEY_B64,
  nowIso = new Date().toISOString(),
}) => {
  const normalizedDeviceId = normalizeDeviceId(deviceId);

  const activationResult = await activateLicense({
    store,
    licenseKey,
    deviceId: normalizedDeviceId,
    nowIso,
  });

  if (!activationResult.body.ok) {
    return {
      statusCode: activationResult.statusCode,
      body: buildFailureResponse(activationResult, normalizedDeviceId),
    };
  }

  try {
    const formalToken = await generatePermanentLicenseToken({
      deviceId: normalizedDeviceId,
      privateKeyB64,
    });

    return {
      statusCode: 200,
      body: {
        ok: true,
        code: SUCCESS_CODE,
        message: "Formal token issued for this device",
        deviceId: normalizedDeviceId,
        formalToken,
        activation: {
          result: activationResult.body.result,
          activationStatus: activationResult.body.device?.activationStatus,
        },
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: {
        ok: false,
        code: "FORMAL_TOKEN_ISSUE_FAILED",
        message: error instanceof Error ? error.message : "Formal token issue failed",
        deviceId: normalizedDeviceId,
        activation: {
          result: activationResult.body.result,
          activationStatus: activationResult.body.device?.activationStatus,
        },
      },
    };
  }
};

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed",
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      ok: false,
      code: "INVALID_JSON_BODY",
      message: "Invalid JSON body",
    });
  }

  const result = await activateLicenseAndIssueFormalToken({
    store: getLicenseStore(),
    licenseKey: body?.licenseKey,
    deviceId: body?.deviceId,
  });

  return jsonResponse(result.statusCode, result.body);
};
