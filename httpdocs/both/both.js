//Nav menü export
import { menuTartalmak, ikonok } from './navmenu.js';
// Külső erőforrások (Fontok + Ikonok + Saját CSS) automatikus betöltése
// Külső erőforrások (Csak Fontok és Ikonok)


const menuId = document.getElementById('menu-type')?.value || 'public';

    class Elem {
        constructor({ adottId = '', adottOsztaly = '', szuloElem = '', tartalom = '' }) {
            this.adottId = adottId;
            this.adottOsztaly = adottOsztaly;
            this.szuloElem = szuloElem;
            this.tartalom = tartalom;
        }

        // Metódus az elem létrehozására és hozzáadására a DOM-hoz
        letrehoz() {
     
            const div = document.createElement('div');
          
            if (this.adottId) div.id = this.adottId;
            if (this.adottOsztaly) div.classList.add(this.adottOsztaly);
            
            div.innerHTML = this.tartalom;
            
            const szuloElem = document.querySelector(this.szuloElem);
            if (szuloElem) {
                szuloElem.appendChild(div);
            } else {
                console.warn(`A szülő elem a következő kijelölővel nem található: "${this.szuloElem}".`);
            }
        }
    }

    //Nav
        const nav = new Elem({
            adottId: 'navmenu',
            adottOsztaly: '',
            szuloElem: 'men',
            tartalom: menuTartalmak[menuId]

        });

        nav.letrehoz();
    //Bejelentkezés
        const bejelentkezes = new Elem({
            adottId: 'kulso-border',
            adottOsztaly: '',
            szuloElem: '#login',
            tartalom: `
         
            `
        });
        bejelentkezes.letrehoz();



//Bejelentkező menu
const bejelentkezesElem2 = document.querySelector("#login");

// ------------ BEJELENTKEZÉS GOMB -----------------
const $ = (sel) => document.querySelector(sel);
const llogBtn = document.querySelector('#llog');
  if (llogBtn) llogBtn.addEventListener('click', async (e) => {
    e.preventDefault();                        // ne küldjön POST-ot a <form>

    /* --- Gyors kliens-oldali validálás ------------------------------ */
    const fnev      = $('#fnev').value.trim();
    const pass      = $('#pass').value;
    const modul_id  = parseInt($('#temakor').value, 10);
    const szerepkor = parseInt($('#szerepkor').value, 10);

    if (!fnev || !pass || !modul_id || !szerepkor) {
      return hiba('Minden mező kitöltése kötelező');
    }

    /* --- Adatcsomag -------------------------------------------------- */
    const payload = { fnev, pass, modul_id, szerepkor };

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',           // session-cookie kell
        body: JSON.stringify(payload)
      });

      const out = await res.json();

      if (out.success) {
        location.href = out.redirect;
      } else {
        hiba(out.message);
      }

    } catch (err) {
      console.error('Fetch hiba:', err);
      hiba('Hálózati vagy szerverhiba');
    }
  });

  /* --- Egyszerű hibakiíró ------------------------------------------- */
  function hiba(msg) {
    showLoginError(msg);
  }

// ------------ ÜZENET + ANIMÁCIÓ -------------------
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


const loginGombok = document.querySelectorAll("#bejelentkezes, #lepjenbe");

loginGombok.forEach(gomb => {
  gomb.addEventListener("click", (e) => {
    e.preventDefault(); // Ne ugorjon a link

    const toggleBtn = document.querySelector(".toggle_btn");
    
    if (toggleBtn && getComputedStyle(toggleBtn).display !== 'none') {
        toggleBtn.click();
    }

    const kulsoElem = document.querySelector(".kulso-border");
    const szoveg    = document.querySelector(".szoveg");

    if (kulsoElem && szoveg) {
        toggleShow(szoveg);
        toggleShow(kulsoElem);
    }
  });
});

// Közös show/hide animáció
function toggleShow(elem) {
  if (!elem) {
    console.warn("A szükséges elem nem található a DOM-ban!");
    return;
  }

  if (elem.classList.contains("show")) {
    elem.classList.remove("show");
    setTimeout(() => { elem.style.display = "none"; }, 500);
  } else {
    elem.style.display = "flex";
    setTimeout(() => { elem.classList.add("show"); }, 50);
  }
}



//NAVMENU






document.querySelectorAll(".lepjenki").forEach(elem => {
  elem.addEventListener("click", () => {
    document.querySelector("form[action='/logout'] button[type='submit']")?.click();
  });
});


        const toggleBtn = document.querySelector(".toggle_btn ")
        const toogleBtnIcon = document.querySelector(".toggle_btn i")
        const dropDownMenu = document.querySelector(".dropdown_menu ")

toggleBtn.onclick = function () {
    dropDownMenu.classList.toggle("open"); 
    
    const isOpen = dropDownMenu.classList.contains("open");
    
    toogleBtnIcon.classList = isOpen 
        ? 'fa-solid fa-xmark' 
        : 'fa-solid fa-bars';
}
