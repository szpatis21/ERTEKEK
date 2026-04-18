const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');


let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

async function sendEmail(recipient, subject, htmlContent) {
    if (!recipient) {
        console.error('Hiba: Nincs megadva címzett (a recipient értéke undefined vagy üres)!');
        return;
    }

    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: subject,
        html: htmlContent
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email elküldve:', info.response);
    } catch (error) {
        console.error('Hiba az e-mail elküldése közben:', error);
    }
}


function regi(db) 
{   //Regisztráció fajták
    const logger = require('./logmodul')(db); // Ezt a sort kell beszúrni
        // Intézmény regisztráció
router.post('/register/institution', (req, res) => {
    // 1. A felületről érkező adatok beolvasása
    const { intv, intirv, orszv, szekhelyv, adoszv, cimv, vez2v, mail2v, tel2v, intfinv, infov, intmod } = req.body;

    const mailCegv = mail2v;  
    const telCegv = tel2v;  
      
    // 2. --- ÁLLAPOTMENTÉS (Audit log) ADATOK KINYERÉSE ---
    const ipCim = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Ismeretlen';

    // 🌟 ÚJ LÉPÉS 1: Aktív időszak lekérdezése az új táblából
    const sqlActivePeriod = "SELECT idoszak FROM idoszak WHERE aktiv = 1 LIMIT 1";
    
    db.query(sqlActivePeriod, (errPeriod, periodResults) => {
        if (errPeriod) {
            console.error('Időszak lekérdezési hiba:', errPeriod);
            return res.status(500).json({ message: 'Szerver hiba az időszak ellenőrzésekor.' });
        }

        // Ha nincs aktív jelölve, legyen a biztonsági fallback "teszt"
        const aktualisIdoszak = periodResults.length > 0 ? periodResults[0].idoszak : 'teszt';

        // 🌟 LÉPÉS 2: Eredeti ellenőrzés (Létezik-e már a cég?)
        const checkQuery = 'SELECT * FROM intezmeny WHERE intnev = ? OR intado = ?';
        db.query(checkQuery, [intv, adoszv], (err, results) => {
            if (err) {
                console.error('Adatbázis hiba ellenőrzéskor:', err);
                return res.status(500).json({ message: 'Adatbázis hiba történt.' });
            }
            if (results.length > 0) {
                return res.status(400).json({ message: 'Ezzel az intézmény névvel vagy adószámmal már regisztráltak.' });
            }

            const date = new Date();
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const intreg = `${intv.substring(0, 3)}${adoszv.substring(0, 3)}${year}${month}`;

            // 🌟 LÉPÉS 3: ÚJ MENTÉS - Bekerült az "idoszak" oszlop is!
            // A fizetve oszlop értéke mostantól NULL regisztrációkor
const query = ` 
    INSERT INTO intezmeny 
    (intnev, intir, intor, intszek, intado, intcim, intmail, inttel, intkapvez, intkapmail, intkaptel, intfin, intfo, intmod, intreg, validalva, fizetve, ip_cim, user_agent, idoszak) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, NULL, ?, ?, ?);
`;
            
            // Az "aktualisIdoszak" bekerült a values végére
            const values = [intv, intirv, orszv, szekhelyv, adoszv, cimv, mailCegv, telCegv, vez2v, mail2v, tel2v, intfinv, infov, intmod, intreg, ipCim, userAgent, aktualisIdoszak];

            db.query(query, values, (err) => {
                if (err) {
                    console.error('Hiba az intézmény mentésekor:', err);
                    return res.status(500).json({ message: 'Hiba a regisztráció során.' });
                }

                // --- E-MAIL KÜLDÉS ---
                const htmlContent = `
                   <div style="font-family: 'Times New Roman', Times, serif; color: #333;">
    <h2><span style="color: #ff7c00;">K</span>edves ${intv},</h2>
    <p>Örömmel értesítjük, hogy tesztregisztrációja sikeresen megtörtént. Köszönjük, hogy részt vesz a próbaidőszakban!</p>
    
    <p><strong>Regisztrációs kódja:</strong> <span style="color: #ff7c00;">${intreg}</span><br>
    Kérjük, őrizze meg ezt a kódot! A továbbiakban ezzel tudnak majd regisztrálni munkatársai a <a href="https://ertekek.com/register.html">regisztrációs oldalon</a>.</p>
    
    <p>Utolsó lépésként már csak a saját felhasználói regisztrációját kell elvégeznie, ami mindössze egy percet vesz igénybe.</p>
    <p style="margin-top: 20px;">A regisztráció gombra kattintva válassza a „Felhasználói regisztráció” lehetőséget, és egyszerűen másolja be a fenti kódot.</p>

    <p style="margin-top: 20px;">Ha bármilyen kérdése van, kérjük, ne habozzon kapcsolatba lépni velünk.</p>
    <a href="https://www.ertekek.com">www.ertekek.com</a>
    
    <p style="color: #888; margin-top: 15px;">Köszönjük, hogy minket választott!</p>
    <p style="font-size: 0.9em;">Üdvözlettel,<br>Az Értékek csapata</p>
</div>
                `;
                sendEmail(mail2v, 'Regisztráció sikeres - ÉRTÉKEK', htmlContent);
                
                res.status(201).json({ message: 'Intézményi regisztráció sikeres', intreg });
            }); 
        }); 
    }); 
});
        // User regisztráció kezelése
// regmodul.js
// regmodul.js - Felhasználói regisztráció e-mail küldéssel
router.post('/register/user', (req, res) => {
    const {
        userv, jelszomezov, vezeteknevv, mailv, telv,
        intIdv, szerepv, 
        usermods = []            
    } = req.body;            

    // Audit adatok kinyerése
    const ipCim = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Ismeretlen';

    bcrypt.hash(jelszomezov, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ message: 'Jelszó-hash hiba.' });

        // Felhasználó mentése (a szerepv-vel, ip_cim-mel és user_agent-tel együtt)
        const userSQL = `
            INSERT INTO felhasznalok
            (fnev, pass, vez, mail, tel, int_id, role_id, ip_cim, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const userVals = [userv, hashedPassword, vezeteknevv, mailv, telv, intIdv, szerepv, ipCim, userAgent];

        db.query(userSQL, userVals, (err, result) => {
            if (err) {
                console.error('User-INSERT hiba:', err);
                return res.status(500).json({ message: 'Felhasználó mentése sikertelen.' });
            }

            const newUserId = result.insertId;

            // Jogosultságok mentése
            let modsTomb = Array.isArray(usermods) ? usermods : String(usermods).split(',');
            modsTomb = modsTomb.map(s => s.trim()).filter(s => s.length);

            // Szerepkör megnevezése az e-mailhez
            const szerepNeve = szerepv == 1 ? "Adminisztrátor" : (szerepv == 2 ? "Elemző" : "Értékelő");

            // --- VISSZAIGAZOLÓ E-MAIL ÖSSZEÁLLÍTÁSA ---
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <h2 style="color: #ff7c00;">Sikeres regisztráció az ÉRTÉKEK rendszerében!</h2>
                    <p>Kedves <strong>${vezeteknevv}</strong>!</p>
                    <p>Örömmel értesítjük, hogy felhasználói fiókját sikeresen létrehoztuk az intézményi kereteken belül.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid #ff7c00;">
                        <p><strong>Belépési adatok:</strong></p>
                        <ul style="list-style: none; padding: 0;">
                            <li><strong>Felhasználónév:</strong> ${userv}</li>
                            <li><strong>Szerepkör:</strong> ${szerepNeve}</li>
                        </ul>
                    </div>
                    <p>Mostantól bejelentkezhet a <a href="https://ertekek.com" style="color: #ff7c00; font-weight: bold;">www.ertekek.com</a> oldalon.</p>
                    <p>Teremtsünk együtt Értékeket!</p>
                    <br>
                    <p>Üdvözlettel,<br><strong>Az ÉRTÉKEK csapata</strong></p>
                </div>
            `;

            // Jogosultságok beszúrása és e-mail küldése
            if (modsTomb.length > 0) {
                const rightsVals = modsTomb.map(mid => [newUserId, mid, 1]); 
                const rightsSQL  = 'INSERT INTO jogosultsagok (user_id, modul_id, aktiv) VALUES ?';

                db.query(rightsSQL, [rightsVals], (err2) => {
                    if (err2) console.error('Jogosultság-INSERT hiba:', err2);
                    
                    // E-mail küldése sikeres regisztráció után
                    sendEmail(mailv, 'Sikeres regisztráció - ÉRTÉKEK', htmlContent);
                    res.status(201).json({ success: true, message: 'Regisztráció sikeres' });
                });
            } else {
                sendEmail(mailv, 'Sikeres regisztráció - ÉRTÉKEK', htmlContent);
                res.status(201).json({ success: true, message: 'Regisztráció sikeres' });
            }
        });
    });
});


    //Ellenörzések    
        //Felhasználónév ellenörzése
        router.get('/check-username', (req, res) => {
            const { username } = req.query;
            const query = 'SELECT * FROM felhasznalok WHERE fnev = ?';
            db.query(query, [username], (err, results) => {
                if (err) {
                    console.error('Adatbázis hiba:', err);
                    return res.status(500).json({ message: 'Adatbázis hiba történt.' });
                }
                if (results.length > 0) {
                    res.json({ exists: true });
                } else {
                    res.json({ exists: false });
                }
            });
        });
        //MAil ellenörzés
        router.get('/check-mailname', (req, res) => {
            const { mailname } = req.query;
            const query = 'SELECT * FROM felhasznalok WHERE mail = ?';
            db.query(query, [mailname], (err, results) => {
                if (err) {
                    console.error('Adatbázis hiba:', err);
                    return res.status(500).json({ message: 'Adatbázis hiba történt.' });
                }
                if (results.length > 0) {
                    res.json({ exists: true });
                } else {
                    res.json({ exists: false });
                }
            });
        });
        // Regisztrációs kód ellenőrzése és az intézmény adatainak visszaadása
        router.post('/register/check-code', (req, res) => {
            const regCode = req.body.regCode;
        
            // Első lekérdezés: Az intézmény adatai az 'intezmeny' táblából
            const query = 'SELECT id, intfo, intnev, intmod FROM intezmeny WHERE intreg = ?';
            db.query(query, [regCode], (err, results) => {
                if (err) {
                    console.error('Adatbázis hiba:', err);
                    return res.status(500).json({ message: 'Adatbázis hiba történt.' });
                }
        
                if (results.length > 0) {
                    const { id, intnev, intfo, intmod } = results[0]; 
        
                    // Második lekérdezés: Megszámoljuk, hány felhasználó van a 'felhasznalok' táblában az adott int_id alapján
                    const userCountQuery = 'SELECT COUNT(*) AS userCount FROM felhasznalok WHERE int_id = ?';
                    db.query(userCountQuery, [id], (err, userResults) => {
                        if (err) {
                            console.error('Adatbázis hiba:', err);
                            return res.status(500).json({ message: 'Hiba történt a felhasználók számolása közben.' });
                        }
        
                        const userCount = userResults[0].userCount; 
        
                        if (userCount >= intfo) {
                            return res.json({ success: false, message: 'Az intézménye licensz mennyisége elérve. Ha további felhasználókat kívánnak regisztrálni, bővítség csomagjukat.' });
                        }
                            res.json({ 
                            success: true,
                            intMod: intmod,  //Intézményi modulok
                            intNev: intnev,     // Intézmény neve
                            intId: id,      //Intézményi id
                            intFo: intfo,   //Felhasználók maximális száma 
                            userCount: userCount // Felhasználók jelenlegi száma
                        });
                    });
        
                } else {
                    // Ha nem található ilyen regisztrációs kód
                    res.json({ success: false, message: 'Érvénytelen regisztrációs kód.' });
                }
            });
        });        
        //Intézménynév elleörzés
        router.get('/check-intezmeny', (req, res) => {
            const { intezmeny } = req.query;
            const query = 'SELECT * FROM intezmeny WHERE intnev = ?';
            db.query(query, [intezmeny], (err, results) => {
                if (err) {
                    console.error('Adatbázis hiba:', err);
                    return res.status(500).json({ message: 'Adatbázis hiba történt.' });
                }
                if (results.length > 0) {
                    res.json({ exists: true });
                } else {
                    res.json({ exists: false });
                }
            });
        });
          //Adószám elleörzés
        router.get('/check-adsz', (req, res) => {
            const { adsz } = req.query;
            const query = 'SELECT * FROM intezmeny WHERE intado = ?';
            db.query(query, [adsz], (err, results) => {
                if (err) {
                    console.error('Adatbázis hiba:', err);
                    return res.status(500).json({ message: 'Adatbázis hiba történt.' });
                }
                if (results.length > 0) {
                    res.json({ exists: true });
                } else {
                    res.json({ exists: false });
                }
            });
        });

        
        router.post('/insert_kitoltes', async (req, res) => {
            const { kitoltesek } = req.body;
        
            if (!kitoltesek || !Array.isArray(kitoltesek) || kitoltesek.length === 0) {
                return res.status(400).json({ success: false, message: 'Hibás adatok!' });
            }
        
            const query = `INSERT INTO kitoltesek (felhasznalo_id, kitoltes_neve, idk, role, modul_id, vizsgalt_id) VALUES (?, ?, ?, ?, ?, ?)`;
        
            try {
                // 🔹 Adatbázisba mentés
                await Promise.all(kitoltesek.map(entry => {
                    return new Promise((resolve, reject) => {
                        db.query(query, [entry.felhasznalo_id, entry.kitoltes_neve, entry.idk, entry.role,entry.modul_id, entry.vizsgalt_id  ], (err) => {
                            if (err) {
                                console.error('Adatbázis hiba:', err);
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                }));
        
                // 🔹 E-mail küldése minden felhasználónak
                await Promise.all(kitoltesek.map(entry => {
                    // Ha van üzenet, akkor azt is beleírjuk az e-mailbe
                    const optionalMessage = entry.message ? `
                        <br><hr>
                        <p><strong>${entry.data_name} a következő üzenetet küldte önnek:</strong></p>
                        <p style="font-style: italic; color: #555;">"${entry.message}"</p>
                        <hr>
                    ` : ''; 
        
                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2>Kedves ${entry.innerHTML}!</h2>
                            <p>${entry.data_name} megosztott önnel egy készülő/már elkészült értékelést.</p>
                            <p>Mostantól ön is szerkesztheti a <strong>${entry.kitoltes_neve}</strong> nevű értékelést. 
                            Mivel ez egy megosztott értékelés, nem törölheti magát az értékelést illetve nem módosíthatja a címét. Ettől függetlenül szabadon adhat hozzá vagy vehet el belőle témákat, válaszokat.</p>
                            
                            ${optionalMessage}
        
                            <br>
                            <p>Ha úgy érzi, hogy tévedés történt, vegye fel a kapcsolatot az értékelés szerzőjével, vagy az ügyfélszolgálatunkkal.</p>
                            <br>
                            <p>Jó munkát és szép napot kíván:</p>
                            <p><strong>Az ÉRTÉKEK csapata</strong></p>
                            <a href="https://www.ertekek.com" style="color: #0056b3; text-decoration: none;">www.ertekek.com</a>
                            
                        </div>
                    `;
        
                    return sendEmail(entry.data_mail, "Új értékelés megosztása", htmlContent);
                    

                }));
        
const megoszto_id = req.session ? req.session.userId : null;
        logger(req, megoszto_id, 'megosztás', { megosztott_szemelyek_szama: kitoltesek.length });

        res.json({ success: true });        
            } catch (error) {
                console.error("Hiba történt:", error);
                res.status(500).json({ success: false, message: 'Adatbázis vagy e-mail küldési hiba!' });
            }
        });
        
          // GET /api/modulok  ⇒  [{ id, nev, leiras }, …]
  router.get('/modulok', (req, res) => {
    const sql = 'SELECT id, nev, leiras FROM modulok ORDER BY nev';
    db.query(sql, (err, rows) => {
      if (err) {
        console.error('[modulok] Adatbázis-hiba:', err);
        return res.status(500).json({ message: 'Adatbázis-hiba történt.' });
      }
      res.json(rows);
    });
  });
// --- ÚJ ENDPOINT: Csoportos határidő értesítő ---
router.post('/api/notify-deadlines', async (req, res) => {
    try {
        const { ertesitesek, hatarido } = req.body; 
        // ertesitesek: [{ email: 'a@a.hu', alkoto: '...', nev: '...', tipus: '...' }, ...]

        // 1. Csoportosítás e-mail címek alapján
        const groupedByEmail = {};
        
        for (const item of ertesitesek) {
            // Ha nincs email (bár elvileg kéne lennie az adatbázisodból), kihagyjuk
            if (!item.email) continue; 
            
            if (!groupedByEmail[item.email]) {
                groupedByEmail[item.email] = [];
            }
            groupedByEmail[item.email].push(item);
        }

        // 2. E-mailek elküldése ciklusonként (mindenkinek 1 db levél)
        const emailPromises = Object.keys(groupedByEmail).map(async (userEmail) => {
            const userItems = groupedByEmail[userEmail];
            
            // HTML lista generálása a levélbe
            let listHtml = '<ul style="padding-left: 20px;">';
            userItems.forEach(i => {
                listHtml += `<li><strong>${i.nev}</strong> (${i.tipus})</li>`;
            });
            listHtml += '</ul>';

       // Feltételezve, hogy a userItems tartalmazza az adott e-mail címhez tartozó adatokat
        const addresseeName = userItems[0].alkoto || 'Felhasználó';

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                <h2 style="color: #ffbd16;">Értékek határidő</h2>
                <h2>Kedves ${addresseeName}!</h2>
                <p>Az alábbi értékelés(ek)hez új leadási határidőt állítottak be a rendszerben:</p>
                
                ${listHtml}
                
                <p><strong>A megadott határidő: <span style="color: #d9534f; font-size: 1.2em;">${hatarido}</span></strong></p>
                <br>
                <p>Jó munkát kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                <a href="www.ertekek.com">www.ertekek.com</a>
            </div>
        `;

            return sendEmail(userEmail, "Új határidő beállítva - ÉRTÉKEK", htmlContent);
        });

        await Promise.all(emailPromises);
        res.json({ success: true, message: 'Értesítések elküldve.' });

    } catch (error) {
        console.error("Hiba az e-mail küldésnél:", error);
        res.status(500).json({ success: false, message: 'E-mail küldési hiba!' });
    }
});
// Értesítés auditációra jelölésről
        router.post('/api/notify-audit-init', async (req, res) => {
            const { email, userName, assessmentName, auditorName, message, deadline } = req.body;

            if (!email) {
                return res.status(400).json({ success: false, message: 'Nincs e-mail cím megadva.' });
            }

            let deadlineHtml = '';
            if (deadline) {
                deadlineHtml = `<p><strong>Az értékeléshez tartozó határidő: <span style="color: #d9534f;">${deadline}</span></strong></p>`;
            }

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                    <h2 style="color: #ffbd16;">Értékelés auditációra jelölve</h2>
                    <h2>Kedves ${userName}!</h2>
                    <p>A(z) <strong>${assessmentName}</strong> nevű értékelését <strong>${auditorName}</strong> módosításra jelölte meg és a következő üzenetet küldte:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #ffbd16; margin: 15px 0; font-style: italic;">
                        "${message}"
                    </div>
                    
                    ${deadlineHtml}
                    
                    <p>További információkat a "Javaslatok" fülön talál, és az üzenetre is itt tud válaszolni. Fiókjába belépve a javaslatok fülön tekintheti meg a részleteket.</p>
                    <br>
                    <p>Jó munkát és szép napot kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                    <a href="www.ertekek.com">www.ertekek.com</a>
                </div>
            `;

            try {
                await sendEmail(email, "Értékelés auditációra jelölve - ÉRTÉKEK", htmlContent);
                res.json({ success: true, message: 'Audit e-mail sikeresen elküldve.' });
            } catch (error) {
                console.error("Hiba az audit e-mail küldésekor:", error);
                res.status(500).json({ success: false, message: 'Hiba az e-mail küldésekor.' });
            }
        });
        // --- ÚJ VÉGPONT: Új audit üzenet e-mail értesítés ---
        router.post('/api/notify-audit-message', async (req, res) => {
            const { ertesitesek, uzenet, sender_name } = req.body;

            if (!ertesitesek || !Array.isArray(ertesitesek) || ertesitesek.length === 0) {
                return res.status(400).json({ success: false, message: 'Nincsenek megadva értesítendő adatok.' });
            }

            try {
                // Végigmegyünk a kapott tömbön, és mindenkinek elküldjük a saját e-mailjét
                const emailPromises = ertesitesek.map(async (ertek) => {
                    if (!ertek.email) return Promise.resolve(); // Ha nincs e-mail, ugrunk a következőre

                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                            <h2 style="color: #0056b3;">Új üzenet érkezett az értékeléséhez</h2>
                            <h2>Kedves ${ertek.alkoto}!</h2>
                            <p>A(z) <strong>${ertek.nev} (${ertek.tipus})</strong> nevű értékeléséhez <strong>${sender_name}</strong> új üzenetet küldött:</p>
                            
                            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #0056b3; margin: 15px 0; font-style: italic;">
                                "${uzenet}"
                            </div>
                            
                            <p>Fiókjába belépve a javaslatok fülön tekintheti meg a teljes beszélgetést, és itt is tud válaszolni rá.</p>
                            <br>
                            <p>Jó munkát és szép napot kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                            <a href="https://www.ertekek.com" style="color: #0056b3; text-decoration: none;">www.ertekek.com</a>
                        </div>
                    `;

                    // Az existing sendEmail függvény használata
                    return sendEmail(ertek.email, "Új üzenet az értékeléséhez - ÉRTÉKEK", htmlContent);
                });

                // Megvárjuk, amíg az összes levél kimegy
                await Promise.all(emailPromises);

                res.json({ success: true, message: 'Új üzenet e-mailek sikeresen elküldve.' });
            } catch (error) {
                console.error("Hiba az új üzenet e-mail küldésekor:", error);
                res.status(500).json({ success: false, message: 'Szerverhiba az e-mail küldésekor.' });
            }
        });
        // --- ÚJ VÉGPONT: Értesítés az elemzőnek (auditornak), ha a user válaszol ---
        router.post('/api/notify-auditor-reply', (req, res) => {
            // Itt már várjuk az assessment_name-et is a frontendtől
            const { audit_id, uzenet, user_name, assessment_name } = req.body;

            if (!audit_id || !uzenet) {
                return res.status(400).json({ success: false, message: 'Hiányzó adatok' });
            }

            // Egyszerűsített lekérdezés: csak az auditor e-mail címét és nevét kérjük le
            const query = `
                SELECT u.mail AS auditor_email, u.vez AS auditor_nev
                FROM audit a
                JOIN felhasznalok u ON a.user_audit = u.id
                WHERE a.audit_id = ?
                LIMIT 1
            `;

            db.query(query, [audit_id], async (err, results) => {
                if (err) {
                    console.error("Adatbázis hiba az auditor keresésekor:", err);
                    return res.status(500).json({ success: false, message: 'Adatbázis hiba' });
                }

                if (results.length > 0) {
                    const row = results[0];
                    const biztonsagiNev = assessment_name || 'Értékelés';

                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                            <h2 style="color: #28a745;">Új válasz érkezett egy auditált értékeléshez!</h2>
                            <h2>Kedves ${row.auditor_nev}!</h2>
                            <p>A(z) <strong>${biztonsagiNev}</strong> nevű értékeléshez <strong>${user_name}</strong> új üzenetet küldött:</p>
                            
                            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; font-style: italic;">
                                "${uzenet}"
                            </div>
                            
                            <p>Fiókjába belépve a "Javaslatok" fülön tekintheti meg a teljes beszélgetést, és ott tud válaszolni vagy jóváhagyni az értékelést.</p>
                            <br>
                            <p>Jó munkát és szép napot kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                            <a href="https://www.ertekek.com" style="color: #28a745; text-decoration: none;">www.ertekek.com</a>
                        </div>
                    `;

                    try {
                        await sendEmail(row.auditor_email, "Új válasz érkezett (Auditáció) - ÉRTÉKEK", htmlContent);
                        res.json({ success: true, message: 'Auditor értesítve.' });
                    } catch (emailErr) {
                        console.error("E-mail küldési hiba (auditor):", emailErr);
                        res.status(500).json({ success: false, message: 'E-mail küldési hiba' });
                    }
                } else {
                    res.status(404).json({ success: false, message: 'Nem található az auditor' });
                }
            });
        });
        // --- ÚJ VÉGPONT: Értesítés a jóváhagyásról ---
        router.post('/api/notify-audit-approved', async (req, res) => {
            const { ertesitesek } = req.body;

            if (!ertesitesek || !Array.isArray(ertesitesek) || ertesitesek.length === 0) {
                return res.status(400).json({ success: false, message: 'Nincsenek adatok.' });
            }

            try {
                const emailPromises = ertesitesek.map(async (ertek) => {
                    if (!ertek.email) return Promise.resolve();

                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                            <h2 style="color: #28a745;">Értékelés Jóváhagyva! 🎉</h2>
                            <h2>Kedves ${ertek.alkoto}!</h2>
                            <p>Örömmel értesítjük, hogy a(z) <strong>${ertek.nev} (${ertek.tipus})</strong> nevű értékelését az auditor sikeresen jóváhagyta.</p>
                            
                            <p>Az értékelés ezzel lezárásra került, további teendője jelenleg nincs vele.</p>
                            <br>
                            <p>További jó munkát és szép napot kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                            <a href="https://www.ertekek.com" style="color: #2e2ee1; text-decoration: none;">www.ertekek.com</a>
                        </div>
                    `;
                    return sendEmail(ertek.email, "Értékelés Jóváhagyva - ÉRTÉKEK", htmlContent);
                });

                await Promise.all(emailPromises);
                res.json({ success: true, message: 'Jóváhagyás e-mailek elküldve.' });
            } catch (error) {
                console.error("Hiba a jóváhagyás e-mail küldésekor:", error);
                res.status(500).json({ success: false, message: 'Szerverhiba.' });
            }
        });
    return router;
}

module.exports = regi;
