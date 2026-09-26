'use client';

import '@/app/radar.css';
import { useRef, useState } from 'react';
import { downloadBlob, nodeToPng } from '@/lib/dom-png';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CanvasBuilder, CanvasDashboard } from '@/components/radar-canvas';
import { ImageDown, Network, LayoutDashboard, LockKeyhole, Pencil, Plus, Sparkles, Table2, Trash2, WandSparkles, X } from 'lucide-react';
import { useDemo } from '@/hooks/use-demo';
import { datasets, describe, formatValue, parsePrompt, runSpec } from '@/lib/radar-engine';
import type { ChartKind, RadarSpec, RadarState } from '@/lib/radar-engine';
import type { RadarView } from '@/types';

// Validated categorical order (dataviz validator: light + dark pass). Slot i always = i-th category.
const series = ['var(--rv-1)', 'var(--rv-2)', 'var(--rv-3)', 'var(--rv-4)', 'var(--rv-5)', 'var(--rv-6)'];
const tooltipStyle = { background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--foreground)', boxShadow: 'var(--shadow)', fontSize: 12 };
const chartLabels: Record<ChartKind, string> = { bar: 'Barras', line: 'Linha', pie: 'Rosca', table: 'Tabela', kpi: 'Número' };
// Folded remainder is neutral, never a series hue.
const fillFor = (name: string, i: number) => (name === 'Demais' ? 'var(--muted-text)' : series[i]);
const today = () => new Date().toISOString().slice(0, 10);

const suggestionsFor = (scopeId: string) => scopeId === 'global'
  ? ['Margem por projeto', 'Pendências abertas por responsável', 'Documentos por categoria em rosca', 'Uso de agentes por utilizador', 'Receita por cliente top 5', 'Nota do ArqCheck por projeto']
  : ['Pendências abertas por prioridade', 'Documentos por categoria', 'Cards do kanban por coluna', 'Conversas com agentes por utilizador', 'Confiança média da IA por categoria'];

export function RadarStudio({ scopeId, children }: { scopeId: string; children: ReactNode }) {
  const { radarViews, user, update, notice } = useDemo();
  const views = radarViews.filter((v) => v.scope === scopeId);
  const [tab, setTab] = useState<string>('fixed');
  const [editing, setEditing] = useState<RadarView | null>(null);
  const active = views.find((v) => v.id === tab);

  function save(view: RadarView) {
    update((state) => ({ ...state, radarViews: [...state.radarViews.filter((v) => v.id !== view.id), view] }));
    setTab(view.id);
    setEditing(null);
    notice(`Aba "${view.title}" salva.`);
  }
  function remove(view: RadarView) {
    update((state) => ({ ...state, radarViews: state.radarViews.filter((v) => v.id !== view.id) }));
    setTab('fixed');
  }

  return <div className="rv">
    <nav className="rv-tabs" aria-label="Visualizações do Radar">
      <button type="button" className={tab === 'fixed' ? 'on' : ''} onClick={() => setTab('fixed')}><LayoutDashboard size={14} />Painel padrão</button>
      {views.map((v) => <button type="button" key={v.id} className={tab === v.id ? 'on' : ''} onClick={() => setTab(v.id)}>{v.kind === 'canvas' ? <Network size={13} /> : <Sparkles size={13} />}{v.title}</button>)}
      <button type="button" className={`rv-new ${tab === 'new' ? 'on' : ''}`} onClick={() => { setEditing(null); setTab('new'); }}><Plus size={14} />Nova visualização</button>
      <button type="button" className={tab === 'canvas' ? 'on' : ''} onClick={() => { setEditing(null); setTab('canvas'); }}><Network size={14} />Dashboard conectado</button>
    </nav>
    {tab === 'fixed' && children}
    {tab === 'new' && <RadarBuilder key={editing?.id ?? 'new'} scopeId={scopeId} initial={editing} author={user.name} onSave={save} onCancel={() => setTab(editing?.id ?? 'fixed')} />}
    {tab === 'canvas' && <CanvasBuilder key={editing?.id ?? 'new-canvas'} scopeId={scopeId} initial={editing} author={user.name} onSave={save} onCancel={() => setTab(editing?.id ?? 'fixed')} />}
    {active?.kind === 'canvas' && active.model && <div className="rv-view">
      <div className="rv-view-actions rv-view-actions-end"><button type="button" className="btn" onClick={() => { setEditing(active); setTab('canvas'); }}><Pencil size={14} />Editar ligações</button><button type="button" className="btn" aria-label={`Remover ${active.title}`} onClick={() => remove(active)}><Trash2 size={14} /></button></div>
      <CanvasDashboard model={active.model} scopeId={scopeId} title={active.title} viewId={active.id} />
    </div>}
    {active && active.kind !== 'canvas' && <div className="rv-view">
      <header><div><h2>{active.title}</h2><p>“{active.prompt}” · criada por {active.author} em {active.date.split('-').reverse().join('/')}</p></div>
        <div className="rv-view-actions"><button type="button" className="btn" onClick={() => { setEditing(active); setTab('new'); }}><Pencil size={14} />Editar</button><button type="button" className="btn" aria-label={`Remover ${active.title}`} onClick={() => remove(active)}><Trash2 size={14} /></button></div>
      </header>
      <RadarChart spec={active.spec} scopeId={scopeId} />
    </div>}
  </div>;
}

function RadarBuilder({ scopeId, initial, author, onSave, onCancel }: { scopeId: string; initial: RadarView | null; author: string; onSave: (v: RadarView) => void; onCancel: () => void }) {
  const demo = useDemo();
  const state = demo as unknown as RadarState;
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [spec, setSpec] = useState<RadarSpec | null>(initial?.spec ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const all = datasets(state);
  const ds = spec && all.find((d) => d.id === spec.dataset);

  function generate(text = prompt) {
    if (!text.trim()) return;
    setPrompt(text);
    const next = parsePrompt(text, state, scopeId);
    setSpec(next);
    setTitle(describe(next, state).replace(/^./, (c) => c.toUpperCase()));
  }
  const patch = (p: Partial<RadarSpec>) => setSpec((current) => (current ? { ...current, ...p } : current));

  return <div className="rv-builder">
    <form className="rv-prompt" onSubmit={(event) => { event.preventDefault(); generate(); }}>
      <WandSparkles size={18} />
      <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Descreva o que você quer ver. Ex: margem por projeto, pendências abertas por responsável…" aria-label="Descreva a visualização" />
      <button type="submit" className="btn primary" disabled={!prompt.trim()}>Gerar</button>
    </form>
    {!spec && <div className="rv-suggest">{suggestionsFor(scopeId).map((s) => <button type="button" key={s} onClick={() => generate(s)}>{s}</button>)}</div>}
    {spec && ds && <>
      <div className="rv-understood">
        <span>Entendi:</span>
        <label><span className="sr-only">Fonte</span><select value={spec.dataset} onChange={(event) => { const next = all.find((d) => d.id === event.target.value)!; patch({ dataset: next.id, measure: next.measures[0].key, dim: next.dims.find((d) => d.key !== 'project')?.key ?? null, openOnly: false }); }}>{all.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
        <label><span className="sr-only">Medida</span><select value={spec.measure} onChange={(event) => patch({ measure: event.target.value })}>{ds.measures.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
        <span>por</span>
        <label><span className="sr-only">Agrupar por</span><select value={spec.dim ?? ''} onChange={(event) => patch({ dim: event.target.value || null, chart: !event.target.value ? 'kpi' : event.target.value === 'month' ? 'line' : spec.chart === 'kpi' ? 'bar' : spec.chart })}><option value="">Nada (total)</option>{ds.dims.filter((d) => scopeId === 'global' || d.key !== 'project').map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></label>
        <span>como</span>
        <label><span className="sr-only">Gráfico</span><select value={spec.chart} onChange={(event) => patch({ chart: event.target.value as ChartKind })}>{(spec.dim ? ['bar', 'line', 'pie', 'table'] : ['kpi']).map((c) => <option key={c} value={c}>{chartLabels[c as ChartKind]}</option>)}</select></label>
        {ds.openKey && <label className="rv-check"><input type="checkbox" checked={!!spec.openOnly} onChange={(event) => patch({ openOnly: event.target.checked })} />só em aberto</label>}
        {scopeId === 'global' && <label><span className="sr-only">Projeto</span><select value={spec.projectId ?? ''} onChange={(event) => patch({ projectId: event.target.value || undefined })}><option value="">Todos os projetos</option>{demo.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      </div>
      <RadarChart spec={spec} scopeId={scopeId} />
      <div className="rv-save">
        <label><span className="sr-only">Nome da aba</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome da aba" /></label>
        <button type="button" className="btn" onClick={onCancel}><X size={14} />Cancelar</button>
        <button type="button" className="btn primary" disabled={!title.trim()} onClick={() => onSave({ id: initial?.id ?? `rv-${crypto.randomUUID().slice(0, 8)}`, scope: scopeId, title: title.trim(), prompt, spec, author, date: today() })}>{initial ? 'Salvar alterações' : 'Salvar como aba'}</button>
      </div>
    </>}
  </div>;
}

export function RadarChart({ spec, scopeId }: { spec: RadarSpec; scopeId: string }) {
  const demo = useDemo();
  const [asTable, setAsTable] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { ds, measure, dim, rows, total, data } = runSpec(spec, demo as unknown as RadarState, scopeId);
  const fmt = (v: number) => formatValue(v, measure.format);
  const sourceNote = `${rows} ${ds.unit} de ${scopeId === 'global' ? (spec.projectId ? demo.projects.find((p) => p.id === spec.projectId)?.name : 'toda a organização') : demo.projects.find((p) => p.id === scopeId)?.name}`;

  if (measure.financial && !demo.radarAccess.financial) return <div className="rv-card rv-locked"><LockKeyhole size={22} /><strong>Dados financeiros restritos</strong><p>O seu perfil não tem acesso a {measure.label.toLowerCase()}. Peça liberação a um administrador em Configurações.</p></div>;
  if (!rows) return <div className="rv-card rv-empty"><strong>Sem dados para essa combinação</strong><p>Nenhum registro de {ds.label.toLowerCase()} corresponde a esse filtro. Tente outra fonte ou remova o filtro de projeto.</p></div>;

  const pie = spec.chart === 'pie' && data.length > 6 ? [...data.slice(0, 5), { name: 'Demais', value: data.slice(5).reduce((t, d) => t + d.value, 0) }] : data;
  // ponytail: long rankings cap at 12 bars; the table shows everything.
  const capped = !spec.limit && dim?.key !== 'month' && data.length > 12;
  const bars = capped ? data.slice(0, 12) : data;
  const horizontal = data.length > 7 || data.some((d) => d.name.length > 14);
  const showTable = asTable || spec.chart === 'table';

  return <div className="rv-card" ref={cardRef}>
    <div className="rv-card-head"><div><strong>{measure.agg === 'count' ? ds.label : measure.label}{dim ? ` por ${dim.label.toLowerCase()}` : ''}</strong><small>Total {fmt(total)}{measure.agg === 'avg' ? ' (média)' : ''}</small></div>
      <div className="rv-card-actions" data-png-skip>
        {spec.chart !== 'kpi' && spec.chart !== 'table' && <button type="button" className="rv-toggle" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}><Table2 size={14} />{asTable ? 'Ver gráfico' : 'Ver tabela'}</button>}
        <button type="button" className="rv-toggle" onClick={() => void nodeToPng(cardRef.current!).then((b) => downloadBlob(b, `${measure.label}${dim ? ` por ${dim.label}` : ''}.png`)).catch(() => demo.notice('Não foi possível gerar o PNG neste navegador.'))}><ImageDown size={14} />PNG</button>
      </div>
    </div>
    {spec.chart === 'kpi' || !dim ? <div className="rv-kpi"><b>{fmt(total)}</b><span>{measure.agg === 'count' ? ds.unit : measure.label.toLowerCase()}{spec.openOnly ? ' em aberto' : ''}</span></div>
      : showTable ? <table className="rv-table"><thead><tr><th>{dim.label}</th><th>{measure.label}</th></tr></thead><tbody>{data.map((d) => <tr key={d.name}><td>{d.name}</td><td>{fmt(d.value)}</td></tr>)}</tbody></table>
      : spec.chart === 'line' ? <ResponsiveContainer width="100%" height={300}><LineChart data={data} margin={{ top: 16, right: 24, left: 4, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-text)' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={measure.format !== 'num'} tick={{ fontSize: 11, fill: 'var(--muted-text)' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(Number(v))} width={70} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(Number(v)), measure.label]} cursor={{ stroke: 'var(--border-strong)' }} /><Line dataKey="value" stroke="var(--rv-1)" strokeWidth={2} dot={{ r: 4, fill: 'var(--rv-1)', stroke: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer>
      : spec.chart === 'pie' ? <div className="rv-pie"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pie.map((d, i) => ({ ...d, fill: fillFor(d.name, i) }))} dataKey="value" nameKey="name" innerRadius={70} outerRadius={104} paddingAngle={1} stroke="var(--surface)" strokeWidth={2} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} /></PieChart></ResponsiveContainer>
          <ul className="rv-legend">{pie.map((d, i) => <li key={d.name}><i style={{ background: fillFor(d.name, i) }} /><span>{d.name}</span><b>{fmt(d.value)}</b></li>)}</ul></div>
      : <ResponsiveContainer width="100%" height={horizontal ? Math.max(220, bars.length * 34) : 300}>
          {horizontal
            ? <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 72, left: 8, bottom: 0 }} barCategoryGap={6}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12, fill: 'var(--foreground)' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(Number(v)), measure.label]} cursor={{ fill: 'var(--soft)' }} /><Bar dataKey="value" fill="var(--rv-1)" radius={[0, 4, 4, 0]} maxBarSize={22}><LabelList dataKey="value" position="right" formatter={(v) => fmt(Number(v))} style={{ fontSize: 11, fill: 'var(--muted-text)' }} /></Bar></BarChart>
            : <BarChart data={bars} margin={{ top: 20, right: 12, left: 4, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-text)' }} axisLine={false} tickLine={false} interval={0} /><YAxis allowDecimals={measure.format !== 'num'} tick={{ fontSize: 11, fill: 'var(--muted-text)' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(Number(v))} width={70} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(Number(v)), measure.label]} cursor={{ fill: 'var(--soft)' }} /><Bar dataKey="value" fill="var(--rv-1)" radius={[4, 4, 0, 0]} maxBarSize={48}><LabelList dataKey="value" position="top" formatter={(v) => fmt(Number(v))} style={{ fontSize: 11, fill: 'var(--muted-text)' }} /></Bar></BarChart>}
        </ResponsiveContainer>}
    <footer className="rv-sources">{capped && !showTable && spec.chart === 'bar' && <>Mostrando os 12 primeiros de {data.length}. Use Ver tabela para a lista completa. · </>}Fonte: {sourceNote} · dados ao vivo do ARQ.AI</footer>
  </div>;
}
