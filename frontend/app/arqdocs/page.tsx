'use client';
import { useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BookOpenCheck,
  BrainCircuit,
  Building2,
  ChevronRight,
  FileCheck2,
  FileSearch,
  FolderArchive,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  PageHeader,
  Picker,
  StatusBadge,
  SearchInput,
  DataTable,
} from '@/components/common';
import { useDemo } from '@/hooks/use-demo';
import { AgentsWorkspace, CreateAgentDialog } from '@/components/agents-workspace';
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
// Catalog ids that map onto chat agents; custom agents keep their own id.
const catalogToChat: Record<string, string> = { parecer: 'parecer', conformidade: 'conformidade', memorial: 'extrator', dossie: 'conformidade' };
const projectAgentFor = (id: string) => catalogToChat[id] ?? id;

function ArqDocsView() {
  const { projects, documents, agentFeedback, customAgents } = useDemo();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [projectName, setProjectName] = useState(
    params.get('project')
      ? projects.find((p) => p.id === params.get('project'))?.name || 'Todos'
      : 'Todos',
  );
  const [seed, setSeed] = useState<{ key: number; sources?: string[]; agentId?: string }>({ key: 0 });
  const workspaceRef = useRef<HTMLDivElement>(null);
  const openChat = (next: { sources?: string[]; agentId?: string }) => { setSeed((s) => ({ key: s.key + 1, ...next })); workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const [createOpen, setCreateOpen] = useState(false);
  const agents: Agent[] = [...seededAgents, ...customAgents.map((a) => ({ id: a.id, name: a.name, description: a.purpose, deliverable: (a.outputs ?? []).filter((f) => f !== 'Chat').join(' · ') || 'Resposta no chat', scope: a.required?.length ? `Exige ${a.required.join(', ')}` : a.knowledge ?? 'Documentos do projeto', used: 'Ainda não executado', icon: Sparkles }))];
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
  const usefulFeedback = agentFeedback.filter((item) => item.rating === 'Útil').length;
  const reviewedFeedback = agentFeedback.length;
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
                <button onClick={() => openChat({ agentId: projectAgentFor(agent.id) })}>
                  Conversar <ChevronRight size={15} />
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      <div className="section-heading" ref={workspaceRef}>
        <div>
          <h2>Converse com os agentes</h2>
          <p>Escolha um projeto ou toda a organização e use @ para cruzar documentos, disciplinas e bases externas.</p>
        </div>
      </div>
      <AgentsWorkspace key={seed.key} initialSources={seed.sources} initialAgentId={seed.agentId} />
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
      <div className="agent-quality-strip"><div><ShieldCheck size={17} /><span><small>Qualidade acompanhada</small><strong>{reviewedFeedback ? `${Math.round(usefulFeedback / reviewedFeedback * 100)}% de avaliações úteis` : 'Ainda sem avaliações'}</strong></span></div><div><small>Feedbacks recebidos</small><strong>{reviewedFeedback}</strong></div><div><small>Como melhorar</small><span>Revise respostas parciais e não úteis antes de publicar um Agent.</span></div></div>
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
            {
              label: '',
              value: (d) => <button className="ad-talk" type="button" onClick={() => openChat({ sources: [d.id] })}><MessageSquareText size={13} />Interagir</button>,
            },
          ]}
        />
      </div>


      <CreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(agent) => openChat({ agentId: agent.id })} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ArqDocsView />
    </Suspense>
  );
}
