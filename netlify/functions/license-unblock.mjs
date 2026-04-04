import { createProtectedPostHandler, unblockLicenseRecord } from "./lib/license-ops.mjs";

export const unblockLicense = unblockLicenseRecord;

export default createProtectedPostHandler(unblockLicenseRecord);
