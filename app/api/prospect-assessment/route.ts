import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { LEAD_EMAILS } from "@/lib/constants";
import { TIER_CONFIGS, type TierData, type TierRow } from "@/lib/prospect-assessment";

const SITE_URL = "https://www.catapultfr.com";

function sanitizeSheetName(name: string, fallback: string) {
  const cleaned = (name || "").replace(/[:\\/?*[\]]/g, "").trim();
  const base = cleaned || fallback;
  return base.slice(0, 31);
}

function appendTierFields(
  fields: Record<string, string>,
  label: string,
  rows: TierRow[],
  data: TierData | undefined
) {
  rows.forEach((row) => {
    const rowValue = data?.[row.key];
    fields[`${label} — ${row.constituent} (${row.year}) — Record Count`] = rowValue?.count || "";
    fields[`${label} — ${row.constituent} (${row.year}) — Average Gift`] = rowValue?.avgGift || "";
  });
}

function buildTierSheet(label: string, rows: TierRow[], data: TierData | undefined) {
  const toNumber = (value: string | undefined) => {
    const n = Number(value);
    return Number.isFinite(n) && value ? n : "";
  };

  const aoa: (string | number)[][] = [
    [label],
    ["All Individual Records Activity"],
    ["Constituent", "Year of Last Gift", "Record Count", "Average Gift"],
  ];

  let totalCount = 0;
  rows.forEach((row) => {
    const count = toNumber(data?.[row.key]?.count);
    const avgGift = toNumber(data?.[row.key]?.avgGift);
    if (typeof count === "number") totalCount += count;
    aoa.push([row.constituent, row.year, count, avgGift]);
  });
  aoa.push(["Total", "", totalCount, ""]);

  return XLSX.utils.aoa_to_sheet(aoa);
}

function buildWorkbook(payload: {
  orgName: string;
  contactName: string;
  title: string;
  email: string;
  phone: string;
  fiscalYear: string;
  caseForSupport: string;
  solicitationHistory: string;
  tierLabels: Record<string, string>;
  tiersData: Record<string, TierData>;
}) {
  const wb = XLSX.utils.book_new();

  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["Organization Name", payload.orgName],
    ["Contact Name", payload.contactName],
    ["Title", payload.title || ""],
    ["Email Address", payload.email],
    ["Telephone", payload.phone || ""],
    ["Fiscal Year", payload.fiscalYear || ""],
    ["Case for Support", payload.caseForSupport || ""],
    ["Prior Solicitation History", payload.solicitationHistory || ""],
  ]);
  XLSX.utils.book_append_sheet(wb, infoSheet, "Organization Info");

  const usedNames = new Set<string>();
  TIER_CONFIGS.forEach((tier, index) => {
    const rawLabel = payload.tierLabels?.[tier.id] || tier.defaultLabel;
    const displayLabel = rawLabel || `Tier ${index + 1}`;
    let sheetName = sanitizeSheetName(displayLabel, `Tier ${index + 1}`);
    let suffix = 2;
    while (usedNames.has(sheetName.toLowerCase())) {
      sheetName = `${sanitizeSheetName(displayLabel, `Tier ${index + 1}`).slice(0, 28)} ${suffix}`;
      suffix += 1;
    }
    usedNames.add(sheetName.toLowerCase());

    XLSX.utils.book_append_sheet(
      wb,
      buildTierSheet(displayLabel, tier.rows, payload.tiersData?.[tier.id]),
      sheetName
    );
  });

  return wb;
}

function sanitizeFilename(name: string) {
  return (name || "Organization").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "Organization";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orgName,
      contactName,
      title,
      email,
      phone,
      fiscalYear,
      caseForSupport,
      solicitationHistory,
      tierLabels,
      tiersData,
    } = body || {};

    if (!orgName || !contactName || !email) {
      return NextResponse.json(
        { error: "Organization name, name, and email are required." },
        { status: 400 }
      );
    }

    const fields: Record<string, string> = {
      "Organization Name": orgName,
      "Contact Name": contactName,
      Title: title || "",
      "Email Address": email,
      Telephone: phone || "",
      "Fiscal Year": fiscalYear || "",
      "Case for Support": caseForSupport || "",
      "Prior Solicitation History": solicitationHistory || "",
    };

    TIER_CONFIGS.forEach((tier, index) => {
      const rawLabel = tierLabels?.[tier.id] || tier.defaultLabel;
      const displayLabel = rawLabel || `Donor Tier ${index + 1}`;
      appendTierFields(fields, displayLabel, tier.rows, tiersData?.[tier.id]);
    });

    const workbook = buildWorkbook({
      orgName,
      contactName,
      title,
      email,
      phone,
      fiscalYear,
      caseForSupport,
      solicitationHistory,
      tierLabels: tierLabels || {},
      tiersData: tiersData || {},
    });
    const workbookBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const [primaryEmail, ...ccEmails] = LEAD_EMAILS;

    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("_subject", `New Prospect Research Intake — ${orgName}`);
    formData.append("_cc", ccEmails.join(","));
    formData.append("_template", "table");
    formData.append("_captcha", "false");

    const attachmentBlob = new Blob([new Uint8Array(workbookBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    formData.append(
      "attachment",
      attachmentBlob,
      `Prospect-Counts-and-Average-Gift-Sizes-${sanitizeFilename(orgName)}.xlsx`
    );

    // FormSubmit's AJAX endpoint requires a Referer/Origin that matches a
    // browser page load. Server-to-server requests (like this one, sent from
    // the Vercel serverless function rather than the user's browser) have no
    // Referer by default, which FormSubmit rejects with:
    // "Make sure you open this page through a web server..." — silently
    // failing to deliver the email. Setting these headers explicitly fixes it.
    const formSubmitRes = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(primaryEmail)}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Referer: `${SITE_URL}/prospect-assessment`,
          Origin: SITE_URL,
        },
        body: formData,
      }
    );

    const rawBody = await formSubmitRes.text();
    let parsed: { success?: string | boolean; message?: string } = {};
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      // non-JSON response, fall through to the ok-check below
    }

    // FormSubmit can return HTTP 200 with a body indicating logical failure
    // (e.g. { success: "false", message: "This form needs Activation..." }),
    // so checking formSubmitRes.ok alone is not sufficient.
    const succeeded =
      formSubmitRes.ok && parsed.success !== "false" && parsed.success !== false;

    if (!succeeded) {
      console.error("FormSubmit error:", formSubmitRes.status, rawBody);
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.message ||
            "Email delivery failed. The destination inbox may need to activate this form — check for a 'FormSubmit - Activate your form' email.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Prospect assessment error:", err);
    return NextResponse.json(
      { error: "Something went wrong submitting the form." },
      { status: 500 }
    );
  }
}
