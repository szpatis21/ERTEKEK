const alap = document.querySelector("#fo_kategoriak");
    const felbukkano = document.querySelector("#felbukkano");
    const felbukkano2 = document.querySelector("#felbukkano2");
    const felbukkano3 = document.querySelector("#felbukkano3");
    const felbukkano4 = document.querySelector("#felbukkano4");

        const sav = document.querySelector("#sav");
        const sav2 = document.querySelector("#sav2");
        const sav3 = document.querySelector("#sav3");
        const sav4 = document.querySelector("#sav4");

            const kilep = document.querySelector("#kilep");
            const kilep2 = document.querySelector("#kilep2");
            const kilep3 = document.querySelector("#kilep3");
            const kilep4 = document.querySelector("#kilep4");

        const tartalom = document.querySelector("#tartalom");
        const tartalom2 = document.querySelector("#tartalom2");
        const tartalom3 = document.querySelector("#tartalom3");
        const tartalom4 = document.querySelector("#tartalom4");

        let eredetiErtekekTomb = [];
        let eredetIdTomb = [];
        let eredetiTorlesTomb = [];
        let torlesIdTomb = [];

const folytkov = document.querySelector("#folytkov");
const ujkezd = document.querySelector("#ujkezd");
const uj = document.querySelector("#uj");
const uj2 = document.querySelector("#uj2");
const go2 = document.querySelector("#gobut2");

    const ujinek = document.querySelector("#ujinek");
    const ujinek2 = document.querySelector("#ujinek2");
    const ujinek4 = document.querySelector("#ujinek4");

    const letrehozva = new Date().toISOString().split('T')[0]; // Mai dátum (YYYY-MM-DD formátumban)
    const neve = document.querySelector("#neve");
    let neve2 = document.querySelector("#neve2");
    const idszak = document.querySelector("#idoszak");
    let idszak2 = document.querySelector("#idoszak2");
    const megnevezes = document.querySelector("#megnevezes");
    let megnevezes2 = document.querySelector("#megnevezes2");

    const innerDiv = document.querySelector(".inner-div")
    const go = document.querySelector("#gobut");
    const sajtnev = document.querySelector("#sajatnev");
    
    let userId = null; 
    let userName = null; 
    let intezmeny =null;
    let intezmeny_id =null;

    let adatok = null;
    let letrehoz = null;
    let fullname = null;
    let resz1 = '', resz2 = '', resz3 = ''; // Globális változók az eredeti értékek tárolására
    let aktualisKitoltesId = null; // Globális változó a kitöltés ID tárolására
    let inactivityTimer;
        document.addEventListener('mousemove', resetInactivityTimer);
        document.addEventListener('keypress', resetInactivityTimer);
    resetInactivityTimer();
    getUserAndLoadKitoltesek();
    function animateMessage(text, fontSize, color) {
        const logobelso = document.getElementById('logobelso');
        if (logobelso) {
            logobelso.innerHTML = text;
            logobelso.style.fontSize = fontSize;
            logobelso.style.color = color;
            logobelso.style.textAlign = "center";
            logobelso.classList.remove('fade-out', 'fade-in'); // Előző animációk törlése
            logobelso.classList.add('fade-in'); // Beúsztatás
        }
    }
    
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            // Logout kérés küldése a backend felé
            fetch('/logout', { method: 'POST' })
                .then(() => {
                    alert('Automatikusan kijelentkeztél tétlenség miatt.');
                    window.location.href = '/index.html'; // Átirányítás az index oldalra
                })
                .catch(err => console.error('Hiba a kijelentkezés során:', err));
        }, 220000); // 1 perc inaktivitás
    }

    async function getUserAndLoadKitoltesek() {
        try {
            const response = await fetch('/get-username', {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
            });
            const data = await response.json();
    
            if (data.success) {
                sajtnev.innerHTML = "&nbsp;" + data.username;

                userId = data.id; 
                fullname = data.vez;
                mailname = data.mail;
                userName = data.username; 
                intezmeny = data.intnev; 
                intezmeny_id = data.int_id; 

                await loadKitoltesek();
            } else {console.error('Hiba:', data.message);}
        } catch (error) {console.error('Fetch hiba:', error);
        }
    }
    
    async function loadKitoltesek() {
        try {
            const response = await fetch(`/api/get-kitoltesek?felhasznalo_id=${userId}`);
            const data = await response.json();
    
            if (data.success) {
                const kitoltesek = data.kitoltesek;
                const role = data.role;

                if (kitoltesek.length === 0) {
                    innerDiv.innerHTML = '<p>Még nincsenek értékelései. Hozzon létre újakat!</p>';
                    return;
                }
    
                const selectElement = document.querySelector('#inner-div-select');
                //Már meglévők betöltése
                kitoltesek.forEach(kitoltes => {
                    const optionElement = document.createElement('option');
                    optionElement.value = kitoltes.idk; // Kitöltés ID lesz az érték

                    optionElement.textContent = kitoltes.kitoltes_neve.replace(/-/g, ' - '); // Formázott név
    
                    selectElement.appendChild(optionElement);
                        selectElement.addEventListener('change', (event) => {
                        const selectedKitoltesId = event.target.value;
                        if (selectedKitoltesId) {
                            const newUrl = `./ertekelo.html?kitoltes_id=${selectedKitoltesId}&letrehozva=${encodeURIComponent(letrehozva)}`;
                            console.log('Navigálás az URL-re (select):', newUrl);
                            window.location.href = newUrl;
                        }
                    });
    
                    // Div generálás
                    const tartaly = document.createElement("div");
                    tartaly.classList.add("tart");
                    innerDiv.appendChild(tartaly);

                    const kitoltesDiv = document.createElement('div');
                    kitoltesDiv.classList.add('meglevok');
                    const formattedText = kitoltes.kitoltes_neve.replace(/-/g, '- <br>');
                    kitoltesDiv.innerHTML = formattedText;
                    kitoltesDiv.dataset.kitoltesId = kitoltes.idk;
                    kitoltesDiv.setAttribute("data-role", kitoltes.role); // Kitöltés ID lesz az érték
                    const savDiv = document.createElement('div');
                    if (kitoltes.role === "editor") {
                        savDiv.innerHTML = `<div class="savdiv"> Megosztott értékelés</div>`
                        tartaly.prepend(savDiv);
                        savDiv.firstChild.style.background ='#ff9707';
                    }else{
                        savDiv.innerHTML = `
                            <div class="savdiv">
                                <span class="material-symbols-rounded edit" data-action="edit" data-id="${kitoltes.idk}" data-name ="${kitoltes.kitoltes_neve}">edit</span>
                                <span class="material-symbols-rounded share" data-action="share" data-id="${kitoltes.idk}" data-name ="${kitoltes.kitoltes_neve}">share</span>
                                <span class="material-symbols-rounded deleted" data-action="delete" data-id="${kitoltes.idk}" data-name ="${kitoltes.kitoltes_neve}">delete</span>
                            </div>
                        `;
                        tartaly.prepend(savDiv);
                    }
                    // Kattintási esemény a div-hez
                    kitoltesDiv.addEventListener('click', () => {
                        const kitoltesId = kitoltesDiv.dataset.kitoltesId;
                        const newUrl = `./ertekelo.html?kitoltes_id=${kitoltesId}&letrehozva=${encodeURIComponent(letrehozva)}`;
                        console.log('Navigálás az URL-re (div):', newUrl);
                        window.location.href = newUrl;
                    });
    
                    tartaly.appendChild(kitoltesDiv);
                });
                
                const deletedButtons = document.querySelectorAll(".deleted"); // Minden törlés gomb kiválasztása
                deletedButtons.forEach(deleted => {
                    deleted.addEventListener('click', function() {
                        const kitoltesId = deleted.dataset.id; // Az adott kitöltés ID-jének lekérése

                        const megerosites = confirm(`Biztosan törölni szeretné ezt a kitöltést? ${kitoltesId}`);
                        if (!megerosites) {return;  }
                        fetch('/api/delete-kitoltes', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: kitoltesId })
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    alert('Sikeres törlés!');
                                    window.location.reload(); // Oldal újratöltése a frissített adatokkal
                                } else {
                                    console.error('Hiba történt a törlés során:', data.message);
                                }
                            })
                            .catch(error => {
                                console.error('Fetch hiba:', error);
                            });
                    });
                });
 // Megosztás
                async function loadSharedUsers() {
                    const kuldendo = document.querySelector("#kuldendo");
                    const idk = kuldendo.getAttribute("data-id"); // Az értékelés ID-ja

                    if (!idk) {
                        console.error("Nincs `data-id` érték a #kuldendo divben!");
                        return;
                    }
                    try {
                        const response = await fetch(`/get_shared_users?idk=${idk}`);
                        const users = await response.json();

                        if (!users.length) {
                            return;
                        }

                        // 🔹 Meglévő felhasználók beszúrása a `#kuldendo` divbe
                        users.forEach(user => {
                            const newDiv = document.createElement('div');
                            newDiv.classList.add("oldDiv");
                        
                            newDiv.innerHTML = `${user.fullname} - ${user.role.toLowerCase() === "admin" ? "Létrehozó" : "Szerkesztő"}`;
                            newDiv.setAttribute('data-id', user.id);
                            newDiv.setAttribute('data-role', user.role);
                            document.querySelector('#kuldendo').appendChild(newDiv);
                            if (user.role !=="admin")
                            {
                            const kiszed = document.createElement("div");
                            kiszed.innerHTML= `X`;
                            kiszed.classList.add("ex");
                            newDiv.appendChild(kiszed);

                            kiszed.addEventListener("click", function() {
                                if (confirm(`Biztos elveszi a jogosultságot? ${user.fullname} nem fog többé hozzáférni az értékeléshez. `)) {
                                    const parent = kiszed.parentElement;
                                    const felhasznalo_id = parent.getAttribute("data-id");
                                    const idk = document.querySelector("#kuldendo").getAttribute("data-id");
                            
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
                                            console.log("Sikeresen törölve az adatbázisból!");
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
            //MEGOSZTÁS
                const shareButtons = document.querySelectorAll(".share"); 
                shareButtons.forEach(share => {
                    share.addEventListener('click', function(event) {
                        felbukkano4.style.display = "flex";

                        const existingOldDiv = document.querySelector("#kuldendo .oldDiv");
                        if (!existingOldDiv) {
                        felbukkano4.style.display = "flex";

                        const clickedElement = event.currentTarget;
                        const dataId = clickedElement.getAttribute('data-id');
                        const datatitle = clickedElement.getAttribute('data-name');

                        const kuldendo = document.querySelector("#kuldendo");

                        kuldendo.setAttribute('data-id', dataId);
                        kuldendo.setAttribute('data-title', datatitle);
                        kuldendo.setAttribute('data-name', fullname);

                        loadSharedUsers();
                        }
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

                        fetch(`/get-users-by-institution?intezmeny_id=${intezmeny_id}`)
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

                            kilep4.addEventListener("click", function() {
                                const kuldendo = document.querySelector("#kuldendo");
                                const massageCheckbox = document.querySelector("#massage");
                                const textArea = document.querySelector("#msgtxt");
                                const hiddenmsg = document.querySelector("#hiddenmsg");
                                hiddenmsg.style.display = "none";
                                const mail = document.querySelector("#mail");
                                mail.value ="";
                            
                                kuldendo.querySelectorAll(".newDiv").forEach(div => div.remove());
                                kuldendo.querySelectorAll(".oldDiv").forEach(div => div.remove());
                            
                                if (textArea) {textArea.remove();}
                                if (massageCheckbox) {massageCheckbox.checked = false;}                            
                                felbukkano4.style.scale = "0.0";
                                felbukkano4.style.opacity = "0";
                            
                                setTimeout(() => {
                                    felbukkano4.style.display = "none";
                                }, 400);
                            });
                    });
                });
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
                    const cursorPosition = this.selectionStart; // Megjegyezzük a kurzor pozícióját

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
//SZERKESZTÉS
                //Név módosítása
                const editButtons = document.querySelectorAll(".edit"); 
                editButtons.forEach(edit => {
                 
                    edit.addEventListener('click', function() {
                        felbukkano3.style.display = "flex";
                        setTimeout(() => {
                            felbukkano3.style.opacity = "1"; 
                            felbukkano3.style.scale = "1";
                        }, 100);

                        ujinek2.style.display = "flex";
                        setTimeout(() => {
                            ujinek2.style.opacity = "1"; 
                            ujinek2.style.scale = "1";
                        }, 50);

                        let [resz1, resz2, resz3] = edit.dataset.name.split('-').map(resz => resz.replace(/~/g, '-').trim());
                        let kitoltesId = edit.dataset.id;
                        neve2.value = resz1;
                        idszak2.value = resz2;
                        megnevezes2.value = resz3;
                    let eredetiErtekek = `${resz1}-${resz2}-${resz3}`;
                    eredetiErtekekTomb.push(eredetiErtekek); 
                    let eredetId = edit.dataset.id;

                    eredetIdTomb.push(eredetId); 

                        kilep3.addEventListener("click", function(){
   
                            felbukkano3.style.scale ="0.0";
                            felbukkano3.style.opacity = "0"; 
                            setTimeout(() => {

                                console.log(neve2.value);
                                felbukkano3.style.display = "none";
                            }, 400);
                        })
                    });
                });

                go2.addEventListener('click', function(event) {
                    event.preventDefault();

                    let kitoltes_neve = `${neve2.value.replace(/-/g, '~')}-${idszak2.value.replace(/-/g, '~')}-${megnevezes2.value.replace(/-/g, '~')}`;
                 
                    if (!neve2.value || !idszak2.value || !megnevezes2.value) {
                        alert('Az egyik mező üres!');
                        return;
                    }
                    if (kitoltes_neve === eredetiErtekekTomb[eredetiErtekekTomb.length - 1]){
                                                alert('Legalább az egyik mezőt módosítani kell, ha frissíteni szeretne!');
                        console.log('Új értékek:', kitoltes_neve);

                        return;
                    }
                    let kitoltesId = eredetIdTomb[eredetIdTomb.length - 1]

                    const megerosites = confirm(
                        `${kitoltesId} Biztosan frissíteni szeretné az adatokat?\nErről: ${eredetiErtekekTomb[eredetiErtekekTomb.length - 1]}\nErre: ${kitoltes_neve}?`
                    );
                    if (!megerosites) {return;}                    
                    const adat = {
                        id: kitoltesId,
                        felhasznalo_id: userId,
                        letrehozva: letrehozva,
                        kitoltes_neve: kitoltes_neve
                    };

                    fetch('/api/update-kitoltes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(adat)
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                alert('Sikeres frissítés!');
                                window.location.reload();
                            } else {
                                console.error('Hiba történt:', data.message);
                            }
                        })
                        .catch(error => {
                            console.error('Fetch hiba:', error);
                        });
                });
                
            } else {console.error('Hiba történt:', data.message);}
        } catch (error) {console.error('Fetch hiba:', error);
        }
    }
    
kilep.addEventListener("click", function(){
    felbukkano.style.scale ="0.0";

    felbukkano.style.opacity = "0"; 
    setTimeout(() => {
        
        felbukkano.style.display = "none";
    }, 400);
})//új
kilep2.addEventListener("click", function(){
    felbukkano2.style.scale ="0.0";

    felbukkano2.style.opacity = "0"; 
    setTimeout(() => {
        
        felbukkano2.style.display = "none";
    }, 400);
})//folytatás

folytkov.addEventListener("click", function(){
    felbukkano.style.display = "flex";
    setTimeout(() => {
        felbukkano.style.opacity = "1"; 
        felbukkano.style.scale ="1";
    }, 100);
})
ujert.addEventListener("click", function(){
    felbukkano2.style.display = "flex";
    setTimeout(() => {
        felbukkano2.style.opacity = "1"; 
        felbukkano2.style.scale ="1";
    }, 100);
    ujinek.style.display = "flex";
    setTimeout(() => {
        ujinek.style.opacity = "1"; 
        ujinek.style.scale ="1";
    }, 50);

})
//Új értékelés indítása
go.addEventListener('click', function (event) {
    event.preventDefault();

    if (!neve.value || !idszak.value || !megnevezes.value) {
        console.error('Hiba: Az egyik mező üres!');
        return;
    }
    const letrehozva = new Date().toISOString().split('T')[0];
    const kitoltes_neve = `${neve.value.replace(/-/g, '~')}-${idszak.value.replace(/-/g, '~')}-${megnevezes.value.replace(/-/g, '~')}`;
    adatok = kitoltes_neve; // Csak a kitöltés neve
    const adat = {
        felhasznalo_id: userId,
        letrehozva: letrehozva,
        kitoltes_neve: kitoltes_neve
    };
    fetch('/api/add-kitoltes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(adat)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const newUrl = `./ertekelo.html?kitoltes_id=${data.id}&letrehozva=${encodeURIComponent(letrehozva)}`;
                window.location.href = newUrl;
            } else {console.error('Hiba történt:', data.message);}
        })
        .catch(error => {console.error('Fetch hiba:', error);
        });
});
document.querySelector("#gobut4").addEventListener("click", async function (event) {
    event.preventDefault(); // 🔹 Megakadályozza az oldal újratöltését

    const kuldendo = document.querySelector("#kuldendo");
    const newDivs = kuldendo.querySelectorAll(".newDiv");
    const massageCheckbox = document.querySelector("#massage");
    const textArea = document.querySelector("#msgtxt");

    if (newDivs.length === 0) {
        animateMessage("Nincsenek küldhető adatok!", "large", "red");
        return;
    }
    const adatok = Array.from(newDivs).map(div => {
        let adat = {
            felhasznalo_id: div.getAttribute("data-id"),
            kitoltes_neve: kuldendo.getAttribute("data-title"),
            idk: div.getAttribute("data-idk"),
            role: div.getAttribute("data-role"),
            innerHTML: div.childNodes[0].textContent.trim(), 
            data_name: div.getAttribute("data-name"),
            data_mail: div.getAttribute("data-mail")
        };
        
            if (massageCheckbox.checked && textArea && textArea.value.trim() !== "") {
            adat.message = textArea.value.trim();
        }
        return adat;
    });

    if (!confirm("Biztos megosztja az adatokat?")) {return;}
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';
    animateMessage("Megosztás folyamatban...", "large", "black");

    const startTime = Date.now(); // Időzítés kezdeti érték

    try {
        const response = await fetch("/insert_kitoltes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ kitoltesek: adatok })
        });

        const data = await response.json();

        setTimeout(() => {
            const textColor = data.success ? "gold" : "red";

            if (!data.success) {
                console.error("Megosztási hiba!");
                animateMessage("Hiba történt a megosztás során!", "medium", "red");
            } else {
                animateMessage("Sikeres megosztás!", "medium", textColor);
            }
        }, 1000);
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            setTimeout(() => {
                location.reload();
            }, 1000);
        }, 3000);

    } catch (error) {
        console.error("Fetch hiba:", error);
        animateMessage("Hálózati hiba történt!", "large", "red");

        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            setTimeout(() => {
                location.reload();
            }, 1000);
        }, 4000);
    }
});