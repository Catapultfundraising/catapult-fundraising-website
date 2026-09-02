import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, Svg, Path, Rect, Polygon, Font } from "@react-pdf/renderer";
import { parseFormattedText } from "@/lib/rich-text";

export const runtime = "nodejs";

// react-pdf hyphenates any "word" (whitespace-delimited token) that's too
// long to fit on one line by DEFAULT -- it inserts its own hyphen character
// and splits the token wherever its built-in English hyphenation dictionary
// says to, with zero regard for whether that token is an actual word. Free
// text fields like Additional Information, Family Foundation, and Business
// Colleagues are exactly the fields most likely to contain a long unbroken
// run of characters (a pasted URL, a run-together phrase, a long ID), and
// the default hyphenation makes those wrap with a jarring, wrong-looking
// mid-token break ("dfgn-\nerhhy5") instead of just flowing normally. This
// disables that default entirely -- a too-long token now simply isn't split
// (it overflows rather than getting an inserted hyphen), which is far less
// visually broken for the kind of content these fields actually contain.
Font.registerHyphenationCallback((word) => [word]);

// Light/white Catapult Fundraising logo variant, matching the one used on the
// live site's navy footer, so it blends cleanly into the navy header bar here.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6a4f10b3-3d43-4704-81c9-f36ad05b2c2f.png";

function buildProfilePdfFileName(
  clientProfiler: string | undefined,
  name: string | undefined,
  dateCreated: string | undefined,
  fallback: string
): string {
  // File names are "{Client Name / Profiler Initials} {Prospect Name}
  // {Date Created}.pdf" -- space separated, no underscores. Forbidden
  // filesystem characters (e.g. a "/" typed into Client Name/Profiler
  // Initials like "SCFTA/JG") are replaced with a hyphen rather than
  // stripped or underscored, so the fields stay visually intact instead of
  // colliding into one run of words.
  const sanitize = (s?: string) =>
    (s || "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  // Only the Client Name portion (before the "/") is used in the filename --
  // the Profiler Initials after the "/" are dropped here, though the field
  // itself is untouched and still shows both on screen and in the PDF.
  const clientNameOnly = (clientProfiler || "").split("/")[0];
  const parts = [sanitize(clientNameOnly), sanitize(name), sanitize(dateCreated)].filter(Boolean);
  return parts.length > 0 ? `${parts.join(" ")}.pdf` : `${fallback}.pdf`;
}

function fmtMoney(value?: string): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  // If the profiler entered shorthand or a qualifier (e.g. "$10M+", "10K", "TBD"),
  // preserve it exactly as entered rather than reformatting/stripping it.
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

// Best-effort sum of a Giving History table's Amount column, for the at-a-glance
// cumulative total in the wealth panel. Non-numeric/shorthand entries (e.g. "$10M+")
// are skipped from the sum since they can't be safely added, but never alter the
// underlying row displays elsewhere.
// Like fmtMoney, but ALWAYS expands "K"/"M"/"B" shorthand into the full
// real number (e.g. "$1K" -> "$1,000", "$10K - $15K" -> "$10,000 - $15,000"),
// instead of preserving shorthand verbatim. Used for itemized individual
// gift-amount rows (Giving History, Other Giving History, FEC Recipient
// Organization) where a specific dollar figure reads as more precise and
// professional in full rather than abbreviated. NOT used for the wealth
// panel or Real Estate values, which intentionally keep the compact "$90M"
// / "$4.4M" style for those larger, order-of-magnitude figures. Any text
// with no numeric token at all ("TBD", "N/A", "-", "—", blank) is
// returned completely unchanged.
function fmtMoneyExpanded(value?: string): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  const tokenRe = /\$?\s*([\d,]*\.?\d+)\s*([KkMmBb])?/g;
  let matchedAny = false;
  const result = trimmed.replace(tokenRe, (match, numStr, suffix) => {
    if (!numStr || !/\d/.test(numStr)) return match;
    const mult = suffix ? (suffix.toUpperCase() === "K" ? 1e3 : suffix.toUpperCase() === "M" ? 1e6 : suffix.toUpperCase() === "B" ? 1e9 : 1) : 1;
    const n = parseFloat(numStr.replace(/,/g, "")) * mult;
    if (!Number.isFinite(n)) return match;
    matchedAny = true;
    const hasCents = !Number.isInteger(n);
    return `$${n.toLocaleString("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    })}`;
  });
  return matchedAny ? result : trimmed;
}

function sumAmounts(rows: any[]): string {
  if (!rows || rows.length === 0) return "";
  let total = 0;
  let any = false;
  for (const row of rows) {
    const raw = String(row?.amount || "").trim();
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

function metaText(data: any): string {
  return [data.dateCreated, data.clientProfiler].filter(Boolean).join("   •   ");
}

// Maps DonorSearch (DS) wealth ratings to a 1-5 star "at a glance" score for
// the PDF, while the raw rating text (e.g. "1-1") is always kept visible
// alongside it -- per DS Ratings Guide: 1-1/1-2/1-3 are DS's own top-tier
// "capable of major gifts" bracket, 1-4/1-5 are lesser-but-real wealth
// markers, DS 2 is a narrower exact-match marker, and DS 3 means no
// noteworthy matches at all.
const DS_RATING_STARS: Record<string, number> = {
  "1-1": 5,
  "1-2": 4,
  "1-3": 3,
  "1-4": 2,
  "1-5": 1,
  "2": 1,
  "3": 0,
};

// Accepts common variants profilers might type: "DS 1-1", "ds1-1", "1-1",
// extra spaces, etc. Returns null (not 0 stars) when the text doesn't match
// a known DS tier, so we fall back to showing the raw text with no stars
// rather than guessing.
function dsRatingToStars(raw?: string): number | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase().replace(/^DS\s*/, "").replace(/\s+/g, "");
  return normalized in DS_RATING_STARS ? DS_RATING_STARS[normalized] : null;
}

// Political affiliation positions along the 5-point spectrum gauge, left
// (Democrat) to right (Republican). "Supports Both Parties" and "Unknown"
// are handled separately since they don't sit on this axis.
const POLITICAL_GAUGE_POSITIONS: Record<string, number> = {
  Democrat: 0,
  "Leans Democrat": 1,
  Independent: 2,
  "Leans Republican": 3,
  Republican: 4,
};
// Standard SVG polar-to-cartesian + arc-path helpers for the donut chart --
// react-pdf has no charting library, so pie slices are hand-computed here.
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  // Full circle (single-category case) can't be expressed as one arc path;
  // draw it as two half-arcs instead.
  if (endAngle - startAngle >= 359.999) {
    const mid = startAngle + 180;
    return `${describeArc(cx, cy, r, startAngle, mid)} ${describeArc(cx, cy, r, mid, endAngle)}`;
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}
// Palette matches the one-sheets' brand system exactly (build.py CSS vars).
const NAVY = "#15212E";
const NAVY_DEEP = "#0C131C";
const BRASS = "#B28C46";
const BRASS_LIGHT = "#CDAA6E";
const CHART_PALETTE = [BRASS, NAVY, "#6B8CA3", BRASS_LIGHT, "#4A5D6B", "#8C6B3F", "#A3B8C2", "#3D4F5C", "#D9BC80", "#7A6248"];
const CREAM = "#FFFFFF";
const INK = "#181B19";
const MUTED = "#5C5D59";
const LINE = "#D6CDBA";
// Print-friendly redesign: white background throughout the body content, navy
// borders only — no solid navy/tan fills in the wealth panel, stat boxes, or
// tables, so the bulk of the document stays light on both color and
// black & white printers. The hero band, continuation top bar, and footer
// keep their solid navy brand color (kept by explicit request) since they're
// a small, consistent strip rather than the whole page. ROW_TINT replaces the
// old tan zebra-stripe color with a barely-there neutral gray instead.
const ROW_TINT = "#F3F4F6";

// One "empty line" of breathing room, reused consistently between every
// page's header (hero band on page 1, top bar on later pages) and the
// content that follows it.
const HEADER_GAP = 14;

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 70, paddingHorizontal: 0, fontSize: 9.3, color: INK, fontFamily: "Helvetica", backgroundColor: CREAM },
  body: { paddingHorizontal: 40 },
  topBarFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  topBar: {
    flex: 1,
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },
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
  heroPhoto: { width: 111, height: 111, borderRadius: 55.5, borderWidth: 2, borderColor: BRASS, objectFit: "cover", marginTop: 48 },
  heroPhotoSmall: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: BRASS, objectFit: "cover", marginTop: 48 },
  heroPhotoPlaceholder: { width: 111, height: 111, borderRadius: 55.5, borderWidth: 2, borderColor: BRASS, backgroundColor: "rgba(21,33,46,0.05)", marginTop: 48 },
  heroPhotoPlaceholderSmall: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: BRASS, backgroundColor: "rgba(21,33,46,0.05)", marginTop: 48 },
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
  footerText: { fontSize: 6.3, color: "rgba(255,255,255,0.65)", marginBottom: 2 },
  sectionHeading: { fontSize: 13, color: NAVY, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 7 },
  sectionAccent: { width: 26, height: 3, backgroundColor: BRASS, marginBottom: 5, borderRadius: 1.5 },
  wealthPanel: { backgroundColor: CREAM, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: NAVY },
  wealthRowMulti: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wealthCell: { flex: 1, paddingRight: 4, flexDirection: "row", alignItems: "flex-start" },
  wealthCellLabelRow: { flexDirection: "row", alignItems: "flex-start", flexShrink: 0, width: 150 },
  wealthCellLabel: { color: BRASS, fontSize: 6, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0, lineHeight: 1.25 },
  wealthCellLabelNoIcon: { color: BRASS, fontSize: 6, textTransform: "uppercase", letterSpacing: 0, lineHeight: 1.25, flexShrink: 0, width: 78 },
  wealthCellValue: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 9, marginLeft: 10, flex: 1 },
  statBoxRow: { flexDirection: "row", marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: CREAM, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: NAVY },
  statBoxLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statBoxLabel: { color: BRASS, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, textTransform: "uppercase", marginLeft: 5 },
  statBoxValue: { color: NAVY, fontSize: 17, fontFamily: "Helvetica-Bold" },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 6 },
  fieldLabel: { width: 150, flexShrink: 0, fontSize: 8.2, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, lineHeight: 1.3, textTransform: "uppercase" },
  fieldLabelSmall: { width: 108, flexShrink: 0, fontSize: 8.2, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, lineHeight: 1.3, textTransform: "uppercase" },
  fieldValue: { flex: 1, fontSize: 9.6, color: INK, lineHeight: 1.4 },
  fieldRowLong: { position: "relative", marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 6 },
  fieldRowLongHead: { position: "relative" },
  fieldLabelAbs: { position: "absolute", top: 0, left: 0, width: 150, fontSize: 8.2, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, lineHeight: 1.3, textTransform: "uppercase" },
  fieldValueIndented: { marginLeft: 150, fontSize: 9.6, color: INK, lineHeight: 1.4 },
  cardWhite: { backgroundColor: CREAM, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 10, marginBottom: 12 },
  nameHeading: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: CREAM, borderBottomWidth: 1.5, borderBottomColor: NAVY },
  tableHeaderCell: { color: NAVY, fontSize: 7.6, fontFamily: "Helvetica-Bold", padding: 6, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 0.5, borderBottomColor: LINE },
  tableCell: { fontSize: 8.8, padding: 6, color: INK, lineHeight: 1.3 },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center" },
  propertyCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, backgroundColor: CREAM, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 9 },
  propertyPhoto: { width: 88, height: 64, borderRadius: 6, marginRight: 10, objectFit: "cover" },
  italicNote: { fontSize: 7.4, color: MUTED, fontStyle: "italic", marginBottom: 10 },
  starRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  ratingRawText: { fontSize: 7, color: MUTED, marginTop: 2 },
  gaugeCompactLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  chartRow: { flexDirection: "row", alignItems: "center" },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  legendSwatch: { width: 7, height: 7, borderRadius: 1.5, marginRight: 5 },
  legendText: { fontSize: 7.6, color: INK },
  legendPct: { fontSize: 7.6, fontFamily: "Helvetica-Bold", color: NAVY, marginLeft: 3 },
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

// Renders a value that may contain **bold**/__underline__ markers (applied
// via the Bold/Underline toolbar buttons in the form) as properly styled
// inline PDF text instead of literal asterisks/underscores.
function FormattedText({ value, style }: { value?: string; style?: any }) {
  if (!value) return null;
  const segments = parseFormattedText(value);
  return (
    <Text style={style}>
      {segments.map((seg, i) => {
        const segStyle: any[] = [];
        if (seg.bold) segStyle.push({ fontFamily: "Helvetica-Bold" });
        if (seg.underline) segStyle.push({ textDecoration: "underline" });
        return (
          <Text key={i} style={segStyle}>
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}

// Splits a long field value at the nearest word boundary at or after
// minChars. Used by FieldRow's orphan/widow protection below -- see that
// comment for why this manual split (rather than react-pdf's built-in
// minPresenceAhead prop) is the fix here.
function splitFirstChunk(value: string, minChars: number): [string, string] {
  if (value.length <= minChars) return [value, ""];
  const spaceIdx = value.indexOf(" ", minChars);
  const cut = spaceIdx === -1 ? value.length : spaceIdx;
  return [value.slice(0, cut), value.slice(cut + 1)];
}

function FieldRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  // Short values (a single line, e.g. address/phone/EIN) keep the tight
  // side-by-side row with wrap={false} -- the label is never orphaned from
  // its value across a page break, and there's no overflow risk since the
  // block is short.
  //
  // Long, multi-paragraph free-text values (e.g. Additional Information,
  // Relationship to Organization) use a "hanging indent" layout instead:
  // the label is absolutely positioned over the top-left corner, and the
  // value's left indent is baked into its own style (marginLeft) rather
  // than coming from a sibling column, so the value can wrap and split
  // across as many pages as it needs while the indent stays consistent on
  // every wrapped/continued line. This mirrors the identical fix already
  // applied to the shared Corporate/Foundation PDF kit
  // (lib/profile-pdf-kit.tsx).
  //
  // Orphan/widow protection: react-pdf's built-in minPresenceAhead prop
  // (designed for exactly this -- "don't let a heading start with too
  // little of its content following it") does NOT take effect here,
  // confirmed by direct testing -- it has no effect on this absolutely-
  // positioned hanging-indent label, unlike a plain flowing Text node. The
  // manual substitute: guarantee at least a short first chunk of a long
  // value renders together with its label in ONE wrap={false} block, so
  // the label never appears completely alone at the very bottom of a page.
  //
  // This chunk is deliberately kept SMALL (a sentence or two, not a big
  // fraction of a page) -- an earlier version guaranteed ~600 characters
  // (roughly half a page) together as one indivisible block. That was too
  // large: whenever a long list-style field (e.g. "Boards") started
  // partway down a page, react-pdf placed that whole 600-character block,
  // then found too little room left for even the first line of the
  // independently-wrapping "rest" of the value, and deferred the entire
  // remainder to the next page -- wasting up to half the current page as
  // blank space and making the section look like it "broke" across pages
  // (confirmed by direct before/after rendering comparison: page fill
  // dropped from ~48% used to ~93% used after shrinking this chunk, and
  // the document dropped a full page as a result). A small guaranteed
  // chunk still prevents the label from ever standing alone, while letting
  // the bulk of a long value wrap and paginate naturally line-by-line, so
  // it always fills whatever room remains on the current page before
  // continuing on the next one.
  const isLong = value.length > 200 || value.includes("\n");
  if (!isLong) {
    return (
      <View style={styles.fieldRow} wrap={false}>
        <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
        <FormattedText value={value} style={styles.fieldValue} />
      </View>
    );
  }
  const [firstChunk, rest] = splitFirstChunk(value, 120);
  if (!rest) {
    return (
      <View style={styles.fieldRowLong} wrap={false}>
        <Text style={styles.fieldLabelAbs}>{label.toUpperCase()}</Text>
        <FormattedText value={value} style={styles.fieldValueIndented} />
      </View>
    );
  }
  return (
    <>
      <View style={styles.fieldRowLongHead} wrap={false}>
        <Text style={styles.fieldLabelAbs}>{label.toUpperCase()}</Text>
        <FormattedText value={firstChunk} style={styles.fieldValueIndented} />
      </View>
      <FormattedText
        value={rest}
        style={[
          styles.fieldValueIndented,
          { marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 6 },
        ]}
      />
    </>
  );
}

function FieldRowPair({
  left,
  right,
}: {
  left: { label: string; value?: string };
  right: { label: string; value?: string };
}) {
  if (!left.value && !right.value) return null;
  return (
    <View style={styles.fieldRow} wrap={false}>
      <View style={{ flexDirection: "row", flex: 1 }}>
        <Text style={styles.fieldLabelSmall}>{left.value ? left.label.toUpperCase() : ""}</Text>
        <Text style={styles.fieldValue}>{left.value || ""}</Text>
      </View>
      <View style={{ flexDirection: "row", flex: 1 }}>
        <Text style={styles.fieldLabelSmall}>{right.value ? right.label.toUpperCase() : ""}</Text>
        <Text style={styles.fieldValue}>{right.value || ""}</Text>
      </View>
    </View>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <Svg viewBox="0 0 24 24" width={10} height={10}>
      <Polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={filled ? BRASS : "none"}
        stroke={filled ? "none" : LINE}
        strokeWidth={filled ? 0 : 1.5}
      />
    </Svg>
  );
}

// Shows the raw wealth rating text exactly as entered, with a 1-5 star
// "at a glance" score layered underneath when it matches a known DS
// Ratings Guide tier (see DS_RATING_STARS above). Unrecognized values fall
// back to plain text, same as before this feature existed.
function StarRating({ rawValue }: { rawValue?: string }) {
  if (!rawValue) return null;
  const stars = dsRatingToStars(rawValue);
  if (stars === null) {
    return <Text style={styles.statBoxValue}>{rawValue}</Text>;
  }
  return (
    <View>
      <View style={styles.starRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ marginRight: 1 }}>
            <StarIcon filled={i < stars} />
          </View>
        ))}
      </View>
      <Text style={styles.ratingRawText}>{rawValue}</Text>
    </View>
  );
}

// Compact 5-segment "meter" instead of the old full spectrum bar + tick
// labels -- that version needed ~480pt to read cleanly (or overflowed the
// page when squeezed narrower), which was more visual weight than a single
// biographical field warrants. This is a small dash-segment row (fits in
// the same ~80pt-wide cell as Religion/Military Service) with the matching
// segment lit up in brass, plus the exact value as plain text underneath --
// same "small graphic + raw text below" pattern already used for Wealth
// Rating's stars.
const GAUGE_SEGMENT_COUNT = 5;
function renderCompactGauge(position: number) {
  const totalWidth = 60;
  const gap = 2;
  const segWidth = (totalWidth - gap * (GAUGE_SEGMENT_COUNT - 1)) / GAUGE_SEGMENT_COUNT;
  const height = 6;
  return (
    <Svg viewBox={`0 0 ${totalWidth} ${height}`} width={totalWidth} height={height}>
      {Array.from({ length: GAUGE_SEGMENT_COUNT }).map((_, i) => (
        <Rect
          key={i}
          x={i * (segWidth + gap)}
          y={0}
          width={segWidth}
          height={height}
          rx={1.5}
          fill={i === position ? BRASS : LINE}
        />
      ))}
    </Svg>
  );
}

// Political Affiliation as a small at-a-glance meter instead of plain text.
// "Supports Both Parties" and "Unknown" don't sit on a left-right axis, so
// they get their own treatment rather than being forced onto the spectrum.
function PoliticalGauge({ value }: { value?: string }) {
  if (!value) return null;
  if (value === "Supports Both Parties") {
    return (
      <View>
        {renderCompactGauge(2)}
        <Text style={styles.gaugeCompactLabel}>Both Parties</Text>
      </View>
    );
  }
  const position = POLITICAL_GAUGE_POSITIONS[value];
  if (position === undefined) {
    // "Unknown" or any other free-text value -- no spectrum to plot, just show it.
    return <Text style={styles.wealthCellValue}>{value}</Text>;
  }
  return (
    <View>
      {renderCompactGauge(position)}
      <Text style={styles.gaugeCompactLabel}>{value}</Text>
    </View>
  );
}

// Breaks down Other Giving History by category as a share of the NUMBER OF
// GIFT RECORDS in each category, not dollar totals. Most rows in this table
// come from public-record research and never get a confirmed dollar amount
// (the Amount column is often "N/A" or blank) -- summing only the rows that
// happen to have a parsable dollar figure meant a single $248 gift could
// swamp seven other undated/unvalued gifts and show as "100% Education"
// even though most of the giving history was a completely different
// category. Counting rows instead means every logged gift counts equally
// toward the pie, regardless of whether a dollar figure was ever confirmed.
// Only fully-blank rows (no recipient AND no category) are skipped.
function computeGivingByCategory(rows: any[]): Array<{ label: string; value: number; pct: number }> {
  if (!rows || rows.length === 0) return [];
  const counts = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const recipient = String(row?.recipient || "").trim();
    const category = String(row?.giving || "").trim();
    if (!recipient && !category) continue;
    const key = category || "Uncategorized";
    counts.set(key, (counts.get(key) || 0) + 1);
    total += 1;
  }
  if (total <= 0) return [];
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value, pct: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);
}

function GivingByCategoryChart({ rows }: { rows: any[] }) {
  const data = computeGivingByCategory(rows);
  if (data.length === 0) return null;
  const size = 90;
  const r = size / 2;
  const cx = r;
  const cy = r;
  let cursor = 0;
  const slices = data.map((d, i) => {
    const startAngle = cursor;
    const sweep = (d.pct / 100) * 360;
    cursor += sweep;
    return { ...d, startAngle, endAngle: cursor, color: CHART_PALETTE[i % CHART_PALETTE.length] };
  });
  // Deliberately NOT wrap={false} here: an atomic block that doesn't fit
  // the remaining space on a page gets pushed whole to the next page by
  // react-pdf, which let the (usually short) FEC table below render in that
  // leftover space first -- making the chart appear AFTER FEC even though
  // it comes before it in the document. Letting it flow normally keeps it
  // pinned directly under Other Giving History, where it belongs.
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[styles.sectionHeadingRow, { marginBottom: 4 }]} wrap={false}>
        <IconGlyph name="gift" color={BRASS} size={9} />
        <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, marginLeft: 4 }}>
          GIVING BY CATEGORY
        </Text>
      </View>
      <View style={styles.chartRow} wrap={false}>
        <Svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {slices.map((s, i) => (
            <Path key={i} d={describeArc(cx, cy, r, s.startAngle, s.endAngle)} fill={s.color} />
          ))}
        </Svg>
        <View style={{ marginLeft: 14, flex: 1 }}>
          {slices.map((s, i) => (
            <View style={styles.legendRow} key={i}>
              <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>{s.label}</Text>
              <Text style={styles.legendPct}>{Math.round(s.pct)}%</Text>
            </View>
          ))}
        </View>
      </View>
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
  bigTitle,
  icon,
  note,
  headers,
  colWidths,
  rows,
  renderRow,
  keepTogether,
}: {
  title?: string;
  // Renders `title` with the larger navy section-heading style (with its
  // accent bar) instead of the small brass label style, for tables that
  // serve as an entire section's heading (e.g. "Other Giving History")
  // rather than a sub-table within a section (e.g. "Phone Numbers").
  bigTitle?: boolean;
  icon?: IconName;
  note?: string;
  headers: string[];
  colWidths: string[];
  rows: any[];
  renderRow: (row: any, i: number) => string[];
  // Forces the ENTIRE table (title + header + every row) into one
  // wrap={false} block instead of only grouping the first row. Use this for
  // tables that are always short (e.g. "Children") — without it, a table
  // can split mid-way across a page break with no repeated header on the
  // continuation page, leaving bare unlabeled rows floating at the top of
  // the next page. Not used for long tables (Giving History, Other Giving,
  // FEC) since forcing a tall block to be indivisible is what caused the
  // earlier overlap bug — those are safe to split because they're long
  // enough that a mid-table break reads as a natural continuation, not as
  // orphaned/unlabeled data.
  keepTogether?: boolean;
}) {
  if (!rows || rows.length === 0) return null;
  const [firstRow, ...restRows] = rows;
  const firstCells = renderRow(firstRow, 0);

  const titleBlock = title ? (
    bigTitle ? (
      <>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionHeading}>{title}</Text>
      </>
    ) : (
      <View style={[styles.sectionHeadingRow, { marginBottom: 4 }]}>
        {icon ? <IconGlyph name={icon} color={BRASS} size={9} /> : null}
        <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, marginLeft: icon ? 4 : 0 }}>
          {title.toUpperCase()}
        </Text>
      </View>
    )
  ) : null;

  if (keepTogether) {
    return (
      <View style={{ marginBottom: 8 }} wrap={false}>
        {titleBlock}
        {note ? <Text style={styles.italicNote}>{note}</Text> : null}
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
              <View style={[styles.tableRow, { backgroundColor: i % 2 === 1 ? ROW_TINT : CREAM }]} key={i}>
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

  // The title, header row, and first data row are grouped into ONE
  // wrap={false} block. This is the key anti-orphan fix: without it, the
  // title+header can render alone at the very bottom of a page (with zero
  // rows visible under it) while every row gets pushed to the next page —
  // exactly the "Education" bug reported. Grouping a SMALL block (title +
  // header + one row) rather than the WHOLE table avoids reintroducing the
  // earlier overlap bug, which was caused by forcing an entire multi-row
  // table into one indivisible block. Remaining rows flow normally after,
  // each still individually wrap={false} so no single row is ever cut mid-row.
  return (
    <View style={{ marginBottom: 8 }}>
      <View wrap={false}>
        {titleBlock}
        {note ? <Text style={styles.italicNote}>{note}</Text> : null}
        <View style={{ borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: LINE, borderTopLeftRadius: 8, borderTopRightRadius: 8, overflow: "hidden" }}>
          <View style={styles.tableHeaderRow}>
            {headers.map((h, i) => (
              <Text key={h} style={[styles.tableHeaderCell, { width: colWidths[i] }]}>
                {h}
              </Text>
            ))}
          </View>
          <View style={[styles.tableRow, { backgroundColor: CREAM }]}>
            {firstCells.map((c, ci) => (
              <Text key={ci} style={[styles.tableCell, { width: colWidths[ci] }]}>
                {c}
              </Text>
            ))}
          </View>
        </View>
      </View>
      {restRows.length > 0 && (
        <View style={{ borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: LINE, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, overflow: "hidden" }}>
          {restRows.map((row, i) => {
            const idx = i + 1;
            const cells = renderRow(row, idx);
            return (
              <View
                style={[
                  styles.tableRow,
                  {
                    backgroundColor: idx % 2 === 1 ? ROW_TINT : CREAM,
                },
                ]}
                key={idx}
                wrap={false}
              >
                {cells.map((c, ci) => (
                  <Text key={ci} style={[styles.tableCell, { width: colWidths[ci] }]}>
                    {c}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function HeaderFooter({ data }: { data: any }) {
  const rightText = metaText(data);
  return (
    <>
      <View
        style={styles.topBarFrame}
        fixed
        render={({ pageNumber }) =>
          pageNumber === 1 ? null : (
            <View style={styles.topBar}>
              <Text
                style={styles.topBarContinuedText}
                render={({ pageNumber: pn, totalPages }) =>
                  `${(data.name || "Prospect").toString()}    Page ${pn} of ${totalPages}`
                }
              />
              <Text style={styles.topBarText}>{rightText || "Catapult Fundraising"}</Text>
            </View>
          )
        }
      />
      <View style={styles.footer} fixed>
        {data.catapultId ? (
          <Text style={styles.footerText}>Catapult ID: {data.catapultId}</Text>
        ) : null}
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
  const rightText = metaText(data);

  // Fixed left/right column order, agreed layout — left column reads
  // Estimated Income, Estimated Net Worth, Stock Value, Cumulative Giving to
  // Org top-to-bottom; right column reads Real Estate Value, # of
  // Properties, Total Charitable Giving, Non-Philanthropic/Political Giving.
  // Rows are only dropped when BOTH sides are empty, so the pairing never
  // shifts even if an individual field is blank.
  const WEALTH_PAIRS: Array<[[string, string, IconName], [string, string, IconName]]> = [
    [
      ["Estimated Income", fmtMoney(data.estimatedIncome), "dollar"],
      ["Real Estate Value", fmtMoney(data.realEstateValue), "home"],
    ],
    [
      ["Estimated Net Worth", fmtMoney(data.estimatedNetWorth), "dollar"],
      ["# of Properties", data.realEstatePropertyCount, "home"],
    ],
    [
      ["Stock Value", fmtMoney(data.stockValue), "chart"],
      ["Total Charitable Giving", fmtMoney(data.totalCharitableGiving), "gift"],
    ],
    [
      ["Cumulative Giving to Organization", sumAmounts(data.givingHistoryRows), "gift"],
      ["Non-Philanthropic Political Giving", fmtMoney(data.nonPhilanthropicPoliticalGiving), "dollar"],
    ],
    [
      ["Estimated Liquidity", fmtMoney(data.estimatedLiquidity), "dollar"],
      ["", "", "dollar"],
    ],
  ];
  const wealthRows: Array<Array<[string, string, IconName]>> = WEALTH_PAIRS.filter(
    ([left, right]) => left[1] || right[1]
  );

  const givingCapacityValue = fmtMoney(data.givingCapacity);
  const wealthRatingValue = data.wealthRating;

  const hasPhones = Boolean(data.phones && data.phones.length > 0);
  const hasEmails = Boolean(data.emails && data.emails.length > 0);

  const religiousRow: Array<[string, string]> = ([
    ["Religion", data.religion],
    ["Military Service", militaryValue(data)],
    ["Political Affiliation", data.politicalAffiliation],
  ] as Array<[string, string]>).filter(([, v]) => v);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <HeaderFooter data={data} />

        <View style={styles.heroBand}>
          <Image src={LOGO_URL} style={styles.heroLogo} />
          <View style={styles.heroMetaAbs}>
            <Text style={styles.topBarConfidential}>CONFIDENTIAL</Text>
            {rightText ? <Text style={styles.topBarText}>{rightText}</Text> : null}
          </View>
          <View style={styles.heroContentCol}>
            <Text style={styles.heroEyebrow}>PROSPECT INTELLIGENCE PROFILE</Text>
            <Text style={styles.heroTitle}>{data.name || "NAME"}</Text>
            {data.clientId ? <Text style={styles.heroTitleId}>Client ID: {data.clientId}</Text> : null}
          </View>
          {data.photo2 ? (
            <View style={{ flexDirection: "row" }}>
              {data.photo ? (
                <Image src={data.photo} style={styles.heroPhotoSmall} />
              ) : (
                <View style={styles.heroPhotoPlaceholderSmall} />
              )}
              <Image src={data.photo2} style={[styles.heroPhotoSmall, { marginLeft: 8 }]} />
            </View>
          ) : data.photo ? (
            <Image src={data.photo} style={styles.heroPhoto} />
          ) : (
            <View style={styles.heroPhotoPlaceholder} />
          )}
        </View>
 
        <View style={styles.body}>

        {wealthRows.length > 0 && (
          <View style={styles.wealthPanel}>
            {wealthRows.map((row, ri) => (
              <View style={[styles.wealthRowMulti, { marginTop: ri > 0 ? 8 : 0 }]} key={ri}>
                {row.filter(([label]) => label).map(([label, value, icon]) => (
                  <View style={styles.wealthCell} key={label}>
                    <View style={styles.wealthCellLabelRow}>
                      <IconGlyph name={icon} color={BRASS} size={9} />
                      <Text style={styles.wealthCellLabel}>{label}</Text>
                    </View>
                    <Text style={styles.wealthCellValue}>{value || "—"}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {(givingCapacityValue || wealthRatingValue) && (
          <View style={styles.statBoxRow}>
            {givingCapacityValue ? (
              <View style={[styles.statBox, wealthRatingValue ? { marginRight: 10 } : {}]}>
                <View style={styles.statBoxLabelRow}>
                  <IconGlyph name="gift" color={BRASS} size={11} />
                  <Text style={styles.statBoxLabel}>Est. Giving Capacity — 5 Yrs</Text>
                </View>
                <Text style={styles.statBoxValue}>{givingCapacityValue}</Text>
              </View>
            ) : null}
            {wealthRatingValue ? (
              <View style={styles.statBox}>
                <View style={styles.statBoxLabelRow}>
                  <IconGlyph name="star" color={BRASS} size={11} />
                  <Text style={styles.statBoxLabel}>Wealth Rating</Text>
                </View>
                <StarRating rawValue={wealthRatingValue} />
              </View>
            ) : null}
          </View>
        )}

        <View wrap={false}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionHeading}>Biographical Information</Text>
          {hasPhones && hasEmails ? (
            <View style={{ flexDirection: "row" }} wrap={false}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <MiniTable
                  title="Phone Numbers"
                  icon="phone"
                  headers={["TYPE", "NUMBER"]}
                  colWidths={["35%", "65%"]}
                  rows={data.phones}
                  renderRow={(row: any) => [resolveContactType(row), row.number || ""]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <MiniTable
                  title="Email Addresses"
                  icon="mail"
                  headers={["TYPE", "EMAIL"]}
                  colWidths={["35%", "65%"]}
                  rows={data.emails}
                  renderRow={(row: any) => [resolveContactType(row), row.address || ""]}
                />
              </View>
            </View>
          ) : (
            <>
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
            </>
          )}
        </View>
        <FieldRow label="Home Address" value={data.homeAddress} />
        <FieldRow label="Born" value={data.born} />
        <FieldRow label="Marital Status" value={data.maritalStatus} />
        <FieldRow label="Spouse" value={data.spouseName} />
        <FieldRow label="Parents" value={data.parentsNames} />
        <MiniTable
          title="Children"
          icon="users"
          headers={["NAME", "AGE", "OTHER INFORMATION"]}
          colWidths={["25%", "15%", "60%"]}
          rows={data.childrenRows}
          renderRow={(row: any) => [row.name || "", row.age || "", row.otherInfo || ""]}
          keepTogether
        />
        <MiniTable
          title="Education"
          icon="graduationCap"
          headers={["UNIVERSITY", "DEGREE", "GRADUATION YEAR"]}
          colWidths={["40%", "35%", "25%"]}
          rows={data.educationEntries}
          renderRow={(row: any) => [row.institution || "", row.degree || "", row.year || ""]}
        />

        {religiousRow.length > 0 && (
          <View style={styles.wealthPanel} wrap={false}>
            <View style={styles.wealthRowMulti}>
              {religiousRow.map(([label, value]) => (
                <View style={styles.wealthCell} key={label}>
                  <Text style={styles.wealthCellLabelNoIcon}>{label.toUpperCase()}</Text>
                  {label === "Political Affiliation" ? (
                    <PoliticalGauge value={value} />
                  ) : (
                    <Text style={styles.wealthCellValue}>{value}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <FieldRow label="Hobbies & Interests" value={data.hobbiesInterests} />
        <FieldRow label="Relationship to Organization" value={data.relationshipToOrg} />
        <MiniTable
          title="Giving History to Organization"
          headers={["YEAR", "AMOUNT", "COMMENTS"]}
          colWidths={["15%", "20%", "65%"]}
          rows={data.givingHistoryRows}
          renderRow={(row: any) => [row.year || "", fmtMoneyExpanded(row.amount), row.comments || ""]}
        />

        {data.realEstate?.length > 0 && (
          <View>
            {(() => {
              const [firstProperty, ...restProperties] = data.realEstate;
              const renderCard = (re: any, i: number) => (
                <View style={styles.propertyCard} key={i} wrap={false}>
                  {re.photo ? (
                    <Image src={re.photo} style={styles.propertyPhoto} />
                  ) : (
                    <View style={[styles.propertyPhoto, { backgroundColor: CREAM }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    {re.address ? <FormattedText value={re.address} style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 }} /> : null}
                    {re.description ? <FormattedText value={re.description} style={{ fontSize: 9, color: INK, marginBottom: 2 }} /> : null}
                    {re.value ? <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BRASS, marginBottom: 2 }}>{fmtMoneyExpanded(re.value)}</Text> : null}
                    {re.purchaseInfo ? <Text style={{ fontSize: 8.5, color: MUTED }}>{re.purchaseInfo}</Text> : null}
                  </View>
                </View>
              );
              return (
                <>
                  {/* Heading grouped with the first card in one wrap={false}
                      block so "Real Estate" never renders alone at the
                      bottom of a page with every card pushed to the next one. */}
                  <View wrap={false}>
                    <View style={[styles.sectionHeadingRow, styles.sectionHeading]}>
                      <IconGlyph name="home" color={NAVY} size={12} />
                      <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginLeft: 5 }}>Real Estate</Text>
                    </View>
                    {renderCard(firstProperty, 0)}
                  </View>
                  {restProperties.map((re: any, i: number) => renderCard(re, i + 1))}
                </>
              );
            })()}
          </View>
        )}

        {data.otherAssets?.length > 0 && (
          <MiniTable
            title="Other Assets"
            icon="dollar"
            headers={["ASSET", "TYPE", "VALUE"]}
            colWidths={["40%", "30%", "30%"]}
            rows={data.otherAssets}
            renderRow={(row: any) => [row.name || "", row.type || "", fmtMoneyExpanded(row.value)]}
          />
        )}

        <FieldRow label="Business Address(es) & Phone(s)" value={data.businessAddresses} />
        <FieldRow label="Family Foundation" value={data.familyFoundation} />
        <FieldRow label="Additional Information" value={data.additionalInformation} />

        {/* Boards &amp; Affiliations continues in this same flowing content
            area -- no forced page break -- so it naturally packs onto
            whatever room is left on the current page. General page-break
            rule for every section in this document: only the section
            HEADING is grouped into a wrap={false} block (the same
            anti-orphan pattern already used for "Real Estate" and
            "Biographical Information" above). That means if a new section
            heading would start in roughly the bottom quarter of a page and
            it (plus its next line or two of content) can't fit there,
            react-pdf moves that whole wrap={false} heading block to the top
            of the next page instead of leaving it dangling alone at the
            bottom. The FieldRow VALUE itself is deliberately kept OUTSIDE
            the wrap={false} block: "Boards" can be a long, many-line list,
            and previously the heading + full value were wrapped together
            as one indivisible block -- an oversized block that doesn't fit
            on a single page can't be placed by react-pdf at all, so it
            silently rendered a blank page and dropped content. Letting the
            FieldRow value keep wrapping independently (as intended for all
            long free-text fields) avoids that failure mode entirely. *}
        <View wrap={false}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionHeading}>Boards &amp; Affiliations</Text>
        </View>
        <FieldRow label="Boards" value={data.boards} />
        <FieldRow label="Clubs & Affiliations" value={data.clubsAffiliations} />
        <FieldRow label="Business Colleagues" value={data.businessColleagues} />

        <MiniTable
          title="Other Giving History"
          bigTitle
          note="The amounts listed are representative of donations found in publicly available records and in donor history provided to Catapult. As such, the individual amounts will not necessarily total the Total Giving amount."
          headers={["RECIPIENT", "CATEGORY", "YEAR", "AMOUNT"]}
          colWidths={["40%", "30%", "12%", "18%"]}
          rows={data.otherGiving}
          renderRow={(row: any) => [row.recipient || "", row.giving || "", row.year || "", fmtMoneyExpanded(row.amount)]}
        />

        <GivingByCategoryChart rows={data.otherGiving} />

        {data.fecGiving?.length > 0 && (
          <MiniTable
            title="FEC Recipient Organization"
            headers={["ORGANIZATION", "YEAR", "AMOUNT"]}
            colWidths={["55%", "20%", "25%"]}
            rows={data.fecGiving}
            renderRow={(row: any) => [row.org || "", row.year || "", fmtMoneyExpanded(row.amount)]}
          />
        )}

        <FieldRow label="Liquidity Notes" value={data.liquidityExplanation} />
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
    const fileName = buildProfilePdfFileName(data?.clientProfiler, data?.name, data?.dateCreated, "Prospect Intelligence Profile");
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
