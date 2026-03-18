//Dashboard kezelő (CRUD,SHARE,VIEW,ANALISTIC, PDF)
import { initFrissites, initTorol, initOlvas, initLetrehoz } from './dashCRUD.js'; //Szerkesztés, törlés, létrehozás, stb
import { monitorozCheckek } from './dashStatic.js'; //Csoport statisztika
import { loadInfoAndInit } from '../info/infoLoader.js'; //Hírek és gyk betöltése
import { betoltKategoriakChartSzinek } from '../main/main_alap.js';
import {initAside} from './dashAside.js';
import './dashAI.js';
import { initAuditLista } from '../elemzo/dashAudit.js';

import{showAlert} from "/both/alert.js"


loadInfoAndInit(); 
initAside();


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
    {cls: 'lightbulb_2',    icon: 'lightbulb_2',    help: 'Meglévő értékelés átalakítása szabadszavas esszévé',         action: 'generate_ai', label:'AI Generálás'},
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Értékelés mentése PDF formátumba',                  action: 'picture_as_pdf', label:'Letöltés'},    
    {cls: 'print',          icon: 'print',          help: 'Értékelés nyomtatása',                      action: 'print', label:'Nyomtatás'},   
  ],
  szerkeszto: [
    {cls: 'fo_edit',        icon: 'edit',           help: 'Folytassa értékelését', label:'Folytatás'},
    {cls: 'lightbulb_2',    icon: 'lightbulb_2',    help: 'Meglévő értékelés átalakítása szabadszavas esszévé',         action: 'generate_ai', label:'AI Generálás'},
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Letöltés PDF formátumba',                  action: 'picture_as_pdf', label:'Letöltés'},    
    {cls: 'print',          icon: 'print',          help: 'Értékelés nyomtatása',                      action: 'print', label:'Nyomtatás'},   
  ]
};
export const BUTTONS2 = {
  tulaj: [
    {cls: 'audit1',          icon: 'calendar_add_on',          help: 'Határidő beállítása',                      action: 'date', label:'Határidő'},   
    {cls: 'audit2',          icon: 'error',          help: 'Küldés auditációra',                      action: 'audit', label:'Auditáció'},   

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
            logobelso.innerHTML = text;
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
            sajtnev.innerHTML = "&nbsp;" + data.username;

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

            const holis = document.querySelector('.holvagyok')
            holis.innerHTML = modulLeiras;

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
const url = `/api/get-kitoltesek?felhasznalo_id=${userId}&modul_id=${modulId}`;
    const response = await fetch(url);

            const data = await response.json();
    
         if (data.success) {
  const kitoltesek = data.kitoltesek;




  window.userAuditKitoltesek = kitoltesek.filter(k => k.audit == 1 || k.audit == 2);

  initLetrehoz({ userId, modulId });

  const role = data.role;

  // LÉTREHOZÁS logika → mindig legyen elérhető

  if (kitoltesek.length === 0) {
    innerDiv.innerHTML = '<p style="font-family: auto; color: white; font-style: italic;" >Még nincsenek értékelései. Hozzon létre újakat!</p>';
    return;
  }
            const selectElement = document.querySelector('#inner-div-select');

        //SZERKESZTÉS - szerkesztési logika - dashCRUD.js
            const letrehozva = new Date().toISOString().split('T')[0];
             //OLVASÁS - meglévők betöltése - dashCRUD.js
            initOlvas(kitoltesek, letrehozva);

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
    
try { initLetrehoz({ userId, modulId }); } catch(e) { console.warn(e); }  })
     kilep2.addEventListener("click", function(){
        felbukkano2.style.scale ="0.0";

        felbukkano2.style.opacity = "0"; 
        setTimeout(() => {
            
            felbukkano2.style.display = "none";
        }, 400);
    })

//Oldalső lapozó sáv aktív classa
// Konfiguráció: melyik gomb (osztály) mit mutasson/rejtsen


const sections = {
    'maininf': document.getElementById('maininf'),
    'osszesitett': document.getElementById('osszesitett'),
    'gyik': document.getElementById('gyik'),
    'lista': document.getElementById('lista'), // Új szekció
    'uj-ful-2': document.getElementById('uj-ful-2') // Új szekció
};

const fw = document.getElementById('floating-audit-warning');

lapozo.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); // Biztosítja, hogy akkor is működjön, ha ikon van a gombban
    if (!btn || !btn.dataset.target) return;

    const targetId = btn.dataset.target;

    // 1. Aktiv osztály kezelése minden gyermeken
    [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
    btn.classList.add('aktiv');

    // 2. Megjelenítés/Elrejtés logika (Iteratív megközelítés)
    Object.keys(sections).forEach(id => {
        const section = sections[id];
        if (section) {
            section.style.display = (id === targetId) ? (id === 'gyik' ? 'flex' : 'flex') : 'none';
        }
    });

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

const eloreBtn = document.getElementById('elore');
const chartContainer = document.querySelector('#folyamat');
if (eloreBtn && chartContainer) {
    eloreBtn.addEventListener('click', function() {
        const currentDisplay = window.getComputedStyle(chartContainer).display;
        
        if (currentDisplay === 'none') {
            chartContainer.style.display = 'flex';
            eloreBtn.classList.add('aktivm'); // Aktiv class hozzáadása
        } else {
            chartContainer.style.display = 'none';
            eloreBtn.classList.remove('aktivm'); // Aktiv class levétele
        }
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

document.addEventListener('click', (e) => {
    // Ha a user rákattint a "Javaslatok / Engedélyek" gombra
    if (e.target.closest('#hozzaj') || e.target.closest('#hozzaj0')) {
        setTimeout(() => {
            if (window.userAuditKitoltesek) {
                // Átadjuk a SZŰRT listát a függvénynek!
                initAuditLista(window.userAuditKitoltesek);
            }
        }, 150);
    }
});