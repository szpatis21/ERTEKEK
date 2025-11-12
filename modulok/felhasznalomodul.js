const express = require('express');
const router = express.Router();

module.exports = (db) => {

// új kitöltés
router.post('/add-kitoltes', (req, res) => {
  const { felhasznalo_id, letrehozva, kitoltes_neve, vizsgalt_nev, modul_id, audit } = req.body;

  if (
    felhasznalo_id == null ||
    letrehozva == null ||
    kitoltes_neve == null ||
    vizsgalt_nev == null ||
    modul_id == null
  ) {
    return res.status(400).json({ success: false, message: 'Hiányzó adat!' });
  }

  const selectVizsgalt = `
    SELECT vizsgalt_id
      FROM vizsgaltak
     WHERE CAST(AES_DECRYPT(nev_enc, @aes_key) AS CHAR(255)) = ?
  `;
  db.query(selectVizsgalt, [vizsgalt_nev], (selErr, rows) => {
    if (selErr) {
      console.error('Adatbázis hiba (SELECT vizsgaltak):', selErr);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
    }

    const insertOrUseVizsgalt = () => {
      const insertSql = `
        INSERT INTO kitoltesek
          (felhasznalo_id, letrehozva, kitoltes_neve, role, modul_id, vizsgalt_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.query(
        insertSql,
        [felhasznalo_id, letrehozva, kitoltes_neve, 'admin', modul_id, vizsgaltId],
        (insErr, result) => {
          if (insErr) {
            console.error('Adatbázis hiba (INSERT kitoltesek):', insErr);
            return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
          }

          const newId = result.insertId;
          db.query(
            'UPDATE kitoltesek SET idk = ? WHERE id = ?',
            [newId, newId],
            updateErr => {
              if (updateErr) {
                console.error('Adatbázis hiba (idk frissítés):', updateErr);
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
                      console.error('Audit adatbázis hiba:', auditErr);
                      return res.status(500).json({ success: false, message: 'Audit hiba történt!' });
                    }

                    res.json({ success: true, message: 'Sikeres mentés!', id: newId });
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
        INSERT INTO vizsgaltak (nev_enc, hozzajarulas_datuma)
        VALUES (AES_ENCRYPT(?, @aes_key), NOW())
      `;
      db.query(insertVizsgalt, [vizsgalt_nev], (insErr, insRes) => {
        if (insErr) {
          console.error('Adatbázis hiba (INSERT vizsgaltak):', insErr);
          return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
        }
        vizsgaltId = insRes.insertId;
        insertOrUseVizsgalt();
      });
    }
  });
});

  //kitöltés nevének frissítése
  router.post('/update-kitoltes', (req, res) => {
  const { id, letrehozva, kitoltes_neve, vizsgalt_nev } = req.body;
  if (!id || !letrehozva || !kitoltes_neve || !vizsgalt_nev) {
    return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });
  }

  // 1) Lekérdezzük idk és vizsgalt_id értékét
  const selectQ = 'SELECT idk, vizsgalt_id FROM kitoltesek WHERE id = ?';
  db.query(selectQ, [id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
    }
    const { idk, vizsgalt_id } = rows[0];

    // 2) Frissítjük a kitoltesek táblát
    const updKit = `
      UPDATE kitoltesek
      SET kitoltes_neve = ?, letrehozva = ?
      WHERE idk = ?`;
    db.query(updKit, [kitoltes_neve, letrehozva, idk], updateErr => {
      if (updateErr) {
        return res.status(500).json({ success: false, message: 'Frissítési hiba a kitoltesek táblában!' });
      }

      // 3) Frissítjük a vizsgaltak táblát is, újra AES_ENCRYPT-tel
      const updVizs = `
        UPDATE vizsgaltak
        SET nev_enc = AES_ENCRYPT(?, @aes_key)
        WHERE vizsgalt_id = ?`;
      db.query(updVizs, [vizsgalt_nev, vizsgalt_id], vizErr => {
        if (vizErr) {
          console.error('Adatbázis hiba (UPDATE vizsgaltak):', vizErr);
          return res.status(500).json({ success: false, message: 'Frissítési hiba a vizsgaltak táblában!' });
        }
        // 4) Végső válasz
        res.json({ success: true, message: 'Sikeres frissítés! Kitöltés és alanynév is frissítve.' });
      });
    });
  });
});
//Adminisztratív ellenörzés
// felhasznalomodul.js

router.get('/check-missing-audit-with-names', (req, res) => {
  const userId = req.query.user_id;
  const modulId = req.query.modul_id;

  if (!userId || !modulId) {
    return res.status(400).json({ success: false, message: 'Hiányzó user_id vagy modul_id' });
  }

  const sql = `
    SELECT DISTINCT
      k.vizsgalt_id,
      CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
    FROM kitoltesek k
    LEFT JOIN vizsgalt_hozzajarulas_naplo n
      ON k.vizsgalt_id = n.vizsgalt_id
    LEFT JOIN vizsgaltak v
      ON k.vizsgalt_id = v.vizsgalt_id
    WHERE k.felhasznalo_id = ?
      AND k.modul_id = ?
      AND k.role = 'admin'
      AND n.vizsgalt_id IS NULL
  `;

  db.query(sql, [userId, modulId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt' });
    }
    res.json({ success: true, kitoltesek: rows });
  });
});

router.post('/audit-confirm', (req, res) => {
  const { user_id, vizsgalt_ids } = req.body;
  if (!user_id || !Array.isArray(vizsgalt_ids) || vizsgalt_ids.length === 0) {
    return res.status(400).json({ success:false, message:'Hiányzó user_id vagy vizsgalt_ids' });
  }

  const ipCim     = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const verzioTag = 'manual-confirm';

  // Generáljuk a "(?, ?, NOW(), ?, ?, ?)" darabokat annyiszor, ahány ID van
  const placeholders = vizsgalt_ids.map(_ => '(?, ?, NOW(), ?, ?, ?)').join(', ');
  // Majd lapítsuk az értékeket: [id1, user_id, ipCim, userAgent, verzioTag, id2, user_id, ...]
  const params = [];
  vizsgalt_ids.forEach(vId => {
    params.push(vId, user_id, ipCim, userAgent, verzioTag);
  });

  const sql = `
    INSERT INTO vizsgalt_hozzajarulas_naplo
      (vizsgalt_id, user_id, beleegyezes_datuma, ip_cim, user_agent, verzio_tag)
    VALUES ${placeholders}
  `;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Audit-confirm hiba:', err);
      return res.status(500).json({ success:false, message:'Audit mentési hiba' });
    }
    res.json({ success:true, inserted: result.affectedRows });
  });
});
// --- EREDETI ADMIN LEKÉRDEZÉSE -------------------------------------
router.get('/original-admin', (req, res) => {
  const { kitoltesId } = req.query;
  if (!kitoltesId) {
    return res.status(400).json({ success:false, message:'Hiányzó kitoltesId!' });
  }

  const sql = `
    SELECT f.vez AS owner_name
      FROM kitoltesek k
      JOIN felhasznalok f ON k.felhasznalo_id = f.id
     WHERE k.idk  = ?
       AND k.role = 'admin'
     LIMIT 1
  `;

  db.query(sql, [kitoltesId], (err, rows) => {
    if (err) {
      console.error('original-admin lekérdezés hiba:', err);
      return res.status(500).json({ success:false, message:'Adatbázis hiba!' });
    }
    if (!rows.length) {
      return res.json({ success:false, message:'Nincs admin-sor' });
    }
    res.json({ success:true, owner_name: rows[0].owner_name || 'Ismeretlen' });
  });
});



    //Kitöltés törlése
    router.delete('/delete-kitoltes', (req, res) => {
        const { id } = req.body; // ID kiolvasása a kérésből
    
        if (!id) {
            return res.status(400).json({ success: false, message: 'Hiányzó kitoltes_id!' });
        }
    
    
        // 🔹 Először lekérdezzük az `idk` értéket az adott `id` alapján
        const getIdkQuery = 'SELECT idk FROM kitoltesek WHERE id = ?';
    
        db.query(getIdkQuery, [id], (err, results) => {
            if (err) {
                console.error('Adatbázis hiba az idk lekérdezése során:', err);
                return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
            }
    
            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'Kitöltés nem található!' });
            }
    
            const idk = results[0].idk; // Az `idk` értéke
    
            // 🔹 Először töröljük a `valaszok` táblából minden kapcsolódó rekordot
            const deleteValaszokQuery = 'DELETE FROM valaszok WHERE kitoltes_id IN (SELECT id FROM kitoltesek WHERE idk = ?)';
            
            db.query(deleteValaszokQuery, [idk], (err) => {
                if (err) {
                    console.error('Adatbázis hiba a válaszok törlése során:', err);
                    return res.status(500).json({ success: false, message: 'Adatbázis hiba történt a válaszok törlése során!' });
                }
    
                // 🔹 Ezután töröljük az összes `kitoltesek` rekordot, ahol az `idk` megegyezik
                const deleteKitoltesQuery = 'DELETE FROM kitoltesek WHERE idk = ?';
    
                db.query(deleteKitoltesQuery, [idk], (err, results) => {
                    if (err) {
                        console.error('Adatbázis hiba a kitoltesek törlése során:', err);
                        return res.status(500).json({ success: false, message: 'Adatbázis hiba történt a kitöltés törlése során!' });
                    }
    
                    if (results.affectedRows === 0) {
                        return res.status(404).json({ success: false, message: 'Nincs törölhető rekord!' });
                    }
    
                    res.json({ success: true, message: 'Sikeres törlés! Minden megosztott példány eltávolítva.' });
                });
            });
        });
    });
    // Kitoltes_neve lekérése ID alapján
// Lekéri a kitöltéseket a dekódolt alanynévvel együtt
router.get('/get-kitoltesek', (req, res) => {
  const felhasznaloId = req.query.felhasznalo_id;
  const modulId       = req.query.modul_id;
  const intezmenyId   = req.query.intezmeny_id;

  if (!felhasznaloId && !intezmenyId) {
    return res.status(400).json({ success: false, message: 'Hiányzó felhasznalo_id vagy intezmeny_id!' });
  }

  const sql = `
    SELECT
      k.id,
      k.idk,
      k.kitoltes_neve,
      k.role,
      k.vizsgalt_id,
      f.vez                                   AS creator_name,
      CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
    FROM kitoltesek k
    JOIN felhasznalok f ON k.felhasznalo_id = f.id
    LEFT JOIN vizsgaltak v ON k.vizsgalt_id   = v.vizsgalt_id
    WHERE 1=1
      ${felhasznaloId   ? 'AND k.felhasznalo_id = ?'  : ''}
      ${modulId         ? 'AND k.modul_id       = ?'  : ''}
      ${intezmenyId     ? 'AND f.int_id         = ?'  : ''}
  `;

  const args = [];
  if (felhasznaloId) args.push(felhasznaloId);
  if (modulId)       args.push(modulId);
  if (intezmenyId)   args.push(intezmenyId);

  db.query(sql, args, (err, rows) => {
    if (err) {
      console.error('Adatbázis hiba:', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
    }
    return res.json({ success: true, kitoltesek: rows });
  });
});


  // Lekéri egy adott kitöltés címét és a dekódolt alany nevét
router.get('/get-kitoltes-neve', (req, res) => {
  const kitoltesIdk = req.query.idk;

  if (!kitoltesIdk) {
    return res.status(400).json({ success: false, message: 'Hiányzó kitoltes_idk!' });
  }

  const sql = `
    SELECT
      k.kitoltes_neve,
      CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
    FROM kitoltesek k
    LEFT JOIN vizsgaltak v ON k.vizsgalt_id = v.vizsgalt_id
    WHERE k.idk = ?
  `;

  db.query(sql, [kitoltesIdk], (err, results) => {
    if (err) {
      console.error('Adatbázis hiba:', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Kitöltés nem található az adott IDK alapján!' });
    }

    return res.json({
      success: true,
      kitoltes_neve: results[0].kitoltes_neve,
      vizsgalt_nev:  results[0].vizsgalt_nev
    });
  });
});

    // Kitöltés mentése / válaszok upsert + százalék-JSON update
    router.post('/save-valaszok', (req, res) => {
    const {
        kitoltesId, kerdesValaszok, szovegesValaszok,
        userId, ido, szazalek        // ⬅️ új mező
    } = req.body;

    if (!kitoltesId || !userId
        || typeof kerdesValaszok   !== 'object'
        || typeof szovegesValaszok !== 'object') {
        return res.status(400).json({ success:false, message:'Hiányzó vagy hibás adatok!' });
    }

    /* -------- 1. válaszok upsert -------- */
    const insertQ = `
        INSERT INTO valaszok
        (kitoltes_id, kerdes_id, kerdes_valasz, valasz_szoveg, felhasznalo_id, letrehozva)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        kerdes_valasz = VALUES(kerdes_valasz),
        valasz_szoveg = VALUES(valasz_szoveg),
        letrehozva     = VALUES(letrehozva),
        felhasznalo_id = VALUES(felhasznalo_id);
    `;

    const promises = Object.keys({ ...kerdesValaszok, ...szovegesValaszok })
        .map(kerdesId => new Promise((resolve, reject) => {
        const v  = kerdesValaszok[kerdesId]  ?? null;
        const sz = szovegesValaszok[kerdesId] ?? null;

        db.query(insertQ,
                [kitoltesId, kerdesId, v, sz, userId, ido],
                (err, r) => err ? reject(err) : resolve(r));
        }));

    /* -------- 2. ha kész az összes válasz, frissítjük a JSON-t -------- */
    Promise.all(promises)
        .then(() => {
        if (!szazalek) {                     // ha nincs JSON, nincs update
            return res.json({ success:true, message:'Válaszok mentve!' });
        }

        const updQ = 'UPDATE kitoltesek SET szazalek = ? WHERE idk = ?';
        db.query(updQ, [JSON.stringify(szazalek), kitoltesId], (err) => {
            if (err) {
            console.error('JSON update hiba:', err);
            return res.status(500).json({ success:false, message:'JSON mentési hiba!' });
            }
            res.json({ success:true, message:'Válaszok + JSON mentve!' });
        });
        })
        .catch(err => {
        console.error('Adatbázis hiba:', err);
        res.status(500).json({ success:false, message:'Adatbázis hiba történt!' });
        });
    });
    //Százalék betöltése
    router.get('/get-kitoltes-szazalek', (req, res) => {
    const id = req.query.kitoltes_id;
    db.query('SELECT szazalek FROM kitoltesek WHERE idk = ?', [id],
        (err, rows) => {
        if (err)  return res.status(500).json({ success:false });
        if (!rows.length) return res.status(404).json({ success:false });
        res.json({ success:true, szazalek: rows[0].szazalek });
        });
    });
    //Válaszok betöltése
    router.get('/get-valaszok', (req, res) => {
    const kitoltesId = req.query.kitoltes_id;

    if (!kitoltesId) {
        return res.status(400).json({ success: false, message: 'Hiányzó kitoltes_id!' });
    }

    // 🔹 SQL lekérdezés frissítése: Most már lekérdezi a `valasz_szoveg` mezőt is
    const query = `SELECT kerdes_id, kerdes_valasz, valasz_szoveg FROM valaszok WHERE kitoltes_id = ?`;

    db.query(query, [kitoltesId], (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
        }

        res.json({ success: true, valaszok: results });
    });
    });
    router.get('/get-legfrissebb-valasz', (req, res) => {
        const { kitoltesId } = req.query;
    
        if (!kitoltesId) {
            return res.status(400).json({ success: false, message: 'Hiányzó kitoltesId!' });
        }
    
        const query = `
            SELECT f.vez AS felhasznalo_nev, 
                   v.letrehozva
            FROM valaszok v
            JOIN felhasznalok f ON v.felhasznalo_id = f.id
            WHERE v.kitoltes_id = ?
            ORDER BY v.letrehozva DESC
            LIMIT 1;
        `;
    
        db.query(query, [kitoltesId], (err, results) => {
            if (err) {
                console.error('Adatbázis hiba:', err);
                return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
            }
    
            if (results.length === 0) {
                return res.json({ success: false, message: 'Nincs találat!' });
            }
    
            res.json({ 
                success: true, 
                felhasznaloNev: results[0].felhasznalo_nev, 
                letrehozva: results[0].letrehozva 
            });
        });
    });
    router.post('/save-szazalek-json', (req, res) => {
    const { kitoltesId, szazalek } = req.body;

    if (!kitoltesId || !szazalek) {
        return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });
    }

    const query = 'UPDATE kitoltesek SET szazalek = ? WHERE idk = ?';
    db.query(query, [JSON.stringify(szazalek), kitoltesId], (err) => {
        if (err) {
            console.error('Százalék JSON mentési hiba:', err);
            return res.status(500).json({ success: false, message: 'Mentési hiba!' });
        }

        res.json({ success: true });
    });
    });

    return router;
};
