import {showAndHideErrorMessages, ElfogadasAdatokIntezmenyi, IntezmenynevAdatok2, KapcsolatiAdatok, Gombok, ElfogadasAdatok, FelhasznaloAdatok, alap, al_alap, vissza, handleRegistrationChange, validacio, passwordRegex, nameRegex, regcode, regi, regifin} from './regifo.js';
// Változók
const maganradio = document.querySelector("#contactChoice1");
const usere = document.querySelector("#user");
const maile = document.querySelector("#mail");
const kode = document.querySelector("#regmail");
const jelszomezo = document.querySelector("#password");
const jelszoUjra = document.querySelector("#pass2");
const passerr2 = document.querySelector("#passerr2");

// Csomagok beúsztatása
maganradio.addEventListener("change", function() {
    if (maganradio.checked) {
        handleRegistrationChange(false);  // false, ha magán regisztráció
    }
});

// Jelszó megerősítés validálása
function jelszovalidacio(jelszomezo, jelszoUjra, hiba) {
    if (jelszomezo.value !== jelszoUjra.value) {
        hiba.innerHTML = "A jelszavak nem egyeznek.";
        jelszoUjra.classList.add("borderr");
        return false;
    } else {
        hiba.innerHTML = "";
        jelszoUjra.classList.remove("borderr");
        return true;
    }
}

jelszoUjra.addEventListener("input", function() {
    jelszovalidacio(jelszomezo, jelszoUjra, passerr2);
});

// --- TURKÁLÁS AZ ADATBÁZISBAN ---

// Felhasználónév foglaltság ellenőrzése
usere.addEventListener("input", function() {
    const username = this.value.trim();
    const felerr = document.querySelector("#felerr");
    const fnev = document.querySelector("#user");
    if (username.length >= 3) {
        fetch(`/check-username?username=${encodeURIComponent(username)}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    felerr.textContent = "Ez a felhasználónév már foglalt.";
                    fnev.setAttribute('data-valid', 'false');
                    fnev.classList.add("borderr");
                } else {
                    felerr.textContent = "";
                    fnev.setAttribute('data-valid', 'true');
                    fnev.classList.remove("borderr");
                }
            })
            .catch(error => console.error("Hiba:", error));
    } else {                    
        felerr.textContent = "A felhasználónév nem lehet kevesebb 3 karakternél.";
        fnev.classList.add("borderr");
    }
});

// Mail foglaltság ellenőrzése
maile.addEventListener("input", function() {
    const mailname = this.value;
    if (mailname.length > 3) {
        fetch(`/check-mailname?mailname=${encodeURIComponent(mailname)}`)
            .then(response => response.json())
            .then(data => {
                const mailerr = document.querySelector("#mailerr");
                const mail = document.querySelector("#mail");

                if (data.exists) {
                    mailerr.textContent = "Ezzel az e-mail címmel már regisztráltak!.";
                    mail.classList.add("borderr");
                    mail.setAttribute('data-valid', 'false');
                } else {
                    mailerr.textContent = "";
                    mail.classList.remove("borderr");
                    mail.setAttribute('data-valid', 'true');
                }
            })
            .catch(error => console.error("Hiba:", error));
    }
});

// Regisztrációs kód foglaltság ellenőrzése
let intNev = ""; 
let intId = ""; 
let intFo = ""; 
let userCount = ""; 
let hanyadik = "";
let allowedModuleIds = [];

kode.addEventListener("input", function() {
    const regmail = document.querySelector("#regmail");
    const codename = this.value.trim();
    const ragmailerr = document.querySelector("#ragmailerr");
    if (codename.length >= 8) {
        fetch('/register/check-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regCode: codename }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                intFo = data.intFo;
                intId = data.intId;
                intNev = data.intNev;
                userCount = data.userCount; 
                allowedModuleIds = (data.intMod || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s.length);
                renderUserModuleChoices(allowedModuleIds); 
                hanyadik = (data.intFo - data.userCount) - 1;

                ragmailerr.textContent = "";
                regmail.classList.remove("borderr");
      
            } else {
                ragmailerr.textContent = data.message; 
                regmail.classList.add("borderr");
            }
        })
        .catch(error => console.error("Hiba:", error));
    } else {
        regmail.classList.add("borderr");
        ragmailerr.textContent = "Az intézményi regisztrációs kód nem lehet kevesebb 8 karakternél.";
    }
});

function renderUserModuleChoices(ids) {
    const box = document.querySelector('#szakmaiuser');
    if (!box) return console.warn('#szakmaiuser nem található a DOM-ban');

    box.innerHTML = '<legend>Az intézménye által kiválasztott szakmai anyagok listája</legend>';               

    if (!ids.length) {
        box.innerHTML = '<em>Nincs ehhez az intézményhez modul.</em>';
        return;
    }

    fetch('/modulok')
        .then(r => r.json())
        .then(allMods => {
            // 1. Először leszűrjük a megengedett modulokat
            const filteredMods = allMods.filter(m => ids.includes(String(m.id)));
            
            // 2. Végigmegyünk a leszűrt listán
            filteredMods.forEach(({ id, nev, leiras }) => {
                const wrap  = document.createElement('div');
                const cb    = document.createElement('input');
                cb.type  = 'checkbox';
                cb.value = id;             
                cb.id    = `umod-${id}`;   
                
                // 🌟 A VARÁZSLAT: Ha pontosan 1 elem van a listában, automatikusan kipipáljuk!
                if (filteredMods.length === 1) {
                    cb.checked = true;
                }

                const lab  = document.createElement('label');
                lab.htmlFor    = cb.id;
                lab.textContent = leiras;  
                wrap.append(cb, lab);
                box.appendChild(wrap);
            });
        })
        .catch(err => console.error('Modul-betöltési hiba:', err));
}

// --- REGISZTRÁCIÓ ---    
export function initUserRegistration() {
    
    document.querySelector("#userRegi").addEventListener("submit", function(event) {
        event.preventDefault();
    showAndHideErrorMessages()

        // Változók
        const user = document.querySelector("#user");
        const vezeteknev = document.querySelector("#vez");
        const email = document.querySelector("#mail");
        const tel = document.querySelector("#tel");
        const regmail = document.querySelector("#regmail");
        
        // Hibahelyek
        const vezerr = document.querySelector("#vezerr");
        const telerr = document.querySelector("#telerr");
        const ragmailerr = document.querySelector("#ragmailerr");
        const eredmenyElem = document.querySelector("#eredmenyelem");
           
        // --- KÓD ELLENŐRZÉS (Már csak ez az egy opció van) ---
        const regCode = regmail.value.trim();
        if (!regCode) {
            ragmailerr.innerHTML = "Kérjük adja meg az intézménynek e-mailben kiküldött regisztrációs kódot.";
            regmail.classList.add("borderr");
            return;
        } else {
            regmail.classList.remove("borderr");
            ragmailerr.innerHTML = "";
            eredmenyElem.innerHTML = "";
        }

        // Validációk
        const jelszo = validacio(jelszomezo, passwordRegex, passerr2, "A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt és számot.");
        const jelszoEgyezes = jelszovalidacio(jelszomezo, jelszoUjra, passerr2);
        const felhasznalonevEllenorzott = user.getAttribute('data-valid') === 'true' && user.value.length > 3;
        const mailEllenorzott = email.getAttribute("data-valid") === 'true';

        let telefon = true;
     // Csak akkor nézzük a maximumot, ha már kaptunk érvényes választ a szervertől (van intId)
        let maximum = true;
        if (intId) {
            maximum = userCount < intFo;
        }

        if (intId && !maximum) {
            ragmailerr.textContent = "Az intézménye licensz mennyisége elérve. Ha további felhasználókat kívánnak regisztrálni, bővítség csomagjukat."; 
            regmail.classList.add("borderr");
            // Hívjuk meg a hibaüzenet kezelőt, hogy görgessen és animáljon
            showAndHideErrorMessages();
            return; // Megállítjuk a folyamatot
        } else if (!intId) {
            // Ha nincs intId, az azt jelenti, hogy a kód nem volt érvényes vagy nem lett ellenőrizve
            ragmailerr.textContent = "Kérjük, adjon meg egy érvényes intézményi regisztrációs kódot!";
            regmail.classList.add("borderr");
            showAndHideErrorMessages();
            return;
        } else {
            regmail.classList.remove("borderr");
        }
        
        if (tel && tel.value.trim() !== "") {
            const telRegex = /^(\+36|06)\d{9}$/;
            telefon = validacio(tel, telRegex, telerr, "Adjon meg valós telefonszámot! (pl. +36301234567)");
        }
        
        // FŐ ellenörzés
        if (maximum && mailEllenorzott && felhasznalonevEllenorzott && jelszo && jelszoEgyezes && telefon) {
            // Minden adat helyes
        } else { 
            eredmenyElem.innerHTML= "Vannak olyan adatok melyek nem helyesek, görgessen feljebb és javítsa a pirossal jelzett mezőket!";
            const regmagan = document.querySelector("#regMagan");
            if(regmagan) {
                regmagan.classList.add('shake');
                setTimeout(function() {
                    regmagan.classList.remove('shake');
                }, 600);
            }
            return;
        }

        // Adatok összegyűjtése
        const userv = user.value.trim();
        const jelszomezov = jelszomezo.value.trim();
        const mailv = email.value.trim();
        const telv = tel.value.trim();
        const vezeteknevv = vezeteknev.value.trim();
const kivalasztottSzerepGomb = document.querySelector('input[name="szerepkor_reg"]:checked');
        const szerepNev = kivalasztottSzerepGomb.nextElementSibling.textContent.trim(); // "Értékelő" vagy "Elemző"
        const szerepLeiras = kivalasztottSzerepGomb.closest('.editbut2').querySelector('.rolebox').textContent.trim();
        al_alap.style.display = "none";
        
        // Summázás
// Summázás (ITT ADJUK ÁT A 3 VÁLTOZÓT AZ OSZTÁLYNAK!)
        const felhasznaloAdatok = new FelhasznaloAdatok(userv, szerepNev, szerepLeiras);
        const intezmenynevAdatok2 = new IntezmenynevAdatok2(intNev, intFo, userCount, hanyadik);
        const kapcsolattarto = new KapcsolatiAdatok(vezeteknevv, mailv, telv);
        const elfogadas = new ElfogadasAdatokIntezmenyi();
        const gombok = new Gombok();
        
        // Ellenorző lapka (Itt a sablon már tiszta marad)
        const kirakottSablon = `
        <h4>Regisztráció elfogadása </h4>
        <div class="labels">
            <div>  
                ${felhasznaloAdatok.render()}
                ${intezmenynevAdatok2.render()}
            </div>
            <div style="margin-left: 15px;">    
                ${kapcsolattarto.render()}
            </div>
         </div>  
         <div>   
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

        // Animáció megjelenítése (Kijavítva a SyntaxError!)
        setTimeout(function() {
            const open = document.querySelector(".alap");
            if (open) {
                open.scrollIntoView({ behavior: 'smooth', block: "start" });
            }
            
            ellenorzes.style.transform = "translateY(0)";
            ellenorzes.style.opacity = "1";
        }, 10);
                
        // Visssza gomb kezelése
        const megsem = document.querySelector("#megsem");
        megsem.addEventListener('click', function(event) {
            event.preventDefault();
            vissza(ellenorzes, al_alap, regi);
        });
        
        // Küldés gomb kezelése
       // userRegi.js
const megerosit2 = document.querySelector("#megerosit");
megerosit2.addEventListener("click", function(event) {
    event.preventDefault(); 
    
    // Most már mind a hármat nézzük!
    let afsz = document.querySelector("#afsz");
    let afsz3 = document.querySelector("#afsz3");
    let afsz4 = document.querySelector("#afsz4");

    if (!afsz.checked || !afsz3.checked || !afsz4.checked) {
        document.getElementById("afszerr2").textContent = "Minden hozzájárulást el kell fogadni a regisztrációhoz.";
        return;
    }

    // 🌟 ÚJ: Szerepkör kinyerése
    const szerepv = document.querySelector('input[name="szerepkor_reg"]:checked').value;

    // Kiválasztott modulok (szakmai anyagok)
    const selectedUserMods = Array.from(
        document.querySelectorAll('#szakmaiuser input[type="checkbox"]:checked')
    ).map(cb => cb.value);    
    
    // Adatcsomag összeállítása (hozzáadva a szerepv)
 // userRegi.js - 345. sor környékén a javított data objektum
const data = { 
    userv, 
    jelszomezov, 
    mailv, 
    telv, 
    vezeteknevv, 
    intIdv: intId, // Itt volt a hiba: intIdv helyett intId kell a jobb oldalra!
    usermods: selectedUserMods.join(','),
    szerepv
};
    
    fetch('/register/user', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) return response.json().then(errorData => { throw new Error(errorData.message || 'Ismeretlen hiba.'); });
        return response.json();
    })
   .then(data => {
        if (data.message === 'Regisztráció sikeres') {
           alert('Sikeres regisztráció! A belépési adatokat elküldtük e-mailben.'); 
            alap.removeChild(ellenorzes);
            regifin.style.display = 'flex';
            setTimeout(() => { location.reload(); }, 5000); 
        }
    })
    .catch(error => {
        regifin.style.display = 'flex';
        regifin.innerHTML ="Hiba történt:" + error.message;
    });
});
    });

}