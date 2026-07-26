"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, CheckCircle, AlertCircle, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";

const CTA_BUTTON_CLASS =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-6 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))]";

const SUPPORT_EMAIL = "recruiter@catapultfr.com";

export function JobApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [message, setMessage] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("position", position);
      formData.append("linkedin", linkedin);
      formData.append("message", message);
      if (resume) formData.append("resume", resume);

      const res = await fetch("/api/apply", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Request failed");
      }

      setSubmitted(true);
    } catch {
      setErrorMessage(
        `Something went wrong submitting your application. Please try again, or email your resume directly to ${SUPPORT_EMAIL}.`
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
          Thanks for applying.
        </h3>
        <p className="max-w-sm text-sm text-[rgb(var(--ink))]/65">
          Our team reviews every application personally. If you don't hear back
          and want to follow up, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[rgb(var(--navy))] underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <Button onClick={() => setSubmitted(false)} className={CTA_BUTTON_CLASS}>
          Submit another application
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

      <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Your information</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@email.com"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
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
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn or portfolio (optional)</Label>
            <Input
              id="linkedin"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="linkedin.com/in/janesmith"
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">The role</h2>
        <div className="space-y-2">
          <Label htmlFor="position">Position you're applying for</Label>
          <Input
            id="position"
            required
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Engagement Officer, Marketing Coordinator, General Application..."
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Tell us about yourself</Label>
          <Textarea
            id="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Relevant experience, why you're interested in Catapult, availability..."
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:p-10">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Resume</h2>
        <div className="space-y-2">
          <Label htmlFor="resume" className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-[rgb(var(--brass))]" />
            Upload your resume (PDF, DOC, or DOCX, up to 8MB)
          </Label>
          <Input
            id="resume"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setResume(e.target.files?.[0] ?? null)}
            className={cn(
              FIELD_CLASS,
              "h-auto min-h-[3.5rem] items-center py-3 leading-normal file:mr-4 file:rounded-full file:border-0 file:bg-[rgb(var(--brass))] file:px-4 file:py-2 file:text-sm file:font-semibold file:leading-normal file:text-[rgb(var(--navy-deep))] file:transition hover:file:bg-[rgb(var(--brass-light))]"
            )}
          />
          {resume && (
            <p className="text-sm text-[rgb(var(--ink))]/60">Selected: {resume.name}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className={cn(CTA_BUTTON_CLASS, "w-full sm:w-auto")}
      >
        {submitting ? "Submitting..." : "Submit application"}
        <Send className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Button>
    </form>
  );
}
