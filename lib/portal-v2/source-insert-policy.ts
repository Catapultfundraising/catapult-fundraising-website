// Server-owned gift insert policies (REVIEW-ONLY). IDENTICAL contract and digest to Engage lib/sourceImport.ts.
// EMPTY by default: every new gift ID on a person-linked table stays held. A policy is added only after review, in BOTH
// services, with a bumped approvalVersion on every change. No env bypass. Policies never assign IDs or crosswalks,
// never derive values; Stage/Status/Type/Year are copied as given.
import { createHash } from "node:crypto";

export interface GiftInsertPolicy { approvalId: string; approvalVersion: number; client: string; table: string; key: string; personLink: string; crosswalk: string; master: { table: string; key: string }; required: string[] }
export const GIFT_INSERT_POLICIES: readonly GiftInsertPolicy[] = Object.freeze([]);
export function insertPolicyDigest(p: GiftInsertPolicy) {
  return createHash("sha256").update(JSON.stringify(["gift-insert/v1", p.approvalId, p.approvalVersion, p.client, p.table, p.key, p.personLink, p.crosswalk, p.master.table, p.master.key, [...p.required].sort()])).digest("hex");
}
export const insertPolicyFor = (client: string, table: string, policies: readonly GiftInsertPolicy[] = GIFT_INSERT_POLICIES) => policies.find((p) => p.client === client && p.table === table) ?? null;
