'use client';

import '@/app/home.css';
import Link from 'next/link';
import { ArrowRight, Check, CircleDashed, Clock3, Layers3, PiggyBank, ScanLine, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useDemo } from '@/hooks/use-demo';
import { feed, inbox, setup } from '@/lib/inbox';
import { median, quotesFor, total } from '@/lib/budget-engine';
import type { Line, Scenario } from '@/lib/budget-engine';

export const chartColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const ago = (stamp: string) => {
  const m = Math.round((Date.now() - new Date(stamp.length > 10 ? stamp.replace(' ', 'T') : `${stamp}T12:00`).getTime()) / 60000);
  return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : m < 2880 ? 'ontem' : stamp.slice(0, 10).split('-').reverse().join('/');
};
const kindIcon = { check: ScanLine, pending: Clock3, budget: PiggyBank, quant: Layers3, radar: TrendingUp };
const kindLabel = { check: 'ArqCheck', pending: 'Pendência', budget: 'ArqBudget', quant: 'ArqQuant', radar: 'ArqRadar' };

export function Dashboard() {
  const demo = useDemo();
  const { projects, analyses, budgets, user, inboxDone, update } = demo;
  const state = demo as unknown as Parameters<typeof inbox>[0];
  const items = inbox(state, user.name, today());
  const steps = setup(state);
  const events = feed(state);
  const doneToday = inboxDone.length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const first = user.name.split(' ')[0];
  const mine = items.filter((i) => i.mine);

  // Savings the AI found: for every quoted line, the gap between market median and the chosen price.
  const drafts = budgets.filter((b) => b.status === 'Rascunho');
  const savings = drafts.reduce((t, b) => t + (b.lines as Line[]).reduce((s, l) => {
    if (!l.itemId || !l.quoteId) return s;
    const med = median(quotesFor(l.itemId, b.scenario as Scenario, today()).map((q) => q.price));
    return s + Math.max(0, med - l.unitCost) * l.quantity;
  }, 0), 0);
  const budgeted = drafts.reduce((t, b) => t + total(b.lines as Line[]), 0);

  const latest = new Map<string, (typeof analyses)[number]>();
  analyses.forEach((a) => { if (!latest.has(a.projectId)) latest.set(a.projectId, a); });
  const monitored = [...latest.values()].filter((a) => a.signature !== undefined);
  const avgScore = monitored.length ? Math.round(monitored.reduce((t, a) => t + a.score, 0) / monitored.length) : null;
  const onTime = projects.filter((p) => p.deadline >= today()).length;
  const health = projects.map((p) => {
    const history = analyses.filter((a) => a.projectId === p.id);
    const a = history[0];
    const prev = history[1];
    const on = a?.signature !== undefined;
    const draft = drafts.find((b) => b.projectId === p.id);
    return { p, a: on ? a : undefined, delta: on && prev ? a.score - prev.score : 0, open: on ? a.issues.filter((i) => !i.resolved).length : 0, draft, model: !!demo.quantModels[p.id], late: p.deadline < today() };
  }).sort((x, y) => Number(!!y.a) - Number(!!x.a) || (x.a?.score ?? 101) - (y.a?.score ?? 101)).slice(0, 8);
  const markDone = (id: string) => update((s) => ({ ...s, inboxDone: [...s.inboxDone, id] }));
  const hrefFor = (i: (typeof items)[number]) => i.href ?? `/projects/${i.projectId}/?tab=${i.tab}`;
  const setupDone = steps.filter((s) => s.done).length;

  return <div className="hm">
    <header className="hm-head">
      <div>
        <h1>{greeting}, {first}.</h1>
        <p>{items.length ? <>Você tem <b>{mine.length || items.length} decis{(mine.length || items.length) > 1 ? 'ões' : 'ão'}</b> esperando{mine.length && items.length > mine.length ? `, e a equipe mais ${items.length - mine.length}` : ''}. {monitored.length ? `O ArqCheck está vigiando ${monitored.length} projeto${monitored.length > 1 ? 's' : ''}.` : ''}</> : 'Nada esperando por você. O ARQ.AI continua monitorando os projetos.'}</p>
      </div>
      <Link href="/arqdocs" className="hm-ask"><Sparkles size={15} />Perguntar à IA sobre o escritório<ArrowRight size={14} /></Link>
    </header>

    <div className="hm-kpis">
      <div><small>Decisões esperando</small><b>{items.length}</b><em>{doneToday ? `${doneToday} resolvida${doneToday > 1 ? 's' : ''} por você` : 'comece pela primeira da lista'}</em></div>
      <div className="save"><small>Economia encontrada pela IA</small><b>{savings ? money(savings) : '—'}</b><em>{savings ? `${((savings / (budgeted + savings)) * 100).toFixed(1).replace('.', ',')}% abaixo da mediana de mercado` : 'orce um projeto para ver'}</em></div>
      <div><small>Consistência dos projetos</small><b>{avgScore !== null ? `${avgScore}%` : '—'}</b><em>{monitored.length ? `média de ${monitored.length} monitorado${monitored.length > 1 ? 's' : ''}` : 'ative o ArqCheck'}</em></div>
      <div><small>Projetos no prazo</small><b>{onTime}<span>/{projects.length}</span></b><em>{projects.length - onTime ? `${projects.length - onTime} com prazo vencido` : 'todos em dia'}</em></div>
    </div>

    <div className="hm-grid">
      <section className="hm-inbox" aria-labelledby="hm-inbox-title">
        <header><h2 id="hm-inbox-title">Precisa de você hoje</h2>{(items.length + doneToday) > 0 && <div className="hm-progress" aria-label={`${doneToday} de ${items.length + doneToday} resolvidas`}><span className="hm-track"><i style={{ width: `${(doneToday / (items.length + doneToday)) * 100}%` }} /></span><span>{doneToday}/{items.length + doneToday}</span></div>}</header>
        {items.length ? <ul>{items.slice(0, 8).map((i) => { const Icon = kindIcon[i.kind]; return <li key={i.id} className={`p${Math.round(i.priority)}`}>
          <span className="hm-kind"><Icon size={15} /></span>
          <div className="hm-item"><small>{kindLabel[i.kind]}{i.project ? ` · ${i.project}` : ''}{i.mine ? '' : ' · equipe'}</small><strong>{i.title}</strong><p>{i.detail}</p></div>
          <div className="hm-actions"><Link className="btn primary" href={hrefFor(i)}>{i.cta}</Link><button type="button" className="hm-done" onClick={() => markDone(i.id)} aria-label={`Marcar "${i.title}" como feito`}><Check size={14} /></button></div>
        </li>; })}</ul> : <div className="hm-zero"><Check size={22} /><strong>Caixa zerada</strong><p>Você resolveu tudo o que dependia de você. O ArqCheck avisa aqui quando algo mudar nos projetos.</p></div>}
        {items.length > 8 && <footer>Mais {items.length - 8} itens. Resolva os primeiros ou abra os projetos para ver todos.</footer>}
      </section>

      <div className="hm-side">
        {setupDone < steps.length && <section className="hm-setup">
          <header><h2>Primeiros passos</h2><span>{setupDone} de {steps.length}</span></header>
          <div className="hm-setup-bar"><i style={{ width: `${(setupDone / steps.length) * 100}%` }} /></div>
          <ol>{steps.map((s) => <li key={s.id} className={s.done ? 'done' : ''}>{s.done ? <Check size={14} /> : <CircleDashed size={14} />}{s.done ? <span>{s.label}</span> : <Link href={s.href}>{s.label}<ArrowRight size={12} /></Link>}</li>)}</ol>
        </section>}
        <section className="hm-feed">
          <header><h2>Enquanto você estava fora</h2></header>
          {events.length ? <ol>{events.map((e) => <li key={e.id}><time>{ago(e.date)}</time><Link href={e.href}>{e.text}</Link>{e.project && <small>{e.project}</small>}</li>)}</ol> : <p className="hm-muted">A atividade da IA e da equipe aparece aqui.</p>}
        </section>
      </div>
    </div>

    <section className="hm-health">
      <header><h2>Saúde dos projetos</h2><Link href="/projects">Ver todos<ArrowRight size={13} /></Link></header>
      <div className="hm-table-wrap"><table>
        <thead><tr><th>Projeto</th><th>Consistência</th><th>Pontos abertos</th><th>Orçamento</th><th>Levantamento</th><th>Prazo</th></tr></thead>
        <tbody>{health.map(({ p, a, delta, open, draft, model, late }) => <tr key={p.id}>
          <td><Link href={`/projects/${p.id}`}><strong>{p.name}</strong></Link><small>{p.owner}</small></td>
          <td>{a ? <span className="hm-score"><b>{a.score}%</b>{delta !== 0 && <em className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{delta > 0 ? '+' : ''}{delta}</em>}</span> : <Link className="hm-cta" href={`/projects/${p.id}/?tab=check`}>Ativar ArqCheck</Link>}</td>
          <td>{a ? open : '—'}</td>
          <td>{draft ? `${money(draft.total)} · ${draft.scenario}` : <Link className="hm-cta" href={`/projects/${p.id}/?tab=budget`}>Orçar com IA</Link>}</td>
          <td>{model ? <span className="hm-ok"><Check size={13} />Modelo 2D/3D</span> : <Link className="hm-cta" href={`/projects/${p.id}/?tab=quant`}>Gerar</Link>}</td>
          <td className={late ? 'late' : ''}>{p.deadline.split('-').reverse().join('/')}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}
