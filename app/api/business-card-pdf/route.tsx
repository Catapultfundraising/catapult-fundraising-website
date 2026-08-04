import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export const runtime = "nodejs";

// Light/white Catapult Fundraising logo variant — same one used on the navy
// hero band of the Prospect Intelligence Profile PDF and the site's navy
// footer, so it reads cleanly against the card's navy background.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6a4f10b3-3d43-4704-81c9-f36ad05b2c2f.png";

const NAVY_DEEP = "#0C131C";
const BRASS = "#B28C46";
const BRASS_LIGHT = "#CDAA6E";
const CREAM = "#FFFFFF";

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

const styles = StyleSheet.create({
  page: {
    width: PAGE_W,
    height: PAGE_H,
    backgroundColor: NAVY_DEEP,
    paddingTop: PAD,
    paddingBottom: PAD,
    paddingLeft: PAD,
    paddingRight: PAD,
    fontFamily: "Helvetica",
  },
  frontContent: {
    width: PAGE_W - PAD * 2,
    height: PAGE_H - PAD * 2,
    flexDirection: "column",
  },
  logo: { height: 20, width: 92, objectFit: "contain" },
  name: { fontSize: 15, fontFamily: "Helvetica-Bold", color: CREAM, marginTop: 8, lineHeight: 1.15 },
  title: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BRASS_LIGHT,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  rule: { width: 30, height: 1.5, backgroundColor: BRASS, marginTop: 7, marginBottom: 7, borderRadius: 1 },
  contactRow: { fontSize: 7.4, color: "rgba(255,255,255,0.88)", lineHeight: 1.55 },
  contactLabel: { color: BRASS_LIGHT, fontFamily: "Helvetica-Bold" },
  backContent: {
    width: PAGE_W - PAD * 2,
    height: PAGE_H - PAD * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  backLogo: { height: 34, width: 156, objectFit: "contain" },
  backTagline: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    color: BRASS_LIGHT,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 210,
    lineHeight: 1.4,
  },
  backWebsite: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: CREAM,
    letterSpacing: 0.5,
    marginTop: 9,
  },
});

interface CardData {
  fullName?: string;
  title?: string;
  cellPhone?: string;
  officePhone?: string;
  email?: string;
  tagline?: string;
}

function BusinessCardDocument({ data }: { data: CardData }) {
  const rows: Array<{ label: string; value: string }> = [];
  if (data.cellPhone) rows.push({ label: "Cell", value: data.cellPhone });
  if (data.officePhone) rows.push({ label: "Office", value: data.officePhone });
  if (data.email) rows.push({ label: "Email", value: data.email });

  return (
    <Document>
      {/* Front — page 1 */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <View style={styles.frontContent}>
          <Image src={LOGO_URL} style={styles.logo} />
          <Text style={styles.name}>{data.fullName || "Your Name"}</Text>
          <Text style={styles.title}>{data.title || "Your Title"}</Text>
          <View style={styles.rule} />
          {rows.map((row) => (
            <Text style={styles.contactRow} key={row.label}>
              <Text style={styles.contactLabel}>{row.label}: </Text>
              {row.value}
            </Text>
          ))}
        </View>
      </Page>

      {/* Back — page 2 */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <View style={styles.backContent}>
          <Image src={LOGO_URL} style={styles.backLogo} />
          {data.tagline ? <Text style={styles.backTagline}>{data.tagline}</Text> : null}
          <Text style={styles.backWebsite}>catapultfr.com</Text>
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
