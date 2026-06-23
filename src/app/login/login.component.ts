import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonSpinner } from "@ionic/angular/standalone";
import { PerizieService } from '../services/perizie-service';
import { environment } from 'src/environments/environment';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [FormsModule, IonSpinner, IonInput, IonContent],
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  private perizieService: PerizieService = inject(PerizieService);
  private router: Router = inject(Router);

  ngOnInit() {
    // Inizializzazione del plugin nativo per Android/iOS
    try {
      GoogleAuth.initialize({
        clientId: environment.googleClientId,
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      console.log("✅ Google Auth Nativo Inizializzato con successo");
    } catch (err) {
      console.error("❌ Errore durante l'inizializzazione di Google Auth:", err);
    }
  }

  // Login standard con Username e Password
  async onLogin() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Inserisci username e password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.perizieService.login(this.username, this.password)?.subscribe({
      next: (risposta: any) => {
        console.log("Login standard eseguito:", risposta);
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        console.error(err);
        this.errorMessage = 'Login fallito. Riprova.';
        this.isLoading = false;
      }
    });
  }

  // Nuovo Login Nativo con Google (Evita la pagina bianca e Chrome esterno)
  async onGoogleLogin() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Apre la tendina nativa di Android "Scegli un account"
      const googleUser = await GoogleAuth.signIn();
      console.log("Dati utente ricevuti da Google:", googleUser);

      const googleToken = googleUser.authentication.idToken;

      if (!googleToken) {
        this.errorMessage = "Impossibile recuperare il token di sicurezza da Google";
        this.isLoading = false;
        return;
      }

      // Invio del token al tuo backend Express (gestione cookie HTTP-only)
      this.perizieService.doLoginWithGoogle(googleToken)?.subscribe({
        next: (res: any) => {
          this.perizieService.username = res.username;
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (error: any) => {
          console.error("Errore backend durante login Google:", error);
          this.isLoading = false;
          if (error.status === 403) {
            this.errorMessage = error.error;
          } else {
            alert("Errore " + error.status + ": " + error.error);
          }
        }
      });

    } catch (err: any) {
      this.isLoading = false;
      console.warn("Flusso di login interrotto o fallito:", err);
      // Se l'utente chiude la tendina cliccando fuori, non mostriamo un errore aggressivo
      if (err.message !== 'user cancelled login' && err.toString() !== 'Error: user cancelled login') {
        this.errorMessage = "Errore durante l'accesso con Google";
      }
    }
  }

  dismissError() {
    this.errorMessage = '';
  }
}