import { NextRequest, NextResponse } from "next/server";
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

    const [primaryEmail, ...ccEmails] = LEAD_EMAILS;

    const formSubmitRes = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(primaryEmail)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...fields,
          _subject: `New Prospect Research Intake — ${orgName}`,
          _cc: ccEmails.join(","),
          _template: "table",
          _captcha: "false",
        }),
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
