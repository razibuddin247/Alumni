import {
  DEFAULT_ACADEMY_NAME,
  type AcademicQualification,
  type CopCertificate,
  type DirectoryProfile,
  type PrivateVault,
  type VoyageRecord,
} from '../types/portal';
import {
  cleanBatchLabel,
  calculateSeaTime,
  calculateSingleVoyageDuration,
  formatMaritimeDate,
  getCertificateExpiryStatus,
  sortVoyagesChronologically,
  type SeaTimeSummary,
} from './portalLogic';

export interface CvDocumentRow {
  name: string;
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  statusLabel: string;
}

export interface CvCopRow {
  title: string;
  certNumber: string;
  issueDate: string;
  expiryDate: string;
  statusLabel: string;
}

export interface CvVoyageRow {
  vesselName: string;
  vesselType: string;
  companyName: string;
  rankServed: string;
  signOnDate: string;
  signOffDate: string;
  duration: string;
}

export interface SeafarerCvData {
  fullName: string;
  currentRank: string;
  department: string;
  cadetNumber: string;
  batch: string;
  academyName: string;
  availabilityStatus: string;
  bloodGroup: string;
  location: string;
  photoUrl: string;
  isVerified: boolean;
  memberSerial: string;
  shareUrl: string;
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    cvUrl: string;
  };
  documents: CvDocumentRow[];
  copCertificates: CvCopRow[];
  academicQualifications: AcademicQualification[];
  seaTime: SeaTimeSummary;
  voyages: CvVoyageRow[];
  nok: {
    name: string;
    relation: string;
    phone: string;
    city: string;
  };
  generatedDateIso: string;
}

export interface CvExportOptions {
  includeNok?: boolean;
  targetJob?: {
    rankNeeded: string;
    companyName: string;
  };
}

export function buildSeafarerCvData(params: {
  profile: DirectoryProfile;
  vault: PrivateVault | null;
  voyages: VoyageRecord[];
  copCertificates: CopCertificate[];
  shareUrl?: string;
  todayIso?: string;
}): SeafarerCvData {
  const {
    profile,
    vault,
    voyages,
    copCertificates,
    shareUrl = '',
    todayIso = new Date().toISOString().slice(0, 10),
  } = params;

  const academyName = (vault?.academyName ?? '').trim() || DEFAULT_ACADEMY_NAME;
  const location = [profile.city, profile.country].filter(Boolean).join(', ');
  const email = (vault?.email || profile.contactEmail || '').trim();
  const phone = (vault?.phone || profile.contactPhone || '').trim();
  const whatsapp = (vault?.whatsapp || '').trim();

  const passportStatus = getCertificateExpiryStatus(vault?.passportExpiry ?? '', todayIso);
  const cdcStatus = getCertificateExpiryStatus(vault?.cdcExpiry ?? '', todayIso);
  const cocStatus = getCertificateExpiryStatus(vault?.stcwCocExpiry ?? '', todayIso);
  const medicalStatus = getCertificateExpiryStatus(vault?.medicalExpiry ?? '', todayIso);

  const documents: CvDocumentRow[] = [
    {
      name: 'CDC (Continuous Discharge Certificate)',
      docNumber: profile.cdcNumber || 'Not Provided',
      issueDate: vault?.cdcIssueDate ?? '',
      expiryDate: vault?.cdcExpiry ?? '',
      statusLabel: cdcStatus.label,
    },
    {
      name: 'SID Card (Seafarers Identity Document)',
      docNumber: profile.sidNumber || 'Not Provided',
      issueDate: '',
      expiryDate: '',
      statusLabel: profile.sidNumber ? 'Recorded' : 'Not Provided',
    },
    {
      name: 'Passport',
      docNumber: vault?.passportNumber || 'Not Provided',
      issueDate: vault?.passportIssueDate ?? '',
      expiryDate: vault?.passportExpiry ?? '',
      statusLabel: passportStatus.label,
    },
    {
      name: 'CoC / STCW Endorsement',
      docNumber: profile.currentRank || '—',
      issueDate: '',
      expiryDate: vault?.stcwCocExpiry ?? '',
      statusLabel: cocStatus.label,
    },
    {
      name: 'ILO / DG Shipping Medical Fitness',
      docNumber: 'Approved Seafarer Medical',
      issueDate: '',
      expiryDate: vault?.medicalExpiry ?? '',
      statusLabel: medicalStatus.label,
    },
  ];

  const sortedCops = [...copCertificates].sort((a, b) => a.title.localeCompare(b.title));
  const copRows: CvCopRow[] = sortedCops.map((c) => ({
    title: c.title,
    certNumber: c.certNumber || '—',
    issueDate: c.issueDate || '',
    expiryDate: c.expiryDate || '',
    statusLabel: getCertificateExpiryStatus(c.expiryDate || '', todayIso).label,
  }));

  const sortedVoyages = sortVoyagesChronologically(voyages);
  const seaTime = calculateSeaTime(voyages, todayIso);
  const voyageRows: CvVoyageRow[] = sortedVoyages.map((v) => ({
    vesselName: v.vesselName,
    vesselType: v.vesselType,
    companyName: v.companyName,
    rankServed: v.rankServed,
    signOnDate: v.signOnDate,
    signOffDate: v.signOffDate,
    duration: calculateSingleVoyageDuration(v.signOnDate, v.signOffDate, todayIso),
  }));

  return {
    fullName: profile.fullName,
    currentRank: profile.currentRank,
    department: profile.department,
    cadetNumber: profile.cadetNumber,
    batch: cleanBatchLabel(profile.batch),
    academyName,
    availabilityStatus: profile.availabilityStatus,
    bloodGroup: profile.bloodGroup || '',
    location,
    photoUrl: profile.photoUrl || '',
    isVerified: profile.isVerified,
    memberSerial: profile.memberSerial || profile.cadetNumber,
    shareUrl,
    contact: {
      email,
      phone,
      whatsapp,
      cvUrl: profile.cvUrl || '',
    },
    documents,
    copCertificates: copRows,
    academicQualifications: vault?.academicQualifications ?? [],
    seaTime,
    voyages: voyageRows,
    nok: {
      name: vault?.nokName ?? '',
      relation: vault?.nokRelation ?? '',
      phone: vault?.nokPhone ?? '',
      city: vault?.nokCity ?? '',
    },
    generatedDateIso: todayIso,
  };
}

function fmtOptDate(iso: string): string {
  if (!iso) return '—';
  return formatMaritimeDate(iso);
}

export function formatCvPlainText(
  cv: SeafarerCvData,
  options: CvExportOptions = {}
): string {
  const { includeNok = true, targetJob } = options;
  const lines: string[] = [];

  lines.push('====================================================================');
  lines.push(`MARITIME SEAFARER CURRICULUM VITAE — ${cv.fullName.toUpperCase()}`);
  lines.push(`Rank / CoC: ${cv.currentRank} (${cv.department} Department)`);
  lines.push(`Academy: ${cv.academyName}`);
  lines.push(`Cadet No.: ${cv.cadetNumber} · ${cv.batch} · Availability: ${cv.availabilityStatus}`);
  if (targetJob) {
    lines.push(`Applying For: ${targetJob.rankNeeded} at ${targetJob.companyName}`);
  }
  lines.push('====================================================================');
  lines.push('');

  lines.push('PERSONAL & CONTACT DETAILS');
  lines.push(`- Email: ${cv.contact.email || '—'}`);
  lines.push(`- Phone / WhatsApp: ${[cv.contact.phone, cv.contact.whatsapp && cv.contact.whatsapp !== cv.contact.phone ? `WA: ${cv.contact.whatsapp}` : ''].filter(Boolean).join(' | ') || '—'}`);
  lines.push(`- Location: ${cv.location || 'Bangladesh'}`);
  if (cv.bloodGroup) lines.push(`- Blood Group: ${cv.bloodGroup}`);
  if (cv.shareUrl) lines.push(`- BMASA Verified Credential: ${cv.shareUrl}`);
  lines.push('');

  lines.push('MARITIME STATUTORY DOCUMENTS (CDC, PASSPORT, CoC, MEDICAL)');
  for (const docRow of cv.documents) {
    lines.push(
      `- ${docRow.name}: ${docRow.docNumber} | Issue: ${fmtOptDate(docRow.issueDate)} | Expiry: ${fmtOptDate(docRow.expiryDate)}`
    );
  }
  lines.push('');

  lines.push('STCW CERTIFICATES OF PROFICIENCY (COP)');
  if (cv.copCertificates.length === 0) {
    lines.push('- No STCW COP certificates recorded yet.');
  } else {
    for (const cop of cv.copCertificates) {
      lines.push(
        `- ${cop.title} | No: ${cop.certNumber} | Issue: ${fmtOptDate(cop.issueDate)} | Expiry: ${fmtOptDate(cop.expiryDate)}`
      );
    }
  }
  lines.push('');

  lines.push('ACADEMIC & PROFESSIONAL QUALIFICATIONS');
  if (cv.academicQualifications.length === 0) {
    lines.push('- No qualifications added yet.');
  } else {
    for (const qual of cv.academicQualifications) {
      const details = [
        qual.institution,
        qual.boardOrUniversity,
        qual.passingYear ? `Year: ${qual.passingYear}` : '',
        qual.result ? `Result: ${qual.result}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(`- ${qual.level}: ${details || 'Recorded'}`);
    }
  }
  lines.push('');

  lines.push(`SEA SERVICE RECORD (Total Cumulative Sea Time: ${cv.seaTime.formattedYmd})`);
  if (cv.voyages.length === 0) {
    lines.push('- Pre-Sea / Ready for First Assignment (No sea voyages logged yet).');
  } else {
    for (const v of cv.voyages) {
      lines.push(
        `- ${v.vesselName} (${v.vesselType}) | ${v.rankServed} | ${v.companyName} | ${formatMaritimeDate(v.signOnDate)} to ${formatMaritimeDate(v.signOffDate)} (${v.duration})`
      );
    }
  }

  if (includeNok && (cv.nok.name || cv.nok.phone)) {
    lines.push('');
    lines.push('EMERGENCY NEXT-OF-KIN (NOK)');
    lines.push(
      `- Name: ${cv.nok.name || '—'} (${cv.nok.relation || 'NOK'}) | Phone: ${cv.nok.phone || '—'} | City: ${cv.nok.city || '—'}`
    );
  }

  return lines.join('\n');
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeRenderablePhotoSrc(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function renderSeafarerCvHtml(
  cv: SeafarerCvData,
  options: CvExportOptions = {}
): string {
  const { includeNok = true, targetJob } = options;
  const safePhoto = isSafeRenderablePhotoSrc(cv.photoUrl) ? cv.photoUrl : '';

  const docRowsHtml = cv.documents
    .map(
      (d) => `
      <tr>
        <td class="strong">${escapeHtml(d.name)}</td>
        <td class="mono">${escapeHtml(d.docNumber)}</td>
        <td class="mono">${escapeHtml(fmtOptDate(d.issueDate))}</td>
        <td class="mono">${escapeHtml(fmtOptDate(d.expiryDate))}</td>
      </tr>`
    )
    .join('');

  const copRowsHtml =
    cv.copCertificates.length > 0
      ? cv.copCertificates
          .map(
            (c) => `
        <tr>
          <td class="strong">${escapeHtml(c.title)}</td>
          <td class="mono">${escapeHtml(c.certNumber)}</td>
          <td class="mono">${escapeHtml(fmtOptDate(c.issueDate))}</td>
          <td class="mono">${escapeHtml(fmtOptDate(c.expiryDate))}</td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="4" class="muted">No COP certificates recorded yet.</td></tr>`;

  const academicRowsHtml =
    cv.academicQualifications.length > 0
      ? cv.academicQualifications
          .map(
            (q) => `
      <tr>
        <td class="strong">${escapeHtml(q.level)}</td>
        <td>${escapeHtml(q.institution || '—')}</td>
        <td>${escapeHtml(q.boardOrUniversity || '—')}</td>
        <td class="mono">${escapeHtml(q.passingYear || '—')}</td>
        <td class="mono">${escapeHtml(q.result || '—')}</td>
      </tr>`
          )
          .join('')
      : `<tr><td colspan="5" class="muted">No qualifications added yet.</td></tr>`;

  const voyageRowsHtml =
    cv.voyages.length > 0
      ? cv.voyages
          .map(
            (v) => `
        <tr>
          <td class="strong">${escapeHtml(v.vesselName)}</td>
          <td>${escapeHtml(v.vesselType)}</td>
          <td>${escapeHtml(v.rankServed)}</td>
          <td>${escapeHtml(v.companyName)}</td>
          <td class="mono">${escapeHtml(formatMaritimeDate(v.signOnDate))}</td>
          <td class="mono">${escapeHtml(formatMaritimeDate(v.signOffDate))}</td>
          <td class="mono">${escapeHtml(v.duration)}</td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="7" class="muted">No sea service voyages logged yet.</td></tr>`;

  const nokHtml = includeNok
    ? `
    <section class="card">
      <h2>Emergency Next-of-Kin (NOK)</h2>
      <div class="grid-4">
        <div><span class="lbl">Name</span><strong>${escapeHtml(cv.nok.name || '—')}</strong></div>
        <div><span class="lbl">Relationship</span><strong>${escapeHtml(cv.nok.relation || '—')}</strong></div>
        <div><span class="lbl">Emergency Phone</span><strong class="mono">${escapeHtml(cv.nok.phone || '—')}</strong></div>
        <div><span class="lbl">Home City</span><strong>${escapeHtml(cv.nok.city || '—')}</strong></div>
      </div>
    </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(cv.fullName)} — BMASA Maritime CV</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; margin: 0; padding: 24px; background: #fff; font-size: 11px; line-height: 1.45; }
  .sheet { max-width: 820px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; border-bottom: 3px solid #C5A059; padding-bottom: 14px; margin-bottom: 14px; background: #0A192F; color: #fff; padding: 18px 20px; border-radius: 10px; }
  .header h1 { margin: 4px 0 2px; font-size: 21px; letter-spacing: -0.01em; color: #fff; }
  .eyebrow { font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: 0.14em; color: #E5C787; text-transform: uppercase; margin: 0; }
  .rank { font-size: 13px; font-weight: 600; color: #D8B979; margin: 2px 0 8px; }
  .meta-line { font-size: 10.5px; color: #CBD5E1; margin: 2px 0; }
  .photo { width: 82px; height: 82px; border-radius: 8px; object-fit: cover; border: 2px solid #C5A059; flex-shrink: 0; }
  .banner { background: #FBF8F1; border: 1px solid #C5A059; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10.5px; color: #0A192F; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #0A192F; border-bottom: 1.5px solid #C5A059; padding-bottom: 4px; margin: 14px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; background: #F8FAFC; padding: 6px 8px; border: 1px solid #E2E8F0; }
  td { padding: 6px 8px; border: 1px solid #E2E8F0; vertical-align: top; }
  .strong { font-weight: 600; color: #0A192F; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; }
  .muted { color: #64748B; text-align: center; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 8px 10px; border: 1px solid #E2E8F0; border-radius: 6px; background: #F8FAFC; }
  .lbl { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748B; margin-bottom: 2px; }
  .footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 9.5px; color: #64748B; }
  @media print { body { padding: 0; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } th, .grid-4, .banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="sheet">
    <header class="header">
      <div>
        <p class="eyebrow">${escapeHtml(cv.academyName)} — Maritime Seafarer CV</p>
        <h1>${escapeHtml(cv.fullName)}</h1>
        <p class="rank">${escapeHtml(cv.currentRank)} · ${escapeHtml(cv.department)} Department</p>
        <p class="meta-line">Cadet No: <span class="mono">${escapeHtml(cv.cadetNumber)}</span> · ${escapeHtml(cv.batch)} · Status: ${escapeHtml(cv.availabilityStatus)}${cv.bloodGroup ? ` · Blood: ${escapeHtml(cv.bloodGroup)}` : ''}</p>
        <p class="meta-line">Email: ${escapeHtml(cv.contact.email || '—')} · Mobile/WA: ${escapeHtml(cv.contact.whatsapp || cv.contact.phone || '—')} · Location: ${escapeHtml(cv.location || 'Bangladesh')}</p>
      </div>
      ${safePhoto ? `<img class="photo" src="${escapeHtml(safePhoto)}" alt="${escapeHtml(cv.fullName)}" />` : ''}
    </header>

    ${targetJob ? `<div class="banner"><strong>Application Reference:</strong> Applying for <strong>${escapeHtml(targetJob.rankNeeded)}</strong> at <strong>${escapeHtml(targetJob.companyName)}</strong></div>` : ''}

    <section>
      <h2>Travel, Statutory &amp; Competency Documents (CDC / Passport / CoC / Medical)</h2>
      <table>
        <thead>
          <tr>
            <th>Document Type</th>
            <th>Number / Grade</th>
            <th>Issue Date</th>
            <th>Expiry Date</th>
          </tr>
        </thead>
        <tbody>${docRowsHtml}</tbody>
      </table>
    </section>

    <section>
      <h2>STCW Certificates of Proficiency (COP) &amp; Endorsements</h2>
      <table>
        <thead>
          <tr>
            <th>Certificate Title</th>
            <th>Certificate No.</th>
            <th>Issue Date</th>
            <th>Expiry Date</th>
          </tr>
        </thead>
        <tbody>${copRowsHtml}</tbody>
      </table>
    </section>

    <section>
      <h2>Academic Qualifications</h2>
      <table>
        <thead>
          <tr>
            <th>Qualification</th>
            <th>Academy / Institution</th>
            <th>Board / Branch</th>
            <th>Year / Batch</th>
            <th>Grade / Cadet ID</th>
          </tr>
        </thead>
        <tbody>${academicRowsHtml}</tbody>
      </table>
    </section>

    <section>
      <h2>Sea Service Record (Cumulative Sea Time: ${escapeHtml(cv.seaTime.formattedYmd)})</h2>
      <table>
        <thead>
          <tr>
            <th>Vessel Name</th>
            <th>Type</th>
            <th>Rank</th>
            <th>Company / Agent</th>
            <th>Sign On</th>
            <th>Sign Off</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>${voyageRowsHtml}</tbody>
      </table>
    </section>

    ${nokHtml}

    <footer class="footer">
      <span>Generated via BMASA Official Portal · Credential Serial: ${escapeHtml(cv.memberSerial)}</span>
      <span>Date: ${escapeHtml(formatMaritimeDate(cv.generatedDateIso))}</span>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Wraps one or more JPEG canvas pages (1240 x 1754 A4 @ ~150 DPI) into a standard compliant PDF 1.4 byte array.
 */
export function buildPdfFromJpegPages(pages: Array<{ jpegBytes: Uint8Array; width: number; height: number }>): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let cursor = 0;

  const pushStr = (s: string) => {
    const b = enc.encode(s);
    chunks.push(b);
    cursor += b.byteLength;
  };
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    cursor += b.byteLength;
  };
  const startObj = (objNum: number) => {
    offsets[objNum] = cursor;
    pushStr(`${objNum} 0 obj\n`);
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const pageKids: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    pageKids.push(`${3 + i * 3} 0 R`);
  }

  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObj(2);
  pushStr(`<< /Type /Pages /Kids [${pageKids.join(' ')}] /Count ${pages.length} >>\nendobj\n`);

  const ptW = 595.28;
  const ptH = 841.89;

  for (let i = 0; i < pages.length; i++) {
    const pageObj = 3 + i * 3;
    const imgObj = 4 + i * 3;
    const contentObj = 5 + i * 3;
    const { jpegBytes, width, height } = pages[i];

    startObj(pageObj);
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 ${imgObj} 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`
    );

    startObj(imgObj);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`
    );
    pushBytes(jpegBytes);
    pushStr('\nendstream\nendobj\n');

    const streamStr = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q\n`;
    startObj(contentObj);
    pushStr(`<< /Length ${streamStr.length} >>\nstream\n${streamStr}endstream\nendobj\n`);
  }

  const totalObjs = 3 + pages.length * 3;
  const xrefPos = cursor;
  pushStr(`xref\n0 ${totalObjs}\n`);
  pushStr('0000000000 65535 f \n');
  for (let n = 1; n < totalObjs; n++) {
    pushStr(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  const out = new Uint8Array(cursor);
  let writePos = 0;
  for (const chunk of chunks) {
    out.set(chunk, writePos);
    writePos += chunk.byteLength;
  }
  return out;
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['—'];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

export interface GeneratedCvPdf {
  blob: Blob;
  bytes: Uint8Array;
  filename: string;
  pageCount: number;
  sizeKb: number;
}

/**
 * Renders the member's complete Seafarer CV across cleanly paginated A4 pages and returns the PDF Blob + bytes.
 */
export async function generateSeafarerCvPdf(
  cv: SeafarerCvData,
  options: CvExportOptions = {}
): Promise<GeneratedCvPdf> {
  const { includeNok = true, targetJob } = options;
  const pageW = 1240;
  const pageH = 1754;
  const marginX = 68;
  const contentW = pageW - marginX * 2;
  const bottomLimit = pageH - 84;

  const pages: HTMLCanvasElement[] = [];
  const createPage = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y: number } => {
    const canvas = document.createElement('canvas');
    canvas.width = pageW;
    canvas.height = pageH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pageW, pageH);
    pages.push(canvas);
    return { canvas, ctx, y: 68 };
  };

  let cur = createPage();
  const ensureSpace = (needed: number) => {
    if (cur.y + needed > bottomLimit) {
      cur = createPage();
    }
  };

  // Header Banner
  const headerH = 224;
  cur.ctx.fillStyle = '#0A192F';
  cur.ctx.fillRect(marginX, cur.y, contentW, headerH);
  cur.ctx.fillStyle = '#C5A059';
  cur.ctx.fillRect(marginX, cur.y + headerH - 6, contentW, 6);

  cur.ctx.fillStyle = '#E5C787';
  cur.ctx.font = '700 15px "JetBrains Mono", monospace';
  cur.ctx.fillText(cv.academyName.toUpperCase(), marginX + 28, cur.y + 38);

  cur.ctx.fillStyle = '#FFFFFF';
  cur.ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
  cur.ctx.fillText(cv.fullName.slice(0, 38), marginX + 28, cur.y + 84);

  cur.ctx.fillStyle = '#D8B979';
  cur.ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  cur.ctx.fillText(`${cv.currentRank} · ${cv.department} Department`, marginX + 28, cur.y + 116);

  cur.ctx.fillStyle = '#CBD5E1';
  cur.ctx.font = '500 16px "DM Sans", sans-serif';
  cur.ctx.fillText(
    `Cadet No: ${cv.cadetNumber}   ·   ${cv.batch}   ·   Status: ${cv.availabilityStatus}${cv.bloodGroup ? `   ·   Blood: ${cv.bloodGroup}` : ''}`,
    marginX + 28,
    cur.y + 152
  );
  cur.ctx.fillText(
    `Email: ${cv.contact.email || '—'}   ·   Phone/WA: ${cv.contact.whatsapp || cv.contact.phone || '—'}   ·   ${cv.location || 'Bangladesh'}`,
    marginX + 28,
    cur.y + 180
  );

  // Portrait Photo if available
  const img = await loadImageSafe(cv.photoUrl);
  if (img) {
    const pSize = 152;
    const px = marginX + contentW - pSize - 28;
    const py = cur.y + 34;
    cur.ctx.save();
    cur.ctx.beginPath();
    cur.ctx.rect(px, py, pSize, pSize);
    cur.ctx.clip();
    const sc = Math.max(pSize / img.width, pSize / img.height);
    cur.ctx.drawImage(img, px + (pSize - img.width * sc) / 2, py + (pSize - img.height * sc) / 2, img.width * sc, img.height * sc);
    cur.ctx.restore();
    cur.ctx.strokeStyle = '#C5A059';
    cur.ctx.lineWidth = 3;
    cur.ctx.strokeRect(px, py, pSize, pSize);
  }

  cur.y += headerH + 22;

  if (targetJob) {
    cur.ctx.fillStyle = '#FBF8F1';
    cur.ctx.fillRect(marginX, cur.y, contentW, 44);
    cur.ctx.strokeStyle = '#C5A059';
    cur.ctx.lineWidth = 1.5;
    cur.ctx.strokeRect(marginX, cur.y, contentW, 44);
    cur.ctx.fillStyle = '#0A192F';
    cur.ctx.font = '600 17px "DM Sans", sans-serif';
    cur.ctx.fillText(
      `Application Reference: ${targetJob.rankNeeded} — ${targetJob.companyName}`,
      marginX + 18,
      cur.y + 28
    );
    cur.y += 60;
  }

  const drawSectionHeading = (title: string) => {
    ensureSpace(74);
    cur.ctx.fillStyle = '#0A192F';
    cur.ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    cur.ctx.fillText(title.toUpperCase(), marginX, cur.y + 18);
    cur.ctx.fillStyle = '#C5A059';
    cur.ctx.fillRect(marginX, cur.y + 27, contentW, 2.5);
    cur.y += 40;
  };

  const drawTable = (
    headers: string[],
    colWidths: number[],
    rows: string[][]
  ) => {
    const drawTableHeader = () => {
      ensureSpace(46);
      cur.ctx.fillStyle = '#F1F5F9';
      cur.ctx.fillRect(marginX, cur.y, contentW, 34);
      cur.ctx.strokeStyle = '#CBD5E1';
      cur.ctx.lineWidth = 1;
      cur.ctx.strokeRect(marginX, cur.y, contentW, 34);
      cur.ctx.fillStyle = '#334155';
      cur.ctx.font = '700 14px "DM Sans", sans-serif';
      let cx = marginX;
      headers.forEach((h, idx) => {
        cur.ctx.fillText(h, cx + 10, cur.y + 22);
        cx += colWidths[idx];
      });
      cur.y += 34;
    };

    drawTableHeader();

    for (const row of rows) {
      cur.ctx.font = '500 15px "DM Sans", sans-serif';
      const wrappedCols = row.map((cell, idx) =>
        wrapTextLines(cur.ctx, cell || '—', colWidths[idx] - 20)
      );
      const maxLines = Math.max(...wrappedCols.map((c) => c.length));
      const rowH = Math.max(34, maxLines * 20 + 14);

      if (cur.y + rowH > bottomLimit) {
        cur = createPage();
        drawTableHeader();
      }

      cur.ctx.fillStyle = '#FFFFFF';
      cur.ctx.fillRect(marginX, cur.y, contentW, rowH);
      cur.ctx.strokeStyle = '#E2E8F0';
      cur.ctx.strokeRect(marginX, cur.y, contentW, rowH);

      let cx = marginX;
      wrappedCols.forEach((lines, idx) => {
        cur.ctx.fillStyle = idx === 0 ? '#0A192F' : '#334155';
        cur.ctx.font = idx === 0 ? '600 15px "DM Sans", sans-serif' : '400 15px "DM Sans", sans-serif';
        lines.forEach((ln, li) => {
          cur.ctx.fillText(ln, cx + 10, cur.y + 22 + li * 20);
        });
        cx += colWidths[idx];
      });
      cur.y += rowH;
    }
    cur.y += 22;
  };

  // 1. Travel & Statutory Docs
  drawSectionHeading('Statutory Documents (CDC, Passport, CoC, Medical)');
  drawTable(
    ['Document', 'Number / Grade', 'Issue Date', 'Expiry Date'],
    [contentW * 0.38, contentW * 0.24, contentW * 0.19, contentW * 0.19],
    cv.documents.map((d) => [d.name, d.docNumber, fmtOptDate(d.issueDate), fmtOptDate(d.expiryDate)])
  );

  // 2. COP Certificates
  drawSectionHeading('STCW Certificates of Proficiency (COP)');
  drawTable(
    ['COP Certificate', 'Cert Number', 'Issue Date', 'Expiry Date'],
    [contentW * 0.44, contentW * 0.22, contentW * 0.17, contentW * 0.17],
    cv.copCertificates.length > 0
      ? cv.copCertificates.map((c) => [c.title, c.certNumber, fmtOptDate(c.issueDate), fmtOptDate(c.expiryDate)])
      : [['No COP certificates recorded yet.', '—', '—', '—']]
  );

  // 3. User-Added Qualifications Only
  drawSectionHeading('Academic Qualifications');
  drawTable(
    ['Level', 'Institution', 'Board / University', 'Year', 'Result'],
    [contentW * 0.2, contentW * 0.28, contentW * 0.2, contentW * 0.14, contentW * 0.18],
    cv.academicQualifications.length > 0
      ? cv.academicQualifications.map((q) => [
          q.level,
          q.institution || '—',
          q.boardOrUniversity || '—',
          q.passingYear || '—',
          q.result || '—',
        ])
      : [['No qualifications added yet.', '—', '—', '—', '—']]
  );

  // 4. Sea Service Voyages
  drawSectionHeading(`Sea Service Record (Total Sea Time: ${cv.seaTime.formattedYmd})`);
  drawTable(
    ['Vessel Name', 'Type', 'Rank', 'Company', 'Sign On', 'Sign Off', 'Duration'],
    [
      contentW * 0.2,
      contentW * 0.14,
      contentW * 0.14,
      contentW * 0.2,
      contentW * 0.11,
      contentW * 0.11,
      contentW * 0.1,
    ],
    cv.voyages.length > 0
      ? cv.voyages.map((v) => [
          v.vesselName,
          v.vesselType,
          v.rankServed,
          v.companyName,
          formatMaritimeDate(v.signOnDate),
          formatMaritimeDate(v.signOffDate),
          v.duration,
        ])
      : [['No sea voyages recorded yet.', '—', '—', '—', '—', '—', '—']]
  );

  // 5. Emergency Next-of-Kin (NOK)
  if (includeNok) {
    drawSectionHeading('Emergency Next-of-Kin (NOK)');
    drawTable(
      ['NOK Name', 'Relationship', 'Emergency Phone', 'Home City'],
      [contentW * 0.3, contentW * 0.22, contentW * 0.26, contentW * 0.22],
      [[cv.nok.name || '—', cv.nok.relation || '—', cv.nok.phone || '—', cv.nok.city || '—']]
    );
  }

  // Footers across all pages
  pages.forEach((canvas, idx) => {
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX, pageH - 60);
    ctx.lineTo(pageW - marginX, pageH - 60);
    ctx.stroke();
    ctx.fillStyle = '#64748B';
    ctx.font = '500 14px "DM Sans", sans-serif';
    ctx.fillText(
      `BMASA Official Member CV · Serial: ${cv.memberSerial} · ${cv.academyName}`,
      marginX,
      pageH - 36
    );
    const pageTxt = `Page ${idx + 1} of ${pages.length}`;
    const pw = ctx.measureText(pageTxt).width;
    ctx.fillText(pageTxt, pageW - marginX - pw, pageH - 36);
  });

  const jpegPages = await Promise.all(
    pages.map(
      (canvas) =>
        new Promise<{ jpegBytes: Uint8Array; width: number; height: number }>((resolve, reject) => {
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error('Canvas export failed'));
                return;
              }
              const buf = await blob.arrayBuffer();
              resolve({ jpegBytes: new Uint8Array(buf), width: pageW, height: pageH });
            },
            'image/jpeg',
            0.92
          );
        })
    )
  );

  const pdfBytes = buildPdfFromJpegPages(jpegPages);
  const blob = new Blob([pdfBytes.slice().buffer], { type: 'application/pdf' });
  const safeName = (cv.cadetNumber || cv.fullName || 'Seafarer').replace(/[^A-Za-z0-9_-]/g, '_');
  const filename = `BMASA-CV-${safeName}.pdf`;

  return {
    blob,
    bytes: pdfBytes,
    filename,
    pageCount: pages.length,
    sizeKb: Math.max(1, Math.round(pdfBytes.byteLength / 1024)),
  };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function uint8ToBase64Lines(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const b64 = btoa(binary);
  return b64.replace(/(.{76})/g, '$1\r\n');
}

/**
 * Builds an RFC 2822 MIME multipart/mixed .eml draft containing the cover letter and real PDF CV attachment.
 */
export function buildEmlWithPdfAttachment(params: {
  to: string[];
  bcc?: string[];
  fromEmail?: string;
  subject: string;
  bodyText: string;
  pdfBytes: Uint8Array;
  pdfFilename: string;
}): Blob {
  const boundary = `----=_BMASA_Part_${Date.now().toString(36)}`;
  const sanitizeHeader = (v: string) => v.replace(/[\r\n]+/g, ' ').trim();
  const headers: string[] = [
    'MIME-Version: 1.0',
    'X-Unsent: 1',
  ];
  if (params.fromEmail) {
    headers.push(`From: ${sanitizeHeader(params.fromEmail)}`);
  }
  if (params.to.length > 0) {
    headers.push(`To: ${params.to.map(sanitizeHeader).join(', ')}`);
  }
  if (params.bcc && params.bcc.length > 0) {
    headers.push(`Bcc: ${params.bcc.map(sanitizeHeader).join(', ')}`);
  }
  headers.push(`Subject: ${sanitizeHeader(params.subject)}`);
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  const cleanFilename = sanitizeHeader(params.pdfFilename).replace(/"/g, '');
  const pdfBase64 = uint8ToBase64Lines(params.pdfBytes);
  const normalizedBody = params.bodyText.replace(/\r?\n/g, '\r\n');

  const mimeParts = [
    headers.join('\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    normalizedBody,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${cleanFilename}"`,
    `Content-Disposition: attachment; filename="${cleanFilename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    pdfBase64,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  return new Blob([mimeParts], { type: 'message/rfc822' });
}

/**
 * Renders the member's complete Seafarer CV across cleanly paginated A4 pages and downloads a PDF file directly.
 */
export async function exportSeafarerCvPdf(
  cv: SeafarerCvData,
  options: CvExportOptions = {}
): Promise<string> {
  const generated = await generateSeafarerCvPdf(cv, options);
  triggerBlobDownload(generated.blob, generated.filename);
  return generated.filename;
}

/**
 * Triggers native browser print / Save-as-PDF via a hidden iframe (avoids window.open inside iFrame sandboxes).
 */
export function printSeafarerCv(cv: SeafarerCvData, options: CvExportOptions = {}): void {
  if (typeof document === 'undefined') return;
  const html = renderSeafarerCvHtml(cv, options);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.srcdoc = html;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Non-blocking in restricted environments
    }
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 3000);
  };
  document.body.appendChild(iframe);
}
