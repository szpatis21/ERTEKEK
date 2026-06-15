const express = require('express');
const router = express.Router();

function kerdoiv(db) {
  const {
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    getLicenseStatus
  } = require('./security')(db);

  async function attachLicenseStatus(req, res, next) {
    try {
      req.licenseStatus = await getLicenseStatus(req);
      next();
    } catch (err) {
      console.error('[ertekelomodul] licenc státusz hiba:', err);
      res.status(500).json({ success: false, message: 'Licencállapot ellenőrzési hiba.' });
    }
  }

  const kerdoivAccess = [requireLogin, attachUserContext, requireModuleAccess, attachLicenseStatus];

  function getCurrentModulId(req, res) {
    const modulId = Number(req.auth?.modulId || req.session?.modulId);

    if (!Number.isInteger(modulId) || modulId <= 0) {
      res.status(403).json({ success: false, message: 'Nincs kiválasztott vagy érvényes modul.' });
      return null;
    }

    return modulId;
  }

  function toPositiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function uniquePositiveInts(values) {
    if (!Array.isArray(values)) return [];

    return [...new Set(
      values
        .map(value => Number(value))
        .filter(value => Number.isInteger(value) && value > 0)
    )];
  }

  function cleanPathValue(value) {
    const clean = String(value || '').trim();

    if (
      !clean ||
      clean.toLowerCase() === 'null' ||
      clean.toLowerCase() === 'undefined'
    ) {
      return '';
    }

    return clean;
  }

  function normalizedSql(expr) {
    return `TRIM(REPLACE(REPLACE(${expr}, CHAR(13), ''), CHAR(10), ''))`;
  }

  function moduleAccessSql(alias = 'k') {
    return `
      (
        ${alias}.modul_id = ?
        OR (
          ${alias}.osztott IS NOT NULL
          AND z.modul_megosztott = ?
          AND ${alias}.modul_id = z.modul_megoszto
        )
      )
    `;
  }


  function normalizeForLicense(value) {
    return String(value ?? '')
      .replace(/\r/g, '')
      .replace(/\n/g, '')
      .trim();
  }

  function demoPairKey(foKategoriaNev, alKategoriaNev) {
    return `${normalizeForLicense(foKategoriaNev)}||${normalizeForLicense(alKategoriaNev)}`;
  }

  function getDemoAllowedPairs(req) {
    const status = req.licenseStatus || {};
    return Array.isArray(status.allowedSubcategoryPairs)
      ? status.allowedSubcategoryPairs
          .map(pair => ({
            fo: normalizeForLicense(pair.fo),
            al: normalizeForLicense(pair.al),
            key: normalizeForLicense(pair.key || demoPairKey(pair.fo, pair.al))
          }))
          .filter(pair => pair.fo && pair.al)
      : [];
  }

  function demoRestriction(req, alias = 'k') {
    const status = req.licenseStatus || {};
    if (status.packageCode !== 'demo') {
      return { sql: '', params: [] };
    }

    const allowedPairs = getDemoAllowedPairs(req);

    if (!allowedPairs.length) {
      return { sql: ' AND 1 = 0', params: [] };
    }

    const orParts = allowedPairs.map(() => `(${normalizedSql(`${alias}.fo_kategoria`)} = ? AND ${normalizedSql(`${alias}.al_kategoria`)} = ?)`);
    const params = [];

    allowedPairs.forEach(pair => {
      params.push(pair.fo, pair.al);
    });

    return {
      sql: ` AND (${orParts.join(' OR ')})`,
      params
    };
  }

  function isDemoBlockedAlkategoria(req, foKategoriaNev, alKategoriaNev) {
    const status = req.licenseStatus || {};
    if (status.packageCode !== 'demo') return false;

    const cleanFo = cleanPathValue(foKategoriaNev);
    const cleanAl = cleanPathValue(alKategoriaNev);
    if (!cleanAl) return false;

    const allowedPairs = getDemoAllowedPairs(req);

    if (allowedPairs.length && cleanFo) {
      return !allowedPairs.some(pair => pair.key === demoPairKey(cleanFo, cleanAl));
    }

    const allowed = Array.isArray(status.allowedSubcategoryNames)
      ? status.allowedSubcategoryNames.map(v => normalizeForLicense(v))
      : [];

    return !allowed.includes(normalizeForLicense(cleanAl));
  }

  function markDemoAvailability(req, rows, foKategoriaNev) {
    const status = req.licenseStatus || {};
    if (status.packageCode !== 'demo') {
      return rows.map(row => ({ ...row, demo_elerheto: 1 }));
    }

    const cleanFo = cleanPathValue(foKategoriaNev);
    const allowedPairs = getDemoAllowedPairs(req);

    return rows.map(row => {
      const cleanAl = cleanPathValue(row.nev);
      const elerheto = allowedPairs.length && cleanFo
        ? allowedPairs.some(pair => pair.key === demoPairKey(cleanFo, cleanAl))
        : !isDemoBlockedAlkategoria(req, cleanFo, cleanAl);

      return {
        ...row,
        demo_elerheto: elerheto ? 1 : 0
      };
    });
  }

  // Összes kérdés megjelenítése
  // GET /kerdesek?modulId=2
  router.get('/kerdesek', ...kerdoivAccess, (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const sql = `
      SELECT k.*, COALESCE(raw_k.opcios, 0) AS opcios, raw_k.kategoria_kapcsolo_id AS kategoria_kapcsolo_id
      FROM kerdesek_kategoriaval k
      LEFT JOIN kerdesek raw_k ON raw_k.id = k.id
      LEFT JOIN kozos z ON z.id = k.osztott
      WHERE ${moduleAccessSql('k')}
        ${demoRestriction(req, 'k').sql}
      ORDER BY k.kindex ASC
    `;

    db.query(sql, [modulId, modulId, ...demoRestriction(req, 'k').params], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Hiba történt a kérdések lekérdezése során.');
      }
      res.status(200).json(results);
    });
  });

  // GET /api/get-fo_kategoriak?modulId=2
  router.get('/api/get-fo_kategoriak', ...kerdoivAccess, (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const sql = `
      SELECT
        ${normalizedSql('sajat.nev')} AS nev,
        sajat.leiras,
        sajat.szin,
        sajat.chart
      FROM fokategoriak sajat
      WHERE sajat.modul_id = ?
        AND sajat.nev IS NOT NULL
        AND ${normalizedSql('sajat.nev')} != ''

      UNION

      SELECT DISTINCT
        ${normalizedSql('v.fo_kategoria')} AS nev,
        f.leiras,
        f.szin,
        f.chart
      FROM kerdesek_kategoriaval v
      JOIN kozos z ON z.id = v.osztott
      LEFT JOIN fokategoriak f
        ON f.modul_id = v.modul_id
       AND ${normalizedSql('f.nev')} = ${normalizedSql('v.fo_kategoria')}
      WHERE z.modul_megosztott = ?
        AND v.modul_id = z.modul_megoszto
        AND v.fo_kategoria IS NOT NULL
        AND ${normalizedSql('v.fo_kategoria')} != ''
        AND NOT EXISTS (
          SELECT 1
          FROM fokategoriak sajat2
          WHERE sajat2.modul_id = ?
            AND ${normalizedSql('sajat2.nev')} = ${normalizedSql('v.fo_kategoria')}
        )

      ORDER BY nev ASC
    `;

    db.query(sql, [modulId, modulId, modulId], (err, rows) => {
      if (err) {
        console.error('DB-hiba (fo_kategoriak + megosztott):', err);
        return res.status(500).json({ message: 'DB-hiba (fo_kategoriak)' });
      }

      res.json(rows);
    });
  });

  // GET /api/get-al_kategoriak?fo_kategoria_id=...&modulId=2
  router.get('/api/get-al_kategoriak', ...kerdoivAccess, (req, res) => {
    const { fo_kategoria_id } = req.query;
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    if (!fo_kategoria_id) {
      return res.status(400).json({ message: 'Hiányzó fo_kategoria_id!' });
    }

    const sql = `
      SELECT DISTINCT
        ${normalizedSql('a.nev')} AS nev
      FROM alkategoriak a
      JOIN fokategoriak f ON f.id = a.fokategoria_id
      WHERE a.modul_id = ?
        AND ${normalizedSql('f.nev')} = ?
        AND a.nev IS NOT NULL
        AND ${normalizedSql('a.nev')} != ''

      UNION

      SELECT DISTINCT
        ${normalizedSql('v.al_kategoria')} AS nev
      FROM kerdesek_kategoriaval v
      JOIN kozos z ON z.id = v.osztott
      WHERE z.modul_megosztott = ?
        AND v.modul_id = z.modul_megoszto
        AND ${normalizedSql('v.fo_kategoria')} = ?
        AND v.al_kategoria IS NOT NULL
        AND ${normalizedSql('v.al_kategoria')} != ''

      ORDER BY nev ASC
    `;

    db.query(sql, [modulId, fo_kategoria_id, modulId, fo_kategoria_id], (err, rows) => {
      if (err) {
        console.error('DB-hiba (al_kategoriak + megosztott):', err);
        return res.status(500).json({ message: 'Hiba a lekérdezés során.' });
      }

      res.json(markDemoAvailability(req, rows, fo_kategoria_id));
    });
  });

  // GET /api/get-alt_temak?fo_kategoria_id=...&al_kategoria_id=...&modulId=2
  // Támogatott útvonalak:
  // 1) Főkategória → Alkategória → Altéma → Kérdés
  // 2) Főkategória → Altéma → Kérdés
  router.get('/api/get-alt_temak', ...kerdoivAccess, (req, res) => {
    const {
      fo_kategoria_id,
      al_kategoria_id
    } = req.query;

    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    if (!fo_kategoria_id) {
      return res.status(400).json({ message: 'Hiányzó fo_kategoria_id!' });
    }

    const cleanAlKategoria = cleanPathValue(al_kategoria_id);
    if (isDemoBlockedAlkategoria(req, fo_kategoria_id, cleanAlKategoria)) {
      return res.status(403).json({ success: false, code: 'DEMO_RESTRICTED_SUBCATEGORY', message: 'Ez az alkategória csak a teljes csomagban érhető el.' });
    }

    let sql = '';
    let params = [];

    if (cleanAlKategoria) {
      sql = `
        SELECT DISTINCT
          ${normalizedSql('t.nev')} AS nev
        FROM altemak t
        JOIN alkategoriak a ON a.id = t.alkategoria_id
        JOIN fokategoriak f ON f.id = a.fokategoria_id
        WHERE t.modul_id = ?
          AND ${normalizedSql('f.nev')} = ?
          AND ${normalizedSql('a.nev')} = ?
          AND t.nev IS NOT NULL
          AND ${normalizedSql('t.nev')} != ''

        UNION

        SELECT DISTINCT
          ${normalizedSql('v.alt_tema')} AS nev
        FROM kerdesek_kategoriaval v
        JOIN kozos z ON z.id = v.osztott
        WHERE z.modul_megosztott = ?
          AND v.modul_id = z.modul_megoszto
          AND ${normalizedSql('v.fo_kategoria')} = ?
          AND ${normalizedSql('v.al_kategoria')} = ?
          AND v.alt_tema IS NOT NULL
          AND ${normalizedSql('v.alt_tema')} != ''

        ORDER BY nev ASC
      `;

      params = [
        modulId,
        fo_kategoria_id,
        cleanAlKategoria,
        modulId,
        fo_kategoria_id,
        cleanAlKategoria
      ];
    } else {
      sql = `
        SELECT DISTINCT
          ${normalizedSql('t.nev')} AS nev
        FROM kategoria_kapcsolo kk
        JOIN fokategoriak f ON f.id = kk.fokategoria_id
        JOIN altemak t ON t.id = kk.altema_id
        WHERE kk.modul_id = ?
          AND ${normalizedSql('f.nev')} = ?
          AND (kk.alkategoria_id IS NULL OR kk.alkategoria_id = 0)
          AND t.nev IS NOT NULL
          AND ${normalizedSql('t.nev')} != ''

        UNION

        SELECT DISTINCT
          ${normalizedSql('v.alt_tema')} AS nev
        FROM kerdesek_kategoriaval v
        LEFT JOIN kozos z ON z.id = v.osztott
        WHERE ${normalizedSql('v.fo_kategoria')} = ?
          AND (v.al_kategoria IS NULL OR ${normalizedSql('v.al_kategoria')} = '')
          AND v.alt_tema IS NOT NULL
          AND ${normalizedSql('v.alt_tema')} != ''
          AND (
            v.modul_id = ?
            OR (
              v.osztott IS NOT NULL
              AND z.modul_megosztott = ?
              AND v.modul_id = z.modul_megoszto
            )
          )

        ORDER BY nev ASC
      `;

      params = [
        modulId,
        fo_kategoria_id,
        fo_kategoria_id,
        modulId,
        modulId
      ];
    }

    db.query(sql, params, (err, rows) => {
      if (err) {
        console.error('DB-hiba (alt_temak rugalmas):', err);
        return res.status(500).json({ message: 'Hiba a lekérdezés során.' });
      }

      res.json(rows);
    });
  });

  // GET /api/get-kerdesek?fo_kategoria_id=...&al_kategoria_id=...&alt_tema_id=...&modulId=2
  router.get('/api/get-kerdesek', ...kerdoivAccess, (req, res) => {
    const {
      fo_kategoria_id,
      al_kategoria_id,
      alt_tema_id
    } = req.query;

    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    if (!fo_kategoria_id) {
      return res.status(400).json({ message: 'Hiányzó fo_kategoria_id!' });
    }

    const cleanAlKategoria = cleanPathValue(al_kategoria_id);
    if (isDemoBlockedAlkategoria(req, fo_kategoria_id, cleanAlKategoria)) {
      return res.status(403).json({ success: false, code: 'DEMO_RESTRICTED_SUBCATEGORY', message: 'Ez az alkategória csak a teljes csomagban érhető el.' });
    }
    const cleanAltTema = cleanPathValue(alt_tema_id);

    const whereParts = [
      `${normalizedSql('k.fo_kategoria')} = ?`,
      'k.parent_id IS NULL',
      moduleAccessSql('k'),
      `k.kerdes_szoveg NOT LIKE '[Új%'`
    ];

    const params = [
      fo_kategoria_id,
      modulId,
      modulId
    ];

    if (cleanAlKategoria) {
      whereParts.push(`${normalizedSql('k.al_kategoria')} = ?`);
      params.push(cleanAlKategoria);
    } else {
      whereParts.push(`(k.al_kategoria IS NULL OR ${normalizedSql('k.al_kategoria')} = "")`);
    }

    if (cleanAltTema) {
      whereParts.push(`${normalizedSql('k.alt_tema')} = ?`);
      params.push(cleanAltTema);
    } else {
      whereParts.push(`(k.alt_tema IS NULL OR ${normalizedSql('k.alt_tema')} = "")`);
    }

    const sql = `
      SELECT DISTINCT
        k.kindex,
        k.id,
        k.kerdes_szoveg AS szoveg,
        k.parent_id,
        k.valasz_ag,
        k.negalt_kerdes_szoveg,
        k.szoveges,
        k.ertek,
        k.negalt_ertek,
        k.ossz_ertek,
        k.maximalis_szint,
        COALESCE(raw_k.opcios, 0) AS opcios,
        raw_k.kategoria_kapcsolo_id AS kategoria_kapcsolo_id,
        ${normalizedSql('k.fo_kategoria')} AS fo_kategoria,
        ${normalizedSql('k.al_kategoria')} AS al_kategoria,
        ${normalizedSql('k.alt_tema')} AS alt_tema
      FROM kerdesek_kategoriaval k
      LEFT JOIN kerdesek raw_k ON raw_k.id = k.id
      LEFT JOIN kozos z ON z.id = k.osztott
      WHERE ${whereParts.join('\n        AND ')}
        ${demoRestriction(req, 'k').sql}
      ORDER BY k.kindex ASC
    `;

    db.query(sql, [...params, ...demoRestriction(req, 'k').params], (err, rows) => {
      if (err) {
        console.error('DB-hiba (főkérdések):', err);
        return res.status(500).json({ message: 'Hiba a lekérdezés során.' });
      }

      res.json(rows);
    });
  });

  // GET /api/get-alkerdesek?parent_id=17&valasz_ag=nem&modulId=2
  router.get('/api/get-alkerdesek', ...kerdoivAccess, (req, res) => {
    const {
      parent_id,
      valasz_ag
    } = req.query;

    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const parentId = toPositiveInt(parent_id);

    if (!parentId || !valasz_ag) {
      return res.status(400).json({ message: 'Hiányzó vagy hibás parent_id vagy valasz_ag!' });
    }

    const sql = `
      SELECT
        k.kindex, k.id, k.kerdes_szoveg AS szoveg,
        k.parent_id, k.valasz_ag, k.negalt_kerdes_szoveg,
        k.szoveges, k.ertek, k.negalt_ertek,
        k.ossz_ertek, k.maximalis_szint,
        COALESCE(raw_k.opcios, 0) AS opcios,
        raw_k.kategoria_kapcsolo_id AS kategoria_kapcsolo_id
      FROM kerdesek_kategoriaval k
      LEFT JOIN kerdesek raw_k ON raw_k.id = k.id
      LEFT JOIN kozos z ON z.id = k.osztott
      WHERE k.parent_id = ?
        AND k.valasz_ag = ?
        AND ${moduleAccessSql('k')}
        ${demoRestriction(req, 'k').sql}
      ORDER BY k.kindex ASC
    `;

    db.query(sql, [parentId, valasz_ag, modulId, modulId, ...demoRestriction(req, 'k').params], (err, rows) => {
      if (err) {
        console.error('DB-hiba (alkerdesek):', err);
        return res.status(500).send('Hiba a lekérdezés során.');
      }
      res.json(rows);
    });
  });

  // POST /api/check-nem-ag-batch   { kerdesIds: [1,2,3], modulId: 2 }
  router.post('/api/check-nem-ag-batch', ...kerdoivAccess, (req, res) => {
    const { kerdesIds } = req.body;
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const cleanKerdesIds = uniquePositiveInts(kerdesIds);

    if (cleanKerdesIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Nincsenek érvényes kérdés-ID-k!' });
    }

    const placeholders = cleanKerdesIds.map(() => '?').join(', ');

    const sql = `
      SELECT k.parent_id, COUNT(*) AS count
      FROM kerdesek_kategoriaval k
      LEFT JOIN kerdesek raw_k ON raw_k.id = k.id
      LEFT JOIN kozos z ON z.id = k.osztott
      WHERE k.parent_id IN (${placeholders})
        AND k.valasz_ag = "nem"
        AND ${moduleAccessSql('k')}
        ${demoRestriction(req, 'k').sql}
      GROUP BY k.parent_id
    `;

    db.query(sql, [...cleanKerdesIds, modulId, modulId, ...demoRestriction(req, 'k').params], (err, rows) => {
      if (err) {
        console.error('DB-hiba (check-nem-ag):', err);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
      }

      const hasNemAgMap = {};
      rows.forEach(r => { hasNemAgMap[r.parent_id] = r.count > 0; });

      res.json({ success: true, hasNemAgMap });
    });
  });

  router.get('/api/get-all-alkerdesek', ...kerdoivAccess, (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const sql = `
      SELECT
        k.parent_id, k.id,
        k.kerdes_szoveg AS szoveg,
        k.valasz_ag, k.negalt_kerdes_szoveg,
        ${normalizedSql('k.fo_kategoria')} AS fo_kategoria,
        ${normalizedSql('k.al_kategoria')} AS al_kategoria,
        ${normalizedSql('k.alt_tema')} AS alt_tema,
        k.szoveges, k.ertek, k.negalt_ertek,
        k.kindex, k.ossz_ertek, k.maximalis_szint,
        COALESCE(raw_k.opcios, 0) AS opcios,
        raw_k.kategoria_kapcsolo_id AS kategoria_kapcsolo_id
      FROM kerdesek_kategoriaval k
      LEFT JOIN kerdesek raw_k ON raw_k.id = k.id
      LEFT JOIN kozos z ON z.id = k.osztott
      WHERE ${moduleAccessSql('k')}
        ${demoRestriction(req, 'k').sql}
      ORDER BY k.parent_id, k.kindex ASC
    `;

    db.query(sql, [modulId, modulId, ...demoRestriction(req, 'k').params], (err, rows) => {
      if (err) {
        console.error('DB-hiba (all-alkerdesek):', err);
        return res.status(500).json({ message: 'Hiba a lekérdezés során.' });
      }

      const alKerdesMap = {};
      rows.forEach(r => {
        (alKerdesMap[r.parent_id] ||= []).push(r);
      });

      res.json({ success: true, alKerdesMap });
    });
  });

  // POST /api/get-kerdesek-by-ids   { kerdesIds: [4, 7, 9], modulId: 2 }
  router.post('/api/get-kerdesek-by-ids', ...kerdoivAccess, (req, res) => {
    const { kerdesIds } = req.body;
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const cleanKerdesIds = uniquePositiveInts(kerdesIds);

    if (cleanKerdesIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Nincs megadva érvényes kérdésazonosító!' });
    }

    const placeholders = cleanKerdesIds.map(() => '?').join(', ');

    const sql = `
      SELECT
        k.kindex, k.id,
        k.kerdes_szoveg AS szoveg,
        k.parent_id, k.valasz_ag, k.negalt_kerdes_szoveg,
        ${normalizedSql('k.fo_kategoria')} AS fo_kategoria,
        ${normalizedSql('k.al_kategoria')} AS al_kategoria,
        ${normalizedSql('k.alt_tema')} AS alt_tema,
        k.szoveges, k.ertek, k.negalt_ertek,
        k.ossz_ertek, k.maximalis_szint,
        COALESCE(raw_k.opcios, 0) AS opcios,
        raw_k.kategoria_kapcsolo_id AS kategoria_kapcsolo_id
      FROM kerdesek_kategoriaval k
      LEFT JOIN kerdesek raw_k ON raw_k.id = k.id
      LEFT JOIN kozos z ON z.id = k.osztott
      WHERE k.id IN (${placeholders})
        AND ${moduleAccessSql('k')}
        ${demoRestriction(req, 'k').sql}
      ORDER BY k.kindex ASC
    `;

    db.query(sql, [...cleanKerdesIds, modulId, modulId, ...demoRestriction(req, 'k').params], (err, rows) => {
      if (err) {
        console.error('DB-hiba (kerdesek-by-ids):', err);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
      }
      res.json({ success: true, kerdesek: rows });
    });
  });
router.post('/api/fokusz-elmeny', ...kerdoivAccess, (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  const felhasznaloId =
    req.auth?.id ||
    req.auth?.userId ||
    req.session?.userId ||
    req.session?.felhasznaloId;

  if (!felhasznaloId) {
    return res.status(401).json({
      success: false,
      message: 'Nincs bejelentkezett felhasználó.'
    });
  }

  const {
    kitoltes_id,
    elemKulcs,
    tipus,
    tipusKulcs,
    akcio,
    szoveg,
    utvonal,
    valasz
  } = req.body || {};

  if (!elemKulcs) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó fókusz kulcs.'
    });
  }

  const cleanKitoltesId = toPositiveInt(kitoltes_id);

  // Feltöltőmodulos / kitöltés nélküli kattintásokat nem mentünk.
  // Ezek nem használhatók dashboardos "Folytatás" csempéhez.
  if (!cleanKitoltesId) {
    return res.status(400).json({
      success: false,
      message: 'Kitöltés nélküli fókusz-előzmény nem menthető.'
    });
  }

  const sql = `
    INSERT INTO felhasznalo_fokusz_elmenyek
    (
      felhasznalo_id,
      kitoltes_id,
      modul_id,
      elem_kulcs,
      tipus,
      tipus_kulcs,
      akcio,
      szoveg,
      utvonal_json,
      valasz
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    felhasznaloId,
    cleanKitoltesId,
    modulId,
    String(elemKulcs || '').slice(0, 255),
    String(tipus || '').slice(0, 50),
    String(tipusKulcs || '').slice(0, 50),
    String(akcio || '').slice(0, 100),
    String(szoveg || ''),
    JSON.stringify(Array.isArray(utvonal) ? utvonal : []),
    String(valasz || '').slice(0, 50)
  ], (err) => {
    if (err) {
      console.error('DB-hiba (fokusz-elmeny mentés):', err);
      return res.status(500).json({
        success: false,
        message: 'Fókusz előzmény mentési hiba.'
      });
    }

    res.json({ success: true });
  });
});


router.get('/api/fokusz-elmenyek', ...kerdoivAccess, (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  const felhasznaloId =
    req.auth?.id ||
    req.auth?.userId ||
    req.session?.userId ||
    req.session?.felhasznaloId;

  if (!felhasznaloId) {
    return res.status(401).json({
      success: false,
      message: 'Nincs bejelentkezett felhasználó.'
    });
  }

  const kitoltesId = toPositiveInt(req.query.kitoltes_id);
  const limit = Math.min(toPositiveInt(req.query.limit) || 30, 50);

  /*
    Ha konkrét kitöltésből kérjük:
      /api/fokusz-elmenyek?kitoltes_id=47

    Akkor csak annak az előzményei jönnek.

    Ha dashboardról kérjük:
      /api/fokusz-elmenyek?limit=1

    Akkor csak valódi kitöltéshez tartozó előzmény jöhet vissza.
    A feltöltőmodulos NULL kitoltes_id sorok kizárva.
  */
  const whereKitoltes = kitoltesId
    ? 'AND kitoltes_id = ?'
    : 'AND kitoltes_id IS NOT NULL';

  const params = kitoltesId
    ? [felhasznaloId, modulId, kitoltesId, limit]
    : [felhasznaloId, modulId, limit];

  const sql = `
    SELECT
      id,
      kitoltes_id,
      elem_kulcs AS elemKulcs,
      tipus,
      tipus_kulcs AS tipusKulcs,
      akcio,
      szoveg,
      utvonal_json,
      valasz,
      letrehozva
    FROM felhasznalo_fokusz_elmenyek
    WHERE felhasznalo_id = ?
      AND modul_id = ?
      ${whereKitoltes}
    ORDER BY letrehozva DESC
    LIMIT ?
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('DB-hiba (fokusz-elmenyek):', err);
      return res.status(500).json({
        success: false,
        message: 'Fókusz előzmények lekérési hiba.'
      });
    }

    const data = rows.map(row => ({
      id: row.id,
      kitoltes_id: row.kitoltes_id,
      elemKulcs: row.elemKulcs,
      tipus: row.tipus,
      tipusKulcs: row.tipusKulcs,
      akcio: row.akcio,
      szoveg: row.szoveg,
      utvonal: safeParseJsonArray(row.utvonal_json),
      valasz: row.valasz,
      iso: row.letrehozva
    }));

    res.json({ success: true, data });
  });
});

function safeParseJsonArray(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
  return router;
}

module.exports = kerdoiv;
