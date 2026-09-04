import { Document, Page, View, Text, Image, StyleSheet, Svg, Path, Rect, Polygon, Font } from "@react-pdf/renderer";
import { parseFormattedText } from "@/lib/rich-text";
import type { PersonEntry } from "@/lib/profile-form-kit";

// react-pdf hyphenates any "word" (whitespace-delimited token) that's too
// long to fit on one line by DEFAULT -- it inserts its own hyphen character
// and splits the token via its built-in English hyphenation dictionary,
// regardless of whether that token is a real word. Free-text fields like
// Company Heritage, Corporate Giving, or Company Affiliations are exactly
// the fields most likely to contain a long unbroken run of characters (a
// pasted URL, a run-together phrase, a long ID), and the default
// hyphenation makes those wrap with a jarring, wrong-looking mid-token
// break instead of flowing normally. This disables that default entirely
// for both the Corporate and Foundation PDFs (both import this kit) -- a
// too-long token now simply isn't split (it overflows rather than getting
// an inserted hyphen), which is far less visually broken for the kind of
// content these fields actually contain.
Font.registerHyphenationCallback((word) => [word]);

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

// Minimum vertical space (in points) that must remain on the page before a
// long-value FieldRow (hanging-indent layout) is allowed to START -- see
// the identical comment in app/api/research-pdf/route.tsx's FieldRow for
// the full rationale. Prevents the label from being orphaned alone at the
// bottom of a page with its entire value pushed to the next page. A
// smaller value (40pt) was tried to reduce white space, but it wasn't
// enough room to guarantee even the label plus one visible line of the
// value, so long-value labels still rendered alone at the bottom of a
// page with their entire value pushed to the next page.
const FIELD_ROW_LONG_MIN_PRESENCE_AHEAD = 140;

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
  personBioIndented: { marginLeft: 74, marginTop: 6, marginBottom: 8, fontSize: 8.6, color: INK, lineHeight: 1.35 },
  personPhoto: { width: 64, height: 64, borderRadius: 32, marginRight: 10, objectFit: "cover", borderWidth: 1.5, borderColor: BRASS },
  personPhotoPlaceholder: { width: 64, height: 64, borderRadius: 32, marginRight: 10, backgroundColor: ROW_TINT, borderWidth: 1.5, borderColor: LINE },
  personName: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: NAVY },
  personTitle: { fontSize: 8.6, color: BRASS, fontFamily: "Helvetica-Bold", marginTop: 1 },
  personContact: { fontSize: 8, color: MUTED, marginTop: 2 },
  personBio: { fontSize: 8.6, color: INK, marginTop: 3, lineHeight: 1.35 },
  fieldRowLong: { position: "relative", marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 6 },
  fieldLabelAbs: { position: "absolute", top: 0, left: 0, width: 150, fontSize: 8.2, fontFamily: "Helvetica-Bold", color: BRASS, letterSpacing: 0.5, lineHeight: 1.3, textTransform: "uppercase" },
  fieldValueIndented: { marginLeft: 150, fontSize: 9.6, color: INK, lineHeight: 1.4 },
  bigSectionHeadingRow: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 7 },
});

type IconName = "home" | "dollar" | "chart" | "gift" | "star" | "phone" | "mail" | "users" | "graduationCap" | "building";

export function IconGlyph({ name, color = BRASS, size = 10 }: { name: IconName; color?: string; size?: number }) {
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
    case "building":
      return (
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Rect x="4" y="2" width="16" height="20" rx="1" {...common} />
          <Path d="M9 22v-4h6v4" {...common} />
          <Path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" {...common} />
        </Svg>
      );
    default:
      return null;
  }
}

export function FormattedText({ value, style }: { value?: string; style?: any }) {
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

export function FieldRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  // IMPORTANT: hard returns in these free-text fields are meaningful, not
  // accidental -- see the identical comment in app/api/research-pdf/route.tsx's
  // FieldRow for the full rationale. Fields like Business Colleagues, Boards,
  // and Family Foundation are entered as one person/entry per line via single
  // "\n" characters, with a blank line ("\n\n") separating groups (e.g. one
  // company's colleagues from the next). An earlier version of this function
  // collapsed every lone "\n" into a space on the theory that it was always
  // an unintentional artifact -- that broke exactly this legitimate
  // one-entry-per-line formatting, merging every person onto a single
  // crammed line. So: render the value's literal newlines as-is and let
  // FormattedText/react-pdf turn each "\n" into its own line.
  // Short values (a single line, e.g. address/phone/EIN) keep the tight
  // side-by-side row with wrap={false} -- the label is never orphaned from
  // its value across a page break, and there's no overflow risk since the
  // block is short.
  const isLong = value.length > 200 || value.includes("\n");
  if (!isLong) {
    return (
      <View style={pdfStyles.fieldRow} wrap={false}>
        <Text style={pdfStyles.fieldLabel}>{label.toUpperCase()}</Text>
        <FormattedText value={value} style={pdfStyles.fieldValue} />
      </View>
    );
  }
  // Long, multi-line free-text values (Types of Support, Limitations,
  // Application Information, History, etc.) use a "hanging indent" layout
  // instead of a flexDirection:row pair: the label is absolutely positioned
  // over the top-left corner, and the value's left indent is baked into its
  // OWN style (marginLeft) rather than coming from a sibling column. This is
  // what makes the indent survive a page break -- with the old row-based
  // layout, once the label's column "finishes" on the first page, the value
  // cell would collapse back to the full page width on the continuation
  // page, causing the value to visually jump from the right-hand column back
  // to the left margin. Baking the indent into the value's own text style
  // means every wrapped line, including lines after a page break, keeps the
  // same left offset.
  return (
    <View style={pdfStyles.fieldRowLong} minPresenceAhead={FIELD_ROW_LONG_MIN_PRESENCE_AHEAD}>
      <Text style={pdfStyles.fieldLabelAbs}>{label.toUpperCase()}</Text>
      <FormattedText value={value} style={pdfStyles.fieldValueIndented} />
    </View>
  );
}


// Section heading used to divide a Corporate/Foundation PDF into its
// distinct content groups (mirroring the on-screen form's SectionHeading
// groupings: Foundation Overview, Executives, Mission & Background,
// Grantmaking Focus, Application Process, etc.), so a large multi-field
// profile doesn't read as one undifferentiated wall of FieldRows.
// Anti-orphan guard: a section heading is only a couple of lines tall, so
// with plain wrap={false} it would always "fit" even with almost no room
// left on the page, rendering the heading alone at the very bottom with
// its content pushed entirely to the next page. minPresenceAhead reserves
// space equal to roughly the bottom quarter of the page (letter page is
// 792pt tall, so ~198pt); if a heading would start with less than that much
// room left before the footer, react-pdf moves the whole heading block to
// the top of the next page instead, so no section header is ever allowed to
// begin in the bottom quarter of a page. A smaller value (50pt) was tried
// to reduce white space, but it wasn't enough to reliably keep a heading
// and its first line of content together.
const SECTION_HEADING_MIN_PRESENCE_AHEAD = 200;

export function SectionHeading({ icon, title }: { icon?: IconName; title: string }) {
  if (icon) {
    return (
      <View style={pdfStyles.bigSectionHeadingRow} wrap={false} minPresenceAhead={SECTION_HEADING_MIN_PRESENCE_AHEAD}>
        <IconGlyph name={icon} color={NAVY} size={13} />
        <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginLeft: 6 }}>{title}</Text>
      </View>
    );
  }
  return (
    <View wrap={false} minPresenceAhead={SECTION_HEADING_MIN_PRESENCE_AHEAD}>
      <View style={pdfStyles.sectionAccent} />
      <Text style={pdfStyles.sectionHeading}>{title}</Text>
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

export function StarRating({ rawValue }: { rawValue?: string }) {
  if (!rawValue) return null;
  const stars = dsRatingToStars(rawValue);
  if (stars === null) {
    return <Text style={pdfStyles.statBoxValue}>{rawValue}</Text>;
  }
  return (
    <View>
      <View style={pdfStyles.starRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ marginRight: 1 }}>
            <StarIcon filled={i < stars} />
          </View>
        ))}
      </View>
      <Text style={pdfStyles.ratingRawText}>{rawValue}</Text>
    </View>
  );
}

export function MiniTable({
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
  bigTitle?: boolean;
  icon?: IconName;
  note?: string;
  headers: string[];
  colWidths: string[];
  rows: any[];
  renderRow: (row: any, i: number) => string[];
  keepTogether?: boolean;
}) {
  if (!rows || rows.length === 0) return null;

  const titleBlock = title ? (
    bigTitle ? (
      <>
        <View style={pdfStyles.sectionAccent} />
        <Text style={pdfStyles.sectionHeading}>{title}</Text>
      </>
    ) : (
      <View style={[pdfStyles.sectionHeadingRow, { marginBottom: 4 }]}>
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
        {note ? <Text style={pdfStyles.italicNote}>{note}</Text> : null}
        <View style={{ borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: LINE }}>
          <View style={pdfStyles.tableHeaderRow}>
            {headers.map((h, i) => (
              <Text key={h} style={[pdfStyles.tableHeaderCell, { width: colWidths[i] }]}>
                {h}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => {
            const cells = renderRow(row, i);
            return (
              <View style={[pdfStyles.tableRow, { backgroundColor: i % 2 === 1 ? ROW_TINT : CREAM }]} key={i}>
                {cells.map((c, ci) => (
                  <Text key={ci} style={[pdfStyles.tableCell, { width: colWidths[ci] }]}>
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

  // Only the title + header row are grouped into a wrap={false} block —
  // deliberately NOT the first data row (see the identical reasoning in
  // app/api/research-pdf/route.tsx's MiniTable). Bundling title+header+first
  // row together guaranteed a header was never separated from its column
  // labels, but caused a worse problem: when that combined block was even
  // slightly taller than the room left on a page, the WHOLE block got pushed
  // to the next page, wasting almost all of the remaining space on the
  // previous page. Grouping just the title + header row (much shorter) lets
  // it reliably fit in whatever small gap remains, so real content keeps
  // flowing onto the previous page whenever it actually fits.
  //
  // Every data row (including the first) carries its OWN left/right border
  // instead of being wrapped in one shared bordered container. A shared
  // container border here caused a real bug: when this row group spans a
  // page break, react-pdf renders the container's left/right border lines
  // down to the bottom of the page on the page where the split happens,
  // well past the last visible row, overlapping the fixed footer. Per-row
  // borders avoid this entirely since every row is its own independent
  // wrap={false} block with no taller shared ancestor for react-pdf to
  // mis-measure across the break.
  return (
    <View style={{ marginBottom: 8 }}>
      <View wrap={false}>
        {titleBlock}
        {note ? <Text style={pdfStyles.italicNote}>{note}</Text> : null}
        <View style={{ borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: LINE, borderTopLeftRadius: 8, borderTopRightRadius: 8, overflow: "hidden" }}>
          <View style={pdfStyles.tableHeaderRow}>
            {headers.map((h, i) => (
              <Text key={h} style={[pdfStyles.tableHeaderCell, { width: colWidths[i] }]}>
                {h}
              </Text>
            ))}
          </View>
        </View>
      </View>
      {rows.map((row, i) => {
        const isLast = i === rows.length - 1;
        const cells = renderRow(row, i);
        return (
          <View
            style={[
              pdfStyles.tableRow,
              {
                backgroundColor: i % 2 === 1 ? ROW_TINT : CREAM,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: LINE,
                borderBottomLeftRadius: isLast ? 8 : 0,
                borderBottomRightRadius: isLast ? 8 : 0,
                overflow: "hidden",
              },
            ]}
            key={i}
            wrap={false}
          >
            {cells.map((c, ci) => (
              <Text key={ci} style={[pdfStyles.tableCell, { width: colWidths[ci] }]}>
                {c}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// Repeatable "Key Person"/"Executive" card for the PDF side -- one photo +
// name/title/contact/bio, matching the on-screen PersonCard in
// lib/profile-form-kit.tsx. Anti-orphan handling (title + first card grouped
// as one wrap={false} block, same pattern as the Individual PDF's Real
// Estate section) is left to the caller since the caller also owns the
// section heading text ("Key People" vs "Executive Leadership").
//
// The header (photo/name/title/contact) always stays in its own small
// bordered box, and the bio ALWAYS renders as plain indented text below/
// outside that border, regardless of bio length -- this used to branch on
// bio length (short bios rendered fully inside one combined box), but that
// produced visibly inconsistent formatting whenever a document mixed short
// and long bios among its executives (e.g. one exec's bio sitting inside
// the box while every other exec's bio sits outside it). Always using the
// split layout keeps every card visually consistent no matter how short or
// long an individual bio is. The header box is always short and therefore
// always safely wrap={false} -- it never needs to split across a page. The
// bio itself carries no border of its own, so it can paginate freely. This
// also preserves the original fix for a real visual bug: when the ENTIRE
// card (border + bio) was one wrap={false} block, a page break in the
// middle of the bio cut the rounded border off flush at the bottom of the
// page, right against the footer, making the card look like it was running
// into the footer band.
export function PersonPdfCard({ person }: { person: PersonEntry }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={pdfStyles.personCardHeader} wrap={false}>
        {person.photo ? (
          <Image src={person.photo} style={pdfStyles.personPhoto} />
        ) : (
          <View style={pdfStyles.personPhotoPlaceholder} />
        )}
        <View style={{ flex: 1 }}>
          {person.name ? <Text style={pdfStyles.personName}>{person.name}</Text> : null}
          {person.title ? <Text style={pdfStyles.personTitle}>{person.title}</Text> : null}
          {person.contactInfo ? <Text style={pdfStyles.personContact}>{person.contactInfo}</Text> : null}
        </View>
      </View>
      {person.bio ? <FormattedText value={person.bio} style={pdfStyles.personBioIndented} /> : null}
    </View>
  );
}

// Header/footer chrome shared by both new PDF types -- identical brand
// treatment to the Individual PDF's HeaderFooter (continuation top bar +
// confidentiality footer), parameterized only by the document's display
// name for the "Page X of Y" running header.
export function HeaderFooter({ data }: { data: any }) {
  const rightText = metaText(data);
  return (
    <>
      <View
        style={pdfStyles.topBarFrame}
        fixed
        render={({ pageNumber }) =>
          pageNumber === 1 ? null : (
            <View style={pdfStyles.topBar}>
              <Text
                style={pdfStyles.topBarContinuedText}
                render={({ pageNumber: pn, totalPages }) =>
                  `${(data.name || "Profile").toString()}    Page ${pn} of ${totalPages}`
                }
              />
              <Text style={pdfStyles.topBarText}>{rightText || "Catapult Fundraising"}</Text>
            </View>
          )
        }
      />
      <View style={pdfStyles.footer} fixed>
        {data.catapultId ? <Text style={pdfStyles.footerText}>Catapult ID: {data.catapultId}</Text> : null}
        <Text style={pdfStyles.footerText}>
          This information has been compiled and presented by Catapult Fundraising as of{" "}
          {data.dateCreated || "(date)"}. It should be regarded as Confidential Information.
        </Text>
        <Text style={pdfStyles.footerText}>
          This document may contain information that is privileged, confidential, or otherwise
          protected from disclosure. Any review, dissemination, or use of this transmission or any
          of its contents by persons other than the addressee is strictly prohibited.
        </Text>
      </View>
    </>
  );
}

// Hero band shared by both new PDF types -- same navy/brass banner as the
// Individual PDF, but with a single square logo/photo slot (rounded square,
// not circular headshot) since Corporate/Foundation profiles center on an
// org logo rather than a person's portrait, and a caller-supplied eyebrow
// label ("CORPORATE INTELLIGENCE PROFILE" / "FOUNDATION INTELLIGENCE
// PROFILE") instead of the Individual's fixed "PROSPECT INTELLIGENCE PROFILE".
export function HeroBand({ data, eyebrow }: { data: any; eyebrow: string }) {
  const rightText = metaText(data);
  return (
    <View style={pdfStyles.heroBand}>
      <Image src={LOGO_URL} style={pdfStyles.heroLogo} />
      <View style={pdfStyles.heroMetaAbs}>
        <Text style={pdfStyles.topBarConfidential}>CONFIDENTIAL</Text>
        {rightText ? <Text style={pdfStyles.topBarText}>{rightText}</Text> : null}
      </View>
      <View style={pdfStyles.heroContentCol}>
        <Text style={pdfStyles.heroEyebrow}>{eyebrow}</Text>
        <Text style={pdfStyles.heroTitle}>{data.name || "NAME"}</Text>
        {data.clientId ? <Text style={pdfStyles.heroTitleId}>Client ID: {data.clientId}</Text> : null}
      </View>
      {data.photo ? (
        <Image src={data.photo} style={pdfStyles.heroLogoImage} />
      ) : (
        <View style={pdfStyles.heroLogoPlaceholder} />
      )}
    </View>
  );
}
