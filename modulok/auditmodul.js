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
    return router;
};