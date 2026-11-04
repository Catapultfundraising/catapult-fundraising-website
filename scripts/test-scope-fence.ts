// Synthetic tests for the source-import page scope fence (deferred file read / save / status after a selection change).
import test from "node:test";
import assert from "node:assert/strict";
import { createScopeFence, StaleScope } from "../lib/portal-v2/scope-fence";

const deferred = <T,>() => { let res!: (v: T) => void, rej!: (e: unknown) => void; const p = new Promise<T>((a, b) => { res = a; rej = b; }); return { p, res, rej }; };

test("deferred file read: selection changes while reading -> old file never installed or dispatched", async () => {
  const f = createScopeFence(); const state = { client: "pvas", file: "", dispatched: 0 };
  const read = deferred<string>();
  const onFile = async () => { f.bump(); const tk = f.token(); const text = await read.p; if (!tk.live()) return; state.file = text; state.dispatched++; };
  const pending = onFile();
  f.bump(); state.client = "csnf"; // user switches client/table during the read
  read.res("ID,Q\n101,B\n"); await pending;
  assert.deepEqual(state, { client: "csnf", file: "", dispatched: 0 });
});
test("deferred save / status replies after reset cannot update the new selection (success or error)", async () => {
  const f = createScopeFence(); const writes: string[] = [];
  const save = deferred<string>(), status = deferred<string>();
  const tk1 = f.token(); const p1 = tk1.guard(save.p).then((v) => writes.push(`save:${v}`)).catch((e) => { if (!(e instanceof StaleScope)) writes.push("err"); });
  const tk2 = f.token(); const p2 = tk2.guard(status.p).then((v) => writes.push(`status:${v}`)).catch((e) => { if (!(e instanceof StaleScope)) writes.push("err"); });
  f.bump();
  save.res("ok"); status.rej(new Error("network")); await Promise.all([p1, p2]);
  assert.deepEqual(writes, []);
  tk1.run(() => { (writes as string[]).push("late"); }); assert.deepEqual(writes, []);
  const tk3 = f.token(); tk3.run(() => { (writes as string[]).push("current"); }); assert.deepEqual(writes, ["current"]);
});
