import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortal } from '../context/PortalContext';

const RING_RADIUS = 76;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const LOADER_DURATION_MS = 1350;

export function SignInLoaderOverlay() {
  const { showSignInLoader, completeSignInLoader } = usePortal();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!showSignInLoader) {
      setProgress(0);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const duration = prefersReducedMotion ? 260 : LOADER_DURATION_MS;
    const startTime = performance.now();
    let rafId = 0;
    let completed = false;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, Math.max(0, elapsed / duration));
      // Smooth cubic ease-out while keeping clockwise cadence legible
      const eased = 1 - Math.pow(1 - ratio, 1.8);
      const pct = Math.min(100, eased * 100);
      setProgress(pct);

      if (ratio < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else if (!completed) {
        completed = true;
        setProgress(100);
        window.setTimeout(() => {
          completeSignInLoader();
        }, 120);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [showSignInLoader, completeSignInLoader]);

  const roundedPercent = Math.round(progress);
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress / 100);
  const sweepDegrees = (progress / 100) * 360;

  return (
    <AnimatePresence>
      {showSignInLoader && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label="Signing in to BMASA Alumni Portal"
          data-testid="signin-clockwise-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 bg-[#061224]/92 backdrop-blur-lg text-white"
        >
          {/* Ambient maritime glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-80 h-80 rounded-full bg-gradient-to-tr from-[#0D9488]/25 via-[#C5A059]/20 to-[#0284C7]/25 blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Circular Clockwise BMASA Crest & Progress Ring */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Outer Clockwise SVG Arc Track */}
              <svg
                viewBox="0 0 180 180"
                className="w-full h-full -rotate-90 drop-shadow-[0_0_24px_rgba(197,160,89,0.35)]"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="bmasaClockwiseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2DD4BF" />
                    <stop offset="50%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                {/* Background circular ring */}
                <circle
                  cx="90"
                  cy="90"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.14)"
                  strokeWidth="9"
                />
                {/* Clockwise fill stroke from 12 o'clock */}
                <circle
                  cx="90"
                  cy="90"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="url(#bmasaClockwiseGrad)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>

              {/* Inner Clockwise Conic Radar Fill + Circular BMASA Logo */}
              <div className="absolute inset-4 rounded-full bg-[#0A192F] border border-[#C5A059]/40 shadow-inner flex items-center justify-center overflow-hidden">
                {/* Clockwise Conic Sweep Fill Inside Logo Seal */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    background: `conic-gradient(from 0deg, rgba(45, 212, 191, 0.85) 0deg, rgba(251, 191, 36, 0.85) ${sweepDegrees}deg, transparent ${sweepDegrees}deg 360deg)`,
                  }}
                />

                {/* Central Circular BMASA Emblem */}
                <div className="relative z-10 w-[84%] h-[84%] rounded-full bg-[#0B1D36]/95 border border-[#C5A059]/50 flex flex-col items-center justify-center text-center px-2 shadow-lg">
                  <svg
                    viewBox="0 0 64 64"
                    className="w-11 h-11 mb-1"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="32" cy="32" r="27" stroke="#C5A059" strokeWidth="2" />
                    <circle cx="32" cy="32" r="21" stroke="#2DD4BF" strokeWidth="1.2" strokeDasharray="3 3" />
                    {/* Compass & Anchor Crest */}
                    <polygon points="32,9 36.5,27 32,23 27.5,27" fill="#FBBF24" />
                    <path
                      d="M32 18V47M22 25H42M20 38C20 44.5 25.4 49 32 49C38.6 49 44 44.5 44 38"
                      stroke="#FFFFFF"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="32" cy="18" r="2.5" fill="#2DD4BF" />
                  </svg>
                  <span className="font-display font-extrabold text-sm tracking-[0.22em] text-white leading-none">
                    BMASA
                  </span>
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#2DD4BF]">
                    Sylhet
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-6 font-mono text-xs uppercase tracking-[0.22em] text-[#D8B979]">
              Verifying Officer Credentials
            </p>
            <p
              data-testid="signin-loader-percent"
              className="mt-1.5 font-mono text-lg font-bold tabular-nums text-white"
            >
              {roundedPercent}%
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
