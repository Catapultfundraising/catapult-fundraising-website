// TEST-ONLY parent side of the paired harness (H2). Verifies the externally supplied backend extract identity, spawns the
// backend child with the backend's own tsx, and turns web Requests into stdio frames. No ports/network/env mutation.
// Protocol failures (spawn error, stdin error, stdout EOF, malformed/unknown frame) are fatal: pending AND future frames
// reject and the child is killed. The child is also killed when the parent process exits.
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

/** sha256 over sorted "sha256  ./path" lines of every file except node_modules (same as `find|sort|sha256sum|sha256sum`). */
export function inventory(dir: string): string {
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (p === join(dir, "node_modules")) continue; statSync(p).isDirectory() ? walk(p) : files.push(p); } };
  walk(dir);
  const lines = files.map((p) => "./" + p.slice(dir.length + 1)).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))).map((rel) => `${createHash("sha256").update(readFileSync(join(dir, rel))).digest("hex")}  ${rel}\n`);
  return createHash("sha256").update(lines.join("")).digest("hex");
}
export interface Pin { dir: string; inventory: string; lockSha256: string; next: string }
/** Pins are supplied EXTERNALLY (test command line), never stored in the tree they describe. */
export function verifyPin(p: Pin) {
  const dir = resolve(p.dir);
  if (!existsSync(join(dir, "package.json"))) throw new Error("harness: backend extract missing");
  const lock = createHash("sha256").update(readFileSync(join(dir, "package-lock.json"))).digest("hex");
  if (lock !== p.lockSha256) throw new Error("harness: backend lockfile hash mismatch");
  const inv = inventory(dir); if (inv !== p.inventory) throw new Error(`harness: backend inventory mismatch (${inv.slice(0, 12)})`);
  const nv = JSON.parse(readFileSync(join(dir, "node_modules/next/package.json"), "utf8")).version; if (nv !== p.next) throw new Error("harness: backend next version mismatch");
  return dir;
}
export type Frame = Record<string, unknown>;
export class ChildCrashed extends Error { constructor(public code: number | null) { super(`harness: backend child exited (${code})`); } }
export class ProtocolError extends Error { constructor(m: string) { super(`harness: protocol failure: ${m}`); } }
export const EOF_GRACE_MS = 2000;
const live = new Set<ChildProcess>();
let exitHook = false;
const ensureExitHook = () => { if (exitHook) return; exitHook = true; process.on("exit", () => { for (const c of live) { try { c.kill("SIGKILL"); } catch { /* gone */ } } }); };

/** Attach the frame protocol to an already spawned child (also used by self-tests with synthetic children). */
export function attach(cp: ChildProcess) {
  ensureExitHook(); live.add(cp);
  let seq = 0; const pending = new Map<string, { ok: (f: Frame) => void; no: (e: Error) => void }>(); let dead: Error | null = null; let stderr = "";
  const die = (e: Error) => { if (dead) return; dead = e; for (const p of pending.values()) p.no(e); pending.clear(); try { cp.kill("SIGKILL"); } catch { /* gone */ } };
  cp.on("error", (e) => die(new ProtocolError(`spawn/process error: ${e.message}`)));
  cp.stdin?.on("error", (e) => die(new ProtocolError(`stdin: ${e.message}`)));
  cp.stderr?.on("data", (d) => { stderr = (stderr + d).slice(-4000); });
  if (cp.stdout) {
    const rl = createInterface({ input: cp.stdout });
    rl.on("line", (l) => {
      let f: Frame; try { f = JSON.parse(l); } catch { return die(new ProtocolError("malformed frame")); }
      if (!f || typeof f !== "object" || Array.isArray(f)) return die(new ProtocolError("non-object frame"));
      if (f.kind === "crashing" || f.kind === "fatal") return; // child announces exit; the exit handler settles pending
      const p = pending.get(String(f.id)); if (!p) return die(new ProtocolError("frame for unknown request id"));
      pending.delete(String(f.id)); p.ok(f);
    });
    // stdout EOF: if the process does not exit within a bounded grace period it is a protocol failure (fail closed + kill).
    rl.on("close", () => { if (dead || cp.exitCode !== null || cp.signalCode !== null) return;
      const t = setTimeout(() => die(new ProtocolError("stdout closed while child alive")), EOF_GRACE_MS); t.unref(); cp.once("exit", () => clearTimeout(t)); });
  } else die(new ProtocolError("no stdout"));
  const exited = new Promise<number | null>((r) => cp.on("exit", (c) => { live.delete(cp); die(new ChildCrashed(c)); r(c); }));
  const send = (f: Frame): Promise<Frame> => { if (dead) return Promise.reject(dead); const id = `f${++seq}`;
    return new Promise((ok, no) => { pending.set(id, { ok, no }); try { cp.stdin!.write(JSON.stringify({ ...f, id }) + "\n"); } catch (e) { die(new ProtocolError(`stdin write: ${(e as Error).message}`)); } }); };
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const r = new Request(url, init); const f = await send({ kind: "request", url: r.url, method: r.method, headers: Object.fromEntries(r.headers), body: await r.text() });
    if (f.kind !== "response") throw new Error(`harness: ${String(f.error ?? f.kind)}`);
    return new Response(String(f.body), { status: Number(f.status), headers: f.headers as Record<string, string> });
  }) as typeof fetch;
  return { send, fetchImpl, exited, stderr: () => stderr, dead: () => dead, kill: () => die(new ProtocolError("killed by parent")) };
}
export function startChild(pin: Pin, childScript: string) {
  const dir = verifyPin(pin);
  return attach(spawn(join(dir, "node_modules/.bin/tsx"), [resolve(childScript)], { cwd: dir, stdio: ["pipe", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" } as unknown as NodeJS.ProcessEnv }));
}
