// FÜGGŐSÉGEK
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const util = require('util');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const rateLimit = require('express-rate-limit');

const db = require('./modulok/dbmodul');
const {
  requireLogin,
  attachUserContext,
  requireModuleAccess,
  ensureCsrfToken,
  requireCsrf,
  csrfTokenHandler
} = require('./modulok/security')(db);

if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY hiányzik');
if (!process.env.SECRET_KEY) throw new Error('SECRET_KEY hiányzik');

const app = express();
const port = Number(process.env.PORT || 3000);

app.set('trust proxy', 1);

// LOGOLÁS
const logDir = path.join(__dirname, 'logi');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, 'minden_log.txt');
const errorFilePath = path.join(logDir, 'errors.txt');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function safeFormat(arg) {
  if (arg instanceof Error) return arg.stack || arg.message;
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      return util.format(arg);
    }
  }
  return String(arg);
}

function writeLog(level, args, stream = process.stdout) {
  const timestamp = new Date().toISOString();
  const message = args.map(safeFormat).join(' ');
  const logMessage = `[${timestamp}] [${level}]: ${message}\n`;

  logStream.write(logMessage);
  stream.write(logMessage);
}

console.log = (...args) => writeLog('LOG', args, process.stdout);
console.error = (...args) => writeLog('HIBA', args, process.stderr);

function logError(message) {
  const msg = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(errorFilePath, msg);
  console.error(msg);
}

process.on('uncaughtException', (err) => {
  logError(`UNCAUGHT EXCEPTION: ${err.stack || err}`);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  logError(`UNHANDLED REJECTION: ${reason?.stack || reason}`);
});

// SESSION STORE
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 8 * 60 * 60 * 1000,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, db);

// MIDDLEWARE
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'ertekek.sid',
  secret: process.env.SECRET_KEY,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    ensureCsrfToken(req);
  }
  next();
});

// RATE LIMIT
app.use('/api/generate', rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Túl sok sikertelen vagy ismételt belépési próbálkozás. Kérjük, próbálja újra később.'
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Túl sok jelszó-visszaállítási kérés. Kérjük, próbálja újra később.'
  }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Túl sok jelszó-visszaállítási próbálkozás. Kérjük, próbálja újra később.'
  }
});

app.use('/login', loginLimiter);
app.use('/api/forgot-password-request', forgotPasswordLimiter);
app.use('/api/reset-password', resetPasswordLimiter);

// CSRF
app.get('/api/csrf-token', requireLogin, csrfTokenHandler);

const csrfExemptPaths = new Set([
  '/login',
  '/login-options',
  '/logout',
  '/register/institution',
  '/register/user',
  '/register/check-code',
  '/api/forgot-password-request',
  '/api/reset-password'
]);

app.use((req, res, next) => {
  if (csrfExemptPaths.has(req.path)) return next();
  return requireCsrf(req, res, next);
});

// MODULOK
const regi = require('./modulok/regmodul');
app.use('/', regi(db));

const kerdoiv = require('./modulok/ertekelomodul');
app.use('/', kerdoiv(db));

const feltoltes = require('./modulok/feltoltomodul');
app.use('/', feltoltes(db));

const login = require('./modulok/loginmodul');
app.use('/', login(db));

const admin = require('./modulok/adminmodul');
app.use('/', admin(db));

const audit = require('./modulok/auditmodul');
app.use('/', audit(db));

const jelszo = require('./modulok/jelszomodul');
app.use('/', jelszo(db));

const auditCron = require('./modulok/auditcronmodul');
auditCron(db);

const statisztika = require('./modulok/statisztikaModul');
app.use('/', statisztika(db));

const licenc = require('./modulok/licencmodul');
app.use('/', licenc(db));

const logout = require('./modulok/logoutmodul');
app.use('/logout', logout(db));

const addKitoltesRoute = require('./modulok/felhasznalomodul');
app.use('/api', addKitoltesRoute(db));

const docxExport = require('./modulok/docxExportModul');
app.use('/api', docxExport(db));

const aiJellemzes = require('./modulok/aiJellemzesModul');
app.use(
  '/api',
  requireLogin,
  attachUserContext,
  requireModuleAccess,
  aiJellemzes(db)
);

// BEJELENTKEZTETÉS
function authMiddleware(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/index.html');
}

function adminAuthMiddleware(req, res, next) {
  if (req.session && (req.session.isAdmin || req.session.roleId === 4)) return next();
  return res.status(403).send('Nincs jogosultságod az admin végpontokhoz!');
}

function sysadminAuthMiddleware(req, res, next) {
  if (req.session && req.session.roleId === 4) return next();
  return res.status(403).send('Nincs jogosultságod a rendszergazda (sysadmin) oldalhoz!');
}

// STATIKUS KISZOLGÁLÁS
//KISZOLGÁLÁS

const staticNoCacheOptions = {
    etag: false,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Expires', '0');
            res.setHeader('Pragma', 'no-cache');
        }
    }
};

// Publikus fájlok új és régi útvonalon is.
// Így működik:
// /stylei.css
// /public/stylei.css
app.use(express.static(path.join(__dirname, 'httpdocs', 'public'), staticNoCacheOptions));
app.use('/public', express.static(path.join(__dirname, 'httpdocs', 'public'), staticNoCacheOptions));

// Közös, publikus vagy közösen használt frontend fájlok
app.use('/both', express.static(path.join(__dirname, 'httpdocs', 'both'), staticNoCacheOptions));

// Opcionális publikus asset mappák, ha léteznek
const mediaPath = path.join(__dirname, 'httpdocs', 'media');
if (fs.existsSync(mediaPath)) {
    app.use('/media', express.static(mediaPath, staticNoCacheOptions));
}

const uploadsPath = path.join(__dirname, 'httpdocs', 'uploads');
if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath, staticNoCacheOptions));
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'httpdocs', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'httpdocs', 'index.html'));
});

// VÉDETT statikus útvonalak szép aliasokkal
app.use('/user', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'user'), staticNoCacheOptions));
app.use('/elemzo', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'elemzo'), staticNoCacheOptions));
app.use('/admin', authMiddleware, adminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'admin'), staticNoCacheOptions));
app.use('/sysadmin', authMiddleware, sysadminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'sysadmin'), staticNoCacheOptions));
app.use('/info', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'info'), staticNoCacheOptions));
app.use('/main', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'main'), staticNoCacheOptions));

// DE nem nyilvánosan, hanem auth mögött.
app.use('/private/user', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'user'), staticNoCacheOptions));
app.use('/private/elemzo', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'elemzo'), staticNoCacheOptions));
app.use('/private/admin', authMiddleware, adminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'admin'), staticNoCacheOptions));
app.use('/private/sysadmin', authMiddleware, sysadminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'sysadmin'), staticNoCacheOptions));
app.use('/private/info', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'info'), staticNoCacheOptions));
app.use('/private/main', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'main'), staticNoCacheOptions));
// ALIASOK
const routes = [
  { path: '/register.html', file: 'public/reg/register.html', auth: [] },
  { path: '/reset-password.html', file: 'public/reset-password.html', auth: [] },
  { path: '/admin/dashboard.html', file: 'private/admin/dashboard.html', auth: [authMiddleware, adminAuthMiddleware] },
  { path: '/sysadmin/dashboard.html', file: 'private/sysadmin/dashboard.html', auth: [authMiddleware, sysadminAuthMiddleware] },
  { path: '/upload.html', file: 'private/admin/upload/upload.html', auth: [authMiddleware, adminAuthMiddleware] },
  { path: '/teszt.html', file: 'private/admin/teszt/teszt.html', auth: [authMiddleware, adminAuthMiddleware] }
];

routes.forEach(route => {
  app.get(route.path, ...route.auth, (req, res) => {
    res.sendFile(path.join(__dirname, 'httpdocs', route.file));
  });
});

// ÁLLAPOTVÉGPONTOK
app.get('/status', (req, res) => {
  res.json({ message: 'A szerver fut!' });
});

app.get('/health', (req, res) => {
  db.query('SELECT 1', (err) => {
    if (err) {
      return res.status(500).json({ status: 'error', message: 'Adatbázis kapcsolat hiba' });
    }

    res.json({ status: 'ok', message: 'Adatbázis kapcsolat rendben' });
  });
});

// HIBAKEZELÉS
app.use((err, req, res, next) => {
  logError(`HTTP ERROR: ${err.stack || err}`);
  res.status(500).send('Hiba történt, naplózva.');
});

// INDÍTÁS
app.listen(port, () => {
  console.log(`Szerver fut a http://localhost:${port} címen`);
});
