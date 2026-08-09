"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { FIRM_EMAIL, SERVICE_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SERVICE_OPTIONS = [...SERVICE_LINKS.map((s) => s.label), "Not sure yet"];

/**
 * Formats digits as a US phone number as the user types, e.g. "7025550100"
 * -> "(702) 555-0100". Falls back to the raw digits (still with a leading
 * "+" preserved) for longer/international numbers rather than mangling them.
 */
function formatPhoneNumber(value: string): string {
  const hasLeadingPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "").slice(0, 15);
  if (hasLeadingPlus && digits.length > 10) {
    return `+${digits}`;
  }
  const tenDigit = digits.slice(-10);
  const areaCode = tenDigit.slice(0, 3);
  const prefix = tenDigit.slice(3, 6);
  const line = tenDigit.slice(6, 10);

  if (tenDigit.length <= 3) return areaCode;
  if (tenDigit.length <= 6) return `(${areaCode}) ${prefix}`;
  return `(${areaCode}) ${prefix}-${line}`;
}

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

const CTA_BUTTON_CLASS =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))]";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");

  // Anti-spam: a hidden field real visitors never see or fill in (bots that
  // auto-fill every input on the page do), plus a timestamp captured when
  // the form first rendered so we can reject submissions that arrive faster
  // than a person could actually read and fill out the form.
  const [company, setCompany] = useState("");
  const [formStartedAt] = useState(() => Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          org,
          email,
          phone,
          service,
          message,
          company,
          startedAt: formStartedAt,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Request failed");
      }

      setSubmitted(true);
    } catch {
      setErrorMessage(
        `Something went wrong sending your message. Please try again, or email us directly at ${FIRM_EMAIL}.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[rgb(var(--line))] bg-[#b28c46]/10 p-12 text-center">
        <CheckCircle className="h-10 w-10 text-[rgb(var(--brass))]" />
        <h3 className="font-display text-2xl text-[rgb(var(--navy))]">
          Thanks for reaching out.
        </h3>
        <p className="max-w-sm text-sm text-[rgb(var(--ink))]/65">
          We respond to every inquiry within one business day. If you need to reach us sooner, email{" "}
          <a href={`mailto:${FIRM_EMAIL}`} className="font-semibold text-[rgb(var(--navy))] underline">
            {FIRM_EMAIL}
          </a>
          .
        </p>
        <Button onClick={() => setSubmitted(false)} className={CTA_BUTTON_CLASS}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/*
        Honeypot field. Hidden from sighted and screen-reader users
        (aria-hidden + off-screen positioning + not focusable), so only an
        automated script filling in every input on the page will ever
        populate it. Name it something a scraper would find plausible.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <Label htmlFor="company">Company website</Label>
        <Input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Your information</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              placeholder="Executive Director"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org">Organization</Label>
            <Input
              id="org"
              required
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="Your nonprofit"
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              pattern="[\d\s()+.\-]{7,20}"
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="(702) 555-0100"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
      </div>

      <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Your goal</h2>
        <div className="space-y-2">
          <Label htmlFor="service">What services are you interested in?</Label>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger id="service" className={FIELD_CLASS}>
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Tell us about your goal and timeline</Label>
          <Textarea
            id="message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Campaign goal, timeline, board readiness, prior campaign history..."
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className={cn(CTA_BUTTON_CLASS, "w-full sm:w-auto")}
      >
        {submitting ? "Submitting..." : "Submit"}
        <Send className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Button>
    </form>
  );
}
