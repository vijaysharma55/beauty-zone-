/**
 * Minimal, dependency-free PDF writer for payment receipts.
 *
 * Produces a clean single-page A4 receipt using the standard PDF fonts
 * (Helvetica / Helvetica-Bold) and, when the salon logo is a local JPEG
 * upload, embeds it via DCTDecode. No external service or npm package is
 * involved, so receipt generation works offline and in tests.
 *
 * Currency is rendered as "Rs." because the standard PDF fonts use
 * WinAnsi encoding, which has no ₹ glyph.
 */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;

/** Escapes a string for a PDF literal and folds it into WinAnsi-safe text. */
function pdfText(value) {
  return String(value ?? '')
    .replace(/₹/g, 'Rs.')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function formatRupees(paise) {
  const value = (Math.round(Number(paise) || 0) / 100).toFixed(2);
  const [whole, fraction] = value.split('.');
  // Indian digit grouping: last three digits, then pairs (1,23,456.78).
  let grouped = whole;
  if (whole.length > 3) {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3);
    grouped = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
  }
  return `Rs. ${grouped}.${fraction}`;
}

/** Extracts width/height/components from a JPEG buffer (SOF marker scan). */
export function jpegInfo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      const components = buffer[offset + 9];
      if (!width || !height) return null;
      return { width, height, components };
    }
    if (marker === 0xda) break; // start of scan — no SOF found
    offset += 2 + length;
  }
  return null;
}

class PdfDoc {
  constructor() {
    this.objects = [];
    this.content = [];
    this.image = null;
  }

  addObject(body) {
    this.objects.push(body);
    return this.objects.length; // 1-based object number
  }

  /** sRGB colour helpers */
  fill(hex) {
    const [r, g, b] = hexToRgb(hex);
    this.content.push(`${r} ${g} ${b} rg`);
  }

  stroke(hex) {
    const [r, g, b] = hexToRgb(hex);
    this.content.push(`${r} ${g} ${b} RG`);
  }

  rect(x, y, w, h, hex) {
    this.fill(hex);
    this.content.push(`${f(x)} ${f(PAGE_H - y - h)} ${f(w)} ${f(h)} re f`);
  }

  line(x1, y1, x2, y2, hex = '#D8D2C4', width = 0.8) {
    this.stroke(hex);
    this.content.push(`${f(width)} w ${f(x1)} ${f(PAGE_H - y1)} m ${f(x2)} ${f(PAGE_H - y2)} l S`);
  }

  text(value, x, y, { size = 10, bold = false, color = '#1F2937', align = 'left', maxWidth = 0 } = {}) {
    let str = String(value ?? '');
    if (maxWidth > 0) {
      // Rough width estimate (Helvetica averages ~0.5em per character).
      const maxChars = Math.max(4, Math.floor(maxWidth / (size * 0.5)));
      if (str.length > maxChars) str = `${str.slice(0, maxChars - 1)}…`.replace('…', '...');
    }
    const font = bold ? '/F2' : '/F1';
    let tx = x;
    if (align === 'right') tx = x - str.length * size * 0.5;
    if (align === 'center') tx = x - (str.length * size * 0.5) / 2;
    this.fill(color);
    this.content.push(`BT ${font} ${f(size)} Tf ${f(tx)} ${f(PAGE_H - y)} Td (${pdfText(str)}) Tj ET`);
  }

  embedJpeg(buffer) {
    const info = jpegInfo(buffer);
    if (!info || ![1, 3].includes(info.components)) return null;
    const colorSpace = info.components === 1 ? '/DeviceGray' : '/DeviceRGB';
    const num = this.addObject({
      dict:
        `<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} ` +
        `/ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${buffer.length} >>`,
      stream: buffer,
    });
    this.image = { num, ...info };
    return this.image;
  }

  drawImage(x, y, w, h) {
    if (!this.image) return;
    this.content.push(`q ${f(w)} 0 0 ${f(h)} ${f(x)} ${f(PAGE_H - y - h)} cm /Logo Do Q`);
  }

  build() {
    const contentStream = Buffer.from(this.content.join('\n'), 'latin1');
    const contentNum = this.addObject({
      dict: `<< /Length ${contentStream.length} >>`,
      stream: contentStream,
    });
    const fontRegular = this.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const fontBold = this.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const xobjects = this.image ? ` /XObject << /Logo ${this.image.num} 0 R >>` : '';
    const pagesNum = this.addObject(''); // placeholder, patched below
    const pageNum = this.addObject(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${f(PAGE_W)} ${f(PAGE_H)}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >>${xobjects} >> ` +
        `/Contents ${contentNum} 0 R >>`
    );
    this.objects[pagesNum - 1] = `<< /Type /Pages /Kids [${pageNum} 0 R] /Count 1 >>`;
    const catalogNum = this.addObject(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);

    const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
    let offset = chunks[0].length;
    const offsets = [0];
    this.objects.forEach((obj, index) => {
      offsets.push(offset);
      const header = Buffer.from(`${index + 1} 0 obj\n`, 'latin1');
      let body;
      if (typeof obj === 'string') {
        body = Buffer.from(`${obj}\nendobj\n`, 'latin1');
      } else {
        body = Buffer.concat([
          Buffer.from(`${obj.dict}\nstream\n`, 'latin1'),
          obj.stream,
          Buffer.from('\nendstream\nendobj\n', 'latin1'),
        ]);
      }
      chunks.push(header, body);
      offset += header.length + body.length;
    });
    const xrefStart = offset;
    let xref = `xref\n0 ${this.objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= this.objects.length; i += 1) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${this.objects.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    chunks.push(Buffer.from(xref, 'latin1'));
    return Buffer.concat(chunks);
  }
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x1f2937;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => v.toFixed(3));
}

function f(n) {
  return Number(n).toFixed(2);
}

/**
 * Builds the receipt PDF.
 * @param {object} d receipt data (all strings pre-sanitised by the caller)
 * @returns {Buffer}
 */
export function buildReceiptPdf(d) {
  const doc = new PdfDoc();
  const accent = /^#[0-9a-fA-F]{6}$/.test(d.accent || '') ? d.accent : '#B37E28';
  const ink = '#111827';
  const muted = '#6B7280';
  const right = PAGE_W - MARGIN;

  // Header band
  doc.rect(0, 0, PAGE_W, 118, '#0F172A');
  let textX = MARGIN;
  if (d.logoJpeg && doc.embedJpeg(d.logoJpeg)) {
    const { width, height } = doc.image;
    const scale = Math.min(64 / width, 64 / height);
    const w = width * scale;
    const h = height * scale;
    doc.rect(MARGIN - 4, 26 - 4 + (64 - h) / 2, w + 8, h + 8, '#FFFFFF');
    doc.drawImage(MARGIN, 26 + (64 - h) / 2, w, h);
    textX = MARGIN + w + 16;
  }
  doc.text(d.salonName || 'Salon', textX, 52, { size: 20, bold: true, color: '#FFFFFF', maxWidth: 330 });
  doc.text(d.salonAddress || '', textX, 70, { size: 9, color: '#CBD5E1', maxWidth: 340 });
  doc.text([d.salonPhone, d.salonEmail].filter(Boolean).join('  ·  '), textX, 84, { size: 9, color: '#CBD5E1', maxWidth: 340 });
  doc.text('PAYMENT RECEIPT', right, 46, { size: 13, bold: true, color: accent, align: 'right' });
  doc.text(d.receiptNumber || '', right, 64, { size: 10, color: '#FFFFFF', align: 'right' });
  doc.text(`Issued: ${d.issuedAt || ''}`, right, 78, { size: 9, color: '#CBD5E1', align: 'right' });

  let y = 150;
  const statusColor = d.paymentStatusLabel === 'ADVANCE PAID' || d.paymentStatusLabel === 'PAID IN FULL' ? '#047857' : '#B45309';
  doc.text('BOOKING STATUS', MARGIN, y, { size: 8, bold: true, color: muted });
  doc.text(d.bookingStatusLabel || 'CONFIRMED', MARGIN, y + 16, { size: 12, bold: true, color: statusColor });
  doc.text('PAYMENT STATUS', MARGIN + 200, y, { size: 8, bold: true, color: muted });
  doc.text(d.paymentStatusLabel || 'ADVANCE PAID', MARGIN + 200, y + 16, { size: 12, bold: true, color: statusColor });
  doc.text('BOOKING REFERENCE', right, y, { size: 8, bold: true, color: muted, align: 'right' });
  doc.text(d.bookingReference || '', right, y + 16, { size: 12, bold: true, color: ink, align: 'right' });

  y += 40;
  doc.line(MARGIN, y, right, y);
  y += 24;

  // Customer + appointment
  doc.text('BILLED TO', MARGIN, y, { size: 8, bold: true, color: muted });
  doc.text(d.customerName || '', MARGIN, y + 16, { size: 11, bold: true, color: ink, maxWidth: 240 });
  doc.text(d.customerPhone || '', MARGIN, y + 31, { size: 10, color: muted });
  doc.text('APPOINTMENT', MARGIN + 280, y, { size: 8, bold: true, color: muted });
  doc.text(d.service || '', MARGIN + 280, y + 16, { size: 11, bold: true, color: ink, maxWidth: 220 });
  doc.text(`${d.date || ''} at ${d.time || ''}`, MARGIN + 280, y + 31, { size: 10, color: muted });
  if (d.stylist) doc.text(`Specialist: ${d.stylist}`, MARGIN + 280, y + 46, { size: 9, color: muted, maxWidth: 220 });

  y += 66;
  doc.line(MARGIN, y, right, y);
  y += 18;

  // Amount table
  doc.rect(MARGIN, y, right - MARGIN, 26, '#F3F0E7');
  doc.text('DESCRIPTION', MARGIN + 12, y + 17, { size: 8, bold: true, color: muted });
  doc.text('AMOUNT', right - 12, y + 17, { size: 8, bold: true, color: muted, align: 'right' });
  y += 26;

  const rows = [
    ['Total booking amount', formatRupees(d.totalPaise), false],
    [
      d.kind === 'balance' ? 'Balance payment received (this receipt)' : 'Advance received (this receipt)',
      formatRupees(d.paidPaise),
      true,
    ],
    ['Remaining balance' + (d.balancePolicy === 'online' ? ' (payable online)' : ' (payable at salon)'), formatRupees(d.remainingPaise), false],
  ];
  for (const [label, amount, strong] of rows) {
    y += 26;
    doc.text(label, MARGIN + 12, y, { size: 10, bold: strong, color: strong ? ink : muted, maxWidth: 360 });
    doc.text(amount, right - 12, y, { size: strong ? 12 : 10, bold: strong, color: strong ? accent : ink, align: 'right' });
    doc.line(MARGIN, y + 9, right, y + 9, '#E7E2D5', 0.6);
  }

  y += 36;
  doc.text('PAYMENT DETAILS', MARGIN, y, { size: 8, bold: true, color: muted });
  y += 16;
  const details = [
    ['Payment method', d.methodLabel || '—'],
    ['Transaction / reference ID', d.transactionRef || '—'],
    ['Currency', d.currency || 'INR'],
    ['Verified at', d.verifiedAt || d.issuedAt || '—'],
  ];
  for (const [label, value] of details) {
    y += 16;
    doc.text(label, MARGIN + 12, y, { size: 9, color: muted });
    doc.text(value, MARGIN + 200, y, { size: 9, color: ink, maxWidth: 300 });
  }

  // Footer
  const footerY = PAGE_H - 96;
  doc.line(MARGIN, footerY, right, footerY);
  doc.text(
    'This is a computer-generated payment receipt issued after server-side payment verification.',
    MARGIN,
    footerY + 18,
    { size: 8, color: muted, maxWidth: 500 }
  );
  doc.text(
    `For queries contact ${d.salonName || 'the salon'}${d.salonPhone ? ` at ${d.salonPhone}` : ''}.`,
    MARGIN,
    footerY + 32,
    { size: 8, color: muted, maxWidth: 500 }
  );
  doc.text(`Receipt ID: ${d.receiptId || ''}`, MARGIN, footerY + 46, { size: 8, color: muted });
  doc.text('Powered by BeautyZone', right, footerY + 46, { size: 8, color: accent, align: 'right' });

  return doc.build();
}
