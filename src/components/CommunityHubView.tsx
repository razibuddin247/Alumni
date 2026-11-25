import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  Megaphone,
  Paperclip,
  Pin,
  Plus,
  Radio,
  Send,
  ShieldCheck,
  Ship,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { MorsePracticeModal } from './MorsePracticeModal';
import { MaritimeNewsFeedView } from './MaritimeNewsFeedView';
import { CvPreviewModal } from './CvPreviewModal';
import { useToast } from '../context/ToastContext';
import {
  BMASA_COMMITTEE_ROLES,
  CREWING_INTAKE_STATUSES,
  MENTORSHIP_TRACKS,
  NOTICE_CATEGORIES,
  NOTICE_TYPES,
  ROADMAP_ITEM_STATUSES,
  type CrewingCompany,
  type CrewingIntakeStatus,
  type MentorshipExamTrack,
  type NoticeCategory,
  type NoticeType,
  type RoadmapItemStatus,
  type RoadmapItemType,
} from '../types/portal';
import { RankSelectField } from './RankSelectField';
import {
  buildEmlWithPdfAttachment,
  buildSeafarerCvData,
  generateSeafarerCvPdf,
  triggerBlobDownload,
  type GeneratedCvPdf,
} from '../utils/cvBuilder';
import {
  buildManningAgencyApplicationPayload,
  buildShareableProfileUrl,
  cleanBatchLabel,
  extractEmailsFromContact,
  formatBdtAmount,
  formatMaritimeDate,
  sortAndFilterNotices,
  type NoticeSortOption,
  type NoticeTypeFilter,
} from '../utils/portalLogic';
import {
  validateCrewingCompanyInput,
  validateDhakaRoadmapInput,
  validateMentorshipInput,
  validateNoticeInput,
  type CrewingCompanyFormInput,
  type DhakaRoadmapFormInput,
  type MentorshipFormInput,
  type NoticeFormInput,
} from '../utils/validation';

import { useHistoryOverlay } from '../hooks/useHistoryOverlay';
import { buildPortalUrl, readSectionFromSearch } from '../utils/historyNavigation';

type HubTab = 'notices' | 'news' | 'committee' | 'mentorship' | 'crewing';

const VALID_HUB_TABS: readonly HubTab[] = ['notices', 'news', 'committee', 'mentorship', 'crewing'];

function resolveHubTabFromUrl(): HubTab {
  if (typeof window === 'undefined') return 'notices';
  const raw = readSectionFromSearch(window.location.search);
  return raw && (VALID_HUB_TABS as readonly string[]).includes(raw) ? (raw as HubTab) : 'notices';
}

const EMPTY_NOTICE: NoticeFormInput = {
  title: '',
  noticeType: 'General',
  category: 'General Circular',
  body: '',
  attachmentUrl: '',
  isPinned: false,
};

function getNoticeTypeBadgeClass(noticeType: NoticeType): string {
  switch (noticeType) {
    case 'Nautical':
      return 'bg-sky-50 border border-sky-200 text-sky-800';
    case 'Engineering':
      return 'bg-teal-50 border border-teal-200 text-teal-800';
    case 'General':
    default:
      return 'bg-amber-50 border border-amber-200 text-[#806127]';
  }
}

const EMPTY_MENTORSHIP: MentorshipFormInput = {
  examTrack: 'Class 3 / CoC',
  title: '',
  adviceBody: '',
  resourceUrl: '',
};

const EMPTY_CREWING: CrewingCompanyFormInput = {
  companyName: '',
  dosLicense: '',
  fleetType: '',
  cadetIntakeStatus: 'Accepting Cadets',
  contactEmail: '',
  alumniNotes: '',
};

const EMPTY_ROADMAP: DhakaRoadmapFormInput = {
  itemType: 'milestone',
  title: '',
  subtitle: '',
  personName: '',
  personBatch: '',
  personCadetNo: '',
  status: 'Planned',
  targetAmountBdt: '0',
  raisedAmountBdt: '0',
  displayOrder: '1',
  notes: '',
};

export function CommunityHubView() {
  const {
    isAdmin,
    currentUserProfile,
    currentUserVault,
    currentUserVoyages,
    currentUserCopCertificates,
    notices,
    mentorshipPosts,
    crewingCompanies,
    dhakaRoadmap,
    fundTransactions,
    saveNotice,
    removeNotice,
    saveMentorship,
    removeMentorship,
    saveCrewing,
    removeCrewing,
    saveRoadmapItem,
    removeRoadmapItem,
  } = usePortal();
  const { showToast, updateToast } = useToast();

  const [hubTab, setHubTab] = useState<HubTab>(() => resolveHubTabFromUrl());
  const canMemberPost = isAdmin || Boolean(currentUserProfile?.isVerified);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = (event: PopStateEvent) => {
      const fromUrl = readSectionFromSearch(window.location.search);
      const fromState = event.state?.bmasaSection;
      const candidate = fromUrl ?? (typeof fromState === 'string' ? fromState : null);
      if (candidate && (VALID_HUB_TABS as readonly string[]).includes(candidate)) {
        setHubTab(candidate as HubTab);
      } else {
        setHubTab('notices');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectHubTab = useCallback(
    (nextTab: HubTab) => {
      if (typeof window !== 'undefined' && nextTab !== hubTab) {
        const nextUrl = buildPortalUrl(window.location.href, {
          tab: 'community',
          section: nextTab === 'notices' ? null : nextTab,
        });
        window.history.pushState(
          {
            ...(window.history.state || {}),
            bmasaTab: 'community',
            bmasaSection: nextTab === 'notices' ? null : nextTab,
          },
          '',
          nextUrl
        );
      }
      setHubTab(nextTab);
    },
    [hubTab]
  );

  // Notices Controls, Detail Reader & Publish Modal
  const [noticeTypeFilter, setNoticeTypeFilter] = useState<NoticeTypeFilter>('All');
  const [noticeSort, setNoticeSort] = useState<NoticeSortOption>('newest');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [noticeModal, setNoticeModal] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeForm, setNoticeForm] = useState<NoticeFormInput>(EMPTY_NOTICE);
  const [noticeErrors, setNoticeErrors] = useState<Record<string, string>>({});

  // Mentorship Modal & Filter
  const [trackFilter, setTrackFilter] = useState<'All' | MentorshipExamTrack>('All');
  const [mentorModal, setMentorModal] = useState(false);
  const [editingMentorId, setEditingMentorId] = useState<string | null>(null);
  const [mentorForm, setMentorForm] = useState<MentorshipFormInput>(EMPTY_MENTORSHIP);
  const [mentorErrors, setMentorErrors] = useState<Record<string, string>>({});

  // Crewing Directory & Application Flow
  const [crewingModal, setCrewingModal] = useState(false);
  const [editingCrewingId, setEditingCrewingId] = useState<string | null>(null);
  const [crewingForm, setCrewingForm] = useState<CrewingCompanyFormInput>(EMPTY_CREWING);
  const [crewingErrors, setCrewingErrors] = useState<Record<string, string>>({});
  const [expandedApplyCompanyId, setExpandedApplyCompanyId] = useState<string | null>(null);
  const [manningApplyTargets, setManningApplyTargets] = useState<CrewingCompany[]>([]);
  const [manningApplyRank, setManningApplyRank] = useState<string>('');
  const [manningApplySalary, setManningApplySalary] = useState<string>('');
  const [manningBulkConfirm, setManningBulkConfirm] = useState<boolean>(false);
  const [manningCvModalOpen, setManningCvModalOpen] = useState<boolean>(false);
  const [manningCopied, setManningCopied] = useState<boolean>(false);

  // Committee & Dhaka Roadmap Modal
  const [roadmapModal, setRoadmapModal] = useState(false);
  const [editingRoadmapId, setEditingRoadmapId] = useState<string | null>(null);
  const [roadmapForm, setRoadmapForm] = useState<DhakaRoadmapFormInput>(EMPTY_ROADMAP);
  const [roadmapErrors, setRoadmapErrors] = useState<Record<string, string>>({});

  // Morse Practice Modal
  const [morseModalOpen, setMorseModalOpen] = useState(false);

  const selectedNotice = useMemo(
    () => (selectedNoticeId ? notices.find((n) => n.id === selectedNoticeId) ?? null : null),
    [notices, selectedNoticeId]
  );

  const visibleNotices = useMemo(
    () => sortAndFilterNotices(notices, { sortBy: noticeSort, noticeType: noticeTypeFilter }),
    [notices, noticeSort, noticeTypeFilter]
  );

  const closeSelectedNotice = useCallback(() => setSelectedNoticeId(null), []);
  const closeNoticeModal = useCallback(() => setNoticeModal(false), []);
  const closeMentorModal = useCallback(() => setMentorModal(false), []);
  const closeCrewingModal = useCallback(() => setCrewingModal(false), []);
  const closeManningApplyModal = useCallback(() => {
    setManningApplyTargets([]);
    setManningBulkConfirm(false);
  }, []);
  const closeRoadmapModal = useCallback(() => setRoadmapModal(false), []);
  const closeMorseModal = useCallback(() => setMorseModalOpen(false), []);

  useHistoryOverlay(Boolean(selectedNotice), 'bmasaNoticeDetailModal', closeSelectedNotice);
  useHistoryOverlay(noticeModal && isAdmin, 'bmasaNoticeModal', closeNoticeModal);
  useHistoryOverlay(mentorModal && canMemberPost, 'bmasaMentorModal', closeMentorModal);
  useHistoryOverlay(crewingModal && canMemberPost, 'bmasaCrewingModal', closeCrewingModal);
  useHistoryOverlay(manningApplyTargets.length > 0, 'bmasaManningApplyModal', closeManningApplyModal);
  useEffect(() => {
    if (manningApplyTargets.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeManningApplyModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [manningApplyTargets.length, closeManningApplyModal]);
  useHistoryOverlay(roadmapModal && isAdmin, 'bmasaRoadmapModal', closeRoadmapModal);
  useHistoryOverlay(morseModalOpen, 'bmasaMorseModal', closeMorseModal);

  const agenciesWithEmail = useMemo(
    () => crewingCompanies.filter((c) => extractEmailsFromContact(c.contactEmail).length > 0),
    [crewingCompanies]
  );

  const memberShareUrl = useMemo(() => {
    if (!currentUserProfile) return '';
    if (typeof window === 'undefined') {
      return `https://bmasa-portal.org/?member=${currentUserProfile.uid}`;
    }
    return buildShareableProfileUrl(
      window.location.origin,
      window.location.pathname,
      currentUserProfile.uid
    );
  }, [currentUserProfile]);

  const [manningPdf, setManningPdf] = useState<GeneratedCvPdf | null>(null);
  const [manningPdfLoading, setManningPdfLoading] = useState(false);

  const defaultManningPdfName = useMemo(() => {
    if (!currentUserProfile) return 'BMASA-CV.pdf';
    const safeName = (currentUserProfile.cadetNumber || currentUserProfile.fullName || 'Seafarer').replace(
      /[^A-Za-z0-9_-]/g,
      '_'
    );
    return `BMASA-CV-${safeName}.pdf`;
  }, [currentUserProfile]);

  useEffect(() => {
    if (!currentUserProfile || manningApplyTargets.length === 0) {
      setManningPdf(null);
      setManningPdfLoading(false);
      return;
    }
    let cancelled = false;
    setManningPdfLoading(true);
    const targetCompanyLabel =
      manningApplyTargets.length === 1
        ? manningApplyTargets[0].companyName
        : `${manningApplyTargets.length} Listed BMASA Manning Agencies`;
    const cvData = buildSeafarerCvData({
      profile: currentUserProfile,
      vault: currentUserVault,
      voyages: currentUserVoyages,
      copCertificates: currentUserCopCertificates,
      shareUrl: memberShareUrl,
    });
    generateSeafarerCvPdf(cvData, {
      includeNok: false,
      targetJob: {
        rankNeeded: manningApplyRank.trim() || currentUserProfile.currentRank,
        companyName: targetCompanyLabel,
      },
    })
      .then((res) => {
        if (!cancelled) {
          setManningPdf(res);
          setManningPdfLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setManningPdf(null);
          setManningPdfLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    currentUserProfile,
    currentUserVault,
    currentUserVoyages,
    currentUserCopCertificates,
    memberShareUrl,
    manningApplyTargets,
    manningApplyRank,
  ]);

  const manningPayload = useMemo(() => {
    if (!currentUserProfile || manningApplyTargets.length === 0) return null;
    return buildManningAgencyApplicationPayload({
      agencies: manningApplyTargets.map((a) => ({
        companyName: a.companyName,
        contactEmail: a.contactEmail,
      })),
      selectedRank: manningApplyRank || currentUserProfile.currentRank,
      expectedSalary: manningApplySalary,
      member: currentUserProfile,
      profileUrl: memberShareUrl,
      applicantEmail: currentUserVault?.email || currentUserProfile.contactEmail,
      cvPdfFilename: manningPdf?.filename || defaultManningPdfName,
    });
  }, [
    currentUserProfile,
    currentUserVault,
    manningApplyTargets,
    manningApplyRank,
    manningApplySalary,
    memberShareUrl,
    manningPdf,
    defaultManningPdfName,
  ]);

  const openManningApplicationModal = (targets: CrewingCompany[]) => {
    if (!currentUserProfile || targets.length === 0) return;
    setManningApplyTargets(targets);
    setManningApplyRank(currentUserProfile.currentRank || 'Deck Cadet');
    setManningApplySalary('');
    setManningBulkConfirm(false);
    setManningCopied(false);
  };

  useEffect(() => {
    if (!noticeModal && !selectedNotice) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (noticeModal) {
        setNoticeModal(false);
      } else if (selectedNotice) {
        setSelectedNoticeId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [noticeModal, selectedNotice]);

  const committeeItems = useMemo(
    () => dhakaRoadmap.filter((item) => item.itemType === 'committee'),
    [dhakaRoadmap]
  );

  const milestoneItems = useMemo(
    () => dhakaRoadmap.filter((item) => item.itemType === 'milestone'),
    [dhakaRoadmap]
  );

  const dhakaFundProgress = useMemo(() => {
    const ledgerRaised = fundTransactions
      .filter((tx) => tx.entryType === 'contribution' && tx.category === 'Dhaka Office Fund')
      .reduce((acc, tx) => acc + tx.amount, 0);
    const milestoneTarget = milestoneItems.reduce((acc, m) => acc + (m.targetAmountBdt || 0), 0);
    const milestoneRaised = milestoneItems.reduce((acc, m) => acc + (m.raisedAmountBdt || 0), 0);
    const raised = Math.max(ledgerRaised, milestoneRaised);
    const target = milestoneTarget;
    const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
    return { raised, target, percent };
  }, [fundTransactions, milestoneItems]);

  const filteredMentorship = useMemo(
    () =>
      mentorshipPosts.filter((p) => (trackFilter === 'All' ? true : p.examTrack === trackFilter)),
    [mentorshipPosts, trackFilter]
  );

  // Handlers
  const handleSubmitNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateNoticeInput(noticeForm);
    setNoticeErrors(res.errors);
    if (!res.valid) return;
    const tid = showToast('loading', 'Publishing official circular...');
    try {
      await saveNotice(noticeForm, editingNoticeId ?? undefined);
      setNoticeModal(false);
      updateToast(tid, 'success', 'Circular published', noticeForm.title);
    } catch (err) {
      updateToast(tid, 'error', 'Publish failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleSubmitMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateMentorshipInput(mentorForm);
    setMentorErrors(res.errors);
    if (!res.valid) return;
    const tid = showToast('loading', 'Saving mentorship note...');
    try {
      await saveMentorship(mentorForm, editingMentorId ?? undefined);
      setMentorModal(false);
      updateToast(tid, 'success', 'Mentorship guide saved', mentorForm.title);
    } catch (err) {
      updateToast(tid, 'error', 'Save failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleSubmitCrewing = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateCrewingCompanyInput(crewingForm);
    setCrewingErrors(res.errors);
    if (!res.valid) return;
    const tid = showToast('loading', 'Saving shipping company...');
    try {
      await saveCrewing(crewingForm, editingCrewingId ?? undefined);
      setCrewingModal(false);
      updateToast(tid, 'success', 'Manning directory updated', crewingForm.companyName);
    } catch (err) {
      updateToast(tid, 'error', 'Save failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleSubmitRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateDhakaRoadmapInput(roadmapForm);
    setRoadmapErrors(res.errors);
    if (!res.valid) return;
    const tid = showToast('loading', 'Saving governance / Dhaka Office entry...');
    try {
      await saveRoadmapItem(roadmapForm, editingRoadmapId ?? undefined);
      setRoadmapModal(false);
      updateToast(tid, 'success', 'Entry saved', roadmapForm.title);
    } catch (err) {
      updateToast(tid, 'error', 'Save failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const hubTabs: Array<{ id: HubTab; label: string; count?: number }> = [
    { id: 'notices', label: 'Notices & Circulars', count: notices.length },
    { id: 'news', label: 'Maritime & Shipping News' },
    { id: 'committee', label: 'Committee & Dhaka Office' },
    { id: 'mentorship', label: 'CoC & Mentorship', count: mentorshipPosts.length },
    { id: 'crewing', label: 'Manning Companies', count: crewingCompanies.length },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6 overflow-x-clip">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.12em] text-[#806127]">
            BMASA ALUMNI GOVERNANCE, MENTORSHIP &amp; MARITIME HUB
          </p>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#0A192F]">
            Association Community Hub
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto min-w-0">
          <div
            role="tablist"
            aria-label="Community hub sections"
            className="inline-flex flex-wrap max-w-full p-1 bg-slate-200/75 rounded-lg gap-0.5"
          >
            {hubTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={hubTab === t.id}
                onClick={() => handleSelectHubTab(t.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  hubTab === t.id
                    ? 'bg-white text-[#0A192F] shadow-xs'
                    : 'text-slate-600 hover:text-[#0A192F]'
                }`}
              >
                {t.label}
                {typeof t.count === 'number' ? ` (${t.count})` : ''}
              </button>
            ))}
          </div>

          {hubTab !== 'mentorship' && (
            <button
              type="button"
              data-testid="open-morse-practice-btn"
              onClick={() => setMorseModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Radio className="w-4 h-4 text-[#0A192F]" aria-hidden="true" />
              Morse Practice
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Notices & Official Circulars */}
      {hubTab === 'notices' && (
        <section className="space-y-4 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
            <p className="text-sm text-slate-600 min-w-0">
              Official circulars, Annual General Meeting notices, reunions, and cadet inductions.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto min-w-0">
              <select
                aria-label="Filter circulars by notice type"
                data-testid="notice-type-filter"
                value={noticeTypeFilter}
                onChange={(e) => setNoticeTypeFilter(e.target.value as NoticeTypeFilter)}
                className="px-3 py-2 text-xs font-medium text-[#0A192F] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
              >
                <option value="All">All Types</option>
                {NOTICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                aria-label="Sort circulars"
                data-testid="notice-sort-select"
                value={noticeSort}
                onChange={(e) => setNoticeSort(e.target.value as NoticeSortOption)}
                className="px-3 py-2 text-xs font-medium text-[#0A192F] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
              >
                <option value="newest">Sort: Newest Published</option>
                <option value="oldest">Sort: Oldest Published</option>
                <option value="title_asc">Sort: Title (A–Z)</option>
                <option value="type">Sort: Notice Type</option>
              </select>

              {isAdmin && (
                <button
                  type="button"
                  data-testid="open-publish-notice-btn"
                  onClick={() => {
                    setEditingNoticeId(null);
                    setNoticeForm(EMPTY_NOTICE);
                    setNoticeErrors({});
                    setNoticeModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
                  Publish Circular
                </button>
              )}
            </div>
          </div>

          {notices.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-12 text-center">
              <Megaphone className="w-7 h-7 text-slate-400 mx-auto mb-3" aria-hidden="true" />
              <p className="font-display text-base font-semibold text-[#0A192F]">
                No official BMASA circulars published yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isAdmin
                  ? 'Click "Publish Circular" above to announce AGM dates, reunions, or Dhaka Office milestones.'
                  : 'Official announcements from BMASA administration will appear here.'}
              </p>
            </div>
          ) : visibleNotices.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-10 text-center space-y-3">
              <Megaphone className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
              <div>
                <p className="font-display text-sm font-semibold text-[#0A192F]">
                  No {noticeTypeFilter} circulars published yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Switch notice type filter to view circulars across other departments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNoticeTypeFilter('All')}
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-[#0A192F] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Show All Types
              </button>
            </div>
          ) : (
            <div className="space-y-3" data-testid="notice-list">
              {visibleNotices.map((n) => {
                const resolvedType: NoticeType = n.noticeType || 'General';
                return (
                  <article
                    key={n.id}
                    data-testid="notice-list-item"
                    className={`w-full min-w-0 overflow-hidden bg-white border rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between transition-colors ${
                      n.isPinned
                        ? 'border-[#C5A059] hover:border-[#A8833D]'
                        : 'border-[#E2E8F0] hover:border-[#0A192F]/40'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="notice-item-trigger"
                      onClick={() => setSelectedNoticeId(n.id)}
                      className="w-full max-w-full sm:flex-1 min-w-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-[#F8FAFC] transition-colors rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] overflow-hidden"
                    >
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          {n.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#C5A059]/15 text-[#806127] font-mono text-[10px] font-semibold">
                              <Pin className="w-3 h-3" aria-hidden="true" />
                              PINNED
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${getNoticeTypeBadgeClass(
                              resolvedType
                            )}`}
                          >
                            {resolvedType}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            {formatMaritimeDate(n.createdAt.slice(0, 10))}
                          </span>
                        </div>
                        <h2 className="mt-1.5 font-display text-base sm:text-lg font-bold text-[#0A192F] break-words sm:truncate">
                          {n.title}
                        </h2>
                      </div>

                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#806127] shrink-0">
                        <span className="hidden sm:inline">Read Circular</span>
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-3 px-4 sm:px-5 pb-3 sm:pb-0 sm:pl-0 text-xs shrink-0 border-t sm:border-t-0 border-slate-100 pt-2.5 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoticeId(n.id);
                            setNoticeForm({
                              title: n.title,
                              noticeType: n.noticeType || 'General',
                              category: n.category,
                              body: n.body,
                              attachmentUrl: n.attachmentUrl,
                              isPinned: n.isPinned,
                            });
                            setNoticeErrors({});
                            setNoticeModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-[#0A192F] cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await removeNotice(n.id);
                            if (selectedNoticeId === n.id) setSelectedNoticeId(null);
                            showToast('success', 'Circular deleted', n.title);
                          }}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB: Search-Grounded Maritime & Shipping News Feed */}
      {hubTab === 'news' && <MaritimeNewsFeedView />}

      {/* TAB 2: Executive Committee & Dhaka Office Establishment Roadmap */}
      {hubTab === 'committee' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Transparent progress on establishing the permanent BMASA Dhaka Office alongside the
              current Executive Committee roster.
            </p>
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoadmapId(null);
                    setRoadmapForm({ ...EMPTY_ROADMAP, itemType: 'committee' });
                    setRoadmapErrors({});
                    setRoadmapModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                  Add Committee Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoadmapId(null);
                    setRoadmapForm({ ...EMPTY_ROADMAP, itemType: 'milestone' });
                    setRoadmapErrors({});
                    setRoadmapModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg whitespace-nowrap"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                  Add Dhaka Milestone
                </button>
              </div>
            )}
          </div>

          {/* Dhaka Office Fundraising Progress Banner */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
                  DHAKA OFFICE ESTABLISHMENT FUND
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-[#0A192F]">
                  Permanent BMASA Dhaka Liaison Office Initiative
                </h2>
              </div>
              <div className="sm:text-right font-mono text-xs tabular-nums">
                <p className="text-[#0A192F] font-bold text-base">
                  {formatBdtAmount(dhakaFundProgress.raised)}
                  {dhakaFundProgress.target > 0
                    ? ` / ${formatBdtAmount(dhakaFundProgress.target)}`
                    : ' raised'}
                </p>
                {dhakaFundProgress.target > 0 && (
                  <p className="text-slate-500">{dhakaFundProgress.percent}% of milestone target</p>
                )}
              </div>
            </div>
            <div className="mt-4 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-[#C5A059] transition-all"
                style={{ width: `${dhakaFundProgress.percent}%` }}
              />
            </div>
          </div>

          {/* Executive Committee Roster */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-display text-base font-semibold text-[#0A192F]">
                Executive Committee Roster ({committeeItems.length})
              </h2>
            </div>
            {committeeItems.length === 0 ? (
              <div className="px-6 py-8 text-center text-xs text-slate-500">
                No Executive Committee positions published yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {committeeItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.24, delay: Math.min(idx * 0.04, 0.16) }}
                    className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-mono text-[11px] font-semibold text-[#806127]">
                        {item.title}
                      </p>
                      <p className="mt-1 font-display text-base font-bold text-[#0A192F]">
                        {item.personName}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-600">
                        {[item.personBatch, item.personCadetNo].filter(Boolean).join(' · ')}
                      </p>
                      {item.notes && <p className="mt-2 text-xs text-slate-500">{item.notes}</p>}
                    </div>
                    {isAdmin && (
                      <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center justify-end gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoadmapId(item.id);
                            setRoadmapForm({
                              itemType: item.itemType,
                              title: item.title,
                              subtitle: item.subtitle,
                              personName: item.personName,
                              personBatch: item.personBatch,
                              personCadetNo: item.personCadetNo,
                              status: item.status,
                              targetAmountBdt: String(item.targetAmountBdt),
                              raisedAmountBdt: String(item.raisedAmountBdt),
                              displayOrder: String(item.displayOrder),
                              notes: item.notes,
                            });
                            setRoadmapModal(true);
                          }}
                          className="text-slate-600 hover:text-[#0A192F]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRoadmapItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Dhaka Office Milestones */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-display text-base font-semibold text-[#0A192F]">
                Dhaka Office Establishment Milestones ({milestoneItems.length})
              </h2>
            </div>
            {milestoneItems.length === 0 ? (
              <div className="px-6 py-8 text-center text-xs text-slate-500">
                No Dhaka Office project milestones added yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#E2E8F0]">
                {milestoneItems.map((m) => (
                  <li
                    key={m.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-semibold text-[#0A192F]">
                          {m.status}
                        </span>
                        <h3 className="font-display text-sm font-bold text-[#0A192F]">{m.title}</h3>
                      </div>
                      {m.subtitle && <p className="mt-0.5 text-xs text-slate-600">{m.subtitle}</p>}
                      {m.notes && <p className="mt-1 text-xs text-slate-500">{m.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {m.targetAmountBdt > 0 && (
                        <span className="font-mono text-xs text-[#0A192F] tabular-nums">
                          {formatBdtAmount(m.raisedAmountBdt)} / {formatBdtAmount(m.targetAmountBdt)}
                        </span>
                      )}
                      {isAdmin && (
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoadmapId(m.id);
                              setRoadmapForm({
                                itemType: m.itemType,
                                title: m.title,
                                subtitle: m.subtitle,
                                personName: m.personName,
                                personBatch: m.personBatch,
                                personCadetNo: m.personCadetNo,
                                status: m.status,
                                targetAmountBdt: String(m.targetAmountBdt),
                                raisedAmountBdt: String(m.raisedAmountBdt),
                                displayOrder: String(m.displayOrder),
                                notes: m.notes,
                              });
                              setRoadmapModal(true);
                            }}
                            className="text-slate-600 hover:text-[#0A192F]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRoadmapItem(m.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: CoC Exam & Cadet Mentorship Hub */}
      {hubTab === 'mentorship' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by CoC exam track"
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value as 'All' | MentorshipExamTrack)}
                className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
              >
                <option value="All">All CoC / Exam Tracks</option>
                {MENTORSHIP_TRACKS.map((tr) => (
                  <option key={tr} value={tr}>
                    {tr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                data-testid="open-morse-practice-btn"
                onClick={() => setMorseModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] rounded-lg whitespace-nowrap shadow-xs transition-colors cursor-pointer"
              >
                <Radio className="w-4 h-4 text-[#0A192F]" aria-hidden="true" />
                Morse Practice
              </button>

              {canMemberPost && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMentorId(null);
                    setMentorForm(EMPTY_MENTORSHIP);
                    setMentorErrors({});
                    setMentorModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
                  Share CoC / Cadet Guide
                </button>
              )}
            </div>
          </div>

          {filteredMentorship.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-12 text-center">
              <GraduationCap className="w-7 h-7 text-slate-400 mx-auto mb-3" aria-hidden="true" />
              <p className="font-display text-base font-semibold text-[#0A192F]">
                No CoC mentorship notes shared yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {canMemberPost
                  ? 'Verified BMASA officers can share oral exam tips, syllabus guidance, and cadetship prep.'
                  : 'Once your BMASA profile is verified, you can publish CoC exam guides here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMentorship.map((p, idx) => {
                const canModify = isAdmin || p.authorUid === currentUserProfile?.uid;
                return (
                  <motion.article
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.26, delay: Math.min(idx * 0.04, 0.16) }}
                    className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#0A192F]/5 font-mono text-[11px] font-semibold text-[#0A192F]">
                          {p.examTrack}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {formatMaritimeDate(p.createdAt.slice(0, 10))}
                        </span>
                      </div>
                      <h2 className="mt-2.5 font-display text-base font-bold text-[#0A192F]">
                        {p.title}
                      </h2>
                      <p className="mt-2 text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                        {p.adviceBody}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        {p.authorVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#9E7B39]" aria-hidden="true" />
                        )}
                        {p.authorName} · {p.authorRank} ({p.authorBatch})
                      </span>

                      <div className="flex items-center gap-3">
                        {p.resourceUrl && (
                          <a
                            href={p.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#0A192F] hover:text-[#806127]"
                          >
                            Study Link
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                        {canModify && (
                          <button
                            type="button"
                            onClick={async () => {
                              await removeMentorship(p.id);
                              showToast('success', 'Guide removed', p.title);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: Shipping & Manning Companies Directory */}
      {hubTab === 'crewing' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600">
                Verified DOS-licensed manning agencies curated by BMASA. Click any agency name to reveal its Apply option, or apply to all at once.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              {currentUserProfile && agenciesWithEmail.length > 0 && (
                <button
                  type="button"
                  data-testid="crewing-apply-all-btn"
                  onClick={() => openManningApplicationModal(agenciesWithEmail)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] rounded-lg whitespace-nowrap cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 text-[#0A192F]" aria-hidden="true" />
                  Apply to All Manning Agencies ({agenciesWithEmail.length})
                </button>
              )}

              {canMemberPost && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCrewingId(null);
                    setCrewingForm(EMPTY_CREWING);
                    setCrewingErrors({});
                    setCrewingModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
                  Add Manning Agency
                </button>
              )}
            </div>
          </div>

          {crewingCompanies.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-12 text-center">
              <Ship className="w-7 h-7 text-slate-400 mx-auto mb-3" aria-hidden="true" />
              <p className="font-display text-base font-semibold text-[#0A192F]">
                No shipping or manning companies listed yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Verified BMASA members and admins can add trusted DOS-licensed crewing offices.
              </p>
            </div>
          ) : (
            <div data-testid="crewing-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crewingCompanies.map((c, idx) => {
                const canModify = isAdmin || c.authorUid === currentUserProfile?.uid;
                const isExpanded = expandedApplyCompanyId === c.id;
                const hasEmail = extractEmailsFromContact(c.contactEmail).length > 0;
                return (
                  <motion.article
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.26, delay: Math.min(idx * 0.04, 0.16) }}
                    className={`bg-white border rounded-xl p-5 flex flex-col justify-between shadow-xs transition-colors ${
                      isExpanded ? 'border-[#C5A059] ring-1 ring-[#C5A059]/30' : 'border-[#E2E8F0]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-[10px] font-semibold text-emerald-700">
                          {c.cadetIntakeStatus}
                        </span>
                        {c.dosLicense && (
                          <span className="font-mono text-[11px] text-slate-500">
                            DOS: {c.dosLicense}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        data-testid={`crewing-agency-name-${c.id}`}
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedApplyCompanyId((prev) => (prev === c.id ? null : c.id))
                        }
                        className="mt-2 text-left font-display text-base font-bold text-[#0A192F] hover:text-[#806127] underline decoration-[#C5A059]/40 underline-offset-4 transition-colors cursor-pointer block"
                      >
                        {c.companyName}
                      </button>

                      <p className="mt-1 text-xs font-medium text-[#806127]">{c.fleetType}</p>
                      {c.alumniNotes && (
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed">{c.alumniNotes}</p>
                      )}

                      {isExpanded && currentUserProfile && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">
                            {hasEmail ? 'Ready to apply with Auto-CV' : 'No email listed'}
                          </span>
                          <button
                            type="button"
                            data-testid={`crewing-apply-btn-${c.id}`}
                            disabled={!hasEmail}
                            onClick={() => openManningApplicationModal([c])}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-45 cursor-pointer transition-colors"
                          >
                            <Send className="w-3 h-3 text-[#D8B979]" aria-hidden="true" />
                            Apply
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2 text-xs">
                      {c.contactEmail ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[#0A192F] truncate">
                          <Mail className="w-3.5 h-3.5 text-[#806127] shrink-0" aria-hidden="true" />
                          {c.contactEmail}
                        </span>
                      ) : (
                        <span className="text-slate-400">Added by {c.authorName}</span>
                      )}

                      {canModify && (
                        <button
                          type="button"
                          onClick={async () => {
                            await removeCrewing(c.id);
                            showToast('success', 'Company removed', c.companyName);
                          }}
                          className="text-red-600 hover:text-red-800 shrink-0"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Modal: Full Circular Content Reader */}
      {selectedNotice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notice-detail-title"
          data-testid="notice-detail-modal"
          onClick={() => setSelectedNoticeId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/60"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl max-h-[92vh] flex flex-col"
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedNotice.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#C5A059]/15 text-[#806127] font-mono text-[10px] font-semibold">
                      <Pin className="w-3 h-3" aria-hidden="true" />
                      PINNED
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${getNoticeTypeBadgeClass(
                      selectedNotice.noticeType || 'General'
                    )}`}
                  >
                    {selectedNotice.noticeType || 'General'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-medium text-[#0A192F]">
                    {selectedNotice.category}
                  </span>
                </div>
                <h2
                  id="notice-detail-title"
                  className="font-display text-xl font-bold text-[#0A192F] leading-snug"
                >
                  {selectedNotice.title}
                </h2>
                <p className="font-mono text-xs text-slate-500">
                  Published {formatMaritimeDate(selectedNotice.createdAt.slice(0, 10))} · By{' '}
                  {selectedNotice.authorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoticeId(null)}
                aria-label="Close circular"
                className="p-1.5 text-slate-500 hover:text-[#0A192F] rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {selectedNotice.body}
              </p>

              {selectedNotice.attachmentUrl && (
                <div className="pt-2">
                  <a
                    href={selectedNotice.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0A192F] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    View Circular Attachment
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2">
              {isAdmin ? (
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoticeId(selectedNotice.id);
                      setNoticeForm({
                        title: selectedNotice.title,
                        noticeType: selectedNotice.noticeType || 'General',
                        category: selectedNotice.category,
                        body: selectedNotice.body,
                        attachmentUrl: selectedNotice.attachmentUrl,
                        isPinned: selectedNotice.isPinned,
                      });
                      setNoticeErrors({});
                      setSelectedNoticeId(null);
                      setNoticeModal(true);
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-[#0A192F] hover:text-[#806127] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Edit Circular
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const title = selectedNotice.title;
                      const id = selectedNotice.id;
                      setSelectedNoticeId(null);
                      await removeNotice(id);
                      showToast('success', 'Circular deleted', title);
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={() => setSelectedNoticeId(null)}
                className="px-4 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notice / Circular */}
      {noticeModal && isAdmin && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/60">
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0A192F]">
                {editingNoticeId ? 'Edit Official Circular' : 'Publish BMASA Circular'}
              </h2>
              <button type="button" onClick={() => setNoticeModal(false)} aria-label="Close modal" className="p-1 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitNotice} noValidate className="p-6 space-y-4">
              <div>
                <label htmlFor="notice-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Circular Headline *
                </label>
                <input
                  id="notice-title-input"
                  type="text"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
                {noticeErrors.title && <p className="mt-1 text-xs text-red-600">{noticeErrors.title}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="notice-type-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Notice Type *
                  </label>
                  <select
                    id="notice-type-select"
                    data-testid="notice-type-select"
                    value={noticeForm.noticeType}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, noticeType: e.target.value as NoticeType }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  >
                    {NOTICE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {noticeErrors.noticeType && (
                    <p className="mt-1 text-xs text-red-600">{noticeErrors.noticeType}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="notice-category-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    id="notice-category-select"
                    value={noticeForm.category}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, category: e.target.value as NoticeCategory }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  >
                    {NOTICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={noticeForm.isPinned}
                  onChange={(e) => setNoticeForm((p) => ({ ...p, isPinned: e.target.checked }))}
                />
                Pin Circular to Top
              </label>
              <div>
                <label htmlFor="notice-body-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Announcement Body *
                </label>
                <textarea
                  id="notice-body-input"
                  rows={4}
                  value={noticeForm.body}
                  onChange={(e) => setNoticeForm((p) => ({ ...p, body: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
                {noticeErrors.body && <p className="mt-1 text-xs text-red-600">{noticeErrors.body}</p>}
              </div>
              <div>
                <label htmlFor="notice-attachment-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Attachment / PDF URL (Optional)
                </label>
                <input
                  id="notice-attachment-input"
                  type="url"
                  value={noticeForm.attachmentUrl}
                  onChange={(e) => setNoticeForm((p) => ({ ...p, attachmentUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
                {noticeErrors.attachmentUrl && <p className="mt-1 text-xs text-red-600">{noticeErrors.attachmentUrl}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNoticeModal(false)} className="px-4 py-2 text-xs font-semibold border border-[#CBD5E1] rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg cursor-pointer">
                  {editingNoticeId ? 'Save Changes' : 'Publish Circular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CoC Mentorship */}
      {mentorModal && canMemberPost && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/60">
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0A192F]">Share CoC / Cadet Mentorship Guide</h2>
              <button type="button" onClick={() => setMentorModal(false)} aria-label="Close modal" className="p-1 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitMentor} noValidate className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam / Mentorship Track *</label>
                <select
                  value={mentorForm.examTrack}
                  onChange={(e) => setMentorForm((p) => ({ ...p, examTrack: e.target.value as MentorshipExamTrack }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                >
                  {MENTORSHIP_TRACKS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Guide Title *</label>
                <input
                  type="text"
                  value={mentorForm.title}
                  onChange={(e) => setMentorForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., DOS Class 3 Orals — ColRegs & Stability Prep"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
                {mentorErrors.title && <p className="mt-1 text-xs text-red-600">{mentorErrors.title}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Practical Guidance &amp; Notes *</label>
                <textarea
                  rows={4}
                  value={mentorForm.adviceBody}
                  onChange={(e) => setMentorForm((p) => ({ ...p, adviceBody: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
                {mentorErrors.adviceBody && <p className="mt-1 text-xs text-red-600">{mentorErrors.adviceBody}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Study Resource URL (Optional)</label>
                <input
                  type="url"
                  value={mentorForm.resourceUrl}
                  onChange={(e) => setMentorForm((p) => ({ ...p, resourceUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
                {mentorErrors.resourceUrl && <p className="mt-1 text-xs text-red-600">{mentorErrors.resourceUrl}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMentorModal(false)} className="px-4 py-2 text-xs font-semibold border border-[#CBD5E1] rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] rounded-lg">Publish Guide</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crewing Company */}
      {crewingModal && canMemberPost && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/60">
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0A192F]">Add Verified Manning Company</h2>
              <button type="button" onClick={() => setCrewingModal(false)} aria-label="Close modal" className="p-1 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitCrewing} noValidate className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={crewingForm.companyName}
                  onChange={(e) => setCrewingForm((p) => ({ ...p, companyName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
                {crewingErrors.companyName && <p className="mt-1 text-xs text-red-600">{crewingErrors.companyName}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">DOS Manning License</label>
                  <input
                    type="text"
                    value={crewingForm.dosLicense}
                    onChange={(e) => setCrewingForm((p) => ({ ...p, dosLicense: e.target.value }))}
                    placeholder="e.g., MLA-024"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cadet Intake Status *</label>
                  <select
                    value={crewingForm.cadetIntakeStatus}
                    onChange={(e) => setCrewingForm((p) => ({ ...p, cadetIntakeStatus: e.target.value as CrewingIntakeStatus }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  >
                    {CREWING_INTAKE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fleet Types *</label>
                <input
                  type="text"
                  value={crewingForm.fleetType}
                  onChange={(e) => setCrewingForm((p) => ({ ...p, fleetType: e.target.value }))}
                  placeholder="e.g., Panamax Bulk Carriers & Oil Tankers"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
                {crewingErrors.fleetType && <p className="mt-1 text-xs text-red-600">{crewingErrors.fleetType}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Crewing Email</label>
                <input
                  type="email"
                  value={crewingForm.contactEmail}
                  onChange={(e) => setCrewingForm((p) => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="crewing@agency.com"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
                {crewingErrors.contactEmail && <p className="mt-1 text-xs text-red-600">{crewingErrors.contactEmail}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alumni Tips &amp; Office Location</label>
                <textarea
                  rows={2}
                  value={crewingForm.alumniNotes}
                  onChange={(e) => setCrewingForm((p) => ({ ...p, alumniNotes: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCrewingModal(false)} className="px-4 py-2 text-xs font-semibold border border-[#CBD5E1] rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] rounded-lg">Save Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Committee / Dhaka Roadmap */}
      {roadmapModal && isAdmin && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/60">
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0A192F]">
                {roadmapForm.itemType === 'committee' ? 'Executive Committee Entry' : 'Dhaka Office Milestone'}
              </h2>
              <button type="button" onClick={() => setRoadmapModal(false)} aria-label="Close modal" className="p-1 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitRoadmap} noValidate className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Entry Type</label>
                  <select
                    value={roadmapForm.itemType}
                    onChange={(e) => setRoadmapForm((p) => ({ ...p, itemType: e.target.value as RoadmapItemType }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  >
                    <option value="committee">Executive Committee Member</option>
                    <option value="milestone">Dhaka Office Milestone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={roadmapForm.status}
                    onChange={(e) => setRoadmapForm((p) => ({ ...p, status: e.target.value as RoadmapItemStatus }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  >
                    {ROADMAP_ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="roadmap-role-or-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {roadmapForm.itemType === 'committee' ? 'Committee Role Title *' : 'Milestone Title *'}
                </label>
                {roadmapForm.itemType === 'committee' ? (
                  <RankSelectField
                    id="roadmap-role-or-title"
                    value={roadmapForm.title}
                    onChange={(val) => setRoadmapForm((p) => ({ ...p, title: val }))}
                    flatOptions={[
                      {
                        label: 'BMASA Executive Committee Roles',
                        options: BMASA_COMMITTEE_ROLES,
                      },
                    ]}
                    placeholderOption="Select Committee Role *"
                    customPlaceholder="Enter custom committee role title"
                  />
                ) : (
                  <input
                    id="roadmap-role-or-title"
                    type="text"
                    value={roadmapForm.title}
                    onChange={(e) => setRoadmapForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Phase 1: Office Space Lease Deposit"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  />
                )}
                {roadmapErrors.title && <p className="mt-1 text-xs text-red-600">{roadmapErrors.title}</p>}
              </div>

              {roadmapForm.itemType === 'committee' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Officer Name *</label>
                    <input
                      type="text"
                      value={roadmapForm.personName}
                      onChange={(e) => setRoadmapForm((p) => ({ ...p, personName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                    {roadmapErrors.personName && <p className="mt-1 text-xs text-red-600">{roadmapErrors.personName}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Batch</label>
                    <input
                      type="text"
                      value={roadmapForm.personBatch}
                      onChange={(e) => setRoadmapForm((p) => ({ ...p, personBatch: cleanBatchLabel(e.target.value) }))}
                      placeholder="e.g., 2nd Batch"
                      className="w-full px-3.5 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cadet No.</label>
                    <input
                      type="text"
                      value={roadmapForm.personCadetNo}
                      onChange={(e) => setRoadmapForm((p) => ({ ...p, personCadetNo: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Amount (BDT)</label>
                    <input
                      type="number"
                      min="0"
                      value={roadmapForm.targetAmountBdt}
                      onChange={(e) => setRoadmapForm((p) => ({ ...p, targetAmountBdt: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Raised Amount (BDT)</label>
                    <input
                      type="number"
                      min="0"
                      value={roadmapForm.raisedAmountBdt}
                      onChange={(e) => setRoadmapForm((p) => ({ ...p, raisedAmountBdt: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={roadmapForm.notes}
                  onChange={(e) => setRoadmapForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRoadmapModal(false)} className="px-4 py-2 text-xs font-semibold border border-[#CBD5E1] rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] rounded-lg">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Single or Bulk Manning Agency Application with Rank, Salary, CV Preview & Bulk Confirmation */}
      {manningApplyTargets.length > 0 && manningPayload && currentUserProfile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manning-apply-modal-title"
          data-testid="manning-apply-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/65 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeManningApplyModal();
          }}
        >
          <div className="w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
                  {manningApplyTargets.length > 1
                    ? `BULK MANNING APPLICATION (${manningApplyTargets.length} AGENCIES)`
                    : 'MANNING AGENCY APPLICATION'}
                </p>
                <h2
                  id="manning-apply-modal-title"
                  className="mt-0.5 font-display text-base sm:text-lg font-bold text-[#0A192F] truncate"
                >
                  {manningApplyTargets.length > 1
                    ? `Apply to All ${manningApplyTargets.length} Manning Agencies`
                    : `Apply to ${manningApplyTargets[0].companyName}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeManningApplyModal}
                aria-label="Close manning application modal"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-200/70 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {!manningBulkConfirm ? (
                <>
                  {/* Step 1 & 2: Rank & Expected Salary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="manning-apply-rank"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        1. Rank / Position Applying For *
                      </label>
                      <RankSelectField
                        id="manning-apply-rank"
                        value={manningApplyRank}
                        onChange={(val) => setManningApplyRank(val)}
                        placeholderOption="Select Rank / Position..."
                        customPlaceholder="Specify custom rank or position"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="manning-apply-salary"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        2. Estimated / Expected Salary *
                      </label>
                      <input
                        id="manning-apply-salary"
                        data-testid="manning-apply-salary"
                        type="text"
                        value={manningApplySalary}
                        onChange={(e) => setManningApplySalary(e.target.value)}
                        placeholder="e.g., USD 3,200 / month"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                      />
                    </div>
                  </div>

                  {/* Target Email(s) Summary */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      RECIPIENT AGENCY EMAIL(S)
                    </p>
                    <p className="font-mono font-semibold text-[#0A192F] break-all">
                      {manningPayload.emails.join(', ')}
                    </p>
                  </div>

                  {/* Step 3: Attached PDF CV & Cover Email Preview */}
                  <div className="p-4 rounded-xl bg-[#FBF8F1] border border-[#C5A059] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#0A192F] text-[#D8B979] flex items-center justify-center shrink-0">
                        <Paperclip className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] tracking-wider text-[#806127] uppercase font-semibold">
                          PDF CV ATTACHMENT READY
                        </p>
                        <p className="font-mono text-xs font-bold text-[#0A192F] truncate">
                          {manningPdf?.filename || defaultManningPdfName}
                        </p>
                        <p className="text-[11px] text-slate-600 font-mono tabular-nums">
                          {manningPdfLoading
                            ? 'Rendering A4 PDF document...'
                            : manningPdf
                            ? `${manningPdf.pageCount} page${manningPdf.pageCount === 1 ? '' : 's'} · ${manningPdf.sizeKb} KB · PDF Document`
                            : 'PDF Document ready'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setManningCvModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        Inspect PDF
                      </button>
                      {manningPdf && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerBlobDownload(manningPdf.blob, manningPdf.filename);
                            showToast('success', 'PDF CV downloaded', manningPdf.filename);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg"
                        >
                          <Download className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                          Download PDF
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="font-display text-xs font-bold text-[#0A192F] uppercase tracking-wider">
                        3. Cover Email Body (CV Attached as PDF — Not Text)
                      </p>
                    </div>
                    <pre
                      data-testid="manning-apply-cv-preview"
                      className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] font-mono text-xs text-[#0A192F] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto"
                    >
                      {manningPayload.plainTextBody}
                    </pre>
                  </div>
                </>
              ) : (
                /* Step 4: Bulk Confirmation Summary */
                <div
                  data-testid="manning-bulk-summary"
                  className="p-5 rounded-2xl bg-[#FBF8F1] border-2 border-[#C5A059] space-y-4"
                >
                  <div>
                    <p className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#806127] uppercase">
                      BULK APPLICATION CONFIRMATION SUMMARY
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold text-[#0A192F]">
                      Ready to send to {manningApplyTargets.length} Manning Agencies
                    </h3>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white border border-[#E2E8F0] text-xs">
                    <div>
                      <dt className="font-mono text-[10px] text-slate-500">TOTAL AGENCIES</dt>
                      <dd className="mt-0.5 font-mono text-base font-extrabold text-[#0A192F]">
                        {manningApplyTargets.length}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] text-slate-500">SELECTED RANK</dt>
                      <dd className="mt-0.5 font-display text-sm font-bold text-[#0A192F]">
                        {manningApplyRank || currentUserProfile.currentRank}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] text-slate-500">EXPECTED SALARY</dt>
                      <dd className="mt-0.5 font-mono text-sm font-bold text-[#806127]">
                        {manningApplySalary.trim() || 'Negotiable'}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                      RECIPIENTS (BCC)
                    </p>
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto text-xs bg-white rounded-xl border border-[#E2E8F0] p-3">
                      {manningApplyTargets.map((agency) => (
                        <li key={agency.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 min-w-0">
                          <span className="font-semibold text-[#0A192F] truncate">{agency.companyName}</span>
                          <span className="font-mono text-slate-500 break-all sm:truncate">{agency.contactEmail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shrink-0">
              {manningBulkConfirm ? (
                <button
                  type="button"
                  onClick={() => setManningBulkConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                >
                  ← Back to Edit / PDF Attachment
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeManningApplyModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                >
                  Cancel
                </button>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `To/BCC: ${manningPayload.emails.join(', ')}\nSubject: ${manningPayload.subject}\n\n${manningPayload.plainTextBody}`
                      );
                    } catch {
                      const ta = document.createElement('textarea');
                      ta.value = manningPayload.plainTextBody;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                    }
                    setManningCopied(true);
                    showToast('success', 'Cover letter & emails copied', 'Attach your downloaded PDF CV before sending.');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                >
                  {manningCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      Copied Application
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy Application &amp; Emails
                    </>
                  )}
                </button>

                {manningApplyTargets.length > 1 && !manningBulkConfirm ? (
                  <button
                    type="button"
                    data-testid="manning-review-bulk-btn"
                    onClick={() => setManningBulkConfirm(true)}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                    Review Bulk Summary ({manningApplyTargets.length} Agencies)
                  </button>
                ) : (
                  manningPayload.mailtoHref && (
                    <div className="flex flex-wrap items-center gap-2">
                      {manningPdf && (
                        <button
                          type="button"
                          onClick={() => {
                            const emlBlob = buildEmlWithPdfAttachment({
                              to: manningApplyTargets.length === 1 ? manningPayload.emails : [],
                              bcc: manningApplyTargets.length > 1 ? manningPayload.emails : undefined,
                              fromEmail: currentUserVault?.email || currentUserProfile.contactEmail || undefined,
                              subject: manningPayload.subject,
                              bodyText: manningPayload.plainTextBody,
                              pdfBytes: manningPdf.bytes,
                              pdfFilename: manningPdf.filename,
                            });
                            triggerBlobDownload(emlBlob, 'BMASA-Manning-Application.eml');
                            showToast(
                              'success',
                              'Email draft (.eml) downloaded with PDF attached',
                              'Open in Mail/Outlook to send with CV attached.'
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-[#FBF8F1] border border-[#C5A059] hover:bg-[#F3E5AB]/50 rounded-lg"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                          Download .EML (PDF Attached)
                        </button>
                      )}
                      <a
                        href={manningPayload.mailtoHref}
                        data-testid="manning-confirm-send-link"
                        onClick={() => {
                          if (manningPdf) {
                            triggerBlobDownload(manningPdf.blob, manningPdf.filename);
                          }
                          showToast(
                            'success',
                            manningApplyTargets.length > 1
                              ? `PDF CV downloaded & bulk draft prepared for ${manningApplyTargets.length} agencies`
                              : `PDF CV downloaded & draft prepared for ${manningApplyTargets[0].companyName}`,
                            `Attach ${manningPdf?.filename || defaultManningPdfName} in your email app.`
                          );
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                        {manningApplyTargets.length > 1
                          ? `Send & Attach PDF to ${manningApplyTargets.length} Agencies`
                          : 'Send & Attach PDF CV'}
                      </a>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentUserProfile && (
        <CvPreviewModal
          open={manningCvModalOpen}
          onClose={() => setManningCvModalOpen(false)}
          profile={currentUserProfile}
          vault={currentUserVault}
          voyages={currentUserVoyages}
          copCertificates={currentUserCopCertificates}
          targetJob={
            manningApplyTargets.length > 0
              ? {
                  rankNeeded: manningApplyRank || currentUserProfile.currentRank,
                  companyName:
                    manningApplyTargets.length === 1
                      ? manningApplyTargets[0].companyName
                      : `${manningApplyTargets.length} BMASA Manning Agencies`,
                }
              : undefined
          }
        />
      )}

      <MorsePracticeModal open={morseModalOpen} onClose={closeMorseModal} />
    </main>
  );
}
