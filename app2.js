// ============================================================================
// LEGELSŐ BETÖLTÉSEK - ÉRTÉKEK
// ============================================================================

const fs = require('fs');
const path = require('path');
const Module = require('module');

const BOOT_LOG_FILE = path.join(__dirname, 'startup-debug.txt');

function bootLog(message, error = null) {
  try {
    const time = new Date().toISOString();
    let text = `[${time}] ${message}\n`;

    if (error) {
      text += `${error.stack || error.message || String(error)}\n`;
    }

    fs.appendFileSync(BOOT_LOG_FILE, text);
  } catch (_) {
    // Ha ide sem tud írni, akkor fájlrendszer/jogosultság gond van.
  }
}

function processInfo() {
  return `PID=${process.pid} | uptime=${process.uptime().toFixed(1)}s`;
}

let httpServer = null;
let shutdownStarted = false;

function gracefulShutdown(signal) {
  if (shutdownStarted) {
    bootLog(`PROCESS ${signal} - ismételt leállítási jel figyelmen kívül hagyva | ${processInfo()}`);
    return;
  }

  shutdownStarted = true;

  bootLog(`PROCESS ${signal} - leállítási jel érkezett | ${processInfo()}`);

  const forceExitTimer = setTimeout(() => {
    bootLog(`PROCESS ${signal} - kényszerített kilépés 5 másodperc után | ${processInfo()}`);
    process.exit(0);
  }, 5000);

  if (typeof forceExitTimer.unref === 'function') {
    forceExitTimer.unref();
  }

  if (httpServer && typeof httpServer.close === 'function') {
    httpServer.close((err) => {
      if (err) {
        bootLog(`HTTP SERVER CLOSE HIBA - ${signal}`, err);
        process.exit(1);
      }

      bootLog(`HTTP SERVER CLOSED - ${signal} | ${processInfo()}`);
      process.exit(0);
    });

    return;
  }

  bootLog(`PROCESS ${signal} - nincs aktív httpServer, azonnali kilépés | ${processInfo()}`);
  process.exit(0);
}

bootLog(`01 - app.js betöltése elkezdődött | ${processInfo()}`);


// ============================================================================
// DOTENV-KIVÉDÉS LIVE SZERVEREN
// ============================================================================


const originalModuleLoad = Module._load;

Module._load = function patchedModuleLoad(request, parent, isMain) {
  if (request === 'dotenv') {
    bootLog(`INFO - dotenv require elfogva, live no-op dotenv shim használva | ${processInfo()}`);

    return {
      config: () => {
        bootLog(`INFO - dotenv.config() meghívva, de live szerveren no-op | ${processInfo()}`);
        return {
          parsed: {},
          error: null
        };
      }
    };
  }

  return originalModuleLoad.apply(this, arguments);
};


// ============================================================================
// GLOBÁLIS INDULÁSI / LEÁLLÁSI HIBAFIGYELŐK
// ============================================================================

process.on('uncaughtException', (err) => {
  bootLog(`UNCAUGHT EXCEPTION - az app összeomlott | ${processInfo()}`, err);

  try {
    console.error('UNCAUGHT EXCEPTION:', err);
  } catch (_) {}

  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason) => {
  bootLog(`UNHANDLED REJECTION - kezeletlen Promise hiba | ${processInfo()}`, reason);

  try {
    console.error('UNHANDLED REJECTION:', reason);
  } catch (_) {}
});

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

process.on('SIGHUP', () => {
  gracefulShutdown('SIGHUP');
});

process.on('beforeExit', (code) => {
  bootLog(`PROCESS BEFORE EXIT - code=${code} | ${processInfo()}`);
});

process.on('exit', (code) => {
  bootLog(`PROCESS EXIT - code=${code} | ${processInfo()}`);
});


// ============================================================================
// TELJES APP INDÍTÁS TRY/CATCH-BEN
// ============================================================================

try {
  bootLog(`02 - BOOT TRY START | ${processInfo()}`);

  // ==========================================================================
  // FÜGGŐSÉGEK
  // ==========================================================================

  const express = require('express');
  bootLog(`03 - express betöltve | ${processInfo()}`);

  const util = require('util');
  bootLog(`04 - util betöltve | ${processInfo()}`);

  const session = require('express-session');
  bootLog(`05 - express-session betöltve | ${processInfo()}`);

  const MySQLStore = require('express-mysql-session')(session);
  bootLog(`06 - express-mysql-session betöltve | ${processInfo()}`);

  const rateLimit = require('express-rate-limit');
  bootLog(`07 - express-rate-limit betöltve | ${processInfo()}`);

  const db = require('./modulok/dbmodul');
  bootLog(`08 - dbmodul betöltve | ${processInfo()}`);

  const securityFactory = require('./modulok/security');
  bootLog(`09 - security.js fájl betöltve | ${processInfo()}`);

  const {
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    ensureCsrfToken,
    requireCsrf,
    csrfTokenHandler
  } = securityFactory(db);

  bootLog(`10 - security.js inicializálva | ${processInfo()}`);

  if (!process.env.SECRET_KEY) {
    throw new Error('SECRET_KEY hiányzik');
  }

  bootLog(`11 - SECRET_KEY létezik | ${processInfo()}`);

  if (!process.env.GEMINI_API_KEY) {
    bootLog(`FIGYELEM - GEMINI_API_KEY hiányzik, az MI funkció hibára futhat | ${processInfo()}`);
  } else {
    bootLog(`12 - GEMINI_API_KEY létezik | ${processInfo()}`);
  }

  const app = express();
  const port = Number(process.env.PORT || 3000);

  bootLog(`13 - Express app létrehozva, port: ${port} | ${processInfo()}`);

  app.set('trust proxy', 1);
  bootLog(`14 - trust proxy beállítva | ${processInfo()}`);


  // ==========================================================================
  // LOGOLÁS
  // ==========================================================================

  const logDir = path.join(__dirname, 'logi');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  bootLog(`15 - logi mappa ellenőrizve/létrehozva | ${processInfo()}`);

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

    try {
      fs.appendFileSync(errorFilePath, msg);
    } catch (err) {
      bootLog('Nem sikerült írni az errors.txt fájlt', err);
    }

    console.error(msg);
  }

  bootLog(`16 - saját logolás beállítva | ${processInfo()}`);

  // ==========================================================================
  // STATIKUS KISZOLGÁLÁS - PUBLIKUS FÁJLOK
  // ==========================================================================


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

  const httpdocsPath = path.join(__dirname, 'httpdocs');
  const publicPathLower = path.join(__dirname, 'httpdocs', 'public');
  const publicPathUpper = path.join(__dirname, 'httpdocs', 'Public');

  const publicPath = fs.existsSync(publicPathLower)
    ? publicPathLower
    : fs.existsSync(publicPathUpper)
      ? publicPathUpper
      : publicPathLower;

  bootLog(`17 - publicPath kiválasztva: ${publicPath} | ${processInfo()}`);

  if (!fs.existsSync(httpdocsPath)) {
    bootLog(`FIGYELEM - httpdocs nem létezik: ${httpdocsPath} | ${processInfo()}`);
  }

  if (!fs.existsSync(publicPathLower)) {
    bootLog(`INFO - kisbetűs public nem létezik: ${publicPathLower} | ${processInfo()}`);
  }

  if (!fs.existsSync(publicPathUpper)) {
    bootLog(`INFO - nagybetűs Public nem létezik: ${publicPathUpper} | ${processInfo()}`);
  }

  function servePublicFile(fileName) {
    return (req, res, next) => {
      const filePath = path.join(publicPath, fileName);

      if (!fs.existsSync(filePath)) {
        bootLog(`PUBLIKUS FÁJL NEM TALÁLHATÓ: ${filePath} | ${processInfo()}`);
        return next();
      }

      return res.sendFile(filePath);
    };
  }

  function sendFirstExistingFile(res, filePaths) {
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    return res.status(404).send('A keresett fájl nem található.');
  }

  // Public mappa kiszolgálása több útvonalon is.
  app.use(express.static(publicPath, staticNoCacheOptions));
  app.use('/public', express.static(publicPath, staticNoCacheOptions));
  app.use('/Public', express.static(publicPath, staticNoCacheOptions));

  // Közös, publikus vagy közösen használt frontend fájlok
  const bothPath = path.join(__dirname, 'httpdocs', 'both');

  if (fs.existsSync(bothPath)) {
    app.use('/both', express.static(bothPath, staticNoCacheOptions));
    bootLog(`18 - both mappa kiszolgálva: ${bothPath} | ${processInfo()}`);
  } else {
    bootLog(`INFO - both mappa nem létezik: ${bothPath} | ${processInfo()}`);
  }

  // Gyakori root assetek
  app.get('/stylei.css', servePublicFile('stylei.css'));
  app.get('/public/stylei.css', servePublicFile('stylei.css'));
  app.get('/Public/stylei.css', servePublicFile('stylei.css'));

  app.get('/style.css', servePublicFile('style.css'));
  app.get('/public/style.css', servePublicFile('style.css'));
  app.get('/Public/style.css', servePublicFile('style.css'));

  app.get('/favicon.ico', servePublicFile('favicon.ico'));
  app.get('/manifest.json', servePublicFile('manifest.json'));
  app.get('/robots.txt', servePublicFile('robots.txt'));
  app.get('/sitemap.xml', servePublicFile('sitemap.xml'));

  // Opcionális publikus asset mappák
  const mediaPathRoot = path.join(__dirname, 'httpdocs', 'media');
  const mediaPathPublic = path.join(publicPath, 'media');

  if (fs.existsSync(mediaPathRoot)) {
    app.use('/media', express.static(mediaPathRoot, staticNoCacheOptions));
    bootLog(`19 - /media rootból kiszolgálva: ${mediaPathRoot} | ${processInfo()}`);
  } else if (fs.existsSync(mediaPathPublic)) {
    app.use('/media', express.static(mediaPathPublic, staticNoCacheOptions));
    bootLog(`19 - /media publicból kiszolgálva: ${mediaPathPublic} | ${processInfo()}`);
  } else {
    bootLog(`INFO - media mappa nem található sem rootban, sem publicban | ${processInfo()}`);
  }

  const uploadsPath = path.join(__dirname, 'httpdocs', 'uploads');

  if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath, staticNoCacheOptions));
    bootLog(`20 - uploads mappa kiszolgálva: ${uploadsPath} | ${processInfo()}`);
  }

  // Alapértelmezett főoldal
  app.get('/', (req, res) => {
    return sendFirstExistingFile(res, [
      path.join(httpdocsPath, 'index.html'),
      path.join(publicPath, 'index.html')
    ]);
  });

  app.get('/index.html', (req, res) => {
    return sendFirstExistingFile(res, [
      path.join(httpdocsPath, 'index.html'),
      path.join(publicPath, 'index.html')
    ]);
  });

  bootLog(`21 - publikus statikus route-ok beállítva | ${processInfo()}`);


  // ==========================================================================
  // SESSION STORE
  // ==========================================================================

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

  bootLog(`22 - MySQL sessionStore létrehozva | ${processInfo()}`);


  // ==========================================================================
  // MIDDLEWARE
  // ==========================================================================

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

  bootLog(`23 - alap middleware-ek beállítva | ${processInfo()}`);


  // ==========================================================================
  // RATE LIMIT
  // ==========================================================================

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

  bootLog(`24 - rate limiterek beállítva | ${processInfo()}`);


  // ==========================================================================
  // CSRF
  // ==========================================================================

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

  bootLog(`25 - CSRF middleware beállítva | ${processInfo()}`);


  // ==========================================================================
  // MODULOK
  // ==========================================================================

  const regi = require('./modulok/regmodul');
  app.use('/', regi(db));
  bootLog(`26 - regmodul betöltve | ${processInfo()}`);

  const kerdoiv = require('./modulok/ertekelomodul');
  app.use('/', kerdoiv(db));
  bootLog(`27 - ertekelomodul betöltve | ${processInfo()}`);

  const feltoltes = require('./modulok/feltoltomodul');
  app.use('/', feltoltes(db));
  bootLog(`28 - feltoltomodul betöltve | ${processInfo()}`);

  const login = require('./modulok/loginmodul');
  app.use('/', login(db));
  bootLog(`29 - loginmodul betöltve | ${processInfo()}`);

  const admin = require('./modulok/adminmodul');
  app.use('/', admin(db));
  bootLog(`30 - adminmodul betöltve | ${processInfo()}`);

  const audit = require('./modulok/auditmodul');
  app.use('/', audit(db));
  bootLog(`31 - auditmodul betöltve | ${processInfo()}`);

  const jelszo = require('./modulok/jelszomodul');
  app.use('/', jelszo(db));
  bootLog(`32 - jelszomodul betöltve | ${processInfo()}`);

  const auditCron = require('./modulok/auditcronmodul');
  auditCron(db);
  bootLog(`33 - auditcronmodul betöltve/elindítva | ${processInfo()}`);

  const statisztika = require('./modulok/statisztikaModul');
  app.use('/', statisztika(db));
  bootLog('34 - statisztikaModul betöltve');

  const licenc = require('./modulok/licencmodul');
  app.use('/', licenc(db));
  bootLog('34b - licencmodul betöltve');

  const logout = require('./modulok/logoutmodul');
  app.use('/logout', logout(db));
  bootLog('35 - logoutmodul betöltve');

  const addKitoltesRoute = require('./modulok/felhasznalomodul');
  app.use('/api', addKitoltesRoute(db));
  bootLog(`36 - felhasznalomodul betöltve | ${processInfo()}`);

  const docxExport = require('./modulok/docxExportModul');
  app.use('/api', docxExport(db));
  bootLog(`36b - docxExportModul betöltve | ${processInfo()}`);

  const aiJellemzes = require('./modulok/aiJellemzesModul');
  app.use(
    '/api',
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    aiJellemzes(db)
  );
  bootLog(`37 - aiJellemzesModul betöltve | ${processInfo()}`);


  // ==========================================================================
  // BEJELENTKEZTETÉS
  // ==========================================================================

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

  bootLog(`38 - auth middleware függvények létrehozva | ${processInfo()}`);


  // ==========================================================================
  // VÉDETT STATIKUS ÚTVONALAK
  // ==========================================================================

  app.use('/user', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'user'), staticNoCacheOptions));
  app.use('/elemzo', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'elemzo'), staticNoCacheOptions));
  app.use('/admin', authMiddleware, adminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'admin'), staticNoCacheOptions));
  app.use('/sysadmin', authMiddleware, sysadminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'sysadmin'), staticNoCacheOptions));
  app.use('/info', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'info'), staticNoCacheOptions));
  app.use('/main', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'main'), staticNoCacheOptions));

  // Régi /private útvonalak, de auth mögött.
  app.use('/private/user', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'user'), staticNoCacheOptions));
  app.use('/private/elemzo', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'elemzo'), staticNoCacheOptions));
  app.use('/private/admin', authMiddleware, adminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'admin'), staticNoCacheOptions));
  app.use('/private/sysadmin', authMiddleware, sysadminAuthMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'sysadmin'), staticNoCacheOptions));
  app.use('/private/info', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'info'), staticNoCacheOptions));
  app.use('/private/main', authMiddleware, express.static(path.join(__dirname, 'httpdocs', 'private', 'main'), staticNoCacheOptions));

  bootLog(`39 - védett statikus útvonalak beállítva | ${processInfo()}`);


  // ==========================================================================
  // ALIASOK
  // ==========================================================================

  const routes = [
    {
      path: '/register.html',
      fileOptions: [
        path.join(publicPath, 'reg', 'register.html'),
        path.join(httpdocsPath, 'public', 'reg', 'register.html'),
        path.join(httpdocsPath, 'Public', 'reg', 'register.html')
      ],
      auth: []
    },
    {
      path: '/reset-password.html',
      fileOptions: [
        path.join(publicPath, 'reset-password.html'),
        path.join(httpdocsPath, 'reset-password.html')
      ],
      auth: []
    },
    {
      path: '/admin/dashboard.html',
      fileOptions: [
        path.join(httpdocsPath, 'private', 'admin', 'dashboard.html')
      ],
      auth: [authMiddleware, adminAuthMiddleware]
    },
    {
      path: '/sysadmin/dashboard.html',
      fileOptions: [
        path.join(httpdocsPath, 'private', 'sysadmin', 'dashboard.html')
      ],
      auth: [authMiddleware, sysadminAuthMiddleware]
    },
    {
      path: '/upload.html',
      fileOptions: [
        path.join(httpdocsPath, 'private', 'admin', 'upload', 'upload.html')
      ],
      auth: [authMiddleware, adminAuthMiddleware]
    },
    {
      path: '/teszt.html',
      fileOptions: [
        path.join(httpdocsPath, 'private', 'admin', 'teszt', 'teszt.html')
      ],
      auth: [authMiddleware, adminAuthMiddleware]
    }
  ];

  routes.forEach(route => {
    app.get(route.path, ...route.auth, (req, res) => {
      return sendFirstExistingFile(res, route.fileOptions);
    });
  });

  bootLog(`40 - alias route-ok beállítva | ${processInfo()}`);


  // ==========================================================================
  // ÁLLAPOTVÉGPONTOK
  // ==========================================================================

  app.get('/status', (req, res) => {
    res.json({
      message: 'A szerver fut!',
      pid: process.pid,
      uptime: process.uptime(),
      publicPath,
      time: new Date().toISOString()
    });
  });

  app.get('/health', (req, res) => {
    db.query('SELECT 1', (err) => {
      if (err) {
        bootLog('HEALTH DB HIBA', err);

        return res.status(500).json({
          status: 'error',
          message: 'Adatbázis kapcsolat hiba',
          pid: process.pid,
          time: new Date().toISOString()
        });
      }

      res.json({
        status: 'ok',
        message: 'Adatbázis kapcsolat rendben',
        pid: process.pid,
        uptime: process.uptime(),
        time: new Date().toISOString()
      });
    });
  });

  app.get('/debug-paths', (req, res) => {
    res.json({
      __dirname,
      httpdocsPath,
      publicPathLower,
      publicPathUpper,
      publicPath,
      pid: process.pid,
      uptime: process.uptime(),
      time: new Date().toISOString(),
      exists: {
        httpdocs: fs.existsSync(httpdocsPath),
        publicLower: fs.existsSync(publicPathLower),
        publicUpper: fs.existsSync(publicPathUpper),
        styleiLower: fs.existsSync(path.join(publicPathLower, 'stylei.css')),
        styleiUpper: fs.existsSync(path.join(publicPathUpper, 'stylei.css')),
        styleiSelected: fs.existsSync(path.join(publicPath, 'stylei.css')),
        indexRoot: fs.existsSync(path.join(httpdocsPath, 'index.html')),
        indexPublic: fs.existsSync(path.join(publicPath, 'index.html')),
        security: fs.existsSync(path.join(__dirname, 'modulok', 'security.js')),
        dbmodul: fs.existsSync(path.join(__dirname, 'modulok', 'dbmodul.js'))
      }
    });
  });

  bootLog(`41 - status/health/debug-paths végpontok beállítva | ${processInfo()}`);


  // ==========================================================================
  // 404
  // ==========================================================================

  app.use((req, res) => {
    bootLog(`404 - Nem talált útvonal: ${req.method} ${req.originalUrl} | ${processInfo()}`);
    res.status(404).send('A keresett útvonal nem található.');
  });


  // ==========================================================================
  // HIBAKEZELÉS
  // ==========================================================================

  app.use((err, req, res, next) => {
    logError(`HTTP ERROR: ${err.stack || err}`);
    bootLog(`HTTP ERROR middleware: ${req.method} ${req.originalUrl} | ${processInfo()}`, err);

    res.status(500).send('Hiba történt, naplózva.');
  });


  // ==========================================================================
  // INDÍTÁS
  // ==========================================================================

  bootLog(`98 - app.listen előtt | ${processInfo()}`);

  httpServer = app.listen(port, () => {
    const msg = `Szerver fut a http://localhost:${port} címen | PID=${process.pid} | START=${new Date().toISOString()}`;

    bootLog(`99 - ${msg}`);
    console.log(msg);
  });

} catch (err) {
  bootLog(`FATAL STARTUP ERROR - induláskori hiba | ${processInfo()}`, err);

  try {
    console.error('FATAL STARTUP ERROR:', err);
  } catch (_) {}

  throw err;
}