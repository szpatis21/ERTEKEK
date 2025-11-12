//Szerkesztőmodul JS főfájl
import { modulIdBetoltve } from '/private/main/main_alap.js';
import{alhozzadinnerHTML,generateAlkerdesHTML,alkerdesBlokk} from './updatecont.js';
let SABLONOK = [];
let optionSets = {};


    
    //Selectek
    const alKategoriaSelect =  document.querySelector('#alKategoriaSelect');
    const altTemaSelect = document.querySelector('#altTemaSelect');
    const foKategoriaSelect = document.querySelector('#foKategoria');
    //Kategóriák
    const fokategoria= document.querySelector('#foKategoria');
    const alkategoria= document.querySelector('#alKategoria');
    const altTema =document.querySelector('#altTema');
    const kerdes = document.querySelector("#kerdesSzoveg");
    //Apróságok
    const mentes = document.querySelector("#ment");
    const al_ertek = document.querySelector(".al_ertek");
    const ertek = document.querySelector("#ertek");

    let editingKerdesId = null;
    const checkbox = document.querySelector("#checkbox");
    const cimer2 = document.querySelector(".alkerdcimer");
    const sabiCbx = document.getElementById('sabi');
    const sablonhoznemkell = document.querySelector(".sablonhoznemkell");
    const tarolo  = document.querySelector('.nagyok2'); 




//Modul ID lekérése a jogosultságok ellenőrzése végett

 

    document.getElementById('ertek').value = 0;
    document.getElementById('ertekmin').value = 0;
                // itt tároljuk, ha a modulId érkezik előbb
let optionSetsReady = false;     // jelző, hogy a JSON már beért

function tryInitSelect() {
  if (optionSetsReady && modulId !== undefined) {
    loadSelect(modulId);         // csak egyszer fut, amikor minden készen áll
  }
}

// 1) Modul-ID
modulIdBetoltve.then(id => {
  modulId = Number(id);
  console.log('[modulId]', modulId);
  tryInitSelect();
});

// 2) JSON
fetch('/private/info/temakorok.json')       // ← pontos útvonal!
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(data => {
    SABLONOK   = data.SABLONOK;
    optionSets = data.optionSets;
    optionSetsReady = true;
    console.log('[JSON betöltve]', SABLONOK.length, 'sablon');
    tryInitSelect();
  })
  .catch(err => console.error('temakorok.json hiba:', err));

function loadSelect(id) {
  const select = document.getElementById('foKategoria');
  const opts   = optionSets[id];
  if (!opts) {
    select.innerHTML = '<option disabled selected>Ismeretlen modul</option>';
    return;
  }
  select.replaceChildren();              // tisztít
  opts.forEach(o =>
    select.add(new Option(o.text, o.value, o.selected, o.selected))
  );
}
    modulIdBetoltve.then(loadSelect);
        let modulId;                  
    modulIdBetoltve.then(id => {
        modulId = Number(id); 
        loadSelect(modulId);
    });

// Előre létrehozott sablonok
function removeSablonok() {
  tarolo.querySelectorAll('.alok.sablon').forEach(el => el.remove());
  let i = 1;
  tarolo.querySelectorAll('.al_kindex').forEach(inp => inp.value = i++);
}
 //Sablon checkbox figyelő
    sabiCbx.addEventListener('change', e => {
    if (e.target.checked) {
        removeSablonok();          
        let next = Math.max(0,
        ...Array.from(tarolo.querySelectorAll('.al_kindex'))
                .map(i => Number(i.value) || 0));

        SABLONOK.forEach(obj => {
        const blokk = alkerdesBlokk({ ...obj, sorszam: ++next });
        blokk.classList.add('sablon');
        tarolo.appendChild(blokk);
        sablonhoznemkell.style.display="none";
        });
    } else {
        removeSablonok(); 
        sablonhoznemkell.style.display="flex";
    }
    });

//Funkciók exportálása a main fájlba
    //TÖRLÉS
        //Törlés Listanézetben
    export function torlesButton(id, isAlkerdes = false) {
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = `<span class="material-symbols-rounded">delete</span>`;
        deleteButton.classList.add('delete-button');

        deleteButton.addEventListener('click', () => {
            const url = isAlkerdes ? `/alkerdesek/${id}` : `/kerdesek/${id}`;
            const alokBlock = deleteButton.closest('.question'); // a legközelebbi .alok blokk

            if (confirm(`Biztosan törölni szeretné ezt a kérdést?  
                ${alokBlock?.querySelector('.al_kerdesSzoveg')?.value || 'Ismeretlen'}  
                A törlés végleges.`)) {
                fetch(url, { method: 'DELETE' })
                .then(response => response.json())
                .then(result => {
                    if (result.message) {
            removeElementsById(id);

                        alert('Kérdés törölve');
                        if (alokBlock) alokBlock.remove();
                    }
                })
                .catch(error => console.error('Hiba történt:', error));
            }
        });

        return deleteButton;
    }
        //Törlés szerkesztőben
    document.addEventListener('click', (e) => {
            if (e.target.classList.contains('kuka')) {
                const alkerdesDiv = e.target.closest('.alok');
                const idElem = alkerdesDiv.querySelector('[name="parentId"]');
                const alkerdesId = idElem ? idElem.value : null;

                if (alkerdesId) {
                    // Törlés a szerverről
                    fetch(`/alkerdesek/${alkerdesId}`, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(result => {
                        if (result.message) {
                        removeElementsById(alkerdesId);
                            alert('Alkérdés törölve');
                            alkerdesDiv.remove();
                        }
                    })
                    .catch(err => console.error(err));
                } else {
                    // Ha nincs ID (még nem mentett), csak töröld a DOM-ból
                    alkerdesDiv.remove();
                }
            }
        });
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('kuka2')) {
                const alkerdesDiv = e.target.closest('.alok');
                    alkerdesDiv.remove();
            }
        });

    function removeElementsById(id) {
    // 1) Listanézet
    const q = document.querySelector(`.question[data-id="${id}"]`);
    if (q) q.remove();
    // 2) Szerkesztő nézet: minden .alok blokk, amiben parentId == id
    document
        .querySelectorAll('#szerkeszto .alok input[name="parentId"]')
        .forEach(input => {
        if (input.value === String(id)) {
            const block = input.closest('.alok');
            if (block) block.remove();
        }
        });
    }

    //SZERKESZTÉS
    export function szerkesztoButton(id) {
        const editButton = document.createElement('button');
        editButton.innerHTML = `<span class="material-symbols-rounded">edit</span>`;
        editButton.classList.add('edit-button');
        editButton.addEventListener('click', () => {
            szerkesztes(id); // Meghívjuk a szerkesztést az aktuális kérdés ID-jével

            // szépen rágurul a #szerkeszto div-re
            document.querySelector('#szerkeszto').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });

        return editButton;
    }
        const editButton = document.createElement('button');
        editButton.textContent = 'Szerkesztés';
        editButton.classList.add('edit-button');
        editButton.addEventListener('click', () => {
            szerkesztes(kerdes); // Meghívjuk a szerkesztést az aktuális kérdés adataival
        });
        
//Select elemek autofill
    //Fő katagória
    foKategoriaSelect.addEventListener('change', function () {
        const selectedFoKategoria = this.value;

        // Alapértelmezett értékek beállítása
        alkategoria.value = "";
        altTema.value = "";
    
        // Al- és altéma select elemek tisztítása
        alKategoriaSelect.innerHTML = '<option value="" disabled selected>...válasszon alkategóriát</option>';
        altTemaSelect.innerHTML = '<option value="" disabled selected>...vagy válasszon egy altémát</option>';
    
        if (selectedFoKategoria) {
            fetch(`/alkategoriak?foKategoria=${encodeURIComponent(selectedFoKategoria)}`)
                .then(response => response.json())
                .then(data => {
                    data.forEach(alkategoria => {
                        const option = document.createElement('option');
                        option.value = alkategoria.nev;
                        option.textContent = alkategoria.nev;
                        alKategoriaSelect.appendChild(option);
                    });
                })
                .catch(error => console.error('Hiba történt az alkategóriák lekérdezésekor:', error));
        }
    });
    //Al kategória
    alKategoriaSelect.addEventListener('change', function () {
        alkategoria.value = this.value;
        document.querySelector('#altTema').value = "";
    
        const selectedFoKategoria = fokategoria.value;
        const selectedAlKategoria = this.value;
    
        // Altéma select tisztítása
        altTemaSelect.innerHTML = '<option value="" disabled selected>...vagy válasszon egy altémát</option>';
    
        if (selectedFoKategoria && selectedAlKategoria) {
            fetch(`/altTemak?foKategoria=${encodeURIComponent(selectedFoKategoria)}&alKategoria=${encodeURIComponent(selectedAlKategoria)}`)
                .then(response => response.json())
                .then(data => {
                    data.forEach(altTema => {
                        const option = document.createElement('option');
                        option.value = altTema.nev;
                        option.textContent = altTema.nev;
                        altTemaSelect.appendChild(option);
                    });
                })
                .catch(error => console.error('Hiba történt az altémák lekérdezésekor:', error));
        }
    });
    //Al téma
    altTemaSelect.addEventListener('change', function () {
        altTema.value = this.value;
    });

    //Alkérdésekre vonatkozó chek
    checkbox.addEventListener("click", function () {
        if (checkbox.checked) {
            cimer2.style.display = "flex";
            document.querySelector("#ertekdiv1").style.display = 'none';
            document.querySelector("#ertekdiv2").style.display = 'none';
            document.querySelector("#ertek").value = "0";
            document.querySelector("#ertekmin").value = "0";
            document.querySelector("#alkerdesek_from").style.display = 'flex';
            document.querySelector('.nagyok2').appendChild(document.querySelector("#alkerdesek_from"));
        } else {
            document.querySelector("#ertekdiv1").style.display = "flex";
            document.querySelector("#ertekdiv2").style.display = "flex";
            cimer2.style.display = "none";
            document.querySelector("#ertek").value = "";
            document.querySelector("#ertekmin").value = "";
            document.querySelector("#alkerdesek_from").style.display = 'none';
            removeSablonok();

            // sablon gomb visszahozása
            if (typeof sablonhoznemkell !== 'undefined') {
                sablonhoznemkell.style.display = "flex";
            }
            const sabi = document.getElementById('sabi');
            if (sabi) {
                sabi.checked = false;
            }
        }
    });

// Funkciók a szerkesztősávban
    //Szerkesztés
        function szerkesztes(kerdesId) {
            editingKerdesId = kerdesId; // Beállítjuk az aktuális szerkesztett kérdés ID-ját
            console.log(editingKerdesId);
        
            // Kérés az adott ID-jú kérdés és hozzá kapcsolódó adatok lekérésére
            fetch(`/kerdesek/csoportos-frissites?id=${kerdesId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Hiba történt a kérdés adatainak lekérésekor');
                    }
                    return response.json();
                })
                .then(kerdesAdatok => {
                    const { foKerdes, alkerdesek } = kerdesAdatok; // Különválasztjuk a fő kérdést és az alkérdéseket
        
                    // Fő kérdés adatainak betöltése az űrlapba
                    document.querySelector("#foKategoria").value = foKerdes.fo_kategoria || '';
                    document.querySelector("#alKategoria").value = foKerdes.al_kategoria || '';
                    document.querySelector("#altTema").value = foKerdes.alt_tema || '';
                    document.querySelector("#kerdesSzoveg").value = foKerdes.kerdes_szoveg || '';
                    document.querySelector("#ertek").value = foKerdes.ertek || '';
                    document.querySelector("#ertekmin").value = foKerdes.negalt_ertek || '';
                    document.querySelector("#szoveges").checked = foKerdes.szoveges || false;
                    document.querySelector("#negaltKerdesSzoveg").value = foKerdes.negalt_kerdes_szoveg || '';
                    document.querySelector("#kindex").value = foKerdes.kindex || '';

        
                    // Dinamikus alkategória feltöltés
                    if (foKerdes.fo_kategoria) {
                        fetch(`/alkategoriak?foKategoria=${encodeURIComponent(foKerdes.fo_kategoria)}`)
                            .then(response => response.json())
                            .then(data => {
                                const alKategoriaSelect = document.querySelector('#alKategoriaSelect');
                                alKategoriaSelect.innerHTML = '<option value=""></option>'; // Üres alapállapot
                                data.forEach(alkategoria => {
                                    const option = document.createElement('option');
                                    option.value = alkategoria.nev;
                                    option.textContent = alkategoria.nev;
                                    alKategoriaSelect.appendChild(option);
                                });
                                // Beállítjuk az aktuális alkategóriát
                                alKategoriaSelect.value = foKerdes.al_kategoria || '';
                            });
                    }
        
                    // Dinamikus altéma feltöltés
                    if (foKerdes.fo_kategoria && foKerdes.al_kategoria) {
                        fetch(`/altTemak?foKategoria=${encodeURIComponent(foKerdes.fo_kategoria)}&alKategoria=${encodeURIComponent(foKerdes.al_kategoria)}`)
                            .then(response => response.json())
                            .then(data => {
                                            cimer2.style.display = "flex";

                                const altTemaSelect = document.querySelector('#altTemaSelect');
                                altTemaSelect.innerHTML = '<option value=""></option>'; // Üres alapállapot
                                data.forEach(altTema => {
                                    const option = document.createElement('option');
                                    option.value = altTema.nev;
                                    option.textContent = altTema.nev;
                                    altTemaSelect.appendChild(option);
                                });
                                // Beállítjuk az aktuális altémát
                                altTemaSelect.value = foKerdes.alt_tema || '';
                            });
                    }
        
                    // Alkérdések betöltése
                    const nagyok2Elem = document.querySelector('.nagyok2');
                    nagyok2Elem.innerHTML = '';
        
                    if (alkerdesek && Array.isArray(alkerdesek)) {
						    alkerdesek.sort((a, b) => a.kindex - b.kindex); // Rendezés a kindex szerint

                        alkerdesek.forEach(alk => {
                            const lerendereltDiv = document.createElement("div");
                            lerendereltDiv.classList.add("alok");
        
                            lerendereltDiv.innerHTML = generateAlkerdesHTML(alk);
                            lerendereltDiv.setAttribute('id', alk.id || '');


                            nagyok2Elem.appendChild(lerendereltDiv);
                        });
                    } else {
                        console.warn("Nincsenek alkérdések ehhez a kérdéshez.");
                    }
        
                    const nagyok = document.querySelector(".nagyok2");
                    const addButton = document.createElement('div');
                    addButton.id = 'hozzad';
                    addButton.innerHTML = '+';
                    nagyok.appendChild(addButton);
                    addButton.addEventListener('click', hozzad);
                })
                .catch(error => {
                    console.error('Hiba történt:', error);
                    alert('Nem sikerült betölteni a kérdés adatait.');
                });
        }
    //Alkérdés ablakok hozzáadása
        function hozzad() {
            let alhozzad = document.createElement("div");
            alhozzad.classList.add("alok");
            alhozzad.innerHTML= alhozzadinnerHTML;
            document.querySelector('.nagyok2').appendChild(alhozzad);
            const nextIndex =
                Math.max(0,
                    ...Array.from(document.querySelectorAll('.al_kindex'))
                            .map(inp => Number(inp.value) || 0)
                ) + 1;

    // frissen létrehozott input kitöltése
    alhozzad.querySelector('.al_kindex').value = nextIndex;
                const pontInput = alhozzad.querySelector('.al_ertek');
                pontInput.innerHTML = "0"
                if (pontInput) pontInput.value = 0;
                }
        document.querySelector('#hozzad').addEventListener('click', hozzad);

//Mentés és validálás
    //Mentés
    function hozzadKerdest() {
        const method = editingKerdesId ? 'PATCH' : 'POST';
        const url = editingKerdesId ? `/kerdesek/${editingKerdesId}` : '/kerdesek';
    
        // Megjelenítjük az animációt
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';
        const logobelso = document.querySelector(".gold");
              
    
        // Mentési folyamat kezdési időpontja
        const startTime = Date.now();
    
        const foKategoriaElem = document.querySelector("#foKategoria");
        if (!foKategoriaElem) {
            throw new Error("#foKategoria elem nem található");
        }
        const foKategoria = foKategoriaElem.value;
    
        const alKategoriaElem = document.querySelector("#alKategoria");
        if (!alKategoriaElem) {
            throw new Error("#alKategoria elem nem található");
        }
        const alKategoria = alKategoriaElem.value;
    
        const altTemaElem = document.querySelector("#altTema");
        if (!altTemaElem) {
            throw new Error("#altTema elem nem található");
        }
        const altTema = altTemaElem.value;
    
        const kerdesSzovegElem = document.querySelector("#kerdesSzoveg");
        if (!kerdesSzovegElem) {
            throw new Error("#kerdesSzoveg elem nem található");
        }
        const kerdesSzoveg = kerdesSzovegElem.value;
    
        const negaltKerdesSzovegElem = document.querySelector("#negaltKerdesSzoveg");
        const negaltKerdesSzoveg = negaltKerdesSzovegElem ? negaltKerdesSzovegElem.value : '';
    
        const ertekElem = document.querySelector("#ertek");
        const ertek = ertekElem ? ertekElem.value : '';

        const ertekElemMin = document.querySelector("#ertekmin");
        const negalt_ertek = ertekElemMin ? ertekElemMin.value : '';

        const kindexElem = document.querySelector("#kindex");
        const kindex = kindexElem ? kindexElem.value : '';
    
        const szovegesElem = document.querySelector("#szoveges");
        const szoveges = szovegesElem ? szovegesElem.checked : false;
        const fo_maxiElem = document.querySelector('[name="fo_maxi"]');
        const fo_maxi = fo_maxiElem ? fo_maxiElem.checked : false;
        const alkerdesek = Array.from(document.querySelectorAll('.alok')).map(alok => {
            const al_kerdesSzovegElem = alok.querySelector('[name="al_kerdesSzoveg"]');
            const al_kerdesSzoveg = al_kerdesSzovegElem ? al_kerdesSzovegElem.value : '';
    
            const al_negaltKerdesSzovegElem = alok.querySelector('[name="al_negaltKerdesSzoveg"]');
            const al_negaltKerdesSzoveg = al_negaltKerdesSzovegElem ? al_negaltKerdesSzovegElem.value : '';
    
            const al_ertekElem = alok.querySelector('[name="al_ertek"]');
            const al_ertek = al_ertekElem ? al_ertekElem.value : '';

            const al_kindexElem = alok.querySelector('[name="al_kindex"]');
            const al_kindex = al_kindexElem ? al_kindexElem.value : '';
    
            const al_szovegesElem = alok.querySelector('[name="al_szoveges"]');
            const al_szoveges = al_szovegesElem ? al_szovegesElem.checked : false;
    
            const valasz_agElem = alok.querySelector('[name="valasz_ag"]');
            const valasz_ag = valasz_agElem ? valasz_agElem.value : null;
    
            const parentIdElem = alok.querySelector('[name="parentId"]');
            const parentId = parentIdElem ? parentIdElem.value : null;
    
              const al_maxiElem = alok.querySelector('[name="al_maxi"]');
              const al_maxi = al_maxiElem ? al_maxiElem.checked : false;

            return {
                al_kerdesSzoveg,
                al_negaltKerdesSzoveg,
                al_ertek,
                al_kindex,
                szoveges: al_szoveges,
                valasz_ag,
                maximalis_szint: al_maxi,
                parentId,
                modulId
            };
        }).filter(alk => alk.al_kerdesSzoveg && alk.al_ertek);
    
        const data = {
            foKategoria,
            alKategoria,
            altTema,
            kerdesSzoveg,
            negaltKerdesSzoveg,
            ertek,
            negalt_ertek,
            kindex,
            szoveges,
            alkerdesek,
            maximalis_szint: fo_maxi,
            modulId
        };
    
        console.log('Küldött adat:', JSON.stringify(data, null, 2));
    
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {

                return response.json().then(error => {
                    throw new Error(error.message || 'Hiba történt a szerveren');
                });
            }
            return response.json();
        })
        .then(result => {
            if (result.message) {
                const logobelso = document.getElementById('logobelso'); // Feltételezve, hogy van ilyen ID-d
            
                // Először frissítjük az üzenetet
                logobelso.innerHTML = "Frissítés";
                logobelso.style.fontSize = 'large';
                logobelso.style.textAlign = "center";
            
                // 2 másodperc múlva új üzenet animált változtatása
                setTimeout(() => {
                    logobelso.classList.add('fade-out');
            
                    setTimeout(() => {
                        logobelso.innerHTML = result.message + " Az oldal újratölt";
                        logobelso.style.fontSize = 'medium';
                        logobelso.classList.remove('fade-out');
                        logobelso.classList.add('fade-in'); 
            
                        // Az oldal újratöltése 2 másodperc múlva
                        setTimeout(() => {
                            location.reload();
                        }, 3000);
                    }, 500); 
                }, 2000); 
                        
               
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(4000 - elapsedTime, 0); 
    
                setTimeout(() => {
                    loadingOverlay.style.display = 'none'; // Animáció eltüntetése
                   
                    setTimeout(() => {
                        location.reload();
                    }, 500);
                }, remainingTime);
            }
        })
        .catch(error => {
            console.error('Hiba történt:', error.message);
            loadingOverlay.style.display = 'none';
            alert('Hiba történt: ' + error.message);
        });
    }
    const mentButton = document.querySelector('#ment');

    //Validálás
    if (mentButton && !mentButton.hasEventListener) {
        mentButton.addEventListener('click', (e) => {
            e.preventDefault();
    
            const foKategoriaSelect = document.querySelector('#foKategoria');
            if (!foKategoriaSelect || foKategoriaSelect.value === '') {
                alert('Kérem, válasszon egy főkategóriát!'); 
                return; 
            }
            if (alkategoria.value !== '' || (alKategoriaSelect && alKategoriaSelect.value !== '')) {
                
            } else {
                alert('Kérem, válasszon vagy adjon meg egy alkategóriát!'); 
                return; 
            }
            if (altTema.value !== '' || (altTemaSelect && altTemaSelect.value !== '')) {
            } else {
                alert('Kérlem, válasszon vagy adjon meg egy alTémát!'); 
                return; 
            }
            if (!kerdesSzoveg || kerdesSzoveg.value === '') {
                alert('Kérem, adjon meg egy kérdést/állítást!'); 
                return; 
            }
            const al_ertekek = document.querySelectorAll('.al_ertek'); 

            let vanErtek = false;
            
            if (ertek.value !== '') {
                vanErtek = true;
            }
            
            al_ertekek.forEach(input => {
                if (input.value !== '') {
                    vanErtek = true;
                }
            });
            
            if (!vanErtek) {
                alert('Kérem, adjon meg pontszámot legalább egy mezőben!'); // Figyelmeztetés
                return; // Megállítja a folyamatot
            }
            
            hozzadKerdest();
        });
        mentButton.hasEventListener = true;
    }

    //Ha szöveges akkor nincsenek alkérdései a fő nek, meg vissza is
        function bindMutualExclusive(a, b) {
            a.addEventListener('change', () => {
                if (a.checked) {
                    b.checked = false;
                    b.disabled = true;
                    b.dispatchEvent(new Event('click'));
                } else {
                    b.disabled = false;
                }
            });
        }
        if (szoveges && checkbox) {
            bindMutualExclusive(szoveges, checkbox);
            bindMutualExclusive(checkbox, szoveges);
        }
