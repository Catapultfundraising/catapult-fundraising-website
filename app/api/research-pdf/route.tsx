import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, Svg, Path, Rect, Polygon } from "@react-pdf/renderer";

export const runtime = "nodejs";

// Light/white Catapult Fundraising logo variant, matching the one used on the
// live site's navy footer, so it blends cleanly into the navy header bar here.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3b507e74-308f-4ba5-aaac-554b31247f7e.png";

function fmtMoney(value?: string): string {
  if (!value) return "";
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return value;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return value;
  const hasCents = cleaned.includes(".") && !Number.isInteger(n);
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`;
}


// Palette matches the one-sheets' brand system exactly (build.py CSS vars).
const NAVY = "#15212E";
const NAVY_DEEP = "#0C131C";
const BRASS = "#B28C46";
const BRASS_LIGHT = "#CDAA6E";
const PAPER = "#FAF7F0";
const CREAM = "#FFFFFF";
const INK = "#181B19";
const MUTED = "#5C5D59";
const LINE = "#D6CDBA";

const styles = StyleSheet.create({
  page: { paddingTop: 20, paddingBottom: 42, paddingHorizontal: 0, fontSize: 9.3, color: INK, fontFamily: "Helvetica", backgroundColor: PAPER },
  body: { paddingHorizontal: 40 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: NAVY_DEEP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },
  topBarContinuedText: { color: PAPER, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  topBarText: { color: "rgba(250,247,240,0.75)", fontSize: 7 },
  topBarConfidential: { color: BRASS_LIGHT, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 },
  heroBand: {
    position: "relative",
    backgroundColor: NAVY,
    paddingHorizontal: 40,
    paddingTop: 22,
    paddingBottom: 22,
    marginTop: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLogo: { height: 26, width: 39, marginBottom: 10 },
  heroEyebrow: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 2, textTransform: "uppercase", color: BRASS_LIGHT },
  heroTitle: { fontSize: 25, fontFamily: "Helvetica-Bold", color: PAPER, marginTop: 6, maxWidth: 420 },
  heroPhoto: { width: 74, height: 74, borderRadius: 37, borderWidth: 2, borderColor: BRASS_LIGHT, objectFit: "cover" },
  heroPhotoPlaceholder: { width: 74, height: 74, borderRadius: 37, borderWidth: 2, borderColor: BRASS_LIGHT, backgroundColor: "rgba(250,247,240,0.12)" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY_DEEP,
    textAlign: "left",
    paddingVertical: 8,
    paddingHorizontal: 40,
  },
  footerText: { fontSize: 6.3, color: "rgba(250,247,240,0.65)", marginBottom: 2 },
  sectionHeading: { fontSize: 13, color: NAVY, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 8 },
  sectionAccent: { width: 26, height: 3, backgroundColor: BRASS, marginBottom: 5, borderRadius: 1.5 },
  wealthPanel: { backgroundColor: NAVY, borderRadius: 10, padding: 12, marginBottom: 16 },
  wealthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  wealthLabelRow: { flexDirection: "row", alignItems: "center" },
  wealthLabel: { color: PAPER, fontSize: 10, marginLeft: 6 },
  wealthValue: { color: BRASS_LIGHT, fontFamily: "Helvetica-Bold", fontSize: 11 },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 8 },
  fieldLabel: { width: 150, flexShrink: 0, fontSize: 8.2, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, lineHeight: 1.3, textTransform: "uppercase" },
  fieldValue: { flex: 1, fontSize: 9.6, color: INK, lineHeight: 1.4 },
  cardWhite: { backgroundColor: CREAM, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 10, marginBottom: 12 },
  nameHeading: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: NAVY, borderRadius: 4 },
  tableHeaderCell: { color: PAPER, fontSize: 7.6, fontFamily: "Helvetica-Bold", padding: 6, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 0.5, borderBottomColor: LINE },
  tableCell: { fontSize: 8.8, padding: 6, color: INK, lineHeight: 1.3 },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center" },
  askBox: { backgroundColor: CREAM, borderWidth: 1, borderColor: LINE, borderLeftWidth: 4, borderLeftColor: BRASS, borderRadius: 10, padding: 12, marginTop: 16 },
  askLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 1, textTransform: "uppercase" },
  askValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 4 },
  propertyCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, backgroundColor: CREAM, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 9 },
  propertyPhoto: { width: 88, height: 64, borderRadius: 6, marginRight: 10, objectFit: "cover" },
  italicNote: { fontSize: 7.4, color: MUTED, fontStyle: "italic", marginBottom: 10 },
});

type IconName = "home" | "dollar" | "chart" | "gift" | "star" | "phone" | "mail" | "users" | "graduationCap";

function IconGlyph({ name, color = BRASS, size = 10 }: { name: IconName; color?: string; size?: number }) {
  const common = { stroke: color, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...common} />
          <Path d="M9 22V12h6v10" {...common} />
        </Svg>
      );
    case "dollar":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Path d="M12 2v20" {...common} />
          <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" {...common} />
        </Svg>
      );
    case "chart":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Path d="M3 3v18h18" {...common} />
          <Path d="M18 9l-5 5-4-4-4 4" {...common} />
        </Svg>
      );
    case "gift":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Rect x="3" y="8" width="18" height="4" {...common} />
          <Path d="M12 8v13" {...common} />
          <Path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" {...common} />
          <Path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" {...common} />
        </Svg>
      );
    case "star":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" {...common} />
        </Svg>
      );
    case "phone":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" {...common} />
        </Svg>
      );
    case "mail":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Rect x="2" y="4" width="20" height="16" rx="2" {...common} />
          <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" {...common} />
        </Svg>
      );
    case "users":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...common} />
          <Path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" {...common} />
          <Path d="M22 21v-2a4 4 0 0 0-3-3.87" {...common} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...common} />
        </Svg>
      );
    case "graduationCap":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Path d="M22 10 12 5 2 10l10 5 10-5Z" {...common} />
          <Path d="M6 12v5c3 3 9 3 12 0v-5" {...common} />
        </Svg>
      );
    default:
      return null;
  }
}

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
  icon,
  headers,
  colWidths,
  rows,
  renderRow,
}: {
  title?: string;
  icon?: IconName;
  headers: string[];
  colWidths: string[];
  rows: any[];
  renderRow: (row: any, i: number) => string[];
}) {
  if (!rows || rows.length === 0) return null;
  return (
    <View style={{ marginBottom: 10 }} wrap={false}>
      {title ? (
        <View style={[styles.sectionHeadingRow, { marginBottom: 4 }]}>
          {icon ? <IconGlyph name={icon} color={BRASS} size={9} /> : null}
          <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, marginLeft: icon ? 4 : 0 }}>
            {title.toUpperCase()}
          </Text>
        </View>
      ) : null}
      <View style={{ borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: LINE }}>
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
          <View style={[styles.tableRow, { backgroundColor: i % 2 === 1 ? PAPER : CREAM }]} key={i} wrap={false}>
            {cells.map((c, ci) => (
              <Text key={ci} style={[styles.tableCell, { width: colWidths[ci] }]}>
                {c}
              </Text>
            ))}
          </View>
        );
      })}
      </View>
    </View>
  );
}

function HeaderFooter({ data }: { data: any }) {
  const rightText = [data.dateCreated, data.clientProfiler].filter(Boolean).join("   •   ");
  return (
    <>
      <View
        style={styles.topBar}
        fixed
        render={({ pageNumber }) =>
          pageNumber === 1 ? (
            <>
              <Text style={styles.topBarConfidential}>CONFIDENTIAL</Text>
              <Text style={styles.topBarText}>{rightText || "Catapult Fundraising"}</Text>
            </>
          ) : (
            <>
              <Text style={styles.topBarContinuedText}>
                {(data.name || "Prospect").toString()} — Continued
              </Text>
              <Text style={styles.topBarText}>{rightText || "Catapult Fundraising"}</Text>
            </>
          )
        }
      />
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
  const wealthRows: Array<[string, string, IconName]> = ([
    ["Estimated Income", fmtMoney(data.estimatedIncome), "dollar"],
    ["Estimated Net Worth", fmtMoney(data.estimatedNetWorth), "dollar"],
    ["Stock Value", fmtMoney(data.stockValue), "chart"],
    ["Real Estate Value", fmtMoney(data.realEstateValue), "home"],
    ["# of Properties", data.realEstatePropertyCount, "home"],
    ["Estimated Giving Capacity — 5 Years", fmtMoney(data.givingCapacity), "gift"],
    ["Wealth Rating", data.wealthRating, "star"],
  ] as Array<[string, string, IconName]>).filter(([, v]) => v);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <HeaderFooter data={data} />

        <View style={styles.heroBand}>
          <View style={{ flex: 1 }}>
            <Image src={LOGO_URL} style={styles.heroLogo} />
            <Text style={styles.heroEyebrow}>PROSPECT INTELLIGENCE PROFILE</Text>
            <Text style={styles.heroTitle}>{data.name || "NAME"}</Text>
          </View>
          {data.photo ? (
            <Image src={data.photo} style={styles.heroPhoto} />
          ) : (
            <View style={styles.heroPhotoPlaceholder} />
          )}
        </View>

        <View style={styles.body}>

        {wealthRows.length > 0 && (
          <View style={styles.wealthPanel}>
            {wealthRows.map(([label, value, icon]) => (
              <View style={styles.wealthRow} key={label}>
                <View style={styles.wealthLabelRow}>
                  <IconGlyph name={icon} color={BRASS_LIGHT} size={10} />
                  <Text style={styles.wealthLabel}>{label}</Text>
                </View>
                <Text style={styles.wealthValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        <FieldRow label="Catapult ID Number" value={data.catapultId} />
        <FieldRow label="Client ID Number" value={data.clientId} />
        <MiniTable
          title="Phone Numbers"
          icon="phone"
          headers={["TYPE", "NUMBER"]}
          colWidths={["30%", "70%"]}
          rows={data.phones}
          renderRow={(row: any) => [resolveContactType(row), row.number || ""]}
        />
        <MiniTable
          title="Email Addresses"
          icon="mail"
          headers={["TYPE", "EMAIL"]}
          colWidths={["30%", "70%"]}
          rows={data.emails}
          renderRow={(row: any) => [resolveContactType(row), row.address || ""]}
        />
        <FieldRow label="Born" value={data.born} />
        <FieldRow label="Marital Status" value={data.maritalStatus} />
        <MiniTable
          title="Children"
          icon="users"
          headers={["NAME", "AGE", "OTHER INFORMATION"]}
          colWidths={["25%", "15%", "60%"]}
          rows={data.childrenRows}
          renderRow={(row: any) => [row.name || "", row.age || "", row.otherInfo || ""]}
        />
        <MiniTable
          title="Education"
          icon="graduationCap"
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
          renderRow={(row: any) => [row.year || "", fmtMoney(row.amount), row.comments || ""]}
        />

        {data.realEstate?.length > 0 && (
          <>
            <View style={[styles.sectionHeadingRow, styles.sectionHeading]}>
              <IconGlyph name="home" color={NAVY} size={12} />
              <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginLeft: 5 }}>Real Estate</Text>
            </View>
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
                  {re.value ? <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BRASS, marginBottom: 2 }}>{fmtMoney(re.value)}</Text> : null}
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
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <HeaderFooter data={data} />
        <View style={[styles.body, { paddingTop: 30 }]}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionHeading}>Boards &amp; Affiliations</Text>
        <FieldRow label="Boards" value={data.boards} />
        <FieldRow label="Clubs & Affiliations" value={data.clubsAffiliations} />
        <FieldRow label="Business Colleagues" value={data.businessColleagues} />

        {data.otherGiving?.length > 0 && (
          <>
            <View style={styles.sectionAccent} />
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
                <Text style={[styles.tableCell, { width: "18%" }]}>{fmtMoney(row.amount)}</Text>
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
                <Text style={[styles.tableCell, { width: "25%" }]}>{fmtMoney(row.amount)}</Text>
              </View>
            ))}
          </>
        )}

        {(data.totalCharitableGiving || data.nonPhilanthropicPoliticalGiving) && (
          <View style={{ marginTop: 18 }}>
            {data.totalCharitableGiving ? (
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6 }}>
                Total Charitable Giving: {fmtMoney(data.totalCharitableGiving)}
              </Text>
            ) : null}
            {data.nonPhilanthropicPoliticalGiving ? (
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY }}>
                Non-Philanthropic Political Giving: {fmtMoney(data.nonPhilanthropicPoliticalGiving)}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.askBox}>
          <Text style={styles.askLabel}>RECOMMENDED ASK AMOUNT</Text>
          <Text style={styles.askValue}>{data.recommendedAskAmount ? fmtMoney(data.recommendedAskAmount) : "TBD"}</Text>
        </View>
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
    const fileName = `${(data?.name || "Prospect_Intelligence_Profile").replace(/[^a-z0-9]+/gi, "_")}.pdf`;
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
