import { issueCommercialCertificateForPublicRequest } from "./lib/public-certificate-issuance.mjs";
import {
  getPublicCertificateDeviceClaimStore,
  isValidPublicIssueDeviceId,
} from "./lib/public-certificate-device-claim-store.mjs";
import { getLicenseStore } from "./lib/license-store.mjs";
import { jsonResponse } from "./lib/license-ops.mjs";
import { ANALYTICS_EVENT, recordAnalyticsEventSafely } from "./lib/analytics-recorder.mjs";
import {
  getPublicCertificateIssueStore,
  isValidPublicIssueEmail,
  isValidPublicIssueName,
  isValidPublicIssueOrderId,
} from "./lib/public-certificate-issue-store.mjs";

const INTERNAL_ERROR_BODY = {
  ok: false,
  code: "INTERNAL_ERROR",
};

const INTERNAL_ERROR_RESULT = {
  statusCode: 500,
  body: INTERNAL_ERROR_BODY,
};

const RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const isRequestLike = (value) =>
  value !== null &&
  typeof value === "object" &&
  typeof value.method === "string" &&
  typeof value.json === "function";

const toNetlifyResponse = (statusCode, body) => ({
  statusCode,
  headers: RESPONSE_HEADERS,
  body: JSON.stringify(body),
});

const parseClassicEventBody = (event) => {
  if (event?.body === null || event?.body === undefined || event.body === "") {
    return {};
  }

  if (typeof event.body === "string") {
    return JSON.parse(event.body);
  }

  if (typeof event.body === "object") {
    return event.body;
  }

  throw new Error("INVALID_REQUEST");
};

export const issuePublicCommercialCertificate = async ({
  issueStore,
  deviceClaimStore,
  licenseStore,
  deviceId,
  name,
  orderId,
  email,
  issuedAt = new Date().toISOString(),
}) =>
  issueCommercialCertificateForPublicRequest({
    issueStore,
    deviceClaimStore,
    licenseStore,
    deviceId,
    name,
    orderId,
    email,
    nowIso: issuedAt,
  });

export const createPublicCertificateIssueHandler =
  ({
    issueStoreFactory = getPublicCertificateIssueStore,
    deviceClaimStoreFactory = getPublicCertificateDeviceClaimStore,
    licenseStoreFactory = getLicenseStore,
    issuePublicCommercialCertificateFn = issuePublicCommercialCertificate,
  } = {}) =>
  async (requestOrEvent) => {
    const requestMode = isRequestLike(requestOrEvent);
    const method = requestMode ? requestOrEvent.method : requestOrEvent?.httpMethod;
    const respond = (statusCode, body) =>
      requestMode ? jsonResponse(statusCode, body) : toNetlifyResponse(statusCode, body);

    if (method !== "POST") {
      return respond(405, {
        ok: false,
        code: "METHOD_NOT_ALLOWED",
      });
    }

    let body;
    try {
      body = requestMode
        ? await requestOrEvent.json()
        : parseClassicEventBody(requestOrEvent);
    } catch {
      return respond(400, {
        ok: false,
        code: "INVALID_REQUEST",
      });
    }

    if (
      !body ||
      typeof body !== "object" ||
      !Object.hasOwn(body, "email") ||
      !Object.hasOwn(body, "name") ||
      !Object.hasOwn(body, "orderId") ||
      !Object.hasOwn(body, "deviceId")
    ) {
      return respond(400, {
        ok: false,
        code: "INVALID_REQUEST",
      });
    }

    if (!isValidPublicIssueName(body.name)) {
      return respond(400, {
        ok: false,
        code: "INVALID_NAME",
      });
    }

    if (!isValidPublicIssueOrderId(body.orderId)) {
      return respond(400, {
        ok: false,
        code: "INVALID_ORDER_ID",
      });
    }

    if (!isValidPublicIssueEmail(body.email)) {
      return respond(400, {
        ok: false,
        code: "INVALID_EMAIL",
      });
    }

    if (!isValidPublicIssueDeviceId(body.deviceId)) {
      return respond(400, {
        ok: false,
        code: "INVALID_DEVICE_ID",
      });
    }

    try {
      let issueStore;
      try {
        issueStore = issueStoreFactory();
      } catch (error) {
        console.error(
          "[public-certificate-issue] issueStoreFactory failed:",
          error instanceof Error ? error.stack || error.message : error,
        );
        throw error;
      }

      let deviceClaimStore;
      try {
        deviceClaimStore = deviceClaimStoreFactory();
      } catch (error) {
        console.error(
          "[public-certificate-issue] deviceClaimStoreFactory failed:",
          error instanceof Error ? error.stack || error.message : error,
        );
        throw error;
      }

      let licenseStore;
      try {
        licenseStore = licenseStoreFactory();
      } catch (error) {
        console.error(
          "[public-certificate-issue] licenseStoreFactory failed:",
          error instanceof Error ? error.stack || error.message : error,
        );
        throw error;
      }

      const result = await issuePublicCommercialCertificateFn({
        issueStore,
        deviceClaimStore,
        licenseStore,
        deviceId: body.deviceId,
        name: body.name,
        orderId: body.orderId,
        email: body.email,
      });

      if (!result.ok) {
        const statusCode =
          result.code === "INVALID_EMAIL" ||
          result.code === "INVALID_NAME" ||
          result.code === "INVALID_ORDER_ID" ||
          result.code === "INVALID_DEVICE_ID"
            ? 400
            : result.code === "LICENSE_WRITE_NOT_VISIBLE"
              ? 500
              : 500;

        return respond(statusCode, {
          ok: false,
          code: result.code,
        });
      }

      await recordAnalyticsEventSafely({
        event: ANALYTICS_EVENT.CLAIM_SUCCESS,
        ts: result.issuedAt || new Date().toISOString(),
        source: "public-certificate-issue",
        resultCode: result.reused ? "REUSED" : "ISSUED",
        deviceId: body.deviceId,
        issueId: result.issueId,
        reused: Boolean(result.reused),
      });

      return respond(200, {
        ok: true,
        commercialCertificate: result.commercialCertificate,
        email: result.email,
        issuedAt: result.issuedAt,
        reused: result.reused,
      });
    } catch (error) {
      console.error(
        "[public-certificate-issue] Unhandled error:",
        error instanceof Error ? error.stack || error.message : error,
      );
      return respond(INTERNAL_ERROR_RESULT.statusCode, INTERNAL_ERROR_RESULT.body);
    }
  };

export const handler = createPublicCertificateIssueHandler();

export default handler;
