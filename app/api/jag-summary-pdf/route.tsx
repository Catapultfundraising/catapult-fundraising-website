import { NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";

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

const REPORT_DATE = "August 5, 2026";
const CLIENT_NAME = "JAG Nevada";

// ---- Weekly Interview Status Report data ----
// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026 (client-supplied PDF).
const TIERS = [
  { label: "Tier 1", value: 56 },
  { label: "Tier 2", value: 54 },
  { label: "Tier 3", value: 52 },
  { label: "Tier 4", value: 52 },
  { label: "Tier 5", value: 54 },
];

const STAT_CARDS = [
  { value: "268", label: "Total Prospects" },
  { value: "1,982", label: "Number of Dials" },
  { value: "283", label: "Emails Sent" },
  { value: "27", label: "Interviews Completed" },
  { value: "1", label: "Interviews Scheduled" },
  { value: "5", label: "To Be Rescheduled" },
  { value: "23", label: "Declined" },
  { value: "211", label: "In Calling Process" },
];

// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026, "Completed Interviews" (pages 2-3).
const COMPLETED_INTERVIEWS = [
  { name: "Dennis Perea", org: "KGHM", date: "6/15/2026" },
  { name: "Shauna Walch", org: "", date: "6/17/2026" },
  { name: "Jay Bloom", org: "", date: "6/18/2026" },
  { name: "Chris Giunchigliani", org: "Gray's Leadership Academy", date: "6/23/2026" },
  { name: "Tray Abney", org: "Abney Tauchen Group", date: "6/24/2026" },
  { name: "Joselyn Cousins", org: "Federal Reserve Bank", date: "6/24/2026" },
  { name: "Gerri Schroder", org: "", date: "6/26/2026" },
  { name: "Alletha Muzorewa", org: "Anthem", date: "6/30/2026" },
  { name: "Ann Silver", org: "Reno + Sparks Chamber of Commerce", date: "6/30/2026" },
  { name: "Angel Williams", org: "NV Energy", date: "6/30/2026" },
  { name: "Jan Blackhurst", org: "UNLV Black Fire Leadership Initiative", date: "7/6/2026" },
  { name: "David Foster", org: "", date: "7/8/2026" },
  { name: "Katei Horn", org: "Las Vegas Valley Water District", date: "7/8/2026" },
  { name: "Tracy Brown-May", org: "Nevada Legislature", date: "7/13/2026" },
  { name: "Peter Digrazia", org: "", date: "7/14/2026" },
  { name: "Tracy Moore", org: "Former JAG Nevada board member", date: "7/14/2026" },
  { name: "Elaine Silverstone", org: "Nevada Governor's Office of Economic Development", date: "7/14/2026" },
  { name: "George Keyes", org: "", date: "7/15/2026" },
  { name: "Amelia Hippert", org: "Soroptimist International", date: "7/17/2026" },
  { name: "Thomas Burns", org: "", date: "7/20/2026" },
  { name: "Greg Moore", org: "State Farm", date: "7/20/2026" },
  { name: "Catherine Bellver", org: "UNLV and Soroptimist", date: "7/22/2026" },
  { name: "Greg Fine", org: "Marketing Consultant — Greg the Fine", date: "7/23/2026" },
  { name: "Edward Estipona", org: "Estipona Group", date: "7/28/2026" },
  { name: "Magda Iwanska-Hirsch", org: "PNC", date: "7/30/2026" },
  { name: "Chris Reilly", org: "State of Nevada", date: "8/3/2026" },
  { name: "Jane'e Murphy", org: "Al Davis Eddie Robinson Leadership Academy", date: "8/4/2026" },
];

// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026, "To Be Rescheduled" (page 5).
const TO_BE_RESCHEDULED = [
  { name: "Becky Harris", org: "" },
  { name: "Cinthia Moore", org: "" },
  { name: "Nora Perez", org: "Enterprise Financial Serv Corp" },
  { name: "Nick Rowe", org: "Bank of America" },
  { name: "Brook Sweeting", org: "United Federal Credit Union" },
];

// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026, "Declined to Interview" (page 6).
const DECLINED = [
  { name: "Elizabeth Day", org: "", reason: "Not Interested" },
  { name: "Michael Dermody", org: "Dermody Properties", reason: "Not Interested" },
  { name: "Eaton Dunkelberger", org: "Community Foundation NN", reason: "Does not do study interviews" },
  { name: "EL Cord Foundation", org: "EL Cord Foundation", reason: "Does not do study interviews" },
  { name: "Matt Engle", org: "Insurance Office of America", reason: "Too Busy" },
  { name: "Caesar Fonte", org: "", reason: "No longer lives in Las Vegas" },
  { name: "Nicole Freestone", org: "", reason: "Too Busy" },
  { name: "Steven Hussain", org: "Prologis", reason: "Recommended another person in his office" },
  { name: "Gary Kantor", org: "", reason: "Personal Issues" },
  { name: "Gary Klein", org: "LPL Financial", reason: "Too Busy, but likes what JAG does" },
  { name: "Mike Kramer", org: "", reason: "Too Busy" },
  { name: "Tim Kuptz", org: "", reason: "Too Busy" },
  { name: "Charles Litt", org: "", reason: "Not Interested" },
  { name: "Dawn Mack", org: "Cyrus and Michael Tang Foundation", reason: "Out of Country" },
  { name: "Erica Mosca", org: "", reason: "Too Busy" },
  { name: "Melanie Narish", org: "", reason: "Too Busy" },
  { name: "Lori Nelson", org: "", reason: "Too Busy" },
  { name: "John Shepherd", org: "", reason: "Not Interested" },
  { name: "Don Snyder", org: "United Way of Southern Nevada", reason: "Out of Town" },
  { name: "Nathan Thomas", org: "Empire Cat", reason: "Not Interested" },
  { name: "Gerry Tomac", org: "", reason: "Not Interested" },
  { name: "LaWanda Torres", org: "", reason: "No longer interested" },
  { name: "George Wallace", org: "", reason: "Not Interested" },
];

// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026, "Deceased" (page 7).
const DECEASED = [{ name: "Robert Mendenhall", reason: "Passed Away" }];

// ---- Feasibility study signals ----
// Source: JAG-Feasibility-Study_Survey_Results_080326.xlsx, 26 completed
// interview surveys analyzed as of 8/3/2026. Percentages computed from the
// raw answer counts in that file.
const FEASIBILITY_SIGNALS = [
  {
    stat: "85%",
    label: "Rate JAG's reputation “Very Good” or “Good”",
    detail: "14 Very Good, 8 Good, 4 Don't Know — out of 26 respondents",
  },
  {
    stat: "69%",
    label: "Would consider a financial gift to JAG if asked",
    detail: "18 Yes, 6 No, 1 Maybe, 1 Don't Know",
  },
  {
    stat: "60%",
    label: "Of likely donors would consider a multi-year commitment",
    detail: "9 of 15 who answered the multi-year follow-up said Yes",
  },
  {
    stat: "73%",
    label: "Are willing to introduce JAG to others in their network",
    detail: "19 of 26 respondents said Yes",
  },
  {
    stat: "42%",
    label: "Would consider a leadership role with JAG",
    detail: "11 Yes, another 6 said Maybe",
  },
];

// ---- Interview quotes ----
// Source: JAG-Feasibility-Study_Survey_Results_080326.xlsx, verbatim (lightly
// trimmed for length) comments from completed interview surveys. This is a
// confidential assessment study, so quotes are intentionally NOT attributed
// to any respondent by name — no name field is stored or rendered anywhere
// near the quote text. A random subset is selected on every PDF generation
// so repeat downloads surface different voices from the study.
const QUOTES: string[] = [
  "I believe JAG has a very good reputation among those who know about the organization and understand the work it does in the community.",
  "I believe JAG has a very good reputation because it consistently delivers measurable results for students who are most at risk of not graduating.",
  "I feel JAG is a wonderful organization, is well respected, and has a positive reputation.",
  "JAG aligns closely with what motivates me because it prepares young people for successful careers while helping them overcome challenges that could prevent them from reaching their goals.",
  "JAG aligns with my passion for public education, helping young people develop meaningful life skills, and creating opportunities for students who may otherwise struggle to find their path.",
  "It aligns completely — I feel a strong sense of ownership and can clearly see the direct impact and immense return on investment it brings to youth.",
  "That alignment is one of the reasons I serve on the board. I believe in the organization's mission, leadership, and ability to produce results.",
  "JAG is very valuable and needed in Las Vegas. I see the dropout rates improving and feel JAG is doing a very good job.",
  "I have seen firsthand the instructors' enthusiasm and passion, and it is very inspirational.",
  "From what I've seen, JAG gets really good results for those that need another outlet and need a chance.",
  "JAG's focus on youth and its commitment to preparing students for quality employment strongly align with my values.",
  "JAG aligns closely with our organization's priorities because it focuses on education and workforce development.",
];

function pickRandomQuotes(count: number) {
  const pool = [...QUOTES];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

const MISSION_THEMES = [
  { label: "Workforce development", pct: "73%" },
  { label: "Opportunity & access", pct: "69%" },
  { label: "Mentorship", pct: "54%" },
  { label: "Student success", pct: "50%" },
  { label: "Leadership training", pct: "31%" },
];

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
  meta: { fontSize: 9, color: NAVY, opacity: 0.65, marginTop: 5 },
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

function Footer({ page }: { page: string }) {
  return (
    <Text style={styles.footer} fixed>
      {CLIENT_NAME} · Donor Assessment Study · {REPORT_DATE} · {page}
    </Text>
  );
}

export async function GET() {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const quotes = pickRandomQuotes(3);

  const doc = (
    <Document>
      {/* Page 1 — Cover + weekly stats + feasibility signals */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <Header />

        <Text style={styles.eyebrow}>{CLIENT_NAME} · Donor Assessment Study</Text>
        <Text style={styles.title}>Weekly Status &amp; Feasibility Summary</Text>
        <Text style={styles.meta}>Prepared for the {CLIENT_NAME} Board · {REPORT_DATE}</Text>

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

        <Text style={styles.sectionTitle}>Feasibility Study Signals</Text>
        <Text style={{ fontSize: 8, color: NAVY, opacity: 0.6, marginTop: -4, marginBottom: 6 }}>
          Based on 26 completed interview surveys analyzed as of 8/3/2026
        </Text>
        {FEASIBILITY_SIGNALS.map((f) => (
          <View key={f.label} style={styles.signalRow}>
            <Text style={styles.signalStat}>{f.stat}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.signalLabel}>{f.label}</Text>
              <Text style={styles.signalDetail}>{f.detail}</Text>
            </View>
          </View>
        ))}

        <Footer page="Page 1 of 4" />
      </Page>

      {/* Page 2 — In their own words + mission themes */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <Header />
        <Text style={styles.sectionTitle}>In Their Own Words</Text>
        <Text style={{ fontSize: 8, color: NAVY, opacity: 0.6, marginTop: -4, marginBottom: 14 }}>
          A random sample of comments from completed feasibility study interviews
        </Text>
        {quotes.map((q) => (
          <View key={q} style={styles.quoteCard}>
            <Text style={styles.quoteText}>&ldquo;{q}&rdquo;</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Mission Themes That Resonate Most</Text>
        <View style={styles.themeRow}>
          {MISSION_THEMES.map((m) => (
            <View key={m.label} style={styles.themePill}>
              <Text style={styles.themeText}>{m.label}</Text>
              <Text style={styles.themePct}>{m.pct}</Text>
            </View>
          ))}
        </View>

        <Footer page="Page 2 of 4" />
      </Page>

      {/* Page 3 — Completed interviews */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <Header />
        <Text style={styles.sectionTitle}>Completed Interviews ({COMPLETED_INTERVIEWS.length})</Text>
        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tCellHead, styles.colName]}>Name</Text>
            <Text style={[styles.tCellHead, styles.colOrg]}>Organization</Text>
            <Text style={[styles.tCellHead, styles.colDate]}>Date</Text>
          </View>
          {COMPLETED_INTERVIEWS.map((row, i) => (
            <View key={row.name + row.date} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow}>
              <Text style={[styles.tCell, styles.colName]}>{row.name}</Text>
              <Text style={[styles.tCell, styles.colOrg]}>{row.org || "—"}</Text>
              <Text style={[styles.tCell, styles.colDate]}>{row.date}</Text>
            </View>
          ))}
        </View>
        <Footer page="Page 3 of 4" />
      </Page>

      {/* Page 4 — To be rescheduled, declined, and deceased */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <Header />
        <Text style={styles.sectionTitle}>To Be Rescheduled ({TO_BE_RESCHEDULED.length})</Text>
        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tCellHead, styles.colName]}>Name</Text>
            <Text style={[styles.tCellHead, { width: CONTENT_W * 0.72 }]}>Organization</Text>
          </View>
          {TO_BE_RESCHEDULED.map((row, i) => (
            <View key={row.name} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow}>
              <Text style={[styles.tCell, styles.colName]}>{row.name}</Text>
              <Text style={[styles.tCell, { width: CONTENT_W * 0.72 }]}>{row.org || "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Declined to Interview ({DECLINED.length})</Text>
        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tCellHead, styles.colName2]}>Name</Text>
            <Text style={[styles.tCellHead, styles.colOrg2]}>Organization</Text>
            <Text style={[styles.tCellHead, styles.colReason]}>Reason</Text>
          </View>
          {DECLINED.map((row, i) => (
            <View key={row.name} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow}>
              <Text style={[styles.tCell, styles.colName2]}>{row.name}</Text>
              <Text style={[styles.tCell, styles.colOrg2]}>{row.org || "—"}</Text>
              <Text style={[styles.tCell, styles.colReason]}>{row.reason}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Deceased ({DECEASED.length})</Text>
        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tCellHead, styles.colName]}>Name</Text>
            <Text style={[styles.tCellHead, { width: CONTENT_W * 0.72 }]}>Reason</Text>
          </View>
          {DECEASED.map((row, i) => (
            <View key={row.name} style={i % 2 === 1 ? styles.tRowAlt : styles.tRow}>
              <Text style={[styles.tCell, styles.colName]}>{row.name}</Text>
              <Text style={[styles.tCell, { width: CONTENT_W * 0.72 }]}>{row.reason}</Text>
            </View>
          ))}
        </View>

        <Footer page="Page 4 of 4" />
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
