import { NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import {
  buildGiftChart,
  formatCompactDollars,
  formatDollars,
  formatShare,
  MAX_GOAL,
  MIN_GOAL,
} from "@/lib/gift-chart";
import { FIRM_EMAIL, FIRM_PHONE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same brand assets (logo + fonts) the JAG weekly summary PDF registers, so
// every Catapult print piece uses one lockup and one pair of typefaces.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ffe08cd7-6dee-47f3-b390-61aecad692c2.png";
const LOGO_ASPECT = 9225 / 2342;

Font.register({
  family: "Fraunces",
  fonts: [
    {
      src: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/cc2d6b8f-0c3e-4698-9c68-b5d415be1099.ttf",
      fontWeight: 700,
    },
    {
      src: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/db212b4c-d637-4eff-8bba-60ffe9621fc2.ttf",
      fontStyle: "italic",
    },
  ],
});
Font.register({
  family: "Manrope",
  fonts: [
    {
      src: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/35abe087-db6f-4eaf-9cc4-71431c314986.ttf",
      fontWeight: 400,
    },
    {
      src: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ff98cee2-dc89-4bf9-a134-1308b5b6cbce.ttf",
      fontWeight: 700,
    },
  ],
});

const NAVY = "#15212E";
const BRASS = "#B28C46";
const LINE = "#D6CDBA";
const BAND = "#4A5A6B";

const PAGE_W = 612;
const PAGE_H = 792;
const PAD = 42;
const CONTENT_W = PAGE_W - PAD * 2;

const COLS = {
  gifts: CONTENT_W * 0.1,
  level: CONTENT_W * 0.15,
  value: CONTENT_W * 0.16,
  cumulative: CONTENT_W * 0.17,
  prospects: CONTENT_W * 0.12,
  tier: CONTENT_W * 0.3,
};

const styles = StyleSheet.create({
  page: {
    width: PAGE_W,
    height: PAGE_H,
    backgroundColor: "#FFFFFF",
    paddingTop: PAD,
    paddingBottom: 52,
    paddingLeft: PAD,
    paddingRight: PAD,
    fontFamily: "Manrope",
    color: NAVY,
  },
  logo: { height: 30, width: 30 * LOGO_ASPECT, objectFit: "contain" },
  rule: { height: 1.5, backgroundColor: BRASS, marginTop: 5, marginBottom: 12, borderRadius: 1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  title: { fontSize: 21, fontFamily: "Fraunces", fontWeight: 700, marginTop: 4, lineHeight: 1.15 },
  meta: { fontSize: 9, opacity: 0.65, marginTop: 5 },
  intro: { fontSize: 9.5, lineHeight: 1.45, marginTop: 10, opacity: 0.85 },
  sectionTitle: { fontSize: 12.5, fontFamily: "Fraunces", fontWeight: 700, marginTop: 16, marginBottom: 7 },
  statGrid: { flexDirection: "row", marginTop: 10 },
  statCard: {
    width: (CONTENT_W - 3 * 10) / 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  statValue: { fontSize: 16, fontFamily: "Fraunces", fontWeight: 700 },
  statLabel: { fontSize: 7, marginTop: 2, opacity: 0.65, textTransform: "uppercase", letterSpacing: 0.3 },
  tHeadRow: { flexDirection: "row", backgroundColor: BRASS },
  tRow: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: LINE },
  tRowAlt: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: LINE, backgroundColor: "#F1ECE0" },
  tTotalRow: { flexDirection: "row", borderTopWidth: 1.5, borderTopColor: NAVY, backgroundColor: "#F7F3EA" },
  tCellHead: { fontSize: 7.5, fontWeight: 700, color: NAVY, paddingVertical: 5, paddingHorizontal: 5 },
  tCell: { fontSize: 8, paddingVertical: 4.5, paddingHorizontal: 5 },
  tCellStrong: { fontSize: 8, fontWeight: 700, paddingVertical: 5.5, paddingHorizontal: 5 },
  tierNote: { fontSize: 7, color: BRASS, fontWeight: 700 },
  footnote: { fontSize: 7.5, opacity: 0.6, marginTop: 7, lineHeight: 1.4 },
  bandRow: { alignItems: "center", marginBottom: 1.5 },
  band: { backgroundColor: BAND, alignItems: "center", justifyContent: "center", paddingVertical: 2.5 },
  bandText: { fontSize: 7, fontWeight: 700, color: "#FFFFFF" },
  bandSub: { fontSize: 6, color: "#E8D9BC" },
  callout: {
    marginTop: 18,
    backgroundColor: NAVY,
    borderRadius: 6,
    padding: 14,
  },
  calloutTitle: { fontSize: 11.5, fontFamily: "Fraunces", fontWeight: 700, color: "#FFFFFF" },
  calloutBody: { fontSize: 8.5, color: "#FFFFFF", opacity: 0.85, lineHeight: 1.45, marginTop: 5 },
  calloutCta: { fontSize: 8.5, fontWeight: 700, color: BRASS, marginTop: 7 },
  footerWrap: {
    position: "absolute",
    bottom: 22,
    left: PAD,
    right: PAD,
  },
  // Diagonal SAMPLE mark. The chart is easy to screenshot and pass around as
  // if it were a finished piece of counsel, so every generated copy is marked
  // as a sample while the contact details stay readable in the footer.
  watermarkWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE_W,
    height: PAGE_H,
    alignItems: "center",
    justifyContent: "center",
  },
  watermark: {
    fontFamily: "Fraunces",
    fontWeight: 700,
    fontSize: 84,
    letterSpacing: 4,
    color: NAVY,
    opacity: 0.085,
    transform: "rotate(-32deg)",
  },
  watermarkSub: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: 2.5,
    color: NAVY,
    opacity: 0.12,
    marginTop: 6,
    transform: "rotate(-32deg)",
  },
  footerRule: { height: 0.75, backgroundColor: LINE, marginBottom: 6 },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, opacity: 0.7 },
  footerTag: { fontSize: 7.5, fontFamily: "Fraunces", fontStyle: "italic", color: BRASS },
});

function levelLabel(row: { level: number | null; under?: number }) {
  return row.level === null ? `Under ${formatDollars(row.under ?? 0)}` : formatDollars(row.level);
}

export async function GET(request: Request) {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get("goal"));
  if (!Number.isFinite(raw) || raw < MIN_GOAL || raw > MAX_GOAL) {
    return NextResponse.json(
      { error: `Provide a goal between ${formatDollars(MIN_GOAL)} and ${formatDollars(MAX_GOAL)}.` },
      { status: 400 },
    );
  }
  const org = (url.searchParams.get("org") || "").trim().slice(0, 80);
  const chart = buildGiftChart(raw);
  const preparedOn = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const stats = [
    { value: chart.totalGifts.toLocaleString("en-US"), label: "Named gifts needed" },
    { value: chart.totalProspects.toLocaleString("en-US"), label: "Prospects to identify" },
    { value: formatCompactDollars(chart.leadGift), label: "Lead gift" },
    { value: formatShare(chart.topTenShare), label: "Top ten gifts" },
  ];

  // Tier totals sit on the last row of each tier, the way the printed charts read.
  const tierNoteFor = new Map<number, string>();
  chart.tiers.forEach((tier) => {
    if (tier.tier === "many") return;
    let lastIndex = -1;
    chart.rows.forEach((row, index) => {
      if (row.tier === tier.tier) lastIndex = index;
    });
    if (lastIndex >= 0 && tier.gifts) {
      tierNoteFor.set(
        lastIndex,
        `${formatShare(tier.shareOfGoal)} of goal from ${tier.gifts} gifts at ${formatCompactDollars(tier.value)}`,
      );
    }
  });

  const maxGifts = Math.max(...chart.rows.map((r) => r.gifts ?? 0), 1);
  const bandWidth = (row: { gifts: number | null }) => {
    if (row.gifts === null) return CONTENT_W * 0.86;
    const min = CONTENT_W * 0.2;
    const span = CONTENT_W * 0.62;
    return min + span * Math.sqrt(row.gifts / maxGifts);
  };

  const doc = (
    <Document
      title={`Suggested Gift Chart for ${formatDollars(chart.goal)}`}
      author="Catapult Fundraising"
    >
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <View fixed>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Image src={LOGO_URL} style={styles.logo} />
            <Text style={{ fontSize: 8.5, opacity: 0.55 }}>Prepared by Catapult Fundraising</Text>
          </View>
          <View style={styles.rule} />
        </View>

        <Text style={styles.eyebrow}>Capital Campaign Planning Tool</Text>
        <Text style={styles.title}>Suggested Gift Chart for {formatDollars(chart.goal)}</Text>
        <Text style={styles.meta}>
          {org ? `Prepared for ${org} · ` : ""}
          {preparedOn}
        </Text>
        <Text style={styles.intro}>
          To raise {formatDollars(chart.goal)} you need roughly {chart.totalGifts.toLocaleString("en-US")} named
          gifts, about {chart.totalProspects.toLocaleString("en-US")} qualified prospects to produce them, and many
          smaller gifts to finish. The largest ten gifts carry {formatShare(chart.topTenShare)} of the goal, which
          is why campaigns are won or lost in the quiet phase.
        </Text>

        <View style={styles.statGrid} wrap={false}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>The chart</Text>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tCellHead, { width: COLS.gifts }]}>GIFTS</Text>
            <Text style={[styles.tCellHead, { width: COLS.level }]}>GIFT LEVEL</Text>
            <Text style={[styles.tCellHead, { width: COLS.value }]}>VALUE</Text>
            <Text style={[styles.tCellHead, { width: COLS.cumulative }]}>CUMULATIVE</Text>
            <Text style={[styles.tCellHead, { width: COLS.prospects }]}>PROSPECTS</Text>
            <Text style={[styles.tCellHead, { width: COLS.tier }]}>GIVING TIER TOTALS</Text>
          </View>
        </View>
        {chart.rows.map((row, index) => (
          <View
            key={`${row.level ?? "many"}-${index}`}
            style={index % 2 === 1 ? styles.tRowAlt : styles.tRow}
            wrap={false}
          >
            <Text style={[styles.tCell, { width: COLS.gifts, fontWeight: 700 }]}>
              {row.gifts === null ? "Many" : row.gifts.toLocaleString("en-US")}
            </Text>
            <Text style={[styles.tCell, { width: COLS.level }]}>{levelLabel(row)}</Text>
            <Text style={[styles.tCell, { width: COLS.value }]}>{formatDollars(row.value)}</Text>
            <Text style={[styles.tCell, { width: COLS.cumulative }]}>{formatDollars(row.cumulative)}</Text>
            <Text style={[styles.tCell, { width: COLS.prospects }]}>
              {row.prospects === null ? "—" : row.prospects.toLocaleString("en-US")}
            </Text>
            <Text style={[styles.tCell, styles.tierNote, { width: COLS.tier }]}>
              {row.tier === "many"
                ? `${formatShare(chart.manyValue / chart.goal)} of goal from many smaller gifts`
                : tierNoteFor.get(index) || ""}
            </Text>
          </View>
        ))}
        <View style={styles.tTotalRow} wrap={false}>
          <Text style={[styles.tCellStrong, { width: COLS.gifts }]}>
            {chart.totalGifts.toLocaleString("en-US")} +
          </Text>
          <Text style={[styles.tCellStrong, { width: COLS.level }]}>many</Text>
          <Text style={[styles.tCellStrong, { width: COLS.value }]}>{formatDollars(chart.goal)}</Text>
          <Text style={[styles.tCellStrong, { width: COLS.cumulative }]}>100% of goal</Text>
          <Text style={[styles.tCellStrong, { width: COLS.prospects }]}>
            {chart.totalProspects.toLocaleString("en-US")}
          </Text>
          <Text style={[styles.tCellStrong, styles.tierNote, { width: COLS.tier }]}>
            {chart.totalGifts.toLocaleString("en-US")} named gifts for {formatDollars(chart.namedTotal)}
          </Text>
        </View>
        <Text style={styles.footnote}>
          Gift levels are round numbers, so the named levels stop just short of the goal. The closing line of many
          smaller gifts carries the last {formatDollars(chart.manyValue)} and completes the campaign. Prospects are
          shown at three qualified prospects per gift, because not every prospect gives at the level or on the
          timeline you need.
        </Text>

        <View style={styles.callout} wrap={false}>
          <Text style={styles.calloutTitle}>What this chart can and cannot tell you</Text>
          <Text style={styles.calloutBody}>
            A calculated chart shows the shape a campaign this size has to take, and it is usually the moment a
            board realizes the top of the chart is the whole ballgame. What it cannot tell you is whether your
            donors can fill it. That answer comes from your own prospect data and from candid interviews with the
            people you are counting on, which is exactly what a feasibility study produces.
          </Text>
          <Text style={styles.calloutCta}>
            Talk it through with us: catapultfr.com/contact · {FIRM_PHONE} · {FIRM_EMAIL}
          </Text>
        </View>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>The same chart as a pyramid</Text>
          {chart.rows.map((row, index) => (
            <View key={`band-${index}`} style={styles.bandRow}>
              <View style={[styles.band, { width: bandWidth(row) }]}>
                <Text style={styles.bandText}>
                  {row.gifts === null
                    ? `Many gifts ${levelLabel(row).toLowerCase()}`
                    : `${row.gifts.toLocaleString("en-US")} ${row.gifts === 1 ? "gift" : "gifts"} at ${formatCompactDollars(row.level ?? 0)}`}
                </Text>
                <Text style={styles.bandSub}>
                  {formatCompactDollars(row.value)} · {formatShare(row.shareOfGoal)} of goal
                </Text>
              </View>
            </View>
          ))}
          <Text style={styles.footnote}>
            Each band is one gift level. The width shows how many gifts you need at that level, and the percentage
            shows how much of the goal that level carries.
          </Text>
        </View>

        <View style={styles.watermarkWrap} fixed>
          <Text style={styles.watermark}>SAMPLE</Text>
          <Text style={styles.watermarkSub}>ILLUSTRATIVE ONLY</Text>
        </View>

        <View style={styles.footerWrap} fixed>
          <View style={styles.footerRule} />
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              catapultfr.com · {FIRM_PHONE} · {FIRM_EMAIL}
            </Text>
            <Text style={styles.footerTag}>Growing your donor base at every stage of the giving journey</Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const slug = formatCompactDollars(chart.goal).replace(/[^0-9A-Za-z]/g, "");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Catapult_Gift_Chart_${slug}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
