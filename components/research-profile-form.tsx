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
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            if (money) {
              const formatted = smartFormatCurrency(e.target.value);
              if (formatted !== e.target.value) onChange(formatted);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}

        className="mt-1.5 w-full rounded-lg border border-[rgb(var(--line))] px-3 py-2 text-sm text-[rgb(var(--ink))] outline-none focus:border-[rgb(var(--brass))] disabled:bg-[rgb(var(--paper))] disabled:opacity-70"
        />
      )}
    </div>
  );
}

function FormattedPreview({ value }: { value: string }) {
  const segments = parseFormattedText(value);
  return (
    <p className="whitespace-pre-wrap">
      {segments.map((seg, i) => {
        let node: React.ReactNode = seg.text;
        if (seg.bold) node = <strong key={i}>{node}</strong>;
        if (seg.underline) node = <u key={i}>{node}</u>;
        return <span key={i}>{node}</span>;
      })}
    </p>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  icon?: LucideIcon;
}) {
  return (
    <div className="mt-5">
      <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm text-[rgb(var(--ink))] outline-none focus:border-[rgb(var(--brass))]"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function ComputedField({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mt-5">
      <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        {hint ? (
          <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-[rgb(var(--ink))]/40">
            ({hint})
          </span>
        ) : null}
      </label>
      <div className="mt-1.5 w-full rounded-lg border border-[rgb(var(--line))] bg-[rgb(var(--paper))] px-3 py-2 text-sm text-[rgb(var(--ink))]">
        {value || <span className="text-[rgb(var(--ink))]/30">—</span>}
      </div>
    </div>
  );
}

export function ResearchProfileForm() {
  return (
    <Suspense fallback={null}>
      <ResearchProfileFormInner />
    </Suspense>
  );
}

function ResearchProfileFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");

  const [data, setData] = useState<ProfileData>(emptyProfile());
  const [profileId, setProfileId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("draft");
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photo2InputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);
  const skipReloadIdRef = useRef<string | null>(null);
  const [showPhoto2, setShowPhoto2] = useState(false);
  const [roster, setRoster] = useState<RosterProspect[]>([]);
  const [selectedRosterName, setSelectedRosterName] = useState("");
  const [lockedFromRoster, setLockedFromRoster] = useState(false);

  // Load an existing saved profile from the server if ?id= is present;
  // otherwise fall back to the last local draft for a brand new profile.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (urlId) {
        if (skipReloadIdRef.current === urlId) {
          // This URL change came from our own persistProfile() call (Save or
          // Generate PDF), not external navigation to a different saved
          // profile -- the in-memory data is already the freshest copy, so
          // re-fetching it here would just race the in-flight PDF/email
          // request and risk a spurious "Could not load that profile" error
          // if the store has any read-after-write lag.
          skipReloadIdRef.current = null;
          loadedRef.current = true;
          return;
        }
        setLoadingProfile(true);
        setLoadError(null);
        try {
          const res = await fetch(`/api/research-profiles/${urlId}`, { cache: "no-store" });
          if (!res.ok) throw new Error("Could not load that profile.");
          const json = await res.json();
          const envelope = json.data || {};
          if (!cancelled) {
            const merged = { ...emptyProfile(), ...(envelope.data ?? {}) };
            setData(merged);
            setStatus((envelope.status as ProfileStatus) || "draft");
            setProfileId(urlId);
            if (merged.photo2) setShowPhoto2(true);
          }
        } catch (err: any) {
          if (!cancelled) setLoadError(err?.message || "Could not load that profile.");
        } finally {
          if (!cancelled) setLoadingProfile(false);
        }
      } else {
        try {
          const raw = localStorage.getItem(draftKey(null));
          if (raw) {
            const parsed = JSON.parse(raw);
            const merged = { ...emptyProfile(), ...parsed };
            setData(merged);
            setRestoredNotice(true);
            if (merged.photo2) setShowPhoto2(true);
          }
        } catch {
          // ignore
        }
      }
      loadedRef.current = true;
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [urlId]);

  // Fetch this week's uploaded prospect list (only useful when starting a
  // brand-new profile -- an existing profile already has its own data).
  useEffect(() => {
    if (urlId) return;
    let cancelled = false;
    fetch("/api/research-roster", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { roster: null }))
      .then((json) => {
        if (!cancelled) setRoster(json?.roster?.prospects || []);
      })
      .catch(() => {
        // Non-fatal -- the dropdown just won't appear.
      });
    return () => {
      cancelled = true;
    };
  }, [urlId]);

  function applyRosterProspect(name: string) {
    setSelectedRosterName(name);
    const prospect = roster.find((p) => p.name === name);
    if (!prospect) return;
    setData((d) => ({
      ...d,
      name: prospect.name || d.name,
      clientProfiler: prospect.clientProfiler || d.clientProfiler,
      catapultId: prospect.catapultId || d.catapultId,
      clientId: prospect.clientId || d.clientId,
      wealthRating: prospect.wealthRating || d.wealthRating,
      givingCapacity: prospect.givingCapacity || d.givingCapacity,
      homeAddress: prospect.address || d.homeAddress,
      phones: prospect.phones.length
        ? prospect.phones.map((number, i) => ({ type: i === 0 ? "Mobile" : "Other", customType: i === 0 ? "" : "Additional", number }))
        : d.phones,
      emails: prospect.emails.length
        ? prospect.emails.map((address, i) => ({ type: i === 0 ? "Personal" : "Other", customType: i === 0 ? "" : "Additional", address }))
        : d.emails,
      givingHistoryRows: prospect.givingHistoryRows.length
        ? prospect.givingHistoryRows.map((r) => ({ ...r }))
        : d.givingHistoryRows,
    }));
    // Name, Catapult ID, and Client ID must stay in sync with the master
    // prospect list once a selection is made -- the profiler can override
    // every other prefilled field, but not these three identifiers.
    setLockedFromRoster(true);
    setPdfUrl(null);
  }

  // Auto-save local draft as a browser-side safety net
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(draftKey(profileId), JSON.stringify(data));
    } catch {
      // ignore (e.g., storage quota with large photos)
    }
  }, [data, profileId]);

  function set<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setPdfUrl(null);
  }

  function clearDraft() {
    if (!confirm("Clear all entered information and start a new blank profile?")) return;
    localStorage.removeItem(draftKey(profileId));
    setData(emptyProfile());
    setStatus("draft");
    setProfileId(null);
    setPdfUrl(null);
    setLastSavedAt(null);
    router.replace("/research/new");
  }

  // A "one-off" profile (not selected from Sean's uploaded weekly list) is
  // otherwise invisible to that list -- other profilers wouldn't see it in
  // the "Prefill From This Week's Prospect List" dropdown, and it wouldn't
  // count as part of this week's roster. This adds/updates it there too,
  // matched by name, every time the profile is saved. Non-fatal if it
  // fails: the profile itself still saves fine either way.
  async function syncOneOffIntoWeeklyRoster() {
    if (lockedFromRoster || !data.name.trim()) return;
    try {
      await fetch("/api/research-roster", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect: {
            name: data.name,
            clientProfiler: data.clientProfiler,
            catapultId: data.catapultId,
            clientId: data.clientId,
            wealthRating: data.wealthRating,
            givingCapacity: data.givingCapacity,
            address: data.homeAddress,
            phones: data.phones.map((p) => p.number).filter(Boolean),
            emails: data.emails.map((e) => e.address).filter(Boolean),
            givingHistoryRows: data.givingHistoryRows,
          },
        }),
      });
    } catch {
      // ignore -- non-fatal
    }
  }

  async function persistProfile(currentId: string | null): Promise<string | null> {
    try {
      const res = await fetch("/api/research-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentId, name: data.name, status, data }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Failed to save profile.");
      }
      const json = await res.json();
      skipReloadIdRef.current = json.profile.id;
      setProfileId(json.profile.id);
      setLastSavedAt(json.profile.updatedAt);
      router.replace(`/research/new?id=${json.profile.id}`);
      syncOneOffIntoWeeklyRoster();
      return json.profile.id as string;
    } catch (err: any) {
      setSaveError(err?.message || "Something went wrong saving this profile.");
      return null;
    }
  }

  async function saveProfile() {
    setSaving(true);
    setSaveError(null);
    await persistProfile(profileId);
    setSaving(false);
  }

  async function deleteThisProfile() {
    if (!profileId) return;
    if (!confirm("Delete this saved profile? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/research-profiles/${profileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete profile.");
      localStorage.removeItem(draftKey(profileId));
      router.push("/research");
    } catch {
      alert("Could not delete this profile. Please try again.");
    }
  }

  async function handlePhotoUpload(file: File) {
    const uri = await resizeImageToDataUri(file, 900, 0.85);
    set("photo", uri);
  }

  async function handlePhotoUpload2(file: File) {
    const uri = await resizeImageToDataUri(file, 900, 0.85);
    set("photo2", uri);
  }

  function addRealEstate() {
    set("realEstate", [...data.realEstate, { photo: "", address: "", description: "", value: "", purchaseInfo: "" }]);
  }
  function updateRealEstate(i: number, patch: Partial<RealEstateItem>) {
    const next = [...data.realEstate];
    next[i] = { ...next[i], ...patch };
    set("realEstate", next);
  }
  function removeRealEstate(i: number) {
    set("realEstate", data.realEstate.filter((_, idx) => idx !== i));
  }
  function moveRealEstate(i: number, direction: -1 | 1) {
    const next = [...data.realEstate];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("realEstate", next);
  }

  function addGivingRow() {
    set("otherGiving", [...data.otherGiving, { recipient: "", giving: "", year: "", amount: "" }]);
  }
  function updateGivingRow(i: number, patch: Partial<GivingRow>) {
    const next = [...data.otherGiving];
    next[i] = { ...next[i], ...patch };
    set("otherGiving", next);
  }
  function removeGivingRow(i: number) {
    set("otherGiving", data.otherGiving.filter((_, idx) => idx !== i));
  }
  function moveGivingRow(i: number, direction: -1 | 1) {
    const next = [...data.otherGiving];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("otherGiving", next);
  }

  function addFecRow() {
    set("fecGiving", [...data.fecGiving, { org: "", year: "", amount: "" }]);
  }
  function updateFecRow(i: number, patch: Partial<FecRow>) {
    const next = [...data.fecGiving];
    next[i] = { ...next[i], ...patch };
    set("fecGiving", next);
  }
  function removeFecRow(i: number) {
    set("fecGiving", data.fecGiving.filter((_, idx) => idx !== i));
  }
  function moveFecRow(i: number, direction: -1 | 1) {
    const next = [...data.fecGiving];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("fecGiving", next);
  }

  function addChildRow() {
    set("childrenRows", [...data.childrenRows, { name: "", age: "", otherInfo: "" }]);
  }
  function updateChildRow(i: number, patch: Partial<ChildRow>) {
    const next = [...data.childrenRows];
    next[i] = { ...next[i], ...patch };
    set("childrenRows", next);
  }
  function removeChildRow(i: number) {
    set("childrenRows", data.childrenRows.filter((_, idx) => idx !== i));
  }
  function moveChildRow(i: number, direction: -1 | 1) {
    const next = [...data.childrenRows];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("childrenRows", next);
  }

  function addEducationEntry() {
    set("educationEntries", [...data.educationEntries, { institution: "", degree: "", year: "" }]);
  }
  function updateEducationEntry(i: number, patch: Partial<EducationEntry>) {
    const next = [...data.educationEntries];
    next[i] = { ...next[i], ...patch };
    set("educationEntries", next);
  }
  function removeEducationEntry(i: number) {
    set("educationEntries", data.educationEntries.filter((_, idx) => idx !== i));
  }
  function moveEducationEntry(i: number, direction: -1 | 1) {
    const next = [...data.educationEntries];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("educationEntries", next);
  }

  function addPhoneRow() {
    set("phones", [...data.phones, { type: "Mobile", customType: "", number: "" }]);
  }
  function updatePhoneRow(i: number, patch: Partial<PhoneRow>) {
    const next = [...data.phones];
    next[i] = { ...next[i], ...patch };
    set("phones", next);
  }
  function removePhoneRow(i: number) {
    set("phones", data.phones.filter((_, idx) => idx !== i));
  }
  function movePhoneRow(i: number, direction: -1 | 1) {
    const next = [...data.phones];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("phones", next);
  }

  function addEmailRow() {
    set("emails", [...data.emails, { type: "Personal", customType: "", address: "" }]);
  }
  function updateEmailRow(i: number, patch: Partial<EmailRow>) {
    const next = [...data.emails];
    next[i] = { ...next[i], ...patch };
    set("emails", next);
  }
  function removeEmailRow(i: number) {
    set("emails", data.emails.filter((_, idx) => idx !== i));
  }
  function moveEmailRow(i: number, direction: -1 | 1) {
    const next = [...data.emails];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("emails", next);
  }

  function addGivingHistoryRow() {
    set("givingHistoryRows", [...data.givingHistoryRows, { year: "", amount: "", comments: "" }]);
  }
  function updateGivingHistoryRow(i: number, patch: Partial<GivingHistoryRow>) {
    const next = [...data.givingHistoryRows];
    next[i] = { ...next[i], ...patch };
    set("givingHistoryRows", next);
  }
  function removeGivingHistoryRow(i: number) {
    set("givingHistoryRows", data.givingHistoryRows.filter((_, idx) => idx !== i));
  }
  function moveGivingHistoryRow(i: number, direction: -1 | 1) {
    const next = [...data.givingHistoryRows];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("givingHistoryRows", next);
  }

  // Auto-calculate Real Estate Value + # of Properties from the property rows.
  useEffect(() => {
    const sum = data.realEstate.reduce((acc, r) => acc + parseCurrencyToNumber(r.value), 0);
    const computedValue = data.realEstate.length ? formatCurrency(sum) : "";
    const computedCount = data.realEstate.length ? String(data.realEstate.length) : "";
    setData((d) => {
      if (d.realEstateValue === computedValue && d.realEstatePropertyCount === computedCount) return d;
      return { ...d, realEstateValue: computedValue, realEstatePropertyCount: computedCount };
    });
  }, [data.realEstate]);

  // Auto-calculate Non-Philanthropic Political Giving from FEC amounts.
  useEffect(() => {
    const sum = data.fecGiving.reduce((acc, r) => acc + parseCurrencyToNumber(r.amount), 0);
    const computed = data.fecGiving.length ? formatCurrency(sum) : "";
    setData((d) =>
      d.nonPhilanthropicPoliticalGiving === computed ? d : { ...d, nonPhilanthropicPoliticalGiving: computed }
    );
  }, [data.fecGiving]);

  async function generatePdf() {
    setGenerating(true);
    setGenError(null);
    setPdfUrl(null);
    setEmailStatus(null);
    try {
      // Auto-save the profile every time a PDF is generated, so it's always
      // reopenable from "My Profiles" without a separate manual save step.
      const resolvedProfileId = await persistProfile(profileId);

      const res = await fetch("/api/research-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Failed to generate PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // Auto-email the freshly generated PDF to the project lead whenever
      // this profile is marked "Sent for Approval" and an address has been
      // entered -- this is the one moment both conditions ("generated" and
      // "saved as Sent for Approval") are guaranteed true at the same time.
      if (status === "sent_for_approval" && data.projectLeadEmail.trim()) {
        await emailPdfToProjectLead(blob, resolvedProfileId);
      }
    } catch (err: any) {
      setGenError(err?.message || "Something went wrong generating the PDF.");
    } finally {
      setGenerating(false);
    }
  }

  async function emailPdfToProjectLead(blob: Blob, targetProfileId: string | null) {
    try {
      if (!targetProfileId) {
        setEmailStatus({ ok: false, message: "Could not email the PDF: the profile hasn't finished saving yet. Please try again." });
        return;
      }
      const base64 = await blobToBase64(blob);
      const res = await fetch(`/api/research-profiles/${targetProfileId}/email-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.projectLeadEmail.trim(),
          fileName,
          profileName: data.name,
          profileType: "individual",
          pdfBase64: base64,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        setEmailStatus({ ok: false, message: json?.error || "Could not email the PDF to the project lead." });
      } else {
        setEmailStatus({
          ok: true,
          message:
            Array.isArray(json?.recipients) && json.recipients.length > 0
              ? `Emailed to ${json.recipients.join(", ")}.`
              : `Emailed to ${data.projectLeadEmail.trim()}.`,
        });
      }
    } catch {
      setEmailStatus({ ok: false, message: "Could not email the PDF to the project lead." });
    }
  }

  const fileName = buildProfilePdfFileName(data.clientProfiler, data.name, data.dateCreated, "Prospect Intelligence Profile");

  const statusMeta: Record<ProfileStatus, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent_for_approval: "bg-[rgb(var(--brass))]/10 text-[rgb(var(--brass))]",
    approved: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
      <Link
        href="/research"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--ink))]/50 hover:text-[rgb(var(--navy))]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        My Profiles
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Internal Tool
          </p>
          <h1 className="mt-1 font-display text-3xl text-[rgb(var(--navy))]">
            Prospect Intelligence Profile Builder
          </h1>
        </div>
        <button
          type="button"
          onClick={clearDraft}
          className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--line))] px-4 py-2 text-xs font-semibold text-[rgb(var(--ink))]/70 hover:border-[rgb(var(--brass))]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Start New Blank Profile
        </button>
      </div>

      {loadingProfile && (
        <p className="mt-4 text-sm text-[rgb(var(--ink))]/50">Loading profile...</p>
      )}
      {loadError && <p className="mt-4 text-sm text-red-600">{loadError}</p>}

      {restoredNotice && (
        <div className="mt-4 rounded-lg bg-[rgb(var(--paper))] px-4 py-2 text-sm text-[rgb(var(--ink))]/70">
          Your last in-progress profile was restored automatically. Keep editing below, or click
          &ldquo;Start New Blank Profile&rdquo; to clear it.
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/60">
        Fill in what you have below&mdash;every field is optional. Save this profile to give it a
        status and make it reopenable by anyone on the team from &ldquo;My Profiles.&rdquo; When
        you&rsquo;re ready, click &ldquo;Generate PDF&rdquo; to produce a fully formatted,
        ready-to-download profile.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[rgb(var(--line))] bg-[rgb(var(--paper))] p-4">
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProfileStatus)}
            className={`rounded-full border border-[rgb(var(--line))] px-3 py-1.5 text-sm font-semibold outline-none focus:border-[rgb(var(--brass))] ${statusMeta[status]}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          {lastSavedAt && (
            <span className="text-xs text-[rgb(var(--ink))]/45">
              Saved {new Date(lastSavedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--navy))] px-4 py-2 text-xs font-semibold text-[rgb(var(--navy))] transition-colors hover:bg-[rgb(var(--navy))] hover:text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {profileId && (
            <button
              type="button"
              onClick={deleteThisProfile}
              className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-xs font-semibold text-red-600/70 transition-colors hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
      {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}

      {!urlId && roster.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[rgb(var(--brass))]/40 bg-[rgb(var(--brass))]/10 p-4">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            <Target className="h-3.5 w-3.5" />
            Prefill From This Week&rsquo;s Prospect List
          </label>
          <p className="mt-1 text-xs text-[rgb(var(--ink))]/60">
            Select a name to auto-fill their name, giving history, wealth rating, giving capacity, address, phone(s),
            and email(s) from the uploaded spreadsheet. Everything is editable afterward except Name, Catapult ID,
            and Client ID, which stay locked to the master list.
          </p>
          <select
            value={selectedRosterName}
            onChange={(e) => applyRosterProspect(e.target.value)}
            className="mt-3 w-full rounded-full border border-[rgb(var(--line))] bg-white px-4 py-2.5 text-sm outline-none focus:border-[rgb(var(--brass))] sm:w-auto"
          >
            <option value="">Choose a prospect...</option>
            {roster.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
                {p.givingHistoryRows.length > 0 ? ` (${p.givingHistoryRows.length} gift${p.givingHistoryRows.length === 1 ? "" : "s"} on file)` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Header meta */}
      <SectionHeading>Profile Header</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date Created" value={data.dateCreated} onChange={(v) => set("dateCreated", v)} />
        <Field
          label="Client Name / Profiler Initials"
          value={data.clientProfiler}
          onChange={(v) => set("clientProfiler", v)}
          placeholder="e.g., SCFTA/JG"
        />
        <Field
          label="Project Lead Email(s)"
          value={data.projectLeadEmail}
          onChange={(v) => set("projectLeadEmail", v)}
          placeholder="e.g., anthonya@catapultfr.com, karen@catapultfr.com"
        />
      </div>
      <p className="mt-2 text-xs text-[rgb(var(--ink))]/45">
        When the status above is set to &ldquo;Sent for Approval&rdquo; and you click &ldquo;Generate
        PDF,&rdquo; this profile is automatically emailed to that address (or addresses&mdash;separate
        multiple project leads with a comma) as an attachment.
      </p>

      {/* Name */}
      <SectionHeading>Prospect Name</SectionHeading>
      <Field
        label="Name"
        value={data.name}
        onChange={(v) => set("name", v)}
        placeholder="Prospect name(s)"
        disabled={lockedFromRoster}
        lockedHint="Locked from prospect list"
      />

      {/* Wealth panel */}
      <SectionHeading icon={DollarSign}>Wealth Summary</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estimated Income" value={data.estimatedIncome} onChange={(v) => set("estimatedIncome", v)} placeholder="$" icon={DollarSign} money />
        <Field label="Estimated Net Worth" value={data.estimatedNetWorth} onChange={(v) => set("estimatedNetWorth", v)} placeholder="$" icon={DollarSign} money />
        <Field label="Stock Value" value={data.stockValue} onChange={(v) => set("stockValue", v)} placeholder="$" icon={TrendingUp} money />
        <ComputedField label="Real Estate Value" value={data.realEstateValue} hint="auto-calculated from properties below" icon={Home} />
        <ComputedField label="# of Properties" value={data.realEstatePropertyCount} hint="auto-calculated from properties below" icon={Building2} />
        <Field label="Estimated Giving Capacity — 5 Years" value={data.givingCapacity} onChange={(v) => set("givingCapacity", v)} placeholder="$" icon={Gift} money />
        <Field label="Wealth Rating" value={data.wealthRating} onChange={(v) => set("wealthRating", v)} icon={Star} />
      </div>

      {/* Photo */}
      <SectionHeading>Prospect Photo</SectionHeading>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-5">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[rgb(var(--brass))] bg-[rgb(var(--paper))]">
            {data.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photo} alt="Prospect" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] text-[rgb(var(--ink))]/40">No photo</span>
            )}
          </div>
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="rounded-full bg-[rgb(var(--navy))] px-4 py-2 text-xs font-semibold text-white hover:bg-[rgb(var(--brass))]"
            >
              {data.photo ? "Replace Photo" : "Upload Photo"}
            </button>
            {data.photo && (
              <button
                type="button"
                onClick={() => set("photo", "")}
                className="ml-3 text-xs font-semibold text-[rgb(var(--ink))]/50 hover:text-[rgb(var(--ink))]"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {showPhoto2 ? (
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[rgb(var(--brass))] bg-[rgb(var(--paper))]">
              {data.photo2 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.photo2} alt="Prospect (second photo)" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[11px] text-[rgb(var(--ink))]/40">No photo</span>
              )}
            </div>
            <div>
              <input
                ref={photo2InputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoUpload2(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => photo2InputRef.current?.click()}
                className="rounded-full bg-[rgb(var(--navy))] px-4 py-2 text-xs font-semibold text-white hover:bg-[rgb(var(--brass))]"
              >
                {data.photo2 ? "Replace Photo" : "Upload Photo"}
              </button>
              <button
                type="button"
                onClick={() => {
                  set("photo2", "");
                  setShowPhoto2(false);
                }}
                className="ml-3 text-xs font-semibold text-[rgb(var(--ink))]/50 hover:text-[rgb(var(--ink))]"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPhoto2(true)}
            className="inline-flex items-center gap-2 self-center rounded-full border border-dashed border-[rgb(var(--brass))] px-4 py-2 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-[rgb(var(--paper))]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Second Photo
          </button>
        )}
      </div>

      {/* Identification & personal details */}
      <SectionHeading icon={Users}>Identification &amp; Personal Details</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Catapult ID Number"
          value={data.catapultId}
          onChange={(v) => set("catapultId", v)}
          placeholder="CPTID #"
          icon={Hash}
          disabled={lockedFromRoster}
          lockedHint="Locked from prospect list"
        />
        <Field
          label="Client ID Number"
          value={data.clientId}
          onChange={(v) => set("clientId", v)}
          placeholder="Client ID #"
          icon={Hash}
          disabled={lockedFromRoster}
          lockedHint="Locked from prospect list"
        />
      </div>
      <Field label="Home Address" value={data.homeAddress} onChange={(v) => set("homeAddress", v)} textarea rows={2} icon={MapPin} placeholder="Street, city, state, ZIP" richText />
      <div className="mt-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          <Phone className="h-3.5 w-3.5" />
          Phone Numbers
        </label>
        <RowTable
          headers={["Type", "Custom Label (if Other)", "Phone Number"]}
          rows={data.phones}
          onAdd={addPhoneRow}
          addLabel="Add Phone Number"
          renderRow={(row: PhoneRow, i) => (
            <>
              <select
                className="w-full min-w-0 border-none bg-transparent text-sm outline-none"
                value={row.type}
                onChange={(e) => updatePhoneRow(i, { type: e.target.value })}
              >
                {PHONE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                className="w-full min-w-0 border-none bg-transparent text-sm outline-none disabled:opacity-30"
                value={row.customType}
                disabled={row.type !== "Other"}
                onChange={(e) => updatePhoneRow(i, { customType: e.target.value })}
                placeholder="e.g., Assistant"
              />
              <input
                className="w-full min-w-0 border-none bg-transparent text-sm outline-none"
                value={row.number}
                onChange={(e) => updatePhoneRow(i, { number: formatPhoneNumber(e.target.value) })}
                placeholder="(702) 555-1234"
              />
            </>
          )}
          onRemove={removePhoneRow}
          onMove={movePhoneRow}
          colWidths={["25%", "30%", "45%"]}
        />
      </div>

      <div className="mt-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          <Mail className="h-3.5 w-3.5" />
          Email Addresses
        </label>
        <RowTable
          headers={["Type", "Custom Label (if Other)", "Email Address"]}
          rows={data.emails}
          onAdd={addEmailRow}
          addLabel="Add Email Address"
          renderRow={(row: EmailRow, i) => (
            <>
              <select
                className="w-full min-w-0 border-none bg-transparent text-sm outline-none"
                value={row.type}
                onChange={(e) => updateEmailRow(i, { type: e.target.value })}
              >
                {EMAIL_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                className="w-full min-w-0 border-none bg-transparent text-sm outline-none disabled:opacity-30"
                value={row.customType}
                disabled={row.type !== "Other"}
                onChange={(e) => updateEmailRow(i, { customType: e.target.value })}
                placeholder="e.g., Assistant"
              />
              <input
                className="w-full min-w-0 border-none bg-transparent text-sm outline-none"
                value={row.address}
                onChange={(e) => updateEmailRow(i, { address: e.target.value })}
                placeholder="name@example.com"
              />
            </>
          )}
          onRemove={removeEmailRow}
          onMove={moveEmailRow}
          colWidths={["25%", "30%", "45%"]}
        />
      </div>
      <Field label="Born" value={data.born} onChange={(v) => set("born", v)} placeholder="DOB, Age, aka" textarea rows={2} icon={CalendarDays} richText />
      <SelectField label="Marital Status" value={data.maritalStatus} onChange={(v) => set("maritalStatus", v)} options={MARITAL_STATUS_OPTIONS} icon={Users} />

      <div className="mt-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          <Baby className="h-3.5 w-3.5" />
          Children
        </label>
        <RowTable
          headers={["Child Name", "Age", "Other Information"]}
          rows={data.childrenRows}
          onAdd={addChildRow}
          addLabel="Add Child"
          renderRow={(row: ChildRow, i) => (
            <>
              <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.name} onChange={(e) => updateChildRow(i, { name: e.target.value })} placeholder="Name" />
              <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.age} onChange={(e) => updateChildRow(i, { age: e.target.value })} placeholder="Age" />
              <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.otherInfo} onChange={(e) => updateChildRow(i, { otherInfo: e.target.value })} placeholder="Other information" />
            </>
          )}
          onRemove={removeChildRow}
          onMove={moveChildRow}
          colWidths={["30%", "15%", "55%"]}
        />
      </div>

      <div className="mt-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          <GraduationCap className="h-3.5 w-3.5" />
          Education
        </label>
        <RowTable
          headers={["University", "Degree", "Graduation Year"]}
          rows={data.educationEntries}
          onAdd={addEducationEntry}
          addLabel="Add Institution"
          renderRow={(row: EducationEntry, i) => (
            <>
              <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.institution} onChange={(e) => updateEducationEntry(i, { institution: e.target.value })} placeholder="University" />
              <select
                className="w-full min-w-0 border-none bg-transparent text-sm outline-none"
                value={row.degree}
                onChange={(e) => updateEducationEntry(i, { degree: e.target.value })}
              >
                <option value="">Select degree</option>
                {DEGREE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.year} onChange={(e) => updateEducationEntry(i, { year: e.target.value })} placeholder="Graduation year" />
            </>
          )}
          onRemove={removeEducationEntry}
          onMove={moveEducationEntry}
          colWidths={["40%", "35%", "25%"]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Military Branch" value={data.militaryBranch} onChange={(v) => set("militaryBranch", v)} options={MILITARY_BRANCH_OPTIONS} icon={Shield} />
        <Field label="Military Details" value={data.militaryDetails} onChange={(v) => set("militaryDetails", v)} placeholder="Rank, years served, etc." icon={Shield} />
      </div>

      <Field label="Religion" value={data.religion} onChange={(v) => set("religion", v)} icon={BookOpen} />
      <Field label="Hobbies & Interests" value={data.hobbiesInterests} onChange={(v) => set("hobbiesInterests", v)} textarea rows={2} icon={Heart} richText />
      <Field label="Relationship to [Organization]" value={data.relationshipToOrg} onChange={(v) => set("relationshipToOrg", v)} textarea rows={3} icon={Handshake} richText />

      <div className="mt-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          <Gift className="h-3.5 w-3.5" />
          Giving History to [Organization]
        </label>
        <RowTable
          headers={["Year", "Amount", "Comments"]}
          rows={data.givingHistoryRows}
          onAdd={addGivingHistoryRow}
          addLabel="Add Giving Entry"
          renderRow={(row: GivingHistoryRow, i) => (
            <>
              <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.year} onChange={(e) => updateGivingHistoryRow(i, { year: e.target.value })} placeholder="Year" />
              <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.amount} onChange={(e) => updateGivingHistoryRow(i, { amount: e.target.value })} onBlur={(e) => updateGivingHistoryRow(i, { amount: smartFormatCurrency(e.target.value) })} placeholder="Amount" />
              <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.comments} onChange={(e) => updateGivingHistoryRow(i, { comments: e.target.value })} placeholder="Comments" />
            </>
          )}
          onRemove={removeGivingHistoryRow}
          onMove={moveGivingHistoryRow}
          colWidths={["20%", "20%", "60%"]}
        />
      </div>

      {/* Real Estate */}
      <SectionHeading icon={Home}>Real Estate</SectionHeading>
      <div className="mt-4 space-y-6">
        {data.realEstate.map((re, i) => (
          <RealEstateCard
            key={i}
            item={re}
            index={i}
            onChange={(patch) => updateRealEstate(i, patch)}
            onRemove={() => removeRealEstate(i)}
            onMove={(direction) => moveRealEstate(i, direction)}
            canMoveUp={i > 0}
            canMoveDown={i < data.realEstate.length - 1}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={addRealEstate}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-[rgb(var(--brass))] px-4 py-2 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-[rgb(var(--paper))]"
      >
        <Plus className="h-4 w-4" />
        Add Another Property
      </button>

      {/* Business / Foundation / Political */}
      <SectionHeading icon={Briefcase}>Business, Foundation &amp; Affiliations</SectionHeading>
      <Field label="Business Address(es) & Phone(s)" value={data.businessAddresses} onChange={(v) => set("businessAddresses", v)} textarea rows={4} icon={Briefcase} richText />
      <Field label="Family Foundation" value={data.familyFoundation} onChange={(v) => set("familyFoundation", v)} textarea rows={3} icon={Landmark} richText />
      <SelectField label="Political Affiliation" value={data.politicalAffiliation} onChange={(v) => set("politicalAffiliation", v)} options={POLITICAL_AFFILIATION_OPTIONS} icon={Vote} />
      <Field label="Additional Information" value={data.additionalInformation} onChange={(v) => set("additionalInformation", v)} textarea rows={8} icon={FileText} richText />
      <Field label="Boards" value={data.boards} onChange={(v) => set("boards", v)} textarea rows={4} icon={Users2} richText />
      <Field label="Clubs & Affiliations" value={data.clubsAffiliations} onChange={(v) => set("clubsAffiliations", v)} textarea rows={4} icon={Users2} richText />
      <Field label="Business Colleagues" value={data.businessColleagues} onChange={(v) => set("businessColleagues", v)} textarea rows={4} icon={Briefcase} richText />

      {/* Other Giving History */}
      <SectionHeading icon={Gift}>Other Giving History</SectionHeading>
      <p className="mt-2 text-xs italic text-[rgb(var(--ink))]/50">
        The amounts listed are representative of donations found in publicly available records and
        in donor history provided to Catapult. As such, the individual amounts will not necessarily
        total the Total Giving amount.
      </p>
      <RowTable
        headers={["Recipient", "Category", "Year", "Amount"]}
        rows={data.otherGiving}
        onAdd={addGivingRow}
        addLabel="Add Giving Row"
        renderRow={(row: GivingRow, i) => (
          <>
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.recipient} onChange={(e) => updateGivingRow(i, { recipient: e.target.value })} placeholder="Recipient" />
            <select
              className="w-full min-w-0 border-none bg-transparent text-sm outline-none"
              value={row.giving}
              onChange={(e) => updateGivingRow(i, { giving: e.target.value })}
            >
              <option value="">Select category</option>
              {GIVING_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.year} onChange={(e) => updateGivingRow(i, { year: e.target.value })} placeholder="Year" />
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.amount} onChange={(e) => updateGivingRow(i, { amount: e.target.value })} onBlur={(e) => updateGivingRow(i, { amount: smartFormatCurrency(e.target.value) })} placeholder="Amount" />
          </>
        )}
        onRemove={removeGivingRow}
        onMove={moveGivingRow}
        colWidths={["35%", "27%", "12%", "18%"]}
      />

      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          <Landmark className="h-3.5 w-3.5" />
          FEC Recipient Organization
        </p>
      </div>
      <RowTable
        headers={["FEC Recipient Organization", "Year", "Amount"]}
        rows={data.fecGiving}
        onAdd={addFecRow}
        addLabel="Add FEC Row"
        renderRow={(row: FecRow, i) => (
          <>
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.org} onChange={(e) => updateFecRow(i, { org: e.target.value })} placeholder="Organization" />
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.year} onChange={(e) => updateFecRow(i, { year: e.target.value })} placeholder="Year" />
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.amount} onChange={(e) => updateFecRow(i, { amount: smartFormatCurrency(e.target.value) })} placeholder="Amount" />
          </>
        )}
        onRemove={removeFecRow}
        onMove={moveFecRow}
        colWidths={["55%", "20%", "25%"]}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label="Total Charitable Giving" value={data.totalCharitableGiving} onChange={(v) => set("totalCharitableGiving", v)} placeholder="$" icon={Gift} money />
        <ComputedField label="Non-Philanthropic Political Giving" value={data.nonPhilanthropicPoliticalGiving} hint="auto-calculated from FEC amounts" icon={Vote} />
      </div>
      <Field label="Recommended Ask Amount" value={data.recommendedAskAmount} onChange={(v) => set("recommendedAskAmount", v)} icon={Target} money />

      {/* Generate */}
      <div className="mt-12 rounded-2xl border border-[rgb(var(--line))] bg-[rgb(var(--paper))] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg text-[rgb(var(--navy))]">Generate the formatted PDF</p>
            <p className="mt-1 text-sm text-[rgb(var(--ink))]/60">
              This automatically saves the profile too, so it&rsquo;s always reopenable from
              &ldquo;My Profiles.&rdquo; Keep editing anything above and click this again to
              regenerate&mdash;nothing is lost.
            </p>
          </div>
          <button
            type="button"
            onClick={generatePdf}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--brass))] disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? "Generating..." : "Generate PDF"}
          </button>
        </div>

        {genError && <p className="mt-4 text-sm text-red-600">{genError}</p>}
        {emailStatus && (
          <p className={`mt-4 text-sm ${emailStatus.ok ? "text-emerald-700" : "text-red-600"}`}>
            {emailStatus.ok ? "✓ " : ""}
            {emailStatus.message}
          </p>
        )}

        {pdfUrl && (
          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4">
            <p className="text-sm text-[rgb(var(--ink))]/70">Your PDF is ready.</p>
            <a
              href={pdfUrl}
              download={fileName}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--brass))] px-5 py-2 text-sm font-semibold text-[rgb(var(--navy))] hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              Download {fileName}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function RealEstateCard({
  item,
  index,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  item: RealEstateItem;
  index: number;
  onChange: (patch: Partial<RealEstateItem>) => void;
  onRemove: () => void;
  onMove?: (direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    const uri = await resizeImageToDataUri(file, 1000, 0.82);
    onChange({ photo: uri });
  }

  return (
    <div className="rounded-2xl border border-[rgb(var(--line))] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[rgb(var(--navy))]">Property {index + 1}</p>
        <div className="flex items-center gap-3">
          {onMove && (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={!canMoveUp}
                title="Move up"
                className="text-[rgb(var(--ink))]/40 hover:text-[rgb(var(--navy))] disabled:opacity-20"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                disabled={!canMoveDown}
                title="Move down"
                className="text-[rgb(var(--ink))]/40 hover:text-[rgb(var(--navy))] disabled:opacity-20"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600/80 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg border border-[rgb(var(--brass))]/60 bg-[rgb(var(--paper))]">
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photo} alt={`Property ${index + 1}`} className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-[10px] text-[rgb(var(--ink))]/40">No photo</span>
          )}
        </div>
        <div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-full border border-[rgb(var(--line))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:border-[rgb(var(--brass))]">
            {item.photo ? "Replace Photo" : "Upload Photo"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Address" value={item.address} onChange={(v) => onChange({ address: v })} textarea rows={2} richText />
        <Field label="Description" value={item.description} onChange={(v) => onChange({ description: v })} placeholder="Bedrooms, bathrooms, sq ft, details" textarea rows={2} richText />
        <Field label="Value" value={item.value} onChange={(v) => onChange({ value: v })} placeholder="$" money />
        <Field label="Purchase Info" value={item.purchaseInfo} onChange={(v) => onChange({ purchaseInfo: v })} placeholder="Purchased on [date], Purchase Amount $" />
      </div>
    </div>
  );
}

function RowTable<T>({
  headers,
  rows,
  renderRow,
  onAdd,
  onRemove,
  addLabel,
  colWidths,
  onMove,
}: {
  headers: string[];
  rows: T[];
  renderRow: (row: T, i: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (i: number) => void;
  addLabel: string;
  colWidths: string[];
  // Optional up/down reordering buttons per row, for tables where profilers
  // need manual control over entry order (e.g. "most recent year first"
  // isn't always a clean auto-sort once soft-credit/lifetime-total rows
  // with blank years are mixed in).
  onMove?: (i: number, direction: -1 | 1) => void;
}) {
  return (
    <div className="mt-3">
      <div className="overflow-hidden rounded-xl border border-[rgb(var(--line))]">
        <div className="flex bg-[rgb(var(--navy))] text-white">
          {headers.map((h, i) => (
            <div key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ width: colWidths[i] }}>
              {h}
            </div>
          ))}
          <div className="w-10" />
        </div>
        {rows.length === 0 && (
          <div className="px-3 py-4 text-sm text-[rgb(var(--ink))]/40">No rows yet. Click &ldquo;{addLabel}&rdquo; below.</div>
        )}
        {rows.map((row, i) => (
          <div key={i} className={`flex items-center border-t border-[rgb(var(--line))] px-3 py-2 ${i % 2 === 1 ? "bg-[rgb(var(--paper))]" : "bg-white"}`}>
            {(renderRow(row, i) as any).props.children.map((child: React.ReactNode, ci: number) => (
              <div key={ci} style={{ width: colWidths[ci] }} className="pr-2">
                {child}
              </div>
            ))}
            {onMove && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => onMove(i, -1)}
                  disabled={i === 0}
                  title="Move up"
                  className="text-[rgb(var(--ink))]/40 hover:text-[rgb(var(--navy))] disabled:opacity-20"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(i, 1)}
                  disabled={i === rows.length - 1}
                  title="Move down"
                  className="text-[rgb(var(--ink))]/40 hover:text-[rgb(var(--navy))] disabled:opacity-20"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
            )}
            <button type="button" onClick={() => onRemove(i)} className="w-10 text-red-600/70 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-[rgb(var(--brass))] px-4 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-[rgb(var(--paper))]"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}
