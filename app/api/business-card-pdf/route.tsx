import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export const runtime = "nodejs";

// Full-color Catapult Fundraising logo (navy + brass), the same file used in
// the site header and email signature on light backgrounds — matches the
// cream business card background approved by the team.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ccdcb7df-f854-4cf8-a390-1d9eb56ecd9d.png";
const LOGO_ASPECT = 1536 / 1024;

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

const FRONT_LOGO_H = 22;
const BACK_LOGO_H = 40;

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
  frontContent: {
    width: CONTENT_W,
    height: CONTENT_H,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  frontLeftCol: { width: 78, height: CONTENT_H, justifyContent: "space-between" },
  frontLogo: { height: FRONT_LOGO_H, width: FRONT_LOGO_H * LOGO_ASPECT, objectFit: "contain" },
  frontRule: { height: 1.4, backgroundColor: BRASS, marginTop: 6, borderRadius: 1 },
  name: { fontSize: 12.5, fontFamily: "Helvetica-Bold", color: NAVY, lineHeight: 1.18, width: 78 },
  title: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
    width: 78,
  },
  frontRightCol: { width: 156, height: CONTENT_H, alignItems: "flex-end", justifyContent: "flex-end" },
  contactRow: { width: 156, fontSize: 6.8, color: NAVY, lineHeight: 1.5, textAlign: "right" },
  contactLabel: { color: BRASS, fontFamily: "Helvetica-Bold" },
  addressBlock: { width: 156, marginTop: 5 },
  addressRow: { width: 156, fontSize: 6.1, color: NAVY, lineHeight: 1.45, textAlign: "right" },
  officesLine: {
    width: 156,
    fontSize: 6.3,
    fontFamily: "Helvetica-Oblique",
    color: BRASS,
    marginTop: 5,
    textAlign: "right",
  },
  backContent: {
    width: CONTENT_W,
    height: CONTENT_H,
    alignItems: "center",
    justifyContent: "center",
  },
  backLogo: { height: BACK_LOGO_H, width: BACK_LOGO_H * LOGO_ASPECT, objectFit: "contain" },
  backRule: { width: 40, height: 1.4, backgroundColor: BRASS, marginTop: 8, marginBottom: 8, borderRadius: 1 },
  backTagline: {
    fontSize: 7.6,
    fontFamily: "Helvetica-Oblique",
    color: NAVY,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 1.4,
  },
  backTags: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    textAlign: "center",
    marginTop: 9,
    maxWidth: 230,
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
          <View style={styles.frontLeftCol}>
            <View>
              <Image src={LOGO_URL} style={styles.frontLogo} />
              <View style={[styles.frontRule, { width: FRONT_LOGO_H * LOGO_ASPECT }]} />
            </View>
            <View>
              <Text style={styles.name}>{data.fullName || "Your Name"}</Text>
              <Text style={styles.title}>{data.title || "Your Title"}</Text>
            </View>
          </View>
          <View style={styles.frontRightCol}>
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
