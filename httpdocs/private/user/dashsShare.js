//Készülő Értékelések megosztása 

import { userId, userName, modulId,intezmeny, intezmeny_id,  mailname, adatok, letrehoz, fullname, resz1, resz2, resz3, aktualisKitoltesId,  animateMessage } from './dashMain.js'
        const felbukkano4 = document.querySelector("#felbukkano4");
                const felbukkano3 = document.querySelector("#felbukkano3");
        const felbukkano2 = document.querySelector("#felbukkano2");
                    const lapozo = document.getElementById('lapok');
    const loadingOverlay = document.getElementById('loading-overlay');
    import{showAlert} from "/both/alert.js"

const ujinek4 = document.querySelector("#ujinek4"); // <-- EZ HIÁNYZOTT


let currentModulId = null;

export function initMegosztas({ fullname, intezmeny_id }) {
const shareButtons = document.querySelectorAll(".share"); 
shareButtons.forEach(share => {
        if (!share.classList.contains("share-init")) {
        share.classList.add("share-init");
    share.addEventListener('click', function(event) {
          const kilep4 = document.querySelector("#kilep4");
  if (kilep4 && !kilep4.dataset.bound) {
    kilep4.dataset.bound = "1";
    kilep4.addEventListener("click", () => {
      felbukkano4.style.scale = "0";
      felbukkano4.style.opacity = "0";
      setTimeout(() => { felbukkano4.style.display = "none"; }, 400);
    });
  }
        lapozo.appendChild(felbukkano4);
        felbukkano4.style.display = "flex";
        felbukkano3.style.display = "none";
        felbukkano2.style.display = "none";
        felbukkano4.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const kuldendo = document.querySelector("#kuldendo");
        const dataId = event.currentTarget.getAttribute('data-id');
        const datatitle = event.currentTarget.getAttribute('data-name');

        kuldendo.setAttribute('data-id', dataId);
        kuldendo.setAttribute('data-title', datatitle);
        kuldendo.setAttribute('data-name', fullname);
        kuldendo.querySelectorAll('.oldDiv').forEach(div => div.remove());


        setTimeout(() => {
            felbukkano4.style.opacity = "1";
            felbukkano4.style.scale = "1";
        }, 100);

        ujinek4.style.display = "flex";
        setTimeout(() => {
            ujinek4.style.opacity = "1";
            ujinek4.style.scale = "1";
        }, 50);

        const selectElement = document.getElementById('inner-share-select2');
        selectElement.innerHTML = '<option value="" disabled selected> Válasszon kollegát</option>';

        const kitoltesDiv = event.target.closest('.meglevok');
        const vizsgaltId    = kitoltesDiv.dataset.undo;       
        currentModulId = kitoltesDiv?.dataset.modulId;
        kuldendo.dataset.modulId = currentModulId;
        kuldendo.dataset.undo = vizsgaltId;                   // ← ide kerüljön!
        loadSharedUsers();


        fetch(`/get-users-by-institution?intezmeny_id=${intezmeny_id}&modul_id=${modulId}`)
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
    });
}
});

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
        const response = await fetch(`/get_shared_users?idk=${idk}`);
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


            newDiv.innerHTML = `${user.fullname} - ${user.role.toLowerCase() === "admin" ? "Létrehozó" : "Szerkesztő"}`;
            newDiv.setAttribute('data-id', user.id);
            newDiv.setAttribute('data-role', user.role);
            kuldendo.appendChild(newDiv);

            if (user.role !== "admin") {
                const kiszed = document.createElement("div");
                kiszed.innerHTML = `X`;
                kiszed.classList.add("ex");
                newDiv.appendChild(kiszed);

                kiszed.addEventListener("click", function () {
                    if (confirm(`Biztos elveszi a jogosultságot? ${user.fullname} nem fog többé hozzáférni az értékeléshez.`)) {
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

                massageCheckbox.addEventListener("change", function () {
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
                        hiddenMsgDiv.addEventListener("click", function () {
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
            fetch(`/check-mailname2?mailname=${mailname}&modul_id=${modulId}`)
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

                    if (selectedOption.value === "") {
                        showToast("Válasszon a listából!");
                        return;
                    }
                    const name = selectedOption.textContent;
                    const value = selectedOption.value;
                    const maildata = selectedOption.getAttribute("data-mail");
                    const title = kuldendo.getAttribute('data-title');

                    const existingDiv = document.querySelector(`#kuldendo div[data-id="${value}"]`);
                    if (existingDiv) {
                        showToast("Ez a kolléga már hozzá lett adva!");
                        return;
                    }

                    // Új div létrehozása és hozzáadása
                    const newDiv = document.createElement('div');
                    newDiv.classList.add("newDiv")
                    newDiv.innerHTML = name;
                    newDiv.setAttribute('data-id', value);//felhasznalo_id - Megosztott ID-ja
                    newDiv.setAttribute('data-mail', maildata);//Megosztott Mail címe (mailhez)
                    newDiv.setAttribute('data-title', title);//kitoltes_neve - cím
                    newDiv.setAttribute('data-name', kuldendo.getAttribute('data-name')); //Címző (mailhez)
                    newDiv.setAttribute('data-idk', kuldendo.getAttribute('data-id')); //idk - megosztandó kitöltés ID -je
                    newDiv.setAttribute('data-role', "editor");//role - megosztott titulusa
                    const eltavolit = document.createElement("div");
                                eltavolit.innerHTML= `X`;
                                eltavolit.classList.add("ex2");
                                newDiv.appendChild(eltavolit);   
                    document.querySelector('#kuldendo').appendChild(newDiv);
                        eltavolit.addEventListener("click", function() {
                        eltavolit.parentElement.remove();
                        });
                });
                document.querySelector('#add2').addEventListener('click', function() {
                    const selectElement = document.querySelector('#mail');

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
                    const existingDiv = document.querySelector(`#kuldendo div[data-id="${value}"]`);
                    if (existingDiv) {
                        showToast("Ez a kolléga már hozzá lett adva!");
                        return;
                    }
                    // Új div létrehozása és hozzáadása
                    const newDiv = document.createElement('div');
                    newDiv.classList.add("newDiv")
                    newDiv.innerHTML = name;
                    newDiv.setAttribute('data-id', value);//felhasznalo_id
                    newDiv.setAttribute('data-mail', mailname);//felhasznalo_id
                    newDiv.setAttribute('data-title', kuldendo.getAttribute('data-title'));
                    newDiv.setAttribute('data-name', kuldendo.getAttribute('data-name')); //kitoltes_neve
                    newDiv.setAttribute('data-idk', kuldendo.getAttribute('data-id')); //idk
                    newDiv.setAttribute('data-role', "editor");//role
                    const eltavolit = document.createElement("div");
                                eltavolit.innerHTML= `X`;
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

document.querySelector("#gobut4").addEventListener("click", async function (event) {
    event.preventDefault(); // 🔹 Megakadályozza az oldal újratöltését

    const kuldendo = document.querySelector("#kuldendo");
    const vizsId   = kuldendo.dataset.undo;  // mindig definiált

    const newDivs = kuldendo.querySelectorAll(".newDiv");
    const massageCheckbox = document.querySelector("#massage");
    const textArea = document.querySelector("#msgtxt");

    if (newDivs.length === 0) {
        loadingOverlay.style.display="flex";
        loadingOverlay.style.opacity='1';
        animateMessage("Nincsenek megosztható adatok!", "large", "red");
            setTimeout(() => loadingOverlay.style.display="none", 3000);

        return;

    }
const modul_id = kuldendo.dataset.modulId;

const adatok = Array.from(newDivs).map(div => {
    let adat = {
        felhasznalo_id: div.getAttribute("data-id"),
        kitoltes_neve: kuldendo.getAttribute("data-title"),
        idk: div.getAttribute("data-idk"),
        role: div.getAttribute("data-role"),
        innerHTML: div.childNodes[0].textContent.trim(), 
        data_name: div.getAttribute("data-name"),
        data_mail: div.getAttribute("data-mail"),
        modul_id: modul_id,
  vizsgalt_id:    vizsId,                       // ← innentől már soha nem lesz null
    };

    if (massageCheckbox.checked && textArea && textArea.value.trim() !== "") {
        adat.message = textArea.value.trim();
    }
    return adat;
});


    if (!confirm("Biztos megosztja az adatokat?")) {return;}
    loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity='1';
    animateMessage("Megosztás folyamatban...", "large", "black");

    const startTime = Date.now(); // Időzítés kezdeti érték

    try {
console.log("KÜLDENDŐ modul_id:", modulId);
console.log("KÜLDENDŐ adatok:", adatok);
const modul_id = kuldendo.dataset.modulId;   // snake_case, konzisztens

if (!modul_id) {
    loadingOverlay.style.display="flex";
    loadingOverlay.style.opacity='1';
    animateMessage("Hiányzó modul_id!", "large", "red"); 
                setTimeout(() => loadingOverlay.style.display="none", 3000);

    return; 
}

        const response = await fetch("/insert_kitoltes", {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
body : JSON.stringify({ modul_id, kitoltesek: adatok })

        });

        const data = await response.json();

        setTimeout(() => {
            const textColor = data.success ? "gold" : "red";

            if (!data.success) {
                console.error("Megosztási hiba!");
                loadingOverlay.style.display="flex";        
                loadingOverlay.style.opacity='1';
                animateMessage("Hiba történt a megosztás során!", "medium", "red");
                            setTimeout(() => loadingOverlay.style.display="none", 3000);

            } else {
        loadingOverlay.style.display="flex";  
        loadingOverlay.style.opacity='1';

                animateMessage("Sikeres megosztás!", "medium", textColor);
            }
        }, 1000);
        loadingOverlay.style.display = "flex";
           
        loadingOverlay.style.opacity='1';
animateMessage(data.success ? "Sikeres megosztás!" : "Hiba történt!", "medium", data.success ? "gold" : "red");

    setTimeout(() => location.reload(), 3000);


    } catch (error) {
        console.error("Fetch hiba:", error);
           loadingOverlay.style.display="flex";
        loadingOverlay.style.opacity='1';
        animateMessage("Hálózati hiba történt!", "large", "red");

        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            setTimeout(() => {
                location.reload();
            }, 1000);
        }, 4000);
    }
});

