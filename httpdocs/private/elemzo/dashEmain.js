import { loadInfoAndInit } from '../info/infoLoader.js';
import { initOlvas, initFrissites, initTorol } from '/private/user/dashCRUD.js'; // Importáld a frissítést és törlést is
import { monitorozCheckek,loadColorMaps } from '/private/user/dashStatic.js'; // <-- Importáld a figyelőt

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

        const letrehozva = new Date().toISOString().split('T')[0];
        
        const adminKitoltesek = kitoltesek.filter(k => k.role === 'admin');
        
        // --- 1. MÓDOSÍTÁS: Elmentjük a tömböt globálisan, hogy a menü kattintáskor is meglegyen ---
        window.elemzoKitoltesek = adminKitoltesek;

        // Lista generálása az eredeti nézethez
        initOlvas(adminKitoltesek, letrehozva, { groupByCreator: true, isElemzo: true });
        
        initFrissites({ userId, letrehozva });
        initTorol();
        monitorozCheckek(); 

        // --- 2. MÓDOSÍTÁS: Meghívjuk rögtön a betöltéskor is ---
        initAuditLista(adminKitoltesek);

    } catch (error) {
        console.error('Hiba az intézményi kitöltések betöltése során:', error);
    }
}

// --- 3. ÚJ RÉSZ: Figyeljük, ha az Elemző rákattint az "Engedélyek" gombra ---
document.addEventListener('click', (e) => {
    // Ha az id="hozzaj" (vagy a szülője) gombra kattintanak a bal menüben
    if (e.target.closest('#hozzaj') || e.target.closest('#hozzaj0')) {
        // Várunk egy picit (150ms), hogy a dashAside.js biztosan legenerálja a HTML konténereket
        setTimeout(() => {
            if (window.elemzoKitoltesek) {
                initAuditLista(window.elemzoKitoltesek);
            }
        }, 150);
    }
});


// (Itt folytatódik a kódod az export function initAuditLista(kitoltesek) résszel)
// Új függvény az Audit/Engedélyek listák generálására
export function initAuditLista(kitoltesek) {
    // 1. Megkeressük a konténereket a DOM-ban
    const okContainer = document.querySelector('.inner-div-ok');
    const notOkContainer = document.querySelector('.inner-div-notok');

    // Ha nincsenek a képernyőn (pl. nincs megnyitva az Engedélyek fül), kilépünk
    if (!okContainer || !notOkContainer) return;

    // 2. Kiürítjük az eddigi tartalmat, hogy ne duplikálódjon
    okContainer.innerHTML = '';
    notOkContainer.innerHTML = '';

    // 3. Szétválogatjuk az értékeléseket
    // (A dupla == megengedőbb, ha esetleg stringként jönne az "1" vagy "2")
    const pendingItems = kitoltesek.filter(k => k.audit == 1);
    const approvedItems = kitoltesek.filter(k => k.audit == 2);

    // 4. Belső segédfüggvény a csoportosított rendereléshez (hogy ne írjuk le kétszer ugyanazt)
    function renderGroupedList(items, container) {
        if (items.length === 0) {
            container.innerHTML = '<p style="color: gray; font-size: small; text-align: center; margin-top: 10px;">Nincs megjeleníthető értékelés.</p>';
            return;
        }

        // Névsorba rendezzük a készítők neve szerint (ugyanúgy, mint az initOlvas-ban)
        items.sort((a, b) => (a.creator_name || '').localeCompare(b.creator_name || ''));

        let currentWrapper = null;
        let currentList = null;
        let lastCreatorName = null;

        items.forEach(kitoltes => {
            // Csoportosítás logikája (Fejléc létrehozása)
            if (kitoltes.creator_name !== lastCreatorName) {
                currentWrapper = document.createElement('div');
                currentWrapper.classList.add('creator-wrapper');

                const csoport = document.createElement('div');
                csoport.classList.add('tarolo');
                
                const header = document.createElement('div');
                header.classList.add('creator-head');
                header.textContent = kitoltes.creator_name || 'Ismeretlen';
                
                currentList = document.createElement('div');
                currentList.classList.add('creator-list');

                currentWrapper.append(header, currentList);
                csoport.append(currentWrapper);
                container.appendChild(csoport);
                
                lastCreatorName = kitoltes.creator_name;
            }

            // Kártya és tartály létrehozása
            const tartaly = document.createElement("div");
            tartaly.classList.add("tart");

            const kitoltesDiv = document.createElement('div');
            kitoltesDiv.classList.add('meglevok');
            kitoltesDiv.style.cursor = 'pointer'; // Hogy látszódjon, hogy kattintható
            
            // Adatok felvétele a DOM elemre (dataset)
            kitoltesDiv.dataset.kitoltesId = kitoltes.idk;
            kitoltesDiv.dataset.auditId = kitoltes.audit;
            
            // HTML tartalom összeállítása (Gombok és checkbox nélkül!)
            const decryptedName = kitoltes.vizsgalt_nev || 'Ismeretlen alany';
            const nameHtml = `<div class="vizsgalt-nev"><strong>${decryptedName}</strong></div>`;
            const formattedText = (kitoltes.kitoltes_neve || '').replace(/-/g, ' - <br>');

            kitoltesDiv.innerHTML = nameHtml + formattedText;

            // KATTINTÁS ESEMÉNY - Jelenleg csak vizuális kijelölés, később ide jön a chat betöltése
           // KATTINTÁS ESEMÉNY A CHAT MEGNYITÁSÁHOZ
           kitoltesDiv.addEventListener('click', async (event) => {
                // Vizuális kijelölés a listában
                document.querySelectorAll('.inner-div-ok .meglevok.kijelolt, .inner-div-notok .meglevok.kijelolt').forEach(el => el.classList.remove('kijelolt'));
                kitoltesDiv.classList.add('kijelolt');
                
                // --- ÚJ RÉSZ: UI elemek elrejtése/módosítása a státusz alapján ---
                const calendarBtn = document.getElementById('audit-calendar');
                // Megkeressük az üzenetküldő input szülő div-jét, hogy az egészet eltüntessük
                const msgInputArea = document.getElementById('audit-msg-input') ? document.getElementById('audit-msg-input').closest('.audit-input-area') : null;
                const approveBtn = document.getElementById('audit-approve-btn');

                if (kitoltes.audit == 2) {
                    // 2-es státusz (Lezárt): Elrejtjük a fölösleges dolgokat és átírjuk a gombot
                    if (calendarBtn) calendarBtn.style.display = 'none';
                    if (msgInputArea) msgInputArea.style.display = 'none';
                    if (approveBtn) approveBtn.textContent = 'Értékelés visszanyitása';
                } else {
                    // 1-es státusz (Aktív): Minden látható, gomb szövege az eredeti
                    if (calendarBtn) calendarBtn.style.display = ''; // Az üres string visszaállítja az eredeti CSS-t (blokk/inline)
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
                                    <div class="uzenet" title="${idoHover}" data-ido="${msg.timestamp}">
                                        <div class="nev1">${megjelenitendoNev}</div>
                                        <div class="audit-messages1">${msg.text}</div>
                                    </div>`;
                                } else {
                                    chatHtml += `
                                    <div class="uzenet" title="${idoHover}" data-ido="${msg.timestamp}">
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
    renderGroupedList(pendingItems, notOkContainer);
}