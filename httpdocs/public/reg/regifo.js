// Változók
export const log = document.querySelector(".belso");
export const szoveg = document.querySelector(".szoveg");
export const log2 = document.querySelector(".belso2");
export const szoveg2 = document.querySelector(".szoveg2");
export const ceg = document.querySelector("#ceg");
export const magan = document.querySelector("#magan");
export const szamla = document.querySelector("#szamla");
export const regcode = document.querySelector("#regcode");
export const regi = document.querySelector("#regi");
export const regifin = document.querySelector("#regifin");
export const segedlet = document.querySelector("#segedlet");
export const segedlet2 = document.querySelector("#segedlet2");
export const bejbutt = document.querySelector("#bejbutt");
export const rlog = document.querySelector("#log");
export const choose = document.querySelector(".choos");
export const csomagok = document.querySelector(".csomagok");
export const csomagok0 = document.querySelector(".csomagok0");
export const csomagi = document.querySelector("#csomagi");
export const csomagII = document.querySelector("#csomagii");
export const csomagIII = document.querySelector("#csomagiii");
export const csomagi0 = document.querySelector("#csomagi0");
export const csomagII0 = document.querySelector("#csomagii0");
export const csomagIII0 = document.querySelector("#csomagiii0");
export const belso = document.querySelector(".belso");
export const alap = document.querySelector(".alap");
export const al_alap = document.querySelector(".al-alap");
export const afsz = document.getElementById("afsz");
export const afsz3 = document.getElementById("afsz3");
export const afsz4 = document.getElementById("afsz4");

    // Regex-ek
      export const userRegex = /^.{4,}$/;
      export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
      export const postalCodeRegex = /^\d{4}$/;
      export const cityRegex = /^[A-ZÁÉÍÓÖŐÚÜŰ]+(?:[\s-][A-ZÁÉÍÓÖŐÚÜŰ]+)*$|^[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+(?:[\s-][A-ZÁÉÍÓÖŐÚÜŰ]?[a-záéíóöőúüű]+)*$/;
      export const addressRegex = /^[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]+\s(?:[A-ZÁÉÍÓÖŐÚÜŰa-záéíóöőúüű-]+\s)?(?:u\.|út|utca|tér|dűlő|köz|sétány|sor|körút|park|lépcső|telep|kert)\s\d+(?:\/\d+)?(?:\.\s*[A-ZÉÍÓÖŐÚÜŰ]?[a-zéíóöőúüű]*\s*[A-ZÉÍÓÖŐÚÜŰ]?[a-zéíóöőúüű]*)?$/;
      export const countRegex = /^[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]{2,}$/;
      export const nameRegex = /^(?:Dr\.|Ifj\.|Id\.)?\s*[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+(?:[- ][A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+)*$/;
      export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      export const adoszamRegex = /^\d{8}-\d{1}-\d{2}$/;
      export const foRegex = /^\d{1,3}$/;
      //Validáló
        export  function validacio(mezo, regex, hiba, hibaUzenet) {
            if (!regex.test(mezo.value.trim())) {
                hiba.innerHTML = hibaUzenet;
                mezo.classList.add("borderr");
                return false;
            } else {
                hiba.innerHTML = "";
                mezo.classList.remove("borderr");
                return true;
            }
        }

//Törlés
export function clearFields(...fields) {
    fields.forEach(field => field.value = "");
}
export function resetRadioButtons(...selectors) {
    selectors.forEach(selector => {
        let radios = document.querySelectorAll(selector);
        radios.forEach(radio => radio.checked = false);
    });
}

//Mégsem gomb
export function vissza(ellenorzes, al_alap, regi) {
    al_alap.style.display = "grid";
    setTimeout(function() {
        regi.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 50);
    setTimeout(function() {
        ellenorzes.style.transform = "translateY(100%)";
        ellenorzes.style.opacity = "0";
        alap.removeChild(ellenorzes);
    }, 500);
}
//AFSZ ellenörzés
export function ellenorizHozzajarulas(afsz, afsz3, afsz4, afszerr2) {
    if (!afsz.checked || !afsz3.checked || !afsz4.checked) {
        afszerr2.textContent = "Minden hozzájárulást el kell fogadni a regisztrációhoz.";
        return false;
    }
    return true;
}

//Bejelentkezés
    
document.querySelector("form").addEventListener("submit", function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    fetch("/login", {
        method: "POST",
        body: new URLSearchParams(formData),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirect;
        }
    })
})
const bejelentkezes = document.querySelector("#bejelentkezes")
bejelentkezes.addEventListener('click', function(){
    bejbutt.style.display = "none";
    rlog.classList.add('fade2'); 
    belso.classList.add("kijelolt");
    rlog.style.display = "flex"; 

    setTimeout(function() {
        rlog.classList.add('fade-in2');
    }, 10); 
});

// Animációk és kisebb megjelenítési cuccok
    //Forgatás
    export function initAnimations() {
        bejbutt.addEventListener('click', function(){
            bejbutt.style.display = "none";
            rlog.classList.add('fade2'); 
            belso.classList.add("kijelolt");
            rlog.style.display = "flex"; 

            setTimeout(function() {
                rlog.classList.add('fade-in2');
            }, 10); 
        });

        function rotateElements(element, textElement) {
            element.addEventListener("mouseout", function() {
                element.style.transform = "rotate(45deg)";
                textElement.style.transform = "rotate(-45deg)";
            });
            element.addEventListener("mouseover", function() {
                element.style.transform = "rotate(0deg)";
                textElement.style.transform = "rotate(0deg)";
            });
        }

        rotateElements(log, szoveg);
        rotateElements(log2, szoveg2);
    }
    //Beuúsztatás
    export function handleRegistrationChange(isCompany) {
        if (isCompany) {
            // Céges regisztráció megjelenítése
            csomagok.style.display = "flex";
            csomagi.classList.add('fade');
            csomagII.classList.add('fade');
            csomagIII.classList.add('fade');
            ceg.style.display = "flex";
            magan.style.display = 'none';
            segedlet.style.display = "none";
            segedlet2.style.display = "flex";

            setTimeout(function() {
                csomagi.classList.add('fade-in');
            }, 200);
            setTimeout(function() {
                csomagII.classList.add('fade-in');
            }, 300);
            setTimeout(function() {
                csomagIII.classList.add('fade-in');
            }, 450);

        } else {
            // Magán regisztráció megjelenítése
            ceg.style.display = "none";
            magan.style.display = 'flex';
            segedlet.style.display = "flex";
            segedlet2.style.display = "none";

            csomagi0.classList.add('fade');
            csomagII0.classList.add('fade');
            csomagIII0.classList.add('fade');

            setTimeout(function() {
                csomagi0.classList.add('fade-in');
            }, 200);
            setTimeout(function() {
                csomagII0.classList.add('fade-in');
            }, 300);
            setTimeout(function() {
                csomagIII0.classList.add('fade-in');
            }, 450);
        }

        // Görgetés az elemhez
        choose.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
// Behívás
import { initUserRegistration} from './userRegi.js';
import { initCompanyRegistration } from './companyRegi.js';

document.addEventListener("DOMContentLoaded", function() {
    initAnimations();
    initUserRegistration();
    initCompanyRegistration();
});

//Kirakó ellenörzéshez
    // Intézményi adatok osztály
    export class IntezmenynevAdatok {
        constructor(intezmenyNev, adoszam) {
            this.intezmenyNev = intezmenyNev;
            this.adoszam = adoszam;

        }

        render() {
            return `            
            <legend>Számlázási név:</legend>
                <div class="allabel">
                    <div>
                        <label for="vez2"><b>Intézmény név:</b> ${this.intezmenyNev}</label>
                    </div>
                </div>
                <div class="allabel">
                    <div>
                        <label for="vez2"><b>Intézmény adószáma:</b> ${this.adoszam}</label>
                    </div>
                </div>
            `;
        }
    }
    // Intézményi további adatok osztály
    export class IntezmenyiAdatok {
        constructor(orszag, irsz, szekhely, cim, email, telefon) {
            this.orszag = orszag;
            this.irsz = irsz;
            this.szekhely = szekhely;
            this.cim = cim;
            this.email = email;
            this.telefon = telefon;
        }

        render() {
            return `
            <legend>Számlázási adatok</legend>
            <div class="allabel">
                    <div>
                        <label for="szekhely"><b>Ország:</b> ${this.orszag}</label>
                    </div>
            </div>
            <div class="allabel">
                    <div>
                        <label for="szekhely"><b>Irányítószám:</b> ${this.irsz}</label>
                    </div>
            </div>
            <div class="allabel">
                    <div>
                        <label for="szekhely"><b>Székhely:</b> ${this.szekhely}</label>
                    </div>
            </div>
            <div class="allabel">
                    <div>
                        <label for="cim"><b>Cím:</b> ${this.cim}</label>
                    </div>
            </div>
            <div class="allabel">
                    <div>
                        <label for="mailCeg"><b>Intézmény/cég e-mail címe:</b> ${this.email}</label>
                    </div>
            </div>
            <div class="allabel">
                    <div>
                        <label for="telCeg"><b>Intézmény/cég telefonszáma:</b> ${this.telefon}</label>
                    </div>
            </div>
            `;
        }
    }
    // Kapcsolattartói adatok osztály
    export class KapcsolatiAdatok {
        constructor(nev, email, telefon) {
            this.nev = nev;
            this.email = email;
            this.telefon = telefon;
        }

        render() {
            return `
                <legend>Kapcsolattartó adatai:</legend>
                    <div class="allabel">
                        <div>
                            <label for="vez2"><b>Név:</b> ${this.nev}</label>
                        </div>
                    </div>
                    <div class="allabel">
                        <div>
                            <label for="mail2"><b>E-mail címe:</b> ${this.email}</label>
                        </div>
                    </div>
                    <div class="allabel">
                        <div>
                            <label for="tel2"><b>Telefonszám:</b> ${this.telefon}</label>
                        </div>
                    </div>`;
        }
    }
    // Finanszírozás adatok osztály
    export class FinanszirozasAdatok {
        constructor(osszeg, letszam) {
            this.osszeg = osszeg;
            this.letszam = letszam;
        }

        render() {
            return `
                <div id="kotelezo">
                    <legend>Finanszírozás</legend>
                    <p><b>${this.osszeg}</b> havi egyösszegű kifizetési időszakra, <b>${this.letszam}</b> fő részére</p>
                </div>
            `;
        }
    }
    // Hozzájárulás elfogadása osztály
    export class ElfogadasAdatok {
        render() {
            return `
                <legend>Hozzájárulás</legend>
                <div class="afszp">
                    <input type="checkbox" required id="afsz">
                    A hozzájáruló nyilatkozat megtétele előtt áttanulmányoztam és annak tartalmát teljes körűen megismertem,
                    mint adatkezeléssel érintett természetes személy jogaimmal tisztában vagyok,
                    azok gyakorlásának módjáról az Adatkezelőtől teljes körű tájékoztatást kaptam.
                </div>
                <div class="afszp">
                    <input type="checkbox" required id="afsz3">
                    A regisztráció gomb megnyomásával elfogadom az Általános szerződési feltételeket és az adatvédelmi nyilatkozat.
                </div>
                <div class="afszp">
                    <input type="checkbox" required id="afsz4">
                    A regisztráció gomb megnyomásával tudomásul veszem, hogy a megrendelésem fizetési kötelezettséggel jár.
                </div>
                <div class="err" id="afszerr2"></div>
            `;
        }
    }
    // Gombok osztály
    export class Gombok {
        render() {
            return `
                <div id="regind2">
                    <button class="editbut" id="megsem">Vissza</button>
                    <button class="editbut" id="megerosit">Regisztrálok</button>
                </div>
            `;
        }
    }
    //Elfogadási adatok Cégen belül osztály
    export class ElfogadasAdatokIntezmenyi {
        render() {
            return `
                <legend>Hozzájárulás</legend>
                <div class="afszp">
                    <input type="checkbox" required id="afsz">
                    A hozzájáruló nyilatkozat megtétele előtt áttanulmányoztam és annak tartalmát teljes körűen megismertem,
                    mint adatkezeléssel érintett természetes személy jogaimmal tisztában vagyok,
                    azok gyakorlásának módjáról az Adatkezelőtől teljes körű tájékoztatást kaptam.
                </div>
                <div class="afszp">
                    <input type="checkbox" required id="afsz3">
                    A regisztráció gomb megnyomásával elfogadom az Általános szerződési feltételeket és az adatvédelmi nyilatkozat.
                </div>
                <div class="err" id="afszerr2"></div>
            `;
        }
    }
    // Finanszírozás adatok Cégen kívül osztály
    export class FinanszirozasAdatokMagan {
        constructor(osszeg) {
            this.osszeg = osszeg;
        }

        render() {
            return `
                <div id="kotelezo">
                    <legend>Finanszírozás</legend>
                    <p><b>${this.osszeg}</b> havi egyösszegű kifizetési időszakra</p>
                </div>
            `;
        }
    }
     // Intézményi további adatok osztály
     export class SzamlazasiMaganAdatok {
        constructor(nev, cim) {
            this.nev = nev;
            this.cim = cim;
        }

        render() {
            return `
            <legend>Számlázási adatok</legend>
             <div class="allabel">
                    <div>
                        <label for="cim"><b>Név:</b> ${this.nev}</label>
                    </div>
            </div>
             <div class="allabel">
                    <div>
                        <label for="cim"><b>Cím:</b> ${this.cim}</label>
                    </div>
            </div>
           `;
        }
    }
       // Intézményi adatok osztály
       export class IntezmenynevAdatok2 {
        constructor(intezmenyNev, intezmenyFo,marRegisztralt, hanyadik) {
            this.intezmenyNev = intezmenyNev;
            this.intezmenyFo = intezmenyFo;
            this.marRegisztralt = marRegisztralt;
            this.hanyadik = hanyadik
        }

        render() {
            return `            
            <div class="allabel">
                <div>
                    ${this.intezmenyNev} nevű intézményi regisztráció, mely ${this.intezmenyFo} fő részére licenszelt. Jelenleg ${this.marRegisztralt} felhasználó regisztrált. Fennmaradó felhasználói helyek (az ön regisztrációja után): ${this.hanyadik} fő
                </div>
            </div>
            `;
        }
    }
       // Intézményi további adatok osztály
       export class FelhasznaloAdatok {
        constructor(felhasznalonev) {
            this.felhasznalonev = felhasznalonev;
        }

        render() {
            return `
            <legend>Felhasználónév</legend>
            <div class="allabel">
                    <div>
                        <label for="szekhely"><b>Felhasználónév:</b> ${this.felhasznalonev}</label>
                    </div>
            </div>
           `
        }
    }
 // csak EGY ilyet hagyj bent!
document.querySelector('#llog').addEventListener('click', async (event) => {
  event.preventDefault();

  // ── adatok össze­szedése ─────────────────────────────────────────────
  const fnev     = document.querySelector('#fnev').value.trim();
  const pass     = document.querySelector('#pass').value.trim();
  const modul_id = document.querySelector('#temakor').value;          // <-- új
  const feltolto = document.querySelector('.check').checked;

  // kliens-oldali validálás
  if (!fnev || !pass || !modul_id) {
    return showLoginError('Tölts ki minden mezőt és válassz témakört!');
  }

  try {
    const resp = await fetch('/login', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ fnev, pass, modul_id, feltolto })
    });
    const data = await resp.json();

    if (data.success) {
      window.location.href = data.redirect;          // átirányítás
    } else {
                document.querySelector("#error-message").textContent = data.message;
    }
  } catch (err) {
    console.error('Login fetch-hiba:', err);
    showLoginError('Belső szerverhiba. Próbáld újra.');
  }
});

// ── egységes hiba-/animáció-függvény ───────────────────────────────────
function showLoginError(msg) {
  const err  = document.getElementById('error-message');
  const btn  = document.getElementById('llog');
  const box  = document.getElementById('login');

  btn.classList.add('shake');
  box.style.background =
    'linear-gradient(0deg,#e91e31 0%,rgba(255,119,0,.911) 100%)';

  err.textContent = msg;
  err.classList.remove('hidden');
  err.classList.add('visible');

  setTimeout(() => btn.classList.remove('shake'), 600);
}

    