"use client";

// Corporate profile builder -- mirrors the Individual builder's UX
// (draft autosave, Save/Generate PDF, My Profiles integration) but with the
// much shorter Corporate Profile Template field set: company overview,
// giving history to the client, financials, Key People, and the optional
// Company Foundation sub-block. Built on the shared lib/profile-form-kit.tsx
// so it matches Individual's branding without duplicating that code.

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  RotateCcw,
  Save,
  ArrowLeft,
  Download,
  Trash2,
  Building2,
  DollarSign,
  Landmark,
  Handshake,
  Users2,
  FileText,
  Target,
  MapPin,
  Globe,
  Phone as PhoneIcon,
} from "lucide-react";
import {
  Field,
  SectionHeading,
  STATUS_OPTIONS,
  type ProfileStatus,
  PersonCard,
  emptyPerson,
  type PersonEntry,
  compositeLogoOnWhiteSquare,
} from "@/lib/profile-form-kit";

interface CorporateProfileData {
  dateCreated: string;
  clientProfiler: string;
  projectLeadEmail: string;
  catapultId: string;
  clientId: string;
  photo: string; // company logo
  name: string; // Company Name
  address: string;
  phone: string;
  website: string;
  relationshipToOrg: string;
  firstGiftAmount: string;
  lastGiftAmount: string;
  largestGiftAmount: string;
  revenueYear: string;
  revenueAmount: string;
  companyHeritage: string;
  keyInformation: string;
  productsOperations: string;
  values: string;
  keyPeople: PersonEntry[];
  corporateGiving: string;
  foundationName: string;
  foundationAddress: string;
  foundationPhone: string;
  foundationEmail: string;
  foundationWebsite: string;
  foundationNetAssetsYear: string;
  foundationNetAssetsAmount: string;
  companyAffiliations: string;
  relevantFindings: string;
}

function emptyProfile(): CorporateProfileData {
  return {
    dateCreated: new Date().toISOString().slice(0, 10),
    clientProfiler: "",
    projectLeadEmail: "",
    catapultId: "",
    clientId: "",
    photo: "",
    name: "",
    address: "",
    phone: "",
    website: "",
    relationshipToOrg: "",
    firstGiftAmount: "",
    lastGiftAmount: "",
    largestGiftAmount: "",
    revenueYear: "",
    revenueAmount: "",
    companyHeritage: "",
    keyInformation: "",
    productsOperations: "",
    values: "",
    keyPeople: [],
    corporateGiving: "",
    foundationName: "",
    foundationAddress: "",
    foundationPhone: "",
    foundationEmail: "",
    foundationWebsite: "",
    foundationNetAssetsYear: "",
    foundationNetAssetsAmount: "",
    companyAffiliations: "",
    relevantFindings: "",
  };
}

const DRAFT_KEY_PREFIX = "catapult-corporate-profile-draft";
const draftKey = (id: string | null) => `${DRAFT_KEY_PREFIX}:${id || "unsaved"}`;

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

export default function CorporateProfileForm() {
  return (
    <Suspense fallback={null}>
      <CorporateProfileFormInner />
    </Suspense>
  );
}

function CorporateProfileFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");

  const [data, setData] = useState<CorporateProfileData>(emptyProfile());
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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);
  const skipReloadIdRef = useRef<string | null>(null);

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
            setData({ ...emptyProfile(), ...JSON.parse(raw) });
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

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(draftKey(profileId), JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data, profileId]);

  function set<K extends keyof CorporateProfileData>(key: K, value: CorporateProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setPdfUrl(null);
  }

  function clearDraft() {
    if (!confirm("Clear all entered information and start a new blank Corporate profile?")) return;
    localStorage.removeItem(draftKey(profileId));
    setData(emptyProfile());
    setStatus("draft");
    setProfileId(null);
    setPdfUrl(null);
    setLastSavedAt(null);
    router.replace("/research/new/corporate");
  }

  async function persistProfile(currentId: string | null): Promise<string | null> {
    try {
      const res = await fetch("/api/research-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentId, name: data.name, status, type: "corporate", data }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Failed to save profile.");
      }
      const json = await res.json();
      skipReloadIdRef.current = json.profile.id;
      setProfileId(json.profile.id);
      setLastSavedAt(json.profile.updatedAt);
      router.replace(`/research/new/corporate?id=${json.profile.id}`);
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

  async function handleLogoUpload(file: File) {
    const uri = await compositeLogoOnWhiteSquare(file);
    set("photo", uri);
  }

  function addPerson() {
    set("keyPeople", [...data.keyPeople, emptyPerson()]);
  }
  function updatePerson(i: number, patch: Partial<PersonEntry>) {
    const next = [...data.keyPeople];
    next[i] = { ...next[i], ...patch };
    set("keyPeople", next);
  }
  function removePerson(i: number) {
    set("keyPeople", data.keyPeople.filter((_, idx) => idx !== i));
  }
  function movePerson(i: number, direction: -1 | 1) {
    const next = [...data.keyPeople];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("keyPeople", next);
  }

  async function generatePdf() {
    setGenerating(true);
    setGenError(null);
    setPdfUrl(null);
    setEmailStatus(null);
    try {
      const resolvedProfileId = await persistProfile(profileId);
      const res = await fetch("/api/research-pdf-corporate", {
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
          profileType: "corporate",
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

  const fileName = `${(data.name || "Corporate_Intelligence_Profile").replace(/[^a-z0-9]+/gi, "_")}.pdf`;

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
          <h1 className="mt-1 font-display text-3xl text-[rgb(var(--navy))]">Corporate Profile Builder</h1>
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

      {loadingProfile && <p className="mt-4 text-sm text-[rgb(var(--ink))]/50">Loading profile...</p>}
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

      <SectionHeading>Profile Header</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date Created" value={data.dateCreated} onChange={(v) => set("dateCreated", v)} />
        <Field
          label="Client Name / Profiler Initials"
          value={data.clientProfiler}
          onChange={(v) => set("clientProfiler", v)}
          placeholder="e.g., SCFTA/JG"
        />
        <Field label="Catapult ID (CPTID)" value={data.catapultId} onChange={(v) => set("catapultId", v)} />
        <Field label="Client ID" value={data.clientId} onChange={(v) => set("clientId", v)} />
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

      <SectionHeading icon={Building2}>Company Overview</SectionHeading>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[rgb(var(--brass))]/60 bg-white">
          {data.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photo} alt={data.name || "Company logo"} className="h-full w-full object-contain" />
          ) : (
            <span className="px-2 text-center text-[10px] text-[rgb(var(--ink))]/40">No logo</span>
          )}
        </div>
        <div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="rounded-full border border-[rgb(var(--line))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:border-[rgb(var(--brass))]"
          >
            {data.photo ? "Replace Logo" : "Upload Company Logo"}
          </button>
        </div>
      </div>
      <Field label="Company Name" value={data.name} onChange={(v) => set("name", v)} placeholder="Company name" />
      <Field label="Address" value={data.address} onChange={(v) => set("address", v)} icon={MapPin} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" value={data.phone} onChange={(v) => set("phone", v)} icon={PhoneIcon} />
        <Field label="Website" value={data.website} onChange={(v) => set("website", v)} icon={Globe} />
      </div>
      <Field
        label="Relationship to Client"
        value={data.relationshipToOrg}
        onChange={(v) => set("relationshipToOrg", v)}
        placeholder="e.g., Board member's employer, longtime sponsor"
      />

      <SectionHeading icon={Handshake}>Giving History to Client</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="First Gift Amount" value={data.firstGiftAmount} onChange={(v) => set("firstGiftAmount", v)} money />
        <Field label="Last Gift Amount" value={data.lastGiftAmount} onChange={(v) => set("lastGiftAmount", v)} money />
        <Field label="Largest Gift Amount" value={data.largestGiftAmount} onChange={(v) => set("largestGiftAmount", v)} money />
      </div>

      <SectionHeading icon={DollarSign}>Company Financials</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Revenue Year" value={data.revenueYear} onChange={(v) => set("revenueYear", v)} placeholder="e.g., 2025" />
        <Field label="Revenue Amount" value={data.revenueAmount} onChange={(v) => set("revenueAmount", v)} money />
      </div>

      <SectionHeading icon={FileText}>Company Background</SectionHeading>
      <Field label="Company Heritage" value={data.companyHeritage} onChange={(v) => set("companyHeritage", v)} textarea rows={3} richText />
      <Field label="Key Information" value={data.keyInformation} onChange={(v) => set("keyInformation", v)} textarea rows={3} richText />
      <Field label="Products and Operations" value={data.productsOperations} onChange={(v) => set("productsOperations", v)} textarea rows={3} richText />
      <Field label="Values" value={data.values} onChange={(v) => set("values", v)} textarea rows={3} richText />

      <SectionHeading icon={Users2}>Key People</SectionHeading>
      <div className="grid gap-4">
        {data.keyPeople.map((person, i) => (
          <PersonCard
            key={i}
            item={person}
            index={i}
            cardLabel="Key Person"
            onChange={(patch) => updatePerson(i, patch)}
            onRemove={() => removePerson(i)}
            onMove={(direction) => movePerson(i, direction)}
            canMoveUp={i > 0}
            canMoveDown={i < data.keyPeople.length - 1}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={addPerson}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-[rgb(var(--brass))] px-4 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-[rgb(var(--paper))]"
      >
        + Add Key Person
      </button>

      <SectionHeading icon={Handshake}>Corporate Giving</SectionHeading>
      <Field label="Corporate Giving" value={data.corporateGiving} onChange={(v) => set("corporateGiving", v)} textarea rows={3} richText />

      <SectionHeading icon={Landmark}>Company Foundation</SectionHeading>
      <Field label="Foundation Name" value={data.foundationName} onChange={(v) => set("foundationName", v)} />
      <Field label="Address" value={data.foundationAddress} onChange={(v) => set("foundationAddress", v)} icon={MapPin} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" value={data.foundationPhone} onChange={(v) => set("foundationPhone", v)} icon={PhoneIcon} />
        <Field label="Email" value={data.foundationEmail} onChange={(v) => set("foundationEmail", v)} />
      </div>
      <Field label="Website" value={data.foundationWebsite} onChange={(v) => set("foundationWebsite", v)} icon={Globe} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Net Assets Year" value={data.foundationNetAssetsYear} onChange={(v) => set("foundationNetAssetsYear", v)} placeholder="e.g., 2025" />
        <Field label="Net Assets Amount" value={data.foundationNetAssetsAmount} onChange={(v) => set("foundationNetAssetsAmount", v)} money />
      </div>

      <SectionHeading icon={Target}>Company Affiliations &amp; Findings</SectionHeading>
      <Field label="Company Affiliations" value={data.companyAffiliations} onChange={(v) => set("companyAffiliations", v)} textarea rows={3} richText />
      <Field label="Relevant Findings" value={data.relevantFindings} onChange={(v) => set("relevantFindings", v)} textarea rows={3} richText />

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
