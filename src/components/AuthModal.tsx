import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Hash,
  Lock,
  Mail,
  Phone,
  Shield,
  Upload,
  User,
  X,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { BMAS_BATCHES, DEPARTMENTS, MARITIME_RANK_GROUPS, type Department } from '../types/portal';
import { compressAvatarFile } from '../utils/imageCompression';

interface AuthModalProps {
  open: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: () => void;
}

const REMEMBERED_EMAIL_KEY = 'bmas_remembered_email';

function formatFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled in Firebase Console. Use "Continue with Google" or enable Email/Password Authentication.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please try again or use "Continue with Google".';
    case 'auth/unauthorized-domain': {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this preview domain';
      return `Domain "${host}" is not yet authorized in Firebase Auth Console (Settings → Authorized Domains). Add it or sign in from an authorized domain.`;
    }
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please use Sign In instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes or reset your password.';
    case 'auth/network-request-failed':
      return 'Network connection interrupted. Check your internet and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.09 3.57-5.17 3.57-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3a7.17 7.17 0 0 1-10.67-3.77H1.4v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.39 14.32a7.21 7.21 0 0 1 0-4.64V6.59H1.4a12 12 0 0 0 0 10.82l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.4 6.59l3.99 3.09A7.15 7.15 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

export function AuthModal({ open, initialMode, onClose, onSuccess }: AuthModalProps) {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, sendPasswordReset } = usePortal();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return Boolean(window.localStorage.getItem(REMEMBERED_EMAIL_KEY));
  });

  const [email, setEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
  });
  const [password, setPassword] = useState('');

  // Registration back-face fields
  const registerPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [fullName, setFullName] = useState('');
  const [cadetNumber, setCadetNumber] = useState('');
  const [batch, setBatch] = useState('4th Batch');
  const [department, setDepartment] = useState<Department>('Nautical');
  const [rank, setRank] = useState('Cadet');
  const [isInstructor, setIsInstructor] = useState(false);
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
    setStatusMsg(null);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const flipToMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMsg(null);
    setStatusMsg(null);
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg('Enter your email address above first, then click Forgot password.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(trimmed);
      setStatusMsg(`Password reset email sent to ${trimmed}. Check your inbox.`);
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    if (typeof window !== 'undefined') {
      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    }

    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstructorPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const compressed = await compressAvatarFile(file);
      setPhotoUrl(compressed);
    } catch {
      setErrorMsg('Could not process image. Please choose a JPG, PNG, or WebP photo.');
    }
    e.target.value = '';
  };

  const handleToggleInstructor = (checked: boolean) => {
    setIsInstructor(checked);
    setErrorMsg(null);
    if (checked) {
      setDepartment('Instructors');
      if (rank === 'Cadet' || rank === 'Deck Cadet') {
        setRank('Senior Instructor');
      }
    } else {
      if (department === 'Instructors') {
        setDepartment('Nautical');
      }
      if (rank === 'Senior Instructor') {
        setRank('Cadet');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (isInstructor) {
      if (phone.trim().length < 6) {
        setErrorMsg('Please enter your phone number (e.g., +88017...).');
        return;
      }
      if (!photoUrl.trim()) {
        setErrorMsg('Please upload your photo or paste an image URL.');
        return;
      }
    } else if (cadetNumber.trim().length < 2) {
      setErrorMsg('Please enter your Academic Cadet Number (e.g., BMAS-04-N0108).');
      return;
    }
    if (!registerEmail.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (registerPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail({
        fullName,
        email: registerEmail,
        password: registerPassword,
        cadetNumber: isInstructor ? 'BMAS-INST' : cadetNumber,
        batch,
        department: isInstructor ? 'Instructors' : department,
        rank,
        isInstructor,
        phone,
        photoUrl,
        additionalInfo,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={mode === 'login' ? 'auth-login-title' : 'auth-register-title'}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-[#E6EBF1]/95 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Stage Header: Quiet Brand Anchor & Tactile Close */}
      <div className="fixed top-0 left-0 right-0 px-3.5 py-3 sm:px-8 sm:py-5 bg-[#E6EBF1]/85 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none flex items-center justify-between pointer-events-none z-20">
        <div className="pointer-events-auto inline-flex items-center gap-2 text-[#0A192F] font-display font-bold text-sm sm:text-base tracking-tight">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" stroke="#0A192F" strokeWidth="1.5" />
            <polygon points="12,4.5 14.2,12 12,19.5 9.8,12" fill="#C5A059" />
            <circle cx="12" cy="12" r="1.5" fill="#0A192F" />
          </svg>
          <span>BMASA Alumni Portal</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="pointer-events-auto neu-raised w-11 h-11 rounded-full inline-flex items-center justify-center text-[#0A192F] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Centered 3D Neumorphic Circular Flip Disc (expands cleanly on Sign Up) */}
      <div className="neu-perspective w-full flex items-center justify-center my-auto pt-14 pb-6 sm:py-4">
        <div
          data-testid="auth-flip-card"
          className={`neu-flip-card transition-[width,height] duration-300 ${
            mode === 'register'
              ? 'is-flipped w-[min(95vw,500px)] min-h-[600px] sm:w-[580px] h-[min(84dvh,720px)]'
              : 'w-[min(94vw,410px)] min-h-[520px] sm:w-[580px] sm:h-[580px]'
          }`}
        >
          {/* FRONT FACE: LOGIN */}
          <div
            aria-hidden={mode !== 'login'}
            className={`neu-face absolute inset-0 rounded-[36px] sm:rounded-full flex flex-col items-center justify-center px-5 py-6 sm:px-14 sm:py-8 overflow-y-auto ${
              mode === 'login' ? 'pointer-events-auto z-10' : 'pointer-events-none z-0'
            }`}
          >
            <div className="w-full max-w-[324px]">
              <h2
                id="auth-login-title"
                className="font-display text-3xl sm:text-[32px] font-bold tracking-tight text-[#1E293B] text-center"
              >
                Login
              </h2>
              <p className="mt-0.5 text-xs sm:text-[13px] text-slate-600 text-center">
                Sign in to your BMASA account
              </p>

              {errorMsg && mode === 'login' && (
                <div
                  role="alert"
                  className="mt-2.5 px-3.5 py-2 rounded-2xl bg-red-50/95 border border-red-200 text-[11px] text-red-800 flex items-start gap-2 leading-snug"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {statusMsg && mode === 'login' && (
                <div
                  role="status"
                  className="mt-2.5 px-3.5 py-2 rounded-2xl bg-emerald-50/95 border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-2 leading-snug"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-700" aria-hidden="true" />
                  <span>{statusMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={submitting}
                tabIndex={mode === 'login' ? 0 : -1}
                onClick={handleGoogleAuth}
                data-testid="auth-login-google-btn"
                className="mt-3.5 w-full h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-300/90 shadow-sm flex items-center justify-center gap-2.5 text-xs font-bold text-[#0A192F] transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] cursor-pointer"
              >
                <GoogleMark />
                Continue with Google
              </button>

              <div className="my-2.5 flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-slate-300/80" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  OR
                </span>
                <div className="h-px flex-1 bg-slate-300/80" />
              </div>

              <form onSubmit={handleLoginSubmit} noValidate className="space-y-3">
                <div className="neu-inset rounded-full px-4 h-10 flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                  <label htmlFor="auth-email" className="sr-only">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    tabIndex={mode === 'login' ? 0 : -1}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                <div className="neu-inset rounded-full px-4 h-10 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                  <label htmlFor="auth-password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    tabIndex={mode === 'login' ? 0 : -1}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    tabIndex={mode === 'login' ? 0 : -1}
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="text-slate-500 hover:text-[#0A192F] transition-colors shrink-0"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Crimson-Knob Remember Me Toggle & Forgot Password */}
                <div className="flex items-center justify-between gap-2 px-1 pt-0.5 text-xs">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rememberMe}
                    tabIndex={mode === 'login' ? 0 : -1}
                    onClick={() => setRememberMe((prev) => !prev)}
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-[#0A192F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] rounded-full"
                  >
                    <span className="neu-toggle-track w-9 h-5 rounded-full relative inline-flex items-center px-0.5 shrink-0">
                      <span
                        aria-hidden="true"
                        className={`w-4 h-4 rounded-full transition-transform duration-200 ${
                          rememberMe
                            ? 'translate-x-4 bg-[#B91C1C] shadow-xs'
                            : 'translate-x-0 bg-slate-500'
                        }`}
                      />
                    </span>
                    <span className="font-medium">Remember me</span>
                  </button>

                  <button
                    type="button"
                    tabIndex={mode === 'login' ? 0 : -1}
                    disabled={submitting}
                    onClick={handleForgotPassword}
                    className="font-medium text-slate-600 hover:text-[#0A192F] transition-colors whitespace-nowrap"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  tabIndex={mode === 'login' ? 0 : -1}
                  className="neu-raised w-full h-10 rounded-full font-display text-xs font-bold tracking-[0.14em] text-[#0A192F] uppercase transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] cursor-pointer"
                >
                  {submitting ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>

              <p className="mt-3.5 text-center text-xs text-slate-600">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  tabIndex={mode === 'login' ? 0 : -1}
                  onClick={() => flipToMode('register')}
                  className="font-bold text-[#B91C1C] hover:text-[#991B1B] hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>

          {/* BACK FACE: SIGN UP */}
          <div
            aria-hidden={mode !== 'register'}
            className={`neu-face neu-face-back absolute inset-0 rounded-[36px] flex flex-col items-center px-5 py-5 sm:px-10 sm:py-6 overflow-y-auto ${
              mode === 'register' ? 'pointer-events-auto z-10' : 'pointer-events-none z-0'
            }`}
          >
            <div className="w-full max-w-[400px] my-auto">
              <h2
                id="auth-register-title"
                className="font-display text-2xl font-bold tracking-tight text-[#1E293B] text-center"
              >
                Sign Up
              </h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-600 text-center">
                {isInstructor
                  ? 'Register as a Faculty Instructor of Bangladesh Marine Academy, Sylhet'
                  : 'Create your BMASA alumni, cadet, or faculty account'}
              </p>

              {errorMsg && mode === 'register' && (
                <div
                  role="alert"
                  className="mt-2 px-3 py-1.5 rounded-2xl bg-red-50/95 border border-red-200 text-[11px] text-red-800 flex items-start gap-2 leading-snug"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={submitting}
                tabIndex={mode === 'register' ? 0 : -1}
                onClick={handleGoogleAuth}
                data-testid="auth-register-google-btn"
                className="mt-2.5 w-full h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-300/90 shadow-sm flex items-center justify-center gap-2 text-xs font-bold text-[#0A192F] transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] cursor-pointer"
              >
                <GoogleMark />
                Continue with Google
              </button>

              <div className="my-2 flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-slate-300/80" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  OR
                </span>
                <div className="h-px flex-1 bg-slate-300/80" />
              </div>

              {/* Instructor Toggle Option */}
              <label
                htmlFor="auth-is-instructor"
                className={`mb-2.5 flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 border text-left transition-colors cursor-pointer ${
                  isInstructor
                    ? 'bg-[#0A192F] text-white border-[#C5A059] shadow-sm'
                    : 'bg-white/75 text-[#0A192F] border-slate-300/90 hover:border-[#0A192F]/40'
                }`}
              >
                <input
                  id="auth-is-instructor"
                  data-testid="auth-is-instructor-checkbox"
                  type="checkbox"
                  tabIndex={mode === 'register' ? 0 : -1}
                  checked={isInstructor}
                  onChange={(e) => handleToggleInstructor(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#C5A059]"
                />
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 text-xs font-semibold leading-snug">
                    <GraduationCap
                      className={`w-3.5 h-3.5 shrink-0 ${isInstructor ? 'text-[#D8B979]' : 'text-[#806127]'}`}
                      aria-hidden="true"
                    />
                    Are you the instructor of Bangladesh Marine Academy, Sylhet?
                  </span>
                  <span
                    className={`block text-[10px] mt-0.5 ${
                      isInstructor ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {isInstructor
                      ? 'Instructor registration enabled — no CDC number or certificates required.'
                      : 'Check this to register directly under Instructors (no CDC required).'}
                  </span>
                </div>
              </label>

              <form onSubmit={handleRegisterSubmit} noValidate className="space-y-2">
                {/* Full Name */}
                <div className="neu-inset rounded-full px-3.5 h-9 flex items-center gap-2.5">
                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <label htmlFor="auth-fullname" className="sr-only">
                    Full Name
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    tabIndex={mode === 'register' ? 0 : -1}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name (e.g., Capt. Humayun Kabir)"
                    className="w-full bg-transparent text-xs sm:text-[13px] text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                {/* Rank Selection (Cadet, Third Officer, Chief Officer, Senior Instructor, etc.) + Batch */}
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                  <div className="neu-inset rounded-full px-3 h-9 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                    <label htmlFor="auth-rank" className="sr-only">
                      Rank
                    </label>
                    <select
                      id="auth-rank"
                      data-testid="auth-rank-select"
                      tabIndex={mode === 'register' ? 0 : -1}
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                      className="w-full bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none"
                    >
                      <optgroup label="Core Ranks">
                        <option value="Cadet">Cadet</option>
                        <option value="Third Officer">Third Officer</option>
                        <option value="Chief Officer">Chief Officer</option>
                        <option value="Senior Instructor">Senior Instructor</option>
                      </optgroup>
                      {MARITIME_RANK_GROUPS.map((grp) => (
                        <optgroup key={grp.label} label={grp.label}>
                          {grp.ranks
                            .filter(
                              (r) =>
                                r !== 'Cadet' &&
                                r !== 'Third Officer' &&
                                r !== 'Chief Officer' &&
                                r !== 'Senior Instructor'
                            )
                            .map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="neu-inset rounded-full px-3 h-9 flex items-center">
                    <label htmlFor="auth-batch" className="sr-only">
                      Batch Number
                    </label>
                    <select
                      id="auth-batch"
                      tabIndex={mode === 'register' ? 0 : -1}
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="w-full bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none"
                    >
                      {BMAS_BATCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isInstructor ? (
                  <>
                    {/* Phone Number + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="neu-inset rounded-full px-3.5 h-9 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                        <label htmlFor="auth-phone" className="sr-only">
                          Phone Number
                        </label>
                        <input
                          id="auth-phone"
                          type="tel"
                          required
                          tabIndex={mode === 'register' ? 0 : -1}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Phone (+88017...)"
                          className="w-full bg-transparent font-mono text-xs text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>

                      <div className="neu-inset rounded-full px-3.5 h-9 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                        <label htmlFor="auth-register-email" className="sr-only">
                          Email Address
                        </label>
                        <input
                          id="auth-register-email"
                          type="email"
                          required
                          tabIndex={mode === 'register' ? 0 : -1}
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="Email Account"
                          className="w-full bg-transparent text-xs text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Photo Upload or URL */}
                    <div className="flex items-center gap-2">
                      <input
                        ref={registerPhotoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleInstructorPhotoUpload}
                        className="hidden"
                        aria-label="Upload instructor photo"
                      />
                      <button
                        type="button"
                        tabIndex={mode === 'register' ? 0 : -1}
                        onClick={() => registerPhotoInputRef.current?.click()}
                        className="h-9 px-3 rounded-full bg-[#0A192F] hover:bg-[#112240] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-[#D8B979]" aria-hidden="true" />
                        {photoUrl ? 'Change Photo' : 'Upload Photo'}
                      </button>
                      <div className="neu-inset rounded-full px-3 h-9 flex-1 flex items-center">
                        <label htmlFor="auth-photo-url" className="sr-only">
                          Photo URL
                        </label>
                        <input
                          id="auth-photo-url"
                          type="url"
                          tabIndex={mode === 'register' ? 0 : -1}
                          value={photoUrl.startsWith('data:') ? '' : photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          placeholder={
                            photoUrl.startsWith('data:')
                              ? 'Portrait photo attached ✓'
                              : 'Or paste photo URL (https://...)'
                          }
                          className="w-full bg-transparent text-xs text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="neu-inset rounded-2xl px-3.5 py-2 flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <label htmlFor="auth-additional-info" className="sr-only">
                        Add more information
                      </label>
                      <textarea
                        id="auth-additional-info"
                        rows={2}
                        maxLength={1000}
                        tabIndex={mode === 'register' ? 0 : -1}
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        placeholder="Add more information (subjects taught, maritime specialization, bio...)"
                        className="w-full bg-transparent text-xs text-[#0F172A] placeholder:text-slate-500 focus:outline-none resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                      <div className="neu-inset rounded-full px-3.5 h-9 flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                        <label htmlFor="auth-cadet" className="sr-only">
                          Academic Cadet Number
                        </label>
                        <input
                          id="auth-cadet"
                          type="text"
                          required
                          tabIndex={mode === 'register' ? 0 : -1}
                          value={cadetNumber}
                          onChange={(e) => setCadetNumber(e.target.value)}
                          placeholder="Cadet No."
                          className="w-full bg-transparent font-mono text-xs text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>

                      <div className="neu-inset rounded-full px-3 h-9 flex items-center">
                        <label htmlFor="auth-dept" className="sr-only">
                          Department
                        </label>
                        <select
                          id="auth-dept"
                          tabIndex={mode === 'register' ? 0 : -1}
                          value={department}
                          onChange={(e) => {
                            const val = e.target.value as Department;
                            setDepartment(val);
                            if (val === 'Instructors') {
                              handleToggleInstructor(true);
                            }
                          }}
                          className="w-full bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none"
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="neu-inset rounded-full px-3.5 h-9 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                      <label htmlFor="auth-register-email" className="sr-only">
                        Email Address
                      </label>
                      <input
                        id="auth-register-email"
                        type="email"
                        required
                        tabIndex={mode === 'register' ? 0 : -1}
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full bg-transparent text-xs text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="neu-inset rounded-full px-3.5 h-9 flex items-center gap-2.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <label htmlFor="auth-register-password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="auth-register-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    tabIndex={mode === 'register' ? 0 : -1}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Password (min. 6 characters)"
                    className="w-full bg-transparent text-xs sm:text-[13px] text-[#0F172A] placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    tabIndex={mode === 'register' ? 0 : -1}
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    aria-label={showRegisterPassword ? 'Hide registration password' : 'Show registration password'}
                    className="text-slate-500 hover:text-[#0A192F] transition-colors shrink-0"
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  tabIndex={mode === 'register' ? 0 : -1}
                  className="neu-raised w-full h-9.5 mt-1 rounded-full font-display text-xs font-bold tracking-[0.14em] text-[#0A192F] uppercase transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] cursor-pointer"
                >
                  {submitting
                    ? 'Creating Account...'
                    : isInstructor
                    ? 'Sign Up as Instructor'
                    : 'Sign Up'}
                </button>
              </form>

              <p className="mt-2.5 text-center text-xs text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  tabIndex={mode === 'register' ? 0 : -1}
                  onClick={() => flipToMode('login')}
                  className="font-bold text-[#B91C1C] hover:text-[#991B1B] hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
