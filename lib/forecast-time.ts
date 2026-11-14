// Calendar arithmetic is separate from elapsed hours: DST days can be 23 or 25 hours.
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  if (!formatters.has(timeZone)) {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    if (formatters.size >= 16)
      formatters.delete(formatters.keys().next().value!);
    formatters.set(timeZone, f);
  }
  return formatters.get(timeZone)!;
}
export function validTimeZone(zone: string) {
  try {
    formatter(zone);
    return true;
  } catch {
    return false;
  }
}
function parts(instant: number, timeZone: string) {
  const p = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(instant)
      .map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    clock: `${p.hour}:${p.minute}:${p.second}`,
    ms: new Date(instant).getUTCMilliseconds(),
  };
}
export const localDate = (instant: string, zone: string) =>
  parts(Date.parse(instant), zone).date;
export const shiftDate = (date: string, n: number) =>
  new Date(Date.parse(date + "T12:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const calendarGap = (a: string, b: string) =>
  Math.round(
    (Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 86400000,
  );

/** Resolve a local clock conservatively. Nonexistent or ambiguous historical clocks
 * are unavailable, rather than silently shifting the forecast across a DST change.
 */
export function localInstant(
  date: string,
  clock: string,
  zone: string,
  ms = 0,
): number | null {
  const wall = Date.parse(`${date}T${clock}Z`) + ms;
  const candidates = new Set<number>();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const sample = wall + hours * 3600000;
    const p = parts(sample, zone);
    const offset = Date.parse(`${p.date}T${p.clock}Z`) + p.ms - sample;
    const candidate = wall - offset;
    const check = parts(candidate, zone);
    if (check.date === date && check.clock === clock && check.ms === ms)
      candidates.add(candidate);
  }
  return candidates.size === 1 ? [...candidates][0] : null;
}

export function forecastSchedule(
  targetDate: string,
  asOf: string,
  zone: string,
) {
  const current = parts(Date.parse(asOf), zone);
  const isClosingMidnight =
    current.date === targetDate &&
    current.clock === "00:00:00" &&
    current.ms === 0;
  if (current.date !== shiftDate(targetDate, -1) && !isClosingMidnight)
    throw Error(
      "asOf must be on the preceding local calendar day or its closing midnight.",
    );
  const cache = new Map<string, number | null>();
  return {
    origin(date: string) {
      if (!cache.has(date))
        cache.set(
          date,
          localInstant(
            isClosingMidnight ? date : shiftDate(date, -1),
            current.clock,
            zone,
            current.ms,
          ),
        );
      return cache.get(date)!;
    },
    issueClock: current.clock,
    timeZone: zone,
  };
}
