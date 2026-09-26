'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common';
import { QuantStudio } from '@/components/quant-studio';

function ArqQuantView() {
  const router = useRouter();
  return <>
    <PageHeader eyebrow="ARQQUANT AI · ESTÚDIO DO PROJETO" title="Medir, editar e visualizar em 3D" description="Layout gerado pela IA ou lido do modelo BIM, editável em planta e 3D. As quantidades seguem direto para o ArqBudget." />
    <QuantStudio onOpenBudget={() => router.push('/arqbudget')} />
  </>;
}

export default function Page() {
  return <Suspense><ArqQuantView /></Suspense>;
}
