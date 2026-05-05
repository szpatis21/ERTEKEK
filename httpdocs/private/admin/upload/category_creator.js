import{showAlert} from "/both/alert.js"
export class CategoryCreator {
    // --- Színkonvertáló matematikai segédfüggvények ---
    static hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        return [r, g, b];
    }

    static rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    static hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    static kalkulaldDiagramSzineket(hexColor, numSegments) {
        const [r, g, b] = this.hexToRgb(hexColor);
        const [h, s, l] = this.rgbToHsl(r, g, b);
        const backgroundColors = [];
        for (let index = 0; index < numSegments; index++) {
            const lightnessStep = 0.4 / (numSegments || 1); 
            const newL = Math.max(0.1, Math.min(0.9, l + (index * lightnessStep) - 0.2)); 
            const [newR, newG, newB] = this.hslToRgb(h, s, newL);
            backgroundColors.push(`rgba(${newR}, ${newG}, ${newB}, 0.8)`);
        }
        return backgroundColors;
    }

    // --- Fő megnyitó metódus ---
    static open() {
        return new Promise((resolve) => {
            const alapSzin = "#006cb5"; // Alapértelmezett induló szín 

            const overlay = document.createElement('div');
            overlay.className = 'color-picker-overlay';

            const modal = document.createElement('div');
            modal.className = 'color-picker-modal';
            modal.style.width = '450px'; 

            modal.innerHTML = `
                <h3 class="color-picker-title">
                    Új főkategória létrehozása
                </h3>

                <div class="minta" style="display: flex; gap: 15px; margin-bottom: 25px;">
                    <div style="flex: 1;">
                        <p class="color-picker-preview-label">Kártya:</p>
                        <div id="creator-preview-card" class="category fo color-picker-preview-card" style="background: ${alapSzin}; min-height: 100px;">
                            <div class="cim" id="preview-cim">Új kategória neve</div>
                            <div class="leiras" id="preview-leiras" style="font-size: 0.85em; margin-top: 5px;">Ide kerül a rövid leírás...</div>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <p class="color-picker-preview-label">Diagram árnyalatok:</p>
                        <div style="position: relative; height: 120px; width: 100%;">
                            <canvas id="creator-preview-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="color-picker-input-container">
                    <label class="color-picker-label">Cím:</label>
                    <input type="text" id="creator-cim" placeholder="pl. Általános jellemzők" style="width: 100%; color: black; font-family: inherit;">
                </div>

                <div class="color-picker-input-container">
                    <label class="color-picker-label">Leírás:</label>
                    <textarea id="creator-leiras" rows="2" placeholder="Rövid tájékoztató..." style="width: 100%; color: black; font-family: inherit;"></textarea>
                </div>

                <div class="color-picker-input-container">
                    <label class="color-picker-label">Alapszín:</label>
                    <input type="color" id="creator-szin" class="color-picker-input" value="${alapSzin}">
                </div>

                <div class="color-picker-btn-container">
                    <button id="creator-megse" class="color-picker-btn-cancel">Mégse</button>
                    <button id="creator-ok" class="color-picker-btn-save">Létrehozás</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const inputCim = modal.querySelector('#creator-cim');
            const inputLeiras = modal.querySelector('#creator-leiras');
            const inputSzin = modal.querySelector('#creator-szin');
            
            const previewCard = modal.querySelector('#creator-preview-card');
            const previewCim = modal.querySelector('#preview-cim');
            const previewLeiras = modal.querySelector('#preview-leiras');

            const btnOk = modal.querySelector('#creator-ok');
            const btnMegse = modal.querySelector('#creator-megse');

            // --- Chart.js Inicializálása ---
            const canvas = modal.querySelector('#creator-preview-chart');
            const ctx = canvas.getContext('2d');
            const dummyLabels = ['1', '2', '3']; // 3 szelet a mintához
            
            const previewChart = new Chart(ctx, {
                type: 'polarArea',
                data: {
                    labels: dummyLabels,
                    datasets: [{
                        data: [80, 60, 95],
                        backgroundColor: this.kalkulaldDiagramSzineket(alapSzin, dummyLabels.length),
                        borderColor: '#fff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { r: { ticks: { display: false } } },
                    animation: { duration: 0 }
                }
            });

            // --- Élő frissítések eseménykezelői ---
            inputCim.addEventListener('input', () => {
                previewCim.textContent = inputCim.value || "Új kategória neve";
            });

            inputLeiras.addEventListener('input', () => {
                previewLeiras.textContent = inputLeiras.value || "Ide kerül a rövid leírás...";
            });

            inputSzin.addEventListener('input', (e) => {
                const ujSzin = e.target.value;
                previewCard.style.background = ujSzin; // Kártya színe
                previewChart.data.datasets[0].backgroundColor = this.kalkulaldDiagramSzineket(ujSzin, dummyLabels.length); // Diagram színei
                previewChart.update();
            });

            // --- Kilépés és visszatérés ---
            const close = (valasz) => {
                if (previewChart) previewChart.destroy();
                document.body.removeChild(overlay);
                resolve(valasz);
            };

            btnMegse.addEventListener('click', () => close(null));
            
            btnOk.addEventListener('click', () => {
                const cim = inputCim.value.trim();
                if (!cim) {
showAlert("A főkategória neve nem lehet üres!"); // alert() helyett                    
            return;
                }
                close({
                    ujCim: cim,
                    ujLeiras: inputLeiras.value.trim(),
                    ujSzin: inputSzin.value
                });
            });
        });
    }
}

export class InlineQuestionCreator {
static createAlkerdesUI(options = {}, isStandalone = false) {
        const {
            alkId = null, 
            parentId = null, 
            kindex = 1,
            szoveg = "",
            ertek = 0,
            szoveges = false,
            maxi = false,
            vanNemAg = false,
            negaltSzoveg = "",
            negaltErtek = 0
        } = options;

        const veglegesId = alkId ? alkId : (Date.now() + Math.floor(Math.random() * 1000));
        const div = document.createElement('div');
        div.classList.add('kerdesmodul', 'uj-ideiglenes-alkerdes');
        
       div.setAttribute('data-kindex', kindex);
        if (alkId) div.setAttribute('data-alk-id', alkId); 
        if (parentId) div.setAttribute('data-parent-id', parentId);
        
        div.style.marginTop = '10px';

        div.innerHTML = `
            <input class="kerdes-sorszam-jelzo2" type="number" value="${kindex}">
            <div data-id="${veglegesId}" data-parent-id="${parentId || ''}" data-value="0" class="question">
                <div class="inline-fejlec">
                    <label><input type="checkbox" class="inline-maxi-checkbox" ${maxi ? 'checked' : ''}> Maximalizálja a pontszámot</label>
                    <label><input type="checkbox" class="inline-szoveges-checkbox" ${szoveges ? 'checked' : ''}> Szöveges (nem pontozott)</label>
                    <label class="inline-nem-ag-label" style="display: ${szoveges ? 'none' : 'inline'};"><input type="checkbox" class="inline-nem-ag-checkbox" ${vanNemAg ? 'checked' : ''}> Rendelkezik NEM ággal</label>
                </div>
                <div style="display: flex; width: 100%; align-items: center; justify-content: space-between;">
                    <div class="color-picker-input-container inline-szoveg-container" style="padding: 0px;">
                        <input type="text" class="editor-input-number inline-szoveg-input" style="padding: 0px; border: 1px solid #008000fc;background: #468a4612;" placeholder="Fogalmazza meg az alkérdést/állítást..." value="${escapeAttr(szoveg)}">
                        <input type="text" class="editor-input-number inline-negalt-szoveg-input" style="display: ${vanNemAg && !szoveges ? 'block' : 'none'}; padding: 0px;" placeholder="Fogalmazza meg az alkérdés tagadását..." value="${escapeAttr(negaltSzoveg)}">
                    </div>                        
                    <div class="szerkesztolec inline-szerkesztolec">
                        <div>
                            <div class="ertek inline-ertek-blokk" style="display: ${szoveges ? 'none' : 'flex'};">
                                <input type="number" class="inline-ertek-input" value="${ertek}"> pont (Igen)
                            </div>
                            <div class="ertek inline-negalt-ertek-container inline-ertek-blokk" style="display: ${vanNemAg && !szoveges ? 'block' : 'none'};">
                                <input type="number" class="inline-negalt-ertek-input" value="${negaltErtek}"> pont (Nem)
                            </div>
                        </div> 
                    </div>
                </div>
            </div>
            <div class="kisgombok">
                ${isStandalone ? `
                <button class="btn-inline-mentes szerkesztogomb" title="Mentés">
                    <span class="material-symbols-rounded inline-icon">check_circle</span>
                </button>
                ` : ''}
                <button class="btn-inline-megse szerkesztogomb" title="Mégse / Törlés">
                    <span class="material-symbols-rounded inline-icon">cancel</span>
                </button>
            </div>
        `;

        // --- DOM Elemek kinyerése és Eseménykezelők bekötése az újonnan generált elemen ---
        const subSzovegesCb = div.querySelector('.inline-szoveges-checkbox');
        const subMaxiLabel = div.querySelector('.inline-maxi-checkbox').closest('label');
        const subErtekBlokk = div.querySelector('.inline-ertek-blokk'); 
        const subNemAgCb = div.querySelector('.inline-nem-ag-checkbox');
        const subNemAgLabel = subNemAgCb.closest('label');
        const subNegaltSzovegInput = div.querySelector('.inline-negalt-szoveg-input');
        const subNegaltErtekContainer = div.querySelector('.inline-negalt-ertek-container');

        // NEM ág logika
        subNemAgCb.addEventListener('change', (e) => {
            if (e.target.checked) {
                subNegaltSzovegInput.style.display = 'block';
                subNegaltErtekContainer.style.display = 'block';
                subNegaltSzovegInput.focus();
            } else {
                subNegaltSzovegInput.style.display = 'none';
                subNegaltErtekContainer.style.display = 'none';
                subNegaltSzovegInput.value = '';
                div.querySelector('.inline-negalt-ertek-input').value = '0';
            }
        });

        // Szöveges checkbox logika
        subSzovegesCb.addEventListener('change', (e) => {
            if (e.target.checked) {
                subMaxiLabel.style.display = 'none';
                subErtekBlokk.style.display = 'none';
                subNemAgLabel.style.display = 'none';
                if (subNemAgCb.checked) {
                    subNemAgCb.checked = false;
                    subNemAgCb.dispatchEvent(new Event('change'));
                }
            } else {
                subMaxiLabel.style.display = '';
                subErtekBlokk.style.display = 'flex';
                subNemAgLabel.style.display = '';
            }
        });

        return div;
    }
    static open(tartaly, kindex, foKategoriaNev, alKategoriaNev, altTemaNev) {
        return new Promise((resolve) => {
            const tempId = Date.now();
            
            const ujKerdesHTML = `
            <div class="kerdesmodul uj-ideiglenes-kerdes" data-kindex="${kindex}">
                
                <input class="kerdes-sorszam-jelzo2" type="number" value="${kindex}">

                <div data-id="${tempId}" data-value="0" class="question">
                    
                    <div class="inline-fejlec">
                        <label>
                            <input type="checkbox" class="inline-maxi-checkbox"> Maximalizálja a pontszámot
                        </label>
                        <label>
                            <input type="checkbox" class="inline-szoveges-checkbox"> Szöveges (nem pontozott)
                        </label>
                        <label class="inline-nem-ag-label">
                            <input type="checkbox" class="inline-nem-ag-checkbox"> Rendelkezik NEM ággal
                        </label>
                    </div>
                    <p class="pi">(Alkérdés hozzáadásához, húzza a csúszkát a kívánt helyre (<span style="color:green"> igen</span>/ ha van:<span style="color:red"> nem</span>))</p>
                <div style="display: flex; width: 100%; align-items: center; justify-content: space-between;">
                    <div class="color-picker-input-container inline-szoveg-container" style="padding: 0px;">
                        <input type="text" class="editor-input-number inline-szoveg-input" style="padding: 0px; border: 1px solid #008000fc;background: #468a4612;" placeholder="Fogalmazza meg a kérdést/állítást...">
                        
                        <input type="text" class="editor-input-number inline-negalt-szoveg-input" style="display: none; padding: 0px;" placeholder="Fogalmazza meg a kérdés tagadását...">
                    </div>                        
                    
                    <div class="csuszka csuszka-valtozo">
                        <label class="labelnem" style="display: none;">
                            <input type="radio" class="nem" name="valasz-${tempId}" value="nem">
                            <div class="material-symbols-rounded nemszoveg" style="color: grey; transition: all 0.3s ease;">close</div>
                        </label>

                        <label class="labelures">
                            <input type="radio" class="ures" name="valasz-${tempId}" value="ures" checked>
                            <div class="material-symbols-rounded uresszoveg" title="Kattintson a válasz elvetéséhez.">settings_ethernet</div>
                        </label>

                        <label class="labeligen">
                            <input type="radio" class="igen" name="valasz-${tempId}" value="igen">
                            <div class="material-symbols-rounded igenszoveg">check</div>
                        </label>
                        <div class="gomboc" style="transform: translate(-20px, 0px) rotate(45deg);"></div>
                    </div>
                    
                    <div class="szerkesztolec inline-szerkesztolec">
                         <div>
                        <div class="ertek inline-ertek-blokk">
                            <input type="number" class="inline-ertek-input" value="0"> pont (Igen)
                        </div>

                        <div class="ertek inline-negalt-ertek-container inline-ertek-blokk" style="display: none;">
                            <input type="number" class="inline-negalt-ertek-input" value="0"> pont (Nem)
                        </div>
                        
                       
                        </div> 
                      
                    </div>
                    
                    

                </div>
                 <div class="alkerdeskont question-container fade-in hidden" id="alkerdesek-${tempId}" style="filter: none; flex-direction: column; width: 100%;">
                    
                    <div class="alki">
                        <div class="kerdesmodul new btn-add-ideiglenes-alkerdes" style="cursor: pointer; flex: 1; margin-bottom: 0;">
                            <div class="questionadd">
                                <span class="add-alkerdes-szoveg">Új alkérdés hozzáadása</span>
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
                            </div>
                        </div>
                        
                        <div class="kerdesmodul new" style="flex: 1; margin-bottom: 0; padding: 0; display: flex;">
                            <div class="questionadd" style="width: 100%;">
                                <select class="sablon-select" style="width: 100%; background: transparent; border: none; font-family: inherit; font-size: inherit; font-weight: inherit; color: inherit; cursor: pointer; text-align: center; text-align-last: center; outline: none; appearance: none;">
                                    <option value="" disabled selected>Alkérdés sablon betöltése ▾</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="ideiglenes-alkerdesek-lista-igen" style="display: none; width: 100%;"></div>
                    <div class="ideiglenes-alkerdesek-lista-nem" style="display: none; width: 100%;"></div>
                    
                </div>
                </div>
                  <div class="kisgombok muti">
                            <button class="btn-inline-mentes szerkesztogomb" title="Mentés">
                                <span class="material-symbols-rounded inline-icon">check_circle</span>
                            </button>
                            <button class="btn-inline-megse szerkesztogomb" title="Mégse">
                                <span class="material-symbols-rounded inline-icon">cancel</span>
                            </button>
                        </div>
            </div>
            `;

            tartaly.insertAdjacentHTML('beforeend', ujKerdesHTML);
            const ujModul = tartaly.lastElementChild;
            ujModul.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // --- JAVASCRIPT LOGIKA ---
            const radios = ujModul.querySelectorAll('input[type="radio"]');
            const csuszkaValtozo = ujModul.querySelector('.csuszka-valtozo');
            const gomboc = ujModul.querySelector('.gomboc');
            const kartya = ujModul.querySelector('.question');
            const igenIkon = ujModul.querySelector('.igenszoveg');
            const nemIkon = ujModul.querySelector('.nemszoveg');
            const uresIkon = ujModul.querySelector('.uresszoveg');

            const alkerdesKont = ujModul.querySelector(`#alkerdesek-${tempId}`);
            const btnAddAlkerdes = alkerdesKont.querySelector('.btn-add-ideiglenes-alkerdes');
            const btnAddSzoveg = alkerdesKont.querySelector('.add-alkerdes-szoveg');
            const listaIgen = alkerdesKont.querySelector('.ideiglenes-alkerdesek-lista-igen');
            const listaNem = alkerdesKont.querySelector('.ideiglenes-alkerdesek-lista-nem');
            const foSzovegInput = ujModul.querySelector('.inline-szoveg-input');
            // --- SABLONOK BETÖLTÉSE ÉS LOGIKÁJA ---
        let betoltottSablonCsoportok = [];
            
            // 1. Lekérjük a felhasználó hiteles adatait
            fetch('/get-username')
                .then(res => res.json())
                .then(user => {
                    if (user.success) {
                        // 2. A hiteles adatokkal lekérjük a sablonokat
                        return fetch(`/api/get-sablonok?modulId=${user.modulId}&userId=${user.id}`);
                    } else {
                        throw new Error("Nincs bejelentkezve");
                    }
                })
                .then(res => res.json())
                .then(data => { 
                    if (data.SABLON_CSOPORTOK) {
                        betoltottSablonCsoportok = data.SABLON_CSOPORTOK;
                    }
                })
                .catch(err => console.error("Sablon betöltés hiba:", err));
          const sablonSelect = ujModul.querySelector('.sablon-select');
            
            // Dinamikusan frissíti a select opciókat (Csoport neveket listáz)
            const frissitSablonSelect = (ag) => {
                sablonSelect.innerHTML = '<option value="" disabled selected>Alkérdés sablon betöltése ▾</option>';
                betoltottSablonCsoportok.forEach((csoport, index) => {
                    // Csak akkor mutatjuk a csoportot, ha van benne a kiválasztott ághoz tartozó elem
                    const vanMegfeleloElem = csoport.elemek.some(e => e.valasz_ag === ag);
                    if (vanMegfeleloElem) {
                        const opt = document.createElement('option');
                        opt.textContent = csoport.nev;
                        opt.value = index; // Csoport indexének tárolása
                        sablonSelect.appendChild(opt);
                    }
                });
            };

            // Eseménykezelő a Sablon CSOPORT kiválasztásához
            sablonSelect.addEventListener('change', (e) => {
                const csoportIndex = e.target.value;
                if (csoportIndex === "") return;

                const csoport = betoltottSablonCsoportok[csoportIndex];
                const ag = btnAddAlkerdes.dataset.ag;
                const lista = ag === 'igen' ? listaIgen : listaNem;

                // Kiszedjük a csoporthoz tartozó, adott ágú elemeket
                const relevansElemek = csoport.elemek.filter(s => s.valasz_ag === ag);

                // Végigmegyünk az elemeken és mindet legeneráljuk
                relevansElemek.forEach(sablon => {
                    const subKindex = lista.querySelectorAll('.uj-ideiglenes-alkerdes').length + 1;

                    const ujSub = InlineQuestionCreator.createAlkerdesUI({
                        kindex: subKindex,
                        szoveg: sablon.szoveg,
                        ertek: sablon.ertek,
                        szoveges: sablon.szoveges
                    }, false);
                    
                    lista.appendChild(ujSub);

                    // Törlés gomb logikája az új elemekhez
                    ujSub.querySelector('.btn-inline-megse').addEventListener('click', () => {
                        ujSub.remove();
                        lista.querySelectorAll('.uj-ideiglenes-alkerdes').forEach((el, idx) => {
                            el.querySelector('.kerdes-sorszam-jelzo2').value = idx + 1;
                            el.dataset.kindex = idx + 1;
                        });
                    });
                });

                // Legörgetünk a lista végére, hogy látszódjon a művelet
                if (lista.lastElementChild) {
                    lista.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                e.target.value = ""; // Select visszaállítása
            });
            const updateAddButtonText = () => {
                const ag = btnAddAlkerdes.dataset.ag;
                if (!ag) return;
                
                const inputVal = foSzovegInput.value.trim();
                const roviditettInput = inputVal.length > 20 
                    ? inputVal.substring(0, 20) + '...' 
                    : inputVal;

                const fokerdesHivatkozas = roviditettInput ? `a(z) <span class="idezet">"${roviditettInput}"</span> kérdéshez` : 'az új főkérdéshez';
                
                btnAddSzoveg.innerHTML = `Alkérdés hozzáadása (${ag} válasz esetén) ${fokerdesHivatkozas}`;
            };
            
            // Ha gépelünk a főkérdés inputjába, frissül a gomb is
            foSzovegInput.addEventListener('input', updateAddButtonText);
            // Főkérdés csúszka animáció és alkérdés gomb megjelenítése
          radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const val = e.target.value;
                    const isKetAgu = csuszkaValtozo.classList.contains('csuszka2'); 
                    
                    if (val === 'igen') {
                        gomboc.style.boxShadow = "inset 0px 0px 3px 1px #88ca00";
                        gomboc.style.background = "rgb(145 204 0)";
                        gomboc.style.transform = isKetAgu ? "translate(42px, 0px) rotate(-135deg)" : "translate(28px, 0px) rotate(135deg)"; 
                        kartya.style.boxShadow = "inset 6px 0px 1px 1px #0d8200a3";
                        kartya.style.background = "rgb(48 255 0 / 8%)";
                        igenIkon.style.color = "white"; nemIkon.style.color = "grey"; uresIkon.style.color = "grey";
                        
                        alkerdesKont.classList.remove('hidden');
                        listaIgen.style.display = 'block';
                        listaNem.style.display = 'none';
                        btnAddAlkerdes.dataset.ag = 'igen';
                        updateAddButtonText(); // <-- Gomb szövegének frissítése
                        frissitSablonSelect('igen');
                        setTimeout(() => {
                            alkerdesKont.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);

                    } else if (val === 'nem') {
                        gomboc.style.boxShadow = "inset 0px 0px 3px 1px red";
                        gomboc.style.background = "#ff0000";
                        gomboc.style.transform = "translate(-38px, 0px) rotate(135deg)";
                        kartya.style.boxShadow = "inset 6px 0px 1px 1px #e2000033";
                        kartya.style.background = "rgb(255 0 0 / 6%)";
                        nemIkon.style.color = "white"; igenIkon.style.color = "grey"; uresIkon.style.color = "grey";

                        alkerdesKont.classList.remove('hidden');
                        listaIgen.style.display = 'none';
                        listaNem.style.display = 'block';
                        btnAddAlkerdes.dataset.ag = 'nem';
                        updateAddButtonText(); // <-- Gomb szövegének frissítése
                         frissitSablonSelect('nem'); 

                        setTimeout(() => {
                            alkerdesKont.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);

                    } else { 
                        gomboc.style.boxShadow = "inset 0px 0px 3px 1px grey";
                        gomboc.style.background = "transparent";
                        gomboc.style.transform = isKetAgu ? "translate(0px, 0px) rotate(45deg)" : "translate(-20px, 0px) rotate(45deg)";
                        kartya.style.boxShadow = "none";
                        kartya.style.background = "";
                        uresIkon.style.color = "black"; igenIkon.style.color = "grey"; nemIkon.style.color = "grey";

                        alkerdesKont.classList.add('hidden');
                    }
                });
            });

            // Főkérdés "NEM ág" checkbox dinamikája
            const nemAgCheckbox = ujModul.querySelector('.inline-nem-ag-checkbox');
            const negaltSzovegInput = ujModul.querySelector('.inline-negalt-szoveg-input');
            const negaltErtekContainer = ujModul.querySelector('.inline-negalt-ertek-container');
            const labelNem = ujModul.querySelector('.labelnem');
            const radioNem = ujModul.querySelector('.nem');
            const uresRadioInput = ujModul.querySelector('input[value="ures"]');
            
            nemAgCheckbox.addEventListener('change', (e) => {
                const igenLabel = ujModul.querySelector('[class^="labeligen"]');
                const uresLabel = ujModul.querySelector('[class^="labelures"]');
                const igenRadioInput = ujModul.querySelector('input[value="igen"]');

                if (e.target.checked) {
                    negaltSzovegInput.style.display = 'block';
                    negaltErtekContainer.style.display = 'block';
                    labelNem.style.display = 'inline-block';
                    
                    csuszkaValtozo.classList.replace('csuszka', 'csuszka2');
                    igenLabel.classList.replace('labeligen', 'labeligen2');
                    uresLabel.classList.replace('labelures', 'labelures2');
                    igenRadioInput.classList.replace('igen', 'igen2');
                    uresRadioInput.classList.replace('ures', 'ures2');

                    if (uresRadioInput.checked) gomboc.style.transform = "translate(0px, 0px) rotate(45deg)";
                    if (igenRadioInput.checked) gomboc.style.transform = "translate(42px, 0px) rotate(-135deg)";
                    negaltSzovegInput.focus();
                } else {
                    negaltSzovegInput.style.display = 'none';
                    negaltErtekContainer.style.display = 'none';
                    labelNem.style.display = 'none';
                    negaltSzovegInput.value = ''; 
                    
                    csuszkaValtozo.classList.replace('csuszka2', 'csuszka');
                    igenLabel.classList.replace('labeligen2', 'labeligen');
                    uresLabel.classList.replace('labelures2', 'labelures');
                    igenRadioInput.classList.replace('igen2', 'igen');
                    uresRadioInput.classList.replace('ures2', 'ures');

                    if (radioNem.checked) {
                        radioNem.checked = false;
                        uresRadioInput.checked = true;
                        gomboc.style.boxShadow = "inset 0px 0px 3px 1px grey";
                        gomboc.style.background = "transparent";
                        kartya.style.boxShadow = "none";
                        kartya.style.background = "";
                        uresIkon.style.color = "black"; nemIkon.style.color = "grey";
                        alkerdesKont.classList.add('hidden');
                    }
                    if (uresRadioInput.checked) gomboc.style.transform = "translate(-20px, 0px) rotate(45deg)";
                    if (igenRadioInput.checked) gomboc.style.transform = "translate(28px, 0px) rotate(135deg)";
                }
            });

            // Főkérdés "SZÖVEGES" checkbox dinamikája
            const szovegesCheckbox = ujModul.querySelector('.inline-szoveges-checkbox');
            const maxiLabel = ujModul.querySelector('.inline-maxi-checkbox').closest('label');
            const nemAgLabel = nemAgCheckbox.closest('label');
            const igenPontszamBlokk = ujModul.querySelector('.inline-ertek-blokk'); 

            szovegesCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    maxiLabel.style.display = 'none';
                    nemAgLabel.style.display = 'none';
                    csuszkaValtozo.style.display = 'none';
                    igenPontszamBlokk.style.display = 'none';
                    
                    if (nemAgCheckbox.checked) {
                        nemAgCheckbox.checked = false;
                        nemAgCheckbox.dispatchEvent(new Event('change')); 
                    }
                    alkerdesKont.classList.add('hidden'); 
                } else {
                    maxiLabel.style.display = '';
                    nemAgLabel.style.display = '';
                    csuszkaValtozo.style.display = '';
                    igenPontszamBlokk.style.display = 'flex';
                }
            });

            // --- ALKÉRDÉS HOZZÁADÁSA ---
           btnAddAlkerdes.addEventListener('click', () => {
                const ag = btnAddAlkerdes.dataset.ag;
                const lista = ag === 'igen' ? listaIgen : listaNem;
                const subKindex = lista.querySelectorAll('.uj-ideiglenes-alkerdes').length + 1;

                // MEGHÍVJUK A KÖZÖS SABLON GENERÁLÓT (isStandalone = false, nincs fő mentés gombja)
                const ujSub = InlineQuestionCreator.createAlkerdesUI({ kindex: subKindex }, false);
                
                lista.appendChild(ujSub);
                ujSub.scrollIntoView({ behavior: 'smooth', block: 'center' });

                ujSub.querySelector('.btn-inline-megse').addEventListener('click', () => {
                    ujSub.remove();
                    // Sorszámok újraosztása
                    lista.querySelectorAll('.uj-ideiglenes-alkerdes').forEach((el, idx) => {
                        el.querySelector('.kerdes-sorszam-jelzo2').value = idx + 1;
                        el.dataset.kindex = idx + 1;
                    });
                });
            });

            // --- FŐ Gombok logikája ---
            const btnMent = ujModul.querySelector('.btn-inline-mentes');
            const btnMegse = ujModul.querySelector('.btn-inline-megse');

            btnMegse.addEventListener('click', () => {
                ujModul.remove();
                resolve(null);
            });

       btnMent.addEventListener('click', () => {
    const szoveg = foSzovegInput.value.trim();
    const szovegesVeg = szovegesCheckbox.checked;
    const vanNemAgVeg = nemAgCheckbox.checked;
    const fokerdesNegaltSzoveg = vanNemAgVeg && !szovegesVeg ? negaltSzovegInput.value.trim() : "";

    const maxiVeg = ujModul.querySelector('.inline-maxi-checkbox').checked;
    const ertekVeg = parseFloat(ujModul.querySelector('.inline-ertek-input').value) || 0;
    const negaltErtekVeg = parseFloat(ujModul.querySelector('.inline-negalt-ertek-input').value) || 0;

    const extractAlkerdesek = (listaContainer, ag) => {
        return Array.from(listaContainer.querySelectorAll('.uj-ideiglenes-alkerdes')).map(sub => {
            const szovegesSub = sub.querySelector('.inline-szoveges-checkbox').checked;
            const vanNemAgSub = sub.querySelector('.inline-nem-ag-checkbox').checked;

            return {
                vanNemAg: vanNemAgSub,
                al_kindex: parseInt(sub.querySelector('.kerdes-sorszam-jelzo2').value) || 1,
                al_kerdesSzoveg: sub.querySelector('.inline-szoveg-input').value.trim(),
                al_ertek: parseFloat(sub.querySelector('.inline-ertek-input').value) || 0,
                szoveges: szovegesSub,
                maximalis_szint: sub.querySelector('.inline-maxi-checkbox').checked ? 1 : 0,
                al_negaltKerdesSzoveg: vanNemAgSub && !szovegesSub
                    ? sub.querySelector('.inline-negalt-szoveg-input').value.trim()
                    : "",
                al_negalt_ertek: vanNemAgSub && !szovegesSub
                    ? parseFloat(sub.querySelector('.inline-negalt-ertek-input').value) || 0
                    : 0,
                valasz_ag: ag
            };
        });
    };

    const igenAlkerdesek = extractAlkerdesek(listaIgen, 'igen');
    const nemAlkerdesek = extractAlkerdesek(listaNem, 'nem');
    const osszesAlkerdes = [...igenAlkerdesek, ...nemAlkerdesek];
    const vanAlkerdes = osszesAlkerdes.length > 0;

    if (!szoveg) {
        showAlert("A kérdés szövegének megadása kötelező!");
        return;
    }

    if (vanNemAgVeg && !szovegesVeg && !fokerdesNegaltSzoveg) {
        showAlert("Ha a főkérdés rendelkezik 'NEM' ággal, a tagadás szövegének megadása kötelező!");
        return;
    }

    if (!szovegesVeg && !maxiVeg && !vanAlkerdes) {
        if (ertekVeg === 0) {
            showAlert("Az alkérdés nélküli főkérdés pontszáma nem lehet 0!");
            return;
        }

        if (vanNemAgVeg && negaltErtekVeg === 0) {
            showAlert("Az alkérdés nélküli főkérdés 'NEM' ágának pontszáma nem lehet 0!");
            return;
        }
    }

    for (let alk of osszesAlkerdes) {
        if (!alk.al_kerdesSzoveg) {
            showAlert("Minden alkérdés szövegének megadása kötelező!");
            return;
        }

        if (alk.al_negaltKerdesSzoveg === "" && !alk.szoveges && alk.vanNemAg) {
            showAlert("Ha egy alkérdés rendelkezik 'NEM' ággal, a tagadás szövegének megadása kötelező!");
            return;
        }

        if (!alk.szoveges && alk.maximalis_szint === 0) {
            if (alk.al_ertek === 0) {
                showAlert("Az alkérdés pontszáma nem lehet 0!");
                return;
            }

            if (alk.vanNemAg && alk.al_negalt_ertek === 0) {
                showAlert("Az alkérdés 'NEM' ágának pontszáma nem lehet 0!");
                return;
            }
        }
    }

    const eredmeny = {
        kindex: parseInt(ujModul.querySelector('.kerdes-sorszam-jelzo2').value) || 1,
        szoveg: szoveg,
        ertek: ertekVeg,
        szoveges: szovegesVeg,
        maxi: maxiVeg,
        vanNemAg: vanNemAgVeg,
        negaltSzoveg: fokerdesNegaltSzoveg,
        negaltErtek: vanNemAgVeg && !szovegesVeg ? negaltErtekVeg : 0,
        alkerdesek: osszesAlkerdes
    };

    ujModul.remove();
    resolve(eredmeny);
});
        });
    }
    static openSub(referenciaElem, kindex) {
        return new Promise((resolve) => {
            const subTempId = Date.now() + Math.floor(Math.random() * 1000);
            
            const ujAlKerdesHTML = `
            <div class="kerdesmodul uj-ideiglenes-alkerdes" data-kindex="${kindex}" style="margin-top: 10px;">
                <input class="kerdes-sorszam-jelzo2" type="number" value="${kindex}">

                <div data-id="${subTempId}" data-value="0" class="question">
                    <div class="inline-fejlec">
                        <label><input type="checkbox" class="inline-maxi-checkbox"> Maximalizálja a pontszámot</label>
                        <label><input type="checkbox" class="inline-szoveges-checkbox"> Szöveges (nem pontozott)</label>
                        <label class="inline-nem-ag-label"><input type="checkbox" class="inline-nem-ag-checkbox"> Rendelkezik NEM ággal</label>
                    </div>
                    <div style="display: flex; width: 100%; align-items: center; justify-content: space-between;">
                        <div class="color-picker-input-container inline-szoveg-container" style="padding: 0px;">
                            <input type="text" class="editor-input-number inline-szoveg-input" style="padding: 0px; border: 1px solid #008000fc;background: #468a4612;" placeholder="Fogalmazza meg az alkérdést/állítást...">
                            <input type="text" class="editor-input-number inline-negalt-szoveg-input" style="display: none; padding: 0px;" placeholder="Fogalmazza meg az alkérdés tagadását...">
                        </div>                        
                        <div class="szerkesztolec inline-szerkesztolec">
                            <div>
                                <div class="ertek inline-ertek-blokk">
                                    <input type="number" class="inline-ertek-input" value="0"> pont (Igen)
                                </div>
                                <div class="ertek inline-negalt-ertek-container inline-ertek-blokk" style="display: none;">
                                    <input type="number" class="inline-negalt-ertek-input" value="0"> pont (Nem)
                                </div>
                            </div> 
                        </div>
                    </div>
                </div>
                <div class="kisgombok">
                    <button class="btn-inline-mentes szerkesztogomb" title="Mentés">
                        <span class="material-symbols-rounded inline-icon">check_circle</span>
                    </button>
                    <button class="btn-inline-megse szerkesztogomb" title="Mégse / Törlés">
                        <span class="material-symbols-rounded inline-icon">cancel</span>
                    </button>
                </div>
            </div>
            `;

            // Beszúrjuk az új kártyát közvetlenül az "Új alkérdés" gomb ALÁ
            referenciaElem.parentElement.insertAdjacentHTML('beforeend', ujAlKerdesHTML);
            const ujSub = referenciaElem.parentElement.lastElementChild;
            ujSub.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // --- DOM Elemek kinyerése ---
            const subSzovegesCb = ujSub.querySelector('.inline-szoveges-checkbox');
            const subMaxiLabel = ujSub.querySelector('.inline-maxi-checkbox').closest('label');
            const subErtekBlokk = ujSub.querySelector('.inline-ertek-blokk'); 
            const subNemAgCb = ujSub.querySelector('.inline-nem-ag-checkbox');
            const subNemAgLabel = subNemAgCb.closest('label');
            const subNegaltSzovegInput = ujSub.querySelector('.inline-negalt-szoveg-input');
            const subNegaltErtekContainer = ujSub.querySelector('.inline-negalt-ertek-container');

            // NEM ág logika
            subNemAgCb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    subNegaltSzovegInput.style.display = 'block';
                    subNegaltErtekContainer.style.display = 'block';
                    subNegaltSzovegInput.focus();
                } else {
                    subNegaltSzovegInput.style.display = 'none';
                    subNegaltErtekContainer.style.display = 'none';
                    subNegaltSzovegInput.value = '';
                    ujSub.querySelector('.inline-negalt-ertek-input').value = '0';
                }
            });

            // Szöveges checkbox logika
            subSzovegesCb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    subMaxiLabel.style.display = 'none';
                    subErtekBlokk.style.display = 'none';
                    subNemAgLabel.style.display = 'none';
                    if (subNemAgCb.checked) {
                        subNemAgCb.checked = false;
                        subNemAgCb.dispatchEvent(new Event('change'));
                    }
                } else {
                    subMaxiLabel.style.display = '';
                    subErtekBlokk.style.display = 'flex';
                    subNemAgLabel.style.display = '';
                }
            });

            // --- Mentés és Mégse ---
            const btnMent = ujSub.querySelector('.btn-inline-mentes');
            const btnMegse = ujSub.querySelector('.btn-inline-megse');

            btnMegse.addEventListener('click', () => {
                ujSub.remove();
                resolve(null);
            });

            btnMent.addEventListener('click', () => {
                const szoveg = ujSub.querySelector('.inline-szoveg-input').value.trim();
                
                if (!szoveg) {
showAlert("Az alkérdés szövegének megadása kötelező!"); // alert() helyett                    
return;
                }

        const szoveges = subSzovegesCb.checked;
const vanNemAg = subNemAgCb.checked;
const maxi = ujSub.querySelector('.inline-maxi-checkbox').checked;
const ertek = parseFloat(ujSub.querySelector('.inline-ertek-input').value) || 0;
const negaltSzoveg = vanNemAg && !szoveges ? subNegaltSzovegInput.value.trim() : "";
const negaltErtek = vanNemAg && !szoveges
    ? parseFloat(ujSub.querySelector('.inline-negalt-ertek-input').value) || 0
    : 0;

if (!szoveg) {
    showAlert("Az alkérdés szövegének megadása kötelező!");
    return;
}

if (!szoveges && !maxi && ertek === 0) {
    showAlert("Az alkérdés pontszáma nem lehet 0!");
    return;
}

if (vanNemAg && !szoveges && !negaltSzoveg) {
    showAlert("Ha az alkérdés rendelkezik 'NEM' ággal, a tagadás szövegének megadása kötelező!");
    return;
}

if (vanNemAg && !szoveges && !maxi && negaltErtek === 0) {
    showAlert("Az alkérdés 'NEM' ágának pontszáma nem lehet 0!");
    return;
}

if (btnMent.dataset.busy === '1') {
    return;
}

btnMent.dataset.busy = '1';
btnMent.disabled = true;
                const eredmeny = {
                    kindex: kindex,
                    szoveg: szoveg,
                    ertek: parseFloat(ujSub.querySelector('.inline-ertek-input').value) || 0,
                    szoveges: szoveges,
                    maxi: ujSub.querySelector('.inline-maxi-checkbox').checked,
                    vanNemAg: vanNemAg,
                    negaltSzoveg: vanNemAg && !szoveges ? subNegaltSzovegInput.value.trim() : "",
                    negaltErtek: vanNemAg && !szoveges ? parseFloat(ujSub.querySelector('.inline-negalt-ertek-input').value) || 0 : 0,
                    valasz: 'ures'
                };

                resolve({ elem: ujSub, adat: eredmeny });
            });
        });
    }
    // --- 4. MEGLÉVŐ FŐKÉRDÉS SZERKESZTÉSE ---
    static edit(referenciaElem, foKerdes, igenAlkerdesek, nemAlkerdesek) {
        return new Promise((resolve) => {
            const tempId = Date.now();
            
            // Főkérdés meglévő tulajdonságainak kinyerése
            const szoveges = foKerdes.szoveges == 1;
            const maxi = foKerdes.maximalis_szint == 1 || foKerdes.maximalisSzint == 1;
            const vanNemAg = !!foKerdes.negaltKerdesSzoveg || foKerdes.negalt_ertek > 0 || foKerdes.hasNemAg;
const isAlkerdes = !!foKerdes.parentId; // JAVÍTÁS: Megnézzük, hogy ez eleve egy alkérdés-e
            const editHTML = `
            <div class="kerdesmodul uj-ideiglenes-kerdes" data-kindex="${foKerdes.kindex}">
                <input class="kerdes-sorszam-jelzo2" type="number" value="${foKerdes.kindex}">
                <div data-id="${tempId}" data-value="0" class="question">
                    <div class="inline-fejlec">
                        <label><input type="checkbox" class="inline-maxi-checkbox" ${maxi ? 'checked' : ''}> Maximalizálja a pontszámot</label>
                        <label><input type="checkbox" class="inline-szoveges-checkbox" ${szoveges ? 'checked' : ''}> Szöveges (nem pontozott)</label>
                        <label class="inline-nem-ag-label" style="display: ${szoveges ? 'none' : 'inline'};"><input type="checkbox" class="inline-nem-ag-checkbox" ${vanNemAg ? 'checked' : ''}> Rendelkezik NEM ággal</label>
                    </div>
                    <p class="pi">(Alkérdések szerkesztéséhez húzza a csúszkát a kívánt helyre (<span style="color:green"> igen</span>/ <span style="color:red"> nem</span>))</p>
                    <div style="display: flex; width: 100%; align-items: center; justify-content: space-between;">
                        <div class="color-picker-input-container inline-szoveg-container" style="padding: 0px;">
                            <input type="text" class="editor-input-number inline-szoveg-input" style="padding: 0px; border: 1px solid #008000fc;background: #468a4612;" placeholder="Fogalmazza meg a kérdést/állítást..." value="${escapeAttr(foKerdes.szoveg)}">
                            <input type="text" class="editor-input-number inline-negalt-szoveg-input" style="display: ${vanNemAg && !szoveges ? 'block' : 'none'}; padding: 0px;" placeholder="Fogalmazza meg a kérdés tagadását..." value="${escapeAttr(foKerdes.negaltKerdesSzoveg || '')}">
                        </div>                        
                        <div class="csuszka csuszka-valtozo ${vanNemAg ? 'csuszka2' : ''}" style="display: ${szoveges || isAlkerdes ? 'none' : 'flex'}">
                            <label class="labelnem" style="display: ${vanNemAg ? 'inline-block' : 'none'};">
                                <input type="radio" class="nem ${vanNemAg ? 'nem2' : ''}" name="valasz-${tempId}" value="nem">
                                <div class="material-symbols-rounded nemszoveg" style="color: grey; transition: all 0.3s ease;">close</div>
                            </label>
                            <label class="labelures ${vanNemAg ? 'labelures2' : ''}">
                                <input type="radio" class="ures ${vanNemAg ? 'ures2' : ''}" name="valasz-${tempId}" value="ures" checked>
                                <div class="material-symbols-rounded uresszoveg" title="Kattintson a válasz elvetéséhez.">settings_ethernet</div>
                            </label>
                            <label class="labeligen ${vanNemAg ? 'labeligen2' : ''}">
                                <input type="radio" class="igen ${vanNemAg ? 'igen2' : ''}" name="valasz-${tempId}" value="igen">
                                <div class="material-symbols-rounded igenszoveg">check</div>
                            </label>
                            <div class="gomboc" style="transform: ${vanNemAg ? 'translate(0px, 0px) rotate(45deg)' : 'translate(-20px, 0px) rotate(45deg)'};"></div>
                        </div>
                        <div class="szerkesztolec inline-szerkesztolec">
                            <div>
                                <div class="ertek inline-ertek-blokk" style="display: ${szoveges ? 'none' : 'flex'}">
                                    <input type="number" class="inline-ertek-input" value="${foKerdes.ertek || 0}"> pont (Igen)
                                </div>
                                <div class="ertek inline-negalt-ertek-container inline-ertek-blokk" style="display: ${vanNemAg && !szoveges ? 'block' : 'none'};">
                                    <input type="number" class="inline-negalt-ertek-input" value="${foKerdes.negalt_ertek || 0}"> pont (Nem)
                                </div>
                            </div> 
                        </div>
                    </div>
                    
                    <div class="alkerdeskont question-container fade-in hidden" id="alkerdesek-${tempId}" style="display: ${isAlkerdes ? 'none' : 'flex'}; filter: none; flex-direction: column; width: 100%;">                        <div class="alki">
                        <div class=" alki kerdesmodul new btn-add-ideiglenes-alkerdes" style="cursor: pointer; flex: 1; margin-bottom: 0;">
                                <div class="questionadd">
                                    <span class="add-alkerdes-szoveg">Új alkérdés hozzáadása</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
                                </div>
                        </div>
                        <div class="kerdesmodul new" style="flex: 1; margin-bottom: 0; padding: 0; display: flex;">
                                <div class="questionadd" style="width: 100%;">
                                    <select class="sablon-select" style="width: 100%; background: transparent; border: none; font-family: inherit; font-size: inherit; font-weight: inherit; color: inherit; cursor: pointer; text-align: center; text-align-last: center; outline: none; appearance: none;">
                                        <option value="" disabled selected>Alkérdés sablon betöltése ▾</option>
                                    </select>
                                </div>
                        </div>
                            
                    </div>
                        </div>

                        <div class="ideiglenes-alkerdesek-lista-igen" style="display: none; width: 100%;"></div>
                        <div class="ideiglenes-alkerdesek-lista-nem" style="display: none; width: 100%;"></div>

              
            </div>
              <div class="kisgombok">
                    <button class="btn-inline-mentes szerkesztogomb" title="Mentés">
                        <span class="material-symbols-rounded inline-icon">check_circle</span>
                    </button>
                    <button class="btn-inline-megse szerkesztogomb" title="Mégse">
                        <span class="material-symbols-rounded inline-icon">cancel</span>
                    </button>
                </div>
            `;

            // Eltüntetjük az eredeti kártyát, amíg szerkesztünk
            referenciaElem.style.display = 'none';
            referenciaElem.insertAdjacentHTML('afterend', editHTML);
            const ujModul = referenciaElem.nextElementSibling;
            
            // --- DOM ELEMEK ÉS ESEMÉNYKEZELŐK KIKERESÉSE ---
            const listaIgen = ujModul.querySelector('.ideiglenes-alkerdesek-lista-igen');
            const listaNem = ujModul.querySelector('.ideiglenes-alkerdesek-lista-nem');
            const btnAddAlkerdes = ujModul.querySelector('.btn-add-ideiglenes-alkerdes');
            const btnAddSzoveg = ujModul.querySelector('.add-alkerdes-szoveg');
            const foSzovegInput = ujModul.querySelector('.inline-szoveg-input');
            const alkerdesKont = ujModul.querySelector(`#alkerdesek-${tempId}`);
            
        // --- MEGLÉVŐ ALKÉRDÉSEK BETÖLTÉSE ---
        const betoltAlkerdesek = (adatok, celLista) => {
                adatok.forEach(alk => {
                    const sub = InlineQuestionCreator.createAlkerdesUI({
                    alkId: alk.id || alk.al_id, // <-- JAVÍTVA: Biztosítjuk az ID kinyerését                        
                    parentId: foKerdes.id, 
                        kindex: alk.kindex,
                        // Biztosítjuk, hogy bármelyik formátumban is jön az adat, megtalálja
                        szoveg: alk.szoveg || alk.kerdes_szoveg || "",
                        ertek: alk.ertek || 0,
                        szoveges: alk.szoveges == 1,
                        maxi: alk.maximalis_szint == 1 || alk.maximalisSzint == 1,
                        vanNemAg: !!(alk.negaltKerdesSzoveg || alk.negalt_kerdes_szoveg) || (alk.negalt_ertek > 0) || (alk.negaltErtek > 0),
                        negaltSzoveg: alk.negaltKerdesSzoveg || alk.negalt_kerdes_szoveg || "",
                        negaltErtek: alk.negalt_ertek || alk.negaltErtek || 0
                    }, false);
                    celLista.appendChild(sub);

                    sub.querySelector('.btn-inline-megse').addEventListener('click', () => {
                        sub.remove();
                        // Sorszámok újraosztása
                        celLista.querySelectorAll('.uj-ideiglenes-alkerdes').forEach((el, idx) => {
                            el.querySelector('.kerdes-sorszam-jelzo2').value = idx + 1;
                            el.dataset.kindex = idx + 1;
                        });
                    });
                });
            };
            betoltAlkerdesek(igenAlkerdesek, listaIgen);
            betoltAlkerdesek(nemAlkerdesek, listaNem);

            // --- SABLONOK LOGIKÁJA ---
            let betoltottSablonCsoportok = [];
            fetch('/get-username')
                .then(res => res.json())
                .then(user => {
                    if (user.success) return fetch(`/api/get-sablonok?modulId=${user.modulId}&userId=${user.id}`);
                    throw new Error("Nincs bejelentkezve");
                })
                .then(res => res.json())
                .then(data => { if (data.SABLON_CSOPORTOK) betoltottSablonCsoportok = data.SABLON_CSOPORTOK; })
                .catch(err => console.error("Sablon betöltés hiba:", err));

            const sablonSelect = ujModul.querySelector('.sablon-select');
            const frissitSablonSelect = (ag) => {
                sablonSelect.innerHTML = '<option value="" disabled selected>Alkérdés sablon betöltése ▾</option>';
                betoltottSablonCsoportok.forEach((csoport, index) => {
                    if (csoport.elemek.some(e => e.valasz_ag === ag)) {
                        const opt = document.createElement('option');
                        opt.textContent = csoport.nev;
                        opt.value = index;
                        sablonSelect.appendChild(opt);
                    }
                });
            };

            sablonSelect.addEventListener('change', (e) => {
                const csoportIndex = e.target.value;
                if (csoportIndex === "") return;
                const csoport = betoltottSablonCsoportok[csoportIndex];
                const ag = btnAddAlkerdes.dataset.ag;
                const lista = ag === 'igen' ? listaIgen : listaNem;

                csoport.elemek.filter(s => s.valasz_ag === ag).forEach(sablon => {
                    const subKindex = lista.querySelectorAll('.uj-ideiglenes-alkerdes').length + 1;
                    const ujSub = InlineQuestionCreator.createAlkerdesUI({
                        kindex: subKindex, szoveg: sablon.szoveg, ertek: sablon.ertek, szoveges: sablon.szoveges
                    }, false);
                    lista.appendChild(ujSub);
                    ujSub.querySelector('.btn-inline-megse').addEventListener('click', () => ujSub.remove());
                });
                if (lista.lastElementChild) lista.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
                e.target.value = "";
            });

            // --- GOMB DINAMIKUS SZÖVEGE ÉS RÁDIÓGOMBOK LOGIKÁJA ---
            const updateAddButtonText = () => {
                const ag = btnAddAlkerdes.dataset.ag;
                if (!ag) return;
                const inputVal = foSzovegInput.value.trim();
                const roviditettInput = inputVal.length > 20 ? inputVal.substring(0, 20) + '...' : inputVal;
                const fokerdesHivatkozas = roviditettInput ? `a(z) <span class="idezet">"${roviditettInput}"</span> kérdéshez` : 'a főkérdéshez';
                btnAddSzoveg.innerHTML = `Alkérdés hozzáadása (${ag} válasz esetén) ${fokerdesHivatkozas}`;
            };
            foSzovegInput.addEventListener('input', updateAddButtonText);

            const radios = ujModul.querySelectorAll('input[type="radio"]');
            const csuszkaValtozo = ujModul.querySelector('.csuszka-valtozo');
            const gomboc = ujModul.querySelector('.gomboc');
            const kartya = ujModul.querySelector('.question');
            
            radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const val = e.target.value;
                    const isKetAgu = csuszkaValtozo.classList.contains('csuszka2'); 
                    
                    if (val === 'igen') {
                        gomboc.style.background = "rgb(145 204 0)";
                        gomboc.style.transform = isKetAgu ? "translate(42px, 0px) rotate(-135deg)" : "translate(28px, 0px) rotate(135deg)"; 
                        kartya.style.background = "rgb(48 255 0 / 8%)";
                        
                        alkerdesKont.classList.remove('hidden');
                        listaIgen.style.display = 'block';
                        listaNem.style.display = 'none';
                        btnAddAlkerdes.dataset.ag = 'igen';
                        updateAddButtonText();
                        frissitSablonSelect('igen');
                        setTimeout(() => alkerdesKont.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);

                    } else if (val === 'nem') {
                        gomboc.style.background = "#ff0000";
                        gomboc.style.transform = "translate(-38px, 0px) rotate(135deg)";
                        kartya.style.background = "rgb(255 0 0 / 6%)";

                        alkerdesKont.classList.remove('hidden');
                        listaIgen.style.display = 'none';
                        listaNem.style.display = 'block';
                        btnAddAlkerdes.dataset.ag = 'nem';
                        updateAddButtonText();
                        frissitSablonSelect('nem');
                        setTimeout(() => alkerdesKont.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);

                    } else { 
                        gomboc.style.background = "transparent";
                        gomboc.style.transform = isKetAgu ? "translate(0px, 0px) rotate(45deg)" : "translate(-20px, 0px) rotate(45deg)";
                        kartya.style.background = "";
                        alkerdesKont.classList.add('hidden');
                    }
                });
            });

            // --- CHECKBOXOK LOGIKÁJA ---
            const nemAgCheckbox = ujModul.querySelector('.inline-nem-ag-checkbox');
            const szovegesCheckbox = ujModul.querySelector('.inline-szoveges-checkbox');
            
            nemAgCheckbox.addEventListener('change', (e) => {
                const negaltSzovegInput = ujModul.querySelector('.inline-negalt-szoveg-input');
                const negaltErtekContainer = ujModul.querySelector('.inline-negalt-ertek-container');
                const labelNem = ujModul.querySelector('.labelnem');
                const uresRadioInput = ujModul.querySelector('input[value="ures"]');

                if (e.target.checked) {
                    negaltSzovegInput.style.display = 'block';
                    negaltErtekContainer.style.display = 'block';
                    labelNem.style.display = 'inline-block';
                    csuszkaValtozo.classList.add('csuszka2');
                    
                    if (uresRadioInput.checked) gomboc.style.transform = "translate(0px, 0px) rotate(45deg)";
                } else {
                    negaltSzovegInput.style.display = 'none';
                    negaltErtekContainer.style.display = 'none';
                    labelNem.style.display = 'none';
                    csuszkaValtozo.classList.remove('csuszka2');
                    
                    if (uresRadioInput.checked) gomboc.style.transform = "translate(-20px, 0px) rotate(45deg)";
                }
            });

            szovegesCheckbox.addEventListener('change', (e) => {
                const maxiLabel = ujModul.querySelector('.inline-maxi-checkbox').closest('label');
                const nemAgLabel = nemAgCheckbox.closest('label');
                const igenPontszamBlokk = ujModul.querySelector('.inline-ertek-blokk'); 

                if (e.target.checked) {
                    maxiLabel.style.display = 'none'; nemAgLabel.style.display = 'none'; csuszkaValtozo.style.display = 'none'; igenPontszamBlokk.style.display = 'none';
                    if (nemAgCheckbox.checked) { nemAgCheckbox.checked = false; nemAgCheckbox.dispatchEvent(new Event('change')); }
                    alkerdesKont.classList.add('hidden'); 
                } else {
                    maxiLabel.style.display = ''; nemAgLabel.style.display = ''; csuszkaValtozo.style.display = 'flex'; igenPontszamBlokk.style.display = 'flex';
                }
            });

            // Új alkérdés sima gomb
            btnAddAlkerdes.addEventListener('click', () => {
                const ag = btnAddAlkerdes.dataset.ag;
                const lista = ag === 'igen' ? listaIgen : listaNem;
                const subKindex = lista.querySelectorAll('.uj-ideiglenes-alkerdes').length + 1;
                const ujSub = InlineQuestionCreator.createAlkerdesUI({ kindex: subKindex }, false);
                lista.appendChild(ujSub);
                ujSub.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ujSub.querySelector('.btn-inline-megse').addEventListener('click', () => ujSub.remove());
            });

            // --- GOMBOK ÉS VISSZATÉRÉS ---
            ujModul.querySelector('.btn-inline-megse').addEventListener('click', () => {
                ujModul.remove();
                referenciaElem.style.display = ''; // Eredeti kártya visszahozása
                resolve(null);
            });

        
           ujModul.querySelector('.btn-inline-mentes').addEventListener('click', () => {
                const szoveg = ujModul.querySelector('.inline-szoveg-input').value.trim();
                const szovegesVeg = szovegesCheckbox.checked;
                const vanNemAgVeg = nemAgCheckbox.checked;
                const fokerdesNegaltSzoveg = vanNemAgVeg && !szovegesVeg ? ujModul.querySelector('.inline-negalt-szoveg-input').value.trim() : "";

                if (!szoveg) {
                    showAlert("A kérdés szövegének megadása kötelező!");
                    return;
                }
                if (vanNemAgVeg && !szovegesVeg && !fokerdesNegaltSzoveg) {
                    showAlert("Ha a főkérdés rendelkezik 'NEM' ággal, a tagadás szövegének megadása kötelező!");
                    return;
                }

              const extractAlkerdesek = (listaContainer, ag) => {
                    return Array.from(listaContainer.querySelectorAll('.uj-ideiglenes-alkerdes')).map(sub => {
                        const szovegesSub = sub.querySelector('.inline-szoveges-checkbox').checked;
                        const vanNemAgSub = sub.querySelector('.inline-nem-ag-checkbox').checked;
                        
                        // JAVÍTÁS: getAttribute a dataset helyett!
                        const alkIdRaw = sub.getAttribute('data-alk-id'); 
                        
                        return {
                            al_id: alkIdRaw ? parseInt(alkIdRaw, 10) : null,
                            parent_id: foKerdes ? foKerdes.id : null, 
                            al_kindex: parseInt(sub.querySelector('.kerdes-sorszam-jelzo2').value) || 1,
                            al_kerdesSzoveg: sub.querySelector('.inline-szoveg-input').value.trim(),
                            al_ertek: parseFloat(sub.querySelector('.inline-ertek-input').value) || 0,
                            szoveges: szovegesSub,
                            vanNemAg: vanNemAgSub, 
                            maximalis_szint: sub.querySelector('.inline-maxi-checkbox').checked ? 1 : 0,
                            al_negaltKerdesSzoveg: vanNemAgSub && !szovegesSub ? sub.querySelector('.inline-negalt-szoveg-input').value.trim() : "",
                            al_negalt_ertek: vanNemAgSub && !szovegesSub ? parseFloat(sub.querySelector('.inline-negalt-ertek-input').value) || 0 : 0,
                            valasz_ag: ag 
                        };
                    });
                };

const igenAlkerdesek = extractAlkerdesek(listaIgen, 'igen');
const nemAlkerdesek = extractAlkerdesek(listaNem, 'nem');
const osszesAlkerdes = [...igenAlkerdesek, ...nemAlkerdesek];

const maxiVeg = ujModul.querySelector('.inline-maxi-checkbox').checked;
const ertekVeg = parseFloat(ujModul.querySelector('.inline-ertek-input').value) || 0;
const negaltErtekVeg = parseFloat(ujModul.querySelector('.inline-negalt-ertek-input').value) || 0;
const vanAlkerdes = osszesAlkerdes.length > 0;

if (!szovegesVeg && !maxiVeg && !vanAlkerdes) {
    if (ertekVeg === 0) {
        showAlert("Az alkérdés nélküli kérdés pontszáma nem lehet 0!");
        return;
    }

    if (vanNemAgVeg && negaltErtekVeg === 0) {
        showAlert("Az alkérdés nélküli kérdés 'NEM' ágának pontszáma nem lehet 0!");
        return;
    }
}

for (let alk of osszesAlkerdes) {
    if (!alk.al_kerdesSzoveg) {
        showAlert("Minden alkérdés szövegének megadása kötelező!");
        return;
    }

    if (alk.al_negaltKerdesSzoveg === "" && !alk.szoveges && alk.vanNemAg) {
        showAlert("Ha egy alkérdés rendelkezik 'NEM' ággal, a tagadás szövegének megadása kötelező!");
        return;
    }

    if (!alk.szoveges && alk.maximalis_szint === 0) {
        if (alk.al_ertek === 0) {
            showAlert("Az alkérdés pontszáma nem lehet 0!");
            return;
        }

        if (alk.vanNemAg && alk.al_negalt_ertek === 0) {
            showAlert("Az alkérdés 'NEM' ágának pontszáma nem lehet 0!");
            return;
        }
    }
}
                const result = {
                    id: foKerdes.id,
                    kerdesSzoveg: szoveg,
                    ertek: ertekVeg,
                    szoveges: szovegesVeg ? 1 : 0,
                    maximalis_szint: maxiVeg ? 1 : 0,
                    negaltKerdesSzoveg: vanNemAgVeg && !szovegesVeg ? ujModul.querySelector('.inline-negalt-szoveg-input').value.trim() : "",
                    negalt_ertek: vanNemAgVeg && !szovegesVeg ? negaltErtekVeg : 0,
                    kindex: parseInt(ujModul.querySelector('.kerdes-sorszam-jelzo2').value) || foKerdes.kindex,                    foKategoria: foKerdes.foKategoria,
                    alKategoria: foKerdes.alKategoria,
                    altTema: foKerdes.altTema,
                    alkerdesek: osszesAlkerdes                
                };

                ujModul.remove();
                referenciaElem.style.display = ''; 
                resolve(result);
            });
        });
    }
}

function escapeAttr(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}