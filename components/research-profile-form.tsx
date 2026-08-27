"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Download,
  Loader2,
  RotateCcw,
  Save,
  ArrowLeft,
  Home,
  Building2,
  DollarSign,
  TrendingUp,
  Star,
  Hash,
  Phone,
  Mail,
  CalendarDays,
  Users,
  Users2,
  Baby,
  GraduationCap,
  Shield,
  BookOpen,
  Heart,
  Handshake,
  Gift,
  Briefcase,
  Landmark,
  Vote,
  FileText,
  Target,
  Lock,
  MapPin,
  Bold,
  Underline,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { parseFormattedText } from "@/lib/rich-text";

const DRAFT_KEY_PREFIX = "catapult_research_profile_draft_v1";
const draftKey = (id: string | null) => `${DRAFT_KEY_PREFIX}:${id || "unsaved"}`;

type ProfileStatus = "draft" | "sent_for_approval" | "approved";

const STATUS_OPTIONS: Array<{ value: ProfileStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "sent_for_approval", label: "Sent for Approval" },
  { value: "approved", label: "Approved" },
];

const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Implied Divorced", "Widowed", "Dating", "Unknown"];

const MILITARY_BRANCH_OPTIONS = [
  "None",
  "Army",
  "Navy",
  "Air Force",
  "Marine Corps",
  "Coast Guard",
  "Space Force",
  "National Guard",
  "Unknown",
];

const POLITICAL_AFFILIATION_OPTIONS = [
  "Democrat",
  "Leans Democrat",
  "Republican",
  "Leans Republican",
  "Independent",
  "Supports Both Parties",
  "Unknown",
];

const PHONE_TYPE_OPTIONS = ["Mobile", "Home", "Work", "Fax", "Spouse", "Other"];
const EMAIL_TYPE_OPTIONS = ["Personal", "Work", "Spouse", "Other"];

const DEGREE_OPTIONS = [
  "High School Diploma",
  "Associate's",
  "Bachelor's",
  "Master's",
  "MBA",
  "JD",
  "MD",
  "PhD",
  "Honorary Degree",
  "Other",
  "Unknown",
];

// Alphabetized standard giving/organization categories for the Other Giving
// History table -- covers the four from the training discussion (Education,
// Social Service, Healthcare, Other) plus the rest of the common nonprofit
// sector taxonomy so profilers rarely need to reach for "Other."
const GIVING_CATEGORY_OPTIONS = [
  "Animal Welfare",
  "Arts & Culture",
  "Civic & Community",
  "Disaster Relief",
  "Education",
  "Environment & Conservation",
  "Faith-Based / Religious",
  "Foundation / Grantmaking",
  "Healthcare",
  "Higher Education",
  "Human Services",
  "International",
  "Other",
  "Political",
  "Public / Societal Benefit",
  "Social Service",
  "Sports & Recreation",
  "Unknown",
  "Veterans",
  "Youth Development",
];

function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(n: number): string {
  if (!n) return "";
  // Never round the entered value -- only add thousands separators, and
  // only show cents if the profiler actually typed a fractional amount.
  const hasCents = Math.abs(n % 1) > 1e-9;
  return `$${n.toLocaleString("en-US", hasCents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })}`;
}

// Allows freehand, non-currency entries (e.g. "$10M+", "TBD", "N/A") to pass
// through untouched instead of being stripped down to a bare number. Only
// values that are purely numeric (with $, commas, decimal, minus) get the
// standard $X,XXX formatting treatment.
function smartFormatCurrency(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;
  const formatted = formatCurrency(parseCurrencyToNumber(trimmed));
  return formatted || trimmed;
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const len = digits.length;
  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface RealEstateItem {
  photo: string; // base64 data URI
  address: string;
  description: string;
  value: string;
  purchaseInfo: string;
}

interface GivingRow {
  recipient: string;
  giving: string;
  year: string;
  amount: string;
}

interface FecRow {
  org: string;
  year: string;
  amount: string;
}

interface ChildRow {
  name: string;
  age: string;
  otherInfo: string;
}

interface GivingHistoryRow {
  year: string;
  amount: string;
  comments: string;
}

interface PhoneRow {
  type: string;
  customType: string;
  number: string;
}

interface EmailRow {
  type: string;
  customType: string;
  address: string;
}

interface EducationEntry {
  institution: string; // university/institution name
  degree: string;
  year: string; // graduation year
}

interface RosterGivingRow {
  year: string;
  amount: string;
  comments: string;
}

interface RosterProspect {
  name: string;
  clientProfiler: string;
  catapultId: string;
  clientId: string;
  wealthRating: string;
  givingCapacity: string;
  address: string;
  phones: string[];
  emails: string[];
  givingHistoryRows: RosterGivingRow[];
}

interface ProfileData {
  dateCreated: string;
  clientProfiler: string;
  projectLeadEmail: string;
  name: string;
  estimatedIncome: string;
  estimatedNetWorth: string;
  stockValue: string;
  realEstateValue: string;
  realEstatePropertyCount: string;
  givingCapacity: string;
  wealthRating: string;
  photo: string;
  photo2: string;
  catapultId: string;
  clientId: string;
  homeAddress: string;
  phones: PhoneRow[];
  emails: EmailRow[];
  born: string;
  maritalStatus: string;
  childrenRows: ChildRow[];
  educationEntries: EducationEntry[];
  militaryBranch: string;
  militaryDetails: string;
  religion: string;
  hobbiesInterests: string;
  relationshipToOrg: string;
  givingHistoryRows: GivingHistoryRow[];
  realEstate: RealEstateItem[];
  businessAddresses: string;
  familyFoundation: string;
  politicalAffiliation: string;
  additionalInformation: string;
  boards: string;
  clubsAffiliations: string;
  businessColleagues: string;
  otherGiving: GivingRow[];
  fecGiving: FecRow[];
  totalCharitableGiving: string;
  nonPhilanthropicPoliticalGiving: string;
  recommendedAskAmount: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function buildProfilePdfFileName(
  clientProfiler: string | undefined,
  name: string | undefined,
  dateCreated: string | undefined,
  fallback: string
): string {
  // File names are "{Client Name / Profiler Initials} {Prospect Name}
  // {Date Created}.pdf" -- space separated, no underscores. Forbidden
  // filesystem characters (e.g. a "/" typed into Client Name/Profiler
  // Initials like "SCFTA/JG") are replaced with a hyphen rather than
  // stripped or underscored, so the fields stay visually intact instead of
  // colliding into one run of words.
  const sanitize = (s?: string) =>
    (s || "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  // Only the Client Name portion (before the "/") is used in the filename --
  // the Profiler Initials after the "/" are dropped here, though the field
  // itself is untouched and still shows both on screen and in the PDF.
  const clientNameOnly = (clientProfiler || "").split("/")[0];
  const parts = [sanitize(clientNameOnly), sanitize(name), sanitize(dateCreated)].filter(Boolean);
  return parts.length > 0 ? `${parts.join(" ")}.pdf` : `${fallback}.pdf`;
}

// Converts a Blob (the generated PDF) to a bare base64 string, stripping the
// "data:application/pdf;base64," prefix that FileReader includes -- Resend's
// attachments API expects just the raw base64 payload.
async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

function emptyProfile(): ProfileData {
  return {
    dateCreated: todayISO(),
    clientProfiler: "",
    projectLeadEmail: "",
    name: "",
    estimatedIncome: "",
    estimatedNetWorth: "",
    stockValue: "",
    realEstateValue: "",
    realEstatePropertyCount: "",
    givingCapacity: "",
    wealthRating: "",
    photo: "",
    photo2: "",
    catapultId: "",
    clientId: "",
    homeAddress: "",
    phones: [],
    emails: [],
    born: "",
    maritalStatus: "",
    childrenRows: [],
    educationEntries: [],
    militaryBranch: "",
    militaryDetails: "",
    religion: "",
    hobbiesInterests: "",
    relationshipToOrg: "",
    givingHistoryRows: [],
    realEstate: [],
    businessAddresses: "",
    familyFoundation: "",
    politicalAffiliation: "",
    additionalInformation: "",
    boards: "",
    clubsAffiliations: "",
    businessColleagues: "",
    otherGiving: [],
    fecGiving: [],
    totalCharitableGiving: "",
    nonPhilanthropicPoliticalGiving: "",
    recommendedAskAmount: "TBD",
  };
}

async function resizeImageToDataUri(file: File, maxDim = 1000, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = document.createElement("img");
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject as any;
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function SectionHeading({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <h2 className="mt-10 flex items-center gap-2 border-b border-[rgb(var(--line))] pb-2 font-display text-2xl text-[rgb(var(--navy))]">
      {Icon && <Icon className="h-5 w-5 text-[rgb(var(--brass))]" />}
      {children}
    </h2>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  rows = 2,
  icon: Icon,
  money,
  disabled,
  lockedHint,
  richText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  icon?: LucideIcon;
  money?: boolean;
  disabled?: boolean;
  lockedHint?: string;
  // Adds Bold/Underline toolbar buttons above the textarea (they wrap the
  // current selection with **bold**/__underline__ markers) plus a small
  // live preview below showing how it will render, both on screen and in
  // the generated PDF. Only meaningful when textarea is also true.
  richText?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(marker: string, placeholderText: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const inner = selected || placeholderText;
    const wrapped = `${marker}${inner}${marker}`;
    const newValue = value.slice(0, start) + wrapped + value.slice(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + marker.length;
      el.setSelectionRange(cursorStart, cursorStart + inner.length);
    });
  }

  return (
    <div className="mt-5">
      <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        {disabled && lockedHint && (
          <span className="flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal text-[rgb(var(--ink))]/40">
            <Lock className="h-3 w-3" />
            {lockedHint}
          </span>
        )}
      </label>
      {textarea ? (
        <>
          {richText && !disabled && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => wrapSelection("**", "bold text")}
                title="Bold selected text"
                className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--line))] px-2 py-1 text-[11px] font-semibold text-[rgb(var(--ink))]/70 hover:border-[rgb(var(--brass))] hover:text-[rgb(var(--navy))]"
              >
                <Bold className="h-3 w-3" />
                Bold
              </button>
              <button
                type="button"
                onClick={() => wrapSelection("__", "underlined text")}
                title="Underline selected text"
                className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--line))] px-2 py-1 text-[11px] font-semibold text-[rgb(var(--ink))]/70 hover:border-[rgb(var(--brass))] hover:text-[rgb(var(--navy))]"
              >
                <Underline className="h-3 w-3" />
                Underline
              </button>
              <span className="text-[10px] text-[rgb(var(--ink))]/40">Select text first, then click Bold/Underline</span>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className="mt-1.5 w-full resize-y rounded-lg border border-[rgb(var(--line))] px-3 py-2 text-sm text-[rgb(var(--ink))] outline-none focus:border-[rgb(var(--brass))] disabled:bg-[rgb(var(--paper))] disabled:opacity-70"
          />
          {richText && value && /\*\*.+?\*\*|__.+?__/.test(value) && (
            <div className="mt-1.5 rounded-lg bg-[rgb(var(--paper))] px-3 py-2 text-sm text-[rgb(var(--ink))]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/40">Preview</p>
              <FormattedPreview value={value} />
            </div>
          )}
        </>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => on