const express = require('express');
const router = express.Router();

module.exports = (db) => {
// ÚJ VÉGPONT: Kiterjesztett /api/user-brief statisztikákkal
function q(sql, params = []) {
    return new Promise((resolve, reject) =>
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    );
  }
router.get('/api/user-brief', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: 'Nincs bejelentkezve' });
  }

  const userId = req.session.userId;
  const modulId = req.session.modulId;
  const roleId = req.session.roleId;  

 if (!modulId) {
    return res.json({ success: false, message: 'Nincs modul kiválasztva!' });
  }

  // ÚJ: Szövegesítjük a belépési szerepkört
  let aktualisSzerepNeve = 'Értékelő';
  if (roleId === 1) aktualisSzerepNeve = 'Admini modul';
  else if (roleId === 2) aktualisSzerepNeve = 'Elemző modul';
  else if (roleId === 3) aktualisSzerepNeve = 'Értékelő modul';

  try {
    // 1. Alapadatok, Intézmény, Szerepkör és Modulok
    const sqlUser = `
      SELECT 
          f.int_id, f.fnev AS username, f.vez AS fullname, f.mail, f.tel,
          i.fizetve, i.intfin, i.intnev, i.intkapmail,
          r.leiras AS role_leiras,
          m.id AS modul_id, m.nev AS modul_nev, m.leiras AS modul_leiras
      FROM felhasznalok f
      LEFT JOIN intezmeny i ON f.int_id = i.id
      LEFT JOIN roles r ON f.role_id = r.id
      LEFT JOIN jogosultsagok j ON f.id = j.user_id
      LEFT JOIN modulok m ON j.modul_id = m.id
      WHERE f.id = ?
    `;
 const userRows = await q(sqlUser, [userId]);
    if (userRows.length === 0) return res.json({ success: false, message: 'Felhasználó nem található' });

    // --- JAVÍTÁS KEZDŐDIK ---
    // Megkeressük azt a sort, ami az AKTUÁLISAN kiválasztott modulhoz tartozik
    let userBase = userRows.find(row => row.modul_id == modulId);
    
    // Biztonsági háló: ha valamiért nem találná, csak akkor vegye az elsőt
    if (!userBase) {
        userBase = userRows[0];
    }
    // --- JAVÍTÁS VÉGE ---

    const intId = userBase.int_id;

    const hozzaferhetoModulok = userRows
        .filter(row => row.modul_id !== null)
        .map(row => ({ id: row.modul_id, nev: row.modul_nev, leiras: row.modul_leiras }));

// 2. Intézményi létszám és Szerepkörök (SZIGORÍTVA)
    let intUsersCount = 0;
    let intElemzoCount = 0;
    let intErtekeloCount = 0;

    if (intId) {
      // Összes aktív felhasználó a modulban
      const sqlIntUsers = `
        SELECT COUNT(DISTINCT f.id) AS db
        FROM felhasznalok f
        INNER JOIN jogosultsagok j ON f.id = j.user_id
        WHERE f.int_id = ? AND j.modul_id = ?
      `;
      // Csak az elemzők (1, 2)
      const sqlElemzok = `
        SELECT COUNT(DISTINCT f.id) AS db
        FROM felhasznalok f
        INNER JOIN jogosultsagok j ON f.id = j.user_id
        WHERE f.int_id = ? AND j.modul_id = ? AND f.role_id IN (1, 2, '1', '2')
      `;
      // Csak az értékelők (3)
      const sqlErtekelok = `
        SELECT COUNT(DISTINCT f.id) AS db
        FROM felhasznalok f
        INNER JOIN jogosultsagok j ON f.id = j.user_id
        WHERE f.int_id = ? AND j.modul_id = ? AND f.role_id IN (3, '3')
      `;
      
      try {
          const resOsszes = await q(sqlIntUsers, [intId, modulId]);
          const resElemzo = await q(sqlElemzok, [intId, modulId]);
          const resErtekelo = await q(sqlErtekelok, [intId, modulId]);

          intUsersCount = resOsszes.length > 0 ? (Number(resOsszes[0].db) || 0) : 0;
          intElemzoCount = resElemzo.length > 0 ? (Number(resElemzo[0].db) || 0) : 0;
          intErtekeloCount = resErtekelo.length > 0 ? (Number(resErtekelo[0].db) || 0) : 0;
      } catch (err) {
          console.error("Hiba az intézményi létszám lekérdezésekor:", err);
      }
    }
    // 3. Kitöltések statisztikái és a LEGJOBB ÉRTÉKELÉS (SZIGORÍTVA A MODULRA)
    const sqlKitoltesek = `
      SELECT 
        k.id, k.idk, k.role, k.audit, k.szazalek, k.kitoltes_neve,
        CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
      FROM kitoltesek k
      LEFT JOIN vizsgaltak v ON k.vizsgalt_id = v.vizsgalt_id
      WHERE k.felhasznalo_id = ? AND k.modul_id = ?
    `;
    const kitoltesekRows = await q(sqlKitoltesek, [userId, modulId]);

    const kitoltesCount = kitoltesekRows.length;
   
    const adminId = []; 

    let adminCount = 0;
    let editorCount = 0;
    let audit1Count = 0;
    const adminIds = []; // <--- ÁTNEVEZTÜK adminIdks-ről adminIds-re

    const categoryStats = {};
    let legjobbErtekeles = null;
    let maxOsszAtlag = -1;

    kitoltesekRows.forEach(row => {
        if (row.role === 'admin') {
            adminCount++;
            if (row.id) adminIds.push(row.id); // <--- Itt is az új nevet használjuk
        }
        if (row.role === 'editor') editorCount++;
        
        // Csak a pontosan 1-es audit számít (0 és 2 kizárva)
        if (row.audit == 1) audit1Count++;

        // JSON feldolgozása a kategóriákhoz ÉS a legjobb értékeléshez
        if (row.szazalek) {
            try {
                const parsedJSON = JSON.parse(row.szazalek);
                let aktualisKitoltesSzum = 0;
                let aktualisKitoltesDarab = 0;

                for (const [key, valueObj] of Object.entries(parsedJSON)) {
                    if (valueObj && typeof valueObj['%'] === 'number') {
                        if (!categoryStats[key]) categoryStats[key] = { count: 0, sum: 0 };
                        categoryStats[key].count++;
                        categoryStats[key].sum += valueObj['%'];
                        
                        aktualisKitoltesSzum += valueObj['%'];
                        aktualisKitoltesDarab++;
                    }
                }

                if (aktualisKitoltesDarab > 0) {
                    const aktualisAtlag = Math.round(aktualisKitoltesSzum / aktualisKitoltesDarab);
                    if (aktualisAtlag > maxOsszAtlag) {
                        maxOsszAtlag = aktualisAtlag;
                        const vNev = row.vizsgalt_nev || 'Ismeretlen alany';
                        const kNev = row.kitoltes_neve || 'Névtelen értékelés';
                        legjobbErtekeles = { nev: `${vNev} - ${kNev}`, atlag: aktualisAtlag };
                    }
                }
            } catch (err) {
                console.warn(`Hibás JSON a kitöltésben (ID: ${row.id}):`, err.message);
            }
        }
    });
// 4. Megosztott értékelések (SZIGORÍTVA A TE LOGIKÁD ALAPJÁN)
  let megosztottErtekelesekSzama = 0;
    
    if (adminIds.length > 0) { // <--- Itt is az új név
        const placeholders = adminIds.map(() => '?').join(',');
        
        // A te SQL-ednek megfelelő lekérdezés: idk IN (adminIds...) ÉS role = 'editor' ÉS modul_id egyezik
        const sqlShared = `SELECT COUNT(id) AS db FROM kitoltesek WHERE idk IN (${placeholders}) AND role = 'editor' AND modul_id = ?`;
        
        const sharedRows = await q(sqlShared, [...adminIds, modulId]); // <--- És itt is
        megosztottErtekelesekSzama = sharedRows[0].db;
    }
    // 5. Leggyakoribb főkategória
    let leggyakoribbKategoria = null;
    let maxElofordulas = 0;
    let kategoriaAtlagSzazalek = 0;

    for (const [katNev, stats] of Object.entries(categoryStats)) {
        if (stats.count > maxElofordulas) {
            maxElofordulas = stats.count;
            leggyakoribbKategoria = katNev;
            kategoriaAtlagSzazalek = Math.round(stats.sum / stats.count);
        }
    }

    // 6. Audit (SZIGORÍTVA: Csak ha a kitoltesek.audit = 1 és egyezik a modul_id)
    let auditFigyelmeztetesek = 0;
    let auditHataridok = 0;

    if (audit1Count > 0) {
        const sqlAudit = `
            SELECT 
                SUM(CASE WHEN a.warm IS NOT NULL AND CAST(a.warm AS CHAR) != '' THEN 1 ELSE 0 END) AS warning_count,
                SUM(CASE WHEN a.hatarido IS NOT NULL THEN 1 ELSE 0 END) AS deadline_count
            FROM audit a
            INNER JOIN kitoltesek k ON a.audit_id = k.id
            WHERE a.user_user = ? 
              AND a.audit_modul_id = ? 
              AND k.audit = 1
        `;
        const auditRows = await q(sqlAudit, [userId, modulId]);
        if (auditRows.length > 0) {
            auditFigyelmeztetesek = Number(auditRows[0].warning_count) || 0;
            auditHataridok = Number(auditRows[0].deadline_count) || 0;
        }
    }
 // 7. Legtöbbet értékelt (INTÉZMÉNYRE SZŰRVE)
    const sqlLegtobbetErtekelt = `
      SELECT f.fnev, f.vez, COUNT(k.id) as db 
      FROM kitoltesek k
      JOIN felhasznalok f ON k.felhasznalo_id = f.id
      WHERE k.modul_id = ? AND k.role = 'admin' AND f.int_id = ?
      GROUP BY k.felhasznalo_id
      ORDER BY db DESC
      LIMIT 1
    `;
    const legtobbetErtekeltRows = await q(sqlLegtobbetErtekelt, [modulId, intId]);
    const legtobbetErtekelt = legtobbetErtekeltRows.length > 0 ? 
        { 
          // CSAK A "vez" MEZŐT ADJUK VISSZA (ha üres, akkor fallbackként az fnev-et)
          nev: legtobbetErtekeltRows[0].vez ? legtobbetErtekeltRows[0].vez : legtobbetErtekeltRows[0].fnev, 
          darab: legtobbetErtekeltRows[0].db 
        } : { nev: 'Nincs adat', darab: 0 };

  // 8. Összes 'warm' és 'hatarido' - EMBEREK és ÉRTÉKELÉSEK száma szerint (INTÉZMÉNYRE SZŰRVE)
    const sqlGlobalAuditStats = `
      SELECT 
        COUNT(DISTINCT CASE WHEN a.warm IS NOT NULL AND CAST(a.warm AS CHAR) != '' THEN f.id END) AS warm_user_count,
        COUNT(DISTINCT CASE WHEN a.warm IS NOT NULL AND CAST(a.warm AS CHAR) != '' THEN k.id END) AS warm_eval_count,
        COUNT(DISTINCT CASE WHEN a.hatarido IS NOT NULL THEN f.id END) AS deadline_user_count,
        COUNT(DISTINCT CASE WHEN a.hatarido IS NOT NULL THEN k.id END) AS deadline_eval_count
      FROM audit a
      INNER JOIN kitoltesek k ON a.audit_id = k.id
      INNER JOIN felhasznalok f ON k.felhasznalo_id = f.id
      WHERE k.audit = 1 
        AND k.modul_id = ? 
        AND f.int_id = ?
    `;
    const globalAuditRows = await q(sqlGlobalAuditStats, [modulId, intId]);
    
    // Érintett EMBEREK száma
    const globalWarmUserCount = globalAuditRows.length > 0 ? (Number(globalAuditRows[0].warm_user_count) || 0) : 0;
    const globalHataridoUserCount = globalAuditRows.length > 0 ? (Number(globalAuditRows[0].deadline_user_count) || 0) : 0;
    
    // Érintett ÉRTÉKELÉSEK száma
    const globalWarmEvalCount = globalAuditRows.length > 0 ? (Number(globalAuditRows[0].warm_eval_count) || 0) : 0;
    const globalHataridoEvalCount = globalAuditRows.length > 0 ? (Number(globalAuditRows[0].deadline_eval_count) || 0) : 0;
    // 9. Összes 'admin' role a kitoltesek táblában az adott modulra (INTÉZMÉNYRE SZŰRVE)
    const sqlGlobalAdminCount = `
      SELECT COUNT(k.id) AS db 
      FROM kitoltesek k
      JOIN felhasznalok f ON k.felhasznalo_id = f.id
      WHERE k.modul_id = ? AND k.role = 'admin' AND f.int_id = ?
    `;
    const globalAdminRows = await q(sqlGlobalAdminCount, [modulId, intId]);
    const globalAdminCount = globalAdminRows.length > 0 ? globalAdminRows[0].db : 0;

   // 10. Legtöbbet megosztott (INTÉZMÉNYRE SZŰRVE)
const sqlLegtobbetMegosztott = `
      SELECT f.fnev, f.vez, COUNT(DISTINCT k2.id) as db
      FROM kitoltesek k1
      JOIN kitoltesek k2 ON k1.id = k2.idk
      JOIN felhasznalok f ON k1.felhasznalo_id = f.id
      WHERE k1.modul_id = ? AND f.int_id = ?
      GROUP BY k1.felhasznalo_id
      ORDER BY db DESC
      LIMIT 1
    `;
    const legtobbetMegosztottRows = await q(sqlLegtobbetMegosztott, [modulId, intId]);
    const legtobbetMegosztott = legtobbetMegosztottRows.length > 0 ? 
        { 
          // JAVÍTVA: A .trim() hívás biztonságosabbá téve
          nev: legtobbetMegosztottRows[0].vez ? (legtobbetMegosztottRows[0].vez || '').trim() : legtobbetMegosztottRows[0].fnev, 
          darab: legtobbetMegosztottRows[0].db 
        } : { nev: 'Nincs adat', darab: 0 };

    // 11. Összes audit=2 a kitoltesek táblában az adott modulra (INTÉZMÉNYRE SZŰRVE)
    const sqlGlobalAudit2Count = `
      SELECT COUNT(k.id) AS db 
      FROM kitoltesek k
      JOIN felhasznalok f ON k.felhasznalo_id = f.id
      WHERE k.modul_id = ? AND k.audit = 2 AND f.int_id = ?
    `;
    const globalAudit2Rows = await q(sqlGlobalAudit2Count, [modulId, intId]);
    const globalAudit2Count = globalAudit2Rows.length > 0 ? globalAudit2Rows[0].db : 0;
// 12. Összes megosztás (editor) az adott modulra és intézményre szűrve
    const sqlGlobalEditorCount = `
      SELECT COUNT(k.id) AS db 
      FROM kitoltesek k
      JOIN felhasznalok f ON k.felhasznalo_id = f.id
      WHERE k.modul_id = ? AND k.role = 'editor' AND f.int_id = ?
    `;
    const globalEditorRows = await q(sqlGlobalEditorCount, [modulId, intId]);
    const globalEditorCount = globalEditorRows.length > 0 ? globalEditorRows[0].db : 0;
    
  res.json({
      success: true,
      username: userBase.username,
      fullname: userBase.fullname,
      mailname: userBase.mail,
      tel: userBase.tel,
      intkapmail: userBase.intkapmail,
      intfin: userBase.intfin,
      fizetve: userBase.fizetve,
      intezmeny: userBase.intnev,
      leiras: userBase.role_leiras,
      hozzaferhetoModulok: hozzaferhetoModulok,
      modul_leiras: userBase.modul_leiras,
      
      stats: {
        aktualisSzerep: aktualisSzerepNeve,
        globalWarmUserCount: globalWarmUserCount,
        globalWarmEvalCount: globalWarmEvalCount,
        globalHataridoUserCount: globalHataridoUserCount,
        globalHataridoEvalCount: globalHataridoEvalCount,
        azonosIntezmenyRegisztraltak: intUsersCount,
        azonosIntezmenyElemzok: intElemzoCount,    // <--- JAVÍTVA
        azonosIntezmenyErtekelok: intErtekeloCount, // <--- JAVÍTVA
        osszesKitoltese: kitoltesCount,
        sajatLetrehozasuAdmin: adminCount,
        mastolKapottEditor: editorCount,
        megosztottMasokkal: megosztottErtekelesekSzama,
        auditKerelemKitolteseknel: audit1Count,
        auditFigyelmeztetesek: auditFigyelmeztetesek,
        auditHataridok: auditHataridok,
        legjobbErtekeles: legjobbErtekeles,
  legtobbetErtekelt: legtobbetErtekelt,
        globalWarmCount: globalWarmEvalCount,        // <--- JAVÍTVA
        globalHataridoCount: globalHataridoEvalCount,// <--- JAVÍTVA
        globalAdminCount: globalAdminCount,
        legtobbetMegosztott: legtobbetMegosztott,
        globalAudit2Count: globalAudit2Count,
        globalEditorCount: globalEditorCount,      // <--- A globalEditorCount is hiányzott a JSON-ből a te kódodban!
        kedvencKategoria: leggyakoribbKategoria ? {
            nev: leggyakoribbKategoria,
            darab: maxElofordulas,
            atlag: kategoriaAtlagSzazalek
        } : null
      }
    });

  } catch (err) {
    console.error('Adatbázis hiba (/api/user-brief):', err);
    return res.json({ success: false, message: 'Belső szerverhiba történt az adatok lekérésekor.' });
  }
});

    return router;
};
