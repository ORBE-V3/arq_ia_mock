'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Calculator,
  FileCheck2,
  Files,
  Database,
  Globe2,
  Layers3,
  Play,
  Plus,
  Ruler,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UploadCloud,
} from 'lucide-react';
import { useDemo } from '@/hooks/use-demo';
import type { DocumentRecord } from '@/types';
import { date } from '@/services/mock-data';

const steps = [
  { id: 'project', number: '01', label: 'Projeto', title: 'Comece pelo contexto' },
  { id: 'documents', number: '02', label: 'Documentos', title: 'Monte a base do projeto' },
  { id: 'check', number: '03', label: 'ArqCheck', title: 'Valide antes de decidir' },
  { id: 'quant', number: '04', label: 'ArqQuant', title: 'Meça quando fizer sentido' },
  { id: 'docs', number: '05', label: 'Docs + Agents', title: 'Monte a execução' },
  { id: 'budget', number: '06', label: 'ArqBudget', title: 'Converta medida em custo' },
] as const;

function PresentationView() {
  const { projects, documents, analyses, quants, update, notice } = useDemo();
  const [activeStep, setActiveStep] = useState(0);
  const project = projects[0];
  const projectDocs = documents.filter((doc) => doc.projectId === project.id);
  const projectAnalysis = analyses.find((analysis) => analysis.projectId === project.id);
  const projectQuant = quants.find((quant) => quant.projectId === project.id);
  const [packAdded, setPackAdded] = useState(false);
  const openIssues = projectAnalysis?.issues.filter((issue) => !issue.resolved).length || 0;

  const nextLabel = activeStep === steps.length - 1 ? 'Recomeçar roteiro' : `Próximo: ${steps[activeStep + 1].label}`;
  const addDocumentPack = () => {
    if (packAdded) return;
    const pack: DocumentRecord[] = [
      { id: `presentation-memorial-${Date.now()}`, name: 'memorial_revisado_apresentacao.pdf', category: 'Memorial Descritivo', projectId: project.id, date: '2026-09-19', status: 'Processado', confidence: 99, area: 348 },
      { id: `presentation-planta-${Date.now()}`, name: 'planta_executiva_apresentacao.pdf', category: 'Planta', projectId: project.id, date: '2026-09-19', status: 'Processado', confidence: 98, area: 362 },
      { id: `presentation-rrt-${Date.now()}`, name: 'rrt_atualizado_apresentacao.pdf', category: 'ART/RRT', projectId: project.id, date: '2026-09-19', status: 'Processado', confidence: 97, area: 348 },
    ];
    update((state) => ({ ...state, documents: [...pack, ...state.documents] }));
    setPackAdded(true);
    notice('Pacote demonstrativo adicionado ao projeto.');
  };

  const stepStatus = useMemo(() => [true, projectDocs.length > 0, Boolean(projectAnalysis), Boolean(projectQuant), true, true], [projectAnalysis, projectDocs.length, projectQuant]);

  function moveNext() {
    setActiveStep((step) => (step === steps.length - 1 ? 0 : step + 1));
  }

  return (
    <div className="presentation-page">
      <div className="presentation-topline">
        <div>
          <span className="eyebrow">MODO APRESENTAÇÃO</span>
          <h1>A jornada do projeto à decisão</h1>
          <p>Um roteiro simples para mostrar como o ARQ.AI entra no trabalho real do escritório.</p>
        </div>
        <div className="presentation-actions">
          <span className="presentation-mode"><Play size={13} fill="currentColor" /> Roteiro guiado</span>
          <Link className="btn" href="/dashboard">Sair da apresentação</Link>
        </div>
      </div>

      <div className="presentation-flow" aria-label="Etapas do roteiro de apresentação">
        {steps.map((step, index) => (
          <button key={step.id} type="button" className={`presentation-step ${activeStep === index ? 'active' : ''} ${stepStatus[index] ? 'done' : ''}`} onClick={() => setActiveStep(index)}>
            <span className="presentation-step-number">{stepStatus[index] ? <Check size={14} /> : step.number}</span>
            <span><b>{step.label}</b><small>{step.title}</small></span>
          </button>
        ))}
      </div>

      <div className="presentation-workspace">
        <section className="presentation-main panel">
          {activeStep === 0 && <>
            <div className="presentation-kicker"><Layers3 size={16} /> 01 · CONTEXTO</div>
            <h2>Todo trabalho começa com um projeto bem definido.</h2>
            <p className="presentation-lead">O projeto é a unidade de contexto: cliente, prazo, área, responsáveis e tudo que a equipe precisa acompanhar em um só lugar.</p>
            <div className="presentation-project-card">
              <div className="presentation-project-mark">BV</div>
              <div><span className="badge green">Em demonstração</span><h3>{project.name}</h3><p>{project.client} · {project.type} · {project.area} m²</p></div>
              <Link className="text-link" href={`/projects/${project.id}`}>Abrir projeto <ArrowRight size={14} /></Link>
            </div>
            <div className="presentation-note"><CheckCircle2 size={17} /><div><strong>O que mostrar nesta etapa</strong><p>Cadastre o projeto, defina o prazo e mostre que os módulos passam a trabalhar sobre o mesmo contexto.</p></div></div>
          </>}

          {activeStep === 1 && <>
            <div className="presentation-kicker"><Files size={16} /> 02 · BASE DOCUMENTAL</div>
            <h2>Os documentos deixam de ser uma pasta solta.</h2>
            <p className="presentation-lead">Eles entram no projeto, são classificados e passam a servir de evidência para as próximas decisões.</p>
            <div className="presentation-upload-card">
              <span className="upload-icon"><UploadCloud size={21} /></span>
              <div><strong>{projectDocs.length} documentos vinculados</strong><p>{packAdded ? 'Pacote de revisão adicionado e pronto para análise.' : 'Adicione um pacote demonstrativo para mostrar a ingestão documental.'}</p></div>
              <button className="btn primary" type="button" onClick={addDocumentPack} disabled={packAdded}>{packAdded ? <><Check size={15} /> Adicionado</> : <><Plus size={15} /> Adicionar pacote</>}</button>
            </div>
            <div className="presentation-doc-list"><span>Exemplos na base</span><b>Memorial · Planta · RRT</b><small>Classificação e confiança ficam visíveis para a equipe.</small></div>
          </>}

          {activeStep === 2 && <>
            <div className="presentation-kicker"><ScanLine size={16} /> 03 · PORTÃO DE QUALIDADE</div>
            <h2>Antes de entregar, o ArqCheck encontra o que o olho deixa passar.</h2>
            <p className="presentation-lead">O ArqCheck cruza memorial, planta, RRT e documentos de apoio para apontar divergências antes que elas virem retrabalho.</p>
            <div className="presentation-result-card"><div className="score-ring"><strong>{projectAnalysis?.score || 87}%</strong><span>score</span></div><div><span className="badge amber"><TriangleAlert size={12} /> {openIssues || 4} pendências</span><h3>Residencial Boa Viagem</h3><p>Maior atenção: divergência de 14 m² entre memorial e planta.</p></div><Link className="btn primary" href={`/arqcheck?project=${project.id}`}>Executar ArqCheck</Link></div>
            <div className="presentation-note"><ClipboardCheck size={17} /><div><strong>Regra de produto</strong><p>ArqCheck é o portão de qualidade do projeto. Ele deve acontecer antes de protocolo, orçamento final ou entrega.</p></div></div>
          </>}

          {activeStep === 3 && <>
            <div className="presentation-kicker"><Ruler size={16} /> 04 · MEDIÇÃO E MODELO</div>
            <h2>ArqQuant entra quando a pergunta é “quanto?”</h2>
            <p className="presentation-lead">O papel do ArqQuant é ler a planta, identificar ambientes, conferir áreas e gerar quantitativos. O modelo 3D deve nascer como uma camada de estudo espacial, não como promessa de BIM completo.</p>
            <div className="quant-principles"><div><Ruler size={18} /><strong>Agora</strong><p>Planta reconhecida, áreas por ambiente, total e divergência contra o memorial.</p></div><div><Layers3 size={18} /><strong>Próxima camada</strong><p>Modelo 3D conceitual para visualizar volumes e apoiar decisões de área e material.</p></div><div><FileCheck2 size={18} /><strong>Limite claro</strong><p>Não substituir Revit/BIM: o ARQ.AI prepara estudo e evidência para a equipe técnica.</p></div></div>
            <div className="presentation-result-card quant-result"><div className="quant-visual"><span /><span /><span /><span /></div><div><span className="badge neutral">Estudo espacial</span><h3>{projectQuant ? 'Quantitativo salvo' : 'Modelo pronto para explorar'}</h3><p>{projectQuant ? `${projectQuant.area} m² levantados neste projeto.` : 'Mostre a leitura de ambientes e a transição para um estudo volumétrico.'}</p></div><Link className="btn primary" href={`/arqquant?project=${project.id}`}>Abrir ArqQuant</Link></div>
          </>}

          {activeStep === 4 && <>
            <div className="presentation-kicker"><Sparkles size={16} /> 05 · DECISÃO</div>
            <h2>Docs e Agents trabalham juntos, por aba ou por projeto.</h2>
            <p className="presentation-lead">A central de Docs deixa o usuário escolher arquivos já existentes ou subir documentos externos. A central de Agents monta a execução com projeto, instrução, saída e padrão de entrega — sem prender o trabalho a um fluxo único.</p>
            <div className="presentation-agent-console"><div><span className="docs-mode-icon project"><Files size={17} /></span><strong>Docs interativo</strong><p>Organize, selecione e reaproveite documentos internos ou temporários.</p></div><div><span className="docs-mode-icon corporate"><Bot size={17} /></span><strong>Agent escolhido</strong><p>Relatório, parecer, revisão, comparação ou extração.</p></div><div><span className="docs-mode-icon project"><FileCheck2 size={17} /></span><strong>Saída rastreável</strong><p>Resultado salvo no projeto, com template ou timbrado.</p></div></div>
            <div className="docs-modes"><div><span className="docs-mode-icon project"><Files size={17} /></span><div><strong>Agente do projeto</strong><p>“Encontre divergências no Residencial Boa Viagem e prepare um parecer.”</p></div><Link href={`/arqdocs?project=${project.id}`} className="text-link">Usar projeto <ArrowRight size={14} /></Link></div><div><span className="docs-mode-icon corporate"><Sparkles size={17} /></span><div><strong>Agente corporativo</strong><p>“Quais projetos ainda não possuem RRT válido?”</p></div><Link href="/arqdocs" className="text-link">Usar base geral <ArrowRight size={14} /></Link></div></div>
            <div className="presentation-note"><CheckCircle2 size={17} /><div><strong>Posicionamento da plataforma</strong><p>Projeto dá contexto. ArqCheck dá confiança. ArqQuant dá medida. ArqDocs transforma tudo isso em uma resposta útil.</p></div></div>
          </>}

          {activeStep === 5 && <>
            <div className="presentation-kicker"><Calculator size={16} /> 06 · CUSTO E CENÁRIO</div>
            <h2>ArqBudget transforma evidência em uma decisão de custo.</h2>
            <p className="presentation-lead">Ele recebe os quantitativos do ArqQuant, lê documentos do projeto, consulta referências públicas e cruza com o histórico do escritório para gerar um orçamento explicável.</p>
            <div className="budget-presentation-grid"><div><Globe2 size={18} /><strong>Web search com fonte</strong><p>SINAPI, CUB, fornecedores e referências regionais entram com data, origem e confiança.</p></div><div><Database size={18} /><strong>Histórico interno</strong><p>Orçamentos comparáveis ajudam a calibrar valores para o jeito real do escritório.</p></div><div><ShieldCheck size={18} /><strong>Revisão humana</strong><p>A IA mostra premissas e cenários. A equipe aprova antes de enviar ou comprometer o projeto.</p></div></div>
            <div className="presentation-result-card quant-result"><div className="budget-mini-total"><span>estimativa base</span><strong>R$ 164.820</strong></div><div><span className="badge green"><Check size={12} /> Rastreável</span><h3>Orçamento pronto para comparar</h3><p>Econômico, base e performance com origem dos dados visível.</p></div><Link className="btn primary" href={`/arqbudget?project=${project.id}`}>Abrir ArqBudget</Link></div>
            <div className="presentation-note"><Sparkles size={17} /><div><strong>Promessa certa para o produto</strong><p>“A IA faz o trabalho de pesquisa, organização e simulação. A decisão continua sendo da equipe — com contexto para defendê-la.”</p></div></div>
          </>}
        </section>

        <aside className="presentation-side">
          <div className="panel presentation-script"><span className="eyebrow">FALA SUGERIDA</span><h3>{activeStep === 0 ? 'Comece pelo problema' : activeStep === 1 ? 'Mostre a base' : activeStep === 2 ? 'Mostre o risco' : activeStep === 3 ? 'Explique o limite' : activeStep === 4 ? 'Feche com a decisão' : 'Mostre o valor'}</h3><p>{activeStep === 0 ? '“Em vez de começar pela ferramenta, eu começo pelo projeto. É ali que a operação ganha contexto.”' : activeStep === 1 ? '“Cada documento entra no projeto e deixa de ser apenas um arquivo: passa a ser evidência.”' : activeStep === 2 ? '“O ganho não é só analisar mais rápido. É encontrar a divergência antes de ela chegar ao cliente.”' : activeStep === 3 ? '“O ArqQuant não tenta substituir o software de autoria. Ele acelera a leitura e prepara a decisão.”' : activeStep === 4 ? '“No fim, a equipe não recebe mais uma tela. Recebe uma resposta fundamentada para agir.”' : '“O orçamento deixa de ser um número solto: cada valor tem fonte, cenário e premissa para revisão.”'}</p></div>
          <div className="panel presentation-checklist"><span className="eyebrow">VISÃO DO ROTEIRO</span>{steps.map((step, index) => <button key={step.id} type="button" onClick={() => setActiveStep(index)} className={activeStep === index ? 'current' : ''}><span>{stepStatus[index] ? <Check size={13} /> : index + 1}</span>{step.label}<small>{stepStatus[index] ? 'pronto' : 'mostrar'}</small></button>)}</div>
          <button type="button" className="presentation-next" onClick={moveNext}>{nextLabel}<ArrowRight size={16} /></button>
        </aside>
      </div>
    </div>
  );
}

export default function Page() {
  return <PresentationView />;
}
