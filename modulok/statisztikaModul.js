const express = require('express');
const router = express.Router();

module.exports = (db) => {
  const {
    requireLogin,
    attachUserContext,
    requireModuleAccess
  } = require('./security')(db);

  function q(sql, params = []) {
    return new Promise((resolve, reject) =>
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    );
  }

  function toPositiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function isSysadmin(req) {
    return req.auth?.isSysadmin === true || Number(req.auth?.realRoleId) === 4;
  }

  function getRoleName(roleId) {
    if (Number(roleId) === 1) return 'Feltöltő modul';
    if (Number(roleId) === 2) return 'Elemző modul';
    if (Number(roleId) === 3) return 'Értékelő modul';
    if (Number(roleId) === 4) return 'Sysadmin modul';
    return 'Értékelő';
  }

  function normalizeDate(value) {
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'string') return value.substring(0, 10);
    return null;
  }

  async function loadCurrentUserBase(req, userId, modulId) {
    const rows = await q(
      `
      SELECT
        f.id,
        f.ai_ossz_max,
        f.int_id,
        f.fnev AS username,
        f.vez AS fullname,
        f.mail,
        f.tel,
        i.fizetve,
        i.intfin,
        i.intnev,
        i.intkapmail,
        i.idoszak,
        r.leiras AS role_leiras,
        m.id AS modul_id,
        m.nev AS modul_nev,
        m.leiras AS modul_leiras
      FROM felhasznalok f
      LEFT JOIN intezmeny i ON f.int_id = i.id
      LEFT JOIN roles r ON r.id = COALESCE(?, f.role_id)
      LEFT JOIN modulok m ON m.id = ?
      WHERE f.id = ?
      LIMIT 1
      `,
      [req.auth.roleId || null, modulId, userId]
    );

    return rows[0] || null;
  }

  async function loadAccessibleModules(req, userId) {
    if (isSysadmin(req)) {
      return q(
        `
        SELECT id, nev, leiras
        FROM modulok
        ORDER BY id ASC
        `
      );
    }

    return q(
      `
      SELECT DISTINCT
        m.id,
        m.nev,
        m.leiras
      FROM jogosultsagok j
      JOIN modulok m ON m.id = j.modul_id
      WHERE j.user_id = ?
        AND j.aktiv = 1
      ORDER BY m.id ASC
      `,
      [userId]
    );
  }

  async function countByQuery(sql, params) {
    const rows = await q(sql, params);
    return rows.length > 0 ? (Number(rows[0].db) || 0) : 0;
  }

  // Kiterjesztett /api/user-brief statisztikákkal.
  // Ez a router gyökérre van mountolva, ezért csak ezt az egy route-ot védjük.
  router.get(
    '/api/user-brief',
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    async (req, res) => {
      const userId = toPositiveInt(req.auth?.userId);
      const modulId = toPositiveInt(req.auth?.modulId);
      const roleId = Number(req.auth?.roleId || req.session?.roleId);
      const sysadmin = isSysadmin(req);

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Érvénytelen felhasználó.' });
      }

      if (!modulId) {
        return res.status(403).json({ success: false, message: 'Nincs modul kiválasztva!' });
      }

      try {
        const userBase = await loadCurrentUserBase(req, userId, modulId);
        if (!userBase) {
          return res.status(404).json({ success: false, message: 'Felhasználó nem található' });
        }

        const intId = toPositiveInt(userBase.int_id);
        const hozzaferhetoModulok = await loadAccessibleModules(req, userId);

        let intUsersCount = 0;
        let intElemzoCount = 0;
        let intErtekeloCount = 0;

        if (intId) {
          const sqlIntUsers = `
            SELECT COUNT(DISTINCT f.id) AS db
            FROM felhasznalok f
            INNER JOIN jogosultsagok j ON f.id = j.user_id
            WHERE f.int_id = ?
              AND j.modul_id = ?
              AND j.aktiv = 1
          `;

          const sqlElemzok = `
            SELECT COUNT(DISTINCT f.id) AS db
            FROM felhasznalok f
            INNER JOIN jogosultsagok j ON f.id = j.user_id
            WHERE f.int_id = ?
              AND j.modul_id = ?
              AND j.aktiv = 1
              AND f.role_id IN (1, 2, '1', '2')
          `;

          const sqlErtekelok = `
            SELECT COUNT(DISTINCT f.id) AS db
            FROM felhasznalok f
            INNER JOIN jogosultsagok j ON f.id = j.user_id
            WHERE f.int_id = ?
              AND j.modul_id = ?
              AND j.aktiv = 1
              AND f.role_id IN (3, '3')
          `;

          try {
            intUsersCount = await countByQuery(sqlIntUsers, [intId, modulId]);
            intElemzoCount = await countByQuery(sqlElemzok, [intId, modulId]);
            intErtekeloCount = await countByQuery(sqlErtekelok, [intId, modulId]);
          } catch (err) {
            console.error('Hiba az intézményi létszám lekérdezésekor:', err);
          }
        }

        // Saját kitöltések: csak az aktuális user + aktuális modul.
        const sqlKitoltesek = `
          SELECT
            k.id,
            k.idk,
            k.role,
            k.audit,
            k.szazalek,
            k.kitoltes_neve,
            CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev
          FROM kitoltesek k
          LEFT JOIN vizsgaltak v ON k.vizsgalt_id = v.vizsgalt_id
          WHERE k.felhasznalo_id = ?
            AND k.modul_id = ?
        `;
        const kitoltesekRows = await q(sqlKitoltesek, [userId, modulId]);

        const kitoltesCount = kitoltesekRows.length;
        let adminCount = 0;
        let editorCount = 0;
        let audit1Count = 0;
        const adminIdks = [];
        const categoryStats = {};
        let legjobbErtekeles = null;
        let maxOsszAtlag = -1;

        kitoltesekRows.forEach(row => {
          if (row.role === 'admin' || row.role === 'sysadmin') {
            adminCount++;
            if (row.idk) adminIdks.push(row.idk);
          }

          if (row.role === 'editor') editorCount++;
          if (Number(row.audit) === 1) audit1Count++;

          if (!row.szazalek) return;

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
        });

        let megosztottErtekelesekSzama = 0;
        if (adminIdks.length > 0) {
          const placeholders = adminIdks.map(() => '?').join(',');
          const sqlShared = `
            SELECT COUNT(id) AS db
            FROM kitoltesek
            WHERE idk IN (${placeholders})
              AND role = 'editor'
              AND modul_id = ?
          `;
          const sharedRows = await q(sqlShared, [...adminIdks, modulId]);
          megosztottErtekelesekSzama = sharedRows.length > 0 ? (Number(sharedRows[0].db) || 0) : 0;
        }

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
              AND k.modul_id = ?
              AND k.audit = 1
          `;
          const auditRows = await q(sqlAudit, [userId, modulId, modulId]);
          if (auditRows.length > 0) {
            auditFigyelmeztetesek = Number(auditRows[0].warning_count) || 0;
            auditHataridok = Number(auditRows[0].deadline_count) || 0;
          }
        }

        const institutionFilterSql = sysadmin || !intId ? '' : 'AND f.int_id = ?';
        const institutionParams = sysadmin || !intId ? [] : [intId];

        const sqlLegtobbetErtekelt = `
          SELECT f.fnev, f.vez, COUNT(k.id) AS db
          FROM kitoltesek k
          JOIN felhasznalok f ON k.felhasznalo_id = f.id
          WHERE k.modul_id = ?
            AND k.role IN ('admin', 'sysadmin')
            ${institutionFilterSql}
          GROUP BY k.felhasznalo_id
          ORDER BY db DESC
          LIMIT 1
        `;
        const legtobbetErtekeltRows = await q(sqlLegtobbetErtekelt, [modulId, ...institutionParams]);
        const legtobbetErtekelt = legtobbetErtekeltRows.length > 0
          ? {
              nev: legtobbetErtekeltRows[0].vez || legtobbetErtekeltRows[0].fnev,
              darab: legtobbetErtekeltRows[0].db
            }
          : { nev: 'Nincs adat', darab: 0 };

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
            ${institutionFilterSql}
        `;
        const globalAuditRows = await q(sqlGlobalAuditStats, [modulId, ...institutionParams]);
        const globalWarmUserCount = globalAuditRows.length > 0 ? (Number(globalAuditRows[0].warm_user_count) || 0) : 0;
        const globalHataridoUserCount = globalAuditRows.length > 0 ? (Number(globalAuditRows[0].deadline_user_count) || 0) : 0;
        const globalWarmEvalCount = globalAuditRows.length > 0 ? (Number(globalAuditRows[0].warm_eval_count) || 0) : 0;
        const globalHataridoEvalCount = globalAuditRows.length > 0 ? (Number(globalAuditRows[0].deadline_eval_count) || 0) : 0;

        const sqlGlobalAdminCount = `
          SELECT COUNT(k.id) AS db
          FROM kitoltesek k
          JOIN felhasznalok f ON k.felhasznalo_id = f.id
          WHERE k.modul_id = ?
            AND k.role IN ('admin', 'sysadmin')
            ${institutionFilterSql}
        `;
        const globalAdminCount = await countByQuery(sqlGlobalAdminCount, [modulId, ...institutionParams]);

        const sqlLegtobbetMegosztott = `
          SELECT f.fnev, f.vez, COUNT(DISTINCT k2.id) AS db
          FROM kitoltesek k1
          JOIN kitoltesek k2
            ON k2.idk = k1.idk
           AND k2.modul_id = k1.modul_id
           AND k2.role = 'editor'
          JOIN felhasznalok f ON k1.felhasznalo_id = f.id
          WHERE k1.modul_id = ?
            AND k1.role IN ('admin', 'sysadmin')
            ${institutionFilterSql}
          GROUP BY k1.felhasznalo_id
          ORDER BY db DESC
          LIMIT 1
        `;
        const legtobbetMegosztottRows = await q(sqlLegtobbetMegosztott, [modulId, ...institutionParams]);
        const legtobbetMegosztott = legtobbetMegosztottRows.length > 0
          ? {
              nev: legtobbetMegosztottRows[0].vez ? String(legtobbetMegosztottRows[0].vez).trim() : legtobbetMegosztottRows[0].fnev,
              darab: legtobbetMegosztottRows[0].db
            }
          : { nev: 'Nincs adat', darab: 0 };

        const sqlGlobalAudit2Count = `
          SELECT COUNT(k.id) AS db
          FROM kitoltesek k
          JOIN felhasznalok f ON k.felhasznalo_id = f.id
          WHERE k.modul_id = ?
            AND k.audit = 2
            ${institutionFilterSql}
        `;
        const globalAudit2Count = await countByQuery(sqlGlobalAudit2Count, [modulId, ...institutionParams]);

        const sqlGlobalEditorCount = `
          SELECT COUNT(k.id) AS db
          FROM kitoltesek k
          JOIN felhasznalok f ON k.felhasznalo_id = f.id
          WHERE k.modul_id = ?
            AND k.role = 'editor'
            ${institutionFilterSql}
        `;
        const globalEditorCount = await countByQuery(sqlGlobalEditorCount, [modulId, ...institutionParams]);

        const sqlKerdesStats = `
          SELECT
            COUNT(DISTINCT CASE WHEN fo_kategoria IS NOT NULL AND fo_kategoria != '' THEN fo_kategoria END) AS fo_kat_db,
            COUNT(DISTINCT CASE WHEN al_kategoria IS NOT NULL AND al_kategoria != '' THEN al_kategoria END) AS al_kat_db,
            COUNT(DISTINCT CASE WHEN alt_tema IS NOT NULL AND alt_tema != '' THEN alt_tema END) AS alt_tema_db,
            COUNT(CASE WHEN kerdes_szoveg IS NOT NULL AND kerdes_szoveg != '' THEN id END) AS ossz_kerdes_db
          FROM kerdesek_kategoriaval
          WHERE modul_id = ?
        `;
        const kerdesStatsRows = await q(sqlKerdesStats, [modulId]);
        const kerdesStats = kerdesStatsRows.length > 0
          ? kerdesStatsRows[0]
          : { fo_kat_db: 0, al_kat_db: 0, alt_tema_db: 0, ossz_kerdes_db: 0 };

        const hozzaferesInstitutionSql = sysadmin || !intId ? '' : 'AND f.int_id = ?';
        const hozzaferesInstitutionParams = sysadmin || !intId ? [] : [intId];
        const sqlHozzaferesStats = `
          SELECT
            COUNT(DISTINCT j.user_id) AS ossz_hozzaferes_db,
            COUNT(DISTINCT CASE WHEN f.role_id = 1 THEN j.user_id END) AS admin_hozzaferes_db
          FROM jogosultsagok j
          JOIN felhasznalok f ON j.user_id = f.id
          WHERE j.modul_id = ?
            AND j.aktiv = 1
            ${hozzaferesInstitutionSql}
        `;
        const hozzaferesStatsRows = await q(sqlHozzaferesStats, [modulId, ...hozzaferesInstitutionParams]);
        const hozzaferesStats = hozzaferesStatsRows.length > 0
          ? hozzaferesStatsRows[0]
          : { ossz_hozzaferes_db: 0, admin_hozzaferes_db: 0 };

        const sqlLegtobbKerdes = `
          SELECT fo_kategoria, COUNT(*) AS darab
          FROM kerdesek_kategoriaval
          WHERE modul_id = ?
            AND fo_kategoria IS NOT NULL
            AND fo_kategoria != ''
          GROUP BY fo_kategoria
          ORDER BY darab DESC
          LIMIT 1
        `;
        const legtobbKerdesRes = await q(sqlLegtobbKerdes, [modulId]);
        const legnepszerubbKategoria = legtobbKerdesRes.length > 0
          ? legtobbKerdesRes[0]
          : { fo_kategoria: 'Nincs adat', darab: 0 };

        const sablonInstitutionSql = sysadmin || !intId ? '' : 'AND int_id = ?';
        const sablonInstitutionParams = sysadmin || !intId ? [] : [intId];
        const sqlSablonCount = `
          SELECT COUNT(*) AS db
          FROM sablonok
          WHERE modul_id = ?
            ${sablonInstitutionSql}
        `;
        const sablonCountRes = await q(sqlSablonCount, [modulId, ...sablonInstitutionParams]);
        const sablonokSzama = sablonCountRes.length > 0 ? (Number(sablonCountRes[0].db) || 0) : 0;

        const sqlModulCimek = `
          SELECT cim_jellemzes, cim_fejlesztes, cim_ertekeles
          FROM modulok
          WHERE id = ?
          LIMIT 1
        `;
        const modulCimekRes = await q(sqlModulCimek, [modulId]);
        const modulCimek = modulCimekRes.length > 0
          ? modulCimekRes[0]
          : { cim_jellemzes: '', cim_fejlesztes: '', cim_ertekeles: '' };

        return res.json({
          success: true,
          username: userBase.username,
          fullname: userBase.fullname,
          mailname: userBase.mail,
          tel: userBase.tel,
          intkapmail: userBase.intkapmail,
          intfin: userBase.intfin,
          fizetve: userBase.fizetve,
          idoszak: userBase.idoszak,
          intezmeny: userBase.intnev,
          leiras: userBase.role_leiras,
          hozzaferhetoModulok,
          modul_leiras: userBase.modul_leiras,

          stats: {
            legnepszerubbKategoriaNev: legnepszerubbKategoria.fo_kategoria,
            legnepszerubbKategoriaDarab: legnepszerubbKategoria.darab,
            modulSablonCount: sablonokSzama,
            cimJellemzes: modulCimek.cim_jellemzes,
            cimFejlesztes: modulCimek.cim_fejlesztes,
            cimErtekeles: modulCimek.cim_ertekeles,
            foKategoriaCount: kerdesStats.fo_kat_db,
            alKategoriaCount: kerdesStats.al_kat_db,
            altTemaCount: kerdesStats.alt_tema_db,
            osszKerdesCount: kerdesStats.ossz_kerdes_db,
            modulHozzaferesekSzama: hozzaferesStats.ossz_hozzaferes_db,
            modulAdminHozzaferesekSzama: hozzaferesStats.admin_hozzaferes_db,
            aiOsszMax: userBase.ai_ossz_max,
            aktualisSzerep: getRoleName(roleId),
            globalWarmUserCount,
            globalWarmEvalCount,
            globalHataridoUserCount,
            globalHataridoEvalCount,
            azonosIntezmenyRegisztraltak: intUsersCount,
            azonosIntezmenyElemzok: intElemzoCount,
            azonosIntezmenyErtekelok: intErtekeloCount,
            osszesKitoltese: kitoltesCount,
            sajatLetrehozasuAdmin: adminCount,
            mastolKapottEditor: editorCount,
            megosztottMasokkal: megosztottErtekelesekSzama,
            auditKerelemKitolteseknel: audit1Count,
            auditFigyelmeztetesek,
            auditHataridok,
            legjobbErtekeles,
            legtobbetErtekelt,
            globalWarmCount: globalWarmEvalCount,
            globalHataridoCount: globalHataridoEvalCount,
            globalAdminCount,
            legtobbetMegosztott,
            globalAudit2Count,
            globalEditorCount,
            kedvencKategoria: leggyakoribbKategoria
              ? {
                  nev: leggyakoribbKategoria,
                  darab: maxElofordulas,
                  atlag: kategoriaAtlagSzazalek
                }
              : null
          }
        });
      } catch (err) {
        console.error('Adatbázis hiba (/api/user-brief):', err);
        return res.status(500).json({ success: false, message: 'Belső szerverhiba történt az adatok lekérésekor.' });
      }
    }
  );

  return router;
};
