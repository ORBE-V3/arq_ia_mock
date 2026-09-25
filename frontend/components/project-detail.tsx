'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Picker, StatusBadge } from '@/components/common';
import { useDemo } from '@/hooks/use-demo';
import { date, statuses } from '@/services/mock-data';
import { ProjectWorkspace } from '@/components/project-workspace';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { projects, update, notice } = useDemo();
  const project = projects.find((item) => item.id === id);

  if (!project) return <div className="panel">Projeto não encontrado. <Link className="text-link" href="/projects">Voltar aos projetos</Link></div>;

  function setStatus(value: string) {
    update((state) => ({ ...state, projects: state.projects.map((item) => item.id === id ? { ...item, status: value } : item) }));
    notice('Status atualizado.');
  }

  return <>
    <button className="btn subtle" onClick={() => router.push('/projects')} style={{ marginBottom: 18 }}><ArrowLeft size={15} />Voltar aos projetos</button>
    <div className="detail-head">
      <div><h1>{project.name}<StatusBadge value={project.risk} /></h1><p>{project.client} · {project.type}</p><div className="detail-meta"><span>Responsável <b>{project.owner}</b></span><span>Etapa <b>{project.stage}</b></span><span>Prazo <b>{date(project.deadline)}</b></span><span>Área <b>{project.area} m²</b></span></div></div>
      <div className="detail-actions"><Picker label="Status" value={project.status} onChange={setStatus} options={statuses} /></div>
    </div>
    <ProjectWorkspace project={project} />
  </>;
}
