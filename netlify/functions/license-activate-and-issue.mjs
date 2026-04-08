import dotenv from "dotenv";
import { activateLicense } from "./license-activate.mjs";
import { ANALYTICS_EVENT, recordAnalyticsEventSafely } from "./lib/analytics-recorder.mjs";
import { generatePermanentLicenseToken, normalizeDeviceId } from "./lib/formal-license-token.mjs";
import { jsonResponse } from "./lib/license-ops.mjs";
import { getLicenseStore, getLicenseStoreName, normalizeLicenseKey } from "./lib/license-store.mjs";

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
  // Formal token signing requires a valid base64 private key that decodes to at least 32 bytes.
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
    if (activationResult.body.error === "DEVICE_LIMIT_REACHED") {
      await recordAnalyticsEventSafely({
        event: ANALYTICS_EVENT.DEVICE_LIMIT_REACHED,
        ts: nowIso,
        source: "license-activate-and-issue",
        resultCode: activationResult.body.error,
        deviceId: normalizedDeviceId,
        maxDevices: activationResult.body.license?.maxDevices,
        usedDevices: activationResult.body.license?.usedDevices,
        remainingDevices: activationResult.body.license?.remainingDevices,
      });
    } else {
      await recordAnalyticsEventSafely({
        event: ANALYTICS_EVENT.ACTIVATION_FAILED,
        ts: nowIso,
        source: "license-activate-and-issue",
        resultCode: activationResult.body.error,
        deviceId: normalizedDeviceId,
        activationStatus: activationResult.body.device?.activationStatus,
      });
    }

    if (activationResult.body.error === "LICENSE_NOT_FOUND") {
      console.warn("[license-activate-and-issue] LICENSE_NOT_FOUND", {
        context: process.env.CONTEXT || "unknown",
        licenseStoreName: getLicenseStoreName(),
        licenseKey: normalizeLicenseKey(licenseKey),
        deviceId: normalizedDeviceId,
      });
    }

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

    await recordAnalyticsEventSafely({
      event: ANALYTICS_EVENT.ACTIVATION_SUCCESS,
      ts: nowIso,
      source: "license-activate-and-issue",
      resultCode: SUCCESS_CODE,
      deviceId: normalizedDeviceId,
      activationResult: activationResult.body.result,
      activationStatus: activationResult.body.device?.activationStatus,
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
    await recordAnalyticsEventSafely({
      event: ANALYTICS_EVENT.ACTIVATION_FAILED,
      ts: nowIso,
      source: "license-activate-and-issue",
      resultCode: "FORMAL_TOKEN_ISSUE_FAILED",
      deviceId: normalizedDeviceId,
      activationResult: activationResult.body.result,
      activationStatus: activationResult.body.device?.activationStatus,
    });

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
