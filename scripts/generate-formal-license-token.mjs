import "dotenv/config";

export {
  buildPermanentLicenseMessage,
  generatePermanentLicenseToken,
  normalizeDeviceId,
} from "../netlify/functions/lib/formal-license-token.mjs";

import { generatePermanentLicenseToken } from "../netlify/functions/lib/formal-license-token.mjs";

const runCli = async () => {
  const deviceId = process.argv[2] || "";

  if (!deviceId.trim()) {
    console.error("Usage: node scripts/generate-formal-license-token.mjs <deviceId>");
    process.exitCode = 1;
    return;
  }

  try {
    const token = await generatePermanentLicenseToken({ deviceId });
    console.log(token);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  await runCli();
}
