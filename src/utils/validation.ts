import {
  AVAILABILITY_STATUSES,
  BANK_ACCOUNT_TYPES,
  BANK_CURRENCIES,
  BLOOD_GROUPS,
  CREWING_INTAKE_STATUSES,
  DEPARTMENTS,
  FUND_CATEGORIES,
  FUND_PAYMENT_METHODS,
  JOB_VESSEL_TYPES,
  MENTORSHIP_TRACKS,
  NOTICE_CATEGORIES,
  NOTICE_TYPES,
  ROADMAP_ITEM_STATUSES,
  VESSEL_TYPES,
  type AcademicQualification,
  type AvailabilityStatus,
  type BankAccountType,
  type BankCurrency,
  type BloodGroup,
  type CrewingIntakeStatus,
  type Department,
  type FundCategory,
  type FundEntryType,
  type FundPaymentMethod,
  type JobVesselType,
  type MentorshipExamTrack,
  type NoticeCategory,
  type NoticeType,
  type RoadmapItemStatus,
  type RoadmapItemType,
  type VesselType,
} from '../types/portal';

export const MAIN_ADMIN_EMAIL = 'razibuddin247@gmail.com';

/**
 * Synchronized verbatim with firebase-blueprint.json & firestore.rules.
 */
export const SCHEMA_BOUNDS = {
  id: { min: 1, max: 128, pattern: /^[a-zA-Z0-9_-]+$/ },
  fullName: { min: 2, max: 100 },
  photoUrl: { min: 0, max: 100000 },
  cadetNumber: { min: 2, max: 24, pattern: /^[A-Za-z0-9\-/ ]+$/ },
  batch: { min: 2, max: 48 },
  cdcNumber: { min: 0, max: 32, pattern: /^[A-Za-z0-9\-/ ]*$/ },
  sidNumber: { min: 0, max: 32, pattern: /^[A-Za-z0-9\-/ ]*$/ },
  currentRank: { min: 2, max: 64 },
  city: { min: 0, max: 80 },
  country: { min: 0, max: 80 },
  cvUrl: { min: 0, max: 500 },
  memberSerial: { min: 2, max: 40, pattern: /^[A-Za-z0-9\-/ ]+$/ },
  email: { min: 3, max: 160, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { min: 0, max: 32 },
  whatsapp: { min: 0, max: 32 },
  passportNumber: { min: 0, max: 32, pattern: /^[A-Za-z0-9\-/ ]*$/ },
  academyName: { min: 0, max: 140 },
  academicQualificationMaxCount: 12,
  academicLevel: { min: 1, max: 80 },
  academicInstitution: { min: 0, max: 140 },
  academicBoard: { min: 0, max: 120 },
  academicYear: { min: 0, max: 12 },
  academicResult: { min: 0, max: 64 },
  bankAccountHolder: { min: 0, max: 120 },
  bankName: { min: 2, max: 120 },
  bankBranch: { min: 0, max: 120 },
  accountName: { min: 2, max: 120 },
  accountNumber: { min: 2, max: 64, pattern: /^[A-Za-z0-9\-/ +]+$/ },
  vaultAccountNumber: { min: 0, max: 64 },
  branchName: { min: 0, max: 120 },
  routingNumber: { min: 0, max: 64 },
  mfsNumber: { min: 0, max: 32 },
  nokName: { min: 0, max: 100 },
  nokRelation: { min: 0, max: 40 },
  nokPhone: { min: 0, max: 32 },
  nokCity: { min: 0, max: 80 },
  vesselName: { min: 2, max: 100 },
  companyName: { min: 2, max: 120 },
  rankServed: { min: 2, max: 64 },
  dateIso: { pattern: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ },
  optionalDateIso: { pattern: /^([0-9]{4}-[0-9]{2}-[0-9]{2})?$/ },
  dateTimeIso: {
    pattern: /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]{1,3})?Z?)?$/,
  },
  contactInfo: { min: 3, max: 160 },
  notes: { min: 0, max: 1000 },
  rankNeeded: { min: 2, max: 64 },
  displayName: { min: 0, max: 100 },
  bankNotes: { min: 0, max: 500 },
  referenceNumber: { min: 0, max: 80 },
  receiptDataUrl: { min: 0, max: 150000 },
  fundAmount: { min: 1, max: 100000000 },
  noticeTitle: { min: 3, max: 140 },
  noticeBody: { min: 10, max: 4000 },
  mentorshipTitle: { min: 4, max: 140 },
  adviceBody: { min: 10, max: 4000 },
  dosLicense: { min: 0, max: 40 },
  fleetType: { min: 2, max: 120 },
  milestoneTitle: { min: 2, max: 120 },
  subtitle: { min: 0, max: 140 },
  additionalInfo: { min: 0, max: 1000 },
} as const;

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface ProfileFormInput {
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
  email: string;
  phone: string;
  whatsapp: string;
  // Private vault fields
  academyName?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  bankAccountHolder?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  mfsNumber?: string;
  passportExpiry?: string;
  cdcIssueDate?: string;
  cdcExpiry?: string;
  medicalExpiry?: string;
  stcwCocExpiry?: string;
  academicQualifications?: AcademicQualification[];
  nokName?: string;
  nokRelation?: string;
  nokPhone?: string;
  nokCity?: string;
  showContactInDirectory?: boolean;
  additionalInfo?: string;
  isInstructor?: boolean;
}

export interface VoyageFormInput {
  vesselName: string;
  vesselType: VesselType;
  companyName: string;
  rankServed: string;
  signOnDate: string;
  signOffDate: string;
}

export interface JobFormInput {
  companyName: string;
  rankNeeded: string;
  vesselType: JobVesselType;
  contactInfo: string;
  notes: string;
}

export interface AdminFormInput {
  email: string;
  displayName: string;
}

export interface BankAccountFormInput {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string;
  routingNumber: string;
  accountType: BankAccountType;
  currency: BankCurrency;
  notes: string;
}

export interface FundTransactionFormInput {
  memberUid: string;
  memberName: string;
  memberCadetNumber: string;
  memberBatch: string;
  entryType: FundEntryType;
  amount: string;
  category: FundCategory;
  paymentMethod: FundPaymentMethod;
  bankAccountLabel: string;
  referenceNumber: string;
  transactionDateTime: string;
  notes: string;
  receiptDataUrl: string;
}

export interface NoticeFormInput {
  title: string;
  noticeType: NoticeType;
  category: NoticeCategory;
  body: string;
  attachmentUrl: string;
  isPinned: boolean;
}

export interface MentorshipFormInput {
  examTrack: MentorshipExamTrack;
  title: string;
  adviceBody: string;
  resourceUrl: string;
}

export interface CrewingCompanyFormInput {
  companyName: string;
  dosLicense: string;
  fleetType: string;
  cadetIntakeStatus: CrewingIntakeStatus;
  contactEmail: string;
  alumniNotes: string;
}

export interface DhakaRoadmapFormInput {
  itemType: RoadmapItemType;
  title: string;
  subtitle: string;
  personName: string;
  personBatch: string;
  personCadetNo: string;
  status: RoadmapItemStatus;
  targetAmountBdt: string;
  raisedAmountBdt: string;
  displayOrder: string;
  notes: string;
}

/**
 * Deterministically converts an email address into a valid Firestore document ID.
 * Mirrors firestore.rules: email.lower().replace('[^a-z0-9]', '_')
 */
export function emailToAdminDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function isSafeHttpUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSafeReceiptSource(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('data:image/')) {
    return trimmed.length <= SCHEMA_BOUNDS.receiptDataUrl.max;
  }
  return isSafeHttpUrl(trimmed) && trimmed.length <= SCHEMA_BOUNDS.receiptDataUrl.max;
}

export function generateMemberSerial(cadetNumber: string, _batch?: string): string {
  return cadetNumber.trim().toUpperCase().slice(0, SCHEMA_BOUNDS.memberSerial.max);
}

export function validateProfileInput(
  input: ProfileFormInput,
  options: {
    requirePhoto?: boolean;
    requireCdc?: boolean;
    requireBloodGroup?: boolean;
    requireLocation?: boolean;
  } = {}
): ValidationResult {
  const errors: Record<string, string> = {};

  const fullName = input.fullName.trim();
  if (fullName.length < SCHEMA_BOUNDS.fullName.min) {
    errors.fullName = 'Full name must be at least 2 characters.';
  } else if (fullName.length > SCHEMA_BOUNDS.fullName.max) {
    errors.fullName = `Full name cannot exceed ${SCHEMA_BOUNDS.fullName.max} characters.`;
  }

  const isInstructor = Boolean(input.isInstructor || input.department === 'Instructors');
  const cadetNumber = input.cadetNumber.trim();
  if (!isInstructor) {
    if (cadetNumber.length < SCHEMA_BOUNDS.cadetNumber.min) {
      errors.cadetNumber = 'Academic Cadet Number is required (e.g., BMAS-04-N0108).';
    } else if (cadetNumber.length > SCHEMA_BOUNDS.cadetNumber.max) {
      errors.cadetNumber = `Cadet Number cannot exceed ${SCHEMA_BOUNDS.cadetNumber.max} characters.`;
    } else if (!SCHEMA_BOUNDS.cadetNumber.pattern.test(cadetNumber)) {
      errors.cadetNumber = 'Use letters, numbers, hyphens, or slashes only.';
    }
  } else if (cadetNumber) {
    if (cadetNumber.length > SCHEMA_BOUNDS.cadetNumber.max) {
      errors.cadetNumber = `ID reference cannot exceed ${SCHEMA_BOUNDS.cadetNumber.max} characters.`;
    } else if (!SCHEMA_BOUNDS.cadetNumber.pattern.test(cadetNumber)) {
      errors.cadetNumber = 'Use letters, numbers, hyphens, or slashes only.';
    }
  }

  const batch = input.batch.trim();
  if (batch.length < SCHEMA_BOUNDS.batch.min || batch.length > SCHEMA_BOUNDS.batch.max) {
    errors.batch = 'Select or enter a valid BMASA batch (e.g., 2nd Batch).';
  }

  if (!DEPARTMENTS.includes(input.department)) {
    errors.department = 'Select Nautical, Marine Engineering, or Instructors.';
  }

  const cdcNumber = input.cdcNumber.trim();
  if (options.requireCdc && cdcNumber.length < 2) {
    errors.cdcNumber = 'CDC Number is required (Continuous Discharge Certificate).';
  } else if (cdcNumber.length > SCHEMA_BOUNDS.cdcNumber.max) {
    errors.cdcNumber = `CDC Number cannot exceed ${SCHEMA_BOUNDS.cdcNumber.max} characters.`;
  } else if (cdcNumber && !SCHEMA_BOUNDS.cdcNumber.pattern.test(cdcNumber)) {
    errors.cdcNumber = 'CDC Number may contain letters, numbers, hyphens, and slashes only.';
  }

  const sidNumber = (input.sidNumber ?? '').trim();
  if (sidNumber.length > SCHEMA_BOUNDS.sidNumber.max) {
    errors.sidNumber = `SID Card Number cannot exceed ${SCHEMA_BOUNDS.sidNumber.max} characters.`;
  } else if (sidNumber && !SCHEMA_BOUNDS.sidNumber.pattern.test(sidNumber)) {
    errors.sidNumber = 'SID Card Number may contain letters, numbers, hyphens, and slashes only.';
  }

  const currentRank = input.currentRank.trim();
  if (currentRank.length < SCHEMA_BOUNDS.currentRank.min) {
    errors.currentRank = 'Current rank or CoC designation is required.';
  } else if (currentRank.length > SCHEMA_BOUNDS.currentRank.max) {
    errors.currentRank = `Rank cannot exceed ${SCHEMA_BOUNDS.currentRank.max} characters.`;
  }

  if (!AVAILABILITY_STATUSES.includes(input.availabilityStatus)) {
    errors.availabilityStatus = 'Select a valid availability status.';
  }

  if (options.requireBloodGroup && !input.bloodGroup) {
    errors.bloodGroup = 'Select your Blood Group for alumni emergency support.';
  } else if (input.bloodGroup && !BLOOD_GROUPS.includes(input.bloodGroup)) {
    errors.bloodGroup = 'Select a valid blood group.';
  }

  const city = input.city.trim();
  const country = input.country.trim();
  if (options.requireLocation && city.length < 2) {
    errors.city = 'Enter your current city or location (e.g., Dhaka, Sylhet, At Sea).';
  } else if (city.length > SCHEMA_BOUNDS.city.max) {
    errors.city = `City cannot exceed ${SCHEMA_BOUNDS.city.max} characters.`;
  }
  if (options.requireLocation && country.length < 2) {
    errors.country = 'Enter your current country (e.g., Bangladesh).';
  } else if (country.length > SCHEMA_BOUNDS.country.max) {
    errors.country = `Country cannot exceed ${SCHEMA_BOUNDS.country.max} characters.`;
  }

  const cvUrl = input.cvUrl.trim();
  if (cvUrl.length > SCHEMA_BOUNDS.cvUrl.max) {
    errors.cvUrl = `CV URL cannot exceed ${SCHEMA_BOUNDS.cvUrl.max} characters.`;
  } else if (cvUrl && !isSafeHttpUrl(cvUrl)) {
    errors.cvUrl = 'Enter a valid http:// or https:// Google Drive or LinkedIn link.';
  }

  const photoUrl = input.photoUrl.trim();
  if (options.requirePhoto && !photoUrl) {
    errors.photoUrl = 'Please upload your photo or provide a valid image URL to complete registration.';
  } else if (photoUrl.length > SCHEMA_BOUNDS.photoUrl.max) {
    errors.photoUrl = 'Avatar image is too large; upload a smaller photo or use an image URL.';
  }

  const email = input.email.trim();
  if (!email || !SCHEMA_BOUNDS.email.pattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  } else if (email.length > SCHEMA_BOUNDS.email.max) {
    errors.email = `Email cannot exceed ${SCHEMA_BOUNDS.email.max} characters.`;
  }

  if (input.phone.trim().length > SCHEMA_BOUNDS.phone.max) {
    errors.phone = `Phone cannot exceed ${SCHEMA_BOUNDS.phone.max} characters.`;
  }

  if (input.whatsapp.trim().length > SCHEMA_BOUNDS.whatsapp.max) {
    errors.whatsapp = `WhatsApp cannot exceed ${SCHEMA_BOUNDS.whatsapp.max} characters.`;
  }

  const academyName = (input.academyName ?? '').trim();
  if (academyName.length > SCHEMA_BOUNDS.academyName.max) {
    errors.academyName = `Academy name cannot exceed ${SCHEMA_BOUNDS.academyName.max} characters.`;
  }

  const passport = (input.passportNumber ?? '').trim();
  if (passport.length > SCHEMA_BOUNDS.passportNumber.max) {
    errors.passportNumber = `Passport number cannot exceed ${SCHEMA_BOUNDS.passportNumber.max} characters.`;
  } else if (passport && !SCHEMA_BOUNDS.passportNumber.pattern.test(passport)) {
    errors.passportNumber = 'Passport number may contain letters, numbers, and hyphens only.';
  }

  const expiryFields: Array<[keyof ProfileFormInput, string]> = [
    ['passportIssueDate', 'Passport issue date'],
    ['passportExpiry', 'Passport expiry'],
    ['cdcIssueDate', 'CDC issue date'],
    ['cdcExpiry', 'CDC expiry'],
    ['medicalExpiry', 'Medical fitness expiry'],
    ['stcwCocExpiry', 'STCW / CoC expiry'],
  ];
  for (const [key, label] of expiryFields) {
    const val = String(input[key] ?? '').trim();
    if (val && !SCHEMA_BOUNDS.dateIso.pattern.test(val)) {
      errors[key] = `${label} must be in YYYY-MM-DD format.`;
    }
  }

  const passportIssue = (input.passportIssueDate ?? '').trim();
  const passportExp = (input.passportExpiry ?? '').trim();
  if (
    passportIssue &&
    passportExp &&
    SCHEMA_BOUNDS.dateIso.pattern.test(passportIssue) &&
    SCHEMA_BOUNDS.dateIso.pattern.test(passportExp) &&
    passportExp < passportIssue
  ) {
    errors.passportExpiry = 'Passport expiry date cannot be earlier than issue date.';
  }

  const cdcIssue = (input.cdcIssueDate ?? '').trim();
  const cdcExp = (input.cdcExpiry ?? '').trim();
  if (
    cdcIssue &&
    cdcExp &&
    SCHEMA_BOUNDS.dateIso.pattern.test(cdcIssue) &&
    SCHEMA_BOUNDS.dateIso.pattern.test(cdcExp) &&
    cdcExp < cdcIssue
  ) {
    errors.cdcExpiry = 'CDC expiry date cannot be earlier than issue date.';
  }

  if (input.academicQualifications) {
    if (input.academicQualifications.length > SCHEMA_BOUNDS.academicQualificationMaxCount) {
      errors.academicQualifications = `You can add up to ${SCHEMA_BOUNDS.academicQualificationMaxCount} academic qualifications.`;
    } else {
      for (const qual of input.academicQualifications) {
        if (!qual.level.trim() || qual.level.trim().length > SCHEMA_BOUNDS.academicLevel.max) {
          errors.academicQualifications = 'Each academic qualification needs a valid level (e.g., SSC, HSC).';
          break;
        }
        if (qual.institution.trim().length > SCHEMA_BOUNDS.academicInstitution.max) {
          errors.academicQualifications = 'Academic institution name is too long (max 140 chars).';
          break;
        }
      }
    }
  }

  const additionalInfo = (input.additionalInfo ?? '').trim();
  if (additionalInfo.length > SCHEMA_BOUNDS.additionalInfo.max) {
    errors.additionalInfo = `Additional information cannot exceed ${SCHEMA_BOUNDS.additionalInfo.max} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Simplified onboarding validation for Academy Instructors of Bangladesh Marine Academy, Sylhet.
 * Does NOT require CDC number, Cadet number, certificates, blood group, or sea service.
 */
export function validateInstructorOnboardingInput(input: ProfileFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  const fullName = input.fullName.trim();
  if (fullName.length < SCHEMA_BOUNDS.fullName.min || fullName.length > SCHEMA_BOUNDS.fullName.max) {
    errors.fullName = 'Please enter your full name (2–100 characters).';
  }

  const batch = input.batch.trim();
  if (batch.length < SCHEMA_BOUNDS.batch.min || batch.length > SCHEMA_BOUNDS.batch.max) {
    errors.batch = 'Select or enter your batch number.';
  }

  const mobile = (input.whatsapp || input.phone).trim();
  if (mobile.length < 6 || mobile.length > SCHEMA_BOUNDS.phone.max) {
    errors.whatsapp = 'Please enter a valid phone number (e.g., +88017...).';
  }

  const email = input.email.trim();
  if (!email || !SCHEMA_BOUNDS.email.pattern.test(email) || email.length > SCHEMA_BOUNDS.email.max) {
    errors.email = 'Please enter a valid email address.';
  }

  const photoUrl = input.photoUrl.trim();
  if (!photoUrl) {
    errors.photoUrl = 'Please upload your photo or provide a valid image URL.';
  } else if (photoUrl.length > SCHEMA_BOUNDS.photoUrl.max) {
    errors.photoUrl = 'Photo is too large; please upload a smaller photo.';
  }

  const rank = input.currentRank.trim();
  if (rank.length < SCHEMA_BOUNDS.currentRank.min || rank.length > SCHEMA_BOUNDS.currentRank.max) {
    errors.currentRank = 'Select your rank or instructor designation.';
  }

  const additionalInfo = (input.additionalInfo ?? '').trim();
  if (additionalInfo.length > SCHEMA_BOUNDS.additionalInfo.max) {
    errors.additionalInfo = `Additional information cannot exceed ${SCHEMA_BOUNDS.additionalInfo.max} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateOnboardingStep(
  step: 1 | 2 | 3 | 4,
  input: ProfileFormInput,
  initialVoyage?: { enabled: boolean; voyage: VoyageFormInput }
): ValidationResult {
  const errors: Record<string, string> = {};

  if (step === 1) {
    const fullName = input.fullName.trim();
    if (fullName.length < SCHEMA_BOUNDS.fullName.min || fullName.length > SCHEMA_BOUNDS.fullName.max) {
      errors.fullName = 'Enter your full name as per CDC/Passport.';
    }
    const email = input.email.trim();
    if (!email || !SCHEMA_BOUNDS.email.pattern.test(email)) {
      errors.email = 'Enter a valid email address.';
    }
    const mobile = (input.whatsapp || input.phone).trim();
    if (mobile.length < 6) {
      errors.whatsapp = 'Enter your Mobile / WhatsApp number with country code (e.g., +88017...).';
    }
    if (!input.bloodGroup || !BLOOD_GROUPS.includes(input.bloodGroup)) {
      errors.bloodGroup = 'Select your Blood Group for emergency alumni support.';
    }
    if (input.city.trim().length < 2) {
      errors.city = 'Enter your current city (e.g., Dhaka, Sylhet, Chattogram, At Sea).';
    }
    if (input.country.trim().length < 2) {
      errors.country = 'Enter your current country (e.g., Bangladesh).';
    }
    if (!input.photoUrl.trim()) {
      errors.photoUrl = 'Please upload a square portrait photo or paste an image URL.';
    } else if (input.photoUrl.trim().length > SCHEMA_BOUNDS.photoUrl.max) {
      errors.photoUrl = 'Photo is too large; upload a smaller photo.';
    }
  } else if (step === 2) {
    const cadet = input.cadetNumber.trim();
    if (cadet.length < SCHEMA_BOUNDS.cadetNumber.min || !SCHEMA_BOUNDS.cadetNumber.pattern.test(cadet)) {
      errors.cadetNumber = 'Academic Cadet Number is required (e.g., BMAS-04-N0108).';
    }
    if (input.batch.trim().length < SCHEMA_BOUNDS.batch.min) {
      errors.batch = 'Select your BMASA Batch / Intake.';
    }
    if (!DEPARTMENTS.includes(input.department)) {
      errors.department = 'Select Nautical or Marine Engineering.';
    }
    if (input.currentRank.trim().length < SCHEMA_BOUNDS.currentRank.min) {
      errors.currentRank = 'Enter your current Rank or CoC Grade.';
    }
    const cdc = input.cdcNumber.trim();
    if (cdc.length < 2 || !SCHEMA_BOUNDS.cdcNumber.pattern.test(cdc)) {
      errors.cdcNumber = 'CDC Number is required (Continuous Discharge Certificate).';
    }
    const sid = (input.sidNumber ?? '').trim();
    if (sid.length > SCHEMA_BOUNDS.sidNumber.max) {
      errors.sidNumber = `SID Card Number cannot exceed ${SCHEMA_BOUNDS.sidNumber.max} characters.`;
    } else if (sid && !SCHEMA_BOUNDS.sidNumber.pattern.test(sid)) {
      errors.sidNumber = 'SID Card Number may contain letters, numbers, hyphens, and slashes only.';
    }
    const passport = (input.passportNumber ?? '').trim();
    if (passport && !SCHEMA_BOUNDS.passportNumber.pattern.test(passport)) {
      errors.passportNumber = 'Passport number may contain letters, numbers, and hyphens only.';
    }
    if (input.cvUrl.trim() && !isSafeHttpUrl(input.cvUrl)) {
      errors.cvUrl = 'Enter a valid http:// or https:// Google Drive or LinkedIn URL.';
    }
  } else if (step === 3) {
    if (initialVoyage?.enabled) {
      return validateVoyageInput(initialVoyage.voyage);
    }
  } else if (step === 4) {
    if ((input.bankAccountHolder ?? '').trim().length > SCHEMA_BOUNDS.bankAccountHolder.max) {
      errors.bankAccountHolder = 'Account holder name is too long.';
    }
    if ((input.bankName ?? '').trim().length > SCHEMA_BOUNDS.bankName.max) {
      errors.bankName = 'Bank name is too long.';
    }
    if ((input.bankAccountNumber ?? '').trim().length > SCHEMA_BOUNDS.vaultAccountNumber.max) {
      errors.bankAccountNumber = 'Account number is too long.';
    }
    if ((input.mfsNumber ?? '').trim().length > SCHEMA_BOUNDS.mfsNumber.max) {
      errors.mfsNumber = 'bKash / Nagad number is too long.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateVoyageInput(input: VoyageFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  const vesselName = input.vesselName.trim();
  if (vesselName.length < SCHEMA_BOUNDS.vesselName.min) {
    errors.vesselName = 'Vessel name is required (e.g., MV Banglar Samriddhi).';
  } else if (vesselName.length > SCHEMA_BOUNDS.vesselName.max) {
    errors.vesselName = `Vessel name cannot exceed ${SCHEMA_BOUNDS.vesselName.max} characters.`;
  }

  if (!VESSEL_TYPES.includes(input.vesselType)) {
    errors.vesselType = 'Select a valid vessel type.';
  }

  const companyName = input.companyName.trim();
  if (companyName.length < SCHEMA_BOUNDS.companyName.min) {
    errors.companyName = 'Shipping company or manning agent is required.';
  } else if (companyName.length > SCHEMA_BOUNDS.companyName.max) {
    errors.companyName = `Company name cannot exceed ${SCHEMA_BOUNDS.companyName.max} characters.`;
  }

  const rankServed = input.rankServed.trim();
  if (rankServed.length < SCHEMA_BOUNDS.rankServed.min) {
    errors.rankServed = 'Rank served is required.';
  } else if (rankServed.length > SCHEMA_BOUNDS.rankServed.max) {
    errors.rankServed = `Rank served cannot exceed ${SCHEMA_BOUNDS.rankServed.max} characters.`;
  }

  const signOn = input.signOnDate.trim();
  if (!SCHEMA_BOUNDS.dateIso.pattern.test(signOn)) {
    errors.signOnDate = 'Select a valid Sign-On date (YYYY-MM-DD).';
  }

  const signOff = input.signOffDate.trim();
  if (signOff) {
    if (!SCHEMA_BOUNDS.dateIso.pattern.test(signOff)) {
      errors.signOffDate = 'Sign-Off date must be in YYYY-MM-DD format.';
    } else if (SCHEMA_BOUNDS.dateIso.pattern.test(signOn) && signOff < signOn) {
      errors.signOffDate = 'Sign-Off date cannot be earlier than Sign-On date.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateJobInput(input: JobFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  const companyName = input.companyName.trim();
  if (companyName.length < SCHEMA_BOUNDS.companyName.min) {
    errors.companyName = 'Company or manning office name is required.';
  } else if (companyName.length > SCHEMA_BOUNDS.companyName.max) {
    errors.companyName = `Company name cannot exceed ${SCHEMA_BOUNDS.companyName.max} characters.`;
  }

  const rankNeeded = input.rankNeeded.trim();
  if (rankNeeded.length < SCHEMA_BOUNDS.rankNeeded.min) {
    errors.rankNeeded = 'Rank or position needed is required.';
  } else if (rankNeeded.length > SCHEMA_BOUNDS.rankNeeded.max) {
    errors.rankNeeded = `Rank needed cannot exceed ${SCHEMA_BOUNDS.rankNeeded.max} characters.`;
  }

  if (!JOB_VESSEL_TYPES.includes(input.vesselType)) {
    errors.vesselType = 'Select a valid vessel type.';
  }

  const contactInfo = input.contactInfo.trim();
  if (contactInfo.length < SCHEMA_BOUNDS.contactInfo.min) {
    errors.contactInfo = 'Company recruitment email (for Apply Now) is required.';
  } else if (contactInfo.length > SCHEMA_BOUNDS.contactInfo.max) {
    errors.contactInfo = `Contact info cannot exceed ${SCHEMA_BOUNDS.contactInfo.max} characters.`;
  }

  if (input.notes.trim().length > SCHEMA_BOUNDS.notes.max) {
    errors.notes = `Notes cannot exceed ${SCHEMA_BOUNDS.notes.max} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAdminEmailInput(input: AdminFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  const email = input.email.trim().toLowerCase();

  if (!email || !SCHEMA_BOUNDS.email.pattern.test(email)) {
    errors.email = 'Enter a valid Gmail / email address.';
  } else if (email.length > SCHEMA_BOUNDS.email.max) {
    errors.email = `Email cannot exceed ${SCHEMA_BOUNDS.email.max} characters.`;
  } else if (email === MAIN_ADMIN_EMAIL) {
    errors.email = `${MAIN_ADMIN_EMAIL} is already the permanent Main Admin.`;
  }

  if (input.displayName.trim().length > SCHEMA_BOUNDS.displayName.max) {
    errors.displayName = `Label cannot exceed ${SCHEMA_BOUNDS.displayName.max} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateBankAccountInput(input: BankAccountFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  const bankName = input.bankName.trim();
  if (bankName.length < SCHEMA_BOUNDS.bankName.min) {
    errors.bankName = 'Bank or MFS provider name is required (e.g., Dutch-Bangla Bank, bKash).';
  } else if (bankName.length > SCHEMA_BOUNDS.bankName.max) {
    errors.bankName = `Bank name cannot exceed ${SCHEMA_BOUNDS.bankName.max} characters.`;
  }

  const accountName = input.accountName.trim();
  if (accountName.length < SCHEMA_BOUNDS.accountName.min) {
    errors.accountName = 'Account title / holder name is required.';
  } else if (accountName.length > SCHEMA_BOUNDS.accountName.max) {
    errors.accountName = `Account name cannot exceed ${SCHEMA_BOUNDS.accountName.max} characters.`;
  }

  const accountNumber = input.accountNumber.trim();
  if (accountNumber.length < SCHEMA_BOUNDS.accountNumber.min) {
    errors.accountNumber = 'Account or merchant number is required.';
  } else if (accountNumber.length > SCHEMA_BOUNDS.accountNumber.max) {
    errors.accountNumber = `Account number cannot exceed ${SCHEMA_BOUNDS.accountNumber.max} characters.`;
  } else if (!SCHEMA_BOUNDS.accountNumber.pattern.test(accountNumber)) {
    errors.accountNumber = 'Use digits, letters, +, -, spaces, or / only.';
  }

  if (input.branchName.trim().length > SCHEMA_BOUNDS.branchName.max) {
    errors.branchName = `Branch name cannot exceed ${SCHEMA_BOUNDS.branchName.max} characters.`;
  }
  if (input.routingNumber.trim().length > SCHEMA_BOUNDS.routingNumber.max) {
    errors.routingNumber = `Routing number cannot exceed ${SCHEMA_BOUNDS.routingNumber.max} characters.`;
  }
  if (!BANK_ACCOUNT_TYPES.includes(input.accountType)) {
    errors.accountType = 'Select a valid account type.';
  }
  if (!BANK_CURRENCIES.includes(input.currency)) {
    errors.currency = 'Select BDT or USD.';
  }
  if (input.notes.trim().length > SCHEMA_BOUNDS.bankNotes.max) {
    errors.notes = `Notes cannot exceed ${SCHEMA_BOUNDS.bankNotes.max} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateFundTransactionInput(
  input: FundTransactionFormInput
): ValidationResult {
  const errors: Record<string, string> = {};

  const memberName = input.memberName.trim();
  if (memberName.length < SCHEMA_BOUNDS.fullName.min) {
    errors.memberName =
      input.entryType === 'disbursement'
        ? 'Enter payee / vendor / beneficiary name (at least 2 characters).'
        : 'Select a member or enter payee name (at least 2 characters).';
  } else if (memberName.length > SCHEMA_BOUNDS.fullName.max) {
    errors.memberName = `Name cannot exceed ${SCHEMA_BOUNDS.fullName.max} characters.`;
  }

  const cadetNo = input.memberCadetNumber.trim();
  if (cadetNo.length > SCHEMA_BOUNDS.cadetNumber.max) {
    errors.memberCadetNumber = `Cadet Number cannot exceed ${SCHEMA_BOUNDS.cadetNumber.max} characters.`;
  } else if (cadetNo && !SCHEMA_BOUNDS.cadetNumber.pattern.test(cadetNo)) {
    errors.memberCadetNumber = 'Cadet Number may contain letters, numbers, hyphens, and slashes only.';
  }

  const parsedAmount = Number(input.amount);
  if (
    !input.amount.trim() ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    parsedAmount > SCHEMA_BOUNDS.fundAmount.max
  ) {
    errors.amount = 'Enter a valid positive amount in BDT.';
  }

  if (!FUND_CATEGORIES.includes(input.category)) {
    errors.category = 'Select a valid fund category.';
  }
  if (!FUND_PAYMENT_METHODS.includes(input.paymentMethod)) {
    errors.paymentMethod = 'Select a valid payment method.';
  }

  const dt = input.transactionDateTime.trim();
  if (!dt || !SCHEMA_BOUNDS.dateTimeIso.pattern.test(dt)) {
    errors.transactionDateTime = 'Select exact transaction date and time.';
  }

  if (input.referenceNumber.trim().length > SCHEMA_BOUNDS.referenceNumber.max) {
    errors.referenceNumber = `Reference cannot exceed ${SCHEMA_BOUNDS.referenceNumber.max} characters.`;
  }
  if (input.bankAccountLabel.trim().length > SCHEMA_BOUNDS.bankName.max) {
    errors.bankAccountLabel = `Account label cannot exceed ${SCHEMA_BOUNDS.bankName.max} characters.`;
  }

  if (input.entryType === 'disbursement') {
    if (input.notes.trim().length < 5) {
      errors.notes = 'Provide detailed purpose & breakdown for this fund expense (min. 5 characters).';
    }
    if (!input.receiptDataUrl.trim()) {
      errors.receiptDataUrl = 'Upload a payment receipt photo or provide a verified receipt URL for expenses.';
    } else if (!isSafeReceiptSource(input.receiptDataUrl)) {
      errors.receiptDataUrl = 'Receipt image is invalid or too large (max ~140KB compressed).';
    }
  } else if (input.receiptDataUrl.trim() && !isSafeReceiptSource(input.receiptDataUrl)) {
    errors.receiptDataUrl = 'Receipt URL or image is invalid or too large.';
  }

  if (input.notes.trim().length > SCHEMA_BOUNDS.bankNotes.max) {
    errors.notes = `Notes cannot exceed ${SCHEMA_BOUNDS.bankNotes.max} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateNoticeInput(input: NoticeFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.title.trim().length < SCHEMA_BOUNDS.noticeTitle.min) {
    errors.title = 'Circular headline must be at least 3 characters.';
  } else if (input.title.trim().length > SCHEMA_BOUNDS.noticeTitle.max) {
    errors.title = `Headline cannot exceed ${SCHEMA_BOUNDS.noticeTitle.max} characters.`;
  }
  if (!NOTICE_TYPES.includes(input.noticeType)) {
    errors.noticeType = 'Select a notice type (Nautical, Engineering, or General).';
  }
  if (!NOTICE_CATEGORIES.includes(input.category)) {
    errors.category = 'Select a circular category.';
  }
  if (input.body.trim().length < SCHEMA_BOUNDS.noticeBody.min) {
    errors.body = 'Circular announcement body must be at least 10 characters.';
  } else if (input.body.trim().length > SCHEMA_BOUNDS.noticeBody.max) {
    errors.body = `Body cannot exceed ${SCHEMA_BOUNDS.noticeBody.max} characters.`;
  }
  if (input.attachmentUrl.trim() && !isSafeHttpUrl(input.attachmentUrl)) {
    errors.attachmentUrl = 'Enter a valid http:// or https:// link.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateMentorshipInput(input: MentorshipFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (!MENTORSHIP_TRACKS.includes(input.examTrack)) {
    errors.examTrack = 'Select a CoC / mentorship exam track.';
  }
  if (input.title.trim().length < SCHEMA_BOUNDS.mentorshipTitle.min) {
    errors.title = 'Topic title must be at least 4 characters.';
  } else if (input.title.trim().length > SCHEMA_BOUNDS.mentorshipTitle.max) {
    errors.title = `Title cannot exceed ${SCHEMA_BOUNDS.mentorshipTitle.max} characters.`;
  }
  if (input.adviceBody.trim().length < SCHEMA_BOUNDS.adviceBody.min) {
    errors.adviceBody = 'Share at least 10 characters of exam guidance or notes.';
  } else if (input.adviceBody.trim().length > SCHEMA_BOUNDS.adviceBody.max) {
    errors.adviceBody = `Guidance cannot exceed ${SCHEMA_BOUNDS.adviceBody.max} characters.`;
  }
  if (input.resourceUrl.trim() && !isSafeHttpUrl(input.resourceUrl)) {
    errors.resourceUrl = 'Enter a valid http:// or https:// study resource URL.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCrewingCompanyInput(input: CrewingCompanyFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.companyName.trim().length < SCHEMA_BOUNDS.companyName.min) {
    errors.companyName = 'Shipping company or manning agency name is required.';
  }
  if (input.dosLicense.trim().length > SCHEMA_BOUNDS.dosLicense.max) {
    errors.dosLicense = `DOS License cannot exceed ${SCHEMA_BOUNDS.dosLicense.max} characters.`;
  }
  if (input.fleetType.trim().length < SCHEMA_BOUNDS.fleetType.min) {
    errors.fleetType = 'Describe vessel fleet types (e.g., Bulk Carriers & Oil Tankers).';
  }
  if (!CREWING_INTAKE_STATUSES.includes(input.cadetIntakeStatus)) {
    errors.cadetIntakeStatus = 'Select a cadet intake status.';
  }
  if (input.contactEmail.trim() && !SCHEMA_BOUNDS.email.pattern.test(input.contactEmail.trim())) {
    errors.contactEmail = 'Enter a valid recruitment email address.';
  }
  if (input.alumniNotes.trim().length > SCHEMA_BOUNDS.notes.max) {
    errors.alumniNotes = `Notes cannot exceed ${SCHEMA_BOUNDS.notes.max} characters.`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateDhakaRoadmapInput(input: DhakaRoadmapFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.title.trim().length < SCHEMA_BOUNDS.milestoneTitle.min) {
    errors.title =
      input.itemType === 'committee'
        ? 'Committee role title is required (e.g., President, General Secretary).'
        : 'Milestone title is required.';
  }
  if (input.itemType === 'committee' && input.personName.trim().length < 2) {
    errors.personName = 'Enter office bearer full name.';
  }
  if (!ROADMAP_ITEM_STATUSES.includes(input.status)) {
    errors.status = 'Select a valid status.';
  }
  const targetNum = Number(input.targetAmountBdt || '0');
  const raisedNum = Number(input.raisedAmountBdt || '0');
  if (!Number.isFinite(targetNum) || targetNum < 0) {
    errors.targetAmountBdt = 'Enter a valid non-negative BDT target.';
  }
  if (!Number.isFinite(raisedNum) || raisedNum < 0) {
    errors.raisedAmountBdt = 'Enter a valid non-negative BDT raised amount.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export interface CopCertificateFormInput {
  title: string;
  certNumber: string;
  issueDate: string;
  expiryDate: string;
}

export function validateCopCertificateInput(
  input: CopCertificateFormInput
): ValidationResult {
  const errors: Record<string, string> = {};
  const title = input.title.trim();
  if (title.length < 2 || title.length > 120) {
    errors.title = 'Enter a COP certificate title (2 to 120 characters).';
  }
  if (input.certNumber.trim().length > 48) {
    errors.certNumber = 'Certificate number cannot exceed 48 characters.';
  }
  const issue = input.issueDate.trim();
  if (issue && !SCHEMA_BOUNDS.dateIso.pattern.test(issue)) {
    errors.issueDate = 'Use YYYY-MM-DD issue date format.';
  }
  const expiry = input.expiryDate.trim();
  if (expiry && !SCHEMA_BOUNDS.dateIso.pattern.test(expiry)) {
    errors.expiryDate = 'Use YYYY-MM-DD expiry date format.';
  } else if (
    issue &&
    expiry &&
    SCHEMA_BOUNDS.dateIso.pattern.test(issue) &&
    SCHEMA_BOUNDS.dateIso.pattern.test(expiry) &&
    expiry < issue
  ) {
    errors.expiryDate = 'COP expiry date cannot be earlier than issue date.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export interface PaymentSubmissionFormInput {
  amount: string;
  category: Exclude<FundCategory, 'Operational Expense'>;
  paymentMethod: FundPaymentMethod;
  bankAccountLabel: string;
  referenceNumber: string;
  transactionDateTime: string;
  notes: string;
  receiptDataUrl: string;
}

export function validatePaymentSubmissionInput(
  input: PaymentSubmissionFormInput
): ValidationResult {
  const errors: Record<string, string> = {};
  const parsedAmount = Number(input.amount);
  if (
    !input.amount.trim() ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    parsedAmount > SCHEMA_BOUNDS.fundAmount.max
  ) {
    errors.amount = 'Enter a valid positive amount in BDT.';
  }
  if (!FUND_CATEGORIES.includes(input.category) || (input.category as FundCategory) === 'Operational Expense') {
    errors.category = 'Select a valid subscription or donation category.';
  }
  if (!FUND_PAYMENT_METHODS.includes(input.paymentMethod)) {
    errors.paymentMethod = 'Select a valid payment method.';
  }
  const ref = input.referenceNumber.trim();
  if (ref.length < 2 || ref.length > SCHEMA_BOUNDS.referenceNumber.max) {
    errors.referenceNumber = 'Enter your Transaction ID / Bank Reference (min 2 characters).';
  }
  const dt = input.transactionDateTime.trim();
  if (!dt || dt.length < 10 || dt.length > 32) {
    errors.transactionDateTime = 'Select exact payment date and time.';
  }
  const receipt = input.receiptDataUrl.trim();
  if (!receipt || receipt.length < 10 || !isSafeReceiptSource(receipt)) {
    errors.receiptDataUrl = 'Upload a payment receipt screenshot or provide a valid https:// receipt URL.';
  }
  if (input.notes.trim().length > SCHEMA_BOUNDS.bankNotes.max) {
    errors.notes = `Notes cannot exceed ${SCHEMA_BOUNDS.bankNotes.max} characters.`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
