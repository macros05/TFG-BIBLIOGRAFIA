export interface UsuarioLogin {
  username: string;
  password: string;

}

export interface Usuario {
  id: number;
  username: string;
  password: string;
  email: string;
  rol_id: number;
}
