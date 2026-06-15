// modulok/adminmodul.js
const express = require('express');
const fs = require('fs');
const path = require('path');


module.exports = function(db) {
  
  const router = express.Router();

  const {
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    requireRole
  } = require('./security')(db);


  const adminAccess = [requireLogin, attachUserContext, requireModuleAccess, requireRole(1, 4)];
  const sysadminAccess = [requireLogin, attachUserContext, requireModuleAccess, requireRole(4)];

  const isProduction = process.env.NODE_ENV === 'production';

  const sensitiveLogKeys = new Set([
    'valasz',
    'valaszok',
    'szoveg',
    'szovegek',
    'valasz_szoveg',
    'modositott_szovegek',
    'modositott_kerdesek',
    'kerdes_szoveg',
    'fokerdes_szoveg',
    'ai',
    'ai_szoveg',
    'ai_jellemzes',
    'ai_ertekeles',
    'prompt',
    'uzenet',
    'warm',
    'message',
    'pass',
    'password',
    'token',
    'secret',
    'kulcs',
    'nev',
    'név',
    'vizsgalt_nev',
    'vizsgált_nev',
    'mail',
    'email',
    'tel',
    'telefon'
  ]);

  function normalizeLogKey(key) {
    return String(key || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '');
  }

  function isSensitiveLogKey(key) {
    const normalized = normalizeLogKey(key);

    if (sensitiveLogKeys.has(String(key || '').toLowerCase())) return true;
    if (sensitiveLogKeys.has(normalized)) return true;

    return [
      'valasz',
      'szoveg',
      'prompt',
      'uzenet',
      'message',
      'token',
      'pass',
      'secret',
      'jelszo',
      'password',
      'mail',
      'email',
      'telefon',
      'tel',
      'vizsgalt',
      'nev'
    ].some(part => normalized.includes(part));
  }

  function summarizeSensitiveValue(value) {
    if (Array.isArray(value)) {
      return { redacted: true, type: 'array', count: value.length };
    }

    if (value && typeof value === 'object') {
      return { redacted: true, type: 'object', keys: Object.keys(value).length };
    }

    if (value === null || value === undefined || value === '') {
      return null;
    }

    return '[tartalom eltávolítva]';
  }

  function sanitizeLogDetailsValue(value, depth = 0) {
    if (depth > 3) {
      return '[mélységi korlát]';
    }

    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      return {
        type: 'array',
        count: value.length
      };
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const clean = value.trim();

      if (!clean) return '';

      if (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/.test(clean)) {
        return clean.substring(0, 19);
      }

      if (/^\d+$/.test(clean) && clean.length <= 12) {
        return clean;
      }

      return '[szöveges tartalom eltávolítva]';
    }

    if (typeof value === 'object') {
      const result = {};

      Object.entries(value).forEach(([key, val]) => {
        if (isSensitiveLogKey(key)) {
          result[key] = summarizeSensitiveValue(val);
          return;
        }

        result[key] = sanitizeLogDetailsValue(val, depth + 1);
      });

      return result;
    }

    return null;
  }

  function sanitizeActivityLogDetails(rawDetails) {
    if (!rawDetails) return null;

    try {
      const parsed = typeof rawDetails === 'string'
        ? JSON.parse(rawDetails)
        : rawDetails;

      const sanitized = sanitizeLogDetailsValue(parsed);
      const json = JSON.stringify(sanitized);

      return json.length > 2500
        ? JSON.stringify({ redacted: true, reason: 'log részlet túl hosszú volt' })
        : json;
    } catch (error) {
      return JSON.stringify({
        redacted: true,
        reason: 'nem JSON formátumú vagy régi log részlet'
      });
    }
  }

  function redactSystemLogLine(line) {
    const clean = String(line || '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email törölve]')
      .replace(/(?:password|pass|jelszo|jelszó|token|secret|api[_-]?key|authorization)\s*[:=]\s*["']?[^"',\s}]+/gi, '$1=[törölve]')
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [törölve]')
      .replace(/ertekek\.sid=[^;\s]+/gi, 'ertekek.sid=[törölve]')
      .replace(/AES_KEY_HEX\s*[:=]\s*[0-9a-fA-F]{32,}/g, 'AES_KEY_HEX=[törölve]')
      .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[telefonszám törölve]');

    return clean.length > 700
      ? `${clean.substring(0, 700)} ... [rövidítve]`
      : clean;
  }

  function logServerError(context, err = null) {
    if (!isProduction) {
      console.error(context, err);
      return;
    }

    if (!err) {
      console.error(context);
      return;
    }

    console.error(context, {
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState
    });
  }


  function q(sql, params = []) {
    return new Promise((resolve, reject) =>
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    );
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

  function isSysadmin(req) {
    return req.auth?.isSysadmin === true || Number(req.auth?.realRoleId) === 4;
  }

  function currentModulId(req) {
    const modulId = Number(req.auth?.modulId || req.session?.modulId);
    return Number.isInteger(modulId) && modulId > 0 ? modulId : null;
  }

  async function getUserById(userId, connection = null) {
    const sql = `
      SELECT id, int_id, role_id, vez, mail, tel
      FROM felhasznalok
      WHERE id = ?
      LIMIT 1
    `;

    if (connection) {
      const [rows] = await connection.query(sql, [userId]);
      return rows?.[0] || null;
    }

    const rows = await q(sql, [userId]);
    return rows?.[0] || null;
  }

  function canAccessInstitution(req, intId) {
    if (isSysadmin(req)) return true;
    return Number(req.auth?.intId) === Number(intId);
  }

  function canManageTargetUser(req, targetUser) {
    if (!targetUser) return false;
    if (isSysadmin(req)) return true;

    return Number(targetUser.int_id) === Number(req.auth?.intId)
      && Number(targetUser.role_id) !== 4;
  }

  async function getAssignableModuleIds(req, connection = null) {
    if (isSysadmin(req)) return null; // null = nincs korlátozás a modul-listára sysadminnál

    const userId = req.auth.userId;
    const sql = `
      SELECT modul_id
      FROM jogosultsagok
      WHERE user_id = ?
        AND aktiv = 1
    `;

    let rows;
    if (connection) {
      [rows] = await connection.query(sql, [userId]);
    } else {
      rows = await q(sql, [userId]);
    }

    const ids = rows.map(row => Number(row.modul_id)).filter(id => Number.isInteger(id) && id > 0);
    const activeModulId = currentModulId(req);
    if (activeModulId) ids.push(activeModulId);

    return [...new Set(ids)];
  }

  async function filterAssignableModules(req, modulIds, connection = null) {
    const cleanIds = uniquePositiveInts(modulIds);
    if (cleanIds.length === 0) return [];

    if (isSysadmin(req)) return cleanIds;

    const allowed = await getAssignableModuleIds(req, connection);
    const allowedSet = new Set(allowed || []);
    return cleanIds.filter(id => allowedSet.has(id));
  }

  async function requireKitoltesAdminAccess(req, res, kitoltesId, connection = null) {
    const sql = `
      SELECT
        k.id,
        k.idk,
        k.felhasznalo_id,
        k.modul_id,
        k.role,
        f.int_id AS tulaj_int_id
      FROM kitoltesek k
      JOIN felhasznalok f ON f.id = k.felhasznalo_id
      WHERE k.id = ?
      LIMIT 1
    `;

    let rows;
    if (connection) {
      [rows] = await connection.query(sql, [kitoltesId]);
    } else {
      rows = await q(sql, [kitoltesId]);
    }

    if (!rows.length) {
      res.status(404).json({ success: false, message: 'Kitöltés nem található!' });
      return null;
    }

    const row = rows[0];
    const allowed = isSysadmin(req)
      || (
        Number(row.tulaj_int_id) === Number(req.auth.intId)
        && Number(row.modul_id) === Number(req.auth.modulId)
        && ['admin', 'sysadmin'].includes(String(row.role))
      );

    if (!allowed) {
      res.status(403).json({ success: false, message: 'Nincs jogosultságod ehhez az értékeléshez.' });
      return null;
    }

    return row;
  }

  // Kérdések száma az AKTUÁLIS session modulban
  router.get('/fo-szam', adminAccess, (req, res) => {
    const modulId = currentModulId(req);

    if (!modulId) {
      return res.status(403).json({ success: false, message: 'Nincs kiválasztott modul.' });
    }

    const sql = `
      SELECT fo_kategoria AS category, COUNT(*) AS questions_count
      FROM kerdesek_kategoriaval
      WHERE modul_id = ?
        AND parent_id IS NULL
        AND fo_kategoria IS NOT NULL
        AND fo_kategoria != ''
      GROUP BY fo_kategoria;
    `;

    db.query(sql, [modulId], (err, result) => {
      if (err) {
        logServerError('SQL hiba (/agak):', err);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
      }
      res.json({ success: true, data: result });
    });
  });

  // Intézményi userlista + értékelések. Nem a query intId dönt, csak sysadminnál használható.
  router.get('/users-by-module', adminAccess, async (req, res) => {
    const requestedIntId = toPositiveInt(req.query.intId);
    const intId = isSysadmin(req) ? requestedIntId : Number(req.auth.intId);
    const modulId = currentModulId(req);

    if (!intId) {
      return res.status(400).json({ success: false, message: 'Rossz paraméterek' });
    }

    try {
      const sqlMods = isSysadmin(req)
        ? 'SELECT id, leiras FROM modulok ORDER BY leiras ASC'
        : `
          SELECT DISTINCT m.id, m.leiras
          FROM modulok m
          JOIN jogosultsagok j ON j.modul_id = m.id
          WHERE j.user_id = ?
            AND j.aktiv = 1
          ORDER BY m.leiras ASC
        `;

      const systemModules = await q(sqlMods, isSysadmin(req) ? [] : [req.auth.userId]);

      const sqlUsers = `
        SELECT
          f.id, f.vez, f.mail, f.tel, f.regisztralt, f.ip_cim, f.user_agent, f.ai_ossz_max,
          r.id AS role_id, r.role AS role
        FROM felhasznalok f
        INNER JOIN roles r ON f.role_id = r.id
        WHERE f.int_id = ?
          ${isSysadmin(req) ? '' : 'AND f.role_id <> 4'}
        ORDER BY CASE WHEN r.id = 4 THEN 0 ELSE 1 END, r.role, f.vez;
      `;

      const users = await q(sqlUsers, [intId]);

      if (users.length === 0) {
        return res.json({ success: true, users: [], modules: systemModules });
      }

      const userIds = users.map(u => u.id);
      const placeholders = userIds.map(() => '?').join(',');

      const sqlJogosultsagok = `
        SELECT j.user_id, m.leiras AS modul_nev
        FROM jogosultsagok j
        JOIN modulok m ON j.modul_id = m.id
        WHERE j.user_id IN (${placeholders})
      `;
      const jogosultsagok = await q(sqlJogosultsagok, userIds);

      const modsByUser = {};
      jogosultsagok.forEach(j => {
        if (!modsByUser[j.user_id]) modsByUser[j.user_id] = [];
        modsByUser[j.user_id].push(j.modul_nev);
      });

      const evalParams = [...userIds];
      let evalModuleFilter = '';
      if (!isSysadmin(req)) {
        if (!modulId) {
          return res.status(403).json({ success: false, message: 'Nincs kiválasztott modul.' });
        }
        evalModuleFilter = 'AND k.modul_id = ?';
        evalParams.push(modulId);
      }

      const sqlEvals = `
        SELECT
          k.id, k.idk, k.felhasznalo_id, k.kitoltes_neve, k.letrehozva,
          CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev,
          n.beleegyezes_datuma AS audit_datum,
          n.ip_cim AS audit_ip,
          n.user_agent AS audit_agent,
          m.leiras AS modul_nev
        FROM kitoltesek k
        LEFT JOIN vizsgaltak v ON k.vizsgalt_id = v.vizsgalt_id
        LEFT JOIN vizsgalt_hozzajarulas_naplo n ON k.vizsgalt_id = n.vizsgalt_id
        LEFT JOIN modulok m ON k.modul_id = m.id
        WHERE k.felhasznalo_id IN (${placeholders})
          AND k.role IN ('admin', 'sysadmin')
          ${evalModuleFilter}
        ORDER BY k.letrehozva DESC
      `;
      const evals = await q(sqlEvals, evalParams);

      const evalsIdk = evals.map(e => e.idk).filter(Boolean);
      let shares = [];

      if (evalsIdk.length > 0) {
        const idkPlaceholders = evalsIdk.map(() => '?').join(',');
        const sqlShares = `
          SELECT k.idk, f.vez AS kollega_neve
          FROM kitoltesek k
          JOIN felhasznalok f ON k.felhasznalo_id = f.id
          WHERE k.role = 'editor'
            AND k.idk IN (${idkPlaceholders})
        `;
        shares = await q(sqlShares, evalsIdk);
      }

      const sharesByIdk = {};
      shares.forEach(s => {
        if (!sharesByIdk[s.idk]) sharesByIdk[s.idk] = [];
        sharesByIdk[s.idk].push(s.kollega_neve);
      });

      const evalsByUser = {};
      evals.forEach(e => {
        if (!evalsByUser[e.felhasznalo_id]) evalsByUser[e.felhasznalo_id] = [];

        let d = e.letrehozva;
        if (d instanceof Date) d = d.toISOString().split('T')[0];
        else if (typeof d === 'string') d = d.substring(0, 10);

        let aDatum = e.audit_datum;
        if (aDatum instanceof Date) {
          aDatum = aDatum.toISOString().replace('T', ' ').substring(0, 19);
        }

        const alanyNeve = e.vizsgalt_nev || 'Ismeretlen alany';
        const kitoltesNeve = e.kitoltes_neve || 'Névtelen értékelés';

        evalsByUser[e.felhasznalo_id].push({
          id: e.id,
          idk: e.idk,
          nev: `${alanyNeve} - ${kitoltesNeve}`,
          datum: d || 'Nincs dátum',
          megosztva: sharesByIdk[e.idk] || [],
          audit_datum: aDatum,
          audit_ip: e.audit_ip,
          audit_agent: e.audit_agent,
          modul_nev: e.modul_nev || 'Ismeretlen modul'
        });
      });

      let logs = [];
      if (userIds.length > 0) {
        const sqlLogs = `
          SELECT felhasznalo_id, letrehozva, tevekenyseg, reszletek
          FROM aktivitas_log
          WHERE felhasznalo_id IN (${placeholders})
          ORDER BY letrehozva DESC
          LIMIT 500
        `;
        logs = await q(sqlLogs, userIds);
      }

      const logsByUser = {};
      logs.forEach(l => {
        if (!logsByUser[l.felhasznalo_id]) logsByUser[l.felhasznalo_id] = [];

        let d = l.letrehozva;
        if (d instanceof Date) d = d.toISOString().replace('T', ' ').substring(0, 19);

        logsByUser[l.felhasznalo_id].push({
          datum: d,
          tevekenyseg: l.tevekenyseg,
          reszletek: sanitizeActivityLogDetails(l.reszletek)
        });
      });

      users.forEach(u => {
        u.ertekelesek = evalsByUser[u.id] || [];
        u.kitoltes_db = u.ertekelesek.length;
        u.modulok = modsByUser[u.id] || [];
        u.logs = logsByUser[u.id] || [];
      });

      res.json({ success: true, users, modules: systemModules });
    } catch (err) {
      logServerError('SQL hiba (/users-by-module):', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
    }
  });

  // Felhasználó adatainak, szerepkörének, AI kvótájának és moduljogosultságainak frissítése
  router.patch('/update-user', adminAccess, async (req, res) => {
    const { id, vez, mail, tel, role, ai_ossz_max, modulIds } = req.body;
    const targetUserId = toPositiveInt(id);

    if (!targetUserId || !vez || !role) {
      return res.status(400).json({ success: false, message: 'Hiányzó kötelező adatok (Név vagy Szerepkör)' });
    }

    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();

      const targetUser = await getUserById(targetUserId, connection);
      if (!targetUser) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
      }

      if (!canManageTargetUser(req, targetUser)) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Nincs jogosultságod ezt a felhasználót módosítani.' });
      }

      const [roleRows] = await connection.query('SELECT id FROM roles WHERE role = ? LIMIT 1', [role]);
      if (roleRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Ismeretlen szerepkör' });
      }

      const roleId = Number(roleRows[0].id);
      if (!isSysadmin(req) && roleId === 4) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Sysadmin szerepkört csak sysadmin adhat.' });
      }

      const cleanAiValue = Number.isInteger(Number(ai_ossz_max)) ? Number(ai_ossz_max) : 0;
      await connection.query(
        'UPDATE felhasznalok SET vez = ?, mail = ?, tel = ?, role_id = ?, ai_ossz_max = ? WHERE id = ?',
        [vez, mail || null, tel || null, roleId, cleanAiValue, targetUserId]
      );

      const filteredModulIds = await filterAssignableModules(req, modulIds, connection);
      if (Array.isArray(modulIds) && modulIds.length > 0 && filteredModulIds.length !== uniquePositiveInts(modulIds).length && !isSysadmin(req)) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Nem adhatsz olyan moduljogot, amelyhez neked sincs hozzáférésed.' });
      }

      await connection.query('DELETE FROM jogosultsagok WHERE user_id = ?', [targetUserId]);

      if (filteredModulIds.length > 0) {
        const values = filteredModulIds.map(mId => [targetUserId, mId, 1]);
        await connection.query('INSERT INTO jogosultsagok (user_id, modul_id, aktiv) VALUES ?', [values]);
      }

      await connection.commit();
      res.json({ success: true, message: 'Felhasználó sikeresen frissítve!' });
    } catch (err) {
      await connection.rollback();
      logServerError('Felhasználó update hiba:', err);
      res.status(500).json({ success: false, message: 'Mentési hiba a szerveren' });
    } finally {
      connection.release();
    }
  });

  // Intézmények lekérése. Sysadmin mindet, intézményi admin csak a sajátját kapja.
  router.get('/institutions', adminAccess, (req, res) => {
    const params = [];
    let sql = 'SELECT id, intnev FROM intezmeny';

    if (!isSysadmin(req)) {
      sql += ' WHERE id = ?';
      params.push(req.auth.intId);
    }

    sql += ' ORDER BY intnev ASC';

    db.query(sql, params, (err, result) => {
      if (err) {
        logServerError('SQL hiba (/institutions):', err);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba az intézmények betöltésekor' });
      }
      res.json({ success: true, data: result });
    });
  });

  // Rendszerlogok: csak sysadmin.
  router.get('/api/admin-logs', sysadminAccess, async (req, res) => {
    try {
      const logPath = path.join(__dirname, '../logi/minden_log.txt');
      let systemLogs = [];

      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, 'utf8');
        systemLogs = logContent
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(redactSystemLogLine)
          .reverse()
          .slice(0, 100);
      }

      const sql = `
        SELECT
          a.letrehozva AS datum,
          a.tevekenyseg,
          f.vez,
          i.intnev
        FROM aktivitas_log a
        LEFT JOIN felhasznalok f ON a.felhasznalo_id = f.id
        LEFT JOIN intezmeny i ON f.int_id = i.id
        ORDER BY a.letrehozva DESC
        LIMIT 100
      `;

      const [activityRows] = await db.promise().query(sql);
      res.json({ success: true, systemLogs, activityLogs: activityRows });
    } catch (error) {
      logServerError('Hiba az admin logok lekérésekor:', error);
      res.status(500).json({ success: false, message: 'Hiba a szerveren.' });
    }
  });

  // Értékelés végleges törlése admin felületről
// Értékelés végleges törlése admin felületről
router.delete('/delete-kitoltes', adminAccess, async (req, res) => {
  const kitoltesId = toPositiveInt(req.body.id);

  if (!kitoltesId) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitoltes_id!'
    });
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const kit = await requireKitoltesAdminAccess(req, res, kitoltesId, connection);
    if (!kit) {
      await connection.rollback();
      return;
    }

    const deleteParams = [kit.idk];
    let moduleFilter = '';

    if (!isSysadmin(req)) {
      moduleFilter = ' AND modul_id = ?';
      deleteParams.push(req.auth.modulId);
    }

    // FONTOS:
    // A valaszok.kitoltes_id nálad idk-logikával működik,
    // ezért itt közvetlenül kit.idk alapján törlünk.
    await connection.query(
      `DELETE FROM valaszok WHERE kitoltes_id = ?`,
      [kit.idk]
    );

    const [deleteRes] = await connection.query(
      `DELETE FROM kitoltesek WHERE idk = ?${moduleFilter}`,
      deleteParams
    );

    if (deleteRes.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Nincs törölhető rekord!'
      });
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Sikeres törlés!'
    });
  } catch (err) {
    await connection.rollback();
    logServerError('Adatbázis hiba a kitöltés törlése során:', err);
    res.status(500).json({
      success: false,
      message: 'Adatbázis hiba a törlés során'
    });
  } finally {
    connection.release();
  }
});

  // Intézmény részletes adatainak lekérése
  router.get('/institution-details', adminAccess, async (req, res) => {
    const requestedIntId = toPositiveInt(req.query.id);
    const intId = isSysadmin(req) ? requestedIntId : Number(req.auth.intId);

    if (!intId) {
      return res.status(400).json({ success: false, message: 'Érvénytelen intézmény ID' });
    }

    if (!canAccessInstitution(req, intId)) {
      return res.status(403).json({ success: false, message: 'Nincs jogosultságod ehhez az intézményhez.' });
    }

    try {
      const sql = `
        SELECT i.*,
               (SELECT COUNT(*) FROM felhasznalok f WHERE f.int_id = i.id) AS regisztralt_felhasznalok
        FROM intezmeny i
        WHERE i.id = ?
        LIMIT 1
      `;

      const [rows] = await db.promise().query(sql, [intId]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Intézmény nem található' });
      }

      const data = rows[0];
      data.intmod_nevek = data.intmod;

      if (data.intmod && data.intmod.trim() !== '') {
        const modIds = data.intmod.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !Number.isNaN(n));

        if (modIds.length > 0) {
          const [modRows] = await db.promise().query('SELECT id, leiras FROM modulok WHERE id IN (?)', [modIds]);
          const descMap = {};
          modRows.forEach(m => { descMap[m.id] = m.leiras; });
          data.intmod_nevek = modIds.map(id => descMap[id] || `Ismeretlen modul (${id})`).join(', ');
        }
      }

      res.json({ success: true, data });
    } catch (err) {
      logServerError('SQL hiba (/institution-details):', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba az intézmény adatainak lekérésekor' });
    }
  });

  // Összes / kiosztható szakmai modul lekérése
  router.get('/api/all-modules', adminAccess, async (req, res) => {
    try {
      const sql = isSysadmin(req)
        ? 'SELECT id, leiras FROM modulok ORDER BY leiras ASC'
        : `
          SELECT DISTINCT m.id, m.leiras
          FROM modulok m
          JOIN jogosultsagok j ON j.modul_id = m.id
          WHERE j.user_id = ?
            AND j.aktiv = 1
          ORDER BY m.leiras ASC
        `;

      const params = isSysadmin(req) ? [] : [req.auth.userId];
      const rows = await q(sql, params);
      res.json({ success: true, data: rows });
    } catch (err) {
      logServerError('SQL hiba (/api/all-modules):', err);
      res.status(500).json({ success: false, message: 'Adatbázis hiba' });
    }
  });

  router.patch('/update-user-role', adminAccess, async (req, res) => {
    const userId = toPositiveInt(req.body.userId);
    const { newRole } = req.body;

    if (!userId || typeof newRole !== 'string') {
      return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás adatok' });
    }

    try {
      const targetUser = await getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
      }

      if (!canManageTargetUser(req, targetUser)) {
        return res.status(403).json({ success: false, message: 'Nincs jogosultságod ezt a felhasználót módosítani.' });
      }

      const roleRows = await q('SELECT id FROM roles WHERE role = ? LIMIT 1', [newRole]);
      if (!roleRows.length) {
        return res.status(400).json({ success: false, message: 'Ismeretlen szerepkör' });
      }

      const roleId = Number(roleRows[0].id);
      if (!isSysadmin(req) && roleId === 4) {
        return res.status(403).json({ success: false, message: 'Sysadmin szerepkört csak sysadmin adhat.' });
      }

      await q('UPDATE felhasznalok SET role_id = ? WHERE id = ?', [roleId, userId]);
      res.json({ success: true });
    } catch (err) {
      logServerError('Update role hiba:', err);
      res.status(500).json({ success: false, message: 'Mentési hiba' });
    }
  });

  router.get('/agak', adminAccess, (req, res) => {
    const modulId = currentModulId(req);
    const fo = (req.query.fo || '').trim();

    if (!modulId || !fo) {
      return res.status(400).json({ success: false, message: 'Rossz paraméterek' });
    }

    const sql = `
      SELECT
        al_kategoria,
        alt_tema,
        COUNT(*) AS rogzitett_db
      FROM kerdesek_kategoriaval
      WHERE modul_id = ?
        AND fo_kategoria = ?
        AND (parent_id IS NULL OR parent_id = 0)
      GROUP BY al_kategoria, alt_tema
      ORDER BY al_kategoria, alt_tema;
    `;

    db.query(sql, [modulId, fo], (err, rows) => {
      if (err) {
        logServerError('SQL hiba (/agak):', err);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
      }

      const nested = new Map();
      for (const r of rows) {
        const ak = r.al_kategoria || '(nincs alkategória)';
        const at = r.alt_tema || '(nincs altéma)';
        if (!nested.has(ak)) nested.set(ak, []);
        nested.get(ak).push({ alt_tema: at, rogzitett_db: Number(r.rogzitett_db) });
      }

      const data = [...nested.entries()].map(([al_kategoria, alt_temak]) => ({
        al_kategoria,
        alt_temak
      }));

      res.json({ success: true, data });
    });
  });

  // Intézmény és minden hozzá tartozó adat végleges törlése: csak sysadmin.
  router.delete('/delete-institution', sysadminAccess, async (req, res) => {
    const intId = toPositiveInt(req.body.id);

    if (!intId) {
      return res.status(400).json({ success: false, message: 'Érvénytelen intézmény ID' });
    }

    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const [instRows] = await connection.query('SELECT id FROM intezmeny WHERE id = ? LIMIT 1', [intId]);
      if (!instRows.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Intézmény nem található.' });
      }

      const [users] = await connection.query('SELECT id FROM felhasznalok WHERE int_id = ?', [intId]);
      const userIds = users.map(u => u.id);

      if (userIds.length > 0) {
        const [ownedKits] = await connection.query(
          `SELECT idk FROM kitoltesek WHERE felhasznalo_id IN (?) AND role IN ('admin', 'sysadmin')`,
          [userIds]
        );
        const idkList = ownedKits.map(k => k.idk);

if (idkList.length > 0) {
  await connection.query(
    `DELETE FROM valaszok WHERE kitoltes_id IN (?)`,
    [idkList]
  );

  await connection.query(`DELETE FROM kitoltesek WHERE idk IN (?)`, [idkList]);
}

        await connection.query(`DELETE FROM kitoltesek WHERE felhasznalo_id IN (?)`, [userIds]);
        await connection.query(`DELETE FROM jogosultsagok WHERE user_id IN (?)`, [userIds]);
        await connection.query(`DELETE FROM aktivitas_log WHERE felhasznalo_id IN (?)`, [userIds]);
        await connection.query(`DELETE FROM felhasznalok WHERE int_id = ?`, [intId]);
      }

      await connection.query(`DELETE FROM intezmeny WHERE id = ?`, [intId]);

      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      logServerError('Hiba az intézmény törlésekor:', error);
      res.status(500).json({ success: false, message: 'Szerver hiba a törlés során.' });
    } finally {
      connection.release();
    }
  });

  // Egyedi felhasználó törlése
  router.delete('/delete-user', adminAccess, async (req, res) => {
    const userId = toPositiveInt(req.body.userId);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Érvénytelen felhasználó ID' });
    }

    if (Number(userId) === Number(req.auth.userId)) {
      return res.status(403).json({ success: false, message: 'Saját fiókot innen nem törölhetsz.' });
    }

    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const targetUser = await getUserById(userId, connection);
      if (!targetUser) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
      }

      if (!canManageTargetUser(req, targetUser)) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Nincs jogosultságod ezt a felhasználót törölni.' });
      }

      const [rows] = await connection.query(
        `SELECT idk FROM kitoltesek WHERE felhasznalo_id = ? AND role IN ('admin', 'sysadmin')`,
        [userId]
      );
      const idkList = rows.map(r => r.idk);

 if (idkList.length > 0) {
  await connection.query(
    `DELETE FROM valaszok WHERE kitoltes_id IN (?)`,
    [idkList]
  );

  await connection.query(`DELETE FROM kitoltesek WHERE idk IN (?)`, [idkList]);
}
      await connection.query(`DELETE FROM kitoltesek WHERE felhasznalo_id = ?`, [userId]);
      await connection.query(`DELETE FROM jogosultsagok WHERE user_id = ?`, [userId]);
      await connection.query(`DELETE FROM aktivitas_log WHERE felhasznalo_id = ?`, [userId]);
      await connection.query(`DELETE FROM felhasznalok WHERE id = ?`, [userId]);

      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      await connection.rollback();
      logServerError('Felhasználó kaszkád törlési hiba:', err);
      res.status(500).json({ success: false, message: 'Adatbázis hiba a törlés során' });
    } finally {
      connection.release();
    }
  });

  // Intézmény adatainak frissítése
  router.patch('/update-institution', adminAccess, async (req, res) => {
    const {
      id, intnev, intado, intkapvez, intkapmail, fizetve,
      ip_cim, user_agent, intmail, inttel, intor, intir,
      intszek, intcim, intmod, idoszak, intfin, intfo,
      szerzodes_visszaerkezett, fizetes_beerkezett, aktiv,
      licenc_kezdete, licenc_vege, csomag_kod, sysadmin_megjegyzes
    } = req.body;

    const requestedIntId = toPositiveInt(id);
    const intId = isSysadmin(req) ? requestedIntId : Number(req.auth.intId);

    if (!intId) {
      return res.status(400).json({ success: false, message: 'Érvénytelen intézmény ID' });
    }

    if (!canAccessInstitution(req, intId)) {
      return res.status(403).json({ success: false, message: 'Nincs jogosultságod ehhez az intézményhez.' });
    }

    const sql = `
      UPDATE intezmeny
      SET intnev = ?, intado = ?, intkapvez = ?, intkapmail = ?, fizetve = ?,
          ip_cim = ?, user_agent = ?, intmail = ?, inttel = ?, intor = ?,
          intir = ?, intszek = ?, intcim = ?, intmod = ?, idoszak = ?,
          intfin = ?, intfo = ?,
          szerzodes_visszaerkezett = ?,
          szerzodes_visszaerkezett_at = CASE WHEN ? = 1 AND szerzodes_visszaerkezett_at IS NULL THEN NOW() ELSE szerzodes_visszaerkezett_at END,
          fizetes_beerkezett = ?,
          fizetes_beerkezett_at = CASE WHEN ? = 1 AND fizetes_beerkezett_at IS NULL THEN NOW() ELSE fizetes_beerkezett_at END,
          aktiv = ?, licenc_kezdete = ?, licenc_vege = ?, csomag_kod = ?, sysadmin_megjegyzes = ?
      WHERE id = ?
    `;

    const dateOrNull = (val) => (val && String(val).trim() !== '') ? val : null;
    const boolOrZero = (val) => (val === true || val === 1 || val === '1' || val === 'true') ? 1 : 0;
    const normalizedIntmail = intmail || req.body.intmai || null;

    const values = [
      intnev,
      intado,
      intkapvez,
      intkapmail,
      dateOrNull(fizetve),
      ip_cim,
      user_agent,
      normalizedIntmail,
      inttel,
      intor,
      intir,
      intszek,
      intcim,
      isSysadmin(req) ? intmod : undefined,
      idoszak,
      dateOrNull(intfin),
      intfo,
      boolOrZero(szerzodes_visszaerkezett),
      boolOrZero(szerzodes_visszaerkezett),
      boolOrZero(fizetes_beerkezett),
      boolOrZero(fizetes_beerkezett),
      boolOrZero(aktiv),
      dateOrNull(licenc_kezdete),
      dateOrNull(licenc_vege),
      csomag_kod || null,
      sysadmin_megjegyzes || null,
      intId
    ];

    // Intézményi admin ne tudja bodyból átírni az intézmény modulcsomagját.
    if (!isSysadmin(req)) {
      const keepCurrentSql = `
        UPDATE intezmeny
        SET intnev = ?, intado = ?, intkapvez = ?, intkapmail = ?, fizetve = ?,
            ip_cim = ?, user_agent = ?, intmail = ?, inttel = ?, intor = ?,
            intir = ?, intszek = ?, intcim = ?, idoszak = ?,
            intfin = ?, intfo = ?
        WHERE id = ?
      `;

      const keepCurrentValues = [
        intnev,
        intado,
        intkapvez,
        intkapmail,
        dateOrNull(fizetve),
        ip_cim,
        user_agent,
        normalizedIntmail,
        inttel,
        intor,
        intir,
        intszek,
        intcim,
        idoszak,
        dateOrNull(intfin),
        intfo,
        intId
      ];

      db.query(keepCurrentSql, keepCurrentValues, (err) => {
        if (err) {
          logServerError('SQL hiba (/update-institution):', err);
          return res.status(500).json({ success: false, message: 'Adatbázis hiba a mentés során' });
        }
        res.json({ success: true });
      });
      return;
    }

    db.query(sql, values, (err) => {
      if (err) {
        logServerError('SQL hiba (/update-institution):', err);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba a mentés során' });
      }
      res.json({ success: true });
    });
  });

  return router;
};
