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
  buildProfilePdfFileName,
} from "@/lib/profile-pdf-kit";

export const runtime = "nodejs";

// Sections flow continuously, exactly like the Individual PDF -- no forced
// page breaks (`break`) between sections. Only the section heading + the
// FIRST item of a list (executive card, table row) are grouped into one
// wrap={false} block, so the heading is never orphaned alone at the bottom
// of a page with its content pushed to the next page. Everything else flows
// naturally, which also means content that fits (e.g. the first executive)
// stays on the same page as the section above it instead of always jumping
// to a fresh page and leaving a mostly-empty page behind.
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
            <View>
              {/* See app/api/research-pdf-corporate/route.tsx for why this is
                  conditional: grouping the heading with a long-bio first card
                  in one wrap={false} block reproduces the FieldRow/MiniTable
                  overlap bug when the combined block doesn't fit the
                  remaining page space. */}
              {(firstExec?.bio?.length || 0) > 400 ? (
                <>
                  <View wrap={false}>
                    <SectionHeading icon="users" title="Executives" />
                  </View>
                  <PersonPdfCard person={firstExec} />
                </>
              ) : (
                <View wrap={false}>
                  <SectionHeading icon="users" title="Executives" />
                  <PersonPdfCard person={firstExec} />
                </View>
              )}
              {restExecs.map((p: any, i: number) => (
                <PersonPdfCard key={i} person={p} />
              ))}
            </View>
          )}

          {hasMissionBackground && (
            <View wrap={false}>
              <SectionHeading icon="building" title="Mission & Background" />
            </View>
          )}
          <FieldRow label="Mission and Purpose" value={data.missionPurpose} />
          <FieldRow label="History" value={data.history} />
          <FieldRow label="Officers and Directors" value={data.officersDirectors} />
          <FieldRow label="Financial Data" value={data.financialData} />

          {hasGrantmakingFocus && (
            <View wrap={false}>
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
            <View wrap={false}>
              <SectionHeading icon="mail" title="Application Process" />
            </View>
          )}
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
    const fileName = buildProfilePdfFileName(data?.clientProfiler, data?.name, data?.dateCreated, "Foundation Intelligence Profile");
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
