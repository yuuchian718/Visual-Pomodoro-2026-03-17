import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const PAGE_PATH =
  "/home/uniquecc100/projects/visual-pomodoro/Visual-Pomodoro-2026-03-17/public/claim-certificate.html";

test("claim page contains the required certificate claim flow copy and endpoint", async () => {
  const html = await readFile(PAGE_PATH, "utf8");

  assert.match(html, /Claim Your Commercial Certificate/);
  assert.match(html, /Please enter a valid email address to continue\./);
  assert.match(html, /Your commercial certificate will be/);
  assert.match(html, /generated immediately after submission\./);
  assert.match(html, /Generate Certificate/);
  assert.match(html, /Your Commercial Certificate/);
  assert.match(html, /Copy Certificate/);
  assert.match(
    html,
    /Copy this certificate and paste it into Settings → Access (&|&amp;) License in Visual\s+Pomodoro\./,
  );
  assert.match(html, /\/\.netlify\/functions\/commercial-certificate-claim/);
  assert.match(html, /navigator\.serviceWorker\.getRegistrations\(/);
  assert.match(html, /registration\.unregister\(/);
});
