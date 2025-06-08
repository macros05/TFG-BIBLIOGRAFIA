import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsuarioLogin } from '../../interfaces/usuario.interface';
import { MaterialModule } from '../../../material/material.module';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [ MaterialModule]
})
export class LoginComponent implements OnInit {
  usernameOrEmail: string = '';  // Campo de entrada tanto para username como para email
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {}

  login(): void {
    if (!this.usernameOrEmail || !this.password) {
      this.errorMessage = "Por favor ingresa tus credenciales.";
      return;
    }

    this.isLoading = true;
    const user: UsuarioLogin = { username: this.usernameOrEmail, password: this.password };

    this.authService.login(user).subscribe({
      next: (response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('rol_id', response.rol_id);
        this.router.navigate(['/search']); // Redirige a la página protegida
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Credenciales incorrectas. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }
}
