import { loadInfoAndInit } from '../info/infoLoader.js';
import { initOlvas, initFrissites, initTorol } from '/private/user/dashCRUD.js'; 
import { monitorozCheckek, loadColorMaps } from '/private/user/dashStatic.js'; 
import { showAlert, customConfirm, customDatePrompt } from "/both/alert.js";
import { initAuditLista } from './dashAudit.js';

console.log("Elemző modul aktív");

// Globális változók, amiket később más modulok is használhatnak
export let modulId, modulNev, modulLeiras, userId, userName, intezmeny, intezmeny_id;

// --- EZ HIÁNYZOTT: A globális függvény, amit a dashAside.js meghív a fül váltásakor! ---
window.renderAuditListaDOM = () => {
    if (window.elemzoKitoltesek) {
        initAuditLista(window.elemzoKitoltesek);
    }
};

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
        
        // Elmentjük a tömböt globálisan, hogy a menü kattintáskor is meglegyen
        window.elemzoKitoltesek = adminKitoltesek;

        // Lista generálása az eredeti nézethez
        initOlvas(adminKitoltesek, letrehozva, { groupByCreator: true, isElemzo: true });
        initFrissites({ userId, letrehozva });
        initTorol();
        monitorozCheckek(); 

        // Meghívjuk rögtön a betöltéskor is
        initAuditLista(adminKitoltesek);

    } catch (error) {
        console.error('Hiba az intézményi kitöltések betöltése során:', error);
    }
}

// --- ÚJ HATÁRIDŐ GOMB ESEMÉNY (Custom Prompttal) ---
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#calendar-btn');
    
    if (btn) {
        // 1. Megkeressük a kijelölt értékelést a DOM-ban
        const kijeloltSor = document.querySelector('.meglevok.kijelolt');
        
        if (!kijeloltSor) {
            showAlert('Kérjük, előbb válasszon ki egy értékelést!');
            return;
        }

        // 2. Adatok kinyerése a dataset-ből
        const kitoltesId = kijeloltSor.dataset.kitoltesId;
        const currNev = kijeloltSor.dataset.nev || 'Ismeretlen';
        const currIdoszak = kijeloltSor.dataset.periodus || '';
        const currTipus = kijeloltSor.dataset.megnev || '';
        const teljesNev = `${currNev} (${currIdoszak} - ${currTipus})`;

        // 3. Dátum bekérése a naptáras ablakkal
        const valasztottDatum = await customDatePrompt(teljesNev);
        
        if (!valasztottDatum) return; 

        // 4. Megerősítő ablak
        const confirmMsg = `Biztos, hogy beállítja a(z) <b>${valasztottDatum}</b> határidőt a(z) <b>${teljesNev}</b> értékeléshez?<br><br><span style="font-size:0.85em; color:gray;">Az értékelő kollégát erről e-mailben értesítjük.</span>`;
        const megerosites = await customConfirm(confirmMsg);

        if (!megerosites) return; 

        // 5. Backend hívás
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
                
                // Vizuális frissítések a felületen
                const hataridoSpan = document.getElementById('akthat');
                const hDatum = new Date(valasztottDatum);
                if (hataridoSpan) {
                    hataridoSpan.textContent = hDatum.toLocaleDateString('hu-HU', {
                        year: 'numeric', month: 'short', day: 'numeric'
                    });
                }
                
                kijeloltSor.classList.add("hatarido");
                kijeloltSor.dataset.auditId = "1";
                
                setTimeout(() => {
                    getUserAndLoadAllKitoltesek();
                }, 1500);

            } else {
                showAlert('Hiba történt: ' + data.message);
            }
        } catch (error) {
            console.error('Fetch hiba:', error);
            showAlert('Szerver hiba történt a határidő mentése során.');
        }
    }
});

// --- AUDIT FÜLEK LOGIKÁJA ---
document.addEventListener("DOMContentLoaded", () => {
    // Kiválasztjuk a gombokat és a mozgatható elemeket
    const tabButtons = document.querySelectorAll(".audit-tab-btn");
    const sliderBg = document.querySelector(".audit-tab-slider-bg");
    const contentSlider = document.querySelector(".audit-content-slider");

    function initAuditTabs() {
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

    initAuditTabs();
});