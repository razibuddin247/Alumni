import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Edit2,
  Eye,
  FileImage,
  Landmark,
  ListChecks,
  Plus,
  Receipt,
  Search,
  Send,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { useToast } from '../context/ToastContext';
import { useHistoryOverlay } from '../hooks/useHistoryOverlay';
import {
  BANK_ACCOUNT_TYPES,
  BANK_CURRENCIES,
  FUND_CATEGORIES,
  FUND_PAYMENT_METHODS,
  type BankAccount,
  type BankAccountType,
  type BankCurrency,
  type FundCategory,
  type FundEntryType,
  type FundPaymentMethod,
  type FundTransaction,
  type MemberFundSummary,
  type PaymentSubmission,
} from '../types/portal';
import { compressReceiptFile } from '../utils/imageCompression';
import {
  buildMemberFundSummaries,
  computeFundTotals,
  formatBdtAmount,
  formatTransactionDateTime,
} from '../utils/portalLogic';
import {
  validateBankAccountInput,
  validateFundTransactionInput,
  validatePaymentSubmissionInput,
  type BankAccountFormInput,
  type FundTransactionFormInput,
  type PaymentSubmissionFormInput,
} from '../utils/validation';
import { TreasuryCharts } from './TreasuryCharts';

function getCurrentLocalDateTimeInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

const EMPTY_BANK_FORM: BankAccountFormInput = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  branchName: '',
  routingNumber: '',
  accountType: 'Bank Account',
  currency: 'BDT',
  notes: '',
};

const CATEGORY_DESCRIPTIONS: Record<FundCategory, string> = {
  'Monthly Subscription': 'Recurring monthly alumni dues',
  'Annual Membership Fee': 'Yearly BMASA membership renewal',
  'Welfare Fund': 'Cadet & mariner emergency welfare',
  'Cadet Support': 'Training & placement assistance',
  'Dhaka Office Fund': 'Permanent Dhaka office milestone',
  'Event / Reunion': 'Annual gatherings & academy reunions',
  'Operational Expense': 'Receipted association disbursements',
  Other: 'General contributions & miscellaneous',
};

const MEMBER_PAYMENT_CATEGORIES: Array<Exclude<FundCategory, 'Operational Expense'>> = [
  'Monthly Subscription',
  'Annual Membership Fee',
  'Welfare Fund',
  'Cadet Support',
  'Dhaka Office Fund',
  'Event / Reunion',
  'Other',
];

function makeEmptyFundForm(
  entryType: FundEntryType = 'contribution',
  category?: FundCategory
): FundTransactionFormInput {
  return {
    memberUid: '',
    memberName: '',
    memberCadetNumber: '',
    memberBatch: '',
    entryType,
    amount: '',
    category: category ?? (entryType === 'disbursement' ? 'Operational Expense' : 'Monthly Subscription'),
    paymentMethod: 'Bank Transfer',
    bankAccountLabel: '',
    referenceNumber: '',
    transactionDateTime: getCurrentLocalDateTimeInput(),
    notes: '',
    receiptDataUrl: '',
  };
}

function makeEmptyMemberPayForm(
  accounts: BankAccount[],
  category: Exclude<FundCategory, 'Operational Expense'> = 'Monthly Subscription'
): PaymentSubmissionFormInput {
  return {
    amount: '',
    category,
    paymentMethod: 'Bank Transfer',
    bankAccountLabel:
      accounts.length > 0 ? `${accounts[0].bankName} (${accounts[0].accountNumber})` : '',
    referenceNumber: '',
    transactionDateTime: getCurrentLocalDateTimeInput(),
    notes: '',
    receiptDataUrl: '',
  };
}

interface ReceiptPreviewItem {
  title: string;
  amount: number;
  transactionDateTime: string;
  category: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  recordedByName?: string;
  updatedByName?: string;
  receiptDataUrl: string;
}

type TreasuryWorkspaceTab = 'categories' | 'accounts' | 'ledger';

export function BankFundView() {
  const {
    isAdmin,
    currentUserProfile,
    directoryMembers,
    bankAccounts,
    fundTransactions,
    paymentSubmissions,
    saveBank,
    removeBank,
    saveFundEntry,
    removeFundEntry,
    submitMemberPaymentRequest,
    approvePaymentRequest,
    rejectPaymentRequest,
  } = usePortal();
  const { showToast, updateToast } = useToast();

  const [workspaceTab, setWorkspaceTab] = useState<TreasuryWorkspaceTab>('categories');
  const [selectedCategory, setSelectedCategory] = useState<FundCategory | null>(null);

  // Category Details Modal State
  const [detailsCategoryTarget, setDetailsCategoryTarget] = useState<FundCategory | null>(null);
  const [detailsSubTab, setDetailsSubTab] = useState<'members' | 'transactions'>('members');
  const [detailsSearch, setDetailsSearch] = useState('');
  const [detailsIncludeZeroMembers, setDetailsIncludeZeroMembers] = useState(true);

  // Member Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);

  const [memberSearch, setMemberSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | FundEntryType>('all');
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const memberReceiptInputRef = useRef<HTMLInputElement | null>(null);

  // Receipt Preview Lightbox Modal
  const [previewReceiptItem, setPreviewReceiptItem] = useState<ReceiptPreviewItem | null>(null);

  const handleCloseReceiptModal = useCallback(() => {
    setPreviewReceiptItem(null);
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setDetailsCategoryTarget(null);
  }, []);

  const handleClosePayModal = useCallback(() => {
    setPayModalOpen(false);
  }, []);

  useHistoryOverlay(previewReceiptItem !== null, 'bmasaReceiptModal', handleCloseReceiptModal);
  useHistoryOverlay(detailsCategoryTarget !== null, 'bmasaCategoryDetailsModal', handleCloseDetailsModal);
  useHistoryOverlay(payModalOpen, 'bmasaMemberPayModal', handleClosePayModal);

  // Member Payment Submission Form State
  const [payForm, setPayForm] = useState<PaymentSubmissionFormInput>(() =>
    makeEmptyMemberPayForm(bankAccounts)
  );
  const [payErrors, setPayErrors] = useState<Record<string, string>>({});
  const [payFormError, setPayFormError] = useState<string | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Admin Review State
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);

  // Admin Bank Modal State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState<BankAccountFormInput>(EMPTY_BANK_FORM);
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankFormError, setBankFormError] = useState<string | null>(null);

  const handleCloseBankModal = useCallback(() => {
    setBankModalOpen(false);
  }, []);

  useHistoryOverlay(bankModalOpen && isAdmin, 'bmasaBankModal', handleCloseBankModal);

  // Admin Transaction Modal State
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [fundForm, setFundForm] = useState<FundTransactionFormInput>(() => makeEmptyFundForm());
  const [fundErrors, setFundErrors] = useState<Record<string, string>>({});
  const [fundSubmitting, setFundSubmitting] = useState(false);
  const [fundFormError, setFundFormError] = useState<string | null>(null);

  const handleCloseFundModal = useCallback(() => {
    setFundModalOpen(false);
  }, []);

  useHistoryOverlay(fundModalOpen && isAdmin, 'bmasaFundModal', handleCloseFundModal);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (previewReceiptItem) setPreviewReceiptItem(null);
      else if (payModalOpen) setPayModalOpen(false);
      else if (detailsCategoryTarget) setDetailsCategoryTarget(null);
      else if (fundModalOpen) setFundModalOpen(false);
      else if (bankModalOpen) setBankModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewReceiptItem, payModalOpen, detailsCategoryTarget, fundModalOpen, bankModalOpen]);

  const totals = useMemo(() => computeFundTotals(fundTransactions), [fundTransactions]);

  const pendingSubmissions = useMemo(
    () => paymentSubmissions.filter((s) => s.status === 'pending'),
    [paymentSubmissions]
  );

  const mySubmissions = useMemo(() => {
    if (!currentUserProfile) return paymentSubmissions;
    return paymentSubmissions.filter((s) => s.memberUid === currentUserProfile.uid);
  }, [paymentSubmissions, currentUserProfile]);

  const memberSummaries = useMemo(
    () => buildMemberFundSummaries(directoryMembers, fundTransactions),
    [directoryMembers, fundTransactions]
  );

  // Per-Category Aggregated Cards Data
  const categoryStats = useMemo(() => {
    const maxVolume = Math.max(
      1,
      ...FUND_CATEGORIES.map((cat) =>
        fundTransactions
          .filter((tx) => tx.category === cat)
          .reduce((sum, tx) => sum + tx.amount, 0)
      )
    );

    return FUND_CATEGORIES.map((category) => {
      const catTxs = fundTransactions.filter((tx) => tx.category === category);
      const collected = catTxs
        .filter((tx) => tx.entryType === 'contribution')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const disbursed = catTxs
        .filter((tx) => tx.entryType === 'disbursement')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const contributorKeys = new Set<string>();
      let latestDateTime: string | null = null;
      for (const tx of catTxs) {
        if (tx.entryType === 'contribution') {
          const key = tx.memberUid || tx.memberCadetNumber || tx.memberName.toLowerCase();
          if (key) contributorKeys.add(key);
        }
        if (!latestDateTime || tx.transactionDateTime > latestDateTime) {
          latestDateTime = tx.transactionDateTime;
        }
      }

      const primaryAmount = category === 'Operational Expense' ? disbursed : collected;
      const totalActivity = collected + disbursed;
      const sharePct = Math.round((totalActivity / maxVolume) * 100);

      return {
        category,
        description: CATEGORY_DESCRIPTIONS[category],
        collected,
        disbursed,
        primaryAmount,
        entryCount: catTxs.length,
        contributorCount: contributorKeys.size,
        latestDateTime,
        sharePct,
      };
    });
  }, [fundTransactions]);

  // Category Details Modal Data (Everyone's contributions for the selected category)
  const categoryDetailsData = useMemo(() => {
    if (!detailsCategoryTarget) return null;
    const catTxs = fundTransactions
      .filter((tx) => tx.category === detailsCategoryTarget)
      .sort((a, b) => b.transactionDateTime.localeCompare(a.transactionDateTime));

    const summaries = buildMemberFundSummaries(directoryMembers, catTxs);
    const q = detailsSearch.trim().toLowerCase();

    const filteredMembers = summaries.filter((row) => {
      if (!detailsIncludeZeroMembers && row.contributionCount === 0) return false;
      if (!q) return true;
      return [row.memberName, row.cadetNumber, row.batch, row.department]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    const filteredTxs = catTxs.filter((tx) => {
      if (!q) return true;
      return [
        tx.memberName,
        tx.memberCadetNumber,
        tx.paymentMethod,
        tx.referenceNumber,
        tx.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    const collected = catTxs
      .filter((tx) => tx.entryType === 'contribution')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const disbursed = catTxs
      .filter((tx) => tx.entryType === 'disbursement')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const contributorCount = summaries.filter((s) => s.contributionCount > 0).length;

    return {
      category: detailsCategoryTarget,
      collected,
      disbursed,
      contributorCount,
      totalEntries: catTxs.length,
      filteredMembers,
      filteredTxs,
    };
  }, [
    detailsCategoryTarget,
    fundTransactions,
    directoryMembers,
    detailsSearch,
    detailsIncludeZeroMembers,
  ]);

  const filteredMemberSummaries = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return memberSummaries;
    return memberSummaries.filter((row) =>
      [row.memberName, row.cadetNumber, row.batch, row.department]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [memberSummaries, memberSearch]);

  const expenseTransactions = useMemo(
    () => fundTransactions.filter((tx) => tx.entryType === 'disbursement'),
    [fundTransactions]
  );

  const filteredTransactions = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return fundTransactions.filter((tx) => {
      if (ledgerTypeFilter !== 'all' && tx.entryType !== ledgerTypeFilter) return false;
      if (!q) return true;
      return [
        tx.memberName,
        tx.memberCadetNumber,
        tx.category,
        tx.paymentMethod,
        tx.bankAccountLabel,
        tx.referenceNumber,
        tx.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [fundTransactions, ledgerSearch, ledgerTypeFilter]);

  const openReceiptPreview = (tx: FundTransaction) => {
    setPreviewReceiptItem({
      title: `${tx.memberName} · ${formatBdtAmount(tx.amount)}`,
      amount: tx.amount,
      transactionDateTime: tx.transactionDateTime,
      category: tx.category,
      paymentMethod: tx.paymentMethod,
      referenceNumber: tx.referenceNumber,
      notes: tx.notes,
      recordedByName: tx.recordedByName,
      updatedByName: tx.updatedByName,
      receiptDataUrl: tx.receiptDataUrl,
    });
  };

  const openSubmissionPreview = (sub: PaymentSubmission) => {
    setPreviewReceiptItem({
      title: `${sub.memberName} (${sub.memberCadetNumber}) · ${formatBdtAmount(sub.amount)}`,
      amount: sub.amount,
      transactionDateTime: sub.transactionDateTime,
      category: sub.category,
      paymentMethod: sub.paymentMethod,
      referenceNumber: sub.referenceNumber,
      notes: sub.notes,
      recordedByName: sub.reviewedByName || undefined,
      receiptDataUrl: sub.receiptDataUrl,
    });
  };

  const handleCopyAccount = async (account: BankAccount) => {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = account.accountNumber;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedBankId(account.id);
    showToast('success', 'Account number copied', account.accountNumber);
    window.setTimeout(() => {
      setCopiedBankId((curr) => (curr === account.id ? null : curr));
    }, 2400);
  };

  const openNewBankModal = () => {
    setEditingBankId(null);
    setBankForm(EMPTY_BANK_FORM);
    setBankErrors({});
    setBankFormError(null);
    setBankModalOpen(true);
  };

  const openEditBankModal = (account: BankAccount) => {
    setEditingBankId(account.id);
    setBankForm({
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      branchName: account.branchName,
      routingNumber: account.routingNumber,
      accountType: account.accountType,
      currency: account.currency,
      notes: account.notes,
    });
    setBankErrors({});
    setBankFormError(null);
    setBankModalOpen(true);
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankFormError(null);
    const result = validateBankAccountInput(bankForm);
    setBankErrors(result.errors);
    if (!result.valid) {
      setBankFormError('Please correct the highlighted bank account fields.');
      return;
    }
    setBankSubmitting(true);
    const toastId = showToast('loading', 'Saving official bank account...');
    try {
      await saveBank(bankForm, editingBankId ?? undefined);
      setBankModalOpen(false);
      updateToast(toastId, 'success', 'Bank account published', bankForm.bankName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save bank account.';
      setBankFormError(msg);
      updateToast(toastId, 'error', 'Save failed', msg);
    } finally {
      setBankSubmitting(false);
    }
  };

  const openNewFundModal = (
    prefillMember?: MemberFundSummary,
    entryType: FundEntryType = 'contribution',
    category?: FundCategory
  ) => {
    setEditingTxId(null);
    const base = makeEmptyFundForm(entryType, category);
    if (prefillMember) {
      base.memberUid = prefillMember.memberUid;
      base.memberName = prefillMember.memberName;
      base.memberCadetNumber =
        prefillMember.cadetNumber === '—' ? '' : prefillMember.cadetNumber;
      base.memberBatch = prefillMember.batch === '—' ? '' : prefillMember.batch;
    }
    if (bankAccounts.length > 0) {
      base.bankAccountLabel = `${bankAccounts[0].bankName} (${bankAccounts[0].accountNumber})`;
    }
    setFundForm(base);
    setFundErrors({});
    setFundFormError(null);
    setFundModalOpen(true);
  };

  const openMemberPayModalForCategory = (category?: FundCategory) => {
    const validCat: Exclude<FundCategory, 'Operational Expense'> =
      category && category !== 'Operational Expense' ? category : 'Monthly Subscription';
    setPayForm(makeEmptyMemberPayForm(bankAccounts, validCat));
    setPayErrors({});
    setPayFormError(null);
    setPayModalOpen(true);
  };

  const handleCategoryAddPayment = (category: FundCategory) => {
    if (isAdmin && category === 'Operational Expense') {
      openNewFundModal(undefined, 'disbursement', 'Operational Expense');
      return;
    }
    if (isAdmin) {
      openNewFundModal(undefined, 'contribution', category);
      return;
    }
    openMemberPayModalForCategory(category);
  };

  const openCategoryDetails = (category: FundCategory) => {
    setDetailsCategoryTarget(category);
    setDetailsSearch('');
    setDetailsSubTab(category === 'Operational Expense' ? 'transactions' : 'members');
  };

  const openEditFundModal = (tx: FundTransaction) => {
    setEditingTxId(tx.id);
    setFundForm({
      memberUid: tx.memberUid,
      memberName: tx.memberName,
      memberCadetNumber: tx.memberCadetNumber,
      memberBatch: tx.memberBatch,
      entryType: tx.entryType,
      amount: String(tx.amount),
      category: tx.category,
      paymentMethod: tx.paymentMethod,
      bankAccountLabel: tx.bankAccountLabel,
      referenceNumber: tx.referenceNumber,
      transactionDateTime: tx.transactionDateTime.slice(0, 16),
      notes: tx.notes,
      receiptDataUrl: tx.receiptDataUrl ?? '',
    });
    setFundErrors({});
    setFundFormError(null);
    setFundModalOpen(true);
  };

  const handleSelectDirectoryMember = (uid: string) => {
    if (!uid) {
      setFundForm((prev) => ({
        ...prev,
        memberUid: '',
      }));
      return;
    }
    const found = directoryMembers.find((m) => m.uid === uid);
    if (!found) return;
    setFundForm((prev) => ({
      ...prev,
      memberUid: found.uid,
      memberName: found.fullName,
      memberCadetNumber: found.cadetNumber,
      memberBatch: found.batch,
    }));
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressReceiptFile(file);
      setFundForm((prev) => ({ ...prev, receiptDataUrl: compressed }));
      showToast('success', 'Receipt compressed & attached', 'Ready to record transaction.');
    } catch {
      showToast('error', 'Receipt upload failed', 'Please choose a JPG, PNG, or WebP receipt photo.');
    }
    e.target.value = '';
  };

  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFundFormError(null);
    const result = validateFundTransactionInput(fundForm);
    setFundErrors(result.errors);
    if (!result.valid) {
      setFundFormError(
        fundForm.entryType === 'disbursement'
          ? 'Expenses require an amount, detailed purpose notes, and an uploaded or linked receipt.'
          : 'Please resolve the highlighted transaction fields.'
      );
      return;
    }
    setFundSubmitting(true);
    const toastId = showToast('loading', 'Recording ledger entry...');
    try {
      await saveFundEntry(fundForm, editingTxId ?? undefined);
      setFundModalOpen(false);
      updateToast(
        toastId,
        'success',
        fundForm.entryType === 'disbursement' ? 'Expense recorded with receipt' : 'Contribution recorded',
        `${formatBdtAmount(Number(fundForm.amount))} · ${fundForm.memberName}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save fund transaction.';
      setFundFormError(msg);
      updateToast(toastId, 'error', 'Ledger save failed', msg);
    } finally {
      setFundSubmitting(false);
    }
  };

  const handleDeleteBank = async (account: BankAccount) => {
    const toastId = showToast('loading', 'Removing bank account...');
    try {
      await removeBank(account.id);
      updateToast(toastId, 'success', 'Bank account removed', account.bankName);
    } catch (err) {
      updateToast(toastId, 'error', 'Remove failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDeleteFund = async (tx: FundTransaction) => {
    const toastId = showToast('loading', 'Deleting ledger entry...');
    try {
      await removeFundEntry(tx.id);
      updateToast(toastId, 'success', 'Ledger entry deleted', tx.memberName);
    } catch (err) {
      updateToast(toastId, 'error', 'Delete failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleMemberReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressReceiptFile(file);
      setPayForm((prev) => ({ ...prev, receiptDataUrl: compressed }));
      showToast('success', 'Payment receipt attached', 'Ready to submit for verification.');
    } catch {
      showToast('error', 'Receipt upload failed', 'Please choose a JPG, PNG, or WebP screenshot.');
    }
    e.target.value = '';
  };

  const handleMemberPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayFormError(null);
    const result = validatePaymentSubmissionInput(payForm);
    setPayErrors(result.errors);
    if (!result.valid) {
      setPayFormError('Please enter your BDT amount, Transaction ID, date/time, and payment receipt image.');
      return;
    }
    setPaySubmitting(true);
    const toastId = showToast('loading', 'Submitting payment proof to BMASA Treasury...');
    try {
      await submitMemberPaymentRequest(payForm);
      setPayForm(makeEmptyMemberPayForm(bankAccounts));
      setPayErrors({});
      setPayModalOpen(false);
      updateToast(
        toastId,
        'success',
        'Payment proof submitted',
        'Awaiting verification by a BMASA administrator.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to submit payment proof.';
      setPayFormError(msg);
      updateToast(toastId, 'error', 'Submission failed', msg);
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleApproveSubmission = async (sub: PaymentSubmission) => {
    setReviewBusyId(sub.id);
    const note = (reviewNotesMap[sub.id] ?? '').trim();
    const toastId = showToast('loading', 'Verifying and posting to BMASA ledger...');
    try {
      await approvePaymentRequest(sub, note);
      updateToast(
        toastId,
        'success',
        'Payment verified & posted',
        `${formatBdtAmount(sub.amount)} credited to ${sub.memberName}`
      );
    } catch (err) {
      updateToast(toastId, 'error', 'Verification failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setReviewBusyId(null);
    }
  };

  const handleRejectSubmission = async (sub: PaymentSubmission) => {
    setReviewBusyId(sub.id);
    const note = (reviewNotesMap[sub.id] ?? '').trim();
    const toastId = showToast('loading', 'Declining payment submission...');
    try {
      await rejectPaymentRequest(sub, note);
      updateToast(toastId, 'success', 'Submission declined', `${sub.memberName} notified.`);
    } catch (err) {
      updateToast(toastId, 'error', 'Action failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setReviewBusyId(null);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'DateTime',
      'Type',
      'MemberOrPayeeName',
      'CadetNumber',
      'Batch',
      'Category',
      'PaymentMethod',
      'BankAccount',
      'Reference',
      'AmountBDT',
      'HasReceipt',
      'Notes',
    ];
    const rows = filteredTransactions.map((tx) =>
      [
        tx.transactionDateTime,
        tx.entryType,
        tx.memberName,
        tx.memberCadetNumber,
        tx.memberBatch,
        tx.category,
        tx.paymentMethod,
        tx.bankAccountLabel,
        tx.referenceNumber,
        String(tx.amount),
        tx.receiptDataUrl ? 'Yes' : 'No',
        tx.notes,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BMASA-Fund-Ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'CSV exported', 'BMASA treasury ledger downloaded.');
  };

  return (
    <main className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6 overflow-x-clip">
      {/* Page Heading & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-xs tracking-[0.12em] text-[#806127]">
            BMASA TREASURY &amp; FUND TRANSPARENCY
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#0A192F]">
            Bank &amp; Fund Treasury
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Funds organized by category with contribution charts, member records, and verified receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          {fundTransactions.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export CSV
            </button>
          )}
          <button
            type="button"
            data-testid="top-add-payment-btn"
            onClick={() => openMemberPayModalForCategory(selectedCategory ?? undefined)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-[#D8B979]" aria-hidden="true" />
            Add Payment
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={openNewBankModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Landmark className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                Add Bank
              </button>
              <button
                type="button"
                onClick={() => openNewFundModal(undefined, 'disbursement')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-[#FBF8F1] border border-[#C5A059] hover:bg-[#F3E5AB]/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Receipt className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                Record Expense
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live Financial Summary Bar */}
      <section
        aria-label="Treasury totals"
        className="bg-white border border-[#E2E8F0] rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0]"
      >
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Total Collected</p>
          <p
            data-testid="fund-total-collected"
            className="mt-1 font-mono text-2xl font-semibold text-[#0A192F] tabular-nums"
          >
            {formatBdtAmount(totals.totalCollected)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
            {totals.contributionCount} recorded deposit{totals.contributionCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Total Expenses / Disbursed</p>
          <p
            data-testid="fund-total-disbursed"
            className="mt-1 font-mono text-2xl font-semibold text-[#0A192F] tabular-nums"
          >
            {formatBdtAmount(totals.totalDisbursed)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
            {totals.disbursementCount} receipted expense{totals.disbursementCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Net Fund Balance</p>
          <p
            data-testid="fund-net-balance"
            className="mt-1 font-mono text-2xl font-semibold text-[#806127] tabular-nums"
          >
            {formatBdtAmount(totals.netBalance)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Verified treasury balance</p>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Contributing Members</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#0A192F] tabular-nums">
            {totals.contributingMemberCount} / {directoryMembers.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Members with logged contributions</p>
        </div>
      </section>

      {/* Clean Segmented Workspace Switcher (Prevents Screen Crowding) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Bank and fund workspace views"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === 'categories'}
            data-testid="fund-tab-categories"
            onClick={() => setWorkspaceTab('categories')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              workspaceTab === 'categories'
                ? 'bg-white text-[#0A192F] shadow-xs'
                : 'text-slate-600 hover:text-[#0A192F]'
            }`}
          >
            By Category &amp; Charts
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === 'accounts'}
            data-testid="fund-tab-accounts"
            onClick={() => setWorkspaceTab('accounts')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              workspaceTab === 'accounts'
                ? 'bg-white text-[#0A192F] shadow-xs'
                : 'text-slate-600 hover:text-[#0A192F]'
            }`}
          >
            Bank Accounts &amp; Approvals
            {isAdmin && pendingSubmissions.length > 0 && (
              <span className="font-mono text-[11px] font-bold text-[#806127] tabular-nums">
                ({pendingSubmissions.length})
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === 'ledger'}
            data-testid="fund-tab-ledger"
            onClick={() => setWorkspaceTab('ledger')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              workspaceTab === 'ledger'
                ? 'bg-white text-[#0A192F] shadow-xs'
                : 'text-slate-600 hover:text-[#0A192F]'
            }`}
          >
            Full Ledger &amp; Members
          </button>
        </div>

        {isAdmin && pendingSubmissions.length > 0 && workspaceTab !== 'accounts' && (
          <button
            type="button"
            onClick={() => setWorkspaceTab('accounts')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#806127] hover:text-[#0A192F] transition-colors whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {pendingSubmissions.length} pending payment proof{pendingSubmissions.length === 1 ? '' : 's'} to verify
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* TAB 1: BY CATEGORY & CHARTS (Default Uncrowded Workspace) */}
      {workspaceTab === 'categories' && (
        <div className="space-y-6">
          {/* Visual Analytics Charts */}
          <TreasuryCharts
            transactions={fundTransactions}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />

          {/* Fund Categories Grid */}
          <section aria-label="Fund categories" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0A192F]">
                  Fund Categories
                </h2>
                <p className="text-xs text-slate-500">
                  Select a category card to add a payment or open everyone&apos;s contribution details.
                </p>
              </div>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-medium text-slate-500 hover:text-[#0A192F] self-start sm:self-auto"
                >
                  Clear selection
                </button>
              )}
            </div>

            <div
              data-testid="fund-category-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start"
            >
              {categoryStats.map((item) => {
                const isSelected = selectedCategory === item.category;
                const isExpenseCat = item.category === 'Operational Expense';

                return (
                  <div
                    key={item.category}
                    data-testid={`fund-category-card-${item.category}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isSelected}
                    onClick={() =>
                      setSelectedCategory((prev) =>
                        prev === item.category ? null : item.category
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCategory((prev) =>
                          prev === item.category ? null : item.category
                        );
                      }
                    }}
                    className={`group rounded-xl p-5 border text-left transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#FBF8F1] border-[#0A192F] shadow-sm'
                        : 'bg-white border-[#E2E8F0] hover:border-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-bold text-[#0A192F] truncate">
                          {item.category}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 truncate">
                          {item.description}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isSelected ? 'rotate-180 text-[#0A192F]' : 'group-hover:text-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                    </div>

                    <p
                      className={`mt-4 font-mono text-xl font-bold tabular-nums ${
                        isExpenseCat && item.disbursed > 0 ? 'text-rose-700' : 'text-[#0A192F]'
                      }`}
                    >
                      {formatBdtAmount(item.primaryAmount)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums truncate">
                      {item.entryCount === 0
                        ? 'No entries yet'
                        : isExpenseCat
                        ? `${item.entryCount} expense${item.entryCount === 1 ? '' : 's'}`
                        : `${item.contributorCount} contributor${item.contributorCount === 1 ? '' : 's'} · ${item.entryCount} entr${item.entryCount === 1 ? 'y' : 'ies'}`}
                    </p>

                    {/* Thin proportional bar */}
                    <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isExpenseCat ? 'bg-[#C5A059]' : 'bg-[#0A192F]'
                        }`}
                        style={{ width: `${item.entryCount > 0 ? Math.max(6, item.sharePct) : 0}%` }}
                      />
                    </div>

                    {/* Revealed Actions when Category is Clicked */}
                    <AnimatePresence initial={false}>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-4 pt-3.5 border-t border-[#E2E8F0] flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              data-testid={`category-add-payment-${item.category}`}
                              onClick={() => handleCategoryAddPayment(item.category)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                              {isExpenseCat && isAdmin ? 'Add Expense' : 'Add Payment'}
                            </button>

                            <button
                              type="button"
                              data-testid={`category-details-${item.category}`}
                              onClick={() => openCategoryDetails(item.category)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors whitespace-nowrap"
                            >
                              <Users className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                              Details
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: BANK ACCOUNTS & APPROVALS */}
      {workspaceTab === 'accounts' && (
        <div className="space-y-6">
          {/* Official Bank & MFS Accounts */}
          <section aria-label="Official BMASA bank accounts">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0A192F]">
                  Official BMASA Bank &amp; Mobile Accounts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transfer your subscription or welfare contribution to any verified account below, then submit your receipt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openMemberPayModalForCategory()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <Send className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                Submit Payment Proof
              </button>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-10 text-center">
                <p className="font-display text-sm font-semibold text-[#0A192F]">
                  No official bank accounts published yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {isAdmin
                    ? 'Click "Add Bank" above to publish the official BMASA Bank or Mobile Banking account.'
                    : 'Official bank account details will appear here once published by BMASA administration.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankAccounts.map((account) => {
                  const isCopied = copiedBankId === account.id;
                  return (
                    <article
                      key={account.id}
                      className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between"
                    >
                      <div>
                        <p className="font-mono text-[11px] text-[#806127]">
                          {account.accountType} · {account.currency}
                        </p>
                        <h3 className="mt-1 font-display text-base font-bold text-[#0A192F]">
                          {account.bankName}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600">{account.accountName}</p>

                        <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] text-slate-400">ACCOUNT NO.</p>
                            <p className="font-mono text-sm font-semibold text-[#0A192F] truncate">
                              {account.accountNumber}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(account)}
                            aria-label={`Copy account number ${account.accountNumber}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors shrink-0"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>

                        {(account.branchName || account.routingNumber) && (
                          <p className="mt-2.5 text-xs text-slate-500">
                            {account.branchName ? `Branch: ${account.branchName}` : ''}
                            {account.branchName && account.routingNumber ? ' · ' : ''}
                            {account.routingNumber ? `Routing: ${account.routingNumber}` : ''}
                          </p>
                        )}

                        {account.notes && (
                          <p className="mt-2 text-xs text-slate-600 leading-relaxed">{account.notes}</p>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => openEditBankModal(account)}
                            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-[#0A192F]"
                          >
                            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBank(account)}
                            className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Verification Queue (Admin) + My Submitted Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {isAdmin && (
              <div
                data-testid="admin-payment-queue"
                className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
              >
                <div className="px-6 py-4 bg-[#0A192F] text-white">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-[#D8B979]">
                    ADMIN TREASURY VERIFICATION QUEUE
                  </p>
                  <h2 className="mt-0.5 font-display text-base font-bold">
                    Pending Payment Proofs ({pendingSubmissions.length})
                  </h2>
                </div>

                {pendingSubmissions.length === 0 ? (
                  <div className="px-6 py-8 text-center text-xs text-slate-500">
                    All member payment proofs have been reviewed.
                  </div>
                ) : (
                  <ul className="divide-y divide-[#E2E8F0]">
                    {pendingSubmissions.map((sub) => {
                      const busy = reviewBusyId === sub.id;
                      return (
                        <li key={sub.id} className="p-5 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-display text-sm font-bold text-[#0A192F]">
                                {sub.memberName}{' '}
                                <span className="font-mono text-xs font-medium text-slate-500">
                                  ({sub.memberCadetNumber})
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-slate-600">
                                {sub.category} · {sub.paymentMethod} ·{' '}
                                <span className="font-mono font-semibold text-[#0A192F]">
                                  TrxID: {sub.referenceNumber}
                                </span>
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                {formatTransactionDateTime(sub.transactionDateTime)}
                                {sub.bankAccountLabel ? ` · ${sub.bankAccountLabel}` : ''}
                              </p>
                              {sub.notes && (
                                <p className="mt-1 text-xs text-slate-600">{sub.notes}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono text-base font-bold text-[#0A192F] tabular-nums">
                                {formatBdtAmount(sub.amount)}
                              </p>
                              {sub.receiptDataUrl && (
                                <button
                                  type="button"
                                  onClick={() => openSubmissionPreview(sub)}
                                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#806127] hover:underline"
                                >
                                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                  View Receipt
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                            <input
                              type="text"
                              aria-label={`Admin review note for ${sub.memberName}`}
                              value={reviewNotesMap[sub.id] ?? ''}
                              onChange={(e) =>
                                setReviewNotesMap((prev) => ({ ...prev, [sub.id]: e.target.value }))
                              }
                              placeholder="Optional verification / decline note"
                              className="flex-1 px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleApproveSubmission(sub)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-55 rounded-lg transition-colors whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                Verify &amp; Post
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleRejectSubmission(sub)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-55 rounded-lg transition-colors whitespace-nowrap"
                              >
                                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                Decline
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <div
              data-testid="my-payment-submissions"
              className={`${isAdmin ? 'lg:col-span-6' : 'lg:col-span-12'} bg-white border border-[#E2E8F0] rounded-xl overflow-hidden`}
            >
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#0A192F]">
                    My Submitted Payments ({mySubmissions.length})
                  </h2>
                  <p className="text-xs text-slate-500">Verification status of your submitted payment proofs</p>
                </div>
              </div>

              {mySubmissions.length === 0 ? (
                <div className="px-6 py-8 text-center text-xs text-slate-500">
                  No payment proofs submitted from your account yet.
                </div>
              ) : (
                <ul className="divide-y divide-[#E2E8F0]">
                  {mySubmissions.map((sub) => {
                    const statusUi =
                      sub.status === 'approved'
                        ? {
                            label: 'Verified & Posted',
                            cls: 'text-emerald-700',
                            Icon: CheckCircle2,
                          }
                        : sub.status === 'rejected'
                        ? {
                            label: 'Declined',
                            cls: 'text-rose-700',
                            Icon: XCircle,
                          }
                        : {
                            label: 'Pending Verification',
                            cls: 'text-amber-700',
                            Icon: Clock,
                          };
                    const StatusIcon = statusUi.Icon;

                    return (
                      <li key={sub.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`inline-flex items-center gap-1 font-semibold ${statusUi.cls}`}>
                              <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                              {statusUi.label}
                            </span>
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            <span className="font-semibold text-[#0A192F]">{sub.category}</span>
                          </div>
                          <p className="mt-1 font-mono text-xs text-slate-600">
                            {sub.paymentMethod} · TrxID: {sub.referenceNumber} ·{' '}
                            {formatTransactionDateTime(sub.transactionDateTime)}
                          </p>
                          {sub.reviewedByName && (
                            <p className="mt-1 text-[11px] text-slate-600">
                              {sub.status === 'approved' ? 'Verified by' : 'Reviewed by'}{' '}
                              <strong className="font-semibold text-[#0A192F]">{sub.reviewedByName}</strong>
                            </p>
                          )}
                          {sub.adminNotes && (
                            <p className="mt-1 text-xs text-slate-500">Admin Note: {sub.adminNotes}</p>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                          <span className="font-mono text-sm font-bold text-[#0A192F] tabular-nums">
                            {formatBdtAmount(sub.amount)}
                          </span>
                          {sub.receiptDataUrl && (
                            <button
                              type="button"
                              onClick={() => openSubmissionPreview(sub)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#806127] hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              Receipt
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FULL LEDGER & MEMBERS */}
      {workspaceTab === 'ledger' && (
        <div className="space-y-6">
          {/* Member-by-Member Fund Records */}
          <section className="min-w-0 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#0A192F]">
                  All Members Contribution Summary ({filteredMemberSummaries.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Total contributed amount and latest deposit across all categories for every member.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <label htmlFor="fund-member-search" className="sr-only">
                  Search members in fund ledger
                </label>
                <input
                  id="fund-member-search"
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search member name, Cadet No., batch..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>
            </div>

            {filteredMemberSummaries.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                No registered members or fund records match your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table data-testid="member-fund-summary-table" className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-mono uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Member Name</th>
                      <th className="py-3 px-4">Cadet No.</th>
                      <th className="py-3 px-4">Batch &amp; Branch</th>
                      <th className="py-3 px-4 text-right">Deposits</th>
                      <th className="py-3 px-4">Last Date &amp; Time</th>
                      <th className="py-3 px-5 text-right">Member Total</th>
                      {isAdmin && <th className="py-3 px-5 text-right">Record</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredMemberSummaries.map((row) => (
                      <tr key={row.memberUid || `${row.memberName}-${row.cadetNumber}`} className="hover:bg-slate-50/70">
                        <td className="py-3 px-5 font-display font-semibold text-[#0A192F]">
                          {row.memberName}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#0A192F] whitespace-nowrap">
                          {row.cadetNumber}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {row.batch} · {row.department}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {row.contributionCount}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                          {row.lastContributionDateTime
                            ? formatTransactionDateTime(row.lastContributionDateTime)
                            : 'No contributions yet'}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-xs font-semibold text-[#0A192F] whitespace-nowrap tabular-nums">
                          {formatBdtAmount(row.totalContributed)}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openNewFundModal(row, 'contribution')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg transition-colors"
                            >
                              <Plus className="w-3 h-3" aria-hidden="true" />
                              Add Payment
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC]">
                      <td colSpan={4} className="py-3 px-5 text-xs font-semibold text-[#0A192F]">
                        Total Member Contributions
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {totals.contributionCount === 1 ? '1 entry' : `${totals.contributionCount} entries`}
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-sm font-bold text-[#0A192F] tabular-nums">
                        {formatBdtAmount(totals.totalCollected)}
                      </td>
                      {isAdmin && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* Complete Chronological Transaction Ledger */}
          <section className="min-w-0 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#0A192F]">
                  Complete Transaction Ledger ({filteredTransactions.length})
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chronological audit trail of every contribution and receipted expense.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative sm:w-64">
                  <Search
                    className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <label htmlFor="ledger-search" className="sr-only">
                    Search transactions
                  </label>
                  <input
                    id="ledger-search"
                    type="search"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search member, TrxID, category..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                </div>

                <select
                  aria-label="Filter by transaction type"
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value as 'all' | FundEntryType)}
                  className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                >
                  <option value="all">All Entries</option>
                  <option value="contribution">Payments / Contributions Only</option>
                  <option value="disbursement">Expenses / Disbursements Only</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table data-testid="fund-ledger-table" className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-mono uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Date &amp; Time</th>
                      <th className="py-3 px-4">Member / Payee</th>
                      <th className="py-3 px-4">Category &amp; Notes</th>
                      <th className="py-3 px-4">Method &amp; Receipt</th>
                      <th className="py-3 px-5 text-right">Amount</th>
                      {isAdmin && <th className="py-3 px-5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-5 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                          {formatTransactionDateTime(tx.transactionDateTime)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-display font-semibold text-[#0A192F]">{tx.memberName}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {tx.memberCadetNumber || 'Vendor / Beneficiary'}
                            {tx.memberBatch ? ` · ${tx.memberBatch}` : ''}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          <p className="font-medium text-[#0A192F]">{tx.category}</p>
                          {tx.notes && <p className="text-slate-500 mt-0.5 line-clamp-1">{tx.notes}</p>}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <p>{tx.paymentMethod}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-500">
                              {tx.referenceNumber || tx.bankAccountLabel || '—'}
                            </span>
                            {tx.receiptDataUrl && (
                              <button
                                type="button"
                                onClick={() => openReceiptPreview(tx)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#806127] hover:underline"
                              >
                                <FileImage className="w-3 h-3" aria-hidden="true" />
                                Receipt
                              </button>
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-5 text-right font-mono text-xs font-semibold whitespace-nowrap tabular-nums ${
                            tx.entryType === 'disbursement' ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {tx.entryType === 'disbursement' ? '− ' : '+ '}
                          {formatBdtAmount(tx.amount)}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-5 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditFundModal(tx)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFund(tx)}
                              className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* CATEGORY DETAILS MODAL (Everyone's Contributions for the Clicked Category) */}
      {detailsCategoryTarget && categoryDetailsData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-details-modal-title"
          data-testid="category-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/70 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailsCategoryTarget(null);
          }}
        >
          <div className="w-full max-w-4xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 bg-[#0A192F] text-white flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.14em] text-[#D8B979] uppercase">
                  CATEGORY CONTRIBUTION DETAILS
                </p>
                <h2
                  id="category-details-modal-title"
                  className="mt-0.5 font-display text-lg font-bold truncate"
                >
                  {categoryDetailsData.category}
                </h2>
                <p className="mt-0.5 text-xs text-slate-300 font-mono tabular-nums">
                  Collected: {formatBdtAmount(categoryDetailsData.collected)}
                  {categoryDetailsData.disbursed > 0
                    ? ` · Disbursed: ${formatBdtAmount(categoryDetailsData.disbursed)}`
                    : ''}
                  {` · ${categoryDetailsData.contributorCount} contributor${categoryDetailsData.contributorCount === 1 ? '' : 's'}`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const target = categoryDetailsData.category;
                    setDetailsCategoryTarget(null);
                    handleCategoryAddPayment(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0A192F] bg-[#D8B979] hover:bg-[#C5A059] rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add Payment
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsCategoryTarget(null)}
                  aria-label="Close category details"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Toolbar: Sub-tabs + Search + Zero-balance filter */}
            <div className="px-4 sm:px-6 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="inline-flex flex-wrap items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg self-start max-w-full">
                <button
                  type="button"
                  onClick={() => setDetailsSubTab('members')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    detailsSubTab === 'members'
                      ? 'bg-white text-[#0A192F] shadow-xs'
                      : 'text-slate-600 hover:text-[#0A192F]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  Everyone&apos;s Contributions ({categoryDetailsData.filteredMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsSubTab('transactions')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    detailsSubTab === 'transactions'
                      ? 'bg-white text-[#0A192F] shadow-xs'
                      : 'text-slate-600 hover:text-[#0A192F]'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" aria-hidden="true" />
                  Transactions &amp; Receipts ({categoryDetailsData.filteredTxs.length})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {detailsSubTab === 'members' && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={detailsIncludeZeroMembers}
                      onChange={(e) => setDetailsIncludeZeroMembers(e.target.checked)}
                      className="rounded border-slate-300 text-[#0A192F]"
                    />
                    Include non-contributors (৳ 0)
                  </label>
                )}

                <div className="relative w-full sm:w-56">
                  <Search
                    className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={detailsSearch}
                    onChange={(e) => setDetailsSearch(e.target.value)}
                    placeholder="Search member or Cadet No..."
                    aria-label="Search category details"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              {detailsSubTab === 'members' ? (
                categoryDetailsData.filteredMembers.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-500">
                    No contributions recorded in this category yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table
                      data-testid="category-member-contributions-table"
                      className="w-full text-left border-collapse text-sm"
                    >
                      <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-mono uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="py-3 px-4 sm:px-5">Member</th>
                          <th className="py-3 px-4">Cadet No.</th>
                          <th className="py-3 px-4">Batch</th>
                          <th className="py-3 px-4 text-right">Deposits</th>
                          <th className="py-3 px-4">Last Payment</th>
                          <th className="py-3 px-4 sm:px-5 text-right">Total</th>
                          {isAdmin && <th className="py-3 px-4 text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {categoryDetailsData.filteredMembers.map((row) => (
                          <tr key={row.memberUid || `${row.memberName}-${row.cadetNumber}`} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 sm:px-5 font-display font-semibold text-[#0A192F] whitespace-nowrap">
                              {row.memberName}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-[#0A192F] whitespace-nowrap">
                              {row.cadetNumber}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                              {row.batch}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                              {row.contributionCount}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                              {row.lastContributionDateTime
                                ? formatTransactionDateTime(row.lastContributionDateTime)
                                : '—'}
                            </td>
                            <td
                              className={`py-3 px-4 sm:px-5 text-right font-mono text-xs font-bold whitespace-nowrap tabular-nums ${
                                row.totalContributed > 0 ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {formatBdtAmount(row.totalContributed)}
                            </td>
                            {isAdmin && (
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cat = categoryDetailsData.category;
                                    setDetailsCategoryTarget(null);
                                    openNewFundModal(row, 'contribution', cat);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                                >
                                  <Plus className="w-3 h-3" aria-hidden="true" />
                                  Record
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : categoryDetailsData.filteredTxs.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  No transactions recorded in {categoryDetailsData.category} yet.
                </div>
              ) : (
                <ul className="divide-y divide-[#E2E8F0]">
                  {categoryDetailsData.filteredTxs.map((tx) => (
                    <li
                      key={tx.id}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                    >
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold text-[#0A192F]">
                          {tx.memberName}{' '}
                          {tx.memberCadetNumber && (
                            <span className="font-mono text-xs font-normal text-slate-500">
                              ({tx.memberCadetNumber})
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">
                          {formatTransactionDateTime(tx.transactionDateTime)} · {tx.paymentMethod}
                          {tx.referenceNumber ? ` · Ref: ${tx.referenceNumber}` : ''}
                        </p>
                        {tx.notes && <p className="mt-1 text-xs text-slate-600">{tx.notes}</p>}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${
                            tx.entryType === 'disbursement' ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {tx.entryType === 'disbursement' ? '− ' : '+ '}
                          {formatBdtAmount(tx.amount)}
                        </span>
                        {tx.receiptDataUrl && (
                          <button
                            type="button"
                            onClick={() => openReceiptPreview(tx)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#806127]" aria-hidden="true" />
                            Receipt
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsCategoryTarget(null);
                              openEditFundModal(tx);
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MEMBER PAYMENT PROOF MODAL (Triggered from Category Add Payment or Top Bar) */}
      {payModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-pay-modal-title"
          data-testid="member-payment-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/65 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayModalOpen(false);
          }}
        >
          <div className="w-full max-w-xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4 shrink-0">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
                  MEMBER PAYMENT SUBMISSION
                </p>
                <h2 id="member-pay-modal-title" className="mt-0.5 font-display text-lg font-bold text-[#0A192F]">
                  Submit Payment Proof
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                aria-label="Close payment modal"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMemberPaymentSubmit} noValidate className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Compact Official Accounts Reference inside Modal */}
              {bankAccounts.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    OFFICIAL BMASA DEPOSIT ACCOUNTS (TAP TO COPY &amp; SELECT)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bankAccounts.map((acc) => {
                      const label = `${acc.bankName} (${acc.accountNumber})`;
                      const isCopied = copiedBankId === acc.id;
                      return (
                        <div
                          key={acc.id}
                          className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2 text-xs"
                        >
                          <button
                            type="button"
                            onClick={() => setPayForm((p) => ({ ...p, bankAccountLabel: label }))}
                            className="min-w-0 text-left flex-1"
                          >
                            <p className="font-semibold text-[#0A192F] truncate">{acc.bankName}</p>
                            <p className="font-mono text-[11px] text-slate-600 truncate">
                              {acc.accountNumber}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(acc)}
                            className="px-2 py-1 text-[11px] font-semibold text-[#0A192F] bg-[#F8FAFC] border border-[#CBD5E1] rounded-md shrink-0"
                          >
                            {isCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {payFormError && (
                <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {payFormError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pay-category" className="block text-xs font-semibold text-slate-700 mb-1">
                    Contribution Category *
                  </label>
                  <select
                    id="pay-category"
                    value={payForm.category}
                    onChange={(e) =>
                      setPayForm((p) => ({
                        ...p,
                        category: e.target.value as Exclude<FundCategory, 'Operational Expense'>,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    {MEMBER_PAYMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pay-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (BDT) *
                  </label>
                  <input
                    id="pay-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={payForm.amount}
                    onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g., 2000"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {payErrors.amount && <p className="mt-1 text-xs text-red-600">{payErrors.amount}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pay-method" className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    id="pay-method"
                    value={payForm.paymentMethod}
                    onChange={(e) =>
                      setPayForm((p) => ({
                        ...p,
                        paymentMethod: e.target.value as FundPaymentMethod,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    {FUND_PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pay-trx-id" className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction ID / Reference *
                  </label>
                  <input
                    id="pay-trx-id"
                    type="text"
                    required
                    value={payForm.referenceNumber}
                    onChange={(e) => setPayForm((p) => ({ ...p, referenceNumber: e.target.value }))}
                    placeholder="e.g., BKX849201 or Bank Ref"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {payErrors.referenceNumber && (
                    <p className="mt-1 text-xs text-red-600">{payErrors.referenceNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pay-datetime" className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date &amp; Time *
                  </label>
                  <input
                    id="pay-datetime"
                    type="datetime-local"
                    required
                    value={payForm.transactionDateTime}
                    onChange={(e) =>
                      setPayForm((p) => ({ ...p, transactionDateTime: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                </div>

                <div>
                  <label htmlFor="pay-bank-label" className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination BMASA Account
                  </label>
                  <input
                    id="pay-bank-label"
                    type="text"
                    list="bmas-member-bank-list"
                    value={payForm.bankAccountLabel}
                    onChange={(e) =>
                      setPayForm((p) => ({ ...p, bankAccountLabel: e.target.value }))
                    }
                    placeholder="Select or type destination bank/MFS"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  <datalist id="bmas-member-bank-list">
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={`${b.bankName} (${b.accountNumber})`} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Mandatory Receipt Upload */}
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0A192F]">
                    Payment Receipt Screenshot *
                  </span>
                  <input
                    ref={memberReceiptInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleMemberReceiptUpload}
                    className="hidden"
                    aria-label="Upload member payment receipt screenshot"
                  />
                  <button
                    type="button"
                    onClick={() => memberReceiptInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    Upload Screenshot
                  </button>
                </div>

                {payForm.receiptDataUrl && (
                  <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Receipt image attached and ready for admin verification.
                  </p>
                )}
                {payErrors.receiptDataUrl && (
                  <p className="text-xs text-red-600">{payErrors.receiptDataUrl}</p>
                )}
              </div>

              <div>
                <label htmlFor="pay-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="pay-notes"
                  rows={2}
                  value={payForm.notes}
                  onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Month covered or remarks..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg"
                >
                  <Send className="w-3.5 h-3.5 text-[#D8B979]" aria-hidden="true" />
                  {paySubmitting ? 'Submitting...' : 'Submit Payment Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Lightbox Modal */}
      {previewReceiptItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-lightbox-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/75 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewReceiptItem(null);
          }}
        >
          <div className="w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
                  VERIFIED TREASURY RECEIPT
                </p>
                <h2 id="receipt-lightbox-title" className="font-display text-base font-bold text-[#0A192F]">
                  {previewReceiptItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceiptItem(null)}
                aria-label="Close receipt preview"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="text-xs text-slate-600 space-y-1 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                <p>
                  <strong className="text-[#0A192F]">Date &amp; Time:</strong>{' '}
                  {formatTransactionDateTime(previewReceiptItem.transactionDateTime)}
                </p>
                <p>
                  <strong className="text-[#0A192F]">Category:</strong> {previewReceiptItem.category} (
                  {previewReceiptItem.paymentMethod})
                </p>
                {previewReceiptItem.referenceNumber && (
                  <p>
                    <strong className="text-[#0A192F]">Transaction ID:</strong>{' '}
                    <span className="font-mono">{previewReceiptItem.referenceNumber}</span>
                  </p>
                )}
                {previewReceiptItem.notes && (
                  <p>
                    <strong className="text-[#0A192F]">Details:</strong> {previewReceiptItem.notes}
                  </p>
                )}
                {previewReceiptItem.recordedByName && (
                  <p>
                    <strong className="text-[#0A192F]">Added by:</strong>{' '}
                    {previewReceiptItem.recordedByName}
                    {previewReceiptItem.updatedByName
                      ? ` · Updated by ${previewReceiptItem.updatedByName}`
                      : ''}
                  </p>
                )}
              </div>

              {previewReceiptItem.receiptDataUrl.startsWith('data:image/') ||
              /\.(png|jpe?g|webp|gif)(\?|$)/i.test(previewReceiptItem.receiptDataUrl) ? (
                <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-slate-50 flex items-center justify-center">
                  <img
                    src={previewReceiptItem.receiptDataUrl}
                    alt={`Payment receipt for ${previewReceiptItem.title}`}
                    className="max-h-[60vh] w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-center space-y-3">
                  <p className="text-xs text-slate-600">External receipt link attached:</p>
                  <a
                    href={previewReceiptItem.receiptDataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] rounded-lg"
                  >
                    Open Receipt Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Add / Edit Official Bank Account */}
      {bankModalOpen && isAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bank-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBankModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl max-h-[92dvh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
                  BMASA ADMIN TREASURY SETTINGS
                </p>
                <h2 id="bank-modal-title" className="mt-0.5 font-display text-lg font-bold text-[#0A192F]">
                  {editingBankId ? 'Edit Official Bank Account' : 'Add Official Bank Account'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                aria-label="Close bank account modal"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBankSubmit} noValidate className="p-4 sm:p-6 space-y-4">
              {bankFormError && (
                <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {bankFormError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bank-type" className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Type *
                  </label>
                  <select
                    id="bank-type"
                    value={bankForm.accountType}
                    onChange={(e) =>
                      setBankForm((p) => ({ ...p, accountType: e.target.value as BankAccountType }))
                    }
                    className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    {BANK_ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="bank-currency" className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency *
                  </label>
                  <select
                    id="bank-currency"
                    value={bankForm.currency}
                    onChange={(e) =>
                      setBankForm((p) => ({ ...p, currency: e.target.value as BankCurrency }))
                    }
                    className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    {BANK_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="bank-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank or Mobile Financial Provider *
                </label>
                <input
                  id="bank-name"
                  type="text"
                  required
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                  placeholder="e.g., Dutch-Bangla Bank PLC or bKash Merchant"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {bankErrors.bankName && (
                  <p className="mt-1 text-xs text-red-600">{bankErrors.bankName}</p>
                )}
              </div>

              <div>
                <label htmlFor="bank-acc-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Title *
                </label>
                <input
                  id="bank-acc-name"
                  type="text"
                  required
                  value={bankForm.accountName}
                  onChange={(e) => setBankForm((p) => ({ ...p, accountName: e.target.value }))}
                  placeholder="e.g., BMASA Welfare & Development Fund"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {bankErrors.accountName && (
                  <p className="mt-1 text-xs text-red-600">{bankErrors.accountName}</p>
                )}
              </div>

              <div>
                <label htmlFor="bank-acc-num" className="block text-xs font-semibold text-slate-700 mb-1">
                  Account / Merchant Number *
                </label>
                <input
                  id="bank-acc-num"
                  type="text"
                  required
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  placeholder="e.g., 101-120-0045891"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {bankErrors.accountNumber && (
                  <p className="mt-1 text-xs text-red-600">{bankErrors.accountNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bank-branch" className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Name
                  </label>
                  <input
                    id="bank-branch"
                    type="text"
                    value={bankForm.branchName}
                    onChange={(e) => setBankForm((p) => ({ ...p, branchName: e.target.value }))}
                    placeholder="e.g., Sylhet Main Branch"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                </div>
                <div>
                  <label htmlFor="bank-routing" className="block text-xs font-semibold text-slate-700 mb-1">
                    Routing / SWIFT Code
                  </label>
                  <input
                    id="bank-routing"
                    type="text"
                    value={bankForm.routingNumber}
                    onChange={(e) => setBankForm((p) => ({ ...p, routingNumber: e.target.value }))}
                    placeholder="e.g., 090912345"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bank-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Deposit Instructions / Notes
                </label>
                <textarea
                  id="bank-notes"
                  rows={2}
                  value={bankForm.notes}
                  onChange={(e) => setBankForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Include your Cadet No. in the bank transfer reference..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bankSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg"
                >
                  {bankSubmitting ? 'Saving...' : editingBankId ? 'Save Changes' : 'Publish Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Modal: Record / Edit Fund Entry (Contribution or Receipted Expense) */}
      {fundModalOpen && isAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fund-modal-title"
          data-testid="admin-fund-entry-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A192F]/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFundModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl max-h-[92dvh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#806127]">
                  BMASA ADMIN LEDGER ENTRY
                </p>
                <h2 id="fund-modal-title" className="mt-0.5 font-display text-lg font-bold text-[#0A192F]">
                  {editingTxId
                    ? 'Edit Fund Transaction'
                    : fundForm.entryType === 'disbursement'
                    ? 'Record Expense (Receipt Required)'
                    : 'Record Member Payment / Deposit'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFundModalOpen(false)}
                aria-label="Close fund entry modal"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFundSubmit} noValidate className="p-4 sm:p-6 space-y-4">
              {fundFormError && (
                <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {fundFormError}
                </p>
              )}

              <div>
                <label htmlFor="fund-entry-type" className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Type *
                </label>
                <select
                  id="fund-entry-type"
                  value={fundForm.entryType}
                  onChange={(e) => {
                    const nextType = e.target.value as FundEntryType;
                    setFundForm((p) => ({
                      ...p,
                      entryType: nextType,
                      category:
                        nextType === 'disbursement' ? 'Operational Expense' : p.category,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                >
                  <option value="contribution">Contribution / Member Payment (+)</option>
                  <option value="disbursement">Expense / Welfare Disbursement (− Receipt Required)</option>
                </select>
              </div>

              {fundForm.entryType === 'contribution' && (
                <div>
                  <label htmlFor="fund-member-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Link Registered Member (Optional)
                  </label>
                  <select
                    id="fund-member-select"
                    value={fundForm.memberUid}
                    onChange={(e) => handleSelectDirectoryMember(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    <option value="">Select a registered member (or enter manually below)</option>
                    {directoryMembers.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.fullName} ({m.cadetNumber} · {m.batch})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fund-member-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    {fundForm.entryType === 'disbursement' ? 'Payee / Vendor Name *' : 'Member Name *'}
                  </label>
                  <input
                    id="fund-member-name"
                    type="text"
                    required
                    value={fundForm.memberName}
                    onChange={(e) => setFundForm((p) => ({ ...p, memberName: e.target.value }))}
                    placeholder={
                      fundForm.entryType === 'disbursement'
                        ? 'e.g., Sylhet Print & Press'
                        : 'Full Name'
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {fundErrors.memberName && (
                    <p className="mt-1 text-xs text-red-600">{fundErrors.memberName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="fund-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (BDT) *
                  </label>
                  <input
                    id="fund-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={fundForm.amount}
                    onChange={(e) => setFundForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {fundErrors.amount && (
                    <p className="mt-1 text-xs text-red-600">{fundErrors.amount}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fund-category" className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    id="fund-category"
                    value={fundForm.category}
                    onChange={(e) =>
                      setFundForm((p) => ({ ...p, category: e.target.value as FundCategory }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    {FUND_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="fund-method" className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    id="fund-method"
                    value={fundForm.paymentMethod}
                    onChange={(e) =>
                      setFundForm((p) => ({
                        ...p,
                        paymentMethod: e.target.value as FundPaymentMethod,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  >
                    {FUND_PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fund-datetime" className="block text-xs font-semibold text-slate-700 mb-1">
                    Exact Date &amp; Time *
                  </label>
                  <input
                    id="fund-datetime"
                    type="datetime-local"
                    required
                    value={fundForm.transactionDateTime}
                    onChange={(e) =>
                      setFundForm((p) => ({ ...p, transactionDateTime: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                  {fundErrors.transactionDateTime && (
                    <p className="mt-1 text-xs text-red-600">{fundErrors.transactionDateTime}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="fund-ref" className="block text-xs font-semibold text-slate-700 mb-1">
                    Voucher / TrxID Reference
                  </label>
                  <input
                    id="fund-ref"
                    type="text"
                    value={fundForm.referenceNumber}
                    onChange={(e) =>
                      setFundForm((p) => ({ ...p, referenceNumber: e.target.value }))
                    }
                    placeholder="e.g., TRX9482710"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fund-bank-label" className="block text-xs font-semibold text-slate-700 mb-1">
                  Receiving / Source Account
                </label>
                <input
                  id="fund-bank-label"
                  type="text"
                  list="bmas-bank-account-list"
                  value={fundForm.bankAccountLabel}
                  onChange={(e) =>
                    setFundForm((p) => ({ ...p, bankAccountLabel: e.target.value }))
                  }
                  placeholder="e.g., Dutch-Bangla Bank PLC (101-120-0045891)"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                <datalist id="bmas-bank-account-list">
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={`${b.bankName} (${b.accountNumber})`} />
                  ))}
                </datalist>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#0A192F]">
                    Payment Receipt / Voucher {fundForm.entryType === 'disbursement' ? '*' : '(Optional)'}
                  </label>
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleReceiptUpload}
                    className="hidden"
                    aria-label="Upload payment receipt image"
                  />
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0A192F] bg-white border border-[#CBD5E1] hover:border-[#0A192F] rounded-lg"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    Upload Receipt Photo
                  </button>
                </div>

                <input
                  id="fund-receipt-url"
                  type="url"
                  aria-label="Receipt image URL"
                  value={fundForm.receiptDataUrl.startsWith('data:') ? '' : fundForm.receiptDataUrl}
                  onChange={(e) =>
                    setFundForm((p) => ({ ...p, receiptDataUrl: e.target.value }))
                  }
                  placeholder={
                    fundForm.receiptDataUrl.startsWith('data:')
                      ? 'Compressed receipt photo attached (paste URL to replace)'
                      : 'Or paste verified receipt image URL'
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />

                {fundForm.receiptDataUrl && (
                  <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Receipt attached and ready for audit transparency.
                  </p>
                )}
                {fundErrors.receiptDataUrl && (
                  <p className="text-xs text-red-600">{fundErrors.receiptDataUrl}</p>
                )}
              </div>

              <div>
                <label htmlFor="fund-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  {fundForm.entryType === 'disbursement'
                    ? 'Detailed Expense Purpose & Breakdown *'
                    : 'Ledger Notes (Optional)'}
                </label>
                <textarea
                  id="fund-notes"
                  rows={2}
                  value={fundForm.notes}
                  onChange={(e) => setFundForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={
                    fundForm.entryType === 'disbursement'
                      ? 'Describe exact items, beneficiary, or operational breakdown...'
                      : 'Optional verification remarks...'
                  }
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0A192F]"
                />
                {fundErrors.notes && <p className="mt-1 text-xs text-red-600">{fundErrors.notes}</p>}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFundModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fundSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 rounded-lg"
                >
                  {fundSubmitting
                    ? 'Recording...'
                    : editingTxId
                    ? 'Save Transaction'
                    : 'Save Fund Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
