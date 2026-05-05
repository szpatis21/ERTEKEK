//Kategóriák, kérdések, aktívvá, passzívvá tétele, elrejtése megjelenítése

import { KategoriaKezelo } from './main_quest.js';
import { letrehozAlkategoriaChart} from './szamitasok.js';


export class Focus {

  static toggleActiveState(selectedDiv, categorySelector, onActive, onInactive) {
/*       console.log(`toggleActiveState meghívva: ${selectedDiv.dataset.id}, categorySelector: ${categorySelector}`);
 */  
      const categories = document.querySelectorAll(categorySelector);
      const isActive = selectedDiv.classList.contains('active');
  
/*       console.log(`isActive: ${isActive}, selectedDiv:`, selectedDiv);
 */  
      categories.forEach(div => {
          div.classList.remove('active', 'passive');
      });
  
      if (!isActive) {
          selectedDiv.classList.add('active');
          categories.forEach(div => {
              if (div !== selectedDiv) {
                  div.classList.add('passive');
              }
          });
/*           console.log("onActive() meghívása...");
 */          onActive();
      } else {
          selectedDiv.classList.remove('active');
  
          setTimeout(() => {
              if (!selectedDiv.classList.contains('active')) { 
                  onInactive();
              }
          }, 10);
      }
  }
  

  static toggleActiveClass(selectedDiv, foKategoriaNev) {
    Focus.toggleActiveState(selectedDiv, '.fo', () => {
        KategoriaKezelo.loadAlKategoriak(foKategoriaNev); // Alkategóriák betöltése
        // 🔥 Diagram automatikus megjelenítés
        Focus.frissitAlkategoriaDiagram(foKategoriaNev);
    }, () => {
        Focus.clearSubcategories(); // Alkategóriák törlése
        // 🔥 Diagram eltüntetése, ha már nem aktív
        Focus.elrejtiAlkategoriaDiagram();
        Focus.elrejtiAltTemaDiagram();

    });
}

static toggleActiveClassal(selectedDiv, alKategoriaNev) {
    Focus.toggleActiveState(selectedDiv, '.al', () => {
        // Itt hívjuk meg az altéma diagramot
        setTimeout(() => {
            Focus.frissitAltTemaDiagram(); // <- ezt kell importálni is fent
        }, 200);
    }, () => {
        setTimeout(() => {
            Focus.alclearSubcategories();
        }, 100);
    });
}




static toggleActiveClassalal(selectedDiv, altTemaNev) {
    Focus.toggleActiveState(
        selectedDiv,
        '.alal',
        () => {},
        () => {
            Focus.alalclearSubcategories();
        }
    );
}
  
  //Elemek megjelnításe és elrejtése
  static showContainer(container) {
      container.classList.remove('hidden'); // Elem láthatóvá tétele
      container.classList.add('fade-in'); // Animáció hozzáadása
  }
  static hideAlKerdesek(parentId) {
      const tartaly = document.getElementById(`alkerdesek-${parentId}`);
      tartaly.innerHTML = ''; // Alkérdések törlése a konténerből
      tartaly.classList.add('hidden'); // Konténer elrejtése
  }
  static clearElements(...elementIds) {
      elementIds.forEach(id => {
          const element = document.getElementById(id);
          if (element) {
              element.innerHTML = '';
              element.classList.add('hidden'); // Elemet elrejti
          }
      });
  }
  static clearSubcategories() { Focus.clearElements('al_kategoriak', 'alt_temak', 'kerdesek', 'alkerdesek'); }
  static alclearSubcategories() { Focus.clearElements('alt_temak', 'kerdesek', 'alkerdesek'); }
  static alalclearSubcategories() { Focus.clearElements('kerdesek', 'alkerdesek'); }

 static frissitAlkategoriaDiagram(foKategoriaNev) {
    const foKatElem = [...document.querySelectorAll('.fo-kategoria h3')].find(
        h3 => h3.textContent.trim().startsWith(foKategoriaNev)
    );

    if (foKatElem) {
        const alkatDivok = [...foKatElem.parentElement.querySelectorAll('.pontF')];
        const labels = [];
        const data = [];

        alkatDivok.forEach(div => {
            const adat = div.getAttribute('data-pont-al');
            if (adat) {
                const [rawLabel, _] = adat.split(':');
        
                // Levágjuk a főkategória részt, csak az alkategória név marad
                const label = rawLabel.split('/').pop().trim();
        
                const ertek = parseFloat(div.textContent.match(/\((\d+)%\)/)?.[1]);
        
                if (!isNaN(ertek)) {
                    labels.push(label);
                    data.push(ertek);
                }
            }
        });
        
        if (labels.length && data.length) {
            window.aktivFoKategoriaNev = foKategoriaNev; // Ne felejtsük el ezt beállítani!
            letrehozAlkategoriaChart(labels, data);
        }
    }
}

static elrejtiAlkategoriaDiagram() {
    const chartContainer = document.getElementById('alkategoriaChartContainer');
    if (chartContainer) {
        chartContainer.style.display = 'none';
    }
    window.aktivFoKategoriaNev = null; // Reseteljük az aktív állapotot is!
}

static elrejtiAltTemaDiagram() {
    const chartContainer = document.getElementById('altTemaChartContainer');
    if (chartContainer) {
        chartContainer.style.display = 'none';
    }
}

// Altéma chart létrehozása, ha aktív alkategória van
static frissitAltTemaDiagram() {
    const aktivAlKatElem = document.querySelector('.al.active');
    if (!aktivAlKatElem) return;
const cimElem = aktivAlKatElem.querySelector('.cim');
    const alKatNev = cimElem ? cimElem.textContent.trim() : aktivAlKatElem.textContent.trim();

    const trElem = [...document.querySelectorAll('tr.al-kategoria')].find(tr => {
        const td = tr.querySelector('td.al-kategoria');
        return td && td.textContent.trim() === alKatNev;
    });
    

    if (!trElem) return;

    const altTemaDivok = [...trElem.nextElementSibling?.parentElement?.querySelectorAll('.pontC') || []];
    const labels = [];
    const data = [];

    altTemaDivok.forEach(div => {
        const adat = div.getAttribute('data-pont-alt');
        if (adat) {
            const [rawLabel, _] = adat.split(':');
            const label = rawLabel.split('/').pop().trim();
            const ertek = parseFloat(div.textContent.match(/\((\d+)%\)/)?.[1]);
            if (!isNaN(ertek)) {
                labels.push(label);
                data.push(ertek);
            }
        }
    });

    if (labels.length && data.length && window.aktivFoKategoriaNev) {
        letrehozAltTemaChart(labels, data, window.aktivFoKategoriaNev);
    }
}



}