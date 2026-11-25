import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Anchor,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Droplets,
  FileText,
  Mail,
  MapPin,
  Phone,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import type { AvailabilityStatus, DirectoryProfile } from '../types/portal';
import { useToast } from '../context/ToastContext';
import {
  buildMemberMailtoHref,
  buildMemberTelHref,
  buildShareableProfileUrl,
  cleanBatchLabel,
} from '../utils/portalLogic';
import { exportDigitalIdCardPng, printDigitalIdCardCR80 } from '../utils/cardExporter';
import { AvatarPhoto } from './AvatarPhoto';

interface DigitalIdCardProps {
  member: DirectoryProfile;
  showActions?: boolean;
  showContactAction?: boolean;
  compact?: boolean;
  onDownloadCv?: () => void;
}

const STATUS_BADGE_STYLES: Record<AvailabilityStatus, string> = {
  'Available for Sea': 'bg-emerald-50 text-emerald-800 border-emerald-300',
  Onboard: 'bg-sky-50 text-sky-800 border-sky-300',
  'On Leave': 'bg-amber-50 text-amber-800 border-amber-300',
  'Shore-Based': 'bg-slate-100 text-slate-800 border-slate-300',
};

export function DigitalIdCard({
  member,
  showActions = true,
  showContactAction = true,
  compact = false,
  onDownloadCv,
}: DigitalIdCardProps) {
  const { showToast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [copiedContact, setCopiedContact] = useState<'phone' | 'email' | null>(null);

  const handleCopyContact = async (field: 'phone' | 'email', val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
    } catch {
      const input = document.createElement('textarea');
      input.value = val;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedContact(field);
    showToast('success', `${label} copied`, val);
    window.setTimeout(() => setCopiedContact((curr) => (curr === field ? null : curr)), 2000);
  };

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `https://bmasa-portal.org/?member=${member.uid}`;
    }
    return buildShareableProfileUrl(
      window.location.origin,
      window.location.pathname,
      member.uid
    );
  }, [member.uid]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 160,
      margin: 1,
      color: { dark: '#0A192F', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [shareUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement('textarea');
      input.value = shareUrl;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    showToast('success', 'Profile link copied', 'Shareable BMASA credential URL copied.');
    window.setTimeout(() => setCopied(false), 2400);
  };

  const handleDownloadCard = async () => {
    setDownloading(true);
    try {
      await exportDigitalIdCardPng(member, shareUrl);
      showToast('success', 'ID Card downloaded', 'Saved CR80 print-ready BMASA Digital ID PNG.');
    } catch {
      showToast('error', 'Download failed', 'Unable to export PNG card right now.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintCard = async () => {
    setPrinting(true);
    try {
      await printDigitalIdCardCR80(member, shareUrl);
    } catch {
      showToast('error', 'Print unavailable', 'Unable to open print preview right now.');
    } finally {
      setPrinting(false);
    }
  };

  const locationText = [member.city, member.country].filter(Boolean).join(', ');
  const batchLabel = cleanBatchLabel(member.batch);

  return (
    <div className="w-full">
      {/* Light Print-Ready CR80 Digital Alumni ID Card (85.6mm x 54mm / 1.586:1 proportions) */}
      <article
        data-testid="digital-id-card"
        aria-label={`Official BMASA Digital Alumni Credential for ${member.fullName}`}
        className="relative w-full sm:aspect-[85.6/54] flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#F8FAFC] to-[#EFF5FC] text-[#0A192F] border-2 border-[#C5A059] shadow-[0_14px_38px_rgba(10,25,47,0.14)]"
      >
        {/* Subtle gold accent top hairline */}
        <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-[#C5A059] via-[#E5C787] to-[#C5A059] shrink-0" />

        {/* Subtle inner hairline border */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2.5 rounded-xl border border-[#0A192F]/10"
        />

        {/* Faint light brass propeller watermark */}
        <svg
          aria-hidden="true"
          data-testid="id-card-propeller"
          viewBox="0 0 240 240"
          fill="none"
          className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 w-56 h-56 text-[#C5A059]/[0.14]"
        >
          <circle cx="120" cy="120" r="108" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 6" />
          <circle cx="120" cy="120" r="20" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="120" cy="120" r="8" stroke="currentColor" strokeWidth="1.4" />
          <path d="M120 100 C102 68 96 32 120 18 C144 32 138 68 120 100 Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.3" />
          <path d="M140 120 C172 102 208 96 222 120 C208 144 172 138 140 120 Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.3" />
          <path d="M120 140 C138 172 144 208 120 222 C96 208 102 172 120 140 Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.3" />
          <path d="M100 120 C68 138 32 144 18 120 C32 96 68 102 100 120 Z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.3" />
        </svg>

        <div className={`relative z-10 flex-1 flex flex-col justify-between ${compact ? 'p-4 sm:p-5' : 'p-4 sm:p-6'}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#C5A059]/40">
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] sm:text-xs font-extrabold tracking-[0.08em] text-[#0A192F] leading-tight">
                BANGLADESH MARINE ACADEMY SYLHET ALUMNI ASSOCIATION
              </p>
              <p className="mt-0.5 font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.12em] text-[#806127]">
                OFFICIAL DIGITAL ALUMNI ID
              </p>
            </div>

            {member.isVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-400 text-emerald-800 font-mono text-[10px] sm:text-[11px] font-bold tracking-wider whitespace-nowrap shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                VERIFIED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-400 text-amber-900 font-mono text-[10px] sm:text-[11px] font-bold tracking-wider whitespace-nowrap shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                PENDING
              </span>
            )}
          </div>

          {/* Member Body */}
          <div className="mt-3 flex flex-row items-center gap-3 sm:gap-4">
            <AvatarPhoto
              src={member.photoUrl}
              name={member.fullName}
              sizeClass={compact ? 'w-14 h-14 sm:w-20 sm:h-20' : 'w-16 h-16 sm:w-24 sm:h-24'}
              roundedClass="rounded-xl border-2 border-[#0A192F]/80 shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h2
                className={`font-display font-extrabold text-[#0A192F] tracking-tight leading-tight ${
                  compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-[1.6rem]'
                }`}
              >
                {member.fullName}
              </h2>
              <p className="mt-0.5 font-display text-sm sm:text-base font-bold text-[#806127]">
                {member.currentRank}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-700 font-medium">
                <span className="text-[#0A192F] font-semibold">
                  {member.department === 'Instructors'
                    ? 'Instructors Faculty'
                    : `${member.department} Branch`}
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                    STATUS_BADGE_STYLES[member.availabilityStatus]
                  }`}
                >
                  <Anchor className="w-3 h-3" aria-hidden="true" />
                  {member.availabilityStatus}
                </span>

                {member.bloodGroup && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 font-mono text-[11px] sm:text-xs font-bold">
                    <Droplets className="w-3 h-3" aria-hidden="true" />
                    {member.bloodGroup}
                  </span>
                )}

                {locationText && (
                  <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-slate-600 font-medium">
                    <MapPin className="w-3 h-3 text-[#806127]" aria-hidden="true" />
                    {locationText}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Large Print-Friendly 4-Column Credential Grid */}
          <dl className="mt-3 pt-2.5 border-t border-[#0A192F]/15 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2">
            <div className="min-w-0">
              <dt className="font-mono text-[10px] font-bold tracking-[0.1em] text-slate-500">
                CADET NO.
              </dt>
              <dd className="mt-0.5 font-mono text-sm sm:text-[15px] font-extrabold text-[#0A192F] truncate">
                {member.cadetNumber || '—'}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-[10px] font-bold tracking-[0.1em] text-slate-500">
                BATCH
              </dt>
              <dd className="mt-0.5 font-mono text-sm sm:text-[15px] font-extrabold text-[#0A192F] truncate">
                {batchLabel || '—'}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-[10px] font-bold tracking-[0.1em] text-slate-500">
                CDC NUMBER
              </dt>
              <dd className="mt-0.5 font-mono text-sm sm:text-[15px] font-extrabold text-[#0A192F] truncate">
                {member.cdcNumber || 'Pending'}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-[10px] font-bold tracking-[0.1em] text-slate-500">
                SID CARD NO.
              </dt>
              <dd className="mt-0.5 font-mono text-sm sm:text-[15px] font-extrabold text-[#0A192F] truncate">
                {member.sidNumber || 'Pending'}
              </dd>
            </div>
          </dl>

          {/* Footer Serial & Verification QR */}
          <div className="mt-2.5 pt-2.5 border-t border-[#0A192F]/15 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-slate-500">
                BMASA CREDENTIAL SERIAL
              </p>
              <p className="mt-0.5 font-mono text-sm sm:text-base font-extrabold tracking-wider text-[#0A192F] truncate">
                {member.cadetNumber || member.memberSerial}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-600 max-w-xs leading-snug">
                Scan QR code to verify official BMASA Digital Alumni ID.
              </p>
            </div>

            <div className="shrink-0 bg-white p-1.5 rounded-lg border-2 border-[#C5A059] shadow-sm">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Verification QR code for ${member.fullName}`}
                  className="w-14 h-14 sm:w-16 sm:h-16 block"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-500">
                  QR
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {showActions && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-initial min-h-[42px] inline-flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  Profile Link Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  Copy Profile Link
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="download-id-card-btn"
              onClick={handleDownloadCard}
              disabled={downloading}
              className="flex-1 sm:flex-initial min-h-[42px] inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#13294B] border border-[#C5A059]/70 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
            >
              <Download className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
              {downloading ? 'Rendering CR80 PNG...' : 'Download / Print ID Card'}
            </button>

            <button
              type="button"
              data-testid="print-id-card-btn"
              onClick={handlePrintCard}
              disabled={printing}
              className="flex-1 sm:flex-initial min-h-[42px] inline-flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F]"
            >
              <Printer className="w-4 h-4 text-[#806127]" aria-hidden="true" />
              {printing ? 'Preparing Print...' : 'Print CR80'}
            </button>

            {onDownloadCv && (
              <button
                type="button"
                data-testid="id-card-cv-btn"
                onClick={onDownloadCv}
                className="flex-1 sm:flex-initial min-h-[42px] inline-flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0A192F] bg-[#FBF8F1] border border-[#C5A059] hover:bg-[#F3E5AB]/50 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
              >
                <FileText className="w-4 h-4 text-[#806127]" aria-hidden="true" />
                Download CV
              </button>
            )}

            {showContactAction && (
              <button
                type="button"
                data-testid="id-card-contact-btn"
                aria-expanded={contactOpen}
                onClick={() => setContactOpen((prev) => !prev)}
                className={`flex-1 sm:flex-initial min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold border rounded-lg transition-colors whitespace-nowrap ${
                  contactOpen
                    ? 'bg-[#0A192F] text-[#E5C787] border-[#0A192F]'
                    : 'text-[#0A192F] bg-white border-[#CBD5E1] hover:border-[#0A192F] hover:bg-slate-50'
                }`}
              >
                <Phone
                  className={`w-4 h-4 ${contactOpen ? 'text-[#E5C787]' : 'text-[#806127]'}`}
                  aria-hidden="true"
                />
                Call / Contact
                {contactOpen ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          {showContactAction && contactOpen && (
            <div
              data-testid="id-card-contact-panel"
              className="p-4 rounded-xl bg-white border border-[#C5A059]/60 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="flex flex-col justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-wider text-slate-400">
                    PHONE / WHATSAPP
                  </p>
                  <p className="mt-0.5 font-mono text-xs sm:text-sm font-semibold text-[#0A192F] truncate select-all">
                    {member.contactPhone || 'Not provided yet'}
                  </p>
                </div>
                {member.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyContact('phone', member.contactPhone!, 'Phone number')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#CBD5E1] text-xs font-semibold text-slate-700 hover:border-[#0A192F]"
                    >
                      {copiedContact === 'phone' ? (
                        <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3 h-3" aria-hidden="true" />
                      )}
                      {copiedContact === 'phone' ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={buildMemberTelHref(member.contactPhone) ?? undefined}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0A192F] text-white text-xs font-semibold"
                    >
                      <Phone className="w-3 h-3 text-[#D8B979]" aria-hidden="true" />
                      Call
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between gap-2.5 sm:border-l sm:border-[#E2E8F0] sm:pl-4">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-wider text-slate-400">
                    EMAIL ADDRESS
                  </p>
                  <p className="mt-0.5 font-mono text-xs sm:text-sm font-medium text-[#0A192F] break-words select-all">
                    {member.contactEmail || 'Not provided yet'}
                  </p>
                </div>
                {member.contactEmail && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyContact('email', member.contactEmail!, 'Email address')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#CBD5E1] text-xs font-semibold text-slate-700 hover:border-[#0A192F]"
                    >
                      {copiedContact === 'email' ? (
                        <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3 h-3" aria-hidden="true" />
                      )}
                      {copiedContact === 'email' ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={buildMemberMailtoHref(member.contactEmail, member) ?? undefined}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#0A192F] text-[#0A192F] text-xs font-semibold"
                    >
                      <Mail className="w-3 h-3 text-[#806127]" aria-hidden="true" />
                      Mail
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
