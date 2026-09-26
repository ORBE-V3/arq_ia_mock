'use client';

import '@/app/agents.css';
import { useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { ImageDown, CalendarClock, Check, Database, FileSpreadsheet, FileText, Link2, LoaderCircle, Mail, Plus, Send, Sparkles, Table2, Trash2, WandSparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDemo } from '@/hooks/use-demo';
import { MONTHS, buildTables, computeDashboard, insights, suggestEdges } from '@/lib/data-canvas';
import type { CanvasModel, CanvasState, Edge, Filters, JoinMode, TableKind } from '@/lib/data-canvas';
import { downloadOutput } from '@/lib/export-output';
import { blobToBase64, downloadBlob, nodeToPng } from '@/lib/dom-png';
import type { RadarSchedule, RadarView } from '@/types';

const NODE_W = 232;
const HEAD_H = 50;
const FIELD_H = 28;
const layout: Record<string, { x: number; y: number }> = { erp: { x: 16, y: 70 }, projects: { x: 300, y: 16 }, sheet: { x: 590, y: 16 }, pendings: { x: 590, y: 184 }, docs: { x: 590, y: 352 } };
const kindIcon: Record<TableKind, typeof Database> = { sql: Database, sheet: FileSpreadsheet, app: Table2, docs: FileText };
const kindLabel: Record<TableKind, string> = { sql: 'Banco SQL', sheet: 'Planilha', app: 'ARQ.AI', docs: 'ArqDocs' };
const modes: JoinMode[] = ['PROCX', 'CONT.SE'];
const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const compact = (v: number) => (Math.abs(v) >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} mi` : Math.abs(v) >= 1e3 ? `R$ ${Math.round(v / 1e3)} mil` : money(v));
const monthLabel = (m: string) => new Date(`${m}-01T12:00`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
const tooltipStyle = { background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--foreground)', boxShadow: 'var(--shadow)', fontSize: 12 };

export const emptyModel = (): CanvasModel => ({ base: 'erp', nodes: [{ table: 'erp', ...layout.erp }], edges: [] });

function useTables(scopeId: string) {
  const demo = useDemo();
  return buildTables(demo as unknown as CanvasState, scopeId);
}

// ---------- Canvas builder ----------

export function CanvasBuilder({ scopeId, initial, author, onSave, onCancel }: { scopeId: string; initial: RadarView | null; author: string; onSave: (view: RadarView) => void; onCancel: () => void }) {
  const tables = useTables(scopeId);
  const [model, setModel] = useState<CanvasModel>(initial?.model ?? emptyModel());
  const [linking, setLinking] = useState<{ table: string; field: string } | null>(null);
  const [phase, setPhase] = useState<'build' | 'analyzing' | 'done'>(initial ? 'done' : 'build');
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? 'Custo realizado × medição de obra');
  const drag = useRef<{ table: string; dx: number; dy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const byId = new Map(tables.map((t) => [t.id, t]));
  const onCanvas = new Set(model.nodes.map((n) => n.table));

  const addNode = (id: string) => setModel((m) => (m.nodes.some((n) => n.table === id) ? m : { ...m, nodes: [...m.nodes, { table: id, ...(layout[id] ?? { x: 40, y: 40 }) }] }));
  const removeNode = (id: string) => setModel((m) => ({ ...m, nodes: m.nodes.filter((n) => n.table !== id), edges: m.edges.filter((e) => e.from.table !== id && e.to.table !== id) }));
  function suggest() {
    setModel((m) => ({ ...m, nodes: tables.map((t) => m.nodes.find((n) => n.table === t.id) ?? { table: t.id, ...layout[t.id] }), edges: suggestEdges() }));
  }
  function clickField(table: string, field: string) {
    if (!linking) return setLinking({ table, field });
    if (linking.table === table) return setLinking(linking.field === field ? null : { table, field });
    const target = byId.get(table)!;
    const unique = new Set(target.rows.map((r) => r[field])).size === target.rows.length;
    const edge: Edge = { id: `e-${crypto.randomUUID().slice(0, 6)}`, from: linking, to: { table, field }, mode: unique ? 'PROCX' : 'CONT.SE' };
    setModel((m) => ({ ...m, edges: [...m.edges.filter((e) => !(e.from.table === edge.from.table && e.to.table === edge.to.table)), edge] }));
    setLinking(null);
  }
  const cycle = (id: string) => setModel((m) => ({ ...m, edges: m.edges.map((e) => (e.id === id ? { ...e, mode: modes[(modes.indexOf(e.mode) + 1) % modes.length] } : e)) }));
  const removeEdge = (id: string) => setModel((m) => ({ ...m, edges: m.edges.filter((e) => e.id !== id) }));

  function onPointerMove(event: React.PointerEvent) {
    if (!drag.current || !canvasRef.current) return;
    const box = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, event.clientX - box.left - drag.current.dx + canvasRef.current.scrollLeft);
    const y = Math.max(0, event.clientY - box.top - drag.current.dy + canvasRef.current.scrollTop);
    const t = drag.current.table;
    setModel((m) => ({ ...m, nodes: m.nodes.map((n) => (n.table === t ? { ...n, x, y } : n)) }));
  }

  const steps = [
    `Lendo ${byId.get('erp')?.rows.length ?? 0} lançamentos do ERP · Custos de obra`,
    ...model.edges.map((e) => `${e.mode} ${e.from.table}.${e.from.field} → ${byId.get(e.to.table)?.name}.${e.to.field}`),
    'Aplicando cortes de data por mês de lançamento',
    'Calculando desvio sobre o avanço medido e correlações',
    'Montando visualizações e escrevendo a análise',
  ];
  async function generate() {
    setPhase('analyzing');
    for (let i = 0; i < steps.length; i++) { setStep(i); await new Promise((r) => setTimeout(r, 520)); }
    setPhase('done');
  }

  const portY = (table: string, field: string) => {
    const node = model.nodes.find((n) => n.table === table)!;
    return node.y + HEAD_H + byId.get(table)!.fields.findIndex((f) => f.key === field) * FIELD_H + FIELD_H / 2;
  };
  const edgesDrawable = model.edges.filter((e) => onCanvas.has(e.from.table) && onCanvas.has(e.to.table));
  const width = Math.max(900, ...model.nodes.map((n) => n.x + NODE_W + 40));
  const height = Math.max(520, ...model.nodes.map((n) => n.y + HEAD_H + (byId.get(n.table)?.fields.length ?? 0) * FIELD_H + 40));

  if (phase === 'done') return <div className="dc">
    <CanvasDashboard model={model} scopeId={scopeId} title={title} />
    <div className="rv-save">
      <button type="button" className="btn" onClick={() => setPhase('build')}><Link2 size={14} />Voltar às ligações</button>
      <label><span className="sr-only">Nome do dashboard</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome do dashboard" /></label>
      <button type="button" className="btn" onClick={onCancel}><X size={14} />Cancelar</button>
      <button type="button" className="btn primary" disabled={!title.trim()} onClick={() => onSave({ id: initial?.id ?? `rv-${crypto.randomUUID().slice(0, 8)}`, scope: scopeId, title: title.trim(), prompt: `Dashboard conectado · ${model.nodes.length} fontes, ${model.edges.length} ligações`, spec: { dataset: 'projects', measure: 'count', dim: null, chart: 'kpi', order: 'desc' }, author, date: new Date().toISOString().slice(0, 10), kind: 'canvas', model })}>{initial ? 'Salvar alterações' : 'Salvar como aba'}</button>
    </div>
  </div>;

  return <div className="dc">
    <div className="dc-toolbar">
      <div><strong>Ligue as fontes</strong><small>Arraste pelo título. Clique num campo e depois no campo correspondente de outra fonte para criar a ligação.</small></div>
      <button type="button" className="btn" onClick={suggest}><WandSparkles size={14} />IA: sugerir ligações</button>
      <button type="button" className="btn primary" disabled={!model.edges.length || phase === 'analyzing'} onClick={() => void generate()}>{phase === 'analyzing' ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}Gerar dashboard</button>
    </div>
    <div className="dc-body">
      <aside className="dc-palette" aria-label="Fontes disponíveis">
        <h4>Fontes disponíveis</h4>
        {tables.map((t) => { const Icon = kindIcon[t.kind]; return <button type="button" key={t.id} disabled={onCanvas.has(t.id)} onClick={() => addNode(t.id)}><Icon size={15} /><span><strong>{t.name}</strong><small>{kindLabel[t.kind]} · {t.rows.length} linhas</small></span>{onCanvas.has(t.id) ? <Check size={14} /> : <Plus size={14} />}</button>; })}
        <p>Bases conectadas no ArqDocs aparecem aqui automaticamente.</p>
      </aside>
      <div className="dc-canvas" ref={canvasRef} onPointerMove={onPointerMove} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
        <div className="dc-plane" style={{ width, height }}>
          <svg className="dc-edges" width={width} height={height} aria-hidden="true">
            {edgesDrawable.map((e) => {
              const a = model.nodes.find((n) => n.table === e.from.table)!;
              const b = model.nodes.find((n) => n.table === e.to.table)!;
              const rightward = b.x >= a.x;
              const x1 = rightward ? a.x + NODE_W : a.x;
              const x2 = rightward ? b.x : b.x + NODE_W;
              const y1 = portY(e.from.table, e.from.field);
              const y2 = portY(e.to.table, e.to.field);
              const bend = Math.max(60, Math.abs(x2 - x1) / 2) * (rightward ? 1 : -1);
              return <path key={e.id} d={`M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`} className={`dc-edge m-${e.mode === 'PROCX' ? 'x' : 'c'}`} />;
            })}
          </svg>
          {edgesDrawable.map((e) => {
            const a = model.nodes.find((n) => n.table === e.from.table)!;
            const b = model.nodes.find((n) => n.table === e.to.table)!;
            const x = ((b.x >= a.x ? a.x + NODE_W : a.x) + (b.x >= a.x ? b.x : b.x + NODE_W)) / 2;
            const y = (portY(e.from.table, e.from.field) + portY(e.to.table, e.to.field)) / 2;
            return <div className="dc-edge-label" key={e.id} style={{ left: x, top: y }}><button type="button" title="Trocar tipo de ligação" onClick={() => cycle(e.id)}>{e.mode}</button><button type="button" aria-label="Remover ligação" onClick={() => removeEdge(e.id)}><X size={10} /></button></div>;
          })}
          {model.nodes.map((n) => {
            const t = byId.get(n.table);
            if (!t) return null;
            const Icon = kindIcon[t.kind];
            return <div className={`dc-node k-${t.kind} ${model.base === t.id ? 'base' : ''}`} key={n.table} style={{ left: n.x, top: n.y, width: NODE_W }}>
              <header onPointerDown={(event) => { const box = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect(); drag.current = { table: n.table, dx: event.clientX - box.left, dy: event.clientY - box.top }; (event.target as HTMLElement).setPointerCapture?.(event.pointerId); }}>
                <Icon size={15} /><span><strong>{t.name}</strong><small>{model.base === t.id ? 'Tabela base · ' : ''}{t.rows.length} linhas</small></span>
                {model.base !== t.id && <button type="button" aria-label={`Remover ${t.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => removeNode(t.id)}><X size={12} /></button>}
              </header>
              <ul>{t.fields.map((f) => { const on = linking?.table === t.id && linking.field === f.key; const linked = model.edges.some((e) => (e.from.table === t.id && e.from.field === f.key) || (e.to.table === t.id && e.to.field === f.key)); return <li key={f.key}><button type="button" className={`${on ? 'on' : ''} ${linked ? 'linked' : ''}`} onClick={() => clickField(t.id, f.key)}><i />{f.label}<em>{f.type === 'money' ? 'R$' : f.type === 'month' ? 'data' : f.type === 'pct' ? '%' : f.type === 'num' ? '123' : 'abc'}</em></button></li>; })}</ul>
            </div>;
          })}
        </div>
        {linking && <div className="dc-hint">Ligando <b>{byId.get(linking.table)?.name}.{linking.field}</b>: clique no campo correspondente em outra fonte. <button type="button" onClick={() => setLinking(null)}>Cancelar</button></div>}
      </div>
    </div>
    {phase === 'analyzing' && <div className="dc-analyzing" aria-live="polite"><Sparkles size={16} /><ul>{steps.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{i < step ? <Check size={12} /> : i === step ? <LoaderCircle className="spin" size={12} /> : <i />}{s}</li>)}</ul></div>}
    <div className="rv-save"><button type="button" className="btn" onClick={onCancel}><X size={14} />Cancelar</button></div>
  </div>;
}

// ---------- Dashboard ----------

export function CanvasDashboard({ model, scopeId, title, viewId }: { model: CanvasModel; scopeId: string; title: string; viewId?: string }) {
  const demo = useDemo();
  const tables = useTables(scopeId);
  const [filters, setFilters] = useState<Filters>({});
  const [sendOpen, setSendOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const capture = () => nodeToPng(rootRef.current!);
  const d = computeDashboard(model, tables, filters);
  const notes = insights(d, compact);
  const projects = tables.find((t) => t.id === 'projects')?.rows ?? [];
  const clients = [...new Set(projects.map((p) => String(p.cliente)))];
  const set = (patch: Filters) => setFilters((f) => ({ ...f, ...patch }));
  const schedules = demo.radarSchedules.filter((s) => viewId && s.viewId === viewId);
  const hasFinancial = demo.radarAccess.financial;

  if (!model.nodes.some((n) => n.table === 'erp')) return <div className="rv-card rv-empty"><strong>Adicione uma base com lançamentos por data</strong><p>O dashboard conectado usa o ERP · Custos de obra como tabela base.</p></div>;
  if (!hasFinancial) return <div className="rv-card rv-locked"><strong>Dados financeiros restritos</strong><p>Este dashboard cruza custos do ERP. Peça liberação financeira a um administrador.</p></div>;

  return <div className="dd" ref={rootRef}>
    <div className="dd-head">
      <div><h2>{title}</h2><p>{model.nodes.length} fontes · {model.edges.length} ligações · {d.rows} linhas cruzadas</p></div>
      <div className="dd-head-actions" data-png-skip><button type="button" className="btn" onClick={() => void capture().then((b) => downloadBlob(b, `${title}.png`)).catch(() => demo.notice('Não foi possível gerar o PNG neste navegador.'))}><ImageDown size={14} />Exportar PNG</button><button type="button" className="btn primary" onClick={() => setSendOpen(true)}><Mail size={14} />Enviar ou agendar</button></div>
    </div>
    <div className="dd-filters">
      <label>De<select value={filters.from ?? ''} onChange={(event) => set({ from: event.target.value || undefined })}><option value="">Início</option>{MONTHS.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
      <label>Até<select value={filters.to ?? ''} onChange={(event) => set({ to: event.target.value || undefined })}><option value="">Hoje</option>{MONTHS.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
      {d.has.projects && <label>Cliente<select value={filters.client ?? ''} onChange={(event) => set({ client: event.target.value || undefined })}><option value="">Todos</option>{clients.map((c) => <option key={c}>{c}</option>)}</select></label>}
      {d.has.projects && <label>Risco<select value={filters.risk ?? ''} onChange={(event) => set({ risk: event.target.value || undefined })}><option value="">Todos</option>{['Baixo', 'Médio', 'Alto'].map((r) => <option key={r}>{r}</option>)}</select></label>}
      {scopeId === 'global' && d.has.projects && <label>Projeto<select value={filters.projectId ?? ''} onChange={(event) => set({ projectId: event.target.value || undefined })}><option value="">Todos</option>{projects.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.nome)}</option>)}</select></label>}
      {Object.values(filters).some(Boolean) && <button type="button" data-png-skip className="dd-clear" onClick={() => setFilters({})}>Limpar filtros</button>}
    </div>

    <div className="dd-kpis">
      <div><small>Custo realizado (ERP)</small><b>{compact(d.real)}</b></div>
      <div><small>Orçado nos projetos</small><b>{d.has.projects ? compact(d.orcado) : '—'}</b></div>
      <div><small>Esperado pelo avanço medido</small><b>{d.has.sheet ? compact(d.expected) : '—'}</b></div>
      <div className={d.desvioTotal !== null && d.desvioTotal > 5 ? 'warn' : ''}><small>Desvio sobre o esperado</small><b>{d.desvioTotal !== null ? `${d.desvioTotal > 0 ? '+' : ''}${d.desvioTotal}%` : '—'}</b></div>
    </div>

    <section className="dd-ai"><header><Sparkles size={15} /><strong>Análise da IA</strong><small>gerada sobre os dados filtrados</small></header><ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul></section>

    <div className="dd-grid">
      <div className="rv-card"><div className="rv-card-head"><div><strong>Custo realizado por mês</strong><small>Soma dos lançamentos do ERP</small></div></div>
        <ResponsiveContainer width="100%" height={240}><LineChart data={d.byMonth} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: 'var(--muted-text)' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(v) => compact(Number(v))} tick={{ fontSize: 11, fill: 'var(--muted-text)' }} axisLine={false} tickLine={false} width={78} /><Tooltip contentStyle={tooltipStyle} labelFormatter={(m) => monthLabel(String(m))} formatter={(v) => [money(Number(v)), 'Custo realizado']} cursor={{ stroke: 'var(--border-strong)' }} /><Line dataKey="value" stroke="var(--rv-1)" strokeWidth={2} dot={{ r: 4, fill: 'var(--rv-1)', stroke: 'var(--surface)', strokeWidth: 2 }} /></LineChart></ResponsiveContainer>
      </div>
      <div className="rv-card"><div className="rv-card-head"><div><strong>Custo por fornecedor</strong><small>Top 6 no período</small></div></div>
        <ResponsiveContainer width="100%" height={240}><BarChart data={d.bySupplier.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 74, left: 4, bottom: 0 }} barCategoryGap={6}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: 'var(--foreground)' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(Number(v)), 'Custo']} cursor={{ fill: 'var(--soft)' }} /><Bar dataKey="value" fill="var(--rv-2)" radius={[0, 4, 4, 0]} maxBarSize={20}><LabelList dataKey="value" position="right" formatter={(v) => compact(Number(v))} style={{ fontSize: 11, fill: 'var(--muted-text)' }} /></Bar></BarChart></ResponsiveContainer>
      </div>
      <div className="rv-card dd-wide"><div className="rv-card-head"><div><strong>Medição × desvio de custo</strong><small>{d.has.sheet ? `Cada ponto é um projeto · r = ${(d.rMedicaoReal ?? 0).toFixed(2).replace('.', ',')} entre avanço e gasto` : 'Ligue Medições de obra.xlsx para ver a correlação'}</small></div></div>
        {d.has.sheet ? <ResponsiveContainer width="100%" height={260}><ScatterChart margin={{ top: 12, right: 20, left: 0, bottom: 8 }}><CartesianGrid stroke="var(--chart-grid)" /><XAxis type="number" dataKey="x" name="Medição" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-text)' }} axisLine={false} tickLine={false} label={{ value: 'Avanço medido', position: 'insideBottom', offset: -4, fontSize: 11, fill: 'var(--muted-text)' }} /><YAxis type="number" dataKey="y" name="Desvio" unit="%" tick={{ fontSize: 11, fill: 'var(--muted-text)' }} axisLine={false} tickLine={false} width={48} /><ZAxis range={[70, 70]} /><Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [`${String(v)}%`, n]} labelFormatter={() => ''} /><Scatter data={d.scatter} fill="var(--rv-1)" stroke="var(--surface)" strokeWidth={2} /></ScatterChart></ResponsiveContainer> : <div className="dd-missing"><FileSpreadsheet size={20} />Sem a planilha, não há avanço físico para comparar com o gasto.</div>}
      </div>
    </div>

    <div className="rv-card"><div className="rv-card-head"><div><strong>Visão cruzada por projeto</strong><small>Colunas trazidas por PROCX e CONT.SE a partir das ligações</small></div></div>
      <div className="dd-table-wrap"><table className="rv-table dd-table"><thead><tr><th>Projeto</th>{d.has.projects && <th>Cliente</th>}{d.has.projects && <th>Orçado</th>}<th>Realizado</th>{d.has.sheet && <th>Medição</th>}{d.has.sheet && <th>Desvio</th>}{d.has.pendings && <th>Pendências</th>}{d.has.docs && <th>Documentos</th>}</tr></thead>
        <tbody>{d.lines.slice(0, 12).map((l) => <tr key={l.id}><td>{l.nome}</td>{d.has.projects && <td>{l.cliente}</td>}{d.has.projects && <td>{compact(l.orcado)}</td>}<td>{compact(l.real)}</td>{d.has.sheet && <td>{l.medicao}%</td>}{d.has.sheet && <td className={l.desvio > 10 ? 'bad' : l.desvio < -5 ? 'good' : ''}>{l.desvio > 0 ? '+' : ''}{l.desvio}%</td>}{d.has.pendings && <td>{l.pendencias}</td>}{d.has.docs && <td>{l.documentos}</td>}</tr>)}</tbody></table></div>
      {d.lines.length > 12 && <footer className="rv-sources">Mostrando 12 de {d.lines.length} projetos, ordenados pelo maior desvio.</footer>}
    </div>

    {schedules.length > 0 && <div className="dd-schedules" data-png-skip><CalendarClock size={15} /><strong>Envios agendados</strong>{schedules.map((s) => <span key={s.id}>{s.title} · {freqLabel(s)} para {s.to}<button type="button" aria-label="Cancelar envio" onClick={() => demo.update((state) => ({ ...state, radarSchedules: state.radarSchedules.filter((x) => x.id !== s.id) }))}><Trash2 size={12} /></button></span>)}</div>}
    <SendDialog open={sendOpen} onOpenChange={setSendOpen} capture={capture} title={title} viewId={viewId} scopeId={scopeId} body={[`Filtros: ${describeFilters(filters)}`, '', ...notes, '', ...d.lines.slice(0, 10).map((l) => `${l.nome}: realizado ${compact(l.real)}${d.has.sheet ? ` · medição ${l.medicao}% · desvio ${l.desvio > 0 ? '+' : ''}${l.desvio}%` : ''}`)].join('\n')} />
  </div>;
}

const describeFilters = (f: Filters) => [f.from && `de ${monthLabel(f.from)}`, f.to && `até ${monthLabel(f.to)}`, f.client && `cliente ${f.client}`, f.risk && `risco ${f.risk}`].filter(Boolean).join(', ') || 'nenhum';
const weekdays = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];
const freqLabel = (s: RadarSchedule) => (s.freq === 'daily' ? `todo dia às ${s.time}` : s.freq === 'weekly' ? `toda ${s.weekday} às ${s.time}` : `todo dia 1º às ${s.time}`);

function SendDialog({ open, onOpenChange, capture, title, viewId, scopeId, body }: { open: boolean; onOpenChange: (v: boolean) => void; capture: () => Promise<Blob>; title: string; viewId?: string; scopeId: string; body: string }) {
  const { user, update, notice, projects } = useDemo();
  const [subject, setSubject] = useState(title);
  const [to, setTo] = useState('diretoria@studioarquitetura.com.br');
  const [freq, setFreq] = useState<'now' | RadarSchedule['freq']>('now');
  const [time, setTime] = useState('08:00');
  const [weekday, setWeekday] = useState('segunda');

  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!subject.trim()) return;
    if (freq === 'now') {
      setBusy(true);
      // Dialog is open over the page; the dashboard node itself is still rendered, so capture works.
      const image = await capture().then(blobToBase64).catch(() => undefined);
      setBusy(false);
      downloadOutput({ image, to, title: subject.trim(), body, sources: ['ERP · Custos de obra', 'Medições de obra.xlsx', 'Projetos ARQ.AI'], project: scopeId === 'global' ? 'Organização' : projects.find((p) => p.id === scopeId)?.name ?? '', agent: 'ArqRadar', author: user.name, date: new Date().toISOString().slice(0, 16).replace('T', ' '), template: { name: 'Relatório técnico corporativo', kind: 'Empresa', company: 'Studio Arquitetura' } }, 'EML');
      notice(`"${subject.trim()}" enviado para ${to}.`);
    } else {
      if (!viewId) { notice('Salve o dashboard como aba antes de agendar.'); return; }
      const s: RadarSchedule = { id: `sch-${crypto.randomUUID().slice(0, 6)}`, viewId, scope: scopeId, title: subject.trim(), to, freq, time, weekday: freq === 'weekly' ? weekday : undefined, createdAt: new Date().toISOString().slice(0, 10), author: user.name };
      update((state) => ({ ...state, radarSchedules: [...state.radarSchedules, s] }));
      notice(`Envio agendado: ${freqLabel(s)}.`);
    }
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="project-modal dd-send">
    <DialogHeader><DialogTitle><Send size={18} />Enviar dashboard</DialogTitle><DialogDescription>O dashboard vai como imagem no corpo do e-mail, com a análise da IA e os filtros atuais.</DialogDescription></DialogHeader>
    <label className="field">Título do e-mail<input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
    <label className="field">Para<input value={to} onChange={(event) => setTo(event.target.value)} /></label>
    <fieldset className="aw-fieldset"><legend>Quando</legend><div className="aw-toggle-list">{([['now', 'Enviar agora'], ['daily', 'Diário'], ['weekly', 'Semanal'], ['monthly', 'Mensal']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={freq === id} className={freq === id ? 'on' : ''} onClick={() => setFreq(id)}>{label}</button>)}</div>
      {freq !== 'now' && <div className="dd-when">{freq === 'weekly' && <label>Dia<select value={weekday} onChange={(event) => setWeekday(event.target.value)}>{weekdays.map((w) => <option key={w}>{w}</option>)}</select></label>}<label>Horário<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>{!viewId && <small>Salve o dashboard como aba para agendar.</small>}</div>}
    </fieldset>
    <DialogFooter><button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancelar</button><button type="button" className="btn primary" disabled={busy || !subject.trim() || (freq !== 'now' && !viewId)} onClick={() => void submit()}>{freq === 'now' ? <>{busy ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />}Enviar agora</> : <><CalendarClock size={14} />Agendar envio</>}</button></DialogFooter>
  </DialogContent></Dialog>;
}

