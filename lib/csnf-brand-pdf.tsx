import { Font, StyleSheet, View, Text, Image } from "@react-pdf/renderer";
import { FIRM_EMAIL, FIRM_PHONE } from "@/lib/constants";

// Catapult 2026 print kit (navy/gold lockup, Fraunces + Manrope, navy footer
// bar), shared by every CSNF data portal download.
export const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ffe08cd7-6dee-47f3-b390-61aecad692c2.png";
export const LOGO_ASPECT = 9225 / 2342;
let registered = false;
export function registerBrandFonts() {
  if (registered) return;
  registered = true;
  Font.register({
    family: "Fraunces",
    fonts: [
      { src: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/cc2d6b8f-0c3e-4698-9c68-b5d415be1099.ttf", fontWeight: 700 },
      { src: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/db212b4c-d637-4eff-8bba-60ffe9621fc2.ttf", fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "Manrope",
    fonts: [
      { src: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/35abe087-db6f-4eaf-9cc4-71431c314986.ttf", fontWeight: 400 },
      { src: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ff98cee2-dc89-4bf9-a134-1308b5b6cbce.ttf", fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
}

export const NAVY = "#15212E";
export const BRASS = "#B28C46";
export const LINE = "#D6CDBA";
export const CREAM = "#F1ECE0";
export const PAD = 36;

export const bs = StyleSheet.create({
  page: { backgroundColor: "#FFFFFF", paddingTop: PAD, paddingBottom: 58, paddingHorizontal: PAD, fontFamily: "Manrope", color: NAVY },
  logo: { height: 26, width: 26 * LOGO_ASPECT, objectFit: "contain" },
  rule: { height: 1.5, backgroundColor: BRASS, marginTop: 6, marginBottom: 12 },
  eyebrow: { fontSize: 9, fontWeight: 700, color: BRASS, textTransform: "uppercase", letterSpacing: 1.4 },
  title: { fontSize: 19, fontFamily: "Fraunces", fontWeight: 700, marginTop: 3, lineHeight: 1.15 },
  meta: { fontSize: 8.5, opacity: 0.65, marginTop: 4 },
  intro: { fontSize: 8.8, lineHeight: 1.45, marginTop: 8, opacity: 0.85 },
  section: { fontSize: 12, fontFamily: "Fraunces", fontWeight: 700, marginTop: 14, marginBottom: 6 },
  thead: { flexDirection: "row", backgroundColor: NAVY },
  th: { fontSize: 7, fontWeight: 700, color: "#FFFFFF", paddingVertical: 5, paddingHorizontal: 4, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE },
  trAlt: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE, backgroundColor: CREAM },
  td: { fontSize: 7.5, paddingVertical: 3.5, paddingHorizontal: 4 },
  band: { flexDirection: "row", backgroundColor: BRASS, paddingVertical: 5, paddingHorizontal: 6, marginTop: 8 },
  bandText: { fontSize: 9, fontWeight: 700, color: NAVY },
  footnote: { fontSize: 7.2, opacity: 0.6, marginTop: 6, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, height: 34, backgroundColor: NAVY, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: PAD },
  footerText: { fontSize: 7.2, color: "#FFFFFF", opacity: 0.85 },
  footerTag: { fontSize: 7.5, fontFamily: "Fraunces", fontStyle: "italic", color: BRASS },
});

export function BrandHeader({ client }: { client: string }) {
  return (
    <View fixed>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Image src={LOGO_URL} style={bs.logo} />
        <Text style={{ fontSize: 8, opacity: 0.6 }}>Prepared for {client} · Confidential</Text>
      </View>
      <View style={bs.rule} />
    </View>
  );
}

export function BrandFooter() {
  return (
    <View style={bs.footer} fixed>
      <Text style={bs.footerText} render={({ pageNumber, totalPages }) => `catapultfr.com · ${FIRM_PHONE} · ${FIRM_EMAIL}   |   Page ${pageNumber} of ${totalPages}`} />
      <Text style={bs.footerTag}>Growing your donor base at every stage of the giving journey</Text>
    </View>
  );
}

export const preparedOn = () =>
  new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
