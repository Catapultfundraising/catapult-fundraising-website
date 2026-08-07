"use client";

import { useState } from "react";
import { Linkedin, X as XIcon, Facebook, Mail, Link2, Check } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

interface ShareButtonsProps {
  /** Either a full URL or a site-relative path like "/blog/my-post" */
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);

  const links: Array<{ label: string; icon: typeof Linkedin; href: string }> = [
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "X",
      icon: XIcon,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (unsupported browser/context) — fail silently,
      // the other share options still work.
    }
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-[rgb(var(--line))] pb-6">
      <span className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">
        Share
      </span>
      {links.map(({ label, icon: Icon, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${label}`}
          title={`Share on ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--line))] text-[rgb(var(--navy))] transition-colors hover:border-[rgb(var(--brass))] hover:bg-[rgb(var(--brass))]/10"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy link"
        title="Copy link"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--line))] text-[rgb(var(--navy))] transition-colors hover:border-[rgb(var(--brass))] hover:bg-[rgb(var(--brass))]/10"
      >
        {copied ? <Check className="h-4 w-4 text-[rgb(var(--brass))]" /> : <Link2 className="h-4 w-4" />}
      </button>
      {copied && <span className="text-sm text-[rgb(var(--brass))]">Link copied!</span>}
    </div>
  );
}
