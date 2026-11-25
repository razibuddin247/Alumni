import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Check,
  Compass,
  Eye,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { useToast } from '../context/ToastContext';
import { useHistoryOverlay } from '../hooks/useHistoryOverlay';
import { MAIN_ADMIN_EMAIL } from '../firebase';
import {
  ADMIN_DELEGATION_ROLES,
  type DirectoryProfile,
  type PortalTab,
  type PrivateVault,
} from '../types/portal';
import { validateAdminEmailInput } from '../utils/validation';
import { AvatarPhoto } from './AvatarPhoto';
import { RankSelectField } from './RankSelectField';

interface AdminConsoleViewProps {
  onSelectTab: (tab: PortalTab) => void;
}

export function AdminConsoleView({ onSelectTab }: AdminConsoleViewProps) {
  const {
    isMainAdmin,
    isAdmin,
    directoryMembers,
    jobPostings,
    fundTransactions,
    bankAccounts,
    notices,
    admins,
    toggleMemberVerification,
    removeMember,
    adminInspectVault,
    addAdmin,
    removeAdmin,
    syncPublicStatsNow,
    syncDirectoryContacts,
  } = usePortal();
  const { showToast, updateToast } = useToast();

  const [memberSearch, setMemberSearch] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminLabel, setAdminLabel] = useState('');
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(
    null
  );
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [syncingStats, setSyncingStats] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);

  // 2-Step Verification Math Challenge Modal State (2 + 1 = ?)
  const [adminVerifyPrompt, setAdminVerifyPrompt] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathError, setMathError] = useState<string | null>(null);

  // Admin Inspect Vault Modal State
  const [inspectedMember, setInspectedMember] = useState<DirectoryProfile | null>(null);
  const [inspectedVault, setInspectedVault] = useState<PrivateVault | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const handleCloseInspectModal = useCallback(() => {
    setInspectedMember(null);
  }, []);

  useHistoryOverlay(inspectedMember !== null, 'bmasaVaultModal', handleCloseInspectModal);
  useHistoryOverlay(adminVerifyPrompt !== null, 'bmasaAdminVerifyModal', () => setAdminVerifyPrompt(null));

  const pendingMembers = useMemo(
    () => directoryMembers.filter((m) => !m.isVerified),
    [directoryMembers]
  );

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return directoryMembers
      .filter((m) => {
        if (!q) return true;
        return [m.fullName, m.cadetNumber, m.batch, m.department, m.currentRank]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (a.isVerified !== b.isVerified) return a.isVerified ? 1 : -1;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [directoryMembers, memberSearch]);

  if (!isAdmin) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center">
          <h1 className="font-display text-xl font-bold text-[#0A192F]">
            Administrator Access Required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This console is restricted strictly to verified BMASA administrators.
          </p>
        </div>
      </main>
    );
  }

  const handleInspectVault = async (member: DirectoryProfile) => {
    setInspectedMember(member);
    setInspectedVault(null);
    setInspectLoading(true);
    try {
      const vault = await adminInspectVault(member.uid);
      setInspectedVault(vault);
    } catch (err) {
      showToast(
        'error',
        'Unable to load private vault',
        err instanceof Error ? err.message : 'Check Firestore permissions.'
      );
    } finally {
      setInspectLoading(false);
    }
  };

  const executeToggleVerify = async (member: DirectoryProfile, nextVerified: boolean) => {
    const toastId = showToast(
      'loading',
      nextVerified ? `Verifying ${member.fullName}...` : `Revoking ${member.fullName}...`
    );
    try {
      await toggleMemberVerification(member.uid, nextVerified);
      if (inspectedMember?.uid === member.uid) {
        setInspectedMember({ ...member, isVerified: nextVerified });
      }
      updateToast(
        toastId,
        'success',
        nextVerified ? 'BMASA Member Verified' : 'Verification Revoked',
        `${member.fullName} (${member.cadetNumber})`
      );
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Verification failed',
        err instanceof Error ? err.message : 'Unable to update status.'
      );
    }
  };

  const handleToggleVerify = (member: DirectoryProfile, nextVerified: boolean) => {
    setMathAnswer('');
    setMathError(null);
    setAdminVerifyPrompt({
      title: nextVerified ? `Approve Member: ${member.fullName}` : `Revoke Verification: ${member.fullName}`,
      description: `To prevent accidental changes, please solve the security verification below (2 + 1).`,
      onConfirm: () => executeToggleVerify(member, nextVerified),
    });
  };

  const executeRemoveMember = async (uid: string, name: string) => {
    const toastId = showToast('loading', `Removing ${name}...`);
    try {
      await removeMember(uid);
      updateToast(toastId, 'success', 'Member removed', `${name} deleted from registry.`);
    } catch (err) {
      updateToast(toastId, 'error', 'Removal failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleRemoveMemberPrompt = (uid: string, name: string) => {
    setMathAnswer('');
    setMathError(null);
    setAdminVerifyPrompt({
      title: `Remove Member: ${name}`,
      description: `Warning: This action will permanently delete ${name} from the BMASA registry. Please solve 2 + 1 to confirm.`,
      onConfirm: () => executeRemoveMember(uid, name),
    });
  };

  const executeRemoveAdmin = async (adminId: string, email: string) => {
    const toastId = showToast('loading', `Removing admin ${email}...`);
    try {
      await removeAdmin(adminId);
      updateToast(toastId, 'success', 'Admin revoked', `${email} removed from administrator delegates.`);
    } catch (err) {
      updateToast(toastId, 'error', 'Action failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleRemoveAdminPrompt = (adminId: string, email: string) => {
    setMathAnswer('');
    setMathError(null);
    setAdminVerifyPrompt({
      title: `Revoke Admin Access: ${email}`,
      description: `Please solve 2 + 1 = ? to confirm revoking administrator privileges for ${email}.`,
      onConfirm: () => executeRemoveAdmin(adminId, email),
    });
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMathError(null);
    if (mathAnswer.trim() !== '3') {
      setMathError('Incorrect verification answer. Please solve 2 + 1 (answer is 3).');
      return;
    }
    const currentPrompt = adminVerifyPrompt;
    setAdminVerifyPrompt(null);
    if (currentPrompt?.onConfirm) {
      currentPrompt.onConfirm();
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFeedback(null);
    const result = validateAdminEmailInput({ email: adminEmail, displayName: adminLabel });
    setAdminErrors(result.errors);
    if (!result.valid) return;

    setAddingAdmin(true);
    const toastId = showToast('loading', 'Adding delegated administrator...');
    try {
      await addAdmin(adminEmail, adminLabel);
      setAdminEmail('');
      setAdminLabel('');
      setAdminErrors({});
      setAdminFeedback({
        type: 'ok',
        msg: 'Delegated administrator added. They gain full admin permissions upon verified Google sign-in.',
      });
      updateToast(toastId, 'success', 'Admin delegated', adminEmail);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to add administrator.';
      setAdminFeedback({ type: 'err', msg });
      updateToast(toastId, 'error', 'Delegation failed', msg);
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleSyncStats = async () => {
    setSyncingStats(true);
    const toastId = showToast('loading', 'Syncing public landing counters...');
    try {
      await syncPublicStatsNow();
      updateToast(toastId, 'success', 'Public counters synced', 'Landing page metrics updated.');
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Sync failed',
        err instanceof Error ? err.message : 'Unable to sync.'
      );
    } finally {
      setSyncingStats(false);
    }
  };

  const handleSyncContacts = async () => {
    setSyncingContacts(true);
    const toastId = showToast('loading', 'Syncing member phone & email contacts to directory...');
    try {
      const updated = await syncDirectoryContacts();
      updateToast(
        toastId,
        'success',
        'Directory contacts synced',
        updated > 0
          ? `Updated Call / Contact details for ${updated} member(s).`
          : 'All registered members already have up-to-date directory contacts.'
      );
    } catch (err) {
      updateToast(
        toastId,
        'error',
        'Contact sync failed',
        err instanceof Error ? err.message : 'Unable to sync member contacts.'
      );
    } finally {
      setSyncingContacts(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.12em] text-[#806127]">
            {isMainAdmin ? 'BMASA MAIN ADMINISTRATOR CONSOLE' : 'BMASA DELEGATED ADMINISTRATOR CONSOLE'}
          </p>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#0A192F]">
            Governance, Vault Verification &amp; Approvals
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={syncingContacts}
            onClick={handleSyncContacts}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
            {syncingContacts ? 'Syncing Contacts...' : 'Sync Directory Contacts'}
          </button>
          <button
            type="button"
            disabled={syncingStats}
            onClick={handleSyncStats}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingStats ? 'animate-spin' : ''}`} aria-hidden="true" />
            {syncingStats ? 'Syncing Stats...' : 'Sync Public Stats'}
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('community')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
            Notices &amp; Dhaka Office ({notices.length})
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('jobs')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
            Job Board ({jobPostings.length})
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('funds')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap"
          >
            <Landmark className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
            Bank &amp; Expenses ({fundTransactions.length})
          </button>
        </div>
      </div>

      {/* Executive Summary Bar */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0]">
        <div className="px-4 sm:px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Pending Approvals</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#0A192F] tabular-nums">
            {pendingMembers.length}
          </p>
        </div>
        <div className="px-4 sm:px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Total Registered Members</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#0A192F] tabular-nums">
            {directoryMembers.length}
          </p>
        </div>
        <div className="px-4 sm:px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Active Job Notices</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#0A192F] tabular-nums">
            {jobPostings.length}
          </p>
        </div>
        <div className="px-4 sm:px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Official Bank Accounts</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#0A192F] tabular-nums">
            {bankAccounts.length}
          </p>
        </div>
      </section>

      {/* Pending Registrations Queue */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0A192F]">
              Pending Registration Approvals ({pendingMembers.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Inspect private Passport &amp; CDC credentials before awarding the gold BMASA Verified Seal.
            </p>
          </div>
        </div>

        {pendingMembers.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No member registrations are currently awaiting verification.
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {pendingMembers.map((member) => (
              <li
                key={member.uid}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <AvatarPhoto
                    src={member.photoUrl}
                    name={member.fullName}
                    sizeClass="w-11 h-11"
                    roundedClass="rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-[#0A192F] truncate">
                      {member.fullName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 truncate">
                      <span className="font-mono font-medium text-[#0A192F]">
                        {member.cadetNumber}
                      </span>{' '}
                      · CDC: <span className="font-mono">{member.cdcNumber || 'N/A'}</span> ·{' '}
                      {member.department} · {member.batch}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleInspectVault(member)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                    Inspect Vault
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVerify(member, true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                    Approve Registration
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMemberPrompt(member.uid, member.fullName)}
                    aria-label={`Remove ${member.fullName}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Complete Member Verification Registry */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#0A192F]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-[#0A192F]">
              All Registered Members ({directoryMembers.length})
            </h2>
          </div>
          <div className="w-full sm:w-72">
            <label htmlFor="admin-member-search" className="sr-only">
              Search registered members
            </label>
            <input
              id="admin-member-search"
              type="search"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Filter by name, Cadet No., batch..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No matching members in registry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Member</th>
                  <th className="py-3 px-4">Cadet No.</th>
                  <th className="py-3 px-4">Department &amp; Batch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredMembers.map((member) => (
                  <tr key={member.uid} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-5">
                      <p className="font-display font-semibold text-[#0A192F]">{member.fullName}</p>
                      <p className="text-xs text-slate-500">{member.currentRank}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#0A192F] whitespace-nowrap">
                      {member.cadetNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {member.department} · {member.batch}
                    </td>
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      {member.isVerified ? (
                        <span className="font-medium text-emerald-700">Verified Member</span>
                      ) : (
                        <span className="font-medium text-amber-700">Pending Verification</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => handleInspectVault(member)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-[#0A192F] bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors"
                      >
                        Inspect Vault
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVerify(member, !member.isVerified)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors"
                      >
                        {member.isVerified ? 'Revoke' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMemberPrompt(member.uid, member.fullName)}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Main Admin Exclusively: Admin Access Registry */}
      {isMainAdmin && (
        <section className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
              MAIN ADMIN ACCESS CONTROL
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-[#0A192F]">
              Administrator Delegation Registry
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Main Admin{' '}
              <span className="font-mono font-semibold text-[#0A192F]">{MAIN_ADMIN_EMAIL}</span>{' '}
              holds permanent root governance and is the only account permitted to add or remove
              delegated administrators.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <form onSubmit={handleAddAdmin} noValidate className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div className="sm:col-span-5">
                <label htmlFor="admin-add-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Gmail Address *
                </label>
                <input
                  id="admin-add-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="delegate@gmail.com"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {adminErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{adminErrors.email}</p>
                )}
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="admin-add-label" className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Role / Designation
                </label>
                <RankSelectField
                  id="admin-add-label"
                  value={adminLabel}
                  onChange={setAdminLabel}
                  flatOptions={[
                    {
                      label: 'BMASA Delegated Admin Roles',
                      options: ADMIN_DELEGATION_ROLES,
                    },
                  ]}
                  placeholderOption="Select Admin Role (Optional)"
                  customPlaceholder="Enter custom role or label (e.g., Batch 3 Rep)"
                />
              </div>

              <div className="sm:col-span-3 sm:pt-5">
                <button
                  type="submit"
                  disabled={addingAdmin}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                  {addingAdmin ? 'Adding...' : 'Add Admin Gmail'}
                </button>
              </div>
            </form>

            {adminFeedback && (
              <div
                role="status"
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  adminFeedback.type === 'ok'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {adminFeedback.type === 'ok' ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <span>{adminFeedback.msg}</span>
              </div>
            )}

            <div className="border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0]">
              <div className="px-5 py-3.5 flex items-center justify-between gap-4 bg-[#F8FAFC]">
                <div>
                  <p className="font-mono text-xs font-semibold text-[#0A192F]">
                    {MAIN_ADMIN_EMAIL}
                  </p>
                  <p className="text-xs text-slate-500">Permanent Main Administrator</p>
                </div>
                <span className="font-mono text-[11px] font-semibold text-[#806127]">
                  ROOT ADMIN
                </span>
              </div>

              {admins.length === 0 ? (
                <div className="px-5 py-5 text-xs text-slate-500">
                  No delegated administrators added yet.
                </div>
              ) : (
                admins.map((entry) => (
                  <div
                    key={entry.id}
                    className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-[#0A192F]">
                        {entry.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.displayName || 'Delegated Administrator'} · Added by{' '}
                        {entry.addedByEmail}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdminPrompt(entry.id, entry.email)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors self-start sm:self-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Remove Admin
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Admin 2-Step Verification Modal (2 + 1 = ?) */}
      {adminVerifyPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-verify-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/75 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdminVerifyPrompt(null);
          }}
        >
          <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-4 h-4 text-[#806127] shrink-0" aria-hidden="true" />
                <h2 id="admin-verify-title" className="font-display text-base font-bold text-[#0A192F] truncate">
                  Security Verification Required
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAdminVerifyPrompt(null)}
                aria-label="Close security verification modal"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} noValidate className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <p className="font-display text-sm font-semibold text-[#0A192F]">
                  {adminVerifyPrompt.title}
                </p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {adminVerifyPrompt.description}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                <label htmlFor="math-challenge-input" className="block text-xs font-semibold text-[#0A192F]">
                  Security Challenge: What is <strong className="font-mono text-base text-[#806127]">2 + 1</strong>? *
                </label>
                <input
                  id="math-challenge-input"
                  type="number"
                  required
                  autoFocus
                  value={mathAnswer}
                  onChange={(e) => setMathAnswer(e.target.value)}
                  placeholder="Enter answer (e.g., 3)"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {mathError && (
                  <p role="alert" className="text-xs text-red-600 font-medium">
                    {mathError}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdminVerifyPrompt(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg shadow-sm"
                >
                  Confirm &amp; Proceed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Modal: Inspect Private Vault & Verify */}
      {inspectedMember && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vault-inspect-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedMember(null);
          }}
        >
          <div className="w-full max-w-xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-4 h-4 text-[#806127] shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-[#806127]">
                    ADMIN VERIFICATION VAULT
                  </p>
                  <h2 id="vault-inspect-title" className="font-display text-sm sm:text-base font-bold text-[#0A192F] truncate">
                    {inspectedMember.fullName} ({inspectedMember.cadetNumber})
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedMember(null)}
                aria-label="Close vault inspection modal"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <p className="text-slate-400 font-mono text-[10px]">CADET NO. / BATCH</p>
                  <p className="font-mono font-semibold text-[#0A192F] mt-0.5">
                    {inspectedMember.cadetNumber} · {inspectedMember.batch}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-mono text-[10px]">CDC NUMBER</p>
                  <p className="font-mono font-semibold text-[#0A192F] mt-0.5">
                    {inspectedMember.cdcNumber || 'Not Provided'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-mono text-[10px]">RANK / DEPARTMENT</p>
                  <p className="font-medium text-[#0A192F] mt-0.5">
                    {inspectedMember.currentRank} · {inspectedMember.department}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-mono text-[10px]">BLOOD / CITY</p>
                  <p className="font-medium text-[#0A192F] mt-0.5">
                    {inspectedMember.bloodGroup || '—'} · {[inspectedMember.city, inspectedMember.country].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              </div>

              {inspectLoading ? (
                <div className="py-6 text-center text-slate-500">
                  Decrypting &amp; loading member Private Vault...
                </div>
              ) : !inspectedVault ? (
                <div className="py-4 text-center text-slate-500">
                  No private vault details stored for this member yet.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                    <p className="font-mono text-[10px] font-semibold text-[#806127]">
                      ACADEMY, PASSPORT, CDC &amp; DIRECT CONTACT
                    </p>
                    <p>
                      <strong className="text-[#0A192F]">Academy:</strong>{' '}
                      <span>{inspectedVault.academyName || 'Bangladesh Marine Academy Sylhet'}</span>
                    </p>
                    <p>
                      <strong className="text-[#0A192F]">Passport Number:</strong>{' '}
                      <span className="font-mono font-semibold text-[#0A192F]">
                        {inspectedVault.passportNumber || 'Not Provided'}
                      </span>
                      {(inspectedVault.passportIssueDate || inspectedVault.passportExpiry) && (
                        <span className="ml-2 font-mono text-[11px] text-slate-600">
                          (Issue: {inspectedVault.passportIssueDate || '—'} · Exp: {inspectedVault.passportExpiry || '—'})
                        </span>
                      )}
                    </p>
                    {(inspectedVault.cdcIssueDate || inspectedVault.cdcExpiry) && (
                      <p>
                        <strong className="text-[#0A192F]">CDC Validity:</strong>{' '}
                        <span className="font-mono text-[11px] text-slate-600">
                          Issue: {inspectedVault.cdcIssueDate || '—'} · Exp: {inspectedVault.cdcExpiry || '—'}
                        </span>
                      </p>
                    )}
                    <p>
                      <strong className="text-[#0A192F]">Email:</strong>{' '}
                      <span className="font-mono">{inspectedVault.email || '—'}</span>
                    </p>
                    <p>
                      <strong className="text-[#0A192F]">Phone / WhatsApp:</strong>{' '}
                      <span className="font-mono">
                        {inspectedVault.whatsapp || inspectedVault.phone || '—'}
                      </span>
                    </p>
                    {inspectedVault.academicQualifications?.length > 0 && (
                      <div className="pt-2 border-t border-[#E2E8F0]">
                        <p className="font-mono text-[10px] font-semibold text-[#806127] mb-1">
                          ACADEMIC QUALIFICATIONS
                        </p>
                        <ul className="space-y-1 text-[11px] text-slate-700">
                          {inspectedVault.academicQualifications.map((q) => (
                            <li key={q.id}>
                              <strong>{q.level}:</strong>{' '}
                              {[q.institution, q.boardOrUniversity, q.passingYear, q.result]
                                .filter(Boolean)
                                .join(' · ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {(inspectedVault.bankName || inspectedVault.mfsNumber) && (
                    <div className="p-4 rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <p className="font-mono text-[10px] font-semibold text-[#806127]">
                        CONFIDENTIAL WELFARE BANK / MFS
                      </p>
                      {inspectedVault.bankName && (
                        <p>
                          <strong>Bank:</strong> {inspectedVault.bankName} ({inspectedVault.bankBranch || 'Branch N/A'})
                        </p>
                      )}
                      {inspectedVault.bankAccountNumber && (
                        <p className="font-mono">
                          <strong>A/C:</strong> {inspectedVault.bankAccountHolder} · {inspectedVault.bankAccountNumber}
                        </p>
                      )}
                      {inspectedVault.mfsNumber && (
                        <p className="font-mono">
                          <strong>bKash / Nagad:</strong> {inspectedVault.mfsNumber}
                        </p>
                      )}
                    </div>
                  )}

                  {inspectedVault.nokName && (
                    <div className="p-4 rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <p className="font-mono text-[10px] font-semibold text-[#806127]">
                        EMERGENCY NEXT-OF-KIN (NOK)
                      </p>
                      <p>
                        <strong>{inspectedVault.nokName}</strong> ({inspectedVault.nokRelation || 'NOK'}) ·{' '}
                        <span className="font-mono">{inspectedVault.nokPhone}</span>{' '}
                        {inspectedVault.nokCity ? `(${inspectedVault.nokCity})` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setInspectedMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectedMember(null);
                  handleToggleVerify(inspectedMember, !inspectedMember.isVerified);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg"
              >
                <ShieldCheck className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
                {inspectedMember.isVerified ? 'Revoke Verification' : 'Approve & Verify Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
