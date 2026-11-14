# Handoff to the experience/storytelling workstream

No changes were made to app/page.tsx, app/globals.css, Settings, journal capture, shared model schema, summary UI, or PDF in the research update. Please coordinate before modifying existing wearable interfaces.

## Proposed experience (requires your decision/implementation)

Keep four capabilities in one small journey rather than four dashboards:
- **Today:** brief journal/check-in plus a preparation view. When no validated estimate is available, say that there is not enough evidence to forecast; never display a sample risk percentage as real.
- **Your story:** editable entries and optional wearable observations; normal readings never negate reported symptoms.
- **Appointment brief:** patient's priority, functional effects, symptom chronology, attempted treatments and reported response, and chosen questions.
- **Connection preferences:** remain in Settings; wearable ownership is optional.

The “prepare / document / bring to care” loop is a product hypothesis. We cannot claim it is unique or proven to shorten diagnosis.

## New backend-only contract

`buildCareEvidence(entries)` in lib/care-evidence.ts returns source-linked topics with entry IDs, dates, exact quotes, and optional discussion prompts. It validates original quotations and rejects mixed personal/demo histories. It returns no diagnosis, referral decision or urgency assessment. Its guideline context is general information, not a personal clinical finding.

Use these records to help a person select details for a clinician conversation. No count or threshold means “likely endometriosis.” Missing treatment effects must stay unknown. Do not require users to wait for enough tracking before seeking care.

`research/evaluate_bad_days.py` is offline only. It emits research metrics and always marks clinical validation and app forecasts as false. There is no prediction API for you to wire to Today yet. The appropriate placeholder is honest abstention, not a fabricated “low risk” state.

Oura OAuth setup and the existing callback navigation follow-up remain documented in WEARABLE-DATA.md. Do not assume hosted credentials are configured or PR #2 has been deployed.

## Review before merging

- Source quotes remain intact and corrections flow back to the journal.
- Synthetic, public research and personal data stay visibly separate.
- A normal scan or normal wearable record is not presented as ruling out disease.
- High-pain and functional-impact outcomes are not conflated.
- No automatic claims about treatment effectiveness or diagnostic delay.

Research details, primary sources, and data access limits: ENDOMETRIOSIS-RESEARCH.md.

## November 14: personal symptom-risk module

A separate local-first `symptomRisk(input)` function is now available in `lib/symptom-risk.ts`. See `SYMPTOM-RISK-APIS.md` for its exact boolean/null check-in and availability-time contract, UTC research timing, eight distinct outcomes, support checks and chronological backtest outputs. It is experimental, not clinically validated, and not mounted in your UI. No existing journal fields should be inferred as negative labels. No page, global stylesheet, Settings or clinician report edits are included. The reusable Oura sandbox probe succeeds without an account, but its sample records cannot establish accuracy.
