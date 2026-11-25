import QRCode from 'qrcode';
import type { DirectoryProfile } from '../types/portal';
import { cleanBatchLabel, getInitials } from './portalLogic';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCompassWatermark(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(158, 123, 57, 0.08)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.22, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const outerR = i % 2 === 0 ? radius * 0.96 : radius * 0.65;
    const sideAngle1 = angle - Math.PI / 16;
    const sideAngle2 = angle + Math.PI / 16;
    const midR = radius * 0.2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sideAngle1) * midR, cy + Math.sin(sideAngle1) * midR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.lineTo(cx + Math.cos(sideAngle2) * midR, cy + Math.sin(sideAngle2) * midR);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
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

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontTemplate: (size: number) => string,
  startSize: number,
  minSize: number
): number {
  let size = startSize;
  while (size > minSize) {
    ctx.font = fontTemplate(size);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

/**
 * Exports an official CR80-proportioned (85.6mm x 54mm = 1.585:1)
 * light-palette BMASA Digital Alumni ID card at 1712x1080 PNG resolution.
 */
export async function renderDigitalIdCardDataUrl(
  member: DirectoryProfile,
  shareUrl: string
): Promise<string | null> {
  const width = 1712;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Clean white / pale nautical off-white card surface
  drawRoundedRect(ctx, 18, 18, width - 36, height - 36, 40);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.58, '#F8FAFC');
  grad.addColorStop(1, '#EEF4FB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle top accent band
  ctx.fillStyle = '#0A192F';
  ctx.fillRect(18, 18, width - 36, 14);

  // Light compass watermark
  drawCompassWatermark(ctx, width - 250, height * 0.5, 340);

  // Outer brass-gold frame & inner hairline
  drawRoundedRect(ctx, 22, 22, width - 44, height - 44, 36);
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 5;
  ctx.stroke();

  drawRoundedRect(ctx, 42, 42, width - 84, height - 84, 24);
  ctx.strokeStyle = 'rgba(10, 25, 47, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header
  ctx.fillStyle = '#0A192F';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('BANGLADESH MARINE ACADEMY SYLHET ALUMNI ASSOCIATION (BMASA)', 78, 108);

  ctx.fillStyle = '#806127';
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillText('OFFICIAL DIGITAL ALUMNI IDENTITY CARD', 78, 142);

  // Verification Badge
  const badgeLabel = member.isVerified ? 'VERIFIED MEMBER' : 'PENDING VERIFICATION';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  const badgeTextW = ctx.measureText(badgeLabel).width;
  const badgeW = badgeTextW + 48;
  const badgeH = 48;
  const badgeX = width - 78 - badgeW;
  const badgeY = 82;

  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 24);
  if (member.isVerified) {
    ctx.fillStyle = '#ECFDF5';
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#065F46';
  } else {
    ctx.fillStyle = '#FEF3C7';
    ctx.fill();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#92400E';
  }
  ctx.fillText(badgeLabel, badgeX + 24, badgeY + 30);

  // Header Divider
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(78, 174);
  ctx.lineTo(width - 78, 174);
  ctx.stroke();

  // Portrait
  const photoX = 78;
  const photoY = 216;
  const photoSize = 276;
  const avatarImg = await loadImageSafe(member.photoUrl);

  ctx.save();
  drawRoundedRect(ctx, photoX, photoY, photoSize, photoSize, 26);
  ctx.clip();
  if (avatarImg) {
    const scale = Math.max(photoSize / avatarImg.width, photoSize / avatarImg.height);
    const drawW = avatarImg.width * scale;
    const drawH = avatarImg.height * scale;
    ctx.drawImage(
      avatarImg,
      photoX + (photoSize - drawW) / 2,
      photoY + (photoSize - drawH) / 2,
      drawW,
      drawH
    );
  } else {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(photoX, photoY, photoSize, photoSize);
    ctx.fillStyle = '#0A192F';
    ctx.font = '800 84px "Plus Jakarta Sans", sans-serif';
    const initials = getInitials(member.fullName);
    const tw = ctx.measureText(initials).width;
    ctx.fillText(initials, photoX + (photoSize - tw) / 2, photoY + photoSize / 2 + 28);
  }
  ctx.restore();

  drawRoundedRect(ctx, photoX, photoY, photoSize, photoSize, 26);
  ctx.strokeStyle = '#0A192F';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Member Identity Block
  const infoX = 398;
  const maxInfoW = width - infoX - 84;
  const cleanName = member.fullName.slice(0, 36);
  const nameSize = fitText(
    ctx,
    cleanName,
    maxInfoW,
    (sz) => `800 ${sz}px "Plus Jakarta Sans", sans-serif`,
    58,
    38
  );
  ctx.fillStyle = '#0A192F';
  ctx.font = `800 ${nameSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(cleanName, infoX, 276);

  ctx.fillStyle = '#806127';
  ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(member.currentRank, infoX, 330);

  const deptLabel =
    member.department === 'Instructors' ? 'Instructors Faculty' : `${member.department} Department`;
  const locationText = [member.city, member.country].filter(Boolean).join(', ');
  const subText = [deptLabel, locationText].filter(Boolean).join('   ·   ');
  ctx.fillStyle = '#334155';
  ctx.font = '600 24px "DM Sans", sans-serif';
  ctx.fillText(subText, infoX, 378);

  // Blood Group + Status Chips (light high-contrast)
  let chipX = infoX;
  const chipY = 414;

  const statusLabel = member.availabilityStatus;
  ctx.font = '700 22px "DM Sans", sans-serif';
  const statusW = ctx.measureText(statusLabel).width + 38;
  drawRoundedRect(ctx, chipX, chipY, statusW, 48, 24);
  ctx.fillStyle = '#E0F2FE';
  ctx.fill();
  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#075985';
  ctx.fillText(statusLabel, chipX + 19, chipY + 31);
  chipX += statusW + 18;

  if (member.bloodGroup) {
    const bloodLabel = `BLOOD: ${member.bloodGroup}`;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    const bloodW = ctx.measureText(bloodLabel).width + 38;
    drawRoundedRect(ctx, chipX, chipY, bloodW, 48, 24);
    ctx.fillStyle = '#FFE4E6';
    ctx.fill();
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#9F1239';
    ctx.fillText(bloodLabel, chipX + 19, chipY + 31);
  }

  // Credential Divider
  ctx.strokeStyle = 'rgba(10, 25, 47, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(78, 536);
  ctx.lineTo(width - 78, 536);
  ctx.stroke();

  // Large Print-Ready 4-Column Credential Grid (Cadet No, Batch, CDC, SID)
  const fields = [
    { label: 'CADET NUMBER', value: member.cadetNumber || '—' },
    { label: 'BATCH', value: cleanBatchLabel(member.batch) || '—' },
    { label: 'CDC NUMBER', value: member.cdcNumber || 'Pending' },
    { label: 'SID CARD NO.', value: member.sidNumber || 'Pending' },
  ];

  const colW = (width - 156) / 4;
  fields.forEach((item, idx) => {
    const x = 78 + idx * colW;
    ctx.fillStyle = '#475569';
    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.fillText(item.label, x, 588);

    const valSize = fitText(
      ctx,
      item.value,
      colW - 22,
      (sz) => `800 ${sz}px "JetBrains Mono", monospace`,
      34,
      22
    );
    ctx.fillStyle = '#0A192F';
    ctx.font = `800 ${valSize}px "JetBrains Mono", monospace`;
    ctx.fillText(item.value, x, 642);
  });

  // Footer Divider
  ctx.strokeStyle = 'rgba(10, 25, 47, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(78, 704);
  ctx.lineTo(width - 78, 704);
  ctx.stroke();

  // Footer Serial & Verification Note
  ctx.fillStyle = '#475569';
  ctx.font = '700 19px "JetBrains Mono", monospace';
  ctx.fillText('BMASA CREDENTIAL SERIAL', 78, 774);

  ctx.fillStyle = '#0A192F';
  ctx.font = '800 38px "JetBrains Mono", monospace';
  ctx.fillText(member.cadetNumber || member.memberSerial, 78, 832);

  ctx.fillStyle = '#806127';
  ctx.font = '700 22px "DM Sans", sans-serif';
  ctx.fillText('Bangladesh Marine Academy Sylhet Alumni Association', 78, 898);

  ctx.fillStyle = '#475569';
  ctx.font = '500 21px "DM Sans", sans-serif';
  ctx.fillText('Scan QR code to verify official digital alumni credential online.', 78, 942);

  // Compact High-Contrast QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#0A192F', light: '#FFFFFF' },
    });
    const qrImg = await loadImageSafe(qrDataUrl);
    if (qrImg) {
      const qrSize = 236;
      const qrBoxX = width - 78 - qrSize;
      const qrBoxY = 744;
      drawRoundedRect(ctx, qrBoxX - 12, qrBoxY - 12, qrSize + 24, qrSize + 24, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#C5A059';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.drawImage(qrImg, qrBoxX, qrBoxY, qrSize, qrSize);
    }
  } catch {
    // Non-blocking QR fallback
  }

  return canvas.toDataURL('image/png');
}

export async function exportDigitalIdCardPng(
  member: DirectoryProfile,
  shareUrl: string
): Promise<void> {
  const dataUrl = await renderDigitalIdCardDataUrl(member, shareUrl);
  if (!dataUrl) return;
  const link = document.createElement('a');
  const safeFile = (member.cadetNumber || member.memberSerial || 'member').replace(/[^A-Za-z0-9_-]/g, '_');
  link.download = `BMASA-ID-${safeFile}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Prints the rendered CR80 PNG at exact physical 85.6mm x 54mm dimensions
 * using a hidden sandboxed iframe (never window.open / window.alert).
 */
export async function printDigitalIdCardCR80(
  member: DirectoryProfile,
  shareUrl: string
): Promise<void> {
  const dataUrl = await renderDigitalIdCardDataUrl(member, shareUrl);
  if (!dataUrl) return;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>BMASA Digital ID — ${member.fullName.replace(/[<>"]/g, '')}</title>
    <style>
      @page { size: 85.6mm 54mm; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        width: 85.6mm;
        height: 54mm;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img {
        width: 85.6mm;
        height: 54mm;
        display: block;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" alt="BMASA Digital Alumni ID Card" />
  </body>
</html>`;

  const existing = document.getElementById('bmasa-id-print-frame');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'bmasa-id-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.srcdoc = html;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Ignore sandbox print errors
    }
    window.setTimeout(() => {
      iframe.remove();
    }, 60_000);
  };
  document.body.appendChild(iframe);
}
