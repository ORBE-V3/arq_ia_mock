'use client';
import { useState } from 'react';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,CartesianGrid,PieChart,Pie,Cell} from 'recharts';
import {LockKeyhole,ShieldCheck,SlidersHorizontal} from 'lucide-react';
import {PageHeader,MetricCard,ChartCard,StatusBadge} from '@/components/common';
import {chartColors} from '@/components/dashboard';
import {useDemo} from '@/hooks/use-demo';
import {money} from '@/services/mock-data';

const risks=['Baixo','Médio','Alto'];
const tooltipStyle={background:'var(--surface-raised)',border:'1px solid var(--border)',borderRadius:10,color:'var(--foreground)',boxShadow:'var(--shadow)'};

export default function Page(){
  const{projects,pendings,radarAccess}=useDemo();
  const[projectId,setProjectId]=useState('Todos');
  const[region,setRegion]=useState('Todas');
  const[status,setStatus]=useState('Todos');
  const[owner,setOwner]=useState('Todos');
  const[client,setClient]=useState('Todos');
  const[pendingType,setPendingType]=useState('Todos');
  const visibleProjects=projects.filter((p)=>(projectId==='Todos'||p.id===projectId)&&(status==='Todos'||p.status===status)&&(owner==='Todos'||p.owner===owner)&&(client==='Todos'||p.client===client));
  const visiblePendings=pendings.filter((p)=>(projectId==='Todos'||p.projectId===projectId)&&(pendingType==='Todos'||p.type===pendingType));
  const revenue=visibleProjects.reduce((s,p)=>s+p.revenue,0);
  const cost=visibleProjects.reduce((s,p)=>s+p.cost,0);
  const hours=visibleProjects.reduce((s,p)=>s+p.hours,0);
  const margin=Math.round((revenue-cost)/revenue*100);
  const top=[...visibleProjects].sort((a,b)=>b.revenue-b.cost-(a.revenue-a.cost)).slice(0,6).map(p=>({name:p.name.split(' ').slice(0,2).join(' '),Receita:p.revenue,Custo:p.cost}));
  const ranked=[...visibleProjects].map(p=>({...p,marginPct:Math.round((p.revenue-p.cost)/p.revenue*100)})).sort((a,b)=>b.marginPct-a.marginPct);
  const riskData=risks.map(name=>({name,value:visibleProjects.filter(p=>p.risk===name).length}));
  if(!radarAccess.general)return <><PageHeader eyebrow="ARQRADAR" title="Acesso controlado" description="O dashboard geral está disponível apenas para perfis administrativos."/><div className="restricted-state"><LockKeyhole size={28}/><h2>Este painel não está liberado para o seu perfil</h2><p>Você ainda pode acessar o ArqRadar dentro de projetos autorizados. Solicite acesso geral a um administrador.</p></div></>;
  return <>
      <PageHeader eyebrow="ARQRADAR" title="ArqRadar" description="Indicadores financeiros e operacionais de todo o escritório."/>
    <div className="radar-global-controls"><div><SlidersHorizontal size={16}/><strong>Escopo do dashboard</strong><small>Filtros aplicados à visão administrativa do portfólio</small></div><label>Projeto<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option>Todos</option>{projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Regional<select value={region} onChange={e=>setRegion(e.target.value)}><option>Todas</option><option>Matriz Recife</option><option>São Paulo</option><option>Salvador</option></select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option>Todos</option>{Array.from(new Set(projects.map(p=>p.status))).map(s=><option key={s}>{s}</option>)}</select></label><label>Responsável<select value={owner} onChange={e=>setOwner(e.target.value)}><option>Todos</option>{Array.from(new Set(projects.map(p=>p.owner))).map(s=><option key={s}>{s}</option>)}</select></label><label>Cliente<select value={client} onChange={e=>setClient(e.target.value)}><option>Todos</option>{Array.from(new Set(projects.map(p=>p.client))).map(s=><option key={s}>{s}</option>)}</select></label><label>Tipo de pendência<select value={pendingType} onChange={e=>setPendingType(e.target.value)}><option>Todos</option>{Array.from(new Set(pendings.map(p=>p.type))).map(s=><option key={s}>{s}</option>)}</select></label><span className="radar-filter-result"><ShieldCheck size={13}/> {visibleProjects.length} projetos · {visiblePendings.length} pendências</span></div>
    <div className="metrics four">
      <MetricCard label="Receita do portfólio" value={money(revenue)} change="Somatório de todos os projetos"/>
      <MetricCard label="Custo do portfólio" value={money(cost)} change="Somatório de todos os projetos"/>
      <MetricCard label="Margem média" value={`${margin}%`} change="Receita menos custo estimado"/>
      <MetricCard label="Horas registradas" value={`${hours}h`} change="Em todos os projetos ativos"/>
    </div>
    <div className="charts-grid">
      <ChartCard title="Receita x Custo" subtitle="Os 6 projetos com maior margem estimada">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top} margin={{left:-20,right:10,top:10,bottom:0}}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)"/>
            <XAxis dataKey="name" tick={{fontSize:11,fill:'var(--muted-text)'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:12,fill:'var(--muted-text)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v/1000}k`}/>
            <Tooltip contentStyle={tooltipStyle} formatter={(v)=>money(Number(v))}/>
            <Bar dataKey="Receita" fill="var(--chart-1)" radius={[5,5,0,0]}/>
            <Bar dataKey="Custo" fill="var(--chart-2)" radius={[5,5,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Projetos por risco" subtitle="Distribuição do portfólio ativo">
        <div className="status-chart"><div className="donut">
          <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={riskData} dataKey="value" innerRadius={67} outerRadius={89} paddingAngle={4} stroke="none">{riskData.map((d,i)=><Cell key={d.name} fill={chartColors[i]}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer>
          <div className="donut-label"><b>{projects.length}</b><span>projetos</span></div>
        </div><div className="legend">{riskData.map((d,i)=><div key={d.name}><span><i style={{background:chartColors[i]}}/>{d.name}</span><b>{d.value}</b></div>)}</div></div>
      </ChartCard>
    </div>
    <div className="bottom-grid">
      <ChartCard title="Maior margem estimada" subtitle="Projetos mais rentáveis do portfólio">{ranked.slice(0,5).map((p,i)=><div key={p.id} className="rank-row"><b>{i+1}</b><div><strong>{p.name}</strong><small>{p.client}</small></div><StatusBadge value={`${p.marginPct}%`}/></div>)}</ChartCard>
      <ChartCard title="Menor margem estimada" subtitle="Projetos que merecem atenção financeira">{ranked.slice(-5).reverse().map((p,i)=><div key={p.id} className="rank-row"><b>{i+1}</b><div><strong>{p.name}</strong><small>{p.client}</small></div><StatusBadge value={`${p.marginPct}%`}/></div>)}</ChartCard>
    </div>
  </>;
}
