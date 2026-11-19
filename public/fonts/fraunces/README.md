# Fraunces: exact production font assets

These six **unmodified** WOFF2 files were downloaded from the production
`www.catapultfr.com/_next/static/media/` URLs recorded in `provenance.json`.
They are not replacement fonts or newly generated Google Fonts instances.
SHA-256, original CSS URL, subset range, style and existing weights are pinned
in that manifest.

Copyright 2018 The Fraunces Project Authors
(https://github.com/undercasetype/Fraunces). Redistributed under the
**SIL Open Font License 1.1**, included verbatim in `OFL.txt`. The license source
URL and exact bytes' hash are pinned in the manifest.

## Why local assets?

Next.js 15.3.6's Google font loader assumes every Google font URL ends in a
font extension. Google's current Fraunces CSS instead returns extensionless
`/l/font?kit=...` URLs, causing an unchecked regex null dereference during
build. Local files eliminate that build dependency without upgrading Next,
patching its pipeline, substituting typefaces or changing branding.

`lib/fonts/fraunces-{latin,latin-ext,vietnamese}.ts` each exports a
`next/font/local` declaration named **Fraunces**. The local loader uses that
identifier as the CSS family; compiled CSS is checked to ensure all subsets
share the same family. Separate modules preserve each original Unicode range
without merging or changing the font binaries. Five discrete weights
(300/400/500/600/700), normal and italic, `display:swap`,
`--font-fraunces`, and Latin-only preload match the deployed configuration.

Automatic local fallback metric calculation is disabled. `app/globals.css`
keeps the exact deployed `Fraunces Fallback` face: Times New Roman,
84.71% ascent, 22.09% descent, 0.00% line gap and 115.45% size adjustment.
Manrope is unchanged.

Run `node scripts/test-fraunces-local.cjs` for byte/license and real-loader
checks. After `npm run build`, add `--built` to verify the emitted CSS family,
all 30 subset/style/weight faces and the exact emitted font bytes.
