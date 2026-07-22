"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIER_CONFIGS,
  defaultTierLabels,
  emptyAllTierData,
  type TierRow,
  type TierData,
} from "@/lib/prospect-assessment";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

const HEADER_FIELD_CLASS =
  "border-0 border-b border-[rgb(var(--brass))]/50 bg-transparent px-0 text-[25px] font-display text-[rgb(var(--paper))] placeholder:text-[rgb(var(--paper))]/40 rounded-none focus-visible:ring-0 focus-visible:border-[rgb(var(--brass))]";

const CTA_BUTTON_CLASS =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))]";

function TierTable({
  index,
  rangeValue,
  rangePlaceholder,
  onRangeChange,
  rows,
  data,
  onChange,
}: {
  index: number;
  rangeValue: string;
  rangePlaceholder: string;
  onRangeChange: (value: string) => void;
  rows: TierRow[];
  data: TierData;
  onChange: (key: string, field: "count" | "avgGift", value: string) => void;
}) {
  const totalCount = rows.reduce((sum, row) => {
    const value = Number(data[row.key]?.count || 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--line))]">
      <div className="bg-[rgb(var(--navy))] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--paper))]/50">
          Donor Tier {index + 1} — enter your dollar range
        </p>
        <Input
          value={rangeValue}
          onChange={(e) => onRangeChange(e.target.value)}
          placeholder={rangePlaceholder}
          className={HEADER_FIELD_CLASS}
        />
        <p className="mt-2 text-sm text-[rgb(var(--paper))]/70">All Individual Records Activity</p>
      </div>
      <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 border-b border-[rgb(var(--line))] bg-[rgb(var(--paper))] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50 sm:grid">
        <span>Constituent</span>
        <span>Year of Last Gift</span>
        <span>Record Count</span>
        <span>Average Gift</span>
      </div>
      <div className="divide-y divide-[rgb(var(--line))] bg-white">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr_1fr] sm:items-center sm:gap-2"
          >
            <div className="col-span-2 sm:col-span-1">
              <p className="font-semibold text-[rgb(var(--navy))]">{row.constituent}</p>
              <p className="text-xs text-[rgb(var(--ink))]/50 sm:hidden">{row.year}</p>
            </div>
            <p className="hidden text-sm text-[rgb(var(--ink))]/70 sm:block">{row.year}</p>
            <div className="space-y-1">
              <Label className="text-xs font-normal text-[rgb(var(--ink))]/50 sm:hidden">Record Count</Label>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                value={data[row.key]?.count ?? ""}
                onChange={(e) => onChange(row.key, "count", e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-normal text-[rgb(var(--ink))]/50 sm:hidden">Average Gift</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="$0.00"
                value={data[row.key]?.avgGift ?? ""}
                onChange={(e) => onChange(row.key, "avgGift", e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 bg-[rgb(var(--paper))] px-5 py-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr] sm:items-center sm:gap-2">
          <p className="col-span-2 font-display text-lg text-[rgb(var(--navy))] sm:col-span-2">Total</p>
          <p className="font-semibold text-[rgb(var(--navy))]">{totalCount}</p>
          <p className="text-sm text-[rgb(var(--ink))]/40">Calculated automatically</p>
        </div>
      </div>
    </div>
  );
}

export function ProspectAssessmentForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [caseForSupport, setCaseForSupport] = useState("");
  const [solicitationHistory, setSolicitationHistory] = useState("");
  const [tierLabels, setTierLabels] = useState<Record<string, string>>(() => defaultTierLabels());
  const [tiersData, setTiersData] = useState<Record<string, TierData>>(() => emptyAllTierData());

  const updateTierLabel = (tierId: string) => (value: string) => {
    setTierLabels((prev) => ({ ...prev, [tierId]: value }));
  };

  const updateTierData =
    (tierId: string) => (key: string, field: "count" | "avgGift", value: string) => {
      setTiersData((prev) => ({
        ...prev,
        [tierId]: {
          ...prev[tierId],
          [key]: { ...prev[tierId]?.[key], [field]: value },
        },
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      orgName,
      contactName,
      title,
      email,
      phone,
      fiscalYear,
      caseForSupport,
      solicitationHistory,
      tierLabels,
      tiersData,
    };

    try {
      const res = await fetch("/api/prospect-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Request failed");

      setSubmitted(true);
    } catch {
      setError("Something went wrong sending your information. Please try submitting again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[rgb(var(--line))] bg-[#b28c46]/10 p-12 text-center">
        <CheckCircle className="h-10 w-10 text-[rgb(var(--brass))]" />
        <h3 className="font-display text-2xl text-[rgb(var(--navy))]">Thank you.</h3>
        <p className="max-w-sm text-sm text-[rgb(var(--ink))]/65">
          Your information has been sent to our team. We will review it and follow up with you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Organization &amp; contact information</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization name</Label>
            <Input
              id="orgName"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your nonprofit"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jane Smith"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Executive Director"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telephone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(702) 555-0100"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@nonprofit.org"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fiscalYear">What is your fiscal year?</Label>
            <Input
              id="fiscalYear"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              placeholder="e.g. July 1 - June 30, or FY26"
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Case for support</h2>
        <div className="space-y-2">
          <Label htmlFor="caseForSupport">Give us a brief description of your case for support</Label>
          <Textarea
            id="caseForSupport"
            rows={5}
            value={caseForSupport}
            onChange={(e) => setCaseForSupport(e.target.value)}
            placeholder="What need are you raising funds for, and why does it matter now?"
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="solicitationHistory">How have your prospects been solicited in the past?</Label>
          <Textarea
            id="solicitationHistory"
            rows={5}
            value={solicitationHistory}
            onChange={(e) => setSolicitationHistory(e.target.value)}
            placeholder="Direct mail, events, one-on-one asks, phone outreach, digital campaigns..."
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Donor giving data</h2>
          <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--ink))]/65">
            Enter your own dollar range for each donor tier below, along with the record count and average gift for
            each donor segment, mirroring your database export. Six tiers are provided so you can break the data
            down as far as you'd like, leave any tier or row blank if it doesn't apply.
          </p>
        </div>
        {TIER_CONFIGS.map((tier, index) => (
          <TierTable
            key={tier.id}
            index={index}
            rangeValue={tierLabels[tier.id] ?? ""}
            rangePlaceholder={tier.placeholder}
            onRangeChange={updateTierLabel(tier.id)}
            rows={tier.rows}
            data={tiersData[tier.id] ?? {}}
            onChange={updateTierData(tier.id)}
          />
        ))}
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Button type="submit" size="lg" disabled={submitting} className={cn(CTA_BUTTON_CLASS, "w-full sm:w-auto")}>
        {submitting ? "Submitting..." : "Submit"}
        <Send className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Button>
    </form>
  );
}
