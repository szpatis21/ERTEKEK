const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

module.exports = (db) => {

  function q(sql, params = []) {
    return new Promise((resolve, reject) =>
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    );
  }
  //Bejelentkezési útvonal
router.post('/login', async (req, res) => {
  try {
    const { fnev, pass, modul_id, szerepkor } = req.body;

    const mod = Number(modul_id);
    const requestedRoleId = Number(szerepkor);

    if (!Number.isInteger(mod) || mod < 1) {
      return res.json({ success: false, message: 'Érvénytelen modul-azonosító' });
    }

    if (!Number.isInteger(requestedRoleId) || requestedRoleId < 1) {
      return res.json({ success: false, message: 'Érvénytelen szerepkör-azonosító' });
    }

    const users = await q('SELECT * FROM felhasznalok WHERE fnev = ?', [fnev]);
    if (users.length === 0) {
      return res.json({ success: false, message: 'Hibás felhasználónév vagy jelszó' });
    }
    const user = users[0];

    const pwOk = await bcrypt.compare(pass, user.pass);
    if (!pwOk) {
      return res.json({ success: false, message: 'Hibás felhasználónév vagy jelszó' });
    }

    // Admin (role_id = 1) bármilyen szerepkörrel beléphet, mások csak a sajátjukkal
    if (user.role_id !== 1 && user.role_id !== requestedRoleId) {
      return res.json({
        success: false,
        message: 'Nincs jogosultságod ezzel a szerepkörrel belépni'
      });
    }

    // Jogosultság lekérdezése (modulhoz kötötten)
    const perms = await q(
      `SELECT 1
         FROM jogosultsagok
        WHERE user_id  = ?
          AND modul_id = ?
          AND aktiv    = 1
        LIMIT 1`,
      [user.id, mod]
    );

    if (perms.length === 0) {
      return res.json({
        success: false,
        message: 'Nincs jogosultságod a kiválasztott témakörhöz'
      });
    }

    req.session.userId = user.id;
    req.session.modulId = mod;
    req.session.roleId = requestedRoleId;  

    // Admin mindig admin marad
    req.session.isAdmin = (user.role_id === 1);

    // Redirect a választott szerepkör alapján
    switch (requestedRoleId) {
      case 1:
        return res.json({ success: true, redirect: '/admin/dashboard.html' });
      case 2:
        return res.json({ success: true, redirect: '/elemzo/dashboard.html' });
      case 3:
        return res.json({ success: true, redirect: '/user/dashboard.html' });
      default:
        return res.json({ success: false, message: 'Ismeretlen szerepkör' });
    }

  } catch (err) {
    console.error('Bejelentkezési hiba:', err);
    return res.json({ success: false, message: 'Belső szerverhiba történt' });
  }
});



// Felhasználó név lekérdezése
router.get('/get-username', (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: 'Nem vagy bejelentkezve' });
  }

  // ÚJ: Kiolvassuk a sessionből a JELENLEGI (átjelentkezett) szerepkört
  const currentRoleId = req.session.roleId || null;

  // MÓDOSÍTOTT SQL: Az r.id-t most a sessionhöz kötjük (vagy alapértelmezetten a f.role_id-hez)
  const sqlUser = `
    SELECT f.id, f.fnev, f.vez, f.int_id,f.tel, f.mail,
           i.intnev,
           i.intfin,
           i.fizetve,
           r.role, 
           r.leiras
    FROM felhasznalok f
    LEFT JOIN intezmeny i ON f.int_id = i.id
    LEFT JOIN roles r     ON r.id = COALESCE(?, f.role_id)
    WHERE f.id = ?;
  `;

  db.query(sqlUser, [currentRoleId, req.session.userId], (err, userRows) => {
    if (err) return res.json({ success: false, message: 'Adatbázis hiba történt' });
    if (userRows.length === 0) return res.json({ success: false, message: 'Felhasználó nem található' });

    const user = userRows[0];
    const modulId = req.session.modulId || null;

    // 1) hozzáférhető modulok lekérése
    const sqlModsOnly = `
      SELECT m.id, m.nev, m.leiras
      FROM jogosultsagok j
      JOIN modulok m ON m.id = j.modul_id
      WHERE j.user_id = ? AND j.aktiv = 1
    `;
    const sqlModsWithCurrent = `
      SELECT m.id, m.nev, m.leiras
      FROM modulok m
      WHERE m.id = ?
      UNION
      SELECT m.id, m.nev, m.leiras
      FROM jogosultsagok j
      JOIN modulok m ON m.id = j.modul_id
      WHERE j.user_id = ? AND j.aktiv = 1
    `;

    const modsQuery   = modulId ? sqlModsWithCurrent : sqlModsOnly;
    const modsParams  = modulId ? [modulId, user.id] : [user.id];

    db.query(modsQuery, modsParams, (err3, modList) => {
      if (err3) return res.json({ success: false, message: 'Adatbázis hiba történt' });

      // 2) ha van aktuális modulId, meta kiolvasása (név, leírás)
      if (!modulId) {
        return res.json({
          success: true,
          ...formatUser(user),
          modulId: null,
          modulNev: null,
          modulLeiras: null,
          role: user.role ?? null,
          leiras: user.leiras ?? null,
          hozzaferhetoModulok: modList 
        });
      }

      db.query('SELECT nev, leiras FROM modulok WHERE id = ?', [modulId], (err2, modRows) => {
        if (err2) return res.json({ success: false, message: 'Adatbázis hiba történt' });

        const modulNev    = modRows[0]?.nev    || 'Ismeretlen modul';
        const modulLeiras = modRows[0]?.leiras || null;

        return res.json({
          success: true,
          ...formatUser(user),
          modulId,
          modulNev,
          modulLeiras,
          role: user.role ?? null,
          leiras: user.leiras ?? null,
          hozzaferesModulok: modList 
        });
      });
    });
  });
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
    role: u.role || 'Nincs szerepkör', // ÚJ: a szerepkör neve
    leiras: u.leiras || ''     // ÚJ: a szerepkör leírása
  };
}
// server/routes/user.js


    //Intézmény visszaadása
  router.get('/get-users-by-institution', (req, res) => {
  const intezmenyId = req.query.intezmeny_id;
  const modulId     = req.query.modul_id;

  if (!intezmenyId || !modulId) {
    return res.json({ success: false, message: 'Hiányzó intézmény ID vagy modul ID' });
  }

  const query = `
    SELECT f.id, f.vez, f.mail
    FROM felhasznalok f
    INNER JOIN jogosultsagok j ON f.id = j.user_id
    WHERE f.int_id = ? AND j.modul_id = ?
  `;

  db.query(query, [intezmenyId, modulId], (err, results) => {
    if (err) {
      console.error('Adatbázis hiba:', err);
      return res.json({ success: false, message: 'Adatbázis hiba történt' });
    }

    if (results.length === 0) {
      return res.json({ success: false, message: 'Nincs jogosult felhasználó az intézményben' });
    }

    return res.json({
      success: true,
      users: results
    });
  });
});

    //Mail cím alapján felhasználó visszadása
router.get('/check-mailname2', (req, res) => {
    const mailname = req.query.mailname;
    const modulId = req.query.modul_id;  // új: modul azonosító

    if (!mailname || !modulId) {
        return res.json({ success: false, message: 'Hiányzó e-mail vagy modul ID' });
    }

    const query = `
        SELECT f.id, f.vez
        FROM felhasznalok f
        INNER JOIN jogosultsagok j ON f.id = j.user_id  -- vagy a helyes oszlopnév!
        WHERE f.mail = ? AND j.modul_id = ?
        LIMIT 1
    `;

    db.query(query, [mailname, modulId], (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.json({ success: false, message: 'Adatbázis hiba történt' });
        }

        if (results.length === 0) {
            return res.json({
                success: false,
                exists: false,
                message: 'Nincs ilyen e-mail, vagy nincs jogosultsága a modulhoz'
            });
        }

        return res.json({
            success: true,
            exists: true,
            id: results[0].id,
            vez: results[0].vez
        });
    });
});

    //Már megosztott felhasználük betöltése
    router.get('/get_shared_users', (req, res) => {
        const { idk } = req.query;
    
        if (!idk) {
            return res.status(400).json({ success: false, message: 'Hiányzó idk paraméter!' });
        }
    
        const query = `
            SELECT k.felhasznalo_id AS id, k.role, f.vez AS fullname
            FROM kitoltesek k
            JOIN felhasznalok f ON k.felhasznalo_id = f.id
            WHERE k.idk = ?`;
    
        db.query(query, [idk], (err, results) => {
            if (err) {
                console.error("Adatbázis hiba:", err);
                return res.status(500).json({ success: false, message: 'Adatbázis hiba történt!' });
            }
    
            res.json(results);
        });
    });
 router.post('/delete_role', (req, res) => {
  const { felhasznalo_id, idk } = req.body;

  if (!felhasznalo_id || !idk) {
    return res.status(400).json({ success: false, message: "Hiányzó adatok!" });
  }

  // Új szerepkör neve – tetszőleges, a frontenden majd szűrsz rá
  const újRole = 'removed';

  const query = `
    UPDATE kitoltesek
       SET role = ?
     WHERE felhasznalo_id = ?
       AND idk = ?
  `;
  db.query(query, [újRole, felhasznalo_id, idk], (err, results) => {
    if (err) {
      console.error("Adatbázis hiba:", err);
      return res.status(500).json({ success: false, message: "Adatbázis hiba történt!" });
    }
    res.json({ success: true });
  });
});
// --- ÚJ: Átjelentkezési információk lekérése ---
    router.get('/switch-info', async (req, res) => {
        if (!req.session.userId) return res.json({ success: false, message: 'Nem vagy bejelentkezve' });

        try {
            // Megnézzük a tényleges (eredeti) szerepkörét az adatbázisban
            const userRes = await q('SELECT role_id FROM felhasznalok WHERE id = ?', [req.session.userId]);
            if (userRes.length === 0) return res.json({ success: false, message: 'Felhasználó nem található' });

            const actualRoleId = userRes[0].role_id;
            const currentModulId = req.session.modulId;
            const currentRoleId = req.session.roleId;

            // 1. Szerepkörök kigyűjtése
            let roles = [];
            if (actualRoleId === 1) {
                // Az admin (1) bármilyen szerepkörbe átmehet
                roles = [
                    { id: 1, nev: 'Adminisztrátor' },
                    { id: 2, nev: 'Elemző' },
                    { id: 3, nev: 'Értékelő' }
                ];
            } else {
                // A többiek csak a saját, egyetlen szerepkörüket látják
                const rData = await q('SELECT id, leiras as nev FROM roles WHERE id = ?', [actualRoleId]);
                roles = rData.map(r => ({ id: r.id, nev: r.nev }));
            }

            // 2. Modulok kigyűjtése
    const modData = await q(`
                SELECT m.id, m.nev, m.leiras 
                FROM jogosultsagok j
                JOIN modulok m ON m.id = j.modul_id
                WHERE j.user_id = ? AND j.aktiv = 1
            `, [req.session.userId]);

            return res.json({
                success: true,
                currentRoleId,
                currentModulId,
                roles,
                modules: modData
            });

        } catch (err) {
            console.error('Hiba a switch-info lekérésekor:', err);
            return res.json({ success: false, message: 'Adatbázis hiba történt' });
        }
    });

// --- ÚJ: Átjelentkezés végrehajtása ---
    router.post('/switch-execute', async (req, res) => {
        if (!req.session.userId) return res.json({ success: false, message: 'Nem vagy bejelentkezve!' });

        const newModulId = Number(req.body.modul_id);
        const newRoleId = Number(req.body.szerepkor);

        try {
            const userRes = await q('SELECT role_id FROM felhasznalok WHERE id = ?', [req.session.userId]);
            if (userRes.length === 0) return res.json({ success: false, message: 'Felhasználó nem található' });

            const actualRoleId = userRes[0].role_id;

            // Szerepkör ellenőrzés
            if (actualRoleId !== 1 && actualRoleId !== newRoleId) {
                return res.json({ success: false, message: 'Nincs jogosultságod ehhez a szerepkörhöz!' });
            }

            // Modul ellenőrzés
            const perms = await q('SELECT 1 FROM jogosultsagok WHERE user_id = ? AND modul_id = ? AND aktiv = 1', [req.session.userId, newModulId]);
            if (perms.length === 0) {
                return res.json({ success: false, message: 'Nincs jogosultságod a választott modulhoz!' });
            }

            // Session frissítése új jelszókérés nélkül!
            req.session.modulId = newModulId;
            req.session.roleId = newRoleId;

            // Újrairányítás a választott szerepkör alapján
            let redirect = '/user/dashboard.html';
            if (newRoleId === 1) redirect = '/admin/dashboard.html';
            if (newRoleId === 2) redirect = '/elemzo/dashboard.html';

            // KÖTELEZŐ: Meg kell várnunk a session tényleges fizikai mentését a memóriába/adatbázisba!
            req.session.save((err) => {
                if (err) {
                    console.error('Session mentési hiba:', err);
                    return res.json({ success: false, message: 'Szerverhiba a munkamenet mentésekor!' });
                }
                // Csak akkor válaszolunk a frontendnek, ha sikeresen elmentődött a váltás!
                return res.json({ success: true, redirect });
            });

        } catch (err) {
            console.error('Hiba a váltáskor:', err);
            return res.json({ success: false, message: 'Szerverhiba történt a váltás közben' });
        }
    });
    return router;
};
