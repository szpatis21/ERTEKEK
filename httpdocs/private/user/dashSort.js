//Rendezés és keresés segítő függvények

// Segédfüggvény: Ha egy csoportban minden kártya rejtett, a fejlécet is elrejtjük
function updateGroupVisibility() {
    const groups = document.querySelectorAll('.inner-div .csopi');
    groups.forEach(group => {
        const visibleCards = group.querySelectorAll('.tart[style="display: block;"], .tart:not([style*="display: none"])');
        if (visibleCards.length === 0) {
            group.style.display = 'none';
        } else {
            group.style.display = 'block';
        }
    });
}
//Keresés funkció
export function initSearch() {
    const searchInput = document.querySelector('#kereso');
    const searchType = document.querySelector('#kereso-tipus');
    if (!searchInput || !searchType) return;

    const performSearch = () => {
        const term = searchInput.value.toLowerCase().trim();
        const type = searchType.value;
        const cards = document.querySelectorAll('.inner-div .tart');

        cards.forEach(card => {
            const meglevokElement = card.querySelector('.meglevok');
            if (!meglevokElement) return;

            const ds = meglevokElement.dataset;
            let targetText = "";

            // A HTML-ed alapján a kulcsok: nev, periodus, megnev
            if (type === 'all') {
                targetText = `${ds.nev || ''} ${ds.periodus || ''} ${ds.megnev || ''}`;
            } else if (type === 'nev') {
                targetText = ds.nev || "";
            } else if (type === 'idoszak') {
                targetText = ds.periodus || ""; // data-periodus javítása
            } else if (type === 'megnevezes') {
                targetText = ds.megnev || "";    // data-megnev javítása
            }

            if (targetText.toLowerCase().includes(term)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        updateGroupVisibility();
    };

    searchInput.addEventListener('input', performSearch);
    searchType.addEventListener('change', performSearch);
}
//infoboxos számláló
export function initChekingToggle() {
  const master = document.getElementById('cheking2');
  const infoBox = document.getElementById('stat-info-box');
  const countSpan = document.getElementById('sel-count');
  
  if (!master) return;

  // Számláló frissítő logika
  const updateCounter = () => {
    const count = document.querySelectorAll('.cheking:checked').length;
    if (countSpan) countSpan.textContent = count;
  };

  const apply = () => {
    const show = master.checked;
    
    if (infoBox) infoBox.style.display = show ? 'flex' : 'none';

    document.querySelectorAll('.cheking').forEach(el => {
      el.style.display = show ? 'flex' : 'none';
    });
    
    updateCounter();
  };

  master.addEventListener('change', apply);
  
  const innerDiv = document.querySelector('.inner-div');
  if (innerDiv) {
      innerDiv.addEventListener('change', (e) => {
          if (e.target.matches('.cheking')) {
              updateCounter();
          }
      });
  }

  apply();
}
//CSOPORTOSÍTÁS LOGIKA
function groupBySelect(type = 'role') {
  const innerDiv = document.querySelector('.inner-div');
  if (!innerDiv) return;
  const tartok = [...innerDiv.querySelectorAll('.tart')];
  innerDiv.querySelectorAll('.csopi').forEach(e => e.remove());
  tartok.forEach(t => t.remove());

  if (type === 'role' || type === 'role2') {
    const ROLE_TITLE = { admin : 'Saját Értékelések', editor: 'Velem megosztott értékelések' };
    const ROLE_ORDER = ['admin', 'editor'];
    const groups = new Map();
    tartok.forEach(tart => {
      const role = (tart.querySelector('.meglevok').dataset.role || 'other').trim();
      if (!groups.has(role)) {
        const csopi  = document.createElement('div');
        csopi.classList.add('csopi');
        const fejlec = document.createElement('div');
        fejlec.classList.add('fejlec2');
        const doboz  = document.createElement('div');
        doboz.classList.add('doboztart');
        csopi.append(fejlec, doboz);
        groups.set(role, { csopi, doboz, fejlec, count: 0, title: ROLE_TITLE[role] || 'Egyéb megosztások' });
      }
      const g = groups.get(role);
      g.doboz.appendChild(tart);
      g.count += 1;
    });
    ROLE_ORDER.concat([...groups.keys()].filter(k => !ROLE_ORDER.includes(k))).forEach(k => {
        const g = groups.get(k);
        if (g) { g.fejlec.textContent = `${g.title} (${g.count})`; innerDiv.appendChild(g.csopi); }
    });
    return;
  }
  const groups = new Map();
  tartok.forEach(tart => {
    const key = (tart.querySelector('.meglevok').dataset[type] || 'Ismeretlen').trim();
    if (!groups.has(key)) {
      const csopi  = document.createElement('div');
      csopi.classList.add('csopi');
      const fejlec = document.createElement('div');
      fejlec.classList.add('fejlec2');
      const doboz  = document.createElement('div');
      doboz.classList.add('doboztart');
      csopi.append(fejlec, doboz);
      groups.set(key, { csopi, doboz, fejlec, count: 0, title: key });
    }
    const g = groups.get(key);
    g.doboz.appendChild(tart);
    g.count += 1;
  });
  groups.forEach(g => { g.fejlec.textContent = `${g.title} (${g.count})`; innerDiv.appendChild(g.csopi); });
}
//Szűrő
export function initSzuro() {
  if (!document.getElementById('foglalt')) return;
  const sel = document.getElementById('szuro');
  if (!sel) return;
  groupBySelect(sel.value);
  sel.addEventListener('change', e => groupBySelect(e.target.value));
}
