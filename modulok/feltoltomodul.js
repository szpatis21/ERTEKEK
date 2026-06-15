const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { resolveKategoriaKapcsoloId } = require('./kategoriaHelper');
const crypto = require('crypto');

function feltoltes(db) {
    const logger = require('./logmodul')(db);

    function logServerError(context, err) {
        const alap = {
            code: err?.code || null,
            errno: err?.errno || null,
            sqlState: err?.sqlState || null
        };

        if (process.env.NODE_ENV === 'production') {
            console.error(`[feltoltomodul] ${context}`, alap);
            return;
        }

        console.error(`[feltoltomodul] ${context}`, err);
    }

    function errorDetails(err) {
        if (process.env.NODE_ENV === 'production') return {};
        return { error: err?.message || String(err || '') };
    }

    function publicErrorText(err, fallback = 'Szerver hiba.') {
        if (process.env.NODE_ENV === 'production') return fallback;
        return err?.message || String(err || fallback);
    }

    const {
        requireLogin,
        attachUserContext,
        requireModuleAccess,
        requireRole
    } = require('./security')(db);
const AI_NYILATKOZAT_VERZIO = 'ai-v1.0';

const AI_NYILATKOZAT_SZOVEG = `
Tudomásul veszem, hogy az MI-alapú szövegezési segédfunkció használata esetén a rendszer név és közvetlen azonosító nélkül, kizárólag a kérdőívből származó strukturált szakmai adatokat továbbít külső MI-szolgáltató felé szövegezési segítség céljából.

Szabad szöveges megjegyzések nem kerülnek továbbításra.

Az MI által generált szöveg nem minősül szakvéleménynek, annak ellenőrzése és felhasználása az intézményi felhasználó felelőssége.

Az intézmény/adatkezelő felel azért, hogy a rendszer használatához, valamint az MI-funkció alkalmazásához szükséges jogalappal, tájékoztatással és belső dokumentációval rendelkezzen.
`.trim();

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || null;
}

function sha256(value) {
    return crypto
        .createHash('sha256')
        .update(String(value || ''), 'utf8')
        .digest('hex');
}
    const feltoltoProtectedPatterns = [
        /^\/api\/intezmeny-ai-status\/?$/,
        /^\/api\/intezmeny-ai-toggle\/?$/,
        /^\/api\/get-sablonok\/?$/,
        /^\/api\/alkerdesek\/?$/,
        /^\/api\/frissit-ossz-ertek\/?$/,
        /^\/api\/frissit-fokerdesek-ossz-ertek\/?$/,
        /^\/api\/frissit-minden-ossz-ertek\/?$/,
        /^\/api\/ujraszamol-ossz-ertek\/?$/,
        /^\/api\/kategoriak\/fo\/?$/,
        /^\/api\/kategoriak\/al_altema\/?$/,
        /^\/api\/modul-szamolas\/?$/,
        /^\/api\/ai-beallitasok\/?$/,
        /^\/api\/ment-sablonok\/?$/,
        /^\/kerdesek(?:\/.*)?$/,
        /^\/alkerdesek(?:\/.*)?$/,
        /^\/alkategoriak\/?$/,
        /^\/altTemak\/?$/
    ];

    const feltoltoAuth = [
        requireLogin,
        attachUserContext,
        requireModuleAccess,
        requireRole(1, 4)
    ];

    router.use((req, res, next) => {
        const shouldProtect = feltoltoProtectedPatterns.some(pattern => pattern.test(req.path));
        if (!shouldProtect) return next();

        let index = 0;
        const runNext = (err) => {
            if (err) return next(err);

            const middleware = feltoltoAuth[index++];
            if (!middleware) return next();

            middleware(req, res, runNext);
        };

        runNext();
    });

    function getCurrentModulId(req, res) {
        const modulId = Number(req.auth?.modulId);
        if (!Number.isInteger(modulId) || modulId <= 0) {
            res.status(403).json({ success: false, message: 'Nincs kiválasztott vagy érvényes modul.' });
            return null;
        }
        return modulId;
    }

    function getCurrentUserId(req, res) {
        const userId = Number(req.auth?.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
            res.status(401).json({ success: false, message: 'Érvénytelen felhasználó.' });
            return null;
        }
        return userId;
    }

    function getCurrentIntId(req, res) {
        const intId = Number(req.auth?.intId);
        if (!Number.isInteger(intId) || intId <= 0) {
            res.status(403).json({ success: false, message: 'Érvénytelen intézményi jogosultság.' });
            return null;
        }
        return intId;
    }

    function toPositiveInt(value) {
        const n = Number(value);
        return Number.isInteger(n) && n > 0 ? n : null;
    }

    function q(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
        });
    }

    const sablonokSchemaCache = {
        kerdesTipusColumn: null
    };

    async function hasSablonokKerdesTipusColumn() {
        if (sablonokSchemaCache.kerdesTipusColumn === true) {
            return true;
        }

        try {
            const rows = await q("SHOW COLUMNS FROM sablonok LIKE 'kerdes_tipus'");
            sablonokSchemaCache.kerdesTipusColumn = Array.isArray(rows) && rows.length > 0;
        } catch (err) {
            logServerError('Sablonok séma ellenőrzési hiba', err);
            sablonokSchemaCache.kerdesTipusColumn = false;
        }

        return sablonokSchemaCache.kerdesTipusColumn;
    }

    function sablonKerdesTipusFromElem(elem = {}) {
        const tipus = String(
            elem.kerdes_tipus ||
            elem.kerdesTipus ||
            elem.tipus ||
            (elem.opcio || elem.opcios ? 'opcio' : 'normal')
        ).toLowerCase();

        return tipus === 'opcio' ? 'opcio' : 'normal';
    }

    function sanitizeModuleFilename(value) {
        return String(value || 'modul')
            .replace(/[\\/]/g, '_')
            .replace(/\.\.+/g, '.')
            .replace(/[<>:"|?*]/g, '_')
            .trim() || 'modul';
    }

    async function requireKerdesInCurrentModule(req, res, kerdesId) {
        const modulId = getCurrentModulId(req, res);
        if (!modulId) return null;

        const cleanKerdesId = toPositiveInt(kerdesId);
        if (!cleanKerdesId) {
            res.status(400).json({ success: false, message: 'Hibás kérdésazonosító.' });
            return null;
        }

        const rows = await q(
            'SELECT id, parent_id, modul_id FROM kerdesek WHERE id = ? AND modul_id = ? LIMIT 1',
            [cleanKerdesId, modulId]
        );

        if (!rows.length) {
            res.status(403).json({ success: false, message: 'Nincs jogosultságod ehhez a kérdéshez.' });
            return null;
        }

        return rows[0];
    }
router.get('/api/intezmeny-ai-status', async (req, res) => {
    const modulId = getCurrentModulId(req, res);
    const userId = getCurrentUserId(req, res);
    const intId = getCurrentIntId(req, res);
    if (!modulId || !userId || !intId) return;

    try {
        const rows = await q(
            `
            SELECT ai_enabled
            FROM intezmeny
            WHERE id = ?
            LIMIT 1
            `,
            [intId]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Intézmény nem található.'
            });
        }

        res.json({
            success: true,
            aiEnabled: Number(rows[0].ai_enabled) === 1,
            modulId,
            intId,
            statementVersion: AI_NYILATKOZAT_VERZIO,
            statementText: AI_NYILATKOZAT_SZOVEG
        });
    } catch (err) {
        logServerError('AI státusz lekérdezési hiba', err);
        res.status(500).json({
            success: false,
            message: 'AI státusz lekérdezése sikertelen.'
        });
    }
});
router.post('/api/intezmeny-ai-toggle', async (req, res) => {
    const modulId = getCurrentModulId(req, res);
    const userId = getCurrentUserId(req, res);
    const intId = getCurrentIntId(req, res);
    if (!modulId || !userId || !intId) return;

    const enabled = req.body?.enabled === true || req.body?.enabled === 1 || req.body?.enabled === '1';
    const accepted = req.body?.accepted === true || req.body?.accepted === 1 || req.body?.accepted === '1';

    if (enabled && !accepted) {
        return res.status(400).json({
            success: false,
            message: 'Az MI-funkció bekapcsolásához a tájékoztató elfogadása szükséges.'
        });
    }

    const action = enabled ? 'enabled' : 'disabled';
    const hash = sha256(AI_NYILATKOZAT_SZOVEG);
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || null;

    try {
        await q(
            `
            UPDATE intezmeny
            SET ai_enabled = ?
            WHERE id = ?
            `,
            [enabled ? 1 : 0, intId]
        );

        await q(
            `
            INSERT INTO intezmeny_ai_nyilatkozat_naplo
            (
                int_id,
                user_id,
                modul_id,
                action,
                accepted,
                nyilatkozat_verzio,
                nyilatkozat_szoveg,
                nyilatkozat_hash,
                ip_cim,
                user_agent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                intId,
                userId,
                modulId,
                action,
                enabled ? 1 : 0,
                AI_NYILATKOZAT_VERZIO,
                AI_NYILATKOZAT_SZOVEG,
                hash,
                ip,
                ua
            ]
        );

        logger(req, userId, enabled ? 'AI_ENGEDÉLYEZÉS' : 'AI_KIKAPCSOLÁS', {
            int_id: intId,
            modul_id: modulId
        });

        res.json({
            success: true,
            aiEnabled: enabled,
            message: enabled
                ? 'Az MI-funkció engedélyezve.'
                : 'Az MI-funkció kikapcsolva.'
        });
    } catch (err) {
        logServerError('AI kapcsoló mentési hiba', err);
        res.status(500).json({
            success: false,
            message: 'Az MI-kapcsoló mentése sikertelen.'
        });
    }
});
  //Feltöltési selectek automatikus kitöltése
    router.get('/api/get-sablonok', async (req, res) => {
      const modulId = getCurrentModulId(req, res);
      const actualUserId = getCurrentUserId(req, res);
      if (!modulId || !actualUserId) return;

      try {
        const hasKerdesTipus = await hasSablonokKerdesTipusColumn();

        // A modul és a user nem a queryből jön jogosultsági döntéshez.
        const query = `
          SELECT
            s.csoport_nev,
            s.kerdes,
            s.ag,
            s.pont,
            s.szoveges,
            s.maximalis_szint
            ${hasKerdesTipus ? ', s.kerdes_tipus' : ''}
          FROM sablonok s
          JOIN felhasznalok f ON s.int_id = f.int_id
          WHERE s.modul_id = ? AND f.id = ?
        `;

        const results = await q(query, [modulId, actualUserId]);
        const csoportokMap = {};

        results.forEach(row => {
          const kerdesTipus = hasKerdesTipus ? sablonKerdesTipusFromElem(row) : 'normal';

          if (!csoportokMap[row.csoport_nev]) {
            csoportokMap[row.csoport_nev] = {
              nev: row.csoport_nev,
              elemek: []
            };
          }

          csoportokMap[row.csoport_nev].elemek.push({
            szoveg: row.kerdes,
            ertek: row.pont,
            valasz_ag: row.ag,
            szoveges: kerdesTipus === 'opcio' ? false : row.szoveges === 1,
            maxi: kerdesTipus === 'opcio' ? false : row.maximalis_szint === 1,
            kerdes_tipus: kerdesTipus,
            kerdesTipus,
            tipus: kerdesTipus,
            opcio: kerdesTipus === 'opcio',
            opcios: kerdesTipus === 'opcio' ? 1 : 0
          });
        });

        res.json({ SABLON_CSOPORTOK: Object.values(csoportokMap) });
      } catch (err) {
        logServerError('Sablonok lekérdezési hiba', err);
        return res.status(500).json({ message: 'Hiba történt a sablonok lekérdezésekor.' });
      }
    });
    // Altémakör
router.get('/alkategoriak', (req, res) => {
  const { foKategoria } = req.query;
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  if (!foKategoria) {
    return res.status(400).json({ message: 'A főkategória megadása kötelező.' });
  }

  const query = `
    SELECT a.nev
    FROM alkategoriak a
    JOIN fokategoriak f ON f.id = a.fokategoria_id
    WHERE a.modul_id = ?
      AND f.nev = ?
      AND a.nev IS NOT NULL
      AND a.nev != ''
    ORDER BY a.nev ASC
  `;

  db.query(query, [modulId, foKategoria], (err, results) => {
    if (err) {
      logServerError('Alkategóriák lekérdezési hiba', err);
      return res.status(500).json({ message: 'Hiba történt az alkategóriák lekérdezésekor.' });
    }

    res.json(results);
  });
});
    //Altémakör lebontás
router.get('/altTemak', (req, res) => {
  const { foKategoria, alKategoria } = req.query;
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  if (!foKategoria || !alKategoria) {
    return res.status(400).json({ message: 'A főkategória és az alkategória megadása kötelező.' });
  }

  const query = `
    SELECT t.nev
    FROM altemak t
    JOIN alkategoriak a ON a.id = t.alkategoria_id
    JOIN fokategoriak f ON f.id = a.fokategoria_id
    WHERE t.modul_id = ?
      AND f.nev = ?
      AND a.nev = ?
      AND t.nev IS NOT NULL
      AND t.nev != ''
    ORDER BY t.nev ASC
  `;

  db.query(query, [modulId, foKategoria, alKategoria], (err, results) => {
    if (err) {
      logServerError('Altémák lekérdezési hiba', err);
      return res.status(500).json({ message: 'Hiba történt az altémák lekérdezésekor.' });
    }

    res.json(results);
  });
});
    
function ujraszamolOsszErtek(parentId, db, callback, modulId = null) {
  const paramsFo = [parentId];
  let qFo = `
  SELECT id, ertek, negalt_ertek
  FROM kerdesek
  WHERE id = ?`;

  if (modulId) {
    qFo += ' AND modul_id = ?';
    paramsFo.push(modulId);
  }

  qFo += ' LIMIT 1';

  db.query(qFo, paramsFo, (err, rows) => {
    if (err) return callback(err);
    const foKerdes = rows?.[0];
    if (!foKerdes) return callback(new Error('Főkérdés nem található vagy nem az aktuális modulhoz tartozik.'));

    const paramsAl = [parentId];
    let qAl = `
      SELECT id, ertek, valasz_ag, szoveges
      FROM kerdesek
      WHERE parent_id = ? AND szoveges = 0`;

    if (modulId) {
      qAl += ' AND modul_id = ?';
      paramsAl.push(modulId);
    }

    db.query(qAl, paramsAl, async (err2, alk) => {
      if (err2) return callback(err2);
      if (!alk || alk.length === 0) {
        return callback(null);
      }

      const igenAg = alk.filter(a => String(a.valasz_ag).toLowerCase() === 'igen');
      const nemAg  = alk.filter(a => String(a.valasz_ag).toLowerCase() === 'nem');

      const apply = async (rowsToUpdate, ref) => {
        const safeRef = Number(ref);
        for (const r of rowsToUpdate) {
          const v = Number(r.ertek) || 0;
          let pct = safeRef > 0 ? Math.round((v / safeRef) * 100) : 0;
          if (pct < 0) pct = 0;
          if (pct > 100) pct = 100;

          if (modulId) {
            await db.promise().query(
              'UPDATE kerdesek SET ossz_ertek = ? WHERE id = ? AND modul_id = ?',
              [pct, r.id, modulId]
            );
          } else {
            await db.promise().query('UPDATE kerdesek SET ossz_ertek = ? WHERE id = ?', [pct, r.id]);
          }
        }
      };

      try {
        if (igenAg.length > 0) {
          const maxIgen = Math.max(...igenAg.map(x => Number(x.ertek) || 0), 0);
          await apply(igenAg, maxIgen);
          await apply(nemAg,  maxIgen);
        } else if (nemAg.length > 0) {
          const baseline = Number(foKerdes.ertek) || 0;
          await apply(nemAg, baseline);
        }
        return callback(null);
      } catch (e) {
        return callback(e);
      }
    });
  });
}


    // KÉRDÉS HOZZÁADÁSA
  router.post('/kerdesek', async (req, res) => {
  const modulId = getCurrentModulId(req, res);
  const userId = getCurrentUserId(req, res);
  if (!modulId || !userId) return;

  const {
    kerdesSzoveg,
    negaltKerdesSzoveg,
    foKategoria,
    alKategoria,
    altTema,
    ertek,
    negalt_ertek,
    szoveges,
    kindex,
    alkerdesek,
    maximalis_szint,
    opcios
  } = req.body;

  const cleanNegaltErtek = (!negalt_ertek || negalt_ertek === '') ? 0 : Number(negalt_ertek);
  const cleanErtek = (!ertek || ertek === '') ? 0 : Number(ertek);
  const cleanKindex = (!kindex || kindex === '') ? 0 : Number(kindex);
  const isOpcios = opcios === true || opcios === 1 || opcios === '1' ? 1 : 0;

  try {
    const kategoriaKapcsoloId = await resolveKategoriaKapcsoloId(db, {
      modulId,
      foKategoria,
      alKategoria,
      altTema
    });

    const query = `
      INSERT INTO kerdesek
      (
        kerdes_szoveg,
        negalt_kerdes_szoveg,
        parent_id,
        kategoria_kapcsolo_id,
        ertek,
        negalt_ertek,
        szoveges,
        kindex,
        maximalis_szint,
        opcios,
        modul_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      kerdesSzoveg,
      isOpcios ? '' : negaltKerdesSzoveg,
      null,
      kategoriaKapcsoloId,
      cleanErtek,
      isOpcios ? 0 : cleanNegaltErtek,
      isOpcios ? 0 : (szoveges ? 1 : 0),
      cleanKindex,
      maximalis_szint ? 1 : 0,
      isOpcios,
      modulId
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        logServerError('Adatbázis műveleti hiba', err);
        return res.status(500).json({ message: 'Hiba történt a kérdés hozzáadása során.' });
      }

      const newKerdesId = result.insertId;

      if (alkerdesek && alkerdesek.length > 0) {
        const alkKerdesekQueries = alkerdesek
          .filter(alk => alk.al_kerdesSzoveg || alk.szoveg)
          .map(alk => {
            const alkSzoveg = alk.al_kerdesSzoveg || alk.szoveg;
            const alkNegaltSzoveg = alk.al_negaltKerdesSzoveg || alk.negaltSzoveg || '';
            const cleanAlkErtek = Number(alk.al_ertek ?? alk.ertek) || 0;
            const cleanAlkNegaltErtek = Number(alk.al_negalt_ertek ?? alk.negaltErtek) || 0;
            const cleanAlkKindex = Number(alk.al_kindex ?? alk.kindex) || 0;
            const isMaxi = alk.maximalis_szint || alk.maxi ? 1 : 0;
            const isAlkOpcios = alk.opcios === true || alk.opcios === 1 || alk.opcios === '1' ? 1 : 0;
            // Az opciós alkérdés saját maga egyágú, de a szülő főkérdés IGEN vagy NEM ágához is tartozhat.
            const valaszAg = alk.valasz_ag || alk.valaszAg || 'igen';

            return {
              query: `
                INSERT INTO kerdesek
                (
                  kerdes_szoveg,
                  negalt_kerdes_szoveg,
                  parent_id,
                  kategoria_kapcsolo_id,
                  ertek,
                  negalt_ertek,
                  kindex,
                  szoveges,
                  valasz_ag,
                  maximalis_szint,
                  opcios,
                  modul_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              values: [
                alkSzoveg,
                isAlkOpcios ? '' : alkNegaltSzoveg,
                newKerdesId,
                kategoriaKapcsoloId,
                cleanAlkErtek,
                isAlkOpcios ? 0 : cleanAlkNegaltErtek,
                cleanAlkKindex,
                isAlkOpcios ? 0 : (alk.szoveges ? 1 : 0),
                valaszAg,
                isMaxi,
                isAlkOpcios,
                modulId
              ]
            };
          });

        const insertAlkerdesek = alkKerdesekQueries.map(q => new Promise((resolve, reject) => {
          db.query(q.query, q.values, err => {
            if (err) return reject(err);
            resolve();
          });
        }));

        Promise.all(insertAlkerdesek)
          .then(() => {
            ujraszamolOsszErtek(newKerdesId, db, err => {
              if (err) {
                logServerError('OSSZ_ÉRTÉK újraszámolási hiba új kérdésnél', err);
                return res.status(500).json({
                  message: 'Mentés sikerült, de az arány újraszámolása hibázott.'
                });
              }

              logger(req, userId, 'KÉRDÉS_LÉTREHOZÁS', {
                kerdes_id: newKerdesId,
                modul_id: modulId,
                alkerdesek_szama: Array.isArray(alkerdesek) ? alkerdesek.length : 0
              });

              res.status(201).json({
                message: 'Kérdés és alkérdések hozzáadva, értékek frissítve.'
              });
            }, modulId);
          })
          .catch(err => {
            logServerError('Adatbázis műveleti hiba', err);
            res.status(500).json({ message: 'Hiba történt az alkérdések hozzáadása során.' });
          });
      } else {
        logger(req, userId, 'KÉRDÉS_LÉTREHOZÁS', {
          kerdes_id: newKerdesId,
          modul_id: modulId,
          alkerdesek_szama: 0
        });

        res.status(201).json({ message: 'Kérdés hozzáadva' });
      }
    });
  } catch (error) {
    logServerError('POST /kerdesek kategória hiba', error);
    res.status(500).json({
      message: 'Hiba történt a kategória-kapcsolat létrehozásakor.',
      ...errorDetails(error)
    });
  }
});

// PATCH – kérdés (és alkérdések) frissítése BIZTONSÁGOSAN
router.patch('/kerdesek/:id', async (req, res) => {
    const modulId = getCurrentModulId(req, res);
    const actualUserId = getCurrentUserId(req, res);
    if (!modulId || !actualUserId) return;

    const id = toPositiveInt(req.params.id);
    if (!id) {
        return res.status(400).json({ message: 'Hibás kérdésazonosító.' });
    }

    const kerdesRow = await requireKerdesInCurrentModule(req, res, id);
    if (!kerdesRow) return;

    const {
        kerdesSzoveg, negaltKerdesSzoveg, foKategoria, alKategoria, altTema,
        ertek, negalt_ertek, szoveges, kindex, maximalis_szint, opcios,
        alkerdesek = []
    } = req.body;

    logger(req, actualUserId, 'KÉRDÉS_SZERKESZTÉS', {
        kerdes_id: id,
        modul_id: modulId,
        kapott_alkerdesek_szama: Array.isArray(alkerdesek) ? alkerdesek.length : 0
    });

    const cleanErtek       = Number(ertek)        || 0;
    const cleanNegaltErtek = Number(negalt_ertek) || 0;
    const cleanKindex      = Number(kindex)       || 0;
    const isOpcios         = opcios === true || opcios === 1 || opcios === '1' ? 1 : 0;
    let kategoriaKapcsoloId;

    try {
      kategoriaKapcsoloId = await resolveKategoriaKapcsoloId(db, {
        modulId,
        foKategoria,
        alKategoria,
        altTema
      });
    } catch (error) {
      logServerError('PATCH /kerdesek/:id kategória hiba', error);
      return res.status(500).json({
        message: 'Hiba történt a kategória-kapcsolat létrehozásakor.',
        ...errorDetails(error)
      });
    }

    const updSql = `
      UPDATE kerdesek SET
        kerdes_szoveg = ?,
        negalt_kerdes_szoveg = ?,
        kategoria_kapcsolo_id = ?,
        ertek = ?,
        negalt_ertek = ?,
        szoveges = ?,
        kindex = ?,
        maximalis_szint = ?,
        opcios = ?
      WHERE id = ?
        AND modul_id = ?
    `;

    const updVals = [
      kerdesSzoveg,
      isOpcios ? '' : negaltKerdesSzoveg,
      kategoriaKapcsoloId,
      cleanErtek,
      isOpcios ? 0 : cleanNegaltErtek,
      isOpcios ? 0 : (szoveges ? 1 : 0),
      cleanKindex,
      maximalis_szint ? 1 : 0,
      isOpcios,
      id,
      modulId
    ];

    db.query(updSql, updVals, async (err1, updateResult) => {
        if (err1) {
            logServerError('PATCH fő kérdés frissítési hiba', err1);
            return res.status(500).json({ message: 'Hiba a fő kérdés frissítésekor.', ...errorDetails(err1) });
        }

        if (!updateResult || updateResult.affectedRows === 0) {
            return res.status(403).json({ message: 'Nincs jogosultságod ezt a kérdést módosítani.' });
        }

        try {
            const existingRows = await q(
                'SELECT id FROM kerdesek WHERE parent_id = ? AND modul_id = ?',
                [id, modulId]
            );
            const existingIds = existingRows.map(r => Number(r.id));

            const incomingIds = alkerdesek
                .map(a => toPositiveInt(a.al_id))
                .filter(Boolean);

            const idsToDelete = existingIds.filter(eId => !incomingIds.includes(eId));

            if (existingIds.length > 0 && incomingIds.length === 0 && idsToDelete.length === existingIds.length) {
                if (process.env.NODE_ENV !== 'production') console.warn('[BIZTONSÁGI FÉK] Tömeges alkérdés-törlés megakadályozva.');
                idsToDelete.length = 0;
            }

            if (idsToDelete.length > 0) {
                await q(
                    'DELETE FROM kerdesek WHERE id IN (?) AND parent_id = ? AND modul_id = ?',
                    [idsToDelete, id, modulId]
                );
            }

            for (const alk of alkerdesek) {
                const isAlkOpcios = alk.opcios === true || alk.opcios === 1 || alk.opcios === '1' ? 1 : 0;
                const isSzov = isAlkOpcios ? 0 : (alk.szoveges ? 1 : 0);
                const isMaxi = alk.maximalis_szint ? 1 : 0;
                const alkErtek = Number(alk.al_ertek) || 0;
                const alkNegaltErtek = Number(alk.al_negalt_ertek) || 0;
                const alkKindex = Number(alk.al_kindex) || 0;
                const alkId = toPositiveInt(alk.al_id);

                if (alkId) {
                    const updAlkSql = `
                      UPDATE kerdesek SET
                        kerdes_szoveg = ?,
                        negalt_kerdes_szoveg = ?,
                        kategoria_kapcsolo_id = ?,
                        ertek = ?,
                        negalt_ertek = ?,
                        kindex = ?,
                        szoveges = ?,
                        valasz_ag = ?,
                        maximalis_szint = ?,
                        opcios = ?
                      WHERE id = ?
                        AND parent_id = ?
                        AND modul_id = ?
                    `;

                    await q(updAlkSql, [
                      alk.al_kerdesSzoveg,
                      isAlkOpcios ? '' : (alk.al_negaltKerdesSzoveg || ''),
                      kategoriaKapcsoloId,
                      alkErtek,
                      isAlkOpcios ? 0 : alkNegaltErtek,
                      alkKindex,
                      isSzov,
                      alk.valasz_ag || alk.valaszAg || 'igen',
                      isMaxi,
                      isAlkOpcios,
                      alkId,
                      id,
                      modulId
                    ]);
                } else {
                    const insAlkSql = `
                      INSERT INTO kerdesek
                      (
                        kerdes_szoveg,
                        negalt_kerdes_szoveg,
                        parent_id,
                        kategoria_kapcsolo_id,
                        ertek,
                        negalt_ertek,
                        kindex,
                        szoveges,
                        valasz_ag,
                        maximalis_szint,
                        opcios,
                        modul_id
                      )
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    await q(insAlkSql, [
                      alk.al_kerdesSzoveg,
                      isAlkOpcios ? '' : (alk.al_negaltKerdesSzoveg || ''),
                      id,
                      kategoriaKapcsoloId,
                      alkErtek,
                      isAlkOpcios ? 0 : alkNegaltErtek,
                      alkKindex,
                      isSzov,
                      alk.valasz_ag || alk.valaszAg || 'igen',
                      isMaxi,
                      isAlkOpcios,
                      modulId
                    ]);
                }
            }

            const parentResult = await q(
                'SELECT parent_id FROM kerdesek WHERE id = ? AND modul_id = ?',
                [id, modulId]
            );

            const parentId = parentResult?.[0]?.parent_id || id;

            ujraszamolOsszErtek(parentId, db, (err4) => {
                if (err4) {
                    logServerError('PATCH újraszámolási hiba', err4);
                    return res.status(500).json({
                        message: 'Hiba az ossz_ertek újraszámolásakor.',
                        ...errorDetails(err4)
                    });
                }

                const fokerdesCheckQuery = `
                    SELECT id, ertek, negalt_ertek
                    FROM kerdesek
                    WHERE id = ?
                      AND modul_id = ?
                      AND parent_id IS NULL
                      AND id NOT IN (
                        SELECT DISTINCT parent_id
                        FROM kerdesek
                        WHERE parent_id IS NOT NULL
                          AND modul_id = ?
                      )
                `;

                db.query(fokerdesCheckQuery, [parentId, modulId, modulId], (checkErr, checkRows) => {
                    if (checkErr) {
                        logServerError('PATCH főkérdés ellenőrzési hiba', checkErr);
                        return res.json({ message: 'Frissítés sikeres, de a főkérdés %-ának ellenőrzése hibázott.' });
                    }

                    if (checkRows.length > 0) {
                        const row = checkRows[0];
                        const ertek = Number(row.ertek) || 0;
                        const negalt_ertek = Number(row.negalt_ertek) || 0;
                        const maxErtek = Math.max(ertek, negalt_ertek) || 1;
                        const ossz_ertek = Math.round((Math.max(ertek, negalt_ertek) / maxErtek) * 100);
                        const kisebb_ossz_ertek = Math.round((Math.min(ertek, negalt_ertek) / maxErtek) * 100);
                        const finalOsszErtek = ertek >= negalt_ertek ? ossz_ertek : kisebb_ossz_ertek;

                        db.query(
                            'UPDATE kerdesek SET ossz_ertek = ? WHERE id = ? AND modul_id = ?',
                            [finalOsszErtek, parentId, modulId],
                            (updErr) => {
                                if (updErr) logServerError('PATCH főkérdés százalék frissítési hiba', updErr);
                                return res.json({
                                    message: 'Frissítés sikeres, értékek és főkérdés % újraszámolva.'
                                });
                            }
                        );
                    } else {
                        return res.json({
                            message: 'Frissítés sikeres, értékek újraszámolva.'
                        });
                    }
                });
            }, modulId);

        } catch (error) {
            logServerError('PATCH alkérdés szinkron hiba', error);
            res.status(500).json({ message: 'Hiba az alkérdések szinkronizálása során.', ...errorDetails(error) });
        }
    });
});

router.post('/api/alkerdesek', async (req, res) => {
  const modulId = getCurrentModulId(req, res);
  const userId = getCurrentUserId(req, res);
  if (!modulId || !userId) return;

  const {
    kerdesSzoveg,
    negaltKerdesSzoveg,
    parentId,
    foKategoria,
    alKategoria,
    altTema,
    ertek,
    negaltErtek,
    szoveges,
    valaszAg,
    maximalis_szint,
    kindex,
    opcios
  } = req.body;

  const cleanParentId = toPositiveInt(parentId);
  if (!cleanParentId) {
    return res.status(400).json({ success: false, message: 'Hibás parentId.' });
  }

  const parentRow = await requireKerdesInCurrentModule(req, res, cleanParentId);
  if (!parentRow) return;

  const cleanErtek = Number(ertek) || 0;
  const cleanNegaltErtek = Number(negaltErtek) || 0;
  const cleanKindex = Number(kindex) || 0;
  const isOpcios = opcios === true || opcios === 1 || opcios === '1' ? 1 : 0;
  const isSzoveges = isOpcios ? 0 : (szoveges ? 1 : 0);
  const isMaxi = maximalis_szint ? 1 : 0;

  try {
    const kategoriaKapcsoloId = await resolveKategoriaKapcsoloId(db, {
      modulId,
      foKategoria,
      alKategoria,
      altTema
    });

    const query = `
      INSERT INTO kerdesek
      (
        kerdes_szoveg,
        negalt_kerdes_szoveg,
        parent_id,
        kategoria_kapcsolo_id,
        ertek,
        negalt_ertek,
        szoveges,
        valasz_ag,
        maximalis_szint,
        kindex,
        opcios,
        modul_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      kerdesSzoveg,
      isOpcios ? '' : (negaltKerdesSzoveg || ''),
      cleanParentId,
      kategoriaKapcsoloId,
      cleanErtek,
      isOpcios ? 0 : cleanNegaltErtek,
      isSzoveges,
      isOpcios ? 'igen' : (valaszAg || 'igen'),
      isMaxi,
      cleanKindex,
      isOpcios,
      modulId
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        logServerError('Alkérdés hozzáadási hiba', err);
        return res.status(500).json({
          success: false,
          message: 'Hiba történt az alkérdés hozzáadásakor.'
        });
      }

      ujraszamolOsszErtek(cleanParentId, db, err2 => {
        if (err2) {
          logServerError('Alkérdés ossz_ertek újraszámolási hiba', err2);
          return res.status(500).json({
            success: false,
            message: 'Alkérdés mentve, de az újraszámolás hibázott.'
          });
        }

        logger(req, userId, 'ALKÉRDÉS_LÉTREHOZÁS', {
          kerdes_id: result.insertId,
          parent_id: cleanParentId,
          modul_id: modulId
        });

        res.status(201).json({
          success: true,
          id: result.insertId,
          message: 'Alkérdés hozzáadva.'
        });
      }, modulId);
    });
  } catch (error) {
    logServerError('POST /api/alkerdesek kategória hiba', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a kategória-kapcsolat létrehozásakor.',
      ...errorDetails(error)
    });
  }
});
// Csoportos frissítés lekérdezése egy adott fő kérdés és alkérdései alapján
router.get('/kerdesek/csoportos-frissites', (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const id = toPositiveInt(req.query.id);
    if (!id) {
        return res.status(400).json({ message: 'Hibás kérdésazonosító.' });
    }

    const kerdesQuery = `
        SELECT v.*, COALESCE(k.opcios, 0) AS opcios, k.kategoria_kapcsolo_id AS kategoria_kapcsolo_id
        FROM kerdesek_kategoriaval v
        LEFT JOIN kerdesek k ON k.id = v.id
        WHERE v.id = ? AND v.modul_id = ?
    `;
    db.query(kerdesQuery, [id, modulId], (err, kerdesResult) => {
        if (err) {
            logServerError('Fő kérdés lekérdezési hiba', err);
            return res.status(500).json({ message: 'Hiba történt a fő kérdés lekérdezésekor.' });
        }

        if (kerdesResult.length === 0) {
            return res.status(403).json({ message: 'Kérdés nem található vagy nincs jogosultság.' });
        }

        const foKerdes = kerdesResult[0];
        const alkerdesekQuery = `
            SELECT v.*, COALESCE(k.opcios, 0) AS opcios, k.kategoria_kapcsolo_id AS kategoria_kapcsolo_id
            FROM kerdesek_kategoriaval v
            LEFT JOIN kerdesek k ON k.id = v.id
            WHERE v.parent_id = ? AND v.modul_id = ?
        `;
        db.query(alkerdesekQuery, [id, modulId], (err, alkerdesekResult) => {
            if (err) {
                logServerError('Alkérdések lekérdezési hiba', err);
                return res.status(500).json({ message: 'Hiba történt az alkérdések lekérdezésekor.' });
            }

            res.json({ foKerdes, alkerdesek: alkerdesekResult });
        });
    });
});


    // KÉRDÉS TÖRLÉSE
    router.delete('/kerdesek/:id', async (req, res) => {
        const modulId = getCurrentModulId(req, res);
        const userId = getCurrentUserId(req, res);
        if (!modulId || !userId) return;

        const kerdesId = toPositiveInt(req.params.id);
        if (!kerdesId) {
            return res.status(400).json({ error: 'Hibás kérdésazonosító.' });
        }

        const kerdesRow = await requireKerdesInCurrentModule(req, res, kerdesId);
        if (!kerdesRow) return;

        const deleteAlkerdesekQuery = 'DELETE FROM kerdesek WHERE parent_id = ? AND modul_id = ?';
        db.query(deleteAlkerdesekQuery, [kerdesId, modulId], (err) => {
            if (err) {
                return res.status(500).json({ error: publicErrorText(err, 'Adatbázis hiba.') });
            }

            const deleteKerdesQuery = 'DELETE FROM kerdesek WHERE id = ? AND modul_id = ?';
            db.query(deleteKerdesQuery, [kerdesId, modulId], (err2, result) => {
                if (err2) {
                    return res.status(500).json({ error: publicErrorText(err2, 'Adatbázis hiba.') });
                }

                if (!result || result.affectedRows === 0) {
                    return res.status(403).json({ error: 'Nincs jogosultságod ezt a kérdést törölni.' });
                }

                logger(req, userId, 'KÉRDÉS_TÖRLÉS', { kerdes_id: kerdesId, modul_id: modulId });
                res.json({ message: 'Kérdés és alkérdések törölve' });
            });
        });
    });

    // ALKÉRDÉS TÖRLÉSE ÉS ÚJRASZÁMOLÁS
router.delete('/alkerdesek/:id', async (req, res) => {
    const modulId = getCurrentModulId(req, res);
    const userId = getCurrentUserId(req, res);
    if (!modulId || !userId) return;

    const alkerdesId = toPositiveInt(req.params.id);
    if (!alkerdesId) {
        return res.status(400).json({ error: 'Hibás alkérdésazonosító.' });
    }

    const alkerdesRow = await requireKerdesInCurrentModule(req, res, alkerdesId);
    if (!alkerdesRow) return;

    const findParentQuery = 'SELECT parent_id FROM kerdesek WHERE id = ? AND modul_id = ?';
    db.query(findParentQuery, [alkerdesId, modulId], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(500).json({ error: 'Alkérdés nem található.' });
        }

        const parentId = rows[0].parent_id;
        if (!parentId) {
            return res.status(400).json({ error: 'Ez nem alkérdés.' });
        }

        const deleteQuery = 'DELETE FROM kerdesek WHERE id = ? AND modul_id = ?';
        db.query(deleteQuery, [alkerdesId, modulId], (err2, result) => {
            if (err2) return res.status(500).json({ error: publicErrorText(err2, 'Adatbázis hiba.') });

            if (!result || result.affectedRows === 0) {
                return res.status(403).json({ error: 'Nincs jogosultságod ezt az alkérdést törölni.' });
            }

            ujraszamolOsszErtek(parentId, db, (err3) => {
                if (err3) {
                    logServerError('Törlés utáni újraszámolási hiba', err3);
                    return res.status(500).json({ message: 'Törölve, de az arányok frissítése hibázott.' });
                }

                logger(req, userId, 'ALKÉRDÉS_TÖRLÉS', { kerdes_id: alkerdesId, parent_id: parentId, modul_id: modulId });
                res.json({ message: 'Alkérdés törölve, értékek újraszámolva.', parentId: parentId });
            }, modulId);
        });
    });
});

    // Alkérdések ossz_ertek mezőjének arányos frissítése csak az aktuális modulban
router.post('/api/frissit-ossz-ertek', async (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    try {
        const [rows] = await db.promise().query(`
            SELECT parent_id, id, ertek
            FROM kerdesek
            WHERE parent_id IS NOT NULL
              AND modul_id = ?
        `, [modulId]);

        const csoportok = {};

        rows.forEach(({ parent_id, id, ertek }) => {
            if (!csoportok[parent_id]) csoportok[parent_id] = [];
            csoportok[parent_id].push({ id, ertek: Number(ertek) });
        });

        for (const parent_id in csoportok) {
            const alk = csoportok[parent_id];
            const maxErtek = Math.max(...alk.map(a => a.ertek)) || 1;

            for (const { id, ertek } of alk) {
                const szazalek = Math.round((ertek / maxErtek) * 100);
                await db.promise().query(
                    `UPDATE kerdesek SET ossz_ertek = ? WHERE id = ? AND modul_id = ?`,
                    [szazalek, id, modulId]
                );
            }
        }

        res.json({ success: true, message: 'Az ossz_ertek mezők sikeresen frissítve.' });
    } catch (err) {
        logServerError('Ossz_ertek frissítési hiba', err);
        res.status(500).json({ success: false, message: 'Hiba történt a frissítés során.' });
    }
});

// Főkérdések százalékos értékének frissítése, ha nincs alkérdés
router.post('/api/frissit-fokerdesek-ossz-ertek', (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const kerdesQuery = `
        SELECT id, ertek, negalt_ertek
        FROM kerdesek
        WHERE parent_id IS NULL
          AND modul_id = ?
          AND id NOT IN (
            SELECT DISTINCT parent_id
            FROM kerdesek
            WHERE parent_id IS NOT NULL
              AND modul_id = ?
          )
    `;

    db.query(kerdesQuery, [modulId, modulId], (err, rows) => {
        if (err) {
            logServerError('Főkérdések lekérdezési hiba', err);
            return res.status(500).json({ message: 'Lekérdezési hiba.' });
        }

        const updatePromises = rows.map(({ id, ertek, negalt_ertek }) => {
            ertek = Number(ertek) || 0;
            negalt_ertek = Number(negalt_ertek) || 0;

            const maxErtek = Math.max(ertek, negalt_ertek) || 1;
            const ossz_ertek = Math.round((Math.max(ertek, negalt_ertek) / maxErtek) * 100);
            const kisebb_ossz_ertek = Math.round((Math.min(ertek, negalt_ertek) / maxErtek) * 100);
            const finalOsszErtek = ertek >= negalt_ertek ? ossz_ertek : kisebb_ossz_ertek;

            return new Promise((resolve, reject) => {
                db.query(
                    'UPDATE kerdesek SET ossz_ertek = ? WHERE id = ? AND modul_id = ?',
                    [finalOsszErtek, id, modulId],
                    (err2) => {
                        if (err2) return reject(err2);
                        resolve();
                    }
                );
            });
        });

        Promise.all(updatePromises)
            .then(() => {
                res.json({ success: true, message: 'Főkérdések ossz_ertek mezői frissítve.' });
            })
            .catch(err => {
                logServerError('Főkérdések frissítési hiba', err);
                res.status(500).json({ message: 'Hiba történt a frissítés során.' });
            });
    });
});

router.post('/api/frissit-minden-ossz-ertek', (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const query = 'SELECT id FROM kerdesek WHERE parent_id IS NULL AND modul_id = ?';

    db.query(query, [modulId], (err, rows) => {
        if (err) {
            logServerError('Adatbázis műveleti hiba', err);
            return res.status(500).json({ message: 'Hiba a főkérdések lekérdezésekor.' });
        }

        const frissitesek = rows.map(row => {
            return new Promise((resolve, reject) => {
                ujraszamolOsszErtek(row.id, db, (err) => {
                    err ? reject(err) : resolve();
                }, modulId);
            });
        });

        Promise.all(frissitesek)
            .then(() => res.json({ message: 'Minden kérdés frissítve!' }))
            .catch(err => {
                logServerError('Adatbázis műveleti hiba', err);
                res.status(500).json({ message: 'Hiba a frissítések során.', ...errorDetails(err) });
            });
    });
});

router.post('/api/ujraszamol-ossz-ertek', async (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const parentId = toPositiveInt(req.body.parentId);
    if (!parentId) {
        return res.status(400).json({ success: false, message: 'Hiányzik vagy hibás a parentId!' });
    }

    const kerdesRow = await requireKerdesInCurrentModule(req, res, parentId);
    if (!kerdesRow) return;

    ujraszamolOsszErtek(parentId, db, (err) => {
        if (err) {
            logServerError('OSSZ_ÉRTÉK újraszámítási hiba', err);
            return res.status(500).json({ success: false, message: 'Számítási hiba.' });
        }

        res.json({ success: true, message: 'ossz_ertek sikeresen újraszámolva.' });
    }, modulId);
});
// --- KATEGÓRIA KEZELŐ VÉGPONTOK (FŐ, AL, ALTÉMA) ---

// 1. FŐKATEGÓRIA - LÉTREHOZÁS
router.post('/api/kategoriak/fo', async (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  const { nev, leiras, szin } = req.body;

  if (!nev) {
    return res.status(400).json({ message: 'Hiányzó adatok' });
  }

  try {
    await resolveKategoriaKapcsoloId(db, {
      modulId,
      foKategoria: nev,
      leiras,
      szin,
      chart: szin
    });

    return res.status(201).json({
      success: true,
      message: 'Főkategória létrehozva!'
    });
  } catch (error) {
    logServerError('Főkategória létrehozási hiba', error);
    return res.status(500).json({ message: error.message });
  }
});

// 2. FŐKATEGÓRIA - FRISSÍTÉS (Szín, Név, Leírás + kitoltesek tábla)
router.patch('/api/kategoriak/fo', (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  const { regiNev, ujNev, leiras, szin } = req.body;

  if (!regiNev || !ujNev) {
    return res.status(400).json({ message: 'Hiányzó adatok' });
  }

  const updateDb = `
    UPDATE fokategoriak
    SET
      nev = ?,
      leiras = COALESCE(?, leiras),
      szin = COALESCE(?, szin),
      chart = COALESCE(?, chart)
    WHERE nev = ?
      AND modul_id = ?
  `;

  db.query(updateDb, [ujNev, leiras ?? null, szin ?? null, szin ?? null, regiNev, modulId], (err) => {
    if (err) {
      logServerError('Főkategória frissítési hiba', err);
      return res.status(500).json({ message: 'Hiba a főkategória frissítésekor' });
    }

    if (regiNev !== ujNev) {
      const replaceQuery = 'UPDATE kitoltesek SET szazalek = REPLACE(szazalek, ?, ?) WHERE modul_id = ?';
      const regiString = `"${regiNev}":`;
      const ujString = `"${ujNev}":`;

      db.query(replaceQuery, [regiString, ujString, modulId], () => {
        return res.json({ success: true, message: 'Főkategória és kitöltések frissítve!' });
      });
    } else {
      return res.json({ success: true, message: 'Főkategória frissítve!' });
    }
  });
});

// 3. FŐKATEGÓRIA - TÖRLÉS
router.delete('/api/kategoriak/fo', async (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  const { nev } = req.body;

  if (!nev) {
    return res.status(400).json({ message: 'Hiányzó adatok' });
  }

  try {
    const idsRows = await q(
      `
        SELECT kk.id
        FROM kategoria_kapcsolo kk
        JOIN fokategoriak f ON f.id = kk.fokategoria_id
        WHERE kk.modul_id = ?
          AND f.nev = ?
      `,
      [modulId, nev]
    );

    const ids = idsRows.map(r => r.id);

    if (ids.length > 0) {
      await q(
        'DELETE FROM kerdesek WHERE kategoria_kapcsolo_id IN (?) AND parent_id IS NOT NULL AND modul_id = ?',
        [ids, modulId]
      );

      await q(
        'DELETE FROM kerdesek WHERE kategoria_kapcsolo_id IN (?) AND parent_id IS NULL AND modul_id = ?',
        [ids, modulId]
      );

      await q(
        'DELETE FROM kategoria_kapcsolo WHERE id IN (?) AND modul_id = ?',
        [ids, modulId]
      );
    }

    await q(
      `
        DELETE t
        FROM altemak t
        JOIN alkategoriak a ON a.id = t.alkategoria_id
        JOIN fokategoriak f ON f.id = a.fokategoria_id
        WHERE t.modul_id = ?
          AND f.nev = ?
      `,
      [modulId, nev]
    );

    await q(
      `
        DELETE a
        FROM alkategoriak a
        JOIN fokategoriak f ON f.id = a.fokategoria_id
        WHERE a.modul_id = ?
          AND f.nev = ?
      `,
      [modulId, nev]
    );

    await q(
      'DELETE FROM fokategoriak WHERE modul_id = ? AND nev = ?',
      [modulId, nev]
    );

    return res.json({
      success: true,
      message: 'Főkategória, kapcsolatai, alkategóriái, altémái és kérdései törölve.'
    });
  } catch (error) {
    logServerError('Főkategória törlési hiba', error);
    return res.status(500).json({ message: 'Hiba történt a főkategória törlésekor.' });
  }
});

// 4. ALKATEGÓRIA / ALTÉMA - LÉTREHOZÁS
router.post('/api/kategoriak/al_altema', async (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  const { tipus, nev, foKategoria, alKategoria } = req.body;

  if (!tipus || !nev || !foKategoria) {
    return res.status(400).json({ message: 'Hiányzó adatok' });
  }

  try {
    if (tipus === 'al') {
      await resolveKategoriaKapcsoloId(db, {
        modulId,
        foKategoria,
        alKategoria: nev,
        altTema: null
      });

      return res.status(201).json({
        success: true,
        message: 'Alkategória létrehozva!'
      });
    }

    await resolveKategoriaKapcsoloId(db, {
      modulId,
      foKategoria,
      alKategoria: alKategoria || null,
      altTema: nev
    });

    return res.status(201).json({
      success: true,
      message: alKategoria
        ? 'Altéma létrehozva!'
        : 'Közvetlen téma létrehozva!'
    });
  } catch (error) {
    logServerError('Al/Altéma létrehozási hiba', error);
    return res.status(500).json({ message: error.message });
  }
});

router.patch('/api/kategoriak/al_altema', (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  const { tipus, regiNev, ujNev, foKategoria, alKategoria } = req.body;

  if (!tipus || !regiNev || !ujNev || !foKategoria) {
    return res.status(400).json({ message: 'Hiányzó adatok' });
  }

  let updateQuery = '';
  let params = [];

  if (tipus === 'al') {
    updateQuery = `
      UPDATE alkategoriak a
      JOIN fokategoriak f ON f.id = a.fokategoria_id
      SET a.nev = ?
      WHERE a.nev = ?
        AND f.nev = ?
        AND a.modul_id = ?
    `;

    params = [ujNev, regiNev, foKategoria, modulId];
  } else if (alKategoria) {
    updateQuery = `
      UPDATE altemak t
      JOIN alkategoriak a ON a.id = t.alkategoria_id
      JOIN fokategoriak f ON f.id = a.fokategoria_id
      SET t.nev = ?
      WHERE t.nev = ?
        AND a.nev = ?
        AND f.nev = ?
        AND t.modul_id = ?
    `;

    params = [ujNev, regiNev, alKategoria, foKategoria, modulId];
  } else {
    updateQuery = `
      UPDATE altemak t
      JOIN kategoria_kapcsolo kk ON kk.altema_id = t.id
      JOIN fokategoriak f ON f.id = kk.fokategoria_id
      SET t.nev = ?
      WHERE t.nev = ?
        AND f.nev = ?
        AND kk.modul_id = ?
        AND (kk.alkategoria_id IS NULL OR kk.alkategoria_id = 0)
    `;

    params = [ujNev, regiNev, foKategoria, modulId];
  }

  db.query(updateQuery, params, err => {
    if (err) {
      logServerError('Al/Altéma frissítési hiba', err);
      return res.status(500).json({ message: 'Adatbázis hiba a kategória frissítésekor' });
    }

    const replaceQuery = 'UPDATE kitoltesek SET szazalek = REPLACE(szazalek, ?, ?) WHERE modul_id = ?';

    db.query(replaceQuery, [`"${regiNev}":`, `"${ujNev}":`, modulId], () => {
      res.json({ success: true });
    });
  });
});

router.delete('/api/kategoriak/al_altema', async (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  const { tipus, nev, foKategoria, alKategoria } = req.body;

  if (!tipus || !nev || !foKategoria) {
    return res.status(400).json({ message: 'Hiányzó adatok' });
  }

  try {
    let idsRows = [];

    if (tipus === 'al') {
      idsRows = await q(
        `
          SELECT kk.id
          FROM kategoria_kapcsolo kk
          JOIN fokategoriak f ON f.id = kk.fokategoria_id
          JOIN alkategoriak a ON a.id = kk.alkategoria_id
          WHERE kk.modul_id = ?
            AND f.nev = ?
            AND a.nev = ?
        `,
        [modulId, foKategoria, nev]
      );
    } else if (alKategoria) {
      idsRows = await q(
        `
          SELECT kk.id
          FROM kategoria_kapcsolo kk
          JOIN fokategoriak f ON f.id = kk.fokategoria_id
          JOIN alkategoriak a ON a.id = kk.alkategoria_id
          JOIN altemak t ON t.id = kk.altema_id
          WHERE kk.modul_id = ?
            AND f.nev = ?
            AND a.nev = ?
            AND t.nev = ?
        `,
        [modulId, foKategoria, alKategoria, nev]
      );
    } else {
      idsRows = await q(
        `
          SELECT kk.id
          FROM kategoria_kapcsolo kk
          JOIN fokategoriak f ON f.id = kk.fokategoria_id
          JOIN altemak t ON t.id = kk.altema_id
          WHERE kk.modul_id = ?
            AND f.nev = ?
            AND (kk.alkategoria_id IS NULL OR kk.alkategoria_id = 0)
            AND t.nev = ?
        `,
        [modulId, foKategoria, nev]
      );
    }

    const ids = idsRows.map(r => r.id);

    if (ids.length === 0) {
      return res.json({ success: true });
    }

    await q(
      'DELETE FROM kerdesek WHERE kategoria_kapcsolo_id IN (?) AND parent_id IS NOT NULL AND modul_id = ?',
      [ids, modulId]
    );

    await q(
      'DELETE FROM kerdesek WHERE kategoria_kapcsolo_id IN (?) AND parent_id IS NULL AND modul_id = ?',
      [ids, modulId]
    );

    await q(
      'DELETE FROM kategoria_kapcsolo WHERE id IN (?) AND modul_id = ?',
      [ids, modulId]
    );

    if (tipus === 'al') {
      await q(
        `
          DELETE t
          FROM altemak t
          JOIN alkategoriak a ON a.id = t.alkategoria_id
          JOIN fokategoriak f ON f.id = a.fokategoria_id
          WHERE t.modul_id = ?
            AND f.nev = ?
            AND a.nev = ?
        `,
        [modulId, foKategoria, nev]
      );

      await q(
        `
          DELETE a
          FROM alkategoriak a
          JOIN fokategoriak f ON f.id = a.fokategoria_id
          WHERE a.modul_id = ?
            AND f.nev = ?
            AND a.nev = ?
        `,
        [modulId, foKategoria, nev]
      );
    } else if (alKategoria) {
      await q(
        `
          DELETE t
          FROM altemak t
          JOIN alkategoriak a ON a.id = t.alkategoria_id
          JOIN fokategoriak f ON f.id = a.fokategoria_id
          WHERE t.modul_id = ?
            AND f.nev = ?
            AND a.nev = ?
            AND t.nev = ?
        `,
        [modulId, foKategoria, alKategoria, nev]
      );
    } else {
      await q(
        `
          DELETE t
          FROM altemak t
          WHERE t.modul_id = ?
            AND t.nev = ?
            AND NOT EXISTS (
              SELECT 1
              FROM kategoria_kapcsolo kk
              WHERE kk.altema_id = t.id
            )
        `,
        [modulId, nev]
      );
    }

    res.json({ success: true });
  } catch (error) {
    logServerError('Al/Altéma törlési hiba', error);
    res.status(500).json({ message: 'DB hiba törléskor' });
  }
});

// --- AI BEÁLLÍTÁSOK LEKÉRÉSE ÉS MENTÉSE ---
router.get('/api/ai-beallitasok', (req, res) => {
    const modulId = getCurrentModulId(req, res);
    if (!modulId) return;

    const qSql = 'SELECT nev, szerep, vizsgalt_targy, ai_kontextus, cim_jellemzes, prompt_jellemzes, cim_fejlesztes, prompt_fejlesztes, cim_ertekeles, prompt_ertekeles FROM modulok WHERE id = ?';

    db.query(qSql, [modulId], (err, modulok) => {
        if (err) return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
        if (modulok.length === 0) return res.status(404).json({ success: false, message: 'Modul nem található' });

        const modul = modulok[0];
        let szakmaiAnyagSzoveg = '';
        let vanFile = false;

        const safeNev = sanitizeModuleFilename(modul.nev);
        const filePath = path.join(__dirname, 'szakmai anyag', `${safeNev}.txt`);
        try {
            if (fs.existsSync(filePath)) {
                szakmaiAnyagSzoveg = fs.readFileSync(filePath, 'utf-8');
                vanFile = true;
            }
        } catch (e) {
            logServerError('Szakmai anyag fájl olvasási hiba', e);
        }

       res.json({
            success: true,
            adatok: {
                szerep: modul.szerep,
                vizsgalt_targy: modul.vizsgalt_targy,
                ai_kontextus: modul.ai_kontextus,
                cim_jellemzes: modul.cim_jellemzes,
                prompt_jellemzes: modul.prompt_jellemzes,
                cim_fejlesztes: modul.cim_fejlesztes,
                prompt_fejlesztes: modul.prompt_fejlesztes,
                cim_ertekeles: modul.cim_ertekeles,
                prompt_ertekeles: modul.prompt_ertekeles,
                szakmai_anyag: szakmaiAnyagSzoveg,
                van_szakmai_file: vanFile
            }
        });
    });
});

// feltoltomodul.js - Mentés végpont
router.post('/api/ai-beallitasok', (req, res) => {
    const modulId = getCurrentModulId(req, res);
    const userId = getCurrentUserId(req, res);
    if (!modulId || !userId) return;

    const { szakmai_anyag, ...egyebAdatok } = req.body;

    const updateQuery = 'UPDATE modulok SET szerep=?, vizsgalt_targy=?, ai_kontextus=?, cim_jellemzes=?, prompt_jellemzes=?, cim_fejlesztes=?, prompt_fejlesztes=?, cim_ertekeles=?, prompt_ertekeles=? WHERE id=?';

    const params = [
        egyebAdatok.szerep, egyebAdatok.vizsgalt_targy, egyebAdatok.ai_kontextus,
        egyebAdatok.cim_jellemzes, egyebAdatok.prompt_jellemzes,
        egyebAdatok.cim_fejlesztes, egyebAdatok.prompt_fejlesztes,
        egyebAdatok.cim_ertekeles, egyebAdatok.prompt_ertekeles,
        modulId
    ];

    db.query(updateQuery, params, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'DB hiba' });

        if (!result || result.affectedRows === 0) {
            return res.status(403).json({ success: false, message: 'Nincs jogosultságod ezt a modult módosítani.' });
        }

        db.query('SELECT nev FROM modulok WHERE id = ?', [modulId], (err2, modulok) => {
            if (!err2 && modulok.length > 0) {
                const safeNev = sanitizeModuleFilename(modulok[0].nev);
                const filePath = path.join(__dirname, 'szakmai anyag', `${safeNev}.txt`);

                try {
                    const dir = path.dirname(filePath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                    fs.writeFileSync(filePath, szakmai_anyag || '', 'utf-8');
                } catch(e) { logServerError('Szakmai anyag fájl mentési hiba', e); }
            }

            logger(req, userId, 'AI_BEÁLLÍTÁS_MENTÉS', { modul_id: modulId });
            res.json({ success: true, message: 'Beállítások és dokumentum mentve!' });
        });
    });
});

// ÚJ SABLON MENTÉSE (Csoportosan)
router.post('/api/ment-sablonok', async (req, res) => {
    const modulId = getCurrentModulId(req, res);
    const userId = getCurrentUserId(req, res);
    const intId = getCurrentIntId(req, res);
    if (!modulId || !userId || !intId) return;

    const { sablonNev, elemek } = req.body;

    if (!sablonNev || !Array.isArray(elemek) || elemek.length === 0) {
        return res.status(400).json({ success: false, message: 'Hiányzó adatok a mentéshez.' });
    }

    try {
        const hasKerdesTipus = await hasSablonokKerdesTipusColumn();
        const query = hasKerdesTipus
            ? `
                INSERT INTO sablonok (csoport_nev, kerdes, ag, pont, szoveges, maximalis_szint, modul_id, int_id, kerdes_tipus)
                VALUES ?
              `
            : `
                INSERT INTO sablonok (csoport_nev, kerdes, ag, pont, szoveges, maximalis_szint, modul_id, int_id)
                VALUES ?
              `;

        const values = elemek.map(e => {
            const kerdesTipus = sablonKerdesTipusFromElem(e);
            const alap = [
                sablonNev,
                e.szoveg,
                e.ag,
                Number(e.ertek) || 0,
                kerdesTipus === 'opcio' ? 0 : (e.szoveges ? 1 : 0),
                kerdesTipus === 'opcio' ? 0 : (e.maxi ? 1 : 0),
                modulId,
                intId
            ];

            if (hasKerdesTipus) alap.push(kerdesTipus);
            return alap;
        });

        await q(query, [values]);
        logger(req, userId, 'SABLON_MENTÉS', { modul_id: modulId, elemek_szama: elemek.length });
        res.json({ success: true, message: 'Sablon sikeresen elmentve!' });
    } catch (err2) {
        logServerError('Sablon mentési hiba', err2);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba a mentés során.' });
    }
});


// Modul szamolas: 0 = arányosított, 1 = pontösszegző
router.get('/api/modul-szamolas', async (req, res) => {
  const modulId = getCurrentModulId(req, res);
  if (!modulId) return;

  try {
    const rows = await q(
      'SELECT COALESCE(szamolas, 0) AS szamolas FROM modulok WHERE id = ? LIMIT 1',
      [modulId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Modul nem található.' });
    }

    res.json({
      success: true,
      szamolas: Number(rows[0].szamolas) === 1 ? 1 : 0
    });
  } catch (err) {
    logServerError('Modul számolási mód lekérdezési hiba', err);
    res.status(500).json({
      success: false,
      message: 'A számolási mód lekérdezése sikertelen.'
    });
  }
});

router.patch('/api/modul-szamolas', async (req, res) => {
  const modulId = getCurrentModulId(req, res);
  const userId = getCurrentUserId(req, res);
  if (!modulId || !userId) return;

  const szamolas = req.body?.szamolas === 1 || req.body?.szamolas === '1' || req.body?.szamolas === true
    ? 1
    : 0;

  try {
    const result = await q(
      'UPDATE modulok SET szamolas = ? WHERE id = ?',
      [szamolas, modulId]
    );

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Modul nem található.' });
    }

    logger(req, userId, 'MODUL_SZAMOLAS_MODOSITAS', { modul_id: modulId, szamolas });

    res.json({
      success: true,
      szamolas,
      message: szamolas === 1
        ? 'Pontösszegző számolás bekapcsolva.'
        : 'Arányosított számolás bekapcsolva.'
    });
  } catch (err) {
    logServerError('Modul számolási mód mentési hiba', err);
    res.status(500).json({
      success: false,
      message: 'A számolási mód mentése sikertelen.'
    });
  }
});

    return router;
};
module.exports = feltoltes;