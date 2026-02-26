// SZázalékszámítás és Kördiagramm

import { rgbToHsl, hslToRgb } from './main_alap.js';

// --- GLOBÁLIS ÁLLAPOTOK ---
let aktualisDiagramTipus = 'polarArea'; // Alapértelmezett: Polar
let utolsoAlkategoriaParams = null;     // Memória az alkategória újrarajzolásához
let utolsoAltTemaParams = null;         // Memória az altéma újrarajzolásához

// Diagram típus beállítása
export function setDiagramTipus(tipus) {
    if (tipus === 'line') {
        aktualisDiagramTipus = 'doughnut';
    } else {
        aktualisDiagramTipus = tipus;
    }
}

// Al-diagramok frissítése
export function frissitsdAzAlDiagramokat() {
    if (utolsoAlkategoriaParams) {
        letrehozAlkategoriaChart(...utolsoAlkategoriaParams);
    }
    if (utolsoAltTemaParams) {
        letrehozAltTemaChart(...utolsoAltTemaParams);
    }
}

// --- EGYEDI JELMAGYARÁZAT GENERÁLÓ ---
// Ez biztosítja, hogy Bar és Radar diagramnál is a kategóriák nevei legyenek lent, színes gombócokkal
function customGenerateLabels(chart) {
    const data = chart.data;
    if (data.labels.length && data.datasets.length) {
        return data.labels.map((label, i) => {
            const ds = data.datasets[0];
            const bgColor = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : ds.backgroundColor;
            return {
                text: label,
                fillStyle: bgColor,
                strokeStyle: '#fff',
                lineWidth: 1,
                hidden: isNaN(ds.data[i]) || ds.data[i] === null,
                index: i
            };
        });
    }
    return [];
}

// --- HELPER: Beállítások generálása típus alapján ---
function getChartOptions(tipus) {
    const isRadial = tipus === 'polarArea' || tipus === 'radar';
    const isCircular = tipus === 'doughnut' || tipus === 'pie';
    
    const fontConfig = { size: 9, family: 'system-ui' };

    const options = {
        devicePixelRatio: 4,
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 2 },
        animation: {
            duration: 2000, // Lassabb animáció, hogy jobban látszódjon a növekedés/csökkenés
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    font: fontConfig,
                    boxWidth: 8,
                    padding: 2,
                    usePointStyle: true,
                    // ITT A TRÜKK: Minden típusnál kényszerítjük, hogy a kategóriákat sorolja fel
                    generateLabels: customGenerateLabels 
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.label}: ${Math.round(context.raw)}%`;
                    }
                }
            }
        },
        scales: {} 
    };

    if (isRadial) {
        options.scales = {
            r: {
                beginAtZero: true, min: 0, max: 100,
                ticks: { display: true, backdropColor: 'transparent', z: 10 },
                // Kérésre: NE jelenjen meg a tengelyen a név (mert lent lesz a legendben)
                pointLabels: { display: false }, 
                grid: { color: 'rgba(0,0,0,0.1)' }
            }
        };
    } else if (isCircular) {
        delete options.scales;
        options.cutout = '60%'; 
    } else {
        // Bar chart
        options.scales = {
            y: {
                beginAtZero: true, min: 0, max: 100,
                title: { display: true, text: '%' },
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
                // Kérésre: NE jelenjen meg az oszlop alatt a név (mert lent lesz a legendben)
                ticks: { display: false }, 
                grid: { display: false }
            }
        };
    }

    return options;
}

// Szín helper
function getKategoriakChartSzinek() {
    return (window && window.kategoriakChartSzinek) ? window.kategoriakChartSzinek : {};
}

// --- SZÁMÍTÁSI LOGIKA ---
export function szamoljFokerdesOsszErtek(parentKerdes, kerdesekTomb, kerdesValaszok) {
    const valasz = kerdesValaszok[parentKerdes.id];
    if (!valasz || valasz === 'ures') return null;

    const igenAg = parentKerdes.igenAg || [];
    const nemAg = parentKerdes.nemAg || [];
    const aktivAg = valasz === 'igen' ? igenAg : valasz === 'nem' ? nemAg : [];

    const hasMaxSzint = aktivAg.some(alkId => {
        const alk = kerdesekTomb.find(k => k.id === alkId);
        return alk?.maximalis_szint == 1 && kerdesValaszok[alkId] === 'igen';
    });
    if (hasMaxSzint) return 100;

    const hasChildrenOnAktiv = aktivAg.length > 0;
    const anySelectedOnAktiv = aktivAg
        .map(id => kerdesekTomb.find(k => k.id === id))
        .filter(Boolean)
        .some(k => kerdesValaszok[k.id] === 'igen');
    if (hasChildrenOnAktiv && !anySelectedOnAktiv) return 0;

    if (valasz === 'igen') {
        const vals = aktivAg
            .map(id => kerdesekTomb.find(k => k.id === id))
            .filter(k => k && kerdesValaszok[k.id] === 'igen')
            .map(k => Number(k.ossz_ertek))
            .filter(v => Number.isFinite(v));
        if (vals.length) {
            return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
        const e = Number(parentKerdes.ertek) || 0;
        const fokerdesErtekek = kerdesekTomb
            .filter(k => !k.parentId && k.alKategoria === parentKerdes.alKategoria)
            .map(k => Number(k.ertek) || 0);
        const maxE = fokerdesErtekek.length > 1 ? Math.max(...fokerdesErtekek) : (e || 1);
        return Math.round((e / maxE) * 100);
    }

    if (valasz === 'nem') {
        const igenMax = Math.max(0, ...igenAg.map(id => kerdesekTomb.find(k => k.id === id)).filter(Boolean).map(k => Number(k.ertek) || 0));
        const ref = (igenAg.length > 0 ? igenMax : (Number(parentKerdes.ertek) || 0));
        if (!(ref > 0)) return 0;

        const selectedNemVals = nemAg
            .map(id => kerdesekTomb.find(k => k.id === id))
            .filter(k => k && kerdesValaszok[k.id] === 'igen')
            .map(k => (Number(k.ertek) || 0) / ref * 100);

        if (selectedNemVals.length) {
            return Math.round(selectedNemVals.reduce((a, b) => a + b, 0) / selectedNemVals.length);
        }
        const ne = Number(parentKerdes.negalt_ertek) || 0;
        return Math.round((ne / ref) * 100);
    }
    return 0;
}

export function kiszamoltFoKategoriaDiagramAdatok() {
    const chartLabels = [];
    const chartData = [];
    document.querySelectorAll('[data-fo-szazalek]').forEach(elem => {
        const ertek = parseFloat(elem.getAttribute('data-fo-szazalek'));
        const foNevElem = elem.closest('.fo-kategoria').querySelector('h3');
        const nev = foNevElem ? foNevElem.childNodes[0].textContent.trim() : 'Ismeretlen';
        if (!isNaN(ertek)) {
            chartLabels.push(nev);
            chartData.push(ertek);
        }
    });
    return { chartLabels, chartData };
}

// --- CHART KÉSZÍTŐ HELPER (ANIMÁCIÓ VÉGETT) ---
// Ez a függvény dönti el, hogy frissíteni kell-e a meglévőt (animáció), 
// vagy újat létrehozni (típusváltás).
function createOrUpdateChart(canvasId, containerId, labels, data, colors, labelName) {
    const container = document.getElementById(containerId);
    if (container) container.style.display = 'block';

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const existingChart = Chart.getChart(canvas);
    
    // Ha már létezik a chart ÉS a típusa megegyezik -> FRISSÍTÉS (Animált)
    if (existingChart && existingChart.config.type === aktualisDiagramTipus) {
        existingChart.data.labels = labels;
        existingChart.data.datasets[0].data = data;
        existingChart.data.datasets[0].backgroundColor = colors;
        existingChart.options = getChartOptions(aktualisDiagramTipus); // Opciók frissítése (pl. legend)
        existingChart.update(); // Ez indítja a "transzformációs" animációt
    } else {
        // Ha nem létezik vagy típusváltás történt -> ÚJRAHÚZÁS (Belépő animáció)
        if (existingChart) existingChart.destroy();
        
        new Chart(ctx, {
            type: aktualisDiagramTipus,
            data: {
                labels: labels,
                datasets: [{
                    label: labelName,
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: getChartOptions(aktualisDiagramTipus)
        });
    }
}

// --- DIAGRAM LÉTREHOZÓK ---

// 1. Főkategória Chart
export function letrehozFoKategoriaChart(ctx, chartLabels, chartData, kategoriakChartSzinek) {
    const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, '').trim();

    const map = kategoriakChartSzinek && Object.keys(kategoriakChartSzinek).length
        ? kategoriakChartSzinek
        : getKategoriakChartSzinek();

    const normalizedSzinek = Object.fromEntries(
        Object.entries(map).map(([key, val]) => [normalize(key), val])
    );

    const chartColors = chartLabels.map(label => {
        const cleanLabel = normalize(label);
        return normalizedSzinek[cleanLabel] || 'rgba(128, 128, 128, 0.5)';
    });

    // Főkategóriánál (mivel a canvas contextet kapjuk paraméterben, nem ID-t),
    // itt manuálisabban kezeljük a destroy-t, de a logika ugyanaz lehetne.
    // A hívó kód (main.js) általában "újrarajzolja" az egészet, de itt is alkalmazhatjuk a logikát:
    
    const existingChart = Chart.getChart(ctx.canvas);
    if (existingChart && existingChart.config.type === aktualisDiagramTipus) {
        existingChart.data.labels = chartLabels;
        existingChart.data.datasets[0].data = chartData;
        existingChart.data.datasets[0].backgroundColor = chartColors;
        existingChart.options = getChartOptions(aktualisDiagramTipus);
        existingChart.update();
    } else {
        if (existingChart) existingChart.destroy();
        new Chart(ctx, {
            type: aktualisDiagramTipus,
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Teljesítmény',
                    data: chartData,
                    backgroundColor: chartColors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: getChartOptions(aktualisDiagramTipus)
        });
    }
}

// 2. Alkategória Chart
export function letrehozAlkategoriaChart(labels, data) {
    const map = getKategoriakChartSzinek();
    if (!map || Object.keys(map).length === 0) {
        setTimeout(() => letrehozAlkategoriaChart(labels, data), 500);
        return;
    }
    utolsoAlkategoriaParams = [labels, data];

    const foKategoriaNev = window.aktivFoKategoriaNev || 'Alapértelmezett';
    const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/ő/g, 'o').replace(/ű/g, 'u').trim();
    
    const normalizedMap = Object.fromEntries(Object.entries(map).map(([key, val]) => [normalize(key), val]));
    const baseColor = normalizedMap[normalize(foKategoriaNev)] || 'rgb(200,200,200)';
    
    let r = 200, g = 200, b = 200;
    const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    
    const [h, s, l] = rgbToHsl(r, g, b);

    const backgroundColors = labels.map((_, index) => {
        const lightnessStep = 0.4 / (labels.length || 1); 
        const newL = Math.max(0.1, Math.min(0.9, l + (index * lightnessStep) - 0.2)); 
        const [newR, newG, newB] = hslToRgb(h, s, newL);
        return `rgba(${newR}, ${newG}, ${newB}, 0.8)`;
    });

    createOrUpdateChart(
        'alkategoriaChart', 
        'alkategoriaChartContainer', 
        labels, 
        data, 
        backgroundColors, 
        'Alkategória'
    );
}

// 3. Altéma Chart
export function letrehozAltTemaChart(labels, data, foKategoriaNev) {
    utolsoAltTemaParams = [labels, data, foKategoriaNev];
    const map = getKategoriakChartSzinek();
    const baseRgb = map[foKategoriaNev] || "rgba(180,180,180, 0.8)";

    // Itt egyszínű minden oszlop (baseRgb), de ha listát vár a legend generátor,
    // akkor csinálunk belőle tömböt:
    const colors = labels.map(() => baseRgb);

    createOrUpdateChart(
        'altTemaChart',
        'altTemaChartContainer',
        labels,
        data,
        colors,
        'Altéma'
    );
}