import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit2,
  FileBadge2,
  FileText,
  GraduationCap,
  Lock,
  Plus,
  ShieldAlert,
  Ship,
  Trash2,
  Upload,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { useToast } from '../context/ToastContext';
import {
  ACADEMIC_LEVEL_PRESETS,
  AVAILABILITY_STATUSES,
  BLOOD_GROUPS,
  BMAS_BATCHES,
  DEFAULT_ACADEMY_NAME,
  DEPARTMENTS,
  STANDARD_COP_CERTIFICATES,
  VESSEL_TYPES,
  type AcademicQualification,
  type AvailabilityStatus,
  type BloodGroup,
  type CopCertificate,
  type Department,
  type VesselType,
  type VoyageRecord,
} from '../types/portal';
import {
  calculateSeaTime,
  calculateSingleVoyageDuration,
  cleanBatchLabel,
  formatMaritimeDate,
  getCertificateExpiryStatus,
  sortVoyagesChronologically,
} from '../utils/portalLogic';
import {
  validateCopCertificateInput,
  validateProfileInput,
  validateVoyageInput,
  type CopCertificateFormInput,
  type ProfileFormInput,
  type VoyageFormInput,
} from '../utils/validation';
import { compressAvatarFile } from '../utils/imageCompression';
import { AvatarPhoto } from './AvatarPhoto';
import { CvPreviewModal } from './CvPreviewModal';
import { RankSelectField } from './RankSelectField';
import { buildPortalUrl, readSectionFromSearch } from '../utils/historyNavigation';

const EMPTY_VOYAGE: VoyageFormInput = {
  vesselName: '',
  vesselType: 'Bulk Carrier',
  companyName: '',
  rankServed: 'Deck Cadet',
  signOnDate: '',
  signOffDate: '',
};

type EditorTab = 'personal' | 'voyages' | 'certificates' | 'vault';

const VALID_EDITOR_TABS: readonly EditorTab[] = ['personal', 'voyages', 'certificates', 'vault'];

function resolveEditorTabFromUrl(): EditorTab {
  if (typeof window === 'undefined') return 'personal';
  const raw = readSectionFromSearch(window.location.search);
  return raw && (VALID_EDITOR_TABS as readonly string[]).includes(raw) ? (raw as EditorTab) : 'personal';
}

export function ProfileVoyageEditor() {
  const {
    currentUserProfile,
    currentUserVault,
    currentUserVoyages,
    currentUserCopCertificates,
    saveProfile,
    saveVoyage,
    removeVoyage,
    saveCopCert,
    removeCopCert,
  } = usePortal();
  const { showToast, updateToast } = useToast();

  const [subTab, setSubTab] = useState<EditorTab>(() => resolveEditorTabFromUrl());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = (event: PopStateEvent) => {
      const fromUrl = readSectionFromSearch(window.location.search);
      const fromState = event.state?.bmasaSection;
      const candidate = fromUrl ?? (typeof fromState === 'string' ? fromState : null);
      if (candidate && (VALID_EDITOR_TABS as readonly string[]).includes(candidate)) {
        setSubTab(candidate as EditorTab);
      } else {
        setSubTab('personal');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectSubTab = useCallback(
    (nextTab: EditorTab) => {
      if (typeof window !== 'undefined' && nextTab !== subTab) {
        const nextUrl = buildPortalUrl(window.location.href, {
          tab: 'profile',
          section: nextTab === 'personal' ? null : nextTab,
        });
        window.history.pushState(
          {
            ...(window.history.state || {}),
            bmasaTab: 'profile',
            bmasaSection: nextTab === 'personal' ? null : nextTab,
          },
          '',
          nextUrl
        );
      }
      setSubTab(nextTab);
    },
    [subTab]
  );

  const [form, setForm] = useState<ProfileFormInput>({
    fullName: '',
    photoUrl: '',
    cadetNumber: '',
    batch: '2nd Batch',
    department: 'Nautical',
    cdcNumber: '',
    sidNumber: '',
    currentRank: 'Deck Cadet',
    availabilityStatus: 'Available for Sea',
    bloodGroup: '',
    city: '',
    country: 'Bangladesh',
    cvUrl: '',
    email: '',
    phone: '',
    whatsapp: '',
    academyName: DEFAULT_ACADEMY_NAME,
    passportNumber: '',
    passportIssueDate: '',
    bankAccountHolder: '',
    bankName: '',
    bankBranch: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    mfsNumber: '',
    passportExpiry: '',
    cdcIssueDate: '',
    cdcExpiry: '',
    medicalExpiry: '',
    stcwCocExpiry: '',
    academicQualifications: [],
    nokName: '',
    nokRelation: '',
    nokPhone: '',
    nokCity: '',
    showContactInDirectory: true,
    additionalInfo: '',
    isInstructor: false,
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [cvModalOpen, setCvModalOpen] = useState(false);

  // COP Certificate drafts & "+ Add COP Certificate" builder state
  const [copDrafts, setCopDrafts] = useState<
    Record<string, { certNumber: string; issueDate: string; expiryDate: string }>
  >({});
  const [savingCopKey, setSavingCopKey] = useState<string | null>(null);
  const [showAddCop, setShowAddCop] = useState(false);
  const [customCopForm, setCustomCopForm] = useState<CopCertificateFormInput>({
    title: '',
    certNumber: '',
    issueDate: '',
    expiryDate: '',
  });
  const [editingCopId, setEditingCopId] = useState<string | null>(null);
  const [copErrors, setCopErrors] = useState<Record<string, string>>({});

  // Voyage Form State
  const [voyageForm, setVoyageForm] = useState<VoyageFormInput>(EMPTY_VOYAGE);
  const [editingVoyageId, setEditingVoyageId] = useState<string | null>(null);
  const [voyageErrors, setVoyageErrors] = useState<Record<string, string>>({});
  const [voyageSaving, setVoyageSaving] = useState(false);

  useEffect(() => {
    if (!currentUserProfile) return;
    setForm({
      fullName: currentUserProfile.fullName,
      photoUrl: currentUserProfile.photoUrl,
      cadetNumber: currentUserProfile.cadetNumber,
      batch: cleanBatchLabel(currentUserProfile.batch),
      department: currentUserProfile.department,
      cdcNumber: currentUserProfile.cdcNumber,
      sidNumber: currentUserProfile.sidNumber ?? '',
      currentRank: currentUserProfile.currentRank,
      availabilityStatus: currentUserProfile.availabilityStatus,
      bloodGroup: currentUserProfile.bloodGroup ?? '',
      city: currentUserProfile.city ?? '',
      country: currentUserProfile.country ?? 'Bangladesh',
      cvUrl: currentUserProfile.cvUrl,
      email: currentUserVault?.email ?? '',
      phone: currentUserVault?.phone ?? '',
      whatsapp: currentUserVault?.whatsapp ?? '',
      academyName: currentUserVault?.academyName || DEFAULT_ACADEMY_NAME,
      passportNumber: currentUserVault?.passportNumber ?? '',
      passportIssueDate: currentUserVault?.passportIssueDate ?? '',
      bankAccountHolder: currentUserVault?.bankAccountHolder ?? '',
      bankName: currentUserVault?.bankName ?? '',
      bankBranch: currentUserVault?.bankBranch ?? '',
      bankAccountNumber: currentUserVault?.bankAccountNumber ?? '',
      bankRoutingNumber: currentUserVault?.bankRoutingNumber ?? '',
      mfsNumber: currentUserVault?.mfsNumber ?? '',
      passportExpiry: currentUserVault?.passportExpiry ?? '',
      cdcIssueDate: currentUserVault?.cdcIssueDate ?? '',
      cdcExpiry: currentUserVault?.cdcExpiry ?? '',
      medicalExpiry: currentUserVault?.medicalExpiry ?? '',
      stcwCocExpiry: currentUserVault?.stcwCocExpiry ?? '',
      academicQualifications: currentUserVault?.academicQualifications ?? [],
      nokName: currentUserVault?.nokName ?? '',
      nokRelation: currentUserVault?.nokRelation ?? '',
      nokPhone: currentUserVault?.nokPhone ?? '',
      nokCity: currentUserVault?.nokCity ?? '',
      showContactInDirectory: Boolean(
        currentUserProfile.contactEmail || currentUserProfile.contactPhone || currentUserProfile.contactEmail === undefined
      ),
      additionalInfo: currentUserProfile.additionalInfo ?? '',
      isInstructor: currentUserProfile.department === 'Instructors',
    });
  }, [currentUserProfile, currentUserVault]);

  useEffect(() => {
    const next: Record<string, { certNumber: string; issueDate: string; expiryDate: string }> = {};
    for (const title of STANDARD_COP_CERTIFICATES) {
      const match = currentUserCopCertificates.find((c) => c.title === title);
      next[title] = {
        certNumber: match?.certNumber ?? '',
        issueDate: match?.issueDate ?? '',
        expiryDate: match?.expiryDate ?? '',
      };
    }
    setCopDrafts(next);
  }, [currentUserCopCertificates]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatarFile(file);
      setForm((prev) => ({ ...prev, photoUrl: compressed }));
      showToast('info', 'Portrait ready', 'Click Save Changes below to update your BMASA ID.');
    } catch {
      showToast('error', 'Image upload failed', 'Please choose a standard JPG, PNG, or WebP photo.');
    }
    e.target.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateProfileInput(form);
    setProfileErrors(result.errors);
    if (!result.valid) {
      showToast('error', 'Please review highlighted fields', 'Some profile or certificate entries need correction.');
      return;
    }

    setProfileSaving(true);
    const toastId = showToast('loading', 'Saving your BMASA profile & private vault...');
    try {
      await saveProfile(form);
      updateToast(
        toastId,
        'success',
        'BMASA profile updated',
        'Public credential, certificates, and encrypted private vault synced.'
      );
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Unable to save changes',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddAcademicQualification = (presetLevel = 'Other') => {
    const current = form.academicQualifications ?? [];
    if (current.length >= 12) {
      showToast('error', 'Limit reached', 'You can add up to 12 academic qualifications.');
      return;
    }
    const newItem: AcademicQualification = {
      id: `qual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      level: presetLevel,
      institution: '',
      boardOrUniversity: '',
      passingYear: '',
      result: '',
    };
    setForm((prev) => ({
      ...prev,
      academicQualifications: [...(prev.academicQualifications ?? []), newItem],
    }));
  };

  const handleUpdateAcademicQualification = (
    id: string,
    patch: Partial<AcademicQualification>
  ) => {
    setForm((prev) => ({
      ...prev,
      academicQualifications: (prev.academicQualifications ?? []).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleRemoveAcademicQualification = (id: string) => {
    setForm((prev) => ({
      ...prev,
      academicQualifications: (prev.academicQualifications ?? []).filter((item) => item.id !== id),
    }));
  };

  const handleSaveStandardCop = async (title: string) => {
    const draft = copDrafts[title] ?? { certNumber: '', issueDate: '', expiryDate: '' };
    const res = validateCopCertificateInput({
      title,
      certNumber: draft.certNumber,
      issueDate: draft.issueDate,
      expiryDate: draft.expiryDate,
    });
    if (!res.valid) {
      showToast('error', 'Invalid COP entry', Object.values(res.errors)[0] ?? 'Check date format.');
      return;
    }
    const existing = currentUserCopCertificates.find((c) => c.title === title);
    setSavingCopKey(title);
    const toastId = showToast('loading', `Saving ${title}...`);
    try {
      await saveCopCert(
        {
          title,
          certNumber: draft.certNumber,
          issueDate: draft.issueDate,
          expiryDate: draft.expiryDate,
          isStandard: true,
        },
        existing?.id
      );
      updateToast(toastId, 'success', 'COP Certificate Saved', title);
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Failed to save COP',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setSavingCopKey(null);
    }
  };

  const handleSaveCustomCop = async () => {
    const res = validateCopCertificateInput(customCopForm);
    setCopErrors(res.errors);
    if (!res.valid) return;
    setSavingCopKey('custom');
    const toastId = showToast(
      'loading',
      editingCopId ? 'Updating COP certificate...' : 'Adding COP certificate...'
    );
    try {
      await saveCopCert(
        {
          ...customCopForm,
          isStandard: false,
        },
        editingCopId ?? undefined
      );
      updateToast(
        toastId,
        'success',
        editingCopId ? 'COP updated' : 'COP certificate added',
        customCopForm.title.trim()
      );
      setCustomCopForm({ title: '', certNumber: '', issueDate: '', expiryDate: '' });
      setEditingCopId(null);
      setShowAddCop(false);
      setCopErrors({});
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Failed to save COP certificate',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setSavingCopKey(null);
    }
  };

  const handleDeleteCop = async (cert: CopCertificate) => {
    const toastId = showToast('loading', `Removing ${cert.title}...`);
    try {
      await removeCopCert(cert.id);
      updateToast(toastId, 'success', 'COP certificate removed', cert.title);
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Delete failed',
        err instanceof Error ? err.message : 'Please try again.'
      );
    }
  };

  const handleSaveVoyage = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateVoyageInput(voyageForm);
    setVoyageErrors(result.errors);
    if (!result.valid) {
      showToast('error', 'Incomplete voyage details', 'Please check highlighted voyage fields.');
      return;
    }

    setVoyageSaving(true);
    const toastId = showToast('loading', editingVoyageId ? 'Updating sea service entry...' : 'Logging sea service voyage...');
    try {
      await saveVoyage(voyageForm, editingVoyageId ?? undefined);
      setVoyageForm(EMPTY_VOYAGE);
      setEditingVoyageId(null);
      setVoyageErrors({});
      updateToast(
        toastId,
        'success',
        editingVoyageId ? 'Voyage updated' : 'Voyage logged',
        'Cumulative sea time recalculated automatically.'
      );
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Unable to save voyage',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setVoyageSaving(false);
    }
  };

  const handleStartEditVoyage = (voyage: VoyageRecord) => {
    setEditingVoyageId(voyage.id);
    setVoyageForm({
      vesselName: voyage.vesselName,
      vesselType: voyage.vesselType,
      companyName: voyage.companyName,
      rankServed: voyage.rankServed,
      signOnDate: voyage.signOnDate,
      signOffDate: voyage.signOffDate,
    });
    setVoyageErrors({});
  };

  const handleDeleteVoyage = async (voyageId: string) => {
    const toastId = showToast('loading', 'Removing voyage record...');
    try {
      await removeVoyage(voyageId);
      if (editingVoyageId === voyageId) {
        setEditingVoyageId(null);
        setVoyageForm(EMPTY_VOYAGE);
      }
      updateToast(toastId, 'success', 'Voyage removed', 'Sea service timeline updated.');
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Could not delete voyage',
        err instanceof Error ? err.message : 'Please try again.'
      );
    }
  };

  const sortedVoyages = sortVoyagesChronologically(currentUserVoyages);
  const totalSeaTime = calculateSeaTime(currentUserVoyages);

  const certRows: Array<{
    key: 'passportExpiry' | 'cdcExpiry' | 'medicalExpiry' | 'stcwCocExpiry';
    issueKey?: 'passportIssueDate' | 'cdcIssueDate';
    title: string;
    helper: string;
  }> = [
    {
      key: 'passportExpiry',
      issueKey: 'passportIssueDate',
      title: 'Passport Issue & Expiry Dates',
      helper: 'Alert triggers within 6 months of expiry for vessel sign-on readiness.',
    },
    {
      key: 'cdcExpiry',
      issueKey: 'cdcIssueDate',
      title: 'CDC (Continuous Discharge Certificate) Dates',
      helper: 'Department of Shipping seafarer book issue & validity dates.',
    },
    {
      key: 'medicalExpiry',
      title: 'ILO / DG Shipping Medical Fitness Expiry',
      helper: 'Approved maritime medical fitness certificate validity.',
    },
    {
      key: 'stcwCocExpiry',
      title: 'STCW Endorsements / CoC Revalidation Expiry',
      helper: 'Certificate of Competency & mandatory STCW refresher deadline.',
    },
  ];

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: 'personal', label: 'Personal & Maritime' },
    { id: 'voyages', label: `Sea Service Log (${currentUserVoyages.length})` },
    { id: 'certificates', label: 'Certificate Expiry' },
    { id: 'vault', label: 'Private Vault & NOK' },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.12em] text-[#806127]">
              BMASA CREDENTIAL, SEA SERVICE &amp; PRIVATE VAULT
            </p>
            <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#0A192F]">
              Member Profile &amp; Maritime Dossier
            </h1>
          </div>

          {currentUserProfile && (
            <button
              type="button"
              data-testid="profile-export-cv-btn"
              onClick={() => setCvModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0A192F] bg-[#FBF8F1] border border-[#C5A059] hover:bg-[#F3E5AB]/60 rounded-lg shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <FileText className="w-4 h-4 text-[#806127]" aria-hidden="true" />
              Export as CV
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Profile editor sections"
          className="inline-flex flex-wrap p-1 bg-slate-200/75 rounded-lg gap-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={subTab === tab.id}
              onClick={() => handleSelectSubTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === tab.id
                  ? 'bg-white text-[#0A192F] shadow-xs'
                  : 'text-slate-600 hover:text-[#0A192F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'voyages' ? (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveVoyage}
            noValidate
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8"
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display text-base font-semibold text-[#0A192F]">
                  {editingVoyageId ? 'Edit Sea Service Entry' : 'Add Sea Service / Voyage Entry'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Leave Sign-Off Date blank if you are currently serving onboard this vessel.
                </p>
              </div>
              {editingVoyageId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVoyageId(null);
                    setVoyageForm(EMPTY_VOYAGE);
                    setVoyageErrors({});
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-[#0A192F]"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="voy-vessel" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vessel Name *
                </label>
                <input
                  id="voy-vessel"
                  type="text"
                  required
                  value={voyageForm.vesselName}
                  onChange={(e) => setVoyageForm((p) => ({ ...p, vesselName: e.target.value }))}
                  placeholder="e.g., MV Banglar Arjan"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {voyageErrors.vesselName && (
                  <p className="mt-1 text-xs text-red-600">{voyageErrors.vesselName}</p>
                )}
              </div>

              <div>
                <label htmlFor="voy-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vessel Type *
                </label>
                <select
                  id="voy-type"
                  value={voyageForm.vesselType}
                  onChange={(e) =>
                    setVoyageForm((p) => ({ ...p, vesselType: e.target.value as VesselType }))
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
                <label htmlFor="voy-company" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Shipping Company / Manning Agent *
                </label>
                <input
                  id="voy-company"
                  type="text"
                  required
                  value={voyageForm.companyName}
                  onChange={(e) => setVoyageForm((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="e.g., Bangladesh Shipping Corporation"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {voyageErrors.companyName && (
                  <p className="mt-1 text-xs text-red-600">{voyageErrors.companyName}</p>
                )}
              </div>

              <div>
                <label htmlFor="voy-rank" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rank Served *
                </label>
                <RankSelectField
                  id="voy-rank"
                  value={voyageForm.rankServed}
                  onChange={(val) => setVoyageForm((p) => ({ ...p, rankServed: val }))}
                  placeholderOption="Select Rank Served..."
                  customPlaceholder="Specify custom sea rank"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {voyageErrors.rankServed && (
                  <p className="mt-1 text-xs text-red-600">{voyageErrors.rankServed}</p>
                )}
              </div>

              <div>
                <label htmlFor="voy-signon" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sign-On Date *
                </label>
                <input
                  id="voy-signon"
                  type="date"
                  required
                  value={voyageForm.signOnDate}
                  onChange={(e) => setVoyageForm((p) => ({ ...p, signOnDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {voyageErrors.signOnDate && (
                  <p className="mt-1 text-xs text-red-600">{voyageErrors.signOnDate}</p>
                )}
              </div>

              <div>
                <label htmlFor="voy-signoff" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sign-Off Date (Optional)
                </label>
                <input
                  id="voy-signoff"
                  type="date"
                  value={voyageForm.signOffDate}
                  onChange={(e) => setVoyageForm((p) => ({ ...p, signOffDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {voyageErrors.signOffDate && (
                  <p className="mt-1 text-xs text-red-600">{voyageErrors.signOffDate}</p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex justify-end">
              <button
                type="submit"
                disabled={voyageSaving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
                {voyageSaving
                  ? 'Saving...'
                  : editingVoyageId
                  ? 'Update Voyage'
                  : 'Add Voyage Record'}
              </button>
            </div>
          </form>

          <section className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Ship className="w-4 h-4 text-[#0A192F]" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-[#0A192F]">
                  Recorded Sea Service Timeline
                </h2>
              </div>
              <p className="font-mono text-xs text-slate-600 tabular-nums">
                Total Cumulative Sea Time:{' '}
                <strong data-testid="sea-time-ymd" className="text-[#0A192F]">
                  {totalSeaTime.formattedYmd}
                </strong>
              </p>
            </div>

            {sortedVoyages.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-600">
                  No voyages logged yet. Add your first contract above to calculate your sea time.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#E2E8F0]">
                {sortedVoyages.map((voyage) => (
                  <li
                    key={voyage.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold text-[#0A192F]">
                        {voyage.vesselName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {voyage.rankServed} · {voyage.vesselType} · {voyage.companyName}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                        {formatMaritimeDate(voyage.signOnDate)} — {formatMaritimeDate(voyage.signOffDate)}
                        <span className="mx-2 text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[#0A192F] font-medium">
                          {calculateSingleVoyageDuration(voyage.signOnDate, voyage.signOffDate)}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditVoyage(voyage)}
                        aria-label={`Edit voyage on ${voyage.vesselName}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-[#CBD5E1] hover:border-[#0A192F] hover:text-[#0A192F] rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVoyage(voyage.id)}
                        aria-label={`Delete voyage on ${voyage.vesselName}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <form
          onSubmit={handleSaveProfile}
          noValidate
          className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
        >
          {subTab === 'personal' && (
            <>
              {/* Avatar Section */}
              <div className="p-4 sm:p-8 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
                <AvatarPhoto
                  src={form.photoUrl}
                  name={form.fullName || 'BMASA Member'}
                  sizeClass="w-20 h-20"
                  roundedClass="rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-base font-semibold text-[#0A192F]">
                    Official Credential Portrait
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload a crisp square headshot (compressed safely for Firestore) or paste an image URL.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      aria-label="Upload profile photo"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      Upload Compressed Photo
                    </button>
                    <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
                      <label htmlFor="profile-photo-url" className="sr-only">
                        Photo URL
                      </label>
                      <input
                        id="profile-photo-url"
                        type="url"
                        value={form.photoUrl.startsWith('data:') ? '' : form.photoUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
                        placeholder={
                          form.photoUrl.startsWith('data:')
                            ? 'Compressed photo attached (paste URL to replace)'
                            : 'Or paste image URL (https://...)'
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                      />
                    </div>
                  </div>
                  {profileErrors.photoUrl && (
                    <p className="mt-1.5 text-xs text-red-600">{profileErrors.photoUrl}</p>
                  )}
                </div>
              </div>

              {/* Maritime Identity Fields */}
              <div className="p-4 sm:p-8 border-b border-[#E2E8F0]">
                <h2 className="font-display text-sm font-semibold text-[#0A192F] mb-5">
                  Public Directory &amp; Digital ID Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="prof-fullname" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name (as per CDC/Passport) *
                    </label>
                    <input
                      id="prof-fullname"
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.fullName && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="prof-rank" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current Rank / CoC Grade *
                    </label>
                    <RankSelectField
                      id="prof-rank"
                      value={form.currentRank}
                      onChange={(val) => setForm((prev) => ({ ...prev, currentRank: val }))}
                      placeholderOption="Select Current Rank / CoC Grade..."
                      customPlaceholder="Specify custom rank or role"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.currentRank && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.currentRank}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="prof-cadet" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {form.department === 'Instructors'
                        ? 'Faculty ID / Cadet Reference (Optional)'
                        : 'Academic Cadet Number *'}
                    </label>
                    <input
                      id="prof-cadet"
                      type="text"
                      required={form.department !== 'Instructors'}
                      value={form.cadetNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, cadetNumber: e.target.value }))}
                      placeholder={
                        form.department === 'Instructors' ? 'BMAS-INST (Optional)' : 'BMAS-04-N0108'
                      }
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.cadetNumber && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.cadetNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="prof-batch" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Batch / Intake *
                    </label>
                    <select
                      id="prof-batch"
                      value={form.batch}
                      onChange={(e) => setForm((prev) => ({ ...prev, batch: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    >
                      {BMAS_BATCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="prof-dept" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Department *
                    </label>
                    <select
                      id="prof-dept"
                      value={form.department}
                      onChange={(e) => {
                        const nextDept = e.target.value as Department;
                        setForm((prev) => ({
                          ...prev,
                          department: nextDept,
                          isInstructor: nextDept === 'Instructors',
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="prof-cdc" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      CDC Number (Continuous Discharge Certificate)
                    </label>
                    <input
                      id="prof-cdc"
                      type="text"
                      value={form.cdcNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, cdcNumber: e.target.value }))}
                      placeholder="C/O/91402"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.cdcNumber && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.cdcNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="prof-sid" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      SID Card Number (Seafarers Identity Document)
                    </label>
                    <input
                      id="prof-sid"
                      type="text"
                      value={form.sidNumber ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, sidNumber: e.target.value }))}
                      placeholder="BGD-SID-004192"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.sidNumber && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.sidNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="prof-status" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current Availability Status *
                    </label>
                    <select
                      id="prof-status"
                      value={form.availabilityStatus}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
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
                    <label htmlFor="prof-blood" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Blood Group (For Emergency Donor Directory)
                    </label>
                    <select
                      id="prof-blood"
                      value={form.bloodGroup}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bloodGroup: e.target.value as BloodGroup | '' }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="prof-city" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current City / Port
                    </label>
                    <input
                      id="prof-city"
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g., Sylhet, Dhaka, Chattogram, or At Sea"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>

                  <div>
                    <label htmlFor="prof-country" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current Country
                    </label>
                    <input
                      id="prof-country"
                      type="text"
                      value={form.country}
                      onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                      placeholder="e.g., Bangladesh"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="prof-additional-info" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Additional Information &amp; Bio (Displayed in Directory)
                    </label>
                    <textarea
                      id="prof-additional-info"
                      rows={3}
                      maxLength={1000}
                      value={form.additionalInfo ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, additionalInfo: e.target.value }))
                      }
                      placeholder="Add subjects taught, maritime expertise, awards, or any desired information..."
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.additionalInfo && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.additionalInfo}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="prof-cv" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      CV / Resume URL (Google Drive or LinkedIn)
                    </label>
                    <input
                      id="prof-cv"
                      type="url"
                      value={form.cvUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, cvUrl: e.target.value }))}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.cvUrl && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.cvUrl}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] cursor-pointer">
                      <input
                        id="prof-show-contact"
                        type="checkbox"
                        checked={form.showContactInDirectory !== false}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, showContactInDirectory: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-slate-300 text-[#0A192F]"
                      />
                      <div>
                        <span className="block text-xs font-semibold text-[#0A192F]">
                          Show Call / Contact button (Phone &amp; Email) on Alumni Directory &amp; Digital ID
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          Shares your email &amp; WhatsApp/mobile on your member card so fellow BMASA alumni can reach you directly. Private Vault (Passport, Bank, Expiry, NOK) remains locked.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Academy Name & Academic Qualifications (SSC, HSC, Maritime Degrees) */}
              <div className="p-6 sm:p-8 border-b border-[#E2E8F0] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <GraduationCap className="w-5 h-5 text-[#806127] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h2 className="font-display text-sm font-semibold text-[#0A192F]">
                        Academy &amp; Academic Qualifications (SSC, HSC &amp; Higher Studies)
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Included automatically in your downloadable BMASA Seafarer CV alongside CDC, Passport, COPs &amp; NOK.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid="add-ssc-btn"
                      onClick={() => handleAddAcademicQualification('SSC')}
                      className="px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors"
                    >
                      + Add SSC
                    </button>
                    <button
                      type="button"
                      data-testid="add-hsc-btn"
                      onClick={() => handleAddAcademicQualification('HSC')}
                      className="px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors"
                    >
                      + Add HSC
                    </button>
                    <button
                      type="button"
                      data-testid="add-qualification-btn"
                      onClick={() => handleAddAcademicQualification('B.Sc. in Nautical Science')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                      Add Qualification
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="prof-academy" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Maritime Academy Name
                  </label>
                  <input
                    id="prof-academy"
                    type="text"
                    value={form.academyName ?? DEFAULT_ACADEMY_NAME}
                    onChange={(e) => setForm((prev) => ({ ...prev, academyName: e.target.value }))}
                    placeholder={DEFAULT_ACADEMY_NAME}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {profileErrors.academyName && (
                    <p className="mt-1 text-xs text-red-600">{profileErrors.academyName}</p>
                  )}
                </div>

                {(form.academicQualifications ?? []).length === 0 ? (
                  <div className="p-5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center text-xs text-slate-500">
                    No SSC, HSC, or university records added yet. Use the quick buttons above to add your qualifications.
                  </div>
                ) : (
                  <div className="space-y-3" data-testid="academic-qualifications-list">
                    {(form.academicQualifications ?? []).map((qual, idx) => (
                      <div
                        key={qual.id}
                        className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/70 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-[#806127]">
                            QUALIFICATION #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAcademicQualification(qual.id)}
                            aria-label={`Remove qualification ${qual.level || idx + 1}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:underline"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                          <div>
                            <label
                              htmlFor={`qual-level-${qual.id}`}
                              className="block text-[11px] font-semibold text-slate-700 mb-1"
                            >
                              Level / Degree *
                            </label>
                            <input
                              id={`qual-level-${qual.id}`}
                              list="academic-level-presets"
                              type="text"
                              value={qual.level}
                              onChange={(e) =>
                                handleUpdateAcademicQualification(qual.id, { level: e.target.value })
                              }
                              placeholder="SSC / HSC / B.Sc."
                              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`qual-inst-${qual.id}`}
                              className="block text-[11px] font-semibold text-slate-700 mb-1"
                            >
                              School / College / University
                            </label>
                            <input
                              id={`qual-inst-${qual.id}`}
                              type="text"
                              value={qual.institution}
                              onChange={(e) =>
                                handleUpdateAcademicQualification(qual.id, { institution: e.target.value })
                              }
                              placeholder="Institution name"
                              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`qual-board-${qual.id}`}
                              className="block text-[11px] font-semibold text-slate-700 mb-1"
                            >
                              Board / University
                            </label>
                            <input
                              id={`qual-board-${qual.id}`}
                              type="text"
                              value={qual.boardOrUniversity}
                              onChange={(e) =>
                                handleUpdateAcademicQualification(qual.id, {
                                  boardOrUniversity: e.target.value,
                                })
                              }
                              placeholder="e.g., Sylhet Board / BSMRMU"
                              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`qual-year-${qual.id}`}
                              className="block text-[11px] font-semibold text-slate-700 mb-1"
                            >
                              Passing Year
                            </label>
                            <input
                              id={`qual-year-${qual.id}`}
                              type="text"
                              value={qual.passingYear}
                              onChange={(e) =>
                                handleUpdateAcademicQualification(qual.id, { passingYear: e.target.value })
                              }
                              placeholder="e.g., 2020"
                              className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-lg"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`qual-result-${qual.id}`}
                              className="block text-[11px] font-semibold text-slate-700 mb-1"
                            >
                              GPA / CGPA / Division
                            </label>
                            <input
                              id={`qual-result-${qual.id}`}
                              type="text"
                              value={qual.result}
                              onChange={(e) =>
                                handleUpdateAcademicQualification(qual.id, { result: e.target.value })
                              }
                              placeholder="e.g., GPA 5.00"
                              className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <datalist id="academic-level-presets">
                      {ACADEMIC_LEVEL_PRESETS.filter((p) => p !== 'Other').map((preset) => (
                        <option key={preset} value={preset} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>
            </>
          )}

          {subTab === 'certificates' && (
            <div className="p-6 sm:p-8 border-b border-[#E2E8F0] space-y-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <FileBadge2 className="w-5 h-5 text-[#806127] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-sm font-semibold text-[#0A192F]">
                    Core Documents &amp; Certificate Expiry Tracker (Private)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    Stored in your Private Vault. Your dashboard warns you automatically when any Core or COP certificate expires within 6 months.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {certRows.map((item) => {
                  const val = form[item.key] ?? '';
                  const issueVal = item.issueKey ? form[item.issueKey] ?? '' : '';
                  const st = getCertificateExpiryStatus(val);
                  const pillStyle =
                    st.status === 'Expired'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : st.status === 'Expiring Soon'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : st.status === 'Valid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200';
                  return (
                    <div key={item.key} className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#0A192F]">
                          {item.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] shrink-0 ${pillStyle}`}>
                          {st.label}
                        </span>
                      </div>

                      {item.issueKey ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor={`cert-${item.issueKey}`}
                              className="block text-[11px] font-semibold text-slate-600 mb-1"
                            >
                              Issue Date
                            </label>
                            <input
                              id={`cert-${item.issueKey}`}
                              type="date"
                              value={issueVal}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, [item.issueKey!]: e.target.value }))
                              }
                              className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                            />
                            {profileErrors[item.issueKey] && (
                              <p className="mt-1 text-xs text-red-600">{profileErrors[item.issueKey]}</p>
                            )}
                          </div>
                          <div>
                            <label
                              htmlFor={`cert-${item.key}`}
                              className="block text-[11px] font-semibold text-slate-600 mb-1"
                            >
                              Expiry Date
                            </label>
                            <input
                              id={`cert-${item.key}`}
                              type="date"
                              value={val}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, [item.key]: e.target.value }))
                              }
                              className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label htmlFor={`cert-${item.key}`} className="sr-only">
                            {item.title}
                          </label>
                          <input
                            id={`cert-${item.key}`}
                            type="date"
                            value={val}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, [item.key]: e.target.value }))
                            }
                            className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                          />
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500">{item.helper}</p>
                      {profileErrors[item.key] && (
                        <p className="mt-1 text-xs text-red-600">{profileErrors[item.key]}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* STCW COP Certificates + Add COP Certificate */}
              <div className="pt-5 border-t border-[#E2E8F0] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#0A192F]">
                      STCW Certificates of Proficiency (COP) &amp; Endorsements
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track standard STCW COP issue &amp; expiry dates or add additional endorsements.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="add-cop-btn"
                    onClick={() => {
                      setEditingCopId(null);
                      setCustomCopForm({ title: '', certNumber: '', issueDate: '', expiryDate: '' });
                      setCopErrors({});
                      setShowAddCop((prev) => !prev);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D8B979]" />
                    + Add COP Certificate
                  </button>
                </div>

                {showAddCop && (
                  <div
                    data-testid="add-cop-panel"
                    className="p-4 rounded-xl border-2 border-[#C5A059]/60 bg-[#FBF8F1] space-y-3"
                  >
                    <p className="font-display text-xs font-bold text-[#0A192F]">
                      {editingCopId ? 'Edit Custom COP Certificate' : 'Add Additional COP Certificate'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label htmlFor="custom-cop-title" className="block text-[11px] font-semibold text-slate-700 mb-1">
                          COP Certificate Title *
                        </label>
                        <input
                          id="custom-cop-title"
                          type="text"
                          value={customCopForm.title}
                          onChange={(e) => setCustomCopForm((p) => ({ ...p, title: e.target.value }))}
                          placeholder="e.g., High Voltage / IGF Code / BTM"
                          className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg"
                        />
                        {copErrors.title && <p className="mt-1 text-[11px] text-red-600">{copErrors.title}</p>}
                      </div>
                      <div>
                        <label htmlFor="custom-cop-num" className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Certificate No. (Optional)
                        </label>
                        <input
                          id="custom-cop-num"
                          type="text"
                          value={customCopForm.certNumber}
                          onChange={(e) => setCustomCopForm((p) => ({ ...p, certNumber: e.target.value }))}
                          placeholder="e.g., COP-BD-44821"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-lg"
                        />
                      </div>
                      <div>
                        <label htmlFor="custom-cop-issue" className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Issue Date
                        </label>
                        <input
                          id="custom-cop-issue"
                          type="date"
                          value={customCopForm.issueDate}
                          onChange={(e) => setCustomCopForm((p) => ({ ...p, issueDate: e.target.value }))}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-lg"
                        />
                        {copErrors.issueDate && (
                          <p className="mt-1 text-[11px] text-red-600">{copErrors.issueDate}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="custom-cop-expiry" className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          id="custom-cop-expiry"
                          type="date"
                          value={customCopForm.expiryDate}
                          onChange={(e) => setCustomCopForm((p) => ({ ...p, expiryDate: e.target.value }))}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-lg"
                        />
                        {copErrors.expiryDate && (
                          <p className="mt-1 text-[11px] text-red-600">{copErrors.expiryDate}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCop(false);
                          setEditingCopId(null);
                          setCopErrors({});
                        }}
                        className="px-3 py-1.5 text-xs font-semibold border border-[#CBD5E1] bg-white rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingCopKey === 'custom'}
                        onClick={handleSaveCustomCop}
                        data-testid="save-custom-cop-btn"
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg"
                      >
                        {savingCopKey === 'custom' ? 'Saving...' : 'Save COP Certificate'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {STANDARD_COP_CERTIFICATES.map((title) => {
                    const draft = copDrafts[title] ?? { certNumber: '', issueDate: '', expiryDate: '' };
                    const existing = currentUserCopCertificates.find((c) => c.title === title);
                    const st = getCertificateExpiryStatus(draft.expiryDate);
                    const pillStyle =
                      st.status === 'Expired'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : st.status === 'Expiring Soon'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : st.status === 'Valid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200';
                    return (
                      <div key={title} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-[#0A192F] leading-snug">{title}</p>
                          <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] shrink-0 ${pillStyle}`}>
                            {st.label}
                          </span>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Certificate Number
                          </label>
                          <input
                            type="text"
                            aria-label={`${title} Certificate Number`}
                            value={draft.certNumber}
                            onChange={(e) =>
                              setCopDrafts((prev) => ({
                                ...prev,
                                [title]: { ...draft, certNumber: e.target.value },
                              }))
                            }
                            placeholder="Cert No."
                            className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-lg"
                          />
                        </div>
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                              Issue Date
                            </label>
                            <input
                              type="date"
                              aria-label={`${title} Issue Date`}
                              value={draft.issueDate}
                              onChange={(e) =>
                                setCopDrafts((prev) => ({
                                  ...prev,
                                  [title]: { ...draft, issueDate: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="date"
                              aria-label={`${title} Expiry Date`}
                              value={draft.expiryDate}
                              onChange={(e) =>
                                setCopDrafts((prev) => ({
                                  ...prev,
                                  [title]: { ...draft, expiryDate: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-lg"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          {existing ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteCop(existing)}
                              className="text-[11px] font-medium text-rose-700 hover:underline"
                            >
                              Clear
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Standard STCW COP</span>
                          )}
                          <button
                            type="button"
                            disabled={savingCopKey === title}
                            onClick={() => handleSaveStandardCop(title)}
                            className="px-3 py-1 text-[11px] font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-md transition-colors cursor-pointer"
                          >
                            {savingCopKey === title ? 'Saving...' : 'Save COP'}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Additional Custom COP Certificates */}
                  {currentUserCopCertificates
                    .filter((cert) => !STANDARD_COP_CERTIFICATES.includes(cert.title))
                    .map((cert) => {
                      const st = getCertificateExpiryStatus(cert.expiryDate);
                      const pillStyle =
                        st.status === 'Expired'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : st.status === 'Expiring Soon'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : st.status === 'Valid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200';
                      return (
                        <div key={cert.id} className="p-4 rounded-xl border border-[#C5A059]/45 bg-white space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-[#0A192F]">{cert.title}</p>
                              <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                                {cert.certNumber || 'Additional COP'} · Issue: {cert.issueDate || '—'} · Exp: {cert.expiryDate || 'No expiry set'}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] shrink-0 ${pillStyle}`}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCopId(cert.id);
                                setCustomCopForm({
                                  title: cert.title,
                                  certNumber: cert.certNumber,
                                  issueDate: cert.issueDate ?? '',
                                  expiryDate: cert.expiryDate,
                                });
                                setShowAddCop(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-[#CBD5E1] rounded-md"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCop(cert)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-700 border border-rose-200 rounded-md"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {subTab === 'vault' && (
            <div className="p-6 sm:p-8 border-b border-[#E2E8F0] space-y-8">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0A192F] text-white">
                <Lock className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-sm font-semibold">
                    Strictly Confidential Private Vault
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                    Stored in an isolated Firestore vault (`private_vault`). Completely hidden from public
                    views and other members — accessible only to you and verified BMASA Verification /
                    Treasury Admins.
                  </p>
                </div>
              </div>

              {/* Contact & Passport */}
              <div>
                <h3 className="font-display text-sm font-semibold text-[#0A192F] mb-4">
                  Direct Contact &amp; Passport Verification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="prof-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address *
                    </label>
                    <input
                      id="prof-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="prof-passport" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Passport Number (Private / Admin-Only)
                    </label>
                    <input
                      id="prof-passport"
                      type="text"
                      value={form.passportNumber ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, passportNumber: e.target.value }))
                      }
                      placeholder="e.g., A01234567"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                    {profileErrors.passportNumber && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.passportNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="prof-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mobile Phone
                    </label>
                    <input
                      id="prof-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+880 17XX-XXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>

                  <div>
                    <label htmlFor="prof-whatsapp" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      WhatsApp Number
                    </label>
                    <input
                      id="prof-whatsapp"
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="+880 17XX-XXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>
                </div>
              </div>

              {/* Welfare Bank Info */}
              <div className="pt-6 border-t border-[#E2E8F0]">
                <h3 className="font-display text-sm font-semibold text-[#0A192F] mb-4">
                  Confidential Welfare Bank &amp; MFS Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vault-holder" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Account Holder Name
                    </label>
                    <input
                      id="vault-holder"
                      type="text"
                      value={form.bankAccountHolder ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bankAccountHolder: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bankName: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bankBranch: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>

                  <div>
                    <label htmlFor="vault-acct" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bank Account Number
                    </label>
                    <input
                      id="vault-acct"
                      type="text"
                      value={form.bankAccountNumber ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bankAccountNumber: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bankRoutingNumber: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>

                  <div>
                    <label htmlFor="vault-mfs" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      bKash / Nagad Personal Number
                    </label>
                    <input
                      id="vault-mfs"
                      type="tel"
                      value={form.mfsNumber ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, mfsNumber: e.target.value }))
                      }
                      placeholder="+880 17XX-XXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Next-of-Kin */}
              <div className="pt-6 border-t border-[#E2E8F0]">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-[#806127]" aria-hidden="true" />
                  <h3 className="font-display text-sm font-semibold text-[#0A192F]">
                    Emergency Next-of-Kin (NOK) Contact
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vault-nok-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      NOK Full Name
                    </label>
                    <input
                      id="vault-nok-name"
                      type="text"
                      value={form.nokName ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, nokName: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>

                  <div>
                    <label htmlFor="vault-nok-rel" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Relationship
                    </label>
                    <input
                      id="vault-nok-rel"
                      type="text"
                      value={form.nokRelation ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, nokRelation: e.target.value }))
                      }
                      placeholder="e.g., Spouse, Father, Brother"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>

                  <div>
                    <label htmlFor="vault-nok-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Emergency Phone
                    </label>
                    <input
                      id="vault-nok-phone"
                      type="tel"
                      value={form.nokPhone ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, nokPhone: e.target.value }))
                      }
                      placeholder="+880 17XX-XXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>

                  <div>
                    <label htmlFor="vault-nok-city" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      NOK Home City
                    </label>
                    <input
                      id="vault-nok-city"
                      type="text"
                      value={form.nokCity ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, nokCity: e.target.value }))
                      }
                      placeholder="e.g., Sylhet, Dhaka"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Footer */}
          <div className="px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]/60">
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              {Object.keys(profileErrors).length > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-rose-700 font-medium">
                    Check Personal or Certificate tabs for validation notices.
                  </span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Public directory fields and Private Vault save together securely.</span>
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              {currentUserProfile && (
                <button
                  type="button"
                  onClick={() => setCvModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[#0A192F] bg-[#FBF8F1] border border-[#C5A059] hover:bg-[#F3E5AB]/50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-[#806127]" aria-hidden="true" />
                  Export as CV
                </button>
              )}
              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                {profileSaving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </form>
      )}

      {currentUserProfile && (
        <CvPreviewModal
          open={cvModalOpen}
          onClose={() => setCvModalOpen(false)}
          profile={{
            ...currentUserProfile,
            fullName: form.fullName || currentUserProfile.fullName,
            photoUrl: form.photoUrl || currentUserProfile.photoUrl,
            cadetNumber: form.cadetNumber || currentUserProfile.cadetNumber,
            batch: cleanBatchLabel(form.batch || currentUserProfile.batch),
            department: form.department || currentUserProfile.department,
            cdcNumber: form.cdcNumber,
            sidNumber: form.sidNumber ?? '',
            currentRank: form.currentRank || currentUserProfile.currentRank,
            availabilityStatus: form.availabilityStatus || currentUserProfile.availabilityStatus,
            bloodGroup: form.bloodGroup,
            city: form.city,
            country: form.country,
            cvUrl: form.cvUrl,
          }}
          vault={{
            uid: currentUserVault?.uid ?? currentUserProfile.uid,
            email: form.email,
            phone: form.phone,
            whatsapp: form.whatsapp,
            academyName: form.academyName ?? DEFAULT_ACADEMY_NAME,
            passportNumber: form.passportNumber ?? '',
            passportIssueDate: form.passportIssueDate ?? '',
            passportExpiry: form.passportExpiry ?? '',
            cdcIssueDate: form.cdcIssueDate ?? '',
            cdcExpiry: form.cdcExpiry ?? '',
            medicalExpiry: form.medicalExpiry ?? '',
            stcwCocExpiry: form.stcwCocExpiry ?? '',
            academicQualifications: form.academicQualifications ?? [],
            bankAccountHolder: form.bankAccountHolder ?? '',
            bankName: form.bankName ?? '',
            bankBranch: form.bankBranch ?? '',
            bankAccountNumber: form.bankAccountNumber ?? '',
            bankRoutingNumber: form.bankRoutingNumber ?? '',
            mfsNumber: form.mfsNumber ?? '',
            nokName: form.nokName ?? '',
            nokRelation: form.nokRelation ?? '',
            nokPhone: form.nokPhone ?? '',
            nokCity: form.nokCity ?? '',
          }}
          voyages={currentUserVoyages}
          copCertificates={currentUserCopCertificates}
        />
      )}
    </main>
  );
}
