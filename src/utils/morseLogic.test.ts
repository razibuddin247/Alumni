import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMorseTransmissionTimeline,
  computeMorseTimings,
  evaluateMorseSetAnswer,
  generateRandomMorseSet,
  MORSE_ALPHABET,
  MORSE_CHARS_PER_SET,
  MORSE_TOTAL_MARKS,
  MORSE_TOTAL_SETS,
  sanitizeMorseInput,
  summarizeMorseQuiz,
} from './morseLogic';

test('MORSE_ALPHABET covers strictly A-Z and 0-9 (36 characters)', () => {
  const keys = Object.keys(MORSE_ALPHABET);
  assert.equal(keys.length, 36);
  for (const k of keys) {
    assert.match(k, /^[A-Z0-9]$/);
    assert.match(MORSE_ALPHABET[k], /^[.-]+$/);
  }
});

test('generateRandomMorseSet produces 5 characters strictly within A-Z and 0-9', () => {
  for (let i = 0; i < 40; i += 1) {
    const seq = generateRandomMorseSet();
    assert.equal(seq.length, MORSE_CHARS_PER_SET);
    assert.match(seq, /^[A-Z0-9]{5}$/);
  }
});

test('computeMorseTimings scales smoothly from Very Slow (1) to Fast (10)', () => {
  const slow = computeMorseTimings(1, 1);
  const mid = computeMorseTimings(5, 5);
  const fast = computeMorseTimings(10, 10);

  assert.ok(slow.dotMs > mid.dotMs);
  assert.ok(mid.dotMs > fast.dotMs);
  assert.ok(slow.letterGapMs > mid.letterGapMs);
  assert.ok(mid.letterGapMs > fast.letterGapMs);
  assert.equal(slow.dashMs, slow.dotMs * 3);
  assert.equal(slow.speedLabel, 'Very Slow');
  assert.equal(fast.speedLabel, 'Fast');
});

test('buildMorseTransmissionTimeline creates continuous flash/tone timeline', () => {
  const timings = computeMorseTimings(5, 5);
  const timeline = buildMorseTransmissionTimeline('A5', timings);
  // A = .- (dot + gap + dash), gap between A and 5, 5 = ..... (5 dots + 4 element gaps)
  const expectedDuration =
    timings.dotMs +
    timings.elementGapMs +
    timings.dashMs +
    timings.letterGapMs +
    timings.dotMs * 5 +
    timings.elementGapMs * 4;

  assert.equal(timeline.sequence, 'A5');
  assert.equal(timeline.totalDurationMs, expectedDuration);
  assert.equal(timeline.events[0].startMs, 0);
  assert.equal(timeline.events[timeline.events.length - 1].endMs, expectedDuration);
});

test('evaluateMorseSetAnswer compares target vs user input accurately', () => {
  const res = evaluateMorseSetAnswer(1, 'A7K9Z', 'a7x9');
  assert.equal(res.setNumber, 1);
  assert.equal(res.typed, 'A7X9');
  assert.equal(res.correctCount, 3); // A, 7, 9
  assert.equal(res.wrongCount, 2); // X != K, missing Z
  assert.equal(res.perChar[2].isCorrect, false);
  assert.equal(res.perChar[4].actual, '');
  assert.equal(res.perChar[4].isCorrect, false);
});

test('sanitizeMorseInput strips spaces and non-alphanumeric characters', () => {
  assert.equal(sanitizeMorseInput(' a-b! 3@z9x '), 'AB3Z9');
});

test('summarizeMorseQuiz computes total marks out of 60 across 12 sets', () => {
  const sets = Array.from({ length: MORSE_TOTAL_SETS }, (_, idx) =>
    evaluateMorseSetAnswer(idx + 1, 'ABCDE', idx < 10 ? 'ABCDE' : 'ABCXX')
  );
  const summary = summarizeMorseQuiz(sets);
  assert.equal(summary.setsCompleted, 12);
  assert.equal(summary.totalSets, 12);
  assert.equal(summary.maxMarksPossible, MORSE_TOTAL_MARKS);
  assert.equal(summary.maxMarksPossible, 60);
  assert.equal(summary.totalMarksAwarded, 56);
  assert.equal(summary.totalWrong, 4);
  assert.equal(summary.accuracyPercent, 93);
});
