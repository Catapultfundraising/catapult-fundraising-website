"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ffe08cd7-6dee-47f3-b390-61aecad692c2.png";

const OFFICE_ADDRESS_LINE_1 = "2551 N. Green Valley Parkway, Suite 202B";
const OFFICE_ADDRESS_LINE_2 = "Henderson, NV 89014";
const ADDITIONAL_OFFICES_LINE = "Additional Offices in New Jersey and Texas";
const TAGLINE = "Growing your donor base at every stage of the giving journey.";
const SERVICE_TAGS = ["CAPITAL CAMPAIGNS", "LEGACY GIVING", "DONOR ENGAGEMENT", "ANNUAL FUND"];

export function BusinessCardGeneratorForm() {
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [officePhone, setOfficePhone] = useState("(702) 508-0101");
  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const fileName = `${(fullName || "Business_Card").replace(/[^a-z0-9]+/gi, "_")}_Catapult_Fundraising.pdf`;

  async function generatePdf() {
    setGenerating(true);
    setGenError(null);
    setPdfUrl(null);
    try {
      const res = await fetch("/api/business-card-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, title, cellPhone, officePhone, email }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Failed to generate the business card PDF.");
      }
      const blob = await res.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setGenError(err?.message || "Something went wrong generating the PDF.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-16 grid gap-10 lg:grid-cols-2">
      <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <div>
          <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Business Cards
          </p>
          <h2 className="mt-2 font-display text-2xl text-[rgb(var(--navy))]">Build your business card</h2>
          <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/65">
            Fill in your information and download a print-vendor-ready PDF&mdash;front and back, sized to
            the standard 3.5&Prime; &times; 2&Prime; business card with 0.125&Prime; bleed on every side.
            Send the PDF straight to your printer. The back of the card is fixed brand artwork and is the
            same for everyone.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bcFullName">Full name</Label>
            <Input
              id="bcFullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Anthony R. Alonso"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcTitle">Title</Label>
            <Input
              id="bcTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="President & CEO"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bcCellPhone">Cell phone (optional)</Label>
            <Input
              id="bcCellPhone"
              type="tel"
              value={cellPhone}
              onChange={(e) => setCellPhone(e.target.value)}
              placeholder="(973) 809-7100"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcOfficePhone">Office phone</Label>
            <Input
              id="bcOfficePhone"
              type="tel"
              value={officePhone}
              onChange={(e) => setOfficePhone(e.target.value)}
              placeholder="(702) 508-0101"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bcEmail">Email address</Label>
          <Input
            id="bcEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anthonya@catapultfr.com"
            className={FIELD_CLASS}
          />
        </div>

        <Button
          type="button"
          size="lg"
          onClick={generatePdf}
          disabled={generating}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))] disabled:opacity-60 sm:w-auto"
        >
          {generating ? (
            <>
              Generating...
              <Loader2 className="h-5 w-5 animate-spin" />
            </>
          ) : (
            <>
              Generate Print-Ready PDF
              <Download className="h-5 w-5" />
            </>
          )}
        </Button>
        {genError && <p className="text-sm font-medium text-red-600">{genError}</p>}
        {pdfUrl && (
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[rgb(var(--paper))] p-4">
            <p className="text-sm text-[rgb(var(--ink))]/70">Your business card PDF is ready.</p>
            <a
              href={pdfUrl}
              download={fileName}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2 text-sm font-semibold text-white hover:bg-[rgb(var(--navy-deep))]"
            >
              <Download className="h-4 w-4" />
              Download {fileName}
            </a>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
          <p className="mb-4 text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">
            Live preview
          </p>
          <div className="flex flex-col items-center gap-6">
            {/* Front */}
            <div
              className="flex w-full max-w-[336px] flex-col rounded-md border border-[rgb(var(--line))] p-5"
              style={{ aspectRatio: "3.5 / 2", backgroundColor: "#FAF7F0" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="Catapult Fundraising" className="h-[31px] w-auto object-contain" />
              <div className="mt-3 h-[1.5px] w-[122px] rounded-full bg-[#B28C46]" />
              <div className="mt-2 flex flex-1 items-end justify-between">
                <div className="max-w-[52%] pt-3">
                  <p className="whitespace-nowrap font-display text-[15px] font-bold leading-tight text-[#15212E]">
                    {fullName || "Your Name"}
                  </p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-[#B28C46]">
                    {title || "Your Title"}
                  </p>
                </div>
                <div className="flex max-w-[46%] flex-col items-end text-right text-[8.5px] leading-snug text-[#15212E]">
                  {officePhone && (
                    <p>
                      <span className="font-bold text-[#B28C46]">Office: </span>
                      {officePhone}
                    </p>
                  )}
                  {cellPhone && (
                    <p>
                      <span className="font-bold text-[#B28C46]">Cell: </span>
                      {cellPhone}
                    </p>
                  )}
                  {email && <p>{email}</p>}
                  <p>catapultfr.com</p>
                  <p className="mt-1.5 text-[7px]">{OFFICE_ADDRESS_LINE_1}</p>
                  <p className="text-[7px]">{OFFICE_ADDRESS_LINE_2}</p>
                  <p className="mt-1.5 text-[7px] italic text-[#B28C46]">{ADDITIONAL_OFFICES_LINE}</p>
                </div>
              </div>
            </div>

            {/* Back — fixed brand design */}
            <div
              className="flex w-full max-w-[336px] flex-col items-center justify-center rounded-md border border-[rgb(var(--line))] p-5 text-center"
              style={{ aspectRatio: "3.5 / 2", backgroundColor: "#FAF7F0" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="Catapult Fundraising" className="h-[36px] w-auto object-contain" />
              <div className="mt-2 mb-2 h-[1.5px] w-10 rounded-full bg-[#B28C46]" />
              <p className="max-w-[220px] text-[9px] italic text-[#15212E]">{TAGLINE}</p>
              <p className="mt-2 max-w-[230px] text-[8px] font-bold uppercase tracking-wide text-[#B28C46]">
                {SERVICE_TAGS.join("  ·  ")}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--line))] bg-[#b28c46]/10 p-6">
          <p className="text-sm font-semibold text-[rgb(var(--navy))]">Sending this to a print vendor</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[rgb(var(--ink))]/70">
            <li>The PDF is 2 pages&mdash;page 1 is the front, page 2 is the back.</li>
            <li>
              Each page is 3.75&Prime; &times; 2.25&Prime;: the standard 3.5&Prime; &times; 2&Prime; card
              plus a 0.125&Prime; bleed on every side.
            </li>
            <li>Upload it as-is; most online print vendors expect bleed included and no crop marks.</li>
            <li>
              Colors are generated in RGB. If your print vendor requires true CMYK press-matching, ask
              them to convert during their prepress check.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
