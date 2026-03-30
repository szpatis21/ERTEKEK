//Nav menü export
import { menuTartalmak, ikonok } from './navmenu.js';
import { showAlert } from "/both/alert.js"; // Ha még nincs beimportálva ezen az oldalon

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
// --- ÁTJELENTKEZÉS LOGIKA (both.js legaljára!) ---
document.body.addEventListener('click', async function(e) {
    const engedelyekGomb = e.target.closest('#engedelyek');
    if (!engedelyekGomb) return;

    e.preventDefault();

    // Védelem: Ha már nyitva van, töröljük
    const existingModal = document.getElementById('switch-modal-overlay');
    if (existingModal) existingModal.remove();

    try {
        const res = await fetch('/switch-info', { credentials: 'same-origin' });
        const data = await res.json();

        if (!data.success) {
            alert('Hiba történt az adatok lekérésekor: ' + (data.message || ''));
            return;
        }

        const roles = data.roles || [];
        const modules = data.modules || [];

        const hasMultipleRoles = roles.length > 1;
        const hasMultipleModules = modules.length > 1;

        // Modal HTML összeállítása
        let modalContent = `
            <div id="switch-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:9999;">
                <div style="background:#fff; padding:30px; border-radius:10px; width:400px; max-width:90%; box-shadow: 0 5px 15px rgba(0,0,0,0.3); position:relative; color:#333;">
                    <h3 style="margin-top:0; color:#ffbd16;">Átjelentkezés</h3>
                    <div style="margin-bottom:20px; color:#555;">Szerepkör és/vagy modul váltás</div>
        `;

        if (!hasMultipleRoles && !hasMultipleModules) {
            modalContent += `
                <p style="color:red; font-weight:bold;">Sajnos nincs más jogosultságod vagy szakmai anyag hozzáférésed, amire válthatnál!</p>
                <button id="close-switch-modal" style="margin-top:15px; width:100%; padding:10px; border:none; border-radius:5px; background:#ddd; cursor:pointer; color:#000; font-weight:bold;">Értettem</button>
            </div></div>`;
            
            document.body.insertAdjacentHTML('beforeend', modalContent);
            document.getElementById('close-switch-modal').onclick = () => document.getElementById('switch-modal-overlay').remove();
            return;
        }

        modalContent += `<div id="switch-form-container">`;

        if (hasMultipleRoles) {
            modalContent += `
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Elérhető szerepkörök:</label>
                <select id="switch-role" style="width:100%; padding:8px; margin-bottom:15px; border-radius:5px; border:1px solid #ccc;">
                    ${roles.map(r => `<option value="${r.id}" ${r.id === data.currentRoleId ? 'selected' : ''}>${r.nev}</option>`).join('')}
                </select>
            `;
        } else {
            modalContent += `
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Szerepkör (Fix):</label>
                <p style="padding:8px; background:#f5f5f5; border-radius:5px; margin-top:0; margin-bottom:15px;">${roles[0].nev}</p>
                <input type="hidden" id="switch-role" value="${roles[0].id}">
            `;
        }

     // MODUL (SZAKMAI ANYAG) RÉSZ
        if (hasMultipleModules) {
            modalContent += `
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Váltsunk szakmai anyagot:</label>
                <select id="switch-modul" style="width:100%; padding:8px; margin-bottom:20px; border-radius:5px; border:1px solid #ccc;">
                    ${modules.map(m => `<option value="${m.id}" ${m.id === data.currentModulId ? 'selected' : ''}>${m.leiras || m.nev}</option>`).join('')}
                </select>
            `;
        } else {
            modalContent += `
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Szakmai anyag (Fix):</label>
                <p style="padding:8px; background:#f5f5f5; border-radius:5px; margin-top:0; margin-bottom:20px;">${modules[0].leiras || modules[0].nev}</p>
                <input type="hidden" id="switch-modul" value="${modules[0].id}">
            `;
        }

        modalContent += `
                    <div style="display:flex; gap:10px;">
                        <button type="button" id="cancel-switch" style="flex:1; padding:10px; border:none; border-radius:5px; background:#ddd; cursor:pointer; color:#000; font-weight:bold;">Mégse</button>
                        <button type="button" id="execute-switch-btn" style="flex:1; padding:10px; border:none; border-radius:5px; background:#ff6500; color:#ffff; cursor:pointer; font-weight:bold;">Átjelentkezés</button>
                    </div>
                </div>
            </div></div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalContent);

        document.getElementById('cancel-switch').onclick = () => document.getElementById('switch-modal-overlay').remove();

        document.getElementById('execute-switch-btn').onclick = async () => {
            const newRoleId = document.getElementById('switch-role').value;
            const newModulId = document.getElementById('switch-modul').value;
            
            const btn = document.getElementById('execute-switch-btn');
            btn.innerText = 'Átjelentkezés folyamatban...';
            btn.disabled = true;

            try {
                const switchRes = await fetch('/switch-execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin', 
                    body: JSON.stringify({ szerepkor: newRoleId, modul_id: newModulId })
                });

                const switchOut = await switchRes.json();
                
                if (switchOut.success) {
                    window.location.href = switchOut.redirect;
                } else {
                    alert('Hiba a váltás során: ' + switchOut.message);
                    btn.innerText = 'Váltás végrehajtása';
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert('Hálózati hiba történt az átjelentkezéskor.');
                btn.innerText = 'Váltás végrehajtása';
                btn.disabled = false;
            }
        };

    } catch (err) {
        console.error(err);
        alert('Hálózati hiba történt az adatok lekérésekor.');
    }
});
// --- JELSZÓ LÁTHATÓSÁG KAPCSOLÁSA (GOLYÓÁLLÓ VERZIÓ) ---
document.addEventListener('click', function(e) {
    // Ha a kattintott elemen rajta van a 'toggle-jelszo' osztály
    if (e.target.classList.contains('toggle-jelszo')) {
        
        // Megkeressük a közvetlen szülőt (div), és azon belül az inputot
        const parent = e.target.parentElement;
        const input = parent.querySelector('input');
        
        if (input) {
            const isPassword = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPassword ? 'text' : 'password');
            e.target.textContent = isPassword ? 'visibility_off' : 'visibility';
        }
    }
});


const forgotPwBtn = document.getElementById('whbutt');

// Csak akkor adjuk hozzá az eseményt, ha a gomb létezik az adott oldalon
if (forgotPwBtn) {
    forgotPwBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (document.getElementById('forgot-pw-modal')) {
            return; 
        }
        // HTML Modal generálása
        const modal = document.createElement('div');
        modal.id = 'forgot-pw-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 900;">
                <div style="background: white; padding: 30px; border-radius: 8px; width: 90%; max-width: 400px; text-align: center; color: #333; box-shadow: 0 0 20px rgba(255,189,22,0.3);">
                    <h3 style="margin-bottom: 15px; color: #ffbd16;">Jelszó visszaállítása</h3>
                    <p style="margin-bottom: 20px; font-size: 14px; line-height: 1.5;">Kérjük, adja meg felhasználónevét és regisztrált e-mail címét a visszaállító link igényléséhez!</p>
                    <input type="text" id="fw-user" placeholder="Felhasználónév" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    <input type="email" id="fw-email" placeholder="E-mail cím" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between;">
                        <button id="fw-cancel" style="padding: 10px 20px; border: none; background: #ccc; border-radius: 4px; cursor: pointer; font-weight:bold;">Mégse</button>
                        <button id="fw-send" style="padding: 10px 20px; border: none; background: #ffbd16; color: white; border-radius: 4px; cursor: pointer; font-weight:bold;">Ellenőrzés és Küldés</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Mégse gomb
        document.getElementById('fw-cancel').addEventListener('click', () => modal.remove());
        
        // Küldés gomb
        document.getElementById('fw-send').addEventListener('click', async () => {
            const user = document.getElementById('fw-user').value.trim();
            const email = document.getElementById('fw-email').value.trim();

            if (!user || !email) {
                showAlert('A felhasználónév és az e-mail cím megadása is kötelező!');
                return;
            }

            try {
                const response = await fetch('/api/forgot-password-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fnev: user, email: email })
                });
                const data = await response.json();

                if (data.success) {
                    showAlert('Sikeres! Az aktiváló linket elküldtük az e-mail címére!');
                    modal.remove(); // Ablak bezárása
                } else {
                    showAlert(data.message || 'Hiba történt a kérelem során!'); 
                }
            } catch (err) {
                console.error(err);
                showAlert('Szerver kommunikációs hiba!');
            }
        });
    });
}