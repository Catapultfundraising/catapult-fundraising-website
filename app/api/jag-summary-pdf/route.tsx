import { NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { getJagDashboardData, pickRandomQuotes } from "@/lib/jag-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reuses the exact brand assets (logo + fonts) already registered for the
// printable business card, so this PDF looks and feels identical to every
// other Catapult-branded print piece — same lockup, same typefaces.
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
const PAPER = "#FFFFFF"; // print deliverable uses a plain white page, per client request
const LINE = "#D6CDBA";

const CLIENT_NAME = "JAG Nevada";

const PAGE_W = 612; // 8.5in letter, points
const PAGE_H = 792; // 11in
const PAD = 42;
const CONTENT_W = PAGE_W - PAD * 2;

const styles = StyleSheet.create({
  page: {
    width: PAGE_W,
    height: PAGE_H,
    backgroundColor: PAPER,
    paddingTop: PAD,
    paddingBottom: 36,
    paddingLeft: PAD,
    paddingRight: PAD,
    fontFamily: "Manrope",
    color: NAVY,
  },
  logo: { height: 30, width: 30 * LOGO_ASPECT, objectFit: "contain" },
  rule: { height: 1.5, backgroundColor: BRASS, marginTop: 5, marginBottom: 12, borderRadius: 1 },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Manrope",
    fontWeight: 700,
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  title: { fontSize: 21, fontFamily: "Fraunces", fontWeight: 700, color: NAVY, marginTop: 4, lineHeight: 1.15 },
  meta: { fontSize: 9, color: NAVY, opacity: 0.65, marginTop: 5, marginBottom: 4 },
  sectionTitle: {
    fontSize: 12.5,
    fontFamily: "Fraunces",
    fontWeight: 700,
    color: NAVY,
    marginTop: 16,
    marginBottom: 7,
  },
  statGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  statCard: {
    width: (CONTENT_W - 3 * 10) / 4,
    marginRight: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  statValue: { fontSize: 16, fontFamily: "Fraunces", fontWeight: 700, color: NAVY },
  statLabel: { fontSize: 7, marginTop: 2, color: NAVY, opacity: 0.65, textTransform: "uppercase", letterSpacing: 0.3 },
  tierRow: { flexDirection: "row", marginTop: 2 },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
  },
  tierDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BRASS, marginRight: 5 },
  tierText: { fontSize: 8.5, color: NAVY, opacity: 0.8 },
  signalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 7,
  },
  signalStat: { width: 48, fontSize: 17, fontFamily: "Fraunces", fontWeight: 700, color: BRASS },
  signalLabel: { fontSize: 9, fontFamily: "Manrope", fontWeight: 700, color: NAVY, lineHeight: 1.25 },
  signalDetail: { fontSize: 7.5, color: NAVY, opacity: 0.6, marginTop: 1.5 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  themePill: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BRASS,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  themeText: { fontSize: 8, fontFamily: "Manrope", fontWeight: 700, color: NAVY },
  themePct: { fontSize: 8, fontFamily: "Manrope", fontWeight: 700, color: BRASS, marginLeft: 4 },
  quoteCard: {
    borderLeftWidth: 2.5,
    borderLeftColor: BRASS,
    paddingLeft: 14,
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 12,
    fontFamily: "Fraunces",
    fontStyle: "italic",
    color: NAVY,
    lineHeight: 1.4,
  },
  table: { marginTop: 4 },
  tHeadRow: { flexDirection: "row", backgroundColor: BRASS },
  tRow: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: LINE },
  tRowAlt: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: LINE, backgroundColor: "#F1ECE0" },
  tCellHead: { fontSize: 8, fontFamily: "Manrope", fontWeight: 700, color: NAVY, paddingVertical: 5, paddingHorizontal: 6 },
  tCell: { fontSize: 8, fontFamily: "Manrope", fontWeight: 400, color: NAVY, paddingVertical: 4.5, paddingHorizontal: 6 },
  colName: { width: CONTENT_W * 0.28 },
  colOrg: { width: CONTENT_W * 0.52 },
  colDate: { width: CONTENT_W * 0.2 },
  colName2: { width: CONTENT_W * 0.22 },
  colOrg2: { width: CONTENT_W * 0.36 },
  colReason: { width: CONTENT_W * 0.42 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: PAD,
    right: PAD,
    fontSize: 7.5,
    color: NAVY,
    opacity: 0.5,
    textAlign: "center",
  },
});

function Header() {
  return (
    <View fixed>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Image src={LOGO_URL} style={styles.logo} />
        <Text style={{ fontSize: 8.5, color: NAVY, opacity: 0.55 }}>Prepared by Catapult Fundraising</Text>
      </View>
      <View style={styles.rule} />
    </View>
  );
}

function Footer({ reportDate }: { reportDate: string }) {
  return (
    <Text
      style={styles.footer}
      fixed
      render={({ pageNumber, totalPages }) =>
        `${CLIENT_NAME} · Weekly Status Report · ${reportDate} · Page ${pageNumber} of ${totalPages}`
      }
    />
  );
}

export async function GET() {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const data = await getJagDashboardData();
  const quotes = pickRandomQuotes(data.quotes, 3);

  const STAT_CARDS = [
    { value: String(data.stats.totalProspects), label: "Total Prospects" },
    { value: data.stats.dials.toLocaleString(), label: "Number of Dials" },
    { value: String(data.stats.emailsSent), label: "Emails Sent" },
    { value: String(data.stats.completed), label: "Interviews Completed" },
    { value: String(data.stats.scheduled), label: "Interviews Scheduled" },
    { value: String(data.stats.toBeRescheduled), label: "To Be Rescheduled" },
    { value: String(data.stats.declined), label: "Declined" },
    { value: String(data.stats.inCallingProcess), label: "In Calling Process" },
  ];
  const TIERS = [
    { label: "Tier 1", value: data.stats.tier1 },
    { label: "Tier 2", value: data.stats.tier2 },
    { label: "Tier 3", value: data.stats.tier3 },
    { label: "Tier 4", value: data.stats.tier4 },
    { label: "Tier 5", value: data.stats.tier5 },
  ];

  // One continuous logical page: react-pdf auto-paginates additional physical
  // pages (repeating any `fixed` elements) whenever content overflows, so
  // sections simply flow into each other with no artificial breaks or blank
  // gaps between them. Each section's heading is grouped with wrap={false}
  // so a title is never left stranded alone at the bottom of a page — if it
  // doesn't fit, the whole heading (and the row right after it) moves to the
  // next page together, which is the only case that should ever leave
  // trailing white space.
  const doc = (
    <Document>
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <Header />

        <Text style={styles.eyebrow}>{CLIENT_NAME} · Donor Assessment Study</Text>
        <Text style={styles.title}>Weekly Status Report</Text>
        <Text style={styles.meta}>Prepared for {CLIENT_NAME} · {data.reportDate}</Text>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>This Week&apos;s Snapshot</Text>
          <View style={styles.statGrid}>
            {STAT_CARDS.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.tierRow}>
            {TIERS.map((t) => (
              <View key={t.label} style={styles.tierPill}>
                <View style={styles.tierDot} />
                <Text style={styles.tierText}>
                  {t.label}: {t.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {data.feasibilitySignals.length > 0 && (
          <View>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Donor Signals</Text>
              <Text style={{ fontSize: 8, color: NAVY, opacity: 0.6, marginTop: -4, marginBottom: 6 }}>
                Based on {data.surveyRespondentCount} of {data.stats.completed} completed interviews surveyed
              </Text>
            </View>
            {data.feasibilitySignals.map((f) => (
              <View key={f.label} style={styles.signalRow} wrap={false}>
                <Text style={styles.signalStat}>{f.stat}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.signalLabel}>{f.label}</Text>
                  <Text style={styles.signalDetail}>{f.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {quotes.length > 0 && (
          <View style={{ marginTop: 16 }}>
            {quotes.map((q) => (
              <View key={q} style={styles.quoteCard} wrap={false}>
                <Text style={styles.quoteText}>&ldquo;{q}&rdquo;</Text>
              </View>
            ))}
          </View>
        )}

        {data.missionThemes.length > 0 && (
          <View>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Mission Themes That Resonate Most</Text>
            </View>
            <View style={styles.themeRow}>
              {data.missionThemes.map((m) => (
                <View key={m.label} style={styles.themePill}>
                  <Text style={styles.themeText}>{m.label}</Text>
                  <Text style={styles.themePct}>{m.pct}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.completedInterviews.length > 0 && (
          <View>
            <View style={styles.table} wrap={false}>
              <Text style={styles.sectionTitle}>Completed Interviews ({data.completedInterviews.length})</Text>
              <View style={styles.tHeadRow}>
                <Text style={[styles.tCellHead, styles.colName]}>Name</Text>
                <Text style={[styles.tCellHead, styles.colOrg]}>Organization</Text>
                <Text style={[styles.tCellHead, styles.colDate]}>Date</Text>
              </View>
            </View>
            {data.completedInterviews.map((row, i) => (
              <View key={row.name + row.date} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow} wrap={false}>
                <Text style={[styles.tCell, styles.colName]}>{row.name}</Text>
                <Text style={[styles.tCell, styles.colOrg]}>{row.org || "—"}</Text>
                <Text style={[styles.tCell, styles.colDate]}>{row.date}</Text>
              </View>
            ))}
          </View>
        )}

        {data.scheduledInterviews.length > 0 && (
          <View>
            <View style={styles.table} wrap={false}>
              <Text style={styles.sectionTitle}>Scheduled Interviews ({data.scheduledInterviews.length})</Text>
              <View style={styles.tHeadRow}>
                <Text style={[styles.tCellHead, styles.colName]}>Name</Text>
                <Text style={[styles.tCellHead, styles.colOrg]}>Organization</Text>
                <Text style={[styles.tCellHead, styles.colDate]}>Date</Text>
              </View>
            </View>
            {data.scheduledInterviews.map((row, i) => (
              <View key={row.name + row.date} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow} wrap={false}>
                <Text style={[styles.tCell, styles.colName]}>{row.name}</Text>
                <Text style={[styles.tCell, styles.colOrg]}>{row.org || "—"}</Text>
                <Text style={[styles.tCell, styles.colDate]}>{row.date}</Text>
              </View>
            ))}
          </View>
        )}

        {data.toBeRescheduled.length > 0 && (
          <View>
            <View style={styles.table} wrap={false}>
              <Text style={styles.sectionTitle}>To Be Rescheduled ({data.toBeRescheduled.length})</Text>
              <View style={styles.tHeadRow}>
                <Text style={[styles.tCellHead, styles.colName]}>Name</Text>
                <Text style={[styles.tCellHead, { width: CONTENT_W * 0.72 }]}>Organization</Text>
              </View>
            </View>
            {data.toBeRescheduled.map((row, i) => (
              <View key={row.name} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow} wrap={false}>
                <Text style={[styles.tCell, styles.colName]}>{row.name}</Text>
                <Text style={[styles.tCell, { width: CONTENT_W * 0.72 }]}>{row.org || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {data.declined.length > 0 && (
          <View>
            <View style={styles.table} wrap={false}>
              <Text style={styles.sectionTitle}>Declined to Interview ({data.declined.length})</Text>
              <View style={styles.tHeadRow}>
                <Text style={[styles.tCellHead, styles.colName2]}>Name</Text>
                <Text style={[styles.tCellHead, styles.colOrg2]}>Organization</Text>
                <Text style={[styles.tCellHead, styles.colReason]}>Reason</Text>
              </View>
            </View>
            {data.declined.map((row, i) => (
              <View key={row.name} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow} wrap={false}>
                <Text style={[styles.tCell, styles.colName2]}>{row.name}</Text>
                <Text style={[styles.tCell, styles.colOrg2]}>{row.org || "—"}</Text>
                <Text style={[styles.tCell, styles.colReason]}>{row.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {data.deceased.length > 0 && (
          <View>
            <View style={styles.table} wrap={false}>
              <Text style={styles.sectionTitle}>Deceased ({data.deceased.length})</Text>
              <View style={styles.tHeadRow}>
                <Text style={[styles.tCellHead, styles.colName]}>Name</Text>
                <Text style={[styles.tCellHead, { width: CONTENT_W * 0.72 }]}>Reason</Text>
              </View>
            </View>
            {data.deceased.map((row, i) => (
              <View key={row.name} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow} wrap={false}>
                <Text style={[styles.tCell, styles.colName]}>{row.name}</Text>
                <Text style={[styles.tCell, { width: CONTENT_W * 0.72 }]}>{row.reason}</Text>
              </View>
            ))}
          </View>
        )}

        <Footer reportDate={data.reportDate} />
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="JAG_Nevada_Weekly_Summary.pdf"',
    },
  });
}
