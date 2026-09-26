'use client';

import '@/app/budget.css';
import { Fragment, useState } from 'react';
import * as XLSX from 'xlsx';
import { Check, ChevronDown, Database, Download, FileSpreadsheet, GitCompare, Globe2, History, LoaderCircle, Mail, Plus, Ruler, Save, Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import { useDemo } from '@/hooks/use-demo';
import { CUB_PE, SCENARIOS, buildLines, byCategory, deviation, diff, lineTotal, quotesFor, recommend, total } from '@/lib/budget-engine';
import type { Line, Scenario } from '@/lib/budget-engine';
import { downloadOutput } from '@/lib/export-output';
import type { Budget } from '@/types';
import { quantities, totalArea } from '@/lib/quant-model';

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const money2 = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (d: string) => d.slice(0, 10).split('-').reverse().join('/');
const SOURCES = [
  { icon: Globe2, name: 'SINAPI 09/2026 · PE', detail: 'Referência pública' },
  { icon: Globe2, name: `CUB/PE R8-N · ${money(CUB_PE)}/m²`, detail: 'Sinduscon-PE' },
  { icon: Database, name: 'Portais de fornecedores', detail: '5 conectados via API' },
  { icon: Mail, name: 'Cotações por e-mail', detail: 'lidas pela IA' },
  { icon: FileSpreadsheet, name: 'Tabelas PDF de fornecedores', detail: 'extraídas pela IA' },
  { icon: History, name: 'Histórico do escritório', detail: '18 orçamentos' },
];

export function BudgetWorkspace({ projectId, onOpenQuant }: { projectId?: string; onOpenQuant?: () => void }) {
  const { projects, budgets, quantModels, templates, user, update, notice } = useDemo();
  const [scopeId, setScopeId] = useState(projectId ?? projects[0]?.id);
  const project = projects.find((p) => p.id === scopeId)!;
  const draft = budgets.find((b) => b.projectId === scopeId && b.status === 'Rascunho');
  const versions = budgets.filter((b) => b.projectId === scopeId && b.status !== 'Rascunho').sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  const [steps, setSteps] = useState<number | null>(null);
  const [openLine, setOpenLine] = useState<string | null>(null);
  const [compareId, setCompareId] = useState('');
  const scenario = (draft?.scenario ?? 'Base') as Scenario;
  // ArqQuant model, when saved, drives both the built area and the measured quantities.
  const model = quantModels[scopeId];
  const q = model ? quantities(model.rooms) : null;
  const builtArea = model ? totalArea(model.rooms) : project?.area;
  const measured = q ? { piso: q.floor, forro: q.ceiling, alvenaria: q.masonry, parede: q.wallFinish, impermeabilizacao: q.waterproofing } : {};
  const qtySource = `${model ? 'ArqQuant · área do modelo' : 'Área do projeto'} · ${builtArea} m²`;
  const lines = (draft?.lines ?? []) as Line[];
  const sum = total(lines);
  const flagged = lines.filter((l) => deviation(l, today(), scenario) !== null || l.reviewStatus === 'Manual');
  const compare = versions.find((v) => v.id === compareId);
  const template = templates.find((t) => t.projectId === scopeId && t.default) ?? templates.find((t) => t.kind === 'Empresa');

  const saveDraft = (next: Line[], nextScenario = scenario) => update((s) => {
    const others = s.budgets.filter((b) => !(b.projectId === scopeId && b.status === 'Rascunho'));
    const b: Budget = { id: draft?.id ?? `budget-${crypto.randomUUID().slice(0, 8)}`, projectId: scopeId, date: today(), scenario: nextScenario, total: total(next), status: 'Rascunho', lines: next };
    return { ...s, budgets: [b, ...others] };
  });
  const setLine = (id: string, patch: Partial<Line>) => saveDraft(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const stepLabels = [`Lendo quantitativos (${qtySource})`, 'Consultando SINAPI 09/2026 e CUB/PE', 'Pedindo cotação a 3 fornecedores por categoria', 'Lendo tabelas PDF e respostas por e-mail', 'Escolhendo a melhor oferta por item e checando desvios'];
  async function generate(next: Scenario = scenario) {
    for (let i = 0; i < stepLabels.length; i++) { setSteps(i); await new Promise((r) => setTimeout(r, 420)); }
    setSteps(null);
    // Keep quantities the team edited; re-quote everything else for the scenario.
    const edited = new Map(lines.filter((l) => l.qtySource === 'Editado').map((l) => [l.itemId, l.quantity]));
    const manual = lines.filter((l) => !l.itemId);
    saveDraft([...buildLines(builtArea, next, today(), qtySource, measured).map((l) => (edited.has(l.itemId) ? { ...l, quantity: edited.get(l.itemId)!, qtySource: 'Editado' } : l)), ...manual], next);
    notice(`Orçamento ${next.toLowerCase()} cotado pela IA.`);
  }
  function saveVersion() {
    const n = (versions[0]?.version ?? 0) + 1;
    update((s) => ({ ...s, budgets: [{ id: `budget-${crypto.randomUUID().slice(0, 8)}`, projectId: scopeId, date: today(), scenario, total: sum, status: `Versão ${n}`, version: n, lines }, ...s.budgets] }));
    notice(`Versão ${n} salva.`);
  }
  function exportXlsx() {
    const rows = lines.map((l) => ({ Categoria: l.category, Item: l.name, Especificação: l.spec ?? '', Quantidade: l.quantity, Unidade: l.unit, 'Custo unitário': l.unitCost, Total: Math.round(lineTotal(l) * 100) / 100, Fonte: l.source, 'Origem da quantidade': l.qtySource ?? 'Manual' }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Orçamento ${scenario} · ${project.name}`], [`Total ${money(sum)} · ${money(sum / builtArea)}/m²`], []]), 'Resumo');
    XLSX.utils.sheet_add_json(wb.Sheets.Resumo, byCategory(lines).map((c) => ({ Categoria: c.name, Total: Math.round(c.value) })), { origin: 'A4' });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Itens');
    XLSX.writeFile(wb, `orcamento-${project.name.toLowerCase().replace(/\s+/g, '-')}-${scenario.toLowerCase()}.xlsx`);
  }
  const payload = () => ({ title: `Orçamento ${scenario} · ${project.name}`, body: [`Total estimado: ${money(sum)} (${money(sum / builtArea)}/m², CUB/PE ${money(CUB_PE)}/m²).`, '', ...byCategory(lines).map((c) => `${c.name}: ${money(c.value)}`), '', ...lines.map((l) => `${l.name} · ${l.spec ?? ''} · ${l.quantity} ${l.unit} × ${money2(l.unitCost)} = ${money(lineTotal(l))} (${l.source})`)].join('\n'), sources: [...new Set(lines.map((l) => l.source))], project: project.name, agent: 'ArqBudget', author: user.name, date: today(), template: template ? { name: template.name, kind: template.kind, company: 'Studio Arquitetura' } : null });

  const header = <div className="bw-head">
    {!projectId && <label className="bw-project"><span className="sr-only">Projeto</span><select value={scopeId} onChange={(e) => { setScopeId(e.target.value); setOpenLine(null); setCompareId(''); }}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    <div className="bw-sources">{SOURCES.map(({ icon: Icon, name, detail }) => <span key={name}><Icon size={12} />{name}<small>{detail}</small></span>)}</div>
  </div>;

  if (!draft) return <div className="bw">{header}
    <div className="bw-start">
      <Sparkles size={22} />
      <div><h2>Orçar {project.name} com a IA</h2><p>A IA lê os quantitativos ({qtySource}), consulta SINAPI, CUB e os fornecedores conectados, e monta o orçamento com a origem de cada preço. Você revisa, troca a fonte de qualquer item e salva versões.</p>
        {steps === null ? <div className="bw-start-actions">{SCENARIOS.map((s) => <button key={s} type="button" className={`btn ${s === 'Base' ? 'primary' : ''}`} onClick={() => void generate(s)}>Gerar cenário {s.toLowerCase()}</button>)}</div>
          : <ul className="bw-steps">{stepLabels.map((l, i) => <li key={l} className={i < steps ? 'done' : i === steps ? 'now' : ''}>{i < steps ? <Check size={12} /> : i === steps ? <LoaderCircle className="spin" size={12} /> : <i />}{l}</li>)}</ul>}
      </div>
    </div>
  </div>;

  return <div className="bw">{header}
    <div className="bw-scenarios" aria-label="Cenário">{SCENARIOS.map((s) => { const t = s === scenario ? sum : total(buildLines(builtArea, s, today(), qtySource, measured)); return <button type="button" aria-pressed={s === scenario} key={s} className={s === scenario ? 'on' : ''} disabled={steps !== null} onClick={() => s !== scenario && void generate(s)}><small>{s}</small><b>{money(t)}</b><em>{money(t / builtArea)}/m²</em></button>; })}</div>
    {steps !== null && <ul className="bw-steps inline">{stepLabels.map((l, i) => <li key={l} className={i < steps ? 'done' : i === steps ? 'now' : ''}>{i < steps ? <Check size={12} /> : i === steps ? <LoaderCircle className="spin" size={12} /> : <i />}{l}</li>)}</ul>}

    <div className="bw-kpis">
      <div><small>Total do cenário {scenario.toLowerCase()}</small><b>{money(sum)}</b></div>
      <div><small>Custo por m²</small><b>{money(sum / builtArea)}</b><em>{Math.round((sum / builtArea / CUB_PE - 1) * 100)}% vs CUB/PE</em></div>
      <div><small>Itens com cotação</small><b>{lines.filter((l) => l.quoteId).length}/{lines.length}</b></div>
      <div className={flagged.length ? 'warn' : ''}><small>Itens para revisar</small><b>{flagged.length}</b><em>{flagged.length ? 'preço fora da faixa ou manual' : 'tudo dentro do mercado'}</em></div>
    </div>

    <div className="bw-actions">
      {onOpenQuant && <button type="button" className="btn" onClick={onOpenQuant}><Ruler size={14} />Ver quantitativos</button>}
      <button type="button" className="btn" onClick={() => saveDraft([...lines, { id: `line-${crypto.randomUUID().slice(0, 6)}`, name: 'Novo item', category: 'Outros', unit: 'un', quantity: 1, unitCost: 0, source: 'Manual', reviewStatus: 'Manual' }])}><Plus size={14} />Adicionar item</button>
      <span className="bw-spacer" />
      <button type="button" className="btn" onClick={exportXlsx}><FileSpreadsheet size={14} />Excel</button>
      <button type="button" className="btn" onClick={() => downloadOutput(payload(), 'PDF')}><Download size={14} />PDF</button>
      <button type="button" className="btn" onClick={() => { downloadOutput({ ...payload(), to: 'cliente@exemplo.com.br' }, 'EML'); notice('E-mail ao cliente gerado com o orçamento.'); }}><Mail size={14} />Enviar ao cliente</button>
      <button type="button" className="btn primary" onClick={saveVersion}><Save size={14} />Salvar versão</button>
    </div>

    <div className="bw-table-wrap"><table className="bw-table">
      <thead><tr><th>Item</th><th>Quantidade</th><th>Custo unitário</th><th>Total</th><th>Fonte do preço</th><th><span className="sr-only">Ações</span></th></tr></thead>
      <tbody>{lines.map((l) => {
        const dev = deviation(l, today(), scenario);
        const quotes = l.itemId ? quotesFor(l.itemId, scenario, today()) : [];
        const rec = quotes.length ? recommend(quotes) : null;
        const open = openLine === l.id;
        return <Fragment key={l.id}>
          <tr className={open ? 'open' : ''}>
            <td><strong>{l.itemId ? l.name : <input className="bw-cell-name" value={l.name} onChange={(e) => setLine(l.id, { name: e.target.value })} aria-label="Nome do item" />}</strong><small>{l.spec ?? l.category}</small></td>
            <td><span className="bw-qty"><input type="number" min={0} step="any" value={l.quantity} onChange={(e) => setLine(l.id, { quantity: Number(e.target.value), qtySource: 'Editado' })} aria-label={`Quantidade de ${l.name}`} />{l.unit}</span><small>{l.qtySource ?? 'Manual'}</small></td>
            <td><span className="bw-qty"><input type="number" min={0} step="0.01" value={l.unitCost} onChange={(e) => setLine(l.id, { unitCost: Number(e.target.value), source: 'Preço manual', quoteId: undefined, reviewStatus: 'Manual' })} aria-label={`Custo unitário de ${l.name}`} /></span>{dev !== null && <small className="bw-dev"><TriangleAlert size={11} />{dev > 0 ? '+' : ''}{dev}% da mediana</small>}</td>
            <td className="bw-num">{money(lineTotal(l))}</td>
            <td>{l.itemId ? <button type="button" className="bw-source" aria-expanded={open} onClick={() => setOpenLine(open ? null : l.id)}>{l.source}<ChevronDown size={13} /></button> : <span className="bw-manual">{l.source}</span>}</td>
            <td><button type="button" className="bw-icon" aria-label={`Remover ${l.name}`} onClick={() => saveDraft(lines.filter((x) => x.id !== l.id))}><Trash2 size={13} /></button></td>
          </tr>
          {open && rec && <tr className="bw-quotes-row"><td colSpan={6} aria-label={`Cotações de ${l.name}`}>
            <div className="bw-quotes">
              <p className="bw-ai"><Sparkles size={13} />Recomendação da IA: <b>{rec.quote.supplier}</b>, {rec.why}. Mediana de mercado {money2(rec.median)}/{l.unit}.</p>
              <table><thead><tr><th>Fonte</th><th>Canal</th><th>Preço</th><th>vs mediana</th><th>Prazo</th><th>Data</th><th><span className="sr-only">Usar</span></th></tr></thead><tbody>
                {quotes.map((q) => { const d = Math.round((q.price / rec.median - 1) * 100); const on = l.quoteId === q.id; return <tr key={q.id} className={on ? 'on' : ''}><td>{q.supplier}{q.id === rec.quote.id && <em className="bw-rec">recomendado</em>}</td><td>{q.channel}</td><td className="bw-num">{money2(q.price)}</td><td className={`bw-num ${d >= 10 ? 'bad' : d <= -10 ? 'good' : ''}`}>{d > 0 ? '+' : ''}{d}%</td><td>{q.reference ? '—' : `${q.leadDays} dias`}</td><td>{dmy(q.date)}</td><td>{on ? <span className="bw-in-use"><Check size={12} />Em uso</span> : <button type="button" className="btn" onClick={() => setLine(l.id, { unitCost: q.price, source: q.supplier, quoteId: q.id, reviewStatus: 'Fonte escolhida' })}>Usar</button>}</td></tr>; })}
              </tbody></table>
            </div>
          </td></tr>}
        </Fragment>;
      })}</tbody>
      <tfoot><tr><td colSpan={3}>Total · {lines.length} itens</td><td className="bw-num">{money(sum)}</td><td colSpan={2}><span className="sr-only">Fim da tabela</span></td></tr></tfoot>
    </table></div>

    <div className="bw-bottom">
      <section className="bw-cats"><h3>Por categoria</h3>{byCategory(lines).sort((a, b) => b.value - a.value).map((c) => <div key={c.name}><span>{c.name}</span><i style={{ width: `${(c.value / sum) * 100}%` }} /><b>{money(c.value)}</b></div>)}</section>
      <section className="bw-versions"><h3><GitCompare size={15} />Versões</h3>
        {versions.length ? <>
          <label>Comparar rascunho com<select value={compareId} onChange={(e) => setCompareId(e.target.value)}><option value="">Escolha uma versão</option>{versions.map((v) => <option key={v.id} value={v.id}>{v.status} · {v.scenario} · {money(v.total)} · {dmy(v.date)}</option>)}</select></label>
          {compare && <table><thead><tr><th>Categoria</th><th>{compare.status}</th><th>Rascunho</th><th>Diferença</th></tr></thead><tbody>{diff(compare.lines as Line[], lines).map((d) => <tr key={d.name}><td>{d.name}</td><td className="bw-num">{money(d.before)}</td><td className="bw-num">{money(d.after)}</td><td className={`bw-num ${d.delta > 0 ? 'bad' : d.delta < 0 ? 'good' : ''}`}>{d.delta > 0 ? '+' : ''}{money(d.delta)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td className="bw-num">{money(compare.total)}</td><td className="bw-num">{money(sum)}</td><td className="bw-num">{sum - compare.total > 0 ? '+' : ''}{money(sum - compare.total)}</td></tr></tfoot></table>}
        </> : <p>Salve uma versão para comparar alterações de escopo, cenário ou fornecedor.</p>}
      </section>
    </div>
  </div>;
}
