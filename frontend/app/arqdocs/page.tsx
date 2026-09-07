'use client';
import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bot,
  BookOpenCheck,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileSearch,
  FolderArchive,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  PageHeader,
  Picker,
  StatusBadge,
  SearchInput,
  DataTable,
  ChartCard,
} from '@/components/common';
import { useDemo } from '@/hooks/use-demo';
import { categories, date } from '@/services/mock-data';

type Agent = {
  id: string;
  name: string;
  description: string;
  deliverable: string;
  scope: string;
  used: string;
  icon: LucideIcon;
};
const seededAgents: Agent[] = [
  {
    id: 'parecer',
    name: 'Agente de Parecer Técnico',
    description:
      'Cruza memoriais, plantas e normas internas para estruturar um parecer com evidências.',
    deliverable: 'Parecer técnico fundamentado',
    scope: 'Memoriais · Plantas · RRT',
    used: '12 pareceres neste mês',
    icon: FileCheck2,
  },
  {
    id: 'conformidade',
    name: 'Agente de Conformidade',
    description:
      'Verifica requisitos documentais antes de protocolo, aprovação ou entrega ao cliente.',
    deliverable: 'Checklist de conformidade',
    scope: 'Licenças · RRT · Documentos municipais',
    used: '38 verificações neste mês',
    icon: ShieldCheck,
  },
  {
    id: 'memorial',
    name: 'Revisor de Memorial',
    description:
      'Compara versões, identifica lacunas técnicas e sugere padronizações do escritório.',
    deliverable: 'Memorial revisado e comparativo',
    scope: 'Memoriais · Especificações',
    used: '21 revisões neste mês',
    icon: BookOpenCheck,
  },
  {
    id: 'dossie',
    name: 'Montador de Dossiê',
    description:
      'Reúne, ordena e nomeia os documentos necessários para cada marco do projeto.',
    deliverable: 'Dossiê pronto para envio',
    scope: 'Todos os documentos do projeto',
    used: '9 dossiês neste mês',
    icon: FolderArchive,
  },
];
const results: Record<
  string,
  { title: string; summary: string; findings: string[] }
> = {
  parecer: {
    title: 'Parecer preliminar · Residencial Boa Viagem',
    summary:
      'A documentação permite prosseguir para revisão técnica, condicionada à correção da divergência de área e à inclusão do RRT atualizado.',
    findings: [
      'Área divergente: 348 m² no memorial e 362 m² na planta executiva.',
      'RRT localizado está associado a uma revisão anterior do projeto.',
      'Demais dados cadastrais apresentam consistência satisfatória.',
    ],
  },
  conformidade: {
    title: 'Checklist de conformidade · 84% atendido',
    summary:
      'Foram verificados 26 requisitos. Quatro itens demandam ação antes do protocolo.',
    findings: [
      'RRT atualizado ainda não localizado.',
      'Licença municipal expira em 32 dias.',
      'Memorial precisa refletir a área da última revisão da planta.',
    ],
  },
  memorial: {
    title: 'Revisão comparativa · Memorial v3',
    summary:
      'O texto está tecnicamente estruturado. Foram identificadas cinco melhorias de padronização e duas informações divergentes.',
    findings: [
      'Padronizar nomenclatura dos ambientes conforme prancha A-03.',
      'Atualizar quadro de áreas para 362 m².',
      'Incluir referência ao acabamento da fachada norte.',
    ],
  },
  dossie: {
    title: 'Dossiê de aprovação · 31 de 34 itens',
    summary:
      'O pacote foi ordenado conforme o padrão da organização. Três documentos ainda impedem o fechamento.',
    findings: [
      'RRT atualizado pendente.',
      'Declaração do proprietário sem assinatura.',
      'Cadastro municipal precisa da versão emitida neste ano.',
    ],
  },
};

function ArqDocsView() {
  const { projects, documents, notice } = useDemo();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [projectName, setProjectName] = useState(
    params.get('project')
      ? projects.find((p) => p.id === params.get('project'))?.name || 'Todos'
      : 'Todos',
  );
  const [agents, setAgents] = useState(seededAgents);
  const [createOpen, setCreateOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent>(seededAgents[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<(typeof results)[string] | null>(null);
  const [question, setQuestion] = useState('');
  const [docAnswer, setDocAnswer] = useState('');
  const filtered = documents.filter(
    (d) =>
      (category === 'Todas' || d.category === category) &&
      (projectName === 'Todos' ||
        projects.find((p) => p.id === d.projectId)?.name === projectName) &&
      d.name.toLowerCase().includes(search.toLowerCase()),
  );
  const avgConfidence = Math.round(
    documents.reduce((s, d) => s + d.confidence, 0) / documents.length,
  );
  const projectOptions = useMemo(() => projects.map((p) => p.name), [projects]);
  const ActiveAgentIcon = activeAgent.icon;
  function openAgent(agent: Agent) {
    setActiveAgent(agent);
    setResult(null);
    setRunOpen(true);
  }
  async function runAgent() {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 1100));
    setResult(
      results[activeAgent.id] || {
        title: `Resultado · ${activeAgent.name}`,
        summary:
          'O agente concluiu a leitura dos documentos selecionados e estruturou a entrega conforme as regras da organização.',
        findings: [
          'Documentos relacionados e classificados.',
          'Evidências vinculadas ao resultado.',
          'Saída pronta para validação humana.',
        ],
      },
    );
    setRunning(false);
    notice(`${activeAgent.name} concluiu a análise.`);
  }
  function askDocuments(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.toLowerCase();
    setDocAnswer(
      q.includes('rrt')
        ? 'Localizei 6 projetos sem RRT válido: Boa Viagem, Casa JCP, Apartamento Jardins, Clínica Boa Vista, Casa Olinda e Studio Madalena.'
        : q.includes('diverg')
          ? 'Há 3 projetos com divergências documentais. Boa Viagem possui a maior diferença: 14 m² entre memorial e planta.'
          : 'Cruzei 62 documentos de 25 projetos. Boa Viagem concentra 4 pendências e deve ser priorizado antes do protocolo.',
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="ARQDOCS AI · KNOWLEDGE LAYER"
        title="ArqDocs AI"
        description="Documentos organizados e agentes especializados trabalhando sobre a base do escritório."
      >
        <span className="enterprise-badge">
          <Building2 size={15} />
          Enterprise
        </span>
        <button className="btn primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          Criar agente
        </button>
      </PageHeader>
      <div className="org-strip">
        <div>
          <span className="org-mark">
            <Building2 size={20} />
          </span>
          <div>
            <strong>Base corporativa · Studio Arquitetura</strong>
            <small>
              Conhecimento compartilhado entre Matriz Recife, São Paulo e
              Salvador
            </small>
          </div>
        </div>
        <span>
          <Users size={15} />
          42 membros
        </span>
        <span>
          <ShieldCheck size={15} />
          Governança ativa
        </span>
        <span>
          <BrainCircuit size={15} />4 agentes publicados
        </span>
      </div>
      <div className="section-heading agent-heading">
        <div>
          <h2>Agentes especializados</h2>
          <p>
            Cada agente combina documentos, regras e um formato de entrega do
            escritório.
          </p>
        </div>
        <span>Catálogo da organização</span>
      </div>
      <div className="agent-grid">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <article className="agent-card" key={agent.id}>
              <div className="agent-top">
                <span className="agent-icon">
                  <Icon size={21} />
                  <i />
                </span>
                <StatusBadge
                  value={
                    agent.id.startsWith('custom') ? 'Rascunho' : 'Publicado'
                  }
                />
              </div>
              <h3>{agent.name}</h3>
              <p>{agent.description}</p>
              <div className="agent-scope">
                <span>ENTREGA</span>
                <strong>{agent.deliverable}</strong>
                <small>{agent.scope}</small>
              </div>
              <footer>
                <small>{agent.used}</small>
                <button onClick={() => openAgent(agent)}>
                  Executar <ChevronRight size={15} />
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      <ChartCard
        title="Pergunte à base documental"
        subtitle="Respostas fundamentadas nos documentos permitidos para o seu perfil"
        action={
          <span className="badge green">
            <ShieldCheck size={12} />
            Respostas com evidências
          </span>
        }
      >
        <form className="docs-question" onSubmit={askDocuments}>
          <MessageSquareText size={19} />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex: Quais projetos ainda não possuem RRT válido?"
            aria-label="Pergunta sobre documentos"
          />
          <button type="submit">
            <Send size={17} />
          </button>
        </form>
        <div className="question-chips">
          {[
            'Quais projetos não possuem RRT?',
            'Onde há divergência de área?',
            'Resuma as pendências de Boa Viagem',
          ].map((q) => (
            <button key={q} onClick={() => setQuestion(q)}>
              {q}
            </button>
          ))}
        </div>
        {docAnswer && (
          <div className="document-answer">
            <span>
              <Sparkles size={18} />
            </span>
            <div>
              <strong>Resposta do ArqDocs</strong>
              <p>{docAnswer}</p>
              <small>
                Fontes: 8 documentos em 3 projetos · Gerado para demonstração
              </small>
            </div>
          </div>
        )}
      </ChartCard>
      <div className="section-heading docs-heading">
        <div>
          <h2>Biblioteca documental</h2>
          <p>
            Classificação, pesquisa e rastreabilidade em toda a organização.
          </p>
        </div>
      </div>
      <div className="metrics four">
        <div className="metric">
          <div className="metric-label">Documentos organizados</div>
          <strong>{documents.length}</strong>
        </div>
        <div className="metric">
          <div className="metric-label">Processados pela IA</div>
          <strong>
            {documents.filter((d) => d.status === 'Processado').length}
          </strong>
        </div>
        <div className="metric">
          <div className="metric-label">Confiança média</div>
          <strong>{avgConfidence}%</strong>
        </div>
        <div className="metric">
          <div className="metric-label">Categorias identificadas</div>
          <strong>{categories.length}</strong>
        </div>
      </div>
      <div className="library-toolbar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar documento"
        />
        <Picker
          label="Categoria"
          value={category}
          onChange={setCategory}
          options={['Todas', ...categories]}
        />
        <Picker
          label="Projeto"
          value={projectName}
          onChange={setProjectName}
          options={['Todos', ...projectOptions]}
        />
      </div>
      <div className="panel table-panel">
        <DataTable
          rows={filtered}
          columns={[
            {
              label: 'Documento',
              value: (d) => (
                <div className="doc-name">
                  <FileSearch size={16} />
                  <span>{d.name}</span>
                </div>
              ),
              sort: (d) => d.name,
            },
            {
              label: 'Categoria',
              value: (d) => d.category,
              sort: (d) => d.category,
            },
            {
              label: 'Projeto',
              value: (d) =>
                projects.find((p) => p.id === d.projectId)?.name || '-',
            },
            { label: 'Data', value: (d) => date(d.date), sort: (d) => d.date },
            {
              label: 'Confiança da IA',
              value: (d) => `${d.confidence}%`,
              sort: (d) => d.confidence,
            },
            {
              label: 'Status',
              value: (d) => <StatusBadge value={d.status} />,
              sort: (d) => d.status,
            },
          ]}
        />
      </div>

      <Sheet open={runOpen} onOpenChange={setRunOpen}>
        <SheetContent className="drawer agent-run">
          <SheetTitle>
            <ActiveAgentIcon size={21} />
            {activeAgent.name}
          </SheetTitle>
          <SheetDescription>{activeAgent.description}</SheetDescription>
          <div className="agent-run-meta">
            <span>
              <ShieldCheck size={14} />
              Agente publicado pela organização
            </span>
            <span>Versão 2.4</span>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label className="field">
              Projeto
              <select defaultValue={projects[0].name}>
                {projectOptions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Escopo documental
              <select defaultValue="Todos os documentos do projeto">
                <option>Todos os documentos do projeto</option>
                <option>Documentos selecionados</option>
                <option>Última revisão de cada documento</option>
              </select>
            </label>
          </div>
          <button
            className="btn primary full-btn"
            onClick={runAgent}
            disabled={running}
          >
            {running ? (
              <>
                <LoaderCircle className="spin" size={16} />
                Lendo documentos e cruzando evidências...
              </>
            ) : (
              <>
                <Bot size={16} />
                Executar agente
              </>
            )}
          </button>
          {result && (
            <div className="agent-result">
              <span className="result-check">
                <CheckCircle2 size={20} />
              </span>
              <small>ANÁLISE CONCLUÍDA</small>
              <h3>{result.title}</h3>
              <p>{result.summary}</p>
              <div className="result-findings">
                {result.findings.map((f, i) => (
                  <div key={f}>
                    <b>{i + 1}</b>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="evidence-row">
                <FileSearch size={15} />
                <span>8 evidências vinculadas</span>
                <button onClick={() => notice('Resultado salvo no projeto.')}>
                  Salvar no projeto
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <CreateAgent
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(agent) => {
          setAgents((a) => [...a, agent]);
          notice('Novo agente criado como rascunho.');
        }}
      />
    </>
  );
}

function CreateAgent({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (a: Agent) => void;
}) {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [output, setOutput] = useState('Parecer técnico');
  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim() || !purpose.trim()) return;
    onCreate({
      id: `custom-${Date.now()}`,
      name,
      description: purpose,
      deliverable: output,
      scope: 'Documentos autorizados da organização',
      used: 'Ainda não executado',
      icon: Sparkles,
    });
    setName('');
    setPurpose('');
    onOpenChange(false);
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="drawer">
        <SheetTitle>
          <Sparkles size={21} />
          Criar agente documental
        </SheetTitle>
        <SheetDescription>
          Defina a especialidade, as fontes e o formato de entrega. Nesta
          demonstração, a configuração fica como rascunho.
        </SheetDescription>
        <form onSubmit={submit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label className="field">
              Nome do agente
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Agente de Viabilidade Legal"
              />
            </label>
            <label className="field">
              Missão do agente
              <textarea
                required
                rows={4}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Descreva o que o agente deve analisar e quais perguntas deve responder."
              />
            </label>
            <label className="field">
              Formato da entrega
              <select
                value={output}
                onChange={(e) => setOutput(e.target.value)}
              >
                <option>Parecer técnico</option>
                <option>Checklist de conformidade</option>
                <option>Resumo executivo</option>
                <option>Comparativo entre versões</option>
                <option>Dossiê documental</option>
              </select>
            </label>
            <label className="field">
              Base de conhecimento
              <select defaultValue="Padrões da organização + documentos do projeto">
                <option>Padrões da organização + documentos do projeto</option>
                <option>Somente documentos do projeto</option>
                <option>Biblioteca técnica corporativa</option>
              </select>
            </label>
          </div>
          <div className="agent-governance">
            <ShieldCheck size={17} />
            <div>
              <strong>Governança Enterprise</strong>
              <p>
                O agente respeita permissões, registra fontes e mantém validação
                humana antes da publicação.
              </p>
            </div>
          </div>
          <div className="sheet-actions">
            <button
              type="button"
              className="btn"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn primary">
              Criar como rascunho
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ArqDocsView />
    </Suspense>
  );
}
