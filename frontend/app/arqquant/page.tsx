'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Check, Download, Eye, Layers3, Plus, Ruler, Save, Sparkles, Trash2, TriangleAlert, WandSparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { ChartCard, MetricCard, PageHeader, Picker, StatusBadge } from '@/components/common';
import { SpatialPreview } from '@/components/arqquant-3d';
import { useDemo } from '@/hooks/use-demo';
import { date, rooms as seedRooms } from '@/services/mock-data';

type EditableRoom = { name: string; area: number; x: number; y: number; w: number; h: number };
const BASE_W = 620;
const BASE_H = 420;
const BASE_AREA = seedRooms.reduce((sum, room) => sum + room.area, 0);

function roomsForArea(area: number): EditableRoom[] {
  const scale = area > 0 ? area / BASE_AREA : 1;
  const scaled = seedRooms.map((room) => ({ ...room, area: Math.round(room.area * scale * 10) / 10 }));
  const difference = Math.round((area - scaled.reduce((sum, room) => sum + room.area, 0)) * 10) / 10;
  if (scaled.length) scaled[scaled.length - 1].area = Math.round((scaled[scaled.length - 1].area + difference) * 10) / 10;
  return scaled;
}

function ArqQuantView() {
  const { projects, quants, update, notice } = useDemo();
  const params = useSearchParams();
  const [project, setProject] = useState(projects.find((item) => item.id === params.get('project'))?.name || projects[0].name);
  const initialProject = projects.find((item) => item.name === project) || projects[0];
  const [draftRooms, setDraftRooms] = useState<EditableRoom[]>(() => roomsForArea(initialProject.area));
  const [active, setActive] = useState(seedRooms[0].name);
  const [view, setView] = useState<'plan' | 'model'>('model');
  const [material, setMaterial] = useState<'Concreto' | 'Madeira' | 'Claro'>('Concreto');
  const [modelQuality, setModelQuality] = useState('Estudo rápido');
  const p = projects.find((item) => item.name === project) || projects[0];
  const room = draftRooms.find((item) => item.name === active) || draftRooms[0];
  const total = Math.round(draftRooms.reduce((sum, item) => sum + item.area, 0) * 10) / 10;
  const diff = Math.round((total - p.area) * 10) / 10;
  const saved = quants.filter((item) => item.projectId === p.id);

  useEffect(() => {
    const next = roomsForArea(p.area);
    setDraftRooms(next);
    setActive(next[0].name);
  }, [p.id, p.area]);

  const updateRoom = (field: 'name' | 'area', value: string) => {
    if (!room) return;
    setDraftRooms((current) => current.map((item) => item.name === room.name ? { ...item, [field]: field === 'area' ? Number(value) || 0 : value } : item));
    if (field === 'name') setActive(value);
  };

  const addRoom = () => {
    const next = { name: `Ambiente ${draftRooms.length + 1}`, area: 10, x: 70 + (draftRooms.length * 32) % 400, y: 315, w: 120, h: 70 };
    setDraftRooms((current) => [...current, next]);
    setActive(next.name);
    notice('Novo ambiente adicionado ao estudo.');
  };

  const removeRoom = () => {
    if (!room || draftRooms.length <= 1) return;
    const next = draftRooms.filter((item) => item.name !== room.name);
    setDraftRooms(next);
    setActive(next[0].name);
    notice('Ambiente removido do estudo.');
  };

  function save() {
    const quant = { id: `quant-${Date.now()}`, projectId: p.id, date: '2026-09-19', area: total };
    update((state) => ({ ...state, quants: [quant, ...state.quants] }));
    notice('Estudo e quantitativo vinculados ao projeto.');
  }

  async function exportXlsx() {
    const XLSX = await import('xlsx');
    const rows = draftRooms.map((item) => ({ Ambiente: item.name, 'Área (m²)': item.area, 'Modelo 3D': modelQuality }));
    rows.push({ Ambiente: 'Total', 'Área (m²)': total, 'Modelo 3D': '—' });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'ArqQuant');
    XLSX.writeFile(workbook, `arqquant-${p.name}.xlsx`);
    notice('Quantitativo editado exportado.');
  }

  const roomCount = useMemo(() => draftRooms.length, [draftRooms.length]);

  return <>
    <PageHeader eyebrow="ARQQUANT AI · ESTÚDIO DO PROJETO" title="Medir, editar e visualizar em 3D" description="Um estudo espacial vinculado ao projeto, com planta editável, volumetria conceitual e quantitativos prontos para revisão.">
      <Picker label="Projeto vinculado" value={project} onChange={setProject} options={projects.map((item) => item.name)} />
      <button className="btn" type="button" onClick={exportXlsx}><Download size={15} />Exportar quantitativo</button>
      <button className="btn primary" type="button" onClick={save}><Save size={15} />Salvar no projeto</button>
    </PageHeader>

    <div className="quant-project-context"><span className="quant-project-icon"><Layers3 size={18} /></span><div><span className="eyebrow">PROJETO VINCULADO</span><strong>{p.name}</strong><small>{p.client} · {p.type} · {p.area} m² no memorial</small></div><span className="badge green"><Check size={12} />Contexto ativo</span></div>

    <div className="metrics four quant-metrics"><MetricCard icon={Ruler} label="Área levantada" value={`${total} m²`} change={`${roomCount} ambientes editáveis`} /><MetricCard icon={Layers3} label="Modelo espacial" value="3D" change={`${modelQuality} · gerado pela IA`} /><MetricCard icon={Eye} label="Confiança da leitura" value="94%" change="Revisão disponível" /><MetricCard icon={Sparkles} label="Diferença do memorial" value={`${Math.abs(diff)} m²`} change={diff === 0 ? 'Compatível' : 'Sinalizar para revisão'} /></div>

    <div className="quant-studio-toolbar"><div><span className="eyebrow">ESTÚDIO DE MODELAGEM</span><strong>Residencial Boa Viagem · revisão espacial</strong><small>Edite a leitura automática e veja o impacto no modelo em tempo real.</small></div><div className="quant-view-switch"><button type="button" className={view === 'plan' ? 'active' : ''} onClick={() => setView('plan')}><Ruler size={14} />Planta editável</button><button type="button" className={view === 'model' ? 'active' : ''} onClick={() => setView('model')}><Layers3 size={14} />Modelo 3D</button></div></div>

    <div className="quant-studio-grid">
      <ChartCard title={view === 'model' ? 'Modelo 3D conceitual' : 'Planta reconhecida pela IA'} subtitle={view === 'model' ? 'Volumetria para estudar proporção, ocupação e materiais. Não substitui BIM executivo.' : 'Clique em um ambiente para editar nome, área e posição do estudo.'}>
        {view === 'model' ? <SpatialPreview rooms={draftRooms} material={material} onCapture={notice} /> : <div className="floorplan-wrap quant-floorplan-wrap"><div className="floorplan">{draftRooms.map((item) => <button type="button" key={item.name} className={`room ${active === item.name ? 'active' : ''}`} style={{ left: `${item.x / BASE_W * 100}%`, top: `${item.y / BASE_H * 100}%`, width: `${item.w / BASE_W * 100}%`, height: `${item.h / BASE_H * 100}%` }} onClick={() => setActive(item.name)}>{item.name}<b>{item.area} m²</b></button>)}</div><div className="plan-legend"><span><i className="legend-dot ai" />Leitura da IA</span><span><i className="legend-dot manual" />Editado pela equipe</span></div></div>}
      </ChartCard>

      <ChartCard title="Editor do estudo" subtitle={`Tudo aqui permanece vinculado a ${p.name}`}>
        {room && <div className="quant-editor"><div className="quant-editor-heading"><div><span className="badge neutral">Ambiente selecionado</span><h3>{room.name}</h3></div><button type="button" className="icon-btn" onClick={removeRoom} aria-label="Remover ambiente" title="Remover ambiente"><Trash2 size={16} /></button></div><label className="quant-field">Nome do ambiente<input value={room.name} onChange={(event) => updateRoom('name', event.target.value)} /></label><label className="quant-field">Área medida (m²)<input type="number" step="0.1" value={room.area} onChange={(event) => updateRoom('area', event.target.value)} /></label><div className="quant-editor-actions"><button type="button" className="btn" onClick={() => notice('Sugestão da IA aplicada: área revisada com base na planta.')}><WandSparkles size={14} />Sugerir pela IA</button><button type="button" className="btn" onClick={addRoom}><Plus size={14} />Novo ambiente</button></div><div className="quant-room-list">{draftRooms.map((item) => <button type="button" key={item.name} className={active === item.name ? 'active' : ''} onClick={() => setActive(item.name)}><span><i />{item.name}</span><b>{item.area} m²</b></button>)}</div><div className="quant-editor-section"><strong>Acabamento do estudo 3D</strong><div className="material-switch">{(['Concreto', 'Madeira', 'Claro'] as const).map((item) => <button type="button" key={item} className={material === item ? 'active' : ''} onClick={() => setMaterial(item)}>{item}</button>)}</div></div><label className="quant-field">Nível de geração<select value={modelQuality} onChange={(event) => setModelQuality(event.target.value)}><option>Estudo rápido</option><option>Estudo detalhado</option><option>Apresentação</option></select></label></div>}
      </ChartCard>
    </div>

    <div className="quant-bottom-grid"><ChartCard title="Leitura contra o memorial" subtitle="O ArqQuant sinaliza, a equipe decide.">{Math.abs(diff) < 1 ? <div className="quant-validation success"><Check size={18} /><div><strong>Área compatível</strong><p>O levantamento está alinhado ao memorial do projeto.</p></div></div> : <div className="quant-validation warning"><TriangleAlert size={18} /><div><strong>Diferença de {Math.abs(diff)} m²</strong><p>Memorial: {p.area} m² · Estudo atual: {total} m². Revise antes de enviar ao ArqBudget.</p></div></div>}<div className="quant-total"><span>Área total editada</span><b>{total} m²</b></div></ChartCard><ChartCard title="Histórico do projeto" subtitle={`Versões salvas no contexto de ${p.name}`}>{saved.length ? saved.map((item) => <div className="rank-row" key={item.id}><div><strong>{date(item.date)}</strong><small>Área total: {item.area} m² · origem: ArqQuant AI</small></div><StatusBadge value="Vinculado" /></div>) : <p className="muted">Este projeto ainda não tem uma versão salva.</p>}</ChartCard></div>
  </>;
}

export default function Page() {
  return <Suspense><ArqQuantView /></Suspense>;
}
