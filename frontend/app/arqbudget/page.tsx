'use client';

import { Suspense, useState } from 'react';
import { Calculator, Check, ChevronRight, Database, Globe2, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { ChartCard, MetricCard, PageHeader, Picker, StatusBadge } from '@/components/common';
import { useDemo } from '@/hooks/use-demo';
import { money } from '@/services/mock-data';

const items = [
  { name: 'Concreto estrutural', unit: 'm³', quantity: 42.8, base: 490 },
  { name: 'Aço CA-50', unit: 'kg', quantity: 3180, base: 8.9 },
  { name: 'Alvenaria cerâmica', unit: 'm²', quantity: 286, base: 86 },
  { name: 'Revestimento interno', unit: 'm²', quantity: 612, base: 54 },
  { name: 'Esquadrias de alumínio', unit: 'm²', quantity: 48, base: 1180 },
] as const;

const sources = [
  { icon: Globe2, title: 'Referências públicas', detail: 'SINAPI · CUB/PE · fornecedores consultados', confidence: 'Atualizado hoje' },
  { icon: Database, title: 'Histórico do escritório', detail: '18 orçamentos comparáveis do portfólio', confidence: 'Alta confiança' },
  { icon: ShieldCheck, title: 'Documentos do projeto', detail: 'Memorial, planta e quantitativo ArqQuant', confidence: 'Vinculado' },
];

function ArqBudgetView() {
  const { projects, notice } = useDemo();
  const params = useSearchParams();
  const [project, setProject] = useState(projects.find((p) => p.id === params.get('project'))?.name || projects[0].name);
  const [scenario, setScenario] = useState('Base');
  const [searching, setSearching] = useState(false);
  const [generated, setGenerated] = useState(false);
  const factor = scenario === 'Econômico' ? 0.91 : scenario === 'Performance' ? 1.14 : 1;
  const total = items.reduce((sum, item) => sum + item.quantity * item.base * factor, 0);
  const projectData = projects.find((p) => p.name === project) || projects[0];

  async function searchReferences() {
    setSearching(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSearching(false);
    notice('Referências públicas e histórico do escritório atualizados.');
  }

  function generateBudget() {
    setGenerated(true);
    notice('Orçamento gerado com rastreabilidade e cenários.');
  }

  return <>
    <PageHeader eyebrow="ARQBUDGET AI" title="Orçamento que explica de onde veio" description="Quantitativos, referências públicas, histórico e cenários em uma decisão revisável.">
      <Picker label="Projeto" value={project} onChange={setProject} options={projects.map((p) => p.name)} />
      <button className="btn" type="button" onClick={searchReferences} disabled={searching}>{searching ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}{searching ? 'Pesquisando...' : 'Atualizar referências'}</button>
      <button className="btn primary" type="button" onClick={generateBudget}><Sparkles size={15} />Gerar orçamento</button>
    </PageHeader>

    <div className="budget-hero panel">
      <div className="budget-hero-icon"><Calculator size={24} /></div>
      <div><span className="eyebrow">COPILOTO DE ORÇAMENTO</span><h2>A IA organiza o trabalho pesado. A equipe aprova a decisão.</h2><p>Ela cruza os dados do projeto com fontes públicas e o histórico interno, explicando cada premissa antes de transformar referência em custo.</p></div>
      <div className="budget-hero-badge"><span className="live-dot">Pesquisa ativa</span><small>3 camadas de evidência</small></div>
    </div>

    <div className="metrics four budget-metrics">
      <MetricCard label="Custo estimado" value={money(total)} change="Cenário selecionado" icon={Calculator} />
      <MetricCard label="Itens calculados" value={items.length} change="Quantitativos importados" icon={Check} />
      <MetricCard label="Fontes cruzadas" value="18" change="7 públicas · 11 internas" icon={Globe2} />
      <MetricCard label="Confiança do modelo" value="92%" change="Revisão humana recomendada" icon={ShieldCheck} />
    </div>

    <div className="budget-grid">
      <ChartCard title="Composição do orçamento" subtitle={`${projectData.name} · itens vindos do ArqQuant e documentos do projeto`} action={<Picker label="Cenário" value={scenario} onChange={setScenario} options={['Econômico', 'Base', 'Performance']} />}>
        <div className="budget-table">
          <div className="budget-table-head"><span>Item</span><span>Qtd.</span><span>Referência</span><span>Total</span></div>
          {items.map((item) => <div className="budget-table-row" key={item.name}><div><strong>{item.name}</strong><small>{item.unit} · ArqQuant AI</small></div><span>{item.quantity.toLocaleString('pt-BR')}</span><span>{money(item.base * factor)}/{item.unit}</span><b>{money(item.quantity * item.base * factor)}</b></div>)}
          <div className="budget-table-total"><span>Total preliminar</span><strong>{money(total)}</strong></div>
        </div>
      </ChartCard>

      <ChartCard title="Por que este valor?" subtitle="Fontes e premissas sempre visíveis">
        <div className="budget-sources">{sources.map(({ icon: Icon, title, detail, confidence }) => <div className="budget-source" key={title}><span className="budget-source-icon"><Icon size={16} /></span><div><strong>{title}</strong><p>{detail}</p></div><StatusBadge value={confidence} /></div>)}</div>
        <div className="budget-assumption"><TriangleAlert size={16} /><div><strong>Premissa para validar</strong><p>Frete, região e data de compra podem alterar a referência. A IA sinaliza a hipótese; a aprovação continua com a equipe.</p></div></div>
      </ChartCard>
    </div>

    <div className="budget-scenarios panel"><div><span className="eyebrow">SIMULAÇÃO DE DECISÃO</span><h2>Compare antes de comprometer o projeto.</h2><p>Troque especificações e veja o impacto sem perder a origem dos dados.</p></div><div className="scenario-cards"><button type="button" className={scenario === 'Econômico' ? 'active' : ''} onClick={() => setScenario('Econômico')}><span>Econômico</span><strong>{money(total * 0.91)}</strong><small>-9% · materiais equivalentes</small></button><button type="button" className={scenario === 'Base' ? 'active' : ''} onClick={() => setScenario('Base')}><span>Base recomendada</span><strong>{money(total)}</strong><small>Referências atuais</small></button><button type="button" className={scenario === 'Performance' ? 'active' : ''} onClick={() => setScenario('Performance')}><span>Performance</span><strong>{money(total * 1.14)}</strong><small>+14% · especificação superior</small></button></div><div className="budget-footer-note">{generated ? <><Check size={15} /> Orçamento pronto para revisão, exportação e aprovação.</> : <><ChevronRight size={15} /> Gere o orçamento para transformar esta simulação em uma proposta revisável.</>}</div></div>
  </>;
}

export default function Page() {
  return <Suspense><ArqBudgetView /></Suspense>;
}
