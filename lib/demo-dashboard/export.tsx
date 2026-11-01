// Catapult brand colours: navy #0E1E31, brass #B28C46, slate #5A6675, rule #DCE1E7.
// Browser-side Excel/PDF downloads for the fictional sample dashboard. No server calls.
import { DEMO_ORG_LABEL } from "./data";

export const SAMPLE_MARK = "SAMPLE - fictional demo data";
export type Cell = string | number;
export interface ExportTable { title: string; subtitle?: string; cols: { label: string; money?: boolean }[]; rows: Cell[][] }

/** Rows of the Excel sheet: watermark and title lines first, then the header and data. Exported for tests. */
export function sheetRows(t: ExportTable): Cell[][] {
  return [[SAMPLE_MARK], [`${DEMO_ORG_LABEL} - ${t.title}`], ...(t.subtitle ? [[t.subtitle]] : []), [], t.cols.map((c) => c.label), ...t.rows];
}

export async function xlsxBlob(t: ExportTable): Promise<Blob> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(sheetRows(t));
  const head = t.subtitle ? 4 : 3;
  t.cols.forEach((c, ci) => {
    if (!c.money) return;
    for (let r = 0; r < t.rows.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r: head + 1 + r, c: ci })];
      if (cell && typeof cell.v === "number") cell.z = "$#,##0";
    }
  });
  ws["!cols"] = t.cols.map((c) => ({ wch: Math.max(12, c.label.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sample data");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const fmtCell = (v: Cell, money?: boolean) => (typeof v === "number" && money ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : typeof v === "number" ? v.toLocaleString("en-US") : v);

export async function pdfBlob(t: ExportTable): Promise<Blob> {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const s = StyleSheet.create({
    page: { padding: 28, fontSize: 8, fontFamily: "Helvetica", color: "#0E1E31" },
    mark: { position: "absolute", top: 300, left: 60, fontSize: 48, color: "#B28C46", opacity: 0.15, transform: "rotate(-30deg)" },
    band: { backgroundColor: "#0E1E31", color: "#FFFFFF", padding: 8, marginBottom: 8 },
    row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#DCE1E7", paddingVertical: 3 },
    th: { flexDirection: "row", backgroundColor: "#0E1E31", color: "#FFFFFF", paddingVertical: 4 },
    cell: { flex: 1, paddingHorizontal: 3 },
  });
  const doc = (
    <Document title={`${t.title} (sample)`}>
      <Page size="LETTER" orientation={t.cols.length > 6 ? "landscape" : "portrait"} style={s.page}>
        <Text fixed style={s.mark}>SAMPLE DATA</Text>
        <View style={s.band}>
          <Text style={{ fontSize: 7, color: "#B28C46" }}>{SAMPLE_MARK.toUpperCase()}</Text>
          <Text style={{ fontSize: 13, marginTop: 2 }}>{t.title}</Text>
          <Text style={{ fontSize: 8, marginTop: 2 }}>{DEMO_ORG_LABEL}{t.subtitle ? ` · ${t.subtitle}` : ""}</Text>
        </View>
        <View style={s.th} fixed>{t.cols.map((c, i) => <Text key={i} style={[s.cell, c.money ? { textAlign: "right" } : {}]}>{c.label}</Text>)}</View>
        {t.rows.map((r, ri) => (
          <View key={ri} style={s.row} wrap={false}>{r.map((v, ci) => <Text key={ci} style={[s.cell, t.cols[ci]?.money ? { textAlign: "right" } : {}]}>{String(fmtCell(v, t.cols[ci]?.money))}</Text>)}</View>
        ))}
        <Text fixed style={{ position: "absolute", bottom: 14, left: 28, fontSize: 7, color: "#5A6675" }} render={({ pageNumber, totalPages }) => `${SAMPLE_MARK} · Prepared by Catapult Fundraising · Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
  return pdf(doc).toBlob();
}

export async function downloadTable(t: ExportTable, format: "xlsx" | "pdf") {
  const blob = format === "xlsx" ? await xlsxBlob(t) : await pdfBlob(t);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SAMPLE ${t.title.replace(/[^\w\s-]/g, "")}.${format}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
