// Központi demo / próba / licenc állapot számítás.
// Ezt használja a backend middleware és a frontend /api/license-status végpont is.

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  return str ? str.slice(0, 10) : null;
}

function addDays(dateValue, days) {
  const base = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const d = new Date(base);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function diffDaysUntil(dateValue) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function bool(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}
function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}
function q(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function safeQuery(db, sql, params = [], fallback = []) {
  try {
    return await q(db, sql, params);
  } catch (err) {
    // A migráció előtt is induljon el a rendszer, de konzolban látszódjon a hiányzó mező/tábla.
    console.warn('[licenseHelper] opcionális lekérdezés kihagyva:', err.code || err.message);
    return fallback;
  }
}
function basePermissions() {
  return {
    canCreateEvaluation: false,
    canEditEvaluation: false,
    canDeleteEvaluation: false,
    canDuplicateEvaluation: false,
    canShareEvaluation: false,
    canDownloadPdf: true,
    canUseAi: false,
    canUseAudit: false,
    canUseUploader: false,
    canUseAnalyzer: false,
    canUseGroupStatistics: false,
    canRegisterMoreUsers: false
  };
}

function getPackageDefaults(code) {
  const normalized = String(code || '').toLowerCase();

  const defaults = {
    demo: {
      code: 'demo', name: 'Demo', maxUsers: 1, trialDays: 3, evaluationLimit: 3,
      ai: false, audit: false, uploader: false, share: false
    },
start: {
  code: 'start',
  name: 'Értékek Start',
  maxUsers: 2,
  trialDays: 0,
  evaluationLimit: null,
  ai: true,
  audit: false,
  uploader: false,
  analyzer: false,
  share: true,
  sync: true,
  groupStatistics: false
},

pro: {
  code: 'pro',
  name: 'Értékek Pro',
  maxUsers: 5,
  trialDays: 0,
  evaluationLimit: null,
  ai: true,
  audit: true,
  uploader: false,
  analyzer: true,
  share: true,
  sync: true,
  groupStatistics: true
},
    sajat: {
      code: 'sajat', name: 'Értékek Saját Rendszer', maxUsers: 5, trialDays: 0, evaluationLimit: null,
      ai: true, audit: true, uploader: true, share: true
    },
    fenntartoi: {
      code: 'fenntartoi', name: 'Fenntartói csomag', maxUsers: 50, trialDays: 0, evaluationLimit: null,
      ai: true, audit: true, uploader: true, share: true
    }
  };

  return defaults[normalized] || defaults.start;
}

async function loadPackage(db, packageCode) {
  const fallback = getPackageDefaults(packageCode);

  const rows = await safeQuery(
    db,
    `
    SELECT *
    FROM csomagok
    WHERE kod = ? AND aktiv = 1
    LIMIT 1
    `,
    [fallback.code],
    []
  );

  if (!rows.length) return fallback;

const row = rows[0];

return {
  code: row.kod || fallback.code,
  name: row.nev || fallback.name,
  maxUsers: Number(row.max_felhasznalo || fallback.maxUsers),
  trialDays: row.trial_nap === null || row.trial_nap === undefined
    ? fallback.trialDays
    : Number(row.trial_nap),
  evaluationLimit: row.trial_ertekeles_limit === null || row.trial_ertekeles_limit === undefined
    ? fallback.evaluationLimit
    : (Number(row.trial_ertekeles_limit) > 0 ? Number(row.trial_ertekeles_limit) : null),

  ai: bool(firstDefined(row.ai_enabled, fallback.ai)),
  audit: bool(firstDefined(row.audit_enabled, fallback.audit)),
  uploader: bool(firstDefined(row.upload_enabled, row.feltolto_enabled, fallback.uploader)),
  analyzer: bool(firstDefined(row.analyzer_enabled, fallback.analyzer)),
  share: bool(firstDefined(row.share_enabled, row.megosztas_enabled, fallback.share)),
  groupStatistics: bool(firstDefined(row.group_statistics, fallback.groupStatistics))
};
}

function normalizePathName(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .trim();
}

function pairKey(foName, alName) {
  return `${normalizePathName(foName)}||${normalizePathName(alName)}`;
}

async function getAllowedSubcategories(db, packageCode, modulId) {
  const rows = await safeQuery(
    db,
    `
    SELECT
      a.id,
      a.nev,
      f.nev AS fo_nev
    FROM csomag_alkategoria_hozzaferes h
    JOIN csomagok c ON c.id = h.csomag_id
    JOIN alkategoriak a ON a.id = h.al_kategoria_id
    LEFT JOIN fokategoriak f ON f.id = a.fokategoria_id
    WHERE c.kod = ?
      AND h.modul_id = ?
      AND h.elerheto = 1
    ORDER BY f.id ASC, a.id ASC
    `,
    [packageCode, modulId],
    []
  );

  if (rows.length) {
    return {
      ids: rows.map(r => Number(r.id)).filter(Boolean),
      names: rows.map(r => normalizePathName(r.nev)).filter(Boolean),
      pairs: rows
        .map(r => ({ fo: normalizePathName(r.fo_nev), al: normalizePathName(r.nev), key: pairKey(r.fo_nev, r.nev) }))
        .filter(r => r.fo && r.al)
    };
  }

  if (packageCode !== 'demo') {
    return { ids: [], names: [], pairs: [] };
  }

  // Biztonságos fallback: ha még nincs csomag_alkategoria_hozzaferes feltöltve,
  // a demo főkategóriánként az első két alkategóriát kapja meg.
  const fallbackRows = await safeQuery(
    db,
    `
    SELECT
      a.id,
      a.nev,
      f.nev AS fo_nev
    FROM alkategoriak a
    LEFT JOIN fokategoriak f ON f.id = a.fokategoria_id
    WHERE a.modul_id = ?
      AND (
        SELECT COUNT(*)
        FROM alkategoriak a2
        WHERE a2.modul_id = a.modul_id
          AND COALESCE(a2.fokategoria_id, 0) = COALESCE(a.fokategoria_id, 0)
          AND a2.id <= a.id
      ) <= 2
    ORDER BY f.id ASC, a.id ASC
    `,
    [modulId],
    []
  );

  return {
    ids: fallbackRows.map(r => Number(r.id)).filter(Boolean),
    names: fallbackRows.map(r => normalizePathName(r.nev)).filter(Boolean),
    pairs: fallbackRows
      .map(r => ({ fo: normalizePathName(r.fo_nev), al: normalizePathName(r.nev), key: pairKey(r.fo_nev, r.nev) }))
      .filter(r => r.fo && r.al)
  };
}

async function getLicenseStatus(db, req) {
  const userId = Number(req.auth?.userId || req.session?.userId);
  const modulId = Number(req.auth?.modulId || req.session?.modulId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return { status: 'anonymous', accountType: 'anonymous', permissions: basePermissions() };
  }

  if (req.auth?.isSysadmin === true || Number(req.auth?.realRoleId) === 4) {
    const permissions = basePermissions();
    Object.keys(permissions).forEach(key => { permissions[key] = true; });
    return {
      status: 'active',
      accountType: 'sysadmin',
      packageCode: 'sysadmin',
      packageName: 'Sysadmin',
      permissions,
      allowedSubcategoryIds: [],
      allowedSubcategoryNames: [],
      allowedSubcategoryPairs: [],
      daysLeft: null,
      evaluationCount: 0,
      evaluationLimit: null,
      message: 'Sysadmin hozzáférés.'
    };
  }

  const rows = await q(
    db,
    `
    SELECT
      f.id AS user_id,
      f.role_id,
      f.int_id,
      f.regisztralt AS user_regisztralt,
      i.*,
      (SELECT MIN(f2.regisztralt) FROM felhasznalok f2 WHERE f2.int_id = f.int_id) AS first_user_registered,
      (SELECT COUNT(*) FROM felhasznalok f3 WHERE f3.int_id = f.int_id) AS registered_users
    FROM felhasznalok f
    LEFT JOIN intezmeny i ON i.id = f.int_id
    WHERE f.id = ?
    LIMIT 1
    `,
    [userId]
  );

  if (!rows.length || !rows[0].int_id) {
    return { status: 'invalid', accountType: 'none', permissions: basePermissions(), message: 'Nincs intézményhez kötött hozzáférés.' };
  }

  const i = rows[0];
  const rawPackageCode = String(i.csomag_kod || i.csomag || i.idoszak || '').toLowerCase();
  const accountType = rawPackageCode === 'demo' ? 'demo' : 'institution';
  const packageCode = rawPackageCode === 'demo' ? 'demo' : (['start', 'pro', 'sajat', 'fenntartoi'].includes(rawPackageCode) ? rawPackageCode : 'start');
  const packageInfo = await loadPackage(db, packageCode);

  const evalRows = await q(
    db,
    `
    SELECT COUNT(DISTINCT k.idk) AS db
    FROM kitoltesek k
    JOIN felhasznalok f ON f.id = k.felhasznalo_id
    WHERE f.int_id = ?
      AND k.modul_id = ?
      AND k.role IN ('admin', 'sysadmin')
    `,
    [Number(i.int_id), Number.isInteger(modulId) && modulId > 0 ? modulId : 0]
  );

  const evaluationCount = Number(evalRows[0]?.db || 0);
  const activated = bool(i.aktiv) || (bool(i.validalva) && (bool(i.fizetes_beerkezett) || !!i.fizetve));

  const trialStart = toDateOnly(i.trial_indul || i.proba_indul || i.first_user_registered || i.reg_datum || i.user_regisztralt);
  const trialEnd = toDateOnly(i.trial_lejar || i.proba_lejar || addDays(trialStart, packageInfo.trialDays));
  const licenseStart = toDateOnly(i.licenc_kezdete || i.fizetve);
  const licenseEnd = toDateOnly(i.licenc_vege || (licenseStart && i.intfin ? addDays(licenseStart, Number(i.intfin)) : null));

  let status = accountType === 'demo' ? 'demo_active' : 'pending_activation';
  let endDate = accountType === 'demo' ? trialEnd : null;
  let daysLeft = accountType === 'demo' ? diffDaysUntil(trialEnd) : null;
  let expiredByDate = accountType === 'demo' && daysLeft !== null && daysLeft < 0;
const expiredByCount =
  accountType === 'demo' &&
  Number(packageInfo.evaluationLimit) > 0 &&
  evaluationCount >= Number(packageInfo.evaluationLimit);
if (accountType === 'demo') {
  // A DEMO soha ne fusson át fizetős/active licencágra csak azért, mert a sysadmin mezőben aktiv=1.
  // Demónál a dátum és az értékelésszám-limit is számít.
  if (expiredByDate) {
    status = 'demo_expired';
  } else if (expiredByCount) {
    status = 'demo_limit_reached';
  } else {
    status = 'demo_active';
  }

  } else if (activated) {
    status = 'active';
    endDate = licenseEnd;
    daysLeft = diffDaysUntil(licenseEnd);
    if (daysLeft !== null && daysLeft < 0) status = 'expired';
    expiredByDate = status === 'expired';
    // A darabszám v5-től csak tájékoztató adat, nem zárja a funkciókat.
  } else {
    status = 'pending_activation';
  }

  const permissions = basePermissions();

  if (status === 'active') {
    permissions.canCreateEvaluation = true;
    permissions.canEditEvaluation = true;
    permissions.canDeleteEvaluation = true;
    permissions.canDuplicateEvaluation = true;
    permissions.canShareEvaluation = packageInfo.share;
    permissions.canDownloadPdf = true;
    permissions.canUseAi = packageInfo.ai;
    permissions.canUseAudit = packageInfo.audit;
    permissions.canUseUploader = packageInfo.uploader || Number(i.role_id) === 1;
    permissions.canUseAnalyzer = packageInfo.analyzer;
    permissions.canUseGroupStatistics = packageInfo.groupStatistics;
    permissions.canRegisterMoreUsers = true;
  } else if (status === 'demo_active' || status === 'trial_active') {
    permissions.canCreateEvaluation = !expiredByDate && !expiredByCount;
    permissions.canEditEvaluation = true;
    permissions.canDeleteEvaluation = false;
    permissions.canDuplicateEvaluation = false;
    permissions.canShareEvaluation = false;
    permissions.canDownloadPdf = true;
    permissions.canUseAi = accountType !== 'demo' && packageInfo.ai;
    permissions.canUseAudit = false;
    permissions.canUseUploader = packageInfo.uploader && Number(i.role_id) === 1;
    permissions.canUseAnalyzer = false;
    permissions.canUseGroupStatistics = false;
    permissions.canRegisterMoreUsers = false;
  }

  const allowed = await getAllowedSubcategories(db, packageCode, Number(modulId || 0));

  return {
    status,
    accountType,
    packageCode,
    packageName: packageInfo.name,
    permissions,
    trialStart,
    trialEnd,
    licenseStart,
    licenseEnd,
    endDate,
    daysLeft,
    evaluationCount,
    evaluationLimit: packageInfo.evaluationLimit,
    registeredUsers: Number(i.registered_users || 0),
    maxUsers: Number(i.intfo || packageInfo.maxUsers),
    contractReturned: bool(i.szerzodes_visszaerkezett),
    paymentReceived: bool(i.fizetes_beerkezett) || !!i.fizetve,
    active: activated && status === 'active',
    allowedSubcategoryIds: allowed.ids,
    allowedSubcategoryNames: allowed.names,
    allowedSubcategoryPairs: allowed.pairs,
message: status === 'demo_expired'
  ? 'A demó időszak lejárt. A létrehozott értékelések megtekinthetők és PDF-be menthetők, de új munka csak aktiválás után indítható.'
  : status === 'demo_limit_reached'
    ? 'A demó értékelésszám-kerete betelt. A létrehozott értékelések megtekinthetők és PDF-be menthetők, de új értékelés már nem indítható.'
    : status === 'pending_activation'
      ? 'Az intézményi hozzáférés még nincs aktiválva. A belépéshez a szerződés és a fizetés rendezése, majd sysadmin aktiválás szükséges.'
      : 'A hozzáférés aktív.'
  };
}

function featureAllowed(status, featureName) {
  const permissions = status?.permissions || {};
const map = {
  create_evaluation: 'canCreateEvaluation',
  edit_evaluation: 'canEditEvaluation',
  delete_evaluation: 'canDeleteEvaluation',
  duplicate_evaluation: 'canDuplicateEvaluation',
  share_evaluation: 'canShareEvaluation',
  download_pdf: 'canDownloadPdf',
  use_ai: 'canUseAi',
  use_audit: 'canUseAudit',
  use_uploader: 'canUseUploader',
  use_analyzer: 'canUseAnalyzer',
  group_statistics: 'canUseGroupStatistics',
  group_stats: 'canUseGroupStatistics',
  register_user: 'canRegisterMoreUsers'
};

  const key = map[featureName];
  if (!key) return true;
  return permissions[key] === true;
}

function requireActiveLicense(db, featureName) {
  return async (req, res, next) => {
    try {
      const status = await getLicenseStatus(db, req);
      req.licenseStatus = status;

      if (featureAllowed(status, featureName)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        code: 'LICENSE_RESTRICTED',
        feature: featureName,
        license: status,
        message: status.message || 'A csomag vagy próbaidő nem engedélyezi ezt a műveletet.'
      });
    } catch (err) {
      console.error('[requireActiveLicense hiba]', err);
      return res.status(500).json({ success: false, message: 'Licencellenőrzési hiba.' });
    }
  };
}

module.exports = {
  getLicenseStatus,
  featureAllowed,
  requireActiveLicense
};
