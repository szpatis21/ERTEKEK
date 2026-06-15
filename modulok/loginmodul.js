const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

module.exports = (db) => {
  const logger = require('./logmodul')(db);

  const {
    requireLogin,
    attachUserContext,
    requireModuleAccess
  } = require('./security')(db);

  function q(sql, params = []) {
    return new Promise((resolve, reject) =>
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    );
  }

  function toPositiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function getAllowedLoginRoles(actualRoleId, includeSysadmin = false) {
    const roleId = Number(actualRoleId);

    if (roleId === 4) {
      return includeSysadmin ? [4, 1, 2, 3] : [1, 2, 3];
    }

    if (roleId === 1) return [1, 2, 3];
    if (roleId === 2) return [2, 3];
    if (roleId === 3) return [3];

    return [];
  }

  function getRedirectByRole(roleId) {
    switch (Number(roleId)) {
      case 1:
        return '/admin/dashboard.html';
      case 2:
        return '/elemzo/dashboard.html';
      case 3:
        return '/user/dashboard.html';
      case 4:
        return '/sysadmin/dashboard.html';
      default:
        return null;
    }
  }

  function getRoleOptionsForSwitch(actualRoleId) {
    const allRoles = [
      { id: 1, nev: 'Feltöltő' },
      { id: 2, nev: 'Elemző' },
      { id: 3, nev: 'Értékelő' }
    ];

    const allowedIds = getAllowedLoginRoles(actualRoleId, false);
    return allRoles.filter(role => allowedIds.includes(role.id));
  }

  function getRoleOptionsForLogin(actualRoleId) {
    const allRoles = [
      { id: 4, nev: 'Admin' },
      { id: 1, nev: 'Feltöltő' },
      { id: 2, nev: 'Elemző' },
      { id: 3, nev: 'Értékelő' }
    ];

    const allowedIds = getAllowedLoginRoles(actualRoleId, true);
    return allRoles.filter(role => allowedIds.includes(role.id));
  }
async function getModuleOptionsForLogin(user) {
  return q(
    `
    SELECT DISTINCT
      m.id,
      m.nev,
      m.leiras
    FROM jogosultsagok j
    JOIN modulok m ON m.id = j.modul_id
    WHERE j.user_id = ?
      AND j.aktiv = 1
    ORDER BY m.id ASC
    `,
    [user.id]
  );
}



  function bool(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function normalizePackageCode(value) {
    return String(value || '').trim().toLowerCase();
  }

  async function getPendingActivationBlock(user) {
    if (!user || Number(user.role_id) === 4 || !user.int_id) return null;

    const rows = await q(
      `
      SELECT id, intnev, csomag_kod, idoszak, aktiv, validalva, fizetes_beerkezett, fizetve
      FROM intezmeny
      WHERE id = ?
      LIMIT 1
      `,
      [user.int_id]
    );

    if (!rows.length) return null;

    const institution = rows[0];
    const packageCode = normalizePackageCode(institution.csomag_kod || institution.idoszak);
    const paidPackages = new Set(['start', 'pro', 'sajat', 'fenntartoi']);
    const activated = bool(institution.aktiv) || (bool(institution.validalva) && (bool(institution.fizetes_beerkezett) || !!institution.fizetve));

    if (paidPackages.has(packageCode) && !activated) {
      return {
        code: 'PENDING_ACTIVATION',
        message: `Az intézményi hozzáférés még nincs aktiválva (${institution.intnev || 'intézmény'}). A belépéshez a szerződés és a fizetés rendezése, majd sysadmin aktiválás szükséges.`
      };
    }

    return null;
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  const requireSessionAndModule = [
    requireLogin,
    attachUserContext,
    requireModuleAccess
  ];

  const requireSessionOnly = [
    requireLogin,
    attachUserContext
  ];

  // Bejelentkezés előkészítése: felhasználónév + jelszó alapján visszaadja a választható modulokat és szerepköröket.
  router.post('/login-options', async (req, res) => {
    try {
      const { fnev, pass } = req.body;
      const cleanFnev = String(fnev || '').trim();

      if (!cleanFnev || !pass) {
        return res.json({ success: false, message: 'Felhasználónév és jelszó megadása kötelező.' });
      }

      const users = await q('SELECT * FROM felhasznalok WHERE fnev = ? LIMIT 1', [cleanFnev]);
      if (users.length === 0) {
        return res.json({ success: false, message: 'Hibás felhasználónév vagy jelszó' });
      }

      const user = users[0];
      const pwOk = await bcrypt.compare(pass, user.pass);
      if (!pwOk) {
        return res.json({ success: false, message: 'Hibás felhasználónév vagy jelszó' });
      }

      const pendingBlock = await getPendingActivationBlock(user);
      if (pendingBlock) {
        return res.json({ success: false, code: pendingBlock.code, message: pendingBlock.message });
      }

      const roles = getRoleOptionsForLogin(user.role_id);
      const modules = await getModuleOptionsForLogin(user);

      if (!roles.length) {
        return res.json({ success: false, message: 'Nincs érvényes szerepköröd a belépéshez.' });
      }

      if (!modules.length) {
        return res.json({ success: false, message: 'Nincs aktív modul-hozzáférésed.' });
      }

      const hasMultipleRoles = roles.length > 1;
      const hasMultipleModules = modules.length > 1;

      return res.json({
        success: true,
        requiresChoice: hasMultipleRoles || hasMultipleModules,
        hasMultipleRoles,
        hasMultipleModules,
        defaultRoleId: roles[0].id,
        defaultModulId: modules[0].id,
        roles,
        modules
      });
    } catch (err) {
      console.error('Bejelentkezési opciók lekérdezési hiba:', err);
      return res.json({ success: false, message: 'Belső szerverhiba történt' });
    }
  });

  // Bejelentkezési útvonal
  router.post('/login', async (req, res) => {
    try {
      const { fnev, pass, modul_id, szerepkor } = req.body;

      const mod = toPositiveInt(modul_id);
      const requestedRoleId = toPositiveInt(szerepkor);

      if (!mod) {
        return res.json({ success: false, message: 'Érvénytelen modul-azonosító' });
      }

      if (!requestedRoleId) {
        return res.json({ success: false, message: 'Érvénytelen szerepkör-azonosító' });
      }

      const users = await q('SELECT * FROM felhasznalok WHERE fnev = ? LIMIT 1', [fnev]);
      if (users.length === 0) {
        return res.json({ success: false, message: 'Hibás felhasználónév vagy jelszó' });
      }

      const user = users[0];
      const pwOk = await bcrypt.compare(pass, user.pass);
      if (!pwOk) {
        return res.json({ success: false, message: 'Hibás felhasználónév vagy jelszó' });
      }

      const pendingBlock = await getPendingActivationBlock(user);
      if (pendingBlock) {
        return res.json({ success: false, code: pendingBlock.code, message: pendingBlock.message });
      }

      const modulRows = await q(
        'SELECT id FROM modulok WHERE id = ? LIMIT 1',
        [mod]
      );

      if (modulRows.length === 0) {
        return res.json({
          success: false,
          message: 'A kiválasztott modul nem található'
        });
      }

      if (Number(user.role_id) !== 4) {
        const perms = await q(
          `
          SELECT 1
          FROM jogosultsagok
          WHERE user_id = ?
            AND modul_id = ?
            AND aktiv = 1
          LIMIT 1
          `,
          [user.id, mod]
        );

        if (perms.length === 0) {
          return res.json({ success: false, message: 'Nincs jogosultságod a kiválasztott témakörhöz' });
        }
      }

      const allowedLogins = getAllowedLoginRoles(user.role_id, true);
      if (!allowedLogins.includes(requestedRoleId)) {
        return res.json({
          success: false,
          message: 'Nincs jogosultságod ezzel a szerepkörrel belépni'
        });
      }

      const redirect = getRedirectByRole(requestedRoleId);
      if (!redirect) {
        return res.json({ success: false, message: 'Ismeretlen szerepkör' });
      }

      req.session.userId = user.id;
      req.session.modulId = mod;
      req.session.roleId = requestedRoleId;
      req.session.actualRoleId = user.role_id;
      req.session.isAdmin = requestedRoleId === 1 || requestedRoleId === 4;

      logger(req, user.id, 'belépés', { modul: mod, szerepkor: requestedRoleId });

      req.session.save((err) => {
        if (err) {
          console.error('Session mentési hiba login után:', err);
          return res.json({
            success: false,
            message: 'Szerverhiba a munkamenet mentésekor!'
          });
        }

        return res.json({ success: true, redirect });
      });
    } catch (err) {
      console.error('Bejelentkezési hiba:', err);
      return res.json({ success: false, message: 'Belső szerverhiba történt' });
    }
  });

  // Felhasználó + aktuális modul adatai
  router.get('/get-username', ...requireSessionAndModule, async (req, res) => {
    try {
      const userId = req.auth.userId;
      const modulId = req.auth.modulId;
      const currentRoleId = req.auth.roleId || null;
      const isSysadmin = req.auth.isSysadmin === true;

      const sqlUser = `
        SELECT
          f.id,
          f.fnev,
          f.vez,
          f.int_id,
          f.tel,
          f.mail,
          i.intnev,
          i.intfin,
          i.fizetve,
          r.role,
          r.leiras
        FROM felhasznalok f
        LEFT JOIN intezmeny i ON f.int_id = i.id
        LEFT JOIN roles r ON r.id = COALESCE(?, f.role_id)
        WHERE f.id = ?
        LIMIT 1
      `;

      const userRows = await q(sqlUser, [currentRoleId, userId]);
      if (userRows.length === 0) {
        return res.json({ success: false, message: 'Felhasználó nem található' });
      }

      const user = userRows[0];

      let modList = [];
      if (isSysadmin) {
        modList = await q(
          `
          SELECT
            id,
            nev,
            leiras,
            COALESCE(szamolas, 0) AS szamolas
          FROM modulok
          ORDER BY id ASC
          `
        );
      } else {
        modList = await q(
          `
          SELECT
            m.id,
            m.nev,
            m.leiras,
            COALESCE(m.szamolas, 0) AS szamolas
          FROM jogosultsagok j
          JOIN modulok m ON m.id = j.modul_id
          WHERE j.user_id = ?
            AND j.aktiv = 1
          ORDER BY m.id ASC
          `,
          [userId]
        );
      }

      const modRows = await q(
        `
        SELECT
          nev,
          leiras,
          COALESCE(szamolas, 0) AS szamolas
        FROM modulok
        WHERE id = ?
        LIMIT 1
        `,
        [modulId]
      );

      const modulNev = modRows[0]?.nev || 'Ismeretlen modul';
      const modulLeiras = modRows[0]?.leiras || null;
      const rawSzamolas = modRows[0]?.szamolas ?? 0;
      const szamolas =
        rawSzamolas === 1 ||
        rawSzamolas === '1' ||
        rawSzamolas === 'pontosszegzes'
          ? 1
          : 0;

      return res.json({
        success: true,
        ...formatUser(user),
        modulId,
        modulNev,
        modulLeiras,
        szamolas,
        role: user.role ?? null,
        leiras: user.leiras ?? null,
        hozzaferesModulok: modList,
        hozzaferhetoModulok: modList
      });
    } catch (err) {
      console.error('get-username hiba:', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt' });
    }
  });

  function formatUser(u) {
    return {
      id: u.id,
      username: u.fnev,
      tel: u.tel,
      vez: u.vez,
      mail: u.mail,
      int_id: u.int_id,
      fizetve: u.fizetve || null,
      intfin: u.intfin || null,
      intnev: u.intnev || 'Nincs intézmény hozzárendelve',
      role: u.role || 'Nincs szerepkör',
      leiras: u.leiras || ''
    };
  }

  // Intézményi felhasználók: kizárólag a session intézménye és aktuális modulja alapján.
  router.get('/get-users-by-institution', ...requireSessionAndModule, async (req, res) => {
    try {
      const userId = req.auth.userId;
      const intId = req.auth.intId;
      const modulId = req.auth.modulId;

      if (!Number.isInteger(intId) || intId <= 0) {
        return res.status(403).json({ success: false, message: 'Nincs érvényes intézményi kapcsolat.' });
      }

      const users = await q(
        `
        SELECT DISTINCT
          f.id,
          f.vez,
          f.mail
        FROM felhasznalok f
        INNER JOIN jogosultsagok j ON f.id = j.user_id
        WHERE f.int_id = ?
          AND j.modul_id = ?
          AND j.aktiv = 1
          AND f.id <> ?
        ORDER BY f.vez ASC
        `,
        [intId, modulId, userId]
      );

      return res.json({
        success: true,
        users
      });
    } catch (err) {
      console.error('get-users-by-institution hiba:', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt' });
    }
  });

  // Mail cím alapján felhasználó visszaadása megosztáshoz.
  // Nem a kliens modul_id-ja dönt, hanem az aktuális session modul.
  router.get('/check-mailname2', ...requireSessionAndModule, async (req, res) => {
    try {
      const mailname = normalizeEmail(req.query.mailname);
      const userId = req.auth.userId;
      const intId = req.auth.intId;
      const modulId = req.auth.modulId;

      if (!mailname) {
        return res.status(400).json({ success: false, message: 'Hiányzó e-mail cím.' });
      }

      const rows = await q(
        `
        SELECT
          f.id,
          f.vez
        FROM felhasznalok f
        INNER JOIN jogosultsagok j ON f.id = j.user_id
        WHERE LOWER(f.mail) = ?
          AND f.int_id = ?
          AND j.modul_id = ?
          AND j.aktiv = 1
          AND f.id <> ?
        LIMIT 1
        `,
        [mailname, intId, modulId, userId]
      );

      if (rows.length === 0) {
        return res.json({
          success: false,
          exists: false,
          message: 'Nincs ilyen e-mail, vagy nincs jogosultsága az aktuális modulhoz/intézményhez.'
        });
      }

      return res.json({
        success: true,
        exists: true,
        id: rows[0].id,
        vez: rows[0].vez
      });
    } catch (err) {
      console.error('check-mailname2 hiba:', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt' });
    }
  });

  // Már megosztott felhasználók betöltése.
  // Csak az eredeti tulajdonos kérheti le az aktuális modulban.
  router.get('/get_shared_users', ...requireSessionAndModule, async (req, res) => {
    try {
      const idk = toPositiveInt(req.query.idk);
      const userId = req.auth.userId;
      const modulId = req.auth.modulId;

      if (!idk) {
        return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás idk paraméter!' });
      }

      const ownerRows = await q(
        `
        SELECT 1
        FROM kitoltesek
        WHERE idk = ?
          AND modul_id = ?
          AND felhasznalo_id = ?
          AND role IN ('admin', 'sysadmin')
        LIMIT 1
        `,
        [idk, modulId, userId]
      );

      if (ownerRows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Nincs jogosultságod ennek a megosztásnak a kezeléséhez.'
        });
      }

      const results = await q(
        `
        SELECT
          k.felhasznalo_id AS id,
          k.role,
          f.vez AS fullname
        FROM kitoltesek k
        JOIN felhasznalok f ON k.felhasznalo_id = f.id
        WHERE k.idk = ?
          AND k.modul_id = ?
          AND k.role = 'editor'
        ORDER BY f.vez ASC
        `,
        [idk, modulId]
      );

      return res.json(results);
    } catch (err) {
      console.error('get_shared_users hiba:', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
    }
  });

  // Megosztott szerep eltávolítása.
  // A frontend küldheti a cél user id-t, de a backend csak akkor módosít,
  // ha a bejelentkezett user az adott idk eredeti tulajdonosa az aktuális modulban.
  router.post('/delete_role', ...requireSessionAndModule, async (req, res) => {
    try {
      const felhasznalo_id = toPositiveInt(req.body.felhasznalo_id);
      const idk = toPositiveInt(req.body.idk);
      const userId = req.auth.userId;
      const modulId = req.auth.modulId;

      if (!felhasznalo_id || !idk) {
        return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás adatok!' });
      }

      if (felhasznalo_id === userId) {
        return res.status(400).json({ success: false, message: 'Saját tulajdonosi hozzáférés nem távolítható el itt.' });
      }

      const újRole = 'removed';

      const result = await q(
        `
        UPDATE kitoltesek target
        JOIN kitoltesek owner
          ON owner.idk = target.idk
         AND owner.modul_id = target.modul_id
        SET target.role = ?
        WHERE target.felhasznalo_id = ?
          AND target.idk = ?
          AND target.modul_id = ?
          AND target.role = 'editor'
          AND owner.felhasznalo_id = ?
          AND owner.role IN ('admin', 'sysadmin')
        `,
        [újRole, felhasznalo_id, idk, modulId, userId]
      );

      if (!result || result.affectedRows === 0) {
        return res.status(403).json({
          success: false,
          message: 'Nincs jogosultságod ezt a megosztást eltávolítani, vagy nincs ilyen aktív megosztás.'
        });
      }

      logger(req, userId, 'megosztás eltávolítása', { idk, felhasznalo_id });
      return res.json({ success: true });
    } catch (err) {
      console.error('delete_role hiba:', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
    }
  });

  // Átjelentkezési információk lekérése.
  // Itt szándékosan nincs requireModuleAccess, hogy visszavont aktuális moduljog esetén is lehessen másik jogosult modulra váltani.
  router.get('/switch-info', ...requireSessionOnly, async (req, res) => {
    try {
      const userId = req.auth.userId;
      const actualRoleId = Number(req.auth.realRoleId || req.auth.actualRoleId);
      const currentModulId = Number(req.session.modulId) || null;
      const currentRoleId = Number(req.session.roleId) || actualRoleId;
      const roles = getRoleOptionsForSwitch(actualRoleId);

      let modData = [];
      if (Number(actualRoleId) === 4) {
        modData = await q(`
          SELECT id, nev, leiras
          FROM modulok
          ORDER BY id ASC
        `);
      } else {
        modData = await q(
          `
          SELECT m.id, m.nev, m.leiras
          FROM jogosultsagok j
          JOIN modulok m ON m.id = j.modul_id
          WHERE j.user_id = ?
            AND j.aktiv = 1
          ORDER BY m.id ASC
          `,
          [userId]
        );
      }

      return res.json({
        success: true,
        currentRoleId,
        currentModulId,
        roles,
        modules: modData
      });
    } catch (err) {
      console.error('Hiba a switch-info lekérésekor:', err);
      return res.json({
        success: false,
        message: 'Adatbázis hiba történt'
      });
    }
  });

  // Átjelentkezés végrehajtása.
  // A cél modul és cél szerepkör ellenőrzése itt történik meg adatbázisból.
  router.post('/switch-execute', ...requireSessionOnly, async (req, res) => {
    try {
      const userId = req.auth.userId;
      const actualRoleId = Number(req.auth.realRoleId || req.auth.actualRoleId);
      const newModulId = toPositiveInt(req.body.modul_id);
      const newRoleId = toPositiveInt(req.body.szerepkor);

      if (!newModulId || !newRoleId) {
        return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás modul/szerepkör adat.' });
      }

      const modulRows = await q(
        'SELECT id FROM modulok WHERE id = ? LIMIT 1',
        [newModulId]
      );

      if (modulRows.length === 0) {
        return res.json({
          success: false,
          message: 'A választott modul nem található!'
        });
      }

      const allowedRoles = getAllowedLoginRoles(actualRoleId, false);
      if (!allowedRoles.includes(newRoleId)) {
        return res.json({ success: false, message: 'Nincs jogosultságod ehhez a szerepkörhöz!' });
      }

      if (Number(actualRoleId) !== 4) {
        const perms = await q(
          `
          SELECT 1
          FROM jogosultsagok
          WHERE user_id = ?
            AND modul_id = ?
            AND aktiv = 1
          LIMIT 1
          `,
          [userId, newModulId]
        );

        if (perms.length === 0) {
          return res.json({ success: false, message: 'Nincs jogosultságod a választott modulhoz!' });
        }
      }

      const redirect = getRedirectByRole(newRoleId);
      if (!redirect) {
        return res.json({
          success: false,
          message: 'Ismeretlen szerepkör'
        });
      }

      req.session.modulId = newModulId;
      req.session.roleId = newRoleId;
      req.session.actualRoleId = actualRoleId;
      req.session.isAdmin = newRoleId === 1 || newRoleId === 4;

      req.session.save((err) => {
        if (err) {
          console.error('Session mentési hiba átjelentkezés után:', err);
          return res.json({
            success: false,
            message: 'Szerverhiba a munkamenet mentésekor!'
          });
        }

        return res.json({ success: true, redirect });
      });
    } catch (err) {
      console.error('Hiba a váltáskor:', err);
      return res.json({ success: false, message: 'Szerverhiba történt a váltás közben' });
    }
  });

  return router;
};
