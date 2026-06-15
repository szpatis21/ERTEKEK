const crypto = require('crypto');
module.exports = function createSecurity(db) {
  function q(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Bejelentkezés szükséges.'
      });
    }

    next();
  }

  async function attachUserContext(req, res, next) {
    try {
      const userId = Number(req.session.userId);

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({
          success: false,
          message: 'Érvénytelen bejelentkezés.'
        });
      }

      const rows = await q(
        `
        SELECT id, int_id, role_id
        FROM felhasznalok
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
      );

      if (!rows.length) {
        return res.status(401).json({
          success: false,
          message: 'Felhasználó nem található.'
        });
      }

      const user = rows[0];

      req.auth = {
        userId: Number(user.id),
        intId: Number(user.int_id),
        realRoleId: Number(user.role_id),
        roleId: Number(req.session.roleId || user.role_id),
        actualRoleId: Number(req.session.actualRoleId || user.role_id),
        modulId: Number(req.session.modulId),
        isSysadmin: Number(user.role_id) === 4
      };

      next();
    } catch (err) {
      console.error('[attachUserContext hiba]', err);
      res.status(500).json({
        success: false,
        message: 'Jogosultsági ellenőrzési hiba.'
      });
    }
  }

  function requireRole(...allowedRoleIds) {
    return (req, res, next) => {
      const roleId = Number(req.auth?.roleId || req.session?.roleId);
      const actualRoleId = Number(req.auth?.actualRoleId || req.session?.actualRoleId || roleId);

      if (allowedRoleIds.includes(roleId) || allowedRoleIds.includes(actualRoleId)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez a művelethez.'
      });
    };
  }

  async function requireModuleAccess(req, res, next) {
    try {
      const userId = Number(req.auth?.userId || req.session.userId);
      const modulId = Number(req.auth?.modulId || req.session.modulId);
      const isSysadmin = Boolean(req.auth?.isSysadmin);

      if (isSysadmin) {
        return next();
      }

      if (!Number.isInteger(modulId) || modulId <= 0) {
        return res.status(403).json({
          success: false,
          message: 'Nincs kiválasztott modul.'
        });
      }

      const rows = await q(
        `
        SELECT 1
        FROM jogosultsagok
        WHERE user_id = ?
          AND modul_id = ?
          AND aktiv = 1
        LIMIT 1
        `,
        [userId, modulId]
      );

      if (!rows.length) {
        return res.status(403).json({
          success: false,
          message: 'Nincs jogosultságod ehhez a modulhoz.'
        });
      }

      next();
    } catch (err) {
      console.error('[requireModuleAccess hiba]', err);
      res.status(500).json({
        success: false,
        message: 'Moduljogosultsági ellenőrzési hiba.'
      });
    }
  }
    const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

  function createCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  function ensureCsrfToken(req) {
    if (!req.session) return null;

    if (!req.session.csrfToken) {
      req.session.csrfToken = createCsrfToken();
    }

    return req.session.csrfToken;
  }

  function getExpectedOrigin(req) {
    const envBase = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
    if (envBase) return envBase;

    const rawProto = String(
      req.headers['x-forwarded-proto'] ||
      req.protocol ||
      (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    );

    const proto = rawProto.split(',')[0].trim() || 'http';

    const rawHost = String(
      req.headers['x-forwarded-host'] ||
      req.headers.host ||
      'localhost:3000'
    );

    const host = rawHost.split(',')[0].trim();

    return host ? `${proto}://${host}` : '';
  }

  function getRequestOrigin(req) {
    const origin = String(req.get('origin') || '').trim();
    if (origin) return origin;

    const referer = String(req.get('referer') || '').trim();
    if (!referer) return '';

    try {
      return new URL(referer).origin;
    } catch {
      return '';
    }
  }

  function requireCsrf(req, res, next) {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    // Első körben csak a bejelentkezett sessionnel rendelkező, állapotmódosító kéréseket védjük
    if (!req.session || !req.session.userId) {
      return next();
    }

    const expectedOrigin = getExpectedOrigin(req);
    const requestOrigin = getRequestOrigin(req);

    if (requestOrigin && expectedOrigin && requestOrigin !== expectedOrigin) {
      return res.status(403).json({
        success: false,
        message: 'Tiltott forrásból érkező kérés.'
      });
    }

    const sessionToken = ensureCsrfToken(req);
    const tokenFromHeader = String(req.get('x-csrf-token') || '').trim();
    const tokenFromBody =
      typeof req.body?._csrf === 'string'
        ? req.body._csrf.trim()
        : '';

    const receivedToken = tokenFromHeader || tokenFromBody;

    if (!receivedToken || receivedToken !== sessionToken) {
      return res.status(403).json({
        success: false,
        message: 'Hiányzó vagy érvénytelen CSRF token.'
      });
    }

    return next();
  }

  function csrfTokenHandler(req, res) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Bejelentkezés szükséges.'
      });
    }

    const csrfToken = ensureCsrfToken(req);

    return res.json({
      success: true,
      csrfToken
    });
  }

  const { requireActiveLicense, getLicenseStatus, featureAllowed } = require('./licenseHelper');

  return {
    q,
    requireLogin,
    attachUserContext,
    requireRole,
    requireModuleAccess,
    requireActiveLicense: (featureName) => requireActiveLicense(db, featureName),
    getLicenseStatus: (req) => getLicenseStatus(db, req),
    featureAllowed,
    ensureCsrfToken,
    requireCsrf,
    csrfTokenHandler
  };
};