'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  ScanLine,
  Ruler,
  Calculator,
  Files,
  ChartNoAxesCombined,
  Settings,
  HelpCircle,
  Bell,
  ChevronRight,
  ChevronsUpDown,
  ArrowUpRight,
  LogOut,
  Sun,
  Moon,
  Presentation,
} from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { DemoProvider, useDemo } from '@/hooks/use-demo';
import { AIChat } from '@/components/ai-chat';
import { PageTransition } from '@/components/premium-motion';
const nav = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Projetos', '/projects', FolderOpen],
  ['ArqCheck AI', '/arqcheck', ScanLine],
  ['ArqQuant AI', '/arqquant', Ruler],
  ['ArqBudget AI', '/arqbudget', Calculator],
  ['ArqDocs AI', '/arqdocs', Files],
  ['ArqRadar', '/arqradar', ChartNoAxesCombined],
] as const;
function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [notifications, setNotifications] = useState(false);
  const [read, setRead] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { notice } = useDemo();
  useEffect(() => { const saved = localStorage.getItem('arq-sidebar-open'); if (saved !== null) setSidebarOpen(saved !== 'false'); }, []);
  function setSidebar(value: boolean) { setSidebarOpen(value); localStorage.setItem('arq-sidebar-open', String(value)); }
  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem('arq-theme', next);
  }
  const current =
    nav.find((n) => path.startsWith(n[1]))?.[0] ||
    (path === '/settings'
      ? 'Configurações'
      : path === '/help'
        ? 'Ajuda'
        : 'Dashboard');
  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebar}
      style={{ '--sidebar-width': '248px' } as React.CSSProperties}
    >
      <Sidebar collapsible="icon">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">
            <svg className="brand-glyph" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16 3.5 28 10v12L16 28.5 4 22V10L16 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.25" opacity=".42" />
              <path d="M16 3.5v12.3L28 10M16 15.8 4 10" fill="none" stroke="currentColor" strokeWidth="1.25" opacity=".7" />
              <path d="m10.2 22 5.8-13.5L21.8 22M12.3 17.2h7.4" fill="none" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24.9" cy="6.5" r="1.7" fill="var(--accent)" />
            </svg>
          </span>
          <span>
            ARQ<span className="brand-ai">.AI</span>
          </span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">S</span>
          <div>
            <strong>Studio Arquitetura</strong>
            <small>Matriz Recife · 42 pessoas</small>
          </div>
          <ChevronsUpDown size={14} />
        </div>
        <div className="nav-label">NAVEGAÇÃO</div>
        <nav>
          {nav.map(([name, url, Icon], i) => (
            <Link
              key={url}
              href={url}
              className={'nav-item ' + (current === name ? 'active' : '')}
            >
              <Icon size={19} />
              <span>{name}</span>
              {i === 2 && <span className="nav-count">4</span>}
              {i === 3 && <span className="new-label">NOVO</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <nav>
            <Link
              className={'nav-item ' + (path === '/settings' ? 'active' : '')}
              href="/settings"
            >
              <Settings size={18} />
              <span>Configurações</span>
            </Link>
            <Link
              className={'nav-item ' + (path === '/help' ? 'active' : '')}
              href="/help"
            >
              <HelpCircle size={18} />
              <span>Ajuda e suporte</span>
            </Link>
            <Link
              className="nav-item logout-link"
              href="/"
              aria-label="Sair da conta e voltar para a página inicial"
            >
              <LogOut size={18} />
              <span>Sair da conta</span>
            </Link>
          </nav>
          <div className="plan-card">
            <span>
              Organização Enterprise <ArrowUpRight size={14} />
            </span>
            <strong>
              Enterprise <span>DEMO</span>
            </strong>
            <div className="plan-line">
              <i />
            </div>
            <small>3 unidades · 42 licenças ativas</small>
          </div>
          <Link
            className="profile"
            href="/settings"
            aria-label="Abrir perfil e configurações"
          >
            <span className="avatar">AM</span>
            <div>
              <strong>Ana Martins</strong>
              <small>Administradora da organização</small>
            </div>
            <span className="online-dot" />
          </Link>
        </div>
      </Sidebar>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>ARQ.AI</span>
            <ChevronRight size={13} />
            <b>{current}</b>
          </div>
          <div className="top-actions">
            <Link className="presentation-link" href="/apresentacao" title="Abrir modo apresentação">
              <Presentation size={15} />
              <span>Apresentar</span>
            </Link>
            <span className="demo-pill">
              <i />
              Enterprise Demo
            </span>
            <button
              className="icon-btn theme-toggle"
              aria-label="Alternar tema claro e escuro"
              title="Alternar tema"
              onClick={toggleTheme}
            >
              <Moon className="moon-icon" size={18} />
              <Sun className="sun-icon" size={18} />
            </button>
            <button
              className="icon-btn notification-btn"
              aria-label="Abrir notificações"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {!read && <i />}
            </button>
            <Link
              className="icon-btn top-logout"
              href="/"
              aria-label="Sair da conta"
              title="Sair da conta"
            >
              <LogOut size={18} />
            </Link>
            <Link
              className="avatar small top-avatar"
              href="/settings"
              aria-label="Abrir perfil e configurações"
              title="Perfil e configurações"
            >
              AM
            </Link>
          </div>
        </header>
        <div className="content-wrap">
          <div className="content"><PageTransition>{children}</PageTransition></div>
        </div>
        <footer className="footer">
          <b>ARQ.AI</b>
          <span>Mais tempo para criar. Mais clareza para decidir.</span>
          <small>Dados fictícios · Setembro 2026</small>
        </footer>
      </main>
      <AIChat />
      <Sheet open={notifications} onOpenChange={setNotifications}>
        <SheetContent className="drawer">
          <SheetTitle>Notificações</SheetTitle>
          <SheetDescription>O que precisa da sua atenção</SheetDescription>
          <button
            className="btn"
            onClick={() => {
              setRead(true);
              notice('Notificações marcadas como lidas.');
            }}
          >
            Marcar todas como lidas
          </button>
          {[
            'ArqCheck encontrou uma inconsistência crítica.',
            'Boa Viagem precisa de uma revisão antes da entrega.',
            'Cliente ainda não enviou documento solicitado.',
            'Quantitativo do Projeto JCP finalizado.',
            'Alphaville ultrapassou a previsão de horas.',
          ].map((n, i) => (
            <Link
              onClick={() => setNotifications(false)}
              className={'notification ' + (read ? 'read' : '')}
              href={
                i === 3
                  ? '/arqquant'
                  : i === 2
                    ? '/arqdocs'
                    : i === 4
                      ? '/arqradar'
                      : '/arqcheck'
              }
              key={n}
            >
              <span className="notification-icon">
                <Bell size={17} />
              </span>
              <div>
                <strong>{n}</strong>
                <small>{i + 1}h atrás · Ver detalhes</small>
              </div>
            </Link>
          ))}
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/') return <DemoProvider>{children}</DemoProvider>;
  return (
    <DemoProvider>
      <Shell>{children}</Shell>
    </DemoProvider>
  );
}
