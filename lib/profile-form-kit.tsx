"use client";

// Shared building blocks for the Corporate and Foundation profile builders,
// factored out of the original Individual builder (components/research-
// profile-form.tsx) so all three share identical look, branding, and
// behavior (currency handling, rich text, photo upload/resize, add/remove/
// reorder row tables) without three divergent copies. The Individual
// builder is left as its own self-contained file -- it was already
// shipped and verified, so it isn't refactored to import this kit, to
// avoid any risk of regressing it. Any future fix made here should be
// mirrored there if it applies (and vice versa).

import { useRef, type ReactNode } from "react";
import {
  Bold,
  Underline,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { parseFormattedText } from "@/lib/rich-text";

export type ProfileStatus = "draft" | "sent_for_approval" | "approved";

export const STATUS_OPTIONS: Array<{ value: ProfileStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "sent_for_approval", label: "Sent for Approval" },
  { value: "approved", label: "Approved" },
];

export const PHONE_TYPE_OPTIONS = ["Mobile", "Main", "Direct", "Fax", "Other"];
export const EMAIL_TYPE_OPTIONS = ["Main", "Direct", "Other"];

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function buildProfilePdfFileName(
  clientProfiler: string | undefined,
  name: string | undefined,
  dateCreated: string | undefined,
  fallback: string
): string {
  // File names are "{Client Name / Profiler Initials} {Prospect/Corporate/
  // Foundation Name} {Date Created}.pdf" -- space separated, no underscores.
  // Forbidden filesystem characters (from any of these free-text fields,
  // e.g. a "/" typed into Client Name/Profiler Initials like "SCFTA/JG")
  // are replaced with a hyphen rather than stripped or underscored, so the
  // fields stay visually intact instead of colliding into one run of words.
  const sanitize = (s?: string) =>
    (s || "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  const parts = [sanitize(clientProfiler), sanitize(name), sanitize(dateCreated)].filter(Boolean);
  return parts.length > 0 ? `${parts.join(" ")}.pdf` : `${fallback}.pdf`;
}

export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Never rounds the entered value -- only adds thousands separators, and
// only shows cents if the profiler actually typed a fractional amount.
// (Matches the fix applied to the Individual builder's formatCurrency.)
export function formatCurrency(n: number): string {
  if (!n) return "";
  const hasCents = Math.abs(n % 1) > 1e-9;
  return `$${n.toLocaleString("en-US", hasCents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })}`;
}

// Allows freehand, non-currency entries (e.g. "$10M+", "TBD", "N/A") to pass
// through untouched instead of being stripped down to a bare number.
export function smartFormatCurrency(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;
  const formatted = formatCurrency(parseCurrencyToNumber(trimmed));
  return formatted || trimmed;
}

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const len = digits.length;
  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function resizeImageToDataUri(file: File, maxDim = 1000, quality = 0.82): Promise<string> {
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

// Composites an uploaded company/foundation logo onto a fixed-size white
// square with padding, baking in the "clean white box" look at upload time
// rather than leaving it to the PDF renderer's objectFit behavior -- source
// logos vary wildly (wide wordmarks, tall marks, transparent PNGs, logos
// with dark/colored backgrounds of their own) and react-pdf's Image doesn't
// reliably letterbox/center a non-square source into a square box, which is
// what was causing logos to appear stretched, cropped, or oddly placed
// against the navy hero band. Every logo now renders as the exact same
// size, centered and fully visible on a true white background, so a dark
// navy header never clashes with a logo that has its own dark background.
export async function compositeLogoOnWhiteSquare(file: File, size = 480, paddingRatio = 0.12): Promise<string> {
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
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);
  const pad = size * paddingRatio;
  const maxDim = size - pad * 2;
  // Standard "contain" fit against the padded box -- always scales the
  // logo to use the available space (up or down) rather than only ever
  // shrinking, so small source logos don't end up tiny and lost in a sea
  // of white padding.
  const scale = Math.min(maxDim / img.width, maxDim / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (size - drawW) / 2;
  const y = (size - drawH) / 2;
  ctx.drawImage(img, x, y, drawW, drawH);
  return canvas.toDataURL("image/png");
}

export function SectionHeading({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <h2 className="mt-10 flex items-center gap-2 border-b border-[rgb(var(--line))] pb-2 font-display text-2xl text-[rgb(var(--navy))]">
      {Icon && <Icon className="h-5 w-5 text-[rgb(var(--brass))]" />}
      {children}
    </h2>
  );
}

export function FormattedPreview({ value }: { value: string }) {
  const segments = parseFormattedText(value);
  return (
    <p className="whitespace-pre-wrap">
      {segments.map((seg, i) => {
        let node: ReactNode = seg.text;
        if (seg.bold) node = <strong key={i}>{node}</strong>;
        if (seg.underline) node = <u key={i}>{node}</u>;
        return <span key={i}>{node}</span>;
      })}
    </p>
  );
}

export function Field({
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

export function SelectField({
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

export function ComputedField({
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
        {value || <span className="text-[rgb(var(--ink))]/30">&mdash;</span>}
      </div>
    </div>
  );
}

// Generic add/remove/reorder row table -- identical to the one used in the
// Individual builder.
export function RowTable<T>({
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
  renderRow: (row: T, i: number) => ReactNode;
  onAdd: () => void;
  onRemove: (i: number) => void;
  addLabel: string;
  colWidths: string[];
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
            {(renderRow(row, i) as any).props.children.map((child: ReactNode, ci: number) => (
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

export interface PersonEntry {
  photo: string; // base64 data URI
  name: string;
  title: string;
  contactInfo: string;
  bio: string;
}

export function emptyPerson(): PersonEntry {
  return { photo: "", name: "", title: "", contactInfo: "", bio: "" };
}

// Repeatable "Key Person" card -- one photo + name/title/contact/bio, with
// add/remove/reorder. Used by both the Corporate builder ("Key People")
// and the Foundation builder ("Executives"); only the section label and
// button copy differ, so callers pass those in as props.
export function PersonCard({
  item,
  index,
  cardLabel,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  item: PersonEntry;
  index: number;
  cardLabel: string;
  onChange: (patch: Partial<PersonEntry>) => void;
  onRemove: () => void;
  onMove?: (direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    const uri = await resizeImageToDataUri(file, 900, 0.85);
    onChange({ photo: uri });
  }

  return (
    <div className="rounded-2xl border border-[rgb(var(--line))] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[rgb(var(--navy))]">
          {cardLabel} {index + 1}
        </p>
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
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[rgb(var(--brass))]/60 bg-[rgb(var(--paper))]">
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photo} alt={item.name || cardLabel} className="h-full w-full object-cover" />
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
        <Field label="Name" value={item.name} onChange={(v) => onChange({ name: v })} placeholder="Full name" />
        <Field label="Title" value={item.title} onChange={(v) => onChange({ title: v })} placeholder="Job title" />
      </div>
      <Field label="Contact Info" value={item.contactInfo} onChange={(v) => onChange({ contactInfo: v })} placeholder="Phone, email" />
      <Field label="Bio" value={item.bio} onChange={(v) => onChange({ bio: v })} textarea rows={3} richText />
    </div>
  );
}
