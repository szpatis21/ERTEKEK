import { kerdesValaszok, szovegesValaszok, hideLoading, showLoading, megtekintesMod, modulId } from './main_alap.js';
import { Kerdes } from './main_category.js';
import { Focus} from './main_quest_focus.js';
import { pontokLathatok } from './main_graph.js';
import { szamoljFokerdesOsszErtek,letrehozFoKategoriaChart,kiszamoltFoKategoriaDiagramAdatok,letrehozAlkategoriaChart,letrehozAltTemaChart } from './szamitasok.js';
import { modulIdBetoltve } from './main_alap.js';

// JSON-ból töltött lookupok (modulId szerint)
let kategoriakSzinek = {};
let kategoriakChartSzinek = {};
let leirasok = {};

function normalizeChartColor(c) {
  if (!c) return '#666666';
  // Sok rekordod "rgb(r,g,b, a)" formát használ – ez CSS-ben érvénytelen. Javítjuk rgba-ra.
  return c.replace(/^rgb\s*\(/i, (m) => (c.includes(',') && c.split(',').length === 4 ? 'rgba(' : m));
}

async function initTemaLookups() {
  // modulId: vagy használd az importált modulId-t, vagy: const modulId = await modulIdBetoltve;
  const resp = await fetch('/private/info/temakorok.json');
  if (!resp.ok) throw new Error(`temakorok.json HTTP ${resp.status}`);
  const all = await resp.json();
  const set = all.optionSets?.[String(modulId)] ?? []; // kizárólag az adott modul készlete
  // csak értelmes value-val rendelkező sorok
  const rows = set.filter(o => typeof o.value === 'string' && o.value.trim() !== '');

  kategoriakSzinek = {};
  kategoriakChartSzinek = {};
  leirasok = {};

  for (const o of rows) {
    leirasok[o.value] = o.leiras ?? '';
    kategoriakSzinek[o.value] = o.szin ?? '';               // pl. linear-gradient(...)
    kategoriakChartSzinek[o.value] = normalizeChartColor(o.chart ?? '#666666'); // pl. rgba(...)
  }
}

let alKerdesMap = {}; // Cache az alkérdésekhez
let alKerdesBatchPromise = null;
window.aktivFoKategoriaNev = null;

 export function ujratoltParentAgak() {
    const kerdesek = KategoriaKezelo.kerdesek;
    kerdesek.forEach(kerdes => {
        if (!kerdes.parentId) {
            const alkerdesek = kerdesek.filter(k => k.parentId === kerdes.id);
            kerdes.igenAg = alkerdesek.filter(k => (k.valaszAg || '').toLowerCase() === 'igen').map(k => k.id);
            kerdes.nemAg = alkerdesek.filter(k => (k.valaszAg || '').toLowerCase() === 'nem').map(k => k.id);

        }
    });
}

class Kategoria {
    constructor(id, nev) {
        this.id = id;
        this.nev = nev;
    }
    render(tartaly) { 
        const div = document.createElement('div');
        div.textContent = this.nev;
        div.setAttribute('data-id', this.id);
        div.classList.add('category');
        tartaly.appendChild(div);
        
        return div;
    }
}
export class KategoriaKezelo {
    static get kerdesek() {
        if (!this._kerdesek) {
            this._kerdesek = []; 
        }
        return this._kerdesek;
    }
    //Ideiglenes (logolja mik kerülnek bele a KerdesValaszok tömb belsejébe (Éles használatban ne felejtsem el kikommentelni))
    static logKerdesValaszok() {
        console.log('Kérdések jelenlegi állapota:');
        for (const [key, value] of Object.entries(kerdesValaszok)) {
            console.log(`Kérdés ID: ${key}, Állapot: ${value}`);
        }
    }
    // AZ értékelés váza, elhelyezése, és felépítésének kezelése
    static frissitErtekelesekContainer() {
        const container = document.getElementById('ertekelesek-container');
        container.innerHTML = ''; // Tartalom törlése
        const foKategoriak = {};

        // 1) IGEN/NEM típusú kérdések (kerdesValaszok) beolvasása
        for (const [key, value] of Object.entries(kerdesValaszok)) {
            const kerdes = KategoriaKezelo.kerdesek.find(k => k.id === parseInt(key));
            if (!kerdes) continue;  // Ha nem található kérdés, lépünk tovább
    
            const foKategoriaNev = kerdes.foKategoria;
            const alKategoriaNev = kerdes.alKategoria;
            const altTemaNev     = kerdes.altTema;
    
            // Létrehozzuk a szükséges objektum-struktúrát, ha nem létezik
            if (!foKategoriak[foKategoriaNev]) {
                foKategoriak[foKategoriaNev] = {};
            }
            if (!foKategoriak[foKategoriaNev][alKategoriaNev]) {
                foKategoriak[foKategoriaNev][alKategoriaNev] = {};
            }
            if (!foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev]) {
                foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev] = {};
            }
            if (!foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.parentId || kerdes.id]) {
                foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.parentId || kerdes.id] = {
                    kerdesek: [],
                    alkerdesek: []
                };
            }
    
            // Igen/Nem kijelölt kérdés szövegének összerakása
            let text = '';
            let negalt_ertek = 0; // Kezdetben nincs negált érték
            
            if (value === 'igen') {
                // Főkérdés
                text = kerdes.szoveg; 
                negalt_ertek = 0; // Ha nincs, akkor null
            } else if (value === 'nem' && kerdes.negaltKerdesSzoveg) {
                // Negált kérdés
                text = kerdes.negaltKerdesSzoveg;
                negalt_ertek = kerdes.negalt_ertek; // Ha "nem" állapotban van, akkor ezt mentjük
            }
            
            if (text) {
                // Eldöntjük, hogy főkérdés vagy alkérdés
                if (kerdes.parentId) {
                    // Alkérdés
                    foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.parentId]
                    .alkerdesek.push([text, kerdes.ertek, kerdes.id, kerdes.maximalis_szint]);
                } else {
                    // Főkérdés
                    foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.id]
                      .kerdesek.push([text, kerdes.ertek, kerdes.id, negalt_ertek, kerdes.maximalis_szint]); // Negált értéket is mentjük
                }
            }
        }
      // 2) Szöveges válaszok (szovegesValaszok) beolvasása
  // 2) Szöveges válaszok (szovegesValaszok) beolvasása
        for (const [key, value] of Object.entries(szovegesValaszok)) {
            const trimmedVal = value.trim();
            if (!trimmedVal) continue;

            const kerdesId = parseInt(key, 10);
            if (isNaN(kerdesId)) continue;

            const kerdes = KategoriaKezelo.kerdesek.find(k => k.id === kerdesId);
            if (!kerdes) continue;

            const foKategoriaNev = kerdes.foKategoria;
            const alKategoriaNev = kerdes.alKategoria;
            const altTemaNev = kerdes.altTema;

            // Struktúra biztosítása
            if (!foKategoriak[foKategoriaNev]) foKategoriak[foKategoriaNev] = {};
            if (!foKategoriak[foKategoriaNev][alKategoriaNev]) foKategoriak[foKategoriaNev][alKategoriaNev] = {};
            if (!foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev]) foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev] = {};
            
            const parentKey = kerdes.parentId || kerdes.id;
            if (!foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][parentKey]) {
                foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][parentKey] = {
                    kerdesek: [],
                    alkerdesek: []
                };
            }

            const aktualisCsoport = foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][parentKey];

            if (kerdes.parentId) {
                // --- ALKÉRDÉS KEZELÉSE 
                const letezoAlkerdesIndex = aktualisCsoport.alkerdesek.findIndex(item => item[2] === kerdes.id);

                if (letezoAlkerdesIndex > -1) {
                    aktualisCsoport.alkerdesek[letezoAlkerdesIndex][0] = trimmedVal;
                } else {
                    aktualisCsoport.alkerdesek.push([trimmedVal, kerdes.ertek, kerdes.id, kerdes.maximalis_szint]);
                }

            } else {
                // --- FŐKÉRDÉS KEZELÉSE ---
                const letezoKerdesIndex = aktualisCsoport.kerdesek.findIndex(item => item[2] === kerdes.id);

                if (letezoKerdesIndex > -1) {
                    // Ha már létezik (van pontszáma), csak a szöveget frissítjük
                    aktualisCsoport.kerdesek[letezoKerdesIndex][0] = trimmedVal;
                } else {
                    // Ha nincs, HOZZÁADJUK, de a végére teszünk egy 'true' jelölőt (isTextOnly)
                    // Formátum: [szoveg, ertek, id, negalt_ertek, maximalis_szint, isTextOnly]
                    aktualisCsoport.kerdesek.push([trimmedVal, 0, kerdes.id, 0, kerdes.maximalis_szint, true]);
                }
            }
        }
        // Összesített pontszám inicializálása
        let osszesitettPontszam = 0;
        const ertekelesJSON = {};


        // 3) A táblázatos megjelenítés felépítése
        for (const [foKategoriaNev, alKategoriak] of Object.entries(foKategoriak)) {
           const foKategoriaDiv = document.createElement('div');
foKategoriaDiv.classList.add('fo-kategoria');

const foKategoriaCim = document.createElement('h3');

// --- színkocka létrehozása ---
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
    background: '#ccc' // alap, amíg nincs fetch eredmény
});
foKategoriaDiv.appendChild(szinKocka);
fetch('/private/info/temakorok.json')
  .then(res => res.json())
  .then(data => {
      const modulData = data.optionSets?.[String(modulId)] || [];
      const talalat = modulData.find(item => 
          (item.value || item.text)?.trim() === foKategoriaNev
      );

      if (talalat) {
          let rgbValue = '';

          if (talalat.szin) {
              szinKocka.style.background = talalat.chart;
              rgbValue = talalat.chart;
          } else if (talalat.chart) {
              szinKocka.style.background = talalat.szin;
              rgbValue = talalat.szin;
          }

          // dataset-be mentjük az RGB értéket
          foKategoriaCim.dataset.szin =rgbValue;
          szinKocka.dataset.rgb = rgbValue;
      }
  })
  .catch(err => console.error('Szín betöltési hiba:', err));

            const osszegzesDiv = document.createElement('div');
            osszegzesDiv.classList.add('pontD');
            
        
            foKategoriaCim.textContent = foKategoriaNev; 
            foKategoriaCim.appendChild(osszegzesDiv);
            foKategoriaDiv.appendChild(foKategoriaCim);

            const table = document.createElement('table');
            table.classList.add('ertekeles-table'); 
            const tbody = document.createElement('tbody');
            table.appendChild(tbody);
        
            let hasAlKategoria = false;
            let kategoriaOsszpont = 0;
            let kategoriaAlKategoriaSzazalekok = []; // 🔹 ide gyűjtjük az alkategória átlagokat
        
            for (const [alKategoriaNev, altTemak] of Object.entries(alKategoriak)) {
                let hasAltTema = false;
                let alkategoriaOsszpont = 0;
                let alKategoriaAltTemaSzazalekok = []; // 🔹 új: ide gyűjtjük az altémák százalékait

                const altTemaRows = [];
        
                for (const [altTemaNev, kerdesObj] of Object.entries(altTemak)) {
                    const altTemaRow = document.createElement('tr');
                    altTemaRow.classList.add('alt-tema');
                
                    const osszegzesDivAlt = document.createElement('div');
                    osszegzesDivAlt.classList.add('pontC');
                
                    const altTemaCell = document.createElement('td');
                    altTemaCell.classList.add('alt-tema');
                    altTemaCell.textContent = altTemaNev + ":";
                    altTemaCell.appendChild(osszegzesDivAlt); 
                
                    altTemaRow.appendChild(altTemaCell);
                
                    const kerdesekCell = document.createElement('td');
                    kerdesekCell.classList.add('kerdesek');
                
                    let hasKerdes = false;
                    let altTemaOsszpont = 0; // 🔹 Itt deklaráljuk, hogy mindig friss legyen!
                    let altTemaFokerdesSzazalekok = []; // 🔹 ide fogjuk gyűjteni a százalékokat

                
                    for (const [kerdesId, valaszok] of Object.entries(kerdesObj)) {
                        if (valaszok.kerdesek.length > 0 || valaszok.alkerdesek.length > 0) {
                            const kerdesContainer = document.createElement('div');
                            kerdesContainer.classList.add('kerdes-container');
                
                            let kerdesOsszpont = 0;
                                           
                            valaszok.kerdesek.forEach((alkerd) => {
                                const [szoveg, ertek, id, negalt_ertek, maximalis_szint, isTextOnly] = alkerd;                                
                                const p = document.createElement('p');
                                p.classList.add('fokerd');
                                p.setAttribute('data-id', id);
                                p.setAttribute('data-maxi', maximalis_szint == 1 ? 'true' : 'false');

                                // ÚJ RÉSZ: Ha ez csak szöveges válasz, megjelöljük, hogy ne számítson bele az átlagba
                                if (isTextOnly) {
                                    p.setAttribute('data-ignore-score', 'true');
                                }
                            
                                // 🔍 Kikeressük a főkérdés objektumot a Kerdesek tömbből
                                const parentKerdes = KategoriaKezelo.kerdesek.find(k => k.id === id);
                                let aktualisErtek = 0;
                            
                               if (parentKerdes) {
   
                                const szazalek = szamoljFokerdesOsszErtek(parentKerdes, KategoriaKezelo.kerdesek, kerdesValaszok);

                                if (szazalek !== null) {
                                    aktualisErtek = szazalek;
                                    altTemaFokerdesSzazalekok.push(szazalek);
                                } else {
                                    aktualisErtek = Math.max(parseFloat(ertek) || 0, parseFloat(negalt_ertek) || 0);
                                }
                            }

                                kerdesOsszpont += aktualisErtek;
                                altTemaOsszpont += aktualisErtek;
                            
                                p.innerHTML = szoveg + `<span class="pontB" data-pont-kerd="${foKategoriaNev}/${alKategoriaNev}/${altTemaNev}/${szoveg}:${aktualisErtek}"> (${aktualisErtek}%)</span>`;
                                kerdesContainer.appendChild(p);
                            });
                                         
                            valaszok.alkerdesek.forEach((alkerd) => {    
                                const [szoveg, ertek, id, maximalis_szint] = alkerd;
                                const p = document.createElement('p');
                                p.setAttribute('data-ertek', ertek); 
                                p.setAttribute('data-id', id); 
                                p.setAttribute('data-maxi', maximalis_szint == 1 ? 'true' : 'false');

                                p.classList.add('alkerd');
                                const utvonal = `${foKategoriaNev} - ${alKategoriaNev} - ${altTemaNev}`;
                                p.setAttribute('data-utvonal', utvonal);
                
                                let aktualisErtek = parseFloat(ertek) || 0;
                                kerdesOsszpont += aktualisErtek;
                                altTemaOsszpont += aktualisErtek;
                
                                p.innerHTML = szoveg + `<span class="pontA"> (${aktualisErtek} pont)</span>`;
                                kerdesContainer.appendChild(p);
                            });
                
                            kerdesekCell.appendChild(kerdesContainer);
                            hasKerdes = true;
                        }
                    }
                
                    if (hasKerdes) {
                        kategoriaOsszpont += altTemaOsszpont;
                        alkategoriaOsszpont += altTemaOsszpont; // 🔹 Alkategória pontszám frissítése
                        // 🔹 MOST kell beállítani, mert most már tudjuk az értéket!
                       // Szétválasztjuk a maximalizált és nem maximalizált főkérdéseket
const maximalizaltErtekek = [];
const normalErtekek = [];

kerdesekCell.querySelectorAll('.fokerd').forEach(pElem => {
    if (pElem.getAttribute('data-ignore-score') === 'true') return;
    const maxi = pElem.getAttribute('data-maxi') === 'true';
    const ertek = parseInt(pElem.querySelector('span')?.textContent?.match(/\((\d+)%\)/)?.[1]) || 0;

    if (maxi) {
        maximalizaltErtekek.push(ertek);
    } else {
        normalErtekek.push(ertek);
    }
});

// Döntés: ha van maximalizált kérdés, csak azt vesszük figyelembe
const ertekek = maximalizaltErtekek.length > 0 ? maximalizaltErtekek : normalErtekek;
const altTemaAtlag = ertekek.length > 0
    ? Math.round(ertekek.reduce((sum, val) => sum + val, 0) / ertekek.length)
    : 0;


                        alKategoriaAltTemaSzazalekok.push(altTemaAtlag); // 🔹 gyűjtjük az altéma átlagokat

                        osszegzesDivAlt.innerHTML = `(${altTemaAtlag}%)`;
                        osszegzesDivAlt.setAttribute('data-pont-alt', `${foKategoriaNev}/${alKategoriaNev}/${altTemaNev}:${altTemaAtlag}`);
                        osszegzesDivAlt.setAttribute('data-pont-alt', `${foKategoriaNev}/${alKategoriaNev}/${altTemaNev}:${altTemaOsszpont}`);


                        altTemaRow.appendChild(kerdesekCell);
                        altTemaRows.push(altTemaRow);
                        hasAltTema = true;
                    }
                }
                
                if (hasAltTema) {
                    const alKatRow = document.createElement('tr');
                    alKatRow.classList.add('al-kategoria');
                    const alKatCell = document.createElement('td');
                    alKatCell.colSpan = 2;
                    alKatCell.textContent = alKategoriaNev;
                    alKatCell.classList.add('al-kategoria');
        
                    // 🔹 Alkategória összpontszám megjelenítése
                    const osszegzesDivAlKat = document.createElement('div');
                    osszegzesDivAlKat.classList.add('pontF');
                    const alKatAtlag = alKategoriaAltTemaSzazalekok.length > 0
                    ? Math.round(alKategoriaAltTemaSzazalekok.reduce((sum, val) => sum + val, 0) / alKategoriaAltTemaSzazalekok.length)
                    : 0;
                    kategoriaAlKategoriaSzazalekok.push(alKatAtlag); // 🔹 gyűjtjük a főkategória szinthez

                osszegzesDivAlKat.innerHTML = ` (${alKatAtlag}%)`;
                const altTemakSzoveg = Object.entries(altTemak)
                .map(([altNev, kerdesObj]) => {
                    const altElem = kerdesObj?.__ertek; // ha így mented el valahol
                    const altErtek = kerdesObj?.__atlag || '?';
                    return `${altNev} (${altErtek}%)`;
                }).join(', ');
            
            osszegzesDivAlKat.setAttribute(
                'data-pont-al',
                `${alKategoriaNev}:${alKatAtlag} [${altTemakSzoveg}]`
            );
                    osszegzesDivAlKat.setAttribute('data-pont-al', `${foKategoriaNev}/${alKategoriaNev}:${alkategoriaOsszpont}`);
                    alKatCell.appendChild(osszegzesDivAlKat);
        
                    alKatRow.appendChild(alKatCell);
                    tbody.appendChild(alKatRow);
        
                    altTemaRows.forEach(row => {
                        tbody.appendChild(row);
                    });
        
                    hasAlKategoria = true;
                }
            }
        
            if (hasAlKategoria) {
                foKategoriaDiv.appendChild(table);

                const foKatAtlag = kategoriaAlKategoriaSzazalekok.length > 0
                ? Math.round(kategoriaAlKategoriaSzazalekok.reduce((sum, val) => sum + val, 0) / kategoriaAlKategoriaSzazalekok.length)
                : 0;
                
                osszegzesDiv.innerHTML = `Főkategória teljesítmény: ${foKatAtlag}%`;
                osszegzesDiv.setAttribute('data-fo-szazalek', foKatAtlag); // csak a szám!

                osszegzesDiv.setAttribute('data-pont-fo', `${foKategoriaNev}:${foKatAtlag}`);
                osszegzesDiv.setAttribute('data-pont-fo', `${foKategoriaNev}:${kategoriaOsszpont}`);

                container.appendChild(foKategoriaDiv);
        
                osszesitettPontszam += kategoriaOsszpont;
            }
        }
        
        // 🔥 Teljes összesített pontszám kiírása
        const vegsoOsszegzesDiv = document.createElement('div');
        // --- Összegző JSON építése ---

for (const [foNev, alObj] of Object.entries(foKategoriak)) {
const foKatDiv = [...container.querySelectorAll('.fo-kategoria h3')]
                   .find(h3 => h3.textContent.trim().startsWith(foNev));
  const foSzazalek = parseInt(
      foKatDiv?.querySelector('.pontD')?.dataset.foSzazalek || 0
  );

  ertekelesJSON[foNev] = { '%': foSzazalek, alkategoriak: {} };

  for (const [alNev, altObj] of Object.entries(alObj)) {
    const alKatTd   = [...container.querySelectorAll('td.al-kategoria')]
                        .find(td => td.textContent.trim().startsWith(alNev));
    const alSzazalek = parseInt(
        alKatTd?.querySelector('.pontF')?.textContent.match(/\((\d+)%\)/)?.[1] || 0
    );

    ertekelesJSON[foNev].alkategoriak[alNev] = { '%': alSzazalek, altTemak: {} };

    for (const [altNev] of Object.entries(altObj)) {
      const altTd   = [...container.querySelectorAll('td.alt-tema')]
                        .find(td => td.textContent.trim().startsWith(altNev));
      const altSzazalek = parseInt(
          altTd?.querySelector('.pontC')?.textContent.match(/\((\d+)%\)/)?.[1] || 0
      );

      ertekelesJSON[foNev].alkategoriak[alNev].altTemak[altNev] = altSzazalek;
    }
  }
}

// Konzolos dump formázottan
/* console.log('%cÉrtékelés (összefoglaló JSON):', 'font-weight:bold;');
console.log(JSON.stringify(ertekelesJSON, null, 2)); */
window.ertekelesJSON = ertekelesJSON;   // ha később más kódból is kell

        vegsoOsszegzesDiv.classList.add('pontE');
        vegsoOsszegzesDiv.innerHTML = `Teljes értékelés összpontszáma: ${osszesitettPontszam} pont`;
        vegsoOsszegzesDiv.setAttribute('data-ertek-ossz', osszesitettPontszam);

        container.prepend(vegsoOsszegzesDiv);
    
        const pontok = document.querySelectorAll('.pontA, .pontB, .pontC, .pontD, .pontE, .pontF');

        pontok.forEach(pont => {
            pont.style.display = pontokLathatok ? 'flex' : 'none';
        });
        // 🔹 1. főkategória értékek kigyűjtése charthoz () Ha már van ilyen chart, előbb megsemmisítjük
const chartSelector = document.getElementById('chartTypeSelector');

// Csak akkor adjuk hozzá az eseményfigyelőt, ha az elem TÉNYLEG létezik
if (chartSelector) {
    chartSelector.addEventListener('change', async function(e) {
        const ujTipus = e.target.value;
        
        // Importáljuk a szamitasok.js függvényeit
        const modul = await import('./szamitasok.js');
        
        // Beállítjuk a típust
        modul.setDiagramTipus(ujTipus);
        
        // 1. Főkategória diagram frissítése
        const canvas = document.getElementById('fokategoriaChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const { chartLabels, chartData } = modul.kiszamoltFoKategoriaDiagramAdatok(); 
            
            // A szamitasok.js most már magától felismeri, ha frissíteni vagy újra kell rajzolni a diagramot
            modul.letrehozFoKategoriaChart(ctx, chartLabels, chartData, window.kategoriakChartSzinek);
        }
        
        // 2. A többi diagram (alkategória, altéma) frissítése a memóriából
        modul.frissitsdAzAlDiagramokat();
    });
}  
        
        const { chartLabels, chartData } = kiszamoltFoKategoriaDiagramAdatok();
            const ctx = document.getElementById('fokategoriaChart').getContext('2d');
            
            // Átadjuk az előző példányt (window.foKategoriaChartInstance) utolsó paraméterként
            // Ha létezik, a függvény frissíti. Ha null, újat gyárt.
            window.foKategoriaChartInstance = letrehozFoKategoriaChart(ctx, chartLabels, chartData, kategoriakChartSzinek, window.foKategoriaChartInstance);
            const aktivFoKatElem = document.querySelector('.fo.active .cim');
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
                        const [rawLabel, _] = adat.split(':');
                
                        // Levágjuk a főkategória részt, csak az alkategória név marad
                        const label = rawLabel.split('/').pop().trim();
                
                        const ertek = parseFloat(div.textContent.match(/\((\d+)%\)/)?.[1]);
                
                        if (!isNaN(ertek)) {
                            labels.push(label);
                            data.push(ertek);
                        }
                    }
                });
                

                if (labels.length && data.length) {
                    window.aktivFoKategoriaNev = aktivFoKategoriaNev; 
letrehozAlkategoriaChart(labels, data, kategoriakChartSzinek, window.aktivFoKategoriaNev);
                
}
        
                // 🔹 2. Altéma-chart (ha van aktív alkategória)
const aktivAlkatElem = document.querySelector('.al.active');
const altTemaChartContainer = document.getElementById('altTemaChartContainer');

if (aktivAlkatElem && window.aktivFoKategoriaNev) {
  const aktivAlKategoriaNev = aktivAlkatElem.textContent.trim();

  // 1️⃣ Csak az aktív főkategória div-en belül dolgozunk
  const foDiv = [...document.querySelectorAll('#keszulo .fo-kategoria')]
    .find(div => div.querySelector('h3')
                   ?.textContent.trim()
                   .startsWith(window.aktivFoKategoriaNev));
  if (!foDiv) {                       // nincs blokk → nincs chart
    altTemaChartContainer.style.display = 'none';
    return;
  }

  // 2️⃣ Alkategória <tr> keresése ezen belül
  const alKatTr = [...foDiv.querySelectorAll('tr.al-kategoria')]
    .find(tr => tr.querySelector('td.al-kategoria')
                  ?.childNodes[0]
                  ?.textContent.trim() === aktivAlKategoriaNev);
  if (!alKatTr) {                     // nincs ilyen sor
    altTemaChartContainer.style.display = 'none';
    return;
  }

  // 3️⃣ Alt-témák kigyűjtése
  const labels = [];
  const data   = [];
  let nextRow  = alKatTr.nextElementSibling;

  while (nextRow && nextRow.classList.contains('alt-tema')) {
    const td       = nextRow.querySelector('td.alt-tema');
    const altNev   = td?.childNodes[0]?.textContent.trim().replace(/:$/, '') || 'Ismeretlen';
    const szazalek = parseFloat(
      td?.querySelector('.pontC')?.textContent.match(/\((\d+)%\)/)?.[1]
    );
    if (altNev && !isNaN(szazalek)) {
      labels.push(altNev);
      data.push(szazalek);
    }
    nextRow = nextRow.nextElementSibling;
  }

  // 4️⃣ Chart vagy semmi
  if (labels.length) {
    letrehozAltTemaChart(labels, data, window.aktivFoKategoriaNev, kategoriakChartSzinek);
    altTemaChartContainer.style.display = 'block';
  } else {
    altTemaChartContainer.style.display = 'none';
  }
}
else {
    // Nincs aktív alkategória
    altTemaChartContainer.style.display = 'none';
}

            }   

}
    }
    //Főkategóriák    
 static loadFoKategoriak() {
    modulIdBetoltve.then( async modulId => {
        await initTemaLookups();
        fetch(`/api/get-fo_kategoriak?modulId=${modulId}`)
            .then(response => response.json())
            .then(data => {
                const tartaly = document.getElementById('fo_kategoriak');
                tartaly.innerHTML = '';
                data.forEach(item => {
                    const kategoria = new Kategoria(item.nev, item.nev);
                    const div = kategoria.render(tartaly);
                    div.classList.add("fo");
                    div.textContent = "";

                    const cim = document.createElement("div");
                    cim.classList.add("cim");
                    cim.innerHTML = item.nev;
                    div.appendChild(cim);

                    const leiras = document.createElement("div");
                    leiras.classList.add("leiras");
                    // már a JSON-ból töltött leirasok objektumot használja
                    leiras.innerHTML = leirasok[item.nev] || "Nincs elérhető leírás."; 
                    div.appendChild(leiras);

                    div.style.background = kategoriakSzinek[item.nev] || "#ffffff";
                 div.addEventListener('click', () => {
  // 1) Kapcsoljuk be a fókusz kihangsúlyozást
  Focus.toggleActiveClass(div, item.nev);

  // 2) Görgessünk el a .fo osztályú elemhez
  const foElem = document.querySelector('div#fo_kategoriak');
  if (foElem) {
    foElem.scrollIntoView({
      behavior: 'smooth',  // vagy 'auto'
      block:    'center'    // 'center', 'end' is lehet, ha máshová akarod igazítani
    });
  }
});


                });
            })
            .catch(err => console.error("Hiba a kérdések betöltése során:", err));
    }).catch(err => console.error("Hiba a modulId betöltése során:", err));
}
    // Alkategóriák
  static async loadAlKategoriak(foKategoriaNev) {
    const { modulIdBetoltve } = await import('./main_alap.js');
    const modulId = await modulIdBetoltve;

    const response = await fetch(`/api/get-al_kategoriak?fo_kategoria_id=${foKategoriaNev}&modulId=${modulId}`);
    const data = await response.json();
        
        const tartaly = document.getElementById('al_kategoriak');
        Focus.showContainer(tartaly); // Várakozás a megjelenítésre
        tartaly.innerHTML = ''; // Tisztítás
        
        data.forEach(item => {
            const kategoria = new Kategoria(item.nev, item.nev);
            const div = kategoria.render(tartaly);
            div.classList.add("al");
div.addEventListener('click', () => {
    KategoriaKezelo.loadAltTemak(foKategoriaNev, item.nev);
    Focus.toggleActiveClassal(div, item.nev);
 div.scrollIntoView({
    behavior: 'smooth',  // sima görgetés; ha nem kéred, hagyd ki
    block:    'center'    // a viewport tetejére igazítja az elemet
  });
    setTimeout(() => {
  const alkategoriaNev = item.nev;

  // 1️⃣ aktív főkategória blokkját keressük
  const foDiv = [...document.querySelectorAll('#keszulo .fo-kategoria')]
    .find(div => div.querySelector('h3')
                   ?.textContent.trim()
                   .startsWith(foKategoriaNev));   // ← ez a paramétered

  if (!foDiv) {
    document.getElementById('altTemaChartContainer').style.display = 'none';
    return;
  }

  // 2️⃣ alkategória <tr> már csak ebben
  const alkatTr = [...foDiv.querySelectorAll('tr.al-kategoria')]
    .find(tr => tr.querySelector('td.al-kategoria')
                 ?.childNodes[0]
                 ?.textContent.trim() === alkategoriaNev);

  if (!alkatTr) {
    document.getElementById('altTemaChartContainer').style.display = 'none';
    return;
  }

  const labels = [];
  const data   = [];
  let nextRow  = alkatTr.nextElementSibling;

  while (nextRow && nextRow.classList.contains('alt-tema')) {
    const td       = nextRow.querySelector('td.alt-tema');
    const altNev   = td?.childNodes[0]?.textContent.trim().replace(/:$/, '') || 'Ismeretlen';
    const szazalek = parseFloat(
      td?.querySelector('.pontC')?.textContent.match(/\((\d+)%\)/)?.[1]
    );
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



            
            div.style.background = kategoriakSzinek[foKategoriaNev] || "#ffffff"; // Alkalmazza a fő kategória színét
        });
    }
    // Altémák
static async loadAltTemak(foKategoriaNev, alKategoriaNev) {
    const modulId = await modulIdBetoltve;

    const response = await fetch(
        `/api/get-alt_temak?fo_kategoria_id=${encodeURIComponent(foKategoriaNev)}&al_kategoria_id=${encodeURIComponent(alKategoriaNev)}&modulId=${modulId}`
    );
            const data = await response.json();

        const tartaly = document.getElementById('alt_temak');
        Focus.showContainer(tartaly); // Várakozás a megjelenítésre
        tartaly.innerHTML = ''; // Tisztítás
        
        data.forEach(item => {
            const kategoria = new Kategoria(item.nev, item.nev);
            const div = kategoria.render(tartaly);
            div.classList.add("alal");
            div.addEventListener('click', () => {
                KategoriaKezelo.loadKerdesek(foKategoriaNev, alKategoriaNev, item.nev);
                Focus.toggleActiveClassalal(div, item.nev);
                
            });
        });
    }
    //Főkérdések
  static async loadKerdesek(foKategoriaNev, alKategoriaNev, altTemaNev) {
    const modulId = await modulIdBetoltve;

    const response = await fetch(
        `/api/get-kerdesek?fo_kategoria_id=${encodeURIComponent(foKategoriaNev)}&al_kategoria_id=${encodeURIComponent(alKategoriaNev)}&alt_tema_id=${encodeURIComponent(altTemaNev)}&modulId=${modulId}`
    );
    const data = await response.json();

    const tartaly = document.getElementById('kerdesek');
    Focus.showContainer(tartaly);
    tartaly.innerHTML = ''; // Eltávolítja a korábbi kérdéseket

    data.forEach(item => {
        const kerdes = new Kerdes(
            item.ertek,
            item.id, 
            item.szoveg, 
            item.parent_id, 
            item.valasz_ag, 
            item.negalt_kerdes_szoveg, 
            foKategoriaNev, alKategoriaNev, altTemaNev, 
            item.szoveges,  
            item.ertek,
            item.negalt_ertek,
            item.ossz_ertek,
            item.maximalis_szint
        );
        kerdes.render(tartaly);
        KategoriaKezelo.kerdesek.push(kerdes); // Adja hozzá a kérdést a KategoriaKezelo.kerdesek tömbhöz
    });
}

    //Alkérdések
static async loadAlKerdesek(parentId, valaszAg, parentKerdes) {
    const modulId = await modulIdBetoltve;
    const tartaly = document.getElementById(`alkerdesek-${parentId}`);

    try {
        // Cache betöltése, ha még üres
        if (Object.keys(alKerdesMap).length === 0) {
            await KategoriaKezelo.loadAllAlKerdesek();
        }

        const cachedData = alKerdesMap[parentId] || [];
        const filteredData = cachedData.filter(item => item.valasz_ag === valaszAg);

        tartaly.innerHTML = '';

        if (filteredData.length > 0) {
            tartaly.classList.remove('hidden');
            tartaly.classList.add('fade-in');
        } else {
            tartaly.classList.add('hidden');
        }

        const sortedData = filteredData.sort((a, b) => a.kindex - b.kindex);
        const ag = valaszAg === 'igen' ? parentKerdes.igenAg : parentKerdes.nemAg;
        ag.length = 0;

        for (const item of sortedData) {
            ag.push(item.id);
            const kerdes = new Kerdes(
                item.kindex,
                item.id,
                item.szoveg,
                item.parent_id,
                item.valasz_ag, 
                item.negalt_kerdes_szoveg,
                parentKerdes.foKategoria,
                parentKerdes.alKategoria,
                parentKerdes.altTema,
                item.szoveges,
                item.ertek,
                item.negalt_ertek,
                item.ossz_ertek,
                item.maximalis_szint
            );
            await kerdes.render(tartaly);
            KategoriaKezelo.kerdesek.push(kerdes);
        }
    } catch (error) {
        console.error('Hiba történt az alkérdések betöltése során:', error);
    }
}

   static async loadAllAlKerdesek() {
    if (Object.keys(alKerdesMap).length) return alKerdesMap;

    const modulId = await modulIdBetoltve;

    if (!alKerdesBatchPromise) {
        alKerdesBatchPromise = (async () => {
            const resp = await fetch(`/api/get-all-alkerdesek?modulId=${modulId}`);
            const data = await resp.json();
            alKerdesMap = data.alKerdesMap || {};
            return alKerdesMap;
        })();
    }
    return alKerdesBatchPromise;
}


    //Már meglévők betöltése
    static async loadValaszok() {
    if (!document.getElementById('szerkeszto')) {
        showLoading();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const kitoltesId = urlParams.get('kitoltes_id');

    if (!kitoltesId) {
        console.warn('Hiányzó kitoltes_id az URL-ből!');
        return;
    }

    try {
        const response = await fetch(`/api/get-valaszok?kitoltes_id=${kitoltesId}`);
        const data = await response.json();

        if (data.success) {
            data.valaszok.forEach(valasz => {
                if (valasz.valasz_szoveg && valasz.valasz_szoveg.trim() !== '') {
                    szovegesValaszok[valasz.kerdes_id] = valasz.valasz_szoveg.trim() ;
                }
                kerdesValaszok[valasz.kerdes_id] = valasz.kerdes_valasz;
            });

            const kerdesIds = Object.keys(kerdesValaszok);

            if (kerdesIds.length === 0) {
                KategoriaKezelo.frissitErtekelesekContainer();
                hideLoading();
                return;
            }

       const modulId = await modulIdBetoltve;

        const kerdesekResponse = await fetch('/api/get-kerdesek-by-ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kerdesIds, modulId })   // ← ide is bekerül
        });

            const kerdesekData = await kerdesekResponse.json();

            if (kerdesekData.success) {
                const hasNemAgMap = await Kerdes.hasNemAgBatch(kerdesIds);

                kerdesekData.kerdesek.forEach(kerdes => {
                    const ujKerdes = new Kerdes(
                        kerdes.kindex,
                        kerdes.id,
                        kerdes.szoveg,
                        kerdes.parent_id,
                        kerdes.valasz_ag,
                        kerdes.negalt_kerdes_szoveg,
                        kerdes.fo_kategoria,
                        kerdes.al_kategoria,
                        kerdes.alt_tema,
                        kerdes.szoveges,
                        kerdes.ertek,
                        kerdes.negalt_ertek,
                        kerdes.ossz_ertek,
                        kerdes.maximalis_szint
                    );

                    ujKerdes.hasNemAg = hasNemAgMap[kerdes.id] || false;

                    // ❌ NEM renderelünk DOM elemet
                    KategoriaKezelo.kerdesek.push(ujKerdes);

                });
                KategoriaKezelo.kerdesek.forEach(parentKerdes => {
                    parentKerdes.igenAg = KategoriaKezelo.kerdesek
                        .filter(k => k.parentId === parentKerdes.id && k.valaszAg === 'igen')
                        .map(k => k.id);

                    parentKerdes.nemAg = KategoriaKezelo.kerdesek
                        .filter(k => k.parentId === parentKerdes.id && k.valaszAg === 'nem')
                        .map(k => k.id);
                });        

                // 🔧 Töltsük be az összes potenciális alkérdést
                await KategoriaKezelo.loadAllAlKerdesek();
/*                 console.log('✅ loadAllAlKerdesek meghívva a loadValaszok belsejében');
 */
                // 🔧 Minden lehetséges alkérdés felvétele, ha még nincs a tömbben
                for (const parentId in alKerdesMap) {
                    for (const alk of alKerdesMap[parentId]) {
                        const marLetezik = KategoriaKezelo.kerdesek.some(k => k.id === alk.id);
                        if (!marLetezik) {
                            const ujAlKerdes = new Kerdes(
                                alk.kindex,
                                alk.id,
                                alk.szoveg,
                                alk.parent_id,
                                alk.valasz_ag,
                                alk.negalt_kerdes_szoveg,
                                alk.fo_kategoria,
                                alk.al_kategoria,
                                alk.alt_tema,
                                alk.szoveges,
                                alk.ertek,
                                alk.negalt_ertek,
                                alk.ossz_ertek,
                                alk.maximalis_szint
                            );
                           KategoriaKezelo.kerdesek.push(ujAlKerdes);
/*                            console.log(`➕ Alkérdés hozzáadva: ${alk.id} - ${alk.szoveg}`);
 */                        }
                    }
                }

                    ujratoltParentAgak();
                    KategoriaKezelo.frissitErtekelesekContainer();
                    
                    setTimeout(() => {hideLoading();}, 200);
                } else {
                    console.error('Hiba a kérdések lekérése során:', kerdesekData.message);
                }
            } else {
                console.error('Hiba a válaszok lekérése során:', data.message);
            }
        } catch (error) {
            console.error('Fetch hiba:', error);
        }
    }
}
