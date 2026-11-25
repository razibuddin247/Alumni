import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Anchor, ArrowRight, Compass, ShieldCheck, Sparkles } from 'lucide-react';
import { usePortal } from '../context/PortalContext';

export function WelcomeOverlay() {
  const { showWelcomeOverlay, dismissWelcomeOverlay, currentUserProfile, isAdmin } = usePortal();

  useEffect(() => {
    if (!showWelcomeOverlay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissWelcomeOverlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => {
      dismissWelcomeOverlay();
    }, 5500);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [showWelcomeOverlay, dismissWelcomeOverlay]);

  return (
    <AnimatePresence>
      {showWelcomeOverlay && currentUserProfile && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bmasa-welcome-heading"
          data-testid="welcome-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-[#04101F]/78 backdrop-blur-md overflow-y-auto"
        >
          {/* Colorful Aurora Rim Wrapper */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md my-auto rounded-3xl p-[2.5px] bg-gradient-to-br from-[#2DD4BF] via-[#FBBF24] via-[#FB7185] to-[#38BDF8] shadow-[0_24px_70px_rgba(14,165,233,0.38)]"
          >
            <div className="relative rounded-[22px] bg-gradient-to-br from-[#0F294A] via-[#124E5B] to-[#1E1B4B] px-5 py-6 sm:px-7 sm:py-8 text-center text-white overflow-y-auto max-h-[92dvh]">
              {/* Colorful Maritime Sunrise & Ocean Glow Orbs */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -left-14 w-44 h-44 rounded-full bg-[#2DD4BF]/30 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#F97316]/30 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 left-1/3 w-48 h-48 rounded-full bg-[#FBBF24]/25 blur-2xl"
              />

              {/* Top Multi-Color Maritime Pennant Strip */}
              <div
                aria-hidden="true"
                className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#2DD4BF] via-[#FBBF24] via-[#F97316] to-[#38BDF8]"
              />

              <div className="relative z-10 flex flex-col items-center">
                {/* Vibrant Circular BMASA Crest */}
                <div className="relative mb-4 p-1 rounded-full bg-gradient-to-tr from-[#2DD4BF] via-[#FBBF24] to-[#FB7185] shadow-lg">
                  <div className="w-16 h-16 rounded-full bg-[#091A32] flex items-center justify-center">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 64 64"
                      className="w-10 h-10"
                      fill="none"
                    >
                      <circle cx="32" cy="32" r="26" stroke="#FBBF24" strokeWidth="2" />
                      <polygon points="32,8 37,26 32,22 27,26" fill="#2DD4BF" />
                      <path
                        d="M32 16V46M22 24H42M20 37C20 43.5 25.4 48 32 48C38.6 48 44 43.5 44 37"
                        stroke="#FFFFFF"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FDE68A] mb-2.5">
                  <Sparkles className="w-3 h-3 text-[#2DD4BF]" aria-hidden="true" />
                  <span>BMASA Alumni &amp; Cadet Portal</span>
                </div>

                <h2
                  id="bmasa-welcome-heading"
                  className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm"
                >
                  Welcome Aboard,{' '}
                  <span className="bg-gradient-to-r from-[#5EEAD4] via-[#FDE047] to-[#FDBA74] bg-clip-text text-transparent">
                    {currentUserProfile.fullName}
                  </span>
                </h2>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0EA5E9]/25 border border-[#38BDF8]/40 text-[#E0F2FE]">
                    <Compass className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
                    {currentUserProfile.currentRank}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10B981]/25 border border-[#34D399]/40 text-[#D1FAE5]">
                    <Anchor className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
                    {currentUserProfile.batch}
                  </span>
                </div>

                <div className="mt-3.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#F59E0B]/25 via-[#EC4899]/20 to-[#14B8A6]/25 border border-[#FBBF24]/50 font-mono text-xs text-[#FEF08A]">
                  <ShieldCheck className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
                  <span>
                    BMASA Serial: {currentUserProfile.memberSerial}
                    {isAdmin ? ' · Executive Admin' : ''}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={dismissWelcomeOverlay}
                  data-testid="welcome-enter-btn"
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-[#0A192F] bg-gradient-to-r from-[#5EEAD4] via-[#FDE047] to-[#FB923C] hover:brightness-105 rounded-xl shadow-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Enter BMASA Portal</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
