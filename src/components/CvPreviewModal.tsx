import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useHistoryOverlay } from '../hooks/useHistoryOverlay';
import type {
  CopCertificate,
  DirectoryProfile,
  PrivateVault,
  VoyageRecord,
} from '../types/portal';
import {
  buildSeafarerCvData,
  exportSeafarerCvPdf,
  formatCvPlainText,
  printSeafarerCv,
} from '../utils/cvBuilder';
import { buildShareableProfileUrl, formatMaritimeDate } from '../utils/portalLogic';
import { AvatarPhoto } from './AvatarPhoto';

interface CvPreviewModalProps {
  open: boolean;
  onClose: () => void;
  profile: DirectoryProfile;
  vault: PrivateVault | null;
  voyages: VoyageRecord[];
  copCertificates: CopCertificate[];
  targetJob?: {
    rankNeeded: string;
    companyName: string;
  };
}

function fmtOptDate(iso: string): string {
  if (!iso) return '—';
  return formatMaritimeDate(iso);
}

export function CvPreviewModal({
  open,
  onClose,
  profile,
  vault,
  voyages,
  copCertificates,
  targetJob,
}: CvPreviewModalProps) {
  const { showToast } = useToast();
  const [includeNok, setIncludeNok] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  useHistoryOverlay(open, 'bmasaCvModal', onClose);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `https://bmasa-portal.org/?member=${profile.uid}`;
    }
    return buildShareableProfileUrl(
      window.location.origin,
      window.location.pathname,
      profile.uid
    );
  }, [profile.uid]);

  const cv = useMemo(
    () =>
      buildSeafarerCvData({
        profile,
        vault,
        voyages,
        copCertificates,
        shareUrl,
      }),
    [profile, vault, voyages, copCertificates, shareUrl]
  );

  if (!open) return null;

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const filename = await exportSeafarerCvPdf(cv, { includeNok, targetJob });
      showToast('success', 'Seafarer CV PDF downloaded', filename);
    } catch {
      showToast('error', 'CV export failed', 'Unable to render PDF right now.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    printSeafarerCv(cv, { includeNok, targetJob });
    showToast('info', 'Print dialog opened', 'Select Save as PDF or your printer.');
  };

  const handleCopyText = async () => {
    const text = formatCvPlainText(cv, { includeNok, targetJob });
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
    setCopiedText(true);
    showToast('success', 'CV text copied', 'Formatted Seafarer CV summary copied to clipboard.');
    window.setTimeout(() => setCopiedText(false), 2600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cv-preview-modal-title"
      data-testid="cv-preview-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-[#0A192F]/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col text-[#0A192F]">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#0A192F] text-white border-b border-[#C5A059]/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-[#D8B979] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#E5C787] uppercase">
                OFFICIAL MARITIME CURRICULUM VITAE
              </p>
              <h2 id="cv-preview-modal-title" className="font-display text-base sm:text-lg font-bold truncate">
                {cv.fullName} — Seafarer CV
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Seafarer CV Preview"
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 inline-flex items-center justify-center text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeNok}
              onChange={(e) => setIncludeNok(e.target.checked)}
              className="rounded border-slate-300 text-[#0A192F]"
            />
            <span>Include Emergency Next-of-Kin (NOK) Details</span>
          </label>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              data-testid="cv-copy-text-btn"
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap min-h-[38px]"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  CV Text Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  Copy CV Text
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="cv-print-btn"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap min-h-[38px]"
            >
              <Printer className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
              Print / Save PDF
            </button>

            <button
              type="button"
              data-testid="cv-download-pdf-btn"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
              {downloadingPdf ? 'Generating PDF...' : 'Download PDF CV'}
            </button>
          </div>
        </div>

        {/* Scrollable CV Document Sheet */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/80 space-y-5">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden p-5 sm:p-7 space-y-6">
            {/* CV Banner Header */}
            <div className="p-5 rounded-xl bg-[#0A192F] text-white border-b-4 border-[#C5A059] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#E5C787]">
                  {cv.academyName}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                    {cv.fullName}
                  </h3>
                  {cv.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C5A059]/25 border border-[#C5A059] text-[#F3E5AB] font-mono text-[10px]">
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      VERIFIED
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#D8B979]">
                  {cv.currentRank} ·{' '}
                  {cv.department === 'Instructors' ? 'Instructors Faculty' : `${cv.department} Department`}
                </p>
                <p className="text-xs text-slate-300 font-mono">
                  Cadet No: {cv.cadetNumber} · {cv.batch} · {cv.availabilityStatus}
                  {cv.bloodGroup ? ` · Blood: ${cv.bloodGroup}` : ''}
                </p>
                <p className="text-xs text-slate-300">
                  Email: {cv.contact.email || '—'} · Mobile/WA: {cv.contact.whatsapp || cv.contact.phone || '—'} ·{' '}
                  {cv.location || 'Bangladesh'}
                </p>
              </div>
              <AvatarPhoto
                src={cv.photoUrl}
                name={cv.fullName}
                sizeClass="w-20 h-20"
                roundedClass="rounded-xl"
                darkSurface
              />
            </div>

            {targetJob && (
              <div className="p-3.5 rounded-lg bg-[#FBF8F1] border border-[#C5A059]/70 text-xs text-[#0A192F]">
                <strong>Application Reference:</strong> Prepared for{' '}
                <strong>{targetJob.rankNeeded}</strong> vacancy at{' '}
                <strong>{targetJob.companyName}</strong>.
              </div>
            )}

            {/* 1. Statutory Travel & Competency Docs */}
            <section>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1.5 border-b border-[#C5A059] mb-2.5">
                Travel, Statutory &amp; Competency Documents (CDC, Passport, CoC, Medical)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-[#E2E8F0]">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-600 text-left">
                      <th className="p-2 border border-[#E2E8F0]">Document</th>
                      <th className="p-2 border border-[#E2E8F0]">Number / Grade</th>
                      <th className="p-2 border border-[#E2E8F0]">Issue Date</th>
                      <th className="p-2 border border-[#E2E8F0]">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cv.documents.map((d) => (
                      <tr key={d.name}>
                        <td className="p-2 border border-[#E2E8F0] font-semibold text-[#0A192F]">{d.name}</td>
                        <td className="p-2 border border-[#E2E8F0] font-mono">{d.docNumber}</td>
                        <td className="p-2 border border-[#E2E8F0] font-mono">{fmtOptDate(d.issueDate)}</td>
                        <td className="p-2 border border-[#E2E8F0] font-mono">{fmtOptDate(d.expiryDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 2. STCW COP Certificates */}
            <section>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1.5 border-b border-[#C5A059] mb-2.5">
                STCW Certificates of Proficiency (COP)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-[#E2E8F0]">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-600 text-left">
                      <th className="p-2 border border-[#E2E8F0]">Certificate Title</th>
                      <th className="p-2 border border-[#E2E8F0]">Cert No.</th>
                      <th className="p-2 border border-[#E2E8F0]">Issue Date</th>
                      <th className="p-2 border border-[#E2E8F0]">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cv.copCertificates.length > 0 ? (
                      cv.copCertificates.map((c) => (
                        <tr key={`${c.title}-${c.certNumber}`}>
                          <td className="p-2 border border-[#E2E8F0] font-semibold text-[#0A192F]">{c.title}</td>
                          <td className="p-2 border border-[#E2E8F0] font-mono">{c.certNumber}</td>
                          <td className="p-2 border border-[#E2E8F0] font-mono">{fmtOptDate(c.issueDate)}</td>
                          <td className="p-2 border border-[#E2E8F0] font-mono">{fmtOptDate(c.expiryDate)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 border border-[#E2E8F0] text-center text-slate-500">
                          No COP certificates recorded yet. Add them in Profile → Certificate Expiry.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. User-Added Academic Qualifications */}
            <section>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1.5 border-b border-[#C5A059] mb-2.5">
                Academic Qualifications
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-[#E2E8F0]">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-600 text-left">
                      <th className="p-2 border border-[#E2E8F0]">Qualification</th>
                      <th className="p-2 border border-[#E2E8F0]">Institution</th>
                      <th className="p-2 border border-[#E2E8F0]">Board / University</th>
                      <th className="p-2 border border-[#E2E8F0]">Year</th>
                      <th className="p-2 border border-[#E2E8F0]">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cv.academicQualifications.length > 0 ? (
                      cv.academicQualifications.map((q) => (
                        <tr key={q.id}>
                          <td className="p-2 border border-[#E2E8F0] font-semibold text-[#0A192F]">{q.level}</td>
                          <td className="p-2 border border-[#E2E8F0]">{q.institution || '—'}</td>
                          <td className="p-2 border border-[#E2E8F0]">{q.boardOrUniversity || '—'}</td>
                          <td className="p-2 border border-[#E2E8F0] font-mono">{q.passingYear || '—'}</td>
                          <td className="p-2 border border-[#E2E8F0] font-mono">{q.result || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-3 border border-[#E2E8F0] text-center text-slate-500">
                          No academic qualifications added yet. Add them in Profile → Personal Details.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Sea Service Voyages */}
            <section>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1.5 border-b border-[#C5A059] mb-2.5">
                Sea Service Record (Cumulative Sea Time: {cv.seaTime.formattedYmd})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-[#E2E8F0]">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-600 text-left">
                      <th className="p-2 border border-[#E2E8F0]">Vessel Name</th>
                      <th className="p-2 border border-[#E2E8F0]">Type</th>
                      <th className="p-2 border border-[#E2E8F0]">Rank</th>
                      <th className="p-2 border border-[#E2E8F0]">Company</th>
                      <th className="p-2 border border-[#E2E8F0]">Sign On</th>
                      <th className="p-2 border border-[#E2E8F0]">Sign Off</th>
                      <th className="p-2 border border-[#E2E8F0]">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cv.voyages.length > 0 ? (
                      cv.voyages.map((v, i) => (
                        <tr key={`${v.vesselName}-${v.signOnDate}-${i}`}>
                          <td className="p-2 border border-[#E2E8F0] font-semibold text-[#0A192F]">{v.vesselName}</td>
                          <td className="p-2 border border-[#E2E8F0]">{v.vesselType}</td>
                          <td className="p-2 border border-[#E2E8F0]">{v.rankServed}</td>
                          <td className="p-2 border border-[#E2E8F0]">{v.companyName}</td>
                          <td className="p-2 border border-[#E2E8F0] font-mono">{formatMaritimeDate(v.signOnDate)}</td>
                          <td className="p-2 border border-[#E2E8F0] font-mono">{formatMaritimeDate(v.signOffDate)}</td>
                          <td className="p-2 border border-[#E2E8F0] font-mono">{v.duration}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-3 border border-[#E2E8F0] text-center text-slate-500">
                          No sea voyages logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. Emergency Next-of-Kin */}
            {includeNok && (
              <section>
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1.5 border-b border-[#C5A059] mb-2.5">
                  Emergency Next-of-Kin (NOK)
                </h4>
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-slate-500">Name</span>
                    <span className="font-semibold text-[#0A192F]">{cv.nok.name || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-slate-500">Relationship</span>
                    <span className="font-semibold text-[#0A192F]">{cv.nok.relation || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-slate-500">Phone</span>
                    <span className="font-mono font-semibold text-[#0A192F]">{cv.nok.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-slate-500">City</span>
                    <span className="font-semibold text-[#0A192F]">{cv.nok.city || '—'}</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
