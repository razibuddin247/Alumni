import {
  NOTICE_TYPES,
  type CopCertificate,
  type DirectoryFilters,
  type DirectoryProfile,
  type FundTransaction,
  type JobPosting,
  type MemberFundSummary,
  type NoticeItem,
  type NoticeType,
  type PortalStats,
  type PrivateVault,
  type VoyageRecord,
} from '../types/portal';

export type NoticeSortOption = 'newest' | 'oldest' | 'title_asc' | 'type';
export type NoticeTypeFilter = 'All' | NoticeType;

export interface SeaTimeSummary {
  totalDays: number;
  years: number;
  months: number;
  monthsRemainder: number;
  remainingDays: number;
  formatted: string;
  formattedYmd: string;
}

export interface FundTotalsSummary {
  totalCollected: number;
  totalDisbursed: number;
  netBalance: number;
  contributionCount: number;
  disbursementCount: number;
  contributingMemberCount: number;
}

export interface CertificateExpiryStatus {
  status: 'Not Set' | 'Valid' | 'Expiring Soon' | 'Expired';
  daysRemaining: number | null;
  label: string;
}

/**
 * Filter alumni and cadet directory members by search text, batch, department, rank, availability, blood group, and city.
 */
export function filterDirectoryMembers(
  members: DirectoryProfile[],
  filters: DirectoryFilters
): DirectoryProfile[] {
  const q = filters.query.trim().toLowerCase();
  const rankFilter = filters.rank.trim().toLowerCase();
  const bloodFilter = filters.bloodGroup && filters.bloodGroup !== 'All' ? filters.bloodGroup : '';
  const cityFilter = (filters.city ?? '').trim().toLowerCase();

  return members
    .filter((member) => {
      if (filters.department !== 'All' && member.department !== filters.department) {
        return false;
      }
      if (filters.batch !== 'All') {
        const matchesBatch =
          member.batch === filters.batch ||
          (filters.batch.startsWith('2nd Batch') && member.batch.startsWith('2nd Batch'));
        if (!matchesBatch) {
          return false;
        }
      }
      if (
        filters.availability !== 'All' &&
        member.availabilityStatus !== filters.availability
      ) {
        return false;
      }
      if (bloodFilter && member.bloodGroup !== bloodFilter) {
        return false;
      }
      if (cityFilter && cityFilter !== 'all') {
        const loc = `${member.city} ${member.country}`.toLowerCase();
        if (!loc.includes(cityFilter)) {
          return false;
        }
      }
      if (rankFilter && rankFilter !== 'all') {
        if (!member.currentRank.toLowerCase().includes(rankFilter)) {
          return false;
        }
      }
      if (q) {
        const searchable = [
          member.fullName,
          member.cadetNumber,
          member.cdcNumber,
          member.sidNumber ?? '',
          member.currentRank,
          cleanBatchLabel(member.batch),
          member.department,
          member.memberSerial,
          member.bloodGroup,
          member.city,
          member.country,
          member.contactEmail ?? '',
          member.contactPhone ?? '',
          member.additionalInfo ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
      }
      const batchDiff = extractBatchOrder(a.batch) - extractBatchOrder(b.batch);
      if (batchDiff !== 0) return batchDiff;
      return a.fullName.localeCompare(b.fullName);
    });
}

export function extractBatchOrder(batch: string): number {
  const match = batch.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

/**
 * Strips any legacy "(Founding Batch)" / "(Founding)" suffix from batch labels.
 */
export function cleanBatchLabel(batch: string): string {
  return (batch ?? '')
    .replace(/\s*\(Founding(?:\s+Batch)?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sorts sea service voyages newest first, placing ongoing onboard contracts at top.
 */
export function sortVoyagesChronologically(voyages: VoyageRecord[]): VoyageRecord[] {
  return [...voyages].sort((a, b) => {
    const aOngoing = !a.signOffDate;
    const bOngoing = !b.signOffDate;
    if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
    return b.signOnDate.localeCompare(a.signOnDate);
  });
}

/**
 * Calculates total sea time across voyages in both months/days (30-day convention) and years/months/days.
 */
export function calculateSeaTime(
  voyages: VoyageRecord[],
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): SeaTimeSummary {
  let totalDays = 0;

  for (const voyage of voyages) {
    const start = parseIsoDateUtc(voyage.signOnDate);
    const end = parseIsoDateUtc(voyage.signOffDate || referenceDateIso);
    if (!start || !end) continue;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) continue;
    const days = Math.floor(diffMs / 86_400_000) + 1;
    totalDays += days;
  }

  const months = Math.floor(totalDays / 30);
  const remainingDays = totalDays % 30;
  const years = Math.floor(totalDays / 365);
  const daysAfterYears = totalDays % 365;
  const monthsRemainder = Math.floor(daysAfterYears / 30);
  const finalDays = daysAfterYears % 30;

  const formatted =
    totalDays === 0
      ? '0m'
      : months > 0
      ? `${months}m ${remainingDays}d`
      : `${remainingDays}d`;

  const yLabel = `${years} yr${years === 1 ? '' : 's'}`;
  const mLabel = `${monthsRemainder} mo${monthsRemainder === 1 ? '' : 's'}`;
  const dLabel = `${finalDays} day${finalDays === 1 ? '' : 's'}`;
  const formattedYmd = `${yLabel}, ${mLabel}, ${dLabel}`;

  return {
    totalDays,
    years,
    months,
    monthsRemainder,
    remainingDays,
    formatted,
    formattedYmd,
  };
}

export function calculateSingleVoyageDuration(
  signOnDate: string,
  signOffDate: string,
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): string {
  const summary = calculateSeaTime(
    [
      {
        id: 'calc',
        memberId: 'calc',
        vesselName: '',
        vesselType: 'Bulk Carrier',
        companyName: '',
        rankServed: '',
        signOnDate,
        signOffDate,
        isVisible: true,
      },
    ],
    referenceDateIso
  );
  return summary.formatted;
}

export function getCertificateExpiryStatus(
  expiryIso: string,
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): CertificateExpiryStatus {
  const trimmed = expiryIso.trim();
  if (!trimmed) {
    return { status: 'Not Set', daysRemaining: null, label: 'Not recorded' };
  }
  const expiry = parseIsoDateUtc(trimmed);
  const today = parseIsoDateUtc(referenceDateIso);
  if (!expiry || !today) {
    return { status: 'Not Set', daysRemaining: null, label: 'Invalid date' };
  }
  const daysRemaining = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
  if (daysRemaining < 0) {
    return {
      status: 'Expired',
      daysRemaining,
      label: `Expired ${Math.abs(daysRemaining)}d ago`,
    };
  }
  if (daysRemaining <= 180) {
    return {
      status: 'Expiring Soon',
      daysRemaining,
      label: `${daysRemaining}d left (<6 mos)`,
    };
  }
  return {
    status: 'Valid',
    daysRemaining,
    label: `Valid (${Math.floor(daysRemaining / 30)}m left)`,
  };
}

function parseIsoDateUtc(iso: string): Date | null {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function formatMaritimeDate(iso: string): string {
  if (!iso) return 'Present (Onboard)';
  const dt = parseIsoDateUtc(iso);
  if (!dt) return iso;
  return dt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatTransactionDateTime(isoDateTime: string): string {
  if (!isoDateTime) return '—';
  const match = isoDateTime.match(
    /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})/
  );
  if (!match) return isoDateTime;
  const [, y, m, d, hh, mm] = match;
  const monthIndex = Number(m) - 1;
  const dt = new Date(Date.UTC(Number(y), monthIndex, Number(d)));
  const datePart = dt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const hour24 = Number(hh);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${datePart}, ${String(hour12).padStart(2, '0')}:${mm} ${period}`;
}

export function formatBdtAmount(amount: number): string {
  return `৳ ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function computeFundTotals(transactions: FundTransaction[]): FundTotalsSummary {
  let totalCollected = 0;
  let totalDisbursed = 0;
  let contributionCount = 0;
  let disbursementCount = 0;
  const contributorKeys = new Set<string>();

  for (const tx of transactions) {
    if (tx.entryType === 'contribution') {
      totalCollected += tx.amount;
      contributionCount += 1;
      const key = tx.memberUid || tx.memberCadetNumber || tx.memberName.toLowerCase();
      if (key) contributorKeys.add(key);
    } else if (tx.entryType === 'disbursement') {
      totalDisbursed += tx.amount;
      disbursementCount += 1;
    }
  }

  return {
    totalCollected,
    totalDisbursed,
    netBalance: totalCollected - totalDisbursed,
    contributionCount,
    disbursementCount,
    contributingMemberCount: contributorKeys.size,
  };
}

/**
 * Builds a complete per-member contribution record covering EVERY registered member,
 * plus any unlinked contribution records if applicable.
 */
export function buildMemberFundSummaries(
  members: DirectoryProfile[],
  transactions: FundTransaction[]
): MemberFundSummary[] {
  const byMember = new Map<string, MemberFundSummary>();

  for (const member of members) {
    byMember.set(member.uid, {
      memberUid: member.uid,
      memberName: member.fullName,
      cadetNumber: member.cadetNumber,
      batch: member.batch,
      department: member.department,
      isVerified: member.isVerified,
      totalContributed: 0,
      contributionCount: 0,
      lastContributionDateTime: null,
      lastRecordedByName: null,
    });
  }

  for (const tx of transactions) {
    if (tx.entryType !== 'contribution') continue;
    const actorDisplayName = tx.updatedByName || tx.recordedByName || null;

    if (tx.memberUid && byMember.has(tx.memberUid)) {
      const entry = byMember.get(tx.memberUid)!;
      entry.totalContributed += tx.amount;
      entry.contributionCount += 1;
      if (
        !entry.lastContributionDateTime ||
        tx.transactionDateTime > entry.lastContributionDateTime
      ) {
        entry.lastContributionDateTime = tx.transactionDateTime;
        entry.lastRecordedByName = actorDisplayName;
      }
      continue;
    }

    const fallbackKey = `ext_${tx.memberName.trim().toLowerCase()}_${tx.memberCadetNumber
      .trim()
      .toLowerCase()}`;
    const existing = byMember.get(fallbackKey);
    if (existing) {
      existing.totalContributed += tx.amount;
      existing.contributionCount += 1;
      if (
        !existing.lastContributionDateTime ||
        tx.transactionDateTime > existing.lastContributionDateTime
      ) {
        existing.lastContributionDateTime = tx.transactionDateTime;
        existing.lastRecordedByName = actorDisplayName;
      }
    } else {
      byMember.set(fallbackKey, {
        memberUid: tx.memberUid || '',
        memberName: tx.memberName,
        cadetNumber: tx.memberCadetNumber || '—',
        batch: tx.memberBatch || '—',
        department: 'External',
        isVerified: false,
        totalContributed: tx.amount,
        contributionCount: 1,
        lastContributionDateTime: tx.transactionDateTime,
        lastRecordedByName: actorDisplayName,
      });
    }
  }

  return Array.from(byMember.values()).sort((a, b) => {
    if (b.totalContributed !== a.totalContributed) {
      return b.totalContributed - a.totalContributed;
    }
    const batchDiff = extractBatchOrder(a.batch) - extractBatchOrder(b.batch);
    if (batchDiff !== 0) return batchDiff;
    return a.memberName.localeCompare(b.memberName);
  });
}

export function computePortalMetrics(
  members: DirectoryProfile[],
  jobs: JobPosting[]
): PortalStats {
  const registeredAlumni = members.length;
  const verifiedCadets = members.filter((m) => m.isVerified).length;
  const openJobs = jobs.filter((j) => j.status === 'open').length;

  return {
    registeredAlumni,
    verifiedCadets,
    activePlacements: openJobs,
  };
}

export function buildShareableProfileUrl(
  origin: string,
  pathname: string,
  memberId: string
): string {
  const cleanOrigin = origin.replace(/\/$/, '');
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const url = new URL(`${cleanOrigin}${cleanPath}`);
  url.searchParams.set('member', memberId);
  return url.toString();
}

export function extractEmailsFromContact(contactInfo: string): string[] {
  const matches = contactInfo.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.trim())));
}

export function extractEmailFromContact(contactInfo: string): string | null {
  const emails = extractEmailsFromContact(contactInfo);
  return emails.length > 0 ? emails[0] : null;
}

export interface JobApplicationPayload {
  emails: string[];
  subject: string;
  plainTextBody: string;
  mailtoHref: string | null;
}

export interface ManningApplicationPayload {
  emails: string[];
  companyNames: string[];
  subject: string;
  plainTextBody: string;
  mailtoHref: string | null;
}

export function buildJobApplicationPayload(params: {
  job: Pick<JobPosting, 'companyName' | 'rankNeeded' | 'vesselType' | 'contactInfo'>;
  member: DirectoryProfile;
  profileUrl: string;
  applicantEmail?: string;
  cvPdfFilename?: string;
  cvPlainText?: string;
  vault?: PrivateVault | null;
  voyages?: VoyageRecord[];
  copCertificates?: CopCertificate[];
}): JobApplicationPayload {
  const { job, member, profileUrl, applicantEmail, cvPdfFilename } = params;
  const emails = extractEmailsFromContact(job.contactInfo);
  const subject = `BMASA Application: ${job.rankNeeded} — ${member.fullName} (${member.cadetNumber})`;

  const lines: string[] = [
    `Dear ${job.companyName} Recruitment Team,`,
    '',
    `I am applying for the ${job.rankNeeded} (${job.vesselType}) vacancy posted on the Bangladesh Marine Academy Sylhet Alumni Association (BMASA) Portal.`,
    '',
    `Please find attached my official BMASA Seafarer Curriculum Vitae in PDF format (${cvPdfFilename || `BMASA-CV-${(member.cadetNumber || member.fullName).replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`}).`,
    `Digital Alumni ID Card (Official Verification Link): ${profileUrl}`,
  ];

  if (member.currentRank) {
    lines.push(`Current Rank / CoC: ${member.currentRank} (${cleanBatchLabel(member.batch)}, ${member.department})`);
  }
  if (member.sidNumber) {
    lines.push(`SID Card Number: ${member.sidNumber}`);
  }
  if (member.cdcNumber) {
    lines.push(`CDC Number: ${member.cdcNumber}`);
  }
  if (applicantEmail) {
    lines.push(`Applicant Email: ${applicantEmail}`);
  }

  lines.push('');
  lines.push('Best regards,');
  lines.push(member.fullName);

  const plainTextBody = lines.join('\n');
  const recipientList = emails.map((e) => encodeURIComponent(e)).join(',');
  const mailtoHref =
    emails.length > 0
      ? `mailto:${recipientList}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
          plainTextBody
        )}`
      : null;

  return {
    emails,
    subject,
    plainTextBody,
    mailtoHref,
  };
}

export function buildManningAgencyApplicationPayload(params: {
  agencies: Array<{ companyName: string; contactEmail: string }>;
  selectedRank: string;
  expectedSalary: string;
  member: DirectoryProfile;
  profileUrl: string;
  applicantEmail?: string;
  cvPdfFilename?: string;
}): ManningApplicationPayload {
  const { agencies, selectedRank, expectedSalary, member, profileUrl, applicantEmail, cvPdfFilename } = params;
  const cleanRank = selectedRank.trim() || member.currentRank;
  const cleanSalary = expectedSalary.trim() || 'Negotiable / As per Company Scale';
  const validTargets = agencies.filter((a) => extractEmailsFromContact(a.contactEmail).length > 0);
  const emails = Array.from(
    new Set(validTargets.flatMap((a) => extractEmailsFromContact(a.contactEmail)))
  );
  const companyNames = agencies.map((a) => a.companyName);
  const isBulk = agencies.length > 1;
  const salutation =
    !isBulk && agencies.length === 1
      ? `Dear ${agencies[0].companyName} Crewing / Manning Team,`
      : 'Dear Crewing & Manning Manager,';

  const subject = `Seafarer Application: ${cleanRank} — ${member.fullName} (CDC: ${
    member.cdcNumber || 'N/A'
  }${member.sidNumber ? ` | SID: ${member.sidNumber}` : ''})`;

  const lines = [
    salutation,
    '',
    `I am writing to express my interest in a sea-going berth as ${cleanRank}.`,
    `Applied Rank / Position: ${cleanRank}`,
    `Expected / Estimated Salary: ${cleanSalary}`,
    `Attached CV (PDF): ${cvPdfFilename || `BMASA-CV-${(member.cadetNumber || member.fullName).replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`}`,
    `Digital Alumni ID Card (Verification URL): ${profileUrl}`,
    member.cdcNumber ? `CDC Number: ${member.cdcNumber}` : '',
    member.sidNumber ? `SID Card Number: ${member.sidNumber}` : '',
    applicantEmail ? `Contact Email: ${applicantEmail}` : '',
    '',
    'Best regards,',
    member.fullName,
  ].filter((line, idx, arr) => line !== '' || (idx > 0 && arr[idx - 1] !== ''));

  const plainTextBody = lines.join('\n');

  let mailtoHref: string | null = null;
  if (emails.length === 1) {
    mailtoHref = `mailto:${encodeURIComponent(emails[0])}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(plainTextBody)}`;
  } else if (emails.length > 1) {
    const bccList = emails.map((e) => encodeURIComponent(e)).join(',');
    mailtoHref = `mailto:?bcc=${bccList}&subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(plainTextBody)}`;
  }

  return {
    emails,
    companyNames,
    subject,
    plainTextBody,
    mailtoHref,
  };
}

export function buildInterestMailto(
  job: JobPosting,
  member: DirectoryProfile,
  profileUrl: string,
  applicantEmail?: string,
  cvContext?: {
    vault?: PrivateVault | null;
    voyages?: VoyageRecord[];
    copCertificates?: CopCertificate[];
    cvPlainText?: string;
  }
): string | null {
  return buildJobApplicationPayload({
    job,
    member,
    profileUrl,
    applicantEmail,
    cvPlainText: cvContext?.cvPlainText,
    vault: cvContext?.vault,
    voyages: cvContext?.voyages,
    copCertificates: cvContext?.copCertificates,
  }).mailtoHref;
}

export function getInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'BM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function buildMemberMailtoHref(
  email: string | undefined,
  member?: Pick<DirectoryProfile, 'fullName' | 'cadetNumber'>
): string | null {
  const clean = (email ?? '').trim();
  if (!clean || !clean.includes('@')) return null;
  const subject = member
    ? `BMASA Member Contact — ${member.fullName} (${member.cadetNumber})`
    : 'BMASA Alumni Portal Contact';
  return `mailto:${encodeURIComponent(clean)}?subject=${encodeURIComponent(subject)}`;
}

export function buildMemberTelHref(phone: string | undefined): string | null {
  const clean = (phone ?? '').trim().replace(/[^\d+]/g, '');
  if (clean.length < 6) return null;
  return `tel:${clean}`;
}

export interface SummarizedCertItem {
  id: string;
  label: string;
  expiryDate: string;
  isCop: boolean;
  statusInfo: CertificateExpiryStatus;
}

export function summarizeMemberCertificates(
  vault: PrivateVault | null,
  copCertificates: CopCertificate[],
  todayIso?: string
): {
  items: SummarizedCertItem[];
  expiredCount: number;
  expiringSoonCount: number;
  validCount: number;
} {
  const coreItems: { id: string; label: string; expiryDate: string; isCop: boolean }[] = [
    { id: 'core_passport', label: 'Passport', expiryDate: vault?.passportExpiry ?? '', isCop: false },
    { id: 'core_cdc', label: 'CDC (Seaman Book)', expiryDate: vault?.cdcExpiry ?? '', isCop: false },
    { id: 'core_medical', label: 'Medical Fitness', expiryDate: vault?.medicalExpiry ?? '', isCop: false },
    { id: 'core_stcw', label: 'STCW / CoC', expiryDate: vault?.stcwCocExpiry ?? '', isCop: false },
  ];

  const copItems = copCertificates
    .filter((c) => Boolean(c.expiryDate || c.certNumber))
    .map((c) => ({
      id: c.id,
      label: c.title,
      expiryDate: c.expiryDate,
      isCop: true,
    }));

  const items: SummarizedCertItem[] = [...coreItems, ...copItems].map((entry) => ({
    ...entry,
    statusInfo: getCertificateExpiryStatus(entry.expiryDate, todayIso),
  }));

  return {
    items,
    expiredCount: items.filter((i) => i.statusInfo.status === 'Expired').length,
    expiringSoonCount: items.filter((i) => i.statusInfo.status === 'Expiring Soon').length,
    validCount: items.filter((i) => i.statusInfo.status === 'Valid').length,
  };
}

/**
 * Filters circulars by noticeType ('All' | 'Nautical' | 'Engineering' | 'General')
 * and sorts them cleanly by date, title, or notice type.
 */
export function sortAndFilterNotices(
  notices: NoticeItem[],
  options: { sortBy: NoticeSortOption; noticeType: NoticeTypeFilter }
): NoticeItem[] {
  const { sortBy, noticeType } = options;
  const filtered = notices.filter((item) => {
    const resolvedType: NoticeType = item.noticeType || 'General';
    return noticeType === 'All' || resolvedType === noticeType;
  });

  return [...filtered].sort((a, b) => {
    const aType: NoticeType = a.noticeType || 'General';
    const bType: NoticeType = b.noticeType || 'General';
    const aCreated = a.createdAt || '';
    const bCreated = b.createdAt || '';

    if (sortBy === 'oldest') {
      const dateCmp = aCreated.localeCompare(bCreated);
      if (dateCmp !== 0) return dateCmp;
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return a.title.localeCompare(b.title);
    }

    if (sortBy === 'title_asc') {
      const titleCmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      if (titleCmp !== 0) return titleCmp;
      return bCreated.localeCompare(aCreated);
    }

    if (sortBy === 'type') {
      const typeOrderDiff = NOTICE_TYPES.indexOf(aType) - NOTICE_TYPES.indexOf(bType);
      if (typeOrderDiff !== 0) return typeOrderDiff;
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return bCreated.localeCompare(aCreated);
    }

    // Default: 'newest' keeps pinned circulars at the top, then newest published first
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const dateCmp = bCreated.localeCompare(aCreated);
    if (dateCmp !== 0) return dateCmp;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

/**
 * Format signed decimal coordinates into classic maritime degrees + hemisphere readout.
 */
export function formatLatLongReadout(latitude: number, longitude: number): {
  latFormatted: string;
  lonFormatted: string;
  combined: string;
} {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  const latFormatted = `${Math.abs(latitude).toFixed(4)}° ${latDir}`;
  const lonFormatted = `${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
  return {
    latFormatted,
    lonFormatted,
    combined: `${latFormatted}, ${lonFormatted}`,
  };
}
