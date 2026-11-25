import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Droplets,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { useToast } from '../context/ToastContext';
import { useHistoryOverlay } from '../hooks/useHistoryOverlay';
import {
  AVAILABILITY_STATUSES,
  BLOOD_GROUPS,
  BMAS_BATCHES,
  MARITIME_RANK_GROUPS,
  type AvailabilityStatus,
  type BloodGroup,
  type Department,
  type DirectoryFilters,
  type DirectoryProfile,
} from '../types/portal';
import {
  buildMemberMailtoHref,
  buildMemberTelHref,
  cleanBatchLabel,
  filterDirectoryMembers,
} from '../utils/portalLogic';
import { AvatarPhoto } from './AvatarPhoto';
import { MemberDetailModal } from './MemberDetailModal';

const INITIAL_FILTERS: DirectoryFilters = {
  query: '',
  batch: 'All',
  department: 'All',
  rank: 'All',
  availability: 'All',
  bloodGroup: 'All',
  city: '',
};

const AVAILABILITY_TEXT_STYLES: Record<AvailabilityStatus, string> = {
  'Available for Sea': 'text-emerald-700 font-semibold',
  Onboard: 'text-[#0A192F] font-medium',
  'On Leave': 'text-amber-700 font-medium',
  'Shore-Based': 'text-slate-600 font-medium',
};

export function DirectoryView() {
  const {
    directoryMembers,
    isAdmin,
    toggleMemberVerification,
  } = usePortal();

  const { showToast } = useToast();

  const [filters, setFilters] = useState<DirectoryFilters>(INITIAL_FILTERS);
  const [selectedMemberUid, setSelectedMemberUid] = useState<string | null>(null);
  const [expandedContactUid, setExpandedContactUid] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCloseMemberModal = useCallback(() => {
    setSelectedMemberUid(null);
  }, []);

  useHistoryOverlay(selectedMemberUid !== null, 'bmasaMemberModal', handleCloseMemberModal);

  const handleCopyValue = async (key: string, value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    showToast('success', `${label} copied`, value);
    window.setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const customRanks = useMemo(() => {
    const known = new Set<string>(MARITIME_RANK_GROUPS.flatMap((g) => g.ranks));
    const extras = new Set(
      directoryMembers
        .map((m) => m.currentRank)
        .filter((rank): rank is string => Boolean(rank) && !known.has(rank))
    );
    return Array.from(extras).sort((a, b) => a.localeCompare(b));
  }, [directoryMembers]);

  const filteredMembers = useMemo(
    () => filterDirectoryMembers(directoryMembers, filters),
    [directoryMembers, filters]
  );

  const selectedMember: DirectoryProfile | null = useMemo(
    () => directoryMembers.find((m) => m.uid === selectedMemberUid) ?? null,
    [directoryMembers, selectedMemberUid]
  );

  const hasActiveFilters =
    filters.query !== '' ||
    filters.batch !== 'All' ||
    filters.department !== 'All' ||
    filters.rank !== 'All' ||
    filters.availability !== 'All' ||
    (filters.bloodGroup && filters.bloodGroup !== 'All') ||
    Boolean(filters.city);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="font-mono text-xs tracking-[0.12em] text-[#806127]">
            BMASA SEAFARER REGISTRY &amp; EMERGENCY BLOOD FINDER
          </p>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#0A192F]">
            Alumni &amp; Cadet Directory
          </h1>
        </div>
        <p className="font-mono text-xs text-slate-500 tabular-nums">
          Showing <strong className="text-[#0A192F]">{filteredMembers.length}</strong> of{' '}
          {directoryMembers.length} registered members
        </p>
      </div>

      {/* Filter Toolbar */}
      <section
        aria-label="Directory search and filters"
        className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 mb-6 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Instant Search */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="dir-search" className="sr-only">
              Search by name, Cadet Number, CDC Number, Rank, or City
            </label>
            <input
              id="dir-search"
              type="search"
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
              placeholder="Search by Name, Cadet No. (BMAS-04...), CDC No., Rank, or City"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
            />
          </div>

          {/* Department Segmented Control */}
          <div
            role="group"
            aria-label="Filter by department"
            className="w-full lg:w-auto inline-flex flex-wrap sm:flex-nowrap p-1 bg-slate-100 rounded-lg self-start lg:self-auto gap-1"
          >
            {(['All', 'Nautical', 'Marine Engineering', 'Instructors'] as const).map((dept) => {
              const active = filters.department === dept;
              return (
                <button
                  key={dept}
                  type="button"
                  data-testid={`dir-dept-${dept.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() =>
                    setFilters((f) => ({ ...f, department: dept as 'All' | Department }))
                  }
                  className={`flex-1 sm:flex-initial min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#0A192F] shadow-xs'
                      : 'text-slate-600 hover:text-[#0A192F]'
                  }`}
                >
                  {dept === 'All' ? 'All Branches' : dept}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Select Filters + Emergency Blood Donor & City Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
          <div>
            <label htmlFor="dir-batch" className="block text-[11px] font-semibold text-slate-500 mb-1">
              Batch / Intake
            </label>
            <select
              id="dir-batch"
              value={filters.batch}
              onChange={(e) => setFilters((f) => ({ ...f, batch: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
            >
              <option value="All">All Batches</option>
              {BMAS_BATCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dir-rank" className="block text-[11px] font-semibold text-slate-500 mb-1">
              Rank / Designation
            </label>
            <select
              id="dir-rank"
              value={filters.rank}
              onChange={(e) => setFilters((f) => ({ ...f, rank: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
            >
              <option value="All">All Ranks &amp; Roles</option>
              {MARITIME_RANK_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.ranks.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </optgroup>
              ))}
              {customRanks.length > 0 && (
                <optgroup label="Other Recorded Ranks">
                  {customRanks.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="dir-availability"
              className="block text-[11px] font-semibold text-slate-500 mb-1"
            >
              Availability
            </label>
            <select
              id="dir-availability"
              value={filters.availability}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  availability: e.target.value as 'All' | AvailabilityStatus,
                }))
              }
              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
            >
              <option value="All">Any Availability</option>
              {AVAILABILITY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dir-blood"
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 mb-1"
            >
              <Droplets className="w-3 h-3" aria-hidden="true" />
              Blood Donor Group
            </label>
            <select
              id="dir-blood"
              value={filters.bloodGroup ?? 'All'}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  bloodGroup: e.target.value as 'All' | BloodGroup,
                }))
              }
              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
            >
              <option value="All">All Blood Groups</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dir-city"
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1"
            >
              <MapPin className="w-3 h-3" aria-hidden="true" />
              City / Port
            </label>
            <input
              id="dir-city"
              type="text"
              value={filters.city ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              placeholder="e.g., Sylhet, Dhaka"
              className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-[#CBD5E1] hover:border-[#0A192F] hover:text-[#0A192F] disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset Filters
            </button>
          </div>
        </div>
      </section>

      {/* Member Directory Grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-12 text-center">
          <p className="font-display text-base font-semibold text-[#0A192F]">
            No matching alumni or cadets found
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            Adjust your search query or clear filters to browse all registered BMASA members.
          </p>
          <button
            type="button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div
          data-testid="directory-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start"
        >
          {filteredMembers.map((member, index) => {
            const isContactOpen = expandedContactUid === member.uid;
            const telHref = buildMemberTelHref(member.contactPhone);
            const mailHref = buildMemberMailtoHref(member.contactEmail, member);
            const phoneCopyKey = `${member.uid}_phone`;
            const emailCopyKey = `${member.uid}_email`;

            return (
              <motion.article
                key={member.uid}
                initial={{ opacity: 0, y: 30, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.08 }}
                transition={{
                  duration: 0.45,
                  delay: Math.min((index % 6) * 0.06, 0.3),
                  ease: [0.22, 1, 0.36, 1],
                }}
                aria-label={`BMASA member card for ${member.fullName}`}
                className="group bg-white border border-[#E2E8F0] hover:border-[#806127]/70 rounded-xl p-4 sm:p-5 transition-all flex flex-col justify-between shadow-xs md:hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="w-full">
                  <div className="flex items-start gap-3.5">
                    <AvatarPhoto
                      src={member.photoUrl}
                      name={member.fullName}
                      sizeClass="w-13 h-13"
                      roundedClass="rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h2 className="font-display text-base font-semibold text-[#0A192F] group-hover:text-[#1D3458] truncate">
                            {member.fullName}
                          </h2>
                          {member.isVerified && (
                            <ShieldCheck
                              className="w-4 h-4 text-[#9E7B39] shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        {member.bloodGroup && (
                          <span
                            title="Blood Group"
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 font-mono text-[11px] font-bold text-rose-700 shrink-0"
                          >
                            {member.bloodGroup}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-slate-700 truncate">
                        {member.currentRank}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 truncate">
                        {member.department === 'Instructors'
                          ? `Academy Instructor · ${cleanBatchLabel(member.batch)}`
                          : `${member.department} · ${cleanBatchLabel(member.batch)}`}
                      </p>
                      {(member.city || member.country) && (
                        <p className="inline-flex items-center gap-1 mt-1 text-[11px] text-slate-500 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                          {[member.city, member.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unboxed tabular key-value row */}
                  <dl className="mt-4 pt-4 border-t border-[#E2E8F0] grid grid-cols-2 gap-3">
                    <div>
                      <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                        {member.department === 'Instructors' ? 'FACULTY ID' : 'CADET NO.'}
                      </dt>
                      <dd className="mt-0.5 font-mono text-xs font-medium text-[#0A192F] truncate">
                        {member.cadetNumber || (member.department === 'Instructors' ? 'BMAS-INST' : '—')}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                        {member.department === 'Instructors' ? 'ROLE / STATUS' : 'CDC NUMBER'}
                      </dt>
                      <dd className="mt-0.5 font-mono text-xs font-medium text-slate-700 truncate">
                        {member.department === 'Instructors'
                          ? member.cdcNumber || 'BMAS Faculty'
                          : member.cdcNumber || 'Pending'}
                      </dd>
                    </div>
                    {member.department !== 'Instructors' && (
                      <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between gap-2">
                        <dt className="font-mono text-[10px] tracking-wider text-slate-400">
                          SID CARD NO.
                        </dt>
                        <dd className="font-mono text-xs font-medium text-slate-700 truncate">
                          {member.sidNumber || 'Pending'}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {member.additionalInfo && (
                    <p className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-2 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2">
                      {member.additionalInfo}
                    </p>
                  )}
                </div>

                <div className="w-full mt-4 pt-3 border-t border-[#E2E8F0] space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={AVAILABILITY_TEXT_STYLES[member.availabilityStatus]}>
                      {member.availabilityStatus}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        data-testid="member-contact-btn"
                        aria-expanded={isContactOpen}
                        aria-label={`Call or contact ${member.fullName}`}
                        onClick={() =>
                          setExpandedContactUid((curr) =>
                            curr === member.uid ? null : member.uid
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F] ${
                          isContactOpen
                            ? 'bg-[#0A192F] border-[#0A192F] text-[#E5C787]'
                            : 'bg-white border-[#CBD5E1] text-[#0A192F] hover:border-[#0A192F] hover:bg-slate-50'
                        }`}
                      >
                        <Phone
                          className={`w-3 h-3 ${isContactOpen ? 'text-[#E5C787]' : 'text-[#806127]'}`}
                          aria-hidden="true"
                        />
                        <span>Call / Contact</span>
                        {isContactOpen ? (
                          <ChevronUp className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-3 h-3" aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedMemberUid(member.uid)}
                        className="px-2.5 py-1.5 rounded-lg text-[#0A192F] hover:bg-[#0A192F]/5 font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A192F]"
                      >
                        View Credential →
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isContactOpen && (
                      <motion.div
                        key="contact-panel"
                        data-testid="member-contact-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#C5A059]/45 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] tracking-wider text-slate-400">
                                PHONE / WHATSAPP
                              </p>
                              <p
                                data-testid="contact-phone-value"
                                className="font-mono text-xs font-semibold text-[#0A192F] truncate select-all"
                              >
                                {member.contactPhone || 'Not provided yet'}
                              </p>
                            </div>
                            {member.contactPhone && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyValue(
                                      phoneCopyKey,
                                      member.contactPhone!,
                                      'Phone number'
                                    )
                                  }
                                  aria-label={`Copy phone number for ${member.fullName}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#CBD5E1] bg-white text-[11px] font-semibold text-slate-700 hover:border-[#0A192F] hover:text-[#0A192F] transition-colors"
                                >
                                  {copiedKey === phoneCopyKey ? (
                                    <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                                  ) : (
                                    <Copy className="w-3 h-3" aria-hidden="true" />
                                  )}
                                  <span>{copiedKey === phoneCopyKey ? 'Copied' : 'Copy'}</span>
                                </button>
                                {telHref && (
                                  <a
                                    href={telHref}
                                    data-testid="member-call-link"
                                    aria-label={`Call ${member.fullName} at ${member.contactPhone}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0A192F] hover:bg-[#112240] text-white text-[11px] font-semibold transition-colors whitespace-nowrap"
                                  >
                                    <Phone className="w-3 h-3 text-[#D8B979]" aria-hidden="true" />
                                    Call
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] tracking-wider text-slate-400">
                                EMAIL ADDRESS
                              </p>
                              <p
                                data-testid="contact-email-value"
                                className="font-mono text-xs font-medium text-[#0A192F] break-words select-all"
                              >
                                {member.contactEmail || 'Not provided yet'}
                              </p>
                            </div>
                            {member.contactEmail && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyValue(
                                      emailCopyKey,
                                      member.contactEmail!,
                                      'Email address'
                                    )
                                  }
                                  aria-label={`Copy email address for ${member.fullName}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#CBD5E1] bg-white text-[11px] font-semibold text-slate-700 hover:border-[#0A192F] hover:text-[#0A192F] transition-colors"
                                >
                                  {copiedKey === emailCopyKey ? (
                                    <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                                  ) : (
                                    <Copy className="w-3 h-3" aria-hidden="true" />
                                  )}
                                  <span>{copiedKey === emailCopyKey ? 'Copied' : 'Copy'}</span>
                                </button>
                                {mailHref && (
                                  <a
                                    href={mailHref}
                                    data-testid="member-mail-link"
                                    aria-label={`Email ${member.fullName} at ${member.contactEmail}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#0A192F] text-[#0A192F] hover:bg-slate-50 text-[11px] font-semibold transition-colors whitespace-nowrap"
                                  >
                                    <Mail className="w-3 h-3 text-[#806127]" aria-hidden="true" />
                                    Mail
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <MemberDetailModal
        member={selectedMember}
        isAdmin={isAdmin}
        onClose={() => setSelectedMemberUid(null)}
        onToggleVerify={toggleMemberVerification}
      />
    </main>
  );
}
