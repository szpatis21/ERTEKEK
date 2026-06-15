// Fő-, al- és altéma kategóriák, valamint főkérdések betöltése.
// A main_quest-old.js rugalmas loader-logikájából visszaemelve.
import { kerdesValaszok, modulIdBetoltve } from './main_alap.js';
import { Kerdes } from './main_category.js';
import { Focus } from './main_quest_focus.js';
import { showSuccessToast, showAlert } from '/both/alert.js';
import { setFokuszKulcs, rogzitFokusz } from './main_focus_history.js';
import {
    questState,
    questApi,
    Kategoria,
    initTemaLookupsFromRows,
    normalizeKategoriaKey
} from './main_quest_state.js';

export function logKerdesValaszok() {
    console.log('Kérdések jelenlegi állapota:');
    for (const [key, value] of Object.entries(kerdesValaszok)) {
        console.log(`Kérdés ID: ${key}, Állapot: ${value}`);
    }
}
function safeCssColor(value, fallback = '#ffffff') {
    const color = String(value || '').trim();

    if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;

    if (/^rgb\(\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*\)$/i.test(color)) {
        return color;
    }

    if (/^rgba\(\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(0|1|0?\.\d+)\s*\)$/i.test(color)) {
        return color;
    }

    return fallback;
}

function normalizalUtvonalErtek(value) {
    if (value === null || typeof value === 'undefined') return null;

    const clean = String(value).trim();
    return clean === '' ? null : clean;
}

function azonosUtvonalErtek(a, b) {
    return normalizalUtvonalErtek(a) === normalizalUtvonalErtek(b);
}
function isDemoLockedAlkategoria(item) {
    if (!item || typeof item !== 'object') return false;
    return item.demo_elerheto === false || item.demo_elerheto === 0 || item.demo_elerheto === '0';
}

function applyDemoLockedAlkategoria(div, item) {
    if (!div || !isDemoLockedAlkategoria(item)) return;

    div.classList.add('demo-locked-alkategoria');
    div.style.opacity = '0.45';
    div.style.filter = 'grayscale(0.8)';
    div.style.cursor = 'not-allowed';
    div.title = 'Ez az alkategória csak a teljes csomagban érhető el.';
    div.setAttribute('aria-disabled', 'true');

    const lock = document.createElement('span');
    lock.className = 'material-symbols-rounded demo-lock-icon';
    lock.textContent = 'lock';
    lock.style.marginLeft = '8px';
    lock.style.fontSize = '1.1em';
    lock.style.pointerEvents = 'none';

    const cim = div.querySelector('.cim');
    if (cim && !cim.querySelector('.demo-lock-icon')) {
        cim.appendChild(lock);
    }
}

function handleDemoRestrictedResponse(response, data) {
    if (response && response.status === 403 && data && data.code === 'DEMO_RESTRICTED_SUBCATEGORY') {
        showAlert(data.message || 'Ez az alkategória csak a teljes csomagban érhető el.');
        return true;
    }

    return false;
}


function pluszIkonSvg() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h240v80H200v560h560v-240h80v240q0 33-23.5 56.5T760-120H200Zm440-400v-120H520v-80h120v-120h80v120h120v80H720v120h-80Z"/>
        </svg>
    `;
}

function createHozzaadasKartya({ classNames = [], label = 'Hozzáadás ide', dataset = {} } = {}) {
    const div = document.createElement('div');
    div.classList.add(...classNames);
    div.setAttribute('data-id', '');

    Object.entries(dataset).forEach(([key, value]) => {
        div.dataset[key] = value;
    });

    const belso = document.createElement('div');

    const ikonWrap = document.createElement('span');
    ikonWrap.innerHTML = pluszIkonSvg(); // statikus, saját SVG

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label || '';

    belso.appendChild(ikonWrap);
    belso.appendChild(labelSpan);
    div.appendChild(belso);

    return div;
}

function getSavContextAction() {
    return document.getElementById('sav-context-action');
}

function beallitOldalsavMuvelet(label, handler) {
    const gomb = getSavContextAction();
    if (!gomb) return;

    gomb.textContent = label || '';
    gomb.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handler(e);
    };

    gomb.onkeydown = (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        gomb.click();
    };
}

function alapOldalsavAllapot() {
    aktivalOldalsavFokategoriaLetrehozas();
}

function elrejtOldalsavAlHozzaadas() {
    // Egyetlen oldalsáv-művelet van. Nincs külön alcsoport-gomb, amit el kellene rejteni.
}

async function nyissFoKategoriaLetrehozot() {
    const { CategoryCreator } = await import('../admin/upload/category_creator.js');
    const eredmeny = await CategoryCreator.open();

    if (!eredmeny) return;

    const { ujCim, ujLeiras, ujSzin } = eredmeny;
    const modulId = await modulIdBetoltve;

    fetch('/api/kategoriak/fo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nev: ujCim, leiras: ujLeiras, szin: ujSzin, modulId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alapOldalsavAllapot();
            questApi.KategoriaKezelo.loadFoKategoriak();
        } else {
            alert("Hiba: " + data.message);
        }
    });
}

function aktivalOldalsavFokategoriaLetrehozas() {
    if (!document.getElementById('szerkeszto')) return;

    beallitOldalsavMuvelet('Új főkategória', async () => {
        await nyissFoKategoriaLetrehozot();
    });
}

function aktivalOldalsavFoHozzaadas(foKategoriaNev, tartaly, kartya = null) {
    if (!document.getElementById('szerkeszto') || !foKategoriaNev || !tartaly) return;

    beallitOldalsavMuvelet('Hozzáadás ehhez a témakörhöz', async () => {
        await nyissFoHozzaadasValasztot(foKategoriaNev, tartaly, kartya);
    });
}

function aktivalOldalsavAlHozzaadas(foKategoriaNev, alKategoriaNev, tartaly) {
    if (!document.getElementById('szerkeszto') || !foKategoriaNev || !alKategoriaNev || !tartaly) return;

    beallitOldalsavMuvelet('Hozzáadás ehhez az alcsoporthoz', async () => {
        await nyissAlHozzaadasValasztot(foKategoriaNev, alKategoriaNev, tartaly);
    });
}

function aktivalOldalsavAltTemaKerdesHozzaadas(foKategoriaNev, alKategoriaNev, altTemaNev) {
    if (!document.getElementById('szerkeszto') || !foKategoriaNev || !altTemaNev) return;

    beallitOldalsavMuvelet('Kérdés hozzáadása ehhez a témához', async () => {
        const kerdesTartaly = document.getElementById('kerdesek');

        if (!kerdesTartaly) return;

        await nyissKerdesLetrehozot(
            kerdesTartaly,
            foKategoriaNev,
            normalizalUtvonalErtek(alKategoriaNev),
            altTemaNev
        );
    });
}
function getFoSzin(foKategoriaNev, fallback = '#ffffff') {
    return safeCssColor(
        questState.kategoriakSzinek[foKategoriaNev] ||
        questState.kategoriakSzinek[normalizeKategoriaKey(foKategoriaNev)] ||
        fallback,
        fallback
    );
}
function stilizalDirektKerdesBlokk(elem, foKategoriaNev) {
    const foSzin = getFoSzin(foKategoriaNev, '#ffffff');

    elem.style.borderColor = foSzin;
    elem.style.borderStyle = 'solid';
    elem.style.borderWidth = '3px';
}

function ensureFoDirektKerdesBlokk(foKategoriaNev, tartaly, afterElement = null) {
    let blokk = tartaly.querySelector(
        `[data-fo-kozvetlen-kerdesek="${CSS.escape(foKategoriaNev)}"]`
    );

    if (!blokk) {
        blokk = document.createElement('div');
        blokk.classList.add('fo-kozvetlen-kerdesek-blokk');
        blokk.dataset.foKozvetlenKerdesek = foKategoriaNev;
        stilizalDirektKerdesBlokk(blokk, foKategoriaNev);

        if (afterElement && afterElement.parentElement === tartaly) {
            afterElement.insertAdjacentElement('afterend', blokk);
        } else {
            tartaly.prepend(blokk);
        }
    }

    blokk.classList.remove('hidden');
    return blokk;
}

function ensureAlDirektKerdesTartaly(foKategoriaNev, alKategoriaNev, tartaly = null) {
    const alBlokk = tartaly?.closest?.('.al-blokk') || document.querySelector(
        `.al-blokk[data-fo-kategoria="${CSS.escape(foKategoriaNev)}"][data-al-kategoria="${CSS.escape(alKategoriaNev)}"]`
    );

    let direktTartaly = alBlokk?.querySelector('.al-direkt-kerdesek');

    if (!direktTartaly && alBlokk) {
        direktTartaly = document.createElement('div');
        direktTartaly.classList.add('al-direkt-kerdesek', 'hidden');
        direktTartaly.dataset.foKategoria = foKategoriaNev;
        direktTartaly.dataset.alKategoria = alKategoriaNev;
        stilizalDirektKerdesBlokk(direktTartaly, foKategoriaNev);
        alBlokk.insertBefore(direktTartaly, alBlokk.querySelector('.al-belso-alt-temak') || null);
    }

    if (!direktTartaly) {
        direktTartaly = document.getElementById('kerdesek');
    }

    if (direktTartaly) {
        direktTartaly.classList.remove('hidden');
    }

    return direktTartaly;
}

async function letrehozAlKategoriat(foKategoriaNev) {
    const { BasicEditor } = await import('../admin/upload/basic_editor.js');
    const ujCim = await BasicEditor.open('Új alcsoport létrehozása', '');

    if (!ujCim) return;

    const modulId = await modulIdBetoltve;

    fetch('/api/kategoriak/al_altema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tipus: 'al',
            nev: ujCim,
            foKategoria: foKategoriaNev,
            modulId
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            questApi.KategoriaKezelo.loadAlKategoriak(foKategoriaNev);
        } else {
            alert('Hiba: ' + data.message);
        }
    });
}

async function letrehozAltTemat(foKategoriaNev, alKategoriaNev = null) {
    const { BasicEditor } = await import('../admin/upload/basic_editor.js');
    const ujCim = await BasicEditor.open('Új téma létrehozása', '');

    if (!ujCim) return;

    const modulId = await modulIdBetoltve;

    fetch('/api/kategoriak/al_altema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tipus: 'altema',
            nev: ujCim,
            alKategoria: normalizalUtvonalErtek(alKategoriaNev),
            foKategoria: foKategoriaNev,
            modulId
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (alKategoriaNev) {
                questApi.KategoriaKezelo.loadAltTemak(foKategoriaNev, alKategoriaNev);
            } else {
                questApi.KategoriaKezelo.loadAlKategoriak(foKategoriaNev);
            }
        } else {
            alert('Hiba: ' + data.message);
        }
    });
}

function torolAlkerdesCacheHaLehet() {
    if (typeof questApi.KategoriaKezelo?.clearAlkerdesCache === 'function') {
        questApi.KategoriaKezelo.clearAlkerdesCache();
    }
}

async function frissitKerdesUtvonal(celFoKategoria, celAlKategoria, celAltTema, tartaly) {
    // Új főkérdés + alkérdés mentése után a backend már jó,
    // de a kliens oldali alkérdés-cache még lehet régi/üres.
    // Ha ezt nem töröljük, a friss render néha csak a főkérdést látja,
    // az alkérdések pedig csak teljes oldalfrissítés után jelennek meg.
    torolAlkerdesCacheHaLehet();

    if (celAlKategoria && !celAltTema && tartaly?.classList?.contains('al-direkt-kerdesek')) {
        tartaly.innerHTML = '';
        await questApi.KategoriaKezelo.loadKerdesek(celFoKategoria, celAlKategoria, null, {
            resetUi: true,
            appendMode: true,
            showContainer: true,
            targetContainer: tartaly,
            wrapperClass: 'al-kozvetlen-kerdesek-tartaly',
            prependMode: false
        });
        return;
    }

    if (!celAlKategoria && !celAltTema && tartaly?.classList?.contains('fo-kozvetlen-kerdesek-blokk')) {
        tartaly.innerHTML = '';
        await questApi.KategoriaKezelo.loadKerdesek(celFoKategoria, null, null, {
            resetUi: true,
            appendMode: true,
            showContainer: true,
            targetContainer: tartaly,
            wrapperClass: 'fo-kozvetlen-kerdesek-tartaly',
            prependMode: false
        });
        return;
    }

    await questApi.KategoriaKezelo.loadKerdesek(celFoKategoria, celAlKategoria, celAltTema);
}

async function nyissKerdesLetrehozot(tartaly, foKategoriaNev, alKategoriaNev, altTemaNev) {
    if (!tartaly) return;

    const celFoKategoria = normalizalUtvonalErtek(foKategoriaNev);
    const celAlKategoria = normalizalUtvonalErtek(alKategoriaNev);
    const celAltTema = normalizalUtvonalErtek(altTemaNev);

    tartaly.classList.remove('hidden');

    const { InlineQuestionCreator } = await import('../admin/upload/category_creator.js');

    const nyitottFokerdesSzerkeszto = tartaly.querySelector('.uj-ideiglenes-kerdes');

    if (nyitottFokerdesSzerkeszto) {
        nyitottFokerdesSzerkeszto.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        showSuccessToast('Már van egy megkezdett főkérdés-szerkesztés.');
        return;
    }

    const jelenlegiKerdesek = questApi.KategoriaKezelo.kerdesek.filter(k =>
        azonosUtvonalErtek(k.foKategoria, celFoKategoria) &&
        azonosUtvonalErtek(k.alKategoria, celAlKategoria) &&
        azonosUtvonalErtek(k.altTema, celAltTema) &&
        !k.parentId
    );

    const lementettMaxIndex = jelenlegiKerdesek.length > 0
        ? Math.max(...jelenlegiKerdesek.map(k => Number(k.kindex) || 0))
        : 0;

    const ideiglenesDb = tartaly.querySelectorAll('.uj-ideiglenes-kerdes').length;
    const kovetkezoIndex = lementettMaxIndex + ideiglenesDb + 1;

    const mentettAdatok = await InlineQuestionCreator.open(
        tartaly,
        kovetkezoIndex,
        celFoKategoria,
        celAlKategoria,
        celAltTema
    );

    if (!mentettAdatok) return;

    const modulId = await modulIdBetoltve;

    fetch('/kerdesek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            foKategoria: celFoKategoria,
            alKategoria: celAlKategoria,
            altTema: celAltTema,
            kerdesSzoveg: mentettAdatok.szoveg,
            negaltKerdesSzoveg: mentettAdatok.negaltSzoveg,
            ertek: mentettAdatok.ertek,
            negalt_ertek: mentettAdatok.negaltErtek,
            szoveges: mentettAdatok.szoveges,
            maximalis_szint: mentettAdatok.maxi,
            opcios: mentettAdatok.opcios ? 1 : 0,
            kindex: kovetkezoIndex,
            alkerdesek: mentettAdatok.alkerdesek,
            modulId
        })
    })
    .then(res => res.json())
    .then(async () => {
        showSuccessToast('Kérdés és alkérdések sikeresen hozzáadva!');
        await frissitKerdesUtvonal(celFoKategoria, celAlKategoria, celAltTema, tartaly);
    })
    .catch(err => console.error('Kérdés mentési hiba:', err));
}

async function nyissFoHozzaadasValasztot(foKategoriaNev, tartaly, kartya) {
    const { AddActionChooser } = await import('../admin/upload/add_action_chooser.js');

    const foLabel = String(foKategoriaNev || '').trim() || 'Témakör';

    const elsoValasztas = await AddActionChooser.open({
        title: 'Hozzáadás ehhez a témakörhöz',
        lead: 'Először azt válassza ki, hogy közvetlen kérdést szeretne-e írni, vagy előbb tovább bontaná ezt a részt.',
        confirmLabel: 'Tovább',
        actions: [
            {
                id: 'question',
                label: 'Kérdést szeretnék hozzáadni ide',
                description: 'A kérdés közvetlenül ebben a témakörben jelenik meg.',
                preview: {
                 type: 'question-only',
                    foLabel
                }
            },
            {
                id: 'breakdown',
                label: 'Előbb tovább szeretném bontani ezt a témakört',
                description: 'Akkor érdemes, ha a kérdéseket később kisebb részekbe szeretné rendezni.',
                preview: {
                   type: 'fo-breakdown',
    foLabel,
    alLabel: 'Alkategória',
    altLabel: 'Altéma'
                }
            }
        ]
    });

    if (elsoValasztas === 'question') {
        const direktKerdesBlokk = ensureFoDirektKerdesBlokk(foKategoriaNev, tartaly, kartya);
        await nyissKerdesLetrehozot(direktKerdesBlokk, foKategoriaNev, null, null);
        return;
    }

    if (elsoValasztas !== 'breakdown') return;

    const masodikValasztas = await AddActionChooser.open({
        title: 'Milyen bontást szeretne létrehozni?',
        lead: 'A nagyobb alcsoport később további témákra bontható. A közvetlen téma egyszerűbb kérdéscsoportként jelenik meg ebben a témakörben.',
        confirmLabel: 'Létrehozás',
        actions: [
            {
                id: 'al',
                label: 'Nagyobb alcsoportot szeretnék',
                description: 'Akkor jó, ha ezen belül később több külön téma vagy közvetlen kérdés is lehet.',
                preview: {
                     type: 'fo-al',
    alLabel: 'Új alkategória',
    altLabel: 'Új altéma'
                }
            },
            {
                id: 'altema',
                label: 'Közvetlen témát szeretnék',
                description: 'Akkor jó, ha csak egy kisebb kérdéscsoportot szeretne létrehozni.',
                preview: {
                       type: 'fo-alt',
    altLabel: 'Új altéma'
                }
            }
        ]
    });

    if (masodikValasztas === 'al') {
        await letrehozAlKategoriat(foKategoriaNev);
        return;
    }

    if (masodikValasztas === 'altema') {
        await letrehozAltTemat(foKategoriaNev, null);
    }
}

async function nyissAlHozzaadasValasztot(foKategoriaNev, alKategoriaNev, tartaly) {
    const { AddActionChooser } = await import('../admin/upload/add_action_chooser.js');

    const foLabel = String(foKategoriaNev || '').trim() || 'Témakör';
    const alLabel = String(alKategoriaNev || '').trim() || 'Alcsoport';

    const action = await AddActionChooser.open({
        title: 'Hozzáadás ehhez az alcsoporthoz',
        lead: 'Itt már csak azt kell eldönteni, hogy közvetlen kérdés jöjjön, vagy előbb témára bontja az alcsoportot.',
        confirmLabel: 'Tovább',
        actions: [
            {
                id: 'question',
                label: 'Kérdést szeretnék hozzáadni ide',
                description: 'A kérdés közvetlenül ebben az alcsoportban jelenik meg.',
             preview: {
    type: 'question-only'
}
            },
            {
                id: 'altema',
                label: 'Témára bontom ezt az alcsoportot',
                description: 'Új kisebb kérdéscsoportot hoz létre az alcsoporton belül.',
                preview: {
                    type: 'al-alt',
                    foLabel,
                    alLabel,
                    altLabel: 'Új téma'
                }
            }
        ]
    });

    if (action === 'question') {
        const direktAlKerdesTartaly = ensureAlDirektKerdesTartaly(foKategoriaNev, alKategoriaNev, tartaly);
        await nyissKerdesLetrehozot(direktAlKerdesTartaly, foKategoriaNev, alKategoriaNev, null);
        return;
    }

    if (action === 'altema') {
        await letrehozAltTemat(foKategoriaNev, alKategoriaNev);
    }
}

function beszurFoHozzaadasKartya(tartaly, foKategoriaNev) {
    aktivalOldalsavFoHozzaadas(foKategoriaNev, tartaly, null);
    return null;
}

function beszurAlHozzaadasKartya(tartaly, foKategoriaNev, alKategoriaNev) {
    aktivalOldalsavAlHozzaadas(foKategoriaNev, alKategoriaNev, tartaly);
    return null;
}

        export function loadFoKategoriak() {
            modulIdBetoltve.then(async modulId => {
        fetch(`/api/get-fo_kategoriak?modulId=${encodeURIComponent(modulId)}`)
                    .then(response => response.json())
                    .then(data => {
                        initTemaLookupsFromRows(data);

                        const tartaly = document.getElementById('fo_kategoriak');
                        if (!tartaly) {
                        console.warn('loadFoKategoriak megszakítva: hiányzik a #fo_kategoriak elem.');
                        return;
                    }

                        tartaly.innerHTML = '';
                        alapOldalsavAllapot();
                        aktivalOldalsavFokategoriaLetrehozas();

                        data.forEach(item => {
                            const kategoria = new Kategoria(item.nev, item.nev);
                            const div = kategoria.render(tartaly);
                            div.classList.add("fo");
                            const foFokuszKulcs = setFokuszKulcs(div, {
                                tipus: 'Főkategória',
                                szoveg: item.nev,
                                utvonal: [item.nev]
                            });
                            div.textContent = "";

                            const cim = document.createElement("div");
                            cim.classList.add("cim");
        cim.textContent = item.nev || '';
                    const leiras = document.createElement("div");
        leiras.classList.add("leiras");

        const itemNev = String(item.nev || '').trim();
        const itemNevNormalizalt = normalizeKategoriaKey(itemNev);

        const leirasSzoveg =
            item.leiras ??
            questState.leirasok[itemNev] ??
            questState.leirasok[itemNevNormalizalt] ??
            '';

        leiras.textContent = String(leirasSzoveg || 'Nincs elérhető leírás.');
                    if (document.getElementById('szerkeszto')) {
                        // --- SZERKESZTŐ NÉZET: szöveg konténer és gombok ---
                        const szovegKontener = document.createElement("div");
                        szovegKontener.className = "szoveg-kontener";
                        szovegKontener.appendChild(cim);
                        szovegKontener.appendChild(leiras);
                        div.appendChild(szovegKontener);

                 const gombokDiv = document.createElement("div");
gombokDiv.className = "fo-gombok";
gombokDiv.innerHTML = `
    <div class="btn-ecset"><span class="material-symbols-rounded">palette</span></div>
    <div class="btn-ceruza"><span class="material-symbols-rounded">edit</span></div>
    <div class="btn-kuka"><span class="material-symbols-rounded">delete</span></div>
`;
div.appendChild(gombokDiv);
                    } else {
                        // --- NORMÁL NÉZET: közvetlenül a div-be megy ---
                        div.appendChild(cim);
                        div.appendChild(leiras);
                    }

div.style.background = safeCssColor(questState.kategoriakSzinek[item.nev], '#ffffff');                    
                div.addEventListener('click', async (e) => {
    // --- SZÍNMÓDOSÍTÁS (Ecset) ---
    if (e.target.closest('.btn-ecset')) {
        const { ColorPicker } = await import('../admin/upload/color_picker.js');
        const kategoriaNev = item.nev;
const itemNev = String(item.nev || '').trim();
const itemNevNormalizalt = normalizeKategoriaKey(itemNev);

const kategoriaLeiras =
    item.leiras ??
    questState.leirasok[itemNev] ??
    questState.leirasok[itemNevNormalizalt] ??
    "Nincs elérhető leírás.";        const jelenlegiHatter = div.style.background;
        
        const ujSzin = await ColorPicker.open(kategoriaNev, kategoriaLeiras, jelenlegiHatter);
        if (ujSzin) {
        const safeUjSzin = safeCssColor(ujSzin, '#ffffff');
div.style.background = safeUjSzin;
questState.kategoriakSzinek[kategoriaNev] = safeUjSzin;
            const modulId = await modulIdBetoltve;
            fetch('/api/kategoriak/fo', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ regiNev: kategoriaNev, ujNev: kategoriaNev, szin: safeUjSzin, modulId })
            }).then(() => questApi.KategoriaKezelo.loadFoKategoriak());
        }
        return;
    }

    // --- SZERKESZTÉS (Ceruza) ---
    if (e.target.closest('.btn-ceruza')) {
        const { CategoryEditor } = await import('../admin/upload/category_editor.js');
        const aktCim = div.querySelector('.cim');
        const aktLeiras = div.querySelector('.leiras');
        const eredetiCim = aktCim.textContent;
        const eredetiLeiras = aktLeiras.textContent;
        const jelenlegiHatter = div.style.background; 

        const eredmeny = await CategoryEditor.open(eredetiCim, eredetiLeiras, jelenlegiHatter);
        if (eredmeny) {
            const { ujCim, ujLeiras } = eredmeny;
            if (!ujCim) {
                alert("A kategória címe nem lehet üres!");
                return;
            }
            const modulId = await modulIdBetoltve;
            fetch('/api/kategoriak/fo', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regiNev: eredetiCim, ujNev: ujCim, leiras: ujLeiras, modulId })
            }).then(res => res.json()).then(data => {
                if (data.success) questApi.KategoriaKezelo.loadFoKategoriak();
            });
        }
        return; 
    }

    // --- TÖRLÉS (Kuka) ---
    if (e.target.closest('.btn-kuka')) {
        const { DeleteConfirm } = await import('../admin/upload/delete_confirm.js');
        const megerositve = await DeleteConfirm.open(item.nev, 'fo');
        if (megerositve) {
            const modulId = await modulIdBetoltve;
            fetch('/api/kategoriak/fo', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nev: item.nev, modulId })
            }).then(() => questApi.KategoriaKezelo.loadFoKategoriak());
        }
        return; 
    }

    // Ha a gombokra kattintunk, ne válassza ki a kategóriát (lenyílás megelőzése)
    if (e.target.closest('.fo-gombok')) return;

    // Kategória lenyitása
    Focus.toggleActiveClass(div, item.nev);

    if (div.classList.contains('active')) {
        rogzitFokusz({
            tipus: 'Főkategória',
            akcio: 'megnyitva',
            szoveg: item.nev,
            utvonal: [item.nev],
            elem: div,
            elemKulcs: foFokuszKulcs,
            event: e,
            csakHaValodiEsemeny: true
        });
    }

    if (document.getElementById('szerkeszto')) {
        const alTartaly = document.getElementById('al_kategoriak');
        const mostAktiv = div.classList.contains('active');

        if (mostAktiv && alTartaly) {
            aktivalOldalsavFoHozzaadas(item.nev, alTartaly, null);
            elrejtOldalsavAlHozzaadas();
        } else {
            alapOldalsavAllapot();
        }
    }

    const foElem = document.querySelector('div#fo_kategoriak');
    if (foElem) {
        foElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
                });

                aktivalOldalsavFokategoriaLetrehozas();

            })
            .catch(err => console.error("Hiba a kérdések betöltése során:", err));
    }).catch(err => console.error("Hiba a modulId betöltése során:", err));
}

export async function loadAlKategoriak(foKategoriaNev) {
        const { modulIdBetoltve } = await import('./main_alap.js');
        const modulId = await modulIdBetoltve;
    
const response = await fetch(
    `/api/get-al_kategoriak?fo_kategoria_id=${encodeURIComponent(foKategoriaNev)}&modulId=${modulId}`
);        const data = await response.json();
            
      const tartaly = document.getElementById('al_kategoriak');
Focus.showContainer(tartaly); 
tartaly.innerHTML = '';

if (document.getElementById('szerkeszto')) {
    aktivalOldalsavFokategoriaLetrehozas();
    aktivalOldalsavFoHozzaadas(foKategoriaNev, tartaly, null);
    elrejtOldalsavAlHozzaadas();
}

const altTartaly = document.getElementById('alt_temak');
const kerdesTartaly = document.getElementById('kerdesek');

if (altTartaly) {
    altTartaly.innerHTML = '';
    altTartaly.classList.add('hidden');
}

if (kerdesTartaly) {
    kerdesTartaly.innerHTML = '';
}
if (kerdesTartaly) {
    kerdesTartaly.innerHTML = '';
    kerdesTartaly.classList.add('hidden');
}

if (!Array.isArray(data) || data.length === 0) {
    tartaly.classList.remove('hidden');

    await questApi.KategoriaKezelo.loadAltTemak(
        foKategoriaNev,
        null,
        false,
        {
            resetUi: false,
            appendMode: true,
            showContainer: false,
            targetContainer: tartaly
        }
    );

    const direktKerdesBlokk = ensureFoDirektKerdesBlokk(foKategoriaNev, tartaly);

    await questApi.KategoriaKezelo.loadKerdesek(
        foKategoriaNev,
        null,
        null,
        {
            resetUi: true,
            appendMode: true,
            showContainer: true,
            targetContainer: direktKerdesBlokk,
            wrapperClass: 'fo-kozvetlen-kerdesek-tartaly',
            prependMode: false
        }
    );

    if (!direktKerdesBlokk.querySelector('.kerdesmodul')) {
        direktKerdesBlokk.remove();
    }

    beszurFoHozzaadasKartya(tartaly, foKategoriaNev);

    return;
}

tartaly.classList.remove('hidden');
        
        data.forEach(item => {
           const alBlokk = document.createElement("div");
alBlokk.classList.add("al-blokk");
alBlokk.dataset.foKategoria = foKategoriaNev;
alBlokk.dataset.alKategoria = item.nev;
tartaly.appendChild(alBlokk);

const kategoria = new Kategoria(item.nev, item.nev);
const div = kategoria.render(alBlokk);
div.classList.add("al");
const alFokuszKulcs = setFokuszKulcs(div, {
    tipus: 'Alkategória',
    szoveg: item.nev,
    utvonal: [foKategoriaNev, item.nev]
});
div.textContent = "";

const foSzin = getFoSzin(foKategoriaNev, '#ffffff');

const stilusBelsoKontener = (elem) => {
    elem.style.borderColor = foSzin;
    elem.style.borderStyle = 'solid';
    elem.style.borderWidth = '3px';

};

const direktAlKerdesTartaly = document.createElement("div");
direktAlKerdesTartaly.classList.add("al-direkt-kerdesek", "hidden");
direktAlKerdesTartaly.dataset.foKategoria = foKategoriaNev;
direktAlKerdesTartaly.dataset.alKategoria = item.nev;
stilusBelsoKontener(direktAlKerdesTartaly);
alBlokk.appendChild(direktAlKerdesTartaly);

const belsoAltTemaTartaly = document.createElement("div");
belsoAltTemaTartaly.classList.add("al-belso-alt-temak", "hidden");
belsoAltTemaTartaly.dataset.foKategoria = foKategoriaNev;
belsoAltTemaTartaly.dataset.alKategoria = item.nev;
stilusBelsoKontener(belsoAltTemaTartaly);
alBlokk.appendChild(belsoAltTemaTartaly);
    
            const cim = document.createElement("div");
            cim.classList.add("cim");
cim.textContent = item.nev || '';    
            if (document.getElementById('szerkeszto')) {
                const szovegKontener = document.createElement("div");
                szovegKontener.className = "szoveg-kontener";
                szovegKontener.appendChild(cim);
                div.appendChild(szovegKontener);
    
                const gombokDiv = document.createElement("div");
                gombokDiv.className = "al-gombok"; 
                gombokDiv.innerHTML = `
                    <div class="btn-ceruza"><span class="material-symbols-rounded">edit</span></div>
                    <div class="btn-kuka"><span class="material-symbols-rounded">delete</span></div>
                `;
                div.appendChild(gombokDiv);
            } else {
                div.appendChild(cim);
            }

            applyDemoLockedAlkategoria(div, item);
    
            // KATTINTÁSFIGYELŐ (Kibővítve a szerkesztéssel és törléssel)
div.addEventListener('click', async (e) => { 
    // --- SZERKESZTÉS (Ceruza) ---
    if (e.target.closest('.btn-ceruza')) {
        const { BasicEditor } = await import('../admin/upload/basic_editor.js');
        const aktCim = div.querySelector('.cim');
const eredetiCim = aktCim.textContent || '';        
        const ujCim = await BasicEditor.open("Alkategória szerkesztése", eredetiCim);
        if (ujCim && ujCim !== eredetiCim) {
            const modulId = await modulIdBetoltve;
            fetch('/api/kategoriak/al_altema', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tipus: 'al', 
                    regiNev: eredetiCim, 
                    ujNev: ujCim, 
                    foKategoria: foKategoriaNev, 
                    modulId 
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    questApi.KategoriaKezelo.loadAlKategoriak(foKategoriaNev); // Újratöltjük a listát
                } else {
                    alert("Hiba: " + data.message);
                }
            });
        }
        return; 
    }

    // --- TÖRLÉS (Kuka) ---
    if (e.target.closest('.btn-kuka')) {
        const { DeleteConfirm } = await import('../admin/upload/delete_confirm.js');
        const megerositve = await DeleteConfirm.open(item.nev, 'al'); // 'al' paraméter a pontos szövegezésért
        if (megerositve) {
            const modulId = await modulIdBetoltve;
            fetch('/api/kategoriak/al_altema', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tipus: 'al', 
                    nev: item.nev, 
                    foKategoria: foKategoriaNev, 
                    modulId 
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    questApi.KategoriaKezelo.loadAlKategoriak(foKategoriaNev); // Újratöltjük a listát
                } else {
                    alert("Hiba: " + data.message);
                }
            });
        }
        return; 
    }

    // Ha csak szimplán a gombsávba kattint, ne csináljon semmit a kártya
    if (e && e.target.closest('.al-gombok')) return;

    if (isDemoLockedAlkategoria(item)) {
        e.preventDefault();
        e.stopPropagation();
        showAlert('Ez az alkategória csak a teljes csomagban érhető el.');
        return;
    }

    // --- Eredeti logika: Alkategória kiválasztása és animációk ---
// --- Alkategória kiválasztása / visszazárása ---
const marAktivAlkategoria = div.classList.contains('active');

if (!marAktivAlkategoria) {
    const alBlokk = div.closest('.al-blokk');
    const direktAlKerdesTartaly = alBlokk?.querySelector('.al-direkt-kerdesek');
    const belsoAltTemaTartaly = alBlokk?.querySelector('.al-belso-alt-temak');

    Focus.setFoSzintLathatosag(
        foKategoriaNev,
        false,
        {
            selectedAlBlokk: alBlokk
        }
    );

    if (direktAlKerdesTartaly) {
        direktAlKerdesTartaly.innerHTML = '';
        direktAlKerdesTartaly.classList.remove('hidden');

        await questApi.KategoriaKezelo.loadKerdesek(
            foKategoriaNev,
            item.nev,
            null,
            {
                resetUi: false,
                appendMode: true,
                showContainer: true,
                targetContainer: direktAlKerdesTartaly,
                wrapperClass: 'al-kozvetlen-kerdesek-tartaly',
                prependMode: false
            }
        );

        if (!direktAlKerdesTartaly.querySelector('.kerdesmodul')) {
            direktAlKerdesTartaly.innerHTML = '';
            direktAlKerdesTartaly.classList.add('hidden');
        }
    }

    if (belsoAltTemaTartaly) {
        await questApi.KategoriaKezelo.loadAltTemak(
    foKategoriaNev,
    item.nev,
    false,
    {
        resetUi: true,
        appendMode: false,
        showContainer: true,
        targetContainer: belsoAltTemaTartaly
    }
);
    }
}

Focus.toggleActiveClassal(div, item.nev);

if (div.classList.contains('active')) {
    rogzitFokusz({
        tipus: 'Alkategória',
        akcio: 'megnyitva',
        szoveg: item.nev,
        utvonal: [foKategoriaNev, item.nev],
        elem: div,
        elemKulcs: alFokuszKulcs,
        event: e,
        csakHaValodiEsemeny: true
    });
}

if (document.getElementById('szerkeszto')) {
    const mostAktivAl = div.classList.contains('active');

    if (mostAktivAl) {
        aktivalOldalsavAlHozzaadas(foKategoriaNev, item.nev, belsoAltTemaTartaly || direktAlKerdesTartaly || tartaly);
    } else {
        aktivalOldalsavFoHozzaadas(foKategoriaNev, tartaly, null);
    }
}

div.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
});

    // --- Eredeti diagram frissítő logika ---
    setTimeout(() => {
        const alkategoriaNev = item.nev;
        const foDiv = [...document.querySelectorAll('#keszulo .fo-kategoria')]
            .find(d => d.querySelector('h3')?.textContent.trim().startsWith(foKategoriaNev));

        if (!foDiv) {
            document.getElementById('altTemaChartContainer').style.display = 'none';
            return;
        }

        const alkatTr = [...foDiv.querySelectorAll('tr.al-kategoria')]
            .find(tr => tr.querySelector('td.al-kategoria')?.childNodes[0]?.textContent.trim() === alkategoriaNev);

        if (!alkatTr) {
            document.getElementById('altTemaChartContainer').style.display = 'none';
            return;
        }

        const labels = [];
        const data   = [];
        let nextRow  = alkatTr.nextElementSibling;

while (
    nextRow &&
    nextRow.classList.contains('alt-tema') &&
    !nextRow.classList.contains('fo-kozvetlen-altema')
) {            const td       = nextRow.querySelector('td.alt-tema');
            const altNev   = td?.childNodes[0]?.textContent.trim().replace(/:$/, '') || 'Ismeretlen';
            const szazalek = parseFloat(td?.querySelector('.pontC')?.textContent.match(/\((\d+)%\)/)?.[1]);
            
            if (altNev && !isNaN(szazalek)) {
                labels.push(altNev);
                data.push(szazalek);
            }
            nextRow = nextRow.nextElementSibling;
        }

        if (labels.length) {
            import('./szamitasok.js').then(({ letrehozAltTemaChart }) =>
                letrehozAltTemaChart(labels, data, foKategoriaNev)
            );
        } else {
            document.getElementById('altTemaChartContainer').style.display = 'none';
        }
    }, 100);
});
    
            div.style.background = questState.kategoriakSzinek[foKategoriaNev] || "#ffffff";
        });
await questApi.KategoriaKezelo.loadAltTemak(
    foKategoriaNev,
    null,
    false,
    {
        resetUi: false,
        appendMode: true,
        showContainer: false,
        targetContainer: tartaly
    }
);

// Főkategória alatti direkt kérdések betöltése
const regiDirektKerdesBlokk = tartaly.querySelector(
    `[data-fo-kozvetlen-kerdesek="${CSS.escape(foKategoriaNev)}"]`
);

if (regiDirektKerdesBlokk) {
    regiDirektKerdesBlokk.remove();
}

const direktKerdesBlokk = document.createElement('div');
direktKerdesBlokk.classList.add('fo-kozvetlen-kerdesek-blokk');
direktKerdesBlokk.dataset.foKozvetlenKerdesek = foKategoriaNev;

const foSzin = getFoSzin(foKategoriaNev, '#003366');

direktKerdesBlokk.style.borderColor = foSzin;
direktKerdesBlokk.style.borderStyle = 'solid';
direktKerdesBlokk.style.borderWidth = '3px';

tartaly.prepend(direktKerdesBlokk);

await questApi.KategoriaKezelo.loadKerdesek(
    foKategoriaNev,
    null,
    null,
    {
        resetUi: true,
        appendMode: true,
        showContainer: true,
        targetContainer: direktKerdesBlokk,
        wrapperClass: 'fo-kozvetlen-kerdesek-tartaly',
        prependMode: false
    }
);

if (!direktKerdesBlokk.querySelector('.kerdesmodul')) {
    direktKerdesBlokk.remove();
}
        // --- RUGALMAS HOZZÁADÁS A FŐTÉMAKÖRHÖZ ---
        beszurFoHozzaadasKartya(tartaly, foKategoriaNev);
    }

export async function loadAltTemak(
    foKategoriaNev,
    alKategoriaNev,
    autoLoadKerdesekHaNincsAlt = true,
    options = {}
) {
  const {
    resetUi = true,
    appendMode = false,
    showContainer = true,
    targetContainer = null
} = options;
    const modulId = await modulIdBetoltve;

    const params = new URLSearchParams();

    params.set('fo_kategoria_id', foKategoriaNev);
    params.set('modulId', modulId);

    if (alKategoriaNev) {
        params.set('al_kategoria_id', alKategoriaNev);
    }

    const response = await fetch(`/api/get-alt_temak?${params.toString()}`);
    const data = await response.json();

    if (handleDemoRestrictedResponse(response, data)) {
        return;
    }

const tartaly = targetContainer || document.getElementById('alt_temak');
const kerdesTartaly = document.getElementById('kerdesek');
    if (showContainer) {
        Focus.showContainer(tartaly);
    }

    if (resetUi && !appendMode) {
        tartaly.innerHTML = '';

        if (kerdesTartaly) {
            kerdesTartaly.innerHTML = '';
        }
    }

if (!Array.isArray(data) || data.length === 0) {
    // Append módban SOHA nem törlünk közös tartályt.
    // Ilyenkor lehet, hogy az #al_kategoriak már tele van alkategóriákkal.
    if (appendMode) {
        return;
    }

    // Normál, kattintásos altéma-tartálynál törölhetünk.
    if (resetUi) {
        tartaly.innerHTML = '';
        tartaly.classList.add('hidden');
    }

  if (
    autoLoadKerdesekHaNincsAlt &&
    alKategoriaNev &&
    !targetContainer &&
    !appendMode
) {
    await questApi.KategoriaKezelo.loadKerdesek(
        foKategoriaNev,
        alKategoriaNev,
        null,
        {
            resetUi: true,
            appendMode: false,
            showContainer: true
        }
    );
}

    if (document.getElementById('szerkeszto') && !appendMode && alKategoriaNev) {
        tartaly.classList.remove('hidden');
        beszurAlHozzaadasKartya(tartaly, foKategoriaNev, alKategoriaNev);
    }

    return;
}

    tartaly.classList.remove('hidden');

if (appendMode) {
    const letezoFejlec = tartaly.querySelector(
        `[data-direkt-altema-fejlec="${CSS.escape(foKategoriaNev)}"]`
    );

    if (!alKategoriaNev && !letezoFejlec) {
        const fejlec = document.createElement('div');
        fejlec.classList.add('direkt-ag-fejlec', 'fo-kozvetlen-altemak-fejlec');
        fejlec.dataset.direktAltemaFejlec = foKategoriaNev;
        fejlec.textContent = 'Közvetlen témák';
        tartaly.appendChild(fejlec);
    }
}

    data.forEach(item => {
   const altemaUtvonalKulcs = [
    foKategoriaNev || '',
    alKategoriaNev || '',
    item.nev || ''
].join('|');

const marLetezik = tartaly.querySelector(
    `[data-altema-utvonal="${CSS.escape(altemaUtvonalKulcs)}"]`
);

if (appendMode && marLetezik) {
    return;
}

const kategoria = new Kategoria(item.nev, item.nev);
const div = kategoria.render(tartaly);
div.classList.add("alal");
div.dataset.altemaUtvonal = altemaUtvonalKulcs;
const altemaFokuszKulcs = setFokuszKulcs(div, {
    tipus: 'Altéma',
    szoveg: item.nev,
    utvonal: [foKategoriaNev, alKategoriaNev, item.nev]
});
const foSzin = getFoSzin(foKategoriaNev, '#ffffff');
div.style.borderColor = foSzin;
div.style.borderStyle = "solid";
div.style.borderWidth = "2px";

        if (!alKategoriaNev) {
            div.classList.add("fo-kozvetlen-altema-kartya");
        }

        div.textContent = "";

        const cim = document.createElement("div");
        cim.classList.add("cim");
cim.textContent = item.nev || '';
        if (document.getElementById('szerkeszto')) {
            const szovegKontener = document.createElement("div");
            szovegKontener.className = "szoveg-kontener";
            szovegKontener.appendChild(cim);
            div.appendChild(szovegKontener);

            const gombokDiv = document.createElement("div");
            gombokDiv.className = "alal-gombok";
            gombokDiv.innerHTML = `
                <div class="btn-ceruza"><span class="material-symbols-rounded">edit</span></div>
                <div class="btn-kuka"><span class="material-symbols-rounded">delete</span></div>
            `;
            div.appendChild(gombokDiv);
        } else {
            div.appendChild(cim);
        }

        div.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-ceruza')) {
                const { BasicEditor } = await import('../admin/upload/basic_editor.js');
                const eredetiCim = cim.textContent;

                const ujCim = await BasicEditor.open("Altéma szerkesztése", eredetiCim);

                if (ujCim && ujCim !== eredetiCim) {
                    const modulId = await modulIdBetoltve;

                    fetch('/api/kategoriak/al_altema', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tipus: 'altema',
                            regiNev: eredetiCim,
                            ujNev: ujCim,
                            alKategoria: alKategoriaNev,
                            foKategoria: foKategoriaNev,
                            modulId
                        })
                    })
                    .then(res => res.json())
              .then(async data => {
    if (!data.success) return;

    const kerdesekDiv = document.getElementById('kerdesek');
    if (kerdesekDiv) {
        kerdesekDiv.innerHTML = '';
        kerdesekDiv.classList.add('hidden');
    }

    // Alkategória alatti altéma törlése:
    // ugyanazt a belső tartályt töltjük újra, nem a globális #alt_temak-ot.
    if (alKategoriaNev) {
        tartaly.innerHTML = '';

        await questApi.KategoriaKezelo.loadAltTemak(
            foKategoriaNev,
            alKategoriaNev,
            false,
            {
                resetUi: true,
                appendMode: false,
                showContainer: true,
                targetContainer: tartaly
            }
        );

        return;
    }

    // Főkategória alatti közvetlen altéma törlése:
    // ezt a loadAlKategoriak építi újra, mert ott vannak a közvetlen altémák is.
    await questApi.KategoriaKezelo.loadAlKategoriak(foKategoriaNev);
});
                }

                return;
            }

            if (e.target.closest('.btn-kuka')) {
    const { DeleteConfirm } = await import('../admin/upload/delete_confirm.js');
    const megerositve = await DeleteConfirm.open(item.nev, 'alal');

    if (!megerositve) {
        return;
    }

    const modulId = await modulIdBetoltve;

    fetch('/api/kategoriak/al_altema', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tipus: 'altema',
            nev: item.nev,
            alKategoria: normalizalUtvonalErtek(alKategoriaNev),
            foKategoria: foKategoriaNev,
            modulId
        })
    })
    .then(res => res.json())
    .then(async data => {
        if (!data.success) {
            alert("Hiba: " + (data.message || "Az altéma törlése sikertelen."));
            return;
        }

        const kerdesekDiv = document.getElementById('kerdesek');

        if (kerdesekDiv) {
            kerdesekDiv.innerHTML = '';
            kerdesekDiv.classList.add('hidden');
        }

        const toroltUtvonalKulcs = [
            foKategoriaNev || '',
            alKategoriaNev || '',
            item.nev || ''
        ].join('|');

        // A törölt altéma összes DOM-példányát kivesszük.
        document
            .querySelectorAll(`[data-altema-utvonal="${CSS.escape(toroltUtvonalKulcs)}"]`)
            .forEach(elem => elem.remove());

        // Alkategória alatti altéma:
        // ugyanazt a belső konténert töltjük újra.
        if (alKategoriaNev) {
            tartaly.innerHTML = '';

            await questApi.KategoriaKezelo.loadAltTemak(
                foKategoriaNev,
                alKategoriaNev,
                false,
                {
                    resetUi: true,
                    appendMode: false,
                    showContainer: true,
                    targetContainer: tartaly
                }
            );

            return;
        }

        // Főkategória alatti közvetlen altéma:
        // ezt a főkategória teljes belső szintje építi újra.
        await questApi.KategoriaKezelo.loadAlKategoriak(foKategoriaNev);
    })
    .catch(err => {
        console.error('Altéma törlési hiba:', err);
    });

    return;
}

            if (e && e.target.closest('.alal-gombok')) return;

     const marAktivAltTema = div.classList.contains('active');

if (!marAktivAltTema) {
    await questApi.KategoriaKezelo.loadKerdesek(
        foKategoriaNev,
        alKategoriaNev || null,
        item.nev,
        {
            resetUi: true,
            appendMode: false,
            showContainer: true
        }
    );
}

Focus.toggleActiveClassalal(div, item.nev);

if (div.classList.contains('active')) {
    rogzitFokusz({
        tipus: 'Altéma',
        akcio: 'megnyitva',
        szoveg: item.nev,
        utvonal: [foKategoriaNev, alKategoriaNev || null, item.nev],
        elem: div,
        elemKulcs: altemaFokuszKulcs,
        event: e,
        csakHaValodiEsemeny: true
    });
}

if (document.getElementById('szerkeszto')) {
    const mostAktivAltTema = div.classList.contains('active');

    if (mostAktivAltTema) {
        aktivalOldalsavAltTemaKerdesHozzaadas(
            foKategoriaNev,
            alKategoriaNev || null,
            item.nev
        );
    } else if (alKategoriaNev) {
        aktivalOldalsavAlHozzaadas(
            foKategoriaNev,
            alKategoriaNev,
            tartaly
        );
    } else {
        const alTartaly = document.getElementById('al_kategoriak');
        aktivalOldalsavFoHozzaadas(
            foKategoriaNev,
            alTartaly,
            null
        );
    }
}

        });
    });

    // --- RUGALMAS HOZZÁADÁS AZ ALCSOPORTHOZ ---
    if (document.getElementById('szerkeszto') && !appendMode && alKategoriaNev) {
        beszurAlHozzaadasKartya(tartaly, foKategoriaNev, alKategoriaNev);
    }
}

export async function loadKerdesek(foKategoriaNev, alKategoriaNev, altTemaNev, options = {}) {
const {
    resetUi = true,
    appendMode = false,
    showContainer = true,
    targetContainer = null,
    wrapperClass = '',
    prependMode = false
} = options;
    const normalizalUtvonalErtek = (value) => {
        if (value === null || typeof value === 'undefined') return null;

        const clean = String(value).trim();
        return clean === '' ? null : clean;
    };

    const azonosUtvonalErtek = (a, b) => {
        return normalizalUtvonalErtek(a) === normalizalUtvonalErtek(b);
    };

    const celFoKategoria = normalizalUtvonalErtek(foKategoriaNev);
    const celAlKategoria = normalizalUtvonalErtek(alKategoriaNev);
    const celAltTema = normalizalUtvonalErtek(altTemaNev);

    const modulId = await modulIdBetoltve;

    const params = new URLSearchParams();

    params.set('fo_kategoria_id', celFoKategoria || '');
    params.set('modulId', modulId);

    if (celAlKategoria) {
        params.set('al_kategoria_id', celAlKategoria);
    }

    if (celAltTema) {
        params.set('alt_tema_id', celAltTema);
    }

    const response = await fetch(`/api/get-kerdesek?${params.toString()}`);
    const rawData = await response.json();

    if (handleDemoRestrictedResponse(response, rawData)) {
        return;
    }

    const data = (Array.isArray(rawData) ? rawData : [])
        .filter(item => {
            const itemFoKategoria = normalizalUtvonalErtek(item.fo_kategoria || celFoKategoria);
            const itemAlKategoria = normalizalUtvonalErtek(item.al_kategoria);
            const itemAltTema = normalizalUtvonalErtek(item.alt_tema);

            return (
                azonosUtvonalErtek(itemFoKategoria, celFoKategoria) &&
                azonosUtvonalErtek(itemAlKategoria, celAlKategoria) &&
                azonosUtvonalErtek(itemAltTema, celAltTema)
            );
        })
        .sort((a, b) => a.kindex - b.kindex);

const tartaly = targetContainer || document.getElementById('kerdesek');

if (!tartaly) return;

if (wrapperClass) {
    tartaly.classList.add(wrapperClass);
}
    if (!tartaly) return;

    if (showContainer) {
        Focus.showContainer(tartaly);
    }

    if (resetUi && !appendMode) {
        tartaly.innerHTML = '';
    }

    // Kritikus: ne csak útvonal szerint töröljünk, hanem az aktuálisan újratöltött ID-kat is vegyük ki.
    // Így ugyanaz a kérdés nem maradhat bent egyszer régi, egyszer rosszul átírt útvonallal.
    const betoltottIdk = new Set(
        data
            .map(item => Number(item.id))
            .filter(id => Number.isFinite(id))
    );

    questState.kerdesek = questState.kerdesek.filter(k => {
        const sameFo = azonosUtvonalErtek(k.foKategoria, celFoKategoria);
        const sameAl = azonosUtvonalErtek(k.alKategoria, celAlKategoria);
        const sameAlt = azonosUtvonalErtek(k.altTema, celAltTema);
        const sameLoadedId = betoltottIdk.has(Number(k.id));

        return !(sameLoadedId || (sameFo && sameAl && sameAlt));
    });

    if (appendMode && data.length > 0) {
        const fejlecKulcs = [
            celFoKategoria || '',
            celAlKategoria || '',
            celAltTema || ''
        ].join('|');

        const letezoFejlec = tartaly.querySelector(
            `[data-kerdes-fejlec="${CSS.escape(fejlecKulcs)}"]`
        );

        if (!letezoFejlec) {
            const fejlec = document.createElement('div');
            fejlec.className = 'direkt-ag-fejlec';
            fejlec.dataset.kerdesFejlec = fejlecKulcs;

            if (!celAlKategoria && !celAltTema) {
                fejlec.textContent = 'Közvetlen kérdések';
            } else if (!celAlKategoria && celAltTema) {
                fejlec.textContent = `${celAltTema} kérdései`;
            } else if (celAlKategoria && !celAltTema) {
                fejlec.textContent = `${celAlKategoria} közvetlen kérdései`;
            } else {
                fejlec.textContent = `${celAltTema} kérdései`;
            }

            tartaly.appendChild(fejlec);
        }
    }

    for (const item of data) {
        const itemId = Number(item.id);
        const marLetezikDom = tartaly.querySelector(`[data-id="${CSS.escape(String(item.id))}"]`);

        if (appendMode && marLetezikDom) {
            continue;
        }

        const kerdes = new Kerdes(
            item.kindex,
            item.id,
            item.szoveg,
            item.parent_id,
            item.valasz_ag,
            item.negalt_kerdes_szoveg,

            // Fontos: itt már NEM használunk olyan fallbacket,
            // ami üres alt_tema esetén ráírná az aktuális altéma nevét.
            normalizalUtvonalErtek(item.fo_kategoria) || celFoKategoria,
            normalizalUtvonalErtek(item.al_kategoria),
            normalizalUtvonalErtek(item.alt_tema),

            item.szoveges,
            item.ertek,
            item.negalt_ertek,
            item.ossz_ertek,
            item.maximalis_szint,
            item.opcios,
            item.kategoria_kapcsolo_id
        );

        await kerdes.render(tartaly);

        questState.kerdesek = questState.kerdesek.filter(k => Number(k.id) !== itemId);
        questApi.KategoriaKezelo.kerdesek.push(kerdes);
    }

    if (document.getElementById('szerkeszto') && !appendMode) {
        const ujKerdesDiv = document.createElement("div");
        ujKerdesDiv.classList.add("kerdesmodul", "new");
        ujKerdesDiv.setAttribute("data-id", "");

        ujKerdesDiv.innerHTML = `
            <div class="questionadd2">
                <span>Kérdés hozzáadása ide</span>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
            </div>
        `;

        ujKerdesDiv.addEventListener('click', async () => {
            const { InlineQuestionCreator } = await import('../admin/upload/category_creator.js');

            const nyitottFokerdesSzerkeszto = tartaly.querySelector('.uj-ideiglenes-kerdes');

            if (nyitottFokerdesSzerkeszto) {
                nyitottFokerdesSzerkeszto.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                showSuccessToast("Már van egy megkezdett főkérdés-szerkesztés.");
                return;
            }

            const jelenlegiKerdesek = questApi.KategoriaKezelo.kerdesek.filter(k =>
                azonosUtvonalErtek(k.foKategoria, celFoKategoria) &&
                azonosUtvonalErtek(k.alKategoria, celAlKategoria) &&
                azonosUtvonalErtek(k.altTema, celAltTema) &&
                !k.parentId
            );

            const lementettMaxIndex = jelenlegiKerdesek.length > 0
                ? Math.max(...jelenlegiKerdesek.map(k => k.kindex))
                : 0;

            const ideiglenesDb = tartaly.querySelectorAll('.uj-ideiglenes-kerdes').length;
            const kovetkezoIndex = lementettMaxIndex + ideiglenesDb + 1;

            const mentettAdatok = await InlineQuestionCreator.open(
                tartaly,
                kovetkezoIndex,
                celFoKategoria,
                celAlKategoria,
                celAltTema
            );

            if (mentettAdatok) {
                const modulId = await modulIdBetoltve;

                fetch('/kerdesek', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        foKategoria: celFoKategoria,
                        alKategoria: celAlKategoria,
                        altTema: celAltTema,
                        kerdesSzoveg: mentettAdatok.szoveg,
                        negaltKerdesSzoveg: mentettAdatok.negaltSzoveg,
                        ertek: mentettAdatok.ertek,
                        negalt_ertek: mentettAdatok.negaltErtek,
                        szoveges: mentettAdatok.szoveges,
                        maximalis_szint: mentettAdatok.maxi,
                        opcios: mentettAdatok.opcios ? 1 : 0,
                        kindex: kovetkezoIndex,
                        alkerdesek: mentettAdatok.alkerdesek,
                        modulId: modulId
                    })
                })
                .then(res => res.json())
                .then(async () => {
                    showSuccessToast("Kérdés és alkérdések sikeresen hozzáadva!");
                    await frissitKerdesUtvonal(celFoKategoria, celAlKategoria, celAltTema, tartaly);
                })
                .catch(err => console.error('Kérdés mentési hiba:', err));
            }
        });

        tartaly.prepend(ujKerdesDiv);
    }

    questApi.KategoriaKezelo.frissitErtekelesekContainer();
}
