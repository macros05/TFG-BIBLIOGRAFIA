import { Routes } from '@angular/router';
import { SearchComponent } from './pages/search/search.component';
import { UploadComponent } from './pages/upload/upload.component';
export const routes: Routes = [
  { path: 'search', component: SearchComponent,pathMatch: 'full' },
  { path: 'upload', component: UploadComponent },
];
