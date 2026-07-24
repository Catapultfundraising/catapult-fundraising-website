interface Swatch {
  name: string;
  hex: string;
  rgb: string;
  cssVar: string;
  usage: string;
  swatchClass: string;
  textClass: string;
  border?: boolean;
}

const SWATCHES: Swatch[] = [
  {
    name: "Navy",
    hex: "#15212E",
    rgb: "21, 33, 46",
    cssVar: "--navy",
    usage: "Primary brand color. Headlines, the site header/footer, buttons, and body copy.",
    swatchClass: "bg-[rgb(var(--navy))]",
    textClass: "text-[rgb(var(--paper))]",
  },
  {
    name: "Navy Deep",
    hex: "#0C131C",
    rgb: "12, 19, 28",
    cssVar: "--navy-deep",
    usage: "Hover states and shadows for navy elements — buttons and links darken to this on hover.",
    swatchClass: "bg-[rgb(var(--navy-deep))]",
    textClass: "text-[rgb(var(--paper))]",
  },
  {
    name: "Paper",
    hex: "#FAF7F0",
    rgb: "250, 247, 240",
    cssVar: "--paper",
    usage: "The site's background color — a warm cream, never pure white. Also used for reversed text on navy.",
    swatchClass: "bg-[rgb(var(--paper))]",
    textClass: "text-[rgb(var(--navy))]",
    border: true,
  },
  {
    name: "Brass",
    hex: "#B28C46",
    rgb: "178, 140, 70",
    cssVar: "--brass",
    usage: "The gold accent. Eyebrow labels, icons, dividers, links, and highlighted stats.",
    swatchClass: "bg-[rgb(var(--brass))]",
    textClass: "text-[rgb(var(--navy))]",
  },
  {
    name: "Brass Light",
    hex: "#CDAA6E",
    rgb: "205, 170, 110",
    cssVar: "--brass-light",
    usage: "A lighter gold for text and labels shown on dark navy backgrounds (footer headings, dark sections).",
    swatchClass: "bg-[rgb(var(--brass-light))]",
    textClass: "text-[rgb(var(--navy))]",
  },
  {
    name: "Ink",
    hex: "#181B19",
    rgb: "24, 27, 25",
    cssVar: "--ink",
    usage: "Body text color on the cream background — a soft near-black, never pure black.",
    swatchClass: "bg-[rgb(var(--ink))]",
    textClass: "text-[rgb(var(--paper))]",
  },
  {
    name: "Line",
    hex: "#D6CDBA",
    rgb: "214, 205, 186",
    cssVar: "--line",
    usage: "Borders, dividers, and card outlines throughout the site.",
    swatchClass: "bg-[rgb(var(--line))]",
    textClass: "text-[rgb(var(--navy))]",
    border: true,
  },
];

const FONTS = [
  {
    name: "Fraunces",
    role: "Display / Headings",
    sample: "Aa",
    className: "font-display",
    note: "Used for every headline, section title, and eyebrow-adjacent display moment across the site.",
  },
  {
    name: "Manrope",
    role: "Body / UI Text",
    sample: "Aa",
    className: "",
    note: "Used for paragraphs, navigation, buttons, and all supporting copy.",
  },
];

export function BrandColors() {
  return (
    <div className="mt-16 space-y-6">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Brand Colors
        </p>
        <h2 className="mt-2 font-display text-3xl text-[rgb(var(--navy))]">
          The exact colors and type behind the new site.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--ink))]/65">
          Pulled directly from the website&rsquo;s design system — use these values in any deck, document, or design tool to stay on-brand.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SWATCHES.map((s) => (
          <div key={s.cssVar} className="overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white">
            <div
              className={`flex h-24 items-end p-4 ${s.swatchClass} ${s.textClass} ${s.border ? "border-b border-[rgb(var(--line))]" : ""}`}
            >
              <span className="font-display text-lg">{s.name}</span>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="font-mono font-semibold text-[rgb(var(--navy))]">{s.hex}</span>
                <span className="font-mono text-[rgb(var(--ink))]/55">rgb({s.rgb})</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--ink))]/65">{s.usage}</p>
              <p className="mt-2 font-mono text-[11px] text-[rgb(var(--ink))]/40">var({s.cssVar})</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {FONTS.map((f) => (
          <div key={f.name} className="rounded-2xl border border-[rgb(var(--line))] bg-white p-6">
            <div className="flex items-center gap-4">
              <span className={`font-display text-4xl text-[rgb(var(--navy))] ${f.className}`}>{f.sample}</span>
              <div>
                <p className="font-display text-lg text-[rgb(var(--navy))]">{f.name}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--brass))]">{f.role}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--ink))]/65">{f.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
