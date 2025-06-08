import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentoService } from '../../services/documentos.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  archivos: File[] = [];
  procesadosCorrectamente: string[] = [];
  erroresProcesamiento: { archivo: string; error: string }[] = [];

  constructor(private documentoService: DocumentoService) {}

  onArchivosSeleccionados(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.archivos = Array.from(input.files);
    }
  }

  subirPDFs() {
    if (this.archivos.length === 0) {
      alert('Por favor, selecciona al menos un archivo.');
      return;
    }

    this.documentoService.subirDocumentos(this.archivos).subscribe({
      next: (res) => {
        this.procesadosCorrectamente = [];
        this.erroresProcesamiento = [];

        res.resultados.forEach((r: any) => {
          if (r.status.includes('✅')) {
            this.procesadosCorrectamente.push(r.archivo);
          } else {
            this.erroresProcesamiento.push({ archivo: r.archivo, error: r.error });
          }
        });

        this.archivos = []; // limpiar tras subida
      },
      error: (err) => {
        console.error('Error al subir:', err);
        alert('Error general al subir los documentos');
      }
    });
  }

}
