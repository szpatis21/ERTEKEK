const express = require('express');

module.exports = function(db) {
    const router = express.Router();

    const {
        requireLogin,
        attachUserContext,
        requireModuleAccess
    } = require('./security')(db);

const auditProtectedPatterns = [
    /^\/api\/get-audit-messages\/?$/,
    /^\/api\/set-audit-deadline\/?$/,
    /^\/api\/set-audit-init\/?$/,
    /^\/api\/add-audit-message\/?$/,
    /^\/api\/set-audit-status\/?$/
];

const auditAuth = [
    requireLogin,
    attachUserContext,
    requireModuleAccess
];

router.use((req, res, next) => {
    const shouldProtect = auditProtectedPatterns.some(pattern => pattern.test(req.path));
    if (!shouldProtect) return next();

    let index = 0;

    const runNext = (err) => {
        if (err) return next(err);

        const middleware = auditAuth[index++];
        if (!middleware) return next();

        middleware(req, res, runNext);
    };

    runNext();
});

    function toPositiveInt(value) {
        const n = Number(value);
        return Number.isInteger(n) && n > 0 ? n : null;
    }

    function uniquePositiveInts(values) {
        if (!Array.isArray(values)) return [];

        return [...new Set(
            values
                .map(value => Number(value))
                .filter(value => Number.isInteger(value) && value > 0)
        )];
    }

    async function getUserDisplayName(userId) {
        const [rows] = await db.promise().query(
            'SELECT vez FROM felhasznalok WHERE id = ? LIMIT 1',
            [userId]
        );

        return rows?.[0]?.vez || 'Ismeretlen felhasználó';
    }

    function canManageAudit(req) {
        const roleId = Number(req.auth.roleId);
        return roleId === 1 || roleId === 2 || req.auth.isSysadmin === true;
    }

    async function getKitoltesForAudit(req, auditId) {
        const userId = req.auth.userId;
        const modulId = req.auth.modulId;
        const intId = req.auth.intId;
        const roleId = Number(req.auth.roleId);
        const isSysadmin = req.auth.isSysadmin ? 1 : 0;

        const [rows] = await db.promise().query(
            `
            SELECT
                k.id,
                k.idk,
                k.felhasznalo_id,
                k.modul_id,
                k.audit,
                tulaj.int_id AS tulaj_int_id,
                a.user_audit,
                a.user_user,
                a.audit_modul_id,
                a.audit_int_id,
                a.uzenet,
                a.hatarido,
                a.warm
            FROM kitoltesek k
            JOIN felhasznalok tulaj
                ON tulaj.id = k.felhasznalo_id
            LEFT JOIN audit a
                ON a.audit_id = k.id
            WHERE k.id = ?
              AND k.modul_id = ?
            LIMIT 1
            `,
            [auditId, modulId]
        );

        if (!rows.length) return null;

        const row = rows[0];

        const isOwner = Number(row.felhasznalo_id) === Number(userId);
        const isAuditor = Number(row.user_audit) === Number(userId);
        const sameInstitution = Number(row.tulaj_int_id) === Number(intId);
        const isInstitutionAnalyst = (roleId === 1 || roleId === 2) && sameInstitution;
        const sysadminAllowed = isSysadmin === 1;

        row.__access = {
            isOwner,
            isAuditor,
            sameInstitution,
            isInstitutionAnalyst,
            sysadminAllowed,
            canRead: isOwner || isAuditor || isInstitutionAnalyst || sysadminAllowed,
            canManage: isInstitutionAnalyst || sysadminAllowed
        };

        return row;
    }

    async function requireReadableAudit(req, res, auditId) {
        const row = await getKitoltesForAudit(req, auditId);

        if (!row || !row.__access.canRead) {
            res.status(403).json({
                success: false,
                message: 'Nincs jogosultságod ehhez az auditációhoz.'
            });
            return null;
        }

        return row;
    }

    async function requireManageableAudit(req, res, auditId) {
        if (!canManageAudit(req)) {
            res.status(403).json({
                success: false,
                message: 'Nincs jogosultságod auditációs művelethez.'
            });
            return null;
        }

        const row = await getKitoltesForAudit(req, auditId);

        if (!row || !row.__access.canManage) {
            res.status(403).json({
                success: false,
                message: 'Nincs jogosultságod ehhez az auditációs művelethez.'
            });
            return null;
        }

        return row;
    }

    // Üzenetek lekérése egy adott értékeléshez
    router.get('/api/get-audit-messages', async (req, res) => {
        const auditId = toPositiveInt(req.query.kitoltes_id);

        if (!auditId) {
            return res.status(400).json({
                success: false,
                message: 'Hiányzó vagy hibás kitöltés ID.'
            });
        }

        try {
            const accessRow = await requireReadableAudit(req, res, auditId);
            if (!accessRow) return;

            const [rows] = await db.promise().query(
                `
                SELECT
                    a.uzenet,
                    a.hatarido,
                    f1.vez AS auditor_name,
                    f2.vez AS user_name
                FROM audit a
                LEFT JOIN felhasznalok f1
                    ON a.user_audit = f1.id
                LEFT JOIN felhasznalok f2
                    ON a.user_user = f2.id
                WHERE a.audit_id = ?
                  AND a.audit_modul_id = ?
                LIMIT 1
                `,
                [auditId, req.auth.modulId]
            );

            if (rows.length > 0) {
                return res.json({
                    success: true,
                    uzenetek: rows[0].uzenet,
                    auditor_name: rows[0].auditor_name,
                    user_name: rows[0].user_name,
                    hatarido: rows[0].hatarido
                });
            }

            res.json({
                success: true,
                uzenetek: null,
                hatarido: null
            });
        } catch (error) {
            console.error('Hiba az üzenetek lekérésekor:', error);
            res.status(500).json({
                success: false,
                message: 'Szerver hiba.'
            });
        }
    });

    // Határidő beállítása az elemzőtől
    router.post('/api/set-audit-deadline', async (req, res) => {
        const auditId = toPositiveInt(req.body.audit_id);
        const { hatarido } = req.body;

        const userAudit = req.auth.userId;
        const auditModulId = req.auth.modulId;
        const auditIntId = req.auth.intId;

        if (!auditId || !hatarido) {
            return res.status(400).json({
                success: false,
                message: 'Hiányzó vagy hibás adatok.'
            });
        }

        try {
            const accessRow = await requireManageableAudit(req, res, auditId);
            if (!accessRow) return;

            const userUser = accessRow.felhasznalo_id;

            const sqlAudit = `
                INSERT INTO audit
                    (audit_id, user_audit, user_user, audit_modul_id, audit_int_id, hatarido)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    user_audit = VALUES(user_audit),
                    user_user = VALUES(user_user),
                    audit_modul_id = VALUES(audit_modul_id),
                    audit_int_id = VALUES(audit_int_id),
                    hatarido = VALUES(hatarido)
            `;

            await db.promise().query(sqlAudit, [
                auditId,
                userAudit,
                userUser,
                auditModulId,
                auditIntId,
                hatarido
            ]);

            await db.promise().query(
                `
                UPDATE kitoltesek
                SET audit = 1
                WHERE id = ?
                  AND modul_id = ?
                `,
                [auditId, auditModulId]
            );

            res.json({
                success: true,
                message: 'Határidő sikeresen rögzítve.'
            });
        } catch (error) {
            console.error('Hiba a határidő beállításakor:', error);
            res.status(500).json({
                success: false,
                message: 'Adatbázis hiba történt a határidő mentésekor.'
            });
        }
    });

    // Auditáció beállítása
    router.post('/api/set-audit-init', async (req, res) => {
        const auditId = toPositiveInt(req.body.audit_id);
        const { uzenet, hatarido } = req.body;

        const userAudit = req.auth.userId;
        const auditModulId = req.auth.modulId;
        const auditIntId = req.auth.intId;

        if (!auditId || !uzenet) {
            return res.status(400).json({
                success: false,
                message: 'Hiányzó vagy hibás adatok. Üzenet megadása kötelező.'
            });
        }

        try {
            const accessRow = await requireManageableAudit(req, res, auditId);
            if (!accessRow) return;

            const userUser = accessRow.felhasznalo_id;
            const senderName = await getUserDisplayName(userAudit);

            const elsoUzenet = [{
                text: uzenet,
                timestamp: new Date().toISOString(),
                sender_name: senderName,
                sender_type: 'audit'
            }];

            const jsonUzenetDb = JSON.stringify(elsoUzenet);

            await db.promise().query(
                `
                UPDATE kitoltesek
                SET audit = 1
                WHERE id = ?
                  AND modul_id = ?
                `,
                [auditId, auditModulId]
            );

            const sqlAudit = `
                INSERT INTO audit
                    (audit_id, user_audit, user_user, audit_modul_id, audit_int_id, uzenet, hatarido, warm)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    user_audit = VALUES(user_audit),
                    user_user = VALUES(user_user),
                    audit_modul_id = VALUES(audit_modul_id),
                    audit_int_id = VALUES(audit_int_id),
                    uzenet = VALUES(uzenet),
                    hatarido = VALUES(hatarido),
                    warm = VALUES(warm)
            `;

            await db.promise().query(sqlAudit, [
                auditId,
                userAudit,
                userUser,
                auditModulId,
                auditIntId,
                jsonUzenetDb,
                hatarido || null,
                uzenet
            ]);

            res.json({
                success: true,
                message: 'Auditáció sikeresen elindítva.'
            });
        } catch (error) {
            console.error('Hiba az auditáció inicializálásakor:', error);
            res.status(500).json({
                success: false,
                message: 'Szerver hiba történt az auditáció mentésekor.'
            });
        }
    });

    // Új üzenet hozzáadása az auditációhoz
    router.post('/api/add-audit-message', async (req, res) => {
        const auditIds = uniquePositiveInts(req.body.audit_ids);
        const { message } = req.body;

        const userId = req.auth.userId;

        if (!auditIds.length || !message) {
            return res.status(400).json({
                success: false,
                message: 'Hiányzó vagy hibás adatok. ID-k és üzenet szükséges.'
            });
        }

        try {
            const senderName = await getUserDisplayName(userId);
            let updatedCount = 0;

            for (const auditId of auditIds) {
                const accessRow = await requireReadableAudit(req, res, auditId);
                if (!accessRow) return;

                /*
                  A sender_type nem jöhet a kliensből jogosultsági döntésként.
                  Ha a tulajdonos / auditált user ír, akkor user.
                  Ha auditáló vagy jogosult elemző ír, akkor audit.
                */
                const veglegesSenderType =
                    accessRow.__access.isOwner && !accessRow.__access.canManage
                        ? 'user'
                        : 'audit';

                const [rows] = await db.promise().query(
                    `
                    SELECT uzenet
                    FROM audit
                    WHERE audit_id = ?
                      AND audit_modul_id = ?
                    LIMIT 1
                    `,
                    [auditId, req.auth.modulId]
                );

                if (!rows.length) {
                    return res.status(404).json({
                        success: false,
                        message: 'Az auditáció nem található.'
                    });
                }

                let eddigiUzenetek = [];

                if (rows[0].uzenet) {
                    try {
                        eddigiUzenetek =
                            typeof rows[0].uzenet === 'string'
                                ? JSON.parse(rows[0].uzenet)
                                : rows[0].uzenet;

                        if (!Array.isArray(eddigiUzenetek)) {
                            eddigiUzenetek = [];
                        }
                    } catch (e) {
                        eddigiUzenetek = [];
                    }
                }

                const ujUzenetObj = {
                    text: message,
                    timestamp: new Date().toISOString(),
                    sender_name: senderName,
                    sender_type: veglegesSenderType
                };

                eddigiUzenetek.push(ujUzenetObj);
                const ujUzenetJson = JSON.stringify(eddigiUzenetek);

                if (veglegesSenderType === 'user') {
                    await db.promise().query(
                        `
                        UPDATE audit
                        SET uzenet = ?
                        WHERE audit_id = ?
                          AND audit_modul_id = ?
                        `,
                        [ujUzenetJson, auditId, req.auth.modulId]
                    );
                } else {
                    await db.promise().query(
                        `
                        UPDATE audit
                        SET uzenet = ?, warm = ?
                        WHERE audit_id = ?
                          AND audit_modul_id = ?
                        `,
                        [ujUzenetJson, message, auditId, req.auth.modulId]
                    );
                }

                updatedCount++;
            }

            res.json({
                success: true,
                message: 'Üzenet(ek) sikeresen rögzítve.',
                updated: updatedCount
            });
        } catch (error) {
            console.error('Hiba az üzenet küldésekor:', error);
            res.status(500).json({
                success: false,
                message: 'Szerver hiba történt az üzenet mentésekor.'
            });
        }
    });

    // Audit státusz módosítása
    router.post('/api/set-audit-status', async (req, res) => {
        const auditIds = uniquePositiveInts(req.body.audit_ids);
        const newStatus = Number(req.body.new_status);

        if (!auditIds.length || ![1, 2].includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Hiányzó vagy hibás adatok.'
            });
        }

        try {
            let updatedCount = 0;

            for (const auditId of auditIds) {
                const accessRow = await requireManageableAudit(req, res, auditId);
                if (!accessRow) return;

                await db.promise().query(
                    `
                    UPDATE kitoltesek
                    SET audit = ?
                    WHERE id = ?
                      AND modul_id = ?
                    `,
                    [newStatus, auditId, req.auth.modulId]
                );

                if (newStatus === 2) {
                    await db.promise().query(
                        `
                        UPDATE audit
                        SET warm = NULL
                        WHERE audit_id = ?
                          AND audit_modul_id = ?
                        `,
                        [auditId, req.auth.modulId]
                    );
                }

                updatedCount++;
            }

            res.json({
                success: true,
                message: 'Státusz sikeresen módosítva.',
                updated: updatedCount
            });
        } catch (error) {
            console.error('Hiba az audit státusz váltásakor:', error);
            res.status(500).json({
                success: false,
                message: 'Szerver hiba történt a státusz frissítésekor.'
            });
        }
    });

    return router;
};