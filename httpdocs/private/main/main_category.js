//Kérdések renderlelése. Kérdés szöveg, csúszka, és alsó ágak

import { kerdesValaszok, szovegesValaszok } from './main_alap.js';
import { KategoriaKezelo } from './main_quest.js';
import { Focus} from './main_quest_focus.js';
//Kérdés osztály 
let hasNemAgMap = {}; // Az összes kérdéshez előre eltároljuk az adatokat
let hasNemAgBatchPromise = null; // Megakadályozza a többszörös lekérdezést
export class Kerdes {
    constructor(kindex, id, szoveg, parentId, valaszAg, negaltKerdesSzoveg, foKategoria, alKategoria, altTema, szoveges, ertek, negalt_ertek,ossz_ertek, maximalis_szint) {
        this.kindex = kindex;
        this.id = id;
        this.szoveg = szoveg;
        this.parentId = parentId;
        this.valaszAg = valaszAg;
        this.negaltKerdesSzoveg = negaltKerdesSzoveg;
        this.igenAg = [];
        this.nemAg = [];
        this.foKategoria = foKategoria;
        this.alKategoria = alKategoria;
        this.altTema = altTema;
        this.szoveges = szoveges;
        this.ertek = ertek;
        this.negalt_ertek = negalt_ertek;
        this.ossz_ertek = ossz_ertek; 
        this.maximalis_szint = maximalis_szint;
    };

    // Létezik ez az adott alkérdésnem nem ága
    static async hasNemAgBatch(kerdesIds) {
        if (Object.keys(hasNemAgMap).length > 0) {
            return hasNemAgMap; 
        }
    
        if (!hasNemAgBatchPromise) { 
            hasNemAgBatchPromise = (async () => {
                try {
/*                     console.log("🔄 Batch lekérdezés indítása..."); // Debug log
 */                  const { modulIdBetoltve } = await import('./main_alap.js');
const modulId = await modulIdBetoltve;

const response = await fetch('/api/check-nem-ag-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kerdesIds, modulId }) // ← modulId hozzáadása!
});

    
                    if (!response.ok) {
                        throw new Error('Hiba a batch lekérdezés során');
                    }
    
                    const data = await response.json();
                    hasNemAgMap = data.hasNemAgMap; //Tárolás
/*                     console.log("✅ Batch lekérdezés sikeres, adatok letárolva.");
 */                    return hasNemAgMap;
                } catch (error) {
                    console.error(error);
                    return {};
                }
            })();
        }
    
        return hasNemAgBatchPromise; // Ha a lekérdezés még folyamatban van, várja meg
    }
    
    
    //Kérdések létrehozása, igen-ures-nem pozíciok létrehozása és formázása
    async render(tartaly) {
        const kerdesmodul = document.createElement("div");
        kerdesmodul.classList.add("kerdesmodul");
        kerdesmodul.setAttribute('data-kindex', this.kindex); 

        const div = document.createElement('div');
        div.textContent = this.szoveg;
        div.setAttribute('data-id', this.id);
        div.setAttribute('data-value', this.ertek);
        div.classList.add('question');
        kerdesmodul.appendChild(div);
        
        //HA szerkesztő mód...
     
        
        
        
            const csuszka = document.createElement("div");
            csuszka.classList.add("csuszka");
            div.appendChild(csuszka);
            if (document.getElementById('szerkeszto')) {
                // 🔸 Szerkesztő sáv létrehozása
                const szerkesztolec = document.createElement("div");
                szerkesztolec.classList.add("szerkesztolec");
                div.appendChild(szerkesztolec);
            
                // 🔸 Pont, sorszám, százalék
                const indexdiv = document.createElement('div');
                indexdiv.classList.add('index');
                indexdiv.textContent = this.kindex + " sorszám" || "Nincs sorszám megadva";
                indexdiv.setAttribute('data-id', this.kindex);
            
                const pontdiv = document.createElement('div');
                pontdiv.classList.add('ertek');
                pontdiv.textContent = this.ertek + " pont" || "Nincs érték megadva";
                pontdiv.setAttribute('data-id', this.ertek);
            
                szerkesztolec.appendChild(indexdiv);
                szerkesztolec.appendChild(pontdiv);
            
                // 🔸 SZÁZALÉKOS TELJESÍTMÉNY DOBOZ (ha alkérdés)
                if (this.parentId && typeof this.ossz_ertek !== 'undefined' && !this.szoveges){
                    const arany = Math.round(this.ossz_ertek);
                    const szazalekDiv = document.createElement("div");
                    szazalekDiv.classList.add("szazalekdoboz");
                    szazalekDiv.textContent = `${arany}%`;
            
                    // 🎯 Szín logika
                    if (arany >= 80) {
                        szazalekDiv.style.background = "#b2ffb2";
                    } else if (arany >= 50) {
                        szazalekDiv.style.background = "#fff9b2";
                    } else {
                        szazalekDiv.style.background = "#ffc2c2";
                    }
            
                    pontdiv.appendChild(szazalekDiv);
                }
            
                // 🔸 Gombok
                const { szerkesztoButton, torlesButton } = await import("/private/admin/upload/updateFletch.js");
                const editButton = szerkesztoButton(this.id, false);
                const deleteButton = torlesButton(this.id, false);
                editButton.classList.add("szerkesztogomb");
                deleteButton.classList.add("szerkesztogomb");
            
                szerkesztolec.appendChild(editButton);
                szerkesztolec.appendChild(deleteButton);
            }
            const gomboc = document.createElement("div");
            gomboc.classList.add("gomboc");

            //IGEN ág Checkbox
            const radioIgen = document.createElement('input');
            radioIgen.setAttribute('type', 'radio');
            radioIgen.classList.add("igen");
            radioIgen.setAttribute('name', `valasz-${this.id}`);
            radioIgen.setAttribute('value', 'igen');
            radioIgen.checked = kerdesValaszok[this.id] === 'igen';
            radioIgen.addEventListener('change', this.toggleValtozasKezeles.bind(this));

            const labelIgen = document.createElement('label');
            labelIgen.classList.add('labeligen');
            labelIgen.appendChild(radioIgen);
            
            const labelIgenSzoveg = document.createElement('div');
            labelIgenSzoveg.classList.add("material-symbols-rounded")
            labelIgenSzoveg.textContent = 'check';
            labelIgenSzoveg.classList.add('igenszoveg');

            const labelIgenSzoveg2 = document.createElement('div');
            labelIgenSzoveg2.classList.add("tooltip")
            labelIgenSzoveg2.innerHTML=`Igen, ${this.szoveg}`;
            labelIgenSzoveg.addEventListener('mouseenter', () => {
                labelIgenSzoveg2.style.opacity = '1';
                labelIgenSzoveg2.style.visibility = 'visible';
              });
              
              labelIgenSzoveg.addEventListener('mouseleave', () => {
                labelIgenSzoveg2.style.opacity = '0';
                labelIgenSzoveg2.style.visibility = 'hidden';              
            });
  
            labelIgen.appendChild(labelIgenSzoveg2);
            labelIgen.appendChild(labelIgenSzoveg);

            //ÜRES ág
            const radioUres = document.createElement('input');
            radioUres.setAttribute('type', 'radio');
            radioUres.classList.add("ures");
            radioUres.setAttribute('name', `valasz-${this.id}`);
            radioUres.setAttribute('value', 'ures');
            radioUres.checked = kerdesValaszok[this.id] === 'ures';
            radioUres.addEventListener('change', this.toggleValtozasKezeles.bind(this));

            const labelUres = document.createElement('label');
            labelUres.textContent = '';
            labelUres.classList.add("labelures");
            labelUres.appendChild(radioUres);

            const labeUresSzoveg = document.createElement('div');
            labeUresSzoveg.classList.add("material-symbols-rounded")
            labeUresSzoveg.textContent = 'settings_ethernet';
            labeUresSzoveg.setAttribute('title', `Kattintson a válasz elvetéséhez.`);
            labeUresSzoveg.classList.add('uresszoveg');
            labelUres.appendChild(labeUresSzoveg);
            csuszka.appendChild(labelUres);
            csuszka.appendChild(labelIgen); 

            if (this.negaltKerdesSzoveg || (await Kerdes.hasNemAgBatch([this.id]))[this.id]) {
                const radioNem = document.createElement('input');
                radioNem.setAttribute('type', 'radio');
                radioNem.classList.add("nem");
                radioNem.setAttribute('name', `valasz-${this.id}`);
                radioNem.setAttribute('value', 'nem');
                radioNem.checked = kerdesValaszok[this.id] === 'nem';
                radioNem.addEventListener('change', this.toggleValtozasKezeles.bind(this));

                const labelNem = document.createElement('label');
                labelNem.textContent = '';
                labelNem.classList.add('labelnem');
                labelNem.appendChild(radioNem);
                const labelNemSzoveg = document.createElement('div');
                labelNemSzoveg.classList.add("material-symbols-rounded")

                labelNemSzoveg.textContent = 'close';
                labelNemSzoveg.classList.add('nemszoveg');
                labelNem.appendChild(labelNemSzoveg);

                const labelNemSzoveg2 = document.createElement('div');
                labelNemSzoveg2.classList.add("tooltip2");
                labelNem.appendChild(labelNemSzoveg2);

                labelNemSzoveg2.innerHTML=`Nem, ${this.negaltKerdesSzoveg}`;
                labelNemSzoveg.addEventListener('mouseenter', () => {
                    labelNemSzoveg2.style.opacity = '1';
                    labelNemSzoveg2.style.visibility = 'visible';
                  });
                  
                  labelNemSzoveg.addEventListener('mouseleave', () => {
                    labelNemSzoveg2.style.opacity = '0';
                    labelNemSzoveg2.style.visibility = 'hidden';              
                });

                csuszka.prepend(labelNem);
                const igenRadio = csuszka.querySelector('.igen');
                const uresRadio = csuszka.querySelector('.ures');
                const igenLabel = csuszka.querySelector('.labeligen');
                const uresLabel = csuszka.querySelector('.labelures');

                csuszka.classList.remove("csuszka");
                csuszka.classList.add("csuszka2");
                igenLabel.classList.remove("labeligen");
                igenLabel.classList.add("labeligen2");
                uresLabel.classList.remove("labelures");
                uresLabel.classList.add("labelures2");
                igenRadio.classList.remove("igen");
                igenRadio.classList.add("igen2");
                uresRadio.classList.remove("ures");
                uresRadio.classList.add("ures2");
            }
                
            csuszka.appendChild(gomboc);

            const alkerdesekContainer = document.createElement('div');
            alkerdesekContainer.classList.add("alkerdeskont");
            alkerdesekContainer.setAttribute('id', `alkerdesek-${this.id}`);
            alkerdesekContainer.classList.add('question-container', 'hidden');
            div.appendChild(alkerdesekContainer);
            labeUresSzoveg.addEventListener('mouseenter', () => {
                alkerdesekContainer.style.filter = 'blur(5px)';
              });
              
              labeUresSzoveg.addEventListener('mouseleave', () => {
                alkerdesekContainer.style.filter = 'none';
              });
            
              if (this.szoveges) {
                const inputMezo = document.createElement('input');
                inputMezo.setAttribute("placeholder", "Adjon hozzá egy megjegyzést.");
            
                // Input mező attribútumai
                inputMezo.setAttribute('type', 'text');
                inputMezo.setAttribute('data-id', this.id); // 🔹 Adjuk hozzá az ID-t az inputhoz
                    const storedValue = szovegesValaszok[this.id] || '';
                    const kerdesSzoveg = this.szoveg ? this.szoveg.trim() : '';

                    let cleanedValue = storedValue;

                    // 🔥 Ha a storedValue a kérdés szövegével kezdődik, vágjuk le!
                    if (storedValue.startsWith(kerdesSzoveg)) {
                        cleanedValue = storedValue.slice(kerdesSzoveg.length).trim();

                        // Kettőspont eltávolítása, ha maradt utána
                        if (cleanedValue.startsWith(':')) {
                            cleanedValue = cleanedValue.slice(1).trim();
                        }
                    }

            inputMezo.value = cleanedValue;
            
                // Input mező eseménykezelője
               // Segéd – egyetlen felelős helyen intézzük el a pucolást
function getKerdesSzoveg(elem) {
    // 1. Klónozzuk, hogy az eredeti DOM-ot NE borogassuk szét
    const clone = elem.cloneNode(true);

    // 2. Minden szerkesztőlécet kivágunk (lehet több is)
    clone.querySelectorAll('.szerkesztolec').forEach(n => n.remove());

    // 3. Tiszta, levágott szöveg
    return clone.textContent.trim();
}

inputMezo.addEventListener('input', (event) => {
    const kerdesElem = event.target.closest('.question');

    // 🔹 CSAK a tényleges kérdés marad, a .szerkesztolec nélkül
    const kerdesSzoveg = getKerdesSzoveg(kerdesElem);

    const value = event.target.value.trim();
    const questionId = Number(event.target.dataset.id);      // rövidebb, ugyanaz

    if (Number.isNaN(questionId)) {
        console.error('Hibás kérdés ID:', event.target.dataset.id);
        return;
    }

    szovegesValaszok[questionId] =
        value === '' ? '' : `${kerdesSzoveg} ${value}`;

    console.log(
        `Kérdés ID: ${questionId}, Szöveges válasz: ${szovegesValaszok[questionId] || 'törölve'}`
    );

    // Villámgyors UI-frissítés
    setTimeout(() => {
        KategoriaKezelo.frissitErtekelesekContainer();
    }, 0);
});

            
                // Mezők hozzáadása a div-hez
                div.appendChild(inputMezo);
                div.removeChild(csuszka);
            }
            
            
        tartaly.appendChild(kerdesmodul);

        if (kerdesValaszok[this.id]) {
            const selectedValasz = kerdesValaszok[this.id];
            const selectedRadio = div.querySelector(`input[value="${selectedValasz}"]`);
            if (selectedRadio) {
                selectedRadio.checked = true;
                this.toggleValtozasKezeles({ target: selectedRadio });
            }
        }
        return kerdesmodul;
    }
    //Figyeli és kezeli a csúszkák változását.
        //Eltárolja a válasz id-jét a kerdesValaszok tömbben. vagy törli őket onnan
        //Megjeleníti vagy elrejte az adott főkérdésekhez tartozó alkérdéseket
        //Feltölti a nyomtatható konténert a szöveggel (ez maga az értékelés)
    toggleValtozasKezeles(event) {
        const valasz = event.target.value; // Radio button értéke
        kerdesValaszok[this.id] = valasz; // Mentjük az állapotot
       console.log(`Kérdés ID: ${this.id}, Állapot: ${valasz}`); // Állapot loggolása
        console.log('Aktuális kérdés-válasz állapot:', kerdesValaszok); // Teljes állapot loggolása  */
        const gomboc = event.target.closest('.question').querySelector(".gomboc");
        const nemRadio = event.target.closest('.question').querySelector(".nem");
        let igenszoveg = event.target.closest('.question').querySelector('.igenszoveg');
        let nemszoveg = event.target.closest('.question').querySelector('.nemszoveg');
        let uresszoveg = event.target.closest('.question').querySelector('.uresszoveg');
        let kerdessav = event.target.closest(".question");
        if (nemRadio) {
            if (valasz === 'ures') {
                this.clearAlKerdesek(this.igenAg); // Törli az "igen" ág alkérdéseit
                this.clearAlKerdesek(this.nemAg); // Törli a "nem" ág alkérdéseit
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px grey";
                gomboc.style.background = "transparent";
                gomboc.style.transform = "translate(0px, 0px) rotate(45deg)";
                kerdessav.style.boxShadow = "none";
                Focus.hideAlKerdesek(this.id); // Elrejti az alkérdések konténerét
                igenszoveg.classList.remove("igenteli");
                nemszoveg.classList.remove("nemteli");
                nemszoveg.style.color="grey";
                igenszoveg.style.color="grey";
                uresszoveg.style.color="black";

            } else if (valasz === 'nem') {
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); // Alkérdések betöltése
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px red";
                kerdessav.style.boxShadow="inset 6px 0px 1px 1px #e20000a3";
                gomboc.style.background = "#ff0000";
                nemszoveg.style.color="white";
                igenszoveg.style.color="grey";
                uresszoveg.style.color="grey";

                gomboc.style.transform = "translate(-38px, 0px) rotate(135deg)";
                this.clearAlKerdesek(this.igenAg); // Törli az "igen" ág alkérdéseit
                igenszoveg.classList.remove("igenteli");
                nemszoveg.classList.add("nemteli");

            } else {
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); // Alkérdések betöltése
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px #88ca00";
                gomboc.style.color = "white";
                gomboc.style.background = "rgb(145 204 0)";
                gomboc.style.transform = "translate(42px, 0px) rotate(-135deg)";
                kerdessav.style.boxShadow="inset 6px 0px 1px 1px #0d8200a3"
                igenszoveg.classList.add("igenteli");
                igenszoveg.style.color="white";
                nemszoveg.classList.remove("nemteli");
                nemszoveg.style.color="grey";
                uresszoveg.style.color="grey";
                this.clearAlKerdesek(this.nemAg); // Törli a "nem" ág alkérdéseit
            }
        } else {
            if (valasz === 'ures') {
                this.clearAlKerdesek(this.igenAg); // Törli az "igen" ág alkérdéseit
                this.clearAlKerdesek(this.nemAg); // Törli a "nem" ág alkérdéseit
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px grey";
                gomboc.style.background = "transparent";
                gomboc.style.transform = "translate(0px, 0px) rotate(45deg)";               
                gomboc.style.transform = "translate(-20px, 0px) rotate(45deg)";
                igenszoveg.classList.remove("igenteli");
                igenszoveg.classList.add(".nemkell");
                kerdessav.style.boxShadow = "none";
                uresszoveg.style.color ="black";
                igenszoveg.style.color ="grey";
                Focus.hideAlKerdesek(this.id); // Elrejti az alkérdések konténerét
            } else if (valasz === 'igen') {
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); // Alkérdések betöltése
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px #88ca00";
                gomboc.style.color = "white";
                gomboc.style.background = "rgb(145 204 0)";                
                gomboc.style.transform = "translate(28px, 0px) rotate(135deg)";
                this.clearAlKerdesek(this.nemAg); 
                igenszoveg.classList.add("igenteli");    
                igenszoveg.style.color ="white";
                uresszoveg.style.color ="grey";
                kerdessav.style.boxShadow="inset 6px 0px 1px 1px #0d8200a3";
            }
        }
        KategoriaKezelo.frissitErtekelesekContainer();/*KategoriaKezelo.generaldDiagram(); */
    }
    //A toggleValtozasKezeles() metódus hívja meg, amikor egy kérdésre a felhasználó másik választ ad, így az előző válaszok törlődnek.
        //Kap egy olyan listát (ag) paraméterként, amely a kérdés alkérdéseinek azonosítóit tartalmazza.
    clearAlKerdesek(ag) {
            ag.forEach(id => {
                if (kerdesValaszok[id]) {
                    kerdesValaszok[id] = 'ures'; // Az alkérdést "üres" értékre állítjuk
                }
                if (szovegesValaszok[id]) {
                    szovegesValaszok[id] = ''; // A szöveges válaszokat töröljük, de az ID-t megtartjuk
                }
        });
/*         console.log('Frissített kérdés-válasz állapot:', kerdesValaszok);
 */    }
}
