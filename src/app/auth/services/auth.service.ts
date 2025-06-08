import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsuarioLogin } from '../interfaces/usuario.interface';
import { environment } from '../../../enviroments/enviroments';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl; // Asegúrate de que esta URL sea la correcta para tu backend

  constructor(private http: HttpClient) {}

  // Método para autenticar
  login(user: UsuarioLogin): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, user);
  }

  // Método para obtener los headers con el token
  getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    });
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // Método para hacer logout
  logout(): void {
    localStorage.removeItem('access_token');
  }

  // Método para obtener el nombre del usuario
  getUserName(): string {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decodedToken = JSON.parse(atob(token.split('.')[1])); // Decodifica el token JWT
      return decodedToken?.sub || '';  // Devuelve el username del payload
    }
    return '';
  }

  getUserEmail(): string {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decodedToken = JSON.parse(atob(token.split('.')[1])); // Decodifica el token JWT
      return decodedToken?.email || '';  // Devuelve el email del payload
    }
    return '';
  }
  
  getUserRole(): string {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decodedToken = JSON.parse(atob(token.split('.')[1])); // Decodifica el token JWT
      return decodedToken?.role || '';  // Devuelve el rol del payload
    }
    return '';
  }

}
