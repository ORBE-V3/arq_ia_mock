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
  Download,
  FileArchive,
  FileCheck2,
  FileSearch,
  FolderArchive,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UploadCloud,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const { projects, documents, notice, update, templates, agentFeedback } = useDemo();
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
  const [runProjectName, setRunProjectName] = useState(projectName === 'Todos' ? projects[0]?.name || 'Todos' : projectName);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [externalFiles, setExternalFiles] = useState<File[]>([]);
  const [saveExternal, setSaveExternal] = useState(true);
  const [outputFormat, setOutputFormat] = useState('Parecer técnico');
  const [runInstruction, setRunInstruction] = useState('');
  const [templateId, setTemplateId] = useState('none');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<'Útil' | 'Parcial' | 'Não útil' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
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
  const runProject = projects.find((project) => project.name === runProjectName);
  const runDocuments = documents.filter((doc) => doc.projectId === runProject?.id);
  const runTemplates = templates.filter((template) => template.projectId === runProject?.id || template.kind === 'Empresa');
  const usefulFeedback = agentFeedback.filter((item) => item.rating === 'Útil').length;
  const reviewedFeedback = agentFeedback.length;
  function openAgent(agent: Agent) {
    setActiveAgent(agent);
    setResult(null);
    setRunProjectName(projectName === 'Todos' ? projects[0]?.name || 'Todos' : projectName);
    const nextProject = projects.find((project) => project.name === (projectName === 'Todos' ? projects[0]?.name : projectName));
    setSelectedDocIds(documents.filter((doc) => doc.projectId === nextProject?.id).slice(0, 4).map((doc) => doc.id));
    setExternalFiles([]);
    setRunInstruction('');
    setTemplateId('none');
    setActiveRunId(null);
    setFeedbackRating(null);
    setFeedbackComment('');
    setRunOpen(true);
  }
  function selectRunProject(value: string) {
    setRunProjectName(value);
    const nextProject = projects.find((project) => project.name === value);
    setSelectedDocIds(documents.filter((doc) => doc.projectId === nextProject?.id).slice(0, 4).map((doc) => doc.id));
  }
  function addExternalFiles(files: FileList | null) { if (!files?.length) return; setExternalFiles((current) => [...current, ...Array.from(files)]); }
  async function runAgent() {
    if (!runProject) return;
    setRunning(true);
    const runId = `global-agent-${Date.now()}`;
    const persistedDocs = saveExternal ? externalFiles.map((file, index) => ({ id: `external-${Date.now()}-${index}`, name: file.name, category: 'Documento externo', projectId: runProject.id, date: '2026-09-19', status: 'Processado', confidence: 94, area: runProject.area })) : [];
    setActiveRunId(runId);
    update((state) => ({ ...state, documents: persistedDocs.length ? [...persistedDocs, ...state.documents] : state.documents, agentRuns: [{ id: runId, projectId: runProject.id, documentIds: [...selectedDocIds, ...persistedDocs.map((doc) => doc.id)], agentName: activeAgent.name, date: '2026-09-19 16:10', user: 'Ana Martins', status: 'Processando', result: '', outputFormat, templateId }, ...state.agentRuns] }));
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
    update((state) => ({ ...state, agentRuns: state.agentRuns.map((run) => run.id === runId ? { ...run, status: 'Concluído' as const, result: `${outputFormat} gerado com ${selectedDocIds.length + externalFiles.length} documento${selectedDocIds.length + externalFiles.length === 1 ? '' : 's'}${templateId !== 'none' ? ' e template aplicado' : ''}.` } : run) }));
    setRunning(false);
    notice(`${activeAgent.name} concluiu a análise.`);
  }
  function submitFeedback() {
    if (!activeRunId || !runProject || !feedbackRating) return;
    update((state) => ({ ...state, agentFeedback: [{ id: `feedback-${Date.now()}`, runId: activeRunId, projectId: runProject.id, agentName: activeAgent.name, rating: feedbackRating, comment: feedbackComment, date: '2026-09-19', user: 'Ana Martins' }, ...state.agentFeedback], agentRuns: state.agentRuns.map((run) => run.id === activeRunId ? { ...run, feedback: feedbackRating, feedbackComment } : run) }));
    notice('Feedback registrado. Ele será usado para melhorar este Agent.');
  }
  function exportResult() {
    if (!result) return;
    const content = [result.title, '', result.summary, '', ...result.findings.map((finding, index) => `${index + 1}. ${finding}`), '', `Projeto: ${runProjectName}`, `Formato: ${outputFormat}`, `Documentos: ${selectedDocIds.length + externalFiles.length}`, `Template: ${templateId === 'none' ? 'Sem template' : runTemplates.find((template) => template.id === templateId)?.name || 'Selecionado'}`].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `arqdocs-${activeAgent.id}-resultado.txt`; link.click(); URL.revokeObjectURL(url); notice('Resultado exportado para revisão.');
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
          ]}
        />
      </div>

      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="project-modal agent-run-modal">
          <DialogHeader>
          <DialogTitle>
            <ActiveAgentIcon size={21} />
            {activeAgent.name}
          </DialogTitle>
          <DialogDescription>{activeAgent.description}</DialogDescription>
          </DialogHeader>
          <div className="agent-run-meta">
            <span>
              <ShieldCheck size={14} />
              Agente publicado pela organização
            </span>
            <span>Versão 2.4</span>
          </div>
          <div className="execution-context-grid">
            <label className="field">Projeto<select value={runProjectName} onChange={(event) => selectRunProject(event.target.value)}>{projectOptions.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="field">Formato da saída<select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}><option>Parecer técnico</option><option>Relatório executivo</option><option>Checklist</option><option>Comparativo entre arquivos</option><option>Extração estruturada</option></select></label>
          </div>
          <div className="execution-documents"><div className="execution-section-head"><div><strong>Documentos de contexto</strong><small>Escolha arquivos já existentes no projeto ou acrescente documentos externos.</small></div><span className="badge neutral">{selectedDocIds.length + externalFiles.length} selecionados</span></div><div className="execution-doc-list">{runDocuments.slice(0, 10).map((doc) => <label key={doc.id}><input type="checkbox" checked={selectedDocIds.includes(doc.id)} onChange={(event) => setSelectedDocIds((current) => event.target.checked ? [...current, doc.id] : current.filter((id) => id !== doc.id))} /><span><FileSearch size={13} />{doc.name}</span><small>{doc.category}</small></label>)}</div><label className="execution-upload"><UploadCloud size={18} /><span><strong>Adicionar documentos externos</strong><small>PDF, Word, Excel, CSV, imagem, apresentação ou texto.</small></span><input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.ppt,.pptx,.txt" onChange={(event) => addExternalFiles(event.target.files)} /></label>{externalFiles.length > 0 && <div className="external-file-list">{externalFiles.map((file) => <span key={`${file.name}-${file.size}`}><FileArchive size={12} />{file.name}<button type="button" aria-label={`Remover ${file.name}`} onClick={() => setExternalFiles((current) => current.filter((item) => item !== file))}>×</button></span>)}</div>}<label className="execution-save-toggle"><input type="checkbox" checked={saveExternal} onChange={(event) => setSaveExternal(event.target.checked)} /><span><strong>Salvar documentos externos no projeto</strong><small>Desmarque para usar somente nesta execução.</small></span></label></div>
          <div className="execution-options-grid"><label className="field">Template / timbrado<select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="none">Sem template</option>{runTemplates.map((template) => <option value={template.id} key={template.id}>{template.name} · {template.kind}</option>)}</select></label><label className="field">Instrução complementar<textarea rows={3} value={runInstruction} onChange={(event) => setRunInstruction(event.target.value)} placeholder="Ex: destaque riscos, cite as páginas e escreva para a equipe técnica..." /></label></div>
          <button
            className="btn primary full-btn"
            onClick={runAgent}
            disabled={running || (selectedDocIds.length === 0 && externalFiles.length === 0)}
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
                <span>{selectedDocIds.length + externalFiles.length} documentos · evidências vinculadas · confiança estimada 92%</span>
                <button onClick={() => notice('Resultado salvo no projeto.')}>
                  Salvar no projeto
                </button>
                <button onClick={exportResult}><Download size={13} />Exportar</button>
              </div>
              <div className="result-feedback"><div><strong>Essa resposta ajudou?</strong><small>Seu feedback melhora a precisão do Agent nas próximas execuções.</small></div><div className="feedback-actions"><button type="button" className={feedbackRating === 'Útil' ? 'selected' : ''} onClick={() => setFeedbackRating('Útil')}><ThumbsUp size={14} />Útil</button><button type="button" className={feedbackRating === 'Parcial' ? 'selected' : ''} onClick={() => setFeedbackRating('Parcial')}><MessageSquareText size={14} />Parcial</button><button type="button" className={feedbackRating === 'Não útil' ? 'selected' : ''} onClick={() => setFeedbackRating('Não útil')}><ThumbsDown size={14} />Não útil</button></div>{feedbackRating && <div className="feedback-form"><textarea rows={2} value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} placeholder="O que deveríamos corrigir ou manter?" /><button className="btn primary" type="button" onClick={submitFeedback}>Enviar feedback</button></div>}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  const [knowledge, setKnowledge] = useState(
    'Padrões da organização + documentos do projeto',
  );
  const generatedName = name.trim() || 'Novo agente documental';
  const generatedPrompt = purpose.trim()
    ? `Você é ${generatedName}.\n\nMissão\n${purpose.trim()}\n\nComo responder\nEntregue um ${output.toLowerCase()}, cite as fontes utilizadas e sinalize qualquer informação que precise de validação humana.\n\nBase autorizada\n${knowledge}.`
    : 'Escreva o que você precisa que o agente faça. O prompt final aparecerá aqui em tempo real.';
  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!purpose.trim()) return;
    onCreate({
      id: `custom-${Date.now()}`,
      name: name.trim() || 'Novo agente documental',
      description: purpose,
      deliverable: output,
      scope: knowledge,
      used: 'Ainda não executado',
      icon: Sparkles,
    });
    setName('');
    setPurpose('');
    setKnowledge('Padrões da organização + documentos do projeto');
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="project-modal agent-create-modal">
        <DialogHeader>
        <DialogTitle>
          <Sparkles size={21} />
          Criar agente documental
        </DialogTitle>
        <DialogDescription>
          Descreva em linguagem natural o que você precisa. O ARQ.AI organiza
          a instrução e mostra o prompt antes de salvar o rascunho.
        </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label className="field">
              Nome do agente <span className="field-hint">opcional</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Viabilidade Legal"
              />
            </label>
            <label className="field">
              O que você quer que ele faça?
              <textarea
                required
                rows={5}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Ex: Analise os documentos do projeto, encontre riscos para aprovação e prepare uma recomendação objetiva para a equipe."
              />
            </label>
            <div className="prompt-preview" aria-live="polite">
              <div className="prompt-preview-head">
                <span><Sparkles size={15} /> Prompt gerado</span>
                <span className="prompt-live"><i /> ao vivo</span>
              </div>
              <pre>{generatedPrompt}</pre>
            </div>
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
              <select value={knowledge} onChange={(e) => setKnowledge(e.target.value)}>
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
          <DialogFooter className="sheet-actions">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ArqDocsView />
    </Suspense>
  );
}
