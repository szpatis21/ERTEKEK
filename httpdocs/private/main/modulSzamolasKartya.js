import {
    normalizalSzamolasMod,
    szamoljFokerdesAdatokModSzerint,
    letrehozFoKategoriaChart
} from './szamitasok.js';

const apiFetch = (...args) => {
    if (typeof window.csrfFetch === 'function') {
        return window.csrfFetch(...args);
    }

    return fetch(...args);
};

function getKapcsoloSzamolasErtek(kapcsoloElem) {
    if (!kapcsoloElem) return 0;

    if (kapcsoloElem.type === 'checkbox') {
        return kapcsoloElem.checked ? 1 : 0;
    }

    return normalizalSzamolasMod(kapcsoloElem.value);
}

function setKapcsoloSzamolasErtek(kapcsoloElem, szamolas) {
    if (!kapcsoloElem) return;

    const cleanSzamolas = normalizalSzamolasMod(szamolas);

    if (kapcsoloElem.type === 'checkbox') {
        kapcsoloElem.checked = cleanSzamolas === 1;
        kapcsoloElem.value = String(cleanSzamolas);
        return;
    }

    kapcsoloElem.value = String(cleanSzamolas);
}

const demoParentKerdes = {
    id: 9000,
    parentId: null,
    alKategoria: 'Pontszámítás példa',
    ertek: 0,
    negalt_ertek: 0,
    igenAg: [9001, 9002, 9003],
    nemAg: [],
    szoveges: false,
    maximalis_szint: 0
};

const demoKerdesek = [
    demoParentKerdes,
    {
        id: 9001,
        parentId: 9000,
        ertek: 1,
        negalt_ertek: 0,
        ossz_ertek: 10,
        szoveges: false,
        maximalis_szint: 0
    },
    {
        id: 9002,
        parentId: 9000,
        ertek: 5,
        negalt_ertek: 0,
        ossz_ertek: 50,
        szoveges: false,
        maximalis_szint: 0
    },
    {
        id: 9003,
        parentId: 9000,
        ertek: 10,
        negalt_ertek: 0,
        ossz_ertek: 100,
        szoveges: false,
        maximalis_szint: 0
    }
];

const demoValaszok = {
    9000: 'igen',
    9001: 'ures',
    9002: 'ures',
    9003: 'ures'
};

function getDemoValaszok() {
    document
        .querySelectorAll('#modulSzamolasDemoKerdesek .question[data-demo-kerdes-id]')
        .forEach(question => {
            const id = Number(question.dataset.demoKerdesId);
            const igenInput = question.querySelector('input.igen');
            demoValaszok[id] = igenInput?.checked ? 'igen' : 'ures';
        });

    return demoValaszok;
}
function setDemoKerdesVisual(questionElem, valasz) {
    const isIgen = valasz === 'igen';

    const gomboc = questionElem.querySelector('.gomboc');
    const igenszoveg = questionElem.querySelector('.igenszoveg');
    const uresszoveg = questionElem.querySelector('.uresszoveg');

    if (gomboc && !isIgen) {
        gomboc.style.boxShadow = 'inset 0px 0px 3px 1px grey';
        gomboc.style.background = 'transparent';
        gomboc.style.transform = 'translate(-35px, -12px) rotate(45deg)';
    }

    if (gomboc && isIgen) {
        gomboc.style.boxShadow = 'inset 0px 0px 3px 1px #88ca00';
        gomboc.style.color = 'white';
        gomboc.style.background = 'rgb(145 204 0)';
        gomboc.style.transform = 'translate(13px, -12px) rotate(135deg)';
    }

    if (igenszoveg) {
        igenszoveg.classList.toggle('igenteli', isIgen);
        igenszoveg.style.color = isIgen ? 'white' : 'grey';
    }

    if (uresszoveg) {
        uresszoveg.style.color = isIgen ? 'grey' : 'black';
    }

    questionElem.style.boxShadow = isIgen
        ? 'inset 6px 0px 1px 1px #0d8200a3'
        : 'none';

    questionElem.style.background = isIgen
        ? 'rgb(48 255 0 / 8%)'
        : '';
}

function frissitDemoCsuszkaAllapotok() {
    document
        .querySelectorAll('#modulSzamolasDemoKerdesek .question[data-demo-kerdes-id]')
        .forEach(question => {
            const id = Number(question.dataset.demoKerdesId);
            const igenInput = question.querySelector('input.igen');
            const uresInput = question.querySelector('input.ures');

            let valasz = 'ures';

            if (igenInput?.checked) {
                valasz = 'igen';
            } else {
                if (uresInput) {
                    uresInput.checked = true;
                }
                valasz = 'ures';
            }

            demoValaszok[id] = valasz;
            setDemoKerdesVisual(question, valasz);
        });
}


function initDemoCsuszkaCss() {
    if (document.getElementById('modulSzamolasDemoCsuszkaCss')) return;

    const style = document.createElement('style');
    style.id = 'modulSzamolasDemoCsuszkaCss';
    style.textContent = `
        #modulSzamolasDemoKerdesek .csuszka {
            position: relative;
        }

        .modul-szamolas-demo-chart,
        #modulSzamolasDemoChartWrap,
        #modulSzamolasDemoChartDoboz {
            min-height: 240px;
            height: 240px;
            width: 100%;
            position: relative;
        }

        #modulSzamolasDemoChart {
            display: block;
            width: 100% !important;
            height: 220px !important;
            min-height: 220px;
        }
    `;

    document.head.appendChild(style);
}

function alaphelyzetbeAllitDemoKerdesek() {
    document
        .querySelectorAll('#modulSzamolasDemoKerdesek .question[data-demo-kerdes-id]')
        .forEach(question => {
            const id = Number(question.dataset.demoKerdesId);
            const igenInput = question.querySelector('input.igen');
            const uresInput = question.querySelector('input.ures');

            if (igenInput) igenInput.checked = false;
            if (uresInput) uresInput.checked = true;

            demoValaszok[id] = 'ures';
            setDemoKerdesVisual(question, 'ures');
        });
}

function getLeiras(szamolas) {
    if (normalizalSzamolasMod(szamolas) === 1) {
        return `
            <h4>Pontösszegzés</h4>
            <p>A kérdőívrendszer jelenleg pontösszegző számolást használ.</p>
            <p>Akkor érhetünk el jobb eredményt, ha minden kérdés/állítás igaz. Tehát minnél több kérdés van megválaszolva, az értékelés annál jobb lesz.</p>
        `;
    }

    return `
        <h4>Pontszámítás <span>A teszteléshez kattintson a kérdések melleti pipákra.</span></h4>
        <p>A kérdőívrendszer jelenleg arányosított számolást használ.</p>
        <p>A lenti példában a 10 pontos kérdés lesz a 100%, az 5 pontos 50%, az 1 pontos 10%. A legtöbbet érő válasz hozza a legjobb eredményt. A további (kevesebb értékű) válaszok csökkenteni fogják a százalékos értéket.</p>
    `;
}

function frissitDemoDiagram(szamolas) {
    const canvas = document.getElementById('modulSzamolasDemoChart');
    const eredmenyElem = document.getElementById('modulSzamolasDemoEredmeny');
    if (!canvas) return;

    const eredmeny = szamoljFokerdesAdatokModSzerint(
        demoParentKerdes,
        demoKerdesek,
        getDemoValaszok(),
        szamolas
    ) || { szazalek: 0, elertPont: 0, maxPont: normalizalSzamolasMod(szamolas) === 1 ? 16 : 100 };

    if (eredmenyElem) {
        if (normalizalSzamolasMod(szamolas) === 1) {
            eredmenyElem.textContent = `${eredmeny.elertPont ?? 0} / ${eredmeny.maxPont ?? 16} pont = ${eredmeny.szazalek}%`;
        } else {
            eredmenyElem.textContent = `Arányosított eredmény: ${eredmeny.szazalek}%`;
        }
    }

    const chartDoboz =
        document.getElementById('modulSzamolasDemoChartDoboz') ||
        document.getElementById('modulSzamolasDemoChartWrap') ||
        canvas.parentElement;

    if (chartDoboz) {
        chartDoboz.style.display = 'block';
        chartDoboz.style.position = 'relative';
        chartDoboz.style.minHeight = '240px';
        chartDoboz.style.height = '240px';
        chartDoboz.style.width = '100%';
    }

    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '220px';

    if (typeof Chart === 'undefined') {
        console.warn('A Chart.js nincs betöltve ezen az oldalon, ezért a modul-számolás demo diagram nem rajzolható ki.');
        return;
    }

    const ctx = canvas.getContext('2d');
    letrehozFoKategoriaChart(
        ctx,
        ['Példa eredmény'],
        [eredmeny.szazalek],
        { 'Példa eredmény': 'rgba(255, 189, 22, 0.65)' }
    );
}

function frissitModulSzamolasNezet(szamolas) {
    const cleanSzamolas = normalizalSzamolasMod(szamolas);
    const slider = document.getElementById('modulSzamolasRange');
    const leiras = document.getElementById('modulSzamolasLeiras');
    const allapot = document.getElementById('modulSzamolasAllapot');

    setKapcsoloSzamolasErtek(slider, cleanSzamolas);
    if (leiras) leiras.innerHTML = getLeiras(cleanSzamolas);

    if (allapot) {
        allapot.textContent = cleanSzamolas === 1 ? 'Pontösszegző' : 'Arányosított';
        allapot.dataset.szamolas = String(cleanSzamolas);
    }

    frissitDemoCsuszkaAllapotok();
    frissitDemoDiagram(cleanSzamolas);
}

async function betoltModulSzamolas() {
    const response = await apiFetch('/api/modul-szamolas', {
        headers: { Accept: 'application/json' }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'A számolási mód betöltése sikertelen.');
    }

    frissitModulSzamolasNezet(data.szamolas);
}

async function mentModulSzamolas(szamolas) {
    const response = await apiFetch('/api/modul-szamolas', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify({ szamolas })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'A számolási mód mentése sikertelen.');
    }

    frissitModulSzamolasNezet(data.szamolas);
}

export function initModulSzamolasKartya() {
    const slider = document.getElementById('modulSzamolasRange');
    const demoKerdesek = document.getElementById('modulSzamolasDemoKerdesek');

    if (!slider || slider.dataset.modulSzamolasBound === '1') return;

    slider.dataset.modulSzamolasBound = '1';

    slider.addEventListener('input', () => {
        frissitModulSzamolasNezet(getKapcsoloSzamolasErtek(slider));
    });

    slider.addEventListener('change', async () => {
        const allapot = document.getElementById('modulSzamolasAllapot');
        const szamolas = getKapcsoloSzamolasErtek(slider);

        try {
            frissitModulSzamolasNezet(szamolas);
            if (allapot) allapot.textContent = 'Mentés...';
            await mentModulSzamolas(szamolas);
        } catch (err) {
            console.error(err);
            if (allapot) allapot.textContent = 'Mentési hiba';
        }
    });

    initDemoCsuszkaCss();
    alaphelyzetbeAllitDemoKerdesek();

    demoKerdesek?.addEventListener('change', () => {
        frissitDemoCsuszkaAllapotok();
        frissitDemoDiagram(getKapcsoloSzamolasErtek(slider));
    });

    frissitDemoCsuszkaAllapotok();

    betoltModulSzamolas().catch(err => {
        console.error(err);
        frissitModulSzamolasNezet(0);

        const allapot = document.getElementById('modulSzamolasAllapot');
        if (allapot) allapot.textContent = 'Nem tölthető be';
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModulSzamolasKartya);
} else {
    initModulSzamolasKartya();
}

const modulSzamolasObserver = new MutationObserver(() => {
    initModulSzamolasKartya();
});

modulSzamolasObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
});
