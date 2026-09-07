'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<'sso' | 'password'>('sso');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function enter(e: React.SyntheticEvent) {
    e.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 850));
    router.push('/dashboard');
  }
  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem('arq-theme', next);
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-grid-lines" />
        <a href="/" className="login-brand">
          <span className="brand-mark">
            <i />A
          </span>
          <span>
            ARQ<span>.AI</span>
          </span>
        </a>
        <div className="story-content">
          <span className="enterprise-kicker">
            <Building2 size={15} />
            Inteligência operacional para arquitetura
          </span>
          <h1>
            Seu escritório inteiro.
            <br />
            <em>Uma visão mais clara.</em>
          </h1>
          <p>
            Projetos, documentos, análises e decisões conectados em uma
            plataforma preparada para organizações de arquitetura.
          </p>
          <div className="story-proof">
            <div>
              <strong>126h</strong>
              <span>devolvidas à equipe neste mês</span>
            </div>
            <div>
              <strong>87%</strong>
              <span>de conformidade documental</span>
            </div>
            <div>
              <strong>3</strong>
              <span>unidades operando em conjunto</span>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <span>
            <ShieldCheck size={16} />
            Ambiente corporativo protegido
          </span>
          <span>Enterprise Demo · dados fictícios</span>
        </div>
      </section>
      <section className="login-access">
        <button
          className="login-theme theme-toggle"
          onClick={toggleTheme}
          aria-label="Alternar tema claro e escuro"
        >
          <Moon className="moon-icon" />
          <Sun className="sun-icon" />
        </button>
        <div className="login-card">
          <div className="login-card-head">
            <span className="login-spark">
              <Sparkles size={20} />
            </span>
            <div>
              <small>STUDIO ARQUITETURA</small>
              <h2>Bem-vinda de volta</h2>
            </div>
          </div>
          <p className="login-intro">Acesse o workspace da sua organização.</p>
          <div
            className="login-tabs"
            role="tablist"
            aria-label="Método de acesso"
          >
            <button
              role="tab"
              aria-selected={method === 'sso'}
              className={method === 'sso' ? 'active' : ''}
              onClick={() => setMethod('sso')}
            >
              SSO corporativo
            </button>
            <button
              role="tab"
              aria-selected={method === 'password'}
              className={method === 'password' ? 'active' : ''}
              onClick={() => setMethod('password')}
            >
              E-mail e senha
            </button>
          </div>
          {method === 'sso' ? (
            <form onSubmit={enter} className="login-form">
              <label className="login-field">
                <span>Domínio da organização</span>
                <div>
                  <Building2 size={17} />
                  <input
                    required
                    defaultValue="studioarquitetura.com.br"
                    aria-label="Domínio da organização"
                  />
                </div>
              </label>
              <div className="sso-context">
                <span className="workspace-icon">S</span>
                <div>
                  <strong>Studio Arquitetura</strong>
                  <small>SSO via Microsoft Entra ID · 42 membros</small>
                </div>
                <CheckCircle2 size={18} />
              </div>
              <button className="login-submit" disabled={busy}>
                {busy ? (
                  'Conectando ao provedor seguro...'
                ) : (
                  <>
                    Continuar com SSO <ArrowRight size={18} />
                  </>
                )}
              </button>
              <p className="login-help">
                Você será direcionada ao provedor de identidade da sua
                organização.
              </p>
            </form>
          ) : (
            <form onSubmit={enter} className="login-form">
              <label className="login-field">
                <span>E-mail corporativo</span>
                <div>
                  <Mail size={17} />
                  <input
                    type="email"
                    required
                    defaultValue="ana.martins@studioarquitetura.com.br"
                    aria-label="E-mail corporativo"
                  />
                </div>
              </label>
              <label className="login-field">
                <span>Senha</span>
                <div>
                  <LockKeyhole size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    defaultValue="demonstracao"
                    aria-label="Senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              <div className="login-options">
                <label>
                  <input type="checkbox" defaultChecked /> Manter sessão ativa
                </label>
                <button type="button">Esqueci minha senha</button>
              </div>
              <button className="login-submit" disabled={busy}>
                {busy ? (
                  'Preparando seu workspace...'
                ) : (
                  <>
                    Entrar no ARQ.AI <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
          <div className="login-divider">
            <span />
            ou acesse a demonstração
            <span />
          </div>
          <button
            className="demo-access"
            onClick={() => router.push('/dashboard')}
          >
            Explorar ambiente Enterprise <ArrowRight size={17} />
          </button>
          <p className="login-legal">
            Ao continuar, você concorda com os Termos de Uso e a Política de
            Privacidade.
          </p>
        </div>
        <div className="access-footer">
          <span>© 2026 ARQ.AI</span>
          <span>Segurança · Privacidade · Suporte</span>
        </div>
      </section>
    </main>
  );
}
