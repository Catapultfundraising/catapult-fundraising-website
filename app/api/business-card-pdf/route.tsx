import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export const runtime = "nodejs";

// Full-color horizontal Catapult Fundraising lockup (icon + "Catapult" +
// "FUNDRAISING"), pulled directly from the official logo package rather than
// the compact square-ish header mark — this is the wide lockup used in the
// approved business card reference design.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ffe08cd7-6dee-47f3-b390-61aecad692c2.png";
const LOGO_ASPECT = 9225 / 2342;

const NAVY = "#15212E";
const BRASS = "#B28C46";
const PAPER = "#FAF7F0";

// Fixed company info shown on every card, regardless of who generates it.
const OFFICE_ADDRESS_LINE_1 = "2551 N. Green Valley Parkway, Suite 202B";
const OFFICE_ADDRESS_LINE_2 = "Henderson, NV 89014";
const ADDITIONAL_OFFICES_LINE = "Additional Offices in New Jersey and Texas";
const WEBSITE = "catapultfr.com";
const TAGLINE = "Growing your donor base at every stage of the giving journey.";
// Requested order: Capital Campaign(s), Legacy Giving, Donor Engagement, Annual Fund.
const SERVICE_TAGS = ["CAPITAL CAMPAIGNS", "LEGACY GIVING", "DONOR ENGAGEMENT", "ANNUAL FUND"];

// Standard US business card, print-vendor spec: 3.5" x 2" trim size with a
// 0.125" (1/8") bleed on every side — the industry-standard bleed most print
// vendors (Vistaprint, GotPrint, local shops, etc.) expect. No crop marks are
// drawn on purpose: most online print vendors run their own automated
// preflight/cutting and foreign crop marks in the uploaded file can confuse
// that process or get flagged. The safe content margin (also 0.125") keeps
// text clear of the trim line so nothing is at risk of being cut off.
const IN = 72; // points per inch in a PDF
const BLEED = 0.125 * IN; // 9pt
const SAFE = 0.125 * IN; // 9pt safety margin inside the trim line
const TRIM_W = 3.5 * IN; // 252pt
const TRIM_H = 2 * IN; // 144pt
const PAGE_W = TRIM_W + BLEED * 2; // 270pt (3.75")
const PAGE_H = TRIM_H + BLEED * 2; // 162pt (2.25")
const PAD = BLEED + SAFE; // 18pt inset from the bleed edge to the safe content area
const CONTENT_W = PAGE_W - PAD * 2; // 234pt
const CONTENT_H = PAGE_H - PAD * 2; // 126pt

const FRONT_LOGO_H = 21;
const BACK_LOGO_H = 34;
const FRONT_NAME_COL_W = 100;
const FRONT_CONTACT_COL_W = 130;

const styles = StyleSheet.create({
  page: {
    width: PAGE_W,
    height: PAGE_H,
    backgroundColor: PAPER,
    paddingTop: PAD,
    paddingBottom: PAD,
    paddingLeft: PAD,
    paddingRight: PAD,
    fontFamily: "Helvetica",
  },
  frontContent: { width: CONTENT_W, height: CONTENT_H, flexDirection: "column" },
  frontLogo: { height: FRONT_LOGO_H, width: FRONT_LOGO_H * LOGO_ASPECT, objectFit: "contain" },
  frontRule: {
    height: 1.4,
    width: FRONT_LOGO_H * LOGO_ASPECT,
    backgroundColor: BRASS,
    marginTop: 7,
    marginBottom: 14,
    borderRadius: 1,
  },
  frontBottomRow: { flexDirection: "row", justifyContent: "space-between", flexGrow: 1 },
  frontNameCol: { width: FRONT_NAME_COL_W, justifyContent: "flex-end" },
  name: { fontSize: 12.5, fontFamily: "Helvetica-Bold", color: NAVY, lineHeight: 1.2, width: FRONT_NAME_COL_W },
  title: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 3,
    width: FRONT_NAME_COL_W,
  },
  frontContactCol: { width: FRONT_CONTACT_COL_W, alignItems: "flex-end", justifyContent: "flex-start" },
  contactRow: { width: FRONT_CONTACT_COL_W, fontSize: 6.8, color: NAVY, lineHeight: 1.65, textAlign: "right" },
  contactLabel: { color: BRASS, fontFamily: "Helvetica-Bold" },
  addressBlock: { width: FRONT_CONTACT_COL_W, marginTop: 7 },
  addressRow: { width: FRONT_CONTACT_COL_W, fontSize: 5.9, color: NAVY, lineHeight: 1.5, textAlign: "right" },
  officesLine: {
    width: FRONT_CONTACT_COL_W,
    fontSize: 6.1,
    fontFamily: "Helvetica-Oblique",
    color: BRASS,
    marginTop: 7,
    textAlign: "right",
  },
  backContent: {
    width: CONTENT_W,
    height: CONTENT_H,
    alignItems: "center",
    justifyContent: "center",
  },
  backLogo: { height: BACK_LOGO_H, width: BACK_LOGO_H * LOGO_ASPECT, objectFit: "contain" },
  backRule: { width: 70, height: 1.6, backgroundColor: BRASS, marginTop: 10, marginBottom: 10, borderRadius: 1 },
  backTagline: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    color: NAVY,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 1.45,
  },
  backTags: {
    fontSize: 6.4,
    fontFamily: "Helvetica-Bold",
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    textAlign: "center",
    marginTop: 11,
    maxWidth: 230,
    lineHeight: 1.5,
  },
});

interface CardData {
  fullName?: string;
  title?: string;
  cellPhone?: string;
  officePhone?: string;
  email?: string;
}

function BusinessCardDocument({ data }: { data: CardData }) {
  return (
    <Document>
      {/* Front — page 1 */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <View style={styles.frontContent}>
          <Image src={LOGO_URL} style={styles.frontLogo} />
          <View style={styles.frontRule} />
          <View style={styles.frontBottomRow}>
            <View style={styles.frontNameCol}>
              <Text style={styles.name}>{data.fullName || "Your Name"}</Text>
              <Text style={styles.title}>{data.title || "Your Title"}</Text>
            </View>
            <View style={styles.frontContactCol}>
              {data.officePhone ? (
                <Text style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Office: </Text>
                  {data.officePhone}
                </Text>
              ) : null}
              {data.cellPhone ? (
                <Text style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Cell: </Text>
                  {data.cellPhone}
                </Text>
              ) : null}
              {data.email ? <Text style={styles.contactRow}>{data.email}</Text> : null}
              <Text style={styles.contactRow}>{WEBSITE}</Text>
              <View style={styles.addressBlock}>
                <Text style={styles.addressRow}>{OFFICE_ADDRESS_LINE_1}</Text>
                <Text style={styles.addressRow}>{OFFICE_ADDRESS_LINE_2}</Text>
              </View>
              <Text style={styles.officesLine}>{ADDITIONAL_OFFICES_LINE}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Back — page 2 (fixed brand content, same on every card) */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <View style={styles.backContent}>
          <Image src={LOGO_URL} style={styles.backLogo} />
          <View style={styles.backRule} />
          <Text style={styles.backTagline}>{TAGLINE}</Text>
          <Text style={styles.backTags}>{SERVICE_TAGS.join("   ·   ")}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as CardData;
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const buffer = await renderToBuffer(<BusinessCardDocument data={data} />);
    const fileName = `${(data?.fullName || "Business_Card").replace(/[^a-z0-9]+/gi, "_")}_Catapult_Fundraising.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("business-card-pdf error", err);
    return NextResponse.json({ error: "Failed to generate business card PDF." }, { status: 500 });
  }
}
