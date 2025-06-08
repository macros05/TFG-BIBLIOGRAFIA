import { Routes, CanActivate } from '@angular/router';
import { LoginComponent } from './app/auth/pages/login/login.component';
import { AuthGuard } from './app/auth/guards/auth.guard';
import { LayoutComponent } from './app/layout/layout.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./app/documentos/documentos.routes').then(m => m.routes),
        canActivate: [AuthGuard]
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./app/documentos/pages/admin/admin.routes').then(m => m.routes),
        canActivate: [AuthGuard],
        data: { role: 'admin' }
      }
    ]

  },
  {
    path: '**',
    redirectTo: '/login',
  }
];
