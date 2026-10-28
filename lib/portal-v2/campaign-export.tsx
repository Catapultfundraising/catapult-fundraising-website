import { NextResponse } from "next/server";
import { Document, Page, View, Text, renderToBuffer } from "@react-pdf/renderer";
import { PORTAL_V2, campaignByLevel, type PortalClient, type PortalGift } from "@/lib/portal-v2/clients";
import { buildBrandedXlsx, type ExportCol } from "@/lib/jag-brand-xlsx";
import { BrandHeader, BrandFooter, bs, preparedOn, registerBrandFonts } from "@/lib/wcbhc-brand-pdf";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const METHOD = "Campaign total includes gifts and pledges. Each donor is credited with the larger of total pledged or total given, so payments against a pledge are not counted twice.";
type Cell = string | number | null;

/** One model for both downloads, using exactly the same aggregation as the dashboard. */
export function campaignExportModel(client: PortalClient, goal: number, gifts: PortalGift[]) {
  const c = campaignByLevel(PORTAL_V2[client].chart(goal), gifts);
  const belowLabel = c.levels.length ? `Below ${usd(Math.min(...c.levels.map((l) => l.level)))}` : "Below chart";
  const summary: Cell[][] = c.levels.map((l) => [usd(l.level), l.gifts, l.secured, l.remaining, l.value, l.securedValue, l.remainingValue]);
  summary.push([belowLabel, null, c.below.length, null, null, c.belowValue, null]);
  summary.push(["Total", null, c.donors.length, null, goal, c.raised, Math.max(0, goal - c.raised)]);
  const donors: Cell[][] = c.donors.map((d) => [d.level === null ? belowLabel : usd(d.level), d.name, d.cptid, d.pledges, d.gifts, d.credit]);
  return { c, summary, donors };
}

function PdfTable({ headers, rows, widths, money = [] }: { headers: string[]; rows: Cell[][]; widths: number[]; money?: number[] }) {
  return <View>
    <View style={{ flexDirection: "row", backgroundColor: "#0E1E31" }} fixed>
      {headers.map((h, i) => <Text key={h} style={{ ...bs.th, width: `${widths[i]}%` }}>{h}</Text>)}
    </View>
    {rows.map((row, ri) => <View key={ri} wrap={false} style={{ flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#DCE1E7", backgroundColor: ri % 2 ? "#F5F2EC" : "#FFFFFF" }}>
      {row.map((v, i) => <Text key={i} style={{ ...bs.td, width: `${widths[i]}%`, textAlign: i === 0 || (headers[i] === "Donor") ? "left" : "right" }}>{v === null ? "" : money.includes(i) && typeof v === "number" ? usd(v) : String(v)}</Text>)}
    </View>)}
  </View>;
}

export async function campaignDownload(client: PortalClient, goal: number, gifts: PortalGift[], format: "pdf" | "xlsx") {
  const short = client.toUpperCase();
  const { c, summary, donors } = campaignExportModel(client, goal, gifts);
  const date = preparedOn();
  const title = "Campaign Donors by Gift Chart Level";
  const subtitle = `${short} | Goal ${usd(goal)} | Secured ${usd(c.raised)} (${(100 * c.raised / goal).toFixed(1)}%) | ${date}`;
  const totals = `Given: ${usd(c.totalGifts)} | Pledged: ${usd(c.totalPledges)} | Campaign total: ${usd(c.raised)} | Donors: ${c.donors.length}`;
  const file = `${short} Campaign Donors by Gift Chart Level ${new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })}.${format}`;
  let buffer: Buffer;
  if (format === "xlsx") {
    const cols: ExportCol[] = [{ label: "Gift level" }, { label: "Gifts needed", kind: "num" }, { label: "Secured", kind: "num" }, { label: "Remaining", kind: "num" }, { label: "Level total", kind: "usd" }, { label: "Secured dollars", kind: "usd" }, { label: "Remaining dollars", kind: "usd" }];
    buffer = await buildBrandedXlsx({
      title, subtitle, client: short, cols, sections: [{ rows: summary }], notes: [totals, METHOD],
      extraSheets: [{ name: "Donors by level", cols: [{ label: "Gift level" }, { label: "Donor" }, { label: "CPTID", kind: "num" }, { label: "Pledged", kind: "usd" }, { label: "Given", kind: "usd" }, { label: "Campaign credit", kind: "usd" }], rows: donors }],
    });
  } else {
    registerBrandFonts();
    buffer = await renderToBuffer(<Document title={`${short} ${title}`} author="Catapult Fundraising">
      <Page size="LETTER" orientation="landscape" style={{ ...bs.page, color: "#0E1E31" }}>
        <BrandHeader client={short} /><BrandFooter />
        <Text style={bs.title}>{title}</Text><Text style={bs.meta}>{subtitle}</Text>
        <Text style={bs.intro}>{totals}</Text><Text style={{ ...bs.footnote, marginBottom: 12 }}>{METHOD}</Text>
        <PdfTable headers={["Gift level", "Gifts needed", "Secured", "Remaining", "Level total", "Secured $", "Remaining $"]} rows={summary} widths={[19, 11, 10, 10, 17, 17, 16]} money={[4, 5, 6]} />
      </Page>
      <Page size="LETTER" orientation="landscape" style={{ ...bs.page, color: "#0E1E31" }}>
        <BrandHeader client={short} /><BrandFooter />
        <Text style={bs.title}>Donors by Gift Chart Level</Text><Text style={{ ...bs.meta, marginBottom: 12 }}>{subtitle}</Text>
        {donors.length ? <PdfTable headers={["Gift level", "Donor", "CPTID", "Pledged", "Given", "Campaign credit"]} rows={donors} widths={[17, 31, 10, 14, 14, 14]} money={[3, 4, 5]} /> : <Text style={bs.intro}>No campaign gifts or pledges recorded.</Text>}
      </Page>
    </Document>);
  }
  return new NextResponse(new Uint8Array(buffer), { headers: {
    "content-type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content-disposition": `attachment; filename="${file}"`, "cache-control": "private, no-store",
  } });
}
