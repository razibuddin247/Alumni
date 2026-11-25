export const MORSE_TOTAL_SETS = 12;
export const MORSE_CHARS_PER_SET = 5;
export const MORSE_TOTAL_MARKS = MORSE_TOTAL_SETS * MORSE_CHARS_PER_SET;

export const MORSE_ALPHABET: Readonly<Record<string, string>> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
};

export const MORSE_ALLOWED_CHARS = Object.keys(MORSE_ALPHABET);

export interface MorseTimings {
  dotMs: number;
  dashMs: number;
  elementGapMs: number;
  letterGapMs: number;
  wpmEstimate: number;
  speedLabel: string;
  gapLabel: string;
}

export interface MorseTimelineEvent {
  type: 'tone' | 'silence';
  startMs: number;
  endMs: number;
  durationMs: number;
  charIndex: number;
  char: string;
  symbol?: '.' | '-';
}

export interface MorseTransmissionTimeline {
  sequence: string;
  events: MorseTimelineEvent[];
  totalDurationMs: number;
}

export interface MorseCharComparison {
  index: number;
  expected: string;
  actual: string;
  isCorrect: boolean;
}

export interface MorseSetResult {
  setNumber: number;
  target: string;
  typed: string;
  correctCount: number;
  wrongCount: number;
  totalChars: number;
  perChar: MorseCharComparison[];
}

export interface MorseQuizSummary {
  setsCompleted: number;
  totalSets: number;
  totalMarksAwarded: number;
  maxMarksPossible: number;
  totalWrong: number;
  accuracyPercent: number;
}

/**
 * Strips any character outside [A-Z0-9] and uppercases the result.
 */
export function sanitizeMorseInput(raw: string, maxLen = MORSE_CHARS_PER_SET): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, Math.max(0, maxLen));
}

/**
 * Generates a random Morse transmission sequence using A-Z and 0-9 only.
 */
export function generateRandomMorseSet(
  length = MORSE_CHARS_PER_SET,
  randomFn: () => number = Math.random
): string {
  const chars = MORSE_ALLOWED_CHARS;
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Math.min(chars.length - 1, Math.floor(randomFn() * chars.length));
    result += chars[idx];
  }
  return result;
}

/**
 * Converts speed level (1 = Very Slow .. 10 = Fast) and gap level (1 = Very Slow .. 10 = Fast)
 * into concrete millisecond durations.
 */
export function computeMorseTimings(speedLevel: number, gapLevel: number): MorseTimings {
  const clampedSpeed = Math.max(1, Math.min(10, Math.round(speedLevel)));
  const clampedGap = Math.max(1, Math.min(10, Math.round(gapLevel)));

  // Speed 1 -> 280ms dot (~4.3 WPM); Speed 10 -> 55ms dot (~21.8 WPM)
  const dotMs = Math.round(280 - ((clampedSpeed - 1) / 9) * (280 - 55));
  const dashMs = dotMs * 3;
  const elementGapMs = dotMs;

  // Gap Delay 1 -> 1800ms (Very Slow); Gap Delay 10 -> 180ms (Fast)
  const rawGapMs = Math.round(1800 - ((clampedGap - 1) / 9) * (1800 - 180));
  const letterGapMs = Math.max(dotMs * 2, rawGapMs);

  const wpmEstimate = Math.round((1200 / dotMs) * 10) / 10;

  const describe = (lvl: number): string => {
    if (lvl <= 2) return 'Very Slow';
    if (lvl <= 4) return 'Slow';
    if (lvl <= 6) return 'Moderate';
    if (lvl <= 8) return 'Brisk';
    return 'Fast';
  };

  return {
    dotMs,
    dashMs,
    elementGapMs,
    letterGapMs,
    wpmEstimate,
    speedLabel: describe(clampedSpeed),
    gapLabel: describe(clampedGap),
  };
}

/**
 * Produces a deterministic timeline of flash/tone and silence intervals
 * for a given A-Z / 0-9 character string.
 */
export function buildMorseTransmissionTimeline(
  sequence: string,
  timings: MorseTimings
): MorseTransmissionTimeline {
  const cleanSeq = sanitizeMorseInput(sequence, sequence.length);
  const events: MorseTimelineEvent[] = [];
  let cursor = 0;

  for (let charIdx = 0; charIdx < cleanSeq.length; charIdx += 1) {
    const ch = cleanSeq[charIdx];
    const code = MORSE_ALPHABET[ch];
    if (!code) continue;

    for (let symIdx = 0; symIdx < code.length; symIdx += 1) {
      const symbol = code[symIdx] as '.' | '-';
      const toneDuration = symbol === '.' ? timings.dotMs : timings.dashMs;
      events.push({
        type: 'tone',
        startMs: cursor,
        endMs: cursor + toneDuration,
        durationMs: toneDuration,
        charIndex: charIdx,
        char: ch,
        symbol,
      });
      cursor += toneDuration;

      if (symIdx < code.length - 1) {
        events.push({
          type: 'silence',
          startMs: cursor,
          endMs: cursor + timings.elementGapMs,
          durationMs: timings.elementGapMs,
          charIndex: charIdx,
          char: ch,
        });
        cursor += timings.elementGapMs;
      }
    }

    if (charIdx < cleanSeq.length - 1) {
      events.push({
        type: 'silence',
        startMs: cursor,
        endMs: cursor + timings.letterGapMs,
        durationMs: timings.letterGapMs,
        charIndex: charIdx,
        char: ch,
      });
      cursor += timings.letterGapMs;
    }
  }

  return {
    sequence: cleanSeq,
    events,
    totalDurationMs: cursor,
  };
}

/**
 * Evaluates a user's answer for a single 5-character set.
 */
export function evaluateMorseSetAnswer(
  setNumber: number,
  targetRaw: string,
  userAnswerRaw: string
): MorseSetResult {
  const target = sanitizeMorseInput(targetRaw, MORSE_CHARS_PER_SET);
  const typed = sanitizeMorseInput(userAnswerRaw, target.length);

  const perChar: MorseCharComparison[] = [];
  let correctCount = 0;
  let wrongCount = 0;

  for (let i = 0; i < target.length; i += 1) {
    const expected = target[i];
    const actual = typed[i] ?? '';
    const isCorrect = expected === actual;
    if (isCorrect) {
      correctCount += 1;
    } else {
      wrongCount += 1;
    }
    perChar.push({
      index: i,
      expected,
      actual,
      isCorrect,
    });
  }

  return {
    setNumber,
    target,
    typed,
    correctCount,
    wrongCount,
    totalChars: target.length,
    perChar,
  };
}

/**
 * Aggregates all completed sets into the 12-set / 60-mark scoreboard.
 */
export function summarizeMorseQuiz(results: MorseSetResult[]): MorseQuizSummary {
  const setsCompleted = results.length;
  const totalMarksAwarded = results.reduce((sum, r) => sum + r.correctCount, 0);
  const totalWrong = results.reduce((sum, r) => sum + r.wrongCount, 0);
  const totalAttemptedChars = results.reduce((sum, r) => sum + r.totalChars, 0);
  const accuracyPercent =
    totalAttemptedChars > 0
      ? Math.round((totalMarksAwarded / totalAttemptedChars) * 100)
      : 0;

  return {
    setsCompleted,
    totalSets: MORSE_TOTAL_SETS,
    totalMarksAwarded,
    maxMarksPossible: MORSE_TOTAL_MARKS,
    totalWrong,
    accuracyPercent,
  };
}
