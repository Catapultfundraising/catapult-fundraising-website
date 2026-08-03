import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isResearchAuthed } from "@/lib/research-auth";
import { getRoster, saveRoster, clearRoster, type RosterProspect } from "@/lib/research-roster-store";

export const runtime = "nodejs";

// Accepts a range of header spellings so the database manager doesn't need
// to match an exact template — everything is normalized (lowercased, all
// non-alphanumeric characters stripped) before being matched.
const HEADER_MAP: Record<string, keyof MappedRow> = {
  name: "name",
  prospect: "name",
  prospectname: "name",
  fullname: "name",
  donorname: "name",
  client: "clientProfiler",
  clientprofiler: "clientProfiler",
  clientnameprofilerinitials: "clientProfiler",
  clientorganization: "clientProfiler",
  organization: "clientProfiler",
  org: "clientProfiler",
  catapultid: "catapultId",
  catapultidnumber: "catapultId",
  cptid: "catapultId",
  clientid: "clientId",
  clientidnumber: "clientId",
  givingyear: "year",
  giftyear: "year",
  year: "year",
  givingamount: "amount",
  giftamount: "amount",
  amount: "amount",
  gift: "amount",
  givingcomments: "comments",
  giftcomments: "comments",
  comments: "comments",
  notes: "comments",
};

interface MappedRow {
  name?: string;
  clientProfiler?: string;
  catapultId?: string;
  clientId?: string;
  year?: string;
  amount?: string;
  comments?: string;
}

function normalizeHeader(h: string): string {
  return String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mapRow(raw: Record<string, unknown>): MappedRow {
  const mapped: MappedRow = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = HEADER_MAP[normalizeHeader(key)];
    if (!field) continue;
    const str = value === null || value === undefined ? "" : String(value).trim();
    if (str) mapped[field] = str;
  }
  return mapped;
}

function buildRoster(rows: Record<string, unknown>[]): RosterProspect[] {
  const order: string[] = [];
  const byName = new Map<string, RosterProspect>();

  for (const raw of rows) {
    const m = mapRow(raw);
    const name = m.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();

    if (!byName.has(key)) {
      byName.set(key, {
        name,
        clientProfiler: m.clientProfiler || "",
        catapultId: m.catapultId || "",
        clientId: m.clientId || "",
        givingHistoryRows: [],
      });
      order.push(key);
    }

    const entry = byName.get(key)!;
    if (!entry.clientProfiler && m.clientProfiler) entry.clientProfiler = m.clientProfiler;
    if (!entry.catapultId && m.catapultId) entry.catapultId = m.catapultId;
    if (!entry.clientId && m.clientId) entry.clientId = m.clientId;

    if (m.year || m.amount || m.comments) {
      entry.givingHistoryRows.push({
        year: m.year || "",
        amount: m.amount || "",
        comments: m.comments || "",
      });
    }
  }

  return order.map((k) => byName.get(k)!);
}

export async function GET(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const roster = await getRoster();
    return NextResponse.json({ roster: roster || { fileName: "", uploadedAt: "", prospects: [] } });
  } catch (err) {
    console.error("research-roster GET error", err);
    return NextResponse.json({ error: "Failed to load the prospect list." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
    }
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ error: "That file doesn't have any sheets." }, { status: 400 });
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const prospects = buildRoster(rows);
    if (prospects.length === 0) {
      return NextResponse.json(
        { error: "No prospects found. Make sure the sheet has a 'Name' column with at least one row filled in." },
        { status: 400 }
      );
    }

    const roster = await saveRoster({ fileName: file.name || "roster.xlsx", prospects });
    return NextResponse.json({ ok: true, roster });
  } catch (err) {
    console.error("research-roster POST error", err);
    return NextResponse.json({ error: "Failed to read that spreadsheet. Please check the format and try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await clearRoster();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("research-roster DELETE error", err);
    return NextResponse.json({ error: "Failed to clear the prospect list." }, { status: 500 });
  }
}
