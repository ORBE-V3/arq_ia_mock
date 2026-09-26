// Self-check: node --experimental-strip-types lib/help-kb.check.ts
import assert from 'node:assert/strict';
import { areaFor, findHelp, isDataQuestion } from './help-kb.ts';

const cases: [string, string][] = [
  ['Como ativo o ArqCheck?', 'check-start'],
  ['como mostrar que o check fica rodando sozinho', 'check-demo'],
  ['como importo um arquivo IFC do Revit', 'bim'],
  ['como redimensionar um ambiente na planta', 'plan-edit'],
  ['exportar o modelo para o SketchUp', '3d'],
  ['como troco o fornecedor de um preço', 'budget'],
  ['comparar versões do orçamento', 'budget-versions'],
  ['como anexo um documento com arroba no chat', 'agents-chat'],
  ['quero criar um agente novo com arquivos obrigatórios', 'agents-create'],
  ['como fazer procx entre a planilha e o erp', 'radar-canvas'],
  ['agendar envio semanal por e-mail', 'radar-send'],
  ['onde vejo a auditoria', 'history'],
  ['modo escuro', 'theme'],
];
for (const [q, id] of cases) assert.equal(findHelp(q).best?.id, id, q);
assert.equal(findHelp('qual a capital da França').best, null);

assert.ok(isDataQuestion('Quais projetos estão em risco?'));
assert.ok(!isDataQuestion('Como vejo o risco no radar?'));
assert.equal(areaFor('/projects/1/', '?tab=quant'), 'arqquant');
assert.equal(areaFor('/arqradar/'), 'arqradar');
console.log('help-kb ok');
