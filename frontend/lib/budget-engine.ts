// ArqBudget: catalog, scenario specs, quantities from area, supplier quotes and version diff. Pure (runs under plain node).
// ponytail: quotes are generated deterministically per item/scenario; swap quotesFor() for the supplier connectors (API, e-mail, PDF) when they exist.

export type Scenario = 'Econômico' | 'Base' | 'Alto padrão';
export const SCENARIOS: Scenario[] = ['Econômico', 'Base', 'Alto padrão'];
export type Channel = 'Portal do fornecedor (API)' | 'Cotação por e-mail' | 'Tabela PDF lida pela IA' | 'Referência SINAPI' | 'Histórico do escritório';
export type Quote = { id: string; supplier: string; channel: Channel; price: number; date: string; leadDays: number; region: string; reference?: boolean };
export type Line = { id: string; itemId?: string; name: string; category: string; spec?: string; unit: string; quantity: number; qtySource?: string; unitCost: number; source: string; quoteId?: string; reviewStatus?: string };

type Item = { id: string; name: string; category: string; unit: string; perM2: number; specs: [string, number][] };
export const CATALOG: Item[] = [
  { id: 'fundacao', name: 'Fundações', category: 'Estrutura', unit: 'm²', perM2: 0.45, specs: [['Sapata corrida', 290], ['Radier armado', 335], ['Estaca hélice contínua com blocos', 420]] },
  { id: 'concreto', name: 'Concreto estrutural', category: 'Estrutura', unit: 'm³', perM2: 0.12, specs: [['Concreto usinado fck 25', 470], ['Concreto usinado fck 30', 505], ['Concreto usinado fck 35 bombeado', 560]] },
  { id: 'aco', name: 'Aço CA-50', category: 'Estrutura', unit: 'kg', perM2: 9, specs: [['Vergalhão CA-50 corte e dobra em obra', 8.4], ['Vergalhão CA-50 cortado e dobrado', 8.9], ['Vergalhão CA-50 armado em fábrica', 10.2]] },
  { id: 'alvenaria', name: 'Alvenaria', category: 'Vedação', unit: 'm²', perM2: 0.85, specs: [['Bloco cerâmico 9x19x19', 78], ['Bloco cerâmico 14x19x29', 92], ['Bloco de concreto celular', 124]] },
  { id: 'impermeabilizacao', name: 'Impermeabilização', category: 'Vedação', unit: 'm²', perM2: 0.25, specs: [['Argamassa polimérica', 58], ['Manta asfáltica 4 mm', 92], ['Membrana de poliuretano', 138]] },
  { id: 'piso', name: 'Revestimento de piso', category: 'Acabamentos', unit: 'm²', perM2: 1, specs: [['Cerâmica PEI 4 45x45', 62], ['Porcelanato 60x60 acetinado', 118], ['Porcelanato 120x120 retificado', 245]] },
  { id: 'parede', name: 'Revestimento de parede', category: 'Acabamentos', unit: 'm²', perM2: 1.8, specs: [['Reboco e pintura acrílica', 52], ['Massa corrida e pintura premium', 71], ['Textura e pintura lavável premium', 96]] },
  { id: 'forro', name: 'Forro', category: 'Acabamentos', unit: 'm²', perM2: 0.7, specs: [['Forro de PVC', 48], ['Forro de gesso liso', 69], ['Gesso tabicado com sanca', 112]] },
  { id: 'esquadrias', name: 'Esquadrias', category: 'Esquadrias', unit: 'm²', perM2: 0.14, specs: [['Alumínio linha 25 com vidro comum', 820], ['Alumínio linha Gold com vidro temperado', 1180], ['Alumínio com vidro laminado acústico', 1650]] },
  { id: 'cobertura', name: 'Cobertura', category: 'Vedação', unit: 'm²', perM2: 0.6, specs: [['Telha fibrocimento com estrutura de madeira', 165], ['Telha cerâmica com estrutura metálica', 240], ['Laje impermeabilizada com telhado verde', 390]] },
  { id: 'eletrica', name: 'Instalações elétricas', category: 'Instalações', unit: 'm²', perM2: 1, specs: [['Padrão residencial', 72], ['Padrão com automação básica', 96], ['Automação completa', 148]] },
  { id: 'hidraulica', name: 'Instalações hidráulicas', category: 'Instalações', unit: 'm²', perM2: 1, specs: [['PVC soldável', 58], ['PPR termofusão', 76], ['PEX com aquecimento central', 108]] },
  { id: 'maodeobra', name: 'Mão de obra e encargos', category: 'Mão de obra', unit: 'm²', perM2: 1, specs: [['Empreitada global', 540], ['Empreitada com equipe dedicada', 640], ['Equipe dedicada com acabamento fino', 820]] },
  { id: 'indiretos', name: 'Custos indiretos', category: 'Indiretos', unit: 'm²', perM2: 1, specs: [['Canteiro enxuto e administração local', 310], ['Canteiro, administração e seguros', 420], ['Canteiro completo, gerenciamento e seguros', 540]] },
  { id: 'loucas', name: 'Louças e metais', category: 'Instalações', unit: 'un', perM2: 0.03, specs: [['Linha básica', 780], ['Linha intermediária', 1450], ['Linha premium', 3200]] },
];
const SUPPLIERS: Record<string, string[]> = {
  Estrutura: ['Votorantim Cimentos', 'Gerdau', 'Concreto Nordeste'], Vedação: ['Cerâmica Potiguar', 'Viapol', 'Leroy Merlin'], Acabamentos: ['Portobello', 'Suvinil', 'Eucatex'],
  'Mão de obra': ['Construtora Parceira A', 'Empreiteira Boa Vista', 'Cooperativa Obra Certa'],
  Indiretos: ['Gerenciadora Recife', 'Construtora Parceira A', 'Histórico de obras similares'],
  Esquadrias: ['Alumínio Recife', 'Vidraçaria Boa Vista', 'Telhanorte'], Instalações: ['Tramontina', 'Tigre', 'Deca'],
};
const CHANNELS: Channel[] = ['Portal do fornecedor (API)', 'Cotação por e-mail', 'Tabela PDF lida pela IA'];
export const CUB_PE = 2385; // R$/m², padrão normal R8-N (referência da demo)

function rand(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
const round2 = (v: number) => Math.round(v * 100) / 100;
const tier = (s: Scenario) => SCENARIOS.indexOf(s);
const daysAgo = (today: string, n: number) => new Date(new Date(`${today}T12:00`).getTime() - n * 864e5).toISOString().slice(0, 10);

export function quotesFor(itemId: string, scenario: Scenario, today: string): Quote[] {
  const item = CATALOG.find((i) => i.id === itemId);
  if (!item) return [];
  const base = item.specs[tier(scenario)][1];
  const seed = `${itemId}:${scenario}`;
  return [
    { id: `${seed}:sinapi`, supplier: 'SINAPI 09/2026 · PE', channel: 'Referência SINAPI', price: base, date: '2026-09-01', leadDays: 0, region: 'Pernambuco', reference: true },
    { id: `${seed}:hist`, supplier: 'Histórico do escritório', channel: 'Histórico do escritório', price: round2(base * (0.96 + rand(seed + 'h') * 0.1)), date: daysAgo(today, 40 + Math.floor(rand(seed + 'hd') * 60)), leadDays: 0, region: 'Recife', reference: true },
    ...SUPPLIERS[item.category].map((supplier, i) => ({ id: `${seed}:${i}`, supplier, channel: CHANNELS[i], price: round2(base * (0.86 + rand(seed + supplier) * 0.34)), date: daysAgo(today, Math.floor(rand(seed + supplier + 'd') * 20)), leadDays: 3 + Math.floor(rand(seed + supplier + 'l') * 25), region: 'Recife' })),
  ];
}

// One market band for both recommending and flagging, so the AI never flags its own pick.
const MARKET_BAND = 0.12;

export const median = (values: number[]) => { const v = [...values].sort((a, b) => a - b); const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };

// Cheapest supplier quote within 12% of the median that delivers in up to 20 days; otherwise the median-closest one.
export function recommend(quotes: Quote[]) {
  const suppliers = quotes.filter((q) => !q.reference);
  const med = median(quotes.map((q) => q.price));
  const fit = suppliers.filter((q) => Math.abs(q.price / med - 1) <= MARKET_BAND && q.leadDays <= 20).sort((a, b) => a.price - b.price);
  const pick = fit[0] ?? [...suppliers].sort((a, b) => Math.abs(a.price - med) - Math.abs(b.price - med))[0];
  const pct = Math.round((pick.price / med - 1) * 100);
  const why = fit[0] ? `menor preço dentro da faixa de mercado (${pct === 0 ? 'no preço da mediana' : `${pct > 0 ? '+' : ''}${pct}% da mediana`}) com entrega em ${pick.leadDays} dias` : `mais próximo da mediana; os demais estão fora da faixa ou com prazo acima de 20 dias`;
  return { quote: pick, median: med, why };
}

export function deviation(line: Line, today: string, scenario: Scenario) {
  if (!line.itemId) return null;
  const med = median(quotesFor(line.itemId, scenario, today).map((q) => q.price));
  const d = Math.round((line.unitCost / med - 1) * 100);
  return Math.abs(d) > MARKET_BAND * 100 ? d : null;
}

// measured: quantities taken from the ArqQuant geometry (itemId -> quantity); other items use area ratios.
export function buildLines(area: number, scenario: Scenario, today: string, qtySource: string, measured: Partial<Record<string, number>> = {}, measuredSource = 'ArqQuant · geometria'): Line[] {
  return CATALOG.map((item) => {
    const rec = recommend(quotesFor(item.id, scenario, today)).quote;
    const m = measured[item.id];
    const quantity = m !== undefined ? round2(m) : item.unit === 'un' ? Math.max(2, Math.round(area * item.perM2)) : round2(area * item.perM2);
    return { id: `line-${item.id}`, itemId: item.id, name: item.name, category: item.category, spec: item.specs[tier(scenario)][0], unit: item.unit, quantity, qtySource: m !== undefined ? measuredSource : qtySource, unitCost: rec.price, source: rec.supplier, quoteId: rec.id, reviewStatus: 'Cotado pela IA' };
  });
}

export const lineTotal = (l: Line) => l.quantity * l.unitCost;
export const total = (lines: Line[]) => lines.reduce((t, l) => t + lineTotal(l), 0);
export function byCategory(lines: Line[]) {
  const map = new Map<string, number>();
  lines.forEach((l) => map.set(l.category ?? 'Outros', (map.get(l.category ?? 'Outros') ?? 0) + lineTotal(l)));
  return [...map].map(([name, value]) => ({ name, value }));
}
export function diff(a: Line[], b: Line[]) {
  const ca = new Map(byCategory(a).map((c) => [c.name, c.value]));
  const cb = new Map(byCategory(b).map((c) => [c.name, c.value]));
  return [...new Set([...ca.keys(), ...cb.keys()])].map((name) => ({ name, before: ca.get(name) ?? 0, after: cb.get(name) ?? 0, delta: (cb.get(name) ?? 0) - (ca.get(name) ?? 0) }));
}
