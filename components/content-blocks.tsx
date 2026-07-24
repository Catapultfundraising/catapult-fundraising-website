import { Check } from "lucide-react";

export type ContentBlock =
  | { type: "lede"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "bio"; name: string; text: string };

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        if (block.type === "lede") {
          return (
            <p
              key={i}
              className="font-display text-xl italic leading-relaxed text-[rgb(var(--navy))] sm:text-2xl"
            >
              {block.text}
            </p>
          );
        }
        if (block.type === "heading") {
          return (
            <h2
              key={i}
              className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
              {block.text}
            </p>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={i}
              className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]"
            >
              &ldquo;{block.text}&rdquo;
            </blockquote>
          );
        }
        if (block.type === "list") {
          if (block.ordered) {
            return (
              <ol
                key={i}
                className="mt-6 space-y-4 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]"
              >
                {block.items.map((item, j) => (
                  <li key={j} className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
                    {item}
                  </li>
                ))}
              </ol>
            );
          }
          return (
            <ul key={i} className="mt-6 space-y-3">
              {block.items.map((item, j) => (
                <li
                  key={j}
                  className="flex items-start gap-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70"
                >
                  <Check className="mt-1.5 h-4 w-4 shrink-0 text-[rgb(var(--brass))]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "bio") {
          return (
            <div
              key={i}
              className="mt-12 rounded-2xl border border-[rgb(var(--line))] bg-white p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                About the Author
              </p>
              <p className="mt-3 font-display text-lg text-[rgb(var(--navy))]">{block.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/70">{block.text}</p>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
