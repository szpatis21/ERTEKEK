const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Kijelentkezési útvonal
    router.post('/', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: 'Hiba történt a kijelentkezés során.' });
            }
            res.clearCookie('connect.sid'); // Session cookie törlése
            res.redirect('/index.html');
        });
    });

    return router;
};
