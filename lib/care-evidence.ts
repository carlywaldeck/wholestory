import { Entry, Fact, isPresentFact, validateEntry } from "./model";

export const careEvidenceSources = {
  who: "https://www.who.int/news-room/fact-sheets/detail/endometriosis",
  nice: "https://www.nice.org.uk/guidance/ng73/chapter/Recommendations",
  acog: "https://www.acog.org/news/news-releases/2026/02/acog-publishes-new-endometriosis-clinical-guidance-aiming-shorten-time-diagnosis-improve-access-care",
};
type Evidence = {
  entryId: string;
  date: string;
  kind: Fact["kind"];
  quote: string;
  reportedValue: string;
};
/** Communication evidence, NOT a diagnostic rule, referral assessment, or urgency assessment. */
export function buildCareEvidence(input: Entry[]) {
  const entries = input
    .map(validateEntry)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (
    new Set(entries.filter((e) => e.demo).map((e) => e.persona)).size > 1 ||
    (entries.some((e) => e.demo) && entries.some((e) => !e.demo))
  )
    throw Error("Use one person's journal or one fictional persona at a time.");
  const evidence = (
    kinds: Fact["kind"][],
    includeNegative = false,
  ): Evidence[] =>
    entries.flatMap((e) =>
      e.facts
        .filter(
          (f) =>
            kinds.includes(f.kind) && (includeNegative || isPresentFact(f)),
        )
        .map((f) => ({
          entryId: e.id,
          date: e.date,
          kind: f.kind,
          quote: f.quote,
          reportedValue: f.value,
        })),
    );
  const topics: {
    id: string;
    title: string;
    evidence: Evidence[];
    discussionPrompt: string;
    source: string;
  }[] = [
    {
      id: "life-impact",
      title: "Effect on everyday life",
      evidence: evidence(["Daily-life impact"]),
      discussionPrompt:
        "How can we address the effect of these symptoms on my daily activities?",
      source: careEvidenceSources.nice,
    },
    {
      id: "pain",
      title: "Reported pain and timing",
      evidence: evidence([
        "Pelvic pain",
        "Pain",
        "Severity",
        "Timing",
        "Menstrual context",
      ]),
      discussionPrompt:
        "What evaluation would help us understand this pain and its timing?",
      source: careEvidenceSources.who,
    },
    {
      id: "bowel-bladder-sex",
      title: "Bowel, bladder, or sexual symptoms",
      evidence: evidence([
        "Pain with bowel movements",
        "Bowel discomfort",
        "Pain with urination",
        "Urinary symptoms",
        "Pain during sex",
      ]),
      discussionPrompt:
        "Could we discuss these symptoms alongside the pelvic pain?",
      source: careEvidenceSources.nice,
    },
    {
      id: "treatment-response",
      title: "What I tried and what I reported afterward",
      evidence: evidence(
        ["Intervention", "Medication effect", "What helped"],
        true,
      ),
      discussionPrompt:
        "What should we review about what I tried, its reported effects, and what remains difficult?",
      source: careEvidenceSources.acog,
    },
  ];
  return {
    purpose: "patient-clinician-communication" as const,
    synthetic: entries.some((e) => e.demo),
    loggedDays: new Set(entries.map((e) => e.date)).size,
    dateRange: entries.length
      ? { first: entries[0].date, last: entries.at(-1)!.date }
      : null,
    topics: topics
      .filter((t) => t.evidence.length)
      .map((t) => ({
        ...t,
        reportedDays: new Set(t.evidence.map((e) => e.date)).size,
      })),
    generalContext: {
      text: "Normal imaging does not by itself exclude endometriosis. Discuss persistent symptoms and next steps with a healthcare professional.",
      source: careEvidenceSources.nice,
    },
    limitations: [
      "Only explicitly recorded details are included. Missing days and missing treatment outcomes remain unknown.",
      "Co-occurring symptoms do not establish a cause, diagnosis, or treatment effect.",
      "No minimum number of journal entries or wearable readings is required before seeking medical care.",
    ],
    assessment: {
      diagnosis: null,
      referralDecision: null,
      urgencyAssessment: null,
      earlierDiagnosisBenefitEstablished: false,
    },
  };
}
