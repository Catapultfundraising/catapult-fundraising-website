import { PROSPECT_NOTES_LABEL } from "./portal-v2/report-fields";
import { Font, Text, View } from "@react-pdf/renderer";
import type { bs } from "./jag-brand-pdf";
import type { ExportCol, ExportSection } from "./jag-brand-xlsx";

// A fifteen-column prospect roster cannot fit legibly on Letter landscape.
// Retain every field in bounded metadata bands, with full-width, splittable notes.
export function isWideProspectTable(cols: ExportCol[]) {
  return cols.length >= 10 && cols.some(c => c.label === PROSPECT_NOTES_LABEL);
}
const COMBINING_MARK = new RegExp("\\p{Mark}", "u");
export type BoundedPdfText = (text: string, width: number, bold?: boolean) => string;
export async function loadBoundedPdfText(): Promise<BoundedPdfText> {
  const descriptors = [400, 700].map(fontWeight => ({ fontFamily: "Manrope", fontWeight }));
  await Promise.all(descriptors.map(descriptor => Font.load(descriptor)));
  const fonts = descriptors.map(descriptor => Font.getFont(descriptor).data!);
  const cache = new Map<string, number>();
  return (text, width, bold = false) => {
    const font = fonts[bold ? 1 : 0], size = bold ? 7 : 7.5;
    const measure = (word: string) => {
      const key = `${bold}:${word}`;
      let value = cache.get(key);
      if (value === undefined) {
        value = font.layout(word).advanceWidth * size / font.unitsPerEm;
        cache.set(key, value);
      }
      return value;
    };
    // Only overlong tokens change layout. Newlines are not content, and unlike
    // discretionary hyphenation they never invent a character in an ID or URL.
    return text.replace(/\S+/g, word => {
      if (measure(word) <= width - 1) return word;
      const lines: string[] = [];
      let part = "";
      for (const char of Array.from(word)) {
        // Keep combining marks with the preceding codepoint.
        if (part && !COMBINING_MARK.test(char) && measure(part + char) > width - 1) {
          lines.push(part); part = "";
        }
        part += char;
      }
      lines.push(part);
      return lines.join("\n");
    });
  };
}

export function WideProspectRows({ cols, rows, width, styles, format, bound }: {
  cols: ExportCol[]; rows: ExportSection["rows"]; width: number;
  styles: Pick<typeof bs, "tr" | "trAlt" | "td">;
  format: (value: string | number | null, kind?: string) => string;
  bound: BoundedPdfText;
}) {
  const metadata = cols.map((col, index) => ({ col, index })).filter(({ col }) => col.label !== PROSPECT_NOTES_LABEL);
  const notes = cols.map((col, index) => ({ col, index })).filter(({ col }) => col.label === PROSPECT_NOTES_LABEL);
  const bands = Array.from({ length: Math.ceil(metadata.length / 6) }, (_, i) => metadata.slice(i * 6, i * 6 + 6));
  const label = { fontSize: 7, fontWeight: 700 as const, opacity: 0.7, marginBottom: 2 };
  return <>{rows.map((row, ri) => <View key={ri} style={[ri % 2 ? styles.trAlt : styles.tr, { flexDirection: "column", marginBottom: 7 }]} wrap>
    {bands.map((band, bi) => <View key={bi} style={{ flexDirection: "row" }} wrap>
      {band.map(({ col, index }) => <View key={index} style={{ width: width / 6, flexShrink: 0, paddingHorizontal: 4, paddingVertical: 4 }}>
        <Text style={label} minPresenceAhead={12}>{bound(col.label.toUpperCase(), width / 6 - 8, true)}</Text>
        <Text style={{ fontSize: 7.5 }}>{bound(format(row[index], col.kind), width / 6 - 8)}</Text>
      </View>)}
    </View>)}
    {notes.map(({ col, index }) => <View key={index} style={{ paddingHorizontal: 4, paddingVertical: 4 }} wrap>
      <Text style={label} minPresenceAhead={12}>{col.label.toUpperCase()}</Text>
      <Text style={{ fontSize: 7.5, lineHeight: 1.4 }}>{bound(format(row[index], col.kind), width - 8)}</Text>
    </View>)}
  </View>)}</>;
}
