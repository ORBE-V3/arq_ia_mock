// Self-check: node --experimental-strip-types lib/radar-engine.check.ts
import assert from 'node:assert/strict';
import { parsePrompt, runSpec } from './radar-engine.ts';
import type { RadarState } from './radar-engine.ts';

const s: RadarState = {
  projects: [
    { id: '1', name: 'Residencial Boa Viagem', client: 'A', type: 'Residencial', owner: 'Ana', stage: 'x', status: 'Ativo', risk: 'Alto', area: 300, revenue: 100, cost: 60, hours: 10, progress: 50, createdAt: '2026-08-01', deadline: '' },
    { id: '2', name: 'Casa JCP', client: 'B', type: 'Casa', owner: 'Lucas', stage: 'x', status: 'Ativo', risk: 'Baixo', area: 150, revenue: 50, cost: 45, hours: 5, progress: 80, createdAt: '2026-09-01', deadline: '' },
  ],
  pendings: [
    { projectId: '1', type: 'Doc', assignee: 'Ana', priority: 'Alta', status: 'Aberta', source: 'IA', dueDate: '2026-09-20' },
    { projectId: '1', type: 'Doc', assignee: 'Ana', priority: 'Alta', status: 'Concluída', source: 'IA', dueDate: '2026-09-21' },
    { projectId: '2', type: 'Orç', assignee: 'Lucas', priority: 'Média', status: 'Aberta', source: 'Equipe', dueDate: '2026-09-22' },
  ],
  documents: [], threads: [], analyses: [], kanban: [], budgets: [],
};

let spec = parsePrompt('pendências abertas por responsável', s, 'global');
assert.deepEqual([spec.dataset, spec.dim, spec.chart, spec.openOnly], ['pendings', 'assignee', 'bar', true]);
assert.deepEqual(runSpec(spec, s, 'global').data, [{ name: 'Ana', value: 1 }, { name: 'Lucas', value: 1 }]);

spec = parsePrompt('margem por projeto', s, 'global');
assert.equal(spec.measure, 'margin');
assert.deepEqual(runSpec(spec, s, 'global').data.map((d) => d.value), [40, 10]);

spec = parsePrompt('receita total de Boa Viagem', s, 'global');
assert.deepEqual([spec.chart, spec.projectId, runSpec(spec, s, 'global').total], ['kpi', '1', 100]);

spec = parsePrompt('distribuição dos projetos por risco em pizza', s, 'global');
assert.equal(spec.chart, 'pie');

// Project scope pins the filter regardless of the prompt.
assert.equal(runSpec(parsePrompt('quantas pendências', s, '2'), s, '2').total, 1);
console.log('radar-engine ok');
