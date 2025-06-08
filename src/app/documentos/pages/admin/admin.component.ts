import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Usuario } from '../../../auth/interfaces/usuario.interface';
import { UsuarioService } from './services/admin.service';
import { environment } from '../../../../enviroments/enviroments';
import { MaterialModule } from '../../../material/material.module';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  imports: [MaterialModule, MatSnackBarModule]
})
export class AdminComponent implements OnInit {
  newUser = {
    username: '',
    email: '',
    password: '',
    rol_id: 2
  };

  editando: boolean = false;
  usuarioEditandoId: number | null = null;
  usuarios: Usuario[] = [];

  constructor(
    private usuarioService: UsuarioService,
    private http: HttpClient,
    private snackBar: MatSnackBar // <-- Aquí añades esto

  ) { }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  onSubmit() {
    if (this.editando && this.usuarioEditandoId) {
      this.http.put(`${environment.apiUrl}/usuarios/${this.usuarioEditandoId}`, this.newUser).subscribe({
        next: () => {
          alert('Usuario actualizado');
          this.cancelarEdicion();
          this.cargarUsuarios();
        },
        error: err => alert('Error al actualizar: ' + err.error.detail || 'desconocido')
      });
    } else {
      this.http.post(`${environment.apiUrl}/register`, this.newUser).subscribe({
        next: () => {
          alert('Usuario registrado');
          this.newUser = { username: '', email: '', password: '', rol_id: 2 };
          this.cargarUsuarios();
        },
        error: err => alert('Error al registrar: ' + err.error.detail || 'desconocido')
      });
    }
  }


  cargarUsuarios() {
    this.usuarioService.obtenerUsuarios().subscribe({
      next: usuarios => this.usuarios = usuarios,
      error: () => alert('No se pudieron cargar los usuarios')
    });
  }

  eliminarUsuario(id: number) {
    if (!confirm('¿Eliminar este usuario?')) return;
    this.usuarioService.eliminarUsuario(id).subscribe({
      next: () => this.cargarUsuarios(),
      error: () => alert('No se pudo eliminar el usuario')
    });
  }


  editarUsuario(user: Usuario) {
    this.editando = true;
    this.usuarioEditandoId = user.id;
    this.newUser = {
      username: user.username,
      email: user.email,
      password: '', // Vacío por seguridad
      rol_id: user.rol_id
    };
  }

  guardarEdicionUsuario(): void {
    if (!this.usuarioEditandoId) return;

    const usuarioActualizado = {
      ...this.newUser
    };

    this.usuarioService.editarUsuario(this.usuarioEditandoId, usuarioActualizado).subscribe({
      next: updatedUser => {
        this.snackBar.open('Usuario actualizado con éxito', 'Cerrar', {
          duration: 3000, // milisegundos
          verticalPosition: 'bottom'
        });

        this.editando = false;
        this.usuarioEditandoId = null;
        this.newUser = { username: '', email: '', password: '', rol_id: 2 };
        this.cargarUsuarios(); // recargar usuarios
      },
      error: err => {
        this.snackBar.open('Error actualizando usuario', 'Cerrar', {
          duration: 3000,
          panelClass: ['custom-snackbar'],
          verticalPosition: 'bottom'
        });
        console.error('Error actualizando usuario', err);
      }
    });
  }


  cancelarEdicion() {
    this.editando = false;
    this.usuarioEditandoId = null;
    this.newUser = {
      username: '',
      email: '',
      password: '',
      rol_id: 2
    };
  }

}
