import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEmlWithPdfAttachment,
  buildPdfFromJpegPages,
  buildSeafarerCvData,
  formatCvPlainText,
  renderSeafarerCvHtml,
} from './cvBuilder';
import type { CopCertificate, DirectoryProfile, PrivateVault, VoyageRecord } from '../types/portal';

const sampleProfile: DirectoryProfile = {
  uid: 'u1',
  fullName: 'Ahsan Rahman',
  photoUrl: '',
  cadetNumber: 'BMAS-04-N0108',
  batch: '4th Batch',
  department: 'Nautical',
  cdcNumber: 'C/O/91402',
  currentRank: '2nd Officer',
  availabilityStatus: 'Available for Sea',
  bloodGroup: 'O+',
  city: 'Sylhet',
  country: 'Bangladesh',
  cvUrl: '',
  memberSerial: 'BMAS-04-N0108',
  isVerified: true,
  isPublicDirectory: true,
  voyageCount: 1,
};

const sampleVault: PrivateVault = {
  uid: 'u1',
  email: 'ahsan@bmas.example',
  phone: '+8801712345678',
  whatsapp: '+8801712345678',
  academyName: 'Bangladesh Marine Academy Sylhet',
  passportNumber: 'EC7788990',
  passportIssueDate: '2021-01-15',
  passportExpiry: '2031-01-14',
  cdcIssueDate: '2020-05-10',
  cdcExpiry: '2030-05-09',
  medicalExpiry: '2027-03-01',
  stcwCocExpiry: '2028-05-10',
  academicQualifications: [
    {
      id: 'q1',
      level: 'SSC',
      institution: 'Sylhet Cadet School',
      boardOrUniversity: 'Sylhet Board',
      passingYear: '2016',
      result: 'GPA 5.00',
    },
    {
      id: 'q2',
      level: 'HSC',
      institution: 'Sylhet Govt College',
      boardOrUniversity: 'Sylhet Board',
      passingYear: '2018',
      result: 'GPA 4.92',
    },
  ],
  bankAccountHolder: '',
  bankName: '',
  bankBranch: '',
  bankAccountNumber: '',
  bankRoutingNumber: '',
  mfsNumber: '',
  nokName: 'Rashida Begum',
  nokRelation: 'Mother',
  nokPhone: '+8801710001122',
  nokCity: 'Sylhet',
};

const sampleCops: CopCertificate[] = [
  {
    id: 'c1',
    memberId: 'u1',
    title: 'Basic Safety Training (PST / FPFF / EFA / PSSR)',
    certNumber: 'COP-BD-99210',
    issueDate: '2022-08-20',
    expiryDate: '2027-08-19',
    isStandard: true,
  },
];

const sampleVoyages: VoyageRecord[] = [
  {
    id: 'v1',
    memberId: 'u1',
    vesselName: 'MV Banglar Joyjatra',
    vesselType: 'Bulk Carrier',
    companyName: 'Bangladesh Shipping Corporation',
    rankServed: '3rd Officer',
    signOnDate: '2023-01-01',
    signOffDate: '2023-06-29',
    isVisible: true,
  },
];

test('buildSeafarerCvData maps Academy, SSC/HSC, CDC/Passport/COP issue & expiry dates, voyages, and NOK', () => {
  const cv = buildSeafarerCvData({
    profile: sampleProfile,
    vault: sampleVault,
    voyages: sampleVoyages,
    copCertificates: sampleCops,
    shareUrl: 'https://bmasa.example/?member=u1',
    todayIso: '2026-04-15',
  });

  assert.equal(cv.academyName, 'Bangladesh Marine Academy Sylhet');
  assert.equal(cv.academicQualifications.length, 2);
  assert.equal(cv.academicQualifications[0].level, 'SSC');
  assert.equal(cv.academicQualifications[1].level, 'HSC');

  const cdcDoc = cv.documents.find((d) => d.name.startsWith('CDC'));
  assert.ok(cdcDoc);
  assert.equal(cdcDoc.issueDate, '2020-05-10');
  assert.equal(cdcDoc.expiryDate, '2030-05-09');

  const passportDoc = cv.documents.find((d) => d.name === 'Passport');
  assert.ok(passportDoc);
  assert.equal(passportDoc.issueDate, '2021-01-15');
  assert.equal(passportDoc.expiryDate, '2031-01-14');

  assert.equal(cv.copCertificates.length, 1);
  assert.equal(cv.copCertificates[0].issueDate, '2022-08-20');
  assert.equal(cv.copCertificates[0].expiryDate, '2027-08-19');
  assert.equal(cv.nok.name, 'Rashida Begum');
  assert.equal(cv.voyages.length, 1);
});

test('formatCvPlainText and renderSeafarerCvHtml include all key sections and safely escape HTML', () => {
  const cv = buildSeafarerCvData({
    profile: { ...sampleProfile, fullName: 'Ahsan <Script> Rahman' },
    vault: sampleVault,
    voyages: sampleVoyages,
    copCertificates: sampleCops,
    todayIso: '2026-04-15',
  });

  const text = formatCvPlainText(cv, {
    includeNok: true,
    targetJob: { rankNeeded: '2nd Officer', companyName: 'BSC' },
  });
  assert.ok(text.includes('Bangladesh Marine Academy Sylhet'));
  assert.ok(text.includes('SSC: Sylhet Cadet School'));
  assert.ok(text.includes('HSC: Sylhet Govt College'));
  assert.ok(text.includes('COP-BD-99210'));
  assert.ok(text.includes('Rashida Begum'));
  assert.ok(text.includes('Applying For: 2nd Officer at BSC'));

  const html = renderSeafarerCvHtml(cv, { includeNok: false });
  assert.ok(html.includes('Bangladesh Marine Academy Sylhet'));
  assert.ok(html.includes('Ahsan &lt;Script&gt; Rahman'));
  assert.equal(html.includes('<Script>'), false);
  assert.equal(html.includes('Rashida Begum'), false);
});

test('buildPdfFromJpegPages constructs valid PDF 1.4 header, pages, and xref trailer', () => {
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
  const pdfBytes = buildPdfFromJpegPages([
    { jpegBytes: fakeJpeg, width: 1240, height: 1754 },
    { jpegBytes: fakeJpeg, width: 1240, height: 1754 },
  ]);
  const ascii = new TextDecoder().decode(pdfBytes);
  assert.ok(ascii.startsWith('%PDF-1.4'));
  assert.ok(ascii.includes('/Count 2'));
  assert.ok(ascii.includes('/Filter /DCTDecode'));
  assert.ok(ascii.includes('xref'));
  assert.ok(ascii.includes('%%EOF'));
});

test('Auto-generated CV excludes any pre-filled Maritime Academy qualification entry when user added none, and includes SID Card', () => {
  const cv = buildSeafarerCvData({
    profile: { ...sampleProfile, sidNumber: 'BGD-SID-882104' },
    vault: { ...sampleVault, academicQualifications: [] },
    voyages: sampleVoyages,
    copCertificates: sampleCops,
    todayIso: '2026-04-15',
  });

  assert.equal(cv.academicQualifications.length, 0);
  const sidDoc = cv.documents.find((d) => d.name.startsWith('SID Card'));
  assert.ok(sidDoc);
  assert.equal(sidDoc.docNumber, 'BGD-SID-882104');

  const text = formatCvPlainText(cv, { includeNok: false });
  assert.equal(text.includes('Maritime Academy / Pre-Sea'), false);
  assert.ok(text.includes('No qualifications added yet.'));

  const html = renderSeafarerCvHtml(cv, { includeNok: false });
  assert.equal(html.includes('Maritime Academy / Pre-Sea'), false);
  assert.ok(html.includes('Academic Qualifications'));
  assert.ok(html.includes('BGD-SID-882104'));
});

test('buildEmlWithPdfAttachment builds valid RFC-2822 multipart/mixed email with base64 PDF attachment', async () => {
  const samplePdf = new TextEncoder().encode('%PDF-1.4\n%BMASA-TEST\n%%EOF');
  const emlBlob = buildEmlWithPdfAttachment({
    to: ['crewing@bsc.gov.bd'],
    bcc: ['manning@example.com'],
    fromEmail: 'ahsan@bmas.example',
    subject: 'Job Application: 2nd Officer',
    bodyText: 'Dear Crewing Team,\nPlease find my PDF CV attached.',
    pdfBytes: samplePdf,
    pdfFilename: 'BMASA-CV-BMAS-04-N0108.pdf',
  });

  const emlText = await emlBlob.text();
  assert.ok(emlText.includes('MIME-Version: 1.0'));
  assert.ok(emlText.includes('To: crewing@bsc.gov.bd'));
  assert.ok(emlText.includes('Bcc: manning@example.com'));
  assert.ok(emlText.includes('Content-Type: multipart/mixed;'));
  assert.ok(emlText.includes('Content-Type: application/pdf; name="BMASA-CV-BMAS-04-N0108.pdf"'));
  assert.ok(emlText.includes('Content-Disposition: attachment; filename="BMASA-CV-BMAS-04-N0108.pdf"'));
  assert.ok(emlText.includes('Content-Transfer-Encoding: base64'));
  assert.ok(emlText.includes('Please find my PDF CV attached.'));
});

