// Home dashboard: decision inbox, setup checklist and activity feed derived from the demo state. Pure (runs under plain node).

export type InboxItem = { id: string; kind: 'check' | 'pending' | 'budget' | 'quant' | 'radar'; priority: number; title: string; detail: string; projectId?: string; project?: string; tab?: string; href?: string; cta: string; mine: boolean };
export type SetupStep = { id: string; label: string; done: boolean; href: string };
export type FeedEvent = { id: string; date: string; text: string; project?: string; href: string };

type S = {
  projects: { id: string; name: string; owner: string; deadline: string; area: number }[];
  analyses: { id: string; projectId: string; date: string; score: number; signature?: string; trigger?: string; issues: { id: string; key?: string; title: string; priority: string; resolved: boolean; detail: string }[]; resolvedKeys?: string[] }[];
  pendings: { id: string; projectId: string; title: string; assignee: string; dueDate: string; status: string; checkKey?: string }[];
  budgets: { id: string; projectId: string; date: string; status: string; scenario: string; total: number; lines: { reviewStatus?: string }[] }[];
  quantModels?: Record<string, { rooms: { w: number; d: number }[]; updatedAt: string; source: string }>;
  documents: { projectId: string; category: string; area: number; name: string; date: string; kind?: string }[];
  radarViews?: { id: string; scope: string; title: string; date: string; author: string }[];
  radarSchedules?: { id: string; title: string; freq: string; time: string; weekday?: string; to: string }[];
  threads?: { id: string; projectId: string; user: string; date: string; title: string }[];
  inboxDone?: string[];
};

const PRIORITY: Record<string, number> = { Crítica: 4, Alta: 3, Média: 2, Baixa: 1 };
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00`).getTime() + n * 864e5).toISOString().slice(0, 10);

export function inbox(s: S, user: string, today: string): InboxItem[] {
  const name = (id: string) => s.projects.find((p) => p.id === id)?.name ?? '';
  const owner = (id: string) => s.projects.find((p) => p.id === id)?.owner;
  const out: InboxItem[] = [];
  // Latest analysis per monitored project; only critical/high points reach the inbox.
  const latest = new Map<string, S['analyses'][number]>();
  s.analyses.forEach((a) => { if (!latest.has(a.projectId)) latest.set(a.projectId, a); });
  latest.forEach((a) => {
    if (a.signature === undefined) return;
    a.issues.filter((i) => !i.resolved && PRIORITY[i.priority] >= 3).forEach((i) => out.push({ id: `check:${a.projectId}:${i.key ?? i.id}`, kind: 'check', priority: PRIORITY[i.priority] + 0.5, title: i.title, detail: i.detail, projectId: a.projectId, project: name(a.projectId), tab: 'check', cta: 'Revisar', mine: owner(a.projectId) === user }));
  });
  s.pendings.filter((p) => p.status !== 'Concluída' && !p.checkKey && p.dueDate <= addDays(today, 2)).forEach((p) => {
    const late = p.dueDate < today;
    out.push({ id: `pending:${p.id}`, kind: 'pending', priority: late ? 3 : 2, title: p.title, detail: `${late ? 'Venceu' : 'Vence'} em ${p.dueDate.split('-').reverse().join('/')} · ${p.assignee}`, projectId: p.projectId, project: name(p.projectId), tab: 'pending', cta: 'Resolver', mine: p.assignee === user });
  });
  s.budgets.filter((b) => b.status === 'Rascunho').forEach((b) => {
    const manual = b.lines.filter((l) => l.reviewStatus === 'Manual').length;
    if (manual) out.push({ id: `budget:${b.id}:${manual}`, kind: 'budget', priority: 2, title: `Orçamento ${b.scenario.toLowerCase()} com ${manual} preço${manual > 1 ? 's' : ''} manual${manual > 1 ? 'is' : ''}`, detail: 'Compare com as cotações dos fornecedores antes de enviar ao cliente.', projectId: b.projectId, project: name(b.projectId), tab: 'budget', cta: 'Revisar preços', mine: owner(b.projectId) === user });
  });
  Object.entries(s.quantModels ?? {}).forEach(([pid, m]) => {
    const area = m.rooms.reduce((t, r) => t + r.w * r.d, 0);
    const memo = s.documents.find((d) => d.projectId === pid && d.category === 'Memorial Descritivo')?.area ?? s.projects.find((p) => p.id === pid)?.area;
    if (memo && Math.abs(area - memo) / memo > 0.02) out.push({ id: `quant:${pid}:${Math.round(area)}`, kind: 'quant', priority: 2.5, title: 'Levantamento diferente do memorial', detail: `Modelo com ${Math.round(area * 10) / 10} m² contra ${memo} m² no memorial.`, projectId: pid, project: name(pid), tab: 'quant', cta: 'Ajustar', mine: owner(pid) === user });
  });
  const weekday = WEEKDAYS[new Date(`${today}T12:00`).getDay()];
  (s.radarSchedules ?? []).filter((r) => r.freq === 'daily' || (r.freq === 'weekly' && r.weekday === weekday) || (r.freq === 'monthly' && today.endsWith('-01'))).forEach((r) => out.push({ id: `radar:${r.id}:${today}`, kind: 'radar', priority: 1, title: `Envio "${r.title}" sai hoje às ${r.time}`, detail: `Para ${r.to}. Confira o dashboard antes do envio.`, href: '/arqradar', cta: 'Ver dashboard', mine: true }));
  const done = new Set(s.inboxDone ?? []);
  return out.filter((i) => !done.has(i.id)).sort((a, b) => Number(b.mine) - Number(a.mine) || b.priority - a.priority);
}

export function setup(s: S): SetupStep[] {
  const first = s.projects[0]?.id ?? '1';
  return [
    { id: 'check', label: 'Ative o ArqCheck contínuo em um projeto', done: s.analyses.some((a) => a.signature !== undefined), href: `/projects/${first}/?tab=check` },
    { id: 'quant', label: 'Gere o levantamento 2D/3D no ArqQuant', done: Object.keys(s.quantModels ?? {}).length > 0, href: `/projects/${first}/?tab=quant` },
    { id: 'budget', label: 'Orce com cotações de fornecedores', done: s.budgets.some((b) => b.lines.some((l) => l.reviewStatus)), href: `/projects/${first}/?tab=budget` },
    { id: 'agent', label: 'Converse com um agente sobre os documentos', done: (s.threads ?? []).length > 0, href: `/projects/${first}/?tab=agents` },
    { id: 'radar', label: 'Crie uma visualização no ArqRadar', done: (s.radarViews ?? []).length > 0, href: '/arqradar' },
  ];
}

export function feed(s: S, limit = 8): FeedEvent[] {
  const name = (id: string) => s.projects.find((p) => p.id === id)?.name;
  const ev: FeedEvent[] = [];
  s.analyses.filter((a) => a.signature !== undefined).forEach((a) => ev.push({ id: a.id, date: a.date, project: name(a.projectId), href: `/projects/${a.projectId}/?tab=check`, text: `ArqCheck: ${a.trigger ?? 'análise'} · score ${a.score}%${a.resolvedKeys?.length ? ` · ${a.resolvedKeys.length} resolvido${a.resolvedKeys.length > 1 ? 's' : ''}` : ''}` }));
  s.budgets.filter((b) => b.status !== 'Rascunho').forEach((b) => ev.push({ id: b.id, date: b.date, project: name(b.projectId), href: `/projects/${b.projectId}/?tab=budget`, text: `ArqBudget: ${b.status} do cenário ${b.scenario.toLowerCase()} salva` }));
  Object.entries(s.quantModels ?? {}).forEach(([pid, m]) => ev.push({ id: `quant-${pid}`, date: m.updatedAt, project: name(pid), href: `/projects/${pid}/?tab=quant`, text: `ArqQuant: levantamento ${m.source.toLowerCase()} · ${m.rooms.length} ambientes` }));
  (s.radarViews ?? []).forEach((v) => ev.push({ id: v.id, date: v.date, project: v.scope === 'global' ? undefined : name(v.scope), href: v.scope === 'global' ? '/arqradar' : `/projects/${v.scope}/?tab=radar`, text: `ArqRadar: ${v.author} criou "${v.title}"` }));
  (s.threads ?? []).forEach((t) => ev.push({ id: t.id, date: t.date, project: name(t.projectId), href: t.projectId === 'global' ? '/arqdocs' : `/projects/${t.projectId}/?tab=agents`, text: `Agents: ${t.user} perguntou "${t.title}"` }));
  return ev.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
