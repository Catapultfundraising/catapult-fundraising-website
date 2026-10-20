import { Document, Page, View, Text } from "@react-pdf/renderer";
import { BrandFooter, BrandHeader, bs, registerBrandFonts } from "@/lib/jag-brand-pdf";
import type { ExportCol, ExportSection } from "@/lib/jag-brand-xlsx";

// Generic branded table PDF (same look as the dashboard table exports). Each section may carry its own columns.
export interface PdfSection extends ExportSection { cols?: ExportCol[] }
function fmt(v: string | number | null | undefined, kind?: string) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v !== "number") return String(v);
  if (kind === "usd") return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (kind === "num") return v.toLocaleString("en-US");
  return String(v);
}
export async function renderTablePdf(o: { title: string; eyebrow: string; subtitle: string; client: string; cols: ExportCol[]; sections: PdfSection[]; notes?: string[]; landscape?: boolean }) {
  registerBrandFonts();
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const landscape = o.landscape ?? o.cols.length > 6;
  const contentW = (landscape ? 792 : 612) - 72;
  const widthsFor = (cols: ExportCol[], rows: ExportSection["rows"]) => {
    const w = cols.map((c, i) => { let x = c.label.length; for (const r of rows.slice(0, 200)) x = Math.max(x, fmt(r[i], c.kind).length); return Math.min(60, Math.max(5, x)); });
    const sum = w.reduce((a, x) => a + x, 0);
    return w.map((x) => (x / sum) * contentW);
  };
  const doc = (
    <Document title={o.title} author="Catapult Fundraising">
      <Page size="LETTER" orientation={landscape ? "landscape" : "portrait"} style={bs.page}>
        <BrandHeader client={o.client} />
        <Text style={bs.eyebrow}>{o.eyebrow}</Text>
        <Text style={bs.title}>{o.title}</Text>
        <Text style={bs.meta}>{o.subtitle}</Text>
        {o.sections.map((s, si) => {
          const cols = s.cols ?? o.cols; const widths = widthsFor(cols, s.rows);
          return (
            <View key={si} style={{ marginTop: 10 }}>
              {s.heading && <View style={bs.band} wrap={false} minPresenceAhead={30}><Text style={bs.bandText}>{s.heading}</Text></View>}
              <View style={bs.thead} wrap={false}>{cols.map((c, i) => <Text key={i} style={[bs.th, { width: widths[i], textAlign: c.kind && c.kind !== "text" ? "right" : "left" }]}>{c.label}</Text>)}</View>
              {s.rows.map((r, ri) => (
                <View key={ri} style={ri % 2 ? bs.trAlt : bs.tr} wrap={false}>
                  {cols.map((c, i) => <Text key={i} style={[bs.td, { width: widths[i], textAlign: c.kind && c.kind !== "text" ? "right" : "left" }]}>{fmt(r[i], c.kind)}</Text>)}
                </View>
              ))}
              {!s.rows.length && <Text style={bs.footnote}>None.</Text>}
            </View>
          );
        })}
        {(o.notes ?? []).map((n, i) => <Text key={i} style={bs.footnote}>{n}</Text>)}
        <BrandFooter />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
