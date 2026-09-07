'use client';
import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  CloudCog,
  Database,
  FileClock,
  Globe2,
  KeyRound,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { PageHeader, ChartCard, StatusBadge } from '@/components/common';
import { useDemo } from '@/hooks/use-demo';

const notifOptions = [
  [
    'Pendências críticas do ArqCheck',
    'Avisar administradores e responsáveis quando uma inconsistência crítica for encontrada.',
    true,
  ],
  [
    'Documentos processados pelo ArqDocs',
    'Notificar o time do projeto quando novos documentos forem classificados.',
    true,
  ],
  [
    'Quantitativos finalizados no ArqQuant',
    'Enviar um resumo ao responsável quando um levantamento for concluído.',
    false,
  ],
  [
    'Resumo executivo do ArqRadar',
    'Panorama semanal para sócios e gestores da organização.',
    true,
  ],
] as const;
const units = [
  ['Matriz Recife', '24 membros', 'Principal'],
  ['São Paulo', '11 membros', 'Operacional'],
  ['Salvador', '7 membros', 'Operacional'],
];
const roles = [
  ['Administradores', '4 pessoas', 'Acesso total, políticas e faturamento'],
  [
    'Gestores de unidade',
    '6 pessoas',
    'Projetos, equipes e indicadores da unidade',
  ],
  ['Arquitetos', '28 pessoas', 'Projetos e documentos autorizados'],
  [
    'Convidados externos',
    '4 pessoas',
    'Projetos compartilhados e prazo definido',
  ],
];

export default function Page() {
  const { notice } = useDemo();
  const [name, setName] = useState('Ana Martins');
  const [email, setEmail] = useState('ana.martins@studioarquitetura.com.br');
  const [workspace, setWorkspace] = useState('Studio Arquitetura');
  const [notifs, setNotifs] = useState(
    notifOptions.map((o) => o[2] as boolean),
  );
  const [sso, setSso] = useState(true);
  const [provisioning, setProvisioning] = useState(true);
  const [audit, setAudit] = useState(true);
  const [external, setExternal] = useState(false);
  function save(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    notice('Configurações Enterprise salvas.');
  }
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRAÇÃO ENTERPRISE"
        title="Configurações da organização"
        description="Identidade, equipes, segurança e padrões compartilhados entre todas as unidades."
      >
        <span className="enterprise-badge">
          <ShieldCheck size={15} />
          Enterprise
        </span>
        <button
          form="enterprise-settings"
          type="submit"
          className="btn primary"
        >
          Salvar alterações
        </button>
      </PageHeader>
      <div className="enterprise-overview">
        <div>
          <span className="org-mark">
            <Building2 size={22} />
          </span>
          <div>
            <small>ORGANIZAÇÃO</small>
            <h2>Studio Arquitetura</h2>
            <p>Ambiente corporativo centralizado</p>
          </div>
        </div>
        <div className="enterprise-stat">
          <Users size={17} />
          <span>
            <b>42</b> membros ativos
          </span>
        </div>
        <div className="enterprise-stat">
          <MapPin size={17} />
          <span>
            <b>3</b> unidades
          </span>
        </div>
        <div className="enterprise-stat">
          <ShieldCheck size={17} />
          <span>
            <b>SSO</b> ativo
          </span>
        </div>
      </div>
      <form id="enterprise-settings" onSubmit={save}>
        <div className="settings-grid">
          <ChartCard
            title="Organização e unidades"
            subtitle="Estrutura usada em projetos, indicadores e permissões"
          >
            <label className="field">
              Nome da organização
              <input
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
              />
            </label>
            <div className="unit-list">
              {units.map((u, i) => (
                <div className="unit-row" key={u[0]}>
                  <span className="unit-pin">
                    <MapPin size={15} />
                  </span>
                  <div>
                    <strong>{u[0]}</strong>
                    <small>{u[1]}</small>
                  </div>
                  <StatusBadge value={u[2]} />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn add-row"
              onClick={() =>
                notice('Fluxo de nova unidade aberto na versão Enterprise.')
              }
            >
              <Plus size={15} />
              Adicionar unidade
            </button>
          </ChartCard>
          <ChartCard
            title="Seu perfil"
            subtitle="Perfil vinculado à identidade corporativa"
          >
            <div className="form-grid">
              <label className="field">
                Nome
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                E-mail corporativo
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field">
                Função
                <input value="Administradora da organização" readOnly />
              </label>
              <label className="field">
                Unidade
                <input value="Matriz Recife" readOnly />
              </label>
            </div>
            <div className="identity-note">
              <CheckCircle2 size={17} />
              <span>Identidade gerenciada pelo Microsoft Entra ID</span>
            </div>
          </ChartCard>
        </div>
        <div className="settings-grid">
          <ChartCard
            title="Identidade e acesso"
            subtitle="SSO, provisionamento e colaboração externa"
          >
            <SettingToggle
              icon={KeyRound}
              title="Login único via SAML/OIDC"
              detail="Microsoft Entra ID · studioarquitetura.com.br"
              checked={sso}
              onChange={setSso}
            />
            <SettingToggle
              icon={Users}
              title="Provisionamento automático SCIM"
              detail="Sincronizar pessoas, grupos e desligamentos"
              checked={provisioning}
              onChange={setProvisioning}
            />
            <SettingToggle
              icon={Globe2}
              title="Convidados externos"
              detail="Acesso temporário para clientes e consultores"
              checked={external}
              onChange={setExternal}
            />
            <div className="sso-domain">
              <span>
                <ShieldCheck size={16} />
                Domínio verificado
              </span>
              <strong>studioarquitetura.com.br</strong>
              <StatusBadge value="Ativo" />
            </div>
          </ChartCard>
          <ChartCard
            title="Governança e segurança"
            subtitle="Políticas aplicadas a toda a organização"
          >
            <SettingToggle
              icon={FileClock}
              title="Trilha de auditoria"
              detail="Registrar acessos, análises, exportações e alterações"
              checked={audit}
              onChange={setAudit}
            />
            <div className="form-grid">
              <label className="field">
                Retenção de auditoria
                <select defaultValue="24 meses">
                  <option>12 meses</option>
                  <option>24 meses</option>
                  <option>60 meses</option>
                </select>
              </label>
              <label className="field">
                Residência dos dados
                <select defaultValue="Brasil">
                  <option>Brasil</option>
                  <option>América Latina</option>
                  <option>Global</option>
                </select>
              </label>
            </div>
            <div className="compliance-row">
              <span>
                <ShieldCheck size={16} />
                Criptografia em trânsito e repouso
              </span>
              <span>
                <Database size={16} />
                Backups corporativos
              </span>
            </div>
          </ChartCard>
        </div>
        <ChartCard
          title="Papéis e permissões"
          subtitle="Acesso baseado em função, unidade e participação no projeto"
        >
          <div className="roles-grid">
            {roles.map((r, i) => (
              <div className="role-card" key={r[0]}>
                <span className="role-avatar">
                  {i === 0 ? 'AD' : i === 1 ? 'GU' : i === 2 ? 'AR' : 'CE'}
                </span>
                <div>
                  <strong>{r[0]}</strong>
                  <small>{r[1]}</small>
                  <p>{r[2]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => notice(`Permissões de ${r[0]} abertas.`)}
                >
                  Configurar
                </button>
              </div>
            ))}
          </div>
        </ChartCard>
        <div className="settings-spacer" />
        <div className="settings-grid">
          <ChartCard
            title="Notificações da organização"
            subtitle="Defina o que chega a cada equipe"
          >
            {notifOptions.map((o, i) => (
              <div key={o[0]} className="rank-row">
                <div>
                  <strong>{o[0]}</strong>
                  <small>{o[1]}</small>
                </div>
                <Switch
                  checked={notifs[i]}
                  onCheckedChange={(v: boolean) =>
                    setNotifs((n) => n.map((x, j) => (j === i ? v : x)))
                  }
                />
              </div>
            ))}
          </ChartCard>
          <ChartCard
            title="Integrações corporativas"
            subtitle="Conexões disponíveis para o workspace Enterprise"
          >
            <Integration
              icon={CloudCog}
              name="Microsoft 365"
              detail="SSO, usuários e documentos"
              status="Conectado"
            />
            <Integration
              icon={Database}
              name="ERP e financeiro"
              detail="Centros de custo e contratos"
              status="Disponível"
            />
            <Integration
              icon={FileClock}
              name="Autodesk Construction Cloud"
              detail="Projetos, revisões e arquivos"
              status="Disponível"
            />
            <button
              type="button"
              className="btn add-row"
              onClick={() => notice('Catálogo de integrações aberto.')}
            >
              <Plus size={15} />
              Explorar integrações
            </button>
          </ChartCard>
        </div>
      </form>
    </>
  );
}

function SettingToggle({
  icon: Icon,
  title,
  detail,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-toggle">
      <span>
        <Icon size={17} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function Integration({
  icon: Icon,
  name,
  detail,
  status,
}: {
  icon: React.ElementType;
  name: string;
  detail: string;
  status: string;
}) {
  return (
    <div className="integration-row">
      <span>
        <Icon size={18} />
      </span>
      <div>
        <strong>{name}</strong>
        <small>{detail}</small>
      </div>
      <StatusBadge value={status} />
    </div>
  );
}
