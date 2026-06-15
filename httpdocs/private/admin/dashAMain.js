// Admin teendők js fájl. - Fő dashboard (Fiókom, A.I., Sablonok, Statisztika)
import { loadInfoAndInit } from '../info/infoLoader.js'; 
import { initAside } from '../user/dashAside.js';
import { InlineQuestionCreator } from './upload/category_creator.js';
import { QuestionInsertWizard } from './upload/question_insert_wizard.js';
import { showAlert } from "/both/alert.js";

function ensureSablonBuilderCss() {
  if (document.querySelector('link[data-sablon-builder-css]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./sablonBuilder.css?v=20260605-2', import.meta.url).href;
  link.dataset.sablonBuilderCss = 'true';
  document.head.appendChild(link);
}

ensureSablonBuilderCss();
initAside();

function parseStaticMarkup(markup) {
  const doc = new DOMParser().parseFromString(String(markup || ''), 'text/html');
  return Array.from(doc.body.childNodes).map(node => document.importNode(node, true));
}

function replaceWithStaticMarkup(parent, markup) {
  if (!parent) return;
  parent.replaceChildren(...parseStaticMarkup(markup));
}

function appendStaticMarkup(parent, markup) {
  if (!parent) return;
  parent.append(...parseStaticMarkup(markup));
}

function createTextElement(tagName, className, text) {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  el.textContent = text ?? '';
  return el;
}

function createSablonSaveModal({ alapNev = '', ag = '', mentendoAdatok = [], onSaved = null } = {}) {
  const modal = document.createElement('div');
  modal.className = 'color-picker-overlay';
  modal.style.zIndex = '9999';

  const box = document.createElement('div');
  box.className = 'color-picker-modal';
  box.style.cssText = 'width:550px; max-height:85vh; overflow-y:auto; background: white; padding: 25px; border-radius: 12px;';

  const title = document.createElement('h3');
  title.style.cssText = 'color: black; margin-top:0;';
  title.textContent = 'Sablon mentése';
  box.appendChild(title);

  const inputContainer = document.createElement('div');
  inputContainer.className = 'color-picker-input-container';

  const label = document.createElement('label');
  label.style.cssText = 'color: gray; font-size: 0.85em;';
  label.textContent = 'Sablon neve:';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'modal-sablon-nev';
  nameInput.value = alapNev || '';
  nameInput.style.cssText = 'width:100%; padding:12px; margin-top:5px; color: black; border: 1px solid #ccc; border-radius: 6px;';

  inputContainer.append(label, nameInput);
  box.appendChild(inputContainer);

  const summaryBlock = document.createElement('div');
  summaryBlock.style.marginTop = '10px';

  const branch = document.createElement('p');
  branch.style.cssText = 'color: black; font-weight: bold; border-bottom: 2px solid #ff6500; padding-bottom: 5px;';
  const igenDb = mentendoAdatok.filter(elem => elem.ag === 'igen').length;
  const nemDb = mentendoAdatok.filter(elem => elem.ag === 'nem').length;
  branch.textContent = ag === 'vegyes'
    ? `Sablon tartalma: IGEN ág ${igenDb} elem, NEM ág ${nemDb} elem`
    : `Választott ág: ${String(ag || '').toUpperCase()}`;

  const list = document.createElement('ul');
  list.style.cssText = 'padding-left:0; list-style:none; max-height: 250px; overflow-y: auto;';

  mentendoAdatok.forEach((elem, index) => {
    const item = document.createElement('li');
    item.style.cssText = 'margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px; color: black; text-align: left;';
    const agLabel = elem.ag === 'nem' ? 'NEM' : 'IGEN';
    item.appendChild(document.createTextNode(`${index + 1}. [${agLabel}] ${elem.szoveg || ''} - `));

    const prop = document.createElement('b');
    prop.textContent = elem.opcio ? 'opció' : (elem.szoveges ? 'szöveges' : `${elem.ertek ?? 0} pont`);
    item.appendChild(prop);

    list.appendChild(item);
  });

  summaryBlock.append(branch, list);
  box.appendChild(summaryBlock);

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'color-picker-btn-container';
  buttonContainer.style.cssText = 'margin-top:25px; display: flex; gap: 10px;';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'color-picker-btn-cancel';
  cancelButton.id = 'modal-megse';
  cancelButton.style.flex = '1';
  cancelButton.textContent = 'Vissza';

  const saveButton = document.createElement('button');
  saveButton.className = 'color-picker-btn-save';
  saveButton.id = 'modal-mentes';
  saveButton.style.flex = '1';
  saveButton.textContent = 'Mentés';

  buttonContainer.append(cancelButton, saveButton);
  box.appendChild(buttonContainer);
  modal.appendChild(box);

  cancelButton.onclick = () => modal.remove();
  saveButton.onclick = async () => {
    const nev = nameInput.value.trim();

    if (!nev) {
      nameInput.style.border = '2px solid red';
      mutassFigyelmeztetest('Kérlek, adj meg egy nevet a sablonnak!');
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Mentés folyamatban...';

    const payload = {
      modulId: userState.modulId,
      userId: userState.userId,
      sablonNev: nev,
      elemek: mentendoAdatok
    };

    try {
      const res = await fetch('/api/ment-sablonok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Hiba történt');

      const data = await res.json();
      if (data.success) {
        alert('✓ Sablon sikeresen elmentve!');
        modal.remove();
        if (typeof onSaved === 'function') {
          await onSaved(data, nev);
        } else {
          await frissitSablonSzerkeszto({ activeTab: 'meglevo' });
        }
      } else {
        throw new Error(data.message || 'A mentés sikertelen.');
      }
    } catch (err) {
      alert('Hiba: ' + err.message);
      saveButton.disabled = false;
      saveButton.textContent = 'Mentés';
    }
  };

  return modal;
}


document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('joglecsuk');
  if (!box) return console.warn('#joglecsuk nem található');

  // megjegyezzük a doboz tényleges magasságát (egyszer)
  const fullHeight = box.scrollHeight + 'px';
  box.style.minHeight = '40px';
  box.style.maxHeight = fullHeight;

  // kattintásra váltunk
  box.addEventListener('click', () => {
    box.classList.toggle('closed');
    box.style.maxHeight = box.classList.contains('closed') ? '40px' : fullHeight;
  });
});

// User adatok tárolása
const userState = {
  modulId:       null,
  modulNev:      null,
  modulLeiras:   null,
  userId:        null,
  userName:      null,
  fullname:      null,
  intezmeny_id:  null,
  intezmeny_nev: null
};

// --- FELHASZNÁLÓ BETÖLTÉSE ---
const userLoaded = (async () => {
  try {
    const res  = await fetch('/get-username');
    const data = await res.json();
    if (!data.success) {
      window.location.href = '/login.html';
      return;
    }

    // Feltöltjük a state-et
    Object.assign(userState, {
      userId:        data.id,
      fullname:      data.vez,
      userName:      data.username,
      modulId:       data.modulId,
      modulNev:      data.modulNev,
      modulLeiras:   data.modulLeiras,
      intezmeny_id:  data.int_id,
      intezmeny_nev: data.intnev
    });

    const sajtnevElem = document.querySelector('#sajatnev');
    if (sajtnevElem) sajtnevElem.textContent = `\u00A0${data.username || ''}`;

    const holvagyElem = document.querySelector('.holvagyok');
    if (holvagyElem) holvagyElem.textContent = data.modulLeiras || '';

    return userState;
  } catch (err) {
    console.error('Felhasználó betöltése sikertelen:', err);
    throw err;
  }
})();

loadInfoAndInit();

// Alapadatok beállítása betöltés után
userLoaded.then(() => {
    if (userState.modulNev === 'admin') {
      const gomb = document.getElementById('generateSzazalekBtn');
      if (gomb) gomb.style.display = 'block';
    }
}).catch(() => {});
 
// Opcionális: Ha még mindig itt van az újraszámolás gomb
const ujraszamolasGomb = document.getElementById('ujraszamolas-gomb');
if (ujraszamolasGomb) {
    ujraszamolasGomb.addEventListener('click', () => {
        fetch('/api/frissit-minden-ossz-ertek', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            const eredmenyEl = document.getElementById('ujraszamolas-eredmeny');
            if (eredmenyEl) eredmenyEl.innerText = data.message || 'Sikeres frissítés.';
        })
        .catch(err => console.error(err));
    });
}

// --- ÚJ FÜLEK (GOMBOK) LOGIKÁJA ---
const savosContainer = document.querySelector('.savos');

if (savosContainer) {
    savosContainer.addEventListener('click', (e) => {
        const gomb = e.target.closest('.gomb');
        if (!gomb) return; // Ha nem gombon kattintott, kilépünk

        // 1. Eltávolítjuk az "aktív" osztályt az összes gombról
        document.querySelectorAll('.savos .gomb').forEach(btn => btn.classList.remove('aktiv'));
        
        // 2. Rátesszük az aktív osztályt a kattintott gombra
        gomb.classList.add('aktiv');

        // 3. Megnézzük a gomb feliratát
        const gombNev = gomb.querySelector('.cim').textContent.trim();

        const divFiokom = document.getElementById('tartalom-fiokom');
        const divAi = document.getElementById('tartalom-ai');
        const divSablonok = document.getElementById('tartalom-sablonok');
        const divStatisztika = document.getElementById('tartalom-statisztika');

        // Minden konténer elrejtése
        if(divFiokom) divFiokom.style.display = 'none';
        if(divAi) divAi.style.display = 'none';
        if(divSablonok) divSablonok.style.display = 'none';
        if(divStatisztika) divStatisztika.style.display = 'none';

        // Csak azt mutatjuk, amelyikre kattintott
        if (gombNev === 'Fiókom' && divFiokom) {
            divFiokom.style.display = 'block';
        } 
        else if (gombNev === 'A.I.' && divAi) {
            replaceWithStaticMarkup(divAi, templates.plussz.main()); 
            divAi.style.display = 'block';
            setTimeout(initAiBeallitasok, 50); // Eredeti logika meghívása
        }
        else if (gombNev === 'Sablonok' && divSablonok) {
            // Frissítjük a Sablonok fül tartalmát a template-ből
            replaceWithStaticMarkup(divSablonok, templates.sabik.main()); 
            divSablonok.style.display = 'block';
            
            // Meghívjuk a szerkesztőt és a megjelenítőt
            frissitSablonSzerkeszto(); 
            megjelenitMentettSablonok();
        } 
        else if (gombNev === 'Statisztika' && divStatisztika) {
            divStatisztika.style.display = 'block';
        }
    });
}


function confirmAiEnableModal() {
    return new Promise(resolve => {
        const old = document.getElementById('ai-enable-confirm-overlay');
        if (old) old.remove();

        const html = `
            <div id="ai-enable-confirm-overlay" style="
                position:fixed; inset:0; z-index:10000;
                background:rgba(0,0,0,.55);
                display:flex; align-items:center; justify-content:center;
                padding:20px;
            ">
                <div style="
                    width:min(720px, 96vw);
                    background:#fff;
                    border-radius:16px;
                    box-shadow:0 18px 60px rgba(0,0,0,.35);
                    overflow:hidden;
                    font-family:system-ui, sans-serif;
                ">
                    <div style="padding:20px 24px; background:#fff3e0; border-bottom:1px solid #ffcc80;">
                        <h2 style="margin:0;color:#333;">MI-funkció engedélyezése</h2>
                    </div>

                    <div style="padding:22px 24px; line-height:1.6; color:#333;">
                        <p>
                            Bekapcsolás esetén a rendszer név és közvetlen azonosító nélkül,
                            kizárólag a kérdőívből származó strukturált szakmai adatokat továbbít
                            külső MI-szolgáltató felé szövegezési segítség céljából.
                        </p>

                        <p>
                            Szabad szöveges megjegyzések nem kerülnek továbbításra.
                            Az MI által generált szöveg nem minősül szakvéleménynek,
                            annak ellenőrzése és felhasználása az intézményi felhasználó felelőssége.
                        </p>

                        <label style="
                            display:flex; gap:10px; align-items:flex-start;
                            margin-top:18px; padding:14px;
                            border:1px solid #ddd; border-radius:10px;
                            background:#fafafa;
                        ">
                            <input id="ai-enable-confirm-checkbox" type="checkbox">
                            <span>
                                Megértettem és intézményi jogosultságom alapján engedélyezem
                                az MI-alapú szövegezési segédfunkció használatát.
                            </span>
                        </label>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:10px; padding:16px 24px; border-top:1px solid #eee;">
                        <button id="ai-enable-cancel" class="modulebutt">Mégsem</button>
                        <button id="ai-enable-accept" class="modulebutt" disabled style="opacity:.5;">Megértettem és engedélyezem</button>
                    </div>
                </div>
            </div>
        `;

        document.body.append(...parseStaticMarkup(html));

        const overlay = document.getElementById('ai-enable-confirm-overlay');
        const checkbox = document.getElementById('ai-enable-confirm-checkbox');
        const accept = document.getElementById('ai-enable-accept');
        const cancel = document.getElementById('ai-enable-cancel');

        checkbox.addEventListener('change', () => {
            accept.disabled = !checkbox.checked;
            accept.style.opacity = checkbox.checked ? '1' : '.5';
        });

        cancel.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });

        accept.addEventListener('click', () => {
            if (!checkbox.checked) return;
            overlay.remove();
            resolve(true);
        });
    });
}
// --- AI BEÁLLÍTÁSOK DINAMIKUS BETÖLTÉSE ÉS ESEMÉNYKEZELÉSE ---
export async function initAiBeallitasok() {
    const aiSwitch = document.getElementById('ai-enabled-switch');
const aiSwitchStatusText = document.getElementById('ai-switch-status-text');
const aiDisabledInfo = document.getElementById('ai-disabled-info');
    const aiContainer = document.getElementById('ai-beallitasok-container');
    if (!aiContainer || !userState.modulId) return;

    const radioRovid = document.querySelector('input[name="kontextus-tipus"][value="rovid"]');
    const radioHosszu = document.querySelector('input[name="kontextus-tipus"][value="hosszu"]');
    const divRovid = document.getElementById('kontextus-rovid-div');
    const divHosszu = document.getElementById('kontextus-hosszu-div');
function setAiFieldsEnabled(enabled) {
    document.querySelectorAll('.edit-ai-field').forEach(btn => {
        btn.style.opacity = enabled ? '' : '0.35';
        btn.style.pointerEvents = enabled ? '' : 'none';
    });

    const mentGomb = document.getElementById('ai-mentes-gomb');
    if (mentGomb) {
        mentGomb.disabled = !enabled;
        mentGomb.style.opacity = enabled ? '' : '0.45';
        mentGomb.style.pointerEvents = enabled ? '' : 'none';
    }

    const aiContainer = document.getElementById('ai-beallitasok-container');
    if (aiContainer) {
        aiContainer.classList.toggle('ai-disabled', !enabled);
    }
}

function applyAiSwitchUi(enabled) {
    if (aiSwitch) aiSwitch.checked = enabled;

    if (aiSwitchStatusText) {
        aiSwitchStatusText.textContent = enabled
            ? 'Az MI-funkció engedélyezve van. A beállítások szerkeszthetők.'
            : 'Az MI-funkció nincs engedélyezve. A beállítások nem aktívak.';
    }

    if (aiDisabledInfo) {
        aiDisabledInfo.style.display = enabled ? 'none' : 'block';
    }

    setAiFieldsEnabled(enabled);
}
async function loadAiSwitchStatus() {
    if (!userState.modulId) return;

    try {
        const res = await fetch(`/api/intezmeny-ai-status?modulId=${userState.modulId}`);
        const data = await res.json();

        if (!data.success) {
            applyAiSwitchUi(false);
            if (aiSwitchStatusText) aiSwitchStatusText.textContent = data.message || 'Az MI állapota nem kérdezhető le.';
            return;
        }

        applyAiSwitchUi(data.aiEnabled === true);
    } catch (err) {
        console.error('AI státusz betöltési hiba:', err);
        applyAiSwitchUi(false);
        if (aiSwitchStatusText) aiSwitchStatusText.textContent = 'Az MI állapota nem kérdezhető le.';
    }
}
    const toggleKontextusView = () => {
        if (radioRovid.checked) {
            divRovid.style.display = 'block';
            divHosszu.style.display = 'none';
        } else {
            divRovid.style.display = 'none';
            divHosszu.style.display = 'block';
        }
    };
    
    if (radioRovid && radioHosszu) {
        radioRovid.addEventListener('change', toggleKontextusView);
        radioHosszu.addEventListener('change', toggleKontextusView);
    }

    try {
        const res = await fetch(`/api/ai-beallitasok?modulId=${userState.modulId}`);
        const data = await res.json();
        if (data.success && data.adatok) {
            const adatok = data.adatok;
            document.getElementById('ai-szerep').value = adatok.szerep || '';
            document.getElementById('ai-vizsgalt-targy').value = adatok.vizsgalt_targy || '';
            document.getElementById('ai-kontextus').value = adatok.ai_kontextus || '';
            document.getElementById('ai-szakmai-anyag').value = adatok.szakmai_anyag || '';
            document.getElementById('ai-prompt-jellemzes').value = adatok.prompt_jellemzes || '';
            document.getElementById('ai-prompt-fejlesztes').value = adatok.prompt_fejlesztes || '';
            document.getElementById('ai-prompt-ertekeles').value = adatok.prompt_ertekeles || '';
            document.getElementById('ai-cim-jellemzes').value = adatok.cim_jellemzes || 'Egyéni jellemzés';
            document.getElementById('ai-cim-fejlesztes').value = adatok.cim_fejlesztes || 'Fejlesztési terv';
            document.getElementById('ai-cim-ertekeles').value = adatok.cim_ertekeles || 'Értékelések (Eredményfókuszú)';

            if (adatok.van_szakmai_file || (adatok.szakmai_anyag && adatok.szakmai_anyag.trim() !== "")) {
                radioHosszu.checked = true;
            } else {
                radioRovid.checked = true;
            }
            toggleKontextusView();
        }
    } catch (e) { console.error("Betöltési hiba:", e); }

    const pencilSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ff6500"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>`;
    const saveSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#28a745"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`;
    const cancelSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#dc3545"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>`;

    const saveFieldData = async () => {
        const checkedRovid = document.querySelector('input[name="kontextus-tipus"][value="rovid"]').checked;
        const payload = {
           modulId: userState.modulId,
            szerep: document.getElementById('ai-szerep').value,
            vizsgalt_targy: document.getElementById('ai-vizsgalt-targy').value,
            ai_kontextus: checkedRovid ? document.getElementById('ai-kontextus').value : "",
            szakmai_anyag: !checkedRovid ? document.getElementById('ai-szakmai-anyag').value : "",
            
            cim_jellemzes: document.getElementById('ai-cim-jellemzes').value,
            prompt_jellemzes: document.getElementById('ai-prompt-jellemzes').value,
            
            cim_fejlesztes: document.getElementById('ai-cim-fejlesztes').value,
            prompt_fejlesztes: document.getElementById('ai-prompt-fejlesztes').value,
            
            cim_ertekeles: document.getElementById('ai-cim-ertekeles').value,
            prompt_ertekeles: document.getElementById('ai-prompt-ertekeles').value
        };

        try {
            const res = await fetch('/api/ai-beallitasok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (err) { return { success: false }; }
    };

    document.querySelectorAll('.edit-ai-field').forEach(container => {
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);
        replaceWithStaticMarkup(newContainer, pencilSvg);

        newContainer.addEventListener('click', function(e) {
            const targetId = this.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (!targetEl || !targetEl.disabled) return;

            targetEl.dataset.originalValue = targetEl.value;
            targetEl.disabled = false;
            targetEl.style.background = '#fff';
            targetEl.style.border = '1px solid #ff6500';
            targetEl.focus();

            this.replaceChildren();

            const inlineActions = document.createElement('div');
            inlineActions.style.cssText = 'display: flex; gap: 8px;';

            const saveSubBtn = document.createElement('div');
            saveSubBtn.className = 'save-sub-btn';
            saveSubBtn.style.cursor = 'pointer';
            appendStaticMarkup(saveSubBtn, saveSvg);

            const cancelSubBtn = document.createElement('div');
            cancelSubBtn.className = 'cancel-sub-btn';
            cancelSubBtn.style.cursor = 'pointer';
            appendStaticMarkup(cancelSubBtn, cancelSvg);

            inlineActions.append(saveSubBtn, cancelSubBtn);
            this.appendChild(inlineActions);

            this.querySelector('.save-sub-btn').onclick = async (ev) => {
                ev.stopPropagation();
                const res = await saveFieldData();
                if (res.success) {
                    lockField(targetEl, this, pencilSvg);
                } else {
                    alert("Hiba történt a mentés során.");
                }
            };

            this.querySelector('.cancel-sub-btn').onclick = (ev) => {
                ev.stopPropagation();
                targetEl.value = targetEl.dataset.originalValue;
                lockField(targetEl, this, pencilSvg);
            };
        });
    });

   function lockField(el, iconContainer, originalSvg) {
        const isTitle = el.hasAttribute('data-is-title');
        el.disabled = true;
        el.style.background = isTitle ? 'transparent' : '#f4f4f4';
        el.style.border = isTitle ? '1px solid transparent' : '1px solid #ccc';
        el.style.color = isTitle ? '#000' : '#555';
        replaceWithStaticMarkup(iconContainer, originalSvg);
    }
    await loadAiSwitchStatus();

if (aiSwitch && !aiSwitch.dataset.bound) {
    aiSwitch.dataset.bound = '1';

    aiSwitch.addEventListener('change', async () => {
        const wantsEnabled = aiSwitch.checked;

        if (wantsEnabled) {
            aiSwitch.checked = false;

            const accepted = await confirmAiEnableModal();
            if (!accepted) {
                applyAiSwitchUi(false);
                return;
            }

            try {
                const res = await fetch('/api/intezmeny-ai-toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        enabled: true,
                        accepted: true,
                        modulId: userState.modulId
                    })
                });

                const result = await res.json();

                if (!result.success) {
                    showAlert(result.message || 'Az MI-funkció engedélyezése sikertelen.');
                    applyAiSwitchUi(false);
                    return;
                }

                applyAiSwitchUi(true);
                showAlert('Az MI-funkció engedélyezve lett, bár a használata így is opcionális. Ezt a beállítást bármikor megváltoztathatja.');
            } catch (err) {
                console.error('AI engedélyezési hiba:', err);
                showAlert('Szerverhiba történt az MI engedélyezésekor.');
                applyAiSwitchUi(false);
            }
        } else {
            const biztos = confirm('Biztosan kikapcsolja az MI-funkciót? A korábbi naplóbejegyzések megmaradnak, de új MI-generálás nem indulhat.');
            if (!biztos) {
                applyAiSwitchUi(true);
                return;
            }

            try {
                const res = await fetch('/api/intezmeny-ai-toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        enabled: false,
                        accepted: false,
                        modulId: userState.modulId
                    })
                });

                const result = await res.json();

                if (!result.success) {
                    showAlert(result.message || 'Az MI-funkció kikapcsolása sikertelen.');
                    applyAiSwitchUi(true);
                    return;
                }

                applyAiSwitchUi(false);
                showAlert('Az MI-funkció kikapcsolva lett.');
            } catch (err) {
                console.error('AI kikapcsolási hiba:', err);
                showAlert('Szerverhiba történt az MI kikapcsolásakor.');
                applyAiSwitchUi(true);
            }
        }
    });
}
}


function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function setupSablonMainTabs(root = document, defaultTab = 'uj') {
    const tabs = Array.from(root.querySelectorAll('.sablon-main-tab'));
    const panels = Array.from(root.querySelectorAll('.sablon-tab-panel'));
    const lapokPanels = Array.from(document.querySelectorAll('[data-sablon-lapok-panel]'));

    if (!tabs.length || !panels.length) return;

    const showTab = (tabName) => {
        tabs.forEach(tab => {
            const active = tab.dataset.sablonTab === tabName;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        panels.forEach(panel => {
            const active = panel.dataset.sablonPanel === tabName;
            panel.hidden = !active;
            panel.classList.toggle('active', active);
        });

        lapokPanels.forEach(panel => {
            const active = panel.dataset.sablonLapokPanel === tabName;
            panel.hidden = !active;
            panel.classList.toggle('active', active);
        });
    };

    tabs.forEach(tab => {
        tab.onclick = () => showTab(tab.dataset.sablonTab || 'uj');
    });

    showTab(defaultTab);
}


function renderSablonLapokPlaceholder(container) {
    if (!container) return;

    replaceWithStaticMarkup(container, `
        <div class="sablon-empty-state sablon-lapok-placeholder">
            <h3>Itt jelenik meg az új sablon szerkesztője.</h3>
            <p>Kattintson az „Új sablon létrehozása” gombra a fő panelen.</p>
        </div>
    `);
}

function kerdesTipusFromSablon(elem = {}) {
    const tipus = String(
        elem.kerdes_tipus ||
        elem.kerdesTipus ||
        elem.tipus ||
        (elem.opcio ? 'opcio' : 'normal')
    ).toLowerCase();

    return tipus === 'opcio' ? 'opcio' : 'normal';
}

function getSablonTypePreset(selectedType) {
    const presetByType = {
        simple: {},
        text: { szoveges: true },
        option: { opcios: true }
    };

    return presetByType[selectedType] || {};
}

function prepareSablonInlineRow(ujDiv, ag) {
    if (!ujDiv) return;

    ujDiv.dataset.sablonAg = ag;

    const btnMent = ujDiv.querySelector('.btn-inline-mentes');
    if (btnMent) btnMent.style.display = 'none';

    const btnMegse = ujDiv.querySelector('.btn-inline-megse');
    if (btnMegse) {
        btnMegse.title = 'Eltávolítás a sablonból';
        btnMegse.addEventListener('click', () => {
            ujDiv.remove();
            frissitSablonDarabszamok(ujDiv.closest('.sablon-builder-card'));
        });
    }

    const nemAgCb = ujDiv.querySelector('.inline-nem-ag-checkbox');
    const nemAgLabel = ujDiv.querySelector('.inline-nem-ag-label');
    if (nemAgCb) {
        nemAgCb.checked = false;
        nemAgCb.disabled = true;
        nemAgCb.dispatchEvent(new Event('change'));
    }
    if (nemAgLabel) {
        nemAgLabel.style.display = 'none';
        nemAgLabel.title = 'Sablon létrehozásánál kétágú alkérdés nem választható.';
    }
}

function frissitSablonDarabszamok(builder) {
    if (!builder) return;

    ['igen', 'nem'].forEach(ag => {
        const lista = builder.querySelector(`.lista-${ag}`);
        const count = lista ? lista.querySelectorAll('.uj-ideiglenes-alkerdes').length : 0;
        const countEl = builder.querySelector(`.sablon-branch-card[data-ag="${ag}"] .sablon-branch-count`);
        const emptyEl = builder.querySelector(`.sablon-branch-card[data-ag="${ag}"] .sablon-branch-empty`);

        if (countEl) countEl.textContent = String(count);
        if (emptyEl) emptyEl.style.display = count > 0 ? 'none' : 'block';
    });
}

function chooseSablonAgStep() {
    return new Promise(resolve => {
        const old = document.getElementById('sablon-ag-step-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'sablon-ag-step-overlay';
        overlay.className = 'color-picker-overlay';
        overlay.style.zIndex = '9999';

        const modal = document.createElement('div');
        modal.className = 'color-picker-modal question-insert-wizard-modal question-insert-wizard--subquestion';

        modal.innerHTML = `
            <h3 class="color-picker-title">Melyik ághoz tartoznak a kérdések?</h3>
            <p class="question-insert-wizard-lead">Először válassza ki, hogy a sablon következő eleme az IGEN vagy a NEM ágba kerüljön.</p>
           
            <div class="sablon-ag-choice-grid">
                <button type="button" class="sablon-ag-choice" data-ag="igen">
                    <strong>IGEN ághoz szeretnék alkérdést hozzáadni</strong>
                    <span>Az elem akkor jelenik meg, ha az érintett főkérdés IGEN ágába kerülnek alkérdések.</span>
                </button>
                <button type="button" class="sablon-ag-choice" data-ag="nem">
                    <strong>NEM ághoz szeretnék alkérdést hozzáadni</strong>
                    <span>Az elem akkor jelenik meg, ha az érintett főkérdés NEM ágába kerülnek alkérdések.</span>
                </button>
            </div>
            <div class="color-picker-btn-container">
                <button type="button" class="color-picker-btn-cancel">Mégse</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const close = (value) => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
            resolve(value);
        };

        modal.querySelectorAll('.sablon-ag-choice').forEach(button => {
            button.addEventListener('click', () => close(button.dataset.ag || null));
        });

        modal.querySelector('.color-picker-btn-cancel')?.addEventListener('click', () => close(null));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(null);
        });
    });
}

async function beszurSablonAlkerdest(builder) {
    if (!builder) return;

    const ag = await chooseSablonAgStep();
    if (!ag) return;

    const selectedType = await QuestionInsertWizard.chooseTemplateBuilderSubQuestionType(ag);
    if (!selectedType) return;

    const lista = builder.querySelector(`.lista-${ag}`);
    if (!lista) return;

    const kindex = lista.querySelectorAll('.uj-ideiglenes-alkerdes').length + 1;
    const ujDiv = InlineQuestionCreator.createAlkerdesUI({
        kindex,
        ...getSablonTypePreset(selectedType)
    }, false);

    prepareSablonInlineRow(ujDiv, ag);
    lista.appendChild(ujDiv);
    frissitSablonDarabszamok(builder);
    ujDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function collectSablonEditorData(builder) {
    const elemDivjei = Array.from(builder.querySelectorAll('.uj-ideiglenes-alkerdes'));
    if (elemDivjei.length === 0) return { ok: false, message: 'A sablon legalább egy alkérdést tartalmazzon.', adatok: [] };

    let vanHiba = false;
    const adatok = elemDivjei.map((div) => {
        const szovegInput = div.querySelector('.inline-szoveg-input');
        const szoveg = szovegInput ? szovegInput.value.trim() : '';

        if (!szoveg) {
            vanHiba = true;
            if (szovegInput) szovegInput.style.border = '2px solid red';
        } else if (szovegInput) {
            szovegInput.style.border = '';
        }

        const opcio = !!div.querySelector('.inline-opcio-checkbox')?.checked;
        const szovegesCb = div.querySelector('.inline-szoveges-checkbox');
        const szoveges = !opcio && !!szovegesCb?.checked;
        const maxiCb = div.querySelector('.inline-maxi-checkbox');
        const maxi = opcio ? false : !!maxiCb?.checked;
        const ertekInput = div.querySelector('.inline-ertek-input');
        const ertek = ertekInput ? ertekInput.value : 0;
        const ag = div.dataset.sablonAg || div.closest('.sablon-branch-card')?.dataset.ag || 'igen';
        const kerdesTipus = opcio ? 'opcio' : 'normal';

        return {
            szoveg,
            ertek,
            szoveges,
            maxi,
            vanNemAg: false,
            negaltSzoveg: '',
            negaltErtek: 0,
            ag,
            opcio,
            kerdes_tipus: kerdesTipus,
            kerdesTipus,
            tipus: kerdesTipus
        };
    });

    if (vanHiba) {
        return { ok: false, message: 'Fogalmazzon meg kérdést/állítást minden mezőben.', adatok: [] };
    }

    return { ok: true, message: '', adatok };
}

export async function frissitSablonSzerkeszto(options = {}) {
    const activeTab = options.activeTab || 'uj';
    const root =
        document.querySelector('.main[data-content-id="sabik"] #tartalom2') ||
        document.querySelector('#tartalom-sablonok #tartalom2') ||
        document.getElementById('tartalom2');

    const sablonLapokRoot = document.querySelector('.lapok[data-content-id="sabik"]') || document;
    const mainTerulet =
        sablonLapokRoot.querySelector('#szerkeszto-interaktiv-terulet') ||
        root?.querySelector('#szerkeszto-interaktiv-terulet') ||
        document.getElementById('szerkeszto-interaktiv-terulet');
    const lapokTerulet =
        sablonLapokRoot.querySelector('#alkerdest-szerkeszto-terulet') ||
        root?.querySelector('#alkerdest-szerkeszto-terulet') ||
        document.getElementById('alkerdest-szerkeszto-terulet');
    const meglevoSzerkesztoTerulet =
        sablonLapokRoot.querySelector('#meglevo-sablon-szerkeszto-terulet') ||
        root?.querySelector('#meglevo-sablon-szerkeszto-terulet') ||
        document.getElementById('meglevo-sablon-szerkeszto-terulet');

    if (!mainTerulet || !lapokTerulet) return;

    setupSablonMainTabs(root || document, activeTab);

    mainTerulet.replaceChildren();
    renderSablonLapokPlaceholder(mainTerulet);
    if (meglevoSzerkesztoTerulet) meglevoSzerkesztoTerulet.replaceChildren();

    const ujSablonGomb = root?.querySelector('#btn-uj-sablon-letrehozas') || document.getElementById('btn-uj-sablon-letrehozas');
    if (ujSablonGomb) {
        ujSablonGomb.onclick = () => {
            mainTerulet.replaceChildren();
            createEditor(mainTerulet, null);
        };
    }

    lapokTerulet.replaceChildren();

    const loadingText = document.createElement('div');
    loadingText.className = 'sablon-empty-state';
    loadingText.innerHTML = '<p>Sablonok betöltése...</p>';
    lapokTerulet.appendChild(loadingText);

    let mentettSablonok = [];
    try {
        const res = await fetch(`/api/get-sablonok?modulId=${userState.modulId}&userId=${userState.userId}`);
        const data = await res.json();
        if (data.SABLON_CSOPORTOK) {
            mentettSablonok = data.SABLON_CSOPORTOK;
        }
    } catch (err) {
        console.error('Hiba a sablonok lekérésekor:', err);
    }

    lapokTerulet.replaceChildren();

    if (mentettSablonok.length === 0) {
        const uresUzenet = document.createElement('div');
        uresUzenet.className = 'sablon-empty-state';
        uresUzenet.innerHTML = '<h3>Nincsenek még mentett sablonok.</h3><p>Az első sablont az „Új sablonok” fülön lehet létrehozni.</p>';
        lapokTerulet.appendChild(uresUzenet);
        return;
    }

    mentettSablonok.forEach(sablon => {
        const igenDb = Array.isArray(sablon.elemek) ? sablon.elemek.filter(e => e.valasz_ag === 'igen').length : 0;
        const nemDb = Array.isArray(sablon.elemek) ? sablon.elemek.filter(e => e.valasz_ag === 'nem').length : 0;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'sablon-existing-card';

        const title = document.createElement('strong');
        title.textContent = sablon.nev || 'Névtelen sablon';

        const meta = document.createElement('span');
        meta.textContent = `IGEN ág: ${igenDb} elem · NEM ág: ${nemDb} elem`;

        card.append(title, meta);

        card.addEventListener('click', () => {
            lapokTerulet.querySelectorAll('.sablon-existing-card').forEach(el => el.classList.remove('active'));
            card.classList.add('active');

            const target = meglevoSzerkesztoTerulet || mainTerulet;
            target.replaceChildren();
            createEditor(target, sablon);
        });

        lapokTerulet.appendChild(card);
    });
}

// --- KÖZÖS SZERKESZTŐ GENERÁLÓ FÜGGVÉNY ---
// Ez rakja össze az interaktív szerkesztőt a megadott konténerbe.
function createEditor(container, sablonData = null) {
    const cim = sablonData ? `„${escapeHtml(sablonData.nev || 'Névtelen sablon')}” szerkesztése` : 'Új sablon összeállítása';
    const leiras = sablonData
        ? 'A meglévő sablon elemei betöltődtek. Módosítás után a sablon mentése új mentésként kerül rögzítésre.'
        : 'A hozzáadás gombbal először ágat választ, utána alkérdés típust. Kétágú alkérdés ebben a sablon-létrehozóban nem választható.';

    replaceWithStaticMarkup(container, `
        <div class="sablon-builder-card fade-in" data-sablon-builder>
            <div class="sablon-builder-head">
                <div>
                    <h3>${cim}</h3>
                    <p>${leiras}</p>
                </div>
            </div>

            <div class="sablon-builder-toolbar">
          
                <button type="button" class="sablon-secondary-btn btn-add-sablon-alkerdes">
                    <span class="material-symbols-rounded">add</span>
                    <span>Alkérdés hozzáadása</span>
                </button>
            </div>

            <div class="sablon-branch-board">
                <section class="sablon-branch-card" data-ag="igen">
                    <div class="sablon-branch-header">
                        <span>IGEN ág alkérdései</span>
                        <span class="sablon-branch-count">0</span>
                    </div>
                    <p class="sablon-branch-empty">Még nincs IGEN ághoz tartozó elem.</p>
                    <div class="alkerdest-lista lista-igen"></div>
                </section>

                <section class="sablon-branch-card" data-ag="nem">
                    <div class="sablon-branch-header">
                        <span>NEM ág alkérdései</span>
                        <span class="sablon-branch-count">0</span>
                    </div>
                    <p class="sablon-branch-empty">Még nincs NEM ághoz tartozó elem.</p>
                    <div class="alkerdest-lista lista-nem"></div>
                </section>
            </div>

            <div class="sablon-save-zone">
                <span style="color:#6b7280; font-size:.92em;">A teljes sablon innen menthető.</span>
                <button type="button" class="sablon-save-btn btn-save-all-sablon">
                    <span class="material-symbols-rounded">save</span>
                    <span>Sablon mentése</span>
                </button>
            </div>
        </div>
    `);

    const builder = container.querySelector('[data-sablon-builder]');
    const addButton = builder.querySelector('.btn-add-sablon-alkerdes');
    const saveButton = builder.querySelector('.btn-save-all-sablon');

    addButton.addEventListener('click', () => beszurSablonAlkerdest(builder));

    saveButton.addEventListener('click', () => {
        const result = collectSablonEditorData(builder);
        if (!result.ok) {
            mutassFigyelmeztetest(result.message);
            return;
        }

        const modal = createSablonSaveModal({
            alapNev: sablonData ? sablonData.nev : '',
            ag: 'vegyes',
            mentendoAdatok: result.adatok,
            onSaved: async () => frissitSablonSzerkeszto({ activeTab: 'meglevo' })
        });
        document.body.appendChild(modal);
    });

    if (sablonData && Array.isArray(sablonData.elemek)) {
        ['igen', 'nem'].forEach(ag => {
            const lista = builder.querySelector(`.lista-${ag}`);
            sablonData.elemek
                .filter(e => e.valasz_ag === ag)
                .forEach((elem, idx) => {
                    const opcio = kerdesTipusFromSablon(elem) === 'opcio';
                    const ujDiv = InlineQuestionCreator.createAlkerdesUI({
                        kindex: idx + 1,
                        szoveg: elem.szoveg,
                        ertek: elem.ertek,
                        szoveges: opcio ? false : elem.szoveges,
                        maxi: opcio ? false : elem.maxi,
                        opcios: opcio
                    }, false);
                    prepareSablonInlineRow(ujDiv, ag);
                    lista.appendChild(ujDiv);
                });
        });
    }

    frissitSablonDarabszamok(builder);
    builder.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Üres függvény a kompatibilitás miatt
export async function megjelenitMentettSablonok() {}


// Segédfüggvény a Toast üzenetheh
function mutassFigyelmeztetest(uzenet) {
    const alertBox = document.createElement('div');
    alertBox.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: #dc3545; color: white; padding: 12px 25px;
        border-radius: 8px; z-index: 10000; font-weight: bold;
    `;
    alertBox.textContent = uzenet;
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 2500);
}
// --- MENTETT SABLONOK MEGJELENÍTÉSE ---
