import type {issuePersonalOutlook,PersonalLearningState} from "./personal-learning";
import type {RiskInput,RiskSymptom} from "./symptom-risk";
import type {CandidatePhysiologyDay} from "./combined-forecast-candidate";
import type {WearableImportOptions} from "./wearable-csv-import";
import type {ForecastPersona} from "./forecast-demo";
import type {Entry} from "./model";
export type LearningOutlook=ReturnType<typeof issuePersonalOutlook>;
export type LearningBundle={result:LearningOutlook;input:RiskInput;physiology:CandidatePhysiologyDay[];entries?:Entry[];persona?:ForecastPersona;label?:string;disclosure?:string;demoSeedVersion?:string};
export type LearningTask={op:"issue";state:PersonalLearningState;input:RiskInput;physiology:CandidatePhysiologyDay[];withdraw?:{date:string;reportedAt:string;symptoms:RiskSymptom[]}}|{op:"demo";persona:ForecastPersona;targetDate:string}|{op:"advance";bundle:LearningBundle}|{op:"csv";state:PersonalLearningState;input:RiskInput;csv:string;options:WearableImportOptions};
