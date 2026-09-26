import type {Metadata} from 'next';
import {IBM_Plex_Sans,Jost} from 'next/font/google';
import './globals.css';
import './aesthetic.css';
import './palette.css';
import './shell-fixes.css';
import './fonts.css';
import {AppShell} from '@/components/app-shell';
// Jost (Futura/Bauhaus lineage) for display, IBM Plex Sans for UI text and tabular figures.
const display=Jost({subsets:['latin'],variable:'--font-display',display:'swap'});
const ui=IBM_Plex_Sans({subsets:['latin'],weight:['300','400','500','600'],variable:'--font-ui',display:'swap'});
export const metadata:Metadata={title:'ARQ.AI | Inteligência para arquitetura',description:'Projetos, documentos e indicadores em um único lugar. Protótipo demonstrativo.',icons:{apple:'/favicon.svg?v=2'}};
const themeScript=`(function(){try{var t=localStorage.getItem('arq-theme')||'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;document.getElementById('favicon').href=t==='dark'?'/favicon-dark.svg?v=2':'/favicon.svg?v=2'}catch(e){}})()`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" className={`${display.variable} ${ui.variable}`} suppressHydrationWarning><head><link id="favicon" suppressHydrationWarning rel="icon" type="image/svg+xml" href="/favicon.svg?v=2"/><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body><AppShell>{children}</AppShell></body></html>}
