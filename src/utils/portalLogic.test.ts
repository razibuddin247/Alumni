import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInterestMailto,
  buildJobApplicationPayload,
  buildManningAgencyApplicationPayload,
  buildMemberFundSummaries,
  buildMemberMailtoHref,
  buildMemberTelHref,
  buildShareableProfileUrl,
  calculateSeaTime,
  cleanBatchLabel,
  computeFundTotals,
  computePortalMetrics,
  extractEmailsFromContact,
  filterDirectoryMembers,
  formatBdtAmount,
  formatLatLongReadout,
  formatTransactionDateTime,
  getCertificateExpiryStatus,
  getInitials,
  sortAndFilterNotices,
  sortVoyagesChronologically,
  summarizeMemberCertificates,
} from './portalLogic';
import {
  buildPortalUrl,
  isValidPortalTab,
  readSectionFromSearch,
  readSharedMemberFromSearch,
  readTabFromSearch,
} from './historyNavigation';
import {
  generateMemberSerial,
  validateBankAccountInput,
  validateCopCertificateInput,
  validateFundTransactionInput,
  validateInstructorOnboardingInput,
  validateJobInput,
  validateNoticeInput,
  validateOnboardingStep,
  validatePaymentSubmissionInput,
  validateProfileInput,
  validateVoyageInput,
} from './validation';
import type {
  CopCertificate,
  DirectoryProfile,
  FundTransaction,
  JobPosting,
  NoticeItem,
  PrivateVault,
  VoyageRecord,
} from '../types/portal';

const SAMPLE_MEMBERS: DirectoryProfile[] = [
  {
    uid: 'm1',
    fullName: 'Capt. Tariqul Islam',
    photoUrl: '',
    cadetNumber: 'BMAS-01-N0012',
    batch: '2nd Batch (Founding Batch)',
    department: 'Nautical',
    cdcNumber: 'C/O/68412',
    currentRank: 'Master Mariner',
    availabilityStatus: 'Onboard',
    bloodGroup: 'B+',
    city: 'Dhaka',
    country: 'Bangladesh',
    cvUrl: 'https://linkedin.com/in/tariqul-bmas',
    memberSerial: 'BMAS-01-N0012',
    isVerified: true,
    isPublicDirectory: true,
    voyageCount: 3,
    contactEmail: 'tariqul@bmas.example',
    contactPhone: '+8801711223344',
  },
  {
    uid: 'm2',
    fullName: 'Ahsan Rahman',
    photoUrl: '',
    cadetNumber: 'BMAS-04-N0108',
    batch: '4th Batch',
    department: 'Nautical',
    cdcNumber: 'C/O/91402',
    currentRank: 'Deck Cadet',
    availabilityStatus: 'Available for Sea',
    bloodGroup: 'O+',
    city: 'Sylhet',
    country: 'Bangladesh',
    cvUrl: '',
    memberSerial: 'BMAS-04-N0108',
    isVerified: false,
    isPublicDirectory: true,
    voyageCount: 1,
  },
  {
    uid: 'm3',
    fullName: 'Engr. Mahmudul Hasan',
    photoUrl: '',
    cadetNumber: 'BMAS-01-E0019',
    batch: '2nd Batch (Founding Batch)',
    department: 'Marine Engineering',
    cdcNumber: 'C/O/72905',
    currentRank: '2nd Engineer',
    availabilityStatus: 'Shore-Based',
    bloodGroup: 'O+',
    city: 'Chattogram',
    country: 'Bangladesh',
    cvUrl: '',
    memberSerial: 'BMAS-01-E0019',
    isVerified: true,
    isPublicDirectory: true,
    voyageCount: 2,
  },
];

test('filterDirectoryMembers filters by department, availability, batch, blood group, city, and search query', () => {
  const available = filterDirectoryMembers(SAMPLE_MEMBERS, {
    query: '',
    batch: 'All',
    department: 'All',
    rank: 'All',
    availability: 'Available for Sea',
  });
  assert.equal(available.length, 1);
  assert.equal(available[0].uid, 'm2');

  const bloodDonorsInSylhet = filterDirectoryMembers(SAMPLE_MEMBERS, {
    query: '',
    batch: 'All',
    department: 'All',
    rank: 'All',
    availability: 'All',
    bloodGroup: 'O+',
    city: 'sylhet',
  });
  assert.equal(bloodDonorsInSylhet.length, 1);
  assert.equal(bloodDonorsInSylhet[0].uid, 'm2');

  const eng = filterDirectoryMembers(SAMPLE_MEMBERS, {
    query: '72905',
    batch: '2nd Batch (Founding Batch)',
    department: 'Marine Engineering',
    rank: '2nd Engineer',
    availability: 'All',
  });
  assert.equal(eng.length, 1);
  assert.equal(eng[0].fullName, 'Engr. Mahmudul Hasan');

  const byPhone = filterDirectoryMembers(SAMPLE_MEMBERS, {
    query: '1711223344',
    batch: 'All',
    department: 'All',
    rank: 'All',
    availability: 'All',
  });
  assert.equal(byPhone.length, 1);
  assert.equal(byPhone[0].uid, 'm1');
});

test('filterDirectoryMembers prioritizes verified members first', () => {
  const all = filterDirectoryMembers(SAMPLE_MEMBERS, {
    query: '',
    batch: 'All',
    department: 'All',
    rank: 'All',
    availability: 'All',
  });
  assert.equal(all[0].isVerified, true);
  assert.equal(all[1].isVerified, true);
  assert.equal(all[2].isVerified, false);
});

test('calculateSeaTime computes months/days and years/months/days accurately', () => {
  const voyages: VoyageRecord[] = [
    {
      id: 'v1',
      memberId: 'm1',
      vesselName: 'MV Banglar Joyjatra',
      vesselType: 'Bulk Carrier',
      companyName: 'Bangladesh Shipping Corporation',
      rankServed: 'Deck Cadet',
      signOnDate: '2024-01-01',
      signOffDate: '2024-06-29',
      isVisible: true,
    },
    {
      id: 'v2',
      memberId: 'm1',
      vesselName: 'MT Meghna Pride',
      vesselType: 'Oil Tanker',
      companyName: 'Meghna Group Shipping',
      rankServed: '3rd Officer',
      signOnDate: '2025-01-01',
      signOffDate: '',
      isVisible: true,
    },
  ];

  const summary = calculateSeaTime(voyages, '2025-01-30');
  assert.equal(summary.totalDays, 211);
  assert.equal(summary.years, 0);
  assert.equal(summary.months, 7);
  assert.equal(summary.monthsRemainder, 7);
  assert.equal(summary.remainingDays, 1);
  assert.equal(summary.formatted, '7m 1d');
  assert.equal(summary.formattedYmd, '0 yrs, 7 mos, 1 day');

  const sorted = sortVoyagesChronologically(voyages);
  assert.equal(sorted[0].id, 'v2');

  const multiYear = calculateSeaTime(
    [
      {
        id: 'v3',
        memberId: 'm1',
        vesselName: 'MV Long Haul',
        vesselType: 'Bulk Carrier',
        companyName: 'BSC',
        rankServed: '3rd Officer',
        signOnDate: '2024-01-01',
        signOffDate: '2025-03-01',
        isVisible: true,
      },
    ],
    '2025-03-01'
  );
  assert.equal(multiYear.years, 1);
  assert.equal(multiYear.formattedYmd, '1 yr, 2 mos, 1 day');
});

test('getCertificateExpiryStatus classifies Valid, Expiring Soon (<6m), Expired, and Not Set', () => {
  assert.equal(getCertificateExpiryStatus('', '2026-06-01').status, 'Not Set');
  assert.equal(getCertificateExpiryStatus('2026-05-01', '2026-06-01').status, 'Expired');
  assert.equal(getCertificateExpiryStatus('2026-09-01', '2026-06-01').status, 'Expiring Soon');
  assert.equal(getCertificateExpiryStatus('2028-01-01', '2026-06-01').status, 'Valid');
});

test('computePortalMetrics tallies alumni, verified cadets, and active placements', () => {
  const jobs: JobPosting[] = [
    {
      id: 'j1',
      posterUid: 'm1',
      posterName: 'Capt. Tariqul Islam',
      posterRank: 'Master Mariner',
      posterBatch: '2nd Batch (Founding Batch)',
      companyName: 'BSC',
      rankNeeded: 'Deck Cadet',
      vesselType: 'Bulk Carrier',
      contactInfo: 'crewing@bsc.gov.bd',
      notes: 'Immediate joining',
      status: 'open',
      createdAt: '2026-10-01',
    },
    {
      id: 'j2',
      posterUid: 'm1',
      posterName: 'Capt. Tariqul Islam',
      posterRank: 'Master Mariner',
      posterBatch: '2nd Batch (Founding Batch)',
      companyName: 'BSC',
      rankNeeded: '3rd Officer',
      vesselType: 'Oil Tanker',
      contactInfo: 'crewing@bsc.gov.bd',
      notes: 'Filled',
      status: 'closed',
      createdAt: '2026-09-01',
    },
  ];
  const stats = computePortalMetrics(SAMPLE_MEMBERS, jobs);
  assert.equal(stats.registeredAlumni, 3);
  assert.equal(stats.verifiedCadets, 2);
  assert.equal(stats.activePlacements, 1);
});

test('validation enforces required onboarding steps, photo, CDC, receipted expenses, and dates', () => {
  const baseProfile = {
    fullName: 'Ahsan Rahman',
    photoUrl: 'https://example.com/avatar.jpg',
    cadetNumber: 'BMAS-04-N0108',
    batch: '4th Batch',
    department: 'Nautical' as const,
    cdcNumber: 'C/O/91402',
    currentRank: 'Deck Cadet',
    availabilityStatus: 'Available for Sea' as const,
    bloodGroup: 'O+' as const,
    city: 'Sylhet',
    country: 'Bangladesh',
    cvUrl: '',
    email: 'ahsan@gmail.com',
    phone: '+8801711000000',
    whatsapp: '+8801711000000',
    passportNumber: 'A0123456',
  };

  assert.equal(validateOnboardingStep(1, baseProfile).valid, true);
  assert.equal(validateOnboardingStep(1, { ...baseProfile, bloodGroup: '' }).valid, false);
  assert.equal(validateOnboardingStep(1, { ...baseProfile, photoUrl: '' }).valid, false);

  assert.equal(validateOnboardingStep(2, baseProfile).valid, true);
  assert.equal(validateOnboardingStep(2, { ...baseProfile, cdcNumber: '' }).valid, false);

  // Step 3 is optional when voyage disabled, validated when enabled
  assert.equal(
    validateOnboardingStep(3, baseProfile, {
      enabled: false,
      voyage: {
        vesselName: '',
        vesselType: 'Bulk Carrier',
        companyName: '',
        rankServed: '',
        signOnDate: '',
        signOffDate: '',
      },
    }).valid,
    true
  );

  const missingPhoto = validateProfileInput(
    { ...baseProfile, photoUrl: '' },
    { requirePhoto: true }
  );
  assert.equal(missingPhoto.valid, false);
  assert.ok(missingPhoto.errors.photoUrl);

  const badVoyage = validateVoyageInput({
    vesselName: 'MV Test',
    vesselType: 'Bulk Carrier',
    companyName: 'BSC',
    rankServed: 'Deck Cadet',
    signOnDate: '2025-06-01',
    signOffDate: '2025-05-01',
  });
  assert.equal(badVoyage.valid, false);
  assert.ok(badVoyage.errors.signOffDate);

  const badJob = validateJobInput({
    companyName: '',
    rankNeeded: '',
    vesselType: 'Bulk Carrier',
    contactInfo: 'x',
    notes: 'a'.repeat(1001),
  });
  assert.equal(badJob.valid, false);
  assert.ok(badJob.errors.companyName);
  assert.ok(badJob.errors.notes);

  const badBank = validateBankAccountInput({
    bankName: 'D',
    accountName: '',
    accountNumber: '',
    branchName: '',
    routingNumber: '',
    accountType: 'Bank Account',
    currency: 'BDT',
    notes: '',
  });
  assert.equal(badBank.valid, false);

  const missingExpenseReceipt = validateFundTransactionInput({
    memberUid: '',
    memberName: 'Stationery Vendor',
    memberCadetNumber: '',
    memberBatch: '',
    entryType: 'disbursement',
    amount: '2500',
    category: 'Operational Expense',
    paymentMethod: 'Cash',
    bankAccountLabel: 'Petty Cash',
    referenceNumber: 'VCH-12',
    transactionDateTime: '2026-04-02T14:30',
    notes: 'Printed official circular forms',
    receiptDataUrl: '',
  });
  assert.equal(missingExpenseReceipt.valid, false);
  assert.ok(missingExpenseReceipt.errors.receiptDataUrl);
});

test('share URL, multi-email mailto builder, initials, and Cadet-Number credential serial match spec', () => {
  const url = buildShareableProfileUrl('https://bmas-portal.org', '/', 'm1');
  assert.equal(url, 'https://bmas-portal.org/?member=m1');

  const serial = generateMemberSerial('n-0024', '2nd Batch');
  assert.equal(serial, 'N-0024');

  assert.equal(getInitials('Capt. Tariqul Islam'), 'CI');

  const extracted = extractEmailsFromContact('Send CV to hr@bsc.gov.bd or crewing@bsc.gov.bd');
  assert.deepEqual(extracted, ['hr@bsc.gov.bd', 'crewing@bsc.gov.bd']);

  const mailto = buildInterestMailto(
    {
      id: 'j1',
      posterUid: 'm1',
      posterName: 'Capt. Tariqul Islam',
      posterRank: 'Master Mariner',
      posterBatch: '2nd Batch (Founding Batch)',
      companyName: 'Anglo-Eastern',
      rankNeeded: 'Deck Cadet',
      vesselType: 'Container',
      contactInfo: 'hr@anglo.example, crewing@anglo.example',
      notes: '',
      status: 'open',
      createdAt: '2026-10-01',
    },
    SAMPLE_MEMBERS[1],
    url,
    'ahsan@gmail.com',
    {
      vault: {
        uid: 'm2',
        email: 'ahsan@gmail.com',
        phone: '+8801711000000',
        whatsapp: '+8801711000000',
        academyName: 'Bangladesh Marine Academy Sylhet',
        passportNumber: 'A0999888',
        passportIssueDate: '2023-02-01',
        passportExpiry: '2033-01-31',
        cdcIssueDate: '2024-03-10',
        cdcExpiry: '2029-03-09',
        medicalExpiry: '2027-06-01',
        stcwCocExpiry: '2029-01-01',
        academicQualifications: [
          {
            id: 'q1',
            level: 'HSC',
            institution: 'Sylhet Cadet College',
            boardOrUniversity: 'Sylhet Board',
            passingYear: '2021',
            result: 'GPA 5.00',
          },
        ],
        bankAccountHolder: '',
        bankName: '',
        bankBranch: '',
        bankAccountNumber: '',
        bankRoutingNumber: '',
        mfsNumber: '',
        nokName: '',
        nokRelation: '',
        nokPhone: '',
        nokCity: '',
      },
      voyages: [],
      copCertificates: [
        {
          id: 'c1',
          memberId: 'm2',
          title: 'PSCRB',
          certNumber: 'COP-12',
          issueDate: '2024-04-01',
          expiryDate: '2029-03-31',
          isStandard: true,
        },
      ],
    }
  );
  assert.ok(mailto?.startsWith('mailto:hr%40anglo.example,crewing%40anglo.example?subject=BMASA%20Application'));
  assert.ok(mailto?.includes(encodeURIComponent('BMASA-CV-')));
  assert.ok(mailto?.includes(encodeURIComponent('Official Verification Link')));
});

test('computeFundTotals, buildMemberFundSummaries, and formatters calculate per-member totals & timestamps', () => {
  const txs: FundTransaction[] = [
    {
      id: 'tx1',
      memberUid: 'm1',
      memberName: 'Capt. Tariqul Islam',
      memberCadetNumber: 'BMAS-01-N0012',
      memberBatch: '2nd Batch (Founding Batch)',
      entryType: 'contribution',
      amount: 5000,
      currency: 'BDT',
      category: 'Welfare Fund',
      paymentMethod: 'Bank Transfer',
      bankAccountLabel: 'DBBL',
      referenceNumber: 'REF-101',
      transactionDateTime: '2026-03-15T14:30',
      notes: 'March deposit',
      receiptDataUrl: '',
      isPublished: true,
      recordedByUid: 'admin1',
      recordedByName: 'Razib Uddin',
      recordedByEmail: 'razibuddin247@gmail.com',
    },
    {
      id: 'tx2',
      memberUid: 'm1',
      memberName: 'Capt. Tariqul Islam',
      memberCadetNumber: 'BMAS-01-N0012',
      memberBatch: '2nd Batch (Founding Batch)',
      entryType: 'contribution',
      amount: 2500,
      currency: 'BDT',
      category: 'Cadet Support',
      paymentMethod: 'bKash',
      bankAccountLabel: 'bKash Merchant',
      referenceNumber: 'BK-202',
      transactionDateTime: '2026-04-02T09:15',
      notes: 'April deposit',
      receiptDataUrl: '',
      isPublished: true,
      recordedByUid: 'admin1',
      recordedByName: 'Razib Uddin',
      recordedByEmail: 'razibuddin247@gmail.com',
    },
    {
      id: 'tx3',
      memberUid: '',
      memberName: 'Cadet Medical Grant',
      memberCadetNumber: '',
      memberBatch: '',
      entryType: 'disbursement',
      amount: 1500,
      currency: 'BDT',
      category: 'Cadet Support',
      paymentMethod: 'Bank Transfer',
      bankAccountLabel: 'DBBL',
      referenceNumber: 'OUT-1',
      transactionDateTime: '2026-04-05T16:00',
      notes: 'Approved aid with receipt',
      receiptDataUrl: 'https://example.com/receipt.jpg',
      isPublished: true,
      recordedByUid: 'admin1',
      recordedByName: 'Razib Uddin',
      recordedByEmail: 'razibuddin247@gmail.com',
    },
  ];

  const totals = computeFundTotals(txs);
  assert.equal(totals.totalCollected, 7500);
  assert.equal(totals.totalDisbursed, 1500);
  assert.equal(totals.netBalance, 6000);
  assert.equal(totals.contributingMemberCount, 1);

  const memberSummaries = buildMemberFundSummaries(SAMPLE_MEMBERS, txs);
  assert.equal(memberSummaries.length, 3);
  const capt = memberSummaries.find((s) => s.memberUid === 'm1')!;
  assert.equal(capt.totalContributed, 7500);
  assert.equal(capt.contributionCount, 2);
  assert.equal(capt.lastContributionDateTime, '2026-04-02T09:15');
  assert.equal(capt.lastRecordedByName, 'Razib Uddin');

  const zeroMember = memberSummaries.find((s) => s.memberUid === 'm2')!;
  assert.equal(zeroMember.totalContributed, 0);
  assert.equal(zeroMember.lastContributionDateTime, null);
  assert.equal(zeroMember.lastRecordedByName, null);

  assert.equal(formatBdtAmount(7500), '৳ 7,500');
  assert.match(formatTransactionDateTime('2026-04-02T09:15'), /02 Apr 2026, 09:15 AM/);
});

test('summarizeMemberCertificates combines vault expiries and COP certificates with counts', () => {
  const vault: PrivateVault = {
    uid: 'm1',
    email: 'capt@example.com',
    phone: '+8801711000001',
    whatsapp: '+8801711000001',
    academyName: 'Bangladesh Marine Academy Sylhet',
    passportNumber: 'A1234567',
    passportIssueDate: '2015-01-02',
    bankAccountHolder: '',
    bankName: '',
    bankBranch: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    mfsNumber: '',
    passportExpiry: '2025-01-01', // Expired relative to 2026-06-01
    cdcIssueDate: '2021-09-16',
    cdcExpiry: '2026-09-15', // Expiring Soon (<6 months)
    medicalExpiry: '2028-05-01', // Valid
    stcwCocExpiry: '',
    academicQualifications: [],
    nokName: '',
    nokRelation: '',
    nokPhone: '',
    nokCity: '',
  };

  const cops: CopCertificate[] = [
    {
      id: 'cop1',
      memberId: 'm1',
      title: 'PSCRB (Survival Craft & Rescue Boats)',
      certNumber: 'COP-8812',
      issueDate: '2021-08-02',
      expiryDate: '2026-08-01', // Expiring Soon
      isStandard: true,
    },
    {
      id: 'cop2',
      memberId: 'm1',
      title: 'GMDSS General Operator',
      certNumber: 'GMDSS-44',
      issueDate: '2024-01-11',
      expiryDate: '2029-01-10', // Valid
      isStandard: false,
    },
  ];

  const summary = summarizeMemberCertificates(vault, cops, '2026-06-01');
  assert.equal(summary.items.length, 6);
  assert.equal(summary.expiredCount, 1);
  assert.equal(summary.expiringSoonCount, 2);
  assert.equal(summary.validCount, 2);
});

test('validateCopCertificateInput, validatePaymentSubmissionInput, and contact href builders work accurately', () => {
  const badCop = validateCopCertificateInput({
    title: 'A',
    certNumber: '123',
    issueDate: '',
    expiryDate: '01-01-2027',
  });
  assert.equal(badCop.valid, false);
  assert.ok(badCop.errors.title);
  assert.ok(badCop.errors.expiryDate);

  const badCopChrono = validateCopCertificateInput({
    title: 'PSCRB',
    certNumber: 'PS-11',
    issueDate: '2028-01-01',
    expiryDate: '2027-01-01',
  });
  assert.equal(badCopChrono.valid, false);
  assert.ok(badCopChrono.errors.expiryDate);

  const goodCop = validateCopCertificateInput({
    title: 'Advanced Fire Fighting (AFF)',
    certNumber: 'AFF-2026',
    issueDate: '2023-12-31',
    expiryDate: '2028-12-31',
  });
  assert.equal(goodCop.valid, true);

  const missingTrxAndReceipt = validatePaymentSubmissionInput({
    amount: '2500',
    category: 'Monthly Subscription',
    paymentMethod: 'bKash',
    bankAccountLabel: 'bKash Merchant',
    referenceNumber: '',
    transactionDateTime: '2026-05-10T10:30',
    notes: 'Subscription',
    receiptDataUrl: '',
  });
  assert.equal(missingTrxAndReceipt.valid, false);
  assert.ok(missingTrxAndReceipt.errors.referenceNumber);
  assert.ok(missingTrxAndReceipt.errors.receiptDataUrl);

  const validPayment = validatePaymentSubmissionInput({
    amount: '2500',
    category: 'Dhaka Office Fund',
    paymentMethod: 'bKash',
    bankAccountLabel: 'bKash Merchant',
    referenceNumber: 'BK981234',
    transactionDateTime: '2026-05-10T10:30',
    notes: 'Dhaka office contribution',
    receiptDataUrl: 'https://example.com/receipt.png',
  });
  assert.equal(validPayment.valid, true);

  assert.equal(
    buildMemberMailtoHref('cadets@bmasa.org', {
      fullName: 'Ahsan Rahman',
      cadetNumber: 'BMAS-04-N0108',
    }),
    'mailto:cadets%40bmasa.org?subject=BMASA%20Member%20Contact%20%E2%80%94%20Ahsan%20Rahman%20(BMAS-04-N0108)'
  );
  assert.equal(buildMemberMailtoHref('invalid', SAMPLE_MEMBERS[0]), null);
  assert.equal(buildMemberTelHref('+880 1711-000001'), 'tel:+8801711000001');
  assert.equal(buildMemberTelHref('123'), null);
});

test('historyNavigation parses tabs, sections, shared members, and builds URLs preserving e2e param', () => {
  assert.equal(isValidPortalTab('directory'), true);
  assert.equal(isValidPortalTab('invalid-tab'), false);

  assert.equal(readTabFromSearch('?e2e=admin&tab=funds'), 'funds');
  assert.equal(readTabFromSearch('?e2e=admin&tab=unknown'), 'credential');
  assert.equal(readSectionFromSearch('?tab=profile&section=certificates'), 'certificates');
  assert.equal(readSectionFromSearch('?tab=profile'), null);
  assert.equal(readSharedMemberFromSearch('?member=m123'), 'm123');

  const nextDir = buildPortalUrl('http://localhost:3000/?e2e=admin', {
    tab: 'directory',
    section: null,
    memberId: null,
  });
  assert.equal(nextDir, '/?e2e=admin&tab=directory');

  const backToHome = buildPortalUrl('http://localhost:3000/?e2e=admin&tab=community&section=crewing', {
    tab: 'credential',
    section: null,
    memberId: null,
  });
  assert.equal(backToHome, '/?e2e=admin');
});

test('sortAndFilterNotices filters by noticeType and sorts by newest, oldest, title, and type', () => {
  const sampleNotices: NoticeItem[] = [
    {
      id: 'n1',
      title: 'ECDIS Bridge Circular',
      noticeType: 'Nautical',
      category: 'General Circular',
      body: 'Updated bridge team navigation circular for deck officers.',
      attachmentUrl: '',
      isPinned: false,
      isPublished: true,
      authorUid: 'admin1',
      authorName: 'Razib Uddin',
      createdAt: '2026-04-05T10:00:00.000Z',
    },
    {
      id: 'n2',
      title: 'Annual General Meeting Call',
      noticeType: 'General',
      category: 'AGM Notice',
      body: 'Official BMASA annual general meeting notice for all alumni batches.',
      attachmentUrl: '',
      isPinned: true,
      isPublished: true,
      authorUid: 'admin1',
      authorName: 'Razib Uddin',
      createdAt: '2026-04-01T10:00:00.000Z',
    },
    {
      id: 'n3',
      title: 'ME-GI Main Engine Bulletin',
      noticeType: 'Engineering',
      category: 'General Circular',
      body: 'Technical bulletin covering dual-fuel engine maintenance checks.',
      attachmentUrl: '',
      isPinned: false,
      isPublished: true,
      authorUid: 'admin1',
      authorName: 'Razib Uddin',
      createdAt: '2026-04-10T10:00:00.000Z',
    },
  ];

  // Default newest: pinned circular first, then newest unpinned
  const newest = sortAndFilterNotices(sampleNotices, { sortBy: 'newest', noticeType: 'All' });
  assert.deepEqual(
    newest.map((n) => n.id),
    ['n2', 'n3', 'n1']
  );

  // Oldest published first
  const oldest = sortAndFilterNotices(sampleNotices, { sortBy: 'oldest', noticeType: 'All' });
  assert.deepEqual(
    oldest.map((n) => n.id),
    ['n2', 'n1', 'n3']
  );

  // Alphabetical Title (A-Z)
  const byTitle = sortAndFilterNotices(sampleNotices, { sortBy: 'title_asc', noticeType: 'All' });
  assert.deepEqual(
    byTitle.map((n) => n.id),
    ['n2', 'n1', 'n3']
  );

  // By notice type (Nautical -> Engineering -> General)
  const byType = sortAndFilterNotices(sampleNotices, { sortBy: 'type', noticeType: 'All' });
  assert.deepEqual(
    byType.map((n) => n.id),
    ['n1', 'n3', 'n2']
  );

  // Filter strictly by noticeType
  const engOnly = sortAndFilterNotices(sampleNotices, {
    sortBy: 'newest',
    noticeType: 'Engineering',
  });
  assert.deepEqual(
    engOnly.map((n) => n.id),
    ['n3']
  );

  // Notice validation requires valid noticeType
  assert.equal(
    validateNoticeInput({
      title: 'Valid Notice Title',
      noticeType: 'Engineering',
      category: 'General Circular',
      body: 'Complete circular content exceeding minimum length.',
      attachmentUrl: '',
      isPinned: false,
    }).valid,
    true
  );
  assert.equal(
    validateNoticeInput({
      title: 'Valid Notice Title',
      noticeType: 'Deck' as never,
      category: 'General Circular',
      body: 'Complete circular content exceeding minimum length.',
      attachmentUrl: '',
      isPinned: false,
    }).valid,
    false
  );
});

test('Instructors directory filtering, simplified instructor validation (no CDC/certificates), and lat/long formatter work accurately', () => {
  const membersWithInstructor: DirectoryProfile[] = [
    ...SAMPLE_MEMBERS,
    {
      uid: 'inst1',
      fullName: 'Capt. Humayun Kabir',
      photoUrl: '',
      cadetNumber: 'BMAS-INST',
      batch: '2nd Batch (Founding Batch)',
      department: 'Instructors',
      cdcNumber: '',
      currentRank: 'Chief Officer',
      availabilityStatus: 'Shore-Based',
      bloodGroup: '',
      city: 'Sylhet',
      country: 'Bangladesh',
      cvUrl: '',
      memberSerial: 'BMAS-INST',
      isVerified: true,
      isPublicDirectory: true,
      voyageCount: 0,
      contactEmail: 'humayun@bmas.edu.bd',
      contactPhone: '+8801711889900',
      additionalInfo: 'Senior COLREGs and Bridge Watchkeeping Instructor at BMAS.',
    },
  ];

  const instructorsOnly = filterDirectoryMembers(membersWithInstructor, {
    query: '',
    batch: 'All',
    department: 'Instructors',
    rank: 'All',
    availability: 'All',
  });
  assert.equal(instructorsOnly.length, 1);
  assert.equal(instructorsOnly[0].uid, 'inst1');

  const searchByAdditionalInfo = filterDirectoryMembers(membersWithInstructor, {
    query: 'COLREGs',
    batch: 'All',
    department: 'Instructors',
    rank: 'All',
    availability: 'All',
  });
  assert.equal(searchByAdditionalInfo.length, 1);
  assert.equal(searchByAdditionalInfo[0].uid, 'inst1');

  // Instructor onboarding passes with only Name, Batch, Rank, Phone, Email, Photo, Additional Info (no CDC/Cadet/Certificates)
  const validInstructor = validateInstructorOnboardingInput({
    fullName: 'Capt. Humayun Kabir',
    photoUrl: 'https://example.com/instructor.jpg',
    cadetNumber: '',
    batch: '2nd Batch (Founding Batch)',
    department: 'Instructors',
    cdcNumber: '',
    currentRank: 'Third Officer',
    availabilityStatus: 'Shore-Based',
    bloodGroup: '',
    city: '',
    country: 'Bangladesh',
    cvUrl: '',
    email: 'humayun@bmas.edu.bd',
    phone: '+8801711889900',
    whatsapp: '+8801711889900',
    additionalInfo: 'Senior Nautical Instructor at Bangladesh Marine Academy, Sylhet.',
    isInstructor: true,
  });
  assert.equal(validInstructor.valid, true);

  // Instructor validation still requires photo and phone
  const missingInstructorPhoto = validateInstructorOnboardingInput({
    fullName: 'Capt. Humayun Kabir',
    photoUrl: '',
    cadetNumber: '',
    batch: '2nd Batch (Founding Batch)',
    department: 'Instructors',
    cdcNumber: '',
    currentRank: 'Senior Instructor',
    availabilityStatus: 'Shore-Based',
    bloodGroup: '',
    city: '',
    country: 'Bangladesh',
    cvUrl: '',
    email: 'humayun@bmas.edu.bd',
    phone: '+8801711889900',
    whatsapp: '+8801711889900',
    isInstructor: true,
  });
  assert.equal(missingInstructorPhoto.valid, false);
  assert.ok(missingInstructorPhoto.errors.photoUrl);

  // Lat/Long formatting helper
  const sylhetPos = formatLatLongReadout(24.8949, 91.8687);
  assert.equal(sylhetPos.latFormatted, '24.8949° N');
  assert.equal(sylhetPos.lonFormatted, '91.8687° E');
  assert.equal(sylhetPos.combined, '24.8949° N, 91.8687° E');

  const southWestPos = formatLatLongReadout(-33.8688, -70.6693);
  assert.equal(southWestPos.combined, '33.8688° S, 70.6693° W');
});

test('cleanBatchLabel strips legacy Founding suffixes, SID search matches directory, and Job/Manning application payloads embed CV & Digital ID URL', () => {
  assert.equal(cleanBatchLabel('2nd Batch (Founding Batch)'), '2nd Batch');
  assert.equal(cleanBatchLabel('2nd Batch (Founding)'), '2nd Batch');
  assert.equal(cleanBatchLabel('4th Batch'), '4th Batch');

  const memberWithSid: DirectoryProfile = {
    ...SAMPLE_MEMBERS[0],
    batch: '2nd Batch',
    sidNumber: 'BGD-SID-550912',
  };

  // Search by SID Card Number
  const sidMatches = filterDirectoryMembers([memberWithSid, SAMPLE_MEMBERS[1]], {
    query: '550912',
    batch: 'All',
    department: 'All',
    rank: 'All',
    availability: 'All',
  });
  assert.equal(sidMatches.length, 1);
  assert.equal(sidMatches[0].uid, memberWithSid.uid);

  const shareUrl = buildShareableProfileUrl('https://bmasa-portal.org', '/', memberWithSid.uid);

  // Job application payload includes cover note and ID Card URL (CV attached separately)
  const jobPayload = buildJobApplicationPayload({
    job: {
      companyName: 'Bangladesh Shipping Corporation',
      rankNeeded: 'Chief Officer',
      vesselType: 'Bulk Carrier',
      contactInfo: 'crewing@bsc.gov.bd',
    },
    member: memberWithSid,
    profileUrl: shareUrl,
    applicantEmail: 'zahid@bmasa.org',
  });
  assert.deepEqual(jobPayload.emails, ['crewing@bsc.gov.bd']);
  assert.ok(jobPayload.plainTextBody.includes(shareUrl));
  assert.ok(jobPayload.plainTextBody.includes('BMASA-CV-'));
  assert.ok(jobPayload.mailtoHref?.startsWith('mailto:crewing%40bsc.gov.bd?'));

  // Manning agency single & bulk application payloads include Rank, Salary, ID URL, and BCC for bulk
  const singleAgency = buildManningAgencyApplicationPayload({
    agencies: [{ companyName: 'Sylhet Marine Manning Ltd', contactEmail: 'crew@sylhetmarine.com' }],
    selectedRank: 'Chief Officer',
    expectedSalary: 'USD 8,500 / month',
    member: memberWithSid,
    profileUrl: shareUrl,
    applicantEmail: 'zahid@bmasa.org',
  });
  assert.ok(singleAgency.plainTextBody.includes('Applied Rank / Position: Chief Officer'));
  assert.ok(singleAgency.plainTextBody.includes('Expected / Estimated Salary: USD 8,500 / month'));
  assert.ok(singleAgency.plainTextBody.includes(shareUrl));
  assert.ok(singleAgency.plainTextBody.includes('Attached CV (PDF):'));
  assert.ok(singleAgency.mailtoHref?.startsWith('mailto:crew%40sylhetmarine.com?'));

  const bulkAgencies = buildManningAgencyApplicationPayload({
    agencies: [
      { companyName: 'Agency One', contactEmail: 'one@agency.com' },
      { companyName: 'Agency Two', contactEmail: 'two@agency.com' },
    ],
    selectedRank: '2nd Officer',
    expectedSalary: 'USD 4,200 / month',
    member: memberWithSid,
    profileUrl: shareUrl,
  });
  assert.equal(bulkAgencies.companyNames.length, 2);
  assert.deepEqual(bulkAgencies.emails, ['one@agency.com', 'two@agency.com']);
  assert.ok(bulkAgencies.mailtoHref?.includes('bcc=one%40agency.com,two%40agency.com'));
});

test('Job and Manning application payloads reference attached PDF CV and omit plain-text CV dump when cvPdfFilename is supplied', () => {
  const memberWithSid: DirectoryProfile = {
    ...SAMPLE_MEMBERS[0],
    batch: '2nd Batch',
    sidNumber: 'BGD-SID-550912',
  };
  const shareUrl = buildShareableProfileUrl('https://bmasa-portal.org', '/', memberWithSid.uid);
  const pdfName = 'BMASA-CV-BMAS-02-0101.pdf';

  const jobPdfPayload = buildJobApplicationPayload({
    job: {
      companyName: 'Bangladesh Shipping Corporation',
      rankNeeded: 'Chief Officer',
      vesselType: 'Bulk Carrier',
      contactInfo: 'crewing@bsc.gov.bd',
    },
    member: memberWithSid,
    profileUrl: shareUrl,
    applicantEmail: 'zahid@bmasa.org',
    cvPdfFilename: pdfName,
  });

  assert.ok(jobPdfPayload.plainTextBody.includes(`in PDF format (${pdfName})`));
  assert.ok(jobPdfPayload.plainTextBody.includes(shareUrl));
  assert.equal(jobPdfPayload.plainTextBody.includes('--- AUTO-GENERATED SEAFARER CURRICULUM VITAE ---'), false);
  assert.equal(jobPdfPayload.plainTextBody.includes('Applicant Seafarer CV & Credential Summary:'), false);

  const manningPdfPayload = buildManningAgencyApplicationPayload({
    agencies: [{ companyName: 'Sylhet Marine Manning Ltd', contactEmail: 'crew@sylhetmarine.com' }],
    selectedRank: 'Chief Officer',
    expectedSalary: 'USD 8,500 / month',
    member: memberWithSid,
    profileUrl: shareUrl,
    applicantEmail: 'zahid@bmasa.org',
    cvPdfFilename: pdfName,
  });

  assert.ok(manningPdfPayload.plainTextBody.includes(`Attached CV (PDF): ${pdfName}`));
  assert.equal(manningPdfPayload.plainTextBody.includes('--- AUTO-GENERATED SEAFARER CURRICULUM VITAE ---'), false);
});


