"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

const FRONT_PREVIEW_URL =
  "https://galaxy-prod.tlcdn.com/view/user_35qqBV71YqPhG02PJcVxttmFcLs/e8b9a9018e5b40ff83a38b10a4cf3203.png";
const LOGO_LOCKUP_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ccdcb7df-f854-4cf8-a390-1d9eb56ecd9d.png";

export function BusinessCardGeneratorForm() {
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [officePhone, setOfficePhone] = useState("(702) 508-0101");
  const [email, setEmail] = useState("");
  const [includeCropMarks, setIncludeCropMarks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setError("");
    setIsGenerating(true);
    try {
      const response = await fetch("/api/business-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          title,
          cellPhone,
          officePhone,
          email,
          includeCropMarks,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const slug = (fullName || "team-member")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      link.href = url;
      link.download = `catapult-business-card-${slug}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't generate the PDF. Please try again, or reach out if this keeps happening.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-16 space-y-6">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Business Cards
        </p>
        <h2 className="mt-2 font-display text-3xl text-[rgb(var(--navy))]">
          Build a print-ready business card.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--ink))]/65">
          Fill in your information, preview the front and back, and download a print-ready PDF
          (full bleed, 300+ DPI) to hand off or email directly to our print vendor.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
          <h3 className="font-display text-xl text-[rgb(var(--navy))]">Your information</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cardFullName">Full name</Label>
              <Input
                id="cardFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardTitle">Title</Label>
              <Input
                id="cardTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Engagement Officer"
                className={FIELD_CLASS}
              />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cardCellPhone">Cell phone (optional)</Label>
              <Input
                id="cardCellPhone"
                type="tel"
                value={cellPhone}
                onChange={(e) => setCellPhone(e.target.value)}
                placeholder="(702) 555-0100"
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardOfficePhone">Office phone</Label>
              <Input
                id="cardOfficePhone"
                type="tel"
                value={officePhone}
                onChange={(e) => setOfficePhone(e.target.value)}
                placeholder="(702) 508-0101"
                className={FIELD_CLASS}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardEmail">Email address</Label>
            <Input
              id="cardEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@catapultfr.com"
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="cardCropMarks"
              checked={includeCropMarks}
              onCheckedChange={(checked) => setIncludeCropMarks(checked === true)}
            />
            <Label htmlFor="cardCropMarks" className="cursor-pointer text-sm font-normal">
              Include printer crop marks (recommended for most vendors)
            </Label>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={handleDownload}
            disabled={isGenerating}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))] disabled:opacity-60 sm:w-auto"
          >
            {isGenerating ? (
              <>
                Generating&hellip;
                <Loader2 className="h-5 w-5 animate-spin" />
              </>
            ) : (
              <>
                Download Print-Ready PDF
                <Download className="h-5 w-5" />
              </>
            )}
          </Button>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
            <p className="mb-4 text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">
              Live preview
            </p>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/40">
              Front
            </p>
            <div className="overflow-hidden rounded-lg border border-[rgb(var(--line))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FRONT_PREVIEW_URL} alt="Business card front preview" className="block w-full" />
            </div>

            <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/40">
              Back
            </p>
            <div
              className="relative overflow-hidden rounded-lg border border-[rgb(var(--line))] bg-[#FAF7F0] p-5"
              style={{ aspectRatio: "7 / 4" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_LOCKUP_URL} alt="Catapult Fundraising" className="h-[18%] w-auto" />
              <div className="mt-2 h-[1.5px] w-16 bg-[rgb(var(--brass))]" />
              <div className="absolute bottom-5 left-5">
                <p className="font-display text-lg leading-tight text-[rgb(var(--navy))]">
                  {fullName || "Your Name"}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--brass))]">
                  {title || "Your Title"}
                </p>
              </div>
              <div className="absolute bottom-5 right-5 text-right text-[10px] leading-relaxed text-[rgb(var(--navy))]">
                {cellPhone && <p>{cellPhone}</p>}
                {officePhone && <p>{officePhone}</p>}
                {email && <p>{email}</p>}
                <p>catapultfr.com</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-[#b28c46]/10 p-6">
            <p className="text-sm font-semibold text-[rgb(var(--navy))]">Sending this to a printer</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[rgb(var(--ink))]/70">
              <li>Fill in your info and click &ldquo;Download Print-Ready PDF.&rdquo;</li>
              <li>
                The PDF is sized 3.75&Prime; &times; 2.25&Prime; (3.5&Prime; &times; 2&Prime; trim plus
                0.125&Prime; bleed on every side), with front and back as separate pages.
              </li>
              <li>Attach the PDF directly to an email to your print vendor, or hand it off as-is.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
