//Készülő Értékelések megosztása 

import { userId, userName, modulId, intezmeny, intezmeny_id, mailname, adatok, letrehoz, fullname, resz1, resz2, resz3, aktualisKitoltesId, animateMessage } from './dashMain.js'
const felbukkano4 = document.querySelector("#felbukkano4");
const felbukkano3 = document.querySelector("#felbukkano3");
const felbukkano2 = document.querySelector("#felbukkano2");
const lapozo = document.getElementById('lapok');
const loadingOverlay = document.getElementById('loading-overlay');
import { escapeHTML } from '/both/safeDom.js';
import { showAlert, customConfirm} from "/both/alert.js"

const ujinek4 = document.querySelector("#ujinek4");


// MÓDOSÍTÁS: A függvény mostantól paraméterként várja az adatokat, és AZONNAL nyit
export function initMegosztas(kitoltesId, kitoltesNev, vizsgaltId, { fullname }) {    
    // Kilépés gomb kezelése (elég egyszer definiálni, vagy ellenőrizni)
    const kilep4 = document.querySelector("#kilep4");
    if (kilep4 && !kilep4.dataset.bound) {
        kilep4.dataset.bound = "1";
        kilep4.addEventListener("click", () => {
            felbukkano4.style.scale = "0";
            felbukkano4.style.opacity = "0";
            setTimeout(() => { felbukkano4.style.display = "none"; }, 400);
        });
    }

    // Ablak megjelenítése
    lapozo.appendChild(felbukkano4);
    felbukkano4.style.display = "flex";
    felbukkano3.style.display = "none";
    felbukkano2.style.display = "none";
    felbukkano4.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Adatok beállítása a #kuldendo div-re
    const kuldendo = document.querySelector("#kuldendo");
    
    kuldendo.setAttribute('data-id', kitoltesId);
    kuldendo.setAttribute('data-title', kitoltesNev);
    kuldendo.setAttribute('data-name', fullname);
    
    // Takarítás: régi elemek törlése
    kuldendo.querySelectorAll('.oldDiv').forEach(div => div.remove());

    // Animációk
    setTimeout(() => {
        felbukkano4.style.opacity = "1";
        felbukkano4.style.scale = "1";
    }, 100);

    ujinek4.style.display = "flex";
    setTimeout(() => {
        ujinek4.style.opacity = "1";
        ujinek4.style.scale = "1";
    }, 50);

    // Select lista reset és betöltés
    const selectElement = document.getElementById('inner-share-select2');
    selectElement.innerHTML = '<option value="" disabled selected> Válasszon kollegát</option>';

    // Modul ID és Vizsgált ID mentése
    kuldendo.dataset.undo = vizsgaltId;
    
    // Felhasználók betöltése (már megosztottak)
    loadSharedUsers();

    // Új megosztható felhasználók lekérése
fetch('/get-users-by-institution')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                data.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.setAttribute('data-mail', user.mail);
                    option.textContent = user.vez;
                    selectElement.appendChild(option);
                });
            } else {
                console.error(data.message);
            }
        })
        .catch(error => console.error('Hiba a felhasználók betöltésekor:', error));
}


async function loadSharedUsers() {
    const kuldendo = document.querySelector("#kuldendo");
    const idk = kuldendo.getAttribute("data-id");

    if (!idk) {
        console.error("Nincs `data-id` érték a #kuldendo divben!");
        return;
    }

    // 🔹 ELŐSZÖR TISZTÍTJUK KI A RÉGI TARTALMAT
    kuldendo.querySelectorAll(".oldDiv").forEach(div => div.remove());
    kuldendo.querySelectorAll(".newDiv").forEach(div => div.remove());

    try {
const response = await fetch(`/get_shared_users?idk=${encodeURIComponent(idk)}`);
        const users = await response.json();

        if (!users.length) {
            return;
        }

        users
            .filter(u => u.role !== 'removed')
            .forEach(user => {

                const newDiv = document.createElement('div');
                newDiv.classList.add("oldDiv");
                newDiv.setAttribute('data-vizsgalt-id', kuldendo.dataset.undo);


                newDiv.textContent = `${user.fullname || ''} - ${user.role.toLowerCase() === "admin" ? "Létrehozó" : "Szerkesztő"}`;      
                newDiv.setAttribute('data-id', user.id);
                newDiv.setAttribute('data-role', user.role);
                kuldendo.appendChild(newDiv);

                if (user.role !== "admin") {
                    const kiszed = document.createElement("div");
                    kiszed.textContent = `X`;
                    kiszed.classList.add("ex");
                    newDiv.appendChild(kiszed);

                 kiszed.addEventListener("click", async function() { // 1. ASYNC kulcsszó hozzáadása
    
const megerosites = await customConfirm(
    `Biztos elveszi a jogosultságot? <b>${escapeHTML(user.fullname || '')}</b> nem fog többé hozzáférni az értékeléshez.`
);
    if (megerosites) { 
        const parent = kiszed.parentElement;
        const felhasznalo_id = parent.getAttribute("data-id");
        const idk = kuldendo.getAttribute("data-id");

        parent.remove(); 

        fetch('/delete_role', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ felhasznalo_id, idk })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(`Törölve az adatbázisból: ${felhasznalo_id} idk=${idk}`);
            } else {
                console.error("Hiba történt az adatbázisból való törlés során:", data.message);
            }
        })
        .catch(error => {
            console.error("Fetch hiba:", error);
        });
    }
});
                }
            });

    } catch (error) {
        console.error("Hiba történt a felhasználók betöltésekor:", error);
    }
}


const massageCheckbox = document.querySelector("#massage");
const hiddenMsgDiv = document.querySelector("#hiddenmsg");
const ujinek4Div = document.querySelector("#kuldendo");

massageCheckbox.addEventListener("change", function() {
    if (massageCheckbox.checked) {
        if (!document.querySelector("#msgtxt")) {
            const textArea = document.createElement("textarea");
            textArea.id = "msgtxt";
            textArea.placeholder = "Írjon üzenetet a társ szerkesztőknek. Ezt a megosztás után e-mailben fogják megkapni...";
            textArea.style.width = "100%";
            textArea.style.height = "100px";
            ujinek4Div.appendChild(textArea);
        }
        hiddenMsgDiv.style.display = "flex";
        hiddenMsgDiv.addEventListener("click", function() {
            const textArea = document.querySelector("#msgtxt");
            if (textArea) {
                if (textArea.style.display === "none") {
                    textArea.style.display = "flex";
                } else {
                    textArea.style.display = "none";
                }
            }
        });
    } else {
        hiddenMsgDiv.style.display = "none";
        const existingTextArea = document.querySelector("#msgtxt");
        if (existingTextArea) {
            existingTextArea.remove();
        }
    }
});


const maile = document.querySelector("#mail");
maile.addEventListener("input", function() {
    const mailname = this.value;
    const cursorPosition = this.selectionStart;

    if (mailname.length > 3) {
fetch(`/check-mailname2?mailname=${encodeURIComponent(mailname)}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    showToast("Hozzáadásra kész!");
                    maile.setAttribute('data-valid', 'true');
                    maile.setAttribute('data-mail', maile.value);
                    maile.value = data.vez;
                    maile.setAttribute("data-id", data.id);
                    return;
                } else {
                    showToast("Nincs ilyen felhasználó!");
                    maile.classList.remove("borderr");
                    maile.setAttribute('data-valid', 'false');
                    maile.value = mailname;
                    maile.removeAttribute("data-id");
                }
                maile.setSelectionRange(cursorPosition, cursorPosition);
            })
            .catch(error => console.error("Hiba:", error));
    }
});
document.querySelector('#add').addEventListener('click', function() {
    const selectElement = document.querySelector('#inner-share-select2');
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    
    const kuldendo = document.querySelector("#kuldendo"); // Define kuldendo here locally

    if (selectedOption.value === "") {
        showToast("Válasszon a listából!");
        return;
    }
    const name = selectedOption.textContent;
    const value = selectedOption.value;
    const maildata = selectedOption.getAttribute("data-mail");
    const title = kuldendo.getAttribute('data-title');

const existingDiv = document.querySelector(`#kuldendo div[data-id="${CSS.escape(String(value || ''))}"]`);
    if (existingDiv) {
        showToast("Ez a kolléga már hozzá lett adva!");
        return;
    }

    // Új div létrehozása és hozzáadása
    const newDiv = document.createElement('div');
    newDiv.classList.add("newDiv")
    newDiv.textContent = name || '';
    newDiv.setAttribute('data-id', value); //felhasznalo_id - Megosztott ID-ja
    newDiv.setAttribute('data-mail', maildata); //Megosztott Mail címe (mailhez)
    newDiv.setAttribute('data-title', title); //kitoltes_neve - cím
    newDiv.setAttribute('data-name', kuldendo.getAttribute('data-name')); //Címző (mailhez)
    newDiv.setAttribute('data-idk', kuldendo.getAttribute('data-id')); //idk - megosztandó kitöltés ID -je
    newDiv.setAttribute('data-role', "editor"); //role - megosztott titulusa
    const eltavolit = document.createElement("div");
    eltavolit.textContent = `X`;
    eltavolit.classList.add("ex2");
    newDiv.appendChild(eltavolit);
    document.querySelector('#kuldendo').appendChild(newDiv);
    eltavolit.addEventListener("click", function() {
        eltavolit.parentElement.remove();
    });
});
document.querySelector('#add2').addEventListener('click', function() {
    const selectElement = document.querySelector('#mail');
    const kuldendo = document.querySelector("#kuldendo"); // Define kuldendo here locally

    if (selectElement.value === "") {
        showToast("Írja be a felhasználó e-mail címét!");
        return;
    }
    if (selectElement.getAttribute('data-valid') === "false") {
        showToast("Hibás e-mail cím!");
        return;
    }
    const name = selectElement.value;
    const value = selectElement.getAttribute('data-id');
    const mailname = selectElement.getAttribute('data-mail');
const existingDiv = document.querySelector(`#kuldendo div[data-id="${CSS.escape(String(value || ''))}"]`);
    if (existingDiv) {
        showToast("Ez a kolléga már hozzá lett adva!");
        return;
    }
    // Új div létrehozása és hozzáadása
    const newDiv = document.createElement('div');
    newDiv.classList.add("newDiv")
newDiv.textContent = name || '';
    newDiv.setAttribute('data-id', value); //felhasznalo_id
    newDiv.setAttribute('data-mail', mailname); //felhasznalo_id
    newDiv.setAttribute('data-title', kuldendo.getAttribute('data-title'));
    newDiv.setAttribute('data-name', kuldendo.getAttribute('data-name')); //kitoltes_neve
    newDiv.setAttribute('data-idk', kuldendo.getAttribute('data-id')); //idk
    newDiv.setAttribute('data-role', "editor"); //role
    const eltavolit = document.createElement("div");
    eltavolit.textContent = `X`;
    eltavolit.classList.add("ex2");
    newDiv.appendChild(eltavolit);
    document.querySelector('#kuldendo').appendChild(newDiv);
    eltavolit.addEventListener("click", function() {
        eltavolit.parentElement.remove();
    });
});

// Felugró értesítési ablak megjelenítése
function showToast(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 3000);
}

document.querySelector("#gobut4").addEventListener("click", async function(event) {
    event.preventDefault(); 

    const kuldendo = document.querySelector("#kuldendo");
    const vizsId = kuldendo.dataset.undo; 

    const newDivs = kuldendo.querySelectorAll(".newDiv");
    const massageCheckbox = document.querySelector("#massage");
    const textArea = document.querySelector("#msgtxt");

    if (newDivs.length === 0) {
        loadingOverlay.style.display = "flex";
        loadingOverlay.style.opacity = '1';
        animateMessage("Nincsenek megosztható adatok!", "large", "red");
        setTimeout(() => loadingOverlay.style.display = "none", 3000);
        return;
    }
    
    // 🔹 A megerősítés most már helyes (async/await)
    const megerosites = await customConfirm("Biztosan megosztja az adatokat?");
    if (!megerosites) return; 

    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '1';
    animateMessage("Megosztás folyamatban...", "large", "black");

   try {
    // Adatok összeállítása
    // A modul_id-t nem küldjük frontendből: a backend sessionből veszi.
    const adatok = Array.from(newDivs).map(div => {
        let adat = {
            felhasznalo_id: div.getAttribute("data-id"),
            kitoltes_neve: kuldendo.getAttribute("data-title"),
            idk: div.getAttribute("data-idk"),
            role: div.getAttribute("data-role"),
            innerHTML: div.childNodes[0].textContent.trim(),
            data_name: div.getAttribute("data-name"),
            data_mail: div.getAttribute("data-mail"),
            vizsgalt_id: vizsId
        };

        if (massageCheckbox.checked && textArea && textArea.value.trim() !== "") {
            adat.message = textArea.value.trim();
        }

        return adat;
    });

    const response = await fetch("/insert_kitoltes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kitoltesek: adatok })
    });

        const data = await response.json();

        // --- EREDMÉNY KEZELÉSE ÉS TAKARÍTÁS ---
        
        if (data.success) {
            // 1. Sikerüzenet
            animateMessage("Sikeres megosztás!", "medium", "gold");

            // 2. Késleltetett bezárás és takarítás (hogy el tudják olvasni az üzenetet)
            setTimeout(() => {
                loadingOverlay.style.display = "none"; // Loading eltüntetése

                // Ablak bezárása animálva
                felbukkano4.style.opacity = "0";
                felbukkano4.style.scale = "0";
                setTimeout(() => { felbukkano4.style.display = "none"; }, 400);

                // TAKARÍTÁS (Cleanup):
                // Töröljük a hozzáadott embereket a listából
                kuldendo.querySelectorAll(".newDiv").forEach(div => div.remove());

                // Mezők ürítése
                if (textArea) textArea.value = "";
                if (massageCheckbox) massageCheckbox.checked = false;
                if (hiddenMsgDiv) hiddenMsgDiv.style.display = "none";
                
                const mailInput = document.querySelector("#mail");
                if (mailInput) mailInput.value = "";
                
                const select = document.querySelector('#inner-share-select2');
                if (select) select.selectedIndex = 0;

            }, 2000); // 2 másodperc múlva záródik be

        } else {
            // Hiba esetén
            animateMessage("Hiba történt a megosztás során!", "medium", "red");
            setTimeout(() => loadingOverlay.style.display = "none", 3000);
        }

    } catch (error) {
        console.error("Fetch hiba:", error);
        animateMessage("Hálózati hiba történt!", "large", "red");
        setTimeout(() => loadingOverlay.style.display = "none", 3000);
    }
});