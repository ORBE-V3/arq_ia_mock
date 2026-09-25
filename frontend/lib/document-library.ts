import type { DocumentRecord } from '@/types';

export const documentTypes: Record<string, string[]> = {
  'Planta': ['Planta baixa', 'Implantação', 'Corte', 'Fachada', 'Detalhamento', 'As built'],
  'Memorial Descritivo': ['Arquitetônico', 'Estrutural', 'Instalações', 'Acabamentos'],
  'Contrato': ['Prestação de serviços', 'Aditivo', 'Proposta comercial'],
  'ART/RRT': ['RRT de projeto', 'RRT de execução', 'ART', 'Comprovante de registro'],
  'Licença': ['Alvará de construção', 'Licença ambiental', 'Habite-se'],
  'Documento do cliente': ['Identificação', 'Comprovante', 'Briefing', 'Autorização'],
  'Orçamento': ['Planilha de custos', 'Cotação', 'Quantitativos', 'Composição de custos'],
  'Projeto aprovado': ['Prefeitura', 'Condomínio', 'Corpo de Bombeiros'],
  'Documento municipal': ['Cadastro imobiliário', 'Certidão', 'Consulta prévia'],
  'Nota fiscal': ['Serviços', 'Materiais'],
  'Referência técnica': ['Norma', 'Manual', 'Padrão do escritório'],
  'Outros': ['Ata', 'Correspondência', 'Fotografia', 'Outros'],
};
export const acceptedDocuments = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.ifc,.dwg,.bin';
export const maxFileSize = 20 * 1024 * 1024;
export type UploadDraft = { id: string; file: File; category: string; subtype: string };
export function makeDraft(file: File): UploadDraft {
  const name = file.name.toLowerCase();
  const category = name.includes('memorial') ? 'Memorial Descritivo' : /planta|corte|fachada/.test(name) ? 'Planta' : /rrt|art[_.-]/.test(name) ? 'ART/RRT' : name.includes('contrato') ? 'Contrato' : /orçamento|orcamento|custo/.test(name) ? 'Orçamento' : 'Outros';
  return { id: crypto.randomUUID(), file, category, subtype: '' };
}
export function fileSize(size?: number) {
  if (size === undefined) return 'Arquivo demonstrativo';
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Original files live outside sessionStorage to preserve their bytes and avoid its size limit.
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('arq-document-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível abrir o armazenamento local.'));
  });
}
export async function persistDocuments(entries: { record: DocumentRecord; file: Blob }[]) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('files', 'readwrite');
      entries.forEach(({ record, file }) => transaction.objectStore('files').put({ id: record.id, record, file }));
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error('Não foi possível salvar os arquivos. Verifique o espaço disponível no navegador.'));
      transaction.onerror = () => reject(new Error('Falha no armazenamento dos arquivos.'));
    });
  } finally { db.close(); }
}
export async function storedDocuments(): Promise<DocumentRecord[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').getAll();
      request.onsuccess = () => resolve(request.result.map((entry) => entry.record));
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function documentFile(id: string): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(id);
      request.onsuccess = () => resolve(request.result?.file);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
