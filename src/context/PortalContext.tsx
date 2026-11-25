import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, isMainAdminEmail, MAIN_ADMIN_EMAIL } from '../firebase';
import {
  addDelegatedAdmin,
  adminDeleteMemberRecord,
  adminFetchMemberPrivateVault,
  adminSyncAllDirectoryContacts,
  adminToggleVerification,
  checkUserIsAdmin,
  closeJobPosting,
  completeMemberRegistration,
  createJobPosting,
  deleteBankAccount,
  deleteCopCertificate,
  deleteCrewingCompany,
  deleteDhakaRoadmapItem,
  deleteFundTransaction,
  deleteGalleryPhotoItem,
  deleteJobPosting,
  deleteMentorshipPost,
  deleteNoticeItem,
  deleteVoyageRecord,
  fetchExistingMemberRecords,
  fetchMemberVoyagesOnce,
  fetchPortalStats,
  removeDelegatedAdmin,
  reviewPaymentSubmission,
  saveBankAccount,
  saveCopCertificate,
  saveCrewingCompany,
  saveDhakaRoadmapItem,
  saveFundTransaction,
  saveGalleryPhotoItem,
  saveMentorshipPost,
  saveNoticeItem,
  saveVoyageRecord,
  submitMemberPayment,
  subscribeAdmins,
  subscribeAllPaymentSubmissions,
  subscribeBankAccounts,
  subscribeCrewingCompanies,
  subscribeDhakaRoadmap,
  subscribeDirectoryProfiles,
  subscribeFundTransactions,
  subscribeGalleryPhotos,
  subscribeJobPostings,
  subscribeMemberCopCertificates,
  subscribeMemberVoyages,
  subscribeMyPaymentSubmissions,
  subscribeNotices,
  subscribeMentorshipPosts,
  syncPortalStats,
  updateJobPosting,
  updateMemberProfileAndContact,
} from '../services/firestoreService';
import {
  DEFAULT_ACADEMY_NAME,
  type AcademicQualification,
  type AdminEntry,
  type BankAccount,
  type CopCertificate,
  type CrewingCompany,
  type DhakaRoadmapItem,
  type DirectoryProfile,
  type FundTransaction,
  type GalleryPhoto,
  type JobPosting,
  type MentorshipPost,
  type NoticeItem,
  type PaymentSubmission,
  type PortalStats,
  type PrivateVault,
  type VoyageRecord,
} from '../types/portal';
import { cleanBatchLabel, computePortalMetrics } from '../utils/portalLogic';
import {
  emailToAdminDocId,
  generateMemberSerial,
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

export type SessionMode = 'anonymous' | 'firebase' | 'harness';

interface RegistrationPayload {
  fullName: string;
  email: string;
  password: string;
  cadetNumber: string;
  batch: string;
  department: 'Nautical' | 'Marine Engineering' | 'Instructors';
  rank?: string;
  isInstructor?: boolean;
  phone?: string;
  photoUrl?: string;
  additionalInfo?: string;
}

export interface OnboardingPrefill {
  fullName: string;
  email: string;
  photoUrl?: string;
  cadetNumber: string;
  batch: string;
  department: 'Nautical' | 'Marine Engineering' | 'Instructors';
  rank?: string;
  isInstructor?: boolean;
  phone?: string;
  additionalInfo?: string;
}

interface PortalContextValue {
  authReady: boolean;
  sessionMode: SessionMode;
  firebaseUser: User | null;
  isMainAdmin: boolean;
  isAdmin: boolean;
  needsEmailVerification: boolean;
  needsProfileSetup: boolean;
  onboardingPrefill: OnboardingPrefill | null;
  showSignInLoader: boolean;
  triggerSignInLoader: () => void;
  completeSignInLoader: () => void;
  showWelcomeOverlay: boolean;
  dismissWelcomeOverlay: () => void;
  currentUserProfile: DirectoryProfile | null;
  currentUserContact: PrivateVault | null;
  currentUserVault: PrivateVault | null;
  currentUserVoyages: VoyageRecord[];
  currentUserCopCertificates: CopCertificate[];
  directoryMembers: DirectoryProfile[];
  jobPostings: JobPosting[];
  admins: AdminEntry[];
  bankAccounts: BankAccount[];
  fundTransactions: FundTransaction[];
  paymentSubmissions: PaymentSubmission[];
  notices: NoticeItem[];
  mentorshipPosts: MentorshipPost[];
  crewingCompanies: CrewingCompany[];
  dhakaRoadmap: DhakaRoadmapItem[];
  portalStats: PortalStats;
  firestoreError: string | null;
  clearFirestoreError: () => void;

  // Auth actions
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (payload: RegistrationPayload) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthVerification: () => Promise<boolean>;
  logout: () => Promise<void>;

  // Onboarding & Profile actions
  completeOnboarding: (input: ProfileFormInput, initialVoyage?: VoyageFormInput | null) => Promise<void>;
  saveProfile: (input: ProfileFormInput) => Promise<void>;
  saveVoyage: (input: VoyageFormInput, existingId?: string) => Promise<void>;
  removeVoyage: (voyageId: string) => Promise<void>;
  getVoyagesForMember: (memberId: string) => Promise<VoyageRecord[]>;
  saveCopCert: (input: CopCertificateFormInput & { isStandard?: boolean }, existingId?: string) => Promise<void>;
  removeCopCert: (certId: string) => Promise<void>;

  // Admin & Board actions
  adminInspectVault: (memberId: string) => Promise<PrivateVault | null>;
  postJob: (input: JobFormInput) => Promise<void>;
  updateJob: (jobId: string, input: JobFormInput) => Promise<void>;
  closeJob: (jobId: string) => Promise<void>;
  removeJob: (jobId: string) => Promise<void>;
  toggleMemberVerification: (memberId: string, nextVerified: boolean) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  addAdmin: (email: string, displayName: string) => Promise<void>;
  removeAdmin: (adminId: string) => Promise<void>;
  syncPublicStatsNow: () => Promise<void>;
  syncDirectoryContacts: () => Promise<number>;

  // Bank & Fund actions (Admin-only mutations + Member Payment Submissions)
  saveBank: (input: BankAccountFormInput, existingId?: string) => Promise<void>;
  removeBank: (accountId: string) => Promise<void>;
  saveFundEntry: (input: FundTransactionFormInput, existingId?: string) => Promise<void>;
  removeFundEntry: (transactionId: string) => Promise<void>;
  submitMemberPaymentRequest: (input: PaymentSubmissionFormInput) => Promise<void>;
  approvePaymentRequest: (submission: PaymentSubmission, adminNotes?: string) => Promise<void>;
  rejectPaymentRequest: (submission: PaymentSubmission, adminNotes?: string) => Promise<void>;

  // Community Hub actions
  saveNotice: (input: NoticeFormInput, existingId?: string) => Promise<void>;
  removeNotice: (noticeId: string) => Promise<void>;
  saveMentorship: (input: MentorshipFormInput, existingId?: string) => Promise<void>;
  removeMentorship: (postId: string) => Promise<void>;
  saveCrewing: (input: CrewingCompanyFormInput, existingId?: string) => Promise<void>;
  removeCrewing: (companyId: string) => Promise<void>;
  saveRoadmapItem: (input: DhakaRoadmapFormInput, existingId?: string) => Promise<void>;
  removeRoadmapItem: (itemId: string) => Promise<void>;
  galleryPhotos: GalleryPhoto[];
  addGalleryPhoto: (input: { batch: string; title: string; description?: string; photoUrl: string }) => Promise<void>;
  removeGalleryPhoto: (photoId: string) => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

function readTestHarnessMode(): 'admin' | 'member' | 'onboarding' | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('e2e');
  if (param === 'admin' || param === 'member' || param === 'onboarding') {
    return param;
  }
  return null;
}

function emptyVault(uid: string, email = ''): PrivateVault {
  return {
    uid,
    email,
    phone: '',
    whatsapp: '',
    academyName: DEFAULT_ACADEMY_NAME,
    passportNumber: '',
    passportIssueDate: '',
    bankAccountHolder: '',
    bankName: '',
    bankBranch: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    mfsNumber: '',
    passportExpiry: '',
    cdcIssueDate: '',
    cdcExpiry: '',
    medicalExpiry: '',
    stcwCocExpiry: '',
    academicQualifications: [],
    nokName: '',
    nokRelation: '',
    nokPhone: '',
    nokCity: '',
  };
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [, setAuthRefreshTick] = useState(0);
  const [firebaseIsMainAdmin, setFirebaseIsMainAdmin] = useState(false);
  const [firebaseIsAdmin, setFirebaseIsAdmin] = useState(false);

  // Clockwise BMASA Sign-In Loader state -> immediately opens Colorful WelcomeOverlay when full
  const [showSignInLoader, setShowSignInLoader] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const e2e = params.get('e2e');
    const loader = params.get('loader') === '1';
    const autostart = params.get('autostart') === '1';
    return Boolean((e2e === 'admin' || e2e === 'member') && loader && !autostart);
  });
  const [loaderFinished, setLoaderFinished] = useState<boolean>(false);

  // Welcome screen state (shown right after clockwise loader finishes or in explicit ?e2e=...&welcome=1 mode)
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const e2e = params.get('e2e');
    const welcome = params.get('welcome') === '1';
    const loader = params.get('loader') === '1';
    const autostart = params.get('autostart') === '1';
    return Boolean((e2e === 'admin' || e2e === 'member') && welcome && !loader && !autostart);
  });
  const [pendingWelcomeTrigger, setPendingWelcomeTrigger] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const e2e = params.get('e2e');
    return Boolean((e2e === 'admin' || e2e === 'member') && params.get('loader') === '1' && params.get('autostart') !== '1');
  });

  // Ephemeral test harness state (strictly activated via ?e2e= query param during browser verification; zero fake seed data in live mode)
  const [harnessMode, setHarnessMode] = useState<'admin' | 'member' | 'onboarding' | null>(() =>
    readTestHarnessMode()
  );

  // Live Firestore state
  const [liveProfile, setLiveProfile] = useState<DirectoryProfile | null>(null);
  const [liveVault, setLiveVault] = useState<PrivateVault | null>(null);
  const [liveProfileChecked, setLiveProfileChecked] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<Partial<OnboardingPrefill> | null>(null);

  const [liveVoyages, setLiveVoyages] = useState<VoyageRecord[]>([]);
  const [liveCopCertificates, setLiveCopCertificates] = useState<CopCertificate[]>([]);
  const [liveDirectory, setLiveDirectory] = useState<DirectoryProfile[]>([]);
  const [liveJobs, setLiveJobs] = useState<JobPosting[]>([]);
  const [liveAdmins, setLiveAdmins] = useState<AdminEntry[]>([]);
  const [liveBanks, setLiveBanks] = useState<BankAccount[]>([]);
  const [liveFunds, setLiveFunds] = useState<FundTransaction[]>([]);
  const [livePaymentSubmissions, setLivePaymentSubmissions] = useState<PaymentSubmission[]>([]);
  const [liveNotices, setLiveNotices] = useState<NoticeItem[]>([]);
  const [liveMentorship, setLiveMentorship] = useState<MentorshipPost[]>([]);
  const [liveCrewing, setLiveCrewing] = useState<CrewingCompany[]>([]);
  const [liveRoadmap, setLiveRoadmap] = useState<DhakaRoadmapItem[]>([]);
  const [liveGalleryPhotos, setLiveGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [publicRemoteStats, setPublicRemoteStats] = useState<PortalStats | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Ephemeral harness gallery state (empty by default — zero pre-added photos)
  const [harnessGalleryPhotos, setHarnessGalleryPhotos] = useState<GalleryPhoto[]>([]);

  // Ephemeral harness state (strictly under ?e2e=)
  const [harnessMembers, setHarnessMembers] = useState<DirectoryProfile[]>(() => {
    const initial = readTestHarnessMode();
    if (initial === 'admin') {
      return [
        {
          uid: 'e2e_admin_uid',
          fullName: 'Razib Uddin',
          photoUrl: '',
          cadetNumber: 'BMAS-02-N0001',
          batch: '2nd Batch',
          department: 'Nautical',
          cdcNumber: 'C/O/00001',
          sidNumber: 'BD-SID-000102',
          currentRank: 'Master Mariner',
          availabilityStatus: 'Shore-Based',
          bloodGroup: 'B+',
          city: 'Dhaka',
          country: 'Bangladesh',
          cvUrl: '',
          memberSerial: 'BMAS-01-N0001',
          isVerified: true,
          isPublicDirectory: true,
          voyageCount: 0,
          contactEmail: MAIN_ADMIN_EMAIL,
          contactPhone: '+8801711000001',
        },
        {
          uid: 'e2e_pending_cadet',
          fullName: 'Tanvir Ahmed Siddiqui',
          photoUrl: '',
          cadetNumber: 'BMAS-05-E0142',
          batch: '5th Batch',
          department: 'Marine Engineering',
          cdcNumber: 'C/O/94811',
          sidNumber: 'BD-SID-948112',
          currentRank: 'Engine Cadet',
          availabilityStatus: 'Available for Sea',
          bloodGroup: 'O+',
          city: 'Sylhet',
          country: 'Bangladesh',
          cvUrl: '',
          memberSerial: 'BMAS-05-E0142',
          isVerified: false,
          isPublicDirectory: true,
          voyageCount: 0,
          contactEmail: 'tanvir@bmas.example',
          contactPhone: '+8801799001122',
        },
        {
          uid: 'e2e_senior_instructor',
          fullName: 'Capt. Humayun Kabir',
          photoUrl: '',
          cadetNumber: 'BMAS-INST',
          batch: '2nd Batch',
          department: 'Instructors',
          cdcNumber: '',
          sidNumber: '',
          currentRank: 'Chief Officer',
          availabilityStatus: 'Shore-Based',
          bloodGroup: 'A+',
          city: 'Sylhet',
          country: 'Bangladesh',
          cvUrl: '',
          memberSerial: 'BMAS-INST',
          isVerified: true,
          isPublicDirectory: true,
          voyageCount: 0,
          contactEmail: 'humayun.instructor@bmas.example',
          contactPhone: '+8801711889900',
          additionalInfo: 'Senior Nautical Instructor at Bangladesh Marine Academy, Sylhet · COLREGs, Bridge Watchkeeping & CoC Oral Mentorship.',
        },
      ];
    }
    if (initial === 'member') {
      return [
        {
          uid: 'e2e_member_uid',
          fullName: 'Ahsan Rahman',
          photoUrl: '',
          cadetNumber: 'BMAS-04-N0108',
          batch: '4th Batch',
          department: 'Nautical',
          cdcNumber: 'C/O/91402',
          sidNumber: 'BD-SID-914021',
          currentRank: 'Deck Cadet',
          availabilityStatus: 'Available for Sea',
          bloodGroup: 'O+',
          city: 'Sylhet',
          country: 'Bangladesh',
          cvUrl: '',
          memberSerial: 'BMAS-04-N0108',
          isVerified: true,
          isPublicDirectory: true,
          voyageCount: 0,
          contactEmail: 'ahsan@bmas.example',
          contactPhone: '+8801712345678',
        },
      ];
    }
    return [];
  });

  const [harnessVaults, setHarnessVaults] = useState<Record<string, PrivateVault>>((): Record<string, PrivateVault> => {
    const initial = readTestHarnessMode();
    if (initial === 'admin') {
      return {
        e2e_admin_uid: {
          ...emptyVault('e2e_admin_uid', MAIN_ADMIN_EMAIL),
          academyName: DEFAULT_ACADEMY_NAME,
          passportNumber: 'A00112233',
          passportIssueDate: '2021-06-15',
          passportExpiry: '2031-06-14',
          cdcIssueDate: '2019-03-10',
          cdcExpiry: '2029-03-09',
          medicalExpiry: '2027-08-20',
          stcwCocExpiry: '2028-11-30',
          phone: '+8801711000001',
          whatsapp: '+8801711000001',
          academicQualifications: [
            {
              id: 'qual_ssc_e2e',
              level: 'SSC',
              institution: 'Sylhet Govt. Pilot High School',
              boardOrUniversity: 'Sylhet Board',
              passingYear: '2007',
              result: 'GPA 5.00',
            },
            {
              id: 'qual_hsc_e2e',
              level: 'HSC',
              institution: 'MC College, Sylhet',
              boardOrUniversity: 'Sylhet Board',
              passingYear: '2009',
              result: 'GPA 5.00',
            },
          ],
          nokName: 'Farhana Uddin',
          nokRelation: 'Spouse',
          nokPhone: '+8801711000099',
          nokCity: 'Dhaka',
        },
        e2e_pending_cadet: {
          ...emptyVault('e2e_pending_cadet', 'tanvir@bmas.example'),
          passportNumber: 'EB0987654',
          phone: '+8801799001122',
          whatsapp: '+8801799001122',
          nokName: 'Kamrul Siddiqui',
          nokRelation: 'Father',
          nokPhone: '+8801711889900',
          nokCity: 'Sylhet',
        },
      };
    }
    if (initial === 'member') {
      return {
        e2e_member_uid: {
          ...emptyVault('e2e_member_uid', 'ahsan@bmas.example'),
          academyName: DEFAULT_ACADEMY_NAME,
          passportNumber: 'EC7788990',
          passportIssueDate: '2019-11-16',
          phone: '+8801712345678',
          whatsapp: '+8801712345678',
          passportExpiry: '2029-11-15',
          cdcIssueDate: '2021-10-01',
          cdcExpiry: '2026-09-30',
          medicalExpiry: '2027-03-01',
          stcwCocExpiry: '2028-05-10',
          academicQualifications: [
            {
              id: 'qual_ssc_mem',
              level: 'SSC',
              institution: 'Sylhet Cadet School',
              boardOrUniversity: 'Sylhet Board',
              passingYear: '2017',
              result: 'GPA 5.00',
            },
            {
              id: 'qual_hsc_mem',
              level: 'HSC',
              institution: 'Sylhet Govt. College',
              boardOrUniversity: 'Sylhet Board',
              passingYear: '2019',
              result: 'GPA 4.92',
            },
          ],
          nokName: 'Rashida Begum',
          nokRelation: 'Mother',
          nokPhone: '+8801710001122',
          nokCity: 'Sylhet',
        },
      };
    }
    return {};
  });

  const [harnessVoyages, setHarnessVoyages] = useState<VoyageRecord[]>([]);
  const [harnessCopCertificates, setHarnessCopCertificates] = useState<CopCertificate[]>(() => {
    const initial = readTestHarnessMode();
    if (initial === 'admin') {
      return [
        {
          id: 'cop_admin_bst',
          memberId: 'e2e_admin_uid',
          title: 'Basic Safety Training (PST / FPFF / EFA / PSSR)',
          certNumber: 'COP-BD-77012',
          issueDate: '2022-04-12',
          expiryDate: '2027-04-11',
          isStandard: true,
        },
      ];
    }
    if (initial === 'member') {
      return [
        {
          id: 'cop_e2e_bst',
          memberId: 'e2e_member_uid',
          title: 'Basic Safety Training (PST / FPFF / EFA / PSSR)',
          certNumber: 'COP-BD-99210',
          issueDate: '2021-08-21',
          expiryDate: '2026-08-20',
          isStandard: true,
        },
      ];
    }
    return [];
  });
  const [harnessJobs, setHarnessJobs] = useState<JobPosting[]>(() => {
    const initial = readTestHarnessMode();
    if (initial === 'admin' || initial === 'member') {
      return [
        {
          id: 'job_e2e_seed_1',
          posterUid: 'e2e_admin_uid',
          posterName: 'Razib Uddin',
          posterRank: 'Master Mariner',
          posterBatch: '2nd Batch',
          companyName: 'Bangladesh Shipping Corporation (BSC)',
          rankNeeded: '3rd Officer',
          vesselType: 'Bulk Carrier',
          contactInfo: 'crewing@bsc.gov.bd',
          notes: 'Immediate joining on Supramax bulk carrier. Valid STCW CoC & SID required.',
          status: 'open',
          createdAt: '2026-04-12T08:00:00.000Z',
        },
      ];
    }
    return [];
  });
  const [harnessAdmins, setHarnessAdmins] = useState<AdminEntry[]>([]);
  const [harnessBanks, setHarnessBanks] = useState<BankAccount[]>([]);
  const [harnessFunds, setHarnessFunds] = useState<FundTransaction[]>(() => {
    const initial = readTestHarnessMode();
    if (initial === 'admin' || initial === 'member') {
      return [
        {
          id: 'fund_e2e_seed_dep',
          memberUid: initial === 'admin' ? 'e2e_pending_cadet' : 'e2e_member_uid',
          memberName: initial === 'admin' ? 'Tanvir Ahmed Siddiqui' : 'Ahsan Rahman',
          memberCadetNumber: initial === 'admin' ? 'BMAS-05-E0142' : 'BMAS-04-N0108',
          memberBatch: initial === 'admin' ? '5th Batch' : '4th Batch',
          entryType: 'contribution',
          amount: 5000,
          currency: 'BDT',
          category: 'Annual Membership Fee',
          paymentMethod: 'Bank Transfer',
          bankAccountLabel: 'BMASA Welfare Account',
          referenceNumber: 'DBBL-88412',
          transactionDateTime: '2026-04-10T10:30',
          notes: 'Annual alumni membership deposit',
          receiptDataUrl: '',
          isPublished: true,
          recordedByUid: 'e2e_admin_uid',
          recordedByName: 'Razib Uddin',
          recordedByEmail: MAIN_ADMIN_EMAIL,
        },
        {
          id: 'fund_e2e_seed_exp',
          memberUid: '',
          memberName: 'Cadet Welfare Medical Aid',
          memberCadetNumber: '',
          memberBatch: '',
          entryType: 'disbursement',
          amount: 1500,
          currency: 'BDT',
          category: 'Cadet Support',
          paymentMethod: 'bKash',
          bankAccountLabel: 'BMASA Welfare bKash',
          referenceNumber: 'EXP-401',
          transactionDateTime: '2026-04-11T15:00',
          notes: 'Emergency cadet hospital support voucher',
          receiptDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          isPublished: true,
          recordedByUid: 'e2e_admin_uid',
          recordedByName: 'Razib Uddin',
          recordedByEmail: MAIN_ADMIN_EMAIL,
        },
      ];
    }
    return [];
  });
  const [harnessPaymentSubmissions, setHarnessPaymentSubmissions] = useState<PaymentSubmission[]>(() => {
    const initial = readTestHarnessMode();
    if (initial === 'admin') {
      return [
        {
          id: 'pay_e2e_pending_1',
          memberUid: 'e2e_pending_cadet',
          memberName: 'Tanvir Ahmed Siddiqui',
          memberCadetNumber: 'BMAS-05-E0142',
          memberBatch: '5th Batch',
          amount: 2000,
          currency: 'BDT',
          category: 'Annual Membership Fee',
          paymentMethod: 'bKash',
          bankAccountLabel: 'BMASA Welfare bKash',
          referenceNumber: 'BK89441209',
          transactionDateTime: '2026-04-12T11:20',
          notes: 'Annual BMASA subscription payment',
          receiptDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          status: 'pending',
          adminNotes: '',
          reviewedByUid: '',
          reviewedByName: '',
          postedTransactionId: '',
          createdAt: '2026-04-12T11:21:00.000Z',
        },
      ];
    }
    return [];
  });
  const [harnessNotices, setHarnessNotices] = useState<NoticeItem[]>([]);
  const [harnessMentorship, setHarnessMentorship] = useState<MentorshipPost[]>([]);
  const [harnessCrewing, setHarnessCrewing] = useState<CrewingCompany[]>(() => {
    const initial = readTestHarnessMode();
    if (initial === 'admin' || initial === 'member') {
      return [
        {
          id: 'crew_e2e_1',
          companyName: 'Haque & Sons Maritime Ltd.',
          dosLicense: 'MLA-012 / DOS',
          fleetType: 'Bulk Carriers & Oil Tankers',
          cadetIntakeStatus: 'Accepting Cadets',
          contactEmail: 'crewing@haquesons.example',
          alumniNotes: 'Regular intake for BMAS deck and engine cadets.',
          authorUid: 'e2e_admin_uid',
          authorName: 'Razib Uddin',
          authorVerified: true,
          isPublished: true,
          createdAt: '2026-04-10T09:00:00.000Z',
        },
        {
          id: 'crew_e2e_2',
          companyName: 'V.Ships Bangladesh Crewing',
          dosLicense: 'MLA-048 / DOS',
          fleetType: 'Container & Chemical Tankers',
          cadetIntakeStatus: 'Officers Only',
          contactEmail: 'manning.bd@vships.example',
          alumniNotes: 'Priority interviews for verified BMAS CoC holders.',
          authorUid: 'e2e_admin_uid',
          authorName: 'Razib Uddin',
          authorVerified: true,
          isPublished: true,
          createdAt: '2026-04-11T10:30:00.000Z',
        },
      ];
    }
    return [];
  });
  const [harnessRoadmap, setHarnessRoadmap] = useState<DhakaRoadmapItem[]>([]);

  useEffect(() => {
    let active = true;
    fetchPortalStats()
      .then((stats) => {
        if (active && stats) setPublicRemoteStats(stats);
      })
      .catch(() => {
        // Public page falls back gracefully to zero stats if not yet synced
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setHarnessMode(null);
        setLiveProfileChecked(false);
        try {
          const [roleFlags, records] = await Promise.all([
            checkUserIsAdmin(user),
            fetchExistingMemberRecords(user),
          ]);
          setFirebaseIsMainAdmin(roleFlags.isMainAdmin);
          setFirebaseIsAdmin(roleFlags.isAdmin);
          setLiveProfile(records.profile);
          setLiveVault(records.contact);
        } catch (err) {
          setFirestoreError(err instanceof Error ? err.message : 'Unable to load member record.');
        } finally {
          setLiveProfileChecked(true);
        }
      } else {
        setFirebaseIsMainAdmin(false);
        setFirebaseIsAdmin(false);
        setLiveProfile(null);
        setLiveVault(null);
        setLiveProfileChecked(false);
        setLiveVoyages([]);
        setLiveCopCertificates([]);
        setLiveDirectory([]);
        setLiveJobs([]);
        setLiveAdmins([]);
        setLiveBanks([]);
        setLiveFunds([]);
        setLivePaymentSubmissions([]);
        setLiveNotices([]);
        setLiveMentorship([]);
        setLiveCrewing([]);
        setLiveRoadmap([]);
        setLiveGalleryPhotos([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const unsubDir = subscribeDirectoryProfiles(
      (profiles) => {
        setLiveDirectory(profiles);
        const mine = profiles.find((p) => p.uid === firebaseUser.uid);
        if (mine) setLiveProfile(mine);
      },
      (err) => setFirestoreError(err.message)
    );

    const unsubVoyages = subscribeMemberVoyages(
      firebaseUser.uid,
      (voyages) => setLiveVoyages(voyages),
      (err) => setFirestoreError(err.message)
    );

    const unsubCopCerts = subscribeMemberCopCertificates(
      firebaseUser.uid,
      (certs) => setLiveCopCertificates(certs),
      (err) => setFirestoreError(err.message)
    );

    const unsubJobs = subscribeJobPostings(
      (jobs) => setLiveJobs(jobs),
      (err) => setFirestoreError(err.message)
    );

    const unsubBanks = subscribeBankAccounts(
      (accounts) => setLiveBanks(accounts),
      (err) => setFirestoreError(err.message)
    );

    const unsubFunds = subscribeFundTransactions(
      (transactions) => setLiveFunds(transactions),
      (err) => setFirestoreError(err.message)
    );

    const unsubPayments = firebaseIsMainAdmin
      ? subscribeAllPaymentSubmissions(
          (submissions) => setLivePaymentSubmissions(submissions),
          (err) => setFirestoreError(err.message)
        )
      : subscribeMyPaymentSubmissions(
          firebaseUser.uid,
          (submissions) => setLivePaymentSubmissions(submissions),
          (err) => setFirestoreError(err.message)
        );

    const unsubNotices = subscribeNotices(
      (items) => setLiveNotices(items),
      (err) => setFirestoreError(err.message)
    );

    const unsubMentorship = subscribeMentorshipPosts(
      (items) => setLiveMentorship(items),
      (err) => setFirestoreError(err.message)
    );

    const unsubCrewing = subscribeCrewingCompanies(
      (items) => setLiveCrewing(items),
      (err) => setFirestoreError(err.message)
    );

    const unsubRoadmap = subscribeDhakaRoadmap(
      (items) => setLiveRoadmap(items),
      (err) => setFirestoreError(err.message)
    );

    const unsubGallery = subscribeGalleryPhotos(
      (items) => setLiveGalleryPhotos(items),
      (err) => setFirestoreError(err.message)
    );

    return () => {
      unsubDir();
      unsubVoyages();
      unsubCopCerts();
      unsubJobs();
      unsubBanks();
      unsubFunds();
      unsubPayments();
      unsubNotices();
      unsubMentorship();
      unsubCrewing();
      unsubRoadmap();
      unsubGallery();
    };
  }, [authReady, firebaseUser, firebaseIsMainAdmin]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseIsMainAdmin) {
      setLiveAdmins([]);
      return;
    }
    const unsubAdmins = subscribeAdmins(
      (adminList) => setLiveAdmins(adminList),
      (err) => setFirestoreError(err.message)
    );
    return () => unsubAdmins();
  }, [authReady, firebaseUser, firebaseIsMainAdmin]);

  const sessionMode: SessionMode = firebaseUser
    ? 'firebase'
    : harnessMode
    ? 'harness'
    : 'anonymous';

  const isMainAdmin =
    sessionMode === 'firebase' ? firebaseIsMainAdmin : harnessMode === 'admin';
  const isAdmin =
    sessionMode === 'firebase' ? firebaseIsAdmin : harnessMode === 'admin';
  const needsEmailVerification = Boolean(firebaseUser && !firebaseUser.emailVerified);

  const needsProfileSetup = useMemo(() => {
    if (sessionMode === 'firebase') {
      return liveProfileChecked && liveProfile === null;
    }
    if (sessionMode === 'harness') {
      return harnessMode === 'onboarding';
    }
    return false;
  }, [sessionMode, liveProfileChecked, liveProfile, harnessMode]);

  const onboardingPrefill = useMemo<OnboardingPrefill | null>(() => {
    if (!needsProfileSetup) return null;
    if (sessionMode === 'firebase' && firebaseUser) {
      return {
        fullName: pendingDraft?.fullName || firebaseUser.displayName || '',
        email: firebaseUser.email || pendingDraft?.email || '',
        photoUrl: pendingDraft?.photoUrl || firebaseUser.photoURL || '',
        cadetNumber: pendingDraft?.cadetNumber || '',
        batch: pendingDraft?.batch || '2nd Batch',
        department: pendingDraft?.department || 'Nautical',
        rank: pendingDraft?.rank,
        isInstructor: pendingDraft?.isInstructor,
        phone: pendingDraft?.phone,
        additionalInfo: pendingDraft?.additionalInfo,
      };
    }
    if (sessionMode === 'harness') {
      return {
        fullName: 'New Gmail Alumnus',
        email: 'newcadet@gmail.com',
        photoUrl: '',
        cadetNumber: '',
        batch: '2nd Batch',
        department: 'Nautical',
      };
    }
    return null;
  }, [needsProfileSetup, sessionMode, firebaseUser, pendingDraft]);

  const currentUserProfile = useMemo(() => {
    if (sessionMode === 'firebase') return liveProfile;
    if (sessionMode === 'harness' && harnessMode !== 'onboarding') {
      return harnessMembers[0] ?? null;
    }
    return null;
  }, [sessionMode, liveProfile, harnessMode, harnessMembers]);

  const currentUserVault = useMemo(() => {
    if (sessionMode === 'firebase') return liveVault;
    if (sessionMode === 'harness' && currentUserProfile) {
      return harnessVaults[currentUserProfile.uid] ?? null;
    }
    return null;
  }, [sessionMode, liveVault, currentUserProfile, harnessVaults]);

  const currentUserVoyages = useMemo(() => {
    if (sessionMode === 'firebase') return liveVoyages;
    if (sessionMode === 'harness') return harnessVoyages;
    return [];
  }, [sessionMode, liveVoyages, harnessVoyages]);

  const currentUserCopCertificates = useMemo(() => {
    if (sessionMode === 'firebase') return liveCopCertificates;
    if (sessionMode === 'harness') return harnessCopCertificates;
    return [];
  }, [sessionMode, liveCopCertificates, harnessCopCertificates]);

  const directoryMembers = useMemo(() => {
    if (sessionMode === 'firebase') return liveDirectory;
    if (sessionMode === 'harness') return harnessMembers;
    return [];
  }, [sessionMode, liveDirectory, harnessMembers]);

  const jobPostings = useMemo(() => {
    if (sessionMode === 'firebase') return liveJobs;
    if (sessionMode === 'harness') return harnessJobs.filter((j) => j.status === 'open');
    return [];
  }, [sessionMode, liveJobs, harnessJobs]);

  const admins = useMemo(() => {
    if (sessionMode === 'firebase') return liveAdmins;
    if (sessionMode === 'harness') return harnessAdmins;
    return [];
  }, [sessionMode, liveAdmins, harnessAdmins]);

  const bankAccounts = useMemo(() => {
    if (sessionMode === 'firebase') return liveBanks;
    if (sessionMode === 'harness') return harnessBanks;
    return [];
  }, [sessionMode, liveBanks, harnessBanks]);

  const fundTransactions = useMemo(() => {
    if (sessionMode === 'firebase') return liveFunds;
    if (sessionMode === 'harness') return harnessFunds;
    return [];
  }, [sessionMode, liveFunds, harnessFunds]);

  const paymentSubmissions = useMemo(() => {
    if (sessionMode === 'firebase') return livePaymentSubmissions;
    if (sessionMode === 'harness') return harnessPaymentSubmissions;
    return [];
  }, [sessionMode, livePaymentSubmissions, harnessPaymentSubmissions]);

  const notices = useMemo(() => {
    if (sessionMode === 'firebase') return liveNotices;
    if (sessionMode === 'harness') return harnessNotices;
    return [];
  }, [sessionMode, liveNotices, harnessNotices]);

  const mentorshipPosts = useMemo(() => {
    if (sessionMode === 'firebase') return liveMentorship;
    if (sessionMode === 'harness') return harnessMentorship;
    return [];
  }, [sessionMode, liveMentorship, harnessMentorship]);

  const crewingCompanies = useMemo(() => {
    if (sessionMode === 'firebase') return liveCrewing;
    if (sessionMode === 'harness') return harnessCrewing;
    return [];
  }, [sessionMode, liveCrewing, harnessCrewing]);

  const dhakaRoadmap = useMemo(() => {
    if (sessionMode === 'firebase') return liveRoadmap;
    if (sessionMode === 'harness') return harnessRoadmap;
    return [];
  }, [sessionMode, liveRoadmap, harnessRoadmap]);

  const galleryPhotos = useMemo(() => {
    if (sessionMode === 'firebase') return liveGalleryPhotos;
    if (sessionMode === 'harness') return harnessGalleryPhotos;
    return [];
  }, [sessionMode, liveGalleryPhotos, harnessGalleryPhotos]);

  const triggerSignInLoader = useCallback(() => {
    setLoaderFinished(false);
    setShowSignInLoader(true);
    setPendingWelcomeTrigger(true);
  }, []);

  const completeSignInLoader = useCallback(() => {
    setLoaderFinished(true);
  }, []);

  useEffect(() => {
    if (!showSignInLoader || !loaderFinished) return;

    const autostart =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1';

    if (autostart) {
      setShowSignInLoader(false);
      setLoaderFinished(false);
      setPendingWelcomeTrigger(false);
      return;
    }

    if (pendingWelcomeTrigger && currentUserProfile && !needsEmailVerification && !needsProfileSetup) {
      setShowSignInLoader(false);
      setLoaderFinished(false);
      setPendingWelcomeTrigger(false);
      setShowWelcomeOverlay(true);
      return;
    }

    if (sessionMode !== 'anonymous' && (needsEmailVerification || needsProfileSetup)) {
      setShowSignInLoader(false);
      setLoaderFinished(false);
      setPendingWelcomeTrigger(false);
    }
  }, [
    showSignInLoader,
    loaderFinished,
    pendingWelcomeTrigger,
    currentUserProfile,
    needsEmailVerification,
    needsProfileSetup,
    sessionMode,
  ]);

  useEffect(() => {
    if (!pendingWelcomeTrigger || showSignInLoader) return;
    if (needsEmailVerification || needsProfileSetup || !currentUserProfile) return;
    const autostart =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1';
    if (!autostart) {
      setShowWelcomeOverlay(true);
    }
    setPendingWelcomeTrigger(false);
  }, [pendingWelcomeTrigger, showSignInLoader, needsEmailVerification, needsProfileSetup, currentUserProfile]);

  const dismissWelcomeOverlay = useCallback(() => {
    setShowWelcomeOverlay(false);
  }, []);

  const portalStats = useMemo<PortalStats>(() => {
    if (sessionMode === 'anonymous') {
      return (
        publicRemoteStats ?? {
          registeredAlumni: 0,
          verifiedCadets: 0,
          activePlacements: 0,
        }
      );
    }
    return computePortalMetrics(directoryMembers, jobPostings);
  }, [sessionMode, publicRemoteStats, directoryMembers, jobPostings]);

  useEffect(() => {
    if (sessionMode === 'firebase' && firebaseIsAdmin) {
      const computed = computePortalMetrics(liveDirectory, liveJobs);
      syncPortalStats(computed).catch(() => {});
    }
  }, [sessionMode, firebaseIsAdmin, liveDirectory, liveJobs]);

  const syncPublicStatsNow = useCallback(async () => {
    if (!isAdmin) return;
    const computed = computePortalMetrics(directoryMembers, jobPostings);
    if (sessionMode === 'firebase') {
      await syncPortalStats(computed);
    }
    setPublicRemoteStats(computed);
  }, [isAdmin, directoryMembers, jobPostings, sessionMode]);

  const syncDirectoryContacts = useCallback(async (): Promise<number> => {
    if (!isAdmin) return 0;
    if (sessionMode === 'firebase') {
      return adminSyncAllDirectoryContacts(liveDirectory);
    }
    return 0;
  }, [isAdmin, sessionMode, liveDirectory]);

  const loginWithGoogle = useCallback(async () => {
    setFirestoreError(null);
    await signInWithPopup(auth, googleProvider);
    setLoaderFinished(false);
    setShowSignInLoader(true);
    setPendingWelcomeTrigger(true);
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setFirestoreError(null);
    setLoaderFinished(false);
    setShowSignInLoader(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPendingWelcomeTrigger(true);
    } catch (err) {
      setShowSignInLoader(false);
      setLoaderFinished(false);
      setPendingWelcomeTrigger(false);
      throw err;
    }
  }, []);

  const registerWithEmail = useCallback(async (payload: RegistrationPayload) => {
    setFirestoreError(null);
    const cred = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.password);
    await updateProfile(cred.user, { displayName: payload.fullName.trim() });
    await sendEmailVerification(cred.user).catch(() => {});
    const isInst = Boolean(payload.isInstructor || payload.department === 'Instructors');
    setPendingDraft({
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      cadetNumber: payload.cadetNumber.trim() || (isInst ? 'BMAS-INST' : ''),
      batch: payload.batch,
      department: isInst ? 'Instructors' : payload.department,
      rank: payload.rank?.trim() || (isInst ? 'Senior Instructor' : 'Deck Cadet'),
      isInstructor: isInst,
      phone: payload.phone?.trim() || '',
      photoUrl: payload.photoUrl?.trim() || '',
      additionalInfo: payload.additionalInfo?.trim() || '',
    });
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setFirestoreError(null);
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

  const refreshAuthVerification = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const refreshed = auth.currentUser;
    if (refreshed.emailVerified) {
      setFirebaseUser(refreshed);
      setAuthRefreshTick((t) => t + 1);
      const roleFlags = await checkUserIsAdmin(refreshed);
      setFirebaseIsMainAdmin(roleFlags.isMainAdmin);
      setFirebaseIsAdmin(roleFlags.isAdmin);
      const records = await fetchExistingMemberRecords(refreshed);
      setLiveProfile(records.profile);
      setLiveVault(records.contact);
      setLiveProfileChecked(true);
      setLoaderFinished(false);
      setShowSignInLoader(true);
      setPendingWelcomeTrigger(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    setHarnessMode(null);
    setPendingDraft(null);
    setShowSignInLoader(false);
    setLoaderFinished(false);
    setShowWelcomeOverlay(false);
    setPendingWelcomeTrigger(false);
    if (auth.currentUser) {
      await signOut(auth);
    }
  }, []);

  const completeOnboarding = useCallback(
    async (input: ProfileFormInput, initialVoyage?: VoyageFormInput | null) => {
      if (sessionMode === 'firebase' && firebaseUser) {
        if (!firebaseUser.emailVerified) {
          throw new Error('Please verify your email address before submitting your member profile.');
        }
        const isMain = isMainAdminEmail(firebaseUser.email);
        const records = await completeMemberRegistration(
          firebaseUser,
          input,
          isMain || firebaseIsAdmin
        );
        setLiveProfile(records.profile);
        setLiveVault(records.contact);
        setPendingDraft(null);

        if (initialVoyage && initialVoyage.vesselName.trim()) {
          await saveVoyageRecord(firebaseUser.uid, initialVoyage, 0);
        }
        return;
      }

      if (sessionMode === 'harness') {
        const uid = 'e2e_new_gmail_user';
        const isInst = Boolean(input.isInstructor || input.department === 'Instructors');
        const cadetNo = input.cadetNumber.trim() || (isInst ? 'BMAS-INST' : '');
        const showContact = input.showContactInDirectory !== false;
        const created: DirectoryProfile = {
          uid,
          fullName: input.fullName.trim(),
          photoUrl: input.photoUrl.trim(),
          cadetNumber: cadetNo,
          batch: cleanBatchLabel(input.batch),
          department: isInst ? 'Instructors' : input.department,
          cdcNumber: input.cdcNumber.trim(),
          sidNumber: (input.sidNumber ?? '').trim(),
          currentRank: input.currentRank.trim(),
          availabilityStatus: input.availabilityStatus,
          bloodGroup: input.bloodGroup || '',
          city: input.city.trim(),
          country: input.country.trim(),
          cvUrl: input.cvUrl.trim(),
          memberSerial: generateMemberSerial(cadetNo, input.batch),
          isVerified: false,
          isPublicDirectory: true,
          voyageCount: initialVoyage?.vesselName.trim() ? 1 : 0,
          contactEmail: showContact ? input.email.trim() : '',
          contactPhone: showContact ? (input.whatsapp || input.phone).trim() : '',
          additionalInfo: (input.additionalInfo ?? '').trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const vault: PrivateVault = {
          uid,
          email: input.email.trim(),
          phone: input.phone.trim(),
          whatsapp: input.whatsapp.trim(),
          academyName: (input.academyName?.trim() || DEFAULT_ACADEMY_NAME),
          passportNumber: (input.passportNumber ?? '').trim(),
          passportIssueDate: (input.passportIssueDate ?? '').trim(),
          bankAccountHolder: (input.bankAccountHolder ?? '').trim(),
          bankName: (input.bankName ?? '').trim(),
          bankBranch: (input.bankBranch ?? '').trim(),
          bankAccountNumber: (input.bankAccountNumber ?? '').trim(),
          bankRoutingNumber: (input.bankRoutingNumber ?? '').trim(),
          mfsNumber: (input.mfsNumber ?? '').trim(),
          passportExpiry: (input.passportExpiry ?? '').trim(),
          cdcIssueDate: (input.cdcIssueDate ?? '').trim(),
          cdcExpiry: (input.cdcExpiry ?? '').trim(),
          medicalExpiry: (input.medicalExpiry ?? '').trim(),
          stcwCocExpiry: (input.stcwCocExpiry ?? '').trim(),
          academicQualifications: (input.academicQualifications ?? []) as AcademicQualification[],
          nokName: (input.nokName ?? '').trim(),
          nokRelation: (input.nokRelation ?? '').trim(),
          nokPhone: (input.nokPhone ?? '').trim(),
          nokCity: (input.nokCity ?? '').trim(),
        };
        setHarnessMembers([created]);
        setHarnessVaults({ [uid]: vault });
        if (initialVoyage && initialVoyage.vesselName.trim()) {
          setHarnessVoyages([
            {
              id: `voy_init_${Date.now()}`,
              memberId: uid,
              vesselName: initialVoyage.vesselName.trim(),
              vesselType: initialVoyage.vesselType,
              companyName: initialVoyage.companyName.trim(),
              rankServed: initialVoyage.rankServed.trim(),
              signOnDate: initialVoyage.signOnDate.trim(),
              signOffDate: initialVoyage.signOffDate.trim(),
              isVisible: true,
            },
          ]);
        }
        setHarnessMode('member');
      }
    },
    [sessionMode, firebaseUser, firebaseIsAdmin]
  );

  const saveProfile = useCallback(
    async (input: ProfileFormInput) => {
      const showContact = input.showContactInDirectory !== false;
      const contactEmail = showContact ? input.email.trim() : '';
      const contactPhone = showContact ? (input.whatsapp || input.phone).trim() : '';

      if (sessionMode === 'firebase' && firebaseUser) {
        if (!firebaseUser.emailVerified) {
          throw new Error('Please verify your email address before saving profile updates.');
        }
        await updateMemberProfileAndContact(firebaseUser.uid, input, {
          isVerified: liveProfile?.isVerified,
          voyageCount: liveProfile?.voyageCount,
        });
        setLiveProfile((prev) =>
          prev
            ? {
                ...prev,
                fullName: input.fullName.trim(),
                photoUrl: input.photoUrl.trim(),
                cadetNumber:
                  input.cadetNumber.trim() ||
                  (input.isInstructor || input.department === 'Instructors' ? 'BMAS-INST' : ''),
                batch: cleanBatchLabel(input.batch),
                department:
                  input.isInstructor || input.department === 'Instructors'
                    ? 'Instructors'
                    : input.department,
                cdcNumber: input.cdcNumber.trim(),
                sidNumber: (input.sidNumber ?? '').trim(),
                currentRank: input.currentRank.trim(),
                availabilityStatus: input.availabilityStatus,
                bloodGroup: input.bloodGroup || '',
                city: input.city.trim(),
                country: input.country.trim(),
                cvUrl: input.cvUrl.trim(),
                memberSerial: generateMemberSerial(
                  input.cadetNumber.trim() ||
                    (input.isInstructor || input.department === 'Instructors' ? 'BMAS-INST' : ''),
                  input.batch.trim()
                ),
                contactEmail,
                contactPhone,
                additionalInfo: (input.additionalInfo ?? '').trim(),
              }
            : prev
        );
        setLiveVault((prev) => ({
          ...(prev ?? emptyVault(firebaseUser.uid, input.email.trim())),
          uid: firebaseUser.uid,
          email: input.email.trim(),
          phone: input.phone.trim(),
          whatsapp: input.whatsapp.trim(),
          academyName: (input.academyName ?? prev?.academyName ?? DEFAULT_ACADEMY_NAME).trim() || DEFAULT_ACADEMY_NAME,
          passportNumber: (input.passportNumber ?? prev?.passportNumber ?? '').trim(),
          passportIssueDate: (input.passportIssueDate ?? prev?.passportIssueDate ?? '').trim(),
          bankAccountHolder: (input.bankAccountHolder ?? prev?.bankAccountHolder ?? '').trim(),
          bankName: (input.bankName ?? prev?.bankName ?? '').trim(),
          bankBranch: (input.bankBranch ?? prev?.bankBranch ?? '').trim(),
          bankAccountNumber: (input.bankAccountNumber ?? prev?.bankAccountNumber ?? '').trim(),
          bankRoutingNumber: (input.bankRoutingNumber ?? prev?.bankRoutingNumber ?? '').trim(),
          mfsNumber: (input.mfsNumber ?? prev?.mfsNumber ?? '').trim(),
          passportExpiry: (input.passportExpiry ?? prev?.passportExpiry ?? '').trim(),
          cdcIssueDate: (input.cdcIssueDate ?? prev?.cdcIssueDate ?? '').trim(),
          cdcExpiry: (input.cdcExpiry ?? prev?.cdcExpiry ?? '').trim(),
          medicalExpiry: (input.medicalExpiry ?? prev?.medicalExpiry ?? '').trim(),
          stcwCocExpiry: (input.stcwCocExpiry ?? prev?.stcwCocExpiry ?? '').trim(),
          academicQualifications:
            input.academicQualifications ?? prev?.academicQualifications ?? [],
          nokName: (input.nokName ?? prev?.nokName ?? '').trim(),
          nokRelation: (input.nokRelation ?? prev?.nokRelation ?? '').trim(),
          nokPhone: (input.nokPhone ?? prev?.nokPhone ?? '').trim(),
          nokCity: (input.nokCity ?? prev?.nokCity ?? '').trim(),
        }));
        return;
      }

      if (sessionMode === 'harness' && currentUserProfile) {
        const isInst = Boolean(input.isInstructor || input.department === 'Instructors');
        const resolvedCadet = input.cadetNumber.trim() || (isInst ? 'BMAS-INST' : '');
        const serial = generateMemberSerial(resolvedCadet, input.batch.trim());
        setHarnessMembers((prev) =>
          prev.map((m) =>
            m.uid === currentUserProfile.uid
              ? {
                  ...m,
                  fullName: input.fullName.trim(),
                  photoUrl: input.photoUrl.trim(),
                  cadetNumber: resolvedCadet,
                  batch: cleanBatchLabel(input.batch),
                  department: isInst ? 'Instructors' : input.department,
                  cdcNumber: input.cdcNumber.trim(),
                  sidNumber: (input.sidNumber ?? '').trim(),
                  currentRank: input.currentRank.trim(),
                  availabilityStatus: input.availabilityStatus,
                  bloodGroup: input.bloodGroup || '',
                  city: input.city.trim(),
                  country: input.country.trim(),
                  cvUrl: input.cvUrl.trim(),
                  memberSerial: serial,
                  contactEmail,
                  contactPhone,
                  additionalInfo: (input.additionalInfo ?? '').trim(),
                  updatedAt: new Date().toISOString(),
                }
              : m
          )
        );
        setHarnessVaults((prev) => {
          const existing = prev[currentUserProfile.uid] ?? emptyVault(currentUserProfile.uid);
          return {
            ...prev,
            [currentUserProfile.uid]: {
              ...existing,
              email: input.email.trim(),
              phone: input.phone.trim(),
              whatsapp: input.whatsapp.trim(),
              academyName: (input.academyName ?? existing.academyName ?? DEFAULT_ACADEMY_NAME).trim() || DEFAULT_ACADEMY_NAME,
              passportNumber: (input.passportNumber ?? existing.passportNumber).trim(),
              passportIssueDate: (input.passportIssueDate ?? existing.passportIssueDate).trim(),
              bankAccountHolder: (input.bankAccountHolder ?? existing.bankAccountHolder).trim(),
              bankName: (input.bankName ?? existing.bankName).trim(),
              bankBranch: (input.bankBranch ?? existing.bankBranch).trim(),
              bankAccountNumber: (input.bankAccountNumber ?? existing.bankAccountNumber).trim(),
              bankRoutingNumber: (input.bankRoutingNumber ?? existing.bankRoutingNumber).trim(),
              mfsNumber: (input.mfsNumber ?? existing.mfsNumber).trim(),
              passportExpiry: (input.passportExpiry ?? existing.passportExpiry).trim(),
              cdcIssueDate: (input.cdcIssueDate ?? existing.cdcIssueDate).trim(),
              cdcExpiry: (input.cdcExpiry ?? existing.cdcExpiry).trim(),
              medicalExpiry: (input.medicalExpiry ?? existing.medicalExpiry).trim(),
              stcwCocExpiry: (input.stcwCocExpiry ?? existing.stcwCocExpiry).trim(),
              academicQualifications:
                input.academicQualifications ?? existing.academicQualifications ?? [],
              nokName: (input.nokName ?? existing.nokName).trim(),
              nokRelation: (input.nokRelation ?? existing.nokRelation).trim(),
              nokPhone: (input.nokPhone ?? existing.nokPhone).trim(),
              nokCity: (input.nokCity ?? existing.nokCity).trim(),
            },
          };
        });
      }
    },
    [sessionMode, firebaseUser, liveProfile, currentUserProfile]
  );

  const saveVoyage = useCallback(
    async (input: VoyageFormInput, existingId?: string) => {
      if (sessionMode === 'firebase' && firebaseUser) {
        if (!firebaseUser.emailVerified) {
          throw new Error('Please verify your email address before logging sea service records.');
        }
        await saveVoyageRecord(firebaseUser.uid, input, liveVoyages.length, existingId);
        return;
      }

      if (sessionMode === 'harness' && currentUserProfile) {
        const id = existingId || `voy_e2e_${Date.now()}`;
        const nextEntry: VoyageRecord = {
          id,
          memberId: currentUserProfile.uid,
          vesselName: input.vesselName.trim(),
          vesselType: input.vesselType,
          companyName: input.companyName.trim(),
          rankServed: input.rankServed.trim(),
          signOnDate: input.signOnDate.trim(),
          signOffDate: input.signOffDate.trim(),
          isVisible: true,
        };
        setHarnessVoyages((prev) =>
          existingId ? prev.map((v) => (v.id === existingId ? nextEntry : v)) : [nextEntry, ...prev]
        );
      }
    },
    [sessionMode, firebaseUser, liveVoyages.length, currentUserProfile]
  );

  const removeVoyage = useCallback(
    async (voyageId: string) => {
      if (sessionMode === 'firebase' && firebaseUser) {
        await deleteVoyageRecord(firebaseUser.uid, voyageId, liveVoyages.length);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessVoyages((prev) => prev.filter((v) => v.id !== voyageId));
      }
    },
    [sessionMode, firebaseUser, liveVoyages.length]
  );

  const getVoyagesForMember = useCallback(
    async (memberId: string): Promise<VoyageRecord[]> => {
      if (sessionMode === 'firebase') {
        if (firebaseUser && memberId === firebaseUser.uid) return liveVoyages;
        return fetchMemberVoyagesOnce(memberId);
      }
      if (sessionMode === 'harness' && currentUserProfile?.uid === memberId) {
        return harnessVoyages;
      }
      return [];
    },
    [sessionMode, firebaseUser, liveVoyages, currentUserProfile, harnessVoyages]
  );

  const adminInspectVault = useCallback(
    async (memberId: string): Promise<PrivateVault | null> => {
      if (!isAdmin) return null;
      if (sessionMode === 'firebase') {
        return adminFetchMemberPrivateVault(memberId);
      }
      if (sessionMode === 'harness') {
        return harnessVaults[memberId] ?? null;
      }
      return null;
    },
    [isAdmin, sessionMode, harnessVaults]
  );

  const postJob = useCallback(
    async (input: JobFormInput) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can post recruitment notices.');
      if (sessionMode === 'firebase' && firebaseUser) {
        const poster = currentUserProfile ?? {
          uid: firebaseUser.uid,
          fullName: firebaseUser.displayName || 'BMASA Administration',
          currentRank: isMainAdmin ? 'Main Administrator' : 'Administrator',
          batch: 'Admin',
        };
        await createJobPosting(poster, input);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessJobs((prev) => [
          {
            id: `job_e2e_${Date.now()}`,
            posterUid: currentUserProfile?.uid || 'e2e_admin_uid',
            posterName: currentUserProfile?.fullName || 'Razib Uddin',
            posterRank: currentUserProfile?.currentRank || 'Master Mariner',
            posterBatch: cleanBatchLabel(currentUserProfile?.batch || '2nd Batch'),
            companyName: input.companyName.trim(),
            rankNeeded: input.rankNeeded.trim(),
            vesselType: input.vesselType,
            contactInfo: input.contactInfo.trim(),
            notes: input.notes.trim(),
            status: 'open',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    },
    [isAdmin, isMainAdmin, currentUserProfile, sessionMode, firebaseUser]
  );

  const updateJob = useCallback(
    async (jobId: string, input: JobFormInput) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can edit job notices.');
      if (sessionMode === 'firebase' && firebaseUser) {
        await updateJobPosting(jobId, input);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  companyName: input.companyName.trim(),
                  rankNeeded: input.rankNeeded.trim(),
                  vesselType: input.vesselType,
                  contactInfo: input.contactInfo.trim(),
                  notes: input.notes.trim(),
                  updatedAt: new Date().toISOString(),
                }
              : j
          )
        );
      }
    },
    [isAdmin, sessionMode, firebaseUser]
  );

  const closeJob = useCallback(
    async (jobId: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can close job notices.');
      if (sessionMode === 'firebase') {
        await closeJobPosting(jobId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: 'closed' } : j))
        );
      }
    },
    [isAdmin, sessionMode]
  );

  const removeJob = useCallback(
    async (jobId: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can delete job notices.');
      if (sessionMode === 'firebase') {
        await deleteJobPosting(jobId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    },
    [isAdmin, sessionMode]
  );

  const toggleMemberVerification = useCallback(
    async (memberId: string, nextVerified: boolean) => {
      if (!isAdmin) return;
      if (sessionMode === 'firebase') {
        await adminToggleVerification(memberId, nextVerified);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessMembers((prev) =>
          prev.map((m) => (m.uid === memberId ? { ...m, isVerified: nextVerified } : m))
        );
      }
    },
    [isAdmin, sessionMode]
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      if (!isAdmin) return;
      if (sessionMode === 'firebase') {
        await adminDeleteMemberRecord(memberId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessMembers((prev) => prev.filter((m) => m.uid !== memberId));
      }
    },
    [isAdmin, sessionMode]
  );

  const addAdmin = useCallback(
    async (email: string, displayName: string) => {
      if (!isMainAdmin) {
        throw new Error(`Only the Main Admin (${MAIN_ADMIN_EMAIL}) can add administrators.`);
      }
      const normalized = email.trim().toLowerCase();
      if (sessionMode === 'firebase' && firebaseUser) {
        await addDelegatedAdmin(normalized, displayName);
        return;
      }
      if (sessionMode === 'harness') {
        const id = emailToAdminDocId(normalized);
        setHarnessAdmins((prev) =>
          [
            ...prev.filter((a) => a.id !== id),
            {
              id,
              email: normalized,
              displayName: displayName.trim(),
              addedByEmail: MAIN_ADMIN_EMAIL,
              role: 'admin' as const,
              createdAt: new Date().toISOString(),
            },
          ].sort((a, b) => a.email.localeCompare(b.email))
        );
      }
    },
    [isMainAdmin, sessionMode, firebaseUser]
  );

  const removeAdmin = useCallback(
    async (adminId: string) => {
      if (!isMainAdmin) {
        throw new Error(`Only the Main Admin (${MAIN_ADMIN_EMAIL}) can remove administrators.`);
      }
      if (sessionMode === 'firebase' && firebaseUser) {
        await removeDelegatedAdmin(adminId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessAdmins((prev) => prev.filter((a) => a.id !== adminId));
      }
    },
    [isMainAdmin, sessionMode, firebaseUser]
  );

  const saveBank = useCallback(
    async (input: BankAccountFormInput, existingId?: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can modify official bank accounts.');
      if (sessionMode === 'firebase' && firebaseUser) {
        await saveBankAccount(
          {
            uid: firebaseUser.uid,
            name: currentUserProfile?.fullName || firebaseUser.displayName || 'BMASA Admin',
          },
          input,
          existingId
        );
        return;
      }
      if (sessionMode === 'harness') {
        const id = existingId || `bank_e2e_${Date.now()}`;
        const nextBank: BankAccount = {
          id,
          bankName: input.bankName.trim(),
          accountName: input.accountName.trim(),
          accountNumber: input.accountNumber.trim(),
          branchName: input.branchName.trim(),
          routingNumber: input.routingNumber.trim(),
          accountType: input.accountType,
          currency: input.currency,
          notes: input.notes.trim(),
          isActive: true,
          addedByUid: currentUserProfile?.uid || 'e2e_admin_uid',
          addedByName: currentUserProfile?.fullName || 'Razib Uddin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setHarnessBanks((prev) =>
          existingId ? prev.map((b) => (b.id === existingId ? nextBank : b)) : [...prev, nextBank]
        );
      }
    },
    [isAdmin, sessionMode, firebaseUser, currentUserProfile]
  );

  const removeBank = useCallback(
    async (accountId: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can remove bank accounts.');
      if (sessionMode === 'firebase') {
        await deleteBankAccount(accountId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessBanks((prev) => prev.filter((b) => b.id !== accountId));
      }
    },
    [isAdmin, sessionMode]
  );

  const saveFundEntry = useCallback(
    async (input: FundTransactionFormInput, existingId?: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can record fund transactions.');
      if (sessionMode === 'firebase' && firebaseUser) {
        await saveFundTransaction(
          {
            uid: firebaseUser.uid,
            name:
              currentUserProfile?.fullName ||
              firebaseUser.displayName ||
              firebaseUser.email ||
              'BMASA Admin',
            email: firebaseUser.email || MAIN_ADMIN_EMAIL,
          },
          input,
          existingId
        );
        return;
      }
      if (sessionMode === 'harness') {
        const actorUid = currentUserProfile?.uid || 'e2e_admin_uid';
        const actorName = currentUserProfile?.fullName || 'Razib Uddin';
        const actorEmail = MAIN_ADMIN_EMAIL;
        const id = existingId || `fund_e2e_${Date.now()}`;
        setHarnessFunds((prev) => {
          const existing = existingId ? prev.find((t) => t.id === existingId) : undefined;
          const nextTx: FundTransaction = {
            id,
            memberUid: input.memberUid.trim(),
            memberName: input.memberName.trim(),
            memberCadetNumber: input.memberCadetNumber.trim(),
            memberBatch: input.memberBatch.trim(),
            entryType: input.entryType,
            amount: Number(Number(input.amount).toFixed(2)),
            currency: 'BDT',
            category: input.category,
            paymentMethod: input.paymentMethod,
            bankAccountLabel: input.bankAccountLabel.trim(),
            referenceNumber: input.referenceNumber.trim(),
            transactionDateTime: input.transactionDateTime.trim(),
            notes: input.notes.trim(),
            receiptDataUrl: input.receiptDataUrl.trim(),
            isPublished: true,
            recordedByUid: existing?.recordedByUid || actorUid,
            recordedByName: existing?.recordedByName || actorName,
            recordedByEmail: existing?.recordedByEmail || actorEmail,
            ...(existingId
              ? {
                  updatedByUid: actorUid,
                  updatedByName: actorName,
                  updatedByEmail: actorEmail,
                }
              : {}),
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const updated = existingId
            ? prev.map((t) => (t.id === existingId ? nextTx : t))
            : [nextTx, ...prev];
          return updated.sort((a, b) =>
            b.transactionDateTime.localeCompare(a.transactionDateTime)
          );
        });
      }
    },
    [isAdmin, sessionMode, firebaseUser, currentUserProfile]
  );

  const removeFundEntry = useCallback(
    async (transactionId: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can delete fund records.');
      if (sessionMode === 'firebase') {
        await deleteFundTransaction(transactionId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessFunds((prev) => prev.filter((t) => t.id !== transactionId));
      }
    },
    [isAdmin, sessionMode]
  );

  const saveCopCert = useCallback(
    async (input: CopCertificateFormInput & { isStandard?: boolean }, existingId?: string) => {
      if (sessionMode === 'firebase' && firebaseUser) {
        if (!firebaseUser.emailVerified) {
          throw new Error('Please verify your email address before saving COP certificates.');
        }
        await saveCopCertificate(firebaseUser.uid, input, existingId);
        return;
      }
      if (sessionMode === 'harness' && currentUserProfile) {
        const id = existingId || `cop_e2e_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        const next: CopCertificate = {
          id,
          memberId: currentUserProfile.uid,
          title: input.title.trim(),
          certNumber: input.certNumber.trim(),
          issueDate: input.issueDate.trim(),
          expiryDate: input.expiryDate.trim(),
          isStandard: Boolean(input.isStandard),
        };
        setHarnessCopCertificates((prev) =>
          existingId && prev.some((c) => c.id === existingId)
            ? prev.map((c) => (c.id === existingId ? next : c))
            : [...prev, next]
        );
      }
    },
    [sessionMode, firebaseUser, currentUserProfile]
  );

  const removeCopCert = useCallback(
    async (certId: string) => {
      if (sessionMode === 'firebase' && firebaseUser) {
        await deleteCopCertificate(firebaseUser.uid, certId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessCopCertificates((prev) => prev.filter((c) => c.id !== certId));
      }
    },
    [sessionMode, firebaseUser]
  );

  const submitMemberPaymentRequest = useCallback(
    async (input: PaymentSubmissionFormInput) => {
      if (!currentUserProfile) {
        throw new Error('Complete your BMASA member profile before submitting payments.');
      }
      if (sessionMode === 'firebase' && firebaseUser) {
        if (!firebaseUser.emailVerified) {
          throw new Error('Please verify your email address before submitting payment proofs.');
        }
        await submitMemberPayment(
          {
            uid: firebaseUser.uid,
            fullName: currentUserProfile.fullName,
            cadetNumber: currentUserProfile.cadetNumber,
            batch: currentUserProfile.batch,
          },
          input
        );
        return;
      }
      if (sessionMode === 'harness') {
        const sub: PaymentSubmission = {
          id: `pay_e2e_${Date.now()}`,
          memberUid: currentUserProfile.uid,
          memberName: currentUserProfile.fullName,
          memberCadetNumber: currentUserProfile.cadetNumber,
          memberBatch: currentUserProfile.batch,
          amount: Number(input.amount),
          currency: 'BDT',
          category: input.category,
          paymentMethod: input.paymentMethod,
          bankAccountLabel: input.bankAccountLabel.trim(),
          referenceNumber: input.referenceNumber.trim(),
          transactionDateTime: input.transactionDateTime.trim(),
          notes: input.notes.trim(),
          receiptDataUrl: input.receiptDataUrl.trim(),
          status: 'pending',
          adminNotes: '',
          reviewedByUid: '',
          reviewedByName: '',
          postedTransactionId: '',
          createdAt: new Date().toISOString(),
        };
        setHarnessPaymentSubmissions((prev) => [sub, ...prev]);
      }
    },
    [sessionMode, firebaseUser, currentUserProfile]
  );

  const approvePaymentRequest = useCallback(
    async (submission: PaymentSubmission, adminNotes = '') => {
      if (!isAdmin) throw new Error('Only BMASA administrators can approve payment proofs.');
      if (sessionMode === 'firebase' && firebaseUser) {
        await reviewPaymentSubmission(
          submission,
          'approved',
          {
            uid: firebaseUser.uid,
            name:
              currentUserProfile?.fullName ||
              firebaseUser.displayName ||
              firebaseUser.email ||
              'BMASA Admin',
            email: firebaseUser.email || MAIN_ADMIN_EMAIL,
          },
          adminNotes
        );
        return;
      }
      if (sessionMode === 'harness') {
        const txId = `tx_e2e_${Date.now()}`;
        const posted: FundTransaction = {
          id: txId,
          memberUid: submission.memberUid,
          memberName: submission.memberName,
          memberCadetNumber: submission.memberCadetNumber,
          memberBatch: submission.memberBatch,
          entryType: 'contribution',
          amount: submission.amount,
          currency: 'BDT',
          category: submission.category,
          paymentMethod: submission.paymentMethod,
          bankAccountLabel: submission.bankAccountLabel,
          referenceNumber: submission.referenceNumber,
          transactionDateTime: submission.transactionDateTime,
          notes: submission.notes || `Verified payment proof (${submission.referenceNumber})`,
          receiptDataUrl: submission.receiptDataUrl,
          isPublished: true,
          recordedByUid: currentUserProfile?.uid || 'e2e_admin_uid',
          recordedByName: currentUserProfile?.fullName || 'Razib Uddin',
          recordedByEmail: MAIN_ADMIN_EMAIL,
          createdAt: new Date().toISOString(),
        };
        setHarnessFunds((prev) => [posted, ...prev]);
        setHarnessPaymentSubmissions((prev) =>
          prev.map((s) =>
            s.id === submission.id
              ? {
                  ...s,
                  status: 'approved',
                  adminNotes: adminNotes.trim(),
                  reviewedByUid: currentUserProfile?.uid || 'e2e_admin_uid',
                  reviewedByName: currentUserProfile?.fullName || 'Razib Uddin',
                  postedTransactionId: txId,
                  updatedAt: new Date().toISOString(),
                }
              : s
          )
        );
      }
    },
    [isAdmin, sessionMode, firebaseUser, currentUserProfile]
  );

  const rejectPaymentRequest = useCallback(
    async (submission: PaymentSubmission, adminNotes = '') => {
      if (!isAdmin) throw new Error('Only BMASA administrators can decline payment proofs.');
      if (sessionMode === 'firebase' && firebaseUser) {
        await reviewPaymentSubmission(
          submission,
          'rejected',
          {
            uid: firebaseUser.uid,
            name:
              currentUserProfile?.fullName ||
              firebaseUser.displayName ||
              firebaseUser.email ||
              'BMASA Admin',
            email: firebaseUser.email || MAIN_ADMIN_EMAIL,
          },
          adminNotes
        );
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessPaymentSubmissions((prev) =>
          prev.map((s) =>
            s.id === submission.id
              ? {
                  ...s,
                  status: 'rejected',
                  adminNotes: adminNotes.trim() || 'Declined after treasury check.',
                  reviewedByUid: currentUserProfile?.uid || 'e2e_admin_uid',
                  reviewedByName: currentUserProfile?.fullName || 'Razib Uddin',
                  updatedAt: new Date().toISOString(),
                }
              : s
          )
        );
      }
    },
    [isAdmin, sessionMode, firebaseUser, currentUserProfile]
  );

  const saveNotice = useCallback(
    async (input: NoticeFormInput, existingId?: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can publish official circulars.');
      if (sessionMode === 'firebase' && firebaseUser) {
        await saveNoticeItem(
          {
            uid: firebaseUser.uid,
            name: currentUserProfile?.fullName || firebaseUser.displayName || 'BMASA Admin',
          },
          input,
          existingId
        );
        return;
      }
      if (sessionMode === 'harness') {
        const id = existingId || `notice_e2e_${Date.now()}`;
        setHarnessNotices((prev) => {
          const existing = existingId ? prev.find((n) => n.id === existingId) : undefined;
          const next: NoticeItem = {
            id,
            title: input.title.trim(),
            noticeType: input.noticeType,
            category: input.category,
            body: input.body.trim(),
            attachmentUrl: input.attachmentUrl.trim(),
            isPinned: input.isPinned,
            isPublished: true,
            authorUid: existing?.authorUid || currentUserProfile?.uid || 'e2e_admin_uid',
            authorName: existing?.authorName || currentUserProfile?.fullName || 'Razib Uddin',
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const updated = existingId
            ? prev.map((n) => (n.id === existingId ? next : n))
            : [next, ...prev];
          return updated.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
        });
      }
    },
    [isAdmin, sessionMode, firebaseUser, currentUserProfile]
  );

  const removeNotice = useCallback(
    async (noticeId: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can delete circulars.');
      if (sessionMode === 'firebase') {
        await deleteNoticeItem(noticeId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessNotices((prev) => prev.filter((n) => n.id !== noticeId));
      }
    },
    [isAdmin, sessionMode]
  );

  const saveMentorship = useCallback(
    async (input: MentorshipFormInput, existingId?: string) => {
      const canPost = isAdmin || Boolean(currentUserProfile?.isVerified);
      if (!canPost) {
        throw new Error('Only verified BMASA members can publish CoC mentorship notes.');
      }
      if (sessionMode === 'firebase' && firebaseUser) {
        await saveMentorshipPost(
          {
            uid: firebaseUser.uid,
            fullName: currentUserProfile?.fullName || firebaseUser.displayName || 'BMASA Officer',
            currentRank: currentUserProfile?.currentRank || 'Alumnus',
            batch: currentUserProfile?.batch || 'BMASA',
            isVerified: Boolean(currentUserProfile?.isVerified || isAdmin),
          },
          input,
          existingId
        );
        return;
      }
      if (sessionMode === 'harness') {
        const id = existingId || `mentor_e2e_${Date.now()}`;
        const next: MentorshipPost = {
          id,
          authorUid: currentUserProfile?.uid || 'e2e_member_uid',
          authorName: currentUserProfile?.fullName || 'BMASA Officer',
          authorRank: currentUserProfile?.currentRank || 'Deck Cadet',
          authorBatch: currentUserProfile?.batch || '4th Batch',
          authorVerified: Boolean(currentUserProfile?.isVerified || isAdmin),
          examTrack: input.examTrack,
          title: input.title.trim(),
          adviceBody: input.adviceBody.trim(),
          resourceUrl: input.resourceUrl.trim(),
          isPublished: true,
          createdAt: new Date().toISOString(),
        };
        setHarnessMentorship((prev) =>
          existingId ? prev.map((p) => (p.id === existingId ? next : p)) : [next, ...prev]
        );
      }
    },
    [isAdmin, currentUserProfile, sessionMode, firebaseUser]
  );

  const removeMentorship = useCallback(
    async (postId: string) => {
      if (sessionMode === 'firebase') {
        await deleteMentorshipPost(postId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessMentorship((prev) => prev.filter((p) => p.id !== postId));
      }
    },
    [sessionMode]
  );

  const saveCrewing = useCallback(
    async (input: CrewingCompanyFormInput, existingId?: string) => {
      const canPost = isAdmin || Boolean(currentUserProfile?.isVerified);
      if (!canPost) {
        throw new Error('Only verified BMASA members can list verified manning companies.');
      }
      if (sessionMode === 'firebase' && firebaseUser) {
        await saveCrewingCompany(
          {
            uid: firebaseUser.uid,
            fullName: currentUserProfile?.fullName || firebaseUser.displayName || 'BMASA Member',
            isVerified: Boolean(currentUserProfile?.isVerified || isAdmin),
          },
          input,
          existingId
        );
        return;
      }
      if (sessionMode === 'harness') {
        const id = existingId || `crew_e2e_${Date.now()}`;
        const next: CrewingCompany = {
          id,
          companyName: input.companyName.trim(),
          dosLicense: input.dosLicense.trim(),
          fleetType: input.fleetType.trim(),
          cadetIntakeStatus: input.cadetIntakeStatus,
          contactEmail: input.contactEmail.trim(),
          alumniNotes: input.alumniNotes.trim(),
          authorUid: currentUserProfile?.uid || 'e2e_member_uid',
          authorName: currentUserProfile?.fullName || 'BMASA Officer',
          authorVerified: Boolean(currentUserProfile?.isVerified || isAdmin),
          isPublished: true,
          createdAt: new Date().toISOString(),
        };
        setHarnessCrewing((prev) =>
          existingId ? prev.map((c) => (c.id === existingId ? next : c)) : [next, ...prev]
        );
      }
    },
    [isAdmin, currentUserProfile, sessionMode, firebaseUser]
  );

  const removeCrewing = useCallback(
    async (companyId: string) => {
      if (sessionMode === 'firebase') {
        await deleteCrewingCompany(companyId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessCrewing((prev) => prev.filter((c) => c.id !== companyId));
      }
    },
    [sessionMode]
  );

  const saveRoadmapItem = useCallback(
    async (input: DhakaRoadmapFormInput, existingId?: string) => {
      if (!isAdmin) {
        throw new Error('Only BMASA administrators can manage committee or Dhaka Office roadmap.');
      }
      if (sessionMode === 'firebase' && firebaseUser) {
        await saveDhakaRoadmapItem(firebaseUser.uid, input, existingId);
        return;
      }
      if (sessionMode === 'harness') {
        const id = existingId || `dhaka_e2e_${Date.now()}`;
        const next: DhakaRoadmapItem = {
          id,
          itemType: input.itemType,
          title: input.title.trim(),
          subtitle: input.subtitle.trim(),
          personName: input.personName.trim(),
          personBatch: input.personBatch.trim(),
          personCadetNo: input.personCadetNo.trim(),
          status: input.status,
          targetAmountBdt: Math.max(0, Number(input.targetAmountBdt || 0)),
          raisedAmountBdt: Math.max(0, Number(input.raisedAmountBdt || 0)),
          displayOrder: Math.max(0, Number(input.displayOrder || 1)),
          notes: input.notes.trim(),
          isPublished: true,
          updatedByUid: currentUserProfile?.uid || 'e2e_admin_uid',
          createdAt: new Date().toISOString(),
        };
        setHarnessRoadmap((prev) =>
          (existingId ? prev.map((r) => (r.id === existingId ? next : r)) : [...prev, next]).sort(
            (a, b) => a.displayOrder - b.displayOrder
          )
        );
      }
    },
    [isAdmin, sessionMode, firebaseUser, currentUserProfile]
  );

  const removeRoadmapItem = useCallback(
    async (itemId: string) => {
      if (!isAdmin) throw new Error('Only BMASA administrators can delete roadmap entries.');
      if (sessionMode === 'firebase') {
        await deleteDhakaRoadmapItem(itemId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessRoadmap((prev) => prev.filter((r) => r.id !== itemId));
      }
    },
    [isAdmin, sessionMode]
  );

  const addGalleryPhoto = useCallback(
    async (input: { batch: string; title: string; description?: string; photoUrl: string }) => {
      if (!isAdmin) {
        throw new Error('Only BMASA administrators can upload batch photos.');
      }
      if (sessionMode === 'firebase' && firebaseUser) {
        await saveGalleryPhotoItem(
          {
            uid: firebaseUser.uid,
            name:
              currentUserProfile?.fullName ||
              firebaseUser.displayName ||
              firebaseUser.email ||
              'BMASA Administrator',
          },
          input
        );
        return;
      }
      if (sessionMode === 'harness') {
        const uploaderName = currentUserProfile?.fullName || 'BMASA Administrator';
        const uploaderUid = currentUserProfile?.uid || 'admin';
        const newPhoto: GalleryPhoto = {
          id: `gal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          batch: input.batch,
          title: input.title,
          description: input.description,
          photoUrl: input.photoUrl,
          uploadedByUid: uploaderUid,
          uploadedByName: uploaderName,
          uploadedAt: new Date().toISOString(),
        };
        setHarnessGalleryPhotos((prev) => [newPhoto, ...prev]);
      }
    },
    [isAdmin, sessionMode, firebaseUser, currentUserProfile]
  );

  const removeGalleryPhoto = useCallback(
    async (photoId: string) => {
      if (!isAdmin) {
        throw new Error('Only BMASA administrators can delete gallery photos.');
      }
      if (sessionMode === 'firebase') {
        await deleteGalleryPhotoItem(photoId);
        return;
      }
      if (sessionMode === 'harness') {
        setHarnessGalleryPhotos((prev) => prev.filter((p) => p.id !== photoId));
      }
    },
    [isAdmin, sessionMode]
  );

  const clearFirestoreError = useCallback(() => setFirestoreError(null), []);

  return (
    <PortalContext.Provider
      value={{
        authReady,
        sessionMode,
        firebaseUser,
        isMainAdmin,
        isAdmin,
        needsEmailVerification,
        needsProfileSetup,
        onboardingPrefill,
        showSignInLoader,
        triggerSignInLoader,
        completeSignInLoader,
        showWelcomeOverlay,
        dismissWelcomeOverlay,
        currentUserProfile,
        currentUserContact: currentUserVault,
        currentUserVault,
        currentUserVoyages,
        currentUserCopCertificates,
        directoryMembers,
        jobPostings,
        admins,
        bankAccounts,
        fundTransactions,
        paymentSubmissions,
        notices,
        mentorshipPosts,
        crewingCompanies,
        dhakaRoadmap,
        portalStats,
        firestoreError,
        clearFirestoreError,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        refreshAuthVerification,
        logout,
        completeOnboarding,
        saveProfile,
        saveVoyage,
        removeVoyage,
        getVoyagesForMember,
        saveCopCert,
        removeCopCert,
        adminInspectVault,
        postJob,
        updateJob,
        closeJob,
        removeJob,
        toggleMemberVerification,
        removeMember,
        addAdmin,
        removeAdmin,
        syncPublicStatsNow,
        syncDirectoryContacts,
        saveBank,
        removeBank,
        saveFundEntry,
        removeFundEntry,
        submitMemberPaymentRequest,
        approvePaymentRequest,
        rejectPaymentRequest,
        saveNotice,
        removeNotice,
        saveMentorship,
        removeMentorship,
        saveCrewing,
        removeCrewing,
        saveRoadmapItem,
        removeRoadmapItem,
        galleryPhotos,
        addGalleryPhoto,
        removeGalleryPhoto,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}
