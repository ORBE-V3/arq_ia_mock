// Self-check: node --experimental-strip-types lib/data-canvas.check.ts
import assert from 'node:assert/strict';
import { buildTables, computeDashboard, joinRows, pearson, suggestEdges } from './data-canvas.ts';
import type { CanvasModel, CanvasState } from './data-canvas.ts';

const s: CanvasState = {
  projects: [
    { id: '1', name: 'Boa Viagem', client: 'A', owner: 'Ana', status: 'x', risk: 'Alto', revenue: 200, cost: 120000, hours: 10, progress: 60 },
    { id: '2', name: 'Casa JCP', client: 'B', owner: 'Lucas', status: 'x', risk: 'Baixo', revenue: 100, cost: 80000, hours: 5, progress: 30 },
  ],
  pendings: [{ projectId: '1', status: 'Aberta', priority: 'Alta' }, { projectId: '1', status: 'Aberta', priority: 'Alta' }, { projectId: '2', status: 'Concluída', priority: 'Baixa' }],
  documents: [{ projectId: '1', category: 'Planta' }],
};
const tables = buildTables(s, 'global');
const all: CanvasModel = { base: 'erp', nodes: tables.map((t) => ({ table: t.id, x: 0, y: 0 })), edges: suggestEdges() };

// Deterministic generation.
assert.deepEqual(buildTables(s, 'global')[0].rows, tables[0].rows);

// Multi-hop PROCX: erp -> projects (by id) -> sheet (by name); CONT.SE counts open pendings.
const { rows, reached } = joinRows(all, tables);
const r1 = rows.find((r) => r['erp.projeto_id'] === '1')!;
assert.equal(r1['projects.nome'], 'Boa Viagem');
assert.equal(typeof r1['sheet.medicao_pct'], 'number');
assert.equal(r1['pendings.count'], 2);
assert.equal(rows.find((r) => r['erp.projeto_id'] === '2')!['pendings.count'], 0);
assert.ok(reached.has('sheet'));

// Removing the sheet node cuts that branch.
const noSheet = { ...all, nodes: all.nodes.filter((n) => n.table !== 'sheet') };
assert.equal(computeDashboard(noSheet, tables, {}).has.sheet, false);

// Filters: date cut + client.
const d = computeDashboard(all, tables, { from: '2026-08', client: 'A' });
assert.deepEqual(d.byMonth.map((m) => m.name), ['2026-08', '2026-09']);
assert.deepEqual(d.lines.map((l) => l.id), ['1']);

// Project scope only builds that project's rows.
assert.ok(buildTables(s, '2')[0].rows.every((r) => r.projeto_id === '2'));

assert.equal(Math.round(pearson([1, 2, 3, 4], [2, 4, 6, 8]) * 100), 100);
console.log('data-canvas ok');
