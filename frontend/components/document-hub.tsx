'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Bot, Check, FileText, FolderOpen, History, LoaderCircle, MessageSquareText, Plus, Search, Send, SlidersHorizontal, UploadCloud, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDemo } from '@/hooks/use-demo';
import type { AgentExecution, DocumentRecord } from '@/types';
import { acceptedDocuments, documentFile, documentTypes, downloadBlob, fileSize, makeDraft, maxFileSize, persistDocuments, storedDocuments, type UploadDraft } from '@/lib/document-library';

type Agent = { id: string; name: string; description: string; prompt: string; output: string };
type View = 'library' | 'agents' | 'history';
const agents: Agent[] = [
  { id: 'assistant', name: 'Assistente documental', description: 'Converse com um arquivo ou cruze documentos de diferentes fontes.', prompt: 'Resuma os documentos selecionados, destacando dúvidas e próximos passos. Cite as fontes e não invente informações ausentes.', output: 'Resumo executivo' },
  { id: 'parecer', name: 'Parecer técnico', description: 'Estruture uma análise técnica para a revisão da equipe.', prompt: 'Prepare um parecer com objeto, documentos consultados, análise e pontos que exigem validação humana.', output: 'Parecer técnico' },
  { id: 'conformidade', name: 'Conformidade documental', description: 'Organize a conferência documental antes de uma entrega.', prompt: 'Monte um checklist a partir das fontes selecionadas. Diferencie evidências encontradas de requisitos a confirmar.', output: 'Checklist' },
  { id: 'memorial', name: 'Comparador de versões', description: 'Compare revisões e organize as diferenças para aprovação.', prompt: 'Compare as versões selecionadas e apresente alterações, divergências e fontes de cada observação.', output: 'Comparativo entre arquivos' },
];
const outputs = ['Resumo executivo', 'Parecer técnico', 'Checklist', 'Comparativo entre arquivos', 'Extração estruturada'];
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';

function Classification({ category, subtype, onChange }: { category: string; subtype: string; onChange: (category: string, subtype: string) => void }) {
  return <div className="dh-classification">
    <label>Tipo<select value={category} onChange={(event) => onChange(event.target.value, '')}>{Object.keys(documentTypes).map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Subtipo<select value={subtype} onChange={(event) => onChange(category, event.target.value)}><option value="">Escolher subtipo</option>{(documentTypes[category] || ['Outros']).map((item) => <option key={item}>{item}</option>)}</select></label>
  </div>;
}

function UploadQueue({ drafts, onChange, disabled = false }: { drafts: UploadDraft[]; onChange: (drafts: UploadDraft[]) => void; disabled?: boolean }) {
  const { notice } = useDemo();
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function add(files: FileList | null) {
    if (!files || disabled) return;
    const next = [...drafts];
    const errors: string[] = [];
    Array.from(files).forEach((file) => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedDocuments.split(',').includes(extension)) errors.push(`${file.name}: formato não suportado`);
      else if (!file.size || file.size > maxFileSize) errors.push(`${file.name}: envie um arquivo entre 1 byte e 20 MB`);
      else if (next.length >= 30) errors.push('Máximo de 30 arquivos por envio');
      else if (!next.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) next.push(makeDraft(file));
    });
    onChange(next);
    if (errors.length) notice(errors.slice(0, 2).join(' · '));
  }
  return <fieldset className="dh-upload-queue" disabled={disabled}>
    <div className={`dh-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); add(event.dataTransfer.files); }}>
      <UploadCloud size={25} /><strong>Arraste seus arquivos para cá</strong><span>ou escolha no seu computador</span>
      <button className="btn" type="button" onClick={() => input.current?.click()}><Plus size={14} />Selecionar arquivos</button>
      <small>PDF, Office, imagens, texto, BIM (IFC, RVT) e DWG · até 20 MB por arquivo</small>
      <input ref={input} hidden type="file" multiple accept={acceptedDocuments} onChange={(event) => { add(event.target.files); event.target.value = ''; }} />
    </div>
    {drafts.length > 0 && <p className="dh-caption">Revise a classificação de cada arquivo. O formato do arquivo é independente do tipo documental.</p>}
    {drafts.map((draft) => <div className="dh-upload-item" key={draft.id}>
      <div className="dh-file-heading"><FileText size={18} /><div><strong>{draft.file.name}</strong><small>{fileSize(draft.file.size)}</small></div><button className="dh-icon" type="button" aria-label={`Remover ${draft.file.name}`} onClick={() => onChange(drafts.filter((item) => item.id !== draft.id))}><X size={16} /></button></div>
      <Classification category={draft.category} subtype={draft.subtype} onChange={(category, subtype) => onChange(drafts.map((item) => item.id === draft.id ? { ...item, category, subtype } : item))} />
    </div>)}
  </fieldset>;
}

export function DocumentHub({ projectId = '', initialView = 'library' }: { projectId?: string; initialView?: View }) {
  const { projects, documents, agentRuns, agentFeedback, update, notice, ready } = useDemo();
  const [view, setView] = useState<View>(initialView);
  const [scope, setScope] = useState(projectId || 'all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [subtype, setSubtype] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [destination, setDestination] = useState(projectId);
  const [afterUpload, setAfterUpload] = useState('library');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<DocumentRecord | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent>(agents[0]);
  const [runIds, setRunIds] = useState<string[]>([]);
  const [historyResult, setHistoryResult] = useState<AgentExecution | null>(null);
  const [customAgents, setCustomAgents] = useState<Agent[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const allAgents = [...agents, ...customAgents];

  useEffect(() => { setView(initialView); }, [initialView]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    storedDocuments().then((records) => {
      if (!cancelled) update((state) => ({ ...state, documents: [...records, ...state.documents.filter((doc) => !records.some((item) => item.id === doc.id))] }));
    }).catch(() => { if (!cancelled) notice('Armazenamento local indisponível. O envio e download podem não funcionar neste navegador.'); });
    try { const saved = sessionStorage.getItem('arq-library-agents'); if (saved) setCustomAgents(JSON.parse(saved)); } catch { /* Keep the built-in catalog if session storage is unavailable. */ }
    return () => { cancelled = true; };
  }, [ready, update, notice]);

  const scopedDocs = documents.filter((doc) => scope === 'all' || doc.projectId === (scope === 'general' ? '' : scope));
  const filtered = scopedDocs.filter((doc) => (category === 'all' || doc.category === category) && (subtype === 'all' || doc.subtype === subtype) && `${doc.name} ${doc.category} ${doc.subtype || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const history = agentRuns.filter((run) => scope === 'all' || run.projectId === (scope === 'general' ? '' : scope));
  const feedback = agentFeedback.filter((item) => scope === 'all' || item.projectId === (scope === 'general' ? '' : scope));
  const destinationName = (id: string) => projects.find((project) => project.id === id)?.name || (id ? 'Projeto indisponível' : 'Biblioteca geral');

  function launch(agent: Agent, ids: string[] = selected) {
    setActiveAgent(agent); setRunIds(ids); setRunOpen(true);
  }
  function openUpload() {
    setDrafts([]); setDestination(projectId || (scope !== 'all' && scope !== 'general' ? scope : '')); setAfterUpload('library'); setUploadOpen(true);
  }
  async function saveUploads() {
    if (!drafts.length || drafts.some((item) => !item.subtype)) return;
    setBusy(true);
    try {
      const created = drafts.map((draft): DocumentRecord => ({ id: draft.id, name: draft.file.name, category: draft.category, subtype: draft.subtype, projectId: destination, date: new Date().toISOString().slice(0, 10), status: 'Disponível', confidence: 0, area: 0, localFile: true, size: draft.file.size, mimeType: draft.file.type }));
      await persistDocuments(created.map((record, index) => ({ record, file: drafts[index].file })));
      update((state) => ({ ...state, documents: [...created, ...state.documents] }));
      setUploadOpen(false); setDrafts([]); setScope(destination || 'general'); setSearch(''); setCategory('all'); setSubtype('all'); setSelected(created.map((doc) => doc.id)); setView('library');
      notice(`${created.length} arquivo(s) salvo(s) em ${destinationName(destination)}.`);
      if (afterUpload !== 'library') launch(allAgents.find((agent) => agent.id === afterUpload) || agents[0], created.map((doc) => doc.id));
    } catch (error) { notice(errorMessage(error)); } finally { setBusy(false); }
  }
  async function download(doc: DocumentRecord) {
    try {
      const file = await documentFile(doc.id);
      if (!file) { notice('Este registro demonstrativo não possui arquivo original. Envie um arquivo para testar o download.'); return; }
      downloadBlob(file, doc.name);
    } catch (error) { notice(errorMessage(error)); }
  }
  async function saveDetail() {
    if (!detail?.name.trim() || !detail.subtype) return;
    setBusy(true);
    try {
      if (detail.localFile) {
        const file = await documentFile(detail.id);
        if (!file) throw new Error('O arquivo original não está mais disponível neste navegador.');
        await persistDocuments([{ record: detail, file }]);
      }
      update((state) => ({ ...state, documents: state.documents.map((doc) => doc.id === detail.id ? detail : doc) }));
      setDetail(null); notice('Classificação atualizada.');
    } catch (error) { notice(errorMessage(error)); } finally { setBusy(false); }
  }

  return <div className="document-hub">
    <header className="dh-header"><div><span className="eyebrow">ARQDOCS / DOCUMENTOS & AGENTES</span><h1>{projectId ? 'Conhecimento do projeto' : 'Seu acervo. Mais possibilidades.'}</h1><p>Guarde, encontre e transforme documentos em trabalho pronto para revisar.</p></div><button className="btn primary" onClick={openUpload}><UploadCloud size={16} />Enviar documentos</button></header>
    <div className="dh-nav" aria-label="Seções de documentos">
      {([{ id: 'library', label: 'Biblioteca', icon: FolderOpen, count: scopedDocs.length }, { id: 'agents', label: 'Agentes', icon: Bot, count: allAgents.length }, { id: 'history', label: 'Atividades', icon: History, count: history.length }] as const).map((item) => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><item.icon size={16} />{item.label}<span>{item.count}</span></button>)}
      <span className="dh-local-label">Protótipo · arquivos neste navegador</span>
    </div>
    <div className="dh-layout">
      <aside className="dh-sidebar"><span className="dh-label">LOCALIZAÇÃO</span>
        {projectId ? <button className="active"><FolderOpen size={16} /><span>{destinationName(projectId)}</span></button> : <>
          <button className={scope === 'all' ? 'active' : ''} onClick={() => { setScope('all'); setSelected([]); }}><BookOpen size={16} />Todos os documentos<span>{documents.length}</span></button>
          <button className={scope === 'general' ? 'active' : ''} onClick={() => { setScope('general'); setSelected([]); }}><FolderOpen size={16} />Biblioteca geral<span>{documents.filter((doc) => !doc.projectId).length}</span></button>
          <label className="dh-label dh-project-filter">POR PROJETO<select aria-label="Filtrar biblioteca por projeto" value={scope === 'all' || scope === 'general' ? '' : scope} onChange={(event) => { setScope(event.target.value || 'all'); setSelected([]); }}><option value="">Escolher projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        </>}
        <div className="dh-sidebar-note"><MessageSquareText size={20} /><strong>Do arquivo à conversa</strong><p>Selecione documentos e pergunte, compare ou escolha um agente.</p><button className="dh-text-button" onClick={() => launch(agents[0])}>Abrir assistente <ArrowRight size={14} /></button></div>
      </aside>
      <main className="dh-main">
        {view === 'library' && <>
          <div className="dh-section-head"><div><h2>{scope === 'all' ? 'Todos os documentos' : destinationName(scope === 'general' ? '' : scope)}</h2><p>{filtered.length} documento(s) · organize uma vez, use quando precisar</p></div><button className="btn" onClick={() => launch(agents[0])}><MessageSquareText size={15} />Interagir com documentos</button></div>
          <div className="dh-filters"><label className="dh-search"><Search size={16} /><input aria-label="Buscar documento" placeholder="Buscar por nome, tipo ou subtipo..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Filtrar por tipo" value={category} onChange={(event) => { setCategory(event.target.value); setSubtype('all'); }}><option value="all">Todos os tipos</option>{Object.keys(documentTypes).map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filtrar por subtipo" value={subtype} onChange={(event) => setSubtype(event.target.value)}><option value="all">Todos os subtipos</option>{(category === 'all' ? [...new Set(Object.values(documentTypes).flat())] : documentTypes[category] || []).map((item) => <option key={item}>{item}</option>)}</select></div>
          {selected.length > 0 && <div className="dh-selection"><strong>{selected.length} selecionado(s)</strong><button onClick={() => launch(agents[0])}><MessageSquareText size={14} />Conversar</button><button onClick={() => { setView('agents'); }}><Bot size={14} />Usar com agente</button><button onClick={() => setSelected([])} aria-label="Limpar seleção"><X size={15} /></button></div>}
          <div className="dh-table-scroll"><table className="dh-table"><thead><tr><th><input type="checkbox" aria-label="Selecionar todos os documentos filtrados" checked={filtered.length > 0 && filtered.every((doc) => selected.includes(doc.id))} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...filtered.map((doc) => doc.id)])] : selected.filter((id) => !filtered.some((doc) => doc.id === id)))} /></th><th>Documento</th><th>Tipo / subtipo</th><th>Localização</th><th>Adicionado</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{filtered.map((doc) => <tr key={doc.id} className={selected.includes(doc.id) ? 'is-selected' : ''}>
            <td><input type="checkbox" aria-label={`Selecionar ${doc.name}`} checked={selected.includes(doc.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, doc.id] : selected.filter((id) => id !== doc.id))} /></td>
            <td><button className="dh-document-name" onClick={() => setDetail({ ...doc })}><span className="dh-file-icon"><FileText size={20} /></span><span><strong>{doc.name}</strong><small>{fileSize(doc.size)}{doc.localFile ? ' · original salvo' : ''}</small></span></button></td>
            <td><span className="dh-type">{doc.category}</span><small>{doc.subtype || 'Subtipo não definido'}</small></td><td><span className="dh-location">{destinationName(doc.projectId)}</span></td><td>{new Date(doc.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td><div className="dh-row-actions"><button className="dh-icon" title="Interagir com documento" aria-label={`Interagir com ${doc.name}`} onClick={() => launch(agents[0], [doc.id])}><MessageSquareText size={16} /></button><button className="dh-icon" title={doc.localFile ? 'Baixar original' : 'Registro demonstrativo sem arquivo original'} disabled={!doc.localFile} aria-label={`Baixar ${doc.name}`} onClick={() => download(doc)}><ArrowDownToLine size={16} /></button><button className="dh-icon" title="Editar classificação" aria-label={`Editar ${doc.name}`} onClick={() => setDetail({ ...doc })}><SlidersHorizontal size={15} /></button></div></td>
          </tr>)}</tbody></table></div>
          {!filtered.length && <div className="dh-empty"><FolderOpen size={32} /><h3>{scopedDocs.length ? 'Nenhum documento encontrado' : 'Um lugar para seus documentos'}</h3><p>{scopedDocs.length ? 'Ajuste a busca ou os filtros para encontrar seus arquivos.' : 'Envie o primeiro arquivo, escolha tipo e subtipo e use com seus agentes.'}</p><button className="btn" onClick={scopedDocs.length ? () => { setSearch(''); setCategory('all'); setSubtype('all'); } : openUpload}>{scopedDocs.length ? 'Limpar filtros' : 'Enviar documentos'}</button></div>}
          <p className="dh-caption">Arquivos enviados são armazenados neste navegador. Registros de exemplo não contêm arquivos originais.</p>
        </>}
        {view === 'agents' && <>
          <div className="dh-section-head"><div><h2>Um agente para cada entrega</h2><p>Use documentos da biblioteca, uploads externos ou combine as duas fontes.</p></div><button className="btn" onClick={() => setCreateOpen(true)}><Plus size={15} />Criar agente</button></div>
          {selected.length > 0 && <div className="dh-selection"><Check size={16} /><strong>{selected.length} documento(s) da biblioteca serão levados à execução.</strong><button onClick={() => setSelected([])}>Limpar</button></div>}
          <div className="dh-agent-grid">{allAgents.map((agent, index) => <article className="dh-agent-card" key={agent.id}><div className="dh-agent-top"><span className="dh-file-icon"><Bot size={22} /></span><small>{index < agents.length ? 'DO ESCRITÓRIO' : 'PERSONALIZADO'}</small></div><h3>{agent.name}</h3><p>{agent.description}</p><span className="dh-agent-delivery">{agent.output}</span><button onClick={() => launch(agent)}>Usar agente <ArrowRight size={17} /></button></article>)}</div>
          <div className="dh-explainer"><BookOpen size={22} /><div><strong>Você escolhe o que o agente pode consultar</strong><p>Confira a lista de fontes antes de executar. Uploads podem ficar só na conversa ou ser salvos na biblioteca.</p></div></div>
        </>}
        {view === 'history' && <>
          <div className="dh-section-head"><div><h2>Entregas e avaliações</h2><p>{history.length} execução(ões) · {feedback.length} avaliação(ões) registradas para revisão da equipe</p></div></div>
          {history.length ? history.map((run) => <button className="dh-history-row" key={run.id} onClick={() => setHistoryResult(run)}><span className="dh-file-icon"><History size={18} /></span><span><strong>{run.agentName}</strong><small>{run.date.replace('T', ' ').slice(0, 16)} · {destinationName(run.projectId)} · {run.sourceNames?.length ?? run.documentIds.length} fonte(s)</small></span><span className="dh-type">{run.feedback || run.status}</span><ArrowRight size={16} /></button>) : <div className="dh-empty"><History size={32} /><h3>Suas entregas ficam aqui</h3><p>Ao conversar com documentos ou executar um agente, o resultado e as fontes ficam registrados.</p><button className="btn" onClick={() => setView('agents')}>Explorar agentes</button></div>}
        </>}
      </main>
    </div>

    <Dialog open={uploadOpen} onOpenChange={(open) => { if (!busy) setUploadOpen(open); }}><DialogContent className="dh-modal dh-upload-modal"><DialogHeader><DialogTitle>Adicionar à biblioteca</DialogTitle><DialogDescription>Escolha os arquivos, classifique e decida o próximo passo.</DialogDescription></DialogHeader>
      <fieldset disabled={busy} className="dh-form"><label>Salvar em<select value={destination} disabled={!!projectId} onChange={(event) => setDestination(event.target.value)}><option value="">Biblioteca geral · sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <UploadQueue drafts={drafts} onChange={setDrafts} disabled={busy} />
      <label>Depois do upload<select value={afterUpload} onChange={(event) => setAfterUpload(event.target.value)}><option value="library">Somente guardar na biblioteca</option>{allAgents.map((agent) => <option key={agent.id} value={agent.id}>Usar com {agent.name}</option>)}</select></label></fieldset>
      <div className="dh-modal-footer"><small>{drafts.length} arquivo(s) · escolha o subtipo de cada um</small><button className="btn primary" disabled={busy || !drafts.length || drafts.some((item) => !item.subtype)} onClick={saveUploads}>{busy ? <LoaderCircle size={15} className="spin" /> : <UploadCloud size={15} />}{busy ? 'Salvando arquivos' : afterUpload === 'library' ? 'Salvar documentos' : 'Salvar e abrir agente'}</button></div>
    </DialogContent></Dialog>

    <Dialog open={!!detail} onOpenChange={(open) => { if (!open && !busy) setDetail(null); }}><DialogContent className="dh-modal dh-detail-modal"><DialogHeader><DialogTitle>Detalhes do documento</DialogTitle><DialogDescription>Consulte a localização e ajuste a classificação do arquivo.</DialogDescription></DialogHeader>{detail && <><div className="dh-file-heading"><FileText size={28} /><div><strong>{detail.name}</strong><small>{fileSize(detail.size)} · {destinationName(detail.projectId)}</small></div></div><fieldset disabled={busy} className="dh-form"><Classification category={documentTypes[detail.category] ? detail.category : 'Outros'} subtype={detail.subtype || ''} onChange={(category, subtype) => setDetail({ ...detail, category, subtype })} /></fieldset><p className="dh-caption">{detail.localFile ? 'O download mantém o conteúdo e o formato do arquivo original.' : 'Documento de demonstração. Não há arquivo original disponível para visualização ou download.'}</p><div className="dh-modal-footer"><button className="btn" disabled={!detail.localFile || busy} onClick={() => download(detail)}><ArrowDownToLine size={15} />Baixar original</button><button className="btn primary" disabled={busy || !detail.subtype} onClick={saveDetail}>Salvar classificação</button></div></>}</DialogContent></Dialog>

    <Dialog open={runOpen} onOpenChange={setRunOpen}><DialogContent className="dh-modal dh-run-modal"><AgentSession key={`${activeAgent.id}-${runOpen}`} agent={activeAgent} initialIds={runIds} projectId={projectId || (scope === 'all' || scope === 'general' ? '' : scope)} /></DialogContent></Dialog>
    <Dialog open={!!historyResult} onOpenChange={(open) => { if (!open) setHistoryResult(null); }}><DialogContent className="dh-modal"><DialogHeader><DialogTitle>{historyResult?.agentName}</DialogTitle><DialogDescription>Registro da execução e fontes utilizadas.</DialogDescription></DialogHeader>{historyResult && <><p className="dh-caption">{historyResult.instruction || 'Instrução não registrada nesta execução anterior.'}</p><pre className="dh-output">{historyResult.result}</pre><button className="btn" onClick={() => downloadBlob(new Blob([historyResult.result], { type: 'text/plain;charset=utf-8' }), 'arqdocs-resultado.txt')}><ArrowDownToLine size={15} />Baixar resultado (.txt)</button><ResultFeedback run={historyResult} /></>}</DialogContent></Dialog>
    <CreateAgent open={createOpen} onOpenChange={setCreateOpen} onCreate={(agent) => { const next = [...customAgents, agent]; setCustomAgents(next); try { sessionStorage.setItem('arq-library-agents', JSON.stringify(next)); } catch { notice('Agente disponível nesta tela; não foi possível salvar na sessão.'); } }} />
  </div>;
}

function AgentSession({ agent, initialIds, projectId }: { agent: Agent; initialIds: string[]; projectId: string }) {
  const { projects, documents, templates, update, notice } = useDemo();
  const [sourceTab, setSourceTab] = useState<'internal' | 'external'>('internal');
  const [selected, setSelected] = useState(initialIds);
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [search, setSearch] = useState('');
  const [sourceScope, setSourceScope] = useState('all');
  const [destination, setDestination] = useState(projectId);
  const [saveExternal, setSaveExternal] = useState(true);
  const [instruction, setInstruction] = useState(agent.prompt);
  const [format, setFormat] = useState(agent.output);
  const [templateId, setTemplateId] = useState('');
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<AgentExecution | null>(null);
  const [error, setError] = useState('');
  const chosen = documents.filter((doc) => selected.includes(doc.id));
  const available = documents.filter((doc) => (sourceScope === 'all' || doc.projectId === (sourceScope === 'general' ? '' : sourceScope)) && `${doc.name} ${doc.category} ${doc.subtype || ''}`.toLowerCase().includes(search.toLowerCase()));
  const count = chosen.length + drafts.length;
  const availableTemplates = templates.filter((template) => template.kind === 'Empresa' || (destination && template.projectId === destination));
  function resetOutput() { setRun(null); setError(''); }

  async function execute(event: React.FormEvent) {
    event.preventDefault();
    if (!count || !instruction.trim() || drafts.some((draft) => !draft.subtype) || busy) return;
    setBusy(true); setError('');
    try {
      const uploaded: DocumentRecord[] = drafts.map((draft) => ({ id: draft.id, name: draft.file.name, projectId: destination, category: draft.category, subtype: draft.subtype, date: new Date().toISOString().slice(0, 10), status: 'Disponível', confidence: 0, area: 0, size: draft.file.size, mimeType: draft.file.type, localFile: true }));
      if (saveExternal && uploaded.length) {
        await persistDocuments(uploaded.map((record, index) => ({ record, file: drafts[index].file })));
        update((state) => ({ ...state, documents: [...uploaded, ...state.documents.filter((doc) => !uploaded.some((item) => item.id === doc.id))] }));
      }
      const sources = [...chosen, ...uploaded];
      const sourceNames = sources.map((source) => source.name);
      const result = [`${format} · demonstração`, '', `Solicitação: ${instruction.trim()}`, `Contexto: ${projects.find((project) => project.id === destination)?.name || 'Sem vínculo com projeto'}`, `Agente: ${agent.name}`, `Template: ${availableTemplates.find((item) => item.id === templateId)?.name || 'Sem template'}`, '', 'FONTES SELECIONADAS', ...sources.map((source, index) => `[${index + 1}] ${source.name} — ${source.category} / ${source.subtype || 'subtipo não informado'}`), '', 'ESTRUTURA DA ENTREGA', ...(format === 'Checklist' ? ['☐ Conferir o conteúdo e a validade de cada fonte.', '☐ Identificar requisitos aplicáveis ao objetivo informado.', '☐ Registrar evidências e encaminhar pendências para revisão.'] : format === 'Comparativo entre arquivos' ? ['1. Identificar a versão e a data de cada documento.', '2. Comparar alterações por tema, com referência às fontes.', '3. Separar mudanças confirmadas de informações ausentes.'] : format === 'Extração estruturada' ? ['Campo | Valor | Documento | Página | Validação', 'Os valores serão preenchidos após leitura real dos arquivos.'] : ['1. Objetivo e escopo da solicitação.', '2. Síntese fundamentada nas fontes selecionadas.', '3. Pontos de atenção e informações a confirmar.', '4. Recomendações para revisão da equipe.']), '', 'Demonstração: esta entrega mostra a estrutura e o contexto escolhidos. O conteúdo dos arquivos não foi analisado por IA; não há conclusões técnicas, citações de páginas ou confiança calculada.', ...(!saveExternal && uploaded.length ? ['Uploads usados apenas nesta execução: os arquivos não foram guardados na biblioteca.'] : [])].join('\n');
      const next: AgentExecution = { id: crypto.randomUUID(), projectId: destination, documentIds: [...selected, ...(saveExternal ? uploaded.map((doc) => doc.id) : [])], sourceNames, agentName: agent.name, date: new Date().toISOString(), user: 'Ana Martins', status: 'Concluído', result, outputFormat: format, templateId, instruction };
      update((state) => ({ ...state, agentRuns: [next, ...state.agentRuns] }));
      setRun(next);
      if (saveExternal && uploaded.length) { setSelected([...selected, ...uploaded.map((doc) => doc.id)]); setDrafts([]); }
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }

  return <><DialogHeader><DialogTitle><Bot size={21} />{agent.name}</DialogTitle><DialogDescription>Escolha suas fontes e diga o que precisa. A execução de IA é demonstrativa.</DialogDescription></DialogHeader>
    <div className="dh-session-grid">
      <section className="dh-sources"><div className="dh-section-head"><h3>Fontes da conversa</h3><span className="dh-type">{count} selecionada(s)</span></div>
        <div className="dh-source-tabs"><button disabled={busy} className={sourceTab === 'internal' ? 'active' : ''} onClick={() => setSourceTab('internal')}><FolderOpen size={15} />Docs internos</button><button disabled={busy} className={sourceTab === 'external' ? 'active' : ''} onClick={() => setSourceTab('external')}><UploadCloud size={15} />Externos (upload)</button></div>
        <fieldset disabled={busy} className="dh-source-controls">
          {sourceTab === 'internal' ? <><label className="dh-search"><Search size={15} /><input aria-label="Buscar fontes internas" placeholder="Buscar na biblioteca..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Origem dos documentos internos" value={sourceScope} onChange={(event) => setSourceScope(event.target.value)}><option value="all">Toda a biblioteca</option><option value="general">Biblioteca geral</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><div className="dh-source-list">{available.map((doc) => <label className={selected.includes(doc.id) ? 'selected' : ''} key={doc.id}><input type="checkbox" checked={selected.includes(doc.id)} onChange={(event) => { setSelected(event.target.checked ? [...selected, doc.id] : selected.filter((id) => id !== doc.id)); resetOutput(); }} /><FileText size={17} /><span><strong>{doc.name}</strong><small>{doc.category} · {doc.subtype || 'Sem subtipo'}</small></span></label>)}{!available.length && <p className="dh-caption">Nenhum documento aqui. Escolha outra origem ou use o upload externo.</p>}</div></> : <><UploadQueue drafts={drafts} onChange={(items) => { setDrafts(items); resetOutput(); }} disabled={busy} /><label className="dh-checkbox"><input type="checkbox" checked={saveExternal} onChange={(event) => { setSaveExternal(event.target.checked); resetOutput(); }} /><span><strong>Guardar uploads na biblioteca</strong><small>{saveExternal ? 'Serão salvos ao executar, no contexto escolhido ao lado.' : 'Usar somente nesta execução, sem guardar os arquivos.'}</small></span></label></>}
        </fieldset>
        <div className="dh-source-summary"><strong>Contexto selecionado</strong>{count ? <div>{chosen.map((doc) => <span key={doc.id} title={doc.name}>{doc.name}<button disabled={busy} aria-label={`Retirar ${doc.name}`} onClick={() => { setSelected(selected.filter((id) => id !== doc.id)); resetOutput(); }}><X size={12} /></button></span>)}{drafts.map((draft) => <span key={draft.id} title={draft.file.name}>{draft.file.name} · externo<button disabled={busy} aria-label={`Retirar ${draft.file.name}`} onClick={() => { setDrafts(drafts.filter((item) => item.id !== draft.id)); resetOutput(); }}><X size={12} /></button></span>)}</div> : <p>Adicione fontes para começar. Nenhum documento é incluído automaticamente.</p>}</div>
      </section>
      <section className="dh-conversation"><form onSubmit={execute}>
        <fieldset disabled={busy} className="dh-form">
          <label>Vincular esta entrega<select value={destination} onChange={(event) => { setDestination(event.target.value); setTemplateId(''); resetOutput(); }}><option value="">Sem projeto · biblioteca geral</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
          <div className="dh-classification"><label>Formato da entrega<select value={format} onChange={(event) => { setFormat(event.target.value); resetOutput(); }}>{outputs.map((item) => <option key={item}>{item}</option>)}</select></label><label>Template<select value={templateId} onChange={(event) => { setTemplateId(event.target.value); resetOutput(); }}><option value="">Sem template</option>{availableTemplates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></label></div>
          <label>O que você quer fazer com estes documentos?<textarea rows={5} value={instruction} onChange={(event) => { setInstruction(event.target.value); resetOutput(); }} placeholder="Ex.: compare o memorial com a planta e organize as divergências para revisão." /></label>
          <div className="dh-suggestions">{['Resumir os documentos', 'Comparar as versões', 'Organizar pontos para revisão'].map((text) => <button key={text} type="button" onClick={() => { setInstruction(text); resetOutput(); }}>{text}</button>)}</div>
        </fieldset>
        <div className="dh-run-action"><small>{!count ? 'Selecione ao menos uma fonte.' : drafts.some((item) => !item.subtype) ? 'Escolha o subtipo de cada upload.' : 'Fontes conferidas? Gere a prévia da entrega.'}</small><button className="btn primary" disabled={busy || !count || !instruction.trim() || drafts.some((item) => !item.subtype)} type="submit">{busy ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}{busy ? 'Preparando' : 'Executar demonstração'}</button></div>
        {error && <p className="dh-error" role="alert">{error}</p>}
      </form>
      {run ? <div className="dh-result" aria-live="polite"><span className="dh-label">ENTREGA · PRÉVIA DEMONSTRATIVA</span><pre className="dh-output">{run.result}</pre><button className="btn" onClick={() => downloadBlob(new Blob([run.result], { type: 'text/plain;charset=utf-8' }), 'arqdocs-resultado.txt')}><ArrowDownToLine size={15} />Baixar resultado (.txt)</button><p className="dh-caption">Salvo em Atividades com as fontes e instruções desta execução.</p><ResultFeedback run={run} /></div> : <div className="dh-result-placeholder"><MessageSquareText size={25} /><strong>Sua entrega começa pelas fontes</strong><p>Combine documentos internos e externos. O resultado, as fontes e sua avaliação ficarão juntos em Atividades.</p></div>}
      </section>
    </div>
  </>;
}

function ResultFeedback({ run }: { run: AgentExecution }) {
  const { agentFeedback, update, notice } = useDemo();
  const saved = agentFeedback.find((item) => item.runId === run.id);
  const [rating, setRating] = useState<'Útil' | 'Parcial' | 'Não útil' | ''>(saved?.rating || '');
  const [comment, setComment] = useState(saved?.comment || '');
  function save() {
    if (!rating) return;
    const feedback = { id: saved?.id || crypto.randomUUID(), runId: run.id, projectId: run.projectId, agentName: run.agentName, rating, comment: comment.trim(), date: new Date().toISOString(), user: 'Ana Martins' };
    update((state) => ({ ...state, agentFeedback: [feedback, ...state.agentFeedback.filter((item) => item.runId !== run.id)], agentRuns: state.agentRuns.map((item) => item.id === run.id ? { ...item, feedback: rating, feedbackComment: comment.trim() } : item) }));
    notice('Avaliação registrada para revisão da equipe.');
  }
  return <div className="dh-feedback"><strong>Esta entrega ajudou?</strong><p>Avaliações orientam a revisão da equipe; não treinam a IA automaticamente.</p><div>{(['Útil', 'Parcial', 'Não útil'] as const).map((item) => <button key={item} aria-pressed={rating === item} className={rating === item ? 'active' : ''} onClick={() => setRating(item)}>{item}</button>)}</div>{rating && <><textarea aria-label="Comentário sobre o resultado" placeholder="O que faltou? O que deveríamos corrigir?" value={comment} onChange={(event) => setComment(event.target.value)} rows={2} /><button className="btn" onClick={save}>{saved ? 'Atualizar avaliação' : 'Enviar avaliação'}</button></>}</div>;
}

function CreateAgent({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (agent: Agent) => void }) {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [output, setOutput] = useState(outputs[0]);
  const prompt = purpose.trim() ? `Você é ${name.trim() || 'um assistente documental'}.\n\nMissão: ${purpose.trim()}\n\nEntrega: ${output}.\nUse apenas as fontes selecionadas. Cite as evidências e informe lacunas. Não invente dados. Encaminhe conclusões para validação humana.` : 'Descreva a tarefa para visualizar a instrução do agente.';
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="dh-modal"><DialogHeader><DialogTitle>Criar agente</DialogTitle><DialogDescription>Descreva a tarefa em linguagem natural. Confira a instrução antes de salvar.</DialogDescription></DialogHeader><form className="dh-form" onSubmit={(event) => { event.preventDefault(); if (!name.trim() || !purpose.trim()) return; onCreate({ id: crypto.randomUUID(), name: name.trim(), description: purpose.trim(), prompt, output }); onOpenChange(false); setName(''); setPurpose(''); }}><label>Nome<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Revisor de memoriais" /></label><label>O que ele deve fazer?<textarea required rows={4} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label><label>Entrega<select value={output} onChange={(event) => setOutput(event.target.value)}>{outputs.map((item) => <option key={item}>{item}</option>)}</select></label><div className="dh-prompt"><span className="dh-label">INSTRUÇÃO DO AGENTE</span><pre>{prompt}</pre></div><p className="dh-caption">As fontes serão escolhidas em cada execução. Agente salvo nesta sessão de demonstração.</p><button className="btn primary" disabled={!name.trim() || !purpose.trim()}>Salvar agente</button></form></DialogContent></Dialog>;
}
