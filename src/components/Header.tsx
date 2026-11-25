import { useState } from 'react';
import { Menu, Shield, UserCircle2, X } from 'lucide-react';
import type { PortalTab } from '../types/portal';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  isAuthenticated: boolean;
  isAdmin?: boolean;
  isOnboarding?: boolean;
  activeTab: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

const PORTAL_NAV_ITEMS: { id: PortalTab; label: string }[] = [
  { id: 'credential', label: 'Dashboard' },
  { id: 'directory', label: 'Directory' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'community', label: 'Community' },
  { id: 'funds', label: 'Bank & Fund' },
  { id: 'gallery', label: 'Gallery' },
];

const LANDING_NAV_ITEMS: { href: string; label: string }[] = [
  { href: '#mission', label: 'Mandate' },
  { href: '#directory-access', label: 'Directory' },
  { href: '#placements-access', label: 'Placements' },
  { href: '#treasury-access', label: 'Treasury' },
];

export function Header({
  isAuthenticated,
  isAdmin = false,
  isOnboarding = false,
  activeTab,
  onSelectTab,
  onOpenAuth,
  onLogout,
  onNavigateHome,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={onNavigateHome}
          aria-label="Bangladesh Marine Academy Sylhet Alumni Association (BMASA)"
          className="inline-flex items-center gap-2.5 text-[#0A192F] font-display font-bold text-base sm:text-lg tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] rounded-md"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-[#0A192F]"
          >
            <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="12,4.5 14.2,12 12,19.5 9.8,12" fill="#C5A059" />
            <circle cx="12" cy="12" r="1.5" fill="#0A192F" />
          </svg>
          <span className="flex items-baseline gap-1.5">
            <span>BMASA</span>
            <span className="hidden xl:inline text-[11px] font-medium text-slate-500">
              Sylhet Alumni Association
            </span>
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        {isOnboarding ? (
          <p className="hidden md:block font-mono text-xs tracking-[0.1em] text-slate-500">
            BMASA MEMBER REGISTRATION
          </p>
        ) : isAuthenticated ? (
          <nav
            aria-label="Portal navigation"
            className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium"
          >
            {PORTAL_NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] rounded-sm ${
                    isActive
                      ? 'text-[#0A192F] font-semibold'
                      : 'text-slate-600 hover:text-[#0A192F]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C5A059]"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        ) : (
          <nav
            aria-label="Public navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            {LANDING_NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="py-1 hover:text-[#0A192F] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] rounded-sm"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        {/* Zone 3: Dedicated Profile, Admin-Only Button, Android App & Auth CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton className="hidden sm:inline-flex" />
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('profile')}
                aria-current={activeTab === 'profile' ? 'page' : undefined}
                className={`hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'bg-[#0A192F] text-white border-[#0A192F]'
                    : 'bg-white text-[#0A192F] border-[#E2E8F0] hover:border-[#0A192F]'
                }`}
              >
                <UserCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Profile
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onSelectTab('admin')}
                  aria-current={activeTab === 'admin' ? 'page' : undefined}
                  className={`hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-[#C5A059] text-[#0A192F] border-[#C5A059]'
                      : 'bg-amber-50/70 text-[#806127] border-[#C5A059]/40 hover:bg-amber-50'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                  Admin
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="hidden lg:inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F]"
              >
                Sign Out
              </button>
            </>
          ) : isOnboarding ? (
            <button
              type="button"
              onClick={onLogout}
              className="hidden md:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="hidden md:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] focus-visible:ring-offset-2"
            >
              Member Login
            </button>
          )}

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`${
              isAuthenticated ? 'lg:hidden' : 'md:hidden'
            } inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E2E8F0] text-[#0A192F] hover:bg-slate-50 transition-colors`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className={`${
            isAuthenticated ? 'lg:hidden' : 'md:hidden'
          } border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-1 max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto shadow-lg`}
        >
          {isOnboarding ? (
            <div className="space-y-3">
              <p className="px-3 py-1 font-mono text-xs tracking-[0.1em] text-slate-500">
                BMASA MEMBER REGISTRATION
              </p>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-3 px-4 text-sm font-semibold text-[#0A192F] border border-[#CBD5E1] rounded-lg hover:bg-slate-50"
              >
                Sign Out
              </button>
            </div>
          ) : isAuthenticated ? (
            <>
              {[
                ...PORTAL_NAV_ITEMS,
                { id: 'profile' as PortalTab, label: 'Profile & Vault' },
                ...(isAdmin ? [{ id: 'admin' as PortalTab, label: 'Admin Console' }] : []),
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[44px] flex items-center text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#0A192F] text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <div className="pt-3 mt-2 border-t border-[#E2E8F0] space-y-2">
                <PWAInstallButton variant="mobile" />
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-3 px-4 text-sm font-semibold text-[#0A192F] border border-[#CBD5E1] rounded-lg hover:bg-slate-50"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              {LANDING_NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-[#E2E8F0] flex flex-col gap-2">
                <PWAInstallButton variant="mobile" />
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0A192F] rounded-lg hover:bg-[#112240]"
                >
                  Member Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="w-full py-3 px-4 text-sm font-semibold text-[#0A192F] border border-[#CBD5E1] rounded-lg hover:bg-slate-50"
                >
                  Register as Alumnus / Cadet
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
