module.exports = (db) => {
    return function logActivity(req, felhasznalo_id, tevekenyseg, reszletek = null) {
        if (!felhasznalo_id) return;

        // Express automatikusan kezeli az IP-t, ha a 'trust proxy' be van állítva
        const ip_cim = req.ip || req.connection.remoteAddress || null;
        const eskoz_info = req.get('User-Agent') || null;
        
        const reszletekJson = reszletek ? JSON.stringify(reszletek) : null;

        const sql = `INSERT INTO aktivitas_log (felhasznalo_id, tevekenyseg, reszletek, eskoz_info, ip_cim) VALUES (?, ?, ?, ?, ?)`;
        
        db.query(sql, [felhasznalo_id, tevekenyseg, reszletekJson, eskoz_info, ip_cim], (err) => {
            if (err) {
                console.error('Hiba az aktivitás logolásakor:', err);
            }
        });
    };
};