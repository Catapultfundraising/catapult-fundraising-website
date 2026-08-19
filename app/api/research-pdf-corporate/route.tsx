import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  pdfStyles,
  HeaderFooter,
  HeroBand,
  FieldRow,
  SectionHeading,
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

  const hasCompanyBackground = Boolean(
    data.companyHeritage || data.keyInformation || data.productsOperations || data.values
  );
  const hasAffiliationsFindings = Boolean(data.companyAffiliations || data.relevantFindings);

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <HeaderFooter data={data} />
        <HeroBand data={data} eyebrow="CORPORATE INTELLIGENCE PROFILE" />

        <View style={pdfStyles.body}>
          {/* Company Overview is the first section on page 1 -- every
              section after this one gets `break` so it always starts on a
              fresh page instead of continuing mid-page. */}
          <View wrap={false}>
            <SectionHeading title="Company Overview" />
            <FieldRow label="Address" value={data.address} />
          </View>
          <FieldRow label="Phone" value={data.phone} />
          <FieldRow label="Website" value={data.website} />
          <FieldRow label="Relationship to Client" value={data.relationshipToOrg} />

          {givingRows.length > 0 && (
            <View break>
              <SectionHeading icon="dollar" title="Giving History to Client" />
              <View style={[pdfStyles.wealthPanel, { paddingBottom: 6 }]} wrap={false}>
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
            </View>
          )}

          {revenueValue && (
            <View break wrap={false}>
              <SectionHeading icon="dollar" title="Company Financials" />
              <View style={pdfStyles.statBoxRow}>
                <View style={pdfStyles.statBox}>
                  <View style={pdfStyles.statBoxLabelRow}>
                    <IconGlyph name="dollar" color="#B28C46" size={11} />
                    <Text style={pdfStyles.statBoxLabel}>Company Revenue</Text>
                  </View>
                  <Text style={pdfStyles.statBoxValue}>{revenueValue}</Text>
                </View>
              </View>
            </View>
          )}

          {hasCompanyBackground && (
            <View break wrap={false}>
              <SectionHeading icon="building" title="Company Background" />
            </View>
          )}
          <FieldRow label="Company Heritage" value={data.companyHeritage} />
          <FieldRow label="Key Information" value={data.keyInformation} />
          <FieldRow label="Products and Operations" value={data.productsOperations} />
          <FieldRow label="Values" value={data.values} />

          {data.keyPeople?.length > 0 && (
            <View break>
              <View wrap={false}>
                <SectionHeading icon="users" title="Key People" />
                <PersonPdfCard person={firstPerson} />
              </View>
              {restPeople.map((p: any, i: number) => (
                <PersonPdfCard key={i} person={p} />
              ))}
            </View>
          )}

          {data.corporateGiving && (
            <View break wrap={false}>
              <SectionHeading icon="gift" title="Corporate Giving" />
              <FieldRow label="Corporate Giving" value={data.corporateGiving} />
            </View>
          )}

          {hasFoundation && (
            <View break wrap={false}>
              <SectionHeading icon="star" title="Company Foundation" />
              <FieldRow label="Foundation Name" value={data.foundationName} />
              <FieldRow label="Address" value={data.foundationAddress} />
              <FieldRow label="Phone" value={data.foundationPhone} />
              <FieldRow label="Email" value={data.foundationEmail} />
              <FieldRow label="Website" value={data.foundationWebsite} />
              <FieldRow label="Net Assets" value={netAssetsValue} />
            </View>
          )}

          {hasAffiliationsFindings && (
            <View break wrap={false}>
              <SectionHeading icon="graduationCap" title="Company Affiliations & Findings" />
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
