import os
import re
import fitz
import json
import requests
from database import SessionLocal
import models
from datetime import datetime
from sqlalchemy.orm import joinedload
from pdf2image import convert_from_path
import pytesseract

# === CONFIGURACIÓN ===
UPLOAD_DIR = "uploads"
DEEPSEEK_API_KEY = "sk-d2ccf7d81d0b4640baca1d0f04069283"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

MODIFICADOS_LOG = "modificados.txt"
CAMBIOS_LOG = "cambios.txt"
ERRORES_LOG = "errores.txt"

# === FUNCIONES ===

def es_invalido(valor):
    if not valor or str(valor).strip().lower() in [
        "", "a", "b", "c", "d", "desconocido", "no especificada", "not specified",
        "ninguno", "none", "...", "especie no especificada", "género desconocido",
        "familia desconocida", "distribución desconocida"
    ]:
        return True
    return False

def extraer_texto(path):
    try:
        doc = fitz.open(path)
        texto = ""
        for page in doc:
            texto += page.get_text()
        if not texto.strip():
            print(f"🧠 OCR aplicado a: {path}")
            images = convert_from_path(path)
            for img in images:
                texto += pytesseract.image_to_string(img, lang="spa+eng")
        return texto
    except Exception as e:
        print(f"❌ Error extrayendo texto de {path}: {e}")
        guardar_error(path, f"Error extrayendo texto: {e}")
        return ""

def guardar_log(path, datos=None):
    with open(MODIFICADOS_LOG, "a", encoding="utf-8") as f:
        if datos:
            f.write(f"{path} => {json.dumps(datos, ensure_ascii=False)}\n")
        else:
            f.write(f"{path}\n")

def guardar_cambios(path, cambios_dict):
    with open(CAMBIOS_LOG, "a", encoding="utf-8") as f:
        f.write(f"{path}\n")
        for campo, (anterior, nuevo) in cambios_dict.items():
            f.write(f" - {campo}: '{anterior}' -> '{nuevo}'\n")
        f.write("\n")

def guardar_error(path, mensaje):
    with open(ERRORES_LOG, "a", encoding="utf-8") as f:
        f.write(f"{path} => {mensaje}\n")

def analizar_por_deepseek(texto):
    prompt = (
        "Eres un experto biólogo. Si están presentes, extrae estos datos en JSON:\n"
        "`familia`, `genero`, `especie`, `distribucion`. Solo devuelve los campos que puedas encontrar correctamente.\n"
        "No inventes datos. Devuelve solo un JSON.\n\n"
        f"{texto[:3000]}"
    )

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 1000
    }

    try:
        response = requests.post(DEEPSEEK_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        match = re.search(r"\{[\s\S]+?\}", content)
        if not match:
            raise ValueError("DeepSeek no devolvió JSON válido.")
        return json.loads(match.group(0).strip())
    except Exception as e:
        raise Exception(f"❌ Error DeepSeek: {e}")

def corregir_campos(doc, especie):
    ruta = doc.ruta_pdf
    if not os.path.exists(ruta):
        guardar_error(ruta, "PDF no encontrado.")
        return

    campos_corregidos = {}        # para modificados.txt
    campos_cambiados_log = {}     # para cambios.txt

    if any([
        es_invalido(especie.familia),
        es_invalido(especie.genero),
        es_invalido(especie.especie),
        es_invalido(especie.distribucion)
    ]):
        texto = extraer_texto(ruta)
        if not texto:
            guardar_error(ruta, "Texto vacío tras extracción.")
            return

        try:
            nuevos_datos = analizar_por_deepseek(texto)
        except Exception as e:
            guardar_error(ruta, str(e))
            return

        if "familia" in nuevos_datos and es_invalido(especie.familia):
            campos_cambiados_log["familia"] = (especie.familia, nuevos_datos["familia"])
            especie.familia = nuevos_datos["familia"]
            campos_corregidos["familia"] = nuevos_datos["familia"]

        if "genero" in nuevos_datos and es_invalido(especie.genero):
            nuevo_valor = ", ".join(nuevos_datos["genero"]) if isinstance(nuevos_datos["genero"], list) else nuevos_datos["genero"]
            campos_cambiados_log["genero"] = (especie.genero, nuevo_valor)
            especie.genero = nuevo_valor
            campos_corregidos["genero"] = nuevo_valor

        if "especie" in nuevos_datos and es_invalido(especie.especie):
            nuevo_valor = ", ".join(nuevos_datos["especie"]) if isinstance(nuevos_datos["especie"], list) else nuevos_datos["especie"]
            campos_cambiados_log["especie"] = (especie.especie, nuevo_valor)
            especie.especie = nuevo_valor
            campos_corregidos["especie"] = nuevo_valor

        if "distribucion" in nuevos_datos and es_invalido(especie.distribucion):
            distribucion = nuevos_datos["distribucion"]
            if isinstance(distribucion, list):
                distribucion = ", ".join(distribucion)
            elif isinstance(distribucion, dict):
                distribucion = "; ".join(f"{k}: {v}" for k, v in distribucion.items())
            campos_cambiados_log["distribucion"] = (especie.distribucion, distribucion)
            especie.distribucion = distribucion
            campos_corregidos["distribucion"] = distribucion

    if campos_cambiados_log:
        guardar_cambios(ruta, campos_cambiados_log)

    return campos_corregidos

def main():
    db = SessionLocal()
    documentos = db.query(models.Documento).options(joinedload(models.Documento.especies)).all()

    for doc in documentos:
        actualizaciones = []
        for especie in doc.especies:
            campos = corregir_campos(doc, especie)
            if campos:
                actualizaciones.append(campos)

        if actualizaciones:
            db.commit()
            print(f"✅ Corregido parcialmente: {doc.ruta_pdf}")
            guardar_log(doc.ruta_pdf, actualizaciones)

    db.close()

if __name__ == "__main__":
    main()
