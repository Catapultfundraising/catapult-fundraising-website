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
import { Send, CheckCircle } from "lucide-react";
import { LEAD_EMAILS, SERVICE_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SERVICE_OPTIONS = [...SERVICE_LINKS.map((s) => s.label), "Not sure yet"];

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

const CTA_BUTTON_CLASS =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))]";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, title, org, email, phone, service, message }),
      });

      if (!res.ok) throw new Error("Request failed");

      setSubmitted(true);
    } catch {
      const subject = encodeURIComponent(`New inquiry from ${name}${org ? ` (${org})` : ""}`);
      const body = encodeURIComponent(
        `Name: ${name}\nTitle: ${title}\nOrganization: ${org}\nEmail: ${email}\nPhone: ${phone}\nService interested in: ${service}\n\nMessage:\n${message}`
      );
      window.location.href = `mailto:${LEAD_EMAILS.join(",")}?subject=${subject}&body=${body}`;
      setSubmitted(true);
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
          <a href={`mailto:${LEAD_EMAILS[0]}`} className="font-semibold text-[rgb(var(--navy))] underline">
            {LEAD_EMAILS[0]}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
