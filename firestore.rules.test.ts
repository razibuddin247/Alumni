import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  emailToAdminDocId,
  SCHEMA_BOUNDS,
  validateAdminEmailInput,
  validateBankAccountInput,
  validateCrewingCompanyInput,
  validateDhakaRoadmapInput,
  validateFundTransactionInput,
  validateJobInput,
  validateMentorshipInput,
  validateNoticeInput,
  validateProfileInput,
  validateVoyageInput,
} from './src/utils/validation';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules enforces Phase 0 default-deny and covers all 17 blueprint collections', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);

  const expectedMatches = [
    'match /public_profiles/{memberId}',
    'match /private_vault/{memberId}',
    'match /cop_certificates/{certId}',
    'match /directory_profiles/{memberId}',
    'match /member_private/{memberId}',
    'match /voyages/{voyageId}',
    'match /job_postings/{jobId}',
    'match /portal_stats/{statId}',
    'match /admins/{adminId}',
    'match /bank_accounts/{accountId}',
    'match /fund_transactions/{transactionId}',
    'match /payment_submissions/{submissionId}',
    'match /notices/{noticeId}',
    'match /mentorship_posts/{postId}',
    'match /crewing_companies/{companyId}',
    'match /dhaka_office_milestones/{itemId}',
    'match /gallery_photos/{photoId}',
  ];
  for (const m of expectedMatches) {
    assert.ok(rulesText.includes(m), `Missing rules match block: ${m}`);
  }
  // blueprint has 18 paths (17 prior + gallery_photos)
  assert.equal(Object.keys(blueprint.firestore).length, 18);
});

test('Strict Privacy & Split Collection rules block self-verification, shadow fields, private_vault leaks, and email spoofing', () => {
  assert.match(rulesText, /isOwner\(memberId\) && incoming\(\)\.isVerified == false/);
  assert.match(rulesText, /isOwner\(memberId\) &&\s*incoming\(\)\.isVerified == existing\(\)\.isVerified/);
  assert.ok(rulesText.includes('data.keys().hasOnly(['));
  assert.ok(rulesText.includes('affectedKeys().hasOnly(['));

  assert.match(
    rulesText,
    /match \/private_vault\/\{memberId\}\s*\{\s*allow get: if isValidId\(memberId\) && \(isOwner\(memberId\) \|\| isAdmin\(\)\);\s*allow list: if false;/
  );
  assert.match(
    rulesText,
    /match \/cop_certificates\/\{certId\}\s*\{\s*allow get: if isValidId\(memberId\) && isValidId\(certId\) && \(isOwner\(memberId\) \|\| isAdmin\(\)\);\s*allow list: if isValidId\(memberId\) && isOwner\(memberId\);/
  );
  assert.match(
    rulesText,
    /match \/member_private\/\{memberId\}\s*\{\s*allow get: if isValidId\(memberId\) && \(isOwner\(memberId\) \|\| isAdmin\(\)\);\s*allow list: if false;/
  );

  // Public profiles MUST NOT contain passportNumber or bankAccountNumber
  const pubBlock = rulesText.slice(
    rulesText.indexOf('function isValidPublicProfile'),
    rulesText.indexOf('function isValidPrivateVault')
  );
  assert.equal(pubBlock.includes('passportNumber'), false);
  assert.equal(pubBlock.includes('bankAccountNumber'), false);
  assert.equal(pubBlock.includes('contactEmail'), true);
  assert.equal(pubBlock.includes('contactPhone'), true);
  assert.equal(pubBlock.includes('additionalInfo'), true);

  assert.ok(rulesText.includes("'Instructors'"));
  assert.ok(blueprint.entities.PublicProfile.properties.department.enum.includes('Instructors'));
  assert.equal(
    blueprint.entities.PublicProfile.properties.additionalInfo.maxLength,
    SCHEMA_BOUNDS.additionalInfo.max
  );

  assert.match(
    rulesText,
    /function isMainAdmin\(\)\s*\{\s*return isVerifiedUser\(\) &&[\s\S]*request\.auth\.token\.email\.lower\(\) == 'razibuddin247@gmail\.com';/
  );
});

test('Receipts, Admins, Community & Job Board rules enforce RBAC and relational integrity', () => {
  assert.match(rulesText, /function isValidId\(id\)/);
  assert.equal(SCHEMA_BOUNDS.id.pattern.test('../admin'), false);
  assert.equal(SCHEMA_BOUNDS.id.pattern.test(emailToAdminDocId('razibuddin247@gmail.com')), true);
  assert.equal(emailToAdminDocId('Capt.Tariq@Gmail.com'), 'capt_tariq_gmail_com');

  // Job postings: Admin-only
  const jobBlock = rulesText.slice(
    rulesText.indexOf('match /job_postings/{jobId}'),
    rulesText.indexOf('match /portal_stats/{statId}')
  );
  assert.ok(jobBlock.includes('isAdmin();'));
  assert.equal(jobBlock.includes('existing().posterUid == request.auth.uid'), false);

  // Fund transactions: mandatory receipt + notes on disbursement
  const validFundFn = rulesText.slice(
    rulesText.indexOf('function isValidFundTransaction'),
    rulesText.indexOf('function isValidNoticeItem')
  );
  assert.ok(validFundFn.includes('data.receiptDataUrl is string'));
  assert.ok(validFundFn.includes("(data.notes.size() >= 5 && data.receiptDataUrl.size() >= 10)"));
  assert.ok(validFundFn.includes('updatedByName'));

  const fundBlock = rulesText.slice(
    rulesText.indexOf('match /fund_transactions/{transactionId}'),
    rulesText.indexOf('match /payment_submissions/{submissionId}')
  );
  assert.ok(fundBlock.includes('allow list: if isSignedIn() && existing().isPublished == true;'));
  assert.ok(fundBlock.includes('memberProfileExists(incoming().memberUid)'));
  assert.ok(fundBlock.includes('incoming().updatedByUid == request.auth.uid'));
  assert.ok(fundBlock.includes('isAdmin()'));

  // Payment submissions: Member creates own pending proof with receipt; Admin approves/rejects
  const paymentBlock = rulesText.slice(
    rulesText.indexOf('match /payment_submissions/{submissionId}'),
    rulesText.indexOf('match /notices/{noticeId}')
  );
  assert.ok(paymentBlock.includes("incoming().status == 'pending'"));
  assert.ok(paymentBlock.includes('incoming().memberUid == request.auth.uid'));
  assert.ok(paymentBlock.includes('isAdmin()'));

  // Notices & Dhaka Roadmap: Admin-only writes
  const noticeBlock = rulesText.slice(
    rulesText.indexOf('match /notices/{noticeId}'),
    rulesText.indexOf('match /mentorship_posts/{postId}')
  );
  assert.ok(noticeBlock.includes('isAdmin()'));

  const roadmapBlock = rulesText.slice(
    rulesText.indexOf('match /dhaka_office_milestones/{itemId}'),
    rulesText.indexOf('match /gallery_photos/{photoId}')
  );
  assert.ok(roadmapBlock.includes('isAdmin()'));

  const galleryBlock = rulesText.slice(
    rulesText.indexOf('match /gallery_photos/{photoId}')
  );
  assert.ok(galleryBlock.includes('isValidGalleryPhoto(incoming())'));
  assert.ok(galleryBlock.includes('isAdmin()'));

  // Mentorship & Crewing: Verified member create + author/admin edit
  const mentorBlock = rulesText.slice(
    rulesText.indexOf('match /mentorship_posts/{postId}'),
    rulesText.indexOf('match /crewing_companies/{companyId}')
  );
  assert.ok(mentorBlock.includes('isVerifiedMember()'));
  assert.ok(mentorBlock.includes('isOwner(existing().authorUid) || isAdmin()'));

  // Schema synchronicity checks
  assert.equal(
    blueprint.entities.PublicProfile.properties.fullName.maxLength,
    SCHEMA_BOUNDS.fullName.max
  );
  assert.equal(
    blueprint.entities.PrivateVault.properties.passportNumber.maxLength,
    SCHEMA_BOUNDS.passportNumber.max
  );
  assert.equal(
    blueprint.entities.FundTransaction.properties.receiptDataUrl.maxLength,
    SCHEMA_BOUNDS.receiptDataUrl.max
  );
  assert.equal(
    blueprint.entities.NoticeItem.properties.title.maxLength,
    SCHEMA_BOUNDS.noticeTitle.max
  );
  assert.equal(
    blueprint.entities.MentorshipPost.properties.adviceBody.maxLength,
    SCHEMA_BOUNDS.adviceBody.max
  );
  assert.equal(
    blueprint.entities.CrewingCompany.properties.dosLicense.maxLength,
    SCHEMA_BOUNDS.dosLicense.max
  );
  assert.equal(
    blueprint.entities.DhakaRoadmapItem.properties.title.maxLength,
    SCHEMA_BOUNDS.milestoneTitle.max
  );

  // Client validation parity checks
  assert.equal(validateAdminEmailInput({ email: 'not-an-email', displayName: '' }).valid, false);
  assert.equal(
    validateAdminEmailInput({ email: 'officer@gmail.com', displayName: 'Capt. Tariq' }).valid,
    true
  );

  assert.equal(
    validateJobInput({
      companyName: 'Test Shipping',
      rankNeeded: 'Deck Cadet',
      vesselType: 'Bulk Carrier',
      contactInfo: 'hr@test.example',
      notes: 'x'.repeat(1001),
    }).valid,
    false
  );

  assert.equal(
    validateProfileInput({
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
      cvUrl: 'https://drive.google.com/file/d/example',
      email: 'ahsan@bmas.example',
      phone: '+8801711000000',
      whatsapp: '+8801711000000',
      academyName: 'Bangladesh Marine Academy Sylhet',
      passportIssueDate: '2021-01-10',
      passportExpiry: '2031-01-09',
      cdcIssueDate: '2022-02-01',
      cdcExpiry: '2027-01-31',
      academicQualifications: [
        {
          id: 'q1',
          level: 'SSC',
          institution: 'Sylhet Govt Pilot School',
          boardOrUniversity: 'Sylhet',
          passingYear: '2018',
          result: 'GPA 5.00',
        },
      ],
    }).valid,
    true
  );

  // Expiry earlier than issue date must fail
  assert.equal(
    validateProfileInput({
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
      email: 'ahsan@bmas.example',
      phone: '',
      whatsapp: '',
      passportIssueDate: '2028-01-10',
      passportExpiry: '2025-01-09',
    }).valid,
    false
  );

  const privVaultBlock = rulesText.slice(
    rulesText.indexOf('function isValidPrivateVault'),
    rulesText.indexOf('function isValidDirectoryProfile')
  );
  assert.ok(privVaultBlock.includes('academyName'));
  assert.ok(privVaultBlock.includes('passportIssueDate'));
  assert.ok(privVaultBlock.includes('cdcIssueDate'));
  assert.ok(privVaultBlock.includes('academicQualifications'));

  assert.equal(
    validateVoyageInput({
      vesselName: 'MV Banglar Samriddhi',
      vesselType: 'Bulk Carrier',
      companyName: 'Bangladesh Shipping Corporation',
      rankServed: 'Deck Cadet',
      signOnDate: '2025-01-10',
      signOffDate: '2025-07-15',
    }).valid,
    true
  );

  assert.equal(
    validateBankAccountInput({
      bankName: 'Dutch-Bangla Bank PLC',
      accountName: 'BMASA Welfare Fund',
      accountNumber: '101-120-0045891',
      branchName: 'Sylhet',
      routingNumber: '090912345',
      accountType: 'Bank Account',
      currency: 'BDT',
      notes: '',
    }).valid,
    true
  );

  assert.equal(
    validateFundTransactionInput({
      memberUid: 'm1',
      memberName: 'Ahsan Rahman',
      memberCadetNumber: 'BMAS-04-N0108',
      memberBatch: '4th Batch',
      entryType: 'contribution',
      amount: '5000',
      category: 'Monthly Subscription',
      paymentMethod: 'bKash',
      bankAccountLabel: 'bKash Merchant',
      referenceNumber: 'TRX889123',
      transactionDateTime: '2026-04-02T14:30',
      notes: 'April monthly subscription',
      receiptDataUrl: '',
    }).valid,
    true
  );

  // Expense without receipt MUST fail
  assert.equal(
    validateFundTransactionInput({
      memberUid: '',
      memberName: 'Dhaka Secretariat Venue',
      memberCadetNumber: '',
      memberBatch: '',
      entryType: 'disbursement',
      amount: '12000',
      category: 'Dhaka Office Fund',
      paymentMethod: 'Bank Transfer',
      bankAccountLabel: 'DBBL Main',
      referenceNumber: 'INV-902',
      transactionDateTime: '2026-04-02T16:00',
      notes: 'AGM hall booking advance',
      receiptDataUrl: '',
    }).valid,
    false
  );

  assert.equal(
    validateNoticeInput({
      title: 'Annual AGM Circular 2026',
      noticeType: 'Nautical',
      category: 'AGM Notice',
      body: 'All BMASA members are invited to review the 2026 AGM agenda.',
      attachmentUrl: '',
      isPinned: true,
    }).valid,
    true
  );
  assert.equal(
    validateNoticeInput({
      title: 'Annual AGM Circular 2026',
      noticeType: 'InvalidType' as never,
      category: 'AGM Notice',
      body: 'All BMASA members are invited to review the 2026 AGM agenda.',
      attachmentUrl: '',
      isPinned: true,
    }).valid,
    false
  );

  assert.equal(
    validateMentorshipInput({
      examTrack: 'Class 3 / CoC',
      title: 'Oral Prep Checklist',
      adviceBody: 'Review COLREGs rules 1 to 19 and buoyage system A/B before DOS oral.',
      resourceUrl: 'https://dos.gov.bd',
    }).valid,
    true
  );

  assert.equal(
    validateCrewingCompanyInput({
      companyName: 'Eastern Maritime Agencies',
      dosLicense: 'MLA-042',
      fleetType: 'Bulk Carriers & Tankers',
      cadetIntakeStatus: 'Accepting Cadets',
      contactEmail: 'crewing@eastern.example',
      alumniNotes: 'Regular deck & engine cadet intake twice yearly.',
    }).valid,
    true
  );

  assert.equal(
    validateDhakaRoadmapInput({
      itemType: 'milestone',
      title: 'Dhaka Secretariat Lease Deposit',
      subtitle: 'Phase 1 Hub Acquisition',
      personName: '',
      personBatch: '',
      personCadetNo: '',
      status: 'In Progress',
      targetAmountBdt: '1500000',
      raisedAmountBdt: '450000',
      displayOrder: '1',
      notes: 'Member contributions tracked transparently.',
    }).valid,
    true
  );
});
