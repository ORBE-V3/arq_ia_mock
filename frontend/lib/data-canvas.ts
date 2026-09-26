// Data canvas: virtual tables over the demo state, spreadsheet-style joins (PROCX / CONT.SE / SOMASE) and dashboard math.
// Pure module (no React, no aliases) so data-canvas.check.ts runs under plain node.
// ponytail: external tables (ERP SQL, Medições.xlsx) are generated deterministically from the projects; swap buildTables' generators for real connector reads.

export type FieldType = 'text' | 'num' | 'money' | 'pct' | 'month';
export type Field = { key: string; label: string; type: FieldType };
export type TableKind = 'sql' | 'sheet' | 'app' | 'docs';
export type Row = Record<string, string | number>;
export type Table = { id: string; name: string; kind: TableKind; description: string; fields: Field[]; rows: Row[] };
export type JoinMode = 'PROCX' | 'CONT.SE' | 'SOMASE';
export type Edge = { id: string; from: { table: string; field: string }; to: { table: string; field: string }; mode: JoinMode; sumField?: string };
export type CanvasNode = { table: string; x: number; y: number };
export type CanvasModel = { nodes: CanvasNode[]; edges: Edge[]; base: string };
export type Filters = { from?: string; to?: string; client?: string; risk?: string; projectId?: string };

export type CanvasState = {
  projects: { id: string; name: string; client: string; owner: string; status: string; risk: string; revenue: number; cost: number; hours: number; progress: number }[];
  pendings: { projectId: string; status: string; priority: string }[];
  documents: { projectId: string; category: string; kind?: string }[];
};

export const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const SUPPLIERS: [string, string][] = [['Votorantim Cimentos', 'Estrutura'], ['Gerdau', 'Estrutura'], ['Tigre', 'Hidráulica'], ['Deca', 'Louças e metais'], ['Portobello', 'Revestimentos'], ['Suvinil', 'Pintura'], ['Eucatex', 'Forros'], ['Tramontina', 'Elétrica']];

// Deterministic 0..1 from a string, so the "external" data is stable between renders and sessions.
function rand(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export function buildTables(s: CanvasState, scopeId: string): Table[] {
  const projects = s.projects.filter((p) => scopeId === 'global' || p.id === scopeId);
  const overrun = (p: CanvasState['projects'][number]) => (p.risk === 'Alto' ? 1.18 : p.risk === 'Médio' ? 1.05 : 0.96) + (rand(p.id + 'o') - 0.5) * 0.12;
  const measured = (p: CanvasState['projects'][number]) => Math.max(8, Math.min(100, Math.round(p.progress + (rand(p.id + 'm') - 0.5) * 16)));
  const erp: Row[] = [];
  for (const p of projects) {
    const spent = p.cost * (measured(p) / 100) * overrun(p);
    const suppliers = [0, 1, 2].map((i) => SUPPLIERS[Math.floor(rand(p.id + 's' + i) * SUPPLIERS.length)]);
    MONTHS.forEach((mes, mi) => suppliers.forEach(([fornecedor, categoria], si) => {
      const weight = (0.6 + rand(p.id + mes + si)) * (0.7 + mi * 0.12);
      erp.push({ projeto_id: p.id, mes, fornecedor, categoria, custo_real: Math.round((spent / (MONTHS.length * suppliers.length)) * weight) });
    }));
  }
  return [
    { id: 'erp', name: 'ERP · Custos de obra', kind: 'sql', description: 'SQL Server · tabela lancamentos_custo', fields: [{ key: 'projeto_id', label: 'projeto_id', type: 'text' }, { key: 'mes', label: 'mes', type: 'month' }, { key: 'fornecedor', label: 'fornecedor', type: 'text' }, { key: 'categoria', label: 'categoria', type: 'text' }, { key: 'custo_real', label: 'custo_real', type: 'money' }], rows: erp },
    { id: 'projects', name: 'Projetos', kind: 'app', description: 'Cadastro do ARQ.AI', fields: [{ key: 'id', label: 'id', type: 'text' }, { key: 'nome', label: 'nome', type: 'text' }, { key: 'cliente', label: 'cliente', type: 'text' }, { key: 'responsavel', label: 'responsavel', type: 'text' }, { key: 'risco', label: 'risco', type: 'text' }, { key: 'orcado', label: 'orcado', type: 'money' }, { key: 'receita', label: 'receita', type: 'money' }, { key: 'horas', label: 'horas', type: 'num' }],
      rows: projects.map((p) => ({ id: p.id, nome: p.name, cliente: p.client, responsavel: p.owner, risco: p.risk, orcado: p.cost, receita: p.revenue, horas: p.hours })) },
    { id: 'sheet', name: 'Medições de obra.xlsx', kind: 'sheet', description: 'Planilha da equipe de obra · aba Medições', fields: [{ key: 'projeto', label: 'projeto', type: 'text' }, { key: 'medicao_pct', label: 'medicao_pct', type: 'pct' }, { key: 'fiscal', label: 'fiscal', type: 'text' }],
      rows: projects.map((p) => ({ projeto: p.name, medicao_pct: measured(p), fiscal: ['Rafael Lima', 'Júlia Rocha', 'Marcos Paiva'][Math.floor(rand(p.id + 'f') * 3)] })) },
    { id: 'pendings', name: 'Pendências', kind: 'app', description: 'Pendências do ARQ.AI', fields: [{ key: 'projectId', label: 'projectId', type: 'text' }, { key: 'status', label: 'status', type: 'text' }, { key: 'priority', label: 'prioridade', type: 'text' }],
      rows: s.pendings.filter((p) => projects.some((x) => x.id === p.projectId) && p.status !== 'Concluída').map((p) => ({ projectId: p.projectId, status: p.status, priority: p.priority })) },
    { id: 'docs', name: 'Documentos do projeto', kind: 'docs', description: 'ArqDocs · arquivos e bases', fields: [{ key: 'projectId', label: 'projectId', type: 'text' }, { key: 'category', label: 'categoria', type: 'text' }],
      rows: s.documents.filter((d) => projects.some((x) => x.id === d.projectId)).map((d) => ({ projectId: d.projectId, category: d.category })) },
  ];
}

// The joins the AI proposes: same-meaning keys across tables.
export function suggestEdges(): Edge[] {
  return [
    { id: 'e1', from: { table: 'erp', field: 'projeto_id' }, to: { table: 'projects', field: 'id' }, mode: 'PROCX' },
    { id: 'e2', from: { table: 'projects', field: 'nome' }, to: { table: 'sheet', field: 'projeto' }, mode: 'PROCX' },
    { id: 'e3', from: { table: 'projects', field: 'id' }, to: { table: 'pendings', field: 'projectId' }, mode: 'CONT.SE' },
    { id: 'e4', from: { table: 'projects', field: 'id' }, to: { table: 'docs', field: 'projectId' }, mode: 'CONT.SE' },
  ];
}

// Enrich base rows by walking edges out from the base (multi-hop). Column names are `table.field`.
export function joinRows(model: CanvasModel, tables: Table[]) {
  const byId = new Map(tables.map((t) => [t.id, t]));
  const base = byId.get(model.base);
  if (!base) return { rows: [] as Row[], reached: new Set<string>() };
  const reached = new Set([base.id]);
  let rows: Row[] = base.rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [`${base.id}.${k}`, v])));
  const present = new Set(model.nodes.map((n) => n.table));
  let progress = true;
  while (progress) {
    progress = false;
    for (const e of model.edges) {
      const forward = reached.has(e.from.table) && !reached.has(e.to.table);
      const backward = reached.has(e.to.table) && !reached.has(e.from.table) && e.mode === 'PROCX';
      if (!forward && !backward) continue;
      const [near, far] = forward ? [e.from, e.to] : [e.to, e.from];
      const target = byId.get(far.table);
      if (!target || !present.has(far.table)) continue;
      const index = new Map<string, Row[]>();
      target.rows.forEach((r) => index.set(String(r[far.field]), [...(index.get(String(r[far.field])) ?? []), r]));
      rows = rows.map((row) => {
        const matches = index.get(String(row[`${near.table}.${near.field}`])) ?? [];
        if (e.mode === 'PROCX') return { ...row, ...Object.fromEntries(Object.entries(matches[0] ?? {}).map(([k, v]) => [`${far.table}.${k}`, v])) };
        if (e.mode === 'CONT.SE') return { ...row, [`${far.table}.count`]: matches.length };
        return { ...row, [`${far.table}.sum`]: matches.reduce((t, m) => t + Number(m[e.sumField ?? ''] || 0), 0) };
      });
      reached.add(far.table);
      progress = true;
    }
  }
  return { rows, reached };
}

export function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

export type ProjectLine = { id: string; nome: string; cliente: string; risco: string; orcado: number; real: number; desvio: number; medicao?: number; pendencias?: number; documentos?: number };

export function computeDashboard(model: CanvasModel, tables: Table[], f: Filters) {
  const { rows: joined, reached } = joinRows(model, tables);
  const has = { projects: reached.has('projects'), sheet: reached.has('sheet'), pendings: reached.has('pendings'), docs: reached.has('docs') };
  const rows = joined.filter((r) => (!f.from || String(r['erp.mes']) >= f.from) && (!f.to || String(r['erp.mes']) <= f.to) && (!f.client || r['projects.cliente'] === f.client) && (!f.risk || r['projects.risco'] === f.risk) && (!f.projectId || r['erp.projeto_id'] === f.projectId));
  const sum = (list: Row[], key: string) => list.reduce((t, r) => t + Number(r[key] || 0), 0);
  const byMonth = MONTHS.filter((m) => (!f.from || m >= f.from) && (!f.to || m <= f.to)).map((m) => ({ name: m, value: sum(rows.filter((r) => r['erp.mes'] === m), 'erp.custo_real') }));
  const supplierMap = new Map<string, number>();
  rows.forEach((r) => supplierMap.set(String(r['erp.fornecedor']), (supplierMap.get(String(r['erp.fornecedor'])) ?? 0) + Number(r['erp.custo_real'])));
  const bySupplier = [...supplierMap].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const groups = new Map<string, Row[]>();
  rows.forEach((r) => groups.set(String(r['erp.projeto_id']), [...(groups.get(String(r['erp.projeto_id'])) ?? []), r]));
  const lines: ProjectLine[] = [...groups].map(([id, list]) => {
    const r = list[0];
    const orcado = Number(r['projects.orcado'] || 0);
    const real = sum(list, 'erp.custo_real');
    return { id, nome: String(r['projects.nome'] ?? id), cliente: String(r['projects.cliente'] ?? '—'), risco: String(r['projects.risco'] ?? '—'), orcado, real, desvio: orcado && has.sheet ? Math.round((real / (orcado * (Number(r['sheet.medicao_pct']) / 100)) - 1) * 100) : 0, medicao: has.sheet ? Number(r['sheet.medicao_pct']) : undefined, pendencias: has.pendings ? Number(r['pendings.count']) : undefined, documentos: has.docs ? Number(r['docs.count']) : undefined };
  }).sort((a, b) => b.desvio - a.desvio);
  const real = sum(rows, 'erp.custo_real');
  const orcado = lines.reduce((t, l) => t + l.orcado, 0);
  const expected = has.sheet ? lines.reduce((t, l) => t + l.orcado * ((l.medicao ?? 0) / 100), 0) : 0;
  const scatter = has.sheet ? lines.map((l) => ({ name: l.nome, x: l.medicao ?? 0, y: l.desvio })) : [];
  const rDesvioPend = has.sheet && has.pendings ? pearson(lines.map((l) => l.pendencias ?? 0), lines.map((l) => l.desvio)) : null;
  const rMedicaoReal = has.sheet ? pearson(lines.map((l) => l.medicao ?? 0), lines.map((l) => (l.orcado ? l.real / l.orcado : 0))) : null;
  return { has, rows: rows.length, real, orcado, expected, desvioTotal: expected ? Math.round((real / expected - 1) * 100) : null, byMonth, bySupplier, lines, scatter, rDesvioPend, rMedicaoReal };
}

export type Dashboard = ReturnType<typeof computeDashboard>;

export function insights(d: Dashboard, money: (v: number) => string) {
  const out: string[] = [];
  if (d.desvioTotal !== null) out.push(`O custo lançado no ERP está ${Math.abs(d.desvioTotal)}% ${d.desvioTotal >= 0 ? 'acima' : 'abaixo'} do esperado para o avanço medido (${money(d.real)} contra ${money(d.expected)}).`);
  const worst = d.lines[0];
  if (worst && d.has.sheet && worst.desvio > 5) out.push(`${worst.nome} concentra o maior desvio: ${worst.desvio}% acima do previsto com ${worst.medicao}% medido. Priorize a revisão desse contrato.`);
  const top = d.bySupplier[0];
  if (top && d.real) out.push(`${top.name} responde por ${Math.round((top.value / d.real) * 100)}% do custo do período. Vale renegociar ou cotar alternativas.`);
  if (d.rMedicaoReal !== null) out.push(`Correlação entre medição e custo realizado: r = ${d.rMedicaoReal.toFixed(2).replace('.', ',')}${Math.abs(d.rMedicaoReal) > 0.6 ? ', forte. O custo acompanha o avanço físico.' : ', fraca. Há gasto descolado do avanço da obra.'}`);
  if (d.rDesvioPend !== null && Math.abs(d.rDesvioPend) > 0.3) out.push(`Projetos com mais pendências abertas tendem a ter ${d.rDesvioPend > 0 ? 'maior' : 'menor'} desvio (r = ${d.rDesvioPend.toFixed(2).replace('.', ',')}).`);
  if (!d.has.sheet) out.push('Ligue a planilha de medições para comparar custo com avanço físico e ver desvios reais.');
  return out;
}
