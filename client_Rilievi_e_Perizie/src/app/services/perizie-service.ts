import { inject, Injectable } from '@angular/core';
import { DataStorageService } from './data-storage-service';

@Injectable({
  providedIn: 'root',
})
export class PerizieService {
  private ds = inject(DataStorageService);

  // ---------------- AUTH ----------------
  login(username: string, password: string) {
    return this.ds.inviaRichiesta("post", "/login", { username, password });
  }

  logout() {
    return this.ds.inviaRichiesta("post", "/logout");
  }

  getGoogleWhitelist(){
    return this.ds.inviaRichiesta('get','/utenti/whitelist-google');
  }

  aggiungiGoogleWhitelist(username: string){
    return this.ds.inviaRichiesta('post','/utenti/whitelist-google',{ username });
  }

  // ---------------- UTENTI ----------------
  getUtenti() {
    return this.ds.inviaRichiesta("get", "/utenti");
  }

  createUtente(data: any) {
    return this.ds.inviaRichiesta("post", "/utenti", data);
  }

  // ---------------- PERIZIE ----------------
  getPerizie(operatore?: string) {
    return this.ds.inviaRichiesta("get", "/perizie", operatore ? { operatore } : {});
  }

  getPerizia(id: string) {
    return this.ds.inviaRichiesta("get", `/perizie/${id}`);
  }

  updatePerizia(id: string, descrizione: any) {
    return this.ds.inviaRichiesta("patch", `/perizie/${id}`, descrizione);
  }

  updateFotoCommento(periziaId: string, fotoId: string, commento: string) {
    return this.ds.inviaRichiesta("patch", `/perizie/${periziaId}/foto/${fotoId}`, { commento });
  }
}
