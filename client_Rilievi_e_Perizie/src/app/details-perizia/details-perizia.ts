import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { PerizieService } from '../services/perizie-service';

@Component({
  selector: 'app-details-perizia',
  standalone: true,
  imports: [],
  templateUrl: './details-perizia.html',
  styleUrls: ['./details-perizia.css'],
})
export class DetailsPerizia {
  public perizieService: PerizieService = inject(PerizieService);

  @Input() perizia: any = null;
  @Input() routeInfo: { distanceKm: number; durationMin: number } | null = null;
  @Output() closePanel = new EventEmitter<void>();
  @Output() showRoute = new EventEmitter<void>();

  public editingFotoIndex: number | null = null;
  public editingComment = '';
  public editingDescription = false;
  public localDescription = '';
  public savingComment = false;
  public savingDescription = false;
  public ajaxErrorMessage = '';

  onClose() {
    this.closePanel.emit();
  }

  dataCorretta(data: string) {
    return new Date(data).toLocaleDateString('it-IT');
  }

  onEditDescription() {
    if (!this.perizia) {
      return;
    }
    this.editingDescription = true;
    this.localDescription = this.perizia.descrizione || '';
    this.ajaxErrorMessage = '';
  }

  onCancelDescription() {
    this.editingDescription = false;
    this.localDescription = '';
    this.ajaxErrorMessage = '';
  }

  onSaveDescription() {
    if (!this.perizia) {
      return;
    }
    this.savingDescription = true;
    this.ajaxErrorMessage = '';

    this.perizieService.updatePerizia(this.perizia._id, { descrizione: this.localDescription })?.subscribe({
      next: () => {
        this.perizia.descrizione = this.localDescription;
        this.editingDescription = false;
        this.savingDescription = false;
      },
      error: () => {
        this.ajaxErrorMessage = 'Impossibile salvare la descrizione. Riprovare.';
        this.savingDescription = false;
      },
    });
  }

  onEditComment(index: number) {
    if (!this.perizia?.foto?.[index]) {
      return;
    }
    this.editingFotoIndex = index;
    this.editingComment = this.perizia.foto[index].commento || '';
    this.ajaxErrorMessage = '';
  }

  onCancelComment() {
    this.editingFotoIndex = null;
    this.editingComment = '';
    this.ajaxErrorMessage = '';
  }

  onSaveComment(index: number) {
    if (!this.perizia?.foto?.[index]) {
      return;
    }
    const foto = this.perizia.foto[index];
    if (!foto.publicId) {
      this.ajaxErrorMessage = 'ID foto non disponibile. Impossibile salvare.';
      return;
    }

    this.savingComment = true;
    this.ajaxErrorMessage = '';

    this.perizieService.updateFotoCommento(this.perizia._id, foto.publicId, this.editingComment)?.subscribe({
      next: () => {
        foto.commento = this.editingComment;
        this.editingFotoIndex = null;
        this.editingComment = '';
        this.savingComment = false;
      },
      error: () => {
        this.ajaxErrorMessage = 'Impossibile salvare il commento. Riprovare.';
        this.savingComment = false;
      },
    });
  }
}
