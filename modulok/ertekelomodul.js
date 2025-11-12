const express = require('express');
const router = express.Router();

function kerdoiv(db) {
    // Összes kérdés megjelenítése
// GET /kerdesek?modulId=2
router.get('/kerdesek', (req, res) => {
  const modulId = +req.query.modulId;           // decimálisra cast

  // ① Gyors validáció
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId!' });
  }

  // ② Lekérdezés
const sql = `
  SELECT k.*
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  ORDER BY k.kindex ASC
`;

 db.query(sql, [modulId, modulId], (err, results) => {  // ← itt a paraméter-tömb
    if (err) {
      console.error(err);
      return res.status(500).send('Hiba történt a kérdések lekérdezése során.');
    }
    res.status(200).json(results);
  });
});


// GET /api/get-fo_kategoriak?modulId=2
router.get('/api/get-fo_kategoriak', (req, res) => {
  const modulId = parseInt(req.query.modulId, 10);       // egyértelmű integer-cast

  // ① Validáció
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId!' });
  }

  // ② Lekérdezés
const sql = `
  SELECT DISTINCT k.fo_kategoria AS nev
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  ORDER BY k.fo_kategoria ASC
`;
db.query(sql, [modulId, modulId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB-hiba (fo_kategoriak)' });
    }
    res.json(rows);
  });
});


// GET /api/get-al_kategoriak?fo_kategoria_id=„Vezetés”&modulId=2
router.get('/api/get-al_kategoriak', (req, res) => {
  const { fo_kategoria_id, modulId: modulIdRaw } = req.query;
  const modulId = parseInt(modulIdRaw, 10);

  /* ① Validáció ------------------------------------------------------- */
  if (!fo_kategoria_id) {
    return res.status(400).json({ message: 'Hiányzó fo_kategoria_id!' });
  }
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId!' });
  }

  /* ② Lekérdezés ------------------------------------------------------ */
const sql = `
  SELECT DISTINCT k.al_kategoria AS nev
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE k.fo_kategoria = ?
    AND (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  ORDER BY k.al_kategoria ASC
`;
db.query(sql, [fo_kategoria_id, modulId, modulId], (err, rows) => {
    if (err) {
      console.error('DB-hiba (al_kategoriak):', err);
      return res.status(500).json({ message: 'Hiba a lekérdezés során.' });
    }
    res.json(rows);
  });
});


// GET /api/get-alt_temak?fo_kategoria_id=„Vezetés”&al_kategoria_id=„Motiváció”&modulId=2
router.get('/api/get-alt_temak', (req, res) => {
  const {
    fo_kategoria_id,
    al_kategoria_id,
    modulId: modulIdRaw
  } = req.query;
  const modulId = parseInt(modulIdRaw, 10);

  /* ① Validáció ------------------------------------------------------- */
  if (!fo_kategoria_id || !al_kategoria_id) {
    return res.status(400).json({ message: 'Hiányzó fo_kategoria_id vagy al_kategoria_id!' });
  }
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId!' });
  }

  /* ② Lekérdezés ------------------------------------------------------ */
const sql = `
  SELECT DISTINCT k.alt_tema AS nev
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE k.fo_kategoria = ?
    AND k.al_kategoria = ?
    AND (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  ORDER BY k.alt_tema ASC
`;
db.query(sql, [fo_kategoria_id, al_kategoria_id, modulId, modulId], (err, rows) => {
    if (err) {
      console.error('DB-hiba (alt_temak):', err);
      return res.status(500).json({ message: 'Hiba a lekérdezés során.' });
    }
    res.json(rows);
  });
});


// GET /api/get-kerdesek?fo_kategoria_id=…&al_kategoria_id=…&alt_tema_id=…&modulId=2
router.get('/api/get-kerdesek', (req, res) => {
  const {
    fo_kategoria_id,
    al_kategoria_id,
    alt_tema_id,
    modulId: modulIdRaw
  } = req.query;
  const modulId = parseInt(modulIdRaw, 10);

  /* ① Validáció ------------------------------------------------------- */
  if (!fo_kategoria_id || !al_kategoria_id || !alt_tema_id) {
    return res.status(400).json({ message: 'Hiányzó kategória-/téma-azonosító!' });
  }
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId!' });
  }

  /* ② Lekérdezés ------------------------------------------------------ */
const sql = `
  SELECT DISTINCT
    k.kindex, k.id,
    k.kerdes_szoveg AS szoveg,
    k.parent_id, k.valasz_ag,
    k.negalt_kerdes_szoveg,
    k.szoveges, k.ertek, k.negalt_ertek,
    k.kindex, k.ossz_ertek, k.maximalis_szint
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE k.fo_kategoria = ?
    AND k.al_kategoria = ?
    AND k.alt_tema     = ?
    AND k.parent_id IS NULL
    AND (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  ORDER BY k.kindex ASC
`;
db.query(sql, [fo_kategoria_id, al_kategoria_id, alt_tema_id, modulId, modulId],   // ⇐ 4 param / 4 kérdőjel
    (err, rows) => {
      if (err) {
        console.error('DB-hiba (főkérdések):', err);
        return res.status(500).json({ message: 'Hiba a lekérdezés során.' });
      }
      res.json(rows);
    }
  );
});


// GET /api/get-alkerdesek?parent_id=17&valasz_ag=nem&modulId=2
router.get('/api/get-alkerdesek', (req, res) => {
  const {
    parent_id,
    valasz_ag,
    modulId: modulIdRaw
  } = req.query;
  const modulId = parseInt(modulIdRaw, 10);

  /* ① Validáció ------------------------------------------------------ */
  if (!parent_id || !valasz_ag) {
    return res.status(400).json({ message: 'Hiányzó parent_id vagy valasz_ag!' });
  }
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId!' });
  }

  /* ② Lekérdezés ----------------------------------------------------- */
const sql = `
  SELECT
    k.kindex, k.id, k.kerdes_szoveg AS szoveg,
    k.parent_id, k.valasz_ag, k.negalt_kerdes_szoveg,
    k.szoveges, k.ertek, k.negalt_ertek,
    k.ossz_ertek, k.maximalis_szint
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE k.parent_id = ?
    AND k.valasz_ag = ?
    AND (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  ORDER BY k.kindex ASC
`;
db.query(sql, [parent_id, valasz_ag, modulId, modulId], (err, rows) => {
    if (err) {
      console.error('DB-hiba (alkerdesek):', err);
      return res.status(500).send('Hiba a lekérdezés során.');
    }
    res.json(rows);
  });
});

    

// POST /api/check-nem-ag-batch   { kerdesIds: [1,2,3], modulId: 2 }
router.post('/api/check-nem-ag-batch', (req, res) => {
  const { kerdesIds, modulId: modulIdRaw } = req.body;
  const modulId = parseInt(modulIdRaw, 10);

  /* ① Bemenet-validáció --------------------------------------------- */
  if (!Array.isArray(kerdesIds) || kerdesIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Nincsenek kérdés-ID-k!' });
  }
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás modulId!' });
  }

  /* ② Dinamikus placeholder-lista  ----------------------------------- */
  const placeholders = kerdesIds.map(() => '?').join(', ');

const sql = `
  SELECT k.parent_id, COUNT(*) AS count
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE k.parent_id IN (${placeholders})
    AND k.valasz_ag = "nem"
    AND (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  GROUP BY k.parent_id
`;
db.query(sql, [...kerdesIds, modulId, modulId], (err, rows) => {   // ⇐ kerdesIds + modulId
    if (err) {
      console.error('DB-hiba (check-nem-ag):', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
    }

    /* ④ Eredmény összeállítása -------------------------------------- */
    const hasNemAgMap = {};
    rows.forEach(r => { hasNemAgMap[r.parent_id] = r.count > 0; });

    res.json({ success: true, hasNemAgMap });
  });
});
router.get('/api/get-all-alkerdesek', (req, res) => {
  const modulId = parseInt(req.query.modulId, 10);

  /* ① Validáció ------------------------------------------------------- */
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ message: 'Hiányzó vagy hibás modulId!' });
  }

  /* ② Lekérdezés ------------------------------------------------------ */
const sql = `
  SELECT
    k.parent_id, k.id,
    k.kerdes_szoveg AS szoveg,
    k.valasz_ag, k.negalt_kerdes_szoveg,
    k.fo_kategoria, k.al_kategoria, k.alt_tema,
    k.szoveges, k.ertek, k.negalt_ertek,
    k.kindex, k.ossz_ertek, k.maximalis_szint
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  ORDER BY k.parent_id, k.kindex ASC
`;
db.query(sql, [modulId, modulId], (err, rows) => {          // ← paraméter-tömb
    if (err) {
      console.error('DB-hiba (all-alkerdesek):', err);
      return res.status(500).json({ message: 'Hiba a lekérdezés során.' });
    }

    /* ③ Csoportosítás parent_id szerint ------------------------------ */
    const alKerdesMap = {};
    rows.forEach(r => {
      (alKerdesMap[r.parent_id] ||= []).push(r);
    });

    res.json({ success: true, alKerdesMap });
  });
});
    
// POST /api/get-kerdesek-by-ids   { kerdesIds: [4, 7, 9], modulId: 2 }
router.post('/api/get-kerdesek-by-ids', (req, res) => {
  const { kerdesIds, modulId: modulIdRaw } = req.body;
  const modulId = parseInt(modulIdRaw, 10);

  /* ① Bemenet-ellenőrzés */
  if (!Array.isArray(kerdesIds) || kerdesIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Nincs megadva kérdésazonosító!' });
  }
  if (!Number.isInteger(modulId) || modulId <= 0) {
    return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás modulId!' });
  }

  /* ② Dinamikus placeholder-lista */
  const placeholders = kerdesIds.map(() => '?').join(', ');

const sql = `
  SELECT
    k.kindex, k.id,
    k.kerdes_szoveg AS szoveg,
    k.parent_id, k.valasz_ag, k.negalt_kerdes_szoveg,
    k.fo_kategoria, k.al_kategoria, k.alt_tema,
    k.szoveges, k.ertek, k.negalt_ertek,
    k.ossz_ertek, k.maximalis_szint
  FROM kerdesek k
  LEFT JOIN kozos z ON z.id = k.osztott
  WHERE k.id IN (${placeholders})
    AND (k.modul_id = ? OR (k.osztott IS NOT NULL AND z.modul_megosztott = ? AND k.modul_id = z.modul_megoszto))
  ORDER BY k.kindex ASC
`;
db.query(sql, [...kerdesIds, modulId, modulId],(err, rows) => {
    if (err) {
      console.error('DB-hiba (kerdesek-by-ids):', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
    }
    res.json({ success: true, kerdesek: rows });
  });
});

    return router;
}

module.exports = kerdoiv;
