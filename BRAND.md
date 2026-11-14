# elya

Quiet, human, direct. Use Rethink Sans 600 for headings and the lowercase elya wordmark,
and Inter 400/500/600 for all other interface text. Use semibold headlines,
pill actions, 22px panels, thin borders, and restrained shadows. No script flourishes,
traffic lights, decorative AI imagery, or symptom-specific color hues.

## Tokens

Defined once in app/globals.css.

Typography is defined in components/typography.css. Both fonts are built with
next/font/google into same-origin self-hosted assets; no runtime Google font requests.
Use --font-display and --font-body with system-ui fallbacks. Wordmark is a reusable
component with sm/md/lg sizes, weight 600, tracking -0.04em and line-height 1.
Headlines use -0.02em and line-height 1.15. Display is clamp(40px,6vw,72px);
H1/H2/H3 are 36/28/22px, body 16px at 1.55, small 14px at 1.5, labels and the
disclaimer 12px, buttons 14px at weight 500. Numbers use Inter tabular numerals.
The approved fabric hero keeps its prior size/breakpoint values to preserve geometry;
only its requested font family, semibold weight and tracking change. Its animation
and wording are unchanged. The PDF renderer retains built-in Helvetica: next/font
does not embed fonts in jsPDF; its on-screen brief uses the new typography.

Navigation is owned by AppNavigationProvider in the shared app layout. The top
bar mounts once; only page content changes. Menu links are Journal, Outlook,
Appointment Brief, then the separated Settings link. The current row uses a
filled pill, semibold text, a check and aria-current=page. Links use hash destinations
so direct links and browser history work without remounting the bar.
The wordmark links to Outlook. Its Check in pill appears only on Outlook and opens
Journal's quick check-in. Demo history and wearable connections live in Settings.

Menu uses the shared GlassCard recipe (white 55%, blur 24px/saturate 160%, light
border and restrained inner highlight/shadow). Its radius is 24px and width 280px,
bounded by mobile margins. Reduced transparency removes blur in favor of solid pearl;
reduced motion removes transitions. Native page view transitions cross-fade only
content, with a simple content fade in browsers without that API.
Menu remains at x=42/y=40 on desktop and x=32/y=32 on mobile (plus safe-area inset).
Browser checks confirmed identical bar/pill/logo DOM nodes and dimensions across
all three pages, 48px rows, keyboard navigation and focus restoration. The opening
fabric scene's shader, headline, supporting sentence and CTA layout were not edited.

Typography browser audit: Home, Journal, Appointment brief and Settings headings
resolved to Rethink Sans 600; wordmarks resolved to lowercase elya at weight 600
with -0.04em tracking. Body resolved to Inter. Network inspection found only the
two same-origin woff2 assets (Rethink Sans variable 400–800 and Inter 400/500/600);
the generated metric-adjusted fallback faces use local system fonts. Initial-load
CLS measured 0 in the desktop Chromium run. Later route changes and viewport
resizing are not a font-load CLS measurement. At 390px the document width remained
390px. The hero shader/config source matched the pre-pass source exactly.

| Token | Value | Use |
| --- | --- | --- |
| white | #FFFFFF | Panels, primary button text |
| pearl | #FAF6F4 | Page |
| pearl-deep | #EDE5E1 | Quiet fills |
| blush | #FBEFEA | Soft highlights |
| rose-soft | #F3D9DD | Selection, elevated likelihood |
| rose | #D9A5AD | Estimate marks only; never text |
| rose-deep | #9E5A68 | Links, primary actions |
| ink | #3A2E2A | Text and confirmed observation marks |
| ink-soft | #6B5B56 | Secondary text |
| line | #E8DDD9 | Decorative borders |

Use white at 70% with a white border and backdrop blur for secondary glass actions.
Use ink-soft borders and rose-deep focus outlines where control boundaries matter.
Rose-deep text belongs on white or pearl; on rose-soft, use a white inset backing
if contrast testing requires it. One prominent primary action per task.

## States and provenance

Likelihood describes neither severity nor urgency. Each symptom has its own label
and icon on the same palette.

- Elevated likelihood: rose-soft, rose-deep label, filled dot.
- Usual pattern: pearl-deep, ink label, half-filled dot.
- Still learning: transparent, dashed line outline, ink-soft label, hollow dot.

Outlook displays the existing forecast backend's estimates and abstentions.
New personal histories begin in Still learning. Do not turn missing evidence
into a lower-likelihood or elevated estimate. The backend's lower estimate is
not described as a calibrated personal usual baseline.

- Observation: solid ink mark or line.
- Estimate: rose mark on rose-soft, explicit “Estimate” label.
- Confirmed absence: checked hollow circle, “None reported.”
- Unanswered: dashed outline, “Unknown.” Never plot as zero or connect chart gaps.

Use DataLegend when these records appear together. Distinguish observed cycles
with dash patterns and dated labels, not unrelated hues. Keep detailed charts optional.

Fictional data uses a dashed rose-deep “Fictional demo history” chip. Public research
experiments use a solid ink “Real public-data experiment” chip only on actual
experiment views. Public sample imports alone are not a validated experiment.
Never imply live Oura access or validated symptom prediction.

Keep source quotations, source links, correction flows, and safety wording intact.
Footer: “Experimental symptom-risk estimates. Not a diagnostic tool or a replacement
for medical care.”

## Approved hero exception

The opening scene is frozen. Its existing glass, overlay, and fallback colors are
extracted into --hero-approved-* aliases without changing their values. These are
legacy exceptions, not colors to reuse elsewhere. The shader reads white, pearl,
and pearl-deep from shared tokens; its existing deeper shadow mixing constant is
preserved to avoid changing the approved animation. No hero motion or geometry changed.
The existing warm bottom overlay remains intentionally unchanged despite the cooler
app theme. The requested footer appears below the opening scene, not over it.

## Accessibility and motion

Check normal text at 4.5:1, large text at 3:1. Never rely on color alone.
Animations outside the approved hero use 400ms transitions and stop with reduced
motion. The hero retains its existing static reduced-motion behavior and 30fps cap.
PDF uses its existing monochrome presentation; CSS variables are not interpreted
by the PDF renderer.

## Verified implementation

Desktop (1280px) and mobile (390px) screenshots cover Home, Journal, Appointment
brief, Settings, the entry editor, and optional charts. Browser checks found no
AA text-contrast failures in the sampled visible non-disabled text. The primary
white/rose-deep pair is 5.10:1; secondary ink-soft/pearl-deep is 5.19:1.
Rose-deep/rose-soft alone is only 3.83:1, hence the white backing on the elevated
state label. State-reference screenshots are styling fixtures, never user forecasts.
The mobile calendar has no horizontal overflow; missing and confirmed-absence
days have distinct text, accessible names, and marks. The hero shader source and
motion configuration match the approved version exactly. The legacy warm hero
overlay is the explicit exception to the cooler application palette.

The experimental public-data backend has no dedicated evidence screen yet.
Its chip style is supplied for that future view, not attached to unrelated sample
imports or invented results. Wearable backend code and teammate-owned components
were not edited. Validation: 67 existing tests, route type generation, TypeScript,
webpack production build, worker packaging, and whitespace checks passed.
