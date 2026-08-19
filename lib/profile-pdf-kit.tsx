import { Document, Page, View, Text, Image, StyleSheet, Svg, Path, Rect, Polygon } from "@react-pdf/renderer";
import { parseFormattedText } from "@/lib/rich-text";
import type { PersonEntry } from "@/lib/profile-form-kit";

// Shared react-pdf building blocks for the Corporate and Foundation profile
// PDFs, factored out of the original Individual PDF renderer
// (app/api/research-pdf/route.tsx) so both new, shorter profile types get
// identical Catapult branding (navy/brass palette, hero band, footer,
// confidentiality notice) without duplicating that layout code three times.
// The Individual PDF route is left untouched -- it was already shipped and
// verified, so it isn't refactored to import this kit, to avoid any risk of
// regressing it. Mirror fixes both ways if something applies to both.

export const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6a4f10b3-3d43-4704-81c9-f36ad05b2c2f.png";

export function buildProfilePdfFileName(
  clientProfiler: string | undefined,
  name: string | undefined,
  dateCreated: string | undefined,
  fallback: string
): string {
  // File names are "{Client Name / Profiler Initials} {Prospect/Corporate/
  // Foundation Name} {Date Created}.pdf" -- space separated, no underscores.
  // Forbidden filesystem characters (from any of these free-text fields,
  // e.g. a "/" typed into Client Name/Profiler Initials like "SCFTA/JG")
  // are replaced with a hyphen rather than stripped or underscored, so the
  // fields stay visually intact instead of colliding into one run of words.
  const sanitize = (s?: string) =>
    (s || "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  // Only the Client Name portion (before the "/") is used in the filename --
  // the Profiler Initials after the "/" are dropped here, though the field
  // itself is untouched and still shows both on screen and in the PDF.
  const clientNameOnly = (clientProfiler || "").split("/")[0];
  const parts = [sanitize(clientNameOnly), sanitize(name), sanitize(dateCreated)].filter(Boolean);
  return parts.length > 0 ? `${parts.join(" ")}.pdf` : `${fallback}.pdf`;
}

export function fmtMoney(value?: string): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;
  const cleaned = trimmed.replace(/[^0-9.-]/g, "");
  if (!cleaned) return trimmed;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return trimmed;
  const hasCents = cleaned.includes(".") && !Number.isInteger(n);
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`;
}

export function sumAmounts(rows: any[], field = "amount"): string {
  if (!rows || rows.length === 0) return "";
  let total = 0;
  let any = false;
  for (const row of rows) {
    const raw = String(row?.[field] || "").trim();
    if (!raw || /[a-zA-Z]/.test(raw)) continue;
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    if (!cleaned) continue;
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n)) continue;
    total += n;
    any = true;
  }
  if (!any) return "";
  return `$${total.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function metaText(data: any): string {
  return [data.dateCreated, data.clientProfiler].filter(Boolean).join("   •   ");
}

const DS_RATING_STARS: Record<string, number> = {
  "1-1": 5,
  "1-2": 4,
  "1-3": 3,
  "1-4": 2,
  "1-5": 1,
  "2": 1,
  "3": 0,
};

export function dsRatingToStars(raw?: string): number | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase().replace(/^DS\s*/, "").replace(/\s+/g, "");
  return normalized in DS_RATING_STARS ? DS_RATING_STARS[normalized] : null;
}

export const NAVY = "#15212E";
export const NAVY_DEEP = "#0C131C";
export const BRASS = "#B28C46";
export const BRASS_LIGHT = "#CDAA6E";
export const CREAM = "#FFFFFF";
export const INK = "#181B19";
export const MUTED = "#5C5D59";
export const LINE = "#D6CDBA";
export const ROW_TINT = "#F3F4F6";
export const HEADER_GAP = 14;

export const pdfStyles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 70, paddingHorizontal: 0, fontSize: 9.3, color: INK, fontFamily: "Helvetica", backgroundColor: CREAM },
  body: { paddingHorizontal: 40 },
  topBarFrame: { position: "absolute", top: 0, left: 0, right: 0, height: 20 },
  topBar: { flex: 1, backgroundColor: NAVY, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40 },
  topBarContinuedText: { color: CREAM, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  topBarText: { color: "rgba(255,255,255,0.65)", fontSize: 7 },
  topBarConfidential: { color: BRASS_LIGHT, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 },
  heroBand: {
    position: "relative",
    backgroundColor: NAVY_DEEP,
    paddingHorizontal: 40,
    paddingTop: 18,
    paddingBottom: 8,
    marginTop: -20,
    marginBottom: HEADER_GAP,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: BRASS,
  },
  heroMetaAbs: { position: "absolute", top: 16, right: 40, width: 230, alignItems: "flex-end" },
  heroLogo: { position: "absolute", top: 16, left: 40, height: 43, width: 180, objectFit: "contain" },
  heroContentCol: { flex: 1, marginTop: 66 },
  heroEyebrow: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 2, textTransform: "uppercase", color: BRASS_LIGHT },
  heroTitle: { fontSize: 25, fontFamily: "Helvetica-Bold", color: CREAM, marginTop: 6, maxWidth: 420 },
  heroTitleId: { fontSize: 12, fontFamily: "Helvetica", color: BRASS_LIGHT, marginTop: 4 },
  heroLogoImage: { width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: BRASS, objectFit: "contain", backgroundColor: CREAM, marginTop: 40 },
  heroLogoPlaceholder: { width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: BRASS, backgroundColor: "rgba(21,33,46,0.05)", marginTop: 40 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: NAVY_DEEP, textAlign: "left", paddingVertical: 8, paddingHorizontal: 40 },
  footerText: { fontSize: 6.3, color: "rgba(255,255,255,0.65)", marginBottom: 2 },
  sectionHeading: { fontSize: 13, color: NAVY, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 7 },
  sectionAccent: { width: 26, height: 3, backgroundColor: BRASS, marginBottom: 5, borderRadius: 1.5 },
  wealthPanel: { backgroundColor: CREAM, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: NAVY },
  wealthRowMulti: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wealthCell: { flex: 1, paddingRight: 4, flexDirection: "row", alignItems: "flex-start" },
  wealthCellLabelRow: { flexDirection: "row", alignItems: "flex-start", flexShrink: 0, width: 150 },
  wealthCellLabel: { color: BRASS, fontSize: 6, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0, lineHeight: 1.25 },
  wealthCellValue: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 9, marginLeft: 10, flex: 1 },
  statBoxRow: { flexDirection: "row", marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: CREAM, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: NAVY },
  statBoxLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statBoxLabel: { color: BRASS, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, textTransform: "uppercase", marginLeft: 5 },
  statBoxValue: { color: NAVY, fontSize: 17, fontFamily: "Helvetica-Bold" },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 6 },
  fieldLabel: { width: 150, flexShrink: 0, fontSize: 8.2, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, lineHeight: 1.3, textTransform: "uppercase" },
  fieldValue: { flex: 1, fontSize: 9.6, color: INK, lineHeight: 1.4 },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: CREAM, borderBottomWidth: 1.5, borderBottomColor: NAVY },
  tableHeaderCell: { color: NAVY, fontSize: 7.6, fontFamily: "Helvetica-Bold", padding: 6, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 0.5, borderBottomColor: LINE },
  tableCell: { fontSize: 8.8, padding: 6, color: INK, lineHeight: 1.3 },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center" },
  italicNote: { fontSize: 7.4, color: MUTED, fontStyle: "italic", marginBottom: 10 },
  starRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  ratingRawText: { fontSize: 7, color: MUTED, marginTop: 2 },
  personCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, backgroundColor: CREAM, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 9 },
  personCardHeader: { flexDirection: "row", alignItems: "flex-start", backgroundColor: CREAM, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 9 },
  personBioIndented: { marginLeft: 74, marginTop: 6, marginBottom: 8, fontSize: 8.6, color: INK, line