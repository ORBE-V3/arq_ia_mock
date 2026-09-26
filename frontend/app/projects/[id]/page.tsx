import {Suspense} from 'react';
import {ProjectDetail} from '@/components/project-detail';
import {projects} from '@/services/mock-data';
export function generateStaticParams(){return projects.map(p=>({id:p.id}))}
export default function Page(){return <Suspense><ProjectDetail/></Suspense>}
