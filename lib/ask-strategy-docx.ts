import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Header,
  Footer,
  AlignmentType,
  LevelFormat,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
} from "docx";
import type { AskStrategy, CaseAlignmentPoint } from "./ask-strategy";

// Header/top-of-page Catapult Fundraising logo (dark-on-light lockup), matching
// the one used at the top of the live site — distinct from the light/white
// wordmark variant used inside the navy PDF header band.
const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ccdcb7df-f854-4cf8-a390-1d9eb56ecd9d.png";

// Brand palette — matches the Prospect Intelligence Profile PDF.
const NAVY = "15212E";
const BRASS = "B28C46";
const PAPER = "FAF7F0";
const INK = "181B19";
const MUTED = "5C5D59";
const LINE = "D6CDBA";

const CONTENT_WIDTH = 9360; // US Letter, 1" margins, DXA

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRASS, space: 4 } },
    children: [new TextRun({ text, color: NAVY, bold: true })],
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, color: BRASS, bold: true })],
  });
}

function bulletList(items: string[]): Paragraph[] {
  if (!items || items.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: "None noted.", italics: true, color: MUTED })] })];
  }
  return items.map(
    (item) =>
      new Paragraph({
        numbering: { reference: "ask-strategy-bullets", level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: item, color: INK })],
      })
  );
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: text || "Not available.", color: INK })],
  });
}

async function fetchLogoBuffer(): Promise<Buffer | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function highlightBox(label: string, value: string): TableCell {
  return new TableCell({
    width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    margins: { top: 160, bottom: 160, left: 200, right: 200 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: label.toUpperCase(), color: "CDAA6E", size: 15, bold: true }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60 },
        children: [new TextRun({ text: value || "Not specified", color: PAPER, size: 26, bold: true })],
      }),
    ],
  });
}

function objectionTable(rows: Array<{ objection: string; response: string }>): Table | Paragraph {
  if (!rows || rows.length === 0) {
    return new Paragraph({ children: [new TextRun({ text: "None noted.", italics: true, color: MUTED })] });
  }
  const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colWidths = [Math.round(CONTENT_WIDTH * 0.42), Math.round(CONTENT_WIDTH * 0.58)];

  const headerRow = new TableRow({
    children: ["Anticipated Objection", "Suggested Response"].map(
      (text, i) =>
        new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          borders,
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text, color: PAPER, bold: true, size: 17 })] })],
        })
    ),
  });

  const dataRows = rows.map(
    (row, i) =>
      new TableRow({
        children: [row.objection, row.response].map(
          (text, ci) =>
            new TableCell({
              width: { size: colWidths[ci], type: WidthType.DXA },
              borders,
              shading: { fill: i % 2 === 1 ? PAPER : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text, color: INK, size: 18 })] })],
            })
        ),
      })
  );

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

function caseAlignmentTable(points: CaseAlignmentPoint[]): Table | Paragraph {
  if (!points || points.length === 0) {
    return new Paragraph({
      children: [
        new TextRun({
          text: "No profile traits (interests, boards, relationship, etc.) were available to compare against the case for support.",
          italics: true,
          color: MUTED,
        }),
      ],
    });
  }
  const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colWidths = [Math.round(CONTENT_WIDTH * 0.22), Math.round(CONTENT_WIDTH * 0.3), Math.round(CONTENT_WIDTH * 0.48)];

  const headerRow = new TableRow({
    children: ["Profile Trait", "From the Prospect Intelligence Profile", "Connection to the Case for Support"].map(
      (text, i) =>
        new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          borders,
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text, color: PAPER, bold: true, size: 16 })] })],
        })
    ),
  });

  const dataRows = points.map(
    (point, i) =>
      new TableRow({
        children: [point.profileTrait, point.profileValue, point.caseConnection].map(
          (text, ci) =>
            new TableCell({
              width: { size: colWidths[ci], type: WidthType.DXA },
              borders,
              shading: { fill: i % 2 === 1 ? PAPER : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text, color: INK, size: 17, bold: ci === 0 })],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

export interface AskStrategyDocxParams {
  prospectName: string;
  clientOrgName: string;
  catapultId?: string;
  generatedDate: string;
  strategy: AskStrategy;
}

export async function buildAskStrategyDocx(params: AskStrategyDocxParams): Promise<Buffer> {
  const { prospectName, clientOrgName, catapultId, generatedDate, strategy } = params;
  const logoBuffer = await fetchLogoBuffer();

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 21, color: INK } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: NAVY },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 21, bold: true, font: "Arial", color: BRASS },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "ask-strategy-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 540, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "CONFIDENTIAL", color: BRASS, bold: true, size: 15 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
                children: [
                  new TextRun({
                    text: `Catapult Fundraising — Confidential Donor Ask Strategy${
                      catapultId ? ` — Catapult ID: ${catapultId}` : ""
                    }`,
                    size: 14,
                    color: MUTED,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Page ", size: 14, color: MUTED }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: MUTED }),
                  new TextRun({ text: " of ", size: 14, color: MUTED }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: MUTED }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...(logoBuffer
            ? [
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: "png",
                      data: logoBuffer,
                      transformation: { width: 236, height: 158 },
                      altText: { title: "Catapult Fundraising", description: "Logo", name: "Logo" },
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "DONOR ASK STRATEGY", color: BRASS, bold: true, size: 18 }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { before: 60, after: 40 },
            children: [new TextRun({ text: prospectName || "Prospect", color: NAVY, bold: true, size: 40 })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `Prepared for ${clientOrgName}  •  ${generatedDate}`, color: MUTED, size: 18 }),
            ],
          }),

          heading("Executive Summary"),
          bodyParagraph(strategy.executiveSummary),

          heading("Recommended Ask"),
          new Table({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            columnWidths: [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2],
            rows: [
              new TableRow({
                children: [
                  highlightBox("Recommended Ask Amount", strategy.recommendedAskAmount),
                  highlightBox("Suggested Ask Range", strategy.askRange),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 200 } }),

          heading("Case Alignment Points"),
          caseAlignmentTable(strategy.caseAlignmentPoints),
          new Paragraph({ spacing: { before: 200 } }),

          heading("Key Talking Points"),
          ...bulletList(strategy.talkingPoints),

          heading("Face-to-Face Meeting Preparation"),
          subheading("Preparation Notes"),
          ...bulletList(strategy.meetingPreparation),
          subheading("Do"),
          ...bulletList(strategy.doThis),
          subheading("Avoid"),
          ...bulletList(strategy.avoidThis),
          subheading("Suggested Questions to Ask the Prospect"),
          ...bulletList(strategy.suggestedQuestions),

          heading("Anticipated Objections & Responses"),
          objectionTable(strategy.objectionHandling),
          new Paragraph({ spacing: { before: 200 } }),

          heading("Recommended Next Steps"),
          ...bulletList(strategy.nextSteps),

          new Paragraph({
            spacing: { before: 280 },
            children: [
              new TextRun({
                text:
                  `This ask strategy was generated on ${generatedDate} by combining the Prospect ` +
                  `Intelligence Profile with the client's case for support on file. It is a ` +
                  `recommendation to inform gift officer judgment, not a guarantee of donor response. ` +
                  `This document is Confidential Information of Catapult Fundraising and its clients.`,
                italics: true,
                size: 15,
                color: MUTED,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
