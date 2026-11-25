import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Anchor,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { useToast } from '../context/ToastContext';
import {
  AVAILABILITY_STATUSES,
  BLOOD_GROUPS,
  BMAS_BATCHES,
  DEFAULT_ACADEMY_NAME,
  DEPARTMENTS,
  VESSEL_TYPES,
  type AvailabilityStatus,
  type BloodGroup,
  type Department,
  type VesselType,
} from '../types/portal';
import { compressAvatarFile } from '../utils/imageCompression';
import {
  generateMemberSerial,
  validateInstructorOnboardingInput,
  validateOnboardingStep,
  type ProfileFormInput,
  type VoyageFormInput,
} from '../utils/validation';
import { AvatarPhoto } from './AvatarPhoto';
import { RankSelectField } from './RankSelectField';

const STEPS = [
  { id: 1 as const, label: 'Identity & Photo' },
  { id: 2 as const, label: 'Academy & CDC' },
  { id: 3 as const, label: 'Sea Service' },
  { id: 4 as const, label: 'Bank & NOK Vault' },
];

export function MemberOnboardingForm() {
  const {
    onboardingPrefill,
    needsEmailVerification,
    resendVerificationEmail,
    refreshAuthVerification,
    completeOnboarding,
    logout,
  } = usePortal();
  const { showToast, updateToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [form, setForm] = useState<ProfileFormInput>(() => {
    const preInst = Boolean(
      onboardingPrefill?.isInstructor || onboardingPrefill?.department === 'Instructors'
    );
    return {
      fullName: onboardingPrefill?.fullName ?? '',
      photoUrl: onboardingPrefill?.photoUrl ?? '',
      cadetNumber: onboardingPrefill?.cadetNumber ?? '',
      batch: onboardingPrefill?.batch ?? '2nd Batch',
      department: onboardingPrefill?.department ?? (preInst ? 'Instructors' : 'Nautical'),
      cdcNumber: '',
      sidNumber: '',
      currentRank: onboardingPrefill?.rank || (preInst ? 'Senior Instructor' : 'Cadet'),
      availabilityStatus: preInst ? 'Shore-Based' : 'Available for Sea',
      bloodGroup: '',
      city: preInst ? 'Sylhet' : '',
      country: 'Bangladesh',
      cvUrl: '',
      email: onboardingPrefill?.email ?? '',
      phone: onboardingPrefill?.phone ?? '',
      whatsapp: onboardingPrefill?.phone ?? '',
      academyName: DEFAULT_ACADEMY_NAME,
      passportNumber: '',
      passportIssueDate: '',
      cdcIssueDate: '',
      academicQualifications: [],
      bankAccountHolder: '',
      bankName: '',
      bankBranch: '',
      bankAccountNumber: '',
      bankRoutingNumber: '',
      mfsNumber: '',
      nokName: '',
      nokRelation: '',
      nokPhone: '',
      nokCity: '',
      showContactInDirectory: true,
      additionalInfo: onboardingPrefill?.additionalInfo ?? '',
      isInstructor: preInst,
    };
  });

  const [includeInitialVoyage, setIncludeInitialVoyage] = useState(false);
  const [initialVoyage, setInitialVoyage] = useState<VoyageFormInput>({
    vesselName: '',
    vesselType: 'Bulk Carrier',
    companyName: '',
    rankServed: 'Deck Cadet',
    signOnDate: '',
    signOffDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [checkingVerify, setCheckingVerify] = useState(false);

  const isInstructorMode = Boolean(form.isInstructor || form.department === 'Instructors');

  useEffect(() => {
    if (!onboardingPrefill) return;
    const preInst = Boolean(
      onboardingPrefill.isInstructor || onboardingPrefill.department === 'Instructors'
    );
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || onboardingPrefill.fullName,
      photoUrl: prev.photoUrl || onboardingPrefill.photoUrl || '',
      email: prev.email || onboardingPrefill.email,
      cadetNumber: prev.cadetNumber || onboardingPrefill.cadetNumber,
      batch: onboardingPrefill.batch || prev.batch,
      department: onboardingPrefill.department || prev.department,
      currentRank: onboardingPrefill.rank || prev.currentRank,
      phone: prev.phone || onboardingPrefill.phone || '',
      whatsapp: prev.whatsapp || onboardingPrefill.phone || '',
      additionalInfo: prev.additionalInfo || onboardingPrefill.additionalInfo || '',
      isInstructor: prev.isInstructor || preInst,
    }));
  }, [onboardingPrefill]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState(
      { ...(window.history.state || {}), bmasaOnboardingStep: 1 },
      '',
      window.location.href
    );

    const onPopState = (event: PopStateEvent) => {
      const targetStep = event.state?.bmasaOnboardingStep;
      setFormError(null);
      setErrors({});
      if (targetStep === 1 || targetStep === 2 || targetStep === 3 || targetStep === 4) {
        setStep(targetStep);
      } else {
        setStep(1);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    try {
      const compressed = await compressAvatarFile(file);
      setForm((prev) => ({ ...prev, photoUrl: compressed }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.photoUrl;
        return next;
      });
      showToast('success', 'Photo uploaded', 'Square portrait compressed and attached.');
    } catch {
      setFormError('Could not process image. Please choose a valid JPG, PNG, or WebP photo.');
    }
    e.target.value = '';
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      setVerifyMessage('Verification link sent. Open it in your inbox, then click Refresh Status.');
      showToast('info', 'Verification email sent', 'Check your inbox and click Refresh Status.');
    } catch {
      setVerifyMessage('Unable to resend verification email right now.');
    }
  };

  const handleRefreshVerification = async () => {
    setCheckingVerify(true);
    try {
      const verified = await refreshAuthVerification();
      setVerifyMessage(
        verified
          ? 'Email verified! You may now submit your BMASA registration.'
          : 'Email is not verified yet. Please check your inbox and click the confirmation link.'
      );
    } finally {
      setCheckingVerify(false);
    }
  };

  const handleNextStep = () => {
    setFormError(null);
    const validation = validateOnboardingStep(step, form, {
      enabled: includeInitialVoyage,
      voyage: initialVoyage,
    });
    setErrors(validation.errors);
    if (!validation.valid) {
      setFormError('Please fix the highlighted fields before continuing to the next step.');
      return;
    }
    if (step < 4) {
      const nextStep = (step + 1) as 1 | 2 | 3 | 4;
      if (typeof window !== 'undefined') {
        window.history.pushState(
          { ...(window.history.state || {}), bmasaOnboardingStep: nextStep },
          '',
          window.location.href
        );
      }
      setStep(nextStep);
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    setErrors({});
    if (step > 1) {
      if (
        typeof window !== 'undefined' &&
        window.history.state?.bmasaOnboardingStep === step
      ) {
        window.history.back();
        return;
      }
      setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
    }
  };

  const handleToggleInstructorMode = (checked: boolean) => {
    setFormError(null);
    setErrors({});
    setForm((prev) => ({
      ...prev,
      isInstructor: checked,
      department: checked
        ? 'Instructors'
        : prev.department === 'Instructors'
        ? 'Nautical'
        : prev.department,
      availabilityStatus: checked ? 'Shore-Based' : prev.availabilityStatus,
      city: checked && !prev.city ? 'Sylhet' : prev.city,
      currentRank: checked
        ? prev.currentRank === 'Cadet' || prev.currentRank === 'Deck Cadet'
          ? 'Senior Instructor'
          : prev.currentRank
        : prev.currentRank === 'Senior Instructor'
        ? 'Cadet'
        : prev.currentRank,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isInstructorMode) {
      const validation = validateInstructorOnboardingInput(form);
      setErrors(validation.errors);
      if (!validation.valid) {
        setFormError('Please complete the highlighted instructor registration fields.');
        return;
      }

      const preparedInstructor: ProfileFormInput = {
        ...form,
        isInstructor: true,
        department: 'Instructors',
        cadetNumber: form.cadetNumber.trim() || 'BMAS-INST',
        cdcNumber: '',
        sidNumber: '',
        availabilityStatus: 'Shore-Based',
        city: form.city.trim() || 'Sylhet',
        country: form.country.trim() || 'Bangladesh',
      };

      setSubmitting(true);
      const toastId = showToast(
        'loading',
        'Submitting Instructor registration...',
        'Adding you to the BMAS Instructors Directory'
      );
      try {
        await completeOnboarding(preparedInstructor, null);
        updateToast(
          toastId,
          'success',
          'Instructor Profile Registered',
          'You are now listed under the Instructors section in the BMASA Directory.'
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to save instructor details right now.';
        setFormError(msg);
        updateToast(toastId, 'error', 'Registration failed', msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step < 4) {
      handleNextStep();
      return;
    }

    // Validate all steps sequentially
    for (const s of [1, 2, 3, 4] as const) {
      const res = validateOnboardingStep(s, form, {
        enabled: includeInitialVoyage,
        voyage: initialVoyage,
      });
      if (!res.valid) {
        setErrors(res.errors);
        setStep(s);
        setFormError(`Please complete required details in Step ${s}.`);
        return;
      }
    }

    setSubmitting(true);
    const toastId = showToast('loading', 'Submitting BMASA registration...', 'Securing profile & vault');
    try {
      await completeOnboarding(form, includeInitialVoyage ? initialVoyage : null);
      updateToast(
        toastId,
        'success',
        'BMASA Credential Issued',
        'Your Digital Alumni ID is ready. Sensitive passport & bank info are sealed in your private vault.'
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to save registration details right now.';
      setFormError(msg);
      updateToast(toastId, 'error', 'Registration failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const credentialSerialPreview = form.cadetNumber.trim()
    ? generateMemberSerial(form.cadetNumber)
    : 'Matches Academic Cadet No.';

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.12em] text-[#806127]">
            BANGLADESH MARINE ACADEMY SYLHET ALUMNI ASSOCIATION (BMASA)
          </p>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#0A192F]">
            Complete Your BMASA Member Registration
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Whether signing in with Google or Email, complete this 4-step credential form to issue
            your Digital Alumni ID Card and seal confidential records inside your Private Vault.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] hover:border-[#0A192F] hover:text-[#0A192F] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          Switch Account
        </button>
      </div>

      {/* Instructor Option Banner */}
      <label
        htmlFor="onboard-is-instructor"
        className={`mb-6 flex items-start gap-3.5 rounded-2xl p-4 sm:p-5 border transition-colors cursor-pointer ${
          isInstructorMode
            ? 'bg-[#0A192F] text-white border-[#C5A059] shadow-md'
            : 'bg-white text-[#0A192F] border-[#E2E8F0] hover:border-[#0A192F]/40 shadow-xs'
        }`}
      >
        <input
          id="onboard-is-instructor"
          data-testid="onboard-is-instructor-checkbox"
          type="checkbox"
          checked={isInstructorMode}
          onChange={(e) => handleToggleInstructorMode(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#C5A059]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <GraduationCap
              className={`w-4 h-4 shrink-0 ${isInstructorMode ? 'text-[#D8B979]' : 'text-[#806127]'}`}
              aria-hidden="true"
            />
            <span className="font-display text-sm font-bold">
              Are you the instructor of Bangladesh Marine Academy, Sylhet?
            </span>
          </div>
          <p
            className={`mt-1 text-xs leading-relaxed ${
              isInstructorMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {isInstructorMode
              ? 'Simplified Instructor mode active — enter your Name, Batch, Rank, Phone, Email, Photo, and desired Additional Info. No CDC number or certificates required.'
              : 'Select this if you are an Academy Instructor to skip CDC/certificate steps and appear under Instructors in the Directory.'}
          </p>
        </div>
      </label>

      {/* Multi-step progress header (Cadets & Alumni only) */}
      {!isInstructorMode && (
        <nav aria-label="Registration steps" className="mb-6">
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {STEPS.map((s) => {
              const isActive = step === s.id;
              const isCompleted = step > s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (s.id < step) {
                        if (
                          typeof window !== 'undefined' &&
                          window.history.state?.bmasaOnboardingStep === step
                        ) {
                          window.history.go(s.id - step);
                        } else {
                          setStep(s.id);
                        }
                      }
                    }}
                    disabled={s.id > step}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
                      isActive
                        ? 'bg-[#0A192F] text-white border-[#0A192F] shadow-sm'
                        : isCompleted
                        ? 'bg-white text-[#0A192F] border-[#C5A059] hover:bg-amber-50/40'
                        : 'bg-white/60 text-slate-400 border-[#E2E8F0] cursor-not-allowed'
                    }`}
                  >
                    <span className="block font-mono text-[10px] tracking-wider opacity-80">
                      STEP {s.id} OF 4
                    </span>
                    <span className="mt-0.5 block font-display font-semibold truncate">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {needsEmailVerification && (
        <div
          role="status"
          className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Verify Your Email Address Before Submitting
              </p>
              <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                {verifyMessage ||
                  'Please click the verification link sent to your inbox, then press Refresh Status.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResendVerification}
              className="px-3 py-2 text-xs font-semibold text-amber-950 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Resend Link
            </button>
            <button
              type="button"
              disabled={checkingVerify}
              onClick={handleRefreshVerification}
              className="px-3 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap"
            >
              {checkingVerify ? 'Checking...' : 'Refresh Status'}
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs"
      >
        {/* SIMPLIFIED INSTRUCTOR REGISTRATION */}
        {isInstructorMode && (
          <div className="p-4 sm:p-8 space-y-6" data-testid="instructor-onboarding-panel">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0A192F]">
                Bangladesh Marine Academy, Sylhet — Instructor Registration
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                No CDC number or certificates required. Your profile will be listed under{' '}
                <strong>Instructors</strong> in the Alumni Directory.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center gap-5">
              <AvatarPhoto
                src={form.photoUrl}
                name={form.fullName || 'BMAS Instructor'}
                sizeClass="w-24 h-24"
                roundedClass="rounded-xl"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-semibold text-[#0A192F]">
                  Instructor Photo *
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Upload a portrait photo or paste an image URL.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    aria-label="Upload instructor photo"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                    Upload Photo
                  </button>
                  <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
                    <input
                      id="inst-photo-url"
                      type="url"
                      value={form.photoUrl.startsWith('data:') ? '' : form.photoUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
                      placeholder={
                        form.photoUrl.startsWith('data:')
                          ? 'Compressed portrait attached (paste URL to replace)'
                          : 'Or paste direct image URL (https://...)'
                      }
                      aria-label="Instructor photo URL"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>
                </div>
                {form.photoUrl && !errors.photoUrl && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Photo ready
                  </p>
                )}
                {errors.photoUrl && <p className="mt-2 text-xs text-red-600">{errors.photoUrl}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="inst-fullname" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  id="inst-fullname"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g., Capt. Humayun Kabir"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="inst-batch" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Batch Number *
                </label>
                <select
                  id="inst-batch"
                  value={form.batch}
                  onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                >
                  {BMAS_BATCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.batch && <p className="mt-1 text-xs text-red-600">{errors.batch}</p>}
              </div>

              <div>
                <label htmlFor="inst-rank" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rank / Designation (Cadet, Third Officer, Chief Officer, Instructor) *
                </label>
                <RankSelectField
                  id="inst-rank"
                  value={form.currentRank}
                  onChange={(val) => setForm((p) => ({ ...p, currentRank: val }))}
                  placeholderOption="Select Rank / Designation..."
                  customPlaceholder="Specify custom instructor title"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.currentRank && <p className="mt-1 text-xs text-red-600">{errors.currentRank}</p>}
              </div>

              <div>
                <label htmlFor="inst-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone Number *
                </label>
                <input
                  id="inst-phone"
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, whatsapp: e.target.value, phone: e.target.value }))
                  }
                  placeholder="+880 17XX-XXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.whatsapp && <p className="mt-1 text-xs text-red-600">{errors.whatsapp}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="inst-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Account *
                </label>
                <input
                  id="inst-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="instructor@bmas.edu.bd"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="inst-additional-info" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Add More Information (Optional — Subjects Taught, Bio, Qualifications, Office Hours)
                </label>
                <textarea
                  id="inst-additional-info"
                  rows={4}
                  maxLength={1000}
                  value={form.additionalInfo ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, additionalInfo: e.target.value }))}
                  placeholder="Share any desired information for cadets and alumni in the Instructors directory..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.additionalInfo && (
                  <p className="mt-1 text-xs text-red-600">{errors.additionalInfo}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] cursor-pointer">
                  <input
                    id="inst-show-contact"
                    type="checkbox"
                    checked={form.showContactInDirectory !== false}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, showContactInDirectory: e.target.checked }))
                    }
                    className="mt-0.5 rounded border-slate-300 text-[#0A192F]"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-[#0A192F]">
                      Show Call &amp; Email contact buttons in the Instructors Directory
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Allows signed-in BMASA cadets and alumni to contact you directly.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Account & Personal Identity */}
        {!isInstructorMode && step === 1 && (
          <div className="p-4 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0A192F]">
                Step 1: Account &amp; Personal Identity
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter your official name as per CDC/Passport, blood group for alumni emergency
                support, current location, and portrait photo.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center gap-5">
              <AvatarPhoto
                src={form.photoUrl}
                name={form.fullName || 'BMASA Member'}
                sizeClass="w-24 h-24"
                roundedClass="rounded-xl"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-semibold text-[#0A192F]">
                  Profile Portrait Photo *
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Upload a square photo (automatically compressed for free-tier storage) or paste an
                  image URL.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    aria-label="Upload credential photo"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                    Upload Photo
                  </button>
                  <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
                    <input
                      id="onboard-photo-url"
                      type="url"
                      value={form.photoUrl.startsWith('data:') ? '' : form.photoUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
                      placeholder={
                        form.photoUrl.startsWith('data:')
                          ? 'Compressed portrait attached (paste URL to replace)'
                          : 'Or paste direct image URL (https://...)'
                      }
                      aria-label="Profile photo URL"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>
                </div>
                {form.photoUrl && !errors.photoUrl && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Photo ready for BMASA ID Card
                  </p>
                )}
                {errors.photoUrl && <p className="mt-2 text-xs text-red-600">{errors.photoUrl}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="onboard-fullname" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name (as per CDC/Passport) *
                </label>
                <input
                  id="onboard-fullname"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g., Ahsan Rahman"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="onboard-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address *
                </label>
                <input
                  id="onboard-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="member@gmail.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="onboard-whatsapp" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile / WhatsApp Number (with country code) *
                </label>
                <input
                  id="onboard-whatsapp"
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, whatsapp: e.target.value, phone: p.phone || e.target.value }))
                  }
                  placeholder="+880 17XX-XXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.whatsapp && <p className="mt-1 text-xs text-red-600">{errors.whatsapp}</p>}
              </div>

              <div>
                <label htmlFor="onboard-blood" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Blood Group (For Emergency Alumni Support) *
                </label>
                <select
                  id="onboard-blood"
                  value={form.bloodGroup}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bloodGroup: e.target.value as BloodGroup | '' }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                >
                  <option value="">Select Blood Group...</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
                {errors.bloodGroup && (
                  <p className="mt-1 text-xs text-red-600">{errors.bloodGroup}</p>
                )}
              </div>

              <div>
                <label htmlFor="onboard-city" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current City / Port *
                </label>
                <input
                  id="onboard-city"
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="e.g., Sylhet, Dhaka, Chattogram, or At Sea"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
              </div>

              <div>
                <label htmlFor="onboard-country" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Country *
                </label>
                <input
                  id="onboard-country"
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="e.g., Bangladesh"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] cursor-pointer">
                  <input
                    id="onboard-show-contact"
                    type="checkbox"
                    checked={form.showContactInDirectory !== false}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, showContactInDirectory: e.target.checked }))
                    }
                    className="mt-0.5 rounded border-slate-300 text-[#0A192F]"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-[#0A192F]">
                      Show Mail &amp; Call contact buttons on Directory cards &amp; ID Credential
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Allows signed-in BMASA alumni to reach you directly by email or phone. Passport &amp; Bank info always stay locked in Private Vault.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Academy & Maritime Credentials */}
        {!isInstructorMode && step === 2 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0A192F]">
                  Step 2: Academy &amp; Maritime Credentials
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Your Academic Cadet Number becomes your official BMASA credential serial.
                </p>
              </div>
              <p className="font-mono text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">
                Serial: <strong className="text-[#0A192F]">{credentialSerialPreview}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="onboard-cadet" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Academic Cadet Number *
                </label>
                <input
                  id="onboard-cadet"
                  type="text"
                  value={form.cadetNumber}
                  onChange={(e) => setForm((p) => ({ ...p, cadetNumber: e.target.value }))}
                  placeholder="e.g., BMAS-04-N0108"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.cadetNumber && (
                  <p className="mt-1 text-xs text-red-600">{errors.cadetNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="onboard-batch" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Batch / Intake *
                </label>
                <select
                  id="onboard-batch"
                  value={form.batch}
                  onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                >
                  {BMAS_BATCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.batch && <p className="mt-1 text-xs text-red-600">{errors.batch}</p>}
              </div>

              <div>
                <label htmlFor="onboard-dept" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Department *
                </label>
                <select
                  id="onboard-dept"
                  value={form.department}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, department: e.target.value as Department }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-xs text-red-600">{errors.department}</p>
                )}
              </div>

              <div>
                <label htmlFor="onboard-rank" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Rank / CoC Grade *
                </label>
                <RankSelectField
                  id="onboard-rank"
                  value={form.currentRank}
                  onChange={(val) => setForm((p) => ({ ...p, currentRank: val }))}
                  placeholderOption="Select Current Rank / CoC Grade..."
                  customPlaceholder="Specify custom rank or role"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.currentRank && (
                  <p className="mt-1 text-xs text-red-600">{errors.currentRank}</p>
                )}
              </div>

              <div>
                <label htmlFor="onboard-status" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Status *
                </label>
                <select
                  id="onboard-status"
                  value={form.availabilityStatus}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      availabilityStatus: e.target.value as AvailabilityStatus,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                >
                  {AVAILABILITY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="onboard-cdc" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  CDC Number (Continuous Discharge Certificate) *
                </label>
                <input
                  id="onboard-cdc"
                  type="text"
                  value={form.cdcNumber}
                  onChange={(e) => setForm((p) => ({ ...p, cdcNumber: e.target.value }))}
                  placeholder="e.g., C/O/91402"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.cdcNumber && <p className="mt-1 text-xs text-red-600">{errors.cdcNumber}</p>}
              </div>

              <div>
                <label htmlFor="onboard-sid" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  SID Card Number (Seafarers Identity Document)
                </label>
                <input
                  id="onboard-sid"
                  type="text"
                  value={form.sidNumber ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, sidNumber: e.target.value }))}
                  placeholder="e.g., BGD-SID-004192"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.sidNumber && <p className="mt-1 text-xs text-red-600">{errors.sidNumber}</p>}
              </div>

              <div>
                <label htmlFor="onboard-passport" className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Passport Number (Optional)</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                    <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                    Private / Admin-Only
                  </span>
                </label>
                <input
                  id="onboard-passport"
                  type="text"
                  value={form.passportNumber ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, passportNumber: e.target.value }))}
                  placeholder="Stored strictly in private vault"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.passportNumber && (
                  <p className="mt-1 text-xs text-red-600">{errors.passportNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="onboard-cv" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  CV / Resume Link (Optional)
                </label>
                <input
                  id="onboard-cv"
                  type="url"
                  value={form.cvUrl}
                  onChange={(e) => setForm((p) => ({ ...p, cvUrl: e.target.value }))}
                  placeholder="https://drive.google.com/... or LinkedIn URL"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.cvUrl && <p className="mt-1 text-xs text-red-600">{errors.cvUrl}</p>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Optional Initial Sea Service / Voyage */}
        {!isInstructorMode && step === 3 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0A192F]">
                Step 3: Initial Sea Service / Voyage Details (Optional)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Fresh cadets without prior sea time can leave this unchecked and add voyages later
                from their dashboard.
              </p>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer">
              <input
                type="checkbox"
                checked={includeInitialVoyage}
                onChange={(e) => setIncludeInitialVoyage(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#0A192F] focus:ring-[#0A192F]"
              />
              <div>
                <span className="block text-sm font-semibold text-[#0A192F]">
                  Include my first / most recent vessel voyage now
                </span>
                <span className="block text-xs text-slate-500">
                  Leave unchecked if you are awaiting your first cadetship berth.
                </span>
              </div>
            </label>

            {includeInitialVoyage ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label htmlFor="onboard-vessel" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Vessel Name *
                  </label>
                  <input
                    id="onboard-vessel"
                    type="text"
                    value={initialVoyage.vesselName}
                    onChange={(e) =>
                      setInitialVoyage((v) => ({ ...v, vesselName: e.target.value }))
                    }
                    placeholder="e.g., MV Banglar Samriddhi"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {errors.vesselName && (
                    <p className="mt-1 text-xs text-red-600">{errors.vesselName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="onboard-vtype" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Vessel Type *
                  </label>
                  <select
                    id="onboard-vtype"
                    value={initialVoyage.vesselType}
                    onChange={(e) =>
                      setInitialVoyage((v) => ({ ...v, vesselType: e.target.value as VesselType }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    {VESSEL_TYPES.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="onboard-company" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Shipping Company / Manning Agent *
                  </label>
                  <input
                    id="onboard-company"
                    type="text"
                    value={initialVoyage.companyName}
                    onChange={(e) =>
                      setInitialVoyage((v) => ({ ...v, companyName: e.target.value }))
                    }
                    placeholder="e.g., Bangladesh Shipping Corporation"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="onboard-vrank" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rank Served *
                  </label>
                  <RankSelectField
                    id="onboard-vrank"
                    value={initialVoyage.rankServed}
                    onChange={(val) => setInitialVoyage((v) => ({ ...v, rankServed: val }))}
                    placeholderOption="Select Rank Served..."
                    customPlaceholder="Specify custom sea rank"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {errors.rankServed && (
                    <p className="mt-1 text-xs text-red-600">{errors.rankServed}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="onboard-signon" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sign-On Date *
                  </label>
                  <input
                    id="onboard-signon"
                    type="date"
                    value={initialVoyage.signOnDate}
                    onChange={(e) =>
                      setInitialVoyage((v) => ({ ...v, signOnDate: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {errors.signOnDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.signOnDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="onboard-signoff" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sign-Off Date (Leave empty if onboard)
                  </label>
                  <input
                    id="onboard-signoff"
                    type="date"
                    value={initialVoyage.signOffDate}
                    onChange={(e) =>
                      setInitialVoyage((v) => ({ ...v, signOffDate: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {errors.signOffDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.signOffDate}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] p-6 text-center text-xs text-slate-500">
                <Anchor className="w-5 h-5 mx-auto mb-2 text-slate-400" aria-hidden="true" />
                No voyage selected — you can add voyages anytime inside your Dashboard or Profile.
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Confidential Financial / Welfare Bank & NOK Vault */}
        {!isInstructorMode && step === 4 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0A192F]">
                Step 4: Confidential Welfare Bank Info &amp; Emergency NOK (Optional)
              </h2>
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
                <p>
                  <strong>Strictly Confidential:</strong> Encrypted/hidden from all public and
                  alumni directory views. Accessible only to you and verified BMASA Treasury Admins
                  for welfare disbursement or reimbursement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="vault-holder" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Holder Name
                </label>
                <input
                  id="vault-holder"
                  type="text"
                  value={form.bankAccountHolder ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, bankAccountHolder: e.target.value }))}
                  placeholder="Full legal account holder name"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>

              <div>
                <label htmlFor="vault-bank" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Name
                </label>
                <input
                  id="vault-bank"
                  type="text"
                  value={form.bankName ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                  placeholder="e.g., Dutch-Bangla Bank PLC"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>

              <div>
                <label htmlFor="vault-branch" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch Name
                </label>
                <input
                  id="vault-branch"
                  type="text"
                  value={form.bankBranch ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, bankBranch: e.target.value }))}
                  placeholder="e.g., Sylhet Main Branch"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>

              <div>
                <label htmlFor="vault-accno" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Number
                </label>
                <input
                  id="vault-accno"
                  type="text"
                  value={form.bankAccountNumber ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, bankAccountNumber: e.target.value }))}
                  placeholder="Bank Account Number"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>

              <div>
                <label htmlFor="vault-routing" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Routing Number
                </label>
                <input
                  id="vault-routing"
                  type="text"
                  value={form.bankRoutingNumber ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, bankRoutingNumber: e.target.value }))}
                  placeholder="e.g., 090912345"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>

              <div>
                <label htmlFor="vault-mfs" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Financial Service (bKash / Nagad)
                </label>
                <input
                  id="vault-mfs"
                  type="tel"
                  value={form.mfsNumber ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, mfsNumber: e.target.value }))}
                  placeholder="+880 17XX-XXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <h3 className="font-display text-sm font-semibold text-[#0A192F] mb-3">
                Emergency Next-of-Kin Contact (Optional, Strictly Private)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  aria-label="Next of Kin Full Name"
                  value={form.nokName ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, nokName: e.target.value }))}
                  placeholder="Emergency Contact Full Name"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                <input
                  type="text"
                  aria-label="Relationship"
                  value={form.nokRelation ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, nokRelation: e.target.value }))}
                  placeholder="Relationship (e.g., Father, Spouse)"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                <input
                  type="tel"
                  aria-label="Next of Kin Phone"
                  value={form.nokPhone ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, nokPhone: e.target.value }))}
                  placeholder="Emergency Phone (+880...)"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                <input
                  type="text"
                  aria-label="Next of Kin City"
                  value={form.nokCity ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, nokCity: e.target.value }))}
                  placeholder="NOK City / District"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="px-4 sm:px-8 py-5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#806127] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              New registrations begin as <strong>Pending Verification</strong> until approved by an
              authorized BMASA administrator.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 self-stretch sm:self-auto shrink-0">
            {!isInstructorMode && step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </button>
            )}

            {isInstructorMode ? (
              <button
                key="onboarding-instructor-submit-btn"
                data-testid="onboard-instructor-submit-btn"
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {submitting ? 'Registering Instructor...' : 'Complete Instructor Registration'}
              </button>
            ) : step < 4 ? (
              <button
                key="onboarding-next-btn"
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Continue to Step {step + 1}
                <ArrowRight className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="onboarding-submit-btn"
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                {submitting ? 'Submitting Registration...' : 'Complete Registration & Issue ID Card'}
              </button>
            )}
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="mx-6 sm:mx-8 mb-6 mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}
      </form>
    </main>
  );
}
