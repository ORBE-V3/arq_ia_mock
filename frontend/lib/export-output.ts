import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { strToU8, zipSync } from 'fflate';

export type OutputFormat = 'Chat' | 'PDF' | 'XLSX' | 'DOCX' | 'EML';
export const outputFormats: { id: OutputFormat; label: string; ext: string }[] = [
  { id: 'Chat', label: 'Resposta no chat', ext: '' },
  { id: 'PDF', label: 'PDF', ext: 'pdf' },
  { id: 'DOCX', label: 'Word', ext: 'docx' },
  { id: 'XLSX', label: 'Planilha', ext: 'xlsx' },
  { id: 'EML', label: 'E-mail', ext: 'eml' },
];

export type OutputPayload = {
  title: string;
  body: string;
  sources: string[];
  project: string;
  agent: string;
  author: string;
  date: string;
  // Letterhead; null = no template.
  template: { name: string; kind: string; company: string } | null;
  // EML only: base64 PNG rendered inline in the body, and the recipient.
  image?: string;
  to?: string;
};

const slug = (text: string) => text.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 50) || 'entrega';
export const fileName = (p: OutputPayload, format: OutputFormat) => `${slug(p.title)}.${outputFormats.find((f) => f.id === format)?.ext}`;
const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const letterhead = (p: OutputPayload) => (p.template ? `${p.template.company} · ${p.template.name}` : p.project);

function pdf(p: OutputPayload) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const width = 210 - 40;
  if (p.template) {
    doc.setFillColor(18, 102, 79);
    doc.rect(0, 0, 210, 14, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text(letterhead(p), 20, 9);
  }
  doc.setTextColor(25, 53, 45);
  doc.setFont('times', 'normal');
  doc.setFontSize(18);
  doc.text(doc.splitTextToSize(p.title, width), 20, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 128, 120);
  doc.text(`${p.project} · ${p.agent} · ${p.author} · ${p.date}`, 20, 40);
  doc.setFontSize(11);
  doc.setTextColor(25, 53, 45);
  let y = 50;
  for (const line of doc.splitTextToSize(p.body, width) as string[]) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line, 20, y);
    y += 6;
  }
  if (p.sources.length) {
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(110, 128, 120);
    doc.text('Fontes', 20, y);
    p.sources.forEach((source, i) => doc.text(`${i + 1}. ${source}`, 20, (y += 5)));
  }
  doc.setFontSize(8);
  doc.text(`${letterhead(p)} · gerado pelo ARQ.AI · revisão humana recomendada`, 20, 288);
  return doc.output('blob');
}

function xlsx(p: OutputPayload) {
  const wb = XLSX.utils.book_new();
  const rows = [[letterhead(p)], [p.title], [], ['Campo', 'Valor'], ['Projeto', p.project], ['Agente', p.agent], ['Autor', p.author], ['Data', p.date], [], ['Conteúdo'], ...p.body.split(/\n+/).map((line) => [line])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Entrega');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['#', 'Fonte'], ...p.sources.map((s, i) => [i + 1, s])]), 'Fontes');
  return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ponytail: hand-rolled minimal OOXML (paragraphs only); use the `docx` package if tables/styles are needed.
function docx(p: OutputPayload) {
  const para = (text: string, opts = '') => `<w:p><w:pPr>${opts}</w:pPr><w:r>${opts.includes('Title') ? '<w:rPr><w:sz w:val="36"/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  const body = [
    p.template ? para(letterhead(p), '<w:jc w:val="right"/>') : '',
    para(p.title, '<w:pStyle w:val="Title"/>'),
    para(`${p.project} · ${p.agent} · ${p.author} · ${p.date}`),
    ...p.body.split(/\n+/).map((line) => para(line)),
    ...(p.sources.length ? [para('Fontes'), ...p.sources.map((s, i) => para(`${i + 1}. ${s}`))] : []),
  ].join('');
  const files = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`),
  };
  return new Blob([zipSync(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function eml(p: OutputPayload) {
  const html = `<div style="font-family:Georgia,serif;color:#19352d">${p.template ? `<div style="background:#12664f;color:#fff;padding:10px 16px;font-family:Arial;font-size:12px">${esc(letterhead(p))}</div>` : ''}<h2>${esc(p.title)}</h2>${p.image ? '<img src="cid:dashboard" alt="Dashboard" style="max-width:100%;border:1px solid #ddd;border-radius:8px"/>' : ''}${p.body.split(/\n+/).map((line) => `<p>${esc(line)}</p>`).join('')}${p.sources.length ? `<p style="font-size:12px;color:#6e8078">Fontes: ${p.sources.map(esc).join(' · ')}</p>` : ''}<p style="font-size:12px;color:#6e8078">${esc(p.author)} · ${esc(p.project)}</p></div>`;
  const subject = `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(p.title)))}?=`;
  const head = ['X-Unsent: 1', `From: ${p.author} <>`, `To: ${p.to ?? ''}`, `Subject: ${subject}`, 'MIME-Version: 1.0'];
  // With an image: multipart/related so the PNG renders inline in the body (cid:), not as an attachment.
  const text = p.image
    ? [...head, 'Content-Type: multipart/related; boundary="arqai"', '', '--arqai', 'Content-Type: text/html; charset=UTF-8', '', html, '--arqai', 'Content-Type: image/png', 'Content-Transfer-Encoding: base64', 'Content-ID: <dashboard>', 'Content-Disposition: inline; filename="dashboard.png"', '', ...(p.image.match(/.{1,76}/g) ?? []), '--arqai--'].join('\r\n')
    : [...head, 'Content-Type: text/html; charset=UTF-8', '', html].join('\r\n');
  return new Blob([text], { type: 'message/rfc822' });
}

export function downloadOutput(p: OutputPayload, format: OutputFormat) {
  const blob = format === 'PDF' ? pdf(p) : format === 'XLSX' ? xlsx(p) : format === 'DOCX' ? docx(p) : eml(p);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName(p, format);
  link.click();
  URL.revokeObjectURL(url);
}
