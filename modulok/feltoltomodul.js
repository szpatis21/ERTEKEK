const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { resolveKategoriaKapcsoloId } = require('./kategoriaHelper');

function feltoltes(db) {
    const logger = require('./logmodul')(db);

	//Feltöltési selectek automatikus kitöltése
		router.get('/api/get-sablonok', (req, res) => {
			const { modulId, userId } = req.query;

			// Kinyerjük a userId-t a sessionből (legbiztonságosabb), vagy a query-ből
			const actualUserId = req.session?.userId || userId;

			if (!modulId || !actualUserId) {
				return res.status(400).json({ message: 'A modulId és a userId megadása kötelező.' });
			}

			// LÉNYEG: A backend maga keresi ki az int_id-t a felhasználó id-ja alapján!
	const query = `
    SELECT s.csoport_nev, s.kerdes, s.ag, s.pont, s.szoveges, s.maximalis_szint 
    FROM sablonok s
    JOIN felhasznalok f ON s.int_id = f.int_id
    WHERE s.modul_id = ? AND f.id = ?
`;

			db.query(query, [modulId, actualUserId], (err, results) => {
				if (err) {
					console.error('Hiba történt a sablonok lekérdezésekor:', err);
					return res.status(500).json({ message: 'Hiba történt a sablonok lekérdezésekor.' });
				}

				// Lapos SQL eredmények csoportosítása a frontend JSON formátumára
				const csoportokMap = {};
				results.forEach(row => {
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
						szoveges: row.szoveges === 1,
                        maxi: row.maximalis_szint === 1// 1 -> true, 0 -> false
                        
					});
				});

				res.json({ SABLON_CSOPORTOK: Object.values(csoportokMap) });
			});
		});
		// Altémakör
router.get('/alkategoriak', (req, res) => {
  const { foKategoria, modulId: modulIdRaw } = req.query;
  const modulId = Number(modulIdRaw || req.session?.modulId);

  if (!foKategoria) {
    return res.status(400).json({ message: 'A főkategória megadása kötelező.' });
  }

  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId.' });
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
      console.error('Hiba történt az alkategóriák lekérdezésekor:', err);
      return res.status(500).json({ message: 'Hiba történt az alkategóriák lekérdezésekor.' });
    }

    res.json(results);
  });
});
		//Altémakör lebontás
router.get('/altTemak', (req, res) => {
  const { foKategoria, alKategoria, modulId: modulIdRaw } = req.query;
  const modulId = Number(modulIdRaw || req.session?.modulId);

  if (!foKategoria || !alKategoria) {
    return res.status(400).json({ message: 'A főkategória és az alkategória megadása kötelező.' });
  }

  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId.' });
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
      console.error('Hiba történt az altémák lekérdezésekor:', err);
      return res.status(500).json({ message: 'Hiba történt az altémák lekérdezésekor.' });
    }

    res.json(results);
  });
});
    
function ujraszamolOsszErtek(parentId, db, callback) {
const qFo = `
  SELECT id, ertek, negalt_ertek
  FROM kerdesek
  WHERE id = ? LIMIT 1
`;

  db.query(qFo, [parentId], (err, rows) => {
    if (err) return callback(err);
    const foKerdes = rows?.[0];
    if (!foKerdes) return callback(new Error('Főkérdés nem található.'));

    const qAl = `
      SELECT id, ertek, valasz_ag, szoveges
      FROM kerdesek
      WHERE parent_id = ? AND szoveges = 0
    `;
    db.query(qAl, [parentId], async (err2, alk) => {
      if (err2) return callback(err2);
      if (!alk || alk.length === 0) {
        // nincs alkérdés → ezt másik rutinod kezeli, itt nincs teendő
        return callback(null);
      }

      const igenAg = alk.filter(a => String(a.valasz_ag).toLowerCase() === 'igen');
      const nemAg  = alk.filter(a => String(a.valasz_ag).toLowerCase() === 'nem');

      // helper: frissítések végrehajtása
      const apply = async (rowsToUpdate, ref) => {
        const safeRef = Number(ref);
        // ha nincs normális ref, ne csináljunk 100%-okat a semmiből
        if (!(safeRef > 0)) {
          // mind 0%
          for (const r of rowsToUpdate) {
            await db.promise().query('UPDATE kerdesek SET ossz_ertek = ? WHERE id = ?', [0, r.id]);
          }
          return;
        }
        for (const r of rowsToUpdate) {
          const v = Number(r.ertek) || 0;
          let pct = Math.round((v / safeRef) * 100);
          if (pct < 0) pct = 0;
          if (pct > 100) pct = 100;
          await db.promise().query('UPDATE kerdesek SET ossz_ertek = ? WHERE id = ?', [pct, r.id]);
        }
      };

      try {
        if (igenAg.length > 0) {
          // IGEN max == 100%
          const maxIgen = Math.max(...igenAg.map(x => Number(x.ertek) || 0), 0);
          await apply(igenAg, maxIgen);
          await apply(nemAg,  maxIgen);
        } else if (nemAg.length > 0) {
          // csak NEM-ág van → baseline a főkérdés ertek
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
    modulId
  } = req.body;

  const cleanNegaltErtek = (!negalt_ertek || negalt_ertek === '') ? 0 : Number(negalt_ertek);
  const cleanErtek = (!ertek || ertek === '') ? 0 : Number(ertek);
  const cleanKindex = (!kindex || kindex === '') ? 0 : Number(kindex);

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
        modul_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      kerdesSzoveg,
      negaltKerdesSzoveg,
      null,
      kategoriaKapcsoloId,
      cleanErtek,
      cleanNegaltErtek,
      szoveges ? 1 : 0,
      cleanKindex,
      maximalis_szint ? 1 : 0,
      modulId
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error(err);
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
            const valaszAg = alk.valasz_ag || alk.valaszAg;

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
                  modul_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              values: [
                alkSzoveg,
                alkNegaltSzoveg,
                newKerdesId,
                kategoriaKapcsoloId,
                cleanAlkErtek,
                cleanAlkNegaltErtek,
                cleanAlkKindex,
                alk.szoveges ? 1 : 0,
                valaszAg,
                isMaxi,
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
                console.error('❌ OSSZ_ÉRTÉK újraszámolási hiba új kérdésnél:', err);
                return res.status(500).json({
                  message: 'Mentés sikerült, de az arány újraszámolása hibázott.'
                });
              }

              res.status(201).json({
                message: 'Kérdés és alkérdések hozzáadva, értékek frissítve.'
              });
            });
          })
          .catch(err => {
            console.error(err);
            res.status(500).json({ message: 'Hiba történt az alkérdések hozzáadása során.' });
          });
      } else {
        res.status(201).json({ message: 'Kérdés hozzáadva' });
      }
    });
  } catch (error) {
    console.error('[POST /kerdesek kategória hiba]', error);
    res.status(500).json({
      message: 'Hiba történt a kategória-kapcsolat létrehozásakor.',
      error: error.message
    });
  }
});

// PATCH – kérdés (és alkérdések) frissítése BIZTONSÁGOSAN
router.patch('/kerdesek/:id', async (req, res) => {
    const { id } = req.params;
    const {
        kerdesSzoveg, negaltKerdesSzoveg, foKategoria, alKategoria, altTema,
        ertek, negalt_ertek, szoveges, kindex, maximalis_szint,
        alkerdesek = [], modulId
    } = req.body;
const actualUserId = req.session?.userId || req.query.userId || 0; 

    logger(req, actualUserId, 'KÉRDÉS_SZERKESZTÉS', {
        kerdes_id: id,
        modul_id: modulId,
        fokerdes_szoveg: kerdesSzoveg,
        kapott_alkerdesek_szama: alkerdesek.length,
        bekuldott_alkerdesek: alkerdesek
    });
    const cleanErtek       = Number(ertek)        || 0;
    const cleanNegaltErtek = Number(negalt_ertek) || 0;
    const cleanKindex      = Number(kindex)       || 0;
let kategoriaKapcsoloId;

try {
  kategoriaKapcsoloId = await resolveKategoriaKapcsoloId(db, {
    modulId,
    foKategoria,
    alKategoria,
    altTema
  });
} catch (error) {
  console.error('[PATCH /kerdesek/:id kategória hiba]', error);
  return res.status(500).json({
    message: 'Hiba történt a kategória-kapcsolat létrehozásakor.',
    error: error.message
  });
}
    /* 1) FŐ KÉRDÉS UPDATE */
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
    modul_id = ?
  WHERE id = ?
`;

const updVals = [
  kerdesSzoveg,
  negaltKerdesSzoveg,
  kategoriaKapcsoloId,
  cleanErtek,
  cleanNegaltErtek,
  szoveges ? 1 : 0,
  cleanKindex,
  maximalis_szint ? 1 : 0,
  modulId,
  id
];

    db.query(updSql, updVals, async (err1) => {
        if (err1) {
            console.error('[PATCH UPDATE]', err1);
            return res.status(500).json({ message: 'Hiba a fő kérdés frissítésekor.', error: err1.message });
        }

        try {
            // Segédfüggvény az async SQL futtatáshoz
            const queryAsync = (sql, params) => new Promise((resolve, reject) => {
                db.query(sql, params, (e, r) => e ? reject(e) : resolve(r));
            });

            /* 2) Alkérdések szinkronizálása (Módosítás, Beszúrás, Törlés) */
            
            // Lekérjük a JELENLEGI alkérdések ID-jait
            const existingRows = await queryAsync('SELECT id FROM kerdesek WHERE parent_id = ?', [id]);
            const existingIds = existingRows.map(r => r.id);

            // Kinyerjük a FRONTENDRŐL érkező (megtartott) ID-kat
            const incomingIds = alkerdesek.map(a => a.al_id).filter(val => val !== null);
            
            // Ami eddig létezett, de most nem jött meg -> TÖRÖLNI KELL
           // Ami eddig létezett, de most nem jött meg -> TÖRÖLNI KELL
            const idsToDelete = existingIds.filter(eId => !incomingIds.includes(eId));
            
            // --- BIZTONSÁGI FÉK KEZDETE ---
            // Ha az adatbázisban voltak alkérdések, de a frontend egyet sem küldött (üres tömb),
            // és emiatt a rendszer az összes létezőt törölni akarná:
            if (existingIds.length > 0 && incomingIds.length === 0 && idsToDelete.length === existingIds.length) {
                console.warn(`[BIZTONSÁGI FÉK] A ${id}-es kérdésnél az összes alkérdés törlését megakadályoztuk!`);
           
                idsToDelete.length = 0; 
            }

            if (idsToDelete.length > 0) {
                await queryAsync('DELETE FROM kerdesek WHERE id IN (?)', [idsToDelete]);
            }
            // Végigmegyünk a kapott alkérdéseken
            for (const alk of alkerdesek) {
                const isSzov = alk.szoveges ? 1 : 0;
                const isMaxi = alk.maximalis_szint ? 1 : 0;
                const alkErtek = Number(alk.al_ertek) || 0;
                const alkNegaltErtek = Number(alk.al_negalt_ertek) || 0; // <-- EZT BELE KELL TENNI
                const alkKindex = Number(alk.al_kindex) || 0;

                if (alk.al_id) {
                    // VAN ID -> Csak frissítjük a meglévő adatokat
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
    modul_id = ?
  WHERE id = ? AND parent_id = ?
`;

await queryAsync(updAlkSql, [
  alk.al_kerdesSzoveg,
  alk.al_negaltKerdesSzoveg || '',
  kategoriaKapcsoloId,
  alkErtek,
  alkNegaltErtek,
  alkKindex,
  isSzov,
  alk.valasz_ag,
  isMaxi,
  modulId,
  alk.al_id,
  id
]);
                } else {
                    // NINCS ID -> Ez egy most hozzáadott új alkérdés
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
    modul_id
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

await queryAsync(insAlkSql, [
  alk.al_kerdesSzoveg,
  alk.al_negaltKerdesSzoveg || '',
  id,
  kategoriaKapcsoloId,
  alkErtek,
  alkNegaltErtek,
  alkKindex,
  isSzov,
  alk.valasz_ag,
  isMaxi,
  modulId
]);
                }
            }
            /* 3) Újraszámolás */
           /* 3) Újraszámolás */
            // Konvertáljuk az URL-ből érkező id-t Integer-ré, hogy az újraszámoló 
            // DB lekérdezései garantáltan egyezzenek az adatbázis típusaival!
            
          const numericId = parseInt(id, 10);

// 🔥 MEGKERESSÜK A PARENT_ID-T
const parentResult = await queryAsync(
    'SELECT parent_id FROM kerdesek WHERE id = ?',
    [numericId]
);

// ha alkérdés → parent_id
// ha főkérdés → parent_id null → marad numericId
const parentId = parentResult?.[0]?.parent_id || numericId;

// 🔥 HELYES ÚJRASZÁMOLÁS
ujraszamolOsszErtek(parentId, db, (err4) => {
    if (err4) {
        console.error('[PATCH UJRASZAMOL]', err4);
        return res.status(500).json({ 
            message: 'Hiba az ossz_ertek újraszámolásakor.', 
            error: err4.message 
        });
    }

    const fokerdesCheckQuery = `
        SELECT id, ertek, negalt_ertek 
        FROM kerdesek 
        WHERE id = ? AND parent_id IS NULL 
          AND id NOT IN (
            SELECT DISTINCT parent_id 
            FROM kerdesek 
            WHERE parent_id IS NOT NULL
          )
    `;

    db.query(fokerdesCheckQuery, [parentId], (checkErr, checkRows) => {
        if (checkErr) {
            console.error('[PATCH FOKERDES CHECK]', checkErr);
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
                'UPDATE kerdesek SET ossz_ertek = ? WHERE id = ?', 
                [finalOsszErtek, parentId], 
                (updErr) => {
                    if (updErr) console.error('[PATCH FOKERDES UPDATE]', updErr);

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
});

        } catch (error) {
            console.error('[PATCH ALKERDES SZINKRON HIBA]', error);
            res.status(500).json({ message: 'Hiba az alkérdések szinkronizálása során.', error: error.message });
        }
    });
});

router.post('/api/alkerdesek', async (req, res) => {
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
    modulId
  } = req.body;

  const cleanErtek = Number(ertek) || 0;
  const cleanNegaltErtek = Number(negaltErtek) || 0;
  const cleanKindex = Number(kindex) || 0;
  const isSzoveges = szoveges ? 1 : 0;
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
        modul_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      kerdesSzoveg,
      negaltKerdesSzoveg || '',
      parentId,
      kategoriaKapcsoloId,
      cleanErtek,
      cleanNegaltErtek,
      isSzoveges,
      valaszAg,
      isMaxi,
      cleanKindex,
      modulId
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Hiba az alkérdés hozzáadásakor:', err);
        return res.status(500).json({
          success: false,
          message: 'Hiba történt az alkérdés hozzáadásakor.'
        });
      }

      ujraszamolOsszErtek(parentId, db, err2 => {
        if (err2) {
          console.error('Hiba az ossz_ertek újraszámolásakor:', err2);
          return res.status(500).json({
            success: false,
            message: 'Alkérdés mentve, de az újraszámolás hibázott.'
          });
        }

        res.status(201).json({
          success: true,
          id: result.insertId,
          message: 'Alkérdés hozzáadva.'
        });
      });
    });
  } catch (error) {
    console.error('[POST /api/alkerdesek kategória hiba]', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a kategória-kapcsolat létrehozásakor.',
      error: error.message
    });
  }
});
// Csoportos frissítés lekérdezése egy adott fő kérdés és alkérdései alapján
router.get('/kerdesek/csoportos-frissites', (req, res) => {
    const { id } = req.query;

    // Lekérdezzük a fő kérdést az ID alapján
const kerdesQuery = 'SELECT * FROM kerdesek_kategoriaval WHERE id = ?';
    db.query(kerdesQuery, [id], (err, kerdesResult) => {
        if (err) {
            console.error('Hiba történt a fő kérdés lekérdezésekor:', err);
            return res.status(500).json({ message: 'Hiba történt a fő kérdés lekérdezésekor.' });
        }

        if (kerdesResult.length === 0) {
            return res.status(404).json({ message: 'Kérdés nem található.' });
        }

        const foKerdes = kerdesResult[0];

        // Lekérdezzük a hozzá tartozó alkérdéseket
const alkerdesekQuery = 'SELECT * FROM kerdesek_kategoriaval WHERE parent_id = ?';
        db.query(alkerdesekQuery, [id], (err, alkerdesekResult) => {
            if (err) {
                console.error('Hiba történt az alkérdések lekérdezésekor:', err);
                return res.status(500).json({ message: 'Hiba történt az alkérdések lekérdezésekor.' });
            }

            // Visszaküldjük a fő kérdést és az összes hozzá tartozó alkérdést
            res.json({ foKerdes, alkerdesek: alkerdesekResult });
        });
    });
});


    // KÉRDÉS TÖRLÉSE
    router.delete('/kerdesek/:id', (req, res) => {
        const kerdesId = req.params.id;

        const deleteAlkerdesekQuery = 'DELETE FROM kerdesek WHERE parent_id = ?';
        db.query(deleteAlkerdesekQuery, [kerdesId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const deleteKerdesQuery = 'DELETE FROM kerdesek WHERE id = ?';
            db.query(deleteKerdesQuery, [kerdesId], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Kérdés és alkérdések törölve' });
            });
        });
    });

    // ALKÉRDÉS TÖRLÉSE
   // ALKÉRDÉS TÖRLÉSE ÉS ÚJRASZÁMOLÁS
router.delete('/alkerdesek/:id', (req, res) => {
    const alkerdesId = req.params.id;

    // 1. Megkeressük a parent_id-t a törlés előtt
    const findParentQuery = 'SELECT parent_id FROM kerdesek WHERE id = ?';
    
    db.query(findParentQuery, [alkerdesId], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(500).json({ error: 'Alkérdés nem található.' });
        }
        
        const parentId = rows[0].parent_id;

        // 2. Töröljük az alkérdést
        const deleteQuery = 'DELETE FROM kerdesek WHERE id = ?';
        db.query(deleteQuery, [alkerdesId], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // 3. Újraszámoljuk a maradék alkérdések arányait
            ujraszamolOsszErtek(parentId, db, (err3) => {
                if (err3) {
                    console.error("Hiba az újraszámolásnál törlés után:", err3);
                    return res.status(500).json({ message: 'Törölve, de az arányok frissítése hibázott.' });
                }
                res.json({ message: 'Alkérdés törölve, értékek újraszámolva.', parentId: parentId });
            });
        });
    });
});

    // Alkérdések ossz_ertek mezőjének arányos frissítése
router.post('/api/frissit-ossz-ertek', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT parent_id, id, ertek 
            FROM kerdesek 
            WHERE parent_id IS NOT NULL
        `);

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
                    `UPDATE kerdesek SET ossz_ertek = ? WHERE id = ?`,
                    [szazalek, id]
                );
            }
        }

        res.json({ success: true, message: 'Az ossz_ertek mezők sikeresen frissítve.' });
    } catch (err) {
        console.error('Hiba az ossz_ertek frissítésénél:', err);
        res.status(500).json({ success: false, message: 'Hiba történt a frissítés során.' });
    }
});
// Főkérdések százalékos értékének frissítése, ha nincs alkérdés
router.post('/api/frissit-fokerdesek-ossz-ertek', (req, res) => {
    const kerdesQuery = `
        SELECT id, ertek, negalt_ertek
        FROM kerdesek
        WHERE parent_id IS NULL
          AND id NOT IN (SELECT DISTINCT parent_id FROM kerdesek WHERE parent_id IS NOT NULL)
    `;

    db.query(kerdesQuery, (err, rows) => {
        if (err) {
            console.error("❌ Hiba a főkérdések lekérdezésekor:", err);
            return res.status(500).json({ message: 'Lekérdezési hiba.' });
        }

        const updatePromises = rows.map(({ id, ertek, negalt_ertek }) => {
            ertek = Number(ertek) || 0;
            negalt_ertek = Number(negalt_ertek) || 0;

            const maxErtek = Math.max(ertek, negalt_ertek) || 1;

            const ossz_ertek = Math.round((Math.max(ertek, negalt_ertek) / maxErtek) * 100); // mindig 100
            const kisebb_ossz_ertek = Math.round((Math.min(ertek, negalt_ertek) / maxErtek) * 100);

            // mindig azt mentjük, ami a nagyobb értékhez tartozik (pl. ertek vagy negalt_ertek)
            const finalOsszErtek = ertek >= negalt_ertek ? ossz_ertek : kisebb_ossz_ertek;

            return new Promise((resolve, reject) => {
                db.query(
                    'UPDATE kerdesek SET ossz_ertek = ? WHERE id = ?',
                    [finalOsszErtek, id],
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
                console.error("❌ Hiba frissítés közben:", err);
                res.status(500).json({ message: 'Hiba történt a frissítés során.' });
            });
    });
});
router.post('/api/frissit-minden-ossz-ertek', (req, res) => {
    const query = 'SELECT id FROM kerdesek WHERE parent_id IS NULL';

    db.query(query, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Hiba a főkérdések lekérdezésekor.' });
        }

        const frissitesek = rows.map(row => {
            return new Promise((resolve, reject) => {
                ujraszamolOsszErtek(row.id, db, (err) => {
                    err ? reject(err) : resolve();
                });
            });
        });

        Promise.all(frissitesek)
            .then(() => res.json({ message: 'Minden kérdés frissítve!' }))
            .catch(err => {
                console.error(err);
                res.status(500).json({ message: 'Hiba a frissítések során.', error: err.message });
            });
    });
});
router.post('/api/ujraszamol-ossz-ertek', (req, res) => {
    const { parentId } = req.body;
    if (!parentId) {
        return res.status(400).json({ success: false, message: 'Hiányzik a parentId!' });
    }

    ujraszamolOsszErtek(parentId, db, (err) => {
        if (err) {
            console.error("❌ OSSZ_ÉRTÉK újraszámítási hiba:", err);
            return res.status(500).json({ success: false, message: 'Számítási hiba.' });
        }

        res.json({ success: true, message: 'ossz_ertek sikeresen újraszámolva.' });
    });
});
// --- KATEGÓRIA KEZELŐ VÉGPONTOK (FŐ, AL, ALTÉMA) ---



// 1. FŐKATEGÓRIA - LÉTREHOZÁS
router.post('/api/kategoriak/fo', async (req, res) => {
  const { nev, leiras, szin, modulId } = req.body;

  if (!nev || !modulId) {
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
    console.error('[FŐKATEGÓRIA LÉTREHOZÁS HIBA]', error);
    return res.status(500).json({ message: error.message });
  }
});
// 2. FŐKATEGÓRIA - FRISSÍTÉS (Szín, Név, Leírás + kitoltesek tábla)
router.patch('/api/kategoriak/fo', (req, res) => {
  const { regiNev, ujNev, leiras, szin, modulId } = req.body;

  if (!regiNev || !ujNev || !modulId) {
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
      console.error('[FŐKATEGÓRIA FRISSÍTÉS HIBA]', err);
      return res.status(500).json({ message: 'Hiba a főkategória frissítésekor' });
    }

    if (regiNev !== ujNev) {
      const replaceQuery = `UPDATE kitoltesek SET szazalek = REPLACE(szazalek, ?, ?) WHERE modul_id = ?`;
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
  const { nev, modulId } = req.body;

  if (!nev || !modulId) {
    return res.status(400).json({ message: 'Hiányzó adatok' });
  }

  const queryAsync = (sql, params) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });

  try {
    const idsRows = await queryAsync(
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
      await queryAsync(
        'DELETE FROM kerdesek WHERE kategoria_kapcsolo_id IN (?) AND parent_id IS NOT NULL',
        [ids]
      );

      await queryAsync(
        'DELETE FROM kerdesek WHERE kategoria_kapcsolo_id IN (?) AND parent_id IS NULL',
        [ids]
      );

      await queryAsync(
        'DELETE FROM kategoria_kapcsolo WHERE id IN (?)',
        [ids]
      );
    }

    await queryAsync(
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

    await queryAsync(
      `
        DELETE a
        FROM alkategoriak a
        JOIN fokategoriak f ON f.id = a.fokategoria_id
        WHERE a.modul_id = ?
          AND f.nev = ?
      `,
      [modulId, nev]
    );

    await queryAsync(
      'DELETE FROM fokategoriak WHERE modul_id = ? AND nev = ?',
      [modulId, nev]
    );

    return res.json({
      success: true,
      message: 'Főkategória, kapcsolatai, alkategóriái, altémái és kérdései törölve.'
    });
  } catch (error) {
    console.error('[FŐKATEGÓRIA TÖRLÉS HIBA]', error);
    return res.status(500).json({ message: 'Hiba történt a főkategória törlésekor.' });
  }
});


// 4. ALKATEGÓRIA / ALTÉMA - LÉTREHOZÁS
router.post('/api/kategoriak/al_altema', async (req, res) => {
  const { tipus, nev, foKategoria, alKategoria, modulId } = req.body;

  if (!tipus || !nev || !foKategoria || !modulId) {
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

    if (!alKategoria) {
      return res.status(400).json({
        message: 'Altéma létrehozásához alkategória szükséges.'
      });
    }

    await resolveKategoriaKapcsoloId(db, {
      modulId,
      foKategoria,
      alKategoria,
      altTema: nev
    });

    return res.status(201).json({
      success: true,
      message: 'Altéma létrehozva!'
    });
  } catch (error) {
    console.error('[AL/ALTÉMA LÉTREHOZÁS HIBA]', error);
    return res.status(500).json({ message: error.message });
  }
});

router.patch('/api/kategoriak/al_altema', (req, res) => {
  const { tipus, regiNev, ujNev, foKategoria, alKategoria, modulId } = req.body;

  if (!tipus || !regiNev || !ujNev || !foKategoria || !modulId) {
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
  } else {
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
  }

  db.query(updateQuery, params, err => {
    if (err) {
      console.error('[AL/ALTÉMA FRISSÍTÉS HIBA]', err);
      return res.status(500).json({ message: 'Adatbázis hiba a kategória frissítésekor' });
    }

    const replaceQuery = `UPDATE kitoltesek SET szazalek = REPLACE(szazalek, ?, ?) WHERE modul_id = ?`;

    db.query(replaceQuery, [`"${regiNev}":`, `"${ujNev}":`, modulId], () => {
      res.json({ success: true });
    });
  });
});
router.delete('/api/kategoriak/al_altema', async (req, res) => {
  const { tipus, nev, foKategoria, alKategoria, modulId } = req.body;

  if (!tipus || !nev || !foKategoria || !modulId) {
    return res.status(400).json({ message: 'Hiányzó adatok' });
  }

  const queryAsync = (sql, params) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });

  try {
    let idsRows = [];

    if (tipus === 'al') {
      idsRows = await queryAsync(
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
    } else {
      idsRows = await queryAsync(
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
    }

    const ids = idsRows.map(r => r.id);

    if (ids.length === 0) {
      return res.json({ success: true });
    }

    await queryAsync(
      'DELETE FROM kerdesek WHERE kategoria_kapcsolo_id IN (?) AND parent_id IS NOT NULL',
      [ids]
    );

    await queryAsync(
      'DELETE FROM kerdesek WHERE kategoria_kapcsolo_id IN (?) AND parent_id IS NULL',
      [ids]
    );

    await queryAsync(
      'DELETE FROM kategoria_kapcsolo WHERE id IN (?)',
      [ids]
    );

  if (tipus === 'al') {
  await queryAsync(
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

  await queryAsync(
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
} else {
      await queryAsync(
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
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[AL/ALTÉMA TÖRLÉS HIBA]', error);
    res.status(500).json({ message: 'DB hiba törléskor' });
  }
});

// --- AI BEÁLLÍTÁSOK LEKÉRÉSE ÉS MENTÉSE ---
router.get('/api/ai-beallitasok', (req, res) => {
    const { modulId } = req.query;
    if (!modulId) return res.status(400).json({ success: false, message: "Modul ID szükséges" });

    // JAVÍTÁS: A SELECT-be bekerültek a cim_jellemzes, cim_fejlesztes, cim_ertekeles oszlopok
    const q = 'SELECT nev, szerep, vizsgalt_targy, ai_kontextus, cim_jellemzes, prompt_jellemzes, cim_fejlesztes, prompt_fejlesztes, cim_ertekeles, prompt_ertekeles FROM modulok WHERE id = ?';
    
    db.query(q, [modulId], (err, modulok) => {
        if (err) return res.status(500).json({ success: false, message: "Adatbázis hiba" });
        if (modulok.length === 0) return res.status(404).json({ success: false, message: "Modul nem található" });

        const modul = modulok[0];
        let szakmaiAnyagSzoveg = "";
        let vanFile = false;

        const filePath = path.join(__dirname, 'szakmai anyag', `${modul.nev}.txt`);
        try {
            if (fs.existsSync(filePath)) {
                szakmaiAnyagSzoveg = fs.readFileSync(filePath, 'utf-8');
                vanFile = true;
            }
        } catch (e) {
            console.error("Fájl olvasási hiba:", e);
        }

       res.json({
            success: true,
            adatok: {
                szerep: modul.szerep,
                vizsgalt_targy: modul.vizsgalt_targy,
                ai_kontextus: modul.ai_kontextus,
                cim_jellemzes: modul.cim_jellemzes,    // <-- EZT ADD HOZZÁ
                prompt_jellemzes: modul.prompt_jellemzes,
                cim_fejlesztes: modul.cim_fejlesztes,  // <-- EZT ADD HOZZÁ
                prompt_fejlesztes: modul.prompt_fejlesztes,
                cim_ertekeles: modul.cim_ertekeles,    // <-- EZT ADD HOZZÁ
                prompt_ertekeles: modul.prompt_ertekeles,
                szakmai_anyag: szakmaiAnyagSzoveg,
                van_szakmai_file: vanFile
            }
        });
    });
});

// feltoltomodul.js - Mentés végpont
router.post('/api/ai-beallitasok', (req, res) => {
    const { modulId, szakmai_anyag, ...egyebAdatok } = req.body;

    // JAVÍTÁS: Az UPDATE-be is bekerültek a cim_... oszlopok
    const updateQuery = `UPDATE modulok SET szerep=?, vizsgalt_targy=?, ai_kontextus=?, cim_jellemzes=?, prompt_jellemzes=?, cim_fejlesztes=?, prompt_fejlesztes=?, cim_ertekeles=?, prompt_ertekeles=? WHERE id=?`;
    
    const params = [
        egyebAdatok.szerep, egyebAdatok.vizsgalt_targy, egyebAdatok.ai_kontextus, 
        egyebAdatok.cim_jellemzes, egyebAdatok.prompt_jellemzes, 
        egyebAdatok.cim_fejlesztes, egyebAdatok.prompt_fejlesztes, 
        egyebAdatok.cim_ertekeles, egyebAdatok.prompt_ertekeles, 
        modulId
    ];

    db.query(updateQuery, params, (err) => {
        if (err) return res.status(500).json({ success: false, message: "DB hiba" });

        db.query('SELECT nev FROM modulok WHERE id = ?', [modulId], (err2, modulok) => {
            if (!err2 && modulok.length > 0) {
                const filePath = path.join(__dirname, 'szakmai anyag', `${modulok[0].nev}.txt`);
                
                try {
                    const dir = path.dirname(filePath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                    fs.writeFileSync(filePath, szakmai_anyag || "", 'utf-8');
                } catch(e) { console.error('Fájl mentési hiba:', e); }
            }
            res.json({ success: true, message: "Beállítások és dokumentum mentve!" });
        });
    });
});

// ÚJ SABLON MENTÉSE (Csoportosan)
router.post('/api/ment-sablonok', (req, res) => {
    const { modulId, userId, sablonNev, elemek } = req.body;

    if (!modulId || !userId || !sablonNev || !elemek || elemek.length === 0) {
        return res.status(400).json({ success: false, message: 'Hiányzó adatok a mentéshez.' });
    }

    // Először le kell kérnünk az int_id-t a felhasználóhoz a biztonság érdekében
    db.query('SELECT int_id FROM felhasznalok WHERE id = ?', [userId], (err, userRows) => {
        if (err || userRows.length === 0) {
            return res.status(500).json({ success: false, message: 'Felhasználó nem azonosítható.' });
        }
        const intId = userRows[0].int_id;

        // Az összes elemet egyetlen query-ben szúrjuk be
       const query = `
    INSERT INTO sablonok (csoport_nev, kerdes, ag, pont, szoveges, maximalis_szint, modul_id, int_id)
    VALUES ?
`;

        const values = elemek.map(e => [
    sablonNev,
    e.szoveg,
    e.ag,
    Number(e.ertek) || 0,
    e.szoveges ? 1 : 0,
    e.maxi ? 1 : 0, // <-- EZ A SOR HOZZÁADVA
    modulId,
    intId
]);

        db.query(query, [values], (err2) => {
            if (err2) {
                console.error('Hiba a sablon mentésekor:', err2);
                return res.status(500).json({ success: false, message: 'Adatbázis hiba a mentés során.' });
            }
            res.json({ success: true, message: 'Sablon sikeresen elmentve!' });
        });
    });
});

    return router;
};
module.exports = feltoltes;