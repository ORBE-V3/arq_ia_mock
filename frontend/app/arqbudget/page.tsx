'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/common';
import { BudgetWorkspace } from '@/components/budget-workspace';
import { useDemo } from '@/hooks/use-demo';

function ArqBudgetView() {
  const { projects } = useDemo();
  const params = useSearchParams();
  const initial = projects.find((p) => p.id === params.get('project'))?.id;
  return <>
    <PageHeader eyebrow="ARQBUDGET AI" title="Orçamento que explica de onde veio" description="Quantitativos do ArqQuant, SINAPI, CUB e cotações de fornecedores em uma decisão revisável, com versões." />
    {/* Global page: no projectId, so the workspace shows a project picker. key re-mounts when arriving via ?project=. */}
    <BudgetWorkspace key={initial ?? 'global'} projectId={undefined} />
  </>;
}

export default function Page() {
  return <Suspense><ArqBudgetView /></Suspense>;
}
