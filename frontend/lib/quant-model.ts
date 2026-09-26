// ArqQuant model in meters: rooms are axis-aligned rectangles; area, walls and quantities are derived from geometry.
// Pure module (runs under plain node via quant-model.check.ts).

export type RoomType = 'Sala' | 'Quarto' | 'Cozinha' | 'Banheiro' | 'Serviço' | 'Varanda' | 'Circulação';
export const ROOM_TYPES: RoomType[] = ['Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Serviço', 'Varanda', 'Circulação'];
export type QRoom = { id: string; name: string; type: RoomType; x: number; y: number; w: number; d: number; h: number };
export type QuantModel = { rooms: QRoom[]; updatedAt: string; source: string };

export const SNAP = 0.05;
export const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const r2 = (v: number) => Math.round(v * 100) / 100;
export const roomArea = (r: QRoom) => r2(r.w * r.d);
export const totalArea = (rooms: QRoom[]) => r2(rooms.reduce((t, r) => t + r.w * r.d, 0));

// Program by share of the built area (a typical 3-bedroom residence).
const PROGRAM: [string, RoomType, number][] = [
  ['Sala de estar e jantar', 'Sala', 0.22], ['Cozinha', 'Cozinha', 0.09], ['Serviço', 'Serviço', 0.05], ['Varanda', 'Varanda', 0.06],
  ['Suíte', 'Quarto', 0.14], ['Banheiro suíte', 'Banheiro', 0.04], ['Quarto 1', 'Quarto', 0.11], ['Quarto 2', 'Quarto', 0.1],
  ['Banheiro social', 'Banheiro', 0.04], ['Circulação', 'Circulação', 0.15],
];

// Two-row strip layout that hits the target area exactly: row depth D, widths scaled to fill the width W.
export function generateLayout(area: number, uid: (i: number) => string = (i) => `room-${i}`): QRoom[] {
  const W = Math.sqrt(area * 1.6);
  const D = area / W / 2;
  const rows: [string, RoomType, number][][] = [PROGRAM.slice(0, 4), PROGRAM.slice(4)];
  const out: QRoom[] = [];
  rows.forEach((row, ri) => {
    const share = row.reduce((t, [, , s]) => t + s, 0);
    // Edges are rounded first and widths derived from them, so neighbours never overlap after rounding.
    let acc = 0;
    const edges = [0, ...row.map(([, , s]) => r2((acc += s / share) * W))];
    edges[edges.length - 1] = r2(W);
    const y0 = r2(ri * D);
    const y1 = r2((ri + 1) * D);
    row.forEach(([name, type], i) => out.push({ id: uid(out.length), name, type, x: edges[i], y: y0, w: r2(edges[i + 1] - edges[i]), d: r2(y1 - y0), h: 2.8 }));
  });
  return out;
}

export function fitToArea(rooms: QRoom[], target: number): QRoom[] {
  const current = totalArea(rooms);
  if (!current) return rooms;
  const k = Math.sqrt(target / current);
  return rooms.map((r) => ({ ...r, x: r2(r.x * k), y: r2(r.y * k), w: r2(r.w * k), d: r2(r.d * k) }));
}

// Union of collinear edges so a wall shared by two rooms is built once.
function unionLength(intervals: [number, number][]) {
  const s = intervals.map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]).sort((a, b) => a[0] - b[0]);
  let len = 0;
  let cur: [number, number] | null = null;
  for (const iv of s) {
    if (!cur || iv[0] > cur[1] + 1e-6) { if (cur) len += cur[1] - cur[0]; cur = [...iv]; } else cur[1] = Math.max(cur[1], iv[1]);
  }
  return cur ? len + cur[1] - cur[0] : len;
}

export type WallSeg = { x1: number; y1: number; x2: number; y2: number };
export function wallSegments(rooms: QRoom[]): WallSeg[] {
  const h = new Map<string, [number, number][]>();
  const v = new Map<string, [number, number][]>();
  const add = (m: Map<string, [number, number][]>, k: number, a: number, b: number) => { const key = k.toFixed(2); m.set(key, [...(m.get(key) ?? []), [a, b]]); };
  rooms.forEach((r) => { add(h, r.y, r.x, r.x + r.w); add(h, r.y + r.d, r.x, r.x + r.w); add(v, r.x, r.y, r.y + r.d); add(v, r.x + r.w, r.y, r.y + r.d); });
  const merge = (list: [number, number][]) => {
    const s = [...list].sort((a, b) => a[0] - b[0]);
    const out: [number, number][] = [];
    s.forEach((iv) => { const last = out[out.length - 1]; if (last && iv[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], iv[1]); else out.push([...iv]); });
    return out;
  };
  const segs: WallSeg[] = [];
  h.forEach((list, key) => merge(list).forEach(([a, b]) => segs.push({ x1: a, y1: Number(key), x2: b, y2: Number(key) })));
  v.forEach((list, key) => merge(list).forEach(([a, b]) => segs.push({ x1: Number(key), y1: a, x2: Number(key), y2: b })));
  return segs;
}

export function quantities(rooms: QRoom[]) {
  const hMap = new Map<string, [number, number][]>();
  const vMap = new Map<string, [number, number][]>();
  rooms.forEach((r) => {
    for (const y of [r.y, r.y + r.d]) hMap.set(y.toFixed(2), [...(hMap.get(y.toFixed(2)) ?? []), [r.x, r.x + r.w]]);
    for (const x of [r.x, r.x + r.w]) vMap.set(x.toFixed(2), [...(vMap.get(x.toFixed(2)) ?? []), [r.y, r.y + r.d]]);
  });
  const wallLength = r2([...hMap.values(), ...vMap.values()].reduce((t, list) => t + unionLength(list), 0));
  const avgH = rooms.length ? rooms.reduce((t, r) => t + r.h, 0) / rooms.length : 2.8;
  const floor = totalArea(rooms);
  const wet = r2(rooms.filter((r) => r.type === 'Banheiro' || r.type === 'Serviço' || r.type === 'Varanda').reduce((t, r) => t + r.w * r.d, 0));
  return {
    floor,
    ceiling: r2(rooms.filter((r) => r.type !== 'Varanda').reduce((t, r) => t + r.w * r.d, 0)),
    wallLength,
    masonry: r2(wallLength * avgH), // each wall built once
    wallFinish: r2(rooms.reduce((t, r) => t + 2 * (r.w + r.d) * r.h, 0)), // every room finishes its own faces
    waterproofing: wet,
    byType: ROOM_TYPES.map((type) => ({ type, area: r2(rooms.filter((r) => r.type === type).reduce((t, r) => t + r.w * r.d, 0)) })).filter((t) => t.area > 0),
  };
}

export const overlaps = (a: QRoom, b: QRoom) => a.id !== b.id && a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.d - 1e-6 && b.y < a.y + a.d - 1e-6;
