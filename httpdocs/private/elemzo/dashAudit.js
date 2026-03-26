

export function initAuditLista(kitoltesek) {
    
    // 1. Megkeressük a konténereket a DOM-ban
    const okContainer = document.querySelector('.inner-div-ok');
    const notOkContainer = document.querySelector('.inner-div-notok');
    const hataridoContainer = document.querySelector('.inner-div-hatarido'); // Új konténer

    if (!okContainer || !notOkContainer || !hataridoContainer) return;

    // 2. Kiürítjük az eddigi tartalmat
    okContainer.innerHTML = '';
    notOkContainer.innerHTML = '';
    hataridoContainer.innerHTML = '';

    const isUserSide = window.location.pathname.includes('/user/');

    // 3. USER OLDALI SZŰRÉS: Csak a saját értékeléseit lássa
    let megjelenitendo = kitoltesek;
    if (isUserSide) {
        megjelenitendo = kitoltesek.filter(k => 
            k.creator_name === window.userName || 
            k.felhasznalo_nev === window.userName ||
            k.fnev === window.userName
        );
    }

    // 4. Szétválogatjuk az értékeléseket HÁROM felé
// 4. Szétválogatjuk az értékeléseket HÁROM felé
    const approvedItems = megjelenitendo.filter(k => k.audit == 2);

    // Jóváhagyásra váró: audit 1, ÉS van üzenete (warm) - függetlenül attól, hogy van-e határideje!
    const pendingItems = megjelenitendo.filter(k => {
        if (k.audit != 1) return false;
        const hasMessage = k.warm && String(k.warm).trim() !== '' && String(k.warm) !== 'null';
        const hasNothing = !hasMessage && !k.hatarido;
        return hasMessage || hasNothing;
    });

    // Határidős: audit 1, ÉS van határideje
    const deadlineItems = megjelenitendo.filter(k => k.audit == 1 && k.hatarido);

  function renderGroupedList(items, container) {
        if (items.length === 0) {
            container.innerHTML = '<p style="color: gray; font-size: small; text-align: center; margin-top: 10px;">Nincs megjeleníthető értékelés.</p>';
            return;
        }

        items.sort((a, b) => (a.creator_name || '').localeCompare(b.creator_name || ''));

        const isUserSide = window.location.pathname.includes('/user/');

        // --- SEGÉDFÜGGVÉNY: Helyi rendező létrehozása ---
        // Ezt hívjuk meg a user oldali főlistához, és az admin oldali al-listákhoz is.
        function createHelyiRendezo() {
            const helyiRendezo = document.createElement('div');
            helyiRendezo.classList.add('helyi-endezo'); 

            helyiRendezo.innerHTML = `
                <div class="nagyonhelyi">
                    <span class="material-symbols-rounded sort-icon">sort</span>
                    <select class="helyi-szuro">
                        <option value="alap" selected disabled hidden>Csoportosítás...</option>
                        <option value="hatarido">Határidő szerint</option>
                        <option value="nev">Név szerint</option>
                        <option value="periodus">Dátum szerint</option>
                        <option value="megnev">Típus szerint</option>
                    </select>
                </div>
            `;

            const selectElem = helyiRendezo.querySelector('.helyi-szuro');
            selectElem.addEventListener('change', (e) => {
                const szempont = e.target.value; 
                // Automatikusan a szülő listát (creator-list) célozza, ami mindkét nézetben létezik
                const szuloLista = e.target.closest('.creator-list'); 
                
                const tartElemek = Array.from(szuloLista.querySelectorAll('.tart'));
                szuloLista.querySelectorAll('.helyi-csoport').forEach(cs => cs.remove());
                
                const csoportok = {};
                tartElemek.forEach(tart => {
                    const div = tart.querySelector('.meglevok');
                    const ertek = (div && div.dataset[szempont]) ? div.dataset[szempont] : 'Ismeretlen';
                    
                    if (!csoportok[ertek]) {
                        csoportok[ertek] = [];
                    }
                    csoportok[ertek].push(tart); 
                });
                
                const rendezettKulcsok = Object.keys(csoportok).sort((a, b) => a.localeCompare(b, 'hu'));
                
                rendezettKulcsok.forEach(kulcs => {
                    const csoportDiv = document.createElement('div');
                    csoportDiv.classList.add('helyi-csoport');
                    csoportDiv.style.marginTop = '15px';
                    csoportDiv.style.borderLeft = '3px solid rgba(255, 101, 0, 0.5)'; 
                    csoportDiv.style.paddingLeft = '15px';
                    
                    const fejlec = document.createElement('div');
                    fejlec.classList.add('helyi-fejlec');
                    fejlec.textContent = kulcs; 
                    
                    const elemekTaroloja = document.createElement('div');
                    elemekTaroloja.classList.add('helyi-elemek');
                    
                    csoportok[kulcs].forEach(tart => {
                        elemekTaroloja.appendChild(tart);
                    });
                    
                    csoportDiv.appendChild(fejlec);
                    csoportDiv.appendChild(elemekTaroloja);
                    szuloLista.appendChild(csoportDiv);
                });
            });

            return helyiRendezo;
        }
        // --- SEGÉDFÜGGVÉNY VÉGE ---

        let currentWrapper = null;
        let currentList = null;
        let lastCreatorName = null;

        // --- 1. USER OLDALI NÉZET ÉPÍTÉSE ---
        if (isUserSide) {
            currentList = document.createElement('div');
            currentList.classList.add('creator-list'); 
            currentList.style.display = 'flex'; 
            currentList.style.flexDirection = 'column';
            
            // Belerakjuk az egyetlen szükséges rendezőt a lista legelejére
            currentList.appendChild(createHelyiRendezo());
            
            container.appendChild(currentList);
        }

        items.forEach(kitoltes => {
            // --- 2. ADMIN OLDALI NÉZET ÉPÍTÉSE (Csoportosítva) ---
            if (!isUserSide && kitoltes.creator_name !== lastCreatorName) {
                currentWrapper = document.createElement('div');
                currentWrapper.classList.add('creator-wrapper');

                const csoport = document.createElement('div');
                csoport.classList.add('tarolo');
                
                const header = document.createElement('div');
                header.classList.add('creator-head');
                header.style.cursor = 'pointer';
                header.style.userSelect = 'none';
                header.style.display = 'flex';
                header.style.justifyContent = 'flex-start';
                header.style.alignItems = 'center';
                header.innerHTML = `<span>${kitoltes.creator_name}</span>`;

                const toggle = document.createElement("div");
                toggle.innerHTML = `<span class="material-symbols-rounded toggle-icon" style="transition: transform 0.3s; color:orangered;">expand_more</span>`;
                header.appendChild(toggle);

                const helyicsop = document.createElement("button");
                helyicsop.classList.add("helyicsopgomb")
                helyicsop.textContent = "Csoport kijelölése";
                header.appendChild(helyicsop);

                header.addEventListener('click', () => {
                    const myTargetList = header.nextElementSibling;
                    const icon = header.querySelector('.toggle-icon');
                    
                    if (myTargetList.style.display === 'none') {
                        myTargetList.style.display = 'flex'; 
                        header.style.height = '45px';
                        helyicsop.style.height ="5vh";

                        if (icon) icon.style.transform = 'rotate(180deg)';
                    } else {
                        myTargetList.style.display = 'none';
                        header.style.height = '8vh';
                        helyicsop.style.height ="8vh";
                        if (icon) icon.style.transform = 'rotate(0deg)';
                    }
                });

                helyicsop.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    const myTargetList = header.nextElementSibling;
                    const checkboxes = myTargetList.querySelectorAll('.audit-cheking');
                    if (checkboxes.length === 0) return;

                    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                    checkboxes.forEach(cb => { cb.checked = !allChecked; });
                    helyicsop.textContent = allChecked ? "Csoport kijelölése" : "Kijelölés törlése";
                    handleAuditBulkSelection();
                });

                currentList = document.createElement('div');
                currentList.classList.add('creator-list');
                currentList.style.display = 'none';

                // Itt minden csoport listája kap egy saját rendezőt
                currentList.appendChild(createHelyiRendezo());

                currentWrapper.append(header, currentList);
                csoport.append(currentWrapper);
                container.appendChild(csoport);
                
                lastCreatorName = kitoltes.creator_name;
            }

            // --- 3. KÁRTYA ÉS TARTÁLY LÉTREHOZÁSA (Közös rész) ---
            const tartaly = document.createElement("div");
            tartaly.classList.add("tart");
            const kitoltesDiv = document.createElement('div');
            kitoltesDiv.classList.add('meglevok');
            kitoltesDiv.style.cursor = 'pointer'; // Hogy látszódjon, hogy kattintható
            
            // Adatok felvétele a DOM elemre (dataset)
            kitoltesDiv.dataset.kitoltesId = kitoltes.idk;
            kitoltesDiv.dataset.auditId = kitoltes.audit;

            // --- INNENTŐL JÖN A HIÁNYZÓ RÉSZ PÓTLÁSA ---
            // Szétválasztjuk a nevet (Időszak és Típus), figyelve az esetleges üres értékekre
            const [periodus, megnev] = (kitoltes.kitoltes_neve || '').split('-').map(s => s.replace(/~/g, '-').trim());
            
            // Hozzáadjuk a dataset-hez, amiből a szűrő dolgozik!
            kitoltesDiv.dataset.nev = kitoltes.vizsgalt_nev || 'Ismeretlen Értékelés';
            kitoltesDiv.dataset.periodus = periodus || 'Egyéb';
            kitoltesDiv.dataset.megnev = megnev || 'Egyéb';
            kitoltesDiv.dataset.mail = kitoltes.creator_mail;
            kitoltesDiv.dataset.fnev = kitoltes.creator_name || 'Felhasználó';
            // --- HIÁNYZÓ RÉSZ VÉGE ---
if (kitoltes.hatarido) {
                const hDatum = new Date(kitoltes.hatarido);
                kitoltesDiv.dataset.hatarido = hDatum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
            } else {
                kitoltesDiv.dataset.hatarido = 'Nincs határidő'; // Ide fogja gyűjteni azokat, amiknek még nem adtak
            }
            
 

            // 1. A szöveges tartalom beállítása
// HTML tartalom összeállítása (Gombok és checkbox nélkül!)
            const decryptedName = kitoltes.vizsgalt_nev || 'Ismeretlen Értékelés';
            const nameHtml = `<div class="vizsgalt-nev"><strong>${decryptedName}</strong></div>`;
            const formattedText = (kitoltes.kitoltes_neve || '').replace(/-/g, ' - <br>');

            // 1. A szöveges tartalom beállítása
            kitoltesDiv.innerHTML = nameHtml + formattedText;

            // --- ÚJ RÉSZ: HATÁRIDŐ DIV GENERÁLÁSA AZ AUDIT LISTÁBA ---
            if (kitoltes.hatarido) {
                kitoltesDiv.classList.add("hatarido"); // Adjuk hozzá a sárga keret stílust, ha van ilyen beállítva

                const hDatum = new Date(kitoltes.hatarido);
                const formatDatum = hDatum.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                
                const auditHataridoDiv = document.createElement('div');
                auditHataridoDiv.className = 'audit-hatarido-jelzo';
                auditHataridoDiv.style.display = 'flex';
                auditHataridoDiv.style.alignItems = 'center';
                auditHataridoDiv.style.color = '#000000';
                auditHataridoDiv.style.fontSize = '0.85em';
                
                auditHataridoDiv.innerHTML = `
                    <span class="material-symbols-outlined" style="font-size: 1.2em; margin-right: 5px;">calendar_clock</span>
                    Határidő: ${formatDatum}
                `;
                
                kitoltesDiv.appendChild(auditHataridoDiv);
            }

            // 2. A Checkbox csak akkor jön létre, ha NEM a user oldalon vagyunk
            if (!isUserSide) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add("audit-cheking"); 
                checkbox.dataset.id = kitoltes.idk;
                checkbox.dataset.audit = kitoltes.audit;
                
                // Ne engedjük, hogy a pipálás megnyissa a sima egyéni chatet
                checkbox.addEventListener('click', (e) => e.stopPropagation());
                
                // Amikor változik (pipálják), meghívjuk a csoportos frissítőt
                checkbox.addEventListener('change', handleAuditBulkSelection);

                // 3. Hozzáadjuk a divhez
                kitoltesDiv.appendChild(checkbox);
            }

            // KATTINTÁS ESEMÉNY - Jelenleg csak vizuális kijelölés, később ide jön a chat betöltése
           // KATTINTÁS ESEMÉNY A CHAT MEGNYITÁSÁHOZ
           kitoltesDiv.addEventListener('click', async (event) => {
                    const lapok = document.querySelector("#lapok")
    lapok.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.querySelectorAll('.audit-cheking').forEach(cb => cb.checked = false);
                // A címeket is visszaállítjuk az eredetire (opcionális, mert az if (db > 0) else ága is megcsinálná, de biztos ami biztos)
                const h3Titles = document.querySelectorAll('.messageouter h3');
                if (h3Titles.length >= 2) {
                    h3Titles[0].innerHTML = `<span class="ertnev">Kiválasztott</span> értékeléséhez tartozó határidő`;
                    h3Titles[1].innerHTML = `<span class="ertnev">Kiválasztott</span> értékeléséhez tartozó üzenetek`;
                }
                // Vizuális kijelölés a listában
document.querySelectorAll('.inner-div-ok .meglevok.kijelolt, .inner-div-notok .meglevok.kijelolt, .inner-div-hatarido .meglevok.kijelolt').forEach(el => el.classList.remove('kijelolt'));                kitoltesDiv.classList.add('kijelolt');
                
                // --- ÚJ RÉSZ: UI elemek elrejtése/módosítása a státusz alapján ---
                const calendarBtn = document.getElementById('audit-chat-title');
                const calendarBtn2 = document.querySelector('.calendardiv');

                // Megkeressük az üzenetküldő input szülő div-jét, hogy az egészet eltüntessük
                const msgInputArea = document.getElementById('audit-msg-input') ? document.getElementById('audit-msg-input').closest('.audit-input-area') : null;
                const approveBtn = document.getElementById('audit-approve-btn');

                if (kitoltes.audit == 2) {
                    // 2-es státusz (Lezárt): Elrejtjük a fölösleges dolgokat és átírjuk a gombot
                    if (calendarBtn) calendarBtn.style.display = 'none';
                    if (calendarBtn2) calendarBtn2.style.display = 'none';
                    if (msgInputArea) msgInputArea.style.display = 'none';
                    if (approveBtn) approveBtn.textContent = 'Értékelés visszanyitása';
                } else {
                    // 1-es státusz (Aktív): Minden látható, gomb szövege az eredeti
                    if (calendarBtn) calendarBtn.style.display = '';
                    if (calendarBtn2) calendarBtn2.style.display = ''; // Az üres string visszaállítja az eredeti CSS-t (blokk/inline)
                    if (msgInputArea) msgInputArea.style.display = ''; 
                    if (approveBtn) approveBtn.textContent = 'Értékelés Jóváhagyása';
                };
                
                // Cím (értékelés nevének) átírása a jobb oldalon
                const ertnevSpans = document.querySelectorAll('.ertnev');
                ertnevSpans.forEach(span => {
                    span.textContent = decryptedName; 
                });

                // Üzenőfal megkeresése
                const messengerDiv = document.querySelector('.messengerdiv');
                if (!messengerDiv) return;

                // Töltés indikátor amíg a szerver válaszol
                messengerDiv.innerHTML = '<p style="text-align:center; padding: 20px;">Üzenetek betöltése...</p>';

                try {
                    // Adatok lekérése a szerverről
                    const response = await fetch(`/api/get-audit-messages?kitoltes_id=${kitoltes.idk}`);
                    const data = await response.json();

               if (data.success) {
                        // --- 1. HATÁRIDŐ BEÁLLÍTÁSA A UI-ON ---
                        const hataridoSpan = document.getElementById('akthat');
                        const calendarBtn = document.getElementById('audit-calendar'); // A gomb megkeresése
                        
                        if (hataridoSpan) {
                            if (data.hatarido) {
                                // Ha VAN határidő
                                const hDatum = new Date(data.hatarido);
                                hataridoSpan.textContent = hDatum.toLocaleDateString('hu-HU', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                });
                                // Gomb szövegének átírása
                                if (calendarBtn) calendarBtn.textContent = 'Új határidő'; 
                            } else {
                                // Ha NINCS határidő
                                hataridoSpan.textContent = 'Nincs megadva';
                                // Gomb szövegének átírása
                                if (calendarBtn) calendarBtn.textContent = 'Új határidő';
                            }
                        }
                        
                        const auditorNev = data.auditor_name || 'Elemző';
                        const userNev = data.user_name || 'Értékelés szerzője';

                        // JSON parse, ha van üzenet
                        const msgs = data.uzenetek ? (typeof data.uzenetek === 'string' ? JSON.parse(data.uzenetek) : data.uzenetek) : [];
                        
                        if (msgs.length > 0) {
                            let chatHtml = '';
                            
                            msgs.forEach(msg => {
                                const idoHover = msg.timestamp ? new Date(msg.timestamp).toLocaleString('hu-HU') : '';
                                
                                // ELDÖNTJÜK, KINEK A NEVÉT ÍRJUK KI:
                                const megjelenitendoNev = msg.sender_type === 'audit' ? auditorNev : userNev;

                                if (msg.sender_type === 'audit') {
                                    chatHtml += `
                                    <div class="uzenet2" title="${idoHover}" data-ido="${msg.timestamp}">
                                        <div class="nev1">${megjelenitendoNev}</div>
                                        <div class="audit-messages1">${msg.text}</div>
                                    </div>`;
                                } else {
                                    chatHtml += `
                                    <div class="uzenet1" title="${idoHover}" data-ido="${msg.timestamp}">
                                        <div class="nev2">${megjelenitendoNev}</div>
                                        <div class="audit-messages2">${msg.text}</div>
                                    </div>`;
                                }
                            });
                            
                            messengerDiv.innerHTML = chatHtml;
                            messengerDiv.scrollTop = messengerDiv.scrollHeight;
                        } else {
                             messengerDiv.innerHTML = '<p style="text-align:center; color:gray; padding: 20px;">Még nem küldött javaslatot az adott értékeléshez. Írja le meglátásait, majd nyomja meg a küldés gombot. A felhasználót e-mailben is értesítjük a küldött üzenetről.</p>';
                        }
                    } else {
                        messengerDiv.innerHTML = '<p style="text-align:center; color:gray; padding: 20px;">Még nem küldött javaslatot az adott értékeléshez. Írja le meglátásait, majd nyomja meg a küldés gombot. A felhasználót e-mailben is értesítjük a küldött üzenetről.</p>';
                    }

                } catch (error) {
                    console.error("Hiba a chat betöltésekor:", error);
                    messengerDiv.innerHTML = '<p style="text-align:center; color:red; padding: 20px;">Hiba történt az üzenetek betöltésekor.</p>';
                }
            });

            tartaly.appendChild(kitoltesDiv);
            currentList.appendChild(tartaly);
        });
    }

    // Végrehajtjuk a renderelést mindkét listára
renderGroupedList(approvedItems, okContainer);
    renderGroupedList(deadlineItems, hataridoContainer);
    renderGroupedList(pendingItems, notOkContainer);
}
// --- CSOPORTOS MŰVELETEK VEZÉRLŐJE ---
export function handleAuditBulkSelection() {

    // 1. Összeszedjük a bepipált checkboxokat
    const checkedBoxes = document.querySelectorAll('.audit-cheking:checked');
    const db = checkedBoxes.length;

    // 2. Megkeressük a jobb oldali (lapok) elemeit
    const h3Titles = document.querySelectorAll('.messageouter h3');
    const messengerDiv = document.querySelector('.messengerdiv');
    const approveBtn = document.getElementById('audit-approve-btn');
    const msgInputArea = document.getElementById('audit-msg-input') ? document.getElementById('audit-msg-input').closest('.audit-input-area') : null;
    const calendarBtnArea = document.querySelector('.calendardiv');

    // --- HA VAN KIJELÖLÉS (Csoportos mód) ---
    if (db > 0) {
        
        let approvedCount = 0;
        
        // --- A "kis lista" HTML-jének összeállítása ---
        let kivalasztottNevekHTML = '<ul style="text-align: left; font-size: 0.9em; background: #f8f9fa; padding: 15px 15px 15px 35px; border-radius: 8px; margin-top: 15px; border: 1px solid #ddd; max-height: 250px; overflow-y: auto;">';

        checkedBoxes.forEach(cb => {
            if (cb.dataset.audit == 2) approvedCount++;
            
            const kartya = cb.closest('.meglevok');
            const nev = kartya ? (kartya.dataset.nev || 'Ismeretlen') : 'Ismeretlen';
            const periodus = kartya ? (kartya.dataset.periodus || '') : '';
            const tipus = kartya ? (kartya.dataset.megnev || '') : '';
            
            kivalasztottNevekHTML += `<li style="margin-bottom: 6px; color: #333;"><strong>${nev}</strong> <span style="color: gray;">(${periodus} - ${tipus})</span></li>`;
        });
        
        kivalasztottNevekHTML += '</ul>'; 
        // --- KIS LISTA VÉGE ---

        // Megnézzük, hogy KIZÁRÓLAG jóváhagyottakat jelölt-e ki
        const isApprovedList = (approvedCount > 0 && approvedCount === db);

        // 1. Címek átírása (és elrejtése, ha jóváhagyott listán vagyunk)
        if (h3Titles.length >= 2) {
            if (isApprovedList) {
                h3Titles[0].style.display = 'none'; // Határidő címének elrejtése
                h3Titles[1].innerHTML = `Csoportos kijelölés <span style="font-size:0.7em; color:#ffbd16;">(${db} db)</span>`;
            } else {
                h3Titles[0].style.display = '';     // Határidő címének megjelenítése
                h3Titles[0].innerHTML = `Csoportos leadási határidő <span style="font-size:0.7em; color:#ffbd16;">(${db} db)</span>`;
                h3Titles[1].innerHTML = `Csoportos üzenet írása <span style="font-size:0.7em; color:#ffbd16;">(${db} db)</span>`;
            }
        }

        // 2. Chat ablak cseréje tájékoztató szövegre ÉS a generált listára
        if (messengerDiv) {
            messengerDiv.innerHTML = `
                <div style="text-align:center; padding: 10px; color: #555;">
                    <span class="material-symbols-rounded" style="font-size: 3em; color: #ffbd16;">checklist</span>
                    <h4 style="margin: 10px 0;">${db} értékelés kijelölve</h4>
                    <p style="font-size: 0.9em; margin-bottom: 10px;">
                        ${isApprovedList 
                            ? 'Az alábbi értékelések státuszát csoportosan visszanyithatja:' 
                            : 'Az itt beállított határidő, üzenet és jóváhagyási állapot <b>minden</b> alábbi értékelésre érvényes lesz:'}
                    </p>
                    ${kivalasztottNevekHTML}
                </div>
            `;
        }

        // 3. UI elemek megjelenítése / elrejtése
        if (msgInputArea) {
            // Jóváhagyottaknál elrejtjük a szövegdobozt is!
            msgInputArea.style.display = isApprovedList ? 'none' : ''; 
        }
        
        if (calendarBtnArea) {
            calendarBtnArea.style.display = isApprovedList ? 'none' : ''; 
        }

        // 4. Gomb feliratának átírása
        if (approveBtn) {
            approveBtn.textContent = isApprovedList 
                ? `Felsorolt értékelések visszanyitása (${db})` 
                : `Felsorolt értékelések Jóváhagyása (${db})`;
        }

    } 
    // --- HA MINDENT KIKATTINTOTTAK (Alapállapot visszaállítása) ---
    else {
        if (h3Titles.length >= 2) {
            h3Titles[0].style.display = ''; 
            h3Titles[0].innerHTML = `<span class="ertnev">Kiválasztott</span> értékeléséhez tartozó határidő`;
            h3Titles[1].innerHTML = `<span class="ertnev">Kiválasztott</span> értékeléséhez tartozó üzenetek`;
        }
        if (messengerDiv) {
            messengerDiv.innerHTML = '<p style="text-align:center; color:gray; padding: 20px;">Válasszon ki egy értékelést...</p>';
        }
        
        // Visszaállítjuk a rejtett elemeket alapállapotba
        if (calendarBtnArea) calendarBtnArea.style.display = ''; 
        if (msgInputArea) msgInputArea.style.display = ''; 
        
        if (approveBtn) approveBtn.textContent = 'Értékelés Jóváhagyása';
    }
}