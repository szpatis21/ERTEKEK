import { loadInfoAndInit } from '../info/infoLoader.js';
import { initOlvas, initFrissites, initTorol } from '/private/user/dashCRUD.js'; // Importáld a frissítést és törlést is
import { monitorozCheckek,loadColorMaps } from '/private/user/dashStatic.js'; // <-- Importáld a figyelőt
import{showAlert} from "/both/alert.js"
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

document.addEventListener('change', async (e) => {
    if (e.target.id === 'audit-calendar') {
        const kivalasztottDatum = e.target.value; // pl: "2026-06-01"
        
        // Megkeressük a kijelölt értékelést
        const kijeloltSor = document.querySelector('.meglevok.kijelolt');
        if (!kijeloltSor) {
            showAlert('Kérjük, előbb válasszon ki egy értékelést!');
            e.target.value = ''; // Nullázzuk az inputot
            return;
        }

        const kitoltesId = kijeloltSor.dataset.kitoltesId;

        if (kivalasztottDatum) {
            console.log(`Dátum kiválasztva: ${kivalasztottDatum}, ID: ${kitoltesId}`);
            
            // Kiírjuk a UI-ra a spenbe szép magyar formátumban
            const hataridoSpan = document.getElementById('akthat');
            const hDatum = new Date(kivalasztottDatum);
            if (hataridoSpan) {
                hataridoSpan.textContent = hDatum.toLocaleDateString('hu-HU', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
            }
            
            // IDE JÖN MAJD A FETCH (Adatbázis mentés)
        }
    }
});
document.addEventListener('click', (e) => {
    // Ha a felhasználó a span-ra kattint
    if (e.target.id === 'calendar-btn') {
        const dateInput = document.getElementById('audit-calendar');
        
        if (dateInput) {
            try {
                // Ez a modern, hivatalos módja a naptár szoftveres megnyitásának
                dateInput.showPicker(); 
            } catch (error) {
                // Biztonsági tartalék (fallback) régebbi böngészőkhöz
                dateInput.focus();
                dateInput.click();
            }
        }
    }
});