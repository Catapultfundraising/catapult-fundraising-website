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
}: {
  logo: NonNullable<Testimonial["logo"]>;
  maxH?: number;
  maxW?: number;
  className?: string;
}) {
  const ratio = logo.width / logo.height;
  let h = maxH;
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
      unoptimized={logo.src.endsWith(".svg")}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: Math.round(w), height: Math.round(h) }}
    />
  );
}
