import assert from 'node:assert/strict';
import test from 'node:test';

import {parseCustomDurationInput} from '../src/components/SettingsModal.tsx';

test('parseCustomDurationInput accepts whole minutes within 1 to 240', () => {
  assert.equal(parseCustomDurationInput('25'), 25);
  assert.equal(parseCustomDurationInput(' 70 '), 70);
  assert.equal(parseCustomDurationInput('1'), 1);
  assert.equal(parseCustomDurationInput('240'), 240);
});

test('parseCustomDurationInput rejects empty, non-integer, and out-of-range values', () => {
  assert.equal(parseCustomDurationInput(''), null);
  assert.equal(parseCustomDurationInput('0'), null);
  assert.equal(parseCustomDurationInput('-5'), null);
  assert.equal(parseCustomDurationInput('abc'), null);
  assert.equal(parseCustomDurationInput('12.5'), null);
  assert.equal(parseCustomDurationInput('241'), null);
});
