import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isResearchAuthed } from "@/lib/research-auth";

export const runtime = "nodejs";

const HEADERS = [
  "Prospect Name",
  "Client / Profiler",
  "Catapult ID",
  "Client ID",
  "Giving Year",
  "Giving Amount",
  "Giving Comments",
];

// One row per gift — repeat the same "Prospect Name" across multiple rows to
// give a prospect more than one year of giving history. Rows with a blank
// Giving Year/Amount/Comments are fine too; the prospect will just have no
// giving history pre-filled.
const EXAMPLE_ROWS = [
  ["Jane Smith", "SCFTA/JG", "CPT-1042", "CID-88231", "2024", "5000", "Annual gala gift"],
  ["Jane Smith", "SCFTA/JG", "CPT-1042", "CID-88231", "2023", "2500", ""],
  ["John Doe", "Owens/AA", "CPT-1099", "CID-40217", "2024", "10000", "Capital campaign pledge"],
];

export async function GET(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...EXAMPLE_ROWS]);
  sheet["!cols"] = HEADERS.map((h) => ({ wch: Math.max(16, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, sheet, "Prospect List");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="prospect-list-template.xlsx"',
    },
  });
}
