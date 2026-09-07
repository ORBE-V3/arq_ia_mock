from fastapi import APIRouter
from services import repository as repo
router=APIRouter(prefix='/analytics',tags=['Indicadores'])

@router.get('/dashboard')
def dashboard(owner:str='',status:str='',type:str=''):
    ps=[p for p in repo.all_records('projects') if (not owner or p['owner']==owner) and (not status or p['status']==status) and (not type or p['type']==type)]
    return dict(active=sum(p['status']!='Concluído' for p in ps),completed=sum(p['status']=='Concluído' for p in ps),late=sum(p['deadline']<'2026-09-07' and p['status']!='Concluído' for p in ps),hours=sum(p['hours'] for p in ps),revenue=sum(p['revenue'] for p in ps),automatedHours=126,analyses=247+len(repo.all_records('analyses'))-2,estimatedSavings=18420,projects=ps,simulated=True)
