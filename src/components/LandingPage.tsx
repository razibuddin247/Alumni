import React, { useRef, useState } from 'react';
import {
  Anchor,
  ArrowRight,
  Briefcase,
  ChevronDown,
  Compass,
  FileCheck,
  Radio,
  ShieldCheck,
  Ship,
  Sparkles,
  Users,
} from 'lucide-react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import maritimeHeroBg from '../assets/images/maritime_hero_bg_1795520960252.jpg';
import bmasShowcaseBg from '../assets/images/bmas_hero_maritime_1795195752663.jpg';
import type { PortalStats } from '../types/portal';

interface LandingPageProps {
  stats: PortalStats;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export function LandingPage({ stats, onOpenAuth }: LandingPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse move parallax coordinates for YouTube Shorts 3D depth effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || typeof window === 'undefined') return;
    if (window.innerWidth < 1024 || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 32; // -16px to 16px parallax shift
    const y = (clientY / innerHeight - 0.5) * 32;
    setMousePos({ x, y });
  };

  // Scroll tracking for cinematic paralax zoom
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 25,
    restDelta: 0.001,
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.08]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.75]);
  const cardRotateX = useTransform(scrollYProgress, [0, 0.25], shouldReduceMotion ? [0, 0] : [15, 0]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-dvh bg-[#040D1A] text-white overflow-x-clip selection:bg-amber-400 selection:text-[#0A192F]"
    >
      {/* Scroll Progress Bar */}
      <motion.div
        style={{ scaleX: smoothProgress }}
        className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0D9488] via-amber-300 to-[#3B82F6] origin-left z-50 pointer-events-none"
      />

      {/* ============================================================ */}
      {/* CINEMATIC PARALLAX BACKGROUND IMAGES & OCEAN WAVE LAYERS */}
      {/* ============================================================ */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Layer 1: Background Copyright-Free Maritime Ocean Ship Photo with Parallax */}
        <motion.div
          style={{
            x: mousePos.x * -0.3,
            y: mousePos.y * -0.3,
            scale: heroScale,
            opacity: heroOpacity,
            backgroundImage: `url(${maritimeHeroBg})`,
          }}
          className="absolute inset-[-40px] bg-cover bg-center bg-no-repeat filter brightness-[0.45] contrast-[1.1] transition-transform duration-150 ease-out"
        />

        {/* Deep Ocean Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040D1A] via-[#0A192F]/70 to-[#040D1A]/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040D1A]/80 via-transparent to-[#040D1A]/80" />

        {/* Floating Light Beams / Glows */}
        <motion.div
          style={{ x: mousePos.x * 1.2, y: mousePos.y * 1.2 }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#0D9488]/20 via-amber-400/15 to-transparent blur-[130px] rounded-full pointer-events-none transition-transform duration-200 ease-out"
        />

        {/* Animated Ocean Wave Surface Waves */}
        <div className="absolute bottom-0 left-0 right-0 h-48 opacity-30 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 w-[200%] flex animate-wave-slow">
            <svg className="w-full h-full text-teal-400/30" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="currentColor">
              <path d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,122.7C960,117,1056,171,1152,197.3C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
            </svg>
            <svg className="w-full h-full text-teal-400/30" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="currentColor">
              <path d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,122.7C960,117,1056,171,1152,197.3C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* YOUTUBE SHORTS STYLE MINIMAL & PUNCHY HERO SECTION */}
      {/* ============================================================ */}
      <motion.section
        style={{
          x: mousePos.x * 0.8,
          y: mousePos.y * 0.8,
        }}
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-24 lg:pt-32 pb-12 sm:pb-16 text-center flex flex-col items-center transition-transform duration-100 ease-out"
      >
        {/* Academy Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-amber-300/30 text-[10px] sm:text-xs font-mono tracking-wider sm:tracking-widest text-amber-200 uppercase mb-5 sm:mb-6 shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>BANGLADESH MARINE ACADEMY SYLHET</span>
        </motion.div>

        {/* Minimal High-Impact Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl"
          style={{ fontSize: 'clamp(1.85rem, 5vw, 4.2rem)', textWrap: 'balance' }}
        >
          Uniting Nautical &amp; Marine Engineering Seafarers Worldwide
        </motion.h1>

        {/* Short Punchy Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-5 sm:mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl text-center font-light"
        >
          The official digital portal for BMASA alumni. Digital ID cards, secure CDC vault,
          CoC mentorship, and live maritime placement berths.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 sm:mt-10 w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4"
        >
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2.5 px-7 sm:px-8 py-3.5 sm:py-4 text-sm font-semibold text-[#040D1A] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:opacity-95 rounded-xl transition-all shadow-[0_10px_30px_rgba(251,191,36,0.3)] whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-95 font-display"
          >
            Member Login
            <ArrowRight className="w-4 h-4 text-[#040D1A]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center px-7 sm:px-8 py-3.5 sm:py-4 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 rounded-xl transition-all whitespace-nowrap shadow-md cursor-pointer hover:border-amber-300/60"
          >
            Register as Alumnus / Cadet
          </button>
        </motion.div>
      </motion.section>

      {/* ============================================================ */}
      {/* 3D FLOATING PARALLAX PRODUCT SHOWCASE CARD (YouTube Shorts style) */}
      {/* ============================================================ */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 perspective-[2000px]">
        <motion.div
          style={{
            rotateX: cardRotateX,
            transformStyle: 'preserve-3d',
            x: mousePos.x * 0.5,
            y: mousePos.y * 0.5,
          }}
          className="relative rounded-2xl sm:rounded-3xl bg-[#0A192F]/80 backdrop-blur-2xl border border-amber-300/30 shadow-[0_30px_100px_rgba(0,0,0,0.6)] overflow-hidden p-5 sm:p-10 lg:p-12 text-center"
        >
          {/* Background Decorative Image Overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url(${bmasShowcaseBg})`,
            }}
          />

          <div className="relative z-10 max-w-2xl mx-auto space-y-5 sm:space-y-6">
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [-6, 6, -6], rotateZ: [-0.5, 0.5, -0.5] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-[#0D9488] flex items-center justify-center mx-auto shadow-xl border border-amber-200/50"
            >
              <Anchor className="w-7 h-7 sm:w-8 sm:h-8 text-[#040D1A]" />
            </motion.div>

            <h2 className="font-display text-xl sm:text-3xl font-bold text-white tracking-tight">
              Verified Digital Credential Vault &amp; Seafarer Hub
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Engineered for Bangladesh Marine Academy Sylhet alumni. Complete security for CDC, Passport,
              sea service records, and CoC mentorship across all intakes starting from the 2nd Batch.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-white/10 text-left">
              <div className="bg-white/5 rounded-xl p-3 sm:p-3.5 border border-white/10">
                <ShieldCheck className="w-5 h-5 text-amber-300 mb-2" />
                <div className="font-bold text-xs text-white">Digital ID</div>
                <div className="text-[10px] text-slate-400">QR Alumni Pass</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 sm:p-3.5 border border-white/10">
                <Ship className="w-5 h-5 text-teal-300 mb-2" />
                <div className="font-bold text-xs text-white">Sea Berths</div>
                <div className="text-[10px] text-slate-400">{stats.activePlacements} active jobs</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 sm:p-3.5 border border-white/10">
                <Radio className="w-5 h-5 text-sky-300 mb-2" />
                <div className="font-bold text-xs text-white">Morse Code</div>
                <div className="text-[10px] text-slate-400">Audio flash trainer</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 sm:p-3.5 border border-white/10">
                <FileCheck className="w-5 h-5 text-rose-300 mb-2" />
                <div className="font-bold text-xs text-white">Auto CV</div>
                <div className="text-[10px] text-slate-400">Instant PDF export</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER WITH DEVELOPER ATTRIBUTION */}
      {/* ============================================================ */}
      <footer className="relative z-10 bg-[#02060D] text-stone-400 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Anchor className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              © {new Date().getFullYear()} Bangladesh Marine Academy Sylhet Alumni Association (BMASA).
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-xs max-w-full">
            <div className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-3 py-1.5 rounded-2xl sm:rounded-full bg-white/5 border border-white/15 text-stone-300 shadow-xs">
              <span className="text-slate-400">Developed by:</span>
              <span className="font-bold text-amber-200 tracking-wide">MD RAZIB UDDIN</span>
              <span className="text-stone-500 hidden min-[360px]:inline">|</span>
              <span className="font-mono text-[11px] text-sky-300 font-semibold">CDC: C/O/12247</span>
            </div>
            <p className="font-mono text-[11px] text-stone-500 hidden lg:inline">
              Sylhet · Bangladesh · Nautical &amp; Marine Engineering
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
