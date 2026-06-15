const cron = require('node-cron');
const nodemailer = require('nodemailer');
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
// --- E-MAIL KÜLDŐ BEÁLLÍTÁSA (Ugyanaz, mint a regmodul.js-ben) ---
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmail(recipient, subject, htmlContent) {
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: subject,
        html: htmlContent
    };
    try {
        let info = await transporter.sendMail(mailOptions);
/*         console.log('Emlékeztető email elküldve:', info.response);
 */    } catch (error) {
        console.error('Hiba az e-mail elküldése közben:', error);
    }
}

// --- MAGA A MODUL EXPORTÁLÁSA ---
module.exports = (db) => {
    // Minden nap reggel 08:00-kor lefut
    cron.schedule('0 8 * * *', async () => {

        try {
            // =======================================================
            // 1. LÉPÉS: LEJÁRT HATÁRIDŐK TÖRLÉSE ("Isten hozzád" mód)
            // (Csak a dátum kerül le, a sárga keret megszűnik, audit marad 1-es)
            // =======================================================
            await db.promise().query(`
                UPDATE kitoltesek k
                JOIN audit a ON k.id = a.audit_id
                SET k.audit = 0
                WHERE a.hatarido < CURDATE() 
                  AND k.audit = 1
                  AND (a.warm IS NULL OR TRIM(a.warm) = '' OR a.warm = 'null' OR a.warm = '[]' OR a.warm = '{}')
            `);

            // B) Minden lejárt határidőt nullázunk (így aminek volt üzenete, arról csak a dátum esik le, de audit=1 marad)
            await db.promise().query(`
                UPDATE audit 
                SET hatarido = NULL 
                WHERE hatarido < CURDATE()
            `);
/*             console.log('[CRON] A lejárt határidők kezelve (üres note esetén audit=0).');
 */
            // =======================================================
            // 2. LÉPÉS: 3 NAPOS FIGYELMEZTETÉS AZ ÉRTÉKELŐNEK (User)
            // (Ez a te eredeti, jól működő kódod)
            // =======================================================
            const sqlUser3Days = `
                SELECT k.idk, k.kitoltes_neve, a.hatarido, f.mail AS email, f.vez AS fullname
                FROM audit a
                JOIN felhasznalok f ON a.user_user = f.id
                JOIN kitoltesek k ON a.audit_id = k.id
                WHERE a.hatarido = CURDATE() + INTERVAL 3 DAY 
                  AND k.audit = 1
            `;
            
            const [userRows] = await db.promise().query(sqlUser3Days);

            if (userRows.length > 0) {
                for (const i of userRows) {
                    const hDatum = new Date(i.hatarido);
                    const szepHatarido = hDatum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                    const formatCim = i.kitoltes_neve ? i.kitoltes_neve.replace(/~/g, ' - ').replace(/~/g, '-') : 'Értékelés';

                    const htmlContentUser = `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; line-height: 1.6;">
                            <h2 style="color: #ffaa00;"> ⏰ Közelgő határidő figyelmeztetés!</h2>
                            <p>Kedves ${escapeHtml(i.fullname)}!</p>
                            <p>Felhívjuk szíves figyelmét, hogy az alábbi értékelés leadási határideje <strong style="color: #d9534f;">3 nap múlva lejár</strong>:</p>
                            
                            <ul style="padding-left: 20px;">
                            <li><strong>${escapeHtml(formatCim)}</strong></li>
                            </ul>
                            
                            <p><strong>Határidő: <span style="color: #ffae00; font-size: 1.2em;">${szepHatarido}</span></strong></p>
                            <br>
                            <p style="background: #fdf7f7; padding: 10px; border-left: 4px solid #ffea00;">
                                <i>Ha az értékelés kész, a levelet tekintse tárgytalannak. Ha esetleg még finomítana rajta, van még rá három napja. :)</i>
                            </p>
                            <p>Jó munkát:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                            <a href="https://www.ertekek.com">www.ertekek.com</a>
                        </div>
                    `;
                    await sendEmail(i.email, "Közelgő határidő (3 nap) - ÉRTÉKEK", htmlContentUser);
                }
            }


        // =======================================================
            // 3. LÉPÉS: 1 NAPOS FIGYELMEZTETÉS AZ AUDITORNAK (Tehát NEKED)
            // =======================================================
            const sqlAuditor1Day = `
                SELECT u.id AS auditor_id, u.mail AS auditor_email, u.vez AS auditor_nev,
                       k.kitoltes_neve, a.hatarido
                FROM audit a
                JOIN felhasznalok u ON a.user_audit = u.id
                JOIN kitoltesek k ON a.audit_id = k.id
                WHERE a.hatarido = CURDATE() + INTERVAL 1 DAY 
                  AND k.audit = 1
            `;
            
            const [auditorRows] = await db.promise().query(sqlAuditor1Day);

            if (auditorRows.length > 0) {
                // Csoportosítjuk az e-maileket auditoronként
                const auditorEmails = {};
                auditorRows.forEach(row => {
                    if (!auditorEmails[row.auditor_id]) {
                        auditorEmails[row.auditor_id] = { email: row.auditor_email, nev: row.auditor_nev, items: [] };
                    }
                    auditorEmails[row.auditor_id].items.push(row);
                });

                for (const auditorId in auditorEmails) {
                    const data = auditorEmails[auditorId];
                    let listHtml = '<ul style="padding-left: 20px;">';

                    data.items.forEach(i => {
                        const formatCim = i.kitoltes_neve ? i.kitoltes_neve.replace(/~/g, ' - ').replace(/~/g, '-') : 'Értékelés';
                        // Kivettük a vizsgalt_nev-et, csak a formázott címet írjuk ki
                        listHtml += `<li><strong>${escapeHtml(formatCim)}</strong></li>`;
                    });
                    listHtml += '</ul>';

                    const htmlContentAuditor = `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; line-height: 1.6;">
                            <h2 style="color: #ffaa00;"> ⏰ Közelgő Auditációs Határidők!</h2>
                            <p>Kedves ${escapeHtml(data.nev)}!</p>
                            <p>Tájékoztatjuk, hogy az Ön által auditációra kijelölt alábbi értékelés(ek) határideje <strong style="color: #d9534f;">HOLNAP lejár</strong>:</p>
                            
                            ${listHtml}
                            
                            <br>
                            <p style="background: #fdf7f7; padding: 10px; border-left: 4px solid #ffea00;">
                                <i>Lépjen be a fiókjába! A rendszer felkínálja a hosszabbítás lehetőségét. Ha hagyja őket lejárni, a határidő jelzése egyszerűen lekerül az értékelésekről, és visszakerülnek a normál várakozó státuszba.</i>
                            </p>
                            <p>Jó munkát:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                            <a href="https://www.ertekek.com">www.ertekek.com</a>
                        </div>
                    `;
                    await sendEmail(data.email, "Holnap lejáró határidők - ÉRTÉKEK", htmlContentAuditor);
                }
            }
        } catch (error) {
            console.error('[CRON] Hiba a napi határidő ellenőrzés során:', error);
        }
    });
};