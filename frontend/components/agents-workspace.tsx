'use client';

import '@/app/agents.css';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUp, AtSign, Check, ChevronDown, Copy, Database, Download, FileSearch, FileText, Globe2, History, LoaderCircle, Paperclip, Plus, Search, ShieldCheck, Sparkles, Tag, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDemo } from '@/hooks/use-demo';
import { answerChat } from '@/services/chat';
import { categories } from '@/services/mock-data';
import { downloadOutput, fileName, outputFormats } from '@/lib/export-output';
import type { OutputFormat, OutputPayload } from '@/lib/export-output';
import type { AgentDef, ChatMessage, ChatThread, DocumentRecord, Project, ProjectTemplate, Role } from '@/types';

export const projectAgents: AgentDef[] = [
  { id: 'parecer', name: 'Parecer técnico', purpose: 'Cruza memorial, planta e RRT para preparar uma resposta fundamentada.', prompts: ['Prepare um parecer sobre a divergência de área', 'O projeto está pronto para protocolo?', 'Liste as evidências que sustentam a área final'], required: ['Memorial Descritivo', 'Planta'], outputs: ['Chat', 'PDF', 'DOCX', 'EML'] },
  { id: 'conformidade', name: 'Conformidade documental', purpose: 'Confere documentos obrigatórios e pendências antes da próxima etapa.', prompts: ['Quais documentos estão faltando?', 'O RRT está válido?', 'Monte o checklist de aprovação'], required: ['ART/RRT'], outputs: ['Chat', 'PDF', 'XLSX', 'EML'] },
  { id: 'extrator', name: 'Extrator de informações', purpose: 'Extrai áreas, nomes, datas e campos estruturados para o projeto.', prompts: ['Extraia o quadro de áreas', 'Quais datas e prazos aparecem nos contratos?', 'Resuma os responsáveis técnicos'], outputs: ['Chat', 'XLSX', 'DOCX'] },
];

const allFormats = outputFormats.map((f) => f.id);
const formatLabel = (id: OutputFormat) => outputFormats.find((f) => f.id === id)?.label ?? id;
export const templatesFor = (templates: ProjectTemplate[], scopeId: string) => templates.filter((t) => t.status === 'Ativo' && (t.kind === 'Empresa' || t.projectId === scopeId));
const COMPANY = 'Studio Arquitetura';

// A required category is satisfied by an attached doc of that category or the matching #tag.
export function missingRequired(agent: AgentDef, sources: string[], documents: DocumentRecord[]) {
  const have = new Set(sources.map((id) => (id.startsWith('tag:') ? id.slice(4) : documents.find((d) => d.id === id)?.category)));
  return (agent.required ?? []).filter((category) => !have.has(category));
}

export function useAgents() {
  const { customAgents } = useDemo();
  return [...projectAgents, ...customAgents];
}

// RBAC: minimum role per sensitive action.
type Action = 'promote' | 'audit' | 'access';
const rank: Record<Role, number> = { membro: 0, gestor: 1, admin: 2 };
const required: Record<Action, Role> = { promote: 'gestor', audit: 'admin', access: 'admin' };

export function usePermission(action: Action) {
  const { user } = useDemo();
  return rank[user.role] >= rank[required[action]];
}

export function Can({ action, children, fallback = null }: { action: Action; children: ReactNode; fallback?: ReactNode }) {
  return <>{usePermission(action) ? children : fallback}</>;
}

// Sources are doc ids or `tag:<Categoria>`.
export function sourceLabel(id: string, documents: DocumentRecord[]) {
  return id.startsWith('tag:') ? `#${id.slice(4)}` : documents.find((doc) => doc.id === id)?.name || id;
}

export function SourceIcon({ id, documents, size = 12 }: { id: string; documents: DocumentRecord[]; size?: number }) {
  if (id.startsWith('tag:')) return <Tag size={size} />;
  const kind = documents.find((doc) => doc.id === id)?.kind;
  return kind === 'external' ? <Database size={size} /> : kind === 'context' ? <Globe2 size={size} /> : <FileSearch size={size} />;
}

const initials = (name: string) => name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

export function RoleSwitcher() {
  const { user, update } = useDemo();
  return <label className="aw-role"><ShieldCheck size={13} /><span className="sr-only">Perfil de demonstração</span><select value={user.role} onChange={(event) => update((state) => ({ ...state, user: { ...state.user, role: event.target.value as Role } }))}><option value="membro">Membro</option><option value="gestor">Gestor</option><option value="admin">Admin</option></select></label>;
}

export function AgentsWorkspace({ project, initialThreadId, initialSources = [], initialAgentId }: { project?: Project; initialThreadId?: string; initialSources?: string[]; initialAgentId?: string }) {
  const { projects, documents, analyses, threads, user, update, notice } = useDemo();
  const agents = useAgents();
  const loaded = threads.find((thread) => thread.id === initialThreadId);
  const firstSourceProject = documents.find((doc) => doc.id === initialSources[0])?.projectId;
  const [scopeId, setScopeId] = useState(project?.id ?? loaded?.projectId ?? firstSourceProject ?? 'global');
  const scopeProject = projects.find((item) => item.id === scopeId);
  const [threadId, setThreadId] = useState(() => loaded?.id ?? `thread-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>(loaded?.messages ?? []);
  const [sources, setSources] = useState<string[]>(loaded?.sources ?? initialSources);
  const [agentId, setAgentId] = useState(initialAgentId ?? loaded?.messages.at(-1)?.agentId ?? projectAgents[0].id);
  const [input, setInput] = useState('');
  const [reading, setReading] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const agent = agents.find((item) => item.id === agentId) || agents[0];
  const busy = reading !== null;
  const { templates } = useDemo();
  const formats = agent.outputs?.length ? agent.outputs : allFormats;
  const [format, setFormat] = useState<OutputFormat>('Chat');
  const activeFormat = formats.includes(format) ? format : formats[0];
  const scopeTemplates = templatesFor(templates, scopeId);
  const [templateId, setTemplateId] = useState<string>('auto');
  // 'auto' = agent default, then the project's default template.
  const resolvedTemplate = templateId === 'none' ? undefined : scopeTemplates.find((t) => t.id === (templateId === 'auto' ? agent.templateId : templateId)) ?? (templateId === 'auto' ? scopeTemplates.find((t) => t.default) : undefined);
  const missing = missingRequired(agent, sources, documents);

  const visible = documents.filter((doc) => (scopeId === 'global' || doc.projectId === scopeId) && (doc.access !== 'Privado' || user.role === 'admin'));
  const suggestedContext = visible.filter((doc) => (doc.kind === 'context' || doc.kind === 'external') && !sources.includes(doc.id)).slice(0, 4);

  // Mention menu opens while the last word starts with @ or +.
  const mention = input.match(/(?:^|\s)[@+](\S*)$/);
  const options = (() => {
    if (!mention) return [];
    const q = mention[1].toLowerCase();
    const items = [
      ...visible.filter((doc) => doc.kind === 'external').map((doc) => ({ id: doc.id, group: 'Base externa' })),
      ...visible.filter((doc) => doc.kind === 'context').map((doc) => ({ id: doc.id, group: 'Contexto global' })),
      ...categories.map((item) => ({ id: `tag:${item}`, group: 'Disciplina' })),
      ...visible.filter((doc) => !doc.kind || doc.kind === 'file').map((doc) => ({ id: doc.id, group: 'ArqDocs' })),
    ];
    return items.filter((item) => !sources.includes(item.id) && sourceLabel(item.id, documents).toLowerCase().includes(q)).slice(0, 7);
  })();

  function pick(id: string) {
    setSources((current) => [...current, id]);
    setInput((current) => current.replace(/[@+]\S*$/, ''));
    setCursor(0);
    inputRef.current?.focus();
  }

  function save(next: ChatMessage[], nextSources = sources) {
    const thread: ChatThread = { id: threadId, projectId: scopeId, user: user.name, date: now(), title: next.find((m) => m.role === 'user')?.text.slice(0, 60) || 'Nova conversa', sources: nextSources, messages: next };
    update((state) => ({ ...state, threads: [thread, ...state.threads.filter((item) => item.id !== threadId)] }));
  }

  const scrollDown = () => requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }));

  async function send(value = input) {
    const text = value.trim();
    if (missing.length) { notice(`Anexe ${missing.join(' e ')} para usar ${agent.name}.`); return; }
    if (!text || busy) return;
    const withUser = [...messages, { role: 'user' as const, text, agentId, at: now() }];
    setMessages(withUser);
    setInput('');
    scrollDown();
    // ponytail: simulated retrieval steps; swap for the real RAG stream when the backend exists.
    for (let step = 0; step <= Math.min(sources.length, 4); step++) {
      setReading(step);
      await new Promise((resolve) => setTimeout(resolve, 420));
    }
    const next = [...withUser, { role: 'assistant' as const, text: answerChat(text, projects, documents, analyses), agentId, at: now(), sources, format: activeFormat, templateId: resolvedTemplate?.id }];
    setMessages(next);
    setReading(null);
    save(next);
    scrollDown();
  }

  function promote(index: number) {
    const message = messages[index];
    const doc: DocumentRecord = { id: `context-${Date.now()}`, name: `Contexto validado · ${message.text.slice(0, 44)}…`, category: 'Contexto global', projectId: scopeId, date: now().slice(0, 10), status: 'Validado', confidence: 100, area: 0, kind: 'context', access: 'Global' };
    const next = messages.map((item, i) => (i === index ? { ...item, promoted: true } : item));
    update((state) => ({ ...state, documents: [doc, ...state.documents] }));
    setMessages(next);
    save(next);
    notice('Resposta promovida a contexto global do projeto.');
  }

  function newThread(nextScope = scopeId) {
    setScopeId(nextScope);
    setThreadId(`thread-${Date.now()}`);
    setMessages([]);
    setSources([]);
  }

  function onKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (options.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setCursor((current) => (current + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length);
    } else if (event.key === 'Escape') {
      setInput((current) => current.replace(/[@+]\S*$/, ''));
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (options.length) pick(options[Math.min(cursor, options.length - 1)].id);
      else void send();
    }
  }

  const scopeName = scopeProject?.name ?? 'toda a organização';

  // Attach the first visible doc of a required category, else fall back to the #tag.
  function attachRequired(category: string) {
    const doc = visible.find((d) => d.category === category && !sources.includes(d.id));
    setSources((current) => [...current, doc?.id ?? `tag:${category}`]);
  }

  function payloadFor(message: ChatMessage, index: number): OutputPayload {
    const template = templates.find((t) => t.id === message.templateId);
    const question = messages.slice(0, index).reverse().find((m) => m.role === 'user')?.text ?? 'Entrega';
    return { title: question.slice(0, 90), body: message.text, sources: (message.sources ?? []).map((id) => sourceLabel(id, documents)), project: scopeProject?.name ?? 'Organização', agent: agents.find((a) => a.id === message.agentId)?.name ?? '', author: user.name, date: message.at ?? now(), template: template ? { name: template.name, kind: template.kind, company: COMPANY } : null };
  }

  return <section className="aw" aria-label="Workspace de agentes">
    <header className="aw-head">
      <AgentPicker agents={agents} value={agent.id} onChange={setAgentId} />
      <div className="aw-head-tools">
        {!project && <label className="aw-scope"><span className="sr-only">Projeto</span><select value={scopeId} onChange={(event) => newThread(event.target.value)}><option value="global">Toda a organização</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <RoleSwitcher />
        <button className="aw-ghost" type="button" onClick={() => newThread()}><Plus size={14} />Nova conversa</button>
      </div>
    </header>

    <div className="aw-body">
      <div className="aw-canvas">
        <div className="aw-log" ref={logRef}>
          {!messages.length && <div className="aw-hello">
            <span className="aw-mono big">{initials(agent.name)}</span>
            <h3>O que vamos resolver em {scopeName}?</h3>
            <p>{agent.purpose} Digite <kbd>@</kbd> para trazer documentos, disciplinas ou bases externas para a conversa.</p>
            <div className="aw-prompts">{(agent.prompts ?? []).map((prompt) => <button type="button" key={prompt} onClick={() => void send(prompt)}>{prompt}</button>)}</div>
          </div>}

          {messages.map((message, index) => message.role === 'user'
            ? <div className="aw-user" key={index}><p>{message.text}</p><small>{user.name}</small></div>
            : <article className="aw-sheet" key={index}>
              <div className="aw-sheet-text"><p>{message.text}</p>
                {!!message.sources?.length && <ul className="aw-cites" aria-label="Fontes citadas">{message.sources.map((id, i) => <li key={id}><sup>{i + 1}</sup><SourceIcon id={id} documents={documents} />{sourceLabel(id, documents)}</li>)}</ul>}
              </div>
              <footer className="aw-titleblock">
                <div><small>Projeto</small><strong>{scopeProject?.name ?? 'Organização'}</strong></div>
                <div><small>Agente</small><strong>{agents.find((a) => a.id === message.agentId)?.name}</strong></div>
                <div><small>Fontes</small><strong>{message.sources?.length || 'Base geral'}</strong></div>
                <div className={message.promoted ? 'stamp' : ''}><small>Situação</small><strong>{message.promoted ? 'Contexto global' : 'Rascunho da IA'}</strong></div>
              </footer>
              {message.format && message.format !== 'Chat' && <div className="aw-file">
                <span className={`aw-file-icon f-${message.format.toLowerCase()}`}>{message.format === 'EML' ? '@' : message.format}</span>
                <div><strong>{fileName(payloadFor(message, index), message.format)}</strong><small>{formatLabel(message.format)} · {templates.find((t) => t.id === message.templateId)?.name ?? 'sem template'}</small></div>
                <button type="button" onClick={() => downloadOutput(payloadFor(message, index), message.format!)}><Download size={14} />Baixar</button>
              </div>}
              <div className="aw-sheet-actions">
                <button type="button" onClick={() => { void navigator.clipboard?.writeText(message.text); notice('Resposta copiada.'); }}><Copy size={13} />Copiar</button>
                {scopeProject && !message.promoted && <Can action="promote"><button type="button" className="promote" onClick={() => promote(index)}><Globe2 size={13} />Tornar Contexto Global</button></Can>}
              </div>
            </article>)}

          {busy && <div className="aw-reading" aria-live="polite">
            <span className="aw-mono">{initials(agent.name)}</span>
            <ul>
              {sources.slice(0, 4).map((id, i) => <li key={id} className={reading! > i ? 'done' : reading === i ? 'now' : ''}>{reading! > i ? <Check size={12} /> : <LoaderCircle className="spin" size={12} />}Lendo {sourceLabel(id, documents)}</li>)}
              <li className={reading === Math.min(sources.length, 4) ? 'now' : ''}><LoaderCircle className="spin" size={12} />Redigindo resposta</li>
            </ul>
          </div>}
        </div>

        <form className="aw-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          {options.length > 0 && <div className="aw-mention" id="aw-mention">{options.map((item, i) => <button type="button" key={item.id} className={i === cursor ? 'on' : ''} onMouseEnter={() => setCursor(i)} onClick={() => pick(item.id)}><SourceIcon id={item.id} documents={documents} size={14} /><span>{sourceLabel(item.id, documents)}</span><small>{item.group}</small></button>)}</div>}
          {sources.length > 0 && <div className="aw-chips">{sources.map((id) => <span className="aw-chip" key={id}><SourceIcon id={id} documents={documents} />{sourceLabel(id, documents)}<button type="button" aria-label={`Remover ${sourceLabel(id, documents)}`} onClick={() => setSources((current) => current.filter((item) => item !== id))}><X size={11} /></button></span>)}</div>}
          {missing.length > 0 && <div className="aw-required" aria-live="polite"><Paperclip size={14} /><span>{agent.name} precisa de</span>{missing.map((category) => <button type="button" key={category} onClick={() => attachRequired(category)}><Plus size={12} />{category}</button>)}</div>}
          <div className="aw-input-row">
            <button type="button" className="aw-at" aria-label="Anexar contexto" onClick={() => { setInput((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}@`); inputRef.current?.focus(); }}><AtSign size={16} /></button>
            <textarea ref={inputRef} rows={1} value={input} onChange={(event) => { setInput(event.target.value); setCursor(0); }} onKeyDown={onKey} placeholder={`Pergunte ao ${agent.name}…`} aria-label="Mensagem ao agente" aria-controls={options.length ? 'aw-mention' : undefined} />
            <button className="aw-send" type="submit" disabled={busy || !input.trim() || missing.length > 0} aria-label="Enviar"><ArrowUp size={17} /></button>
          </div>
          <div className="aw-output">
            <div className="aw-formats" aria-label="Formato da entrega">{formats.map((id) => <button type="button" aria-pressed={activeFormat === id} key={id} className={activeFormat === id ? 'on' : ''} onClick={() => setFormat(id)}>{id === 'Chat' ? 'Chat' : formatLabel(id)}</button>)}</div>
            {activeFormat !== 'Chat' && <label className="aw-template"><FileText size={13} /><span className="sr-only">Template</span><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="auto">{resolvedTemplate && templateId === 'auto' ? `Padrão: ${resolvedTemplate.name}` : 'Template padrão'}</option>{scopeTemplates.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.kind}</option>)}<option value="none">Sem template</option></select></label>}
          </div>
        </form>
      </div>

      <aside className="aw-rail" aria-label="Contexto da conversa">
        <h4>Nesta conversa</h4>
        {sources.length ? <ul className="aw-rail-list">{sources.map((id) => <li key={id}><SourceIcon id={id} documents={documents} size={14} /><span>{sourceLabel(id, documents)}</span></li>)}</ul> : <p>Nenhuma fonte anexada. O agente responde com a base geral de {scopeName}.</p>}
        {suggestedContext.length > 0 && <><h4>Sugeridos</h4><ul className="aw-rail-list add">{suggestedContext.map((doc) => <li key={doc.id}><button type="button" onClick={() => setSources((current) => [...current, doc.id])}><SourceIcon id={doc.id} documents={documents} size={14} /><span>{doc.name}</span><Plus size={13} /></button></li>)}</ul></>}
        <h4>Acesso</h4>
        <p>Você vê as fontes permitidas ao perfil <strong>{user.role}</strong>. Tudo fica registrado no histórico.</p>
      </aside>
    </div>
  </section>;
}

function AgentPicker({ agents, value, onChange }: { agents: AgentDef[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = agents.find((a) => a.id === value) ?? agents[0];
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => { if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  return <div className="aw-picker" ref={ref}>
    <button type="button" className="aw-picker-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><span className="aw-mono">{initials(current.name)}</span>{current.name}<ChevronDown size={15} /></button>
    {open && <div className="aw-picker-menu">
      {agents.map((a) => <button type="button" key={a.id} className={a.id === current.id ? 'on' : ''} onClick={() => { onChange(a.id); setOpen(false); }}>
        <span className="aw-mono">{initials(a.name)}</span>
        <span className="aw-picker-main"><strong>{a.name}{a.draft && <em>Rascunho</em>}</strong><small>{a.purpose}</small>
          <span className="aw-picker-meta">{(a.outputs ?? allFormats).filter((f) => f !== 'Chat').map((f) => <i key={f}>{f}</i>)}{!!a.required?.length && <b><Paperclip size={10} />{a.required.join(', ')}</b>}</span>
        </span>
        {a.id === current.id && <Check size={15} />}
      </button>)}
      <button type="button" className="aw-picker-create" onClick={() => { setOpen(false); setCreating(true); }}><Plus size={15} />Criar agente</button>
    </div>}
    <CreateAgentDialog open={creating} onOpenChange={setCreating} onCreated={(a) => onChange(a.id)} />
  </div>;
}

const knowledgeOptions = ['Padrões da organização + documentos do projeto', 'Somente documentos do projeto', 'Biblioteca técnica corporativa'];

export function CreateAgentDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated?: (agent: AgentDef) => void }) {
  const { templates, update, notice } = useDemo();
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [required, setRequired] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<OutputFormat[]>(['Chat', 'PDF']);
  const [templateId, setTemplateId] = useState('');
  const [knowledge, setKnowledge] = useState(knowledgeOptions[0]);
  const [prompts, setPrompts] = useState('');
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const finalName = name.trim() || 'Novo agente';
  const template = templates.find((t) => t.id === templateId);
  const prompt = purpose.trim()
    ? [`Você é ${finalName}.`, '', 'Missão', purpose.trim(), ...(instructions.trim() ? ['', 'Regras', instructions.trim()] : []), '', 'Antes de responder', required.length ? `Confirme que recebeu: ${required.join(', ')}. Se faltar algo, peça ao usuário.` : 'Use as fontes anexadas e a base autorizada.', '', 'Entrega', `Formatos permitidos: ${outputs.map(formatLabel).join(', ')}.${template ? ` Aplique o template ${template.name}.` : ' Use o template padrão do projeto.'} Cite as fontes e sinalize o que precisa de validação humana.`, '', 'Base autorizada', `${knowledge}.`].join('\n')
    : 'Descreva a missão do agente. O prompt aparece aqui enquanto você escreve.';

  function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!purpose.trim() || !outputs.length) return;
    const agent: AgentDef = { id: `custom-${crypto.randomUUID().slice(0, 8)}`, name: finalName, purpose: purpose.trim(), instructions: instructions.trim(), required, outputs, templateId: templateId || undefined, knowledge, prompts: prompts.split('\n').map((p) => p.trim()).filter(Boolean).slice(0, 3), draft: true };
    update((state) => ({ ...state, customAgents: [...state.customAgents, agent] }));
    notice(`${agent.name} criado como rascunho.`);
    onCreated?.(agent);
    onOpenChange(false);
    setName(''); setPurpose(''); setInstructions(''); setRequired([]); setOutputs(['Chat', 'PDF']); setTemplateId(''); setPrompts('');
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="project-modal aw-create">
    <DialogHeader><DialogTitle><Sparkles size={19} />Criar agente</DialogTitle><DialogDescription>Defina o que o agente faz, o que ele precisa receber e como entrega o resultado.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="aw-create-grid">
      <div className="aw-create-fields">
        <label className="field">Nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Viabilidade legal" /></label>
        <label className="field">Missão<textarea required rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Ex: Analise os documentos do projeto, encontre riscos para aprovação e recomende os próximos passos." /></label>
        <label className="field">Regras e tom <span className="field-hint">opcional</span><textarea rows={2} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Ex: Escreva para a equipe técnica. Cite a página de cada evidência." /></label>
        <fieldset className="aw-fieldset"><legend>Arquivos obrigatórios</legend><p>O chat só envia quando esses tipos estiverem anexados.</p><div className="aw-toggle-list">{categories.map((c) => <button type="button" key={c} aria-pressed={required.includes(c)} className={required.includes(c) ? 'on' : ''} onClick={() => setRequired(toggle(required, c))}>{c}</button>)}</div></fieldset>
        <fieldset className="aw-fieldset"><legend>Formatos de entrega</legend><div className="aw-toggle-list">{outputFormats.map((f) => <button type="button" key={f.id} aria-pressed={outputs.includes(f.id)} className={outputs.includes(f.id) ? 'on' : ''} onClick={() => setOutputs(toggle(outputs, f.id))}>{f.label}</button>)}</div>{!outputs.length && <p className="aw-error">Escolha pelo menos um formato.</p>}</fieldset>
        <div className="aw-create-row">
          <label className="field">Template padrão<select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Padrão do projeto</option>{templates.filter((t) => t.status === 'Ativo').map((t) => <option key={t.id} value={t.id}>{t.name} · {t.kind}</option>)}</select></label>
          <label className="field">Base de conhecimento<select value={knowledge} onChange={(event) => setKnowledge(event.target.value)}>{knowledgeOptions.map((k) => <option key={k}>{k}</option>)}</select></label>
        </div>
        <label className="field">Perguntas sugeridas <span className="field-hint">uma por linha, até 3</span><textarea rows={2} value={prompts} onChange={(event) => setPrompts(event.target.value)} placeholder={'Quais riscos impedem a aprovação?\nMonte o parecer para o cliente'} /></label>
      </div>
      <div className="aw-create-preview" aria-live="polite"><span><Sparkles size={13} />Prompt do agente</span><pre>{prompt}</pre><small><ShieldCheck size={12} />Criado como rascunho. Respeita permissões e registra fontes na auditoria.</small></div>
      <DialogFooter className="aw-create-footer"><button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancelar</button><button type="submit" className="btn primary" disabled={!purpose.trim() || !outputs.length}>Criar agente</button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

export function HistorySidebar({ scope, onOpen }: { scope: string; onOpen: (thread: ChatThread) => void }) {
  const { threads, user, documents } = useDemo();
  const agents = useAgents();
  const mine = threads.filter((thread) => thread.projectId === scope && thread.user === user.name).sort((a, b) => b.date.localeCompare(a.date));
  return <div className="aw-history"><div className="aw-section-title"><History size={16} /><h3>Minhas conversas</h3><span>{mine.length}</span></div>
    {mine.length ? <ul>{mine.map((thread) => <li key={thread.id}><button type="button" onClick={() => onOpen(thread)}>
      <span className="aw-mono">{initials(agents.find((a) => a.id === thread.messages.at(-1)?.agentId)?.name ?? 'IA')}</span>
      <span className="aw-history-main"><strong>{thread.title}</strong><small>{thread.messages.length} mensagens · {thread.sources.length ? thread.sources.map((id) => sourceLabel(id, documents)).join(', ') : 'sem fontes'}</small></span>
      <time>{thread.date.slice(5)}</time>
    </button></li>)}</ul> : <p className="aw-empty">Suas conversas com agentes aparecem aqui. Abra a aba Agents para começar.</p>}
  </div>;
}

export function GlobalAuditLog({ scope }: { scope: string }) {
  const { threads, documents } = useDemo();
  const agents = useAgents();
  const [userFilter, setUserFilter] = useState('Todos');
  const [agentFilter, setAgentFilter] = useState('Todos');
  const [sourceFilter, setSourceFilter] = useState('');
  const all = threads.filter((thread) => thread.projectId === scope);
  const users = [...new Set(all.map((thread) => thread.user))];
  const rows = all.filter((thread) => (userFilter === 'Todos' || thread.user === userFilter) && (agentFilter === 'Todos' || thread.messages.some((m) => m.agentId === agentFilter)) && (!sourceFilter || thread.sources.some((id) => sourceLabel(id, documents).toLowerCase().includes(sourceFilter.toLowerCase()))));
  return <div className="aw-audit"><div className="aw-section-title"><ShieldCheck size={16} /><h3>Auditoria de interações</h3><span>{rows.length}</span></div>
    <div className="aw-filters">
      <label>Utilizador<select value={userFilter} onChange={(event) => setUserFilter(event.target.value)}><option>Todos</option>{users.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Agente<select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}><option>Todos</option>{agents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Fonte<span><Search size={13} /><input value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} placeholder="Nome do documento ou base" /></span></label>
    </div>
    <div className="aw-table-wrap"><table><thead><tr><th>Quando</th><th>Utilizador</th><th>Agentes</th><th>Fontes cruzadas</th><th>Msgs</th><th>Promovidas</th></tr></thead><tbody>
      {rows.map((thread) => <tr key={thread.id}><td>{thread.date}</td><td>{thread.user}</td><td>{[...new Set(thread.messages.map((m) => agents.find((a) => a.id === m.agentId)?.name))].join(', ')}</td><td>{thread.sources.map((id) => sourceLabel(id, documents)).join(', ') || '—'}</td><td>{thread.messages.length}</td><td>{thread.messages.filter((m) => m.promoted).length}</td></tr>)}
      {!rows.length && <tr><td colSpan={6} className="aw-empty">Nenhuma interação com estes filtros.</td></tr>}
    </tbody></table></div>
  </div>;
}
