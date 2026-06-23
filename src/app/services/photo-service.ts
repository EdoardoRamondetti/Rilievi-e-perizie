import { inject, Injectable } from '@angular/core';
import { Camera, CameraDirection } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { HttpClient } from '@angular/common/http'; // Aggiunto per upload

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  private platform: Platform = inject(Platform);
  private http: HttpClient = inject(HttpClient); // Per invio al server

  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';

  public async addNewToGallery() {
    // Usiamo Camera.takePhoto come nel tuo originale
    const capturedPhoto = await Camera.takePhoto({
      cameraDirection: CameraDirection.Rear, // Modificato in Rear per perizie
      quality: 70 // Ridotta per Base64 leggero
    });

    // Salviamo e otteniamo i dati estesi (incluso Base64)
    const savedImageFile: UserPhoto = await this.savePicture(capturedPhoto.webPath!);

    // Aggiungiamo all'inizio dell'array
    this.photos.unshift(savedImageFile);

    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  private async savePicture(webPath: string): Promise<UserPhoto> {
  let base64Data: string;

  if (this.platform.is("hybrid")) {
    // --- CORREZIONE QUI ---
    // Rimuoviamo il prefisso virtuale di Capacitor per ottenere il path reale
    const realPath = webPath.replace('https://localhost/_capacitor_file_', '')
                           .replace('http://localhost/_capacitor_file_', '');

    const file = await Filesystem.readFile({ 
      path: realPath // Ora gli passiamo il percorso "pulito"
    });
    base64Data = file.data as string;
    // -----------------------
  } else {
    const response = await fetch(webPath);
    const blob = await response.blob();
    base64Data = (await this.convertBlobToBase64(blob)) as string;
  }

  const uniqueId = Date.now().toString() + Math.random().toString(36).substring(2, 7);

  const fileName = Date.now() + '.jpeg';
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Data
  });

  return {
    filepath: this.platform.is("hybrid") ? savedFile.uri : fileName,
    webviewPath: this.platform.is("hybrid") ? Capacitor.convertFileSrc(savedFile.uri) : webPath,
    base64ForServer: base64Data,
    commento: '',
    id: uniqueId,
    uploaded: false
  };
}

  public uploadSinglePhoto(photo: UserPhoto) {
    return this.http.post("https://localhost:3000/api/uploadFoto", {
      image: photo.base64ForServer,
      commento: photo.commento
    });
  }

  private convertBlobToBase64(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

    public async loadSaved() {
    // Retrieve cached photo array data
    const { value: photoList } = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = (photoList ? JSON.parse(photoList) : []) as UserPhoto[];

    if(!this.platform.is("hybrid")){
      for (let photo of this.photos) {
        // Read each saved photo's data from the Filesystem
        const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });

        // Web platform only: Load the photo as base64 data
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
        }
    }
  }

  public async deletePhoto(photo: UserPhoto, position: number) {
    // Remove this photo from the Photos reference data array
    this.photos.splice(position, 1);

    // Update photos array cache by overwriting the existing photo array
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });

    // Delete photo file from filesystem
    const filename = photo.filepath.slice(photo.filepath.lastIndexOf('/') + 1);

    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data,
    });
  }
}

// Interfaccia aggiornata con i campi necessari alla tua app
export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
  base64ForServer?: string; // Dati per il DB
  commento: string;        // Descrizione foto
  id:string;
  uploaded: boolean;        // Stato invio
}