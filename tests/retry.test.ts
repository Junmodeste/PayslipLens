import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "../src/retry.ts";

test("retries transient errors then succeeds", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    if (calls < 3) throw new Error("AI: Error fetching: [500 ] high demand");
    return "ok";
  }, [0, 0]);
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("does not retry other errors", async () => {
  let calls = 0;
  await assert.rejects(withRetry(async () => {
    calls++;
    throw new Error("AI: [403 ] Permission denied");
  }, [0, 0]));
  assert.equal(calls, 1);
});

test("gives up after the last delay", async () => {
  let calls = 0;
  await assert.rejects(withRetry(async () => {
    calls++;
    throw new Error("[503 ] unavailable");
  }, [0]));
  assert.equal(calls, 2);
});
