import test from 'node:test';
import assert from 'node:assert/strict';
import { requireObjectId } from './middleware/validation.js';

test('requireObjectId accepts Prisma UUIDs used by this app', () => {
  const uuid = '123e4567-e89b-42d3-a456-426614174000';
  let called = false;

  const req = { params: { roomId: uuid } };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json() {
      throw new Error('Validation should not fail for a valid UUID.');
    },
  };

  requireObjectId('roomId')(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(res.code, undefined);
});
