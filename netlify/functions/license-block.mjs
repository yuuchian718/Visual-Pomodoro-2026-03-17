import { blockLicenseRecord, createProtectedPostHandler } from "./lib/license-ops.mjs";

export const blockLicense = blockLicenseRecord;

export default createProtectedPostHandler(blockLicenseRecord);
