# Elya demo: Maya

**Fictional person · synthetic data · experimental model · free to use**

Maya is a 24-year-old graduate student. Her recurring symptoms interfere with class and plans. Her pain often begins two days before bleeding, so she wants more than a predicted period date. She also wants a clear record to bring to appointments.

## One-minute demonstration

1. Open an isolated Demo mode profile. Show a persistent “Fictional demo data” badge and an easy reset. Never combine these records with a real profile.
2. Show Maya’s early history: “Still learning your pattern.” Do not invent risk estimates when history is insufficient.
3. Advance through the supplied chronological learning milestones. Explain that each forecast uses information available at its issue time; later journal entries become training feedback.
4. On November 14, show the actual November 15 outputs: **high fatigue risk; high bloating risk**. Her next fictional bleeding onset is November 17; this future onset is excluded from forecast inputs.
5. Show the journal check-in and clinician report using the existing UI. Confirm that these paths are connected before including them in the live demonstration. The JSON fixture itself does not implement them.
6. Close: “Elya is being built to be free to use. It helps people prepare for symptoms and tell a clearer story at appointments.”

## Honest limits

The supplied JSON contains synthetic historical symptom entries, wearable observations, a replayed learner state, learning milestones and computed outlooks. It is a backend fixture, not an installed UI demo. It demonstrates software behavior, not clinical accuracy. The same run gives low pelvic-pain risk despite an engineered upcoming pain episode: do not claim a successful pain warning. Risk levels are experimental and not validated probabilities. Do not claim that learning guarantees improvement.

## Lexi integration

Load research/fixtures/maya-demo-persona.json only through a clearly labeled, isolated demo profile. Use its outlook values directly; do not replace them with scripted risk labels. Keep the scenario’s future bleeding date out of model input. Provide a first-use view, historical replay view and current outlook view. Never replay old observations as newly collected live readings. The learner state is large; load it on demand. Existing personal-learning integration documentation describes the learner API. A native wearable connection is separate from this synthetic fixture.

## Highest-value rubric improvements today

- **Creative AI:** make the prediction → confirmed symptom feedback → updated personal model loop visible. Add a compact “learning history” view with actual record counts and whether the model selected wearable inputs. Avoid claiming feature values explain causation.
- **Creative AI:** show comparison with the history-only baseline where implemented. Wearables should earn inclusion through earlier validation, rather than always changing the risk display.
- **Real users:** ask 2–3 likely users to complete one task with fictional data. Record completion, confusion and a consented quote. A founder story proves the problem; observed product use supplies separate evidence.
- **Path to customers:** specify an initial audience, one concrete recruitment channel and a free-access funding hypothesis. Grants, donations or institutional sponsorship are hypotheses until secured. Measure inference/hosting cost and avoid promising unlimited cloud AI without a budget.
- **Execution:** run the exact demo from a fresh browser on the public link, including journal save, forecast, report export and reset. Label every simulated element.

Suggested positioning: **“Free personal symptom forecasting and appointment preparation—built around your patterns, not just your period date.”**

## Rebuild the fixture

From the repository root, bundle `research/build_maya_demo.ts` using esbuild for Node and run the generated bundle. The generator writes `research/fixtures/maya-demo-persona.json`. The fixture uses only generated data. This branch is based on `carly/onset-evaluation`; merging it also brings in that branch’s personal-learning backend. No frontend files were changed.
