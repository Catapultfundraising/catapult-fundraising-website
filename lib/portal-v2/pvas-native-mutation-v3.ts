/** Public intent/receipt validation only. Browser facts are NEVER write authority. */
import { object, exact, positive, hex, nativeOrderV3 } from "./pvas-native-v3";
type Scalar = string | number | boolean | null;
export type CampaignEditValues = { donorCptid?: Scalar; donorName?: Scalar; kind?: "gift" | "pledge"; amount?: string | number; date?: Scalar; note?: Scalar };
type Common = { v: 3; requestId: string; rootCptid: number; target: { giftId: number; expectedVersion: number; source: { system: "website_db" | "portal_gifts"; key: string } } };
export type CampaignCommand = Common & ({ action: "edit"; values: CampaignEditValues } | { action: "void"; reason: string });
export type CampaignBody = { op: "nativeCampaignMutationV3"; client: "pvas"; by: string; command: CampaignCommand };
const fail = (): never => { throw new Error("Gift change could not be verified. Retain the original change and check its status."); };
const scalar = (v: unknown) => v === null || typeof v === "boolean" || typeof v === "string" && v.length <= 1000000 || typeof v === "number" && Number.isFinite(v);
export function declaredBy(v: unknown): string {
  if (typeof v !== "string" || !v.trim() || v.length > 200 || /[\x00-\x1f\x7f]/.test(v)) return fail();
  return v;
}
export function campaignCommand(raw: unknown): CampaignCommand {
  if (!object(raw) || (raw.action !== "edit" && raw.action !== "void") ||
    !exact(raw, ["v", "requestId", "rootCptid", "target", "action", raw.action === "edit" ? "values" : "reason"]) ||
    raw.v !== 3 || !hex(raw.requestId) || !positive(raw.rootCptid) || !object(raw.target) ||
    !exact(raw.target, ["giftId", "expectedVersion", "source"]) || !positive(raw.target.giftId) || !positive(raw.target.expectedVersion) ||
    !object(raw.target.source) || !exact(raw.target.source, ["system", "key"]) ||
    (raw.target.source.system !== "website_db" && raw.target.source.system !== "portal_gifts") ||
    typeof raw.target.source.key !== "string" || !raw.target.source.key || raw.target.source.key.trim() !== raw.target.source.key ||
    raw.target.source.key.length > 400 || /[\x00-\x1f\x7f]/.test(raw.target.source.key)) return fail();
  const c: Common = { v: 3, requestId: raw.requestId, rootCptid: raw.rootCptid,
    target: { giftId: raw.target.giftId, expectedVersion: raw.target.expectedVersion,
      source: { system: raw.target.source.system, key: raw.target.source.key } } };
  if (raw.action === "void") {
    if (typeof raw.reason !== "string" || !raw.reason.trim() || raw.reason.length > 1000000) return fail();
    return { ...c, action: "void", reason: raw.reason };
  }
  const keys = ["donorCptid", "donorName", "kind", "amount", "date", "note"];
  if (!object(raw.values) || Object.keys(raw.values).some(k => !keys.includes(k))) return fail();
  const values: Record<string, Scalar> = {};
  for (const key of keys) if (Object.hasOwn(raw.values, key)) {
    const v = raw.values[key];
    if (!scalar(v) || key === "kind" && v !== "gift" && v !== "pledge" ||
      key === "amount" && typeof v !== "string" && typeof v !== "number") return fail();
    values[key] = v as Scalar;
  }
  // Match the existing backend intent preconditions BEFORE persisting an
  // otherwise unsendable public command; do not normalize its actual payload.
  if (Object.hasOwn(values, "amount")) {
    const n = Number(String(values.amount).replace(/[$,\s]/g, ""));
    if (!(n > 0) || !Number.isFinite(n) || !Number.isFinite(Math.round(n * 100) / 100)) return fail();
  }
  if (Object.hasOwn(values, "donorCptid") && values.donorCptid !== "") {
    const n = Number(values.donorCptid) || null;
    if (n !== null && !positive(n)) return fail();
  }
  if (Object.hasOwn(values, "date") && String(values.date ?? "").trim().slice(0, 20)) {
    const t = String(values.date ?? "").trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t), us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
    if (!iso && !us) return fail();
    const y = Number(iso ? iso[1] : us![3]), m = Number(iso ? iso[2] : us![1]), d = Number(iso ? iso[3] : us![2]);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return fail();
  }
  // Preserve ORIGINAL lexemes/types. Normalization remains the backend owner.
  return { ...c, action: "edit", values: values as CampaignEditValues };
}
export function campaignBody(raw: unknown): CampaignBody {
  if (!object(raw) || !exact(raw, ["op", "client", "by", "command"]) || raw.op !== "nativeCampaignMutationV3" || raw.client !== "pvas") return fail();
  return { op: raw.op, client: "pvas", by: declaredBy(raw.by), command: campaignCommand(raw.command) };
}
export function campaignStatusBody(body: CampaignBody) {
  const original = campaignBody(body);
  return { op: "nativeCampaignStatusV3" as const, client: "pvas" as const, by: original.by,
    operation: "nativeCampaignMutationV3" as const, command: original.command };
}
export async function campaignPayloadHash(body: CampaignBody) {
  const b = campaignBody(body);
  const bytes = new TextEncoder().encode(JSON.stringify(["pvas-native-campaign-mutation-v3/command/v1",
    { operation: b.op, actor: b.by, command: b.command }]));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
}
export async function campaignReceipt(raw: unknown, body: CampaignBody, statusReceipt = false) {
  const c = campaignBody(body).command;
  if (!object(raw) || !exact(raw, "v kind operation requestId rootCptid payloadHash giftId version order action changed replayed".split(" ")) ||
    raw.v !== 3 || raw.kind !== "gift" || raw.operation !== body.op || raw.requestId !== c.requestId || raw.rootCptid !== c.rootCptid ||
    raw.payloadHash !== await campaignPayloadHash(body) || raw.giftId !== c.target.giftId || !positive(raw.version) ||
    raw.action !== c.action || typeof raw.changed !== "boolean" || typeof raw.replayed !== "boolean" ||
    statusReceipt && raw.replayed !== false) return fail();
  nativeOrderV3(raw.order);
  if (raw.version !== c.target.expectedVersion + (raw.changed ? 1 : 0)) return fail();
  return structuredClone(raw);
}
export async function campaignStatus(raw: unknown, body: CampaignBody) {
  if (!object(raw) || !exact(raw, ["v", "operation", "requestId", "payloadHash", "retry", "status", "receipt"]) || raw.v !== 3 ||
    raw.operation !== body.op || raw.requestId !== body.command.requestId || raw.payloadHash !== await campaignPayloadHash(body) || raw.retry !== false ||
    !["committed", "pending", "not-observed"].includes(String(raw.status)) || typeof raw.status !== "string") return fail();
  if (raw.status === "committed") await campaignReceipt(raw.receipt, body, true);
  else if (raw.receipt !== null) return fail();
  return structuredClone(raw);
}
