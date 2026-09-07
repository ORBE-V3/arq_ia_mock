from uuid import uuid4
from fastapi import APIRouter,HTTPException
from schemas import AnalysisCreate,IssueUpdate
from services import repository as repo
from services.providers import provider
router=APIRouter(prefix='/arqcheck',tags=['ArqCheck'])

@router.get('')
def history():return repo.all_records('analyses')

@router.post('/analyze',status_code=201)
def analyze(body:AnalysisCreate):
    if body.projectId:repo.get('projects',body.projectId)
    for id in body.documentIds:
        d=repo.get('documents',id)
        if body.projectId and d['projectId']!=body.projectId:raise HTTPException(400,'Documento pertence a outro projeto')
    return repo.save('analyses',dict(id=str(uuid4()),projectId=body.projectId or 'independent',date='2026-09-07',**provider.check(len(body.documentIds))))

@router.get('/{id}')
def get_analysis(id:str):return repo.get('analyses',id)

@router.patch('/{id}/issues/{issue_id}')
def update_issue(id:str,issue_id:str,body:IssueUpdate):
    with repo.lock:
        a=repo.get('analyses',id)
        issue=next((i for i in a['issues'] if i['id']==issue_id),None)
        if not issue:raise HTTPException(404,'Pendência não encontrada')
        if body.resolved is not None:issue['resolved']=body.resolved
        if body.comment and body.comment.strip():issue['comments'].append(body.comment.strip())
        return repo.save('analyses',a)
