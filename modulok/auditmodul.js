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

    // --- Ide jöhetnek majd a jövőbeli végpontok ---
    // router.post('/api/send-audit-message', async (req, res) => { ... });
    // router.post('/api/close-audit', async (req, res) => { ... });

    // Nagyon fontos: vissza kell adni a routert!
    return router;
};