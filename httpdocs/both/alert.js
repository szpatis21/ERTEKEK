// 1. LÉPÉS: Létrehozunk egy közös overlay-t minden modal számára
const modalOverlay = document.createElement('div');
modalOverlay.id = 'modalOverlay';
document.body.appendChild(modalOverlay);

// --- ALERT MODAL LÉTREHOZÁSA ---
const alertModal = document.createElement('div');
alertModal.className = 'modal';
alertModal.id = 'alertModal';
alertModal.innerHTML = `
  <div class="modal-content">
    <p id="alertText"></p>
    <button id="alertOk">OK</button>
  </div>
`;
document.body.appendChild(alertModal);

// --- MISSING AUDIT MODAL LÉTREHOZÁSA ---
const missingModal = document.createElement('div');
missingModal.className = 'modal';
missingModal.id = 'missingModal';
// ... a missingModal innerHTML tartalma változatlan ...
missingModal.innerHTML = `
<div class=" outer-div">
  <div class="modal-content inner-div">
   
    <h3> Az alábbi személyekhez még nincs rögzített hozzájárulási nyilatkozat! </h3>
      <p>
    Jelezze a megfelelő dokumentáció meglétét az érintett személyek neve melleti pipával.
    <br> Amennyiben nem rendelkezik megfelelő dokumentációval, illetve nem biztos ennek tényében, úgy az gondoskodjon az ellenőrzésről és a mihamarabbi beszerzésről!
    Amíg ez nem történt meg, addig az értintetettekel kapcsolatos értékeléseket blokkoljuk, majd 30 nap elteltével töröljük a hozzájuk kapcsolódó adatokat! 
    </p>
    <div style="display=flex; width=50%;align-items: center;">
    <div class="missing-list" id="missingList"></div>
    <div    style=" display: flex;
    flex-direction: column;
    align-items: center;"}>
    <label for="missingConfirm" style="    margin: 5px;
    font-size: small;"> Nyilatkozom a kiválasztott személyek hozzájáruló nyilatkozatának meglétéről</label>
<button id="missingConfirm" type="button" disabled>Meglévők elfogadása</button>    </div>
      </div>
  </div>
</div>`;
document.body.appendChild(missingModal);


// 2. LÉPÉS: Általános open/close logikát használunk
function closeModal() {
    // Minden nyitott modalt bezárunk
    document.querySelectorAll('.modal.open').forEach(modal => modal.classList.remove('open'));
    modalOverlay.classList.remove('open');
}

// Az overlay-re kattintva bezáródik minden
modalOverlay.addEventListener('click', closeModal);


// --- ALERT MODAL KEZELÉSE ---
const alertText = alertModal.querySelector('#alertText');
const alertOk = alertModal.querySelector('#alertOk');
alertOk.addEventListener('click', () => closeModal()); // A közös bezáró függvényt hívjuk

export function showAlert(message) {
  alertText.textContent = message;
  modalOverlay.classList.add('open');
  alertModal.classList.add('open');
}


// --- MISSING AUDIT MODAL KEZELÉSE ---
const missingListEl = missingModal.querySelector('#missingList');
const missingConfirm = missingModal.querySelector('#missingConfirm');
let onConfirm;

missingConfirm.addEventListener('click', (event) => {
  event.preventDefault(); // Megakadályozza az újratöltést
  closeModal();
  if (typeof onConfirm === 'function') onConfirm();
});

export function showMissingChecklist(items) {
  missingListEl.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'missing-item';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.value = item.vizsgalt_id;
    const label = document.createElement('label');
    label.textContent = item.vizsgalt_nev;
    div.append(chk, label);
    missingListEl.appendChild(div);
    chk.addEventListener('change', updateConfirmState);
  });
  missingConfirm.disabled = true;
  
  modalOverlay.classList.add('open');
  missingModal.classList.add('open');
  
  return new Promise(resolve => {
    onConfirm = () => resolve(
      Array.from(missingListEl.querySelectorAll('input:checked')).map(cb => cb.value)
    );
  });
}

function updateConfirmState() {
  const total = missingListEl.querySelectorAll('input').length;
  const checked = missingListEl.querySelectorAll('input:checked').length;
  missingConfirm.disabled = checked !== total;
}

export function customConfirm(uzenet) {
    return new Promise((resolve) => {
        // 1. Létrehozzuk az overlay-t és a dobozt
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 10000,
            opacity: 0, transition: 'opacity 0.3s'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: 'white', padding: '20px', borderRadius: '10px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', textAlign: 'center',
            minWidth: '300px', transform: 'scale(0.8)', transition: 'transform 0.3s'
        });

        box.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 1.1em; color: #333;">${uzenet}</div>
            <div style="display: flex; justify-content: center; gap: 15px;">
                <button id="btn-nem">Mégsem</button>
                <button id="btn-igen">Igen</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Animáció indítása
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'scale(1)';
        });

        // 2. Gomb események
        const close = (valasz) => {
            overlay.style.opacity = '0';
            box.style.transform = 'scale(0.8)';
            setTimeout(() => {
                if(overlay.parentElement) document.body.removeChild(overlay);
                resolve(valasz); // Itt küldjük vissza az Igen/Nem választ
            }, 300);
        };

        box.querySelector('#btn-igen').onclick = () => close(true);
        box.querySelector('#btn-nem').onclick = () => close(false);
    });
}

export function customPrompt3(uzenet, defaultNev, defaultIdoszak, defaultTipus) {
    return new Promise((resolve) => {
        // 1. Overlay és Modal létrehozása
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 10000,
            opacity: '0', transition: 'opacity 0.3s'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: 'white', padding: '25px', borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', textAlign: 'center',
            minWidth: '350px', transform: 'scale(0.8)', transition: 'transform 0.3s',
            fontFamily: "'Montserrat', sans-serif"
        });

        // 2. Belső HTML felépítése (A 3 mezővel)
        box.innerHTML = `
            <h3 style="margin-top: 0; color: #333; margin-bottom: 20px;">${uzenet}</h3>
            
            <div style="text-align: left; margin-bottom: 15px;">
                <label style="display:block; font-size:0.8em; color:#666; margin-bottom:5px;">Vizsgált személy:</label>
                <input id="cp3-nev" type="text" value="${defaultNev}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
            </div>

            <div style="text-align: left; margin-bottom: 15px;">
                <label style="display:block; font-size:0.8em; color:#666; margin-bottom:5px;">Időszak:</label>
                <input id="cp3-idoszak" type="text" value="${defaultIdoszak}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
            </div>

            <div style="text-align: left; margin-bottom: 25px;">
                <label style="display:block; font-size:0.8em; color:#666; margin-bottom:5px;">Vizsgálat típusa:</label>
                <input id="cp3-tipus" type="text" value="${defaultTipus}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="btn-megsem" style="padding: 8px 15px; border: none; background: #eee; border-radius: 5px; cursor: pointer;">Mégsem</button>
                <button id="btn-ok" style="padding: 8px 15px; border: none; background: #ff6500; color: white; border-radius: 5px; cursor: pointer; font-weight: bold;">Másolás</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Animáció indítása
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'scale(1)';
        });

        // 3. Eseménykezelők
        const close = (result) => {
            overlay.style.opacity = '0';
            box.style.transform = 'scale(0.8)';
            setTimeout(() => {
                if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(result);
            }, 300);
        };

        box.querySelector('#btn-megsem').addEventListener('click', () => close(null));

        box.querySelector('#btn-ok').addEventListener('click', () => {
            const nev = box.querySelector('#cp3-nev').value;
            const idoszak = box.querySelector('#cp3-idoszak').value;
            const tipus = box.querySelector('#cp3-tipus').value;

            if(!nev || !idoszak || !tipus) {
            showAlert("Minden mezőt ki kell tölteni!");                return;
            }
            close({ nev, idoszak, tipus });
        });
    });
}
export function customDatePrompt(vizsgaltNev) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 10000,
            opacity: '0', transition: 'opacity 0.3s'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: 'white', padding: '25px', borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', textAlign: 'center',
            minWidth: '350px', transform: 'scale(0.8)', transition: 'transform 0.3s',
            fontFamily: "'Montserrat', sans-serif"
        });

        // Minimum dátum beállítása (mai nap)
        const maiDatum = new Date().toISOString().split('T')[0];

        box.innerHTML = `
            <h3 style="margin-top: 0; color: #333; margin-bottom: 20px;">Határidő beállítása</h3>
            <p style="font-size: 0.9em; color: #555; margin-bottom: 15px;">Értékelés: <strong>${vizsgaltNev}</strong></p>
            
            <div style="text-align: left; margin-bottom: 25px;">
                <label style="display:block; font-size:0.8em; color:#666; margin-bottom:5px;">Válasszon határidőt:</label>
                <input id="cp-date" type="date" min="${maiDatum}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-family: inherit;">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="btn-megsem" style="padding: 8px 15px; border: none; background: #eee; border-radius: 5px; cursor: pointer;">Mégsem</button>
                <button id="btn-ok" style="padding: 8px 15px; border: none; background: #ff6500; color: white; border-radius: 5px; cursor: pointer; font-weight: bold;">Tovább</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'scale(1)';
        });

        const close = (result) => {
            overlay.style.opacity = '0';
            box.style.transform = 'scale(0.8)';
            setTimeout(() => {
                if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(result);
            }, 300);
        };

        box.querySelector('#btn-megsem').addEventListener('click', () => close(null));
        box.querySelector('#btn-ok').addEventListener('click', () => {
            const dateVal = box.querySelector('#cp-date').value;
            if(!dateVal) {
                // Ideiglenes sima alert, ha nem választott dátumot
showAlert("Kérem válasszon egy dátumot!");
                return;
            }
            close(dateVal);
        });
    });
}

export function customAuditPrompt(vizsgaltNev) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 10000,
            opacity: '0', transition: 'opacity 0.3s'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: 'white', padding: '25px', borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', textAlign: 'center',
            minWidth: '400px', maxWidth: '550px', transform: 'scale(0.8)', transition: 'transform 0.3s',
            fontFamily: "'Montserrat', sans-serif"
        });

        const maiDatum = new Date().toISOString().split('T')[0];

        box.innerHTML = `
            <h3 style="margin-top: 0; color: #333; margin-bottom: 20px;">Megjelölés Auditációra</h3>
            <p style="font-size: 0.9em; color: #555; margin-bottom: 15px;">Értékelés: <strong>${vizsgaltNev}</strong></p>

            <div class="inner-div messengerdiv" style="margin-bottom: 20px;">
                <div style="text-align:center; padding: 10px; color: #555;">
                    <span class="material-symbols-rounded" style="font-size: 3em; color: #ffbd16;">checklist</span>
                    <p style="font-size: 0.9em; margin-bottom: 10px;">
                        Írjon javaslatokat az értékeléshez. Az utolsó Ön által küldött üzenet megjelenik a szerkesztő oldalán és válaszolni is tud majd rá. Ha folytatná a beszélgetést az "auditáció" fülön az adott értékelésre kattintva tud további üzeneteket küldeni.
                    </p>
                </div>
                
                <div class="audit-input-area" style="display: flex; gap: 10px; margin-top: 15px;">
                    <input type="text" id="audit-msg-input" placeholder="Üzenet írása..." style="flex-grow: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
            </div>
            
            <div style="text-align: left; margin-bottom: 15px;">
                <input type="checkbox" name="szeretne" id="szeretne">
                <label for="szeretne" style="font-size: 0.9em; color: #333; cursor: pointer;"> Szeretne határidőt beállítani a megjelölt értékeléshez?</label>
            </div>
            
            <div id="date-container" style="display:none; text-align: left; margin-bottom: 25px;">
                <label style="display:block; font-size:0.8em; color:#666; margin-bottom:5px;">Válasszon határidőt:</label>
                <input id="cp-date" type="date" min="${maiDatum}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-family: inherit;">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="btn-megsem" style="padding: 8px 15px; border: none; background: #eee; border-radius: 5px; cursor: pointer;">Mégsem</button>
                <button id="btn-ok" style="padding: 8px 15px; border: none; background: #ff6500; color: white; border-radius: 5px; cursor: pointer; font-weight: bold;">Tovább</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'scale(1)';
        });

        // Eseménykezelők
        const checkbox = box.querySelector('#szeretne');
        const dateContainer = box.querySelector('#date-container');
        const dateInput = box.querySelector('#cp-date');

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                dateContainer.style.display = 'block';
            } else {
                dateContainer.style.display = 'none';
                dateInput.value = ''; // Ha kiveszi a pipát, töröljük a beírt dátumot
            }
        });

        const close = (result) => {
            overlay.style.opacity = '0';
            box.style.transform = 'scale(0.8)';
            setTimeout(() => {
                if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(result);
            }, 300);
        };

        box.querySelector('#btn-megsem').addEventListener('click', () => close(null));
        box.querySelector('#btn-ok').addEventListener('click', () => {
            const msg = box.querySelector('#audit-msg-input').value.trim();
            const wantsDate = checkbox.checked;
            const dateVal = dateInput.value;

            if (!msg) {
showAlert("Kérem, írjon egy üzenetet a szerkesztőnek!");                return;
            }

            if (wantsDate && !dateVal) {
showAlert("Kérem válasszon egy dátumot, vagy vegye ki a pipát!");                return;
            }

            close({ message: msg, deadline: wantsDate ? dateVal : null });
        });
    });
}
export function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#4CAF50', // Kellemes zöld szín
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10000',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out',
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 'bold'
    });

    document.body.appendChild(toast);

    // Fade-in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // Fade-out 3 másodperc múlva
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}