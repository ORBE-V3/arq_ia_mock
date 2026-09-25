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
        <div className="architectural-study" aria-hidden="true"><span className="study-arch"/><span className="study-wall"/><span className="study-floor"/><span className="study-caption">ESTUDO DE ESPAÇO · 01</span></div>
        <a href="/" className="login-brand">
          <span className="brand-mark">
            <svg className="brand-glyph" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16 3.5 28 10v12L16 28.5 4 22V10L16 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.25" opacity=".42" />
              <path d="M16 3.5v12.3L28 10M16 15.8 4 10" fill="none" stroke="currentColor" strokeWidth="1.25" opacity=".7" />
              <path d="m10.2 22 5.8-13.5L21.8 22M12.3 17.2h7.4" fill="none" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24.9" cy="6.5" r="1.7" fill="var(--accent)" />
            </svg>
          </span>
          <span>
            ARQ<span>.AI</span>
          </span>
        </a>
        <div className="story-content">
          <span className="enterprise-kicker">
            <Building2 size={15} />
            Um lugar mais claro para cada projeto
          </span>
          <h1>
            Mais tempo para criar.
            <br />
            <em>Mais clareza para construir.</em>
          </h1>
          <p>
            Reúna o contexto do projeto, encontre divergências antes da entrega
            e conduza decisões com a equipe inteira na mesma página.
          </p>
          <div className="story-proof">
            <div>
              <strong>01 / Revisar</strong>
              <span>Encontre inconsistências entre plantas e documentos.</span>
            </div>
            <div>
              <strong>02 / Medir</strong>
              <span>Transforme leitura de projeto em quantitativos.</span>
            </div>
            <div>
              <strong>03 / Decidir</strong>
              <span>Compartilhe evidências, custos e próximos passos.</span>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <span>
            <ShieldCheck size={16} />
            Feito para equipes de projeto
          </span>
          <span>Ambiente demonstrativo · dados fictícios</span>
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
              <Building2 size={20} />
            </span>
            <div>
              <small>SEU ESPAÇO DE TRABALHO</small>
              <h2>Entre no seu escritório</h2>
            </div>
          </div>
          <p className="login-intro">Continue de onde seu projeto parou.</p>
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
            Explorar demonstração <ArrowRight size={17} />
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
