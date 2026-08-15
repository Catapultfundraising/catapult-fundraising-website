"use client";

// Foundation profile builder -- mirrors the Corporate/Individual builders'
// UX (draft autosave, Save/Generate PDF, My Profiles integration) with the
// Foundation Profile Template's field set: foundation overview, Executives,
// mission/program details, and Selected Grants given by the foundation.
// Built on the shared lib/profile-form-kit.tsx.

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
  Landmark,
  Handshake,
  Users2,
  FileText,
  Target,
  MapPin,
  Globe,
  Phone as PhoneIcon,
  Gift,
} from "lucide-react";
import {
  Field,
  SectionHeading,
  RowTable,
  STATUS_OPTIONS,
  type ProfileStatus,
  PersonCard,
  emptyPerson,
  type PersonEntry,
  compositeLogoOnWhiteSquare,
} from "@/lib/profile-form-kit";

interface GrantRow {
  year: string;
  grantee: string;
  amount: string;
}

interface FoundationProfileData {
  dateCreated: string;
  clientProfiler: string;
  projectLeadEmail: string;
  catapultId: string; // CPTID #
  ein: string; // EIN #
  clientId: string;
  photo: string; // foundation logo
  name: string; // Foundation Name
  address: string;
  phone: string;
  website: string;
  relationshipToOrg: string;
  givingHistoryToClient: string;
  executives: PersonEntry[];
  missionPurpose: string;
  history: string;
  officersDirectors: string;
  financialData: string;
  geographicFocus: string;
  fieldsOfInterest: string;
  programAreas: string;
  typesOfSupport: string;
  potentialGrantRange: string;
  limitations: string;
  dueDate: string;
  applicationInformation: string;
  selectedGrants: GrantRow[];
}

function emptyProfile(): FoundationProfileData {
  return {
    dateCreated: new Date().toISOString().slice(0, 10),
    clientProfiler: "",
    projectLeadEmail: "",
    catapultId: "",
    ein: "",
    clientId: "",
    photo: "",
    name: "",
    address: "",
    phone: "",
    website: "",
    relationshipToOrg: "",
    givingHistoryToClient: "",
    executives: [],
    missionPurpose: "",
    history: "",
    officersDirectors: "",
    financialData: "",
    geographicFocus: "",
    fieldsOfInterest: "",
    programAreas: "",
    typesOfSupport: "",
    potentialGrantRange: "",
    limitations: "",
    dueDate: "",
    applicationInformation: "",
    selectedGrants: [],
  };
}

const DRAFT_KEY_PREFIX = "catapult-foundation-profile-draft";
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

export default function FoundationProfileForm() {
  return (
    <Suspense fallback={null}>
      <FoundationProfileFormInner />
    </Suspense>
  );
}

function FoundationProfileFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");

  const [data, setData] = useState<FoundationProfileData>(emptyProfile());
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

  function set<K extends keyof FoundationProfileData>(key: K, value: FoundationProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setPdfUrl(null);
  }

  function clearDraft() {
    if (!confirm("Clear all entered information and start a new blank Foundation profile?")) return;
    localStorage.removeItem(draftKey(profileId));
    setData(emptyProfile());
    setStatus("draft");
    setProfileId(null);
    setPdfUrl(null);
    setLastSavedAt(null);
    router.replace("/research/new/foundation");
  }

  async function persistProfile(currentId: string | null): Promise<string | null> {
    try {
      const res = await fetch("/api/research-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentId, name: data.name, status, type: "foundation", data }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Failed to save profile.");
      }
      const json = await res.json();
      setProfileId(json.profile.id);
      setLastSavedAt(json.profile.updatedAt);
      router.replace(`/research/new/foundation?id=${json.profile.id}`);
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
    set("executives", [...data.executives, emptyPerson()]);
  }
  function updatePerson(i: number, patch: Partial<PersonEntry>) {
    const next = [...data.executives];
    next[i] = { ...next[i], ...patch };
    set("executives", next);
  }
  function removePerson(i: number) {
    set("executives", data.executives.filter((_, idx) => idx !== i));
  }
  function movePerson(i: number, direction: -1 | 1) {
    const next = [...data.executives];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("executives", next);
  }

  function addGrantRow() {
    set("selectedGrants", [...data.selectedGrants, { year: "", grantee: "", amount: "" }]);
  }
  function updateGrantRow(i: number, patch: Partial<GrantRow>) {
    const next = [...data.selectedGrants];
    next[i] = { ...next[i], ...patch };
    set("selectedGrants", next);
  }
  function removeGrantRow(i: number) {
    set("selectedGrants", data.selectedGrants.filter((_, idx) => idx !== i));
  }
  function moveGrantRow(i: number, direction: -1 | 1) {
    const next = [...data.selectedGrants];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("selectedGrants", next);
  }

  async function generatePdf() {
    setGenerating(true);
    setGenError(null);
    setPdfUrl(null);
    setEmailStatus(null);
    try {
      await persistProfile(profileId);
      const res = await fetch("/api/research-pdf-foundation", {
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
        await emailPdfToProjectLead(blob);
      }
    } catch (err: any) {
      setGenError(err?.message || "Something went wrong generating the PDF.");
    } finally {
      setGenerating(false);
    }
  }

  async function emailPdfToProjectLead(blob: Blob) {
    try {
      const base64 = await blobToBase64(blob);
      const res = await fetch(`/api/research-profiles/${profileId}/email-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.projectLeadEmail.trim(),
          fileName,
          profileName: data.name,
          profileType: "foundation",
          pdfBase64: base64,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        setEmailStatus({ ok: false, message: json?.error || "Could not email the PDF to the project lead." });
      } else {
        setEmailStatus({ ok: true, message: `Emailed to ${data.projectLeadEmail.trim()}.` });
      }
    } catch {
      setEmailStatus({ ok: false, message: "Could not email the PDF to the project lead." });
    }
  }

  const fileName = `${(data.name || "Foundation_Intelligence_Profile").replace(/[^a-z0-9]+/gi, "_")}.pdf`;

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
          <h1 className="mt-1 font-display text-3xl text-[rgb(var(--navy))]">Foundation Profile Builder</h1>
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
        <Field label="EIN #" value={data.ein} onChange={(v) => set("ein", v)} placeholder="XX-XXXXXXX" />
        <Field label="Client ID" value={data.clientId} onChange={(v) => set("clientId", v)} />
        <Field
          label="Project Lead Email"
          value={data.projectLeadEmail}
          onChange={(v) => set("projectLeadEmail", v)}
          placeholder="e.g., anthonya@catapultfr.com"
        />
      </div>
      <p className="mt-2 text-xs text-[rgb(var(--ink))]/45">
        When the status above is set to &ldquo;Sent for Approval&rdquo; and you click &ldquo;Generate
        PDF,&rdquo; this profile is automatically emailed to that address as an attachment.
      </p>

      <SectionHeading icon={Landmark}>Foundation Overview</SectionHeading>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[rgb(var(--brass))]/60 bg-white">
          {data.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photo} alt={data.name || "Foundation logo"} className="h-full w-full object-contain" />
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
            {data.photo ? "Replace Logo" : "Upload Foundation Logo"}
          </button>
        </div>
      </div>
      <Field label="Foundation Name" value={data.name} onChange={(v) => set("name", v)} placeholder="Foundation name" />
      <Field label="Address" value={data.address} onChange={(v) => set("address", v)} icon={MapPin} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" value={data.phone} onChange={(v) => set("phone", v)} icon={PhoneIcon} />
        <Field label="Website" value={data.website} onChange={(v) => set("website", v)} icon={Globe} />
      </div>
      <Field
        label="Relationship to Client"
        value={data.relationshipToOrg}
        onChange={(v) => set("relationshipToOrg", v)}
        placeholder="e.g., Two-time grantor to the client's youth programs"
      />
      <Field
        label="Giving History to Client"
        value={data.givingHistoryToClient}
        onChange={(v) => set("givingHistoryToClient", v)}
        textarea
        rows={2}
        richText
      />

      <SectionHeading icon={Users2}>Executives</SectionHeading>
      <div className="grid gap-4">
        {data.executives.map((person, i) => (
          <PersonCard
            key={i}
            item={person}
            index={i}
            cardLabel="Executive"
            onChange={(patch) => updatePerson(i, patch)}
            onRemove={() => removePerson(i)}
            onMove={(direction) => movePerson(i, direction)}
            canMoveUp={i > 0}
            canMoveDown={i < data.executives.length - 1}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={addPerson}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-[rgb(var(--brass))] px-4 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-[rgb(var(--paper))]"
      >
        + Add Executive
      </button>

      <SectionHeading icon={FileText}>Mission &amp; Background</SectionHeading>
      <Field label="Mission and Purpose" value={data.missionPurpose} onChange={(v) => set("missionPurpose", v)} textarea rows={3} richText />
      <Field label="History" value={data.history} onChange={(v) => set("history", v)} textarea rows={3} richText />
      <Field label="Officers and Directors" value={data.officersDirectors} onChange={(v) => set("officersDirectors", v)} textarea rows={3} richText />
      <Field label="Financial Data" value={data.financialData} onChange={(v) => set("financialData", v)} textarea rows={3} richText />

      <SectionHeading icon={Target}>Grantmaking Focus</SectionHeading>
      <Field label="Geographic Focus" value={data.geographicFocus} onChange={(v) => set("geographicFocus", v)} textarea rows={2} richText />
      <Field label="Fields of Interest" value={data.fieldsOfInterest} onChange={(v) => set("fieldsOfInterest", v)} textarea rows={2} richText />
      <Field label="Program Areas" value={data.programAreas} onChange={(v) => set("programAreas", v)} textarea rows={2} richText />
      <Field label="Types of Support" value={data.typesOfSupport} onChange={(v) => set("typesOfSupport", v)} textarea rows={2} richText />
      <Field label="Potential Grant Range" value={data.potentialGrantRange} onChange={(v) => set("potentialGrantRange", v)} />
      <Field label="Limitations" value={data.limitations} onChange={(v) => set("limitations", v)} textarea rows={2} richText />

      <SectionHeading icon={Handshake}>Application Process</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due Date" value={data.dueDate} onChange={(v) => set("dueDate", v)} />
      </div>
      <Field label="Application Information" value={data.applicationInformation} onChange={(v) => set("applicationInformation", v)} textarea rows={3} richText />

      <SectionHeading icon={Gift}>Selected Grants</SectionHeading>
      <RowTable
        headers={["YEAR", "GRANTEE / NOTE", "AMOUNT"]}
        colWidths={["15%", "55%", "30%"]}
        rows={data.selectedGrants}
        addLabel="Add Grant Row"
        onAdd={addGrantRow}
        onRemove={removeGrantRow}
        onMove={moveGrantRow}
        renderRow={(row, i) => (
          <>
            <input
              type="text"
              value={row.year}
              onChange={(e) => updateGrantRow(i, { year: e.target.value })}
              className="w-full rounded-md border border-[rgb(var(--line))] px-2 py-1 text-sm outline-none focus:border-[rgb(var(--brass))]"
            />
            <input
              type="text"
              value={row.grantee}
              onChange={(e) => updateGrantRow(i, { grantee: e.target.value })}
              className="w-full rounded-md border border-[rgb(var(--line))] px-2 py-1 text-sm outline-none focus:border-[rgb(var(--brass))]"
            />
            <input
              type="text"
              value={row.amount}
              onChange={(e) => updateGrantRow(i, { amount: e.target.value })}
              className="w-full rounded-md border border-[rgb(var(--line))] px-2 py-1 text-sm outline-none focus:border-[rgb(var(--brass))]"
            />
          </>
        )}
      />

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
