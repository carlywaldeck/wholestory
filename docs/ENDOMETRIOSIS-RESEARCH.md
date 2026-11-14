# Endometriosis research and product decisions

Reviewed November 14, 2026. This memo informs Carly's data workstream. It does not change Lexi's screens, journal schema, PDF implementation, or product copy. No patient files from restricted datasets have been accessed.

## What the evidence supports

WHO describes broad, variable symptoms and reports a 4–12-year average time-to-diagnosis range. It emphasizes a careful menstrual and symptom history; clinical assessment and imaging can support diagnosis without requiring surgery before treatment. The practical opportunity for WholeStory is clearer history and earlier care conversations, not a wearable diagnosis.
Source: [WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/endometriosis).

NICE recommends symptom diaries to support discussion and highlights daily-life disruption, persistent/recurrent symptoms, and ineffective or unsuitable initial treatment in referral guidance. Normal examination and ultrasound do not exclude endometriosis. WholeStory should preserve these observations and help users ask about next steps without applying an automated referral rule.
Source: [NICE NG73](https://www.nice.org.uk/guidance/ng73/chapter/Recommendations), recommendations 1.3.3 and 1.5.4–1.5.5.

ACOG's 2026 guidance announcement emphasizes clinical diagnosis and timely evaluation/support. This supports organizing the patient's account; it does not authorize this app to diagnose or prescribe.
Source: [ACOG announcement](https://www.acog.org/news/news-releases/2026/02/acog-publishes-new-endometriosis-clinical-guidance-aiming-shorten-time-diagnosis-improve-access-care). Full guideline access was not available during this review.

An exploratory EndoTECH study followed 68 people with confirmed endometriosis and linked actigraphy with symptom trajectories. It motivates testing wearable context, but associations and outcome monitoring are different from next-day forecasting. Individual data are not publicly hosted; sharing requires a research request and ethical approval. This is not validation of WholeStory.
Source: [Edgley et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12048534/).

## Four functions, with different evidence requirements

| Function | Build now | What remains unproven |
| --- | --- | --- |
| Prepare for difficult days | Personal research forecasts evaluated against simple baselines; abstain when data are inadequate | Predictive benefit in real prospective use |
| Clinician summaries | Source-linked symptoms, functional effects, treatment reports, chosen concern and questions | Whether the brief improves decisions or shortens delay |
| Journal | Low-burden capture with explicit symptom-free/missing distinctions and corrections | Adherence and usefulness across different patient groups |
| Wearable connection | Authorized Oura manual import and normalization; optional CSV | Provider end-to-end compatibility and incremental clinical value |

Prediction must target something explicit: reported functional interference tomorrow, or a separately defined high-pain outcome. A user's difficult day is not necessarily a high pain score. Do not label activity decline, low sleep, or normal readings as evidence for or against endometriosis.

The product hypothesis is a connected loop: **prepare for the next day → record what actually happened → carry unresolved needs into care → record the next agreed step**. Distinguish model estimates from source observations and clinician decisions. Measure whether the loop helps rather than adding more dashboards.

## Real-data strategy

- **KI EndoLIST:** 34 diagnosed participants; individualized scales; regular cycles and no hormonal treatment at enrollment. Restricted access requires registration and an agreement. Potential exploratory symptom-only evaluation, with limited generalizability. No wearable pairing or undiagnosed/control cohort is described. No patient files were downloaded.
- **EndoTECH:** relevant paired symptom/actigraphy study, but individual records require approved access. Do not manufacture a dataset from published correlations.
- **PMData:** real public Fitbit measurements already sourced. Useful for import and missing-data verification; has no endometriosis outcomes. Never join it to fictional symptom histories and call the result real validation.
- **Synthetic personas:** engineering and presentation only. No synthetic accuracy figure belongs in the clinical pitch.

[KI EndoLIST metadata](https://physionet.org/content/ki-endolist/1.0.0/) · [EndoTECH availability](https://pmc.ncbi.nlm.nih.gov/articles/PMC12048534/#data-availability) · [PMData](https://datasets.simula.no/pmdata/).

## Competitive finding

Flare estimates, wearable context, and clinician PDFs are already advertised. [EndoTracking](https://endotracking.com/) describes a flare-risk trend, and [PainPal](https://painpal-endo.com/) describes a companion proposing actions from logs. These are product claims, not independent performance evidence. We cannot honestly claim the feature bundle is unique.

A defensible distinction to test is transparent evaluation: show when the system abstains, which earlier observations contributed, whether wearables outperform journal-only baselines, and how the next appointment addresses a concern still unresolved. Novelty and user benefit both require testing, not a naming claim.

## Validation plan

1. **Engineering:** verify time ordering, units, missingness, source traces, conflict handling, and credential isolation.
2. **Retrospective research:** run authorized participant data through forward-in-time evaluation. Compare historical rate, prior outcome, journal-only and journal-plus-wearable models. Separate real and synthetic reports. Report coverage and errors, not just accuracy.
3. **External testing:** evaluate on people and devices not used for development. Investigate irregular cycles, hormonal treatment, missingness, and differences in symptom expression; don't extrapolate a restricted cohort.
4. **Prospective silent evaluation:** save estimates before outcomes occur, without presenting actionable forecasts. Establish whether data arrive in time and quantify missed days, false alerts, calibration and burden.
5. **Clinical and user review:** review source fidelity, useful appointment information, clarity, anxiety, and appropriate care-seeking. A separate prospective study would be needed to establish reduced diagnostic delay.

No clinical validation, diagnostic-accuracy result, or earlier-diagnosis benefit has been established. The new evaluator has no path to enable a user-facing prediction automatically.
