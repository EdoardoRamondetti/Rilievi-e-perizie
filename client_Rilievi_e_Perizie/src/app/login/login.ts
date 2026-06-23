import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PerizieService } from '../services/perizie-service';
import { AdminAuthService } from '../services/admin-auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private perizieService = inject(PerizieService);
  private router = inject(Router)
  private adminAuth = inject(AdminAuthService);

  username = 'admin@azienda.it';
  password = 'password';
  loading  = false;
  errore   = '';

   login() {
    // Validazione base lato client
    if (!this.username.trim() || !this.password.trim()) {
      this.errore = 'Inserisci email e password';
      return;
    }
 
    this.loading = true;
    this.errore  = '';
 
    this.perizieService.login(this.username.trim(), this.password)?.subscribe({
      next: (risposta: any) => {
        this.loading = false;
 
        // Solo gli admin possono usare questa applicazione
        if (risposta.role !== 'admin') {
          this.errore = 'Accesso riservato all\'amministratore';
          this.adminAuth.clear();
          this.perizieService.logout()?.subscribe();
          return;
        }
 
        this.adminAuth.setAdminAuthenticated(true);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.loading = false;
        this.adminAuth.clear();
        this.errore  = err.error ?? 'Credenziali non valide';
      }
    });
  }

  // Permette di confermare il form premendo Invio
  onEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') this.login();
  }
}
