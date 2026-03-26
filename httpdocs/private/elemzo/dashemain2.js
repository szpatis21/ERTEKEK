import { loadInfoAndInit } from '../info/infoLoader.js';
import { initOlvas, initFrissites, initTorol } from '/private/user/dashCRUD.js'; 
import { monitorozCheckek,loadColorMaps } from '/private/user/dashStatic.js'; 
import { showAlert, customConfirm, customDatePrompt,customAuditPrompt } from "/both/alert.js";
import { initAuditLista } from './dashAudit.js';
console.log("Elemző modul aktív");

// Globális változók, amiket később más modulok is használhatnak
export let modulId, modulNev, modulLeiras, userId, userName, intezmeny, intezmeny_id;
// Betöltés indul
loadInfoAndInit();
getUserAndLoadAllKitoltesek();

async function getUserAndLoadAllKitoltesek() {
    try {
        const res = await fetch('/get-username');
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        modulId = data.modulId;
        modulNev = data.modulNev;
        modulLeiras = data.modulLeiras;
        userId = data.id;
        userName = data.username;
        intezmeny = data.intnev;
        intezmeny_id = data.int_id;
        document.querySelector("#sajatnev").innerHTML = "&nbsp;" + userName;
        document.querySelector('.holvagyok').innerHTML = modulLeiras;
        await loadAllKitoltesek();
    } catch (error) {
        console.error('Hiba az adatok betöltése során:', error);
    }
}

async function loadAllKitoltesek() {
    try {
        const url = `/api/get-kitoltesek?intezmeny_id=${intezmeny_id}&modul_id=${modulId}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        const kitoltesek = data.kitoltesek;

        if (!kitoltesek.length) {
            document.querySelector(".inner-div").innerHTML =
                '<p style="font-family: auto; color: white; font-style: italic;">' + 
                'Még nincsenek intézményi értékelések ebben a modulban.</p>';
            return;
        }

        // --- ÚJ, ADATBÁZISBÓL FRISSÍTŐ FÜGGVÉNY ---
        window.renderAuditListaDOM = async () => {
            try {
                // 1. Friss adatok lekérése a szerverről fülváltáskor
                const url = `/api/get-kitoltesek?intezmeny_id=${intezmeny_id}&modul_id=${modulId}`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.success) {
                    // 2. Szűrjük ki az admin értékeléseket
                    const adminKitoltesek = data.kitoltesek.filter(k => k.role === 'admin');
                    
                    // 3. Frissítjük a globális memóriát a biztonság kedvéért
                    window.elemzoKitoltesek = adminKitoltesek;
                    
                    // 4. Újraépítjük a listát a garantáltan friss adatokból!
                    initAuditLista(adminKitoltesek);
                }
            } catch (error) {
                console.error('Hiba az audit adatok frissítésekor:', error);
            }
        };

        const letrehozva = new Date().toISOString().split('T')[0];
        const adminKitoltesek = kitoltesek.filter(k => k.role === 'admin');
        
        window.elemzoKitoltesek = adminKitoltesek;

        initOlvas(adminKitoltesek, letrehozva, { groupByCreator: true, isElemzo: true });
        initFrissites({ userId, letrehozva });
        initTorol();
        monitorozCheckek(); 
        initAuditLista(adminKitoltesek);

        // --- LEJÁRÓ HATÁRIDŐK FIGYELÉSE ÉS MODAL (1 NAP) ---
        const ma = new Date();
        ma.setHours(0, 0, 0, 0);
        const holnap = new Date(ma);
        holnap.setDate(holnap.getDate() + 1);

        const lejaro = adminKitoltesek.filter(k => {
            if (k.audit == 1 && k.hatarido) {
                const hDatum = new Date(k.hatarido);
                hDatum.setHours(0, 0, 0, 0);
                return hDatum.getTime() === holnap.getTime();
            }
            return false;
        });

        if (lejaro.length > 0) {
            // 1. Saját lebegő ablak (Modal) létrehozása a DOM-ban
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'expiring-audit-modal';
            modalOverlay.className = 'expiring-modal-overlay'; // <-- CSS class-ra cserélve
            
            // Listaelemek összerakása checkboxokkal
          let listaHtml = '';
            lejaro.forEach(k => {
                // A vizsgált személy neve
                const nev = k.vizsgalt_nev || 'Ismeretlen';
                
                // Az értékelés neve (A tildéket és kötőjeleket szép, szóközös kötőjelre cseréljük)
                const formazottCim = (k.kitoltes_neve || '').replace(/~/g, ' - ').replace(/-/g, ' - ');
                
                listaHtml += `
                    <label class="expiring-modal-item">
                        <input type="checkbox" class="expiring-cb" value="${k.idk || k.id}" checked>
                        <strong>${nev}</strong> <span>(${formazottCim})</span>
                    </label>
                `;
            });

            // Letisztított, tiszta HTML szerkezet
            modalOverlay.innerHTML = `
                <div class="expiring-modal-content">
                    <h2 class="expiring-modal-title">
                        <span class="material-symbols-outlined">alarm</span> Holnap lejáró határidők!
                    </h2>
                    <p class="expiring-modal-desc">Az alábbi <b>${lejaro.length} db</b> értékelés határideje holnap lejár. Jelölje ki azokat, amelyekkel műveletet szeretne végezni:</p>
                    
                    <div class="expiring-modal-list">
                        ${listaHtml}
                    </div>
                    
                    <div class="expiring-modal-actions">
                        <button id="btn-exp-approve" class="expiring-btn expiring-btn-approve">Kiválasztott értékelések Jóváhagyása</button>
                        <button id="btn-exp-extend" class="expiring-btn expiring-btn-extend"> Kiválasztott határidők Hosszabbítása</button>
                        <button id="btn-exp-cancel" class="expiring-btn expiring-btn-cancel"> Mégsem (Később döntöm el)</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalOverlay);

            const getSelectedIds = () => {
                const checkboxes = modalOverlay.querySelectorAll('.expiring-cb:checked');
                return Array.from(checkboxes).map(cb => cb.value);
            };

            document.getElementById('btn-exp-cancel').addEventListener('click', () => {
                modalOverlay.remove();
            });
document.getElementById('btn-exp-approve').addEventListener('click', async () => {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) {
        showAlert('Kérem, jelöljön ki legalább egy értékelést!');
        return;
    }
    
    document.getElementById('btn-exp-approve').textContent = '⏳ Feldolgozás...';
    
    try {
        const response = await fetch('/api/set-audit-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audit_ids: selectedIds, new_status: 2 })
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert(`${selectedIds.length} db értékelés sikeresen jóváhagyva!`);
            let emailAdatok = [];
            selectedIds.forEach(id => {
                const item = lejaro.find(k => (k.idk || k.id) == id);
                if (item) {
                    emailAdatok.push({
                        email: item.email || item.mail, // A backendből jövő e-mail cím mező
                        alkoto: item.felhasznalo_nev || item.fnev || item.user || 'Ismeretlen',
                        nev: item.vizsgalt_nev || item.nev || 'Ismeretlen',
                        tipus: `${item.periodus || ''} - ${item.kitoltes_neve || item.megnev || ''}`
                    });
                }
            });

            if (typeof window.sendApprovalEmails === 'function') {
                window.sendApprovalEmails(emailAdatok);
            }
            modalOverlay.remove();
            if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM();
        }
    } catch (err) {
        console.error(err);
        showAlert('Hiba történt a jóváhagyáskor.');
        document.getElementById('btn-exp-approve').textContent = '✔️ Kiválasztott értékelések Jóváhagyása';
    }
});
            document.getElementById('btn-exp-extend').addEventListener('click', async () => {
                const selectedIds = getSelectedIds();
                if (selectedIds.length === 0) {
                    showAlert('Kérem, jelöljön ki legalább egy értékelést!');
                    return;
                }
                
                modalOverlay.style.display = 'none'; 
                const valasztottDatum = await customDatePrompt(`${selectedIds.length} db értékelés hosszabbítása`);
                
                if (!valasztottDatum) {
                    modalOverlay.style.display = 'flex'; 
                    return;
                }

                try {
                    showAlert('Feldolgozás folyamatban...');
                    const promises = selectedIds.map(id => {
                        return fetch('/api/set-audit-deadline', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                audit_id: id,           
                                user_audit: userId,             
                                audit_modul_id: modulId,        
                                audit_int_id: intezmeny_id,     
                                hatarido: valasztottDatum       
                            })
                        }).then(res => res.json());
                    });
                    
                    await Promise.all(promises);
                    showAlert(`Sikeresen meghosszabbítva! Az új határidő: ${valasztottDatum}`);
                    modalOverlay.remove();
                    if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM();
                } catch (err) {
                    console.error('Hiba a hosszabbításkor:', err);
                    showAlert('Hiba történt a határidők mentésekor.');
                }
            });
        }
    } catch (error) {
        console.error('Hiba az intézményi kitöltések betöltése során:', error);
    }
}
document.addEventListener('click', async (e) => {
if (e.target.id === 'audit-msg-send') {
        const inputField = document.getElementById('audit-msg-input');
        const message = inputField.value.trim();
        
        if (!message) {
            alert("Kérjük, írjon be egy üzenetet küldés előtt!");
            return;
        }

        const checkedBoxes = document.querySelectorAll('.audit-cheking:checked');
        let auditIds = [];
        let emailAdatok = []; // ÚJ: E-mail adatok gyűjtője
        
        if (checkedBoxes.length > 0) {
            // Csoportos
            Array.from(checkedBoxes).forEach(cb => {
                auditIds.push(cb.dataset.id);
                const kartya = cb.closest('.meglevok');
                if (kartya) {
                    emailAdatok.push({
                        email: kartya.dataset.mail,
                        alkoto: kartya.dataset.fnev || kartya.dataset.user,
                        nev: kartya.dataset.nev,
                        tipus: `${kartya.dataset.periodus} - ${kartya.dataset.megnev}`
                    });
                }
            });
        } else {
            // Egyéni
            const activeRow = document.querySelector('.inner-div-notok .meglevok.kijelolt, .inner-div-ok .meglevok.kijelolt');
            if (activeRow) {
                auditIds.push(activeRow.dataset.kitoltesId);
                emailAdatok.push({
                    email: activeRow.dataset.mail,
                    alkoto: activeRow.dataset.fnev || activeRow.dataset.user,
                    nev: activeRow.dataset.nev,
                    tipus: `${activeRow.dataset.periodus} - ${activeRow.dataset.megnev}`
                });
            }
        }

        if (auditIds.length === 0) {
            alert('Nincs kiválasztva értékelés az üzenetküldéshez!');
            return;
        }

        // Gomb inaktiválása a hívás idejére
        const sendBtn = e.target;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Küldés...';

        try {
            const currentUserName = window.userName || 'Elemző'; 
            
            const response = await fetch('/api/add-audit-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audit_ids: auditIds,
                    sender_name: currentUserName,
                    message: message
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                inputField.value = ''; // Mező kiürítése
                
                // --- ÚJ: E-mail értesítő segédfüggvény hívása ---
                if (typeof window.sendMessageEmails === 'function') {
                    window.sendMessageEmails(emailAdatok, message, currentUserName);
                }
                
                if (auditIds.length === 1) {
                    const messengerDiv = document.querySelector('.messengerdiv');
                    if (messengerDiv.querySelector('p')) messengerDiv.innerHTML = '';
                    
                    const now = new Date();
                    const ujUzenetHtml = `
                    <div class="uzenet2" title="${now.toLocaleString('hu-HU')}" data-ido="${now.toISOString()}">
                        <div class="nev1">${currentUserName}</div>
                        <div class="audit-messages1">${message}</div>
                    </div>`;
                    
                    messengerDiv.insertAdjacentHTML('beforeend', ujUzenetHtml);
                    messengerDiv.scrollTop = messengerDiv.scrollHeight; 
                } else {
                    alert(`Sikeresen elküldve ${auditIds.length} db értékeléshez, és az érintettek e-mailben is értesítve lettek!`);
                }
            } else {
                alert('Hiba történt: ' + data.message);
            }
        } catch (err) {
            console.error('Fetch hiba:', err);
            alert('Szerver hiba történt az üzenet küldésekor!');
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Küldés';
        }
    }

// 1. CSOPORTOS HATÁRIDŐ GOMB LOGIKÁJA
    const groupDeadlineBtn = e.target.closest('#group-deadline-btn');
    
    if (groupDeadlineBtn) {
        const checkedBoxes = document.querySelectorAll('.meglevok input.cheking:checked');
        const db = checkedBoxes.length;

        if (db === 0) {
            showAlert('Kérjük, előbb jelöljön ki értékeléseket a listában a checkboxok segítségével!');
            return;
        }

        const valasztottDatum = await customDatePrompt(`${db} db kijelölt értékelés`);
        if (!valasztottDatum) return; 

        let kivalasztottListaHTML = '<ul style="text-align: left; font-size: 0.85em; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 10px 10px 10px 30px; border-radius: 5px; margin-top: 15px; border: 1px solid #ddd;">';
        
        checkedBoxes.forEach(cb => {
            const kartya = cb.closest('.meglevok');
            const alkoto = kartya.dataset.fnev || kartya.dataset.user || 'Ismeretlen alkotó';
            const nev = kartya.dataset.nev || 'Ismeretlen';
            const periodus = kartya.dataset.periodus || '';
            const tipus = kartya.dataset.megnev || '';
            
            kivalasztottListaHTML += `<li style="margin-bottom: 5px; color: #333;">
                <strong>${alkoto}</strong> - ${nev} <span style="color: gray;">(${periodus} - ${tipus})</span>
            </li>`;
        });
        
        kivalasztottListaHTML += '</ul>';

        const confirmMsg = `Biztos, hogy beállítja a(z) <b style="color:#ffbd16;">${valasztottDatum}</b> határidőt az alábbi <b>${db} db</b> értékeléshez? ${kivalasztottListaHTML}`;
        const megerosites = await customConfirm(confirmMsg);
        
        if (!megerosites) return; 

        groupDeadlineBtn.style.pointerEvents = 'none';
        groupDeadlineBtn.style.opacity = '0.5';

        try {
            const promises = Array.from(checkedBoxes).map(async cb => {
                const meglevokDiv = cb.closest('.meglevok');
                
                const kitoltesId = cb.dataset.id || cb.value || meglevokDiv.dataset.kitoltesId;

                if (!kitoltesId || kitoltesId === "undefined") {
                    throw new Error("Érvénytelen értékelés ID! Frissítse az oldalt.");
                }

                const res = await fetch('/api/set-audit-deadline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        audit_id: kitoltesId,
                        user_audit: userId,
                        audit_modul_id: modulId,
                        audit_int_id: intezmeny_id,
                        hatarido: valasztottDatum
                    })
                });
                
                const data = await res.json();
                
                if (!data.success) {
                    throw new Error(data.message);
                }
                
                // --- Vizuális UI Frissítés (csak sikeres válasz esetén) ---
                meglevokDiv.classList.add("hatarido");
                meglevokDiv.dataset.auditId = "1";

                const hDatum = new Date(valasztottDatum);
                const formatDatum = hDatum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                
                let warmDiv = meglevokDiv.querySelector('.warm');
                if (warmDiv) {
                    warmDiv.style.display = 'flex';
                    warmDiv.classList.add('warm-item');
                    warmDiv.innerHTML = `
                        <span class="warmnote">Határidő lett beállítva ehhez az értékeléshez:<br>
                        <span style="color: #ffbd16;">Határidő:</span> ${formatDatum}</span>
                        <span class="material-symbols-outlined warm-icon" style="margin-left: 4px;">calendar_clock</span>
                    `;
                }

                if (window.elemzoKitoltesek) {
                    const eItem = window.elemzoKitoltesek.find(k => k.idk == kitoltesId);
                    if (eItem) {
                        eItem.hatarido = valasztottDatum;
                        eItem.audit = 1;
                    }
                }
                return data;
            });

            await Promise.all(promises);
            
            // EZ A RÉSZ MÁR CSAK AKKOR FUT LE, HA NEM VOLT HIBA!
            showAlert(`${db} db értékelés határideje sikeresen beállítva!`);

            const ertesitesekTomb = Array.from(checkedBoxes).map(cb => {
                const kartya = cb.closest('.meglevok');
                return {
                    email: kartya.dataset.mail, 
                    alkoto: kartya.dataset.fnev, 
                    nev: kartya.dataset.nev,
                    tipus: `${kartya.dataset.periodus} - ${kartya.dataset.megnev}`
                };
            });
                
            if (typeof window.sendDeadlineEmails === 'function') {
                window.sendDeadlineEmails(ertesitesekTomb, valasztottDatum);
            }
            
            checkedBoxes.forEach(cb => cb.checked = false);

            if (typeof window.renderAuditListaDOM === 'function') {
                window.renderAuditListaDOM();
            }

        } catch (error) {
            console.error('Hiba a csoportos mentés során:', error);
            showAlert(`Nem sikerült minden adatot menteni! Részletek: ${error.message}`);
        } finally {
            groupDeadlineBtn.style.pointerEvents = 'auto';
            groupDeadlineBtn.style.opacity = '1';
        }
    }

// 2. JÓVÁHAGYÁS ÉS VISSZANYITÁS GOMB (Egyéni és Csoportos, Audit fülön)
    if (e.target.id === 'audit-approve-btn') {
        const approveBtn = e.target;
        if (approveBtn.disabled) return;
        e.stopImmediatePropagation();

        const checkedBoxes = document.querySelectorAll('.audit-cheking:checked');
        let auditIds = [];
        let isApprovedList = false; 
        let selectedNames = [];
        let emailAdatok = []; 

        if (checkedBoxes.length > 0) {
            checkedBoxes.forEach(cb => {
                const sor = cb.closest('.meglevok');
                auditIds.push(cb.dataset.id);
                if (cb.dataset.audit == 2) isApprovedList = true; 
                selectedNames.push(sor.dataset.nev);
                
                emailAdatok.push({
                    email: sor.dataset.mail,
                    alkoto: sor.dataset.fnev || sor.dataset.user,
                    nev: sor.dataset.nev,
                    tipus: `${sor.dataset.periodus} - ${sor.dataset.megnev}`
                });
            });
        } else {
            const activeRow = document.querySelector('.inner-div-notok .meglevok.kijelolt, .inner-div-ok .meglevok.kijelolt');
            if (!activeRow) {
                showAlert('Nincs kiválasztva értékelés a művelethez!');
                return;
            }
            auditIds.push(activeRow.dataset.kitoltesId);
            isApprovedList = activeRow.dataset.auditId == 2;
            selectedNames.push(activeRow.dataset.nev);
            
            emailAdatok.push({
                email: activeRow.dataset.mail,
                alkoto: activeRow.dataset.fnev || activeRow.dataset.user,
                nev: activeRow.dataset.nev,
                tipus: `${activeRow.dataset.periodus} - ${activeRow.dataset.megnev}`
            });
        }

        const newStatus = isApprovedList ? 1 : 2; 
        const actionText = isApprovedList ? "visszanyitja auditálásra" : "jóváhagyja";
        const futureText = isApprovedList 
            ? "A későbbiekben a 'Jóváhagyásra váró' fülön találja meg, és új üzeneteket küldhet hozzá." 
            : "A későbbiekben a 'Jóváhagyott Értékelések' fülön visszanyithatja auditálásra, illetve láthatja a beszélgetés előzményeit.";

        const nameListHtml = selectedNames.length > 1 
            ? `<br><br><b>Érintett értékelések (${selectedNames.length} db):</b><br>${selectedNames.join(', ')}`
            : ` az <b>${selectedNames[0]}</b> nevű értékelést`;

        const megerosites = await customConfirm(`Biztosan ${actionText}${nameListHtml}?<br><br>${futureText}`);
        if (!megerosites) return;

        approveBtn.disabled = true;
        const originalText = approveBtn.textContent;
        approveBtn.textContent = 'Feldolgozás...';

        try {
            const response = await fetch('/api/set-audit-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audit_ids: auditIds, new_status: newStatus })
            });

            const data = await response.json();

            if (data.success) {
                showAlert(isApprovedList ? 'Értékelés(ek) sikeresen visszanyitva!' : 'Értékelés(ek) sikeresen jóváhagyva!');
                
                if (newStatus === 2 && typeof window.sendApprovalEmails === 'function') {
                    window.sendApprovalEmails(emailAdatok);
                }
                
                if (typeof window.renderAuditListaDOM === 'function') {
                    await window.renderAuditListaDOM(); 
                }
                
                const h3Titles = document.querySelectorAll('.messageouter h3');
                const messengerDiv = document.querySelector('.messengerdiv');
                const msgInputArea = document.getElementById('audit-msg-input') ? document.getElementById('audit-msg-input').closest('.audit-input-area') : null;
                const calendarBtnArea = document.querySelector('.calendardiv');

                if (h3Titles.length >= 2) {
                    h3Titles[0].style.display = ''; 
                    h3Titles[0].innerHTML = `<span class="ertnev">Kiválasztott</span> értékeléséhez tartozó határidő`;
                    h3Titles[1].innerHTML = `<span class="ertnev">Kiválasztott</span> értékeléséhez tartozó üzenetek`;
                }
                if (messengerDiv) {
                    messengerDiv.innerHTML = '<p style="text-align:center; color:gray; padding: 20px;">Válasszon ki egy értékelést a jóváhagyott, vagy jóváhagyásra váró értékelések közül a hozzájuk tartozó információk megtekintéséhez.</p>';
                }
                if (calendarBtnArea) calendarBtnArea.style.display = ''; 
                if (msgInputArea) msgInputArea.style.display = ''; 
                
                document.querySelectorAll('.meglevok.kijelolt').forEach(el => el.classList.remove('kijelolt'));
                approveBtn.textContent = 'Értékelés Jóváhagyása';
                
            } else {
                showAlert('Hiba történt: ' + data.message);
                approveBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Fetch hiba:', error);
            showAlert('Szerver hiba történt a művelet során!');
            approveBtn.textContent = originalText;
        } finally {
            approveBtn.disabled = false;
            if (approveBtn.textContent === 'Feldolgozás...') {
                approveBtn.textContent = originalText;
            }
        }
    }

    // 3. CSOPORTOS JÓVÁHAGYÁS GOMB LOGIKÁJA
    const groupApproveBtn = e.target.closest('#group-approve-btn');

    if (groupApproveBtn) {
        const checkedBoxes = document.querySelectorAll('.meglevok input.cheking:checked');
        const db = checkedBoxes.length;

        if (db === 0) {
            showAlert('Kérjük, előbb jelöljön ki értékeléseket a listában a checkboxok segítségével!');
            return;
        }

        const kijeloltSorok = Array.from(checkedBoxes).map(cb => cb.closest('.meglevok'));
        let auditIds = [];
        let emailAdatok = []; 
        let kivalasztottListaHTML = '<ul style="text-align: left; font-size: 0.85em; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 10px 10px 10px 30px; border-radius: 5px; margin-top: 15px; border: 1px solid #ddd;">';

        kijeloltSorok.forEach(sor => {
            const cb = sor.querySelector('input.cheking');
            const kitoltesId = (cb ? cb.dataset.id : null) || sor.dataset.kitoltesId || (cb ? cb.value : null);
            
            if (kitoltesId && kitoltesId !== "undefined") {
                auditIds.push(kitoltesId);
            }

            const alkoto = sor.dataset.fnev || sor.dataset.user || 'Ismeretlen alkotó';
            const nev = sor.dataset.nev || 'Ismeretlen';
            const periodus = sor.dataset.periodus || '';
            const tipus = sor.dataset.megnev || '';
            
            emailAdatok.push({
                email: sor.dataset.mail,
                alkoto: alkoto,
                nev: nev,
                tipus: `${periodus} - ${tipus}`
            });

            kivalasztottListaHTML += `<li style="margin-bottom: 5px; color: #333;">
                <strong>${alkoto}</strong> - ${nev} <span style="color: gray;">(${periodus} - ${tipus})</span>
            </li>`;
        });
        
        kivalasztottListaHTML += '</ul>';

        if (auditIds.length === 0) {
            showAlert('Hiba történt az azonosítók kinyerésekor. Kérjük, frissítse az oldalt!');
            return;
        }

        const confirmMsg = `Biztosan <b>jóváhagyja</b> az alábbi <b>${db} db</b> értékelést?<br>A jóváhagyott értékeléseket a későbbiekben a "Jóváhagyott Értékelések" fülön találja meg.${kivalasztottListaHTML}`;
        const megerosites = await customConfirm(confirmMsg);
        
        if (!megerosites) return; 

        groupApproveBtn.style.opacity = '0.5';
        groupApproveBtn.style.pointerEvents = 'none';
        const originalText = groupApproveBtn.innerHTML;
        groupApproveBtn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> <span>Feldolgozás...</span>';

        try {
            const response = await fetch('/api/set-audit-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audit_ids: auditIds, new_status: 2 })
            });

            const data = await response.json();

            if (data.success) {
                showAlert(`${auditIds.length} db értékelés sikeresen jóváhagyva!`);
                
                if (typeof window.sendApprovalEmails === 'function') {
                    window.sendApprovalEmails(emailAdatok);
                }

                checkedBoxes.forEach(cb => cb.checked = false);
                
                if (typeof window.renderAuditListaDOM === 'function') {
                    window.renderAuditListaDOM();
                }
                if (typeof getUserAndLoadAllKitoltesek === 'function') {
                    getUserAndLoadAllKitoltesek();
                }

            } else {
                showAlert('Hiba történt: ' + data.message);
            }
        } catch (error) {
            console.error('Fetch hiba a csoportos jóváhagyáskor:', error);
            showAlert('Szerver hiba történt a művelet során!');
        } finally {
            groupApproveBtn.style.opacity = '1';
            groupApproveBtn.style.pointerEvents = 'auto';
            groupApproveBtn.innerHTML = originalText;
        }
    }
// 4. CSOPORTOS AUDIT GOMB LOGIKÁJA
    const grupAuditBtn = e.target.closest('#grup-audit-btn');

    if (grupAuditBtn) {
        const checkedBoxes = document.querySelectorAll('.meglevok input.cheking:checked');
        if (checkedBoxes.length === 0) {
            showAlert('Nincs kiválasztva egyetlen értékelés sem!');
            return;
        }

        const kijeloltSorok = Array.from(checkedBoxes).map(cb => cb.closest('.meglevok'));
        const marAuditAlattSorok = kijeloltSorok.filter(sor => Number(sor.dataset.auditId) > 0 || sor.classList.contains('figyelmeztetve'));
        const marAuditDb = marAuditAlattSorok.length;
        const osszesDb = kijeloltSorok.length;
        let kivalasztottListaHTML = '<ul style="text-align: left; font-size: 0.85em; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 10px 10px 10px 30px; border-radius: 5px; margin-top: 15px; border: 1px solid #ddd;">';
        
        kijeloltSorok.forEach(sor => {
            const alkoto = sor.dataset.fnev || sor.dataset.user || 'Ismeretlen alkotó';
            const nev = sor.dataset.nev || 'Ismeretlen';
            const periodus = sor.dataset.periodus || '';
            const tipus = sor.dataset.megnev || '';
            
            // Ha már auditált, kap egy piros címkét a listában
            const marJelolveInfo = (Number(sor.dataset.auditId) > 0 || sor.classList.contains('figyelmeztetve')) 
                ? ' <span style="color:#d9534f; font-weight:bold;">(Már audit alatt)</span>' 
                : '';
            
            kivalasztottListaHTML += `<li style="margin-bottom: 5px; color: #333;">
                <strong>${alkoto}</strong> - ${nev} <span style="color: gray;">(${periodus} - ${tipus})</span>${marJelolveInfo}
            </li>`;
        });
        
        kivalasztottListaHTML += '</ul>';

     // 4. Figyelmeztető szöveg összeállítása
        let warningText = '';
        if (marAuditDb > 0) {
            warningText = `<br><br><span style="color:#d9534f; font-size: 0.9em; font-weight:bold;">Figyelem: A kijelöltekből ${marAuditDb} db értékelés már ki van jelölve auditációra. Valóban szeretne hozzájuk is új üzenetet (és határidőt) küldeni?</span>`;
        }
        // 5. Megerősítő ablak A LISTÁVAL és a FIGYELMEZTETÉSSEL
        const confirmMsg = `Biztosan elküldi az auditációs üzenetet a kiválasztott <b>${osszesDb} db</b> értékeléshez?${warningText}${kivalasztottListaHTML}`;
        const megerosites = await customConfirm(confirmMsg);
            if (!megerosites) return;
        // 6. Felugró ablak a szöveg és határidő bekéréséhez (MÁSODIK LÉPÉS)
        const auditData = await customAuditPrompt(`${osszesDb} db kiválasztott értékelés`);     
             if (!auditData) return; 

       grupAuditBtn.style.opacity = '0.5';
        grupAuditBtn.style.pointerEvents = 'none';

        const currentUserName = window.userName || 'Elemző'; 
        const promises = kijeloltSorok.map(async (sor) => {
            const cb = sor.querySelector('input.cheking');
            const kitoltesId = (cb ? cb.dataset.id : null) || sor.dataset.kitoltesId;
            
            if (!kitoltesId || kitoltesId === "undefined") return false; // Ha nincs ID, ezt a sort kihagyjuk

            const isMarAudit = Number(sor.dataset.auditId) > 0 || sor.classList.contains('figyelmeztetve');
            const currNev = sor.dataset.nev || 'Ismeretlen';
            const currIdoszak = sor.dataset.periodus || '';
            const currTipus = sor.dataset.megnev || '';
            const teljesNev = `${currNev} (${currIdoszak} - ${currTipus})`;

            try {
                if (isMarAudit) {
                    // --- A) HA MÁR AUDIT ALATT VAN ---
                    const resMsg = await fetch('/api/add-audit-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            audit_ids: [kitoltesId],
                            sender_name: currentUserName,
                            message: auditData.message
                        })
                    });
                    const dataMsg = await resMsg.json();
                    if (!dataMsg.success) throw new Error(dataMsg.message);

                    if (auditData.deadline) {
                        const resDate = await fetch('/api/set-audit-deadline', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                audit_id: kitoltesId,           
                                user_audit: userId,             
                                audit_modul_id: modulId,        
                                audit_int_id: intezmeny_id,     
                                hatarido: auditData.deadline    
                            })
                        });
                        const dataDate = await resDate.json();
                        if (!dataDate.success) throw new Error(dataDate.message);
                    }
                } else {
                    // --- B) HA MÉG NINCS AUDIT ALATT ---
                    const response = await fetch('/api/set-audit-init', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            audit_id: kitoltesId,           
                            user_audit: userId,             
                            audit_modul_id: modulId,        
                            audit_int_id: intezmeny_id,
                            sender_name: currentUserName, 
                            uzenet: auditData.message,
                            hatarido: auditData.deadline    
                        })
                    });
                    const data = await response.json();
                    if (!data.success) throw new Error(data.message);
                }

                // --- E-MAIL KÜLDÉSE ---
                if (typeof window.sendAuditInitEmail === 'function') {
                    const emailAdat = {
                        email: sor.dataset.mail,
                        userName: sor.dataset.fnev,
                        assessmentName: teljesNev,
                        auditorName: currentUserName,
                        message: auditData.message,
                        deadline: auditData.deadline
                    };
                    await window.sendAuditInitEmail(emailAdat); 
                }
                sor.dataset.auditId = "1";
                sor.classList.add("figyelmeztetve");
                if (auditData.deadline) sor.classList.add("hatarido");

                let warmDiv = sor.querySelector('.warm');
                if (warmDiv) {
                    warmDiv.style.display = 'flex';
                    warmDiv.classList.add('warm-item');
                    
                    let warmText = auditData.message;
                    let iconsHtml = `<div class="warm-icon" style="font-weight: bold;">!</div>`;

                    if (auditData.deadline) {
                        const hDatum = new Date(auditData.deadline);
                        const formatDatum = hDatum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                        warmText += `<br><br><span style="color: #ffbd16;">Határidő:</span> ${formatDatum}`;
                        iconsHtml += `<span class="material-symbols-outlined warm-icon" style="margin-left: 4px;">calendar_clock</span>`;
                    }

                    warmDiv.innerHTML = `
                        <span class="warmnote">${warmText}</span>
                        ${iconsHtml}
                    `;
                }

                if (cb) cb.checked = false;
                return true; // Sikeres volt a művelet
                
            } catch (error) {
                console.error(`Hiba a(z) ${teljesNev} auditálása során:`, error);
                return false; // Hiba történt ennél az elemnél
            }
        });

        const eredmenyek = await Promise.all(promises);
        const sikeresDb = eredmenyek.filter(siker => siker === true).length;

        grupAuditBtn.style.opacity = '1';
        grupAuditBtn.style.pointerEvents = 'auto';

        if (sikeresDb > 0) {
            showAlert(`${sikeresDb} db értékelés sikeresen módosítva! Az érintettek e-mailben értesítve lettek.`);
            if (typeof window.renderAuditListaDOM === 'function') {
                setTimeout(() => window.renderAuditListaDOM(), 1500);
            }
        } else {
            showAlert('Nem sikerült egyetlen értékelést sem módosítani. Kérem, próbálja újra később.');
        }
    }
// 5. NAPTÁR GOMB LOGIKÁJA (FŐOLDAL ÉS AUDIT FÜL KÖZÖS KEZELÉSE)
    const btn = e.target.closest('#calendar-btn');

    if (btn) {
        const isAuditTab = btn.closest('.lapok') || btn.closest('.calendardiv');

        if (isAuditTab) {
           
            // A) AUDIT FÜL (Jobb panel) LOGIKÁJA
            const checkedBoxes = document.querySelectorAll('.audit-cheking:checked');
            const db = checkedBoxes.length;

            if (db > 0) {
                // --- AUDIT CSOPORTOS MÓD ---
                const kivalasztottDatum = await customDatePrompt(`${db} db kijelölt értékelés`);
                if (!kivalasztottDatum) return; 

                let kivalasztottListaHTML = '<ul style="text-align: left; font-size: 0.85em; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 10px 10px 10px 30px; border-radius: 5px; margin-top: 15px; border: 1px solid #ddd;">';
                
                checkedBoxes.forEach(cb => {
                    const kartya = cb.closest('.meglevok');
                    const nev = kartya.dataset.nev || 'Ismeretlen';
                    const periodus = kartya.dataset.periodus || '';
                    const tipus = kartya.dataset.megnev || '';
                    kivalasztottListaHTML += `<li style="margin-bottom: 5px; color: #333;">
                        <strong>${nev}</strong> <span style="color: gray;">(${periodus} - ${tipus})</span>
                    </li>`;
                });
                kivalasztottListaHTML += '</ul>';

                const confirmMsg = `Biztos, hogy beállítja a(z) <b style="color:#ffbd16;">${kivalasztottDatum}</b> határidőt az alábbi <b>${db} db</b> értékeléshez? ${kivalasztottListaHTML}`;
                const megerosites = await customConfirm(confirmMsg);
                if (!megerosites) return;

                try {
                    const promises = Array.from(checkedBoxes).map(cb => {
                        const kitoltesId = cb.dataset.id; 
                        return fetch('/api/set-audit-deadline', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                audit_id: kitoltesId,           
                                user_audit: userId,             
                                audit_modul_id: modulId,        
                                audit_int_id: intezmeny_id,     
                                hatarido: kivalasztottDatum       
                            })
                        }).then(res => res.json());
                    });
                    
                    await Promise.all(promises);
                    showAlert(`${db} db értékelés határideje sikeresen beállítva!`);
                    if (typeof window.sendDeadlineEmails === 'function') {
                        const ertesitesekTomb = Array.from(checkedBoxes).map(cb => {
                            const kartya = cb.closest('.meglevok');
                            return {
                                email: kartya.dataset.mail,
                                alkoto: kartya.dataset.fnev,
                                nev: kartya.dataset.nev,
                                tipus: `${kartya.dataset.periodus} - ${kartya.dataset.megnev}`
                            };
                        });
                        window.sendDeadlineEmails(ertesitesekTomb, kivalasztottDatum); 
                    }
                    const h3Titles = document.querySelectorAll('.messageouter h3');
                    const messengerDiv = document.querySelector('.messengerdiv');
                    if (h3Titles.length >= 2) {
                        h3Titles[0].innerHTML = `<span class="ertnev">Kiválasztott</span> értékeléséhez tartozó határidő`;
                        h3Titles[1].innerHTML = `<span class="ertnev">Kiválasztott</span> értékeléséhez tartozó üzenetek`;
                    }
                    if (messengerDiv) messengerDiv.innerHTML = '<p style="text-align:center; color:gray; padding: 20px;">Válasszon ki egy értékelést...</p>';
                    
                    if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM();

                } catch (error) {
                    console.error('Fetch hiba:', error);
                    showAlert('Szerver hiba történt a csoportos határidő mentése során.');
                }

            } else {
                
                const kijeloltSor = document.querySelector('.inner-div-ok .meglevok.kijelolt, .inner-div-notok .meglevok.kijelolt');
                if (!kijeloltSor) {
                    showAlert('Kérjük, előbb válasszon ki egy értékelést a listából!');
                    return;
                }

                const kitoltesId = kijeloltSor.dataset.kitoltesId;
                const nev = kijeloltSor.dataset.nev || 'Ismeretlen';
                const periodus = kijeloltSor.dataset.periodus || '';
                const tipus = kijeloltSor.dataset.megnev || '';
                const teljesNev = `${nev} (${periodus} - ${tipus})`;

                const kivalasztottDatum = await customDatePrompt(teljesNev);
                if (!kivalasztottDatum) return;

                const confirmMsg = `Biztos, hogy beállítja a(z) <b style="color:#ffbd16;">${kivalasztottDatum}</b> határidőt ehhez az értékeléshez?<br><br><b>${teljesNev}</b>`;
                const megerosites = await customConfirm(confirmMsg);
                if (!megerosites) return;

                try {
                    const response = await fetch('/api/set-audit-deadline', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            audit_id: kitoltesId,           
                            user_audit: userId,             
                            audit_modul_id: modulId,        
                            audit_int_id: intezmeny_id,     
                            hatarido: kivalasztottDatum       
                        })
                    });
                    const data = await response.json();
                    
                if (data.success) {
                        showAlert('Határidő sikeresen beállítva!');
                        
                        const ertesitesekTomb = [{
                            email: kijeloltSor.dataset.mail, 
                            alkoto: kijeloltSor.dataset.fnev, 
                            nev: kijeloltSor.dataset.nev, 
                            tipus: `${kijeloltSor.dataset.periodus} - ${kijeloltSor.dataset.megnev}`
                        }];
                        
                        window.sendDeadlineEmails(ertesitesekTomb, kivalasztottDatum);
                        
                        const hataridoSpan = document.getElementById('akthat');
                        if (hataridoSpan) {
                            hataridoSpan.textContent = new Date(kivalasztottDatum).toLocaleDateString('hu-HU', {
                                year: 'numeric', month: 'short', day: 'numeric'
                            });
                        }
                        
                        setTimeout(() => {
                            if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM();
                        }, 1000);
                    } else {
                        showAlert('Hiba történt: ' + data.message);
                    }
                } catch (error) {
                    console.error('Fetch hiba:', error);
                    showAlert('Szerver hiba történt a határidő mentése során.');
                }
            }

        } else {
            // B) FŐOLDALI EGYÉNI MÓD (Sima lista nézet)
            const kijeloltSor = document.querySelector('.meglevok.kijelolt');
            
            if (!kijeloltSor) {
                showAlert('Kérjük, előbb válasszon ki egy értékelést!');
                return;
            }

            const kitoltesId = kijeloltSor.dataset.kitoltesId;
            const currNev = kijeloltSor.dataset.nev || 'Ismeretlen';
            const currIdoszak = kijeloltSor.dataset.periodus || '';
            const currTipus = kijeloltSor.dataset.megnev || '';
            const teljesNev = `${currNev} (${currIdoszak} - ${currTipus})`;

            const valasztottDatum = await customDatePrompt(teljesNev);
            if (!valasztottDatum) return;

            const confirmMsg = `Biztos, hogy beállítja a(z) <b style="color:#ffbd16;">${valasztottDatum}</b> határidőt az alábbi értékeléshez?<br><br><b style="color: #333;">${teljesNev}</b>`;
            const megerosites = await customConfirm(confirmMsg);
            if (!megerosites) return; 

            try {
                const response = await fetch('/api/set-audit-deadline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        audit_id: kitoltesId,           
                        user_audit: userId,             
                        audit_modul_id: modulId,        
                        audit_int_id: intezmeny_id,     
                        hatarido: valasztottDatum       
                    })
                });
                
                const data = await response.json();
                
               if (data.success) {
                    showAlert('Határidő sikeresen beállítva!');
                                        const ertesitesekTomb = [{
                        email: kijeloltSor.dataset.mail,
                        alkoto: kijeloltSor.dataset.fnev,
                        nev: kijeloltSor.dataset.nev,
                        tipus: `${kijeloltSor.dataset.periodus} - ${kijeloltSor.dataset.megnev}`
                    }];
                    window.sendDeadlineEmails(ertesitesekTomb, valasztottDatum); 

                    kijeloltSor.classList.add("hatarido");
                    kijeloltSor.dataset.auditId = "1";
                    
                    setTimeout(() => {
                        if (typeof getUserAndLoadAllKitoltesek === 'function') getUserAndLoadAllKitoltesek();
                    }, 1500);

                }else {
                    showAlert('Hiba történt: ' + data.message);
                }
            } catch (error) {
                console.error('Fetch hiba:', error);
                showAlert('Szerver hiba történt a határidő mentése során.');
            }
        }
    }
}); 

document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = document.querySelectorAll(".audit-tab-btn");
    const sliderBg = document.querySelector(".audit-tab-slider-bg");
    const contentSlider = document.querySelector(".audit-content-slider");

    function initAuditTabs() {
        if (!tabButtons.length) return;

        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                
                // 1. Eltávolítjuk az "active" osztályt minden gombról
                tabButtons.forEach(btn => btn.classList.remove("active"));
                
                // 2. Rátesszük az "active" osztályt a kattintott gombra
                button.classList.add("active");

                // 3. Lekérjük az indexet (0 vagy 1)
                const index = parseInt(button.dataset.index);

                // 4. Mozgatjuk a felső háttércsúszkát (0% vagy 100%)
                sliderBg.style.transform = `translateX(${index * 100}%)`;

                // 5. Mozgatjuk az alsó tartalom szalagot (0% vagy -50%)
                contentSlider.style.transform = `translateX(-${index * 50}%)`;
            });
        });
    }

    initAuditTabs();
});
// --- SEGÉDFÜGGVÉNY: E-mailek elküldése a backendnek ---
window.sendDeadlineEmails = async function(ertesitesek, hatarido) {
    if (!ertesitesek || ertesitesek.length === 0) return;

    try {
        await fetch('/api/notify-deadlines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ertesitesek: ertesitesek, 
                hatarido: hatarido 
            })
        });
        console.log("Értesítő e-mailek parancsa sikeresen átadva a backendnek.");
    } catch (err) {
        console.error('Hiba az e-mail értesítések küldésekor:', err);
    }
}
// --- SEGÉDFÜGGVÉNY: Auditáció indulásáról szóló e-mail ---
window.sendAuditInitEmail = async function(adatok) {
    if (!adatok || !adatok.email) return;

    try {
        await fetch('/api/notify-audit-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adatok)
        });
    } catch (err) {
        console.error('Hiba az audit e-mail hívásakor:', err);
    }
};
// --- SEGÉDFÜGGVÉNY: Új üzenetről szóló e-mail küldése ---
window.sendMessageEmails = async function(ertesitesek, uzenet, senderName) {
    if (!ertesitesek || ertesitesek.length === 0) return;

    try {
        await fetch('/api/notify-audit-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ertesitesek: ertesitesek, 
                uzenet: uzenet,
                sender_name: senderName
            })
        });
        console.log("Új üzenet e-mailek parancsa sikeresen átadva a backendnek.");
    } catch (err) {
        console.error('Hiba az új üzenet e-mail értesítések küldésekor:', err);
    }
}
// --- SEGÉDFÜGGVÉNY: Jóváhagyásról szóló e-mail küldése ---
window.sendApprovalEmails = async function(ertesitesek) {
    if (!ertesitesek || ertesitesek.length === 0) return;
    try {
        await fetch('/api/notify-audit-approved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ertesitesek })
        });
    } catch (err) {
        console.error('Hiba a jóváhagyás e-mail hívásakor:', err);
    }
};
