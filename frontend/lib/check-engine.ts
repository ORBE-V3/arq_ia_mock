// ArqCheck rules + Kanban/pendências sync. Pure (no React, no aliases) so check-engine.check.ts runs under plain node.
// ponytail: rule-based checks over structured data; an LLM reading document contents plugs in as extra rules returning the same Finding shape.

export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
// pendingId: the finding is about an existing pendência, so it is linked instead of duplicated.
export type Finding = { key: string; rule: string; title: string; detail: string; priority: Priority; documentIds?: string[]; column: string; pendingId?: string };
export type CheckIssue = { id: string; pendingId?: string; key?: string; rule?: string; title: string; priority: string; detail: string; resolved: boolean; comments: string[]; documentIds?: string[]; change?: 'novo' | 'persistente' | 'reaberto' };
export type CheckAnalysis = { id: string; projectId: string; date: string; score: number; documents: number; issues: CheckIssue[]; signature?: string; trigger?: string; docIds?: string[]; resolvedKeys?: string[] };

type Doc = { id: string; name: string; category: string; projectId: string; status: string; confidence: number; area: number; kind?: string };
type Pending = { id: string; projectId: string; title: string; type: string; detail: string; assignee: string; priority: Priority; dueDate: string; status: string; source: string; documentIds?: string[]; checkKey?: string };
type Card = { id: string; projectId: string; title: string; column: string; type: string; assignee: string; priority: Priority; dueDate: string; detail: string; pendingId?: string; documentIds?: string[]; comments?: string[] };
export type CheckState = { projects: { id: string; name: string; owner: string; stage: string; area?: number }[]; documents: Doc[]; pendings: Pending[]; kanban: Card[]; analyses: CheckAnalysis[]; quantModels?: Record<string, { rooms: { w: number; d: number }[] }> };
const modelArea = (s: CheckState, projectId: string) => { const m = s.quantModels?.[projectId]; return m ? Math.round(m.rooms.reduce((t, r) => t + r.w * r.d, 0) * 100) / 100 : null; };
export type CostSignal = { desvio: number; real: number; expected: number } | null;

export const REQUIRED: [string, Priority][] = [['ART/RRT', 'Alta'], ['Memorial Descritivo', 'Alta'], ['Planta', 'Alta'], ['Contrato', 'Média'], ['Licença', 'Média']];
const WEIGHT: Record<Priority, number> = { Crítica: 14, Alta: 8, Média: 4, Baixa: 2 };
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const OPEN = (status: string) => status !== 'Concluída';

export function findings(s: CheckState, projectId: string, today: string, cost: CostSignal): Finding[] {
  const docs = s.documents.filter((d) => d.projectId === projectId && (d.kind ?? 'file') === 'file');
  const out: Finding[] = [];
  for (const [category, priority] of REQUIRED) {
    if (!docs.some((d) => d.category === category)) out.push({ key: `missing:${category}`, rule: 'Documento faltante', title: `${category} ausente na base`, detail: `Nenhum documento classificado como ${category} está na base do projeto. Ele é exigido para a próxima etapa.`, priority, column: 'Aguardando documento' });
  }
  const memorial = docs.find((d) => d.category === 'Memorial Descritivo' && d.area);
  const planta = docs.find((d) => d.category === 'Planta' && d.area);
  if (memorial && planta && Math.abs(memorial.area - planta.area) / Math.max(memorial.area, planta.area) > 0.01) {
    out.push({ key: 'area', rule: 'Divergência entre documentos', title: 'Área divergente entre memorial e planta', detail: `${memorial.name} informa ${memorial.area} m² e ${planta.name} informa ${planta.area} m² (diferença de ${Math.abs(planta.area - memorial.area)} m²). Defina qual área prevalece.`, priority: 'Crítica', documentIds: [memorial.id, planta.id], column: 'Em revisão humana' });
  }
  const measured = modelArea(s, projectId);
  const memorialArea = memorial?.area ?? s.projects.find((p) => p.id === projectId)?.area;
  if (measured !== null && memorialArea && Math.abs(measured - memorialArea) / memorialArea > 0.02) out.push({ key: 'quant-area', rule: 'Levantamento × memorial', title: 'Área do ArqQuant difere do memorial', detail: `O modelo do ArqQuant soma ${measured.toLocaleString('pt-BR')} m² e o memorial informa ${memorialArea} m² (${measured > memorialArea ? '+' : ''}${Math.round((measured / memorialArea - 1) * 100)}%). Ajuste o modelo ou revise o memorial antes de orçar.`, priority: 'Alta', documentIds: memorial ? [memorial.id] : undefined, column: 'Em revisão humana' });
  const low = docs.filter((d) => d.status === 'Processado' && d.confidence < 93);
  if (low.length) out.push({ key: 'confidence', rule: 'Revisão humana', title: `${low.length} documento${low.length > 1 ? 's' : ''} lido${low.length > 1 ? 's' : ''} com baixa confiança`, detail: `A IA leu ${low.map((d) => `${d.name} (${d.confidence}%)`).join(', ')} com confiança abaixo de 93%. Confirme a classificação antes de usar como evidência.`, priority: 'Média', documentIds: low.map((d) => d.id), column: 'Em revisão humana' });
  s.pendings.filter((p) => p.projectId === projectId && OPEN(p.status) && !p.checkKey && p.dueDate < today).forEach((p) => out.push({ key: `overdue:${p.id}`, rule: 'Prazo vencido', title: `Pendência vencida: ${p.title}`, detail: `Venceu em ${p.dueDate.split('-').reverse().join('/')} e continua ${p.status.toLowerCase()} com ${p.assignee}.`, priority: 'Média', column: 'Em análise', pendingId: p.id }));
  if (cost && cost.desvio > 15) out.push({ key: 'cost', rule: 'Custo × avanço', title: `Custo ${cost.desvio}% acima do avanço medido`, detail: `O ERP registra ${brl(cost.real)} em custos contra ${brl(cost.expected)} esperados pela medição da obra. Revise contratos e medições.`, priority: 'Alta', column: 'Em análise' });
  return out;
}

export const score = (list: { priority: string }[]) => Math.max(0, 100 - list.reduce((t, f) => t + (WEIGHT[f.priority as Priority] ?? 2), 0));

// Stable fingerprint of what the rules read; a change triggers re-analysis.
export function signature(s: CheckState, projectId: string, cost: CostSignal) {
  const docs = s.documents.filter((d) => d.projectId === projectId).map((d) => `${d.id}:${d.category}:${d.status}:${d.area}:${d.confidence}`).sort();
  const pend = s.pendings.filter((p) => p.projectId === projectId && !p.checkKey).map((p) => `${p.id}:${p.status}:${p.dueDate}`).sort();
  return `${docs.join('|')}#${pend.join('|')}#${cost ? Math.round(cost.desvio) : ''}#${modelArea(s, projectId) ?? ''}`;
}

export function describeTrigger(prev: CheckAnalysis | undefined, s: CheckState, projectId: string) {
  if (!prev?.docIds) return 'Parecer inicial';
  const now = s.documents.filter((d) => d.projectId === projectId);
  const added = now.filter((d) => !prev.docIds!.includes(d.id));
  const removed = prev.docIds.filter((id) => !now.some((d) => d.id === id));
  if (added.length) return `Novo documento: ${added.map((d) => d.name).slice(0, 2).join(', ')}${added.length > 2 ? ` e mais ${added.length - 2}` : ''}`;
  if (removed.length) return `${removed.length} documento${removed.length > 1 ? 's' : ''} removido${removed.length > 1 ? 's' : ''}`;
  return 'Alteração em documentos ou pendências';
}

// Runs the check and returns the next state: new analysis on top, pendências + kanban created / closed / reopened.
export function applyCheck<S extends CheckState>(s: S, projectId: string, opts: { today: string; now: string; cost: CostSignal; trigger?: string; uid: () => string }): S {
  const prev = s.analyses.find((a) => a.projectId === projectId);
  const found = findings(s, projectId, opts.today, opts.cost);
  const project = s.projects.find((p) => p.id === projectId);
  const prevOpen = new Set((prev?.issues ?? []).filter((i) => !i.resolved && i.key).map((i) => i.key!));
  let pendings = [...s.pendings];
  let kanban = [...s.kanban];
  const issues: CheckIssue[] = found.map((f) => {
    // Adopt an open pendência about the same documents (e.g. created earlier by the AI) instead of duplicating it.
    const sameDocs = (p: Pending) => !!f.documentIds?.length && p.documentIds?.length === f.documentIds.length && f.documentIds.every((id) => p.documentIds!.includes(id));
    const adopt = !f.pendingId && pendings.find((p) => p.projectId === projectId && !p.checkKey && OPEN(p.status) && p.source === 'IA' && sameDocs(p));
    if (adopt) pendings = pendings.map((p) => (p.id === adopt.id ? { ...p, checkKey: f.key } : p));
    const linked = f.pendingId ? pendings.find((p) => p.id === f.pendingId) : pendings.find((p) => p.projectId === projectId && p.checkKey === f.key);
    let change: CheckIssue['change'] = prevOpen.has(f.key) ? 'persistente' : 'novo';
    if (!linked) {
      const pid = `pending-${opts.uid()}`;
      pendings = [{ id: pid, projectId, title: f.title, type: f.rule, detail: f.detail, assignee: project?.owner ?? 'Equipe', priority: f.priority, dueDate: opts.today, status: 'Aberta', source: 'IA', documentIds: f.documentIds, checkKey: f.key }, ...pendings];
      kanban = [{ id: `kanban-${opts.uid()}`, projectId, title: f.title, column: f.column, type: 'ArqCheck', assignee: project?.owner ?? 'Equipe', priority: f.priority, dueDate: opts.today, detail: f.detail, pendingId: pid, documentIds: f.documentIds, comments: ['Criado automaticamente pelo ArqCheck.'] }, ...kanban];
    } else if (!OPEN(linked.status) && !f.pendingId) {
      change = 'reaberto';
      pendings = pendings.map((p) => (p.id === linked.id ? { ...p, status: 'Aberta' } : p));
      kanban = kanban.map((c) => (c.pendingId === linked.id ? { ...c, column: f.column, comments: [...(c.comments ?? []), 'Reaberto pelo ArqCheck: o problema voltou a aparecer.'] } : c));
    }
    return { id: `issue-${opts.uid()}`, pendingId: linked?.id ?? pendings.find((p) => p.checkKey === f.key)?.id, key: f.key, rule: f.rule, title: f.title, priority: f.priority, detail: f.detail, resolved: false, comments: [], documentIds: f.documentIds, change };
  });
  const keys = new Set(found.map((f) => f.key));
  const resolvedKeys = [...prevOpen].filter((k) => !keys.has(k));
  // Anything the check created that no longer applies is closed on both boards.
  pendings = pendings.map((p) => (p.projectId === projectId && p.checkKey && !keys.has(p.checkKey) && OPEN(p.status) ? { ...p, status: 'Concluída' } : p));
  const closed = new Set(pendings.filter((p) => p.projectId === projectId && p.checkKey && !keys.has(p.checkKey)).map((p) => p.id));
  kanban = kanban.map((c) => (c.pendingId && closed.has(c.pendingId) && c.column !== 'Concluído' ? { ...c, column: 'Concluído', comments: [...(c.comments ?? []), 'Resolvido: o ArqCheck não encontrou mais o problema.'] } : c));
  const docs = s.documents.filter((d) => d.projectId === projectId);
  const analysis: CheckAnalysis = { id: `check-${opts.uid()}`, projectId, date: opts.now, score: score(issues), documents: docs.length, issues, signature: signature({ ...s, pendings }, projectId, opts.cost), trigger: opts.trigger ?? describeTrigger(prev, s, projectId), docIds: docs.map((d) => d.id), resolvedKeys };
  return { ...s, analyses: [analysis, ...s.analyses], pendings, kanban };
}

export function opinion(projectName: string, a: CheckAnalysis) {
  const open = a.issues.filter((i) => !i.resolved);
  const critical = open.filter((i) => i.priority === 'Crítica');
  const missing = open.filter((i) => i.rule === 'Documento faltante');
  const verdict = critical.length ? 'não deve seguir para a próxima etapa até a correção dos pontos críticos' : missing.length ? 'pode seguir com ressalvas, condicionado à entrega dos documentos faltantes' : open.length ? 'está apto a seguir, com pontos de atenção acompanhados no Kanban' : 'está apto a seguir sem pendências identificadas';
  return [
    `Situação geral. Foram analisados ${a.documents} documentos de ${projectName}. O índice de consistência é ${a.score}%, com ${open.length} ponto${open.length === 1 ? '' : 's'} em aberto.`,
    critical.length ? `Riscos críticos. ${critical.map((i) => i.detail).join(' ')}` : 'Riscos críticos. Nenhum ponto crítico identificado.',
    missing.length ? `Documentação faltante. ${missing.map((i) => i.title.replace(' ausente na base', '')).join(', ')}.` : 'Documentação obrigatória. Todos os documentos exigidos estão na base.',
    ...open.filter((i) => i.priority !== 'Crítica' && i.rule !== 'Documento faltante').map((i) => `${i.rule}. ${i.detail}`),
    `Parecer. O projeto ${verdict}. Todos os pontos foram registrados como pendências e cards no Kanban, e o ArqCheck continua monitorando a base.`,
  ];
}
