// Formats any messy phone number string (with or without a leading "+1"
// US country code, punctuation, spaces, or an Excel-style forced-text
// leading apostrophe like DonorAtlas exports sometimes carry) into the
// standard (xxx) xxx-xxxx display format used throughout the Prospect
// Intelligence Profile. An 11-digit number starting with "1" has that
// country-code digit dropped BEFORE slicing to 10 digits -- previously
// (client-only version of this helper) the country code was left in place
// and just sliced to the first 10 digits, which silently dropped the real
// last digit of the number and produced a wrong area code.
export function formatPhoneNumber(value: string | undefined | null): string {
  let digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  const len = digits.length;
  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
