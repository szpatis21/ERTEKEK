//Már elkészült értékelések szemlézése, nyomtatása, mailes küldése
import { KategoriaKezelo } from '../main/main_quest.js';
import { kerdesValaszok,szovegesValaszok} from '../main/main_alap.js';

// utils/resetView.js  (vagy a fájlod tetejére)
export function resetSzemleView() {
const keszulo = document.getElementById('keszulo');
  if (keszulo) {
    keszulo
      .querySelectorAll('.fo-kategoria, .al-kategoria, .alt-tema, table')
      .forEach(n => n.remove());
  }

  /* --- Egyéni AI vezérlő takarítása --- */
  const aiVezerlo = document.getElementById('egyeni-ai-vezerlo');
  if (aiVezerlo) {
    aiVezerlo.innerHTML = `<div id="egyeni-ai-vezerlo">
                            <div id="egyeni-ai-loading" style="display: none; margin-top: 10px;text-align: center;">Elemzés folyamatban...</div>
                            <div id="egyeni-ai-kimenet"></div>
                        </div>`; // Vagy aiVezerlo.replaceChildren();
  }

  /* --- Diagram reset --- */
  if (window.foKategoriaChart) {  
    window.foKategoriaChart.destroy();    
    window.foKategoriaChart = null;
  }
}

 export function resetKitoltesCache() {
  Object.keys(kerdesValaszok).forEach(key => delete kerdesValaszok[key]);
  Object.keys(szovegesValaszok).forEach(key => delete szovegesValaszok[key]);

  if (Array.isArray(KategoriaKezelo._kerdesek)) {
    KategoriaKezelo._kerdesek.length = 0;
  }
}


