import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  pdfStyles,
  HeaderFooter,
  HeroBand,
  FieldRow,
  IconGlyph,
  PersonPdfCard,
  MiniTable,
  fmtMoney,
} from "@/lib/profile-pdf-kit";

export const runtime = "nodejs";

function FoundationDocument({ data }: { data: any }) {
  const [firstExec, ...restExecs] = data.executives || [];

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <HeaderFooter data={data} />
        <HeroBand data={data} eyebrow="FOUNDATION INTELLIGENCE PROFILE" />

        <View style={pdfStyles.body}>
          <View wrap={false}>
            <View style={pdfStyles.sectionAccent} />
            <Text style={pdfStyles.sectionHeading}>Foundation Overview</Text>
            <FieldRow label="Address" value={data.address} />
          </View>
          <FieldRow label="Phone" value={data.phone} />
          <FieldRow label="Website" value={data.website} />
          <FieldRow label="Relationship to Client" value={data.relationshipToOrg} />
          <FieldRow label="Giving History to Client" value={data.givingHistoryToClient} />

          {data.executives?.length > 0 && (
            <View>
              <View wrap={false}>
                <View style={[pdfStyles.sectionHeadingRow, pdfStyles.sectionHeading]}>
                  <IconGlyph name="users" color="#15212E" size={12} />
                  <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#15212E", marginLeft: 5 }}>Executives</Text>
                </View>
                <PersonPdfCard person={firstExec} />
              </View>
              {restExecs.map((p: any, i: number) => (
                <PersonPdfCard key={i} person={p} />
              ))}
            </View>
          )}

          <FieldRow label="Mission and Purpose" value={data.missionPurpose} />
          <FieldRow label="History" value={data.history} />
          <FieldRow label="Officers and Directors" value={data.officersDirectors} />
          <FieldRow label="Financial Data" value={data.financialData} />
          <FieldRow label="Geographic Focus" value={data.geographicFocus} />
          <FieldRow label="Fields of Interest" value={data.fieldsOfInterest} />
          <FieldRow label="Program Areas" value={data.programAreas} />
          <FieldRow label="Types of Support" value={data.typesOfSupport} />
          <FieldRow label="Potential Grant Range" value={data.potentialGrantRange} />
          <FieldRow label="Limitations" value={data.limitations} />
          <FieldRow label="Due Date" value={data.dueDate} />
          <FieldRow label="Application Information" value={data.applicationInformation} />

          <MiniTable
            title="Selected Grants"
            bigTitle
            headers={["YEAR", "GRANTEE / NOTE", "AMOUNT"]}
            colWidths={["15%", "55%", "30%"]}
            rows={data.selectedGrants}
            renderRow={(row: any) => [row.year || "", row.grantee || "", fmtMoney(row.amount)]}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const buffer = await renderToBuffer(<FoundationDocument data={data} />);
    const fileName = `${(data?.name || "Foundation_Intelligence_Profile").replace(/[^a-z0-9]+/gi, "_")}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("research-pdf-foundation error", err);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
