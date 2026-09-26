// Self-check: node --experimental-strip-types lib/budget-engine.check.ts
import assert from 'node:assert/strict';
import { CATALOG, buildLines, deviation, diff, median, quotesFor, recommend, total } from './budget-engine.ts';

const today = '2026-09-26';
const q = quotesFor('piso', 'Base', today);
assert.equal(q.length, 5);
assert.deepEqual(quotesFor('piso', 'Base', today), q); // deterministic
assert.equal(q.filter((x) => x.reference).length, 2);

const rec = recommend(q);
assert.ok(!rec.quote.reference);
assert.equal(rec.median, median(q.map((x) => x.price)));

// Scenarios swap the material, not only the price.
const eco = buildLines(348, 'Econômico', today, 'ArqQuant');
const high = buildLines(348, 'Alto padrão', today, 'ArqQuant');
assert.equal(eco.length, CATALOG.length);
assert.notEqual(eco.find((l) => l.itemId === 'piso')!.spec, high.find((l) => l.itemId === 'piso')!.spec);
assert.ok(total(high) > total(eco) * 1.4);
assert.equal(eco.find((l) => l.itemId === 'piso')!.quantity, 348); // 1 m² of floor per m² built

// Deviation flags a manual price far from market.
const piso = { ...eco.find((l) => l.itemId === 'piso')!, unitCost: 200 };
assert.ok((deviation(piso, today, 'Econômico') ?? 0) > 100);

const d = diff(eco, high);
assert.ok(d.every((c) => c.delta > 0));
console.log('budget-engine ok');

// Every line the AI quoted is inside the market band (never flagged for review).
for (const s of ['Econômico', 'Base', 'Alto padrão'] as const) for (const l of buildLines(348, s, today, 'x')) {
  const r = recommend(quotesFor(l.itemId!, s, today));
  if (Math.abs(r.quote.price / r.median - 1) <= 0.12) assert.equal(deviation(l, today, s), null, `${s} ${l.name}`);
}
console.log('budget-engine band ok');
