import {AnalysisDetail} from '@/components/analysis-detail';
import {analyses} from '@/services/mock-data';
export function generateStaticParams(){return analyses.map(a=>({id:a.id}))}
export default function Page(){return <AnalysisDetail/>}
