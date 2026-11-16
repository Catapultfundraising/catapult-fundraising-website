// Browser-safe independent response boundary. No server crypto/auth or imported runtime SQL.
import type { DirectFileReceipt, DirectFilePlan } from "./directFileProtocol";
type Expected = { client: string; requestId: string; payloadHash?: string; previewHash?: string; cells?: number };
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const hex = (x: unknown) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
export function confirmedDirectReceipt(raw: unknown, expected: Expected): DirectFileReceipt {
  if (!obj(raw) || raw.protocol !== "direct-file-v1" || raw.status !== "committed" || raw.client !== expected.client ||
      raw.requestId !== expected.requestId || !/^[a-f0-9]{32}$/.test(expected.requestId) ||
      raw.effect !== "source-state-only" || raw.effectiveChanges !== "not-asserted" || raw.publication !== "not-requested" ||
      !hex(raw.payloadHash) || !hex(raw.previewHash) || !["saved", "held", "unchanged"].every(k => Number.isSafeInteger(raw[k]) && Number(raw[k]) >= 0 && Number(raw[k]) <= 50) ||
      Number(raw.saved) + Number(raw.held) + Number(raw.unchanged) < 1 || Number(raw.saved) + Number(raw.held) + Number(raw.unchanged) > 50 ||
      (expected.payloadHash !== undefined && raw.payloadHash !== expected.payloadHash) ||
      (expected.previewHash !== undefined && raw.previewHash !== expected.previewHash) ||
      (expected.cells !== undefined && Number(raw.saved) + Number(raw.held) + Number(raw.unchanged) !== expected.cells))
    throw new Error("Unconfirmed source receipt; keep original request ID and check status. Do not resend.");
  const keys = ["protocol", "requestId", "client", "status", "saved", "held", "unchanged", "payloadHash", "previewHash", "effect", "effectiveChanges", "publication", ...(raw.replay !== undefined ? ["replay"] : [])];
  if (Object.keys(raw).length !== keys.length || Object.keys(raw).some(k => !keys.includes(k)) || (raw.replay !== undefined && typeof raw.replay !== "boolean"))
    throw new Error("Unconfirmed source receipt");
  return raw as unknown as DirectFileReceipt;
}
export function confirmedDirectPreview(raw: unknown): DirectFilePlan {
  if (!obj(raw) || raw.protocol !== "direct-file-v1" || raw.status !== "previewed" || !obj(raw.plan) || Object.keys(raw).some(k => !["protocol", "status", "plan"].includes(k)) ||
      !hex(raw.plan.payloadHash) || !hex(raw.plan.previewHash) || !hex(raw.plan.proof) || !Number.isSafeInteger(raw.plan.expiresAt) ||
      !Array.isArray(raw.plan.decisions) || !raw.plan.decisions.length || raw.plan.decisions.length > 50) throw new Error("Invalid source preview; no approval available.");
  if (Object.keys(raw.plan).sort().join(",") !== ["payloadHash", "previewHash", "proof", "expiresAt", "decisions"].sort().join(",") ||
      raw.plan.decisions.some((d: unknown) => !obj(d) ||
        Object.keys(d).sort().join(",") !== ["ordinal", "cptid", "field", "before", "after", "action", "reason", "eventKey"].sort().join(",") ||
        !Number.isInteger(d.ordinal) || Number(d.ordinal) < 1 || Number(d.ordinal) > 500 ||
        !Number.isInteger(d.cptid) || Number(d.cptid) <= 0 || Number(d.cptid) > 2147483647 ||
        !["ask", "primarySolicitor", "secondarySolicitor", "note"].includes(String(d.field)) ||
        !(d.before === null || typeof d.before === "string") || typeof d.after !== "string" ||
        !["set", "advance", "append", "unchanged", "held"].includes(String(d.action)) ||
        !(d.reason === null || typeof d.reason === "string") || !(d.eventKey === null || hex(d.eventKey))))
    throw new Error("Invalid source decisions; no approval available.");
  return raw.plan as unknown as DirectFilePlan;
}
