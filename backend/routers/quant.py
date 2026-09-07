from uuid import uuid4
from fastapi import APIRouter
from schemas import AnalysisCreate
from services import repository as repo
from services.providers import provider
router=APIRouter(prefix='/arqquant',tags=['ArqQuant'])

@router.get('')
def history():return repo.all_records('quants')

@router.post('/analyze',status_code=201)
def analyze(body:AnalysisCreate):
    if body.projectId:repo.get('projects',body.projectId)
    for id in body.documentIds:repo.get('documents',id)
    return repo.save('quants',dict(id=str(uuid4()),projectId=body.projectId or 'independent',date='2026-09-07',**provider.quantify()))

@router.get('/{id}')
def get_quant(id:str):return repo.get('quants',id)
