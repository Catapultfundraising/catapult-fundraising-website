import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export const runtime = "nodejs";

// Current Catapult Fundraising logo, matching the live site header.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ccdcb7df-f854-4cf8-a390-1d9eb56ecd9d.png";


const NAVY = "#15212E";
const BRASS = "#B28C46";
const BRASS_LIGHT = "#C9A86A";
const CREAM = "#F7F3EA";
const INK = "#333333";
const MUTED = "#6B7280";
const LINE = "#D8D2C2";

const styles = StyleSheet.create({
  page: { paddingTop: 46, paddingBottom: 56, paddingHorizontal: 40, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },
  headerText: { color: "#FFFFFF", fontSize: 8 },
  headerConfidential: { color: BRASS_LIGHT, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    textAlign: "right",
  },
  footerText: { fontSize: 6.5, color: MUTED, marginBottom: 2 },
  logo: { width: 120, height: 80, marginBottom: 12 },
  eyebrow: { fontSize: 9, color: BRASS, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginBottom: 4 },
  title: { fontSize: 26, color: NAVY, fontFamily: "Helvetica-Bold", borderBottomWidth: 2, borderBottomColor: BRASS, paddingBottom: 8, marginBottom: 16 },
  sectionHeading: { fontSize: 13, color: NAVY, fontFamily: "Helvetica-Bold", borderBottomWidth: 1, borderBottomColor: LINE, paddingBottom: 4, marginTop: 20, marginBottom: 10 },
  wealthPanel: { backgroundColor: NAVY, borderRadius: 4, padding: 10, marginBottom: 16 },
  wealthRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  wealthLabel: { color: "#FFFFFF", fontSize: 10 },
  wealthValue: { color: BRASS_LIGHT, fontFamily: "Helvetica-Bold", fontSize: 11 },
  fieldRow: { flexDirection: "row", marginBottom: 10, borderBottomWidth: 0.5, borderBottomColor: "#C9C2B0", paddingBottom: 8 },
  fieldLabel: { width: 150, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5 },
  fieldValue: { flex: 1, fontSize: 10, color: INK, lineHeight: 1.4 },
  photoRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  photoCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: BRASS, objectFit: "cover" },
  photoPlaceholder: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: BRASS, backgroundColor: CREAM },
  nameHeading: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: NAVY },
  tableHeaderCell: { color: "#FFFFFF", fontSize: 8, fontFamily: "Helvetica-Bold", padding: 6, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE },
  tableCell: { fontSize: 9, padding: 6, color: INK },
  askBox: { backgroundColor: CREAM, borderWidth: 1, borderColor: BRASS, borderLeftWidth: 4, padding: 10, marginTop: 18 },
  askLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 1 },
  askValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 3 },
  propertyCard: { flexDirection: "row", marginBottom: 12, borderWidth: 0.5, borderColor: LINE, borderRadius: 4, padding: 8 },
  propertyPhoto: { width: 90, height: 66, borderRadius: 3, marginRight: 10, objectFit: "cover" },
  italicNote: { fontSize: 7.5, color: MUTED, fontStyle: "italic", marginBottom: 10 },
});

function FieldRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.fieldRow} wrap={false}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function resolveContactType(row: any): string {
  if (row?.type === "Other" && row?.customType) return row.customType;
  return row?.type || "";
}

function militaryValue(data: any): string {
  const branch = data.militaryBranch && data.militaryBranch !== "None" ? data.militaryBranch : "";
  const details = data.militaryDetails || "";
  if (!branch && !details) return "";
  if (branch && details) return `${branch} — ${details}`;
  return branch || details;
}

function MiniTable({
  title,
  headers,
  colWidths,
  rows,
  renderRow,
}: {
  title?: string;
  headers: string[];
  colWidths: string[];
  rows: any[];
  renderRow: (row: any, i: number) => string[];
}) {
  if (!rows || rows.length === 0) return null;
  return (
    <View style={{ marginBottom: 10 }} wrap={false}>
      {title ? (
        <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, marginBottom: 3 }}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={styles.tableHeaderRow}>
        {headers.map((h, i) => (
          <Text key={h} style={[styles.tableHeaderCell, { width: colWidths[i] }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => {
        const cells = renderRow(row, i);
        return (
          <View style={styles.tableRow} key={i} wrap={false}>
            {cells.map((c, ci) => (
              <Text key={ci} style={[styles.tableCell, { width: colWidths[ci] }]}>
                {c}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function HeaderFooter({ data }: { data: any }) {
  return (
    <>
      <View style={styles.headerBar} fixed>
        <Text style={styles.headerText}>{data.dateCreated || "(Date Created)"}</Text>
        <Text style={styles.headerConfidential}>CONFIDENTIAL</Text>
        <Text style={styles.headerText}>{data.clientProfiler || "Client Name / Profiler Initials"}</Text>
      </View>
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          This information has been compiled and presented by Catapult Fundraising as of{" "}
          {data.dateCreated || "(date)"}. It should be regarded as Confidential Information.
        </Text>
        <Text style={styles.footerText}>
          This document may contain information that is privileged, confidential, or otherwise
          protected from disclosure. Any review, dissemination, or use of this transmission or any
          of its contents by persons other than the addressee is strictly prohibited.
        </Text>
      </View>
    </>
  );
}

function ProfileDocument({ data }: { data: any }) {
  const wealthRows: Array<[string, string]> = ([
    ["Estimated Income", data.estimatedIncome],
    ["Estimated Net Worth", data.estimatedNetWorth],
    ["Stock Value", data.stockValue],
    ["Real Estate Value", data.realEstateValue],
    ["# of Properties", data.realEstatePropertyCount],
    ["Estimated Giving Capacity — 5 Years", data.givingCapacity],
    ["Wealth Rating", data.wealthRating],
  ] as Array<[string, string]>).filter(([, v]) => v);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <HeaderFooter data={data} />
        <Image src={LOGO_URL} style={styles.logo} />
        <Text style={styles.eyebrow}>PROSPECT RESEARCH PROFILE</Text>
        <Text style={styles.title}>{data.name || "NAME"}</Text>

        {wealthRows.length > 0 && (
          <View style={styles.wealthPanel}>
            {wealthRows.map(([label, value]) => (
              <View style={styles.wealthRow} key={label}>
                <Text style={styles.wealthLabel}>{label}</Text>
                <Text style={styles.wealthValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.photoRow}>
          {data.photo ? (
            <Image src={data.photo} style={styles.photoCircle} />
          ) : (
            <View style={styles.photoPlaceholder} />
          )}
          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BRASS, marginBottom: 2 }}>NAME(S)</Text>
            <Text style={styles.nameHeading}>{data.name || ""}</Text>
          </View>
        </View>

        <FieldRow label="Catapult ID Number" value={data.catapultId} />
        <FieldRow label="Client ID Number" value={data.clientId} />
        <MiniTable
          title="Phone Numbers"
          headers={["TYPE", "NUMBER"]}
          colWidths={["30%", "70%"]}
          rows={data.phones}
          renderRow={(row: any) => [resolveContactType(row), row.number || ""]}
        />
        <MiniTable
          title="Email Addresses"
          headers={["TYPE", "EMAIL"]}
          colWidths={["30%", "70%"]}
          rows={data.emails}
          renderRow={(row: any) => [resolveContactType(row), row.address || ""]}
        />
        <FieldRow label="Born" value={data.born} />
        <FieldRow label="Marital Status" value={data.maritalStatus} />
        <MiniTable
          title="Children"
          headers={["NAME", "AGE", "OTHER INFORMATION"]}
          colWidths={["25%", "15%", "60%"]}
          rows={data.childrenRows}
          renderRow={(row: any) => [row.name || "", row.age || "", row.otherInfo || ""]}
        />
        <MiniTable
          title="Education"
          headers={["INSTITUTION", "GRADUATION YEAR"]}
          colWidths={["70%", "30%"]}
          rows={data.educationEntries}
          renderRow={(row: any) => [row.institution || "", row.year || ""]}
        />
        <FieldRow label="Military Service" value={militaryValue(data)} />
        <FieldRow label="Religion" value={data.religion} />
        <FieldRow label="Hobbies & Interests" value={data.hobbiesInterests} />
        <FieldRow label="Relationship to Organization" value={data.relationshipToOrg} />
        <MiniTable
          title="Giving History to Organization"
          headers={["YEAR", "AMOUNT", "COMMENTS"]}
          colWidths={["15%", "20%", "65%"]}
          rows={data.givingHistoryRows}
          renderRow={(row: any) => [row.year || "", row.amount || "", row.comments || ""]}
        />

        {data.realEstate?.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Real Estate</Text>
            {data.realEstate.map((re: any, i: number) => (
              <View style={styles.propertyCard} key={i} wrap={false}>
                {re.photo ? (
                  <Image src={re.photo} style={styles.propertyPhoto} />
                ) : (
                  <View style={[styles.propertyPhoto, { backgroundColor: CREAM }]} />
                )}
                <View style={{ flex: 1 }}>
                  {re.address ? <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 }}>{re.address}</Text> : null}
                  {re.description ? <Text style={{ fontSize: 9, color: INK, marginBottom: 2 }}>{re.description}</Text> : null}
                  {re.value ? <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BRASS, marginBottom: 2 }}>{re.value}</Text> : null}
                  {re.purchaseInfo ? <Text style={{ fontSize: 8.5, color: MUTED }}>{re.purchaseInfo}</Text> : null}
                </View>
              </View>
            ))}
          </>
        )}

        <FieldRow label="Business Address(es) & Phone(s)" value={data.businessAddresses} />
        <FieldRow label="Family Foundation" value={data.familyFoundation} />
        <FieldRow label="Political Affiliation" value={data.politicalAffiliation} />
        <FieldRow label="Additional Information" value={data.additionalInformation} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <HeaderFooter data={data} />
        <Text style={styles.sectionHeading}>Boards &amp; Affiliations</Text>
        <FieldRow label="Boards" value={data.boards} />
        <FieldRow label="Clubs & Affiliations" value={data.clubsAffiliations} />
        <FieldRow label="Business Colleagues" value={data.businessColleagues} />

        {data.otherGiving?.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Other Giving History</Text>
            <Text style={styles.italicNote}>
              The amounts listed are representative of donations found in publicly available
              records and in donor history provided to Catapult. As such, the individual amounts
              will not necessarily total the Total Giving amount.
            </Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: "40%" }]}>RECIPIENT</Text>
              <Text style={[styles.tableHeaderCell, { width: "30%" }]}>GIVING</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>YEAR</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>AMOUNT</Text>
            </View>
            {data.otherGiving.map((row: any, i: number) => (
              <View style={styles.tableRow} key={i} wrap={false}>
                <Text style={[styles.tableCell, { width: "40%" }]}>{row.recipient}</Text>
                <Text style={[styles.tableCell, { width: "30%" }]}>{row.giving}</Text>
                <Text style={[styles.tableCell, { width: "12%" }]}>{row.year}</Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>{row.amount}</Text>
              </View>
            ))}
          </>
        )}

        {data.fecGiving?.length > 0 && (
          <>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BRASS, marginTop: 18, marginBottom: 8 }}>
              FEC RECIPIENT ORGANIZATION
            </Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: "55%" }]}>ORGANIZATION</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>YEAR</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>AMOUNT</Text>
            </View>
            {data.fecGiving.map((row: any, i: number) => (
              <View style={styles.tableRow} key={i} wrap={false}>
                <Text style={[styles.tableCell, { width: "55%" }]}>{row.org}</Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>{row.year}</Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>{row.amount}</Text>
              </View>
            ))}
          </>
        )}

        {(data.totalCharitableGiving || data.nonPhilanthropicPoliticalGiving) && (
          <View style={{ marginTop: 18 }}>
            {data.totalCharitableGiving ? (
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6 }}>
                Total Charitable Giving: {data.totalCharitableGiving}
              </Text>
            ) : null}
            {data.nonPhilanthropicPoliticalGiving ? (
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY }}>
                Non-Philanthropic Political Giving: {data.nonPhilanthropicPoliticalGiving}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.askBox}>
          <Text style={styles.askLabel}>RECOMMENDED ASK AMOUNT</Text>
          <Text style={styles.askValue}>{data.recommendedAskAmount || "TBD"}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const buffer = await renderToBuffer(<ProfileDocument data={data} />);
    const fileName = `${(data?.name || "Prospect_Research_Profile").replace(/[^a-z0-9]+/gi, "_")}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("research-pdf error", err);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
