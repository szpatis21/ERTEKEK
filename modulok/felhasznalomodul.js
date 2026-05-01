const express = require('express');
const router = express.Router();

module.exports = (db) => {
const logger = require('./logmodul')(db);

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
    (felhasznalo_id, letrehozva, kitoltes_neve, role, modul_id, vizsgalt_id, ai_kit_max)
  VALUES (?, ?, ?, ?, ?, ?, 10)
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
                    logger(req, felhasznalo_id, 'új értékelés', { kitoltes_id: newId, nev: kitoltes_neve });
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
                    const userId = req.session ? req.session.userId : null;
                    logger(req, userId, 'törlés', { torolt_idk: idk });
                    res.json({ success: true, message: 'Sikeres törlés! Minden megosztott példány eltávolítva.' });
                });
            });
        });
    });
// modulok/felhasznalomodul.js

// Kitöltés duplikálása
router.post('/duplicate-kitoltes', (req, res) => {
    // 1. MÓDOSÍTÁS: Fogadjuk az "ujVizsgaltNev" paramétert is!
    const { originalIdk, ujNev, ujVizsgaltNev, userId } = req.body;

    if (!originalIdk || !ujNev || !userId) {
        return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });
    }

    // 1. Eredeti kitöltés adatainak lekérése (modul_id, szazalek, stb. miatt kell)
    const selectOriginal = `
        SELECT k.*, 
               CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS original_vizsgalt_nev
        FROM kitoltesek k
        LEFT JOIN vizsgaltak v ON k.vizsgalt_id = v.vizsgalt_id
        WHERE k.idk = ? 
        LIMIT 1
    `;

    db.query(selectOriginal, [originalIdk], (err, rows) => {
        if (err) {
            console.error('Hiba az eredeti kitöltés lekérésekor:', err);
            return res.status(500).json({ success: false, message: 'Adatbázis hiba (Select)' });
        }
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Az eredeti kitöltés nem található!' });
        }

        const original = rows[0];
        
        // 2. MÓDOSÍTÁS: A név kiválasztása
        // Ha kaptunk új nevet (ujVizsgaltNev), azt használjuk. 
        // Ha nem, akkor maradunk a réginél (original.original_vizsgalt_nev).
        const subjectName = ujVizsgaltNev || original.original_vizsgalt_nev || 'Névtelen alany';
        
        // 3. Létrehozunk egy ÚJ alanyt a választott névvel
        const insertNewSubject = `
            INSERT INTO vizsgaltak (nev_enc, hozzajarulas_datuma)
            VALUES (AES_ENCRYPT(?, @aes_key), NOW())
        `;

        db.query(insertNewSubject, [subjectName], (subjErr, subjResult) => {
            if (subjErr) {
                console.error('Hiba az új alany létrehozásakor:', subjErr);
                return res.status(500).json({ success: false, message: 'Adatbázis hiba (Insert Subject)' });
            }

            const newVizsgaltId = subjResult.insertId; 
            const maiDatum = new Date().toISOString().split('T')[0];

            // 4. Új kitöltés beszúrása az ÚJ vizsgalt_id-val és ÚJ kitoltes_neve-vel
        const insertKitoltes = `
    INSERT INTO kitoltesek 
    (felhasznalo_id, letrehozva, kitoltes_neve, role, modul_id, vizsgalt_id, szazalek, ai_kit_max)
    VALUES (?, ?, ?, ?, ?, ?, ?, 10)
`;

            db.query(insertKitoltes, [
                userId,
                maiDatum,
                ujNev, // Ez az "Időszak-Típus" amit a frontend küldött
                'admin',
                original.modul_id,
                newVizsgaltId,    
                original.szazalek
            ], (insErr, result) => {
                if (insErr) {
                    console.error('Hiba az új kitöltés beszúrásakor:', insErr);
                    return res.status(500).json({ success: false, message: 'Adatbázis hiba (Insert Kitoltes)' });
                }

                const newId = result.insertId;

                // 5. IDK frissítése
                const updateIdk = `UPDATE kitoltesek SET idk = ? WHERE id = ?`;
                
                db.query(updateIdk, [newId, newId], (updErr) => {
                    if (updErr) {
                        console.error('Hiba az IDK frissítésekor:', updErr);
                        return res.status(500).json({ success: false, message: 'Adatbázis hiba (Update IDK)' });
                    }

                    // 6. Válaszok másolása
                    const duplicateAnswers = `
                        INSERT INTO valaszok 
                        (kitoltes_id, kerdes_id, kerdes_valasz, valasz_szoveg, felhasznalo_id, letrehozva)
                        SELECT ?, kerdes_id, kerdes_valasz, valasz_szoveg, ?, NOW()
                        FROM valaszok
                        WHERE kitoltes_id = ?
                    `;

                    db.query(duplicateAnswers, [newId, userId, originalIdk], (copyErr, copyRes) => {
                        if (copyErr) {
                            console.error('Hiba a válaszok másolásakor:', copyErr);
                            return res.status(500).json({ success: false, message: 'Hiba a válaszok másolásakor!' });
                        }
logger(req, userId, 'másolás', { eredeti_idk: originalIdk, uj_id: newId });
                        res.json({ 
                            success: true, 
                            message: 'Sikeres duplikálás!', 
                            newId: newId,
                            copiedAnswers: copyRes.affectedRows 
                        });
                    });
                });
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

  // A JAVÍTOTT SQL LEKÉRDEZÉS
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
      a.warm, 
      a.hatarido,
      f.vez AS creator_name,
      f.mail AS creator_mail,  
      CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
    FROM kitoltesek k
    JOIN felhasznalok f ON k.felhasznalo_id = f.id
    LEFT JOIN vizsgaltak v ON k.vizsgalt_id   = v.vizsgalt_id
    LEFT JOIN audit a ON a.audit_id = k.id -- <-- ÖSSZEKAPCSOLJUK AZ AUDIT TÁBLÁVAL (Ha nálad idk-ra mutat, írd át k.idk-ra!)
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
// felhasznalomodul.js - Optimalizált /save-valaszok

router.post('/save-valaszok', (req, res) => {
    const {
        kitoltesId, kerdesValaszok, szovegesValaszok,
        userId, ido, szazalek
    } = req.body;

    // 1. BIZTONSÁGI HÁLÓ: Ha nem jött objektum (pl. autosave miatt), csinálunk egy üreset.
    const safeKerdesValaszok = (typeof kerdesValaszok === 'object' && kerdesValaszok !== null) ? kerdesValaszok : {};
    const safeSzovegesValaszok = (typeof szovegesValaszok === 'object' && szovegesValaszok !== null) ? szovegesValaszok : {};

    // 2. SZIGORÚ ELLENŐRZÉS CSAK A LÉTFONTOSSÁGÚ ADATOKRA (Eltávolítottuk az object ellenőrzést)
    if (!kitoltesId || !userId) {
        return res.status(400).json({ success: false, message: 'Hiányzó kitoltesId vagy userId!' });
    }

    // 3. Adatok előkészítése egyetlen tömbbe (mátrixba) a Bulk Inserthez
    // A "safe" (biztosan létező) objektumokat használjuk!
    const allKeys = new Set([...Object.keys(safeKerdesValaszok), ...Object.keys(safeSzovegesValaszok)]);
    const valuesToInsert = [];

    allKeys.forEach(kerdesId => {
        const valasz = safeKerdesValaszok[kerdesId] ?? null;
        const szoveg = safeSzovegesValaszok[kerdesId] ?? null;
        
        // A sorrendnek meg kell egyeznie az SQL VALUES résszel
        valuesToInsert.push([kitoltesId, kerdesId, valasz, szoveg, userId, ido]);
    });

    // Segédfüggvény a JSON mentéshez
  // Segédfüggvény a JSON mentéshez
    const saveJsonAndResponse = () => {
        
        // --- LOGOLÁS BEILLESZTÉSE IDE ---
        // Mivel a safeKerdesValaszok és safeSzovegesValaszok már csak a MÓDOSÍTOTT adatokat tartalmazzák,
        // így pontosan az kerül a logba, amit a rendszer újonnan hozzáadott.
        const r_kerdesek = Object.keys(safeKerdesValaszok).length > 0 ? safeKerdesValaszok : null;
        const r_szovegek = Object.keys(safeSzovegesValaszok).length > 0 ? safeSzovegesValaszok : null;

        if (r_kerdesek || r_szovegek) {
            logger(req, userId, 'értékelés módosítása', { 
                kitoltes_id: kitoltesId, 
                modositott_kerdesek: r_kerdesek, 
                modositott_szovegek: r_szovegek 
            });
        }
        // ---------------------------------

        if (!szazalek) {
            return res.json({ success: true, message: 'Válaszok mentve!' });
        }
        const updQ = 'UPDATE kitoltesek SET szazalek = ? WHERE idk = ?';
        db.query(updQ, [JSON.stringify(szazalek), kitoltesId], (err) => {
            if (err) {
                console.error('JSON update hiba:', err);
                return res.status(500).json({ success: false, message: 'JSON mentési hiba!' });
            }
            res.json({ success: true, message: 'Válaszok + JSON mentve!' });
        });
    };

    // Ha nincsenek válaszok (csak pl. JSON frissül), egyből mehet a json mentésre
    if (valuesToInsert.length === 0) {
        return saveJsonAndResponse();
    }

    // 4. Egyetlen SQL lekérdezés az összes válaszhoz (Bulk Insert)
// 4. Egyetlen SQL lekérdezés az összes válaszhoz (Bulk Insert)
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

    db.query(bulkInsertQuery, [valuesToInsert], (err, result) => {
        if (err) {
            console.error('Adatbázis hiba (Bulk Insert):', err);
            return res.status(500).json({ success: false, message: 'Adatbázis hiba történt a válaszok mentésekor!' });
        }
        // Sikeres mentés után jöhet a JSON update
        saveJsonAndResponse();
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
router.get('/get-shared-users', async (req, res) => {
    const kitoltesId = req.query.kitoltes_id;
    
    if (!kitoltesId) {
        return res.json({ success: false, message: 'Hiányzó kitöltés ID' });
    }

    try {
        // MÓDOSÍTÁS: f.vez-t kérjük le f.nev helyett, és átnevezzük nev-re a kimenetben
        const sql = `
            SELECT f.vez AS nev 
            FROM kitoltesek k 
            JOIN felhasznalok f ON k.felhasznalo_id = f.id 
            WHERE k.idk = ? AND k.role = 'editor'
        `;
        
        db.query(sql, [kitoltesId], (err, results) => {
            if (err) throw err;
            
            // Így most már biztosan a helyes adatot olvassa ki, nem lesz null
            const users = results.map(row => row.nev);
            res.json({ success: true, users: users });
        });
    } catch (error) {
        console.error('Hiba a megosztások lekérdezésekor:', error);
        res.status(500).json({ success: false, message: 'Szerver hiba' });
    }
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
    // 1. Végpont: Törlési feltételek ellenőrzése
// 1. Végpont: Törlési feltételek ellenőrzése (MODUL SZINTŰ ELLENŐRZÉSSEL)
router.get('/delete-account-info', (req, res) => {
    const userId = req.session?.userId || req.query.user_id;
    if (!userId) return res.status(400).json({ success: false, message: 'Nincs bejelentkezve!' });

    db.query('SELECT int_id, role_id FROM felhasznalok WHERE id = ?', [userId], (err, userRows) => {
        if (err || userRows.length === 0) return res.status(500).json({ success: false });
        
        const intId = userRows[0].int_id;
        const roleId = Number(userRows[0].role_id); // Admin: 1, Elemző: 2

        // Megosztott kitöltések lekérése MODUL leírással ÉS a Vizsgált Személy nevével!
        const sharedQuery = `
            SELECT DISTINCT f.vez, k.kitoltes_neve, m.leiras AS modul_leiras,
                   CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
            FROM kitoltesek k
            JOIN felhasznalok f ON k.felhasznalo_id = f.id
            LEFT JOIN modulok m ON k.modul_id = m.id
            LEFT JOIN vizsgaltak v ON k.vizsgalt_id = v.vizsgalt_id
            WHERE k.idk IN (SELECT idk FROM kitoltesek WHERE felhasznalo_id = ? AND role = 'admin')
              AND k.felhasznalo_id != ?
        `;

        db.query(sharedQuery, [userId, userId], (err, sharedRows) => {
            if (err) return res.status(500).json({ success: false });

            // Intézményi munkatársak felmérése (Hányan vannak a cégben?)
            const roleQuery = `SELECT id FROM felhasznalok WHERE int_id = ?`;
            db.query(roleQuery, [intId], (err, rolesRows) => {
                if (err) return res.status(500).json({ success: false });

                const isOnlyUser = rolesRows.length === 1; // "One-man show" vizsgálat

                // Ha ő az egyedüli felhasználó, nincs értelme a modulokat vizsgálni
                if (isOnlyUser) {
                    return res.json({
                        success: true,
                        isOnlyUser: true,
                        roleId: roleId,
                        soleRolesInModules: [],
                        sharedUsers: sharedRows
                    });
                }

                // Megnézzük, hogy mely modulokban ő az EGYEDÜLI ember ezzel a szerepkörrel (admin/elemző)
                const soleRoleModulesQuery = `
                    SELECT m.nev, m.leiras, j.modul_id
                    FROM jogosultsagok j
                    JOIN modulok m ON j.modul_id = m.id
                    WHERE j.user_id = ?
                      AND NOT EXISTS (
                          SELECT 1 FROM jogosultsagok j2
                          JOIN felhasznalok f2 ON j2.user_id = f2.id
                          WHERE j2.modul_id = j.modul_id
                            AND f2.int_id = ?
                            AND f2.role_id = ?
                            AND f2.id != ?
                      )
                `;

                db.query(soleRoleModulesQuery, [userId, intId, roleId, userId], (err, soleModules) => {
                    if (err) return res.status(500).json({ success: false });

                    res.json({
                        success: true,
                        isOnlyUser: false,
                        roleId: roleId,
                        soleRolesInModules: soleModules, // Ez a tömb listázza a kritikus modulokat
                        sharedUsers: sharedRows
                    });
                });
            });
        });
    });
});

// 2. Végpont: Fiók és adatok fizikai megsemmisítése
router.delete('/delete-my-account', async (req, res) => {
    const userId = req.session?.userId || req.body.user_id;
    if (!userId) return res.status(400).json({ success: false });

    // Segédfüggvény a szinkron-jellegű SQL futtatáshoz
    const queryAsync = (sql, params) => {
        return new Promise((resolve, reject) => {
            db.query(sql, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    };

    try {
        // 1. Megkeressük azokat az idk-kat, amiknek a user az eredeti gazdája
        const rows = await queryAsync("SELECT idk FROM kitoltesek WHERE felhasznalo_id = ? AND role = 'admin'", [userId]);
        const idkList = rows.map(r => r.idk);

        // 2. SORBARENDI TÖRLÉSEK (Nincs Deadlock)
        if (idkList.length > 0) {
            // A) Először a válaszokat töröljük, ami ezekhez az idk-khoz tartozik
            await queryAsync("DELETE FROM valaszok WHERE kitoltes_id IN (SELECT id FROM kitoltesek WHERE idk IN (?))", [idkList]);
            
            // B) Aztán töröljük magukat a megosztott és saját kitöltéseket
            await queryAsync("DELETE FROM kitoltesek WHERE idk IN (?)", [idkList]);
        }

        // C) Töröljük azokat a kitöltéseket is, amiket csak VELE osztottak meg
        await queryAsync("DELETE FROM kitoltesek WHERE felhasznalo_id = ?", [userId]);

        // D) Jogosultságok eltávolítása
        await queryAsync("DELETE FROM jogosultsagok WHERE user_id = ?", [userId]);

        // E) Végül a felhasználó kilövése a rendszerből
        await queryAsync("DELETE FROM felhasznalok WHERE id = ?", [userId]);

        // Session kilövése
        if (req.session) {
            req.session.destroy(); 
        }

        res.json({ success: true });

    } catch (err) {
        console.error("Kaszkád törlési hiba:", err);
        res.status(500).json({ success: false, message: 'Adatbázis hiba a törlés során' });
    }
});
router.post('/save-ai-text', (req, res) => {
    const { kitoltesId, aiText, userId, type } = req.body;   // ← type a kulcs

    if (!kitoltesId || !aiText || !userId || !type) {
        return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });
    }

    let targetColumn;
    switch (type) {
        case 'fejlesztesi':   targetColumn = 'AI';            break;
        case 'jellemzes':     targetColumn = 'ai_jellemzes';  break;
        case 'ertekeles':     targetColumn = 'ai_ertekeles';  break;
        default:
            return res.status(400).json({ success: false, message: 'Érvénytelen AI típus!' });
    }

    const queryKitoltes = `
        UPDATE kitoltesek 
        SET ${targetColumn} = ?, 
            ai_kit_max = GREATEST(ai_kit_max - 1, 0) 
        WHERE idk = ?
    `;

    db.query(queryKitoltes, [aiText, kitoltesId], (err) => {
        if (err) {
            console.error('AI szöveg mentési hiba:', err);
            return res.status(500).json({ success: false, message: 'Mentési hiba!' });
        }

        const queryFelhasznalo = `
            UPDATE felhasznalok 
            SET ai_ossz_max = GREATEST(ai_ossz_max - 1, 0) 
            WHERE id = ?
        `;

        db.query(queryFelhasznalo, [userId], (errUser) => {
            if (errUser) {
                console.error('Globális kvóta frissítési hiba:', errUser);
                return res.status(500).json({ success: false, message: 'Szöveg elmentve, de kvóta levonása sikertelen.' });
            }
            res.json({ success: true });
        });
    });
});

router.post('/decrease-global-quota', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'Hiányzó userId!' });
    }

    const query = `
        UPDATE felhasznalok 
        SET ai_ossz_max = GREATEST(ai_ossz_max - 1, 0) 
        WHERE id = ?
    `;
    
    db.query(query, [userId], (err) => {
        if (err) {
            console.error('Globális kvóta levonási hiba:', err);
            return res.status(500).json({ success: false });
        }
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
            console.error('Hiba a jogosultság ellenőrzésekor:', errCheck);
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
                console.error('❌ Hiba a kérdőív mentésekor:', errInsert.message);
                return res.status(500).json({ success: false, message: 'Adatbázis hiba a mentésnél.' });
            }

            // 3. LÉPÉS: USER FLAG BEÁLLÍTÁSA (TÖBBÉ NEM TÖLTHETI KI)
            const updateUserSQL = `UPDATE felhasznalok SET kerdoiv_kitoltve = 1 WHERE id = ?`;
            db.query(updateUserSQL, [userId], (errUserUpd) => {
                if (errUserUpd) console.error('Hiba a user flag mentésekor:', errUserUpd);

                // 4. LÉPÉS: INTÉZMÉNY JUTALMAZÁSA (+15 nap és teszt_ext státusz)
                const updateIntSQL = `UPDATE intezmeny SET fizetve = NOW(), intfin = 15, idoszak = 'teszt_ext' WHERE id = ?`;
                db.query(updateIntSQL, [intId], (errUpdate) => {
                    if (errUpdate) {
                        console.error('❌ Hiba a jutalom jóváírásakor:', errUpdate.message);
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
