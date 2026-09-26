'use client';

import '@/app/quant.css';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Check, Columns2, Copy, FileBox, Layers3, LoaderCircle, Maximize2, Plus, Redo2, Ruler, Save, Sparkles, Trash2, TriangleAlert, Undo2, UploadCloud } from 'lucide-react';
import { useDemo } from '@/hooks/use-demo';
import { ROOM_TYPES, fitToArea, generateLayout, overlaps, quantities, roomArea, snap, totalArea } from '@/lib/quant-model';
import type { QRoom, QuantModel, RoomType } from '@/lib/quant-model';
import { Quant3D, typeColor } from '@/components/quant-3d';

const uid = () => `room-${crypto.randomUUID().slice(0, 6)}`;
const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
const fmt = (v: number, unit = 'm²') => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;

export function QuantStudio({ projectId, onOpenBudget }: { projectId?: string; onOpenBudget?: () => void }) {
  const { projects } = useDemo();
  const [scopeId, setScopeId] = useState(projectId ?? projects[0]?.id);
  return <div className="qs-wrap">
    {!projectId && <label className="bw-project qs-project"><span className="sr-only">Projeto</span><select value={scopeId} onChange={(e) => setScopeId(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    <Studio key={scopeId} projectId={scopeId} onOpenBudget={onOpenBudget} />
  </div>;
}

function Studio({ projectId, onOpenBudget }: { projectId: string; onOpenBudget?: () => void }) {
  const { projects, quantModels, quants, documents, update, notice } = useDemo();
  const project = projects.find((p) => p.id === projectId)!;
  const saved = quantModels[projectId];
  const memorial = documents.find((d) => d.projectId === projectId && d.category === 'Memorial Descritivo')?.area ?? project.area;
  const [rooms, setRooms] = useState<QRoom[]>(saved?.rooms ?? []);
  const [selected, setSelected] = useState<string | undefined>(saved?.rooms[0]?.id);
  const [view, setView] = useState<'split' | 'plan' | '3d'>('split');
  const [past, setPast] = useState<QRoom[][]>([]);
  const [future, setFuture] = useState<QRoom[][]>([]);
  const [importing, setImporting] = useState<number | null>(null);
  const room = rooms.find((r) => r.id === selected);
  const q = quantities(rooms);
  const area = totalArea(rooms);
  const diff = Math.round((area - memorial) * 100) / 100;
  const versions = quants.filter((v) => v.projectId === projectId);

  // Every committed edit is persisted (so ArqBudget and ArqCheck see it) and goes on the undo stack.
  function commit(next: QRoom[], source = 'Editado pela equipe', prev = rooms) {
    setPast((p) => [...p.slice(-49), prev]);
    setFuture([]);
    setRooms(next);
    update((s) => ({ ...s, quantModels: { ...s.quantModels, [projectId]: { rooms: next, updatedAt: now(), source } satisfies QuantModel } }));
  }
  const undo = () => { const prev = past.at(-1); if (!prev) return; setFuture((f) => [rooms, ...f]); setPast((p) => p.slice(0, -1)); setRooms(prev); update((s) => ({ ...s, quantModels: { ...s.quantModels, [projectId]: { rooms: prev, updatedAt: now(), source: 'Editado pela equipe' } } })); };
  const redo = () => { const next = future[0]; if (!next) return; setPast((p) => [...p, rooms]); setFuture((f) => f.slice(1)); setRooms(next); update((s) => ({ ...s, quantModels: { ...s.quantModels, [projectId]: { rooms: next, updatedAt: now(), source: 'Editado pela equipe' } } })); };
  const patch = (id: string, p: Partial<QRoom>) => commit(rooms.map((r) => (r.id === id ? { ...r, ...p } : r)));
  function addRoom(type: RoomType) {
    const maxX = rooms.length ? Math.max(...rooms.map((r) => r.x + r.w)) : 0;
    const r: QRoom = { id: uid(), name: `${type} ${rooms.filter((x) => x.type === type).length + 1}`, type, x: snap(maxX + 0.5), y: 0, w: 3, d: 3, h: 2.8 };
    commit([...rooms, r]);
    setSelected(r.id);
  }
  const duplicate = () => { if (!room) return; const r = { ...room, id: uid(), name: `${room.name} (cópia)`, x: snap(room.x + 0.5), y: snap(room.y + 0.5) }; commit([...rooms, r]); setSelected(r.id); };
  const remove = () => { if (!room) return; const next = rooms.filter((r) => r.id !== room.id); commit(next); setSelected(next[0]?.id); };

  const steps = ['Lendo arquivo BIM (IFC 4)', 'Encontrados 12 IfcSpace, 38 IfcWall e 17 IfcDoor', 'Convertendo espaços em ambientes com dimensões', 'Conferindo com a área do memorial'];
  async function generate(fromBim?: string) {
    if (fromBim) for (let i = 0; i < steps.length; i++) { setImporting(i); await new Promise((r) => setTimeout(r, 450)); }
    setImporting(null);
    const next = generateLayout(memorial, () => uid());
    commit(next, fromBim ? `BIM ${fromBim}` : 'Gerado pela IA');
    setSelected(next[0].id);
    if (fromBim) update((s) => ({ ...s, assets: [{ id: `asset-${uid()}`, projectId, kind: 'BIM' as const, name: fromBim, date: now().slice(0, 10), status: 'Processado' }, ...s.assets] }));
    notice(fromBim ? `Modelo BIM ${fromBim} lido: ${next.length} ambientes.` : `Layout gerado pela IA com ${next.length} ambientes.`);
  }
  function saveVersion() {
    update((s) => ({ ...s, quants: [{ id: `quant-${uid()}`, projectId, date: now().slice(0, 10), area }, ...s.quants] }));
    notice('Versão do levantamento salva no projeto.');
  }
  function exportXlsx() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rooms.map((r) => ({ Ambiente: r.name, Tipo: r.type, 'Largura (m)': r.w, 'Profundidade (m)': r.d, 'Pé-direito (m)': r.h, 'Área (m²)': roomArea(r) }))), 'Ambientes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Item: 'Piso', Quantidade: q.floor, Unidade: 'm²' }, { Item: 'Forro', Quantidade: q.ceiling, Unidade: 'm²' }, { Item: 'Alvenaria', Quantidade: q.masonry, Unidade: 'm²' }, { Item: 'Revestimento de parede', Quantidade: q.wallFinish, Unidade: 'm²' }, { Item: 'Impermeabilização', Quantidade: q.waterproofing, Unidade: 'm²' }, { Item: 'Extensão de paredes', Quantidade: q.wallLength, Unidade: 'm' }]), 'Quantitativos');
    XLSX.writeFile(wb, `arqquant-${project.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  }

  // Keyboard: arrows nudge (Shift = 50 cm), Delete removes, Ctrl+Z / Ctrl+Y / Ctrl+D.
  const keyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input,select,textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); return redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); return duplicate(); }
    if (!room) return;
    const step = e.shiftKey ? 0.5 : 0.05;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) { e.preventDefault(); patch(room.id, { x: snap(Math.max(0, room.x + moves[e.key][0])), y: snap(Math.max(0, room.y + moves[e.key][1])) }); }
    if (e.key === 'Delete') remove();
  };
  useEffect(() => { keyRef.current = onKey; });
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (hostRef.current?.contains(document.activeElement) || document.activeElement === document.body) keyRef.current?.(e); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  if (!rooms.length) return <div className="qs-start">
    <Layers3 size={24} />
    <div><h2>Levantamento de {project.name}</h2><p>Gere o layout com a IA a partir da área do memorial ({fmt(memorial)}) ou envie o modelo BIM do projeto (.ifc). Depois é só arrastar, redimensionar e ajustar. Tudo vira quantitativo para o ArqBudget.</p>
      {importing === null ? <div className="bw-start-actions"><button type="button" className="btn primary" onClick={() => void generate()}><Sparkles size={15} />Gerar layout pela IA</button><label className="btn"><UploadCloud size={15} />Enviar modelo BIM<input type="file" accept=".ifc,.ifczip,.rvt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void generate(f.name); }} /></label></div>
        : <ul className="bw-steps">{steps.map((s, i) => <li key={s} className={i < importing ? 'done' : i === importing ? 'now' : ''}>{i < importing ? <Check size={12} /> : i === importing ? <LoaderCircle className="spin" size={12} /> : <i />}{s}</li>)}</ul>}
    </div>
  </div>;

  return <div className="qs" ref={hostRef} tabIndex={-1}>
    <div className="qs-toolbar">
      <div className="q3-seg" aria-label="Visualização">{([['split', 'Dividido', Columns2], ['plan', 'Planta', Ruler], ['3d', '3D', Layers3]] as const).map(([v, l, Icon]) => <button type="button" key={v} className={view === v ? 'on' : ''} aria-pressed={view === v} onClick={() => setView(v)}><Icon size={13} />{l}</button>)}</div>
      <div className="qs-group"><button type="button" onClick={undo} disabled={!past.length} aria-label="Desfazer (Ctrl+Z)" title="Desfazer (Ctrl+Z)"><Undo2 size={14} /></button><button type="button" onClick={redo} disabled={!future.length} aria-label="Refazer (Ctrl+Y)" title="Refazer (Ctrl+Y)"><Redo2 size={14} /></button></div>
      <label className="qs-add"><Plus size={14} /><span className="sr-only">Adicionar ambiente</span><select value="" onChange={(e) => e.target.value && addRoom(e.target.value as RoomType)}><option value="">Adicionar ambiente</option>{ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <button type="button" className="btn" onClick={() => commit(fitToArea(rooms, memorial), 'Ajustado ao memorial')} disabled={Math.abs(diff) < 0.5}><Maximize2 size={14} />Ajustar ao memorial</button>
      <span className="qs-spacer" />
      <label className="btn"><FileBox size={14} />Reimportar BIM<input type="file" accept=".ifc,.ifczip,.rvt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void generate(f.name); }} /></label>
      <button type="button" className="btn" onClick={exportXlsx}>Excel</button>
      <button type="button" className="btn primary" onClick={saveVersion}><Save size={14} />Salvar versão</button>
    </div>
    {importing !== null && <ul className="bw-steps inline">{steps.map((s, i) => <li key={s} className={i < importing ? 'done' : i === importing ? 'now' : ''}>{i < importing ? <Check size={12} /> : i === importing ? <LoaderCircle className="spin" size={12} /> : <i />}{s}</li>)}</ul>}

    <div className={`qs-main v-${view}`}>
      {view !== '3d' && <PlanEditor rooms={rooms} selected={selected} onSelect={setSelected} onPreview={setRooms} onCommit={(next, prev) => commit(next, 'Editado pela equipe', prev)} />}
      {view !== 'plan' && <Quant3D rooms={rooms} selectedId={selected} onSelect={setSelected} onNotice={notice} />}
      <aside className="qs-inspector">
        {room ? <>
          <header><i style={{ background: typeColor(room.type) }} /><input value={room.name} onChange={(e) => patch(room.id, { name: e.target.value })} aria-label="Nome do ambiente" /></header>
          <label>Tipo<select value={room.type} onChange={(e) => patch(room.id, { type: e.target.value as RoomType })}>{ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <div className="qs-dims">
            <label>Largura<span><input type="number" min={0.5} step={0.05} value={room.w} onChange={(e) => patch(room.id, { w: snap(Math.max(0.5, Number(e.target.value))) })} />m</span></label>
            <label>Profundidade<span><input type="number" min={0.5} step={0.05} value={room.d} onChange={(e) => patch(room.id, { d: snap(Math.max(0.5, Number(e.target.value))) })} />m</span></label>
            <label>Pé-direito<span><input type="number" min={2.2} max={6} step={0.05} value={room.h} onChange={(e) => patch(room.id, { h: snap(Number(e.target.value)) })} />m</span></label>
          </div>
          <div className="qs-area"><small>Área calculada</small><b>{fmt(roomArea(room))}</b></div>
          {rooms.some((r) => overlaps(r, room)) && <p className="qs-warn"><TriangleAlert size={13} />Sobrepõe outro ambiente. A área será contada duas vezes.</p>}
          <div className="qs-row"><button type="button" className="btn" onClick={duplicate}><Copy size={13} />Duplicar</button><button type="button" className="btn" onClick={remove}><Trash2 size={13} />Excluir</button></div>
        </> : <p className="qs-empty">Selecione um ambiente na planta ou no 3D.</p>}
        <ul className="qs-list">{rooms.map((r) => <li key={r.id}><button type="button" className={r.id === selected ? 'on' : ''} onClick={() => setSelected(r.id)}><i style={{ background: typeColor(r.type) }} /><span>{r.name}</span><b>{fmt(roomArea(r))}</b></button></li>)}</ul>
        <small className="qs-keys">Setas movem 5 cm (Shift: 50 cm) · Delete exclui · Ctrl+D duplica · Ctrl+Z desfaz</small>
      </aside>
    </div>

    <div className="qs-bottom">
      <section className="qs-q">
        <header><strong>Quantitativos do modelo</strong><small>calculados pela geometria · usados pelo ArqBudget</small>{onOpenBudget && <button type="button" className="ck-link" onClick={onOpenBudget}>Abrir no ArqBudget</button>}</header>
        <div className="qs-q-grid">
          <div><small>Piso</small><b>{fmt(q.floor)}</b></div>
          <div><small>Forro</small><b>{fmt(q.ceiling)}</b></div>
          <div><small>Alvenaria</small><b>{fmt(q.masonry)}</b><em>paredes contadas uma vez</em></div>
          <div><small>Revestimento de parede</small><b>{fmt(q.wallFinish)}</b><em>as duas faces</em></div>
          <div><small>Impermeabilização</small><b>{fmt(q.waterproofing)}</b><em>áreas molhadas</em></div>
          <div><small>Extensão de paredes</small><b>{fmt(q.wallLength, 'm')}</b></div>
        </div>
      </section>
      <section className={`qs-memo ${Math.abs(diff) >= 0.5 ? 'warn' : ''}`}>
        <strong>{Math.abs(diff) < 0.5 ? 'Compatível com o memorial' : `${diff > 0 ? '+' : ''}${fmt(diff)} em relação ao memorial`}</strong>
        <p>Memorial {fmt(memorial)} · modelo {fmt(area)}{Math.abs(diff) >= 0.5 ? ' · o ArqCheck vai sinalizar essa diferença' : ''}</p>
        <div className="qs-types">{q.byType.map((t) => <span key={t.type} style={{ width: `${(t.area / (area || 1)) * 100}%`, background: typeColor(t.type) }} title={`${t.type}: ${fmt(t.area)}`} />)}</div>
        <ul>{q.byType.map((t) => <li key={t.type}><i style={{ background: typeColor(t.type) }} />{t.type}<b>{fmt(t.area)}</b></li>)}</ul>
        {versions.length > 0 && <small>{versions.length} versão{versions.length > 1 ? 'ões' : ''} salva{versions.length > 1 ? 's' : ''} · última {versions[0].date.split('-').reverse().join('/')} · {fmt(versions[0].area)}</small>}
      </section>
    </div>
  </div>;
}

// SVG plan in meters: drag to move, corner handle to resize, wheel to zoom, drag empty area to pan.
function PlanEditor({ rooms, selected, onSelect, onPreview, onCommit }: { rooms: QRoom[]; selected?: string; onSelect: (id: string) => void; onPreview: (r: QRoom[]) => void; onCommit: (next: QRoom[], prev: QRoom[]) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ mode: 'move' | 'resize' | 'pan'; id?: string; start: { x: number; y: number }; orig: QRoom[]; vb?: number[] } | null>(null);
  const maxX = Math.max(10, ...rooms.map((r) => r.x + r.w)), maxY = Math.max(8, ...rooms.map((r) => r.y + r.d));
  const [vb, setVb] = useState<number[] | null>(null);
  const view = vb ?? [-1.5, -1.5, maxX + 3, maxY + 3];
  const toM = (e: React.PointerEvent | React.WheelEvent) => { const pt = svgRef.current!.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svgRef.current!.getScreenCTM()!.inverse()); return { x: p.x, y: p.y }; };

  function start(e: React.PointerEvent, mode: 'move' | 'resize' | 'pan', id?: string) {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (id) onSelect(id);
    drag.current = { mode, id, start: mode === 'pan' ? { x: e.clientX, y: e.clientY } : toM(e), orig: rooms, vb: view };
  }
  function moveP(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (d.mode === 'pan') { const k = d.vb![2] / svgRef.current!.getBoundingClientRect().width; setVb([d.vb![0] - (e.clientX - d.start.x) * k, d.vb![1] - (e.clientY - d.start.y) * k, d.vb![2], d.vb![3]]); return; }
    const p = toM(e);
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    onPreview(d.orig.map((r) => (r.id !== d.id ? r : d.mode === 'move' ? { ...r, x: snap(Math.max(0, r.x + dx)), y: snap(Math.max(0, r.y + dy)) } : { ...r, w: snap(Math.max(0.8, r.w + dx)), d: snap(Math.max(0.8, r.d + dy)) })));
  }
  function end() {
    const d = drag.current;
    drag.current = null;
    if (d && d.mode !== 'pan' && rooms !== d.orig) onCommit(rooms, d.orig);
  }
  function wheel(e: React.WheelEvent) {
    const p = toM(e);
    const k = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    setVb([p.x - (p.x - view[0]) * k, p.y - (p.y - view[1]) * k, view[2] * k, view[3] * k]);
  }

  const grid = [];
  for (let x = Math.floor(view[0]); x <= view[0] + view[2]; x++) grid.push(<line key={`x${x}`} x1={x} y1={view[1]} x2={x} y2={view[1] + view[3]} className={x % 5 ? 'g' : 'g5'} />);
  for (let y = Math.floor(view[1]); y <= view[1] + view[3]; y++) grid.push(<line key={`y${y}`} x1={view[0]} y1={y} x2={view[0] + view[2]} y2={y} className={y % 5 ? 'g' : 'g5'} />);
  const sel = rooms.find((r) => r.id === selected);
  const dimFs = Math.max(0.3, view[2] / 60);

  return <div className="qp">
    <svg ref={svgRef} viewBox={view.join(' ')} onPointerDown={(e) => start(e, 'pan')} onPointerMove={moveP} onPointerUp={end} onPointerCancel={end} onWheel={wheel} role="application" aria-label="Planta editável em metros">
      <g className="qp-grid">{grid}</g>
      {rooms.map((r) => {
        const on = r.id === selected;
        const bad = rooms.some((o) => overlaps(o, r));
        // Label size follows the plan scale, capped by the room so names fit.
        // ~0.56 em per character: shrink the name until it fits the room width.
        const base = Math.min(Math.min(r.w, r.d) / 4, Math.max(0.38, view[2] / 42));
        const across = (r.w * 0.9) / (r.name.length * 0.56);
        const along = (r.d * 0.9) / (r.name.length * 0.56);
        // Tall, narrow rooms read better with the label rotated along their length.
        const vertical = along > across * 1.5 && across < base * 0.7;
        const fs = Math.min(base, vertical ? along : across, vertical ? r.w / 2.6 : Infinity);
        const cx = r.x + r.w / 2, cy = r.y + r.d / 2;
        return <g key={r.id} className={`qp-room ${on ? 'on' : ''} ${bad ? 'bad' : ''}`} onPointerDown={(e) => start(e, 'move', r.id)}>
          <rect x={r.x} y={r.y} width={r.w} height={r.d} style={{ fill: typeColor(r.type) }} className="qp-fill" />
          <rect x={r.x} y={r.y} width={r.w} height={r.d} className="qp-edge" />
          <g transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
            <text x={cx} y={cy - fs * 0.2} fontSize={fs} className="qp-name">{r.name}</text>
            <text x={cx} y={cy + fs * 1.1} fontSize={fs * 0.85} className="qp-area">{roomArea(r).toLocaleString('pt-BR')} m²</text>
          </g>
        </g>;
      })}
      {sel && <g className="qp-dims">
        <line x1={sel.x} y1={sel.y - 0.45} x2={sel.x + sel.w} y2={sel.y - 0.45} /><text x={sel.x + sel.w / 2} y={sel.y - 0.6} fontSize={dimFs}>{sel.w.toFixed(2).replace('.', ',')} m</text>
        <line x1={sel.x - 0.45} y1={sel.y} x2={sel.x - 0.45} y2={sel.y + sel.d} /><text x={sel.x - 0.6} y={sel.y + sel.d / 2} fontSize={dimFs} transform={`rotate(-90 ${sel.x - 0.6} ${sel.y + sel.d / 2})`}>{sel.d.toFixed(2).replace('.', ',')} m</text>
        <rect x={sel.x + sel.w - 0.22} y={sel.y + sel.d - 0.22} width={0.44} height={0.44} rx={0.08} className="qp-handle" onPointerDown={(e) => start(e, 'resize', sel.id)} />
      </g>}
    </svg>
    <div className="qp-legend"><button type="button" onClick={() => setVb(null)}>Enquadrar</button><span>Arraste para mover · alça no canto para redimensionar · roda para zoom · arraste o fundo para navegar · grade de 1 m</span></div>
  </div>;
}
