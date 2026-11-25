import { ArrowLeft, Lock, Mail, Phone } from 'lucide-react';
import type { DirectoryProfile } from '../types/portal';
import { buildMemberMailtoHref, buildMemberTelHref } from '../utils/portalLogic';
import { DigitalIdCard } from './DigitalIdCard';

interface SharedProfileViewProps {
  memberId: string;
  members: DirectoryProfile[];
  onReturnToPortal: () => void;
}

export function SharedProfileView({
  memberId,
  members,
  onReturnToPortal,
}: SharedProfileViewProps) {
  const member = members.find((m) => m.uid === memberId) ?? null;

  if (!member) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center">
          <p className="font-mono text-xs tracking-[0.12em] text-[#806127]">
            BMASA CREDENTIAL VERIFICATION
          </p>
          <h1 className="mt-2 font-display text-xl font-bold text-[#0A192F]">
            Member Credential Requires Portal Sign-In
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Sign in with your Bangladesh Marine Academy Sylhet Alumni Association (BMASA) account
            to verify live directory credentials protected by Firestore security rules.
          </p>
          <button
            type="button"
            onClick={onReturnToPortal}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Return to BMASA Portal
          </button>
        </div>
      </main>
    );
  }

  const telHref = buildMemberTelHref(member.contactPhone);
  const mailHref = buildMemberMailtoHref(member.contactEmail, member);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onReturnToPortal}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0A192F] transition-colors min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to BMASA Portal
        </button>
        <p className="font-mono text-xs text-slate-500">Official Shared BMASA Credential</p>
      </div>

      <DigitalIdCard member={member} showActions showContactAction />

      {(member.contactPhone || member.contactEmail) && (
        <section
          aria-label="Member basic contact details"
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <p className="font-mono text-[10px] tracking-wider text-slate-400">
              PHONE / WHATSAPP
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-[#0A192F]">
              {member.contactPhone || 'Not provided'}
            </p>
            {telHref && (
              <a
                href={telHref}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A192F] hover:text-[#806127]"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                Call Member
              </a>
            )}
          </div>
          <div className="sm:border-l sm:border-[#E2E8F0] sm:pl-4">
            <p className="font-mono text-[10px] tracking-wider text-slate-400">
              EMAIL ADDRESS
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-[#0A192F] break-words">
              {member.contactEmail || 'Not provided'}
            </p>
            {mailHref && (
              <a
                href={mailHref}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A192F] hover:text-[#806127]"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                Send Email
              </a>
            )}
          </div>
        </section>
      )}

      {member.additionalInfo && (
        <section className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4">
          <p className="font-display text-sm font-semibold text-[#0A192F]">
            Member Biography
          </p>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
            {member.additionalInfo}
          </p>
        </section>
      )}

      <div className="bg-slate-100/80 border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-slate-600">
        <Lock className="w-4 h-4 text-[#806127] shrink-0" aria-hidden="true" />
        <span>
          CV, sea service history, certificates, passport number, and banking details are hidden from external credential links.
        </span>
      </div>
    </main>
  );
}
