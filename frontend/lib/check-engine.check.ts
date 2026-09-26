// Self-check: node --experimental-strip-types lib/check-engine.check.ts
import assert from 'node:assert/strict';
import { applyCheck, findings, signature } from './check-engine.ts';
import type { CheckState } from './check-engine.ts';

let n = 0;
const opts = { today: '2026-09-25', now: '2026-09-25 10:00', cost: null, uid: () => String(++n) };
const doc = (id: string, category: string, area = 348, confidence = 98) => ({ id, name: `${id}.pdf`, category, projectId: '1', status: 'Processado', confidence, area });
let s: CheckState = {
  projects: [{ id: '1', name: 'Boa Viagem', owner: 'Ana', stage: 'x' }],
  documents: [doc('m', 'Memorial Descritivo'), doc('p', 'Planta', 362), doc('c', 'Contrato'), doc('l', 'Licença', 348, 90)],
  pendings: [{ id: 'old', projectId: '1', title: 'Aprovar orçamento', type: 'x', detail: '', assignee: 'Bia', priority: 'Média', dueDate: '2026-09-20', status: 'Aberta', source: 'Equipe' }],
  kanban: [], analyses: [],
};

const keys = findings(s, '1', opts.today, null).map((f) => f.key).sort();
assert.deepEqual(keys, ['area', 'confidence', 'missing:ART/RRT', 'overdue:old']);

// First run: one pending + one kanban card per finding.
s = applyCheck(s, '1', opts);
assert.equal(s.analyses[0].trigger, 'Parecer inicial');
assert.equal(s.pendings.filter((p) => p.checkKey).length, 3); // overdue 'old' is linked, not duplicated
assert.equal(s.kanban.length, 3);
assert.equal(s.kanban.find((c) => c.title.includes('Área'))!.column, 'Em revisão humana');

// Uploading the RRT resolves that finding: pending closed, card to Concluído, analysis lists it as resolved.
s = { ...s, documents: [...s.documents, doc('r', 'ART/RRT')] };
assert.notEqual(signature(s, '1', null), s.analyses[0].signature);
s = applyCheck(s, '1', opts);
assert.match(s.analyses[0].trigger!, /Novo documento: r\.pdf/);
assert.deepEqual(s.analyses[0].resolvedKeys, ['missing:ART/RRT']);
assert.equal(s.pendings.find((p) => p.checkKey === 'missing:ART/RRT')!.status, 'Concluída');
assert.equal(s.kanban.find((c) => c.title.includes('ART/RRT'))!.column, 'Concluído');
assert.equal(s.analyses[0].issues.find((i) => i.key === 'area')!.change, 'persistente');

// Closing a card by hand while the problem persists reopens it on the next run.
s = { ...s, pendings: s.pendings.map((p) => (p.checkKey === 'area' ? { ...p, status: 'Concluída' } : p)) };
s = applyCheck(s, '1', opts);
assert.equal(s.analyses[0].issues.find((i) => i.key === 'area')!.change, 'reaberto');
assert.equal(s.pendings.find((p) => p.checkKey === 'area')!.status, 'Aberta');
assert.ok(s.analyses[0].score < 100);
console.log('check-engine ok');

// Overdue pendências are linked, never duplicated; an AI pendência about the same documents is adopted.
let m = 100;
const o2 = { ...opts, uid: () => String(++m) };
let t: CheckState = { ...s, analyses: [], kanban: [], pendings: [
  { id: 'late', projectId: '1', title: 'Late', type: 'x', detail: '', assignee: 'Bia', priority: 'Média', dueDate: '2026-09-01', status: 'Aberta', source: 'Equipe' },
  { id: 'ai', projectId: '1', title: 'Revisar área', type: 'x', detail: '', assignee: 'Ana', priority: 'Crítica', dueDate: '2026-09-30', status: 'Aberta', source: 'IA', documentIds: ['p', 'm'] },
] };
t = applyCheck(t, '1', o2);
assert.equal(t.pendings.filter((p) => p.title.includes('Late')).length, 1);
assert.equal(t.pendings.find((p) => p.id === 'ai')!.checkKey, 'area');
assert.equal(t.analyses[0].issues.find((i) => i.key === 'overdue:late')!.pendingId, 'late');
console.log('check-engine dedupe ok');

// A fresh analysis must match its own inputs, otherwise the watcher would loop.
assert.equal(t.analyses[0].signature, signature(t, '1', null));
console.log('check-engine signature ok');

// ArqQuant model 10% larger than the memorial is flagged; fitting it back resolves the finding.
let u: CheckState = { ...s, quantModels: { '1': { rooms: [{ w: 20, d: 19.14 }] } } }; // 382.8 m² vs memorial 348
assert.ok(findings(u, '1', opts.today, null).some((f) => f.key === 'quant-area'));
u = { ...u, quantModels: { '1': { rooms: [{ w: 20, d: 17.4 }] } } }; // 348 m²
assert.ok(!findings(u, '1', opts.today, null).some((f) => f.key === 'quant-area'));
console.log('check-engine quant ok');
