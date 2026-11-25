export interface MaritimeCoords {
  latitude: number;
  longitude: number;
  label: string;
  utcOffsetHours: number;
}

export const DEFAULT_SYLHET_COORDS: MaritimeCoords = {
  latitude: 24.8949,
  longitude: 91.8687,
  label: 'Sylhet Port (BMAS)',
  utcOffsetHours: 6, // Bangladesh Standard Time UTC+6
};

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerEntry {
  name: PrayerName;
  epochMs: number;
  timeFormatted: string;
}

export interface MaritimeSolarTimes {
  sunriseMinutes: number;
  sunsetMinutes: number;
  solarNoonMinutes: number;
  sunriseFormatted: string;
  sunsetFormatted: string;
}

export interface SurroundingPrayers {
  previous: PrayerEntry;
  current: PrayerEntry;
  next: PrayerEntry;
  allToday: PrayerEntry[];
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function julianDayFromYmd(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

/**
 * Formats minutes since local midnight (0..1440) into "hh:mm AM/PM".
 */
export function formatMinutes12Hour(minutesFromMidnight: number): string {
  let mins = Math.round(minutesFromMidnight) % 1440;
  if (mins < 0) mins += 1440;
  const hour24 = Math.floor(mins / 60);
  const minute = mins % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * Formats live GMT/UTC clock string: "HH:MM:SS GMT".
 */
export function formatGmtTime(now: Date): string {
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} GMT`;
}

/**
 * Returns local calendar Y-M-D in the target UTC offset.
 */
function getYmdInOffset(now: Date, utcOffsetHours: number): {
  year: number;
  month: number;
  day: number;
  dayStartUtcMs: number;
} {
  const offsetMs = utcOffsetHours * 3600_000;
  const shifted = new Date(now.getTime() + offsetMs);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const dayStartUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs;
  return { year, month, day, dayStartUtcMs };
}

/**
 * Computes Equation of Time (minutes) and Solar Declination (radians)
 * for a given Julian Day at solar noon.
 */
function solarPositionForDay(jd: number, longitude: number): {
  declRad: number;
  eqTimeMin: number;
  solarNoonMinUtc: number;
} {
  const t = (jd - 2451545.0) / 36525.0;
  const geomMeanLong = normalizeDegrees(280.46646 + t * (36000.76983 + t * 0.0003032));
  const geomMeanAnom = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccent = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const anomRad = geomMeanAnom * DEG_TO_RAD;
  const eqCenter =
    Math.sin(anomRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * anomRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * anomRad) * 0.000289;

  const trueLong = geomMeanLong + eqCenter;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * DEG_TO_RAD);

  const meanObliq =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliqCorr = meanObliq + 0.00256 * Math.cos((125.04 - 1934.136 * t) * DEG_TO_RAD);

  const declRad = Math.asin(Math.sin(obliqCorr * DEG_TO_RAD) * Math.sin(appLong * DEG_TO_RAD));

  const y = Math.tan((obliqCorr / 2) * DEG_TO_RAD) ** 2;
  const longRad = geomMeanLong * DEG_TO_RAD;

  const eqTimeRad =
    y * Math.sin(2 * longRad) -
    2 * eccent * Math.sin(anomRad) +
    4 * eccent * y * Math.sin(anomRad) * Math.cos(2 * longRad) -
    0.5 * y * y * Math.sin(4 * longRad) -
    1.25 * eccent * eccent * Math.sin(2 * anomRad);

  const eqTimeMin = 4 * eqTimeRad * RAD_TO_DEG;
  const solarNoonMinUtc = 720 - 4 * longitude - eqTimeMin;

  return { declRad, eqTimeMin, solarNoonMinUtc };
}

function hourAngleForZenith(latitude: number, declRad: number, zenithDeg: number): number {
  const latRad = latitude * DEG_TO_RAD;
  const cosHa =
    (Math.cos(zenithDeg * DEG_TO_RAD) - Math.sin(latRad) * Math.sin(declRad)) /
    (Math.cos(latRad) * Math.cos(declRad));
  const clamped = Math.max(-1, Math.min(1, cosHa));
  return Math.acos(clamped) * RAD_TO_DEG;
}

/**
 * Computes official Sunrise, Sunset, and Solar Noon in local minutes from midnight.
 */
export function computeSolarTimesForDate(
  date: Date,
  coords: MaritimeCoords = DEFAULT_SYLHET_COORDS
): MaritimeSolarTimes {
  const { year, month, day } = getYmdInOffset(date, coords.utcOffsetHours);
  const jd = julianDayFromYmd(year, month, day) + 0.5 - coords.utcOffsetHours / 24;
  const { declRad, solarNoonMinUtc } = solarPositionForDay(jd, coords.longitude);

  const haDeg = hourAngleForZenith(coords.latitude, declRad, 90.833);
  const solarNoonLocal = solarNoonMinUtc + coords.utcOffsetHours * 60;
  const sunriseLocal = solarNoonLocal - 4 * haDeg;
  const sunsetLocal = solarNoonLocal + 4 * haDeg;

  return {
    sunriseMinutes: sunriseLocal,
    sunsetMinutes: sunsetLocal,
    solarNoonMinutes: solarNoonLocal,
    sunriseFormatted: formatMinutes12Hour(sunriseLocal),
    sunsetFormatted: formatMinutes12Hour(sunsetLocal),
  };
}

/**
 * Computes the 5 daily Islamic prayer entries for the civil date of `date` in `coords.utcOffsetHours`.
 * Uses Karachi / University of Islamic Sciences standard (18 deg Fajr & Isha, Standard Asr shadow = 1).
 */
export function computeDailyPrayersForCivilDay(
  dayStartUtcMs: number,
  year: number,
  month: number,
  day: number,
  coords: MaritimeCoords
): PrayerEntry[] {
  const jd = julianDayFromYmd(year, month, day) + 0.5 - coords.utcOffsetHours / 24;
  const { declRad, solarNoonMinUtc } = solarPositionForDay(jd, coords.longitude);
  const noonLocal = solarNoonMinUtc + coords.utcOffsetHours * 60;

  const fajrHa = hourAngleForZenith(coords.latitude, declRad, 108); // 90 + 18
  const maghribHa = hourAngleForZenith(coords.latitude, declRad, 90.833);
  const ishaHa = hourAngleForZenith(coords.latitude, declRad, 108); // 90 + 18

  // Asr shadow factor = 1 (Shafi/standard maritime world); angle = acot(1 + tan(|lat - decl|))
  const latDiff = Math.abs(coords.latitude * DEG_TO_RAD - declRad);
  const asrAltRad = Math.atan(1 / (1 + Math.tan(latDiff)));
  const asrZenithDeg = 90 - asrAltRad * RAD_TO_DEG;
  const asrHa = hourAngleForZenith(coords.latitude, declRad, asrZenithDeg);

  const minutesMap: Array<{ name: PrayerName; mins: number }> = [
    { name: 'Fajr', mins: noonLocal - 4 * fajrHa },
    { name: 'Dhuhr', mins: noonLocal + 2 }, // +2 min Zawal safety margin
    { name: 'Asr', mins: noonLocal + 4 * asrHa },
    { name: 'Maghrib', mins: noonLocal + 4 * maghribHa },
    { name: 'Isha', mins: noonLocal + 4 * ishaHa },
  ];

  return minutesMap.map((entry) => ({
    name: entry.name,
    epochMs: dayStartUtcMs + Math.round(entry.mins) * 60_000,
    timeFormatted: formatMinutes12Hour(entry.mins),
  }));
}

/**
 * Resolves the Previous (before), Current (present), and Next (after) prayer times
 * relative to `now`, correctly wrapping across midnight boundaries.
 */
export function resolveSurroundingPrayers(
  now: Date,
  coords: MaritimeCoords = DEFAULT_SYLHET_COORDS
): SurroundingPrayers {
  const { year, month, day, dayStartUtcMs } = getYmdInOffset(now, coords.utcOffsetHours);

  const prevDate = new Date(Date.UTC(year, month - 1, day - 1));
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

  const yesterdayPrayers = computeDailyPrayersForCivilDay(
    dayStartUtcMs - 86_400_000,
    prevDate.getUTCFullYear(),
    prevDate.getUTCMonth() + 1,
    prevDate.getUTCDate(),
    coords
  );
  const todayPrayers = computeDailyPrayersForCivilDay(
    dayStartUtcMs,
    year,
    month,
    day,
    coords
  );
  const tomorrowPrayers = computeDailyPrayersForCivilDay(
    dayStartUtcMs + 86_400_000,
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth() + 1,
    nextDate.getUTCDate(),
    coords
  );

  const combined = [...yesterdayPrayers, ...todayPrayers, ...tomorrowPrayers];
  const nowMs = now.getTime();

  let currentIndex = 0;
  for (let i = 0; i < combined.length; i += 1) {
    if (combined[i].epochMs <= nowMs) {
      currentIndex = i;
    } else {
      break;
    }
  }

  const prevIdx = Math.max(0, currentIndex - 1);
  const nextIdx = Math.min(combined.length - 1, currentIndex + 1);

  return {
    previous: combined[prevIdx],
    current: combined[currentIndex],
    next: combined[nextIdx],
    allToday: todayPrayers,
  };
}
