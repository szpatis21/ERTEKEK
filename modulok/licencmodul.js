const express = require('express');
const router = express.Router();

const FALLBACK_PACKAGES = {
  demo: { kod: 'demo', nev: 'Demo', max_felhasznalo: 1, max_ertekelo: 1, max_elemzo: 0, max_feltolto: 0 },
  start: { kod: 'start', nev: 'Értékek Start', max_felhasznalo: 2, max_ertekelo: 2, max_elemzo: 0, max_feltolto: 0 },
  pro: { kod: 'pro', nev: 'Értékek Pro', max_felhasznalo: 5, max_ertekelo: 3, max_elemzo: 2, max_feltolto: 0 },
  sajat: { kod: 'sajat', nev: 'Értékek Saját Rendszer', max_felhasznalo: 3, max_ertekelo: 0, max_elemzo: 0, max_feltolto: 3 },
  fenntartoi: { kod: 'fenntartoi', nev: 'Fenntartói csomag', max_felhasznalo: 50, max_ertekelo: 30, max_elemzo: 10, max_feltolto: 10 }
};

function q(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function normalizePackageCode(value) {
  const code = String(value || '').trim().toLowerCase();
  return ['demo', 'start', 'pro', 'sajat', 'fenntartoi'].includes(code) ? code : 'start';
}

function numberOrFallback(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number(fallback || 0);
}

function normalizePackageRequestType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (['user_expansion', 'felhasznalo_bovites', 'user_bovites'].includes(raw)) return 'user_expansion';
  if (['custom_material_addon', 'sajat_szakmai_anyag', 'own_material_addon'].includes(raw)) return 'custom_material_addon';
  if (['permission_upgrade', 'jogosultsag_bovites', 'role_upgrade'].includes(raw)) return 'permission_upgrade';
  return 'package_change';
}

function packageRequestTypeLabel(type) {
  if (type === 'user_expansion') return 'Felhasználói keret bővítése';
  if (type === 'custom_material_addon') return 'Saját szakmai anyag plusz szolgáltatás';
  if (type === 'permission_upgrade') return 'Jogosultság bővítési kérelem';
  return 'Csomagváltás';
}

function extractPendingRequestType(note = '') {
  const match = String(note || '').match(/Kérelem típusa:\s*([^\n]+)/i);
  return normalizePackageRequestType(match ? match[1] : 'package_change');
}

function formatPendingRequest(row = {}) {
  const requestType = extractPendingRequestType(row.megjegyzes || '');
  return {
    id: row.id,
    statusz: row.statusz,
    requestType,
    requestTypeLabel: packageRequestTypeLabel(requestType),
    csomagKod: row.csomag_kod || '',
    packageName: row.csomag_nev || row.csomag_kod || 'Folyamatban lévő kérelem',
    maxFelhasznalo: row.max_felhasznalo || null
  };
}

module.exports = function licencModul(db) {
  const {
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    requireRole
  } = require('./security')(db);

  const { getLicenseStatus } = require('./licenseHelper');

  router.get('/api/license-status', requireLogin, attachUserContext, requireModuleAccess, async (req, res) => {
    try {
      const status = await getLicenseStatus(db, req);
      let pendingRequest = null;

      try {
        const userRows = await q(
          db,
          'SELECT int_id FROM felhasznalok WHERE id = ? LIMIT 1',
          [req.auth.userId]
        );
        const intId = Number(userRows[0]?.int_id || 0);

        if (intId > 0) {
          const pendingRows = await q(
            db,
            `
            SELECT e.id, e.statusz, e.max_felhasznalo, e.megjegyzes,
                   c.kod AS csomag_kod, c.nev AS csomag_nev
            FROM elofizetesek e
            LEFT JOIN csomagok c ON c.id = e.csomag_id
            WHERE e.tulajdonos_tipus = 'institution'
              AND e.intezmeny_id = ?
              AND e.aktiv = 0
              AND e.statusz IN ('pending', 'pending_request')
            ORDER BY e.id DESC
            LIMIT 1
            `,
            [intId]
          );

          pendingRequest = pendingRows.length ? formatPendingRequest(pendingRows[0]) : null;
        }
      } catch (pendingErr) {
        console.error('[license-status pending kérelem hiba]', pendingErr);
      }

      res.json({ success: true, ...status, pendingRequest });
    } catch (err) {
      console.error('[license-status hiba]', err);
      res.status(500).json({ success: false, message: 'Licencállapot lekérése sikertelen.' });
    }
  });

  router.get('/api/public-packages', async (req, res) => {
    const fallback = [
      { kod: 'demo', nev: 'Demo', ar_havi: 0, ar_negyedeves: 0, ar_eves: 0, max_felhasznalo: 1, max_ertekelo: 1, max_elemzo: 0, max_feltolto: 0, leiras: '3 napos kipróbálás, csökkentett szakmai anyag.' },
      { kod: 'start', nev: 'Értékek Start', ar_havi: 18900, ar_negyedeves: 75000, ar_eves: 222000, max_felhasznalo: 2, max_ertekelo: 2, max_elemzo: 0, max_feltolto: 0, leiras: 'Kész szakmai anyag, értékelés, PDF, MI és megosztás.' },
      { kod: 'pro', nev: 'Értékek Pro', ar_havi: 24900, ar_negyedeves: 139000, ar_eves: 279000, max_felhasznalo: 5, max_ertekelo: 3, max_elemzo: 2, max_feltolto: 0, leiras: 'Audit, megosztás, AI és intézményi használat.' },
      { kod: 'sajat', nev: 'Értékek Saját Rendszer', ar_havi: 19900, ar_negyedeves: 79000, ar_eves: 189000, max_felhasznalo: 3, max_ertekelo: 0, max_elemzo: 0, max_feltolto: 3, leiras: 'Saját szakmai anyag feltöltése. Egyedi egyeztetés.' }
    ];

    try {
      const rows = await new Promise((resolve, reject) => {
        db.query(
          `SELECT kod, nev, leiras, ar_havi, ar_negyedeves, ar_eves, max_felhasznalo, max_ertekelo, max_elemzo, max_feltolto, trial_nap, trial_ertekeles_limit, ai_enabled, audit_enabled, feltolto_enabled, megosztas_enabled, pdf_enabled, group_statistics FROM csomagok WHERE aktiv = 1 ORDER BY sorrend ASC, id ASC`,
          (err, result) => err ? reject(err) : resolve(result)
        );
      });
      res.json({ success: true, packages: rows.length ? rows : fallback });
    } catch {
      res.json({ success: true, packages: fallback });
    }
  });

  router.post('/api/sysadmin/resolve-package-request', requireLogin, attachUserContext, requireModuleAccess, requireRole(4), async (req, res) => {
    const requestId = Number(req.body.requestId || req.body.id);
    const action = String(req.body.action || req.body.statusz || 'closed').trim().toLowerCase();
    const megjegyzes = String(req.body.megjegyzes || '').trim().slice(0, 800);

    const allowedActions = {
      closed: 'closed',
      lezart: 'closed',
      rejected: 'rejected',
      elutasitva: 'rejected',
      cancelled: 'cancelled',
      torolve: 'cancelled'
    };
    const nextStatus = allowedActions[action] || 'closed';

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, message: 'Érvénytelen kérelem ID.' });
    }

    const note = [
      `Sysadmin kérelem lezárás: ${new Date().toISOString()}`,
      `Új státusz: ${nextStatus}`,
      megjegyzes ? `Megjegyzés: ${megjegyzes}` : ''
    ].filter(Boolean).join('\n');

    try {
      const result = await q(
        db,
        `
        UPDATE elofizetesek
        SET statusz = ?,
            aktiv = 0,
            megjegyzes = CONCAT(
              COALESCE(megjegyzes, ''),
              CASE WHEN COALESCE(megjegyzes, '') = '' THEN '' ELSE '\n' END,
              ?
            )
        WHERE id = ?
          AND statusz IN ('pending', 'pending_request')
        `,
        [nextStatus, note, requestId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Nincs ilyen nyitott kérelem, vagy már le lett zárva.' });
      }

      return res.json({ success: true, message: 'A kérelmet lezártuk.', requestId, statusz: nextStatus });
    } catch (err) {
      console.error('[resolve-package-request hiba]', err);
      return res.status(500).json({ success: false, message: 'A kérelem lezárása sikertelen.' });
    }
  });

  router.post('/api/sysadmin/activate-institution', requireLogin, attachUserContext, requireModuleAccess, requireRole(4), async (req, res) => {
    const intId = Number(req.body.intId || req.body.id);
    const csomagKod = normalizePackageCode(req.body.csomagKod || req.body.csomag_kod || 'start');
    const honapok = Number(req.body.honapok || 12);
    const megjegyzes = String(req.body.megjegyzes || '').trim();

    if (!Number.isInteger(intId) || intId <= 0) {
      return res.status(400).json({ success: false, message: 'Érvénytelen intézmény ID.' });
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + (Number.isFinite(honapok) && honapok > 0 ? honapok : 12));
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    try {
      const packageRows = await q(
        db,
        `
        SELECT id, kod, max_felhasznalo, max_ertekelo, max_elemzo, max_feltolto
        FROM csomagok
        WHERE kod = ? AND aktiv = 1
        LIMIT 1
        `,
        [csomagKod]
      );

      const fallbackPackage = FALLBACK_PACKAGES[csomagKod] || FALLBACK_PACKAGES.start;
      const packageRow = packageRows[0] || fallbackPackage;
      const packageId = Number(packageRow.id || 0);

      let pendingRequest = null;
      if (packageId > 0) {
        const pendingRows = await q(
          db,
          `
          SELECT id, max_felhasznalo, max_ertekelo, max_elemzo, max_feltolto, megjegyzes
          FROM elofizetesek
          WHERE tulajdonos_tipus = 'institution'
            AND intezmeny_id = ?
            AND csomag_id = ?
            AND statusz = 'pending'
            AND aktiv = 0
          ORDER BY id DESC
          LIMIT 1
          `,
          [intId, packageId]
        );

        pendingRequest = pendingRows[0] || null;
      }

      const maxFelhasznalo = numberOrFallback(
        req.body.maxFelhasznalo || req.body.intfo || pendingRequest?.max_felhasznalo,
        packageRow.max_felhasznalo || fallbackPackage.max_felhasznalo
      );

      const activationNote = [
        megjegyzes,
        pendingRequest ? `Aktivált csomagváltási kérelem ID: ${pendingRequest.id}` : '',
        `Aktivált felhasználói keret: ${maxFelhasznalo} fő`
      ].filter(Boolean).join('\n');

      const sql = `
        UPDATE intezmeny
        SET validalva = 1,
            aktiv = 1,
            fizetes_beerkezett = 1,
            fizetes_beerkezett_at = COALESCE(fizetes_beerkezett_at, NOW()),
            fizetve = ?,
            licenc_kezdete = ?,
            licenc_vege = ?,
            csomag_kod = ?,
            intfo = ?,
            idoszak = 'active',
            sysadmin_megjegyzes = CASE
              WHEN ? = '' THEN sysadmin_megjegyzes
              ELSE CONCAT(COALESCE(sysadmin_megjegyzes, ''), CASE WHEN COALESCE(sysadmin_megjegyzes, '') = '' THEN '' ELSE '\n' END, ?)
            END
        WHERE id = ?
      `;

      const result = await q(
        db,
        sql,
        [startDate, startDate, endDate, csomagKod, maxFelhasznalo, activationNote, activationNote, intId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Intézmény nem található.' });
      }

      if (pendingRequest) {
        try {
          await q(
            db,
            `
            UPDATE elofizetesek
            SET statusz = 'active',
                aktiv = 1,
                szerzodes_visszaerkezett = 1,
                fizetes_beerkezett = 1,
                licenc_kezdete = ?,
                licenc_vege = ?,
                megjegyzes = CONCAT(
                  COALESCE(megjegyzes, ''),
                  CASE WHEN COALESCE(megjegyzes, '') = '' THEN '' ELSE '\n' END,
                  ?
                )
            WHERE id = ?
            `,
            [startDate, endDate, `Aktiválva: ${new Date().toISOString()}`, pendingRequest.id]
          );
        } catch (subscriptionErr) {
          console.error('[activate-institution elofizetesek frissítési hiba]', subscriptionErr);
        }
      }

      return res.json({
        success: true,
        licenc_kezdete: startDate,
        licenc_vege: endDate,
        csomag_kod: csomagKod,
        intfo: maxFelhasznalo
      });
    } catch (err) {
      console.error('[activate-institution hiba]', err);
      return res.status(500).json({ success: false, message: 'Aktiválás sikertelen.' });
    }
  });

  return router;
};
