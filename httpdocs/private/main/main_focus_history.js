// Utolsó megnyitások és módosítások előzménynaplója.
// Gyors helyi cache: sessionStorage. Tartós mentés: /api/fokusz-elmeny.

const MAX_ELOZMENY = 30;
const TOOLTIP_AUTOHIDE_MS = 3200;
const STORAGE_KEY = (() => {
    const params = new URLSearchParams(window.location.search);
    const kitoltesId = params.get('kitoltes_id') || params.get('id') || 'uj';
    return `ertekek_fokusz_elozmenyek:${window.location.pathname}:${kitoltesId}`;
})();

let panelElem = null;
let listaElem = null;
let tooltipElem = null;
let tooltipTimer = null;
let observer = null;
let markerFrissitesTimer = null;
let initKesz = false;
let cssBetoltve = false;
let nyitoFokuszUgrasInditva = false;

function ensureFocusHistoryCss() {
    if (cssBetoltve || typeof document === 'undefined') return;

    const href = new URL('./main_focus_history.css', import.meta.url).href;
    const letezik = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(link => link.href === href || link.getAttribute('href') === './main_focus_history.css');

    if (!letezik) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.focusHistoryCss = '1';
        document.head.appendChild(link);
    }

    cssBetoltve = true;
}

function tisztitSzoveg(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function rovidit(value, max = 82) {
    const clean = tisztitSzoveg(value);
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function normalizalKulcsResz(value) {
    return tisztitSzoveg(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'ures';
}

function normalizalTipus(value) {
    const clean = tisztitSzoveg(value).toLowerCase();

    if (clean.includes('főkateg') || clean.includes('fokateg')) return 'fo-kategoria';
    if (clean.includes('alkateg')) return 'al-kategoria';
    if (clean.includes('altéma') || clean.includes('altema')) return 'altema';
    if (clean.includes('alkérdés') || clean.includes('alkerdes')) return 'alkerdes';
    if (clean.includes('kérdés') || clean.includes('kerdes')) return 'kerdes';

    return normalizalKulcsResz(clean || 'elem');
}

function magyarIdo(iso = null) {
    const date = iso ? new Date(iso) : new Date();

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleString('hu-HU', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getElozmenyek() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Előzmények beolvasási hiba:', error);
        return [];
    }
}

function setElozmenyek(lista) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, MAX_ELOZMENY)));
    } catch (error) {
        console.warn('Előzmények mentési hiba:', error);
    }
}

function getAktualisKitoltesId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('kitoltes_id') || params.get('id') || null;
}


function getNyitoFokuszKulcs() {
    const params = new URLSearchParams(window.location.search);
    return tisztitSzoveg(
        params.get('fokusz') ||
        params.get('elemKulcs') ||
        params.get('focus') ||
        ''
    );
}

function varj(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function varjElozmenyEntryre(elemKulcs, timeout = 6500) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
        const entry = getElozmenyek().find(item => item.elemKulcs === elemKulcs);

        if (entry) {
            return entry;
        }

        await varj(150);
    }

    return null;
}

async function inditNyitoFokuszUgrast() {
    const elemKulcs = getNyitoFokuszKulcs();

    if (!elemKulcs || nyitoFokuszUgrasInditva) return;

    nyitoFokuszUgrasInditva = true;

    try {
        const entry = await varjElozmenyEntryre(elemKulcs);

        await ugrasFokuszElemhez(
            entry || {
                elemKulcs,
                tipus: elemKulcs.startsWith('kerdes:') ? 'Kérdés' : 'Elem',
                tipusKulcs: elemKulcs.split(':')[0],
                akcio: 'megnyitva',
                utvonal: []
            }
        );
    } catch (error) {
        console.warn('Nyitó fókusz ugrási hiba:', error);
    }
}

function normalizalSzerverEntry(row) {
    if (!row || typeof row !== 'object') return null;

    const elemKulcs = tisztitSzoveg(row.elemKulcs || row.elem_kulcs);
    if (!elemKulcs) return null;

    const tipus = tisztitSzoveg(row.tipus) || 'Elem';

    return {
        id: String(row.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        elemKulcs,
        tipus,
        tipusKulcs: tisztitSzoveg(row.tipusKulcs || row.tipus_kulcs) || normalizalTipus(tipus),
        akcio: tisztitSzoveg(row.akcio) || 'megnyitva',
        szoveg: tisztitSzoveg(row.szoveg),
        utvonal: Array.isArray(row.utvonal) ? row.utvonal.map(tisztitSzoveg).filter(Boolean) : [],
        valasz: tisztitSzoveg(row.valasz),
        iso: row.iso || row.letrehozva || new Date().toISOString()
    };
}

function osszefesulElozmenyek(szerverLista, helyiLista) {
    const map = new Map();

    [...szerverLista, ...helyiLista].forEach(entry => {
        if (!entry || !entry.elemKulcs) return;

        const kulcs = [
            entry.elemKulcs,
            entry.tipusKulcs || normalizalTipus(entry.tipus),
            entry.akcio,
            entry.valasz,
            entry.iso
        ].join('|');

        if (!map.has(kulcs)) {
            map.set(kulcs, entry);
        }
    });

    return [...map.values()]
        .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
        .slice(0, MAX_ELOZMENY);
}

let utolsoSzerverMentes = 0;
let utolsoMentettLenyomat = '';

function szabadSzerverreMenteni(entry) {
    const most = Date.now();
    const lenyomat = [
        entry?.elemKulcs || '',
        entry?.akcio || '',
        entry?.valasz || ''
    ].join('|');

    if (lenyomat === utolsoMentettLenyomat && most - utolsoSzerverMentes < 4000) {
        return false;
    }

    utolsoMentettLenyomat = lenyomat;
    utolsoSzerverMentes = most;
    return true;
}

async function mentFokuszSzerverre(entry) {
    const path = window.location.pathname;

if (!path.includes('/ertekelo.html')) {
    return;
}

const kitoltesId = getAktualisKitoltesId();

if (!kitoltesId) {
    return;
}
    if (!entry?.elemKulcs) return;
    if (!szabadSzerverreMenteni(entry)) return;

    try {
        const response = await fetch('/api/fokusz-elmeny', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kitoltes_id: getAktualisKitoltesId(),
                elemKulcs: entry.elemKulcs,
                tipus: entry.tipus,
                tipusKulcs: entry.tipusKulcs,
                akcio: entry.akcio,
                szoveg: entry.szoveg,
                utvonal: entry.utvonal,
                valasz: entry.valasz
            })
        });

        if (!response.ok) {
            console.warn('Fókusz szerver mentési HTTP-hiba:', response.status);
        }
    } catch (error) {
        console.warn('Fókusz szerver mentési hiba:', error);
    }
}

async function betoltFokuszokSzerverrol() {
    try {
        const kitoltesId = getAktualisKitoltesId();
        const params = new URLSearchParams();
        params.set('limit', String(MAX_ELOZMENY));

        if (kitoltesId) {
            params.set('kitoltes_id', kitoltesId);
        }

        const response = await fetch(`/api/fokusz-elmenyek?${params.toString()}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.warn('Fókusz előzmények szerveres betöltési HTTP-hiba:', response.status);
            return;
        }

        const data = await response.json();
        if (!data?.success || !Array.isArray(data.data)) return;

        const szerverLista = data.data
            .map(normalizalSzerverEntry)
            .filter(Boolean);

        const helyiLista = getElozmenyek();
        const osszefesultLista = osszefesulElozmenyek(szerverLista, helyiLista);

        setElozmenyek(osszefesultLista);
        frissitFokuszJelolok();
        frissitPanelLista();
    } catch (error) {
        console.warn('Fókusz előzmények szerveres betöltési hiba:', error);
    }
}

function elemKulcsFromAdat({ tipus, id, utvonal = [], szoveg = '' }) {
    if (id !== null && typeof id !== 'undefined' && String(id).trim() !== '') {
        return `${normalizalKulcsResz(tipus)}:${String(id).trim()}`;
    }

    const utvonalKulcs = (Array.isArray(utvonal) ? utvonal : [utvonal])
        .map(normalizalKulcsResz)
        .join('|');

    return `${normalizalKulcsResz(tipus)}:${utvonalKulcs || normalizalKulcsResz(szoveg)}`;
}

function selectorFromKulcs(elemKulcs) {
    if (!elemKulcs || typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
        return '';
    }

    return `[data-fokusz-kulcs="${CSS.escape(elemKulcs)}"]`;
}

function kerdesValaszFelirat(valasz) {
    const clean = tisztitSzoveg(valasz);
    if (!clean) return '';

    if (clean.toLowerCase() === 'ures') return 'válasz törölve';
    return clean.toUpperCase();
}

function tooltipSzoveg(entry) {
    const utvonal = Array.isArray(entry.utvonal) && entry.utvonal.length
        ? `\n${entry.utvonal.join(' > ')}`
        : '';

    const valasz = entry.valasz ? `\nUtolsó válasz: ${kerdesValaszFelirat(entry.valasz)}` : '';

    return `${entry.akcio || 'Utoljára'}: ${magyarIdo(entry.iso)}${utvonal}\n${entry.szoveg || ''}${valasz}`;
}

function ensureTooltip() {
    if (tooltipElem) return tooltipElem;

    tooltipElem = document.createElement('div');
    tooltipElem.id = 'fokusz-elozmeny-tooltip';
    tooltipElem.className = 'fokusz-elozmeny-tooltip hidden';
    document.body.appendChild(tooltipElem);
    return tooltipElem;
}

function showTooltip(marker, entry) {
    const tooltip = ensureTooltip();
    tooltip.textContent = tooltipSzoveg(entry);
    tooltip.classList.remove('hidden');

    const rect = marker.getBoundingClientRect();
    const tooltipWidth = 300;
    const bal = Math.min(window.innerWidth - tooltipWidth - 12, Math.max(12, rect.left - tooltipWidth + 36));
    const lent = rect.bottom + 8;
    const fent = lent > window.innerHeight - 120 ? Math.max(12, rect.top - 112) : lent;

    tooltip.style.left = `${bal}px`;
    tooltip.style.top = `${fent}px`;

    window.clearTimeout(tooltipTimer);
    tooltipTimer = window.setTimeout(hideTooltip, TOOLTIP_AUTOHIDE_MS);
}

function hideTooltip() {
    window.clearTimeout(tooltipTimer);
    tooltipTimer = null;

    if (tooltipElem) {
        tooltipElem.classList.add('hidden');
    }
}

function clearAktivJelolesek() {
    document.querySelectorAll('.utolso-fokusz-marker').forEach(marker => marker.remove());

    document.querySelectorAll('.fokusz-naplo-van, .utolso-fokusz-legutobbi').forEach(elem => {
        elem.classList.remove('fokusz-naplo-van', 'utolso-fokusz-legutobbi');
    });
}

function alkalmazElemKiemeles(elem) {
    if (!elem) return;

    // Nincs vizuális árnyékolás.
    // A class csak az óra abszolút pozicionálásához és a z-indexhez marad.
    elem.classList.add('fokusz-naplo-van');
}

function markerKeszit(elem, entry) {
    if (!elem || elem.querySelector(':scope > .utolso-fokusz-marker')) return;

    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'utolso-fokusz-marker material-symbols-rounded';
    marker.textContent = 'history';
    marker.setAttribute('aria-label', 'Utolsó előzmény megjelenítése');

    marker.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showTooltip(marker, entry);
    });

    elem.appendChild(marker);
}

export function setFokuszKulcs(elem, { tipus, id = null, utvonal = [], szoveg = '' } = {}) {
    if (!elem) return '';

    const elemKulcs = elemKulcsFromAdat({ tipus, id, utvonal, szoveg });
    elem.dataset.fokuszKulcs = elemKulcs;
    elem.classList.add('fokusz-kovetheto-elem');
    return elemKulcs;
}

export function rogzitFokusz({
    tipus,
    akcio = 'megnyitva',
    szoveg = '',
    utvonal = [],
    elem = null,
    id = null,
    elemKulcs = '',
    valasz = '',
    csakHaValodiEsemeny = false,
    event = null
} = {}) {
    if (csakHaValodiEsemeny && event?.isTrusted !== true) return null;

    const cleanTipus = tisztitSzoveg(tipus) || 'Elem';
    const cleanSzoveg = tisztitSzoveg(szoveg);
    const cleanUtvonal = (Array.isArray(utvonal) ? utvonal : [utvonal])
        .map(tisztitSzoveg)
        .filter(Boolean);

    const vegsoKulcs = elemKulcs || elem?.dataset?.fokuszKulcs || elemKulcsFromAdat({
        tipus: cleanTipus,
        id,
        utvonal: cleanUtvonal,
        szoveg: cleanSzoveg
    });

    if (elem) {
        elem.dataset.fokuszKulcs = vegsoKulcs;
        elem.classList.add('fokusz-kovetheto-elem');
    }

    const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        elemKulcs: vegsoKulcs,
        tipus: cleanTipus,
        tipusKulcs: normalizalTipus(cleanTipus),
        akcio: tisztitSzoveg(akcio) || 'megnyitva',
        szoveg: cleanSzoveg,
        utvonal: cleanUtvonal,
        valasz: tisztitSzoveg(valasz),
        iso: new Date().toISOString()
    };

    const lista = getElozmenyek();
    lista.unshift(entry);
    setElozmenyek(lista);

    // Nem awaiteljük: a kattintás/válaszadás ne várjon adatbázisra.
    mentFokuszSzerverre(entry);

    frissitFokuszJelolok();
    frissitPanelLista();

    return entry;
}

function legfrissebbTipusonkent(lista) {
    const map = new Map();

    lista.forEach(entry => {
        const tipusKulcs = entry.tipusKulcs || normalizalTipus(entry.tipus);
        if (!entry.elemKulcs || map.has(tipusKulcs)) return;
        map.set(tipusKulcs, { ...entry, tipusKulcs });
    });

    return [...map.values()];
}

function observerSzuneteltet() {
    if (observer) observer.disconnect();
}

function observerUjraindit() {
    if (!observer || !document.body) return;

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

export function frissitFokuszJelolok() {
    window.clearTimeout(markerFrissitesTimer);

    markerFrissitesTimer = window.setTimeout(() => {
        observerSzuneteltet();

        try {
            clearAktivJelolesek();
            const lista = getElozmenyek();
            const aktivElemek = legfrissebbTipusonkent(lista);

            aktivElemek.forEach(entry => {
                const elem = document.querySelector(selectorFromKulcs(entry.elemKulcs));
                if (!elem) return;

                alkalmazElemKiemeles(elem);
                markerKeszit(elem, entry);
            });
        } finally {
            observerUjraindit();
        }
    }, 60);
}

function ensurePanel() {
    if (panelElem) return panelElem;

    panelElem = document.createElement('aside');
    panelElem.id = 'fokusz-elozmenyek-panel';
    panelElem.className = 'fokusz-elozmenyek-panel hidden';
    panelElem.innerHTML = `
        <div class="fokusz-elozmenyek-fejlec">
            <div>
                <strong>Előzmények</strong>
                <span>utolsó megnyitások és módosítások</span>
            </div>
            <button type="button" class="fokusz-elozmenyek-zar" aria-label="Előzmények bezárása">×</button>
        </div>
        <div id="fokusz-elozmenyek-lista" class="fokusz-elozmenyek-lista"></div>
    `;

    document.body.appendChild(panelElem);
    listaElem = panelElem.querySelector('#fokusz-elozmenyek-lista');

    panelElem.querySelector('.fokusz-elozmenyek-zar')?.addEventListener('click', () => {
        panelElem.classList.add('hidden');
    });

    return panelElem;
}

function entryElemKeszit(entry) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'fokusz-elozmeny-item';
    item.dataset.elemKulcs = entry.elemKulcs || '';

    const meta = document.createElement('span');
    meta.className = 'fokusz-elozmeny-meta';

    const ido = document.createElement('b');
    ido.textContent = magyarIdo(entry.iso);

    const tipus = document.createElement('span');
    tipus.textContent = `${entry.tipus || 'Elem'} · ${entry.akcio || 'megnyitva'}`;

    meta.appendChild(ido);
    meta.appendChild(tipus);
    item.appendChild(meta);

    if (Array.isArray(entry.utvonal) && entry.utvonal.length) {
        const utvonal = document.createElement('span');
        utvonal.className = 'fokusz-elozmeny-utvonal';
const teljesUtvonal = entry.utvonal
    .map(tisztitSzoveg)
    .filter(Boolean)
    .join(' › ');

utvonal.textContent = teljesUtvonal;
utvonal.title = teljesUtvonal;
        item.appendChild(utvonal);
    }

    const szoveg = document.createElement('span');
    szoveg.className = 'fokusz-elozmeny-szoveg';
    szoveg.textContent = rovidit(entry.szoveg || 'Nincs szöveg');
    item.appendChild(szoveg);

    if (entry.valasz) {
        const valasz = document.createElement('span');
        valasz.className = 'fokusz-elozmeny-valasz';
        valasz.textContent = kerdesValaszFelirat(entry.valasz);
        item.appendChild(valasz);
    }

    item.addEventListener('click', () => {
        ugrasFokuszElemhez(entry);
    });

    return item;
}

function frissitPanelLista(szurtElemKulcs = '') {
    if (!listaElem) return;

    const lista = getElozmenyek()
        .filter(entry => !szurtElemKulcs || entry.elemKulcs === szurtElemKulcs);

    listaElem.replaceChildren();

    if (lista.length === 0) {
        const ures = document.createElement('div');
        ures.className = 'fokusz-elozmeny-ures';
        ures.textContent = 'Még nincs előzmény ebben az értékelésben.';
        listaElem.appendChild(ures);
        return;
    }

    lista.forEach(entry => listaElem.appendChild(entryElemKeszit(entry)));
}

export function toggleElozmenyekPanel(szurtElemKulcs = '') {
    ensurePanel();

    const mostNyitvaVan = !panelElem.classList.contains('hidden');

    if (mostNyitvaVan) {
        panelElem.classList.add('hidden');
        hideTooltip();
        return;
    }

    frissitPanelLista(szurtElemKulcs);
    panelElem.classList.remove('hidden');
    hideTooltip();
}


function gorgetEsVillants(elem) {
    if (!elem) return;

    elem.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    elem.classList.add('fokusz-visszaugras-pulse');

    window.setTimeout(() => {
        elem.classList.remove('fokusz-visszaugras-pulse');
    }, 1600);
}

export async function ugrasFokuszElemhez(entry) {
    if (!entry?.elemKulcs) return;

    const elem = document.querySelector(selectorFromKulcs(entry.elemKulcs));

    if (elem) {
        gorgetEsVillants(elem);
        return;
    }

    try {
        const { navigateToFocusEntry } = await import('./main_quest_ertekeles_navigator.js');
        const sikerult = await navigateToFocusEntry(entry);

        if (sikerult) {
            return;
        }
    } catch (error) {
        console.warn('Fókusz útvonalnyitási hiba:', error);
    }

    frissitPanelLista();
}

function bekotElozmenyekGombot() {
    document
        .querySelectorAll('#fokusz-elozmenyek-gomb, #elozmenyek-gomb, [data-elozmenyek-gomb="1"], .elozmenyek-gomb')
        .forEach(gomb => {
            if (gomb.dataset.elozmenyekBekotve === '1') return;

            gomb.dataset.elozmenyekBekotve = '1';

            gomb.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleElozmenyekPanel();            
            });
        });
}

function globalisZaroEsemenyekBekotese() {
    if (document.body?.dataset?.fokuszTooltipZaro === '1') return;
    if (document.body) document.body.dataset.fokuszTooltipZaro = '1';

    document.addEventListener('pointerdown', (event) => {
        const target = event.target;
        if (target?.closest?.('.utolso-fokusz-marker') || target?.closest?.('.fokusz-elozmeny-tooltip')) return;
        hideTooltip();
    }, true);

    window.addEventListener('scroll', hideTooltip, { passive: true });
    window.addEventListener('wheel', hideTooltip, { passive: true });
    window.addEventListener('resize', hideTooltip, { passive: true });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hideTooltip();
    });
}

export function initFokuszElozmenyek() {
    const init = () => {
        ensureFocusHistoryCss();
        globalisZaroEsemenyekBekotese();

        if (initKesz) {
            bekotElozmenyekGombot();
            frissitFokuszJelolok();
            return;
        }

        initKesz = true;
        ensurePanel();
        bekotElozmenyekGombot();
        frissitFokuszJelolok();

        // Induláskor DB-ből is visszatöltjük az előzményeket.
        // A helyi sessionStorage megmarad gyors cache-nek.
      betoltFokuszokSzerverrol().finally(() => {
    inditNyitoFokuszUgrast();
});

        if (!observer && document.body) {
            observer = new MutationObserver(() => {
                bekotElozmenyekGombot();
                frissitFokuszJelolok();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}

initFokuszElozmenyek();
