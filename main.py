# main.py
from fastapi import FastAPI, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, aliased
import models, schemas, crud
from database import SessionLocal, engine
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear el directorio de 'uploads' si no existe
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/documentos", response_model=list[schemas.Documento])
def listar_documentos(db: Session = Depends(get_db)):
    return crud.obtener_documentos(db)

@app.post("/documentos", response_model=schemas.Documento)
def crear_documento(doc: schemas.DocumentoCreate, db: Session = Depends(get_db)):
    return crud.crear_documento(db, doc)

@app.get("/especies", response_model=list[schemas.Especie])
def listar_especies(db: Session = Depends(get_db)):
    return crud.obtener_especies(db)

@app.get("/documentos/buscar", response_model=dict)
def buscar_documentos(
    titulo: str = "",
    autor: str = "",
    familia: str = "",
    genero: str = "",
    especie: str = "",
    palabras_clave: str = "",
    distribucion: str = "",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    db: Session = Depends(get_db)
):
    query = db.query(models.Documento).options(joinedload(models.Documento.especies))

    if titulo:
        query = query.filter(models.Documento.titulo.ilike(f"%{titulo}%"))
    if autor:
        query = query.filter(models.Documento.autores.ilike(f"%{autor}%"))
    if palabras_clave:
        palabras = palabras_clave.split(",")
        condiciones_palabras = [models.Documento.palabras_clave.ilike(f"%{p.strip()}%") for p in palabras]
        query = query.filter(or_(*condiciones_palabras))

    if familia or genero or especie or distribucion:
        query = query.join(models.Documento.especies)
        if familia:
            query = query.filter(models.Especie.familia.ilike(f"%{familia}%"))
        if genero:
            query = query.filter(models.Especie.genero.ilike(f"%{genero}%"))
        if especie:
            query = query.filter(models.Especie.especie.ilike(f"%{especie}%"))
        if distribucion:
            query = query.filter(models.Especie.distribucion.ilike(f"%{distribucion}%"))

    total = query.distinct().count()
    resultados = query.distinct().offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "resultados": jsonable_encoder(resultados)
    }