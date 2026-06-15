const express = require('express');
const router = express.Router();

module.exports = (db) => {
const logger = require('./logmodul')(db);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function logServerError(context, err) {
  const safeError = {
    code: err?.code || err?.errno || err?.name || 'ERROR'
  };

  if (!IS_PRODUCTION) {
    safeError.message = err?.message || String(err || '');
    if (err?.sqlState) safeError.sqlState = err.sqlState;
  }

  console.error(`[felhasznalomodul] ${context}`, safeError);
}

function countObjectKeys(value) {
  return value && typeof value === 'object'
    ? Object.keys(value).length
    : 0;
}

const {
  requireLogin,
  attachUserContext,
  requireModuleAccess,
  requireActiveLicense
} = require('./security')(db);

router.use(requireLogin);
router.use(attachUserContext);
router.use(requireModuleAccess);

// új kitöltés
router.post('/add-kitoltes', requireActiveLicense('create_evaluation'), (req, res) => {
  const { letrehozva, kitoltes_neve, vizsgalt_nev, audit } = req.body;

  const felhasznalo_id = req.auth.userId;
  const modul_id = req.auth.modulId;
  const int_id = req.auth.intId;

  if (
    letrehozva == null ||
    kitoltes_neve == null ||
    vizsgalt_nev == null
  ) {
    return res.status(400).json({ success: false, message: 'Hiányzó adat!' });
  }

  if (!Number.isInteger(felhasznalo_id) || felhasznalo_id <= 0) {
    return res.status(401).json({ success: false, message: 'Érvénytelen felhasználó.' });
  }
  if (!Number.isInteger(int_id) || int_id <= 0) {
  return res.status(403).json({ success: false, message: 'Érvénytelen intézmény.' });
}

  if (!Number.isInteger(modul_id) || modul_id <= 0) {
    return res.status(403).json({ success: false, message: 'Érvénytelen modul.' });
  }

 const selectVizsgalt = `
    SELECT vizsgalt_id
      FROM vizsgaltak
     WHERE CAST(AES_DECRYPT(nev_enc, @aes_key) AS CHAR(255)) = ?
       AND int_id = ?
     LIMIT 1
  `;

db.query(selectVizsgalt, [vizsgalt_nev, int_id], (selErr, rows) => {
    if (selErr) {
      logServerError('Adatbázis hiba (SELECT vizsgaltak):', selErr);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
    }

    const insertOrUseVizsgalt = () => {
     const insertSql = `
  INSERT INTO kitoltesek
    (felhasznalo_id, letrehozva, kitoltes_neve, role, modul_id, vizsgalt_id, ai_kit_max)
  VALUES (?, ?, ?, ?, ?, ?, 10)
`;
      db.query(
        insertSql,
        [felhasznalo_id, letrehozva, kitoltes_neve, 'admin', modul_id, vizsgaltId],
        (insErr, result) => {
          if (insErr) {
            logServerError('Adatbázis hiba (INSERT kitoltesek):', insErr);
            return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
          }

          const newId = result.insertId;
          db.query(
            'UPDATE kitoltesek SET idk = ? WHERE id = ?',
            [newId, newId],
            updateErr => {
              if (updateErr) {
                logServerError('Adatbázis hiba (idk frissítés):', updateErr);
                return res.status(500).json({
                  success: false,
                  message: 'Hiba történt az idk frissítésekor!'
                });
              }

              // Audit-logika beszúrása
              if (audit) {
                const auditQuery = `
                  INSERT INTO vizsgalt_hozzajarulas_naplo
                    (vizsgalt_id, user_id, beleegyezes_datuma, ip_cim, user_agent, verzio_tag)
                  VALUES (?, ?, NOW(), ?, ?, ?)`;

                const ipCim = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

                db.query(
                  auditQuery,
                  [vizsgaltId, felhasznalo_id, ipCim, audit.user_agent, audit.verzio_tag],
                  auditErr => {
                    if (auditErr) {
                      logServerError('Audit adatbázis hiba:', auditErr);
                      return res.status(500).json({ success: false, message: 'Audit hiba történt!' });
                    }

                    res.json({ success: true, message: 'Sikeres mentés!', id: newId });
                    logger(req, felhasznalo_id, 'új értékelés', {
                      kitoltes_id: newId,
                      modul_id,
                      hozzajarulas_rogzitve: true
                    });
                  }
                );
              } else {
                res.json({ success: true, message: 'Sikeres mentés!', id: newId });
              }
            }
          );
        }
      );
    };

    let vizsgaltId;
    if (rows.length) {
      vizsgaltId = rows[0].vizsgalt_id;
      insertOrUseVizsgalt();
    } else {
const insertVizsgalt = `
  INSERT INTO vizsgaltak (nev_enc, int_id, hozzajarulas_datuma)
  VALUES (AES_ENCRYPT(?, @aes_key), ?, NOW())
`;

db.query(insertVizsgalt, [vizsgalt_nev, int_id], (insErr, insRes) => {
        if (insErr) {
          logServerError('Adatbázis hiba (INSERT vizsgaltak):', insErr);
          return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
        }
        vizsgaltId = insRes.insertId;
        insertOrUseVizsgalt();
      });
    }
  });
});

  //kitöltés nevének frissítése
// kitöltés nevének frissítése
router.post('/update-kitoltes', requireActiveLicense('edit_evaluation'), (req, res) => {
  const { id, letrehozva, kitoltes_neve, vizsgalt_nev } = req.body;

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;
const intId = req.auth.intId;
  const cleanId = Number(id);

  if (!Number.isInteger(cleanId) || cleanId <= 0 || !letrehozva || !kitoltes_neve || !vizsgalt_nev) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás adatok!'
    });
  }
  const selectQ = `
    SELECT idk, vizsgalt_id
    FROM kitoltesek
    WHERE id = ?
      AND modul_id = ?
      AND felhasznalo_id = ?
      AND role IN ('admin', 'sysadmin')
    LIMIT 1
  `;

  db.query(selectQ, [cleanId, modulId, userId], (err, rows) => {
    if (err) {
      logServerError('Adatbázis hiba (SELECT update-kitoltes):', err);
      return res.status(500).json({
        success: false,
        message: 'Adatbázis hiba!'
      });
    }

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ezt a kitöltést módosítani.'
      });
    }

    const { idk, vizsgalt_id } = rows[0];

    const updKit = `
      UPDATE kitoltesek
      SET kitoltes_neve = ?, letrehozva = ?
      WHERE idk = ?
        AND modul_id = ?
    `;

    db.query(updKit, [kitoltes_neve, letrehozva, idk, modulId], updateErr => {
      if (updateErr) {
        logServerError('Adatbázis hiba (UPDATE kitoltesek):', updateErr);
        return res.status(500).json({
          success: false,
          message: 'Frissítési hiba a kitoltesek táblában!'
        });
      }

   const updVizs = `
  UPDATE vizsgaltak
  SET nev_enc = AES_ENCRYPT(?, @aes_key)
  WHERE vizsgalt_id = ?
    AND int_id = ?
`;

db.query(updVizs, [vizsgalt_nev, vizsgalt_id, intId], vizErr => {
        if (vizErr) {
          logServerError('Adatbázis hiba (UPDATE vizsgaltak):', vizErr);
          return res.status(500).json({
            success: false,
            message: 'Frissítési hiba a vizsgaltak táblában!'
          });
        }

        logger(req, userId, 'kitöltés metaadatainak módosítása', {
          idk,
          modul_id: modulId,
          kitoltes_neve_modosult: true,
          vizsgalt_nev_modosult: true
        });

        res.json({
          success: true,
          message: 'Sikeres frissítés! Kitöltés és alanynév is frissítve.'
        });
      });
    });
  });
});
//Adminisztratív ellenörzés
// felhasznalomodul.js

router.get('/check-missing-audit-with-names', (req, res) => {
  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      message: 'Érvénytelen felhasználó.'
    });
  }

  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(403).json({
      success: false,
      message: 'Érvénytelen modul.'
    });
  }

  /*
    Csak a bejelentkezett user saját, aktuális modulhoz tartozó,
    admin/saját értékeléseihez nézünk hiányzó hozzájárulást.
    Nem a queryből jövő user_id/modul_id dönt.
  */
  const sql = `
    SELECT DISTINCT
      k.idk,
      k.vizsgalt_id,
      CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
    FROM kitoltesek k
    LEFT JOIN vizsgalt_hozzajarulas_naplo n
      ON k.vizsgalt_id = n.vizsgalt_id
     AND n.user_id = ?
    LEFT JOIN vizsgaltak v
      ON k.vizsgalt_id = v.vizsgalt_id
    WHERE k.felhasznalo_id = ?
      AND k.modul_id = ?
      AND k.role IN ('admin', 'sysadmin')
      AND k.vizsgalt_id IS NOT NULL
      AND n.vizsgalt_id IS NULL
  `;

  db.query(sql, [userId, userId, modulId], (err, rows) => {
    if (err) {
      logServerError('check-missing-audit-with-names hiba:', err);
      return res.status(500).json({
        success: false,
        message: 'Adatbázis hiba történt'
      });
    }

    res.json({
      success: true,
      kitoltesek: rows
    });
  });
});

router.post('/audit-confirm', requireActiveLicense('use_audit'), (req, res) => {
  const { vizsgalt_ids } = req.body;

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  if (!Array.isArray(vizsgalt_ids) || vizsgalt_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vizsgalt_ids.'
    });
  }

  const cleanVizsgaltIds = [...new Set(
    vizsgalt_ids
      .map(id => Number(id))
      .filter(id => Number.isInteger(id) && id > 0)
  )];

  if (cleanVizsgaltIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Nincs érvényes vizsgalt_id.'
    });
  }

  const placeholders = cleanVizsgaltIds.map(() => '?').join(',');

  /*
    Csak azokat a vizsgalt_id-kat fogadjuk el,
    amelyek a bejelentkezett user saját, aktuális modulhoz tartozó
    admin/sysadmin értékeléseiben tényleg szerepelnek.
  */
  const checkSql = `
    SELECT DISTINCT k.vizsgalt_id
    FROM kitoltesek k
    LEFT JOIN vizsgalt_hozzajarulas_naplo n
      ON n.vizsgalt_id = k.vizsgalt_id
     AND n.user_id = ?
    WHERE k.felhasznalo_id = ?
      AND k.modul_id = ?
      AND k.role IN ('admin', 'sysadmin')
      AND k.vizsgalt_id IN (${placeholders})
      AND n.vizsgalt_id IS NULL
  `;

  db.query(
    checkSql,
    [userId, userId, modulId, ...cleanVizsgaltIds],
    (checkErr, allowedRows) => {
      if (checkErr) {
        logServerError('audit-confirm jogosultság ellenőrzési hiba:', checkErr);
        return res.status(500).json({
          success: false,
          message: 'Jogosultsági ellenőrzési hiba.'
        });
      }

      if (allowedRows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Nincs naplózható hozzájárulás.'
        });
      }

      const allowedVizsgaltIds = allowedRows.map(row => Number(row.vizsgalt_id));

      const ipCim =
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        null;

      const userAgent = req.get('User-Agent') || null;
      const verzioTag = 'manual-confirm';

      const insertPlaceholders = allowedVizsgaltIds
        .map(() => '(?, ?, NOW(), ?, ?, ?)')
        .join(', ');

      const params = [];

      allowedVizsgaltIds.forEach(vizsgaltId => {
        params.push(
          vizsgaltId,
          userId,
          ipCim,
          userAgent,
          verzioTag
        );
      });

      const insertSql = `
        INSERT INTO vizsgalt_hozzajarulas_naplo
          (vizsgalt_id, user_id, beleegyezes_datuma, ip_cim, user_agent, verzio_tag)
        VALUES ${insertPlaceholders}
      `;

      db.query(insertSql, params, (insertErr, result) => {
        if (insertErr) {
          logServerError('Audit-confirm hiba:', insertErr);
          return res.status(500).json({
            success: false,
            message: 'Audit mentési hiba.'
          });
        }

        logger(req, userId, 'hozzájárulás naplózása', {
          vizsgalt_db: allowedVizsgaltIds.length,
          modul_id: modulId
        });

        res.json({
          success: true,
          inserted: result.affectedRows
        });
      });
    }
  );
});
// --- EREDETI ADMIN LEKÉRDEZÉSE -------------------------------------
// Eredeti admin lekérdezése
router.get('/original-admin', (req, res) => {
  const kitoltesId = Number(req.query.kitoltesId);

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  if (!Number.isInteger(kitoltesId) || kitoltesId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitoltesId!'
    });
  }

  /*
    Először ellenőrizzük, hogy a lekérdező hozzáfér-e ehhez az idk-hoz.
    Csak utána adjuk vissza az eredeti tulajdonos nevét.
  */
  const accessQuery = `
    SELECT 1
    FROM kitoltesek
    WHERE idk = ?
      AND modul_id = ?
      AND felhasznalo_id = ?
      AND role IN ('admin', 'sysadmin', 'editor')
    LIMIT 1
  `;

  db.query(accessQuery, [kitoltesId, modulId, userId], (accessErr, accessRows) => {
    if (accessErr) {
      logServerError('original-admin jogosultság ellenőrzési hiba:', accessErr);
      return res.status(500).json({
        success: false,
        message: 'Jogosultsági ellenőrzési hiba!'
      });
    }

    if (accessRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    const sql = `
      SELECT f.vez AS owner_name
      FROM kitoltesek k
      JOIN felhasznalok f ON k.felhasznalo_id = f.id
      WHERE k.idk = ?
        AND k.modul_id = ?
        AND k.role IN ('admin', 'sysadmin')
      LIMIT 1
    `;

    db.query(sql, [kitoltesId, modulId], (err, rows) => {
      if (err) {
        logServerError('original-admin lekérdezés hiba:', err);
        return res.status(500).json({
          success: false,
          message: 'Adatbázis hiba!'
        });
      }

      if (!rows.length) {
        return res.json({
          success: false,
          message: 'Nincs admin-sor'
        });
      }

      res.json({
        success: true,
        owner_name: rows[0].owner_name || 'Ismeretlen'
      });
    });
  });
});



    //Kitöltés törlése
// Kitöltés törlése
router.delete('/delete-kitoltes', requireActiveLicense('delete_evaluation'), (req, res) => {
  const { id } = req.body;

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  const cleanId = Number(id);

  if (!Number.isInteger(cleanId) || cleanId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitoltes_id!'
    });
  }

 const getIdkQuery = `
  SELECT idk
  FROM kitoltesek
  WHERE id = ?
    AND modul_id = ?
    AND felhasznalo_id = ?
    AND role IN ('admin', 'sysadmin')
  LIMIT 1
`;

db.query(getIdkQuery, [cleanId, modulId, userId], (err, results) => {    if (err) {
      logServerError('Adatbázis hiba az idk lekérdezése során:', err);
      return res.status(500).json({
        success: false,
        message: 'Adatbázis hiba történt!'
      });
    }

    if (results.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ezt a kitöltést törölni.'
      });
    }

    const idk = results[0].idk;

const deleteValaszokQuery = `
  DELETE FROM valaszok
  WHERE kitoltes_id = ?
`;

db.query(deleteValaszokQuery, [idk], (err) => {
      if (err) {
        logServerError('Adatbázis hiba a válaszok törlése során:', err);
        return res.status(500).json({
          success: false,
          message: 'Adatbázis hiba történt a válaszok törlése során!'
        });
      }

      const deleteKitoltesQuery = `
        DELETE FROM kitoltesek
        WHERE idk = ?
          AND modul_id = ?
      `;

      db.query(deleteKitoltesQuery, [idk, modulId], (err, results) => {
        if (err) {
          logServerError('Adatbázis hiba a kitoltesek törlése során:', err);
          return res.status(500).json({
            success: false,
            message: 'Adatbázis hiba történt a kitöltés törlése során!'
          });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Nincs törölhető rekord!'
          });
        }

        logger(req, userId, 'törlés', {
          torolt_idk: idk,
          modul_id: modulId
        });

        res.json({
          success: true,
          message: 'Sikeres törlés! Minden megosztott példány eltávolítva.'
        });
      });
    });
  });
});
// modulok/felhasznalomodul.js

// Kitöltés duplikálása
router.post('/duplicate-kitoltes', requireActiveLicense('duplicate_evaluation'), (req, res) => {
  const { originalIdk, ujNev, ujVizsgaltNev } = req.body;
const intId = req.auth.intId;
  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  const cleanOriginalIdk = Number(originalIdk);

  if (!Number.isInteger(cleanOriginalIdk) || cleanOriginalIdk <= 0 || !ujNev) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás adatok!'
    });
  }

  /*
    Jogosultsági ellenőrzés:
    Csak akkor duplikálhat, ha az adott idk-hoz van saját vagy megosztott sora
    az aktuális modulban.
  */
  const selectOriginal = `
    SELECT
      k.*,
      CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS original_vizsgalt_nev
    FROM kitoltesek k
    LEFT JOIN vizsgaltak v ON k.vizsgalt_id = v.vizsgalt_id
    WHERE k.idk = ?
      AND k.modul_id = ?
      AND EXISTS (
        SELECT 1
        FROM kitoltesek sajat
        WHERE sajat.idk = k.idk
          AND sajat.modul_id = ?
          AND sajat.felhasznalo_id = ?
          AND sajat.role IN ('admin', 'sysadmin', 'editor')
        LIMIT 1
      )
      AND k.role IN ('admin', 'sysadmin')
    LIMIT 1
  `;

  db.query(
    selectOriginal,
    [cleanOriginalIdk, modulId, modulId, userId],
    (err, rows) => {
      if (err) {
        logServerError('Hiba az eredeti kitöltés lekérésekor:', err);
        return res.status(500).json({
          success: false,
          message: 'Adatbázis hiba az eredeti értékelés lekérésekor!'
        });
      }

      if (rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Nincs jogosultságod ezt az értékelést duplikálni.'
        });
      }

      const original = rows[0];
      const subjectName = ujVizsgaltNev || original.original_vizsgalt_nev || 'Névtelen alany';

     const insertNewSubject = `
  INSERT INTO vizsgaltak (nev_enc, int_id, hozzajarulas_datuma)
  VALUES (AES_ENCRYPT(?, @aes_key), ?, NOW())
`;

db.query(insertNewSubject, [subjectName, intId], (subjErr, subjResult) => {
        if (subjErr) {
          logServerError('Hiba az új alany létrehozásakor:', subjErr);
          return res.status(500).json({
            success: false,
            message: 'Adatbázis hiba az új alany létrehozásakor!'
          });
        }

        const newVizsgaltId = subjResult.insertId;
        const maiDatum = new Date().toISOString().split('T')[0];

        const insertKitoltes = `
          INSERT INTO kitoltesek
          (
            felhasznalo_id,
            letrehozva,
            kitoltes_neve,
            role,
            modul_id,
            vizsgalt_id,
            szazalek,
            ai_kit_max
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 10)
        `;

        db.query(
          insertKitoltes,
          [
            userId,
            maiDatum,
            ujNev,
            'admin',
            modulId,
            newVizsgaltId,
            original.szazalek
          ],
          (insErr, result) => {
            if (insErr) {
              logServerError('Hiba az új kitöltés beszúrásakor:', insErr);
              return res.status(500).json({
                success: false,
                message: 'Adatbázis hiba az új kitöltés létrehozásakor!'
              });
            }

            const newId = result.insertId;

            /*
              Fontos:
              Nálad a válaszok kitoltes_id mezője ténylegesen idk-logikával működik.
              Az új saját kitöltésnél id = idk lesz.
            */
            const updateIdk = `
              UPDATE kitoltesek
              SET idk = ?
              WHERE id = ?
                AND felhasznalo_id = ?
                AND modul_id = ?
            `;

            db.query(updateIdk, [newId, newId, userId, modulId], (updErr) => {
              if (updErr) {
                logServerError('Hiba az IDK frissítésekor:', updErr);
                return res.status(500).json({
                  success: false,
                  message: 'Adatbázis hiba az IDK frissítésekor!'
                });
              }

              const duplicateAnswers = `
                INSERT INTO valaszok
                (
                  kitoltes_id,
                  kerdes_id,
                  kerdes_valasz,
                  valasz_szoveg,
                  felhasznalo_id,
                  letrehozva
                )
                SELECT
                  ?,
                  kerdes_id,
                  kerdes_valasz,
                  valasz_szoveg,
                  ?,
                  NOW()
                FROM valaszok
                WHERE kitoltes_id = ?
              `;

              db.query(
                duplicateAnswers,
                [newId, userId, cleanOriginalIdk],
                (copyErr, copyRes) => {
                  if (copyErr) {
                    logServerError('Hiba a válaszok másolásakor:', copyErr);
                    return res.status(500).json({
                      success: false,
                      message: 'Hiba a válaszok másolásakor!'
                    });
                  }

                  logger(req, userId, 'másolás', {
                    eredeti_idk: cleanOriginalIdk,
                    uj_idk: newId,
                    modul_id: modulId
                  });

                  res.json({
                    success: true,
                    message: 'Sikeres duplikálás!',
                    newId,
                    copiedAnswers: copyRes.affectedRows
                  });
                }
              );
            });
          }
        );
      });
    }
  );
});
    
    // Kitoltes_neve lekérése ID alapján
// Lekéri a kitöltéseket a dekódolt alanynévvel együtt
// Lekéri a kitöltéseket a dekódolt alanynévvel együtt
router.get('/get-kitoltesek', (req, res) => {
  const userId = req.auth.userId;
  const modulId = req.auth.modulId;
  const intId = req.auth.intId;
  const roleId = Number(req.auth.roleId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      message: 'Érvénytelen felhasználó.'
    });
  }

  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(403).json({
      success: false,
      message: 'Érvénytelen modul.'
    });
  }

  let whereSql = '';
  let args = [];

  if (roleId === 1 || roleId === 2) {
    whereSql = `
      WHERE k.modul_id = ?
        AND f.int_id = ?
    `;
    args = [modulId, intId];
  } else {
    whereSql = `
      WHERE k.modul_id = ?
        AND k.felhasznalo_id = ?
    `;
    args = [modulId, userId];
  }

  const sql = `
    SELECT
      k.id,
      k.idk,
      k.kitoltes_neve,
      k.role,
      k.vizsgalt_id,
      k.audit,
      k.letrehozva,
      k.AI,
      k.ai_kit_max,
      f.ai_ossz_max,
      k.ai_ertekeles,
      k.ai_jellemzes,
      k.utoljara_modositva,
      lv.utolso_valasz_modositas,
      lv.utolso_valasz_modosito,
      COALESCE(lv.utolso_valasz_modositas, k.utoljara_modositva, k.letrehozva) AS utolso_modositas,
      COALESCE(lv.utolso_valasz_modosito, f.vez) AS utolso_modosito,
      a.warm,
      a.hatarido,
      f.vez AS creator_name,
      f.mail AS creator_mail,
      CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
    FROM kitoltesek k
    JOIN felhasznalok f ON k.felhasznalo_id = f.id
    LEFT JOIN vizsgaltak v ON k.vizsgalt_id = v.vizsgalt_id
    LEFT JOIN audit a ON a.audit_id = k.id
    LEFT JOIN (
      SELECT
        ranked.kitoltes_id,
        ranked.letrehozva AS utolso_valasz_modositas,
        ranked.felhasznalo_nev AS utolso_valasz_modosito
      FROM (
        SELECT
          valaszok_ranked.kitoltes_id,
          valaszok_ranked.letrehozva,
          f2.vez AS felhasznalo_nev,
          ROW_NUMBER() OVER (
            PARTITION BY valaszok_ranked.kitoltes_id
            ORDER BY valaszok_ranked.letrehozva DESC, valaszok_ranked.kerdes_id DESC
          ) AS rn
        FROM valaszok valaszok_ranked
        JOIN felhasznalok f2
          ON f2.id = valaszok_ranked.felhasznalo_id
      ) ranked
      WHERE ranked.rn = 1
    ) lv ON lv.kitoltes_id = k.idk
    ${whereSql}
    ORDER BY COALESCE(lv.utolso_valasz_modositas, k.utoljara_modositva, k.letrehozva) DESC, k.id DESC
  `;

  db.query(sql, args, (err, rows) => {
    if (err) {
      logServerError('Adatbázis hiba (/get-kitoltesek):', err);
      return res.status(500).json({
        success: false,
        message: 'Adatbázis hiba történt!'
      });
    }

    return res.json({
      success: true,
      kitoltesek: rows
    });
  });
});


  // Lekéri egy adott kitöltés címét és a dekódolt alany nevét
// Lekéri egy adott kitöltés címét és a dekódolt alany nevét
// Lekéri egy adott kitöltés címét és a dekódolt alany nevét
router.get('/get-kitoltes-neve', (req, res) => {
  const kitoltesIdk = Number(req.query.idk);

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;
  const roleId = Number(req.auth.roleId);
  const intId = req.auth.intId;

  if (!Number.isInteger(kitoltesIdk) || kitoltesIdk <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitoltes_idk!'
    });
  }

  const sql = `
    SELECT
      k.kitoltes_neve,
      CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
    FROM kitoltesek k
    JOIN felhasznalok f
      ON f.id = k.felhasznalo_id
    LEFT JOIN vizsgaltak v
      ON k.vizsgalt_id = v.vizsgalt_id
    WHERE k.idk = ?
      AND k.modul_id = ?
      AND (
        k.felhasznalo_id = ?
        OR EXISTS (
          SELECT 1
          FROM kitoltesek sajat
          WHERE sajat.idk = k.idk
            AND sajat.modul_id = k.modul_id
            AND sajat.felhasznalo_id = ?
            AND sajat.role IN ('admin', 'sysadmin', 'editor')
          LIMIT 1
        )
        OR (
          ? IN (1, 2)
          AND f.int_id = ?
        )
      )
    ORDER BY
      CASE
        WHEN k.felhasznalo_id = ? THEN 0
        WHEN k.role IN ('admin', 'sysadmin') THEN 1
        ELSE 2
      END
    LIMIT 1
  `;

  db.query(sql, [kitoltesIdk, modulId, userId, userId, roleId, intId, userId], (err, results) => {
    if (err) {
      logServerError('Adatbázis hiba (/get-kitoltes-neve):', err);
      return res.status(500).json({
        success: false,
        message: 'Adatbázis hiba történt!'
      });
    }

    if (results.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    return res.json({
      success: true,
      kitoltes_neve: results[0].kitoltes_neve,
      vizsgalt_nev: results[0].vizsgalt_nev
    });
  });
});


function normalizeOpcioValaszokMentesehez(db, modulId, valaszok, callback) {
  const igenIds = Object.entries(valaszok)
    .filter(([, valasz]) => valasz === 'igen')
    .map(([kerdesId]) => Number(kerdesId))
    .filter(kerdesId => Number.isInteger(kerdesId) && kerdesId > 0);

  if (igenIds.length === 0) {
    callback(null, valaszok);
    return;
  }

  const selectedSql = `
    SELECT id, parent_id, kategoria_kapcsolo_id, kindex
    FROM kerdesek
    WHERE modul_id = ?
      AND opcios = 1
      AND id IN (?)
    ORDER BY kindex ASC, id ASC
  `;

  db.query(selectedSql, [modulId, igenIds], (selectedErr, selectedRows) => {
    if (selectedErr) {
      callback(selectedErr);
      return;
    }

    if (!selectedRows.length) {
      callback(null, valaszok);
      return;
    }

    const keptByGroup = new Map();
    const parentIds = new Set();
    const kapcsoloIds = new Set();

    selectedRows.forEach(row => {
      const parentId = Number(row.parent_id) || null;
      const kapcsoloId = Number(row.kategoria_kapcsolo_id) || null;
      const groupKey = parentId ? `parent:${parentId}` : (kapcsoloId ? `kapcsolo:${kapcsoloId}` : null);

      if (!groupKey) return;

      if (!keptByGroup.has(groupKey)) {
        keptByGroup.set(groupKey, Number(row.id));
      }

      if (parentId) parentIds.add(parentId);
      else if (kapcsoloId) kapcsoloIds.add(kapcsoloId);
    });

    if (keptByGroup.size === 0) {
      callback(null, valaszok);
      return;
    }

    const whereParts = [];
    const params = [modulId];

    if (parentIds.size > 0) {
      whereParts.push('parent_id IN (?)');
      params.push([...parentIds]);
    }

    if (kapcsoloIds.size > 0) {
      whereParts.push('(parent_id IS NULL AND kategoria_kapcsolo_id IN (?))');
      params.push([...kapcsoloIds]);
    }

    const siblingsSql = `
      SELECT id, parent_id, kategoria_kapcsolo_id
      FROM kerdesek
      WHERE modul_id = ?
        AND opcios = 1
        AND (${whereParts.join(' OR ')})
    `;

    db.query(siblingsSql, params, (siblingsErr, siblingRows) => {
      if (siblingsErr) {
        callback(siblingsErr);
        return;
      }

      siblingRows.forEach(row => {
        const parentId = Number(row.parent_id) || null;
        const kapcsoloId = Number(row.kategoria_kapcsolo_id) || null;
        const groupKey = parentId ? `parent:${parentId}` : (kapcsoloId ? `kapcsolo:${kapcsoloId}` : null);
        const keptId = keptByGroup.get(groupKey);
        const rowId = Number(row.id);

        if (groupKey && keptId && rowId !== keptId) {
          valaszok[rowId] = 'ures';
        }
      });

      callback(null, valaszok);
    });
  });
}

    // Kitöltés mentése / válaszok upsert + százalék-JSON update
// felhasznalomodul.js - Optimalizált /save-valaszok

router.post('/save-valaszok', requireActiveLicense('edit_evaluation'), (req, res) => {
  const {
    kitoltesId,
    kerdesValaszok,
    szovegesValaszok,
    ido,
    szazalek
  } = req.body;

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  const cleanKitoltesId = Number(kitoltesId);

  if (!Number.isInteger(cleanKitoltesId) || cleanKitoltesId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitoltesId!'
    });
  }

  const safeKerdesValaszok =
    typeof kerdesValaszok === 'object' && kerdesValaszok !== null
      ? kerdesValaszok
      : {};

  const safeSzovegesValaszok =
    typeof szovegesValaszok === 'object' && szovegesValaszok !== null
      ? szovegesValaszok
      : {};


  const accessQuery = `
    SELECT id, idk
    FROM kitoltesek
    WHERE modul_id = ?
      AND felhasznalo_id = ?
      AND role IN ('admin', 'sysadmin', 'editor')
      AND (id = ? OR idk = ?)
    LIMIT 1
  `;

  db.query(
    accessQuery,
    [modulId, userId, cleanKitoltesId, cleanKitoltesId],
    (accessErr, accessRows) => {
      if (accessErr) {
        logServerError('save-valaszok jogosultság ellenőrzési hiba:', accessErr);
        return res.status(500).json({
          success: false,
          message: 'Jogosultsági ellenőrzési hiba!'
        });
      }

      if (accessRows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Nincs jogosultságod ehhez az értékeléshez.'
        });
      }

      const sajatKitoltesId = accessRows[0].id;
      const kozosIdk = accessRows[0].idk;

      const folytatMentessel = () => {
      const allKeys = new Set([
        ...Object.keys(safeKerdesValaszok),
        ...Object.keys(safeSzovegesValaszok)
      ]);

      const valuesToInsert = [];

      allKeys.forEach(kerdesId => {
        const cleanKerdesId = Number(kerdesId);

        if (!Number.isInteger(cleanKerdesId) || cleanKerdesId <= 0) {
          return;
        }

        const valasz = safeKerdesValaszok[kerdesId] ?? null;
        const szoveg = safeSzovegesValaszok[kerdesId] ?? null;

       valuesToInsert.push([
  kozosIdk,
  cleanKerdesId,
  valasz,
  szoveg,
  userId,
  ido
]);
      });

     const saveJsonAndResponse = () => {
  const modositottKerdesekDb = countObjectKeys(safeKerdesValaszok);
  const modositottSzovegekDb = countObjectKeys(safeSzovegesValaszok);

  const voltTartalmiModositas =
    modositottKerdesekDb > 0 || modositottSzovegekDb > 0;

  if (voltTartalmiModositas) {
    logger(req, userId, 'értékelés módosítása', {
      kitoltes_id: kozosIdk,
      sajat_sor_id: sajatKitoltesId,
      idk: kozosIdk,
      modul_id: modulId,
      modositott_kerdesek_db: modositottKerdesekDb,
      modositott_szovegek_db: modositottSzovegekDb,
      szoveges_valasz_erintett: modositottSzovegekDb > 0
    });
  }

  let updQ;
  let updParams;

  if (szazalek) {
    updQ = `
      UPDATE kitoltesek
      SET 
        szazalek = ?,
        utoljara_modositva = CASE
          WHEN ? THEN NOW()
          ELSE utoljara_modositva
        END
      WHERE idk = ?
        AND modul_id = ?
    `;

    updParams = [
      JSON.stringify(szazalek),
      voltTartalmiModositas ? 1 : 0,
      kozosIdk,
      modulId
    ];
  } else {
    updQ = `
      UPDATE kitoltesek
      SET utoljara_modositva = CASE
        WHEN ? THEN NOW()
        ELSE utoljara_modositva
      END
      WHERE idk = ?
        AND modul_id = ?
    `;

    updParams = [
      voltTartalmiModositas ? 1 : 0,
      kozosIdk,
      modulId
    ];
  }

  db.query(updQ, updParams, (err) => {
    if (err) {
      logServerError('Kitöltés módosítási dátum frissítési hiba:', err);
      return res.status(500).json({
        success: false,
        message: 'Kitöltés módosítási dátum mentési hiba!'
      });
    }

    return res.json({
      success: true,
      message: szazalek
        ? 'Válaszok + JSON mentve!'
        : 'Válaszok mentve!'
    });
  });
};

      if (valuesToInsert.length === 0) {
        return saveJsonAndResponse();
      }

      const bulkInsertQuery = `
        INSERT INTO valaszok
        (kitoltes_id, kerdes_id, kerdes_valasz, valasz_szoveg, felhasznalo_id, letrehozva)
        VALUES ?
        ON DUPLICATE KEY UPDATE
        kerdes_valasz  = COALESCE(VALUES(kerdes_valasz), valaszok.kerdes_valasz),
        valasz_szoveg  = COALESCE(VALUES(valasz_szoveg), valaszok.valasz_szoveg),
        letrehozva     = VALUES(letrehozva),
        felhasznalo_id = VALUES(felhasznalo_id)
      `;

      db.query(bulkInsertQuery, [valuesToInsert], (err) => {
        if (err) {
          logServerError('Adatbázis hiba (Bulk Insert):', err);
          return res.status(500).json({
            success: false,
            message: 'Adatbázis hiba történt a válaszok mentésekor!'
          });
        }

        saveJsonAndResponse();
      });
      };

      normalizeOpcioValaszokMentesehez(db, modulId, safeKerdesValaszok, (opcioErr) => {
        if (opcioErr) {
          logServerError('Opciós válaszok normalizálási hiba:', opcioErr);
          return res.status(500).json({
            success: false,
            message: 'Opciós válaszok mentési ellenőrzése sikertelen.'
          });
        }

        folytatMentessel();
      });
    }
  );
});
    //Százalék betöltése
   // Százalék betöltése
router.get('/get-kitoltes-szazalek', (req, res) => {
  const idk = Number(req.query.kitoltes_id);

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  if (!Number.isInteger(idk) || idk <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitoltes_id!'
    });
  }

const roleId = Number(req.auth.roleId);
const intId = req.auth.intId;

const sql = `
  SELECT k.szazalek
  FROM kitoltesek k
  JOIN felhasznalok f
    ON f.id = k.felhasznalo_id
  WHERE k.idk = ?
    AND k.modul_id = ?
    AND (
      EXISTS (
        SELECT 1
        FROM kitoltesek sajat
        WHERE sajat.idk = k.idk
          AND sajat.modul_id = k.modul_id
          AND sajat.felhasznalo_id = ?
          AND sajat.role IN ('admin', 'sysadmin', 'editor')
        LIMIT 1
      )
      OR (
        ? IN (1, 2)
        AND f.int_id = ?
      )
    )
  ORDER BY
    CASE
      WHEN k.felhasznalo_id = ? THEN 0
      WHEN k.role IN ('admin', 'sysadmin') THEN 1
      ELSE 2
    END
  LIMIT 1
`;

db.query(sql, [idk, modulId, userId, roleId, intId, userId], (err, rows) => {
    if (err) {
      logServerError('Adatbázis hiba (/get-kitoltes-szazalek):', err);
      return res.status(500).json({
        success: false,
        message: 'Adatbázis hiba történt!'
      });
    }

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    res.json({
      success: true,
      szazalek: rows[0].szazalek
    });
  });
});
    //Válaszok betöltése
   // Válaszok betöltése
// Válaszok betöltése
router.get('/get-valaszok', (req, res) => {
  const kitoltesId = Number(req.query.kitoltes_id);

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;
  const roleId = Number(req.auth.roleId);
  const intId = req.auth.intId;

  if (!Number.isInteger(kitoltesId) || kitoltesId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitoltes_id!'
    });
  }

  const accessQuery = `
    SELECT 1
    FROM kitoltesek k
    JOIN felhasznalok f
      ON f.id = k.felhasznalo_id
    WHERE k.idk = ?
      AND k.modul_id = ?
      AND (
        k.felhasznalo_id = ?
        OR EXISTS (
          SELECT 1
          FROM kitoltesek sajat
          WHERE sajat.idk = k.idk
            AND sajat.modul_id = k.modul_id
            AND sajat.felhasznalo_id = ?
            AND sajat.role IN ('admin', 'sysadmin', 'editor')
          LIMIT 1
        )
        OR (
          ? IN (1, 2)
          AND f.int_id = ?
        )
      )
    LIMIT 1
  `;

  db.query(accessQuery, [kitoltesId, modulId, userId, userId, roleId, intId], (accessErr, accessRows) => {
    if (accessErr) {
      logServerError('get-valaszok jogosultság ellenőrzési hiba:', accessErr);
      return res.status(500).json({
        success: false,
        message: 'Jogosultsági ellenőrzési hiba!'
      });
    }

    if (accessRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    const query = `
      SELECT kerdes_id, kerdes_valasz, valasz_szoveg
      FROM valaszok
      WHERE kitoltes_id = ?
    `;

    db.query(query, [kitoltesId], (err, results) => {
      if (err) {
        logServerError('Adatbázis hiba (/get-valaszok):', err);
        return res.status(500).json({
          success: false,
          message: 'Adatbázis hiba történt!'
        });
      }

      res.json({
        success: true,
        valaszok: results
      });
    });
  });
});
router.get('/get-legfrissebb-valasz', (req, res) => {
  const kitoltesId = Number(req.query.kitoltesId);

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;
  const roleId = Number(req.auth.roleId);
  const intId = req.auth.intId;

  if (!Number.isInteger(kitoltesId) || kitoltesId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitoltesId!'
    });
  }

  const accessQuery = `
    SELECT 1
    FROM kitoltesek k
    JOIN felhasznalok f
      ON f.id = k.felhasznalo_id
    WHERE k.idk = ?
      AND k.modul_id = ?
      AND (
        k.felhasznalo_id = ?
        OR EXISTS (
          SELECT 1
          FROM kitoltesek sajat
          WHERE sajat.idk = k.idk
            AND sajat.modul_id = k.modul_id
            AND sajat.felhasznalo_id = ?
            AND sajat.role IN ('admin', 'sysadmin', 'editor')
          LIMIT 1
        )
        OR (
          ? IN (1, 2)
          AND f.int_id = ?
        )
      )
    LIMIT 1
  `;

  db.query(accessQuery, [kitoltesId, modulId, userId, userId, roleId, intId], (accessErr, accessRows) => {
    if (accessErr) {
      logServerError('get-legfrissebb-valasz jogosultság ellenőrzési hiba:', accessErr);
      return res.status(500).json({
        success: false,
        message: 'Jogosultsági ellenőrzési hiba!'
      });
    }

    if (accessRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    const query = `
      SELECT
        f.vez AS felhasznalo_nev,
        v.letrehozva
      FROM valaszok v
      JOIN felhasznalok f
        ON v.felhasznalo_id = f.id
      WHERE v.kitoltes_id = ?
      ORDER BY v.letrehozva DESC
      LIMIT 1
    `;

    db.query(query, [kitoltesId], (err, results) => {
      if (err) {
        logServerError('Adatbázis hiba (/get-legfrissebb-valasz):', err);
        return res.status(500).json({
          success: false,
          message: 'Adatbázis hiba!'
        });
      }

      if (results.length === 0) {
        return res.json({
          success: false,
          message: 'Nincs találat!'
        });
      }

      res.json({
        success: true,
        felhasznaloNev: results[0].felhasznalo_nev,
        letrehozva: results[0].letrehozva
      });
    });
  });
});
router.get('/get-shared-users', (req, res) => {
  const kitoltesId = Number(req.query.kitoltes_id);

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;
  const roleId = Number(req.auth.roleId);
  const intId = req.auth.intId;

  if (!Number.isInteger(kitoltesId) || kitoltesId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás kitöltés ID.'
    });
  }

  const accessQuery = `
    SELECT 1
    FROM kitoltesek k
    JOIN felhasznalok f
      ON f.id = k.felhasznalo_id
    WHERE k.idk = ?
      AND k.modul_id = ?
      AND (
        k.felhasznalo_id = ?
        OR EXISTS (
          SELECT 1
          FROM kitoltesek sajat
          WHERE sajat.idk = k.idk
            AND sajat.modul_id = k.modul_id
            AND sajat.felhasznalo_id = ?
            AND sajat.role IN ('admin', 'sysadmin', 'editor')
          LIMIT 1
        )
        OR (
          ? IN (1, 2)
          AND f.int_id = ?
        )
      )
    LIMIT 1
  `;

  db.query(accessQuery, [kitoltesId, modulId, userId, userId, roleId, intId], (accessErr, accessRows) => {
    if (accessErr) {
      logServerError('get-shared-users jogosultság ellenőrzési hiba:', accessErr);
      return res.status(500).json({
        success: false,
        message: 'Jogosultsági ellenőrzési hiba.'
      });
    }

    if (accessRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    const sql = `
      SELECT f.vez AS nev
      FROM kitoltesek k
      JOIN felhasznalok f
        ON k.felhasznalo_id = f.id
      WHERE k.idk = ?
        AND k.modul_id = ?
        AND k.role = 'editor'
      ORDER BY f.vez ASC
    `;

    db.query(sql, [kitoltesId, modulId], (err, results) => {
      if (err) {
        logServerError('Hiba a megosztások lekérdezésekor:', err);
        return res.status(500).json({
          success: false,
          message: 'Szerver hiba.'
        });
      }

      const users = results.map(row => row.nev);

      res.json({
        success: true,
        users
      });
    });
  });
});
   router.post('/save-szazalek-json', requireActiveLicense('edit_evaluation'), (req, res) => {
  const { kitoltesId, szazalek } = req.body;

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  const cleanKitoltesId = Number(kitoltesId);

  if (!Number.isInteger(cleanKitoltesId) || cleanKitoltesId <= 0 || !szazalek) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás adatok!'
    });
  }

  /*
    Csak akkor menthet százalék JSON-t, ha az adott idk-hoz
    van saját vagy megosztott sora az aktuális usernek.
  */
  const accessQuery = `
    SELECT 1
    FROM kitoltesek
    WHERE idk = ?
      AND modul_id = ?
      AND felhasznalo_id = ?
      AND role IN ('admin', 'sysadmin', 'editor')
    LIMIT 1
  `;

  db.query(accessQuery, [cleanKitoltesId, modulId, userId], (accessErr, accessRows) => {
    if (accessErr) {
      logServerError('save-szazalek-json jogosultság ellenőrzési hiba:', accessErr);
      return res.status(500).json({
        success: false,
        message: 'Jogosultsági ellenőrzési hiba!'
      });
    }

    if (accessRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    const query = `
      UPDATE kitoltesek
      SET szazalek = ?
      WHERE idk = ?
        AND modul_id = ?
    `;

    db.query(query, [JSON.stringify(szazalek), cleanKitoltesId, modulId], (err, result) => {
      if (err) {
        logServerError('Százalék JSON mentési hiba:', err);
        return res.status(500).json({
          success: false,
          message: 'Mentési hiba!'
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nem található menthető értékelés.'
        });
      }

      logger(req, userId, 'százalék JSON mentése', {
        idk: cleanKitoltesId,
        modul_id: modulId
      });

      res.json({ success: true });
    });
  });
});
// Fióktörlés előtti feltételek ellenőrzése
router.get('/delete-account-info', (req, res) => {
  const userId = req.auth.userId;
  const modulId = req.auth.modulId;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      message: 'Érvénytelen felhasználó.'
    });
  }

  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(403).json({
      success: false,
      message: 'Érvénytelen modul.'
    });
  }

  db.query(
    'SELECT int_id, role_id FROM felhasznalok WHERE id = ? LIMIT 1',
    [userId],
    (err, userRows) => {
      if (err) {
        logServerError('delete-account-info user lekérdezési hiba:', err);
        return res.status(500).json({ success: false });
      }

      if (userRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Felhasználó nem található.'
        });
      }

      const intId = userRows[0].int_id;
      const roleId = Number(userRows[0].role_id);

      /*
        Csak a saját, aktuális modulhoz tartozó értékelések megosztásait nézzük.
        Nem globálisan az összes modulban.
      */
      const sharedQuery = `
        SELECT DISTINCT
          f.vez,
          k.kitoltes_neve,
          m.leiras AS modul_leiras,
          CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
        FROM kitoltesek owner
        JOIN kitoltesek k
          ON k.idk = owner.idk
         AND k.modul_id = owner.modul_id
        JOIN felhasznalok f
          ON k.felhasznalo_id = f.id
        LEFT JOIN modulok m
          ON k.modul_id = m.id
        LEFT JOIN vizsgaltak v
          ON k.vizsgalt_id = v.vizsgalt_id
        WHERE owner.felhasznalo_id = ?
          AND owner.modul_id = ?
          AND owner.role IN ('admin', 'sysadmin')
          AND k.felhasznalo_id != ?
      `;

      db.query(sharedQuery, [userId, modulId, userId], (err, sharedRows) => {
        if (err) {
          logServerError('delete-account-info sharedQuery hiba:', err);
          return res.status(500).json({ success: false });
        }

        const roleQuery = `
          SELECT COUNT(DISTINCT f.id) AS db
          FROM felhasznalok f
          JOIN jogosultsagok j ON j.user_id = f.id
          WHERE f.int_id = ?
            AND j.modul_id = ?
            AND j.aktiv = 1
        `;

        db.query(roleQuery, [intId, modulId], (err, rolesRows) => {
          if (err) {
            logServerError('delete-account-info roleQuery hiba:', err);
            return res.status(500).json({ success: false });
          }

          const userCount = Number(rolesRows?.[0]?.db || 0);
          const isOnlyUser = userCount === 1;

          if (isOnlyUser) {
            return res.json({
              success: true,
              isOnlyUser: true,
              roleId,
              soleRolesInModules: [],
              sharedUsers: sharedRows
            });
          }

          /*
            Megnézzük, hogy az aktuális modulban ő-e az egyedüli ilyen role_id-val.
            Ez már nem nézi az összes modult, csak az aktuális session-modult.
          */
          const soleRoleModulesQuery = `
            SELECT m.nev, m.leiras, j.modul_id
            FROM jogosultsagok j
            JOIN modulok m ON j.modul_id = m.id
            WHERE j.user_id = ?
              AND j.modul_id = ?
              AND j.aktiv = 1
              AND NOT EXISTS (
                SELECT 1
                FROM jogosultsagok j2
                JOIN felhasznalok f2 ON j2.user_id = f2.id
                WHERE j2.modul_id = j.modul_id
                  AND j2.aktiv = 1
                  AND f2.int_id = ?
                  AND f2.role_id = ?
                  AND f2.id != ?
              )
          `;

          db.query(
            soleRoleModulesQuery,
            [userId, modulId, intId, roleId, userId],
            (err, soleModules) => {
              if (err) {
                logServerError('delete-account-info soleRoleModulesQuery hiba:', err);
                return res.status(500).json({ success: false });
              }

              res.json({
                success: true,
                isOnlyUser: false,
                roleId,
                soleRolesInModules: soleModules,
                sharedUsers: sharedRows
              });
            }
          );
        });
      });
    }
  );
});

// 2. Végpont: Fiók és adatok fizikai megsemmisítése
// Fiók és minden saját adat fizikai megsemmisítése
router.delete('/delete-my-account', async (req, res) => {
  const userId = req.auth.userId;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      message: 'Érvénytelen felhasználó.'
    });
  }

  const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  };

  try {
    /*
      1. Megkeressük az összes olyan idk-t, ahol a user az eredeti tulajdonos.
      Ez MINDEN modulra vonatkozik.
    */
    const rows = await queryAsync(
      `
      SELECT DISTINCT idk
      FROM kitoltesek
      WHERE felhasznalo_id = ?
        AND role IN ('admin', 'sysadmin')
      `,
      [userId]
    );

    const idkList = rows.map(row => row.idk).filter(Boolean);

    /*
      2. Töröljük a saját tulajdonú értékelések válaszait.
      Nálad a valaszok.kitoltes_id ténylegesen idk-logikával működik.
    */
    if (idkList.length > 0) {
      await queryAsync(
        `
        DELETE FROM valaszok
        WHERE kitoltes_id IN (?)
        `,
        [idkList]
      );

      /*
        3. Töröljük a saját tulajdonú értékelések összes példányát:
        - saját admin sor
        - megosztott editor sorok
      */
      await queryAsync(
        `
        DELETE FROM kitoltesek
        WHERE idk IN (?)
        `,
        [idkList]
      );
    }

    /*
      4. Töröljük azokat a megosztott értékeléssorokat is,
      ahol ő csak editor volt, tehát más osztotta meg vele.
      Ezeknél az eredeti értékelés nem törlődik, csak az ő hozzáférése.
    */
    await queryAsync(
      `
      DELETE FROM kitoltesek
      WHERE felhasznalo_id = ?
        AND role = 'editor'
      `,
      [userId]
    );

    /*
      5. Töröljük az összes moduljogosultságát.
    */
    await queryAsync(
      `
      DELETE FROM jogosultsagok
      WHERE user_id = ?
      `,
      [userId]
    );

    /*
      6. Aktivitáslogot opcionálisan NEM törlünk itt.
      Ha törölni akarod, csak akkor:
      DELETE FROM aktivitas_log WHERE felhasznalo_id = ?
      
      Én ezt most nem teszem bele automatikusan, mert audit-nyom lehet.
    */

    /*
      7. Végül töröljük magát a felhasználót.
    */
    await queryAsync(
      `
      DELETE FROM felhasznalok
      WHERE id = ?
      `,
      [userId]
    );

    if (req.session) {
      req.session.destroy(() => {});
    }

    res.json({
      success: true,
      message: 'A felhasználói fiók és a hozzá tartozó saját értékelési adatok törölve.'
    });
  } catch (err) {
    logServerError('Teljes fióktörlési hiba:', err);
    res.status(500).json({
      success: false,
      message: 'Adatbázis hiba a fiók törlése során.'
    });
  }
});
router.post('/save-ai-text', requireActiveLicense('use_ai'), (req, res) => {
  const { kitoltesId, aiText, type } = req.body;

  const userId = req.auth.userId;
  const modulId = req.auth.modulId;
  const intId = req.auth.intId;
  const roleId = Number(req.auth.roleId);
  const isSysadmin = req.auth.isSysadmin === true;

  const cleanKitoltesId = Number(kitoltesId);

  if (
    !Number.isInteger(cleanKitoltesId) ||
    cleanKitoltesId <= 0 ||
    !aiText ||
    !type
  ) {
    return res.status(400).json({
      success: false,
      message: 'Hiányzó vagy hibás adatok!'
    });
  }

  let targetColumn;

  switch (type) {
    case 'fejlesztesi':
      targetColumn = 'AI';
      break;
    case 'jellemzes':
      targetColumn = 'ai_jellemzes';
      break;
    case 'ertekeles':
      targetColumn = 'ai_ertekeles';
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Érvénytelen AI típus!'
      });
  }

  /*
    AI szöveg mentésekor nem elég azt nézni, hogy a bejelentkezett usernek
    van-e saját/editor sora az adott idk alatt.

    Elemző/feltöltő szerepkörben jogos lehet ugyanazon intézmény és aktuális modul
    más felhasználójának értékelését megnyitni, elemezni és AI szöveget menteni.
    Ezért az olvasási logikához igazítva három út engedett:

    1. Saját vagy megosztott editor értékelés
    2. Role 1 / role 2 + azonos intézmény + azonos modul
    3. Sysadmin
  */
  const checkAccessQuery = `
    SELECT
      eredeti.id,
      eredeti.idk,
      eredeti.ai_kit_max,
      tulaj.int_id AS tulaj_int_id,
      EXISTS (
        SELECT 1
        FROM kitoltesek sajat
        WHERE sajat.idk = eredeti.idk
          AND sajat.modul_id = eredeti.modul_id
          AND sajat.felhasznalo_id = ?
          AND sajat.role IN ('admin', 'sysadmin', 'editor')
        LIMIT 1
      ) AS has_direct_access
    FROM kitoltesek eredeti
    JOIN felhasznalok tulaj
      ON tulaj.id = eredeti.felhasznalo_id
    WHERE eredeti.idk = ?
      AND eredeti.modul_id = ?
      AND eredeti.role IN ('admin', 'sysadmin')
    LIMIT 1
  `;

  db.query(checkAccessQuery, [userId, cleanKitoltesId, modulId], (accessErr, accessRows) => {
    if (accessErr) {
      logServerError('AI jogosultság ellenőrzési hiba:', accessErr);
      return res.status(500).json({
        success: false,
        message: 'Jogosultsági ellenőrzési hiba!'
      });
    }

    if (accessRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    const access = accessRows[0];

    const hasDirectAccess = Number(access.has_direct_access) === 1;
    const sameInstitution = Number(access.tulaj_int_id) === Number(intId);
    const canInstitutionAnalyze = (roleId === 1 || roleId === 2) && sameInstitution;
    const allowed = hasDirectAccess || canInstitutionAnalyze || isSysadmin;

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez az értékeléshez.'
      });
    }

    const remainingKitQuota = Number(access.ai_kit_max);
    if (Number.isFinite(remainingKitQuota) && remainingKitQuota <= 0) {
      return res.status(403).json({
        success: false,
        message: 'Ehhez az értékeléshez nincs elérhető AI keret.'
      });
    }

    const queryKitoltes = `
      UPDATE kitoltesek
      SET ${targetColumn} = ?,
          ai_kit_max = GREATEST(ai_kit_max - 1, 0)
      WHERE idk = ?
        AND modul_id = ?
    `;

    db.query(queryKitoltes, [aiText, cleanKitoltesId, modulId], (err, updateResult) => {
      if (err) {
        logServerError('AI szöveg mentési hiba:', err);
        return res.status(500).json({
          success: false,
          message: 'Mentési hiba!'
        });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nem található menthető értékelés.'
        });
      }

      const queryFelhasznalo = `
        UPDATE felhasznalok
        SET ai_ossz_max = GREATEST(ai_ossz_max - 1, 0)
        WHERE id = ?
      `;

      db.query(queryFelhasznalo, [userId], (errUser) => {
        if (errUser) {
          logServerError('Globális kvóta frissítési hiba:', errUser);
          return res.status(500).json({
            success: false,
            message: 'Szöveg elmentve, de kvóta levonása sikertelen.'
          });
        }

        logger(req, userId, 'AI szöveg mentése', {
          idk: cleanKitoltesId,
          type,
          modul_id: modulId,
          has_direct_access: hasDirectAccess,
          same_institution_access: canInstitutionAnalyze,
          sysadmin_access: isSysadmin
        });

        res.json({ success: true });
      });
    });
  });
});

router.post('/decrease-global-quota', requireActiveLicense('use_ai'), (req, res) => {
  const userId = req.auth.userId;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      message: 'Érvénytelen felhasználó.'
    });
  }

  const query = `
    UPDATE felhasznalok
    SET ai_ossz_max = GREATEST(ai_ossz_max - 1, 0)
    WHERE id = ?
  `;

  db.query(query, [userId], (err, result) => {
    if (err) {
      logServerError('Globális kvóta levonási hiba:', err);
      return res.status(500).json({
        success: false,
        message: 'Globális kvóta levonási hiba.'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Felhasználó nem található.'
      });
    }

    logger(req, userId, 'AI globális kvóta csökkentése', {
      kvota_modosult: true
    });

    res.json({ success: true });
  });
});

router.post('/submit-survey', (req, res) => {
    const userId = req.session.userId; 
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Nincs bejelentkezve!' });
    }

    // 1. LÉPÉS: ELLENŐRIZZÜK A FLAG-ET A FELHASZNÁLÓ TÁBLÁBAN
    const checkSQL = 'SELECT kerdoiv_kitoltve, int_id FROM felhasznalok WHERE id = ? LIMIT 1';
    
    db.query(checkSQL, [userId], (errCheck, rowsCheck) => {
        if (errCheck || rowsCheck.length === 0) {
            logServerError('Hiba a jogosultság ellenőrzésekor:', errCheck);
            return res.status(500).json({ success: false, message: 'Adatbázis hiba.' });
        }

        // Ha a flag 1, akkor már kitöltötte
        if (rowsCheck[0].kerdoiv_kitoltve) {
            return res.json({ 
                success: false, 
                message: 'Ezt a kérdőívet már kitöltötte, köszönjük!' 
            });
        }

       const intId = rowsCheck[0].int_id;
        // Bővítettük az új mezőkkel a bejövő adatok listáját
        const { hasznossag, szakmai, jovobeni, funkciok, hiba, hianyolt, tetszett, ar, sajat_feltoltes, magan_hasznalat, magan_anyag, magan_ar } = req.body;
        const parseNum = (val) => (val && val.toString().trim() !== "") ? parseInt(val, 10) : null;

        // 2. LÉPÉS: VAK MENTÉS A PIACKUTATÁS TÁBLÁBA (Új oszlopokkal)
        const insertSQL = `
            INSERT INTO piackutatas 
            (hasznossag, szakmai, jovobeni, funkciok, hiba, hianyolt, tetszett, ar_kategoria, sajat_feltoltes, magan_hasznalat, magan_anyag, magan_ar) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const insertVals = [
            parseNum(hasznossag), parseNum(szakmai), 
            parseNum(jovobeni), funkciok || null, hiba || null, 
            hianyolt || null, tetszett || null, ar || null,
            sajat_feltoltes || null, magan_hasznalat || null, magan_anyag || null, magan_ar || null
        ];

        db.query(insertSQL, insertVals, (errInsert) => {
            if (errInsert) {
                logServerError('❌ Hiba a kérdőív mentésekor:', errInsert);
                return res.status(500).json({ success: false, message: 'Adatbázis hiba a mentésnél.' });
            }

            // 3. LÉPÉS: USER FLAG BEÁLLÍTÁSA (TÖBBÉ NEM TÖLTHETI KI)
            const updateUserSQL = `UPDATE felhasznalok SET kerdoiv_kitoltve = 1 WHERE id = ?`;
            db.query(updateUserSQL, [userId], (errUserUpd) => {
                if (errUserUpd) logServerError('Hiba a user flag mentésekor:', errUserUpd);

                // 4. LÉPÉS: INTÉZMÉNY JUTALMAZÁSA (+15 nap és teszt_ext státusz)
                const updateIntSQL = `UPDATE intezmeny SET fizetve = NOW(), intfin = 15, idoszak = 'teszt_ext' WHERE id = ?`;
                db.query(updateIntSQL, [intId], (errUpdate) => {
                    if (errUpdate) {
                        logServerError('❌ Hiba a jutalom jóváírásakor:', errUpdate);
                        return res.status(500).json({ success: false, message: 'Hiba a jutalom jóváírásakor.' });
                    }
                    
                    res.json({ success: true, message: 'Kérdőív elmentve, jutalom jóváírva!' });
                });
            });
        });
    });
});
    return router;
};
