//Készülő értékelések szerkesztése, létrehozása, törlése, betöltése( Creat, Read, Update, Delete)
import {idszak, userId,modulId, userName, intezmeny, intezmeny_id,  mailname, adatok, letrehoz, fullname, resz1, resz2, resz3, aktualisKitoltesId,  animateMessage, BUTTONS, BUTTONS2 } from './dashMain.js'
import { resetSzemleView, resetKitoltesCache } from './dashView.js';
import { KategoriaKezelo } from '../main/main_quest.js';
import { kerdesValaszok,szovegesValaszok} from '../main/main_alap.js';
import { generatePdfMakePDF } from '../main/main_pdf.js';
import{showAlert,showMissingChecklist} from "/both/alert.js"
const grap = document.querySelector(".grap");
const sta = document.querySelector(".sta");
const gyik = document.querySelector(".gyik");
const felbukkano2 = document.querySelector("#felbukkano2");
const felbukkano4 = document.querySelector("#felbukkano4");
import { initMegosztas } from './dashsShare.js'; //Megosztás


let megtekintesMod = false;
// --- eredeti admin nevek cache ---
const originalAdminCache = new Map();

async function getOriginalAdminName(kitoltesId) {
  if (originalAdminCache.has(kitoltesId)) {
    return originalAdminCache.get(kitoltesId);
  }
  try {
    const resp   = await fetch(`/api/original-admin?kitoltesId=${encodeURIComponent(kitoltesId)}`);
    const result = await resp.json();
    const name   = result.success ? result.owner_name : 'Ismeretlen';
    originalAdminCache.set(kitoltesId, name);
    return name;
  } catch (err) {
    console.error('Original-admin lekérdezés hiba:', err);
    return 'Ismeretlen';
  }
}

//CREAT
// dashCRUD.js — initLetrehoz patch (részlet)
export function initLetrehoz({ userId, modulId }) {
  const attachOnce = () => {
    const go = document.querySelector('#gobut');
    const neve = document.querySelector('#neve');
    const idszak = document.querySelector('#idoszak');
    const megnevezes = document.querySelector('#megnevezes');
    const kijelentem = document.querySelector('#kijelentem');

    if (!go || go.__bound) return;
    go.__bound = true;

    go.addEventListener('click', function (event) {
      event.preventDefault();
      if (!neve.value || !idszak.value || !megnevezes.value) {
        showAlert('Az egyik mező üresen maradt');
        return;
      }
      if (!kijelentem.checked) {
        showAlert('Nem indíthat új értékelést, ameddig a szükséges hozzájárulásokkal nem rendelkezik!');
        return;
      }
      const letrehozva = new Date().toISOString().split('T')[0];
      const kitoltes_neve = `${idszak.value.replace(/-/g, '~')}-${megnevezes.value.replace(/-/g, '~')}`;
      const adat = { felhasznalo_id: userId, letrehozva, vizsgalt_nev: neve.value, kitoltes_neve, modul_id: modulId,
        audit: { user_id: userId, verzio_tag: 'v1.0', user_agent: navigator.userAgent } };
      fetch('/api/add-kitoltes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(adat)})
        .then(r=>r.json())
        .then(d=>{
          if (d.success) window.location.href = `./ertekelo.html?kitoltes_id=${d.id}&letrehozva=${encodeURIComponent(letrehozva)}`;
          else console.error('Hiba történt:', d.message);
        })
        .catch(err=>console.error('Fetch hiba:', err));
    });
  };

  // 1) azonnali próbálkozás (ha már a DOM-ban van)
  attachOnce();

  // 2) amikor a felület legenerálja az „Új értékelés” panelt:
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#ujert');
    if (target) setTimeout(attachOnce, 0);
  });

  // 3) egyszeri megfigyelés – első találat után lekapcsol
  const mo = new MutationObserver((mut) => {
    if (document.querySelector('#gobut')) {
      attachOnce();
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

//READ

  export async function initOlvas(kitoltesek, letrehozva, { groupByCreator = false } = {}) {

  // Audit nélküli kitöltések lekérése
  const auditResponse = await fetch( `/api/check-missing-audit-with-names?user_id=${encodeURIComponent(userId)}&modul_id=${encodeURIComponent(modulId)}`
);
 

  const auditData = await auditResponse.json();
  const missingAudits = auditData.success ? auditData.kitoltesek.map(k => k.idk) : [];


  const innerDiv = document.querySelector('.inner-div');
  innerDiv.innerHTML = '';
  let items = kitoltesek.filter(k => k.role !== 'removed' && !missingAudits.includes(k.idk));

  if (groupByCreator) {
    kitoltesek.sort((a, b) => (a.creator_name || '').localeCompare(b.creator_name || ''));
  }

  let currentWrapper   = null;
  let currentList      = null;
  let lastCreatorName  = null;
  if (!document.getElementById('ujert')) return;
        const kozep = document.createElement("div");
            kozep.classList.add("kozep");
            kozep.classList.add("kozepc")
           
            kozep.innerHTML= `

          
                      <div class="picik">
                         <div style = "display: flex;flex-wrap: wrap; align-content: center; justify-content: center;">
                             <span class="material-symbols-rounded">filter_alt </span>   Rendezés: 
                               <select name="szuro" id="szuro">
                                  <option value="role">Megosztás szerint</option>
                                  <option value="nev">Név szerint</option>
                                  <option value="periodus">Időszak szerint</option>
                                  <option value="megnev">Típus szerint</option>
                            </select>
                          </div>
                          <div>
                            <input id="cheking2" type="checkbox" class="cheking2"> Kijelölés statisztikára
                          </div>
            
                          </div>

                          <div style="justify-content: flex-start;">
                            <div class="search-bar">  
                                <span class="material-symbols-rounded search-icon">search</span>
                                <input type="text" id="kereso" class="search-input" placeholder="Keressen értékelései közt...">
                            </div> <div id="swics" style="display: flex;flex-direction: row;">
                                 
                            
                            <label class="switch">
                                    <input type="checkbox" id="chart-toggle">
                                    <span class="slider"></span>
                            </label> 
                            <span>Fejlődési görbe </span>
                       
                          </div>

                              </div>` ;
                          
  innerDiv.appendChild(kozep);
  initChekingToggle();   
  items.forEach(kitoltes => {
if (groupByCreator && kitoltes.creator_name !== lastCreatorName) {
  currentWrapper = document.createElement('div');
  currentWrapper.classList.add('creator-wrapper');

  const csopigomb = document.createElement('div');
  csopigomb.innerHTML = "Csoport kijelölése";
  csopigomb.classList.add("csopigomb");
  csopigomb.dataset.user = kitoltes.creator_name;

  // kattintáskor kigyűjtjük és bepipáljuk az összes egyező sornál levő checkboxot
    csopigomb.addEventListener('click', () => {
        const user = csopigomb.dataset.user;
        const selector = `.meglevok[data-user="${CSS.escape(user)}"] input.cheking[type="checkbox"]`;
        const checkboxes = Array.from(document.querySelectorAll(selector));

        if (checkboxes.length === 0) {
            console.warn(`Nincs találat a "${user}" felhasználóra.`);
            return;
        }

        const allChecked = checkboxes.every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
        const first = checkboxes[0];
        first.dispatchEvent(new Event('change', { bubbles: true }));
    });

  const csoport = document.createElement('div');
  csoport.classList.add('tarolo');

  const header = document.createElement('div');
  header.classList.add('creator-head');
  header.textContent = kitoltes.creator_name || 'Ismeretlen';

  currentList = document.createElement('div');
  currentList.classList.add('creator-list');

  currentWrapper.append(header, currentList);
  csoport.append(csopigomb, currentWrapper);
  innerDiv.appendChild(csoport);

  lastCreatorName = kitoltes.creator_name;
}
            const tartaly = document.createElement("div");
            tartaly.classList.add("tart");
    
            innerDiv.appendChild(tartaly);

            const kitoltesDiv = document.createElement('div');
            kitoltesDiv.classList.add('meglevok');
             const decryptedName = kitoltes.vizsgalt_nev || 'Ismeretlen alany';
            const nameHtml = `<div class="vizsgalt-nev"><strong>${decryptedName}</strong></div>`;

           
const formattedText = (kitoltes.kitoltes_neve || '').replace(/-/g, '- <br>');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.id = kitoltes.idk;
            checkbox.classList.add("cheking");

            function renderButtons(role, kit) {
                return BUTTONS[role].map(btn => {
                    const data = btn.action 
                    ? `data-action="${btn.action}" data-id="${kit.idk}" data-name="${kit.kitoltes_neve}"`
                    : '';
                    return `
                    <div class="modulebutt">
                        <span class="material-symbols-rounded ${btn.cls}" ${data}>${btn.icon}</span>
                        <span class="help">${btn.help}</span>
                    </div>`;
                }).join('');
            }
                  function renderButtons2(role, kit) {
                return BUTTONS2[role].map(btn => {
                    const data = btn.action 
                    ? `data-action="${btn.action}" data-id="${kit.idk}" data-name="${kit.kitoltes_neve}"`
                    : '';
                    return `
                    <div class="modulebutt">
                        <span class="material-symbols-rounded ${btn.cls}" ${data}>${btn.icon}</span>
                        <span class="help">${btn.help}</span>
                    </div>`;
                }).join('');
            }

                const role     = kitoltes.role === 'editor' ? 'szerkeszto' : 'tulaj';
                const modules = `<div class="modules">${
                            groupByCreator ? renderButtons2(role, kitoltes) : renderButtons(role, kitoltes)
                            }</div>`;                
 // --- Megosztás jelzés szerkesztőknek ---
let warning = '';
if (role === 'szerkeszto') {
  // ideiglenes felirat, amíg a név megérkezik
  warning = `<div class="savdiv" style="background:#ff6500">Megosztva…</div>`;

  // név beillesztése aszinkron
  getOriginalAdminName(kitoltes.idk).then(ownerName => {
    const savdiv = kitoltesDiv.querySelector('.savdiv');
    if (savdiv) savdiv.textContent = `${ownerName} megosztása`;
  });
}

        kitoltesDiv.innerHTML =
            nameHtml 
            + warning 
            + modules
            + formattedText;        
            kitoltesDiv.dataset.kitoltesId = kitoltes.id;
                kitoltesDiv.setAttribute('data-role', kitoltes.role);
                kitoltesDiv.setAttribute('data-user', kitoltes.creator_name);
                kitoltesDiv.dataset.undo = kitoltes.vizsgalt_id;
                kitoltesDiv.appendChild(checkbox);
                kitoltesDiv.dataset.modulId = modulId;                // modul
              const [periodus, megnev] = kitoltes.kitoltes_neve
    .split('-')
    .map(s => s.replace(/~/g, '-').trim());

  // dataset-be NE az inputot, hanem a szöveget mentsük:
  kitoltesDiv.dataset.kitoltesId = kitoltes.idk;
  kitoltesDiv.dataset.nev       = kitoltes.vizsgalt_nev; 
  kitoltesDiv.dataset.periodus  = periodus;  // most már egy string
  kitoltesDiv.dataset.megnev    = megnev;         // "Vizsgálat"


            kitoltesDiv.addEventListener('click', async (event) => {
                if (
                    event.target.closest('.modulebutt') || 
                    event.target.matches('input[type="checkbox"]')
                ) return;

    document.querySelectorAll('.modules').forEach(mod => mod.style.display = 'none');

    const modulesDiv = kitoltesDiv.querySelector('.modules');
    const maininf = document.getElementById('maininf');
        const gyiik = document.getElementById('gyik');

    const osszesitett = document.getElementById('osszesitett');
    grap.classList.add("aktiv");
    sta.classList.remove("aktiv");
    gyik.classList.remove("aktiv");
    maininf.style.display = 'flex';
    gyiik.style.display="none"
    osszesitett.style.display = 'none';
    modulesDiv.style.position = 'absolute';
    modulesDiv.style.display = 'grid';
      felbukkano2.style.display="none";
      felbukkano4.style.display="none";
    setTimeout(() => { modulesDiv.style.opacity = "1"; }, 100);
    resetSzemleView();

    // URL módosítása
    const kitoltesId = kitoltesDiv.dataset.kitoltesId;
    const newParams = new URLSearchParams(window.location.search);
    newParams.set("kitoltes_id", kitoltesId);
    newParams.set("megtekintes", "true");
    history.replaceState(null, "", `${location.pathname}?${newParams.toString()}`);

    // Tartalom újratöltése
    resetKitoltesCache();
    await KategoriaKezelo.loadValaszok();
    KategoriaKezelo.frissitErtekelesekContainer();

    // Mentés az adatbázisba a frissített százalékos JSON alapján
    const aktualisSzazalekJSON = window.ertekelesJSON;
    console.log(aktualisSzazalekJSON)
    const aktualisKitoltesId = kitoltesDiv.dataset.kitoltesId;

    if (aktualisSzazalekJSON && aktualisKitoltesId) {
        fetch('/api/save-szazalek-json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                kitoltesId: aktualisKitoltesId,
                szazalek: aktualisSzazalekJSON
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Százalék mentése sikertelen:', data.message);
            } else {
                console.log('Százalék JSON automatikusan elmentve (kitoltesDiv-kattintáskor).');
            }
        })
        .catch(err => {
            console.error('Mentési hiba:', err);
        });
    }

    // Fejléc frissítése
    const fej2 = document.querySelector('#kitneve');
    if (fej2) {
        fej2.innerHTML = nameHtml
            + warning 
            + modules
            + formattedText; ;
    }
    // Gördítés a megjelenített értékeléshez
            const keszulo = document.getElementById("keszulo");
            if (keszulo) {
                keszulo.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            });

              
            tartaly.appendChild(kitoltesDiv);
              document.querySelectorAll('.fo_edit').forEach(button => {
                    button.addEventListener('click', (event) => {
                        event.stopPropagation(); // ne triggerelje a parent kattintást
                        const kitoltesDiv = event.target.closest('.meglevok');
                        const kitoltesId = kitoltesDiv.dataset.kitoltesId;
                        const newUrl = `./ertekelo.html?kitoltes_id=${kitoltesId}&letrehozva=${encodeURIComponent(letrehozva)}`;
                        window.location.href = newUrl;

                    });
                        (groupByCreator ? currentList : innerDiv).appendChild(tartaly);

                });
        });
if (auditData.success && auditData.kitoltesek.length > 0) {
  showMissingChecklist(auditData.kitoltesek)
    .then(confirmedVizsgaltIds => {
      return fetch('/api/audit-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          vizsgalt_ids: confirmedVizsgaltIds
        })
      });
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showAlert(`${data.inserted} audit bejegyzés rögzítve.`);
        setTimeout(() => location.reload(), 500);
      } else {
        showAlert('Audit mentés hiba: ' + data.message);
      }
    })
    .catch(err => {
      console.error('Audit-confirm hiba:', err);
      showAlert('Audit mentési hiba történt.');
    });
}



         initFrissites({ userId, letrehozva });
        initTorol();
        document.querySelectorAll('.modulebutt span[data-action]')
        .forEach(icon => {
        icon.addEventListener('click', async (e) => {
        e.stopPropagation();
            const meglevok = e.target.closest('.meglevok'); // ← EZ KELL


        const action = icon.dataset.action;
        const kitoltesId = icon.dataset.id;
        const kitoltesNev = icon.dataset.name;

        // URL frissítése
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("kitoltes_id", kitoltesId);
        newParams.set("megtekintes", "true");
        history.replaceState(null, "", `${location.pathname}?${newParams.toString()}`);

        // Tartalom újratöltése
        resetSzemleView();
        resetKitoltesCache();
        await KategoriaKezelo.loadValaszok();
        KategoriaKezelo.frissitErtekelesekContainer();

        // Fejléc frissítése, ha van
        const fej2 = document.querySelector('#kitneve');
        if (fej2) {
            fej2.innerHTML = kitoltesNev;
        }

        // Akciók
      
            
// a megosztást a dashsShare.js kezeli
if (action === "share") {
  
  initMegosztas({ fullname, intezmeny_id });
  return;
}        
if (action === "print") {
      generatePdfMakePDF(true,  meglevok);
        } else if (action === "picture_as_pdf") {
      generatePdfMakePDF(false, meglevok);
        } else if (action === "mail") {
            showAlert('Még nincs kész a mailküldés, nyugi.');

        }
    });
});
// --- CSOPORTOSÍTÁS A SZŰRŐ SELECT ALAPJÁN ----------------------------
function groupBySelect(type = 'role') {
  
  const innerDiv = document.querySelector('.inner-div');
  if (!innerDiv) return;

  const tartok = [...innerDiv.querySelectorAll('.tart')];
  innerDiv.querySelectorAll('.csopi').forEach(e => e.remove());
  tartok.forEach(t => t.remove());

  // =============== MEGOSZTÁS SZERINT ===============================
  if (type === 'role') {
    const ROLE_TITLE = {
      admin : 'Saját Értékelések',
      editor: 'Velem megosztott értékelések'
    };
    const ROLE_ORDER = ['admin', 'editor'];

    const groups = new Map();   // role → { csopi, doboz, fejlec, count }
    tartok.forEach(tart => {
      const role = (tart.querySelector('.meglevok').dataset.role || 'other').trim();

      if (!groups.has(role)) {
        const csopi  = document.createElement('div');
        csopi.classList.add('csopi');

        const fejlec = document.createElement('div');
        fejlec.classList.add('fejlec2');

        const doboz  = document.createElement('div');
        doboz.classList.add('doboztart');

        csopi.append(fejlec, doboz);
        groups.set(role, { csopi, doboz, fejlec, count: 0, title: ROLE_TITLE[role] || 'Egyéb megosztások' });
      }

      const g = groups.get(role);
      g.doboz.appendChild(tart);
      g.count += 1;
    });

    // végleges fejléc-szöveg + sorrend
    ROLE_ORDER.concat([...groups.keys()].filter(k => !ROLE_ORDER.includes(k)))
      .forEach(k => {
        const g = groups.get(k);
        if (g) {
          g.fejlec.textContent = `${g.title} (${g.count})`;
          innerDiv.appendChild(g.csopi);
        }
      });
    return;
  }

  // =============== NÉV / IDŐSZAK / TÍPUS SZERINT ===================
  const groups = new Map();     // key → { csopi, doboz, fejlec, count }
  tartok.forEach(tart => {
    const key = (tart.querySelector('.meglevok').dataset[type] || 'Ismeretlen').trim();

    if (!groups.has(key)) {
      const csopi  = document.createElement('div');
      csopi.classList.add('csopi');

      const fejlec = document.createElement('div');
      fejlec.classList.add('fejlec2');

      const doboz  = document.createElement('div');
      doboz.classList.add('doboztart');

      csopi.append(fejlec, doboz);
      groups.set(key, { csopi, doboz, fejlec, count: 0, title: key });
    }

    const g = groups.get(key);
    g.doboz.appendChild(tart);
    g.count += 1;
  });

  groups.forEach(g => {
    g.fejlec.textContent = `${g.title} (${g.count})`;
    innerDiv.appendChild(g.csopi);
  });
}



// --- SZŰRŐ KAPCSOLÓ ---------------------------------------------------
function initSzuro() {
     if (!document.getElementById('foglalt')) return;

  const sel = document.getElementById('szuro'); // <select id="szuro">
  if (!sel) return;

  groupBySelect(sel.value);

  sel.addEventListener('change', e => groupBySelect(e.target.value));
}
initSzuro();
const toggleSwitch = document.getElementById('chart-toggle');
const chartContainer = document.querySelector('#folyamat');

// Eseményfigyelő hozzáadása a kapcsolóhoz
toggleSwitch.addEventListener('change', function() {
  // Ellenőrizzük, hogy a kapcsoló be van-e kapcsolva
  if (this.checked) {
    chartContainer.style.display = 'flex';
  } else {
    chartContainer.style.display = 'none';
  }
});
    }
let eredetiErtekekTomb = [];
let eredetIdTomb       = [];

export function initFrissites({ userId, letrehozva }) {
  const editButtons   = document.querySelectorAll(".edit");
  const kilep3        = document.querySelector("#kilep3");
  const felbukkano3   = document.querySelector("#felbukkano3");
  const ujinek2       = document.querySelector("#ujinek2");
  const neve2         = document.querySelector("#neve2");
  const idszak2       = document.querySelector("#idoszak2");
  const megnevezes2   = document.querySelector("#megnevezes2");
  const go2           = document.querySelector("#gobut2");

  // 1) Szerkesztés gomb kezelése
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // popup animáció
      felbukkano3.style.display = 'flex';
 if (felbukkano4) {
  felbukkano4.style.display = 'none';
 }      felbukkano2.style.display = 'none';
      setTimeout(() => {
        felbukkano3.style.opacity = '1';
        felbukkano3.style.scale   = '1';
      }, 100);
      ujinek2.style.display = 'flex';
      setTimeout(() => {
        ujinek2.style.opacity = '1';
        ujinek2.style.scale   = '1';
      }, 50);

      // kitoltesDiv, ahonnan átolvassuk az adatokat
  const kitDiv      = btn.closest('.meglevok');
    const vizsgaltNev = kitDiv.dataset.nev     || '';
    const periodus    = kitDiv.dataset.periodus|| '';
    const megnev      = kitDiv.dataset.megnev  || '';
          const kitoltesId  = kitDiv.dataset.kitoltesId;


    neve2.value       = vizsgaltNev;
    idszak2.value     = periodus;     // most már pl. "2024/I"
    megnevezes2.value = megnev;       // pl. "Vizsgálat"

      // eredeti értékek tárolása összehasonlításhoz
      eredetIdTomb.push(kitoltesId);
      eredetiErtekekTomb.push(`${periodus}-${megnev}`);
    });
  });

  // 2) Kilépés a popupból
  kilep3.addEventListener("click", () => {
    felbukkano3.style.scale   = "0";
    felbukkano3.style.opacity = "0";
    setTimeout(() => {
      felbukkano3.style.display = "none";
    }, 400);
  });

  // 3) Mentés (UPDATE)
go2.addEventListener("click", event => {
    event.preventDefault();

    // !!! NE definiálj új letrehozva-t, itt az outer scope változó a lényeg !!!
    // const letrehozva = letrehozva; // <<< EZ FÖLÖSLEGES!!!

    const ujPeriodus = idszak2.value.trim();
    const ujMegnev   = megnevezes2.value.trim();

  const [eredetiNeve2, eredetiKitNev, eredetiLetrehoz] = eredetiErtekekTomb;

if (!neve2.value || !ujPeriodus || !ujMegnev) {
            showAlert('Az egyik mező üres');
  return;
}

const ujKitNev = `${ujPeriodus.replace(/-/g, "~")}-${ujMegnev.replace(/-/g, "~")}`;

// Ellenőrzés: se neve, se a kitöltés neve vagy dátuma nem változott?
if (
  neve2.value       === eredetiNeve2 &&  // az alanynév
  ujKitNev           === eredetiKitNev && // a kitöltés neve
  letrehozva.value   === eredetiLetrehoz   // a dátum
) {
              showAlert('Nem módosított adatot');

  return;
}

    const kitoltesId = eredetIdTomb.at(-1);

  const adat = {
  id:            kitoltesId,
  letrehozva:    letrehozva,
  kitoltes_neve: ujKitNev,
  vizsgalt_nev:   neve2.value      // új mező a popupból
};
fetch('/api/update-kitoltes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(adat)
})

      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          showAlert("Hiba: " + data.message);
          return;
        }
            showAlert('Sikeres frissítés. Az oldal újratölt');
        window.location.reload();
      })
      .catch(err => console.error("Fetch hiba:", err));
  });

}

//DELETE
    export function initTorol() {
       const deletedButtons = document.querySelectorAll(".deleted"); // Minden törlés gomb kiválasztása
                    deletedButtons.forEach(deleted => {
                        deleted.addEventListener('click', function() {
                            const kitoltesId = deleted.dataset.id; // Az adott kitöltés ID-jének lekérése
    
                            const megerosites = confirm(`Biztosan törölni szeretné ezt a kitöltést? ${kitoltesId}`);
                            if (!megerosites) {return;  }
                            fetch('/api/delete-kitoltes', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: kitoltesId })
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
            showAlert('Sikeres törlés');
                                        window.location.reload(); // Oldal újratöltése a frissített adatokkal
                                    } else {
                                        console.error('Hiba történt a törlés során:', data.message);
                                    }
                                })
                                .catch(error => {
                                    console.error('Fetch hiba:', error);
                                });
                        });
                        
                    });
    }


// --- cheking2 checkbox mutat/elrejt minden .cheking elemet -----------
function initChekingToggle() {
  const master = document.getElementById('cheking2'); // <input id="cheking2">
  if (!master) return;                           // ha nincs, kilépünk

  const apply = () => {
    const show = master.checked;
    const swics = document.querySelector("#swics");

    // Itt van a kulcsfontosságú változtatás:
    // A 'swics' display tulajdonságát is a 'show' változó vezérli.
    // Javítottam az elírást is ('dispay' -> 'display').
    swics.style.display = show ? 'flex' : 'none'; 

    document.querySelectorAll('.cheking').forEach(el => {
      el.style.display = show ? 'inline-flex' : 'none'; // inputnál inkább inline-flex
    });
  };

  master.addEventListener('change', apply);
  apply();                                      // induláskor is
}
