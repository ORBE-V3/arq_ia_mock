from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services import repository as repo
from services.providers import provider
router=APIRouter(prefix='/documents',tags=['Documentos'])

@router.get('')
def list_documents(projectId:str='',category:str='',search:str=''):
    return [d for d in repo.all_records('documents') if (not projectId or d['projectId']==projectId) and (not category or d['category']==category) and search.lower() in d['name'].lower()]

@router.post('/upload',status_code=201)
async def upload(files:list[UploadFile]=File(...),projectId:str=Form(...)):
    repo.get('projects',projectId)
    if len(files)>30:raise HTTPException(400,'Envie no máximo 30 arquivos por lote')
    result=[]
    for file in files:
        name=(file.filename or 'arquivo').replace('\\','/').split('/')[-1]
        if name.rsplit('.',1)[-1].lower() not in ['pdf','docx','xlsx','jpg','jpeg','png']:raise HTTPException(415,'Formato não suportado. DWG disponível futuramente.')
        data=await file.read(20*1024*1024+1)
        if len(data)>20*1024*1024:raise HTTPException(413,'Limite de 20 MB por arquivo')
        if not data:raise HTTPException(400,'Arquivo vazio')
        result.append(dict(id=str(uuid4()),name=name,category=provider.classify(name),projectId=projectId,date='2026-09-07',status='Processado',confidence=97,area=348,simulated=True))
    # Validate the whole batch before committing. Contents intentionally discarded in demo.
    for row in result:repo.save('documents',row)
    return result
