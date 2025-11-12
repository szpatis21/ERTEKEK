const express = require('express');
const router = express.Router();

function feltoltes(db) {
	//Feltöltési selectek automatikus kitöltése
		// Altémakör
		  router.get('/alkategoriak', (req, res) => {
			const { foKategoria } = req.query;

			if (!foKategoria) {
				return res.status(400).json({ message: 'A főkategória megadása kötelező.' });
			}

			const query = 'SELECT DISTINCT al_kategoria AS nev FROM kerdesek WHERE fo_kategoria = ? AND al_kategoria IS NOT NULL';
			db.query(query, [foKategoria], (err, results) => {
				if (err) {
					console.error(err);
					return res.status(500).json({ message: 'Hiba történt az alkategóriák lekérdezésekor.' });
				}
				res.json(results);
			});
		});
		//Altémakör lebontás
		router.get('/altTemak', (req, res) => {
			const { foKategoria, alKategoria } = req.query;

			if (!foKategoria || !alKategoria) {
				return res.status(400).json({ message: 'A főkategória és az alkategória megadása kötelező.' });
			}

			const query = 'SELECT DISTINCT alt_tema AS nev FROM kerdesek WHERE fo_kategoria = ? AND al_kategoria = ? AND alt_tema IS NOT NULL';
			db.query(query, [foKategoria, alKategoria], (err, results) => {
				if (err) {
					console.error(err);
					return res.status(500).json({ message: 'Hiba történt az altémák lekérdezésekor.' });
				}
				res.json(results);
			});
		});
    
function ujraszamolOsszErtek(parentId, db, callback) {
  const qFo = `
    SELECT id, ertek, negalt_ertek, fo_kategoria, al_kategoria, alt_tema
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
    router.post('/kerdesek', (req, res) => {
        const { kerdesSzoveg, negaltKerdesSzoveg, foKategoria, alKategoria, altTema, ertek, negalt_ertek, szoveges, kindex, alkerdesek, maximalis_szint,modulId  } = req.body;
        const cleanNegaltErtek = (!negalt_ertek || negalt_ertek === '') ? 0 : Number(negalt_ertek);
        const cleanErtek = (!ertek || ertek === '') ? 0 : Number(ertek);
        const cleanKindex = (!kindex || kindex === '') ? 0 : Number(kindex);

   // --- FŐ KÉRDÉS INSERT ---                                               ▼ +negalt_ertek
const query = `
  INSERT INTO kerdesek
  (kerdes_szoveg, negalt_kerdes_szoveg, parent_id,
   fo_kategoria, al_kategoria, alt_tema,
   ertek, negalt_ertek,        
   szoveges, kindex, maximalis_szint, modul_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const values = [
  kerdesSzoveg,
  negaltKerdesSzoveg,
  null,
  foKategoria,
  alKategoria,
  altTema,
  cleanErtek,
  cleanNegaltErtek,       // most jó helyen
  szoveges,
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
    .filter(alk => alk.al_kerdesSzoveg)
    .map(alk => {
        const cleanAlkErtek = (!alk.al_ertek || alk.al_ertek === '') ? 0 : Number(alk.al_ertek);
        const cleanAlkKindex = (!alk.al_kindex || alk.al_kindex === '') ? 0 : Number(alk.al_kindex);
return {
    query: 'INSERT INTO kerdesek (kerdes_szoveg, negalt_kerdes_szoveg, parent_id, fo_kategoria, al_kategoria, alt_tema, ertek, kindex, szoveges, valasz_ag, maximalis_szint, modul_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    values: [
        alk.al_kerdesSzoveg,
        alk.al_negaltKerdesSzoveg || '',
        newKerdesId,
        foKategoria,
        alKategoria,
        altTema,
        cleanAlkErtek,
        cleanAlkKindex,
        alk.szoveges,
        alk.valasz_ag,
        alk.maximalis_szint ? 1 : 0,
        modulId
    ]
};

    });

                const insertAlkerdesek = alkKerdesekQueries.map(q => new Promise((resolve, reject) => {
                    db.query(q.query, q.values, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                }));
    
                Promise.all(insertAlkerdesek)
    .then(() => {
        ujraszamolOsszErtek(newKerdesId, db, (err) => {
            if (err) {
                console.error("❌ OSSZ_ÉRTÉK újraszámolási hiba új kérdésnél:", err);
                return res.status(500).json({ message: 'Mentés sikerült, de az arány újraszámolása hibázott.' });
            }
            res.status(201).json({ message: 'Kérdés és alkérdések hozzáadva, értékek frissítve.' });
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
    });
    //FRISSÍT
  // PATCH – kérdés (és alkérdések) frissítése
router.patch('/kerdesek/:id', (req, res) => {
  const { id } = req.params;
  const {
    kerdesSzoveg, negaltKerdesSzoveg, foKategoria, alKategoria, altTema,
    ertek, negalt_ertek, szoveges, kindex, maximalis_szint,
    alkerdesek = [], modulId
  } = req.body;

  const cleanErtek       = Number(ertek)        || 0;
  const cleanNegaltErtek = Number(negalt_ertek) || 0;
  const cleanKindex      = Number(kindex)       || 0;

  /* 1) FŐ KÉRDÉS UPDATE */
  const updSql = `
    UPDATE kerdesek SET
      kerdes_szoveg = ?, negalt_kerdes_szoveg = ?,
      fo_kategoria  = ?, al_kategoria = ?, alt_tema = ?,
      ertek = ?, negalt_ertek = ?,
      szoveges = ?, kindex = ?,
      maximalis_szint = ?, modul_id = ?
    WHERE id = ?`;
  const updVals = [
    kerdesSzoveg, negaltKerdesSzoveg,
    foKategoria,  alKategoria,  altTema,
    cleanErtek,   cleanNegaltErtek,
    szoveges ? 1 : 0, cleanKindex,
    maximalis_szint ? 1 : 0,
    modulId,
    id
  ];

  db.query(updSql, updVals, (err1) => {
    if (err1) {
      console.error('[PATCH UPDATE]', err1);
      return res.status(500).json({ message: 'Hiba a fő kérdés frissítésekor.', error: err1.message });
    }

    /* 2) Régi alkérdések törlése */
    db.query('DELETE FROM kerdesek WHERE parent_id = ?', [id], (err2) => {
      if (err2) {
        console.error('[PATCH DELETE ALKERDESEK]', err2);
        return res.status(500).json({ message: 'Hiba az alkérdések törlésekor.', error: err2.message });
      }

      /* 3) Új alkérdések beszúrása, ha vannak */
      const values = alkerdesek
        .filter(a => a.al_kerdesSzoveg)
        .map(a => [
          a.al_kerdesSzoveg,
          a.al_negaltKerdesSzoveg || '',
          id,
          foKategoria,
          alKategoria,
          altTema,
          Number(a.al_ertek) || 0,
          Number(a.al_kindex) || 0,
          a.szoveges ? 1 : 0,
          a.valasz_ag,
          modulId
        ]);

      if (values.length === 0) {
        return afterInsert();
      }

      const insSql = `
        INSERT INTO kerdesek
        (kerdes_szoveg, negalt_kerdes_szoveg, parent_id,
         fo_kategoria, al_kategoria, alt_tema,
         ertek, kindex, szoveges, valasz_ag, modul_id)
        VALUES ?`;

      db.query(insSql, [values], (err3) => {
        if (err3) {
          console.error('[PATCH INSERT ALKERDESEK]', err3);
          return res.status(500).json({ message: 'Hiba az alkérdések beszúrásakor.', error: err3.message });
        }

        afterInsert();
      });
    });
  });

  /* 4) Újraszámolás */
  function afterInsert() {
    ujraszamolOsszErtek(id, db, (err4) => {
      if (err4) {
        console.error('[PATCH UJRASZAMOL]', err4);
        return res.status(500).json({ message: 'Hiba az ossz_ertek újraszámolásakor.', error: err4.message });
      }

      res.json({ message: 'Frissítés OK, altéma rendben.' });
    });
  }
});


    

// Csoportos frissítés lekérdezése egy adott fő kérdés és alkérdései alapján
router.get('/kerdesek/csoportos-frissites', (req, res) => {
    const { id } = req.query;

    // Lekérdezzük a fő kérdést az ID alapján
    const kerdesQuery = 'SELECT * FROM kerdesek WHERE id = ?';
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
        const alkerdesekQuery = 'SELECT * FROM kerdesek WHERE parent_id = ?';
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
    router.delete('/alkerdesek/:id', (req, res) => {
        const alkerdesId = req.params.id;

        const deleteAlkerdesQuery = 'DELETE FROM kerdesek WHERE id = ? AND parent_id IS NOT NULL';
        db.query(deleteAlkerdesQuery, [alkerdesId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Alkérdés törölve' });
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


    return router;
};
module.exports = feltoltes;
