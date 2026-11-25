import { useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidInstallModal } from './AndroidInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'mobile' | 'hero';
}

export function PWAInstallButton({ className = '', variant = 'header' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  if (variant === 'mobile') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-300/30 text-[#806127] font-semibold text-xs hover:bg-amber-500/20 transition-all ${className}`}
        >
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <span>Install Android App</span>
          </span>
          <Download className="w-4 h-4 text-amber-600" aria-hidden="true" />
        </button>
        <AndroidInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0A192F] bg-amber-300/90 hover:bg-amber-300 shadow-sm transition-all whitespace-nowrap cursor-pointer ${className}`}
        title="Install BMASA on Android or Desktop"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#0A192F]" aria-hidden="true" />
        <span>Android App</span>
      </button>
      <AndroidInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
