// TEST-ONLY parent side of the paired harness (H2). Verifies the externally supplied backend extract identity, spawns the
// backend child with the backend's own tsx, and turns web Requests into stdio frames. No ports/network/env mutation.
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
  const lines = files.map((p) => "./" + p.slice(dir.length + 1)).sort((a, b) => (Buffer.from(a) < Buffer.from(b) ? -1 : a === b ? 0 : 1)).map((rel) => `${createHash("sha256").update(readFileSync(join(dir, rel))).digest("hex")}  ${rel}\n`);
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
export function startChild(pin: Pin, childScript: string) {
  const dir = verifyPin(pin);
  const cp: ChildProcess = spawn(join(dir, "node_modules/.bin/tsx"), [resolve(childScript)], { cwd: dir, stdio: ["pipe", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" } as unknown as NodeJS.ProcessEnv });
  let seq = 0; const pending = new Map<string, { ok: (f: Frame) => void; no: (e: Error) => void }>(); let dead: Error | null = null; let stderr = "";
  cp.stderr!.on("data", (d) => { stderr = (stderr + d).slice(-4000); });
  createInterface({ input: cp.stdout! }).on("line", (l) => { let f: Frame; try { f = JSON.parse(l); } catch { return; } const p = pending.get(String(f.id)); if (p) { pending.delete(String(f.id)); p.ok(f); } });
  const exited = new Promise<number | null>((r) => cp.on("exit", (c) => { dead = new ChildCrashed(c); for (const p of pending.values()) p.no(dead); pending.clear(); r(c); }));
  const send = (f: Frame): Promise<Frame> => { if (dead) return Promise.reject(dead); const id = `f${++seq}`; return new Promise((ok, no) => { pending.set(id, { ok, no }); cp.stdin!.write(JSON.stringify({ ...f, id }) + "\n"); }); };
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const r = new Request(url, init); const f = await send({ kind: "request", url: r.url, method: r.method, headers: Object.fromEntries(r.headers), body: await r.text() });
    if (f.kind !== "response") throw new Error(`harness: ${String(f.error ?? f.kind)}`);
    return new Response(String(f.body), { status: Number(f.status), headers: f.headers as Record<string, string> });
  }) as typeof fetch;
  return { send, fetchImpl, exited, stderr: () => stderr, kill: () => { if (!dead) cp.kill("SIGKILL"); } };
}
