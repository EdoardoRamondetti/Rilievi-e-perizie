//A.  Import delle librerie
import http from "http";
import url from "url";
import fs from "fs";
import express, { CookieOptions } from "express";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import queryStringParser from "./queryStringParser";
import cors from "cors";
import https from "https";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";
import path from "path";
import fileManager from "./fileManager";

// Carica subito il file .env per evitare variabili undefined all'avvio
dotenv.config({
    path: ".env"
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const app: express.Express = express();

// ── MIDDLEWARE CORS UNIFICATO (Inserito subito a monte per evitare conflitti) ──
// Sostituisci il vecchio blocco app.use((req, res, next) => { ... }) con questo:
app.use(cors({
    origin: (origin, callback) => {
        // Accetta l'origine dell'app (http://localhost o https://localhost) o chiamate senza origine (es. Postman)
        if (!origin || origin.includes("localhost")) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // 👈 FONDAMENTALE per i cookie
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
}));

app.use((req, res, next) => {
    // Permette al popup di Google di comunicare con la tua app
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp"); // Opzionale, ma aiuta con gli iframe
    next();
});

app.use(cookieParser());

const connectionString = process.env.connectionStringLocal;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || "3000");
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3001"); // Porta di fallback per HTTP
const googleOAuth = JSON.parse(process.env.googleOAuth || "{}");
const dbName = process.env.dbName;

//C.  Lettura pagina di errore statica
let paginaErrore: string = "";
fs.readFile("./static/error.html", function (err, content) {
    if (err) {
        paginaErrore = "<h1> Risorsa non trovata </h1>";
    } else {
        paginaErrore = content.toString();
    }
});

// Chiavi SSL per HTTPS
const privateKey = fs.readFileSync("keys/privateKey.pem", "utf8");
const certificate = fs.readFileSync("keys/certificate.crt", "utf8");
const credentials = { "key": privateKey, "cert": certificate };
const jwtKey = fs.readFileSync("keys/jwtKey", "utf-8");

// ── AVVIO SERVER HTTPS ──
let httpsServer = https.createServer(credentials, app);
httpsServer.listen(HTTPS_PORT, "0.0.0.0", function () {
    console.log("🚀 Server in ascolto sulla porta HTTPS: " + HTTPS_PORT);
});

// ── AVVIO SERVER HTTP (Aggiunto per lo sviluppo con l'emulatore) ──
let httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, "0.0.0.0", function () {
    console.log("🔓 Server in ascolto sulla porta HTTP (senza SSL): " + HTTP_PORT);
});

//D.  Middleware standard
// 1. Request Log
app.use("/", function (req, res, next) {
    console.log(req.method + ": " + req.originalUrl);
    next();
});

// 2. Gestione risorse statiche
app.use("/", express.static("./static"));

// 3. Lettura dei parametri post
app.use("/", express.json({ "limit": "5mb" }));

// 4. Parsing dei parametri GET
app.use("/", queryStringParser);

// 5. Log dei parametri 
app.use("/", function (req: any, res, next) {
    if (req["parsedQuery"] && Object.keys(req["parsedQuery"]).length > 0)
        console.log("   Parametri Query: " + JSON.stringify(req["parsedQuery"]));
    if (req["body"] && Object.keys(req["body"]).length > 0)
        console.log("   Parametri Body: " + JSON.stringify(req["body"]));
    next();
});

// 6. Parsing dei cookies

// D2. Gestione login e token
// ATTENZIONE: 'secure' ora si disattiva dinamicamente se la chiamata arriva in HTTP normale

// D2. Gestione login e token
// Sostituisci il vecchio blocco statico con questa funzione dinamica
const cookiesOptions: CookieOptions = {
    "path": "/", 
    "httpOnly": true, 
    "secure": false,      // 👈 OBBLIGATORIO: Deve essere false, altrimenti in HTTP il cookie viene scartato
    "maxAge": parseInt(process.env.DURATA_TOKEN || "3600") * 1000, 
    "sameSite": "lax"     // 👈 OBBLIGATORIO: In HTTP non è permesso "none". "lax" permette il salvataggio locale
};

// 1. Servizio di Login/Logout/Signup
app.post("/api/login", async function (req, res, next) {
    const username: string = req.body.username?.toLowerCase().trim();
    const password: string = req.body.password;
    const ERRORE_GENERICO = "Credenziali non valide";

    if (username === process.env.ADMIN_USERNAME?.toLowerCase().trim()) {
        bcrypt.compare(password, process.env.ADMIN_PASSWORD!, function (err, ok) {
            if (err) {
                res.status(500).send("bcrypt execution error");
                console.log(err?.stack);
            } else {
                if (!ok)
                    return res.status(401).send(ERRORE_GENERICO);
                else {
                    const TOKEN = createToken({ _id: "admin", username, role: "admin" });
                    res.cookie("TOKEN", TOKEN, cookiesOptions);
                    res.send({ username, role: "admin" });
                }
            }
        });
        return; 
    }
});

app.post("/api/auth/login", async function (req, res, next) {
    const username: string = req.body.username?.toLowerCase().trim();
    const password: string = req.body.password;
    const ERRORE_GENERICO = "Credenziali non valide";

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const collection = client.db(dbName).collection("utenti");
    const cmd = collection.findOne({ username });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    });
    cmd.then(function (dbUser) {
        if (!dbUser)
            return res.status(401).send(ERRORE_GENERICO);

        bcrypt.compare(password, dbUser.password, function (err, ok) {
            if (err) {
                res.status(500).send("Errore interno del server");
                console.log(err?.stack);
            } else {
                if (!ok)
                    res.status(401).send(ERRORE_GENERICO);
                else {
                    const TOKEN = createToken({ ...dbUser, role: "operatore" });
                    res.cookie("TOKEN", TOKEN, cookiesOptions);
                    res.send({ username, role: "operatore" });
                }
            }
        });
    });
    cmd.finally(function () {
        client.close();
    });
});

app.post("/api/loginWithGoogle", async function(req, res, next) {
    const googleToken: any = req.body.googleToken;
    const payloadGoogleToken: any = jwt.decode(googleToken);
    console.log("googleToken :" + payloadGoogleToken);
    const userEmail = payloadGoogleToken.email;
    try {
        const whitelistPath = path.join(__dirname, 'allowed_users.txt');
        const fileContent = fs.readFileSync(whitelistPath, 'utf-8');
        const authorizedUsers = fileContent.split(/\r?\n/).map(email => email.trim().toLowerCase());

        if (!authorizedUsers.includes(userEmail.toLowerCase())) {
            console.log(`Accesso negato per: ${userEmail}`);
            return res.status(403).send("Utente non autorizzato nel sistema.");
        }

        const client = new MongoClient(connectionString!);
        await client.connect();
        const collection = client.db(dbName).collection("mails");
        
        let dbUser = await collection.findOne({ username: userEmail });

        if (!dbUser) {
            const newUser: any = {
                username: userEmail,
                authMethod: "google",
                lastLogin: new Date(),
                mail: []
            };
            const mongoResponse = await collection.insertOne(newUser);
            newUser._id = mongoResponse.insertedId.toString();
            dbUser = newUser;
        }

        let TOKEN = createToken(dbUser); 
        
        res.cookie("TOKEN", TOKEN, {
            ...cookiesOptions,
            maxAge: 1000 * 60 * 60 * 24 * 365 // 1 anno
        });

        res.send({ "ris": "ok", "username": userEmail });
        await client.close();

    } catch (err) {
        console.error("Errore login Google:", err);
        res.status(401).send("Token Google non valido o errore server");
    }
});

function sendGmail(email: any, password: string) {
    let message = fs.readFileSync("./message.html","utf-8");
    message = message.replace("__user", email);
    message = message.replace("__password", password);
    const transporter = nodemailer.createTransport({
        "service": "gmail",
        "auth": googleOAuth
    });
    const mailOption = {
        "from": googleOAuth.user,
        "to": email,
        "subject": "Nuovo account rilievi e perizie",
        "html": message,
        "attachments": [{
            "filename": "qrCode.png",
            "path": "./qrCode.png"
        }]
    };
    transporter.sendMail(mailOption, function(err: any, info: any){
        if(err){
            console.log(err.stack);
        } else {
            console.log(info);
            transporter.close();
        }
    });
}

app.post("/api/signUp", async function (req: any, res, next) {
    const username = req.body.username;
    const password = req.body.password;
    const currentCollection = "mails";
    let hashedPassword = "";

    try {
        hashedPassword = await bcrypt.hash(password, 10);
    } catch (error) {
        return res.status(500).send("Errore durante la generazione dell'hash");
    }

    const client = new MongoClient(connectionString!);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(currentCollection);

        const userExists = await collection.findOne({ "username": username });
        if (userExists) {
            return res.status(409).send("Username già utilizzato");
        }

        const newUser = {
            "username": username,
            "password": hashedPassword,
            "oldPass": password,
            "mail": []
        };

        const result = await collection.insertOne(newUser);
        res.status(200).send(result);

    } catch (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    } finally {
        await client.close();
    }
});

app.post("/api/logout", async function (req: any, res, next) {
    const options = {
        ...cookiesOptions, maxAge: -1
    };
    res.cookie("TOKEN", "", options);
    res.send({ "ok": 1 });
});

// 2. Controllo TOKEN (Usa la rotta jolly per proteggere le API)
app.use("/api/", function (req: any, res, next) {
    if (!req.cookies || !req.cookies.TOKEN)
        res.status(403).send("Token mancante");
    else {
        const TOKEN = req.cookies.TOKEN;
        jwt.verify(TOKEN, jwtKey, function (err: any, payload: any) {
            if (err) {
                console.log("Token non valido o scaduto");
                res.status(403).send("Token non valido o scaduto");
            } else {
                let newToken = createToken(payload);
                res.cookie("TOKEN", newToken, cookiesOptions);
                req["username"] = payload.username;
                req["role"] = payload.role;
                next();
            }
        });
    }
});

//E.  Gestione delle risorse dinamiche
app.patch("/api/perizie/uploudaFotoSingola", async function (req, res, next) {
    const foto = req.body.foto;
    const id = req.body.id;

    if (!id) {
        return res.status(400).send("esegui prima la perizia");
    }

    const client = new MongoClient(connectionString!);
    
    try {
        await client.connect();
        const collection = client.db(dbName).collection("perizie");

        const cloudinaryUrl = await fileManager.saveBase64Cloudinary(foto.base64ForServer);

        const result = await collection.updateOne(
            { "codice": id }, 
            { 
                $push: { 
                    "foto": { 
                        url: cloudinaryUrl, 
                        commento: foto.commento 
                    } 
                } as any 
            }
        );

        if (result.matchedCount === 0) {
            res.status(404).send("Nessuna perizia trouvata con questo codice");
        } else {
            res.send({ "res": "ok", "url": cloudinaryUrl });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send("Errore server: " + err);
    } finally {
        await client.close();
    }
});

app.get("/api/check-token", (req, res, next) => {
    res.status(200).send({ status: "valid" });
});

app.get("/api/utenti", async function (req, res, next) {
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const collection = client.db(dbName).collection("utenti");
    const cmd = collection.find({}).toArray();
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    });
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.finally(function () {
        client.close();
    });
});

app.get("/api/perizie", async function (req, res, next) {
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });

    const filtro: any = {};
    if (req.query.operatore) {
        filtro.operatore = req.query.operatore;
    }

    const collection = client.db(dbName).collection("perizie");
    const cmd = collection.find(filtro).toArray();
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    });
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.finally(function () {
        client.close();
    });
});

app.patch("/api/perizie/:id", async function (req, res, next) {
    const id = req.params.id;
    const descrizione = req.body.descrizione;
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });

    const collection = client.db(dbName).collection("perizie");
    const cmd = collection.updateOne({"_id": new ObjectId(id)}, {$set: {descrizione}});
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    });
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.finally(function () {
        client.close();
    });
});

app.post("/api/perizie/nuova", async function (req, res, next) {
    const foto = req.body.foto;
    const descrizione = req.body.descrizione;
    const cordinate = req.body.coords;
    const dataOra = req.body.timestamp;
    const username = req.body.username;

    let fotoConLink = [];

    // 1. Caricamento immagini su Cloudinary
    try {
        if (foto && foto.length > 0) {
            fotoConLink = await Promise.all(foto.map(async (fotografia: any) => {
                const cloudinaryUrl = await fileManager.saveBase64Cloudinary(fotografia.base64ForServer);
                return {
                    url: cloudinaryUrl,
                    commento: fotografia.commento,
                    publicId: fotografia.id
                };
            }));
        }
    } catch (uploadErr) {
        console.error("❌ Errore Cloudinary:", uploadErr);
        res.status(500).send("Errore durante il salvataggio delle immagini");
        return; // Blocca l'esecuzione qui
    }

    // 2. Connessione e scrittura su MongoDB
    const client = new MongoClient(connectionString!);

    try {
        await client.connect();
    } catch (connErr) {
        console.error("❌ Errore connessione DB:", connErr);
        res.status(503).send("Errore di connessione al Database");
        return; // Blocca l'esecuzione
    }

    try {
        const nuovoCodice = await getNextSequenceValue(client, dbName, "perizia_id");
        const collection = client.db(dbName).collection("perizie");

        // 🔥 ORA METTIAMO L'AWAIT QUI: Aspetta che il DB abbia scritto davvero!
        await collection.insertOne({
            "descrizione": descrizione,
            "coordinate": cordinate,
            "dataOra": dataOra,
            "operatore": username,
            "foto": fotoConLink,
            "codice": nuovoCodice
        });

        // Risposta di successo inviata SOLO se tutto è andato a buon fine
        res.send({ "codice": nuovoCodice });

    } catch (dbErr) {
        console.error("❌ Errore esecuzione query:", dbErr);
        res.status(500).send("Errore esecuzione query: " + dbErr);
    } finally {
        // Il blocco finally si esegue SEMPRE, garantendo la chiusura del client senza rompere la risposta HTTP
        await client.close();
    }
});

async function getNextSequenceValue(client: any, dbName: any, sequenceName: any) {
    const collection = client.db(dbName).collection("counters");
    const result = await collection.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { seq: 1 } },
        { returnDocument: 'after' }
    );
    const sequenceNumber = result.seq;
    const formattedNumber = sequenceNumber.toString().padStart(3, '0');
    return `PER-${formattedNumber}`;
}

app.patch("/api/perizie/:id/foto/:idFoto", async function (req, res, next) {
    const id = req.params.id;
    const idFoto = req.params.idFoto;
    const commento = req.body.commento;
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });

    const collection = client.db(dbName).collection("perizie");
    const cmd = collection.updateOne({"_id": new ObjectId(id), "foto.publicId": idFoto}, {$set: {
        "foto.$.commento": commento
    }});
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    });
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.finally(function () {
        client.close();
    });
});

app.post("/api/utenti", async function (req: any, res, next) {
    const { username, nome, telefono } = req.body;

    if (!username || typeof username !== "string")
        return res.status(400).send("Username obbligatorio");

    const usernameNorm = username.toLowerCase().trim();
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });

    const collection = client.db(dbName).collection("utenti");
    const esistente = await collection.findOne({ username: usernameNorm });
    if (esistente) {
        client.close();
        return res.status(409).send("Utente già esistente");
    }

    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let passwordGenerata = "";
    for (let i = 0; i < 10; i++) {
        passwordGenerata += charset[Math.floor(Math.random() * charset.length)];
    }

    const hashedPassword = bcrypt.hashSync(passwordGenerata, 10);
    const nuovoUtente = {
        username: usernameNorm,
        password: hashedPassword,
        info: {
            nome: nome ?? "",
            telefono: telefono ?? ""
        }
    };

    const cmd = collection.insertOne(nuovoUtente);
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    });
    cmd.then(function () {
        sendGmail(usernameNorm, passwordGenerata);
        res.send({
            user: { username: usernameNorm },
            temporaryPassword: passwordGenerata,
            emailSent: true
        });
    });
    cmd.finally(function () {
        client.close();
    });
});

app.get("/api/utenti/whitelist-google", async function (req: any, res, next) {
    const usernames: string[] = fs.existsSync("./allowed_users.txt")
        ? fs.readFileSync("./allowed_users.txt", "utf-8")
            .split("\n").map(l => l.trim().toLowerCase()).filter(Boolean)
        : [];
    res.send({ usernames });
});

app.post("/api/utenti/whitelist-google", async function (req: any, res, next) {
    const username = req.body.username;
    if (!username)
        return res.status(400).send("Username obbligatorio");

    const usernameNorm = username.toLowerCase().trim();
    const attuali: string[] = fs.existsSync("./allowed_users.txt")
        ? fs.readFileSync("./allowed_users.txt", "utf-8")
            .split("\n").map(l => l.trim().toLowerCase()).filter(Boolean)
        : [];

    if (!attuali.includes(usernameNorm)) {
        attuali.push(usernameNorm);
        fs.writeFileSync("./allowed_users.txt", attuali.join("\n"));
    }
    res.send({ usernames: attuali });
});

//F. Default root e gestione degli errori
app.use("/", function (req, res, next) {
    if (req.originalUrl.startsWith("/api/")) {
        res.status(404).send("Risorsa non trovata");
    } else if (req.accepts("html")) {
        res.status(404).send(paginaErrore);
    } else
        res.sendStatus(404);
});

//G. Gestione degli errori globale
app.use("/", function (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
    res.status(500).send(err.message);
    console.log("******** ERRORE ********: \n" + err.stack);
});

function createToken(data: any) {
    const now = Math.floor(((new Date()).getTime() / 1000));
    const payload = {
        "_id":      data._id,
        "username": data.username,
        "role":     data.role ?? "operatore",
        "iat":      data.iat || now,
        "exp":      now + parseInt(process.env.DURATA_TOKEN || "3600")
    };
    const token = jwt.sign(payload, jwtKey);
    console.log("Creato nuovo TOKEN", token);
    return token;
}