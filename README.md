# Rilievi e Perizie

Sistema per la gestione digitale di rilievi e perizie sul campo, composto da tre applicazioni che lavorano insieme:

- **App mobile (Ionic/Angular)** — usata dagli operatori sul campo per creare nuove perizie, scattare foto e geolocalizzarle.
- **Dashboard amministrativa (Angular + MapLibre)** — usata dagli amministratori per visualizzare su mappa le perizie raccolte, gestirne i dettagli e amministrare gli utenti.
- **Server API (Node.js + Express + MongoDB)** — backend comune che gestisce autenticazione, persistenza dei dati e upload delle foto su Cloudinary.

## Struttura del repository

```
.
├── src/                          # App mobile Ionic/Angular (operatori sul campo)
│   └── app/
│       ├── login/                # Login standard e login con Google (nativo via Capacitor)
│       ├── dashboard/             # Home dell'operatore, avvio nuova perizia
│       ├── nuova-perizia/         # Creazione perizia: descrizione, foto, GPS, upload
│       └── services/              # Servizi HTTP, gestione foto (Capacitor Camera/Filesystem)
│
├── client_Rilievi_e_Perizie/      # Dashboard web Angular (amministratori)
│   └── src/app/
│       ├── login/                  # Login amministratore
│       ├── dashboard/               # Layout con sidebar (aside) e router-outlet
│       ├── map.component/          # Mappa interattiva (MapLibre) con marker delle perizie
│       ├── details-perizia/        # Pannello di dettaglio di una singola perizia
│       ├── users-management/       # Gestione utenti e whitelist Google
│       ├── guards/                  # Guardia di rotta per l'area admin
│       └── services/                # Chiamate API, gestione mappa (MapLibre/MapTiler)
│
└── server_Rilievi_e_Perizie/      # Backend Express comune a entrambe le app
    ├── server.ts                   # Server HTTP/HTTPS, rotte API, autenticazione JWT
    ├── fileManager.ts              # Upload immagini su Cloudinary
    └── queryStringParser.ts        # Middleware di parsing dei parametri query
```

> Nota: la cartella `src/` (app Ionic) non include i file di configurazione di progetto (`package.json`, `angular.json`, `ionic.config.json`, `capacitor.config.ts`), che non risultano presenti in questo repository. Per eseguirla è necessario disporre di tali file o rigenerarli con `ionic start`/`ng add @ionic/angular` e copiare il contenuto di `src/` nel progetto risultante (vedi sezione [App mobile](#app-mobile-ioniangular)).

## Funzionalità principali

### App mobile (operatore)
- Login con username/password oppure login nativo con Google (Capacitor Google Auth), con whitelist email lato server.
- Creazione di una nuova perizia con descrizione testuale.
- Acquisizione foto tramite fotocamera del dispositivo (Capacitor Camera) con salvataggio locale (Filesystem/Preferences).
- Rilevamento automatico della posizione GPS al momento dell'invio (Capacitor Geolocation).
- Invio della perizia completa al server e possibilità di caricare foto aggiuntive singolarmente in un secondo momento.

### Dashboard web (amministratore)
- Login amministratore con verifica della sessione lato server.
- Mappa interattiva (MapLibre GL + stili MapTiler) con marker per ogni perizia geolocalizzata e per la sede aziendale.
- Calcolo e visualizzazione di percorsi tra punti (instradamento via OSRM).
- Pannello di dettaglio della perizia: descrizione, operatore, data, foto e commenti.
- Gestione utenti: creazione nuovo operatore (con invio automatico delle credenziali via email) e gestione della whitelist degli account Google autorizzati.

### Server API
- Autenticazione basata su cookie JWT (`httpOnly`), con middleware di verifica su tutte le rotte `/api/*`.
- Login classico (bcrypt) e login Google (Google Auth Library) con controllo whitelist.
- Creazione utenti con password temporanea generata automaticamente e inviata via email (Nodemailer).
- CRUD delle perizie su MongoDB, con numerazione sequenziale automatica (`PER-001`, `PER-002`, …).
- Upload delle foto delle perizie su Cloudinary (sia in blocco alla creazione, sia singolarmente in seguito).
- Server avviato sia in HTTP che in HTTPS (per supportare emulatori/dispositivi in sviluppo).

## Stack tecnologico

| Componente | Tecnologie principali |
|---|---|
| App mobile | Ionic, Angular (standalone components), Capacitor (Camera, Filesystem, Geolocation, Preferences, Google Auth) |
| Dashboard web | Angular 20, MapLibre GL JS, MapTiler, Axios |
| Server | Node.js, Express 5, TypeScript, MongoDB driver, JWT, bcryptjs, Cloudinary, Nodemailer, Socket.io |

## Prerequisiti

- Node.js (versione LTS recente) e npm
- Un'istanza MongoDB raggiungibile (locale o cloud, es. MongoDB Atlas)
- Un account [Cloudinary](https://cloudinary.com/) per l'hosting delle immagini
- Un progetto su [Google Cloud Console](https://console.cloud.google.com/) con OAuth Client ID configurato (per il login Google)
- Un account Gmail con [App Password](https://support.google.com/accounts/answer/185833) per l'invio email tramite Nodemailer
- Per la dashboard web: una API key [MapTiler](https://www.maptiler.com/) (attualmente impostata direttamente nel codice di `map.service.ts`)
- Per l'app mobile: Ionic CLI (`npm install -g @ionic/cli`) e, per build native, Android Studio / Xcode

## Configurazione del server

Il server legge la configurazione da un file `.env` nella cartella `server_Rilievi_e_Perizie/`. Crea il file con le seguenti variabili:

```env
# Porte di ascolto
HTTPS_PORT=3000
HTTP_PORT=3001

# Database
connectionStringLocal=mongodb://localhost:27017
dbName=rilieviPerizie

# Autenticazione admin "rapida" (vedi rotta /api/login)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<hash_bcrypt_della_password>

# JWT
DURATA_TOKEN=3600

# Google OAuth (login con Google)
GOOGLE_CLIENT_ID=<client_id_google>

# Credenziali SMTP per l'invio email (Nodemailer, formato JSON)
googleOAuth={"user":"tuamail@gmail.com","pass":"app_password"}

# Cloudinary (formato JSON)
cloudinary={"cloud_name":"...","api_key":"...","api_secret":"..."}
```

Il server richiede inoltre, nella cartella `server_Rilievi_e_Perizie/keys/`, i seguenti file (non versionati per motivi di sicurezza):

- `privateKey.pem` e `certificate.crt` — certificato SSL per l'avvio in HTTPS (può essere autofirmato in sviluppo)
- `jwtKey` — chiave segreta usata per firmare i token JWT

È inoltre presente un file `allowed_users.txt` (whitelist delle email Google autorizzate ad accedere), gestibile anche dalla dashboard web nella sezione "Gestione utenti".

### Avvio del server

```bash
cd server_Rilievi_e_Perizie
npm install
npm start
```

Il server si avvia in parallelo su due porte: una in HTTPS (`HTTPS_PORT`, default 3000) e una in HTTP (`HTTP_PORT`, default 3001), quest'ultima pensata per semplificare lo sviluppo con emulatori.

## App mobile (Ionic/Angular)

Il codice sorgente dell'app si trova nella cartella `src/`, ma il repository non include i file di progetto root (`package.json`, `angular.json`, `ionic.config.json`, `capacitor.config.ts`). Per eseguirla:

1. Genera un nuovo progetto Ionic/Angular standalone:
   ```bash
   ionic start rilievi-perizie-app blank --type=angular
   ```
2. Sostituisci la cartella `src/` generata con quella presente in questo repository.
3. Installa le dipendenze usate dal codice (oltre a quelle base di Ionic/Angular):
   ```bash
   npm install @codetrix-studio/capacitor-google-auth @capacitor/camera @capacitor/filesystem @capacitor/preferences @capacitor/geolocation
   ```
4. Configura il `googleClientId` in `src/environments/environment.ts` (e `environment.prod.ts`) con il tuo Client ID OAuth Google.
5. Verifica che l'URL del backend in `src/app/services/data-storage.ts` (`REST_API_SERVER`) punti al server Express in esecuzione (default `http://localhost:3001/api`).
6. Avvia in modalità browser:
   ```bash
   ionic serve
   ```
   oppure, per testare le funzionalità native (fotocamera, GPS, login Google) su un dispositivo/emulatore:
   ```bash
   ionic capacitor add android   # o ios
   ionic capacitor run android
   ```

## Dashboard amministrativa (Angular)

```bash
cd client_Rilievi_e_Perizie
npm install
npm start
```

L'applicazione si avvia con `ng serve` sulla porta predefinita di Angular (`http://localhost:4200`). Anche qui l'URL del backend è impostato in `src/app/services/data-storage-service.ts` (`REST_API_SERVER`, default `http://localhost:3001/api`).

Per la build di produzione:

```bash
npm run build
```

## Note di sicurezza

- Le chiavi SSL, la chiave JWT, il file `.env` e `allowed_users.txt` **non vanno versionati** e contengono informazioni sensibili.
- La password amministratore (`ADMIN_PASSWORD`) deve essere salvata come hash bcrypt, non in chiaro.
- Le credenziali Cloudinary, Google OAuth e SMTP vanno trattate come segreti e gestite tramite variabili d'ambiente o un secret manager in produzione.

## Licenza

Da definire.
