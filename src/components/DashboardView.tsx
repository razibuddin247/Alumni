import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Compass,
  CreditCard,
  Edit3,
  Globe,
  LocateFixed,
  Mail,
  MapPin,
  Moon,
  Sunrise,
  Sunset,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortal } from '../context/PortalContext';
import { useHistoryOverlay } from '../hooks/useHistoryOverlay';
import type { PortalTab } from '../types/portal';
import {
  DEFAULT_SYLHET_COORDS,
  computeSolarTimesForDate,
  formatGmtTime,
  resolveSurroundingPrayers,
  type MaritimeCoords,
} from '../utils/maritimeAstro';
import {
  calculateSeaTime,
  cleanBatchLabel,
  formatLatLongReadout,
  summarizeMemberCertificates,
} from '../utils/portalLogic';
import { DigitalIdCard } from './DigitalIdCard';
import { AvatarPhoto } from './AvatarPhoto';
import { CvPreviewModal } from './CvPreviewModal';

interface DashboardViewProps {
  onSelectTab: (tab: PortalTab) => void;
}

export function DashboardView({ onSelectTab }: DashboardViewProps) {
  const {
    needsEmailVerification,
    currentUserProfile,
    currentUserVault,
    currentUserCopCertificates,
    currentUserVoyages,
    resendVerificationEmail,
    refreshAuthVerification,
  } = usePortal();

  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [checkingVerify, setCheckingVerify] = useState(false);
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [astroModalOpen, setAstroModalOpen] = useState(false);
  const [coords, setCoords] = useState<MaritimeCoords>(DEFAULT_SYLHET_COORDS);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  useHistoryOverlay(idModalOpen, 'digital-id-modal', () => setIdModalOpen(false));
  useHistoryOverlay(astroModalOpen, 'maritime-astro-modal', () => setAstroModalOpen(false));

  useEffect(() => {
    if (!idModalOpen && !astroModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIdModalOpen(false);
        setAstroModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [idModalOpen, astroModalOpen]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const solar = useMemo(() => computeSolarTimesForDate(now, coords), [now, coords]);
  const gmtClock = useMemo(() => formatGmtTime(now), [now]);
  const prayers = useMemo(() => resolveSurroundingPrayers(now, coords), [now, coords]);
  const formattedCoords = useMemo(
    () => formatLatLongReadout(coords.latitude, coords.longitude),
    [coords.latitude, coords.longitude]
  );

  if (!currentUserProfile) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center flex-1 flex items-center justify-center bg-[#F4F6FB] text-[#0F172A]">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <p className="text-sm text-slate-600">Loading your BMASA member credential...</p>
        </div>
      </main>
    );
  }

  const seaTime = calculateSeaTime(currentUserVoyages);
  const certSummary = summarizeMemberCertificates(
    currentUserVault,
    currentUserCopCertificates
  );
  const expiringOrExpiredCount =
    certSummary.expiredCount + certSummary.expiringSoonCount;

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      setVerifyNotice('Verification email sent. Check your inbox, then click Refresh Status.');
    } catch {
      setVerifyNotice('Unable to resend verification email right now. Try again shortly.');
    }
  };

  const handleRefreshVerify = async () => {
    setCheckingVerify(true);
    try {
      const ok = await refreshAuthVerification();
      setVerifyNotice(
        ok
          ? 'Email verified! Your profile is now synced with Cloud Firestore.'
          : 'Email is not marked verified yet. Open the verification link in your inbox first.'
      );
    } finally {
      setCheckingVerify(false);
    }
  };

  const handleSyncGpsCoords = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('Browser geolocation unavailable. Using Sylhet Port coordinates.');
      return;
    }
    setGeoStatus('Locating vessel / browser coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const offsetHours = -new Date().getTimezoneOffset() / 60;
        setCoords({
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
          label: `Live Position (${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°)`,
          utcOffsetHours: offsetHours,
        });
        setGeoStatus('Updated to your current device GPS coordinates.');
      },
      () => {
        setGeoStatus('Location permission declined. Continuing with Sylhet Port (BMAS).');
      },
      { timeout: 6000 }
    );
  };

  return (
    <main className="relative flex-1 min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)] flex flex-col justify-between overflow-x-clip bg-[#071324] text-white">
      {/* Attached Twilight Water Horizon Background Image */}
      <img
        src="/assets/aistudio/image_7b031106.png"
        alt="Serene twilight sea horizon background"
        data-testid="dashboard-bg-lighthouse"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
      />

      {/* Main Single-Page Container (Previous Layout & Placing) */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 flex-1 min-h-0 flex flex-col justify-between py-4 sm:py-6">
        {needsEmailVerification && (
          <div
            role="status"
            className="w-full mb-3 bg-slate-900/80 backdrop-blur-md border border-amber-400/50 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-100 shadow-xl"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <p className="text-xs truncate">
                {verifyNotice ||
                  'Verify your email address to enable profile, voyage, and directory cloud updates.'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResend}
                className="px-3 py-1 text-xs font-semibold text-slate-900 bg-amber-300 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Resend Link
              </button>
              <button
                type="button"
                disabled={checkingVerify}
                onClick={handleRefreshVerify}
                className="px-3 py-1 text-xs font-semibold text-white bg-white/20 border border-white/30 hover:bg-white/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {checkingVerify ? 'Checking...' : 'Refresh Status'}
              </button>
            </div>
          </div>
        )}

        {/* Left Editorial Hero Column (Directly on Background, No Border) */}
        <div className="flex-1 flex items-center my-auto max-w-xl py-2 sm:py-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full text-white space-y-4 sm:space-y-5"
          >
            <div className="space-y-3 sm:space-y-4 w-full">
              <p className="text-[11px] sm:text-sm font-mono tracking-widest text-[#FDE68A] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                Bangladesh Marine Academy Sylhet Alumni Association
              </p>

              <div className="flex items-center gap-3.5 sm:gap-5">
                <AvatarPhoto
                  src={currentUserProfile.photoUrl}
                  name={currentUserProfile.fullName}
                  sizeClass="w-14 h-14 sm:w-20 sm:h-20"
                  roundedClass="rounded-full shadow-2xl shrink-0"
                />

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-[#5EEAD4] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                    Welcome aboard,
                  </p>
                  <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-white tracking-[-0.03em] leading-[1.08] text-balance break-words drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    {currentUserProfile.fullName}
                  </h1>
                </div>
              </div>
            </div>

            {/* Credential Metadata directly on Background */}
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              <p className="font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                <span>{currentUserProfile.currentRank}</span>
                <span className="mx-2 text-[#FDE68A]" aria-hidden="true">·</span>
                <span>
                  {currentUserProfile.department === 'Instructors'
                    ? 'Instructors Faculty'
                    : `${currentUserProfile.department} Branch`}
                </span>
                <span className="mx-2 text-[#FDE68A]" aria-hidden="true">·</span>
                <span>{cleanBatchLabel(currentUserProfile.batch)}</span>
              </p>
              <p className="text-xs text-slate-200 flex flex-wrap items-center gap-x-2 gap-y-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                <span>
                  {currentUserProfile.department === 'Instructors' ? 'Faculty ID' : 'Cadet'}{' '}
                  <span className="font-mono font-semibold text-white">{currentUserProfile.cadetNumber}</span>
                </span>
                <span className="text-[#FDE68A]" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-200">
                  Sea Service: {seaTime.formattedYmd}
                </span>
                <span className="text-[#FDE68A]" aria-hidden="true">·</span>
                <span
                  className={
                    currentUserProfile.isVerified
                      ? 'text-emerald-300 font-semibold'
                      : 'text-amber-300 font-semibold'
                  }
                >
                  {currentUserProfile.isVerified ? 'Verified BMASA Member' : 'Pending Verification'}
                </span>
              </p>

              {expiringOrExpiredCount > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectTab('profile')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors pt-0.5 cursor-pointer drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {expiringOrExpiredCount} certificate{expiringOrExpiredCount === 1 ? '' : 's'} due for renewal
                  </span>
                </button>
              )}
            </div>

            {/* Action Buttons (Borderless) */}
            <div className="pt-1 w-full flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIdModalOpen(true)}
                className="w-full min-[480px]:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-full text-sm font-semibold text-[#0A192F] bg-[#FDE68A] hover:bg-[#FBBF24] shadow-xl transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-[#0A192F]" aria-hidden="true" />
                View Digital ID Card
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('profile')}
                className="w-full min-[480px]:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-full text-sm font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#FDE68A]" aria-hidden="true" />
                Edit Profile &amp; Voyages
              </button>
            </div>

            {/* GPS Position Strip (Directly on Background, No Border) */}
            <div
              data-testid="dashboard-latlong"
              className="w-full sm:w-auto inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 py-1 text-xs text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
            >
              <span className="inline-flex flex-wrap items-center gap-1.5 font-mono font-semibold text-white tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                <MapPin className="w-3.5 h-3.5 text-[#FDE68A] shrink-0" aria-hidden="true" />
                <span>LAT {formattedCoords.latFormatted}</span>
                <span className="text-white/40" aria-hidden="true">·</span>
                <span>LONG {formattedCoords.lonFormatted}</span>
              </span>
              <span className="text-[11px] text-slate-200">{coords.label}</span>
              <button
                type="button"
                onClick={handleSyncGpsCoords}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 font-mono text-[10px] font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LocateFixed className="w-3 h-3 text-[#FDE68A]" aria-hidden="true" />
                Update GPS
              </button>
              {geoStatus && (
                <span className="text-[10px] text-slate-200 w-full sm:w-auto">
                  {geoStatus}
                </span>
              )}
            </div>
          </motion.div>
        </div>

        {/* 6-Button Maritime Solar, GMT & Prayer Footer Bar (Directly on Background, No Border) */}
        <footer
          aria-label="Maritime solar, GMT clock, and daily prayer times"
          data-testid="dashboard-astro-footer"
          className="w-full pt-3 pb-1 flex flex-col lg:flex-row lg:items-end justify-between gap-2 sm:gap-3"
        >
          {/* LEFT 3 BUTTONS: Sunrise | Sunset | GMT Time */}
          <div
            data-testid="footer-left-solar-group"
            className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full lg:w-auto"
          >
            {/* 1. Sunrise */}
            <button
              type="button"
              data-testid="footer-btn-sunrise"
              onClick={() => setAstroModalOpen(true)}
              className="group flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl bg-black/30 hover:bg-black/45 backdrop-blur-md shadow-lg text-left transition-all cursor-pointer min-w-0"
            >
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-amber-500/25 items-center justify-center shrink-0">
                <Sunrise className="w-4 h-4 text-amber-200" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-200 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                  <Sunrise className="w-3 h-3 text-amber-200 sm:hidden shrink-0" aria-hidden="true" />
                  <span>Sunrise</span>
                </p>
                <p className="mt-1 font-mono text-[11px] sm:text-sm font-bold text-white tabular-nums truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {solar.sunriseFormatted}
                </p>
              </div>
            </button>

            {/* 2. Sunset */}
            <button
              type="button"
              data-testid="footer-btn-sunset"
              onClick={() => setAstroModalOpen(true)}
              className="group flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl bg-black/30 hover:bg-black/45 backdrop-blur-md shadow-lg text-left transition-all cursor-pointer min-w-0"
            >
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-orange-500/25 items-center justify-center shrink-0">
                <Sunset className="w-4 h-4 text-orange-200" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-200 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                  <Sunset className="w-3 h-3 text-orange-200 sm:hidden shrink-0" aria-hidden="true" />
                  <span>Sunset</span>
                </p>
                <p className="mt-1 font-mono text-[11px] sm:text-sm font-bold text-white tabular-nums truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {solar.sunsetFormatted}
                </p>
              </div>
            </button>

            {/* 3. GMT Time */}
            <button
              type="button"
              data-testid="footer-btn-gmt"
              onClick={() => setAstroModalOpen(true)}
              className="group flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl bg-black/30 hover:bg-black/45 backdrop-blur-md shadow-lg text-left transition-all cursor-pointer min-w-0"
            >
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-white/15 items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-[#5EEAD4]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-200 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                  <Globe className="w-3 h-3 text-[#5EEAD4] sm:hidden shrink-0" aria-hidden="true" />
                  <span>GMT Time</span>
                </p>
                <p className="mt-1 font-mono text-[11px] sm:text-sm font-bold text-white tabular-nums truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {gmtClock}
                </p>
              </div>
            </button>
          </div>

          {/* RIGHT 3 BUTTONS: Before Prayer | Present Prayer | Next Prayer */}
          <div
            data-testid="footer-right-prayer-group"
            className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full lg:w-auto"
          >
            {/* 4. Before Prayer */}
            <button
              type="button"
              data-testid="footer-btn-prayer-before"
              onClick={() => setAstroModalOpen(true)}
              className="flex flex-col justify-center px-3 py-2 rounded-xl bg-black/30 hover:bg-black/45 backdrop-blur-md shadow-lg text-left transition-all cursor-pointer min-w-0"
            >
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wide sm:tracking-wider text-slate-200 leading-none truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                Before · {prayers.previous.name}
              </span>
              <span className="mt-1 font-mono text-xs sm:text-sm font-semibold text-white tabular-nums truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {prayers.previous.timeFormatted}
              </span>
            </button>

            {/* 5. Present Prayer (Gleaming Highlight, No Border) */}
            <button
              type="button"
              data-testid="footer-btn-prayer-present"
              onClick={() => setAstroModalOpen(true)}
              className="flex flex-col justify-center px-3 sm:px-3.5 py-2 rounded-xl bg-amber-400/30 hover:bg-amber-400/40 backdrop-blur-md shadow-[0_4px_20px_rgba(253,230,138,0.25)] text-left transition-all cursor-pointer min-w-0"
            >
              <span className="inline-flex items-center gap-1 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wide sm:tracking-wider text-[#FDE68A] leading-none whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                <Moon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FDE68A] shrink-0" aria-hidden="true" />
                <span className="sm:hidden">Now · {prayers.current.name}</span>
                <span className="hidden sm:inline">Present · {prayers.current.name}</span>
              </span>
              <span className="mt-1 font-mono text-xs sm:text-sm font-extrabold text-white tabular-nums truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {prayers.current.timeFormatted}
              </span>
            </button>

            {/* 6. After Prayer */}
            <button
              type="button"
              data-testid="footer-btn-prayer-after"
              onClick={() => setAstroModalOpen(true)}
              className="flex flex-col justify-center px-3 py-2 rounded-xl bg-black/30 hover:bg-black/45 backdrop-blur-md shadow-lg text-left transition-all cursor-pointer min-w-0"
            >
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wide sm:tracking-wider text-slate-200 leading-none truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                Next · {prayers.next.name}
              </span>
              <span className="mt-1 font-mono text-xs sm:text-sm font-semibold text-white tabular-nums truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {prayers.next.timeFormatted}
              </span>
            </button>
          </div>
        </footer>
      </div>

      {/* Full Digital ID Card Modal (Light Theme) */}
      <AnimatePresence>
        {idModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-2xl bg-[#F8FAFC] text-[#0A192F] border border-amber-400/60 rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-amber-700" aria-hidden="true" />
                  <h3 className="font-display font-bold text-[#0A192F] text-base">
                    Official Digital Alumni ID Card (CR80 Print-Ready)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIdModalOpen(false)}
                  aria-label="Close Digital ID Card"
                  className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-[#0A192F] transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="my-2 flex justify-center">
                <DigitalIdCard
                  member={currentUserProfile}
                  showActions={true}
                  onDownloadCv={() => setCvModalOpen(true)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CvPreviewModal
        open={cvModalOpen}
        onClose={() => setCvModalOpen(false)}
        profile={currentUserProfile}
        vault={currentUserVault}
        voyages={currentUserVoyages}
        copCertificates={currentUserCopCertificates}
      />

      {/* Maritime Solar, GMT & Daily Prayer Schedule Modal */}
      <AnimatePresence>
        {astroModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="maritime-astro-modal-title"
            data-testid="maritime-astro-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/45 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xl text-[#0F172A] space-y-5 max-h-[92dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-5 h-5 text-amber-700" aria-hidden="true" />
                  <div>
                    <h3 id="maritime-astro-modal-title" className="font-display font-bold text-base text-[#0A192F]">
                      Maritime Solar, GMT &amp; Prayer Times
                    </h3>
                    <p className="font-mono text-[11px] text-slate-500">
                      {coords.label} · UTC{coords.utcOffsetHours >= 0 ? `+${coords.utcOffsetHours}` : coords.utcOffsetHours}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAstroModalOpen(false)}
                  aria-label="Close maritime schedule"
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#0A192F] transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Solar & GMT Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="font-mono text-[10px] uppercase text-amber-700 font-semibold">Sunrise</p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#0F172A] tabular-nums">{solar.sunriseFormatted}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="font-mono text-[10px] uppercase text-orange-700 font-semibold">Sunset</p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#0F172A] tabular-nums">{solar.sunsetFormatted}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="font-mono text-[10px] uppercase text-[#0A192F] font-semibold">GMT UTC</p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#0F172A] tabular-nums">{gmtClock}</p>
                </div>
              </div>

              {/* All 5 Daily Prayers */}
              <div className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Daily Prayer Times
                </p>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden bg-[#F8FAFC]">
                  {prayers.allToday.map((p) => {
                    const isPresent =
                      p.name === prayers.current.name && p.timeFormatted === prayers.current.timeFormatted;
                    return (
                      <div
                        key={p.name}
                        className={`px-4 py-2.5 flex items-center justify-between text-xs ${
                          isPresent ? 'bg-[#FBF8F1] font-bold text-[#0A192F]' : 'text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{p.name}</span>
                          {isPresent && (
                            <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono text-[10px] font-extrabold uppercase">
                              Present
                            </span>
                          )}
                        </span>
                        <span className="font-mono tabular-nums">{p.timeFormatted}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional GPS Sync */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncGpsCoords}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A192F] hover:bg-[#112240] text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                    Sync My Position
                  </button>
                  {coords.label !== DEFAULT_SYLHET_COORDS.label && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoords(DEFAULT_SYLHET_COORDS);
                        setGeoStatus('Reset to Sylhet Port (BMAS).');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#0F172A] transition-colors cursor-pointer"
                    >
                      Reset to Sylhet
                    </button>
                  )}
                </div>
                {geoStatus && <p className="text-[11px] text-slate-600">{geoStatus}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
