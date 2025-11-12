//Dashboard kezelő (CRUD,SHARE,VIEW,ANALISTIC, PDF)
import { initMegosztas } from './dashsShare.js'; //Megosztás
import { initFrissites, initTorol, initOlvas, initLetrehoz } from './dashCRUD.js'; //Szerkesztés, törlés, létrehozás, stb
import { monitorozCheckek } from './dashStatic.js'; //Csoport statisztika
import { generate as exportPDF } from './dashPDF.js'; // PDF generálás
import { loadInfoAndInit } from '../info/infoLoader.js'; //Hírek és gyk betöltése
import { betoltKategoriakChartSzinek } from '../main/main_alap.js';
import {initAside} from './dashAside.js';
import './dashAI.js';

import{showAlert} from "/both/alert.js"

loadInfoAndInit(); 
initAside();
//Változók... sok.... változó
//Gombok 

export const BUTTONS = {
  tulaj: [
    {cls: 'fo_edit',        icon: 'edit',           help: 'Értékelés folytatása'},
    {cls: 'edit',           icon: 'page_header',    help: 'Átnevezés', action: 'edit'},
    {cls: 'share',          icon: 'share',          help: 'Megosztás',                      action: 'share'},
    {cls: 'lightbulb_2',     icon: 'lightbulb_2',     help: 'Generálás',         action: 'mail'},
    {cls: 'print',          icon: 'print',          help: 'Nyomtatás',                      action: 'print'},
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Mentés PDF-be',                  action: 'picture_as_pdf'},
    {cls: 'deleted',        icon: 'delete',         help: 'Törlés',                         action: 'delete'},
  ],
  szerkeszto: [
    {cls: 'fo_edit',        icon: 'edit',           help: 'Éretékelés folytatása'},
    {cls: 'lightbulb_2',     icon: 'lightbulb_2',     help: 'Generálás',               action: 'mail'},
    {cls: 'print',          icon: 'print',          help: 'Nyomtatás',                      action: 'print'},
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Mentés PDF-be',                  action: 'picture_as_pdf'},
  ]
};
export const BUTTONS2 = {
  tulaj: [
    {cls: 'mail',           icon: 'mail',           help: 'Küldés e-mailben',               action: 'mail'},
    {cls: 'print',          icon: 'print',          help: 'Nyomtatás',                      action: 'print'},
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Mentés PDF-be',                  action: 'picture_as_pdf'},
  ],
  szerkeszto: [
    {cls: 'mail',           icon: 'mail',           help: 'Küldés e-mailben',               action: 'mail'},
    {cls: 'print',          icon: 'print',          help: 'Nyomtatás',                      action: 'print'},
    {cls: 'picture_as_pdf', icon: 'picture_as_pdf', help: 'Mentés PDF-be',                  action: 'picture_as_pdf'},
  ]
};
const alap = document.querySelector("#fo_kategoriak");
    export const felbukkano3 = document.querySelector("#felbukkano3");
    export const felbukkano2 = document.querySelector("#felbukkano2");
    export const felbukkano4 = document.querySelector("#felbukkano4");
        const kilep2 = document.querySelector("#kilep2");

        let eredetiErtekekTomb = [];
        let eredetIdTomb = [];
        let eredetiTorlesTomb = [];
        let torlesIdTomb = [];

    const ujkezd = document.querySelector("#ujkezd");
    const uj = document.querySelector("#uj");
    const uj2 = document.querySelector("#uj2");
    const go2 = document.querySelector("#gobut2");

    const ujinek = document.querySelector("#ujinek");
    const ujinek2 = document.querySelector("#ujinek2");
    const ujinek4 = document.querySelector("#ujinek4");

    const letrehozva = new Date().toISOString().split('T')[0]; // Mai dátum (YYYY-MM-DD formátumban)
    const neve = document.querySelector("#neve");
    let neve2 = document.querySelector("#neve2");
    export const idszak = document.querySelector("#idoszak");
    let idszak2 = document.querySelector("#idoszak2");
    const megnevezes = document.querySelector("#megnevezes");
    let megnevezes2 = document.querySelector("#megnevezes2");

    const innerDiv = document.querySelector(".inner-div")
    const go = document.querySelector("#gobut");
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


                await loadKitoltesek();
            } else {console.error('Hiba:', data.message);}
        } catch (error) {console.error('Fetch hiba:', error);
        }
    }
    //azonosítási adatok alapján mérések szipkázása, kezelése
    async function loadKitoltesek() {
        try {
const url = `/api/get-kitoltesek?felhasznalo_id=${userId}&modul_id=${modulId}`;
    const response = await fetch(url);

            const data = await response.json();
    
         if (data.success) {
  const kitoltesek = data.kitoltesek;
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

        //TÖRLÉS - Törlési kezelés - dasCRUD.js
            initTorol();
       
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
lapozo.addEventListener('click', (e) => {
  if (e.target.classList.contains('grap') || e.target.classList.contains('sta') || e.target.classList.contains('gyik'))  {
    // Aktiv osztály váltása.
    [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
    e.target.classList.add('aktiv');

    // Megjelenítés logika||
    if (e.target.classList.contains('grap')) {
      maininf.style.display = 'flex';
      osszesitett.style.display = 'none';
      gyik.style.display="none";
    } else if (e.target.classList.contains('gyik')) {
      maininf.style.display = 'none';
      osszesitett.style.display = 'none';
      gyik.style.display="flex";
    } 
    else if (e.target.classList.contains('sta')) {
        maininf.style.display = 'none';
        osszesitett.style.display = 'flex';
        gyik.style.display="none";
    }
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
