import { useState } from 'react';
import { Smartphone, Download, CheckCircle, ExternalLink, X, Shield, Zap, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AndroidInstallModal({ isOpen, onClose }: AndroidInstallModalProps) {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="android-install-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-lg bg-[#0A192F] text-white border border-[#D8B979]/40 rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[92dvh] overflow-y-auto space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#D8B979]/20 border border-[#D8B979]/40 flex items-center justify-center text-[#FDE68A] shrink-0">
                <Smartphone className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 id="android-install-title" className="font-display font-bold text-lg sm:text-xl text-white">
                  BMASA for Android
                </h3>
                <p className="text-xs text-slate-300">
                  Install the standalone Android application
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Android install modal"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* App Status & 1-Tap Install */}
          {isInstalled || installSuccess ? (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-3 text-emerald-200">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm text-white">App Installed on Device</p>
                <p className="text-xs text-emerald-300">
                  BMASA is running in standalone mode on your Android device home screen.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-[#0A192F] bg-[#FDE68A] hover:bg-[#FBBF24] shadow-[0_4px_20px_rgba(253,230,138,0.35)] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75"
                >
                  <Download className="w-5 h-5" aria-hidden="true" />
                  {installing ? 'Prompting Android Install...' : '1-Tap Install on Android'}
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <p className="text-xs font-semibold text-[#FDE68A] uppercase tracking-wider">
                    How to install on Android:
                  </p>
                  <ol className="text-xs text-slate-200 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>
                      Open this URL in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on your Android phone.
                    </li>
                    <li>
                      Tap the browser menu <strong>(⋮ 3 dots)</strong> at the top right.
                    </li>
                    <li>
                      Tap <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                    </li>
                    <li>
                      Confirm <strong>&ldquo;Install&rdquo;</strong> — the app will appear in your Android app drawer with its native icon.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Native Android App Capabilities */}
          <div className="space-y-2.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              Android Native Features
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-[#FDE68A]">
                  <Zap className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">Standalone</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Zero browser bars. Operates as an immersive native Android application.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <WifiOff className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">Offline Caching</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Access solar times, cached credentials, and sea logs even at sea without signal.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Shield className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">Home Screen</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  High-res gold anchor icon in your phone&apos;s app launcher with instant access.
                </p>
              </div>
            </div>
          </div>

          {/* Google Play / APK Packaging Info */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#FDE68A]" aria-hidden="true" />
                Want a Play Store .APK or .AAB file?
              </span>
              <a
                href="https://www.pwabuilder.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#FDE68A] hover:underline"
              >
                <span>PWABuilder</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              This app is pre-configured with a valid Web Manifest, Service Worker, and 512px maskable icons. You can paste the live app URL directly into <strong>PWABuilder</strong> or run <strong>bubblewrap init</strong> to package a signed <strong>.apk</strong> or <strong>.aab</strong> for Google Play distribution.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
