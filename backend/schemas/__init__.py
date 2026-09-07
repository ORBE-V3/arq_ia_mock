from pydantic import BaseModel, Field
from typing import Literal
from datetime import date

class ProjectCreate(BaseModel):
    name: str = Field(min_length=2,max_length=150)
    client: str = Field(min_length=2,max_length=150)
    type: Literal['Residencial','Comercial'] = 'Residencial'
    owner: str = 'Ana Martins'
    deadline: date
    area: float = Field(default=0,ge=0)

class AnalysisCreate(BaseModel):
    projectId: str | None = None
    documentIds: list[str] = Field(default_factory=list)

class IssueUpdate(BaseModel):
    resolved: bool | None = None
    comment: str | None = Field(default=None,max_length=2000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1,max_length=4000)

class PriceItem(BaseModel):
    name: str
    quantity: float = Field(ge=0)
    unitPrice: float = Field(ge=0)
