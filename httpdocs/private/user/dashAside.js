import{showAlert} from "/both/alert.js"
let userName, fullname, intezmeny, leiras, hozzaferhetoModulok, mailname, tel, int_fin, fizetve,intkapmail;

// 2. Egy jelző, hogy ne töltsük le az adatokat feleslegesen többször
let adatokBetoltve = false;

// 3. Az új adatlekérő függvény, ami a friss API végpontot használja
async function loadAsideData() {
  if (adatokBetoltve) return; // Ha már be van töltve, ne csináljunk semmit

  try {
    const response = await fetch('/api/user-brief');
    const data = await response.json();

    if (data.success) {
      // Feltöltjük a modul helyi változóit a kapott adatokkal
      userName = data.username;
      fullname = data.fullname;
      intezmeny = data.intezmeny;
      leiras = data.leiras;
      hozzaferhetoModulok = data.hozzaferhetoModulok;
      mailname = data.mailname;
      intkapmail = data.intkapmail;
      tel = data.tel;
      int_fin = data.intfin;
      fizetve = data.fizetve;

      adatokBetoltve = true; // Jelezzük, hogy a betöltés sikeres volt
      console.log(hozzaferhetoModulok)
    } else {
      console.error('Hiba az aside adatok lekérésekor:', data.message);
      showAlert('Nem sikerült betölteni a profil adatokat.');
    }
  } catch (error) {
    console.error('Fetch hiba az aside adatoknál:', error);
  }
}
export async function initAside() {
 await loadAsideData();
        
        // Elemek összegyűjtése
        const gombok = document.querySelectorAll('.gomb .cim');
        const layoutContainer = document.querySelector('.layout');
        const ujTartalmak = {
            'ujert': {
                main: ` <div id="tartalom2">
                            <div id="uj" class="tartdob">
                                <div id="ujinek">
                                    <form action="">
                                    <div class="inek">
                                        <div class="gyikcim">Új értékelés indítása</div>
                                
                                        <div>
                                            <label for="neve">Vizsgálat neve:</label>
                                            <input id="neve" type="text" required placeholder="Adja meg a vizsgálat nevét, címét">
                                        </div>
                                        <div>
                                            <label for="idoszak">Vizsgált időszak:</label>
                                            <input id="idoszak" type="text" required placeholder="Pl tanév, évszám, tárgyhó, stb">
                                        </div>
                                        <div>
                                            <label for="megnevezes">Vizsgálat típusa:</label>
                                    <input id="megnevezes" type="text" required placeholder="Pl: év végi értékelés, jelentés, stb.">
                                        </div>
                                    </div>
                                    <div id="go" style="flex-direction: column-reverse;">
                                        <div class="kijelentem">
                                            <label for="kijelentem">
                                                „Nyilatkozom, hogy rendelkezem a kitöltésben érintett személyek személyes adatainak jogszerű kezeléséhez szükséges
                                                hozzájárulásokkal és tájékoztatással, továbbá tudomásul veszem, hogy ezeket saját intézményemben tárolom és dokumentálom.
                                                Amennyiben a vizsgált személy nem töltötte be 16. életévét úgy én, vagy azon intézmény/munkahely melyenek képviseletében eljárok,
                                                a gyermek törvényes képviselőjének hozzájárulásával is rendelkezem és mind a törvényes képviselő mind a gyermek felé
                                                a megfelelő tájékoztatást nyújtottam ”
                                            </label>
                                            <input type="checkbox" name="kijelentem" id="kijelentem">
                                        </div>
                            <div class="mas">
                                    <div style="margin-top:6vh" id="masik">
                                            <p>Keressünk...</p>
                                        </div>
                                             
                                        <button id="gobut" type="submit" style="    box-shadow: #ffbd16 0px 0px 35px 25px;">
                                            <span class="material-symbols-rounded">edit</span>
                                            <p>Indítás</p>
                                        </button>
                                        
                                             <div id="egyik" style="margin-top:3vh">
                                            <p>...Értékeket</p>
                                        </div>
                                    </div>

                                    </div>
                                </form>
                                </div>
                            </div>
                            
                            </div>`,
                lapok: `
        <div class="info-strip">
            <div class="infocard">
                <h3>Hogy indítok új értékelést?</h3>
                <p>                                    
                    Az alábbi adatok a kinyomtatott/lementett értékelés Főcímét fogják képezni. Később a <span class="material-symbols-rounded">page_header</span> gomb segítségével bármikor változtathat rajta!
                    <br> Töltse ki a vizsgálatra vonatkozó adatokat, majd kattintson az <b>"Indítás"</b>  gombra. Így rögtön az értékelő modulba kerül.
                </p>
            </div>
            <div class="infocard">
                <h3>Hol fogom látni a most létrehozott értékelést?</h3>
                <p>                                    
                    A főoldalon az "ÉRTÉKEIM" menüpont alatt (baloldali sáv).
                </p>
            </div>
            <div class="infocard">
                <h3>Mire jók a bekért adatok?</h3>
                <p>                                    
                    Azon kívűl hogy a dokumentum címét képzik, a meglévő értékeléseknél, ezek alapján lehet szűrni.
                    Például: Szűrés vizsgálat típusa szerint: Az összes olyan értékelés egy helyre lesz csoportosítva amelynek a neve azonos (havi riport, negyedéves értékelés, stb)                                    </p>            
                </p>
            </div>
            <div class="infocard">
                <h3>Mire való a hozzájárulás?</h3>
                <p>                                    
                    Amennyiben egy személyt értékel, hozzjáruló nyilatkozattal kell rendelkeznie, hogy az értékelés az ő tudtával és beleegyezésével történt. A hozzájárulás tényét (pipálás) rendszerenünkben rögzítjük.
                </p>
            </div>
        </div>                            
            `
            },
            'accunt':{ main: () => {
        // --- Kezdőértékek, ha valamiért hiányozna az adat ---
        let licenszLejarat = 'Nincs adat';
        let napokInfo = 'N/A';

        // --- Dátumkezelő logika ---
        // Ellenőrizzük, hogy a szükséges adatok (fizetve, int_fin) léteznek-e
        if (fizetve && int_fin) {
            try {
                // 1. Dátum objektumok létrehozása
                const fizetesDatuma = new Date(fizetve);
                const ma = new Date();
                
                // A lejárat dátumát a fizetés dátumából kiindulva számoljuk
                const lejaratDatuma = new Date(fizetesDatuma);

                // 2. Lejárati dátum kiszámítása: a fizetés dátumához hozzáadjuk a hónapokat
                lejaratDatuma.setMonth(lejaratDatuma.getMonth() + parseInt(int_fin, 10));

                // 3. Lejárati dátum formázása (ÉÉÉÉ.HH.NN)
                const ev = lejaratDatuma.getFullYear();
                const honap = String(lejaratDatuma.getMonth() + 1).padStart(2, '0');
                const nap = String(lejaratDatuma.getDate()).padStart(2, '0');
                licenszLejarat = `${ev}.${honap}.${nap}`;

                // 4. A hátralévő napok kiszámítása (az időpontokat levágjuk a pontosságért)
                const maNormalizalt = new Date(ma.getFullYear(), ma.getMonth(), ma.getDate());
                const lejaratNormalizalt = new Date(lejaratDatuma.getFullYear(), lejaratDatuma.getMonth(), lejaratDatuma.getDate());
                
                const idokulonbseg = lejaratNormalizalt.getTime() - maNormalizalt.getTime();
                const napokSzama = Math.ceil(idokulonbseg / (1000 * 3600 * 24));

                // 5. Az üzenet összeállítása a hátralévő napok alapján
                if (napokSzama < 0) {
                    napokInfo = 'Lejárt';
                } else if (napokSzama === 0) {
                    napokInfo = 'Ma jár le';
                } else {
                    napokInfo = `${napokSzama} nap van hátra`;
                }

            } catch (error) {
                console.error("Hiba a licensz dátumának feldolgozása közben:", error);
             
            }
        }

        return `      
                <div class="grid">
                        <div class="elso">
                        <h1>${fullname}</h1>
                            <p> <b>Felhasználónév: </b>${userName}</p>
                           
                        
                            <p><b>Értékelhető idő (licensz lejárta):</b> <br>${licenszLejarat} - még ${napokInfo}</p>
                        </div>
                    </div>
            
    <div class="info-strip">
            
            <div class="infocard" id="changepass">
                Jelszó megváltoztatása
            </div>
        
            <div class="infocard" id="remove">
                Hozzájárulás visszavonása
            </div>
            <div class="infocard" id="plussj">
                Kérelem jogosultságok bővítésére
            </div>
            <div class="infocard" id="deleteacc">
                Profil Törlése
            </div>

        </div>
        </div>
            
            </div>`;
    },

               lapok: () => {
        // 1. Ellenőrizzük, hogy a tömb létezik-e és tényleg tömb-e
        const modulNevek = hozzaferhetoModulok && Array.isArray(hozzaferhetoModulok)
  ? `<ul>${
hozzaferhetoModulok.map(modul => `<li>${modul.leiras.replace(/^(\S+)/, '<strong>$1</strong>')}</li>`).join('')
    }</ul>`: 'Nincs szakmai modul hozzárendelve';

        // Visszaadjuk a generált HTML-t a helyes adatokkal
        return `        
        <div class="info-strip">
            <div class="infocard">
            <h3>Intézmény</h3>
            <p><b>${intezmeny}</b> - ${intkapmail}</p>
            </div>

            <div class="infocard">
            <h3>Szerepkör</h3>
            <p> ${leiras.replace(/^(\S+)/, '<strong>$1</strong>')}</p>
            </div>

            <div class="infocard">
            <h3>Szakmai modulok</h3>
            <p> ${modulNevek}</p>
            </div>

            <div class="infocard">
            <h3>Elérhetőség</h3>
            <p><b>E-mail: </b>- ${mailname} <br> 
                <b>Telefonszám: </b>- ${tel} <br></p>
            </div>

        </div>`
            }},
            'hozzaj': {
                main: `<h3>Engedélyek Kezelése</h3><p>Itt állíthatod be, hogy ki mihez férhet hozzá a rendszerben.</p>`,
                lapok: `<h4>Szerepkörök</h4><p>Felhasználók csoportosítása szerepkörök szerint.</p>`
            },  
            'ujany': {
                main: ` <div id="tartalom2">
                                <div id="ujinek">
                                    <div class="info-strip">
                                        <div class="infocard" style='font-size:small;'>
                                            <h3>Új Kérdések felvitele meglévő Főkategóriákhoz</h3>
                            
                                            <p style="font-weight:normal">Az indítás gombra kattintva van lehetősége feltölteni a saját szakmai anyagát,
                                                vagy bővíteni a már meglévő anyagot.
                                                </p> <br>
                                                <p>Jelenleg a <span style="color: red"> "szakmai anyag neve" </span> anyagrészhez készül új kérdéseket feltölteni. Ha ez mégsem az ön álltal kiválasztott anyag, lépjen vissza a bejelentkeztető oldalra és válassza ki a megfelelőt a legördülő sávból
                                            </p>
                                        </div>
                                    </div>
                                    

                                    <div class="mas">
                                        <div style="margin-top:6vh" id="masik">
                                            <p>Teremtsünk...</p>
                                        </div>
                                     
                                        <button class="gobut5" style="box-shadow: #ffbd16 0px 0px 35px 25px;">
                                            <a href="/upload.html" >
                                                <span class="material-symbols-rounded">lab_panel</span>
                                                <p>Indítás</p>
                                            </a>
                                       </button>  

                                        <div id="egyik" style="margin-top:3vh">
                                            <p>...Értékeket</p>
                                        </div>
                                    </div>                            
                            </div>
                            <div class="info-strip">
                                    <div class="infocard">
                                        <p> Ha belépett a feltöltő és tesztelő felületre, hozhat létre:  </p>
                                        <p style="display: flex; flex-direction:column;">  
                                                    <p>- Al-kategóriákat</p>    
                                                    <p>- Hozzá tartozó témákat</p>    
                                                    <p>- Kérdéseket</p>    
                                                    <p>- és hozzá tartozó alkérdéseket</p>    
                                        </p>
                                            <p> továbbá tesztelheti a feltöltött kérdéseket pontszámozás és diagramm megjelenítés szempontjából.</p> 
                                            <br> 
                                            <p><b>Biztonsági okokból Főkategóriákat a bal oldali sávban lévő <span style="color:orange">Kategóriák</span> menün belül tud létrehozni</b></p>
                                    </div>
                            </div>
                        </div>`,
                lapok: `
        <div class="info-strip">
            <div class="infocard">
                <h3>Hogy töltök fel új anyagokat?</h3>
                <p>                                    
                   Az "Indítás" gombra kattintva átugri a feltöltő és tesztelő felületre. 
                   Itt lesz lehetősége új anyagokat rögzíteni alkategóriákon és annak témáin belül.
                   <b>Ennek viszont előfeltétele hogy legyenek létrehozva főtémakörök</b>
                   Ezt a baloldali sávban, a <b>témakörök</b> fülön tudja megtenni, az adatok megadásával majd a <b>Létrehozás</b> gombra kattintva.
                </p>
            </div>
            <div class="infocard">
                <h3>Hol fogom látni a létrehozott kérdésköröket?</h3>
                <p>                                    
                    Létrehozás után az oldal frissít, és mind az értékelő mind az adminisztrációs felületen megjelennek az új kategóriák dobozai.
                </p>
            </div>
            <div class="infocard">
                <h3>Milyen szakmai anyagot tudok feltölteni és mennyit?</h3>
                <p>                                    
                    Korlátlanul és szabadon tölthet fel szakmai anyagot amíg a licensze érvényes. Ezeket az anyagokat ön és kollegái is látni fogják.                              
                </p>
            </div>
            <div class="infocard">
                <h3>Mások szakmai anyagát is láthatom?</h3>
                <p>                                    
                 Csak ha előfizet rá és csak ha adott szakmai anyag készítői ehhez hozzájérulnak. 
                 Az ÉRTÉKEKben létre hozott anyagok alapból az ön szellemi tulajdonát képezik, más nem jogosult rájuk.   
                  </p>     
            </div>
        </div>                            
            `
            },
             'plussz': {
                main: ` <div id="tartalom2">
                            <div id="uj" class="tartdob">
                                <div id="ujak">
                                    <h3 class="param">Katagóriák létrehozása</h3>
                                        <div id="ujakbelso">
                                        <div class="fo-mini" >
                                            <div class="cim">
                                                <textarea name="newcim" id="newcim" class="cim-text">Új Főkategória </textarea>
                                            </div>
                                            <textarea name="newleiras" id="newleiras" class="leiras" rows="4" cols="40">Új Főkategória leírása</textarea>
                                        </div>
                                        <div class="belsobelso">
                                            <div class="szinek">
                                                <div  style="margin-bottom:12px"><b>Új főkategóriák színei</b></div>
                                                
                                                <div>
                                                    <label>Szín <input id="nf_szin1" type="color" value="#ff8000"></label>
                                                </div>  <div id="nf_szin_preview" class="szin-preview" style="display: none;"></div>

                                            </div>
                                            <div class="chart szinek">
                                        <div  style="margin-bottom:12px"><b>Új diagramm színei</b></div>
                                                <div style="    display: flex; margin:0px !important; justify-content: space-between; align-items: center;">
                                                <div>
                                                    <label>Szín <input id="fm_chart_color" type="color" value="#ff8000"></label>
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="modal-buttons2">
                                        <button id="confirmNew">Létrehozás</button></div>
                                    </div>

                                </div>
                                   <div class="info-strip">
                                    <div class="infocard">
                                        <p>
                                        A rendszerhez való hozzáadáshoz kattintson a <b style= color:"orange">"Létrehozás"</b> gombra.
                                        Ezután a feltöltő és tesztelő oldalon kiválasztható lesz a listából.
                                        </p>
                                    </div>
                                </div>
                                <div class="info-strip">
                                    <div class="infocard">
                                        <p>A főkategóriák képezik a felvivendő kérdéskörök alapját. 
                                        Minden további kategória és kérdés ebből ágazódik le. 
                                        Létrehozáshoz meg kell adnia a nevét (színes doboz) majd a leírását (sötét doboz). 
                                         </p>
                                    </div>
                                </div>
                                  <div class="info-strip">
                                    <div class="infocard">
                                        <p>
                                        Az új kategória mellet találja a színválasztót. Válasszon egy tetszőleges színt a palettáról a kategóriának és a diagrammnak.
                                    </div>
                                </div>
                             
                                `,
                lapok: `
        <div class="info-strip"> <h3 style="margin-bottom:0px">Már felvitt kategóriák</h3>
        <p> A kategóriák nevére kattintva tudja a már felvitt, meglévő tartalmakat szerkeszteni (szín, név, leírás) illetve törölni őket a rendszerből</p>
              <div id="jelenlegi" class="outer-div">
                                
                                
                                        <div class="inner-div" style=" justify-content: space-around !important;">
                
                                            <h4>Jelenlegi kategóriák</h4>
                                            
                                    
                                    </div>
        </div>                            
            `
            }
        };

        // Kezdeti állapot beállítása: A meglévő tartalmak kapnak egyedi azonosítót és aktívak lesznek
        const initialMain = layoutContainer.querySelector('.main');
        const initialLapok = layoutContainer.querySelector('#lapok');
        
        initialMain.dataset.contentId = 'ertekek';
        initialLapok.dataset.contentId = 'ertekek';
        initialMain.classList.add('aktiv-tartalom');
        initialLapok.classList.add('aktiv-tartalom');

        
        // Eseménykezelők a gombokhoz
 const infoPanelekTartalma = {
      'changepass': {
    title: 'Jelszó Megváltoztatása',
    content: 
    `<p> Kérjük, adja meg jelenlegi és új jelszavát.</p>
    <div style="flex-direction: row">
        <div style="width:60%">
            
            <span class="jelszo-wrapper">
                <input id="old" type="password" placeholder="Régi jelszó">
                <span class="material-symbols-rounded toggle-jelszo">visibility</span>
            </span>

            <span class="jelszo-wrapper">
                <input id="new" type="password" placeholder="Új jelszó">
                <span class="material-symbols-rounded toggle-jelszo">visibility</span>
            </span>

            <span class="jelszo-wrapper">
                <input id="newtwo" type="password" placeholder="Új jelszó mégegyszer">
                <span class="material-symbols-rounded toggle-jelszo">visibility</span>
            </span>

        </div>
        <span class="gobut6" style="width:40%">Új jelszó beállítása</span>
    </div>
            `
        },
        'remove': {
            title: 'Hozzájárulás Visszavonása',
            content: '<p>Biztosan visszavonja a hozzájárulását? Ez a művelet nem vonható vissza.</p><button>Visszavonás</button>'
        },
        'plussj': {
            title: 'Jogosultságok Bővítése',
            content: '<p>Jellezze az intézményi adminisztrátornak, milen szerepkört szeretne kérni. Jelenlegi szerepköreit jobb oldali sávban láthatja </p><textarea></textarea><button>Küldés</button>'
        },
        'deleteacc': {
            title: 'Profil Törlése',
            content: '<p>Figyelem! ÉRTÉKEK profilja törlésére készül. Ezzel visszavonthatatlanul törlődnek a létrehozott és megosztott értékelései is. Amennyiben biztos benne, hogy ezt szeretné, kattintson a "Profil végleleges törlése gombra"</p><button style="background-color: red; color: white;">Profil Végleges Törlése</button>'
        }

        
    };

    // ÚJ FÜGGVÉNY: Eseménykezelők beállítása az "accunt" oldalon
// CSERÉLD LE ERRE A TELJES FÜGGVÉNYT A KÓDODBAN

function setupAccountInfoListeners(mainElement) {
    const elsoDiv = mainElement.querySelector('.elso');
    const infoCards = mainElement.querySelectorAll('.infocard');

    if (!elsoDiv || infoCards.length === 0) return;

    // --- ÚJ RÉSZ KEZDETE: Ez a függvény felel a jelszó ellenőrzésért ---
 // CSERÉLD LE A TELJES FÜGGVÉNYT ERRE
// CSERÉLD LE A TELJES FÜGGVÉNYT ERRE AZ ÚJ VERZIÓRA
function addPasswordValidationLogic(panel) {
    const newPassInput = panel.querySelector('#new');
    const newTwoPassInput = panel.querySelector('#newtwo');
    const submitButton = panel.querySelector('.gobut6');

    // --- Vizuális visszajelzés gépelés közben (változatlan) ---
    function updateVisualFeedback() {
        const pass1 = newPassInput.value;
        const pass2 = newTwoPassInput.value;

        if (pass2 === '') {
            newTwoPassInput.classList.remove('jelszo-jo', 'jelszo-rossz');
            return;
        }
        if (pass1 === pass2) {
            newTwoPassInput.classList.remove('jelszo-rossz');
            newTwoPassInput.classList.add('jelszo-jo');
        } else {
            newTwoPassInput.classList.remove('jelszo-jo');
            newTwoPassInput.classList.add('jelszo-rossz');
        }
    }
    newPassInput.addEventListener('input', updateVisualFeedback);
    newTwoPassInput.addEventListener('input', updateVisualFeedback);

    // --- Jelszó megjelenítése/elrejtése logika (változatlan) ---
    const toggleIcons = panel.querySelectorAll('.toggle-jelszo');
    toggleIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const isPassword = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPassword ? 'text' : 'password');
            this.textContent = isPassword ? 'visibility_off' : 'visibility';
        });
    });

    // --- A gomb kattintás eseményének kezelése (EZ A RÉSZ VÁLTOZIK) ---
    submitButton.addEventListener('click', function() {
        const pass1 = newPassInput.value;
        const pass2 = newTwoPassInput.value;
        const oldPass = panel.querySelector('#old').value;

        // A validációs lánc: sorban ellenőrizzük a szabályokat
        
        // 1. Üres mezők ellenőrzése (marad a régi)
        if (pass1 === '' || pass2 === '' || oldPass === '') {
            showAlert('Minden jelszómező kitöltése kötelező!');
        
        // 2. Jelszó egyezés ellenőrzése (marad a régi)
        } else if (pass1 !== pass2) {
            showAlert('A két új jelszó nem egyezik meg!');
        
        // 3. ÚJ SZABÁLY: Hossz ellenőrzése
        } else if (pass1.length < 8) {
            showAlert('Az új jelszónak legalább 8 karakter hosszúnak kell lennie!');

        // 4. ÚJ SZABÁLY: Régi és új jelszó összehasonlítása
        } else if (pass1 === oldPass) {
            showAlert('Az új jelszó nem egyezhet meg a régivel!');

        // 5. ÚJ SZABÁLY: Kis- és nagybetű ellenőrzése (reguláris kifejezéssel)
        } else if (!/[a-z]/.test(pass1) || !/[A-Z]/.test(pass1)) {
            showAlert('Az új jelszónak tartalmaznia kell legalább egy kis- és egy nagybetűt!');
        
        // SIKERES ESET: Minden ellenőrzésen átment
        } else {
            showAlert('Jelszó sikeresen megváltoztatva!');
            console.log('Minden validáció sikeres. Régi jelszó:', oldPass, 'Új jelszó:', pass1);
            // Ide jön a tényleges jelszóküldés a szerver felé (fetch, axios, stb.).
        }
    });
}
    // --- ÚJ RÉSZ VÉGE ---

    infoCards.forEach(card => {
        card.addEventListener('click', function() {
            const cardId = this.id;
            const tartalom = infoPanelekTartalma[cardId];

            const letezikPanel = elsoDiv.querySelector('.info-panel');
            if (letezikPanel) {
                letezikPanel.remove();
            }

            if (tartalom) {
                const infoPanel = document.createElement('div');
                infoPanel.className = 'info-panel';
                infoPanel.innerHTML = `
                    <span class="bezaras">&times;</span>
                    <h3>${tartalom.title}</h3>
                    <div>${tartalom.content}</div>
                `;

                elsoDiv.appendChild(infoPanel);

                // --- MÓDOSÍTÁS: Itt hívjuk meg az új függvényünket, de csak a jelszó panelnél ---
                if (cardId === 'changepass') {
                    addPasswordValidationLogic(infoPanel);
                }

                setTimeout(() => {
                    infoPanel.classList.add('aktivp');
                }, 10);

                infoPanel.querySelector('.bezaras').addEventListener('click', () => {
                    infoPanel.classList.remove('aktivp');
                    infoPanel.addEventListener('transitionend', () => {
                        infoPanel.remove();
                    }, { once: true });
                });
            }
        });
    });
}


    // Eredeti eseménykezelőd a gombokhoz, KIEGÉSZÍTVE
    // JAVÍTOTT ESEMÉNYKEZELŐ LOGIKA

gombok.forEach(gomb => {
    gomb.addEventListener('click', function() {
        const aktivGombId = this.id;

        if (this.classList.contains('dobaktiv')) {
            return;
        }

        const elozoAktivGomb = document.querySelector('.dobaktiv');
        if (elozoAktivGomb) {
            elozoAktivGomb.classList.remove('dobaktiv');
            const elozoGombId = elozoAktivGomb.id;
            document.querySelectorAll(`[data-content-id="${elozoGombId}"]`).forEach(elem => {
                elem.classList.remove('aktiv-tartalom');
            });
        }
        
        this.classList.add('dobaktiv');

        let celTartalom = document.querySelectorAll(`[data-content-id="${aktivGombId}"]`);
        let newMain;

        if (celTartalom.length === 0) {
            const tartalomForras = ujTartalmak[aktivGombId];
            
            newMain = document.createElement('article');
            newMain.className = 'main';
            newMain.dataset.contentId = aktivGombId;

            // --- INNENTŐL VÁLTOZIK ---
            // Ellenőrizzük, hogy a 'main' egy függvény-e. Ha igen, meghívjuk.
            newMain.innerHTML = typeof tartalomForras.main === 'function' 
                ? tartalomForras.main() 
                : tartalomForras.main;

            const newLapok = document.createElement('article');
            newLapok.className = 'lapok';
            newLapok.dataset.contentId = aktivGombId;

            // Ugyanezt megcsináljuk a 'lapok'-kal is a biztonság kedvéért.
            newLapok.innerHTML = typeof tartalomForras.lapok === 'function'
                ? tartalomForras.lapok()
                : tartalomForras.lapok;
            // --- EDDIG VÁLTOZIK ---

            layoutContainer.appendChild(newMain);
            layoutContainer.appendChild(newLapok);

            celTartalom = [newMain, newLapok];
        } else {
             newMain = document.querySelector(`.main[data-content-id="${aktivGombId}"]`);
        }

        if (aktivGombId === 'accunt' && newMain) {
            setupAccountInfoListeners(newMain);
        }

        setTimeout(() => {
            celTartalom.forEach(elem => elem.classList.add('aktiv-tartalom'));
        }, 10);
    });
});

}