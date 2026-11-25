import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Play,
  Radio,
  RotateCcw,
  Square,
  Trophy,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import {
  MORSE_ALPHABET,
  MORSE_CHARS_PER_SET,
  MORSE_TOTAL_MARKS,
  MORSE_TOTAL_SETS,
  buildMorseTransmissionTimeline,
  computeMorseTimings,
  evaluateMorseSetAnswer,
  generateRandomMorseSet,
  sanitizeMorseInput,
  summarizeMorseQuiz,
  type MorseSetResult,
} from '../utils/morseLogic';

interface MorsePracticeModalProps {
  open: boolean;
  onClose: () => void;
}

const REFERENCE_CHARS = Object.keys(MORSE_ALPHABET);

export function MorsePracticeModal({ open, onClose }: MorsePracticeModalProps) {
  // Adjustable sliders: 1 = Very Slow .. 10 = Fast
  const [speedLevel, setSpeedLevel] = useState<number>(4);
  const [gapLevel, setGapLevel] = useState<number>(4);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showReference, setShowReference] = useState<boolean>(false);

  // Quiz state: 12 sets x 5 random characters = 60 marks
  const [currentSetNumber, setCurrentSetNumber] = useState<number>(1);
  const [targetSequence, setTargetSequence] = useState<string>(() =>
    generateRandomMorseSet(MORSE_CHARS_PER_SET)
  );
  const [hasTransmitted, setHasTransmitted] = useState<boolean>(false);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [activeCharProgress, setActiveCharProgress] = useState<number>(0);

  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [currentSetResult, setCurrentSetResult] = useState<MorseSetResult | null>(null);
  const [completedResults, setCompletedResults] = useState<MorseSetResult[]>([]);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Audio & scheduled timeout refs for clean teardown
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const timersRef = useRef<number[]>([]);

  const timings = useMemo(
    () => computeMorseTimings(speedLevel, gapLevel),
    [speedLevel, gapLevel]
  );

  const runningSummary = useMemo(
    () => summarizeMorseQuiz(completedResults),
    [completedResults]
  );

  const stopTransmission = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch {
        // Ignore already-stopped oscillator
      }
      oscillatorRef.current = null;
    }
    setIsTransmitting(false);
    setIsFlashing(false);
  }, []);

  // Cleanup playback whenever modal closes or unmounts
  useEffect(() => {
    if (!open) {
      stopTransmission();
    }
    return () => {
      stopTransmission();
    };
  }, [open, stopTransmission]);

  const startTransmission = useCallback(() => {
    stopTransmission();

    const seq = targetSequence || generateRandomMorseSet(MORSE_CHARS_PER_SET);
    if (!targetSequence) {
      setTargetSequence(seq);
    }

    const timeline = buildMorseTransmissionTimeline(seq, timings);
    setHasTransmitted(true);
    setIsTransmitting(true);
    setActiveCharProgress(1);

    // Schedule Web Audio sidetone pulses cleanly if soundEnabled
    if (soundEnabled && typeof window !== 'undefined') {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioCtx();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(700, ctx.currentTime);

          const baseTime = ctx.currentTime + 0.03;
          gain.gain.setValueAtTime(0.0001, baseTime);

          timeline.events.forEach((ev) => {
            if (ev.type === 'tone') {
              const tStart = baseTime + ev.startMs / 1000;
              const tEnd = baseTime + ev.endMs / 1000;
              const ramp = Math.min(0.006, (tEnd - tStart) * 0.25);
              gain.gain.setValueAtTime(0.0001, tStart);
              gain.gain.linearRampToValueAtTime(0.28, tStart + ramp);
              gain.gain.setValueAtTime(0.28, Math.max(tStart + ramp, tEnd - ramp));
              gain.gain.linearRampToValueAtTime(0.0001, tEnd);
            }
          });

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(baseTime);
          osc.stop(baseTime + timeline.totalDurationMs / 1000 + 0.06);
          oscillatorRef.current = osc;
        }
      } catch {
        // Proceed smoothly with visual white-screen flashing even if browser audio API is unavailable
      }
    }

    // Schedule synchronized white screen flash & character progress indicators
    const scheduledIds: number[] = [];
    const leadInMs = 30;

    timeline.events.forEach((ev) => {
      if (ev.type === 'tone') {
        scheduledIds.push(
          window.setTimeout(() => {
            setIsFlashing(true);
            setActiveCharProgress(ev.charIndex + 1);
          }, leadInMs + ev.startMs)
        );
        scheduledIds.push(
          window.setTimeout(() => {
            setIsFlashing(false);
          }, leadInMs + ev.endMs)
        );
      }
    });

    scheduledIds.push(
      window.setTimeout(() => {
        setIsFlashing(false);
        setIsTransmitting(false);
      }, leadInMs + timeline.totalDurationMs + 40)
    );

    timersRef.current = scheduledIds;
  }, [soundEnabled, stopTransmission, targetSequence, timings]);

  const handleSubmitSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasTransmitted || currentSetResult) return;

    stopTransmission();
    const result = evaluateMorseSetAnswer(currentSetNumber, targetSequence, typedAnswer);
    setCurrentSetResult(result);
    setCompletedResults((prev) => [...prev, result]);
  };

  const handleAdvanceNextSet = () => {
    stopTransmission();
    if (currentSetNumber >= MORSE_TOTAL_SETS) {
      setQuizCompleted(true);
      return;
    }

    setCurrentSetNumber((prev) => prev + 1);
    setTargetSequence(generateRandomMorseSet(MORSE_CHARS_PER_SET));
    setTypedAnswer('');
    setCurrentSetResult(null);
    setHasTransmitted(false);
    setActiveCharProgress(0);
  };

  const handleRestartQuiz = () => {
    stopTransmission();
    setCurrentSetNumber(1);
    setTargetSequence(generateRandomMorseSet(MORSE_CHARS_PER_SET));
    setTypedAnswer('');
    setCurrentSetResult(null);
    setCompletedResults([]);
    setQuizCompleted(false);
    setHasTransmitted(false);
    setActiveCharProgress(0);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="morse-practice-title"
      data-testid="morse-practice-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#061224]/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94dvh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#0A192F] text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/50 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-[#D8B979]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="morse-practice-title" className="font-display text-base sm:text-lg font-bold text-white">
                Aldis Lamp &amp; Sound Morse Practice
              </h2>
              <p className="text-[11px] font-mono text-slate-300">
                ITU Morse (A–Z &amp; 0–9 Only) · {MORSE_TOTAL_SETS} Sets × {MORSE_CHARS_PER_SET} Flashes = {MORSE_TOTAL_MARKS} Marks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 font-mono text-xs tabular-nums">
              <span className="text-slate-300">Set </span>
              <strong data-testid="morse-set-counter" className="text-white">
                {currentSetNumber}/{MORSE_TOTAL_SETS}
              </strong>
              <span className="mx-2 text-white/30">|</span>
              <span className="text-slate-300">Score </span>
              <strong data-testid="morse-score-counter" className="text-[#2DD4BF]">
                {runningSummary.totalMarksAwarded}/{MORSE_TOTAL_MARKS}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-label={soundEnabled ? 'Mute Morse tone sound' : 'Enable Morse tone sound'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                  : 'bg-slate-700/60 border-slate-500/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopTransmission();
                onClose();
              }}
              aria-label="Close Morse practice"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {quizCompleted ? (
            /* FINAL 60-MARK SUMMARY REPORT */
            <div data-testid="morse-final-summary" className="space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#0A192F] via-[#102A43] to-[#134E4A] p-6 text-white text-center border border-[#C5A059]/40">
                <Trophy className="w-11 h-11 text-[#FBBF24] mx-auto mb-3" aria-hidden="true" />
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#D8B979]">
                  12-Set Examination Completed
                </p>
                <h3 className="mt-1 font-display text-3xl font-extrabold">
                  {runningSummary.totalMarksAwarded} / {MORSE_TOTAL_MARKS} Marks
                </h3>
                <p className="mt-2 text-sm text-slate-200">
                  Accuracy: <strong className="text-[#2DD4BF]">{runningSummary.accuracyPercent}%</strong> ·{' '}
                  {runningSummary.totalMarksAwarded} Correct · {runningSummary.totalWrong} Wrong
                </p>

                <button
                  type="button"
                  onClick={handleRestartQuiz}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Start New 12-Set Practice
                </button>
              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-[#E2E8F0]">
                  <h4 className="font-display text-sm font-bold text-[#0A192F]">
                    Full Transmission Log (Sets 1–12)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                  {completedResults.map((res) => (
                    <div
                      key={res.setNumber}
                      className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-mono text-[11px] text-slate-500">Set {res.setNumber}</p>
                        <p className="font-mono text-sm font-bold text-[#0A192F] tracking-widest">
                          {res.target}
                        </p>
                        <p className="font-mono text-xs text-slate-600">
                          Typed: <span className="font-semibold">{res.typed || '-----'}</span>
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                          res.correctCount === MORSE_CHARS_PER_SET
                            ? 'bg-emerald-100 text-emerald-800'
                            : res.correctCount >= 3
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {res.correctCount}/{res.totalChars}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT ZONE: Dedicated White-Flash Signal Lamp + Speed & Gap Delay Sliders */}
              <div className="lg:col-span-6 space-y-4">
                {/* Dedicated White Flash Signal Lamp Screen */}
                <div
                  data-testid="morse-flash-screen"
                  data-flashing={isFlashing ? 'true' : 'false'}
                  className={`relative h-56 sm:h-64 rounded-2xl border-2 flex flex-col items-center justify-center p-6 text-center transition-none select-none overflow-hidden ${
                    isFlashing
                      ? 'bg-[#FFFFFF] text-[#0A192F] border-[#0EA5E9] shadow-[0_0_55px_rgba(255,255,255,0.95)]'
                      : 'bg-[#070E1A] text-white border-slate-700 shadow-inner'
                  }`}
                >
                  {/* Subtle signal lens aperture ring */}
                  <div
                    aria-hidden="true"
                    className={`w-28 h-28 rounded-full border-2 flex items-center justify-center ${
                      isFlashing
                        ? 'border-[#0A192F]/25 bg-white shadow-[0_0_40px_#FFFFFF]'
                        : 'border-slate-600/70 bg-[#0D192B]'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-full ${
                        isFlashing ? 'bg-[#FFFFFF] ring-4 ring-[#0284C7]/40' : 'bg-slate-800/80'
                      }`}
                    />
                  </div>

                  <p
                    className={`mt-4 font-mono text-xs font-bold uppercase tracking-[0.16em] ${
                      isFlashing ? 'text-[#0A192F]' : 'text-slate-300'
                    }`}
                  >
                    {isFlashing
                      ? `SIGNAL ON — CHAR ${activeCharProgress} / ${MORSE_CHARS_PER_SET}`
                      : isTransmitting
                      ? `TRANSMITTING CHAR ${activeCharProgress} / ${MORSE_CHARS_PER_SET}...`
                      : hasTransmitted
                      ? 'Transmission Complete — Type Answer'
                      : `Press Start Flash for Set ${currentSetNumber}`}
                  </p>

                  {/* Non-spoiler 5-char progress dots */}
                  <div className="mt-2.5 flex items-center gap-2" aria-hidden="true">
                    {Array.from({ length: MORSE_CHARS_PER_SET }).map((_, idx) => {
                      const reached = isTransmitting && idx + 1 <= activeCharProgress;
                      return (
                        <span
                          key={idx}
                          className={`w-2.5 h-2.5 rounded-full border ${
                            isFlashing && idx + 1 === activeCharProgress
                              ? 'bg-[#0A192F] border-[#0A192F]'
                              : reached
                              ? 'bg-[#2DD4BF] border-[#2DD4BF]'
                              : isFlashing
                              ? 'border-[#0A192F]/40'
                              : 'border-slate-600'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Flash Playback Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    data-testid="morse-start-btn"
                    onClick={startTransmission}
                    disabled={Boolean(currentSetResult)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-45 transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
                    {hasTransmitted
                      ? `Replay Set ${currentSetNumber} Flash`
                      : `Start Set ${currentSetNumber} Flash`}
                  </button>

                  {isTransmitting && (
                    <button
                      type="button"
                      data-testid="morse-stop-btn"
                      onClick={stopTransmission}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                      Stop
                    </button>
                  )}
                </div>

                {/* Adjustable Sliders: Speed + Gap Delay (Very Slow -> Fast) */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
                  {/* Morse Speed Slider */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label htmlFor="morse-speed-slider" className="text-xs font-bold text-[#0A192F]">
                        Morse Flash Speed
                      </label>
                      <span className="font-mono text-[11px] font-semibold text-[#0D9488] tabular-nums">
                        {timings.speedLabel} · ~{timings.wpmEstimate} WPM ({timings.dotMs}ms dot)
                      </span>
                    </div>
                    <input
                      id="morse-speed-slider"
                      data-testid="morse-speed-slider"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={speedLevel}
                      onChange={(e) => setSpeedLevel(Number(e.target.value))}
                      className="w-full accent-[#0A192F] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>Very Slow</span>
                      <span>Moderate</span>
                      <span>Fast</span>
                    </div>
                  </div>

                  {/* Gap Delay Slider */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label htmlFor="morse-gap-slider" className="text-xs font-bold text-[#0A192F]">
                        Gap Delay Between Characters / Words
                      </label>
                      <span className="font-mono text-[11px] font-semibold text-[#806127] tabular-nums">
                        {timings.gapLabel} · {timings.letterGapMs}ms pause
                      </span>
                    </div>
                    <input
                      id="morse-gap-slider"
                      data-testid="morse-gap-slider"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={gapLevel}
                      onChange={(e) => setGapLevel(Number(e.target.value))}
                      className="w-full accent-[#806127] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>Very Slow (Long Gap)</span>
                      <span>Moderate</span>
                      <span>Fast (Short Gap)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT ZONE: Answer Entry + Immediate Per-Set Correct/Wrong Result Breakdown */}
              <div className="lg:col-span-6 space-y-4">
                <form
                  onSubmit={handleSubmitSet}
                  className="p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] bg-white space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold text-[#0A192F]">
                      Set {currentSetNumber} Answer ({MORSE_CHARS_PER_SET} Characters)
                    </h3>
                    <span className="font-mono text-[11px] text-slate-500">5 Marks</span>
                  </div>

                  <div>
                    <label
                      htmlFor="morse-answer-input"
                      className="block text-xs font-semibold text-slate-600 mb-1.5"
                    >
                      Type the 5 characters transmitted (A–Z and 0–9 only)
                    </label>
                    <input
                      id="morse-answer-input"
                      data-testid="morse-answer-input"
                      type="text"
                      maxLength={MORSE_CHARS_PER_SET}
                      disabled={Boolean(currentSetResult)}
                      value={typedAnswer}
                      onChange={(e) =>
                        setTypedAnswer(sanitizeMorseInput(e.target.value, MORSE_CHARS_PER_SET))
                      }
                      placeholder="e.g. A7K2M"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3 sm:px-4 py-3 rounded-xl border border-[#CBD5E1] font-mono text-lg sm:text-xl font-bold uppercase tracking-[0.25em] sm:tracking-[0.45em] text-center text-[#0A192F] focus:outline-none focus:ring-2 focus:ring-[#0A192F] disabled:bg-slate-50"
                    />
                  </div>

                  {!currentSetResult && (
                    <button
                      type="submit"
                      data-testid="morse-submit-btn"
                      disabled={!hasTransmitted}
                      className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] disabled:opacity-45 transition-colors cursor-pointer"
                    >
                      {hasTransmitted
                        ? `Submit & Check Set ${currentSetNumber}`
                        : 'Start Flash First to Submit'}
                    </button>
                  )}
                </form>

                {/* Per-Set Result Panel Immediately After 5-Flash Transmission */}
                {currentSetResult && (
                  <div
                    data-testid="morse-set-result"
                    className="p-4 sm:p-5 rounded-2xl border-2 border-[#0A192F]/15 bg-[#F8FAFC] space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-display text-sm font-bold text-[#0A192F]">
                        Set {currentSetResult.setNumber} Check Result
                      </h4>
                      <div className="flex items-center gap-2 font-mono text-xs font-bold">
                        <span
                          data-testid="morse-set-correct-count"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {currentSetResult.correctCount} Correct
                        </span>
                        <span
                          data-testid="morse-set-wrong-count"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800"
                        >
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          {currentSetResult.wrongCount} Wrong
                        </span>
                      </div>
                    </div>

                    {/* Side-by-Side 5-Character Comparison Grid */}
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
                      {currentSetResult.perChar.map((item) => (
                        <div
                          key={item.index}
                          className={`rounded-xl p-1.5 sm:p-2 border ${
                            item.isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-rose-50 border-rose-300 text-rose-900'
                          }`}
                        >
                          <p className="font-mono text-[10px] uppercase text-slate-500">
                            #{item.index + 1}
                          </p>
                          <p className="font-mono text-base sm:text-lg font-extrabold mt-0.5">{item.expected}</p>
                          <p className="font-mono text-[11px] mt-1">
                            You:{' '}
                            <span className="font-bold">
                              {item.actual || '—'}
                            </span>
                          </p>
                          <p className="text-[10px] font-semibold mt-0.5">
                            {item.isCorrect ? 'Match' : 'Miss'}
                          </p>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      data-testid="morse-next-btn"
                      onClick={handleAdvanceNextSet}
                      className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[#0A192F] hover:bg-[#112240] transition-colors cursor-pointer"
                    >
                      {currentSetNumber < MORSE_TOTAL_SETS
                        ? `Next Set (Set ${currentSetNumber + 1} of ${MORSE_TOTAL_SETS}) →`
                        : 'View Final 60-Mark Report →'}
                    </button>
                  </div>
                )}

                {/* Collapsible ITU Reference Chart (A–Z, 0–9) */}
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowReference((prev) => !prev)}
                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-[#0A192F] transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      {showReference ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      ITU Morse Code Reference Sheet (A–Z &amp; 0–9)
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {showReference ? 'Hide' : 'Show'}
                    </span>
                  </button>
                  {showReference && (
                    <div className="p-3 bg-white grid grid-cols-3 sm:grid-cols-6 gap-1.5 max-h-44 overflow-y-auto">
                      {REFERENCE_CHARS.map((ch) => (
                        <div
                          key={ch}
                          className="px-2 py-1 rounded border border-slate-200 bg-slate-50 flex items-center justify-between font-mono text-[11px]"
                        >
                          <strong className="text-[#0A192F]">{ch}</strong>
                          <span className="text-[#806127] font-bold">{MORSE_ALPHABET[ch]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
