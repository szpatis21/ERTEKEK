// Értékelés formázása és mentése

import { kerdesValaszok,szovegesValaszok, honapok, napok, animateMessage } from './main_alap.js';

async function mentesEsNavigalas(event, url = null, logoutForm = null) {
    event.preventDefault(); 

    const vanNemMentettValasz = Object.keys(kerdesValaszok).length > 0 || Object.keys(szovegesValaszok).length > 0;

    if (!vanNemMentettValasz) {
        // Nincs mit menteni, mehetünk is tovább azonnal
        if (logoutForm) logoutForm.submit();
        else if (url) window.location.href = url;
        return;
    }

    // Van mentendő adat, indítjuk a mentést és a vizuális visszajelzést
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        animateMessage("Adatok mentése kilépés előtt...", "medium", "black");
    }

    const kitoltesId = new URLSearchParams(window.location.search).get('kitoltes_id');
    const datum2 = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const szazalek = window.ertekelesJSON ?? null;

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

        if (!response.ok) throw new Error(`HTTP hiba!`);

        // Sikeres mentés üzenet
        if (loadingOverlay) {
            animateMessage("Adatait sikeresen mentettük!", "medium", "gold");
        }

        // Várunk 1,5 másodpercet, hogy a felhasználó el tudja olvasni, majd navigálunk
        setTimeout(() => {
            if (logoutForm) {
                logoutForm.submit();
            } else if (url) {
                window.location.href = url;
            }
        }, 1500);

    } catch (error) {
        console.error('Mentési hiba:', error);
        if (loadingOverlay) {
            animateMessage("Hiba történt a mentés során!", "medium", "red");
        }
        // Hiba esetén is elengedhetjük az oldalt kis várakozás után, vagy megállíthatjuk
        setTimeout(() => {
            if (logoutForm) logoutForm.submit();
            else if (url) window.location.href = url;
        }, 2000);
    }
}
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

  // Kliens oldali kód (pl. ertekelo.html scriptje vagy ertekelo.js)

fetch(`/api/get-kitoltes-neve?idk=${kitoltesId}`) 
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          const ertekesneve = document.querySelector("#ertekelesneve");
          const kitneve = document.querySelector("#kitneve");

          // 1. A rejtett mezőbe mehet a teljes, formázott cím (a régi logika szerint)
          if (ertekesneve) {
             ertekesneve.textContent = data.kitoltes_neve
                .split('-')
                .map(resz => ` ${resz.replace(/~/g, '-').trim()} `)
                .join('-');
          }

          // 2. A főcímbe (kitneve) pedig a SZERVER ÁLTAL KÜLDÖTT, VISSZAFEJTETT NEVET tesszük
            if (kitneve) {
            // innerHTML kell, hogy a HTML tagek (pl. <b>) működjenek
kitneve.innerHTML = `<b><u>${data.vizsgalt_nev}</u></b> - ${data.kitoltes_neve}` || "Név nem elérhető";        }
          
      } else { 
          console.error('Hiba:', data.message);
      }
  })
  .catch(error => { 
      console.error('Fetch hiba:', error);
  });
}

// Értékelés mentése
if (document.querySelector('#user')) {
    // Kicseréljük a beforeunload-ot egy automatikus háttérmentésre
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            const vanNemMentettValasz = Object.keys(kerdesValaszok).length > 0 || Object.keys(szovegesValaszok).length > 0;

            if (vanNemMentettValasz) {
                const urlParams = new URLSearchParams(window.location.search);
                const kitoltesId = urlParams.get('kitoltes_id');
                const datum2 = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const szazalek = window.ertekelesJSON ?? null;

                const teljesSzovegesValaszok = {};
                Object.entries(szovegesValaszok).forEach(([kerdesId, valasz]) => {
                    teljesSzovegesValaszok[kerdesId] = valasz.trim();
                });

                // keepalive: true biztosítja, hogy a kérés elmenjen az ablak bezárása után is
                fetch('/api/save-valaszok', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    keepalive: true, 
                    body: JSON.stringify({
                        kitoltesId: kitoltesId,
                        kerdesValaszok: kerdesValaszok,
                        szovegesValaszok: teljesSzovegesValaszok,
                        userId: userId,
                        ido: datum2,
                        szazalek  
                    })
                }).catch(err => console.error('Automatikus mentési hiba:', err));
            }
        }
    });
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


const logoutForm = document.querySelector('form[action="/logout"]');
if (logoutForm) {
    logoutForm.addEventListener('submit', function(event) {
        // Itt hívod meg:
        mentesEsNavigalas(event, null, logoutForm);
    });
}