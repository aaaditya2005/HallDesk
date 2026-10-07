import test from "node:test";
import assert from "node:assert/strict";
import { getHallRoomName, getSocketEventRoom } from "./socket.js";

test("builds consistent hall room names", () => {
  assert.equal(getHallRoomName("hall-123"), "hall:hall-123");
  assert.equal(getSocketEventRoom("hall-123"), "hall:hall-123");
});
