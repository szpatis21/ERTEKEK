import { loadInfoAndInit } from '../info/infoLoader.js';
import { initOlvas, initFrissites, initTorol } from '/private/user/dashCRUD.js'; 
import { monitorozCheckek, loadColorMaps } from '/private/user/dashStatic.js'; 
import { showAlert, customConfirm, customDatePrompt, customAuditPrompt } from "/both/alert.js";
import { initAuditLista } from './dashAudit.js';
import { escapeHTML, escapeAttr } from '/both/safeDom.js';

console.log("Elemző modul aktív");

export let modulId, modulNev, modulLeiras, userId, userName, intezmeny, intezmeny_id;

function clearElement(el) {
    if (el) el.replaceChildren();
}

function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
}

function renderEmptyState(container) {
    if (!container) return;
    clearElement(container);

    const wrapper = createEl('div', 'empty-state-wrapper');
    const iconBox = createEl('div', 'empty-icon-box');
    const icon = createEl('span', 'material-symbols-rounded', 'note_stack_add');
    const title = createEl('h2', 'empty-title', 'Üres a munkaterület');
    const subtitle = createEl('p', 'empty-subtitle', 'Az intézményben még senki nem hozott létre egyetlen értékelést sem. Amint valaki megteszi, itt megjelenik!');

    iconBox.appendChild(icon);
    wrapper.append(iconBox, title, subtitle);
    container.appendChild(wrapper);
}

function appendAuditMessage(messengerDiv, currentUserName, message, className = 'uzenet2') {
    if (!messengerDiv) return;

    const now = new Date();
    const idoHover = now.toLocaleString('hu-HU');
    const isoIdo = now.toISOString();

    const row = createEl('div', className);
    row.title = idoHover;
    row.dataset.ido = isoIdo;

    const nameEl = createEl('div', 'nev1', currentUserName);
    const messageEl = createEl('div', 'audit-messages1', message);

    row.append(nameEl, messageEl);
    messengerDiv.appendChild(row);
}

function renderWarmDeadline(warmDiv, formatDatum) {
    if (!warmDiv) return;

    warmDiv.style.display = 'flex';
    warmDiv.classList.add('warm-item');
    clearElement(warmDiv);

    const note = createEl('span', 'warmnote');
    note.append(
        document.createTextNode('Határidő lett beállítva ehhez az értékeléshez:'),
        document.createElement('br')
    );
    const label = document.createElement('span');
    label.style.color = '#ffbd16';
    label.textContent = 'Határidő:';
    note.append(label, document.createTextNode(` ${formatDatum}`));

    const icon = createEl('span', 'material-symbols-outlined warm-icon', 'calendar_clock');
    icon.style.marginLeft = '4px';

    warmDiv.append(note, icon);
}

function renderWarmAuditMessage(warmDiv, message, deadline) {
    if (!warmDiv) return;

    warmDiv.style.display = 'flex';
    warmDiv.classList.add('warm-item');
    clearElement(warmDiv);

    const note = createEl('span', 'warmnote');
    note.appendChild(document.createTextNode(message || ''));

    const icons = [];
    const warnIcon = createEl('div', 'warm-icon', '!');
    warnIcon.style.fontWeight = 'bold';
    icons.push(warnIcon);

    if (deadline) {
        const formatDatum = new Date(deadline).toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        note.append(document.createElement('br'), document.createElement('br'));
        const label = document.createElement('span');
        label.style.color = '#ffbd16';
        label.textContent = 'Határidő:';
        note.append(label, document.createTextNode(` ${formatDatum}`));

        const clockIcon = createEl('span', 'material-symbols-outlined warm-icon', 'calendar_clock');
        clockIcon.style.marginLeft = '4px';
        icons.push(clockIcon);
    }

    warmDiv.append(note, ...icons);
}

function setAuditTitle(titleEl, suffixText) {
    if (!titleEl) return;
    clearElement(titleEl);

    const span = createEl('span', 'ertnev', 'Kiválasztott');
    titleEl.append(span, document.createTextNode(suffixText));
}

function setMessengerPlaceholder(messengerDiv) {
    if (!messengerDiv) return;
    clearElement(messengerDiv);

    const p = document.createElement('p');
    p.style.textAlign = 'center';
    p.style.color = 'gray';
    p.style.padding = '20px';
    p.textContent = 'Válasszon ki egy értékelést...';
    messengerDiv.appendChild(p);
}

function setGroupButtonProcessing(button) {
    clearElement(button);
    const icon = createEl('span', 'material-symbols-rounded', 'hourglass_empty');
    const text = createEl('span', null, 'Feldolgozás...');
    button.append(icon, document.createTextNode(' '), text);
}


loadInfoAndInit();
getUserAndLoadAllKitoltesek();

// --- ALAPADATOK BETÖLTÉSE ---

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
        
     document.querySelector("#sajatnev").textContent = ` ${userName || ''}`;
    document.querySelector('.holvagyok').textContent = modulLeiras || '';
        
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
            renderEmptyState(document.querySelector(".inner-div"));
            return;
        }

        const letrehozva = new Date().toISOString().split('T')[0];
        const adminKitoltesek = kitoltesek.filter(k => k.role === 'admin');
        
        window.elemzoKitoltesek = adminKitoltesek;

        initOlvas(adminKitoltesek, letrehozva, { groupByCreator: true, isElemzo: true });
        initFrissites({ userId, letrehozva });
        initTorol();
        monitorozCheckek(); 
        initAuditLista(adminKitoltesek);
        checkExpiringAudits(adminKitoltesek);

    } catch (error) {
        console.error('Hiba az intézményi kitöltések betöltése során:', error);
    }
}

function checkExpiringAudits(adminKitoltesek) {
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
        renderExpiringModal(lejaro);
    }
}

function renderExpiringModal(lejaro) {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'expiring-audit-modal';
    modalOverlay.className = 'expiring-modal-overlay';

    const content = createEl('div', 'expiring-modal-content');

    const title = createEl('h2', 'expiring-modal-title');
    const titleIcon = createEl('span', 'material-symbols-outlined', 'alarm');
    title.append(titleIcon, document.createTextNode(' Holnap lejáró határidők!'));

    const desc = createEl('p', 'expiring-modal-desc');
    desc.append(
        document.createTextNode('Az alábbi '),
        (() => { const b = document.createElement('b'); b.textContent = `${lejaro.length} db`; return b; })(),
        document.createTextNode(' értékelés határideje holnap lejár. Jelölje ki azokat, amelyekkel műveletet szeretne végezni:')
    );

    const list = createEl('div', 'expiring-modal-list');
    lejaro.forEach(k => {
        const label = createEl('label', 'expiring-modal-item');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'expiring-cb';
        cb.value = String(k.idk || k.id || '');
        cb.checked = true;

        const strong = document.createElement('strong');
        strong.textContent = k.vizsgalt_nev || 'Ismeretlen';

        const span = document.createElement('span');
        span.textContent = `(${String(k.kitoltes_neve || '').replace(/~/g, ' - ').replace(/-/g, ' - ')})`;

        label.append(cb, strong, document.createTextNode(' '), span);
        list.appendChild(label);
    });

    const actions = createEl('div', 'expiring-modal-actions');
    const approveBtn = createEl('button', 'expiring-btn expiring-btn-approve', 'Kiválasztott értékelések Jóváhagyása');
    approveBtn.id = 'btn-exp-approve';
    const extendBtn = createEl('button', 'expiring-btn expiring-btn-extend', ' Kiválasztott határidők Hosszabbítása');
    extendBtn.id = 'btn-exp-extend';
    const cancelBtn = createEl('button', 'expiring-btn expiring-btn-cancel', ' Mégsem (Később döntöm el)');
    cancelBtn.id = 'btn-exp-cancel';
    actions.append(approveBtn, extendBtn, cancelBtn);

    content.append(title, desc, list, actions);
    modalOverlay.appendChild(content);
    document.body.appendChild(modalOverlay);

    const getSelectedIds = () => Array.from(modalOverlay.querySelectorAll('.expiring-cb:checked')).map(cb => cb.value);

    cancelBtn.addEventListener('click', () => modalOverlay.remove());

    approveBtn.addEventListener('click', async () => {
        const selectedIds = getSelectedIds();
        if (selectedIds.length === 0) return showAlert('Kérem, jelöljön ki legalább egy értékelést!');

        approveBtn.textContent = '⏳ Feldolgozás...';

        try {
            const response = await fetch('/api/set-audit-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audit_ids: selectedIds, new_status: 2 })
            });
            const data = await response.json();

            if (data.success) {
                showAlert(`${selectedIds.length} db értékelés sikeresen jóváhagyva!`);
                let emailAdatok = selectedIds.map(id => {
                    const item = lejaro.find(k => (k.idk || k.id) == id);
                    return item ? {
                        email: item.email || item.mail,
                        alkoto: item.felhasznalo_nev || item.fnev || item.user || 'Ismeretlen',
                        nev: item.vizsgalt_nev || item.nev || 'Ismeretlen',
                        tipus: `${item.periodus || ''} - ${item.kitoltes_neve || item.megnev || ''}`
                    } : null;
                }).filter(Boolean);

                if (typeof window.sendApprovalEmails === 'function') window.sendApprovalEmails(emailAdatok);
                modalOverlay.remove();
                if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM();
            }
        } catch (err) {
            console.error(err);
            showAlert('Hiba történt a jóváhagyáskor.');
            approveBtn.textContent = '✔️ Kiválasztott értékelések Jóváhagyása';
        }
    });

    extendBtn.addEventListener('click', async () => {
        const selectedIds = getSelectedIds();
        if (selectedIds.length === 0) return showAlert('Kérem, jelöljön ki legalább egy értékelést!');

        modalOverlay.style.display = 'none';
        const valasztottDatum = await customDatePrompt(`${selectedIds.length} db értékelés hosszabbítása`);

        if (!valasztottDatum) {
            modalOverlay.style.display = 'flex';
            return;
        }

        try {
            showAlert('Feldolgozás folyamatban...');
            const promises = selectedIds.map(id => fetch('/api/set-audit-deadline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audit_id: id, user_audit: userId, audit_modul_id: modulId,
                    audit_int_id: intezmeny_id, hatarido: valasztottDatum
                })
            }).then(res => res.json()));

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
// --- SEGÉDFÜGGVÉNYEK ADATKINYERÉSHEZ ---

function getCardData(el) {
    const card = el.closest('.meglevok') || el;
    const cb = card.querySelector('input.cheking');
    const id = (cb ? cb.dataset.id : null) || card.dataset.kitoltesId || (cb ? cb.value : null);
    
    return {
        id: id,
        email: card.dataset.mail,
        alkoto: card.dataset.fnev || card.dataset.user || 'Ismeretlen alkotó',
        nev: card.dataset.nev || 'Ismeretlen',
        tipus: `${card.dataset.periodus || ''} - ${card.dataset.megnev || ''}`,
        cardElement: card // Ez továbbra is kell a DOM manipulációkhoz
    };
}
function getCleanEmailData(data) {
    return {
        email: data.email,
        alkoto: data.alkoto,
        nev: data.nev,
        tipus: data.tipus
    };
}

// --- ESEMÉNYKEZELŐK KÜLÖN FÜGGVÉNYEKBEN ---

async function handleAuditMsgSend(e) {
    const inputField = document.getElementById('audit-msg-input');
    const message = inputField.value.trim();
    
    if (!message) return alert("Kérjük, írjon be egy üzenetet küldés előtt!");

    const checkedBoxes = document.querySelectorAll('.audit-cheking:checked');
    let auditIds = [];
    let emailAdatok = []; 
    
    if (checkedBoxes.length > 0) {
        Array.from(checkedBoxes).forEach(cb => {
            const data = getCardData(cb);
            auditIds.push(cb.dataset.id);
            if(data.email) emailAdatok.push(getCleanEmailData(data));
        });
    } else {
const activeRow = document.querySelector('.inner-div-notok .meglevok.kijelolt, .inner-div-ok .meglevok.kijelolt, .inner-div-hatarido .meglevok.kijelolt');        if (activeRow) {
            const data = getCardData(activeRow);
            auditIds.push(data.id);
            emailAdatok.push(getCleanEmailData(data));
        }
    }

    if (auditIds.length === 0) return alert('Nincs kiválasztva értékelés az üzenetküldéshez!');

    const sendBtn = e.target;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Küldés...';

    try {
        const currentUserName = window.userName || 'Elemző'; 
        const response = await fetch('/api/add-audit-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audit_ids: auditIds, sender_name: currentUserName, message: message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            inputField.value = ''; 
            if (typeof window.sendMessageEmails === 'function') {
                window.sendMessageEmails(emailAdatok, message, currentUserName);
            }
            
            if (auditIds.length === 1) {
                const messengerDiv = document.querySelector('.messengerdiv');
                if (messengerDiv.querySelector('p')) clearElement(messengerDiv);
                
                const now = new Date();
                const idoHover = now.toLocaleString('hu-HU');
                const isoIdo = now.toISOString();

                appendAuditMessage(messengerDiv, currentUserName, message);
                messengerDiv.scrollTop = messengerDiv.scrollHeight; 
            } else {
                alert(`Sikeresen elküldve ${auditIds.length} db értékeléshez!`);
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

async function handleGroupDeadline(e) {
    const groupDeadlineBtn = e.target.closest('#group-deadline-btn');
    const checkedBoxes = document.querySelectorAll('.meglevok input.cheking:checked');
    const db = checkedBoxes.length;

    if (db === 0) return showAlert('Kérjük, előbb jelöljön ki értékeléseket a listában!');

    const valasztottDatum = await customDatePrompt(`${db} db kijelölt értékelés`);
    if (!valasztottDatum) return; 

    let kivalasztottListaHTML = '<ul style="text-align: left; font-size: 0.85em; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 10px 10px 10px 30px; border-radius: 5px; margin-top: 15px; border: 1px solid #ddd;">';
    
    checkedBoxes.forEach(cb => {
        const data = getCardData(cb);
    kivalasztottListaHTML += `
    <li style="margin-bottom: 5px; color: #333;">
        <strong>${escapeHTML(data.alkoto)}</strong> - ${escapeHTML(data.nev)}
        <span style="color: gray;">(${escapeHTML(data.tipus)})</span>
    </li>`;
    });
    kivalasztottListaHTML += '</ul>';

    const megerosites = await customConfirm(`Biztos, hogy beállítja a(z) <b style="color:#ffbd16;">${escapeHTML(valasztottDatum)}</b> határidőt az alábbi <b>${db} db</b> értékeléshez? ${kivalasztottListaHTML}`);    
    if (!megerosites) return; 
    groupDeadlineBtn.style.pointerEvents = 'none';
    groupDeadlineBtn.style.opacity = '0.5';

    try {
        const promises = Array.from(checkedBoxes).map(async cb => {
            const data = getCardData(cb);
            if (!data.id || data.id === "undefined") throw new Error("Érvénytelen értékelés ID!");

            const res = await fetch('/api/set-audit-deadline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audit_id: data.id, user_audit: userId, audit_modul_id: modulId, audit_int_id: intezmeny_id, hatarido: valasztottDatum })
            });
            const resData = await res.json();
            if (!resData.success) throw new Error(resData.message);
            
            data.cardElement.classList.add("hatarido");
            data.cardElement.dataset.auditId = "1";

            let warmDiv = data.cardElement.querySelector('.warm');
            if (warmDiv) {
                const formatDatum = new Date(valasztottDatum).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                renderWarmDeadline(warmDiv, formatDatum);
            }

            if (window.elemzoKitoltesek) {
                const eItem = window.elemzoKitoltesek.find(k => k.idk == data.id);
                if (eItem) {
                    eItem.hatarido = valasztottDatum;
                    eItem.audit = 1;
                }
            }
            return resData;
        });

        await Promise.all(promises);
        showAlert(`${db} db értékelés határideje sikeresen beállítva!`);

        const ertesitesekTomb = Array.from(checkedBoxes).map(cb => getCleanEmailData(getCardData(cb)));
        if (typeof window.sendDeadlineEmails === 'function') window.sendDeadlineEmails(ertesitesekTomb, valasztottDatum);
        
        checkedBoxes.forEach(cb => cb.checked = false);
        if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM();

    } catch (error) {
        console.error('Hiba a csoportos mentés során:', error);
        showAlert(`Nem sikerült minden adatot menteni! Részletek: ${error.message}`);
    } finally {
        groupDeadlineBtn.style.pointerEvents = 'auto';
        groupDeadlineBtn.style.opacity = '1';
    }
}

async function handleAuditApprove(e) {
    const approveBtn = e.target;
    if (approveBtn.disabled) return;
    e.stopImmediatePropagation();

    const checkedBoxes = document.querySelectorAll('.audit-cheking:checked');
    let auditIds = [], selectedNames = [], emailAdatok = [];
    let isApprovedList = false;

    if (checkedBoxes.length > 0) {
        checkedBoxes.forEach(cb => {
            const data = getCardData(cb);
            auditIds.push(data.id);
            selectedNames.push(data.nev);
            emailAdatok.push(getCleanEmailData(data));
            if (cb.dataset.audit == 2) isApprovedList = true;
        });
    } else {
const activeRow = document.querySelector('.inner-div-notok .meglevok.kijelolt, .inner-div-ok .meglevok.kijelolt, .inner-div-hatarido .meglevok.kijelolt');        if (!activeRow) return showAlert('Nincs kiválasztva értékelés a művelethez!');
        
        const data = getCardData(activeRow);
        auditIds.push(data.id);
        selectedNames.push(data.nev);
        emailAdatok.push(getCleanEmailData(data));
        isApprovedList = activeRow.dataset.auditId == 2;
    }

    const newStatus = isApprovedList ? 1 : 2; 
    const actionText = isApprovedList ? "visszanyitja auditálásra" : "jóváhagyja";
    const futureText = isApprovedList ? "A későbbiekben a 'Jóváhagyásra váró' fülön találja meg." : "A későbbiekben a 'Jóváhagyott Értékelések' fülön visszanyithatja auditálásra.";
    const safeSelectedNames = selectedNames.map(n => escapeHTML(n));

    const nameListHtml = selectedNames.length > 1
        ? `<br><br><b>Érintett értékelések (${selectedNames.length} db):</b><br>${safeSelectedNames.join(', ')}`
        : ` az <b>${escapeHTML(selectedNames[0] || '')}</b> nevű értékelést`;
    if (!(await customConfirm(`Biztosan ${actionText}${nameListHtml}?<br><br>${futureText}`))) return;

    approveBtn.disabled = true;
    const originalText = approveBtn.textContent;
    approveBtn.textContent = 'Feldolgozás...';

    try {
        const response = await fetch('/api/set-audit-status', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audit_ids: auditIds, new_status: newStatus })
        });
        const data = await response.json();

        if (data.success) {
            showAlert(isApprovedList ? 'Értékelés(ek) sikeresen visszanyitva!' : 'Értékelés(ek) sikeresen jóváhagyva!');
            if (newStatus === 2 && typeof window.sendApprovalEmails === 'function') window.sendApprovalEmails(emailAdatok);
            if (typeof window.renderAuditListaDOM === 'function') await window.renderAuditListaDOM(); 
            
            const h3Titles = document.querySelectorAll('.messageouter h3');
            if (h3Titles.length >= 2) {
                h3Titles[0].style.display = '';
                setAuditTitle(h3Titles[0], ' értékeléséhez tartozó határidő');
                setAuditTitle(h3Titles[1], ' értékeléséhez tartozó üzenetek');
            }
            const messengerDiv = document.querySelector('.messengerdiv');
            if (messengerDiv) setMessengerPlaceholder(messengerDiv);
            
            const calendarBtnArea = document.querySelector('.calendardiv');
            const msgInputArea = document.getElementById('audit-msg-input') ? document.getElementById('audit-msg-input').closest('.audit-input-area') : null;
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
        if (approveBtn.textContent === 'Feldolgozás...') approveBtn.textContent = originalText;
    }
}

async function handleGroupApprove(e) {
    const groupApproveBtn = e.target.closest('#group-approve-btn');
    const checkedBoxes = document.querySelectorAll('.meglevok input.cheking:checked');
    const db = checkedBoxes.length;

    if (db === 0) return showAlert('Kérjük, előbb jelöljön ki értékeléseket a listában!');

    let auditIds = [], emailAdatok = []; 
    let kivalasztottListaHTML = '<ul style="text-align: left; font-size: 0.85em; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 10px 10px 10px 30px; border-radius: 5px; margin-top: 15px; border: 1px solid #ddd;">';

    Array.from(checkedBoxes).forEach(cb => {
        const data = getCardData(cb);
        if (data.id && data.id !== "undefined") {
            auditIds.push(data.id);
            emailAdatok.push(getCleanEmailData(data));
            kivalasztottListaHTML += `
                <li style="margin-bottom: 5px; color: #333;">
                    <strong>${escapeHTML(data.alkoto)}</strong> - ${escapeHTML(data.nev)}
                    <span style="color: gray;">(${escapeHTML(data.tipus)})</span>
                </li>`;        
            }
    });
    kivalasztottListaHTML += '</ul>';

    if (auditIds.length === 0) return showAlert('Hiba történt az azonosítók kinyerésekor.');
    if (!(await customConfirm(`Biztosan <b>jóváhagyja</b> az alábbi <b>${db} db</b> értékelést?${kivalasztottListaHTML}`))) return;

    groupApproveBtn.style.opacity = '0.5';
    groupApproveBtn.style.pointerEvents = 'none';
    const originalNodes = Array.from(groupApproveBtn.childNodes).map(node => node.cloneNode(true));
    setGroupButtonProcessing(groupApproveBtn);

    try {
        const response = await fetch('/api/set-audit-status', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audit_ids: auditIds, new_status: 2 })
        });
        const data = await response.json();

        if (data.success) {
            showAlert(`${auditIds.length} db értékelés sikeresen jóváhagyva!`);
            if (typeof window.sendApprovalEmails === 'function') window.sendApprovalEmails(emailAdatok);
            checkedBoxes.forEach(cb => cb.checked = false);
            if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM();
            if (typeof getUserAndLoadAllKitoltesek === 'function') getUserAndLoadAllKitoltesek();
        } else {
            showAlert('Hiba történt: ' + data.message);
        }
    } catch (error) {
        console.error('Fetch hiba a csoportos jóváhagyáskor:', error);
        showAlert('Szerver hiba történt a művelet során!');
    } finally {
        groupApproveBtn.style.opacity = '1';
        groupApproveBtn.style.pointerEvents = 'auto';
        groupApproveBtn.replaceChildren(...originalNodes.map(node => node.cloneNode(true)));
    }
}

async function handleGroupAudit(e) {
    const grupAuditBtn = e.target.closest('#grup-audit-btn');
    const checkedBoxes = document.querySelectorAll('.meglevok input.cheking:checked');
    if (checkedBoxes.length === 0) return showAlert('Nincs kiválasztva egyetlen értékelés sem!');

    const kijeloltSorok = Array.from(checkedBoxes).map(cb => cb.closest('.meglevok'));
    const marAuditAlattSorok = kijeloltSorok.filter(sor => Number(sor.dataset.auditId) > 0 || sor.classList.contains('figyelmeztetve'));
    const marAuditDb = marAuditAlattSorok.length;
    let kivalasztottListaHTML = '<ul style="text-align: left; font-size: 0.85em; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 10px 10px 10px 30px; border-radius: 5px; margin-top: 15px; border: 1px solid #ddd;">';
    
    kijeloltSorok.forEach(sor => {
        const data = getCardData(sor);
        const marJelolveInfo = (Number(sor.dataset.auditId) > 0 || sor.classList.contains('figyelmeztetve')) ? ' <span style="color:#d9534f; font-weight:bold;">(Már audit alatt)</span>' : '';
        kivalasztottListaHTML += `
            <li style="margin-bottom: 5px; color: #333;">
                <strong>${escapeHTML(data.alkoto)}</strong> - ${escapeHTML(data.nev)}
                <span style="color: gray;">(${escapeHTML(data.tipus)})</span>${marJelolveInfo}
            </li>`;    
        });
    kivalasztottListaHTML += '</ul>';

    let warningText = marAuditDb > 0 ? `<br><br><span style="color:#d9534f; font-size: 0.9em; font-weight:bold;">Figyelem: A kijelöltekből ${marAuditDb} db értékelés már ki van jelölve auditációra. Valóban szeretne hozzájuk is új üzenetet (és határidőt) küldeni?</span>` : '';
    
    if (!(await customConfirm(`Biztosan elküldi az auditációs üzenetet a kiválasztott <b>${kijeloltSorok.length} db</b> értékeléshez?${warningText}${kivalasztottListaHTML}`))) return;
    
    const auditData = await customAuditPrompt(`${kijeloltSorok.length} db kiválasztott értékelés`);     
    if (!auditData) return; 

    grupAuditBtn.style.opacity = '0.5';
    grupAuditBtn.style.pointerEvents = 'none';
    const currentUserName = window.userName || 'Elemző'; 

    const promises = kijeloltSorok.map(async (sor) => {
        const data = getCardData(sor);
        if (!data.id || data.id === "undefined") return false;

        const isMarAudit = Number(sor.dataset.auditId) > 0 || sor.classList.contains('figyelmeztetve');
        const teljesNev = `${data.nev} (${data.tipus})`;

        try {
            if (isMarAudit) {
                const resMsg = await fetch('/api/add-audit-message', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audit_ids: [data.id], sender_name: currentUserName, message: auditData.message })
                });
                const dataMsg = await resMsg.json();
                if (!dataMsg.success) throw new Error(dataMsg.message);

                if (auditData.deadline) {
                    const resDate = await fetch('/api/set-audit-deadline', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audit_id: data.id, user_audit: userId, audit_modul_id: modulId, audit_int_id: intezmeny_id, hatarido: auditData.deadline })
                    });
                    const dataDate = await resDate.json();
                    if (!dataDate.success) throw new Error(dataDate.message);
                }
            } else {
                const response = await fetch('/api/set-audit-init', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audit_id: data.id, user_audit: userId, audit_modul_id: modulId, audit_int_id: intezmeny_id, sender_name: currentUserName, uzenet: auditData.message, hatarido: auditData.deadline })
                });
                const resData = await response.json();
                if (!resData.success) throw new Error(resData.message);
            }

            if (typeof window.sendAuditInitEmail === 'function') {
                await window.sendAuditInitEmail({ email: data.email, userName: data.alkoto, assessmentName: teljesNev, auditorName: currentUserName, message: auditData.message, deadline: auditData.deadline }); 
            }
            
            sor.dataset.auditId = "1";
            sor.classList.add("figyelmeztetve");
            if (auditData.deadline) sor.classList.add("hatarido");

            let warmDiv = sor.querySelector('.warm');
            if (warmDiv) {
                renderWarmAuditMessage(warmDiv, auditData.message || '', auditData.deadline);
            }

            const cb = sor.querySelector('input.cheking');
            if (cb) cb.checked = false;
            return true;
        } catch (error) {
            console.error(`Hiba a(z) ${teljesNev} auditálása során:`, error);
            return false;
        }
    });

    const eredmenyek = await Promise.all(promises);
    const sikeresDb = eredmenyek.filter(siker => siker === true).length;

    grupAuditBtn.style.opacity = '1';
    grupAuditBtn.style.pointerEvents = 'auto';

    if (sikeresDb > 0) {
        showAlert(`${sikeresDb} db értékelés sikeresen módosítva!`);
        if (typeof window.renderAuditListaDOM === 'function') setTimeout(() => window.renderAuditListaDOM(), 1500);
    } else {
        showAlert('Nem sikerült egyetlen értékelést sem módosítani.');
    }
}

async function handleCalendarBtn(e) {
    const btn = e.target.closest('#calendar-btn');
    const isAuditTab = btn.closest('.lapok') || btn.closest('.calendardiv');

    if (isAuditTab) {
        const checkedBoxes = document.querySelectorAll('.audit-cheking:checked');
        const db = checkedBoxes.length;

        if (db > 0) {
            const kivalasztottDatum = await customDatePrompt(`${db} db kijelölt értékelés`);
            if (!kivalasztottDatum) return; 

            let kivalasztottListaHTML = '<ul style="text-align: left; font-size: 0.85em; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 10px 10px 10px 30px; border-radius: 5px; margin-top: 15px; border: 1px solid #ddd;">';
            checkedBoxes.forEach(cb => {
                const data = getCardData(cb);
                kivalasztottListaHTML += `
                    <li style="margin-bottom: 5px; color: #333;">
                        <strong>${escapeHTML(data.nev)}</strong>
                        <span style="color: gray;">(${escapeHTML(data.tipus)})</span>
                    </li>`;           
                 });
            kivalasztottListaHTML += '</ul>';

        if (!(await customConfirm(`Biztos, hogy beállítja a(z) <b style="color:#ffbd16;">${escapeHTML(kivalasztottDatum)}</b> határidőt az alábbi <b>${db} db</b> értékeléshez? ${kivalasztottListaHTML}`))) return;
            try {
                const promises = Array.from(checkedBoxes).map(cb => fetch('/api/set-audit-deadline', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audit_id: cb.dataset.id, user_audit: userId, audit_modul_id: modulId, audit_int_id: intezmeny_id, hatarido: kivalasztottDatum })
                }).then(res => res.json()));
                
                await Promise.all(promises);
                showAlert(`${db} db értékelés határideje sikeresen beállítva!`);
                
                if (typeof window.sendDeadlineEmails === 'function') {
                    window.sendDeadlineEmails(Array.from(checkedBoxes).map(cb => getCleanEmailData(getCardData(cb))), kivalasztottDatum); 
                }
                if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM();
            } catch (error) {
                console.error('Fetch hiba:', error);
                showAlert('Szerver hiba történt a csoportos határidő mentése során.');
            }
        } else {
const kijeloltSor = document.querySelector('.inner-div-ok .meglevok.kijelolt, .inner-div-notok .meglevok.kijelolt, .inner-div-hatarido .meglevok.kijelolt');            if (!kijeloltSor) return showAlert('Kérjük, előbb válasszon ki egy értékelést a listából!');

            const data = getCardData(kijeloltSor);
            const teljesNev = `${data.nev} (${data.tipus})`;
            const kivalasztottDatum = await customDatePrompt(teljesNev);
            if (!kivalasztottDatum) return;

            if (!(await customConfirm(`Biztos, hogy beállítja a(z) <b style="color:#ffbd16;">${escapeHTML(kivalasztottDatum)}</b> határidőt ehhez az értékeléshez?<br><br><b>${escapeHTML(teljesNev)}</b>`))) return;
            try {
                const response = await fetch('/api/set-audit-deadline', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audit_id: data.id, user_audit: userId, audit_modul_id: modulId, audit_int_id: intezmeny_id, hatarido: kivalasztottDatum })
                });
                const resData = await response.json();
                
                if (resData.success) {
                    showAlert('Határidő sikeresen beállítva!');
                    if (typeof window.sendDeadlineEmails === 'function') window.sendDeadlineEmails([getCleanEmailData(data)], kivalasztottDatum);
                    
                    const hataridoSpan = document.getElementById('akthat');
                    if (hataridoSpan) hataridoSpan.textContent = new Date(kivalasztottDatum).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                    setTimeout(() => { if (typeof window.renderAuditListaDOM === 'function') window.renderAuditListaDOM(); }, 1000);
                } else {
                    showAlert('Hiba történt: ' + resData.message);
                }
            } catch (error) {
                console.error('Fetch hiba:', error);
                showAlert('Szerver hiba történt a határidő mentése során.');
            }
        }
    } else {
        const kijeloltSor = document.querySelector('.meglevok.kijelolt');
        if (!kijeloltSor) return showAlert('Kérjük, előbb válasszon ki egy értékelést!');

        const data = getCardData(kijeloltSor);
        const teljesNev = `${data.nev} (${data.tipus})`;
        const valasztottDatum = await customDatePrompt(teljesNev);
        if (!valasztottDatum) return;

if (!(await customConfirm(`Biztos, hogy beállítja a(z) <b style="color:#ffbd16;">${escapeHTML(valasztottDatum)}</b> határidőt az alábbi értékeléshez?<br><br><b style="color: #333;">${escapeHTML(teljesNev)}</b>`))) return;
        try {
            const response = await fetch('/api/set-audit-deadline', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audit_id: data.id, user_audit: userId, audit_modul_id: modulId, audit_int_id: intezmeny_id, hatarido: valasztottDatum })
            });
            const resData = await response.json();
            
            if (resData.success) {
                showAlert('Határidő sikeresen beállítva!');
                if (typeof window.sendDeadlineEmails === 'function') window.sendDeadlineEmails([getCleanEmailData(data)], valasztottDatum); 

                kijeloltSor.classList.add("hatarido");
                kijeloltSor.dataset.auditId = "1";
                setTimeout(() => { if (typeof getUserAndLoadAllKitoltesek === 'function') getUserAndLoadAllKitoltesek(); }, 1500);
            } else {
                showAlert('Hiba történt: ' + resData.message);
            }
        } catch (error) {
            console.error('Fetch hiba:', error);
            showAlert('Szerver hiba történt a határidő mentése során.');
        }
    }
}

// --- FŐ ESEMÉNY FIGYELŐ (DELEGÁLÁS) ---
document.addEventListener('click', async (e) => {
    if (e.target.id === 'audit-msg-send') return handleAuditMsgSend(e);
    if (e.target.closest('#group-deadline-btn')) return handleGroupDeadline(e);
    if (e.target.id === 'audit-approve-btn') return handleAuditApprove(e);
    if (e.target.closest('#group-approve-btn')) return handleGroupApprove(e);
    if (e.target.closest('#grup-audit-btn')) return handleGroupAudit(e);
    if (e.target.closest('#calendar-btn')) return handleCalendarBtn(e);
});

// --- FÜLEK INICIALIZÁLÁSA ---
function initAuditTabs() {
    const tabButtons = document.querySelectorAll(".audit-tab-btn");
    const sliderBg = document.querySelector(".audit-tab-slider-bg");
    const contentSlider = document.querySelector(".audit-content-slider");

    if (!tabButtons.length) return;

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            const index = parseInt(button.dataset.index);
            sliderBg.style.transform = `translateX(${index * 100}%)`;
            contentSlider.style.transform = `translateX(-${index * 50}%)`;
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initAuditTabs);
} else {
    initAuditTabs();
}

// --- GLOBÁLIS SEGÉDFÜGGVÉNYEK (MÁS MODULOK VAGY INLINE HTML SZÁMÁRA) ---

window.renderAuditListaDOM = async () => {
    try {
        const url = `/api/get-kitoltesek?intezmeny_id=${intezmeny_id}&modul_id=${modulId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
            const adminKitoltesek = data.kitoltesek.filter(k => k.role === 'admin');
            window.elemzoKitoltesek = adminKitoltesek;
            initAuditLista(adminKitoltesek);
        }
    } catch (error) {
        console.error('Hiba az audit adatok frissítésekor:', error);
    }
};

window.sendDeadlineEmails = async function(ertesitesek, hatarido) {
    if (!ertesitesek || ertesitesek.length === 0) return;
    try {
        await fetch('/api/notify-deadlines', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ertesitesek, hatarido })
        });
    } catch (err) { console.error('Hiba az e-mail értesítések küldésekor:', err); }
};

window.sendAuditInitEmail = async function(adatok) {
    if (!adatok || !adatok.email) return;
    try {
        await fetch('/api/notify-audit-init', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adatok)
        });
    } catch (err) { console.error('Hiba az audit e-mail hívásakor:', err); }
};

window.sendMessageEmails = async function(ertesitesek, uzenet, senderName) {
    if (!ertesitesek || ertesitesek.length === 0) return;
    try {
        await fetch('/api/notify-audit-message', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ertesitesek, uzenet, sender_name: senderName })
        });
    } catch (err) { console.error('Hiba az új üzenet e-mail értesítések küldésekor:', err); }
};

window.sendApprovalEmails = async function(ertesitesek) {
    if (!ertesitesek || ertesitesek.length === 0) return;
    try {
        await fetch('/api/notify-audit-approved', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ertesitesek })
        });
    } catch (err) { console.error('Hiba a jóváhagyás e-mail hívásakor:', err); }
};