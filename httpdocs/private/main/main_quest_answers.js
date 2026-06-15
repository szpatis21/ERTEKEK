// Alkérdések és korábbi válaszok betöltése.
import {
    kerdesValaszok,
    szovegesValaszok,
    hideLoading,
    showLoading,
    modulId,
    userId,
    modulIdBetoltve
} from './main_alap.js';
import { showSuccessToast, showAlert } from '/both/alert.js';
import { Kerdes } from './main_category.js';
import {
    questState,
    questApi,
    ujratoltParentAgak
} from './main_quest_state.js';

function createAddIconSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('height', '24px');
    svg.setAttribute('viewBox', '0 -960 960 960');
    svg.setAttribute('width', '24px');
    svg.setAttribute('fill', '#e8eaed');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
        'd',
        'M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z'
    );

    svg.appendChild(path);
    return svg;
}

function buildAlkerdesAddLabel(target, valaszAg) {
    const label = valaszAg === 'nem' ? 'nem' : 'igen';
    target.textContent = `Alkérdés hozzáadása (${label} válasz esetén)`;
}



export async function loadAlKerdesek(parentId, valaszAg, parentKerdes) {
    const modulId = await modulIdBetoltve;
    const tartaly = document.getElementById(`alkerdesek-${parentId}`);

    if (!tartaly) {
        console.warn('Alkérdés-konténer még nem létezik:', {
            parentId,
            valaszAg,
            containerId: `alkerdesek-${parentId}`
        });
        return;
    }

    try {
        if (Object.keys(questState.alKerdesMap).length === 0) {
            await questApi.KategoriaKezelo.loadAllAlKerdesek();
        }

        const cachedData = questState.alKerdesMap[parentId] || [];
        const filteredData = cachedData.filter(item => item.valasz_ag === valaszAg);
// --- ÚJ RÉSZ: Mentsük ki a nyitott ideiglenes szerkesztőket! ---
        const ideiglenesSzerkesztok = [];
        if (tartaly) {
            tartaly.querySelectorAll('.uj-ideiglenes-alkerdes').forEach(szerkeszto => {
                ideiglenesSzerkesztok.push(szerkeszto);
            });
        }

        // Törlés
        tartaly.replaceChildren();
        const isSzerkeszto = document.getElementById('szerkeszto');


        if (filteredData.length > 0 || isSzerkeszto) {
            tartaly.classList.remove('hidden');
            tartaly.classList.add('fade-in');
        } else {
            tartaly.classList.add('hidden');
        }

     // --- JAVÍTÁS: Mindkét ág memóriába töltése a matematika számára ---
        cachedData.forEach(item => {
            const marLetezik = questApi.KategoriaKezelo.kerdesek.some(k => k.id === item.id);
            if (!marLetezik) {
                // Betesszük a láthatatlan alkérdéseket is a memóriába
                const rejtettKerdes = new Kerdes(
                    item.kindex, item.id, item.szoveg, item.parent_id,
                    item.valasz_ag, item.negalt_kerdes_szoveg,
                    parentKerdes.foKategoria, parentKerdes.alKategoria, parentKerdes.altTema,
                    item.szoveges, item.ertek, item.negalt_ertek,
                    item.ossz_ertek, item.maximalis_szint,
                    item.opcios, item.kategoria_kapcsolo_id
                );
                questApi.KategoriaKezelo.kerdesek.push(rejtettKerdes);
            }
        });

        // Frissítjük a főkérdés ágait, hogy a matek azonnal lássa a pontos ID-kat
        parentKerdes.igenAg = cachedData.filter(i => i.valasz_ag === 'igen').map(i => i.id);
        parentKerdes.nemAg  = cachedData.filter(i => i.valasz_ag === 'nem').map(i => i.id);
        // ----------------------------------------------------------------

        const sortedData = filteredData.sort((a, b) => a.kindex - b.kindex);

        for (const item of sortedData) {
            // A kirajzolt elemet eltávolítjuk a memóriából, hogy a .render() után frissen visszategyük
            questState.kerdesek = questState.kerdesek.filter(k => k.id !== item.id);

            const kerdes = new Kerdes(
                item.kindex, item.id, item.szoveg, item.parent_id,
                item.valasz_ag, item.negalt_kerdes_szoveg,
                parentKerdes.foKategoria, parentKerdes.alKategoria, parentKerdes.altTema,
                item.szoveges, item.ertek, item.negalt_ertek,
                item.ossz_ertek, item.maximalis_szint,
                item.opcios, item.kategoria_kapcsolo_id
            );
            await kerdes.render(tartaly);
            questApi.KategoriaKezelo.kerdesek.push(kerdes);
        }

        // --- JAVÍTÁS 2: Értékelések és pontszámok újraszámolása a UI-on ---
        if (typeof questApi.KategoriaKezelo.frissitErtekelesekContainer === 'function') {
            questApi.KategoriaKezelo.frissitErtekelesekContainer();
        }

        if (isSzerkeszto) {
            const isFokerdes = !parentKerdes.parentId;

            if (isFokerdes) {
                const gombKontener = document.createElement("div");
                gombKontener.style.display = "flex";
                gombKontener.style.gap = "10px";
                gombKontener.style.marginBottom = "15px";
                gombKontener.style.width = "100%";

                const ujAlKerdesDiv = document.createElement("div");
                ujAlKerdesDiv.classList.add("kerdesmodul", "new", "btn-add-ideiglenes-alkerdes");
                ujAlKerdesDiv.setAttribute("data-id", "");
                ujAlKerdesDiv.dataset.ag = valaszAg;
                ujAlKerdesDiv.style.flex = "1";
                ujAlKerdesDiv.style.margin = "0";

                const questionAdd = document.createElement('div');
                questionAdd.className = 'questionadd';

                const labelSpan = document.createElement('span');
                labelSpan.className = 'add-alkerdes-szoveg';
                buildAlkerdesAddLabel(labelSpan, valaszAg);

                questionAdd.appendChild(labelSpan);
                questionAdd.appendChild(createAddIconSvg());
                ujAlKerdesDiv.appendChild(questionAdd);

                gombKontener.appendChild(ujAlKerdesDiv);
                tartaly.prepend(gombKontener);

                const getKovetkezoIndex = () => {
                    const jelenlegiMaxKindex = filteredData.length > 0
                        ? Math.max(...filteredData.map(k => k.kindex))
                        : 0;
                    const ideiglenesDb = tartaly.querySelectorAll('.uj-ideiglenes-alkerdes').length;
                    return jelenlegiMaxKindex + ideiglenesDb + 1;
                };

                const mentAlkerdes = async (adat, kindex) => {
                    const response = await fetch('/api/alkerdesek', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            kerdesSzoveg: adat.szoveg,
                            negaltKerdesSzoveg: adat.opcios ? '' : (adat.negaltSzoveg || ''),
                            negaltErtek: adat.opcios ? 0 : (adat.negaltErtek || 0),
                            parentId: parentKerdes.id,
                            foKategoria: parentKerdes.foKategoria,
                            alKategoria: parentKerdes.alKategoria,
                            altTema: parentKerdes.altTema,
                            ertek: adat.ertek || 0,
                            szoveges: !!adat.szoveges,
                            valaszAg: adat.opcios ? 'igen' : valaszAg,
                            maximalis_szint: !!adat.maxi,
                            opcios: !!adat.opcios,
                            kindex,
                            modulId: await modulIdBetoltve
                        })
                    });

                    const data = await response.json();

                    if (!data.success) {
                        console.error('Hiba:', data.message);
                        return false;
                    }

                    return true;
                };

                const ujratoltAlkerdeseket = async () => {
                    showSuccessToast("Alkérdés sikeresen hozzáadva!");
                    questState.alKerdesMap = {};
                    questState.alKerdesBatchPromise = null;
                    await questApi.KategoriaKezelo.loadAlKerdesek(parentKerdes.id, valaszAg, parentKerdes);
                };

                const betoltSablonWizardbol = async (QuestionInsertWizard) => {
                    const resp = await fetch(`/api/get-sablonok?modulId=${modulId}&userId=${userId}`);
                    const data = await resp.json();
                    const sablonCsoportok = data.SABLON_CSOPORTOK || [];

                    const valaszthatoCsoportok = sablonCsoportok
                        .map((csoport, index) => ({
                            index,
                            nev: csoport.nev,
                            count: Array.isArray(csoport.elemek)
                                ? csoport.elemek.filter(elem => elem.valasz_ag === valaszAg).length
                                : 0
                        }))
                        .filter(csoport => csoport.count > 0);

                    if (valaszthatoCsoportok.length === 0) {
                        showAlert(`Nincs betölthető sablon a(z) ${valaszAg.toUpperCase()} ághoz.`);
                        return;
                    }

                    const selectedIndexRaw = await QuestionInsertWizard.chooseTemplate(valaszAg, valaszthatoCsoportok);
                    if (selectedIndexRaw === null || selectedIndexRaw === undefined || selectedIndexRaw === '') return;

                    const selectedIndex = parseInt(selectedIndexRaw, 10);
                    const csoport = sablonCsoportok[selectedIndex];

                    if (!csoport || !Array.isArray(csoport.elemek)) return;

                    const relevansElemek = csoport.elemek.filter(sablon => sablon.valasz_ag === valaszAg);
                    let kovetkezoIndex = getKovetkezoIndex();

                    for (const sablon of relevansElemek) {
                        const siker = await mentAlkerdes({
                            szoveg: sablon.szoveg || '',
                            negaltSzoveg: sablon.negalt_kerdes_szoveg || sablon.negaltKerdesSzoveg || '',
                            negaltErtek: sablon.negalt_ertek || sablon.negaltErtek || 0,
                            ertek: sablon.ertek || 0,
                            szoveges: !!sablon.szoveges,
                            maxi: !!sablon.maxi || sablon.maximalis_szint == 1 || sablon.maximalisSzint == 1,
                            opcios: !!sablon.opcios || sablon.opcios == 1
                        }, kovetkezoIndex);

                        if (siker) kovetkezoIndex++;
                    }

                    await ujratoltAlkerdeseket();
                };

                const beszurEgyediAlkerdest = async (InlineQuestionCreator, selectedType) => {
                    const presetByType = {
                        simple: {},
                        'yes-no': { vanNemAg: true },
                        text: { szoveges: true },
                        option: { opcios: true }
                    };

                    const kovetkezoIndex = getKovetkezoIndex();

                    const ujSub = InlineQuestionCreator.createAlkerdesUI({
                        kindex: kovetkezoIndex,
                        ...(presetByType[selectedType] || {})
                    }, true);

                    gombKontener.after(ujSub);
                    ujSub.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    const btnMent = ujSub.querySelector('.btn-inline-mentes');
                    const btnMegse = ujSub.querySelector('.btn-inline-megse');
                    const subSzovegesCb = ujSub.querySelector('.inline-szoveges-checkbox');
                    const subNemAgCb = ujSub.querySelector('.inline-nem-ag-checkbox');
                    const subOpcioCb = ujSub.querySelector('.inline-opcio-checkbox');
                    const subNegaltSzovegInput = ujSub.querySelector('.inline-negalt-szoveg-input');

                    btnMegse.addEventListener('click', () => {
                        ujSub.remove();
                    });

                    btnMent.addEventListener('click', async () => {
                        const szoveg = ujSub.querySelector('.inline-szoveg-input').value.trim();
                        const szoveges = subSzovegesCb.checked;
                        const vanNemAg = subNemAgCb.checked;
                        const maxi = ujSub.querySelector('.inline-maxi-checkbox').checked;
                        const opcios = subOpcioCb?.checked || false;
                        const ertek = parseFloat(ujSub.querySelector('.inline-ertek-input').value) || 0;
                        const negaltSzoveg = vanNemAg && !szoveges ? subNegaltSzovegInput.value.trim() : '';
                        const negaltErtek = vanNemAg && !szoveges
                            ? parseFloat(ujSub.querySelector('.inline-negalt-ertek-input').value) || 0
                            : 0;

                        if (!szoveg) {
                            showAlert('Az alkérdés szövegének megadása kötelező!');
                            return;
                        }

                        if (!szoveges && !maxi && ertek === 0) {
                            showAlert('Az alkérdés pontszáma nem lehet 0!');
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

                        if (btnMent.dataset.busy === '1') return;
                        btnMent.dataset.busy = '1';
                        btnMent.disabled = true;
                        ujSub.dataset.saving = '1';

                        try {
                            const siker = await mentAlkerdes({
                                szoveg,
                                ertek,
                                szoveges,
                                maxi,
                                opcios,
                                negaltSzoveg,
                                negaltErtek
                            }, kovetkezoIndex);

                            if (!siker) {
                                delete ujSub.dataset.saving;
                                btnMent.dataset.busy = '0';
                                btnMent.disabled = false;
                                return;
                            }

                            ujSub.dataset.saved = '1';
                            ujSub.remove();
                            await ujratoltAlkerdeseket();
                        } catch (err) {
                            delete ujSub.dataset.saving;
                            btnMent.dataset.busy = '0';
                            btnMent.disabled = false;
                            console.error('Fetch hiba:', err);
                        }
                    });
                };

                ujAlKerdesDiv.addEventListener('click', async () => {
                    const { InlineQuestionCreator } = await import('../admin/upload/category_creator.js');
                    const { QuestionInsertWizard } = await import('../admin/upload/question_insert_wizard.js');

                    const selectedType = await QuestionInsertWizard.chooseSubQuestionType(valaszAg);
                    if (!selectedType) return;

                    if (selectedType === 'template') {
                        await betoltSablonWizardbol(QuestionInsertWizard);
                        return;
                    }

                    if (selectedType === 'option') {
                        showAlert('Az opció típus később kerül bevezetésre.');
                        return;
                    }

                    await beszurEgyediAlkerdest(InlineQuestionCreator, selectedType);
                });
            }
            // A render előtt létező, de még nem mentett alkérdés-szerkesztőket visszatesszük.
// A sikeresen mentett elemet előtte külön eltávolítjuk, így az nem jön vissza duplán.
if (ideiglenesSzerkesztok.length > 0) {
    ideiglenesSzerkesztok.forEach(szerkeszto => {
        if (
            szerkeszto &&
            !szerkeszto.dataset.saved &&
            !szerkeszto.dataset.saving
        ) {
            tartaly.appendChild(szerkeszto);
        }
    });
}
        }

    } catch (error) {
        console.error('Hiba történt az alkérdések betöltése során:', error);
    }
}

export async function loadAllAlKerdesek(force = false) {
    if (!force && Object.keys(questState.alKerdesMap).length) {
        return questState.alKerdesMap;
    }

    const modulId = await modulIdBetoltve;

    if (force) {
        questState.alKerdesMap = {};
        questState.alKerdesBatchPromise = null;
    }

    if (!questState.alKerdesBatchPromise) {
        questState.alKerdesBatchPromise = (async () => {
            const resp = await fetch(
                `/api/get-all-alkerdesek?modulId=${modulId}&_t=${Date.now()}`,
                { cache: 'no-store' }
            );

            const data = await resp.json();
            questState.alKerdesMap = data.alKerdesMap || {};
            return questState.alKerdesMap;
        })();
    }

    return questState.alKerdesBatchPromise;
}

export async function loadValaszok() {
    if (!document.getElementById('szerkeszto')) {
        showLoading();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const kitoltesId = urlParams.get('kitoltes_id');

    if (!kitoltesId) {
        console.warn('Hiányzó kitoltes_id az URL-ből!');
        return;
    }

    try {
        const response = await fetch(`/api/get-valaszok?kitoltes_id=${kitoltesId}`);
        const data = await response.json();

        if (data.success) {
            data.valaszok.forEach(valasz => {
                if (valasz.valasz_szoveg && valasz.valasz_szoveg.trim() !== '') {
                    szovegesValaszok[valasz.kerdes_id] = valasz.valasz_szoveg.trim() ;
                }
                kerdesValaszok[valasz.kerdes_id] = valasz.kerdes_valasz;
            });

            const kerdesIds = Object.keys(kerdesValaszok);

            if (kerdesIds.length === 0) {
                questApi.KategoriaKezelo.frissitErtekelesekContainer();
                hideLoading();
                return;
            }

       const modulId = await modulIdBetoltve;

        const kerdesekResponse = await fetch('/api/get-kerdesek-by-ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kerdesIds, modulId })   // ← ide is bekerül
        });

            const kerdesekData = await kerdesekResponse.json();

            if (kerdesekData.success) {
                const hasNemAgMap = await Kerdes.hasNemAgBatch(kerdesIds);

                kerdesekData.kerdesek.forEach(kerdes => {
                    const ujKerdes = new Kerdes(
                        kerdes.kindex,
                        kerdes.id,
                        kerdes.szoveg,
                        kerdes.parent_id,
                        kerdes.valasz_ag,
                        kerdes.negalt_kerdes_szoveg,
                        kerdes.fo_kategoria,
                        kerdes.al_kategoria,
                        kerdes.alt_tema,
                        kerdes.szoveges,
                        kerdes.ertek,
                        kerdes.negalt_ertek,
                        kerdes.ossz_ertek,
                        kerdes.maximalis_szint,
                        kerdes.opcios,
                        kerdes.kategoria_kapcsolo_id
                    );

                    ujKerdes.hasNemAg = hasNemAgMap[kerdes.id] || false;

                    // ❌ NEM renderelünk DOM elemet
                    questApi.KategoriaKezelo.kerdesek.push(ujKerdes);

                });
                questApi.KategoriaKezelo.kerdesek.forEach(parentKerdes => {
                    parentKerdes.igenAg = questApi.KategoriaKezelo.kerdesek
                        .filter(k => k.parentId === parentKerdes.id && k.valaszAg === 'igen')
                        .map(k => k.id);

                    parentKerdes.nemAg = questApi.KategoriaKezelo.kerdesek
                        .filter(k => k.parentId === parentKerdes.id && k.valaszAg === 'nem')
                        .map(k => k.id);
                });        

                // 🔧 Töltsük be az összes potenciális alkérdést
                await questApi.KategoriaKezelo.loadAllAlKerdesek();
/*                 console.log('✅ loadAllAlKerdesek meghívva a loadValaszok belsejében');
 */
                // 🔧 Minden lehetséges alkérdés felvétele, ha még nincs a tömbben
                for (const parentId in questState.alKerdesMap) {
                    for (const alk of questState.alKerdesMap[parentId]) {
                        const marLetezik = questApi.KategoriaKezelo.kerdesek.some(k => k.id === alk.id);
                        if (!marLetezik) {
                            const ujAlKerdes = new Kerdes(
                                alk.kindex,
                                alk.id,
                                alk.szoveg,
                                alk.parent_id,
                                alk.valasz_ag,
                                alk.negalt_kerdes_szoveg,
                                alk.fo_kategoria,
                                alk.al_kategoria,
                                alk.alt_tema,
                                alk.szoveges,
                                alk.ertek,
                                alk.negalt_ertek,
                                alk.ossz_ertek,
                                alk.maximalis_szint,
                                alk.opcios,
                                alk.kategoria_kapcsolo_id
                            );
                           questApi.KategoriaKezelo.kerdesek.push(ujAlKerdes);
/*                            console.log(`➕ Alkérdés hozzáadva: ${alk.id} - ${alk.szoveg}`);
 */                        }
                    }
                }

                    ujratoltParentAgak();
                    Kerdes.normalizeOpcioValaszok();
                    questApi.KategoriaKezelo.frissitErtekelesekContainer();

                    setTimeout(() => {hideLoading();}, 200);
                } else {
                    console.error('Hiba a kérdések lekérése során:', kerdesekData.message);
                }
            } else {
                console.error('Hiba a válaszok lekérése során:', data.message);
            }
        } catch (error) {
            console.error('Fetch hiba:', error);
        }
    }
