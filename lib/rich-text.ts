// Lightweight, shared bold/underline formatting for free-form fields across
// the Prospect Intelligence Profile portal. Staff never see or type raw
// markup manually -- the Bold/Underline toolbar buttons in the form wrap the
// selected text with these markers automatically. This same parser is used
// both for the live on-screen preview (research-profile-form.tsx) and for
// the generated PDF (app/api/research-pdf/route.tsx), so formatting always
// matches between what a profiler sees and what ships to the client.
//
// Deliberately NOT full markdown/HTML: react-pdf has no HTML renderer, so
// supporting arbitrary rich text would require a much heavier parser on
// both ends. Two non-nesting markers cover the actual need (distinguishing
// spouse names, emphasizing key details) without that complexity.
//   **text**  -> bold
//   __text__  -> underline

export interface FormatSegment {
  text: string;
  bold?: boolean;
  underline?: boolean;
}

const TOKEN_RE = /\*\*(.+?)\*\*|__(.+?)__/g;

export function parseFormattedText(input: string): FormatSegment[] {
  if (!input) return [];
  const segments: FormatSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(input))) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], underline: true });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex) });
  }
  return segments;
}
