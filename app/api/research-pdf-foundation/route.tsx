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
  MiniTable,
  fmtMoney,
} from "@/lib/profile-pdf-kit";

export const runtime = "nodejs";

function FoundationDocument({ data }: { data: any }) {
  const [firstExec, ...restExecs] = data.executives || [];

  const hasMissionBackground = Boolean(
    data.missionPurpose || data.history || data.officersDirectors || data.financialData
  );
  const hasGrantmakingFocus = Boolean(
    data.geographicFocus ||
      data.fieldsOfInterest ||
      data.programAreas ||
      data.typesOfSupport ||
      data.potentialGrantRange ||
      data.limitations
  );
  const hasApplicationProcess = Boolean(data.dueDate || data.applicationInformation);

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <HeaderFooter data={data} />
        <HeroBand data={data} eyebrow="FOUNDATION INTELLIGENCE PROFILE" />

        <View style={pdfStyles.body}>
          {/* Foundation Overview starts right after the hero band on page 1 --
              every section after this one gets `break` so it always starts
              on a fresh page instead of continuing mid-page. */}
          <View wrap={false}>
            <SectionHeading title="Foundation Overview" />
            <FieldRow label="Address" value={data.address} />
          </View>
          <FieldRow label="Phone" value={data.phone} />
          <FieldRow label="Website" value={data.website} />
          <FieldRow label="Relationship to Client" value={data.relationshipToOrg} />
          <FieldRow label="EIN #" value={data.ein} />
          <FieldRow label="Giving History to Client" value={data.givingHistoryToClient} />

          {data.executives?.length > 0 && (
            <View break>
              <View wrap={false}>
                <SectionHeading icon="users" title="Executives" />
                <PersonPdfCard person={firstExec} />
              </View>
              {restExecs.map((p: any, i: number) => (
                <PersonPdfCard key={i} person={p} />
              ))}
            </View>
          )}

          {hasMissionBackground && (
            <View break wrap={false}>
              <SectionHeading icon="building" title="Mission & Background" />
            </View>
          )}
          <FieldRow label="Mission and Purpose" value={data.missionPurpose} />
          <FieldRow label="History" value={data.history} />
          <FieldRow label="Officers and Directors" value={data.officersDirectors} />
          <FieldRow label="Financial Data" value={data.financialData} />

          {hasGrantmakingFocus && (
            <View break wrap={false}>
              <SectionHeading icon="chart" title="Grantmaking Focus" />
            </View>
          )}
          <FieldRow label="Geographic Focus" value={data.geographicFocus} />
          <FieldRow label="Fields of Interest" value={data.fieldsOfInterest} />
          <FieldRow label="Program Areas" value={data.programAreas} />
          <FieldRow label="Types of Support" value={data.typesOfSupport} />
          <FieldRow label="Potential Grant Range" value={data.potentialGrantRange} />
          <FieldRow label="Limitations" value={data.limitations} />

          {hasApplicationProcess && (
            <View break wrap={false}>
              <SectionHeading icon="mail" title="Application Process" />
            </View>
          )}
          <FieldRow label="Due Date" value={data.dueDate} />
          <FieldRow label="Application Information" value={data.applicationInformation} />

          {data.selectedGrants?.length > 0 && (
            <View break>
              <MiniTable
                title="Selected Grants"
                bigTitle
                headers={["YEAR", "GRANTEE / NOTE", "AMOUNT"]}
                colWidths={["15%", "55%", "30%"]}
                rows={data.selectedGrants}
                renderRow={(row: any) => [row.year || "", row.grantee || "", fmtMoney(row.amount)]}
              />
            </View>
          )}
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
