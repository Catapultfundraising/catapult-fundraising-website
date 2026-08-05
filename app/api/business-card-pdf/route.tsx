import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";

export const runtime = "nodejs";

// Full-color horizontal Catapult Fundraising lockup (icon + "Catapult" +
// "FUNDRAISING"), pulled directly from the official logo package.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ffe08cd7-6dee-47f3-b390-61aecad692c2.png";
const LOGO_ASPECT = 9225 / 2342;

// The site's two brand typefaces (see app/globals.css): Fraunces for
// headings/display moments, Manrope for everything else. These are static
// weight instances cut from the same variable font files Google serves for
// the website, so the letterforms match exactly.
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

// NAVY matches the site's official --navy brand color exactly, so the card
// stays consistent with the logo and the rest of the brand system.
const NAVY = "#15212E";
const BRASS = "#B28C46";
const PAPER = "#FAF7F0";

// Uppercase "tracked caps" labels (title, service tags) previously used the
// PDF renderer's native letterSpacing property combined with a CSS-style
// textTransform. That combination — letter-spacing + uppercase transform on
// a custom (variable-font-instanced) embedded font — is a known trouble spot
// in PDF text-run rendering: some PDF consumers occasionally drop the FIRST
// glyph of a letter-spaced run (seen in production as "CHIEF" rendering as
// "HIEF"). To eliminate that whole class of bug, we build the visual tracking
// manually with real Unicode thin-space characters instead of the renderer's
// letterSpacing engine, so every glyph is just a normal character in a plain
// text run with no special per-glyph positioning.
const THIN_SPACE = " ";
function trackedWord(word: string): string {
  return word.toUpperCase().split("").join(THIN_SPACE);
}
function trackedLabel(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .map(trackedWord)
    .join(THIN_SPACE + THIN_SPACE + " ");
}
function trackedTags(tags: string[]): string {
  return tags.map(trackedWord).join("   ·   ");
}

const WEBSITE = "catapultfr.com";
const OFFICE_ADDRESS_LINE_1 = "2551 N. Green Valley Parkway, Suite 202B";
const OFFICE_ADDRESS_LINE_2 = "Henderson, NV 89014";
const ADDITIONAL_OFFICES_LINE = "Additional Offices: New Jersey & Texas";
const TAGLINE = "Growing your donor base at every stage of the giving journey.";
const SERVICE_TAGS = ["CAPITAL CAMPAIGNS", "LEGACY GIVING", "DONOR ENGAGEMENT", "ANNUAL FUND"];

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

const FRONT_LOGO_H = 40;
const BACK_LOGO_H = 32;
const FRONT_LOGO_W = FRONT_LOGO_H * LOGO_ASPECT;
const BACK_LOGO_W = BACK_LOGO_H * LOGO_ASPECT;
const FRONT_NAME_COL_W = 138;
const FRONT_CONTACT_COL_W = 96;

const styles = StyleSheet.create({
  page: {
    width: PAGE_W,
    height: PAGE_H,
    backgroundColor: PAPER,
    paddingTop: PAD,
    paddingBottom: PAD,
    paddingLeft: PAD,
    paddingRight: PAD,
    fontFamily: "Manrope",
  },
  frontContent: { width: CONTENT_W, height: CONTENT_H, flexDirection: "column", alignItems: "flex-start" },
  frontLogo: { height: FRONT_LOGO_H, width: FRONT_LOGO_W, objectFit: "contain", alignSelf: "flex-start" },
  frontRule: {
    height: 1.5,
    width: FRONT_LOGO_W,
    backgroundColor: BRASS,
    marginTop: 5,
    borderRadius: 1,
    alignSelf: "flex-start",
  },
  frontBottomRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 13, width: CONTENT_W },
  frontNameCol: { width: FRONT_NAME_COL_W, marginTop: 10 },
  name: { fontSize: 12, fontFamily: "Fraunces", fontWeight: 700, color: NAVY, lineHeight: 1.1, width: FRONT_NAME_COL_W },
  title: {
    fontSize: 5.8,
    fontFamily: "Manrope",
    fontWeight: 700,
    color: BRASS,
    marginTop: 3,
    width: FRONT_NAME_COL_W,
  },
  frontContactCol: { width: FRONT_CONTACT_COL_W, alignItems: "flex-end" },
  contactLabel: { color: BRASS, fontFamily: "Manrope", fontWeight: 700 },
  contactRow: {
    width: FRONT_CONTACT_COL_W,
    fontSize: 7,
    fontFamily: "Manrope",
    fontWeight: 400,
    color: NAVY,
    lineHeight: 1.2,
    textAlign: "right",
  },
  contactRowSpaced: {
    width: FRONT_CONTACT_COL_W,
    fontSize: 7,
    fontFamily: "Manrope",
    fontWeight: 400,
    color: NAVY,
    lineHeight: 1.2,
    textAlign: "right",
    marginTop: 3.5,
  },
  addressBlock: { marginTop: 5 },
  addressRow: {
    width: FRONT_CONTACT_COL_W,
    fontSize: 5,
    fontFamily: "Manrope",
    fontWeight: 400,
    color: NAVY,
    lineHeight: 1.2,
    textAlign: "right",
  },
  officesLine: {
    width: FRONT_CONTACT_COL_W,
    fontSize: 5,
    fontFamily: "Fraunces",
    fontStyle: "italic",
    color: BRASS,
    lineHeight: 1.2,
    textAlign: "right",
    marginTop: 3,
  },
  backContent: {
    width: CONTENT_W,
    height: CONTENT_H,
    alignItems: "center",
    justifyContent: "center",
  },
  backLogo: { height: BACK_LOGO_H, width: BACK_LOGO_W, objectFit: "contain" },
  backRule: {
    width: BACK_LOGO_W,
    height: 1.5,
    backgroundColor: BRASS,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 1,
  },
  backTagline: {
    fontSize: 7.2,
    fontFamily: "Fraunces",
    fontStyle: "italic",
    color: NAVY,
    textAlign: "center",
    width: CONTENT_W,
  },
  backTags: {
    fontSize: 5.1,
    fontFamily: "Manrope",
    fontWeight: 700,
    color: BRASS,
    textAlign: "center",
    marginTop: 7,
    width: CONTENT_W,
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
              <Text style={styles.title}>{trackedLabel(data.title || "Your Title")}</Text>
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
          <Text style={styles.backTags}>{trackedTags(SERVICE_TAGS)}</Text>
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
