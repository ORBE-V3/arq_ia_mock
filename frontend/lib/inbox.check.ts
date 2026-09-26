// Self-check: node --experimental-strip-types lib/inbox.check.ts
import assert from 'node:assert/strict';
import { feed, inbox, setup } from './inbox.ts';

const today = '2026-09-28'; // a Monday
const base = {
  projects: [{ id: '1', name: 'Boa Viagem', owner: 'Ana', deadline: '2026-10-10', area: 348 }, { id: '2', name: 'Casa JCP', owner: 'Lucas', deadline: '2026-09-01', area: 150 }],
  analyses: [
    { id: 'a2', projectId: '1', date: '2026-09-28 09:00', score: 70, signature: 'x', trigger: 'Novo documento', resolvedKeys: ['r'], issues: [{ id: 'i1', key: 'area', title: 'Área divergente', priority: 'Crítica', resolved: false, detail: 'd' }, { id: 'i2', key: 'conf', title: 'Baixa confiança', priority: 'Média', resolved: false, detail: 'd' }] },
    { id: 'a1', projectId: '2', date: '2026-09-01', score: 90, issues: [{ id: 'i3', title: 'Old', priority: 'Crítica', resolved: false, detail: 'd' }] }, // not monitored
  ],
  pendings: [
    { id: 'p1', projectId: '2', title: 'Aprovar orçamento', assignee: 'Lucas', dueDate: '2026-09-20', status: 'Aberta' },
    { id: 'p2', projectId: '1', title: 'Enviar RRT', assignee: 'Ana', dueDate: '2026-09-29', status: 'Aberta' },
    { id: 'p3', projectId: '1', title: 'Futuro', assignee: 'Ana', dueDate: '2026-12-01', status: 'Aberta' },
    { id: 'p4', projectId: '1', title: 'Do check', assignee: 'Ana', dueDate: '2026-09-01', status: 'Aberta', checkKey: 'area' },
  ],
  budgets: [{ id: 'b1', projectId: '1', date: '2026-09-28', status: 'Rascunho', scenario: 'Base', total: 1, lines: [{ reviewStatus: 'Manual' }, { reviewStatus: 'Cotado pela IA' }] }],
  quantModels: { '1': { rooms: [{ w: 20, d: 20 }], updatedAt: '2026-09-28 10:00', source: 'Gerado pela IA' } },
  documents: [{ projectId: '1', category: 'Memorial Descritivo', area: 348, name: 'm.pdf', date: '2026-09-07' }],
  radarSchedules: [{ id: 's1', title: 'Custos', freq: 'weekly', weekday: 'segunda', time: '08:00', to: 'x' }, { id: 's2', title: 'Outro', freq: 'weekly', weekday: 'sexta', time: '08:00', to: 'x' }],
  threads: [], radarViews: [],
};

const items = inbox(base, 'Ana', today);
const ids = items.map((i) => i.id);
assert.ok(ids.includes('check:1:area'));
assert.ok(!ids.some((i) => i.includes('conf'))); // média stays out of the inbox
assert.ok(!ids.some((i) => i.startsWith('check:2'))); // unmonitored project ignored
assert.ok(ids.includes('pending:p1') && ids.includes('pending:p2'));
assert.ok(!ids.includes('pending:p3') && !ids.includes('pending:p4')); // far future / already covered by ArqCheck
assert.ok(ids.some((i) => i.startsWith('budget:b1')));
assert.ok(ids.some((i) => i.startsWith('quant:1'))); // 400 m² vs 348 m²
assert.ok(ids.includes(`radar:s1:${today}`) && !ids.includes(`radar:s2:${today}`));
assert.equal(items[0].mine, true); // Ana's items first
assert.equal(items.filter((i) => !i.mine)[0].id, 'pending:p1');

// Marking done removes it.
assert.ok(!inbox({ ...base, inboxDone: ['check:1:area'] }, 'Ana', today).some((i) => i.id === 'check:1:area'));

const steps = setup(base);
assert.deepEqual(steps.map((x) => x.done), [true, true, true, false, false]);

const f = feed(base);
assert.equal(f[0].id, 'quant-1'); // newest first
assert.ok(f.some((e) => e.text.includes('1 resolvido')));
console.log('inbox ok');
