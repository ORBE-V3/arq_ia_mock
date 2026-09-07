from uuid import uuid4
from fastapi import APIRouter, Depends
from schemas import ProjectCreate
from services import repository as repo
from services.auth import current_identity
router=APIRouter(prefix='/projects',tags=['Projetos'],dependencies=[Depends(current_identity)])

@router.get('')
def list_projects(search:str='',status:str='',owner:str=''):
    return [p for p in repo.all_records('projects') if search.lower() in (p['name']+' '+p['client']).lower() and (not status or p['status']==status) and (not owner or p['owner']==owner)]

@router.get('/{id}')
def get_project(id:str):return repo.get('projects',id)

@router.post('',status_code=201)
def create_project(body:ProjectCreate):
    return repo.save('projects',dict(**body.model_dump(mode='json'),id=str(uuid4()),stage='Estudo Preliminar',status='Em desenvolvimento',progress=0,risk='Baixo',revenue=0,cost=0,hours=0,createdAt='2026-09-07'))
