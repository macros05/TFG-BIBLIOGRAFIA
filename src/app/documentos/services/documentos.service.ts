import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Documento } from '../interfaces/document.interface';
import { environment } from '../../../enviroments/enviroments';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService  // Inyectamos el servicio de autenticación
  ) { }

  // Método para enviar los filtros en la búsqueda de documentos
  buscarPorFiltros(filtros: {
    titulo?: string, autor?: string, familia?: string, genero?: string,
    especie?: string, palabras_clave?: string, distribucion?: string,
    page?: number, page_size?: number
  }): Observable<{ total: number, resultados: Documento[] }> {

    let params = new HttpParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    // Agregar el token de acceso en los headers para las solicitudes
    const headers = this.authService.getHeaders();

    return this.http.get<{ total: number, resultados: Documento[] }>(
      `${this.apiUrl}/documentos/buscar`, { params, headers }
    );
  }

  // Método para subir documentos
  subirDocumentos(archivos: File[]): Observable<any> {
    const formData = new FormData();

    archivos.forEach((archivo) => {
      formData.append('archivos', archivo, archivo.name);
    });

    // Agregar el token de acceso en los headers para la solicitud de subida
    const headers = this.authService.getHeaders();

    return this.http.post(`${this.apiUrl}/documentos/subir`, formData, { headers });
  }
  actualizarDocumento(id: number, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/documentos/${id}`, datos);
  }

}
