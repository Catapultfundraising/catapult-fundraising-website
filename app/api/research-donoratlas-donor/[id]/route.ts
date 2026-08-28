import { NextResponse } from "next/server";
import { getDonorById } from "@/lib/donoratlas-client";

export const runtime = "nodejs";
export const maxDuration = 30;

function formatCompactMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `$${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `$${trim(n / 1e3)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatPreciseMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatAddress(addr: any): string {
  if (!addr) return "";
  const parts = [
    [addr.street_address, addr.street_address_line_2].filter(Boolean).join(" "),
    [addr.city, addr.state].filter(Boolean).join(", "),
    addr.zip,
  ].filter(Boolean);
  return parts.join(", ");
}

function formatYearRange(range: any): string {
  if (!Array.isArray(range) || range.length === 0) return "";
  const [start, end] = range;
  if (start == null && end == null) return "";
  if (start == null) return String(end);
  if (end == null) return String(start);
  return start === end ? String(start) : `${start} - ${end}`;
}

// Fetches a remote image and returns it as a base64 data URI, mirroring how
// uploaded photos are already stored elsewhere in this app (as data URIs in
// ProfileData.photo). No resizing is done here -- adding an image-resize
// dependency (e.g. sharp) risks the same Next.js serverless build-tracing
// issue we hit earlier with pdf-lib/pdfkit, so this intentionally stays a
// plain fetch. DonorAtlas's cached profile photos are already reasonably
// sized for this use.
async function fetchImageAsDataUri(url: string | null | undefined): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

// Maps a raw DonorAtlas APIDonor object onto the subset of ProfileData
// fields we can reliably populate from it. Verified directly against a live
// API response (not just the docs): DonorAtlas's donor object genuinely has
// no marital status, spouse, children/family roster, phone, or email fields
// anywhere in its schema -- those keys simply don't exist, so they're
// omitted here and still need the PDF-upload import or manual entry.
// Street-level real estate detail and itemized per-gift-year giving are
// also not available in the shape our form expects (real estate DOES exist
// as an asset type, but only as a value range/description, no address; and
// donations are aggregated per-nonprofit lifetime totals, not per-gift-year
// rows) -- both are mapped as best-effort below where DonorAtlas has data.
// `political_stats` is likewise a pure aggregate (total, average, per-year,
// party/chamber splits) with NO itemized recipient-committee list anywhere
// in the schema, so a single labeled "aggregate" row is synthesized into
// the FEC table below rather than leaving it silently empty.
function mapDonorToProfileFields(donor: any) {
  const name = donor?.name || {};
  const fullName = [name.first, name.middle, name.last, name.suffix].filter(Boolean).join(" ");

  const netWorthEstimate =
    donor?.net_worth_estimate ??
    (donor?.net_worth_min != null && donor?.net_worth_max != null
      ? (donor.net_worth_min + donor.net_worth_max) / 2
      : donor?.net_worth_min ?? donor?.net_worth_max ?? null);

  const salaryText =
    donor?.salary?.min != null && donor?.salary?.max != null
      ? `${formatCompactMoney(donor.salary.min)}-${formatCompactMoney(donor.salary.max)}/yr`
      : "";

  const predictedAnnualGiving = donor?.nonprofit_stats?.capacity?.predicted_annual_giving;
  const givingCapacity =
    predictedAnnualGiving != null ? formatCompactMoney(predictedAnnualGiving * 5) : "";

  const capacityExplanations: any[] = donor?.nonprofit_stats?.capacity?.explanations || [];
  const wealthRating =
    capacityExplanations.find((e) => /capacity/i.test(e?.title || ""))?.title || "";

  const boards = (Array.isArray(donor?.board_affiliations) ? donor.board_affiliations : [])
    .filter((b: any) => (b?.probability ?? 1) >= 0.7)
    .map((b: any) => {
      const years = formatYearRange(b.year_range);
      return `${b.name}${b.title && b.title !== "Unknown" ? `: ${b.title}` : ""}${years ? `, ${years}` : ""}`;
    })
    .join("\n");

  const businessAddresses = (Array.isArray(donor?.work) ? donor.work : [])
    .map((w: any) => {
      const startYear = w.start_date ? String(w.start_date).slice(0, 4) : "";
      const endYear = w.end_date ? String(w.end_date).slice(0, 4) : "Present";
      const years = startYear ? `${startYear} - ${endYear}` : "";
      return `${w.company_name}${w.job_title ? `: ${w.job_title}` : ""}${years ? `, ${years}` : ""}`;
    })
    .join("\n");

  const educationEntries = (Array.isArray(donor?.education) ? donor.education : []).map((e: any) => ({
    institution: e.institution_name || "",
    degree: e.degree || "",
    year: e.graduation_year ? String(e.graduation_year) : "",
  }));

  const otherGiving = (Array.isArray(donor?.donations) ? donor.donations : [])
    .filter((d: any) => (d?.probability ?? 1) >= 0.7)
    .map((d: any) => {
      const [min, max] = Array.isArray(d.amount_range) ? d.amount_range : [null, null];
      const amount =
        min != null && max != null
          ? min === max
            ? formatPreciseMoney(min)
            : `${formatPreciseMoney(min)} - ${formatPreciseMoney(max)}`
          : "";
      return {
        recipient: d.name || "",
        giving: "",
        year: formatYearRange(d.year_range),
        amount,
      };
    });

  const realEstate = (Array.isArray(donor?.assets) ? donor.assets : [])
    .filter((a: any) => a?.type === "real_estate")
    .map((a: any) => ({
      photo: "",
      address: "",
      description: a.description || a.name || "",
      value:
        a.value_min != null && a.value_max != null
          ? a.value_min === a.value_max
            ? formatCompactMoney(a.value_min)
            : `${formatCompactMoney(a.value_min)} - ${formatCompactMoney(a.value_max)}`
          : "",
      purchaseInfo: "",
    }));

  // Private foundations the donor is connected to (trustee, founder, etc.) --
  // maps onto the existing "Family Foundation" field, same as a PDF import
  // would report from a wealth-screening document's foundation section.
  const familyFoundation = (Array.isArray(donor?.private_foundations) ? donor.private_foundations : [])
    .map((f: any) => {
      const assetsText = f.assets != null ? ` (Assets: ${formatCompactMoney(f.assets)})` : "";
      return `${f.name}${f.relationship ? `: ${f.relationship}` : ""}${assetsText}`;
    })
    .join("\n");

  const donationYears = (Array.isArray(donor?.donations) ? donor.donations : []).flatMap(
    (d: any) => (Array.isArray(d.year_range) ? d.year_range : []) as number[]
  );
  const minYear = donationYears.length ? Math.min(...donationYears) : null;
  const maxYear = donationYears.length ? Math.max(...donationYears) : null;
  const totalCharitableGiving = donor?.nonprofit_stats?.total_donation_count
    ? `${donor.nonprofit_stats.total_donation_count} public donations${
        minYear != null && maxYear != null ? ` from ${minYear} to ${maxYear}` : ""
      }`
    : "";

  // FEC / political giving: political_stats is a pure aggregate (no named
  // committees, no per-donation rows anywhere in the schema), so this
  // synthesizes ONE clearly-labeled summary row from the per-year breakdown
  // rather than leaving the FEC table silently empty when a total exists.
  const politicalStats = donor?.political_stats;
  const politicalPerYear: Record<string, number> =
    politicalStats && typeof politicalStats.per_year === "object" ? politicalStats.per_year : {};
  const activePoliticalYears = Object.entries(politicalPerYear)
    .filter(([, amt]) => Number(amt) > 0)
    .map(([yr]) => Number(yr));
  const politicalYearRange = activePoliticalYears.length
    ? activePoliticalYears.length === 1
      ? String(activePoliticalYears[0])
      : `${Math.min(...activePoliticalYears)} - ${Math.max(...activePoliticalYears)}`
    : "";
  const fecGiving =
    politicalStats && politicalStats.total_amt
      ? [
          {
            org: "Federal/State/Local Political Committees (DonorAtlas aggregate total -- not itemized by recipient)",
            year: politicalYearRange,
            amount: formatPreciseMoney(politicalStats.total_amt),
          },
        ]
      : [];

  // Bio: falls back to the donor's top_issues explanations (which often
  // contain rich biographical narrative tied to specific causes) whenever
  // DonorAtlas hasn't generated a dedicated bio for this particular donor.
  const bioText = Array.isArray(donor?.bio) && donor.bio.length
    ? donor.bio.join("\n\n")
    : (Array.isArray(donor?.top_issues) ? donor.top_issues : [])
        .map((t: any) => t?.description)
        .filter(Boolean)
        .join("\n\n");

  return {
    name: fullName,
    homeAddress: formatAddress(donor?.mailing_address),
    born: donor?.age != null ? `Age: ${donor.age}` : "",
    estimatedNetWorth: netWorthEstimate != null ? formatCompactMoney(netWorthEstimate) : "",
    estimatedIncome: salaryText,
    givingCapacity,
    wealthRating,
    religion: donor?.religion || "",
    familyFoundation,
    additionalInformation: bioText,
    boards,
    businessAddresses,
    educationEntries,
    otherGiving,
    realEstate,
    fecGiving,
    totalCharitableGiving,
    nonPhilanthropicPoliticalGiving:
      donor?.political_stats?.total_amt != null ? formatPreciseMoney(donor.political_stats.total_amt) : "",
    donoratlasUrl: donor?.donoratlas_url || "",
    donoratlasId: donor?.id || "",
  };
}

// Retrieves the full donor profile by DonorAtlas ID and maps it onto our
// ProfileData shape -- 1 DonorAtlas credit per call.
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing donor id." }, { status: 400 });
    }
    const donor = await getDonorById(id);
    const mapped = mapDonorToProfileFields(donor);
    const photo = await fetchImageAsDataUri(donor?.primary_photo_url);
    return NextResponse.json({ ok: true, data: mapped, photo });
  } catch (err: any) {
    console.error("research-donoratlas-donor error", err);
    return NextResponse.json({ error: err?.message || "Failed to retrieve this donor from DonorAtlas." }, { status: 500 });
  }
}
