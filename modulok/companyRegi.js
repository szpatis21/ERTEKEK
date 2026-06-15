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
    const select = document.querySelector('#extraFelhasznalo');
    const n = Number(select ? select.value : 0);
    return Number.isInteger(n) && n > 0 ? n : 0;
}

function getRegistrationPricing() {
    const csomagKod = getSelectedPackageCode();
    const pkg = getPackageInfo(csomagKod);
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

function initExtraUserSelect() {
    const select = document.querySelector('#extraFelhasznalo');
    if (!select) return;

    select.innerHTML = '';
    for (let i = 0; i <= 20; i += 1) {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = i === 0 ? 'Nem kérek plusz felhasználót' : `+${i} felhasználó`;
        select.appendChild(option);
    }
}

function updatePricingPanel() {
    const baseInfo = document.querySelector('#basePackageInfo');
    const summary = document.querySelector('#priceSummary');
    const extraSelect = document.querySelector('#extraFelhasznalo');
    const pricing = getRegistrationPricing();

    if (extraSelect) {
        extraSelect.disabled = pricing.csomagKod === 'demo';
        if (pricing.csomagKod === 'demo') extraSelect.value = '0';
    }

    document.querySelectorAll('input[name="fizetesiIdoszak"]').forEach(input => {
        input.disabled = pricing.csomagKod === 'demo';
    });

    if (baseInfo) {
        baseInfo.textContent = `${pricing.packageName}: alap keret ${pricing.baseUsers} felhasználó.`;
    }

    if (!summary) return;

    if (pricing.csomagKod === 'demo') {
        summary.innerHTML = `
            <strong>Demo csomag</strong><br>
            Fizetési kötelezettség nincs.<br>
            Felhasználói keret: <strong>${pricing.totalUsers}</strong> fő.
        `;
        return;
    }

    summary.innerHTML = `
        <strong>Fizetendő összeg:</strong> <span style="font-size:1.2em; color:#c2410c; font-weight:bold;">${formatFt(pricing.totalPrice)}</span><br>
        Alapcsomag ára: <strong>${formatFt(pricing.basePrice)}</strong><br>
        Plusz felhasználók: <strong>${pricing.extraUsers}</strong> × ${formatFt(pricing.extraUnitPrice)} = <strong>${formatFt(pricing.extraPrice)}</strong><br>
        Teljes felhasználói keret: <strong>${pricing.totalUsers}</strong> fő<br>
        <small>Ez még nem díjbekérő. A regisztráció után a díjbekérővel külön jelentkezünk.</small>
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
                    <li>Fizetési kötelezettség nincs.</li>
                    <li>Felhasználói keret: ${pricing.totalUsers} fő</li>
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

function initPackageChoiceFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get('package') || params.get('csomag') || '').toLowerCase();
    if (!fromUrl) return;

    const radio = document.querySelector(`input[name="csomagKod"][value="${CSS.escape(fromUrl)}"]`);
    if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
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
    initPackageChoiceFromUrl();
    initExtraUserSelect();
    loadPublicPackagesForRegistration();
    document.querySelectorAll('input[name="csomagKod"], input[name="fizetesiIdoszak"]').forEach(input => {
        input.addEventListener('change', updatePricingPanel);
    });
    const extraSelect = document.querySelector('#extraFelhasznalo');
    if (extraSelect) extraSelect.addEventListener('change', updatePricingPanel);
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
    // Érdemes megállítani az alapértelmezett viselkedést
    event.preventDefault(); 

    // 1. A sötét háttér és a popup létrehozása
    const popupOverlay = document.createElement("div");
    popupOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 10000; opacity: 0; transition: opacity 0.3s ease-in-out;";

    const popupPanel = document.createElement("div");
    popupPanel.style.cssText = "background: #fff; padding: 35px; border-radius: 10px; max-width: 550px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin: 20px; border-top: 5px solid #2c3e50;";
    
    popupPanel.innerHTML = `
        <h3 style="margin-top: 0; color: #2c3e50; font-size: 1.5em;">Kedves Érdeklődő!</h3>
        <div style="color: #333; line-height: 1.6; text-align: justify; margin-bottom: 20px;">
            <p>Az Értékek rendszerben először csomagot választ, majd elvégzi az intézményi regisztrációt.</p>
            <p>A Demo 3 napos kipróbálásra szolgál, csökkentett szakmai anyaggal és fizetési kötelezettség nélkül.</p>
            <p>Fizetős csomag választásakor a munkatársak regisztrálhatók, de a belépés csak szerződés, fizetés és sysadmin aktiválás után válik elérhetővé.</p>
        </div>
        <p style="color: #2c3e50; font-weight: bold; font-size: 1.1em; margin-bottom: 30px;">Keressünk együtt Értékeket!</p>
        <button id="popupBezar" class="editbut" style="cursor: pointer; width: 100%; padding: 12px; font-weight: bold;">Értem</button>
    `;

    popupOverlay.appendChild(popupPanel);
    document.body.appendChild(popupOverlay);

    // Megjelenítés animációval
    setTimeout(() => { popupOverlay.style.opacity = "1"; }, 10);

    // 2. Az "Értem" gomb kezelése: Popup bezárása ÉS az eredeti funkciók futtatása
    document.getElementById("popupBezar").addEventListener("click", function() {
        
        // Popup elhalványítása
        popupOverlay.style.opacity = "0";
        
        setTimeout(() => { 
            // Popup végleges eltávolítása a DOM-ból
            document.body.removeChild(popupOverlay); 
            
            // --- ITT INDUL AZ EREDETI KÓDOD ---
            regi0.classList.add("kijelolt");    
            regifin.classList.remove('fade-in');
            regifin.style.display = 'none';
            regi.style.display = "flex";
            regi.classList.add('fade');  
            let regiHero=document.querySelector(".al-alap")
            regiHero.scrollIntoView({
                behavior: "smooth",
                block: "start" 
            });
            
            setTimeout(function() {
                regi.classList.add('fade-in'); 
            }, 10); 
            // --- EREDETI KÓD VÉGE ---

        }, 300); // Megvárjuk, amíg a fade-out animáció befejeződik (0.3 mp)
    });
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
                            : "

Demo csomag esetén nincs fizetési kötelezettség.";
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
