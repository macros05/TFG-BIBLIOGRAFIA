import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../../../../auth/interfaces/usuario.interface';
import { environment } from '../../../../../enviroments/enviroments';
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) { }

  obtenerUsuarios(): Observable<Usuario[]> {
    const token = localStorage.getItem('access_token');

    return this.http.get<Usuario[]>(this.apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  eliminarUsuario(id: number): Observable<void> {
    const token = localStorage.getItem('access_token');

    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  editarUsuario(id: number, usuario: Partial<Usuario>): Observable<Usuario> {
    const token = localStorage.getItem('access_token');

    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, usuario, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

}
