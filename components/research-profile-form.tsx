"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Download, Loader2, RotateCcw, Save, ArrowLeft } from "lucide-react";

const DRAFT_KEY_PREFIX = "catapult_research_profile_draft_v1";
const draftKey = (id: string | null) => `${DRAFT_KEY_PREFIX}:${id || "unsaved"}`;

type ProfileStatus = "draft" | "sent_for_approval" | "approved";

const STATUS_OPTIONS: Array<{ value: ProfileStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "sent_for_approval", label: "Sent for Approval" },
  { value: "approved", label: "Approved" },
];

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

interface ProfileData {
  dateCreated: string;
  clientProfiler: string;
  name: string;
  estimatedIncome: string;
  estimatedNetWorth: string;
  stockValue: string;
  realEstateValue: string;
  givingCapacity: string;
  wealthRating: string;
  photo: string;
  identificationNumber: string;
  contactInformation: string;
  born: string;
  maritalStatus: string;
  children: string;
  education: string;
  militaryService: string;
  religion: string;
  hobbiesInterests: string;
  relationshipToOrg: string;
  givingHistoryToOrg: string;
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

function emptyProfile(): ProfileData {
  return {
    dateCreated: todayISO(),
    clientProfiler: "",
    name: "",
    estimatedIncome: "",
    estimatedNetWorth: "",
    stockValue: "",
    realEstateValue: "",
    givingCapacity: "",
    wealthRating: "",
    photo: "",
    identificationNumber: "",
    contactInformation: "",
    born: "",
    maritalStatus: "",
    children: "",
    education: "",
    militaryService: "",
    religion: "",
    hobbiesInterests: "",
    relationshipToOrg: "",
    givingHistoryToOrg: "",
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 border-b border-[rgb(var(--line))] pb-2 font-display text-2xl text-[rgb(var(--navy))]">
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div className="mt-5">
      <label className="text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="mt-1.5 w-full resize-y rounded-lg border border-[rgb(var(--line))] px-3 py-2 text-sm text-[rgb(var(--ink))] outline-none focus:border-[rgb(var(--brass))]"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1.5 w-full rounded-lg border border-[rgb(var(--line))] px-3 py-2 text-sm text-[rgb(var(--ink))] outline-none focus:border-[rgb(var(--brass))]"
        />
      )}
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
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  // Load an existing saved profile from the server if ?id= is present;
  // otherwise fall back to the last local draft for a brand new profile.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (urlId) {
        setLoadingProfile(true);
        setLoadError(null);
        try {
          const res = await fetch(`/api/research-profiles/${urlId}`, { cache: "no-store" });
          if (!res.ok) throw new Error("Could not load that profile.");
          const json = await res.json();
          const envelope = json.data || {};
          if (!cancelled) {
            setData({ ...emptyProfile(), ...(envelope.data ?? {}) });
            setStatus((envelope.status as ProfileStatus) || "draft");
            setProfileId(urlId);
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
            setData({ ...emptyProfile(), ...parsed });
            setRestoredNotice(true);
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

  async function saveProfile() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/research-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, name: data.name, status, data }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Failed to save profile.");
      }
      const json = await res.json();
      setProfileId(json.profile.id);
      setLastSavedAt(json.profile.updatedAt);
      router.replace(`/research/new?id=${json.profile.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Something went wrong saving this profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    const uri = await resizeImageToDataUri(file, 900, 0.85);
    set("photo", uri);
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

  async function generatePdf() {
    setGenerating(true);
    setGenError(null);
    setPdfUrl(null);
    try {
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
    } catch (err: any) {
      setGenError(err?.message || "Something went wrong generating the PDF.");
    } finally {
      setGenerating(false);
    }
  }

  const fileName = `${(data.name || "Prospect Research Profile").replace(/[^a-z0-9]+/gi, "_")}.pdf`;

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
            Prospect Research Profile Builder
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
        </div>
      </div>
      {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}

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
      </div>

      {/* Name */}
      <SectionHeading>Prospect Name</SectionHeading>
      <Field label="Name" value={data.name} onChange={(v) => set("name", v)} placeholder="Prospect name(s)" />

      {/* Wealth panel */}
      <SectionHeading>Wealth Summary</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estimated Income" value={data.estimatedIncome} onChange={(v) => set("estimatedIncome", v)} placeholder="$" />
        <Field label="Estimated Net Worth" value={data.estimatedNetWorth} onChange={(v) => set("estimatedNetWorth", v)} placeholder="$" />
        <Field label="Stock Value" value={data.stockValue} onChange={(v) => set("stockValue", v)} placeholder="$" />
        <Field label="Real Estate Value (# of Properties)" value={data.realEstateValue} onChange={(v) => set("realEstateValue", v)} placeholder="$ ( )" />
        <Field label="Estimated Giving Capacity — 5 Years" value={data.givingCapacity} onChange={(v) => set("givingCapacity", v)} placeholder="$" />
        <Field label="Wealth Rating" value={data.wealthRating} onChange={(v) => set("wealthRating", v)} />
      </div>

      {/* Photo */}
      <SectionHeading>Prospect Photo</SectionHeading>
      <div className="mt-4 flex items-center gap-5">
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
            Upload Photo
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

      {/* Identification & personal details */}
      <SectionHeading>Identification &amp; Personal Details</SectionHeading>
      <Field label="Identification Number" value={data.identificationNumber} onChange={(v) => set("identificationNumber", v)} placeholder="CPTID # / Client ID #" />
      <Field label="Contact Information" value={data.contactInformation} onChange={(v) => set("contactInformation", v)} placeholder="Phone, email" textarea rows={2} />
      <Field label="Born" value={data.born} onChange={(v) => set("born", v)} placeholder="DOB, Age, aka" textarea rows={2} />
      <Field label="Marital Status" value={data.maritalStatus} onChange={(v) => set("maritalStatus", v)} placeholder="Single, Married, Divorced, Dating" />
      <Field label="Children" value={data.children} onChange={(v) => set("children", v)} placeholder="Names — Age, additional information if found" textarea rows={2} />
      <Field label="Education" value={data.education} onChange={(v) => set("education", v)} textarea rows={2} />
      <Field label="Military Service" value={data.militaryService} onChange={(v) => set("militaryService", v)} />
      <Field label="Religion" value={data.religion} onChange={(v) => set("religion", v)} />
      <Field label="Hobbies & Interests" value={data.hobbiesInterests} onChange={(v) => set("hobbiesInterests", v)} textarea rows={2} />
      <Field label="Relationship to [Organization]" value={data.relationshipToOrg} onChange={(v) => set("relationshipToOrg", v)} textarea rows={3} />
      <Field label="Giving History to [Organization]" value={data.givingHistoryToOrg} onChange={(v) => set("givingHistoryToOrg", v)} textarea rows={4} />

      {/* Real Estate */}
      <SectionHeading>Real Estate</SectionHeading>
      <div className="mt-4 space-y-6">
        {data.realEstate.map((re, i) => (
          <RealEstateCard
            key={i}
            item={re}
            index={i}
            onChange={(patch) => updateRealEstate(i, patch)}
            onRemove={() => removeRealEstate(i)}
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
      <SectionHeading>Business, Foundation &amp; Affiliations</SectionHeading>
      <Field label="Business Address(es) & Phone(s)" value={data.businessAddresses} onChange={(v) => set("businessAddresses", v)} textarea rows={4} />
      <Field label="Family Foundation" value={data.familyFoundation} onChange={(v) => set("familyFoundation", v)} textarea rows={3} />
      <Field label="Political Affiliation" value={data.politicalAffiliation} onChange={(v) => set("politicalAffiliation", v)} />
      <Field label="Additional Information" value={data.additionalInformation} onChange={(v) => set("additionalInformation", v)} textarea rows={8} />
      <Field label="Boards" value={data.boards} onChange={(v) => set("boards", v)} textarea rows={4} />
      <Field label="Clubs & Affiliations" value={data.clubsAffiliations} onChange={(v) => set("clubsAffiliations", v)} textarea rows={4} />
      <Field label="Business Colleagues" value={data.businessColleagues} onChange={(v) => set("businessColleagues", v)} textarea rows={4} />

      {/* Other Giving History */}
      <SectionHeading>Other Giving History</SectionHeading>
      <p className="mt-2 text-xs italic text-[rgb(var(--ink))]/50">
        The amounts listed are representative of donations found in publicly available records and
        in donor history provided to Catapult. As such, the individual amounts will not necessarily
        total the Total Giving amount.
      </p>
      <RowTable
        headers={["Recipient", "Giving", "Year", "Amount"]}
        rows={data.otherGiving}
        onAdd={addGivingRow}
        addLabel="Add Giving Row"
        renderRow={(row: GivingRow, i) => (
          <>
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.recipient} onChange={(e) => updateGivingRow(i, { recipient: e.target.value })} placeholder="Recipient" />
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.giving} onChange={(e) => updateGivingRow(i, { giving: e.target.value })} placeholder="Giving detail" />
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.year} onChange={(e) => updateGivingRow(i, { year: e.target.value })} placeholder="Year" />
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.amount} onChange={(e) => updateGivingRow(i, { amount: e.target.value })} placeholder="Amount" />
          </>
        )}
        onRemove={removeGivingRow}
        colWidths={["40%", "30%", "12%", "18%"]}
      />

      <div className="mt-8">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
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
            <input className="w-full min-w-0 border-none bg-transparent text-sm outline-none" value={row.amount} onChange={(e) => updateFecRow(i, { amount: e.target.value })} placeholder="Amount" />
          </>
        )}
        onRemove={removeFecRow}
        colWidths={["55%", "20%", "25%"]}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label="Total Charitable Giving" value={data.totalCharitableGiving} onChange={(v) => set("totalCharitableGiving", v)} placeholder="$" />
        <Field label="Non-Philanthropic Political Giving" value={data.nonPhilanthropicPoliticalGiving} onChange={(v) => set("nonPhilanthropicPoliticalGiving", v)} placeholder="$" />
      </div>
      <Field label="Recommended Ask Amount" value={data.recommendedAskAmount} onChange={(v) => set("recommendedAskAmount", v)} />

      {/* Generate */}
      <div className="mt-12 rounded-2xl border border-[rgb(var(--line))] bg-[rgb(var(--paper))] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg text-[rgb(var(--navy))]">Generate the formatted PDF</p>
            <p className="mt-1 text-sm text-[rgb(var(--ink))]/60">
              You can keep editing anything above and click this again to regenerate&mdash;nothing
              is lost.
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
}: {
  item: RealEstateItem;
  index: number;
  onChange: (patch: Partial<RealEstateItem>) => void;
  onRemove: () => void;
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
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600/80 hover:text-red-700">
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
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
        <Field label="Address" value={item.address} onChange={(v) => onChange({ address: v })} textarea rows={2} />
        <Field label="Description" value={item.description} onChange={(v) => onChange({ description: v })} placeholder="Bedrooms, bathrooms, sq ft, details" textarea rows={2} />
        <Field label="Value" value={item.value} onChange={(v) => onChange({ value: v })} placeholder="$" />
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
}: {
  headers: string[];
  rows: T[];
  renderRow: (row: T, i: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (i: number) => void;
  addLabel: string;
  colWidths: string[];
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
