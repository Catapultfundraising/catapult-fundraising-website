import Image from "next/image";
import type { Testimonial } from "@/lib/testimonials";

// Full-color client logo shown in the top-right corner of a testimonial.
// Logos are the clients' own official marks, pulled from their websites and
// kept in their original colors (some clients are particular about branding).
// `maxH`/`maxW` bound the logo box so wide wordmarks and tall marks both look
// balanced next to each other.
export function ClientLogo({
  logo,
  maxH = 44,
  maxW = 130,
  className = "",
  eager = false,
}: {
  logo: NonNullable<Testimonial["logo"]>;
  maxH?: number;
  maxW?: number;
  className?: string;
  /** Load immediately instead of lazily. The homepage marquee needs this: its
   * duplicated second loop moves in via CSS transform, which browsers' lazy
   * loading doesn't reliably detect, so those logos showed up blank. */
  eager?: boolean;
}) {
  const ratio = logo.width / logo.height;
  // Tall, stacked marks (e.g. RMHC's house) look tiny at the same height as a
  // wide wordmark, so they can opt into a larger height via `logo.scale`.
  let h = maxH * (logo.scale ?? 1);
  let w = h * ratio;
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  return (
    <Image
      src={logo.src}
      alt={`${logo.alt} logo`}
      width={Math.round(w)}
      height={Math.round(h)}
      loading={eager ? "eager" : "lazy"}
      unoptimized={logo.src.endsWith(".svg")}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: Math.round(w), height: Math.round(h) }}
    />
  );
}
