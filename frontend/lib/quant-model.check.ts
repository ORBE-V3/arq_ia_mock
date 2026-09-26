// Self-check: node --experimental-strip-types lib/quant-model.check.ts
import assert from 'node:assert/strict';
import { fitToArea, generateLayout, overlaps, quantities, totalArea, wallSegments } from './quant-model.ts';
import type { QRoom } from './quant-model.ts';

// Generated layout hits the memorial area and has no overlaps.
const rooms = generateLayout(348);
assert.ok(Math.abs(totalArea(rooms) - 348) < 0.5, `area ${totalArea(rooms)}`);
for (const a of rooms) for (const b of rooms) assert.ok(!overlaps(a, b), `${a.name} x ${b.name}`);

// Two 4x3 rooms side by side share one 3 m wall: union length = 2*(8) + 3*3 = 25 m, not 28.
const two: QRoom[] = [
  { id: 'a', name: 'A', type: 'Sala', x: 0, y: 0, w: 4, d: 3, h: 3 },
  { id: 'b', name: 'B', type: 'Banheiro', x: 4, y: 0, w: 4, d: 3, h: 3 },
];
const q = quantities(two);
assert.equal(q.floor, 24);
assert.equal(q.wallLength, 25);
assert.equal(q.masonry, 75); // built once
assert.equal(q.wallFinish, 84); // both faces of the shared wall are finished
assert.equal(q.waterproofing, 12);
assert.equal(wallSegments(two).length, 5); // 2 long horizontals + 3 verticals

// Fit to area scales geometry, keeps proportions.
const fitted = fitToArea(two, 48);
assert.ok(Math.abs(totalArea(fitted) - 48) < 0.2);
assert.ok(Math.abs(fitted[0].w / fitted[0].d - 4 / 3) < 0.01);
console.log('quant-model ok');
