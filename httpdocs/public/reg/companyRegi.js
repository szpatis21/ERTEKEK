import {showAndHideErrorMessages, IntezmenynevAdatok, IntezmenyiAdatok, KapcsolatiAdatok, FinanszirozasAdatok, ElfogadasAdatok, Gombok, alap, al_alap, vissza, handleRegistrationChange, validacio, countRegex,addressRegex, foRegex,cityRegex,postalCodeRegex, adoszamRegex,userRegex,nameRegex, regifin, regi} from './regifo.js';
import { showAlert } from '/both/alert.js';

// Változók 
const regi0 = document.querySelector("#regi0");
const cegradio = document.querySelector("#contactChoice2");
const felhasznaloSzamInput = document.querySelector("#fo");
const radioGombok = document.querySelectorAll('input[name="elofizI"]');
const eredmenyElem = document.querySelector("#kalkulacioEredmeny");

const arak = {
    1: 1000,  // Havi ár per fő
    6: 5000,  // Fél éves ár per fő
    12: 9000  // Éves ár per fő
};
function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


const DEFAULT_PACKAGES = {
    demo: { kod: 'demo', nev: 'Demo', ar_havi: 0, ar_negyedeves: 0, ar_eves: 0, max_felhasznalo: 1 },
    start: { kod: 'start', nev: 'Értékek Start', ar_havi: 18900, ar_negyedeves: 75000, ar_eves: 222000, max_felhasznalo: 2 },
    pro: { kod: 'pro', nev: 'Értékek Pro', ar_havi: 24900, ar_negyedeves: 139000, ar_eves: 279000, max_felhasznalo: 5 },
    sajat: { kod: 'sajat', nev: 'Értékek Saját Rendszer', ar_havi: 19900, ar_negyedeves: 79000, ar_eves: 189000, max_felhasznalo: 3 },
    fenntartoi: { kod: 'fenntartoi', nev: 'Fenntartói csomag', ar_havi: 0, ar_negyedeves: 0, ar_eves: 0, max_felhasznalo: 50 }
};

// Könnyen átírható üzleti döntési pont: plusz felhasználó ára az alapcsomagon felül.
// Az értékek tájékoztató jellegűek, a backend ugyanilyen táblából számol újra.
const EXTRA_USER_PRICES = {
    demo: { havi: 0, negyedeves: 0, eves: 0 },
    start: { havi: 4500, negyedeves: 12500, eves: 45000 },
    pro: { havi: 6500, negyedeves: 18000, eves: 65000 },
    sajat: { havi: 6500, negyedeves: 18000, eves: 65000 },
    fenntartoi: { havi: 0, negyedeves: 0, eves: 0 }
};

const PACKAGE_USER_BREAKDOWN = {
    demo: '1 értékelő',
    start: '2 értékelő',
    pro: '3 értékelő + 2 elemző',
    sajat: '3 feltöltő',
    fenntartoi: 'egyedi keret'
};


const PACKAGE_HOVER_DETAILS = {
    demo: {
        title: 'Próba verzió',
        roles: ['1 értékelő - Értékeljen könnyen és gyorsan egy modern rendszerben!'],
        features: [
            '3 napos próba, melyben 3 értékelést hozhat létre',
            'Nyerjen betekintést a szakmai anyagunk legtöbb témájába!',
            'Meglévő értékelések megtekintése és letöltésük',
        ],
        note: 'Kipróbálásra való, fizetési kötelezettség nélkül.'
    },
    start: {
        title: 'Értékek Start',
        roles: ['2 értékelő - Értékeljenek könnyen és gyorsan egy modern rendszerben!'],
        features: [
            'Korlátlan számú értékelés létrehozása a teljes szakmai anyagban',
            'Folytassa ott ahol abbahagyta bárhol, bármikor',
            'Látványos és sokatmondó grafikonok',
            'Könnyítse meg a munkát a mesterséges intelligenciával',
            'Keressen értékeket!'
        ],
        note: 'Kisebb intézményi használatra, alap értékelői munkához.'
    },
    pro: {
        title: 'Értékek Pro',
        roles: ['3 értékelő, 2 elemző - Értékeléseiből hozzon létre csoportot, adjon ki határidőket, mentorálja kollégáit!'],
        features: [
            'Minden Start funkció',
            'Elemzői hozzáférés intézményi áttekintéshez. Nézze át elemzőként regisztrált kollegái munkáját, hozzon létre belőlük csoportos elemzést, legyen mentor és osszon ki határidőket',
            'Megosztás - együtt könnyebb! Ossza meg munkáját kollegáival, dolgozzanak együtt bárhol, bármikor szinkronban és egymást támogatva',
        ],
        note: 'Komolyabb, profi intézményi működéshez és több szerepkörös munkához. Itt kezdődik a csapatmunka!'
    },
    sajat: {
        title: 'Értékek Saját Rendszer',
        roles: ['3 feltöltő - Hozzanak létre saját értékeket, használják intézményi szinten egyedi módszertanukat. Értékeljenek, elemezzenek, hozzanak létre valami újat!'],
        features: [
            'Saját szakmai anyag létrehozása vagy feltöltése - Álmodja és valósítsa meg saját szakmai anyagát és dolgozzon együtt benne másokkal. ',
            'Saját, egyedi kérdésstruktúrák és kategóriák kezelése',
            'Könnyű feltöltés támogatással',
            'Saját rendszer építése meglévő ÉRTÉKEK funkciókkal, az összes szerepkörhöz való hozzáféréssel'
        ],
        note: 'Akkor jó, ha nem a kész szakmai anyagot használja, hanem saját rendszert épít. Teremtsen Értékeket!'
    }
};

function packageDetailHtml(code) {
    const detail = PACKAGE_HOVER_DETAILS[code];
    if (!detail) return '';

    const roles = detail.roles
        .map(role => `<li>${escapeHTML(role)}</li>`)
        .join('');

    const features = detail.features
        .map(feature => `<li>${escapeHTML(feature)}</li>`)
        .join('');

    return `
        <div class="reg-package-popover-title">${escapeHTML(detail.title)}</div>
        <div class="reg-package-popover-section">
            <strong>Szerepkörök</strong>
            <ul>${roles}</ul>
        </div>
        <div class="reg-package-popover-section">
            <strong>Funkciók</strong>
            <ul>${features}</ul>
        </div>
        <div class="reg-package-popover-note">${escapeHTML(detail.note)}</div>
    `;
}

function ensurePackageHoverPopoverStyle() {
    if (document.querySelector('#regPackageHoverPopoverStyle')) return;

    const style = document.createElement('style');
    style.id = 'regPackageHoverPopoverStyle';
    style.textContent = `
        .reg-package-hover-popover {
            position: fixed;
            z-index: 99999;
            width: min(360px, calc(100vw - 32px));
            max-height: min(520px, calc(100vh - 32px));
            overflow-y: auto;
            padding: 14px 16px;
            border-radius: 16px;
            border: 1px solid rgba(255, 101, 0, 0.35);
            background: rgba(255, 250, 243, 0.98);
            color: #273142;
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.22);
            opacity: 0;
            transform: translateY(8px) scale(0.98);
            pointer-events: none;
            transition: opacity 0.16s ease, transform 0.16s ease;
            font-size: 0.92rem;
            line-height: 1.42;
        }

        .reg-package-hover-popover.is-visible {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        .reg-package-popover-title {
            font-weight: 800;
            color: #c2410c;
            font-size: 1.05rem;
            margin-bottom: 9px;
        }

        .reg-package-popover-section {
            margin-top: 10px;
        }

        .reg-package-popover-section strong {
            display: block;
            margin-bottom: 4px;
            color: #4b5563;
        }

        .reg-package-popover-section ul {
            margin: 0;
            padding-left: 18px;
        }

        .reg-package-popover-section li {
            margin: 3px 0;
        }

        .reg-package-popover-note {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 101, 0, 0.22);
            font-size: 0.86rem;
            color: #6b7280;
        }
    `;

    document.head.appendChild(style);
}

function getPackageCodeFromCard(card) {
    if (!card) return '';

    if (card.dataset.packageCode) {
        return String(card.dataset.packageCode).toLowerCase();
    }

    const inputId = card.getAttribute('for');
    const input = inputId ? document.getElementById(inputId) : null;

    return String(input?.value || '').toLowerCase();
}

function placePackageHoverPopover(popover, card) {
    if (!popover || !card) return;

    const rect = card.getBoundingClientRect();
    const gap = 12;
    const preferredLeft = rect.left + rect.width / 2 - popover.offsetWidth / 2;
    const left = Math.max(16, Math.min(preferredLeft, window.innerWidth - popover.offsetWidth - 16));

    let top = rect.bottom + gap;

    if (top + popover.offsetHeight > window.innerHeight - 16) {
        top = rect.top - popover.offsetHeight - gap;
    }

    if (top < 16) top = 16;

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
}

function initPackageHoverDetails() {
    const cards = document.querySelectorAll('.reg-package-card');
    if (!cards.length) return;

    ensurePackageHoverPopoverStyle();

    let popover = document.querySelector('#regPackageHoverPopover');
    if (!popover) {
        popover = document.createElement('div');
        popover.id = 'regPackageHoverPopover';
        popover.className = 'reg-package-hover-popover';
        popover.setAttribute('role', 'tooltip');
        document.body.appendChild(popover);
    }

    let activeCard = null;
    let hideTimer = null;

    const show = (card) => {
        const code = getPackageCodeFromCard(card);
        const html = packageDetailHtml(code);
        if (!html) return;

        clearTimeout(hideTimer);
        activeCard = card;
        popover.innerHTML = html;
        popover.classList.add('is-visible');
        card.setAttribute('aria-describedby', 'regPackageHoverPopover');

        requestAnimationFrame(() => placePackageHoverPopover(popover, card));
    };

    const hide = () => {
        hideTimer = setTimeout(() => {
            if (activeCard) activeCard.removeAttribute('aria-describedby');
            activeCard = null;
            popover.classList.remove('is-visible');
        }, 80);
    };

    cards.forEach(card => {
        if (card.__packageHoverBound) return;
        card.__packageHoverBound = true;
        card.tabIndex = card.tabIndex >= 0 ? card.tabIndex : 0;

        card.addEventListener('mouseenter', () => show(card));
        card.addEventListener('mouseleave', hide);
        card.addEventListener('focusin', () => show(card));
        card.addEventListener('focusout', hide);
        card.addEventListener('click', () => show(card));
    });

    window.addEventListener('scroll', () => {
        if (activeCard && popover.classList.contains('is-visible')) {
            placePackageHoverPopover(popover, activeCard);
        }
    }, true);

    window.addEventListener('resize', () => {
        if (activeCard && popover.classList.contains('is-visible')) {
            placePackageHoverPopover(popover, activeCard);
        }
    });
}

function getPackageUserBreakdown(code) {
    const normalized = String(code || 'start').toLowerCase();
    return PACKAGE_USER_BREAKDOWN[normalized] || `${getPackageInfo(normalized).max_felhasznalo || 0} felhasználó`;
}

let packageCache = { ...DEFAULT_PACKAGES };

function formatFt(value) {
    const n = Number(value || 0);
    return `${new Intl.NumberFormat('hu-HU').format(n)} Ft`;
}

function getPackageInfo(code = getSelectedPackageCode()) {
    const normalized = String(code || 'start').toLowerCase();
    return packageCache[normalized] || DEFAULT_PACKAGES[normalized] || DEFAULT_PACKAGES.start;
}

function getSelectedBillingPeriod() {
    const checked = document.querySelector('input[name="fizetesiIdoszak"]:checked');
    return checked ? checked.value : 'havi';
}

function getBasePrice(pkg, period) {
    if (!pkg) return 0;
    if (period === 'eves') return Number(pkg.ar_eves || 0);
    if (period === 'negyedeves') return Number(pkg.ar_negyedeves || 0);
    return Number(pkg.ar_havi || 0);
}

function getExtraUserCount() {
    const input = document.querySelector('#extraFelhasznalo');
    const n = Number(input ? input.value : 0);

    if (!Number.isFinite(n) || n <= 0) return 0;

    return Math.max(0, Math.min(20, Math.floor(n)));
}

function getRegistrationPricing() {
    const selectedCode = getSelectedPackageCode();
    const pkg = getPackageInfo(selectedCode);
    const csomagKod = String(pkg.kod || selectedCode || 'start').toLowerCase();
    const period = csomagKod === 'demo' ? 'demo' : getSelectedBillingPeriod();
    const baseUsers = Number(pkg.max_felhasznalo || 0);
    const extraUsers = csomagKod === 'demo' ? 0 : getExtraUserCount();
    const basePrice = csomagKod === 'demo' ? 0 : getBasePrice(pkg, period);
    const extraUnitPrice = csomagKod === 'demo' ? 0 : Number(EXTRA_USER_PRICES[csomagKod]?.[period] || 0);
    const extraPrice = extraUsers * extraUnitPrice;
    const totalPrice = basePrice + extraPrice;

    return {
        csomagKod,
        packageName: pkg.nev || csomagKod,
        period,
        baseUsers,
        extraUsers,
        totalUsers: baseUsers + extraUsers,
        basePrice,
        extraUnitPrice,
        extraPrice,
        totalPrice
    };
}

function initExtraUserInput() {
    const input = document.querySelector('#extraFelhasznalo');
    if (!input) return;

    input.type = 'number';
    input.min = '0';
    input.max = '20';
    input.step = '1';
    if (input.value === '') input.value = '0';
}

function updatePricingPanel() {
    const baseInfo = document.querySelector('#basePackageInfo');
    const summary = document.querySelector('#priceSummary');
    const extraInput = document.querySelector('#extraFelhasznalo');
    const pricing = getRegistrationPricing();

    if (extraInput) {
        extraInput.disabled = pricing.csomagKod === 'demo';
        if (pricing.csomagKod === 'demo') {
            extraInput.value = '0';
        } else {
            const n = getExtraUserCount();
            if (String(n) !== String(extraInput.value)) extraInput.value = String(n);
        }
    }

    document.querySelectorAll('input[name="fizetesiIdoszak"]').forEach(input => {
        input.disabled = pricing.csomagKod === 'demo';
    });

    if (baseInfo) {
        baseInfo.textContent = `${pricing.packageName}: alap keret ${getPackageUserBreakdown(pricing.csomagKod)}.`;
    }

    if (!summary) return;

    if (pricing.csomagKod === 'demo') {
        summary.innerHTML = `
            <strong>Demo csomag</strong><br>
            Próbálja ki ingyen!<br>
                    <li>: Regisztráció után levelet kap egy kóddal, mellyel létrehozhatja a felhasználói fiókját!</li>
        `;
        return;
    }

    summary.innerHTML = `
        <strong>Fizetendő összeg:</strong> <span style="font-size:1.2em; color:#c2410c; font-weight:bold;">${formatFt(pricing.totalPrice)}</span><br>
        Alapcsomag ára: <strong>${formatFt(pricing.basePrice)}</strong><br>
        Plusz felhasználók: <strong>${pricing.extraUsers}</strong> × ${formatFt(pricing.extraUnitPrice)} = <strong>${formatFt(pricing.extraPrice)}</strong><br>
        Alap keret: <strong>${escapeHTML(getPackageUserBreakdown(pricing.csomagKod))}</strong><br>
        Teljes felhasználói keret: <strong>${pricing.totalUsers}</strong> fő<br>
        <small>Előzetes Kalkuláció</small>
    `;
}

async function loadPublicPackagesForRegistration() {
    try {
        const response = await fetch('/api/public-packages');
        const data = await response.json();
        if (data.success && Array.isArray(data.packages)) {
            data.packages.forEach(pkg => {
                if (!pkg.kod) return;
                packageCache[String(pkg.kod).toLowerCase()] = {
                    ...getPackageInfo(pkg.kod),
                    ...pkg
                };
            });
        }
    } catch (err) {
        console.warn('Publikus csomagárak betöltése sikertelen, fallback árakkal számolok.', err);
    } finally {
        updatePricingPanel();
    }
}

function pricingSummaryHtml(pricing) {
    if (pricing.csomagKod === 'demo') {
        return `
            <div class="regi-summary-box">
                <b>Választott csomag</b>
                <ul style="font-style: italic;">
                    <li>${escapeHTML(pricing.packageName)}</li>
                    <li>Pórbálja ki ingyen!</li>
                    <li>Regisztráció után levelet kap egy kóddal, mellyel létrehozhatja a felhasználói fiókját!</li>
                </ul> 
            </div>
        `;
    }

    return `
        <div class="regi-summary-box">
            <b>Fizetési összesítő</b>
            <ul style="font-style: italic;">
                <li>Csomag: ${escapeHTML(pricing.packageName)}</li>
                <li>Időszak: ${escapeHTML(pricing.period)}</li>
                <li>Alap keret: ${escapeHTML(getPackageUserBreakdown(pricing.csomagKod))}</li>
                <li>Alapcsomag: ${escapeHTML(formatFt(pricing.basePrice))}</li>
                <li>Plusz felhasználók: ${pricing.extraUsers} × ${escapeHTML(formatFt(pricing.extraUnitPrice))} = ${escapeHTML(formatFt(pricing.extraPrice))}</li>
                <li><b>Összesen: ${escapeHTML(formatFt(pricing.totalPrice))}</b></li>
                <li>Ez még nem díjbekérő. A díjbekérővel külön jelentkezünk.</li>
            </ul>
        </div>
    `;
}

function getUresModulAdatok() {
    const modulValasztas = document.querySelector('input[name="modulValasztas"]:checked');
    const modulTipus = modulValasztas ? modulValasztas.value : "";

    const ujModulNevInput = document.querySelector("#ujModulNev");
    const ujModulLeirasInput = document.querySelector("#ujModulLeiras");
    const szamolasInput = document.querySelector('input[name="szamolasTipus"]:checked');

    return {
        modulTipus,
        ujModulNev: ujModulNevInput ? ujModulNevInput.value.trim() : "",
        ujModulLeiras: ujModulLeirasInput ? ujModulLeirasInput.value.trim() : "",
        szamolas: szamolasInput ? Number(szamolasInput.value) : null,
        szamolasNev:
            szamolasInput && szamolasInput.value === "1"
                ? "Normál pontszámítás"
                : "Arányosított számítás"
    };
}


function getSelectedPackageCode() {
    const checked = document.querySelector('input[name="csomagKod"]:checked');
    if (checked) return checked.value;

    const hidden = document.querySelector('#csomagKod');
    if (hidden && hidden.value) return hidden.value;

    return '';
}

function normalizeBillingParam(value) {
    const normalized = String(value || '').toLowerCase().trim();

    if (['havi', 'monthly', 'month', '1'].includes(normalized)) return 'havi';
    if (['negyedeves', 'negyedéves', 'quarterly', 'quarter', '3'].includes(normalized)) return 'negyedeves';
    if (['eves', 'éves', 'yearly', 'annual', '12'].includes(normalized)) return 'eves';

    return '';
}

function getRegistrationUrlPreset() {
    const params = new URLSearchParams(window.location.search);
    const packageCode = (params.get('package') || params.get('csomag') || '').toLowerCase().trim();
    const billing = normalizeBillingParam(params.get('billing') || params.get('idoszak') || params.get('period'));
    const mode = (params.get('mode') || params.get('reg') || params.get('tipus') || '').toLowerCase().trim();
    const source = (params.get('source') || '').toLowerCase().trim();

    return {
        packageCode,
        billing,
        shouldOpenCompany: !!packageCode || mode === 'ceg' || mode === 'intezmeny' || source === 'araink'
    };
}

function applyPackageChoiceFromUrl() {
    const { packageCode, billing } = getRegistrationUrlPreset();

    if (packageCode) {
        const radio = document.querySelector(`input[name="csomagKod"][value="${CSS.escape(packageCode)}"]`);

        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    if (billing) {
        const billingRadio = document.querySelector(`input[name="fizetesiIdoszak"][value="${CSS.escape(billing)}"]`);

        if (billingRadio) {
            billingRadio.checked = true;
            billingRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

function openCompanyRegistrationFromUrlPreset() {
    const { shouldOpenCompany } = getRegistrationUrlPreset();

    if (!shouldOpenCompany) return;

    const companyRadio = document.querySelector('#contactChoice2');

    if (companyRadio) {
        companyRadio.checked = true;
        companyRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (regi0) {
        regi0.click();
    }
}

function applyModuleChoiceFromUrlPreset() {
    const { packageCode } = getRegistrationUrlPreset();

    if (packageCode !== 'sajat') return;

    const uresRadio = document.querySelector('#mod-ures');

    if (uresRadio) {
        uresRadio.checked = true;
        uresRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function applyRegistrationPresetFromUrl() {
    applyPackageChoiceFromUrl();
    openCompanyRegistrationFromUrlPreset();
    updatePricingPanel();
}

function showPackageError(message) {
    const err = document.querySelector('#csomagKodErr');
    if (err) {
        err.textContent = message;
        err.style.display = 'block';
        err.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        showAlert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initExtraUserInput();
    initPackageHoverDetails();

    document.querySelectorAll('input[name="csomagKod"], input[name="fizetesiIdoszak"]').forEach(input => {
        input.addEventListener('change', updatePricingPanel);
    });

    const extraInput = document.querySelector('#extraFelhasznalo');

    if (extraInput) {
        extraInput.addEventListener('input', updatePricingPanel);
        extraInput.addEventListener('change', updatePricingPanel);
    }

    applyRegistrationPresetFromUrl();
    loadPublicPackagesForRegistration();
});

function getAiRegistrationChoice() {
    const aiCheckbox = document.querySelector('#regAiEnabled');
    return {
        enabled: !!(aiCheckbox && aiCheckbox.checked),
        statusText: aiCheckbox && aiCheckbox.checked
            ? 'Engedélyezve: az intézmény használhatja az MI-alapú szövegezési segédfunkciót.'
            : 'Kikapcsolva: az intézményben az MI-funkció alapból nem használható.'
    };
}
// Céges regisztráció megjelenítése
regi0.addEventListener("click", function(event){
    event.preventDefault();

    regi0.classList.add("kijelolt");
    regifin.classList.remove('fade-in');
    regifin.style.display = 'none';
    regi.style.display = "flex";
    regi.classList.add('fade');

    const regiHero = document.querySelector(".al-alap");
    if (regiHero) {
        regiHero.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    setTimeout(function() {
        regi.classList.add('fade-in');
    }, 10);
});

// Csomagok megjelenítése
cegradio.addEventListener("change", function() {
    handleRegistrationChange(true);  // true, ha céges regisztráció
});

// Kalkuláció függvény (Biztonságossá téve, ha a csomagok rejtve vannak)
function kalkulacio() {
    const felhasznaloSzam = parseInt(felhasznaloSzamInput.value);
    const kivalasztottRadio = document.querySelector('input[name="elofizI"]:checked');

    if (!isNaN(felhasznaloSzam) && kivalasztottRadio) {
        const idoHossz = parseInt(kivalasztottRadio.value);
        const egysegar = arak[idoHossz];
        const osszeg = felhasznaloSzam * egysegar;

        if (eredmenyElem) {
            eredmenyElem.innerHTML = `Előzetes kalkuláció: ${osszeg} forint összesen / ${idoHossz} hó.<br>
            <legend>Ez az összeg nem minősül ajánlattételnek, pusztán tájékoztató jellegű!</legend>`;
        }
    } else if (eredmenyElem) {
        eredmenyElem.innerHTML = "A felhasználók az intézményi regisztráció <strong>után</strong> a 'Felhasználói regisztráció'-ra kattintva tudnak majd regisztrálni!";
    }
}

// Kalkuláció indítása input változáskor
if (felhasznaloSzamInput) felhasznaloSzamInput.addEventListener("input", kalkulacio);
if (radioGombok) radioGombok.forEach(radio => radio.addEventListener("click", kalkulacio));

// Turkálás az adatbázisban
// Intézménynév ellenőrzés
export const intnev = document.querySelector("#int");
intnev.addEventListener("input", function() {
    const intezmeny = this.value.trim();
    const interr = document.querySelector("#interr");
    if (intezmeny.length >= 3) {
        fetch(`/check-intezmeny?intezmeny=${encodeURIComponent(intezmeny)}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    interr.textContent = "Ezzel az intézmény névvel már regisztráltak.";
                    intnev.setAttribute('data-valid', 'false');
                    intnev.classList.add("borderr");
                } else {
                    interr.textContent = "";
                    intnev.setAttribute('data-valid', 'true');
                    intnev.classList.remove("borderr");
                }
            })
            .catch(error => console.error("Hiba:", error));
    } else {                    
        interr.textContent = "Az intézménynév nem lehet kevesebb 3 karakternél.";
        intnev.classList.add("borderr");
    }
});

// Intézmény adószám ellenőrzés
const adosz = document.querySelector("#adosz");
adosz.addEventListener("input", function() {
    const adsz = this.value.trim();
    const aderr = document.querySelector("#aderr");
    if (adsz.length >= 13) {
        fetch(`/check-adsz?adsz=${encodeURIComponent(adsz)}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    aderr.textContent = "Ezzel az adószámmal már regisztráltak.";
                    adosz.setAttribute('data-valid', 'false');
                    adosz.classList.add("borderr");
                } else {
                    aderr.textContent = "";
                    adosz.setAttribute('data-valid', 'true');
                    adosz.classList.remove("borderr");
                }
            })
            .catch(error => console.error("Hiba:", error));
    } else {                    
        aderr.textContent = "Az adószám nem lehet kevesebb 13 karakternél (kötőjelekkel együtt).";
        adosz.classList.add("borderr");
    }
});

// REGISZTRÁCIÓ (Itt van a varázslat! 🌟)
export function initCompanyRegistration() {

    document.querySelector("#cegesRegi").addEventListener("submit", function(event) {
        event.preventDefault();  

        const modulAdatok = getUresModulAdatok();
        const aiAdatok = getAiRegistrationChoice();
        const csomagKod = modulAdatok.modulTipus === 'ures' ? 'sajat' : getSelectedPackageCode();

        const packageErr = document.querySelector('#csomagKodErr');
        if (packageErr) packageErr.textContent = '';

        if (!csomagKod) {
            showPackageError('Válasszon csomagot a regisztráció folytatásához. Demo esetén nincs fizetési kötelezettség.');
            return;
        }

        if (csomagKod === 'sajat' && modulAdatok.modulTipus !== 'ures') {
            showPackageError('A Saját rendszer csomaghoz az üres értékelő rendszer létrehozását kell választani. Kész szakmai anyaghoz válasszon Demo, Start vagy Pro csomagot.');
            return;
        }

        let selectedModuleTexts = [];
        let selectedModuleIds = [];
        let intmod = "";

        if (modulAdatok.modulTipus === "meglevo") {
            const selectedRadio = document.querySelector('input[name="modulValasztas"][value="meglevo"]:checked');

            if (selectedRadio) {
                selectedModuleIds = [selectedRadio.dataset.modulId];
                selectedModuleTexts = [selectedRadio.dataset.modulNev || selectedRadio.dataset.modulLeiras || "Fejlesztő-nevelő oktatás"];
                intmod = selectedModuleIds.join(",");
            }
        }

        const int = document.querySelector("#int");
        const irsz2 = document.querySelector("#irsz2");
        const szekhely = document.querySelector("#szekhely");
        const adosz = document.querySelector("#adosz");
        const cim = document.querySelector("#cim");
        const vez2 = document.querySelector("#vez2");
        const orsz2 = document.querySelector("#orsz2");
        const mail2 = document.querySelector("#mail2");
        const tel2 = document.querySelector("#tel2");

        const orrErr2 = document.querySelector("#orrErr2");
        const irszErr2 = document.querySelector("#irszErr2");
        const interr = document.querySelector("#interr");
        const cimerr = document.querySelector("#cimerr");
        const aderr = document.querySelector("#aderr");
        const vez2err = document.querySelector("#vez2err");
        const Err = document.querySelector("#Err");
        const tel2err = document.querySelector("#telceg2err");
        const foerr = document.querySelector("#foerr");

        const pricing = getRegistrationPricing();
        const infov = pricing.totalUsers;
        let letszamRendben = Number.isInteger(infov) && infov > 0;

        if (!letszamRendben && foerr) {
            foerr.textContent = "A felhasználói keret nem számolható. Válasszon csomagot.";
        } else if (foerr) {
            foerr.textContent = "";
        }

        const itnezmenyNev = validacio(int, userRegex, interr, "Írjon be teljes intézmény/cég nevet!");
        const adoszam = validacio(adosz, adoszamRegex, aderr, "Az adószám helyes formátuma: 12345678-9-10");
        const orszag = orsz2 ? validacio(orsz2, countRegex, orrErr2, "Írja be helyesen az ország nevét!") : true;
        const varos = szekhely ? validacio(szekhely, cityRegex, Err, "Írjon be valós települést!") : true;
        const iranyitoszam = irsz2 ? validacio(irsz2, postalCodeRegex, irszErr2, "Az irányítószámnak 4 számjegyűnek kell lennie.") : true;
        const cimutca = validacio(cim, addressRegex, cimerr, "Írjon be a teljes címet!");
        const nev = validacio(vez2, nameRegex, vez2err, "Adjon meg valós vezetéknevet!");

        const adszellenorzott = adosz.getAttribute("data-valid") === "true";
        const intnevellenorzott = int.getAttribute("data-valid") === "true";

        if (!adszellenorzott) {
            aderr.innerHTML = "Ezzel az adószámmal már regisztráltak!";
            adosz.classList.add("borderr");
        }

        if (!intnevellenorzott) {
            interr.innerHTML = "Ezzel az intézménynévvel már regisztráltak!";
            int.classList.add("borderr");
        }

        let telefon2 = true;

        if (tel2 && tel2.value.trim() !== "") {
            const telRegex = /^(\+36|06)\d{9}$/;
            telefon2 = validacio(tel2, telRegex, tel2err, "Adjon meg valós telefonszámot! (pl. +36301234567)");
        }

        let modulRendben = true;
        const modulErr = document.querySelector("#modulValasztasErr");

        if (!modulAdatok.modulTipus) {
            modulRendben = false;
            if (modulErr) modulErr.textContent = "Kérjük, válasszon szakmai anyagot vagy üres értékelő rendszert.";
        } else if (modulAdatok.modulTipus === "ures") {
            if (!modulAdatok.ujModulNev || !modulAdatok.ujModulLeiras || ![0, 1].includes(modulAdatok.szamolas)) {
                modulRendben = false;
                if (modulErr) modulErr.textContent = "Üres értékelő rendszer esetén a nevet, leírást és számítási módot is meg kell adni.";
            } else {
                if (modulErr) modulErr.textContent = "";
            }
        } else {
            if (modulErr) modulErr.textContent = "";
        }

        if (
            adszellenorzott &&
            intnevellenorzott &&
            itnezmenyNev &&
            adoszam &&
            iranyitoszam &&
            varos &&
            orszag &&
            cimutca &&
            nev &&
            telefon2 &&
            letszamRendben &&
            modulRendben
        ) {
            const intv = int.value.trim();
            const intirv = irsz2.value.trim();
            const orszv = orsz2.value.trim();
            const szekhelyv = szekhely.value.trim();
            const adoszv = adosz.value.trim();
            const cimv = cim.value.trim();
            const mail2v = mail2.value.trim();
            const tel2v = tel2.value.trim(); 
            const vez2v = vez2.value.trim();

            const mailCegv = mail2v;
            const telCegv = tel2v;
            const intfinv = 10;

            al_alap.style.display = "none";

            const intezmenynevAdatok = new IntezmenynevAdatok(intv, adoszv);
            const intezmenyiAdatok = new IntezmenyiAdatok(orszv, intirv, szekhelyv, cimv, mailCegv, telCegv);
            const kapcsolattarto = new KapcsolatiAdatok(vez2v, mail2v, tel2v);
            const finanszirozas = new FinanszirozasAdatok(intfinv, infov);
            const fizetesiOsszesitoHTML = pricingSummaryHtml(pricing);
            const elfogadas = new ElfogadasAdatok();
            const gombok = new Gombok();

            const modulesHTML = modulAdatok.modulTipus === "ures"
                ? `
                    <div class="regi-summary-box">
                        <b>Választott rendszer</b>
                        <ul style="font-style: italic;">
                            <li>Üres értékelő rendszer</li>
                            <li><b>Terület neve:</b> ${escapeHTML(modulAdatok.ujModulNev)}</li>
                            <li><b>Leírás:</b> ${escapeHTML(modulAdatok.ujModulLeiras)}</li>
                            <li><b>Számítási mód:</b> ${escapeHTML(modulAdatok.szamolasNev)}</li>
                        </ul>
                    </div>
                  `
                : selectedModuleTexts.length
                    ? `
                        <div class="regi-summary-box">
                            <b>Választott modulok</b>
                            <ul style="font-style: italic;">
                                ${selectedModuleTexts.map(txt => `<li>${escapeHTML(txt)}</li>`).join("")}
                            </ul>
                        </div>
                      `
                    : "<p>Nincs kiválasztott modul.</p>";

            const aiSummaryHTML = `
                <div class="regi-summary-box">
                    <b>MI-alapú szövegezési segédfunkció</b>
                    <ul style="font-style: italic;">
                        <li>${escapeHTML(aiAdatok.statusText)}</li>
                    </ul>
                </div>
            `;

            const kirakottSablon = `
                <h4>Regisztráció elfogadása</h4>
                <div class="labels">
                    <div>  
                        ${intezmenynevAdatok.render()}
                        ${kapcsolattarto.render()}
                    </div>
                    <div style="margin-left: 15px;"> 
                        ${intezmenyiAdatok.render()}
                    </div>   
                </div>   
                <div>
                    ${finanszirozas.render()}
                    ${fizetesiOsszesitoHTML}
                    ${modulesHTML}
                    ${aiSummaryHTML}   
                    ${elfogadas.render()}
                    ${gombok.render()}
                </div>   
            `;

            const ellenorzes = document.createElement("div");
            alap.appendChild(ellenorzes);
            ellenorzes.classList.add("ellenorzes");
            ellenorzes.style.opacity = "0";
            ellenorzes.style.transform = "translateY(100%)";
            ellenorzes.innerHTML = kirakottSablon;

            const open = document.querySelector(".alap");

            setTimeout(function() {
                open.scrollIntoView({ behavior: "smooth", block: "center" });
                ellenorzes.style.transform = "translateY(0)";
                ellenorzes.style.opacity = "1";
            }, 10);

            document.querySelector("#megsem").addEventListener("click", function(event) {
                event.preventDefault();
                vissza(ellenorzes, al_alap, regi);
            });

            document.querySelector("#megerosit").addEventListener("click", function(event) {
                event.preventDefault();

                if (!document.querySelector("#afsz").checked || !document.querySelector("#afsz3").checked || !document.querySelector("#afsz4").checked) {
                    document.getElementById("afszerr2").textContent = "Minden hozzájárulást el kell fogadni a regisztrációhoz.";
                    return;
                }

                const data = {
                    intv,
                    intirv,
                    orszv,
                    szekhelyv,
                    adoszv,
                    cimv,
                    mailCegv,
                    telCegv,
                    vez2v,
                    infov,
                    intfinv,
                    tel2v,
                    mail2v,
                    intmod,
                    modulTipus: modulAdatok.modulTipus,
                    ujModulNev: modulAdatok.ujModulNev,
                    ujModulLeiras: modulAdatok.ujModulLeiras,
                    szamolas: modulAdatok.szamolas,
                    aiEnabled: aiAdatok.enabled,
                    csomagKod,
                    fizetesiIdoszak: pricing.period,
                    extraFelhasznalo: pricing.extraUsers,
                    kalkulaltAlapAr: pricing.basePrice,
                    kalkulaltExtraAr: pricing.extraPrice,
                    kalkulaltVegosszeg: pricing.totalPrice
                };

                fetch("/register/institution", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.message || "Ismeretlen hiba.");
                        });
                    }

                    return response.json();
                })
                .then(data => {
                    if (data.message === "Intézményi regisztráció sikeres") {
                        const arSzoveg = data.fizetendoOsszeg && data.fizetendoOsszeg > 0
                            ? `

Fizetendő összeg: ${formatFt(data.fizetendoOsszeg)}. Ez még nem díjbekérő; a díjbekérővel hamarosan jelentkezünk.`
                            : "Demo csomag esetén nincs fizetési kötelezettség.";
                        showAlert(`Regisztráció sikeres! A regisztrációs kódot elküldtük e-mailben.${arSzoveg}`);
                        regifin.style.display = "flex";
                        alap.removeChild(ellenorzes);
                        setTimeout(function() { location.reload(); }, 5000);
                    } else {
                        showAlert("Hiba történt a regisztráció során.");
                        alap.removeChild(ellenorzes);
                    }
                })
                .catch(error => {
                    regifin.style.display = "flex";
                    regifin.scrollIntoView({ behavior: "smooth", block: "center" });
                    regifin.innerHTML = "Hiba történt: " + error.message;
                    showAlert("Hiba történt: " + error.message);
                });
            });
        } else { 
            if (eredmenyElem) {
                eredmenyElem.innerHTML = "Vannak olyan adatok melyek nem helyesek, kérjük javítsa a pirossal jelzett mezőket!";
            }

            const regceg = document.querySelector("#regCeg");

            if (regceg) {
                regceg.classList.add("shake");
                setTimeout(function() { regceg.classList.remove("shake"); }, 600);
            }

            showAndHideErrorMessages(); 
        }
    });
}

// -------- modul-checkboxok (#szakmaiceg) dinamikus betöltése --------
const szakmaicegBox = document.querySelector('#szakmaiceg');

async function loadModulok() {
    if (!szakmaicegBox) {
        console.warn("#szakmaiceg konténer nem található");  
        return;
    }

    try {
        const res = await fetch("/modulok");   

        if (!res.ok) {
            throw new Error("Hiba a modulok lekérésénél.");
        }

        const modulok = await res.json();

        szakmaicegBox.innerHTML = "";

        const filteredMods = modulok.filter(m => m.id == 1);

        filteredMods.forEach(({ id, nev, leiras }) => {
            const wrap = document.createElement("div");
            wrap.classList.add("modul-choice-row");

            const rb = document.createElement("input");
            rb.type = "radio";
            rb.name = "modulValasztas";
            rb.value = "meglevo";
            rb.id = `mod-${id}`;
            rb.dataset.modulId = id;
            rb.dataset.modulNev = nev || "";
            rb.dataset.modulLeiras = leiras || "";
            rb.checked = true;

            const label = document.createElement("label");
            label.htmlFor = rb.id;
            label.textContent = leiras || nev || "Fejlesztő-nevelő oktatás";

            wrap.append(rb, label);
            szakmaicegBox.appendChild(wrap);
        });

        const uresWrap = document.createElement("div");
        uresWrap.classList.add("modul-choice-row", "ures-modul-row");

        uresWrap.innerHTML = `
            <div class="ures-modul-fejlec">
                <input type="radio" name="modulValasztas" value="ures" id="mod-ures">
                <label for="mod-ures">Üres értékelő rendszert szeretnék.</label>
            </div>

            <div id="uresModulPanel" class="ures-modul-panel">
                <legend>Új értékelési terület adatai</legend>

                <div class="allabel">
                    <div>
                        <label for="ujModulNev">
                            Név
                            <span class="info-tip" data-tip="Adja meg a terület nevét, amit mérni szeretne az Értékek segítségével.">?</span>
                        </label>
                        <input style="width:75% !important" type="text" id="ujModulNev" placeholder="Például: Belső intézményi önértékelés">
                    </div>
                </div>

                <div class="allabel">
                    <div>
                        <label for="ujModulLeiras">
                            Leírás
                            <span class="info-tip" data-tip="Adjon egy rövid leírást arról a területről, amellyel dolgozni fog.">?</span>
                        </label>
                        <textarea id="ujModulLeiras" rows="3" placeholder="Röviden írja le, milyen értékelési területhez használja majd a rendszert."></textarea>
                    </div>
                </div>

                <legend>Számítási mód</legend>

                <div class="szamolas-tipusok">
                    <div class="szamolas-kartya">
                        <input type="radio" id="szamolasAranyositott" name="szamolasTipus" value="0" checked>
                        <label for="szamolasAranyositott">
                            Arányosított számítás
                            <span class="info-tip" data-tip="A válaszok értékét százalékos arányban számolja. Akkor hasznos, ha az ágak, kérdések vagy alkérdések eltérő súlyúak, mégis összehasonlítható eredményt szeretne.">?</span>
                        </label>
                    </div>

                    <div class="szamolas-kartya">
                        <input type="radio" id="szamolasNormal" name="szamolasTipus" value="1">
                        <label for="szamolasNormal">
                            Normál pontszámítás
                            <span class="info-tip" data-tip="Egyszerű pontösszeadás. A rendszer az elért pontokat az összes megszerezhető ponthoz viszonyítja. Akkor jó, ha minden kiválasztott kérdés közvetlenül pontot ér.">?</span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        szakmaicegBox.appendChild(uresWrap);

        const modulRadios = document.querySelectorAll('input[name="modulValasztas"]');
        const uresModulPanel = document.querySelector("#uresModulPanel");

        function frissitUresModulPanel() {
            const valasztott = document.querySelector('input[name="modulValasztas"]:checked');

            if (!uresModulPanel || !valasztott) return;

            if (valasztott.value === "ures") {
                uresModulPanel.style.display = "block";
            } else {
                uresModulPanel.style.display = "none";
            }
        }

        modulRadios.forEach(radio => {
            radio.addEventListener("change", frissitUresModulPanel);
        });

        frissitUresModulPanel();
        applyModuleChoiceFromUrlPreset();

        const err = document.createElement("div");
        err.classList.add("err");
        err.id = "modulValasztasErr";
        szakmaicegBox.appendChild(err);

    } catch (err) {
        console.error("Modul-betöltési hiba:", err);
    }
}

document.addEventListener('DOMContentLoaded', loadModulok);

document.addEventListener('change', function(event) {
    if (event.target && event.target.matches('input[name="csomagKod"]')) {
        const err = document.querySelector('#csomagKodErr');
        if (err) err.textContent = '';
    }
});
