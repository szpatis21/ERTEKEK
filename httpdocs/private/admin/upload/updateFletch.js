import { modulIdBetoltve } from '/private/main/main_alap.js';
import { showSuccessToast } from '/both/alert.js';
import { DeleteConfirm } from './delete_confirm.js'; 

export function torlesButton(id, isAlkerdes = false) {
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = `<span class="material-symbols-rounded">delete</span>`;
    deleteButton.classList.add('delete-button');

    deleteButton.addEventListener('click', async () => {
        const url = isAlkerdes ? `/alkerdesek/${id}` : `/kerdesek/${id}`;
        
        //  KategoriaKezelo a frissítéshez
        const { KategoriaKezelo } = await import('/private/main/main_quest.js');
        const kerdes = KategoriaKezelo.kerdesek.find(k => k.id === id);

        const megerositve = await DeleteConfirm.open("a kiválasztott kérdést", "alal");
        
        if (megerositve) {
            fetch(url, { method: 'DELETE' })
            .then(response => response.json())
            .then(result => {
                if (result.message) {
                    showSuccessToast('Sikeres törlés!'); 
                    
                    // AZONNALI DOM FRISSÍTÉS:
                    if (kerdes) {
                        KategoriaKezelo.clearAlkerdesCache();
                        KategoriaKezelo.loadKerdesek(
                            kerdes.foKategoria, 
                            kerdes.alKategoria, 
                            kerdes.altTema
                        );
                    }
                }
            })
            .catch(error => console.error('Hiba történt:', error));
        }
    });

    return deleteButton;
}
// SZERKESZTÉS GOMB
export function szerkesztoButton(id) {
    const editButton = document.createElement('button');
    editButton.innerHTML = `<span class="material-symbols-rounded">edit</span>`;
    editButton.classList.add('edit-button');
    
    editButton.addEventListener('click', async () => {
        const { KategoriaKezelo } = await import('/private/main/main_quest.js'); 
        const { InlineQuestionCreator } = await import('./category_creator.js'); 
const modulId = await modulIdBetoltve;
        const kerdes = KategoriaKezelo.kerdesek.find(k => k.id === id);
        if (!kerdes) return;

        const kerdesKartya = editButton.closest('.kerdesmodul') || editButton.closest('.question').parentElement; 
        if (!kerdesKartya) return;

        let osszesAlkerdes = KategoriaKezelo.kerdesek.filter(k => k.parentId == id || k.parent_id == id);

        // Ha még nem húzták el a csúszkát, a memória üres. Betöltés cachből
        if (osszesAlkerdes.length === 0) {
            const alKerdesMap = await KategoriaKezelo.loadAllAlKerdesek();
            osszesAlkerdes = alKerdesMap[id] || [];
        }

        const igenAlkerdesek = osszesAlkerdes.filter(k => k.valaszAg === 'igen' || k.valasz_ag === 'igen');
        const nemAlkerdesek = osszesAlkerdes.filter(k => k.valaszAg === 'nem' || k.valasz_ag === 'nem');

        const szerkesztettAdatok = await InlineQuestionCreator.edit(kerdesKartya, kerdes, igenAlkerdesek, nemAlkerdesek);

        if (szerkesztettAdatok) {
            try {
                const response = await fetch(`/kerdesek/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...szerkesztettAdatok, modulId: modulId })
                });

                if (response.ok) {
                    showSuccessToast("Kérdés és alkérdései sikeresen frissítve!"); 
                    KategoriaKezelo.clearAlkerdesCache();
                    KategoriaKezelo.loadKerdesek(kerdes.foKategoria, kerdes.alKategoria, kerdes.altTema);
                } else {
                    const result = await response.json();
                    alert("Hiba a mentés során: " + result.message);
                }
            } catch (error) {
                console.error("Hálózati hiba a szerkesztésnél:", error);
            }
        }
    });

    return editButton;
}

// DOM ELEM ELTÁVOLÍTÁSA
function removeElementsById(id) {
    const q = document.querySelector(`.question[data-id="${id}"]`);
    if (q) {
        const kmodul = q.closest('.kerdesmodul');
        if (kmodul) kmodul.remove();
        else q.remove();
    }
}

// GLOBÁLIS KUKA ESEMÉNYKEZELŐK (Ha a megjelenített kártyák még használják ezeket az osztályokat)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('kuka')) {
        const alkerdesDiv = e.target.closest('.alok');
        const idElem = alkerdesDiv ? alkerdesDiv.querySelector('[name="parentId"]') : null;
        const alkerdesId = idElem ? idElem.value : null;

        if (alkerdesId) {
            fetch(`/alkerdesek/${alkerdesId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(result => {
                if (result.message) {
                    removeElementsById(alkerdesId);
                    showSuccessToast('Alkérdés sikeresen törölve!');
                    if (alkerdesDiv) alkerdesDiv.remove();
                }
            })
            .catch(err => console.error(err));
        } else if (alkerdesDiv) {
            alkerdesDiv.remove();
        }
    } else if (e.target.classList.contains('kuka2')) {
        const alkerdesDiv = e.target.closest('.alok');
        if (alkerdesDiv) alkerdesDiv.remove();
    }
});