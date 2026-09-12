import { NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { formatCompactDollars, formatDollars, MAX_GOAL, MIN_GOAL } from "@/lib/gift-chart";
import { buildReadinessReport, decodeAnswers } from "@/lib/campaign-readiness";
import { FIRM_EMAIL, FIRM_PHONE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same brand assets (logo + fonts) as the gift chart and JAG summary PDFs, so
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
  gradeRow: { flexDirection: "row", marginTop: 12, alignItems: "stretch" },
  gradeCard: {
    width: CONTENT_W * 0.3,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeLetter: { fontSize: 46, fontFamily: "Fraunces", fontWeight: 700, lineHeight: 1 },
  gradeScore: { fontSize: 8.5, marginTop: 4, opacity: 0.65 },
  verdictCard: {
    flex: 1,
    backgroundColor: "#F7F3EA",
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  verdictLabel: { fontSize: 13, fontFamily: "Fraunces", fontWeight: 700 },
  verdictBody: { fontSize: 8.5, lineHeight: 1.45, marginTop: 5, opacity: 0.85 },
  goalNote: { fontSize: 8.5, lineHeight: 1.5, marginTop: 10, opacity: 0.85 },
  areaRow: { marginBottom: 10 },
  areaHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  areaLabel: { fontSize: 9.5, fontWeight: 700, width: CONTENT_W * 0.62 },
  areaGrade: { fontSize: 9.5, fontFamily: "Fraunces", fontWeight: 700 },
  areaMeta: { fontSize: 7.5, opacity: 0.6 },
  barTrack: { height: 5, backgroundColor: "#EDE7DA", borderRadius: 3, marginTop: 4 },
  barFill: { height: 5, backgroundColor: BRASS, borderRadius: 3 },
  areaFix: { fontSize: 8, lineHeight: 1.4, marginTop: 4, opacity: 0.75 },
  riskCard: { marginTop: 14, backgroundColor: NAVY, borderRadius: 6, padding: 14 },
  riskEyebrow: {
    fontSize: 8,
    fontWeight: 700,
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  riskTitle: { fontSize: 12.5, fontFamily: "Fraunces", fontWeight: 700, color: "#FFFFFF", marginTop: 4 },
  riskBody: { fontSize: 8.5, color: "#FFFFFF", opacity: 0.85, lineHeight: 1.45, marginTop: 5 },
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
  footnote: { fontSize: 7.5, opacity: 0.6, marginTop: 8, lineHeight: 1.4 },
  footerWrap: { position: "absolute", bottom: 22, left: PAD, right: PAD },
  footerRule: { height: 0.75, backgroundColor: LINE, marginBottom: 6 },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, opacity: 0.7 },
  footerTag: { fontSize: 7.5, fontFamily: "Fraunces", fontStyle: "italic", color: BRASS },
});

export async function GET(request: Request) {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const url = new URL(request.url);
  const goal = Number(url.searchParams.get("goal"));
  if (!Number.isFinite(goal) || goal < MIN_GOAL || goal > MAX_GOAL) {
    return NextResponse.json(
      { error: `Provide a goal between ${formatDollars(MIN_GOAL)} and ${formatDollars(MAX_GOAL)}.` },
      { status: 400 },
    );
  }

  const encoded = (url.searchParams.get("a") || "").slice(0, 40);
  const largestGift = Math.max(Number(url.searchParams.get("lg")) || 0, 0);
  const prospectCount = Math.max(Number(url.searchParams.get("pc")) || 0, 0);
  const org = (url.searchParams.get("org") || "").trim().slice(0, 80);

  const report = buildReadinessReport({
    goal,
    org,
    answers: decodeAnswers(encoded, largestGift, prospectCount),
  });

  const preparedOn = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const doc = (
    <Document
      title={`Campaign Readiness Report Card${org ? ` for ${org}` : ""}`}
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

        <Text style={styles.eyebrow}>Capital Campaign Planning Tool</Text>
        <Text style={styles.title}>Campaign Readiness Report Card</Text>
        <Text style={styles.meta}>
          {org ? `Prepared for ${org} · ` : ""}
          {formatDollars(report.goal)} goal · {preparedOn}
        </Text>
        <Text style={styles.intro}>
          This report card grades seven areas that decide whether a campaign of this size can be run
          successfully. Two of them are graded against your own goal rather than a generic checklist:
          the largest gift you have ever received against the lead gift this goal requires, and your
          prospect list against the prospects the chart needs.
        </Text>

        <View style={styles.gradeRow} wrap={false}>
          <View style={styles.gradeCard}>
            <Text style={styles.gradeLetter}>{report.grade}</Text>
            <Text style={styles.gradeScore}>{report.score} out of 100</Text>
          </View>
          <View style={styles.verdictCard}>
            <Text style={styles.verdictLabel}>{report.verdict.label}</Text>
            <Text style={styles.verdictBody}>{report.verdict.summary}</Text>
          </View>
        </View>

        <Text style={styles.goalNote}>
          {report.leadGiftNote} {report.prospectNote}
        </Text>

        <Text style={styles.sectionTitle}>Grades by area</Text>
        {report.areas.map((result) => (
          <View key={result.area.id} style={styles.areaRow} wrap={false}>
            <View style={styles.areaHead}>
              <Text style={styles.areaLabel}>{result.area.label}</Text>
              <Text style={styles.areaGrade}>
                {result.grade}{" "}
                <Text style={styles.areaMeta}>
                  {result.score}/100 · {Math.round(result.area.weight * 100)}% of the grade
                </Text>
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(result.score, 2)}%` }]} />
            </View>
            {result.weakest && <Text style={styles.areaFix}>{result.weakest.fix}</Text>}
          </View>
        ))}

        <View style={styles.riskCard} wrap={false}>
          <Text style={styles.riskEyebrow}>Biggest risk</Text>
          <Text style={styles.riskTitle}>{report.biggestRisk.area.label}</Text>
          <Text style={styles.riskBody}>{report.biggestRisk.area.risk}</Text>
        </View>

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
          <Text style={styles.calloutTitle}>What a report card can and cannot tell you</Text>
          <Text style={styles.calloutBody}>
            A report card is a starting point for a conversation, not a verdict. It grades what you
            told us about today, and it is deliberately blunt about the top of the chart, because that
            is where campaigns are won or lost. What it cannot do is talk to your donors.{" "}
            {report.verdict.nextStep}
          </Text>
          <Text style={styles.calloutCta}>
            Talk it through with us: catapultfr.com/contact · {FIRM_PHONE} · {FIRM_EMAIL}
          </Text>
        </View>

        <Text style={styles.footnote}>
          Grades are weighted: board and leadership commitment and prospect depth carry 20 percent
          each, the case for support and major gift experience 15 percent each, and data, annual fund
          health, and planning 10 percent each. Your goal of {formatDollars(report.goal)} implies a
          lead gift near {formatCompactDollars(report.leadGift)} and roughly{" "}
          {report.prospectsNeeded.toLocaleString("en-US")} qualified prospects at three per gift.
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
  const slug = formatCompactDollars(report.goal).replace(/[^0-9A-Za-z]/g, "");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Catapult_Campaign_Readiness_${slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
