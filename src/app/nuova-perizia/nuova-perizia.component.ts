import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonBackButton, IonSpinner } from "@ionic/angular/standalone";
import { PhotoService } from '../services/photo-service';
import { Geolocation } from '@capacitor/geolocation';
import { Router } from '@angular/router';
import { PerizieService } from '../services/perizie-service';
import { chevronBack } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-nuova-perizia',
  templateUrl: './nuova-perizia.component.html',
  styleUrls: ['./nuova-perizia.component.scss'],
  imports: [IonSpinner, IonBackButton, IonContent,FormsModule]
})
export class NuovaPeriziaComponent {
  constructor() {
    // Registra l'icona per poterla usare nell'HTML
    addIcons({ 'chevron-back': chevronBack });
  }

  perizia = {
    descrizione: '',
    foto: [] as any[]
  };

  private perizieService:PerizieService = inject(PerizieService)
  private photoService:PhotoService = inject(PhotoService)
  private router:Router = inject(Router)
  
  isUploading = false;
  public idPerizia:any

  ngOnInit(){
    this.perizieService.checkToken()?.subscribe({
    next:() => {

    },
    error: (err) => {
      if (err.status === 403) {
        this.router.navigate(['/login']);
      }
    }
  });
  }

  async takePhoto() {
    this.photoService.addNewToGallery()
    this.perizia.foto = this.photoService.photos
  }

  async uploadTotal() {
    this.isUploading = true;
    
    // 1. Recupero GPS automatico
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true, // Su emulatore è meglio false per velocità
      timeout: 30000,            // 10 secondi di attesa prima di dare errore
      maximumAge: 0              // Forza la lettura di una posizione nuova
    });

    console.log(pos)
    
    const payload = {
      username:this.perizieService.username,
      ...this.perizia,
      coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      timestamp: new Date().toISOString()
    };

    // 2. Chiamata al tuo server Express
    this.perizieService.uploadPeriziaCompleto(payload)?.subscribe({
      next: (data:any) => {
        this.isUploading = false;
        console.log(data)
        this.idPerizia = data.codice
        console.log(data)
        console.log(this.idPerizia)
      },
      error: (err) => {
        console.log(err)
        if(err.status == 403)
          this.router.navigate(["/login"])
        this.isUploading = false}
    });
  }

  uploadSinglePhoto(foto: any) {
    console.log("Upload singola foto...", foto);
    console.log(foto)
    this.perizieService.uploadFotoPerizia(foto,this.idPerizia)?.subscribe({
      next:(data:any) => {
        console.log(data)
        foto.uploaded = true
      },
      error: (err) => {
        console.log(err)
        if(err.status == 403)
          this.router.navigate(["/login"])
      }
    })
  }
}
