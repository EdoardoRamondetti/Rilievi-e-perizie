import { inject, Injectable } from '@angular/core';
import { DataStorage } from './data-storage';

@Injectable({
  providedIn: 'root',
})
export class PerizieService {
  public username:string = ""
  private dataStorage:DataStorage = inject(DataStorage)

  login(username: string, password: string){
    this.username = username
    return this.dataStorage.inviaRichiesta("post", "/auth/login", { username, password });
  }

  logout() {
    return this.dataStorage.inviaRichiesta("post", "/logout");
  }

  doLoginWithGoogle(token:string){
    return this.dataStorage.inviaRichiesta("POST","/loginWithGoogle",{"googleToken":token})
  }

  uploadPeriziaCompleto(payload:any) {
    console.log(payload)
    return this.dataStorage.inviaRichiesta("POST", "/perizie/nuova", payload);
  }

  uploadFotoPerizia(foto:any,id:any){
    console.log("entrato")
    console.log(typeof id)
    console.log(id)
    return this.dataStorage.inviaRichiesta("PATCH","/perizie/uploudaFotoSingola",{foto,id})
  }

  checkToken() {
    return this.dataStorage.inviaRichiesta("GET", "/check-token");
  }
}
