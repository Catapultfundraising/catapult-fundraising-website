import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { LEAD_EMAILS } from "@/lib/constants";
import {
  TIER_1_LABEL,
  TIER_1_ROWS,
  TIER_2_LABEL,
  TIER_2_ROWS,
  type TierData,
  type TierRow,
} from "@/lib/prospect-assessment";

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
  caseForSupport: string;
  solicitationHistory: string;
  tier1?: TierData;
  tier2?: TierData;
}) {
  const wb = XLSX.utils.book_new();

  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["Organization Name", payload.orgName],
    ["Contact Name", payload.contactName],
    ["Title", payload.title || ""],
    ["Email Address", payload.email],
    ["Telephone", payload.phone || ""],
    ["Case for Support", payload.caseForSupport || ""],
    ["Prior Solicitation History", payload.solicitationHistory || ""],
  ]);
  XLSX.utils.book_append_sheet(wb, infoSheet, "Organization Info");

  XLSX.utils.book_append_sheet(
    wb,
    buildTierSheet(TIER_1_LABEL, TIER_1_ROWS, payload.tier1),
    "$1-$999"
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildTierSheet(TIER_2_LABEL, TIER_2_ROWS, payload.tier2),
    "$1,000-$9,999"
  );

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
      caseForSupport,
      solicitationHistory,
      tier1,
      tier2,
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
      "Case for Support": caseForSupport || "",
      "Prior Solicitation History": solicitationHistory || "",
    };

    appendTierFields(fields, TIER_1_LABEL, TIER_1_ROWS, tier1);
    appendTierFields(fields, TIER_2_LABEL, TIER_2_ROWS, tier2);

    const workbook = buildWorkbook({
      orgName,
      contactName,
      title,
      email,
      phone,
      caseForSupport,
      solicitationHistory,
      tier1,
      tier2,
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

    const attachmentBlob = new Blob([workbookBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    formData.append(
      "attachment",
      attachmentBlob,
      `Prospect-Counts-and-Average-Gift-Sizes-${sanitizeFilename(orgName)}.xlsx`
    );

    const formSubmitRes = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(primaryEmail)}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      }
    );

    if (!formSubmitRes.ok) {
      const errorBody = await formSubmitRes.text();
      console.error("FormSubmit error:", formSubmitRes.status, errorBody);
      return NextResponse.json(
        { ok: false, error: "Email delivery failed." },
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
