# WholeStory

Quiet, human, direct. Use the existing system sans-serif family, semibold headlines,
pill actions, 22px panels, thin borders, and restrained shadows. No script flourishes,
traffic lights, decorative AI imagery, or symptom-specific color hues.

## Tokens

Defined once in app/globals.css.

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

The current Home outlook abstains: no model estimate is wired into the UI.
Do not turn missing evidence into a usual-pattern or elevated estimate.

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
