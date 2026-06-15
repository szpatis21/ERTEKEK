// Értékelés renderelése és diagramfrissítés.
import { kerdesValaszok, szovegesValaszok, modulSzamolas } from './main_alap.js';
import { pontokLathatok } from './main_graph.js';
import {
    szamoljFokerdesAdatokModSzerint,
    normalizalSzamolasMod,
    letrehozFoKategoriaChart,
    kiszamoltFoKategoriaDiagramAdatok,
    letrehozAlkategoriaChart,
    letrehozAltTemaChart
} from './szamitasok.js';
import { questState, questApi } from './main_quest_state.js';
function safeCssColor(value, fallback = '#ccc') {
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
function pontosszegzesAktiv() {
    return normalizalSzamolasMod(modulSzamolas) === 1;
}

export function frissitErtekelesekContainer() {
    const container = document.getElementById('ertekelesek-container');
    if (!container) return;
    container.replaceChildren();

    const NINCS_ALKATEGORIA = '__NINCS_ALKATEGORIA__';
    const NINCS_ALTEMA = '__NINCS_ALTEMA__';

    const foKategoriak = {};
    const ertekelesJSON = {};
    let osszesitettPontszam = 0;

    const tisztaSzint = (value) => String(value || '').trim();

    const alKulcs = (value) => {
        const clean = tisztaSzint(value);
        return clean || NINCS_ALKATEGORIA;
    };

    const altKulcs = (value) => {
        const clean = tisztaSzint(value);
        return clean || NINCS_ALTEMA;
    };

    const valodiAlNev = (kulcs) => kulcs === NINCS_ALKATEGORIA ? '' : kulcs;
    const valodiAltNev = (kulcs) => kulcs === NINCS_ALTEMA ? '' : kulcs;

    const utvonalString = (...parts) => {
        return parts
            .map(p => String(p || '').trim())
            .filter(Boolean)
            .join('/');
    };

    const ensureCsoport = (kerdes) => {
        const foKategoriaNev = tisztaSzint(kerdes.foKategoria) || 'Kategória nélkül';
        const alKategoriaKulcs = alKulcs(kerdes.alKategoria);
        const altTemaKulcs = altKulcs(kerdes.altTema);
        const parentKey = kerdes.parentId || kerdes.id;

        if (!foKategoriak[foKategoriaNev]) {
            foKategoriak[foKategoriaNev] = {};
        }

        if (!foKategoriak[foKategoriaNev][alKategoriaKulcs]) {
            foKategoriak[foKategoriaNev][alKategoriaKulcs] = {};
        }

        if (!foKategoriak[foKategoriaNev][alKategoriaKulcs][altTemaKulcs]) {
            foKategoriak[foKategoriaNev][alKategoriaKulcs][altTemaKulcs] = {};
        }

        if (!foKategoriak[foKategoriaNev][alKategoriaKulcs][altTemaKulcs][parentKey]) {
            foKategoriak[foKategoriaNev][alKategoriaKulcs][altTemaKulcs][parentKey] = {
                kerdesek: [],
                alkerdesek: []
            };
        }

        return foKategoriak[foKategoriaNev][alKategoriaKulcs][altTemaKulcs][parentKey];
    };

    // 1) IGEN/NEM típusú kérdések beolvasása
    for (const [key, value] of Object.entries(kerdesValaszok)) {
        const kerdes = questApi.KategoriaKezelo.kerdesek.find(k => k.id === parseInt(key, 10));
        if (!kerdes) continue;

        const aktualisCsoport = ensureCsoport(kerdes);

        let text = '';
        let elert_ertek = 0;
        let negalt_ertek = 0;

        if (value === 'igen') {
            text = kerdes.szoveg;
            negalt_ertek = 0;
            elert_ertek = kerdes.ertek;
        } else if (value === 'nem' && kerdes.negaltKerdesSzoveg) {
            text = kerdes.negaltKerdesSzoveg;
            negalt_ertek = kerdes.negalt_ertek;
            elert_ertek = kerdes.negalt_ertek;
        }

        if (!text) continue;

        if (kerdes.parentId) {
            aktualisCsoport.alkerdesek.push([
                text,
                elert_ertek,
                kerdes.id,
                kerdes.maximalis_szint
            ]);
        } else {
            aktualisCsoport.kerdesek.push([
                text,
                kerdes.ertek,
                kerdes.id,
                negalt_ertek,
                kerdes.maximalis_szint
            ]);
        }
    }

    // 2) Szöveges válaszok beolvasása
    for (const [key, value] of Object.entries(szovegesValaszok)) {
        const trimmedVal = value.trim();
        if (!trimmedVal) continue;

        const kerdesId = parseInt(key, 10);
        if (isNaN(kerdesId)) continue;

        const kerdes = questApi.KategoriaKezelo.kerdesek.find(k => k.id === kerdesId);
        if (!kerdes) continue;

        const aktualisCsoport = ensureCsoport(kerdes);

        if (kerdes.parentId) {
            const letezoAlkerdesIndex = aktualisCsoport.alkerdesek.findIndex(item => item[2] === kerdes.id);

            if (letezoAlkerdesIndex > -1) {
                aktualisCsoport.alkerdesek[letezoAlkerdesIndex][0] = trimmedVal;
            } else {
                aktualisCsoport.alkerdesek.push([
                    trimmedVal,
                    kerdes.ertek,
                    kerdes.id,
                    kerdes.maximalis_szint
                ]);
            }
        } else {
            const letezoKerdesIndex = aktualisCsoport.kerdesek.findIndex(item => item[2] === kerdes.id);

            if (letezoKerdesIndex > -1) {
                aktualisCsoport.kerdesek[letezoKerdesIndex][0] = trimmedVal;
            } else {
                aktualisCsoport.kerdesek.push([
                    trimmedVal,
                    0,
                    kerdes.id,
                    0,
                    kerdes.maximalis_szint,
                    true
                ]);
            }
        }
    }

    const renderKerdesCsoport = (foKategoriaNev, alKategoriaNev, altTemaNev, kerdesObj) => {
        const kerdesekCell = document.createElement('td');
        kerdesekCell.classList.add('kerdesek');
        kerdesekCell.colSpan = 2;

        let hasKerdes = false;
        let csoportOsszpont = 0;

        for (const [kerdesId, valaszok] of Object.entries(kerdesObj)) {
            if (valaszok.kerdesek.length === 0 && valaszok.alkerdesek.length === 0) {
                continue;
            }

            const kerdesContainer = document.createElement('div');
            kerdesContainer.classList.add('kerdes-container');

            valaszok.kerdesek.forEach((alkerd) => {
                const [szoveg, ertek, id, negalt_ertek, maximalis_szint, isTextOnly] = alkerd;

                const p = document.createElement('p');
                p.classList.add('fokerd');
                p.setAttribute('data-id', id);
                p.setAttribute('data-maxi', maximalis_szint == 1 ? 'true' : 'false');

                if (isTextOnly) {
                    p.setAttribute('data-ignore-score', 'true');
                }

                const parentKerdes = questApi.KategoriaKezelo.kerdesek.find(k => k.id === id);
                let aktualisErtek = 0;

                if (parentKerdes) {
                    const szamitasEredmeny = szamoljFokerdesAdatokModSzerint(
                        parentKerdes,
                        questApi.KategoriaKezelo.kerdesek,
                        kerdesValaszok,
                        modulSzamolas
                    );

                    if (szamitasEredmeny !== null) {
                        aktualisErtek = szamitasEredmeny.szazalek;
                        p.dataset.elertPont = String(szamitasEredmeny.elertPont ?? 0);
                        p.dataset.maxPont = String(szamitasEredmeny.maxPont ?? 0);
                    } else {
                        aktualisErtek = Math.max(parseFloat(ertek) || 0, parseFloat(negalt_ertek) || 0);
                        p.dataset.elertPont = String(aktualisErtek);
                        p.dataset.maxPont = '100';
                    }
                }

                csoportOsszpont += aktualisErtek;

             const utvonal = utvonalString(foKategoriaNev, alKategoriaNev, altTemaNev, szoveg);

                p.textContent = szoveg || '';

                const pontSpan = document.createElement('span');
                pontSpan.className = 'pontB';
                pontSpan.dataset.pontKerd = `${utvonal}:${aktualisErtek}`;
                pontSpan.textContent = ` (${aktualisErtek}%)`;

                p.appendChild(pontSpan);

                kerdesContainer.appendChild(p);
            });

            valaszok.alkerdesek.forEach((alkerd) => {
                const [szoveg, ertek, id, maximalis_szint] = alkerd;

                const p = document.createElement('p');
                p.classList.add('alkerd');
                p.setAttribute('data-ertek', ertek);
                p.setAttribute('data-id', id);
                p.setAttribute('data-maxi', maximalis_szint == 1 ? 'true' : 'false');

                const utvonal = utvonalString(foKategoriaNev, alKategoriaNev, altTemaNev);
                p.setAttribute('data-utvonal', utvonal);

                const aktualisErtek = parseFloat(ertek) || 0;
                csoportOsszpont += aktualisErtek;

                p.textContent = szoveg || '';

                const pontSpan = document.createElement('span');
                pontSpan.className = 'pontA';
                pontSpan.textContent = ` (${aktualisErtek} pont)`;

                p.appendChild(pontSpan);
                kerdesContainer.appendChild(p);
            });

            kerdesekCell.appendChild(kerdesContainer);
            hasKerdes = true;
        }

        if (!hasKerdes) {
            return {
                hasKerdes: false,
                kerdesekCell,
                atlag: 0,
                osszPont: 0,
                elertPont: 0,
                maxPont: 0
            };
        }

        const maximalizaltErtekek = [];
        const normalErtekek = [];

        kerdesekCell.querySelectorAll('.fokerd').forEach(pElem => {
            if (pElem.getAttribute('data-ignore-score') === 'true') return;

            const maxi = pElem.getAttribute('data-maxi') === 'true';
            const ertek = parseInt(
                pElem.querySelector('span')?.textContent?.match(/\((\d+)%\)/)?.[1]
            ) || 0;

            if (maxi) {
                maximalizaltErtekek.push(ertek);
            } else {
                normalErtekek.push(ertek);
            }
        });

        let csoportAtlag = 0;
        let csoportElertPont = 0;
        let csoportMaxPont = 0;

        if (pontosszegzesAktiv()) {
            kerdesekCell.querySelectorAll('.fokerd').forEach(pElem => {
                if (pElem.getAttribute('data-ignore-score') === 'true') return;

                const elertPont = parseFloat(pElem.dataset.elertPont || '0');
                const maxPont = parseFloat(pElem.dataset.maxPont || '0');

                if (Number.isFinite(elertPont)) csoportElertPont += elertPont;
                if (Number.isFinite(maxPont)) csoportMaxPont += maxPont;
            });

            csoportAtlag = csoportMaxPont > 0
                ? Math.round((csoportElertPont / csoportMaxPont) * 100)
                : 0;
        } else {
            const ertekek = maximalizaltErtekek.length > 0 ? maximalizaltErtekek : normalErtekek;

            csoportAtlag = ertekek.length > 0
                ? Math.round(ertekek.reduce((sum, val) => sum + val, 0) / ertekek.length)
                : 0;
        }

        return {
            hasKerdes: true,
            kerdesekCell,
            atlag: csoportAtlag,
            osszPont: csoportOsszpont,
            elertPont: csoportElertPont,
            maxPont: csoportMaxPont
        };
    };

    // 3) Megjelenítés rugalmas kategóriaútvonal alapján
    for (const [foKategoriaNev, alKategoriak] of Object.entries(foKategoriak)) {
        const foKategoriaDiv = document.createElement('div');
        foKategoriaDiv.classList.add('fo-kategoria');

        const foKategoriaCim = document.createElement('h3');

        const szinKocka = document.createElement('div');
        szinKocka.className = 'szin-kocka';

        Object.assign(szinKocka.style, {
            display: 'inline-block',
            width: '30px',
            height: '30px',
            position: 'absolute',
            marginRight: '6px',
            verticalAlign: 'middle',
            borderRadius: '20px',
            background: '#ccc'
        });

        foKategoriaDiv.appendChild(szinKocka);

        const globalChartSzinek = window.kategoriakChartSzinek || {};
        const globalSzinek = window.kategoriakSzinek || {};

       const rawRgbValue =
                questState.kategoriakChartSzinek[foKategoriaNev] ||
                questState.kategoriakSzinek[foKategoriaNev] ||
                globalChartSzinek[foKategoriaNev] ||
                globalSzinek[foKategoriaNev] ||
                '#ccc';

            const rgbValue = safeCssColor(rawRgbValue);

            szinKocka.style.background = rgbValue;
            foKategoriaCim.dataset.szin = rgbValue;
            szinKocka.dataset.rgb = rgbValue;

        const osszegzesDiv = document.createElement('div');
        osszegzesDiv.classList.add('pontD');

        foKategoriaCim.textContent = foKategoriaNev;
        foKategoriaCim.appendChild(osszegzesDiv);
        foKategoriaDiv.appendChild(foKategoriaCim);

        const table = document.createElement('table');
        table.classList.add('ertekeles-table');

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        let hasFoTartalom = false;
        let kategoriaOsszpont = 0;
        let kategoriaSzazalekok = [];
        let kategoriaPontAdatok = [];

        ertekelesJSON[foKategoriaNev] = {
            '%': 0,
            alkategoriak: {}
        };

const rendezettAlKategoriak = Object.entries(alKategoriak).sort(([a], [b]) => {
    const aDirekt = a === NINCS_ALKATEGORIA;
    const bDirekt = b === NINCS_ALKATEGORIA;

    if (aDirekt && !bDirekt) return -1;
    if (!aDirekt && bDirekt) return 1;

    return 0;
});

for (const [alKategoriaKulcs, altTemak] of rendezettAlKategoriak) {            const vanAlKategoria = alKategoriaKulcs !== NINCS_ALKATEGORIA;
            const alKategoriaNev = valodiAlNev(alKategoriaKulcs);

            let alKategoriaOsszpont = 0;
            let alKategoriaSzazalekok = [];
            let alKategoriaPontAdatok = [];
            const alSorok = [];

const rendezettAltTemak = Object.entries(altTemak).sort(([a], [b]) => {
    const aDirektKerdes = a === NINCS_ALTEMA;
    const bDirektKerdes = b === NINCS_ALTEMA;

    if (aDirektKerdes && !bDirektKerdes) return -1;
    if (!aDirektKerdes && bDirektKerdes) return 1;

    return 0;
});

for (const [altTemaKulcs, kerdesObj] of rendezettAltTemak) {                const vanAltTema = altTemaKulcs !== NINCS_ALTEMA;
                const altTemaNev = valodiAltNev(altTemaKulcs);

                const csoport = renderKerdesCsoport(
                    foKategoriaNev,
                    alKategoriaNev,
                    altTemaNev,
                    kerdesObj
                );

                if (!csoport.hasKerdes) continue;

                kategoriaOsszpont += csoport.osszPont;
                alKategoriaOsszpont += csoport.osszPont;

                alKategoriaSzazalekok.push(csoport.atlag);

                if (pontosszegzesAktiv()) {
                    alKategoriaPontAdatok.push({
                        elertPont: csoport.elertPont,
                        maxPont: csoport.maxPont
                    });
                }

              // Főkategória → Altéma → Kérdés
// Nincs alkategória, de VAN altéma: az altéma nevét is ki kell írni.
if (!vanAlKategoria && vanAltTema) {
    const direktAltTemaRow = document.createElement('tr');
    direktAltTemaRow.classList.add('alt-tema', 'fo-kozvetlen-altema');

    const altTemaCell = document.createElement('td');
    altTemaCell.classList.add('alt-tema', 'fo-kozvetlen-altema-cim');

    const osszegzesDivAlt = document.createElement('div');
    osszegzesDivAlt.classList.add('pontC');
    osszegzesDivAlt.textContent = `(${csoport.atlag}%)`;
    const altUtvonal = utvonalString(foKategoriaNev, altTemaNev);
    osszegzesDivAlt.setAttribute('data-pont-alt', `${altUtvonal}:${csoport.atlag}`);

    altTemaCell.textContent = altTemaNev + ':';
    altTemaCell.appendChild(osszegzesDivAlt);

    direktAltTemaRow.appendChild(altTemaCell);
    direktAltTemaRow.appendChild(csoport.kerdesekCell);

    tbody.appendChild(direktAltTemaRow);

    kategoriaSzazalekok.push(csoport.atlag);

    if (pontosszegzesAktiv()) {
        kategoriaPontAdatok.push({
            elertPont: csoport.elertPont,
            maxPont: csoport.maxPont
        });
    }

    hasFoTartalom = true;
    continue;
}

// Főkategória → Kérdés
// Nincs alkategória és nincs altéma: ez valóban közvetlen főkategória alatti kérdés.
if (!vanAlKategoria && !vanAltTema) {
    const direktRow = document.createElement('tr');
    direktRow.classList.add('kerdes-sor', 'fo-kozvetlen-kerdesek');
    direktRow.appendChild(csoport.kerdesekCell);
    tbody.appendChild(direktRow);

    kategoriaSzazalekok.push(csoport.atlag);

    if (pontosszegzesAktiv()) {
        kategoriaPontAdatok.push({
            elertPont: csoport.elertPont,
            maxPont: csoport.maxPont
        });
    }

    hasFoTartalom = true;
    continue;
}

// Főkategória → Alkategória → Altéma → Kérdés
if (vanAltTema) {
    const altTemaRow = document.createElement('tr');
    altTemaRow.classList.add('alt-tema');

    const altTemaCell = document.createElement('td');
    altTemaCell.classList.add('alt-tema');

    const osszegzesDivAlt = document.createElement('div');
    osszegzesDivAlt.classList.add('pontC');
    osszegzesDivAlt.textContent = `(${csoport.atlag}%)`;
    const altUtvonal = utvonalString(foKategoriaNev, alKategoriaNev, altTemaNev);
    osszegzesDivAlt.setAttribute('data-pont-alt', `${altUtvonal}:${csoport.atlag}`);

    altTemaCell.textContent = altTemaNev + ':';
    altTemaCell.appendChild(osszegzesDivAlt);

    altTemaRow.appendChild(altTemaCell);
    altTemaRow.appendChild(csoport.kerdesekCell);

    alSorok.push(altTemaRow);
} else {
    // Főkategória → Alkategória → Kérdés
    const direktAlRow = document.createElement('tr');
    direktAlRow.classList.add('kerdes-sor', 'al-kozvetlen-kerdesek');
    direktAlRow.appendChild(csoport.kerdesekCell);

    alSorok.push(direktAlRow);
}



                hasFoTartalom = true;
            }

            if (!vanAlKategoria || alSorok.length === 0) {
                continue;
            }

            let alKatAtlag = 0;
            let alKatElertPont = 0;
            let alKatMaxPont = 0;

            if (pontosszegzesAktiv()) {
                alKatElertPont = alKategoriaPontAdatok.reduce((sum, item) => sum + (parseFloat(item.elertPont) || 0), 0);
                alKatMaxPont = alKategoriaPontAdatok.reduce((sum, item) => sum + (parseFloat(item.maxPont) || 0), 0);

                alKatAtlag = alKatMaxPont > 0
                    ? Math.round((alKatElertPont / alKatMaxPont) * 100)
                    : 0;

                kategoriaPontAdatok.push({
                    elertPont: alKatElertPont,
                    maxPont: alKatMaxPont
                });
            } else {
                alKatAtlag = alKategoriaSzazalekok.length > 0
                    ? Math.round(alKategoriaSzazalekok.reduce((sum, val) => sum + val, 0) / alKategoriaSzazalekok.length)
                    : 0;
            }

            kategoriaSzazalekok.push(alKatAtlag);

            const alKatRow = document.createElement('tr');
            alKatRow.classList.add('al-kategoria');

            const alKatCell = document.createElement('td');
            alKatCell.colSpan = 2;
            alKatCell.textContent = alKategoriaNev;
            alKatCell.classList.add('al-kategoria');

            const osszegzesDivAlKat = document.createElement('div');
            osszegzesDivAlKat.classList.add('pontF');
            osszegzesDivAlKat.textContent = ` (${alKatAtlag}%)`;
            osszegzesDivAlKat.setAttribute('data-pont-al', `${foKategoriaNev}/${alKategoriaNev}:${alKatAtlag}`);

            alKatCell.appendChild(osszegzesDivAlKat);
            alKatRow.appendChild(alKatCell);

            tbody.appendChild(alKatRow);

            alSorok.forEach(row => {
                tbody.appendChild(row);
            });

            ertekelesJSON[foKategoriaNev].alkategoriak[alKategoriaNev] = {
                '%': alKatAtlag,
                altTemak: {}
            };

            for (const [altTemaKulcs, kerdesObj] of Object.entries(altTemak)) {
                if (altTemaKulcs === NINCS_ALTEMA) continue;

                const altTemaNev = valodiAltNev(altTemaKulcs);

                const altTd = [...alSorok]
                    .filter(row => row.classList.contains('alt-tema'))
                    .map(row => row.querySelector('td.alt-tema'))
                    .find(td => td?.childNodes[0]?.textContent.trim().replace(/:$/, '') === altTemaNev);

                const altSzazalek = parseInt(
                    altTd?.querySelector('.pontC')?.textContent.match(/\((\d+)%\)/)?.[1] || 0
                );

                ertekelesJSON[foKategoriaNev].alkategoriak[alKategoriaNev].altTemak[altTemaNev] = altSzazalek;
            }
        }

        if (!hasFoTartalom) {
            continue;
        }

        foKategoriaDiv.appendChild(table);

        let foKatAtlag = 0;

        if (pontosszegzesAktiv()) {
            const foKatElertPont = kategoriaPontAdatok.reduce((sum, item) => sum + (parseFloat(item.elertPont) || 0), 0);
            const foKatMaxPont = kategoriaPontAdatok.reduce((sum, item) => sum + (parseFloat(item.maxPont) || 0), 0);

            foKatAtlag = foKatMaxPont > 0
                ? Math.round((foKatElertPont / foKatMaxPont) * 100)
                : 0;
        } else {
            foKatAtlag = kategoriaSzazalekok.length > 0
                ? Math.round(kategoriaSzazalekok.reduce((sum, val) => sum + val, 0) / kategoriaSzazalekok.length)
                : 0;
        }

        osszegzesDiv.textContent = `Főkategória teljesítmény: ${foKatAtlag}%`;
        osszegzesDiv.setAttribute('data-fo-szazalek', foKatAtlag);
        osszegzesDiv.setAttribute('data-pont-fo', `${foKategoriaNev}:${foKatAtlag}`);

        ertekelesJSON[foKategoriaNev]['%'] = foKatAtlag;

        container.appendChild(foKategoriaDiv);
        osszesitettPontszam += kategoriaOsszpont;
    }

    window.ertekelesJSON = ertekelesJSON;

    const vegsoOsszegzesDiv = document.createElement('div');
    vegsoOsszegzesDiv.classList.add('pontE');
    vegsoOsszegzesDiv.textContent = `Teljes értékelés összpontszáma: ${osszesitettPontszam} pont`;
    vegsoOsszegzesDiv.setAttribute('data-ertek-ossz', osszesitettPontszam);

    container.prepend(vegsoOsszegzesDiv);

    const pontok = document.querySelectorAll('.pontA, .pontB, .pontC, .pontD, .pontE, .pontF');

    pontok.forEach(pont => {
        pont.style.display = pontokLathatok ? 'flex' : 'none';
    });

    const chartSelector = document.getElementById('chartTypeSelector');

    if (chartSelector && !chartSelector.dataset.frissitBound) {
        chartSelector.dataset.frissitBound = '1';

        chartSelector.addEventListener('change', async function(e) {
            const ujTipus = e.target.value;
            const modul = await import('./szamitasok.js');

            modul.setDiagramTipus(ujTipus);

            const canvas = document.getElementById('fokategoriaChart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const { chartLabels, chartData } = modul.kiszamoltFoKategoriaDiagramAdatok();

                window.foKategoriaChartInstance = modul.letrehozFoKategoriaChart(
                    ctx,
                    chartLabels,
                    chartData,
                    window.kategoriakChartSzinek,
                    window.foKategoriaChartInstance
                );
            }

            modul.frissitsdAzAlDiagramokat();
        });
    }

    const fokategoriaCanvas = document.getElementById('fokategoriaChart');
    if (fokategoriaCanvas) {
        const { chartLabels, chartData } = kiszamoltFoKategoriaDiagramAdatok();
        const ctx = fokategoriaCanvas.getContext('2d');

        window.foKategoriaChartInstance = letrehozFoKategoriaChart(
            ctx,
            chartLabels,
            chartData,
            questState.kategoriakChartSzinek,
            window.foKategoriaChartInstance
        );
    }

    const aktivFoKatElem = document.querySelector('.fo.active .cim');
    const altTemaChartContainer = document.getElementById('altTemaChartContainer');

    if (aktivFoKatElem) {
        const aktivFoKategoriaNev = aktivFoKatElem.textContent.trim();

        const foKatElem = [...document.querySelectorAll('.fo-kategoria h3')].find(
            h3 => h3.textContent.trim().startsWith(aktivFoKategoriaNev)
        );

        if (foKatElem) {
            const alkatDivok = [...foKatElem.parentElement.querySelectorAll('.pontF')];
            const labels = [];
            const data = [];

            alkatDivok.forEach(div => {
                const adat = div.getAttribute('data-pont-al');

                if (adat) {
                    const [rawLabel] = adat.split(':');
                    const label = rawLabel.split('/').pop().trim();

                    const ertek = parseFloat(
                        div.textContent.match(/\((\d+)%\)/)?.[1]
                    );

                    if (!isNaN(ertek)) {
                        labels.push(label);
                        data.push(ertek);
                    }
                }
            });

            if (labels.length && data.length) {
                window.aktivFoKategoriaNev = aktivFoKategoriaNev;
                letrehozAlkategoriaChart(labels, data, questState.kategoriakChartSzinek, window.aktivFoKategoriaNev);
            }

            const aktivAlkatElem = document.querySelector('.al.active');

            if (aktivAlkatElem && window.aktivFoKategoriaNev && altTemaChartContainer) {
                const cimElem = aktivAlkatElem.querySelector('.cim');
                const aktivAlKategoriaNev = cimElem
                    ? cimElem.textContent.trim()
                    : aktivAlkatElem.textContent.trim();

                const foDiv = [...document.querySelectorAll('#keszulo .fo-kategoria')]
                    .find(div => div.querySelector('h3')
                        ?.textContent.trim()
                        .startsWith(window.aktivFoKategoriaNev)
                    );

                if (!foDiv) {
                    altTemaChartContainer.style.display = 'none';
                } else {
                    const alKatTr = [...foDiv.querySelectorAll('tr.al-kategoria')]
                        .find(tr => tr.querySelector('td.al-kategoria')
                            ?.childNodes[0]
                            ?.textContent.trim() === aktivAlKategoriaNev
                        );

                    if (!alKatTr) {
                        altTemaChartContainer.style.display = 'none';
                    } else {
                        const altLabels = [];
                        const altData = [];
                        let nextRow = alKatTr.nextElementSibling;

while (
    nextRow &&
    nextRow.classList.contains('alt-tema') &&
    !nextRow.classList.contains('fo-kozvetlen-altema')
) {                            const td = nextRow.querySelector('td.alt-tema');
                            const altNev = td?.childNodes[0]?.textContent.trim().replace(/:$/, '') || '';
                            const szazalek = parseFloat(
                                td?.querySelector('.pontC')?.textContent.match(/\((\d+)%\)/)?.[1]
                            );

                            if (altNev && !isNaN(szazalek)) {
                                altLabels.push(altNev);
                                altData.push(szazalek);
                            }

                            nextRow = nextRow.nextElementSibling;
                        }

                        if (altLabels.length) {
                            letrehozAltTemaChart(
                                altLabels,
                                altData,
                                window.aktivFoKategoriaNev,
                                questState.kategoriakChartSzinek
                            );

                            altTemaChartContainer.style.display = 'block';
                        } else {
                            altTemaChartContainer.style.display = 'none';
                        }
                    }
                }
            } else if (altTemaChartContainer) {
                altTemaChartContainer.style.display = 'none';
            }
        }
    } else if (altTemaChartContainer) {
        altTemaChartContainer.style.display = 'none';
    }
}
