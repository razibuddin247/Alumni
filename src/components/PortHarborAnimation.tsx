import { useEffect, useRef, useState } from 'react';
import { Anchor, Pause, Play } from 'lucide-react';
import type { AvailabilityStatus } from '../types/portal';

export type VesselThemeKey = 'navy' | 'teal' | 'gold' | 'slate';

export const VESSEL_THEMES: Record<
  VesselThemeKey,
  {
    label: string;
    hullDark: string;
    hullMid: string;
    hullLight: string;
    accent: string;
    swatch: string;
  }
> = {
  navy: {
    label: 'BMASA Navy',
    hullDark: '#061020',
    hullMid: '#0A192F',
    hullLight: '#1D3458',
    accent: '#C5A059',
    swatch: '#0A192F',
  },
  teal: {
    label: 'Harbor Teal',
    hullDark: '#0F5E59',
    hullMid: '#0D9488',
    hullLight: '#2DD4BF',
    accent: '#0A192F',
    swatch: '#0D9488',
  },
  gold: {
    label: 'Sovereign Gold',
    hullDark: '#806127',
    hullMid: '#C5A059',
    hullLight: '#D8B979',
    accent: '#0A192F',
    swatch: '#C5A059',
  },
  slate: {
    label: 'Merchant Slate',
    hullDark: '#1E293B',
    hullMid: '#334155',
    hullLight: '#64748B',
    accent: '#0D9488',
    swatch: '#334155',
  },
};

interface PortHarborAnimationProps {
  cadetNumber: string;
  memberName: string;
  rank: string;
  availabilityStatus: AvailabilityStatus;
  vesselTheme: VesselThemeKey;
  onOpenIdCard: () => void;
}

interface Point {
  x: number;
  y: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function sampleInboundOutboundShip(progress: number): {
  x: number;
  y: number;
  angle: number;
  scale: number;
  opacity: number;
  phase: 'ARRIVING' | 'BERTHED' | 'DEPARTING';
  moving: boolean;
} {
  const seaEntry: Point = { x: 108, y: 505 };
  const approachTurn: Point = { x: 295, y: 405 };
  const berthDock: Point = { x: 422, y: 334 };
  const departTurn: Point = { x: 585, y: 405 };
  const seaExit: Point = { x: 812, y: 535 };

  if (progress < 0.24) {
    const t = smoothstep(progress / 0.24);
    return {
      x: lerp(seaEntry.x, approachTurn.x, t),
      y: lerp(seaEntry.y, approachTurn.y, t),
      angle: -28,
      scale: lerp(0.84, 0.96, t),
      opacity: clamp(progress / 0.06, 0.08, 1),
      phase: 'ARRIVING',
      moving: true,
    };
  }

  if (progress < 0.38) {
    const t = smoothstep((progress - 0.24) / 0.14);
    return {
      x: lerp(approachTurn.x, berthDock.x, t),
      y: lerp(approachTurn.y, berthDock.y, t),
      angle: lerp(-28, -26, t),
      scale: lerp(0.96, 1, t),
      opacity: 1,
      phase: 'ARRIVING',
      moving: true,
    };
  }

  if (progress < 0.6) {
    const berthBob = Math.sin((progress - 0.38) * Math.PI * 6) * 1.8;
    return {
      x: berthDock.x,
      y: berthDock.y + berthBob,
      angle: -26,
      scale: 1,
      opacity: 1,
      phase: 'BERTHED',
      moving: false,
    };
  }

  if (progress < 0.76) {
    const t = smoothstep((progress - 0.6) / 0.16);
    return {
      x: lerp(berthDock.x, departTurn.x, t),
      y: lerp(berthDock.y, departTurn.y, t),
      angle: lerp(-12, 27, t),
      scale: lerp(1, 0.96, t),
      opacity: 1,
      phase: 'DEPARTING',
      moving: true,
    };
  }

  const t = smoothstep((progress - 0.76) / 0.24);
  const fadeOut = progress > 0.92 ? clamp(1 - (progress - 0.92) / 0.08, 0.05, 1) : 1;
  return {
    x: lerp(departTurn.x, seaExit.x, t),
    y: lerp(departTurn.y, seaExit.y, t),
    angle: 28,
    scale: lerp(0.96, 0.84, t),
    opacity: fadeOut,
    phase: 'DEPARTING',
    moving: true,
  };
}

function sampleOuterChannelShip(progress: number): {
  x: number;
  y: number;
  angle: number;
  scale: number;
  opacity: number;
} {
  const p = (progress + 0.48) % 1;
  const start: Point = { x: 830, y: 612 };
  const mid: Point = { x: 485, y: 540 };
  const end: Point = { x: 96, y: 605 };

  if (p < 0.5) {
    const t = smoothstep(p / 0.5);
    return {
      x: lerp(start.x, mid.x, t),
      y: lerp(start.y, mid.y, t),
      angle: 192,
      scale: lerp(0.68, 0.76, t),
      opacity: p < 0.08 ? clamp(p / 0.08, 0.08, 0.95) : 0.95,
    };
  }
  const t = smoothstep((p - 0.5) / 0.5);
  return {
    x: lerp(mid.x, end.x, t),
    y: lerp(mid.y, end.y, t),
    angle: 170,
    scale: lerp(0.76, 0.66, t),
    opacity: p > 0.9 ? clamp((1 - p) / 0.1, 0.05, 0.95) : 0.95,
  };
}

function formatBerthClock(seconds: number): string {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `00:00:${mins}:${secs}`;
}

export function PortHarborAnimation({
  cadetNumber,
  memberName,
  rank,
  availabilityStatus,
  vesselTheme,
  onOpenIdCard,
}: PortHarborAnimationProps) {
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const cycleRef = useRef(0.42);
  const primaryShipRef = useRef<SVGGElement | null>(null);
  const wakeGroupRef = useRef<SVGGElement | null>(null);
  const outerShipRef = useRef<SVGGElement | null>(null);
  const droneRef = useRef<SVGGElement | null>(null);
  const scanBeamRef = useRef<SVGPolygonElement | null>(null);
  const lighthouseBeaconRef = useRef<SVGCircleElement | null>(null);
  const wave1Ref = useRef<SVGPathElement | null>(null);
  const wave2Ref = useRef<SVGPathElement | null>(null);
  const wave3Ref = useRef<SVGPathElement | null>(null);
  const gatePhaseRef = useRef<SVGTextElement | null>(null);
  const droneClockRef = useRef<SVGTextElement | null>(null);
  const pillPhaseRef = useRef<HTMLSpanElement | null>(null);

  const theme = VESSEL_THEMES[vesselTheme];

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const applyFrame = (cycle: number) => {
      const pShip = sampleInboundOutboundShip(cycle);
      const oShip = sampleOuterChannelShip(cycle);

      if (primaryShipRef.current) {
        primaryShipRef.current.setAttribute(
          'transform',
          `translate(${pShip.x.toFixed(1)}, ${pShip.y.toFixed(1)}) scale(${pShip.scale.toFixed(3)}) rotate(${pShip.angle.toFixed(1)})`
        );
        primaryShipRef.current.setAttribute('opacity', pShip.opacity.toFixed(2));
      }

      if (wakeGroupRef.current) {
        wakeGroupRef.current.setAttribute('opacity', pShip.moving ? '0.82' : '0');
      }

      if (outerShipRef.current) {
        outerShipRef.current.setAttribute(
          'transform',
          `translate(${oShip.x.toFixed(1)}, ${oShip.y.toFixed(1)}) scale(${oShip.scale.toFixed(3)}) rotate(${oShip.angle.toFixed(1)})`
        );
        outerShipRef.current.setAttribute('opacity', oShip.opacity.toFixed(2));
      }

      const droneHoverY = Math.sin(cycle * Math.PI * 8) * 5;
      const droneFollowX = clamp(pShip.x - 18, 250, 560);
      const droneFollowY = clamp(pShip.y - 104 + droneHoverY, 155, 325);
      if (droneRef.current) {
        droneRef.current.setAttribute(
          'transform',
          `translate(${droneFollowX.toFixed(1)}, ${droneFollowY.toFixed(1)})`
        );
      }

      if (scanBeamRef.current) {
        scanBeamRef.current.setAttribute(
          'opacity',
          pShip.phase === 'BERTHED' ? '0.16' : '0'
        );
      }

      if (lighthouseBeaconRef.current) {
        lighthouseBeaconRef.current.setAttribute(
          'opacity',
          (0.6 + Math.sin(cycle * Math.PI * 10) * 0.35).toFixed(2)
        );
      }

      if (wave1Ref.current) wave1Ref.current.setAttribute('stroke-dashoffset', (-cycle * 220).toFixed(1));
      if (wave2Ref.current) wave2Ref.current.setAttribute('stroke-dashoffset', (-cycle * 240).toFixed(1));
      if (wave3Ref.current) wave3Ref.current.setAttribute('stroke-dashoffset', (cycle * 260).toFixed(1));

      const label =
        pShip.phase === 'ARRIVING'
          ? 'INBOUND ARRIVAL'
          : pShip.phase === 'BERTHED'
          ? 'BERTH 01 · SCANNED'
          : 'OUTBOUND DEPARTURE';

      if (gatePhaseRef.current && gatePhaseRef.current.textContent !== label) {
        gatePhaseRef.current.textContent = label;
      }
      if (pillPhaseRef.current && pillPhaseRef.current.textContent !== label) {
        pillPhaseRef.current.textContent = label;
      }

      const clockStr = formatBerthClock(Math.floor(cycle * 48) + 12);
      if (droneClockRef.current && droneClockRef.current.textContent !== clockStr) {
        droneClockRef.current.textContent = clockStr;
      }
    };

    applyFrame(cycleRef.current);

    if (paused || prefersReducedMotion) return;

    let rafId = 0;
    let lastTs = performance.now();
    const CYCLE_DURATION_MS = 14000;

    const tick = (now: number) => {
      const dt = Math.min(now - lastTs, 100);
      lastTs = now;
      cycleRef.current = (cycleRef.current + dt / CYCLE_DURATION_MS) % 1;
      applyFrame(cycleRef.current);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [paused, prefersReducedMotion]);

  const initialPrimary = sampleInboundOutboundShip(cycleRef.current);
  const initialOuter = sampleOuterChannelShip(cycleRef.current);
  const initialDroneX = clamp(initialPrimary.x - 18, 250, 560);
  const initialDroneY = clamp(initialPrimary.y - 104, 155, 325);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <svg
        viewBox="0 0 920 660"
        className="w-full h-full max-h-[540px] lg:max-h-[600px] overflow-hidden"
        role="img"
        aria-label={`Animated BMASA isometric port scene showing vessels arriving and departing for ${memberName}`}
      >
        <defs>
          <linearGradient id="harbor-water-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DDE8F0" stopOpacity="0.92" />
            <stop offset="55%" stopColor="#CEE0EC" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#DCE6EE" stopOpacity="0.88" />
          </linearGradient>

          <linearGradient id="quay-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E6ECF2" />
          </linearGradient>

          <linearGradient id="ship-deck-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#DCE3EC" />
          </linearGradient>

          <filter id="soft-ground-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#0A192F" floodOpacity="0.12" />
          </filter>

          <filter id="badge-shadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0A192F" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Isometric Studio Basin Floor */}
        <polygon
          points="70,480 495,245 875,455 460,645"
          fill="url(#harbor-water-grad)"
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />

        {/* Animated Sea Current Contour Lines */}
        <g stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round" fill="none">
          <path ref={wave1Ref} d="M 165 505 Q 245 460 325 415" strokeDasharray="14 18" />
          <path ref={wave2Ref} d="M 555 415 Q 660 475 765 535" strokeDasharray="16 20" />
          <path ref={wave3Ref} d="M 225 575 Q 430 535 675 585" strokeDasharray="12 22" />
        </g>

        {/* Concrete Harbor Quay / Pier Platform */}
        <g filter="url(#soft-ground-shadow)">
          <polygon points="250,350 515,205 515,226 250,372" fill="#94A3B8" />
          <polygon points="515,205 835,382 835,404 515,226" fill="#CBD5E1" />
          <polygon
            points="250,350 515,205 835,382 570,528"
            fill="url(#quay-top-grad)"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
          <polygon
            points="318,342 518,232 762,368 562,478"
            fill="#EEF2F6"
            stroke="#DCE3EC"
            strokeWidth="1"
          />
        </g>

        {/* Berth Edge Markings & Pier Stencils */}
        <g stroke="#C5A059" strokeWidth="2.5" strokeDasharray="8 6" opacity="0.85">
          <line x1="274" y1="348" x2="508" y2="219" />
        </g>
        <text
          x="398"
          y="302"
          transform="rotate(-29 398 302)"
          fill="#64748B"
          fontSize="12"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="2.5"
        >
          BERTH 01 · PORT GATE
        </text>

        {/* Isometric Harbor Bollards Row */}
        {[
          { x: 295, y: 344 },
          { x: 345, y: 317 },
          { x: 395, y: 290 },
          { x: 445, y: 263 },
          { x: 495, y: 236 },
          { x: 560, y: 245 },
          { x: 612, y: 274 },
          { x: 664, y: 303 },
          { x: 716, y: 332 },
        ].map((b, idx) => (
          <g key={idx} transform={`translate(${b.x}, ${b.y})`}>
            <ellipse cx="0" cy="4" rx="5.5" ry="3" fill="#0A192F" fillOpacity="0.16" />
            <rect x="-3.2" y="-12" width="6.4" height="15" rx="2.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
            <rect x="-3.2" y="-13" width="6.4" height="5" rx="2" fill={idx % 2 === 0 ? theme.accent : '#0D9488'} />
          </g>
        ))}

        {/* Stacked Isometric Cargo Containers on Quay Apron */}
        <g transform="translate(555, 290)">
          <g transform="translate(0, 0)">
            <polygon points="0,12 36,-8 62,6 26,26" fill="#1D3458" />
            <polygon points="0,12 26,26 26,44 0,30" fill="#0A192F" />
            <polygon points="26,26 62,6 62,24 26,44" fill="#112240" />
          </g>
          <g transform="translate(42, 22)">
            <polygon points="0,12 36,-8 62,6 26,26" fill="#2DD4BF" />
            <polygon points="0,12 26,26 26,44 0,30" fill="#0D9488" />
            <polygon points="26,26 62,6 62,24 26,44" fill="#0F766E" />
          </g>
          <g transform="translate(18, -14)">
            <polygon points="0,12 36,-8 62,6 26,26" fill="#E5C98B" />
            <polygon points="0,12 26,26 26,42 0,28" fill="#C5A059" />
            <polygon points="26,26 62,6 62,22 26,42" fill="#9E7B39" />
          </g>
        </g>

        {/* Port Digital Gatehouse & Electronic Berth Signboard */}
        <g transform="translate(650, 170)">
          <rect x="42" y="42" width="12" height="52" rx="3" fill="#0A192F" />
          <polygon points="0,24 102,-24 114,-16 12,32" fill="#1D3458" />
          <polygon points="12,32 114,-16 114,22 12,70" fill="#0A192F" stroke="#C5A059" strokeWidth="1.5" />
          <polygon points="0,24 12,32 12,70 0,62" fill="#061020" />
          <g transform="matrix(0.9 -0.42 0 1 18 39)">
            <text
              x="0"
              y="0"
              fill="#D8B979"
              fontSize="10"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              BMASA PORT 04
            </text>
            <text
              ref={gatePhaseRef}
              x="0"
              y="15"
              fill="#F8FAFC"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
            >
              BERTH 01 · SCANNED
            </text>
          </g>
        </g>

        {/* Isometric Gantry Quay Crane */}
        <g transform="translate(465, 165)">
          <line x1="18" y1="95" x2="18" y2="28" stroke="#0A192F" strokeWidth="5" strokeLinecap="round" />
          <line x1="48" y1="80" x2="48" y2="14" stroke="#0A192F" strokeWidth="5" strokeLinecap="round" />
          <line x1="-22" y1="45" x2="82" y2="-4" stroke="#C5A059" strokeWidth="6" strokeLinecap="round" />
          <line x1="18" y1="28" x2="48" y2="14" stroke="#C5A059" strokeWidth="4" />
          <line x1="-2" y1="36" x2="-2" y2="62" stroke="#64748B" strokeWidth="1.5" strokeDasharray="3 2" />
          <rect x="-12" y="61" width="20" height="7" rx="1.5" fill="#0A192F" />
        </g>

        {/* Harbor Lighthouse Beacon */}
        <g transform="translate(275, 315)">
          <ellipse cx="0" cy="8" rx="12" ry="6" fill="#0A192F" fillOpacity="0.16" />
          <polygon points="-8,8 8,8 5,-38 -5,-38" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
          <polygon points="-6,-10 6,-10 5.5,-22 -5.5,-22" fill="#C5A059" />
          <rect x="-6.5" y="-46" width="13" height="9" rx="2" fill="#0A192F" />
          <circle ref={lighthouseBeaconRef} cx="0" cy="-41.5" r="3.2" fill="#FDE68A" opacity="0.9" />
          <polygon points="-8,-46 8,-46 0,-54" fill="#0A192F" />
        </g>

        {/* Outer Channel Feeder Vessel */}
        <g
          ref={outerShipRef}
          transform={`translate(${initialOuter.x}, ${initialOuter.y}) scale(${initialOuter.scale}) rotate(${initialOuter.angle})`}
          opacity={initialOuter.opacity}
        >
          <path
            d="M -62 -5 L -115 -14 M -62 5 L -115 14"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
          <ellipse cx="0" cy="9" rx="56" ry="16" fill="#0A192F" fillOpacity="0.15" />
          <path
            d="M -52,-12 L 32,-12 L 56,0 L 32,12 L -52,12 Z"
            fill="#F8FAFC"
            stroke="#94A3B8"
            strokeWidth="1.2"
          />
          <path d="M -50,12 L 32,12 L 56,0 L 32,18 L -50,18 Z" fill="#1E293B" />
          <rect x="-24" y="-8" width="22" height="16" rx="2" fill="#0D9488" />
          <rect x="3" y="-8" width="20" height="16" rx="2" fill="#C5A059" />
          <rect x="-44" y="-9" width="14" height="18" rx="2" fill="#FFFFFF" stroke="#CBD5E1" />
          <rect x="-36" y="-6" width="4" height="12" rx="1" fill="#0A192F" />
        </g>

        {/* Primary BMASA Vessel (Arrives into Port -> Scans -> Departs to Sea) */}
        <g
          ref={primaryShipRef}
          data-testid="primary-port-ship"
          transform={`translate(${initialPrimary.x}, ${initialPrimary.y}) scale(${initialPrimary.scale}) rotate(${initialPrimary.angle})`}
          opacity={initialPrimary.opacity}
          onClick={onOpenIdCard}
          className="cursor-pointer"
        >
          <g ref={wakeGroupRef} stroke="#FFFFFF" strokeLinecap="round" opacity="0">
            <path d="M -92 -8 L -158 -22" strokeWidth="2.6" strokeDasharray="10 6" />
            <path d="M -92 8 L -158 22" strokeWidth="2.6" strokeDasharray="10 6" />
            <path d="M -88 0 L -144 0" strokeWidth="2" strokeDasharray="8 8" strokeOpacity="0.6" />
          </g>

          <ellipse cx="4" cy="14" rx="88" ry="24" fill="#0A192F" fillOpacity="0.18" />
          <path d="M -82,16 L 52,16 L 90,0 L 52,27 L -82,27 Z" fill={theme.hullDark} />
          <path
            d="M -84,-18 L 50,-18 L 92,0 L 50,18 L -84,18 Z"
            fill={theme.hullMid}
            stroke={theme.hullLight}
            strokeWidth="1.2"
          />
          <path d="M -72,-12 L 44,-12 L 72,0 L 44,12 L -72,12 Z" fill="url(#ship-deck-grad)" />

          <g>
            <rect x="-32" y="-10" width="24" height="20" rx="2" fill={theme.accent} />
            <rect x="-29" y="-7" width="18" height="14" rx="1" fill="#FFFFFF" fillOpacity="0.22" />
            <rect x="-4" y="-10" width="24" height="20" rx="2" fill={theme.hullLight} />
            <rect x="-1" y="-7" width="18" height="14" rx="1" fill="#FFFFFF" fillOpacity="0.18" />
            <rect x="24" y="-9" width="20" height="18" rx="2" fill="#0D9488" />
          </g>

          <rect x="-68" y="-14" width="28" height="28" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
          <rect x="-64" y="-11" width="18" height="22" rx="2" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="-50" y="-9" width="5" height="18" rx="1" fill="#0A192F" />
          <rect x="-77" y="-6" width="8" height="12" rx="2" fill={theme.accent} />
          <rect x="-77" y="-6" width="3.5" height="12" rx="1" fill="#0A192F" />
        </g>

        {/* Hovering Port Scanner Drone + Floating Cadet ID Plate */}
        <g ref={droneRef} transform={`translate(${initialDroneX}, ${initialDroneY})`}>
          <polygon ref={scanBeamRef} points="18,18 -8,92 48,92" fill="#0D9488" opacity="0.16" />
          <ellipse cx="18" cy="48" rx="12" ry="4" fill="#0A192F" fillOpacity="0.12" />
          <line x1="28" y1="-6" x2="28" y2="-16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <rect x="2" y="-6" width="32" height="24" rx="11" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
          <rect x="7" y="1" width="22" height="11" rx="5.5" fill="#0A192F" />
          <circle cx="13.5" cy="6.5" r="2.2" fill="#38BDF8" />
          <circle cx="22.5" cy="6.5" r="2.2" fill="#38BDF8" />

          <g
            transform="translate(46, -24)"
            filter="url(#badge-shadow)"
            onClick={onOpenIdCard}
            className="cursor-pointer"
          >
            <rect
              x="0"
              y="0"
              width="148"
              height="48"
              rx="10"
              fill="#0A192F"
              stroke="#C5A059"
              strokeWidth="1.4"
            />
            <text
              x="14"
              y="19"
              fill="#D8B979"
              fontSize="11.5"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="0.5"
            >
              {cadetNumber || 'BMAS-MEMBER'}
            </text>
            <text
              ref={droneClockRef}
              x="14"
              y="36"
              fill="#F8FAFC"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="0.8"
            >
              00:00:00:32
            </text>
          </g>
        </g>

        <g transform="translate(748, 386)">
          <ellipse cx="0" cy="4" rx="6" ry="3" fill="#0A192F" fillOpacity="0.14" />
          <rect x="-3.5" y="-12" width="7" height="16" rx="2.5" fill="#FFFFFF" stroke="#CBD5E1" />
          <rect x="-3.5" y="-12" width="7" height="5" rx="2" fill="#0D9488" />
        </g>
      </svg>

      {/* Bottom-Right Live Berth Legend & Play/Pause Control */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-white/90 backdrop-blur-xs border border-[#E2E8F0] rounded-full px-3.5 py-1.5 text-[11px] text-slate-600 shadow-xs">
        <Anchor className="w-3.5 h-3.5 text-[#806127] shrink-0" aria-hidden="true" />
        <span ref={pillPhaseRef} className="font-mono font-semibold text-[#0A192F] whitespace-nowrap">
          BERTH 01 · SCANNED
        </span>
        <span className="text-slate-300" aria-hidden="true">
          ·
        </span>
        <span className="hidden sm:inline truncate max-w-[140px]" title={`${rank} · ${availabilityStatus}`}>
          {availabilityStatus}
        </span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Resume port ship animation' : 'Pause port ship animation'}
          className="ml-1 w-6 h-6 rounded-full inline-flex items-center justify-center bg-[#0A192F] text-white hover:bg-[#112240] transition-colors shrink-0"
        >
          {paused ? (
            <Play className="w-3 h-3 ml-0.5" aria-hidden="true" />
          ) : (
            <Pause className="w-3 h-3" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
