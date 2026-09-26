// Prompt -> chart spec -> data, over the demo state. Pure: no React, no path aliases (runnable by radar-engine.check.ts).
// ponytail: keyword parser; swap parsePrompt for an LLM call returning the same RadarSpec when the backend exists.

export type ChartKind = 'bar' | 'line' | 'pie' | 'table' | 'kpi';
export type RadarSpec = { dataset: string; measure: string; dim: string | null; chart: ChartKind; projectId?: string; limit?: number; order: 'desc' | 'asc'; openOnly?: boolean };
export type Datum = { name: string; value: number };
type Row = Record<string, string | number>;
type Format = 'num' | 'money' | 'pct' | 'h' | 'm2';
type Measure = { key: string; label: string; words: string[]; agg: 'count' | 'sum' | 'avg'; format: Format; financial?: boolean };
type Dim = { key: string; label: string; words: string[] };
export type Dataset = { id: string; label: string; unit: string; words: string[]; dims: Dim[]; measures: Measure[]; rows: (s: RadarState) => Row[]; openKey?: [string, string[]] };

// Structural subset of DemoState the engine reads.
export type RadarState = {
  projects: { id: string; name: string; client: string; type: string; owner: string; stage: string; status: string; risk: string; area: number; revenue: number; cost: number; hours: number; progress: number; createdAt: string; deadline: string }[];
  pendings: { projectId: string; type: string; assignee: string; priority: string; status: string; source: string; dueDate: string }[];
  documents: { projectId: string; category: string; status: string; confidence: number; date: string; kind?: string; access?: string }[];
  threads: { projectId: string; user: string; date: string; messages: { agentId: string }[]; sources: string[] }[];
  analyses: { projectId: string; date: string; score: number; issues: { resolved: boolean }[] }[];
  kanban: { projectId: string; column: string; assignee: string; priority: string; type: string }[];
  budgets: { projectId: string; date: string; scenario: string; total: number; status: string }[];
};

const count: Measure = { key: 'count', label: 'Quantidade', words: ['quantos', 'quantas', 'quantidade', 'numero', 'total de'], agg: 'count', format: 'num' };
const project: Dim = { key: 'project', label: 'Projeto', words: ['projeto', 'projetos', 'obra'] };
const month: Dim = { key: 'month', label: 'Mês', words: ['mes', 'mensal', 'evolucao', 'tendencia', 'ao longo', 'tempo', 'historico'] };
const kindLabel: Record<string, string> = { file: 'Arquivo', external: 'Base externa', context: 'Contexto validado' };

export function datasets(s: RadarState): Dataset[] {
  const name = (id: string) => s.projects.find((p) => p.id === id)?.name ?? (id === 'global' ? 'Organização' : id);
  return [
    { id: 'projects', label: 'Projetos', unit: 'projetos', words: ['projeto', 'projetos', 'portfolio', 'carteira', 'receita', 'margem', 'faturamento', 'custo', 'horas', 'lucro'],
      dims: [project, { key: 'status', label: 'Status', words: ['status', 'situacao'] }, { key: 'risk', label: 'Risco', words: ['risco'] }, { key: 'owner', label: 'Responsável', words: ['responsavel', 'arquiteto', 'gestor', 'dono'] }, { key: 'client', label: 'Cliente', words: ['cliente'] }, { key: 'type', label: 'Tipo', words: ['tipo', 'tipologia'] }, { key: 'stage', label: 'Etapa', words: ['etapa', 'fase'] }, { ...month, words: [...month.words, 'criacao'] }],
      measures: [count, { key: 'revenue', label: 'Receita', words: ['receita', 'faturamento', 'honorario'], agg: 'sum', format: 'money', financial: true }, { key: 'cost', label: 'Custo', words: ['custo', 'gasto', 'despesa'], agg: 'sum', format: 'money', financial: true }, { key: 'margin', label: 'Margem', words: ['margem', 'rentabilidade', 'rentavel', 'lucro'], agg: 'avg', format: 'pct', financial: true }, { key: 'hours', label: 'Horas', words: ['hora', 'horas', 'produtividade'], agg: 'sum', format: 'h' }, { key: 'area', label: 'Área', words: ['area', 'm2', 'metragem'], agg: 'sum', format: 'm2' }, { key: 'progress', label: 'Progresso médio', words: ['progresso', 'andamento', 'avanco'], agg: 'avg', format: 'pct' }],
      rows: () => s.projects.map((p) => ({ projectId: p.id, project: p.name, status: p.status, risk: p.risk, owner: p.owner, client: p.client, type: p.type, stage: p.stage, month: p.createdAt.slice(0, 7), revenue: p.revenue, cost: p.cost, margin: p.revenue ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0, hours: p.hours, area: p.area, progress: p.progress })) },
    { id: 'pendings', label: 'Pendências', unit: 'pendências', words: ['pendencia', 'pendencias', 'pendente', 'tarefa', 'tarefas'], openKey: ['status', ['Concluída']],
      dims: [project, { key: 'status', label: 'Status', words: ['status', 'situacao'] }, { key: 'assignee', label: 'Responsável', words: ['responsavel', 'pessoa', 'equipe', 'quem'] }, { key: 'priority', label: 'Prioridade', words: ['prioridade', 'criticidade', 'urgencia'] }, { key: 'type', label: 'Tipo', words: ['tipo', 'categoria'] }, { key: 'source', label: 'Origem', words: ['origem', 'fonte'] }, { ...month, words: [...month.words, 'prazo', 'vencimento'] }],
      measures: [count], rows: () => s.pendings.map((p) => ({ projectId: p.projectId, project: name(p.projectId), status: p.status, assignee: p.assignee, priority: p.priority, type: p.type, source: p.source, month: p.dueDate.slice(0, 7) })) },
    { id: 'documents', label: 'Documentos', unit: 'documentos', words: ['documento', 'documentos', 'arquivo', 'arquivos', 'docs', 'base', 'bases', 'confianca'],
      dims: [project, { key: 'category', label: 'Categoria', words: ['categoria', 'disciplina', 'tipo'] }, { key: 'status', label: 'Status', words: ['status', 'situacao'] }, { key: 'access', label: 'Acesso', words: ['acesso', 'permissao', 'privado'] }, { key: 'kind', label: 'Origem', words: ['origem', 'externa', 'fonte'] }, month],
      measures: [count, { key: 'confidence', label: 'Confiança média da IA', words: ['confianca', 'precisao', 'qualidade'], agg: 'avg', format: 'pct' }],
      rows: () => s.documents.map((d) => ({ projectId: d.projectId, project: name(d.projectId), category: d.category, status: d.status, access: d.access ?? 'Equipe', kind: kindLabel[d.kind ?? 'file'], month: d.date.slice(0, 7), confidence: d.confidence })) },
    { id: 'threads', label: 'Uso de agentes', unit: 'conversas', words: ['agente', 'agentes', 'conversa', 'conversas', 'chat', 'uso', 'ia', 'interacoes'],
      dims: [project, { key: 'user', label: 'Utilizador', words: ['usuario', 'utilizador', 'pessoa', 'quem'] }, { key: 'agent', label: 'Agente', words: ['agente', 'agentes'] }, month],
      measures: [count, { key: 'messages', label: 'Mensagens', words: ['mensagem', 'mensagens'], agg: 'sum', format: 'num' }, { key: 'sources', label: 'Fontes consultadas', words: ['fonte', 'fontes'], agg: 'sum', format: 'num' }],
      rows: () => s.threads.map((t) => ({ projectId: t.projectId, project: name(t.projectId), user: t.user, agent: t.messages.at(-1)?.agentId ?? '—', month: t.date.slice(0, 7), messages: t.messages.length, sources: t.sources.length })) },
    { id: 'analyses', label: 'ArqCheck', unit: 'análises', words: ['check', 'arqcheck', 'analise', 'analises', 'score', 'nota', 'apontamento', 'apontamentos', 'conformidade', 'divergencia'],
      dims: [project, month],
      measures: [{ key: 'score', label: 'Nota média', words: ['score', 'nota', 'pontuacao'], agg: 'avg', format: 'pct' }, { key: 'open', label: 'Apontamentos abertos', words: ['apontamento', 'apontamentos', 'aberto', 'abertos', 'divergencia'], agg: 'sum', format: 'num' }, count],
      rows: () => s.analyses.map((a) => ({ projectId: a.projectId, project: name(a.projectId), month: a.date.slice(0, 7), score: a.score, open: a.issues.filter((i) => !i.resolved).length })) },
    { id: 'kanban', label: 'Kanban', unit: 'cards', words: ['kanban', 'card', 'cards', 'quadro', 'coluna', 'fluxo'], openKey: ['column', ['Concluído', 'Cancelado']],
      dims: [project, { key: 'column', label: 'Coluna', words: ['coluna', 'etapa', 'status', 'fase'] }, { key: 'assignee', label: 'Responsável', words: ['responsavel', 'pessoa', 'quem'] }, { key: 'priority', label: 'Prioridade', words: ['prioridade', 'urgencia'] }, { key: 'type', label: 'Tipo', words: ['tipo', 'origem'] }],
      measures: [count], rows: () => s.kanban.map((k) => ({ projectId: k.projectId, project: name(k.projectId), column: k.column, assignee: k.assignee, priority: k.priority, type: k.type })) },
    { id: 'budgets', label: 'Orçamentos', unit: 'orçamentos', words: ['orcamento', 'orcamentos', 'budget', 'cenario', 'orcado'],
      dims: [project, { key: 'scenario', label: 'Cenário', words: ['cenario'] }, { key: 'status', label: 'Status', words: ['status', 'situacao'] }, month],
      measures: [{ key: 'total', label: 'Valor orçado', words: ['valor', 'orcado', 'total', 'custo'], agg: 'sum', format: 'money', financial: true }, count],
      rows: () => s.budgets.map((b) => ({ projectId: b.projectId, project: name(b.projectId), scenario: b.scenario, status: b.status, month: b.date.slice(0, 7), total: b.total })) },
  ];
}

export const norm = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hits = (text: string, words: string[]) => words.filter((w) => new RegExp(`\\b${w}\\b`).test(text)).length;

export function parsePrompt(prompt: string, s: RadarState, scopeId: string): RadarSpec {
  const q = norm(prompt);
  const all = datasets(s);
  const ds = [...all].sort((a, b) => hits(q, b.words) - hits(q, a.words))[0];
  const measure = ds.measures.filter((m) => m !== count).find((m) => hits(q, m.words)) ?? ds.measures[0];
  const porMatch = q.match(/\bpor (\w+)/);
  const dim = (porMatch && ds.dims.find((d) => d.words.includes(porMatch[1]))) || ds.dims.find((d) => d.key !== 'project' && hits(q, d.words) && !measure.words.some((w) => d.words.includes(w))) || (hits(q, month.words) ? ds.dims.find((d) => d.key === 'month') : undefined) || null;
  const named = scopeId === 'global' ? s.projects.find((p) => q.includes(norm(p.name)) || q.includes(norm(p.name.split(' ').slice(-2).join(' ')))) : undefined;
  const topMatch = q.match(/\btop (\d+)|\b(\d+) (?:maiores|menores|principais|melhores|piores)/);
  const asc = /\b(menor|menores|piores|pior|baixa)\b/.test(q);
  const finalDim = dim ?? (!named && scopeId === 'global' && /\b(cada|ranking|compar)/.test(q) ? project : null);
  const chart: ChartKind = /\b(tabela|lista|listar)\b/.test(q) ? 'table' : !finalDim ? 'kpi' : finalDim.key === 'month' ? 'line' : /\b(pizza|rosca|distribuicao|proporcao|participacao|fatia)\b/.test(q) ? 'pie' : 'bar';
  return { dataset: ds.id, measure: measure.key, dim: finalDim?.key ?? null, chart, projectId: named?.id, limit: topMatch ? Number(topMatch[1] ?? topMatch[2]) : undefined, order: asc ? 'asc' : 'desc', openOnly: !!ds.openKey && /\b(aberta|abertas|abertos|pendentes|em aberto|ativos|ativas)\b/.test(q) };
}

export function runSpec(spec: RadarSpec, s: RadarState, scopeId: string) {
  const ds = datasets(s).find((d) => d.id === spec.dataset) ?? datasets(s)[0];
  const measure = ds.measures.find((m) => m.key === spec.measure) ?? ds.measures[0];
  const dim = ds.dims.find((d) => d.key === spec.dim) ?? null;
  const pid = scopeId === 'global' ? spec.projectId : scopeId;
  let rows = ds.rows(s).filter((r) => !pid || r.projectId === pid);
  if (spec.openOnly && ds.openKey) rows = rows.filter((r) => !ds.openKey![1].includes(String(r[ds.openKey![0]])));
  const agg = (group: Row[]) => {
    if (measure.agg === 'count') return group.length;
    const sum = group.reduce((t, r) => t + Number(r[measure.key] || 0), 0);
    return measure.agg === 'sum' ? sum : group.length ? Math.round(sum / group.length) : 0;
  };
  let data: Datum[] = [];
  if (dim) {
    const groups = new Map<string, Row[]>();
    rows.forEach((r) => groups.set(String(r[dim.key]), [...(groups.get(String(r[dim.key])) ?? []), r]));
    data = [...groups].map(([name, group]) => ({ name, value: agg(group) }));
    data = dim.key === 'month' ? data.sort((a, b) => a.name.localeCompare(b.name)) : data.sort((a, b) => (spec.order === 'asc' ? a.value - b.value : b.value - a.value));
    if (spec.limit) data = data.slice(0, spec.limit);
  }
  return { ds, measure, dim, rows: rows.length, total: agg(rows), data };
}

export function describe(spec: RadarSpec, s: RadarState) {
  const { ds, measure, dim } = runSpec(spec, s, 'global');
  const where = spec.projectId ? ` em ${s.projects.find((p) => p.id === spec.projectId)?.name}` : '';
  return `${measure === ds.measures.find((m) => m.agg === 'count') ? `${ds.label}` : measure.label}${spec.openOnly ? ' em aberto' : ''}${dim ? ` por ${dim.label.toLowerCase()}` : ''}${where}${spec.limit ? ` · top ${spec.limit}` : ''}`;
}

export function formatValue(value: number, format: Format) {
  if (format === 'money') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  if (format === 'pct') return `${value}%`;
  if (format === 'h') return `${value.toLocaleString('pt-BR')}h`;
  if (format === 'm2') return `${value.toLocaleString('pt-BR')} m²`;
  return value.toLocaleString('pt-BR');
}
