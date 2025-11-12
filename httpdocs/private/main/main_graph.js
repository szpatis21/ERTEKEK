// Értékelés formázása és mentése

import { kerdesValaszok,szovegesValaszok, honapok, napok, animateMessage } from './main_alap.js';

const mentesGomb = document.querySelectorAll('.mentesGomb');
const utols = document.querySelector("#seh");
const urlParams = new URLSearchParams(window.location.search);
const kitoltesId = urlParams.get('kitoltes_id');
let letrehoz = null;
let userId = null;
export let pontokLathatok = false;

let vanMentetlenAdat = false; // <-- ÚJ VÁLTOZÓ

//Értékelés megosztási információi
function frissitLegfrissebbValasz(kitoltesId) {
  fetch(`/api/get-legfrissebb-valasz?kitoltesId=${kitoltesId}`)
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              const felhasznaloNev = data.felhasznaloNev;
              const letrehozva = new Date(data.letrehozva);
  
              // Dátum formázása
              const ev = letrehozva.getFullYear();
              const honap = honapok[letrehozva.getMonth()];
              const nap = letrehozva.getDate();
              const napNev = napok[letrehozva.getDay()];
              const ora = String(letrehozva.getHours()).padStart(2, '0');
              const perc = String(letrehozva.getMinutes()).padStart(2, '0');
              const mp = String(letrehozva.getSeconds()).padStart(2, '0');
  
              const formataltDatum = `${ev}. ${honap} ${nap}. - ${napNev}: ${ora}:${perc}:${mp}`;
              // Szöveg hozzáadása
              utols.innerHTML = `
                  <p>Az értékelést módosította <b class="szin">${felhasznaloNev}</b> ekkor: <i class="szin">${formataltDatum}</i></p>
              `;
            } else {
              console.log('Hiba:', data.message);
          }
      })
      .catch(err => console.error('Fetch hiba:', err));
    }
frissitLegfrissebbValasz(kitoltesId)

//Értékelés fejlécée
if (document.getElementById('ertekelesneve')) {

  const sajtnev = document.querySelector("#sajatnev");
  const ertekesneve = document.querySelector("#ertekelesneve");
/*   console.log(`Kapott azonosító:', ${kitoltesId}, Létrehozva:  ${decodeURIComponent(letrehoz)}.  `);
 */

  fetch('/get-username', {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const nev = document.querySelector("#nev");
      sajtnev.innerHTML = "&nbsp;" + data.username;
        userId = data.id; 
/*         console.log (userId)
 */        nev.innerHTML = data.vez;
 if (data.role === 'admin') {
    console.log('Felhasználó admin jogosultságú.');
    // ide jöhet, amit csak adminnak mutatsz
  } else {
/*     console.log('Nem admin.');
 */    const pontok = document.querySelector(".pontok");
    pontok.style.display="none";
  }
        
    } else {console.error('Hiba:', data.message);}
  })
  .catch(error => {console.error('Fetch hiba:', error);
  });

  fetch(`/api/get-kitoltes-neve?idk=${kitoltesId}`) 
  .then(response => response.json())
      .then(data => {
          if (data.success) {
            const ertekesneve = document.querySelector("#ertekelesneve");

            const kitneve = document.querySelector("#kitneve");
            ertekesneve.textContent = data.kitoltes_neve
            .split('-')                          // Szétbontjuk kötőjelek mentén
            .map(resz => ` ${resz.replace(/~/g, '-').trim()} `)  // ~ cseréje kötőjelre, szóköz hozzáadása
            .join('-');                          // Újra összefűzzük kötőjelekkel
                      kitneve.textContent = `  ${data.kitoltes_neve}  `;
          } else { console.error('Hiba:', data.message);}
      })
      .catch(error => { console.error('Fetch hiba:', error);
      });
}

// Értékelés mentése
if (document.querySelector('#user')) {
     window.addEventListener('beforeunload', function (event) {
        const vanNemMentettValasz = Object.keys(kerdesValaszok).length > 0 || Object.keys(szovegesValaszok).length > 0;

        if (vanNemMentettValasz) {
            
            event.preventDefault(); 
            return 'A nem mentett módosítások el fognak veszni. Biztosan elhagyja az oldalt?'; 
        }
    });
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === 's') {
          event.preventDefault();
          document.querySelectorAll('.mentesGomb').forEach(gomb => gomb.click());
      }
    });
    //Mentés API
    mentesGomb.forEach(mentesGomb => {

      mentesGomb.addEventListener('click', (event) => {
        event.preventDefault();  

          const urlParams = new URLSearchParams(window.location.search);
          const kitoltesId = urlParams.get('kitoltes_id');
          const datum2 = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const szazalek = window.ertekelesJSON ?? null;   //  ← EZ hiányzik innen

          // Ellenőrizzük, hogy van-e mentendő válasz
          if (Object.keys(kerdesValaszok).length === 0 && Object.keys(szovegesValaszok).length === 0) {
              alert('Nincsenek mentendő válaszok!');
              return;
          }

          // Szöveges válaszokat előkészítjük
          const teljesSzovegesValaszok = {};
          Object.entries(szovegesValaszok).forEach(([kerdesId, valasz]) => {
              teljesSzovegesValaszok[kerdesId] = valasz.trim(); // Üres stringeket is mentünk
          });

          // Fetch POST kérés
          fetch('/api/save-valaszok', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  kitoltesId: kitoltesId,
                  kerdesValaszok: kerdesValaszok,
                  szovegesValaszok: teljesSzovegesValaszok,
                  userId:userId,
                  ido: datum2,
                      szazalek  
            
              })
          })
          .then(response => {
              if (!response.ok) {
                  throw new Error(`HTTP hiba! Státusz: ${response.status}`);
              }
              return response.json();
          })
          .then(data => {
            console.log(userId)
              const logobelso = document.getElementById('logobelso');
              const loadingOverlay = document.getElementById('loading-overlay');
              const timestamp = Math.floor(Date.now() / 1000);
    const datum = new Date(timestamp * 1000).toISOString().slice(0, 19).replace('T', ' ');

              if (!logobelso || !loadingOverlay) {
                  console.error("Nem található a szükséges HTML elem!");
                  return;
              }

              // Overlay és kezdeti üzenet
              loadingOverlay.style.display = 'flex';
              loadingOverlay.style.opacity = '1';

              animateMessage("Mentés folyamatban...", "large", "black");

              setTimeout(() => {
                  logobelso.classList.add('fade-out');

                  setTimeout(() => {
                      const message = data.message || (data.success ? "Sikeres mentés!" : "Hiba történt!");
                      const textColor = data.success ? "gold" : "red";

                      if (!data.success) {
                          console.error("Hiba történt:", message);
                      }

                      animateMessage(message, "medium", textColor);

                  }, 500); // Áttetsző animáció után
              }, 2000); // 2 másodperc után indul az animáció
              const startTime = Date.now();

              const elapsedTime = Date.now() - startTime;
              const remainingTime = Math.max(4000 - elapsedTime, 0);

              setTimeout(() => {
                  loadingOverlay.style.display = 'none';
              }, remainingTime);
              frissitLegfrissebbValasz(kitoltesId);

          })
          .catch(error => {
              console.error('Fetch hiba:', error);
          });
      });
    });
    // Mentés esetei
    async function mentesEsNavigalas(event, url = null, logoutForm = null) {
        event.preventDefault(); 
    
        if (Object.keys(kerdesValaszok).length === 0 && Object.keys(szovegesValaszok).length === 0) {
            console.log('Nincsenek mentendő válaszok.');
        } else {
            const kitoltesId = new URLSearchParams(window.location.search).get('kitoltes_id');
            const datum2 = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const szazalek   = window.ertekelesJSON ?? null;     // ← itt!

            const teljesSzovegesValaszok = {};
            Object.entries(szovegesValaszok).forEach(([kerdesId, valasz]) => {
                teljesSzovegesValaszok[kerdesId] = valasz.trim();
            });
    
            try {
                const response = await fetch('/api/save-valaszok', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        kitoltesId: kitoltesId,
                        kerdesValaszok: kerdesValaszok,
                        szovegesValaszok: teljesSzovegesValaszok,
                        userId: userId,
                        ido: datum2,
                            szazalek  
                    })
                });
    
                if (!response.ok) {
                    throw new Error(`HTTP hiba! Státusz: ${response.status}`);
                }
    
                const data = await response.json();
                console.log('Mentés eredménye:', data);
                frissitLegfrissebbValasz(kitoltesId);
            } catch (error) {
                console.error('Mentési hiba:', error);
                // Döntheted úgy, hogy hibánál mégsem navigálsz
                return;
            }
        }
    
        // Ha volt logout form, submitoljuk
        if (logoutForm) {
            logoutForm.submit();
        } 
        // Ha URL volt megadva, navigálunk oda
        else if (url) {
            window.location.href = url;
        }
    }

    const logoutForm = document.querySelector('form[action="/logout"]');
if (logoutForm) {
    logoutForm.addEventListener('submit', function(event) {
        mentesEsNavigalas(event, null, logoutForm);
    });
}
const dashboardLink = document.querySelector('a[href="./dashboard.html"]');
if (dashboardLink) {
    dashboardLink.addEventListener('click', function(event) {
        mentesEsNavigalas(event, './dashboard.html');
    });
}

  
}

//Pontrendszer megjelenítése
document.querySelectorAll('.toggleButton').forEach(elem => {
    elem.addEventListener('click', function(event) {
        event.preventDefault(); // Megakadályozza az alapértelmezett viselkedést

        const keszuloDiv = document.querySelector('#maininf');

        if (!keszuloDiv || keszuloDiv.style.display === 'none' || keszuloDiv.style.display === '') {
            // Ha nincs megjelenítve, tooltip mutatása
            showTooltip(event.target, "Először kapcsolja be az értékelési nézetet!");
            return; // Kilépés, hogy ne kapcsolja át a pontokat
        }

        pontokLathatok = !pontokLathatok; // Állapot váltás

        const pontok = document.querySelectorAll('.pontA, .pontB, .pontC, .pontD, .pontE, .pontF');

        pontok.forEach(pont => {
            pont.style.display = pontokLathatok ? 'flex' : 'none';
        });
    });
});

// Tooltip megjelenítő függvény
function showTooltip(targetElement, message) {
    // Ha már létezik egy tooltip, töröljük
    const existingTooltip = document.querySelector('.custom-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }

    // Tooltip elem létrehozása
    const tooltip = document.createElement('div');
    tooltip.classList.add('custom-tooltip');
    tooltip.innerText = message;
    
    document.body.appendChild(tooltip);

    // Tooltip pozicionálása a gombhoz képest
    const rect = targetElement.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
    tooltip.style.top = `${rect.top + window.scrollY - 40}px`; // Kicsit a gomb fölé tesszük

    // Tooltip eltávolítása animációval
    setTimeout(() => {
        tooltip.classList.add('fade-out'); // Kiúszó animáció indítása
        setTimeout(() => {
            tooltip.remove(); // Elem törlése, miután az animáció véget ért
        }, 300);
    }, 3000); // 3 másodperc után elindul a fade-out
}


