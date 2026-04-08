import { getAnalyticsEventStore, getRecentAnalyticsEvents } from "./lib/analytics-event-store.mjs";
import { authorizeOperatorRequest, jsonResponse } from "./lib/license-ops.mjs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const normalizeLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
};

export const lookupRecentAnalyticsEvents = async ({ store, limit }) => {
  const events = await getRecentAnalyticsEvents(store, normalizeLimit(limit));

  return {
    statusCode: 200,
    body: {
      ok: true,
      events,
    },
  };
};

export const createAnalyticsEventsHandler =
  ({ storeFactory = getAnalyticsEventStore } = {}) =>
  async (request) => {
    if (request.method !== "GET") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = await authorizeOperatorRequest(request);
    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const result = await lookupRecentAnalyticsEvents({
      store: storeFactory(),
      limit: url.searchParams.get("limit"),
    });

    return jsonResponse(result.statusCode, result.body);
  };

export default createAnalyticsEventsHandler();
