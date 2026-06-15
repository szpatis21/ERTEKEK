//Kérdések renderlelése. Kérdés szöveg, csúszka, és alsó ágak

import { kerdesValaszok, szovegesValaszok } from './main_alap.js';
import { KategoriaKezelo } from './main_quest.js';
import { Focus} from './main_quest_focus.js';
import { setFokuszKulcs, rogzitFokusz } from './main_focus_history.js';
//Kérdés osztály 
let hasNemAgMap = {}; // Az összes kérdéshez előre eltároljuk az adatokat
let hasNemAgBatchPromise = null; // Megakadályozza a többszörös lekérdezést

function showGlobalTooltip(targetElement, text) {
    let tooltip = document.getElementById('global-tooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'global-tooltip';
        tooltip.className = 'global-tooltip';
        document.body.appendChild(tooltip);
    }

    tooltip.textContent = text;
    tooltip.classList.remove('hidden');

    const rect = targetElement.getBoundingClientRect();

    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 10}px`;
}

function hideGlobalTooltip() {
    const tooltip = document.getElementById('global-tooltip');

    if (!tooltip) return;

    tooltip.classList.add('hidden');
}
export class Kerdes {
    constructor(kindex, id, szoveg, parentId, valaszAg, negaltKerdesSzoveg, foKategoria, alKategoria, altTema, szoveges, ertek, negalt_ertek,ossz_ertek, maximalis_szint, opcios = 0, kategoriaKapcsoloId = null) {
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
        this.opcios = opcios === true || opcios === 1 || opcios === '1';
        this.kategoriaKapcsoloId = kategoriaKapcsoloId;
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
    
    
    getOpcioGroupKey() {
        if (!this.opcios) return null;

        if (this.parentId) {
            return `parent:${this.parentId}`;
        }

        if (this.kategoriaKapcsoloId) {
            return `kapcsolo:${this.kategoriaKapcsoloId}`;
        }

        return `utvonal:${this.foKategoria || ''}||${this.alKategoria || ''}||${this.altTema || ''}`;
    }

    static setOpcioQuestionVisual(questionElem, valasz) {
        if (!questionElem?.classList?.contains('opcios-question')) return;

        const isIgen = valasz === 'igen';
        const igenIcon = questionElem.querySelector('.igenszoveg');
        const uresIcon = questionElem.querySelector('.uresszoveg');
        const gomboc = questionElem.querySelector('.gomboc');

        if (igenIcon) {
            igenIcon.textContent = isIgen ? 'radio_button_checked' : 'radio_button_unchecked';
            igenIcon.classList.toggle('igenteli', isIgen);
            igenIcon.style.color = isIgen ? 'white' : 'grey';
        }

        if (uresIcon) {
            uresIcon.style.color = isIgen ? 'grey' : 'black';
        }

        if (gomboc && !isIgen) {
            gomboc.style.boxShadow = 'inset 0px 0px 3px 1px grey';
            gomboc.style.background = 'transparent';
            gomboc.style.transform = 'translate(-20px, 0px) rotate(45deg)';
        }

        if (!isIgen) {
            questionElem.style.boxShadow = 'none';
            questionElem.style.background = '';
        }
    }

    clearOpcioCsoportTobbiValasza() {
        if (!this.opcios) return;

        const sajatCsoport = this.getOpcioGroupKey();
        if (!sajatCsoport) return;

        KategoriaKezelo.kerdesek
            .filter(k => k && String(k.id) !== String(this.id) && k.opcios && k.getOpcioGroupKey?.() === sajatCsoport)
            .forEach(k => {
                kerdesValaszok[k.id] = 'ures';
            });

        document
            .querySelectorAll(`.question.opcios-question[data-opcio-group="${CSS.escape(sajatCsoport)}"]`)
            .forEach(questionElem => {
                if (String(questionElem.dataset.id) === String(this.id)) return;

                const uresRadio = questionElem.querySelector('input[value="ures"]');
                const igenRadio = questionElem.querySelector('input[value="igen"]');

                if (igenRadio) igenRadio.checked = false;

                if (uresRadio) {
                    uresRadio.checked = true;
                    uresRadio.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    Kerdes.setOpcioQuestionVisual(questionElem, 'ures');
                }
            });
    }

    static normalizeOpcioValaszok(kerdesLista = KategoriaKezelo.kerdesek) {
        const foglaltCsoportok = new Set();

        [...kerdesLista]
            .filter(k => k && k.opcios && kerdesValaszok[k.id] === 'igen')
            .sort((a, b) => (Number(a.kindex) || 0) - (Number(b.kindex) || 0))
            .forEach(k => {
                const csoportKulcs = k.getOpcioGroupKey?.();
                if (!csoportKulcs) return;

                if (foglaltCsoportok.has(csoportKulcs)) {
                    kerdesValaszok[k.id] = 'ures';
                    return;
                }

                foglaltCsoportok.add(csoportKulcs);
            });
    }

    //Kérdések létrehozása, igen-ures-nem pozíciok létrehozása és formázása
    async render(tartaly) {
        const kerdesmodul = document.createElement("div");
        kerdesmodul.classList.add("kerdesmodul");
        kerdesmodul.setAttribute('data-kindex', this.kindex); 
// --- ÚJ RÉSZ: Sorszám (kindex) megjelenítése szerkesztő módban a question div előtt ---
        if (document.getElementById('szerkeszto')) {
            const sorszamJelzo = document.createElement("div");
            sorszamJelzo.classList.add("kerdes-sorszam-jelzo");
            sorszamJelzo.textContent = `${this.kindex}.`;
            
            // Kis inline formázás, hogy szépen mutasson a kártya mellett
       

            // A befoglaló modult flex-re állítjuk, hogy a szám és a kártya egymás mellé kerüljön
            kerdesmodul.style.display = "flex";
            kerdesmodul.style.flexDirection = "row";

            kerdesmodul.appendChild(sorszamJelzo);
        }
        // --- ÚJ RÉSZ VÉGE ---
      const div = document.createElement('div');
div.setAttribute('data-id', this.id);
div.setAttribute('data-value', this.ertek);
div.setAttribute('data-opcios', this.opcios ? '1' : '0');
div.setAttribute('data-opcio-group', this.getOpcioGroupKey() || '');
div.classList.add('question');
if (this.opcios) div.classList.add('opcios-question');
const kerdesFokuszKulcs = setFokuszKulcs(div, {
    tipus: this.parentId ? 'Alkérdés' : 'Kérdés',
    id: this.id,
    szoveg: this.szoveg,
    utvonal: [this.foKategoria, this.alKategoria, this.altTema]
});

const questionBelso = document.createElement('div');
questionBelso.classList.add('question-belso');

const questionSzoveg = document.createElement('div');
questionSzoveg.classList.add('question-szoveg');
questionSzoveg.textContent = this.szoveg;

const questionCsuszka = document.createElement('div');
questionCsuszka.classList.add('question-csuszka');

questionBelso.appendChild(questionSzoveg);
questionBelso.appendChild(questionCsuszka);

div.appendChild(questionBelso);
kerdesmodul.appendChild(div);
        
        //HA szerkesztő mód...
     
        
        
        
           const csuszka = document.createElement("div");
csuszka.classList.add("csuszka");
questionCsuszka.appendChild(csuszka);
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
            labelIgenSzoveg.textContent = this.opcios ? (kerdesValaszok[this.id] === 'igen' ? 'radio_button_checked' : 'radio_button_unchecked') : 'check';
            labelIgenSzoveg.classList.add('igenszoveg');

            const labelIgenSzoveg2 = document.createElement('div');
            labelIgenSzoveg2.classList.add("tooltip")
labelIgenSzoveg2.textContent = this.opcios ? `Opció kiválasztása: ${this.szoveg || ''}` : `Igen, ${this.szoveg || ''}`;
         labelIgenSzoveg.addEventListener('mouseenter', () => {
    showGlobalTooltip(
        labelIgenSzoveg,
        this.opcios ? `Opció kiválasztása: ${this.szoveg || ''}` : `Igen, ${this.szoveg || ''}`
    );
});

labelIgenSzoveg.addEventListener('mouseleave', hideGlobalTooltip);
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

labelNemSzoveg2.textContent = `Nem, ${this.negaltKerdesSzoveg || ''}`;
            labelNemSzoveg.addEventListener('mouseenter', () => {
    showGlobalTooltip(
        labelNemSzoveg,
        `Nem, ${this.negaltKerdesSzoveg || ''}`
    );
});

labelNemSzoveg.addEventListener('mouseleave', hideGlobalTooltip);
                  
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
const kerdesSzovegElem = kerdesElem?.querySelector('.question-szoveg');

const kerdesSzoveg = kerdesSzovegElem
    ? kerdesSzovegElem.textContent.trim()
    : getKerdesSzoveg(kerdesElem);

    const value = event.target.value.trim();
    const questionId = Number(event.target.dataset.id);      // rövidebb, ugyanaz

    if (Number.isNaN(questionId)) {
        console.error('Hibás kérdés ID:', event.target.dataset.id);
        return;
    }

    szovegesValaszok[questionId] =
        value === '' ? '' : `${kerdesSzoveg} ${value}`;

    rogzitFokusz({
        tipus: this.parentId ? 'Alkérdés' : 'Kérdés',
        akcio: value === '' ? 'szöveges válasz törölve' : 'szöveges válasz módosítva',
        szoveg: this.szoveg,
        utvonal: [this.foKategoria, this.alKategoria, this.altTema],
        elem: kerdesElem,
        elemKulcs: kerdesFokuszKulcs,
        valasz: value === '' ? 'ures' : 'szöveg',
        event,
        csakHaValodiEsemeny: true
    });

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
if (questionCsuszka && questionCsuszka.parentNode) {
    questionCsuszka.remove();
}            }
            
            
        tartaly.appendChild(kerdesmodul);

        if (kerdesValaszok[this.id]) {
            const selectedValasz = kerdesValaszok[this.id];
            const selectedRadio = div.querySelector(`input[value="${selectedValasz}"]`);
            if (selectedRadio) {
                selectedRadio.checked = true;
                this.toggleValtozasKezeles({ target: selectedRadio });
            }
        } else if (this.opcios) {
            Kerdes.setOpcioQuestionVisual(div, 'ures');
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
        const aktualisQuestion = event.target.closest('.question');
        if (this.opcios) {
            Kerdes.setOpcioQuestionVisual(aktualisQuestion, valasz);
        }
        if (this.opcios && valasz === 'igen') {
            this.clearOpcioCsoportTobbiValasza();
        }
        console.log(`Kérdés ID: ${this.id}, Állapot: ${valasz}`); // Állapot loggolása
        console.log('Aktuális kérdés-válasz állapot:', kerdesValaszok); // Teljes állapot loggolása
        
        const gomboc = event.target.closest('.question').querySelector(".gomboc");
        const nemRadio = event.target.closest('.question').querySelector(".nem");
        let igenszoveg = event.target.closest('.question').querySelector('.igenszoveg');
        let nemszoveg = event.target.closest('.question').querySelector('.nemszoveg');
        let uresszoveg = event.target.closest('.question').querySelector('.uresszoveg');
        let kerdessav = event.target.closest(".question");

        // --- 3 ÁLLÁSÚ KÉRDÉS (Igen / Üres / Nem) ---
        if (nemRadio) {
            if (valasz === 'ures') {
                this.clearAlKerdesek(this.igenAg); 
                this.clearAlKerdesek(this.nemAg); 
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px grey";
                gomboc.style.background = "transparent";
                gomboc.style.transform = "translate(0px, 0px) rotate(45deg)";
                
                kerdessav.style.boxShadow = "none";
                kerdessav.style.background = ""; // JAVÍTVA: Háttér törlése

                Focus.hideAlKerdesek(this.id); 
                igenszoveg.classList.remove("igenteli");
                nemszoveg.classList.remove("nemteli");
                nemszoveg.style.color="grey";
                igenszoveg.style.color="grey";
                uresszoveg.style.color="black";

            } else if (valasz === 'nem') {
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); 
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px red";
                gomboc.style.background = "#ff0000";
                gomboc.style.transform = "translate(-38px, 0px) rotate(135deg)";
                
                kerdessav.style.boxShadow="inset 6px 0px 1px 1px #e2000033";
                kerdessav.style.background="rgb(255 0 0 / 6%)"; // JAVÍTVA: pontosvessző nélkül

                nemszoveg.style.color="white";
                igenszoveg.style.color="grey";
                uresszoveg.style.color="grey";

                this.clearAlKerdesek(this.igenAg); 
                igenszoveg.classList.remove("igenteli");
                nemszoveg.classList.add("nemteli");

            } else { // IGEN ág
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); 
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px #88ca00";
                gomboc.style.color = "white";
                gomboc.style.background = "rgb(145 204 0)";
                gomboc.style.transform = "translate(42px, 0px) rotate(-135deg)";
                
                kerdessav.style.boxShadow="inset 6px 0px 1px 1px #0d8200a3";
                kerdessav.style.background="rgb(48 255 0 / 8%)"; // JAVÍTVA: pontosvessző kivéve a stringből

                igenszoveg.classList.add("igenteli");
                igenszoveg.style.color="white";
                nemszoveg.classList.remove("nemteli");
                nemszoveg.style.color="grey";
                uresszoveg.style.color="grey";
                this.clearAlKerdesek(this.nemAg); 
            }
        } 
        // --- 2 ÁLLÁSÚ KÉRDÉS (Igen / Üres) ---
        else {
            if (valasz === 'ures') {
                this.clearAlKerdesek(this.igenAg); 
                this.clearAlKerdesek(this.nemAg); 
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px grey";
                gomboc.style.background = "transparent";
                gomboc.style.transform = "translate(-20px, 0px) rotate(45deg)";
                
                kerdessav.style.boxShadow = "none";
                kerdessav.style.background = ""; // JAVÍTVA: Háttér törlése

                igenszoveg.classList.remove("igenteli");
                igenszoveg.classList.add(".nemkell");
                uresszoveg.style.color ="black";
                igenszoveg.style.color ="grey";
                Focus.hideAlKerdesek(this.id); 
            } else if (valasz === 'igen') {
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); 
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px #88ca00";
                gomboc.style.color = "white";
                gomboc.style.background = "rgb(145 204 0)";                
                gomboc.style.transform = "translate(28px, 0px) rotate(135deg)";
                
                kerdessav.style.boxShadow="inset 6px 0px 1px 1px #0d8200a3";
                kerdessav.style.background="rgb(48 255 0 / 8%)"; // JAVÍTVA: hozzáadva a zöld háttér ide is

                this.clearAlKerdesek(this.nemAg); 
                igenszoveg.classList.add("igenteli");    
                igenszoveg.style.color ="white";
                uresszoveg.style.color ="grey";
            }
        }
        if (this.opcios) {
            Kerdes.setOpcioQuestionVisual(kerdessav, valasz);
        }

        rogzitFokusz({
            tipus: this.parentId ? 'Alkérdés' : 'Kérdés',
            akcio: valasz === 'ures' ? 'válasz törölve' : 'válasz módosítva',
            szoveg: this.szoveg,
            utvonal: [this.foKategoria, this.alKategoria, this.altTema],
            elem: kerdessav,
            elemKulcs: kerdessav?.dataset?.fokuszKulcs || `kerdes:${this.id}`,
            valasz,
            event,
            csakHaValodiEsemeny: true
        });

        KategoriaKezelo.frissitErtekelesekContainer();
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
