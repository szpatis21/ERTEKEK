//SZázalékszámítás és Kördiagramm

let alkategoriaChartInstance = null;
import { rgbToHsl, hslToRgb, darkenRgbColor } from './main_alap.js';

// helper: mindig a window-ból olvasunk, ha már készen áll
function getKategoriakChartSzinek() {
  return (window && window.kategoriakChartSzinek) ? window.kategoriakChartSzinek : {};
}
//PONTSZÁÍTÁS 
export function szamoljFokerdesOsszErtek(parentKerdes, kerdesekTomb, kerdesValaszok) {
  const valasz = kerdesValaszok[parentKerdes.id];
  if (!valasz || valasz === 'ures') return null;

  const igenAg = parentKerdes.igenAg || [];
  const nemAg  = parentKerdes.nemAg  || [];
  const aktivAg = valasz === 'igen' ? igenAg : valasz === 'nem' ? nemAg : [];

  // Max-szint kiválasztva -> 100%
  const hasMaxSzint = aktivAg.some(alkId => {
    const alk = kerdesekTomb.find(k => k.id === alkId);
    return alk?.maximalis_szint == 1 && kerdesValaszok[alkId] === 'igen';
  });
  if (hasMaxSzint) return 100;

  // Ha van gyerek az aktív ágon, de egy sincs kijelölve -> 0%
  const hasChildrenOnAktiv = aktivAg.length > 0;
  const anySelectedOnAktiv = aktivAg
    .map(id => kerdesekTomb.find(k => k.id === id))
    .filter(Boolean)
    .some(k => kerdesValaszok[k.id] === 'igen');
  if (hasChildrenOnAktiv && !anySelectedOnAktiv) return 0;

  // IGEN ág: ha vannak kijelölt alkérdések, azok ossz_ertek átlaga
  if (valasz === 'igen') {
    const vals = aktivAg
      .map(id => kerdesekTomb.find(k => k.id === id))
      .filter(k => k && kerdesValaszok[k.id] === 'igen')
      .map(k => Number(k.ossz_ertek))
      .filter(v => Number.isFinite(v));
    if (vals.length) {
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }

    // Nincs IGEN-alkérdés kiválasztva -> főkérdés ertek aránya (altémán belüli maxhoz)
    const e = Number(parentKerdes.ertek) || 0;
    const fokerdesErtekek = kerdesekTomb
      .filter(k => !k.parentId && k.alKategoria === parentKerdes.alKategoria)
      .map(k => Number(k.ertek) || 0);
    const maxE = fokerdesErtekek.length > 1 ? Math.max(...fokerdesErtekek) : (e || 1);
    return Math.round((e / maxE) * 100);
  }

  // NEM ág: referencia = IGEN max(alkérdés.ertek), ha nincs ilyen -> főkérdés ertek
  if (valasz === 'nem') {
    const igenMax = Math.max(
      0,
      ...igenAg
        .map(id => kerdesekTomb.find(k => k.id === id))
        .filter(Boolean)
        .map(k => Number(k.ertek) || 0)
    );
    const ref = (igenAg.length > 0 ? igenMax : (Number(parentKerdes.ertek) || 0));
    if (!(ref > 0)) return 0;

    const selectedNemVals = nemAg
      .map(id => kerdesekTomb.find(k => k.id === id))
      .filter(k => k && kerdesValaszok[k.id] === 'igen')
      .map(k => (Number(k.ertek) || 0) / ref * 100);

    if (selectedNemVals.length) {
      return Math.round(selectedNemVals.reduce((a, b) => a + b, 0) / selectedNemVals.length);
    }

    // Nincs kijelölt NEM-alkérdés -> negalt_ertek aránya
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
// CHART

export function letrehozFoKategoriaChart(ctx, chartLabels, chartData, kategoriakChartSzinek) {
    console.log("📊 ChartLabels:", chartLabels);
console.log("🎨 ChartSzinek:", kategoriakChartSzinek);
  const normalize = str =>
    str.normalize("NFD")
       .replace(/[\u0300-\u036f]/g, '')
       .replace(/ő/g, 'o').replace(/ű/g, 'u')
       .replace(/Ő/g, 'O').replace(/Ű/g, 'U')
       .trim();

  const map = kategoriakChartSzinek && Object.keys(kategoriakChartSzinek).length
    ? kategoriakChartSzinek
    : getKategoriakChartSzinek(); // fallback a globálisra

  const normalizedSzinek = Object.fromEntries(
    Object.entries(map).map(([key, val]) => [normalize(key), val])
  );

  const chartColors = chartLabels.map(label => {
    const cleanLabel = normalize(label);
    return normalizedSzinek[cleanLabel] || 'rgba(88, 0, 0, 0.5)';
  });

    return new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderColor: '#fff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeOutQuad'
            },
            onHover: (event, chartElement) => {
                const chart = event.chart;
                if (chartElement.length > 0) {
                    const hoveredIndex = chartElement[0].index;
                    const dataset = chart.data.datasets[0];
                    dataset.hoverOffset = dataset.data.map((_, i) => i === hoveredIndex ? 30 : 10);
                    chart.update(); // 🔥 Itt történik az animált frissítés
                }
            },
            onLeave: (event) => {
                const chart = event.chart;
                const dataset = chart.data.datasets[0];
                dataset.hoverOffset = dataset.data.map(() => 10);
                chart.update(); // 🔥 Animált visszaállás
            },
            layout: {
                padding: 5
            },
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                     ticks: {
                        display: true, // 💡 Számozás megjelenítése a belső körökön
                        color: 'black',
                        font: {
                            size: 10,
                            family: 'Times New Roman, Times, serif',
                            weight: 'normal'
                        }
                    },
                    pointLabels: {
                        display: false,
                        centerPointLabels: true,
                        color: 'black',
                        font: {
                            size: 8,
                            family: 'auto',
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 174, 0, 0.3)'
                    },
                    angleLines: {
                        display: true,
                        color: 'rgba(255, 174, 0, 0.3)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true, // 🔥 Legenda bekapcsolva
                    position: 'bottom', // 'top', 'bottom', 'left', 'right' – választhatsz
                    labels: {
                        font: {
                            family: 'Times New Roman, Times, serif',
                            size: 10,
                            weight: 'bold',
                        },
                        boxWidth: 10, // Kis színes négyzet mérete
                        padding: 2 // Távolság a szövegek között
                        }
                },
                tooltip: {
                    displayColors: false,
                    bodyFont: {
                        weight: 'normal' // Nem lesz félkövér
                    },        bodyFont: {
                        weight: 'normal',
                        size: 12
                    },
                    footerFont: {           // <<< EZ A LÉNYEG
                        weight: 'normal',
                        size: 12
                    },
                    callbacks: {
                        title: () => [], // Ne legyen külön title
                        label: function (context) {
                            const foKategoriaNev = context.label;
                            const foSzazalek = context.raw;
                            return `${foKategoriaNev} ${foSzazalek}%`; // Csak a főkategória neve és értéke
                        },
                       
                        footer: function (context) {
                            const foKategoriaNev = context[0].label;
                        
                            const alkatDivok = [...document.querySelectorAll(`#keszulo .fo-kategoria h3`)]
                            .filter(h3 => h3.textContent.trim().startsWith(foKategoriaNev))
                            .flatMap(h3 => {
                                const table = h3.parentElement.querySelector('table');
                                if (!table) return [];
                                return [...table.querySelectorAll('.pontF')]; // KÖZVETLENÜL a pontF osztály!
                            });
                        
                            const lines = ['']; // Üres sor a főkategória után
                            const feldolgozottNevek = new Set();
                        
                            alkatDivok.forEach(div => {
                                const alkatNev = div.closest('.al-kategoria')?.childNodes[0]?.textContent.trim() || 'Ismeretlen';
                                const szazalek = div.textContent.match(/\((\d+)%\)/)?.[1] || 'nincs adat';
                            
                                const kulcs = `${alkatNev}-${szazalek}`;
                                if (!feldolgozottNevek.has(kulcs)) {
                                    lines.push(`- ${alkatNev}: ${szazalek}%`);
                                    feldolgozottNevek.add(kulcs);
                                    
                                }
                            });
                            
                        
                            return lines;
                        }                      
                  }
                }             
            }
        }
    });
}
export function letrehozAlkategoriaChart(labels, data) {
    const map = getKategoriakChartSzinek();

if (!map || Object.keys(map).length === 0) {
  console.warn('⏳ Színtérkép még nincs betöltve, újrapróbálkozás 500ms múlva...');
  setTimeout(() => letrehozAlkategoriaChart(labels, data), 500);
  return;
}

    const ctx = document.getElementById('alkategoriaChart').getContext('2d');

    if (alkategoriaChartInstance) {
        alkategoriaChartInstance.destroy();
    }

    const foKategoriaNev = window.aktivFoKategoriaNev || 'Alapértelmezett';

    // Szín kinyerése a kategoriakChartSzinek-ből (rgb vagy rgba)
const normalize = str =>
  str.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, '')
     .replace(/ő/g, 'o').replace(/ű/g, 'u')
     .replace(/Ő/g, 'O').replace(/Ű/g, 'U')
     .trim();

const normalizedMap = Object.fromEntries(
  Object.entries(map).map(([key, val]) => [normalize(key), val])
);

const baseColor = normalizedMap[normalize(foKategoriaNev)] || 'rgb(200,200,200)';

console.log('Aktív név:', window.aktivFoKategoriaNev);
console.log('Normalizált:', normalize(window.aktivFoKategoriaNev));
console.log('Elérhető színek:', Object.keys(normalizedMap));
console.log('Talált szín:', normalizedMap[normalize(window.aktivFoKategoriaNev)]);

const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const [r, g, b] = match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [200, 200, 200];
    const [h, s, l] = rgbToHsl(r, g, b);

    const backgroundColors = labels.map((_, index) => {
        const lightnessStep = 0.3 / labels.length;
        const newL = Math.min(1, l + index * lightnessStep);
        const [newR, newG, newB] = hslToRgb(h, s, newL);
        return `rgba(${newR}, ${newG}, ${newB}, 0.7)`;
    });

    alkategoriaChartInstance = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#fff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    ticks: {
                        display: true,
                        color: 'black',
                        font: {
                            size: 10,
                            family: 'Times New Roman, Times, serif',
                            weight: 'normal'
                        }
                    },
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    pointLabels: {
                        display: false,
                        padding: 5,
                        color: 'black',
                        font: {
                            size: 10,
                            family: 'Times New Roman, Times, serif',
                            weight: 'normal'
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    angleLines: {
                        display: true,
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    displayColors: false,
                    bodyFont: {
                        weight: 'normal',
                        size: 12
                    },
                    footerFont: {
                        weight: 'normal',
                        size: 12
                    },
                    callbacks: {
                        title: () => [],
                        label: function (context) {
                            const label = context.label;
                            const value = context.raw;
                            return `${label}: ${value}%`;
                        },
                       // ...tooltip.callbacks.footer: teljesen cseréld le erre 👇
footer(context) {
  const alkategoriaNev = context[0].label;          // Hoverelt alkategória
  const aktFoNev       = window.aktivFoKategoriaNev; // Kijelölt főkategória

  // 1️⃣ csak annak a .fo-kategoria blokknak a belsejében keresünk,
  //    amelynek <h3>-ja az aktFoNev-vel kezdődik
  const foDiv = [...document.querySelectorAll('#keszulo .fo-kategoria')]
      .find(div => div.querySelector('h3')
                      ?.textContent.trim()
                      .startsWith(aktFoNev));

  if (!foDiv) return ['Nincs adat'];

  // 2️⃣ ezen BELÜL keressük az alkategória sort, így nem téved át más blokkba
  const alkatTr = [...foDiv.querySelectorAll('tr.al-kategoria')]
      .find(tr => tr.querySelector('td.al-kategoria')
                    ?.childNodes[0]
                    ?.textContent.trim() === alkategoriaNev);

  if (!alkatTr) return ['Nincs adat'];

  // 3️⃣ gyűjtjük a közvetlenül következő alt-téma sorokat
  const altTemaLines = [];
  let next = alkatTr.nextElementSibling;
  while (next && next.classList.contains('alt-tema')) {
    const td        = next.querySelector('td.alt-tema');
    const altNev    = td?.childNodes[0]?.textContent.trim().replace(/:$/,'') || 'Ismeretlen';
    const szazalek  = td?.querySelector('.pontC')
                         ?.textContent.match(/\((\d+)%\)/)?.[1] || 'nincs adat';
    altTemaLines.push(`- ${altNev}: ${szazalek}%`);
    next = next.nextElementSibling;
  }
  return altTemaLines.length ? [''].concat(altTemaLines) : ['Nincs alt-téma adat'];
}

                    }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Times New Roman, Times, serif',
                            size: 10,
                            weight: 'bold'
                        },
                        boxWidth: 10,
                        padding: 2
                    }
                }
            }
        }
    });

    document.getElementById('alkategoriaChartContainer').style.display = 'block';
}
// Altéma diagram
let altTemaChartInstance = null;

export function letrehozAltTemaChart(labels, data,foKategoriaNev) {
    
    const ctx = document.getElementById('altTemaChart').getContext('2d');

    if (altTemaChartInstance) {
        altTemaChartInstance.destroy();
    }
const map = getKategoriakChartSzinek();
const baseRgb  = map[foKategoriaNev] || "rgb(180,180,180)";
    altTemaChartInstance = new Chart(ctx, {
        type: 'polarArea', // vagy bar, ha inkább oszlopdiagram kell
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: baseRgb,

                borderColor: '#fff',
                borderWidth: 1
            }]
        },
       options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                font: {
                    family: 'Times New Roman, Times, serif',
                    size: 10,
                    weight: 'bold'
                },
                boxWidth: 10,
                padding: 2
            }
        },
        tooltip: {
            displayColors: false,
            callbacks: {
                label: function (context) {
                    const cimke = context.label || 'Ismeretlen';
                    const ertek = Math.round(context.raw);
                    return ` ${ertek} %`;
                }
            }
        }
    },
    scales: {
        r: {
            ticks: {
                display: true,
                color: 'black',
                font: {
                    size: 10,
                    family: 'Times New Roman, Times, serif',
                    weight: 'normal'
                }
            },
            beginAtZero: true,
            min: 0,
            max: 100,
            pointLabels: {
                display: false,
                padding: 5,
                color: 'black',
                font: {
                    size: 10,
                    family: 'Times New Roman, Times, serif',
                    weight: 'normal'
                }
            },
            grid: {
                color: 'rgba(0,0,0,0.1)'
            },
            angleLines: {
                display: true,
                color: 'rgba(0,0,0,0.1)'
            }
        }
    }
}

    });

    document.getElementById('altTemaChartContainer').style.display = 'block';
}

