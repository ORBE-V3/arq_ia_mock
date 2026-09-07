'use client';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,CartesianGrid,PieChart,Pie,Cell} from 'recharts';
import {PageHeader,MetricCard,ChartCard,StatusBadge} from '@/components/common';
import {chartColors} from '@/components/dashboard';
import {useDemo} from '@/hooks/use-demo';
import {money} from '@/services/mock-data';

const risks=['Baixo','Médio','Alto'];
const tooltipStyle={background:'var(--surface-raised)',border:'1px solid var(--border)',borderRadius:10,color:'var(--foreground)',boxShadow:'var(--shadow)'};

export default function Page(){
  const{projects}=useDemo();
  const revenue=projects.reduce((s,p)=>s+p.revenue,0);
  const cost=projects.reduce((s,p)=>s+p.cost,0);
  const hours=projects.reduce((s,p)=>s+p.hours,0);
  const margin=Math.round((revenue-cost)/revenue*100);
  const top=[...projects].sort((a,b)=>b.revenue-b.cost-(a.revenue-a.cost)).slice(0,6).map(p=>({name:p.name.split(' ').slice(0,2).join(' '),Receita:p.revenue,Custo:p.cost}));
  const ranked=[...projects].map(p=>({...p,marginPct:Math.round((p.revenue-p.cost)/p.revenue*100)})).sort((a,b)=>b.marginPct-a.marginPct);
  const riskData=risks.map(name=>({name,value:projects.filter(p=>p.risk===name).length}));
  return <>
    <PageHeader eyebrow="ARQRADAR" title="ArqRadar" description="Indicadores financeiros e operacionais de todo o escritório."/>
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
            <Bar dataKey="Custo" fill="#6f8f83" radius={[5,5,0,0]}/>
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
