//Készülő értékelések szerkesztése, létrehozása, törlése, betöltése( Creat, Read, Update, Delete)
import {idszak, userId,modulId, userName, intezmeny, intezmeny_id,  mailname, adatok, letrehoz, fullname, resz1, resz2, resz3, aktualisKitoltesId,  animateMessage, BUTTONS, BUTTONS2 } from './dashMain.js'
import { resetSzemleView, resetKitoltesCache } from './dashView.js';
import { KategoriaKezelo } from '../main/main_quest.js';
import { kerdesValaszok,szovegesValaszok} from '../main/main_alap.js';
import { generatePdfMakePDF } from '../main/main_pdf.js';
import {initSzuro,initChekingToggle,initSearch  } from './dashSort.js';
import {showAlert,showMissingChecklist, customConfirm,customPrompt3,customDatePrompt } from "/both/alert.js"
import { triggerIndividualAiAnalysis } from './dashAI.js';
import { initMegosztas } from './dashsShare.js'; //Megosztás
import { loadColorMaps } from './dashStatic.js';

const grap = document.querySelector(".grap");
const sta = document.querySelector(".sta");
const gyik = document.querySelector(".gyik");
const felbukkano2 = document.querySelector("#felbukkano2");
const felbukkano4 = document.querySelector("#felbukkano4");
let megtekintesMod = false;
const originalAdminCache = new Map();
let eredetiErtekekTomb = [];
let eredetIdTomb       = [];

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
let letrehozInitialized = false; // Változó a többszörös lefutás megakadályozására

export function initLetrehoz({ userId, modulId }) {
  if (letrehozInitialized) return; // Ha már lefutott, rögtön kilép
  letrehozInitialized = true;

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

      // Védelem dupla kattintás ellen
      if (go.disabled) return; 

      if (!neve.value || !idszak.value || !megnevezes.value) {
        showAlert('Az egyik mező üresen maradt');
        return;
      }
      if (!kijelentem.checked) {
        showAlert('Nem indíthat új értékelést, ameddig a szükséges hozzájárulásokkal nem rendelkezik!');
        return;
      }

      // Gomb letiltása a kérés idejére
      go.disabled = true;
      go.style.opacity = '0.5'; 
      go.style.cursor = 'not-allowed';

      const letrehozva = new Date().toISOString().split('T')[0];
      const kitoltes_neve = `${idszak.value.replace(/-/g, '~')}-${megnevezes.value.replace(/-/g, '~')}`;
      const adat = { 
          felhasznalo_id: userId, 
          letrehozva, 
          vizsgalt_nev: neve.value, 
          kitoltes_neve, 
          modul_id: modulId,
          audit: { user_id: userId, verzio_tag: 'v1.0', user_agent: navigator.userAgent } 
      };
      
      fetch('/api/add-kitoltes', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(adat)
      })
      .then(r => r.json())
      .then(d => {
          if (d.success) {
              window.location.href = `./ertekelo.html?kitoltes_id=${d.id}&letrehozva=${encodeURIComponent(letrehozva)}`;
          } else {
              console.error('Hiba történt:', d.message);
              showAlert('Hiba: ' + d.message);
              // Hiba esetén a gomb újra engedélyezése
              go.disabled = false;
              go.style.opacity = '1';
              go.style.cursor = 'pointer';
          }
      })
      .catch(err => {
          console.error('Fetch hiba:', err);
          showAlert('Szerver hiba történt a mentés során!');
          // Hiba esetén a gomb újra engedélyezése
          go.disabled = false;
          go.style.opacity = '1';
          go.style.cursor = 'pointer';
      });
    });
  };

  attachOnce();

  document.addEventListener('click', (e) => {
    const target = e.target.closest('#ujert');
    if (target) setTimeout(attachOnce, 0);
  });

  const mo = new MutationObserver((mut) => {
    if (document.querySelector('#gobut')) {
      attachOnce();
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
//READ
export async function initOlvas(kitoltesek, letrehozva, { groupByCreator = false, isElemzo = false } = {}) {  const auditResponse = await fetch( `/api/check-missing-audit-with-names?user_id=${encodeURIComponent(userId)}&modul_id=${encodeURIComponent(modulId)}` );
  const auditData = await auditResponse.json();
  const missingAudits = auditData.success ? auditData.kitoltesek.map(k => k.idk) : [];

  const innerDiv = document.querySelector('.inner-div');
  innerDiv.innerHTML = '';
let items = kitoltesek.filter(k => k.role !== 'removed' && !missingAudits.includes(k.idk));

  if (groupByCreator) {
    // ITT A JAVÍTÁS: kitoltesek.sort helyett items.sort
    items.sort((a, b) => (a.creator_name || '').localeCompare(b.creator_name || ''));
  }
 

  let currentWrapper   = null;
  let currentList      = null;
  let lastCreatorName  = null;
  
  if (!document.getElementById('ujert')) return;
  
  const kozep = document.createElement("div");
  kozep.classList.add("kozep");
  kozep.classList.add("kozepc");
            
  kozep.innerHTML= `
       <div>
                  <div id="picik">
                      <div id="tomlo">
                        <div class="search-bar">
                          <span class="material-symbols-rounded search-icon">search</span>
                          <div id="belsosearch">
                            <select id="kereso-tipus" class="search-select">
                                <option value="nev">Név</option>
                                <option value="idoszak">Időszak</option>
                                <option value="megnevezes">Típus</option>
                                <option value="all">Mind</option>
                            </select>
                            <input type="text" id="kereso" class="search-input" placeholder="Keresés...">
                          </div>
                        </div>
                        <div id="endezo">
                        <span class="material-symbols-rounded sort-icon">sort</span>

                      <select name="szuro" id="szuro">
                              <option value="role2" selected disabled hidden>Rendezés...</option>
                                  <option value="role">Tulaj szerint</option>
                                  <option value="nev">Név szerint</option>
                                  <option value="periodus">Dátum szerint</option>
                                  <option value="megnev">Típus szerint</option>
                            </select>
                      </div>
                    </div>
                        <div id="statisztika"> 
                          <div id="mozgo">
                            <label class="swics">
                                <input id="cheking2" type="checkbox" class="cheking2" style="opacity: 0; width: 0; height: 0;">
                                <span class="slider round"></span>
                            </label>

                            <span class="swicsi">Értékelések kijelölése csoportos statisztikára</span>
    
                          </div>
                          <div id="mozgo2">
                         

                            <span class="swicsi2">Kijelöltek megjelölése auditációra</span>
                            <span class="swicsi3">Kijelöltek határidejének megadása</span>

    
                          </div>
                          <div id="stat-info-box">
                              <span id="sel-count">0 </span> értékelés kijelölve.
                          </div>

                        </div>

                      </div>
              </div>
          ` ;
                          
  innerDiv.appendChild(kozep);
  initChekingToggle();   
  
  // --- SEGÉDFÜGGVÉNYEK A GOMBOKHOZ ---
  function renderButtons(role, kit) {
      return BUTTONS[role].map(btn => {
          const dataAttributes = btn.action 
          ? `data-action="${btn.action}" data-id="${kit.idk}" data-name="${kit.kitoltes_neve}"`
          : `data-id="${kit.idk}"`; // Ha nincs action (pl. fo_edit), az ID akkor is kell

          const labelHtml = btn.label 
              ? `<span style="pointer-events: none;">${btn.label}</span>` // pointer-events: none fontos!
              : '';

          return `
          <div class="modulebutt ${btn.cls}" ${dataAttributes}">
              <span class="material-symbols-rounded" style="pointer-events: none;">${btn.icon}</span>
              ${labelHtml}
              <span class="help">${btn.help}</span>
          </div>`;
      }).join('');
  }

  function renderButtons2(role, kit) {
      return BUTTONS2[role].map(btn => {
          const dataAttributes = btn.action 
          ? `data-action="${btn.action}" data-id="${kit.idk}" data-name="${kit.kitoltes_neve}"`
          : `data-id="${kit.idk}"`;

          const labelHtml = btn.label 
              ? `<span style="margin-left: 5px; pointer-events: none;">${btn.label}</span>` 
              : '';

          return `
          <div class="modulebutt ${btn.cls}" ${dataAttributes} style="display: flex; align-items: center; padding: 5px; cursor: pointer;">
              <span class="material-symbols-rounded" style="pointer-events: none;">${btn.icon}</span>
              ${labelHtml}
              <span class="help">${btn.help}</span>
          </div>`;
      }).join('');
  }

  // --- SOROK GENERÁLÁSA ---
  items.forEach(kitoltes => {
  if (groupByCreator && kitoltes.creator_name !== lastCreatorName) {
      currentWrapper = document.createElement('div');
      currentWrapper.classList.add('creator-wrapper');

      const csopigomb = document.createElement('div');
      csopigomb.innerHTML = "Csoport kijelölése";
      csopigomb.classList.add("csopigomb");
      csopigomb.dataset.user = kitoltes.creator_name;

      csopigomb.addEventListener('click', () => {
          const user = csopigomb.dataset.user;
          const selector = `.meglevok[data-user="${CSS.escape(user)}"] input.cheking[type="checkbox"]`;
          const checkboxes = Array.from(document.querySelectorAll(selector));
          if (checkboxes.length === 0) return;
          const allChecked = checkboxes.every(cb => cb.checked);
          checkboxes.forEach(cb => cb.checked = !allChecked);
          const first = checkboxes[0];
          first.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const csoport = document.createElement('div');
      csoport.classList.add('tarolo');
      
    const header = document.createElement('div');
      header.classList.add('creator-head');
      
      // Megszámoljuk, hány értékelés tartozik ehhez a készítőhöz
      const currentCreatorName = kitoltes.creator_name || 'Ismeretlen';
      const itemCount = items.filter(item => (item.creator_name || 'Ismeretlen') === currentCreatorName).length;
      
      header.innerHTML = `
          <span style="display: flex; align-items: center; gap: 8px;">
              ${currentCreatorName}
              <span style="background: rgba(0,0,0,0.1); padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">
                  ${itemCount}
              </span>
          </span>
          <span class="material-symbols-rounded toggle-icon" style="transition: transform 0.3s; color:orangered;">expand_more</span>
      `;
      header.style.cursor = 'pointer';
      header.style.userSelect = 'none';
      header.style.display = 'flex';
      header.style.justifyContent = 'flex-start';
      header.style.alignItems = 'center';

      currentList = document.createElement('div');
      currentList.classList.add('creator-list');
      currentList.style.display = 'none';
// --- ÚJ LOKÁLIS CSOPORTOSÍTÓ HOZZÁADÁSA ---
      const helyiRendezo = document.createElement('div');
      helyiRendezo.classList.add('helyi-endezo'); 

      helyiRendezo.innerHTML = `
          <div class="nagyonhelyi">
              <span class="material-symbols-rounded sort-icon">sort</span>
              <select class="helyi-szuro">
                  <option value="alap" selected disabled hidden>Csoportosítás...</option>
                  <option value="nev">Név szerint</option>
                  <option value="periodus">Dátum szerint</option>
                  <option value="megnev">Típus szerint</option>
              </select>
          </div>
      `;

      const selectElem = helyiRendezo.querySelector('.helyi-szuro');

      selectElem.addEventListener('change', (e) => {
          const szempont = e.target.value; 
          const szuloLista = e.target.closest('.creator-list');
          
          // 1. Összeszedjük az összes értékelést (.tart) ebből a listából
          const tartElemek = Array.from(szuloLista.querySelectorAll('.tart'));
          
          // 2. Letakarítjuk a korábbi csoportosító div-eket, ha már volt ilyen
          szuloLista.querySelectorAll('.helyi-csoport').forEach(cs => cs.remove());
          
          // 3. Csoportosítás a kiválasztott érték (dataset) alapján
          const csoportok = {};
          
          tartElemek.forEach(tart => {
              const div = tart.querySelector('.meglevok');
              // Kiszedjük az értéket (pl. "2023/24" vagy "Gipsz Jakab"), ha nincs, akkor "Egyéb"
              const ertek = (div && div.dataset[szempont]) ? div.dataset[szempont] : 'Ismeretlen';
              
              if (!csoportok[ertek]) {
                  csoportok[ertek] = [];
              }
              csoportok[ertek].push(tart); // Hozzáadjuk a tömbhöz a HTML elemet
          });
          
          // 4. Csoportok kulcsainak (neveinek) ABC sorrendbe rendezése
          const rendezettKulcsok = Object.keys(csoportok).sort((a, b) => a.localeCompare(b, 'hu'));
          
          // 5. Új divek (csoportok) létrehozása és a kártyák betöltése
          rendezettKulcsok.forEach(kulcs => {
              // Fő tároló a csoportnak
              const csoportDiv = document.createElement('div');
              csoportDiv.classList.add('helyi-csoport');
              csoportDiv.style.marginTop = '15px';
              csoportDiv.style.borderLeft = '3px solid rgba(255, 101, 0, 0.5)'; // Egy kis vizuális elválasztó bal oldalt
              csoportDiv.style.paddingLeft = '15px';
              
              // A csoport fejléce (pl: "2023/24")
              const fejlec = document.createElement('div');
              fejlec.classList.add('helyi-fejlec');
              fejlec.textContent = kulcs; 
              
              // Ebbe kerülnek maguk a .tart elemek
              const elemekTaroloja = document.createElement('div');
              elemekTaroloja.classList.add('helyi-elemek');
              
              // Bepakoljuk a HTML elemeket a tárolóba
              csoportok[kulcs].forEach(tart => {
                  elemekTaroloja.appendChild(tart);
              });
              
              // Összerakjuk a szerkezetet
              csoportDiv.appendChild(fejlec);
              csoportDiv.appendChild(elemekTaroloja);
              
              // Hozzáadjuk a fő listához
              szuloLista.appendChild(csoportDiv);
          });
      });

      // Hozzáadjuk a listához még azelőtt, hogy a .tart elemek belekerülnének
      currentList.appendChild(helyiRendezo);
      // --- LOKÁLIS CSOPORTOSÍTÓ VÉGE ---
      // Javított eseményfigyelő:
      header.addEventListener('click', () => {
          // A fejléc közvetlen testvérelemét (a hozzá tartozó listát) fogjuk meg
          const myTargetList = header.nextElementSibling;
          const icon = header.querySelector('.toggle-icon');
          
          if (myTargetList.style.display === 'none') {
              myTargetList.style.display = 'flex'; 
              header.style.height = '45px'
              csopigomb.style.height='45px'
              if (icon) icon.style.transform = 'rotate(180deg)';
          } else {
              myTargetList.style.display = 'none';
                            header.style.height = '8vh'
                            csopigomb.style.height = '8vh'

              if (icon) icon.style.transform = 'rotate(0deg)';
          }
      });

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
    
    // --- HTML RÉSZEK ÖSSZEÁLLÍTÁSA ---
    const decryptedName = kitoltes.vizsgalt_nev || 'Ismeretlen alany';
    const nameHtml = `<div class="vizsgalt-nev"><strong>${decryptedName}</strong></div>`;
    const formattedText = (kitoltes.kitoltes_neve || '').replace(/-/g, '- <br>');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.id = kitoltes.idk;
    checkbox.classList.add("cheking");

    const role = kitoltes.role === 'editor' ? 'szerkeszto' : 'tulaj';
    
    let warning = '';
    if (role === 'szerkeszto') {
        warning = `<div class="savdiv" style="background:#ff6500">Megosztva…</div>`;
        getOriginalAdminName(kitoltes.idk).then(ownerName => {
            const savdiv = kitoltesDiv.querySelector('.savdiv');
            if (savdiv) savdiv.textContent = `${ownerName} megosztása`;
        });
    }

    const modules = `<div class="modules" data-kitoltes-id="${kitoltes.idk}">${
        groupByCreator ? renderButtons2(role, kitoltes) : renderButtons(role, kitoltes)
    }</div>`;

 // --- ÚJ WARM (WARNING) ÉS HATÁRIDŐ LOGIKA (EGYESÍTETT BUBORÉK) ---
    let warmHtml = '';
    const auditStatus = Number(kitoltes.audit); 

    if (auditStatus === 1) {
        // SZIGORÍTOTT VIZSGÁLAT: Kiszűrjük a "null" sztringet és a csak szóközöket is
        let hasMessage = kitoltes.warm && kitoltes.warm !== 'null' && kitoltes.warm.trim() !== '';
        
        let hasDeadline = !!kitoltes.hatarido;
        
        let combinedText = "";
        let iconsHtml = "";

        // 1. Üzenet rész összerakása
        if (hasMessage) {
            combinedText += kitoltes.warm.trim();
            iconsHtml += `<div class="warm-icon" style="font-weight: bold;">!</div>`;
        } else if (!hasDeadline) {
            // Nincs se üzenet, se határidő, de auditálásra van jelölve
            // Itt beállítjuk a default szöveget, de NEM írjuk felül a hasMessage-t, 
            // hogy később is tudjuk, ez csak egy "üres" figyelmeztetés.
            combinedText += 'Értékelését egy auditor vizsgálatra jelölte ki.';
            iconsHtml += `<div class="warm-icon" style="font-weight: bold;">!</div>`;
        }

        // 2. Határidő rész összerakása
        if (hasDeadline) {
            const hDatum = new Date(kitoltes.hatarido);
            const ma = new Date();
            ma.setHours(0,0,0,0);
            hDatum.setHours(0,0,0,0);

            const diffDays = Math.ceil((hDatum.getTime() - ma.getTime()) / (1000 * 60 * 60 * 24));
            let napSzoveg = diffDays > 0 ? `(még ${diffDays} nap)` : (diffDays === 0 ? `(ma jár le!)` : `(lejárt ${Math.abs(diffDays)} napja)`);
            const formatDatum = hDatum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
            
            if (hasMessage) {
                combinedText += `<br><br>`; 
            } else {
                combinedText += `Határidő lett beállítva ehhez az értékeléshez:<br>`;
            }
            
            combinedText += `<span style="color: #ffbd16;">Határidő:</span> ${formatDatum} ${napSzoveg}`;
            iconsHtml += `<span class="material-symbols-outlined warm-icon" style="margin-left: 4px;">calendar_clock</span>`;
        }

        warmHtml = `
          <div class="warm warm-item" style="display: flex; align-items: center;">
            <span class="warmnote">${combinedText}</span>
            ${iconsHtml}
          </div>
        `;

        // 3. Osztályok kiosztása a tiszta logika alapján
        if (hasMessage) {
            // Van valós, backendből jövő üzenet (határidővel vagy anélkül)
            kitoltesDiv.classList.add("figyelmeztetve");
        } else if (hasDeadline) {
            // CSAK határidő van, üzenet nincs (hasMessage itt biztosan false)
            kitoltesDiv.classList.add("hatarido");
        } else {
            // Nincs se üzenet, se határidő, de audit=1 (az 1. pont else if ága futott le)
            kitoltesDiv.classList.add("figyelmeztetve");
        }

    } else {
        warmHtml = `<div class="warm" style="display: none;"></div>`;
    }
    kitoltesDiv.innerHTML = nameHtml + warning + modules + formattedText + warmHtml;    
    
    // Dataset beállítás
    kitoltesDiv.dataset.kitoltesId = kitoltes.idk;
    kitoltesDiv.setAttribute('data-role', kitoltes.role);
    kitoltesDiv.setAttribute('data-user', kitoltes.creator_name);
    kitoltesDiv.dataset.undo = kitoltes.vizsgalt_id;
    kitoltesDiv.appendChild(checkbox);
    kitoltesDiv.dataset.modulId = modulId;
    kitoltesDiv.dataset.auditId = kitoltes.audit || '0';

    const [periodus, megnev] = kitoltes.kitoltes_neve.split('-').map(s => s.replace(/~/g, '-').trim());
    kitoltesDiv.dataset.nev       = kitoltes.vizsgalt_nev; 
    kitoltesDiv.dataset.periodus  = periodus;
    kitoltesDiv.dataset.megnev    = megnev;

    // --- KATTINTÁS ESEMÉNY (SOR KIVÁLASZTÁSA) ---
    kitoltesDiv.addEventListener('click', async (event) => {
        if (event.target.closest('.modulebutt') || event.target.matches('input[type="checkbox"]')) return;
let floatingWarn = document.getElementById('floating-audit-warning');
        if (!floatingWarn) {
            floatingWarn = document.createElement('div');
            floatingWarn.id = 'floating-audit-warning';
            document.body.appendChild(floatingWarn);
        }

        const auditStatus = Number(kitoltes.audit);

        if (auditStatus === 1) {
            // 1. SZIGORÍTOTT VIZSGÁLAT ITT IS
            let hasMessage = false;
            if (kitoltes.warm) {
                let tisztaSzoveg = String(kitoltes.warm).trim();
                if (tisztaSzoveg !== '' && 
                    tisztaSzoveg !== 'null' && 
                    tisztaSzoveg !== 'undefined' &&
                    tisztaSzoveg !== '[]' && 
                    tisztaSzoveg !== '{}') {
                    hasMessage = true;
                }
            }
            let hasDeadline = !!kitoltes.hatarido;

            // 2. SZÖVEG MEGHATÁROZÁSA
            let warmText = '';
            if (hasMessage) {
                warmText = kitoltes.warm.trim();
            } else if (hasDeadline) {
                warmText = 'Ehhez az értékeléshez leadási határidő lett beállítva.';
            } else {
                warmText = 'Értékelését egy auditor vizsgálatra jelölte ki.';
            }
            
            // 3. HATÁRIDŐ MEGJELENÍTÉSE
            let hataridoHtml = '';
            if (hasDeadline) {
                const hDatum = new Date(kitoltes.hatarido);
                const ma = new Date();
                ma.setHours(0,0,0,0); hDatum.setHours(0,0,0,0);
                
                const diffDays = Math.ceil((hDatum.getTime() - ma.getTime()) / (1000 * 60 * 60 * 24));
                let napSzoveg = diffDays > 0 ? `(még ${diffDays} nap)` : (diffDays === 0 ? `(ma jár le!)` : `(lejárt ${Math.abs(diffDays)} napja)`);
                const formatDatum = hDatum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                
                hataridoHtml = `
                    <div class="f-warn-date" style="margin-top: 10px;">
                        <span class="material-symbols-outlined" style="font-size:1.2em; vertical-align: middle;">calendar_clock</span>
                        Határidő: ${formatDatum} <span style="color:white; font-weight:normal;">${napSzoveg}</span>
                    </div>
                `;
            }

            // 4. A LEBEGŐ ABLAK HTML TARTALMÁNAK ÖSSZEÁLLÍTÁSA
            floatingWarn.innerHTML = `
                <div class="f-warn-header">
                    <div class="title-area">
                        <span class="material-symbols-outlined">warning</span>
                        Értékelési információ
                    </div>
                    <span class="f-warn-close" onclick="document.getElementById('floating-audit-warning').style.display='none'">&times;</span>
                </div>
                <div class="f-warn-body">
                    ${warmText}
                    ${hataridoHtml}
                    <br><br>
                    <i>További információt a "Javaslatok" fülön talál a "Jóváhagyásra váró értékelések" közt.</i>
                </div>
            `;
            
            // Megjelenítjük
            floatingWarn.style.display = 'block';
        } else {
            // Ha nem 1-es az audit, biztosan elrejtjük
            floatingWarn.style.display = 'none';
        }
        // 1. Kijelölés vizuális kezelése
        document.querySelectorAll('.meglevok.kijelolt').forEach(el => el.classList.remove('kijelolt'));
        kitoltesDiv.classList.add('kijelolt');

        // 2. Infó kiírása
        const infoDiv = document.querySelector('#selection-info');
        if (infoDiv) {
            const nev = kitoltesDiv.dataset.nev || '';
            let nevHtml = nev;
            infoDiv.innerHTML = `
                <div>
                    ${nevHtml}
                </div>
                
            `;
        }

        const kitNevePara = document.getElementById('kitneve');
        if (kitNevePara) {
            // OPCIÓ 1: Ha csak a vizsgált személy nevét akarod kiírni:
            // kitNevePara.textContent = kitoltes.vizsgalt_nev; 

            // OPCIÓ 2: Ha a teljes "Értékelés Címét" (Időszak - Megnevezés) akarod formázva:
            const formazottCim = (kitoltes.kitoltes_neve || '').replace(/-/g, ' - ');
            kitNevePara.innerHTML = `<strong>${kitoltes.vizsgalt_nev}</strong>: ${formazottCim}`;
        }
        // 3. Gombok áthelyezése
        const modulesDiv = kitoltesDiv.querySelector('.modules');
        const targetContainer = document.querySelector('#moved-buttons-container');

        if (modulesDiv && targetContainer) {
            if (targetContainer.children.length > 0) {
                const oldModules = targetContainer.firstElementChild;
                if (oldModules._originalParent) {
                    oldModules._originalParent.appendChild(oldModules);
                    oldModules.style.display = 'none'; 
                    oldModules.style.position = ''; 
                }
            }
            modulesDiv._originalParent = kitoltesDiv;
            modulesDiv._originalRow = kitoltesDiv;
            targetContainer.appendChild(modulesDiv);

            modulesDiv.style.display = 'grid';    
            modulesDiv.style.opacity = '1';
        }

        // UI Reset
        const maininf = document.getElementById('maininf');
        const gyiik = document.getElementById('gyik');
        const osszesitett = document.getElementById('osszesitett');
        if(grap) grap.classList.add("aktiv");
        if(sta) sta.classList.remove("aktiv");
        if(gyik) gyik.classList.remove("aktiv");
        if(maininf) maininf.style.display = 'flex';
        if(gyiik) gyiik.style.display="none"
        if(osszesitett) osszesitett.style.display = 'none';
        if(felbukkano2) felbukkano2.style.display="none";
        if(felbukkano4) felbukkano4.style.display="none";

        resetSzemleView();

        const kitoltesId = kitoltesDiv.dataset.kitoltesId;
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("kitoltes_id", kitoltesId);
        newParams.set("megtekintes", "true");
        history.replaceState(null, "", `${location.pathname}?${newParams.toString()}`);

        resetKitoltesCache();
        await KategoriaKezelo.loadValaszok();
        KategoriaKezelo.frissitErtekelesekContainer();

        const aktualisSzazalekJSON = window.ertekelesJSON;
        const aktualisKitoltesId = kitoltesDiv.dataset.kitoltesId;
        if (aktualisSzazalekJSON && aktualisKitoltesId) {
            fetch('/api/save-szazalek-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kitoltesId: aktualisKitoltesId, szazalek: aktualisSzazalekJSON })
            }).catch(err => { console.error('Mentési hiba:', err); });
        }

        const keszulo = document.getElementById("keszulo");
        if (keszulo) {
            keszulo.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    if (isElemzo) {
        const temaContainer = document.createElement('div');
        temaContainer.className = 'elemzo-tema-container';
        temaContainer.style.display = 'flex';
        temaContainer.style.flexWrap = 'wrap';
        temaContainer.style.gap = '6px';
        temaContainer.style.marginTop = '10px';
        temaContainer.style.width = '100%';
        kitoltesDiv.appendChild(temaContainer);

        // Lekérjük a százalékokat specifikusan ehhez az értékeléshez
        fetch(`/api/get-kitoltes-szazalek?kitoltes_id=${kitoltes.idk}`)
            .then(res => res.json())
            .then(async data => {
                if (data.szazalek) {
                    const raw = typeof data.szazalek === 'string' ? JSON.parse(data.szazalek) : data.szazalek;
                    
                    const topLevel = {};
                    for (const [k, v] of Object.entries(raw || {})) {
                        if (v && typeof v === 'object' && typeof v['%'] === 'number') {
                            topLevel[k] = v['%'];
                        }
                    }

                    const { chartMap } = await loadColorMaps(modulId);
                    
                    let badgesHtml = '';
                    for (const [tema, pct] of Object.entries(topLevel)) {
                        const baseColor = chartMap[tema] || 'rgba(160,160,160,0.8)';
                        badgesHtml += `
                            <span class="szazalek" style="background: ${baseColor};">
                                ${tema}: ${pct}%
                            </span>`;
                    }
                    
                    if (badgesHtml) {
                        temaContainer.innerHTML = badgesHtml;
                    }
                }
            })
            .catch(err => console.error(`Hiba a témakörök betöltésekor (${kitoltes.idk}):`, err));
    }
    tartaly.appendChild(kitoltesDiv);


    
    (groupByCreator ? currentList : innerDiv).appendChild(tartaly);
  }); // items.forEach VÉGE

  // --- HIÁNYZÓ AUDIT ELLENŐRZÉS ---
  if (auditData.success && auditData.kitoltesek.length > 0) {
      showMissingChecklist(auditData.kitoltesek)
          .then(confirmedVizsgaltIds => {
              return fetch('/api/audit-confirm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: userId, vizsgalt_ids: confirmedVizsgaltIds })
              });
          })
          .then(res => res.json())
          .then(data => {
              if (data.success) {
                  showAlert(`${data.inserted} audit bejegyzés rögzítve.`);
              } else {
                  showAlert('Audit mentés hiba: ' + data.message);
              }
          })
          .catch(err => {
              console.error('Audit-confirm hiba:', err);
              showAlert('Audit mentési hiba történt.');
          });
  }
  
  // 1. Folytatás gomb
  document.querySelectorAll('.modulebutt.fo_edit').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation(); 
            let kitoltesDiv = event.target.closest('.meglevok');
            if (!kitoltesDiv) {
                 const wrapper = event.target.closest('.modules');
                 if (wrapper && wrapper._originalRow) kitoltesDiv = wrapper._originalRow;
            }

            if (kitoltesDiv) {
                const kitoltesId = button.dataset.id || kitoltesDiv.dataset.kitoltesId;
                const newUrl = `./ertekelo.html?kitoltes_id=${kitoltesId}&letrehozva=${encodeURIComponent(letrehozva)}`;
                window.location.href = newUrl;
            } else {
                console.error("Nem található a kitöltés ID a gombhoz.");
            }
        });
  });

  // 2. Init Egyéb modulok (Update, Delete)
  initFrissites({ userId, letrehozva });
  initTorol();

  // 3. Általános funkciógombok (Share, Print, PDF, Duplicate, AI)
  document.querySelectorAll('.modulebutt[data-action]').forEach(btnDiv => {
      btnDiv.addEventListener('click', async (e) => {
          e.stopPropagation();
          
          let meglevok = e.target.closest('.meglevok'); 
          if (!meglevok) {
              const wrapper = e.target.closest('.modules');
              if (wrapper && wrapper._originalRow) meglevok = wrapper._originalRow;
          }

          const action = btnDiv.dataset.action;
          const kitoltesId = btnDiv.dataset.id;
          const kitoltesNev = btnDiv.dataset.name;

          // Action logika
          const newParams = new URLSearchParams(window.location.search);
          newParams.set("kitoltes_id", kitoltesId);
          newParams.set("megtekintes", "true");
          history.replaceState(null, "", `${location.pathname}?${newParams.toString()}`);

          resetSzemleView();
          resetKitoltesCache();
          await KategoriaKezelo.loadValaszok();
          KategoriaKezelo.frissitErtekelesekContainer();

         if (action === "share") {
              // Adatok összegyűjtése a sorból (meglevok)
              const vizsgaltId = meglevok.dataset.undo;
              const modulId = meglevok.dataset.modulId;

              // Meghívjuk a függvényt AZONNAL, nem csak beállítjuk
              initMegosztas(kitoltesId, kitoltesNev, modulId, vizsgaltId, { fullname, intezmeny_id });
          }
         else if (action === "duplicate") {
              
              // 1. Adatok kiolvasása a sorból (dataset)
              const sor = document.querySelector(`.meglevok[data-kitoltes-id="${kitoltesId}"]`);
              const currNev = sor.dataset.nev;      // Pl: Gipsz Jakab
              const currIdoszak = sor.dataset.periodus; // Pl: 2023/24
              const currTipus = sor.dataset.megnev;     // Pl: Év végi

              // 2. Az ÚJ custom ablak meghívása (await - megvárjuk míg kitölti)
              const result = await customPrompt3(
                  "Értékelés másolása", 
                 `${currNev} - másolat`,
                  currIdoszak, 
                  currTipus
              );

              // Ha a felhasználó Mégsem-re nyomott, a result null lesz
              if (!result) return; 

              // 3. Összerakjuk az adatokat
              // A backend valószínűleg a 'ujNev' mezőben várja a "Időszak-Típus" kombinációt (kitoltes_neve)
              const ujKitoltesNeve = `${result.idoszak}-${result.tipus}`;

              fetch('/api/duplicate-kitoltes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      originalIdk: kitoltesId, 
                      ujNev: ujKitoltesNeve, // Ez lesz a kitoltes_neve
                      ujVizsgaltNev: result.nev, // Elküldjük ezt is, hátha a backend kezeli (vagy később fogja)
                      userId: userId 
                  })
              })
              .then(r => r.json())
              .then(data => {
                  if (data.success) {
                      showAlert('Sikeres duplikálás!');
                      
                      // Lista frissítése reload nélkül
                      if (typeof window.frissitKitoltesek === 'function') {
                          window.frissitKitoltesek(); 
                      } else {
                          setTimeout(() => window.location.reload(), 1000);
                      }
                  } else {
                      showAlert('Hiba történt a duplikálás során: ' + data.message);
                  }
              })
              .catch(err => { 
                  console.error(err);
                  showAlert('Szerver hiba történt.'); 
              });
          }
          else if (action === "print") {
              generatePdfMakePDF(true,  meglevok);
          }
          else if (action === "picture_as_pdf") {
              generatePdfMakePDF(false, meglevok);
          }
          else if (action === "generate_ai") {
              await triggerIndividualAiAnalysis(e.target);
          }
          else if (action === "date") {
              // Adatok kinyerése a megjelenítéshez
              const currNev = meglevok.dataset.nev || 'Ismeretlen';
              const currIdoszak = meglevok.dataset.periodus || '';
              const currTipus = meglevok.dataset.megnev || '';
              const teljesNev = `${currNev} (${currIdoszak} - ${currTipus})`;

              // 1. Dátum bekérése a naptáras ablakkal
              const valasztottDatum = await customDatePrompt(teljesNev);
              
              if (!valasztottDatum) return; // Ha a Mégsemre nyomott

              // 2. Megerősítő ablak
              const confirmMsg = `Biztos, hogy beállítja a(z) <b>${valasztottDatum}</b> határidőt a(z) <b>${teljesNev}</b> értékeléshez?<br><br><span style="font-size:0.85em; color:gray;">Az értékelő kollégát erről e-mailben értesítjük.</span>`;
              const megerosites = await customConfirm(confirmMsg);

              if (!megerosites) return; // Ha a Mégsemre nyomott

              // 3. Backend hívás
              try {
                  const response = await fetch('/api/set-audit-deadline', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          audit_id: kitoltesId,           // Az értékelés idk-ja
                          user_audit: userId,             // A te ID-d (aki auditál)
                          audit_modul_id: modulId,        // Aktuális modul
                          audit_int_id: intezmeny_id,     // Intézményed
                          hatarido: valasztottDatum       // A kiválasztott dátum
                      })
                  });
                  
              // ... a megerősítő ablak és a fetch hívás után ...
                const data = await response.json();
                  
                if (data.success) {
                    showAlert('Határidő sikeresen beállítva!');
                    
                    // --- 1. PONT: AZONNALI VIZUÁLIS FRISSÍTÉS A JELENLEGI KÁRTYÁN ---
                    meglevok.classList.add("hatarido");
                    meglevok.dataset.auditId = "1"; // Frissítjük az audit státuszt a kártyán

                    // Dátum formázása a buborékhoz (hogy azonnal látszódjon újratöltés nélkül is)
                    const hDatum = new Date(valasztottDatum);
                    const formatDatum = hDatum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                    
                    let warmDiv = meglevok.querySelector('.warm');
                    if (warmDiv) {
                        warmDiv.style.display = 'flex';
                        warmDiv.classList.add('warm-item');
                        warmDiv.innerHTML = `
                            <span class="warmnote">Határidő lett beállítva ehhez az értékeléshez:<br>
                            <span style="color: #ffbd16;">Határidő:</span> ${formatDatum}</span>
                            <span class="material-symbols-outlined warm-icon" style="margin-left: 4px;">calendar_clock</span>
                        `;
                    }

                    // --- 2. PONT: AUDIT LISTA BIZTONSÁGOS FRISSÍTÉSE ---
                    // Meghívjuk a dashMain.js-ben definiált globális frissítőt.
                    // Adunk neki 1,5 másodperc késleltetést, hogy a felhasználó 
                    // lássa az imént besárgult kártyát, mielőtt a lista újrarendeződik.
                    if (typeof window.frissitKitoltesek === 'function') {
                        setTimeout(() => {
                            window.frissitKitoltesek();
                        }, 1500);
                    }
                } else {
                    showAlert('Hiba történt: ' + data.message);
                }
              } catch (error) {
                  console.error('Fetch hiba:', error);
                  showAlert('Szerver hiba történt a határidő mentése során.');
              }
          }
      });
  });

  initSzuro();
  initSearch();
}
// UPDATE
export function initFrissites({ userId, letrehozva }) {
  const editButtons   = document.querySelectorAll(".modulebutt.edit"); 
  const kilep3        = document.querySelector("#kilep3");
  const felbukkano3   = document.querySelector("#felbukkano3");
  const ujinek2       = document.querySelector("#ujinek2");
  const neve2         = document.querySelector("#neve2");
  const idszak2       = document.querySelector("#idoszak2");
  const megnevezes2   = document.querySelector("#megnevezes2");
  const go2           = document.querySelector("#gobut2");

  editButtons.forEach(btn => {
    btn.addEventListener('click', (event) => {
      let kitDiv = event.target.closest('.meglevok');
      if (!kitDiv) {
         const wrapper = event.target.closest('.modules');
         if (wrapper && wrapper._originalRow) kitDiv = wrapper._originalRow;
      }
      if (!kitDiv) return;

      felbukkano3.style.display = 'flex';
      if (felbukkano4) felbukkano4.style.display = 'none';      
      if (felbukkano2) felbukkano2.style.display = 'none';
      setTimeout(() => { felbukkano3.style.opacity = '1'; felbukkano3.style.scale = '1'; }, 100);
      ujinek2.style.display = 'flex';
      setTimeout(() => { ujinek2.style.opacity = '1'; ujinek2.style.scale = '1'; }, 50);

      const vizsgaltNev = kitDiv.dataset.nev || '';
      const periodus    = kitDiv.dataset.periodus|| '';
      const megnev      = kitDiv.dataset.megnev  || '';
      const kitoltesId  = kitDiv.dataset.kitoltesId;

      neve2.value       = vizsgaltNev;
      idszak2.value     = periodus;
      megnevezes2.value = megnev;

      eredetIdTomb.push(kitoltesId);
      eredetiErtekekTomb.push(`${periodus}-${megnev}`);
    });
  });

  if (kilep3 && !kilep3.__bound) {
      kilep3.__bound = true;
      kilep3.addEventListener("click", () => {
        felbukkano3.style.scale   = "0";
        felbukkano3.style.opacity = "0";
        setTimeout(() => { felbukkano3.style.display = "none"; }, 400);
      });
  }

  if (go2 && !go2.__bound) {
      go2.__bound = true;
      go2.addEventListener("click", event => {
        event.preventDefault();
        const ujPeriodus = idszak2.value.trim();
        const ujMegnev   = megnevezes2.value.trim();
        const [eredetiNeve2, eredetiKitNev, eredetiLetrehoz] = eredetiErtekekTomb;

        if (!neve2.value || !ujPeriodus || !ujMegnev) { showAlert('Az egyik mező üres'); return; }

        const ujKitNev = `${ujPeriodus.replace(/-/g, "~")}-${ujMegnev.replace(/-/g, "~")}`;
        const kitoltesId = eredetIdTomb.at(-1);
        const adat = { id: kitoltesId, letrehozva: letrehozva, kitoltes_neve: ujKitNev, vizsgalt_nev: neve2.value };
        
        fetch('/api/update-kitoltes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adat)})
          .then(r => r.json())
        .then(data => {
            if (!data.success) { showAlert("Hiba: " + data.message); return; }

            // 1. Megkeressük a módosított sort a DOM-ban
            const row = document.querySelector(`.meglevok[data-kitoltes-id="${kitoltesId}"]`);

            if (row) {
                // --- A) SOR ADATOK FRISSÍTÉSE (DATASET) ---
                // Ez kell, hogy ha legközelebb megnyitod szerkesztésre, az újat lásd
                row.dataset.nev = neve2.value;
                row.dataset.periodus = ujPeriodus;
                row.dataset.megnev = ujMegnev;

                // --- B) NÉV MEGJELENÍTÉSÉNEK FRISSÍTÉSE ---
                const nameContainer = row.querySelector('.vizsgalt-nev strong');
                if (nameContainer) {
                    nameContainer.textContent = neve2.value;
                }

                // --- C) A SZÖVEG CSERÉJE (Időszak - Megnevezés) ---
                // Takarítunk a név és a checkbox között
                const nameDiv = row.querySelector('.vizsgalt-nev');
                const checkbox = row.querySelector('.cheking');

                if (nameDiv && checkbox) {
                    let currentNode = nameDiv.nextSibling;
                    while (currentNode && currentNode !== checkbox) {
                        const nextNode = currentNode.nextSibling;
                        const isElement = currentNode.nodeType === 1; 
                        
                        // Fontos: a .modules-t (gombokat) és a figyelmeztetést NE töröljük!
                        const isModules = isElement && currentNode.classList.contains('modules');
                        const isWarning = isElement && currentNode.classList.contains('savdiv'); 

                        if (!isModules && !isWarning) {
                            currentNode.remove();
                        }
                        currentNode = nextNode;
                    }

                    // Beszúrjuk az új szöveget
                    const ujSzovegHTML = `${ujPeriodus} - <br>${ujMegnev}`;
                    checkbox.insertAdjacentHTML('beforebegin', ujSzovegHTML);
                }

                // --- D) FŐCÍM FRISSÍTÉSE (Ha épp ez van megnyitva) ---
                if (row.classList.contains('kijelolt')) {
                    const kitNevePara = document.getElementById('kitneve');
                    if (kitNevePara) {
                        const ujTeljesCim = `${ujPeriodus} - ${ujMegnev}`;
                        kitNevePara.innerHTML = `<strong>${neve2.value}</strong>: ${ujTeljesCim}`;
                    }
                }

                // --- E) GOMBOK FRISSÍTÉSE (A kulcs a "data-name" cseréje!) ---
                // 1. Megpróbáljuk megkeresni a gombokat a soron belül
                let modulesDiv = row.querySelector('.modules');
                
                // 2. Ha nincs a sorban (mert ki van jelölve), akkor a fenti tárolóban keressük
                if (!modulesDiv && row.classList.contains('kijelolt')) {
                     modulesDiv = document.querySelector('#moved-buttons-container .modules');
                }
                
                // 3. Ha megvan a gombok tárolója, minden gombot frissítünk benne
                if (modulesDiv) {
                    // Az ujKitNev változót már kiszámoltad feljebb a kódban
                    // (Ez a teljes név: "Időszak~Megnevezés" formátumban vagy ahogy a backend várja)
                    // A gomboknak a megjelenítendő nevet szoktuk adni, vagy a formátumozottat.
                    // A te kódodban: const ujKitNev = `${ujPeriodus...}-${ujMegnev...}`; 
                    
                    modulesDiv.querySelectorAll('[data-name]').forEach(btn => {
                        btn.setAttribute('data-name', ujKitNev); 
                        // Mostantól a "Másolás" és a "Megosztás" is az új nevet látja!
                    });
                }
            }

            showAlert('Sikeres frissítés!');
            felbukkano3.style.display = 'none'; // Ablak bezárása
          })
          .catch(err => console.error("Fetch hiba:", err));
      });
  }
}
// DELETE
export function initTorol() {
    const deletedButtons = document.querySelectorAll(".modulebutt.deleted"); 
    deletedButtons.forEach(deleted => {
        // ASYNC kulcsszó hozzáadva a függvény elejéhez!
        deleted.addEventListener('click', async function(event) {
            const wrapper = deleted.closest('.modules');
            let target = deleted.closest('.meglevok');
            
            if(!target && wrapper && wrapper._originalRow) {
                target = wrapper._originalRow;
            }

            const kitoltesId = deleted.dataset.id;
            const isMoved = wrapper && wrapper.parentElement && wrapper.parentElement.id === 'moved-buttons-container';

            // --- ITT AZ ÚJ RÉSZ ---
            // A natív confirm helyett a saját customConfirm-et hívjuk await-tel
            const megerosites = await customConfirm("Biztosan törölni szeretné ezt a kitöltést?");
            
            if (!megerosites) return; // Ha a "Mégsem"-re nyomott, kilépünk
            
            fetch('/api/delete-kitoltes', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id: kitoltesId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) { 
                    showAlert('Sikeres törlés'); 
                    
                    if (isMoved) {
                         resetSzemleView();
                         const maininf = document.getElementById('maininf');
                         const gyikPanel = document.getElementById('gyik');
                         const selectionInfo = document.querySelector('#selection-info');
                         
                         if (maininf) maininf.style.display = 'none';
                         if (gyikPanel) gyikPanel.style.display = 'block';

                         const grap = document.querySelector(".grap");
                         const sta = document.querySelector(".sta");
                         const gyikTab = document.querySelector(".gyik");

                         if (grap) grap.classList.remove("aktiv");
                         if (sta) sta.classList.remove("aktiv");
                         if (gyikTab) gyikTab.classList.add("aktiv");
                         
                         if (selectionInfo) selectionInfo.innerHTML = '';
                    }

                    if (target) target.remove();
                    if (wrapper) wrapper.remove();
                } 
                else { 
                    console.error('Hiba történt a törlés során:', data.message); 
                }
            })
            .catch(error => { console.error('Fetch hiba:', error); });
        });
    });
}
