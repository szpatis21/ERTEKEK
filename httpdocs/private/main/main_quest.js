import { kerdesValaszok, szovegesValaszok, hideLoading, showLoading, megtekintesMod, modulId, userId } from './main_alap.js';import { Kerdes } from './main_category.js';
import { Focus} from './main_quest_focus.js';
import { pontokLathatok } from './main_graph.js';
import { szamoljFokerdesOsszErtek,letrehozFoKategoriaChart,kiszamoltFoKategoriaDiagramAdatok,letrehozAlkategoriaChart,letrehozAltTemaChart } from './szamitasok.js';
import { modulIdBetoltve } from './main_alap.js';
import { showSuccessToast } from '/both/alert.js';

// JSON-ból töltött lookupok (modulId szerint)
let kategoriakSzinek = {};
let kategoriakChartSzinek = {};
let leirasok = {};

function normalizeChartColor(c) {
  if (!c) return 'rgba(102, 102, 102, 0.5)'; // Alapértelmezett szürke, átlátszóan

  // Ha hex kód (pl. #ff1414), alakítsuk át rgba-ra 0.5-ös átlátszósággal
  if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
    // Rövid formátum (#f00) kiterjesztése (#ff0000)
    const hex = c.length === 4 ? '#' + c[1]+c[1] + c[2]+c[2] + c[3]+c[3] : c;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  }

  // A meglévő rgb(r,g,b, a) formátum javítása rgba-ra
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
    // ÚJ: Alkérdés cache ürítése szerkesztés után
    static clearAlkerdesCache() {
        alKerdesMap = {};
        alKerdesBatchPromise = null;
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
        let elert_ertek = 0; // Ezt a változót adjuk hozzá a tényleges pontszámnak
        let negalt_ertek = 0; 

        if (value === 'igen') {
            text = kerdes.szoveg;
            negalt_ertek = 0;
            elert_ertek = kerdes.ertek; // IGEN ág pontja
        } else if (value === 'nem' && kerdes.negaltKerdesSzoveg) {
            text = kerdes.negaltKerdesSzoveg;
            negalt_ertek = kerdes.negalt_ertek;
            elert_ertek = kerdes.negalt_ertek; // NEM ág pontja
        }

        if (text) {
            if (kerdes.parentId) {
                // Alkérdés esetén az elert_ertek-et adjuk át a kerdes.ertek helyett
                foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.parentId]
                .alkerdesek.push([text, elert_ertek, kerdes.id, kerdes.maximalis_szint]);
            } else {
                // Főkérdés
                foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.id]
                .kerdesek.push([text, kerdes.ertek, kerdes.id, negalt_ertek, kerdes.maximalis_szint]); 
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
                  // JAVÍTÁS: Itt is kifejezetten a .cim div szövegét kell lekérni a gombok miatt!
                  const cimElem = aktivAlkatElem.querySelector('.cim');
                  const aktivAlKategoriaNev = cimElem ? cimElem.textContent.trim() : aktivAlkatElem.textContent.trim();

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

                    const leiras = document.createElement("div");
                    leiras.classList.add("leiras");
                    leiras.innerHTML = leirasok[item.nev] || "Nincs elérhető leírás."; 

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

                    div.style.background = kategoriakSzinek[item.nev] || "#ffffff";
                    
                div.addEventListener('click', async (e) => {
    // --- SZÍNMÓDOSÍTÁS (Ecset) ---
    if (e.target.closest('.btn-ecset')) {
        const { ColorPicker } = await import('../admin/upload/color_picker.js');
        const kategoriaNev = item.nev;
        const kategoriaLeiras = leirasok[item.nev] || "Nincs elérhető leírás.";
        const jelenlegiHatter = div.style.background;
        
        const ujSzin = await ColorPicker.open(kategoriaNev, kategoriaLeiras, jelenlegiHatter);
        if (ujSzin) {
            div.style.background = ujSzin;
            kategoriakSzinek[kategoriaNev] = ujSzin;
            const modulId = await modulIdBetoltve;
            fetch('/api/kategoriak/fo', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regiNev: kategoriaNev, ujNev: kategoriaNev, szin: ujSzin, modulId })
            }).then(() => KategoriaKezelo.loadFoKategoriak());
        }
        return;
    }

    // --- SZERKESZTÉS (Ceruza) ---
    if (e.target.closest('.btn-ceruza')) {
        const { CategoryEditor } = await import('../admin/upload/category_editor.js');
        const aktCim = div.querySelector('.cim');
        const aktLeiras = div.querySelector('.leiras');
        const eredetiCim = aktCim.innerHTML;
        const eredetiLeiras = aktLeiras.innerHTML;
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
                if (data.success) KategoriaKezelo.loadFoKategoriak();
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
            }).then(() => KategoriaKezelo.loadFoKategoriak());
        }
        return; 
    }

    // Ha a gombokra kattintunk, ne válassza ki a kategóriát (lenyílás megelőzése)
    if (e.target.closest('.fo-gombok')) return;

    // Kategória lenyitása
    Focus.toggleActiveClass(div, item.nev);
    
    const foElem = document.querySelector('div#fo_kategoriak');
    if (foElem) {
        foElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
                });

                // Új kategória gomb (szintén szerkesztő módban, a szöveg konténerrel)
               // Új kategória gomb (szintén szerkesztő módban, a szöveg konténerrel)
                if (document.getElementById('szerkeszto')) {
                    const ujKategoriaDiv = document.createElement("div");
                    ujKategoriaDiv.classList.add("category", "fo", "new");
                    ujKategoriaDiv.setAttribute("data-id", "");
                    
                    ujKategoriaDiv.innerHTML=`
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h240v80H200v560h560v-240h80v240q0 33-23.5 56.5T760-120H200Zm440-400v-120H520v-80h120v-120h80v120h120v80H720v120h-80Z"/></svg>                    
                        <span>Új TÉMAKÖR</span> 
                    </div>`;

                    // --- ÚJ RÉSZ: Kattintás az Új Témakör gombra ---
                 // --- LÉTREHOZÁS ---
ujKategoriaDiv.addEventListener('click', async (e) => {
    e.stopPropagation(); // <--- EZT A SORT KELL BETENNI
    const { CategoryCreator } = await import('../admin/upload/category_creator.js');
    const eredmeny = await CategoryCreator.open();

    if (eredmeny) {
        const { ujCim, ujLeiras, ujSzin } = eredmeny;
        const modulId = await modulIdBetoltve; // Ezt be kell kérni

        fetch('/api/kategoriak/fo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nev: ujCim, leiras: ujLeiras, szin: ujSzin, modulId })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                // UI frissítése a DOM újraolvasásával
                KategoriaKezelo.loadFoKategoriak();
            } else {
                alert("Hiba: " + data.message);
            }
        });
    }
});

                    tartaly.prepend(ujKategoriaDiv);
                }

            })
            .catch(err => console.error("Hiba a kérdések betöltése során:", err));
    }).catch(err => console.error("Hiba a modulId betöltése során:", err));
}
    // Alkategóriák
// Alkategóriák
    static async loadAlKategoriak(foKategoriaNev) {
        const { modulIdBetoltve } = await import('./main_alap.js');
        const modulId = await modulIdBetoltve;
    
        const response = await fetch(`/api/get-al_kategoriak?fo_kategoria_id=${foKategoriaNev}&modulId=${modulId}`);
        const data = await response.json();
            
        const tartaly = document.getElementById('al_kategoriak');
        Focus.showContainer(tartaly); 
        tartaly.innerHTML = ''; 
        
        data.forEach(item => {
            const kategoria = new Kategoria(item.nev, item.nev);
            const div = kategoria.render(tartaly);
            div.classList.add("al");
            div.textContent = ""; 
    
            const cim = document.createElement("div");
            cim.classList.add("cim");
            cim.innerHTML = item.nev;
    
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
    
            // KATTINTÁSFIGYELŐ (Kibővítve a szerkesztéssel és törléssel)
div.addEventListener('click', async (e) => { 
    // --- SZERKESZTÉS (Ceruza) ---
    if (e.target.closest('.btn-ceruza')) {
        const { BasicEditor } = await import('../admin/upload/basic_editor.js');
        const aktCim = div.querySelector('.cim');
        const eredetiCim = aktCim.innerHTML;
        
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
                    KategoriaKezelo.loadAlKategoriak(foKategoriaNev); // Újratöltjük a listát
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
                    KategoriaKezelo.loadAlKategoriak(foKategoriaNev); // Újratöltjük a listát
                } else {
                    alert("Hiba: " + data.message);
                }
            });
        }
        return; 
    }

    // Ha csak szimplán a gombsávba kattint, ne csináljon semmit a kártya
    if (e && e.target.closest('.al-gombok')) return;

    // --- Eredeti logika: Alkategória kiválasztása és animációk ---
    KategoriaKezelo.loadAltTemak(foKategoriaNev, item.nev);
    Focus.toggleActiveClassal(div, item.nev);
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

        while (nextRow && nextRow.classList.contains('alt-tema')) {
            const td       = nextRow.querySelector('td.alt-tema');
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
    
            div.style.background = kategoriakSzinek[foKategoriaNev] || "#ffffff";
        });
    
        // --- ÚJ ALKATEGÓRIA KÁRTYA ---
        if (document.getElementById('szerkeszto')) {
            const ujAlKategoriaDiv = document.createElement("div");
            ujAlKategoriaDiv.classList.add("category", "al", "new");
            ujAlKategoriaDiv.setAttribute("data-id", "");
            
            ujAlKategoriaDiv.innerHTML = `
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h240v80H200v560h560v-240h80v240q0 33-23.5 56.5T760-120H200Zm440-400v-120H520v-80h120v-120h80v120h120v80H720v120h-80Z"/></svg>                    
                    <span>Új ALKATEGÓRIA</span> 
                </div>`;
            
            // LÉTREHOZÁS ESEMÉNY (Itt is a BasicEditor-t használjuk)
      // LÉTREHOZÁS ESEMÉNY (Új Alkategória)
            ujAlKategoriaDiv.addEventListener('click', async () => {
                const { BasicEditor } = await import('../admin/upload/basic_editor.js');
                const ujCim = await BasicEditor.open("Új alkategória létrehozása", "");
    
                if (ujCim) {
                    const modulId = await modulIdBetoltve;
                    fetch('/api/kategoriak/al_altema', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tipus: 'al', nev: ujCim, foKategoria: foKategoriaNev, modulId })
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            KategoriaKezelo.loadAlKategoriak(foKategoriaNev); // Frissítjük a felületet
                        } else {
                            alert("Hiba: " + data.message);
                        }
                    });
                }
            });

            tartaly.prepend(ujAlKategoriaDiv);
        }
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
        div.textContent = ""; // Töröljük a nyers szöveget

        const cim = document.createElement("div");
        cim.classList.add("cim");
        cim.innerHTML = item.nev;

        if (document.getElementById('szerkeszto')) {
            // --- SZERKESZTŐ NÉZET: szöveg konténer és gombok ---
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
            // --- NORMÁL NÉZET: közvetlenül a div-be megy ---
            div.appendChild(cim);
        }

        // KATTINTÁSFIGYELŐ
       div.addEventListener('click', async (e) => { 
            
            // --- SZERKESZTÉS (Ceruza) ---
            if (e.target.closest('.btn-ceruza')) {
                const { BasicEditor } = await import('../admin/upload/basic_editor.js');
                const eredetiCim = cim.textContent;

                const ujCim = await BasicEditor.open("Altéma szerkesztése", eredetiCim);
                if (ujCim && ujCim !== eredetiCim) {
                    const modulId = await modulIdBetoltve;
                    fetch('/api/kategoriak/al_altema', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tipus: 'altema', regiNev: eredetiCim, ujNev: ujCim, alKategoria: alKategoriaNev, foKategoria: foKategoriaNev, modulId })
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            KategoriaKezelo.loadAltTemak(foKategoriaNev, alKategoriaNev);
                        }
                    });
                }
                return; 
            }

            // --- TÖRLÉS (Kuka) ---
        // main_quest.js - kb. 675. sor környékén
if (e.target.closest('.btn-kuka')) {
    const { DeleteConfirm } = await import('../admin/upload/delete_confirm.js');
    const megerositve = await DeleteConfirm.open(item.nev, 'alal');    
    
    if (megerositve) {
        const modulId = await modulIdBetoltve;
        fetch('/api/kategoriak/al_altema', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipus: 'altema', nev: item.nev, alKategoria: alKategoriaNev, foKategoria: foKategoriaNev, modulId })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                // JAVÍTÁS: Feltétel nélkül ürítjük a konténert
                document.getElementById('kerdesek').innerHTML = ''; 
                KategoriaKezelo.loadAltTemak(foKategoriaNev, alKategoriaNev);
            }
        });
    }
    return; 
}

    
            // Ha csak a gombsávba kattint
            if (e && e.target.closest('.alal-gombok')) return;

            // Eredeti logika
            KategoriaKezelo.loadKerdesek(foKategoriaNev, alKategoriaNev, item.nev);
            Focus.toggleActiveClassalal(div, item.nev);
        });
    });

    // --- ÚJ ALTÉMA KÁRTYA ---
    if (document.getElementById('szerkeszto')) {
        const ujAltTemaDiv = document.createElement("div");
        ujAltTemaDiv.classList.add("category", "alal", "new");
        ujAltTemaDiv.setAttribute("data-id", "");
        
        ujAltTemaDiv.innerHTML=`
            <div>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h240v80H200v560h560v-240h80v240q0 33-23.5 56.5T760-120H200Zm440-400v-120H520v-80h120v-120h80v120h120v80H720v120h-80Z"/></svg>                    
                <span>ÚJ TÉMA</span> 
            </div>
        `;
        
   ujAltTemaDiv.addEventListener('click', async () => {
            const { BasicEditor } = await import('../admin/upload/basic_editor.js');
            const ujCim = await BasicEditor.open("Új altéma létrehozása", "");

            if (ujCim) {
                const modulId = await modulIdBetoltve;
                fetch('/api/kategoriak/al_altema', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipus: 'altema', nev: ujCim, alKategoria: alKategoriaNev, foKategoria: foKategoriaNev, modulId })
                }).then(res => res.json()).then(data => {
                    if (data.success) {
                        KategoriaKezelo.loadAltTemak(foKategoriaNev, alKategoriaNev);
                    }
                });
            }
        });

        tartaly.prepend(ujAltTemaDiv);
    }
}
//Főkérdések
//Főkérdések
static async loadKerdesek(foKategoriaNev, alKategoriaNev, altTemaNev) {
    const modulId = await modulIdBetoltve;

    const response = await fetch(
        `/api/get-kerdesek?fo_kategoria_id=${encodeURIComponent(foKategoriaNev)}&al_kategoria_id=${encodeURIComponent(alKategoriaNev)}&alt_tema_id=${encodeURIComponent(altTemaNev)}&modulId=${modulId}`
    );
    const data = await response.json();
    data.sort((a, b) => a.kindex - b.kindex);

const tartaly = document.getElementById('kerdesek');
    Focus.showContainer(tartaly);
    tartaly.innerHTML = ''; // Eltávolítja a korábbi kérdéseket

    // ÚJ: Kitoroljük a memóriából az adott kategória eddigi kérdéseit, hogy véletlenül se ragadjon be a régi állapot!
    this._kerdesek = this.kerdesek.filter(k => 
        !(k.foKategoria === foKategoriaNev && k.alKategoria === alKategoriaNev && k.altTema === altTemaNev)
    );

  // JAVÍTOTT CIKLUS
for (const item of data) {
    const kerdes = new Kerdes(
        item.kindex, 
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
    await kerdes.render(tartaly); // <-- Az await megvárja a renderelést
    KategoriaKezelo.kerdesek.push(kerdes);
}

   // --- ÚJ FŐKÉRDÉS KÁRTYA (csak szerkesztő módban) ---
    if (document.getElementById('szerkeszto')) {
        const ujKerdesDiv = document.createElement("div");
        ujKerdesDiv.classList.add("kerdesmodul", "new"); 
        ujKerdesDiv.setAttribute("data-id", "");

        // Eldöntjük a szöveget aszerint, hogy van-e már betöltött kérdés

        ujKerdesDiv.innerHTML = `
            <div class="questionadd2">
                <span>Új főkérdés hozzáadása</span>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
            </div>
        `;

        // --- ÚJ RÉSZ: Kattintás az Új Főkérdés gombra ---
        ujKerdesDiv.addEventListener('click', async () => {
            // Dinamikusan importáljuk az új InlineQuestionCreator osztályt
            const { InlineQuestionCreator } = await import('../admin/upload/category_creator.js');

            // 1. Kiszámoljuk a következő indexet
            const jelenlegiKerdesek = KategoriaKezelo.kerdesek.filter(k => 
                k.foKategoria === foKategoriaNev && 
                k.alKategoria === alKategoriaNev && 
                k.altTema === altTemaNev && 
                !k.parentId 
            );
            const lementettMaxIndex = jelenlegiKerdesek.length > 0 ? Math.max(...jelenlegiKerdesek.map(k => k.kindex)) : 0;
            const ideiglenesDb = tartaly.querySelectorAll('.uj-ideiglenes-kerdes').length;
            const kovetkezoIndex = lementettMaxIndex + ideiglenesDb + 1;

            // 2. Meghívjuk az interaktív felületet generáló osztályt
            const mentettAdatok = await InlineQuestionCreator.open(
                tartaly, 
                kovetkezoIndex, 
                foKategoriaNev, 
                alKategoriaNev, 
                altTemaNev
            );

            // 3. Ha a felhasználó rányomott a "Mentés" gombra (nem lépett ki a Mégse-vel)
if (mentettAdatok) {
            const modulId = await modulIdBetoltve;
            
            // API hívás (POST /kerdesek)
            fetch('/kerdesek', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    foKategoria: foKategoriaNev,
                    alKategoria: alKategoriaNev,
                    altTema: altTemaNev,
                    kerdesSzoveg: mentettAdatok.szoveg,
                    negaltKerdesSzoveg: mentettAdatok.negaltSzoveg,
                    ertek: mentettAdatok.ertek,
                    negalt_ertek: mentettAdatok.negaltErtek,
                    szoveges: mentettAdatok.szoveges,
                    maximalis_szint: mentettAdatok.maxi,
                    kindex: kovetkezoIndex, // <-- Itt a kiszámolt indexet adjuk át
                    alkerdesek: mentettAdatok.alkerdesek, // <-- Itt már a közösített tömböt használjuk!
                    modulId: modulId
                })
            }).then(res => res.json()).then(data => {
showSuccessToast("Kérdés és alkérdések sikeresen hozzáadva!"); // <-- EZT ADD HOZZÁ
                 KategoriaKezelo.loadKerdesek(foKategoriaNev, alKategoriaNev, altTemaNev);
            }).catch(err => console.error('Kérdés mentési hiba:', err));
        }
        });

        tartaly.prepend(ujKerdesDiv);
    }
}


//Alkérdések
static async loadAlKerdesek(parentId, valaszAg, parentKerdes) {
    const modulId = await modulIdBetoltve;
    const tartaly = document.getElementById(`alkerdesek-${parentId}`);

    try {
        if (Object.keys(alKerdesMap).length === 0) {
            await KategoriaKezelo.loadAllAlKerdesek();
        }

        const cachedData = alKerdesMap[parentId] || [];
        const filteredData = cachedData.filter(item => item.valasz_ag === valaszAg);
// --- ÚJ RÉSZ: Mentsük ki a nyitott ideiglenes szerkesztőket! ---
        const ideiglenesSzerkesztok = [];
        if (tartaly) {
            tartaly.querySelectorAll('.uj-ideiglenes-alkerdes').forEach(szerkeszto => {
                ideiglenesSzerkesztok.push(szerkeszto);
            });
        }

        // Törlés
        tartaly.innerHTML = '';
        const isSzerkeszto = document.getElementById('szerkeszto');
      

        if (filteredData.length > 0 || isSzerkeszto) {
            tartaly.classList.remove('hidden');
            tartaly.classList.add('fade-in');
        } else {
            tartaly.classList.add('hidden');
        }

     // --- JAVÍTÁS: Mindkét ág memóriába töltése a matematika számára ---
        cachedData.forEach(item => {
            const marLetezik = KategoriaKezelo.kerdesek.some(k => k.id === item.id);
            if (!marLetezik) {
                // Betesszük a láthatatlan alkérdéseket is a memóriába
                const rejtettKerdes = new Kerdes(
                    item.kindex, item.id, item.szoveg, item.parent_id,
                    item.valasz_ag, item.negalt_kerdes_szoveg,
                    parentKerdes.foKategoria, parentKerdes.alKategoria, parentKerdes.altTema,
                    item.szoveges, item.ertek, item.negalt_ertek,
                    item.ossz_ertek, item.maximalis_szint
                );
                KategoriaKezelo.kerdesek.push(rejtettKerdes);
            }
        });

        // Frissítjük a főkérdés ágait, hogy a matek azonnal lássa a pontos ID-kat
        parentKerdes.igenAg = cachedData.filter(i => i.valasz_ag === 'igen').map(i => i.id);
        parentKerdes.nemAg  = cachedData.filter(i => i.valasz_ag === 'nem').map(i => i.id);
        // ----------------------------------------------------------------

        const sortedData = filteredData.sort((a, b) => a.kindex - b.kindex);

        for (const item of sortedData) {
            // A kirajzolt elemet eltávolítjuk a memóriából, hogy a .render() után frissen visszategyük
            this._kerdesek = this.kerdesek.filter(k => k.id !== item.id);

            const kerdes = new Kerdes(
                item.kindex, item.id, item.szoveg, item.parent_id,
                item.valasz_ag, item.negalt_kerdes_szoveg,
                parentKerdes.foKategoria, parentKerdes.alKategoria, parentKerdes.altTema,
                item.szoveges, item.ertek, item.negalt_ertek,
                item.ossz_ertek, item.maximalis_szint
            );
            await kerdes.render(tartaly);
            KategoriaKezelo.kerdesek.push(kerdes);
        }

        // --- JAVÍTÁS 2: Értékelések és pontszámok újraszámolása a UI-on ---
        if (typeof KategoriaKezelo.frissitErtekelesekContainer === 'function') {
            KategoriaKezelo.frissitErtekelesekContainer();
        }

        if (isSzerkeszto) {
            const isFokerdes = !parentKerdes.parentId;

            if (isFokerdes) {
                // 1. Befoglaló Flex Konténer a két gombnak
                const gombKontener = document.createElement("div");
                gombKontener.style.display = "flex";
                gombKontener.style.gap = "10px";
                gombKontener.style.marginBottom = "15px";
                gombKontener.style.width = "100%";

                // 2. Eredeti "Új alkérdés" gomb
                const ujAlKerdesDiv = document.createElement("div");
                ujAlKerdesDiv.classList.add("kerdesmodul", "new"); 
                ujAlKerdesDiv.setAttribute("data-id", "");
                ujAlKerdesDiv.style.flex = "1";
                ujAlKerdesDiv.style.margin = "0";

                const roviditettSzoveg = parentKerdes.szoveg && parentKerdes.szoveg.length > 20 
                    ? parentKerdes.szoveg.substring(0, 20) + '...' 
                    : parentKerdes.szoveg;

                const fokerdesIdzet = roviditettSzoveg ? `a(z) <span class="idezet">"${roviditettSzoveg}"</span> kérdéshez` : "az új főkérdéshez";
                const gombSzoveg = valaszAg === 'igen' 
                    ? `Alkérdés hozzáadása (igen) ${fokerdesIdzet}` 
                    : `Alkérdés hozzáadása (nem) ${fokerdesIdzet}`;

                ujAlKerdesDiv.innerHTML = `
                    <div class="questionadd">
                        <span class="idezet">${gombSzoveg}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
                    </div>
                `;

                // 3. Új "Sablon" Select menü
                const sablonDiv = document.createElement("div");
                sablonDiv.classList.add("kerdesmodul", "new");
                sablonDiv.style.flex = "1";
                sablonDiv.style.margin = "0";
                sablonDiv.style.padding = "0";
                sablonDiv.style.display = "flex";
                sablonDiv.innerHTML = `
                    <div class="questionadd" style="width: 100%;">
                        <select class="sablon-select" style="width: 100%; background: transparent; border: none; font-family: inherit; font-size: inherit; font-weight: inherit; color: inherit; cursor: pointer; text-align: center; text-align-last: center; outline: none; appearance: none;">
                            <option value="" disabled selected>Alkérdés sablon betöltése ▾</option>
                        </select>
                    </div>
                `;

                // Elemek fűzése a konténerbe
                gombKontener.appendChild(ujAlKerdesDiv);
                gombKontener.appendChild(sablonDiv);
                tartaly.prepend(gombKontener);

                // --- API HÍVÁS ÉS SABLONOK BEILLESZTÉSE ---
             // --- API HÍVÁS ÉS SABLON CSOPORTOK BEILLESZTÉSE (BIZTONSÁGOS) ---
                fetch(`/api/get-sablonok?modulId=${modulId}&userId=${userId}`)
                    .then(res => res.json())
                    .then(data => {
                        let sablonCsoportok = data.SABLON_CSOPORTOK || [];

                        const select = sablonDiv.querySelector('.sablon-select');
                        select.dataset.csoportok = JSON.stringify(sablonCsoportok);

                        sablonCsoportok.forEach((csoport, index) => {
                            if (csoport.elemek.some(e => e.valasz_ag === valaszAg)) {
                                const opt = document.createElement('option');
                                opt.textContent = csoport.nev;
                                opt.value = index;
                                select.appendChild(opt);
                            }
                        });
                    })
                    .catch(err => console.error("Sablon betöltés hiba:", err));

                // --- ESEMÉNYKEZELŐ (Eredeti Gomb) ---
              // --- ESEMÉNYKEZELŐ (Eredeti Gomb) ---
                ujAlKerdesDiv.addEventListener('click', async () => {
                    const { InlineQuestionCreator } = await import('../admin/upload/category_creator.js');
                    
                    const jelenlegiMaxKindex = filteredData.length > 0 ? Math.max(...filteredData.map(k => k.kindex)) : 0;
                    const ideiglenesDb = tartaly.querySelectorAll('.uj-ideiglenes-alkerdes').length;
                    const kovetkezoIndex = jelenlegiMaxKindex + ideiglenesDb + 1;

                    const mentesEredmeny = await InlineQuestionCreator.openSub(gombKontener, kovetkezoIndex);

                    if (mentesEredmeny) {
                        const { elem, adat } = mentesEredmeny;
                        
                        fetch('/api/alkerdesek', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                kerdesSzoveg: adat.szoveg,
                                negaltKerdesSzoveg: adat.negaltSzoveg,
                                negaltErtek: adat.negaltErtek, 
                                parentId: parentKerdes.id,
                                foKategoria: parentKerdes.foKategoria,
                                alKategoria: parentKerdes.alKategoria,
                                altTema: parentKerdes.altTema,
                                ertek: adat.ertek,
                                szoveges: adat.szoveges,
                                valaszAg: valaszAg,
                                maximalis_szint: adat.maxi,
                                kindex: kovetkezoIndex,
                                modulId: await modulIdBetoltve
                            })
                        }).then(res => res.json()).then(data => {
                            if (data.success) {
                                showSuccessToast("Alkérdés sikeresen hozzáadva!"); // <-- EZT ADD HOZZÁ
                        alKerdesMap = {}; 
                        alKerdesBatchPromise = null;                               
                        KategoriaKezelo.loadAlKerdesek(parentKerdes.id, valaszAg, parentKerdes);
                            } else {
                                console.error('Hiba:', data.message);
                            }
                        }).catch(err => console.error('Fetch hiba:', err));
                    }
                });

                // --- ESEMÉNYKEZELŐ (Sablon Select) ---
                // --- ESEMÉNYKEZELŐ (Sablon Select) ---
                sablonDiv.querySelector('.sablon-select').addEventListener('change', async (e) => {
                    const csoportIndex = e.target.value;
                    if (csoportIndex === "") return;

                    // Kinyerjük a kiválasztott sabloncsoportot a datasetből
                    const selectElem = e.target;
                    const sablonCsoportok = JSON.parse(selectElem.dataset.csoportok || '[]');
                    const csoport = sablonCsoportok[csoportIndex];

                    if (!csoport) return;

                    // Leszűrjük csak az aktuális ághoz (igen/nem) tartozó sablonokat
                    const relevansElemek = csoport.elemek.filter(s => s.valasz_ag === valaszAg);
                    const modulId = await modulIdBetoltve;
                    
                    // Kiszámoljuk a kiindulási kindexet
                    let jelenlegiMaxKindex = filteredData.length > 0 ? Math.max(...filteredData.map(k => k.kindex)) : 0;

                    // Végigmegyünk a sablonokon és a háttérben egyesével elmentjük őket
                    for (const sablon of relevansElemek) {
                        jelenlegiMaxKindex++; // Növeljük a sorszámot minden beszúrásnál

                        await fetch('/api/alkerdesek', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                kerdesSzoveg: sablon.szoveg,
                                negaltKerdesSzoveg: '', // A sablonokban alapból nincs negált szöveg tárolva
                                parentId: parentKerdes.id,
                                foKategoria: parentKerdes.foKategoria,
                                alKategoria: parentKerdes.alKategoria,
                                altTema: parentKerdes.altTema,
                                ertek: sablon.ertek || 0,
                                szoveges: sablon.szoveges,
                                valaszAg: valaszAg,
                                maximalis_szint: false, // Ezt is false-ra alapértelmezzük
                                kindex: jelenlegiMaxKindex,
                                modulId: modulId
                            })
                        }).catch(err => console.error('Sablon mentési hiba:', err));
                    }       
                            showSuccessToast("Alkérdés sikeresen hozzáadva!"); // <-- EZT ADD HOZZÁ
                            alKerdesMap = {}; 
                            alKerdesBatchPromise = null;
                    // Miután az összes fetch lefutott, újratöltjük az alkérdéseket, hogy megjelenjenek a DOM-ban
                    KategoriaKezelo.loadAlKerdesek(parentKerdes.id, valaszAg, parentKerdes);

                    // Select visszaállítása az alapértelmezett "Alkérdés sablon betöltése" állapotra
                    e.target.value = ""; 
                });
            }
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
                // A Date.now() megakadályozza, hogy a böngésző beragassza a régi adatokat a memóriába
                const resp = await fetch(`/api/get-all-alkerdesek?modulId=${modulId}&_t=${Date.now()}`);
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
document.addEventListener('DOMContentLoaded', () => {
    const helpButtons = document.querySelectorAll('.help');
    
    // Csak akkor dolgozunk, ha tényleg van "help" osztályú elem az oldalon
    if (helpButtons.length > 0) {
        
        // Modal alapjának létrehozása
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'help-modal-overlay';
        modalOverlay.style.display = 'none'; // Alapból rejtett
        
        modalOverlay.innerHTML = `
            <div class="help-modal-content">
                <button class="help-modal-close" title="Bezárás">&times;</button>
                <h2>Útmutató a kérdőív pontozásához (Példákkal)</h2>
                <div class="help-modal-body">
                    <p>Ez a kérdőívrendszer egy <strong>állapotfelmérő</strong> eszköz, amely mindig egy 0% és 100% közötti értéket ad eredményül. Azt mutatja meg, hogy az adott válaszok alapján a helyzet mennyire közelíti meg a tökéletes, ideális állapotot. A megadott pontszámokra tehát úgy érdemes gondolni, mint <strong>súlyokra</strong> vagy fontossági értékekre.</p>
                    
                    <h3>1. Az „Azonnali 100%” (A Joker szabály)</h3>
                    <p>Ha a szerkesztéskor egy alkérdésnél bekapcsolja a „Maximalizálja a pontszámot” opciót, az a válasz "Joker-ként" fog viselkedni. Ha a kitöltő ezt az opciót bejelöli, a rendszer minden további számolást leállít, és az a kérdésblokk azonnal 100%-os értékelést kap.</p>
                    <ul>
                        <li><strong>Példa:</strong> A főkérdés az, hogy <em>"Rendelkezik a cég minőségirányítási rendszerrel?"</em> Van egy Joker alkérdés: <em>"Igen, rendelkezünk hivatalos ISO tanúsítvánnyal."</em> Ha a kitöltő ezt bepipálja, a rendszer megadja a maximális 100%-ot a kérdésre, és nem veszi figyelembe az esetleges kisebb hiányosságokra utaló többi választ.</li>
                    </ul>

                    <h3>2. Amikor nincsenek alkérdések (Egyszerű főkérdések)</h3>
                    <p>Ha egy kérdés alatt nincsenek részletes állítások (alkérdések), a rendszer tisztán a főkérdés saját pontszámait használja.</p>
                    <ul>
                        <li><strong>IGEN válasz esetén:</strong> A rendszer megnézi az adott témakör (kategória) összes főkérdését. Amelyik a legmagasabb pontszámot kapta a szerkesztéskor, az lesz a kategória 100%-os csúcsa. A többi kérdés pontszámát ehhez viszonyítja.<br>
                        <em>Példa: Az 1. kérdés a legfontosabb, kap 10 pontot (ez a 100%). A 2. kérdés kevésbé fontos, kap 5 pontot. Ha a kitöltő a 2. kérdésre IGEN-t válaszol, az a témakör maximumához képest 50%-os eredményt jelent.</em></li>
                        <li><strong>NEM válasz esetén:</strong> A rendszer a kérdés "NEM" pontszámát a kérdés saját "IGEN" pontszámához (mint ideális állapothoz) viszonyítja.<br>
                        <em>Példa: A kérdés 10 pontot ér, ha IGEN, és 2 pontot, ha NEM. A NEM válasz kiválasztásakor a rendszer a 2-t a 10-hez méri, így az eredmény ezen a kérdésen 20% lesz.</em></li>
                    </ul>

                    <h3>3. Amikor vannak alkérdések (A részletes értékelés)</h3>
                    <p>Ha egy főkérdéshez tartoznak alkérdések, és a kitöltő be is jelöl közülük, a főkérdés eredeti pontszáma háttérbe szorul, és a rendszer csak az alkérdések pontjaiból számol. <br>
                    <strong>Fontos szabály:</strong> Ha valaki több alkérdést is bepipál, a rendszer az eredményeiket <strong>átlagolja</strong>, hogy egy reális középértéket mutasson meg.</p>
                    
                    <p><strong>A) Ha a főkérdésre a válasz IGEN:</strong><br>
                    A rendszer megkeresi a legmagasabb pontot érő IGEN alkérdést. Ezt tekinti a tökéletes állapotnak (100%).</p>
                    <ul>
                        <li><em>Példa:</em> Kérdés: <em>"Jól felszerelt az iroda?"</em> <br>
                        Alkérdés 1: <em>"Van drága, ergonomikus irodaszék"</em> (10 pont -> Ez a 100%).<br>
                        Alkérdés 1: <em>"Van nagy monitor"</em> (10 pont -> Ez is 100%).<br>
                        Alkérdés 2: <em>"Van egy rossz kávéfőző"</em> (5 pont -> A 10 ponthoz képest ez 50%).</li>
                        <li><em>Mi történik a kitöltésnél?</em> Ha a kitöltő mindhármat bepipálja, a rendszer átlagot von a 100%-ból és az 50%-ból. Az eredmény így 75% lesz. Mivel a rossz kávéfőző megléte a kiválasztásnál "lejjebb húzza" a tökéletes eredményt egy valósághűbb szintre.</li>
                    </ul>

                    <p><strong>B) Ha a főkérdésre a válasz NEM (és vannak IGEN alkérdések is):</strong><br>
                    A rendszer ilyenkor is az IGEN ág legmagasabb pontszámát (a tökéletes állapotot) tekinti 100%-os mércének. A kiválasztott negatív (NEM) állításokat ehhez az ideális állapothoz méri, majd átlagol.</p>
                    <ul>
                        <li><em>Példa az előző kérdéssel:</em> Az ideális állapot az ergonomikus szék (10 pont).<br>
                        NEM Alkérdés 1: <em>"Kicsi a dolgozóasztal"</em> (5 pont -> 50%-os probléma a 10 pontos eszményi állapothoz képest). Ha ezt bejelölik, az eredmény 50% lesz.</li>
                    </ul>

                    <p><strong>C) Ha a főkérdésre a válasz NEM (és EGYÁLTALÁN NINCSENEK IGEN alkérdések):</strong><br>
                    Mivel nincs IGEN alkérdés, a rendszer a főkérdés eredeti "IGEN" pontszámát használja 100%-os referenciaként.</p>
                    <ul>
                        <li><em>Példa:</em> Főkérdés: <em>"Vannak problémák a raktárban?"</em> (Főkérdés IGEN pontszáma: 10 pont).<br>
                        Csak NEM alkérdések szerepelnek alatta: <em>"Beázik a tető"</em> (8 pont).<br>
                        Ha a kitöltő ezt az állítást bejelöli, a rendszer a 8 pontot a főkérdés 10 pontjához viszonyítja, így a végeredmény 80% lesz.</li>
                    </ul>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);

        // Kattintás esemény a gombokra (megnyitás)
        helpButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Ha a .help egy link lenne
                modalOverlay.style.display = 'flex';
            });
        });

        // Bezárás az "X" gombbal
        const closeBtn = modalOverlay.querySelector('.help-modal-close');
        closeBtn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });

        // Bezárás a háttérre kattintva
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.style.display = 'none';
            }
        });
    }
});