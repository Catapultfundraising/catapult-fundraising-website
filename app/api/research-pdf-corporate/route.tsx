import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  pdfStyles,
  HeaderFooter,
  HeroBand,
  FieldRow,
  IconGlyph,
  PersonPdfCard,
  fmtMoney,
} from "@/lib/profile-pdf-kit";

export const runtime = "nodejs";

function CorporateDocument({ data }: { data: any }) {
  const givingRows: Array<[string, string]> = ([
    ["First Gift Amount", fmtMoney(data.firstGiftAmount)],
    ["Last Gift Amount", fmtMoney(data.lastGiftAmount)],
    ["Largest Gift Amount", fmtMoney(data.largestGiftAmount)],
  ] as Array<[string, string]>).filter(([, v]) => v);

  const revenueValue = data.revenueAmount
    ? `${fmtMoney(data.revenueAmount)}${data.revenueYear ? ` (${data.revenueYear})` : ""}`
    : "";
  const netAssetsValue = data.foundationNetAssetsAmount
    ? `${fmtMoney(data.foundationNetAssetsAmount)}${data.foundationNetAssetsYear ? ` (${data.foundationNetAssetsYear})` : ""}`
    : "";

  const hasFoundation = Boolean(
    data.foundationName || data.foundationAddress || data.foundationPhone || data.foundationEmail || data.foundationWebsite || netAssetsValue
  );

  const [firstPerson, ...restPeople] = data.keyPeople || [];

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <HeaderFooter data={data} />
        <HeroBand data={data} eyebrow="CORPORATE INTELLIGENCE PROFILE" />

        <View style={pdfStyles.body}>
          <View wrap={false}>
            <View style={pdfStyles.sectionAccent} />
            <Text style={pdfStyles.sectionHeading}>Company Overview</Text>
            <FieldRow label="Address" value={data.address} />
          </View>
          <FieldRow label="Phone" value={data.phone} />
          <FieldRow label="Website" value={data.website} />
          <FieldRow label="Relationship to Client" value={data.relationshipToOrg} />

          {givingRows.length > 0 && (
            <View style={[pdfStyles.wealthPanel, { paddingBottom: 6 }]} wrap={false}>
              <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#B28C46", letterSpacing: 0.5, marginBottom: 8 }}>
                GIVING HISTORY TO CLIENT
              </Text>
              {/* Stat-box style (label above value, no fixed label width) rather
                  than the wealthCell pattern -- wealthCell's 150pt label column
                  is sized for 2-across rows and overlapped the value text badly
                  when squeezed into 3 columns here. */}
              <View style={{ flexDirection: "row" }}>
                {givingRows.map(([label, value], i) => (
                  <View style={{ flex: 1, marginLeft: i > 0 ? 10 : 0 }} key={label}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                      <IconGlyph name="gift" color="#B28C46" size={8} />
                      <Text style={{ color: "#B28C46", fontSize: 6, marginLeft: 4, textTransform: "uppercase" }}>{label}</Text>
                    </View>
                    <Text style={{ color: "#15212E", fontFamily: "Helvetica-Bold", fontSize: 10 }}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {revenueValue && (
            <View style={pdfStyles.statBoxRow}>
              <View style={pdfStyles.statBox}>
                <View style={pdfStyles.statBoxLabelRow}>
                  <IconGlyph name="dollar" color="#B28C46" size={11} />
                  <Text style={pdfStyles.statBoxLabel}>Company Revenue</Text>
                </View>
                <Text style={pdfStyles.statBoxValue}>{revenueValue}</Text>
              </View>
            </View>
          )}

          <FieldRow label="Company Heritage" value={data.companyHeritage} />
          <FieldRow label="Key Information" value={data.keyInformation} />
          <FieldRow label="Products and Operations" value={data.productsOperations} />
          <FieldRow label="Values" value={data.values} />

          {data.keyPeople?.length > 0 && (
            <View>
              <View wrap={false}>
                <View style={[pdfStyles.sectionHeadingRow, pdfStyles.sectionHeading]}>
                  <IconGlyph name="users" color="#15212E" size={12} />
                  <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#15212E", marginLeft: 5 }}>Key People</Text>
                </View>
                <PersonPdfCard person={firstPerson} />
              </View>
              {restPeople.map((p: any, i: number) => (
                <PersonPdfCard key={i} person={p} />
              ))}
            </View>
          )}

          <FieldRow label="Corporate Giving" value={data.corporateGiving} />

          {hasFoundation && (
            <View wrap={false}>
              <View style={pdfStyles.sectionAccent} />
              <Text style={pdfStyles.sectionHeading}>Company Foundation</Text>
              <FieldRow label="Foundation Name" value={data.foundationName} />
              <FieldRow label="Address" value={data.foundationAddress} />
              <FieldRow label="Phone" value={data.foundationPhone} />
              <FieldRow label="Email" value={data.foundationEmail} />
              <FieldRow label="Website" value={data.foundationWebsite} />
              <FieldRow label="Net Assets" value={netAssetsValue} />
            </View>
          )}

          <FieldRow label="Company Affiliations" value={data.companyAffiliations} />
          <FieldRow label="Relevant Findings" value={data.relevantFindings} />
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const buffer = await renderToBuffer(<CorporateDocument data={data} />);
    const fileName = `${(data?.name || "Corporate_Intelligence_Profile").replace(/[^a-z0-9]+/gi, "_")}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("research-pdf-corporate error", err);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
