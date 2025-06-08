from sqlalchemy.orm import Session
import models, schemas
from sqlalchemy.orm import joinedload, aliased
from sqlalchemy import or_

def crear_documento(db: Session, doc: schemas.Documento):  # o dict si pasas datos manualmente
    db_doc = models.Documento(**doc.dict(exclude={"especies_ids"}))
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    for especie_id in doc.especies_ids:
        relacion = models.DocumentoEspecie(documento_id=db_doc.id, especie_id=especie_id)
        db.add(relacion)
    db.commit()
    return db_doc

def obtener_documentos(db: Session):
    return db.query(models.Documento).options(joinedload(models.Documento.especies)).all()

def obtener_especies(db: Session):
    return db.query(models.Especie).all()

def buscar_documentos(db: Session, titulo: str = None, autor: str = None, familia: str = None, genero: str = None, especie: str = None):
    try:
        query = db.query(models.Documento).join(models.Documento.especies).options(joinedload(models.Documento.especies))

        # Filtro por título
        if titulo:
            query = query.filter(models.Documento.titulo.ilike(f"%{titulo}%"))
        
        # Filtro por autor
        if autor:
            query = query.filter(models.Documento.autores.ilike(f"%{autor}%"))
        
        # Filtro por familia, genero, especie usando la relación M:N
        if familia or genero or especie:
            # Creamos un alias de Especie para hacer los filtros
            especie_alias = aliased(models.Especie)
            query = query.join(especie_alias, models.Documento.especies)

            if familia:
                query = query.filter(especie_alias.familia.ilike(f"%{familia}%"))
            if genero:
                query = query.filter(especie_alias.genero.ilike(f"%{genero}%"))
            if especie:
                query = query.filter(especie_alias.especie.ilike(f"%{especie}%"))

        return query.distinct().all()

    except Exception as e:
        print(f"❌ Error en la búsqueda: {e}")
        raise