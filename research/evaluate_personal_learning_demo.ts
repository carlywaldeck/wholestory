import { writeFileSync } from "node:fs";
import { personalLearningDemo } from "../lib/personal-learning-demo";

const demo = personalLearningDemo("maya", "2026-11-15");
const report = { disclosure: demo.disclosure, kind: demo.kind, persona: demo.persona,
  modelVersion: demo.latest.modelVersion, outlook: demo.latest.outlook,
  finalLearningStatus: demo.latest.symptoms,
  progress: demo.progress.filter((_, i) => i % 14 === 0 || i === demo.progress.length-1),
  clinicalValidation: false, activeInPublicApp: false };
if (!process.argv[2]) throw Error("Provide an aggregate synthetic demo output path");
writeFileSync(process.argv[2], JSON.stringify(report, null, 2)+"\n");
console.log(JSON.stringify({ replayedDays: demo.progress.length, final: demo.latest.symptoms.map(s => ({
  symptom: s.symptom, pairs: s.trainingPairs, stage: s.stage, usedWearables: s.usedWearables })) }));
