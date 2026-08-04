import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export const runtime = "nodejs";

// Full-color horizontal Catapult Fundraising lockup (icon + "Catapult" +
// "FUNDRAISING"), pulled directly from the official logo package.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ffe08cd7-6dee-47f3-b390-61aecad692c2.png";
const LOGO_ASPECT = 9225 / 2342;

const NAVY = "#15212E";
const BRASS = "#B28C46";
const PAPER = "#FAF7F0";

const WEBSITE = "catapultfr.com";
const TAGLINE = "Growing your donor base at every stage of the giving journey.";
const SERVICE_TAGS = ["CAPITAL CAMPAIGNS", "LEGACY GIVING", "DONOR ENGAGEMENT", "ANNUAL FUND"];
const ADDITIONAL_OFFICES_LINE = "Additional Offices: New Jersey & Texas";

// Standard US business card, print-vendor spec: 3.5" x 2" trim size with a
// 0.125" (1/8") bleed on every side.
const IN = 72;
const BLEED = 0.125 * IN;
const SAFE = 0.125 * IN;
const TRIM_W = 3.5 * IN;
const TRIM_H = 2 * IN;
const PAGE_W = TRIM_W + BLEED * 2;
const PAGE_H = TRIM_H + BLEED * 2;
const PAD = BLEED + SAFE;
const CONTENT_W = PAGE_W - PAD * 2;
const CONTENT_H = PAGE_H - PAD * 2;

// Sizes below match the user-approved mockup exactly (measured directly off
// the approved reference image at its precise 700px = 252pt scale).
const FRONT_LOGO_H = 28.2;
const BACK_LOGO_H = 27.5;
const FRONT_LOGO_W = FRONT_LOGO_H * LOGO_ASPECT;
const BACK_LOGO_W = BACK_LOGO_H * LOGO_ASPECT;
const FRONT_NAME_COL_W = 138;
const FRONT_CONTACT_COL_W = 92;

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
  frontLogo: { height: FRONT_LOGO_H, width: FRONT_LOGO_W, objectFit: "contain" },
  frontRule: {
    height: 1.5,
    width: FRONT_LOGO_W,
    backgroundColor: BRASS,
    marginTop: 8.3,
    borderRadius: 1,
  },
  frontBottomRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14.4 },
  frontNameCol: { width: FRONT_NAME_COL_W },
  name: { fontSize: 10.7, fontFamily: "Helvetica-Bold", color: NAVY, lineHeight: 1.15, width: FRONT_NAME_COL_W },
  title: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 3.6,
    width: FRONT_NAME_COL_W,
  },
  frontContactCol: { width: FRONT_CONTACT_COL_W, alignItems: "flex-end", marginTop: 28.2 },
  contactRow: { width: FRONT_CONTACT_COL_W, fontSize: 7.6, color: NAVY, lineHeight: 1.3, textAlign: "right" },
  contactRowSpaced: { width: FRONT_CONTACT_COL_W, fontSize: 7.6, color: NAVY, lineHeight: 1.3, textAlign: "right", marginTop: 5 },
  contactLabel: { color: BRASS, fontFamily: "Helvetica-Bold" },
  backContent: {
    width: CONTENT_W,
    height: CONTENT_H,
    alignItems: "center",
    justifyContent: "center",
  },
  backLogo: { height: BACK_LOGO_H, width: BACK_LOGO_W, objectFit: "contain" },
  backRule: { width: 39.3, height: 1.5, backgroundColor: BRASS, marginTop: 8, marginBottom: 8, borderRadius: 1 },
  backTagline: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    color: NAVY,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 1.3,
  },
  backTags: {
    fontSize: 5.4,
    fontFamily: "Helvetica-Bold",
    color: BRASS,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 232,
    lineHeight: 1.3,
  },
  backOfficesLine: {
    fontSize: 6.4,
    fontFamily: "Helvetica-Oblique",
    color: BRASS,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 220,
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
              {data.cellPhone ? (
                <Text style={styles.contactRow}>
                  <Text style={styles.contactLabel}>D: </Text>
                  {data.cellPhone}
                </Text>
              ) : null}
              {data.officePhone ? (
                <Text style={styles.contactRowSpaced}>
                  <Text style={styles.contactLabel}>O: </Text>
                  {data.officePhone}
                </Text>
              ) : null}
              {data.email ? <Text style={styles.contactRowSpaced}>{data.email}</Text> : null}
              <Text style={styles.contactRowSpaced}>{WEBSITE}</Text>
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
          <Text style={styles.backOfficesLine}>{ADDITIONAL_OFFICES_LINE}</Text>
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
