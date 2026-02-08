//Tömbök, időzítés, DOM betöltődés, animációk, színek, Válaszok és főmenü betöltése

import './main_graph.js'; //Grafikus elemek, PDF generálás, gombok, diagrammok 
import './main_quest.js'; //Kérdőív rendszer
import './main_pdf.js'; //PDF rendszer
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

 async function modulinfo() {
        try {
            const response = await fetch('/get-username', {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
            });
            const data = await response.json();
    
            if (data.success) {  
                userName = data.username; 
                modulId      = data.modulId;      // pl. 1
                modulNev     = data.modulNev;     // pl. "Fejlesztő"
                modulLeiras  = data.modulLeiras;  // pl. "Fejlesztői kompetencia …"
                console.log(modulNev + " " + modulId)

                const holis = document.querySelector('.holvagyok')
                const sajtnev = document.querySelector(".sajtnev");
                holis.innerHTML = modulLeiras;
                sajtnev.innerHTML = userName;
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
    const res = await fetch('/private/info/temakorok.json'); // útvonalat tedd rendbe a szervered szerint
    const data = await res.json();
    const set = (data.optionSets && data.optionSets[String(modulId)]) || [];

const toRgbaFromGradient = (grad) => {
  if (typeof grad !== 'string') return 'rgba(200,200,200,0.5)';
  const m = grad.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, 0.5)`;
  const hex = grad.match(/#([0-9a-f]{6})/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  }
  return 'rgba(200,200,200,0.5)';
};

    const map = {};
for (const it of set) {
  const nev = (it.value || it.text || '').trim();
  if (!nev || nev === 'Válasszon egy témakört') continue;

  let col = it.chart;
  if (!col && typeof it.szin === 'string' && it.szin.length) {
    col = toRgbaFromGradient(it.szin);   // <<< most már STRING
  }
  map[nev] = col || 'rgba(200,200,200,0.5)';
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
        const urlParams = new URLSearchParams(window.location.search);
        const kitoltesId = urlParams.get('kitoltes_id');

        if (kitoltesId && Object.keys(kerdesValaszok).length > 0) {
            try {
                // Mentési API hívás
                const response = await fetch('/api/save-valaszok', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kitoltesId: kitoltesId, kerdesValaszok: kerdesValaszok })
                });

                const data = await response.json();
                if (data.success) {
                } else {
                    console.error('Mentési hiba:', data.message);
                }
            } catch (error) {
                console.error('Fetch hiba a mentés során:', error);
            }
        }

        // Logout kérés küldése a backend felé
        fetch('/logout', { method: 'POST' })
            .then(() => {
                alert('Automatikusan kijelentkeztettük tétlenség miatt. Válaszait mentettük. Várjuk vissza.');
                window.location.href = '/index.html'; // Átirányítás az index oldalra
            })
            .catch(err => console.error('Hiba a kijelentkezés során:', err));
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
    const logobelso = document.getElementById('logobelso');
    if (logobelso) {
        logobelso.innerHTML = text;
        logobelso.style.fontSize = fontSize;
        logobelso.style.color = color;
        logobelso.style.textAlign = "center";
        logobelso.classList.remove('fade-out', 'fade-in');
        logobelso.classList.add('fade-in');
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
      logobelso.innerHTML = text;
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