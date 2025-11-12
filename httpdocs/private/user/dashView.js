//Már elkészült értékelések szemlézése, nyomtatása, mailes küldése
import { KategoriaKezelo } from '../main/main_quest.js';
import { kerdesValaszok,szovegesValaszok} from '../main/main_alap.js';

// utils/resetView.js  (vagy a fájlod tetejére)
export function resetSzemleView() {
  /* --- Értékelés DOM blokkok takarítása --- */
  const keszulo = document.getElementById('keszulo');
  if (keszulo) {
    keszulo
      .querySelectorAll('.fo-kategoria, .al-kategoria, .alt-tema, table')
      .forEach(n => n.remove());
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


