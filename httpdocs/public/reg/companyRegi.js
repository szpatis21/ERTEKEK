import {IntezmenynevAdatok, IntezmenyiAdatok, KapcsolatiAdatok, FinanszirozasAdatok, ElfogadasAdatok, Gombok, alap, al_alap, vissza, handleRegistrationChange, validacio, countRegex,addressRegex, foRegex,cityRegex,postalCodeRegex, adoszamRegex,userRegex,nameRegex, regifin, regi} from './regifo.js';

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
regi0.addEventListener("click", function(){
  
    regi0.classList.add("kijelolt");    
    regifin.classList.remove('fade-in');
    regifin.style.display = 'none';
    regi.style.display = "flex";
/*     regi.innerHTML="Jelenleg nem tudunk regisztrációkat fogadni. Kérjük nézzen vissza később!"
 */      regi.classList.add('fade');  
     regi.scrollIntoView({
  behavior: "smooth",   // vagy "auto"
    block: "start" 
      })
    setTimeout(function() {
        regi.classList.add('fade-in'); 
    }, 10); 
});

// Csomagok megjelenítése
cegradio.addEventListener("change", function() {
    handleRegistrationChange(true);  // true, ha céges regisztráció
});

// Kalkuláció függvény
function kalkulacio() {
    const felhasznaloSzam = parseInt(felhasznaloSzamInput.value);
    const kivalasztottRadio = document.querySelector('input[name="elofizI"]:checked');

    if (!isNaN(felhasznaloSzam) && kivalasztottRadio) {
        const idoHossz = parseInt(kivalasztottRadio.value);
        const egysegar = arak[idoHossz];
        const osszeg = felhasznaloSzam * egysegar;

        eredmenyElem.innerHTML = `Előzetes kalkuláció: ${osszeg} forint összesen / ${idoHossz} hó.<br>
        <legend>Ez az összeg nem minősül ajánlattételnek, pusztán tájékoztató jellegű!</legend>`;
    } else {
        eredmenyElem.textContent = "Kérjük, válassza ki a számlázási időszakot és adja meg a felhasználók számát!";
    }
}
    // Kalkuláció indítása input változáskor
    felhasznaloSzamInput.addEventListener("input", kalkulacio);
    radioGombok.forEach(radio => radio.addEventListener("click", kalkulacio));

//Turkálás az adatbázisban
    //Intézménynév ellenörzés
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
    //intézmény adószám ellenörzés
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
                        console.log("sej")
                    } else {
                        aderr.textContent = "";
                        adosz.setAttribute('data-valid', 'true');
                        adosz.classList.remove("borderr");
                        console.log("Adószám elfogadva")
                    }
                })
                .catch(error => console.error("Hiba:", error));
        }
        else{                    
            aderr.textContent = "Az adószám nem lehet kevesebb 13 karakternél(kőtjellekkel együtt).";
            adosz.classList.add("borderr");
        }
    });

// REGISZTRÁCIÓ
export function initCompanyRegistration() {


    document.querySelector("#cegesRegi").addEventListener("submit", function(event) {
        event.preventDefault();  
            // Választott modulok összegyűjtése (#szakmaiceg-ben lévő checkboxok)
            const checkedModules = Array.from(
            document.querySelectorAll('#szakmaiceg input[type="checkbox"]:checked')
            );

            const selectedModuleTexts = checkedModules.map(cb =>
            cb.nextElementSibling.textContent.trim()
            );

const selectedModuleIds = checkedModules.map(cb => cb.value);
 const intmod = selectedModuleIds.join(',');      // "1,2,4"


        // Változók
        const int = document.querySelector("#int");
        const irsz2 = document.querySelector("#irsz2")
        const szekhely = document.querySelector("#szekhely");
        const adosz = document.querySelector("#adosz");
        const cim = document.querySelector("#cim");
        const email = document.querySelector("#mailCeg");
        const telCeg = document.querySelector("#telCeg");
        const vez2 = document.querySelector("#vez2");
        const fo = document.querySelector("#fo");
        const orsz2 = document.querySelector("#orsz2");
        const mail2 = document.querySelector("#mail2");
        const tel2 = document.querySelector("#tel2");
        //Hibahelyek 
        const orrErr2 = document.querySelector("#orrErr2");
        const irszErr2 = document.querySelector("#irszErr2")
        const telerr = document.querySelector("#telcegerr");
        const interr = document.querySelector("#interr");
        const cimerr = document.querySelector("#cimerr");
        const aderr = document.querySelector("#aderr");
        const vez2err = document.querySelector("#vez2err");
        const foerr = document.querySelector("#foerr");
        const Err = document.querySelector("#Err");
        const tel2err = document.querySelector("#telceg2err");
        // Validációk
        const itnezmenyNev = validacio(int, userRegex, interr, "Írjon be teljes intézmény/cég nevet!");
        const adoszam = validacio(adosz, adoszamRegex, aderr, "Az adószám helyes formátuma: 12345678-9-10");
        const orszag = orsz2 ? validacio(orsz2, countRegex, orrErr2, "Írja be helyesen az ország nevét!") : true;
        const varos = szekhely ? validacio(szekhely, cityRegex, Err, "Írjon be valós települést!") : true;
        const iranyitoszam = irsz2 ? validacio(irsz2, postalCodeRegex, irszErr2, "Az irányítószámnak 4 számjegyűnek kell lennie.") : true;
        const cimutca = validacio(cim, addressRegex, cimerr, "Írjon be a teljes címet!");
        const nev = validacio(vez2, nameRegex, vez2err, "Adjon meg valós vezetéknevet!");
        const foPerEmber = validacio(fo, foRegex, foerr, "Nem megfelelő számformátum!");
        const adszellenorzott = adosz.getAttribute('data-valid') === 'true';
        const intnevellenorzott = int.getAttribute("data-valid") === 'true';
        let telefon = true;
        if (!adszellenorzott){
            aderr.innerHTML="Ezzel az adószámmal már regisztráltak!";
            adosz.classList.add("borderr");
        }
        if (!intnevellenorzott){
            interr.innerHTML="Ezzel az intézménynévvel már regisztráltak!";
            int.classList.add("borderr");
        }

        if (telCeg && telCeg.value.trim() !== "") {
            const telRegex = /^(\+36|06)\d{9}$/;
            telefon = validacio(telCeg, telRegex, telerr, "Adjon meg valós telefonszámot! (pl. +36301234567)");
        }
        let telefon2 = true;
        if (tel2 && tel2.value.trim() !== "") {
            const telRegex = /^(\+36|06)\d{9}$/;
            telefon = validacio(tel2, telRegex, tel2err, "Adjon meg valós telefonszámot! (pl. +36301234567)");
        }
        // Ha minden validáció sikeres
        if (adszellenorzott && intnevellenorzott &&itnezmenyNev && adoszam && iranyitoszam && varos && orszag && telefon && cimutca && nev && foPerEmber && telefon2) {
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

            const mailCegv = email.value.trim();
            const telCegv = telCeg.value.trim();
            const vez2v = vez2.value.trim();
            const infov = fo.value.trim();
            const intfinv = document.querySelector('input[name="elofizI"]:checked').value;
            al_alap.style.display = "none";

            const intezmenynevAdatok = new IntezmenynevAdatok(intv,adoszv );
            const intezmenyiAdatok = new IntezmenyiAdatok(orszv,intirv, szekhelyv, cimv, mailCegv, telCegv);
            const kapcsolattarto = new KapcsolatiAdatok(vez2v, mail2v, tel2v);
            const finanszirozas = new FinanszirozasAdatok(intfinv, infov);
            const elfogadas = new ElfogadasAdatok();
            const gombok = new Gombok();
            
        //Ellenorző lapka
    const modulesHTML = selectedModuleTexts.length
  ? `<div style="    text-align: center;
    width: fit-content;
    margin: auto;">
       <b>Választott modulok</b>
       <ul style="font-style: italic;">
         ${selectedModuleTexts.map(txt => `<li>${txt}</li>`).join('')}
       </ul>
     </div>`
  : '<p>Nincs kiválasztott modul.</p>';
            const kirakottSablon = `
             <h4>Regisztráció elfogadása </h4>

            <div class= labels>
                <div>  
                ${intezmenynevAdatok.render()}

                ${kapcsolattarto.render()}
                </div>
                <div> 
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
            
            // Animáció megjelenítése
            setTimeout(function() {
                ellenorzes.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                ellenorzes.style.transform = "translateY(0)";
                ellenorzes.style.opacity = "1";
            }, 10);

            // Vissza gomb kezelése
            const megsem = document.querySelector("#megsem");
                megsem.addEventListener('click', function(event) {
                    event.preventDefault();
                    vissza(ellenorzes, al_alap, regi);
                });

            // Küldés gomb kezelése
            const megerosit = document.querySelector("#megerosit");
                megerosit.addEventListener("click", function(){
                    event.preventDefault();

                if (!afsz.checked || !afsz3.checked || !afsz4.checked) {
                    document.getElementById("afszerr2").textContent = "Minden hozzájárulást el kell fogadni a regisztrációhoz.";
                    return;
                }

                const data = {intv, intirv, orszv, szekhelyv, adoszv, cimv, mailCegv, telCegv, vez2v, infov, intfinv, tel2v, mail2v, intmod};

                fetch('/register/institution', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.message || 'Ismeretlen hiba.');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.message === 'Intézményi regisztráció sikeres') {  
                        alert('Regisztráció sikeres! A regisztrációs kód: ' + data.intreg);
                        regifin.style.display = 'flex';
                        alap.removeChild(ellenorzes);
                        setTimeout(function() {
                            location.reload();
                        }, 5000);
                    } else {
                        alert('Hiba történt a regisztráció során.');
                        alap.removeChild(ellenorzes);
                    }
                })
                .catch(error => {
                    regifin.style.display = 'flex';
                    regifin.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center' 
                    });
                    regifin.innerHTML ="Hiba történt:" + error.message;
                    console.error('Hiba:', error.message);
                });
            });
        }
        else { eredmenyElem.innerHTML= "Vannak olyan adatok melyek nem helyesek, görgessen feljebb és javítsa a pirossal jelzett mezőket!";
            const regceg = document.querySelector("#regCeg")
            regceg.classList.add('shake');
            setTimeout(function() {
            regceg.classList.remove('shake');
            }, 600);
        return;
        }
    });
}
/* -------- modul-checkboxok (#szakmaiceg) dinamikus betöltése -------- */
// 1) DOM-elem, ahová pakoljuk
const szakmaicegBox = document.querySelector('#szakmaiceg');

// 2) Lekérés + DOM-építés
async function loadModulok() {
  if (!szakmaicegBox) {                     // ha rossz az id a HTML-ben
    console.warn('#szakmaiceg konténer nem található');  
    return;
  }

  try {
    const res = await fetch('/modulok');   
    if (!res.ok) throw new Error('Hiba a modulok lekérésénél.');

    const modulok = await res.json();          

    modulok.forEach(({ id, nev, leiras }) => {
      const wrap = document.createElement('div');

      const cb = document.createElement('input');
      cb.type  = 'checkbox';
      cb.value = id;               
      cb.id    = `mod-${id}`;        

      const label = document.createElement('label');
      label.htmlFor    = cb.id;
      label.textContent = leiras;    

      wrap.append(cb, label);
      szakmaicegBox.appendChild(wrap);
    });
  } catch (err) {
    console.error('Modul-betöltési hiba:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadModulok);
