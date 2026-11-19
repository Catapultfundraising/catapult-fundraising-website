import localFont from "next/font/local";

// Same CSS family as the Latin and Vietnamese modules, with original range.
const Fraunces = localFont({
  src: [
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-normal.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-normal.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-italic.woff2", weight: "300", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-italic.woff2", weight: "400", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-italic.woff2", weight: "500", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-italic.woff2", weight: "600", style: "italic" },
    { path: "../../public/fonts/fraunces/Fraunces-latin-ext-italic.woff2", weight: "700", style: "italic" },
  ],
  display: "swap",
  variable: "--font-fraunces",
  preload: false,
  adjustFontFallback: false,
  fallback: ['"Fraunces Fallback"'],
  declarations: [{ prop: "unicode-range", value: "u+0100-02ba,u+02bd-02c5,u+02c7-02cc,u+02ce-02d7,u+02dd-02ff,u+0304,u+0308,u+0329,u+1d00-1dbf,u+1e00-1e9f,u+1ef2-1eff,u+2020,u+20a0-20ab,u+20ad-20c4,u+2113,u+2c60-2c7f,u+a720-a7ff" }],
});
export default Fraunces;
