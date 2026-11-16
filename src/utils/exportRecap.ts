import { PreOrder } from '../types/order';

function formatDateFr(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getDateStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function exportOrdersToCsv(orders: PreOrder[]): void {
  const headers = [
    "Nom de l'enfant",
    "Prénom de l'enfant",
    'Adresse e-mail du parent',
    'Nombre de pains au chocolat',
    'Montant total dû (€)',
    'Statut du paiement',
    'Statut de remise',
    'Date de précommande',
  ];

  const rows = orders.map((order) => [
    order.childLastName,
    order.childFirstName,
    order.parentEmail,
    order.quantity,
    order.totalAmount.toFixed(2).replace('.', ','),
    order.paymentStatus === 'paid' ? 'Réglée' : 'En attente',
    order.distributed ? 'Remise' : 'À remettre',
    formatDateFr(order.createdAt),
  ]);

  const totalPastries = orders.reduce((acc, o) => acc + o.quantity, 0);
  const totalAmount = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const paidAmount = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const totalRow = [
    'TOTAL GÉNÉRAL',
    `${orders.length} commande(s)`,
    '',
    totalPastries,
    totalAmount.toFixed(2).replace('.', ','),
    `Encaissé : ${paidAmount.toFixed(2).replace('.', ',')} €`,
    '',
    '',
  ];

  const csvContent =
    '\uFEFF' +
    [headers, ...rows, totalRow]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(';'))
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, `recapitulatif-pains-au-chocolat-${getDateStamp()}.csv`);
}

// WinAnsi character mapping for standard PDF Helvetica fonts
const WIN_ANSI_EXTENDED: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  '„': 0x84,
  '…': 0x85,
  '–': 0x96,
  '—': 0x97,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  'œ': 0x9c,
  'Œ': 0x8c,
};

function encodePdfWinAnsi(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (ch === '\\' || ch === '(' || ch === ')') {
      out += '\\' + ch;
    } else if (code >= 32 && code <= 126) {
      out += ch;
    } else if (code >= 160 && code <= 255) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else if (WIN_ANSI_EXTENDED[ch] !== undefined) {
      out += '\\' + WIN_ANSI_EXTENDED[ch].toString(8).padStart(3, '0');
    } else {
      out += ' ';
    }
  }
  return out;
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)) + '…';
}

export function exportOrdersToPdf(orders: PreOrder[]): void {
  const totalPastries = orders.reduce((acc, o) => acc + o.quantity, 0);
  const totalAmount = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const paidAmount = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const pendingAmount = totalAmount - paidAmount;

  const exportDate = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  // A4 Portrait: 595 x 842 pt
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const pageStreams: string[] = [];
  let commands: string[] = [];

  const addText = (
    x: number,
    y: number,
    text: string,
    font: 'F1' | 'F2' = 'F1',
    size = 10,
    rgb: [number, number, number] = [0.11, 0.1, 0.09]
  ) => {
    commands.push(
      `BT /${font} ${size} Tf ${rgb[0]} ${rgb[1]} ${rgb[2]} rg 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(
        1
      )} Tm (${encodePdfWinAnsi(text)}) Tj ET`
    );
  };

  const addLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width = 0.6,
    rgb: [number, number, number] = [0.88, 0.86, 0.84]
  ) => {
    commands.push(
      `${width} w ${rgb[0]} ${rgb[1]} ${rgb[2]} RG ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(
        1
      )} ${y2.toFixed(1)} l S`
    );
  };

  const addRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    rgb: [number, number, number]
  ) => {
    commands.push(
      `${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(
        1
      )} re f`
    );
  };

  const drawTableHeader = (yPos: number) => {
    addRect(margin, yPos - 6, contentWidth, 22, [0.96, 0.95, 0.93]);
    addText(margin + 6, yPos + 1, 'Enfant', 'F2', 9, [0.27, 0.25, 0.24]);
    addText(margin + 150, yPos + 1, 'E-mail du parent', 'F2', 9, [0.27, 0.25, 0.24]);
    addText(margin + 340, yPos + 1, 'Qté', 'F2', 9, [0.27, 0.25, 0.24]);
    addText(margin + 382, yPos + 1, 'Montant dû', 'F2', 9, [0.27, 0.25, 0.24]);
    addText(margin + 452, yPos + 1, 'Paiement', 'F2', 9, [0.27, 0.25, 0.24]);
    addLine(margin, yPos - 6, margin + contentWidth, yPos - 6, 0.8, [0.8, 0.78, 0.75]);
  };

  // Page 1 header
  addText(margin, pageHeight - 48, "La Fournée de l'École — Récapitulatif des précommandes", 'F2', 16, [
    0.11,
    0.1,
    0.09,
  ]);
  addText(
    margin,
    pageHeight - 66,
    `Exporté le ${exportDate} · Tarif unitaire : 1 € · Projets et sorties scolaires`,
    'F1',
    9.5,
    [0.42, 0.39, 0.37]
  );

  // Summary banner
  addRect(margin, pageHeight - 134, contentWidth, 54, [0.99, 0.96, 0.89]);
  addLine(margin, pageHeight - 80, margin + contentWidth, pageHeight - 80, 0.8, [0.92, 0.82, 0.62]);
  addLine(margin, pageHeight - 134, margin + contentWidth, pageHeight - 134, 0.8, [0.92, 0.82, 0.62]);

  addText(
    margin + 12,
    pageHeight - 100,
    `Total à commander : ${totalPastries} pain${totalPastries > 1 ? 's' : ''} au chocolat`,
    'F2',
    12,
    [0.57, 0.25, 0.05]
  );
  addText(
    margin + 12,
    pageHeight - 120,
    `Commandes : ${orders.length}   |   Total dû : ${totalAmount} €   |   Réglé : ${paidAmount} €   |   En attente : ${pendingAmount} €`,
    'F1',
    9.5,
    [0.27, 0.25, 0.24]
  );

  let y = pageHeight - 165;
  drawTableHeader(y);
  y -= 24;

  const rowHeight = 20;
  const minY = 64;

  if (orders.length === 0) {
    addText(margin + 6, y, 'Aucune précommande enregistrée pour le moment.', 'F1', 10, [
      0.45,
      0.42,
      0.4,
    ]);
  } else {
    orders.forEach((order, idx) => {
      if (y < minY) {
        pageStreams.push(commands.join('\n'));
        commands = [];
        y = pageHeight - 52;
        addText(
          margin,
          y + 18,
          "Récapitulatif des précommandes (suite)",
          'F2',
          11,
          [0.35, 0.32, 0.3]
        );
        y -= 10;
        drawTableHeader(y);
        y -= 24;
      }

      if (idx % 2 === 1) {
        addRect(margin, y - 5, contentWidth, rowHeight, [0.985, 0.98, 0.975]);
      }

      const childFull = truncateText(`${order.childLastName.toUpperCase()} ${order.childFirstName}`, 24);
      const emailText = truncateText(order.parentEmail, 34);
      const qtyText = String(order.quantity);
      const amountText = `${order.totalAmount} €`;
      const statusText = order.paymentStatus === 'paid' ? 'Réglée' : 'En attente';
      const statusColor: [number, number, number] =
        order.paymentStatus === 'paid' ? [0.08, 0.5, 0.24] : [0.7, 0.33, 0.04];

      addText(margin + 6, y + 1, childFull, 'F2', 9, [0.11, 0.1, 0.09]);
      addText(margin + 150, y + 1, emailText, 'F1', 8.8, [0.34, 0.32, 0.3]);
      addText(margin + 344, y + 1, qtyText, 'F2', 9, [0.11, 0.1, 0.09]);
      addText(margin + 386, y + 1, amountText, 'F1', 9, [0.11, 0.1, 0.09]);
      addText(margin + 452, y + 1, statusText, 'F2', 8.8, statusColor);

      addLine(margin, y - 5, margin + contentWidth, y - 5, 0.4, [0.91, 0.9, 0.89]);
      y -= rowHeight;
    });
  }

  pageStreams.push(commands.join('\n'));

  // Add footer page numbers to every page stream
  const totalPages = pageStreams.length;
  const finalizedStreams = pageStreams.map((stream, index) => {
    const footer = `BT /F1 8.5 Tf 0.48 0.45 0.43 rg 1 0 0 1 ${margin} 28 Tm (${encodePdfWinAnsi(
      `Opération Pains au Chocolat — Avant le 16 décembre · Page ${index + 1} / ${totalPages}`
    )}) Tj ET`;
    return `${stream}\n${footer}`;
  });

  // Assemble valid PDF 1.4 binary string
  const objects: string[] = [];
  // 1: Catalog, 2: Pages, 3: Font Helvetica, 4: Font Helvetica-Bold
  const pageObjectIds: number[] = [];
  const baseObjId = 5;

  finalizedStreams.forEach((_, idx) => {
    pageObjectIds.push(baseObjId + idx * 2);
  });

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${
      pageObjectIds.length
    } >>\nendobj\n`
  );
  objects.push(
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`
  );
  objects.push(
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`
  );

  finalizedStreams.forEach((streamContent, idx) => {
    const pageId = baseObjId + idx * 2;
    const contentId = pageId + 1;
    const streamBytes = new TextEncoder().encode(streamContent).length;
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${streamBytes} >>\nstream\n${streamContent}\nendstream\nendobj\n`
    );
  });

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;

  const pushChunk = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  pushChunk('%PDF-1.4\n');
  for (const obj of objects) {
    offsets.push(byteLength);
    pushChunk(obj);
  }

  const xrefOffset = byteLength;
  pushChunk(`xref\n0 ${objects.length + 1}\n`);
  pushChunk('0000000000 65535 f \n');
  for (let i = 1; i <= objects.length; i++) {
    pushChunk(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushChunk(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
  const pdfBuffer = new Uint8Array(totalBytes);
  let pos = 0;
  for (const c of chunks) {
    pdfBuffer.set(c, pos);
    pos += c.length;
  }

  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  triggerBlobDownload(blob, `recapitulatif-pains-au-chocolat-${getDateStamp()}.pdf`);
}
