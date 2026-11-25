import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  db,
  handleFirestoreError,
  isMainAdminEmail,
  MAIN_ADMIN_EMAIL,
  OperationType,
} from '../firebase';
import {
  DEFAULT_ACADEMY_NAME,
  NOTICE_TYPES,
  type AcademicQualification,
  type AdminEntry,
  type BankAccount,
  type BloodGroup,
  type CopCertificate,
  type CrewingCompany,
  type DhakaRoadmapItem,
  type DirectoryProfile,
  type FundTransaction,
  type GalleryPhoto,
  type JobPosting,
  type MentorshipPost,
  type NoticeItem,
  type NoticeType,
  type PaymentSubmission,
  type PaymentSubmissionStatus,
  type PortalStats,
  type PrivateVault,
  type VoyageRecord,
} from '../types/portal';
import {
  emailToAdminDocId,
  generateMemberSerial,
  SCHEMA_BOUNDS,
  type BankAccountFormInput,
  type CopCertificateFormInput,
  type CrewingCompanyFormInput,
  type DhakaRoadmapFormInput,
  type FundTransactionFormInput,
  type JobFormInput,
  type MentorshipFormInput,
  type NoticeFormInput,
  type PaymentSubmissionFormInput,
  type ProfileFormInput,
  type VoyageFormInput,
} from '../utils/validation';
import { cleanBatchLabel } from '../utils/portalLogic';

function tsToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function clampString(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

function mapDirectoryDoc(id: string, data: Record<string, unknown>): DirectoryProfile {
  const cadetNumber = String(data.cadetNumber ?? '');
  return {
    uid: typeof data.uid === 'string' ? data.uid : id,
    fullName: String(data.fullName ?? ''),
    photoUrl: String(data.photoUrl ?? ''),
    cadetNumber,
    batch: cleanBatchLabel(String(data.batch ?? '2nd Batch')) || '2nd Batch',
    department:
      data.department === 'Marine Engineering' || data.department === 'Instructors'
        ? data.department
        : 'Nautical',
    cdcNumber: String(data.cdcNumber ?? ''),
    sidNumber: String(data.sidNumber ?? ''),
    currentRank: String(data.currentRank ?? 'Deck Cadet'),
    availabilityStatus:
      data.availabilityStatus === 'Onboard' ||
      data.availabilityStatus === 'On Leave' ||
      data.availabilityStatus === 'Shore-Based'
        ? data.availabilityStatus
        : 'Available for Sea',
    bloodGroup: (String(data.bloodGroup ?? '') as BloodGroup | '') || '',
    city: String(data.city ?? ''),
    country: String(data.country ?? ''),
    cvUrl: String(data.cvUrl ?? ''),
    memberSerial: cadetNumber || String(data.memberSerial ?? ''),
    isVerified: Boolean(data.isVerified),
    isPublicDirectory: data.isPublicDirectory !== false,
    voyageCount: typeof data.voyageCount === 'number' ? data.voyageCount : 0,
    contactEmail: String(data.contactEmail ?? ''),
    contactPhone: String(data.contactPhone ?? ''),
    additionalInfo: String(data.additionalInfo ?? ''),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function sanitizeAcademicQualifications(raw: unknown): AcademicQualification[] {
  if (!Array.isArray(raw)) return [];
  const out: AcademicQualification[] = [];
  for (const item of raw.slice(0, SCHEMA_BOUNDS.academicQualificationMaxCount)) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const level = clampString(typeof rec.level === 'string' ? rec.level : '', SCHEMA_BOUNDS.academicLevel.max);
    if (!level) continue;
    out.push({
      id: clampString(typeof rec.id === 'string' && rec.id ? rec.id : `qual_${out.length + 1}`, 64),
      level,
      institution: clampString(typeof rec.institution === 'string' ? rec.institution : '', SCHEMA_BOUNDS.academicInstitution.max),
      boardOrUniversity: clampString(typeof rec.boardOrUniversity === 'string' ? rec.boardOrUniversity : '', SCHEMA_BOUNDS.academicBoard.max),
      passingYear: clampString(typeof rec.passingYear === 'string' ? rec.passingYear : '', SCHEMA_BOUNDS.academicYear.max),
      result: clampString(typeof rec.result === 'string' ? rec.result : '', SCHEMA_BOUNDS.academicResult.max),
    });
  }
  return out;
}

function mapPrivateVaultDoc(
  uid: string,
  data: Record<string, unknown>,
  fallbackEmail = ''
): PrivateVault {
  const rawAcademy = typeof data.academyName === 'string' ? data.academyName.trim() : '';
  return {
    uid,
    email: String(data.email ?? fallbackEmail),
    phone: String(data.phone ?? ''),
    whatsapp: String(data.whatsapp ?? ''),
    academyName: rawAcademy || DEFAULT_ACADEMY_NAME,
    passportNumber: String(data.passportNumber ?? ''),
    passportIssueDate: String(data.passportIssueDate ?? ''),
    bankAccountHolder: String(data.bankAccountHolder ?? ''),
    bankName: String(data.bankName ?? ''),
    bankBranch: String(data.bankBranch ?? ''),
    bankAccountNumber: String(data.bankAccountNumber ?? ''),
    bankRoutingNumber: String(data.bankRoutingNumber ?? ''),
    mfsNumber: String(data.mfsNumber ?? ''),
    passportExpiry: String(data.passportExpiry ?? ''),
    cdcIssueDate: String(data.cdcIssueDate ?? ''),
    cdcExpiry: String(data.cdcExpiry ?? ''),
    medicalExpiry: String(data.medicalExpiry ?? ''),
    stcwCocExpiry: String(data.stcwCocExpiry ?? ''),
    academicQualifications: sanitizeAcademicQualifications(data.academicQualifications),
    nokName: String(data.nokName ?? ''),
    nokRelation: String(data.nokRelation ?? ''),
    nokPhone: String(data.nokPhone ?? ''),
    nokCity: String(data.nokCity ?? ''),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapVoyageDoc(
  id: string,
  memberId: string,
  data: Record<string, unknown>
): VoyageRecord {
  return {
    id,
    memberId: typeof data.memberId === 'string' ? data.memberId : memberId,
    vesselName: String(data.vesselName ?? ''),
    vesselType: (data.vesselType as VoyageRecord['vesselType']) ?? 'Bulk Carrier',
    companyName: String(data.companyName ?? ''),
    rankServed: String(data.rankServed ?? ''),
    signOnDate: String(data.signOnDate ?? ''),
    signOffDate: String(data.signOffDate ?? ''),
    isVisible: data.isVisible !== false,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapJobDoc(id: string, data: Record<string, unknown>): JobPosting {
  return {
    id,
    posterUid: String(data.posterUid ?? ''),
    posterName: String(data.posterName ?? ''),
    posterRank: String(data.posterRank ?? ''),
    posterBatch: String(data.posterBatch ?? ''),
    companyName: String(data.companyName ?? ''),
    rankNeeded: String(data.rankNeeded ?? ''),
    vesselType: (data.vesselType as JobPosting['vesselType']) ?? 'Bulk Carrier',
    contactInfo: String(data.contactInfo ?? ''),
    notes: String(data.notes ?? ''),
    status: data.status === 'closed' ? 'closed' : 'open',
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapAdminDoc(id: string, data: Record<string, unknown>): AdminEntry {
  return {
    id,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? ''),
    addedByEmail: String(data.addedByEmail ?? MAIN_ADMIN_EMAIL),
    role: 'admin',
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapBankAccountDoc(id: string, data: Record<string, unknown>): BankAccount {
  return {
    id,
    bankName: String(data.bankName ?? ''),
    accountName: String(data.accountName ?? ''),
    accountNumber: String(data.accountNumber ?? ''),
    branchName: String(data.branchName ?? ''),
    routingNumber: String(data.routingNumber ?? ''),
    accountType:
      data.accountType === 'Mobile Banking' || data.accountType === 'Fixed Deposit'
        ? data.accountType
        : 'Bank Account',
    currency: data.currency === 'USD' ? 'USD' : 'BDT',
    notes: String(data.notes ?? ''),
    isActive: data.isActive !== false,
    addedByUid: String(data.addedByUid ?? ''),
    addedByName: String(data.addedByName ?? ''),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapFundTransactionDoc(id: string, data: Record<string, unknown>): FundTransaction {
  return {
    id,
    memberUid: String(data.memberUid ?? ''),
    memberName: String(data.memberName ?? ''),
    memberCadetNumber: String(data.memberCadetNumber ?? ''),
    memberBatch: String(data.memberBatch ?? ''),
    entryType: data.entryType === 'disbursement' ? 'disbursement' : 'contribution',
    amount: Number(data.amount ?? 0),
    currency: 'BDT',
    category: (data.category as FundTransaction['category']) ?? 'Other',
    paymentMethod: (data.paymentMethod as FundTransaction['paymentMethod']) ?? 'Bank Transfer',
    bankAccountLabel: String(data.bankAccountLabel ?? ''),
    referenceNumber: String(data.referenceNumber ?? ''),
    transactionDateTime: String(data.transactionDateTime ?? ''),
    notes: String(data.notes ?? ''),
    receiptDataUrl: String(data.receiptDataUrl ?? ''),
    isPublished: data.isPublished !== false,
    recordedByUid: String(data.recordedByUid ?? ''),
    recordedByName: String(data.recordedByName ?? ''),
    recordedByEmail: String(data.recordedByEmail ?? ''),
    updatedByUid: data.updatedByUid ? String(data.updatedByUid) : undefined,
    updatedByName: data.updatedByName ? String(data.updatedByName) : undefined,
    updatedByEmail: data.updatedByEmail ? String(data.updatedByEmail) : undefined,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapNoticeDoc(id: string, data: Record<string, unknown>): NoticeItem {
  const rawType = typeof data.noticeType === 'string' ? (data.noticeType as NoticeType) : null;
  const noticeType: NoticeType = rawType && NOTICE_TYPES.includes(rawType) ? rawType : 'General';
  return {
    id,
    title: String(data.title ?? ''),
    noticeType,
    category: (data.category as NoticeItem['category']) ?? 'General Circular',
    body: String(data.body ?? ''),
    attachmentUrl: String(data.attachmentUrl ?? ''),
    isPinned: Boolean(data.isPinned),
    isPublished: data.isPublished !== false,
    authorUid: String(data.authorUid ?? ''),
    authorName: String(data.authorName ?? ''),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapMentorshipDoc(id: string, data: Record<string, unknown>): MentorshipPost {
  return {
    id,
    authorUid: String(data.authorUid ?? ''),
    authorName: String(data.authorName ?? ''),
    authorRank: String(data.authorRank ?? ''),
    authorBatch: String(data.authorBatch ?? ''),
    authorVerified: Boolean(data.authorVerified),
    examTrack: (data.examTrack as MentorshipPost['examTrack']) ?? 'Class 3 / CoC',
    title: String(data.title ?? ''),
    adviceBody: String(data.adviceBody ?? ''),
    resourceUrl: String(data.resourceUrl ?? ''),
    isPublished: data.isPublished !== false,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapCrewingDoc(id: string, data: Record<string, unknown>): CrewingCompany {
  return {
    id,
    companyName: String(data.companyName ?? ''),
    dosLicense: String(data.dosLicense ?? ''),
    fleetType: String(data.fleetType ?? ''),
    cadetIntakeStatus:
      (data.cadetIntakeStatus as CrewingCompany['cadetIntakeStatus']) ?? 'Accepting Cadets',
    contactEmail: String(data.contactEmail ?? ''),
    alumniNotes: String(data.alumniNotes ?? ''),
    authorUid: String(data.authorUid ?? ''),
    authorName: String(data.authorName ?? ''),
    authorVerified: Boolean(data.authorVerified),
    isPublished: data.isPublished !== false,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function mapDhakaRoadmapDoc(id: string, data: Record<string, unknown>): DhakaRoadmapItem {
  return {
    id,
    itemType: data.itemType === 'committee' ? 'committee' : 'milestone',
    title: String(data.title ?? ''),
    subtitle: String(data.subtitle ?? ''),
    personName: String(data.personName ?? ''),
    personBatch: String(data.personBatch ?? ''),
    personCadetNo: String(data.personCadetNo ?? ''),
    status: (data.status as DhakaRoadmapItem['status']) ?? 'Planned',
    targetAmountBdt: Number(data.targetAmountBdt ?? 0),
    raisedAmountBdt: Number(data.raisedAmountBdt ?? 0),
    displayOrder: Number(data.displayOrder ?? 1),
    notes: String(data.notes ?? ''),
    isPublished: data.isPublished !== false,
    updatedByUid: String(data.updatedByUid ?? ''),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function fetchPortalStats(): Promise<PortalStats | null> {
  const path = 'portal_stats/summary';
  try {
    const snap = await getDoc(doc(db, 'portal_stats', 'summary'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      registeredAlumni: Number(data.registeredAlumni ?? 0),
      verifiedCadets: Number(data.verifiedCadets ?? 0),
      activePlacements: Number(data.activePlacements ?? 0),
    };
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      return null;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncPortalStats(stats: PortalStats): Promise<void> {
  const path = 'portal_stats/summary';
  try {
    await setDoc(doc(db, 'portal_stats', 'summary'), {
      registeredAlumni: Math.max(0, Math.floor(stats.registeredAlumni)),
      verifiedCadets: Math.max(0, Math.floor(stats.verifiedCadets)),
      activePlacements: Math.max(0, Math.floor(stats.activePlacements)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkUserIsAdmin(
  user: User
): Promise<{ isMainAdmin: boolean; isAdmin: boolean }> {
  if (!user.emailVerified) {
    return { isMainAdmin: false, isAdmin: false };
  }
  if (isMainAdminEmail(user.email)) {
    return { isMainAdmin: true, isAdmin: true };
  }
  try {
    if (user.email) {
      const emailKey = emailToAdminDocId(user.email);
      const emailSnap = await getDoc(doc(db, 'admins', emailKey));
      if (emailSnap.exists()) {
        return { isMainAdmin: false, isAdmin: true };
      }
    }
    const uidSnap = await getDoc(doc(db, 'admins', user.uid));
    return { isMainAdmin: false, isAdmin: uidSnap.exists() };
  } catch {
    return { isMainAdmin: false, isAdmin: false };
  }
}

export async function fetchExistingMemberRecords(
  user: User
): Promise<{ profile: DirectoryProfile | null; contact: PrivateVault | null }> {
  const publicPath = `public_profiles/${user.uid}`;
  const vaultPath = `private_vault/${user.uid}`;

  let profile: DirectoryProfile | null = null;
  let contact: PrivateVault | null = null;

  let pubRawData: Record<string, unknown> | null = null;

  try {
    const pubSnap = await getDoc(doc(db, 'public_profiles', user.uid));
    if (pubSnap.exists()) {
      pubRawData = pubSnap.data() as Record<string, unknown>;
      profile = mapDirectoryDoc(pubSnap.id, pubRawData);
    } else {
      const legacySnap = await getDoc(doc(db, 'directory_profiles', user.uid));
      if (legacySnap.exists()) {
        profile = mapDirectoryDoc(legacySnap.id, legacySnap.data() as Record<string, unknown>);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, publicPath);
  }

  try {
    const vaultSnap = await getDoc(doc(db, 'private_vault', user.uid));
    if (vaultSnap.exists()) {
      contact = mapPrivateVaultDoc(
        user.uid,
        vaultSnap.data() as Record<string, unknown>,
        user.email ?? ''
      );
    } else {
      const legacyPrivateSnap = await getDoc(doc(db, 'member_private', user.uid));
      if (legacyPrivateSnap.exists()) {
        contact = mapPrivateVaultDoc(
          user.uid,
          legacyPrivateSnap.data() as Record<string, unknown>,
          user.email ?? ''
        );
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, vaultPath);
  }

  if (
    profile &&
    pubRawData &&
    user.emailVerified &&
    !('contactEmail' in pubRawData) &&
    !('contactPhone' in pubRawData)
  ) {
    const backfillEmail = clampString(contact?.email || user.email || '', SCHEMA_BOUNDS.email.max);
    const backfillPhone = clampString(
      contact?.whatsapp || contact?.phone || '',
      SCHEMA_BOUNDS.phone.max
    );
    if (backfillEmail || backfillPhone) {
      try {
        await updateDoc(doc(db, 'public_profiles', user.uid), {
          contactEmail: backfillEmail,
          contactPhone: backfillPhone,
          updatedAt: serverTimestamp(),
        });
        profile = {
          ...profile,
          contactEmail: backfillEmail,
          contactPhone: backfillPhone,
        };
      } catch {
        // Ignore if rules block unverified or legacy write
      }
    }
  }

  return { profile, contact };
}

export async function adminFetchMemberPrivateVault(
  memberId: string
): Promise<PrivateVault | null> {
  const vaultPath = `private_vault/${memberId}`;
  try {
    const snap = await getDoc(doc(db, 'private_vault', memberId));
    if (snap.exists()) {
      return mapPrivateVaultDoc(memberId, snap.data() as Record<string, unknown>);
    }
    const legacySnap = await getDoc(doc(db, 'member_private', memberId));
    if (legacySnap.exists()) {
      return mapPrivateVaultDoc(memberId, legacySnap.data() as Record<string, unknown>);
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, vaultPath);
  }
}

function buildVaultFields(userEmailFallback: string, input: ProfileFormInput) {
  const academyName = clampString(input.academyName?.trim() || DEFAULT_ACADEMY_NAME, SCHEMA_BOUNDS.academyName.max);
  return {
    email: clampString(input.email || userEmailFallback, SCHEMA_BOUNDS.email.max),
    phone: clampString(input.phone, SCHEMA_BOUNDS.phone.max),
    whatsapp: clampString(input.whatsapp, SCHEMA_BOUNDS.whatsapp.max),
    academyName,
    passportNumber: clampString(input.passportNumber, SCHEMA_BOUNDS.passportNumber.max),
    passportIssueDate: clampString(input.passportIssueDate, 10),
    bankAccountHolder: clampString(input.bankAccountHolder, SCHEMA_BOUNDS.bankAccountHolder.max),
    bankName: clampString(input.bankName, SCHEMA_BOUNDS.bankName.max),
    bankBranch: clampString(input.bankBranch, SCHEMA_BOUNDS.bankBranch.max),
    bankAccountNumber: clampString(input.bankAccountNumber, SCHEMA_BOUNDS.vaultAccountNumber.max),
    bankRoutingNumber: clampString(input.bankRoutingNumber, SCHEMA_BOUNDS.routingNumber.max),
    mfsNumber: clampString(input.mfsNumber, SCHEMA_BOUNDS.mfsNumber.max),
    passportExpiry: clampString(input.passportExpiry, 10),
    cdcIssueDate: clampString(input.cdcIssueDate, 10),
    cdcExpiry: clampString(input.cdcExpiry, 10),
    medicalExpiry: clampString(input.medicalExpiry, 10),
    stcwCocExpiry: clampString(input.stcwCocExpiry, 10),
    academicQualifications: sanitizeAcademicQualifications(input.academicQualifications),
    nokName: clampString(input.nokName, SCHEMA_BOUNDS.nokName.max),
    nokRelation: clampString(input.nokRelation, SCHEMA_BOUNDS.nokRelation.max),
    nokPhone: clampString(input.nokPhone, SCHEMA_BOUNDS.nokPhone.max),
    nokCity: clampString(input.nokCity, SCHEMA_BOUNDS.nokCity.max),
  };
}

export async function completeMemberRegistration(
  user: User,
  input: ProfileFormInput,
  asAdmin = false
): Promise<{ profile: DirectoryProfile; contact: PrivateVault }> {
  const publicPath = `public_profiles/${user.uid}`;
  const vaultPath = `private_vault/${user.uid}`;

  const isInstructor = Boolean(input.isInstructor || input.department === 'Instructors');
  const rawCadet = clampString(input.cadetNumber, SCHEMA_BOUNDS.cadetNumber.max);
  const cadetNumber = rawCadet || (isInstructor ? 'BMAS-INST' : '');
  const batch = cleanBatchLabel(clampString(input.batch, SCHEMA_BOUNDS.batch.max));
  const memberSerial = generateMemberSerial(cadetNumber, batch);
  const additionalInfo = clampString(input.additionalInfo, SCHEMA_BOUNDS.additionalInfo.max);

  const existingPublicSnap = await getDoc(doc(db, 'public_profiles', user.uid));
  const existingVaultSnap = await getDoc(doc(db, 'private_vault', user.uid));

  const showContact = input.showContactInDirectory !== false;
  const contactEmail = showContact
    ? clampString(input.email || user.email || '', SCHEMA_BOUNDS.email.max)
    : '';
  const contactPhone = showContact
    ? clampString(input.whatsapp || input.phone, SCHEMA_BOUNDS.phone.max)
    : '';

  const publicPayload = {
    uid: user.uid,
    fullName: clampString(input.fullName, SCHEMA_BOUNDS.fullName.max),
    photoUrl: clampString(input.photoUrl, SCHEMA_BOUNDS.photoUrl.max),
    cadetNumber,
    batch,
    department: isInstructor ? ('Instructors' as const) : input.department,
    cdcNumber: clampString(input.cdcNumber, SCHEMA_BOUNDS.cdcNumber.max),
    sidNumber: clampString(input.sidNumber, SCHEMA_BOUNDS.sidNumber.max),
    currentRank: clampString(input.currentRank, SCHEMA_BOUNDS.currentRank.max),
    availabilityStatus: input.availabilityStatus,
    bloodGroup: input.bloodGroup || '',
    city: clampString(input.city, SCHEMA_BOUNDS.city.max),
    country: clampString(input.country, SCHEMA_BOUNDS.country.max),
    cvUrl: clampString(input.cvUrl, SCHEMA_BOUNDS.cvUrl.max),
    memberSerial,
    isPublicDirectory: true,
    voyageCount: existingPublicSnap.exists()
      ? Number(existingPublicSnap.data().voyageCount ?? 0)
      : 0,
    contactEmail,
    contactPhone,
    additionalInfo,
  };

  if (existingPublicSnap.exists()) {
    try {
      await updateDoc(doc(db, 'public_profiles', user.uid), {
        fullName: publicPayload.fullName,
        photoUrl: publicPayload.photoUrl,
        cadetNumber: publicPayload.cadetNumber,
        batch: publicPayload.batch,
        department: publicPayload.department,
        cdcNumber: publicPayload.cdcNumber,
        sidNumber: publicPayload.sidNumber,
        currentRank: publicPayload.currentRank,
        availabilityStatus: publicPayload.availabilityStatus,
        bloodGroup: publicPayload.bloodGroup,
        city: publicPayload.city,
        country: publicPayload.country,
        cvUrl: publicPayload.cvUrl,
        memberSerial: publicPayload.memberSerial,
        contactEmail: publicPayload.contactEmail,
        contactPhone: publicPayload.contactPhone,
        additionalInfo: publicPayload.additionalInfo,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, publicPath);
    }
  } else {
    try {
      await setDoc(doc(db, 'public_profiles', user.uid), {
        ...publicPayload,
        isVerified: asAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, publicPath);
    }
  }

  const vaultPayload = buildVaultFields(user.email || '', input);

  if (existingVaultSnap.exists()) {
    try {
      await updateDoc(doc(db, 'private_vault', user.uid), {
        ...vaultPayload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, vaultPath);
    }
  } else {
    try {
      await setDoc(doc(db, 'private_vault', user.uid), {
        uid: user.uid,
        ...vaultPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, vaultPath);
    }
  }

  return {
    profile: {
      ...publicPayload,
      bloodGroup: (publicPayload.bloodGroup as BloodGroup | '') || '',
      isVerified: existingPublicSnap.exists()
        ? Boolean(existingPublicSnap.data().isVerified)
        : asAdmin,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    contact: {
      uid: user.uid,
      ...vaultPayload,
    },
  };
}

export async function updateMemberProfileAndContact(
  uid: string,
  input: ProfileFormInput,
  currentProfileMeta?: { isVerified?: boolean; voyageCount?: number }
): Promise<void> {
  const publicPath = `public_profiles/${uid}`;
  const vaultPath = `private_vault/${uid}`;

  const isInstructor = Boolean(input.isInstructor || input.department === 'Instructors');
  const rawCadet = clampString(input.cadetNumber, SCHEMA_BOUNDS.cadetNumber.max);
  const cadetNumber = rawCadet || (isInstructor ? 'BMAS-INST' : '');
  const batch = cleanBatchLabel(clampString(input.batch, SCHEMA_BOUNDS.batch.max));
  const additionalInfo = clampString(input.additionalInfo, SCHEMA_BOUNDS.additionalInfo.max);
  const publicDocRef = doc(db, 'public_profiles', uid);
  const vaultDocRef = doc(db, 'private_vault', uid);

  const [pubSnap, vaultSnap] = await Promise.all([getDoc(publicDocRef), getDoc(vaultDocRef)]);

  const showContact = input.showContactInDirectory !== false;
  const contactEmail = showContact
    ? clampString(input.email, SCHEMA_BOUNDS.email.max)
    : '';
  const contactPhone = showContact
    ? clampString(input.whatsapp || input.phone, SCHEMA_BOUNDS.phone.max)
    : '';

  const publicMutable = {
    fullName: clampString(input.fullName, SCHEMA_BOUNDS.fullName.max),
    photoUrl: clampString(input.photoUrl, SCHEMA_BOUNDS.photoUrl.max),
    cadetNumber,
    batch,
    department: isInstructor ? ('Instructors' as const) : input.department,
    cdcNumber: clampString(input.cdcNumber, SCHEMA_BOUNDS.cdcNumber.max),
    sidNumber: clampString(input.sidNumber, SCHEMA_BOUNDS.sidNumber.max),
    currentRank: clampString(input.currentRank, SCHEMA_BOUNDS.currentRank.max),
    availabilityStatus: input.availabilityStatus,
    bloodGroup: input.bloodGroup || '',
    city: clampString(input.city, SCHEMA_BOUNDS.city.max),
    country: clampString(input.country, SCHEMA_BOUNDS.country.max),
    cvUrl: clampString(input.cvUrl, SCHEMA_BOUNDS.cvUrl.max),
    memberSerial: generateMemberSerial(cadetNumber, batch),
    contactEmail,
    contactPhone,
    additionalInfo,
    updatedAt: serverTimestamp(),
  };

  try {
    if (pubSnap.exists()) {
      await updateDoc(publicDocRef, publicMutable);
    } else {
      await setDoc(publicDocRef, {
        uid,
        ...publicMutable,
        isVerified: Boolean(currentProfileMeta?.isVerified ?? false),
        isPublicDirectory: true,
        voyageCount: currentProfileMeta?.voyageCount ?? 0,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, publicPath);
  }

  const vaultPayload = buildVaultFields(input.email, input);
  try {
    if (vaultSnap.exists()) {
      await updateDoc(vaultDocRef, {
        ...vaultPayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(vaultDocRef, {
        uid,
        ...vaultPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, vaultPath);
  }
}

export async function adminToggleVerification(
  memberId: string,
  nextVerified: boolean
): Promise<void> {
  const pubRef = doc(db, 'public_profiles', memberId);
  const legacyRef = doc(db, 'directory_profiles', memberId);
  try {
    const pubSnap = await getDoc(pubRef);
    if (pubSnap.exists()) {
      await updateDoc(pubRef, {
        isVerified: nextVerified,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(legacyRef, {
        isVerified: nextVerified,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `public_profiles/${memberId}`);
  }
}

export async function adminSyncAllDirectoryContacts(
  members: DirectoryProfile[]
): Promise<number> {
  let updatedCount = 0;

  for (const member of members) {
    if (member.contactEmail && member.contactPhone) continue;

    try {
      const [pubSnap, vault] = await Promise.all([
        getDoc(doc(db, 'public_profiles', member.uid)),
        adminFetchMemberPrivateVault(member.uid),
      ]);
      if (!pubSnap.exists() || !vault) continue;

      const pubData = pubSnap.data() as Record<string, unknown>;
      const existingEmail = String(pubData.contactEmail ?? '').trim();
      const existingPhone = String(pubData.contactPhone ?? '').trim();

      const nextEmail = existingEmail || clampString(vault.email, SCHEMA_BOUNDS.email.max);
      const nextPhone =
        existingPhone || clampString(vault.whatsapp || vault.phone, SCHEMA_BOUNDS.phone.max);

      if (nextEmail !== existingEmail || nextPhone !== existingPhone) {
        await updateDoc(doc(db, 'public_profiles', member.uid), {
          contactEmail: nextEmail,
          contactPhone: nextPhone,
          updatedAt: serverTimestamp(),
        });
        updatedCount += 1;
      }
    } catch {
      // Continue syncing remaining members even if one legacy record fails
    }
  }

  return updatedCount;
}

export async function adminDeleteMemberRecord(memberId: string): Promise<void> {
  const publicPath = `public_profiles/${memberId}`;
  try {
    await Promise.allSettled([
      deleteDoc(doc(db, 'public_profiles', memberId)),
      deleteDoc(doc(db, 'private_vault', memberId)),
      deleteDoc(doc(db, 'directory_profiles', memberId)),
      deleteDoc(doc(db, 'member_private', memberId)),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, publicPath);
  }
}

/**
 * Subscribes to public_profiles and merges any unmigrated legacy directory_profiles safely.
 */
export function subscribeDirectoryProfiles(
  onData: (profiles: DirectoryProfile[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const publicMap = new Map<string, DirectoryProfile>();
  const legacyMap = new Map<string, DirectoryProfile>();

  const emitMerged = () => {
    const merged = new Map<string, DirectoryProfile>(legacyMap);
    for (const [uid, prof] of publicMap.entries()) {
      merged.set(uid, prof);
    }
    onData(Array.from(merged.values()));
  };

  const unsubPublic = onSnapshot(
    query(collection(db, 'public_profiles'), where('isPublicDirectory', '==', true)),
    (snapshot) => {
      publicMap.clear();
      for (const d of snapshot.docs) {
        publicMap.set(d.id, mapDirectoryDoc(d.id, d.data() as Record<string, unknown>));
      }
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'public_profiles');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  const unsubLegacy = onSnapshot(
    query(collection(db, 'directory_profiles'), where('isPublicDirectory', '==', true)),
    (snapshot) => {
      legacyMap.clear();
      for (const d of snapshot.docs) {
        legacyMap.set(d.id, mapDirectoryDoc(d.id, d.data() as Record<string, unknown>));
      }
      emitMerged();
    },
    () => {
      // Legacy collection may remain empty on fresh projects
    }
  );

  return () => {
    unsubPublic();
    unsubLegacy();
  };
}

export function subscribeMemberVoyages(
  memberId: string,
  onData: (voyages: VoyageRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `public_profiles/${memberId}/voyages`;
  const pubMap = new Map<string, VoyageRecord>();
  const legMap = new Map<string, VoyageRecord>();

  const emit = () => {
    const merged = new Map<string, VoyageRecord>(legMap);
    for (const [id, v] of pubMap.entries()) merged.set(id, v);
    onData(Array.from(merged.values()));
  };

  const unsubPub = onSnapshot(
    query(collection(db, 'public_profiles', memberId, 'voyages'), where('isVisible', '==', true)),
    (snapshot) => {
      pubMap.clear();
      for (const d of snapshot.docs) {
        pubMap.set(d.id, mapVoyageDoc(d.id, memberId, d.data() as Record<string, unknown>));
      }
      emit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  const unsubLeg = onSnapshot(
    query(
      collection(db, 'directory_profiles', memberId, 'voyages'),
      where('isVisible', '==', true)
    ),
    (snapshot) => {
      legMap.clear();
      for (const d of snapshot.docs) {
        legMap.set(d.id, mapVoyageDoc(d.id, memberId, d.data() as Record<string, unknown>));
      }
      emit();
    },
    () => {
      // Optional legacy voyages fallback
    }
  );

  return () => {
    unsubPub();
    unsubLeg();
  };
}

export async function fetchMemberVoyagesOnce(memberId: string): Promise<VoyageRecord[]> {
  const path = `public_profiles/${memberId}/voyages`;
  try {
    const pubSnap = await getDocs(
      query(collection(db, 'public_profiles', memberId, 'voyages'), where('isVisible', '==', true))
    );
    const results = pubSnap.docs.map((d) =>
      mapVoyageDoc(d.id, memberId, d.data() as Record<string, unknown>)
    );
    if (results.length > 0) return results;

    const legSnap = await getDocs(
      query(
        collection(db, 'directory_profiles', memberId, 'voyages'),
        where('isVisible', '==', true)
      )
    );
    return legSnap.docs.map((d) =>
      mapVoyageDoc(d.id, memberId, d.data() as Record<string, unknown>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveVoyageRecord(
  memberId: string,
  input: VoyageFormInput,
  currentVoyageCount: number,
  existingId?: string
): Promise<string> {
  const voyageId = existingId || `voy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `public_profiles/${memberId}/voyages/${voyageId}`;

  const payload = {
    vesselName: clampString(input.vesselName, SCHEMA_BOUNDS.vesselName.max),
    vesselType: input.vesselType,
    companyName: clampString(input.companyName, SCHEMA_BOUNDS.companyName.max),
    rankServed: clampString(input.rankServed, SCHEMA_BOUNDS.rankServed.max),
    signOnDate: input.signOnDate.trim(),
    signOffDate: input.signOffDate.trim(),
    isVisible: true,
    updatedAt: serverTimestamp(),
  };

  if (existingId) {
    try {
      await updateDoc(doc(db, 'public_profiles', memberId, 'voyages', voyageId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(doc(db, 'public_profiles', memberId, 'voyages', voyageId), {
        ...payload,
        memberId,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'public_profiles', memberId), {
        voyageCount: Math.min(200, currentVoyageCount + 1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return voyageId;
}

export async function deleteVoyageRecord(
  memberId: string,
  voyageId: string,
  currentVoyageCount: number
): Promise<void> {
  const path = `public_profiles/${memberId}/voyages/${voyageId}`;
  try {
    await deleteDoc(doc(db, 'public_profiles', memberId, 'voyages', voyageId));
    await updateDoc(doc(db, 'public_profiles', memberId), {
      voyageCount: Math.max(0, currentVoyageCount - 1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeJobPostings(
  onData: (jobs: JobPosting[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'job_postings';
  const q = query(collection(db, path), where('status', '==', 'open'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapJobDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createJobPosting(
  poster: { uid: string; fullName: string; currentRank: string; batch: string },
  input: JobFormInput
): Promise<string> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `job_postings/${jobId}`;
  try {
    await setDoc(doc(db, 'job_postings', jobId), {
      posterUid: poster.uid,
      posterName: clampString(poster.fullName, SCHEMA_BOUNDS.fullName.max) || 'BMASA Administration',
      posterRank: clampString(poster.currentRank, SCHEMA_BOUNDS.currentRank.max) || 'Administrator',
      posterBatch: clampString(poster.batch, SCHEMA_BOUNDS.batch.max) || 'Admin',
      companyName: clampString(input.companyName, SCHEMA_BOUNDS.companyName.max),
      rankNeeded: clampString(input.rankNeeded, SCHEMA_BOUNDS.rankNeeded.max),
      vesselType: input.vesselType,
      contactInfo: clampString(input.contactInfo, SCHEMA_BOUNDS.contactInfo.max),
      notes: clampString(input.notes, SCHEMA_BOUNDS.notes.max),
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return jobId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateJobPosting(
  jobId: string,
  input: JobFormInput
): Promise<void> {
  const path = `job_postings/${jobId}`;
  try {
    await updateDoc(doc(db, 'job_postings', jobId), {
      companyName: clampString(input.companyName, SCHEMA_BOUNDS.companyName.max),
      rankNeeded: clampString(input.rankNeeded, SCHEMA_BOUNDS.rankNeeded.max),
      vesselType: input.vesselType,
      contactInfo: clampString(input.contactInfo, SCHEMA_BOUNDS.contactInfo.max),
      notes: clampString(input.notes, SCHEMA_BOUNDS.notes.max),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function closeJobPosting(jobId: string): Promise<void> {
  const path = `job_postings/${jobId}`;
  try {
    await updateDoc(doc(db, 'job_postings', jobId), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteJobPosting(jobId: string): Promise<void> {
  const path = `job_postings/${jobId}`;
  try {
    await deleteDoc(doc(db, 'job_postings', jobId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAdmins(
  onData: (admins: AdminEntry[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'admins';
  const q = query(collection(db, path), where('role', '==', 'admin'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapAdminDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.email.localeCompare(b.email));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function addDelegatedAdmin(
  email: string,
  displayName: string
): Promise<string> {
  const normalizedEmail = clampString(email, SCHEMA_BOUNDS.email.max).toLowerCase();
  const adminId = emailToAdminDocId(normalizedEmail);
  const path = `admins/${adminId}`;
  try {
    await setDoc(doc(db, 'admins', adminId), {
      email: normalizedEmail,
      displayName: clampString(displayName, SCHEMA_BOUNDS.displayName.max),
      addedByEmail: MAIN_ADMIN_EMAIL,
      role: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return adminId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeDelegatedAdmin(adminId: string): Promise<void> {
  const path = `admins/${adminId}`;
  try {
    await deleteDoc(doc(db, 'admins', adminId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeBankAccounts(
  onData: (accounts: BankAccount[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'bank_accounts';
  const q = query(collection(db, path), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapBankAccountDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.bankName.localeCompare(b.bankName));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveBankAccount(
  actor: { uid: string; name: string },
  input: BankAccountFormInput,
  existingId?: string
): Promise<string> {
  const accountId =
    existingId || `bank_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `bank_accounts/${accountId}`;
  const baseFields = {
    bankName: clampString(input.bankName, SCHEMA_BOUNDS.bankName.max),
    accountName: clampString(input.accountName, SCHEMA_BOUNDS.accountName.max),
    accountNumber: clampString(input.accountNumber, SCHEMA_BOUNDS.accountNumber.max),
    branchName: clampString(input.branchName, SCHEMA_BOUNDS.branchName.max),
    routingNumber: clampString(input.routingNumber, SCHEMA_BOUNDS.routingNumber.max),
    accountType: input.accountType,
    currency: input.currency,
    notes: clampString(input.notes, SCHEMA_BOUNDS.bankNotes.max),
    isActive: true,
    updatedAt: serverTimestamp(),
  };

  if (existingId) {
    try {
      await updateDoc(doc(db, 'bank_accounts', accountId), baseFields);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(doc(db, 'bank_accounts', accountId), {
        ...baseFields,
        addedByUid: actor.uid,
        addedByName: clampString(actor.name, SCHEMA_BOUNDS.fullName.max) || 'BMASA Admin',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return accountId;
}

export async function deleteBankAccount(accountId: string): Promise<void> {
  const path = `bank_accounts/${accountId}`;
  try {
    await deleteDoc(doc(db, 'bank_accounts', accountId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeFundTransactions(
  onData: (transactions: FundTransaction[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'fund_transactions';
  const q = query(collection(db, path), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapFundTransactionDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.transactionDateTime.localeCompare(a.transactionDateTime));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveFundTransaction(
  actor: { uid: string; name: string; email: string },
  input: FundTransactionFormInput,
  existingId?: string
): Promise<string> {
  const txId =
    existingId || `fund_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `fund_transactions/${txId}`;
  const numericAmount = Number(Number(input.amount).toFixed(2));

  const mutableFields = {
    memberUid: clampString(input.memberUid, SCHEMA_BOUNDS.id.max),
    memberName: clampString(input.memberName, SCHEMA_BOUNDS.fullName.max),
    memberCadetNumber: clampString(input.memberCadetNumber, SCHEMA_BOUNDS.cadetNumber.max),
    memberBatch: clampString(input.memberBatch, SCHEMA_BOUNDS.batch.max),
    entryType: input.entryType,
    amount: numericAmount,
    currency: 'BDT' as const,
    category: input.category,
    paymentMethod: input.paymentMethod,
    bankAccountLabel: clampString(input.bankAccountLabel, SCHEMA_BOUNDS.bankName.max),
    referenceNumber: clampString(input.referenceNumber, SCHEMA_BOUNDS.referenceNumber.max),
    transactionDateTime: input.transactionDateTime.trim().slice(0, 25),
    notes: clampString(input.notes, SCHEMA_BOUNDS.bankNotes.max),
    receiptDataUrl: clampString(input.receiptDataUrl, SCHEMA_BOUNDS.receiptDataUrl.max),
    isPublished: true,
    updatedAt: serverTimestamp(),
  };

  const actorName = clampString(actor.name, SCHEMA_BOUNDS.fullName.max) || clampString(actor.email, SCHEMA_BOUNDS.fullName.max) || 'BMASA Admin';
  const actorEmail = clampString(actor.email, SCHEMA_BOUNDS.email.max) || MAIN_ADMIN_EMAIL;

  if (existingId) {
    try {
      await updateDoc(doc(db, 'fund_transactions', txId), {
        ...mutableFields,
        updatedByUid: actor.uid,
        updatedByName: actorName,
        updatedByEmail: actorEmail,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(doc(db, 'fund_transactions', txId), {
        ...mutableFields,
        recordedByUid: actor.uid,
        recordedByName: actorName,
        recordedByEmail: actorEmail,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return txId;
}

export async function deleteFundTransaction(transactionId: string): Promise<void> {
  const path = `fund_transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, 'fund_transactions', transactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeNotices(
  onData: (items: NoticeItem[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'notices';
  const q = query(collection(db, path), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapNoticeDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveNoticeItem(
  actor: { uid: string; name: string },
  input: NoticeFormInput,
  existingId?: string
): Promise<string> {
  const noticeId = existingId || `notice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `notices/${noticeId}`;
  const mutableFields = {
    title: clampString(input.title, SCHEMA_BOUNDS.noticeTitle.max),
    noticeType: input.noticeType,
    category: input.category,
    body: clampString(input.body, SCHEMA_BOUNDS.noticeBody.max),
    attachmentUrl: clampString(input.attachmentUrl, SCHEMA_BOUNDS.cvUrl.max),
    isPinned: Boolean(input.isPinned),
    isPublished: true,
    updatedAt: serverTimestamp(),
  };

  if (existingId) {
    try {
      await updateDoc(doc(db, 'notices', noticeId), mutableFields);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(doc(db, 'notices', noticeId), {
        ...mutableFields,
        authorUid: actor.uid,
        authorName: clampString(actor.name, SCHEMA_BOUNDS.fullName.max) || 'BMASA Secretariat',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return noticeId;
}

export async function deleteNoticeItem(noticeId: string): Promise<void> {
  const path = `notices/${noticeId}`;
  try {
    await deleteDoc(doc(db, 'notices', noticeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeMentorshipPosts(
  onData: (items: MentorshipPost[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'mentorship_posts';
  const q = query(collection(db, path), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapMentorshipDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveMentorshipPost(
  author: { uid: string; fullName: string; currentRank: string; batch: string; isVerified: boolean },
  input: MentorshipFormInput,
  existingId?: string
): Promise<string> {
  const postId = existingId || `mentor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `mentorship_posts/${postId}`;
  const mutable = {
    examTrack: input.examTrack,
    title: clampString(input.title, SCHEMA_BOUNDS.mentorshipTitle.max),
    adviceBody: clampString(input.adviceBody, SCHEMA_BOUNDS.adviceBody.max),
    resourceUrl: clampString(input.resourceUrl, SCHEMA_BOUNDS.cvUrl.max),
    isPublished: true,
    updatedAt: serverTimestamp(),
  };

  if (existingId) {
    try {
      await updateDoc(doc(db, 'mentorship_posts', postId), mutable);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(doc(db, 'mentorship_posts', postId), {
        ...mutable,
        authorUid: author.uid,
        authorName: clampString(author.fullName, SCHEMA_BOUNDS.fullName.max) || 'BMASA Officer',
        authorRank: clampString(author.currentRank, SCHEMA_BOUNDS.currentRank.max) || 'Alumnus',
        authorBatch: clampString(author.batch, SCHEMA_BOUNDS.batch.max) || 'BMASA',
        authorVerified: author.isVerified,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
  return postId;
}

export async function deleteMentorshipPost(postId: string): Promise<void> {
  const path = `mentorship_posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'mentorship_posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeCrewingCompanies(
  onData: (items: CrewingCompany[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'crewing_companies';
  const q = query(collection(db, path), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapCrewingDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.companyName.localeCompare(b.companyName));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveCrewingCompany(
  author: { uid: string; fullName: string; isVerified: boolean },
  input: CrewingCompanyFormInput,
  existingId?: string
): Promise<string> {
  const companyId =
    existingId || `crew_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `crewing_companies/${companyId}`;
  const mutable = {
    companyName: clampString(input.companyName, SCHEMA_BOUNDS.companyName.max),
    dosLicense: clampString(input.dosLicense, SCHEMA_BOUNDS.dosLicense.max),
    fleetType: clampString(input.fleetType, SCHEMA_BOUNDS.fleetType.max),
    cadetIntakeStatus: input.cadetIntakeStatus,
    contactEmail: clampString(input.contactEmail, SCHEMA_BOUNDS.email.max),
    alumniNotes: clampString(input.alumniNotes, SCHEMA_BOUNDS.notes.max),
    isPublished: true,
    updatedAt: serverTimestamp(),
  };

  if (existingId) {
    try {
      await updateDoc(doc(db, 'crewing_companies', companyId), mutable);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(doc(db, 'crewing_companies', companyId), {
        ...mutable,
        authorUid: author.uid,
        authorName: clampString(author.fullName, SCHEMA_BOUNDS.fullName.max) || 'BMASA Member',
        authorVerified: author.isVerified,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
  return companyId;
}

export async function deleteCrewingCompany(companyId: string): Promise<void> {
  const path = `crewing_companies/${companyId}`;
  try {
    await deleteDoc(doc(db, 'crewing_companies', companyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeDhakaRoadmap(
  onData: (items: DhakaRoadmapItem[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'dhaka_office_milestones';
  const q = query(collection(db, path), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapDhakaRoadmapDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.displayOrder - b.displayOrder);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveDhakaRoadmapItem(
  actorUid: string,
  input: DhakaRoadmapFormInput,
  existingId?: string
): Promise<string> {
  const itemId =
    existingId || `dhaka_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `dhaka_office_milestones/${itemId}`;
  const payload = {
    itemType: input.itemType,
    title: clampString(input.title, SCHEMA_BOUNDS.milestoneTitle.max),
    subtitle: clampString(input.subtitle, SCHEMA_BOUNDS.subtitle.max),
    personName: clampString(input.personName, SCHEMA_BOUNDS.fullName.max),
    personBatch: clampString(input.personBatch, SCHEMA_BOUNDS.batch.max),
    personCadetNo: clampString(input.personCadetNo, SCHEMA_BOUNDS.cadetNumber.max),
    status: input.status,
    targetAmountBdt: Math.max(0, Number(input.targetAmountBdt || 0)),
    raisedAmountBdt: Math.max(0, Number(input.raisedAmountBdt || 0)),
    displayOrder: Math.max(0, Math.min(9999, Math.floor(Number(input.displayOrder || 1)))),
    notes: clampString(input.notes, SCHEMA_BOUNDS.bankNotes.max),
    isPublished: true,
    updatedByUid: actorUid,
    updatedAt: serverTimestamp(),
  };

  if (existingId) {
    try {
      await updateDoc(doc(db, 'dhaka_office_milestones', itemId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(doc(db, 'dhaka_office_milestones', itemId), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
  return itemId;
}

export async function deleteDhakaRoadmapItem(itemId: string): Promise<void> {
  const path = `dhaka_office_milestones/${itemId}`;
  try {
    await deleteDoc(doc(db, 'dhaka_office_milestones', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -----------------------------------------------------------------------------
// Batch Photo Gallery Archive (Admin-curated, signed-in readable)
// -----------------------------------------------------------------------------
function mapGalleryPhotoDoc(id: string, data: Record<string, unknown>): GalleryPhoto {
  return {
    id,
    batch: String(data.batch ?? ''),
    title: String(data.title ?? ''),
    description: data.description ? String(data.description) : undefined,
    photoUrl: String(data.photoUrl ?? ''),
    uploadedByUid: String(data.uploadedByUid ?? ''),
    uploadedByName: String(data.uploadedByName ?? 'BMASA Administrator'),
    uploadedAt: String(data.uploadedAt ?? tsToIso(data.createdAt)),
  };
}

export function subscribeGalleryPhotos(
  onData: (photos: GalleryPhoto[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'gallery_photos';
  const q = query(collection(db, path), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapGalleryPhotoDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveGalleryPhotoItem(
  actor: { uid: string; name: string },
  input: { batch: string; title: string; description?: string; photoUrl: string }
): Promise<string> {
  const photoId = `gal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `gallery_photos/${photoId}`;
  const uploadedAt = new Date().toISOString();

  try {
    await setDoc(doc(db, 'gallery_photos', photoId), {
      batch: clampString(input.batch, 32),
      title: clampString(input.title, 140),
      description: clampString(input.description, 500),
      photoUrl: input.photoUrl.trim().slice(0, 150000),
      isPublished: true,
      uploadedByUid: actor.uid,
      uploadedByName: clampString(actor.name, 100) || 'BMASA Administrator',
      uploadedAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return photoId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteGalleryPhotoItem(photoId: string): Promise<void> {
  const path = `gallery_photos/${photoId}`;
  try {
    await deleteDoc(doc(db, 'gallery_photos', photoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -----------------------------------------------------------------------------
// Private Vault STCW COP Certificates Subcollection
// -----------------------------------------------------------------------------
function mapCopCertificateDoc(
  id: string,
  memberId: string,
  data: Record<string, unknown>
): CopCertificate {
  return {
    id,
    memberId: typeof data.memberId === 'string' ? data.memberId : memberId,
    title: String(data.title ?? ''),
    certNumber: String(data.certNumber ?? ''),
    issueDate: String(data.issueDate ?? ''),
    expiryDate: String(data.expiryDate ?? ''),
    isStandard: Boolean(data.isStandard),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export function subscribeMemberCopCertificates(
  memberId: string,
  onData: (certs: CopCertificate[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `private_vault/${memberId}/cop_certificates`;
  return onSnapshot(
    collection(db, 'private_vault', memberId, 'cop_certificates'),
    (snapshot) => {
      const certs = snapshot.docs
        .map((d) => mapCopCertificateDoc(d.id, memberId, d.data() as Record<string, unknown>))
        .sort((a, b) => a.title.localeCompare(b.title));
      onData(certs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveCopCertificate(
  memberId: string,
  input: CopCertificateFormInput & { isStandard?: boolean },
  existingId?: string
): Promise<string> {
  const certId = existingId || `cop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `private_vault/${memberId}/cop_certificates/${certId}`;
  const docRef = doc(db, 'private_vault', memberId, 'cop_certificates', certId);
  const mutableFields = {
    title: clampString(input.title, 120),
    certNumber: clampString(input.certNumber, 48),
    issueDate: clampString(input.issueDate, 10),
    expiryDate: clampString(input.expiryDate, 10),
    isStandard: Boolean(input.isStandard),
    updatedAt: serverTimestamp(),
  };

  if (existingId) {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      try {
        await updateDoc(docRef, mutableFields);
        return certId;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }

  try {
    await setDoc(docRef, {
      memberId,
      ...mutableFields,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
  return certId;
}

export async function deleteCopCertificate(memberId: string, certId: string): Promise<void> {
  const path = `private_vault/${memberId}/cop_certificates/${certId}`;
  try {
    await deleteDoc(doc(db, 'private_vault', memberId, 'cop_certificates', certId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -----------------------------------------------------------------------------
// Member Payment Proof Submissions & Treasury Verification Queue
// -----------------------------------------------------------------------------
function mapPaymentSubmissionDoc(
  id: string,
  data: Record<string, unknown>
): PaymentSubmission {
  const statusRaw = data.status;
  const status: PaymentSubmissionStatus =
    statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending';
  return {
    id,
    memberUid: String(data.memberUid ?? ''),
    memberName: String(data.memberName ?? ''),
    memberCadetNumber: String(data.memberCadetNumber ?? ''),
    memberBatch: String(data.memberBatch ?? ''),
    amount: Number(data.amount ?? 0),
    currency: 'BDT',
    category: (data.category as PaymentSubmission['category']) ?? 'Monthly Subscription',
    paymentMethod: (data.paymentMethod as PaymentSubmission['paymentMethod']) ?? 'Bank Transfer',
    bankAccountLabel: String(data.bankAccountLabel ?? ''),
    referenceNumber: String(data.referenceNumber ?? ''),
    transactionDateTime: String(data.transactionDateTime ?? ''),
    notes: String(data.notes ?? ''),
    receiptDataUrl: String(data.receiptDataUrl ?? ''),
    status,
    adminNotes: String(data.adminNotes ?? ''),
    reviewedByUid: String(data.reviewedByUid ?? ''),
    reviewedByName: String(data.reviewedByName ?? ''),
    postedTransactionId: String(data.postedTransactionId ?? ''),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export function subscribeMyPaymentSubmissions(
  uid: string,
  onData: (items: PaymentSubmission[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'payment_submissions';
  const q = query(collection(db, path), where('memberUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapPaymentSubmissionDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeAllPaymentSubmissions(
  onData: (items: PaymentSubmission[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'payment_submissions';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapPaymentSubmissionDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function submitMemberPayment(
  member: { uid: string; fullName: string; cadetNumber: string; batch: string },
  input: PaymentSubmissionFormInput
): Promise<string> {
  const submissionId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `payment_submissions/${submissionId}`;
  try {
    await setDoc(doc(db, 'payment_submissions', submissionId), {
      memberUid: member.uid,
      memberName: clampString(member.fullName, SCHEMA_BOUNDS.fullName.max),
      memberCadetNumber: clampString(member.cadetNumber, SCHEMA_BOUNDS.cadetNumber.max),
      memberBatch: clampString(member.batch, SCHEMA_BOUNDS.batch.max),
      amount: Number(input.amount),
      currency: 'BDT',
      category: input.category,
      paymentMethod: input.paymentMethod,
      bankAccountLabel: clampString(input.bankAccountLabel, SCHEMA_BOUNDS.bankName.max),
      referenceNumber: clampString(input.referenceNumber, SCHEMA_BOUNDS.referenceNumber.max),
      transactionDateTime: clampString(input.transactionDateTime, 32),
      notes: clampString(input.notes, SCHEMA_BOUNDS.bankNotes.max),
      receiptDataUrl: clampString(input.receiptDataUrl, SCHEMA_BOUNDS.receiptDataUrl.max),
      status: 'pending',
      adminNotes: '',
      reviewedByUid: '',
      reviewedByName: '',
      postedTransactionId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
  return submissionId;
}

export async function reviewPaymentSubmission(
  submission: PaymentSubmission,
  decision: 'approved' | 'rejected',
  admin: { uid: string; name: string; email: string },
  adminNotes = ''
): Promise<string | undefined> {
  const path = `payment_submissions/${submission.id}`;
  let postedTxId = '';

  if (decision === 'approved') {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const txPath = `fund_transactions/${txId}`;
    try {
      await setDoc(doc(db, 'fund_transactions', txId), {
        memberUid: submission.memberUid,
        memberName: clampString(submission.memberName, SCHEMA_BOUNDS.fullName.max),
        memberCadetNumber: clampString(submission.memberCadetNumber, SCHEMA_BOUNDS.cadetNumber.max),
        memberBatch: clampString(submission.memberBatch, SCHEMA_BOUNDS.batch.max),
        entryType: 'contribution',
        amount: Number(submission.amount),
        currency: 'BDT',
        category: submission.category,
        paymentMethod: submission.paymentMethod,
        bankAccountLabel: clampString(submission.bankAccountLabel, SCHEMA_BOUNDS.bankName.max),
        referenceNumber: clampString(submission.referenceNumber, SCHEMA_BOUNDS.referenceNumber.max),
        transactionDateTime: clampString(submission.transactionDateTime, 32),
        notes: clampString(
          submission.notes || `Verified member payment proof (${submission.referenceNumber})`,
          SCHEMA_BOUNDS.bankNotes.max
        ),
        receiptDataUrl: clampString(submission.receiptDataUrl, SCHEMA_BOUNDS.receiptDataUrl.max),
        isPublished: true,
        recordedByUid: admin.uid,
        recordedByName: clampString(admin.name, SCHEMA_BOUNDS.fullName.max) || 'BMASA Admin',
        recordedByEmail: clampString(admin.email, SCHEMA_BOUNDS.email.max) || MAIN_ADMIN_EMAIL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      postedTxId = txId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, txPath);
    }
  }

  try {
    await updateDoc(doc(db, 'payment_submissions', submission.id), {
      status: decision,
      adminNotes: clampString(adminNotes, SCHEMA_BOUNDS.bankNotes.max),
      reviewedByUid: admin.uid,
      reviewedByName: clampString(admin.name, SCHEMA_BOUNDS.fullName.max) || 'BMASA Admin',
      postedTransactionId: postedTxId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return postedTxId || undefined;
}
