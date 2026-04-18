import {showAndHideErrorMessages, IntezmenynevAdatok, IntezmenyiAdatok, KapcsolatiAdatok, FinanszirozasAdatok, ElfogadasAdatok, Gombok, alap, al_alap, vissza, handleRegistrationChange, validacio, countRegex,addressRegex, foRegex,cityRegex,postalCodeRegex, adoszamRegex,userRegex,nameRegex, regifin, regi} from './regifo.js';

// Változók 
const regi0 = document.querySelector("#regi0");
const cegradio = document.querySelector("#contactChoice2");
const felhasznaloSzamInput = document.querySelector("#fo");
const radioGombok = document.querySelectorAll('input[name="elofizI"]');
const eredmenyElem = document.querySelector("#kalkulacioEredmeny");

const arak = {
    1: 1000,  // Havi ár per fő
    6: 5000,  // Fél éves ár per fő
    12: 9000  // Éves ár per fő
};

// Céges regisztráció megjelenítése
regi0.addEventListener("click", function(event){
    // Érdemes megállítani az alapértelmezett viselkedést
    event.preventDefault(); 

    // 1. A sötét háttér és a popup létrehozása
    const popupOverlay = document.createElement("div");
    popupOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 10000; opacity: 0; transition: opacity 0.3s ease-in-out;";

    const popupPanel = document.createElement("div");
    popupPanel.style.cssText = "background: #fff; padding: 35px; border-radius: 10px; max-width: 550px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin: 20px; border-top: 5px solid #2c3e50;";
    
    popupPanel.innerHTML = `
        <h3 style="margin-top: 0; color: #2c3e50; font-size: 1.5em;">Kedves Érdeklődő!</h3>
        <div style="color: #333; line-height: 1.6; text-align: justify; margin-bottom: 20px;">
            <p>Az Értékek tesztidőszakban fut, szakmai egyeztetés céljából, nyílt regisztrációval.</p>
            <p>Amennyiben regisztrál, két értékelést hozhat létre, hogy megismerje a program működését.</p>
            <p>Amennyiben létrehozta értékeléseit, vagy a regisztráció óta eltelt 15 nap, segítse munkánkat egy kérdőív kitöltésével. Ezután még 2 értékelést hozhat létre, további 15 napig.</p>
        </div>
        <p style="color: #2c3e50; font-weight: bold; font-size: 1.1em; margin-bottom: 30px;">Keressünk együtt Értékeket!</p>
        <button id="popupBezar" class="editbut" style="cursor: pointer; width: 100%; padding: 12px; font-weight: bold;">Értem</button>
    `;

    popupOverlay.appendChild(popupPanel);
    document.body.appendChild(popupOverlay);

    // Megjelenítés animációval
    setTimeout(() => { popupOverlay.style.opacity = "1"; }, 10);

    // 2. Az "Értem" gomb kezelése: Popup bezárása ÉS az eredeti funkciók futtatása
    document.getElementById("popupBezar").addEventListener("click", function() {
        
        // Popup elhalványítása
        popupOverlay.style.opacity = "0";
        
        setTimeout(() => { 
            // Popup végleges eltávolítása a DOM-ból
            document.body.removeChild(popupOverlay); 
            
            // --- ITT INDUL AZ EREDETI KÓDOD ---
            regi0.classList.add("kijelolt");    
            regifin.classList.remove('fade-in');
            regifin.style.display = 'none';
            regi.style.display = "flex";
            regi.classList.add('fade');  
            
            regi.scrollIntoView({
                behavior: "smooth",
                block: "nearest" 
            });
            
            setTimeout(function() {
                regi.classList.add('fade-in'); 
            }, 10); 
            // --- EREDETI KÓD VÉGE ---

        }, 300); // Megvárjuk, amíg a fade-out animáció befejeződik (0.3 mp)
    });
});

// Csomagok megjelenítése
cegradio.addEventListener("change", function() {
    handleRegistrationChange(true);  // true, ha céges regisztráció
});

// Kalkuláció függvény (Biztonságossá téve, ha a csomagok rejtve vannak)
function kalkulacio() {
    const felhasznaloSzam = parseInt(felhasznaloSzamInput.value);
    const kivalasztottRadio = document.querySelector('input[name="elofizI"]:checked');

    if (!isNaN(felhasznaloSzam) && kivalasztottRadio) {
        const idoHossz = parseInt(kivalasztottRadio.value);
        const egysegar = arak[idoHossz];
        const osszeg = felhasznaloSzam * egysegar;

        if (eredmenyElem) {
            eredmenyElem.innerHTML = `Előzetes kalkuláció: ${osszeg} forint összesen / ${idoHossz} hó.<br>
            <legend>Ez az összeg nem minősül ajánlattételnek, pusztán tájékoztató jellegű!</legend>`;
        }
    } else if (eredmenyElem) {
        eredmenyElem.innerHTML = "A felhasználók az intézményi regisztráció <strong>után</strong> a 'Felhasználói regisztráció'-ra kattintva tudnak majd regisztrálni!";
    }
}

// Kalkuláció indítása input változáskor
if (felhasznaloSzamInput) felhasznaloSzamInput.addEventListener("input", kalkulacio);
if (radioGombok) radioGombok.forEach(radio => radio.addEventListener("click", kalkulacio));

// Turkálás az adatbázisban
// Intézménynév ellenőrzés
export const intnev = document.querySelector("#int");
intnev.addEventListener("input", function() {
    const intezmeny = this.value.trim();
    const interr = document.querySelector("#interr");
    if (intezmeny.length >= 3) {
        fetch(`/check-intezmeny?intezmeny=${encodeURIComponent(intezmeny)}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    interr.textContent = "Ezzel az intézmény névvel már regisztráltak.";
                    intnev.setAttribute('data-valid', 'false');
                    intnev.classList.add("borderr");
                } else {
                    interr.textContent = "";
                    intnev.setAttribute('data-valid', 'true');
                    intnev.classList.remove("borderr");
                }
            })
            .catch(error => console.error("Hiba:", error));
    } else {                    
        interr.textContent = "Az intézménynév nem lehet kevesebb 3 karakternél.";
        intnev.classList.add("borderr");
    }
});

// Intézmény adószám ellenőrzés
const adosz = document.querySelector("#adosz");
adosz.addEventListener("input", function() {
    const adsz = this.value.trim();
    const aderr = document.querySelector("#aderr");
    if (adsz.length >= 13) {
        fetch(`/check-adsz?adsz=${encodeURIComponent(adsz)}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    aderr.textContent = "Ezzel az adószámmal már regisztráltak.";
                    adosz.setAttribute('data-valid', 'false');
                    adosz.classList.add("borderr");
                } else {
                    aderr.textContent = "";
                    adosz.setAttribute('data-valid', 'true');
                    adosz.classList.remove("borderr");
                }
            })
            .catch(error => console.error("Hiba:", error));
    } else {                    
        aderr.textContent = "Az adószám nem lehet kevesebb 13 karakternél (kötőjelekkel együtt).";
        adosz.classList.add("borderr");
    }
});

// REGISZTRÁCIÓ (Itt van a varázslat! 🌟)
export function initCompanyRegistration() {

    document.querySelector("#cegesRegi").addEventListener("submit", function(event) {
        event.preventDefault();  
        
        // Választott modulok összegyűjtése (#szakmaiceg-ben lévő checkboxok)
        const checkedModules = Array.from(
            document.querySelectorAll('#szakmaiceg input[type="checkbox"]:checked')
        );

        const selectedModuleTexts = checkedModules.map(cb => cb.nextElementSibling.textContent.trim());
        const selectedModuleIds = checkedModules.map(cb => cb.value);
        const intmod = selectedModuleIds.join(',');      // pl. "1"

        // Változók (CSAK a kötelezőek, amiket a felületen hagytunk)
        const int = document.querySelector("#int");
        const irsz2 = document.querySelector("#irsz2");
        const szekhely = document.querySelector("#szekhely");
        const adosz = document.querySelector("#adosz");
        const cim = document.querySelector("#cim");
        const vez2 = document.querySelector("#vez2");
        const orsz2 = document.querySelector("#orsz2");
        const mail2 = document.querySelector("#mail2");
        const tel2 = document.querySelector("#tel2");
        const fo = document.querySelector("#fo");

        // Hibahelyek 
        const orrErr2 = document.querySelector("#orrErr2");
        const irszErr2 = document.querySelector("#irszErr2");
        const interr = document.querySelector("#interr");
        const cimerr = document.querySelector("#cimerr");
        const aderr = document.querySelector("#aderr");
        const vez2err = document.querySelector("#vez2err");
        const Err = document.querySelector("#Err");
        const tel2err = document.querySelector("#telceg2err");
        const foerr = document.querySelector("#foerr");

        // --- LÉTSZÁM (TRIAL) ELLENŐRZÉS MAX 3 FŐ ---
        let infov = 0;
        let letszamRendben = true;
        if (fo) {
            infov = parseInt(fo.value.trim(), 10);
            if (isNaN(infov) || infov < 1) {
                if(foerr) foerr.textContent = "Kérjük, adjon meg érvényes létszámot (min. 1)!";
                fo.classList.add("borderr");
                letszamRendben = false;
            } else if (infov > 3) {
                if(foerr) foerr.textContent = "A tesztidőszak alatt maximum 3 fő (licensz) igényelhető!";
                fo.classList.add("borderr");
                letszamRendben = false;
            } else {
                if(foerr) foerr.textContent = "";
                fo.classList.remove("borderr");
            }
        }

        // Többi validáció
        const itnezmenyNev = validacio(int, userRegex, interr, "Írjon be teljes intézmény/cég nevet!");
        const adoszam = validacio(adosz, adoszamRegex, aderr, "Az adószám helyes formátuma: 12345678-9-10");
        const orszag = orsz2 ? validacio(orsz2, countRegex, orrErr2, "Írja be helyesen az ország nevét!") : true;
        const varos = szekhely ? validacio(szekhely, cityRegex, Err, "Írjon be valós települést!") : true;
        const iranyitoszam = irsz2 ? validacio(irsz2, postalCodeRegex, irszErr2, "Az irányítószámnak 4 számjegyűnek kell lennie.") : true;
        const cimutca = validacio(cim, addressRegex, cimerr, "Írjon be a teljes címet!");
        const nev = validacio(vez2, nameRegex, vez2err, "Adjon meg valós vezetéknevet!");
        const adszellenorzott = adosz.getAttribute('data-valid') === 'true';
        const intnevellenorzott = int.getAttribute("data-valid") === 'true';
        // --- LEBEGŐ HIBAÜZENETEK (TOAST FIX) ---
     // --- HIBAÜZENETEK MEGJELENÍTÉSE ÉS GÖRGETÉS ---
     
        if (!adszellenorzott){
            aderr.innerHTML="Ezzel az adószámmal már regisztráltak!";
            adosz.classList.add("borderr");
        }
        if (!intnevellenorzott){
            interr.innerHTML="Ezzel az intézménynévvel már regisztráltak!";
            int.classList.add("borderr");
        }

        let telefon2 = true;
        if (tel2 && tel2.value.trim() !== "") {
            const telRegex = /^(\+36|06)\d{9}$/;
            telefon2 = validacio(tel2, telRegex, tel2err, "Adjon meg valós telefonszámot! (pl. +36301234567)");
        }

        // Ha minden validáció sikeres (Beleértve a létszámot is!)
        if (adszellenorzott && intnevellenorzott && itnezmenyNev && adoszam && iranyitoszam && varos && orszag && cimutca && nev && telefon2 && letszamRendben) {
            console.log("Minden adat helyes, folytatás...");

            // Adatok összegyűjtése
            const intv = int.value.trim();
            const intirv = irsz2.value.trim();
            const orszv = orsz2.value.trim();
            const szekhelyv = szekhely.value.trim();
            const adoszv = adosz.value.trim();
            const cimv = cim.value.trim();
            const mail2v = mail2.value.trim();
            const tel2v = tel2.value.trim(); 
            const vez2v = vez2.value.trim();

            // --- AUTOMATIZÁLT TRIAL ADATOK (A módosított 1 perces űrlaphoz) ---
            const mailCegv = mail2v;  // Céges e-mail a kapcsolattartóé lesz
            const telCegv = tel2v;    // Céges telefon a kapcsolattartóé lesz
            const intfinv = 10;        // 10-s csomag (Tesztidőszak)

            al_alap.style.display = "none";

            const intezmenynevAdatok = new IntezmenynevAdatok(intv, adoszv);
            const intezmenyiAdatok = new IntezmenyiAdatok(orszv, intirv, szekhelyv, cimv, mailCegv, telCegv);
            const kapcsolattarto = new KapcsolatiAdatok(vez2v, mail2v, tel2v);
            const finanszirozas = new FinanszirozasAdatok(intfinv, infov);
            const elfogadas = new ElfogadasAdatok();
            const gombok = new Gombok();
            
            // Ellenőrző lapka
            const modulesHTML = selectedModuleTexts.length
                ? `<div style="text-align: center; width: fit-content; margin: auto;">
                    <b>Választott modulok</b>
                    <ul style="font-style: italic;">
                        ${selectedModuleTexts.map(txt => `<li>${txt}</li>`).join('')}
                    </ul>
                   </div>`
                : '<p>Nincs kiválasztott modul.</p>';

            const kirakottSablon = `
                <h4>Regisztráció elfogadása</h4>
                <div class= labels>
                    <div>  
                        ${intezmenynevAdatok.render()}
                        ${kapcsolattarto.render()}
                    </div>
                    <div style="margin-left: 15px;"> 
                        ${intezmenyiAdatok.render()}
                    </div>   
                </div>   
                <div>
                    ${finanszirozas.render()}
                    ${modulesHTML}   
                    ${elfogadas.render()}
                    ${gombok.render()}
                </div>   
            `;
            
            const ellenorzes = document.createElement("div");
            alap.appendChild(ellenorzes);
            ellenorzes.classList.add("ellenorzes");
            ellenorzes.style.opacity = "0";
            ellenorzes.style.transform = "translateY(100%)";
            ellenorzes.innerHTML = kirakottSablon;
            const open= document.querySelector(".alap")
            
            setTimeout(function() {
                open.scrollIntoView({ behavior: 'smooth', block: "center" });
                ellenorzes.style.transform = "translateY(0)";
                ellenorzes.style.opacity = "1";
            }, 10);

            // Vissza gomb
            document.querySelector("#megsem").addEventListener('click', function(event) {
                event.preventDefault();
                vissza(ellenorzes, al_alap, regi);
            });

            // Küldés gomb
            document.querySelector("#megerosit").addEventListener("click", function(event){
                event.preventDefault();

                if (!document.querySelector("#afsz").checked || !document.querySelector("#afsz3").checked || !document.querySelector("#afsz4").checked) {
                    document.getElementById("afszerr2").textContent = "Minden hozzájárulást el kell fogadni a regisztrációhoz.";
                    return;
                }

                const data = {intv, intirv, orszv, szekhelyv, adoszv, cimv, mailCegv, telCegv, vez2v, infov, intfinv, tel2v, mail2v, intmod};

                fetch('/register/institution', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (!response.ok) return response.json().then(errorData => { throw new Error(errorData.message || 'Ismeretlen hiba.'); });
                    return response.json();
                })
                .then(data => {
                    if (data.message === 'Intézményi regisztráció sikeres') {  
                        alert('Regisztráció sikeres! A regisztrációs kód elküldve e-mailben.');
                        regifin.style.display = 'flex';
                        alap.removeChild(ellenorzes);
                        setTimeout(function() { location.reload(); }, 5000);
                    } else {
                        alert('Hiba történt a regisztráció során.');
                        alap.removeChild(ellenorzes);
                    }
                })
                .catch(error => {
                    regifin.style.display = 'flex';
                    regifin.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    regifin.innerHTML ="Hiba történt:" + error.message;
                });
            });
        }
        else { 
            if(eredmenyElem) eredmenyElem.innerHTML= "Vannak olyan adatok melyek nem helyesek, kérjük javítsa a pirossal jelzett mezőket!";
            const regceg = document.querySelector("#regCeg");
            if(regceg) {
                regceg.classList.add('shake');
                setTimeout(function() { regceg.classList.remove('shake'); }, 600);
            }
            
            // Lebegő hibaüzenetek megjelenítése
            showAndHideErrorMessages(); 
        }
    });
}

// -------- modul-checkboxok (#szakmaiceg) dinamikus betöltése --------
const szakmaicegBox = document.querySelector('#szakmaiceg');

async function loadModulok() {
  if (!szakmaicegBox) {
    console.warn('#szakmaiceg konténer nem található');  
    return;
  }

  try {
    const res = await fetch('/modulok');   
    if (!res.ok) throw new Error('Hiba a modulok lekérésénél.');

    const modulok = await res.json();          

    // 1. Leszűrjük a modulokat (Benn hagytam az ideiglenes korlátozásodat a 1-es ID-re)
    const filteredMods = modulok.filter(m => m.id == 1); 

    // 2. Végigmegyünk a leszűrt listán
    filteredMods.forEach(({ id, nev, leiras }) => {
      const wrap = document.createElement('div');

      const cb = document.createElement('input');
      cb.type  = 'checkbox';
      cb.value = id;               
      cb.id    = `mod-${id}`;        

      // 🌟 A VARÁZSLAT: Ha pontosan 1 elem van a listában, automatikusan kipipáljuk!
      if (filteredMods.length === 1) {
          cb.checked = true;
      }

      const label = document.createElement('label');
      label.htmlFor     = cb.id;
      label.textContent = leiras;    

      wrap.append(cb, label);
      szakmaicegBox.appendChild(wrap);
    });
  } catch (err) {
    console.error('Modul-betöltési hiba:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadModulok);