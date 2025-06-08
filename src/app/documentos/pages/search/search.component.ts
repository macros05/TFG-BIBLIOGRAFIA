import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Documento } from '../../interfaces/document.interface';
import { DocumentoService } from '../../services/documentos.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { MaterialModule } from '../../../material/material.module';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../enviroments/enviroments';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  standalone: true,
  imports: [
    MaterialModule, RouterModule
  ]
})
export class SearchComponent implements OnInit {
  documentos: Documento[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  isLoading = false;
  isLoadingMore = false;
  noMoreResults = false;

  tituloBuscado = '';
  autorBuscado = '';
  familiaBuscada = '';
  generoBuscado = '';
  especieBuscada = '';
  palabrasClaveBuscadas = '';
  distribucionBuscada = '';
  error: string | null = null;

  documentoEnEdicion: Documento = {
    id: 0,
    titulo: '',
    autores: '',
    anio: '',
    palabras_clave: '',
    ruta_pdf: '',
    fecha_subida: '',
    distribucion: '',
    especies: []
  };

  especiesRelacionadas: any[] = []; // Lista editable de especies

  private filtroSubject = new Subject<void>();

  constructor(
    private documentosService: DocumentoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.filtroSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(() => {
      this.resetYBuscar();
    });

    this.resetYBuscar();
  }

  onFiltroChange(): void {
    this.page = 1;
    this.documentos = [];
    this.total = 0;
    this.noMoreResults = false;
    this.filtroSubject.next();
  }

  buscar(): void {
    this.error = null;

    if (this.page === 1) {
      this.isLoading = true;
    } else {
      if (this.noMoreResults) return;
      this.isLoadingMore = true;
    }

    this.documentosService.buscarPorFiltros({
      titulo: this.tituloBuscado,
      autor: this.autorBuscado,
      familia: this.familiaBuscada,
      genero: this.generoBuscado,
      especie: this.especieBuscada,
      palabras_clave: this.palabrasClaveBuscadas,
      distribucion: this.distribucionBuscada,
      page: this.page,
      page_size: this.pageSize
    }).subscribe({
      next: res => {
        if (this.page === 1) this.documentos = [];
        this.total = res.total || 0;
        this.documentos = [...this.documentos, ...res.resultados];
        this.noMoreResults = this.documentos.length >= this.total;
        this.isLoading = false;
        this.isLoadingMore = false;
      },
      error: err => {
        this.error = 'Error al cargar documentos';
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  resetYBuscar(): void {
    this.documentos = [];
    this.page = 1;
    this.noMoreResults = false;
    this.buscar();
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    const threshold = 300;
    const position = window.innerHeight + window.scrollY;
    const height = document.documentElement.scrollHeight;

    if (position + threshold >= height && !this.isLoading && !this.isLoadingMore) {
      this.page++;
      this.buscar();
    }
  }

  getEspecies(doc: Documento): string {
    return doc.especies?.map(e =>
      `${e.familia || '?'} - ${e.genero || '?'} ${e.especie} (${e.distribucion || '?'})`
    ).join(', ') || 'No especificado';
  }

  abrirPdf(ruta: string): void {
    const token = localStorage.getItem('access_token');
    const nombreArchivo = ruta.split('/').pop();

    if (!nombreArchivo || !token) {
      alert("Error al abrir el archivo. Intenta de nuevo.");
      return;
    }

    fetch(`${environment.apiUrl}/ver-pdf?nombre=${encodeURIComponent(nombreArchivo)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) throw new Error("No se pudo obtener el PDF");
        return response.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch(() => {
        alert("Error al cargar el PDF.");
      });
  }

  editarDocumento(doc: Documento): void {
    this.documentoEnEdicion = { ...doc }; // Copia el documento seleccionado
    this.especiesRelacionadas = [...(doc.especies || [])]; // Copia las especies actuales
  }

  cancelarEdicion(): void {
    this.documentoEnEdicion = {
      id: 0,
      titulo: '',
      autores: '',
      anio: '',
      palabras_clave: '',
      ruta_pdf: '',
      fecha_subida: '',
      distribucion: '',
      especies: []
    };
    this.especiesRelacionadas = [];
  }

  analizarTexto(): void {
    if (!this.documentoEnEdicion?.titulo) return;

    const token = localStorage.getItem('access_token');

    fetch(`${environment.apiUrl}/analizar-especies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ texto: this.documentoEnEdicion.titulo })
    })
      .then(response => response.json())
      .then(data => {
        this.especiesRelacionadas = data.resultados;
      })
      .catch(err => {
        console.error('Error al analizar especies', err);
        alert('Error al analizar especies.');
      });
  }

  agregarEspecie(): void {
    this.especiesRelacionadas.push({
      familia: '',
      genero: '',
      especie: '',
      distribucion: ''
    });
  }

  eliminarEspecie(index: number): void {
    this.especiesRelacionadas.splice(index, 1);
  }

  trackById(index: number, doc: Documento): number {
    return doc.id;
  }

  guardarCambios(): void {
    if (!this.documentoEnEdicion) return;

    const token = localStorage.getItem('access_token');

    fetch(`${environment.apiUrl}/documentos/${this.documentoEnEdicion.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        titulo: this.documentoEnEdicion.titulo,
        autores: this.documentoEnEdicion.autores,
        anio: this.documentoEnEdicion.anio,
        palabras_clave: this.documentoEnEdicion.palabras_clave,
        especies: this.especiesRelacionadas // <--- Guarda las especies editadas
      })
    })
      .then(response => {
        if (!response.ok) throw new Error('Error al guardar cambios');
        alert('Cambios guardados correctamente');
        this.cancelarEdicion();
        this.resetYBuscar(); // Recargar lista actualizada
      })
      .catch(err => {
        console.error('Error al guardar cambios', err);
        alert('Error al guardar cambios.');
      });
  }
}
