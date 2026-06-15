//Tömbök, időzítés, DOM betöltődés, animációk, színek, Válaszok és főmenü betöltése

import './main_graph.js'; //Grafikus elemek, PDF generálás, gombok, diagrammok 
import './main_quest.js'; //Kérdőív rendszer
import './main_quest_search.js'; // Keresős
import './main_focus_history.js'; // Előzmények és utolsó fókusz jelölése
import './main_pdf.js'; //PDF rendszer
import './main_quest_ertekeles_navigator.js'; //PDF navi
import { KategoriaKezelo } from './main_quest.js';
export let megtekintesMod = false;

//Szerkesztő Modul
if (document.querySelector('#szerkeszto')) {
    import('/private/admin/upload/updateFletch.js')
        .then(module => {
            console.log('Szerkesztőmód aktív');
        modulinfo();})
        .catch(error => {console.error('Hiba a történt a szerkesztő mód betöltése során:', error);
        });
}
export const kerdesValaszok ={};
export const kerdesErtekek ={};

export const szovegesValaszok = {}; 

export const honapok = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
export const napok = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];

//Automatikus kiléptetés
let inactivityTimer;
let modulLeiras = null;
let modulNev = null;
let userName = null;
export let userId = null; 
export let modulSzamolas = 0;

function normalizalSzamolas(value) {
    if (value === 1 || value === '1') return 1;
    if (typeof value === 'string' && value.toLowerCase() === 'pontosszegzes') return 1;
    return 0;
}


async function modulinfo() {
    try {
        const response = await fetch('/get-username', {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });
        const data = await response.json();

        if (data.success) {  
            userName = data.username; 
            userId = data.id; // <--- EZT ADD HOZZÁ (elmentjük a felhasználó ID-ját)
            modulId = data.modulId;   // pl. 1
            modulSzamolas = normalizalSzamolas(data.szamolas);
            window.modulSzamolas = modulSzamolas;
                modulNev     = data.modulNev;     // pl. "Fejlesztő"
                modulLeiras  = data.modulLeiras;  // pl. "Fejlesztői kompetencia …"
                console.log(modulNev + " " + modulId)

                const holis = document.querySelector('.holvagyok');
                const sajtnev = document.querySelector(".sajtnev");
                if (holis) holis.textContent = modulLeiras || '';
                if (sajtnev) sajtnev.textContent = userName || '';
            } else {console.error('Hiba:', data.message);}
        } catch (error) {console.error('Fetch hiba:', error);
        }
    }
    export let modulId = null;

// Létrehozol egy promise-t
export const modulIdBetoltve = new Promise((resolve, reject) => {
    async function modulinfo() {
        try {
            const response = await fetch('/get-username', {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
            });
            const data = await response.json();
    
            if (data.success) {  
                
                modulId = data.modulId;
                modulSzamolas = normalizalSzamolas(data.szamolas);
                window.modulSzamolas = modulSzamolas;
                resolve(modulId);  // promise feloldása modulId-vel
            } else {
    window.location.href = '/login.html';
            return;            }
        } catch (error) {
            reject(error);
        }
    }

    modulinfo();
});

export async function betoltKategoriakChartSzinek(modulId) {
  try {
    const res = await fetch(`/api/get-fo_kategoriak?modulId=${encodeURIComponent(modulId)}`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error('/api/get-fo_kategoriak nem elérhető');
    }

    const rows = await res.json();

    const toRgba = (color, alpha = 0.5) => {
      const c = String(color || '').trim();

      if (!c) return `rgba(200,200,200,${alpha})`;

      if (c.startsWith('#')) {
        const hex = c.length === 4
          ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]
          : c;

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        if ([r, g, b].some(Number.isNaN)) {
          return `rgba(200,200,200,${alpha})`;
        }

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }

      const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (m) {
        return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
      }

      return c;
    };

    const map = {};

    for (const item of rows || []) {
      const nev = String(item.nev || '').trim();
      if (!nev) continue;

      const col = item.chart || item.szin || 'rgba(200,200,200,0.5)';
      map[nev] = toRgba(col, 0.5);
    }

    window.kategoriakChartSzinek = map;
    return map;

  } catch (e) {
    console.error('Színtérkép betöltési hiba:', e);
    window.kategoriakChartSzinek = {};
    return {};
  }
}
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        
        // 1. Ellenőrizzük, hogy van-e hálózat (felébredés utáni állapot kivédése)
        if (!navigator.onLine) {
            console.warn("Nincs internetkapcsolat. Az automatikus kiléptetés és mentés megszakítva.");
            alert("A hálózati kapcsolat megszakadt (például a gép alvó állapota miatt). Kérjük, frissítse az oldalt!");
            return; // Megállítjuk a futást, nem küldünk semmit a semmibe
        }

        const urlParams = new URLSearchParams(window.location.search);
        const kitoltesId = urlParams.get('kitoltes_id');

        if (kitoltesId && (Object.keys(kerdesValaszok).length > 0 || Object.keys(szovegesValaszok).length > 0)) {
            try {
                const datum2 = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const szazalek = window.ertekelesJSON ?? null;

                const teljesSzovegesValaszok = {};
                Object.entries(szovegesValaszok).forEach(([kerdesId, valasz]) => {
                    teljesSzovegesValaszok[kerdesId] = valasz.trim();
                });

                const response = await fetch('/api/save-valaszok', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        kitoltesId: kitoltesId, 
                        kerdesValaszok: kerdesValaszok,
                        szovegesValaszok: teljesSzovegesValaszok,
                        userId: userId,
                        ido: datum2,
                        szazalek: szazalek
                    })
                });

                const data = await response.json();
                if (data.success) {
                    console.log("Automatikus mentés inaktivitás miatt sikeres!");
                } else {
                    console.error('Automatikus mentési hiba:', data.message);
                }
            } catch (error) {
                // Ha itt esik el (pl. az utolsó pillanatban megy el a net), kulturáltan kiírjuk
                console.warn('Nem sikerült az inaktivitási mentés (Hálózati hiba):', error);
            }
        }

        // Logout kérés küldése a backend felé
        fetch('/logout', { method: 'POST' })
            .then(() => {
                alert('Automatikusan kijelentkeztettük tétlenség miatt. Válaszait mentettük. Várjuk vissza.');
                window.location.href = '/index.html'; 
            })
            .catch(err => {
                console.warn('Nem sikerült a szerver oldali kijelentkezés (Hálózati hiba):', err);
                // Ha elszáll a fetch, legalább a felületről dobjuk ki a felhasználót
                window.location.href = '/index.html'; 
            });
            
    }, 2400000); // 40 perc inaktivitás
}
        // Minden aktivitásnál újraindítja az időzítőt
            document.addEventListener('mousemove', resetInactivityTimer);
            document.addEventListener('keypress', resetInactivityTimer);
        // Indítja az időzítőt az oldal betöltésekor
        resetInactivityTimer();
        modulinfo()

//Animáció a töltésekhez        
export function animateMessage(text, fontSize, color) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const logobelso = document.getElementById('logobelso');
    
    if (logobelso && loadingOverlay) {
        // 1. Szülő (overlay) megjelenítése
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';

        // 2. Szöveg beállítása
        logobelso.textContent = text ?? '';
        logobelso.style.fontSize = fontSize;
        logobelso.style.color = color;
        logobelso.style.textAlign = "center";
        
        // 3. Belső elem láthatósága és animálása
        logobelso.style.display = "flex";
        logobelso.style.opacity = "1";
        logobelso.classList.remove('fade-out', 'fade-in');
        logobelso.classList.add('fade-in');

        // 4. Automatikus eltüntetés 3 másodperc után, hogy ne fagyjon ki a képernyő
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            logobelso.style.opacity = '0';
            
            // Megvárjuk a CSS fade-out végét, aztán levesszük a display-t
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 400); 
        }, 3000);
    }
}
    let loadingMessageTimeouts = []; // Globális változó a setTimeout-okra
    export function showLoading(text = "Csak egy pillanat...", color = "orange", fontSize = "large") {
      const loadingOverlay = document.getElementById('loading-overlay');
      const logobelso = document.getElementById('logobelso');
      if (!loadingOverlay || !logobelso) return;
  
      // Minden előző üzenet timeout törlése
      loadingMessageTimeouts.forEach(timeout => clearTimeout(timeout));
      loadingMessageTimeouts = [];
  
      loadingOverlay.style.display = 'flex';
      loadingOverlay.style.opacity = '1';
      logobelso.textContent = text ?? '';
      logobelso.style.fontSize = fontSize;
      logobelso.style.color = color;
      logobelso.style.textAlign = "center";
      logobelso.classList.remove('fade-out', 'fade-in');
      logobelso.classList.add('fade-in');
  
      // Új üzenetek időzítése
      loadingMessageTimeouts.push(setTimeout(() => {
          animateMessage("Hamarosan elkészülünk...", "medium", "black");
      }, 1000)); // 1 mp után
  
      loadingMessageTimeouts.push(setTimeout(() => {
          animateMessage("Köszönöm a türelmet...", "medium", "orange");
      }, 4000)); // 4 mp után
    }
    export function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';

        // Töröljük az időzített üzeneteket
        loadingMessageTimeouts.forEach(timeout => clearTimeout(timeout));
        loadingMessageTimeouts = [];

        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 400);
    }
    }
//Színkínyerők
    export function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h * 360, s, l];
    };
    export function hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
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
            h /= 360;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };
    export function extractRGBFromGradient(gradient) {
        const match = gradient.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        }
        return [200, 200, 200]; // Fallback szürke
    };
 export function darkenRgbColor(rgbStr, percent = 0.2) {
    // Példa: rgb(24, 157, 0, 0.5)
    const rgb = rgbStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!rgb) return "rgba(160,160,160,0.8)";
    let [r, g, b] = [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];
    let [h, s, l] = rgbToHsl(r, g, b);
    l = Math.max(0, l - percent); // pl. 0.5-ből 0.3 lesz (sötétedik)
    let [dr, dg, db] = hslToRgb(h, s, l);
    return `rgba(${dr},${dg},${db},0.85)`;
}

//Indítás
document.addEventListener('DOMContentLoaded', () => { 
    const urlParams = new URLSearchParams(window.location.search);
    const nemDashboard = !window.location.pathname.includes('dashboard.html');
    const megtekintes = urlParams.get('megtekintes') === 'true';
    //Megtekintési mód, hogy ne álljon neki legenerálni a főtémaköröket
    if (nemDashboard && !megtekintes) {
        KategoriaKezelo.loadFoKategoriak();
        KategoriaKezelo.loadValaszok();
    }
});
modulIdBetoltve
  .then(modulId => betoltKategoriakChartSzinek(modulId))
  .then(map => {
    window.kategoriakChartSzinek = map; // <<< garantáltan beállítjuk
    console.log('✅ Színtérkép globálisan elérhető');
  });