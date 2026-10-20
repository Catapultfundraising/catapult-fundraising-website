import { NextRequest, NextResponse } from "next/server";
import { catapultClient, sortEntries, adminState } from "@/lib/board-review/server";
import { buildBrandedXlsx, type ExportCol } from "@/lib/jag-brand-xlsx";
import { renderTablePdf } from "@/lib/brand-table-pdf";
import { portalProspects, BOARD_SUGGEST_PREFIX } from "@/lib/portal-v2/server";
import { BR_CHOICE_SHORT, BR_CLIENT_NAMES, type BrEntry } from "@/lib/board-review/config";

// Catapult-only export (?format=xlsx default | pdf) of every member's pick + comment per prospect, including prospects
// members added themselves ("Who else should we be talking to?") and every comment.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const c = await catapultClient(req, req.nextUrl.searchParams.get("client"));
  if (!c) return NextResponse.json({ error: "Catapult staff login required" }, { status: 401 });
  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const [{ list, members, answers }, added] = await Promise.all([adminState(c), portalProspects(c)]);
  const suggestions = added.filter((p) => p.created_by?.startsWith(BOARD_SUGGEST_PREFIX));
  // Every prospect anyone rated, even if it has since left the list, plus member-added prospects.
  const entries: (BrEntry & { added?: string })[] = sortEntries(list?.entries ?? []);
  const have = new Set(entries.map((e) => e.cptid));
  const byCpt = new Map(added.map((p) => [p.cptid, p]));
  const memberAdded = (cptid: number) => { const p = byCpt.get(cptid); return p?.created_by?.startsWith(BOARD_SUGGEST_PREFIX) ? p.created_by.slice(BOARD_SUGGEST_PREFIX.length) : ""; };
  const extra: (BrEntry & { added?: string })[] = [];
  for (const s of suggestions) if (!have.has(s.cptid)) { have.add(s.cptid); extra.push({ cptid: s.cptid, name: s.full_name, sortKey: s.full_name, city: s.city ?? "", state: s.state ?? "" }); }
  for (const m of members) for (const k of Object.keys(answers[m.id] ?? {})) {
    const id = Number(k); if (have.has(id)) continue; have.add(id);
    const p = byCpt.get(id);
    extra.push({ cptid: id, name: p?.full_name ?? `CPTID ${id} (no longer on the list)`, sortKey: p?.full_name ?? "", city: p?.city ?? "", state: p?.state ?? "" });
  }
  const all = [...entries, ...extra.sort((a, b) => a.name.localeCompare(b.name))];
  const pick = (mid: string, cptid: number) => answers[mid]?.[String(cptid)];
  const label = (a?: { choice: string; other?: string }) => (a?.choice ? BR_CHOICE_SHORT[a.choice] ?? a.choice : a?.other ? "Other" : "");
  const counts = (cptid: number) => { const ps = members.map((m) => pick(m.id, cptid)?.choice); return ["A", "B", "C", "D", "O"].map((k) => ps.filter((p) => p === k).length); };
  const comments = members.flatMap((m) => Object.entries(answers[m.id] ?? {}).filter(([, a]) => a?.other?.trim()).map(([k, a]) => {
    const e = all.find((x) => x.cptid === Number(k));
    return [e?.name ?? `CPTID ${k}`, Number(k), m.name, label(a), a.other!.trim(), a.at ? new Date(a.at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" }) : ""] as (string | number)[];
  })).sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[2]).localeCompare(String(b[2])));
  const sugRows = suggestions.map((s) => {
    const note = s.note ?? "";
    return [s.full_name, s.city ?? "", s.state ?? "", s.phone ?? "", s.cptid, s.created_by!.slice(BOARD_SUGGEST_PREFIX.length), note.match(/How they know them: (.*?)(?: \| Possible duplicate|$)/)?.[1] ?? "",
      note.match(/Possible duplicate of (.*)$/)?.[1] ?? "", s.created_at ? new Date(s.created_at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" }) : ""] as (string | number)[];
  });
  const date = new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
  const title = `${BR_CLIENT_NAMES[c]} Prospect Ratings`;
  const subtitle = `${list?.name ?? "Prospect Ratings"} · ${all.length} prospects (${extra.length} added by members or off-list) · ${members.length} members · ${comments.length} comments · Exported ${date}`;
  const legend = "A = Fully comfortable making the ask, primary solicitor. B = Comfortable as secondary solicitor. C = Not comfortable asking, could open the door. D = Does not know this prospect. Other = see comment.";
  const commentCols: ExportCol[] = [{ label: "Prospect" }, { label: "CPTID", kind: "num" }, { label: "Member" }, { label: "Pick" }, { label: "Comment" }, { label: "Date" }];
  const sugCols: ExportCol[] = [{ label: "Name" }, { label: "City" }, { label: "State" }, { label: "Cell" }, { label: "CPTID", kind: "num" }, { label: "Suggested by" }, { label: "How they know them" }, { label: "Possible duplicate" }, { label: "Added" }];
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "pdf") {
    const cols: ExportCol[] = [{ label: "Prospect" }, { label: "City, State" }, { label: "A", kind: "num" }, { label: "B", kind: "num" }, { label: "C", kind: "num" }, { label: "D", kind: "num" }, { label: "Other", kind: "num" }, { label: "Member picks" }];
    const rows = all.map((e) => {
      const who = members.map((m) => { const a = pick(m.id, e.cptid); const l = label(a); return l ? `${m.name}: ${l}${a?.other ? ` ("${a.other.trim()}")` : ""}` : ""; }).filter(Boolean).join("; ");
      const add = memberAdded(e.cptid);
      return [`${e.name}${add ? ` (added by ${add})` : ""}`, [e.city, e.state].filter(Boolean).join(", "), ...counts(e.cptid), who];
    });
    const buf = await renderTablePdf({ title, eyebrow: "Prospect Ratings · Catapult staff only", subtitle, client: BR_CLIENT_NAMES[c], cols, landscape: true,
      sections: [{ heading: "Ratings by prospect", rows }, { heading: `Member comments (${comments.length})`, cols: commentCols, rows: comments }, { heading: `Prospects added by members (${sugRows.length})`, cols: sugCols, rows: sugRows }],
      notes: [legend, "Confidential. Prepared by Catapult Fundraising for internal campaign planning."] });
    return new NextResponse(new Uint8Array(buf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${c.toUpperCase()} Prospect Ratings ${stamp}.pdf"` } });
  }
  const cols: ExportCol[] = [{ label: "Prospect" }, { label: "City" }, { label: "State" }, { label: "CPTID", kind: "num" }, { label: "Added by member" },
    { label: "A", kind: "num" }, { label: "B", kind: "num" }, { label: "C", kind: "num" }, { label: "D", kind: "num" }, { label: "Other", kind: "num" },
    ...members.flatMap((m) => [{ label: m.name }, { label: `${m.name} comment` }])];
  const rows = all.map((e) => [e.name, e.city, e.state, e.cptid, memberAdded(e.cptid), ...counts(e.cptid), ...members.flatMap((m) => { const a = pick(m.id, e.cptid); return [label(a), a?.other ?? ""]; })]);
  const buf = await buildBrandedXlsx({ title, subtitle, client: BR_CLIENT_NAMES[c], cols, sections: [{ rows }],
    notes: [legend, "Confidential. Prepared by Catapult Fundraising for internal campaign planning."],
    extraSheets: [{ name: "Member comments", cols: commentCols, rows: comments }, { name: "Added by members", cols: sugCols, rows: sugRows }] });
  return new NextResponse(new Uint8Array(buf), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${c.toUpperCase()} Prospect Ratings ${stamp}.xlsx"` } });
}
