import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Mail,
  Paperclip,
  Plus,
  Search,
  Send,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { useToast } from '../context/ToastContext';
import {
  JOB_VESSEL_TYPES,
  type JobPosting,
  type JobVesselType,
} from '../types/portal';
import { RankSelectField } from './RankSelectField';
import { CvPreviewModal } from './CvPreviewModal';
import {
  buildEmlWithPdfAttachment,
  buildSeafarerCvData,
  generateSeafarerCvPdf,
  triggerBlobDownload,
  type GeneratedCvPdf,
} from '../utils/cvBuilder';
import {
  buildJobApplicationPayload,
  buildShareableProfileUrl,
  cleanBatchLabel,
  formatMaritimeDate,
} from '../utils/portalLogic';
import { validateJobInput, type JobFormInput } from '../utils/validation';
import { useHistoryOverlay } from '../hooks/useHistoryOverlay';

const EMPTY_JOB: JobFormInput = {
  companyName: '',
  rankNeeded: '',
  vesselType: 'Bulk Carrier',
  contactInfo: '',
  notes: '',
};

export function JobBoardView() {
  const {
    jobPostings,
    currentUserProfile,
    currentUserVault,
    currentUserVoyages,
    currentUserCopCertificates,
    isAdmin,
    postJob,
    updateJob,
    closeJob,
    removeJob,
  } = usePortal();
  const { showToast, updateToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [vesselFilter, setVesselFilter] = useState<'All' | JobVesselType>('All');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [cvJobTarget, setCvJobTarget] = useState<JobPosting | null>(null);
  const [applyJobTarget, setApplyJobTarget] = useState<JobPosting | null>(null);
  const [copiedApplyId, setCopiedApplyId] = useState<string | null>(null);
  const [generatedApplyPdf, setGeneratedApplyPdf] = useState<GeneratedCvPdf | null>(null);
  const [generatingApplyPdf, setGeneratingApplyPdf] = useState(false);

  const handleCloseJobModal = useCallback(() => {
    setComposerOpen(false);
  }, []);

  const handleCloseApplyModal = useCallback(() => {
    setApplyJobTarget(null);
  }, []);

  useHistoryOverlay(composerOpen && isAdmin, 'bmasaJobModal', handleCloseJobModal);
  useHistoryOverlay(Boolean(applyJobTarget), 'bmasaJobApplyPreviewModal', handleCloseApplyModal);

  useEffect(() => {
    if (!applyJobTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseApplyModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyJobTarget, handleCloseApplyModal]);

  const [form, setForm] = useState<JobFormInput>(EMPTY_JOB);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return jobPostings.filter((job) => {
      if (job.status !== 'open') return false;
      if (vesselFilter !== 'All' && job.vesselType !== vesselFilter) return false;
      if (!q) return true;
      return [
        job.companyName,
        job.rankNeeded,
        job.vesselType,
        job.posterName,
        job.notes,
        job.contactInfo,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [jobPostings, searchQuery, vesselFilter]);

  const profileShareUrl = useMemo(() => {
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

  const defaultCvPdfFilename = useMemo(() => {
    if (!currentUserProfile) return 'BMASA-CV.pdf';
    const safeName = (currentUserProfile.cadetNumber || currentUserProfile.fullName || 'Seafarer').replace(
      /[^A-Za-z0-9_-]/g,
      '_'
    );
    return `BMASA-CV-${safeName}.pdf`;
  }, [currentUserProfile]);

  useEffect(() => {
    if (!applyJobTarget || !currentUserProfile) {
      setGeneratedApplyPdf(null);
      setGeneratingApplyPdf(false);
      return;
    }

    let cancelled = false;
    setGeneratingApplyPdf(true);
    const cvData = buildSeafarerCvData({
      profile: currentUserProfile,
      vault: currentUserVault,
      voyages: currentUserVoyages,
      copCertificates: currentUserCopCertificates,
      shareUrl: profileShareUrl,
    });

    generateSeafarerCvPdf(cvData, {
      includeNok: false,
      targetJob: {
        rankNeeded: applyJobTarget.rankNeeded,
        companyName: applyJobTarget.companyName,
      },
    })
      .then((res) => {
        if (!cancelled) {
          setGeneratedApplyPdf(res);
          setGeneratingApplyPdf(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeneratedApplyPdf(null);
          setGeneratingApplyPdf(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    applyJobTarget,
    currentUserProfile,
    currentUserVault,
    currentUserVoyages,
    currentUserCopCertificates,
    profileShareUrl,
  ]);

  const buildJobPayload = useCallback(
    (job: JobPosting) => {
      if (!currentUserProfile) return null;
      return buildJobApplicationPayload({
        job,
        member: currentUserProfile,
        profileUrl: profileShareUrl,
        applicantEmail: currentUserVault?.email || currentUserProfile.contactEmail,
        cvPdfFilename: generatedApplyPdf?.filename || defaultCvPdfFilename,
        vault: currentUserVault,
      });
    },
    [currentUserProfile, currentUserVault, profileShareUrl, generatedApplyPdf, defaultCvPdfFilename]
  );

  const applyPayload = useMemo(
    () => (applyJobTarget ? buildJobPayload(applyJobTarget) : null),
    [applyJobTarget, buildJobPayload]
  );

  const canNativeSharePdf = useMemo(() => {
    if (!generatedApplyPdf || typeof navigator === 'undefined') return false;
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    try {
      const testFile = new File([generatedApplyPdf.blob], generatedApplyPdf.filename, {
        type: 'application/pdf',
      });
      return navigator.canShare({ files: [testFile] });
    } catch {
      return false;
    }
  }, [generatedApplyPdf]);

  const handleOpenNewModal = () => {
    setEditingJobId(null);
    setForm(EMPTY_JOB);
    setFormError(null);
    setErrors({});
    setComposerOpen(true);
  };

  const handleOpenEditModal = (job: JobPosting) => {
    setEditingJobId(job.id);
    setForm({
      companyName: job.companyName,
      rankNeeded: job.rankNeeded,
      vesselType: job.vesselType,
      contactInfo: job.contactInfo,
      notes: job.notes,
    });
    setFormError(null);
    setErrors({});
    setComposerOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const result = validateJobInput(form);
    setErrors(result.errors);
    if (!result.valid) {
      setFormError('Please resolve the highlighted fields before publishing.');
      return;
    }

    setSubmitting(true);
    const toastId = showToast('loading', editingJobId ? 'Updating job notice...' : 'Publishing vacancy...');
    try {
      if (editingJobId) {
        await updateJob(editingJobId, form);
      } else {
        await postJob(form);
      }
      setForm(EMPTY_JOB);
      setEditingJobId(null);
      setErrors({});
      setComposerOpen(false);
      updateToast(
        toastId,
        'success',
        editingJobId ? 'Job posting updated' : 'Vacancy published',
        `${form.rankNeeded} at ${form.companyName} is now live on the BMASA Job Board.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save job notice right now.';
      setFormError(msg);
      updateToast(toastId, 'error', 'Failed to publish notice', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const copySummary = async (job: JobPosting) => {
    const payload = buildJobPayload(job);
    if (!payload) return;
    await copyText(payload.plainTextBody);
    setCopiedJobId(job.id);
    showToast('success', 'Cover letter copied', `Ready for ${job.companyName} — attach your PDF CV.`);
    window.setTimeout(() => {
      setCopiedJobId((curr) => (curr === job.id ? null : curr));
    }, 3200);
  };

  const handleCloseJob = async (job: JobPosting) => {
    const toastId = showToast('loading', 'Closing position...');
    try {
      await closeJob(job.id);
      updateToast(toastId, 'success', 'Position marked filled', `${job.rankNeeded} at ${job.companyName} archived.`);
    } catch (err) {
      updateToast(toastId, 'error', 'Action failed', err instanceof Error ? err.message : 'Unable to close.');
    }
  };

  const handleDeleteJob = async (job: JobPosting) => {
    const toastId = showToast('loading', 'Deleting notice...');
    try {
      await removeJob(job.id);
      updateToast(toastId, 'success', 'Notice deleted', `${job.rankNeeded} removed.`);
    } catch (err) {
      updateToast(toastId, 'error', 'Delete failed', err instanceof Error ? err.message : 'Unable to remove.');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="font-mono text-xs tracking-[0.12em] text-[#806127]">
            BMASA CADET PLACEMENT &amp; OFFICER CAREERS
          </p>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#0A192F]">
            Cadet Job Placement &amp; Officer Board
          </h1>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
            Post Vacancy / Notice
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Filter job notices"
        className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="jobs-search" className="sr-only">
            Search vacancies by company, rank, or vessel type
          </label>
          <input
            id="jobs-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Company, Rank Needed (Deck Cadet, 3rd Officer...), or Notes"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
          />
        </div>

        <div className="sm:w-56">
          <label htmlFor="jobs-vessel-filter" className="sr-only">
            Filter by vessel type
          </label>
          <select
            id="jobs-vessel-filter"
            value={vesselFilter}
            onChange={(e) => setVesselFilter(e.target.value as 'All' | JobVesselType)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
          >
            <option value="All">All Vessel Types</option>
            {JOB_VESSEL_TYPES.map((vt) => (
              <option key={vt} value={vt}>
                {vt}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Listings */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-12 text-center">
          <p className="font-display text-base font-semibold text-[#0A192F]">
            {jobPostings.length === 0
              ? 'No active vacancies posted by BMASA Administration'
              : 'No matching vacancies match your filters'}
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            {jobPostings.length === 0
              ? isAdmin
                ? 'Use "Post Vacancy / Notice" above to publish an official cadetship or officer opening.'
                : 'Verified cadetship and officer recruitment notices will appear here once published by BMASA administrators.'
              : 'Clear your search or vessel filter to view all published openings.'}
          </p>
          {(searchQuery || vesselFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setVesselFilter('All');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-[#0A192F] border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors"
            >
              Reset Board Filters
            </button>
          )}
        </div>
      ) : (
        <div data-testid="job-board-list" className="space-y-4">
          {filteredJobs.map((job, idx) => {
            const isCopied = copiedJobId === job.id;

            return (
              <motion.article
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.28, delay: Math.min(idx * 0.04, 0.16) }}
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6 transition-colors shadow-xs"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-[#806127]">{job.vesselType}</span>
                      <span className="mx-2 text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        Published by {job.posterName} ({job.posterRank}, {cleanBatchLabel(job.posterBatch)})
                      </span>
                      <span className="mx-2 text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-[11px] tabular-nums">
                        {formatMaritimeDate(job.createdAt.slice(0, 10))}
                      </span>
                    </p>

                    <h2 className="mt-2 font-display text-lg sm:text-xl font-bold text-[#0A192F]">
                      {job.rankNeeded}{' '}
                      <span className="font-normal text-slate-400">at</span> {job.companyName}
                    </h2>

                    {job.notes && (
                      <p className="mt-2.5 text-sm text-slate-600 leading-relaxed max-w-3xl">
                        {job.notes}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-slate-500">
                      Recruitment Contact:{' '}
                      <span className="font-mono text-[#0A192F] font-medium">
                        {job.contactInfo}
                      </span>
                    </p>
                  </div>

                  {/* Primary Application Actions */}
                  <div className="flex flex-wrap lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
                    {currentUserProfile && (
                      <button
                        type="button"
                        data-testid={`job-apply-btn-${job.id}`}
                        onClick={() => setApplyJobTarget(job)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                        Apply with PDF CV
                      </button>
                    )}

                    {currentUserProfile && (
                      <button
                        type="button"
                        data-testid="job-export-cv-btn"
                        onClick={() => setCvJobTarget(job)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-[#FBF8F1] border border-[#C5A059] hover:bg-[#F3E5AB]/50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                        Preview / Download PDF CV
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => copySummary(job)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                          Cover Note Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          Copy Cover Note
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-end gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(job)}
                      aria-label={`Edit ${job.rankNeeded} at ${job.companyName}`}
                      className="inline-flex items-center gap-1 font-medium text-[#0A192F] hover:text-[#806127] transition-colors whitespace-nowrap"
                    >
                      <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Edit Details
                    </button>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCloseJob(job)}
                      aria-label={`Mark ${job.rankNeeded} at ${job.companyName} filled`}
                      className="font-medium text-slate-600 hover:text-[#0A192F] transition-colors whitespace-nowrap"
                    >
                      Mark Position Filled
                    </button>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteJob(job)}
                      aria-label={`Delete ${job.rankNeeded} at ${job.companyName}`}
                      className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-800 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Job Application PDF Attachment & Cover Email Modal */}
      {applyJobTarget && applyPayload && currentUserProfile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-apply-preview-title"
          data-testid="job-apply-preview-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/65 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setApplyJobTarget(null);
          }}
        >
          <div className="w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-3 sm:gap-4 shrink-0">
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
                  PDF CV ATTACHMENT &amp; COVER EMAIL
                </p>
                <h2
                  id="job-apply-preview-title"
                  className="mt-0.5 font-display text-base sm:text-lg font-bold text-[#0A192F] truncate"
                >
                  Apply for {applyJobTarget.rankNeeded} at {applyJobTarget.companyName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setApplyJobTarget(null)}
                aria-label="Close application preview"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-200/70 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Recipient + Digital Alumni ID Link Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    RECIPIENT EMAIL(S)
                  </p>
                  <p className="mt-0.5 font-mono font-semibold text-[#0A192F] break-all">
                    {applyPayload.emails.length > 0
                      ? applyPayload.emails.join(', ')
                      : 'No email listed — download PDF & cover note below'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    INCLUDED DIGITAL ALUMNI ID URL
                  </p>
                  <p className="mt-0.5 font-mono font-semibold text-[#806127] break-all">
                    {profileShareUrl}
                  </p>
                </div>
              </div>

              {/* Real PDF CV Attachment Card */}
              <div
                data-testid="job-apply-pdf-attachment-card"
                className="p-4 rounded-xl bg-[#FBF8F1] border border-[#C5A059] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#0A192F] text-[#D8B979] flex items-center justify-center shrink-0">
                    <Paperclip className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] tracking-wider text-[#806127] uppercase font-semibold">
                      PDF CV ATTACHMENT READY
                    </p>
                    <p className="font-mono text-xs font-bold text-[#0A192F] truncate">
                      {generatedApplyPdf?.filename || defaultCvPdfFilename}
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono tabular-nums">
                      {generatingApplyPdf
                        ? 'Rendering A4 PDF document...'
                        : generatedApplyPdf
                        ? `${generatedApplyPdf.pageCount} page${generatedApplyPdf.pageCount === 1 ? '' : 's'} · ${generatedApplyPdf.sizeKb} KB · PDF Document`
                        : 'PDF Document ready'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const target = applyJobTarget;
                      setApplyJobTarget(null);
                      setCvJobTarget(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    Inspect PDF
                  </button>
                  {generatedApplyPdf && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerBlobDownload(generatedApplyPdf.blob, generatedApplyPdf.filename);
                        showToast('success', 'PDF CV downloaded', generatedApplyPdf.filename);
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
                    Cover Email Body (CV Attached as PDF — Not Text)
                  </p>
                </div>
                <pre
                  data-testid="job-apply-message-preview"
                  className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] font-mono text-xs text-[#0A192F] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto"
                >
                  {applyPayload.plainTextBody}
                </pre>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setApplyJobTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
              >
                Cancel
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await copyText(applyPayload.plainTextBody);
                    setCopiedApplyId(applyJobTarget.id);
                    showToast('success', 'Cover letter copied', 'Remember to attach your downloaded PDF CV.');
                    window.setTimeout(() => setCopiedApplyId(null), 2400);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                >
                  {copiedApplyId === applyJobTarget.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      Copied Cover Email
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy Cover Email
                    </>
                  )}
                </button>

                {generatedApplyPdf && applyPayload.emails.length > 0 && (
                  <button
                    type="button"
                    data-testid="job-download-eml-btn"
                    onClick={() => {
                      const emlBlob = buildEmlWithPdfAttachment({
                        to: applyPayload.emails,
                        fromEmail: currentUserVault?.email || currentUserProfile.contactEmail || undefined,
                        subject: applyPayload.subject,
                        bodyText: applyPayload.plainTextBody,
                        pdfBytes: generatedApplyPdf.bytes,
                        pdfFilename: generatedApplyPdf.filename,
                      });
                      const emlName = `Application-${applyJobTarget.companyName.replace(/[^A-Za-z0-9_-]/g, '_')}.eml`;
                      triggerBlobDownload(emlBlob, emlName);
                      showToast(
                        'success',
                        'Email draft (.eml) downloaded with PDF attached',
                        `Open ${emlName} in Mail/Outlook to send immediately.`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-[#FBF8F1] border border-[#C5A059] hover:bg-[#F3E5AB]/50 rounded-lg"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                    Download .EML (PDF Attached)
                  </button>
                )}

                {canNativeSharePdf && generatedApplyPdf && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const pdfFile = new File([generatedApplyPdf.blob], generatedApplyPdf.filename, {
                          type: 'application/pdf',
                        });
                        await navigator.share({
                          files: [pdfFile],
                          title: applyPayload.subject,
                          text: applyPayload.plainTextBody,
                        });
                      } catch {
                        // User dismissed native share sheet
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#0A192F] rounded-lg"
                  >
                    <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Share PDF
                  </button>
                )}

                {applyPayload.mailtoHref ? (
                  <a
                    href={applyPayload.mailtoHref}
                    data-testid="job-confirm-mailto-link"
                    onClick={() => {
                      if (generatedApplyPdf) {
                        triggerBlobDownload(generatedApplyPdf.blob, generatedApplyPdf.filename);
                      }
                      showToast(
                        'success',
                        'PDF CV downloaded & email draft opened',
                        `Attach ${generatedApplyPdf?.filename || defaultCvPdfFilename} to the opened email draft.`
                      );
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                    Send &amp; Attach PDF CV
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Post / Edit Opportunity Modal */}
      {composerOpen && isAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-job-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setComposerOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl max-h-[92dvh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
                  BMASA ADMIN PLACEMENT NOTICE
                </p>
                <h2
                  id="post-job-modal-title"
                  className="mt-0.5 font-display text-lg font-bold text-[#0A192F]"
                >
                  {editingJobId
                    ? 'Edit Job Placement Notice'
                    : 'Post Cadetship or Officer Opening'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                aria-label="Close post vacancy modal"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} noValidate className="p-6 space-y-4">
              {formError && (
                <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {formError}
                </p>
              )}

              <div>
                <label htmlFor="job-company" className="block text-xs font-semibold text-slate-700 mb-1">
                  Shipping Company / Manning Agent *
                </label>
                <input
                  id="job-company"
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="e.g., Bangladesh Shipping Corporation (BSC)"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {errors.companyName && (
                  <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="job-rank" className="block text-xs font-semibold text-slate-700 mb-1">
                    Rank Needed *
                  </label>
                  <RankSelectField
                    id="job-rank"
                    value={form.rankNeeded}
                    onChange={(val) => setForm((p) => ({ ...p, rankNeeded: val }))}
                    placeholderOption="Select Rank Needed *"
                    customPlaceholder="Enter custom rank or position"
                  />
                  {errors.rankNeeded && (
                    <p className="mt-1 text-xs text-red-600">{errors.rankNeeded}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="job-vessel" className="block text-xs font-semibold text-slate-700 mb-1">
                    Vessel Type *
                  </label>
                  <select
                    id="job-vessel"
                    value={form.vesselType}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, vesselType: e.target.value as JobVesselType }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    {JOB_VESSEL_TYPES.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="job-contact" className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Recruitment Email(s) &amp; Desk Contact *
                </label>
                <input
                  id="job-contact"
                  type="text"
                  required
                  value={form.contactInfo}
                  onChange={(e) => setForm((p) => ({ ...p, contactInfo: e.target.value }))}
                  placeholder="crewing@company.com (Multiple emails separated by commas)"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Any email address included here powers the member&apos;s CV-attached application preview.
                </p>
                {errors.contactInfo && (
                  <p className="mt-1 text-xs text-red-600">{errors.contactInfo}</p>
                )}
              </div>

              <div>
                <label htmlFor="job-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Requirements, Joining Port &amp; Notes
                </label>
                <textarea
                  id="job-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Required CoC / STCW endorsements, tentative joining date, preferred BMASA batches..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F] resize-y"
                />
                {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-[#CBD5E1] hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg"
                >
                  {submitting
                    ? 'Saving...'
                    : editingJobId
                    ? 'Save Changes'
                    : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentUserProfile && (
        <CvPreviewModal
          open={Boolean(cvJobTarget)}
          onClose={() => setCvJobTarget(null)}
          profile={currentUserProfile}
          vault={currentUserVault}
          voyages={currentUserVoyages}
          copCertificates={currentUserCopCertificates}
          targetJob={
            cvJobTarget
              ? {
                  rankNeeded: cvJobTarget.rankNeeded,
                  companyName: cvJobTarget.companyName,
                }
              : undefined
          }
        />
      )}
    </main>
  );
}
