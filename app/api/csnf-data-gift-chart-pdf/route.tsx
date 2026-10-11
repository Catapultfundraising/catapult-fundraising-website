import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { isResearchAuthed } from "@/lib/research-auth";
import { getCsnfSnapshot } from "@/lib/csnf-data-store";
import { seatGc2p, GC2P_RATIO } from "@/lib/csnf-gc2p";
import { formatCompactDollars, formatDollars, formatShare, MAX_GOAL, MIN_GOAL } from "@/lib/gift-chart";
import { BrandFooter, BrandHeader, bs, BRASS, LINE, NAVY, preparedOn, registerBrandFonts } from "@/lib/csnf-brand-pdf";
import { buildBrandedXlsx } from "@/lib/csnf-brand-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const usd = (n: number) => formatDollars(Math.round(n));

// One download with every section of the Gift Chart + GC2P tab:
// summary, gift chart, pyramid, GC2P coverage, and prospects seated by level.
// ?goal=10000000&format=pdf|xlsx
export async function GET(req: NextRequest) {
  if (!(await isResearchAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const goal = Number(req.nextUrl.searchParams.get("goal"));
  if (!Number.isFinite(goal) || goal < MIN_GOAL || goal > MAX_GOAL) return NextResponse.json({ error: "bad goal" }, { status: 400 });
  const snap = await getCsnfSnapshot();
  if (!snap) return NextResponse.json({ error: "no data" }, { status: 503 });
  const { chart, seated, notShown } = seatGc2p(goal, snap.pool);
  const goalTxt = formatCompactDollars(goal);
  const identified = seated.reduce((s, x) => s + x.people.length, 0);
  const needed = seated.reduce((s, x) => s + x.need, 0);
  const file = `CSNF Gift Chart and GC2P ${goalTxt.replace(/[^0-9A-Za-z.]/g, "")} ${new Date().toISOString().slice(0, 10)}`;
  const rulesNote = `GC2P house rules: levels of $50,000 and up only, ${GC2P_RATIO} prospects per gift. Individuals are rated at the low end of their DonorSearch wealth-based capacity; records not screened are rated at their largest gift. When a level has more candidates than it needs, the strongest giving history is seated and the rest move down a level. Committed gifts and solicitor assignments are not in this data yet; review before sharing with the client. Source: CSNF database, data as of ${snap.asOf}.`;

  if (req.nextUrl.searchParams.get("format") === "xlsx") {
    const cols = [
      { label: "Gift Level", kind: "usd" as const }, { label: "Prospect" }, { label: "CPTID" }, { label: "Rated At", kind: "usd" as const },
      { label: "Basis" }, { label: "DS Rating" }, { label: "Capacity" }, { label: "Lifetime", kind: "usd" as const },
      { label: "Largest Gift", kind: "usd" as const }, { label: "Last Gift" },
    ];
    const buf = await buildBrandedXlsx({
      title: `Gift Chart to Prospects, ${formatDollars(goal)} Goal`, subtitle: `${snap.client} · Prepared ${preparedOn()}`, client: snap.client, cols,
      sections: [
        { heading: "Gift chart", rows: chart.rows.map((r) => [r.level ?? `Under ${formatDollars(r.under ?? 0)}`, `${r.gifts ?? "Many"} gift(s)`, "", r.value, `${formatShare(r.shareOfGoal)} of goal`, "", r.prospects ? `${r.prospects} prospects needed` : "", r.cumulative, "", ""]) },
        ...seated.map((x) => ({
          heading: `${formatDollars(x.level)} level · ${x.row.gifts} gift${x.row.gifts === 1 ? "" : "s"} · ${x.people.length} of ${x.need} prospects identified`,
          rows: x.people.map((p) => [x.level, p.name, p.cptid, p.rating, p.basis, p.ds, p.capacity, p.lifetime, p.largest, p.last]),
        })),
      ],
      notes: [rulesNote, `Not shown: ${usd(notShown)} in gift levels under $50,000.`],
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${file}.xlsx"` },
    });
  }

  registerBrandFonts();
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const W = 612 - 72;
  const chartCols = [0.1, 0.16, 0.17, 0.17, 0.12, 0.28].map((x) => x * W);
  const maxGifts = Math.max(...chart.rows.map((r) => r.gifts ?? 0), 1);
  const bandW = (g: number | null) => (g === null ? W * 0.86 : W * 0.2 + W * 0.62 * Math.sqrt(g / maxGifts));
  const pCols = [0.3, 0.13, 0.17, 0.08, 0.12, 0.1, 0.1].map((x) => x * W);
  const stat = (v: string, l: string) => (
    <View style={{ width: (W - 30) / 4, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 7 }}>
      <Text style={{ fontSize: 15, fontFamily: "Fraunces", fontWeight: 700 }}>{v}</Text>
      <Text style={{ fontSize: 6.5, opacity: 0.65, textTransform: "uppercase", marginTop: 2 }}>{l}</Text>
    </View>
  );
  const doc = (
    <Document title={`CSNF Gift Chart and GC2P ${goalTxt}`} author="Catapult Fundraising">
      <Page size="LETTER" style={bs.page}>
        <BrandHeader client={snap.client} />
        <Text style={bs.eyebrow}>Capital Campaign Planning</Text>
        <Text style={bs.title}>Suggested Gift Chart and Gift Chart to Prospects</Text>
        <Text style={bs.meta}>{snap.client} · {formatDollars(goal)} goal · Prepared {preparedOn()}</Text>
        <Text style={bs.intro}>
          To raise {formatDollars(goal)} the campaign needs about {chart.totalGifts.toLocaleString("en-US")} named gifts and{" "}
          {chart.totalProspects.toLocaleString("en-US")} qualified prospects. The top ten gifts carry {formatShare(chart.topTenShare)} of the goal.
          The current CSNF file seats {identified.toLocaleString("en-US")} of the {needed.toLocaleString("en-US")} prospects needed at the $50,000-and-up levels.
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }} wrap={false}>
          {stat(chart.totalGifts.toLocaleString("en-US"), "Named gifts needed")}
          {stat(formatCompactDollars(chart.leadGift), "Lead gift")}
          {stat(`${identified} of ${needed}`, "GC2P prospects seated")}
          {stat(formatShare(chart.topTenShare), "Top ten gifts")}
        </View>

        <Text style={bs.section}>1. The gift chart</Text>
        <View style={bs.thead}>
          {["Gifts", "Gift level", "Value", "Cumulative", "Prospects", "% of goal"].map((h, i) => (
            <Text key={h} style={[bs.th, { width: chartCols[i] }]}>{h}</Text>
          ))}
        </View>
        {chart.rows.map((r, i) => (
          <View key={i} style={i % 2 ? bs.trAlt : bs.tr} wrap={false}>
            <Text style={[bs.td, { width: chartCols[0], fontWeight: 700 }]}>{r.gifts === null ? "Many" : r.gifts.toLocaleString("en-US")}</Text>
            <Text style={[bs.td, { width: chartCols[1] }]}>{r.level === null ? `Under ${formatDollars(r.under ?? 0)}` : formatDollars(r.level)}</Text>
            <Text style={[bs.td, { width: chartCols[2] }]}>{formatDollars(r.value)}</Text>
            <Text style={[bs.td, { width: chartCols[3] }]}>{formatDollars(r.cumulative)}</Text>
            <Text style={[bs.td, { width: chartCols[4] }]}>{r.prospects === null ? "-" : r.prospects.toLocaleString("en-US")}</Text>
            <Text style={[bs.td, { width: chartCols[5], color: BRASS, fontWeight: 700 }]}>{formatShare(r.shareOfGoal)}</Text>
          </View>
        ))}

        <View wrap={false}>
          <Text style={bs.section}>2. The chart as a pyramid</Text>
          {chart.rows.map((r, i) => (
            <View key={i} style={{ alignItems: "center", marginBottom: 1.5 }}>
              <View style={{ width: bandW(r.gifts), backgroundColor: i < 3 ? NAVY : "#4A5A6B", alignItems: "center", paddingVertical: 2.5 }}>
                <Text style={{ fontSize: 7, fontWeight: 700, color: "#FFFFFF" }}>
                  {r.gifts === null ? `Many gifts under ${formatCompactDollars(r.under ?? 0)}` : `${r.gifts} ${r.gifts === 1 ? "gift" : "gifts"} at ${formatCompactDollars(r.level ?? 0)}`} · {formatShare(r.shareOfGoal)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View break>
          <Text style={bs.section}>3. Gift chart to prospects: coverage</Text>
          {seated.map((x) => (
            <View key={x.level} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }} wrap={false}>
              <Text style={{ width: 70, fontSize: 8, fontWeight: 700 }}>{formatDollars(x.level)}</Text>
              <View style={{ width: W - 200, height: 9, backgroundColor: "#F1ECE0" }}>
                <View style={{ width: (W - 200) * Math.min(1, x.people.length / x.need), height: 9, backgroundColor: x.people.length >= x.need ? NAVY : BRASS }} />
              </View>
              <Text style={{ width: 130, fontSize: 8, textAlign: "right" }}>{x.people.length} of {x.need} identified</Text>
            </View>
          ))}
          <Text style={bs.footnote}>Not shown: {usd(notShown)} in gift levels under $50,000. {rulesNote}</Text>
        </View>

        <Text style={bs.section}>4. Prospects by gift level</Text>
        {seated.map((x) => (
          <View key={x.level}>
            <View style={bs.band} wrap={false} minPresenceAhead={40}>
              <Text style={bs.bandText}>
                {formatDollars(x.level)} level · {x.row.gifts} gift{x.row.gifts === 1 ? "" : "s"} · {x.people.length} of {x.need} prospects identified
              </Text>
            </View>
            {x.people.length > 0 && (
              <View style={bs.thead} wrap={false}>
                {["Prospect", "Rated at", "Basis", "DS", "Lifetime", "Largest", "Last gift"].map((h, i) => (
                  <Text key={h} style={[bs.th, { width: pCols[i] }]}>{h}</Text>
                ))}
              </View>
            )}
            {x.people.map((p, i) => (
              <View key={p.cptid} style={i % 2 ? bs.trAlt : bs.tr} wrap={false}>
                <Text style={[bs.td, { width: pCols[0], fontWeight: 700 }]}>{p.name}</Text>
                <Text style={[bs.td, { width: pCols[1] }]}>{usd(p.rating)}</Text>
                <Text style={[bs.td, { width: pCols[2] }]}>{p.basis.startsWith("Capacity") ? "DS capacity" : "Largest gift"}</Text>
                <Text style={[bs.td, { width: pCols[3] }]}>{p.ds}</Text>
                <Text style={[bs.td, { width: pCols[4] }]}>{usd(p.lifetime)}</Text>
                <Text style={[bs.td, { width: pCols[5] }]}>{usd(p.largest)}</Text>
                <Text style={[bs.td, { width: pCols[6] }]}>{p.last}</Text>
              </View>
            ))}
            {x.people.length === 0 && <Text style={[bs.footnote, { marginTop: 3 }]}>No prospects in the current file are rated at this level yet.</Text>}
          </View>
        ))}
        <BrandFooter />
      </Page>
    </Document>
  );
  const buf = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file}.pdf"` },
  });
}
