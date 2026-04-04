import {
  createProtectedPostHandler,
  resetLicenseDevicesRecord,
} from "./lib/license-ops.mjs";

export const resetLicenseDevices = resetLicenseDevicesRecord;

export default createProtectedPostHandler(resetLicenseDevicesRecord);
