import type {Metadata} from 'next';
import './globals.css';
import {AppShell} from '@/components/app-shell';
export const metadata:Metadata={title:'ARQ.AI | Inteligência para arquitetura',description:'Projetos, documentos e indicadores em um único lugar. Protótipo demonstrativo.',icons:{icon:'/favicon.svg',apple:'/favicon.svg'}};
const themeScript=`(function(){try{var t=localStorage.getItem('arq-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body><AppShell>{children}</AppShell></body></html>}
