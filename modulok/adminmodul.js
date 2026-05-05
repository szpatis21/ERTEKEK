// modulok/adminmodul.js
const express = require('express');
const fs      = require('fs');
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
  FROM kerdesek_kategoriaval
  WHERE modul_id = ?
    AND parent_id IS NULL
    AND fo_kategoria IS NOT NULL
    AND fo_kategoria != ''
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

  // Felhasználókra vonatkozó lekérdezések (EZ MOST MÁR CSAK EGYSZER SZEREPEL!)
 router.get('/users-by-module', async (req, res) => {
    const intId = Number(req.query.intId);

    if (!Number.isInteger(intId)) {
      return res.status(400).json({ success: false, message: 'Rossz paraméterek' });
    }

    function q(sql, params = []) {
      return new Promise((resolve, reject) =>
        db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
      );
    }

  try {
    // 0. LÉPÉS: Lekérjük a modulok szótárát a logok fordításához
      const sqlMods = 'SELECT id, leiras FROM modulok';
      const systemModules = await q(sqlMods);
      // 1. LÉPÉS: Kiszűrjük a felhasználókat int_id alapján
     const sqlUsers = `
        SELECT
          f.id, f.vez, f.mail, f.tel, f.regisztralt, f.ip_cim, f.user_agent, f.ai_ossz_max,
          r.id AS role_id, r.role AS role
        FROM felhasznalok f
        INNER JOIN roles r ON f.role_id = r.id       
        WHERE f.int_id = ?
        ORDER BY CASE WHEN r.id = 4 THEN 0 ELSE 1 END, r.role, f.vez;
      `;
      const users = await q(sqlUsers, [intId]);

      if (users.length === 0) return res.json({ success: true, users: [] });

      const userIds = users.map(u => u.id);
      const placeholders = userIds.map(() => '?').join(',');

      // ---> 1.5 LÉPÉS: Lekérjük, kinek milyen modulhoz van joga <---
      const sqlJogosultsagok = `
        SELECT j.user_id, m.leiras AS modul_nev
        FROM jogosultsagok j
        JOIN modulok m ON j.modul_id = m.id
        WHERE j.user_id IN (${placeholders})
      `;
      const jogosultsagok = await q(sqlJogosultsagok, [...userIds]);
      
      const modsByUser = {};
      jogosultsagok.forEach(j => {
        if (!modsByUser[j.user_id]) modsByUser[j.user_id] = [];
        modsByUser[j.user_id].push(j.modul_nev);
      });

    // 2. LÉPÉS: Végigiterálunk a kitoltesek táblán + hozzácsatoljuk a modul nevét
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
AND k.role IN ('admin', 'sysadmin')        ORDER BY k.letrehozva DESC

      `;
      const evals = await q(sqlEvals, [...userIds]);

      // 3. LÉPÉS: Megosztások lekérdezése... (VÁLTOZATLAN)
      const evalsIdk = evals.map(e => e.idk);
      let shares = [];
      
      if (evalsIdk.length > 0) {
        const idkPlaceholders = evalsIdk.map(() => '?').join(',');
        const sqlShares = `
          SELECT k.idk, f.vez AS kollega_neve
          FROM kitoltesek k
          JOIN felhasznalok f ON k.felhasznalo_id = f.id
          WHERE k.role = 'editor' AND k.idk IN (${idkPlaceholders})
        `;
        shares = await q(sqlShares, [...evalsIdk]);
      }
      
      const sharesByIdk = {};
      shares.forEach(s => {
        if (!sharesByIdk[s.idk]) sharesByIdk[s.idk] = [];
        sharesByIdk[s.idk].push(s.kollega_neve);
      });

      // 4. LÉPÉS: Tételesen hozzápárosítjuk a kitöltéseket a userekhez (Bővítve a modulnévvel)
      const evalsByUser = {};
      evals.forEach(e => {
        if (!evalsByUser[e.felhasznalo_id]) evalsByUser[e.felhasznalo_id] = [];
        
        let d = e.letrehozva;
        if (d instanceof Date) { d = d.toISOString().split('T')[0]; }
        else if (typeof d === 'string') { d = d.substring(0, 10); }

        const alanyNeve = e.vizsgalt_nev || 'Ismeretlen alany';
        const kitoltesNeve = e.kitoltes_neve || 'Névtelen értékelés';

        let aDatum = e.audit_datum;
        if (aDatum instanceof Date) {
            aDatum = aDatum.toISOString().replace('T', ' ').substring(0, 19);
        }

        evalsByUser[e.felhasznalo_id].push({
          id: e.id,          
          idk: e.idk,
          nev: `${alanyNeve} - ${kitoltesNeve}`,
          datum: d || 'Nincs dátum',
          megosztva: sharesByIdk[e.idk] || [],
          audit_datum: aDatum,
          audit_ip: e.audit_ip,
          audit_agent: e.audit_agent,
          modul_nev: e.modul_nev || 'Ismeretlen modul' // <-- ITT ADJUK HOZZÁ
        });
      });
// ... (Az eddigi 4. LÉPÉS kódja változatlan) ...

      // 5. LÉPÉS: Aktivitás log lekérése a felhasználókhoz
      let logs = [];
      if (userIds.length > 0) {
        const sqlLogs = `
          SELECT felhasznalo_id, letrehozva, tevekenyseg, reszletek
          FROM aktivitas_log
          WHERE felhasznalo_id IN (${placeholders})
          ORDER BY letrehozva DESC
        `;
        logs = await q(sqlLogs, [...userIds]);
      }

      const logsByUser = {};
      logs.forEach(l => {
        if (!logsByUser[l.felhasznalo_id]) logsByUser[l.felhasznalo_id] = [];
        
        let d = l.letrehozva;
        if (d instanceof Date) { 
            d = d.toISOString().replace('T', ' ').substring(0, 19); 
        }

        logsByUser[l.felhasznalo_id].push({
          datum: d,
          tevekenyseg: l.tevekenyseg,
          reszletek: l.reszletek
        });
      });

      // Beletesszük a végső JSON-be
      users.forEach(u => {
        u.ertekelesek = evalsByUser[u.id] || [];
        u.kitoltes_db = u.ertekelesek.length; 
        u.modulok = modsByUser[u.id] || []; 
        u.logs = logsByUser[u.id] || []; 
      });

res.json({ success: true, users: users, modules: systemModules });
    } catch (err) {
      console.error('SQL hiba (/users-by-module):', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
    }
  });
      // Beletesszük a végső JSON-be
   
// Felhasználó adatainak, jogkörének és AI kvótájának frissítése
// Felhasználó adatainak, jogkörének, AI kvótájának és MODULJAINAK frissítése
  router.patch('/update-user', async (req, res) => {
    const { id, vez, mail, tel, role, ai_ossz_max, modulIds } = req.body;

    if (!Number.isInteger(id) || !vez || !role) {
      return res.status(400).json({ success: false, message: 'Hiányzó kötelező adatok (Név vagy Szerepkör)' });
    }

    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();

      // 1. Megkeressük a szerepkör ID-ját
      const [roleRows] = await connection.query('SELECT id FROM roles WHERE role = ? LIMIT 1', [role]);
      if (roleRows.length === 0) {
        throw new Error('Ismeretlen szerepkör');
      }
      const roleId = roleRows[0].id;
      
      // 2. Frissítjük a felhasználó alapadatait a felhasznalok táblában
      const updateSql = 'UPDATE felhasznalok SET vez = ?, mail = ?, tel = ?, role_id = ?, ai_ossz_max = ? WHERE id = ?';
      const aiValue = ai_ossz_max ? parseInt(ai_ossz_max, 10) : 0;
      await connection.query(updateSql, [vez, mail, tel, roleId, aiValue, id]);

      // 3. JOGOSULTSÁGOK FRISSÍTÉSE (Modulok)
      // Először töröljük a felhasználó eddigi összes modulját
      await connection.query('DELETE FROM jogosultsagok WHERE user_id = ?', [id]);

      // Ha vannak új modulok kijelölve, beszúrjuk őket
      if (Array.isArray(modulIds) && modulIds.length > 0) {
        const values = modulIds.map(mId => [id, parseInt(mId, 10), 1]); // Az '1' az aktiv oszlop
        await connection.query('INSERT INTO jogosultsagok (user_id, modul_id, aktiv) VALUES ?', [values]);
      }

      await connection.commit();
      res.json({ success: true, message: 'Felhasználó sikeresen frissítve!' });

    } catch (err) {
      await connection.rollback();
      console.error('Felhasználó update hiba:', err);
      res.status(500).json({ success: false, message: 'Mentési hiba a szerveren' });
    } finally {
      connection.release();
    }
  });
// Intézmények lekérése az admin felülethez
  router.get('/institutions', (req, res) => {
    const sql = 'SELECT id, intnev FROM intezmeny ORDER BY intnev ASC';
    db.query(sql, [], (err, result) => {
      if (err) {
        console.error('SQL hiba (/institutions):', err.code, err.sqlMessage);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba az intézmények betöltésekor' });
      }
      res.json({ success: true, data: result });
    });
  });
router.get('/api/admin-logs', async (req, res) => {
    // 🔒 BIZTONSÁG: Itt érdemes ellenőrizni, hogy a lekérő tényleg Admin-e!
    // Például, ha használtok sessiont: if (req.session.roleId !== 1) return res.status(403).json({success: false});

    try {
const logPath = path.join(__dirname, '../logi/minden_log.txt');        let systemLogs = [];
        
        if (fs.existsSync(logPath)) {
            const logContent = fs.readFileSync(logPath, 'utf8');
            systemLogs = logContent.split('\n')
                .filter(line => line.trim() !== '')
                .reverse()
                .slice(0, 100); 
        }

        // --- 2. MySQL aktivitás log lekérdezése ---
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
        
        // Cseréld a "db.query"-t arra, ahogy a te kódod futtatja az SQL-t (pl. db.execute)
const [activityRows] = await db.promise().query(sql);
        // --- 3. Válasz küldése ---
        res.json({
            success: true,
            systemLogs: systemLogs,
            activityLogs: activityRows
        });

    } catch (error) {
        console.error('Hiba az admin logok lekérésekor:', error);
        res.status(500).json({ success: false, message: 'Hiba a szerveren.' });
    }
});
// Értékelés (kitöltés) végleges törlése az admin felületről
  router.delete('/delete-kitoltes', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Hiányzó kitoltes_id!' });
    }

    // Segédfüggvény a szinkron-jellegű SQL futtatáshoz (ugyanaz, mint a delete-user-nél)
    const queryAsync = (sql, params) => {
        return new Promise((resolve, reject) => {
            db.query(sql, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    };

    try {
        // 1. Megkeressük az idk-t (az azonosítót, ami összefogja a megosztásokat)
        const rows = await queryAsync('SELECT idk FROM kitoltesek WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kitöltés nem található!' });
        }
        
        const idk = rows[0].idk;

        // 2. Először töröljük a válaszokat, amelyek ehhez az idk-hoz tartoznak
        await queryAsync('DELETE FROM valaszok WHERE kitoltes_id IN (SELECT id FROM kitoltesek WHERE idk = ?)', [idk]);

        // 3. Ezután töröljük a kitöltéseket (az eredetit és az összes megosztott példányt is)
        const deleteRes = await queryAsync('DELETE FROM kitoltesek WHERE idk = ?', [idk]);

        if (deleteRes.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Nincs törölhető rekord!' });
        }

        res.json({ success: true, message: 'Sikeres törlés!' });

    } catch (err) {
        console.error('Adatbázis hiba a kitöltés törlése során:', err);
        res.status(500).json({ success: false, message: 'Adatbázis hiba a törlés során' });
    }
  });
// Intézmény részletes adatainak lekérése
// Intézmény részletes adatainak lekérése
  router.get('/institution-details', async (req, res) => {
    const intId = Number(req.query.id);

    if (!Number.isInteger(intId)) {
      return res.status(400).json({ success: false, message: 'Érvénytelen intézmény ID' });
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
      data.intmod_nevek = data.intmod; // Alapértelmezésként megkapja a számokat

      // Ha van megadva modul (pl. "3,1,2"), akkor átváltjuk őket a leírásokra
      if (data.intmod && data.intmod.trim() !== '') {
        const modIds = data.intmod.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        
        if (modIds.length > 0) {
          const [modRows] = await db.promise().query(`SELECT id, leiras FROM modulok WHERE id IN (?)`, [modIds]);
          
          const descMap = {};
          modRows.forEach(m => descMap[m.id] = m.leiras);
          
          // Eredeti sorrend megtartása, és az azonosítók szövegre cserélése
          const nevek = modIds.map(id => descMap[id] || `Ismeretlen modul (${id})`);
          data.intmod_nevek = nevek.join(', ');
        }
      }

      res.json({ success: true, data: data });

    } catch (err) {
      console.error('SQL hiba (/institution-details):', err);
      return res.status(500).json({ success: false, message: 'Adatbázis hiba az intézmény adatainak lekérésekor' });
    }
  });
  // Összes szakmai modul lekérése (A chipekhez és a választó menühöz)
  router.get('/api/all-modules', (req, res) => {
    const sql = 'SELECT id, leiras FROM modulok ORDER BY leiras ASC';
    db.query(sql, [], (err, rows) => {
      if (err) {
        console.error('SQL hiba (/api/all-modules):', err);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
      }
      res.json({ success: true, data: rows });
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
  FROM kerdesek_kategoriaval
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

// Intézmény és minden hozzá tartozó adat (felhasználók, értékelések) végleges törlése
// Intézmény és minden hozzá tartozó adat (felhasználók, értékelések, megosztások) végleges törlése
  router.delete('/delete-institution', async (req, res) => {
    const intId = Number(req.body.id);

    if (!Number.isInteger(intId)) {
      return res.status(400).json({ success: false, message: 'Érvénytelen intézmény ID' });
    }

    // Kapcsolat lekérése a tranzakcióhoz (hogy ha hiba van, vissza lehessen vonni)
    const connection = await db.promise().getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Kikeresni az intézményhez tartozó felhasználókat
      const [users] = await connection.query('SELECT id FROM felhasznalok WHERE int_id = ?', [intId]);
      const userIds = users.map(u => u.id);

      if (userIds.length > 0) {
        // 2. Kikeressük azokat az idk-kat, amiknek az intézmény dolgozói az EREDETI gazdái (adminok)
        // Kiemelten fontos: így nem törlünk ki olyan értékeléseket, amit csak megosztottak velük!
const [ownedKits] = await connection.query(`SELECT idk FROM kitoltesek WHERE felhasznalo_id IN (?) AND role IN ('admin', 'sysadmin')`, [userIds]);        const idkList = ownedKits.map(k => k.idk);

        if (idkList.length > 0) {
            // 3. Töröljük a válaszokat, amik ezekhez az idk-khoz (értékelésekhez) tartoznak
            await connection.query(`DELETE FROM valaszok WHERE kitoltes_id IN (SELECT id FROM kitoltesek WHERE idk IN (?))`, [idkList]);
            
            // 4. Töröljük a teljes kitöltéseket (az intézmény eredeti értékelései + amiket külsősöknek megosztottak, azok is ugranak)
            await connection.query(`DELETE FROM kitoltesek WHERE idk IN (?)`, [idkList]);
        }

        // 5. Töröljük azokat a megosztásokat, amiket ŐK kaptak MÁSOKTÓL (ahol ők csak editorok)
        await connection.query(`DELETE FROM kitoltesek WHERE felhasznalo_id IN (?)`, [userIds]);

        // 6. Töröljük a felhasználók jogosultságait és az aktivitás logjukat
        await connection.query(`DELETE FROM jogosultsagok WHERE user_id IN (?)`, [userIds]);
        await connection.query(`DELETE FROM aktivitas_log WHERE felhasznalo_id IN (?)`, [userIds]);
        
        // 7. Töröljük a felhasználókat
        await connection.query(`DELETE FROM felhasznalok WHERE int_id = ?`, [intId]);
      }

      // 8. Végül magát az intézményt is töröljük
      await connection.query(`DELETE FROM intezmeny WHERE id = ?`, [intId]);

      // Ha minden sikeres, véglegesítjük a tranzakciót
      await connection.commit();
      res.json({ success: true });

    } catch (error) {
      // Hiba esetén mindent visszacsinálunk az eredeti állapotra
      await connection.rollback();
      console.error('Hiba az intézmény törlésekor:', error);
      res.status(500).json({ success: false, message: 'Szerver hiba a törlés során.' });
    } finally {
      // Elengedjük a kapcsolatot
      connection.release();
    }
  });
  // Egyedi felhasználó törlése az admin felületről (Kaszkádolt törlés)
  router.delete('/delete-user', async (req, res) => {
    const userId = Number(req.body.userId);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Érvénytelen felhasználó ID' });
    }

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
const rows = await queryAsync("SELECT idk FROM kitoltesek WHERE felhasznalo_id = ? AND role IN ('admin', 'sysadmin')", [userId]);
        const idkList = rows.map(r => r.idk);

        // 2. SORBARENDI TÖRLÉSEK
        if (idkList.length > 0) {
            // A) Először a válaszokat töröljük, ami ezekhez az idk-khoz tartozik
            await queryAsync("DELETE FROM valaszok WHERE kitoltes_id IN (SELECT id FROM kitoltesek WHERE idk IN (?))", [idkList]);
            
            // B) Aztán töröljük magukat a megosztott és saját kitöltéseket
            await queryAsync("DELETE FROM kitoltesek WHERE idk IN (?)", [idkList]);
        }

        // C) Töröljük azokat a kitöltéseket is, amiket csak VELE osztottak meg
        await queryAsync("DELETE FROM kitoltesek WHERE felhasznalo_id = ?", [userId]);

        // D) Jogosultságok és aktivitás log eltávolítása
        await queryAsync("DELETE FROM jogosultsagok WHERE user_id = ?", [userId]);
        await queryAsync("DELETE FROM aktivitas_log WHERE felhasznalo_id = ?", [userId]);

        // E) Végül a felhasználó kilövése a rendszerből
        await queryAsync("DELETE FROM felhasznalok WHERE id = ?", [userId]);

        res.json({ success: true });

    } catch (err) {
        console.error("Felhasználó kaszkád törlési hiba:", err);
        res.status(500).json({ success: false, message: 'Adatbázis hiba a törlés során' });
    }
  });
  // Intézmény adatainak frissítése (Szerkesztés)
  router.patch('/update-institution', (req, res) => {
    const {
      id, intnev, intado, intkapvez, intkapmail, fizetve,
      ip_cim, user_agent, intmail, inttel, intor, intir,
      intszek, intcim, intmod, idoszak, intfin, intfo
    } = req.body;

    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ success: false, message: 'Érvénytelen intézmény ID' });
    }

    const sql = `
      UPDATE intezmeny 
      SET intnev = ?, intado = ?, intkapvez = ?, intkapmail = ?, fizetve = ?, 
          ip_cim = ?, user_agent = ?, intmail = ?, inttel = ?, intor = ?, 
          intir = ?, intszek = ?, intcim = ?, intmod = ?, idoszak = ?, 
          intfin = ?, intfo = ?
      WHERE id = ?
    `;

    // Segédfüggvény: ha üres a string, legyen SQL NULL, hogy ne fagyjon le a dátum mező
    const dateOrNull = (val) => (val && val.trim() !== '') ? val : null;

    const values = [
      intnev, intado, intkapvez, intkapmail, dateOrNull(fizetve),
      ip_cim, user_agent, intmail, inttel, intor,
      intir, intszek, intcim, intmod, idoszak,
      dateOrNull(intfin), intfo, 
      id // WHERE id = ?
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('SQL hiba (/update-institution):', err.code, err.sqlMessage);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba a mentés során' });
      }
      res.json({ success: true });
    });
  });
  
  return router;
};