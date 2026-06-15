const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

module.exports = (db) => {
    const {
        requireLogin,
        attachUserContext
    } = require('./security')(db);
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
    function q(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
        });
    }

    function run(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
        });
    }

    function normalizeEmail(value) {
        return String(value || '').trim().toLowerCase();
    }

    function normalizeUsername(value) {
        return String(value || '').trim();
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
    }

    function isStrongPassword(pass) {
        return typeof pass === 'string'
            && pass.length >= 8
            && /[a-z]/.test(pass)
            && /[A-Z]/.test(pass)
            && /\d/.test(pass);
    }

    function hashResetToken(token) {
        return crypto.createHash('sha256').update(String(token)).digest('hex');
    }

    function buildBaseUrl(req) {
        const envBase = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
        if (envBase) return envBase;

        const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || (process.env.NODE_ENV === 'production' ? 'https' : 'http'));
        const proto = rawProto.split(',')[0].trim().replace(/[^a-z]/gi, '') || 'http';

        const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000');
        const host = rawHost.split(',')[0].trim().replace(/[^a-zA-Z0-9.:-]/g, '') || 'localhost:3000';

        return `${proto}://${host}`;
    }

    const genericForgotResponse = {
        success: true,
        message: 'Ha létezik ilyen felhasználónév és e-mail páros, elküldtük a jelszó-visszaállító e-mailt.'
    };

    // 1. Publikus jelszó-visszaállítási kérelem.
    // Szándékosan nem árulja el, hogy létezik-e a felhasználó/e-mail páros.
    router.post('/api/forgot-password-request', async (req, res) => {
        const fnev = normalizeUsername(req.body.fnev);
        const email = normalizeEmail(req.body.email);

        if (!fnev || !email || !isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Hiányzó vagy hibás adatok!'
            });
        }

        try {
            const users = await q(
                `
                SELECT id, vez, fnev, mail
                FROM felhasznalok
                WHERE fnev = ?
                  AND LOWER(mail) = ?
                LIMIT 1
                `,
                [fnev, email]
            );

            if (users.length === 0) {
                return res.json(genericForgotResponse);
            }

            const user = users[0];
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = hashResetToken(token);
            const expireTime = Date.now() + 60 * 60 * 1000;

            await run(
                'UPDATE felhasznalok SET reset_token = ?, reset_exp = ? WHERE id = ?',
                [tokenHash, expireTime, user.id]
            );

            const resetLink = `${buildBaseUrl(req)}/reset-password.html?token=${encodeURIComponent(token)}`;

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                    <h2 style="color: #ffbd16;">Jelszó visszaállítása</h2>
                    <p>Kedves ${escapeHtml(user.vez)}!</p>
                    <p>Jelszó visszaállítási kérelem érkezett a(z) <strong>${escapeHtml(user.fnev)}</strong> nevű fiókjához.</p>

                    <div style="margin: 25px 0;">
                        <a href="${escapeHtml(resetLink)}" style="background-color: #ffbd16; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Új jelszó beállítása</a>
                    </div>

                    <p style="font-size: 13px; color: #777;">Ha a gomb nem működik, másolja be a böngészőbe ezt a linket:<br><a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a></p>

                    <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-top: 30px;">
                        <strong>Figyelem!</strong> Ha nem ön küldte a jelszó-visszaállítási kérelmet, kérjük jelezze az üzemeltetőnek.
                    </div>
                    <br>
                    <p>Üdvözlettel,<br><strong>Az ÉRTÉKEK csapata</strong></p>
                </div>
            `;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.mail,
                subject: 'Jelszó visszaállítás - ÉRTÉKEK',
                html: htmlContent
            });

            return res.json(genericForgotResponse);
        } catch (err) {
            console.error('forgot-password-request hiba:', err);
            return res.status(500).json({
                success: false,
                message: 'Hiba történt a jelszó-visszaállítási folyamat során.'
            });
        }
    });

    // 2. Publikus jelszó-visszaállítás tokennel.
    router.post('/api/reset-password', async (req, res) => {
        const token = String(req.body.token || '').trim();
        const email = normalizeEmail(req.body.email);
        const newPass = String(req.body.newPass || '');

        if (!token || !email || !newPass || !isValidEmail(email)) {
            return res.status(400).json({ success: false, message: 'Hiányzó vagy hibás adatok!' });
        }

        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({ success: false, message: 'Érvénytelen token formátum.' });
        }

        if (!isStrongPassword(newPass)) {
            return res.status(400).json({
                success: false,
                message: 'Az új jelszó nem felel meg a biztonsági követelményeknek!'
            });
        }

        try {
            const tokenHash = hashResetToken(token);

            // Csak a hash-elt reset tokeneket fogadjuk el.
       const users = await q(
    `
    SELECT id, reset_exp
    FROM felhasznalok
    WHERE LOWER(mail) = ?
      AND reset_token = ?
    LIMIT 1
    `,
    [email, tokenHash]
);

            if (users.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Érvénytelen e-mail cím vagy hibás token!'
                });
            }

            const user = users[0];
            const exp = Number(user.reset_exp);

            if (!Number.isFinite(exp) || Date.now() > exp) {
                await run('UPDATE felhasznalok SET reset_token = NULL, reset_exp = NULL WHERE id = ?', [user.id]);
                return res.status(400).json({
                    success: false,
                    message: 'A visszaállítási link lejárt. Kérjen újat.'
                });
            }

            const hashedPassword = await bcrypt.hash(newPass, 10);

            const result = await run(
                'UPDATE felhasznalok SET pass = ?, reset_token = NULL, reset_exp = NULL WHERE id = ?',
                [hashedPassword, user.id]
            );

            if (!result || result.affectedRows === 0) {
                return res.status(500).json({
                    success: false,
                    message: 'A szerver elérte az adatbázist, de nem írta át a jelszót.'
                });
            }

            return res.json({
                success: true,
                message: 'A jelszó sikeresen megváltoztatva! Most már bejelentkezhet.'
            });
        } catch (err) {
            console.error('reset-password hiba:', err);
            return res.status(500).json({ success: false, message: 'Mentési hiba!' });
        }
    });

    // 3. Bejelentkezett felhasználó jelszócseréje.
    // A userName kliensből jöhet kompatibilitásból, de jogosultsági döntésre nem használjuk.
    router.post('/api/change-password', requireLogin, attachUserContext, async (req, res) => {
        const userId = Number(req.auth?.userId);
        const { oldPass, newPass } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({ success: false, message: 'Érvénytelen bejelentkezés.' });
        }

        if (!oldPass || !newPass) {
            return res.status(400).json({ success: false, message: 'Hiányzó adatok!' });
        }

        if (!isStrongPassword(newPass)) {
            return res.status(400).json({
                success: false,
                message: 'Az új jelszó nem felel meg a biztonsági követelményeknek!'
            });
        }

        try {
            const rows = await q(
                'SELECT id, pass FROM felhasznalok WHERE id = ? LIMIT 1',
                [userId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Felhasználó nem található!' });
            }

            const user = rows[0];
            const isMatch = await bcrypt.compare(String(oldPass), user.pass);

            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'A megadott régi jelszó helytelen!' });
            }

            const hashedPassword = await bcrypt.hash(String(newPass), 10);
            const result = await run(
                'UPDATE felhasznalok SET pass = ?, reset_token = NULL, reset_exp = NULL WHERE id = ?',
                [hashedPassword, user.id]
            );

            if (!result || result.affectedRows === 0) {
                return res.status(500).json({
                    success: false,
                    message: 'A szerver elérte az adatbázist, de nem írta át a jelszót.'
                });
            }

            return res.json({ success: true, message: 'A jelszó sikeresen megváltoztatva!' });
        } catch (err) {
            console.error('change-password hiba:', err);
            return res.status(500).json({ success: false, message: 'Szerver hiba történt!' });
        }
    });

    return router;
};
