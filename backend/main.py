import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import projects, documents, check, quant, analytics, ai

app = FastAPI(title='ARQ.AI API', version='0.1.0', description='API demonstrativa. IA, OCR e leitura de plantas são simulados. Sem autenticação real.')
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS','http://localhost:3000,http://127.0.0.1:3000').split(','), allow_methods=['GET','POST','PATCH'], allow_headers=['Content-Type','Authorization'])
for router in [projects.router, documents.router, check.router, quant.router, analytics.router, ai.router]:
    app.include_router(router)

@app.get('/health')
def health():
    return {'status':'ok','mode':'demo','authentication':'disabled'}
