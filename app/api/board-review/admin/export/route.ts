import { NextRequest, NextResponse } from "next/server";
import { catapultClient, sortEntries, allResponses } from "@/lib/board-review/server";
import { getList, getMembers } from "@/lib/board-review/store";
import { buildBrandedXlsx } from "@/lib/jag-brand-xlsx";
import { BR_CHOICE_SHORT, BR_CLIENT_NAMES } from "@/lib/board-review/config";

// Catapult-only Excel export of every member's pick + comment per prospect.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const c = await catapultClient(req, req.nextUrl.searchParams.get("client"));
  if (!c) return NextResponse.json({ error: "Catapult staff login required" }, { status: 401 });
  const [list, members] = await Promise.all([getList(c), getMembers(c)]);
  const answers = await allResponses(c, members);
  const entries = sortEntries(list?.entries ?? []);
  const cols = [{ label: "Prospect" }, { label: "City" }, { label: "State" }, { label: "CPTID", kind: "num" as const },
    { label: "A" , kind: "num" as const }, { label: "B", kind: "num" as const }, { label: "C", kind: "num" as const }, { label: "D", kind: "num" as const },
    ...members.flatMap((m) => [{ label: m.name }, { label: `${m.name} comment` }])];
  const rows = entries.map((e) => {
    const picks = members.map((m) => answers[m.id]?.[String(e.cptid)]);
    const count = (k: string) => picks.filter((p) => p?.choice === k).length;
    return [e.name, e.city, e.state, e.cptid, count("A"), count("B"), count("C"), count("D"),
      ...picks.flatMap((p) => [p?.choice ? BR_CHOICE_SHORT[p.choice] : "", p?.other ?? ""])];
  });
  const date = new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
  const buf = await buildBrandedXlsx({
    title: `${BR_CLIENT_NAMES[c]} Prospect Review`, subtitle: `${list?.name ?? "Prospect Review"} · ${entries.length} prospects · ${members.length} members · Exported ${date}`,
    client: BR_CLIENT_NAMES[c], cols, sections: [{ rows }],
    notes: ["A = Fully comfortable making the ask, primary solicitor. B = Comfortable as secondary solicitor. C = Not comfortable asking, could open the door. D = Does not know this prospect. Other = see comment.", "Confidential. Prepared by Catapult Fundraising for internal campaign planning."],
  });
  const file = `${c.toUpperCase()} Prospect Review ${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buf), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${file}"` } });
}
