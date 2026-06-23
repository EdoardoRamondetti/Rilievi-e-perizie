import { Component, inject } from '@angular/core';
import { PerizieService } from '../services/perizie-service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users-management',
  imports: [FormsModule],
  templateUrl: './users-management.html',
  styleUrl: './users-management.css',
})
export class UsersManagement {
  private perizieService = inject(PerizieService);
  private router = inject(Router);

  utenti: any[] = [];
  googleWhitelist: string[] = [];
  loading = false;
  errore = '';
  messaggio = '';

  creatingUser = false;
  updatingWhitelist = false;

  form = {
    username: '',
    nome: '',
    telefono: ''
  };
  nuovoWhitelistUsername = '';
  ultimoUtenteCreato: any | null = null;

  ngOnInit(): void {
    this.caricaDati();
  }

  caricaDati(): void {
    this.loading = true;
    this.errore = '';
    this.messaggio = '';

    this.perizieService.getUtenti()?.subscribe({
      next: (lista:any) => {
        this.utenti = lista;
        this.loading = false;
      },
      error: () => {
        this.router.navigate(["/login"])
        this.loading = false;
      },
    });

    this.perizieService.getGoogleWhitelist()?.subscribe({
      next: (r:any) => (this.googleWhitelist = r.usernames ?? []),
      error: () => (this.googleWhitelist = []),
    });
  }

  creaUtente(): void {
    const username = this.form.username.trim();
    if (!username) {
      this.errore = "Inserisci almeno lo username dell'utente";
      return;
    }

    const payload = {
      username,
      nome: this.form.nome.trim() || undefined,
      telefono: this.form.telefono.trim() || undefined
    };

    this.creatingUser = true;
    this.errore = '';
    this.messaggio = '';
    this.ultimoUtenteCreato = null;

    this.perizieService.createUtente(payload)?.subscribe({
      next: (r:any) => {
        this.creatingUser = false;
        this.ultimoUtenteCreato = r;
        this.messaggio = 'Utente creato correttamente';
        this.form = { username: '', nome: '', telefono: ''};
        this.caricaDati();
      },
      error: (err:any) => {
        console.log(err)
        this.creatingUser = false;
        this.errore = err?.error ?? "Impossibile creare il nuovo utente";
      },
    });
  }

  aggiungiAWhitelistGoogle(): void {
    const username = this.nuovoWhitelistUsername.trim();
    if (!username) {
      this.errore = 'Inserisci uno username/email Google valido';
      return;
    }

    this.updatingWhitelist = true;
    this.errore = '';
    this.messaggio = '';

    this.perizieService.aggiungiGoogleWhitelist(username)?.subscribe({
      next: (r:any) => {
        this.updatingWhitelist = false;
        this.googleWhitelist = r.usernames ?? [];
        this.nuovoWhitelistUsername = '';
        this.messaggio = 'Whitelist Google aggiornata';
      },
      error: (err:any) => {
        this.updatingWhitelist = false;
        this.errore =
          err?.error?.message ?? 'Errore durante aggiornamento whitelist Google';
      },
    });
  }

  tornaDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
