import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSolarTimesForDate,
  DEFAULT_SYLHET_COORDS,
  formatGmtTime,
  formatMinutes12Hour,
  resolveSurroundingPrayers,
} from './maritimeAstro';

test('formatMinutes12Hour formats edge midnight/noon cases cleanly', () => {
  assert.equal(formatMinutes12Hour(0), '12:00 AM');
  assert.equal(formatMinutes12Hour(720), '12:00 PM');
  assert.equal(formatMinutes12Hour(375), '06:15 AM');
  assert.equal(formatMinutes12Hour(1055), '05:35 PM');
});

test('formatGmtTime formats live UTC HH:MM:SS GMT', () => {
  const sample = new Date('2026-06-15T09:04:07Z');
  assert.equal(formatGmtTime(sample), '09:04:07 GMT');
});

test('computeSolarTimesForDate produces realistic sunrise and sunset for Sylhet', () => {
  // Equinox in March: sunrise ~5:55-6:15 AM BST, sunset ~5:55-6:15 PM BST
  const marchDate = new Date('2026-03-21T06:00:00Z');
  const solar = computeSolarTimesForDate(marchDate, DEFAULT_SYLHET_COORDS);
  assert.ok(solar.sunriseMinutes > 330 && solar.sunriseMinutes < 400, `Sunrise=${solar.sunriseMinutes}`);
  assert.ok(solar.sunsetMinutes > 1050 && solar.sunsetMinutes < 1120, `Sunset=${solar.sunsetMinutes}`);
  assert.ok(solar.sunsetMinutes > solar.sunriseMinutes);
  assert.match(solar.sunriseFormatted, /AM$/);
  assert.match(solar.sunsetFormatted, /PM$/);
});

test('resolveSurroundingPrayers identifies previous, current, and next prayer chronologically', () => {
  // 13:30 BST (07:30 UTC) in Sylhet -> clearly during Dhuhr window
  const dhuhrMoment = new Date('2026-03-21T07:30:00Z');
  const res = resolveSurroundingPrayers(dhuhrMoment, DEFAULT_SYLHET_COORDS);

  assert.equal(res.previous.name, 'Fajr');
  assert.equal(res.current.name, 'Dhuhr');
  assert.equal(res.next.name, 'Asr');
  assert.ok(res.previous.epochMs < res.current.epochMs);
  assert.ok(res.current.epochMs < res.next.epochMs);
  assert.equal(res.allToday.length, 5);
});

test('resolveSurroundingPrayers wraps smoothly across midnight (pre-Fajr)', () => {
  // 02:00 BST (20:00 UTC previous day) -> between Isha and Fajr
  const lateNight = new Date('2026-03-21T20:00:00Z'); // 2026-03-22 02:00 BST
  const res = resolveSurroundingPrayers(lateNight, DEFAULT_SYLHET_COORDS);

  assert.equal(res.previous.name, 'Maghrib');
  assert.equal(res.current.name, 'Isha');
  assert.equal(res.next.name, 'Fajr');
  assert.ok(res.current.epochMs <= lateNight.getTime());
  assert.ok(res.next.epochMs > lateNight.getTime());
});
