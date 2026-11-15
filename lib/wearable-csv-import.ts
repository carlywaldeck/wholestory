/** Local-only normalized CSV import. Does not contact a provider or upload records. */
import {z} from "zod";
import {physiologyDaySchema,physiologySources,type PhysiologyDay} from "./forecast-physiology";
import {localDate,validTimeZone} from "./forecast-time";
import type {CandidatePhysiologyDay} from "./combined-forecast-candidate";

const headerNames=["date","sleep_hours","night_heart_rate_bpm","resting_heart_rate_bpm","hrv_rmssd_ms","temperature_deviation_c","respiratory_rate_bpm","steps"] as const;
const optionsSchema=z.object({source:z.enum(physiologySources),kind:z.enum(["real","synthetic"]),
  timeZone:z.string().refine(validTimeZone),importedAt:z.iso.datetime({offset:true})}).strict();
export type WearableImportOptions=z.input<typeof optionsSchema>;

function readCSV(text:string){
  const rows:string[][]=[];let row:string[]=[],field="",quoted=false,closed=false;
  const pushField=()=>{row.push(field);field="";closed=false;};
  const pushRow=()=>{pushField();if(row.some(v=>v.trim()!==""))rows.push(row);row=[];if(rows.length>366)throw Error("Import supports at most 365 days");};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(c===","){pushField();continue;}
    if(c==="\n"||c==="\r"){if(c==="\r"&&text[i+1]==="\n")i++;pushRow();continue;}
    if(c==='"'){if(field!==""||closed)throw Error("Malformed CSV quoting");quoted=true;continue;}
    if(closed)throw Error("Unexpected text after quoted field");
    field+=c;
  }
  if(quoted)throw Error("Unclosed CSV quote");
  if(field!==""||row.length||closed)pushRow();
  return rows;
}

function numeric(value:string|undefined,row:number){
  if(value===undefined||value.trim()==="")return null;
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()))throw Error(`Invalid numeric field on row ${row}`);
  const number=Number(value);if(!Number.isFinite(number))throw Error(`Nonfinite value on row ${row}`);return number;
}

export function importWearableCSV(raw:string,rawOptions:WearableImportOptions){
  const options=optionsSchema.parse(rawOptions);
  if((options.source==="synthetic")!==(options.kind==="synthetic"))throw Error("Synthetic imports must be explicitly labeled synthetic");
  if(new TextEncoder().encode(raw).byteLength>512*1024)throw Error("CSV exceeds 512 KiB");
  const rows=readCSV(raw.replace(/^\uFEFF/,""));
  if(rows.length<2)throw Error("CSV needs a header and at least one data row");
  const headers=rows[0].map(v=>v.trim());
  if(new Set(headers).size!==headers.length)throw Error("Duplicate CSV column");
  if(!headers.includes("date")||headers.some(h=>!headerNames.includes(h as typeof headerNames[number])))throw Error("Use the normalized wearable CSV template headers");
  const days:PhysiologyDay[]=[],candidateDays:CandidatePhysiologyDay[]=[],seen=new Set<string>();
  for(let i=1;i<rows.length;i++){
    if(rows[i].length!==headers.length)throw Error(`Wrong field count on row ${i+1}`);
    const cells=Object.fromEntries(headers.map((h,j)=>[h,rows[i][j].trim()]));
    const date=z.iso.date().safeParse(cells.date);
    if(!date.success)throw Error(`Invalid calendar date on row ${i+1}`);
    if(seen.has(date.data))throw Error(`Duplicate measurement day on row ${i+1}`);
    if(localDate(options.importedAt,options.timeZone)<date.data)throw Error(`Future measurement day on row ${i+1}`);
    seen.add(date.data);
    const value=(key:string)=>numeric(cells[key],i+1);
    const resting=z.number().min(20).max(220).nullable().safeParse(value("resting_heart_rate_bpm"));
    const day=physiologyDaySchema.safeParse({date:date.data,availableAt:options.importedAt,source:options.source,kind:options.kind,
      sleepHours:value("sleep_hours"),nightHeartRateBpm:value("night_heart_rate_bpm"),hrvRmssdMs:value("hrv_rmssd_ms"),
      temperatureDeviationC:value("temperature_deviation_c"),respiratoryRateBpm:value("respiratory_rate_bpm"),steps:value("steps")});
    if(!day.success||!resting.success)throw Error(`Out-of-range measurement on row ${i+1}`);
    if(headerNames.slice(1).every(h=>!cells[h]))throw Error(`No measurements on row ${i+1}`);
    days.push(day.data);candidateDays.push({...day.data,restingHeartRateBpm:resting.data});
  }
  days.sort((a,b)=>a.date.localeCompare(b.date));candidateDays.sort((a,b)=>a.date.localeCompare(b.date));
  return {days,candidateDays,metadata:{source:options.source,kind:options.kind,importedAt:options.importedAt,
    timeZone:options.timeZone,count:days.length,networkRequestsMade:0,usedByActiveForecast:false,
    notes:["Normalized template import; native Apple Health XML, Garmin FIT and vendor OAuth are separate adapters.",
      "Receipt time is the import time; historical availability is not backdated.",
      "Daily resting HR stays separate from nocturnal HR; RMSSD must not contain Apple SDNN or readiness scores.",
      "Temperature deviation must already be a deviation in Celsius, not absolute body temperature.",
      "Sleep dates are local waking dates. Missing measurements remain null. No data was persisted or uploaded."]}};
}
