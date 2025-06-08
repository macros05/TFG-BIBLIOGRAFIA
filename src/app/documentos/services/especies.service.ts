import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroments';

@Injectable({
  providedIn: 'root'
})
export class EspecieService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEspecies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/especies`);
  }
}
