"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle } from "lucide-react";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

const LOGO_URL =
  "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ccdcb7df-f854-4cf8-a390-1d9eb56ecd9d.png";

function toTelHref(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface SignatureData {
  fullName: string;
  title: string;
  cellPhone: string;
  officePhone: string;
  email: string;
  tagline: string;
  linkedinUrl: string;
  facebookUrl: string;
}

function buildSignatureHtml(data: SignatureData) {
  const name = escapeHtml(data.fullName || "Your Name");
  const title = escapeHtml(data.title || "Your Title");
  const tagline = escapeHtml(data.tagline);
  const email = escapeHtml(data.email);
  const cellHref = toTelHref(data.cellPhone);
  const officeHref = toTelHref(data.officePhone);

  const cellRow = data.cellPhone
    ? `Cell:&nbsp;<a href="tel:${cellHref}" style="color:#15212E;text-decoration:none;">${escapeHtml(
        data.cellPhone
      )}</a><br>`
    : "";
  const officeRow = data.officePhone
    ? `Office:&nbsp;<a href="tel:${officeHref}" style="color:#15212E;text-decoration:none;">${escapeHtml(
        data.officePhone
      )}</a><br>`
    : "";

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;">
  <tr>
    <td style="vertical-align:top;padding-right:18px;border-right:3px solid #B28C46;">
      <img src="${LOGO_URL}" alt="Catapult Fundraising" width="180" style="display:block;width:180px;height:auto;">
    </td>
    <td style="vertical-align:top;padding-left:18px;">
      <div style="font-family:Georgia, 'Times New Roman', serif;font-size:19px;font-weight:bold;color:#15212E;line-height:1.2;">
        ${name}
      </div>
      <div style="font-family:Arial, Helvetica, sans-serif;font-size:13px;font-weight:bold;color:#B28C46;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">
        ${title}
      </div>
      ${
        tagline
          ? `<div style="font-family:Georgia, 'Times New Roman', serif;font-size:13px;font-style:italic;color:#B28C46;margin-top:8px;">
        ${tagline}
      </div>`
          : ""
      }
      <div style="font-family:Arial, Helvetica, sans-serif;font-size:12.5px;color:#15212E;margin-top:10px;line-height:1.7;">
        ${cellRow}${officeRow}<a href="mailto:${email}" style="color:#15212E;text-decoration:none;">${email}</a>
        &nbsp;|&nbsp;
        <a href="https://catapultfr.com" style="color:#15212E;text-decoration:none;">catapultfr.com</a>
      </div>
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${data.linkedinUrl}" style="text-decoration:none;">
              <table cellpadding="0" cellspacing="0" border="0" style="background:#15212E;border-radius:4px;">
                <tr>
                  <td style="padding:6px 12px;font-family:Arial, Helvetica, sans-serif;font-size:11px;font-weight:bold;color:#ffffff;letter-spacing:0.3px;">
                    LinkedIn
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <td>
            <a href="${data.facebookUrl}" style="text-decoration:none;">
              <table cellpadding="0" cellspacing="0" border="0" style="background:#B28C46;border-radius:4px;">
                <tr>
                  <td style="padding:6px 12px;font-family:Arial, Helvetica, sans-serif;font-size:11px;font-weight:bold;color:#15212E;letter-spacing:0.3px;">
                    Facebook
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function SignatureGeneratorForm() {
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [officePhone, setOfficePhone] = useState("(702) 508-0101");
  const [email, setEmail] = useState("");
  const [tagline, setTagline] = useState("Growing your donor base at every stage of the giving journey.");
  const [linkedinUrl, setLinkedinUrl] = useState("https://www.linkedin.com/company/catapult-fundraising");
  const [facebookUrl, setFacebookUrl] = useState("https://www.facebook.com/catapultfr/");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const signatureHtml = buildSignatureHtml({
    fullName,
    title,
    cellPhone,
    officePhone,
    email,
    tagline,
    linkedinUrl,
    facebookUrl,
  });

  const handleCopy = async () => {
    setCopyError("");
    try {
      if (navigator.clipboard && "write" in navigator.clipboard) {
        const blob = new Blob([signatureHtml], { type: "text/html" });
        const textBlob = new Blob([`${fullName}\n${title}\n${email}`], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({ "text/html": blob, "text/plain": textBlob }),
        ]);
      } else {
        await navigator.clipboard.writeText(signatureHtml);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopyError(
        "Couldn't copy automatically. Select the preview below, right-click, and choose Copy instead."
      );
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Your information</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Engagement Officer"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cellPhone">Cell phone (optional)</Label>
            <Input
              id="cellPhone"
              type="tel"
              value={cellPhone}
              onChange={(e) => setCellPhone(e.target.value)}
              placeholder="(702) 555-0100"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officePhone">Office phone</Label>
            <Input
              id="officePhone"
              type="tel"
              value={officePhone}
              onChange={(e) => setOfficePhone(e.target.value)}
              placeholder="(702) 508-0101"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@catapultfr.com"
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline (optional)</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebookUrl">Facebook URL</Label>
            <Input
              id="facebookUrl"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={handleCopy}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))] sm:w-auto"
        >
          {copied ? (
            <>
              Copied!
              <CheckCircle className="h-5 w-5" />
            </>
          ) : (
            <>
              Copy Signature
              <Copy className="h-5 w-5" />
            </>
          )}
        </Button>
        {copyError && <p className="text-sm font-medium text-red-600">{copyError}</p>}
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
          <p className="mb-4 text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">
            Live preview
          </p>
          <div dangerouslySetInnerHTML={{ __html: signatureHtml }} />
        </div>
        <div className="rounded-2xl border border-[rgb(var(--line))] bg-[#b28c46]/10 p-6">
          <p className="text-sm font-semibold text-[rgb(var(--navy))]">How to add this to Outlook</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[rgb(var(--ink))]/70">
            <li>Click &ldquo;Copy Signature&rdquo; above.</li>
            <li>
              In Outlook, go to Settings (gear icon) &rarr; View all Outlook settings &rarr; Mail &rarr; Compose
              and reply (or File &rarr; Options &rarr; Mail &rarr; Signatures on desktop).
            </li>
            <li>Click into the signature editor box and paste (Ctrl+V or Cmd+V).</li>
            <li>Set it as your default signature for new messages and replies, then save.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
