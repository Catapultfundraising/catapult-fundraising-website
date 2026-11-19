import localFont from "next/font/local";

// Same CSS family as the Latin modules, with original Vietnamese coverage.
const Fraunces = localFont({
  src: [
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-normal.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-normal.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-italic.woff2", weight: "300", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-italic.woff2", weight: "400", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-italic.woff2", weight: "500", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-italic.woff2", weight: "600", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-vietnamese-italic.woff2", weight: "700", style: "italic" },
  ],
  display: "swap",
  variable: "--font-fraunces",
  preload: false,
  adjustFontFallback: false,
  fallback: ['"Fraunces Fallback"'],
  declarations: [{ prop: "unicode-range", value: "u+0102-0103,u+0110-0111,u+0128-0129,u+0168-0169,u+01a0-01a1,u+01af-01b0,u+0300-0301,u+0303-0304,u+0308-0309,u+0323,u+0329,u+1ea0-1ef9,u+20ab" }],
});
export default Fraunces;
