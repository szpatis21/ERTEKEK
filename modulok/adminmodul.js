// modulok/adminmodul.js
const express = require('express');
const fs      = require('fs');          // <-- ezek hiányoztak
const path    = require('path');

module.exports = function(db) {
  const router = express.Router();

// Kérdésekre vonatkozó lekérdezések
router.get('/fo-szam', (req, res) => {
  const modulId = Number(req.query.modulId);
  
  if (!Number.isInteger(modulId)) {
    console.error('modulId invalid:', req.query.modulId);
    return res.status(400).json({ success: false, message: 'Rossz modulId' });
  }

  const sql = `
    SELECT fo_kategoria AS category, COUNT(*) AS questions_count
    FROM kerdesek
    WHERE modul_id = ? AND parent_id IS NULL
    GROUP BY fo_kategoria;
  `;

  db.query(sql, [modulId], (err, result) => {
    if (err) {
      console.error('SQL hiba:', err.code, err.sqlMessage);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
    }
    res.json({ success: true, data: result });
  });
});

//Felhasználókra vonatkozó lekérdezések:
router.get('/users-by-module', (req, res) => {
  const modulId = Number(req.query.modulId);
  const intId   = Number(req.query.intId);

  if (!Number.isInteger(modulId) || !Number.isInteger(intId)) {
    console.error('modulId/intId invalid:', req.query);
    return res.status(400).json({ success: false, message: 'Rossz paraméterek' });
  }

const sql = `
  SELECT
    f.id,
    f.vez,
    f.mail,
    f.tel,
    r.id          AS role_id,      
    r.role        AS role,
    COUNT(k.id)   AS kitoltes_db
  FROM felhasznalok   f
  INNER JOIN jogosultsagok j ON f.id      = j.user_id
  INNER JOIN roles         r ON f.role_id = r.id       
  LEFT  JOIN kitoltesek    k ON f.id      = k.felhasznalo_id
  WHERE f.int_id   = ?
    AND j.modul_id = ?
  GROUP BY f.id
  /* unassigned (id=4) jöjjön legelőre, aztán ABC */
  ORDER BY
    CASE WHEN r.id = 4 THEN 0 ELSE 1 END,
    r.role,
    f.vez;
`;


  db.query(sql, [intId, modulId], (err, results) => {
    if (err) {
      console.error('SQL hiba:', err.code, err.sqlMessage);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
    }
    res.json({ success: true, users: results });
  });
});


router.patch('/update-user-role', (req, res) => {
  const { userId, newRole } = req.body;

  if (!Number.isInteger(userId) || typeof newRole !== 'string') {
    return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás adatok' });
  }

  const getRoleIdSql = 'SELECT id FROM roles WHERE role = ? LIMIT 1';
  db.query(getRoleIdSql, [newRole], (err, rows) => {
    if (err) {
      console.error('Role lekérdezés hiba:', err.code, err.sqlMessage);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
    }

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Ismeretlen szerepkör' });
    }

    const roleId = rows[0].id;
    const updateSql = 'UPDATE felhasznalok SET role_id = ? WHERE id = ?';

    db.query(updateSql, [roleId, userId], (err2) => {
      if (err2) {
        console.error('Update hiba:', err2.code, err2.sqlMessage);
        return res.status(500).json({ success: false, message: 'Mentési hiba' });
      }

      res.json({ success: true });
    });
  });
});
// Főkategória → alkategóriák → altémák + rögzített kérdések (parent_id = 0 vagy NULL) száma
router.get('/agak', (req, res) => {
  const modulId = Number(req.query.modulId);
  const fo = (req.query.fo || '').trim();

  if (!Number.isInteger(modulId) || !fo) {
    return res.status(400).json({ success: false, message: 'Rossz paraméterek' });
  }

  const sql = `
    SELECT 
      al_kategoria,
      alt_tema,
      COUNT(*) AS rogzitett_db
    FROM kerdesek
    WHERE modul_id = ?
      AND fo_kategoria = ?
      AND (parent_id IS NULL OR parent_id = 0)
    GROUP BY al_kategoria, alt_tema
    ORDER BY al_kategoria, alt_tema;
  `;
  db.query(sql, [modulId, fo], (err, rows) => {
    if (err) {
      console.error('SQL hiba:', err.code, err.sqlMessage);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
    }

    // Fésült, könnyen kirajzolható struktúra
    const nested = new Map();
    for (const r of rows) {
      const ak = r.al_kategoria || '(nincs alkategória)';
      const at = r.alt_tema || '(nincs altéma)';
      if (!nested.has(ak)) nested.set(ak, []);
      nested.get(ak).push({ alt_tema: at, rogzitett_db: Number(r.rogzitett_db) });
    }

    const data = [...nested.entries()].map(([al_kategoria, alt_temak]) => ({
      al_kategoria, alt_temak
    }));

    res.json({ success: true, data });
  });
});
router.post('/update-temakor', (req, res) => {
  const { modulId, eredetiNev, ujNev, leiras, szin, chart } = req.body;

  // Gyors validálás
  if (!Number.isInteger(modulId) || !eredetiNev) {
    return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás adatok' });
  }

  try {
const file = path.join(__dirname, '..', 'httpdocs', 'private', 'info', 'temakorok.json');
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));

    const set = json.optionSets?.[String(modulId)];
    if (!Array.isArray(set)) {
      return res.status(400).json({ success: false, message: 'Érvénytelen modulId' });
    }

    const item = set.find(o => (o.value || o.text) === eredetiNev);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Nincs ilyen témakör' });
    }

    // Frissítjük a mezőket
    item.value  = ujNev;
    item.text   = ujNev;
    item.leiras = leiras;
    item.szin   = szin;
    item.chart  = chart;

    fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
    res.json({ success: true });
  } catch (e) {
    console.error('temakor write error:', e);
    res.status(500).json({ success: false, message: 'Szerver-hiba írás közben' });
  }
});

router.post('/add-temakor', (req, res) => {
  const { modulId, nev, leiras, szin, chart } = req.body;
  if (!modulId || !nev) {
    return res.json({ success:false, message:'Hiányzó adatok.' });
  }

  const file  = path.join(__dirname,'..','httpdocs','private','info','temakorok.json');
  const json  = JSON.parse(fs.readFileSync(file,'utf8'));
  const set   = json.optionSets[String(modulId)] || [];

  /* 1) névütközés szerver-oldalon is */
  if (set.some(o => (o.value||o.text) === nev)) {
    return res.json({ success:false, message:'Már létezik ilyen főkategória.' });
  }

  /* 2) új rekord beillesztése a lista végére */
  set.push({
    value : nev,
    text  : nev,
    leiras: leiras,
    szin  : szin,
    chart : chart
  });
  json.optionSets[String(modulId)] = set;

  fs.writeFileSync(file, JSON.stringify(json,null,2),'utf8');
  res.json({ success:true });
});


  return router;
};
