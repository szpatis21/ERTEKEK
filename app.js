//FÜGGŐSÉGEK

const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./modulok/dbmodul');

require('dotenv').config();
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY hiányzik');
if (!process.env.SECRET_KEY) throw new Error('SECRET_KEY hiányzik');
const app = express();
const port = 3000;
const fs = require('fs');
const logFilePath = path.join(__dirname, 'logi', 'minden_log.txt');

// Hozzunk létre egy "stream"-et, ami folyamatosan nyitva tartja a fájlt
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Térítsük el a console.log-ot:
console.log = (...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    const logMessage = `[${timestamp}] [LOG]: ${message}\n`;
    
    // Írjuk a stream-be (ez gyors)
    logStream.write(logMessage);
    
    // Írjuk ki az eredeti process-be is, hátha (de ez az, amit a Passenger elkap)
    process.stdout.write(logMessage); 
};

// Térítsük el a console.error-t:
console.error = (...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => arg instanceof Error ? arg.stack : util.format(arg)).join(' ');
    const logMessage = `[${timestamp}] [HIBA]: ${message}\n`;
    
    // Írjuk a stream-be
    logStream.write(logMessage);
    
    // Írjuk az eredeti process-be is
    process.stderr.write(logMessage);
};

// Térítsük el a kezeletlen hibákat is!
process.on('uncaughtException', (err) => {
    console.error('!!! KEZELETLEN HIBA (UNCAUGHT EXCEPTION) !!!', err);
    // Adjunk időt a log írására, mielőtt a process leáll
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('!!! KEZELETLEN PROMISE HIBA (UNHANDLED REJECTION) !!!', reason);
});
//MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8 // 8 óra
  }
}));
;
app.use(express.json({ limit: '256kb' }));

// egyszerű rate limit (npm i express-rate-limit)
const rateLimit = require('express-rate-limit');

app.use('/api/generate', rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
}));


const logDir = path.join(__dirname, 'logi');
const logFile = path.join(logDir, 'errors.txt');

// Ha nincs log mappa, létrehozza
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Ha nincs fájl, nem kell külön létrehozni — `appendFileSync` magától létrehozza
function logError(message) {
    const msg = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logFile, msg);
    console.error(msg);
}

// Globális hibák logolása
process.on('uncaughtException', (err) => {
    logError(`UNCAUGHT EXCEPTION: ${err.stack || err}`);
});

process.on('unhandledRejection', (reason, promise) => {
    logError(`UNHANDLED REJECTION: ${reason}`);
});
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY hiányzik a környezetből');
}
// Express error middleware
app.use((err, req, res, next) => {
    logError(`HTTP ERROR: ${err.stack || err}`);
    res.status(500).send('Hiba történt, naplózva.');
});
//MODULOK
//Regi modul
    const regi = require('./modulok/regmodul');
    app.use('/', regi(db));
//Értékelő modul
    const kerdoiv = require('./modulok/ertekelomodul');
    app.use('/', kerdoiv(db));
//Feltöltő modul
    const feltoltes = require('./modulok/feltoltomodul');
    app.use('/', feltoltes(db));
//Bejelentkező modul
    const login = require('./modulok/loginmodul');
    app.use('/', login(db));
//Admin modul    
     const admin = require('./modulok/adminmodul');
    app.use('/', admin(db)); 
// Kijelentkező modul
    const logout = require('./modulok/logoutmodul');
    app.use('/logout', logout(db)); 
// Felhasznalo modul
const addKitoltesRoute = require('./modulok/felhasznalomodul');
    app.use('/api', addKitoltesRoute(db));
// Autentikációs Middleware (bejelentkezés ellenőrzése)
const aiJellemzes = require('./modulok/aiJellemzesModul');// csak bejelentkezve:
app.use('/api', authMiddleware, aiJellemzes(db)); // <<< ÁT KELL ADNI A 'db' VÁLTOZÓT!
//BEJELENTKEZTETÉS        
// Autentikációs Middleware (bejelentkezés ellenőrzése)
function authMiddleware(req, res, next) {
    if (req.session && req.session.userId) {
        return next(); // Ha be van jelentkezve, továbbengedjük
    } else {
        return res.redirect('/login.html'); // Átirányítás a bejelentkezési oldalra
    }
}
// Admin jogosultság ellenőrzés (csak adminok érhetik el az admin oldalt)
function adminAuthMiddleware(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next(); 
    } else {
        return res.status(403).send('Nincs jogosultságod az admin oldalhoz!');
    }
}
//KISZOLGÁLÁS
// Statikus fájlok kezelése (public)
app.use(express.static(path.join(__dirname, 'httpdocs'), {
    etag: false,
    setHeaders: (res, path) => {
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Expires', '0');
            res.setHeader('Pragma', 'no-cache');
        }
    }
}));
app.use(express.static(path.join(__dirname, 'httpdocs', 'public')));
app.use('/both', express.static(path.join(__dirname, 'httpdocs', 'both')));

// Alapértelmezett útvonal, amely az index.html fájlt szolgáltatja
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'httpdocs', 'public', 'index.html'));
});
// Statikus fájlok kezelése (public, user, admin)
app.use('/user', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'user')));
app.use('/elemzo', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'elemzo')));
app.use('/admin', authMiddleware, adminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'admin')));
app.use('/info',authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'info')));
app.use('/main', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'main')));

//ALIASOK

const routes = [
    //Public
        { path: '/register.html', file: 'public/reg/register.html', auth: [] },
    //Privibe
        { path: '/dashboard.html', file: 'private/admin/dashboard.html', auth: [authMiddleware, adminAuthMiddleware] },
        { path: '/upload.html', file: 'private/admin/upload/upload.html', auth: [authMiddleware, adminAuthMiddleware] },
        { path: '/teszt.html', file: 'private/admin/teszt/teszt.html', auth: [authMiddleware, adminAuthMiddleware] },
];
//Kezelő függvény
routes.forEach(route => {
    app.get(route.path, ...route.auth, (req, res) => {
        res.sendFile(path.join(__dirname, 'httpdocs', route.file));
    });
});

app.use((err, req, res, next) => {
  logError(`HTTP ERROR: ${err.stack || err}`);
  res.status(500).send('Hiba történt, naplózva.');
});
//INDÍTÁS
//Szerever
app.get('/status', (req, res) => {
    res.json({ message: 'A szerver fut!' });
  });
//Adatbázis
 app.get('/health', (req, res) => {
    db.query('SELECT 1', (err) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'Adatbázis kapcsolat hiba' });
        }
        res.json({ status: 'ok', message: 'Adatbázis kapcsolat rendben' });
    });
  });  

app.listen(port, () => {
    console.log(`Szerver fut a http://localhost:${port} címen`);

});