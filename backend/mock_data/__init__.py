NAMES=['Residencial Boa Viagem','Casa JCP','Edifício Comercial Recife','Apartamento Jardins','Residencial Alphaville','Escritório Corporativo XPTO','Casa Praia do Paiva','Retrofit Recife Antigo','Clínica Boa Vista','Residencial Casa Forte','Casa Olinda','Hotel Porto de Galinhas','Apartamento Pina','Loja Graças','Residencial Espinheiro','Casa Tamandaré','Edifício Derby','Studio Madalena','Casa Poço da Panela','Café Boa Vista','Consultório Jaqueira','Apartamento Rosarinho','Casa Gravatá','Loja Recife','Studio Aflitos']
STATUSES=['Em desenvolvimento','Aguardando cliente','Revisão','Aprovação','Obra','Concluído']
CATEGORIES=['Contrato','Memorial Descritivo','Planta','ART/RRT','Documento do cliente','Orçamento','Licença','Projeto aprovado','Nota fiscal','Documento municipal','Outros']

def issues():
    return [dict(id=str(i+1),title=t,priority=p,detail=d,resolved=False,comments=[]) for i,(t,p,d) in enumerate([
        ('Divergência de área','Alta','Memorial: 348 m². Planta: 362 m². Diferença: 14 m².'),
        ('Documento ausente','Alta','RRT atualizado não localizado nos documentos desta análise.'),
        ('Informação divergente','Média','Nome do proprietário diferente entre documentos.'),
        ('Informação cadastral incompatível','Baixa','Número do imóvel difere entre os documentos.')])]

def seed():
    projects=[dict(id=str(i+1),name=n,client=['João Almeida','Carolina Pereira','Grupo Recife','Mariana Costa','Pedro Oliveira'][i%5],type='Comercial' if i%3==2 else 'Residencial',owner=['Ana Martins','Lucas Costa','Beatriz Melo'][i%3],stage=['Projeto Executivo','Anteprojeto','Estudo Preliminar'][i%3],status='Concluído' if i>=18 else STATUSES[i%5],deadline='2026-09-28' if i==0 else '2026-09-04' if 0<i<4 else f'2026-10-{10+i:02}',progress=100 if i>=18 else 72 if i==0 else 35+(i*7)%60,risk='Médio' if i==0 else 'Alto' if i<4 else 'Médio' if i%4==0 else 'Baixo',area=348 if i==0 else 150+i*24,revenue=17000+i*500,cost=11000+i*400,hours=45+i*8,createdAt=f'2026-0{4+i%6}-05') for i,n in enumerate(NAMES)]
    docs=[dict(id=str(i+1),name='memorial_final_v3.pdf' if i==0 else 'planta_executiva_rev02.pdf' if i==1 else f'documento_{i+1:02}.pdf',category='Memorial Descritivo' if i==0 else 'Planta' if i==1 else CATEGORIES[i%11],projectId='1' if i<34 else str(2+i%17),date='2026-09-07',status='Processado',confidence=98-i%7,area=362 if i==1 else 348) for i in range(62)]
    return dict(projects=projects,documents=docs,analyses=[dict(id='check-1',projectId='1',date='2026-09-07',score=87,documents=34,issues=issues()),dict(id='check-2',projectId='2',date='2026-09-06',score=96,documents=12,issues=issues()[:1])],quants=[dict(id='quant-1',projectId='2',date='2026-09-07',area=148.7)])
