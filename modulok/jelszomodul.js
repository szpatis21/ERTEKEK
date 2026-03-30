const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

module.exports = (db) => {

    // E-mail kliens beállítása (a regmodul alapján)
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false }
    });

    // --- 1. KÉRELEM ÉS LINK KIKÜLDÉSE ---
    router.post('/api/forgot-password-request', (req, res) => {
        const { fnev, email } = req.body;
        if (!fnev || !email) return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });

        // Létezik a felhasználónév + e-mail páros?
        const query = 'SELECT id, vez FROM felhasznalok WHERE fnev = ? AND mail = ?';
        db.query(query, [fnev, email], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
            
            // Ha nincs ilyen páros: STORNÓ
            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'Nincs ilyen felhasználónév és e-mail páros a rendszerben!' });
            }

            const user = results[0];
            // 64 karakteres random biztonsági token generálása
            const token = crypto.randomBytes(32).toString('hex');
            const expireTime = Date.now() + 3600000; // Pontosan 1 óra múlva lejár

            // Token mentése az adatbázisba
            const updateQ = 'UPDATE felhasznalok SET reset_token = ?, reset_exp = ? WHERE id = ?';
            db.query(updateQ, [token, expireTime, user.id], async (updErr) => {
                if (updErr) return res.status(500).json({ success: false, message: 'Hiba a token generálásakor!' });

                // A link, ami a Te szerveredre / frontend oldaladra fog mutatni
                const resetLink = `http://${req.headers.host}/reset-password.html?token=${token}`; 

                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                        <h2 style="color: #ffbd16;">Jelszó visszaállítása</h2>
                        <p>Kedves ${user.vez}!</p>
                        <p>Jelszó visszaállítási kérelem érkezett a(z) <strong>${fnev}</strong> nevű fiókjához.</p>
                        
                        <div style="margin: 25px 0;">
                            <a href="${resetLink}" style="background-color: #ffbd16; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Új jelszó beállítása</a>
                        </div>
                        
                        <p style="font-size: 13px; color: #777;">Ha a gomb nem működik, másolja be a böngészőbe ezt a linket: <br><a href="${resetLink}">${resetLink}</a></p>

                        <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-top: 30px;">
                            <strong>Figyelem!</strong> Ha NEM ön küldte a jelszó kérelmet, kérjük haladéktalanul jelentse a visszaélést az <a href="mailto:ertekek@info.hu" style="color: #721c24; font-weight: bold;">ertekek@info.hu</a> oldalon!
                        </div>
                        <br>
                        <p>Üdvözlettel,<br><strong>Az ÉRTÉKEK csapata</strong></p>
                    </div>
                `;

                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: "Jelszó visszaállítás - ÉRTÉKEK",
                        html: htmlContent
                    });
                    res.json({ success: true, message: 'E-mail elküldve!' });
                } catch (mailErr) {
                    console.error('Email hiba:', mailErr);
                    res.status(500).json({ success: false, message: 'A tokent elmentettük, de az e-mail kiküldése sikertelen!' });
                }
            });
        });
    });

    // --- 2. AZ ÚJ JELSZÓ VÉGLEGESÍTÉSE AZ IDEIGLENES OLDALRÓL ---
    router.post('/api/reset-password', (req, res) => {
        const { token, email, newPass } = req.body;
        if (!token || !email || !newPass) return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });

        // Megnézzük stimmel-e a token és az e-mail
        const query = 'SELECT id, reset_exp FROM felhasznalok WHERE mail = ? AND reset_token = ?';
        db.query(query, [email, token], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
            
            if (results.length === 0) {
                return res.status(400).json({ success: false, message: 'Érvénytelen e-mail cím vagy hibás token!' });
            }

            const user = results[0];
            // Lejárt a token?
            if (Date.now() > user.reset_exp) {
                return res.status(400).json({ success: false, message: 'A visszaállítási link lejárt (több mint 1 órája lett kiküldve)! Kérjen újat.' });
            }

            // Jelszó feltételek (amit a user felületen is használtunk)
            if (newPass.length < 8 || !/[a-z]/.test(newPass) || !/[A-Z]/.test(newPass) || !/\d/.test(newPass)) {
                return res.status(400).json({ success: false, message: 'Az új jelszó nem felel meg a biztonsági követelményeknek!' });
            }

            // Hashelés és felülírás
            const bcrypt = require('bcryptjs'); // Hozzáadva ha nincs a fájl tetején
            bcrypt.hash(newPass, 10, (hashErr, hashedPassword) => {
                if (hashErr) return res.status(500).json({ success: false, message: 'Titkosítási hiba!' });

                // Frissítjük a jelszót ÉS lenullázzuk a tokent (hogy ne lehessen újra használni)
                const updateQ = 'UPDATE felhasznalok SET pass = ?, reset_token = NULL, reset_exp = NULL WHERE id = ?';
                db.query(updateQ, [hashedPassword, user.id], (updErr) => {
                    if (updErr) return res.status(500).json({ success: false, message: 'Mentési hiba!' });
                    res.json({ success: true, message: 'A jelszó sikeresen megváltoztatva! Most már bejelentkezhet.' });
                });
            });
        });
    });

    router.post('/api/change-password', (req, res) => {
        // Feltételezzük, hogy userName-t vagy userId-t küld a kliens, 
        // de biztonságosabb a sessionből (req.user.id) kiszedni, ha van.
        const { userName, oldPass, newPass } = req.body;

        if (!userName || !oldPass || !newPass) {
            return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });
        }

        // 1. Felhasználó kikeresése az adatbázisból
        const query = 'SELECT id, pass FROM felhasznalok WHERE fnev = ?';
        db.query(query, [userName], (err, results) => {
            if (err) {
                console.error('Adatbázis hiba a jelszó lekérésekor:', err);
                return res.status(500).json({ success: false, message: 'Szerver hiba történt!' });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'Felhasználó nem található!' });
            }

            const user = results[0];

            // 2. Régi jelszó ellenőrzése
            bcrypt.compare(oldPass, user.pass, (cmpErr, isMatch) => {
                if (cmpErr || !isMatch) {
                    return res.status(401).json({ success: false, message: 'A megadott régi jelszó helytelen!' });
                }

                // Backend oldali validáció biztonsági okokból
                if (newPass.length < 8 || !/[a-z]/.test(newPass) || !/[A-Z]/.test(newPass) || !/\d/.test(newPass)) {
                    return res.status(400).json({ success: false, message: 'Az új jelszó nem felel meg a biztonsági követelményeknek!' });
                }

                // 3. Új jelszó hashelése
                bcrypt.hash(newPass, 10, (hashErr, hashedPassword) => {
                    if (hashErr) {
                        console.error('Hiba a jelszó titkosításakor:', hashErr);
                        return res.status(500).json({ success: false, message: 'Titkosítási hiba!' });
                    }

                    // 4. Jelszó frissítése az adatbázisban
                   // 4. Jelszó frissítése az adatbázisban
                    const updateQuery = 'UPDATE felhasznalok SET pass = ? WHERE id = ?';
                    db.query(updateQuery, [hashedPassword, user.id], (updErr, result) => {
                        if (updErr) {
                            console.error('Hiba a jelszó frissítésekor:', updErr);
                            return res.status(500).json({ success: false, message: 'Hiba a mentés során!' });
                        }

                

                        if (result.affectedRows === 0) {
                            return res.status(500).json({ success: false, message: 'A szerver elérte az adatbázist, de nem írta át a jelszót (érintett sorok: 0)!' });
                        }

                        res.json({ success: true, message: 'A jelszó sikeresen megváltoztatva!' });
                    });
                });
            });
        });
    });    return router;
};