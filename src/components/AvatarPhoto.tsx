import { useEffect, useState } from 'react';
import { getInitials } from '../utils/portalLogic';

interface AvatarPhotoProps {
  src: string;
  name: string;
  sizeClass?: string;
  roundedClass?: string;
  darkSurface?: boolean;
}

export function AvatarPhoto({
  src,
  name,
  sizeClass = 'w-14 h-14',
  roundedClass = 'rounded-xl',
  darkSurface = false,
}: AvatarPhotoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const trimmed = src.trim();
  const initials = getInitials(name);

  if (!trimmed || failed) {
    return (
      <div
        role="img"
        aria-label={`${name} portrait placeholder`}
        className={`${sizeClass} ${roundedClass} shrink-0 flex items-center justify-center font-display font-semibold tracking-wide select-none ${
          darkSurface
            ? 'bg-[#152946] text-[#E5C787] border border-[#C5A059]/40'
            : 'bg-[#0A192F] text-[#D8B979] border border-[#0A192F]/10'
        }`}
      >
        <span className="text-sm sm:text-base">{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={trimmed}
      alt={`Portrait of ${name}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} ${roundedClass} shrink-0 object-cover object-top ${
        darkSurface
          ? 'border border-[#C5A059]/55 bg-[#112240]'
          : 'border border-[#E2E8F0] bg-slate-100'
      }`}
    />
  );
}
