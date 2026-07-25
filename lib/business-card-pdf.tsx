import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// US business card: 3.5in x 2in trim, with 0.125in bleed on every side.
// 1in = 72pt -> bleed canvas = 3.75in x 2.25in = 270pt x 162pt
const BLEED_W = 270;
const BLEED_H = 162;
const TRIM_W = 252; // 3.5in
const TRIM_H = 144; // 2in
const TRIM_X = (BLEED_W - TRIM_W) / 2; // 9
const TRIM_Y = (BLEED_H - TRIM_H) / 2; // 9
const SAFE = 10; // extra inset inside the trim line for live text

const NAVY = "#15212E";
const BRASS = "#B28C46";
const PAPER = "#FAF7F0";

const FRONT_IMAGE_URL =
  "https://galaxy-prod.tlcdn.com/view/user_35qqBV71YqPhG02PJcVxttmFcLs/e8b9a9018e5b40ff83a38b10a4cf3203.png";
const LOGO_LOCKUP_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ccdcb7df-f854-4cf8-a390-1d9eb56ecd9d.png";

const styles = StyleSheet.create({
  bleedPage: {
    backgroundColor: PAPER,
  },
  trimBox: {
    position: "absolute",
    left: TRIM_X,
    top: TRIM_Y,
    width: TRIM_W,
    height: TRIM_H,
  },
  cropMark: {
    position: "absolute",
    backgroundColor: "#999999",
  },
  frontImage: {
    width: TRIM_W,
    height: TRIM_H,
  },
  backLogo: {
    position: "absolute",
    left: TRIM_X + SAFE,
    top: TRIM_Y + SAFE,
    width: 92,
    height: (92 * 1024) / 1536,
  },
  backRule: {
    position: "absolute",
    left: TRIM_X + SAFE,
    top: TRIM_Y + SAFE + (92 * 1024) / 1536 + 8,
    width: 78,
    height: 1.4,
    backgroundColor: BRASS,
  },
  nameBlock: {
    position: "absolute",
    left: TRIM_X + SAFE,
    bottom: TRIM_Y + SAFE,
  },
  name: {
    fontFamily: "Times-Bold",
    fontSize: 13.5,
    color: NAVY,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.2,
    color: BRASS,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 3,
  },
  contactBlock: {
    position: "absolute",
    right: TRIM_X + SAFE,
    bottom: TRIM_Y + SAFE,
    alignItems: "flex-end",
  },
  contactLine: {
    fontFamily: "Helvetica",
    fontSize: 6.8,
    color: NAVY,
    marginTop: 3.5,
  },
});

export interface BusinessCardData {
  fullName: string;
  title: string;
  cellPhone: string;
  officePhone: string;
  email: string;
  includeCropMarks: boolean;
}

// Crop marks live entirely inside the bleed margin (0 -> TRIM_X/TRIM_Y), pointing
// at each trim corner. Kept within [0, BLEED_W] x [0, BLEED_H] on purpose --
// negative coordinates trigger a pagination bug in @react-pdf/renderer's layout engine.
function CropMarks() {
  const len = Math.max(TRIM_X, TRIM_Y) - 1; // stay just shy of the trim line
  const marks = [
    // top-left
    { left: 0, top: TRIM_Y, width: len, height: 0.5 },
    { left: TRIM_X, top: 0, width: 0.5, height: len },
    // top-right
    { left: BLEED_W - len, top: TRIM_Y, width: len, height: 0.5 },
    { left: BLEED_W - TRIM_X, top: 0, width: 0.5, height: len },
    // bottom-left
    { left: 0, top: BLEED_H - TRIM_Y, width: len, height: 0.5 },
    { left: TRIM_X, top: BLEED_H - len, width: 0.5, height: len },
    // bottom-right
    { left: BLEED_W - len, top: BLEED_H - TRIM_Y, width: len, height: 0.5 },
    { left: BLEED_W - TRIM_X, top: BLEED_H - len, width: 0.5, height: len },
  ];
  return (
    <>
      {marks.map((m, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <View key={i} style={[styles.cropMark, m]} />
      ))}
    </>
  );
}

function FrontPage({ includeCropMarks }: { includeCropMarks: boolean }) {
  return (
    <Page size={[BLEED_W, BLEED_H]} style={styles.bleedPage}>
      <View style={styles.trimBox}>
        <Image src={FRONT_IMAGE_URL} style={styles.frontImage} />
      </View>
      {includeCropMarks && <CropMarks />}
    </Page>
  );
}

function BackPage({ data }: { data: BusinessCardData }) {
  const name = data.fullName || "Your Name";
  const title = data.title || "Your Title";
  return (
    <Page size={[BLEED_W, BLEED_H]} style={styles.bleedPage}>
      <Image src={LOGO_LOCKUP_URL} style={styles.backLogo} />
      <View style={styles.backRule} />

      <View style={styles.nameBlock}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.contactBlock}>
        {data.cellPhone ? <Text style={styles.contactLine}>{data.cellPhone}</Text> : null}
        {data.officePhone ? <Text style={styles.contactLine}>{data.officePhone}</Text> : null}
        {data.email ? <Text style={styles.contactLine}>{data.email}</Text> : null}
        <Text style={styles.contactLine}>catapultfr.com</Text>
      </View>

      {data.includeCropMarks && <CropMarks />}
    </Page>
  );
}

export async function renderBusinessCardPdf(data: BusinessCardData): Promise<Buffer> {
  const doc = (
    <Document
      title={`Catapult Fundraising Business Card - ${data.fullName || "Team Member"}`}
      author="Catapult Fundraising"
    >
      <FrontPage includeCropMarks={data.includeCropMarks} />
      <BackPage data={data} />
    </Document>
  );
  return renderToBuffer(doc);
}
