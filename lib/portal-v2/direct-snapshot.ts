// Pure read projection. Source is explicit, never counterfeit manual portal_updates.
export type DirectClientView = { revision: string; values: { cptid: number; field: "ask" | "primarySolicitor" | "secondarySolicitor"; value: string | null; source: boolean }[] };
export function directSnapshot<T>(raw: T, direct?: DirectClientView | null, boardCampaignAsk = true): T {
  if (!direct) return raw;
  const fields = new Map<number, DirectClientView["values"]>();
  for (const v of direct.values) fields.set(v.cptid, [...(fields.get(v.cptid) ?? []), v]);
  const result = { ...(raw as Record<string, unknown>) };
  // Exact current-main campaign/assignment collection owners. Never scan arbitrary arrays:
  // committed/Stewardship/gifts/pledges/Givebutter are financial facts, NOT campaign asks.
  const assignmentKeys = ["pool", "portfolio", "highWealth", "midLevel", "legacy", "lapsed", "top"];
  for (const key of [...assignmentKeys, "board"]) {
    const items = result[key];
    if (!Array.isArray(items)) continue;
    result[key] = items.map(row => {
      if (!row || typeof row !== "object" || !fields.has(row.cptid)) return row;
      const out = { ...row };
      // WCBHC/BAQ board asks describe another commitment, not campaign ask. Caller excludes that collection.
      for (const value of fields.get(row.cptid)!) {
        if (value.field === "ask") {
          if (key === "pool" || key === "portfolio" || (key === "board" && boardCampaignAsk && row.active === true))
            Object.assign(out, { ask: value.value === null || value.value === "" ? null : Number(value.value), directAskPresent: value.source, directManualAskPresent: !value.source, ...(!value.source ? { askEdited: true, askBlank: value.value === null || value.value === "" } : {}) });
        } else if (assignmentKeys.includes(key)) out[value.field === "primarySolicitor" ? "solicitor" : "solicitor2"] = value.value ?? "";
      }
      return out;
    });
  }
  return result as T;
}
