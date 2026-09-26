'use client';
import '@/app/check.css';
import '@/app/agents.css';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, LoaderCircle, ScanLine, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { useArqCheck } from '@/components/check-panel';
import { useDemo } from '@/hooks/use-demo';

export default function Page() {
  const { projects, analyses } = useDemo();
  const run = useArqCheck();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all');
  const rows = projects.map((p) => {
    const history = analyses.filter((a) => a.projectId === p.id);
    const latest = history[0];
    const open = latest?.issues.filter((i) => !i.resolved) ?? [];
    return { p, latest, previous: history[1], open, on: latest?.signature !== undefined, critical: open.filter((i) => i.priority === 'Crítica').length };
  }).sort((a, b) => Number(b.on) - Number(a.on) || b.critical - a.critical || (a.latest?.score ?? 101) - (b.latest?.score ?? 101));
  const shown = rows.filter((r) => filter === 'all' || (filter === 'on' ? r.on : !r.on));
  const monitored = rows.filter((r) => r.on);
  const avg = monitored.length ? Math.round(monitored.reduce((t, r) => t + r.latest!.score, 0) / monitored.length) : 0;

  async function activate(ids: string[]) {
    setBusy(ids.length > 1 ? 'all' : ids[0]);
    await new Promise((r) => setTimeout(r, 900));
    ids.forEach((id) => run(id, 'Parecer inicial'));
    setBusy(null);
  }

  return <>
    <PageHeader eyebrow="ARQCHECK AI" title="ArqCheck AI" description="Parecer inicial e verificação contínua de todos os projetos. Cada ponto encontrado vira pendência e card no Kanban.">
      <button className="btn primary" disabled={!!busy || monitored.length === rows.length} onClick={() => void activate(rows.filter((r) => !r.on).map((r) => r.p.id))}>{busy === 'all' ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}Ativar em todos os projetos</button>
    </PageHeader>
    <div className="metrics four">
      <div className="metric"><div className="metric-label">Projetos monitorados</div><strong>{monitored.length}<small style={{ fontSize: 14, color: 'var(--muted-text)' }}> / {rows.length}</small></strong></div>
      <div className="metric"><div className="metric-label">Pontos em aberto</div><strong>{monitored.reduce((t, r) => t + r.open.length, 0)}</strong></div>
      <div className="metric"><div className="metric-label">Pontos críticos</div><strong>{monitored.reduce((t, r) => t + r.critical, 0)}</strong></div>
      <div className="metric"><div className="metric-label">Consistência média</div><strong>{monitored.length ? `${avg}%` : '—'}</strong></div>
    </div>
    <div className="ck-portfolio">
      <div className="ad-seg" role="tablist" aria-label="Filtro de monitoramento">{([['all', 'Todos', rows.length], ['on', 'Monitorados', monitored.length], ['off', 'Sem monitoramento', rows.length - monitored.length]] as const).map(([id, label, n]) => <button type="button" role="tab" aria-selected={filter === id} key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}<em>{n}</em></button>)}</div>
      <ul>{shown.map(({ p, latest, previous, open, on, critical }) => <li key={p.id} className={on ? '' : 'off'}>
        <span className={`ck-dot ${on ? 'on' : ''}`} aria-label={on ? 'Monitorado' : 'Sem monitoramento'} />
        <div className="ck-p-main"><strong>{p.name}</strong><small>{on ? `${latest!.trigger ?? 'Análise'} · ${latest!.date.slice(0, 16).split(' ')[0].split('-').reverse().join('/')}` : latest ? 'Análise antiga, sem monitoramento' : 'Nunca analisado'}</small></div>
        <div className="ck-p-score">{latest ? <><b>{latest.score}%</b>{previous && on && <em className={latest.score > previous.score ? 'up' : latest.score < previous.score ? 'down' : ''}>{latest.score - previous.score > 0 ? '+' : ''}{latest.score - previous.score}</em>}</> : <b>—</b>}</div>
        <div className="ck-p-open">{on ? <>{critical > 0 && <span className="crit">{critical} crítico{critical > 1 ? 's' : ''}</span>}<span>{open.length} em aberto</span></> : null}</div>
        {on ? <Link className="ck-link" href={`/projects/${p.id}`}>Abrir projeto<ArrowUpRight size={13} /></Link> : <button type="button" className="ck-link" disabled={!!busy} onClick={() => void activate([p.id])}>{busy === p.id ? <LoaderCircle className="spin" size={13} /> : <ScanLine size={13} />}Ativar</button>}
      </li>)}</ul>
    </div>
  </>;
}
