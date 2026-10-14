import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { BrandFooter, BrandHeader, bs, preparedOn, registerBrandFonts } from "@/lib/csnf-brand-pdf";
import { buildBrandedXlsx, type ExportCol, type ExportSection } from "@/lib/csnf-brand-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CLIENT = "College of Southern Nevada Foundation";

function fmt(v: string | number | null, kind?: string) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v !== "number") return String(v);
  if (kind === "usd") return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (kind === "pct") return `${v}%`;
  if (kind === "num") return v.toLocaleString("en-US");
  return String(v);
}

// Branded PDF/Excel for any table on the CSNF data portal.
// Body: { format: "pdf"|"xlsx", title, subtitle?, cols: ExportCol[], sections: ExportSection[], notes?: string[] }
export async function POST(req: NextRequest) {
  if (!(await isCsnfDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json()) as { format: "pdf" | "xlsx"; title: string; subtitle?: string; cols: ExportCol[]; sections: ExportSection[]; notes?: string[] };
  const title = String(b.title || "CSNF Report").slice(0, 120);
  const subtitle = `${b.subtitle ? b.subtitle + " · " : ""}${CLIENT} · Prepared ${preparedOn()}`;
  const total = b.sections.reduce((s, x) => s + x.rows.length, 0);
  const file = `CSNF ${title.replace(/[^A-Za-z0-9 .,+-]/g, " ").replace(/\s+/g, " ").trim()}`;
  if (b.format === "xlsx") {
    const buf = await buildBrandedXlsx({ title, subtitle, client: CLIENT, cols: b.cols, sections: b.sections, notes: b.notes });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${file}.xlsx"`,
      },
    });
  }
  registerBrandFonts();
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const landscape = b.cols.length > 6;
  const contentW = (landscape ? 792 : 612) - 72;
  // Column widths from content length, capped so long text wraps.
  const weights = b.cols.map((c, i) => {
    let w = c.label.length;
    for (const s of b.sections) for (const r of s.rows.slice(0, 200)) w = Math.max(w, fmt(r[i], c.kind).length);
    return Math.min(36, Math.max(6, w));
  });
  const sum = weights.reduce((a, x) => a + x, 0);
  const widths = weights.map((w) => (w / sum) * contentW);
  const Head = () => (
    <View style={bs.thead} fixed>
      {b.cols.map((c, i) => (
        <Text key={i} style={[bs.th, { width: widths[i], textAlign: c.kind && c.kind !== "text" ? "right" : "left" }]}>{c.label}</Text>
      ))}
    </View>
  );
  const doc = (
    <Document title={title} author="Catapult Fundraising">
      <Page size="LETTER" orientation={landscape ? "landscape" : "portrait"} style={bs.page}>
        <BrandHeader client={CLIENT} />
        <Text style={bs.eyebrow}>CSN Foundation</Text>
        <Text style={bs.title}>{title}</Text>
        <Text style={bs.meta}>{subtitle} · {total.toLocaleString("en-US")} rows</Text>
        <View style={{ marginTop: 10 }}>
          <Head />
          {b.sections.map((s, si) => (
            <View key={si}>
              {s.heading && (
                <View style={bs.band} wrap={false} minPresenceAhead={30}>
                  <Text style={bs.bandText}>{s.heading}</Text>
                </View>
              )}
              {s.rows.map((r, ri) => (
                <View key={ri} style={ri % 2 ? bs.trAlt : bs.tr} wrap={false}>
                  {b.cols.map((c, i) => (
                    <Text key={i} style={[bs.td, { width: widths[i], textAlign: c.kind && c.kind !== "text" ? "right" : "left" }]}>{fmt(r[i], c.kind)}</Text>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>
        {(b.notes ?? []).map((n, i) => (
          <Text key={i} style={bs.footnote}>{n}</Text>
        ))}
        <BrandFooter />
      </Page>
    </Document>
  );
  const buf = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file}.pdf"` },
  });
}
