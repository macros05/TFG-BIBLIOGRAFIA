from concurrent.futures import ThreadPoolExecutor
import os
import fitz  # PyMuPDF
import re
import json
import requests
from database import SessionLocal
import models
from datetime import datetime
from time import sleep
from sqlalchemy.exc import OperationalError

# === CONFIG ===
UPLOAD_DIR = "uploads"
DEEPSEEK_API_KEY = "sk-d2ccf7d81d0b4640baca1d0f04069283"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"
ERROR_LOG = "errores.txt"  # Archivo donde se guardarán los errores

def extraer_texto(path):
    try:
        doc = fitz.open(path)
        texto = ""
        for page in doc:
            texto += page.get_text()
        return texto
    except Exception as e:
        raise Exception(f"❌ No se pudo abrir el archivo: {path}. Error: {e}")

def limpiar_datos(datos):
    """Limpiar y asegurar que los datos esenciales estén presentes."""
    if not datos.get("titulo"):
        datos["titulo"] = "Título desconocido"
    if not datos.get("autores"):
        datos["autores"] = ["Autor desconocido"]
    if not datos.get("anio"):
        datos["anio"] = "Año desconocido"
    if not datos.get("familia"):
        datos["familia"] = "Familia desconocida"
    if not datos.get("genero"):
        datos["genero"] = ["Género desconocido"]
    if not datos.get("especie"):
        datos["especie"] = ["Especie no especificada"]
    if not datos.get("distribucion"):
        datos["distribucion"] = "Distribución desconocida"
    if not datos.get("palabras_clave"):
        datos["palabras_clave"] = []

    return datos

def analizar_por_deepseek(texto):
    prompt = (
        "Extrae del siguiente texto los siguientes datos en formato JSON: "
        "`titulo`, `autores`, `anio`, `familia`, `genero`, `especie`, `distribucion`, "
        "`palabras_clave`. Devuelve solo un JSON con esas claves. "
        "Los autores pueden ser lista o string. Las palabras clave deben ser lista de términos científicos clave.\n\n"
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
        "max_tokens": 4500
    }

    try:
        response = requests.post(DEEPSEEK_URL, headers=headers, json=payload)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise Exception(f"❌ Error al comunicarse con DeepSeek: {e}")

    try:
        data = response.json()
    except json.JSONDecodeError:
        raise Exception("❌ Error al procesar la respuesta JSON de DeepSeek")

    choices = data.get("choices")
    if not choices or not choices[0].get("message"):
        raise Exception("❌ DeepSeek no devolvió una respuesta válida")

    content = choices[0]["message"]["content"]
    json_match = re.search(r"\{[\s\S]+?\}", content)
    if not json_match:
        print(content)
        raise Exception("❌ No se encontró un JSON válido en la respuesta")

    json_text = json_match.group(0).strip()

    try:
        resultado = json.loads(json_text)
    except json.JSONDecodeError:
        print(content)
        raise Exception("❌ DeepSeek no devolvió un JSON válido")

    resultado = limpiar_datos(resultado)

    return resultado

def insertar_en_bd(datos, ruta_pdf):
    db = SessionLocal()

    try:
        if db.query(models.Documento).filter_by(ruta_pdf=ruta_pdf).first():
            print(f"❌ El archivo '{ruta_pdf}' ya está en la base de datos.")
            return

        autores = ", ".join(datos["autores"]) if isinstance(datos["autores"], list) else datos["autores"] or "Autor desconocido"
        genero = ", ".join(datos["genero"]) if datos["genero"] else "Género desconocido"
        palabras_clave = ", ".join(datos["palabras_clave"]) if datos["palabras_clave"] else "Sin palabras clave"
        familia = ", ".join(datos["familia"]) if datos["familia"] else "Familia desconocida"

        especies = datos.get("especie")
        if not especies or especies == [None]:
            especies = ["Especie no especificada"]
        elif isinstance(especies, str):
            especies = [especies]

        # Manejar distribución que puede ser dict o str
        distribucion = datos["distribucion"]
        if isinstance(distribucion, dict):
            distribucion = "; ".join(f"{k}: {v}" for k, v in distribucion.items())
        elif distribucion is None:
            distribucion = "Distribución desconocida"

        doc = models.Documento(
            titulo=datos.get("titulo", "Título desconocido"),
            autores=autores,
            anio=datos.get("anio", "Año desconocido"),
            palabras_clave=palabras_clave,
            ruta_pdf=ruta_pdf,
            fecha_subida=datetime.now()
        )

        db.add(doc)
        db.commit()
        db.refresh(doc)

        for nombre_especie in especies:
            especie = models.Especie(
                familia=familia,
                genero=genero,
                especie=nombre_especie,
                distribucion=distribucion
            )
            db.add(especie)
            doc.especies.append(especie)

        db.commit()
    except (OperationalError, Exception) as e:
        print(f"❌ Error en la base de datos: {e}")
        registrar_error(ruta_pdf, str(e))
    finally:
        db.close()

def registrar_error(archivo, error_mensaje):
    with open(ERROR_LOG, "a") as log_file:
        log_file.write(f"Error con {archivo}: {error_mensaje}\n")

def procesar_pdf(nombre_pdf):
    ruta = os.path.join(UPLOAD_DIR, nombre_pdf)

    if nombre_pdf.startswith("._"):
        return

    try:
        documento_existente = SessionLocal().query(models.Documento).filter_by(ruta_pdf=ruta).first()
        if documento_existente:
            return

        texto = extraer_texto(ruta)
        datos = analizar_por_deepseek(texto)
        insertar_en_bd(datos, ruta_pdf=ruta)
        print(f"✅ Insertado: {nombre_pdf}")
    except Exception as e:
        print(f"❌ Error con {nombre_pdf}: {e}")
        registrar_error(nombre_pdf, str(e))  # Registrar el error y continuar con el siguiente

if __name__ == "__main__":
    archivos = [f for f in os.listdir(UPLOAD_DIR) if f.lower().endswith(".pdf")]

    with ThreadPoolExecutor() as executor:
        executor.map(procesar_pdf, archivos)
