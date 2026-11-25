export type Department = 'Nautical' | 'Marine Engineering' | 'Instructors';

export type AvailabilityStatus =
  | 'Available for Sea'
  | 'Onboard'
  | 'On Leave'
  | 'Shore-Based';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export type VesselType =
  | 'Bulk Carrier'
  | 'Oil Tanker'
  | 'Chemical Tanker'
  | 'Container'
  | 'LNG / LPG'
  | 'General Cargo'
  | 'Ro-Ro / PCC'
  | 'Offshore / PSV';

export type JobVesselType = VesselType | 'Any Vessel Type';

export type JobStatus = 'open' | 'closed';

export type PortalTab =
  | 'credential'
  | 'profile'
  | 'directory'
  | 'jobs'
  | 'community'
  | 'funds'
  | 'gallery'
  | 'admin';

export type BankAccountType = 'Bank Account' | 'Mobile Banking' | 'Fixed Deposit';
export type BankCurrency = 'BDT' | 'USD';

export type FundEntryType = 'contribution' | 'disbursement';

export type FundCategory =
  | 'Monthly Subscription'
  | 'Annual Membership Fee'
  | 'Welfare Fund'
  | 'Cadet Support'
  | 'Dhaka Office Fund'
  | 'Event / Reunion'
  | 'Operational Expense'
  | 'Other';

export type FundPaymentMethod =
  | 'Bank Transfer'
  | 'bKash'
  | 'Nagad'
  | 'Rocket'
  | 'Cash'
  | 'Cheque';

export type NoticeCategory =
  | 'Reunion'
  | 'AGM Notice'
  | 'Cadet Induction'
  | 'Dhaka Office'
  | 'General Circular';

export type NoticeType = 'Nautical' | 'Engineering' | 'General';

export type MentorshipExamTrack =
  | 'Class 3 / CoC'
  | 'Class 2'
  | 'Class 1 / Master'
  | 'Class 1 / Chief Eng'
  | 'Cadet Prep'
  | 'Sea Interview';

export type CrewingIntakeStatus =
  | 'Accepting Cadets'
  | 'Officers Only'
  | 'Seasonal Intake'
  | 'Paused';

export type RoadmapItemType = 'committee' | 'milestone';
export type RoadmapItemStatus = 'Active' | 'Planned' | 'In Progress' | 'Completed';

export interface DirectoryProfile {
  uid: string;
  fullName: string;
  photoUrl: string;
  cadetNumber: string;
  batch: string;
  department: Department;
  cdcNumber: string;
  sidNumber?: string;
  currentRank: string;
  availabilityStatus: AvailabilityStatus;
  bloodGroup: BloodGroup | '';
  city: string;
  country: string;
  cvUrl: string;
  memberSerial: string;
  isVerified: boolean;
  isPublicDirectory: boolean;
  voyageCount: number;
  contactEmail?: string;
  contactPhone?: string;
  additionalInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicQualification {
  id: string;
  level: string; // e.g., 'SSC', 'HSC', 'Pre-Sea Maritime Training', 'B.Sc.'
  institution: string;
  boardOrUniversity: string;
  passingYear: string;
  result: string;
}

export const DEFAULT_ACADEMY_NAME = 'Bangladesh Marine Academy Sylhet';

export const ACADEMIC_LEVEL_PRESETS: readonly string[] = [
  'SSC',
  'HSC',
  'Pre-Sea Maritime Training',
  'B.Sc. in Nautical Science',
  'B.Sc. in Marine Engineering',
  'Diploma / HND',
  'Other',
];

export interface CopCertificate {
  id: string;
  memberId: string;
  title: string;
  certNumber: string;
  issueDate: string; // YYYY-MM-DD or ''
  expiryDate: string; // YYYY-MM-DD or ''
  isStandard: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const STANDARD_COP_CERTIFICATES: readonly string[] = [
  'Basic Safety Training (PST / FPFF / EFA / PSSR)',
  'PSCRB (Survival Craft & Rescue Boats)',
  'Advanced Fire Fighting (AFF)',
  'Security Awareness / DSD (SSA / DSD)',
  'Medical First Aid / Medical Care',
  'Tanker Endorsement / ECDIS / GMDSS',
];

export interface PrivateVault {
  uid: string;
  email: string;
  phone: string;
  whatsapp: string;
  academyName: string;
  passportNumber: string;
  passportIssueDate: string;
  bankAccountHolder: string;
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  mfsNumber: string;
  passportExpiry: string;
  cdcIssueDate: string;
  cdcExpiry: string;
  medicalExpiry: string;
  stcwCocExpiry: string;
  academicQualifications: AcademicQualification[];
  nokName: string;
  nokRelation: string;
  nokPhone: string;
  nokCity: string;
  createdAt?: string;
  updatedAt?: string;
}

export type MemberPrivateContact = PrivateVault;

export interface VoyageRecord {
  id: string;
  memberId: string;
  vesselName: string;
  vesselType: VesselType;
  companyName: string;
  rankServed: string;
  signOnDate: string; // YYYY-MM-DD
  signOffDate: string; // YYYY-MM-DD or '' if currently onboard
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobPosting {
  id: string;
  posterUid: string;
  posterName: string;
  posterRank: string;
  posterBatch: string;
  companyName: string;
  rankNeeded: string;
  vesselType: JobVesselType;
  contactInfo: string;
  notes: string;
  status: JobStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface PortalStats {
  registeredAlumni: number;
  verifiedCadets: number;
  activePlacements: number;
}

export interface AdminEntry {
  id: string;
  email: string;
  displayName: string;
  addedByEmail: string;
  role: 'admin';
  createdAt?: string;
  updatedAt?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string;
  routingNumber: string;
  accountType: BankAccountType;
  currency: BankCurrency;
  notes: string;
  isActive: boolean;
  addedByUid: string;
  addedByName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FundTransaction {
  id: string;
  memberUid: string;
  memberName: string;
  memberCadetNumber: string;
  memberBatch: string;
  entryType: FundEntryType;
  amount: number;
  currency: 'BDT';
  category: FundCategory;
  paymentMethod: FundPaymentMethod;
  bankAccountLabel: string;
  referenceNumber: string;
  transactionDateTime: string; // YYYY-MM-DDTHH:mm
  notes: string;
  receiptDataUrl: string;
  isPublished: boolean;
  recordedByUid: string;
  recordedByName: string;
  recordedByEmail: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedByEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentSubmission {
  id: string;
  memberUid: string;
  memberName: string;
  memberCadetNumber: string;
  memberBatch: string;
  amount: number;
  currency: 'BDT';
  category: Exclude<FundCategory, 'Operational Expense'>;
  paymentMethod: FundPaymentMethod;
  bankAccountLabel: string;
  referenceNumber: string;
  transactionDateTime: string;
  notes: string;
  receiptDataUrl: string;
  status: PaymentSubmissionStatus;
  adminNotes: string;
  reviewedByUid: string;
  reviewedByName: string;
  postedTransactionId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  noticeType: NoticeType;
  category: NoticeCategory;
  body: string;
  attachmentUrl: string;
  isPinned: boolean;
  isPublished: boolean;
  authorUid: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MentorshipPost {
  id: string;
  authorUid: string;
  authorName: string;
  authorRank: string;
  authorBatch: string;
  authorVerified: boolean;
  examTrack: MentorshipExamTrack;
  title: string;
  adviceBody: string;
  resourceUrl: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CrewingCompany {
  id: string;
  companyName: string;
  dosLicense: string;
  fleetType: string;
  cadetIntakeStatus: CrewingIntakeStatus;
  contactEmail: string;
  alumniNotes: string;
  authorUid: string;
  authorName: string;
  authorVerified: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DhakaRoadmapItem {
  id: string;
  itemType: RoadmapItemType;
  title: string;
  subtitle: string;
  personName: string;
  personBatch: string;
  personCadetNo: string;
  status: RoadmapItemStatus;
  targetAmountBdt: number;
  raisedAmountBdt: number;
  displayOrder: number;
  notes: string;
  isPublished: boolean;
  updatedByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberFundSummary {
  memberUid: string;
  memberName: string;
  cadetNumber: string;
  batch: string;
  department: Department | 'External';
  isVerified: boolean;
  totalContributed: number;
  contributionCount: number;
  lastContributionDateTime: string | null;
  lastRecordedByName?: string | null;
}

export interface DirectoryFilters {
  query: string;
  batch: string;
  department: 'All' | Department;
  rank: string;
  availability: 'All' | AvailabilityStatus;
  bloodGroup?: 'All' | BloodGroup;
  city?: string;
}

export const DEPARTMENTS: Department[] = ['Nautical', 'Marine Engineering', 'Instructors'];

export const BLOOD_GROUPS: BloodGroup[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
];

export const AVAILABILITY_STATUSES: AvailabilityStatus[] = [
  'Available for Sea',
  'Onboard',
  'On Leave',
  'Shore-Based',
];

export const VESSEL_TYPES: VesselType[] = [
  'Bulk Carrier',
  'Oil Tanker',
  'Chemical Tanker',
  'Container',
  'LNG / LPG',
  'General Cargo',
  'Ro-Ro / PCC',
  'Offshore / PSV',
];

export const JOB_VESSEL_TYPES: JobVesselType[] = [
  ...VESSEL_TYPES,
  'Any Vessel Type',
];

export const BANK_ACCOUNT_TYPES: BankAccountType[] = [
  'Bank Account',
  'Mobile Banking',
  'Fixed Deposit',
];

export const BANK_CURRENCIES: BankCurrency[] = ['BDT', 'USD'];

export const FUND_CATEGORIES: FundCategory[] = [
  'Monthly Subscription',
  'Annual Membership Fee',
  'Welfare Fund',
  'Cadet Support',
  'Dhaka Office Fund',
  'Event / Reunion',
  'Operational Expense',
  'Other',
];

export const FUND_PAYMENT_METHODS: FundPaymentMethod[] = [
  'Bank Transfer',
  'bKash',
  'Nagad',
  'Rocket',
  'Cash',
  'Cheque',
];

export const NOTICE_CATEGORIES: NoticeCategory[] = [
  'Reunion',
  'AGM Notice',
  'Cadet Induction',
  'Dhaka Office',
  'General Circular',
];

export const NOTICE_TYPES: NoticeType[] = ['Nautical', 'Engineering', 'General'];

export const MENTORSHIP_TRACKS: MentorshipExamTrack[] = [
  'Class 3 / CoC',
  'Class 2',
  'Class 1 / Master',
  'Class 1 / Chief Eng',
  'Cadet Prep',
  'Sea Interview',
];

export const CREWING_INTAKE_STATUSES: CrewingIntakeStatus[] = [
  'Accepting Cadets',
  'Officers Only',
  'Seasonal Intake',
  'Paused',
];

export const ROADMAP_ITEM_STATUSES: RoadmapItemStatus[] = [
  'Active',
  'Planned',
  'In Progress',
  'Completed',
];

export const BMAS_BATCHES: string[] = [
  '2nd Batch',
  '3rd Batch',
  '4th Batch',
  '5th Batch',
  '6th Batch',
  '7th Batch',
  '8th Batch',
  '9th Batch',
  '10th Batch',
  '11th Batch',
  '12th Batch',
  '13th Batch',
  '14th Batch',
  '15th Batch',
];

export interface RankOptionGroup {
  label: string;
  ranks: string[];
}

export const MARITIME_RANK_GROUPS: RankOptionGroup[] = [
  {
    label: 'Deck Department (Nautical)',
    ranks: [
      'Master Mariner',
      'Chief Officer',
      '2nd Officer',
      'Third Officer',
      '3rd Officer',
      'Junior 3rd Officer',
      'Junior Officer',
      'Cadet',
      'Deck Cadet',
      'Pre-Sea Deck Cadet',
      'Bosun',
    ],
  },
  {
    label: 'Marine Engineering Department',
    ranks: [
      'Chief Engineer',
      '2nd Engineer',
      '3rd Engineer',
      '4th Engineer',
      'Junior Engineer',
      'Engine Cadet',
      'Pre-Sea Engine Cadet',
      'Fitter / Motorman',
    ],
  },
  {
    label: 'Electro-Technical & Specialist',
    ranks: [
      'Electro-Technical Officer (ETO)',
      'Trainee ETO',
      'Refrigeration Engineer (Reefer)',
      'Pumpman',
    ],
  },
  {
    label: 'Shore, Port & Technical Management',
    ranks: [
      'Marine Superintendent',
      'Technical Superintendent',
      'Shore Superintendent',
      'Fleet Manager',
      'Port Captain',
      'Harbour Pilot',
      'Crew / Manning Manager',
      'HSEQA / DPA Manager',
      'Marine Surveyor',
      'Shore Operations',
      'Senior Instructor',
      'Maritime Instructor / Lecturer',
      'Retired Mariner / Senior Advisor',
    ],
  },
  {
    label: 'Offshore & Specialized Fleet',
    ranks: [
      'Offshore Installation Manager (OIM)',
      'DPO (Dynamic Positioning Officer)',
      'Chief Mate (OSV / AHTS)',
      'Chief Engineer (OSV / AHTS)',
    ],
  },
];

export const MARITIME_RANKS: string[] = MARITIME_RANK_GROUPS.flatMap((group) => group.ranks);

export const BMASA_COMMITTEE_ROLES: string[] = [
  'President',
  'Senior Vice President',
  'Vice President',
  'General Secretary',
  'Joint Secretary',
  'Treasurer',
  'Assistant Treasurer',
  'Organizing Secretary',
  'Welfare & Blood Donor Coordinator',
  'Placement & Crewing Secretary',
  'CoC Mentorship Coordinator',
  'IT & Media Secretary',
  'Batch Representative',
  'Executive Committee Member',
];

export const ADMIN_DELEGATION_ROLES: string[] = [
  'Treasurer / Finance Admin',
  'Member Verification Admin',
  'Placement & Job Board Admin',
  'Circulars & Community Admin',
  'Batch Coordinator Admin',
];

export interface GalleryPhoto {
  id: string;
  batch: string; // e.g. "1st Batch", "2nd Batch", etc.
  title: string;
  description?: string;
  photoUrl: string;
  uploadedByUid: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface MaritimeNewsArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  publishedDate: string;
  highlights?: string[];
}

export interface MaritimeNewsResponse {
  articles: MaritimeNewsArticle[];
  lastUpdated: string;
  groundingSources?: Array<{ title: string; url: string }>;
  cached?: boolean;
  warning?: string;
}

