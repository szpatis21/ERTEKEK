import {torlesButton,szerkesztoButton } from '../upload/updateFletch.js';
// TÖMBÖK

const kerdesValaszok = {}; // Ez tárolja a kérdések válaszait
const leirasok = {
    "Általános jellemzők": "Vizsgált személyek alapadatai, szociális jellemzői, egyedi jellemzői",
    "Kommunikáció és beszéd": "Készségek és képességek, kommunikáció személyekkel, családtagokkal, csoport társakkal.",
    "Reggeli és búcsúkör": "Kötött foglalkozás alatti (napkezdő és befejező) viselkedés, képességek.",
    "Szűkebb-tágabb környezet": "Van ami szűk, van ami tág",
    "Játék és szórakozás": "Kötetlen tevényenység alatti viselkedés, képességek.",
    "Mozgás nevelés": "Ez a kategória a mozgásfejlesztési tevékenységekre és gyakorlatokra összpontosít.",
    "Önkiszolgálásra nevelés": "Ez a kategória az önkiszolgálási képességek fejlesztésére koncentrál.",
}; // Itt vannak a főkategóriák alatt leírások
const kategoriakSzinek = 
{
    "Általános jellemzők": "linear-gradient(0deg, #ff990000 0%, #FFC107 100%)",
    "Kommunikáció és beszéd": "linear-gradient(158deg, rgb(255 17 0) 0%, #ff877e00 100%)",
    "Reggeli és búcsúkör": "linear-gradient(0deg, #ea70ff00 0%, #9C27B0 100%)",
    "Szűkebb-tágabb környezet": "linear-gradient(0deg, #ff7caa00 0%, #E91E63 100%)",
    "Játék és szórakozás": "linear-gradient(0deg, rgb(166 118 255 / 42%) 0%, rgb(92 0 255) 100%)",
    "Mozgás nevelés": "linear-gradient(0deg, #91ceff00 0%, #2196F3 100%)",
    "Önkiszolgálásra nevelés": "linear-gradient(0deg, #8bc34a82 0%, rgb(24 157 0 / 89%) 100%)"
}; // Altéma színei kategóriánként  
const szovegesValaszok = {}; // Ez tárolja a szöveges kérdések válaszait
const fopont = {};
const alpont = {};
const altpont = {};
const kerdespont = {};
const alkerdespont = {};


class Kategoria {

    constructor(id, nev) {
        this.id = id;
        this.nev = nev;
    }

    render(tartaly) {  /* console.log(`Render ID: ${this.id}, kindex: ${this.kindex}`);*/
        const div = document.createElement('div');
        div.textContent = this.nev;
        div.setAttribute('data-id', this.id);
        div.classList.add('category');
        tartaly.appendChild(div);
        return div;
    }
}

class Kerdes {
    constructor(kindex, id, szoveg, parentId, valaszAg, negaltKerdesSzoveg, foKategoria, alKategoria, altTema, szoveges, ertek) {
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
    };


    async hasNemAg() {
        try {
            const response = await fetch(`/api/check-nem-ag?id=${this.id}`);
            if (!response.ok) {
                throw new Error('Hiba a lekérdezés során');
            }
            const data = await response.json();
            return data.hasNemAg;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async render(tartaly) {
        const kerdesmodul = document.createElement("div");
        kerdesmodul.classList.add("kerdesmodul");
        kerdesmodul.setAttribute('data-kindex', this.kindex); 

        const div = document.createElement('div');
        div.textContent = this.szoveg;
        div.setAttribute('data-id', this.id);
        div.classList.add('question');
        kerdesmodul.appendChild(div);/* console.log(`Render függvény: kindex=${this.kindex}, id=${this.id}`);*/

        //HA szerkesztő mód...
        if (document.getElementById('szerkeszto')) {
            const szerkesztolec = document.createElement("div");
                szerkesztolec.classList.add("szerkesztolec");
            div.appendChild(szerkesztolec);

            const deleteButton = torlesButton(this.id, false); 
            const editButton = szerkesztoButton(this.id, false);
                deleteButton.classList.add("szerkesztogomb");
                editButton.classList.add("szerkesztogomb");
            const pontdiv = document.createElement('div');
                pontdiv.classList.add('ertek');
                pontdiv.textContent = this.ertek + " pont" || "Nincs érték megadva";
                pontdiv.setAttribute('data-id', this.ertek);
            const indexdiv = document.createElement('div');
                indexdiv.classList.add('index');
                indexdiv.textContent = this.kindex + " sorszám " || "Nincs sorszám megadva";
                indexdiv.setAttribute('data-id', this.kindex);
            szerkesztolec.appendChild(indexdiv);
            szerkesztolec.appendChild(pontdiv);
            szerkesztolec.appendChild(editButton);
            szerkesztolec.appendChild(deleteButton);
        }
              
            const csuszka = document.createElement("div");
            csuszka.classList.add("csuszka");
            div.appendChild(csuszka);

            const gomboc = document.createElement("div");
            gomboc.classList.add("gomboc");

            const radioIgen = document.createElement('input');
            radioIgen.setAttribute('type', 'radio');
            radioIgen.classList.add("igen");
            radioIgen.setAttribute('name', `valasz-${this.id}`);
            radioIgen.setAttribute('value', 'igen');
            radioIgen.checked = kerdesValaszok[this.id] === 'igen';
            radioIgen.addEventListener('change', this.toggleValtozasKezeles.bind(this));

            const radioUres = document.createElement('input');
            radioUres.setAttribute('type', 'radio');
            radioUres.classList.add("ures");
            radioUres.setAttribute('name', `valasz-${this.id}`);
            radioUres.setAttribute('value', 'ures');
            radioUres.checked = kerdesValaszok[this.id] === 'ures';
            radioUres.addEventListener('change', this.toggleValtozasKezeles.bind(this));

            const labelIgen = document.createElement('label');
            labelIgen.textContent = '';
            labelIgen.classList.add('labeligen');
            labelIgen.appendChild(radioIgen);

            const labelUres = document.createElement('label');
            labelUres.textContent = '';
            labelUres.classList.add("labelures");
            labelUres.appendChild(radioUres);

            csuszka.appendChild(labelIgen);
            csuszka.appendChild(labelUres);


            if (this.negaltKerdesSzoveg || await this.hasNemAg()) {
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

                csuszka.appendChild(labelNem);

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
            
            if (this.szoveges) {
                const inputMezo = document.createElement('input');
                inputMezo.setAttribute("placeholder", "Adjon meg szöveges választ");
    
                // Input mező attribútumai
                inputMezo.setAttribute('type', 'text');
                inputMezo.value = szovegesValaszok[this.id] || ''; // Meglévő érték beállítása
            
                // Szülő elem meghatározása
                const parent = inputMezo.closest('.question'); // Közvetlen szülőelem
                const data = parent && parent.firstChild && parent.firstChild.nodeType === Node.TEXT_NODE
                    ? parent.firstChild.data
                    : '';
            
                // Input mező eseménykezelője
                inputMezo.addEventListener('input', (event) => {
                    szovegesValaszok[this.id] = `${data} ${event.target.value}`;
                    console.log(`Kérdés ID: ${this.id}, ${data} : ${event.target.value}`);
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

    toggleValtozasKezeles(event) {
        const valasz = event.target.value; // Radio button értéke
        kerdesValaszok[this.id] = valasz; // Mentjük az állapotot
        console.log(`Kérdés ID: ${this.id}, Állapot: ${valasz}`); // Állapot loggolása
        console.log('Aktuális kérdés-válasz állapot:', kerdesValaszok); // Teljes állapot loggolása
        const gomboc = event.target.closest('.question').querySelector(".gomboc");
        const nemRadio = event.target.closest('.question').querySelector(".nem");

        if (nemRadio) {
            if (valasz === 'ures') {
                this.clearAlKerdesek(this.igenAg); // Törli az "igen" ág alkérdéseit
                this.clearAlKerdesek(this.nemAg); // Törli a "nem" ág alkérdéseit
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px grey";
                gomboc.style.transform = "translate(0px, 0px) rotate(45deg)";
                KategoriaKezelo.hideAlKerdesek(this.id); // Elrejti az alkérdések konténerét
            } else if (valasz === 'nem') {
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); // Alkérdések betöltése
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px red";
                gomboc.style.transform = "translate(39px, 0px) rotate(-135deg)";
                this.clearAlKerdesek(this.igenAg); // Törli az "igen" ág alkérdéseit
            } else {
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); // Alkérdések betöltése
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px #88ca00";
                gomboc.style.transform = "translate(-39px, 0px) rotate(135deg)";
                this.clearAlKerdesek(this.nemAg); // Törli a "nem" ág alkérdéseit
            }
        } else {
            if (valasz === 'ures') {
                this.clearAlKerdesek(this.igenAg); // Törli az "igen" ág alkérdéseit
                this.clearAlKerdesek(this.nemAg); // Törli a "nem" ág alkérdéseit
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px grey";
                gomboc.style.transform = "translate(38px, 0px) rotate(45deg)";
                KategoriaKezelo.hideAlKerdesek(this.id); // Elrejti az alkérdések konténerét
            } else if (valasz === 'igen') {
                KategoriaKezelo.loadAlKerdesek(this.id, valasz, this); // Alkérdések betöltése
                gomboc.style.boxShadow = "inset 0px 0px 3px 1px #88ca00";
                gomboc.style.transform = "translate(-38px, 0px) rotate(135deg)";
                this.clearAlKerdesek(this.nemAg); // Törli a "nem" ág alkérdéseit
            }
        }

        KategoriaKezelo.frissitErtekelesekContainer();
    }
    
    clearAlKerdesek(ag) {
        ag.forEach(id => {
            if (kerdesValaszok[id]) {
                delete kerdesValaszok[id];
            }
        });
        console.log('Frissített kérdés-válasz állapot:', kerdesValaszok);
    }
}

class KategoriaKezelo {
    static get kerdesek() {
        if (!this._kerdesek) {
            this._kerdesek = []; 
        }
        return this._kerdesek;
    }

    static logKerdesValaszok() {
        console.log('Kérdések jelenlegi állapota:');
        for (const [key, value] of Object.entries(kerdesValaszok)) {
            console.log(`Kérdés ID: ${key}, Állapot: ${value}`);
        }
    }

    static toggleActiveState(selectedDiv, categorySelector, onActive, onInactive) {
        const categories = document.querySelectorAll(categorySelector);
        const isActive = selectedDiv.classList.contains('active');

        categories.forEach(div => {
            div.classList.remove('active', 'passive'); // Minden elemről eltávolítjuk az aktív/passzív osztályokat
        });

        if (!isActive) {
            selectedDiv.classList.add('active'); // Kiválasztott elem aktív
            categories.forEach(div => {
                if (div !== selectedDiv) {
                    div.classList.add('passive'); // A többi elem passzív
                }
            });
            onActive(); // Aktív esemény kezelése
        } else {
            selectedDiv.classList.remove('active'); // Eltávolítjuk az aktív osztályt
            onInactive(); // Inaktív esemény kezelése
        }
    }

    static toggleActiveClass(selectedDiv, foKategoriaNev) {
        this.toggleActiveState(selectedDiv, '.fo', () => {
            this.loadAlKategoriak(foKategoriaNev); // Alkategóriák betöltése
        }, () => {
            this.clearSubcategories(); // Alkategóriák törlése
        });
    }

    static toggleActiveClassal(selectedDiv, alKategoriaNev) {
        this.toggleActiveState(selectedDiv, '.al', () => {}, () => {
            this.alclearSubcategories(); // Altémák és kérdések törlése
            this.loadAltTemak(alKategoriaNev); // Altémák betöltése
        });
    }

    static toggleActiveClassalal(selectedDiv, altTemaNev) {
        this.toggleActiveState(selectedDiv, '.alal', () => {}, () => {
            this.alalclearSubcategories(); // Kérdések és alkérdések törlése
            this.loadKerdesek(altTemaNev); // Kérdések betöltése
        });
    }

    static clearElements(...elementIds) {
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
                element.classList.add('hidden'); // Elemet elrejti
            }
        });
    }

    static clearSubcategories() { this.clearElements('al_kategoriak', 'alt_temak', 'kerdesek', 'alkerdesek'); }

    static alclearSubcategories() { this.clearElements('alt_temak', 'kerdesek', 'alkerdesek'); }

    static alalclearSubcategories() { this.clearElements('kerdesek', 'alkerdesek'); }

    static showContainer(container) {
        container.classList.remove('hidden'); // Elem láthatóvá tétele
        container.classList.add('fade-in'); // Animáció hozzáadása
    }

    static frissitErtekelesekContainer() {
        const container = document.getElementById('ertekelesek-container');
        container.innerHTML = ''; // Tisztítja a konténer tartalmát
        const foKategoriak = {};

    
        for (const [key, value] of Object.entries(kerdesValaszok)) {
            const kerdes = KategoriaKezelo.kerdesek.find(k => k.id === parseInt(key));
            if (kerdes) {
                const foKategoriaNev = kerdes.foKategoria;
                const alKategoriaNev = kerdes.alKategoria;
                const altTemaNev = kerdes.altTema;
    
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
    
                let text = '';
    
                if (value === 'igen') {
                    text = kerdes.szoveg; // Alapértelmezett kérdés szöveg
                } else if (value === 'nem' && kerdes.negaltKerdesSzoveg) {
                    text = kerdes.negaltKerdesSzoveg; // Negált kérdés szöveg
                }
    
                if (kerdes.parentId) {
                    // Alkérdés
                    if (text) {
                        foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.parentId].alkerdesek.push(text);
                    }
                } else {
                    // Főkérdés
                    if (text) {
                        foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.id].kerdesek.push(text);
                    }
                }
            }
        }
    
        for (const [key, value] of Object.entries(szovegesValaszok)) {
            if (value.trim() !== '') {
                const kerdes = KategoriaKezelo.kerdesek.find(k => k.id === parseInt(key));
                if (kerdes) {
                    const foKategoriaNev = kerdes.foKategoria;
                    const alKategoriaNev = kerdes.alKategoria;
                    const altTemaNev = kerdes.altTema;
    
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
    
                    foKategoriak[foKategoriaNev][alKategoriaNev][altTemaNev][kerdes.parentId || kerdes.id].kerdesek.push(value.trim());
                }
            }
        }
    
        for (const [foKategoriaNev, alKategoriak] of Object.entries(foKategoriak)) {
            const foKategoriaDiv = document.createElement('div');
            foKategoriaDiv.classList.add('fo-kategoria');
            const foKategoriaCim = document.createElement('h3');
            foKategoriaCim.textContent = foKategoriaNev;
            foKategoriaDiv.appendChild(foKategoriaCim);
    
            let hasAlKategoria = false;
    
            for (const [alKategoriaNev, altTemak] of Object.entries(alKategoriak)) {
                const alKategoriaDiv = document.createElement('div');
                alKategoriaDiv.classList.add('al-kategoria');
                const alKategoriaCim = document.createElement('h4');
                alKategoriaCim.textContent = alKategoriaNev;
                alKategoriaDiv.appendChild(alKategoriaCim);
    
                let hasAltTema = false;
    
                for (const [altTemaNev, kerdesObj] of Object.entries(altTemak)) {
                    const altTemaDiv = document.createElement('div');
                    altTemaDiv.classList.add('alt-tema');
                    const altTemaCim = document.createElement('h5');
                    altTemaCim.textContent = altTemaNev + ": ";
                    altTemaDiv.appendChild(altTemaCim);
    
                    for (const [kerdesId, valaszok] of Object.entries(kerdesObj)) {
                        const kerdesDiv = document.createElement('div');
                        kerdesDiv.classList.add('kerdes');
    
                        valaszok.kerdesek.forEach((szoveg, index) => {
                            const p = document.createElement('p');
                            p.classList.add("fokerd")

                            if (valaszok.alkerdesek.length > 0) {
                                // Ha vannak alkérdések, akkor ':' után következnek
                                p.textContent = szoveg + ':';
                            } else {
                                // Ha nincsenek alkérdések, akkor '.' után következnek
                                p.textContent = szoveg + '.';
                            }
                            kerdesDiv.appendChild(p);
                        });

                        valaszok.alkerdesek.forEach((szoveg, index) => {
                            const p = document.createElement('p');
                            p.classList.add("alkerd")
                            if (index < valaszok.alkerdesek.length - 1) {
                                // Ha az alkérdést egy másik alkérdés követi, akkor '.'
                                p.textContent = szoveg + '.';
                            } else {
                                // Ha az alkérdést nem követi másik alkérdés, akkor '.'
                                p.textContent =  szoveg + '.';
                            }
                            kerdesDiv.appendChild(p);
                        });
    
                        if (valaszok.kerdesek.length > 0 || valaszok.alkerdesek.length > 0) {
                            altTemaDiv.appendChild(kerdesDiv);
                        }
                    }
    
                    if (altTemaDiv.children.length > 1) {
                        alKategoriaDiv.appendChild(altTemaDiv);
                        hasAltTema = true;
                    }
                }
    
                if (hasAltTema) {
                    foKategoriaDiv.appendChild(alKategoriaDiv);
                    hasAlKategoria = true;
                }
            }
    
            if (hasAlKategoria) {
                container.appendChild(foKategoriaDiv);
            }
        }
    }
    
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


                    div.addEventListener('click', () => this.toggleActiveClass(div, item.nev)); // Kategória kiválasztása
                });
            });
    }

    static loadAlKategoriak(foKategoriaNev) {
        fetch(`/api/get-al_kategoriak?fo_kategoria_id=${foKategoriaNev}`)
            .then(response => response.json())
            .then(data => {
                const tartaly = document.getElementById('al_kategoriak');
                KategoriaKezelo.showContainer(tartaly);
                tartaly.innerHTML = ''; // Tisztítsa meg a tartalmat, mielőtt új elemeket ad hozzá
                data.forEach(item => {
                    const kategoria = new Kategoria(item.nev, item.nev);
                    const div = kategoria.render(tartaly);
                    div.classList.add("al");
                    div.addEventListener('click', () => KategoriaKezelo.loadAltTemak(foKategoriaNev, item.nev));
                    div.addEventListener('click', () => this.toggleActiveClassal(div, item.nev));
                    div.style.background = kategoriakSzinek[foKategoriaNev] || "#ffffff"; // Alkalmazza a fő kategória színét
                });
            });
    }

    static loadAltTemak(foKategoriaNev, alKategoriaNev) {
        fetch(`/api/get-alt_temak?fo_kategoria_id=${foKategoriaNev}&al_kategoria_id=${alKategoriaNev}`)
            .then(response => response.json())
            .then(data => {
                const tartaly = document.getElementById('alt_temak');
                KategoriaKezelo.showContainer(tartaly);
                tartaly.innerHTML = ''; // Tisztítsa meg a tartalmat, mielőtt új elemeket ad hozzá

                data.forEach(item => {
                    const kategoria = new Kategoria(item.nev, item.nev);
                    const div = kategoria.render(tartaly);
                    div.classList.add("alal");
                    div.addEventListener('click', () => KategoriaKezelo.loadKerdesek(foKategoriaNev, alKategoriaNev, item.nev));
                    div.addEventListener('click', () => this.toggleActiveClassalal(div, item.nev));
                });
            });
    }

    static loadKerdesek(foKategoriaNev, alKategoriaNev, altTemaNev) {
        fetch(`/api/get-kerdesek?fo_kategoria_id=${foKategoriaNev}&al_kategoria_id=${alKategoriaNev}&alt_tema_id=${altTemaNev}`)
            .then(response => response.json())
            .then(data => {
                const tartaly = document.getElementById('kerdesek');
                KategoriaKezelo.showContainer(tartaly);
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

    static async loadAlKerdesek(parentId, valaszAg, parentKerdes) {
        const tartaly = document.getElementById(`alkerdesek-${parentId}`);
        
        try {
            // Adatok lekérése
            const response = await fetch(`/api/get-alkerdesek?parent_id=${parentId}&valasz_ag=${valaszAg}`);
            const data = await response.json();
    
            // Korábbi alkérdések törlése
            tartaly.innerHTML = '';
            
            if (data.length > 0) {
                tartaly.classList.remove('hidden');
                tartaly.classList.add('fade-in');
            } else {
                tartaly.classList.add('hidden');
            }
    
            // Ág ürítése
          
            // Sorrendezett adatokat dolgozunk fel
            const sortedData = data.sort((a, b) => a.kindex - b.kindex);
            const ag = valaszAg === 'igen' ? parentKerdes.igenAg : parentKerdes.nemAg;
            ag.length = 0; // Ürítjük az ágat
            // Elemenkénti renderelés
            for (const item of sortedData) {
                ag.push(item.id); // Hozzáadjuk az alkérdés ID-ját az ághoz
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
                    item.ertek
                );
    
                await kerdes.render(tartaly); // Aszinkron renderelés
/*                 console.log(`Render után: ID=${item.id}, kindex=${item.kindex}`);
 */    
                KategoriaKezelo.kerdesek.push(kerdes);
            }
        } catch (error) {
            console.error('Hiba történt az alkérdések betöltése során:', error);
        }
    }

    static hideAlKerdesek(parentId) {
        const tartaly = document.getElementById(`alkerdesek-${parentId}`);
        tartaly.innerHTML = ''; // Alkérdések törlése a konténerből
        tartaly.classList.add('hidden'); // Konténer elrejtése
    }
}

document.addEventListener('DOMContentLoaded', () => {
    KategoriaKezelo.loadFoKategoriak();
});


