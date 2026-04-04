import { signAsync } from "@noble/ed25519";

export const normalizeDeviceId = (deviceId) =>
  String(deviceId || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

export const buildPermanentLicenseMessage = (deviceId) =>
  `KOTO|${deviceId}|PERMANENT`;

export const getFormalLicensePrivateKeyBytes = (privateKeyB64 = process.env.KOTO_PRIVATE_KEY_B64) => {
  const keyBytes = Buffer.from(String(privateKeyB64 || "").trim(), "base64").slice(0, 32);

  if (keyBytes.length !== 32) {
    throw new Error("KOTO_PRIVATE_KEY_B64 must decode to at least 32 bytes");
  }

  return keyBytes;
};

export const generatePermanentLicenseToken = async ({
  deviceId,
  privateKeyB64 = process.env.KOTO_PRIVATE_KEY_B64,
}) => {
  const normalizedDeviceId = normalizeDeviceId(deviceId);

  if (!normalizedDeviceId) {
    throw new Error("deviceId is required");
  }

  const signatureBytes = await signAsync(
    new TextEncoder().encode(buildPermanentLicenseMessage(normalizedDeviceId)),
    getFormalLicensePrivateKeyBytes(privateKeyB64),
  );

  return `KOTO1.${Buffer.from(signatureBytes).toString("base64")}`;
};
