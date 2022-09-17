from typing import Union, List
from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from pipelines import get_nlp

app = FastAPI()

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Paragraphs(BaseModel):
    paragraphs: List[str]
        

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/color")
async def color(ps: Paragraphs):
    nlp = get_nlp()
    docs = [nlp(p) for p in ps.paragraphs]
    colored_ps = [doc._.generate_html() for doc in docs]
    return {"paragraphs": colored_ps}