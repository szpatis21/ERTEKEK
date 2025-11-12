import {ElfogadasAdatokIntezmenyi,IntezmenynevAdatok2,SzamlazasiMaganAdatok,KapcsolatiAdatok,Gombok,FinanszirozasAdatokMagan,ElfogadasAdatok,FelhasznaloAdatok, alap, al_alap, vissza, handleRegistrationChange, validacio, passwordRegex,postalCodeRegex, cityRegex, addressRegex, countRegex, nameRegex, szamla, regcode, regi, regifin} from './regifo.js';

//Változók
const maganradio = document.querySelector("#contactChoice1");
const szamlaradio = document.querySelector("#szamlaChoice1");
const szamlaradio2 = document.querySelector("#szamlaChoice2");
const usere = document.querySelector("#user");
const maile = document.querySelector("#mail");
const kode = document.querySelector("#regmail")
const jelszomezo = document.querySelector("#password");
const jelszoUjra = document.querySelector("#pass2");
const passerr2 = document.querySelector("#passerr2");

//Csomagok beúsztatása
maganradio.addEventListener("change", function() {
    if (maganradio.checked) {
        handleRegistrationChange(false);  // false, ha magán regisztráció
    }
});
//Jelszó megerősítés validálása
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
    if (jelszomezo.value !== jelszoUjra.value) {
        passerr2.innerHTML = "A jelszavak nem egyeznek.";
        jelszoUjra.classList.add("borderr");
        return false;
    } else {
        passerr2.innerHTML = "";
        jelszoUjra.classList.remove("borderr");
        return true;
    }
});

    //Céges választás
    szamlaradio.addEventListener("change", function() {
        if (szamlaradio.checked) {
            szamla.style.display = "none";
            regcode.style.display = "flex";
        }
        document.querySelectorAll("#szamla input").forEach(input => {
            input.removeAttribute("required");
        });
    });
    //Fizetős (+ba kap számlát) választás
    szamlaradio2.addEventListener("change", function() {
        if (szamlaradio2.checked) {
            
            szamla.style.display = "flex";
            regcode.style.display = "none";
            document.querySelectorAll("#szamla input").forEach(input => {
                input.setAttribute("required", "required");
            });
        
            const szamlaadatok = document.createElement("div");
            szamlaadatok.innerHTML = `
                <legend>Számlázási adatok</legend>
                <div class="allabel">
                    <div>
                        <label for="sznev">Név:</label>
                        <input type="text" id="sznev" required>
                        <div class="err" id="sznevErr"></div>
                    </div>
                </div>  
                <div class="allabel">
                    <div>
                        <label for="orsz">Ország:</label>
                        <input type="text" id="orsz" required>
                        <div class="err" id="orrErr"></div>
                    </div>
                </div>  

                <div id=egybe>
                    <div class="allabel">
                        <div>
                            <label for="irsz">Irányítószám:</label>
                            <input type="number" id="irsz" required>
                            <div class="err" id="irszErr"></div>
                        </div>
                    </div>
                    <div class="allabel">
                        <div>
                            <label for="telp">Település:</label>
                            <input type="text" id="telp" required>
                            <div class="err" id="telpErr"></div>
                        </div>
                    </div>
                </div>


                <div class="allabel">
                    <div>
                        <label for="utc">Utca, házszám:</label>
                        <input type="text" id="utc" required>
                        <div class="err" id="utcErr"></div>
                    </div>
                </div>
            `;
            
            szamla.appendChild(szamlaadatok);
        }

    });

//Turkálás az adatbázisban
    //Felhasználónév foglaltság ellenörzése
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
        }
        else{                    
            felerr.textContent = "A felhasználónév nem lehet kevesebb 3 karakternél.";
            fnev.classList.add("borderr");
        }
    });
    //Mail foglaltság ellenörzése
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
    //Regisztrációs kód foglaltság ellenörzése
    let intNev = ""; //Intézmény neve
    let intId = ""; // Intézmény helye az adatbázisban
    let intFo = ""; // Intézményi regisztrációk jelenleg
    let userCount = ""; //Intézményi regisztrációk maximuma
    let hanyadik = "";
    let allowedModuleIds = [];

    kode.addEventListener("input", function() {
        const regmail = document.querySelector("#regmail")
        const codename = this.value.trim();
        const ragmailerr = document.querySelector("#ragmailerr");
        if (codename.length >= 8) {
            fetch('/register/check-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
                        .filter(s => s.length);           // ["1", "2", "4"]
                        renderUserModuleChoices(allowedModuleIds); 
                    hanyadik = (data.intFo - data.userCount)-1;

                    console.log(`${data.intId}. sorszámú regisztráló intézmény (${data.intNev}), ${data.intFo} fő részére. Jelenleg ${userCount} felhasználó regisztrált. Fennmaradó felhasználói helyek: ${data.intFo - userCount}`);
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

  box.innerHTML = '<legend>Az intézménye által előfizetett szakmai anyagok listája </legend>';               // előző lista törlése (ha a felhasználó átírná a kódot)

  if (!ids.length) {
    box.innerHTML = '<em>Nincs ehhez az intézményhez modul.</em>';
    return;
  }

  // Lekérjük az összes modult (ugyanaz az endpoint, amit az intézményi reginél is használtál)
  fetch('/modulok')
    .then(r => r.json())
    .then(allMods => {
      allMods
        .filter(m => ids.includes(String(m.id)))   // csak a megengedett
        .forEach(({ id, nev, leiras }) => {
          const wrap  = document.createElement('div');

          const cb    = document.createElement('input');
          cb.type  = 'checkbox';
          cb.value = id;             // value = modul.id
          cb.id    = `umod-${id}`;   // egyedi id

          const lab  = document.createElement('label');
          lab.htmlFor    = cb.id;
          lab.textContent = leiras;  // label = modul.leiras

          wrap.append(cb, lab);
          box.appendChild(wrap);
        });
    })
    .catch(err => console.error('Modul-betöltési hiba:', err));
}
//REGISZTRÁCIÓ    
export function initUserRegistration() {
    document.querySelector("#userRegi").addEventListener("submit", function(event) {
        event.preventDefault();

        // változók
        const user = document.querySelector("#user");
        const irsz = document.querySelector("#irsz");
        const telp = document.querySelector("#telp");
        const utc = document.querySelector("#utc");
        const orsz = document.querySelector("#orsz");
        const vezeteknev = document.querySelector("#vez");
        const sznev = document.querySelector("#sznev");
        const email = document.querySelector("#mail");
        const tel = document.querySelector("#tel");
        const regmail = document.querySelector("#regmail");
        //Hibahelyek
        const irszErr = document.querySelector("#irszErr");
        const telpErr = document.querySelector("#telpErr");
        const utcErr = document.querySelector("#utcErr");
        const orszErr = document.querySelector("#orrErr");
        const vezerr = document.querySelector("#vezerr");
        const sznevErr = document.querySelector("#sznevErr");
        const telerr = document.querySelector("#telerr");
        const ragmailerr = document.querySelector("#ragmailerr");
        const eredmenyElem = document.querySelector("#eredmenyelem");
        const valasztottCsomag = document.querySelector('input[name="szamlaz"]:checked');
           
            // Ha regisztrációs kód szükséges
            if (valasztottCsomag.value === "noszamla") {
                    const regCode = regmail.value.trim();
                    if (!regCode) {
                        ragmailerr.innerHTML = "Kérjük adja meg az intézménynek e-mailben kiküldött regisztrációs kódot.";
                        regmail.classList.add("borderr");
                        return;
                    } else {
                        regmail.classList.remove("borderr");
                        ragmailerr.innerHTML = "";
                        eredmenyElem.innerHTML = "";
                     
                         // Validációk
                         const jelszo = validacio(jelszomezo, passwordRegex, passerr2, "A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt és számot.");
                         const jelszoEgyezes = jelszovalidacio(jelszomezo, jelszoUjra, passerr2);
                         const felhasznalonevEllenorzott = user.getAttribute('data-valid') === 'true' && user.value.length > 3;
                         const mailEllenorzott = email.getAttribute("data-valid") === 'true';

                         let telefon = true;
                         let maximum = userCount < intFo;
                         const intIdv = intId
                         if (!maximum){
                            ragmailerr.textContent = "Az intézménye licensz mennyisége elérve. Ha további felhasználókat kívánnak regisztrálni, bővítség csomagjukat."; 
                            regmail.classList.add("borderr");
                         }else{
                            regmail.classList.remove("borderr");
                         }
                         if (tel && tel.value.trim() !== "") {
                             const telRegex = /^(\+36|06)\d{9}$/;
                             telefon = validacio(tel, telRegex, telerr, "Adjon meg valós telefonszámot! (pl. +36301234567)");
                         }
                     //FŐ ellenörzés
                     if (maximum && mailEllenorzott && felhasznalonevEllenorzott && jelszo && jelszoEgyezes && telefon) {
                     } else { eredmenyElem.innerHTML= "Vannak olyan adatok melyek nem helyesek, görgessen feljebb és javítsa a pirossal jelzett mezőket!";
                        const regmagan = document.querySelector("#regMagan")
                        regmagan.classList.add('shake');
                        setTimeout(function() {
                        regmagan.classList.remove('shake');
                        }, 600);
                        return;
                     }
  
                     // Adatok összegyűjtése
                     const userv = user.value.trim();
                     const jelszomezov = jelszomezo.value.trim();
                     const mailv = email.value.trim();
                     const telv = tel.value.trim();
                     const vezeteknevv = vezeteknev.value.trim();

                     al_alap.style.display = "none";
                    //Summázás
                        const felhasznaloAdatok = new FelhasznaloAdatok(userv);
                        const intezmenynevAdatok2 = new IntezmenynevAdatok2(intNev,intFo, userCount, hanyadik);
                        const kapcsolattarto = new KapcsolatiAdatok(vezeteknevv, mailv, telv);
                        const elfogadas = new ElfogadasAdatokIntezmenyi();
                        const gombok = new Gombok();
                        //Ellenorző lapka
                        const kirakottSablon = `
                        <h4>Regisztráció elfogadása </h4>
                        <div class= labels>
                            <div>  
                                ${felhasznaloAdatok.render()}
                                ${intezmenynevAdatok2.render()}
                            </div>
                            <div>    
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

                        // Animáció megjelenítése
                            setTimeout(function() {
                                ellenorzes.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start'
                                });
                                ellenorzes.style.transform = "translateY(0)";
                                ellenorzes.style.opacity = "1";
                            }, 10);
                            
                    //Visssza gomb kezelése
                         const megsem = document.querySelector("#megsem");
                         megsem.addEventListener('click', function(event) {
                             event.preventDefault();
                             vissza(ellenorzes, al_alap, regi);
                         });
                         //Küldés gomb kezelése
                         const megerosit2 = document.querySelector("#megerosit");
                         megerosit2.addEventListener("click", function(event) {
                             event.preventDefault(); 
                 //Általános szerződési feltételek            
                     let afsz = document.querySelector("#afsz");
                     let afsz3 = document.querySelector("#afsz3");
 
                     if (!afsz.checked || !afsz3.checked) {
                         document.getElementById("afszerr2").textContent = "Minden hozzájárulást el kell fogadni a regisztrációhoz.";
                         return;
                     }

             //Küldés szerverre
             const selectedUserMods = Array.from(
            document.querySelectorAll('#szakmaiuser input[type="checkbox"]:checked')
            ).map(cb => cb.value);    
             const data = { userv, jelszomezov, mailv, telv, vezeteknevv, intIdv, usermods: selectedUserMods.join(','), };
                setTimeout(() => {
                     fetch('/register/user', {
                         method: 'POST',
                         headers: {'Content-Type': 'application/json'},
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
                         console.log(data);
                         if (data.message === 'Regisztráció sikeres') {
                            alap.removeChild(ellenorzes);
                            regifin.style.display = 'flex';
                            setTimeout(function() {
                                location.reload();
                            }, 5000); 
                         } else {
                                 alert('Hiba történt a regisztráció során.');
                                 alap.removeChild(ellenorzes);
                                 regifin.style.display = 'flex';
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
                         alert('Hiba:', error.message);
                         });
                }, 100); 
                 });
            }
            }        
            // Ha még nincs előfizetése
            else if (valasztottCsomag.value === "yesszamla") {

                    eredmenyElem.innerHTML = "";

                // Validációk
                        const jelszo = validacio(jelszomezo, passwordRegex, passerr, "A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt és számot.");
                        const jelszoEgyezes = jelszovalidacio(jelszomezo, jelszoUjra, passerr2);
                        const iranyitoszam = irsz ? validacio(irsz, postalCodeRegex, irszErr, "Az irányítószámnak 4 számjegyűnek kell lennie.") : true;
                        const varos = telp ? validacio(telp, cityRegex, telpErr, "Írjon be valós települést!") : true;
                        const cimutca = utc ? validacio(utc, addressRegex, utcErr, "Helytelen cím!") : true;
                        const orszag = orsz ? validacio(orsz, countRegex, orszErr, "Írja be helyesen az ország nevét!") : true;
                        const nev = validacio(vezeteknev, nameRegex, vezerr, "Adjon meg valós nevet!");
                        const nev2 = sznev ? validacio(sznev, nameRegex, sznevErr, "Adjon meg valós teljes nevet! (pl. Nagy István)") : true;
                        const felhasznalonevEllenorzott = user.getAttribute('data-valid') === 'true' && user.value.length > 3;
                        const mailEllenorzott = email.getAttribute("data-valid") === 'true';
                        let telefon = true;

                        if (tel && tel.value.trim() !== "") {
                            const telRegex = /^(\+36|06)\d{9}$/;
                            telefon = validacio(tel, telRegex, telerr, "Adjon meg valós telefonszámot! (pl. +36301234567)");
                        }

                    //FŐ ellenörzés
                    if (mailEllenorzott && felhasznalonevEllenorzott && jelszo && jelszoEgyezes && iranyitoszam && varos && cimutca && orszag && nev && nev2 && telefon) {
                    } else { eredmenyElem.innerHTML= "Vannak olyan adatok melyek nem helyesek, görgessen feljebb és javítsa a pirossal jelzett mezőket!";
                        const regmagan = document.querySelector("#regMagan")
                        regmagan.classList.add('shake');
                        setTimeout(function() {
                        regmagan.classList.remove('shake');
                        }, 600);
                        return;;
                    }

    // Számlázási adatok ellenőrzése
        // Adatok összegyűjtése
            const userv = user.value.trim()
            const jelszomezov = jelszomezo.value.trim();
            const szcimv = orsz.value.trim() + ", " + irsz.value.trim() + ". " + telp.value.trim() + ", " +  utc.value.trim();
            const mailv = email.value.trim();
            const telv = tel.value.trim();
            const vezeteknevv = vezeteknev.value.trim();
            const sznevv = sznev.value.trim();
            const finv = document.querySelector('input[name="elofiz"]:checked').value;
            const userfinv = document.querySelector('input[name="elofiz"]:checked') ? document.querySelector('input[name="elofiz"]:checked').value : "";

                al_alap.style.display = "none";
        //Summázás
              const felhasznaloAdatok = new FelhasznaloAdatok(userv);
              const szamlazasiMaganAdatok = new SzamlazasiMaganAdatok(vezeteknevv,szcimv);
              const kapcsolattarto = new KapcsolatiAdatok(vezeteknevv, mailv, telv);
              const finanszirozasAdatokMagan = new FinanszirozasAdatokMagan(userfinv);
              const elfogadas = new ElfogadasAdatok();
              const gombok = new Gombok();
          //Ellenorző lapka
              const kirakottSablon = ` 
              <h4>Regisztráció elfogadása </h4>
                <div class= labels style="grid-template-columns: 50% 50%;">
                    <div>  
                     ${felhasznaloAdatok.render()}
                     ${szamlazasiMaganAdatok.render()}
                     ${kapcsolattarto.render()}
                    </div>
                    <div>
                    ${finanszirozasAdatokMagan.render()}
                    ${elfogadas.render()} 
                    </div>
                </div>
                <div>
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
                    // Ellenörző lapka gombja  
                        //Visssza gomb kezelése
                        const megsem = document.querySelector("#megsem");
                        megsem.addEventListener('click', function(event) {
                            event.preventDefault();
                            vissza(ellenorzes, al_alap, regi);
                        });
                        //Küldés gomb kezelése
                        const megerosit2 = document.querySelector("#megerosit");
                        megerosit2.addEventListener("click", function(event) {
                            event.preventDefault(); 
                //Általános szerződési feltételek            
                    let afsz = document.querySelector("#afsz");
                    let afsz4 = document.querySelector("#afsz4");
                    let afsz3 = document.querySelector("#afsz3");

                    if (!afsz.checked || !afsz3.checked || !afsz4.checked) {
                        document.getElementById("afszerr2").textContent = "Minden hozzájárulást el kell fogadni a regisztrációhoz.";
                        return;
                    }
            //Küldés szerverre
            const data = { userv, jelszomezov, szcimv, mailv, telv, sznevv, vezeteknevv, finv, usermods: selectedUserMods.join(','), };
                setTimeout(() => {
                    fetch('/register/user', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
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
                        console.log(data);
                        if (data.message === 'Regisztráció sikeres') {
                                alap.removeChild(ellenorzes);
                                regifin.style.display = 'flex';
                                setTimeout(function() {
                                    location.reload();
                                }, 5000); // 5000 milliszekundum = 5 másodperc
                                

                        } else {
                                alert('Hiba történt a regisztráció során.');
                                alap.removeChild(ellenorzes);
                                regifin.style.display = 'flex';
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
                        alert('Hiba:', error.message);
                        });
                    }, 1000); 

                });
                
            }
    });
}
