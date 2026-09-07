from typing import Protocol
from mock_data import issues, CATEGORIES

class IntelligenceProvider(Protocol):
    def check(self,document_count:int)->dict: ...
    def quantify(self)->dict: ...
    def classify(self,filename:str)->str: ...
    def chat(self,message:str,context:dict)->str: ...

class MockIntelligenceProvider:
    def check(self,document_count):
        return dict(score=87,documents=document_count,issues=issues(),simulated=True)
    def quantify(self):
        return dict(area=148.7,quantities={'piso':148.7,'revestimento':67.4,'paredes':238.3,'rodape':126.8,'portas':9,'janelas':7},simulated=True)
    def classify(self,filename):
        n=filename.lower()
        for term,category in [('memorial','Memorial Descritivo'),('planta','Planta'),('contrato','Contrato'),('rrt','ART/RRT'),('art','ART/RRT'),('orcamento','Orçamento'),('licenca','Licença'),('nota','Nota fiscal')]:
            if term in n:return category
        return 'Outros'
    def chat(self,message,context):
        q=message.lower()
        ps=context['projects']
        if 'risco' in q:return 'Projetos com risco alto: '+', '.join(p['name'] for p in ps if p['risk']=='Alto')+'.'
        if 'hora' in q:
            p=max(ps,key=lambda p:p['hours'])
            return f"{p['name']} tem o maior esforço registrado: {p['hours']}h."
        if 'document' in q or 'rrt' in q:
            ids={d['projectId'] for d in context['documents'] if d['category']=='ART/RRT'}
            return 'Sem ART/RRT cadastrado: '+', '.join(p['name'] for p in ps if p['id'] not in ids)+'.'
        if 'diverg' in q:return 'Boa Viagem tem divergência de área: 348 m² no memorial e 362 m² na planta.'
        if 'rent' in q:
            p=min(ps,key=lambda p:(p['revenue']-p['cost'])/max(1,p['revenue']))
            return f"Menor margem estimada: {p['name']}."
        if 'compare' in q:return 'Boa Viagem: 348 m², 72%. Alphaville: 246 m², 63%. Ambos com risco médio.'
        return 'Boa Viagem está em projeto executivo, com 72% de progresso e prazo em 28/09/2026. Revise as pendências documentais.'

provider:IntelligenceProvider=MockIntelligenceProvider()
