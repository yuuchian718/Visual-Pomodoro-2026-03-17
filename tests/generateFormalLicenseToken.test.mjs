import test from "node:test";
import assert from "node:assert/strict";

import { verifyAsync } from "@noble/ed25519";

import {
  buildPermanentLicenseMessage,
  generatePermanentLicenseToken,
  normalizeDeviceId,
} from "../scripts/generate-formal-license-token.mjs";

test("generatePermanentLicenseToken returns a KOTO1 permanent token with a verifiable signature", async () => {
  const privateKeyB64 = "u6n+4/4TLx6hgW6utED8nSv0epVkaN5JDSOZXVQP5cs=";
  const publicKeyB64 = "N567DMrVJta5Vquo0OPOIkZDo+thb7laBa2btht4jmU=";

  const token = await generatePermanentLicenseToken({
    deviceId: " ll-test-device001 ",
    privateKeyB64,
  });

  const parts = token.split(".");

  assert.equal(parts.length, 2);
  assert.equal(parts[0], "KOTO1");

  const message = buildPermanentLicenseMessage(normalizeDeviceId(" ll-test-device001 "));
  const verified = await verifyAsync(
    Buffer.from(parts[1], "base64"),
    new TextEncoder().encode(message),
    Buffer.from(publicKeyB64, "base64"),
  );

  assert.equal(verified, true);
});
