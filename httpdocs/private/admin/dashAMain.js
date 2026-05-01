// Admin teendők js fájl. - Fő dashboard (Fiókom, A.I., Sablonok, Statisztika)
import { loadInfoAndInit } from '../info/infoLoader.js'; 
import { initAside } from '../user/dashAside.js';
import { InlineQuestionCreator } from './upload/category_creator.js';
const styleTag = document.createElement('style');
initAside();
document.head.appendChild(styleTag);

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
    if (sajtnevElem) sajtnevElem.innerHTML = "&nbsp;" + data.username;

    const holvagyElem = document.querySelector('.holvagyok');
    if (holvagyElem) holvagyElem.innerHTML = data.modulLeiras;

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
            divAi.innerHTML = templates.plussz.main(); 
            divAi.style.display = 'block';
            setTimeout(initAiBeallitasok, 50); // Eredeti logika meghívása
        }
        else if (gombNev === 'Sablonok' && divSablonok) {
            // Frissítjük a Sablonok fül tartalmát a template-ből
            divSablonok.innerHTML = templates.sabik.main(); 
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

document.addEventListener('DOMContentLoaded', () => {
    // Csak akkor fusson le, ha az AI panel létezik a DOM-ban
    const aiContainer = document.getElementById('ai-beallitasok-container');
    if (!aiContainer) return;

    // Elemek
    const radioRovid = document.querySelector('input[name="kontextus-tipus"][value="rovid"]');
    const radioHosszu = document.querySelector('input[name="kontextus-tipus"][value="hosszu"]');
    const divRovid = document.getElementById('kontextus-rovid-div');
    const divHosszu = document.getElementById('kontextus-hosszu-div');
    
    const inputSzerep = document.getElementById('ai-szerep');
    const inputTargy = document.getElementById('ai-vizsgalt-targy');
    const inputKontextus = document.getElementById('ai-kontextus');
    const textSzakmai = document.getElementById('ai-szakmai-anyag');
    
    const promptJellemzes = document.getElementById('ai-prompt-jellemzes');
    const promptFejlesztes = document.getElementById('ai-prompt-fejlesztes');
    const promptErtekeles = document.getElementById('ai-prompt-ertekeles');
    const mentGomb = document.getElementById('ai-mentes-gomb');

    // Rádiógomb váltó logika
    const toggleKontextusView = () => {
        if (radioRovid.checked) {
            divRovid.style.display = 'block';
            divHosszu.style.display = 'none';
        } else {
            divRovid.style.display = 'none';
            divHosszu.style.display = 'block';
        }
    };
    radioRovid.addEventListener('change', toggleKontextusView);
    radioHosszu.addEventListener('change', toggleKontextusView);

    // 1. Adatok betöltése
    const loadAiBeallitasok = async () => {
        if (!userState.modulId) return;

        try {
            const res = await fetch(`/api/ai-beallitasok?modulId=${userState.modulId}`);
            const data = await res.json();
            
            if (data.success) {
                inputSzerep.value = data.adatok.szerep || '';
                inputTargy.value = data.adatok.vizsgalt_targy || '';
                inputKontextus.value = data.adatok.ai_kontextus || '';
                textSzakmai.value = data.adatok.szakmai_anyag || '';
                
                promptJellemzes.value = data.adatok.prompt_jellemzes || '';
                promptFejlesztes.value = data.adatok.prompt_fejlesztes || '';
                promptErtekeles.value = data.adatok.prompt_ertekeles || '';

                if (data.adatok.ai_kontextus && data.adatok.ai_kontextus.trim() !== "") {
                    radioRovid.checked = true;
                } else if (data.adatok.szakmai_anyag && data.adatok.szakmai_anyag.trim() !== "") {
                    radioHosszu.checked = true;
                }
                toggleKontextusView();
            }
        } catch (error) {
            console.error("Hiba az AI beállítások betöltésekor:", error);
        }
    };

    userLoaded.then(loadAiBeallitasok);

    // 2. Adatok mentése
    mentGomb.addEventListener('click', async () => {
        mentGomb.textContent = "Mentés folyamatban...";
        mentGomb.disabled = true;

        const veglegesKontextus = radioRovid.checked ? inputKontextus.value : "";
        const veglegesSzakmai = radioHosszu.checked ? textSzakmai.value : "";

        const payload = {
            modulId: userState.modulId,
            szerep: inputSzerep.value,
            vizsgalt_targy: inputTargy.value,
            ai_kontextus: veglegesKontextus,
            szakmai_anyag: veglegesSzakmai,
            prompt_jellemzes: promptJellemzes.value,
            prompt_fejlesztes: promptFejlesztes.value,
            prompt_ertekeles: promptErtekeles.value
        };

        try {
            const res = await fetch('/api/ai-beallitasok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            
           if (result.success) {
                alert("Beállítások sikeresen mentve!");
                document.querySelectorAll('.edit-ai-field').forEach(btn => {
                    const targetId = btn.getAttribute('data-target');
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        targetEl.disabled = true;
                        targetEl.style.background = '#f4f4f4';
                        targetEl.style.border = '1px solid #ccc';
                        targetEl.style.color = '#555';
                    }
                });
            } else {
                alert("Hiba mentés közben: " + result.message);
            }
        } catch (err) {
            console.error("Mentési hiba:", err);
            alert("Hálózati hiba mentés közben.");
        } finally {
            mentGomb.textContent = "Beállítások mentése";
            mentGomb.disabled = false;
        }
    });
});

// --- AI BEÁLLÍTÁSOK DINAMIKUS BETÖLTÉSE ÉS ESEMÉNYKEZELÉSE ---
export async function initAiBeallitasok() {
    const aiContainer = document.getElementById('ai-beallitasok-container');
    if (!aiContainer || !userState.modulId) return;

    const radioRovid = document.querySelector('input[name="kontextus-tipus"][value="rovid"]');
    const radioHosszu = document.querySelector('input[name="kontextus-tipus"][value="hosszu"]');
    const divRovid = document.getElementById('kontextus-rovid-div');
    const divHosszu = document.getElementById('kontextus-hosszu-div');
    
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
        newContainer.innerHTML = pencilSvg;

        newContainer.addEventListener('click', function(e) {
            const targetId = this.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (!targetEl || !targetEl.disabled) return;

            targetEl.dataset.originalValue = targetEl.value;
            targetEl.disabled = false;
            targetEl.style.background = '#fff';
            targetEl.style.border = '1px solid #ff6500';
            targetEl.focus();

            this.innerHTML = `
                <div style="display: flex; gap: 8px;">
                    <div class="save-sub-btn" style="cursor:pointer">${saveSvg}</div>
                    <div class="cancel-sub-btn" style="cursor:pointer">${cancelSvg}</div>
                </div>
            `;

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
        iconContainer.innerHTML = originalSvg;
    }
}
export async function frissitSablonSzerkeszto() {
    const mainTerulet = document.getElementById('szerkeszto-interaktiv-terulet');
    const lapokTerulet = document.getElementById('alkerdest-szerkeszto-terulet');

    if (!mainTerulet || !lapokTerulet) return;

    // 1. MAIN TERÜLET: Alapértelmezett üres szerkesztő generálása
    mainTerulet.innerHTML = ''; 
    createEditor(mainTerulet, null);

    // 2. LAPOK TERÜLET: Csak a lista konténere
    lapokTerulet.innerHTML = `
        <h3 style="margin-bottom:15px">Meglévő sablonok</h3>
        <div id="sablon-lista-top" class="sablon-top-zone">
            <div style="color: gray; font-size: 0.9em;">Sablonok betöltése...</div>
        </div>
    `;

    const topZone = lapokTerulet.querySelector('#sablon-lista-top');

    // 3. Lekérjük a meglévő sablonokat az adatbázisból
    let mentettSablonok = [];
    try {
        const res = await fetch(`/api/get-sablonok?modulId=${userState.modulId}&userId=${userState.userId}`);
        const data = await res.json();
        if (data.SABLON_CSOPORTOK) {
            mentettSablonok = data.SABLON_CSOPORTOK;
        }
    } catch (err) {
        console.error("Hiba a sablonok lekérésekor:", err);
    }

    // 4. Kártyák renderelése
    topZone.innerHTML = '';

    // "Új sablon" kártya létrehozása és hozzáadása elsőként a listához
    const ujSablonCard = document.createElement('div');
    ujSablonCard.className = 'sablon-karty-mini active'; 
    ujSablonCard.style.border = '2px dashed #ff6500'; // Szaggatott keret a megkülönböztetéshez
    ujSablonCard.style.background = '#fff4e6';
    ujSablonCard.innerHTML = '<span style="color: #ff6500; font-weight: bold;">+ Új sablon</span>';
    
    ujSablonCard.onclick = () => {
        document.querySelectorAll('.sablon-karty-mini').forEach(el => el.classList.remove('active'));
        ujSablonCard.classList.add('active');
        mainTerulet.innerHTML = '';
        createEditor(mainTerulet, null);
    };
    topZone.appendChild(ujSablonCard);

    // Ha nincs még mentett sablon, kiírjuk az üzenetet a gomb alá
    if (mentettSablonok.length === 0) {
        const uresUzenet = document.createElement('div');
        uresUzenet.style.cssText = 'color: gray; font-size: 0.9em; font-style: italic; width: 100%; margin-top: 10px;';
        uresUzenet.textContent = 'Nincsenek még mentett sablonok.';
        topZone.appendChild(uresUzenet);
    }

    // Meglévő sablonok kártyáinak hozzáadása
    mentettSablonok.forEach(sablon => {
        const card = document.createElement('div');
        card.className = 'sablon-karty-mini';
        card.innerHTML = sablon.nev;
        card.onclick = () => {
            // Aktív állapot jelzése
            document.querySelectorAll('.sablon-karty-mini').forEach(el => el.classList.remove('active'));
            card.classList.add('active');
            
            // Szerkesztő generálása a FŐ területre a kiválasztott sablon adataival
            mainTerulet.innerHTML = '';
            createEditor(mainTerulet, sablon);
        };
        topZone.appendChild(card);
    });
}

// --- KÖZÖS SZERKESZTŐ GENERÁLÓ FÜGGVÉNY ---
// Ez rakja össze az interaktív szerkesztőt a megadott konténerbe (mainTerulet vagy bottomZone)
function createEditor(container, sablonData = null) {
    // Használunk class-okat az id-k helyett a belső elemeknél, hogy ne akadjon össze a két szerkesztő!
    container.innerHTML = `
        <div class="szerkeszto-interaktiv-terulet-inner fade-in" style="display: flex; flex-direction: column; gap: 10px;">
            <div class="sokadik" style="display: flex;">
                <div class="tab-nem" style="cursor: pointer; flex: 1 1 0%; text-align: center; padding: 10px; font-weight: bold; border-bottom: 3px solid transparent; opacity: 0.5;">NEM ág alkérdései</div>
                <div class="tab-igen" style="cursor: pointer; flex: 1 1 0%; text-align: center; padding: 10px; font-weight: bold; border-bottom: 3px solid rgb(70, 138, 70); opacity: 1;">IGEN ág kérdései</div>
            </div>
            
            <div class="sablon-oszlop oszlop-nem" style="width: 100%; display: none; flex-direction: column;">
                <div class="mediv">
                    <div class="kerdesmodul new btn-add-sablon-alkerdes" data-ag="nem" style="cursor: pointer; flex: 1; margin-bottom: 0;">
                        <div class="questionadd"><span>Új NEM ág alkérdés hozzáadása</span></div>
                    </div>
                    <div class="kerdesmodul new btn-save-all-sablon" data-ag="nem" style="cursor: pointer; flex: 1;">
                        <div class="questionadd"><span style="color: white;">Sablon mentése</span></div>
                    </div>
                </div>
                <div class="alkerdest-lista lista-nem"></div>
            </div>

            <div class="sablon-oszlop oszlop-igen" style="width: 100%; display: flex; flex-direction: column;">
                <div class="mediv">
                    <div class="kerdesmodul new btn-add-sablon-alkerdes" data-ag="igen" style="cursor: pointer; flex: 1; margin-bottom: 0;">
                        <div class="questionadd"><span>Új IGEN ág alkérdés hozzáadása</span></div>
                    </div>
                    <div class="kerdesmodul new btn-save-all-sablon" data-ag="igen" style="cursor: pointer; flex: 1; margin-bottom: 0; b">
                        <div class="questionadd"><span style="color: white;">Sablon mentése</span></div>
                    </div>
                </div>
                <div class="alkerdest-lista lista-igen"></div>
            </div>
        </div>
    `;

    // Fülek logikája az aktuális konténeren belül
    const tabIgen = container.querySelector('.tab-igen');
    const tabNem = container.querySelector('.tab-nem');
    const oszlopIgen = container.querySelector('.oszlop-igen');
    const oszlopNem = container.querySelector('.oszlop-nem');

    const frissitNezet = (aktivAg) => {
        if (aktivAg === 'igen') {
            oszlopIgen.style.display = 'flex';
            oszlopNem.style.display = 'none';
            oszlopIgen.style.background = '#00800015'
            tabIgen.style.borderBottom = "3px solid #468a46";
            tabNem.style.borderBottom = "3px solid transparent";
            tabIgen.style.opacity = "1";
            tabNem.style.opacity = "0.5";
        } else {
            oszlopIgen.style.display = 'none';
            oszlopNem.style.background = '#ff33002a'
            oszlopNem.style.display = 'flex';
            tabNem.style.borderBottom = "3px solid #ff6500";
            tabIgen.style.borderBottom = "3px solid transparent";
            tabNem.style.opacity = "1";
            tabIgen.style.opacity = "0.5";
        }
    };

    tabIgen.onclick = () => frissitNezet('igen');
    tabNem.onclick = () => frissitNezet('nem');

    // Gombok bekötése az aktuális konténeren belül
    ['igen', 'nem'].forEach(ag => {
        const oszlop = container.querySelector(`.oszlop-${ag}`);
        const lista = oszlop.querySelector(`.lista-${ag}`);

        // Új kérdés gomb
        oszlop.querySelector('.btn-add-sablon-alkerdes').addEventListener('click', () => {
            const kindex = lista.children.length + 1;
            const ujDiv = InlineQuestionCreator.createAlkerdesUI({ kindex: kindex }, false);
            lista.appendChild(ujDiv);
            ujDiv.querySelector('.btn-inline-megse').addEventListener('click', () => ujDiv.remove());
        });

        // Mentés gomb
        oszlop.querySelector('.btn-save-all-sablon').addEventListener('click', () => {
            const elemDivjei = lista.querySelectorAll('.uj-ideiglenes-alkerdes');
            if (elemDivjei.length === 0) return;

            let vanHiba = false;
            elemDivjei.forEach((div) => {
                const szovegInput = div.querySelector('.inline-szoveg-input');
                if (!szovegInput.value.trim()) {
                    vanHiba = true;
                    szovegInput.style.border = "2px solid red";
                } else {
                    szovegInput.style.border = "";
                }
            });

            if (vanHiba) {
                mutassFigyelmeztetest("Fogalmazzon meg kérdést/állítást minden mezőben.");
                return;
            }

            let listaHtml = "";
            const mentendoAdatok = Array.from(elemDivjei).map((div, index) => {
                const szoveg = div.querySelector('.inline-szoveg-input').value.trim();
                const ertek = div.querySelector('.inline-ertek-input').value;
                const szovegesCb = div.querySelector('.inline-szoveges-checkbox');
                const szoveges = szovegesCb ? szovegesCb.checked : false;
                const maxiCb = div.querySelector('.inline-maxi-checkbox');
                const maxi = maxiCb ? maxiCb.checked : false;
                const nemAgCb = div.querySelector('.inline-nem-ag-checkbox');
                const vanNemAg = nemAgCb ? nemAgCb.checked : false;
                const negaltSzovegInput = div.querySelector('.inline-negalt-szoveg-input');
                const negaltSzoveg = negaltSzovegInput ? negaltSzovegInput.value.trim() : "";
                const negaltErtekInput = div.querySelector('.inline-negalt-ertek-input');
                const negaltErtek = negaltErtekInput ? negaltErtekInput.value : 0;

                let tulajdonsag = szoveges ? "<b>szöveges</b>" : `<b>${ertek} pont</b>`;
                listaHtml += `<li style="margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px; color: black; text-align: left;">${index + 1}. ${szoveg} - ${tulajdonsag}</li>`;

                return { szoveg, ertek, szoveges, maxi, vanNemAg, negaltSzoveg, negaltErtek, ag: ag }; 
            });

            const modal = document.createElement('div');
            modal.className = 'color-picker-overlay';
            modal.style.zIndex = "9999";
            
            const alapNev = sablonData ? sablonData.nev : '';

            modal.innerHTML = `
                <div class="color-picker-modal" style="width:550px; max-height:85vh; overflow-y:auto; background: white; padding: 25px; border-radius: 12px;">
                    <h3 style="color: black; margin-top:0;">Sablon mentése</h3>
                    <div class="color-picker-input-container">
                        <label style="color: gray; font-size: 0.85em;">Sablon neve:</label>
                        <input type="text" id="modal-sablon-nev" value="${alapNev}" style="width:100%; padding:12px; margin-top:5px; color: black; border: 1px solid #ccc; border-radius: 6px;">
                    </div>
                    <div style="margin-top:10px;">
                        <p style="color: black; font-weight: bold; border-bottom: 2px solid #ff6500; padding-bottom: 5px;">Választott ág: ${ag.toUpperCase()}</p>
                        <ul style="padding-left:0; list-style:none; max-height: 250px; overflow-y: auto;">${listaHtml}</ul>
                    </div>
                    <div class="color-picker-btn-container" style="margin-top:25px; display: flex; gap: 10px;">
                        <button class="color-picker-btn-cancel" id="modal-megse" style="flex:1;">Vissza</button>
                        <button class="color-picker-btn-save" id="modal-mentes" style="flex:1;">Mentés</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('#modal-megse').onclick = () => modal.remove();
            modal.querySelector('#modal-mentes').onclick = async () => {
                const nevInput = modal.querySelector('#modal-sablon-nev');
                const nev = nevInput.value.trim();
                
                if (!nev) {
                    nevInput.style.border = "2px solid red";
                    mutassFigyelmeztetest("Kérlek, adj meg egy nevet a sablonnak!");
                    return;
                }
                
                const mentesGomb = modal.querySelector('#modal-mentes');
                mentesGomb.disabled = true;
                mentesGomb.textContent = "Mentés folyamatban...";

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
                    
                    if (!res.ok) throw new Error(`Hiba történt`);

                    const data = await res.json();
                    if (data.success) {
                        alert("✓ Sablon sikeresen elmentve!");
                        modal.remove();
                        // Sikeres mentés után frissítjük az EGÉSZ sablon felületet
                        frissitSablonSzerkeszto(); 
                    } else {
                        throw new Error(data.message || "A mentés sikertelen.");
                    }
                } catch (err) {
                    alert("Hiba: " + err.message);
                    mentesGomb.disabled = false;
                    mentesGomb.textContent = "Mentés";
                }
            };
        });
    });

    // --- MEGLÉVŐ ADATOK BETÖLTÉSE A KIVÁLASZTOTT ÁGAKBA ---
    if (sablonData) {
        const igenLista = container.querySelector('.lista-igen');
        sablonData.elemek.filter(e => e.valasz_ag === 'igen').forEach((elem, idx) => {
            const ujDiv = InlineQuestionCreator.createAlkerdesUI({
                kindex: idx + 1, szoveg: elem.szoveg, ertek: elem.ertek, szoveges: elem.szoveges
            }, false);
            igenLista.appendChild(ujDiv);
            ujDiv.querySelector('.btn-inline-megse').addEventListener('click', () => ujDiv.remove());
        });

        const nemLista = container.querySelector('.lista-nem');
        sablonData.elemek.filter(e => e.valasz_ag === 'nem').forEach((elem, idx) => {
            const ujDiv = InlineQuestionCreator.createAlkerdesUI({
                kindex: idx + 1, szoveg: elem.szoveg, ertek: elem.ertek, szoveges: elem.szoveges
            }, false);
            nemLista.appendChild(ujDiv);
            ujDiv.querySelector('.btn-inline-megse').addEventListener('click', () => ujDiv.remove());
        });
    }
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
