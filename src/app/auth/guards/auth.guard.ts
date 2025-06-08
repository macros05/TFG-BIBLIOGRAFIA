// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    const expectedRole = next.data['role'];  // <-- Nuevo: obtenemos el rol esperado

    if (this.authService.isAuthenticated()) {
      if (!expectedRole || this.authService.getUserRole() === expectedRole) {
        return true;
      } else {
        this.router.navigate(['/no-autorizado']); // O cualquier ruta de error
        return false;
      }
    }

    this.router.navigate(['/login']);
    return false;
  }
}
