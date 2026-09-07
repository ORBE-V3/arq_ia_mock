from fastapi import APIRouter
from schemas import ChatRequest
from services.providers import provider
from services import repository as repo
router=APIRouter(prefix='/ai',tags=['Assistente'])

@router.post('/chat')
def chat(body:ChatRequest):
    return dict(answer=provider.chat(body.message,dict(projects=repo.all_records('projects'),documents=repo.all_records('documents'))),simulated=True)
