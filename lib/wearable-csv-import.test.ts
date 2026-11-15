import {expect,it} from "vitest";
import {importWearableCSV} from "./wearable-csv-import";
import {physiologyContext} from "./forecast-physiology";
const options={source:"garmin",kind:"real",timeZone:"America/Los_Angeles",importedAt:"2026-11-14T22:00:00Z"} as const;

it("imports locally with correct units, missingness and separate resting/nocturnal HR",()=>{
  const result=importWearableCSV('date,sleep_hours,resting_heart_rate_bpm,hrv_rmssd_ms,steps\r\n"2026-11-13",7.5,60,,4500\r\n',options);
  expect(result.days[0]).toMatchObject({source:"garmin",sleepHours:7.5,nightHeartRateBpm:null,hrvRmssdMs:null,availableAt:options.importedAt});
  expect(result.candidateDays[0].restingHeartRateBpm).toBe(60);
  expect(result.metadata.networkRequestsMade).toBe(0);
});

it("does not backdate imports into historical forecasts or mix provider baselines",()=>{
  const g=importWearableCSV('date,sleep_hours\n2026-11-13,7',options);
  expect(physiologyContext(g.days,"2026-11-14","2026-11-14T00:00:00Z","UTC","real").signals.every(s=>s.value===null)).toBe(true);
  const apple=importWearableCSV('date,sleep_hours\n2026-11-12,6',{...options,source:"apple-health"});
  expect(physiologyContext([...apple.days,...g.days],"2026-11-15","2026-11-15T00:00:00Z","UTC","real").signals[0].baselineDays).toBe(0);
});

it("rejects ambiguous units, invalid dates, future days, duplicates and malformed CSV",()=>{
  for(const text of ['date,hrv_sdnn_ms\n2026-11-13,40','date,steps\n2026-02-30,40',
    'date,steps\n2027-01-01,40','date,steps\n2026-11-13,40\n2026-11-13,50',
    'date,steps\n2026-11-13,1.5','date,steps\n2026-11-13,=5','date,steps\n"2026-11-13,5'])
    expect(()=>importWearableCSV(text,options)).toThrow();
});

it("keeps synthetic demos explicit and refuses oversized imports",()=>{
  expect(()=>importWearableCSV('date,steps\n2026-11-13,100',{...options,source:"synthetic"})).toThrow(/Synthetic/);
  expect(importWearableCSV('date,steps\n2026-11-13,100',{...options,source:"synthetic",kind:"synthetic"}).days[0].kind).toBe("synthetic");
  expect(()=>importWearableCSV('x'.repeat(512*1024+1),options)).toThrow(/512/);
});
