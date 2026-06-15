//Dashboard kezelő (CRUD,SHARE,VIEW,ANALISTIC, PDF)
import { initFrissites, initTorol, initOlvas, initLetrehoz } from './dashCRUD.js'; //Szerkesztés, törlés, létrehozás, stb
import { monitorozCheckek } from './dashStatic.js'; //Csoport statisztika
import { loadInfoAndInit } from '../info/infoLoader.js'; //Hírek és gyk betöltése
import { betoltKategoriakChartSzinek } from '../main/main_alap.js';
import {initAside} from './dashAside.js';
import './dashAI.js';
import { initAuditLista } from '../elemzo/dashAudit.js';
import{showAlert} from "/both/alert.js"
import { escapeHTML, escapeAttr } from '/both/safeDom.js';

loadInfoAndInit(); 
initAside();


// ====================== XSS-BIZTOS DOM SEGÉDEK ======================
function clearElement(el) {
    if (!el) return;
    el.replaceChildren();
}

function setStyles(el, styles = {}) {
    Object.entries(styles).forEach(([key, value]) => {
        el.style[key] = value;
    });
    return el;
}

function createEl(tagName, { className = '', id = '', text = '', attrs = {}, styles = {} } = {}, children = []) {
    const el = document.createElement(tagName);
    if (id) el.id = id;
    if (className) el.className = className;
    if (text !== '') el.textContent = text;
    Object.entries(attrs).forEach(([name, value]) => {
        if (value !== undefined && value !== null) el.setAttribute(name, String(value));
    });
    setStyles(el, styles);
    children.filter(Boolean).forEach(child => el.appendChild(child));
    return el;
}

function hasPrintableContent(el) {
    if (!el) return false;
    return !!el.textContent.trim() || el.children.length > 0;
}

function appendEmptyState(target) {
    if (!target) return;

    const wrapper = createEl('div', { className: 'empty-state-wrapper' });
    const iconBox = createEl('div', { className: 'empty-icon-box' }, [
        createEl('span', { className: 'material-symbols-rounded', text: 'note_stack_add' })
    ]);
    const title = createEl('h2', { className: 'empty-title', text: 'Üres a munkaterület' });
    const subtitle = createEl('p', {
        className: 'empty-subtitle',
        text: 'Még nem hozott létre egyetlen értékelést sem. Ne várjon tovább, kezdje el a munkát az első dokumentum létrehozásával!'
    });
    const button = createEl('button', { className: 'empty-start-btn', attrs: { type: 'button' } }, [
        createEl('span', { className: 'material-symbols-rounded', text: 'add_circle' }),
        document.createTextNode(' Új értékelés indítása')
    ]);

    button.addEventListener('click', () => document.querySelector('#ujert')?.click());
    wrapper.append(iconBox, title, subtitle, button);
    target.replaceChildren(wrapper);
}

function createAuditMessageNode(senderName, message, idoHover, isoIdo) {
    return createEl('div', {
        className: 'uzenet1',
        attrs: { title: idoHover, 'data-ido': isoIdo }
    }, [
        createEl('div', { className: 'nev2', text: senderName }),
        createEl('div', { className: 'audit-messages2', text: message })
    ]);
}

function appendHataridoLista(target, hataridosok, isElemzo) {
    if (!target) return;

    if (hataridosok.length === 0) {
        target.replaceChildren(createEl('div', {
            className: 'hatarido-ures',
            text: 'Nincsenek közelgő határidők a rendszerben.'
        }));
        return;
    }

    const wrapper = createEl('div', { className: 'hatarido-tarolo' });
    wrapper.appendChild(createEl('h3', { className: 'hatarido-cim', text: 'Közelgő határidők' }));

    const list = createEl('ul', { className: 'hatarido-lista' });

    hataridosok.forEach(k => {
        const dateObj = new Date(k.hatarido);
        const formatDatum = dateObj.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/-/g, '.');

        const li = createEl('li', { className: 'hatarido-elem' });
        li.append(
            createEl('strong', { className: 'hatarido-datum', text: formatDatum }),
            document.createTextNode(' '),
            createEl('span', { className: 'hatarido-nev', text: k.vizsgalt_nev || 'Ismeretlen' }),
            document.createTextNode(' '),
            createEl('span', { className: 'hatarido-tipus', text: `- ${(k.kitoltes_neve || '').replace(/~/g, ' - ')}` })
        );

        if (isElemzo) {
            li.appendChild(createEl('span', {
                className: 'hatarido-owner',
                text: ` (Értékelő: ${k.creator_name || k.felhasznalo_nev || 'Ismeretlen'})`
            }));
        }

        list.appendChild(li);
    });

    wrapper.appendChild(list);
    target.replaceChildren(wrapper);
}


//Változók... sok.... változó
//Gombok 
const diagToggle = document.getElementById('diagToggle');
const diagContent = document.getElementById('diagContent');

// Ellenőrizzük, hogy biztosan megvannak-e az elemek
if (diagToggle && diagContent) {
    diagToggle.onclick = function() {
        this.classList.toggle('open');
        diagContent.classList.toggle('open');
        
        // Debug: írjuk ki, mik az aktuális osztályok
    };
}
export const BUTTONS = {
  tulaj: [
    {cls: 'fo_edit',        icon: 'edit',           help: 'Folytassa értékelését', label:'Folytatás'},
    {cls: 'edit',           icon: 'page_header',    help: 'Értékelés átnevezése', action: 'edit', label: 'Átnevezés'},  
    {icon: 'content_copy', action: 'duplicate', cls: 'duplicate', help: 'Értékelés másolása',label:'Másolás' },
    {cls: 'deleted',        icon: 'delete',         help: 'Értékelés törlése',                         action: 'delete', label:'Törlés'},    
    {cls: 'share',          icon: 'share',          help: 'Értékelés megosztása',                      action: 'share', label:'Megosztás'},
    {cls: 'lightbulb_2',    icon: 'lightbulb_2',    help: 'Meglévő értékelés átalakítása szabadszavas esszévé',         action: 'generate_ai', label:'AIGenerálás'},
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Értékelés mentése PDF formátumba',                  action: 'picture_as_pdf', label:'Letöltés'},    
    {cls: 'print',          icon: 'print',          help: 'Értékelés nyomtatása',                      action: 'print', label:'Nyomtatás'},   
  ],
  szerkeszto: [
    {cls: 'fo_edit',        icon: 'edit',           help: 'Folytassa értékelését', label:'Folytatás'},
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Letöltés PDF formátumba',                  action: 'picture_as_pdf', label:'Letöltés'},    
    {cls: 'print',          icon: 'print',          help: 'Értékelés nyomtatása',                      action: 'print', label:'Nyomtatás'},   
  ]
};
export const BUTTONS2 = {
  tulaj: [
    {cls: 'audit1',          icon: 'calendar_add_on',          help: 'Határidő beállítása',                      action: 'date', label:'Határidő'},   
    {cls: 'audit2',          icon: 'error',          help: 'Küldés auditációra',                      action: 'audit', label:'Auditáció'},   
        {cls: 'audit2',          icon: 'check_circle',          help: 'Értékelés jóváhagyása',                      action: 'approve', label:'Jóváhagyás'},   
    {cls: 'lightbulb_2',    icon: 'lightbulb_2',    help: 'Meglévő értékelés átalakítása szabadszavas esszévé',         action: 'generate_ai', label:'AIGeneráció'},

    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Értékelés mentése PDF formátumba',                  action: 'picture_as_pdf', label:'Letöltés'},    
    {cls: 'print',          icon: 'print',          help: 'Értékelés nyomtatása',                      action: 'print', label:'Nyomtatás'},   
  ],
  szerkeszto: [
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Értékelés mentése PDF formátumba',                  action: 'picture_as_pdf', label:'Letöltés'},    
    {cls: 'print',          icon: 'print',          help: 'Értékelés nyomtatása',                      action: 'print', label:'Nyomtatás'},   
  ]
};
function addHelpToButtons() {
    const buttonsConfig = [
        { id: 'ai-generate-btn', text: 'Csoportos értékelés átalakítása szabadszavas esszévé' },
        { id: 'print-pdf',       text: 'Nyomtatás' },
        { id: 'elore',           text: 'Értékelések összehasonlítása, fejlődési mutató' },
        { id: 'export-pdf',      text: 'Mentése PDF formátumban' }
    ];

    buttonsConfig.forEach(config => {
        const btn = document.getElementById(config.id);
        if (btn) {
            btn.classList.add('modulebutt');
            
            if (!btn.querySelector('.help')) {
                const span = document.createElement('span');
                span.className = 'help'; 
                span.style.top ="110%";
                span.style.height="100%";
                span.textContent = config.text;
                btn.appendChild(span);
            }
        }
        if (config.id === 'ai-generate-btn') {
                btn.addEventListener('mouseenter', () => {
                    const helpSpan = btn.querySelector('.help');
                    const elsoKartya = document.querySelector('.meglevok');
                    
                    if (helpSpan && elsoKartya) {
                        const globalLimit = elsoKartya.dataset.aiOsszMax !== undefined ? elsoKartya.dataset.aiOsszMax : 100;
                        helpSpan.textContent = `Csoportos elemzés (Hátralévő teljes intézményi keret: ${globalLimit})`;
                    }
                });
            }
    });
}

    export const felbukkano3 = document.querySelector("#felbukkano3");
    export const felbukkano2 = document.querySelector("#felbukkano2");
    export const felbukkano4 = document.querySelector("#felbukkano4");
    export const idszak = document.querySelector("#idoszak");
    const kilep2 = document.querySelector("#kilep2");
    const innerDiv = document.querySelector(".inner-div")
    const sajtnev = document.querySelector("#sajatnev");
    const lapozo = document.getElementById('lapozo');
    const maininf = document.getElementById('maininf');
    const osszesitett = document.getElementById('osszesitett');
    const gyik = document.getElementById('gyik');

    export let modulId = null;   
    export let modulNev = null;   
    export let modulLeiras = null;  
    export let userId = null; 
    export let leiras = null;
        export let role = null;
        export let tel = null;
        export let fizetve = null;
        export let int_fin = null;
    export let userName = null; 
    export let intezmeny =null;
    export let intezmeny_id =null;
    export let mailname = null; 
    export let adatok = null;
    export let letrehoz = null;
    export let fullname = null;
    export let resz1 = '', resz2 = '', resz3 = ''; // Globális változók az eredeti értékek tárolására
    export let aktualisKitoltesId = null; // Globális változó a kitöltés ID tárolására
    export let hozzaferhetoModulok = [];

//Betöltés logo mert fancy
    export function animateMessage(text, fontSize, color) {
        const logobelso = document.getElementById('logobelso');
        if (logobelso) {
            logobelso.textContent = text;
            logobelso.style.fontSize = fontSize;
            logobelso.style.color = color;
            logobelso.style.textAlign = "center";
            logobelso.classList.remove('fade-out', 'fade-in'); // Előző animációk törlése
            logobelso.classList.add('fade-in'); // Beúsztatás
        }
    } 
//Inaktivitás miatt kijelentkeztetés
   let inactivityTimer;
        document.addEventListener('mousemove', resetInactivityTimer);
        document.addEventListener('keypress', resetInactivityTimer);
    resetInactivityTimer();
    getUserAndLoadKitoltesek();
   export function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            // Logout kérés küldése a backend felé
            fetch('/logout', { method: 'POST' })
                .then(() => {
                showAlert('Automatikus kijelentkeztetés tétlenség miatt. Várjuk vissza!');
                    window.location.href = '/index.html'; // Átirányítás az index oldalra
                })
                .catch(err => console.error('Hiba a kijelentkezés során:', err));
        }, 920000); // 1 perc inaktivitás
    }
//Felhasználó azonosítása
  export async function getUserAndLoadKitoltesek() {
    try {
        const response = await fetch('/get-username', {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });
        const data = await response.json();

        if (data.success) {
            sajtnev.textContent = ` ${data.username || ''}`;
            userId = data.id; 
            fullname = data.vez;
            mailname = data.mail;
            fizetve = data.fizetve;
            int_fin = data.intfin;
            userName = data.username; 
            leiras = data.leiras;
            role = data.role;
            tel = data.tel;
            intezmeny = data.intnev; 
            intezmeny_id = data.int_id;
            modulId      = data.modulId;      // pl. 1
            modulNev     = data.modulNev;     // pl. "Fejlesztő"
            modulLeiras  = data.modulLeiras;
            hozzaferhetoModulok = data.hozzaferesModulok || [];

            if (typeof window.loadLicenseStatus === 'function') {
                await window.loadLicenseStatus();
            }

            const holis = document.querySelector('.holvagyok')
            holis.textContent = modulLeiras || '';
            await betoltKategoriakChartSzinek(modulId);

            // --- INNENTŐL JÖN A MÓDOSÍTÁS ---
            
            // Megnézzük, hogy az elemző modulban vagyunk-e (az URL alapján)
            if (!window.location.pathname.includes('elemzo')) {
                // Ha NEM az elemzőben vagyunk (hanem a sima user dashboardon), 
                // akkor töltsük be a sima saját értékeléseket.
                await loadKitoltesek();
            } else {
      
                console.log("dashMain.js: Alap adatok betöltve. A megjelenítést a dashEmain.js veszi át.");
            }


        } else {
            console.error('Hiba:', data.message);
        }
    } catch (error) {
        console.error('Fetch hiba:', error);
    }
}
    //azonosítási adatok alapján mérések szipkázása, kezelése
async function loadKitoltesek() {
    window.frissitKitoltesek = loadKitoltesek;

    try {
        const response = await fetch('/api/get-kitoltesek');
        const data = await response.json();

    
         if (data.success) {
  const kitoltesek = data.kitoltesek;




  window.userAuditKitoltesek = kitoltesek.filter(k => k.audit == 1 || k.audit == 2);

initLetrehoz();
  const role = data.role;

  // LÉTREHOZÁS logika → mindig legyen elérhető

 if (kitoltesek.length === 0) {
    appendEmptyState(innerDiv);
    return;
  }
            const selectElement = document.querySelector('#inner-div-select');

        //SZERKESZTÉS - szerkesztési logika - dashCRUD.js
            const letrehozva = new Date().toISOString().split('T')[0];
             //OLVASÁS - meglévők betöltése - dashCRUD.js
await initOlvas(kitoltesek, letrehozva);
            initFrissites({ userId, letrehozva });
initAuditLista(kitoltesek)
        //TÖRLÉS - Törlési kezelés - dasCRUD.js
            initTorol();
            addHelpToButtons();

       
        //MEGOSZTÁS - megosztási logika - dashShare.js fájl
        //Analaizis
            monitorozCheckek(); // Ahol már betöltötted az értékeléseket és DOM kész
     
            } else {console.error('Hiba történt:', data.message);}
        } catch (error) {console.error('Fetch hiba:', error);
        }
    }

//Új értékelés felbukkanó ablaka
    const ujert = document.querySelector("#ujert")
      ujert.addEventListener("click", function(){
       

            felbukkano2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
            felbukkano2.style.opacity = "1"; 
            felbukkano2.style.scale ="1";
        }, 100);
    
try { initLetrehoz(); } catch(e) { console.warn(e); }  })
     kilep2.addEventListener("click", function(){
        felbukkano2.style.scale ="0.0";

        felbukkano2.style.opacity = "0"; 
        setTimeout(() => {
            
            felbukkano2.style.display = "none";
        }, 400);
    })
const fw = document.getElementById('floating-audit-warning');

//Oldalső lapozó sáv aktív classa
// Konfiguráció: melyik gomb (osztály) mit mutasson/rejtsen


const sections = {
    'maininf': document.getElementById('maininf'),
    'osszesitett': document.getElementById('osszesitett'),
    'gyik': document.getElementById('gyik'),
    'lista': document.getElementById('lista'), // Új szekció
    'uj-ful-2': document.getElementById('uj-ful-2') // Új szekció
};


lapozo.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); // Biztosítja, hogy akkor is működjön, ha ikon van a gombban
    if (!btn || !btn.dataset.target) return;

    const targetId = btn.dataset.target;

    // 1. Aktiv osztály kezelése minden gyermeken
    [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
    btn.classList.add('aktiv');

    // 2. Megjelenítés/Elrejtés logika
    Object.keys(sections).forEach(id => {
        const section = sections[id];
        if (section) {
            section.style.display = (id === targetId) ? 'flex' : 'none';
        }
    });

    // +++ ÚJ: Határidő lista betöltése, ha a listára kattintunk +++
    if (targetId === 'lista') {
        renderHataridoLista();
    }
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    // 3. Speciális elemek kezelése (pl. a lebegő figyelmeztetés)
    if (fw) {
        fw.style.display = (targetId === 'maininf') ? 'block' : 'none';
    }
});
//Checkbox figyelő
document.addEventListener('change', (e) => {
  if (e.target.matches('input[type="checkbox"].cheking')) {
    const bejeloltek = document.querySelectorAll('input[type="checkbox"].cheking:checked');

    if (bejeloltek.length > 0) {
      // Aktiv osztály állítása
      [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
      const statBtn = lapozo.querySelector('.sta');
      if (statBtn) statBtn.classList.add('aktiv');

      // Nézet váltás
      maininf.style.display = 'none';
      osszesitett.style.display = 'flex';
            gyik.style.display = 'none';
    }
  }
});


function ensureFolyamatModalExists() {
    if (document.getElementById('folyamat-modal-overlay')) return;

    const overlay = createEl('div', { id: 'folyamat-modal-overlay' });
    setStyles(overlay, {
        display: 'none',
        position: 'fixed',
        inset: '0',
        zIndex: '9999',
        background: 'rgba(0,0,0,.62)',
        backdropFilter: 'blur(5px)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '22px'
    });

    const box = createEl('div', { id: 'folyamat-modal-box' });
    setStyles(box, {
        width: 'min(1200px, 96vw)',
        height: '88vh',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 18px 70px rgba(0,0,0,.38)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    });

    const header = createEl('div');
    setStyles(header, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '16px 20px',
        borderBottom: '1px solid #eee',
        background: '#fff8ef'
    });

    const title = createEl('h2', { text: 'Előrehaladás' });
    setStyles(title, { margin: '0', color: '#333', fontSize: '1.25rem' });

    const actions = createEl('div');
    setStyles(actions, { display: 'flex', gap: '8px', alignItems: 'center' });

    const pdfBtn = createEl('button', {
        id: 'folyamat-modal-pdf',
        className: 'modulebutt',
        attrs: { type: 'button' }
    }, [
        createEl('span', { className: 'material-symbols-rounded', text: 'picture_as_pdf' }),
        document.createTextNode(' PDF')
    ]);

    const printBtn = createEl('button', {
        id: 'folyamat-modal-print',
        className: 'modulebutt',
        attrs: { type: 'button' }
    }, [
        createEl('span', { className: 'material-symbols-rounded', text: 'print' }),
        document.createTextNode(' Nyomtatás')
    ]);

    const closeBtn = createEl('button', {
        id: 'folyamat-modal-close',
        text: '×',
        attrs: { type: 'button' }
    });
    setStyles(closeBtn, {
        width: '38px',
        height: '38px',
        border: 'none',
        borderRadius: '50%',
        background: '#333',
        color: '#fff',
        fontSize: '24px',
        cursor: 'pointer',
        lineHeight: '1'
    });

    actions.append(pdfBtn, printBtn, closeBtn);
    header.append(title, actions);

    const content = createEl('div', { id: 'folyamat-modal-content' });
    setStyles(content, {
        flex: '1',
        overflow: 'auto',
        padding: '24px',
        background: '#fafafa'
    });

    box.append(header, content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', closeFolyamatModal);

    overlay.addEventListener('click', (event) => {
        if (event.target.id === 'folyamat-modal-overlay') {
            closeFolyamatModal();
        }
    });

    printBtn.addEventListener('click', printFolyamatModal);
    pdfBtn.addEventListener('click', pdfFolyamatModal);
}

function cloneFolyamatWithCharts(source) {
    const clone = source.cloneNode(true);

    clone.id = 'folyamat-modal-clone';
    clone.style.display = 'flex';
    clone.style.opacity = '1';
    clone.style.visibility = 'visible';
    clone.style.position = 'static';
    clone.style.width = '100%';
    clone.style.maxWidth = '100%';
    clone.style.height = 'auto';

    clone.querySelectorAll('canvas').forEach(canvas => {
        canvas.removeAttribute('width');
        canvas.removeAttribute('height');
        canvas.style.width = '100%';
        canvas.style.height = '420px';
        canvas.style.maxWidth = '100%';

        const parent = canvas.parentElement;
        if (parent) {
            parent.style.width = '100%';
            parent.style.height = '440px';
            parent.style.position = 'relative';
        }
    });

    return clone;
}

function clonePlainObject(value) {
    try {
        return structuredClone(value);
    } catch {
        return JSON.parse(JSON.stringify(value));
    }
}

function bindFolyamatModalThemeCheckboxes(clone) {
    if (!clone || clone.dataset.modalFolyamatControlsBound === '1') return;
    clone.dataset.modalFolyamatControlsBound = '1';

    const getModalLineChart = () => {
        return (window.__folyamatModalCharts || []).find(c => c?.canvas?.id === 'osszehasonlitoVonaldiagram')
            || (window.__folyamatModalCharts || [])[0];
    };

    const getSelectedThemes = () => {
        const temakBox = clone.querySelector('.temak-container');

        if (!temakBox) return null;

        return new Set(
            Array.from(temakBox.querySelectorAll('input[name="tema"]:checked')).map(cb => cb.value)
        );
    };

    const renumberSorrendSelects = (chart) => {
        const ids = chart?.$folyamatAktualisIds || chart?.$folyamatOsszesIds || [];
        const pozicioMap = new Map(ids.map((id, index) => [String(id), String(index + 1)]));

        clone.querySelectorAll('.folyamat-sorrend-select').forEach(select => {
            const pozicio = pozicioMap.get(String(select.dataset.kitoltesId));
            if (pozicio) select.value = pozicio;
        });
    };

    const frissitModalDiagram = () => {
        const chart = getModalLineChart();
        if (!chart) return;

        const kivalasztottTemak = getSelectedThemes();

        const osszesLabel = chart.$folyamatOsszesLabels || clonePlainObject(chart.data.labels || []);
        const osszesDataset = chart.$folyamatOsszesDataset || clonePlainObject(chart.data.datasets || []);
        const osszesIds = chart.$folyamatOsszesIds || osszesLabel.map((_, index) => String(index));
        const aktualisIds = chart.$folyamatAktualisIds || osszesIds.slice();

        const indexek = aktualisIds
            .map(id => osszesIds.indexOf(String(id)))
            .filter(index => index >= 0);

        chart.data.labels = indexek.map(index => osszesLabel[index]);

        chart.data.datasets = osszesDataset
            .filter(ds => !kivalasztottTemak || kivalasztottTemak.has(ds.label))
            .map(ds => {
                const masolat = clonePlainObject(ds);
                masolat.data = indexek.map(index => Array.isArray(ds.data) ? (ds.data[index] ?? 0) : 0);
                return masolat;
            });

        chart.update('none');
    };

    const sorrendValtozott = (select) => {
        const chart = getModalLineChart();
        if (!chart) return;

        const osszesIds = chart.$folyamatOsszesIds || [];
        const aktualisIds = (chart.$folyamatAktualisIds || osszesIds.slice()).map(String);
        const id = String(select.dataset.kitoltesId);
        const jelenlegiIndex = aktualisIds.indexOf(id);

        if (jelenlegiIndex < 0) return;

        const celIndex = Math.max(0, Math.min(Number(select.value) - 1, aktualisIds.length - 1));

        aktualisIds.splice(jelenlegiIndex, 1);
        aktualisIds.splice(celIndex, 0, id);

        chart.$folyamatAktualisIds = aktualisIds;

        renumberSorrendSelects(chart);
        frissitModalDiagram();
    };

    clone.addEventListener('change', (event) => {
        if (event.target?.matches?.('input[name="tema"]')) {
            frissitModalDiagram();
            return;
        }

        if (event.target?.matches?.('.folyamat-sorrend-select')) {
            sorrendValtozott(event.target);
        }
    });

    const chart = getModalLineChart();
    if (chart && !chart.$folyamatAktualisIds) {
        chart.$folyamatAktualisIds = (chart.$folyamatOsszesIds || []).slice();
    }

    renumberSorrendSelects(chart);
    frissitModalDiagram();
}

function replaceCanvasesWithImages(sourceRoot, targetRoot, ownerDocument = document) {
    const sourceCanvases = Array.from(sourceRoot.querySelectorAll('canvas'));
    const targetCanvases = Array.from(targetRoot.querySelectorAll('canvas'));

    targetCanvases.forEach((targetCanvas, index) => {
        const sourceCanvas = sourceCanvases[index];
        if (!sourceCanvas) return;

        try {
            const chart = window.Chart?.getChart(sourceCanvas);
            if (chart) chart.update('none');

            const img = ownerDocument.createElement('img');
            img.src = sourceCanvas.toDataURL('image/png');
            img.alt = sourceCanvas.getAttribute('aria-label') || 'Előrehaladás diagram';
            img.style.display = 'block';
            img.style.width = targetCanvas.style.width || '100%';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.margin = '0 auto';

            targetCanvas.replaceWith(img);
        } catch (err) {
            console.warn('Canvas képpé alakítása sikertelen:', err);
        }
    });
}

function clonePrintableFolyamatContent(content) {
    const clone = content.cloneNode(true);

    // A sorrendválasztó csak képernyős vezérlő.
    // A diagram már az aktuális sorrendet tartalmazza, ezért PDF-be/nyomtatásba
    // nem kell és nem is szabad bekerülnie a beállító felületnek.
    clone.querySelectorAll('.folyamat-sorrend-valaszto').forEach(el => el.remove());

    clone.querySelectorAll('input[type="checkbox"]').forEach(input => {
        if (input.checked) {
            input.setAttribute('checked', 'checked');
        } else {
            input.removeAttribute('checked');
        }
    });

    replaceCanvasesWithImages(content, clone, document);
    return clone;
}

function rebuildChartsInFolyamatModal(source, clone) {
    if (!window.Chart) {
        console.warn('Chart.js nem érhető el a modal chart újrarajzolásához.');
        return;
    }

    if (Array.isArray(window.__folyamatModalCharts)) {
        window.__folyamatModalCharts.forEach(chart => {
            try { chart.destroy(); } catch {}
        });
    }

    window.__folyamatModalCharts = [];

    const sourceCanvases = Array.from(source.querySelectorAll('canvas'));
    const clonedCanvases = Array.from(clone.querySelectorAll('canvas'));

    clonedCanvases.forEach((clonedCanvas, index) => {
        const sourceCanvas = sourceCanvases[index];
        if (!sourceCanvas) return;

        const sourceChart = Chart.getChart(sourceCanvas);

        if (!sourceChart) {
            console.warn('Nem található Chart.js példány ehhez a canvashoz:', sourceCanvas.id);
            return;
        }

        const ctx = clonedCanvas.getContext('2d');

        const chartConfig = {
            type: sourceChart.config.type,
            data: clonePlainObject(sourceChart.data),
            options: clonePlainObject(sourceChart.options || {})
        };

        chartConfig.options.responsive = true;
        chartConfig.options.maintainAspectRatio = false;
        chartConfig.options.animation = false;

        const modalChart = new Chart(ctx, chartConfig);
        modalChart.$folyamatOsszesDataset = clonePlainObject(chartConfig.data.datasets || []);
        modalChart.$folyamatOsszesLabels = clonePlainObject(chartConfig.data.labels || []);

        let folyamatIds = [];
        try {
            folyamatIds = JSON.parse(sourceCanvas.dataset.folyamatIds || clonedCanvas.dataset.folyamatIds || '[]').map(String);
        } catch {
            folyamatIds = [];
        }

        if (folyamatIds.length !== modalChart.$folyamatOsszesLabels.length) {
            folyamatIds = modalChart.$folyamatOsszesLabels.map((_, index) => String(index));
        }

        modalChart.$folyamatOsszesIds = folyamatIds;
        modalChart.$folyamatAktualisIds = folyamatIds.slice();

        modalChart.resize();
        modalChart.update('none');

        window.__folyamatModalCharts.push(modalChart);
    });

    bindFolyamatModalThemeCheckboxes(clone);
}

function openFolyamatModal() {
    ensureFolyamatModalExists();

    const source = document.querySelector('#folyamat');
    const target = document.querySelector('#folyamat-modal-content');
    const overlay = document.querySelector('#folyamat-modal-overlay');

    if (!source || !target || !overlay) {
        showAlert('Az előrehaladás tartalma nem található.');
        return;
    }

    const eredetiDisplay = source.style.display;
    const computedDisplay = window.getComputedStyle(source).display;

    if (computedDisplay === 'none') {
        source.style.display = 'flex';
        source.style.position = 'absolute';
        source.style.left = '-99999px';
        source.style.top = '0';
        source.style.visibility = 'hidden';
    }

  requestAnimationFrame(() => {
    const clone = cloneFolyamatWithCharts(source);

    target.replaceChildren(clone);

    overlay.style.display = 'flex';

    requestAnimationFrame(() => {
        rebuildChartsInFolyamatModal(source, clone);

        if (computedDisplay === 'none') {
            source.style.display = eredetiDisplay || 'none';
            source.style.position = '';
            source.style.left = '';
            source.style.top = '';
            source.style.visibility = '';
        }

        const eloreBtn = document.getElementById('elore');
        if (eloreBtn) eloreBtn.classList.add('aktivm');
    });
});
}
function closeFolyamatModal() {
    if (Array.isArray(window.__folyamatModalCharts)) {
    window.__folyamatModalCharts.forEach(chart => {
        try { chart.destroy(); } catch {}
    });
    window.__folyamatModalCharts = [];
}
    const overlay = document.querySelector('#folyamat-modal-overlay');
    if (overlay) overlay.style.display = 'none';

    const eloreBtn = document.getElementById('elore');
    if (eloreBtn) eloreBtn.classList.remove('aktivm');
}

function printFolyamatModal() {
    const content = document.querySelector('#folyamat-modal-content');
    if (!hasPrintableContent(content)) {
        showAlert('Nincs nyomtatható előrehaladási tartalom.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showAlert('A nyomtatási ablakot a böngésző blokkolta.');
        return;
    }

    const printDoc = printWindow.document;
    printDoc.open();
    printDoc.write('<!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8"><title>Előrehaladás</title></head><body></body></html>');
    printDoc.close();

    const style = printDoc.createElement('style');
    style.textContent = `
        body {
            font-family: Arial, sans-serif;
            color: #222;
            padding: 24px;
            background: #fff;
        }

        h1, h2, h3 {
            color: #333;
        }

        canvas {
            max-width: 100% !important;
            height: auto !important;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        td, th {
            border: 1px solid #ccc;
            padding: 6px;
        }

        @media print {
            body {
                padding: 0;
            }
        }
    `;
    printDoc.head.appendChild(style);
    printDoc.body.appendChild(printDoc.createElement('h2')).textContent = 'Előrehaladás';

    const printableClone = clonePrintableFolyamatContent(content);
    printDoc.body.appendChild(printDoc.importNode(printableClone, true));

    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 600);
}

async function pdfFolyamatModal() {
    const content = document.querySelector('#folyamat-modal-content');

    if (!hasPrintableContent(content)) {
        showAlert('Nincs PDF-be menthető előrehaladási tartalom.');
        return;
    }

    try {
        if (typeof window.html2canvas === 'undefined') {
            await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }

        if (typeof window.pdfMake === 'undefined') {
            await import('/both/fonts/pdfmake.min.js');
        }

        if (!window.pdfMake?.vfs) {
            await import('/both/fonts/vfs_fonts.js');
        }

        const pdfClone = clonePrintableFolyamatContent(content);
        pdfClone.id = 'folyamat-pdf-snapshot';
        pdfClone.style.position = 'fixed';
        pdfClone.style.left = '-99999px';
        pdfClone.style.top = '0';
        pdfClone.style.width = `${content.scrollWidth || content.offsetWidth || 1100}px`;
        pdfClone.style.height = 'auto';
        pdfClone.style.overflow = 'visible';
        pdfClone.style.background = '#ffffff';

        document.body.appendChild(pdfClone);

        let canvas;
        try {
            canvas = await html2canvas(pdfClone, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });
        } finally {
            pdfClone.remove();
        }

        const imgData = canvas.toDataURL('image/png');

        if (!window.pdfMake.fonts) window.pdfMake.fonts = {};

        const firstFont = Object.keys(window.pdfMake.vfs || {})[0];

        window.pdfMake.fonts.Times = {
            normal: window.pdfMake.vfs['times.ttf'] ? 'times.ttf' : firstFont,
            bold: window.pdfMake.vfs['timesbd.ttf'] ? 'timesbd.ttf' : firstFont,
            italics: window.pdfMake.vfs['timesi.ttf'] ? 'timesi.ttf' : firstFont,
            bolditalics: window.pdfMake.vfs['timesbi.ttf'] ? 'timesbi.ttf' : firstFont
        };

        const docDefinition = {
            pageOrientation: 'landscape',
            pageMargins: [30, 45, 30, 35],
            defaultStyle: {
                font: 'Times'
            },
            header: {
                text: 'Előrehaladás',
                alignment: 'right',
                margin: [30, 18, 30, 0],
                color: '#888',
                fontSize: 10
            },
            content: [
                {
                    text: 'Előrehaladás',
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 14]
                },
                {
                    image: imgData,
                    width: 760
                }
            ],
            footer: function(currentPage, pageCount) {
                return {
                    text: `${currentPage} / ${pageCount}`,
                    alignment: 'center',
                    fontSize: 9,
                    margin: [0, 8, 0, 0]
                };
            }
        };

        window.pdfMake.createPdf(docDefinition).download('elorehaladas.pdf');
    } catch (err) {
        console.error('Előrehaladás PDF hiba:', err);
        showAlert('Nem sikerült PDF-et készíteni az előrehaladás nézetből.');
    }
}

const eloreBtn = document.getElementById('elore');

if (eloreBtn && !eloreBtn.dataset.folyamatModalBound) {
    eloreBtn.dataset.folyamatModalBound = '1';

    eloreBtn.addEventListener('click', function(event) {
        event.preventDefault();
        openFolyamatModal();
    });
}
const toggleSwitch = document.getElementById('chart-toggle');
if(toggleSwitch){
    const chartContainer = document.querySelector('#folyamat');
    toggleSwitch.addEventListener('change', function() {
      if (this.checked) chartContainer.style.display = 'flex';
      else chartContainer.style.display = 'none';
    });
}

// --- KÖZÖS DOKUMENTUM KATTINTÁS FIGYELŐ (EVENT DELEGATION) ---
document.addEventListener('click', async (e) => {
    
    // 1. JAVASLATOK / ENGEDÉLYEK GOMB (Szinkron logika)
    if (e.target.closest('#hozzaj') || e.target.closest('#hozzaj0')) {
        setTimeout(() => {
            if (window.userAuditKitoltesek) {
                initAuditLista(window.userAuditKitoltesek);
            }
        }, 150);
        return; // Ha ez volt a célpont, itt meg is állíthatjuk a futást
    }

    // 2. FELHASZNÁLÓI ÜZENETKÜLDÉS GOMB (Aszinkron logika)
    if (e.target.id === 'audit-msg-send2') {
        
        // Védelem a duplázódás ellen
        if (e.target.disabled) return;
        e.stopImmediatePropagation(); 

        const inputField = document.getElementById('audit-msg-input');
        const message = inputField.value.trim();
        
        if (!message) {
            alert("Kérjük, írjon be egy üzenetet küldés előtt!");
            return;
        }

        const activeRow = document.querySelector('.inner-div-notok .meglevok.kijelolt, .inner-div-ok .meglevok.kijelolt');
        if (!activeRow) {
            alert('Nincs kiválasztva értékelés az üzenetküldéshez!');
            return;
        }

        const auditId = activeRow.dataset.kitoltesId || activeRow.dataset.id;
        const sendBtn = e.target;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Küldés...';

        try {
            const currentUserName = userName || 'Értékelés szerzője'; 
            
            const response = await fetch('/api/add-audit-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audit_ids: [auditId],
                    sender_name: currentUserName,
                    message: message,
                    sender_type: 'user'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                inputField.value = ''; 
                const messengerDiv = document.querySelector('.messengerdiv');
                
                if (messengerDiv.querySelector('p')) {
                    clearElement(messengerDiv);
                }
                
                const now = new Date();
                const idoHover = now.toLocaleString('hu-HU');
                const isoIdo = now.toISOString();

                messengerDiv.appendChild(createAuditMessageNode(currentUserName, message, idoHover, isoIdo));
                messengerDiv.scrollTop = messengerDiv.scrollHeight; 

                // --- ÚJ RÉSZ: E-mail küldése az elemzőnek a háttérben ---
                const currNev = activeRow.dataset.nev || 'Ismeretlen';
                const currIdoszak = activeRow.dataset.periodus || '';
                const currTipus = activeRow.dataset.megnev || '';
                const teljesNev = `${currNev} (${currIdoszak} - ${currTipus})`;

                fetch('/api/notify-auditor-reply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        audit_id: auditId,
                        uzenet: message,
                        user_name: currentUserName,
                        assessment_name: teljesNev // <-- Ezt küldjük át pluszban!
                    })
                }).catch(err => console.error('Hiba az auditor értesítésekor:', err));
            } else {
                alert('Hiba történt: ' + data.message);
            }
        } catch (err) {
            console.error('Fetch hiba:', err);
            alert('Szerver hiba történt az üzenet küldésekor!');
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Küldés';
        }
    }
});
// ÚJ: Határidő lista generálása a "Lista" fülre
function renderHataridoLista() {
    const listaDiv = document.getElementById('lista');
    if (!listaDiv) return;

    const isElemzo = window.location.pathname.includes('elemzo');
    
    // 1. Megfelelő adathalmaz kiválasztása
    let data = [];
    if (isElemzo) {
        data = window.elemzoKitoltesek || [];
    } else {
        const nyersData = window.userAuditKitoltesek || [];
        data = nyersData;
    }

    // 2. Szűrés: csak azok kellenek, amiknél audit == 1 és VAN határidő megadva
    let hataridosok = data.filter(k => k.audit == 1 && k.hatarido);

    // Rendezés: legközelebbi határidő legyen elöl (időrendben növekvő)
    hataridosok.sort((a, b) => new Date(a.hatarido) - new Date(b.hatarido));

    // 3. Lista DOM-ból építve, nem HTML stringből
    appendHataridoLista(listaDiv, hataridosok, isElemzo);

}
    const diagramm = document.querySelector(".charts");

const chartSelector = document.getElementById('chartTypeOff1');
const chartTypeOff1Text = document.getElementById('chartTypeOff1Text');

if (chartSelector) {
    chartSelector.addEventListener('change', (event) => {
        const beVanKapcsolva = event.target.checked;

        if (beVanKapcsolva) {
            diagramm.style.display = 'flex';
            maininf.style.display = 'flex';
            document.querySelector(".diaggombok-kulso").style.display = 'flex';

            

            if (chartTypeOff1Text) {
                chartTypeOff1Text.textContent = 'Be';
            }
        } else {
            diagramm.style.display = 'none';
            document.querySelector(".diaggombok-kulso").style.display = 'none';
            if (chartTypeOff1Text) {
                chartTypeOff1Text.textContent = 'Ki';
            }
        }
    });
}
const nagyitSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
        <path d="M120-120v-240h80v104l124-124 56 56-124 124h104v80H120Zm480 0v-80h104L580-324l56-56 124 124v-104h80v240H600ZM324-580 200-704v104h-80v-240h240v80H256l124 124-56 56Zm312 0-56-56 124-124H600v-80h240v240h-80v-104L636-580Z"/>
    </svg>
`;

const kicsinyitSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
        <path d="m156-100-56-56 124-124H120v-80h240v240h-80v-104L156-100Zm648 0L680-224v104h-80v-240h240v80H736l124 124-56 56ZM120-600v-80h104L100-804l56-56 124 124v-104h80v240H120Zm480 0v-240h80v104l124-124 56 56-124 124h104v80H600Z"/>
    </svg>
`;

function valtNagyitas(nagyitGomb) {
    const maininf = document.getElementById('maininf');

    if (!maininf) {
        console.warn('Nagyítás sikertelen: hiányzik a #maininf elem.');
        return;
    }

    const nagyitvaVan = maininf.classList.toggle('maininf-nagyitva');

    document.querySelectorAll('.modules').forEach(elem => {
        elem.classList.toggle('modules-rejtve', nagyitvaVan);
    });

    nagyitGomb.innerHTML = nagyitvaVan ? kicsinyitSvg : nagyitSvg;
    nagyitGomb.setAttribute('aria-expanded', nagyitvaVan ? 'true' : 'false');
    nagyitGomb.setAttribute('role', 'button');
    nagyitGomb.setAttribute('tabindex', '0');
}

document.addEventListener('click', (event) => {
    const nagyitGomb = event.target.closest('.nagyit');

    if (!nagyitGomb) return;

    event.preventDefault();
    event.stopPropagation();

    valtNagyitas(nagyitGomb);
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const nagyitGomb = event.target.closest('.nagyit');

    if (!nagyitGomb) return;

    event.preventDefault();

    valtNagyitas(nagyitGomb);
});