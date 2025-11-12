import { kerdesValaszok, leirasok,kategoriakSzinek, szovegesValaszok } from './main_alap.js';
import { Kerdes } from './main_category.js';
import { Focus} from './main_quest_focus.js';
let alKerdesMap = {}; // Cache az alkérdésekhez
let alKerdesBatchPromise = null;

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
            if (value === 'igen') {
                // Főkérdés
                text = kerdes.szoveg; 
            } else if (value === 'nem' && kerdes.negaltKerdesSzoveg) {
                // Negált kérdés
                text = kerdes.negaltKerdesSzoveg;
            }
    
            if (text) {
                // Eldöntjük, hogy főkérdés vagy alkérdés
                if (kerdes.parentId) {
                    // Alkérdés
                    foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.parentId]
                      .alkerdesek.push(text);
                } else {
                    // Főkérdés
                    foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.id]
                      .kerdesek.push(text);
                }
            }
        }
        // 2) Szöveges válaszok (szovegesValaszok) beolvasása
        for (const [key, value] of Object.entries(szovegesValaszok)) {
            const trimmedVal = value.trim();
            if (!trimmedVal) continue;  // Üres szöveg esetén nincs megjelenítendő
    
            const kerdes = KategoriaKezelo.kerdesek.find(k => k.id === parseInt(key));
            if (!kerdes) continue;
    
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
    
            // A szöveges válasz mindig a "főkérdések" listájába kerül
            foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.parentId || kerdes.id]
              .kerdesek.push(trimmedVal);
        }    
// Összesített pontszám inicializálása
let osszesitettPontszam = 0;
// Összesített pontszám inicializálása

// 3) A táblázatos megjelenítés felépítése
for (const [foKategoriaNev, alKategoriak] of Object.entries(foKategoriak)) {
    // --- Fő kategória konténer ---
    const foKategoriaDiv = document.createElement('div');
    foKategoriaDiv.classList.add('fo-kategoria');

    // Fő kategória cím
    const foKategoriaCim = document.createElement('h3');
    foKategoriaCim.textContent = foKategoriaNev;
    foKategoriaDiv.appendChild(foKategoriaCim);

    // Táblázat létrehozása
    const table = document.createElement('table');
    table.classList.add('ertekeles-table'); // opcionális CSS osztály
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    let hasAlKategoria = false;
    let kategoriaOsszpont = 0; // Összpontszám ehhez a fő kategóriához

    // Végigmegyünk az alkategóriákon
    for (const [alKategoriaNev, altTemak] of Object.entries(alKategoriak)) {
        let hasAltTema = false;
        const altTemaRows = [];

        // Végigmegyünk az alt témákon
        for (const [altTemaNev, kerdesObj] of Object.entries(altTemak)) {
            const altTemaRow = document.createElement('tr');
            altTemaRow.classList.add('alt-tema');

            // Alt téma cella
            const altTemaCell = document.createElement('td');
            altTemaCell.classList.add('alt-tema');
            altTemaCell.textContent = altTemaNev + ":";
            altTemaRow.appendChild(altTemaCell);

            // Kérdések cella
            const kerdesekCell = document.createElement('td');
            kerdesekCell.classList.add('kerdesek');

            let hasKerdes = false;
            let altTemaOsszpont = 0; // Altéma szintű összegzés

            // Kérdések és alkérdések kiírása
            for (const [kerdesId, valaszok] of Object.entries(kerdesObj)) {
                if (valaszok.kerdesek.length > 0 || valaszok.alkerdesek.length > 0) {
                    const kerdesContainer = document.createElement('div');
                    kerdesContainer.classList.add('kerdes-container');

                    // Főkérdések
                    valaszok.kerdesek.forEach((alkerd) => {
                        const [szoveg, ertek, id, negalt_ertek] = alkerd;                                
                        const p = document.createElement('p');
                        p.classList.add('fokerd');
                        p.setAttribute('data-id', id);

                        let aktualisErtek = 0;

                        if (negalt_ertek > 0) {
                            p.setAttribute('data-ertek', negalt_ertek);
                            aktualisErtek = parseFloat(negalt_ertek) || 0;
                        } else {
                            p.setAttribute('data-ertek', ertek);
                            aktualisErtek = parseFloat(ertek) || 0;
                        }

                        // Az értékek összegzése
                        altTemaOsszpont += aktualisErtek;

                        // Ha vannak alkérdések, a főkérdés végén kettőspontot írunk, különben pontot
                        p.textContent = valaszok.alkerdesek.length > 0
                            ? (szoveg + ':')
                            : (szoveg + '.');
                        kerdesContainer.appendChild(p);
                    });

                    // Alkérdések
                    valaszok.alkerdesek.forEach((alkerd, index) => {    
                        const [szoveg, ertek, id] = alkerd;                                
                        const p = document.createElement('p');
                        p.setAttribute('data-ertek', ertek); 
                        p.setAttribute('data-id', id); 
                        p.classList.add('alkerd');

                        let aktualisErtek = parseFloat(ertek) || 0;
                        altTemaOsszpont += aktualisErtek;

                        // Utolsó alkérdés végére pontot, különben vesszőt írunk
                        p.textContent = index < valaszok.alkerdesek.length - 1 ? szoveg + ',' : szoveg + '.';
                        kerdesContainer.appendChild(p);
                    });

                    kerdesekCell.appendChild(kerdesContainer);
                    hasKerdes = true;
                }
            } 

            // Ha volt legalább egy kérdés, akkor illesztjük a sort a táblába
            if (hasKerdes) {
                kategoriaOsszpont += altTemaOsszpont;
                altTemaCell.textContent += `Altéma pontszáma: (${altTemaOsszpont} pont)`;
                altTemaRow.appendChild(kerdesekCell);
                altTemaRows.push(altTemaRow);
                hasAltTema = true;
            }
        }

        // Ha az adott alkategóriához legalább egy alt téma tartalmazott kérdést, akkor illesztjük be a táblába
        if (hasAltTema) {
            const alKatRow = document.createElement('tr');
            alKatRow.classList.add('al-kategoria');
            const alKatCell = document.createElement('td');
            alKatCell.colSpan = 2;  
            alKatCell.textContent = alKategoriaNev;
            
            alKatCell.classList.add('al-kategoria');
            alKatRow.appendChild(alKatCell);
            tbody.appendChild(alKatRow);

            altTemaRows.forEach(row => {
                tbody.appendChild(row);
            });

            hasAlKategoria = true;
        }
    }

    // Ha volt ténylegesen kérdés ebben a fő kategóriában, akkor illesztjük be
    if (hasAlKategoria) {
        foKategoriaDiv.appendChild(table);
        
        // Főkategória összpontszámának kiírása
        const osszegzesDiv = document.createElement('div');
        osszegzesDiv.classList.add('kategoriak-osszpontszama');
        osszegzesDiv.textContent = `Összpontszám: ${kategoriaOsszpont} pont`;
        foKategoriaDiv.appendChild(osszegzesDiv);

        container.appendChild(foKategoriaDiv);

        // 🔥 Főkategória összpontszámát hozzáadjuk az összesített pontszámhoz
        osszesitettPontszam += kategoriaOsszpont;
    }
}


// 🔥 Teljes összesített pontszám kiírása
const vegsoOsszegzesDiv = document.createElement('div');
vegsoOsszegzesDiv.classList.add('vegso-osszpontszam');
vegsoOsszegzesDiv.textContent = `Teljes értékelés összpontszáma: ${osszesitettPontszam} pont`;
container.appendChild(vegsoOsszegzesDiv);


    }

    //Főkategóriák    
    static loadFoKategoriak() {
        fetch('/api/get-fo_kategoriak') // Adatok lekérése az API-ból
            .then(response => response.json())
            .then(data => {
                const tartaly = document.getElementById('fo_kategoriak');
                tartaly.innerHTML = ''; // Tisztítsa meg a tartalmat, mielőtt új elemeket ad hozzá
                data.forEach(item => {
                    const kategoria = new Kategoria(item.nev, item.nev);
                    const div = kategoria.render(tartaly);
                    div.classList.add("fo");
                    div.textContent = "";

                    const cim = document.createElement("div");
                    div.appendChild(cim);
                    cim.classList.add("cim");
                    cim.innerHTML = item.nev;

                    const leiras = document.createElement("div");
                    div.appendChild(leiras);
                    leiras.classList.add("leiras");
                    leiras.innerHTML = leirasok[item.nev] || "Nincs elérhető leírás.";
                    div.style.background = kategoriakSzinek[item.nev] || "#ffffff";
                    div.addEventListener('click', () => Focus.toggleActiveClass(div, item.nev));
                });
            });
    }
    // Alkategóriák
    static async loadAlKategoriak(foKategoriaNev) {
        const response = await fetch(`/api/get-al_kategoriak?fo_kategoria_id=${foKategoriaNev}`);
        const data = await response.json();
        
        const tartaly = document.getElementById('al_kategoriak');
        await Focus.showContainer(tartaly); // Várakozás a megjelenítésre
        tartaly.innerHTML = ''; // Tisztítás
        
        data.forEach(item => {
            const kategoria = new Kategoria(item.nev, item.nev);
            const div = kategoria.render(tartaly);
            div.classList.add("al");
            div.addEventListener('click', () => {
                KategoriaKezelo.loadAltTemak(foKategoriaNev, item.nev);
                Focus.toggleActiveClassal(div, item.nev);
            });
            
            div.style.background = kategoriakSzinek[foKategoriaNev] || "#ffffff"; // Alkalmazza a fő kategória színét
        });
    }
    
    // Altémák
    static async loadAltTemak(foKategoriaNev, alKategoriaNev) {
        const response = await fetch(`/api/get-alt_temak?fo_kategoria_id=${foKategoriaNev}&al_kategoria_id=${alKategoriaNev}`);
        const data = await response.json();
        
        const tartaly = document.getElementById('alt_temak');
        await Focus.showContainer(tartaly); // Várakozás a megjelenítésre
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
    static loadKerdesek(foKategoriaNev, alKategoriaNev, altTemaNev) {
        fetch(`/api/get-kerdesek?fo_kategoria_id=${foKategoriaNev}&al_kategoria_id=${alKategoriaNev}&alt_tema_id=${altTemaNev}`)
            .then(response => response.json())
            .then(data => {
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
                        item.ertek
                    );

                    kerdes.render(tartaly);
                    KategoriaKezelo.kerdesek.push(kerdes); // Adja hozzá a kérdést a KategoriaKezelo.kerdesek tömbhöz
                });
            });
    }
    //Alkérdések
    static async loadAlKerdesek(parentId, valaszAg, parentKerdes) {
        const tartaly = document.getElementById(`alkerdesek-${parentId}`);
        
        try {
            // 🔹 Ha még nincs előre betöltött alkérdés, töltsük be
            if (Object.keys(alKerdesMap).length === 0) {
                console.log("⏳ Alkérdések előzetes betöltése...");
                await KategoriaKezelo.loadAllAlKerdesek();
            }
    
            // 🔹 Alkérdések lekérése a cache-ből
            const data = alKerdesMap[parentId] || [];
    
            // **🔹 ÚJ: Szűrés, hogy csak a megfelelő ághoz tartozó kérdéseket töltsük be**
            const filteredData = data.filter(item => item.valasz_ag === valaszAg);
            console.log("🔍 Szűrt alkérdések:", filteredData);

    
            // Korábbi alkérdések törlése
            tartaly.innerHTML = '';
    
            if (filteredData.length > 0) {
                tartaly.classList.remove('hidden');
                tartaly.classList.add('fade-in');
            } else {
                tartaly.classList.add('hidden');
            }
    
            // 🔹 Sorrendezett adatokat dolgozunk fel
            const sortedData = filteredData.sort((a, b) => a.kindex - b.kindex);
            const ag = valaszAg === 'igen' ? parentKerdes.igenAg : parentKerdes.nemAg;
            ag.length = 0; // Ürítjük az ágat
    
            // 🔹 Elemenkénti renderelés
            for (const item of sortedData) {
                ag.push(item.id);
                const kerdes = new Kerdes(
                    item.kindex,
                    item.id,
                    item.szoveg,
                    item.parent_id,
                    item.valasz_ag, // itt is figyeljük
                    item.negalt_kerdes_szoveg,
                    parentKerdes.foKategoria,
                    parentKerdes.alKategoria,
                    parentKerdes.altTema,
                    item.szoveges,
                    item.ertek
                );
                await kerdes.render(tartaly);
                KategoriaKezelo.kerdesek.push(kerdes);
            }
        } catch (error) {
            console.error('Hiba történt az alkérdések betöltése során:', error);
        }
    }
    
    
    static async loadAllAlKerdesek() {
        if (Object.keys(alKerdesMap).length > 0) {
            return alKerdesMap; // 📌 Ha már van adat, ne töltsük újra
        }
    
        if (!alKerdesBatchPromise) { 
            alKerdesBatchPromise = (async () => {
                try {
                    console.log("🔄 Alkérdések batch lekérdezése indul...");
                    const response = await fetch('/api/get-all-alkerdesek');
                    const data = await response.json();
                    alKerdesMap = data.alKerdesMap;
                    console.log("✅ Alkérdések betöltve és cache-ben tárolva.");
                    return alKerdesMap;
                } catch (error) {
                    console.error('Hiba történt az alkérdések betöltése során:', error);
                    return {};
                }
            })();
        }
    
        return alKerdesBatchPromise;
    }
    
    //Már meglévők betöltése
    static async loadValaszok() {
        const urlParams = new URLSearchParams(window.location.search);
        const kitoltesId = urlParams.get('kitoltes_id');
   
        if (!kitoltesId) {
            console.error('Hiányzó kitoltes_id az URL-ből!');
            return;
        }
    
        try {
            // Válaszok lekérése
            const response = await fetch(`/api/get-valaszok?kitoltes_id=${kitoltesId}`);
            const data = await response.json();
    
            if (data.success) {
                data.valaszok.forEach(valasz => {
                    if (valasz.valasz_szoveg && valasz.valasz_szoveg.trim() !== '') {
                        szovegesValaszok[valasz.kerdes_id] = valasz.valasz_szoveg.trim();
                    }
                    kerdesValaszok[valasz.kerdes_id] = valasz.kerdes_valasz;

                });
                console.log('Szöveges válaszok betöltve:', szovegesValaszok);

                console.log('Válaszok betöltve:', kerdesValaszok);
    
                // Kérdés-azonosítók összegyűjtése
                const kerdesIds = Object.keys(kerdesValaszok);
    
                // Ellenőrzés, hogy van-e mit lekérni
                if (kerdesIds.length === 0) {
                    console.log('Nincsenek még kitöltött kérdések, nincs mit lekérni.');
                    // Ha szükséges, ilyenkor is meghívhatod a frissitErtekelesekContainer()-t,
                    // hogy törölje vagy üresen jelenítse meg a táblázatot:
                    KategoriaKezelo.frissitErtekelesekContainer();
                    return;
                }
    
                // Kérdések lekérése
                const kerdesekResponse = await fetch(`/api/get-kerdesek-by-ids`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kerdesIds })
                });
                const kerdesekData = await kerdesekResponse.json();
    
                if (kerdesekData.success) {
                    console.log('Kérdések betöltve:', kerdesekData.kerdesek);
    
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
                            kerdes.ertek
                        );
                    
                        ujKerdes.hasNemAg = hasNemAgMap[kerdes.id] || false;
                    
                        const tartaly = document.getElementById('kerdesek');
                        ujKerdes.render(tartaly);
                        KategoriaKezelo.kerdesek.push(ujKerdes);
                    });
                    // Táblázat frissítése
                    KategoriaKezelo.frissitErtekelesekContainer();
                }
            } else {
                console.error('Hiba történt a válaszok lekérése során:', data.message);
            }
        } catch (error) {
            console.error('Fetch hiba:', error);
        }
    }
}
