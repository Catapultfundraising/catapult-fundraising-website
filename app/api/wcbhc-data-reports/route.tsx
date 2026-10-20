import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import {
  AlignmentType, BorderStyle, Document as DocxDocument, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { isWcbhcDataAuthed } from "@/lib/wcbhc-data-auth";
import { getWcbhcSnapshot } from "@/lib/wcbhc-data-store";
import { extrasFromIndex, seatGc2p, GC2P_RATIO, GC2P_MIN_LEVEL } from "@/lib/wcbhc-gc2p";
import { getWcbhcRecords } from "@/lib/wcbhc-data-store";
import { getWcbhcTracking } from "@/lib/wcbhc-tracking";
import { formatCompactDollars, formatDollars, formatShare, MAX_GOAL, MIN_GOAL, type GiftChartRow } from "@/lib/gift-chart";
import { BrandFooter, bs, BRASS, CREAM, LINE, LOGO_ASPECT, LOGO_URL, NAVY, preparedOn, registerBrandFonts } from "@/lib/wcbhc-brand-pdf";
import { buildBrandedXlsx } from "@/lib/wcbhc-brand-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Two separate reports, matching Catapult's standing GC and GC2P tasks:
//   ?report=gc&goal=&format=pdf|docx     one-page Suggested Gift Chart (PDF + editable Word)
//   ?report=gc2p&goal=&format=pdf|xlsx   Gift Chart to Prospects (landscape PDF + Excel)
const SURFACE = "#F5F2EC";
const usd = (n: number) => formatDollars(Math.round(n));
const n0 = (n: number) => n.toLocaleString("en-US");
const fileDate = () => {
  const p = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "2-digit", timeZone: "America/Los_Angeles" }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value;
  return `${g("month")}.${g("day")}.${g("year")}`;
};
const TIER_LABEL: Record<string, string> = { leadership: "Top 10 gifts", major: "Major gifts", base: "Community gifts", many: "Broad base" };
const levelTxt = (r: GiftChartRow) => (r.level === null ? `<${formatDollars(r.under ?? 0)}` : formatDollars(r.level));

function TopBar({ right1, right2 }: { right1: string; right2: string }) {
  return (
    <View fixed>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Image src={LOGO_URL} style={{ height: 30, width: 30 * LOGO_ASPECT }} />
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 7, letterSpacing: 1.4, textTransform: "uppercase", opacity: 0.7 }}>{right1}</Text>
          <Text style={{ fontSize: 7, letterSpacing: 1.4, textTransform: "uppercase", opacity: 0.7, marginTop: 4 }}>{right2}</Text>
        </View>
      </View>
      <View style={{ height: 1.5, backgroundColor: BRASS, marginTop: 8, marginBottom: 14 }} />
    </View>
  );
}

export async function GET(req: NextRequest) {
  if (!(await isWcbhcDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const report = sp.get("report") === "gc2p" ? "gc2p" : "gc";
  const format = sp.get("format") ?? "pdf";
  const goal = Number(sp.get("goal"));
  if (!Number.isFinite(goal) || goal < MIN_GOAL || goal > MAX_GOAL) return NextResponse.json({ error: "bad goal" }, { status: 400 });
  const snap = await getWcbhcSnapshot();
  if (!snap) return NextResponse.json({ error: "no data" }, { status: 503 });
  const tracking = report === "gc2p" ? await getWcbhcTracking() : null;
  const recs = report === "gc2p" && tracking && Object.keys(tracking.prospects).length ? await getWcbhcRecords() : null;
  const { chart, seated, notShown, removed, below, belowLevel } = seatGc2p(goal, snap.pool, tracking, extrasFromIndex(recs?.index, tracking, snap.pool));
  const stOf = (id: number) => tracking?.prospects[String(id)];
  const lastAct = (id: number) => (tracking?.activity ?? []).filter((a) => a.cptid === id && a.kind !== "Committee update").sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at))[0];
  // Exact compact goal ($1.75M, not the shared helper's rounded $1.8M).
  const goalTxt = goal >= 1e6 ? `$${parseFloat((goal / 1e6).toFixed(2))}M` : formatCompactDollars(goal);
  const short = "WCBHC";
  registerBrandFonts();
  const { renderToBuffer } = await import("@react-pdf/renderer");

  const manyTxt = chart.manyValue > 0 ? `${n0(chart.totalGifts)} + many` : n0(chart.totalGifts);
  if (report === "gc") {
    const file = `${short} Gift Chart ${goalTxt} ${fileDate()}`;
    const named = chart.rows.filter((r) => r.gifts !== null);
    const lead = chart.tiers.find((t) => t.tier === "leadership");
    // Group rows by tier, each followed by its tier summary line (house GC layout).
    const groups: { tier: string; rows: GiftChartRow[] }[] = [];
    chart.rows.forEach((r) => {
      const g = groups[groups.length - 1];
      if (g && g.tier === r.tier) g.rows.push(r); else groups.push({ tier: r.tier, rows: [r] });
    });
    const tierLine = (tier: string) => {
      const t = chart.tiers.find((x) => x.tier === tier);
      if (!t) return "";
      const rows = chart.rows.filter((r) => r.tier === tier);
      const pros = rows.reduce((s, r) => s + (r.prospects ?? 0), 0);
      return tier === "many"
        ? `${formatShare(t.shareOfGoal)} of goal for ${usd(t.value)} from many gifts`
        : `${formatShare(t.shareOfGoal)} of goal from ${t.gifts} gifts at ${formatCompactDollars(t.value)} · ${pros} prospects at ${GC2P_RATIO}:1`;
    };
    const notes = [
      chart.manyValue > 0 ? `A total of ${n0(chart.totalGifts)} named gifts for ${usd(chart.namedTotal)}; the remaining ${usd(chart.manyValue)} comes from many gifts under ${formatDollars(chart.rows[chart.rows.length - 1].under ?? 0)}.` : `A total of ${n0(chart.totalGifts)} gifts for ${usd(chart.namedTotal)}, per the approved gift chart.`,
      `The top 10 gifts carry ${formatShare(chart.topTenShare)} of the goal. Leadership gifts account for ${formatShare(chart.leadershipShare)}.`,
      `Prospects needed are counted at ${GC2P_RATIO} qualified prospects for every gift.`,
      `Fundraising sources: Individuals, Foundations, Corporations, and Government.`,
    ];

    if (format === "docx") {
      const cellBorder = { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "D6CDBA" } };
      const widths = [1500, 2100, 1900, 1900, 2000];
      const cell = (t: string, i: number, o: { bold?: boolean; head?: boolean; fill?: string; serif?: boolean; span?: number } = {}) =>
        new TableCell({
          columnSpan: o.span, borders: cellBorder, width: { size: o.span ? 9400 : widths[i], type: WidthType.DXA },
          shading: o.head ? { type: ShadingType.CLEAR, color: "auto", fill: "0E1E31" } : o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [new Paragraph({ alignment: i >= 2 && !o.span ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: t, bold: o.bold || o.head, color: o.head ? "FFFFFF" : "0E1E31", font: o.serif ? "Georgia" : "Arial", size: o.head ? 15 : 19 })] })],
        });
      const rows: TableRow[] = [new TableRow({ tableHeader: true, children: ["GIFTS NEEDED", "GIFT LEVEL", "PROSPECTS NEEDED", "VALUE OF GIFTS", "CUMULATIVE TOTAL"].map((h, i) => cell(h, i, { head: true })) })];
      groups.forEach((g) => {
        g.rows.forEach((r) => rows.push(new TableRow({ children: [cell(r.gifts === null ? "Many" : n0(r.gifts), 0), cell(levelTxt(r), 1, { bold: true, serif: true }), cell(r.prospects === null ? "-" : n0(r.prospects), 2), cell(usd(r.value), 3), cell(usd(r.cumulative), 4)] })));
        rows.push(new TableRow({ children: [cell(`${TIER_LABEL[g.tier].toUpperCase()}    ${tierLine(g.tier)}`, 0, { span: 5, fill: "F5F2EC" })] }));
      });
      rows.push(new TableRow({ children: [cell(manyTxt, 0, { bold: true }), cell("Campaign goal", 1, { bold: true }), cell(n0(chart.totalProspects), 2, { bold: true }), cell(usd(goal), 3, { bold: true }), cell(usd(goal), 4, { bold: true })] }));
      const logo = Buffer.from(await (await fetch(LOGO_URL)).arrayBuffer());
      const p = (text: string, o: { size?: number; bold?: boolean; color?: string; font?: string; after?: number } = {}) =>
        new Paragraph({ spacing: { after: o.after ?? 120 }, children: [new TextRun({ text, size: o.size ?? 20, bold: o.bold, color: o.color ?? "0E1E31", font: o.font ?? "Arial" })] });
      const d = new DocxDocument({
        sections: [{
          properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
          children: [
            new Paragraph({ children: [new ImageRun({ type: "png", data: logo, transformation: { width: 180, height: Math.round(180 / LOGO_ASPECT) } })] }),
            p(`CAMPAIGN GIFT CHART · ${preparedOn().toUpperCase()}`, { size: 14, color: "6B7280", after: 240 }),
            p(`PREPARED FOR ${snap.client.toUpperCase()}`, { size: 15, bold: true, color: "B28C46" }),
            p(`${goalTxt} Campaign Gift Chart`, { size: 44, bold: true, font: "Georgia" }),
            p(`The gifts it takes to reach ${usd(goal)}, from leadership commitments through the broad base of community support.`, { after: 240 }),
            p(`${formatCompactDollars(chart.leadGift)} lead gift · ${formatShare(lead?.shareOfGoal ?? 0)} of goal from ${lead?.gifts ?? 0} leadership gifts · ${manyTxt} gifts needed · ${n0(chart.totalProspects)} prospects needed at ${GC2P_RATIO}:1`, { bold: true, after: 240 }),
            new Table({ width: { size: 9400, type: WidthType.DXA }, rows }),
            p("", { after: 120 }),
            p("NOTES", { size: 15, bold: true, color: "B28C46" }),
            ...notes.map((t) => p(`•  ${t}`, { size: 18 })),
            p(`${snap.client} · ${goalTxt} Gift Chart · Confidential planning document · Catapult Fundraising, Inc.`, { size: 14, color: "6B7280" }),
          ],
        }],
      });
      const buf = await Packer.toBuffer(d);
      return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="${file}.docx"` } });
    }

    const W = 612 - 72;
    const cw = [0.17, 0.2, 0.2, 0.2, 0.23].map((x) => x * W);
    const statBox = (v: string, l: string) => (
      <View style={{ width: (W - 18) / 4, backgroundColor: SURFACE, borderTopWidth: 2, borderTopColor: BRASS, padding: 9, minHeight: 58 }}>
        <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 16 }}>{v}</Text>
        <Text style={{ fontSize: 6.3, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4, opacity: 0.75 }}>{l}</Text>
      </View>
    );
    const doc = (
      <Document title={file} author="Catapult Fundraising">
        <Page size="LETTER" style={bs.page}>
          <TopBar right1="Campaign gift chart" right2={preparedOn()} />
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: BRASS, letterSpacing: 1.3, textTransform: "uppercase" }}>Prepared for {snap.client}</Text>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 24, marginTop: 4 }}>{goalTxt} Campaign Gift Chart</Text>
          <Text style={{ fontSize: 9, opacity: 0.75, marginTop: 5, lineHeight: 1.4 }}>The gifts it takes to reach {usd(goal)}, from leadership commitments through the broad base of community support.</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 12 }}>
            {statBox(formatCompactDollars(chart.leadGift), `Lead gift · ${formatShare(chart.leadGift / goal)} of goal`)}
            {statBox(formatShare(lead?.shareOfGoal ?? 0), `Of goal from ${lead?.gifts ?? 0} leadership gifts`)}
            {statBox(manyTxt, "Gifts needed")}
            {statBox(n0(chart.totalProspects), `Prospects needed at ${GC2P_RATIO}:1`)}
          </View>
          <View style={{ flexDirection: "row", backgroundColor: "#0E1E31" }}>
            {["Gifts needed", "Gift level", "Prospects needed", "Value of gifts", "Cumulative total"].map((h, i) => (
              <Text key={h} style={{ width: cw[i], color: "#FFF", fontSize: 6.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", padding: 6, textAlign: i >= 2 ? "right" : "left" }}>{h}</Text>
            ))}
          </View>
          {groups.map((g, gi) => (
            <View key={gi}>
              {g.rows.map((r, i) => {
                const many = r.gifts === null;
                return (
                  <View key={i} style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE, alignItems: "center" }}>
                    <Text style={{ width: cw[0], fontSize: 9, padding: 5, opacity: many ? 0.7 : 1 }}>{many ? "Many" : n0(r.gifts as number)}</Text>
                    <Text style={{ width: cw[1], fontSize: 10, padding: 5, fontFamily: "Fraunces", fontWeight: 700, opacity: many ? 0.7 : 1 }}>{levelTxt(r)}</Text>
                    <Text style={{ width: cw[2], fontSize: 9, padding: 5, textAlign: "right" }}>{many ? "-" : n0(r.prospects as number)}</Text>
                    <Text style={{ width: cw[3], fontSize: 9, padding: 5, textAlign: "right" }}>{usd(r.value)}</Text>
                    <Text style={{ width: cw[4], fontSize: 9, padding: 5, textAlign: "right", opacity: 0.7 }}>{usd(r.cumulative)}</Text>
                  </View>
                );
              })}
              <View style={{ flexDirection: "row", backgroundColor: SURFACE, borderBottomWidth: 0.6, borderBottomColor: LINE, padding: 5 }}>
                <Text style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>{TIER_LABEL[g.tier]}</Text>
                <Text style={{ fontSize: 7, opacity: 0.7, marginLeft: 10 }}>{tierLine(g.tier)}</Text>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", borderTopWidth: 1.5, borderTopColor: "#0E1E31" }}>
            {[manyTxt, "Campaign goal", n0(chart.totalProspects), usd(goal), usd(goal)].map((t, i) => (
              <Text key={i} style={{ width: cw[i], fontSize: 9.5, fontWeight: 700, padding: 6, textAlign: i >= 2 ? "right" : "left" }}>{t}</Text>
            ))}
          </View>
          <View style={{ borderLeftWidth: 2, borderLeftColor: BRASS, paddingLeft: 10, marginTop: 14 }} wrap={false}>
            <Text style={{ fontSize: 6.8, fontWeight: 700, color: BRASS, letterSpacing: 1.2, marginBottom: 4 }}>NOTES</Text>
            {notes.map((t, i) => <Text key={i} style={{ fontSize: 8, marginBottom: 3 }}>•  {t}</Text>)}
          </View>
          <BrandFooter />
        </Page>
      </Document>
    );
    void named;
    const buf = await renderToBuffer(doc);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file}.pdf"` } });
  }

  // ---------------- GC2P ----------------
  const file = `${short} Gift Chart to Prospects ${fileDate()}`;
  const shownValue = goal - notShown;
  const shownGifts = seated.reduce((s, x) => s + (x.row.gifts ?? 0), 0);
  const identified = seated.reduce((s, x) => s + x.people.length, 0);
  const needed = seated.reduce((s, x) => s + x.need, 0);
  const covered = seated.filter((x) => x.people.length >= x.need);
  const short2 = seated.filter((x) => x.people.length < x.need);
  const hiddenGifts = chart.rows.filter((r) => r.level !== null && r.level < GC2P_MIN_LEVEL).reduce((s, r) => s + (r.gifts ?? 0), 0);
  const totalAsk = seated.reduce((s, x) => s + x.people.reduce((a, p) => a + (p.ask || x.level), 0), 0);
  const committedAmt = seated.reduce((s, x) => s + x.people.reduce((a, p) => a + (p.committedAmt || 0), 0), 0);
  const minTxt = formatCompactDollars(GC2P_MIN_LEVEL);
  const levelAsk = (x: (typeof seated)[number]) => x.people.reduce((a, p) => a + (p.ask || x.level), 0);
  const capTxt = (p: (typeof seated)[number]["people"][number]) => p.capText || p.capacity || "Not screened";
  const histTxt = (p: (typeof seated)[number]["people"][number]) =>
    p.history ? p.history : p.lifetime > 0 ? `${usd(p.lifetime)} lifetime in ${n0(p.gifts)} gift${p.gifts === 1 ? "" : "s"}; largest ${usd(p.largest)}; last ${p.last || "n/a"}` : "-";
  const noteTxt = (p: (typeof seated)[number]["people"][number]) => {
    const a = lastAct(p.cptid);
    const basis = p.basis === "Committee" ? "Placed at this level by the committee." : "";
    const reason = stOf(p.cptid)?.reason;
    return [a ? `${a.date} ${a.kind}: ${a.note}` : reason || basis || p.note || "", tracking?.pirs[String(p.cptid)] ? "PIR on file." : ""].filter(Boolean).join(" ");
  };
  const askTxt = (p: (typeof seated)[number]["people"][number]) => stOf(p.cptid)?.status || p.status || "-";
  const idTxt = (id: number) => (id >= 900_000 ? "" : `CPTID ${id}`);
  const solOf = new Map(snap.pool.map((p) => [p.cptid, p.solicitor]));
  const solTxt = (id: number) => stOf(id)?.solicitor || solOf.get(id) || "Unassigned";
  const insights = [
    `${covered.length} of ${seated.length} levels have a full ${GC2P_RATIO}-to-1 prospect pool${covered.length ? ` (${covered.map((x) => formatCompactDollars(x.level)).join(", ")})` : ""}.`,
    short2.length ? `${short2.reduce((a, x) => a + x.need - x.people.length, 0)} more prospects are needed: ${short2.map((x) => `${formatCompactDollars(x.level)} short ${x.need - x.people.length}`).join("; ")}.` : "Every level shown is fully covered.",
    `${n0(identified)} prospects are seated across the ${seated.length} levels of the approved chart; ${usd(committedAmt)} is already received, pledged or verbally committed by seated donors.`,
    removed.committed + removed.disqualified > 0
      ? `Committee updates applied: ${removed.committed} committed and ${removed.disqualified} disqualified prospects are off the chart.`
      : `No committee updates entered yet; statuses and solicitors fill in as the committee updates the portal.`,
  ];
  const seatingNotes: [string, string][] = [
    ["Individuals:", " the low end of their wealth-screening capacity."],
    ["Foundations and corporations:", " published grant range or largest known gift, usually to the Nevada Cares Campus. Exceptions are explained in the notes."],
    ["New referrals:", " screened 9/21/26; seated one level below their capacity until they are cultivated."],
    ["Order:", " within a level, by readiness: received or committed, then active conversation, solicitor assigned, cultivation, and hold."],
    ["Solicitor codes:", " A = comfortable making the ask, B = secondary role, C = can make an introduction."],
  ];

  if (format === "xlsx") {
    const cols = [
      { label: "Gift Level", kind: "usd" as const }, { label: "Prospect" }, { label: "Type" }, { label: "Status" }, { label: "Committee Solicitor / Connection" },
      { label: "Wealth Rating" }, { label: "Capacity / Grant Range" }, { label: "Giving History" }, { label: "Received / Committed", kind: "usd" as const },
      { label: "Ask Amount", kind: "usd" as const }, { label: "Notes" },
    ];
    const buf = await buildBrandedXlsx({
      title: `Gift Chart to Prospects, ${goalTxt} Campaign`, subtitle: `${snap.client} · Prepared ${preparedOn()} · Confidential`, client: snap.client, cols,
      sections: [
        ...seated.map((x) => ({
          heading: `${formatDollars(x.level)} · ${x.row.gifts} gift${x.row.gifts === 1 ? "" : "s"} needed · ${x.people.length} identified / ${x.need} needed`,
          rows: x.people.map((p) => [x.level, p.name, p.donorType, askTxt(p), solTxt(p.cptid), p.wealth || p.ds || "", capTxt(p), histTxt(p), p.committedAmt || null, x.level, noteTxt(p)] as (string | number | null)[]),
        })),
        {
          heading: `Below ${formatDollars(belowLevel)} · ${below.length} prospects · ${usd(below.reduce((a, p) => a + (p.ask || p.rating || 0), 0))}`,
          rows: below.map((p) => [p.ask || p.rating || 0, p.name, p.cptid, solTxt(p.cptid), p.ds, capTxt(p), p.lifetime, p.largest, p.last, p.ask || p.rating || 0, noteTxt(p)] as (string | number | null)[]),
        },
        {
          heading: "Pipeline totals",
          rows: [
            ...seated.map((x) => [x.level, `${x.people.length} prospects`, null, null, null, null, null, null, null, levelAsk(x), null] as (string | number | null)[]),
            [`Below ${formatDollars(belowLevel)}`, `${below.length} prospects`, null, null, null, null, null, null, null, below.reduce((a, p) => a + (p.ask || p.rating || 0), 0), null],
            ["Total pipeline", `${identified} prospects`, null, null, null, null, null, null, null, totalAsk, null],
          ],
        },
      ],
      notes: [
        `Gift levels shown: all ${shownGifts} named gifts for ${usd(shownValue)}. The remaining ${usd(notShown)} comes from many gifts under ${minTxt}.`,
        ...seatingNotes.map(([a, b]) => a + b),
        `Data as of ${snap.asOf}.`,
      ],
    });
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${file}.xlsx"` } });
  }

  const LW = 792 - 72;
  const sc = [34, 92, 70, 76, 52, 56, 40, 74];
  const stat = (big: string, small: string, l: string, sub: string, last = false) => (
    <View style={{ width: LW / 4, paddingVertical: 8, paddingRight: 10, paddingLeft: 10, borderRightWidth: last ? 0 : 0.6, borderRightColor: LINE }}>
      <Text><Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 20 }}>{big}</Text><Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 11, opacity: 0.6 }}>{small}</Text></Text>
      <Text style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4 }}>{l}</Text>
      <Text style={{ fontSize: 6.8, opacity: 0.65, marginTop: 2 }}>{sub}</Text>
    </View>
  );
  const pc = [0.2, 0.09, 0.13, 0.1, 0.12, 0.2, 0.16].map((x) => x * LW);
  const thS = { fontSize: 6.3, fontWeight: 700 as const, letterSpacing: 0.7, textTransform: "uppercase" as const, opacity: 0.75, padding: 4 };
  const doc = (
    <Document title={file} author="Catapult Fundraising">
      <Page size="LETTER" orientation="landscape" style={bs.page}>
        <TopBar right1={`Prepared for ${snap.client}`} right2={`${preparedOn()} · Confidential`} />
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: BRASS, letterSpacing: 1.3, textTransform: "uppercase" }}>{goalTxt} Campaign</Text>
        <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 22, marginTop: 3 }}>Gift Chart to Prospects</Text>
        <Text style={{ fontSize: 8.5, opacity: 0.8, marginTop: 5, lineHeight: 1.4, width: LW * 0.72 }}>
          Every level of the approved {goalTxt} gift chart (May 18, 2026), with the prospects the campaign committee and Catapult have seated at each level (data as of {snap.asOf}).
        </Text>
        <View style={{ flexDirection: "row", borderTopWidth: 0.6, borderBottomWidth: 0.6, borderColor: LINE, marginTop: 10, marginBottom: 12 }}>
          {stat(formatCompactDollars(shownValue), "", "Gift levels shown", `${shownGifts} named gifts · ${formatShare(shownValue / goal)} of the ${goalTxt} goal`)}
          {stat(n0(identified), ` / ${n0(needed)}`, "Prospects identified", `Against ${n0(needed)} needed at ${GC2P_RATIO} prospects per gift`)}
          {stat(String(covered.length), ` of ${seated.length}`, "Gift levels fully covered", covered.length ? `${formatCompactDollars(covered[0].level)} through ${formatCompactDollars(covered[covered.length - 1].level)}` : "None yet")}
          {stat(formatCompactDollars(committedAmt), "", "Received or committed", "Gifts, pledges and verbals from seated donors", true)}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: LW * 0.6 }}>
            <View style={{ flexDirection: "row", borderBottomWidth: 1.2, borderBottomColor: NAVY }}>
              {["Gifts", "Gift level", "Value", "Cumulative", "Needed", "Identified", "Short", "Coverage"].map((h, i) => (
                <Text key={h} style={[thS, { width: sc[i], textAlign: i >= 2 && i < 7 ? "right" : "left" }]}>{h}</Text>
              ))}
            </View>
            {seated.map((x) => {
              const shortN = Math.max(0, x.need - x.people.length);
              return (
                <View key={x.level} style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 0.6, borderBottomColor: LINE }}>
                  <Text style={{ width: sc[0], fontSize: 8.5, padding: 4, textAlign: "center" }}>{x.row.gifts}</Text>
                  <Text style={{ width: sc[1], fontSize: 9.5, padding: 4, fontFamily: "Fraunces", fontWeight: 700 }}>{formatDollars(x.level)}</Text>
                  <Text style={{ width: sc[2], fontSize: 8.5, padding: 4, textAlign: "right" }}>{usd(x.row.value)}</Text>
                  <Text style={{ width: sc[3], fontSize: 8.5, padding: 4, textAlign: "right" }}>{usd(x.row.cumulative)}</Text>
                  <Text style={{ width: sc[4], fontSize: 8.5, padding: 4, textAlign: "right" }}>{x.need}</Text>
                  <Text style={{ width: sc[5], fontSize: 8.5, padding: 4, textAlign: "right", fontWeight: 700 }}>{x.people.length}</Text>
                  <Text style={{ width: sc[6], fontSize: 8.5, padding: 4, textAlign: "right", fontWeight: 700, color: shortN ? "#A23B2A" : NAVY }}>{shortN || "-"}</Text>
                  <View style={{ width: sc[7] - 8, marginLeft: 6, height: 5, backgroundColor: "#E4E1DA", borderRadius: 2 }}>
                    <View style={{ width: (sc[7] - 8) * Math.min(1, x.people.length / x.need), height: 5, backgroundColor: BRASS, borderRadius: 2 }} />
                  </View>
                </View>
              );
            })}
            <View style={{ flexDirection: "row", backgroundColor: SURFACE, padding: 4 }}>
              <Text style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: 0.8 }}>NOT SHOWN</Text>
              <Text style={{ fontSize: 7, opacity: 0.7, marginLeft: 8 }}>Many gifts under {minTxt}: {hiddenGifts ? `${hiddenGifts} gifts, ` : ""} {usd(notShown)} ({formatShare(notShown / goal)} of goal)</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              {[String(shownGifts), `${minTxt}+`, usd(shownValue), "", String(needed), String(identified), String(short2.reduce((a, x) => a + x.need - x.people.length, 0)), ""].map((t, i) => (
                <Text key={i} style={{ width: sc[i], fontSize: 8.5, fontWeight: 700, padding: 4, textAlign: i === 0 ? "center" : i >= 2 && i < 7 ? "right" : "left" }}>{t}</Text>
              ))}
            </View>
          </View>
          <View style={{ width: LW * 0.36 }}>
            <View style={{ backgroundColor: SURFACE, padding: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 6.8, fontWeight: 700, color: BRASS, letterSpacing: 1.2, marginBottom: 5 }}>WHAT THE CHART TELLS US</Text>
              {insights.map((t, i) => <Text key={i} style={{ fontSize: 7.6, marginBottom: 4, lineHeight: 1.35 }}>•  {t}</Text>)}
            </View>
            <View style={{ backgroundColor: SURFACE, padding: 10 }}>
              <Text style={{ fontSize: 6.8, fontWeight: 700, color: BRASS, letterSpacing: 1.2, marginBottom: 5 }}>HOW PROSPECTS ARE SEATED</Text>
              {seatingNotes.map(([a, b], i) => <Text key={i} style={{ fontSize: 7.6, marginBottom: 4, lineHeight: 1.35 }}><Text style={{ fontWeight: 700 }}>{a}</Text>{b}</Text>)}
            </View>
          </View>
        </View>

        <View break>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 18 }}>Prospects by gift level</Text>
          <Text style={{ fontSize: 8, opacity: 0.7, marginTop: 3, marginBottom: 6 }}>Ordered by readiness within each level. Solicitors and notes reflect committee ratings and the latest committee updates.</Text>
        </View>
        {seated.map((x) => (
          <View key={x.level} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#0E1E31", paddingVertical: 6, paddingHorizontal: 8 }} wrap={false} minPresenceAhead={60}>
              <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 15, color: "#FFF", paddingRight: 8, borderRightWidth: 1.5, borderRightColor: BRASS }}>{formatDollars(x.level)}</Text>
              <Text style={{ fontSize: 7.5, color: "#FFF", opacity: 0.85, marginLeft: 8, flexGrow: 1 }}>{x.row.gifts} gift{x.row.gifts === 1 ? "" : "s"} needed  ·  {formatCompactDollars(x.row.value)}  ·  cumulative {formatCompactDollars(x.row.cumulative)}</Text>
              <Text style={{ fontSize: 7.5, color: "#FFF" }}>{x.people.length} identified / {x.need} needed · <Text style={{ color: BRASS }}>{x.people.length >= x.need ? "covered" : `short ${x.need - x.people.length}`}</Text></Text>
            </View>
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NAVY }} fixed={false}>
              {["Prospect", "Status", "Solicitor / connection", "Wealth rating", "Capacity / grant range", "Giving history", "Notes"].map((h, i) => (
                <Text key={h} style={[thS, { width: pc[i] }]}>{h}</Text>
              ))}
            </View>
            {x.people.map((p) => (
              <View key={p.cptid} style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE }} wrap={false}>
                <View style={{ width: pc[0], padding: 4 }}>
                  <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 8.5 }}>{p.name}</Text>
                  <Text style={{ fontSize: 6.2, color: BRASS, fontWeight: 700, marginTop: 1 }}>{[p.donorType, idTxt(p.cptid)].filter(Boolean).join(" · ")}</Text>
                </View>
                <View style={{ width: pc[1], padding: 4 }}>
                  <Text style={{ fontSize: 7.6, fontWeight: 700 }}>{askTxt(p)}</Text>
                </View>
                <Text style={{ width: pc[2], fontSize: 7.4, padding: 4 }}>{solTxt(p.cptid)}</Text>
                <Text style={{ width: pc[3], fontSize: 7.4, padding: 4, color: BRASS }}>{p.wealth || p.ds || "-"}</Text>
                <Text style={{ width: pc[4], fontSize: 7.4, padding: 4 }}>{capTxt(p)}</Text>
                <Text style={{ width: pc[5], fontSize: 7.4, padding: 4 }}>{histTxt(p)}</Text>
                <Text style={{ width: pc[6], fontSize: 7.4, padding: 4 }}>{noteTxt(p)}</Text>
              </View>
            ))}
            {x.people.length === 0 && <Text style={{ fontSize: 7.5, opacity: 0.6, padding: 4 }}>No prospects are seated at this level yet.</Text>}
          </View>
        ))}
        {below.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ backgroundColor: "#0E1E31", paddingVertical: 6, paddingHorizontal: 8 }} wrap={false} minPresenceAhead={40}>
              <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 13, color: "#FFF" }}>Below {formatDollars(belowLevel)} · {below.length} prospects · {usd(below.reduce((a, p) => a + (p.ask || p.rating || 0), 0))}</Text>
            </View>
            {below.map((p) => (
              <View key={p.cptid} style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE }} wrap={false}>
                <Text style={{ width: "45%", fontSize: 7.6, padding: 3, fontWeight: 700 }}>{p.name}</Text>
                <Text style={{ width: "15%", fontSize: 7.4, padding: 3 }}>CPTID {p.cptid}</Text>
                <Text style={{ width: "20%", fontSize: 7.4, padding: 3, textAlign: "right" }}>{usd(p.ask || p.rating || 0)}</Text>
                <Text style={{ width: "20%", fontSize: 7.4, padding: 3, textAlign: "right" }}>Lifetime {usd(p.lifetime)}</Text>
              </View>
            ))}
          </View>
        )}
        <View wrap={false} style={{ marginTop: 6 }}>
          <Text style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Pipeline totals</Text>
          {seated.map((x) => (
            <View key={x.level} style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE, width: 360 }}>
              <Text style={{ width: 120, fontSize: 8, padding: 3, fontWeight: 700 }}>{formatDollars(x.level)}</Text>
              <Text style={{ width: 110, fontSize: 8, padding: 3, textAlign: "right" }}>{x.people.length} prospects</Text>
              <Text style={{ width: 130, fontSize: 8, padding: 3, textAlign: "right" }}>{usd(levelAsk(x))}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE, width: 360 }}>
            <Text style={{ width: 120, fontSize: 8, padding: 3, fontWeight: 700 }}>Below {formatDollars(belowLevel)}</Text>
            <Text style={{ width: 110, fontSize: 8, padding: 3, textAlign: "right" }}>{below.length} prospects</Text>
            <Text style={{ width: 130, fontSize: 8, padding: 3, textAlign: "right" }}>{usd(below.reduce((a, p) => a + (p.ask || p.rating || 0), 0))}</Text>
          </View>
          <View style={{ flexDirection: "row", borderTopWidth: 1.2, borderTopColor: NAVY, width: 360 }}>
            <Text style={{ width: 120, fontSize: 8.5, padding: 3, fontWeight: 700 }}>Total pipeline</Text>
            <Text style={{ width: 110, fontSize: 8.5, padding: 3, textAlign: "right", fontWeight: 700 }}>{identified} prospects</Text>
            <Text style={{ width: 130, fontSize: 8.5, padding: 3, textAlign: "right", fontWeight: 700 }}>{usd(totalAsk)}</Text>
          </View>
        </View>
        <BrandFooter />
      </Page>
    </Document>
  );
  void CREAM;
  const buf = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file}.pdf"` } });
}
