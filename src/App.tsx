import { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AlertCircle, Shield, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { ProfileVoyageEditor } from './components/ProfileVoyageEditor';
import { DirectoryView } from './components/DirectoryView';
import { JobBoardView } from './components/JobBoardView';
import { CommunityHubView } from './components/CommunityHubView';
import { BankFundView } from './components/BankFundView';
import { GalleryView } from './components/GalleryView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { MemberOnboardingForm } from './components/MemberOnboardingForm';
import { SharedProfileView } from './components/SharedProfileView';
import { SignInLoaderOverlay } from './components/SignInLoaderOverlay';
import { WelcomeOverlay } from './components/WelcomeOverlay';
import { PortalProvider, usePortal } from './context/PortalContext';
import { ToastProvider } from './context/ToastContext';
import type { PortalTab } from './types/portal';
import {
  buildPortalUrl,
  isValidPortalTab,
  readSharedMemberFromSearch,
  readTabFromSearch,
} from './utils/historyNavigation';

function PortalShell() {
  const {
    authReady,
    sessionMode,
    isMainAdmin,
    isAdmin,
    needsProfileSetup,
    directoryMembers,
    portalStats,
    firestoreError,
    clearFirestoreError,
    logout,
  } = usePortal();

  const [activeTab, setActiveTab] = useState<PortalTab>(() =>
    typeof window !== 'undefined' ? readTabFromSearch(window.location.search) : 'credential'
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [sharedMemberId, setSharedMemberId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? readSharedMemberFromSearch(window.location.search) : null
  );

  const isAuthenticated = sessionMode === 'firebase' || sessionMode === 'harness';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialTab = readTabFromSearch(window.location.search);
    const initialMember = readSharedMemberFromSearch(window.location.search);
    window.history.replaceState(
      {
        ...(window.history.state || {}),
        bmasaTab: initialTab,
        bmasaMember: initialMember,
      },
      '',
      window.location.href
    );

    const onPopState = (event: PopStateEvent) => {
      const nextMember = readSharedMemberFromSearch(window.location.search);
      const urlTab = readTabFromSearch(window.location.search);
      const stateTab = event.state?.bmasaTab;
      const resolvedTab =
        urlTab !== 'credential'
          ? urlTab
          : isValidPortalTab(stateTab)
          ? stateTab
          : 'credential';

      const nextAuthMode = event.state?.bmasaAuth;
      if (nextAuthMode === 'login' || nextAuthMode === 'register') {
        setAuthModalMode(nextAuthMode);
        setAuthModalOpen(true);
      } else {
        setAuthModalOpen(false);
      }

      setSharedMemberId(nextMember);
      setActiveTab(resolvedTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const clearSharedMember = useCallback((push = true) => {
    setSharedMemberId(null);
    if (typeof window !== 'undefined') {
      const nextUrl = buildPortalUrl(window.location.href, { memberId: null });
      const nextState = {
        ...(window.history.state || {}),
        bmasaMember: null,
        bmasaTab: readTabFromSearch(window.location.search),
      };
      if (push && nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.pushState(nextState, '', nextUrl);
      } else {
        window.history.replaceState(nextState, '', nextUrl);
      }
    }
  }, []);

  const handleOpenAuth = useCallback((mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
    if (typeof window !== 'undefined' && window.history.state?.bmasaAuth !== mode) {
      window.history.pushState(
        { ...(window.history.state || {}), bmasaAuth: mode },
        '',
        window.location.href
      );
    }
  }, []);

  const handleCloseAuth = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.state?.bmasaAuth) {
      window.history.back();
      return;
    }
    setAuthModalOpen(false);
  }, []);

  const handleSelectTab = useCallback(
    (tab: PortalTab) => {
      if (typeof window !== 'undefined') {
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const nextUrl = buildPortalUrl(window.location.href, {
          tab,
          section: null,
          memberId: null,
        });
        const nextState = {
          bmasaTab: tab,
          bmasaMember: null,
        };
        if (currentUrl !== nextUrl || sharedMemberId !== null || activeTab !== tab) {
          window.history.pushState(nextState, '', nextUrl);
        }
      }
      setSharedMemberId(null);
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeTab, sharedMemberId]
  );

  const handleNavigateHome = useCallback(() => {
    if (isAuthenticated) {
      handleSelectTab('credential');
    } else {
      clearSharedMember(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [clearSharedMember, handleSelectTab, isAuthenticated]);

  const handleLogout = useCallback(async () => {
    setSharedMemberId(null);
    setActiveTab('credential');
    if (typeof window !== 'undefined') {
      const nextUrl = buildPortalUrl(window.location.href, {
        tab: 'credential',
        section: null,
        memberId: null,
      });
      window.history.replaceState({ bmasaTab: 'credential', bmasaMember: null }, '', nextUrl);
    }
    await logout();
  }, [logout]);

  const pendingApprovals = directoryMembers.filter((m) => !m.isVerified).length;
  const isSinglePageDashboard =
    isAuthenticated && !needsProfileSetup && !sharedMemberId && activeTab === 'credential';

  return (
    <div
      className={`bg-[#F8FAFC] text-[#0F172A] flex flex-col overflow-x-clip ${
        isSinglePageDashboard ? 'min-h-dvh xl:h-dvh xl:overflow-y-auto' : 'min-h-dvh'
      }`}
    >
      <Header
        isAuthenticated={isAuthenticated && !needsProfileSetup}
        isOnboarding={isAuthenticated && needsProfileSetup}
        isAdmin={isAdmin}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onNavigateHome={handleNavigateHome}
      />

      {/* Persistent Admin Shortcut Ribbon across authenticated non-dashboard tabs */}
      {isAuthenticated && !needsProfileSetup && isAdmin && activeTab !== 'admin' && activeTab !== 'credential' && (
        <div className="bg-white border-b border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="w-3.5 h-3.5 text-[#806127] shrink-0" aria-hidden="true" />
              <span className="font-semibold text-[#0A192F]">
                {isMainAdmin ? 'BMASA Main Admin Active' : 'BMASA Admin Active'}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums">
                {pendingApprovals} pending registration{pendingApprovals === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSelectTab('admin')}
                className="font-semibold text-[#0A192F] hover:text-[#806127] transition-colors whitespace-nowrap"
              >
                Admin Console →
              </button>
            </div>
          </div>
        </div>
      )}

      {firestoreError && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 text-xs text-red-800"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span className="leading-relaxed">{firestoreError}</span>
            </div>
            <button
              type="button"
              onClick={clearFirestoreError}
              aria-label="Dismiss error banner"
              className="text-red-700 hover:text-red-950 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 min-w-0 flex flex-col ${isSinglePageDashboard ? 'min-h-0' : ''}`}>
        {!authReady && !isAuthenticated ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="h-64 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
          </div>
        ) : sharedMemberId ? (
          <SharedProfileView
            memberId={sharedMemberId}
            members={directoryMembers}
            onReturnToPortal={() => clearSharedMember(true)}
          />
        ) : !isAuthenticated ? (
          <LandingPage stats={portalStats} onOpenAuth={handleOpenAuth} />
        ) : needsProfileSetup ? (
          <MemberOnboardingForm />
        ) : (
          <>
            {activeTab === 'credential' && <DashboardView onSelectTab={handleSelectTab} />}
            {activeTab === 'profile' && <ProfileVoyageEditor />}
            {activeTab === 'directory' && <DirectoryView />}
            {activeTab === 'jobs' && <JobBoardView />}
            {activeTab === 'community' && <CommunityHubView />}
            {activeTab === 'funds' && <BankFundView />}
            {activeTab === 'gallery' && <GalleryView />}
            {activeTab === 'admin' && <AdminConsoleView onSelectTab={handleSelectTab} />}
          </>
        )}
      </div>

      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        onClose={handleCloseAuth}
        onSuccess={() => {
          setAuthModalOpen(false);
          setSharedMemberId(null);
          setActiveTab('credential');
          if (typeof window !== 'undefined') {
            const nextUrl = buildPortalUrl(window.location.href, {
              tab: 'credential',
              section: null,
              memberId: null,
            });
            window.history.replaceState(
              { bmasaTab: 'credential', bmasaMember: null },
              '',
              nextUrl
            );
          }
        }}
      />

      <SignInLoaderOverlay />
      <WelcomeOverlay />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <PortalProvider>
            <PortalShell />
          </PortalProvider>
        </ToastProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
