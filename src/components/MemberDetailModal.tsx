import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Droplets,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldOff,
  X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import type { DirectoryProfile } from '../types/portal';
import {
  buildMemberMailtoHref,
  buildMemberTelHref,
  cleanBatchLabel,
} from '../utils/portalLogic';
import { DigitalIdCard } from './DigitalIdCard';

interface MemberDetailModalProps {
  member: DirectoryProfile | null;
  isAdmin: boolean;
  onClose: () => void;
  onToggleVerify: (memberId: string, nextVerified: boolean) => Promise<void>;
}

export function MemberDetailModal({
  member,
  isAdmin,
  onClose,
  onToggleVerify,
}: MemberDetailModalProps) {
  const { showToast } = useToast();
  const [toggling, setToggling] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(null);

  const handleCopy = async (field: 'phone' | 'email', val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
    } catch {
      const el = document.createElement('textarea');
      el.value = val;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedField(field);
    showToast('success', `${label} copied`, val);
    window.setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
  };

  useEffect(() => {
    if (!member) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [member, onClose]);

  if (!member) return null;

  const handleAdminToggle = async () => {
    setToggling(true);
    try {
      await onToggleVerify(member.uid, !member.isVerified);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/60 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-white border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                id="member-modal-title"
                className="font-display text-lg font-bold text-[#0A192F] truncate"
              >
                {member.fullName}
              </h2>
              {member.bloodGroup && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 font-mono text-[11px] font-bold text-rose-700 shrink-0">
                  <Droplets className="w-3 h-3" aria-hidden="true" />
                  {member.bloodGroup}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
              <span>
                {member.currentRank} · {member.department} · {cleanBatchLabel(member.batch)}
              </span>
              {(member.city || member.country) && (
                <span className="inline-flex items-center gap-1 text-slate-600">
                  · <MapPin className="w-3 h-3" aria-hidden="true" />
                  {[member.city, member.country].filter(Boolean).join(', ')}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
            <button
              type="button"
              data-testid="modal-contact-btn"
              aria-expanded={showContact}
              onClick={() => setShowContact((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap min-h-[40px] ${
                showContact
                  ? 'bg-[#0A192F] text-[#E5C787] border-[#0A192F]'
                  : 'bg-white text-[#0A192F] border-[#CBD5E1] hover:border-[#0A192F] hover:bg-slate-50'
              }`}
            >
              <Phone
                className={`w-3.5 h-3.5 ${showContact ? 'text-[#E5C787]' : 'text-[#806127]'}`}
                aria-hidden="true"
              />
              Call / Contact
              {showContact ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
            {isAdmin && (
              <button
                type="button"
                disabled={toggling}
                onClick={handleAdminToggle}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap min-h-[40px] ${
                  member.isVerified
                    ? 'bg-white text-slate-700 border-[#CBD5E1] hover:border-red-300 hover:text-red-700'
                    : 'bg-[#0A192F] text-[#E5C787] border-[#0A192F] hover:bg-[#112240]'
                }`}
              >
                {member.isVerified ? (
                  <>
                    <ShieldOff className="w-3.5 h-3.5" aria-hidden="true" />
                    Revoke Verification
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Verify BMASA Member
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close member profile modal"
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100 transition-colors ml-auto sm:ml-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content: Public Credential & Basic Contact Only */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {showContact && (
            <section
              data-testid="modal-contact-panel"
              aria-label="Member direct contact details"
              className="bg-white border border-[#C5A059]/60 rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="flex flex-col justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-wider text-slate-400">
                    PHONE / WHATSAPP NUMBER
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-[#0A192F] truncate select-all">
                    {member.contactPhone || 'Not provided yet'}
                  </p>
                </div>
                {member.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy('phone', member.contactPhone!, 'Phone number')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-slate-700 hover:border-[#0A192F] hover:text-[#0A192F]"
                    >
                      {copiedField === 'phone' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {copiedField === 'phone' ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={buildMemberTelHref(member.contactPhone) ?? undefined}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-semibold whitespace-nowrap"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
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
                  <p className="mt-1 font-mono text-xs sm:text-sm font-medium text-[#0A192F] break-words select-all">
                    {member.contactEmail || 'Not provided yet'}
                  </p>
                </div>
                {member.contactEmail && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy('email', member.contactEmail!, 'Email address')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-slate-700 hover:border-[#0A192F] hover:text-[#0A192F]"
                    >
                      {copiedField === 'email' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={buildMemberMailtoHref(member.contactEmail, member) ?? undefined}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#0A192F] text-[#0A192F] hover:bg-slate-50 text-xs font-semibold whitespace-nowrap"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                      Mail
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          <DigitalIdCard member={member} showActions showContactAction compact />

          {member.additionalInfo && (
            <section className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4">
              <p className="font-display text-sm font-semibold text-[#0A192F]">
                {member.department === 'Instructors'
                  ? 'Instructor Biography & Academic Information'
                  : 'Member Biography'}
              </p>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                {member.additionalInfo}
              </p>
            </section>
          )}

          <div
            data-testid="member-privacy-notice"
            className="bg-slate-100/80 border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-slate-600"
          >
            <Lock className="w-4 h-4 text-[#806127] shrink-0" aria-hidden="true" />
            <span>
              Sea service records, CV dossier, certificates, passport number, and banking details are strictly private to the member.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
