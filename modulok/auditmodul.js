const express = require('express');

module.exports = function(db) {
    const router = express.Router();

    // Üzenetek lekérése egy adott értékeléshez
   router.get('/api/get-audit-messages', async (req, res) => {
        const { kitoltes_id } = req.query;

        if (!kitoltes_id) {
            return res.json({ success: false, message: 'Hiányzó kitöltés ID' });
        }

        try {
            // Hozzáadjuk az a.hatarido-t a lekérdezéshez
           const sql = `
                SELECT 
                    a.uzenet,
                    a.hatarido, 
                    f1.vez AS auditor_name,
                    f2.vez AS user_name
                FROM audit a
                LEFT JOIN felhasznalok f1 ON a.user_audit = f1.id
                LEFT JOIN felhasznalok f2 ON a.user_user = f2.id
                WHERE a.audit_id = ? 
                LIMIT 1
            `;
            
            const [rows] = await db.promise().query(sql, [kitoltes_id]); 
            
            if (rows.length > 0) {
                // Visszaküldjük a határidőt is a JSON mellé!
                res.json({ 
                    success: true, 
                    uzenetek: rows[0].uzenet,
                    auditor_name: rows[0].auditor_name,
                    user_name: rows[0].user_name,
                    hatarido: rows[0].hatarido // ÚJ ADAT
                });
            } else {
                res.json({ success: true, uzenetek: null, hatarido: null }); 
            }
        } catch (error) {
            console.error("Hiba az üzenetek lekérésekor:", error);
            res.status(500).json({ success: false, message: 'Szerver hiba' });
        }
    });
// Határidő beállítása az elemzőtől
    router.post('/api/set-audit-deadline', async (req, res) => {
        const { audit_id, user_audit, audit_modul_id, audit_int_id, hatarido } = req.body;

        if (!audit_id || !user_audit || !hatarido) {
            return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });
        }

        try {
            // 1. Biztonsági okokból a backendből keressük ki, ki az értékelés eredeti tulajdonosa (user_user)
            // JAVÍTVA: Itt is az 'id' oszlopot vizsgáljuk az 'idk' helyett!
            const [kitoltesRows] = await db.promise().query(
                'SELECT felhasznalo_id FROM kitoltesek WHERE id = ? LIMIT 1', 
                [audit_id]
            );

            if (kitoltesRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Az értékelés nem található!' });
            }

            const user_user = kitoltesRows[0].felhasznalo_id;

            // 2. Létrehozzuk, vagy frissítjük az audit rekordot
            const sqlAudit = `
                INSERT INTO audit 
                (audit_id, user_audit, user_user, audit_modul_id, audit_int_id, hatarido)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                user_audit = VALUES(user_audit),
                audit_modul_id = VALUES(audit_modul_id),
                audit_int_id = VALUES(audit_int_id),
                hatarido = VALUES(hatarido)
            `;

            await db.promise().query(sqlAudit, [
                audit_id, user_audit, user_user, audit_modul_id, audit_int_id, hatarido
            ]);

            // 3. JAVÍTVA: A kitoltesek táblában átállítjuk az audit oszlopot 1-re az 'id' alapján
            await db.promise().query(
                'UPDATE kitoltesek SET audit = 1 WHERE id = ?',
                [audit_id]
            );

            res.json({ success: true, message: 'Határidő sikeresen rögzítve.' });

        } catch (error) {
            console.error('Hiba a határidő beállításakor:', error);
            res.status(500).json({ success: false, message: 'Adatbázis hiba történt a határidő mentésekor!' });
        }
    });
    //Auditáció beálítása 
router.post('/api/set-audit-init', async (req, res) => {
        // 1. audit_int_id hozzáadása a bejövő adatokhoz
        const { audit_id, user_audit, audit_modul_id, audit_int_id, sender_name, uzenet, hatarido } = req.body;

        if (!audit_id || !user_audit || !uzenet) {
            return res.status(400).json({ success: false, message: 'Hiányzó adatok (üzenet megadása kötelező)!' });
        }

        try {
            const [kitoltesRows] = await db.promise().query(
                'SELECT felhasznalo_id FROM kitoltesek WHERE id = ? LIMIT 1', 
                [audit_id]
            );

            if (kitoltesRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Az értékelés nem található!' });
            }

            const user_user = kitoltesRows[0].felhasznalo_id;

            const elsoUzenet = [{
                text: uzenet,
                timestamp: new Date().toISOString(),
                sender_name: sender_name,
                sender_type: "audit"
            }];
            const jsonUzenetDb = JSON.stringify(elsoUzenet);

            await db.promise().query(
                'UPDATE kitoltesek SET audit = 1 WHERE id = ?',
                [audit_id]
            );

            // 2. Az audit_int_id beépítése az INSERT és UPDATE részekbe
            const sqlAudit = `
                INSERT INTO audit 
                (audit_id, user_audit, user_user, audit_modul_id, audit_int_id, uzenet, hatarido, warm)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                user_audit = VALUES(user_audit),
                audit_modul_id = VALUES(audit_modul_id),
                audit_int_id = VALUES(audit_int_id),
                uzenet = VALUES(uzenet),
                hatarido = VALUES(hatarido),
                warm = VALUES(warm)
            `;

            // 3. A paraméter tömbbe is betehetjük az audit_int_id-t a megfelelő helyre
            await db.promise().query(sqlAudit, [
                audit_id, 
                user_audit, 
                user_user, 
                audit_modul_id, 
                audit_int_id,  // <-- ITT ADJUK ÁT
                jsonUzenetDb, 
                hatarido || null, 
                uzenet 
            ]);

            res.json({ success: true, message: 'Auditáció sikeresen elindítva.' });

        } catch (error) {
            console.error('Hiba az auditáció inicializálásakor:', error);
            res.status(500).json({ success: false, message: 'Szerver hiba történt az auditáció mentésekor!' });
        }
    });
// Új üzenet hozzáadása az auditációhoz (Egyéni és Csoportos)
    router.post('/api/add-audit-message', async (req, res) => {
        const { audit_ids, sender_name, message, sender_type } = req.body;

        if (!audit_ids || !audit_ids.length || !message) {
            return res.status(400).json({ success: false, message: 'Hiányzó adatok (ID-k vagy üzenet)!' });
        }

        try {
            // Eldöntjük, hogy ki a feladó (alapértelmezetten "audit")
            const veglegesSenderType = sender_type || "audit";

            const ujUzenetObj = {
                text: message,
                timestamp: new Date().toISOString(),
                sender_name: sender_name,
                sender_type: veglegesSenderType
            };

            // Végigmegyünk a kapott ID-kon
            for (const audit_id of audit_ids) {
                // 1. Lekérjük a meglévő üzeneteket az audit táblából
                const [rows] = await db.promise().query('SELECT uzenet FROM audit WHERE audit_id = ? LIMIT 1', [audit_id]);
                
                let eddigiUzenetek = [];
                if (rows.length > 0 && rows[0].uzenet) {
                    try {
                        eddigiUzenetek = typeof rows[0].uzenet === 'string' ? JSON.parse(rows[0].uzenet) : rows[0].uzenet;
                    } catch (e) {
                        eddigiUzenetek = [];
                    }
                }
                
                // 2. Hozzáfűzzük az új üzenetet a JSON tömbhöz
                eddigiUzenetek.push(ujUzenetObj);
                const ujUzenetJson = JSON.stringify(eddigiUzenetek);

                // 3. JAVÍTÁS: Feltételes adatbázis frissítés!
                if (veglegesSenderType === "user") {
                    // Ha a DOLGOZÓ küldi: CSAK a JSON chattet frissítjük, a warm (figyelmeztetés) marad az eredeti!
                    await db.promise().query(
                        'UPDATE audit SET uzenet = ? WHERE audit_id = ?',
                        [ujUzenetJson, audit_id]
                    );
                } else {
                    // Ha az ELEMZŐ küldi: a JSON-t ÉS a warm oszlopot is felülírjuk az új instrukcióval!
                    await db.promise().query(
                        'UPDATE audit SET uzenet = ?, warm = ? WHERE audit_id = ?',
                        [ujUzenetJson, message, audit_id]
                    );
                }
            }

            res.json({ success: true, message: 'Üzenet(ek) sikeresen rögzítve.' });
        } catch (error) {
            console.error('Hiba az üzenet küldésekor:', error);
            res.status(500).json({ success: false, message: 'Szerver hiba történt az üzenet mentésekor!' });
        }
    });
    // Audit státusz módosítása (Jóváhagyás = 2, Visszanyitás = 1)
    router.post('/api/set-audit-status', async (req, res) => {
        const { audit_ids, new_status } = req.body;

        if (!audit_ids || !audit_ids.length || !new_status) {
            return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });
        }

        try {
            // Végigmegyünk az összes kapott ID-n (lehet egy, vagy több is)
            for (const audit_id of audit_ids) {
                // 1. Kitöltések tábla frissítése (audit oszlop)
                await db.promise().query(
                    'UPDATE kitoltesek SET audit = ? WHERE id = ?',
                    [new_status, audit_id]
                );

                // 2. Ha jóváhagyás történik (new_status == 2), töröljük a warm üzenetet az audit táblából
                if (new_status == 2) {
                    await db.promise().query(
                        'UPDATE audit SET warm = NULL WHERE audit_id = ?',
                        [audit_id]
                    );
                }
            }

            res.json({ success: true, message: 'Státusz sikeresen módosítva.' });
        } catch (error) {
            console.error('Hiba az audit státusz váltásakor:', error);
            res.status(500).json({ success: false, message: 'Szerver hiba történt a státusz frissítésekor!' });
        }
    });
    return router;
};