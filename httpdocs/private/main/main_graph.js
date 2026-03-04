import { kerdesValaszok, szovegesValaszok, honapok, napok, animateMessage } from './main_alap.js';
import { KategoriaKezelo } from './main_quest.js';

let utolsoMentettAllapot = { kerdesValaszok: {}, szovegesValaszok: {} };
const mentesGomb = document.querySelectorAll('.mentesGomb');
const urlParams = new URLSearchParams(window.location.search);
const kitoltesId = urlParams.get('kitoltes_id');
let userId = null;
export let pontokLathatok = false;

// Helyi idő generátor a mentésekhez
function getHelyiIdo() {
    const now = new Date();
    const ev = now.getFullYear();
    const ho = String(now.getMonth() + 1).padStart(2, '0');
    const nap = String(now.getDate()).padStart(2, '0');
    const ora = String(now.getHours()).padStart(2, '0');
    const perc = String(now.getMinutes()).padStart(2, '0');
    const mp = String(now.getSeconds()).padStart(2, '0');
    return `${ev}-${ho}-${nap} ${ora}:${perc}:${mp}`;
}

async function initAlapAllapot() {
    mentesGomb.forEach(gomb => {
        gomb.disabled = true;
        gomb.style.cursor = 'wait';
        gomb.style.opacity = '0.6';
    });

    if (kitoltesId) {
        try {
            const res = await fetch(`/api/get-valaszok?kitoltes_id=${kitoltesId}`);
            const data = await res.json();
            if (data.success) {
                data.valaszok.forEach(v => {
                    utolsoMentettAllapot.kerdesValaszok[v.kerdes_id] = v.kerdes_valasz;
                    if (v.valasz_szoveg) {
                        utolsoMentettAllapot.szovegesValaszok[v.kerdes_id] = v.valasz_szoveg;
                    }
                });
            }
        } catch (err) { console.error('Hiba az alapállapot betöltésekor:', err); }
    }

    mentesGomb.forEach(gomb => {
        gomb.disabled = false;
        gomb.style.cursor = 'pointer';
        gomb.style.opacity = '1';
    });
}
initAlapAllapot();

async function mentesEsNavigalas(event, url = null, logoutForm = null) {
    if (event) event.preventDefault(); 
    if (!userId) {
        console.warn('Nincs userId, a mentés megszakítva.');
        animateMessage("A felhasználói adatok még nem töltődtek be!", "medium", "red");
        return;
    }

    const ujKerdesValaszok = {};
    const ujSzovegesValaszok = {};

    for (const [kId, valasz] of Object.entries(kerdesValaszok)) {
        if (utolsoMentettAllapot.kerdesValaszok[kId] !== valasz) {
            ujKerdesValaszok[kId] = valasz;
        }
    }

    // Fals pozitív mentések elkerülése a szöveges válaszoknál
    for (const [kId, valasz] of Object.entries(szovegesValaszok)) {
        const trimValasz = valasz?.trim() || '';
        const regiValasz = utolsoMentettAllapot.szovegesValaszok[kId]?.trim() || '';
        if (regiValasz !== trimValasz) {
            ujSzovegesValaszok[kId] = trimValasz;
        }
    }

    const vanUjdonsag = Object.keys(ujKerdesValaszok).length > 0 || Object.keys(ujSzovegesValaszok).length > 0;
    
    // Ha nincs új adat
    if (!vanUjdonsag) {
        if (!logoutForm && !url) {
            // Ez fut le, ha csak simán a Mentés gombra (mentesGomb) kattintanak
showTooltip(event.target, "Jelenleg nincs menthető válasz!");        } else {
            // Ez fut le, ha kilépnek vagy navigálnak
            if (logoutForm) logoutForm.submit();
            else if (url) window.location.href = url;
        }
        return;
    }

    // Töltőképernyő megjelenítése (hogy látszódjon is a folyamat)
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
    }


    const datum2 = getHelyiIdo();
    const szazalek = window.ertekelesJSON ?? null;

    const elkuldottKerdesValaszok = { ...ujKerdesValaszok };
    const elkuldottSzovegesValaszok = { ...ujSzovegesValaszok };

    try {
        const payload = {
            kitoltesId: kitoltesId,
            kerdesValaszok: elkuldottKerdesValaszok, 
            szovegesValaszok: elkuldottSzovegesValaszok, 
            userId: userId,
            ido: datum2,
            szazalek  
        };

        const response = await fetch('/api/save-valaszok', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP hiba!`);

        const osszefoglaloDiv = document.createElement('div');
        osszefoglaloDiv.classList.add("osszefoglalo");
        
        if (Object.keys(elkuldottKerdesValaszok).length > 0) {
            const cim = document.createElement('strong');
            cim.classList.add("osszefoglalo-cim");
            cim.textContent = 'Bekerült válaszok:';
            osszefoglaloDiv.appendChild(cim);

            const lista = document.createElement('ul');
            lista.classList.add("osszefoglalo-lista");

            for (const [kId, valasz] of Object.entries(elkuldottKerdesValaszok)) {
                const kerdes = KategoriaKezelo.kerdesek.find(k => k.id == kId);
                if (kerdes) {
                    const li = document.createElement('li');
                    li.classList.add("osszefoglalo-lista-elem");
                    const szinOsztaly = valasz === 'igen' ? 'valasz-igen' : 'valasz-nem'; 
                    li.innerHTML = `
                        <b class="mentes-kategoria">[${kerdes.foKategoria} &gt; ${kerdes.alKategoria}]</b><br>
                        <i>${kerdes.szoveg}</i><br>
                        Bekerült válasz: <b class="${szinOsztaly}">${valasz.toUpperCase()}</b>
                    `;
                    lista.appendChild(li);
                }
            }
            osszefoglaloDiv.appendChild(lista);
        }

        if (Object.keys(elkuldottSzovegesValaszok).length > 0) {
            const cim = document.createElement('strong');
            cim.classList.add("osszefoglalo-cim");
            cim.textContent = 'Új / Módosított szöveges válaszok:';
            osszefoglaloDiv.appendChild(cim);

            const lista = document.createElement('ul');
            lista.classList.add("osszefoglalo-lista");

            for (const [kId, valasz] of Object.entries(elkuldottSzovegesValaszok)) {
                const kerdes = KategoriaKezelo.kerdesek.find(k => k.id == kId);
                if (kerdes && valasz !== '') {
                    const li = document.createElement('li');
                    li.classList.add("osszefoglalo-lista-elem");
                    li.innerHTML = `
                        <b class="mentes-kategoria">[${kerdes.foKategoria} &gt; ${kerdes.alKategoria}]</b><br>
                        <i>${kerdes.szoveg}</i><br>
                        Beírt szöveg: <span class="mentes-szoveges-valasz">"${valasz}"</span>
                    `;
                    lista.appendChild(li);
                }
            }
            osszefoglaloDiv.appendChild(lista);
        }

        Object.assign(utolsoMentettAllapot.kerdesValaszok, elkuldottKerdesValaszok);
        Object.assign(utolsoMentettAllapot.szovegesValaszok, elkuldottSzovegesValaszok);

        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            loadingOverlay.style.opacity = '0';
        }

        const overlay = document.createElement('div');
        overlay.classList.add("overlayment"); 
        
        const logokulso = document.createElement("div");
        logokulso.classList.add("logokulso");
        overlay.appendChild(logokulso);
        
        // 1. Létrehozzuk az ideiglenes "ÉRTÉKEK" feliratot
        const ertekekFelirat = document.createElement('div');
        ertekekFelirat.innerHTML = `<span style="color:gold">É</span>RTÉKEK`;
        ertekekFelirat.classList.add("nagy")
        
       
        
        overlay.appendChild(ertekekFelirat);
        document.body.appendChild(overlay);

        // 2. Késleltetés: megvárjuk, amíg a felhasználó elolvassa, majd elkezdjük halványítani
        setTimeout(() => {
            ertekekFelirat.style.opacity = "0";

            // 3. Megvárjuk az 1 másodperces fade-out végét, aztán jöhet a doboz
            setTimeout(() => {
                 ertekekFelirat.remove();
 
                const doboz = document.createElement('div');
                doboz.classList.add("dobozment");
                
                // Láthatatlanul indítjuk, hogy ez is szépen ússzon be
                doboz.style.opacity = "0";
                doboz.style.transition = "opacity 0.5s ease-in-out";
                
                doboz.innerHTML = `
                    <h2>Sikeres Mentés!</h2>
                    <p>Az alábbi <b>új és módosított</b> adatok frissültek a rendszerben:</p>
                `;
                
                doboz.appendChild(osszefoglaloDiv);
                
                const gomb = document.createElement('button');
                gomb.id = 'btn-rendben-mentes';
                gomb.textContent = 'Rendben';
                doboz.appendChild(gomb);

                overlay.appendChild(doboz);

                // Miután a DOM-ba került, a requestAnimationFrame biztosítja, 
                // hogy az opacity váltás tényleges animációként fusson le
                requestAnimationFrame(() => {
                    doboz.style.opacity = "1";
                });

                gomb.addEventListener('click', () => {
                    overlay.remove();
                    if (logoutForm) logoutForm.submit();
                    else if (url) window.location.href = url;
                });

            }, 1000); // 1 másodperc halványulási idő
        }, 1200); // 1,2 másodpercig marad tisztán látható a szöveg

    } catch (error) {
        console.error('Mentési hiba:', error);
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            loadingOverlay.style.opacity = '0';
        }
        animateMessage("Hiba történt a mentés során!", "medium", "red");
    }
}

const utols = document.querySelector("#seh");
let letrehoz = null;

function frissitLegfrissebbValasz(kitoltesId) {
    if(!kitoltesId) return;
    fetch(`/api/get-legfrissebb-valasz?kitoltesId=${kitoltesId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && utols) {
                const felhasznaloNev = data.felhasznaloNev;
                const letrehozva = new Date(data.letrehozva);
                const ev = letrehozva.getFullYear();
                const honap = honapok[letrehozva.getMonth()];
                const nap = letrehozva.getDate();
                const napNev = napok[letrehozva.getDay()];
                const ora = String(letrehozva.getHours()).padStart(2, '0');
                const perc = String(letrehozva.getMinutes()).padStart(2, '0');
                const mp = String(letrehozva.getSeconds()).padStart(2, '0');
    
                const formataltDatum = `${ev}. ${honap} ${nap}. - ${napNev}: ${ora}:${perc}:${mp}`;
                utols.innerHTML = `
                    <p>Az értékelést módosította <b class="szin">${felhasznaloNev}</b> ekkor: <i class="szin">${formataltDatum}</i></p>
                `;
            }
        })
        .catch(err => console.error('Fetch hiba:', err));
}
frissitLegfrissebbValasz(kitoltesId);

if (document.getElementById('ertekelesneve')) {
    const sajtnev = document.querySelector("#sajatnev");
    
    fetch('/get-username', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const nev = document.querySelector("#nev");
            if (sajtnev) sajtnev.innerHTML = "&nbsp;" + data.username;
            userId = data.id; 
            if (nev) nev.innerHTML = data.vez;
            
            if (data.role !== 'admin') {
                const pontok = document.querySelector(".pontok");
                if (pontok) pontok.style.display="none"; 
            }
        }
    })
    .catch(error => console.error('Fetch hiba felhasználó lekérésekor:', error));

    if(kitoltesId) {
        fetch(`/api/get-kitoltes-neve?idk=${kitoltesId}`) 
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const ertekesneve = document.querySelector("#ertekelesneve");
                const kitneve = document.querySelector("#kitneve");

                if (ertekesneve && data.kitoltes_neve) {
                ertekesneve.textContent = data.kitoltes_neve
                    .split('-')
                    .map(resz => ` ${resz.replace(/~/g, '-').trim()} `)
                    .join('-');
                }

                if (kitneve && data.vizsgalt_nev) {
                    kitneve.innerHTML = `<b><u>${data.vizsgalt_nev}</u></b> - ${data.kitoltes_neve}`;        
                }
            }
        })
        .catch(error => console.error('Fetch hiba a kitöltés nevének lekérésekor:', error));
    }
}

// Automatikus háttérmentés fülváltáskor
if (document.querySelector('#user')) {
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden' && userId) {
            const ujKerdesValaszok = {};
            const ujSzovegesValaszok = {};

            for (const [kId, valasz] of Object.entries(kerdesValaszok)) {
                if (utolsoMentettAllapot.kerdesValaszok[kId] !== valasz) {
                    ujKerdesValaszok[kId] = valasz;
                }
            }

            for (const [kId, valasz] of Object.entries(szovegesValaszok)) {
                const trimValasz = valasz?.trim() || '';
                if (utolsoMentettAllapot.szovegesValaszok[kId] !== trimValasz) {
                    ujSzovegesValaszok[kId] = trimValasz;
                }
            }

            const vanUjdonsag = Object.keys(ujKerdesValaszok).length > 0 || Object.keys(ujSzovegesValaszok).length > 0;

            if (vanUjdonsag) {
                const datum2 = getHelyiIdo();
                const szazalek = window.ertekelesJSON ?? null;

                const elkuldottKerdesValaszok = { ...ujKerdesValaszok };
                const elkuldottSzovegesValaszok = { ...ujSzovegesValaszok };

                fetch('/api/save-valaszok', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true, 
                    body: JSON.stringify({
                        kitoltesId: kitoltesId,
                        kerdesValaszok: elkuldottKerdesValaszok,
                        szovegesValaszok: elkuldottSzovegesValaszok,
                        userId: userId,
                        ido: datum2,
                        szazalek  
                    })
                }).then(response => {
                    if(response.ok) {
                        Object.assign(utolsoMentettAllapot.kerdesValaszok, elkuldottKerdesValaszok);
                        Object.assign(utolsoMentettAllapot.szovegesValaszok, elkuldottSzovegesValaszok);
                    }
                }).catch(err => console.error('Automatikus mentési hiba:', err));
            }
        }
    });
}

// Pontrendszer megjelenítése
document.querySelectorAll('.toggleButton').forEach(elem => {
    elem.addEventListener('click', function(event) {
        event.preventDefault(); 
        const keszuloDiv = document.querySelector('#maininf');
        if (!keszuloDiv || keszuloDiv.style.display === 'none' || keszuloDiv.style.display === '') {
            showTooltip(event.target, "Először kapcsolja be az értékelési nézetet!");
            return; 
        }
        pontokLathatok = !pontokLathatok; 
        document.querySelectorAll('.pontA, .pontB, .pontC, .pontD, .pontE, .pontF').forEach(pont => {
            pont.style.display = pontokLathatok ? 'flex' : 'none';
        });
    });
});

function showTooltip(targetElement, message) {
    const existingTooltip = document.querySelector('.custom-tooltip');
    if (existingTooltip) existingTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.classList.add('custom-tooltip');
    tooltip.innerText = message;
    
    // Először hozzáadjuk a body-hoz, különben a böngésző nem tudja kiszámolni a méretét
    document.body.appendChild(tooltip);

    // Biztosítjuk, hogy a gombot vegyük alapul, ne a benne lévő ikont vagy szöveget
    const gomb = targetElement.closest('.mentesGomb') || targetElement;
    const rect = gomb.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Dinamikus pozíció: középre igazítva, és pontosan a tooltip saját magasságával + 10px-el a gomb fölé tolva
    const leftPos = rect.left + window.scrollX + (rect.width / 2);
    const topPos = rect.top + window.scrollY - tooltipRect.height - 10;

    tooltip.style.left = `${leftPos}px`;
    tooltip.style.top = `${topPos}px`;

    setTimeout(() => {
        tooltip.classList.add('fade-out'); 
        setTimeout(() => tooltip.remove(), 300);
    }, 3000); 
}

const logoutForm = document.querySelector('form[action="/logout"]');
if (logoutForm) {
    logoutForm.addEventListener('submit', function(event) {
        mentesEsNavigalas(event, null, logoutForm);
    });
}

mentesGomb.forEach(gomb => {
    gomb.addEventListener('click', function(event) {
        mentesEsNavigalas(event);
    });
});