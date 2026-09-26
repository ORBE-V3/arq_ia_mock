'use client';

import '@/app/check.css';
import { useEffect, useRef, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FlaskConical, Activity, ArrowRight, Check, Download, FileText, LoaderCircle, MessageSquareText, Radar, RotateCcw, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import { useDemo } from '@/hooks/use-demo';
import { REQUIRED, applyCheck, opinion, signature } from '@/lib/check-engine';
import type { CheckState, CostSignal } from '@/lib/check-engine';
import { buildTables, computeDashboard, suggestEdges } from '@/lib/data-canvas';
import type { CanvasState } from '@/lib/data-canvas';
import { downloadOutput } from '@/lib/export-output';
import type { Analysis, Project } from '@/types';

const today = () => new Date().toISOString().slice(0, 10);
const nowStamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
const uid = () => crypto.randomUUID().slice(0, 8);

function costSignal(state: unknown, projectId: string): CostSignal {
  const tables = buildTables(state as CanvasState, projectId);
  const d = computeDashboard({ base: 'erp', nodes: tables.map((t) => ({ table: t.id, x: 0, y: 0 })), edges: suggestEdges() }, tables, {});
  return d.desvioTotal === null ? null : { desvio: d.desvioTotal, real: d.real, expected: d.expected };
}

export function useArqCheck() {
  const { update, notice } = useDemo();
  return (projectId: string, trigger?: string) => {
    update((state) => applyCheck(state as unknown as CheckState, projectId, { today: today(), now: nowStamp(), cost: costSignal(state, projectId), trigger, uid }) as unknown as typeof state);
    notice('ArqCheck atualizado. Pendências e Kanban sincronizados.');
  };
}

const monitored = (analyses: Analysis[], projectId: string) => analyses.find((a) => a.projectId === projectId)?.signature !== undefined;

// Mounted once in the shell: re-runs the check for monitored projects whose inputs changed.
export function CheckWatcher() {
  const demo = useDemo();
  const { ready, analyses, update, notice } = demo;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stale = ready ? demo.projects.filter((p) => { const last = analyses.find((a) => a.projectId === p.id); return last?.signature !== undefined && last.signature !== signature(demo as unknown as CheckState, p.id, costSignal(demo, p.id)); }).map((p) => p.id) : [];
  const key = stale.join(',');
  useEffect(() => {
    if (!key) return;
    clearTimeout(timer.current);
    // ponytail: 1.2s debounce so a multi-file upload produces one analysis, not one per file.
    timer.current = setTimeout(() => {
      update((state) => key.split(',').reduce((s, id) => applyCheck(s as unknown as CheckState, id, { today: today(), now: nowStamp(), cost: costSignal(s, id), uid }) as unknown as typeof state, state));
      notice(`ArqCheck reanalisou ${key.split(',').length === 1 ? 'o projeto' : `${key.split(',').length} projetos`} após mudanças na base.`);
    }, 1200);
    return () => clearTimeout(timer.current);
  }, [key, update, notice]);
  return null;
}

const ago = (stamp: string) => {
  const minutes = Math.round((Date.now() - new Date(stamp.replace(' ', 'T')).getTime()) / 60000);
  return !stamp.includes(' ') ? stamp.split('-').reverse().join('/') : minutes < 1 ? 'agora' : minutes < 60 ? `há ${minutes} min` : minutes < 1440 ? `há ${Math.round(minutes / 60)} h` : stamp.slice(0, 10).split('-').reverse().join('/');
};
const changeLabel = { novo: 'Novo', persistente: 'Persistente', reaberto: 'Reaberto' };
const order = ['Crítica', 'Alta', 'Média', 'Baixa'];

export function ProjectCheckPanel({ project, onOpenKanban, onAsk }: { project: Project; onOpenKanban: () => void; onAsk: (documentIds: string[]) => void }) {
  const demo = useDemo();
  const { analyses, kanban, pendings, templates, user } = demo;
  const run = useArqCheck();
  const [busy, setBusy] = useState(false);
  const history = analyses.filter((a) => a.projectId === project.id);
  const latest = history[0];
  const isMonitored = monitored(analyses, project.id);
  const open = latest?.issues.filter((i) => !i.resolved) ?? [];
  const cardFor = (issue: { key?: string; pendingId?: string }) => { const pending = pendings.find((p) => p.id === issue.pendingId) ?? pendings.find((p) => p.projectId === project.id && p.checkKey === issue.key); return pending && kanban.find((c) => c.pendingId === pending.id); };
  const trend = [...history].reverse().map((a, i) => ({ name: i === history.length - 1 ? 'Atual' : a.date.slice(5, 10).split('-').reverse().join('/'), score: a.score }));
  const previous = history[1];
  const delta = previous ? latest.score - previous.score : 0;
  const template = templates.find((t) => t.projectId === project.id && t.default);
  const [menu, setMenu] = useState(false);
  // Periodic sweep: every 30s the watcher re-reads the base; the countdown makes that visible.
  const [left, setLeft] = useState(30);
  useEffect(() => { const id = setInterval(() => setLeft((l) => (l <= 1 ? 30 : l - 1)), 1000); return () => clearInterval(id); }, []);
  const unchanged = latest?.signature === signature(demo as unknown as CheckState, project.id, costSignal(demo, project.id));

  // Demo events: real changes to the base; the watcher reacts like it would to a user.
  const projectDocs = demo.documents.filter((d) => d.projectId === project.id);
  const memorial = projectDocs.find((d) => d.category === 'Memorial Descritivo');
  const missingCategory = REQUIRED.map(([c]) => c).find((c) => !projectDocs.some((d) => d.category === c));
  const events = [
    memorial && open.some((i) => i.key === 'area') && { label: 'Chega a planta revisada com a área do memorial', run: () => addDoc({ name: 'planta_executiva_rev03.pdf', category: 'Planta', area: memorial.area }) },
    missingCategory && { label: `Cliente envia ${missingCategory}`, run: () => addDoc({ name: `${missingCategory.toLowerCase().replace(/[^a-z]+/g, '_')}_recebido.pdf`, category: missingCategory, area: project.area }) },
    { label: 'Nova pendência passa do prazo', run: () => demo.update((s) => ({ ...s, pendings: [{ id: `pending-${uid()}`, projectId: project.id, title: 'Retorno do cliente sobre acabamentos', type: 'Aprovação', detail: 'Aguardando escolha de revestimentos.', assignee: project.owner, priority: 'Média', dueDate: '2026-09-18', status: 'Aguardando cliente', source: 'Equipe' }, ...s.pendings] })) },
  ].filter(Boolean) as { label: string; run: () => void }[];
  function addDoc(d: { name: string; category: string; area: number }) {
    demo.update((s) => ({ ...s, documents: [{ id: `doc-${uid()}`, projectId: project.id, date: today(), status: 'Processado', confidence: 97, kind: 'file', access: 'Equipe', ...d }, ...s.documents] }));
  }
  const activity = history.slice(0, 6).map((a, i) => { const before = history[i + 1]; const beforeOpen = new Set(before?.issues.filter((x) => !x.resolved).map((x) => x.key)); return { a, added: a.issues.filter((x) => !beforeOpen.has(x.key)).length, resolved: a.resolvedKeys?.length ?? 0 }; });

  async function start(trigger?: string) {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    run(project.id, trigger);
    setBusy(false);
  }
  function exportOpinion(format: 'PDF' | 'DOCX') {
    if (!latest) return;
    downloadOutput({ title: `Parecer ArqCheck · ${project.name}`, body: opinion(project.name, latest).join('\n'), sources: [`${latest.documents} documentos analisados`], project: project.name, agent: 'ArqCheck', author: user.name, date: latest.date, template: template ? { name: template.name, kind: template.kind, company: 'Studio Arquitetura' } : null }, format);
  }

  if (!isMonitored) return <div className="ck">
    <div className="ck-start">
      <span className="ck-start-icon"><ScanLine size={26} /></span>
      <div>
        <h2>Ative o ArqCheck contínuo para {project.name}</h2>
        <p>A IA lê a base do projeto, emite o parecer inicial e passa a reanalisar sozinha a cada documento novo, pendência alterada ou mudança de custo no ERP. Cada ponto encontrado vira pendência e card no Kanban.</p>
        <ul><li><Check size={14} />Documentos obrigatórios e divergências entre arquivos</li><li><Check size={14} />Leituras com baixa confiança e prazos vencidos</li><li><Check size={14} />Custo realizado contra o avanço medido</li></ul>
        <button type="button" className="btn primary" disabled={busy} onClick={() => void start('Parecer inicial')}>{busy ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}{busy ? 'Lendo a base do projeto…' : 'Gerar parecer inicial e ativar'}</button>
        {latest && <small>Última análise manual: {ago(latest.date)} · score {latest.score}%</small>}
      </div>
    </div>
  </div>;

  return <div className="ck">
    <div className="ck-live">
      <span className="ck-pulse" aria-hidden="true" />
      <div><strong>Monitoramento contínuo ativo</strong><small>Última análise {ago(latest.date)} · {latest.trigger ?? 'Análise'} · {unchanged ? `base sem mudanças · próxima varredura em ${left}s` : 'mudança detectada, reanalisando…'}</small></div>
      <div className="ck-sim">
        <button type="button" className="btn" aria-expanded={menu} onClick={() => setMenu(!menu)}><FlaskConical size={14} />Simular evento</button>
        {menu && <div className="ck-sim-menu" role="menu">{events.map((e) => <button type="button" role="menuitem" key={e.label} onClick={() => { e.run(); setMenu(false); }}>{e.label}</button>)}<small>Altera a base de verdade. O ArqCheck detecta e reanalisa sozinho.</small></div>}
      </div>
      <button type="button" className="btn" disabled={busy} onClick={() => void start('Verificação manual')}>{busy ? <LoaderCircle className="spin" size={14} /> : <RotateCcw size={14} />}Verificar agora</button>
    </div>

    <div className="ck-top">
      <div className="ck-score">
        <small>Índice de consistência</small>
        <b>{latest.score}<span>%</span></b>
        {previous && <em className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>{delta > 0 ? `+${delta}` : delta} desde a análise anterior</em>}
        {trend.length > 1 && <ResponsiveContainer width="100%" height={70}><LineChart data={trend} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}><XAxis dataKey="name" hide /><YAxis domain={[0, 100]} hide /><Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${String(v)}%`, 'Score']} /><Line dataKey="score" stroke="var(--rv-1)" strokeWidth={2} dot={{ r: 3, fill: 'var(--rv-1)' }} /></LineChart></ResponsiveContainer>}
      </div>
      <div className="ck-diff">
        <div><b>{open.filter((i) => i.change === 'novo').length}</b><small>novos</small></div>
        <div><b>{latest.resolvedKeys?.length ?? 0}</b><small>resolvidos</small></div>
        <div className={open.some((i) => i.change === 'reaberto') ? 'warn' : ''}><b>{open.filter((i) => i.change === 'reaberto').length}</b><small>reabertos</small></div>
        <div><b>{open.length}</b><small>em aberto</small></div>
      </div>
      <div className="ck-opinion">
        <header><FileText size={15} /><strong>Parecer do projeto</strong></header>
        <p>{opinion(project.name, latest).at(-1)}</p>
        <div><button type="button" className="btn" onClick={() => exportOpinion('PDF')}><Download size={13} />PDF</button><button type="button" className="btn" onClick={() => exportOpinion('DOCX')}><Download size={13} />Word</button><small>{template ? `Template ${template.name}` : 'Sem template'}</small></div>
      </div>
    </div>

    <div className="ck-issues">
      {open.length === 0 && <div className="ck-clean"><ShieldCheck size={20} /><strong>Nenhum ponto em aberto</strong><p>O ArqCheck continua observando a base e avisa se algo mudar.</p></div>}
      {[...open].sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority)).map((issue) => {
        const card = cardFor(issue);
        return <article className={`ck-issue p-${issue.priority === 'Crítica' ? 'c' : issue.priority === 'Alta' ? 'a' : 'm'}`} key={issue.id}>
          <div className="ck-issue-head"><span className="ck-prio">{issue.priority}</span><strong>{issue.title}</strong>{issue.change && <em className={`ck-change ${issue.change}`}>{changeLabel[issue.change]}</em>}</div>
          <p>{issue.detail}</p>
          <footer>
            <span className="ck-rule">{issue.rule}</span>
            {card && <button type="button" className="ck-link" onClick={onOpenKanban}><Activity size={13} />Kanban · {card.column}<ArrowRight size={12} /></button>}
            {!!issue.documentIds?.length && <button type="button" className="ck-link" onClick={() => onAsk(issue.documentIds!)}><MessageSquareText size={13} />Perguntar ao agente</button>}
          </footer>
        </article>;
      })}
    </div>

    <section className="ck-activity"><header><Activity size={15} /><strong>Atividade do ArqCheck</strong><small>o que cada análise automática fez</small></header>
      <ol>{activity.map(({ a, added, resolved }, i) => <li key={a.id} className={i === 0 ? 'now' : ''}><time>{ago(a.date)}</time><span><b>{a.trigger ?? 'Análise'}</b>{i === history.length - 1 && !a.signature ? ' (análise antiga)' : ''}</span><em>{added ? `${added} novo${added > 1 ? 's' : ''}` : ''}{added && resolved ? ' · ' : ''}{resolved ? `${resolved} resolvido${resolved > 1 ? 's' : ''} e card movido para Concluído` : ''}{!added && !resolved ? 'sem mudança nos pontos' : ''}</em><b className="ck-act-score">{a.score}%</b></li>)}</ol>
    </section>
    {history.length > 1 && <details className="ck-history"><summary><Radar size={14} />Histórico de verificações ({history.length})</summary><ul>{history.map((a) => <li key={a.id}><time>{a.date.includes(' ') ? a.date.slice(0, 16).split(' ').map((x, i) => (i ? x : x.split('-').reverse().join('/'))).join(' ') : a.date}</time><span>{a.trigger ?? 'Análise'}</span><b>{a.score}%</b><small>{a.issues.filter((i) => !i.resolved).length} abertos{a.resolvedKeys?.length ? ` · ${a.resolvedKeys.length} resolvidos` : ''}</small></li>)}</ul></details>}
  </div>;
}
