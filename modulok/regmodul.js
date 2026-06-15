const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


const ROLE_ADMIN = 1;
const ROLE_ELEMZO = 2;
const ROLE_ERTEKELO = 3;

function parseIdList(value) {
    if (Array.isArray(value)) {
        return value
            .map(Number)
            .filter(id => Number.isInteger(id) && id > 0);
    }

    return String(value ?? "")
        .split(",")
        .map(s => Number(String(s).trim()))
        .filter(id => Number.isInteger(id) && id > 0);
}

function uniqueNumbers(values) {
    return [...new Set(
        values
            .map(Number)
            .filter(id => Number.isInteger(id) && id > 0)
    )];
}

function normalizePackageCode(value, modulTipus = 'meglevo') {
    const raw = String(value || '').trim().toLowerCase();
    if (['demo', 'start', 'pro', 'sajat', 'fenntartoi'].includes(raw)) return raw;
    if (modulTipus === 'ures') return 'sajat';
    return 'start';
}

function packageMaxUsers(code, fallback) {
    const n = Number(fallback);
    const defaults = { demo: 1, start: 5, pro: 20, sajat: 5, fenntartoi: 50 };
    if (Number.isInteger(n) && n > 0) return n;
    return defaults[code] || 5;
}

function shouldGetUploaderRole(packageCode, modulTipus) {
    return modulTipus === 'ures' || packageCode === 'sajat' || packageCode === 'fenntartoi';
}
function getAllowedRolesForPackage(packageCode) {
    const code = normalizePackageCode(packageCode);

    if (code === 'demo' || code === 'start') {
        return [ROLE_ERTEKELO];
    }

    if (code === 'pro') {
        return [ROLE_ERTEKELO, ROLE_ELEMZO];
    }

    if (code === 'sajat' || code === 'fenntartoi') {
        return [ROLE_ADMIN, ROLE_ERTEKELO, ROLE_ELEMZO];
    }

    return [ROLE_ERTEKELO];
}
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
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
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


const REGISTRATION_NOTIFY_EMAIL = process.env.REGISTRATION_NOTIFY_EMAIL || 'ertekek.info@gmail.com';

const FALLBACK_PACKAGES = {
    demo: { kod: 'demo', nev: 'Demo', ar_havi: 0, ar_negyedeves: 0, ar_eves: 0, max_felhasznalo: 1, max_ertekelo: 1, max_elemzo: 0, max_feltolto: 0 },
    start: { kod: 'start', nev: 'Értékek Start', ar_havi: 18900, ar_negyedeves: 75000, ar_eves: 222000, max_felhasznalo: 2, max_ertekelo: 2, max_elemzo: 0, max_feltolto: 0 },
    pro: { kod: 'pro', nev: 'Értékek Pro', ar_havi: 24900, ar_negyedeves: 139000, ar_eves: 279000, max_felhasznalo: 5, max_ertekelo: 3, max_elemzo: 2, max_feltolto: 0 },
    sajat: { kod: 'sajat', nev: 'Értékek Saját Rendszer', ar_havi: 19900, ar_negyedeves: 79000, ar_eves: 189000, max_felhasznalo: 3, max_ertekelo: 0, max_elemzo: 0, max_feltolto: 3 },
    fenntartoi: { kod: 'fenntartoi', nev: 'Fenntartói csomag', ar_havi: 0, ar_negyedeves: 0, ar_eves: 0, max_felhasznalo: 50, max_ertekelo: 30, max_elemzo: 10, max_feltolto: 10 }
};

const EXTRA_USER_PRICES = {
    demo: { havi: 0, negyedeves: 0, eves: 0 },
    start: { havi: 4500, negyedeves: 12500, eves: 45000 },
    pro: { havi: 6500, negyedeves: 18000, eves: 65000 },
    sajat: { havi: 6500, negyedeves: 18000, eves: 65000 },
    fenntartoi: { havi: 0, negyedeves: 0, eves: 0 }
};

function formatFt(value) {
    return `${new Intl.NumberFormat('hu-HU').format(Number(value || 0))} Ft`;
}

function sanitizeBillingPeriod(value) {
    const raw = String(value || '').toLowerCase();
    return ['havi', 'negyedeves', 'eves'].includes(raw) ? raw : 'havi';
}

function getPackagePrice(pkg, period) {
    if (period === 'eves') return Number(pkg.ar_eves || 0);
    if (period === 'negyedeves') return Number(pkg.ar_negyedeves || 0);
    return Number(pkg.ar_havi || 0);
}

function normalizePackageRow(row, code) {
    const fallback = FALLBACK_PACKAGES[code] || FALLBACK_PACKAGES.start;
    return {
        ...fallback,
        ...(row || {}),
        kod: code,
        nev: row?.nev || fallback.nev,
        ar_havi: Number(row?.ar_havi ?? fallback.ar_havi ?? 0),
        ar_negyedeves: Number(row?.ar_negyedeves ?? fallback.ar_negyedeves ?? 0),
        ar_eves: Number(row?.ar_eves ?? fallback.ar_eves ?? 0),
        max_felhasznalo: Number(row?.max_felhasznalo ?? fallback.max_felhasznalo ?? 1),
        max_ertekelo: Number(row?.max_ertekelo ?? fallback.max_ertekelo ?? 0),
        max_elemzo: Number(row?.max_elemzo ?? fallback.max_elemzo ?? 0),
        max_feltolto: Number(row?.max_feltolto ?? fallback.max_feltolto ?? 0)
    };
}

function calculateRegistrationPricing(packageRow, packageCode, requestedPeriod, requestedExtraUsers) {
    const csomagKod = normalizePackageCode(packageCode);
    const pkg = normalizePackageRow(packageRow, csomagKod);
    const period = csomagKod === 'demo' ? 'demo' : sanitizeBillingPeriod(requestedPeriod);
    const extraUsersRaw = Number(requestedExtraUsers || 0);
    const extraUsers = csomagKod === 'demo' ? 0 : Math.max(0, Math.min(20, Number.isInteger(extraUsersRaw) ? extraUsersRaw : 0));
    const baseUsers = Number(pkg.max_felhasznalo || 1);
    const basePrice = csomagKod === 'demo' ? 0 : getPackagePrice(pkg, period);
    const extraUnitPrice = csomagKod === 'demo' ? 0 : Number(EXTRA_USER_PRICES[csomagKod]?.[period] || 0);
    const extraPrice = extraUsers * extraUnitPrice;
    const totalPrice = basePrice + extraPrice;

    return {
        csomagKod,
        packageName: pkg.nev,
        period,
        baseUsers,
        extraUsers,
        totalUsers: baseUsers + extraUsers,
        basePrice,
        extraUnitPrice,
        extraPrice,
        totalPrice,
        max_ertekelo: pkg.max_ertekelo,
        max_elemzo: pkg.max_elemzo,
        max_feltolto: pkg.max_feltolto
    };
}

function normalizePackageRequestType(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (['user_expansion', 'felhasznalo_bovites', 'users', 'extra_users'].includes(raw)) return 'user_expansion';
    if (['custom_material_addon', 'sajat_plusz', 'sajat_szakmai_anyag', 'addon_sajat'].includes(raw)) return 'custom_material_addon';
    if (['permission_upgrade', 'jogosultsag_bovites', 'role_upgrade', 'szerepkor_bovites', 'rights_upgrade'].includes(raw)) return 'permission_upgrade';
    return 'package_change';
}

function packageRequestTypeLabel(type) {
    if (type === 'user_expansion') return 'Felhasználói keret bővítése';
    if (type === 'custom_material_addon') return 'Saját szakmai anyag plusz szolgáltatás';
    if (type === 'permission_upgrade') return 'Jogosultság bővítési kérelem';
    return 'Csomagváltás';
}

function normalizeExtraUserCount(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(20, Math.floor(n)));
}

function calculateChangeRequestPricing({ packageRow, packageCode, requestedPeriod, requestedExtraUsers, currentMaxUsers, requestType }) {
    const csomagKod = normalizePackageCode(packageCode);
    const pkg = normalizePackageRow(packageRow, csomagKod);
    const period = csomagKod === 'demo' ? 'demo' : sanitizeBillingPeriod(requestedPeriod);
    const currentUsers = Math.max(1, Number(currentMaxUsers || 0) || Number(pkg.max_felhasznalo || 1));
    const extraUsers = normalizeExtraUserCount(requestedExtraUsers);
    const extraUnitPrice = csomagKod === 'demo' ? 0 : Number(EXTRA_USER_PRICES[csomagKod]?.[period] || 0);

    if (requestType === 'user_expansion') {
        const extraPrice = extraUsers * extraUnitPrice;
        return {
            csomagKod,
            packageName: `${pkg.nev} - felhasználói keret bővítés`,
            period,
            baseUsers: currentUsers,
            extraUsers,
            totalUsers: currentUsers + extraUsers,
            basePrice: 0,
            extraUnitPrice,
            extraPrice,
            totalPrice: extraPrice,
            max_ertekelo: pkg.max_ertekelo,
            max_elemzo: pkg.max_elemzo,
            max_feltolto: pkg.max_feltolto
        };
    }

    if (requestType === 'permission_upgrade') {
        return {
            csomagKod,
            packageName: 'Jogosultság bővítési kérelem',
            period,
            baseUsers: currentUsers,
            extraUsers: 0,
            totalUsers: currentUsers,
            basePrice: 0,
            extraUnitPrice: 0,
            extraPrice: 0,
            totalPrice: 0,
            max_ertekelo: pkg.max_ertekelo,
            max_elemzo: pkg.max_elemzo,
            max_feltolto: pkg.max_feltolto
        };
    }

    if (requestType === 'custom_material_addon') {
        const basePrice = getPackagePrice(pkg, period);
        return {
            csomagKod,
            packageName: 'Saját szakmai anyag plusz szolgáltatás',
            period,
            baseUsers: currentUsers,
            extraUsers: 0,
            totalUsers: currentUsers,
            basePrice,
            extraUnitPrice: 0,
            extraPrice: 0,
            totalPrice: basePrice,
            max_ertekelo: pkg.max_ertekelo,
            max_elemzo: pkg.max_elemzo,
            max_feltolto: pkg.max_feltolto
        };
    }

    return calculateRegistrationPricing(packageRow, csomagKod, period, extraUsers);
}

async function generateInstitutionCode(q, packageCode) {
    const prefixMap = { demo: 'DEMO', start: 'START', pro: 'PRO', sajat: 'SAJAT', fenntartoi: 'FENNT' };
    const prefix = prefixMap[packageCode] || 'ERTEK';
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (let i = 0; i < 8; i += 1) {
        const randomPart = crypto.randomBytes(5).toString('hex').toUpperCase();
        const code = `${prefix}-${datePart}-${randomPart}`;
        const rows = await q('SELECT id FROM intezmeny WHERE intreg = ? LIMIT 1', [code]);
        if (!rows.length) return code;
    }

    throw new Error('Nem sikerült egyedi intézményi regisztrációs kódot generálni.');
}

function buildInstitutionNotificationHtml({ type, institutionName, contactName, contactEmail, phone, address, taxNumber, packageName, packageCode, registrationCode, pricing, moduleText, aiEnabled }) {
    const priceLine = pricing.totalPrice > 0
        ? `<p><strong>Fizetendő:</strong> ${escapeHtml(formatFt(pricing.totalPrice))} (${escapeHtml(pricing.period)}). Díjbekérő készítendő.</p>`
        : '<p><strong>Fizetendő:</strong> 0 Ft / demo.</p>';

    return `
        <div style="font-family: Arial, sans-serif; color:#222; line-height:1.55;">
            <h2>Új intézményi regisztráció - ÉRTÉKEK</h2>
            <p><strong>Típus:</strong> ${escapeHtml(type)}</p>
            <p><strong>Intézmény:</strong> ${escapeHtml(institutionName)}</p>
            <p><strong>Adószám:</strong> ${escapeHtml(taxNumber)}</p>
            <p><strong>Cím:</strong> ${escapeHtml(address)}</p>
            <p><strong>Kapcsolattartó:</strong> ${escapeHtml(contactName)} &lt;${escapeHtml(contactEmail)}&gt; ${escapeHtml(phone || '')}</p>
            <p><strong>Csomag:</strong> ${escapeHtml(packageName)} (${escapeHtml(packageCode)})</p>
            <p><strong>Regisztrációs kód:</strong> ${escapeHtml(registrationCode)}</p>
            <p><strong>Felhasználói keret:</strong> alap ${pricing.baseUsers}, plusz ${pricing.extraUsers}, összesen ${pricing.totalUsers}</p>
            <p><strong>Alapár:</strong> ${escapeHtml(formatFt(pricing.basePrice))}</p>
            <p><strong>Plusz felhasználók ára:</strong> ${pricing.extraUsers} × ${escapeHtml(formatFt(pricing.extraUnitPrice))} = ${escapeHtml(formatFt(pricing.extraPrice))}</p>
            ${priceLine}
            <p><strong>Modul / rendszer:</strong> ${escapeHtml(moduleText)}</p>
            <p><strong>MI:</strong> ${aiEnabled ? 'engedélyezve' : 'kikapcsolva'}</p>
            ${pricing.totalPrice > 0 ? '<p><strong>Teendő:</strong> állj neki díjbekérőt készíteni.</p>' : ''}
        </div>
    `;
}



function buildPackageChangeNotificationHtml({ institution, requester, pricing, currentPackageCode, currentPeriod, requestType, requestTypeLabel, note }) {
    const priceLine = pricing.totalPrice > 0
        ? `<p><strong>Várható fizetendő:</strong> ${escapeHtml(formatFt(pricing.totalPrice))} (${escapeHtml(pricing.period)}). Díjbekérő készítendő.</p>`
        : '<p><strong>Várható fizetendő:</strong> 0 Ft.</p>';
    const actionLine = requestType === 'custom_material_addon'
        ? 'egyeztetés / díjbekérő után a saját szakmai anyag plusz szolgáltatást külön kell kezelni. A meglévő csomagot ez a kérelem nem írja át automatikusan.'
        : requestType === 'permission_upgrade'
            ? 'jogosultság ellenőrzése és kézi szerepkörmódosítás szükséges. Ez a kérelem nem csomagváltás.'
            : 'díjbekérő / szerződés / fizetés után sysadmin aktiválás. Aktiváláskor az intézményi felhasználói keret is frissül.';

    return `
        <div style="font-family: Arial, sans-serif; color:#222; line-height:1.55;">
            <h2>Csomagváltási / csomagbővítési kérelem - ÉRTÉKEK</h2>
            <p><strong>Kérelem típusa:</strong> ${escapeHtml(requestTypeLabel || 'Csomagváltás')}</p>
            <p><strong>Intézmény:</strong> ${escapeHtml(institution.intnev)}</p>
            <p><strong>Intézmény ID:</strong> ${escapeHtml(institution.id)}</p>
            <p><strong>Adószám:</strong> ${escapeHtml(institution.intado || '')}</p>
            <p><strong>Jelenlegi csomag:</strong> ${escapeHtml(currentPackageCode || 'nincs adat')} / ${escapeHtml(currentPeriod || 'nincs adat')}</p>
            <p><strong>Kért cél / szolgáltatás:</strong> ${escapeHtml(pricing.packageName)} (${escapeHtml(pricing.csomagKod)})</p>
            <p><strong>Fizetési időszak:</strong> ${escapeHtml(pricing.period)}</p>
            <p><strong>Felhasználói keret:</strong> alap ${pricing.baseUsers}, plusz ${pricing.extraUsers}, összesen ${pricing.totalUsers}</p>
            <p><strong>Alapár:</strong> ${escapeHtml(formatFt(pricing.basePrice))}</p>
            <p><strong>Plusz felhasználók ára:</strong> ${pricing.extraUsers} × ${escapeHtml(formatFt(pricing.extraUnitPrice))} = ${escapeHtml(formatFt(pricing.extraPrice))}</p>
            ${priceLine}
            <p><strong>Kérelmező:</strong> ${escapeHtml(requester.vez || requester.fnev || 'Ismeretlen')} &lt;${escapeHtml(requester.mail || '')}&gt;</p>
            ${note ? `<p><strong>Megjegyzés:</strong> ${escapeHtml(note)}</p>` : ''}
            <p><strong>Teendő:</strong> ${escapeHtml(actionLine)}</p>
        </div>
    `;
}

function buildPackageChangeUserHtml({ institutionName, pricing, requestType, requestTypeLabel }) {
    const paymentText = pricing.totalPrice > 0
        ? `<p><strong>Várható összeg:</strong> ${escapeHtml(formatFt(pricing.totalPrice))} (${escapeHtml(pricing.period)}).</p><p>Ez még nem díjbekérő. A díjbekérővel vagy az egyeztetéssel külön jelentkezünk.</p>`
        : '<p>A kért kérelemhez jelenleg nem tartozik automatikus fizetési kötelezettség.</p>';
    const closingText = requestType === 'custom_material_addon'
        ? 'A jelenlegi csomagot ez a kérelem nem írja át automatikusan. A saját szakmai anyag plusz szolgáltatás részleteiről külön egyeztetés szükséges.'
        : requestType === 'permission_upgrade'
            ? 'A jogosultság csak jóváhagyás és kézi beállítás után változik. A kérelem nem jelent automatikus szerepkörmódosítást.'
            : 'A változás csak szerződés, fizetés és üzemeltetői aktiválás után lép életbe.';

    return `
        <div style="font-family: Arial, sans-serif; color:#333; line-height:1.55;">
            <h2 style="color:#ff7c00;">Kérelmét rögzítettük</h2>
            <p>Kedves ${escapeHtml(institutionName)}!</p>
            <p>Az alábbi kérelmet rögzítettük:</p>
            <p><strong>${escapeHtml(requestTypeLabel || 'Csomagváltás')}</strong></p>
            <p><strong>${escapeHtml(pricing.packageName)}</strong></p>
            <p><strong>Felhasználói keret:</strong> ${pricing.totalUsers} fő</p>
            ${paymentText}
            <p>${escapeHtml(closingText)}</p>
            <p>Üdvözlettel,<br><strong>Az ÉRTÉKEK csapata</strong></p>
        </div>
    `;
}

function buildUserNotificationHtml({ institutionName, userName, userEmail, roleName }) {
    return `
        <div style="font-family: Arial, sans-serif; color:#222; line-height:1.55;">
            <h2>Új felhasználói regisztráció - ÉRTÉKEK</h2>
            <p><strong>Intézmény:</strong> ${escapeHtml(institutionName)}</p>
            <p><strong>Felhasználó:</strong> ${escapeHtml(userName)}</p>
            <p><strong>E-mail:</strong> ${escapeHtml(userEmail)}</p>
            <p><strong>Szerepkör:</strong> ${escapeHtml(roleName)}</p>
        </div>
    `;
}


function regi(db) 

{   //Regisztráció fajták
  const logger = require('./logmodul')(db);

const {
    q,
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    requireRole,
    requireActiveLicense
} = require('./security')(db);

function extractPendingRequestType(note = '') {
    const match = String(note || '').match(/Kérelem típusa:\s*([^\n]+)/i);
    return normalizePackageRequestType(match ? match[1] : 'package_change');
}

function formatPendingChangeRequest(row = {}) {
    const requestType = extractPendingRequestType(row.megjegyzes || '');
    return {
        id: row.id,
        statusz: row.statusz,
        requestType,
        requestTypeLabel: packageRequestTypeLabel(requestType),
        csomagKod: row.csomag_kod || '',
        packageName: row.csomag_nev || row.csomag_kod || 'Folyamatban lévő kérelem',
        maxFelhasznalo: row.max_felhasznalo || null
    };
}

router.post('/api/package-change-request', requireLogin, attachUserContext, async (req, res) => {
    try {
        const requestType = normalizePackageRequestType(req.body.kerelemTipus || req.body.requestType || req.body.tipus);
        const rawPackageCode = String(req.body.csomagKod || req.body.packageCode || '').trim().toLowerCase();
        const fizetesiIdoszak = sanitizeBillingPeriod(req.body.fizetesiIdoszak || req.body.billing || 'havi');
        const extraFelhasznalo = normalizeExtraUserCount(req.body.extraFelhasznalo || req.body.pluszFelhasznalo || 0);
        const note = String(req.body.megjegyzes || '').trim().slice(0, 800);

        const userRows = await q(
            `
            SELECT
                f.id,
                f.fnev,
                f.vez,
                f.mail,
                f.role_id,
                i.id AS intezmeny_id,
                i.intnev,
                i.intado,
                i.intkapvez,
                i.intkapmail,
                i.intkaptel,
                i.intfo,
                i.csomag_kod,
                i.idoszak,
                i.sysadmin_megjegyzes
            FROM felhasznalok f
            JOIN intezmeny i ON i.id = f.int_id
            WHERE f.id = ?
            LIMIT 1
            `,
            [req.auth.userId]
        );

        if (!userRows.length) {
            return res.status(404).json({
                success: false,
                message: 'Nem található intézményi fiók a kérelemhez.'
            });
        }

        const row = userRows[0];
        const institution = {
            id: Number(row.intezmeny_id),
            intnev: row.intnev,
            intado: row.intado,
            intkapmail: row.intkapmail,
            intkapvez: row.intkapvez,
            intkaptel: row.intkaptel
        };

        const currentPackageCode = normalizePackageCode(row.csomag_kod || row.idoszak);
        const currentMaxUsers = Math.max(1, Number(row.intfo || 0) || packageMaxUsers(currentPackageCode, 0));

        const pendingRows = await q(
            `
            SELECT e.id, e.statusz, e.max_felhasznalo, e.megjegyzes,
                   c.kod AS csomag_kod, c.nev AS csomag_nev
            FROM elofizetesek e
            LEFT JOIN csomagok c ON c.id = e.csomag_id
            WHERE e.tulajdonos_tipus = 'institution'
              AND e.intezmeny_id = ?
              AND e.aktiv = 0
              AND e.statusz IN ('pending', 'pending_request')
            ORDER BY e.id DESC
            LIMIT 1
            `,
            [institution.id]
        );

        if (pendingRows.length) {
            return res.status(409).json({
                success: false,
                message: 'Már van folyamatban lévő csomagváltási, bővítési vagy jogosultsági kérelem. Új kérelmet csak a sysadmin oldali jóváhagyás, elutasítás vagy lezárás után lehet indítani.',
                pendingRequest: formatPendingChangeRequest(pendingRows[0])
            });
        }

        let requestedPackageCode = rawPackageCode ? normalizePackageCode(rawPackageCode) : currentPackageCode;

        if (requestType === 'user_expansion') {
            requestedPackageCode = currentPackageCode;
            if (currentPackageCode === 'demo') {
                return res.status(400).json({
                    success: false,
                    message: 'Demo hozzáférésnél felhasználói keret nem bővíthető. Előbb Start vagy Pro csomagot kell kérni.'
                });
            }
            if (extraFelhasznalo < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'A felhasználói keret bővítéséhez legalább 1 plusz felhasználót kell megadni.'
                });
            }
        } else if (requestType === 'custom_material_addon') {
            requestedPackageCode = 'sajat';
            if (currentPackageCode === 'demo') {
                return res.status(400).json({
                    success: false,
                    message: 'Demo hozzáféréshez saját szakmai anyag plusz szolgáltatás nem kérhető. Előbb aktív Start vagy Pro csomag szükséges.'
                });
            }
            if (currentPackageCode === 'sajat') {
                return res.status(400).json({
                    success: false,
                    message: 'Ehhez az intézményhez már Saját rendszer csomag tartozik.'
                });
            }
        } else if (requestType === 'permission_upgrade') {
            requestedPackageCode = currentPackageCode || 'start';
        } else {
            if (!rawPackageCode) {
                return res.status(400).json({ success: false, message: 'Hiányzó csomagkód.' });
            }
            if (!['start', 'pro', 'sajat'].includes(requestedPackageCode)) {
                return res.status(400).json({
                    success: false,
                    message: 'Meglévő intézményhez Demo csomag nem kérhető. Válasszon Start, Pro vagy Saját rendszer csomagot.'
                });
            }
            if (requestedPackageCode === currentPackageCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Ez már a jelenlegi csomag. Felhasználói keret bővítéséhez a külön bővítési opciót használja.'
                });
            }
        }

        const packageRows = await q(
            `
            SELECT id, kod, nev, ar_havi, ar_negyedeves, ar_eves,
                   max_felhasznalo, max_ertekelo, max_elemzo, max_feltolto
            FROM csomagok
            WHERE kod = ? AND aktiv = 1
            LIMIT 1
            `,
            [requestedPackageCode]
        );

        const packageRow = packageRows[0] || FALLBACK_PACKAGES[requestedPackageCode] || FALLBACK_PACKAGES.start;
        const pricing = calculateChangeRequestPricing({
            packageRow,
            packageCode: requestedPackageCode,
            requestedPeriod: fizetesiIdoszak,
            requestedExtraUsers: extraFelhasznalo,
            currentMaxUsers,
            requestType
        });
        const requestTypeLabel = packageRequestTypeLabel(requestType);

        const requestedAt = new Date().toISOString();
        const requestNote = [
            `Kérelem típusa: ${requestType}`,
            `Kérelem megnevezése: ${requestTypeLabel}`,
            `Kérelem rögzítve: ${requestedAt}`,
            `Kérelmező: ${row.vez || row.fnev || 'ismeretlen'} <${row.mail || ''}>`,
            `Jelenlegi csomag: ${currentPackageCode || 'nincs adat'} / ${row.idoszak || 'nincs adat'}`,
            `Jelenlegi felhasználói keret: ${currentMaxUsers} fő`,
            `Kért cél / szolgáltatás: ${pricing.packageName} (${pricing.csomagKod})`,
            `Fizetési időszak: ${pricing.period}`,
            requestType === 'user_expansion' ? `Kért plusz felhasználó: ${pricing.extraUsers} fő` : '',
            `Kért felhasználói keret aktiválás után: ${pricing.totalUsers} fő`,
            requestType === 'custom_material_addon' ? 'Megjegyzés: a saját szakmai anyag plusz szolgáltatásként lett kérve, nem automatikus csomagváltásként.' : '',
            requestType === 'permission_upgrade' ? 'Megjegyzés: jogosultság bővítési kérelem, nem csomagváltás és nem automatikus szerepkörmódosítás.' : '',
            `Fizetendő összesen: ${formatFt(pricing.totalPrice)}`,
            note ? `Felhasználói megjegyzés: ${note}` : ''
        ].filter(Boolean).join('\n');

        await q(
            `
            UPDATE intezmeny
            SET sysadmin_megjegyzes = CONCAT(
                COALESCE(sysadmin_megjegyzes, ''),
                CASE WHEN COALESCE(sysadmin_megjegyzes, '') = '' THEN '' ELSE '\n\n' END,
                ?
            )
            WHERE id = ?
            `,
            [requestNote, institution.id]
        );

        const csomagId = Number(packageRow.id || packageRows[0]?.id || 0);
        const shouldCreateSubscriptionRow = csomagId > 0;
        const pendingStatusz = ['custom_material_addon', 'permission_upgrade'].includes(requestType) ? 'pending_request' : 'pending';
        let pendingRequest = null;
        if (shouldCreateSubscriptionRow) {
            const insertPendingResult = await q(
                `
                INSERT INTO elofizetesek
                (csomag_id, tulajdonos_tipus, intezmeny_id, user_id, statusz,
                 trial_indul, trial_lejar, licenc_kezdete, licenc_vege,
                 szerzodes_visszaerkezett, fizetes_beerkezett, aktiv,
                 max_felhasznalo, max_ertekelo, max_elemzo, max_feltolto, megjegyzes)
                VALUES (?, 'institution', ?, NULL, ?, NULL, NULL, NULL, NULL, 0, 0, 0, ?, ?, ?, ?, ?)
                `,
                [
                    csomagId,
                    institution.id,
                    pendingStatusz,
                    pricing.totalUsers,
                    pricing.max_ertekelo,
                    pricing.max_elemzo,
                    pricing.max_feltolto,
                    requestNote
                ]
            );

            pendingRequest = {
                id: insertPendingResult.insertId,
                statusz: pendingStatusz,
                requestType,
                requestTypeLabel,
                csomagKod: pricing.csomagKod,
                packageName: pricing.packageName,
                maxFelhasznalo: pricing.totalUsers
            };
        }

        logger(req, req.auth.userId, requestTypeLabel, {
            int_id: institution.id,
            request_type: requestType,
            current_package: currentPackageCode,
            requested_package: pricing.csomagKod,
            period: pricing.period,
            extra_users: pricing.extraUsers,
            total_users: pricing.totalUsers,
            total_price: pricing.totalPrice
        });

        sendEmail(
            REGISTRATION_NOTIFY_EMAIL,
            `${requestTypeLabel} - ${pricing.packageName} - ${institution.intnev}`,
            buildPackageChangeNotificationHtml({
                institution,
                requester: row,
                pricing,
                currentPackageCode,
                currentPeriod: row.idoszak,
                requestType,
                requestTypeLabel,
                note
            })
        );

        const userRecipient = row.intkapmail || row.mail;
        sendEmail(
            userRecipient,
            `${requestTypeLabel} rögzítve - ÉRTÉKEK`,
            buildPackageChangeUserHtml({
                institutionName: institution.intnev,
                pricing,
                requestType,
                requestTypeLabel
            })
        );

        const message = requestType === 'custom_material_addon'
            ? 'A saját szakmai anyag plusz szolgáltatási kérelmet rögzítettük. Ez nem írja át automatikusan a jelenlegi csomagot; üzemeltetői egyeztetés szükséges.'
            : requestType === 'permission_upgrade'
                ? 'A jogosultság bővítési kérelmet rögzítettük. A szerepkörök csak intézményi vagy üzemeltetői jóváhagyás után változnak.'
                : requestType === 'user_expansion'
                    ? 'A felhasználói keret bővítési kérelmet rögzítettük. Az új keret csak fizetés és üzemeltetői aktiválás után lép életbe.'
                    : 'A csomagváltási kérelmet rögzítettük. Az aktív csomag csak szerződés, fizetés és üzemeltetői aktiválás után változik meg.';

        return res.json({
            success: true,
            message,
            requestType,
            requestTypeLabel,
            requestedPackage: pricing.csomagKod,
            packageName: pricing.packageName,
            fizetesiIdoszak: pricing.period,
            fizetendoOsszeg: pricing.totalPrice,
            extraFelhasznalo: pricing.extraUsers,
            osszesFelhasznalo: pricing.totalUsers,
            currentMaxUsers,
            pendingRequest
        });

    } catch (err) {
        console.error('[package-change-request hiba]', err);
        return res.status(500).json({
            success: false,
            message: 'A kérelem rögzítése sikertelen.'
        });
    }
});

// Intézmény regisztráció
router.post('/register/institution', async (req, res) => {
    try {
        const {
            intv,
            intirv,
            orszv,
            szekhelyv,
            adoszv,
            cimv,
            vez2v,
            mail2v,
            tel2v,
            intmod,
            modulTipus = "meglevo",
            ujModulNev = "",
            ujModulLeiras = "",
            szamolas = null,
            aiEnabled = false,
            csomagKod: rawCsomagKod = '',
            packageCode = '',
            fizetesiIdoszak = 'havi',
            extraFelhasznalo = 0
        } = req.body;

        const mailCegv = mail2v;
        const telCegv = tel2v;
        const uresModul = modulTipus === "ures";

        if (!intv || !adoszv || !cimv || !vez2v || !mail2v) {
            return res.status(400).json({ message: 'Hiányzó intézményi regisztrációs adatok.' });
        }

        if (!rawCsomagKod && !packageCode && !uresModul) {
            return res.status(400).json({ message: 'Válasszon csomagot a regisztrációhoz.' });
        }

        const csomagKod = normalizePackageCode(rawCsomagKod || packageCode, modulTipus);
        const szamolasErtek = Number(szamolas);
        const aiEnabledErtek = aiEnabled === true || aiEnabled === 1 || aiEnabled === '1' ? 1 : 0;

        if (uresModul) {
            if (!ujModulNev.trim() || !ujModulLeiras.trim() || ![0, 1].includes(szamolasErtek)) {
                return res.status(400).json({
                    message: "Üres értékelő rendszer esetén a modul nevét, leírását és számítási módját is meg kell adni."
                });
            }
        }

        const duplicateRows = await q(
            'SELECT id FROM intezmeny WHERE intnev = ? OR intado = ? LIMIT 1',
            [intv, adoszv]
        );

        if (duplicateRows.length) {
            return res.status(400).json({ message: 'Ezzel az intézmény névvel vagy adószámmal már regisztráltak.' });
        }

        const packageRows = await q(
            `
            SELECT id, kod, nev, ar_havi, ar_negyedeves, ar_eves,
                   max_felhasznalo, max_ertekelo, max_elemzo, max_feltolto
            FROM csomagok
            WHERE kod = ? AND aktiv = 1
            LIMIT 1
            `,
            [csomagKod]
        );

        const packageRow = packageRows[0] || FALLBACK_PACKAGES[csomagKod] || FALLBACK_PACKAGES.start;
        const pricing = calculateRegistrationPricing(packageRow, csomagKod, fizetesiIdoszak, extraFelhasznalo);

        const ipCim = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Ismeretlen';
        const aktualisIdoszak = csomagKod === 'demo' ? 'demo' : 'pending';
        const intreg = await generateInstitutionCode(q, csomagKod);
        const indulasiIntmod = uresModul ? "" : String(intmod || "1");
        const moduleText = uresModul
            ? `Üres értékelő rendszer: ${ujModulNev.trim()}`
            : `Kész szakmai anyag: ${indulasiIntmod}`;

        const sysadminMegjegyzes = [
            `Regisztráció: ${new Date().toISOString()}`,
            `Csomag: ${pricing.packageName} (${pricing.csomagKod})`,
            `Fizetési időszak: ${pricing.period}`,
            `Alapár: ${formatFt(pricing.basePrice)}`,
            `Plusz felhasználó: ${pricing.extraUsers} fő, ${formatFt(pricing.extraPrice)}`,
            `Fizetendő összesen: ${formatFt(pricing.totalPrice)}`,
            pricing.totalPrice > 0 ? 'Nem díjbekérő, díjbekérő küldendő.' : 'Demo / nincs fizetési kötelezettség.'
        ].join('\n');

        const insertInstitutionResult = await q(
            `
            INSERT INTO intezmeny
            (intnev, intir, intor, intszek, intado, intcim, intmail, inttel,
             intkapvez, intkapmail, intkaptel, intfin, intfo, intmod, intreg,
             validalva, fizetve, ip_cim, user_agent, idoszak, ai_enabled, csomag_kod,
             aktiv, szerzodes_visszaerkezett, fizetes_beerkezett, sysadmin_megjegyzes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, NULL, ?, ?, ?, ?, ?, 0, 0, 0, ?)
            `,
            [
                intv,
                intirv,
                orszv,
                szekhelyv,
                adoszv,
                cimv,
                mailCegv,
                telCegv,
                vez2v,
                mail2v,
                tel2v,
                csomagKod === 'demo' ? 3 : 0,
                pricing.totalUsers,
                indulasiIntmod,
                intreg,
                ipCim,
                userAgent,
                aktualisIdoszak,
                aiEnabledErtek,
                csomagKod,
                sysadminMegjegyzes
            ]
        );

        const intezmenyId = insertInstitutionResult.insertId;
        let ujModulId = null;

        if (uresModul) {
            const insertModulResult = await q(
                `
                INSERT INTO modulok
                (nev, leiras, szamolas)
                VALUES (?, ?, ?)
                `,
                [ujModulNev.trim(), ujModulLeiras.trim(), szamolasErtek]
            );

            ujModulId = insertModulResult.insertId;

            await q(
                'UPDATE intezmeny SET intmod = ? WHERE id = ?',
                [String(ujModulId), intezmenyId]
            );
        }

        const csomagId = Number(packageRow.id || packageRows[0]?.id || 0);
        if (csomagId > 0) {
            await q(
                `
                INSERT INTO elofizetesek
                (csomag_id, tulajdonos_tipus, intezmeny_id, user_id, statusz,
                 trial_indul, trial_lejar, licenc_kezdete, licenc_vege,
                 szerzodes_visszaerkezett, fizetes_beerkezett, aktiv,
                 max_felhasznalo, max_ertekelo, max_elemzo, max_feltolto, megjegyzes)
                VALUES (?, 'institution', ?, NULL, ?, NULL, NULL, NULL, NULL, 0, 0, 1, ?, ?, ?, ?, ?)
                `,
                [
                    csomagId,
                    intezmenyId,
                    csomagKod === 'demo' ? 'demo' : 'pending',
                    pricing.totalUsers,
                    pricing.max_ertekelo,
                    pricing.max_elemzo,
                    pricing.max_feltolto,
                    sysadminMegjegyzes
                ]
            );
        }

        const fizetesiBlokk = pricing.totalPrice > 0
            ? `
                <div style="background:#fff8ef; border-left:5px solid #ff7c00; padding:12px; margin:16px 0;">
                    <p><strong>Fizetendő összeg:</strong> ${escapeHtml(formatFt(pricing.totalPrice))}</p>
                    <p>Ez nem díjbekérő. A díjbekérővel hamarosan külön jelentkezünk.</p>
                </div>
              `
            : '<p><strong>Demo csomag:</strong> fizetési kötelezettség nincs.</p>';

        const htmlContent = `
            <div style="font-family: 'Times New Roman', Times, serif; color: #333; line-height:1.55;">
                <h2><span style="color: #ff7c00;">K</span>edves ${escapeHtml(intv)},</h2>
                <p>Regisztrációja sikeresen megtörtént.</p>
                <p><strong>Csomag:</strong> ${escapeHtml(pricing.packageName)}</p>
                <p><strong>Regisztrációs kód:</strong> <span style="color:#ff7c00; font-weight:bold;">${escapeHtml(intreg)}</span></p>
                <p><strong>Felhasználói keret:</strong> ${pricing.totalUsers} fő</p>
                ${fizetesiBlokk}
                <p><strong>MI-funkció állapota:</strong> ${aiEnabledErtek === 1 ? 'engedélyezve' : 'kikapcsolva'}.</p>
                <p>A munkatársak ezzel a kóddal tudnak felhasználói fiókot létrehozni a regisztrációs oldalon.</p>
                <p style="font-size: 0.9em;">Üdvözlettel,<br>Az Értékek csapata</p>
            </div>
        `;

        sendEmail(mail2v, uresModul ? 'Regisztráció sikeres - Üres értékelő rendszer létrehozva - ÉRTÉKEK' : 'Regisztráció sikeres - ÉRTÉKEK', htmlContent);

        sendEmail(
            REGISTRATION_NOTIFY_EMAIL,
            `Új intézményi regisztráció - ${pricing.packageName} - ${intv}`,
            buildInstitutionNotificationHtml({
                type: uresModul ? 'Saját / üres rendszer' : 'Kész szakmai anyag',
                institutionName: intv,
                contactName: vez2v,
                contactEmail: mail2v,
                phone: tel2v,
                address: `${orszv}, ${intirv} ${szekhelyv}, ${cimv}`,
                taxNumber: adoszv,
                packageName: pricing.packageName,
                packageCode: pricing.csomagKod,
                registrationCode: intreg,
                pricing,
                moduleText,
                aiEnabled: aiEnabledErtek === 1
            })
        );

        console.log(`Új intézmény regisztrálva: ${intv} (Kód: ${intreg}, Csomag: ${pricing.csomagKod}, Fizetendő: ${pricing.totalPrice})`);

        return res.status(201).json({
            message: 'Intézményi regisztráció sikeres',
            intreg,
            modulId: ujModulId,
            fizetendoOsszeg: pricing.totalPrice,
            fizetesiIdoszak: pricing.period,
            osszesFelhasznalo: pricing.totalUsers
        });

    } catch (err) {
        console.error('[register/institution hiba]', err);
        return res.status(500).json({ message: 'Hiba a regisztráció során.' });
    }
});
        // User regisztráció kezelése
// regmodul.js
// regmodul.js - Felhasználói regisztráció e-mail küldéssel
router.post('/register/user', async (req, res) => {
    try {
        const {
            userv,
            jelszomezov,
            vezeteknevv,
            mailv,
            telv
        } = req.body;

        const regCode = String(
            req.body.regCode ||
            req.body.regcode ||
            req.body.regCodev ||
            req.body.intreg ||
            ""
        ).trim();

        if (!userv || !jelszomezov || !vezeteknevv || !mailv || !regCode) {
            return res.status(400).json({
                success: false,
                message: 'Hiányzó regisztrációs adatok.'
            });
        }

        if (String(jelszomezov).length < 8) {
            return res.status(400).json({
                success: false,
                message: 'A jelszónak legalább 8 karakteresnek kell lennie.'
            });
        }

        const institutionRows = await q(
            `
            SELECT id, intfo, intnev, intmod, csomag_kod, idoszak, aktiv, validalva, fizetve, fizetes_beerkezett, trial_indul, trial_lejar
            FROM intezmeny
            WHERE intreg = ?
            LIMIT 1
            `,
            [regCode]
        );

        if (!institutionRows.length) {
            return res.status(400).json({
                success: false,
                message: 'Érvénytelen regisztrációs kód.'
            });
        }

        const institution = institutionRows[0];
        const intIdv = Number(institution.id);

        const countRows = await q(
            `
            SELECT COUNT(*) AS userCount
            FROM felhasznalok
            WHERE int_id = ?
            `,
            [intIdv]
        );

        const userCount = Number(countRows[0]?.userCount || 0);
        const intFo = Number(institution.intfo || 0);
        const institutionPackageCode = normalizePackageCode(institution.csomag_kod || institution.idoszak);
        const isActiveInstitution = institution.aktiv === 1 || institution.aktiv === '1' || (institution.validalva && (institution.fizetes_beerkezett || institution.fizetve));

        if (institutionPackageCode === 'demo' && userCount >= 1 && !isActiveInstitution) {
            return res.status(403).json({
                success: false,
                message: 'Demo hozzáféréshez csak egy felhasználó regisztrálható.'
            });
        }

        if (intFo > 0 && userCount >= intFo) {
            return res.status(403).json({
                success: false,
                message: 'Az intézmény licencmennyisége elérve.'
            });
        }

        const duplicateRows = await q(
            `
            SELECT id
            FROM felhasznalok
            WHERE fnev = ? OR mail = ?
            LIMIT 1
            `,
            [userv, mailv]
        );

        if (duplicateRows.length) {
            return res.status(409).json({
                success: false,
                message: 'A felhasználónév vagy e-mail cím már foglalt.'
            });
        }

        const allowedModuleIds = parseIdList(institution.intmod);

        if (!allowedModuleIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Az intézményhez nincs aktív modul rendelve.'
            });
        }

        const requestedModuleIds = parseIdList(req.body.usermods);

        const finalModuleIds = requestedModuleIds.length
            ? requestedModuleIds.filter(id => allowedModuleIds.includes(id))
            : allowedModuleIds;

        if (!finalModuleIds.length) {
            return res.status(403).json({
                success: false,
                message: 'A kért modul nem tartozik ehhez az intézményhez.'
            });
        }

        const allowedRoles = getAllowedRolesForPackage(institutionPackageCode);
        const requestedRole = Number(req.body.szerepv || ROLE_ERTEKELO);
        const szerepv = allowedRoles.includes(requestedRole)
            ? requestedRole
            : allowedRoles[0];

        if (!allowedRoles.includes(szerepv)) {
            return res.status(403).json({
                success: false,
                message: 'Ez a szerepkör a választott csomagban nem elérhető.'
            });
        }

        const packageRowsForLimit = await q(
            `
            SELECT max_felhasznalo, max_ertekelo, max_elemzo, max_feltolto
            FROM csomagok
            WHERE kod = ?
            LIMIT 1
            `,
            [institutionPackageCode]
        );
        const packageForLimit = normalizePackageRow(packageRowsForLimit[0], institutionPackageCode);
        const extraSlots = Math.max(0, intFo - Number(packageForLimit.max_felhasznalo || 0));
        const roleLimits = {
            [ROLE_ERTEKELO]: Number(packageForLimit.max_ertekelo || 0) + extraSlots,
            [ROLE_ELEMZO]: Number(packageForLimit.max_elemzo || 0),
            [ROLE_ADMIN]: Number(packageForLimit.max_feltolto || 0)
        };

        const roleCountRows = await q(
            `
            SELECT role_id, COUNT(*) AS db
            FROM felhasznalok
            WHERE int_id = ?
            GROUP BY role_id
            `,
            [intIdv]
        );
        const roleCounts = new Map(roleCountRows.map(row => [Number(row.role_id), Number(row.db || 0)]));
        const selectedRoleLimit = Number(roleLimits[szerepv] || 0);

        if (selectedRoleLimit > 0 && Number(roleCounts.get(szerepv) || 0) >= selectedRoleLimit) {
            return res.status(403).json({
                success: false,
                message: 'A választott szerepkör kerete betelt ennél a csomagnál.'
            });
        }

        const ipCim = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Ismeretlen';

        const hashedPassword = await bcrypt.hash(jelszomezov, 10);

        const userResult = await q(
            `
            INSERT INTO felhasznalok
            (fnev, pass, vez, mail, tel, int_id, role_id, ip_cim, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                userv,
                hashedPassword,
                vezeteknevv,
                mailv,
                telv,
                intIdv,
                szerepv,
                ipCim,
                userAgent
            ]
        );

        const newUserId = userResult.insertId;

        const rightsVals = uniqueNumbers(finalModuleIds).map(modulId => [
            newUserId,
            modulId,
            1
        ]);

        if (rightsVals.length) {
            await q(
                `
                INSERT INTO jogosultsagok
                (user_id, modul_id, aktiv)
                VALUES ?
                `,
                [rightsVals]
            );
        }

        if (institutionPackageCode === 'demo' && userCount === 0 && !institution.trial_indul) {
            await q(
                `
                UPDATE intezmeny
                SET trial_indul = CURDATE(),
                    trial_lejar = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
                WHERE id = ?
                `,
                [intIdv]
            );
        }

        logger(req, newUserId, "regisztráció", {
            int_id: intIdv,
            role_id: szerepv,
            modulok: uniqueNumbers(finalModuleIds)
        });

        const szerepNeve = szerepv === ROLE_ADMIN
            ? "Feltöltő"
            : szerepv === ROLE_ELEMZO
                ? "Elemző"
                : "Értékelő";

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h2 style="color: #ff7c00;">Sikeres regisztráció az ÉRTÉKEK rendszerében!</h2>
                <p>Kedves <strong>${escapeHtml(vezeteknevv)}</strong>!</p>
                <p>Felhasználói fiókja sikeresen létrejött az alábbi intézményhez: <strong>${escapeHtml(institution.intnev)}</strong>.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid #ff7c00;">
                    <p><strong>Belépési adatok:</strong></p>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Felhasználónév:</strong> ${escapeHtml(userv)}</li>
                        <li><strong>Szerepkör:</strong> ${escapeHtml(szerepNeve)}</li>
                    </ul>
                </div>
                <p>Mostantól bejelentkezhet a <a href="https://ertekek.com" style="color: #ff7c00; font-weight: bold;">www.ertekek.com</a> oldalon.</p>
                <p>Üdvözlettel,<br><strong>Az ÉRTÉKEK csapata</strong></p>
            </div>
        `;

        sendEmail(mailv, 'Sikeres regisztráció - ÉRTÉKEK', htmlContent);

        sendEmail(
            REGISTRATION_NOTIFY_EMAIL,
            `Új felhasználói regisztráció - ${institution.intnev} - ${vezeteknevv}`,
            buildUserNotificationHtml({
                institutionName: institution.intnev,
                userName: vezeteknevv,
                userEmail: mailv,
                roleName: szerepNeve
            })
        );

        return res.status(201).json({
            success: true,
            message: 'Regisztráció sikeres'
        });

    } catch (err) {
        console.error('[register/user hiba]', err);
        return res.status(500).json({
            success: false,
            message: 'Felhasználó mentése sikertelen.'
        });
    }
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
            const query = `
                SELECT id, intfo, intnev, intmod, aktiv, validalva, fizetve, fizetes_beerkezett, csomag_kod, idoszak
                FROM intezmeny
                WHERE intreg = ?
            `;
            db.query(query, [regCode], (err, results) => {
                if (err) {
                    console.error('Adatbázis hiba:', err);
                    return res.status(500).json({ message: 'Adatbázis hiba történt.' });
                }
        
                if (results.length > 0) {
                    const { id, intnev, intfo, intmod, csomag_kod, idoszak } = results[0];
                    const packageCode = normalizePackageCode(csomag_kod || idoszak);
        
                    const userCountQuery = 'SELECT COUNT(*) AS userCount FROM felhasznalok WHERE int_id = ?';
                    db.query(userCountQuery, [id], (err, userResults) => {
                        if (err) {
                            console.error('Adatbázis hiba:', err);
                            return res.status(500).json({ message: 'Hiba történt a felhasználók számolása közben.' });
                        }
        
                        const userCount = userResults[0].userCount; 

                        const active = results[0].aktiv === 1 || results[0].aktiv === '1' || (results[0].validalva && (results[0].fizetes_beerkezett || results[0].fizetve));

                        if (userCount >= 1 && !active) {
                            return res.json({ success: false, message: 'Próbaidő alatt csak az elsődleges kapcsolattartói hozzáférés aktív. További felhasználók élesítés után adhatók hozzá.' });
                        }

                        if (userCount >= intfo) {
                            return res.json({ success: false, message: 'Az intézménye licensz mennyisége elérve. Ha további felhasználókat kívánnak regisztrálni, bővítség csomagjukat.' });
                        }
                        res.json({ 
                                success: true,
                                intMod: intmod,
                                intNev: intnev,
                                intId: id,
                                intFo: intfo,
                                userCount: userCount,
                                packageCode,
                                allowedRoles: getAllowedRolesForPackage(packageCode)
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

        
router.post(
  '/insert_kitoltes',
  requireLogin,
  attachUserContext,
  requireModuleAccess,
  requireActiveLicense('share_evaluation'),
  async (req, res) => {    try {
        const { kitoltesek } = req.body;

        if (!kitoltesek || !Array.isArray(kitoltesek) || kitoltesek.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Hibás adatok.'
            });
        }

        const idkValues = uniqueNumbers(kitoltesek.map(entry => entry.idk));

        if (idkValues.length !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Egy megosztási kérésben pontosan egy értékelés szerepelhet.'
            });
        }

        const idk = idkValues[0];

        const targetUserIds = uniqueNumbers(
            kitoltesek.map(entry => entry.felhasznalo_id)
        ).filter(id => id !== req.auth.userId);

        if (!targetUserIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Nincs érvényes címzett.'
            });
        }

        /*
          Itt ellenőrizzük, hogy a bejelentkezett user tényleg hozzáfér-e ehhez az értékeléshez.
          Nem a kliensből jövő kitoltes_neve / modul_id / vizsgalt_id dönt.
        */
        const sourceRows = await q(
            `
            SELECT
                k.idk,
                k.kitoltes_neve,
                k.modul_id,
                k.vizsgalt_id,
                f.vez AS megoszto_nev
            FROM kitoltesek k
            JOIN felhasznalok f ON f.id = k.felhasznalo_id
            WHERE k.idk = ?
              AND k.felhasznalo_id = ?
              AND k.modul_id = ?
            LIMIT 1
            `,
            [idk, req.auth.userId, req.auth.modulId]
        );

        if (!sourceRows.length) {
            return res.status(403).json({
                success: false,
                message: 'Nincs jogosultságod ezt az értékelést megosztani.'
            });
        }

        const source = sourceRows[0];

        const placeholders = targetUserIds.map(() => '?').join(',');

        const targetRows = await q(
            `
            SELECT DISTINCT
                f.id,
                f.vez,
                f.mail
            FROM felhasznalok f
            JOIN jogosultsagok j
                ON j.user_id = f.id
               AND j.modul_id = ?
               AND j.aktiv = 1
            WHERE f.id IN (${placeholders})
              AND f.int_id = ?
            `,
            [
                req.auth.modulId,
                ...targetUserIds,
                req.auth.intId
            ]
        );

        if (targetRows.length !== targetUserIds.length) {
            return res.status(403).json({
                success: false,
                message: 'Van olyan címzett, aki nem tartozik az intézményhez vagy nincs moduljoga.'
            });
        }

        const entryByUserId = new Map(
            kitoltesek.map(entry => [Number(entry.felhasznalo_id), entry])
        );

        for (const target of targetRows) {
            const alreadyRows = await q(
                `
                SELECT id
                FROM kitoltesek
                WHERE felhasznalo_id = ?
                  AND idk = ?
                  AND modul_id = ?
                LIMIT 1
                `,
                [target.id, idk, req.auth.modulId]
            );

            if (!alreadyRows.length) {
                await q(
                    `
                    INSERT INTO kitoltesek
                    (felhasznalo_id, kitoltes_neve, idk, role, modul_id, vizsgalt_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        target.id,
                        source.kitoltes_neve,
                        idk,
                        'editor',
                        req.auth.modulId,
                        source.vizsgalt_id
                    ]
                );
            }

            const entry = entryByUserId.get(Number(target.id)) || {};
            const message = String(entry.message || '').trim();

            const optionalMessage = message ? `
                <br><hr>
                <p><strong>${escapeHtml(source.megoszto_nev)} a következő üzenetet küldte önnek:</strong></p>
                <p style="font-style: italic; color: #555;">"${escapeHtml(message)}"</p>
                <hr>
            ` : '';

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Kedves ${escapeHtml(target.vez)}!</h2>
                    <p>${escapeHtml(source.megoszto_nev)} megosztott önnel egy készülő/már elkészült értékelést.</p>
                    <p>
                        Mostantól ön is szerkesztheti a
                        <strong>${escapeHtml(source.kitoltes_neve)}</strong>
                        nevű értékelést.
                    </p>

                    ${optionalMessage}

                    <br>
                    <p>Ha úgy érzi, hogy tévedés történt, vegye fel a kapcsolatot az értékelés szerzőjével.</p>
                    <br>
                    <p>Jó munkát és szép napot kíván:</p>
                    <p><strong>Az ÉRTÉKEK csapata</strong></p>
                    <a href="https://www.ertekek.com" style="color: #0056b3; text-decoration: none;">www.ertekek.com</a>
                </div>
            `;

            sendEmail(target.mail, "Új értékelés megosztása", htmlContent);
        }

        logger(req, req.auth.userId, 'megosztás', {
            idk,
            modul_id: req.auth.modulId,
            megosztott_szemelyek_szama: targetRows.length
        });

        return res.json({
            success: true,
            message: 'Megosztás sikeres.'
        });

    } catch (error) {
        console.error("[insert_kitoltes hiba]", error);
        return res.status(500).json({
            success: false,
            message: 'Adatbázis vagy e-mail küldési hiba.'
        });
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
  function isSysadminReq(req) {
    return req.auth?.isSysadmin === true || Number(req.auth?.realRoleId) === 4;
}

function currentRoleId(req) {
    return Number(req.auth?.roleId || req.session?.roleId);
}

function getAuditIdsFromBody(req) {
    const ids = [];

    if (req.body.audit_id) {
        ids.push(req.body.audit_id);
    }

    if (Array.isArray(req.body.audit_ids)) {
        ids.push(...req.body.audit_ids);
    }

    return uniqueNumbers(ids);
}

async function getCurrentUserDisplayName(req) {
    const rows = await q(
        `
        SELECT vez
        FROM felhasznalok
        WHERE id = ?
        LIMIT 1
        `,
        [req.auth.userId]
    );

    return rows?.[0]?.vez || 'Ismeretlen felhasználó';
}

async function loadAuditNotificationRows(req, auditIds) {
    const cleanAuditIds = uniqueNumbers(auditIds);

    if (!cleanAuditIds.length) {
        const err = new Error('Hiányzó vagy hibás audit azonosító.');
        err.status = 400;
        throw err;
    }

    const placeholders = cleanAuditIds.map(() => '?').join(',');

    const rows = await q(
        `
        SELECT
            a.audit_id,
            a.user_audit,
            a.user_user,
            a.audit_modul_id,
            a.audit_int_id,
            a.hatarido,
            k.idk,
            k.kitoltes_neve,
            k.modul_id,
            tulaj.id AS tulaj_id,
            tulaj.vez AS tulaj_nev,
            tulaj.mail AS tulaj_email,
            tulaj.int_id AS tulaj_int_id,
            auditor.id AS auditor_id,
            auditor.vez AS auditor_nev,
            auditor.mail AS auditor_email,
            EXISTS (
                SELECT 1
                FROM kitoltesek sajat
                WHERE sajat.idk = k.idk
                  AND sajat.modul_id = k.modul_id
                  AND sajat.felhasznalo_id = ?
                  AND sajat.role IN ('admin', 'sysadmin', 'editor')
                LIMIT 1
            ) AS has_direct_access
        FROM audit a
        JOIN kitoltesek k
            ON k.id = a.audit_id
           AND k.modul_id = a.audit_modul_id
        JOIN felhasznalok tulaj
            ON tulaj.id = a.user_user
        JOIN felhasznalok auditor
            ON auditor.id = a.user_audit
        WHERE a.audit_id IN (${placeholders})
          AND a.audit_modul_id = ?
        `,
        [
            req.auth.userId,
            ...cleanAuditIds,
            req.auth.modulId
        ]
    );

    if (rows.length !== cleanAuditIds.length) {
        const err = new Error('Van olyan auditáció, amely nem található vagy nem ehhez a modulhoz tartozik.');
        err.status = 403;
        throw err;
    }

    const roleId = currentRoleId(req);
    const sysadmin = isSysadminReq(req);

    const allowedRows = rows.filter(row => {
        const sameInstitution = Number(row.tulaj_int_id) === Number(req.auth.intId);
        const hasDirectAccess = Number(row.has_direct_access) === 1;
        const isAuditor = Number(row.auditor_id) === Number(req.auth.userId);
        const canInstitutionManage = [ROLE_ADMIN, ROLE_ELEMZO].includes(roleId) && sameInstitution;

        return sysadmin || hasDirectAccess || isAuditor || canInstitutionManage;
    });

    if (allowedRows.length !== rows.length) {
        const err = new Error('Nincs jogosultságod egy vagy több audit értesítéséhez.');
        err.status = 403;
        throw err;
    }

    return allowedRows;
}

function handleNotifyError(res, error, label) {
    const status = Number(error.status) || 500;

    if (status >= 500) {
        console.error(label, error);
    }

    return res.status(status).json({
        success: false,
        message: error.message || 'Értesítési hiba.'
    });
}
// --- ÚJ ENDPOINT: Csoportos határidő értesítő ---
router.post(
    '/api/notify-deadlines',
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    requireRole(ROLE_ADMIN, ROLE_ELEMZO),
    async (req, res) => {
        try {
            const auditIds = getAuditIdsFromBody(req);
            const hatarido = String(req.body.hatarido || req.body.deadline || '').trim();

            if (!auditIds.length || !hatarido) {
                return res.status(400).json({
                    success: false,
                    message: 'Hiányzó audit azonosító vagy határidő.'
                });
            }

            const rows = await loadAuditNotificationRows(req, auditIds);

            const groupedByEmail = new Map();

            for (const row of rows) {
                if (!row.tulaj_email) continue;

                if (!groupedByEmail.has(row.tulaj_email)) {
                    groupedByEmail.set(row.tulaj_email, {
                        email: row.tulaj_email,
                        name: row.tulaj_nev || 'Felhasználó',
                        items: []
                    });
                }

                groupedByEmail.get(row.tulaj_email).items.push({
                    nev: row.kitoltes_neve || 'Értékelés',
                    auditor: row.auditor_nev || 'Auditor'
                });
            }

            const emailPromises = [...groupedByEmail.values()].map(group => {
                let listHtml = '<ul style="padding-left: 20px;">';

                for (const item of group.items) {
                    listHtml += `
                        <li>
                            <strong>${escapeHtml(item.nev)}</strong>
                            <br>
                            <span style="color: #666;">Auditor: ${escapeHtml(item.auditor)}</span>
                        </li>
                    `;
                }

                listHtml += '</ul>';

                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                        <h2 style="color: #ffbd16;">Értékelési határidő</h2>
                        <h2>Kedves ${escapeHtml(group.name)}!</h2>

                        <p>Az alábbi értékelés(ek)hez új leadási határidőt állítottak be a rendszerben:</p>

                        ${listHtml}

                        <p>
                            <strong>
                                A megadott határidő:
                                <span style="color: #d9534f; font-size: 1.2em;">
                                    ${escapeHtml(hatarido)}
                                </span>
                            </strong>
                        </p>

                        <br>
                        <p>Jó munkát kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                        <a href="https://www.ertekek.com">www.ertekek.com</a>
                    </div>
                `;

                return sendEmail(
                    group.email,
                    'Új határidő beállítva - ÉRTÉKEK',
                    htmlContent
                );
            });

            await Promise.all(emailPromises);

            return res.json({
                success: true,
                message: 'Határidő értesítések elküldve.'
            });
        } catch (error) {
            return handleNotifyError(res, error, '[notify-deadlines hiba]');
        }
    }
);
// Értesítés auditációra jelölésről
router.post(
    '/api/notify-audit-init',
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    requireRole(ROLE_ADMIN, ROLE_ELEMZO),
    async (req, res) => {
        try {
            const auditIds = getAuditIdsFromBody(req);
            const message = String(req.body.message || req.body.uzenet || '').trim();
            const deadline = String(req.body.deadline || req.body.hatarido || '').trim();

            if (!auditIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Hiányzó audit azonosító.'
                });
            }

            const rows = await loadAuditNotificationRows(req, auditIds);
            const senderName = await getCurrentUserDisplayName(req);

            const emailPromises = rows.map(row => {
                if (!row.tulaj_email) return Promise.resolve();

                const deadlineText = deadline || row.hatarido || '';

                const deadlineHtml = deadlineText
                    ? `
                        <p>
                            <strong>
                                Az értékeléshez tartozó határidő:
                                <span style="color: #d9534f;">
                                    ${escapeHtml(deadlineText)}
                                </span>
                            </strong>
                        </p>
                    `
                    : '';

                const messageHtml = message
                    ? `
                        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #ffbd16; margin: 15px 0; font-style: italic;">
                            "${escapeHtml(message)}"
                        </div>
                    `
                    : '';

                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                        <h2 style="color: #ffbd16;">Értékelés auditációra jelölve</h2>
                        <h2>Kedves ${escapeHtml(row.tulaj_nev)}!</h2>

                        <p>
                            A(z)
                            <strong>${escapeHtml(row.kitoltes_neve || 'Értékelés')}</strong>
                            nevű értékelését
                            <strong>${escapeHtml(senderName)}</strong>
                            auditációra / módosításra jelölte.
                        </p>

                        ${messageHtml}

                        ${deadlineHtml}

                        <p>
                            További információkat a "Javaslatok" fülön talál, és az üzenetre is ott tud válaszolni.
                        </p>

                        <br>
                        <p>Jó munkát és szép napot kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                        <a href="https://www.ertekek.com">www.ertekek.com</a>
                    </div>
                `;

                return sendEmail(
                    row.tulaj_email,
                    'Értékelés auditációra jelölve - ÉRTÉKEK',
                    htmlContent
                );
            });

            await Promise.all(emailPromises);

            return res.json({
                success: true,
                message: 'Audit e-mail sikeresen elküldve.'
            });
        } catch (error) {
            return handleNotifyError(res, error, '[notify-audit-init hiba]');
        }
    }
);
        // --- ÚJ VÉGPONT: Új audit üzenet e-mail értesítés ---
router.post(
    '/api/notify-audit-message',
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    async (req, res) => {
        try {
            const auditIds = getAuditIdsFromBody(req);
            const uzenet = String(req.body.uzenet || '').trim();

            if (!auditIds.length || !uzenet) {
                return res.status(400).json({
                    success: false,
                    message: 'Hiányzó audit azonosító vagy üzenet.'
                });
            }

            const rows = await loadAuditNotificationRows(req, auditIds);
            const senderName = await getCurrentUserDisplayName(req);

            const emailJobs = [];

            for (const row of rows) {
                const recipients = [];

                if (
                    row.tulaj_email &&
                    Number(row.tulaj_id) !== Number(req.auth.userId)
                ) {
                    recipients.push({
                        email: row.tulaj_email,
                        name: row.tulaj_nev,
                        tipus: 'értékelés tulajdonosa'
                    });
                }

                if (
                    row.auditor_email &&
                    Number(row.auditor_id) !== Number(req.auth.userId)
                ) {
                    recipients.push({
                        email: row.auditor_email,
                        name: row.auditor_nev,
                        tipus: 'auditor'
                    });
                }

                for (const recipient of recipients) {
                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                            <h2 style="color: #0056b3;">Új üzenet érkezett az értékeléséhez</h2>
                            <h2>Kedves ${escapeHtml(recipient.name || 'Felhasználó')}!</h2>

                            <p>
                                A(z)
                                <strong>${escapeHtml(row.kitoltes_neve || 'Értékelés')}</strong>
                                nevű értékeléshez
                                <strong>${escapeHtml(senderName)}</strong>
                                új üzenetet küldött.
                            </p>

                            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #0056b3; margin: 15px 0; font-style: italic;">
                                "${escapeHtml(uzenet)}"
                            </div>

                            <p>Fiókjába belépve a javaslatok fülön tekintheti meg a teljes beszélgetést, és ott tud válaszolni rá.</p>

                            <br>
                            <p>Jó munkát és szép napot kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                            <a href="https://www.ertekek.com" style="color: #0056b3; text-decoration: none;">www.ertekek.com</a>
                        </div>
                    `;

                    emailJobs.push(
                        sendEmail(
                            recipient.email,
                            'Új üzenet az értékeléséhez - ÉRTÉKEK',
                            htmlContent
                        )
                    );
                }
            }

            await Promise.all(emailJobs);

            return res.json({
                success: true,
                message: 'Új üzenet e-mailek sikeresen elküldve.'
            });
        } catch (error) {
            return handleNotifyError(res, error, '[notify-audit-message hiba]');
        }
    }
);
        // --- ÚJ VÉGPONT: Értesítés az elemzőnek (auditornak), ha a user válaszol ---
       router.post(
    '/api/notify-auditor-reply',
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    async (req, res) => {
        try {
            const auditIds = getAuditIdsFromBody(req);
            const uzenet = String(req.body.uzenet || '').trim();

            if (!auditIds.length || !uzenet) {
                return res.status(400).json({
                    success: false,
                    message: 'Hiányzó audit azonosító vagy üzenet.'
                });
            }

            const rows = await loadAuditNotificationRows(req, auditIds);
            const senderName = await getCurrentUserDisplayName(req);

            const emailPromises = rows.map(row => {
                if (!row.auditor_email) return Promise.resolve();

                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #28a745;">Új válasz érkezett egy auditált értékeléshez</h2>
                        <h2>Kedves ${escapeHtml(row.auditor_nev)}!</h2>

                        <p>
                            A(z)
                            <strong>${escapeHtml(row.kitoltes_neve || 'Értékelés')}</strong>
                            nevű értékeléshez
                            <strong>${escapeHtml(senderName)}</strong>
                            új üzenetet küldött:
                        </p>

                        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; font-style: italic;">
                            "${escapeHtml(uzenet)}"
                        </div>

                        <p>Fiókjába belépve a "Javaslatok" fülön tekintheti meg a teljes beszélgetést.</p>

                        <br>
                        <p>Jó munkát és szép napot kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                        <a href="https://www.ertekek.com" style="color: #28a745; text-decoration: none;">www.ertekek.com</a>
                    </div>
                `;

                return sendEmail(
                    row.auditor_email,
                    'Új válasz érkezett (Auditáció) - ÉRTÉKEK',
                    htmlContent
                );
            });

            await Promise.all(emailPromises);

            return res.json({
                success: true,
                message: 'Auditor értesítve.'
            });
        } catch (error) {
            return handleNotifyError(res, error, '[notify-auditor-reply hiba]');
        }
    }
);
        // --- ÚJ VÉGPONT: Értesítés a jóváhagyásról ---
    router.post(
    '/api/notify-audit-approved',
    requireLogin,
    attachUserContext,
    requireModuleAccess,
    requireRole(ROLE_ADMIN, ROLE_ELEMZO),
    async (req, res) => {
        try {
            const auditIds = getAuditIdsFromBody(req);

            if (!auditIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Hiányzó audit azonosító.'
                });
            }

            const rows = await loadAuditNotificationRows(req, auditIds);

            const emailPromises = rows.map(row => {
                if (!row.tulaj_email) return Promise.resolve();

                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #28a745;">Értékelés jóváhagyva</h2>
                        <h2>Kedves ${escapeHtml(row.tulaj_nev)}!</h2>

                        <p>
                            Örömmel értesítjük, hogy a(z)
                            <strong>${escapeHtml(row.kitoltes_neve || 'Értékelés')}</strong>
                            nevű értékelését az auditor jóváhagyta.
                        </p>

                        <p>Az értékelés ezzel lezárásra került, további teendője jelenleg nincs vele.</p>

                        <br>
                        <p>További jó munkát és szép napot kíván:<br><strong>Az ÉRTÉKEK csapata</strong></p>
                        <a href="https://www.ertekek.com" style="color: #2e2ee1; text-decoration: none;">www.ertekek.com</a>
                    </div>
                `;

                return sendEmail(
                    row.tulaj_email,
                    'Értékelés jóváhagyva - ÉRTÉKEK',
                    htmlContent
                );
            });

            await Promise.all(emailPromises);

            return res.json({
                success: true,
                message: 'Jóváhagyás e-mailek elküldve.'
            });
        } catch (error) {
            return handleNotifyError(res, error, '[notify-audit-approved hiba]');
        }
    }
);
    return router;
}

module.exports = regi;
