import { Especie } from "./especie.interface";

export interface Documento {
  id: number;
  titulo: string;
  autores: string;
  anio: string;
  palabras_clave: string;
  ruta_pdf: string;
  fecha_subida: string;
  especies: Especie[];
  distribucion: string;
}
