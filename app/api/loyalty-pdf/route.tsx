import { NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { LEGACY_RANGE_NOTE, buildLoyaltyReport, decodeAnswers, type TrackResult } from "@/lib/donor-loyalty";
import { FIRM_EMAIL, FIRM_PHONE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same brand assets (logo + fonts) as the other Catapult PDFs.
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

const PAGE_W = 612;
const PAGE_H = 792;
const PAD = 42;
const CONTENT_W = PAGE_W - PAD * 2;

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
  sectionTitle: {
    fontSize: 12.5,
    fontFamily: "Fraunces",
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 7,
  },
  recCard: { marginTop: 12, backgroundColor: NAVY, borderRadius: 6, padding: 14 },
  recEyebrow: {
    fontSize: 8,
    fontWeight: 700,
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  recTitle: { fontSize: 13.5, fontFamily: "Fraunces", fontWeight: 700, color: "#FFFFFF", marginTop: 4 },
  recBody: { fontSize: 8.5, color: "#FFFFFF", opacity: 0.85, lineHeight: 1.45, marginTop: 6 },
  gradeRow: { flexDirection: "row", marginTop: 12 },
  gradeCard: {
    width: (CONTENT_W - 12) / 2,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  gradeCardLast: {
    width: (CONTENT_W - 12) / 2,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  gradeTrack: { fontSize: 8, fontWeight: 700, color: BRASS, textTransform: "uppercase", letterSpacing: 0.8 },
  gradeLetter: { fontSize: 34, fontFamily: "Fraunces", fontWeight: 700, lineHeight: 1, marginTop: 4 },
  gradeScore: { fontSize: 8.5, marginTop: 3, opacity: 0.65 },
  projectionCard: {
    marginTop: 14,
    backgroundColor: "#F7F3EA",
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  projectionTitle: { fontSize: 12.5, fontFamily: "Fraunces", fontWeight: 700 },
  projectionBody: { fontSize: 8.5, lineHeight: 1.45, marginTop: 6, opacity: 0.85 },
  bulletRow: { flexDirection: "row", marginTop: 5 },
  bulletDot: { fontSize: 8.5, color: BRASS, width: 10 },
  bulletText: { fontSize: 8.5, lineHeight: 1.45, flex: 1, opacity: 0.85 },
  areaRow: { marginBottom: 9 },
  areaHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  areaLabel: { fontSize: 9.5, fontWeight: 700, width: CONTENT_W * 0.66 },
  areaGrade: { fontSize: 9.5, fontFamily: "Fraunces", fontWeight: 700 },
  areaMeta: { fontSize: 7.5, opacity: 0.6 },
  barTrack: { height: 5, backgroundColor: "#EDE7DA", borderRadius: 3, marginTop: 4 },
  barFill: { height: 5, backgroundColor: BRASS, borderRadius: 3 },
  areaFix: { fontSize: 8, lineHeight: 1.4, marginTop: 4, opacity: 0.75 },
  gapNote: { fontSize: 8, lineHeight: 1.4, marginTop: 2, opacity: 0.8 },
  stepRow: { flexDirection: "row", marginTop: 8 },
  stepNumber: { fontSize: 14, fontFamily: "Fraunces", fontWeight: 700, color: BRASS, width: 18 },
  stepArea: {
    fontSize: 7.5,
    fontWeight: 700,
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  stepBody: { fontSize: 8.5, lineHeight: 1.45, marginTop: 2 },
  stepText: { flex: 1 },
  callout: { marginTop: 16, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 14 },
  calloutTitle: { fontSize: 11.5, fontFamily: "Fraunces", fontWeight: 700 },
  calloutBody: { fontSize: 8.5, lineHeight: 1.45, marginTop: 5, opacity: 0.85 },
  calloutCta: { fontSize: 8.5, fontWeight: 700, color: BRASS, marginTop: 7 },
  footnote: { fontSize: 7.5, opacity: 0.6, marginTop: 10, lineHeight: 1.4 },
  footerWrap: { position: "absolute", bottom: 22, left: PAD, right: PAD },
  footerRule: { height: 0.75, backgroundColor: LINE, marginBottom: 6 },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, opacity: 0.7 },
  footerTag: { fontSize: 7.5, fontFamily: "Fraunces", fontStyle: "italic", color: BRASS },
});

function TrackSection({ track }: { track: TrackResult }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{track.label}</Text>
      {track.areas.map((result) => (
        <View key={result.area.id} style={styles.areaRow} wrap={false}>
          <View style={styles.areaHead}>
            <Text style={styles.areaLabel}>{result.area.label}</Text>
            <Text style={styles.areaGrade}>
              {result.grade} <Text style={styles.areaMeta}>{result.score}/100</Text>
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(result.score, 2)}%` }]} />
          </View>
          {result.weakest && <Text style={styles.areaFix}>{result.weakest.fix}</Text>}
        </View>
      ))}
      <Text style={styles.gapNote}>
        Biggest gap: {track.biggestGap.area.label}. {track.biggestGap.area.risk}
      </Text>
    </View>
  );
}

export async function GET(request: Request) {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const url = new URL(request.url);

  const totalDonors = Math.max(Number(url.searchParams.get("donors")) || 0, 0);
  if (!totalDonors) {
    return NextResponse.json({ error: "Provide an active donor count." }, { status: 400 });
  }

  const encoded = (url.searchParams.get("a") || "").slice(0, 40);
  const loyalCount = Math.max(Number(url.searchParams.get("lc")) || 0, 0);
  const midCount = Math.max(Number(url.searchParams.get("mc")) || 0, 0);
  const org = (url.searchParams.get("org") || "").trim().slice(0, 80);

  const report = buildLoyaltyReport({
    org,
    totalDonors,
    answers: decodeAnswers(encoded, loyalCount, midCount),
  });

  const preparedOn = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const doc = (
    <Document
      title={`Donor Loyalty and Legacy Report Card${org ? ` for ${org}` : ""}`}
      author="Catapult Fundraising"
    >
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <View fixed>
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <Image src={LOGO_URL} style={styles.logo} />
            <Text style={{ fontSize: 8.5, opacity: 0.55 }}>Prepared by Catapult Fundraising</Text>
          </View>
          <View style={styles.rule} />
        </View>

        <Text style={styles.eyebrow}>Donor Discovery Tool</Text>
        <Text style={styles.title}>Donor Loyalty and Legacy Report Card</Text>
        <Text style={styles.meta}>
          {org ? `Prepared for ${org} · ` : ""}
          {report.totalDonors.toLocaleString("en-US")} active donors · {preparedOn}
        </Text>
        <Text style={styles.intro}>
          This report card looks at two groups of donors who are usually invisible in fundraising
          reports: the small-dollar donors who have given faithfully for a decade or more, and the
          $250 to $4,999 donors nobody has been assigned to. They are graded separately because they
          call for two different programs.
        </Text>

        <View style={styles.recCard} wrap={false}>
          <Text style={styles.recEyebrow}>Our recommendation</Text>
          <Text style={styles.recTitle}>{report.recommendation.headline}</Text>
          <Text style={styles.recBody}>{report.recommendation.body}</Text>
          <Text style={styles.recBody}>{report.recommendation.second}</Text>
        </View>

        <View style={styles.gradeRow} wrap={false}>
          <View style={styles.gradeCard}>
            <Text style={styles.gradeTrack}>Legacy readiness</Text>
            <Text style={styles.gradeLetter}>{report.legacy.grade}</Text>
            <Text style={styles.gradeScore}>{report.legacy.score} out of 100</Text>
          </View>
          <View style={styles.gradeCardLast}>
            <Text style={styles.gradeTrack}>Mid-level readiness</Text>
            <Text style={styles.gradeLetter}>{report.midlevel.grade}</Text>
            <Text style={styles.gradeScore}>{report.midlevel.score} out of 100</Text>
          </View>
        </View>

        <View style={styles.projectionCard} wrap={false}>
          <Text style={styles.projectionTitle}>{report.projection.headline}</Text>
          <Text style={styles.projectionBody}>{report.projection.detail}</Text>
          <Text style={styles.projectionBody}>{LEGACY_RANGE_NOTE}</Text>
          <Text style={styles.projectionBody}>
            These are not prospects who are already on your radar. They are not in a major gift
            portfolio, nobody is calling them, and their gift sizes have kept them out of every report
            leadership looks at. Bringing them into a real relationship also raises annual giving:
            donors who document a planned gift give more each year, and they keep giving longer.
          </Text>
        </View>

        <TrackSection track={report.legacy} />

        <Text style={styles.sectionTitle}>What your mid-level band looks like</Text>
        {report.midFindings.map((finding) => (
          <View key={finding} style={styles.bulletRow} wrap={false}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{finding}</Text>
          </View>
        ))}

        <TrackSection track={report.midlevel} />

        {report.nextSteps.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Do these three things next</Text>
            {report.nextSteps.map((step, index) => (
              <View key={step.area} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <View style={styles.stepText}>
                  <Text style={styles.stepArea}>{step.area}</Text>
                  <Text style={styles.stepBody}>{step.action}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.callout} wrap={false}>
          <Text style={styles.calloutTitle}>What this report card can and cannot tell you</Text>
          <Text style={styles.calloutBody}>
            A report card is a starting point for a conversation, not a verdict. The legacy figure is
            an average drawn from Catapult programs, applied to the estimate you gave us, and your own
            results depend on your donors. We deliberately do not put a dollar projection on mid-level
            potential from a questionnaire, because that number comes out of your actual file: your
            band mix, your lapsed volume and your data quality.
          </Text>
          <Text style={styles.calloutCta}>
            Talk it through with us: catapultfr.com/contact · {FIRM_PHONE} · {FIRM_EMAIL}
          </Text>
        </View>

        <Text style={styles.footnote}>
          Based on your estimates of {report.loyalCount.toLocaleString("en-US")} donors at ten or more
          consecutive years and {report.midCount.toLocaleString("en-US")} donors giving $250 to $4,999,
          within an active file of {report.totalDonors.toLocaleString("en-US")}. Estimates are
          expected, and refining them is part of the conversation.
        </Text>

        <View style={styles.footerWrap} fixed>
          <View style={styles.footerRule} />
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              catapultfr.com · {FIRM_PHONE} · {FIRM_EMAIL}
            </Text>
            <Text style={styles.footerTag}>
              Growing your donor base at every stage of the giving journey
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Catapult_Donor_Loyalty_Report_Card.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
