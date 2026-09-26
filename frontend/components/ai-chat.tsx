'use client';

import '@/app/help.css';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ArrowUp, BookOpen, LifeBuoy, LoaderCircle, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useDemo } from '@/hooks/use-demo';
import { answerChat } from '@/services/chat';
import { ARTICLES, areaFor, findHelp, isDataQuestion } from '@/lib/help-kb';
import type { HelpArticle } from '@/lib/help-kb';

type Msg = { role: 'user'; text: string } | { role: 'help'; article: HelpArticle; related: HelpArticle[] } | { role: 'data'; text: string } | { role: 'miss'; suggestions: HelpArticle[] };
const AREA_LABEL: Record<string, string> = { arqcheck: 'ArqCheck', arqquant: 'ArqQuant', arqbudget: 'ArqBudget', arqradar: 'ArqRadar', agents: 'Agents', docs: 'Docs', kanban: 'Kanban', history: 'Histórico', templates: 'Templates', dashboard: 'Dashboard' };
const DATA_SUGGESTIONS = ['Quais projetos estão em risco?', 'Quais projetos não têm RRT?', 'Qual projeto tem a menor margem?'];

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const { projects, documents, analyses } = useDemo();
  const pathname = usePathname();
  const logRef = useRef<HTMLDivElement>(null);
  // Inside a project, help links open that project's tabs instead of the sample one.
  const currentProject = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const localize = (href: string) => (currentProject ? href.replace('/projects/1/', `/projects/${currentProject}/`) : href);
  const area = open ? areaFor(pathname, window.location.search) : undefined;
  const here = ARTICLES.filter((a) => a.area === area).slice(0, 4);
  const popular = ARTICLES.filter((a) => ['check-start', 'quant-start', 'budget', 'agents-chat', 'radar-canvas'].includes(a.id) && a.area !== area).slice(0, 4);

  async function ask(text: string) {
    if (!text.trim() || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 380));
    const found = findHelp(text, area);
    const reply: Msg = isDataQuestion(text) ? { role: 'data', text: answerChat(text, projects, documents, analyses) } : found.best ? { role: 'help', article: found.best, related: found.related } : { role: 'miss', suggestions: (here.length ? here : popular).slice(0, 3) };
    setMessages((m) => [...m, reply]);
    setBusy(false);
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }));
  }
  const q = (a: HelpArticle) => `Como ${a.title.charAt(0).toLowerCase()}${a.title.slice(1)}?`;

  return <>
    <button className="chat-fab" onClick={() => setOpen(true)}><LifeBuoy size={18} />Dúvidas? Pergunte ao ARQ.AI</button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="drawer chat-drawer hp">
        <SheetTitle className="hp-title"><LifeBuoy size={20} />Ajuda do ARQ.AI</SheetTitle>
        <SheetDescription className="hp-sub">{area ? `Você está em ${AREA_LABEL[area] ?? 'ARQ.AI'}. Pergunte como fazer qualquer coisa.` : 'Pergunte como fazer qualquer coisa na plataforma.'}</SheetDescription>
        <div className="hp-log" ref={logRef}>
          {!messages.length && <>
            {here.length > 0 && <section><h3>Nesta tela</h3>{here.map((a) => <button type="button" key={a.id} onClick={() => void ask(q(a))}>{a.title}<ArrowRight size={13} /></button>)}</section>}
            <section><h3>Mais pedidos</h3>{popular.map((a) => <button type="button" key={a.id} onClick={() => void ask(q(a))}>{a.title}<ArrowRight size={13} /></button>)}</section>
            <section><h3>Sobre seus projetos</h3>{DATA_SUGGESTIONS.map((s) => <button type="button" key={s} onClick={() => void ask(s)}>{s}<ArrowRight size={13} /></button>)}</section>
          </>}
          {messages.map((m, i) => m.role === 'user' ? <p key={i} className="hp-user">{m.text}</p>
            : m.role === 'help' ? <article key={i} className="hp-answer">
              <header><BookOpen size={14} />{m.article.title}</header>
              <ol>{m.article.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              {m.article.links.length > 0 && <div className="hp-links">{m.article.links.map((l) => <Link key={l.href} href={localize(l.href)} className="btn" onClick={() => setOpen(false)}>{l.label}<ArrowRight size={13} /></Link>)}</div>}
              {m.related.length > 0 && <footer><small>Também pode ajudar</small>{m.related.map((r) => <button type="button" key={r.id} onClick={() => void ask(q(r))}>{r.title}</button>)}</footer>}
            </article>
            : m.role === 'data' ? <article key={i} className="hp-answer"><header><Sparkles size={14} />Sobre os seus projetos</header><p>{m.text}</p><small className="hp-note">Resposta com os dados da demonstração.</small></article>
            : <article key={i} className="hp-answer miss"><header>Não encontrei isso na ajuda</header><p>Tente com outras palavras, por exemplo o nome do módulo e o que quer fazer. Talvez seja um destes:</p><footer>{m.suggestions.map((r) => <button type="button" key={r.id} onClick={() => void ask(q(r))}>{r.title}</button>)}</footer></article>)}
          {busy && <p className="hp-busy"><LoaderCircle className="spin" size={14} />Procurando na ajuda…</p>}
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); void ask(input); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ex: como importo um modelo BIM?" aria-label="Pergunta para a ajuda" />
          <button disabled={busy || !input.trim()} aria-label="Enviar pergunta"><ArrowUp size={20} /></button>
        </form>
      </SheetContent>
    </Sheet>
  </>;
}
